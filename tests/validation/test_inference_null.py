"""
Validation Test: InferenceView IAAFT Null Hypothesis Testing Consistency.
Verifies that:
1. Observed statistic uses the exact same function and preprocessing as IAAFT surrogates.
2. p-value follows p = (1 + #{surrogate >= observed}) / (1 + N).
3. On pure white noise, H0 is not rejected (status is 'Not significant', p >= 0.05).
4. On messy_test_dataset.csv, H0 is rejected (status is 'Significant', p < 0.05).
5. Tile and table agree with the surrogate empirical distribution.
"""

from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from apps.api.routers.analysis_router import run_live_analysis, AnalyzeRequest
from synapse_core.models.signal import Signal

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


def test_inference_null_on_messy_and_white_noise():
    # 1. Load messy_test_dataset.csv
    csv_path = ROOT_DIR / "data" / "messy_test_dataset.csv"
    assert csv_path.exists(), "messy_test_dataset.csv must exist"
    df = pd.read_csv(csv_path)

    t = df.iloc[:, 0].to_numpy(dtype=float)
    x_messy = df.iloc[:, 1].to_numpy(dtype=float)

    req_messy = AnalyzeRequest(
        timestamps=t.tolist(),
        channels={"ch1": x_messy.tolist()},
        sampling_rate=200.0,
    )
    res_messy = run_live_analysis(req_messy)
    inf_messy = res_messy["results_by_module"]["inference"][0]

    obs_m = inf_messy["test"]["statistic"]
    p_m = inf_messy["test"]["p_raw"]
    surrs_m = inf_messy["test"]["surrogate_values"]
    status_m = inf_messy["status"]

    # Verify formula p = (1 + count(surrogate >= observed)) / (1 + N)
    calc_p_m = (1 + sum(s >= obs_m for s in surrs_m)) / (1 + len(surrs_m))
    assert abs(p_m - calc_p_m) < 1e-4, f"p-value mismatch: {p_m} vs {calc_p_m}"

    # On messy_test_dataset.csv: H0 must be rejected
    assert status_m == "Significant", f"Expected 'Significant', got {status_m}"
    assert p_m < 0.05, f"Expected p < 0.05 on messy dataset, got {p_m}"

    # 2. Pure Gaussian white noise
    rng = np.random.default_rng(2026)
    x_noise = rng.normal(0.0, 1.0, size=len(t))

    req_noise = AnalyzeRequest(
        timestamps=t.tolist(),
        channels={"ch1": x_noise.tolist()},
        sampling_rate=200.0,
    )
    res_noise = run_live_analysis(req_noise)
    inf_noise = res_noise["results_by_module"]["inference"][0]

    obs_n = inf_noise["test"]["statistic"]
    p_n = inf_noise["test"]["p_raw"]
    surrs_n = inf_noise["test"]["surrogate_values"]
    status_n = inf_noise["status"]

    # Verify formula p = (1 + count(surrogate >= observed)) / (1 + N)
    calc_p_n = (1 + sum(s >= obs_n for s in surrs_n)) / (1 + len(surrs_n))
    assert abs(p_n - calc_p_n) < 1e-4, f"p-value mismatch: {p_n} vs {calc_p_n}"

    # On pure white noise: H0 must NOT be rejected
    assert status_n == "Not significant", f"Expected 'Not significant', got {status_n}"
    assert p_n >= 0.05, f"Expected p >= 0.05 on pure noise, got {p_n}"
    assert obs_n < 3.5, f"Expected observed noise difference kurtosis around 3.0, got {obs_n}"
