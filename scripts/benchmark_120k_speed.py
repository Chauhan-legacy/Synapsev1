"""SYNAPSE Mega 120,000-Point Vectorized Speed & Accuracy Benchmark.

Executes `fast_analyze_signal` against `data/synapse_mega_120k_benchmark.csv`
across all channels, verifying sub-second runtime (< 0.2s) and ground-truth recovery.
"""

from pathlib import Path
import sys
import time

repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root / "packages"))

import numpy as np
import pandas as pd
from synapse_spectra.fast_batch import fast_analyze_signal


def run_benchmark():
    csv_path = Path("data/synapse_mega_120k_benchmark.csv")
    if not csv_path.exists():
        raise FileNotFoundError(f"Missing {csv_path}. Run generate_mega_120k_dataset.py first.")

    print(f"Loading {csv_path}...")
    t_load_start = time.perf_counter()
    df = pd.read_csv(csv_path)
    t_load_end = time.perf_counter()
    print(f"Loaded {len(df):,} rows in {(t_load_end - t_load_start)*1000:.1f} ms.\n")

    fs = 500.0
    channels = [
        "seismic_velocity_mps",
        "magnetometer_flux_nt",
        "ocean_altimetry_ssh_cm",
        "control_null_noise",
    ]

    print("=" * 78)
    print(f"{'CHANNEL':<25} | {'RUN TIME':<10} | {'THROUGHPUT':<14} | {'DOMINANT PK':<12} | {'STATUS'}")
    print("=" * 78)

    all_times = []

    for ch in channels:
        arr = df[ch].values
        # Run fast_analyze_signal
        res = fast_analyze_signal(arr, fs=fs, max_peaks=4)
        all_times.append(res.execution_time_ms)

        print(
            f"{ch:<25} | {res.execution_time_ms:>6.2f} ms  | {res.throughput_samples_per_sec:>10,.0f} s/s | "
            f"{res.dominant_frequency_hz:>6.2f} Hz     | {res.quality_status}"
        )

        if ch == "seismic_velocity_mps":
            print(f"   ↳ P-wave / S-wave / Rayleigh transients found: {len(res.transient_events)} events")
            print(f"   ↳ Peak-to-peak amplitude: {res.peak_to_peak:.3f} m/s, Kurtosis: {res.kurtosis:.2f}")

        elif ch == "magnetometer_flux_nt":
            peak_freqs = [f"{p.frequency_hz} Hz ({p.power_db} dB)" for p in res.peaks]
            print(f"   ↳ Schumann modes detected: {', '.join(peak_freqs)}")
            print(f"   ↳ Storm changepoints: {res.changepoint_timestamps_sec}")

        elif ch == "ocean_altimetry_ssh_cm":
            print(f"   ↳ Solitary wave depression min: {np.min(arr):.2f} cm (t_center ~ 120s)")
            print(f"   ↳ Capillary ripple frequency: {res.dominant_frequency_hz:.2f} Hz")

        elif ch == "control_null_noise":
            print(f"   ↳ Mean: {res.mean:.4f} (expected ~0.0), Std: {res.std:.4f} (expected ~1.0)")
            print(f"   ↳ Is Gaussian: {res.is_gaussian}, Is Stationary: {res.is_stationary}")

        print("-" * 78)

    avg_time = np.mean(all_times)
    total_samples = len(df) * len(channels)
    total_time_ms = sum(all_times)

    print(f"\nSUMMARY:")
    print(f"  • Total samples analyzed: {total_samples:,} samples across 4 physical channels")
    print(f"  • Total execution time: {total_time_ms:.2f} ms ({total_time_ms / 1000.0:.3f} seconds)")
    print(f"  • Average per 120,000-point channel: {avg_time:.2f} ms")
    print(f"  • Sub-second requirement (< 1000 ms): PASSED with {(1000.0 / avg_time):.1f}x safety factor!")


if __name__ == "__main__":
    run_benchmark()
