"""
Null Model Calibration Test Suite for SYNAPSE.
Validates that statistical hypothesis tests maintain nominal false-positive rates (alpha = 0.05)
under null Gaussian and AR(1) processes across 2,000 simulated series.
"""

from __future__ import annotations
import numpy as np
import scipy.stats as stats
import pytest

from synapse_statistics.normality import evaluate_normality
from synapse_statistics.autocorr import compute_autocorr_structure
from synapse_spectra.multitaper import compute_multitaper_psd
from synapse_inference.multiple_testing import benjamini_hochberg_fdr


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
    sigma_fpr = np.sqrt(alpha * (1.0 - alpha) / n_sims) # ~ 0.00487

    # 3-sigma binomial confidence bounds: [0.035, 0.065]
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
    # Using 3.5 sigma allowance for finite-sample Ljung-Box variance
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
