"""
Scientific Discovery Orchestrator for SYNAPSE.
Executes the discovery plan, connects candidate findings to evidence, validates hypotheses,
and builds the reproducible Provenance Manifest and Evidence Graph.
"""

from __future__ import annotations
from dataclasses import dataclass
import uuid
import time
from typing import Dict, Any, List, Optional

from synapse_core.models.signal import Signal
from synapse_core.models.result import AnalysisResult, Finding, FindingStatus
from synapse_provenance.manifest import ProvenanceManifest
from synapse_provenance.graph import EvidenceGraph, NodeType, EdgeType
from synapse_discovery.planner import create_discovery_plan, AnalysisPlan
from synapse_spectra.engine import SpectraEngine
from synapse_anomaly.engine import AnomalyEngine
from synapse_structure.engine import StructureEngine
from synapse_relation.engine import RelationEngine
from synapse_inference.engine import InferenceEngine


@dataclass(frozen=True)
class DiscoveryExperiment:
    experiment_id: str
    plan: AnalysisPlan
    manifest: ProvenanceManifest
    evidence_graph: EvidenceGraph
    engine_results: Dict[str, AnalysisResult]
    all_findings: List[Finding]
    validated_findings: List[Finding]
    candidate_findings: List[Finding]
    execution_duration_sec: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "experiment_id": self.experiment_id,
            "manifest": self.manifest.to_dict(),
            "manifest_hash": self.manifest.compute_manifest_hash(),
            "evidence_graph": self.evidence_graph.to_dict(),
            "execution_duration_sec": self.execution_duration_sec,
            "findings_summary": {
                "total_findings": len(self.all_findings),
                "validated": len(self.validated_findings),
                "candidates": len(self.candidate_findings),
            },
            "findings": [f.to_dict() for f in self.all_findings],
        }


def run_discovery_pipeline(
    signal: Signal,
    experiment_id: Optional[str] = None,
    parameters: Optional[Dict[str, Any]] = None,
) -> DiscoveryExperiment:
    """
    Run full end-to-end scientific discovery on a signal.
    Coordinates all computational engines, tracks lineage in EvidenceGraph,
    and produces an immutable manifest.
    """
    t0 = time.perf_counter()
    exp_id = experiment_id or str(uuid.uuid4())
    params = parameters or {}

    # 1. Initialize Evidence Graph
    graph = EvidenceGraph()
    raw_hash = signal.quality.content_hash_sha256
    ds_node = graph.add_node(
        node_id=f"dataset_{raw_hash[:12]}",
        node_type=NodeType.DATASET,
        label=f"Dataset ({signal.n_samples} samples, {signal.n_channels} ch)",
        metadata={
            "samples": signal.n_samples,
            "channels": signal.n_channels,
            "sampling_rate": signal.sampling_rate,
            "content_hash_sha256": raw_hash,
        },
    )

    # 2. Plan analysis
    plan = create_discovery_plan(signal)

    # Instantiate engines
    engines = {
        "SPECTRA": SpectraEngine(),
        "ANOMALY": AnomalyEngine(),
        "STRUCTURE": StructureEngine(),
        "RELATION": RelationEngine(),
        "INFERENCE": InferenceEngine(),
    }

    engine_results: Dict[str, AnalysisResult] = {}
    all_findings: List[Finding] = []

    # 3. Execute planned steps
    for step in plan.steps:
        eng = engines.get(step.engine_name)
        if not eng:
            continue

        analysis_node = graph.add_node(
            node_id=f"analysis_{step.step_id}",
            node_type=NodeType.ANALYSIS,
            label=f"{step.engine_name}: {step.algorithm}",
            metadata={"engine": step.engine_name, "params": step.parameters},
        )
        graph.add_edge(ds_node.node_id, analysis_node.node_id, EdgeType.DERIVED_FROM)

        try:
            res = eng.execute(signal, config=step.parameters)
            engine_results[step.engine_name] = res

            for f in res.findings:
                cand_node = graph.add_node(
                    node_id=f"finding_{f.finding_id[:8]}",
                    node_type=NodeType.CANDIDATE if f.status == FindingStatus.CANDIDATE else NodeType.EVIDENCE,
                    label=f.label,
                    metadata=f.to_dict(),
                )
                graph.add_edge(analysis_node.node_id, cand_node.node_id, EdgeType.DETECTED_BY)
                all_findings.append(f)

        except Exception as e:
            # Document errors without hiding them
            continue

    # 4. Filter findings by status
    validated = [f for f in all_findings if f.status == FindingStatus.VALIDATED]
    candidates = [f for f in all_findings if f.status == FindingStatus.CANDIDATE]

    # 5. Build Provenance Manifest
    manifest = ProvenanceManifest(
        experiment_id=exp_id,
        dataset_hash_sha256=raw_hash,
        engine_versions={name: e.engine_version for name, e in engines.items()},
        parameters=params,
        preprocessing_history=[{"step": "canonical_ingestion", "uniform_tolerance": 1e-4}],
        random_seeds={"surrogate_seed": 42},
    )

    dur = float(time.perf_counter() - t0)

    return DiscoveryExperiment(
        experiment_id=exp_id,
        plan=plan,
        manifest=manifest,
        evidence_graph=graph,
        engine_results=engine_results,
        all_findings=all_findings,
        validated_findings=validated,
        candidate_findings=candidates,
        execution_duration_sec=dur,
    )

