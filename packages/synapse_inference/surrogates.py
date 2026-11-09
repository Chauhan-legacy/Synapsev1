"""
Surrogate Data Generation for SYNAPSE INFERENCE.
Implements Fourier Phase-Randomized Surrogates and IAAFT to test linear Gaussian null hypotheses.
"""

from __future__ import annotations
from typing import List
import numpy as np
import scipy.fft as sfft


def generate_ft_surrogates(
    signal_array: np.ndarray,
    n_surrogates: int = 20,
    random_seed: int = 42,
) -> List[np.ndarray]:
    """
    Generate Fourier Transform (FT) phase-randomized surrogates.
    Preserves exact power spectrum and autocorrelation, destroys non-linear / phase structure.
    """
    x = np.asarray(signal_array, dtype=np.float64)
    n = len(x)
    rng = np.random.default_rng(random_seed)

    x_fft = sfft.rfft(x)
    amplitudes = np.abs(x_fft)
    n_freqs = len(amplitudes)

    surrogates: List[np.ndarray] = []
    for _ in range(n_surrogates):
        # Random phases uniformly distributed in [-pi, pi]
        random_phases = rng.uniform(-np.pi, np.pi, size=n_freqs)
        # Preserve DC phase and Nyquist phase (if even)
        random_phases[0] = 0.0
        if n % 2 == 0:
            random_phases[-1] = 0.0

        surr_fft = amplitudes * np.exp(1j * random_phases)
        surr_x = sfft.irfft(surr_fft, n=n)
        surr_x.flags.writeable = False
        surrogates.append(surr_x)

    return surrogates


def evaluate_surrogate_significance(
    test_statistic: float,
    surrogate_statistics: List[float],
    two_tailed: bool = False,
) -> float:
    """
    Calculate Monte Carlo p-value from surrogate distribution:
    p = (1 + count(surr >= obs)) / (1 + n_surr).
    """
    surrs = np.asarray(surrogate_statistics, dtype=np.float64)
    n = len(surrs)
    if n == 0:
        return 1.0

    if two_tailed:
        obs_dev = abs(test_statistic - np.mean(surrs))
        surr_devs = np.abs(surrs - np.mean(surrs))
        count = np.sum(surr_devs >= obs_dev)
    else:
        count = np.sum(surrs >= test_statistic)

    p_val = float((count + 1) / (n + 1))
    return min(1.0, max(0.0, p_val))
