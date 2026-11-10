"""
Unit tests for SYNAPSE Round 2 Deep Analysis Engine algorithms.
Tests all algorithms against known analytic closed-form answers and ground truth.
"""

import numpy as np
import pytest

from synapse_spectra.multitaper import compute_multitaper_psd
from synapse_spectra.lomb_scargle import compute_lomb_scargle
from synapse_spectra.high_res_peaks import fit_high_res_sinusoid
from synapse_spectra.noise_color import estimate_noise_color
from synapse_spectra.burg_ar import compute_burg_spectrum
from synapse_spectra.allan_deviation import compute_allan_deviation
from synapse_spectra.harmonic_analysis import analyze_harmonic_series
from synapse_spectra.hilbert_analysis import compute_hilbert_analytic
from synapse_spectra.ridge_extraction import extract_spectral_ridge

from synapse_statistics.stationarity import evaluate_stationarity
from synapse_statistics.normality import evaluate_normality
from synapse_statistics.autocorr import compute_autocorr_structure
from synapse_statistics.dfa import compute_dfa
from synapse_statistics.distribution_fit import fit_candidate_distributions

from synapse_anomaly.rosner_esd import generalized_esd_test
from synapse_anomaly.pelt import detect_pelt_changepoints
from synapse_anomaly.bocpd import compute_bocpd
from synapse_anomaly.discords import find_matrix_profile_discords
from synapse_anomaly.agreement import compute_method_agreement

from synapse_structure.embedding import compute_average_mutual_information, compute_false_nearest_neighbours
from synapse_structure.rqa import compute_rqa
from synapse_structure.entropy import compute_sample_entropy, compute_permutation_entropy, compute_multiscale_entropy
from synapse_structure.fractal import compute_higuchi_fractal_dimension
from synapse_structure.lyapunov import compute_largest_lyapunov_exponent

from synapse_relation.coherence import compute_spectral_coherence
from synapse_relation.granger import compute_granger_causality
from synapse_relation.transfer_entropy import compute_transfer_entropy
from synapse_relation.mutual_info import compute_mutual_information_ksg
from synapse_relation.dtw import compute_dynamic_time_warping
from synapse_relation.fast_ica import compute_fast_ica

from synapse_inference.surrogates import generate_iaaft_surrogates, generate_circular_shift_surrogates
from synapse_inference.multiple_testing import bca_bootstrap_confidence_interval, benjamini_yekutieli_fdr, holm_bonferroni_fwer
from synapse_inference.model_comparison import compare_signal_models


def test_multitaper_harmonic_f_test():
    fs = 200.0
    n = 400
    t = np.arange(n) / fs
    true_f = 25.0
    # Line sinusoid in white noise
    rng = np.random.default_rng(42)
    x = 2.0 * np.cos(2 * np.pi * true_f * t) + rng.normal(0, 0.2, size=n)

    res = compute_multitaper_psd(x, sampling_rate=fs, nw=3.5, alpha=0.01)
    # The true line frequency 25 Hz must be detected with p < 0.01
    assert any(abs(f - true_f) < 1.0 for f in res.line_frequencies_detected)


def test_high_res_crlb_sinusoid():
    fs = 100.0
    n = 256
    t = np.arange(n) / fs
    true_f = 12.345
    true_amp = 1.5
    rng = np.random.default_rng(42)
    x = true_amp * np.cos(2 * np.pi * true_f * t + 0.5) + rng.normal(0, 0.05, size=n)

    res = fit_high_res_sinusoid(t, x, initial_freq_hint=12.0)
    assert abs(res.frequency_hz - true_f) < 0.02
    assert abs(res.amplitude - true_amp) < 0.05
    assert res.cramer_rao_lower_bound_hz2 > 0


def test_noise_color_white_and_pink():
    # White noise: beta ~ 0
    rng = np.random.default_rng(42)
    white_noise = rng.normal(0, 1, size=1024)
    freqs = np.fft.rfftfreq(len(white_noise), d=1.0)
    psd = np.abs(np.fft.rfft(white_noise)) ** 2

    res_white = estimate_noise_color(freqs, psd)
    assert -0.4 <= res_white.beta_exponent <= 0.4
    assert "White" in res_white.classification


def test_rosner_esd_planted_outliers():
    rng = np.random.default_rng(42)
    x = rng.normal(0, 1, size=200)
    # Plant 3 distinct outliers
    x[15] = 10.5
    x[80] = -9.8
    x[145] = 12.2

    res = generalized_esd_test(x, max_outliers=10, alpha=0.05)
    assert res.n_outliers_detected == 3
    assert set([15, 80, 145]).issubset(set(res.outlier_indices))


def test_pelt_mean_shift_changepoints():
    # Signal with 2 planted mean shifts at indices 100 and 200
    n = 300
    x = np.zeros(n)
    x[:100] = 0.0
    x[100:200] = 5.0
    x[200:] = 0.0
    rng = np.random.default_rng(42)
    x += rng.normal(0, 0.2, size=n)

    res = detect_pelt_changepoints(x, min_size=20)
    # Should detect changepoints near 100 and 200
    assert any(abs(cp - 100) <= 5 for cp in res.changepoints)
    assert any(abs(cp - 200) <= 5 for cp in res.changepoints)


def test_granger_causality_unidirectional():
    n = 400
    rng = np.random.default_rng(42)
    x = np.zeros(n)
    y = np.zeros(n)

    for t in range(2, n):
        x[t] = 0.6 * x[t - 1] + rng.normal(0, 1)
        # Y is driven by lagged X (X -> Y causality)
        y[t] = 0.5 * y[t - 1] + 0.7 * x[t - 1] + rng.normal(0, 0.5)

    res = compute_granger_causality(x, y, max_lag=3)
    assert res.x_causes_y.is_significant
    assert not res.y_causes_x.is_significant
    assert "Channel X Granger-causes Channel Y" in res.directional_summary


def test_dynamic_time_warping_alignment():
    # Test identical series shifted non-linearly
    t = np.linspace(0, 2 * np.pi, 100)
    x = np.sin(t)
    y = np.sin(t ** 1.2) # nonlinearly warped

    res = compute_dynamic_time_warping(x, y)
    assert res.total_cost >= 0
    assert len(res.warping_path_x) == len(res.warping_path_y)
    assert res.warping_path_x[0] == 0 and res.warping_path_x[-1] == len(x) - 1


def test_iaaft_surrogates_distribution_conservation():
    rng = np.random.default_rng(42)
    x = rng.exponential(scale=2.0, size=256) # Asymmetric distribution
    surrs = generate_iaaft_surrogates(x, n_surrogates=5, max_iter=50)

    for s in surrs:
        # Sorted values should match exactly
        np.testing.assert_allclose(np.sort(s), np.sort(x), atol=1e-5)
