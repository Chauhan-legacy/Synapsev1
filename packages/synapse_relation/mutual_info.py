"""
Mutual Information Estimation for SYNAPSE RELATION.
Computes non-parametric Shannon Mutual Information I(X; Y) to capture linear and non-linear dependencies.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
from scipy.special import digamma
from scipy.spatial import KDTree

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class MutualInfoResult:
    mutual_information_bits: float
    normalized_mutual_information: float # in [0, 1]
    k_nearest_neighbors: int


def compute_mutual_information_ksg(
    channel_x: np.ndarray,
    channel_y: np.ndarray,
    k_neighbors: int = 4,
) -> MutualInfoResult:
    """
    Compute Kraskov-Stögbauer-Grassberger (KSG 2004) Model 1 Mutual Information estimator.
    I(X; Y) = psi(k) - <psi(n_x + 1) + psi(n_y + 1)> + psi(N)
    """
    x = np.asarray(channel_x, dtype=np.float64)
    y = np.asarray(channel_y, dtype=np.float64)
    n = len(x)
    if len(y) != n:
        raise ValidationError("Channels must have identical length for Mutual Information.")
    if n < 16:
        raise ValidationError("Need at least 16 samples for Mutual Information.")

    k = int(k_neighbors)
    if k >= n:
        k = max(1, n // 4)

    # Standardize inputs to prevent numerical scale distortion
    x_std = (x - np.mean(x)) / (np.std(x) or 1.0)
    y_std = (y - np.mean(y)) / (np.std(y) or 1.0)

    # Add minute jitter to break identical ties
    rng = np.random.default_rng(42)
    x_std += rng.normal(0, 1e-10, size=n)
    y_std += rng.normal(0, 1e-10, size=n)

    xy = np.column_stack([x_std, y_std])
    tree_xy = KDTree(xy)
    tree_x = KDTree(x_std[:, np.newaxis])
    tree_y = KDTree(y_std[:, np.newaxis])

    # Find k-th nearest neighbor distance in maximum norm (L_inf)
    # k+1 because query point itself is returned at distance 0
    dists, _ = tree_xy.query(xy, k=k + 1, p=np.inf)
    eps = dists[:, -1]

    # Count points strictly within epsilon distance in marginal spaces
    # eps - 1e-15 to ensure strict inequality as per Kraskov definition
    eps_strict = np.maximum(1e-12, eps - 1e-14)

    nx = np.array([len(tree_x.query_ball_point([x_std[i]], r=eps_strict[i], p=np.inf)) - 1 for i in range(n)])
    ny = np.array([len(tree_y.query_ball_point([y_std[i]], r=eps_strict[i], p=np.inf)) - 1 for i in range(n)])

    # Digamma terms
    # I = digamma(k) - mean(digamma(nx + 1) + digamma(ny + 1)) + digamma(N)
    mi_nats = digamma(k) - np.mean(digamma(nx + 1) + digamma(ny + 1)) + digamma(n)
    mi_bits = max(0.0, float(mi_nats / np.log(2.0)))

    # Normalized Mutual Information: NMI = sqrt(1 - exp(-2 * I))
    nmi = float(np.sqrt(1.0 - np.exp(-2.0 * mi_nats))) if mi_nats >= 0 else 0.0

    return MutualInfoResult(
        mutual_information_bits=mi_bits,
        normalized_mutual_information=min(1.0, max(0.0, nmi)),
        k_nearest_neighbors=k,
    )

