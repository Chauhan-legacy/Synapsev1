import pytest
import numpy as np

from synapse_inference.surrogates import generate_ft_surrogates, evaluate_surrogate_significance
from synapse_inference.multiple_testing import benjamini_hochberg_fdr, bootstrap_confidence_interval


def test_ft_surrogates():
    t = np.linspace(0, 1, 256)
    sig = np.sin(2 * np.pi * 10 * t)
    surrs = generate_ft_surrogates(sig, n_surrogates=10)

    assert len(surrs) == 10
    # Power spectrum magnitude of surrogates must equal original signal
    fft_orig = np.abs(np.fft.rfft(sig))
    for s in surrs:
        fft_s = np.abs(np.fft.rfft(s))
        assert np.max(np.abs(fft_orig - fft_s)) < 1e-10


def test_benjamini_hochberg():
    p_vals = [0.001, 0.004, 0.012, 0.045, 0.15, 0.85]
    adj_p, reject = benjamini_hochberg_fdr(p_vals, alpha=0.05)

    assert len(adj_p) == len(p_vals)
    # Smallest p-values should be rejected
    assert reject[0] is True
    assert reject[-1] is False


def test_bootstrap_ci():
    rng = np.random.default_rng(42)
    vals = rng.normal(10.0, 2.0, size=200)

    low, mean_val, high = bootstrap_confidence_interval(vals, np.mean, n_resamples=100)
    assert low < mean_val < high
    assert pytest.approx(mean_val, abs=0.5) == 10.0
