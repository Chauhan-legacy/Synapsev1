"""
Ground-Truth Benchmark Suite: Anomaly Engine.
Validates BOCPD 5-sigma spike and mean shift, PELT changepoints, and Rosner ESD outlier detection.
"""

import numpy as np
import pytest
from synapse_anomaly.bocpd import compute_bocpd
from synapse_anomaly.pelt import detect_pelt_changepoints
from synapse_anomaly.rosner_esd import generalized_esd_test
from synapse_anomaly.variance_shift import evaluate_variance_shift, detect_variance_shifts
from synapse_anomaly.discords import find_matrix_profile_discords
from synapse_anomaly.blind_transient import detect_blind_transients


def test_gt_bocpd_five_sigma_jump_probability_spike():
    """Verify BOCPD detects a 5-sigma jump with sharp run-length drop and P(r_t=0) > 0.40."""
    rng = np.random.default_rng(101)
    x = rng.normal(0, 1.0, 300)
    x[150] = 5.0  # 5-sigma jump spike

    res = compute_bocpd(x, hazard_lambda=100.0)
    p_0_jump = float(res.changepoint_probabilities[150])
    p_0_baseline = float(np.median(res.changepoint_probabilities[:140]))

    assert p_0_jump > 0.40, f"P(r_t=0) at jump was {p_0_jump}, expected > 0.40"
    assert p_0_jump > 10 * p_0_baseline, "Jump probability did not spike by at least 10x over baseline"


def test_gt_bocpd_mean_shift_recovery():
    """Verify BOCPD locates a +1.5 sigma mean shift at sample 500 within 25 samples."""
    rng = np.random.default_rng(202)
    x = np.concatenate([rng.normal(0, 1.0, 500), rng.normal(1.5, 1.0, 500)])

    res = compute_bocpd(x, hazard_lambda=100.0, prob_threshold=0.01)
    cps = res.changepoints
    map_r = np.argmax(res.run_length_posterior, axis=0)
    print(f"BOCPD detected cps: {cps}")
    print(f"map_r around 500: {map_r[495:515]}")
    print(f"cp_probs around 500: {res.changepoint_probabilities[495:515]}")
    assert len(cps) > 0, "No changepoints detected for +1.5 sigma shift"
    errors = [abs(cp - 500) for cp in cps]
    min_error = min(errors)
    assert min_error <= 25, f"Minimum error for shift at 500 was {min_error} samples (threshold <= 25)"


def test_gt_pelt_mean_shift():
    """Verify PELT detects a clear mean shift without false alarms on stationary noise."""
    rng = np.random.default_rng(303)
    x = np.concatenate([rng.normal(0, 1.0, 400), rng.normal(2.0, 1.0, 400)])

    res = detect_pelt_changepoints(x, min_size=20)
    assert len(res.changepoints) == 1, f"Expected 1 changepoint, found {len(res.changepoints)}"
    assert abs(res.changepoints[0] - 400) <= 10, f"Detected CP {res.changepoints[0]} too far from 400"


def test_gt_rosner_esd_planted_outliers_and_clean_noise():
    """Verify Rosner ESD detects exact planted outliers and yields 0 on clean Gaussian noise."""
    rng = np.random.default_rng(42)
    clean_noise = rng.normal(0, 1.0, 400)

    # Clean noise test: should find 0 outliers
    res_clean = generalized_esd_test(clean_noise, max_outliers=5, alpha=0.05)
    assert res_clean.n_outliers_detected == 0, f"False outliers on clean noise: {res_clean.n_outliers_detected}"

    # Plant 3 severe outliers (z > 6)
    planted_signal = clean_noise.copy()
    planted_signal[50] = 7.5
    planted_signal[150] = -8.2
    planted_signal[250] = 9.0

    res_planted = generalized_esd_test(planted_signal, max_outliers=5, alpha=0.05)
    assert res_planted.n_outliers_detected == 3, f"Expected 3 outliers, found {res_planted.n_outliers_detected}"
    indices = set(res_planted.outlier_indices)
    assert indices == {50, 150, 250}, f"Detected indices {indices} do not match {50, 150, 250}"


