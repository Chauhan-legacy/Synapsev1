<USER_REQUEST>
# SYNAPSE: Round 2 Prompt for Google Antigravity
### Deep analysis engine, sidebar app shell, landing page, full responsiveness

Paste everything below the line into Antigravity. This is a follow-up. The first round (functional fixes and the clean redesign) is already in the project folder.

---

## STEP 0: AUDIT FIRST, THEN BUILD

I cannot show you the current state of the folder, so inspect it yourself before changing anything.

1. Read the whole repo: `packages/`, `apps/api`, `apps/web`, `tests/`, `benchmarks/`, `connectors/`.
2. Write `docs/ROUND2_AUDIT.md` listing: what round 1 already delivered, what is still broken or fake, and what is missing against this prompt.
3. Run `pytest` and `npm run build` and record the results.
4. If a folder called `SYNAPSE_BENCHMARK_DATA` (synthetic datasets A to J with ground-truth JSON) exists anywhere in the project, load it as built-in benchmark datasets and use it for the Benchmarks page and for validating every new method below.
5. Only then start implementing, in the order given here.

## STANDING RULES (carry over from round 1, still binding)

1. Every number on screen comes from real computation. No hardcoded confidence values, p-values, uncertainties or "validated" labels. Anything not run shows "Not run".
2. Visual style stays professional and restrained: neutral greys, ONE muted blue accent, semantic green/amber/red only with text labels. No neon, glow, gradients, glassmorphism, emojis, cartoon illustration, or multi-colour pastel tags.
3. A method is only added if it has: an implementation, a unit test against a known analytic answer, a method card (see Part 2.9), and a place in the UI.
4. Keep Python 3.11, FastAPI, React 18, TypeScript (strict, no `any`), Vite, Tailwind.

---

## PART 1: APP SHELL (sidebar navigation, command palette, accessibility)

### 1.1 Sidebar replaces the top bar as navigation
- The top bar currently carries navigation and accessibility actions. Move ALL navigation into a left sidebar. The top bar keeps only: sidebar toggle, breadcrumb, dataset selector, Run analysis, Upload, command palette trigger (`Ctrl/Cmd + K`), API status chip.
- Sidebar groups (collapsible, icon plus label, remembers collapsed state):
  - **Start:** Overview, Datasets
  - **Explore:** Signal Explorer, Statistics Lab
  - **Analyse:** Spectral Lab, Time-Frequency Lab, Anomalies and Change-points, Dynamics and Structure, Relations (multichannel)
  - **Verify:** Inference and Validation, Findings, Evidence Graph, Reproducibility
  - **Reference:** Benchmarks, Methods Library
  - **Bottom of sidebar (pinned):** Accessibility, Settings, Help and shortcuts
- States: expanded (240 px), collapsed icon rail (64 px), mobile drawer (full height, overlay, focus-trapped, closes on route change).
- Each item shows a small status dot for module state: not run, running, done, needs attention (always with a tooltip text, never colour only).

### 1.2 Accessibility panel (opens from the sidebar)
A proper panel, saved in local storage, applied instantly, with a live preview:
- Text size (4 steps), line spacing, density (compact / comfortable)
- Theme: light, dark (neutral charcoal), high contrast, follow system
- Colour-blind-safe chart palette switch (a validated 8-colour set) plus pattern and marker differences, so charts never rely on colour alone
- Reduce motion, large click targets, always show focus rings, dyslexia-friendly font option
- Full keyboard map shown in a shortcuts dialog (`?`), skip-to-content link, ARIA landmarks, screen-reader summaries for every chart ("Spectrum with three peaks at 5.0, 14.0, 35.0 Hz")
- Meets WCAG 2.2 AA. Run axe-core in CI; zero critical or serious violations.

### 1.3 Command palette
- `Ctrl/Cmd + K`: jump to any page, run any module, switch dataset, toggle theme, open a method card, export a report. Fuzzy search, recent items, keyboard only.

