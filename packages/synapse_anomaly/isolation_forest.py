"""
Isolation Forest Machine Learning Anomaly Detection for SYNAPSE ANOMALY.
Provides non-parametric multi-feature and point anomaly scoring.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple
import numpy as np
from sklearn.ensemble import IsolationForest

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class IsolationForestResult:
    anomaly_scores: np.ndarray      # Continuous score where negative indicates anomaly
    is_anomaly: np.ndarray          # Boolean mask of detected anomalies
    contamination_rate: float
    total_anomalies_detected: int


def compute_isolation_forest_anomalies(
    values: np.ndarray,
    contamination: float = 0.02,
    random_state: int = 42,
) -> IsolationForestResult:
    """
    Run Isolation Forest to detect point anomalies.
    Accepts 1D or 2D values.
    """
    x = np.asarray(values, dtype=np.float64)
    if x.ndim == 1:
        x_in = x.reshape(-1, 1)
    elif x.ndim == 2:
        x_in = x
    else:
        raise ValidationError(f"Expected 1D or 2D array, got shape {x.shape}.")

    if len(x_in) < 10:
        raise ValidationError("Isolation forest requires at least 10 samples.")

    clf = IsolationForest(
        contamination=contamination,
        random_state=random_state,
        n_estimators=100,
    )
    clf.fit(x_in)

    # decision_function gives score (lower = more abnormal)
    scores = clf.decision_function(x_in)
    preds = clf.predict(x_in)  # -1 for anomaly, 1 for inlier
    is_anom = (preds == -1)

    scores.flags.writeable = False
    is_anom.flags.writeable = False

    return IsolationForestResult(
        anomaly_scores=scores,
        is_anomaly=is_anom,
        contamination_rate=contamination,
        total_anomalies_detected=int(is_anom.sum()),
    )

