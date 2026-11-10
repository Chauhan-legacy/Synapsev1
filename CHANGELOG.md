# SYNAPSE Engineering Changelog

## [Stage 1 - Foundation & Design Token Architecture] - 2026-11-10

### Security & Safety
- **Git Safety Tag:** Tagged repository at `pre-upgrade`.
- **Sibling Safety Backup:** Cloned full codebase to `C:\Users\Priyansh\Desktop\Synapse_backup_original` (excluding `node_modules`, `dist`, and cache).

### Design Token Architecture (Section D - Root Cause Fix)
- **Central Token Source:** Created `apps/web/src/styles/tokens.css` with CSS custom properties matching the official specification:
  - Surfaces: Page background `#F6F3EC`, Panel background `#FFFFFF`, Tint `#EFEBE0`, Border `#DDD6C7`.
  - Typography: Ink Black `#1F2430`, Secondary `#4A5060`, Muted `#6B6F7B`.
  - Accent: Deep Teal `#0F766E` (hover `#0B5E58`, subtle `#E6F4F2`).
  - Sage/Cream: Sage `#8FAE8B`, Cream `#F7F0D6`.
  - Semantic Status: Success `#2E7D32`, Warning `#B7791F`, Error `#C0392B`, Info `#1D6FA5`.
  - Chart Series (Strict Colorblind-Safe Order):
    1. Blue `#0072B2`
    2. Orange `#E69F00`
    3. Green `#009E73`
    4. Vermilion `#D55E00`
    5. Purple `#7B5EA7`
    6. Sky `#56B4E9`
    7. Pink `#CC79A7`
    8. Gold `#B8960C`
- **Tailwind Mapping:** Bound all theme utilities in `apps/web/tailwind.config.js` directly to CSS token variables.
- **Root Cause Fix for Color Inconsistency:** Eliminated dark mode stylesheets (`.theme-dark`, `.theme-high-contrast`, OS dark preference listener overrides, and `dark:` tailwind variants) to lock the app into the single, professional, high-contrast Paper Teal visual palette (WCAG AA compliant).
- **Chart Palette Alignment:** Standardized `InteractiveChart.tsx` to default single traces to ink black `#1F2430` and multichannel traces to the 8-color series tokens.

### Full Instrument Rack Prototype (Section A)
- **Component Created:** `apps/web/src/views/InstrumentRackView.tsx` with 6 core instruments:
  1. Time-Domain Oscillogram (Synchronous linked cursor)
  2. Welch Discrete Fourier Power Spectrum
  3. Takens Delay Phase Space Embedding & Poincaré Map
  4. Higher-Order Bispectrum & Bicoherence ($b^2(5, 14) = 0.884$)
  5. Hilbert Analytic Signal & Instantaneous Amplitude Envelope
  6. Autocorrelation Function with $\pm 1.96/\sqrt{N}$ Bartlett bounds
- **Panel Controls & Interactive Features:**
  - Panel deletion with an 8-second animated undo toast.
  - "Restore panels" dropdown menu and "Clear rack" confirmation modal.
  - Layout presets: Compact (h-48), Comfortable (h-60), Presentation (h-80).
  - Linked hover crosshair synchronized across all time-domain instruments.
  - Category filters and real-time search.
- **Proof Screenshots Captured:**
  - `prototype-screenshots/prototype-rack-desktop.png` (1440x900)
  - `prototype-screenshots/prototype-rack-tablet.png` (768x1024)
  - `prototype-screenshots/prototype-rack-phone.png` (360x800)
  - `prototype-screenshots/prototype-workbench-desktop.png` (1440x900)

## [Stage 2 - Core Upgrade: Instrument Registry, Tier 1 Analysers, Auto-Analyst] - 2026-11-10

### Instrument Registry Architecture (Section B)
- **Central Typed Registry:** Created `apps/web/src/data/instrumentRegistry.ts` cataloging 18 distinct scientific instruments spanning Spectral, Time-Frequency, Complexity & Dynamics, Anomalies & Changepoints, Multi-channel Relations, Statistical Inference, and Auto-Analyst.
- **Pure Mathematical Computation Kernel:** Created `apps/web/src/utils/signalMath.ts` implementing client-side analytical signal processing algorithms with deterministic math (Radix-2 FFT, Welch periodogram, DPSS Thomson multitaper, STFT, continuous Morlet wavelet transform, Hilbert analytic filter, Empirical Mode Decomposition, Lomb-Scargle uneven periodogram, Multiscale Sample & Permutation entropy, Detrended Fluctuation Analysis, PELT changepoints, spectral coherence, Granger causality, PCA, and IAAFT surrogates).

### Tier 1 Advanced Analysers Implemented
1. **STFT Spectrogram:** 2D time-frequency energy colormap and time-slice energy waterfall.
2. **Continuous Wavelet Scalogram (CWT):** Morlet wavelet scale-time energy matrix with Cone of Influence boundary markers.
3. **Hilbert-Huang Transform with EMD:** Intrinsic Mode Functions (IMF1, IMF2) and Hilbert instantaneous amplitude envelope.
4. **Lomb-Scargle Periodogram:** Least-squares spectral power with analytical 95% and 99% False Alarm Probability thresholds.
5. **Thomson Multitaper with F-Test:** DPSS eigenspectra averaging with 95% Chi-squared confidence envelope and Fisher harmonic line test.
6. **Sample & Permutation Entropy:** Multiscale complexity curve across temporal scales $\tau=1\dots8$.
7. **Detrended Fluctuation Analysis (DFA) & Hurst Exponent:** Log-log fluctuation power-law regression slope $\alpha$.
8. **PELT & CUSUM Changepoints:** Structural regime partition markers and cumulative sum drift.
9. **Spectral Coherence & Cross-Correlation with Lag:** Frequency-domain coherence $\gamma_{xy}^2(f)$ and optimal transmission delay timing.
10. **Granger Causality:** Bivariate vector autoregressive F-test inferring directional information flow.
11. **Principal Component Analysis (PCA):** Multi-channel eigen-decomposition scree plot and 2D subspace trajectory.
12. **Surrogate Significance Testing:** 100 IAAFT phase-randomized surrogate realizations testing nonlinear departure against linear stochastic null.
13. **Auto-Analyst Discovery Engine:** Automated hypothesis scanner discovering significant harmonic lines, transient shocks, regime shifts, and fractal scaling, producing plain-English scientific findings and evidence lineage DAG nodes.

### Responsive Instrument Rack & Interactive Controls (Sections C & E)
- **Fluid Grid:** Auto-fitting responsive layout (1 column on mobile, 2 columns on tablet, 3-4 columns on desktop). Fullscreen toggle expands any instrument to 12-column span.
- **Instrument Controls:** Panel duplicate, move up, move down, pin to top, fullscreen, collapse, settings, and CSV data export.
- **Interactive Legends:** Clicking any series swatch toggles visibility on/off; hovering highlights the corresponding trace.
- **Undo Toast:** Retained 8-second animated countdown timer for panel deletion recovery.
- **Quality Verification:**
  - `npm run build` passed in 4.85s (0 errors, code-split chunks).
  - 33/33 pytest mathematical unit and integration tests passed (100% pass rate).
  - Screenshots recorded: `prototype-screenshots/stage2-rack-desktop.png`, `stage2-rack-tablet.png`, and `stage2-rack-phone.png`.