### 1.4 Responsive and reactive behaviour
- Breakpoints: 360, 640, 768, 1024, 1280, 1536 px. Mobile first. Nothing may scroll sideways except data tables inside their own scroll container.
- Sidebar becomes a drawer below 1024 px. Multi-panel pages stack into a single column with sticky section tabs.
- Charts resize through `ResizeObserver`, support touch (pinch zoom, drag pan, tap tooltip), mouse wheel zoom, box zoom, double-click reset, and linked cursors across charts on the same page.
- Heavy client work (downsampling, small transforms) runs in a Web Worker. The main thread never blocks for more than 50 ms.
- Long tables are virtualised. Charts with more than 5,000 points use min/max or LTTB downsampling with full detail on zoom (request the zoomed window from the API).
- Loading uses skeletons matching the final layout (no spinners alone). Long jobs stream progress from the API through Server-Sent Events, with per-stage progress and cancel.
- Persist view state in the URL (dataset id, selected time window, selected channel, tab) so any view can be shared as a link.
- Performance budget: Lighthouse 90+ on Performance, Accessibility, Best Practices; first contentful paint under 1.5 s on the landing page; route-level code splitting.

---

## PART 2: THE ANALYSIS ENGINE (hard mathematics)

All implemented in `packages/` as engines behind the existing contracts, exposed through the API as `POST /v1/experiments/{id}/modules/{module}` and readable as structured results. Use NumPy/SciPy/statsmodels where they are correct and well tested; implement from scratch only where noted, and cross-check against the library version in tests.

### 2.0 Common result schema (every method returns this)
```
{ method, version, parameters, estimate, uncertainty{ci_low, ci_high, level, method},
  test{statistic, p_raw, p_adjusted, correction, null_model, n_surrogates},
  effect_size, diagnostics[{name, value, passed}], assumptions[{text, checked, passed}],
  status: supported | inconclusive | rejected | not_run,
  plain_language_summary, evidence_refs[], runtime_ms, seed }
```
A finding may only be marked `supported` when: the corrected p-value is below alpha, the effect size passes a stated threshold, AND all diagnostics pass. Otherwise it is `inconclusive` with the reason shown.

### 2.1 Spectral Lab
- **Welch PSD** with selectable window, overlap, detrend, and chi-squared confidence bands on the PSD (equivalent degrees of freedom accounting for overlap).
- **Multitaper (DPSS, Slepian)** estimate with adaptive weighting, plus **Thomson harmonic F-test** to separate true line components from broadband noise.
- **Lomb-Scargle** periodogram for unevenly sampled data, with false-alarm probability.
- **High-resolution peak estimation:** zero-padded FFT then parabolic or Jacobsen/Quinn interpolation, followed by **nonlinear least-squares sinusoid fit** (frequency, amplitude, phase, offset) with the parameter covariance from the Jacobian. Report the **Cramér-Rao lower bound** for each frequency and show achieved versus bound.
- **Harmonic series detection**, fundamental estimation (harmonic product spectrum and cepstrum), THD, SINAD, SNR per peak.
- **Noise colour:** fit a power-law `S(f) ~ 1/f^beta` on the noise floor by robust regression; report beta with CI and label white / pink / brown.
- **Autoregressive spectrum** (Burg) with order chosen by AIC/BIC, shown against Welch.
- **Allan deviation** (overlapping) for noise-type identification and stability.
- **Spectral leakage / resolution report:** main-lobe width, scalloping loss, ENBW for the chosen window.

### 2.2 Time-Frequency Lab
- STFT spectrogram with adjustable window/hop and a time-frequency resolution readout.
- CWT scalogram (complex Morlet) with **cone of influence** and **significance contours against a red-noise (AR(1)) background**.
- **Hilbert** analytic signal: instantaneous amplitude and frequency, with edge-effect masking.
- Ridge extraction for chirps and drifting tones; report chirp rate with uncertainty.
- Optional **Synchrosqueezing** or reassignment if time allows (mark as optional).

