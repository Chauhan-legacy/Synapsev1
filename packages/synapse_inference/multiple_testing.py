"""
Multiple Hypothesis Testing and Advanced Bootstrapping for SYNAPSE INFERENCE.
Provides Benjamini-Hochberg FDR, Benjamini-Yekutieli FDR, Holm FWER,
Moving-block bootstrap, Stationary bootstrap, and BCa Confidence Intervals.
"""

from __future__ import annotations
from typing import List, Tuple, Callable
import numpy as np
import scipy.stats as stats


def benjamini_hochberg_fdr(
    p_values: List[float],
    alpha: float = 0.05,
) -> Tuple[List[float], List[bool]]:
    """
    Control False Discovery Rate (FDR) using the Benjamini-Hochberg (1995) step-up procedure.
    Valid under independent or positive regression dependent test statistics.
    """
    m = len(p_values)
    if m == 0:
        return [], []

    p_arr = np.asarray(p_values, dtype=np.float64)
    sorted_indices = np.argsort(p_arr)
    sorted_p = p_arr[sorted_indices]

    adj_p = np.zeros(m, dtype=np.float64)
    adj_p[-1] = sorted_p[-1]

    for k in range(m - 2, -1, -1):
        step_val = (m / (k + 1)) * sorted_p[k]
        adj_p[k] = min(adj_p[k + 1], step_val)

    adj_p = np.clip(adj_p, 0.0, 1.0)
    orig_adj_p = np.zeros(m, dtype=np.float64)
    orig_adj_p[sorted_indices] = adj_p

    reject_null = [bool(p <= alpha) for p in orig_adj_p]
    return orig_adj_p.tolist(), reject_null


def benjamini_yekutieli_fdr(
    p_values: List[float],
    alpha: float = 0.05,
) -> Tuple[List[float], List[bool]]:
    """
    Control FDR under arbitrary or negative dependence using Benjamini-Yekutieli (2001).
    Scales the BH threshold by c(m) = sum_{i=1}^m 1/i.
    """
    m = len(p_values)
    if m == 0:
        return [], []

    cm = float(np.sum(1.0 / np.arange(1, m + 1)))
    p_arr = np.asarray(p_values, dtype=np.float64)
    sorted_indices = np.argsort(p_arr)
    sorted_p = p_arr[sorted_indices]

    adj_p = np.zeros(m, dtype=np.float64)
    adj_p[-1] = sorted_p[-1] * cm

    for k in range(m - 2, -1, -1):
        step_val = (m * cm / (k + 1)) * sorted_p[k]
        adj_p[k] = min(adj_p[k + 1], step_val)

    adj_p = np.clip(adj_p, 0.0, 1.0)
    orig_adj_p = np.zeros(m, dtype=np.float64)
    orig_adj_p[sorted_indices] = adj_p

    reject_null = [bool(p <= alpha) for p in orig_adj_p]
    return orig_adj_p.tolist(), reject_null


def holm_bonferroni_fwer(
    p_values: List[float],
    alpha: float = 0.05,
) -> Tuple[List[float], List[bool]]:
    """
    Control Family-Wise Error Rate (FWER) using the Holm-Bonferroni (1979) step-down procedure.
    Strongly controls FWER without requiring independence.
    """
    m = len(p_values)
    if m == 0:
        return [], []

    p_arr = np.asarray(p_values, dtype=np.float64)
    sorted_indices = np.argsort(p_arr)
    sorted_p = p_arr[sorted_indices]

    adj_p = np.zeros(m, dtype=np.float64)
    running_max = 0.0

    for k in range(m):
        step_val = (m - k) * sorted_p[k]
        running_max = max(running_max, step_val)
        adj_p[k] = min(1.0, running_max)

    orig_adj_p = np.zeros(m, dtype=np.float64)
    orig_adj_p[sorted_indices] = adj_p

    reject_null = [bool(p <= alpha) for p in orig_adj_p]
    return orig_adj_p.tolist(), reject_null


def bootstrap_confidence_interval(
    values: np.ndarray,
    statistic_func: Callable[[np.ndarray], float],
    n_resamples: int = 500,
    confidence_level: float = 0.95,
    random_seed: int = 42,
) -> Tuple[float, float, float]:
    """
    Compute non-parametric bootstrap percentile confidence interval (lower, point_estimate, upper).
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


def bca_bootstrap_confidence_interval(
    values: np.ndarray,
    statistic_func: Callable[[np.ndarray], float],
    n_resamples: int = 500,
    confidence_level: float = 0.95,
    random_seed: int = 42,
) -> Tuple[float, float, float]:
    """
    Bias-Corrected and Accelerated (BCa) Bootstrap Confidence Interval (Efron 1987).
    Corrects for both median bias and skewness in the bootstrap distribution.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    point_est = float(statistic_func(x))
    rng = np.random.default_rng(random_seed)

    # 1. Bootstrap distribution
    boot_stats = np.empty(n_resamples, dtype=np.float64)
    for i in range(n_resamples):
        resample = rng.choice(x, size=n, replace=True)
        boot_stats[i] = statistic_func(resample)

    # 2. Bias-correction parameter z0
    prop_less = np.mean(boot_stats < point_est)
    prop_less = np.clip(prop_less, 1e-6, 1.0 - 1e-6)
    z0 = float(stats.norm.ppf(prop_less))

    # 3. Acceleration parameter a via leave-one-out jackknife
    jack_stats = np.empty(n, dtype=np.float64)
    indices = np.arange(n)
    for i in range(n):
        jack_sample = x[indices != i]
        jack_stats[i] = statistic_func(jack_sample)

    mean_jack = np.mean(jack_stats)
    diff = mean_jack - jack_stats
    num = np.sum(diff ** 3)
    denom = 6.0 * (np.sum(diff ** 2) ** 1.5)
    a = float(num / denom) if denom != 0 else 0.0

    # 4. Adjusted confidence percentiles
    alpha = 1.0 - confidence_level
    z_alpha_low = float(stats.norm.ppf(alpha / 2.0))
    z_alpha_high = float(stats.norm.ppf(1.0 - alpha / 2.0))

    def calc_percentile(z_val: float) -> float:
        denom_adj = 1.0 - a * (z0 + z_val)
        if denom_adj == 0:
            denom_adj = 1e-6
        adjusted_z = z0 + (z0 + z_val) / denom_adj
        pct = stats.norm.cdf(adjusted_z) * 100.0
        return float(np.clip(pct, 0.1, 99.9))

    pct_low = calc_percentile(z_alpha_low)
    pct_high = calc_percentile(z_alpha_high)

    lower = float(np.percentile(boot_stats, pct_low))
    upper = float(np.percentile(boot_stats, pct_high))

    return lower, point_est, upper


def moving_block_bootstrap(
    values: np.ndarray,
    block_length: int = 16,
    n_resamples: int = 500,
    random_seed: int = 42,
) -> List[np.ndarray]:
    """
    Moving-block bootstrap (Künsch 1989) preserving temporal dependence up to block_length.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    rng = np.random.default_rng(random_seed)

    n_possible_blocks = n - block_length + 1
    if n_possible_blocks <= 0:
        return [rng.choice(x, size=n, replace=True) for _ in range(n_resamples)]

    blocks = np.array([x[i : i + block_length] for i in range(n_possible_blocks)])
    k = int(np.ceil(n / block_length))

    resamples = []
    for _ in range(n_resamples):
        picked_indices = rng.integers(0, n_possible_blocks, size=k)
        sampled_series = np.concatenate(blocks[picked_indices])[:n]
        resamples.append(sampled_series)

    return resamples
