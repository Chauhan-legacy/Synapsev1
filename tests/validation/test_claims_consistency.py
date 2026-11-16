"""
Test that docs/claims.json exists, is valid JSON, and has consistent metrics.
"""

import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
CLAIMS_PATH = ROOT_DIR / "docs" / "claims.json"


def test_claims_json_structure_and_metrics():
    assert CLAIMS_PATH.exists(), "docs/claims.json must exist"

    with open(CLAIMS_PATH, "r", encoding="utf-8") as f:
        claims = json.load(f)

    # 1. Test counts
    test_counts = claims.get("test_counts", {})
    assert test_counts.get("python_pytest_tests", 0) >= 68
    assert test_counts.get("in_browser_math_benchmark_tests", 0) == 10
    assert test_counts.get("total_automated_tests", 0) >= 78
    assert test_counts.get("test_pass_rate_percent") == 100.0

    # 2. False alarm rate
    far = claims.get("false_alarm_rate", {})
    assert far.get("trials") == 300
    assert far.get("validated_findings") == 0
    assert far.get("false_alarm_rate_percent") == 0.00
    ci = far.get("confidence_interval_95", {})
    assert ci.get("lower_bound_percent") == 0.00
    assert ci.get("upper_bound_percent") <= 1.5

    # 3. Answer key validation
    ak = claims.get("answer_key_validation", {})
    assert ak.get("planted_shift_sample") == 1200
    assert ak.get("recovered_shift_sample") == 1200
    assert ak.get("recovered_spike_samples") == [500, 1800]
    assert ak.get("control_null_z_discoveries") == 0

    # 4. 120k benchmark
    perf = claims.get("high_throughput_120k_benchmark", {})
    assert perf.get("sub_second_pass") is True
    assert perf.get("threshold_ceiling_ms_per_channel", 0) <= 100.0

    # 5. Open source license
    oss = claims.get("open_source_release", {})
    assert oss.get("license") == "MIT"
    assert "Priyansh Chauhan" in oss.get("copyright")


def test_claims_synchronization_with_docs_and_ui():
    """Verify that docs/claims.json matches apps/web/src/data/claims.json, README.md, and BENCHMARKS.md."""
    web_claims_path = ROOT_DIR / "apps" / "web" / "src" / "data" / "claims.json"
    assert web_claims_path.exists(), "apps/web/src/data/claims.json must exist"

    with open(CLAIMS_PATH, "r", encoding="utf-8") as f:
        docs_claims = json.load(f)
    with open(web_claims_path, "r", encoding="utf-8") as f:
        web_claims = json.load(f)

    assert docs_claims == web_claims, "docs/claims.json and apps/web/src/data/claims.json must be identical"

    readme_text = (ROOT_DIR / "README.md").read_text(encoding="utf-8")
    benchmarks_text = (ROOT_DIR / "BENCHMARKS.md").read_text(encoding="utf-8")

    total_tests = str(docs_claims["test_counts"]["total_automated_tests"])
    assert total_tests in readme_text, f"README.md must mention {total_tests} tests"
    assert total_tests in benchmarks_text, f"BENCHMARKS.md must mention {total_tests} tests"

    far_trials = str(docs_claims["false_alarm_rate"]["trials"])
    assert far_trials in readme_text, f"README.md must mention {far_trials} trials"
    assert far_trials in benchmarks_text, f"BENCHMARKS.md must mention {far_trials} trials"

    reported_ci = str(docs_claims["false_alarm_rate"]["confidence_interval_95"]["reported_upper_bound_percent"])
    assert reported_ci in readme_text, f"README.md must mention {reported_ci}% upper bound"
    assert reported_ci in benchmarks_text, f"BENCHMARKS.md must mention {reported_ci}% upper bound"


