# ADR-0001: Monorepo Architecture and Scientific Engine Isolation

## Status
Accepted

## Context
SYNAPSE is an extensible scientific signal intelligence and discovery platform. The platform must cater to diverse deployment models: offline scientific computing, interactive workstations, and potential hosted environments. 

A critical risk in scientific software architectures is tight coupling between computational algorithms and application-level delivery mechanisms (such as web frameworks like FastAPI, client runtimes like React, or specific persistence layers like PostgreSQL or Redis). When mathematical algorithms depend on API frameworks or databases:
1. They cannot be easily imported by independent researchers in offline Python workflows.
2. Unit testing requires mocking network/DB layers, reducing test fidelity and speed.
3. Upgrades to web dependencies risk breaking numerical pipelines.

## Decision
1. **Monorepo Structure**: The repository is organized as a modular Python-first monorepo.
2. **Computational Engine Independence**: All scientific engines (`synapse-core`, `synapse-spectra`, `synapse-structure`, `synapse-anomaly`, `synapse-relation`, `synapse-inference`, `synapse-discovery`) and provenance utilities (`synapse-provenance`) must remain 100% pure Python libraries depending exclusively on core scientific numerical libraries (`numpy`, `scipy`, `pandas`, `pyarrow`, `h5py`, `statsmodels`, `pywavelets`).
3. **No Web/Database Infiltration**: The computational packages must NEVER import FastAPI, Uvicorn, SQL databases, Redis, or browser code.
4. **Shared Contract (`AnalysisEngine`)**: Engines communicate through well-defined, strongly typed contracts and canonical data structures defined in `synapse-core`.

## Consequences
- **Positive**: Complete offline capability; mathematical correctness can be tested in sub-second isolation; algorithms can be packaged as standalone Python packages or an SDK.
- **Trade-off**: Requires strict boundaries and data transfer object (DTO) mapping between API schemas and core scientific models.

