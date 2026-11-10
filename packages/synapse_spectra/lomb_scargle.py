"""
Lomb-Scargle Periodogram for SYNAPSE SPECTRA.
Provides spectral analysis for unevenly, irregularly sampled, or gapped time series,
with False Alarm Probability (FAP) calculation.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.signal as signal

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class LombScargleResult:
    frequencies: np.ndarray             # Candidate frequencies [Hz]
    power: np.ndarray                   # Normalized Lomb-Scargle power
    peak_frequency: float               # Frequency of maximum power [Hz]
    peak_power: float                   # Maximum power value
    false_alarm_probability: float      # Baluev / standard FAP of the peak
    is_statistically_significant: bool  # FAP < alpha
    alpha_threshold: float              # Alpha significance level


def compute_lomb_scargle(
    timestamps: np.ndarray,
    values: np.ndarray,
    min_freq: Optional[float] = None,
    max_freq: Optional[float] = None,
    n_freqs: int = 1000,
    alpha: float = 0.01,
) -> LombScargleResult:
    """
    Compute Lomb-Scargle periodogram and False Alarm Probability.
    """
    t = np.asarray(timestamps, dtype=np.float64)
    y = np.asarray(values, dtype=np.float64)
    n = len(y)

    if n < 4:
        raise ValidationError("Need at least 4 points for Lomb-Scargle periodogram.")

    # Sort timestamps if not sorted
    sort_order = np.argsort(t)
    t = t[sort_order]
    y = y[sort_order]

    dt = np.diff(t)
    median_dt = float(np.median(dt))
    if median_dt <= 0:
        raise ValidationError("Timestamps must be strictly monotonically increasing.")

    # Nyquist estimate based on median sampling spacing
    nyquist = 0.5 / median_dt
    t_span = t[-1] - t[0]
    min_f = float(min_freq) if min_freq is not None else 1.0 / t_span
    max_f = float(max_freq) if max_freq is not None else nyquist

    if min_f >= max_f:
        min_f = max_f / 10.0

    freqs = np.linspace(min_f, max_f, n_freqs)
    angular_freqs = 2.0 * np.pi * freqs

    # Zero-center values
    y_centered = y - np.mean(y)
    variance = np.var(y)
    if variance == 0:
        variance = 1e-12

    # Scipy lombscargle calculates unnormalized periodogram
    pgram = signal.lombscargle(t, y_centered, angular_freqs, precenter=True)
    # Standard normalized power: z in [0, 1]
    norm_power = pgram / (n * variance / 2.0)
    norm_power = np.clip(norm_power, 0.0, 1.0)

    peak_idx = int(np.argmax(norm_power))
    peak_f = float(freqs[peak_idx])
    peak_p = float(norm_power[peak_idx])

    # False Alarm Probability: FAP(z) = 1 - (1 - exp(-z))^N_eff
    # Peak power z = peak_p * (N - 1) / 2
    z = peak_p * (n - 1.0) / 2.0
    n_eff = float(n_freqs)
    # Using numerical log1p for stability
    if z > 15:
        fap = n_eff * np.exp(-z)
    else:
        fap = 1.0 - (1.0 - np.exp(-z)) ** n_eff
    fap = float(min(1.0, max(0.0, fap)))

    return LombScargleResult(
        frequencies=freqs,
        power=norm_power,
        peak_frequency=peak_f,
        peak_power=peak_p,
        false_alarm_probability=fap,
        is_statistically_significant=bool(fap < alpha),
        alpha_threshold=alpha,
    )

