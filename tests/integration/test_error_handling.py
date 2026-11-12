"""
Integration test for API error handling on unusual / edge-case inputs.
Guarantees 4xx status codes or 200 with skipped notes; NEVER HTTP 500.
"""

import pytest
from fastapi.testclient import TestClient
from apps.api.main import app

client = TestClient(app)


def test_short_signal_3_samples_returns_422():
    resp = client.post(
        "/v1/analyze",
        json={
            "channels": {"lead_1": [1.0, 2.0, 3.0]},
            "sampling_rate": 200.0,
        },
    )
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert "error" in body
    assert "what_to_try" in body
    assert "sample" in body["error"].lower()


def test_negative_sampling_rate_rejected_by_pydantic_422():
    resp = client.post(
        "/v1/analyze",
        json={
            "channels": {"lead_1": [1.0] * 50},
            "sampling_rate": -5.0,
        },
    )
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code}: {resp.text}"


def test_constant_signal_handled_gracefully():
    # 2000 samples of constant 5.0
    resp = client.post(
        "/v1/analyze",
        json={
            "channels": {"lead_1": [5.0] * 2000},
            "sampling_rate": 200.0,
        },
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    spectra_results = data["results_by_module"]["spectra"]
    noise_color_res = next((r for r in spectra_results if "Noise Color" in r["method"]), None)
    assert noise_color_res is not None
    assert noise_color_res["status"] == "skipped"


def test_empty_channels_returns_400():
    resp = client.post(
        "/v1/analyze",
        json={
            "channels": {},
            "sampling_rate": 200.0,
        },
    )
    assert resp.status_code in (400, 422)


def test_fast_batch_negative_sampling_rate_422():
    resp = client.post(
        "/v1/analysers/ultra_fast_batch",
        json={
            "channels": {"sig": [1.0, 2.0, 3.0, 4.0] * 20},
            "sampling_rate": -100.0,
        },
    )
    assert resp.status_code == 422