def test_gt_dataset_j_variance_shift():
    """
    Ground-truth validation on Dataset J (30,000 samples, 4 channels):
    - Channel 1 exhibits an elevated variance regime between samples 24000 and 27000.
    - Verified via median-centered Levene test with p < 1e-6 and variance ratio > 1.5.
    """
    from pathlib import Path
    import pandas as pd

    data_path = Path(__file__).resolve().parent.parent.parent / "benchmarks" / "SYNAPSE_BENCHMARK_DATA" / "data" / "J_master_discovery_challenge.csv"
    if not data_path.exists():
        pytest.skip("Dataset J not found")

    df = pd.read_csv(data_path)
    c1 = df["channel_1"].values

    res = evaluate_variance_shift(c1, candidate_start=24000, candidate_end=27000, alpha=1e-6)
    assert res.is_significant, f"Variance shift not significant: p={res.p_value}"
    assert res.p_value < 1e-6, f"p-value {res.p_value} exceeded 1e-6"
    assert res.variance_ratio > 1.5, f"Variance ratio {res.variance_ratio} was <= 1.5"
    assert res.start_index == 24000
    assert res.end_index == 27000


def test_gt_dataset_j_matrix_profile_discord():
    """
    Ground-truth validation on Dataset J (30,000 samples, 4 channels):
    - Planted non-repeating Hann-windowed sawtooth discord at index 14000 (length 200).
    - Verified using STOMP Matrix Profile: completes in < 10s and ranks index 14000 first with window 150.
    """
    import time
    from pathlib import Path
    import pandas as pd

    data_path = Path(__file__).resolve().parent.parent.parent / "benchmarks" / "SYNAPSE_BENCHMARK_DATA" / "data" / "J_master_discovery_challenge.csv"
    if not data_path.exists():
        pytest.skip("Dataset J not found")

    df = pd.read_csv(data_path)
    c1 = df["channel_1"].values[:30000]

    t0 = time.perf_counter()
    res = find_matrix_profile_discords(c1, window_size=150, top_k=3)
    elapsed = time.perf_counter() - t0

    assert elapsed < 10.0, f"STOMP matrix profile exceeded 10s time limit: {elapsed:.2f}s"
    assert len(res.discord_indices) >= 1, "No discords detected"
    assert abs(res.discord_indices[0] - 14000) <= 25, f"Top discord index was {res.discord_indices[0]}, expected ~14000"


def test_gt_blind_transient_clean_noise_zero_false_alarms():
    """Verify blind transient detector yields 0 false events on pure Gaussian white noise at alpha = 0.05."""
    rng = np.random.default_rng(999)
    noise = rng.normal(0, 1.0, 5000)
    res = detect_blind_transients(noise, sampling_rate=100.0, alpha=0.05)
    assert res.n_events == 0, f"False events detected on clean white noise: {res.n_events}"


def test_gt_dataset_j_blind_transient_discovery():
    """
    Ground-truth validation on Dataset J (30,000 samples, 4 channels):
    - Planted transient burst at indices 7000–7079 (damped 2.5 Hz burst, peak amplitude 5.0).
    - Verified: blind transient detector identifies index ~7005 among top 3 events without frequency hints.
    """
    from pathlib import Path
    import pandas as pd

    data_path = Path(__file__).resolve().parent.parent.parent / "benchmarks" / "SYNAPSE_BENCHMARK_DATA" / "data" / "J_master_discovery_challenge.csv"
    if not data_path.exists():
        pytest.skip("Dataset J not found")

    df = pd.read_csv(data_path)
    c1 = df["channel_1"].values[:30000]

    res = detect_blind_transients(c1, sampling_rate=10.0, alpha=0.05, min_separation_samples=500, top_k=3)
    peak_indices = [ev.peak_index for ev in res.events]
    assert any(abs(idx - 7005) <= 50 for idx in peak_indices), f"Planted transient at ~7000 not found in top 3: {peak_indices}"
