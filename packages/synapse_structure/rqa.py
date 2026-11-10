"""
Recurrence Quantification Analysis (RQA) for SYNAPSE STRUCTURE.
Extracts nonlinear dynamical complexity metrics: Recurrence Rate (RR), Determinism (DET),
Laminarity (LAM), and Diagonal Line Entropy (ENTR) from thresholded recurrence matrices.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
from scipy.spatial.distance import pdist, squareform

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class RQAResult:
    recurrence_rate: float             # RR %
    determinism: float                 # DET %
    laminarity: float                  # LAM %
    diagonal_entropy: float            # ENTR (Shannon entropy of diagonal line lengths)
    average_diagonal_length: float     # L_mean
    trapping_time: float               # TT (average vertical line length)
    recurrence_matrix_binary: np.ndarray # Binary thresholded matrix R
    epsilon_threshold: float
    embedding_dimension: int
    embedding_delay: int


def compute_rqa(
    values: np.ndarray,
    dimension: int = 3,
    delay: int = 1,
    threshold_pct_std: float = 0.20,
    l_min: int = 2,
    v_min: int = 2,
) -> RQAResult:
    """
    Compute full Recurrence Quantification Analysis (RQA) on embedded phase space.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    m = int(dimension)
    tau = int(delay)

    n_vectors = n - (m - 1) * tau
    if n_vectors < 16:
        raise ValidationError("Insufficient points for embedded RQA.")

    # Subsample if too large to prevent N^2 memory exhaustion
    max_pts = 400
    if n_vectors > max_pts:
        step = int(np.ceil(n_vectors / max_pts))
        indices = np.arange(0, n_vectors, step)
    else:
        indices = np.arange(n_vectors)

    # State space trajectory Y: shape (len(indices), m)
    Y = np.column_stack([x[indices + k * tau] for k in range(m)])
    k_pts = len(Y)

    # Pairwise Euclidean distance matrix
    dists = squareform(pdist(Y, metric="euclidean"))

    # Threshold epsilon = 20% of standard deviation of distances
    eps = float(threshold_pct_std * (np.std(x) or 1.0))
    R = (dists <= eps).astype(int)

    # 1. Recurrence Rate (RR): fraction of recurrence points off the main diagonal
    n_off_diag = k_pts * (k_pts - 1)
    recurrence_count = int(np.sum(R) - k_pts) # subtract main diagonal
    rr = float((recurrence_count / max(1, n_off_diag)) * 100.0)

    # 2. Diagonal Lines Analysis (Determinism & Entropy)
    diag_lengths: List[int] = []
    for d in range(1, k_pts - 1):
        # Extract diagonal elements at offset d
        diag = np.diagonal(R, offset=d)
        cur_len = 0
        for val in diag:
            if val == 1:
                cur_len += 1
            else:
                if cur_len >= l_min:
                    diag_lengths.append(cur_len)
                cur_len = 0
        if cur_len >= l_min:
            diag_lengths.append(cur_len)

    # DET = sum_{l >= l_min} l * P(l) / sum_{l >= 1} l * P(l)
    total_diag_points = sum(diag_lengths) if diag_lengths else 0
    det = float((2 * total_diag_points / max(1, recurrence_count)) * 100.0)
    det = min(100.0, max(0.0, det))

    # Diagonal Line Entropy ENTR
    if diag_lengths:
        counts = np.bincount(diag_lengths)
        probs = counts[counts > 0] / float(len(diag_lengths))
        entr = float(-np.sum(probs * np.log2(probs)))
        l_mean = float(np.mean(diag_lengths))
    else:
        entr = 0.0
        l_mean = 0.0

    # 3. Vertical Lines Analysis (Laminarity & Trapping Time)
    vert_lengths: List[int] = []
    for col in range(k_pts):
        v_col = R[:, col]
        cur_len = 0
        for val in v_col:
            if val == 1:
                cur_len += 1
            else:
                if cur_len >= v_min:
                    vert_lengths.append(cur_len)
                cur_len = 0
        if cur_len >= v_min:
            vert_lengths.append(cur_len)

    total_vert_points = sum(vert_lengths) if vert_lengths else 0
    lam = float((total_vert_points / max(1, np.sum(R))) * 100.0)
    lam = min(100.0, max(0.0, lam))
    tt = float(np.mean(vert_lengths)) if vert_lengths else 0.0

    return RQAResult(
        recurrence_rate=rr,
        determinism=det,
        laminarity=lam,
        diagonal_entropy=entr,
        average_diagonal_length=l_mean,
        trapping_time=tt,
        recurrence_matrix_binary=R,
        epsilon_threshold=eps,
        embedding_dimension=m,
        embedding_delay=tau,
    )

