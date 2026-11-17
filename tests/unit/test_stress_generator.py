"""
test_stress_generator.py — Unit tests for Item 7: 350k stress dataset generator and 20k view note.
"""

from pathlib import Path
import tempfile
import pandas as pd
from scripts.generate_stress_dataset import generate_stress_dataset


def test_stress_dataset_generator():
    with tempfile.TemporaryDirectory() as tmpdir:
        test_csv = Path(tmpdir) / "test_stress_dataset.csv"
        df = generate_stress_dataset(output_path=test_csv, n_samples=2000, fs=1000.0)

        assert test_csv.exists()
        assert len(df) == 2000
        expected_cols = [
            "timestamp_sec",
            "chirp_sweep_v",
            "am_fm_carrier",
            "chaotic_oscillation",
            "impulse_bursts",
            "multi_harmonic",
        ]
        assert list(df.columns) == expected_cols

        # Check sampling rate: dt = 0.001 s
        dt = df["timestamp_sec"].iloc[1] - df["timestamp_sec"].iloc[0]
        assert abs(dt - 0.001) < 1e-5

        # Check finite values across all 5 channels
        for col in expected_cols[1:]:
            assert df[col].notna().all()
            assert not df[col].isin([float("inf"), float("-inf")]).any()


def test_benchmarks_note_20k_view():
    benchmarks_path = Path("BENCHMARKS.md")
    assert benchmarks_path.exists()
    content = benchmarks_path.read_text(encoding="utf-8")

    # Verify that deep analysis running on a 20,000-point view is documented
    assert "20,000-point view" in content or "20,000-sample" in content
    assert "MAX_DEEP_SAMPLES" in content
