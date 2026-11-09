"""
Robust Z-Score and Median Absolute Deviation (MAD) Anomaly Detection for SYNAPSE ANOMALY.
Provides robust scaling insensitive to existing extreme outliers.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List, Tuple, Optional
import numpy as np


@dataclass(frozen=True)
class AnomalyEvent:
    start_index: int
    end_index: int
    start_time: float
    end_time: float
    duration_sec: float
    peak_magnitude: float
    peak_z_score: float
    baseline_median: float
    baseline_mad: float
    detection_method: str = "robust_zscore_mad"


def compute_robust_zscore(
    values: np.ndarray,
    timestamps: np.ndarray,
    threshold: float = 3.5,
) -> Tuple[np.ndarray, List[AnomalyEvent], float, float]:
    """
    Compute robust z-scores:
    z_r = (x - median(x)) / (1.4826 * MAD(x))
    
    Returns (z_scores_array, events_list, median_val, mad_val).
    """
    x = np.asarray(values, dtype=np.float64)
    med = float(np.median(x))
    abs_dev = np.abs(x - med)
    mad = float(np.median(abs_dev))

    # Scale factor 1.4826 relates MAD to standard deviation for normal distributions
    scale = 1.4826 * mad
    if scale <= 1e-12:
        # Near-zero variance
        z_scores = np.zeros_like(x)
        return z_scores, [], med, mad

    z_scores = (x - med) / scale
    anomaly_mask = np.abs(z_scores) >= threshold

    # Group contiguous outlier points into distinct events
    events: List[AnomalyEvent] = []
    in_event = False
    start_idx = 0

    for i in range(len(x)):
        if anomaly_mask[i] and not in_event:
            in_event = True
            start_idx = i
        elif not anomaly_mask[i] and in_event:
            in_event = False
            end_idx = i - 1
            ev_z = z_scores[start_idx : end_idx + 1]
            peak_sub_idx = int(np.argmax(np.abs(ev_z)))
            peak_idx = start_idx + peak_sub_idx
            
            t_start = float(timestamps[start_idx])
            t_end = float(timestamps[end_idx])
            events.append(
                AnomalyEvent(
                    start_index=start_idx,
                    end_index=end_idx,
                    start_time=t_start,
                    end_time=t_end,
                    duration_sec=max(0.0, t_end - t_start),
                    peak_magnitude=float(x[peak_idx]),
                    peak_z_score=float(z_scores[peak_idx]),
                    baseline_median=med,
                    baseline_mad=mad,
                )
            )

    if in_event:
        end_idx = len(x) - 1
        ev_z = z_scores[start_idx : end_idx + 1]
        peak_sub_idx = int(np.argmax(np.abs(ev_z)))
        peak_idx = start_idx + peak_sub_idx
        t_start = float(timestamps[start_idx])
        t_end = float(timestamps[end_idx])
        events.append(
            AnomalyEvent(
                start_index=start_idx,
                end_index=end_idx,
                start_time=t_start,
                end_time=t_end,
                duration_sec=max(0.0, t_end - t_start),
                peak_magnitude=float(x[peak_idx]),
                peak_z_score=float(z_scores[peak_idx]),
                baseline_median=med,
                baseline_mad=mad,
            )
        )

    z_scores.flags.writeable = False
    return z_scores, events, med, mad

