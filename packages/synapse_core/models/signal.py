"""
Canonical Scientific Data Model for SYNAPSE.
Enforces immutability, mathematical integrity, explicit timestamp semantics,
and data-quality profiling.
"""

from __future__ import annotations
from dataclasses import dataclass, field
import hashlib
from typing import Tuple, Optional, Dict, Any, List
import numpy as np

from synapse_core.exceptions import (
    ValidationError,
    IncompatibleSamplingError,
    DataIntegrityError,
)


@dataclass(frozen=True)
class ChannelInfo:
    """Metadata describing a single observation channel."""
    name: str
    unit: str = "dimensionless"
    description: str = ""
    uncertainty_std: Optional[float] = None


@dataclass(frozen=True)
class SamplingMetadata:
    """Explicit time-axis sampling characteristics."""
    is_uniform: bool
    sampling_rate: Optional[float]
    mean_dt: float
    std_dt: float
    jitter_ratio: float
    tolerance: float
    total_samples: int
    duration: float
    has_duplicate_timestamps: bool
    is_strictly_monotonic: bool


@dataclass(frozen=True)
class ChannelQuality:
    """Per-channel quality metrics."""
    channel_name: str
    nan_count: int
    inf_count: int
    finite_count: int
    is_constant: bool
    min_val: float
    max_val: float
    mean_val: float
    std_val: float


@dataclass(frozen=True)
class SignalQualityReport:
    """Comprehensive data quality assessment for a Signal."""
    total_samples: int
    channel_count: int
    sampling: SamplingMetadata
    channel_quality: Tuple[ChannelQuality, ...]
    memory_bytes: int
    content_hash_sha256: str
    warnings: Tuple[str, ...]


