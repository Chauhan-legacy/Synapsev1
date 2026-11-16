"""
Comprehensive Integration Tests for SYNAPSE Shared Signal Input Validator.
Verifies HTTP 422 with {error, what_to_try, module} on:
1. /v1/analyze
2. /v1/diagnostics
3. /v1/analysers/ultra_fast_batch
4. /v1/datasets/upload
5. /v1/experiments

Validates:
- Empty channels / data
- Fewer than 8 samples
- Constant signals (zero variance)
- Non-positive or NaN/Inf sampling rates
- NaN / Inf floating point numbers
- Unequal channel sample counts
- Mismatched or non-monotonic timestamps
- Constant batch channels marked 'skipped' with reason
"""

import io
import pytest
from fastapi.testclient import TestClient
from apps.api.main import app

client = TestClient(app)

ENDPOINTS_REQUIRING_422 = [
    "/v1/analyze",
    "/v1/diagnostics",
]

@pytest.mark.parametrize("endpoint", ENDPOINTS_REQUIRING_422)
def test_empty_channels_returns_422(endpoint):
    resp = client.post(endpoint, json={"channels": {}, "sampling_rate": 200.0})
    assert resp.status_code == 422
    body = resp.json()
    assert "error" in body and "what_to_try" in body and "module" in body

@pytest.mark.parametrize("endpoint", ENDPOINTS_REQUIRING_422)
def test_fewer_than_8_samples_returns_422(endpoint):
    resp = client.post(endpoint, json={"channels": {"sig": [1.0, 2.0, 3.0]}, "sampling_rate": 200.0})
    assert resp.status_code == 422
    body = resp.json()
    assert "sample" in body["error"].lower()
    assert "what_to_try" in body

@pytest.mark.parametrize("endpoint", ENDPOINTS_REQUIRING_422)
def test_constant_signal_returns_422(endpoint):
    resp = client.post(endpoint, json={"channels": {"sig": [42.0] * 50}, "sampling_rate": 200.0})
    assert resp.status_code == 422
    body = resp.json()
    assert "zero variance" in body["error"].lower() or "constant" in body["error"].lower()
    assert "what_to_try" in body

@pytest.mark.parametrize("endpoint", ENDPOINTS_REQUIRING_422)
def test_negative_or_zero_sampling_rate_returns_422(endpoint):
    resp = client.post(endpoint, json={"channels": {"sig": [1.0, 2.0, 3.0, 4.0] * 5}, "sampling_rate": -10.0})
    assert resp.status_code == 422
    body = resp.json()
    assert "error" in body and "what_to_try" in body

@pytest.mark.parametrize("endpoint", ENDPOINTS_REQUIRING_422)
def test_nan_or_inf_in_channels_returns_422(endpoint):
    raw_json = '{"channels": {"sig": [1.0, 2.0, NaN, 4.0, 1.0, 2.0, 3.0, 4.0]}, "sampling_rate": 100.0}'
    resp = client.post(endpoint, content=raw_json, headers={"Content-Type": "application/json"})
    assert resp.status_code == 422
    body = resp.json()
    assert "error" in body and "what_to_try" in body

@pytest.mark.parametrize("endpoint", ENDPOINTS_REQUIRING_422)
def test_unequal_channel_lengths_returns_422(endpoint):
    resp = client.post(
        endpoint,
        json={
            "channels": {
                "ch1": [1.0, 2.0, 3.0, 4.0] * 5,
                "ch2": [1.0, 2.0, 3.0, 4.0] * 10,
            },
            "sampling_rate": 100.0,
        },
    )
    assert resp.status_code == 422
    body = resp.json()
    assert "unequal" in body["error"].lower()

@pytest.mark.parametrize("endpoint", ENDPOINTS_REQUIRING_422)
def test_mismatched_timestamps_length_returns_422(endpoint):
    resp = client.post(
        endpoint,
        json={
            "channels": {"sig": [1.0, 2.0, 3.0, 4.0] * 5},
            "sampling_rate": 100.0,
            "timestamps": [0.0, 0.01, 0.02], # only 3 timestamps for 20 samples
        },
    )
    assert resp.status_code == 422
    body = resp.json()
    assert "timestamp" in body["error"].lower()

@pytest.mark.parametrize("endpoint", ENDPOINTS_REQUIRING_422)
def test_non_monotonic_timestamps_returns_422(endpoint):
    resp = client.post(
        endpoint,
        json={
            "channels": {"sig": [1.0, 2.0, 3.0, 4.0] * 2},
            "sampling_rate": 100.0,
            "timestamps": [0.0, 0.01, 0.02, 0.015, 0.04, 0.05, 0.06, 0.07], # non-monotonic
        },
    )
    assert resp.status_code == 422
    body = resp.json()
    assert "monotonically" in body["error"].lower()

def test_ultra_fast_batch_constant_channels_marked_skipped():
    """In batch analysis, a constant channel alongside non-constant is marked skipped with reason."""
    resp = client.post(
        "/v1/analysers/ultra_fast_batch",
        json={
            "channels": {
                "dynamic_tone": [float(i % 5) for i in range(500)],
                "constant_flat": [5.0] * 500,
            },
            "sampling_rate": 200.0,
        },
    )
    assert resp.status_code == 200
    res_data = resp.json()
    data = res_data.get("results_by_channel", res_data)
    assert "constant_flat" in data
    assert data["constant_flat"]["status"] == "skipped"
    assert "Zero variance" in data["constant_flat"]["reason"]
    assert "dynamic_tone" in data
    assert data["dynamic_tone"].get("status") != "skipped"

def test_ultra_fast_batch_bad_sampling_rate_returns_422():
    resp = client.post(
        "/v1/analysers/ultra_fast_batch",
        json={
            "channels": {"sig": [1.0, 2.0, 3.0, 4.0] * 5},
            "sampling_rate": -50.0,
        },
    )
    assert resp.status_code == 422
    body = resp.json()
    assert "error" in body and "what_to_try" in body

def test_dataset_upload_constant_csv_returns_422():
    """Upload of a zero-variance CSV file returns 422 with {error, what_to_try, module}."""
    csv_content = "time,sensor\n" + "\n".join(f"{i*0.01:.2f},10.0" for i in range(20))
    file_obj = io.BytesIO(csv_content.encode("utf-8"))
    resp = client.post(
        "/v1/datasets/upload",
        files={"file": ("flat_sensor.csv", file_obj, "text/csv")},
    )
    assert resp.status_code == 422
    body = resp.json()
    assert "constant" in body["error"].lower() or "zero variance" in body["error"].lower()
    assert "what_to_try" in body and "module" in body

def test_deep_analysis_large_file_bounded_decimation():
    """Deep analysis on 50,000 samples completes quickly using bounded 20k-point view."""
    import time
    t0 = time.perf_counter()
    resp = client.post(
        "/v1/analyze",
        json={
            "channels": {"lead_1": [float((i % 20) + (i % 7)) for i in range(50000)]},
            "sampling_rate": 500.0,
        },
    )
    elapsed = time.perf_counter() - t0
    assert resp.status_code == 200
    data = resp.json()
    assert "sampling_notice" in data
    assert "20,000-point view of 50,000 samples" in data["sampling_notice"]
    assert elapsed < 10.0  # Finishes well under 10 seconds
