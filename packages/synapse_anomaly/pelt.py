"""
Pruned Exact Linear Time (PELT) Change-Point Detection for SYNAPSE ANOMALY.
Computes exact penalized likelihood changepoints with linear runtime complexity
using the Killick, Fearnhead, Eckley (2012) pruning theorem.
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
    min_size: int = 4,
) -> PELTResult:
    """
    Execute PELT exact change-point detection with Gaussian likelihood cost.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    if n < 2 * min_size:
        raise ValidationError(f"Need at least {2 * min_size} samples for PELT changepoint detection.")

    t = np.asarray(timestamps, dtype=np.float64) if timestamps is not None else np.arange(n, dtype=np.float64)

    # Default BIC-like penalty: beta = 2 * ln(N) * sigma^2
    var_est = float(np.var(x)) or 1.0
    beta = float(penalty) if penalty is not None else float(3.0 * np.log(n) * var_est)

    # Prefix sums for O(1) segment cost evaluation
    # sum(x) and sum(x^2)
    cumsum_x = np.concatenate([[0.0], np.cumsum(x)])
    cumsum_x2 = np.concatenate([[0.0], np.cumsum(x ** 2)])

    def segment_cost(s: int, e: int) -> float:
        length = e - s
        if length <= 1:
            return 0.0
        sum_val = cumsum_x[e] - cumsum_x[s]
        sum_sq = cumsum_x2[e] - cumsum_x2[s]
        mean_seg = sum_val / length
        var_seg = (sum_sq / length) - (mean_seg ** 2)
        var_seg = max(1e-10, var_seg)
        # Normal log-likelihood negative cost
        return float(length * np.log(var_seg) + length)

    # F[t]: optimal cost for prefix 0:t
    F = np.zeros(n + 1, dtype=np.float64)
    F[0] = -beta
    # cp_record[t]: optimal previous change-point
    cp_record = np.zeros(n + 1, dtype=int)

    # R_t: candidates set of previous changepoints
    R: List[int] = [0]

    for t_step in range(min_size, n + 1):
        best_val = float("inf")
        best_tau = 0

        # Evaluate candidate taus in R
        valid_candidates = [tau for tau in R if (t_step - tau) >= min_size]
        if not valid_candidates:
            valid_candidates = [0]

        cand_costs = []
        for tau in valid_candidates:
            cost = F[tau] + segment_cost(tau, t_step) + beta
            cand_costs.append((cost, tau))
            if cost < best_val:
                best_val = cost
                best_tau = tau

        F[t_step] = best_val
        cp_record[t_step] = best_tau

        # Pruning condition: Keep tau only if F[tau] + Cost(tau, t) <= F[t]
        new_R = [0]
        for cost, tau in cand_costs:
            if cost - beta <= best_val:
                new_R.append(tau)
        new_R.append(t_step - min_size + 1)
        R = sorted(list(set(new_R)))

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

