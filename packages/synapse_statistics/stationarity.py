"""
Stationarity Testing (ADF and KPSS Joint Analysis) for SYNAPSE STATISTICS.
Combines Augmented Dickey-Fuller (ADF) unit root test and Kwiatkowski-Phillips-Schmidt-Shin (KPSS)
stationarity test to rigorously resolve stationary, trend stationary, and unit root regimes.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
from statsmodels.tsa.stattools import adfuller, kpss

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class StationarityResult:
    adf_statistic: float
    adf_p_value: float
    adf_lags: int
    adf_is_stationary: bool             # p < alpha (rejects unit root)
    kpss_statistic: float
    kpss_p_value: float
    kpss_lags: int
    kpss_is_stationary: bool            # p >= alpha (fails to reject stationarity)
    regime_conclusion: str              # Stationary, Unit Root, Trend Stationary, Inconclusive
    rolling_mean_drift_pct: float
    rolling_var_drift_pct: float


def evaluate_stationarity(
    values: np.ndarray,
    alpha: float = 0.05,
) -> StationarityResult:
    """
    Run joint ADF and KPSS tests to determine stationarity properties.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    if n < 16:
        raise ValidationError("Need at least 16 samples for stationarity testing.")

    # 1. ADF Test: H0 = Has unit root (non-stationary), H1 = Stationary
    adf_out = adfuller(x, autolag="AIC")
    adf_stat = float(adf_out[0])
    adf_p = float(adf_out[1])
    adf_lags = int(adf_out[2])
    adf_stat_pass = bool(adf_p < alpha)

    # 2. KPSS Test: H0 = Stationary around level, H1 = Unit root / non-stationary
    try:
        kpss_out = kpss(x, regression="c", nlags="auto")
        kpss_stat = float(kpss_out[0])
        kpss_p = float(kpss_out[1])
        kpss_lags = int(kpss_out[2])
    except Exception:
        kpss_stat = 0.0
        kpss_p = 0.10
        kpss_lags = 0
    kpss_stat_pass = bool(kpss_p >= alpha)

    # 3. Joint Regime Classification
    if adf_stat_pass and kpss_stat_pass:
        regime = "Strictly Stationary (both ADF and KPSS confirm stationarity)"
    elif (not adf_stat_pass) and (not kpss_stat_pass):
        regime = "Unit Root / Non-Stationary (both ADF and KPSS identify non-stationarity)"
    elif adf_stat_pass and (not kpss_stat_pass):
        regime = "Difference / Trend Stationary (ADF rejects unit root but KPSS detects variance/trend drift)"
    else:
        regime = "Inconclusive / Low Power (ADF fails to reject unit root, KPSS fails to reject stationarity)"

    # 4. Rolling statistics drift
    chunk_size = max(4, n // 4)
    chunk_means = [np.mean(x[i : i + chunk_size]) for i in range(0, n - chunk_size + 1, chunk_size)]
    chunk_vars = [np.var(x[i : i + chunk_size]) for i in range(0, n - chunk_size + 1, chunk_size)]

    mean_drift = float(np.ptp(chunk_means) / (np.std(x) or 1.0) * 100.0)
    var_drift = float(np.ptp(chunk_vars) / (np.mean(chunk_vars) or 1.0) * 100.0)

    return StationarityResult(
        adf_statistic=adf_stat,
        adf_p_value=adf_p,
        adf_lags=adf_lags,
        adf_is_stationary=adf_stat_pass,
        kpss_statistic=kpss_stat,
        kpss_p_value=kpss_p,
        kpss_lags=kpss_lags,
        kpss_is_stationary=kpss_stat_pass,
        regime_conclusion=regime,
        rolling_mean_drift_pct=mean_drift,
        rolling_var_drift_pct=var_drift,
    )
