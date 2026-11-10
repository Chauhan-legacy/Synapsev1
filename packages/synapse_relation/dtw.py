"""
Dynamic Time Warping (DTW) for SYNAPSE RELATION.
Aligns two non-stationary sequences with non-linear temporal warping and outputs the optimal path.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class DTWResult:
    total_cost: float
    normalized_distance: float
    warping_path_x: Tuple[int, ...]
    warping_path_y: Tuple[int, ...]
    cost_matrix: np.ndarray


def compute_dynamic_time_warping(
    channel_x: np.ndarray,
    channel_y: np.ndarray,
    max_length: int = 400,
) -> DTWResult:
    """
    Compute Dynamic Time Warping distance and optimal warping alignment path.
    """
    x = np.asarray(channel_x, dtype=np.float64)
    y = np.asarray(channel_y, dtype=np.float64)

    # Subsample if long to ensure fast O(N*M) response
    if len(x) > max_length:
        step_x = int(np.ceil(len(x) / max_length))
        x = x[::step_x]
    if len(y) > max_length:
        step_y = int(np.ceil(len(y) / max_length))
        y = y[::step_y]

    nx = len(x)
    ny = len(y)

    # Standardize inputs
    x_std = (x - np.mean(x)) / (np.std(x) or 1.0)
    y_std = (y - np.mean(y)) / (np.std(y) or 1.0)

    # Cost matrix D: shape (nx + 1, ny + 1)
    D = np.full((nx + 1, ny + 1), np.inf, dtype=np.float64)
    D[0, 0] = 0.0

    # Local pairwise Euclidean distance: |x_i - y_j|
    dist_mat = np.abs(x_std[:, np.newaxis] - y_std[np.newaxis, :])

    # Dynamic programming forward pass
    for i in range(1, nx + 1):
        for j in range(1, ny + 1):
            cost = dist_mat[i - 1, j - 1]
            D[i, j] = cost + min(D[i - 1, j], D[i, j - 1], D[i - 1, j - 1])

    # Backtrack optimal alignment path from (nx, ny) to (1, 1)
    path_x: List[int] = []
    path_y: List[int] = []

    curr_i = nx
    curr_j = ny

    while curr_i > 0 and curr_j > 0:
        path_x.append(curr_i - 1)
        path_y.append(curr_j - 1)

        choices = [
            (D[curr_i - 1, curr_j - 1], curr_i - 1, curr_j - 1),
            (D[curr_i - 1, curr_j], curr_i - 1, curr_j),
            (D[curr_i, curr_j - 1], curr_i, curr_j - 1),
        ]
        choices.sort(key=lambda item: item[0])
        _, curr_i, curr_j = choices[0]

    path_x.reverse()
    path_y.reverse()

    total_cost = float(D[nx, ny])
    norm_dist = float(total_cost / max(1, len(path_x)))

    return DTWResult(
        total_cost=total_cost,
        normalized_distance=norm_dist,
        warping_path_x=tuple(path_x),
        warping_path_y=tuple(path_y),
        cost_matrix=D[1:, 1:],
    )

