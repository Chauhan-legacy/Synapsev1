"""
Nuclear Reactor Core Point Kinetics & 6-Group Delayed Neutron ODE Router for SYNAPSE.
Solves the full 6-group delayed-neutron point kinetics differential equations using a stiff
unconditionally A-stable Implicit Euler / BDF solver across prompt and delayed timescales.
Computes the Nordheim Inhour equation for asymptotic reactor period T, models prompt jump,
delayed transient, control rod scram, and prompt-critical boundary (ρ = β ≈ 0.0065).
"""

from __future__ import annotations
import math
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/reactor", tags=["Reactor Point Kinetics"])

# Standard U-235 Thermal Fission Delayed Neutron Group Constants (Keepin et al., 1965)
U235_BETAS = [0.000215, 0.001424, 0.001274, 0.002568, 0.000748, 0.000273]
U235_LAMBDAS = [0.0124, 0.0305, 0.111, 0.301, 1.14, 3.01] # Decay constants (s^-1)
BETA_TOTAL = sum(U235_BETAS) # Total delayed fraction ~ 0.00650 (650 pcm)

def _solve_inhour_period(rho: float, Lambda: float, betas: List[float], lambdas: List[float]) -> Optional[float]:
    """
    Solves the Nordheim Inhour equation: rho = Lambda/T + sum(beta_i / (1 + lambda_i * T))
    for the dominant positive asymptotic period T using Newton-Raphson.
    """
    if abs(rho) < 1e-7:
        return float("inf") # Exactly critical
    if rho >= BETA_TOTAL:
        # Prompt critical: T ~ Lambda / (rho - beta)
        return max(1e-4, Lambda / (rho - BETA_TOTAL))

    # For sub-prompt critical positive reactivity (0 < rho < beta), T > 0
    # Initial guess: T_approx = (beta - rho) / (rho * lambda_effective)
    lambda_eff = sum(betas) / sum(b / l for b, l in zip(betas, lambdas))
    T = max(1.0, (BETA_TOTAL - rho) / (max(1e-6, rho) * lambda_eff))

    for _ in range(30):
        val = Lambda / T + sum(b / (1.0 + l * T) for b, l in zip(betas, lambdas)) - rho
        # Analytical derivative d(rho)/dT = -Lambda/T^2 - sum(beta_i * lambda_i / (1 + lambda_i * T)^2)
        dval = -(Lambda / (T ** 2)) - sum((b * l) / ((1.0 + l * T) ** 2) for b, l in zip(betas, lambdas))
        delta = val / dval
        T -= delta
        if abs(delta) < 1e-6:
            break

    return T if T > 0 else None

