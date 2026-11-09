"""
Spectral Peak and Harmonic Series Detection for SYNAPSE SPECTRA.
Detects significant peaks, estimates local SNR, and identifies harmonic ladders (f0, 2f0, 3f0...).
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List, Tuple, Optional, Dict, Any
import numpy as np
import scipy.signal as signal

from synapse_core.models.result import Finding, FindingStatus, FindingType


@dataclass(frozen=True)
class DetectedPeak:
    frequency_hz: float
    amplitude: float
    power: float
    snr_db: float
    prominence: float
    bin_index: int


@dataclass(frozen=True)
class HarmonicSeries:
    fundamental_hz: float
    harmonics_found: Tuple[float, ...]
    harmonic_orders: Tuple[int, ...]
    total_harmonic_distortion: float  # THD approximation


def detect_spectral_peaks(
    frequencies: np.ndarray,
    amplitudes: np.ndarray,
    min_snr_db: float = 6.0,
    min_prominence: Optional[float] = None,
    max_peaks: int = 20,
) -> List[DetectedPeak]:
    """
    Detect dominant spectral peaks and calculate local Signal-to-Noise Ratio.
    """
    if len(frequencies) != len(amplitudes):
        raise ValueError("Frequencies and amplitudes must have identical length.")

    # Estimate background noise floor using moving median filter
    noise_window = max(7, len(amplitudes) // 30)
    if noise_window % 2 == 0:
        noise_window += 1
    
    noise_floor = signal.medfilt(amplitudes, kernel_size=noise_window)
    noise_floor = np.maximum(noise_floor, 1e-12)

    snr_db_array = 20.0 * np.log10(np.maximum(amplitudes, 1e-12) / noise_floor)

    # Peak detection via prominence
    prom_threshold = min_prominence if min_prominence is not None else (np.max(amplitudes) * 0.02)
    peak_indices, properties = signal.find_peaks(
        amplitudes,
        prominence=prom_threshold,
        distance=max(1, len(amplitudes) // 200),
    )

    detected: List[DetectedPeak] = []
    for idx in peak_indices:
        snr = float(snr_db_array[idx])
        if snr >= min_snr_db:
            prom = float(properties["prominences"][np.where(peak_indices == idx)[0][0]])
            detected.append(
                DetectedPeak(
                    frequency_hz=float(frequencies[idx]),
                    amplitude=float(amplitudes[idx]),
                    power=float(amplitudes[idx] ** 2 / 2.0),
                    snr_db=snr,
                    prominence=prom,
                    bin_index=int(idx),
                )
            )

    # Sort descending by SNR and limit count
    detected.sort(key=lambda p: p.snr_db, reverse=True)
    return detected[:max_peaks]


def detect_harmonic_series(
    peaks: List[DetectedPeak],
    tolerance_ratio: float = 0.03,
    max_harmonic_order: int = 10,
) -> List[HarmonicSeries]:
    """
    Search among detected peaks for harmonic relationships (f0, 2f0, 3f0...).
    """
    if len(peaks) < 2:
        return []

    # Sort peaks by frequency
    sorted_peaks = sorted(peaks, key=lambda p: p.frequency_hz)
    harmonic_series_list: List[HarmonicSeries] = []

    for i, base_peak in enumerate(sorted_peaks):
        f0 = base_peak.frequency_hz
        if f0 <= 0:
            continue

        matched_harmonics: List[float] = [f0]
        matched_orders: List[int] = [1]
        harmonic_powers: List[float] = []

        for order in range(2, max_harmonic_order + 1):
            expected_f = f0 * order
            # Look for peak near expected_f within tolerance
            best_match = None
            best_diff = float("inf")

            for candidate in sorted_peaks:
                diff = abs(candidate.frequency_hz - expected_f)
                if diff <= (expected_f * tolerance_ratio) and diff < best_diff:
                    best_match = candidate
                    best_diff = diff

            if best_match:
                matched_harmonics.append(best_match.frequency_hz)
                matched_orders.append(order)
                harmonic_powers.append(best_match.power)

        # Require at least one confirmed higher harmonic
        if len(matched_harmonics) >= 2:
            base_power = base_peak.power
            if base_power > 0 and harmonic_powers:
                thd = float(np.sqrt(sum(harmonic_powers)) / np.sqrt(base_power))
            else:
                thd = 0.0

            harmonic_series_list.append(
                HarmonicSeries(
                    fundamental_hz=f0,
                    harmonics_found=tuple(matched_harmonics),
                    harmonic_orders=tuple(matched_orders),
                    total_harmonic_distortion=thd,
                )
            )

    return harmonic_series_list
