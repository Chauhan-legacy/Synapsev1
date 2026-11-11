"""
Sample Entropy and Multiscale Permutation Entropy for SYNAPSE STRUCTURE.
Quantifies signal regularity, information creation rate, and dynamical complexity.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import itertools
import math
import numpy as np

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class EntropyResult:
    sample_entropy: float               # SampEn
    permutation_entropy: float          # Normalized Permutation Entropy [0, 1]
    multiscale_pe_scales: np.ndarray    # Scales 1, 2, ..., S
    multiscale_pe_values: np.ndarray    # PE values across temporal scales
    embedding_dimension_d: int
    tolerance_r: float


def compute_sample_entropy(
    values: np.ndarray,
    m: int = 2,
    r_factor: float = 0.20,
) -> float:
    """
    Compute Sample Entropy (SampEn) with embedding length m and tolerance r = r_factor * std.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    if n < 32:
        return 0.0

    std_x = float(np.std(x)) or 1.0
    r = r_factor * std_x

    def count_matches(dim: int) -> int:
        n_sub = n - dim + 1
        subseqs = np.array([x[i : i + dim] for i in range(n_sub)])
        # Subsample if too large for speed
        if n_sub > 1000:
            step = n_sub // 1000
            subseqs = subseqs[::step]
            n_sub = len(subseqs)

        # Chebyshev distance (max coordinate difference)
        matches = 0
        for i in range(n_sub):
            diffs = np.max(np.abs(subseqs[i + 1 :] - subseqs[i]), axis=1)
            matches += int(np.sum(diffs <= r))
        return matches

    B = count_matches(m)
    A = count_matches(m + 1)

    if B == 0 or A == 0:
        return float(np.inf if B > 0 else 0.0)

    return float(-np.log(A / B))


def compute_permutation_entropy(
    values: np.ndarray,
    order_d: int = 3,
    delay_tau: int = 1,
) -> float:
    """
    Compute Bandt & Pompe (2002) Permutation Entropy of order d and delay tau.
    Normalized by log2(d!) to sit strictly in [0, 1].
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    d = int(order_d)
    tau = int(delay_tau)

    n_patterns = n - (d - 1) * tau
    if n_patterns < 10:
        return 0.0

    # Extract all subsequences
    subseqs = np.column_stack([x[i * tau : i * tau + n_patterns] for i in range(d)])

    # Map each subsequence to its ordinal permutation index
    # Using rank permutation
    patterns = [tuple(np.argsort(row)) for row in subseqs]
    # Count frequencies of each permutation
    unique_patterns, counts = np.unique(patterns, return_counts=True, axis=0)
    probs = counts / float(n_patterns)

    # Shannon entropy of permutations
    pe = -np.sum(probs * np.log2(probs))
    # Maximum entropy is log2(d!)
    max_pe = np.log2(float(math.factorial(d)))
    normalized_pe = float(pe / max_pe) if max_pe > 0 else 0.0

    return min(1.0, max(0.0, normalized_pe))


def compute_multiscale_entropy(
    values: np.ndarray,
    max_scale: int = 5,
    order_d: int = 3,
    sample_entropy_m: int = 2,
) -> EntropyResult:
    """
    Compute Sample Entropy and Multiscale Permutation Entropy across scales 1..max_scale.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    if n < 32:
        raise ValidationError("Need at least 32 samples for multiscale entropy analysis.")

    samp_en = compute_sample_entropy(x, m=sample_entropy_m)
    pe_base = compute_permutation_entropy(x, order_d=order_d, delay_tau=1)

    scales = np.arange(1, max_scale + 1)
    pe_scales = []

    for s in scales:
        if s == 1:
            pe_scales.append(pe_base)
        else:
            # Coarse-grain series at scale s: y_j = (1/s) * sum_{i=(j-1)s + 1}^{js} x_i
            n_coarse = n // s
            if n_coarse < 15:
                pe_scales.append(pe_scales[-1])
                continue
            coarse_x = np.mean(x[: n_coarse * s].reshape(n_coarse, s), axis=1)
            pe_s = compute_permutation_entropy(coarse_x, order_d=order_d, delay_tau=1)
            pe_scales.append(pe_s)

    pe_scales_arr = np.array(pe_scales, dtype=np.float64)

    return EntropyResult(
        sample_entropy=samp_en,
        permutation_entropy=pe_base,
        multiscale_pe_scales=scales,
        multiscale_pe_values=pe_scales_arr,
        embedding_dimension_d=order_d,
        tolerance_r=0.20 * (float(np.std(x)) or 1.0),
    )

