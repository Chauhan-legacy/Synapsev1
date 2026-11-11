"""
Null-Model Lab for SYNAPSE.
Calibrates empirical detection claims against data-derived surrogates:
- Phase-randomised Fourier Surrogates (Theiler et al., 1992)
- Iterated Amplitude Adjusted Fourier Transform (IAAFT, Schreiber & Schmitz, 1996)
- Circular Time-Shift Surrogates (cross-channel decoupling)
- Block Reshuffling Surrogates (long-range memory destruction)
"""

from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import Callable, List, Optional, Tuple, Dict, Any
import numpy as np
import scipy.fft as sfft


class NullModelType(str, Enum):
    FT_SURROGATE = "ft_surrogate"           # Phase-randomised Fourier (tests linear Gaussian process)
    IAAFT_SURROGATE = "iaaft"               # Iterated amplitude adjusted (preserves exact marginal & spectrum)
    CIRCULAR_SHIFT = "circular_shift"       # Independent circular shift (tests cross-channel coupling)
    BLOCK_SHUFFLE = "block_shuffle"         # Permuted blocks (tests long-range persistence)
    WHITE_NOISE = "white_noise"             # Gaussian noise with matching variance


@dataclass(frozen=True)
class NullCalibrationResult:
    observed_statistic: float
    null_mean: float
    null_std: float
    surrogate_values: np.ndarray
    empirical_p_value: float                # (1 + count(S >= S_obs)) / (N + 1)
    z_score_effect_size: float              # (S_obs - null_mean) / null_std
    null_model_used: str
    n_surrogates: int
    is_statistically_significant: bool      # empirical_p_value < alpha

    def to_dict(self) -> Dict[str, Any]:
        return {
            "observed_statistic": self.observed_statistic,
            "null_mean": self.null_mean,
            "null_std": self.null_std,
            "empirical_p_value": self.empirical_p_value,
            "z_score_effect_size": self.z_score_effect_size,
            "null_model_used": self.null_model_used,
            "n_surrogates": self.n_surrogates,
            "is_statistically_significant": self.is_statistically_significant,
        }


def generate_ft_surrogates(x: np.ndarray, n_surrogates: int = 40, seed: int = 42) -> np.ndarray:
    """Generate phase-randomised Fourier surrogates."""
    rng = np.random.default_rng(seed)
    n = len(x)
    fft_x = sfft.rfft(x)
    amplitudes = np.abs(fft_x)
    n_freqs = len(fft_x)
    surrogates = np.zeros((n_surrogates, n), dtype=np.float64)

    for i in range(n_surrogates):
        random_phases = rng.uniform(0, 2 * np.pi, size=n_freqs)
        random_phases[0] = 0.0 # Preserve DC
        if n % 2 == 0:
            random_phases[-1] = 0.0 # Preserve Nyquist
        new_fft = amplitudes * np.exp(1j * random_phases)
        surr = sfft.irfft(new_fft, n=n)
        surrogates[i] = surr * (np.std(x) / (np.std(surr) or 1.0))
    return surrogates


def generate_iaaft_surrogates(
    x: np.ndarray,
    n_surrogates: int = 40,
    max_iter: int = 100,
    seed: int = 42,
) -> np.ndarray:
    """
    Generate Iterated Amplitude Adjusted Fourier Transform (IAAFT) surrogates (Schreiber & Schmitz 1996).
    Preserves both the exact linear autocorrelation and the exact empirical amplitude distribution.
    """
    rng = np.random.default_rng(seed)
    n = len(x)
    sorted_orig = np.sort(x)
    fft_orig = sfft.rfft(x)
    amplitudes_orig = np.abs(fft_orig)
    surrogates = np.zeros((n_surrogates, n), dtype=np.float64)

    for i in range(n_surrogates):
        # Initial random shuffle of original values
        s = rng.permutation(x)
        for _ in range(max_iter):
            # 1. Match Fourier amplitudes
            fft_s = sfft.rfft(s)
            phases_s = np.angle(fft_s)
            s_adj = sfft.irfft(amplitudes_orig * np.exp(1j * phases_s), n=n)

            # 2. Match exact marginal distribution (rank order replacement)
            rank_order = np.argsort(np.argsort(s_adj))
            s_new = sorted_orig[rank_order]

            if np.allclose(s, s_new, atol=1e-5):
                break
            s = s_new
        surrogates[i] = s
    return surrogates


