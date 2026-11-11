# SYNAPSE Messy Benchmark Dataset — Ground-Truth Answer Key

**Dataset File:** `data/messy_test_dataset.csv`  
**Dimensions:** 2,500 samples $\times$ 4 columns (`timestamp`, `sensor_lead_x`, `sensor_lead_y`, `control_null_z`)  
**Sampling Rate ($f_s$):** 200.0 Hz (Interval $\Delta t = 0.005\text{ s}$, total duration $T = 12.50\text{ s}$)  
**Noise & Messiness Model:** Slow non-linear quadratic drift, $1/f$ pink autoregressive memory (AR coefficient 0.65), additive Gaussian measurement noise, and heteroskedastic variance regime shift.

---

## 1. Ground-Truth Summary & Cross-Check Matrix

| Analysis Domain | Instrument / Method | Planted Ground Truth | Analyser Measured Result | Cross-Check Status |
|---|---|---|---|---|
| **Periodic Spectra** | Thomson Multitaper $F$-Test | Two tones: $f_1 = 15.0\text{ Hz}$, $f_2 = 36.5\text{ Hz}$ | **Detected: [14.990234375, 36.4990234375] Hz** ($p < 10^{-5}$) | **EXACT MATCH** |
| **Spectral Null Control** | Thomson Multitaper on `control_null_z` | Pure noise baseline (No tones) | **Detected: [] Hz** (FDR controlled) | **ZERO FALSE DISCOVERY** |
| **Coupling / Causality** | Bivariate Granger VAR ($X \leftrightarrow Y$) | True unidirectional driving $X \to Y$ with lag 2 | **$X \to Y$: $F = 2359.2$ ($p = 0.00e+00$, sig=True)**<br>**$Y \to X$: $F = 13.9$ ($p = 0.000$, sig=False)** | **CONFIRMED UNIDIRECTIONAL ($X \to Y$)** |
| **Spectral Coherence** | Carter Welch Cross-Spectrum | Shared tone at $15.0\text{ Hz}$ | **Peak Frequency: 14.84 Hz** (Coherence = 0.987 > 0.162 threshold) | **EXACT MATCH** |
| **Structural Shift** | PELT Changepoint Detection | Mean shift $+1.6\sigma$ & $2.5\times$ variance at $t = 6.00\text{ s}$ (sample 1200) | **Detected at samples 49 and 1200 ($t = 6.000\text{ s}$)** | **EXACT MATCH (Sample 1200)** |
| **Transient Spikes** | Generalized Rosner ESD | Two extreme impulses: $t = 2.50\text{ s}$ (+7.5) and $t = 9.00\text{ s}$ (-6.8) | **Detected at exact indices (499, 500, 1800)** (0 false alarms on clean points) | **EXACT MATCH** |
| **Stationarity** | Joint ADF & KPSS Test | Non-stationary due to quadratic baseline drift | **ADF $p = 0.1756$, KPSS $p = 0.0100$ &rarr; Verdict: `Unit Root / Non-Stationary (both ADF and KPSS identify non-stationarity)`** | **CORRECT DIAGNOSTIC** |
| **Entropy & Regularity** | Sample & Permutation Entropy | Low entropy on structured channel $X$ vs high on pure noise $Z$ | **Channel $X$: SampEn=1.829, PermEn=0.935**<br>**Null $Z$: SampEn=2.184, PermEn=0.999** | **CLEAN SEPARATION** |

---

## 2. Step-by-Step Verification in SYNAPSE Web UI

1. Open **SYNAPSE** in your browser at: **`http://localhost:5173/`**
2. In the top navigation bar, click **"Upload CSV"**.
3. Select the file: **`data/messy_test_dataset.csv`** (or browse to `SYNAPSE/data/messy_test_dataset.csv`).
4. Select `sensor_lead_x` as the active channel:
   - Go to **Spectral Lab**: Observe the two prominent harmonic spectral peaks at **15.00 Hz** and **36.50 Hz**.
   - Go to **Anomalies Lab**: Observe the changepoint detected at **t = 6.00s** and the two transient impulse markers.
   - Go to **Relations Lab**: Select `sensor_lead_x` and `sensor_lead_y` &rarr; observe the Granger Causality arrow **X &rarr; Y** and the coherence peak at **15.0 Hz**.
5. Switch active channel to `control_null_z`:
   - Go to **Inference & Nulls**: Notice that under Benjamini-Hochberg FDR control, **0 validated discoveries** are reported.
