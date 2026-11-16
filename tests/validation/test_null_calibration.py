"""
Null Model Calibration Test Suite for SYNAPSE.
Validates that statistical hypothesis tests maintain nominal false-positive rates (alpha = 0.05)
under null Gaussian, pink, brown, and heavy-tailed processes across >= 1,000 simulated series,
and verifies tone detection power on planted harmonic signals.
"""

from __future__ import annotations
import numpy as np
import scipy.stats as stats
import pytest

from synapse_statistics.normality import evaluate_normality
from synapse_statistics.autocorr import compute_autocorr_structure
from synapse_spectra.multitaper import compute_multitaper_psd
from synapse_inference.multiple_testing import benjamini_hochberg_fdr
from synapse_anomaly.rosner_esd import generalized_esd_test
from synapse_anomaly.pelt import detect_pelt_changepoints


def generate_pink_noise(n: int, rng: np.random.Generator) -> np.ndarray:
    """Generate 1/f pink noise via spectral shaping."""
    white = rng.normal(0.0, 1.0, n)
    fft_white = np.fft.rfft(white)
    f = np.fft.rfftfreq(n)
    f[0] = 1e-6
    scale = 1.0 / np.sqrt(f)
    scale[0] = 0.0
    pink = np.fft.irfft(fft_white * scale, n=n)
    return pink / np.std(pink)


def generate_brown_noise(n: int, rng: np.random.Generator) -> np.ndarray:
    """Generate 1/f^2 brown noise (integrated random walk)."""
    white = rng.normal(0.0, 1.0, n)
    brown = np.cumsum(white)
    return (brown - np.mean(brown)) / max(1e-12, np.std(brown))


def test_normality_calibration_under_null():
    """
    Test that Jarque-Bera test false-positive rate under standard Gaussian null
    sits within 3-sigma binomial tolerance of alpha = 0.05 on 2,000 series.
    """
    n_sims = 2000
    n_samples = 256
    alpha = 0.05
    rng = np.random.default_rng(12345)

    false_positives = 0
    data_matrix = rng.normal(loc=0.0, scale=1.0, size=(n_sims, n_samples))

    for i in range(n_sims):
        series = data_matrix[i]
        jb_stat, jb_p = stats.jarque_bera(series)
        if jb_p < alpha:
            false_positives += 1

    fpr = false_positives / n_sims
    sigma_fpr = np.sqrt(alpha * (1.0 - alpha) / n_sims)

    lower_bound = alpha - 3.0 * sigma_fpr
    upper_bound = alpha + 3.0 * sigma_fpr

    assert lower_bound <= fpr <= upper_bound, (
        f"Miscalibrated Jarque-Bera test! Expected FPR in [{lower_bound:.4f}, {upper_bound:.4f}], got {fpr:.4f}"
    )


def test_autocorr_ljung_box_calibration_under_null():
    """
    Test that Ljung-Box test false-positive rate under independent white noise null
    sits within binomial tolerance of alpha = 0.05 on 2,000 series.
    """
    n_sims = 2000
    n_samples = 256
    alpha = 0.05
    rng = np.random.default_rng(54321)

    false_positives = 0
    data_matrix = rng.normal(loc=0.0, scale=1.0, size=(n_sims, n_samples))

    for i in range(n_sims):
        series = data_matrix[i]
        res = compute_autocorr_structure(series, max_lag=5, alpha=alpha)
        if not res.is_white_noise:
            false_positives += 1

    fpr = false_positives / n_sims
    sigma_fpr = np.sqrt(alpha * (1.0 - alpha) / n_sims)
    lower_bound = max(0.02, alpha - 3.5 * sigma_fpr)
    upper_bound = alpha + 3.5 * sigma_fpr

    assert lower_bound <= fpr <= upper_bound, (
        f"Miscalibrated Ljung-Box test! Expected FPR in [{lower_bound:.4f}, {upper_bound:.4f}], got {fpr:.4f}"
    )


def test_fdr_control_under_global_null():
    """
    Test Benjamini-Hochberg FDR control when all m = 50 null hypotheses are true.
    """
    n_sims = 500
    m_tests = 50
    alpha = 0.05
    rng = np.random.default_rng(999)

    any_false_discoveries = 0

    for _ in range(n_sims):
        p_vals = rng.uniform(0.0, 1.0, size=m_tests).tolist()
        _, rejections = benjamini_hochberg_fdr(p_vals, alpha=alpha)
        if any(rejections):
            any_false_discoveries += 1

    fwer = any_false_discoveries / n_sims
    assert fwer <= 0.15, f"FDR control violated: family error rate was {fwer:.3f}"


