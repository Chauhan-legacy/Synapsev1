"""
Surrogate Data Generation for SYNAPSE INFERENCE.
Implements Fourier Phase-Randomized Surrogates, IAAFT (Iterative Amplitude Adjusted Fourier Transform),
and Circular-Shift Surrogates to test linear Gaussian and cross-correlation null hypotheses.
"""

from __future__ import annotations
from typing import List, Tuple
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


def generate_iaaft_surrogates(
    signal_array: np.ndarray,
    n_surrogates: int = 20,
    max_iter: int = 100,
    tol: float = 1e-6,
    random_seed: int = 42,
) -> List[np.ndarray]:
    """
    Iterative Amplitude Adjusted Fourier Transform (IAAFT) Surrogates (Schreiber & Schmitz 1996).
    Preserves BOTH the exact amplitude distribution AND the power spectrum / autocorrelation.
    """
    x = np.asarray(signal_array, dtype=np.float64)
    n = len(x)
    rng = np.random.default_rng(random_seed)

    # 1. Target amplitude distribution (sorted original values)
    sorted_x = np.sort(x)

    # 2. Target Fourier amplitudes
    target_fft = sfft.rfft(x)
    target_amplitudes = np.abs(target_fft)
    n_freqs = len(target_amplitudes)

    surrogates: List[np.ndarray] = []

    for _ in range(n_surrogates):
        # Initial random shuffle of original values
        s = rng.permutation(x)

        prev_diff = float("inf")
        for iteration in range(max_iter):
            # Transform to Fourier space
            s_fft = sfft.rfft(s)
            s_phase = np.angle(s_fft)

            # Preserve DC & Nyquist phases
            s_phase[0] = 0.0
            if n % 2 == 0:
                s_phase[-1] = 0.0

            # Match target amplitudes with current phases
            adjusted_fft = target_amplitudes * np.exp(1j * s_phase)
            s_prime = sfft.irfft(adjusted_fft, n=n)

            # Rank order match to target amplitude distribution
            ranks = np.argsort(np.argsort(s_prime))
            s_next = sorted_x[ranks]

            diff = np.mean(np.abs(s_next - s))
            if diff < tol or abs(diff - prev_diff) < tol * 1e-2:
                s = s_next
                break
            prev_diff = diff
            s = s_next

        s.flags.writeable = False
        surrogates.append(s)

    return surrogates


def generate_circular_shift_surrogates(
    signal_array: np.ndarray,
    n_surrogates: int = 20,
    min_shift: int = 10,
    random_seed: int = 42,
) -> List[np.ndarray]:
    """
    Generate circular-shift surrogates for bivariate relation and cross-correlation testing.
    Preserves exact individual autocorrelation, destroys relative lag alignment.
    """
    x = np.asarray(signal_array, dtype=np.float64)
    n = len(x)
    rng = np.random.default_rng(random_seed)

    if n <= 2 * min_shift:
        min_shift = max(1, n // 4)

    surrogates: List[np.ndarray] = []
    for _ in range(n_surrogates):
        shift = rng.integers(min_shift, n - min_shift)
        surr = np.roll(x, shift)
        surr.flags.writeable = False
        surrogates.append(surr)

    return surrogates


def generate_block_shuffle_surrogates(
    signal_array: np.ndarray,
    block_length: int = 16,
    n_surrogates: int = 20,
    random_seed: int = 42,
) -> List[np.ndarray]:
    """
    Block-shuffle surrogates.
    Divides the signal into blocks of length L and shuffles their temporal order.
    """
    x = np.asarray(signal_array, dtype=np.float64)
    n = len(x)
    rng = np.random.default_rng(random_seed)

    n_blocks = n // block_length
    surrogates: List[np.ndarray] = []

    for _ in range(n_surrogates):
        block_indices = rng.permutation(n_blocks)
        blocks = [x[i * block_length : (i + 1) * block_length] for i in block_indices]
        remainder = x[n_blocks * block_length :]
        if len(remainder) > 0:
            blocks.append(remainder)
        surr = np.concatenate(blocks)
        surr.flags.writeable = False
        surrogates.append(surr)

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
