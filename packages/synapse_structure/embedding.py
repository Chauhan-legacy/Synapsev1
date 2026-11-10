"""
Phase Space Reconstruction and Embedding Parameter Selection for SYNAPSE STRUCTURE.
Determines optimal delay tau via Average Mutual Information (AMI) and optimal
embedding dimension m via False Nearest Neighbours (FNN).
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class EmbeddingParametersResult:
    optimal_delay_tau: int
    optimal_dimension_m: int
    ami_curve: np.ndarray
    fnn_percentages: np.ndarray
    delay_lags_tested: np.ndarray
    dimensions_tested: np.ndarray


def compute_average_mutual_information(
    values: np.ndarray,
    max_lag: int = 40,
    n_bins: int = 16,
) -> Tuple[np.ndarray, np.ndarray, int]:
    """
    Compute Average Mutual Information (AMI) I(tau) for tau in 1..max_lag.
    The first local minimum of I(tau) is selected as optimal delay tau.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    lags = np.arange(1, min(max_lag + 1, n // 3))
    ami_vals = []

    for lag in lags:
        x1 = x[:-lag]
        x2 = x[lag:]
        # 2D joint histogram
        hist_2d, _, _ = np.histogram2d(x1, x2, bins=n_bins)
        p_joint = hist_2d / np.sum(hist_2d)
        p1 = np.sum(p_joint, axis=1)
        p2 = np.sum(p_joint, axis=0)

        # I(X; Y) = sum p(x,y) * log(p(x,y) / (p(x)p(y)))
        p_prod = np.outer(p1, p2)
        nonzero = (p_joint > 0) & (p_prod > 0)
        ami = np.sum(p_joint[nonzero] * np.log2(p_joint[nonzero] / p_prod[nonzero]))
        ami_vals.append(max(0.0, float(ami)))

    ami_arr = np.array(ami_vals, dtype=np.float64)

    # Find first local minimum
    optimal_tau = 1
    for i in range(1, len(ami_arr) - 1):
        if ami_arr[i] < ami_arr[i - 1] and ami_arr[i] < ami_arr[i + 1]:
            optimal_tau = int(lags[i])
            break
    else:
        # Fallback to lag where AMI drops below 1/e of max
        optimal_tau = int(lags[int(np.argmin(ami_arr))])

    return lags, ami_arr, max(1, optimal_tau)


def compute_false_nearest_neighbours(
    values: np.ndarray,
    delay_tau: int = 1,
    max_dim: int = 8,
    rtol: float = 15.0,
    atol: float = 2.0,
) -> Tuple[np.ndarray, np.ndarray, int]:
    """
    Compute percentage of False Nearest Neighbours (FNN) as dimension m increases.
    Returns optimal embedding dimension m where FNN drops below 5%.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    std_x = float(np.std(x)) or 1.0

    dims = np.arange(1, max_dim + 1)
    fnn_pcts = []

    for m in dims:
        n_vectors = n - (m * delay_tau)
        if n_vectors < 20:
            fnn_pcts.append(0.0)
            continue

        # Construct delay vectors for dimension m: shape (n_vectors, m)
        Y_m = np.column_stack([x[k * delay_tau : k * delay_tau + n_vectors] for k in range(m)])
        # Vector components at dimension m+1: x[m * delay_tau : m * delay_tau + n_vectors]
        next_components = x[m * delay_tau : m * delay_tau + n_vectors]

        # Subsample if large for performance
        sub_size = min(500, n_vectors)
        step = max(1, n_vectors // sub_size)
        indices = np.arange(0, n_vectors, step)

        fnn_count = 0
        total_tested = 0

        for i in indices:
            vec_i = Y_m[i]
            # Euclidean distance to all other vectors
            diffs = Y_m - vec_i
            dists = np.sqrt(np.sum(diffs ** 2, axis=1))
            dists[i] = np.inf # Exclude self

            nn_idx = int(np.argmin(dists))
            d_m = dists[nn_idx]

            if d_m <= 1e-12:
                continue

            # Distance in dimension m+1:
            d_next = abs(next_components[i] - next_components[nn_idx])
            d_m1 = np.sqrt(d_m ** 2 + d_next ** 2)

            # False nearest neighbor criteria (Kennel 1992):
            crit1 = (d_next / d_m) > rtol
            crit2 = (d_m1 / std_x) > atol

            if crit1 or crit2:
                fnn_count += 1
            total_tested += 1

        pct = float((fnn_count / max(1, total_tested)) * 100.0)
        fnn_pcts.append(pct)

    fnn_arr = np.array(fnn_pcts, dtype=np.float64)

    # Find first dimension where FNN <= 5%
    optimal_m = dims[-1]
    for m, pct in zip(dims, fnn_arr):
        if pct <= 5.0:
            optimal_m = int(m)
            break

    return dims, fnn_arr, int(optimal_m)
