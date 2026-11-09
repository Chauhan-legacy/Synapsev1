import pytest
import numpy as np

from synapse_anomaly.zscore import compute_robust_zscore
from synapse_anomaly.changepoint import detect_change_points
from synapse_anomaly.cusum import compute_cusum
from synapse_anomaly.isolation_forest import compute_isolation_forest_anomalies


def test_robust_zscore_transient_detection():
    rng = np.random.default_rng(42)
    n = 200
    t = np.linspace(0, 2, n)
    vals = rng.normal(0, 0.2, size=n)

    # Inject transient spike at index 100
    vals[100] = 5.0

    z_scores, events, med, mad = compute_robust_zscore(vals, t, threshold=3.5)

    assert len(events) >= 1
    found = any(ev.start_index <= 100 <= ev.end_index for ev in events)
    assert found is True
    assert pytest.approx(events[0].peak_magnitude, rel=1e-3) == 5.0


def test_changepoint_detection():
    n = 300
    t = np.linspace(0, 3, n)
    # Mean shift from 0 to 4.0 at index 150
    vals = np.concatenate([np.random.normal(0, 0.2, 150), np.random.normal(4.0, 0.2, 150)])

    cps = detect_change_points(vals, t, min_distance=20)
    assert len(cps) == 1
    assert abs(cps[0].index - 150) <= 5


def test_isolation_forest():
    vals = np.random.normal(0, 1, 100)
    vals[50] = 20.0
    res = compute_isolation_forest_anomalies(vals, contamination=0.03)

    assert res.total_anomalies_detected > 0
    assert res.is_anomaly[50] == True

