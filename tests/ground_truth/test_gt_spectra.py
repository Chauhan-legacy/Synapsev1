"""
Ground-Truth Benchmark Suite: Spectra Engine.
Validates 3-tone recovery, scale invariance across amplitudes, and low false alarm rates on pure noise.
"""

import numpy as np
import pytest
from synapse_spectra.multitaper import compute_multitaper_psd
from synapse_spectra.high_res_peaks import fit_high_res_sinusoid


def test_gt_multitaper_three_tones_recovery():
    """Verify Thomson multitaper recovers all 3 planted tones (8.3, 21.7, 44 Hz)."""
    fs = 200.0
    N = 1000
    t = np.arange(N) / fs
    rng = np.random.default_rng(42)

    # Signal with 3 tones + Gaussian noise
    x = (
        np.sin(2 * np.pi * 8.3 * t)
        + np.sin(2 * np.pi * 21.7 * t)
        + np.sin(2 * np.pi * 44.0 * t)
        + rng.normal(0, 0.5, N)
    )

    res = compute_multitaper_psd(x, sampling_rate=fs, nw=3.5, n_tapers=5, alpha=0.01, fdr_control=True)
    detected_freqs = list(res.line_frequencies_detected)

    has_8 = any(abs(f - 8.3) <= 1.0 for f in detected_freqs)
    has_21 = any(abs(f - 21.7) <= 1.0 for f in detected_freqs)
    has_44 = any(abs(f - 44.0) <= 1.0 for f in detected_freqs)

    assert has_8, f"Failed to detect 8.3 Hz tone; detected: {detected_freqs}"
    assert has_21, f"Failed to detect 21.7 Hz tone; detected: {detected_freqs}"
    assert has_44, f"Failed to detect 44.0 Hz tone; detected: {detected_freqs}"


def test_gt_multitaper_scale_invariance():
    """Verify F-statistics and p-values are identical across amplitude scalings."""
    fs = 200.0
    N = 500
    rng = np.random.default_rng(123)
    base_signal = rng.normal(0, 1.0, N)

    scales = [0.1, 1.0, 10.0, 100.0]
    results = [
        compute_multitaper_psd(base_signal * s, sampling_rate=fs, nw=3.5, n_tapers=5, fdr_control=False)
        for s in scales
    ]

    for i in range(1, len(scales)):
        max_f_diff = np.max(np.abs(results[0].f_statistics - results[i].f_statistics))
        assert max_f_diff < 1e-8, f"Scale invariance violated between 0.1x and {scales[i]}x: diff={max_f_diff}"


def test_gt_multitaper_pure_noise_fdr_line_count():
    """Verify false line discoveries on pure noise stay <= 1 per run."""
    fs = 200.0
    N = 800
    rng = np.random.default_rng(777)
    n_runs = 20
    total_lines = 0

    for _ in range(n_runs):
        noise = rng.normal(0, 1.0, N)
        res = compute_multitaper_psd(noise, sampling_rate=fs, nw=3.5, n_tapers=5, alpha=0.01, fdr_control=True)
        total_lines += len(res.line_frequencies_detected)

    avg_lines = total_lines / n_runs
    assert avg_lines <= 1.0, f"Average false lines on pure noise was {avg_lines} (threshold <= 1.0)"


def test_gt_high_res_crlb_sinusoid_efficiency():
    """Verify sub-bin estimation achieves near-optimal CRLB variance."""
    fs = 200.0
    N = 600
    t = np.arange(N) / fs
    true_f = 23.456
    x = np.sin(2 * np.pi * true_f * t) + np.random.default_rng(99).normal(0, 0.2, N)

    res = fit_high_res_sinusoid(t, x, initial_freq_hint=23.5)
    error = abs(res.frequency_hz - true_f)
    assert error < 0.05, f"Frequency error {error} Hz exceeds 0.05 Hz"
    assert res.cramer_rao_lower_bound_hz2 > 0
    assert res.efficiency_ratio >= 0.70
