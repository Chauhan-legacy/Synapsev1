"""
Noise Color Estimation and Power-Law Fitting for SYNAPSE SPECTRA.
Fits power-law spectral density S(f) ~ 1/f^beta to classify white, pink, brown, and colored noise.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any
import numpy as np
import scipy.stats as stats

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class NoiseColorResult:
    beta_exponent: float
    beta_ci_lower: float
    beta_ci_upper: float
    classification: str                 # White, Pink, Brown/Red, Blue, Violet
    r_squared: float
    noise_power_c: float
    fit_frequencies: np.ndarray
    fit_power: np.ndarray


def estimate_noise_color(
    frequencies: np.ndarray,
    psd: np.ndarray,
    exclude_dc: bool = True,
    confidence_level: float = 0.95,
) -> NoiseColorResult:
    """
    Fit log10(PSD) = log10(C) - beta * log10(f) using robust linear regression.
    """
    f = np.asarray(frequencies, dtype=np.float64)
    p = np.asarray(psd, dtype=np.float64)

    # Filter out f <= 0 and non-positive power
    valid_mask = (f > 0) & (p > 0) & np.isfinite(f) & np.isfinite(p)
    if exclude_dc and len(f) > 1:
        valid_mask[0] = False

    f_valid = f[valid_mask]
    p_valid = p[valid_mask]

    if len(f_valid) < 5:
        raise ValidationError("Need at least 5 positive frequency bins for noise power-law fitting.")

    log_f = np.log10(f_valid)
    log_p = np.log10(p_valid)

    # Outlier clipping on peaks so we fit the noise floor, not harmonic spikes
    # Use median filtering to isolate the continuous background
    p_smooth = np.convolve(log_p, np.ones(5)/5.0, mode='same')
    residuals = log_p - p_smooth
    floor_mask = residuals < np.percentile(residuals, 75)

    if np.sum(floor_mask) >= 5:
        fit_x = log_f[floor_mask]
        fit_y = log_p[floor_mask]
    else:
        fit_x = log_f
        fit_y = log_p

    # Linear regression: fit_y = intercept + slope * fit_x
    # beta = -slope
    res = stats.linregress(fit_x, fit_y)
    slope = float(res.slope)
    intercept = float(res.intercept)
    r2 = float(res.rvalue ** 2)
    stderr = float(res.stderr) if res.stderr is not None else 0.05

    beta = -slope
    t_crit = float(stats.t.ppf(1.0 - (1.0 - confidence_level) / 2.0, df=len(fit_x) - 2))
    ci_delta = t_crit * stderr
    ci_low = beta - ci_delta
    ci_high = beta + ci_delta

    # Classification
    if -0.35 <= beta <= 0.35:
        cls = "White Noise (flat spectrum, uncorrelated)"
    elif 0.65 <= beta <= 1.35:
        cls = "Pink Noise (1/f flicker noise)"
    elif 1.65 <= beta <= 2.35:
        cls = "Brown / Red Noise (1/f^2 random walk)"
    elif beta < -0.35:
        cls = "Blue / Violet Noise (high-frequency dominated)"
    elif beta > 2.35:
        cls = "Black / Steep Power-Law Noise (beta > 2.5)"
    else:
        cls = f"Colored Noise (beta = {beta:.2f})"

    return NoiseColorResult(
        beta_exponent=float(beta),
        beta_ci_lower=float(ci_low),
        beta_ci_upper=float(ci_high),
        classification=cls,
        r_squared=r2,
        noise_power_c=float(10 ** intercept),
        fit_frequencies=f_valid,
        fit_power=10 ** (intercept + slope * log_f),
    )

