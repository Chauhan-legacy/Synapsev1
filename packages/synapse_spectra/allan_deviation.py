"""
Allan Deviation Analysis for SYNAPSE SPECTRA.
Computes overlapping Allan Deviation sigma_y(tau) across octave integration times
to characterize noise processes and temporal stability.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class AllanDeviationResult:
    taus_seconds: np.ndarray            # Integration times tau [s]
    allan_deviation: np.ndarray         # Overlapping Allan Deviation sigma_y(tau)
    dominant_noise_type: str            # Identified noise process from log-log slope
    log_log_slope: float                # Linear slope d(log sigma)/d(log tau)


def compute_allan_deviation(
    values: np.ndarray,
    sampling_rate: float,
    taus: Optional[np.ndarray] = None,
) -> AllanDeviationResult:
    """
    Compute Overlapping Allan Deviation across integration times tau.
    """
    y = np.asarray(values, dtype=np.float64)
    n = len(y)
    if n < 16:
        raise ValidationError("Need at least 16 samples for Allan deviation.")
    if sampling_rate <= 0:
        raise ValidationError(f"Invalid sampling rate {sampling_rate}.")

    dt = 1.0 / sampling_rate

    # Default octave multiples of dt: m = 1, 2, 4, 8, ... up to N/4
    if taus is None:
        max_m = max(1, n // 4)
        m_factors = []
        cur_m = 1
        while cur_m <= max_m:
            m_factors.append(cur_m)
            cur_m *= 2
        m_factors = np.array(m_factors, dtype=int)
    else:
        m_factors = np.maximum(1, np.round(taus * sampling_rate).astype(int))
        m_factors = np.unique(m_factors[m_factors <= n // 4])

    devs = []
    actual_taus = []

    # Integrate series x(t) = sum y(t)*dt to convert fractional frequency to phase
    phase_x = np.cumsum(y) * dt

    for m in m_factors:
        tau_val = m * dt
        # Overlapping second-difference: x[i + 2m] - 2*x[i + m] + x[i]
        diffs = phase_x[2 * m :] - 2.0 * phase_x[m : -m] + phase_x[: -2 * m]
        if len(diffs) > 0:
            var_allan = np.sum(diffs ** 2) / (2.0 * (len(diffs)) * (tau_val ** 2))
            devs.append(np.sqrt(max(0.0, var_allan)))
            actual_taus.append(tau_val)

    actual_taus_arr = np.array(actual_taus, dtype=np.float64)
    devs_arr = np.array(devs, dtype=np.float64)

    # Estimate slope on log-log plot
    if len(actual_taus_arr) >= 2 and np.all(devs_arr > 0):
        log_tau = np.log10(actual_taus_arr)
        log_dev = np.log10(devs_arr)
        slope, _ = np.polyfit(log_tau, log_dev, 1)
        slope = float(slope)
    else:
        slope = 0.0

    # Classification from slope mu:
    # mu = -1: White Phase Noise
    # mu = -0.5: White Frequency Noise
    # mu = 0: Flicker Frequency Noise
    # mu = +0.5: Random Walk Frequency Noise
    if slope < -0.75:
        noise_cls = "White Phase Modulation (slope ~ -1.0)"
    elif -0.75 <= slope < -0.25:
        noise_cls = "White Frequency Modulation (slope ~ -0.5)"
    elif -0.25 <= slope < 0.25:
        noise_cls = "Flicker Frequency Modulation (slope ~ 0.0)"
    else:
        noise_cls = "Random Walk Frequency Drift (slope > 0.25)"

    return AllanDeviationResult(
        taus_seconds=actual_taus_arr,
        allan_deviation=devs_arr,
        dominant_noise_type=noise_cls,
        log_log_slope=slope,
    )

