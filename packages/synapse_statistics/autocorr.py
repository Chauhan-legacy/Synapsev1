"""
Autocorrelation Structure and Ljung-Box Portmanteau Test for SYNAPSE STATISTICS.
Computes ACF, PACF, and tests for overall serial correlation / white noise null hypothesis.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
from statsmodels.tsa.stattools import acf, pacf
from statsmodels.stats.diagnostic import acorr_ljungbox

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class AutocorrStructureResult:
    lags: np.ndarray
    acf_values: np.ndarray
    pacf_values: np.ndarray
    confidence_band_95: float           # +/- 1.96 / sqrt(N)
    ljung_box_stat: float
    ljung_box_p_value: float
    is_white_noise: bool                # p >= alpha on Ljung-Box test
    first_zero_crossing_lag: Optional[int]


def compute_autocorr_structure(
    values: np.ndarray,
    max_lag: Optional[int] = None,
    alpha: float = 0.05,
) -> AutocorrStructureResult:
    """
    Compute ACF, PACF, Bartlett confidence bounds, and Ljung-Box Q test.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    if n < 16:
        raise ValidationError("Need at least 16 samples for autocorrelation structure.")

    default_nlags = min(40, n // 4)
    nlags = int(max_lag) if max_lag is not None else default_nlags
    nlags = max(2, min(nlags, n - 2))

    # Compute ACF and PACF
    acf_vals = acf(x, nlags=nlags, fft=True)
    try:
        pacf_vals = pacf(x, nlags=nlags, method="yule_walker")
    except Exception:
        pacf_vals = np.zeros(nlags + 1)
        pacf_vals[0] = 1.0

    lags = np.arange(len(acf_vals))
    band_95 = float(1.96 / np.sqrt(n))

    # Ljung-Box portmanteau test at lag h = nlags // 2 or 10
    h_lag = max(2, min(10, nlags))
    lb_df = acorr_ljungbox(x, lags=[h_lag], return_df=True)
    lb_stat = float(lb_df["lb_stat"].iloc[0])
    lb_p = float(lb_df["lb_pvalue"].iloc[0])

    is_wn = bool(lb_p >= alpha)

    # First zero crossing of ACF
    zero_cross = None
    for i in range(1, len(acf_vals)):
        if acf_vals[i] <= 0:
            zero_cross = int(i)
            break

    return AutocorrStructureResult(
        lags=lags,
        acf_values=acf_vals,
        pacf_values=pacf_vals,
        confidence_band_95=band_95,
        ljung_box_stat=lb_stat,
        ljung_box_p_value=lb_p,
        is_white_noise=is_wn,
        first_zero_crossing_lag=zero_cross,
    )
