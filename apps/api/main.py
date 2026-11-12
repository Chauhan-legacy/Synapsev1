"""
FastAPI REST API Gateway for SYNAPSE.
Provides dataset ingestion, asynchronous experiment execution, evidence graphs, and reports.
"""

from __future__ import annotations
import sys
from pathlib import Path

# Ensure monorepo packages are discoverable
_ROOT = Path(__file__).resolve().parent.parent.parent
_PACKAGES = _ROOT / "packages"
if str(_PACKAGES) not in sys.path:
    sys.path.insert(0, str(_PACKAGES))
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import os
import uuid
import datetime
import json
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from synapse_core.models.signal import Signal
from synapse_core.io.readers import read_signal
from synapse_core.exceptions import ValidationError as SynapseValidationError, DataIntegrityError
from synapse_spectra.engine import SpectraEngine
from synapse_anomaly.engine import AnomalyEngine
from synapse_structure.engine import StructureEngine
from synapse_relation.engine import RelationEngine
from synapse_inference.engine import InferenceEngine
from synapse_statistics.engine import StatisticsEngine
from synapse_discovery.orchestrator import (
    run_discovery_pipeline,
    DiscoveryExperiment,
    generate_html_investigation_report,
)
from apps.api.routers.arxiv_router import router as arxiv_router
from apps.api.routers.astronomy_router import router as astronomy_router
from apps.api.routers.analysis_router import router as analysis_router

app = FastAPI(
    title="SYNAPSE Scientific Signal Intelligence API",
    version="2.0.0",
    description="Universal signal intelligence and scientific discovery platform.",
)

@app.exception_handler(SynapseValidationError)
async def synapse_validation_exception_handler(request: Request, exc: SynapseValidationError):
    error_msg = str(exc)
    what_to_try = "Verify that the input signal is non-empty, contains at least 8 samples, has positive sampling rate, and is formatted correctly."
    if "sampling" in error_msg.lower() or "timestamp" in error_msg.lower():
        what_to_try = "Ensure timestamps are strictly ascending and sampling_rate is strictly positive (> 0 Hz)."
    elif "sample" in error_msg.lower():
        what_to_try = "Provide at least 8 samples for spectral and anomaly analysis."
    elif "column" in error_msg.lower():
        what_to_try = "Specify a valid numeric time column using the 'time_column' query parameter."

    return JSONResponse(
        status_code=422,
        content={
            "error": error_msg,
            "what_to_try": what_to_try,
            "module": getattr(exc, "module", "synapse_core"),
        },
    )

@app.exception_handler(DataIntegrityError)
async def synapse_integrity_exception_handler(request: Request, exc: DataIntegrityError):
    return JSONResponse(
        status_code=422,
        content={
            "error": str(exc),
            "what_to_try": "Ensure input data contains no NaN, Infinite, or corrupt floating point numbers.",
            "module": getattr(exc, "module", "synapse_core"),
        },
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(arxiv_router)
app.include_router(astronomy_router)
app.include_router(analysis_router)

# In-memory storage for datasets, experiments, and async jobs
DATASETS_STORE: Dict[str, Signal] = {}
DATASETS_META: Dict[str, Dict[str, Any]] = {}
EXPERIMENTS_STORE: Dict[str, DiscoveryExperiment] = {}
JOBS_STORE: Dict[str, Dict[str, Any]] = {}

ENGINES = {
    "SPECTRA": SpectraEngine(),
    "ANOMALY": AnomalyEngine(),
    "STRUCTURE": StructureEngine(),
    "RELATION": RelationEngine(),
    "INFERENCE": InferenceEngine(),
    "STATISTICS": StatisticsEngine(),
}

# Auto-load benchmark datasets if available
BENCHMARK_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "benchmarks", "SYNAPSE_BENCHMARK_DATA")
BENCHMARKS_CACHE: Dict[str, Any] = {}


def load_benchmarks_catalog() -> List[Dict[str, Any]]:
    if not os.path.exists(BENCHMARK_DIR):
        return []

    data_dir = os.path.join(BENCHMARK_DIR, "data")
    gt_dir = os.path.join(BENCHMARK_DIR, "ground_truth")
    meta_dir = os.path.join(BENCHMARK_DIR, "metadata")

    catalog = []
    if not os.path.exists(data_dir):
        return []

    for fn in sorted(os.listdir(data_dir)):
        if not fn.endswith(".csv"):
            continue
        code = fn.split("_")[0]
        csv_path = os.path.join(data_dir, fn)
        gt_path = os.path.join(gt_dir, f"{code}_ground_truth.json")
        meta_path = os.path.join(meta_dir, f"{code}_metadata.json")

        gt_data = {}
        if os.path.exists(gt_path):
            try:
                with open(gt_path, "r", encoding="utf-8") as f:
                    gt_data = json.load(f)
            except Exception:
                pass

        meta_data = {}
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta_data = json.load(f)
            except Exception:
                pass

        catalog.append({
            "code": code,
            "filename": fn,
            "path": csv_path,
            "metadata": meta_data,
            "ground_truth": gt_data,
        })
    return catalog


class ExperimentCreateRequest(BaseModel):
    dataset_id: str
    mode: str = "automatic"
    parameters: Dict[str, Any] = Field(default_factory=dict)


class ModuleExecutionRequest(BaseModel):
    parameters: Dict[str, Any] = Field(default_factory=dict)


@app.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": "SYNAPSE API",
        "version": "2.0.0",
        "timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "registered_engines": list(ENGINES.keys()),
    }


@app.get("/v1/engines")
def list_engines():
    return {
        "engines": [
            {
                "name": name,
                "version": eng.engine_version,
            }
            for name, eng in ENGINES.items()
        ]
    }


