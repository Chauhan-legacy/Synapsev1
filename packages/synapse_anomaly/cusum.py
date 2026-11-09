"""
Cumulative Sum (CUSUM) Control Chart for SYNAPSE ANOMALY.
Detects small, persistent shifts in signal mean level.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List, Tuple
import numpy as np


@dataclass(frozen=True)
class CUSUMResult:
    pos_sum: np.ndarray
    neg_sum: np.ndarray
    change_indices: Tuple[int, ...]
    slack_parameter_k: float
    decision_threshold_h: float


def compute_cusum(
    values: np.ndarray,
    target_mean: float | None = None,
    slack_k: float | None = None,
    threshold_h: float = 5.0,
) -> CUSUMResult:
    """
    Two-sided CUSUM algorithm for detecting mean changes.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    if n < 4:
        raise ValueError("Signal too short for CUSUM.")

    mu = target_mean if target_mean is not None else float(np.median(x))
    sigma = float(np.std(x))
    if sigma <= 1e-12:
        sigma = 1.0

    k = slack_k if slack_k is not None else (0.5 * sigma)
    h = threshold_h * sigma

    s_pos = np.zeros(n, dtype=np.float64)
    s_neg = np.zeros(n, dtype=np.float64)
    changes: List[int] = []

    for i in range(1, n):
        dev = x[i] - mu
        s_pos[i] = max(0.0, s_pos[i - 1] + dev - k)
        s_neg[i] = max(0.0, s_neg[i - 1] - dev - k)

        if s_pos[i] >= h or s_neg[i] >= h:
            changes.append(i)
            # Reset after alarm to detect subsequent shifts
            s_pos[i] = 0.0
            s_neg[i] = 0.0

    s_pos.flags.writeable = False
    s_neg.flags.writeable = False

    return CUSUMResult(
        pos_sum=s_pos,
        neg_sum=s_neg,
        change_indices=tuple(changes),
        slack_parameter_k=k,
        decision_threshold_h=h,
    )

