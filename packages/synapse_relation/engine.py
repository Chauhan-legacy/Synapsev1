"""
RELATION Analysis Engine for SYNAPSE.
Discovers inter-channel correlations, time delays, spectral coherence, and principal components.
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
from synapse_relation.correlation import compute_multichannel_correlations, compute_cross_correlation
from synapse_relation.coherence import compute_spectral_coherence
from synapse_relation.pca import compute_multichannel_pca, compute_mutual_information


class RelationEngine(AnalysisEngine):
    """
    Multichannel Inter-Relationship Analysis Engine.
    """

    @property
    def engine_name(self) -> str:
        return "RELATION"

    @property
    def engine_version(self) -> str:
        return "1.0.0"

    def validate(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> None:
        if not isinstance(signal, Signal):
            raise ValidationError(f"Expected Signal, got {type(signal)}.")
        if signal.n_channels < 2:
            raise ValidationError(
                f"RELATION engine requires at least 2 channels, but signal only has {signal.n_channels}."
            )

    def estimate_resources(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> ResourceEstimate:
        n = signal.n_samples
        c = signal.n_channels
        mem_bytes = int(n * c * 8 * 2)
        runtime_sec = float(c * c * n * np.log2(n) * 1e-7)
        return ResourceEstimate(
            estimated_memory_bytes=mem_bytes,
            estimated_runtime_seconds=runtime_sec,
            time_complexity_notation="O(C^2 * N log N)",
            space_complexity_notation="O(C * N)",
            is_safe_for_browser=bool(mem_bytes < 20_000_000),
        )

    def execute(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> AnalysisResult:
        t0 = time.perf_counter()
        self.validate(signal, config)

        cfg = config or {}
        ch_a = cfg.get("channel_a", 0)
        ch_b = cfg.get("channel_b", 1)
        fs = signal.sampling_rate if signal.is_uniform else (1.0 / signal.sampling.mean_dt)

        vals = signal.values
        ch_names = signal.channel_names

        findings: List[Finding] = []

        # 1. Pearson & Spearman matrices
        pearson_mat, spearman_mat = compute_multichannel_correlations(vals)

        # 2. Pairwise Cross-correlation for channel_a & channel_b
        cc_res = compute_cross_correlation(vals[:, ch_a], vals[:, ch_b], sampling_rate=fs)
        findings.append(
            Finding(
                label=f"Cross-Correlation Peak ({ch_names[ch_a]} vs {ch_names[ch_b]}): r={cc_res.peak_correlation:.2f} at lag={cc_res.peak_lag_sec:+.3f}s",
                finding_type=FindingType.CORRELATION,
                value=cc_res.peak_correlation,
                unit="correlation",
                confidence_level=min(0.99, abs(cc_res.peak_correlation)),
                status=FindingStatus.CANDIDATE,
                limitations=("Correlation and time lag do not imply causality.",),
                details={
                    "channel_a": ch_names[ch_a],
                    "channel_b": ch_names[ch_b],
                    "peak_lag_sec": cc_res.peak_lag_sec,
                    "peak_correlation": cc_res.peak_correlation,
                },
            )
        )

        # 3. Spectral Coherence
        coh_res = compute_spectral_coherence(vals[:, ch_a], vals[:, ch_b], sampling_rate=fs)
        if coh_res.peak_coherence > 0.5:
            findings.append(
                Finding(
                    label=f"High Spectral Coherence C={coh_res.peak_coherence:.2f} at {coh_res.peak_frequency_hz:.2f} Hz",
                    finding_type=FindingType.CORRELATION,
                    value=coh_res.peak_coherence,
                    unit="coherence",
                    status=FindingStatus.CANDIDATE,
                    details={
                        "peak_frequency_hz": coh_res.peak_frequency_hz,
                        "peak_coherence": coh_res.peak_coherence,
                        "mean_coherence": coh_res.mean_coherence,
                    },
                )
            )

        # 4. Mutual Information
        mi_val = compute_mutual_information(vals[:, ch_a], vals[:, ch_b])

        # 5. Multichannel PCA
        pca_res = compute_multichannel_pca(vals)

        metrics = {
            "pair_pearson": MetricValue("Pearson Correlation", float(pearson_mat[ch_a, ch_b]), "r"),
            "pair_spearman": MetricValue("Spearman Rank Correlation", float(spearman_mat[ch_a, ch_b]), "rho"),
            "pair_mutual_info": MetricValue("Mutual Information", mi_val, "bits"),
            "pc1_explained_variance": MetricValue("PC1 Explained Variance", float(pca_res.explained_variance_ratio[0]), "ratio"),
        }

        warnings_list = [
            WarningMessage(
                code="CAUSALITY_WARNING",
                message="Correlation and coherence quantify linear/spectral association; they do not establish causal direction.",
                severity="info",
            )
        ]

        exec_time = float(time.perf_counter() - t0)

        result = AnalysisResult(
            analysis_id=str(uuid.uuid4()),
            engine_name=self.engine_name,
            engine_version=self.engine_version,
            dataset_hash=signal.quality.content_hash_sha256,
            parameters={
                "channel_a": ch_a,
                "channel_b": ch_b,
            },
            findings=tuple(findings),
            metrics=metrics,
            warnings=tuple(warnings_list),
            execution_time_seconds=exec_time,
        )

        self.validate_result(result)
        return result

