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
- [ ] Section B: Full Instrument Registry architecture powering all panels automatically
- [ ] Section C: Fluid responsive layout across 360px, 768px, 1024px, 1440px, 1920px
- [ ] Section E: Standardized legends, plain-language captions, interactive tooltips, data table toggle
- [ ] Advanced Analysers - TIER 1:
  - [ ] STFT Spectrogram (2D frequency-time energy matrix)
  - [ ] Continuous Wavelet Scalogram (Morlet/Ricker scale-dependent analysis)
  - [ ] Hilbert-Huang Transform with Empirical Mode Decomposition (IMFs)
  - [ ] Lomb-Scargle Periodogram (non-uniform/astronomical sampling)
  - [ ] Multitaper with F-test Harmonic Line Detection
  - [ ] Sample Entropy & Permutation Entropy
  - [ ] Detrended Fluctuation Analysis (DFA) & Hurst Exponent
  - [ ] PELT & CUSUM Changepoint Detection
  - [ ] Coherence & Cross-Correlation with Lag
  - [ ] Granger Causality
  - [ ] Principal Component Analysis (PCA)
  - [ ] Surrogate Significance Tests (IAAFT & Phase Randomization)
  - [ ] Auto-Analyst discovery ranking & plain-English summary

---

## Stage 3: Extras (Main Folder)
- [ ] Music Player in left sidebar (IndexedDB, pastel cream/sage reference design, ID3 tags, playlist/queue, "Analyse this song" bridge)
- [ ] Advanced Analysers - TIER 2:
  - [ ] Wigner-Ville Distribution & Synchrosqueezing
  - [ ] Constant-Q Transform
  - [ ] MUSIC & ESPRIT Super-Resolution Spectral Estimators
  - [ ] Cepstral Analysis & Pitch Tracking
  - [ ] Bayesian Spectral Line Estimation
  - [ ] Trispectrum (Fourth-Order HOSA)
  - [ ] Multiscale Entropy & Correlation Dimension
  - [ ] Extended RQA & Lempel-Ziv Complexity
  - [ ] Matrix Profile (Motifs & Discords)
  - [ ] Isolation Forest Anomaly Scoring
  - [ ] Kalman & Particle Filter State Tracking
  - [ ] Singular Spectrum Analysis (SSA)
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

