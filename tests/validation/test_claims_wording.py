"""
test_claims_wording.py — Regression test verifying Item 8:
Ensures uncalibrated absolute claims ("Zero False Positives", "Guarantees ... under 5%")
are reworded to measured or "controls" wording in benchmarkDatasets.ts and InferenceView.tsx.
"""

from pathlib import Path


def test_benchmark_datasets_reworded():
    p = Path("apps/web/src/data/benchmarkDatasets.ts")
    assert p.exists()
    content = p.read_text(encoding="utf-8")

    # Must NOT contain "Zero False Positives"
    assert "Zero False Positives" not in content

    # Must contain controlled / measured phrasing
    assert "Controls False Positives (0.00% measured)" in content


def test_inference_view_guarantees_reworded():
    p = Path("apps/web/src/views/InferenceView.tsx")
    assert p.exists()
    content = p.read_text(encoding="utf-8")

    # Must NOT claim absolute guarantee
    assert "guarantee" not in content.lower()

    # Must use measured or control phrasing
    assert "Controls expected false discovery rate bounded under 5%" in content
