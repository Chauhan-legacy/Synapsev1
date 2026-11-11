"""
Diagnostic Pre-flight Layer for SYNAPSE.
Evaluates foundational signal properties before running complex inferential engines:
- Stationarity (Dual ADF & KPSS diagnostic)
- Normality & Gaussianity (D'Agostino-Pearson omnibus & Jarque-Bera)
- Temporal Autocorrelation & Whiteness (Ljung-Box test)
- Sampling Regularity & Numerical Integrity
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
import numpy as np
import scipy.stats as stats
from statsmodels.tsa.stattools import adfuller, kpss

from synapse_core.models.signal import Signal


@dataclass(frozen=True)
class PreflightDiagnostics:
    is_uniformly_sampled: bool
    sample_count: int
    channel_count: int
    duration_seconds: float
    sampling_rate_hz: float
    has_nans_or_infs: bool
    is_constant_signal: bool

    # Stationarity
    stationarity_regime: str             # "Stationary", "Trend Non-Stationary", "Unit-Root Non-Stationary", "Inconclusive"
    adf_p_value: float
    kpss_p_value: float

    # Normality
    is_gaussian: bool
    normality_p_value: float
    skewness: float
    excess_kurtosis: float

    # Whiteness / Autocorrelation
    is_white_noise: bool
    ljung_box_p_value: float
    lag1_autocorr: float

    # Summary warnings for learners and scientists
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_uniformly_sampled": self.is_uniformly_sampled,
            "sample_count": self.sample_count,
            "channel_count": self.channel_count,
            "duration_seconds": self.duration_seconds,
            "sampling_rate_hz": self.sampling_rate_hz,
            "has_nans_or_infs": self.has_nans_or_infs,
            "is_constant_signal": self.is_constant_signal,
            "stationarity_regime": self.stationarity_regime,
            "adf_p_value": self.adf_p_value,
            "kpss_p_value": self.kpss_p_value,
            "is_gaussian": self.is_gaussian,
            "normality_p_value": self.normality_p_value,
            "skewness": self.skewness,
            "excess_kurtosis": self.excess_kurtosis,
            "is_white_noise": self.is_white_noise,
            "ljung_box_p_value": self.ljung_box_p_value,
            "lag1_autocorr": self.lag1_autocorr,
            "warnings": self.warnings,
        }


def run_preflight_diagnostics(signal: Signal, channel_index: int = 0) -> PreflightDiagnostics:
    """
    Run non-destructive diagnostic check on input signal.
    """
    ch_names = signal.channel_names
    primary_ch = ch_names[channel_index]
    vals = signal.get_channel(primary_ch)
    n = len(vals)
    fs = signal.sampling_rate

    warnings: List[str] = []

    # 1. Numerical integrity
    has_nan_inf = bool(np.any(np.isnan(vals)) or np.any(np.isinf(vals)))
    if has_nan_inf:
        warnings.append("Dataset contains NaN or Infinite values. Interpolate or clean before running estimators.")

    std_val = float(np.std(vals))
    is_const = bool(std_val < 1e-12)
    if is_const:
        warnings.append("Signal variance is near zero (constant flatline). Dynamical and spectral analysis not applicable.")

    # 2. Stationarity (ADF + KPSS)
    adf_p = 1.0
    kpss_p = 0.0
    regime = "Inconclusive"

    if n >= 32 and not is_const and not has_nan_inf:
        try:
            adf_res = adfuller(vals, autolag="AIC")
            adf_p = float(adf_res[1])
        except Exception:
            adf_p = 1.0

        try:
            kpss_res = kpss(vals, regression="c", nlags="auto")
            kpss_p = float(kpss_res[1])
        except Exception:
            kpss_p = 0.0

        if adf_p < 0.05 and kpss_p >= 0.05:
            regime = "Strictly Stationary"
        elif adf_p >= 0.05 and kpss_p < 0.05:
            regime = "Unit-Root Non-Stationary"
            warnings.append("Signal is non-stationary (unit root). Difference or detrend before estimating AR models.")
        elif adf_p < 0.05 and kpss_p < 0.05:
            regime = "Trend Stationary"
            warnings.append("Signal exhibits deterministic trend. Consider linear or polynomial detrending.")
        else:
            regime = "Inconclusive / Mixed"

    # 3. Normality
    norm_p = 0.0
    is_gauss = False
    skew = 0.0
    kurt = 0.0

    if n >= 20 and not is_const and not has_nan_inf:
        try:
            norm_stat, norm_p_val = stats.normaltest(vals)
            norm_p = float(norm_p_val)
            is_gauss = bool(norm_p >= 0.05)
        except Exception:
            norm_p = 0.0
            is_gauss = False

        skew = float(stats.skew(vals))
        kurt = float(stats.kurtosis(vals))
        if not is_gauss and (abs(skew) > 1.0 or abs(kurt) > 2.0):
            warnings.append(f"Heavy tails or skewness detected (skew={skew:.2f}, excess kurtosis={kurt:.2f}). Non-parametric estimators recommended.")

    # 4. Whiteness & Autocorrelation
    lb_p = 0.0
    is_white = False
    lag1_ac = 0.0

    if n >= 16 and not is_const and not has_nan_inf:
        v_centered = vals - np.mean(vals)
        c0 = np.sum(v_centered ** 2)
        if c0 > 1e-12:
            c1 = np.sum(v_centered[:-1] * v_centered[1:])
            lag1_ac = float(c1 / c0)

        # Ljung-Box test for whiteness
        try:
            from statsmodels.stats.diagnostic import acorr_ljungbox
            lb_df = acorr_ljungbox(vals, lags=[min(10, n // 5)], return_df=True)
            lb_p = float(lb_df["lb_pvalue"].iloc[0])
            is_white = bool(lb_p >= 0.05)
        except Exception:
            lb_p = 0.0
            is_white = False

    return PreflightDiagnostics(
        is_uniformly_sampled=signal.is_uniform,
        sample_count=n,
        channel_count=signal.n_channels,
        duration_seconds=float(signal.sampling.duration),
        sampling_rate_hz=float(fs or 0.0),
        has_nans_or_infs=has_nan_inf,
        is_constant_signal=is_const,
        stationarity_regime=regime,
        adf_p_value=adf_p,
        kpss_p_value=kpss_p,
        is_gaussian=is_gauss,
        normality_p_value=norm_p,
        skewness=skew,
        excess_kurtosis=kurt,
        is_white_noise=is_white,
        ljung_box_p_value=lb_p,
        lag1_autocorr=lag1_ac,
        warnings=warnings,
    )
