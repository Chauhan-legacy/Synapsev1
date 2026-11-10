"""
Matrix-Profile Discord Discovery for SYNAPSE ANOMALY.
Finds unusual subsequences / anomalous motifs using 1-nearest-neighbor distance profiles.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class DiscordResult:
    discord_indices: Tuple[int, ...]
    discord_distances: Tuple[float, ...]
    matrix_profile: np.ndarray
    window_size: int
    n_discords: int


def find_matrix_profile_discords(
    values: np.ndarray,
    window_size: int = 32,
    top_k: int = 3,
) -> DiscordResult:
    """
    Compute 1-NN Matrix Profile distance and extract top-k anomalous discords.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    m = int(window_size)
    if n < 2 * m:
        raise ValidationError(f"Signal length ({n}) must be at least twice window size ({2 * m}).")

    k_subseqs = n - m + 1
    # Rolling z-normalization of all subsequences
    subseqs = np.array([x[i : i + m] for i in range(k_subseqs)])
    means = np.mean(subseqs, axis=1, keepdims=True)
    stds = np.std(subseqs, axis=1, keepdims=True)
    stds[stds <= 1e-10] = 1.0
    norm_subseqs = (subseqs - means) / stds

    # Matrix profile distance vector: min distance to another non-trivial match
    mp = np.full(k_subseqs, np.inf, dtype=np.float64)
    exclusion_zone = m // 2

    # Vectorized / pairwise computation across subsequences
    for i in range(k_subseqs):
        target = norm_subseqs[i]
        # Compute distances to all other subsequences
        diffs = norm_subseqs - target
        dists = np.sqrt(np.sum(diffs ** 2, axis=1))

        # Mask exclusion zone around i
        low_ex = max(0, i - exclusion_zone)
        high_ex = min(k_subseqs, i + exclusion_zone + 1)
        dists[low_ex:high_ex] = np.inf

        mp[i] = float(np.min(dists))

    # Top-k discords have the largest 1-NN distances
    # Apply non-overlapping suppression
    sorted_candidates = np.argsort(mp)[::-1]
    selected_discords: List[int] = []
    selected_dists: List[float] = []

    for idx in sorted_candidates:
        if mp[idx] == np.inf:
            continue
        # Check non-overlap with already selected
        if all(abs(idx - prev) >= exclusion_zone for prev in selected_discords):
            selected_discords.append(int(idx))
            selected_dists.append(float(mp[idx]))
            if len(selected_discords) >= top_k:
                break

    return DiscordResult(
        discord_indices=tuple(selected_discords),
        discord_distances=tuple(selected_dists),
        matrix_profile=mp,
        window_size=m,
        n_discords=len(selected_discords),
    )

