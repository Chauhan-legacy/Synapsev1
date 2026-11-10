"""
Magnitude-Squared Coherence and Phase-Lag Spectrum for SYNAPSE RELATION.
Computes frequency-domain linear dependency, cross-spectral density phase lag,
and theoretical statistical significance threshold gamma^2_crit = 1 - alpha^(1 / (K - 1)).
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.signal as signal

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class CoherenceResult:
    frequencies: np.ndarray             # Frequencies [Hz]
    coherence: np.ndarray               # Coherence values in [0, 1]
    phase_lag_radians: np.ndarray       # Phase-lag spectrum theta_xy(f)
    significance_threshold_95: float    # gamma^2_crit = 1 - 0.05^(1 / (K - 1))
    significant_frequencies: Tuple[float, ...] # Frequencies where C_xy(f) > threshold
    peak_frequency_hz: float            # Frequency of maximum coherence
    peak_coherence: float               # Peak coherence value
    mean_coherence: float               # Average coherence across spectrum
    n_segments: int                     # Number of averaged Welch segments K


def compute_spectral_coherence(
    channel_x: np.ndarray,
    channel_y: np.ndarray,
    sampling_rate: float,
    n_perseg: Optional[int] = None,
    alpha: float = 0.05,
) -> CoherenceResult:
    """
    Compute Magnitude-Squared Coherence, Cross-Spectral Phase Lag, and Analytic Significance Threshold.
    """
    x = np.asarray(channel_x, dtype=np.float64)
    y = np.asarray(channel_y, dtype=np.float64)
    n = len(x)
    if len(y) != n:
        raise ValidationError("Channels must have identical length for coherence.")
    if n < 16:
        raise ValidationError("Need at least 16 samples for spectral coherence.")
    if sampling_rate <= 0:
        raise ValidationError(f"Invalid sampling rate {sampling_rate}.")

    seg_len = int(n_perseg) if n_perseg is not None else min(256, max(32, n // 4))
    seg_len = min(seg_len, n)
    overlap = seg_len // 2

    # 1. Magnitude-squared coherence C_xy(f)
    freqs, c_xy = signal.coherence(x, y, fs=sampling_rate, nperseg=seg_len, noverlap=overlap)

    # 2. Cross-spectral density for phase spectrum theta_xy(f)
    _, p_xy = signal.csd(x, y, fs=sampling_rate, nperseg=seg_len, noverlap=overlap)
    phase_lag = np.angle(p_xy)

    # 3. Analytic significance threshold (Carter 1987):
    # Under H0 (uncorrelated Gaussian processes), gamma^2_crit = 1 - alpha^(1 / (K - 1))
    hop = seg_len - overlap
    k_segments = max(2, int(np.floor((n - overlap) / hop)))
    gamma2_crit = float(1.0 - (alpha ** (1.0 / (k_segments - 1.0))))

    sig_indices = np.where(c_xy > gamma2_crit)[0]
    sig_freqs = tuple(float(freqs[idx]) for idx in sig_indices if freqs[idx] > 0)

    peak_idx = int(np.argmax(c_xy[1:])) + 1 if len(c_xy) > 1 else 0
    peak_f = float(freqs[peak_idx])
    peak_c = float(c_xy[peak_idx])
    mean_c = float(np.mean(c_xy))

    return CoherenceResult(
        frequencies=freqs,
        coherence=c_xy,
        phase_lag_radians=phase_lag,
        significance_threshold_95=gamma2_crit,
        significant_frequencies=sig_freqs,
        peak_frequency_hz=peak_f,
        peak_coherence=peak_c,
        mean_coherence=mean_c,
        n_segments=k_segments,
    )
