"""
SYNAPSE Python SDK.
Provides both direct offline scientific analysis and hosted client interactions.
"""

from __future__ import annotations
import os
from typing import Optional, List, Dict, Any, Union
import json

from synapse_core.models.signal import Signal
from synapse_core.io.readers import read_signal
from synapse_discovery.orchestrator import run_discovery_pipeline, DiscoveryExperiment


def analyze(
    dataset_path_or_signal: Union[str, Signal],
    time_column: Optional[str] = None,
    signal_columns: Optional[List[str]] = None,
    uniformity_tolerance: float = 1e-4,
    parameters: Optional[Dict[str, Any]] = None,
) -> DiscoveryExperiment:
    """
    Independent offline scientific analysis.
    Works 100% locally with zero internet access, no external AI, and no database required.
    
    Usage:
        from synapse_sdk import analyze
        experiment = analyze("timeseries.csv", time_column="time")
        print(f"Discovered {len(experiment.validated_findings)} validated findings.")
    """
    if isinstance(dataset_path_or_signal, Signal):
        sig = dataset_path_or_signal
    elif isinstance(dataset_path_or_signal, str):
        sig = read_signal(
            dataset_path_or_signal,
            time_column=time_column,
            signal_columns=signal_columns,
            uniformity_tolerance=uniformity_tolerance,
        )
    else:
        raise TypeError(f"Expected filepath (str) or Signal instance, got {type(dataset_path_or_signal)}.")

    return run_discovery_pipeline(sig, parameters=parameters)


class DatasetHandle:
    def __init__(self, dataset_id: str, client: Client):
        self.id = dataset_id
        self._client = client


class ExperimentHandle:
    def __init__(self, experiment_id: str, client: Client):
        self.id = experiment_id
        self._client = client

    def wait(self, timeout_sec: float = 60.0) -> Dict[str, Any]:
        return self._client._get(f"/v1/experiments/{self.id}")


class Client:
    """
    Client for hosted SYNAPSE REST API.
    """
    def __init__(self, api_key: Optional[str] = None, base_url: str = "http://127.0.0.1:8000"):
        self.api_key = api_key or os.getenv("SYNAPSE_API_KEY", "")
        self.base_url = base_url.rstrip("/")

    def _get(self, path: str) -> Dict[str, Any]:
        import urllib.request
        req = urllib.request.Request(f"{self.base_url}{path}")
        if self.api_key:
            req.add_header("Authorization", f"Bearer {self.api_key}")
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))

    @property
    def datasets(self):
        class DatasetsAPI:
            def __init__(self, parent: Client):
                self.parent = parent
            def upload(self, filepath: str) -> DatasetHandle:
                # Local mock or HTTP multipart
                return DatasetHandle("ds_local_id", self.parent)
        return DatasetsAPI(self)

    @property
    def experiments(self):
        class ExperimentsAPI:
            def __init__(self, parent: Client):
                self.parent = parent
            def create(self, dataset_id: str, mode: str = "automatic") -> ExperimentHandle:
                return ExperimentHandle("exp_local_id", self.parent)
        return ExperimentsAPI(self)

