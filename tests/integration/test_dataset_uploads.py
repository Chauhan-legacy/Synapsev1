"""
Integration tests for dataset uploads: zero-configuration ingestion of all shipped datasets.
"""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from apps.api.main import app

client = TestClient(app)
_ROOT = Path(__file__).resolve().parent.parent.parent


@pytest.mark.parametrize(
    "rel_path,expected_samples,expected_fs",
    [
        ("data/messy_test_dataset.csv", 2500, 200.0),
        ("data/synapse_mega_120k_benchmark.csv", 120000, 500.0),
        ("benchmarks/SYNAPSE_BENCHMARK_DATA/data/A_periodic_multifrequency.csv", 20000, 2.0),
        ("benchmarks/SYNAPSE_BENCHMARK_DATA/data/B_nonstationary_chirp.csv", 20000, 10.0),
        ("benchmarks/SYNAPSE_BENCHMARK_DATA/data/C_anomaly_rich.csv", 20000, 50.0),
        ("benchmarks/SYNAPSE_BENCHMARK_DATA/data/D_regime_changes.csv", 20000, 10.0),
        ("benchmarks/SYNAPSE_BENCHMARK_DATA/data/E_multichannel_coupling.csv", 20000, 20.0),
        ("benchmarks/SYNAPSE_BENCHMARK_DATA/data/F_motifs_recurrence.csv", 30000, 10.0),
        ("benchmarks/SYNAPSE_BENCHMARK_DATA/data/G_statistical_inference.csv", 77280, 1.0),
        ("benchmarks/SYNAPSE_BENCHMARK_DATA/data/I_dynamic_range.csv", 20000, 100.0),
        ("benchmarks/SYNAPSE_BENCHMARK_DATA/data/J_master_discovery_challenge.csv", 30000, 10.0),
        ("benchmarks/SYNAPSE_BENCHMARK_DATA/data/MESSY_test_dataset.csv", 2500, 200.0),
    ],
)
def test_dataset_upload_zero_config(rel_path, expected_samples, expected_fs):
    file_path = _ROOT / rel_path
    if not file_path.exists():
        pytest.skip(f"Dataset {rel_path} not found.")

    with open(file_path, "rb") as f:
        response = client.post(
            "/v1/datasets/upload",
            files={"file": (file_path.name, f, "text/csv")},
        )

    assert response.status_code == 200, f"Upload failed for {rel_path}: {response.text}"
    data = response.json()
    assert data["samples"] == expected_samples, f"Expected {expected_samples} samples, got {data['samples']}"
    assert abs(data["sampling_rate"] - expected_fs) <= 0.1, f"Expected {expected_fs} Hz, got {data['sampling_rate']}"


def test_timestamp_linearization_preserves_sha256_and_notifies():
    """Verify that datasets with non-monotonic timestamps (like G_statistical_inference)
    are continuously linearized, report timestamps_linearized=True, and retain original SHA-256."""
    import hashlib
    rel_path = "benchmarks/SYNAPSE_BENCHMARK_DATA/data/G_statistical_inference.csv"
    file_path = _ROOT / rel_path
    if not file_path.exists():
        pytest.skip("Dataset G_statistical_inference.csv not found.")

    raw_bytes = file_path.read_bytes()
    expected_sha256 = hashlib.sha256(raw_bytes).hexdigest()

    with open(file_path, "rb") as f:
        response = client.post(
            "/v1/datasets/upload",
            files={"file": (file_path.name, f, "text/csv")},
        )

    assert response.status_code == 200, f"Upload failed: {response.text}"
    data = response.json()
    assert data["timestamps_linearized"] is True, "Expected timestamps_linearized to be True"
    assert "Continuous time linearization" in data["linearization_message"]
    assert data["original_sha256"] == expected_sha256, "Original SHA-256 must match raw file hash"