@app.get("/v1/benchmarks")
def get_benchmarks():
    return {"benchmarks": load_benchmarks_catalog()}


@app.get("/v1/benchmarks/{code}")
def load_benchmark_into_store(code: str):
    cat = load_benchmarks_catalog()
    match = next((b for b in cat if b["code"].upper() == code.upper()), None)
    if not match:
        raise HTTPException(status_code=404, detail=f"Benchmark '{code}' not found.")

    ds_id = f"benchmark_{match['code']}"
    if ds_id not in DATASETS_STORE:
        signal = read_signal(match["path"])
        DATASETS_STORE[ds_id] = signal
        DATASETS_META[ds_id] = {
            "id": ds_id,
            "filename": match["filename"],
            "samples": signal.n_samples,
            "channels": signal.n_channels,
            "sampling_rate": signal.sampling_rate,
            "is_uniform": signal.is_uniform,
            "hash": signal.quality.content_hash_sha256,
            "is_benchmark": True,
            "ground_truth": match["ground_truth"],
        }
    return DATASETS_META[ds_id]


@app.post("/v1/datasets/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    time_column: Optional[str] = Query(None),
):
    ds_id = str(uuid.uuid4())
    temp_dir = os.path.join(os.path.dirname(__file__), "..", "..", "scratch", "uploads")
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f"{ds_id}_{file.filename}")

    try:
        content = await file.read()
        import hashlib
        raw_sha256 = hashlib.sha256(content).hexdigest()
        with open(temp_path, "wb") as f:
            f.write(content)

        signal = read_signal(temp_path, time_column=time_column)
        DATASETS_STORE[ds_id] = signal
        DATASETS_META[ds_id] = {
            "id": ds_id,
            "filename": file.filename,
            "samples": signal.n_samples,
            "channels": signal.n_channels,
            "sampling_rate": signal.sampling_rate,
            "is_uniform": signal.is_uniform,
            "hash": signal.quality.content_hash_sha256,
            "original_sha256": signal.metadata.get("original_sha256", raw_sha256),
            "timestamps_linearized": signal.metadata.get("timestamps_linearized", False),
            "linearization_message": signal.metadata.get("linearization_message", None),
            "uploaded_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }

        return DATASETS_META[ds_id]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/v1/datasets/{id}")
def get_dataset(id: str):
    if id not in DATASETS_META:
        raise HTTPException(status_code=404, detail=f"Dataset '{id}' not found.")
    sig = DATASETS_STORE[id]
    meta = DATASETS_META[id].copy()
    meta["quality_report"] = {
        "warnings": list(sig.quality.warnings),
        "total_samples": sig.quality.total_samples,
        "channel_count": sig.quality.channel_count,
        "memory_bytes": sig.quality.memory_bytes,
    }
    return meta


@app.post("/v1/experiments")
def create_experiment(req: ExperimentCreateRequest):
    if req.dataset_id not in DATASETS_STORE:
        raise HTTPException(status_code=404, detail=f"Dataset '{req.dataset_id}' not found.")

    exp_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())

    sig = DATASETS_STORE[req.dataset_id]
    experiment = run_discovery_pipeline(sig, experiment_id=exp_id, parameters=req.parameters)
    EXPERIMENTS_STORE[exp_id] = experiment

    return {
        "experiment_id": exp_id,
        "job_id": job_id,
        "status": "completed",
    }


@app.post("/v1/experiments/{id}/modules/{module}")
def execute_single_module(id: str, module: str, req: ModuleExecutionRequest):
    eng = ENGINES.get(module.upper())
    if not eng:
        raise HTTPException(status_code=404, detail=f"Module/Engine '{module}' not found.")

    exp = EXPERIMENTS_STORE.get(id)
    if not exp:
        raise HTTPException(status_code=404, detail=f"Experiment '{id}' not found.")

    ds_hash = exp.manifest.dataset_hash_sha256
    matching_sig = next((s for s in DATASETS_STORE.values() if s.quality.content_hash_sha256 == ds_hash), None)
    if not matching_sig:
        raise HTTPException(status_code=404, detail="Dataset signal not found in active store.")

    res = eng.execute(matching_sig, config=req.parameters)
    return res.to_dict()


@app.get("/v1/experiments/{id}")
def get_experiment(id: str):
    if id not in EXPERIMENTS_STORE:
        raise HTTPException(status_code=404, detail=f"Experiment '{id}' not found.")
    exp = EXPERIMENTS_STORE[id]
    return exp.to_dict()


@app.get("/v1/experiments/{id}/report")
def get_report(id: str):
    if id not in EXPERIMENTS_STORE:
        raise HTTPException(status_code=404, detail=f"Experiment '{id}' not found.")
    exp = EXPERIMENTS_STORE[id]
    return {
        "title": "SYNAPSE Scientific Investigation Report",
        "experiment_id": id,
        "generated_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "manifest_hash": exp.manifest.compute_manifest_hash(),
        "findings_summary": {
            "total": len(exp.all_findings),
            "validated": len(exp.validated_findings),
            "candidates": len(exp.candidate_findings),
        },
        "findings": [f.to_dict() for f in exp.all_findings],
        "reproducibility": {
            "software_env": exp.manifest.software_environment,
            "engine_versions": exp.manifest.engine_versions,
        },
    }


@app.get("/v1/experiments/{id}/report/html", response_class=HTMLResponse)
def get_report_html(id: str):
    if id not in EXPERIMENTS_STORE:
        raise HTTPException(status_code=404, detail=f"Experiment '{id}' not found.")
    exp = EXPERIMENTS_STORE[id]
    return HTMLResponse(content=generate_html_investigation_report(exp))
