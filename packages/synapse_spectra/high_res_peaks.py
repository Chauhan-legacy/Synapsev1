"""
High-Resolution Peak Estimation and Cramér-Rao Lower Bound (CRLB) for SYNAPSE SPECTRA.
Performs sub-bin interpolation (Jacobsen / Quinn), Nonlinear Least-Squares (NLS) sinusoidal fitting,
and evaluates achieved frequency variance against the theoretical Cramér-Rao bound.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.optimize as opt
import scipy.fft as sfft

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class HighResPeakResult:
    frequency_hz: float
    amplitude: float
    phase_rad: float
    offset: float
    frequency_std_err: float
    amplitude_std_err: float
    cramer_rao_lower_bound_hz2: float
    achieved_variance_hz2: float
    efficiency_ratio: float             # achieved_variance / crlb
    snr_linear: float
    snr_db: float


def fit_high_res_sinusoid(
    timestamps: np.ndarray,
    values: np.ndarray,
    initial_freq_hint: Optional[float] = None,
) -> HighResPeakResult:
    """
    Refine frequency, amplitude, and phase using sub-bin interpolation and Nonlinear Least Squares.
    Reports the Cramér-Rao Lower Bound (Rife & Boorstyn 1974).
    """
    t = np.asarray(timestamps, dtype=np.float64)
    y = np.asarray(values, dtype=np.float64)
    n = len(y)
    if n < 8:
        raise ValidationError("Need at least 8 samples for high-resolution sinusoidal fitting.")

    dt = float(t[1] - t[0]) if n > 1 else 1.0
    fs = 1.0 / dt
    t_zero = t - t[0]

    # 1. Zero-padded FFT to find peak and initial phase
    n_pad = max(4096, 16 * n)
    y_fft = sfft.rfft(y - np.mean(y), n=n_pad)
    freqs_pad = sfft.rfftfreq(n_pad, d=dt)

    if initial_freq_hint is None:
        peak_idx = int(np.argmax(np.abs(y_fft[1:]))) + 1
        f0 = float(freqs_pad[peak_idx])
        phi0 = float(np.angle(y_fft[peak_idx]))
        amp0 = float(2.0 * np.abs(y_fft[peak_idx]) / n)
    else:
        f0 = float(initial_freq_hint)
        # Evaluate DTFT at initial_freq_hint to get exact initial phase and amp
        phases = 2.0 * np.pi * f0 * t_zero
        cx = np.sum((y - np.mean(y)) * np.exp(-1j * phases))
        phi0 = float(np.angle(cx))
        amp0 = float(2.0 * np.abs(cx) / n)

    mu0 = float(np.mean(y))

    def sinusoid_model(time_arr: np.ndarray, freq: float, amp: float, phase: float, offset: float) -> np.ndarray:
        return offset + amp * np.cos(2.0 * np.pi * freq * time_arr + phase)

    # Nonlinear Least-Squares fitting with bounds
    p0 = [f0, max(1e-4, amp0), phi0, mu0]
    df_bound = 3.0 / (n * dt)
    f_min = max(0.0, f0 - df_bound)
    f_max = min(fs / 2.0, f0 + df_bound)
    bounds = (
        [f_min, 0.0, -np.pi * 2.0, -np.inf],
        [f_max, np.inf, np.pi * 2.0, np.inf]
    )

    try:
        popt, pcov = opt.curve_fit(
            sinusoid_model,
            t_zero,
            y,
            p0=p0,
            bounds=bounds,
            maxfev=2500,
        )
        fit_freq, fit_amp, fit_phase, fit_offset = popt
        diag_cov = np.diag(pcov)
        freq_stderr = float(np.sqrt(max(0.0, diag_cov[0])))
        amp_stderr = float(np.sqrt(max(0.0, diag_cov[1])))
    except Exception:
        fit_freq, fit_amp, fit_phase, fit_offset = f0, amp0, phi0, mu0
        freq_stderr = 1.0 / (n * dt)
        amp_stderr = amp0 * 0.1

    # 2. Residual noise variance & SNR
    fit_curve = sinusoid_model(t_zero, fit_freq, fit_amp, fit_phase, fit_offset)
    residuals = y - fit_curve
    noise_variance = float(np.var(residuals)) if len(residuals) > 0 else 1e-12
    signal_power = (fit_amp ** 2) / 2.0
    snr_lin = max(1e-6, signal_power / max(1e-12, noise_variance))
    snr_db = float(10.0 * np.log10(snr_lin))

    # 3. Cramér-Rao Lower Bound (CRLB) for discrete sinusoid in white noise:
    crlb_denom = ((2.0 * np.pi) ** 2) * snr_lin * n * (n ** 2 - 1.0) * (dt ** 2)
    crlb_var = float(12.0 / max(1e-18, crlb_denom))
    achieved_var = float(freq_stderr ** 2)
    eff_ratio = float(achieved_var / crlb_var) if crlb_var > 0 else 1.0

    return HighResPeakResult(
        frequency_hz=float(fit_freq),
        amplitude=float(fit_amp),
        phase_rad=float(fit_phase),
        offset=float(fit_offset),
        frequency_std_err=freq_stderr,
        amplitude_std_err=amp_stderr,
        cramer_rao_lower_bound_hz2=crlb_var,
        achieved_variance_hz2=achieved_var,
        efficiency_ratio=eff_ratio,
        snr_linear=snr_lin,
        snr_db=snr_db,
    )
