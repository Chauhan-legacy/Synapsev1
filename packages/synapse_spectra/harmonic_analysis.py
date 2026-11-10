"""
Harmonic Series Analysis, THD, and SINAD for SYNAPSE SPECTRA.
Detects fundamental frequencies using Harmonic Product Spectrum (HPS) and Cepstrum,
and computes Total Harmonic Distortion (THD) and SINAD.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.fft as sfft

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class HarmonicAnalysisResult:
    fundamental_frequency_hz: float
    harmonic_frequencies: Tuple[float, ...]
    harmonic_amplitudes: Tuple[float, ...]
    total_harmonic_distortion_pct: float # THD %
    thd_db: float                       # THD in dB
    sinad_db: float                     # SINAD in dB
    snr_db: float                       # SNR of fundamental in dB


def analyze_harmonic_series(
    signal_array: np.ndarray,
    sampling_rate: float,
    max_harmonics: int = 5,
) -> HarmonicAnalysisResult:
    """
    Detect fundamental frequency via Harmonic Product Spectrum (HPS) and compute THD/SINAD.
    """
    x = np.asarray(signal_array, dtype=np.float64)
    n = len(x)
    if n < 32:
        raise ValidationError("Need at least 32 samples for harmonic analysis.")
    if sampling_rate <= 0:
        raise ValidationError(f"Invalid sampling rate {sampling_rate}.")

    # Windowed FFT
    win = np.hanning(n)
    x_win = (x - np.mean(x)) * win
    fft_mag = np.abs(sfft.rfft(x_win))
    freqs = sfft.rfftfreq(n, d=1.0 / sampling_rate)

    # 1. Harmonic Product Spectrum (HPS) downsampling
    # HPS(f) = prod_{r=1}^R |X(r*f)|
    hps = fft_mag.copy()
    n_hps = len(hps)
    for r in range(2, max_harmonics + 1):
        decimated = fft_mag[::r]
        hps[:len(decimated)] *= decimated

    # Exclude DC and very low frequencies (< 2 bins)
    min_bin = max(2, int(n * 0.005))
    peak_bin = int(np.argmax(hps[min_bin:])) + min_bin
    f0 = float(freqs[peak_bin])
    v1 = float(fft_mag[peak_bin])

    # 2. Extract harmonics: 2*f0, 3*f0, ..., max_harmonics*f0
    harmonic_freqs = [f0]
    harmonic_amps = [v1]
    harmonic_powers = [v1 ** 2]

    df = freqs[1] - freqs[0] if len(freqs) > 1 else 1.0
    search_window_bins = max(2, int(0.05 * f0 / df))

    for h in range(2, max_harmonics + 1):
        target_f = h * f0
        if target_f >= sampling_rate / 2.0:
            break
        center_bin = int(round(target_f / df))
        low_b = max(0, center_bin - search_window_bins)
        high_b = min(len(fft_mag) - 1, center_bin + search_window_bins)

        h_bin = int(np.argmax(fft_mag[low_b : high_b + 1])) + low_b
        vh = float(fft_mag[h_bin])
        harmonic_freqs.append(float(freqs[h_bin]))
        harmonic_amps.append(vh)
        harmonic_powers.append(vh ** 2)

    # 3. THD = sqrt(sum_{k=2}^H V_k^2) / V_1
    higher_harmonic_power = float(np.sum(harmonic_powers[1:]))
    fundamental_power = max(1e-12, harmonic_powers[0])

    thd_ratio = np.sqrt(higher_harmonic_power) / np.sqrt(fundamental_power)
    thd_pct = float(thd_ratio * 100.0)
    thd_db = float(20.0 * np.log10(max(1e-6, thd_ratio)))

    # 4. Total power and Noise power
    total_power = float(np.sum(fft_mag ** 2))
    noise_and_dist = max(1e-12, total_power - fundamental_power)

    # SINAD = 10 * log10(total_power / noise_and_dist)
    sinad_db = float(10.0 * np.log10(max(1e-6, total_power / noise_and_dist)))

    # SNR = 10 * log10(fundamental_power / noise_floor)
    pure_noise = max(1e-12, total_power - float(np.sum(harmonic_powers)))
    snr_db = float(10.0 * np.log10(max(1e-6, fundamental_power / pure_noise)))

    return HarmonicAnalysisResult(
        fundamental_frequency_hz=f0,
        harmonic_frequencies=tuple(harmonic_freqs),
        harmonic_amplitudes=tuple(harmonic_amps),
        total_harmonic_distortion_pct=thd_pct,
        thd_db=thd_db,
        sinad_db=sinad_db,
        snr_db=snr_db,
    )
