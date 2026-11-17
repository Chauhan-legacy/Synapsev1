"""
generate_stress_dataset.py — Generates a massive 5-channel, 350,000-row stress dataset at 1000 Hz.
Channels:
1. chirp_sweep_v: Linear frequency sweep from 5 Hz to 150 Hz.
2. am_fm_carrier: Combined amplitude- and frequency-modulated carrier.
3. chaotic_oscillation: Nonlinear chaotic trajectory (Duffing flow).
4. impulse_bursts: Poisson transient impulse spikes on baseline noise.
5. multi_harmonic: Multi-frequency harmonic sinusoid superposition (12, 35, 88, 175 Hz).
"""

import os
from pathlib import Path
import numpy as np
import pandas as pd

_ROOT = Path(__file__).resolve().parent.parent


def generate_stress_dataset(
    output_path: str | Path | None = None,
    n_samples: int = 350_000,
    fs: float = 1000.0,
    seed: int = 2026,
) -> pd.DataFrame:
    if output_path is None:
        output_path = _ROOT / "data" / "synapse_ultimate_stress_test_350k.csv"
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(seed)
    t = np.arange(n_samples) / fs
    duration = n_samples / fs

    # 1. Chirp: linear frequency sweep 5 Hz -> 150 Hz
    f0, f1 = 5.0, 150.0
    phase_chirp = 2 * np.pi * (f0 * t + ((f1 - f0) / (2.0 * duration)) * (t ** 2))
    chirp = 1.6 * np.sin(phase_chirp) + rng.normal(0, 0.1, n_samples)

    # 2. AM-FM: carrier 40 Hz modulated by 0.5 Hz AM and 0.2 Hz FM
    am = 1.0 + 0.45 * np.cos(2 * np.pi * 0.5 * t)
    fm_phase = 2 * np.pi * 40.0 * t + 2.5 * np.sin(2 * np.pi * 0.2 * t)
    am_fm = am * np.sin(fm_phase) + rng.normal(0, 0.1, n_samples)

    # 3. Chaotic oscillation: Duffing chaotic attractor (delta=0.25, gamma=0.35, omega=1.2)
    chaotic = np.zeros(n_samples)
    dt = 1.0 / fs
    cx = 0.5
    cy = 0.0
    delta, gamma, omega = 0.25, 0.35, 1.2
    for i in range(n_samples):
        ct = i * dt
        dx = cy
        dy = cx - cx**3 - delta * cy + gamma * np.cos(omega * ct)
        cx += dt * dx
        cy += dt * dy
        chaotic[i] = cx

    # 4. Impulse bursts: Poisson transient impulse spikes on Gaussian baseline
    spikes = rng.normal(0, 0.25, n_samples)
    n_spikes = 120
    spike_indices = rng.choice(n_samples, size=n_spikes, replace=False)
    spike_amplitudes = rng.choice([-1, 1], size=n_spikes) * rng.uniform(5.0, 10.0, size=n_spikes)
    spikes[spike_indices] += spike_amplitudes

    # 5. Multi-harmonic: 12, 35, 88, 175 Hz
    multi_harm = (
        1.2 * np.sin(2 * np.pi * 12.0 * t + 0.2)
        + 0.8 * np.sin(2 * np.pi * 35.0 * t - 0.5)
        + 0.5 * np.sin(2 * np.pi * 88.0 * t + 1.1)
        + 0.3 * np.sin(2 * np.pi * 175.0 * t)
        + rng.normal(0, 0.15, n_samples)
    )

    df = pd.DataFrame({
        "timestamp_sec": np.round(t, 4),
        "chirp_sweep_v": np.round(chirp, 5),
        "am_fm_carrier": np.round(am_fm, 5),
        "chaotic_oscillation": np.round(chaotic, 5),
        "impulse_bursts": np.round(spikes, 5),
        "multi_harmonic": np.round(multi_harm, 5),
    })

    df.to_csv(output_path, index=False)
    print(f"Generated 350k stress dataset: {output_path} ({len(df):,} rows, {len(df.columns)} columns)")
    return df


if __name__ == "__main__":
    generate_stress_dataset()
