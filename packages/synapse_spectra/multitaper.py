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
    line_frequencies_detected: Tuple[float, ...] # Frequencies with p < alpha
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
) -> MultitaperResult:
    """
    Compute Thomson Multitaper Power Spectral Density and Harmonic F-test.
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
    # Shape: (K, n_freqs)
    yk = np.zeros((k, n_freqs), dtype=np.complex128)
    for i in range(k):
        tapered_x = x_centered * dpss_tapers[i]
        yk[i] = sfft.rfft(tapered_x)

    # PSD estimate: averaged energy across tapers, normalized by sampling rate
    # Scaling factor 2 / (fs * sum(taper^2)) for one-sided PSD
    taper_energy = np.sum(dpss_tapers ** 2, axis=1) # each taper is unit energy = 1.0
    psd_individual = (np.abs(yk) ** 2) / sampling_rate
    psd = np.mean(psd_individual, axis=0) * 2.0
    psd[0] /= 2.0
    if n % 2 == 0 and len(psd) > 1:
        psd[-1] /= 2.0

    # Thomson Harmonic F-Test:
    # Test H0: Continuous background spectrum vs H1: Discrete sinusoid line component
    # V_k(0) = sum of taper samples
    v_k_0 = np.sum(dpss_tapers, axis=1) # shape (K,)
    sum_v2 = np.sum(v_k_0 ** 2)

    # C(f) = sum_k(V_k(0) * Y_k(f)) / sum_k(V_k(0)^2)
    # shape: (n_freqs,)
    c_f = np.tensordot(v_k_0, yk, axes=(0, 0)) / sum_v2

    # Residual sum of squares: sum_k |Y_k(f) - C(f)*V_k(0)|^2
    # shape (K, n_freqs)
    model_fit = np.outer(v_k_0, c_f)
    residuals = yk - model_fit
    rss_f = np.sum(np.abs(residuals) ** 2, axis=0)
    rss_f = np.maximum(1e-12, rss_f)

    # F-statistic with df1 = 2, df2 = 2*K - 2
    f_stat = (k - 1) * (np.abs(c_f) ** 2) * sum_v2 / rss_f
    df1 = 2
    df2 = 2 * k - 2

    # Survival function (1 - CDF) of F distribution
    p_vals = stats.f.sf(f_stat, df1, df2)

    # Detect lines with p < alpha
    line_indices = np.where(p_vals < alpha)[0]
    line_freqs = tuple(float(freqs[idx]) for idx in line_indices if freqs[idx] > 0)

    half_bw = nw * sampling_rate / n

    return MultitaperResult(
        frequencies=freqs,
        psd=psd,
        f_statistics=f_stat,
        p_values=p_vals,
        line_frequencies_detected=line_freqs,
        time_bandwidth_product=float(nw),
        n_tapers=k,
        degrees_of_freedom=2 * k,
        resolution_half_bandwidth_hz=float(half_bw),
    )
