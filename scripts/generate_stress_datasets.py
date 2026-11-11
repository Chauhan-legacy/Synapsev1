"""
Generate benchmark stress-test datasets for 10K, 300K, and 1M rows.
Used to benchmark browser-side CSV ingestion, Papa Parse, Web Workers, and uPlot.
"""
import os
import numpy as np

def generate_csv(path: str, n_samples: int, fs: float, channel_names: list[str]):
    print(f"Generating {path} with {n_samples:,} rows...")
    t = np.arange(n_samples) / fs
    data = {"timestamp_sec": t}
    for i, name in enumerate(channel_names):
        freq1 = 5.0 + 3.0 * i
        freq2 = 22.0 + 5.0 * i
        # Clean physical signal + modulated oscillation + realistic noise
        sig = 1.5 * np.sin(2 * np.pi * freq1 * t) + 0.8 * np.cos(2 * np.pi * freq2 * t)
        noise = np.random.normal(0, 0.15, size=n_samples)
        data[name] = np.round(sig + noise, 5)
    
    # Save CSV
    import pandas as pd
    df = pd.DataFrame(data)
    df.to_csv(path, index=False)
    size_mb = os.path.getsize(path) / (1024 * 1024)
    print(f"Created {path} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    # 10K dataset
    generate_csv("data/synapse_test_10k.csv", 10_000, 100.0, ["channel_a", "channel_b"])
    # 300K dataset
    generate_csv("data/synapse_stress_300k.csv", 300_000, 250.0, ["accelerometer_x", "accelerometer_y", "accelerometer_z"])
    # 1M dataset
    generate_csv("data/synapse_stress_1m.csv", 1_000_000, 500.0, ["strain_primary", "strain_reference"])
    print("All stress test datasets generated successfully.")

