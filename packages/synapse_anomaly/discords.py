"""
Matrix-Profile Discord Discovery for SYNAPSE ANOMALY.
Finds unusual subsequences / anomalous motifs using 1-nearest-neighbor distance profiles.
Accelerated using the STOMP algorithm with Numba LLVM JIT compilation.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np

from synapse_core.exceptions import ValidationError
from synapse_anomaly.variance_shift import detect_variance_shifts

try:
    from numba import njit
    _HAS_NUMBA = True
except ImportError:
    _HAS_NUMBA = False


if _HAS_NUMBA:
    @njit(fastmath=True)
    def _stomp_numba(x: np.ndarray, m: int) -> np.ndarray:
        n = len(x)
        k = n - m + 1
        means = np.empty(k, dtype=np.float64)
        stds = np.empty(k, dtype=np.float64)
        for i in range(k):
            s = 0.0
            s2 = 0.0
            for j in range(m):
                v = x[i + j]
                s += v
                s2 += v * v
            mean = s / m
            var = max(1e-12, s2 / m - mean * mean)
            means[i] = mean
            stds[i] = np.sqrt(var)

        mp = np.full(k, 1e9, dtype=np.float64)
        ex = m // 2
        q = np.empty(k, dtype=np.float64)
        for j in range(k):
            dot = 0.0
            for t in range(m):
                dot += x[t] * x[j + t]
            q[j] = dot

        for j in range(k):
            if j > ex:
                denom = m * stds[0] * stds[j]
                corr = (q[j] - m * means[0] * means[j]) / denom
                corr = min(1.0, max(-1.0, corr))
                d = np.sqrt(max(0.0, 2.0 * m * (1.0 - corr)))
                if d < mp[0]:
                    mp[0] = d
                if d < mp[j]:
                    mp[j] = d

        for i in range(1, k):
            x_prev_i = x[i - 1]
            x_next_i = x[i + m - 1]
            for j in range(k - 1, 0, -1):
                q[j] = q[j - 1] - x_prev_i * x[j - 1] + x_next_i * x[j + m - 1]
                if abs(i - j) > ex:
                    denom = m * stds[i] * stds[j]
                    corr = (q[j] - m * means[i] * means[j]) / denom
                    corr = min(1.0, max(-1.0, corr))
                    d = np.sqrt(max(0.0, 2.0 * m * (1.0 - corr)))
                    if d < mp[i]:
                        mp[i] = d
                    if d < mp[j]:
                        mp[j] = d
            dot0 = 0.0
            for t in range(m):
                dot0 += x[i + t] * x[t]
            q[0] = dot0

        return mp
else:
    def _stomp_numba(x: np.ndarray, m: int) -> np.ndarray:
        n = len(x)
        k = n - m + 1
        subseqs = np.array([x[i : i + m] for i in range(k)])
        means = np.mean(subseqs, axis=1, keepdims=True)
        stds = np.std(subseqs, axis=1, keepdims=True)
        stds[stds <= 1e-10] = 1.0
        norm_subseqs = (subseqs - means) / stds

        mp = np.full(k, np.inf, dtype=np.float64)
        ex = m // 2
        for i in range(k):
            target = norm_subseqs[i]
            diffs = norm_subseqs - target
            dists = np.sqrt(np.sum(diffs ** 2, axis=1))
            low_ex = max(0, i - ex)
            high_ex = min(k, i + ex + 1)
            dists[low_ex:high_ex] = np.inf
            mp[i] = float(np.min(dists))
        return mp


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
    exclude_variance_shifts: bool = True,
) -> DiscordResult:
    """
    Compute 1-NN Matrix Profile distance using STOMP and extract top-k anomalous discords.
    Optionally masks pure volatility / variance regimes so that structural waveform discords
    are not eclipsed by Gaussian noise bursts.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    m = int(window_size)
    if n < 2 * m:
        raise ValidationError(f"Signal length ({n}) must be at least twice window size ({2 * m}).")

    k_subseqs = n - m + 1
    mp = _stomp_numba(x, m)

    # Ranking vector
    mp_ranked = mp.copy()
    if exclude_variance_shifts and n >= 500:
        shifts = detect_variance_shifts(x)
        for s in shifts:
            if s.is_significant and s.variance_ratio >= 2.0:
                low = max(0, s.start_index - m)
                high = min(k_subseqs, s.end_index + m)
                mp_ranked[low:high] = 0.0

    # Top-k discords have the largest 1-NN distances
    exclusion_zone = m
    sorted_candidates = np.argsort(mp_ranked)[::-1]
    selected_discords: List[int] = []
    selected_dists: List[float] = []

    for idx in sorted_candidates:
        if mp_ranked[idx] <= 0.0 or mp[idx] >= 1e8:
            continue
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
