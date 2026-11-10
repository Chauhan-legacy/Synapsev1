"""
Largest Lyapunov Exponent Estimation for SYNAPSE STRUCTURE.
Implements the Rosenstein, Collins, De Luca (1993) algorithm to detect chaotic divergence
in reconstructed phase space with Theiler window exclusion and fit diagnostics.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.stats as stats

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class LyapunovResult:
    largest_lyapunov_exponent: float    # lambda_1 [1/s or 1/sample]
    r_squared_fit: float
    is_chaotic: bool                    # lambda_1 > 0 with r_squared >= 0.85
    divergence_steps: np.ndarray        # Time step axis i
    mean_log_divergence: np.ndarray     # <ln d_j(i)>
    fit_status: str                     # Supported vs Indicative


def compute_largest_lyapunov_exponent(
    values: np.ndarray,
    dimension: int = 3,
    delay: int = 1,
    max_steps: int = 30,
) -> LyapunovResult:
    """
    Estimate Largest Lyapunov Exponent using Rosenstein's algorithm.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    m = int(dimension)
    tau = int(delay)

    n_vectors = n - (m - 1) * tau
    if n_vectors < 50:
        raise ValidationError("Need at least 50 embedded points for Lyapunov exponent calculation.")

    # Reconstruct phase space Y: shape (n_vectors, m)
    Y = np.column_stack([x[k * tau : k * tau + n_vectors] for k in range(m)])

    # Theiler window to prevent temporal autocorrelations from mimicking spatial neighbors
    theiler_window = max(1, (m - 1) * tau)

    # Subsample reference trajectories if large
    n_refs = min(300, n_vectors - max_steps - 1)
    ref_step = max(1, (n_vectors - max_steps - 1) // n_refs)
    ref_indices = np.arange(0, n_vectors - max_steps - 1, ref_step)

    # Find nearest neighbor for each reference point
    nearest_neighbors: List[Tuple[int, int]] = []
    for j in ref_indices:
        vec_j = Y[j]
        diffs = Y - vec_j
        dists = np.sqrt(np.sum(diffs ** 2, axis=1))

        # Mask Theiler window
        t_low = max(0, j - theiler_window)
        t_high = min(n_vectors, j + theiler_window + 1)
        dists[t_low:t_high] = np.inf
        # Also ensure neighbor has room for max_steps ahead
        dists[n_vectors - max_steps :] = np.inf

        nn = int(np.argmin(dists))
        if dists[nn] < np.inf and dists[nn] > 0:
            nearest_neighbors.append((j, nn))

    if len(nearest_neighbors) < 10:
        raise ValidationError("Insufficient valid nearest neighbors for Lyapunov calculation.")

    # Track divergence over i = 0..max_steps
    steps = np.arange(max_steps)
    divergences_by_step = np.zeros(max_steps, dtype=np.float64)
    counts_by_step = np.zeros(max_steps, dtype=int)

    for j, nn in nearest_neighbors:
        for i in range(max_steps):
            idx1 = j + i
            idx2 = nn + i
            if idx1 < n_vectors and idx2 < n_vectors:
                dist_i = np.linalg.norm(Y[idx1] - Y[idx2])
                if dist_i > 1e-12:
                    divergences_by_step[i] += np.log(dist_i)
                    counts_by_step[i] += 1

    valid_step_mask = counts_by_step > 0
    if np.sum(valid_step_mask) < 4:
        raise ValidationError("Insufficient divergence points across time steps.")

    mean_log_div = np.zeros(max_steps, dtype=np.float64)
    mean_log_div[valid_step_mask] = divergences_by_step[valid_step_mask] / counts_by_step[valid_step_mask]

    # Linear fit over scaling region (first 1/3 to 2/3 of steps)
    fit_start = 1
    fit_end = max(4, max_steps // 2)
    fit_steps = steps[fit_start:fit_end]
    fit_div = mean_log_div[fit_start:fit_end]

    res = stats.linregress(fit_steps, fit_div)
    lambda1 = float(res.slope)
    r2 = float(res.rvalue ** 2)

    is_ch = bool(lambda1 > 0.01 and r2 >= 0.85)
    status_str = "Supported (chaotic divergence verified)" if is_ch else "Indicative (non-chaotic or weak fit)"

    return LyapunovResult(
        largest_lyapunov_exponent=lambda1,
        r_squared_fit=r2,
        is_chaotic=is_ch,
        divergence_steps=steps,
        mean_log_divergence=mean_log_div,
        fit_status=status_str,
    )
