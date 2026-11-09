"""
Magnitude-Squared Coherence for SYNAPSE RELATION.
Measures linear dependency between two signals in the frequency domain.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional
import numpy as np
import scipy.signal as signal


@dataclass(frozen=True)
class CoherenceResult:
    frequencies: np.ndarray        # Frequencies [Hz]
    coherence: np.ndarray          # Coherence values in [0, 1]
    peak_frequency_hz: float       # Frequency of maximum coherence
    peak_coherence: float          # Peak coherence value
    mean_coherence: float          # Average coherence across spectrum


def compute_spectral_coherence(
    channel_x: np.ndarray,
    channel_y: np.ndarray,
    sampling_rate: float,
    n_perseg: Optional[int] = None,
) -> CoherenceResult:
    """
    Compute Magnitude-Squared Coherence C_xy(f) = |P_xy(f)|^2 / (P_xx(f) * P_yy(f)).
    """
    x = np.asarray(channel_x, dtype=np.float64)
    y = np.asarray(channel_y, dtype=np.float64)
    n = len(x)
    if len(y) != n:
        raise ValueError("Channels must have identical length.")

    seg_len = n_perseg if n_perseg is not None else min(256, max(32, n // 4))

    freqs, c_xy = signal.coherence(x, y, fs=sampling_rate, nperseg=seg_len)

    peak_idx = int(np.argmax(c_xy))
    peak_f = float(freqs[peak_idx])
    peak_c = float(c_xy[peak_idx])
    mean_c = float(np.mean(c_xy))

    freqs.flags.writeable = False
    c_xy.flags.writeable = False

    return CoherenceResult(
        frequencies=freqs,
        coherence=c_xy,
        peak_frequency_hz=peak_f,
        peak_coherence=peak_c,
        mean_coherence=mean_c,
    )

