"""
Granger Causality Analysis for SYNAPSE RELATION.
Evaluates directional predictive causality using Vector Autoregression (VAR) F-tests in both directions.
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
    is_significant: bool                # p < alpha


@dataclass(frozen=True)
class GrangerCausalityResult:
    x_causes_y: GrangerDirectionResult
    y_causes_x: GrangerDirectionResult
    directional_summary: str            # "X -> Y", "Y -> X", "Feedback (X <-> Y)", "No Causality"


def compute_granger_causality(
    channel_x: np.ndarray,
    channel_y: np.ndarray,
    max_lag: int = 5,
    alpha: float = 0.05,
) -> GrangerCausalityResult:
    """
    Test Granger causality between X and Y in both directions.
    """
    x = np.asarray(channel_x, dtype=np.float64)
    y = np.asarray(channel_y, dtype=np.float64)
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
        best_p = 1
        best_aic = float("inf")
        models = {}

        for p in range(1, p_max + 1):
            n_eff = n - p
            # Target response vector: shape (n_eff,)
            Y_vec = target[p:]

            # Restricted design matrix: past of target
            X_R = np.column_stack([target[p - k : n - k] for k in range(1, p + 1)])
            X_R = np.column_stack([np.ones(n_eff), X_R])

            # Unrestricted design matrix: past of target + past of source
            X_U = np.column_stack([
                X_R,
                np.column_stack([source[p - k : n - k] for k in range(1, p + 1)])
            ])

            # OLS for Restricted
            beta_R, _, _, _ = np.linalg.lstsq(X_R, Y_vec, rcond=None)
            resid_R = Y_vec - X_R @ beta_R
            rss_R = float(np.sum(resid_R ** 2))

            # OLS for Unrestricted
            beta_U, _, _, _ = np.linalg.lstsq(X_U, Y_vec, rcond=None)
            resid_U = Y_vec - X_U @ beta_U
            rss_U = float(np.sum(resid_U ** 2))

            # AIC for unrestricted model
            sigma2_U = max(1e-12, rss_U / n_eff)
            aic = n_eff * np.log(sigma2_U) + 2.0 * (2 * p + 1)

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

            models[p] = (f_stat, p_val)
            if aic < best_aic:
                best_aic = aic
                best_p = p

        f_best, p_best = models[best_p]
        return GrangerDirectionResult(
            f_statistic=f_best,
            p_value=p_best,
            optimal_lag_p=best_p,
            is_significant=bool(p_best < alpha),
        )

    res_xy = test_single_direction(x, y) # X -> Y
    res_yx = test_single_direction(y, x) # Y -> X

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
    )
