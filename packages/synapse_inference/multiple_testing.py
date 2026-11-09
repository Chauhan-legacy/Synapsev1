"""
Multiple Hypothesis Testing and Bootstrap Confidence Intervals for SYNAPSE INFERENCE.
"""

from __future__ import annotations
from typing import List, Tuple
import numpy as np


def benjamini_hochberg_fdr(
    p_values: List[float],
    alpha: float = 0.05,
) -> Tuple[List[float], List[bool]]:
    """
    Control False Discovery Rate (FDR) using the Benjamini-Hochberg procedure.
    
    Returns (adjusted_p_values, reject_null_mask).
    """
    m = len(p_values)
    if m == 0:
        return [], []

    p_arr = np.asarray(p_values, dtype=np.float64)
    sorted_indices = np.argsort(p_arr)
    sorted_p = p_arr[sorted_indices]

    # Adjusted p-values: p_adj[k] = min_{j >= k} (m / j * p[j])
    adj_p = np.zeros(m, dtype=np.float64)
    adj_p[-1] = sorted_p[-1]

    for k in range(m - 2, -1, -1):
        step_val = (m / (k + 1)) * sorted_p[k]
        adj_p[k] = min(adj_p[k + 1], step_val)

    adj_p = np.clip(adj_p, 0.0, 1.0)

    # Invert sorting back to original order
    orig_adj_p = np.zeros(m, dtype=np.float64)
    orig_adj_p[sorted_indices] = adj_p

    reject_null = [bool(p <= alpha) for p in orig_adj_p]
    return orig_adj_p.tolist(), reject_null


def bootstrap_confidence_interval(
    values: np.ndarray,
    statistic_func,
    n_resamples: int = 200,
    confidence_level: float = 0.95,
    random_seed: int = 42,
) -> Tuple[float, float, float]:
    """
    Compute non-parametric bootstrap confidence interval (lower, point_estimate, upper).
    """
    x = np.asarray(values, dtype=np.float64)
    point_est = float(statistic_func(x))
    rng = np.random.default_rng(random_seed)
    n = len(x)

    boot_stats = np.empty(n_resamples, dtype=np.float64)
    for i in range(n_resamples):
        resample = rng.choice(x, size=n, replace=True)
        boot_stats[i] = statistic_func(resample)

    alpha = 1.0 - confidence_level
    lower = float(np.percentile(boot_stats, 100 * (alpha / 2.0)))
    upper = float(np.percentile(boot_stats, 100 * (1.0 - alpha / 2.0)))

    return lower, point_est, upper

