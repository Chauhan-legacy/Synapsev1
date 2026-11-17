"""
Validation test for Item 5: DynamicsView / Lyapunov calculation from loaded data.
Verifies that the Lyapunov exponent is computed from the actual telemetry
and is not a fixed hardcoded value (+0.082) across different signals.
"""

import numpy as np
import pytest
from synapse_structure.lyapunov import compute_largest_lyapunov_exponent


def test_lyapunov_computed_from_loaded_data_not_constant():
    """
    Requirement 5: Compute the Lyapunov value from the loaded data
    (it is currently +0.082 for any dataset), or label it 'Example'.
    Verifies that different datasets produce different Lyapunov estimates.
    """
    fs = 200.0
    N = 1000
    t = np.arange(N) / fs

    # 1. Clean regular periodic sine wave
    sine = np.sin(2 * np.pi * 5.0 * t)
    res_sine = compute_largest_lyapunov_exponent(sine, dimension=3, delay=10)

    # 2. Stochastic Gaussian noise
    rng = np.random.default_rng(2026)
    noise = rng.normal(0, 1.0, N)
    res_noise = compute_largest_lyapunov_exponent(noise, dimension=3, delay=5)

    # 3. Chaotic Lorenz signal
    sigma, rho, beta = 10.0, 28.0, 8.0 / 3.0
    dt = 0.01
    xs = np.zeros(2000)
    ys = np.zeros(2000)
    zs = np.zeros(2000)
    xs[0], ys[0], zs[0] = 1.0, 1.0, 1.0
    for i in range(1999):
        dx = sigma * (ys[i] - xs[i]) * dt
        dy = (xs[i] * (rho - zs[i]) - ys[i]) * dt
        dz = (xs[i] * ys[i] - beta * zs[i]) * dt
        xs[i + 1] = xs[i] + dx
        ys[i + 1] = ys[i] + dy
        zs[i + 1] = zs[i] + dz
    lorenz_x = xs[500:]  # after transient
    res_lorenz = compute_largest_lyapunov_exponent(lorenz_x, dimension=3, delay=5)

    # Verify that estimates are NOT all identical (+0.082)
    estimates = [
        res_sine.largest_lyapunov_exponent,
        res_noise.largest_lyapunov_exponent,
        res_lorenz.largest_lyapunov_exponent,
    ]
    # Sine wave should be non-chaotic
    assert not res_sine.is_chaotic
    assert res_sine.largest_lyapunov_exponent <= 0.05

    # Values must differ from the old constant mock 0.082 across different dynamics
    unique_estimates = set([round(v, 3) for v in estimates])
    assert len(unique_estimates) >= 2, f"Lyapunov estimates failed to differentiate signals: {estimates}"
    assert not all(abs(v - 0.082) < 1e-4 for v in estimates), "Lyapunov is still hardcoded to 0.082 for all datasets"
