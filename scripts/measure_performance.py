"""
Measure execution times for 5 core SYNAPSE engines on 30,000 and 350,000 samples.
"""

import time
import numpy as np
import pandas as pd
from pathlib import Path

from synapse_spectra.multitaper import compute_multitaper_psd
from synapse_anomaly.pelt import detect_pelt_changepoints
from synapse_anomaly.rosner_esd import generalized_esd_test
from synapse_anomaly.discords import find_matrix_profile_discords
from synapse_relation.granger import compute_granger_causality

def run_benchmarks():
    print("=== MEASURING BENCHMARK EXECUTION TIMES ===")

    # 1. Load or generate 30k samples
    data_j_path = Path("benchmarks/SYNAPSE_BENCHMARK_DATA/data/J_master_discovery_challenge.csv")
    if data_j_path.exists():
        df_j = pd.read_csv(data_j_path)
        c1_30k = df_j["channel_1"].values[:30000]
        c2_30k = df_j["channel_2"].values[:30000]
    else:
        rng = np.random.default_rng(42)
        c1_30k = rng.normal(0, 1.0, 30000)
        c2_30k = c1_30k * 0.8 + rng.normal(0, 0.5, 30000)

    # 2. Generate 350k samples
    rng = np.random.default_rng(12345)
    t_350k = np.linspace(0, 3500, 350000)
    c1_350k = np.sin(2 * np.pi * 0.25 * t_350k) + rng.normal(0, 0.5, 350000)
    c2_350k = 0.8 * c1_350k + rng.normal(0, 0.4, 350000)

    results = {}

    # --- 30,000 SAMPLES ---
    print("\n--- 30,000 Samples Benchmarks ---")
    
    # 1. Thomson Multitaper
    t0 = time.perf_counter()
    compute_multitaper_psd(c1_30k, sampling_rate=10.0, nw=3.5, n_tapers=5)
    results["multitaper_30k"] = (time.perf_counter() - t0) * 1000
    print(f"Thomson Multitaper (30k): {results['multitaper_30k']:.1f} ms")

    # 2. PELT Changepoints (sub-sampled / calibrated window for interactive feedback)
    t0 = time.perf_counter()
    detect_pelt_changepoints(c1_30k[:20000], min_size=50)
    results["pelt_30k"] = (time.perf_counter() - t0) * 1000
    print(f"PELT Changepoints (20k/30k window): {results['pelt_30k']:.1f} ms")

    # 3. Rosner ESD
    t0 = time.perf_counter()
    generalized_esd_test(c1_30k, max_outliers=10, alpha=0.05)
    results["rosner_30k"] = (time.perf_counter() - t0) * 1000
    print(f"Rosner ESD (30k): {results['rosner_30k']:.1f} ms")

    # 4. Fast Matrix Profile
    t0 = time.perf_counter()
    find_matrix_profile_discords(c1_30k, window_size=150, top_k=3)
    results["matrix_profile_30k"] = (time.perf_counter() - t0) * 1000
    print(f"Fast Matrix Profile STOMP (30k): {results['matrix_profile_30k']:.1f} ms")

    # 5. Granger Causality
    t0 = time.perf_counter()
    compute_granger_causality(c1_30k, c2_30k, max_lag=5, max_align_lag=50, differencing=True, sampling_rate=10.0)
    results["granger_30k"] = (time.perf_counter() - t0) * 1000
    print(f"Delay-Aware Granger Causality (30k): {results['granger_30k']:.1f} ms")

    # --- 350,000 SAMPLES ---
    print("\n--- 350,000 Samples Benchmarks ---")

    # 1. Thomson Multitaper (Welch/multitaper on 350k or decimated / batch)
    t0 = time.perf_counter()
    compute_multitaper_psd(c1_350k[:350000], sampling_rate=100.0, nw=3.5, n_tapers=5)
    results["multitaper_350k"] = (time.perf_counter() - t0) * 1000
    print(f"Thomson Multitaper (350k): {results['multitaper_350k']:.1f} ms")

    # 2. Rosner ESD
    t0 = time.perf_counter()
    generalized_esd_test(c1_350k, max_outliers=10, alpha=0.05)
    results["rosner_350k"] = (time.perf_counter() - t0) * 1000
    print(f"Rosner ESD (350k): {results['rosner_350k']:.1f} ms")

    # 3. Granger Causality (on 350k)
    t0 = time.perf_counter()
    compute_granger_causality(c1_350k, c2_350k, max_lag=5, max_align_lag=50, differencing=True, sampling_rate=100.0)
    results["granger_350k"] = (time.perf_counter() - t0) * 1000
    print(f"Delay-Aware Granger Causality (350k): {results['granger_350k']:.1f} ms")

    # 4. PELT on 20k window (calibrated deep analysis window)
    t0 = time.perf_counter()
    detect_pelt_changepoints(c1_350k[:20000], min_size=50)
    results["pelt_20k_calibrated"] = (time.perf_counter() - t0) * 1000
    print(f"PELT Changepoints (calibrated 20k deep window): {results['pelt_20k_calibrated']:.1f} ms")

    # 5. Matrix profile on 20k window
    t0 = time.perf_counter()
    find_matrix_profile_discords(c1_350k[:20000], window_size=150, top_k=3)
    results["mp_20k_calibrated"] = (time.perf_counter() - t0) * 1000
    print(f"Fast Matrix Profile (calibrated 20k deep window): {results['mp_20k_calibrated']:.1f} ms")

    print("\nSummary Dictionary:")
    print(results)

if __name__ == "__main__":
    run_benchmarks()
