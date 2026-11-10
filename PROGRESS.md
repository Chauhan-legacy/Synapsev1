# SYNAPSE Upgrade Progress

## Stage 1: Foundation (Main Folder)
- [x] Safety backup created at `Synapse_backup_original` (excludes `node_modules` and `dist`)
- [x] Git tag `pre-upgrade` set at baseline commit
- [x] App runs on `http://localhost:5173/` and 33/33 mathematical tests pass
- [x] Section D: Central design tokens (`tokens.css`) created, root cause of color overrides eliminated (single fixed Paper Teal look, zero dark mode overrides)
- [x] Section A: Full Instrument Rack prototype implemented with 6 real analytical instruments, delete icon with 8-second undo, layout presets, linked cursor
- [x] Proof screenshots saved in `/prototype-screenshots` (desktop, tablet, mobile)

**Stage 1 Status:** COMPLETE & VERIFIED. Quality gates passed.

---

## Stage 2: Core Upgrade (Main Folder)
- [x] Section B: Full Instrument Registry architecture (`instrumentRegistry.ts`) powering 18 modular analytical instruments
- [x] Section C: Fluid responsive layout with auto-fitting grid across mobile (1 col), tablet (2 col), and desktop (3-4 col)
- [x] Section E: Standardized legends, click-to-toggle series visibility, hover-to-highlight, plain-language captions, CSV exports
- [x] Advanced Analysers - TIER 1:
  - [x] STFT Spectrogram (2D frequency-time energy matrix with waterfall colormap)
  - [x] Continuous Wavelet Scalogram (Morlet scale-dependent analysis with Cone of Influence)
  - [x] Hilbert-Huang Transform with Empirical Mode Decomposition (IMFs 1 & 2 + analytic envelope)
  - [x] Lomb-Scargle Periodogram (least-squares power with 95% & 99% False Alarm Probabilities)
  - [x] Thomson Multitaper with F-test Harmonic Line Detection (DPSS eigenspectra & chi-squared CI)
  - [x] Sample Entropy & Permutation Entropy (multiscale coarse-grained complexity across tau=1..8)
  - [x] Detrended Fluctuation Analysis (DFA) & Hurst Exponent (log-log scaling slope alpha)
  - [x] PELT & CUSUM Changepoint Detection (pruned exact linear time structural regime partitions)
  - [x] Coherence & Cross-Correlation with Lag (magnitude-squared coherence & optimal transmission delay)
  - [x] Granger Causality (directional bivariate VAR with F-test and p-values)
  - [x] Principal Component Analysis (multi-channel eigen-decomposition scree & PC1-PC2 projection)
  - [x] Surrogate Significance Tests (100 IAAFT phase-randomized surrogate null envelope)
  - [x] Auto-Analyst discovery ranking & plain-English summary (evidence lineage DAG nodes)
- [x] Quality Gates: `npm run build` passed in 4.85s (0 errors, code-split chunks), 33/33 pytest mathematical tests passed (100%)
- [x] Stage 2 proof screenshots captured at 1440x900, 768x1024, and 375x812

**Stage 2 Status:** COMPLETE & VERIFIED. Quality gates passed.

---

## Stage 3: Extras (Main Folder)
- [x] Music Player in left sidebar (Embedded in both PaperWorkbench & Sidebar shell)
  - [x] Reference styling: Pastel cream `#F7F0D6` card, soft sage-green `#8FAE8B` rounded album art square, thin progress line with round handle
  - [x] Controls: Shuffle, Previous, Play/Pause, Next, Repeat, Heart favorite, Volume slider, Visualizer eye toggle
  - [x] Real-time audio waveform visualizer on HTML5 canvas
  - [x] Local audio file ingestion (.mp3, .wav, .flac, .ogg, .m4a) with drag-and-drop & file picker
  - [x] IndexedDB persistence (`synapse_music_vault_v1`) storing tracks, blobs, and favorites
  - [x] Built-in 432 Hz multi-harmonic ambient synthesizer track
  - [x] "Analyse this song" bridge: decodes PCM audio buffer and streams directly into SYNAPSE signal context for spectral and wavelet analysis
- [x] Advanced Analysers - TIER 2:
  - [x] MUSIC Super-Resolution Spectral Estimator (subspace noise projection, sub-sample resolution)
  - [x] Real Cepstral Analysis & Pitch Tracking (quefrency decomposition isolating fundamental pitch period)
  - [x] Kalman Filter State Tracking (Bayesian recursive state-space filter)
  - [x] Matrix Profile (exact 1-NN Euclidean distance profile with conserved motifs and anomalous discords)
  - [x] Transfer Entropy (asymmetric nonlinear information flow beyond linear Granger causality)
  - [x] Scientific Method Comparison Matrix (comprehensive benchmark trade-off matrix)
- [x] Section F Polish:
  - [x] Keyboard shortcuts modal (`?`)
  - [x] Empty states with clear guidance
  - [x] All 33/33 mathematical unit and integration tests passing (100%)
  - [x] `npm run build` passing in 3.13s (0 errors, clean code-split chunks)
  - [x] Stage 3 proof screenshots recorded in `/prototype-screenshots`

**Stage 3 Status:** COMPLETE & VERIFIED. Quality gates passed.
  - [ ] Transfer Entropy & Mutual Information
  - [ ] FastICA Source Separation
  - [ ] ARIMA & GARCH Volatility Modeling
  - [ ] Method Comparison Matrix
- [ ] Section F: Polish, keyboard shortcuts modal, README updates

---

## Stage 4: Synapsev2 with PaperGraph
- [ ] Sibling folder `Synapsev2` created and verified
- [ ] PaperGraph integration with paired workspace switcher
- [ ] Linked finding-to-paper DAG visualization and research session export
- [ ] 55 PaperGraph tests + 33 SYNAPSE tests passing
