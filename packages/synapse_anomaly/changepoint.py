"""
Change-Point Detection for SYNAPSE ANOMALY.
Locates structural regime shifts, variance shifts, and behavioral transitions.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List, Tuple
import numpy as np


@dataclass(frozen=True)
class ChangePoint:
    index: int
    timestamp: float
    confidence_score: float
    pre_mean: float
    post_mean: float
    pre_std: float
    post_std: float
    method: str = "cumulative_sum_deviation"


def detect_change_points(
    values: np.ndarray,
    timestamps: np.ndarray,
    min_distance: int = 10,
    sensitivity: float = 3.0,
) -> List[ChangePoint]:
    """
    Detect abrupt change points using cumulative sum of mean deviations.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    if n < (2 * min_distance):
        return []

    mean_total = np.mean(x)
    cusum = np.cumsum(x - mean_total)
    
    # Range of CUSUM
    s_diff = np.max(cusum) - np.min(cusum)
    std_total = np.std(x)
    if std_total <= 1e-12:
        return []

    threshold = sensitivity * std_total * np.sqrt(n)
    if s_diff < threshold:
        return []

    # Identify primary candidate at maximum absolute cumulative deviation
    best_idx = int(np.argmax(np.abs(cusum)))
    
    # Boundary guard
    if best_idx < min_distance or best_idx > (n - min_distance):
        return []

    pre_slice = x[:best_idx]
    post_slice = x[best_idx:]

    pre_m, pre_s = float(np.mean(pre_slice)), float(np.std(pre_slice))
    post_m, post_s = float(np.mean(post_slice)), float(np.std(post_slice))

    score = float(min(1.0, s_diff / (threshold + 1e-12)))

    cp = ChangePoint(
        index=best_idx,
        timestamp=float(timestamps[best_idx]),
        confidence_score=score,
        pre_mean=pre_m,
        post_mean=post_m,
        pre_std=pre_s,
        post_std=post_s,
    )
    return [cp]

