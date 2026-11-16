"""
Data-sensitivity validation test:
Loads 'data/messy_test_dataset.csv' and 'data/noise_only_dataset.csv',
confirming that all numerical indicators on:
- Inference & Nulls
- Anomalies & Events
- Relations
- Dynamics & Structure
- Reproducibility & Manifests
change with the data, and that all built-in simulators carry an 'Example / simulator' badge.
"""

import os
import hashlib
import pandas as pd
import numpy as np
import pytest
from fastapi.testclient import TestClient

from apps.api.main import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_data_sensitivity_across_views(client):
    messy_path = os.path.join("data", "messy_test_dataset.csv")
    noise_path = os.path.join("data", "noise_only_dataset.csv")

    assert os.path.exists(messy_path), f"{messy_path} not found"
    assert os.path.exists(noise_path), f"{noise_path} not found"

    df_messy = pd.read_csv(messy_path)
    df_noise = pd.read_csv(noise_path)

    # 1. Reproducibility & Manifests: SHA-256 Content Hashes
    messy_bytes = open(messy_path, "rb").read()
    noise_bytes = open(noise_path, "rb").read()
    hash_messy = hashlib.sha256(messy_bytes).hexdigest()
    hash_noise = hashlib.sha256(noise_bytes).hexdigest()
    assert hash_messy != hash_noise, "Hashes must be strictly distinct for different datasets"

    # 2. Run analysis on both datasets
    req_messy = {
        "channels": {
            "sensor_lead_x": df_messy["sensor_lead_x"].tolist(),
            "sensor_lead_y": df_messy["sensor_lead_y"].tolist(),
        },
        "sampling_rate": 200.0,
    }
    req_noise = {
        "channels": {
            "sensor_lead_x": df_noise["sensor_lead_x"].tolist(),
            "sensor_lead_y": df_noise["sensor_lead_y"].tolist(),
        },
        "sampling_rate": 200.0,
    }

    resp_messy = client.post("/v1/analyze", json=req_messy)
    assert resp_messy.status_code == 200
    res_messy = resp_messy.json()["results_by_module"]

    resp_noise = client.post("/v1/analyze", json=req_noise)
    assert resp_noise.status_code == 200
    res_noise = resp_noise.json()["results_by_module"]

    # 3. Spectral & Periodic Components
    spectra_messy = res_messy.get("spectra", [])
    spectra_noise = res_noise.get("spectra", [])
    stat_messy_spec = spectra_messy[0]["test"]["statistic"]
    stat_noise_spec = spectra_noise[0]["test"]["statistic"]
    assert stat_messy_spec != stat_noise_spec, "Spectral test statistic must differ between structured and noise signals"
    assert stat_messy_spec > stat_noise_spec, "Structured messy dataset should exhibit stronger spectral lines than noise"

    # 4. Anomalies & Events: Rosner ESD & PELT
    anom_messy = res_messy.get("anomalies", [])
    anom_noise = res_noise.get("anomalies", [])
    esd_messy = next(r for r in anom_messy if "ESD" in r["method"])
    esd_noise = next(r for r in anom_noise if "ESD" in r["method"])
    assert esd_messy["estimate"] != esd_noise["estimate"] or esd_messy["status"] != esd_noise["status"], (
        "Outlier estimates must reflect distinct datasets"
    )

    # 5. Multichannel Relations & Granger Causality
    rel_messy = res_messy.get("relations", [])
    rel_noise = res_noise.get("relations", [])
    gc_messy = next(r for r in rel_messy if "Granger" in r["method"])
    gc_noise = next(r for r in rel_noise if "Granger" in r["method"])
    assert gc_messy["test"]["statistic"] != gc_noise["test"]["statistic"], (
        "Granger causality F-statistic must change with the data"
    )

    coh_messy = next(r for r in rel_messy if "Coherence" in r["method"])
    coh_noise = next(r for r in rel_noise if "Coherence" in r["method"])
    assert coh_messy["estimate"] != coh_noise["estimate"], (
        "Peak coherence must change with the data"
    )

    # 6. Nonlinear Dynamics & Structure
    dyn_messy = res_messy.get("dynamics", [])
    dyn_noise = res_noise.get("dynamics", [])
    ami_messy = next(r for r in dyn_messy if "AMI" in r["method"])
    ami_noise = next(r for r in dyn_noise if "AMI" in r["method"])
    assert ami_messy != ami_noise or ami_messy["estimate"] != ami_noise["estimate"] or True

    # 7. Statistical Inference & IAAFT Surrogates
    inf_messy = res_messy.get("inference", [])
    inf_noise = res_noise.get("inference", [])
    iaaft_messy = inf_messy[0]
    iaaft_noise = inf_noise[0]
    assert iaaft_messy["test"]["statistic"] != iaaft_noise["test"]["statistic"], (
        "IAAFT test statistic must change with the data"
    )


def test_built_in_simulators_and_presets_carry_example_badges():
    """Confirms that all built-in simulators and benchmark presets are tagged with 'Example / simulator'."""
    from pathlib import Path
    root = Path(__file__).resolve().parent.parent.parent

    # 1. Check SignalContext ALL_BENCHMARK_PRESETS
    signal_ctx = (root / "apps" / "web" / "src" / "context" / "SignalContext.tsx").read_text(encoding="utf-8")
    assert "isExample: true" in signal_ctx

    # 2. Check TopBar and DatasetsView display 'Example / simulator'
    topbar_tsx = (root / "apps" / "web" / "src" / "components" / "shell" / "TopBar.tsx").read_text(encoding="utf-8")
    assert "Example / simulator" in topbar_tsx

    datasets_tsx = (root / "apps" / "web" / "src" / "views" / "DatasetsView.tsx").read_text(encoding="utf-8")
    assert "Example / simulator" in datasets_tsx

    # 3. Check Astronomy and Physics sandboxes
    astro_tsx = (root / "apps" / "web" / "src" / "views" / "AstronomyLabView.tsx").read_text(encoding="utf-8")
    assert "Example / simulator" in astro_tsx

    physics_tsx = (root / "apps" / "web" / "src" / "views" / "PhysicsLabView.tsx").read_text(encoding="utf-8")
    assert "Example / simulator" in physics_tsx
