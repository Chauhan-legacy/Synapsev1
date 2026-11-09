# SYNAPSE: Universal Signal Intelligence & Scientific Discovery Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.11](https://img.shields.io/badge/Python-3.11-emerald.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-teal.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-cyan.svg)](https://react.dev)
[![Tests: 22 Passed](https://img.shields.io/badge/Tests-22%20Passed-success.svg)](benchmarks/hidden_signal_challenge.py)

> *"Don't just analyse signals. Discover, investigate and verify the structures hidden within them."*

SYNAPSE is a universal numerical time-series intelligence and scientific discovery platform engineered around mathematical correctness, computational reliability, strict data provenance, and genuine scientific utility.

---

## 1. System Architecture

```text
SYNAPSE/
├── packages/
│   ├── synapse-core/         # Canonical Signal model, quality profiling, contracts & exceptions
│   ├── synapse-spectra/      # FFT, IFFT, Welch PSD, STFT, CWT Wavelets, peak detection, entropy
│   ├── synapse-anomaly/      # Robust MAD z-scores, CUSUM control chart, change-point segmentation
│   ├── synapse-structure/    # O(N log N) Autocorrelation, motif/discord discovery, RQA
│   ├── synapse-relation/     # Pearson/Spearman, cross-correlation, coherence C_xy(f), PCA
│   ├── synapse-inference/    # Phase-randomized surrogates, bootstrap CIs, Benjamini-Hochberg FDR
│   ├── synapse-discovery/    # Automated analysis planning, candidate ranking, evidence linking
│   ├── synapse-provenance/   # Evidence DAG (Directed Acyclic Graph) & Provenance Manifests
│   └── synapse-sdk/          # Offline `synapse.analyze()` and hosted `synapse.Client`
├── connectors/               # GWOSC, NASA Exoplanet TAP, PhysioNet open archives
├── apps/
│   ├── api/                  # Python FastAPI REST gateway (/health, /datasets, /experiments)
│   └── web/                  # React 18 + TypeScript + Tailwind Scientific Discovery Workbench
├── benchmarks/               # The Hidden Signal Challenge with planted physical ground truth
└── tests/                    # Analytical, unit, and numerical regression test suite
```

---

## 2. Core Mathematical Engines

1. **SPECTRA**:
   - Single-sided Discrete Fourier Transform with coherent gain correction: $CG = \frac{1}{N}\sum w[n]$
   - Parseval's energy conservation verification: $\sum |x[n]|^2 = \frac{1}{N} \sum |X[k]|^2$
   - Welch's averaged periodogram: variance reduction factor $\approx \frac{11}{9K}$ (50% overlap Hann)
   - Continuous Wavelet Transform (CWT) using Complex Morlet (`cmor1.5-1.0`)
   - Peak prominence detection with local SNR estimation ($\text{SNR}_{\text{dB}} = 20 \log_{10}(A / \text{noise})$) and harmonic ladders ($f_0, 2f_0, 3f_0\dots$)

2. **ANOMALY**:
   - Robust z-score via Median Absolute Deviation: $z_r = \frac{x - \text{median}(x)}{1.4826 \cdot \text{MAD}(x)}$
   - Two-sided CUSUM drift detection
   - Cumulative sum change-point segmentation
   - Isolation Forest non-parametric point anomaly scoring

3. **STRUCTURE**:
   - $O(N \log N)$ FFT-accelerated Autocorrelation Function (ACF) with biased & unbiased estimators
   - Periodicity extraction ($T = \tau \Delta t$, $f = 1/T$)
   - 1-NN Subsequence Motif and Discord search
   - Recurrence Quantification Analysis (Recurrence Rate and Determinism)

4. **RELATION**:
   - Multichannel Pearson and Spearman rank correlation matrices
   - Time-lagged cross-correlation: $\tau^* = \arg\max |R_{xy}(\tau)|$
   - Magnitude-Squared Coherence: $C_{xy}(f) = \frac{|P_{xy}(f)|^2}{P_{xx}(f) P_{yy}(f)}$
   - Principal Component Analysis (PCA) via SVD

5. **INFERENCE**:
   - Phase-randomized Fourier Transform (FT) surrogate null hypothesis testing
   - Stationary bootstrap confidence intervals (e.g. 95% CI)
   - Benjamini–Hochberg False Discovery Rate (FDR) control

---

## 3. The Hidden Signal Challenge Benchmark

An end-to-end benchmark (`benchmarks/hidden_signal_challenge.py`) with planted physical ground truth:
- Stationary tones: $5.0\text{ Hz}$, $14.0\text{ Hz}$, $35.0\text{ Hz}$ &rarr; **All 3 Recovered (Error $0.00\text{ Hz}$, SNR $> 13\text{ dB}$)**
- Transient impulse burst at $t = 1.25\text{s}$ &rarr; **Detected ($z > +4.8$)**
- Structural regime shift at $t = 2.60\text{s}$ &rarr; **Detected via CUSUM deviation**
- Evidence Graph: 10 nodes and 12 directed edges linking raw dataset hash to validated findings.

---

## 4. Quickstart & Local Execution

### Backend & Scientific Core (Miniconda)
```powershell
# Create dedicated environment
conda env create -f environment.yml
conda activate synapse

# Install package in editable mode
pip install -e .

# Run test suite
pytest tests/

# Launch API Gateway
uvicorn apps.api.main:app --host 127.0.0.1 --port 8000
```

### Scientific Workbench (Frontend)
```powershell
cd apps/web
npm install
npm run dev
```
Open **http://localhost:5173** to access the interactive Workbench.

---

## 5. Offline Python SDK Usage

```python
from synapse_sdk import analyze

# 100% offline local scientific analysis
experiment = analyze("timeseries.csv", time_column="timestamp")

for finding in experiment.validated_findings:
    print(f"[{finding.status}] {finding.label} -> {finding.value} {finding.unit}")
```
