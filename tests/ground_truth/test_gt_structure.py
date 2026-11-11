"""
Ground-Truth Benchmark Suite: Structure & Nonlinear Dynamics Engine.
Validates RQA determinism preservation and Lyapunov periodic non-crash behavior.
"""

import numpy as np
import pytest
from synapse_structure.rqa import compute_rqa
from synapse_structure.lyapunov import compute_largest_lyapunov_exponent
from synapse_structure.entropy import compute_sample_entropy, compute_permutation_entropy


def test_gt_rqa_determinism_preservation():
    """Verify RQA determinism on Lorenz chaotic attractor matches reference without downsampling destruction."""
    # Integrate Lorenz attractor
    sigma, rho, beta = 10.0, 28.0, 8.0 / 3.0
    dt = 0.02
    N = 1500
    xs, ys, zs = np.zeros(N), np.zeros(N), np.zeros(N)
    xs[0], ys[0], zs[0] = 1.0, 1.0, 1.0

    for i in range(N - 1):
        dx = sigma * (ys[i] - xs[i]) * dt
        dy = (xs[i] * (rho - zs[i]) - ys[i]) * dt
        dz = (xs[i] * ys[i] - beta * zs[i]) * dt
        xs[i + 1] = xs[i] + dx
        ys[i + 1] = ys[i] + dy
        zs[i + 1] = zs[i] + dz

    res = compute_rqa(xs, dimension=3, delay=5, threshold_pct_std=0.20, l_min=2)
    # Reference determinism for Lorenz attractor is > 85%
    assert res.determinism >= 0.85, f"RQA determinism {res.determinism} is below 85% reference"


def test_gt_lyapunov_clean_sine_wave_non_crash():
    """Verify Lyapunov exponent on a clean periodic sine wave does not crash and returns is_chaotic=False."""
    fs = 200.0
    t = np.arange(1000) / fs
    clean_sine = np.sin(2 * np.pi * 5.0 * t)

    res = compute_largest_lyapunov_exponent(clean_sine, dimension=3, delay=10)
    assert not res.is_chaotic, "Periodic sine wave incorrectly classified as chaotic"
    assert res.largest_lyapunov_exponent <= 0.05, f"Periodic sine got exponent {res.largest_lyapunov_exponent}"


def test_gt_entropy_white_noise_vs_sine():
    """Verify sample entropy and permutation entropy correctly differentiate stochastic noise from sine."""
    fs = 200.0
    t = np.arange(600) / fs
    sine = np.sin(2 * np.pi * 10.0 * t)
    noise = np.random.default_rng(505).normal(0, 1.0, 600)

    samp_en_sine = compute_sample_entropy(sine, m=2, r_factor=0.20)
    samp_en_noise = compute_sample_entropy(noise, m=2, r_factor=0.20)
    assert samp_en_sine < samp_en_noise

    pe_sine = compute_permutation_entropy(sine, order_d=3)
    pe_noise = compute_permutation_entropy(noise, order_d=3)
    assert pe_sine < pe_noise
