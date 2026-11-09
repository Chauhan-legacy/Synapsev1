"""
SPECTRA Analysis Engine.
Implements the universal AnalysisEngine contract for frequency and time-frequency analysis.
"""

from __future__ import annotations
import time
import uuid
from typing import Dict, Any, Optional, List, Tuple
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
from synapse_core.exceptions import ValidationError, IncompatibleSamplingError
from synapse_spectra.fft import compute_fft, compute_ifft
from synapse_spectra.psd import compute_welch_psd
from synapse_spectra.stft import compute_stft
from synapse_spectra.cwt import compute_cwt
from synapse_spectra.peaks import detect_spectral_peaks, detect_harmonic_series
from synapse_spectra.entropy import compute_spectral_entropy


class SpectraEngine(AnalysisEngine):
    """
    Independent Scientific Engine for Frequency-Domain and Time-Frequency Analysis.
    """

    @property
    def engine_name(self) -> str:
        return "SPECTRA"

    @property
    def engine_version(self) -> str:
        return "1.0.0"

    def validate(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> None:
        """Enforces that signal is uniformly sampled and contains valid numeric data."""
        if not isinstance(signal, Signal):
            raise ValidationError(f"Expected Signal instance, got {type(signal)}.")
        
        # Enforce uniform sampling
        signal.require_uniform_sampling(self.engine_name)

        if signal.n_samples < 8:
            raise ValidationError(f"Signal length ({signal.n_samples}) is too short for spectral decomposition.")

    def estimate_resources(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> ResourceEstimate:
        cfg = config or {}
        mode = cfg.get("mode", "fft")
        n = signal.n_samples
        c = signal.n_channels

        if mode == "cwt":
            n_scales = cfg.get("n_scales", 64)
            # Memory: complex128 2D array of (n_scales, n)
            mem_bytes = int(n * n_scales * 16 * c * 2)
            runtime_sec = float(n * n_scales * 1e-6)
            t_comp = "O(S * N log N)"
            s_comp = "O(S * N)"
            is_browser = bool(mem_bytes < 50_000_000)
        elif mode == "stft":
            mem_bytes = int(n * 64 * 16 * c)
            runtime_sec = float(n * 5e-7)
            t_comp = "O(N log N_seg)"
            s_comp = "O(N_freq * N_time)"
            is_browser = bool(mem_bytes < 25_000_000)
        else:
            # FFT / Welch
            mem_bytes = int(n * 8 * 8 * c)
            runtime_sec = float(n * np.log2(n) * 1e-7)
            t_comp = "O(N log N)"
            s_comp = "O(N)"
            is_browser = bool(mem_bytes < 10_000_000)

        return ResourceEstimate(
            estimated_memory_bytes=mem_bytes,
            estimated_runtime_seconds=runtime_sec,
            time_complexity_notation=t_comp,
            space_complexity_notation=s_comp,
            is_safe_for_browser=is_browser,
        )

    def execute(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> AnalysisResult:
        t0 = time.perf_counter()
        self.validate(signal, config)

        cfg = config or {}
        channel_idx = cfg.get("channel", 0)
        window_type = cfg.get("window", "hann")
        detrend = cfg.get("detrend", True)
        min_snr_db = cfg.get("min_snr_db", 6.0)

        fs = signal.require_uniform_sampling(self.engine_name)
        channel_data = signal.get_channel(channel_idx)

        # 1. Compute rigorous FFT
        fft_res = compute_fft(
            channel_data,
            sampling_rate=fs,
            window_type=window_type,
            detrend=detrend,
        )

        # 2. Compute Welch PSD
        welch_res = compute_welch_psd(
            channel_data,
            sampling_rate=fs,
            window_type=window_type,
        )

        # 3. Detect dominant spectral peaks
        peaks = detect_spectral_peaks(
            fft_res.frequencies,
            fft_res.amplitudes,
            min_snr_db=min_snr_db,
        )

        # 4. Detect harmonic series
        harmonics = detect_harmonic_series(peaks)

        # 5. Compute spectral entropy
        entropy_val = compute_spectral_entropy(fft_res.power)

        # Build findings list
        findings: List[Finding] = []
        for p in peaks:
            findings.append(
                Finding(
                    label=f"Candidate Peak at {p.frequency_hz:.2f} Hz",
                    finding_type=FindingType.SPECTRAL_PEAK,
                    value=p.frequency_hz,
                    unit="Hz",
                    uncertainty_bounds=(
                        p.frequency_hz - fft_res.frequency_resolution_hz / 2.0,
                        p.frequency_hz + fft_res.frequency_resolution_hz / 2.0,
                    ),
                    confidence_level=min(0.99, float(1.0 - np.exp(-p.snr_db / 10.0))),
                    status=FindingStatus.CANDIDATE,
                    details={
                        "amplitude": p.amplitude,
                        "power": p.power,
                        "snr_db": p.snr_db,
                        "prominence": p.prominence,
                    },
                )
            )

        for h in harmonics:
            findings.append(
                Finding(
                    label=f"Harmonic Series with Fundamental {h.fundamental_hz:.2f} Hz",
                    finding_type=FindingType.HARMONIC_SERIES,
                    value=h.fundamental_hz,
                    unit="Hz",
                    status=FindingStatus.CANDIDATE,
                    details={
                        "harmonics_found": list(h.harmonics_found),
                        "orders": list(h.harmonic_orders),
                        "thd": h.total_harmonic_distortion,
                    },
                )
            )

        # Collect metrics
        metrics = {
            "frequency_resolution_hz": MetricValue(
                name="Frequency Resolution",
                value=fft_res.frequency_resolution_hz,
                unit="Hz",
                description="Rayleigh frequency bin spacing fs/N.",
            ),
            "spectral_entropy": MetricValue(
                name="Spectral Entropy",
                value=entropy_val,
                unit="dimensionless",
                description="Normalized Shannon entropy (0=pure sinusoidal, 1=white noise).",
            ),
            "total_power": MetricValue(
                name="Total Power",
                value=welch_res.total_power,
                unit="units^2",
                description="Integrated power across all frequency bands.",
            ),
            "parseval_error": MetricValue(
                name="Parseval Energy Error",
                value=fft_res.parseval_relative_error,
                unit="dimensionless",
                description="Discrepancy between time-domain and frequency-domain total energy.",
            ),
        }

        # Collect warnings
        warnings_list: List[WarningMessage] = []
        for w in fft_res.warnings:
            warnings_list.append(WarningMessage(code="FFT_LEAKAGE_OR_PADDING", message=w))
        if welch_res.tradeoff_explanation:
            warnings_list.append(
                WarningMessage(code="WELCH_TRADEOFF", message=welch_res.tradeoff_explanation, severity="info")
            )

        exec_time = float(time.perf_counter() - t0)

        result = AnalysisResult(
            analysis_id=str(uuid.uuid4()),
            engine_name=self.engine_name,
            engine_version=self.engine_version,
            dataset_hash=signal.quality.content_hash_sha256,
            parameters={
                "channel": channel_idx,
                "window": window_type,
                "detrend": detrend,
                "min_snr_db": min_snr_db,
            },
            findings=tuple(findings),
            metrics=metrics,
            warnings=tuple(warnings_list),
            execution_time_seconds=exec_time,
        )

        self.validate_result(result)
        return result

