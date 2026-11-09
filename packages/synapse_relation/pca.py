"""
Mutual Information and Principal Component Analysis for SYNAPSE RELATION.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, List, Optional
import numpy as np


@dataclass(frozen=True)
class PCAResult:
    explained_variance_ratio: np.ndarray   # Variance explained by each PC
    components: np.ndarray                 # Principal component vectors (C, C)
    transformed_values: np.ndarray         # Project signal onto PCs (N, C)


def compute_mutual_information(
    x_in: np.ndarray,
    y_in: np.ndarray,
    bins: int = 20,
) -> float:
    """
    Compute Mutual Information I(X; Y) between two continuous channels using 2D histogram binning.
    I(X; Y) = sum(p(x,y) * log2(p(x,y) / (p(x) * p(y))))
    """
    x = np.asarray(x_in, dtype=np.float64)
    y = np.asarray(y_in, dtype=np.float64)

    # 2D joint histogram
    p_xy, _, _ = np.histogram2d(x, y, bins=bins, density=True)
    # Convert density to probability
    p_xy = p_xy / np.sum(p_xy)

    # Marginals
    p_x = np.sum(p_xy, axis=1)
    p_y = np.sum(p_xy, axis=0)

    # Outer product of marginals
    p_x_p_y = p_x[:, None] * p_y[None, :]

    # Non-zero mask
    mask = (p_xy > 0) & (p_x_p_y > 0)
    mi = float(np.sum(p_xy[mask] * np.log2(p_xy[mask] / p_x_p_y[mask])))
    return max(0.0, mi)


def compute_multichannel_pca(values: np.ndarray) -> PCAResult:
    """
    Compute PCA on multichannel array (N, C) via Singular Value Decomposition.
    """
    x = np.asarray(values, dtype=np.float64)
    if x.ndim != 2:
        raise ValueError("PCA requires 2D array (N, C).")

    n, c = x.shape
    # Center data
    mean_vec = np.mean(x, axis=0)
    x_centered = x - mean_vec

    # SVD
    u, s, vt = np.linalg.svd(x_centered, full_matrices=False)
    # Explained variance
    explained_var = (s**2) / (n - 1)
    total_var = np.sum(explained_var)
    var_ratio = (explained_var / total_var) if total_var > 0 else np.zeros_like(explained_var)

    # Projected coordinates
    projected = x_centered @ vt.T

    var_ratio.flags.writeable = False
    vt.flags.writeable = False
    projected.flags.writeable = False

    return PCAResult(
        explained_variance_ratio=var_ratio,
        components=vt,
        transformed_values=projected,
    )

