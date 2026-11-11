"""
Ground-Truth Benchmark Suite: Relation & Coupling Engine.
Validates Granger causality unidirectional recovery, false-alarm calibration on noise, and spectral coherence.
"""

import numpy as np
import pytest
from synapse_relation.granger import compute_granger_causality
from synapse_relation.coherence import compute_spectral_coherence


def test_gt_granger_causality_unidirectional_recovery():
    """Verify Granger causality detects true driving relationship X -> Y and rejects reverse Y -> X."""
    rng = np.random.default_rng(606)
    N = 500
    x = np.zeros(N)
    y = np.zeros(N)

    # X is an AR(1) process; Y is driven by X(t-1)
    for t in range(1, N):
        x[t] = 0.5 * x[t - 1] + rng.normal(0, 0.5)
        y[t] = 0.4 * y[t - 1] + 0.6 * x[t - 1] + rng.normal(0, 0.5)

    res = compute_granger_causality(x, y, max_lag=3)
    assert res.x_causes_y.is_significant, f"X->Y failed detection: p={res.x_causes_y.p_value}"
    assert not res.y_causes_x.is_significant, f"Y->X false alarm: p={res.y_causes_x.p_value}"


def test_gt_granger_causality_false_link_rate_on_independent_noise():
    """Verify false-link rate on unrelated independent Gaussian noise stays <= 5% nominal alpha."""
    rng = np.random.default_rng(707)
    N = 400
    n_trials = 40
    false_links = 0

    for _ in range(n_trials):
        x = rng.normal(0, 1.0, N)
        y = rng.normal(0, 1.0, N)
        res = compute_granger_causality(x, y, max_lag=2)
        if res.x_causes_y.is_significant or res.y_causes_x.is_significant:
            false_links += 1

    rate = false_links / n_trials
    assert rate <= 0.05, f"False-link rate {rate:.2%} exceeded nominal 5% rate"


def test_gt_spectral_coherence_shared_tone_in_noise():
    """Verify magnitude-squared coherence isolates a shared 30 Hz tone in independent noise."""
    fs = 200.0
    N = 1000
    t = np.arange(N) / fs
    rng = np.random.default_rng(808)

    ch1 = np.sin(2 * np.pi * 30.0 * t) + rng.normal(0, 1.5, N)
    ch2 = np.sin(2 * np.pi * 30.0 * t) + rng.normal(0, 1.5, N)

    res = compute_spectral_coherence(ch1, ch2, sampling_rate=fs, n_perseg=128)
    assert abs(res.peak_frequency_hz - 30.0) <= 2.0, f"Coherence peak {res.peak_frequency_hz} Hz != 30 Hz"
    assert res.peak_coherence > res.significance_threshold_95, "Peak coherence did not exceed Carter threshold"
