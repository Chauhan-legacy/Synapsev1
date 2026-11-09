"""
FFT and IFFT Mathematical Core for SYNAPSE SPECTRA.
Implements single-sided, double-sided, amplitude, power, phase, PSD,
and Parseval energy verification.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.fft as sfft

from synapse_core.exceptions import ValidationError, MathematicalDomainError
from synapse_spectra.windows import get_window, WindowProperties


@dataclass(frozen=True)
class FFTResult:
    frequencies: np.ndarray          # 1D array of frequency bins [Hz]
    amplitudes: np.ndarray           # Single-sided peak amplitude [signal units]
    power: np.ndarray                # Single-sided power [signal units^2]
    phases: np.ndarray               # Phase spectrum [-pi, pi] radians
    psd: np.ndarray                  # Power spectral density [signal units^2 / Hz]
    complex_spectrum: np.ndarray     # Raw complex FFT coefficients
    frequency_resolution_hz: float   # Delta f = fs / N
    physical_resolution_hz: float    # True physical resolution fs / N_original
    parseval_relative_error: float   # Energy discrepancy between time and frequency
    window_properties: WindowProperties
    warnings: Tuple[str, ...]


def compute_fft(
    signal_array: np.ndarray,
    sampling_rate: float,
    window_type: str = "hann",
    n_fft: Optional[int] = None,
    detrend: bool = True,
) -> FFTResult:
    """
    Compute rigorous single-sided Discrete Fourier Transform.
    
    Parameters:
    - signal_array: 1D numpy array of values.
    - sampling_rate: Sampling frequency fs [Hz].
    - window_type: Window name ('hann', 'hamming', 'blackman', 'flattop', 'boxcar').
    - n_fft: FFT length. If n_fft > len(signal_array), zero-padding is performed.
    - detrend: If True, removes the mean (DC offset) before windowing.
    """
    x = np.asarray(signal_array, dtype=np.float64)
    if x.ndim != 1:
        raise ValidationError(f"compute_fft expects a 1D array, got shape {x.shape}.")
    
    n_orig = len(x)
    if n_orig < 2:
        raise ValidationError("Signal must contain at least 2 samples.")
    if sampling_rate <= 0:
        raise ValidationError(f"Sampling rate must be positive, got {sampling_rate}.")

    warnings_list: List[str] = []

    # Detrend (remove mean) if requested
    if detrend:
        x_proc = x - np.mean(x)
    else:
        x_proc = x.copy()

    # Apply window to original length
    win_props = get_window(window_type, n_orig)
    w = win_props.weights
    x_windowed = x_proc * w

    # Verify Parseval's theorem on unwindowed raw FFT to guarantee mathematical transform integrity
    x_unwindowed_fft = sfft.fft(x_proc)
    time_energy = float(np.sum(x_proc**2))
    freq_energy = float(np.sum(np.abs(x_unwindowed_fft)**2) / n_orig)
    
    norm_factor = max(time_energy, 1e-15)
    parseval_err = abs(time_energy - freq_energy) / norm_factor
    if parseval_err > 1e-10:
        raise MathematicalDomainError(
            f"Parseval's energy conservation violation: relative error {parseval_err:.2e} > 1e-10."
        )

    # FFT length determination
    if n_fft is None or n_fft == n_orig:
        n_calc = n_orig
        is_padded = False
    elif n_fft > n_orig:
        n_calc = n_fft
        is_padded = True
        warnings_list.append(
            f"Zero-padding applied (original length {n_orig} padded to {n_calc}). "
            "Zero-padding interpolates the frequency bins of the spectrum but DOES NOT increase "
            f"physical Rayleigh resolution (remains fs/N = {sampling_rate / n_orig:.4f} Hz)."
        )
    else:
        raise ValidationError(f"n_fft ({n_fft}) cannot be smaller than signal length ({n_orig}).")

    # Real FFT
    X_complex = sfft.rfft(x_windowed, n=n_calc)
    freqs = sfft.rfftfreq(n_calc, d=1.0 / sampling_rate)
    n_freqs = len(freqs)

    # Single-sided amplitude normalization with Coherent Gain (CG) correction
    # CG = sum(w) / N_orig
    cg = win_props.coherent_gain
    raw_mag = np.abs(X_complex)

    # Normalize amplitude: factor of 2 for AC components, 1 for DC and Nyquist (if even)
    amplitudes = (2.0 * raw_mag) / (n_orig * cg)
    amplitudes[0] = raw_mag[0] / (n_orig * cg)  # DC
    if n_calc % 2 == 0:
        amplitudes[-1] = raw_mag[-1] / (n_orig * cg)  # Nyquist

    # Power spectrum: P = (amplitude / sqrt(2))^2 for AC sinusoidal signals, or (amplitude)^2 for DC
    power = (amplitudes / np.sqrt(2.0))**2
    power[0] = amplitudes[0]**2
    if n_calc % 2 == 0:
        power[-1] = amplitudes[-1]**2

    # Power Spectral Density (PSD) [units^2 / Hz]
    # S2 = sum(w^2)
    s2 = win_props.noise_power_gain
    psd = (2.0 * (raw_mag**2)) / (sampling_rate * s2)
    psd[0] = (raw_mag[0]**2) / (sampling_rate * s2)
    if n_calc % 2 == 0:
        psd[-1] = (raw_mag[-1]**2) / (sampling_rate * s2)

    # Phase spectrum
    phases = np.angle(X_complex)

    phys_res = sampling_rate / n_orig
    bin_res = sampling_rate / n_calc

    # Enforce array immutability
    for arr in (freqs, amplitudes, power, phases, psd, X_complex):
        arr.flags.writeable = False

    return FFTResult(
        frequencies=freqs,
        amplitudes=amplitudes,
        power=power,
        phases=phases,
        psd=psd,
        complex_spectrum=X_complex,
        frequency_resolution_hz=bin_res,
        physical_resolution_hz=phys_res,
        parseval_relative_error=parseval_err,
        window_properties=win_props,
        warnings=tuple(warnings_list),
    )


def compute_ifft(complex_spectrum: np.ndarray, n_samples: Optional[int] = None) -> np.ndarray:
    """
    Inverse Real FFT to reconstruct time-domain signal.
    """
    reconstructed = sfft.irfft(complex_spectrum, n=n_samples)
    reconstructed.flags.writeable = False
    return reconstructed

