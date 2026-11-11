"""
Multitaper Spectral Estimation and Thomson Harmonic F-Test for SYNAPSE SPECTRA.
Uses Discrete Prolate Spheroidal Sequences (DPSS / Slepian) to achieve optimal
energy concentration in the frequency domain and tests line components against broadband noise.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.signal.windows as windows
import scipy.stats as stats
import scipy.fft as sfft

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class MultitaperResult:
    frequencies: np.ndarray             # Frequencies [Hz]
    psd: np.ndarray                     # Multitaper PSD estimate [units^2 / Hz]
    f_statistics: np.ndarray            # Thomson harmonic F-statistic per frequency bin
    p_values: np.ndarray                # p-value for line component vs broadband background
    line_frequencies_detected: Tuple[float, ...] # Frequencies passing FDR-controlled harmonic test
    time_bandwidth_product: float       # NW parameter
    n_tapers: int                       # Number of tapers K
    degrees_of_freedom: int             # 2 * K
    resolution_half_bandwidth_hz: float # W = NW / (N * dt)


def compute_multitaper_psd(
    signal_array: np.ndarray,
    sampling_rate: float,
    nw: float = 3.5,
    n_tapers: Optional[int] = None,
    alpha: float = 0.01,
    fdr_control: bool = True,
) -> MultitaperResult:
    """
    Compute Thomson Multitaper Power Spectral Density and Harmonic F-test.

    Features:
    - Slepian DPSS optimal tapers
    - Scale-invariant Thomson F-test
    - Benjamini-Hochberg False Discovery Rate (FDR) control across spectral peaks
    """
    x = np.asarray(signal_array, dtype=np.float64)
    n = len(x)
    if n < 8:
        raise ValidationError("Signal must contain at least 8 samples for multitaper analysis.")
    if sampling_rate <= 0:
        raise ValidationError(f"Sampling rate must be positive, got {sampling_rate}.")

    # Default number of tapers: K = 2*NW - 1 (Slepian recommendation)
    if n_tapers is None:
        k = max(2, int(np.floor(2 * nw - 1)))
    else:
        k = max(2, int(n_tapers))

    # Compute DPSS tapers: shape (K, N)
    dpss_tapers, eigenvalues = windows.dpss(n, NW=nw, Kmax=k, return_ratios=True)

    # Detrend constant mean
    x_centered = x - np.mean(x)

    # Frequency grid
    freqs = sfft.rfftfreq(n, d=1.0 / sampling_rate)
    n_freqs = len(freqs)

    # Tapered spectra Y_k(f)
    yk = np.zeros((k, n_freqs), dtype=np.complex128)
    for i in range(k):
        tapered_x = x_centered * dpss_tapers[i]
        yk[i] = sfft.rfft(tapered_x)

    # PSD estimate: averaged energy across tapers, normalized by sampling rate
    psd_individual = (np.abs(yk) ** 2) / sampling_rate
    psd = np.mean(psd_individual, axis=0) * 2.0
    psd[0] /= 2.0
    if n % 2 == 0 and len(psd) > 1:
        psd[-1] /= 2.0

    # Thomson Harmonic F-Test:
    # Test H0: Continuous background spectrum vs H1: Discrete sinusoid line component
    v_k_0 = np.sum(dpss_tapers, axis=1) # shape (K,)
    sum_v2 = np.sum(v_k_0 ** 2)

    # C(f) = sum_k(V_k(0) * Y_k(f)) / sum_k(V_k(0)^2)
    c_f = np.tensordot(v_k_0, yk, axes=(0, 0)) / sum_v2

    # Residual sum of squares: sum_k |Y_k(f) - C(f)*V_k(0)|^2
    model_fit = np.outer(v_k_0, c_f)
    residuals = yk - model_fit
    rss_f = np.sum(np.abs(residuals) ** 2, axis=0)

    # Scale-invariant numerical protection relative to signal spectral energy
    total_energy = np.sum(np.abs(yk) ** 2, axis=0)
    eps_scale = np.maximum(1e-30, np.finfo(float).eps * total_energy)
    rss_f = np.maximum(eps_scale, rss_f)

    # F-statistic with df1 = 2, df2 = 2*K - 2
    f_stat = (k - 1) * (np.abs(c_f) ** 2) * sum_v2 / rss_f
    df1 = 2
    df2 = 2 * k - 2

    # Survival function (1 - CDF) of F distribution
    p_vals = stats.f.sf(f_stat, df1, df2)

    # Select candidate peaks (local maxima in F-statistic, excluding DC)
    peaks = [
        i for i in range(1, n_freqs - 1)
        if f_stat[i] > f_stat[i - 1] and f_stat[i] > f_stat[i + 1] and freqs[i] > 0
    ]

    detected_freqs: List[float] = []
    if peaks:
        peak_p = p_vals[peaks]
        if fdr_control:
            # Benjamini-Hochberg FDR control across candidate peaks
            m = len(peaks)
            sorted_idx = np.argsort(peak_p)
            sorted_p = peak_p[sorted_idx]
            thresholds = (np.arange(1, m + 1) / m) * alpha
            significant = sorted_p <= thresholds
            if np.any(significant):
                max_sig_idx = int(np.max(np.where(significant)[0]))
                passed_peak_indices = [peaks[sorted_idx[i]] for i in range(max_sig_idx + 1)]
                # Sort by frequency
                detected_freqs = sorted([float(freqs[idx]) for idx in passed_peak_indices])
        else:
            detected_freqs = [float(freqs[idx]) for idx in peaks if p_vals[idx] < alpha]

    half_bw = nw * sampling_rate / n

    return MultitaperResult(
        frequencies=freqs,
        psd=psd,
        f_statistics=f_stat,
        p_values=p_vals,
        line_frequencies_detected=tuple(detected_freqs),
        time_bandwidth_product=float(nw),
        n_tapers=k,
        degrees_of_freedom=2 * k,
        resolution_half_bandwidth_hz=float(half_bw),
    )