class Signal:
    """
    Canonical immutable multidimensional scientific signal.
    
    Invariants:
    1. Arrays are strictly immutable (writeable flag set to False).
    2. Dimensions are standardized to (N, C) where N = samples, C = channels.
    3. Timestamp uniformity is calculated rigorously; never guessed from row count.
    4. Original raw data integrity is tracked via SHA-256 content hashing.
    """

    def __init__(
        self,
        values: np.ndarray,
        timestamps: np.ndarray,
        channels: Optional[List[ChannelInfo] | Tuple[ChannelInfo, ...]] = None,
        uniformity_tolerance: float = 1e-4,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        # Coerce values to numpy array
        raw_vals = np.asarray(values, dtype=np.float64)
        if raw_vals.ndim == 1:
            raw_vals = raw_vals.reshape(-1, 1)
        elif raw_vals.ndim != 2:
            raise ValidationError(
                f"Signal values must be 1D or 2D (samples, channels), got ndim={raw_vals.ndim}."
            )

        raw_ts = np.asarray(timestamps, dtype=np.float64)
        if raw_ts.ndim != 1:
            raise ValidationError(f"Timestamps must be 1D array, got ndim={raw_ts.ndim}.")

        n_samples, n_channels = raw_vals.shape
        if len(raw_ts) != n_samples:
            raise ValidationError(
                f"Sample count mismatch: values have {n_samples} samples, but timestamps have {len(raw_ts)}."
            )

        if n_samples < 2:
            raise ValidationError("Signal must contain at least 2 samples to compute intervals and sampling.")

        # Default channel information if omitted
        if channels is None:
            ch_list = [ChannelInfo(name=f"channel_{i}") for i in range(n_channels)]
        else:
            ch_list = list(channels)
            if len(ch_list) != n_channels:
                raise ValidationError(
                    f"Channels list length ({len(ch_list)}) does not match value channels ({n_channels})."
                )

        # Enforce memory immutability
        vals_copy = raw_vals.copy()
        vals_copy.flags.writeable = False

        ts_copy = raw_ts.copy()
        ts_copy.flags.writeable = False

        self._values = vals_copy
        self._timestamps = ts_copy
        self._channels = tuple(ch_list)
        self._metadata = dict(metadata or {})
        self._uniformity_tolerance = uniformity_tolerance

        # Evaluate time-axis characteristics
        self._sampling = self._compute_sampling_metadata(ts_copy, uniformity_tolerance)
        self._quality = self._compute_quality_report(vals_copy, ts_copy, self._sampling)

    @property
    def values(self) -> np.ndarray:
        """Returns read-only values array of shape (N, C)."""
        return self._values

    @property
    def timestamps(self) -> np.ndarray:
        """Returns read-only timestamps 1D array of shape (N,)."""
        return self._timestamps

    @property
    def channels(self) -> Tuple[ChannelInfo, ...]:
        return self._channels

    @property
    def channel_names(self) -> Tuple[str, ...]:
        return tuple(c.name for c in self._channels)

    @property
    def sampling(self) -> SamplingMetadata:
        return self._sampling

    @property
    def quality(self) -> SignalQualityReport:
        return self._quality

    @property
    def metadata(self) -> Dict[str, Any]:
        return self._metadata.copy()

    @property
    def n_samples(self) -> int:
        return self._values.shape[0]

    @property
    def n_channels(self) -> int:
        return self._values.shape[1]

    @property
    def sampling_rate(self) -> Optional[float]:
        return self._sampling.sampling_rate

    @property
    def is_uniform(self) -> bool:
        return self._sampling.is_uniform

    def get_channel(self, channel_idx_or_name: int | str) -> np.ndarray:
        """Extract a single channel as a 1D read-only view."""
        if isinstance(channel_idx_or_name, int):
            if channel_idx_or_name < 0 or channel_idx_or_name >= self.n_channels:
                raise IndexError(f"Channel index {channel_idx_or_name} out of bounds (0..{self.n_channels - 1}).")
            return self._values[:, channel_idx_or_name]
        
        for idx, ch in enumerate(self._channels):
            if ch.name == channel_idx_or_name:
                return self._values[:, idx]
        raise KeyError(f"Channel name '{channel_idx_or_name}' not found. Available: {self.channel_names}")

    def require_uniform_sampling(self, algorithm_name: str = "Algorithm") -> float:
        """
        Enforce uniform sampling invariant.
        Raises IncompatibleSamplingError if timestamps are irregular.
        """
        if not self._sampling.is_uniform:
            raise IncompatibleSamplingError(
                message=(
                    f"{algorithm_name} strictly requires uniform sampling. "
                    f"Signal has relative jitter of {self._sampling.jitter_ratio:.4e} "
                    f"(tolerance={self._uniformity_tolerance:.4e})."
                ),
                sampling_type="irregular",
                jitter_ratio=self._sampling.jitter_ratio,
                tolerance=self._uniformity_tolerance,
            )
        assert self._sampling.sampling_rate is not None
        return self._sampling.sampling_rate

    @staticmethod
    def _compute_sampling_metadata(timestamps: np.ndarray, tolerance: float) -> SamplingMetadata:
        dt = np.diff(timestamps)
        has_duplicates = bool(np.any(dt == 0))
        is_monotonic = bool(np.all(dt > 0))

        if not is_monotonic:
            if np.all(dt < 0):
                raise ValidationError("Timestamps are strictly decreasing; chronological ascending order required.")
            elif np.any(dt < 0):
                raise ValidationError("Timestamps are non-monotonic; out-of-order timestamps detected.")

        mean_dt = float(np.mean(dt))
        std_dt = float(np.std(dt))
        jitter_ratio = (std_dt / mean_dt) if mean_dt > 0 else float("inf")

        is_uniform = bool(jitter_ratio <= tolerance and mean_dt > 0)
        sampling_rate = (1.0 / mean_dt) if is_uniform else None
        duration = float(timestamps[-1] - timestamps[0])

        return SamplingMetadata(
            is_uniform=is_uniform,
            sampling_rate=sampling_rate,
            mean_dt=mean_dt,
            std_dt=std_dt,
            jitter_ratio=jitter_ratio,
            tolerance=tolerance,
            total_samples=len(timestamps),
            duration=duration,
            has_duplicate_timestamps=has_duplicates,
            is_strictly_monotonic=is_monotonic,
        )

    @staticmethod
    def _compute_quality_report(
        values: np.ndarray,
        timestamps: np.ndarray,
        sampling: SamplingMetadata,
    ) -> SignalQualityReport:
        warnings: List[str] = []
        n_samples, n_channels = values.shape

        if not sampling.is_uniform:
            warnings.append(
                f"Irregular sampling detected (jitter ratio {sampling.jitter_ratio:.2e} > tolerance {sampling.tolerance:.2e}). "
                "Standard frequency-domain transforms requiring uniform intervals will be rejected."
            )

        ch_qualities: List[ChannelQuality] = []
        for i in range(n_channels):
            col = values[:, i]
            nans = int(np.isnan(col).sum())
            infs = int(np.isinf(col).sum())
            finite_mask = np.isfinite(col)
            finite_count = int(finite_mask.sum())

            if finite_count > 0:
                finite_vals = col[finite_mask]
                min_v = float(np.min(finite_vals))
                max_v = float(np.max(finite_vals))
                mean_v = float(np.mean(finite_vals))
                std_v = float(np.std(finite_vals))
                is_const = bool(std_v == 0.0 or (max_v - min_v) == 0.0)
            else:
                min_v, max_v, mean_v, std_v = float("nan"), float("nan"), float("nan"), float("nan")
                is_const = True

            if is_const:
                warnings.append(f"Channel '{i}' exhibits zero variance (constant signal).")
            if nans > 0:
                warnings.append(f"Channel '{i}' contains {nans} missing values (NaNs).")
            if infs > 0:
                warnings.append(f"Channel '{i}' contains {infs} infinite values (Infs).")

            ch_qualities.append(
                ChannelQuality(
                    channel_name=f"ch_{i}",
                    nan_count=nans,
                    inf_count=infs,
                    finite_count=finite_count,
                    is_constant=is_const,
                    min_val=min_v,
                    max_val=max_v,
                    mean_val=mean_v,
                    std_val=std_v,
                )
            )

        # Compute SHA-256 content hash of contiguous byte stream
        hasher = hashlib.sha256()
        hasher.update(values.tobytes())
        hasher.update(timestamps.tobytes())
        content_hash = hasher.hexdigest()

        total_bytes = values.nbytes + timestamps.nbytes

        return SignalQualityReport(
            total_samples=n_samples,
            channel_count=n_channels,
            sampling=sampling,
            channel_quality=tuple(ch_qualities),
            memory_bytes=total_bytes,
            content_hash_sha256=content_hash,
            warnings=tuple(warnings),
        )

    def __repr__(self) -> str:
        sr_repr = f"{self.sampling_rate:.4f} Hz" if self.sampling_rate else "Irregular"
        return (
            f"<Signal samples={self.n_samples} channels={self.n_channels} "
            f"sampling={sr_repr} duration={self.sampling.duration:.4f}s>"
        )

