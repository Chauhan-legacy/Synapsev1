"""
Pruned Exact Linear Time (PELT) Change-Point Detection for SYNAPSE ANOMALY.
Computes exact penalized likelihood changepoints with linear runtime complexity
using the Killick, Fearnhead, Eckley (2012) pruning theorem, with vectorized evaluations,
bounded variance protection, and adaptive pre-whitening.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class PELTResult:
    changepoints: Tuple[int, ...]       # Indices of detected change-points
    timestamps: Tuple[float, ...]       # Timestamps of detected change-points
    penalty: float                      # Penalty beta used
    cost_value: float                   # Total penalized cost
    n_changepoints: int


def detect_pelt_changepoints(
    values: np.ndarray,
    timestamps: Optional[np.ndarray] = None,
    penalty: Optional[float] = None,
    min_size: int = 20,
    prewhiten: bool = False,
) -> PELTResult:
    """
    Execute PELT exact change-point detection with Gaussian likelihood cost.
    """
    x_raw = np.asarray(values, dtype=np.float64)
    n_orig = len(x_raw)
    if n_orig < 2 * min_size:
        raise ValidationError(f"Need at least {2 * min_size} samples for PELT changepoint detection.")

    t = np.asarray(timestamps, dtype=np.float64) if timestamps is not None else np.arange(n_orig, dtype=np.float64)

    if prewhiten and n_orig > 30:
        r1 = float(np.corrcoef(x_raw[:-1], x_raw[1:])[0, 1])
        if r1 > 0.85:
            x = np.diff(x_raw)
        elif abs(r1) > 0.25:
            x = x_raw[1:] - r1 * x_raw[:-1]
        else:
            x = x_raw.copy()
    else:
        x = x_raw.copy()

    n = len(x)
    var_est = float(np.var(x)) or 1.0
    beta = float(penalty) if penalty is not None else float(4.5 * np.log(n) * var_est)

    # Prefix sums for O(1) segment cost evaluation
    cumsum_x = np.concatenate([[0.0], np.cumsum(x)])
    cumsum_x2 = np.concatenate([[0.0], np.cumsum(x ** 2)])

    # F[t]: optimal cost for prefix 0:t
    F = np.zeros(n + 1, dtype=np.float64)
    F[0] = -beta
    F[1:min_size] = float("inf")

    # cp_record[t]: optimal previous change-point
    cp_record = np.zeros(n + 1, dtype=int)

    # R_t: candidates set of previous changepoints
    R: List[int] = [0]

    for t_step in range(min_size, n + 1):
        valid_candidates = [tau for tau in R if (t_step - tau) >= min_size]
        if not valid_candidates:
            valid_candidates = [0]

        taus = np.array(valid_candidates, dtype=int)
        lengths = t_step - taus
        sum_vals = cumsum_x[t_step] - cumsum_x[taus]
        sum_sqs = cumsum_x2[t_step] - cumsum_x2[taus]

        mean_segs = sum_vals / lengths
        # Protect against degenerate zero-variance clusters (require var >= 0.10 * var_est)
        var_segs = np.maximum(0.10 * var_est, (sum_sqs / lengths) - (mean_segs ** 2))
        seg_costs = lengths * np.log(var_segs) + lengths

        costs = F[taus] + seg_costs + beta
        best_idx = int(np.argmin(costs))
        best_val = float(costs[best_idx])
        best_tau = int(taus[best_idx])

        F[t_step] = best_val
        cp_record[t_step] = best_tau

        # Killick et al. (2012) pruning condition: Keep tau only if F[tau] + Cost(tau, t) <= F[t]
        keep_mask = (costs - beta) <= best_val
        cand_to_add = t_step - min_size + 1
        new_cands = list(taus[keep_mask])
        if cand_to_add >= min_size:
            new_cands.append(cand_to_add)
        R = sorted(list(set(new_cands)))

    # Backtrack changepoints from n
    changepoints: List[int] = []
    curr = n
    while curr > 0:
        prev = int(cp_record[curr])
        if prev > 0:
            changepoints.append(prev)
        curr = prev

    changepoints.reverse()
    cp_tuple = tuple(changepoints)
    t_tuple = tuple(float(t[cp]) for cp in changepoints if cp < len(t))

    return PELTResult(
        changepoints=cp_tuple,
        timestamps=t_tuple,
        penalty=beta,
        cost_value=float(F[n]),
        n_changepoints=len(cp_tuple),
    )