### 2.3 Statistics Lab
- Descriptives with bootstrap CIs: mean, median, MAD, IQR, skewness, kurtosis, quantiles.
- **Stationarity:** ADF and KPSS together (report agreement or conflict), plus a rolling-statistics drift check.
- **Normality:** Jarque-Bera, Shapiro-Wilk (on subsample if large), Q-Q plot data.
- **Autocorrelation structure:** ACF, PACF, Ljung-Box test, with confidence bands.
- **Long-range dependence:** detrended fluctuation analysis (DFA) and Hurst exponent with log-log fit diagnostics.
- **Distribution fit:** fit candidate distributions, rank by AIC, show goodness of fit.

### 2.4 Anomalies and Change-points
- Robust z-score (MAD), **generalised ESD** (Rosner) with correct critical values, Isolation Forest (seeded), and a **matrix-profile discord** search (STOMP/SCAMP style).
- Change-points: two-sided CUSUM, Page-Hinkley, **PELT** (exact penalised likelihood, implement and compare with `ruptures` in tests only), and **Bayesian online change-point detection** (Adams-MacKay) with run-length posterior heatmap.
- Every detected event gets: time, magnitude, method agreement count (how many methods flagged it), and a corrected p-value. Show an agreement matrix across methods.

### 2.5 Dynamics and Structure
- Autocorrelation period estimate with CI; **motif discovery** (matrix profile); **Recurrence Quantification** (recurrence rate, determinism, laminarity, entropy) with embedding parameters chosen from **average mutual information** (delay) and **false nearest neighbours** (dimension).
- **Sample entropy**, **permutation entropy** (multi-scale), **Higuchi fractal dimension**.
- Largest **Lyapunov exponent** (Rosenstein) with fit-region diagnostics. Report as "indicative" unless diagnostics pass.
- Surrogate comparison for every nonlinear statistic (see 2.7), so nothing is reported without its null.

### 2.6 Relations (multichannel)
- Pearson, Spearman, Kendall matrices with FDR-corrected p-values and bootstrap CIs.
- Lagged cross-correlation with significance bands; **magnitude-squared coherence** with the analytic significance threshold `1 - alpha^(1/(K-1))` and phase-lag spectrum.
- **Granger causality** (VAR, order by AIC, F-test, both directions) and **transfer entropy** (binned or KSG estimator) with surrogate nulls.
- **Mutual information** (KSG), **Dynamic Time Warping** distance with warping-path view.
- **PCA and ICA** (FastICA) with explained variance, loadings, and component time-courses.

### 2.7 Inference and Validation (the credibility core)
- **Surrogates:** phase-randomised FT surrogates AND **IAAFT** (preserves amplitude distribution and power spectrum) for nonlinear tests; block-shuffle and circular-shift surrogates for relation tests.
- **Stationary bootstrap** and **moving-block bootstrap** CIs; BCa intervals for skewed statistics.
- **Multiple-testing control:** Benjamini-Hochberg and Benjamini-Yekutieli FDR, Holm FWER; the family of tests is shown to the user.
- **Effect sizes** and **power estimate** for each test.
- **Model comparison:** AIC/BIC/Bayes-factor approximation for "periodic + noise" versus "noise only" versus "periodic + trend".
- **Calibration test (must exist in the test suite):** run each hypothesis test under the null on at least 2,000 simulated white-noise and AR(1) series; the empirical false-positive rate must sit within binomial tolerance of alpha. Fail the build if a test is miscalibrated.
- **Power curves:** produce a plot of detection probability versus SNR for the periodicity detector, saved to `docs/validation/`.

### 2.8 Discovery orchestrator
- Planner picks modules from data properties (uniform or not, length, channels, stationarity result), shows the plan before running, and lets the user edit it.
- Ranks findings by corrected evidence, deduplicates (e.g. a harmonic of an already found peak is grouped, not listed again), and builds the evidence graph: raw data hash -> preprocessing -> method -> statistic -> null model -> corrected test -> finding.
- Generates a **report** (HTML and PDF) containing methods, parameters, results, figures, limitations and the reproducibility manifest.

