import pytest
import numpy as np

from synapse_core.models.signal import Signal, ChannelInfo
from synapse_discovery.orchestrator import run_discovery_pipeline
from benchmarks.hidden_signal_challenge import evaluate_hidden_signal_challenge


def test_discovery_pipeline_end_to_end():
    fs = 200.0
    t = np.arange(400) / fs
    c1 = 2.0 * np.sin(2 * np.pi * 15 * t)
    c2 = np.cos(2 * np.pi * 15 * t)
    vals = np.column_stack([c1, c2])

    sig = Signal(values=vals, timestamps=t, channels=[ChannelInfo("ch_a"), ChannelInfo("ch_b")])
    exp = run_discovery_pipeline(sig)

    assert exp.experiment_id is not None
    assert len(exp.all_findings) > 0
    assert len(exp.evidence_graph._nodes) > 0
    assert exp.manifest.compute_manifest_hash() is not None


def test_hidden_signal_challenge_benchmark():
    res = evaluate_hidden_signal_challenge()
    assert res["benchmark_name"] == "THE HIDDEN SIGNAL CHALLENGE"
    eval_res = res["evaluation_results"]

    # Check that stationary frequencies were recovered
    freq_recovery = eval_res["frequency_recovery"]
    assert freq_recovery["5.0 Hz"]["recovered"] is True
    assert freq_recovery["14.0 Hz"]["recovered"] is True

    # Check transient was detected
    assert eval_res["transient_detected"] is True

    # Check change point was detected
    assert eval_res["change_point_detected"] is True

