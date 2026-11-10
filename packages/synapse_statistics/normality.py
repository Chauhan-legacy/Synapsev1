"""
Normality Testing and Distributional Descriptives for SYNAPSE STATISTICS.
Implements Jarque-Bera, Shapiro-Wilk, skewness, kurtosis, and Q-Q plot quantile mapping.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.stats as stats

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class NormalityResult:
    mean: float
    median: float
    std_dev: float
    mad: float
    iqr: float
    skewness: float
    kurtosis: float
    jarque_bera_stat: float
    jarque_bera_p_value: float
    shapiro_wilk_stat: float
    shapiro_wilk_p_value: float
    is_normal: bool                     # p >= alpha on both tests
    theoretical_quantiles: np.ndarray   # Q-Q plot X (Standard normal quantiles)
    sample_quantiles: np.ndarray        # Q-Q plot Y (Sorted standardized sample)


def evaluate_normality(
    values: np.ndarray,
    alpha: float = 0.05,
) -> NormalityResult:
    """
    Run Jarque-Bera and Shapiro-Wilk normality tests and compute robust distribution moments.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    if n < 8:
        raise ValidationError("Need at least 8 samples for normality testing.")

    mean_val = float(np.mean(x))
    med_val = float(np.median(x))
    std_val = float(np.std(x, ddof=1)) or 1e-6
    mad_val = float(stats.median_abs_deviation(x))
    iqr_val = float(stats.iqr(x))
    skew_val = float(stats.skew(x))
    kurt_val = float(stats.kurtosis(x)) # Excess kurtosis

    # 1. Jarque-Bera Test (asymptotically Chi-square df=2)
    jb_stat, jb_p = stats.jarque_bera(x)
    jb_stat = float(jb_stat)
    jb_p = float(jb_p)

    # 2. Shapiro-Wilk Test (subsample if N > 5000 as per algorithm constraints)
    if n > 5000:
        rng = np.random.default_rng(42)
        sw_sample = rng.choice(x, size=5000, replace=False)
        sw_stat, sw_p = stats.shapiro(sw_sample)
    else:
        sw_stat, sw_p = stats.shapiro(x)
    sw_stat = float(sw_stat)
    sw_p = float(sw_p)

    is_norm = bool(jb_p >= alpha and sw_p >= alpha)

    # 3. Q-Q Plot Coordinates (100 quantile points)
    n_points = min(100, n)
    prob_grid = np.linspace(0.01, 0.99, n_points)
    theo_q = stats.norm.ppf(prob_grid)
    sample_standardized = (np.sort(x) - mean_val) / std_val
    # Interpolate sample quantiles at matching percentiles
    sample_q = np.percentile(sample_standardized, prob_grid * 100.0)

    return NormalityResult(
        mean=mean_val,
        median=med_val,
        std_dev=std_val,
        mad=mad_val,
        iqr=iqr_val,
        skewness=skew_val,
        kurtosis=kurt_val,
        jarque_bera_stat=jb_stat,
        jarque_bera_p_value=jb_p,
        shapiro_wilk_stat=sw_stat,
        shapiro_wilk_p_value=sw_p,
        is_normal=is_norm,
        theoretical_quantiles=theo_q,
        sample_quantiles=sample_q,
    )