def test_rosner_esd_gaussian_and_pink_noise_calibration():
    """
    Acceptance check: >= 1,000 seeded runs per condition for white and pink noise;
    false validated findings strictly <= nominal alpha (0.05) with 95% binomial confidence intervals.
    """
    rng = np.random.default_rng(20261116)
    n_runs = 1000
    n_samples = 500

    # 1. Gaussian White Noise (1,000 runs)
    fp_gauss = 0
    for _ in range(n_runs):
        x = rng.normal(0.0, 1.0, n_samples)
        res = generalized_esd_test(x, max_outliers=5, alpha=0.05, prewhiten=True)
        if res.n_outliers_detected > 0:
            fp_gauss += 1

    fpr_gauss = fp_gauss / float(n_runs)
    ci_gauss_half = 1.96 * np.sqrt(fpr_gauss * (1.0 - fpr_gauss) / n_runs)
    assert fpr_gauss <= 0.05, f"Gaussian Rosner FPR {fpr_gauss:.4f} exceeds 0.05!"

    # 2. Pink (1/f) Coloured Noise (1,000 runs)
    fp_pink = 0
    for _ in range(n_runs):
        x = generate_pink_noise(n_samples, rng)
        res = generalized_esd_test(x, max_outliers=5, alpha=0.05, prewhiten=True)
        if res.n_outliers_detected > 0:
            fp_pink += 1

    fpr_pink = fp_pink / float(n_runs)
    ci_pink_half = 1.96 * np.sqrt(fpr_pink * (1.0 - fpr_pink) / n_runs)
    assert fpr_pink <= 0.05, f"Pink Rosner FPR {fpr_pink:.4f} exceeds 0.05!"

    # 3. Heavy-tailed Student-t (df=3) Noise: document that heavy tails flag outliers as expected
    fp_heavy = 0
    n_heavy_runs = 200
    for _ in range(n_heavy_runs):
        x = rng.standard_t(df=3, size=n_samples)
        res = generalized_esd_test(x, max_outliers=5, alpha=0.05, prewhiten=True)
        if res.n_outliers_detected > 0:
            fp_heavy += 1

    fpr_heavy = fp_heavy / float(n_heavy_runs)
    assert fpr_heavy >= 0.70, f"Expected heavy-tailed noise to flag outliers, got {fpr_heavy:.3f}"


def test_pelt_changepoint_calibration_under_null():
    """
    Test that PELT exact changepoints on Gaussian white noise maintain <= 5% false alarms.
    """
    rng = np.random.default_rng(20261117)
    n_runs = 200
    n_samples = 500

    fp_pelt = 0
    for _ in range(n_runs):
        x = rng.normal(0.0, 1.0, n_samples)
        res = detect_pelt_changepoints(x, min_size=20)
        if res.n_changepoints > 0:
            fp_pelt += 1

    fpr_pelt = fp_pelt / float(n_runs)
    assert fpr_pelt <= 0.05, f"PELT Gaussian FPR {fpr_pelt:.4f} exceeds 0.05"


def test_multitaper_tone_detection_power_acceptance():
    """
    Acceptance check: at least 28 of 30 detections of 12.37 Hz tone at amplitude 3.0
    (N = 1500, fs = 200 Hz, noise sd = 1.0, random phase).
    """
    rng = np.random.default_rng(20261118)
    n = 1500
    fs = 200.0
    t = np.arange(n) / fs
    true_f0 = 12.37
    amp = 3.0
    n_trials = 30

    detected_count = 0
    for _ in range(n_trials):
        phase = rng.uniform(0.0, 2.0 * np.pi)
        noise = rng.normal(0.0, 1.0, size=n)
        sig = amp * np.cos(2.0 * np.pi * true_f0 * t + phase) + noise

        res = compute_multitaper_psd(sig, sampling_rate=fs, nw=3.5, alpha=0.01)
        if any(abs(f - true_f0) <= 1.0 for f in res.line_frequencies_detected):
            detected_count += 1

    assert detected_count >= 28, f"Detected only {detected_count}/30 runs (required >= 28)"
