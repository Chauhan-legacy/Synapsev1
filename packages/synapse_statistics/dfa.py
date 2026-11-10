"""
Detrended Fluctuation Analysis (DFA) and Hurst Exponent for SYNAPSE STATISTICS.
Measures long-range temporal correlations and power-law scaling in time series.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class DFAResult:
    hurst_exponent: float               # Scaling exponent alpha (~ Hurst H)
    hurst_std_err: float
    r_squared: float                    # Linear log-log fit quality
    interpretation: str                 # Anti-persistent, Random, Persistent, 1/f
    scale_sizes: np.ndarray             # Window sizes s
    fluctuations: np.ndarray            # Fluctuation function F(s)


def compute_dfa(
    values: np.ndarray,
    min_scale: int = 10,
    max_scale: Optional[int] = None,
    n_scales: int = 20,
    order: int = 1,
) -> DFAResult:
    """
    Compute Detrended Fluctuation Analysis (DFA) and estimate the Hurst exponent.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    if n < 64:
        raise ValidationError("Need at least 64 samples for Detrended Fluctuation Analysis.")

    # 1. Integrate the zero-mean profile
    y = np.cumsum(x - np.mean(x))

    # Scales s spaced logarithmically from min_scale to N/4
    max_s = max_scale or max(min_scale * 2, n // 4)
    scales = np.unique(np.round(np.geomspace(min_scale, max_s, n_scales)).astype(int))

    fluctuations = []
    valid_scales = []

    for s in scales:
        n_segments = n // s
        if n_segments < 2:
            continue

        # Forward and backward segments to use full series
        forward_segments = [y[i * s : (i + 1) * s] for i in range(n_segments)]
        backward_segments = [y[n - (i + 1) * s : n - i * s] for i in range(n_segments)]
        all_segments = forward_segments + backward_segments

        time_axis = np.arange(s)
        sq_errors = []

        for seg in all_segments:
            # Fit polynomial trend (order 1 = linear DFA-1)
            poly_coeffs = np.polyfit(time_axis, seg, deg=order)
            trend = np.polyval(poly_coeffs, time_axis)
            sq_err = np.mean((seg - trend) ** 2)
            sq_errors.append(sq_err)

        f_s = np.sqrt(np.mean(sq_errors))
        if f_s > 0:
            fluctuations.append(f_s)
            valid_scales.append(s)

    s_arr = np.array(valid_scales, dtype=np.float64)
    f_arr = np.array(fluctuations, dtype=np.float64)

    if len(s_arr) < 3:
        raise ValidationError("Insufficient valid scales for DFA regression.")

    # Linear regression in log-log space: log(F(s)) = alpha * log(s) + C
    log_s = np.log10(s_arr)
    log_f = np.log10(f_arr)

    # Robust polyfit
    p, cov = np.polyfit(log_s, log_f, deg=1, cov=True)
    alpha = float(p[0])
    stderr = float(np.sqrt(cov[0, 0])) if cov is not None else 0.05

    # R^2
    fit_vals = np.polyval(p, log_s)
    ss_res = np.sum((log_f - fit_vals) ** 2)
    ss_tot = np.sum((log_f - np.mean(log_f)) ** 2)
    r2 = float(1.0 - (ss_res / ss_tot)) if ss_tot > 0 else 1.0

    # Interpretation
    if alpha < 0.45:
        interp = "Anti-persistent / Mean-reverting (H < 0.5)"
    elif 0.45 <= alpha <= 0.55:
        interp = "Uncorrelated White Noise / Random Walk increments (H ~ 0.5)"
    elif 0.55 < alpha < 0.95:
        interp = "Long-Range Persistent Memory (0.5 < H < 1.0)"
    elif 0.95 <= alpha <= 1.05:
        interp = "1/f Pink Noise Dynamics (H ~ 1.0)"
    else:
        interp = "Non-stationary Brownian Diffusion (H > 1.0)"

    return DFAResult(
        hurst_exponent=alpha,
        hurst_std_err=stderr,
        r_squared=r2,
        interpretation=interp,
        scale_sizes=s_arr,
        fluctuations=f_arr,
    )

