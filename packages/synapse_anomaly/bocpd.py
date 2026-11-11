"""
Bayesian Online Change-point Detection (BOCPD) for SYNAPSE ANOMALY.
Implements the exact recursive message-passing algorithm of Adams & MacKay (2007)
to output the run-length posterior probability distribution and changepoint probabilities.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import scipy.stats as stats

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class BOCPDResult:
    changepoints: Tuple[int, ...]
    changepoint_probabilities: np.ndarray # P(r_t = 0 | x_1:t)
    run_length_posterior: np.ndarray     # 2D matrix shape (max_run + 1, T)
    hazard_lambda: float
    n_changepoints: int


def compute_bocpd(
    values: np.ndarray,
    hazard_lambda: float = 200.0,
    prob_threshold: float = 0.20,
    max_run_length: int = 200,
) -> BOCPDResult:
    """
    Execute Bayesian Online Change-point Detection with Gaussian conjugate priors
    according to Adams & MacKay (2007).

    Evaluates exact posterior run-length distribution R[r, t] = P(r_t = r | x_{1:t})
    and extracts changepoints from changepoint probabilities P(r_t = 0 | x_{1:t})
    and MAP run-length drop points.
    """
    x = np.asarray(values, dtype=np.float64)
    n = len(x)
    if n < 8:
        raise ValidationError("Need at least 8 samples for Bayesian Online Changepoint Detection.")

    # Robust prior hyperparameters using median and MAD
    med = float(np.median(x))
    mad = float(np.median(np.abs(x - med))) / 0.6745 or 1.0
    mu0 = med
    kappa0 = 0.05
    alpha0 = 1.0
    beta0 = float(mad ** 2)

    # R matrix: stores P(r_t, x_1:t)
    # Dimension: (max_run_length + 1, n)
    R = np.zeros((max_run_length + 1, n), dtype=np.float64)
    R[0, 0] = 1.0

    # Sufficient statistics across active run lengths
    mu_t = np.array([mu0])
    kappa_t = np.array([kappa0])
    alpha_t = np.array([alpha0])
    beta_t = np.array([beta0])

    hazard = 1.0 / hazard_lambda
    cp_probs = np.zeros(n, dtype=np.float64)
    map_r = np.zeros(n, dtype=np.int32)

    # Prior predictive distribution for changepoint (r = 0)
    df_0 = 2.0 * alpha0
    scale_0 = np.sqrt(np.maximum(1e-12, beta0 * (kappa0 + 1.0) / (alpha0 * kappa0)))
    pred_0 = stats.t.pdf(x, df=df_0, loc=mu0, scale=scale_0)
    pred_0 = np.nan_to_num(pred_0, nan=1e-12, posinf=1e-12, neginf=1e-12)

    for t in range(1, n):
        cur_x = x[t]
        k = len(mu_t)

        # 1. Predictive probability under Student-t posterior predictive for active runs
        df_pred = 2.0 * alpha_t
        scale_pred = np.sqrt(np.maximum(1e-12, beta_t * (kappa_t + 1.0) / (alpha_t * kappa_t)))
        pred_probs = stats.t.pdf(cur_x, df=df_pred, loc=mu_t, scale=scale_pred)
        pred_probs = np.nan_to_num(pred_probs, nan=1e-12, posinf=1e-12, neginf=1e-12)

        # 2. Growth probabilities: P(r_t = r_{t-1} + 1, x_{1:t})
        r_prev = R[:k, t - 1]
        growth_probs = r_prev * pred_probs * (1.0 - hazard)

        # 3. Changepoint probability: P(r_t = 0, x_{1:t})
        # Uses prior predictive distribution pi_0(x_t) as derived in Adams & MacKay (2007)
        cp_prob = float(pred_0[t] * hazard * np.sum(r_prev))

        # Combine into unnormalized vector for time t
        r_current = np.concatenate([[cp_prob], growth_probs])

        # Normalize across run lengths to obtain posterior P(r_t | x_{1:t})
        evidence = np.sum(r_current)
        if evidence > 0:
            r_current /= evidence
        else:
            r_current[0] = 1.0

        # Truncate to max_run_length
        if len(r_current) > max_run_length + 1:
            r_current = r_current[: max_run_length + 1]

        R[: len(r_current), t] = r_current
        cp_probs[t] = r_current[0]
        map_r[t] = int(np.argmax(r_current))

        # 4. Update hyperparameters for next step (Conjugate Normal-Inverse-Gamma)
        new_kappa = np.concatenate([[kappa0], kappa_t + 1.0])
        new_mu = np.concatenate([[mu0], (kappa_t * mu_t + cur_x) / (kappa_t + 1.0)])
        new_alpha = np.concatenate([[alpha0], alpha_t + 0.5])
        new_beta = np.concatenate([[beta0], beta_t + (kappa_t * (cur_x - mu_t) ** 2) / (2.0 * (kappa_t + 1.0))])

        if len(new_kappa) > max_run_length:
            new_kappa = new_kappa[:max_run_length]
            new_mu = new_mu[:max_run_length]
            new_alpha = new_alpha[:max_run_length]
            new_beta = new_beta[:max_run_length]

        kappa_t = new_kappa
        mu_t = new_mu
        alpha_t = new_alpha
        beta_t = new_beta

    # Extract changepoints from probability peaks and MAP resets
    changepoints: List[int] = []
    min_dist = 20
    for t in range(5, n - 5):
        is_prob_peak = (
            cp_probs[t] >= prob_threshold
            and cp_probs[t] == np.max(cp_probs[max(0, t - 3): min(n, t + 4)])
        )
        is_map_reset = (
            map_r[t - 1] >= 20
            and map_r[t] <= 4
            and np.sum(R[:4, t]) >= 0.40
        )
        if is_prob_peak or is_map_reset:
            est_cp = t if is_prob_peak else int(t - map_r[t])
            if not changepoints or (est_cp - changepoints[-1]) >= min_dist:
                changepoints.append(est_cp)

    return BOCPDResult(
        changepoints=tuple(changepoints),
        changepoint_probabilities=cp_probs,
        run_length_posterior=R,
        hazard_lambda=hazard_lambda,
        n_changepoints=len(changepoints),
    )
