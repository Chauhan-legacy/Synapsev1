"""
Spectral Entropy calculation for SYNAPSE SPECTRA.
Quantifies spectral complexity/disorder normalized between 0 (pure tone) and 1 (white noise).
"""

from __future__ import annotations
import numpy as np


def compute_spectral_entropy(power_spectrum: np.ndarray) -> float:
    """
    Calculate normalized Shannon spectral entropy:
    H = - sum(p_k * log2(p_k)) / log2(N)
    where p_k = P[k] / sum(P).
    """
    p = np.asarray(power_spectrum, dtype=np.float64)
    total_power = np.sum(p)
    if total_power <= 0:
        return 0.0

    p_norm = p / total_power
    # Mask zero probabilities
    p_valid = p_norm[p_norm > 0]
    if len(p_valid) <= 1:
        return 0.0

    h = -float(np.sum(p_valid * np.log2(p_valid)))
    h_max = float(np.log2(len(p)))
    if h_max <= 0:
        return 0.0

    return float(np.clip(h / h_max, 0.0, 1.0))

