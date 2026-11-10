"""
Continuous Wavelet Transform (CWT) with Cone of Influence and Red-Noise Null for SYNAPSE SPECTRA.
Implements Morlet CWT scalograms, Cone of Influence (COI) boundary mapping,
and Torrence & Compo (1998) AR(1) red-noise 95% significance contours.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.stats as stats
import pywt

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class CWTResult:
    times: np.ndarray                 # Time vector [s]
    frequencies: np.ndarray           # Pseudo-frequencies corresponding to scales [Hz]
    scales: np.ndarray                # Wavelet scales
    coefficients: np.ndarray          # 2D complex CWT array (n_scales, n_times)
    scalogram_power: np.ndarray       # 2D power array |coef|^2
    cone_of_influence_hz: np.ndarray  # Minimum frequency at time t before edge contamination
    significance_contour_mask: np.ndarray # Boolean mask where power > 95% AR(1) null threshold
    red_noise_ar1_lag1: float         # Estimated lag-1 autocorrelation r1
    wavelet_name: str
    sampling_rate: float


def compute_cwt(
    signal_array: np.ndarray,
    sampling_rate: float,
    wavelet_name: str = "cmor1.5-1.0",
    n_scales: int = 64,
    f_min: Optional[float] = None,
    f_max: Optional[float] = None,
    alpha: float = 0.05,
) -> CWTResult:
    """
    Compute Continuous Wavelet Transform with Cone of Influence and AR(1) red-noise significance.
    """
    x = np.asarray(signal_array, dtype=np.float64)
    if x.ndim != 1:
        raise ValidationError(f"compute_cwt expects 1D array, got shape {x.shape}.")
    
    n_total = len(x)
    if n_total < 8:
        raise ValidationError("Signal must have at least 8 samples for CWT.")
    if sampling_rate <= 0:
        raise ValidationError(f"Sampling rate must be positive, got {sampling_rate}.")

    dt = 1.0 / sampling_rate
    times = np.arange(n_total) * dt
    nyquist = sampling_rate / 2.0

    f_high = f_max if f_max is not None and f_max < nyquist else nyquist * 0.95
    f_low = f_min if f_min is not None and f_min > 0 else max(sampling_rate / n_total, 0.05)

    if f_low >= f_high:
        raise ValidationError(f"f_min ({f_low}) must be strictly less than f_max ({f_high}).")

    # Logarithmically spaced frequencies
    freqs = np.geomspace(f_high, f_low, num=n_scales)
    scales = pywt.frequency2scale(wavelet_name, freqs / sampling_rate)

    # Detrend constant
    x_centered = x - np.mean(x)
    variance = float(np.var(x_centered)) or 1.0

    coefs, _ = pywt.cwt(x_centered, scales, wavelet_name, sampling_period=dt)
    power = np.abs(coefs) ** 2

    # 1. Cone of Influence (COI):
    # For Morlet, e-folding time tau_e = sqrt(2) * s
    # At each time point t, maximum valid period is sqrt(2) * min(t, T - t)
    # COI in frequency is f_coi(t) = 1.0 / (sqrt(2) * max(dt, min(t, times[-1] - t)))
    t_edge_dist = np.minimum(times, times[-1] - times)
    coi_period = np.sqrt(2.0) * np.maximum(dt, t_edge_dist)
    coi_freq = 1.0 / coi_period

    # 2. Torrence & Compo (1998) AR(1) Red-Noise Significance:
    # Estimate lag-1 autocorrelation r1
    r1 = float(np.corrcoef(x_centered[:-1], x_centered[1:])[0, 1])
    r1 = float(np.clip(r1, 0.0, 0.99)) # red noise only

    # Theoretical red-noise spectrum P_red(f):
    # P_red(f) = (1 - r1^2) / (1 + r1^2 - 2*r1*cos(2*pi*f/fs))
    cos_term = np.cos(2.0 * np.pi * freqs / sampling_rate)
    p_red = (1.0 - r1 ** 2) / np.maximum(1e-12, 1.0 + r1 ** 2 - 2.0 * r1 * cos_term)

    # Power under H0 is distributed as (variance / 2) * P_red(f) * chi2_2
    # 100(1 - alpha)% critical threshold: chi2.ppf(1 - alpha, df=2) = -2 * ln(alpha)
    chi2_crit = float(stats.chi2.ppf(1.0 - alpha, df=2))
    threshold_curve = (variance / 2.0) * p_red * chi2_crit # shape (n_scales,)

    # 2D Significance contour mask: shape (n_scales, n_times)
    sig_mask = power > threshold_curve[:, np.newaxis]

    # Mask outside COI as false for significance
    for i in range(len(times)):
        invalid_scale_mask = freqs < coi_freq[i]
        sig_mask[invalid_scale_mask, i] = False

    return CWTResult(
        times=times,
        frequencies=freqs,
        scales=scales,
        coefficients=coefs,
        scalogram_power=power,
        cone_of_influence_hz=coi_freq,
        significance_contour_mask=sig_mask,
        red_noise_ar1_lag1=r1,
        wavelet_name=wavelet_name,
        sampling_rate=sampling_rate,
    )
