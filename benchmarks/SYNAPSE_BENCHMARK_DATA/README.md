# SYNAPSE Benchmark Data Suite

**SYNTHETIC DATA - produced by a mathematical model with a fixed random seed. It is NOT a real astronomical, medical, seismic or experimental observation.**

Ten synthetic datasets (A-J) for testing SYNAPSE. Ground truth lives ONLY in `ground_truth/`; data files contain just timestamps and measurements.

## Dataset -> engine map

| Dataset | File | What it is | SYNAPSE engine(s) tested | Contents |
|---|---|---|---|---|
| A | data/A_periodic_multifrequency.csv | Multi-frequency periodic + harmonics | SPECTRA, STRUCTURE | 5 spectral peaks (0.0703, 0.1907, 0.4311 Hz + 2nd/3rd harmonics of 0.1907), white + AR(1) noise |
| B | data/B_nonstationary_chirp.csv | Non-stationary chirp/AM/FM | SPECTRA (STFT/CWT/wavelets) | two chirp segments, abrupt frequency jump at 1000 s, AM + FM |
| C | data/C_anomaly_rich.csv | Anomaly-rich | ANOMALY | 5 impulses, 3 bursts, 3 spikes, drift, persistent level shift, 2000-sample long anomaly |
| D | data/D_regime_changes.csv | Change-points / regimes | STRUCTURE, ANOMALY | 7 change points (abrupt + gradual), 6 regimes incl. unstable regime |
| E | data/E_multichannel_coupling.csv | Eight-channel coupled system | RELATION | strong, weak, independent, delayed (1.25 s), phase-shifted (pi/2), time-varying pairs |
| F | data/F_motifs_recurrence.csv | Motifs / recurrence / discord | STRUCTURE | 8 distorted copies of motif A, 6 of motif B, 1 discord, quasi-periodic background |
| G | data/G_statistical_inference.csv | Statistical inference | INFERENCE | 84 experiments (48 frequency, 36 correlation), nulls, weak/strong effects, white vs AR(1) noise |
| H | data/H_irregular_missing.csv | Irregular / incomplete sampling | Ingestion, validation, resources | 1 valid-with-warnings file + 2 deliberately invalid files; expected outcomes in JSON |
| I | data/I_dynamic_range.csv | High dynamic range | Numerical stability, ingestion | trend 2e5 .. tiny 1e-3 buried tone, transients up to 1e9, micro-scale channel (1e-9 .. 5e-13) |
| J | data/J_master_discovery_challenge.csv | MASTER DISCOVERY CHALLENGE | ALL engines | 30,000 rows, 4 channels, everything combined; see J ground truth |

## Folder layout
- `data/` CSV files (float64, 17 significant digits). Extra files in data/: `H_invalid_duplicate_timestamps.csv`, `H_invalid_infinite_values.csv` (deliberately invalid).
- `ground_truth/` per-dataset truth (H holds the expected validation outcome instead).
- `metadata/` construction details (seed, sampling rate, Nyquist, noise model, components, units).
- `generation_config.json`, `validation_summary.json`, `generate_benchmark.py` (regenerates everything: `python generate_benchmark.py OUTDIR`).

## Conventions
- Timestamps are seconds from start of record. Signal unit: arbitrary units (a.u.).
- Indices in ground truth are 0-based data rows (header excluded); CSV line number = index + 2. End indices are inclusive.
- Sinusoid: x(t) = sum A_i sin(2 pi f_i t + phi_i); phase in radians.
- SNR (dB) = 10 log10(mean(clean^2) / mean(noise^2)) on the realised arrays. Nyquist = fs/2. Frequency resolution = fs/N.
- Cross-correlation lag: positive lag = second channel lags the first. Coherence: magnitude-squared coherence (Welch).
- Change point: an index (or interval for gradual changes) where a named statistical property of the generating process changes.
- Effect size: frequency tests use A/sigma (sinusoid amplitude over noise sd); correlation tests use population Pearson rho.
- Seeds: dataset A..J use `numpy.random.default_rng(1001..1010)`.

## Dataset notes
- **A** fs 2 Hz, N 20000. Noise: white sd 0.5 + AR(1) phi 0.9.
- **B** fs 10 Hz, N 20000. f_inst(t)=f_base(t)+0.10 cos(2 pi 0.01 t); AM depth 0.4 at 0.005 Hz.
- **C** fs 50 Hz, N 20000. See `events` list for exact start/end/type/magnitude/duration.
- **D** fs 10 Hz, N 20000. Noise scale and mean are time-varying (see regimes).
- **E** fs 20 Hz, N 20000. Eight channels built from shared latents B (broadband), W2 (1.1 Hz), S (0.35 Hz) and independent latents.
- **F** fs 10 Hz, N 30000. Motif/discord locations in truth.
- **G** long format: `experiment_id, sample_index, timestamp_s, x, y`. 84 hypotheses in total. The `y` column in frequency experiments is an independent control noise series.
- **H** irregular timestamps (nominal 0.5 s, jitter, gaps, decimated stretch), NaNs, a constant channel. The generator does not repair anything.
- **I** fs 100 Hz. Columns `signal` (huge range) and `signal_micro` (1e-9 scale).
- **J** fs 10 Hz, N 30000, four channels. Events are defined on channel_1 indices; channel_2 has them at the same index, channel_3 40 samples later.

## Validation
`validation_summary.json` lists every check that was run on the generated data with its measured value. Overall result of this run: **all checks passed** (113 checks). Passing these checks means the generated files match their stated construction within the listed tolerances; it is not a statement about any analysis software.
