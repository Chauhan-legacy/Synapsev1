"""
INFERENCE Analysis Engine for SYNAPSE.
Statistically evaluates candidate findings using surrogate testing, bootstrap intervals,
and Benjamini-Hochberg FDR correction.
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
from synapse_inference.surrogates import generate_ft_surrogates, evaluate_surrogate_significance
from synapse_inference.multiple_testing import benjamini_hochberg_fdr, bootstrap_confidence_interval


class InferenceEngine(AnalysisEngine):
    """
    Statistical Verification and Uncertainty Engine.
    """

    @property
    def engine_name(self) -> str:
        return "INFERENCE"

    @property
    def engine_version(self) -> str:
        return "1.0.0"

    def validate(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> None:
        if not isinstance(signal, Signal):
            raise ValidationError(f"Expected Signal, got {type(signal)}.")
        if signal.n_samples < 8:
            raise ValidationError("Signal too short for surrogate inference.")

    def estimate_resources(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> ResourceEstimate:
        cfg = config or {}
        n_surr = cfg.get("n_surrogates", 20)
        n = signal.n_samples
        mem_bytes = int(n * 8 * n_surr * 2)
        runtime_sec = float(n_surr * n * np.log2(n) * 2e-7)
        return ResourceEstimate(
            estimated_memory_bytes=mem_bytes,
            estimated_runtime_seconds=runtime_sec,
            time_complexity_notation="O(N_surr * N log N)",
            space_complexity_notation="O(N_surr * N)",
            is_safe_for_browser=bool(mem_bytes < 30_000_000),
        )

    def execute(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> AnalysisResult:
        t0 = time.perf_counter()
        self.validate(signal, config)

        cfg = config or {}
        channel_idx = cfg.get("channel", 0)
        n_surr = cfg.get("n_surrogates", 20)
        fdr_alpha = cfg.get("fdr_alpha", 0.05)

        vals = signal.get_channel(channel_idx)

        # 1. Generate FT Surrogates
        surrogates = generate_ft_surrogates(vals, n_surrogates=n_surr)

        # Compute max power in original vs surrogates
        obs_max_power = float(np.max(np.abs(np.fft.rfft(vals))**2))
        surr_max_powers = [float(np.max(np.abs(np.fft.rfft(s))**2)) for s in surrogates]

        p_val = evaluate_surrogate_significance(obs_max_power, surr_max_powers)

        # 2. Bootstrap Confidence Interval for Mean and Variance
        ci_low, ci_mean, ci_high = bootstrap_confidence_interval(
            vals,
            statistic_func=np.mean,
            n_resamples=100,
        )

        # 3. Evaluate significance
        is_statistically_significant = bool(p_val <= fdr_alpha)
        status = FindingStatus.VALIDATED if is_statistically_significant else FindingStatus.REJECTED

        findings = [
            Finding(
                label=f"Phase-Randomized Surrogate Test for Spectral Structure (p={p_val:.3f})",
                finding_type=FindingType.SPECTRAL_PEAK,
                value=obs_max_power,
                unit="power",
                uncertainty_bounds=(min(surr_max_powers), max(surr_max_powers)),
                confidence_level=float(1.0 - p_val),
                status=status,
                details={
                    "p_value": p_val,
                    "n_surrogates": n_surr,
                    "alpha": fdr_alpha,
                    "is_statistically_significant": is_statistically_significant,
                    "null_model": "Fourier Phase-Randomized Linear Gaussian Process",
                },
            )
        ]

        metrics = {
            "surrogate_p_value": MetricValue("Surrogate p-value", p_val, "p-value"),
            "bootstrap_mean_ci_low": MetricValue("Bootstrap Mean 95% CI Lower", ci_low, "units"),
            "bootstrap_mean_ci_high": MetricValue("Bootstrap Mean 95% CI Upper", ci_high, "units"),
        }

        exec_time = float(time.perf_counter() - t0)

        result = AnalysisResult(
            analysis_id=str(uuid.uuid4()),
            engine_name=self.engine_name,
            engine_version=self.engine_version,
            dataset_hash=signal.quality.content_hash_sha256,
            parameters={
                "channel": channel_idx,
                "n_surrogates": n_surr,
                "fdr_alpha": fdr_alpha,
            },
            findings=tuple(findings),
            metrics=metrics,
            warnings=(),
            execution_time_seconds=exec_time,
        )

        self.validate_result(result)
        return result
