# ADR-0003: Evidence Graph and Scientific Provenance Architecture

## Status
Accepted

## Context
Scientific discovery requires distinguishing between:
1. An unverified feature detection (Candidate).
2. A statistically evaluated finding (Validated Finding).
3. A domain-specific conclusion (Scientific Conclusion).

To reproduce results and prevent scientific hallucinations, every finding must be traceable back through its exact parameters, software versions, transformations, and raw dataset hash.

## Decision
1. **Directed Acyclic Graph (DAG) for Evidence**:
   - Nodes represent scientific entities: `Dataset`, `Transformation`, `Analysis`, `Candidate`, `Hypothesis`, `StatisticalTest`, `Evidence`, `Conclusion`.
   - Edges represent causal, analytical, or validating relationships: `DERIVED_FROM`, `TRANSFORMED_BY`, `DETECTED_BY`, `SUPPORTED_BY`, `CONTRADICTED_BY`, `VALIDATED_BY`, `REJECTED_BY`.
2. **Immutable Provenance Manifest**:
   - Every experiment emits a deterministic JSON manifest containing:
     - `experiment_id` (UUID v4)
     - `dataset_hash` (SHA-256 of raw bytes)
     - `engine_versions` (SemVer for each involved package)
     - `parameters` (Exact configuration dictionary)
     - `preprocessing_history` (Ordered sequence of transformations)
     - `random_seeds` (For reproducible stochastic algorithms)
     - `software_environment` (Python, NumPy, SciPy versions, OS platform)
     - `timestamp` (UTC ISO-8601)
3. **No Premature Graph DB**:
   - The in-memory and serialized representation uses a clean relational/adjacency structure in pure Python with JSON and relational mapping capabilities.

## Consequences
- Every calculation produces an auditable chain of evidence.
- Full provenance reproducibility can be verified across runs.

