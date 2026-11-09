"""
Welch's Power Spectral Density Estimation for SYNAPSE SPECTRA.
Provides segment averaging, variance reduction, and documents the resolution-variance tradeoff.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.signal as signal

from synapse_core.exceptions import ValidationError
from synapse_spectra.windows import get_window


@dataclass(frozen=True)
class WelchResult:
    frequencies: np.ndarray             # Frequencies [Hz]
    psd: np.ndarray                     # Power Spectral Density [units^2 / Hz]
    frequency_resolution_hz: float      # Delta f = fs / n_perseg
    segment_length: int                 # Samples per segment
    overlap_samples: int                # Samples overlapping
    n_segments: int                     # Total segments averaged
    variance_reduction_factor: float    # Estimated variance reduction factor
    total_power: float                  # Integral of PSD over frequency
    warnings: Tuple[str, ...]
    tradeoff_explanation: str


def compute_welch_psd(
    signal_array: np.ndarray,
    sampling_rate: float,
    window_type: str = "hann",
    n_perseg: Optional[int] = None,
    n_overlap: Optional[int] = None,
    detrend: str = "constant",
) -> WelchResult:
    """
    Compute Power Spectral Density using Welch's method of averaged modified periodograms.
    
    Mathematical Tradeoff:
    Welch's method divides a signal of length N into K overlapping segments of length L.
    - Frequency resolution degrades from fs/N to fs/L.
    - Variance of the spectral estimate is reduced by ~ (11/9) / K (for 50% overlapped Hann).
    """
    x = np.asarray(signal_array, dtype=np.float64)
    if x.ndim != 1:
        raise ValidationError(f"compute_welch_psd expects a 1D array, got shape {x.shape}.")
    
    n_total = len(x)
    if n_total < 4:
        raise ValidationError("Signal must contain at least 4 samples for Welch PSD.")
    if sampling_rate <= 0:
        raise ValidationError(f"Sampling rate must be positive, got {sampling_rate}.")

    # Default segment length: power-of-two nearest to N/8 or at least 256
    if n_perseg is None:
        if n_total <= 256:
            seg_len = n_total
        else:
            seg_len = min(1024, 2 ** int(np.floor(np.log2(n_total / 4))))
            seg_len = max(seg_len, 64)
    else:
        seg_len = int(n_perseg)
        if seg_len > n_total:
            raise ValidationError(
                f"n_perseg ({seg_len}) cannot exceed total signal length ({n_total})."
            )
        if seg_len < 4:
            raise ValidationError("n_perseg must be at least 4.")

    if n_overlap is None:
        overlap = seg_len // 2  # 50% overlap standard
    else:
        overlap = int(n_overlap)
        if overlap >= seg_len:
            raise ValidationError(
                f"n_overlap ({overlap}) must be strictly less than n_perseg ({seg_len})."
            )

    hop = seg_len - overlap
    n_segments = max(1, int(np.floor((n_total - overlap) / hop)))

    # Compute Welch PSD using scipy.signal.welch
    freqs, psd = signal.welch(
        x,
        fs=sampling_rate,
        window=window_type,
        nperseg=seg_len,
        noverlap=overlap,
        detrend=detrend,
        scaling="density",
    )

    freq_res = sampling_rate / seg_len

    # Approximate variance reduction factor for 50% overlap
    if n_segments > 1:
        var_reduction = (11.0 / 9.0) / n_segments
    else:
        var_reduction = 1.0

    # Integrate PSD across frequency using trapezoidal rule to verify total power
    total_power = float(np.trapezoid(psd, freqs))

    warnings_list: List[str] = []
    tradeoff = (
        f"Welch Tradeoff: Averaged {n_segments} segments (length L={seg_len}, overlap={overlap}). "
        f"Variance reduced by ~{1.0 / var_reduction:.1f}x compared to raw periodogram; "
        f"effective frequency resolution is fs/L = {freq_res:.4f} Hz (coarser than fs/N = {sampling_rate / n_total:.4f} Hz)."
    )

    freqs.flags.writeable = False
    psd.flags.writeable = False

    return WelchResult(
        frequencies=freqs,
        psd=psd,
        frequency_resolution_hz=freq_res,
        segment_length=seg_len,
        overlap_samples=overlap,
        n_segments=n_segments,
        variance_reduction_factor=var_reduction,
        total_power=total_power,
        warnings=tuple(warnings_list),
        tradeoff_explanation=tradeoff,
    )

