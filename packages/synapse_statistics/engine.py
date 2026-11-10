"""
STATISTICS Analysis Engine for SYNAPSE.
Executes Stationarity (ADF/KPSS), Normality (Jarque-Bera/Shapiro-Wilk),
Autocorrelation Structure, Detrended Fluctuation Analysis (DFA), and Distribution Fitting.
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
from synapse_statistics.stationarity import evaluate_stationarity
from synapse_statistics.normality import evaluate_normality
from synapse_statistics.autocorr import compute_autocorr_structure
from synapse_statistics.dfa import compute_dfa
from synapse_statistics.distribution_fit import fit_candidate_distributions


class StatisticsEngine(AnalysisEngine):
    """
    Parametric and Non-parametric Time-Series Statistical Engine.
    """

    @property
    def engine_name(self) -> str:
        return "STATISTICS"

    @property
    def engine_version(self) -> str:
        return "2.0.0"

    def validate(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> None:
        if not isinstance(signal, Signal):
            raise ValidationError(f"Expected Signal, got {type(signal)}.")
        if signal.n_samples < 16:
            raise ValidationError("Signal must contain at least 16 samples for statistical testing.")

    def estimate_resources(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> ResourceEstimate:
        n = signal.n_samples
        mem_bytes = int(n * 8 * 4)
        runtime_sec = float(n * 1e-6 + 0.05)
        return ResourceEstimate(
            estimated_memory_bytes=mem_bytes,
            estimated_runtime_seconds=runtime_sec,
            time_complexity_notation="O(N log N)",
            space_complexity_notation="O(N)",
            is_safe_for_browser=True,
        )

    def execute(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> AnalysisResult:
        t0 = time.perf_counter()
        self.validate(signal, config)

        cfg = config or {}
        channel_idx = cfg.get("channel", 0)
        vals = signal.get_channel(channel_idx)

        # Run core routines
        stat_res = evaluate_stationarity(vals)
        norm_res = evaluate_normality(vals)
        acf_res = compute_autocorr_structure(vals)
        dfa_res = compute_dfa(vals)
        dist_res = fit_candidate_distributions(vals)

        findings: List[Finding] = []

        # Finding: Stationarity
        stat_finding_status = (
            FindingStatus.VALIDATED if stat_res.adf_is_stationary and stat_res.kpss_is_stationary
            else FindingStatus.STATISTICALLY_EVALUATED
        )
        findings.append(
            Finding(
                label=f"Stationarity Regime: {stat_res.regime_conclusion}",
                finding_type=FindingType.PERIODICITY,
                value=stat_res.adf_statistic,
                unit="ADF t-stat",
                confidence_level=float(1.0 - stat_res.adf_p_value),
                status=stat_finding_status,
                details={
                    "adf_p_value": stat_res.adf_p_value,
                    "kpss_p_value": stat_res.kpss_p_value,
                    "mean_drift_pct": stat_res.rolling_mean_drift_pct,
                },
            )
        )

        # Finding: Long-range dependence (DFA)
        findings.append(
            Finding(
                label=f"Long-Range Scaling: {dfa_res.interpretation} (alpha = {dfa_res.hurst_exponent:.3f})",
                finding_type=FindingType.PERIODICITY,
                value=dfa_res.hurst_exponent,
                unit="Hurst alpha",
                confidence_level=dfa_res.r_squared,
                status=FindingStatus.VALIDATED if dfa_res.r_squared > 0.9 else FindingStatus.STATISTICALLY_EVALUATED,
                details={
                    "r_squared": dfa_res.r_squared,
                    "std_err": dfa_res.hurst_std_err,
                },
            )
        )

        metrics = {
            "mean": MetricValue("Sample Mean", norm_res.mean, "units"),
            "median": MetricValue("Sample Median", norm_res.median, "units"),
            "std_dev": MetricValue("Standard Deviation", norm_res.std_dev, "units"),
            "skewness": MetricValue("Skewness", norm_res.skewness, "dimensionless"),
            "kurtosis": MetricValue("Excess Kurtosis", norm_res.kurtosis, "dimensionless"),
            "adf_p_value": MetricValue("ADF p-value", stat_res.adf_p_value, "p-value"),
            "kpss_p_value": MetricValue("KPSS p-value", stat_res.kpss_p_value, "p-value"),
            "shapiro_p_value": MetricValue("Shapiro-Wilk p-value", norm_res.shapiro_wilk_p_value, "p-value"),
            "ljung_box_p_value": MetricValue("Ljung-Box p-value", acf_res.ljung_box_p_value, "p-value"),
            "hurst_exponent": MetricValue("Hurst Exponent", dfa_res.hurst_exponent, "dimensionless"),
        }

        exec_time = float(time.perf_counter() - t0)

        return AnalysisResult(
            analysis_id=str(uuid.uuid4()),
            engine_name=self.engine_name,
            engine_version=self.engine_version,
            dataset_hash=signal.quality.content_hash_sha256,
            parameters={"channel": channel_idx},
            findings=tuple(findings),
            metrics=metrics,
            warnings=(),
            execution_time_seconds=exec_time,
            plain_language_summary=(
                f"Statistical profile: {stat_res.regime_conclusion}. "
                f"Distribution best fit: {dist_res.best_distribution}. "
                f"Scaling exponent alpha = {dfa_res.hurst_exponent:.3f} ({dfa_res.interpretation})."
            ),
        )
