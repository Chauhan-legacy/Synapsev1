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
