"""
Spectral Ridge Extraction and Chirp Rate Estimation for SYNAPSE SPECTRA.
Tracks dominant time-frequency ridges across STFT/CWT planes and estimates chirp drift rates.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.stats as stats

from synapse_core.exceptions import ValidationError
from synapse_spectra.stft import compute_stft


@dataclass(frozen=True)
class RidgeExtractionResult:
    times: np.ndarray
    ridge_frequencies_hz: np.ndarray
    ridge_amplitudes: np.ndarray
    initial_frequency_hz: float         # f0
    chirp_rate_hz_per_sec: float        # gamma = df/dt
    chirp_rate_std_err: float
    r_squared: float
    is_chirp_statistically_significant: bool # slope != 0 with p < 0.05


def extract_spectral_ridge(
    signal_array: np.ndarray,
    sampling_rate: float,
    window_length: Optional[int] = None,
    alpha: float = 0.05,
) -> RidgeExtractionResult:
    """
    Extract instantaneous ridge frequency across time and fit chirp rate gamma = df/dt.
    """
    x = np.asarray(signal_array, dtype=np.float64)
    n = len(x)
    if n < 32:
        raise ValidationError("Need at least 32 samples for spectral ridge extraction.")

    stft_res = compute_stft(x, sampling_rate=sampling_rate, n_perseg=window_length)
    mag_spec = stft_res.magnitude_spectrogram # shape (n_freqs, n_times)
    freqs = stft_res.frequencies
    times = stft_res.times

    # For each time column, find the frequency bin of maximum energy
    # Exclude DC bin (index 0)
    ridge_freqs = []
    ridge_amps = []

    for t_idx in range(len(times)):
        col = mag_spec[1:, t_idx]
        max_sub_bin = int(np.argmax(col))
        max_bin = max_sub_bin + 1
        ridge_freqs.append(float(freqs[max_bin]))
        ridge_amps.append(float(col[max_sub_bin]))

    ridge_f_arr = np.array(ridge_freqs, dtype=np.float64)
    ridge_a_arr = np.array(ridge_amps, dtype=np.float64)

    # Linear regression: f(t) = f0 + gamma * t
    res = stats.linregress(times, ridge_f_arr)
    gamma = float(res.slope)
    f0 = float(res.intercept)
    r2 = float(res.rvalue ** 2)
    p_val = float(res.pvalue)
    stderr = float(res.stderr) if res.stderr is not None else 0.01

    is_sig = bool(p_val < alpha and abs(gamma) > 0.01)

    return RidgeExtractionResult(
        times=times,
        ridge_frequencies_hz=ridge_f_arr,
        ridge_amplitudes=ridge_a_arr,
        initial_frequency_hz=f0,
        chirp_rate_hz_per_sec=gamma,
        chirp_rate_std_err=stderr,
        r_squared=r2,
        is_chirp_statistically_significant=is_sig,
    )

