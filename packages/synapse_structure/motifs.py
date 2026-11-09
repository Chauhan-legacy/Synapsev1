"""
Subsequence Motif and Discord Discovery for SYNAPSE STRUCTURE.
Finds repeated recurring temporal patterns (motifs) and unique abnormal patterns (discords).
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, List, Optional
import numpy as np


@dataclass(frozen=True)
class MotifPair:
    idx_a: int
    idx_b: int
    time_a: float
    time_b: float
    window_length: int
    distance: float


@dataclass(frozen=True)
class DiscordSubsequence:
    start_index: int
    start_time: float
    window_length: int
    nearest_neighbor_distance: float


def discover_motifs_and_discords(
    values: np.ndarray,
    timestamps: np.ndarray,
    window_length: int = 32,
    subsample_step: int = 1,
) -> Tuple[Optional[MotifPair], Optional[DiscordSubsequence]]:
    """
    Search for 1-NN motif pair (minimum distance) and discord (maximum 1-NN distance)
    using z-normalized Euclidean distance over sliding subsequences.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    m = window_length

    if n < (2 * m):
        return None, None

    # Extract subsequences
    indices = np.arange(0, n - m + 1, subsample_step)
    k = len(indices)
    if k < 2:
        return None, None

    subsequences = np.empty((k, m), dtype=np.float64)
    for i, idx in enumerate(indices):
        sub = x[idx : idx + m]
        # z-normalize subsequence
        std_sub = np.std(sub)
        if std_sub > 1e-12:
            subsequences[i] = (sub - np.mean(sub)) / std_sub
        else:
            subsequences[i] = sub - np.mean(sub)

    # Compute pairwise Euclidean distance matrix with trivial match exclusion (|i - j| >= m)
    min_dist = float("inf")
    best_motif_pair = None

    # Compute nearest neighbor distance for each subsequence to find discord
    nn_distances = np.full(k, float("inf"), dtype=np.float64)

    for i in range(k):
        sub_i = subsequences[i]
        for j in range(k):
            # Exclude overlapping / trivial matches
            if abs(indices[i] - indices[j]) < m:
                continue
            
            d = float(np.linalg.norm(sub_i - subsequences[j]))
            if d < nn_distances[i]:
                nn_distances[i] = d

            if j > i and d < min_dist:
                min_dist = d
                best_motif_pair = (i, j)

    motif_res = None
    if best_motif_pair is not None:
        i, j = best_motif_pair
        idx_a = int(indices[i])
        idx_b = int(indices[j])
        motif_res = MotifPair(
            idx_a=idx_a,
            idx_b=idx_b,
            time_a=float(timestamps[idx_a]),
            time_b=float(timestamps[idx_b]),
            window_length=m,
            distance=min_dist,
        )

    # Discord is the subsequence with the largest nearest neighbor distance
    valid_nn_mask = np.isfinite(nn_distances)
    discord_res = None
    if np.any(valid_nn_mask):
        disc_sub_idx = int(np.argmax(nn_distances))
        disc_orig_idx = int(indices[disc_sub_idx])
        discord_res = DiscordSubsequence(
            start_index=disc_orig_idx,
            start_time=float(timestamps[disc_orig_idx]),
            window_length=m,
            nearest_neighbor_distance=float(nn_distances[disc_sub_idx]),
        )

    return motif_res, discord_res

