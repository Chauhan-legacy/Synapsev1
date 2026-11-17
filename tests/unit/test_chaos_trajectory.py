"""
Unit test for Item 4: Chaos Lab Lyapunov exponent and 0-1 test on developed trajectory.
Verifies that for sigma=10, rho=28, beta=8/3 after discarding transient,
the largest Lyapunov exponent is positive (~+0.9) and K is close to 1.
"""

import pytest
from synapse_structure.lyapunov import compute_lorenz_variational_lyapunov


def test_lorenz_developed_trajectory_lyapunov_and_01_test():
    """
    Requirement 4: For sigma=10, rho=28, beta=8/3 after discarding transient:
    - Lyapunov exponent must be positive (about +0.9)
    - Gottwald-Melbourne 0-1 test K must be close to 1
    """
    lambda_1, k_metric = compute_lorenz_variational_lyapunov(
        sigma=10.0,
        rho=28.0,
        beta=8.0 / 3.0,
        dt=0.01,
        n_transient=1000,
        n_steps=6000,
    )

    # Verify Lyapunov exponent is positive and approximately +0.9
    assert lambda_1 > 0.0, f"Lyapunov exponent {lambda_1} is not positive"
    assert 0.80 <= lambda_1 <= 1.05, f"Lyapunov exponent {lambda_1:.4f} is not about +0.9"

    # Verify 0-1 test K is close to 1
    assert k_metric > 0.85, f"0-1 test K {k_metric:.4f} is not close to 1"


def test_lorenz_stable_parameter_negative_lyapunov():
    """Verify that a stable non-chaotic parameter (rho=0.5) has negative/non-positive Lyapunov."""
    lambda_stable, k_stable = compute_lorenz_variational_lyapunov(
        sigma=10.0,
        rho=0.5,
        beta=8.0 / 3.0,
        dt=0.01,
        n_transient=500,
        n_steps=2000,
    )
    assert lambda_stable < 0.0, f"Stable Lorenz got non-negative Lyapunov {lambda_stable}"
    assert k_stable < 0.30, f"Stable Lorenz got high 0-1 test K {k_stable}"
