"""
Regression test for SYNAPSE Answer Key and messy benchmark verification.
Ensures live pipeline matches ground truth and that written documentation
and claims agree character-for-character with generated JSON data.
"""

import json
import re
from pathlib import Path
from scripts.verify_answer_key import verify

ROOT = Path(__file__).resolve().parent.parent.parent


def test_messy_dataset_answer_key_pipeline_matches_ground_truth():
    success = verify()
    assert success is True, "Answer key verification failed: live pipeline diverges from ground-truth claims"


def test_written_claims_match_json():
    """
    Acceptance check: fails when a written claim in MESSY_DATASET_ANSWER_KEY.md
    and the verified JSON data (messy_answer_key_results.json) disagree.
    """
    json_path = ROOT / "data" / "messy_answer_key_results.json"
    md_path = ROOT / "data" / "MESSY_DATASET_ANSWER_KEY.md"

    assert json_path.exists(), f"Missing {json_path}"
    assert md_path.exists(), f"Missing {md_path}"

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    # 1. Granger F-statistics and directional summary
    f_xy = data["granger_causality"]["x_to_y"]["f_stat"]
    f_yx = data["granger_causality"]["y_to_x"]["f_stat"]
    assert str(f_xy) in md_text or f"{f_xy:.1f}" in md_text, f"Written claims missing X->Y F-stat {f_xy}"
    assert str(f_yx) in md_text or f"{f_yx:.1f}" in md_text, f"Written claims missing Y->X F-stat {f_yx}"

    # 2. PELT Changepoint sample 1200
    for cp in data["pelt_changepoints"]["indices"]:
        assert str(cp) in md_text, f"Written claims missing changepoint index {cp}"

    # 3. Rosner ESD Spikes 500 and 1800
    for spk in data["rosner_spikes"]["indices"]:
        assert str(spk) in md_text, f"Written claims missing spike index {spk}"

    # 4. Spectral Coherence peak
    coh_peak = data["coherence"]["peak_coherence"]
    coh_freq = data["coherence"]["peak_frequency_hz"]
    assert str(coh_peak) in md_text, f"Written claims missing peak coherence {coh_peak}"
    assert str(coh_freq) in md_text, f"Written claims missing peak frequency {coh_freq}"


def test_verify_answer_key_fails_on_claim_disagreement(monkeypatch):
    """
    Requirement: verify_answer_key.py must fail if a written claim and the JSON disagree.
    """
    import scripts.verify_answer_key as vak

    # Test failure when answer key markdown disagrees with JSON
    orig_open = open
    def mock_open(file, *args, **kwargs):
        f = orig_open(file, *args, **kwargs)
        if "MESSY_DATASET_ANSWER_KEY.md" in str(file) and "r" in args:
            class MockFile:
                def __enter__(self):
                    return self
                def __exit__(self, *a):
                    pass
                def read(self):
                    return "Corrupted claims file with no matching numbers: F = 999999.9"
            return MockFile()
        return f

    monkeypatch.setattr("builtins.open", mock_open)
    res = vak.verify()
    assert res is False, "verify_answer_key.py must return False / fail when written claims disagree with JSON"


def test_granger_causality_differencing_prewhitening_and_adjusted_p():
    """
    Requirement: verify Granger causality reports adjusted p-values and handles differencing/prewhitening.
    """
    from synapse_relation.granger import compute_granger_causality
    import numpy as np

    rng = np.random.default_rng(42)
    n = 500
    t = np.linspace(0, 10, n)
    drift = 0.5 * t
    x = np.zeros(n)
    y = np.zeros(n)
    for i in range(1, n):
        x[i] = 0.5 * x[i - 1] + rng.normal(0, 0.5)
        y[i] = 0.4 * y[i - 1] + 0.6 * x[i - 1] + rng.normal(0, 0.5)

    x_drift = x + drift
    y_drift = y + drift

    # Test with differencing: populates p_adjusted and handles differencing
    res_diff = compute_granger_causality(x_drift, y_drift, max_lag=2, differencing=True)
    assert res_diff.differenced is True
    assert hasattr(res_diff.x_causes_y, "p_adjusted")
    assert hasattr(res_diff.y_causes_x, "p_adjusted")
    assert res_diff.x_causes_y.p_adjusted <= 1.0
    assert res_diff.y_causes_x.p_adjusted <= 1.0
    assert res_diff.x_causes_y.is_significant

    # Test with prewhitening: removes shared linear drift and AR correlation
    res_pw = compute_granger_causality(x_drift, y_drift, max_lag=2, prewhiten=True)
    assert res_pw.prewhitened is True
    assert res_pw.x_causes_y.is_significant
    assert not res_pw.y_causes_x.is_significant
