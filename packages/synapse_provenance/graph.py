"""
Evidence Graph Module for SYNAPSE.
Maintains a Directed Acyclic Graph (DAG) linking datasets, transformations,
analyses, candidates, statistical tests, evidence, and scientific conclusions.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
import uuid
from typing import Dict, Any, List, Set, Optional, Tuple
import datetime

from synapse_core.exceptions import ValidationError


class NodeType(str, Enum):
    DATASET = "dataset"
    TRANSFORMATION = "transformation"
    ANALYSIS = "analysis"
    CANDIDATE = "candidate"
    HYPOTHESIS = "hypothesis"
    STATISTICAL_TEST = "statistical_test"
    EVIDENCE = "evidence"
    CONCLUSION = "conclusion"


class EdgeType(str, Enum):
    DERIVED_FROM = "derived_from"
    TRANSFORMED_BY = "transformed_by"
    DETECTED_BY = "detected_by"
    SUPPORTED_BY = "supported_by"
    CONTRADICTED_BY = "contradicted_by"
    VALIDATED_BY = "validated_by"
    REJECTED_BY = "rejected_by"


@dataclass(frozen=True)
class EvidenceNode:
    """A node in the scientific evidence graph."""
    node_id: str
    node_type: NodeType
    label: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at_utc: str = field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "node_type": self.node_type.value,
            "label": self.label,
            "metadata": self.metadata,
            "created_at_utc": self.created_at_utc,
        }


@dataclass(frozen=True)
class EvidenceEdge:
    """A directed edge expressing a relationship in the evidence graph."""
    source_id: str
    target_id: str
    edge_type: EdgeType
    weight: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_id": self.source_id,
            "target_id": self.target_id,
            "edge_type": self.edge_type.value,
            "weight": self.weight,
            "metadata": self.metadata,
        }


class EvidenceGraph:
    """
    Evidence Directed Acyclic Graph (DAG) connecting raw datasets to final conclusions.
    Enforces acyclicity and provides lineage tracing.
    """

    def __init__(self):
        self._nodes: Dict[str, EvidenceNode] = {}
        self._adjacency: Dict[str, List[EvidenceEdge]] = {}       # source -> [outgoing edges]
        self._reverse_adj: Dict[str, List[EvidenceEdge]] = {}     # target -> [incoming edges]

    def add_node(
        self,
        node_id: Optional[str] = None,
        node_type: NodeType = NodeType.DATASET,
        label: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> EvidenceNode:
        nid = node_id or str(uuid.uuid4())
        if nid in self._nodes:
            raise ValidationError(f"Node '{nid}' already exists in evidence graph.")
        node = EvidenceNode(node_id=nid, node_type=node_type, label=label, metadata=metadata or {})
        self._nodes[nid] = node
        self._adjacency[nid] = []
        self._reverse_adj[nid] = []
        return node

    def add_edge(
        self,
        source_id: str,
        target_id: str,
        edge_type: EdgeType,
        weight: float = 1.0,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> EvidenceEdge:
        if source_id not in self._nodes:
            raise ValidationError(f"Source node '{source_id}' does not exist.")
        if target_id not in self._nodes:
            raise ValidationError(f"Target node '{target_id}' does not exist.")

        # Check for cycles: adding source -> target must not create a path target -> source
        if self._has_path(target_id, source_id):
            raise ValidationError(
                f"Adding edge {source_id} -> {target_id} would introduce a cycle in the evidence graph."
            )

        edge = EvidenceEdge(
            source_id=source_id,
            target_id=target_id,
            edge_type=edge_type,
            weight=weight,
            metadata=metadata or {},
        )
        self._adjacency[source_id].append(edge)
        self._reverse_adj[target_id].append(edge)
        return edge

    def get_node(self, node_id: str) -> EvidenceNode:
        if node_id not in self._nodes:
            raise KeyError(f"Node '{node_id}' not found.")
        return self._nodes[node_id]

    def get_parents(self, node_id: str) -> List[Tuple[EvidenceNode, EvidenceEdge]]:
        """Nodes that point directly into node_id (incoming edges)."""
        if node_id not in self._reverse_adj:
            return []
        return [(self._nodes[edge.source_id], edge) for edge in self._reverse_adj[node_id]]

    def get_children(self, node_id: str) -> List[Tuple[EvidenceNode, EvidenceEdge]]:
        """Nodes pointed to by node_id (outgoing edges)."""
        if node_id not in self._adjacency:
            return []
        return [(self._nodes[edge.target_id], edge) for edge in self._adjacency[node_id]]

    def trace_lineage(self, node_id: str) -> List[str]:
        """
        Backtrack all ancestor node IDs that contributed to the given node (breadth-first).
        """
        if node_id not in self._nodes:
            raise KeyError(f"Node '{node_id}' not found.")

        visited: Set[str] = set()
        queue: List[str] = [node_id]
        order: List[str] = []

        while queue:
            curr = queue.pop(0)
            if curr not in visited:
                visited.add(curr)
                order.append(curr)
                for incoming in self._reverse_adj.get(curr, []):
                    queue.append(incoming.source_id)

        return order

    def _has_path(self, start_id: str, end_id: str) -> bool:
        """Check if a directed path exists from start_id to end_id."""
        visited: Set[str] = set()
        queue: List[str] = [start_id]

        while queue:
            curr = queue.pop(0)
            if curr == end_id:
                return True
            if curr not in visited:
                visited.add(curr)
                for edge in self._adjacency.get(curr, []):
                    queue.append(edge.target_id)
        return False

    def to_dict(self) -> Dict[str, Any]:
        edges = []
        for src, edge_list in self._adjacency.items():
            for e in edge_list:
                edges.append(e.to_dict())
        return {
            "nodes": [n.to_dict() for n in self._nodes.values()],
            "edges": edges,
        }

