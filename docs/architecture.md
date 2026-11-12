# SYNAPSE Architecture & Engineering Specification

## 1. System Structure

The SYNAPSE repository is structured as a modular mono-repository comprising pure mathematical computational packages, asynchronous REST gateway services, and a hardware-grade React/TypeScript scientific workbench:

```text
SYNAPSE/
├── packages/
│   ├── synapse_core/         # Canonical Signal model, quality profiling, contracts & exceptions
│   ├── synapse_spectra/      # Welch PSD, Multitaper DPSS, Lomb-Scargle, CRLB Sinusoid, Burg AR, CWT, Allan Deviation
│   ├── synapse_statistics/   # Joint ADF/KPSS Stationarity, Jarque-Bera & Shapiro Normality, ACF, DFA (Hurst Exponent)
│   ├── synapse_anomaly/      # Rosner ESD Outlier Test, PELT Changepoints, BOCPD, Matrix Profile Discords, Agreement Matrix
│   ├── synapse_structure/    # AMI Delay & FNN Embedding, RQA, Sample & Permutation Entropy, Higuchi Fractal D, Lyapunov
│   ├── synapse_relation/     # Coherence with Carter Threshold, Granger Causality VAR, Transfer Entropy, DTW, FastICA
│   ├── synapse_inference/    # IAAFT Surrogates, Moving-Block Bootstrap, BCa CIs, BH & BY FDR Control, BIC Model Selection
│   ├── synapse_discovery/    # Automated analysis planning, candidate ranking, HTML/PDF reporting
│   ├── synapse_provenance/   # Evidence DAG (Directed Acyclic Graph) & Cryptographic SHA-256 Manifests
│   └── synapse_sdk/          # Offline `synapse.analyze()` and hosted `synapse.Client`
├── connectors/               # Public zero-auth API integrations: GWOSC, NASA Exoplanet TAP, NOAA GOES, USGS FDSN
├── apps/
│   ├── api/                  # Python FastAPI REST gateway (/health, /datasets, /experiments, /benchmarks)
│   └── web/                  # React 18 + TypeScript + Tailwind Scientific Discovery Workbench (15 Labs)
├── benchmarks/               # Standardized benchmark library Datasets A through J with synthetic ground truth
├── docs/                     # Architectural audits, validation studies, and vector SVG power curves
└── tests/                    # Analytical, unit, and numerical regression test suite (73 passing pytest tests)
```

## 2. Invariants & Data Integrity

1. **Array Immutability**: All signal arrays loaded into `Signal` instances have NumPy `writeable = False` flags set immediately upon ingestion.
2. **Deterministic Time-Axis Validation**: Timestamps are validated for strict monotonicity and uniform step size $\Delta t$. When non-monotonic batch resets occur in concatenated datasets, continuous time linearization is applied, and the original file SHA-256 is preserved.
3. **Cryptographic Provenance DAG**: Every analytical finding references its parent telemetry slice, parameter set, and engine version through a SHA-256 content hash.
4. **False Discovery Rate (FDR) Control**: Spectral lines and candidate discoveries are controlled via Benjamini-Hochberg procedures ($q \le 0.05$) to bound false discoveries under the null hypothesis.

## 3. Paper Teal Design System

The user interface adheres to the **Paper Teal** design system:
* Canvas: Ivory paper tones (`#F6F3EC` and `#FFFDF9`).
* Cards: Crisp white surfaces (`#FFFFFF`) with warm cream borders (`#DDD6C7` / `#E6E1D6`).
* Accents: Deep Teal (`#0F766E`), Indigo (`#4338CA`), Amber (`#D97706`), and Crimson (`#DC2626`).
* Typography: JetBrains Mono for telemetry and data grids; KaTeX for analytical formulas.
* WCAG 2.2 Level AA compliance across all components with verified 4.5:1 minimum contrast.
