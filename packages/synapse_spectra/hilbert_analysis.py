"""
Hilbert Transform and Analytic Signal Analysis for SYNAPSE SPECTRA.
Extracts instantaneous amplitude envelope, instantaneous phase, and instantaneous frequency
with boundary edge-effect masking.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.signal as signal

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class HilbertResult:
    timestamps: np.ndarray
    instantaneous_amplitude: np.ndarray # Envelope A(t)
    instantaneous_phase: np.ndarray     # Unwrapped phase phi(t)
    instantaneous_frequency_hz: np.ndarray # f(t) = (1/2pi) dphi/dt
    valid_mask: np.ndarray              # Boolean mask excluding edge distortion artifacts
    mean_instantaneous_freq: float
    max_envelope_peak: float


def compute_hilbert_analytic(
    values: np.ndarray,
    sampling_rate: float,
    edge_mask_pct: float = 0.05,
) -> HilbertResult:
    """
    Compute analytic signal z(t) and derive instantaneous envelope and frequency.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    if n < 16:
        raise ValidationError("Need at least 16 samples for Hilbert analytic signal.")
    if sampling_rate <= 0:
        raise ValidationError(f"Invalid sampling rate {sampling_rate}.")

    dt = 1.0 / sampling_rate
    t = np.arange(n) * dt

    # Demean signal
    x_centered = x - np.mean(x)

    # Analytic signal z(t) = x(t) + j * H[x(t)]
    z = signal.hilbert(x_centered)
    amplitude = np.abs(z)
    phase = np.unwrap(np.angle(z))

    # Instantaneous frequency: f(t) = (1 / 2pi) * d(phi) / dt
    # Central difference gradient
    dphi_dt = np.gradient(phase, dt)
    inst_freq = dphi_dt / (2.0 * np.pi)

    # Edge effect masking: first and last edge_mask_pct of samples
    n_mask = int(np.ceil(n * edge_mask_pct))
    valid = np.ones(n, dtype=bool)
    if n_mask > 0:
        valid[:n_mask] = False
        valid[-n_mask:] = False

    valid_inst_freq = inst_freq[valid]
    mean_f = float(np.median(valid_inst_freq)) if len(valid_inst_freq) > 0 else 0.0
    max_amp = float(np.max(amplitude))

    return HilbertResult(
        timestamps=t,
        instantaneous_amplitude=amplitude,
        instantaneous_phase=phase,
        instantaneous_frequency_hz=inst_freq,
        valid_mask=valid,
        mean_instantaneous_freq=mean_f,
        max_envelope_peak=max_amp,
    )

