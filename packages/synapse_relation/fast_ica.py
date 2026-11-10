"""
Fast Independent Component Analysis (FastICA) for SYNAPSE RELATION.
Separates mixed multichannel signals into statistically independent non-Gaussian sources.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
from sklearn.decomposition import FastICA

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class FastICAResult:
    sources: np.ndarray                 # Independent components shape (n_samples, n_components)
    mixing_matrix: np.ndarray           # Mixing matrix A shape (n_channels, n_components)
    unmixing_matrix: np.ndarray         # Unmixing matrix W shape (n_components, n_channels)
    component_kurtosis: Tuple[float, ...] # Non-Gaussianity metric for each component
    n_components: int


def compute_fast_ica(
    multichannel_data: np.ndarray,
    n_components: Optional[int] = None,
    random_state: int = 42,
) -> FastICAResult:
    """
    Execute FastICA to separate non-Gaussian independent sources.
    multichannel_data has shape (n_samples, n_channels).
    """
    X = np.asarray(multichannel_data, dtype=np.float64)
    if X.ndim != 2:
        raise ValidationError(f"compute_fast_ica expects 2D array, got shape {X.shape}.")

    n_samples, n_channels = X.shape
    if n_channels < 2:
        raise ValidationError("Need at least 2 channels for Independent Component Analysis.")

    k = int(n_components) if n_components is not None else n_channels
    k = min(k, n_channels, n_samples)

    ica = FastICA(n_components=k, random_state=random_state, max_iter=500, tol=1e-4)
    sources = ica.fit_transform(X) # shape (n_samples, k)

    # Calculate excess kurtosis for each source to verify non-Gaussianity
    kurt_list = []
    for comp in range(k):
        s = sources[:, comp]
        s_std = (s - np.mean(s)) / (np.std(s) or 1.0)
        kurt = float(np.mean(s_std ** 4) - 3.0)
        kurt_list.append(kurt)

    mixing_mat = ica.mixing_ if hasattr(ica, "mixing_") else np.eye(n_channels, k)
    unmixing_mat = ica.components_ if hasattr(ica, "components_") else np.eye(k, n_channels)

    return FastICAResult(
        sources=sources,
        mixing_matrix=mixing_mat,
        unmixing_matrix=unmixing_mat,
        component_kurtosis=tuple(kurt_list),
        n_components=k,
    )
