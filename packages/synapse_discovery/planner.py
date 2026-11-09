"""
Analysis Planner and Algorithm Selector for SYNAPSE DISCOVERY.
Deterministic, explainable scientific algorithm selection based on signal characteristics.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Any

from synapse_core.models.signal import Signal


@dataclass(frozen=True)
class PlannedStep:
    step_id: str
    engine_name: str
    algorithm: str
    rationale: str
    parameters: Dict[str, Any]


@dataclass(frozen=True)
class AnalysisPlan:
    plan_id: str
    steps: List[PlannedStep]
    estimated_total_runtime_seconds: float
    is_multichannel: bool
    is_uniform: bool


def create_discovery_plan(signal: Signal) -> AnalysisPlan:
    """
    Profile signal and construct an explainable, transparent scientific analysis plan.
    """
    steps: List[PlannedStep] = []
    n = signal.n_samples
    c = signal.n_channels
    is_uni = signal.is_uniform

    # 1. Frequency Analysis
    if is_uni:
        steps.append(
            PlannedStep(
                step_id="step_spectra",
                engine_name="SPECTRA",
                algorithm="fft_and_welch_psd",
                rationale="Signal possesses uniform timestamps; execute FFT, Welch PSD, and spectral peak detection.",
                parameters={"window": "hann", "min_snr_db": 6.0},
            )
        )
        steps.append(
            PlannedStep(
                step_id="step_structure",
                engine_name="STRUCTURE",
                algorithm="autocorrelation_and_motifs",
                rationale="Search for temporal periodicities, recurring subsequences, and determinism.",
                parameters={"motif_window": min(64, max(16, n // 20))},
            )
        )

    # 2. Anomaly Detection
    steps.append(
        PlannedStep(
            step_id="step_anomaly",
            engine_name="ANOMALY",
            algorithm="robust_mad_and_changepoints",
            rationale="Profile baseline distribution; detect transient outliers and structural change-points.",
            parameters={"z_threshold": 3.5, "run_isolation_forest": bool(n >= 20)},
        )
    )

    # 3. Multichannel Relationships
    if c >= 2:
        steps.append(
            PlannedStep(
                step_id="step_relation",
                engine_name="RELATION",
                algorithm="multichannel_cross_corr_and_pca",
                rationale=f"Multichannel dataset with {c} channels; quantify inter-channel correlation, time delays, and principal components.",
                parameters={"channel_a": 0, "channel_b": 1},
            )
        )

    # 4. Statistical Verification
    steps.append(
        PlannedStep(
            step_id="step_inference",
            engine_name="INFERENCE",
            algorithm="phase_randomized_surrogates",
            rationale="Statistically test whether discovered structures exceed null expectations.",
            parameters={"n_surrogates": 20, "fdr_alpha": 0.05},
        )
    )

    import uuid
    return AnalysisPlan(
        plan_id=str(uuid.uuid4()),
        steps=steps,
        estimated_total_runtime_seconds=float(n * 1e-5),
        is_multichannel=bool(c >= 2),
        is_uniform=is_uni,
    )

