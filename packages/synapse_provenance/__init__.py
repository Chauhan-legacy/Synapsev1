"""
SYNAPSE Provenance Package.
Manages deterministic manifests, SHA-256 verification, and evidence DAGs.
"""

from synapse_provenance.manifest import (
    ProvenanceManifest,
    compute_file_sha256,
    canonical_json_dumps,
)
from synapse_provenance.graph import (
    EvidenceGraph,
    EvidenceNode,
    EvidenceEdge,
    NodeType,
    EdgeType,
)

__all__ = [
    "ProvenanceManifest",
    "compute_file_sha256",
    "canonical_json_dumps",
    "EvidenceGraph",
    "EvidenceNode",
    "EvidenceEdge",
    "NodeType",
    "EdgeType",
]

