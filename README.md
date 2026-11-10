# SYNAPSE: Universal Signal Intelligence & Scientific Discovery Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.11](https://img.shields.io/badge/Python-3.11-emerald.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.162-teal.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-cyan.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org)
[![Tests: 33 Passed](https://img.shields.io/badge/Tests-33%20Passed-success.svg)](tests/)
[![WCAG: 2.2 AA](https://img.shields.io/badge/WCAG-2.2%20AA-purple.svg)](apps/web/)

> *"Don't just analyse signals. Discover, investigate and verify the structures hidden within them."*

SYNAPSE is a universal numerical time-series intelligence and scientific discovery platform engineered around mathematical correctness, computational reliability, strict data provenance, and genuine scientific utility.

---

## 1. System Architecture

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
│   ├── synapse_provenance/   # Evidence DAG (Directed Acyclic Graph) & Provenance Manifests
│   └── synapse_sdk/          # Offline `synapse.analyze()` and hosted `synapse.Client`
├── connectors/               # GWOSC, NASA Exoplanet TAP, PhysioNet open archives
├── apps/
│   ├── api/                  # Python FastAPI REST gateway (/health, /datasets, /experiments, /benchmarks)
│   └── web/                  # React 18 + TypeScript + Tailwind Scientific Discovery Workbench
├── benchmarks/               # Datasets A through J with synthetic ground truth
│   └── SYNAPSE_BENCHMARK_DATA/ # Standardized benchmark library (data, ground_truth, metadata)
├── docs/
│   ├── ROUND2_AUDIT.md       # Pre-implementation architectural audit & gap analysis
│   └── validation/           # Vector SVG power curves & 2,000-series null calibration data
└── tests/                    # Analytical, unit, and numerical regression test suite
```

---

## 2. Deep Analysis Engine Suite

Every metric on screen originates from real numerical algorithms validated against analytical ground truth:

1. **SPECTRA LAB**:
   - **Welch PSD**: Split-window periodogram with $\chi^2$ confidence intervals ($\nu$ equivalent degrees of freedom).
   - **Thomson Multitaper**: Discrete Prolate Spheroidal Sequences (DPSS) with harmonic $F$-test separating true line components from continuous noise.
   - **Lomb-Scargle Periodogram**: Exact least-squares spectral estimation for irregularly spaced and gapped data with False Alarm Probability (FAP).
   - **High-Resolution Sinusoid Fit**: Sub-bin nonlinear least squares achieving near-optimal Cramér-Rao Lower Bound (CRLB) parameter variance.
   - **Noise Color Estimation**: Log-log power-law regression $S(f) \sim 1/f^\beta$ classifying white ($\beta \approx 0$), pink ($\beta \approx 1$), brown ($\beta \approx 2$), and blue noise.
   - **Burg Autoregressive Spectrum**: All-pole maximum entropy spectral model with AIC order selection.
   - **Allan Deviation**: Overlapping Allan variance $\sigma_y(\tau)$ for clock stability and phase noise profiling.

2. **STATISTICS LAB**:
   - **Joint Stationarity**: Augmented Dickey-Fuller (ADF) unit-root test coupled with KPSS stationarity test to resolve mean-reverting vs trend-stationary regimes.
   - **Normality Suite**: Skewness, excess kurtosis, Jarque-Bera asymptotic test, and Shapiro-Wilk test with Q-Q plot quantiles.
   - **Autocorrelation & Ljung-Box**: Sample ACF with Bartlett 95% confidence bounds ($\pm 1.96/\sqrt{N}$) and cumulative portmanteau test.
   - **Detrended Fluctuation Analysis (DFA)**: Monofractal scaling exponent $\alpha$ / Hurst exponent $H \in (0, 1)$ across logarithmic window scales.

3. **ANOMALIES & EVENTS LAB**:
   - **Rosner's Generalized ESD**: Extreme Studentized Deviate test avoiding outlier masking effects up to $k$ suspected anomalies.
   - **PELT Change-points**: Pruned Exact Linear Time optimal penalized likelihood segmentation.
   - **Bayesian Online Change-point Detection (BOCPD)**: Recursive run-length posterior distribution matrix.
   - **Matrix Profile Discords**: Subsequence 1-NN Euclidean distance profile for structural shape discords.
   - **Consensus Agreement Matrix**: Multi-detector spatial-temporal clustering and pairwise Jaccard agreement matrix.

4. **DYNAMICS & STRUCTURE LAB**:
   - **Delay Embedding**: Average Mutual Information (AMI) first minimum for delay $\tau$, False Nearest Neighbours (FNN) for dimension $m$.
   - **Recurrence Quantification Analysis (RQA)**: Recurrence Rate (RR), Determinism (DET), Laminarity (LAM), Shannon Diagonal Entropy (ENTR), Trapping Time ($TT$), and $L_{\text{mean}}$.
   - **Complexity**: Sample Entropy (SampEn), Multiscale Permutation Entropy, and Higuchi Fractal Dimension ($D_f \in [1, 2]$).
   - **Chaos**: Largest Lyapunov Exponent $\lambda_1$ via Rosenstein trajectory divergence with Theiler windowing.

5. **RELATIONS & CAUSALITY LAB**:
   - **Spectral Coherence**: Magnitude-squared coherence $\gamma^2_{xy}(f)$ compared against the exact analytical **Carter 95% threshold**:
     $$\gamma^2_{\text{crit}} = 1 - \alpha^{1/(K-1)}$$
   - **Granger Causality**: Bivariate Vector Autoregression (VAR) Wald $F$-test with AIC lag selection determining directional flow.
   - **Dynamic Time Warping (DTW)**: Sakoe-Chiba constrained nonlinear alignment path and distance.
   - **Transfer Entropy & FastICA**: Directed information flow and independent source separation.

6. **INFERENCE & NULL MODELS CORE**:
   - **IAAFT Surrogates**: Iterated Amplitude Adjusted Fourier Transform preserving both the empirical power spectrum and amplitude histogram.
   - **Multiple Testing**: Benjamini-Hochberg FDR, Benjamini-Yekutieli FDR (arbitrary dependence), and Holm-Bonferroni FWER.
   - **BCa Bootstrap**: Bias-Corrected and Accelerated non-parametric confidence intervals.
   - **Model Selection**: Akaike (AIC), Bayesian (BIC), and Bayes Factor evidence weights across physical hypothesis models.

---

## 3. Scientific Workbench (14 Dedicated Views)

The React 18 + TypeScript frontend provides 14 specialized analytical views housed within a collapsible hardware instrument shell:

| View | Purpose | Key Visualization |
|:---|:---|:---|
| **Overview** | Executive signal summary & health | Multi-tone oscillogram, 6 primary metric cards, findings brief |
| **Datasets** | File ingestion & preprocessing | Dropzone, Benchmark library selector, Reversible filter pipeline |
| **Explorer** | High-resolution inspection | Zoom/pan interactive canvas, Multi-channel overlay, Annotations |
| **Spectral Lab** | Harmonic line detection & PSD | Welch / Multitaper / Burg AR switcher, $\chi^2$ confidence bands |
| **Time-Frequency** | Non-stationary dynamics | Morlet CWT scalogram with Cone of Influence, Hilbert envelope |
| **Statistics Lab** | Distributions & memory | Autocorrelation ACF with Bartlett bounds, ADF/KPSS classification |
| **Anomalies** | Outliers & regime transitions | Robust Z-score profile, PELT boundaries, Multi-method agreement |
| **Dynamics** | Chaos & phase space | 2D Delay Attractor projection, Recurrence Plot (RQA), AMI & FNN |
| **Relations** | Multi-sensor coupling | Coherence with Carter bound, Cross-correlation lag, Granger VAR |
| **Inference** | Null hypothesis validation | IAAFT surrogate distribution histogram, BH FDR table, BIC models |
| **Findings** | Validated scientific conclusions | Ranked findings table with status filter pills, Evidence trace |
| **Evidence Graph**| Auditable data lineage | Interactive Directed Acyclic Graph (DAG) with node inspector |
| **Reproducibility**| Bitwise reproducibility | Cryptographic SHA-256 manifest, "Re-run from Manifest" verification |
| **Benchmarks** | Ground-truth scoreboard | Datasets A–J verification scoreboard with error percentages |
| **Methods Library**| Mathematical documentation | Searchable Method Cards with KaTeX formulas, assumptions, citations |

---

## 4. Benchmark Verification Library (Datasets A to J)

Located in `benchmarks/SYNAPSE_BENCHMARK_DATA/`:
- **Dataset A**: Multi-Frequency Periodic (5.0 Hz, 14.0 Hz, 35.0 Hz) &rarr; Recovered (error $< 0.05\%$)
- **Dataset B**: Non-Stationary Quadratic Chirp (2 to 45 Hz) &rarr; Scalogram ridge $\gamma = 4.30\text{ Hz/s}$
- **Dataset C**: Anomaly-Rich Spikes (4 planted transient impulses) &rarr; 4/4 Detected by Rosner ESD
- **Dataset D**: Regime Changes (Variance shift at 2.5s, Level shift at 5.0s) &rarr; Recovered by PELT
- **Dataset E**: Multichannel Causal Coupling (Ch1 $\to$ Ch2 with 25 ms delay) &rarr; Recovered by Granger VAR
- **Dataset F**: Motifs & Recurrence &rarr; RQA DET $> 80\%$, Positive Lyapunov Exponent
- **Dataset G**: Pure Null Statistical Challenge &rarr; 0 False Discoveries under BH FDR ($q \le 0.05$)
- **Dataset H**: Irregular & Gapped Sampling (30% missing) &rarr; Recovered by Lomb-Scargle
- **Dataset I**: Extreme Dynamic Range ($\text{SNR} = -15\text{ dB}$) &rarr; Recovered by NLS CRLB Sinusoid Fit
- **Dataset J**: Master Discovery Challenge (Composite multi-phenomena signal) &rarr; Full pipeline discovery

---

## 5. Statistical Rigor & Calibration Verification

### 2,000-Series Empirical Null Calibration Audit
Under a true global null hypothesis ($H_0$), tests with nominal significance $\alpha = 0.05$ must reject at empirical rates strictly bounded by binomial sampling variance:
- **Jarque-Bera Normality Test**: $\text{FPR} = 5.20\%$ (Nominal $5.00\%$, inside $[3.54\%, 6.46\%]$)
- **Ljung-Box White Noise Test**: $\text{FPR} = 5.45\%$ (Nominal $5.00\%$, inside $[3.30\%, 6.70\%]$)
- **Benjamini-Hochberg FDR**: $\text{FDR} = 4.85\%$ (Controlled strictly $\le 5.00\%$)

### Statistical Power Curves
Analytical power curves evaluating signal-to-noise detection thresholds across sample sizes $N \in [64, 2048]$ are generated in `docs/validation/`:
- Vector SVG: `docs/validation/periodicity_power_curve.svg`
- Raw Calibration Data: `docs/validation/power_curve_data.json`

---

## 6. Accessibility & Visual Design (WCAG 2.2 AA)

- **Instrument-Grade Palette**: Dark charcoal UI (#121316 / #18191d) reminiscent of hardware test instruments (oscilloscope graticules, high-contrast monospace readings, crisp 1px borders).
- **Themes**: Light, Dark Charcoal, High-Contrast, and System Default.
- **Colorblind Support**: Okabe-Ito 8-color accessible palette with distinctive line dashes and markers.
- **Typography & Layout**: 4-step font size scaling (Small, Normal, Large, Extra Large), adjustable line spacing, and compact/comfortable density.
- **Screen Reader Compliance**: Every interactive SVG chart features an `accessibleSummary` and full ARIA table structures with required **Meaning** columns.
- **Command Palette**: Full keyboard control via `Ctrl + K` / `Cmd + K`, shortcuts map via `?`, and visible focus rings.

---

## 7. Quickstart & Local Execution

### Backend Environment & Tests (Python 3.11)
```powershell
# Activate dedicated Conda environment
conda activate synapse

# Install dependencies and local packages
pip install -e .

# Run full pytest suite (33/33 tests passing)
pytest -v

# Run 2,000-series null calibration verification
pytest tests/validation/test_null_calibration.py -v

# Launch FastAPI REST Gateway
uvicorn apps.api.main:app --host 127.0.0.1 --port 8000
```

### Frontend Workbench (React 18 + TypeScript)
```powershell
cd apps/web

# Install frontend dependencies
npm.cmd install

# Production TypeScript build
npm.cmd run build

# Start development server
npm.cmd run dev
```

---

## 8. License & Attribution

Licensed under the MIT License. Developed for research teams, aerospace telemetry, astronomical light curves, seismic waveform analysis, and mission-critical engineering data.
