"""
Generalized Extreme Studentized Deviate (Rosner's ESD) for SYNAPSE ANOMALY.
Detects multiple outliers in univariate series without suffering from masking effects,
using exact critical values from Student's t distribution with multiplicity control
and adaptive pre-whitening for coloured noise backgrounds.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.stats as stats

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class ESDResult:
    outlier_indices: Tuple[int, ...]
    outlier_values: Tuple[float, ...]
    test_statistics: Tuple[float, ...]
    critical_values: Tuple[float, ...]
    n_outliers_detected: int
    alpha: float
    max_outliers_tested: int


def prewhiten_series(values: np.ndarray) -> Tuple[np.ndarray, Optional[float]]:
    """
    Apply adaptive pre-whitening to suppress false outlier discoveries on coloured noise.
    Returns (whitened_series, ar_param).
    """
    x = np.asarray(values, dtype=np.float64)
    if len(x) < 8:
        return x, None
    r1 = float(np.corrcoef(x[:-1], x[1:])[0, 1])
    if np.isnan(r1):
        return x, None
    if r1 > 0.85:
        # Near unit-root brown noise / random walk: first difference
        diff = np.diff(x)
        return np.concatenate([[diff[0]], diff]), 1.0
    elif abs(r1) > 0.20:
        # Coloured pink noise or AR(1): filter x_t - r1 * x_{t-1}
        ar_res = x[1:] - r1 * x[:-1]
        return np.concatenate([[ar_res[0]], ar_res]), r1
    return x, None


def generalized_esd_test(
    values: np.ndarray,
    max_outliers: Optional[int] = None,
    alpha: float = 0.05,
    prewhiten: bool = True,
) -> ESDResult:
    """
    Execute Rosner's Generalized ESD test with multiplicity correction and pre-whitening.
    """
    x_orig = np.asarray(values, dtype=np.float64)
    n = len(x_orig)
    if n < 8:
        raise ValidationError("Need at least 8 samples for Rosner's ESD test.")

    # Default max outliers: 10% of dataset or max 50
    k_max = int(max_outliers) if max_outliers is not None else max(1, min(50, int(0.1 * n)))
    k_max = min(k_max, n - 2)

    # Pre-whiten if requested
    if prewhiten:
        x, _ = prewhiten_series(x_orig)
    else:
        x = x_orig.copy()

    working_arr = x.copy()
    current_indices = np.arange(n)

    r_stats: List[float] = []
    crit_vals: List[float] = []
    removed_indices: List[int] = []
    removed_vals: List[float] = []

    # Multiplicity-adjusted alpha per candidate outlier test (Bonferroni across candidates)
    alpha_adj = alpha / float(k_max)

    for i in range(1, k_max + 1):
        cur_n = len(working_arr)
        mean_cur = np.mean(working_arr)
        std_cur = np.std(working_arr, ddof=1)
        if std_cur <= 1e-12:
            break

        # R_i = max |x_j - mean| / s
        devs = np.abs(working_arr - mean_cur)
        max_idx = int(np.argmax(devs))
        r_i = float(devs[max_idx] / std_cur)
        r_stats.append(r_i)

        # Critical value lambda_i with multiplicity-controlled alpha:
        df = cur_n - 2
        p_val = 1.0 - (alpha_adj / (2.0 * cur_n))
        t_crit = float(stats.t.ppf(p_val, df=df))
        lambda_num = (cur_n - 1) * t_crit
        lambda_denom = np.sqrt((cur_n - 2 + t_crit ** 2) * cur_n)
        lambda_i = float(lambda_num / max(1e-12, lambda_denom))
        crit_vals.append(lambda_i)

        orig_idx = int(current_indices[max_idx])
        removed_indices.append(orig_idx)
        removed_vals.append(float(x_orig[orig_idx]))

        working_arr = np.delete(working_arr, max_idx)
        current_indices = np.delete(current_indices, max_idx)

    # Find the largest k such that R_k > lambda_k
    num_outliers = 0
    for idx in range(len(r_stats) - 1, -1, -1):
        if r_stats[idx] > crit_vals[idx]:
            num_outliers = idx + 1
            break

    final_indices = tuple(removed_indices[:num_outliers])
    final_values = tuple(removed_vals[:num_outliers])

    return ESDResult(
        outlier_indices=final_indices,
        outlier_values=final_values,
        test_statistics=tuple(r_stats),
        critical_values=tuple(crit_vals),
        n_outliers_detected=num_outliers,
        alpha=alpha,
        max_outliers_tested=k_max,
    )
