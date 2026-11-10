# SYNAPSE Round 2 Comprehensive Codebase Audit & Gap Analysis

**Date:** 2026-11-10  
**Audit Target:** Transition from Round 1 Foundations to Round 2 Deep Analysis Engine, Sidebar App Shell, Multi-lab Workbench, and Public Landing Page.

---

## 1. Executive Summary & Verification Baselines

An exhaustive audit of the entire SYNAPSE repository was conducted across `packages/`, `apps/api/`, `apps/web/`, `tests/`, `benchmarks/`, and `connectors/`.

### 1.1 Baseline Verification Results
- **Python / Pytest Test Suite:**
  - Command: `conda run -n synapse pytest -v`
  - Result: **22 passed in 4.07s** (100% pass rate).
  - Test suites: `test_signal.py`, `test_spectra.py`, `test_anomaly.py`, `test_structure.py`, `test_relation.py`, `test_inference.py`, `test_pipeline_and_benchmark.py`.
- **Frontend Build:**
  - Command: `cd apps/web && npm.cmd run build`
  - Result: **Successful build in 1.28s** (`tsc && vite build`), zero TypeScript errors, clean CSS bundle output.
- **Benchmark Data Integration:**
  - Benchmark datasets A through J, metadata JSON, and ground-truth JSON have been mirrored into `benchmarks/SYNAPSE_BENCHMARK_DATA/` (`data/`, `ground_truth/`, `metadata/`).

---

## 2. Inventory of Delivered Capabilities (Round 1)

1. **Independent Engine Architecture:**
   - 9 modular Python packages in `packages/`: `synapse_core`, `synapse_spectra`, `synapse_anomaly`, `synapse_structure`, `synapse_relation`, `synapse_inference`, `synapse_discovery`, `synapse_provenance`, `synapse_sdk`.
2. **Canonical Data Model (`synapse_core`):**
   - Strictly immutable `Signal` dataclass with timestamp monotonicity validation, sampling rate derivation, NaN/Inf masks, quality profiling, and SHA-256 content hashing.
   - Multi-format ingestion: CSV, TSV, Parquet, NPY, NPZ, HDF5 in `synapse_core/io/readers.py`.
