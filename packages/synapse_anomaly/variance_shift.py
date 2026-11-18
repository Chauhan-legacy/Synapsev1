"""
Variance Shift Testing for SYNAPSE ANOMALY.
Detects structural variance / volatility regime shifts using:
- Rolling-variance window scan to isolate candidate shift sections
- Median-centered Levene test (Brown-Forsythe) to test equality of variances
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Tuple
import numpy as np
from scipy import stats

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class VarianceShiftResult:
    start_index: int
    end_index: int
    variance_ratio: float
    levene_statistic: float
    p_value: float
    is_significant: bool
    description: str


def evaluate_variance_shift(
    series: np.ndarray,
    candidate_start: Optional[int] = None,
    candidate_end: Optional[int] = None,
    window_size: int = 500,
    alpha: float = 1e-6,
    prewhiten_diff: bool = True,
) -> VarianceShiftResult:
    """
    Perform a median-centered Levene test (Brown-Forsythe) comparing a candidate section
    to the baseline signal.
    """
    arr = np.asarray(series, dtype=np.float64)
    if len(arr) < 32:
        raise ValidationError("Need at least 32 samples for variance shift testing.")

    x = np.diff(arr) if prewhiten_diff else arr
    n = len(x)

    start = candidate_start if candidate_start is not None else 0
    end = candidate_end if candidate_end is not None else n

    start = max(0, min(start, n - 10))
    end = max(start + 10, min(end, n))

    sec = x[start:end]
    base = np.concatenate([x[:start], x[end:]]) if (start > 0 or end < n) else x

    if len(sec) < 10 or len(base) < 10:
        return VarianceShiftResult(
            start_index=start,
            end_index=end,
            variance_ratio=1.0,
            levene_statistic=0.0,
            p_value=1.0,
            is_significant=False,
            description="Insufficient samples for variance test",
        )

    stat, p = stats.levene(sec, base, center="median")
    var_sec = float(np.var(sec, ddof=1))
    var_base = float(np.var(base, ddof=1))
    ratio = var_sec / max(1e-12, var_base)
    sig = bool(p < alpha and ratio > 1.2)

    desc = (
        f"Significant variance shift ({ratio:.2f}x) at samples [{start}:{end}] "
        f"(Levene W={stat:.1f}, p={p:.2e})"
        if sig
        else f"No significant variance shift at samples [{start}:{end}] (p={p:.3f})"
    )

    return VarianceShiftResult(
        start_index=start,
        end_index=end,
        variance_ratio=ratio,
        levene_statistic=float(stat),
        p_value=float(p),
        is_significant=sig,
        description=desc,
    )


def detect_variance_shifts(
    series: np.ndarray,
    window_size: int = 500,
    step: int = 250,
    ratio_threshold: float = 1.8,
    alpha: float = 1e-6,
    prewhiten_diff: bool = True,
) -> List[VarianceShiftResult]:
    """
    Scan series with a rolling-variance window to detect contiguous volatility regime shifts,
    validating candidates with the Brown-Forsythe median-centered Levene test.
    """
    arr = np.asarray(series, dtype=np.float64)
    x = np.diff(arr) if prewhiten_diff else arr
    n = len(x)

    if n < window_size * 2:
        return []

    indices = list(range(0, n - window_size + 1, step))
    local_vars = [float(np.var(x[i : i + window_size], ddof=1)) for i in indices]
    base_var = float(np.median(local_vars))
    if base_var < 1e-12:
        return []

    flagged = [idx for idx, v in zip(indices, local_vars) if v / base_var >= ratio_threshold]
    if not flagged:
        return []

    blocks: List[Tuple[int, int]] = []
    current_block = [flagged[0]]
    for f in flagged[1:]:
        if f - current_block[-1] <= step * 2:
            current_block.append(f)
        else:
            blocks.append((current_block[0], current_block[-1] + window_size))
            current_block = [f]
    if current_block:
        blocks.append((current_block[0], current_block[-1] + window_size))

    results: List[VarianceShiftResult] = []
    for start, end in blocks:
        start_clamped = max(0, start)
        end_clamped = min(n, end)
        sec = x[start_clamped:end_clamped]
        base = np.concatenate([x[:start_clamped], x[end_clamped:]])
        if len(sec) < 10 or len(base) < 10:
            continue
        stat, p = stats.levene(sec, base, center="median")
        var_sec = float(np.var(sec, ddof=1))
        var_base = float(np.var(base, ddof=1))
        ratio = var_sec / max(1e-12, var_base)
        sig = bool(p < alpha and ratio > 1.2)
        desc = (
            f"Detected volatility regime ({ratio:.2f}x) at samples [{start_clamped}:{end_clamped}] "
            f"(Levene W={stat:.1f}, p={p:.2e})"
            if sig
            else f"Sub-threshold variance elevation at [{start_clamped}:{end_clamped}]"
        )
        results.append(
            VarianceShiftResult(
                start_index=start_clamped,
                end_index=end_clamped,
                variance_ratio=ratio,
                levene_statistic=float(stat),
                p_value=float(p),
                is_significant=sig,
                description=desc,
            )
        )

    return results


# Backward compatibility alias
test_variance_shift = evaluate_variance_shift
