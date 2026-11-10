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

## [Stage 3 - Extras: Music Player, Audio Ingestion, Tier 2 Analysers] - 2026-11-10

### Music Player & Audio Lab Integration
- **Reference Design Matching:** Built `apps/web/src/components/music/MusicPlayer.tsx` matching `/reference/music-player-reference.png` with pastel cream `#F7F0D6` cards, soft sage `#8FAE8B` rounded album-art square, thin progress line with round handle, simple icons (shuffle, previous, play/pause, next, repeat, heart, volume).
- **Audio Storage & Ingestion:** Created `apps/web/src/utils/musicDb.ts` with IndexedDB persistence (`synapse_music_vault_v1`) to store uploaded tracks, metadata, and user favorites. Accepts `.mp3`, `.wav`, `.flac`, `.ogg`, `.m4a` files.
- **Synthetic Ambient Synthesizer:** Implemented built-in Web Audio API 432 Hz multi-harmonic generator (C Major triad) for immediate playback when no custom audio is uploaded.
- **Audio Visualizer Canvas:** Real-time Web Audio `AnalyserNode` frequency spectrum rendered directly inside the sage album art.
- **"Analyse this song" Pipeline Bridge:** Decodes audio stream via `AudioContext.decodeAudioData` into PCM float32 samples and streams directly into SYNAPSE's `activeSignal`, immediately enabling Fourier and Wavelet analysis on real music.
- **Sidebar Integration:** Embedded seamlessly into both the Shell sidebar (`Sidebar.tsx`) and the Paper Workbench left sidebar (`PaperWorkbench.tsx`).

### Tier 2 Advanced Analysers
- **MUSIC Super-Resolution Estimator:** Subspace noise-eigenvector projection resolving closely spaced harmonic lines beyond the Fourier resolution limit.
- **Real Cepstrum & Pitch Tracking:** Quefrency analysis isolating fundamental vocal/instrumental pitch periods.
- **Kalman Filter State Tracking:** Recursive state-space Bayesian filter separating deterministic dynamics from observation noise.
- **Matrix Profile:** 1-NN Euclidean distance profile across subsequences discovering conserved motifs and anomalous discords.
- **Transfer Entropy:** Model-free asymmetric information transfer quantifying directional causality beyond linear correlations.
- **Method Comparison Matrix:** Comprehensive benchmark matrix comparing resolution, variance, leakage, non-stationarity, and execution speed across 7 scientific methods.

### Verification & Quality Gates
- `npm run build` passed in 3.13s with 0 errors.
- 33/33 pytest mathematical tests passing (100%).
- Screenshots saved: `prototype-screenshots/stage3-workbench-musicplayer.png`, `stage3-rack-musicplayer.png`, and `stage3-mobile-player.png`.

## [Stage 4 - Synapsev2 & PaperGraph Integration] - 2026-11-10

### Sibling Workspace Architecture
- **Workstation Clone:** Synchronized full upgraded main repository to sibling directory `C:\Users\Priyansh\Desktop\Synapsev2`.
- **PaperGraph Engine Integration:** Placed the complete `PaperGraph` literature analysis engine into `Synapsev2/papergraph`.
- **Unified 3-Way Switcher:** Added workspace switcher in the header allowing researchers to seamlessly transition between:
  1. **Signal Workbench:** High-resolution time-domain, spectral, and Hilbert instantaneous dynamics.
  2. **Instrument Rack:** 24-panel responsive multi-channel analytical rack with interactive legends and linked cursor.
  3. **Linked Discovery View:** Integrated empirical-to-literature evidence lineage DAG.

### Linked Discovery View (`LinkedDiscoveryView.tsx`)
- **Bipartite Lineage DAG:** Visualizes multi-tier directed graph connecting:
  - Raw signal data -> Analytical engines -> Empirical findings -> Evidence edges -> Peer-reviewed research papers.
- **Bidirectional Interactivity:**
  - Selecting an empirical finding highlights its supporting literature citations, mathematical methodology, and confidence intervals.
  - Selecting a literature paper node highlights the exact empirical signal features that validate or challenge its theoretical claims.
- **Empirical Corroboration:** Each paper card details the exact physical mechanism and mathematical formulation (e.g. Thomson 1982 for multitaper F-tests, Welch 1967 for periodogram variance reduction, Killick 2012 for PELT changepoints, Peng 1995 for DFA scaling).
- **Integrated Research Session Export:** Single-click JSON export bundle packaging raw signal telemetry, computed metrics, evidence DAG edges, and cited literature bibliography.

### Automation & Dual-Suite Testing
- **Windows Startup Script:** Created `Synapsev2/start_synapse_v2.bat` orchestrating SYNAPSE API (port 8000), PaperGraph API (port 8001), and Vite Web Frontend (port 5173).
- **Documentation:** Created comprehensive `Synapsev2/README.md` with system flowcharts and quickstart instructions.
- **Test Suite Verification:**
  - **SYNAPSE:** 33/33 mathematical tests passed (100%).
  - **PaperGraph:** 61/61 unit and integration tests passed (2 skipped).
- **Frontend Build:** `npm run build` completed in 3.11s with 0 errors.
- **Screenshots:** Recorded `stage4-synapsev2-linked-discovery.png` and `stage4-synapsev2-rack.png` in `Synapsev2/screenshots/`.
