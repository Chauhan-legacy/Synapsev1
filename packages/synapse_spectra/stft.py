"""
Short-Time Fourier Transform (STFT) for SYNAPSE SPECTRA.
Provides time-frequency representations with exact time and frequency binning guarantees.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional
import numpy as np
import scipy.signal as signal

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class STFTResult:
    times: np.ndarray                 # Time bin centers [s]
    frequencies: np.ndarray           # Frequency bins [Hz]
    complex_stft: np.ndarray          # 2D complex array of shape (n_freqs, n_times)
    spectrogram_power: np.ndarray     # 2D power array |Z|^2
    time_resolution_sec: float        # Hop size in seconds
    frequency_resolution_hz: float    # Frequency bin width fs / n_perseg
    window_name: str


def compute_stft(
    signal_array: np.ndarray,
    sampling_rate: float,
    window_type: str = "hann",
    n_perseg: Optional[int] = None,
    n_overlap: Optional[int] = None,
) -> STFTResult:
    """
    Compute Short-Time Fourier Transform.
    """
    x = np.asarray(signal_array, dtype=np.float64)
    if x.ndim != 1:
        raise ValidationError(f"compute_stft expects 1D array, got shape {x.shape}.")
    
    n_total = len(x)
    if n_total < 4:
        raise ValidationError("Signal must have at least 4 samples for STFT.")
    if sampling_rate <= 0:
        raise ValidationError(f"Sampling rate must be positive, got {sampling_rate}.")

    seg_len = n_perseg if n_perseg is not None else min(256, max(32, n_total // 8))
    if seg_len > n_total:
        seg_len = n_total
    
    overlap = n_overlap if n_overlap is not None else (seg_len // 2)
    if overlap >= seg_len:
        overlap = seg_len - 1

    freqs, times, Zxx = signal.stft(
        x,
        fs=sampling_rate,
        window=window_type,
        nperseg=seg_len,
        noverlap=overlap,
        boundary="zeros",
        padded=True,
    )

    power = np.abs(Zxx) ** 2
    hop = seg_len - overlap
    dt_hop = hop / sampling_rate
    df = sampling_rate / seg_len

    freqs.flags.writeable = False
    times.flags.writeable = False
    power.flags.writeable = False
    Zxx.flags.writeable = False

    return STFTResult(
        times=times,
        frequencies=freqs,
        complex_stft=Zxx,
        spectrogram_power=power,
        time_resolution_sec=dt_hop,
        frequency_resolution_hz=df,
        window_name=window_type,
    )