3. **Core Signal Processing Implementations:**
   - FFT/IFFT with energy conservation (Parseval's theorem).
   - Welch PSD with Hann windowing.
   - STFT and Continuous Wavelet Transform (Morlet).
   - Spectral entropy and peak picking.
   - Autocorrelation with lag-zero normalization.
   - Matrix profile motif discovery (brute-force STOMP baseline).
   - Unthresholded recurrence plot distance matrix.
   - Robust Z-score (median absolute deviation) and two-sided CUSUM change-point detection.
   - Isolation Forest anomaly detection.
   - Multichannel Pearson/Spearman correlation and Principal Component Analysis (PCA).
   - Phase-randomized Fourier transform surrogates and Benjamini-Hochberg FDR correction.
4. **API Gateway (`apps/api`):**
   - FastAPI server with endpoints for `/health`, `/v1/engines`, `/v1/datasets/upload`, `/v1/datasets/{id}`, `/v1/experiments`, `/v1/experiments/{id}/report`, `/v1/experiments/{id}/evidence`.
5. **Git Repository & Remote:**
   - Tracked and synchronized with `https://github.com/Chauhan-legacy/Synapsev1.git`.

---

## 3. Gap Analysis Against Round 2 Specification

### 3.1 Part 1: App Shell & UX Architecture
| Requirement | Current Status | Action Required |
|---|---|---|
| Left Sidebar Navigation | Top-bar tabs currently used | Move all primary navigation into collapsible sidebar (240px expanded, 64px collapsed icon rail, mobile drawer). Top bar holds sidebar toggle, breadcrumbs, dataset selector, Run, Upload, `Ctrl+K`, API status chip. |
| Accessibility Panel | Rudimentary theme toggle | Build persistent panel in `localStorage` supporting: 4-step text size, line spacing, compact/comfortable density, themes (Light, Dark Charcoal, High Contrast, System), 8-color colorblind-safe palette, dyslexia font option, keyboard map (`?`). |
| Command Palette | Missing | Implement fuzzy search modal triggered by `Ctrl/Cmd + K` allowing navigation, running modules, dataset switching, and report export. |
| Routing & URL State | Single flat view | Split into public `/` (Landing Page) and `/app` (Workbench). Persist dataset ID, selected module/tab, and time range in URL search/hash params. |
| Responsiveness | Basic responsive classes | Formalize breakpoints (360px to 1536px), touch/pinch zoom, horizontal overflow protection on data tables. |

### 3.2 Part 2: Deep Analysis Engine Algorithms
| Domain | Missing / Gaps to Implement |
|---|---|
| **Common Result Schema** | Standardize across all engines: `method`, `version`, `parameters`, `estimate`, `uncertainty`, `test` (statistic, p_raw, p_adjusted, null_model), `effect_size`, `diagnostics`, `assumptions`, `status` (`supported \| inconclusive \| rejected \| not_run`). |
| **Inference Core (2.7)** | Iterative Amplitude Adjusted Fourier Transform (IAAFT) surrogates; Circular-shift surrogates; BCa bootstrap confidence intervals; Calibration test suite verifying false-positive rates on 2,000 null series; Power curve generator outputting to `docs/validation/`. |
| **Spectral Lab (2.1)** | Multitaper (DPSS) with Thomson harmonic F-test; Lomb-Scargle periodogram with false-alarm probability (FAP); High-res peak estimation (Jacobsen/Quinn interpolation, NLS sinusoidal fit, Cramér-Rao lower bound); Noise color power-law fit ($S(f) \sim 1/f^\beta$); Burg autoregressive (AR) spectrum; Allan deviation; Chi-squared PSD confidence bands. |
| **Statistics Lab (2.3)** | Augmented Dickey-Fuller (ADF) and KPSS joint stationarity tests; Jarque-Bera and Shapiro-Wilk normality; Autocorrelation (ACF, PACF) with Ljung-Box test; Detrended Fluctuation Analysis (DFA) and Hurst exponent; Candidate distribution fitting with AIC rankings. |
| **Anomalies & Change-points (2.4)** | Generalized ESD (Rosner test); Matrix-profile discord discovery; Pruned Exact Linear Time (PELT) penalized likelihood changepoint detection; Bayesian Online Changepoint Detection (BOCPD, Adams-MacKay) posterior run-length heatmap; Method agreement matrix. |
| **Time-Frequency Lab (2.2)** | Continuous Wavelet Transform with Cone of Influence (COI) and AR(1) red-noise significance contours; Hilbert analytic signal instantaneous amplitude & frequency; Ridge extraction for chirp tracking. |
| **Dynamics & Structure (2.5)** | Average Mutual Information (AMI) delay and False Nearest Neighbours (FNN) embedding dimension; Recurrence Quantification Analysis (RQA: RR, DET, LAM, ENTR); Sample Entropy; Multiscale Permutation Entropy; Higuchi Fractal Dimension; Rosenstein Largest Lyapunov Exponent. |
| **Relations (2.6)** | Kendall correlation with FDR correction; Magnitude-squared coherence with analytic significance threshold; Granger causality VAR F-test; Transfer Entropy; Kraskov-Stögbauer-Grassberger (KSG) Mutual Information; Dynamic Time Warping (DTW) with warping path; FastICA component separation. |
| **Discovery Orchestrator (2.8)** | Automated dataset profiler, heuristic plan generator, finding deduplication, HTML/PDF report export. |
| **Methods Library (2.9)** | Method cards with KaTeX formulas, assumptions, failure modes, parameters, benchmark examples, references. |

### 3.3 Part 3: Workbench Pages
- Implement all 14 workbench modules with:
  - Title and one-line purpose.
  - "What am I looking at?" collapsible plain-language explainer.
  - Interactive SVG/Canvas charts with zoom/pan and crosshair tooltips.
  - Results table featuring an explicit **Meaning** column explaining real-world interpretation.
  - Export controls (PNG, CSV, JSON).

### 3.4 Part 4: Editorial Landing Page
- Public route `/` featuring:
  - Hero with real live signal canvas rendered from benchmark data.
  - Dynamically computed facts (total methods, tests passing, recovery metrics).
  - Interactive capability highlights (Tones, Transients, Regime shifts, Multichannel coupling, Nonlinear dynamics).
  - Method catalogue with real formulas and filters.
  - Zero fabricated statistics or dummy logos.

---

## 4. Implementation Plan & Execution Phasing

1. **Phase 1: App Shell, Sidebar, and Accessibility Framework**
   - Refactor `apps/web` to incorporate collapsible sidebar, accessibility context with local storage persistence, command palette (`Ctrl+K`), routing (`/` and `/app/*`), and responsive containers.
2. **Phase 2: Mathematical Engine Implementation in `packages/`**
   - Order: `synapse_inference` (IAAFT, BCa, calibration) -> `synapse_spectra` (Multitaper, Lomb-Scargle, CRLB, Burg, Allan) -> `synapse_anomaly` (ESD, PELT, BOCPD) -> `synapse_structure` (AMI, FNN, RQA, Lyapunov, SampEn) -> `synapse_relation` (Granger, KSG MI, DTW, FastICA) -> `synapse_discovery` (Orchestration & Report).
3. **Phase 3: Methods Library & Benchmark Integration**
   - Expose benchmark datasets A-J via API endpoints.
   - Implement Method Cards catalog with KaTeX math rendering and parameter documentation.
4. **Phase 4: Multi-Lab Workbench Pages & Meaning Tables**
   - Implement 14 specialized workbench views with interactive charts, "What am I looking at?" explainers, and real Meaning columns.
5. **Phase 5: Public Landing Page & Visual Polish**
   - Implement `/` route with live canvas and real computed metrics.
6. **Phase 6: Scientific Validation, Power Plots, and CI Verification**
   - Run calibration test scripts and generate power curve plots in `docs/validation/`.
   - Run `pytest` and `npm.cmd run build` to ensure 100% green status.

