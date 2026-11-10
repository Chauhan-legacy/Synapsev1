"""
Burg Autoregressive (AR) Spectral Estimation for SYNAPSE SPECTRA.
Implements the Burg maximum entropy method with order selection via AIC/BIC
and evaluates high-resolution all-pole autoregressive power spectra.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.fft as sfft

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class BurgSpectralResult:
    frequencies: np.ndarray             # Frequencies [Hz]
    psd: np.ndarray                     # Burg AR PSD [units^2 / Hz]
    optimal_order: int                  # Selected AR order p
    ar_coefficients: np.ndarray         # AR polynomial [1, a_1, ..., a_p]
    noise_variance: float               # Residual error variance sigma^2
    aic_values: Dict[int, float]        # Order -> AIC score


def compute_burg_spectrum(
    signal_array: np.ndarray,
    sampling_rate: float,
    max_order: int = 30,
    n_freqs: int = 512,
) -> BurgSpectralResult:
    """
    Compute Burg AR spectrum with optimal order selection by AIC.
    """
    x = np.asarray(signal_array, dtype=np.float64)
    n = len(x)
    if n < 8:
        raise ValidationError("Need at least 8 samples for Burg AR spectrum.")
    if sampling_rate <= 0:
        raise ValidationError(f"Invalid sampling rate {sampling_rate}.")

    # Center signal
    x_centered = x - np.mean(x)

    p_max = min(max_order, n // 3, 50)
    p_max = max(1, p_max)

    # Initialize forward and backward prediction errors
    ef = x_centered.copy()
    eb = x_centered.copy()

    sigma2 = float(np.mean(x_centered ** 2))
    a = np.array([1.0], dtype=np.float64)

    order_models = {}
    aic_scores = {}

    for m in range(1, p_max + 1):
        # Burg reflection coefficient k_m
        ef_m = ef[1:]
        eb_m = eb[:-1]
        num = -2.0 * np.sum(ef_m * eb_m)
        denom = np.sum(ef_m ** 2) + np.sum(eb_m ** 2)
        km = num / max(1e-12, denom)
        km = np.clip(km, -0.9999, 0.9999)

        # Update AR coefficients
        a_new = np.zeros(m + 1, dtype=np.float64)
        a_new[0] = 1.0
        a_new[1:m] = a[1:m] + km * a[m-1:0:-1]
        a_new[m] = km
        a = a_new

        # Update prediction errors
        ef_next = ef[1:] + km * eb[:-1]
        eb_next = eb[:-1] + km * ef[1:]
        ef = ef_next
        eb = eb_next

        # Update residual variance
        sigma2 = float(sigma2 * (1.0 - km ** 2))
        sigma2 = max(1e-12, sigma2)

        # AIC = N * ln(sigma^2) + 2 * m
        aic = n * np.log(sigma2) + 2.0 * m
        aic_scores[m] = float(aic)
        order_models[m] = (a.copy(), sigma2)

    # Pick optimal order minimizing AIC
    best_m = min(aic_scores.keys(), key=lambda k_order: aic_scores[k_order])
    best_a, best_sigma2 = order_models[best_m]

    # Evaluate all-pole frequency response
    freqs = np.linspace(0, sampling_rate / 2.0, n_freqs)
    # H(f) = 1 / A(e^{j 2 pi f / fs})
    # Vectorized evaluation of polynomial sum_k a_k exp(-j 2 pi f k / fs)
    k_indices = np.arange(len(best_a))
    # Outer product for phases: shape (n_freqs, p+1)
    phases = 2.0 * np.pi * np.outer(freqs / sampling_rate, k_indices)
    poly_eval = np.sum(best_a * np.exp(-1j * phases), axis=1)

    # PSD S(f) = (2 * sigma^2 / fs) / |A(f)|^2
    psd = (2.0 * best_sigma2 / sampling_rate) / np.maximum(1e-12, np.abs(poly_eval) ** 2)

    return BurgSpectralResult(
        frequencies=freqs,
        psd=psd,
        optimal_order=best_m,
        ar_coefficients=best_a,
        noise_variance=best_sigma2,
        aic_values=aic_scores,
    )

