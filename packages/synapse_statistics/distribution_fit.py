"""
Distribution Fitting and Model Selection for SYNAPSE STATISTICS.
Fits candidate parametric probability distributions, ranks by AIC/BIC,
and computes Kolmogorov-Smirnov goodness-of-fit tests.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.stats as stats

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class DistributionFitCandidate:
    name: str
    aic: float
    bic: float
    ks_statistic: float
    ks_p_value: float
    parameters: Dict[str, float]


@dataclass(frozen=True)
class DistributionFitResult:
    best_distribution: str
    candidates: Tuple[DistributionFitCandidate, ...]


def fit_candidate_distributions(
    values: np.ndarray,
) -> DistributionFitResult:
    """
    Fit Normal, Student-t, Laplace, and Logistic distributions and rank by AIC.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    if n < 16:
        raise ValidationError("Need at least 16 samples for parametric distribution fitting.")

    candidates: List[DistributionFitCandidate] = []

    # 1. Normal Distribution
    loc_norm, scale_norm = stats.norm.fit(x)
    ll_norm = float(np.sum(stats.norm.logpdf(x, loc=loc_norm, scale=scale_norm)))
    aic_norm = 2 * 2 - 2 * ll_norm
    bic_norm = 2 * np.log(n) - 2 * ll_norm
    ks_stat_norm, ks_p_norm = stats.kstest(x, "norm", args=(loc_norm, scale_norm))
    candidates.append(
        DistributionFitCandidate(
            name="Normal (Gaussian)",
            aic=aic_norm,
            bic=bic_norm,
            ks_statistic=float(ks_stat_norm),
            ks_p_value=float(ks_p_norm),
            parameters={"mean": float(loc_norm), "std": float(scale_norm)},
        )
    )

    # 2. Student-t Distribution (heavy tails)
    try:
        df_t, loc_t, scale_t = stats.t.fit(x)
        ll_t = float(np.sum(stats.t.logpdf(x, df=df_t, loc=loc_t, scale=scale_t)))
        aic_t = 2 * 3 - 2 * ll_t
        bic_t = 3 * np.log(n) - 2 * ll_t
        ks_stat_t, ks_p_t = stats.kstest(x, "t", args=(df_t, loc_t, scale_t))
        candidates.append(
            DistributionFitCandidate(
                name="Student-t (Heavy Tails)",
                aic=aic_t,
                bic=bic_t,
                ks_statistic=float(ks_stat_t),
                ks_p_value=float(ks_p_t),
                parameters={"df": float(df_t), "loc": float(loc_t), "scale": float(scale_t)},
            )
        )
    except Exception:
        pass

    # 3. Laplace Distribution (sharp peak, double exponential)
    loc_lap, scale_lap = stats.laplace.fit(x)
    ll_lap = float(np.sum(stats.laplace.logpdf(x, loc=loc_lap, scale=scale_lap)))
    aic_lap = 2 * 2 - 2 * ll_lap
    bic_lap = 2 * np.log(n) - 2 * ll_lap
    ks_stat_lap, ks_p_lap = stats.kstest(x, "laplace", args=(loc_lap, scale_lap))
    candidates.append(
        DistributionFitCandidate(
            name="Laplace (Double Exponential)",
            aic=aic_lap,
            bic=bic_lap,
            ks_statistic=float(ks_stat_lap),
            ks_p_value=float(ks_p_lap),
            parameters={"loc": float(loc_lap), "scale": float(scale_lap)},
        )
    )

    # 4. Logistic Distribution
    loc_log, scale_log = stats.logistic.fit(x)
    ll_log = float(np.sum(stats.logistic.logpdf(x, loc=loc_log, scale=scale_log)))
    aic_log = 2 * 2 - 2 * ll_log
    bic_log = 2 * np.log(n) - 2 * ll_log
    ks_stat_log, ks_p_log = stats.kstest(x, "logistic", args=(loc_log, scale_log))
    candidates.append(
        DistributionFitCandidate(
            name="Logistic Distribution",
            aic=aic_log,
            bic=bic_log,
            ks_statistic=float(ks_stat_log),
            ks_p_value=float(ks_p_log),
            parameters={"loc": float(loc_log), "scale": float(scale_log)},
        )
    )

    # Rank by AIC ascending
    candidates.sort(key=lambda c: c.aic)
    best = candidates[0].name if candidates else "Unknown"

    return DistributionFitResult(
        best_distribution=best,
        candidates=tuple(candidates),
    )