### 2.9 Method cards (Methods Library page)
For every method: plain-language description first, then the formula (render with KaTeX), assumptions, when it fails, parameters with defaults, a worked example on a benchmark dataset, and 1 to 3 references. Cards are linked from every result via an info button.

### 2.10 Verification, as hard as the maths
- Unit tests against closed-form answers (pure sinusoid amplitude and frequency, known AR(1) spectrum, known white-noise Allan slope, known Hurst of fractional Gaussian noise).
- Cross-checks against `scipy.signal`, `statsmodels`, and `ruptures` with tolerances stated in the tests.
- Property tests (hypothesis): scale invariance, time-shift invariance, Parseval energy conservation, FDR monotonicity.
- Benchmarks A to J (or the built-in Hidden Signal Challenge if the folder is absent): report recovery of every planted feature with error, and a confusion-style summary for anomalies and change-points. Fail CI if recovery drops.
- Performance: FFT-based O(N log N) wherever possible; a 1 million sample series must finish the default pipeline in a stated time budget (document the machine). Cache expensive results by content hash.

---

## PART 3: PAGE CONTENT (every page substantial, none empty)

Each page has: a title with a one-line purpose, a "What am I looking at?" collapsible plain-language explainer, the main interactive chart(s), a results table with a **Meaning** column, an export bar (PNG, CSV, JSON), and links to the relevant method cards.

| Page | Must contain |
|---|---|
| Overview | Dataset health summary, key numbers (max 6) with units, mini charts of the best findings, run history, "what to do next" suggestions from the planner |
| Datasets | Upload, benchmark library, quality report (gaps, duplicates, sampling jitter, clipping, NaNs, outliers), preprocessing options (detrend, resample, filter) shown as a reversible pipeline |
| Signal Explorer | Full-resolution zoom and pan, brush selection, channel overlay, annotations the user can add, event markers from other modules |
| Spectral Lab | Section 2.1 in full, with a PSD comparison switcher (Welch / multitaper / AR) |
| Time-Frequency Lab | Section 2.2 in full |
| Statistics Lab | Section 2.3 in full |
| Anomalies and Change-points | Section 2.4 with method-agreement matrix |
| Dynamics and Structure | Section 2.5 |
| Relations | Section 2.6 with heatmaps and directed-influence graph |
| Inference and Validation | Null model picker, surrogate histogram with the observed statistic marked, correction table, calibration and power plots |
| Findings | Ranked table, expandable evidence per row, filters by status and module, report export |
| Evidence Graph | Interactive left-to-right graph, click a node to see inputs, parameters, hash |
| Reproducibility | Real manifest: package versions, seeds, hashes, parameters, environment, one-click "re-run from manifest" |
| Benchmarks | Scoreboard of recovery results per planted feature, run-it-yourself button, history |
| Methods Library | Searchable method cards (2.9) |

---

## PART 4: LANDING PAGE

A separate public route `/` (the app moves to `/app`). Editorial, calm, confident. Think a research-lab or developer-tool site, not a startup template.

- **Hero:** a short headline, one supporting sentence, two buttons (Open the workbench, View benchmarks). Beside it, a LIVE chart rendered from a real benchmark signal with its detected peaks and a change-point marked, computed by the actual engine. No stock imagery, no 3D, no particles.
- **Strip of real facts:** number of methods, tests passing, benchmark recovery rate, all read from the build or the latest benchmark run. Never typed in by hand.
- **How it works:** four steps (Upload, Plan, Test against a null, Evidence and report) with small real screenshots or live mini-charts.
- **What it finds:** a grid of capabilities (tones, transients, regime shifts, relations between channels, nonlinear structure), each with a one-line plain explanation and a small real example chart.
- **Why you can trust it:** the credibility story: surrogate nulls, FDR control, calibration tests, evidence graph, reproducibility manifest. Show the calibration and power plots from `docs/validation/`.
- **Method catalogue:** compact searchable list linking to the Methods Library.
- **Open source section:** repo link, licence, install commands (copy button), SDK snippet.
- **Footer:** docs, GitHub, licence, version.
- Do NOT invent testimonials, logos, user counts or partnerships. If a statistic is not computed from the repo, it is not shown.
- Design: generous whitespace, 12-column grid, max width 1200 px, Inter for text, mono only for numbers and code, subtle section dividers, one accent colour. Light and dark themes both polished. Fully responsive and keyboard accessible. Smooth anchor scrolling only if reduce-motion is off.
- SEO and sharing: title, description, Open Graph image generated from a real chart, `sitemap.xml`, `robots.txt`.

