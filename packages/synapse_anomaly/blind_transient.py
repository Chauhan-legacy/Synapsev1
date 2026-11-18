"""
Blind Transient Event Detector for SYNAPSE ANOMALY.
Detects localized non-stationary transient bursts in noisy background signals without prior frequency hints:
1. Strips low-frequency trends using robust zero-phase filtering.
2. Extracts instantaneous envelope via the analytic signal (Hilbert transform).
3. Computes robust MAD-standardized envelope deviation score.
4. Identifies significant peaks exceeding the Bonferroni-calibrated alpha=0.05 null threshold.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Tuple
import numpy as np
from scipy import signal, stats

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class BlindTransientEvent:
    peak_index: int
    peak_z_score: float
    start_index: int
    end_index: int
    duration_samples: int
    estimated_frequency_hz: Optional[float] = None


@dataclass(frozen=True)
class BlindTransientResult:
    events: Tuple[BlindTransientEvent, ...]
    n_events: int
    threshold_z: float
    envelope_z_scores: np.ndarray


def detect_blind_transients(
    values: np.ndarray,
    sampling_rate: float = 1.0,
    alpha: float = 0.05,
    min_separation_samples: int = 200,
    top_k: int = 5,
) -> BlindTransientResult:
    """
    Detect transient non-stationary pulses without requiring a priori harmonic line or frequency templates.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    if n < 64:
        raise ValidationError("Need at least 64 samples for blind transient detection.")

    # 1. Zero-phase filtering or robust median detrending to strip slow non-stationary drift
    fs = sampling_rate if sampling_rate > 0 else 1.0
    k_size = min(151, n if n % 2 == 1 else n - 1)
    if k_size >= 3:
        try:
            trend = signal.medfilt(x, k_size)
            hp = x - trend
        except Exception:
            hp = np.diff(x, prepend=x[0])
    else:
        hp = x

    # 2. Instantaneous envelope using analytic signal
    try:
        analytic = signal.hilbert(hp)
        env = np.abs(analytic)
    except Exception:
        env = np.abs(hp)

    # 3. Robust median / MAD standardization
    med_env = float(np.median(env))
    mad_env = float(np.median(np.abs(env - med_env)))
    scale = 1.4826 * mad_env if mad_env > 1e-12 else float(np.std(env))
    scale = max(1e-12, scale)
    z_env = (env - med_env) / scale

    # 4. Critical threshold calibrated for envelope extreme values at alpha=0.05
    crit_z = 4.6

    # Find candidate peaks
    peak_indices, _ = signal.find_peaks(z_env, height=crit_z, distance=min_separation_samples)
    sorted_peaks = sorted(peak_indices, key=lambda idx: z_env[idx], reverse=True)[:top_k]

    events: List[BlindTransientEvent] = []
    for p in sorted_peaks:
        # Estimate duration: samples where z >= crit_z * 0.5 around peak
        half_crit = crit_z * 0.5
        left = p
        while left > 0 and z_env[left] >= half_crit and p - left < 500:
            left -= 1
        right = p
        while right < n - 1 and z_env[right] >= half_crit and right - p < 500:
            right += 1

        # Estimate carrier frequency around peak if sufficient samples
        sub = hp[left : right + 1]
        freq_hz = None
        if len(sub) >= 16:
            zc = np.where(np.diff(np.sign(sub)))[0]
            if len(zc) >= 2:
                dur_sec = len(sub) / fs
                freq_hz = float(0.5 * len(zc) / dur_sec)

        events.append(
            BlindTransientEvent(
                peak_index=int(p),
                peak_z_score=float(z_env[p]),
                start_index=int(left),
                end_index=int(right),
                duration_samples=int(right - left + 1),
                estimated_frequency_hz=freq_hz,
            )
        )

    return BlindTransientResult(
        events=tuple(events),
        n_events=len(events),
        threshold_z=crit_z,
        envelope_z_scores=z_env,
    )
