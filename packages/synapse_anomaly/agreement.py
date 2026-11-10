"""
Multi-Method Anomaly and Changepoint Agreement Matrix for SYNAPSE ANOMALY.
Aggregates detections across diverse parametric, non-parametric, and machine-learning detectors,
reporting method consensus counts and pairwise Jaccard agreement matrices.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List, Set
import numpy as np


@dataclass(frozen=True)
class ConsensusEvent:
    center_time: float
    center_index: int
    agreement_count: int
    methods_agreeing: Tuple[str, ...]
    average_magnitude: float


@dataclass(frozen=True)
class AgreementMatrixResult:
    consensus_events: Tuple[ConsensusEvent, ...]
    method_names: Tuple[str, ...]
    pairwise_agreement_matrix: np.ndarray # Shape (M, M) with Jaccard overlap indices


def compute_method_agreement(
    detections_by_method: Dict[str, List[int]],
    timestamps: np.ndarray,
    values: np.ndarray,
    tolerance_bins: int = 5,
) -> AgreementMatrixResult:
    """
    Cluster detections across different methods and compute consensus events and overlap matrix.
    """
    t = np.asarray(timestamps, dtype=np.float64)
    x = np.asarray(values, dtype=np.float64)
    methods = list(detections_by_method.keys())
    m_count = len(methods)

    # 1. Cluster all detections within tolerance_bins
    all_points = []
    for method, indices in detections_by_method.items():
        for idx in indices:
            all_points.append((idx, method))

    all_points.sort(key=lambda p: p[0])

    clusters: List[List[Tuple[int, str]]] = []
    for pt in all_points:
        if not clusters:
            clusters.append([pt])
        else:
            # Check distance to current cluster center
            cluster_center = np.mean([p[0] for p in clusters[-1]])
            if abs(pt[0] - cluster_center) <= tolerance_bins:
                clusters[-1].append(pt)
            else:
                clusters.append([pt])

    consensus_list: List[ConsensusEvent] = []
    for cl in clusters:
        indices = [p[0] for p in cl]
        agreeing_methods = tuple(sorted(list(set(p[1] for p in cl))))
        center_idx = int(round(np.mean(indices)))
        if center_idx < len(t):
            time_val = float(t[center_idx])
            mag_val = float(np.mean([x[idx] for idx in indices if idx < len(x)]))
            consensus_list.append(
                ConsensusEvent(
                    center_time=time_val,
                    center_index=center_idx,
                    agreement_count=len(agreeing_methods),
                    methods_agreeing=agreeing_methods,
                    average_magnitude=mag_val,
                )
            )

    # 2. Pairwise Jaccard overlap matrix: |A cap B| / |A cup B|
    # Convert each method's indices into a dilated binary mask
    n = len(t)
    masks: Dict[str, np.ndarray] = {}
    for m in methods:
        mask = np.zeros(n, dtype=bool)
        for idx in detections_by_method[m]:
            low = max(0, idx - tolerance_bins)
            high = min(n, idx + tolerance_bins + 1)
            mask[low:high] = True
        masks[m] = mask

    jaccard_mat = np.zeros((m_count, m_count), dtype=np.float64)
    for i in range(m_count):
        for j in range(m_count):
            m1 = methods[i]
            m2 = methods[j]
            intersection = np.sum(masks[m1] & masks[m2])
            union = np.sum(masks[m1] | masks[m2])
            jaccard_mat[i, j] = float(intersection / union) if union > 0 else 1.0

    return AgreementMatrixResult(
        consensus_events=tuple(consensus_list),
        method_names=tuple(methods),
        pairwise_agreement_matrix=jaccard_mat,
    )

