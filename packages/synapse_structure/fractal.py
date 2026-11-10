"""
Higuchi Fractal Dimension (HFD) Analysis for SYNAPSE STRUCTURE.
Measures the self-similarity and geometric roughness of time-series trajectories.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.stats as stats

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class HiguchiResult:
    fractal_dimension: float            # D in [1, 2]
    r_squared: float                    # Linear log-log scaling quality
    k_scales: np.ndarray                # Interval steps k
    curve_lengths: np.ndarray           # Mean curve lengths L(k)


def compute_higuchi_fractal_dimension(
    values: np.ndarray,
    k_max: int = 16,
) -> HiguchiResult:
    """
    Compute Higuchi Fractal Dimension (Higuchi 1988).
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    if n < 32:
        raise ValidationError("Need at least 32 samples for Higuchi fractal dimension.")

    k_max = min(k_max, n // 4)
    k_max = max(4, k_max)

    k_values = np.arange(1, k_max + 1)
    mean_lengths = []

    for k in k_values:
        lengths_m = []
        for m in range(1, k + 1):
            # Construct subseries: x[m - 1], x[m - 1 + k], ...
            indices = np.arange(m - 1, n, k)
            n_sub = len(indices)
            if n_sub < 2:
                continue

            sub_series = x[indices]
            diff_sum = np.sum(np.abs(np.diff(sub_series)))
            # Normalization factor (N - 1) / (floor((N - m)/k) * k)
            norm = (n - 1.0) / (float(n_sub - 1) * k)
            l_m = (diff_sum * norm) / k
            lengths_m.append(l_m)

        if lengths_m:
            mean_lengths.append(float(np.mean(lengths_m)))
        else:
            mean_lengths.append(1e-12)

    l_arr = np.array(mean_lengths, dtype=np.float64)

    # Linear regression in log-log space: ln(L(k)) = -D * ln(k) + C
    log_k = np.log(k_values)
    log_l = np.log(np.maximum(1e-12, l_arr))

    res = stats.linregress(log_k, log_l)
    d = -float(res.slope)
    r2 = float(res.rvalue ** 2)

    # Theoretical bound D in [1, 2]
    d_clamped = min(2.0, max(1.0, d))

    return HiguchiResult(
        fractal_dimension=d_clamped,
        r_squared=r2,
        k_scales=k_values,
        curve_lengths=l_arr,
    )