---

## PART 5: VISUAL POLISH CHECKLIST

- One spacing scale (4/8 px), one radius (6 px), one border colour, consistent chart styling through a shared chart theme file.
- Numeric values right-aligned, tabular figures, units always shown, sensible significant digits.
- Empty states explain what to do and offer a button; error states say what failed and how to fix it.
- Tooltips and info buttons for every technical term, written in plain language with the technical name kept visible.
- Micro-interactions limited to 150 ms fades and colour changes. No bouncing, no scaling, no parallax.
- Print stylesheet for reports (clean black on white, no sidebar).

---

## DELIVERY ORDER (commit after each, tests green each time)

1. Audit document and baseline test run
2. App shell: sidebar, accessibility panel, command palette, URL state, responsive layout
3. Engine work in this order: Inference core (2.7) -> Spectral (2.1) -> Statistics (2.3) -> Anomalies (2.4) -> Time-Frequency (2.2) -> Dynamics (2.5) -> Relations (2.6) -> Orchestrator and report (2.8)
4. Pages wired to real results (Part 3)
5. Methods Library and method cards
6. Landing page
7. Verification: calibration and power plots, CI with pytest, frontend build, axe, Lighthouse
8. README rewrite with real screenshots and real benchmark numbers

## ACCEPTANCE CHECKLIST

- [ ] Navigation is entirely in the sidebar; top bar holds only the controls listed in 1.1
- [ ] Accessibility panel works and persists; axe reports no critical or serious issues
- [ ] Every page in Part 3 exists, shows real computed results, and has a Meaning column
- [ ] Every method has an implementation, a test against a known answer, a method card, and a UI place
- [ ] Calibration test passes (false-positive rate close to alpha) for every hypothesis test
- [ ] Benchmark recovery table is generated, not typed, and CI fails on regression
- [ ] Layout works from 360 px to 1536 px with no sideways page scroll; charts are touch friendly
- [ ] Landing page uses only real, computed facts; Lighthouse 90+ across the board
- [ ] No neon, gradients, emojis or multi-colour tags anywhere
- [ ] `pytest`, `npm run build`, and the CI workflow all pass

## FINAL OUTPUT

Give me: files added and changed, a list of anything not finished with the reason, the benchmark recovery table, the calibration results, and the exact commands to run the backend, frontend and tests.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-11-10T14:08:38+05:30.

The user's current state is as follows:
Active Document: c:\Users\Priyansh\Desktop\SYNAPSE\environment.yml (LANGUAGE_UNSPECIFIED)
Cursor is on line: 17
Other open documents:
- c:\Users\Priyansh\Desktop\SYNAPSE\.gitignore (LANGUAGE_UNSPECIFIED)
- c:\Users\Priyansh\Desktop\SYNAPSE\README.md (LANGUAGE_UNSPECIFIED)
- c:\Users\Priyansh\Desktop\SYNAPSE\apps\web\postcss.config.js (LANGUAGE_UNSPECIFIED)
- c:\Users\Priyansh\Desktop\SYNAPSE\apps\web\src\index.css (LANGUAGE_UNSPECIFIED)
- c:\Users\Priyansh\Desktop\SYNAPSE\tests\unit\test_inference.py (LANGUAGE_UNSPECIFIED)
</ADDITIONAL_METADATA>