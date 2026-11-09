"""
Recurrence Analysis for SYNAPSE STRUCTURE.
Calculates Recurrence Plots and Recurrence Quantification Analysis (RQA) metrics:
Recurrence Rate (RR) and Determinism (DET).
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional
import numpy as np


@dataclass(frozen=True)
class RecurrenceResult:
    recurrence_matrix: np.ndarray      # 2D boolean array (n, n)
    recurrence_rate: float            # Density of recurrence points
    determinism: float                # Percentage of recurrence points in diagonal lines
    threshold_epsilon: float


def compute_recurrence_matrix(
    values: np.ndarray,
    threshold_epsilon: Optional[float] = None,
    subsample_max: int = 400,
) -> RecurrenceResult:
    """
    Compute binary recurrence matrix: R[i, j] = 1 if ||x_i - x_j|| <= epsilon else 0.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    if n > subsample_max:
        # Decimate for quadratic memory protection
        step = int(np.ceil(n / subsample_max))
        x = x[::step]
        n = len(x)

    diff = np.abs(x[:, None] - x[None, :])
    eps = threshold_epsilon if threshold_epsilon is not None else float(0.1 * np.std(x))
    if eps <= 1e-12:
        eps = 1e-3

    rec_mat = (diff <= eps)

    # Recurrence Rate (RR)
    rr = float(np.sum(rec_mat)) / (n * n)

    # Determinism (DET): diagonal line structures of length >= 2
    diag_points = 0
    total_rec_points = float(np.sum(rec_mat))
    for k in range(1, n):
        diag = np.diag(rec_mat, k=k)
        # Count consecutive ones of length >= 2
        run = 0
        for val in diag:
            if val:
                run += 1
            else:
                if run >= 2:
                    diag_points += run * 2  # account for symmetry k and -k
                run = 0
        if run >= 2:
            diag_points += run * 2

    det = float(diag_points / total_rec_points) if total_rec_points > 0 else 0.0
    det = min(1.0, max(0.0, det))

    rec_mat.flags.writeable = False

    return RecurrenceResult(
        recurrence_matrix=rec_mat,
        recurrence_rate=rr,
        determinism=det,
        threshold_epsilon=eps,
    )