@router.get("/kinetics")
def simulate_point_kinetics(
    reactivity_pcm: float = Query(100.0, description="Step reactivity insertion in pcm (1 pcm = 1e-5 Δk/k, e.g. +100 pcm = 0.0010)"),
    prompt_generation_time_sec: float = Query(1.0e-4, description="Mean prompt neutron generation time Λ in seconds (typical 1e-4s for thermal, 1e-7s for fast)"),
    scram_time_sec: Optional[float] = Query(None, description="Optional safety scram time in seconds (-3000 pcm rod drop)"),
    sim_duration_sec: float = Query(60.0, ge=5.0, le=300.0, description="Total simulation duration in seconds")
) -> Dict[str, Any]:
    """
    Simulates real 6-group delayed-neutron reactor point kinetics via stiff Implicit Euler integration.
    """
    rho = reactivity_pcm * 1e-5 # Convert pcm to dimensionless Δk/k
    Lambda = prompt_generation_time_sec
    betas = U235_BETAS
    lambdas = U235_LAMBDAS
    beta_tot = BETA_TOTAL

    # Prompt critical threshold
    is_prompt_critical = rho >= beta_tot
    dollars = rho / beta_tot

    # Initial steady-state conditions (critical at n = 1.0)
    # dn/dt = 0 => (rho0 - beta)/Lambda * n0 + sum(lambda_i * C_i0) = 0
    # dCi/dt = 0 => beta_i / Lambda * n0 - lambda_i * C_i0 = 0 => C_i0 = (beta_i / (Lambda * lambda_i)) * n0
    n0 = 1.0 # Normalized initial power (100% or 1.0)
    C = [(b / (Lambda * l)) * n0 for b, l in zip(betas, lambdas)]

    # Asymptotic period via Inhour equation
    asymptotic_period = _solve_inhour_period(rho, Lambda, betas, lambdas)

    # Adaptive / Stiff Implicit Euler Time-Stepping
    # Step size dt = 0.02s
    dt = 0.05
    n_steps = int(sim_duration_sec / dt)
    n = n0
    t = 0.0

    timeline: List[Dict[str, Any]] = []

    for step in range(n_steps + 1):
        # Sample points to return (approx 80-120 data points)
        if step % 2 == 0 or t < 2.0:
            timeline.append({
                "time_sec": round(t, 2),
                "neutron_power": round(n, 4),
                "reactivity_pcm": round(rho * 1e5, 1)
            })

        # Apply scram if enabled
        if scram_time_sec is not None and t >= scram_time_sec:
            rho = -0.030 # -3000 pcm safety shutdown

        # Stiff Implicit Euler integration step:
        # n_{k+1} = ( n_k + dt * sum( lambda_i * C_i_k / (1 + dt * lambda_i) ) ) / D
        # where D = 1 - dt * (rho - beta)/Lambda - (dt^2 / Lambda) * sum( lambda_i * beta_i / (1 + dt * lambda_i) )
        sum_c = sum((l * c) / (1.0 + dt * l) for l, c in zip(lambdas, C))
        sum_beta_lambda = sum((l * b) / (1.0 + dt * l) for l, b in zip(lambdas, betas))
        D = 1.0 - dt * ((rho - beta_tot) / Lambda) - ((dt ** 2) / Lambda) * sum_beta_lambda

        n_next = (n + dt * sum_c) / max(1e-12, D)

        # Update precursor concentrations
        for i in range(6):
            C[i] = (C[i] + dt * (betas[i] / Lambda) * n_next) / (1.0 + dt * lambdas[i])

        n = n_next
        t += dt

    # Theoretical prompt jump ratio: n_prompt / n0 = beta / (beta - rho)
    prompt_jump_ratio = beta_tot / max(1e-5, (beta_tot - rho)) if rho < beta_tot else float("inf")

    return {
        "disclaimer": "Educational point-kinetics model for reactor physics analysis. Not a plant control or safety tool.",
        "inputs": {
            "reactivity_pcm": reactivity_pcm,
            "reactivity_delta_k_over_k": rho,
            "reactivity_dollars": round(dollars, 3),
            "prompt_generation_time_sec": Lambda,
            "fuel_type": "U-235 Thermal Fission",
            "total_delayed_fraction_beta": beta_tot,
            "prompt_critical_threshold_pcm": round(beta_tot * 1e5, 1)
        },
        "computed": {
            "asymptotic_period_sec": round(asymptotic_period, 2) if asymptotic_period and asymptotic_period < 1e5 else "Infinite (Critical)",
            "doubling_time_sec": round(asymptotic_period * math.log(2.0), 2) if asymptotic_period and asymptotic_period < 1e5 else "Infinite",
            "prompt_jump_ratio": round(prompt_jump_ratio, 3) if prompt_jump_ratio != float("inf") else "Supercritical Prompt Jump",
            "is_prompt_critical": is_prompt_critical,
            "prompt_critical_status": "PROMPT CRITICAL (Extreme Prompt Power Divergence!)" if is_prompt_critical else "Delayed-Critical (Controllable by delayed neutron precursors)",
        },
        "group_constants": [
            {"group": i+1, "beta_i": betas[i], "beta_pcm": round(betas[i] * 1e5, 1), "lambda_i_s": lambdas[i], "half_life_sec": round(math.log(2.0) / lambdas[i], 2)}
            for i in range(6)
        ],
        "method": {
            "ode_system": [
                "dn(t)/dt = [(ρ(t) − β) / Λ] · n(t) + ∑ λ_i · C_i(t)",
                "dC_i(t)/dt = (β_i / Λ) · n(t) − λ_i · C_i(t)  (i = 1..6)"
            ],
            "inhour_formula": "ρ = Λ/T + ∑ [β_i / (1 + λ_i · T)]",
            "solver": "Unconditionally A-stable closed-form Implicit Euler (BDF) for stiff multiscale prompt/delayed coupling",
            "intermediate_steps": [
                f"1. Converted reactivity = {reactivity_pcm:.1f} pcm -> ρ = {rho:.6f} ({dollars:.3f} $ relative to β = {beta_tot:.5f}).",
                f"2. Evaluated prompt jump boundary: n_prompt/n_0 = β / (β - ρ) = {prompt_jump_ratio:.3f}.",
                f"3. Solved Nordheim Inhour equation for asymptotic reactor period: T = {asymptotic_period:.2f} s." if asymptotic_period and asymptotic_period < 1e5 else "3. System is critical/prompt-critical.",
                f"4. Associated reactor doubling time = T · ln(2) = {asymptotic_period * math.log(2):.2f} s." if asymptotic_period and asymptotic_period < 1e5 else "4. Infinite doubling time.",
                f"5. Stiff Implicit Euler stepped 6 delayed precursor ODEs across {sim_duration_sec:.0f}s with dt = 0.05s."
            ]
        },
        "datapoints": timeline
    }

