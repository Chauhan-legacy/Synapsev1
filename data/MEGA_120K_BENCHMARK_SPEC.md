# SYNAPSE Mega 120,000-Point Scientific Benchmark Specification

**File Path:** `data/synapse_mega_120k_benchmark.csv`  
**Dataset Architecture:** $N = 120,000$ points, $f_s = 500\text{ Hz}$, $T = 240.0\text{ seconds}$ (4.0 minutes)  
**Verification Level:** Rigorous physical ground truth, zero contemporary/mock numbers.

---

## 1. Physical Channel Formulations & Ground-Truth Table

| Channel Name | Physical Quantity & Units | Mathematical Formulation | Ground Truth Events & Frequencies |
| :--- | :--- | :--- | :--- |
| **`timestamp_sec`** | Time elapsed ($s$) | $t_k = k \cdot \Delta t$, $\Delta t = 0.002\text{ s}$ | $k \in [0, 119999]$, $T_{max} = 239.998\text{ s}$ |
| **`seismic_velocity_mps`** | Ground motion velocity ($m/s$) | Elastodynamic 3-phase wavefield + oceanic microseism | • $P$-wave onset: $t = 45.0\text{ s}$, $f = 14.50\text{ Hz}$, $\tau = 3.8\text{ s}$<br>• $S$-wave onset: $t = 110.0\text{ s}$, $f = 4.80\text{ Hz}$, $\tau = 8.5\text{ s}$<br>• Rayleigh dispersion: $t \in [170, 220]\text{ s}$, $f(t) = 0.8 \to 2.2\text{ Hz}$ |
| **`magnetometer_flux_nt`** | Total geomagnetic field ($nT$) | $B_0 + \sum_{m=1}^3 A_m \sin(2\pi f_m t) + \Delta B_{storm}(t) + S_q(t)$ | • Schumann Mode 1: **$7.83\text{ Hz}$** ($A = 3.20\text{ nT}$)<br>• Schumann Mode 2: **$14.30\text{ Hz}$** ($A = 1.65\text{ nT}$)<br>• Schumann Mode 3: **$20.80\text{ Hz}$** ($A = 0.85\text{ nT}$)<br>• Storm sudden impulse: $t = 90.0\text{ s}$ ($\Delta B = +42.5\text{ nT}$) |
| **`ocean_altimetry_ssh_cm`** | Sea Surface Height ($cm$) | $SSH_0 + SSH_{tide} + \eta_{soliton}(t) + \eta_{capillary}$ | • Tidal cycle: $T = 120\text{ s}$ envelope<br>• KdV Internal Solitary Wave: center $t = 120.0\text{ s}$, depression $\Delta SSH = -24.8\text{ cm}$, width $w = 4.2\text{ s}$<br>• Capillary ripples: $f = 3.65\text{ Hz}$ |
| **`control_null_noise`** | Standardized residual ($Z$) | $X \sim \mathcal{N}(0, 1)$ | • Expected Mean: $0.000 \pm 0.006$<br>• Expected Variance: $1.000 \pm 0.008$<br>• Periodic Lines: **0 lines** after FDR control |

---

## 2. High-Throughput Computational Verification Target

- **Input Dimension:** 120,000 floats per channel (600,000 total numeric data values).
- **Execution Target:** Sub-second (< 200 ms) end-to-end vectorized compute.
- **Underlying Engines:**
  - NumPy / SciPy PocketFFT (compiled C++ vectorized FFT core).
  - OpenBLAS / LAPACK optimized matrix operations.
  - Vectorized Cost-Matrix Pruned Exact Linear Time (PELT) changepoint locator.
  - Multi-window Welch power spectral density estimator ($N_{seg} = 2048$, 50% overlap).

