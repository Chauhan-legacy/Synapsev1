import pytest
import numpy as np

from synapse_relation.correlation import compute_multichannel_correlations, compute_cross_correlation
from synapse_relation.coherence import compute_spectral_coherence
from synapse_relation.pca import compute_multichannel_pca, compute_mutual_information


def test_multichannel_correlations():
    t = np.linspace(0, 1, 200)
    c1 = np.sin(2 * np.pi * 5 * t)
    c2 = c1 + np.random.normal(0, 0.05, 200)
    c3 = np.cos(2 * np.pi * 5 * t)

    vals = np.column_stack([c1, c2, c3])
    pearson, spearman = compute_multichannel_correlations(vals)

    # c1 and c2 should have high correlation
    assert pearson[0, 1] > 0.95
    # c1 and c3 (sine and cosine over full cycles) should have near zero correlation
    assert abs(pearson[0, 2]) < 0.1


def test_cross_correlation_time_lag():
    fs = 100.0
    t = np.arange(200) / fs
    # Pulse centered at t=0.5s for x, and t=0.6s for y (true lag = 0.10s)
    x = np.exp(-((t - 0.5) ** 2) / 0.005)
    y = np.exp(-((t - 0.6) ** 2) / 0.005)

    res = compute_cross_correlation(x, y, sampling_rate=fs)
    assert abs(res.peak_lag_sec) == pytest.approx(0.10, abs=0.01)


def test_pca():
    x = np.random.normal(0, 1, (100, 3))
    res = compute_multichannel_pca(x)
    assert len(res.explained_variance_ratio) == 3
    assert pytest.approx(float(np.sum(res.explained_variance_ratio)), rel=1e-3) == 1.0
