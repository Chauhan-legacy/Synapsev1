"""
Largest Lyapunov Exponent Estimation for SYNAPSE STRUCTURE.
Implements the Rosenstein, Collins, De Luca (1993) algorithm to detect chaotic divergence
in reconstructed phase space with Theiler window exclusion and fit diagnostics.
Gracefully handles periodic and deterministic regular signals without throwing runtime errors.
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


def compute_lorenz_variational_lyapunov(
    sigma: float = 10.0,
    rho: float = 28.0,
    beta: float = 8.0 / 3.0,
    dt: float = 0.01,
    n_transient: int = 1000,
    n_steps: int = 6000,
) -> Tuple[float, float]:
    """
    Compute largest Lyapunov exponent and Gottwald-Melbourne 0-1 test on developed Lorenz trajectory
    after discarding initial transient steps.
    For standard chaotic parameters (sigma=10, rho=28, beta=8/3), returns lambda_1 ~ +0.9 and K ~ 1.0.
    """
    x, y, z = 1.0, 1.0, 1.0

    def derivs(cx: float, cy: float, cz: float) -> np.ndarray:
        return np.array([sigma * (cy - cx), cx * (rho - cz) - cy, cx * cy - beta * cz], dtype=np.float64)

    def jacobian(cx: float, cy: float, cz: float, cdx: float, cdy: float, cdz: float) -> np.ndarray:
        return np.array([
            -sigma * cdx + sigma * cdy,
            (rho - cz) * cdx - cdy - cx * cdz,
            cy * cdx + cx * cdy - beta * cdz
        ], dtype=np.float64)

    # 1. Discard transient steps
    for _ in range(n_transient):
        k1 = derivs(x, y, z)
        k2 = derivs(x + 0.5 * dt * k1[0], y + 0.5 * dt * k1[1], z + 0.5 * dt * k1[2])
        k3 = derivs(x + 0.5 * dt * k2[0], y + 0.5 * dt * k2[1], z + 0.5 * dt * k2[2])
        k4 = derivs(x + dt * k3[0], y + dt * k3[1], z + dt * k3[2])
        d_state = (dt / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4)
        x += d_state[0]
        y += d_state[1]
        z += d_state[2]

    # 2. Develop trajectory with variational tangent equations
    dx, dy, dz = 1.0, 0.0, 0.0
    lyap_sum = 0.0
    subsampled_x: List[float] = []

    for s in range(n_steps):
        k1 = derivs(x, y, z)
        j1 = jacobian(x, y, z, dx, dy, dz)

        k2 = derivs(x + 0.5 * dt * k1[0], y + 0.5 * dt * k1[1], z + 0.5 * dt * k1[2])
        j2 = jacobian(x + 0.5 * dt * k1[0], y + 0.5 * dt * k1[1], z + 0.5 * dt * k1[2], dx + 0.5 * dt * j1[0], dy + 0.5 * dt * j1[1], dz + 0.5 * dt * j1[2])

        k3 = derivs(x + 0.5 * dt * k2[0], y + 0.5 * dt * k2[1], z + 0.5 * dt * k2[2])
        j3 = jacobian(x + 0.5 * dt * k2[0], y + 0.5 * dt * k2[1], z + 0.5 * dt * k2[2], dx + 0.5 * dt * j2[0], dy + 0.5 * dt * j2[1], dz + 0.5 * dt * j2[2])

        k4 = derivs(x + dt * k3[0], y + dt * k3[1], z + dt * k3[2])
        j4 = jacobian(x + dt * k3[0], y + dt * k3[1], z + dt * k3[2], dx + dt * j3[0], dy + dt * j3[1], dz + dt * j3[2])

        x += (dt / 6.0) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0])
        y += (dt / 6.0) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
        z += (dt / 6.0) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])

        dx += (dt / 6.0) * (j1[0] + 2 * j2[0] + 2 * j3[0] + j4[0])
        dy += (dt / 6.0) * (j1[1] + 2 * j2[1] + 2 * j3[1] + j4[1])
        dz += (dt / 6.0) * (j1[2] + 2 * j2[2] + 2 * j3[2] + j4[2])

        norm_d = float(np.sqrt(dx**2 + dy**2 + dz**2))
        if norm_d > 0:
            lyap_sum += float(np.log(norm_d))
            dx /= norm_d
            dy /= norm_d
            dz /= norm_d

        if s % 10 == 0:
            subsampled_x.append(float(x))

    lambda_1 = float(lyap_sum / (n_steps * dt))

    # 3. Gottwald-Melbourne 0-1 test on developed subsampled x
    arr_x = np.array(subsampled_x)
    n = len(arr_x)
    c = 0.85
    j_idx = np.arange(1, n + 1)
    p = np.cumsum(arr_x * np.cos(j_idx * c))
    q = np.cumsum(arr_x * np.sin(j_idx * c))

    max_lag = min(40, n // 8)
    m_disp = np.zeros(max_lag)
    for lag in range(1, max_lag + 1):
        dp = p[lag:] - p[:-lag]
        dq = q[lag:] - q[:-lag]
        m_disp[lag - 1] = np.mean(dp**2 + dq**2)

    lags = np.arange(1, max_lag + 1)
    corr_k = float(np.corrcoef(lags, m_disp)[0, 1])

    return (lambda_1, corr_k)


def compute_largest_lyapunov_exponent(
    values: np.ndarray,
    dimension: int = 3,
    delay: int = 1,
    max_steps: int = 30,
    theiler_window: Optional[int] = None,
) -> LyapunovResult:
    """
    Estimate Largest Lyapunov Exponent using Rosenstein's algorithm.

    Gracefully detects regular periodic orbits and zero divergence without raising exceptions.
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
    w_theiler = theiler_window if theiler_window is not None else max(1, (m - 1) * tau)

    # Subsample reference trajectories if large
    n_refs = min(300, n_vectors - max_steps - 1)
    if n_refs <= 0:
        steps = np.arange(max_steps)
        return LyapunovResult(
            largest_lyapunov_exponent=0.0,
            r_squared_fit=0.0,
            is_chaotic=False,
            divergence_steps=steps,
            mean_log_divergence=np.zeros(max_steps),
            fit_status="Indicative (series too short for divergence tracking)",
        )

    ref_step = max(1, (n_vectors - max_steps - 1) // n_refs)
    ref_indices = np.arange(0, n_vectors - max_steps - 1, ref_step)

    # Find nearest neighbor for each reference point
    nearest_neighbors: List[Tuple[int, int]] = []
    for j in ref_indices:
        vec_j = Y[j]
        diffs = Y - vec_j
        dists = np.sqrt(np.sum(diffs ** 2, axis=1))

        # Mask Theiler window
        t_low = max(0, j - w_theiler)
        t_high = min(n_vectors, j + w_theiler + 1)
        dists[t_low:t_high] = np.inf
        # Also ensure neighbor has room for max_steps ahead
        dists[n_vectors - max_steps :] = np.inf

        nn = int(np.argmin(dists))
        if dists[nn] < np.inf and dists[nn] > 0:
            nearest_neighbors.append((j, nn))

    steps = np.arange(max_steps)

    # If insufficient neighbors found (e.g. constant or degenerate manifold), return 0.0 non-chaotic
    if len(nearest_neighbors) < 10:
        return LyapunovResult(
            largest_lyapunov_exponent=0.0,
            r_squared_fit=0.0,
            is_chaotic=False,
            divergence_steps=steps,
            mean_log_divergence=np.zeros(max_steps),
            fit_status="Indicative (regular periodic or constant trajectory, non-chaotic)",
        )

    # Track divergence over i = 0..max_steps
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
        # Periodic orbit with near-identical parallel trajectories
        return LyapunovResult(
            largest_lyapunov_exponent=0.0,
            r_squared_fit=0.0,
            is_chaotic=False,
            divergence_steps=steps,
            mean_log_divergence=np.zeros(max_steps),
            fit_status="Indicative (periodic trajectory, zero divergence, non-chaotic)",
        )

    mean_log_div = np.zeros(max_steps, dtype=np.float64)
    mean_log_div[valid_step_mask] = divergences_by_step[valid_step_mask] / counts_by_step[valid_step_mask]

    # Linear fit over scaling region (first 1/3 to 2/3 of steps)
    fit_start = 1
    fit_end = max(4, max_steps // 2)
    fit_steps = steps[fit_start:fit_end]
    fit_div = mean_log_div[fit_start:fit_end]

    res = stats.linregress(fit_steps, fit_div)
    lambda1 = float(res.slope)
    r2 = float(res.rvalue ** 2) if not np.isnan(res.rvalue) else 0.0

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
