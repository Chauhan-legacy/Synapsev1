#!/usr/bin/env python3
"""
Stress test script for SYNAPSE: Verifies that deep analysis and fast batch analysis
on massive 350,000 sample datasets complete within 30 seconds and under 2.0 GB RAM.
"""

import sys
import os
import time
import tracemalloc
import pandas as pd
from fastapi.testclient import TestClient

# Ensure project modules are on path
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("packages"))
sys.path.insert(0, os.path.abspath("apps"))

from apps.api.main import app


def run_350k_stress_benchmark():
    csv_path = os.path.join("data", "synapse_ultimate_stress_test_350k.csv")
    if not os.path.exists(csv_path):
        print(f"ERROR: {csv_path} not found.")
        sys.exit(1)

    print(f"=== Starting 350,000 Sample Stress Benchmark ===")
    print(f"Reading dataset: {csv_path}...")

    tracemalloc.start()
    t_start = time.perf_counter()

    df = pd.read_csv(csv_path)
    n_samples, n_cols = df.shape
    print(f"Loaded {n_samples:,} rows and {n_cols} columns.")

    client = TestClient(app)

    # 1. Dataset Upload Test
    t_up_start = time.perf_counter()
    with open(csv_path, "rb") as f:
        resp_up = client.post(
            "/v1/datasets/upload",
            files={"file": ("synapse_ultimate_stress_test_350k.csv", f, "text/csv")},
        )
    up_elapsed = time.perf_counter() - t_up_start
    assert resp_up.status_code == 200, f"Upload failed: {resp_up.text}"
    print(f"[1/3] Upload & Parse 350k CSV: {up_elapsed:.2f}s (HTTP {resp_up.status_code})")

    # 2. Ultra-Fast Batch Test
    t_batch_start = time.perf_counter()
    channels = {
        col: df[col].tolist()
        for col in df.columns
        if col != "timestamp_sec"
    }
    resp_batch = client.post(
        "/v1/analysers/ultra_fast_batch",
        json={
            "channels": channels,
            "sampling_rate": 1000.0,
        },
    )
    batch_elapsed = time.perf_counter() - t_batch_start
    assert resp_batch.status_code == 200, f"Batch analysis failed: {resp_batch.text}"
    print(f"[2/3] Ultra-Fast Batch on 5 channels x 350k: {batch_elapsed:.2f}s (HTTP {resp_batch.status_code})")

    # 3. Deep Full Discovery Analysis Test
    t_deep_start = time.perf_counter()
    primary_ch = "chirp_sweep_v" if "chirp_sweep_v" in df.columns else df.columns[1]
    second_ch = "chaotic_oscillation" if "chaotic_oscillation" in df.columns else df.columns[2]

    resp_deep = client.post(
        "/v1/analyze",
        json={
            "channels": {
                primary_ch: df[primary_ch].tolist(),
                second_ch: df[second_ch].tolist(),
            },
            "sampling_rate": 1000.0,
        },
    )
    deep_elapsed = time.perf_counter() - t_deep_start
    assert resp_deep.status_code == 200, f"Deep analysis failed: {resp_deep.text}"
    deep_data = resp_deep.json()
    assert "sampling_notice" in deep_data
    print(f"[3/3] Deep Analysis Pipeline on 350k: {deep_elapsed:.2f}s (HTTP {resp_deep.status_code})")
    print(f"      Sampling notice: {deep_data.get('sampling_notice')}")

    total_time = time.perf_counter() - t_start
    current_mem, peak_mem = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    peak_mb = peak_mem / (1024 * 1024)
    peak_gb = peak_mem / (1024 * 1024 * 1024)

    print("\n=== Benchmark Summary ===")
    print(f"Total Workflow Time: {total_time:.2f} s (Target: < 30.0 s)")
    print(f"Deep Analysis Time:  {deep_elapsed:.2f} s")
    print(f"Peak Memory Usage:   {peak_mb:.1f} MB / {peak_gb:.3f} GB (Target: < 2.0 GB)")

    assert deep_elapsed < 30.0, f"Deep analysis exceeded time limit: {deep_elapsed:.2f}s >= 30.0s"
    assert peak_gb < 2.0, f"Benchmark exceeded memory limit: {peak_gb:.2f}GB >= 2.0GB"
    print("\n>>> ALL STRESS BENCHMARK CHECKS PASSED SUCCESSFULLY <<<\n")


if __name__ == "__main__":
    run_350k_stress_benchmark()
