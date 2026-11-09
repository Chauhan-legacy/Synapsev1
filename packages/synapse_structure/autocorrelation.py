"""
FFT-Accelerated Autocorrelation for SYNAPSE STRUCTURE.
Calculates biased and unbiased estimators in O(N log N) and extracts dominant periodicities.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, List, Optional
import numpy as np
import scipy.signal as signal
import scipy.fft as sfft


@dataclass(frozen=True)
class AutocorrelationResult:
    lags: np.ndarray                 # Lag indices [-max_lag .. max_lag]
    lag_times_sec: np.ndarray        # Lag times in seconds
    acf: np.ndarray                  # Normalized autocorrelation coefficients in [-1, 1]
    dominant_period_sec: Optional[float]
    dominant_frequency_hz: Optional[float]
    dominant_lag_samples: Optional[int]
    is_biased: bool


def compute_autocorrelation(
    values: np.ndarray,
    sampling_rate: float,
    max_lag_samples: Optional[int] = None,
    biased: bool = True,
    detrend: bool = True,
) -> AutocorrelationResult:
    """
    Compute normalized autocorrelation using FFT for O(N log N) performance.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    if n < 4:
        raise ValueError("Signal too short for autocorrelation.")

    x_proc = x - np.mean(x) if detrend else x.copy()
    var_x = float(np.var(x_proc))

    # Next power of 2 for fast zero-padded FFT
    n_fft = 2 ** int(np.ceil(np.log2(2 * n - 1)))
    fx = sfft.fft(x_proc, n=n_fft)
    # Autocorrelation in frequency domain
    rxx_full = sfft.ifft(fx * np.conj(fx)).real

    # Extract non-negative lags [0 .. n-1]
    rxx = rxx_full[:n]

    if biased or var_x <= 1e-15:
        # Standard biased estimator: R[k] / (N * var)
        norm_factor = max(n * var_x, 1e-15)
        acf = rxx / norm_factor
    else:
        # Unbiased estimator: R[k] / ((N - k) * var)
        k_indices = np.arange(n)
        scale = np.maximum(n - k_indices, 1) * var_x
        acf = rxx / np.maximum(scale, 1e-15)

    max_l = max_lag_samples if max_lag_samples is not None and max_lag_samples < n else (n // 2)
    acf_trimmed = acf[:max_l]
    lags = np.arange(max_l)
    dt = 1.0 / sampling_rate
    lag_times = lags * dt

    # Detect dominant periodic lag (first significant peak after zero lag)
    # Ignore initial decay near lag 0
    min_lag = max(2, int(0.005 * sampling_rate))  # at least 2 samples or 5ms
    if min_lag < max_l - 2:
        search_region = acf_trimmed[min_lag:]
        peaks, props = signal.find_peaks(search_region, height=0.15, distance=min_lag)
        if len(peaks) > 0:
            best_sub_idx = peaks[np.argmax(props["peak_heights"])]
            best_lag = min_lag + int(best_sub_idx)
            dominant_period = float(best_lag * dt)
            dominant_freq = float(1.0 / dominant_period) if dominant_period > 0 else None
            dominant_lag_samples = int(best_lag)
        else:
            dominant_period = None
            dominant_freq = None
            dominant_lag_samples = None
    else:
        dominant_period = None
        dominant_freq = None
        dominant_lag_samples = None

    acf_trimmed.flags.writeable = False
    lags.flags.writeable = False
    lag_times.flags.writeable = False

    return AutocorrelationResult(
        lags=lags,
        lag_times_sec=lag_times,
        acf=acf_trimmed,
        dominant_period_sec=dominant_period,
        dominant_frequency_hz=dominant_freq,
        dominant_lag_samples=dominant_lag_samples,
        is_biased=biased,
    )

