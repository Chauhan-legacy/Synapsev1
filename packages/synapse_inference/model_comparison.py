"""
Model Comparison and Information Criteria for SYNAPSE INFERENCE.
Compares 'noise only', 'periodic + noise', and 'periodic + trend' models
using AIC, BIC, and Bayes Factor approximations.
"""

from __future__ import annotations
from typing import Dict, Any
import numpy as np
import scipy.optimize as opt


def compare_signal_models(
    timestamps: np.ndarray,
    values: np.ndarray,
    candidate_frequency: float,
) -> Dict[str, Any]:
    """
    Compare competing generative models for a numerical series:
    1. Null: Pure Gaussian noise (y = mu + eps)
    2. Periodic: Harmonic sinusoid + noise (y = mu + A*cos(2*pi*f*t + phi) + eps)
    3. Periodic + Linear Trend: (y = mu + beta*t + A*cos(2*pi*f*t + phi) + eps)
    """
    t = np.asarray(timestamps, dtype=np.float64)
    y = np.asarray(values, dtype=np.float64)
    n = len(y)
    t_norm = t - t[0]

    # Model 1: Null Noise (k = 2: mu, sigma^2)
    mu_null = float(np.mean(y))
    resid_null = y - mu_null
    rss_null = float(np.sum(resid_null ** 2))
    sigma2_null = max(1e-12, rss_null / n)
    ll_null = -0.5 * n * (np.log(2 * np.pi * sigma2_null) + 1.0)
    aic_null = 2 * 2 - 2 * ll_null
    bic_null = 2 * np.log(n) - 2 * ll_null

    # Model 2: Periodic + Noise (k = 4: mu, A, phi, sigma^2)
    omega = 2 * np.pi * candidate_frequency
    X_per = np.column_stack([np.ones(n), np.cos(omega * t_norm), np.sin(omega * t_norm)])
    beta_per, res_per_sum, _, _ = np.linalg.lstsq(X_per, y, rcond=None)
    resid_per = y - X_per @ beta_per
    rss_per = float(np.sum(resid_per ** 2))
    sigma2_per = max(1e-12, rss_per / n)
    ll_per = -0.5 * n * (np.log(2 * np.pi * sigma2_per) + 1.0)
    aic_per = 2 * 4 - 2 * ll_per
    bic_per = 4 * np.log(n) - 2 * ll_per

    # Model 3: Periodic + Trend (k = 5: mu, trend_beta, A, phi, sigma^2)
    X_trend = np.column_stack([np.ones(n), t_norm, np.cos(omega * t_norm), np.sin(omega * t_norm)])
    beta_trend, res_trend_sum, _, _ = np.linalg.lstsq(X_trend, y, rcond=None)
    resid_trend = y - X_trend @ beta_trend
    rss_trend = float(np.sum(resid_trend ** 2))
    sigma2_trend = max(1e-12, rss_trend / n)
    ll_trend = -0.5 * n * (np.log(2 * np.pi * sigma2_trend) + 1.0)
    aic_trend = 2 * 5 - 2 * ll_trend
    bic_trend = 5 * np.log(n) - 2 * ll_trend

    # Best model by BIC
    models = [
        {"name": "Noise Only", "k": 2, "aic": aic_null, "bic": bic_null, "log_lik": ll_null, "rss": rss_null},
        {"name": "Periodic + Noise", "k": 4, "aic": aic_per, "bic": bic_per, "log_lik": ll_per, "rss": rss_per},
        {"name": "Periodic + Trend", "k": 5, "aic": aic_trend, "bic": bic_trend, "log_lik": ll_trend, "rss": rss_trend},
    ]
    models.sort(key=lambda m: m["bic"])
    best_model = models[0]["name"]

    # Bayes Factor approximation: BF_12 ~ exp(-0.5 * (BIC_1 - BIC_2))
    delta_bic_per_null = bic_per - bic_null
    # If delta_bic < 0, periodic is favored
    log_bf_per_vs_null = -0.5 * delta_bic_per_null

    return {
        "models": models,
        "best_model_by_bic": best_model,
        "delta_bic_periodic_vs_null": float(delta_bic_per_null),
        "log_bayes_factor_periodic": float(log_bf_per_vs_null),
        "is_periodic_supported": bool(delta_bic_per_null < -10.0), # Strong evidence threshold
    }
