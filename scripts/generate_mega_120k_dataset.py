"""SYNAPSE Mega 120,000-Point Scientific Dataset Generator.

Generates an exact 120,000-row multi-channel dataset sampled at 500 Hz (T = 240 seconds)
with rigorous physical models:
  1. seismic_velocity_mps: 3-phase elastodynamic wavefield (P-wave, S-wave, Rayleigh dispersion).
  2. magnetometer_flux_nt: Earth Schumann resonance cavity modes (7.83 Hz, 14.3 Hz, 20.8 Hz) + storm step.
  3. ocean_altimetry_ssh_cm: Tidal envelope + Korteweg-de Vries (KdV) solitary internal wave depression.
  4. control_null_noise: Standard Gaussian white noise baseline for null-hypothesis FDR verification.
"""

from pathlib import Path
import numpy as np
import pandas as pd


def generate_mega_120k():
    np.random.seed(42)  # Strictly reproducible ground truth

    n_samples = 120000
    fs = 500.0  # 500 Hz sampling rate
    dt = 1.0 / fs
    duration = n_samples / fs  # 240.0 seconds
    t = np.arange(n_samples, dtype=np.float64) * dt

    print(f"Generating {n_samples:,} samples (fs = {fs} Hz, Duration = {duration:.1f} s)...")

    # -------------------------------------------------------------
    # Channel 1: Seismic Velocity (m/s)
    # -------------------------------------------------------------
    # Ambient oceanic microseism (0.15 Hz) + low-amplitude background
    seismic = 0.04 * np.sin(2.0 * np.pi * 0.15 * t) + np.random.normal(0, 0.015, n_samples)

    # Phase 1: P-Wave arrival at t = 45.0s (sample index 22,500)
    # Compressional wave: 14.5 Hz high frequency, sharp onset, fast decay
    idx_p = int(45.0 * fs)
    mask_p = t >= 45.0
    t_p = t[mask_p] - 45.0
    p_wave = 1.85 * np.sin(2.0 * np.pi * 14.5 * t_p) * np.exp(-t_p / 3.8)
    seismic[mask_p] += p_wave

    # Phase 2: S-Wave arrival at t = 110.0s (sample index 55,000)
    # Shear wave: 4.8 Hz, large amplitude, moderate decay
    idx_s = int(110.0 * fs)
    mask_s = t >= 110.0
    t_s = t[mask_s] - 110.0
    s_wave = 4.20 * np.sin(2.0 * np.pi * 4.8 * t_s) * np.exp(-t_s / 8.5)
    seismic[mask_s] += s_wave

    # Phase 3: Dispersive Rayleigh Surface Wave packet at t = 170.0s (sample index 85,000)
    # Elliptical retrograde particle motion, frequency dispersion from 0.8 to 2.2 Hz
    mask_r = (t >= 170.0) & (t <= 220.0)
    t_r = t[mask_r] - 170.0
    chirp_freq = 0.8 + 0.028 * t_r
    gaussian_envelope = np.exp(-((t[mask_r] - 192.0) ** 2) / 120.0)
    rayleigh = 3.10 * np.sin(2.0 * np.pi * chirp_freq * t_r) * gaussian_envelope
    seismic[mask_r] += rayleigh

    # -------------------------------------------------------------
    # Channel 2: Magnetometer Flux (nT)
    # -------------------------------------------------------------
    # Earth-ionospheric cavity Schumann Resonances
    schumann_1 = 3.20 * np.sin(2.0 * np.pi * 7.83 * t)   # Mode 1: 7.83 Hz
    schumann_2 = 1.65 * np.sin(2.0 * np.pi * 14.30 * t)  # Mode 2: 14.30 Hz
    schumann_3 = 0.85 * np.sin(2.0 * np.pi * 20.80 * t)  # Mode 3: 20.80 Hz
    diurnal_sq = 14.5 * np.cos(2.0 * np.pi * t / 240.0)  # Diurnal Sq variation

    # Sudden Impulse Storm Step at t = 90.0s (sample index 45,000)
    # Jump of +42.5 nT with exponential magnetospheric relaxation
    storm_step = np.zeros(n_samples, dtype=np.float64)
    mask_storm = t >= 90.0
    t_storm = t[mask_storm] - 90.0
    storm_step[mask_storm] = 42.5 * np.exp(-t_storm / 55.0)

    magnetometer = (
        50000.0  # Main geomagnetic background field (nT)
        + diurnal_sq
        + schumann_1
        + schumann_2
        + schumann_3
        + storm_step
        + np.random.normal(0, 0.45, n_samples)
    )

    # -------------------------------------------------------------
    # Channel 3: Ocean Altimetry SSH (cm)
    # -------------------------------------------------------------
    # Mean sea level + Tidal oscillation + KdV Solitary internal wave
    tidal_ssh = 35.0 * np.sin(2.0 * np.pi * (1.0 / 120.0) * t)  # 2-minute cycle envelope

    # Korteweg-de Vries (KdV) internal solitary depression wave centered at t = 120.0s
    # Form: eta(t) = - A * sech^2((t - t0) / w)
    w_soliton = 4.2  # Characteristic half-width in seconds
    sech_arg = np.clip((t - 120.0) / w_soliton, -20.0, 20.0)
    kdv_soliton = -24.8 / (np.cosh(sech_arg) ** 2)

    # Capillary wind waves
    capillary = 1.15 * np.sin(2.0 * np.pi * 3.65 * t + 0.8)

    altimetry_ssh = (
        120.0  # Baseline sea height
        + tidal_ssh
        + kdv_soliton
        + capillary
        + np.random.normal(0, 0.35, n_samples)
    )

    # -------------------------------------------------------------
    # Channel 4: Rigorous Control Null Noise (Standard Normal N(0, 1))
    # -------------------------------------------------------------
    null_noise = np.random.normal(0.0, 1.0, n_samples)

    # Construct DataFrame
    df = pd.DataFrame({
        "timestamp_sec": np.round(t, 6),
        "seismic_velocity_mps": np.round(seismic, 6),
        "magnetometer_flux_nt": np.round(magnetometer, 5),
        "ocean_altimetry_ssh_cm": np.round(altimetry_ssh, 5),
        "control_null_noise": np.round(null_noise, 6),
    })

    print(f"DataFrame created: shape = {df.shape} (rows, cols)")
    assert len(df) == 120000, f"Expected 120,000 rows, got {len(df)}"

    # Save to data/ and benchmarks/
    out_path_1 = Path("data/synapse_mega_120k_benchmark.csv")
    out_path_1.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path_1, index=False)
    print(f"Saved: {out_path_1} ({out_path_1.stat().st_size / 1024 / 1024:.2f} MB)")

    out_path_2 = Path("benchmarks/SYNAPSE_BENCHMARK_DATA/data/synapse_mega_120k_benchmark.csv")
    out_path_2.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path_2, index=False)
    print(f"Saved: {out_path_2} ({out_path_2.stat().st_size / 1024 / 1024:.2f} MB)")

    return df


if __name__ == "__main__":
    generate_mega_120k()
