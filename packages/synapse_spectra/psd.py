"""
Welch's Power Spectral Density Estimation for SYNAPSE SPECTRA.
Provides segment averaging, variance reduction, and chi-squared confidence bands.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.signal as signal
import scipy.stats as stats

from synapse_core.exceptions import ValidationError
from synapse_spectra.windows import get_window


@dataclass(frozen=True)
class WelchResult:
    frequencies: np.ndarray             # Frequencies [Hz]
    psd: np.ndarray                     # Power Spectral Density [units^2 / Hz]
    ci_lower: np.ndarray                # Chi-squared 95% CI lower bound
    ci_upper: np.ndarray                # Chi-squared 95% CI upper bound
    degrees_of_freedom: float           # Equivalent degrees of freedom (nu)
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
    confidence_level: float = 0.95,
) -> WelchResult:
    """
    Compute Power Spectral Density using Welch's method with chi-squared confidence bands.
    """
    x = np.asarray(signal_array, dtype=np.float64)
    if x.ndim != 1:
        raise ValidationError(f"compute_welch_psd expects a 1D array, got shape {x.shape}.")
    
    n_total = len(x)
    if n_total < 4:
        raise ValidationError("Signal must contain at least 4 samples for Welch PSD.")
    if sampling_rate <= 0:
        raise ValidationError(f"Sampling rate must be positive, got {sampling_rate}.")

    # Default segment length: power-of-two nearest to N/4 or at least 64
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

    # Equivalent degrees of freedom (nu) for Welch estimate accounting for window overlap
    # For Hann with 50% overlap, Welch correlation rho ~ 0.166 => nu ~ 1.9 * K
    if n_segments > 1:
        nu = float(max(2.0, 1.9 * n_segments))
        var_reduction = (11.0 / 9.0) / n_segments
    else:
        nu = 2.0
        var_reduction = 1.0

    # Chi-squared confidence bounds: nu * PSD / chi2(1 - alpha/2) <= P <= nu * PSD / chi2(alpha/2)
    alpha = 1.0 - confidence_level
    chi2_lower = float(stats.chi2.ppf(1.0 - alpha / 2.0, df=nu))
    chi2_upper = float(stats.chi2.ppf(alpha / 2.0, df=nu))

    if chi2_lower > 0:
        ci_lower = (nu * psd) / chi2_lower
    else:
        ci_lower = psd * 0.5

    if chi2_upper > 0:
        ci_upper = (nu * psd) / chi2_upper
    else:
        ci_upper = psd * 2.0

    df_spacing = freqs[1] - freqs[0] if len(freqs) > 1 else 1.0
    total_power = float(np.sum(psd) * df_spacing)

    warnings: List[str] = []
    if n_segments < 3:
        warnings.append(
            f"Only {n_segments} segment(s) averaged. Spectral variance remains high."
        )

    explanation = (
        f"Welch PSD averaged {n_segments} segments (length {seg_len}, overlap {overlap}). "
        f"Frequency resolution is {freq_res:.4f} Hz with equivalent degrees of freedom nu = {nu:.1f}."
    )

    return WelchResult(
        frequencies=freqs,
        psd=psd,
        ci_lower=ci_lower,
        ci_upper=ci_upper,
        degrees_of_freedom=nu,
        frequency_resolution_hz=freq_res,
        segment_length=seg_len,
        overlap_samples=overlap,
        n_segments=n_segments,
        variance_reduction_factor=var_reduction,
        total_power=total_power,
        warnings=tuple(warnings),
        tradeoff_explanation=explanation,
    )
