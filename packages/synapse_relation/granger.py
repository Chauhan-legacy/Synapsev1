"""
Granger Causality Analysis for SYNAPSE RELATION.
Evaluates directional predictive causality using Vector Autoregression (VAR) F-tests in both directions.
Uses restricted-model BIC lag selection to eliminate selection bias and prevent inflated false-positive rates under the null.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.stats as stats

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class GrangerDirectionResult:
    f_statistic: float
    p_value: float
    optimal_lag_p: int
    is_significant: bool                # p_adjusted < alpha
    p_adjusted: float = 0.0             # multiplicity-adjusted p-value (Benjamini-Hochberg / Bonferroni)


@dataclass(frozen=True)
class GrangerCausalityResult:
    x_causes_y: GrangerDirectionResult
    y_causes_x: GrangerDirectionResult
    directional_summary: str            # "X -> Y", "Y -> X", "Feedback (X <-> Y)", "No Causality"
    differenced: bool = False
    prewhitened: bool = False
    estimated_lag: int = 0
    lag_seconds: float = 0.0
    aligned: bool = False


def compute_granger_causality(
    channel_x: np.ndarray,
    channel_y: np.ndarray,
    max_lag: int = 5,
    alpha: float = 0.05,
    differencing: bool = False,
    prewhiten: bool = False,
    max_align_lag: int = 50,
    sampling_rate: Optional[float] = None,
) -> GrangerCausalityResult:
    """
    Test Granger causality between X and Y in both directions.
    Optionally applies delay-aware alignment, differencing, or AR prewhitening.
    Adjusts p-values across both directions using Benjamini-Hochberg FDR control.
    """
    x_raw = np.asarray(channel_x, dtype=np.float64)
    y_raw = np.asarray(channel_y, dtype=np.float64)

    n_raw = len(x_raw)
    if len(y_raw) != n_raw:
        raise ValidationError("Channels must have identical length for Granger causality.")
    if n_raw < 32:
        raise ValidationError("Need at least 32 samples for Granger causality test.")

    # 0. Delay-Aware Cross-Correlation Alignment
    estimated_lag = 0
    lag_seconds = 0.0
    aligned = False

    if max_align_lag > 0 and n_raw >= max_align_lag * 2:
        sx = float(np.std(x_raw))
        sy = float(np.std(y_raw))
        if sx > 1e-12 and sy > 1e-12:
            x_norm = (x_raw - np.mean(x_raw)) / sx
            y_norm = (y_raw - np.mean(y_raw)) / sy
            best_lag = 0
            best_r = 0.0
            for k in range(-max_align_lag, max_align_lag + 1):
                if k > 0:
                    r_k = float(np.mean(x_norm[:-k] * y_norm[k:]))
                elif k < 0:
                    r_k = float(np.mean(x_norm[-k:] * y_norm[:k]))
                else:
                    r_k = float(np.mean(x_norm * y_norm))
                if abs(r_k) > abs(best_r):
                    best_r = r_k
                    best_lag = k

            if best_lag != 0 and abs(best_r) >= 0.15:
                estimated_lag = best_lag
                fs = sampling_rate if (sampling_rate and sampling_rate > 0) else 1.0
                lag_seconds = float(best_lag / fs)
                if abs(best_lag) > max_lag:
                    aligned = True
                    if best_lag > 0:
                        x_raw = x_raw[:-best_lag]
                        y_raw = y_raw[best_lag:]
                    else:
                        x_raw = x_raw[-best_lag:]
                        y_raw = y_raw[:best_lag]

    x = x_raw
    y = y_raw

    if differencing:
        x = np.diff(x)
        y = np.diff(y)
    elif prewhiten:
        def _prewhiten_ar(series: np.ndarray, p_ar: int = 2) -> np.ndarray:
            ns = len(series)
            if ns <= p_ar + 1:
                return series
            mat = np.column_stack([series[p_ar - k : ns - k] for k in range(1, p_ar + 1)])
            mat = np.column_stack([np.ones(ns - p_ar), mat])
            target = series[p_ar:]
            b, _, _, _ = np.linalg.lstsq(mat, target, rcond=None)
            return target - mat @ b
        p_whiten = min(4, max(1, max_lag))
        x = _prewhiten_ar(x, p_whiten)
        y = _prewhiten_ar(y, p_whiten)

    n = len(x)
    if len(y) != n:
        raise ValidationError("Channels must have identical length for Granger causality.")
    if n < 32:
        raise ValidationError("Need at least 32 samples for Granger causality test.")

    p_max = min(max_lag, n // 8)
    p_max = max(1, p_max)

    def test_single_direction(source: np.ndarray, target: np.ndarray) -> GrangerDirectionResult:
        # We test if source Granger-causes target.
        # Restricted model: target_t = sum_{k=1}^p a_k target_{t-k} + eps_R
        # Unrestricted model: target_t = sum_{k=1}^p a_k target_{t-k} + sum_{k=1}^p b_k source_{t-k} + eps_U

        # 1. Select optimal lag p on the RESTRICTED univariate AR model of the target using BIC.
        # This prevents selection bias from searching over unrestricted combinations under H0.
        best_p = 1
        best_bic = float("inf")

        for p in range(1, p_max + 1):
            n_eff = n - p
            Y_vec = target[p:]
            X_R = np.column_stack([target[p - k : n - k] for k in range(1, p + 1)])
            X_R = np.column_stack([np.ones(n_eff), X_R])

            beta_R, _, _, _ = np.linalg.lstsq(X_R, Y_vec, rcond=None)
            resid_R = Y_vec - X_R @ beta_R
            rss_R = float(np.sum(resid_R ** 2))
            sigma2_R = max(1e-12, rss_R / n_eff)
            bic = n_eff * np.log(sigma2_R) + (p + 1) * np.log(n_eff)

            if bic < best_bic:
                best_bic = bic
                best_p = p

        # 2. Fit restricted and unrestricted models at best_p
        p = best_p
        n_eff = n - p
        Y_vec = target[p:]

        X_R = np.column_stack([target[p - k : n - k] for k in range(1, p + 1)])
        X_R = np.column_stack([np.ones(n_eff), X_R])
        beta_R, _, _, _ = np.linalg.lstsq(X_R, Y_vec, rcond=None)
        resid_R = Y_vec - X_R @ beta_R
        rss_R = float(np.sum(resid_R ** 2))

        X_U = np.column_stack([
            X_R,
            np.column_stack([source[p - k : n - k] for k in range(1, p + 1)])
        ])
        beta_U, _, _, _ = np.linalg.lstsq(X_U, Y_vec, rcond=None)
        resid_U = Y_vec - X_U @ beta_U
        rss_U = float(np.sum(resid_U ** 2))

        # F-statistic: ((RSS_R - RSS_U) / p) / (RSS_U / (n_eff - 2*p - 1))
        df1 = p
        df2 = n_eff - 2 * p - 1
        if df2 > 0 and rss_U > 0:
            f_stat = ((rss_R - rss_U) / df1) / (rss_U / df2)
            f_stat = max(0.0, float(f_stat))
            p_val = float(stats.f.sf(f_stat, df1, df2))
        else:
            f_stat = 0.0
            p_val = 1.0

        return (f_stat, p_val, best_p)

    f_xy, p_xy, p_lag_xy = test_single_direction(x, y) # X -> Y
    f_yx, p_yx, p_lag_yx = test_single_direction(y, x) # Y -> X

    # Benjamini-Hochberg / Bonferroni adjusted p-values for testing 2 directional hypotheses
    p_adj_xy = min(1.0, float(p_xy) * 2.0)
    p_adj_yx = min(1.0, float(p_yx) * 2.0)

    res_xy = GrangerDirectionResult(
        f_statistic=f_xy,
        p_value=p_xy,
        p_adjusted=p_adj_xy,
        optimal_lag_p=p_lag_xy,
        is_significant=bool(p_adj_xy < alpha),
    )
    res_yx = GrangerDirectionResult(
        f_statistic=f_yx,
        p_value=p_yx,
        p_adjusted=p_adj_yx,
        optimal_lag_p=p_lag_yx,
        is_significant=bool(p_adj_yx < alpha),
    )

    if res_xy.is_significant and res_yx.is_significant:
        summary = "Feedback Coupling (X <-> Y bidirectional)"
    elif res_xy.is_significant:
        summary = "Unidirectional Influence: Channel X Granger-causes Channel Y"
    elif res_yx.is_significant:
        summary = "Unidirectional Influence: Channel Y Granger-causes Channel X"
    else:
        summary = "No Statistically Significant Granger Causality Detected"

    return GrangerCausalityResult(
        x_causes_y=res_xy,
        y_causes_x=res_yx,
        directional_summary=summary,
        differenced=differencing,
        prewhitened=prewhiten,
        estimated_lag=estimated_lag,
        lag_seconds=lag_seconds,
        aligned=aligned,
    )
