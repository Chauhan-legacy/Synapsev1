"""
STRUCTURE Analysis Engine for SYNAPSE.
Uncovers hidden temporal structures: periodicities, motifs, discords, and recurrence.
"""

from __future__ import annotations
import time
import uuid
from typing import Dict, Any, Optional, List
import numpy as np

from synapse_core.contracts.engine import AnalysisEngine, ResourceEstimate
from synapse_core.models.signal import Signal
from synapse_core.models.result import (
    AnalysisResult,
    Finding,
    FindingType,
    FindingStatus,
    MetricValue,
)
from synapse_core.exceptions import ValidationError
from synapse_structure.autocorrelation import compute_autocorrelation
from synapse_structure.motifs import discover_motifs_and_discords
from synapse_structure.recurrence import compute_recurrence_matrix


class StructureEngine(AnalysisEngine):
    """
    Independent Scientific Engine for Temporal Structure Discovery.
    """

    @property
    def engine_name(self) -> str:
        return "STRUCTURE"

    @property
    def engine_version(self) -> str:
        return "1.0.0"

    def validate(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> None:
        if not isinstance(signal, Signal):
            raise ValidationError(f"Expected Signal, got {type(signal)}.")
        signal.require_uniform_sampling(self.engine_name)
        if signal.n_samples < 8:
            raise ValidationError("Signal too short for temporal structure discovery.")

    def estimate_resources(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> ResourceEstimate:
        n = signal.n_samples
        # ACF is O(N log N), motif is O(K^2 * M)
        mem_bytes = int(n * 16 * 8)
        runtime_sec = float(n * np.log2(n) * 2e-7)
        return ResourceEstimate(
            estimated_memory_bytes=mem_bytes,
            estimated_runtime_seconds=runtime_sec,
            time_complexity_notation="O(N log N)",
            space_complexity_notation="O(N)",
            is_safe_for_browser=bool(mem_bytes < 25_000_000),
        )

    def execute(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> AnalysisResult:
        t0 = time.perf_counter()
        self.validate(signal, config)

        cfg = config or {}
        channel_idx = cfg.get("channel", 0)
        window_motif = cfg.get("motif_window", 32)
        fs = signal.require_uniform_sampling(self.engine_name)

        vals = signal.get_channel(channel_idx)
        ts = signal.timestamps

        findings: List[Finding] = []

        # 1. Autocorrelation & Periodicity
        acf_res = compute_autocorrelation(vals, sampling_rate=fs)
        if acf_res.dominant_period_sec is not None and acf_res.dominant_frequency_hz is not None:
            findings.append(
                Finding(
                    label=f"Dominant Periodicity T={acf_res.dominant_period_sec:.4f}s ({acf_res.dominant_frequency_hz:.2f} Hz)",
                    finding_type=FindingType.PERIODICITY,
                    value=acf_res.dominant_period_sec,
                    unit="s",
                    confidence_level=0.85,
                    status=FindingStatus.CANDIDATE,
                    details={
                        "lag_samples": acf_res.dominant_lag_samples,
                        "frequency_hz": acf_res.dominant_frequency_hz,
                        "period_sec": acf_res.dominant_period_sec,
                    },
                )
            )

        # 2. Motif and Discord Discovery
        motif, discord = discover_motifs_and_discords(vals, ts, window_length=window_motif)
        if motif is not None:
            findings.append(
                Finding(
                    label=f"Recurring Motif Pair (t1={motif.time_a:.2f}s, t2={motif.time_b:.2f}s)",
                    finding_type=FindingType.MOTIF,
                    value=motif.distance,
                    unit="distance",
                    status=FindingStatus.CANDIDATE,
                    details={
                        "start_time_a": motif.time_a,
                        "start_time_b": motif.time_b,
                        "window_length": motif.window_length,
                        "distance": motif.distance,
                    },
                )
            )

        if discord is not None:
            findings.append(
                Finding(
                    label=f"Temporal Discord Subsequence at t={discord.start_time:.2f}s",
                    finding_type=FindingType.TRANSIENT_ANOMALY,
                    value=discord.nearest_neighbor_distance,
                    unit="distance",
                    status=FindingStatus.CANDIDATE,
                    details={
                        "start_time": discord.start_time,
                        "window_length": discord.window_length,
                        "nn_distance": discord.nearest_neighbor_distance,
                    },
                )
            )

        # 3. Recurrence Quantification Analysis
        rqa = compute_recurrence_matrix(vals)

        metrics = {
            "recurrence_rate": MetricValue("Recurrence Rate", rqa.recurrence_rate, "ratio", "Density of recurrence matrix points."),
            "determinism": MetricValue("Determinism (DET)", rqa.determinism, "ratio", "Fraction of recurrence points forming diagonal lines."),
        }
        if acf_res.dominant_period_sec is not None:
            metrics["autocorr_period"] = MetricValue("ACF Period", acf_res.dominant_period_sec, "s")
            assert acf_res.dominant_frequency_hz is not None
            metrics["autocorr_freq"] = MetricValue("ACF Frequency", acf_res.dominant_frequency_hz, "Hz")

        exec_time = float(time.perf_counter() - t0)

        result = AnalysisResult(
            analysis_id=str(uuid.uuid4()),
            engine_name=self.engine_name,
            engine_version=self.engine_version,
            dataset_hash=signal.quality.content_hash_sha256,
            parameters={
                "channel": channel_idx,
                "motif_window": window_motif,
            },
            findings=tuple(findings),
            metrics=metrics,
            warnings=(),
            execution_time_seconds=exec_time,
        )

        self.validate_result(result)
        return result

