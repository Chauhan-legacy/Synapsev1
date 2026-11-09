"""
Scientific Provenance Manifest.
Provides cryptographic hashing and canonical JSON representations for exact experiment reproducibility.
"""

from __future__ import annotations
from dataclasses import dataclass, field
import hashlib
import json
import platform
import sys
import datetime
from typing import Dict, Any, List, Optional
import numpy as np


def compute_file_sha256(filepath: str, chunk_size: int = 65536) -> str:
    """Compute SHA-256 checksum of a file on disk without loading entire file into RAM."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(chunk_size):
            hasher.update(chunk)
    return hasher.hexdigest()


def canonical_json_dumps(obj: Any) -> str:
    """Serialize object to canonical deterministic JSON string."""
    def default_converter(o: Any) -> Any:
        if isinstance(o, (np.integer, np.int64, np.int32)):
            return int(o)
        if isinstance(o, (np.floating, np.float64, np.float32)):
            return float(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
        if hasattr(o, "to_dict"):
            return o.to_dict()
        raise TypeError(f"Object of type {type(o)} is not JSON serializable")

    return json.dumps(obj, sort_keys=True, separators=(",", ":"), default=default_converter)


@dataclass(frozen=True)
class ProvenanceManifest:
    """
    Immutable manifest encapsulating everything required to reproduce an analysis run.
    """
    experiment_id: str
    dataset_hash_sha256: str
    engine_versions: Dict[str, str]
    parameters: Dict[str, Any]
    preprocessing_history: List[Dict[str, Any]]
    random_seeds: Dict[str, int]
    software_environment: Dict[str, str] = field(
        default_factory=lambda: {
            "python_version": sys.version.split()[0],
            "platform": platform.platform(),
            "numpy_version": np.__version__,
        }
    )
    created_at_utc: str = field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "experiment_id": self.experiment_id,
            "dataset_hash_sha256": self.dataset_hash_sha256,
            "engine_versions": self.engine_versions,
            "parameters": self.parameters,
            "preprocessing_history": self.preprocessing_history,
            "random_seeds": self.random_seeds,
            "software_environment": self.software_environment,
            "created_at_utc": self.created_at_utc,
        }

    def compute_manifest_hash(self) -> str:
        """Returns the SHA-256 hash of the canonical serialized manifest."""
        canonical_str = canonical_json_dumps(self.to_dict())
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

