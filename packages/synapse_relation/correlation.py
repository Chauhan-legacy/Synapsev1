"""
Correlation and Cross-Correlation Analysis for SYNAPSE RELATION.
Computes Pearson, Spearman rank correlations, and time-lagged cross-correlation profiles.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Optional
import numpy as np
import scipy.stats as stats
import scipy.signal as signal


@dataclass(frozen=True)
class CrossCorrelationResult:
    lags: np.ndarray             # Lag indices [-max_lag .. max_lag]
    lag_times_sec: np.ndarray    # Lag in seconds
    cross_corr: np.ndarray       # Normalized cross-correlation profile [-1, 1]
    peak_lag_sec: float          # Time lag of maximum absolute correlation
    peak_correlation: float      # Value of correlation at peak lag


def compute_multichannel_correlations(
    values: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute full Pearson and Spearman correlation matrices for multichannel signal (N, C).
    """
    x = np.asarray(values, dtype=np.float64)
    if x.ndim != 2:
        raise ValueError("Multichannel correlations require 2D array (N, C).")

    # Pearson
    pearson_mat = np.corrcoef(x, rowvar=False)
    # Spearman
    spearman_mat, _ = stats.spearmanr(x, axis=0)
    if x.shape[1] == 1:
        spearman_mat = np.array([[1.0]])

    pearson_mat.flags.writeable = False
    spearman_mat.flags.writeable = False
    return pearson_mat, spearman_mat


def compute_cross_correlation(
    channel_x: np.ndarray,
    channel_y: np.ndarray,
    sampling_rate: float,
    max_lag_samples: Optional[int] = None,
) -> CrossCorrelationResult:
    """
    Compute normalized cross-correlation between two channels to detect time-delay relationships.
    """
    x = np.asarray(channel_x, dtype=np.float64)
    y = np.asarray(channel_y, dtype=np.float64)
    n = len(x)
    if len(y) != n:
        raise ValueError("Both channels must have identical length.")

    x_detrend = x - np.mean(x)
    y_detrend = y - np.mean(y)

    norm_factor = np.sqrt(np.sum(x_detrend**2) * np.sum(y_detrend**2))
    if norm_factor <= 1e-15:
        norm_factor = 1.0

    raw_cc = signal.correlate(x_detrend, y_detrend, mode="full", method="fft")
    norm_cc = raw_cc / norm_factor

    lags_all = signal.correlation_lags(n, n, mode="full")
    max_l = max_lag_samples if max_lag_samples is not None else (n // 4)

    # Trim to [-max_l .. max_l]
    mask = np.abs(lags_all) <= max_l
    lags = lags_all[mask]
    cc = norm_cc[mask]
    dt = 1.0 / sampling_rate
    lag_times = lags * dt

    peak_idx = int(np.argmax(np.abs(cc)))
    peak_lag_sec = float(lag_times[peak_idx])
    peak_val = float(cc[peak_idx])

    lags.flags.writeable = False
    lag_times.flags.writeable = False
    cc.flags.writeable = False

    return CrossCorrelationResult(
        lags=lags,
        lag_times_sec=lag_times,
        cross_corr=cc,
        peak_lag_sec=peak_lag_sec,
        peak_correlation=peak_val,
    )

