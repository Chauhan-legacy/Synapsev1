"""
FastAPI REST API Gateway for SYNAPSE.
Provides dataset ingestion, asynchronous experiment execution, evidence graphs, and reports.
"""

from __future__ import annotations
import os
import uuid
import datetime
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from synapse_core.models.signal import Signal
from synapse_core.io.readers import read_signal
from synapse_spectra.engine import SpectraEngine
from synapse_anomaly.engine import AnomalyEngine
from synapse_structure.engine import StructureEngine
from synapse_relation.engine import RelationEngine
from synapse_inference.engine import InferenceEngine
from synapse_discovery.orchestrator import run_discovery_pipeline, DiscoveryExperiment

app = FastAPI(
    title="SYNAPSE Scientific Signal Intelligence API",
    version="1.0.0",
    description="Universal signal intelligence and scientific discovery platform.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
}


class ExperimentCreateRequest(BaseModel):
    dataset_id: str
    mode: str = "automatic"
    parameters: Dict[str, Any] = Field(default_factory=dict)


@app.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": "SYNAPSE API",
        "version": "1.0.0",
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


@app.get("/v1/engines/{engine_id}")
def get_engine_details(engine_id: str):
    eng = ENGINES.get(engine_id.upper())
    if not eng:
        raise HTTPException(status_code=404, detail=f"Engine '{engine_id}' not found.")
    return {
        "name": eng.engine_name,
        "version": eng.engine_version,
    }


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
        with open(temp_path, "wb") as f:
            f.write(content)

        # Ingest into canonical Signal
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
def create_experiment(req: ExperimentCreateRequest, background_tasks: BackgroundTasks):
    if req.dataset_id not in DATASETS_STORE:
        raise HTTPException(status_code=404, detail=f"Dataset '{req.dataset_id}' not found.")

    exp_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())

    JOBS_STORE[job_id] = {
        "job_id": job_id,
        "experiment_id": exp_id,
        "status": "running",
        "progress": 0.0,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }

    # Execute experiment synchronously or via background task
    sig = DATASETS_STORE[req.dataset_id]
    experiment = run_discovery_pipeline(sig, experiment_id=exp_id, parameters=req.parameters)
    EXPERIMENTS_STORE[exp_id] = experiment

    JOBS_STORE[job_id]["status"] = "completed"
    JOBS_STORE[job_id]["progress"] = 1.0

    return {
        "experiment_id": exp_id,
        "job_id": job_id,
        "status": "completed",
    }


@app.get("/v1/experiments/{id}")
def get_experiment(id: str):
    if id not in EXPERIMENTS_STORE:
        raise HTTPException(status_code=404, detail=f"Experiment '{id}' not found.")
    exp = EXPERIMENTS_STORE[id]
    return exp.to_dict()


@app.get("/v1/experiments/{id}/findings")
def get_findings(id: str):
    if id not in EXPERIMENTS_STORE:
        raise HTTPException(status_code=404, detail=f"Experiment '{id}' not found.")
    exp = EXPERIMENTS_STORE[id]
    return {
        "experiment_id": id,
        "findings": [f.to_dict() for f in exp.all_findings],
    }


@app.get("/v1/experiments/{id}/evidence")
def get_evidence_graph(id: str):
    if id not in EXPERIMENTS_STORE:
        raise HTTPException(status_code=404, detail=f"Experiment '{id}' not found.")
    exp = EXPERIMENTS_STORE[id]
    return exp.evidence_graph.to_dict()


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


@app.get("/v1/jobs/{id}")
def get_job_status(id: str):
    if id not in JOBS_STORE:
        raise HTTPException(status_code=404, detail=f"Job '{id}' not found.")
    return JOBS_STORE[id]


@app.post("/v1/jobs/{id}/cancel")
def cancel_job(id: str):
    if id not in JOBS_STORE:
        raise HTTPException(status_code=404, detail=f"Job '{id}' not found.")
    JOBS_STORE[id]["status"] = "cancelled"
    return {"job_id": id, "status": "cancelled"}

