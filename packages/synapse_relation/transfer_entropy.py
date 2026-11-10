"""
Transfer Entropy and Non-Parametric Information Flow for SYNAPSE RELATION.
Quantifies directed information transfer T_{X -> Y} and tests significance against circular-shift nulls.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np

from synapse_core.exceptions import ValidationError
from synapse_inference.surrogates import generate_circular_shift_surrogates, evaluate_surrogate_significance


@dataclass(frozen=True)
class TransferEntropyResult:
    transfer_entropy_x_to_y: float      # T_{X -> Y} in bits
    transfer_entropy_y_to_x: float      # T_{Y -> X} in bits
    net_information_flow: float         # T_{X -> Y} - T_{Y -> X}
    p_value_x_to_y: float
    p_value_y_to_x: float
    is_significant_flow: bool


def compute_transfer_entropy(
    channel_x: np.ndarray,
    channel_y: np.ndarray,
    n_bins: int = 8,
    k_history: int = 1,
    n_surrogates: int = 20,
    alpha: float = 0.05,
) -> TransferEntropyResult:
    """
    Compute Transfer Entropy T_{X -> Y} and T_{Y -> X} using binned joint probabilities
    and evaluate statistical significance using circular-shift null models.
    """
    x = np.asarray(channel_x, dtype=np.float64)
    y = np.asarray(channel_y, dtype=np.float64)
    n = len(x)
    if len(y) != n:
        raise ValidationError("Channels must have identical length for Transfer Entropy.")
    if n < 32:
        raise ValidationError("Need at least 32 samples for Transfer Entropy.")

    def calc_binned_te(src: np.ndarray, dst: np.ndarray) -> float:
        # T_{src -> dst} = I(dst_{t+1}; src_t | dst_t)
        # Discretize into n_bins
        src_disc = np.digitize(src, bins=np.linspace(np.min(src), np.max(src), n_bins + 1)[1:-1])
        dst_disc = np.digitize(dst, bins=np.linspace(np.min(dst), np.max(dst), n_bins + 1)[1:-1])

        dst_next = dst_disc[1:]
        dst_curr = dst_disc[:-1]
        src_curr = src_disc[:-1]
        m = len(dst_next)

        # 3D Joint distribution P(dst_next, dst_curr, src_curr)
        # Use single integer index for joint state: i * B^2 + j * B + k
        joint_state = dst_next * (n_bins ** 2) + dst_curr * n_bins + src_curr
        joint_counts = np.bincount(joint_state, minlength=n_bins ** 3)
        p_joint = joint_counts / float(m)

        # 2D marginals P(dst_curr, src_curr) and P(dst_next, dst_curr)
        marginal_cs = np.bincount(dst_curr * n_bins + src_curr, minlength=n_bins ** 2) / float(m)
        marginal_nc = np.bincount(dst_next * n_bins + dst_curr, minlength=n_bins ** 2) / float(m)
        # 1D marginal P(dst_curr)
        marginal_c = np.bincount(dst_curr, minlength=n_bins) / float(m)

        te = 0.0
        for next_val in range(n_bins):
            for curr_val in range(n_bins):
                for src_val in range(n_bins):
                    p_xyz = p_joint[next_val * (n_bins ** 2) + curr_val * n_bins + src_val]
                    if p_xyz <= 0:
                        continue
                    p_cs = marginal_cs[curr_val * n_bins + src_val]
                    p_nc = marginal_nc[next_val * n_bins + curr_val]
                    p_c = marginal_c[curr_val]

                    if p_cs > 0 and p_nc > 0 and p_c > 0:
                        term = (p_xyz * p_c) / (p_nc * p_cs)
                        if term > 0:
                            te += p_xyz * np.log2(term)
        return max(0.0, float(te))

    te_xy = calc_binned_te(x, y)
    te_yx = calc_binned_te(y, x)

    # Surrogate testing against circular-shift null model
    surrs_x = generate_circular_shift_surrogates(x, n_surrogates=n_surrogates)
    surr_te_xy = [calc_binned_te(sx, y) for sx in surrs_x]
    p_xy = evaluate_surrogate_significance(te_xy, surr_te_xy)

    surrs_y = generate_circular_shift_surrogates(y, n_surrogates=n_surrogates)
    surr_te_yx = [calc_binned_te(sy, x) for sy in surrs_y]
    p_yx = evaluate_surrogate_significance(te_yx, surr_te_yx)

    is_sig = bool((p_xy < alpha and te_xy > te_yx) or (p_yx < alpha and te_yx > te_xy))

    return TransferEntropyResult(
        transfer_entropy_x_to_y=te_xy,
        transfer_entropy_y_to_x=te_yx,
        net_information_flow=te_xy - te_yx,
        p_value_x_to_y=p_xy,
        p_value_y_to_x=p_yx,
        is_significant_flow=is_sig,
    )

