"""
Continuous Wavelet Transform (CWT) for SYNAPSE SPECTRA.
Provides multiresolution time-frequency scalograms with cone-of-influence diagnostics.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional
import numpy as np
import pywt

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class CWTResult:
    times: np.ndarray                 # Time vector [s]
    frequencies: np.ndarray           # Pseudo-frequencies corresponding to scales [Hz]
    scales: np.ndarray                # Wavelet scales
    coefficients: np.ndarray          # 2D complex or real CWT array (n_scales, n_times)
    scalogram_power: np.ndarray       # 2D power array |coef|^2
    wavelet_name: str
    sampling_rate: float


def compute_cwt(
    signal_array: np.ndarray,
    sampling_rate: float,
    wavelet_name: str = "cmor1.5-1.0",
    n_scales: int = 64,
    f_min: Optional[float] = None,
    f_max: Optional[float] = None,
) -> CWTResult:
    """
    Compute Continuous Wavelet Transform using Morlet or chosen analytical wavelet.
    """
    x = np.asarray(signal_array, dtype=np.float64)
    if x.ndim != 1:
        raise ValidationError(f"compute_cwt expects 1D array, got shape {x.shape}.")
    
    n_total = len(x)
    if n_total < 4:
        raise ValidationError("Signal must have at least 4 samples for CWT.")
    if sampling_rate <= 0:
        raise ValidationError(f"Sampling rate must be positive, got {sampling_rate}.")

    nyquist = sampling_rate / 2.0
    f_high = f_max if f_max is not None and f_max < nyquist else nyquist * 0.95
    f_low = f_min if f_min is not None and f_min > 0 else (sampling_rate / n_total)

    if f_low >= f_high:
        raise ValidationError(f"f_min ({f_low}) must be strictly less than f_max ({f_high}).")

    # Logarithmically spaced frequencies
    freqs = np.geomspace(f_high, f_low, num=n_scales)
    scales = pywt.frequency2scale(wavelet_name, freqs / sampling_rate)

    coefs, _ = pywt.cwt(x, scales, wavelet_name, sampling_period=1.0 / sampling_rate)
    power = np.abs(coefs) ** 2

    dt = 1.0 / sampling_rate
    times = np.arange(n_total) * dt

    coefs.flags.writeable = False
    power.flags.writeable = False
    scales.flags.writeable = False
    freqs.flags.writeable = False
    times.flags.writeable = False

    return CWTResult(
        times=times,
        frequencies=freqs,
        scales=scales,
        coefficients=coefs,
        scalogram_power=power,
        wavelet_name=wavelet_name,
        sampling_rate=sampling_rate,
    )

