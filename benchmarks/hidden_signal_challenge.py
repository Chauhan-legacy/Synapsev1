"""
THE HIDDEN SIGNAL CHALLENGE
Controlled scientific benchmark for SYNAPSE.
Generates ground-truth planted signal, executes full automated discovery,
and compares recovered findings against known physical truth.
"""

from __future__ import annotations
import numpy as np
import json
from dataclasses import dataclass
from typing import Dict, Any, Tuple

from synapse_core.models.signal import Signal, ChannelInfo
from synapse_discovery.orchestrator import run_discovery_pipeline, DiscoveryExperiment


@dataclass(frozen=True)
class PlantedGroundTruth:
    frequencies_hz: Tuple[float, float, float]
    transient_time_sec: float
    transient_magnitude: float
    change_point_time_sec: float
    noise_sigma: float
    sampling_rate_hz: float
    duration_sec: float


def generate_hidden_signal_dataset(
    sampling_rate: float = 250.0,
    duration: float = 4.0,
    random_seed: int = 42,
) -> Tuple[Signal, PlantedGroundTruth]:
    """
    Generate controlled benchmark signal with exact planted physical truth:
    1. Three overlapping tones: 5.0 Hz, 14.0 Hz, 35.0 Hz.
    2. Linear chirp (10 Hz -> 50 Hz).
    3. Coloured noise (AR(1) process).
    4. Planted transient burst at t = 1.25s.
    5. Structural change-point at t = 2.60s (mean step + variance doubling).
    """
    rng = np.random.default_rng(random_seed)
    n = int(sampling_rate * duration)
    t = np.arange(n) / sampling_rate

    # 1. Three overlapping stationary tones
    f1, f2, f3 = 5.0, 14.0, 35.0
    s_tones = (
        1.5 * np.sin(2 * np.pi * f1 * t)
        + 1.0 * np.sin(2 * np.pi * f2 * t + 0.5)
        + 0.8 * np.sin(2 * np.pi * f3 * t - 1.2)
    )

    # 2. Time-varying oscillation (linear chirp)
    chirp_f0, chirp_f1 = 8.0, 24.0
    beta = (chirp_f1 - chirp_f0) / duration
    s_chirp = 0.6 * np.sin(2 * np.pi * (chirp_f0 * t + 0.5 * beta * t**2))

    # 3. Coloured noise via AR(1) process: e[t] = 0.6 e[t-1] + w[t]
    noise = np.zeros(n)
    white = rng.normal(0, 0.4, size=n)
    for i in range(1, n):
        noise[i] = 0.6 * noise[i - 1] + white[i]

    signal_vals = s_tones + s_chirp + noise

    # 4. Planted transient burst at t = 1.25s
    t_transient = 1.25
    transient_mag = 5.5
    transient_profile = transient_mag * np.exp(-((t - t_transient) ** 2) / (2 * (0.015**2)))
    signal_vals += transient_profile

    # 5. Structural change-point at t = 2.60s
    t_cp = 2.60
    cp_mask = t >= t_cp
    signal_vals[cp_mask] += 1.8  # Mean shift
    signal_vals[cp_mask] += rng.normal(0, 0.5, size=int(np.sum(cp_mask)))  # Variance shift

    gt = PlantedGroundTruth(
        frequencies_hz=(f1, f2, f3),
        transient_time_sec=t_transient,
        transient_magnitude=transient_mag,
        change_point_time_sec=t_cp,
        noise_sigma=0.4,
        sampling_rate_hz=sampling_rate,
        duration_sec=duration,
    )

    sig = Signal(
        values=signal_vals,
        timestamps=t,
        channels=[ChannelInfo(name="challenge_sensor", unit="volts")],
        metadata={"benchmark": "HIDDEN_SIGNAL_CHALLENGE_GROUND_TRUTH"},
    )

    return sig, gt


def evaluate_hidden_signal_challenge() -> Dict[str, Any]:
    """
    Run end-to-end benchmark and score SYNAPSE recovery against ground truth.
    """
    sig, gt = generate_hidden_signal_dataset()
    exp = run_discovery_pipeline(sig)

    recovered_freqs = []
    recovered_transients = []
    recovered_cps = []

    for f in exp.all_findings:
        if f.finding_type.value == "spectral_peak":
            recovered_freqs.append(f.value)
        elif f.finding_type.value == "transient_anomaly":
            if "start_time" in f.details:
                recovered_transients.append((f.details["start_time"], f.value))
        elif f.finding_type.value == "change_point":
            recovered_cps.append(f.value)

    # Score frequency recovery: check if planted tones are matched within 1.0 Hz
    freq_matches = {}
    for target in gt.frequencies_hz:
        best_diff = min([abs(rf - target) for rf in recovered_freqs], default=float("inf"))
        freq_matches[f"{target} Hz"] = {
            "target_hz": target,
            "min_error_hz": best_diff,
            "recovered": bool(best_diff <= 1.0),
        }

    # Score transient detection: check if transient is within 0.1s
    transient_match = False
    for t_time, mag in recovered_transients:
        if abs(t_time - gt.transient_time_sec) <= 0.1:
            transient_match = True
            break

    # Score change-point detection: check if within 0.2s
    cp_match = False
    for cp_t in recovered_cps:
        if abs(cp_t - gt.change_point_time_sec) <= 0.2:
            cp_match = True
            break

    return {
        "benchmark_name": "THE HIDDEN SIGNAL CHALLENGE",
        "ground_truth": {
            "planted_frequencies_hz": list(gt.frequencies_hz),
            "planted_transient_time_sec": gt.transient_time_sec,
            "planted_change_point_time_sec": gt.change_point_time_sec,
        },
        "evaluation_results": {
            "frequency_recovery": freq_matches,
            "transient_detected": transient_match,
            "change_point_detected": cp_match,
            "total_findings": len(exp.all_findings),
            "evidence_nodes_count": len(exp.evidence_graph._nodes),
            "manifest_hash": exp.manifest.compute_manifest_hash(),
        },
    }