def generate_circular_shift_surrogates(
    x: np.ndarray,
    n_surrogates: int = 40,
    min_shift: int = 10,
    seed: int = 42,
) -> np.ndarray:
    """Generate circular time-shift surrogates for coupling tests."""
    rng = np.random.default_rng(seed)
    n = len(x)
    effective_min = min(min_shift, n // 10)
    surrogates = np.zeros((n_surrogates, n), dtype=np.float64)

    for i in range(n_surrogates):
        shift = rng.integers(effective_min, n - effective_min)
        surrogates[i] = np.roll(x, shift)
    return surrogates


def generate_block_shuffle_surrogates(
    x: np.ndarray,
    block_length: int = 16,
    n_surrogates: int = 40,
    seed: int = 42,
) -> np.ndarray:
    """Generate block-shuffled surrogates preserving local dynamics while destroying long-range order."""
    rng = np.random.default_rng(seed)
    n = len(x)
    b_len = max(4, min(block_length, n // 4))
    n_blocks = n // b_len
    remainder = n % b_len

    blocks = [x[k * b_len : (k + 1) * b_len] for k in range(n_blocks)]
    surrogates = np.zeros((n_surrogates, n), dtype=np.float64)

    for i in range(n_surrogates):
        perm_blocks = rng.permutation(blocks)
        reassembled = np.concatenate(perm_blocks)
        if remainder > 0:
            reassembled = np.concatenate([reassembled, x[-remainder:]])
        surrogates[i] = reassembled
    return surrogates


def calibrate_against_null(
    test_func: Callable[[np.ndarray], float],
    observed_statistic: float,
    signal_values: np.ndarray,
    null_type: NullModelType = NullModelType.IAAFT_SURROGATE,
    n_surrogates: int = 50,
    alpha: float = 0.05,
    seed: int = 42,
) -> NullCalibrationResult:
    """
    Calibrate an observed test statistic against data-generated null surrogates.

    Computes:
    - Empirical surrogate distribution
    - Empirical one-sided p-value: p = (1 + count(S_surr >= S_obs)) / (N + 1)
    - Z-score effect size: (S_obs - mu_null) / sigma_null
    """
    x = np.asarray(signal_values, dtype=np.float64)
    if null_type == NullModelType.IAAFT_SURROGATE:
        surrogates = generate_iaaft_surrogates(x, n_surrogates=n_surrogates, seed=seed)
    elif null_type == NullModelType.FT_SURROGATE:
        surrogates = generate_ft_surrogates(x, n_surrogates=n_surrogates, seed=seed)
    elif null_type == NullModelType.CIRCULAR_SHIFT:
        surrogates = generate_circular_shift_surrogates(x, n_surrogates=n_surrogates, seed=seed)
    elif null_type == NullModelType.BLOCK_SHUFFLE:
        surrogates = generate_block_shuffle_surrogates(x, n_surrogates=n_surrogates, seed=seed)
    else:
        rng = np.random.default_rng(seed)
        surrogates = rng.normal(np.mean(x), np.std(x) or 1.0, size=(n_surrogates, len(x)))

    surr_values = np.zeros(n_surrogates, dtype=np.float64)
    for i in range(n_surrogates):
        try:
            surr_values[i] = float(test_func(surrogates[i]))
        except Exception:
            surr_values[i] = 0.0

    null_mean = float(np.mean(surr_values))
    null_std = float(np.std(surr_values)) or 1e-6

    # Empirical p-value (conservative, unbiased estimator)
    exceedances = int(np.sum(surr_values >= observed_statistic))
    empirical_p = float((1 + exceedances) / (n_surrogates + 1))
    z_score = float((observed_statistic - null_mean) / null_std)

    return NullCalibrationResult(
        observed_statistic=observed_statistic,
        null_mean=null_mean,
        null_std=null_std,
        surrogate_values=surr_values,
        empirical_p_value=empirical_p,
        z_score_effect_size=z_score,
        null_model_used=null_type.value,
        n_surrogates=n_surrogates,
        is_statistically_significant=bool(empirical_p < alpha and z_score > 2.0),
    )

