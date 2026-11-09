"""
ANOMALY Analysis Engine for SYNAPSE.
Coordinates statistical, non-parametric, and change-point anomaly detectors.
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
    WarningMessage,
)
from synapse_core.exceptions import ValidationError
from synapse_anomaly.zscore import compute_robust_zscore
from synapse_anomaly.cusum import compute_cusum
from synapse_anomaly.changepoint import detect_change_points
from synapse_anomaly.isolation_forest import compute_isolation_forest_anomalies


class AnomalyEngine(AnalysisEngine):
    """
    Scientific Anomaly and Transient Event Detection Engine.
    """

    @property
    def engine_name(self) -> str:
        return "ANOMALY"

    @property
    def engine_version(self) -> str:
        return "1.0.0"

    def validate(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> None:
        if not isinstance(signal, Signal):
            raise ValidationError(f"Expected Signal instance, got {type(signal)}.")
        if signal.n_samples < 8:
            raise ValidationError("Signal too short for reliable anomaly estimation.")

    def estimate_resources(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> ResourceEstimate:
        n = signal.n_samples
        cfg = config or {}
        method = cfg.get("method", "all")

        if method == "isolation_forest" or method == "all":
            mem_bytes = int(n * 64 * 8)
            runtime_sec = float(n * 2e-5)
            t_comp = "O(n_trees * N log N)"
            s_comp = "O(N)"
        else:
            mem_bytes = int(n * 16 * 8)
            runtime_sec = float(n * 1e-6)
            t_comp = "O(N)"
            s_comp = "O(N)"

        return ResourceEstimate(
            estimated_memory_bytes=mem_bytes,
            estimated_runtime_seconds=runtime_sec,
            time_complexity_notation=t_comp,
            space_complexity_notation=s_comp,
            is_safe_for_browser=bool(mem_bytes < 20_000_000),
        )

    def execute(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> AnalysisResult:
        t0 = time.perf_counter()
        self.validate(signal, config)

        cfg = config or {}
        channel_idx = cfg.get("channel", 0)
        z_threshold = cfg.get("z_threshold", 3.5)

        vals = signal.get_channel(channel_idx)
        ts = signal.timestamps

        findings: List[Finding] = []

        # 1. Robust Z-score & MAD
        z_scores, events, med, mad = compute_robust_zscore(vals, ts, threshold=z_threshold)
        for ev in events:
            findings.append(
                Finding(
                    label=f"Transient Outlier (Peak z={ev.peak_z_score:+.2f}) at t={ev.start_time:.3f}s",
                    finding_type=FindingType.TRANSIENT_ANOMALY,
                    value=ev.peak_magnitude,
                    unit="units",
                    uncertainty_bounds=(ev.start_time, ev.end_time),
                    confidence_level=min(0.99, float(1.0 - np.exp(-abs(ev.peak_z_score) / 3.0))),
                    status=FindingStatus.CANDIDATE,
                    limitations=("Assumes symmetric deviations around median; sensitive to cluster contamination.",),
                    details={
                        "start_time": ev.start_time,
                        "end_time": ev.end_time,
                        "duration_sec": ev.duration_sec,
                        "peak_z_score": ev.peak_z_score,
                        "baseline_median": ev.baseline_median,
                        "baseline_mad": ev.baseline_mad,
                        "detection_method": ev.detection_method,
                    },
                )
            )

        # 2. Change Point Detection
        cps = detect_change_points(vals, ts)
        for cp in cps:
            findings.append(
                Finding(
                    label=f"Change Point at t={cp.timestamp:.3f}s",
                    finding_type=FindingType.CHANGE_POINT,
                    value=cp.timestamp,
                    unit="s",
                    confidence_level=cp.confidence_score,
                    status=FindingStatus.CANDIDATE,
                    details={
                        "sample_index": cp.index,
                        "pre_mean": cp.pre_mean,
                        "post_mean": cp.post_mean,
                        "pre_std": cp.pre_std,
                        "post_std": cp.post_std,
                        "method": cp.method,
                    },
                )
            )

        # 3. Isolation Forest (if requested or default)
        run_if = cfg.get("run_isolation_forest", True)
        contamination = cfg.get("contamination", 0.02)
        if run_if:
            if_res = compute_isolation_forest_anomalies(vals, contamination=contamination)
            total_if_anom = if_res.total_anomalies_detected
        else:
            total_if_anom = 0

        metrics = {
            "robust_median": MetricValue("Baseline Median", med, "units", "Median of channel."),
            "robust_mad": MetricValue("Baseline MAD", mad, "units", "Median Absolute Deviation."),
            "transient_events_count": MetricValue("Detected Outlier Events", float(len(events)), "events"),
            "change_points_count": MetricValue("Detected Change Points", float(len(cps)), "points"),
            "isolation_forest_anomalies": MetricValue("Isolation Forest Anomalies", float(total_if_anom), "samples"),
        }

        exec_time = float(time.perf_counter() - t0)

        result = AnalysisResult(
            analysis_id=str(uuid.uuid4()),
            engine_name=self.engine_name,
            engine_version=self.engine_version,
            dataset_hash=signal.quality.content_hash_sha256,
            parameters={
                "channel": channel_idx,
                "z_threshold": z_threshold,
                "run_isolation_forest": run_if,
            },
            findings=tuple(findings),
            metrics=metrics,
            warnings=(),
            execution_time_seconds=exec_time,
        )

        self.validate_result(result)
        return result

