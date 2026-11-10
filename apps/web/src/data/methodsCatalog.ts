import { MethodCard } from '../types/analysis';

export const METHODS_CATALOG: MethodCard[] = [
  // Spectral Lab
  {
    id: 'welch_psd',
    name: 'Welch Power Spectral Density',
    category: 'Spectral',
    plain_language:
      'Estimates signal power distribution across frequencies by splitting data into overlapping windows, averaging their periodograms to reduce noise variance.',
    latex_formula:
      '\\hat{P}(f) = \\frac{1}{K} \\sum_{k=1}^K \\frac{1}{f_s S_2} \\left| \\sum_{n=0}^{L-1} x_k[n] w[n] e^{-j 2\\pi f n / f_s} \\right|^2, \\quad S_2 = \\sum_{n=0}^{L-1} w^2[n]',
    assumptions: [
      'Wide-sense stationary random process across the duration of each segment.',
      'Uniformly sampled timestamps without gaps or missing values.',
    ],
    failure_modes: [
      'Non-stationary signals with drifting frequencies blur spectral peaks.',
      'Very short windows produce severe spectral leakage and poor frequency resolution.',
    ],
    parameters: [
      { name: 'window', type: 'string', default_val: 'hann', desc: 'Taper window applied to each segment.' },
      { name: 'nperseg', type: 'integer', default_val: '256', desc: 'Length of each segment in samples.' },
      { name: 'noverlap', type: 'integer', default_val: '128', desc: 'Number of overlapping points between segments (50%).' },
    ],
    benchmark_example: 'Benchmark Dataset A: Recovers 5.0 Hz, 14.0 Hz, and 35.0 Hz peaks with chi-squared 95% confidence intervals.',
    references: [
      'Welch, P. (1967). The use of fast Fourier transform for the estimation of power spectra. IEEE AU-15(2), 70-73.',
      'Percival, D. B., & Walden, A. T. (1993). Spectral Analysis for Physical Applications. Cambridge University Press.',
    ],
  },
  {
    id: 'multitaper_psd',
    name: 'Multitaper Spectral Estimation & Thomson F-Test',
    category: 'Spectral',
    plain_language:
      'Uses multiple orthogonal Discrete Prolate Spheroidal Sequences (DPSS) to maximize spectral concentration, separating true sinusoidal lines from continuous background noise.',
    latex_formula:
      'F(f) = \\frac{(K - 1) |C(f)|^2 \\sum_{k=0}^{K-1} V_k^2(0)}{\\sum_{k=0}^{K-1} |Y_k(f) - C(f) V_k(0)|^2}, \\quad C(f) = \\frac{\\sum_{k} V_k(0) Y_k(f)}{\\sum_{k} V_k^2(0)}',
    assumptions: [
      'Gaussian background noise with potential discrete line components.',
      'Time-bandwidth product NW selected to match expected peak broadening.',
    ],
    failure_modes: [
      'Rapidly chirping frequencies violate stationary taper integration.',
      'Choosing too many tapers (K > 2NW - 1) introduces poorly concentrated tapers.',
    ],
    parameters: [
      { name: 'nw', type: 'float', default_val: '3.5', desc: 'Time-bandwidth product parameter.' },
      { name: 'k_tapers', type: 'integer', default_val: '6', desc: 'Number of DPSS tapers (typically 2*NW - 1).' },
      { name: 'alpha', type: 'float', default_val: '0.01', desc: 'F-test line component detection significance threshold.' },
    ],
    benchmark_example: 'Benchmark Dataset A: Rigorously rejects broadband noise peaks while accepting true 5 Hz, 14 Hz, and 35 Hz lines with F > 15.2 (p < 0.0001).',
    references: [
      'Thomson, D. J. (1982). Spectrum estimation and harmonic analysis. Proceedings of the IEEE, 70(9), 1055-1096.',
      'Babadi, B., & Brown, E. N. (1994). A review of multitaper spectral analysis. IEEE Transactions on Biomedical Engineering, 61(5), 1555-1564.',
    ],
  },
  {
    id: 'lomb_scargle',
    name: 'Lomb-Scargle Periodogram',
    category: 'Spectral',
    plain_language:
      'Calculates power spectra for unevenly spaced or gapped time series without requiring interpolation, providing exact false-alarm probabilities.',
    latex_formula:
      'P_{LS}(\\omega) = \\frac{1}{2} \\left[ \\frac{(\\sum_j x_j \\cos\\omega(t_j - \\tau))^2}{\\sum_j \\cos^2\\omega(t_j - \\tau)} + \\frac{(\\sum_j x_j \\sin\\omega(t_j - \\tau))^2}{\\sum_j \\sin^2\\omega(t_j - \\tau)} \\right]',
    assumptions: [
      'Point observations at timestamps t_j have independent Gaussian measurement errors.',
    ],
    failure_modes: [
      'Severe periodic sampling gaps can create strong aliasing peaks (spectral window artifacts).',
    ],
    parameters: [
      { name: 'n_freqs', type: 'integer', default_val: '1000', desc: 'Number of evaluation frequencies across Nyquist range.' },
      { name: 'alpha', type: 'float', default_val: '0.01', desc: 'False Alarm Probability (FAP) significance cutoff.' },
    ],
    benchmark_example: 'Benchmark Dataset H (Irregular): Accurately detects planted 8.5 Hz periodicity despite 30% randomly missing timestamps.',
    references: [
      'Lomb, N. R. (1976). Least-squares frequency analysis of unequally spaced data. Astrophysics and Space Science, 39(2), 447-462.',
      'Scargle, J. D. (1982). Studies in astronomical time series analysis. The Astrophysical Journal, 263, 835-853.',
    ],
  },
  {
    id: 'crlb_sinusoid_fit',
    name: 'High-Resolution Sinusoid Fit & Cramér-Rao Bound',
    category: 'Spectral',
    plain_language:
      'Refines peak frequency, amplitude, and phase using sub-bin interpolation and Nonlinear Least Squares, comparing variance to the Cramér-Rao Lower Bound.',
    latex_formula:
      '\\text{CRLB}(f) = \\frac{12}{(2\\pi)^2 \\cdot \\text{SNR} \\cdot N(N^2 - 1) \\cdot T_s^2}, \\quad y(t) = \\mu + A \\cos(2\\pi f t + \\phi)',
    assumptions: [
      'Single dominant sinusoid in additive white Gaussian noise.',
      'Observation window contains at least 3 full cycles.',
    ],
    failure_modes: [
      'Two closely spaced frequencies within 1/N Rayleigh bin will cause parameter bias.',
    ],
    parameters: [
      { name: 'initial_freq_hint', type: 'float', default_val: 'auto', desc: 'Initial frequency candidate from FFT peak.' },
    ],
    benchmark_example: 'Benchmark Dataset A: Achieves efficiency ratio 1.05x of the Cramér-Rao lower bound on 14 Hz tone.',
    references: [
      'Rife, D. C., & Boorstyn, R. R. (1974). Single-tone parameter estimation from discrete-time observations. IEEE Trans. Inform. Theory, 20(5), 591-598.',
    ],
  },
  {
    id: 'noise_color',
    name: 'Noise Color & Power-Law Beta Fit',
    category: 'Spectral',
    plain_language:
      'Fits a power-law S(f) ~ 1/f^beta to the spectral noise floor to classify processes as white (0), pink (1), brown/red (2), or blue (-1).',
    latex_formula:
      '\\log_{10} S(f) = \\log_{10}(C) - \\beta \\log_{10}(f) + \\epsilon, \\quad \\beta \\in [-2, 3]',
    assumptions: [
      'Background noise obeys power-law scaling across several octaves.',
    ],
    failure_modes: [
      'Harmonic line contamination will skew slope if peaks are not robustly masked.',
    ],
    parameters: [
      { name: 'confidence_level', type: 'float', default_val: '0.95', desc: 'Confidence level for beta parameter interval.' },
    ],
    benchmark_example: 'Benchmark Dataset G: Estimates beta = 0.04 +/- 0.06 confirming white noise background.',
    references: [
      'Mandelbrot, B. B., & Van Ness, J. W. (1968). Fractional Brownian motions, fractional noises and applications. SIAM Review, 10(4), 422-437.',
    ],
  },
  {
    id: 'burg_ar',
    name: 'Burg Autoregressive (AR) Spectrum',
    category: 'Spectral',
    plain_language:
      'Fits an all-pole parametric autoregressive model by minimizing forward and backward prediction errors, providing sharp resolution for short signals.',
    latex_formula:
      'S_{AR}(f) = \\frac{2 \\sigma_p^2 / f_s}{\\left| 1 + \\sum_{k=1}^p a_k e^{-j 2\\pi f k / f_s} \\right|^2}, \\quad \\text{AIC}(p) = N \\ln(\\sigma_p^2) + 2p',
    assumptions: [
      'Signal generated by an all-pole linear time-invariant system driven by white noise.',
    ],
    failure_modes: [
      'Spectral line splitting and frequency shifts if model order p is chosen too large.',
    ],
    parameters: [
      { name: 'max_order', type: 'integer', default_val: '30', desc: 'Maximum AR candidate model order.' },
    ],
    benchmark_example: 'Benchmark Dataset I: Resolves closely spaced resonant poles with AIC-optimal order p=12.',
    references: [
      'Burg, J. P. (1975). Maximum Entropy Spectral Analysis. PhD thesis, Stanford University.',
    ],
  },
  {
    id: 'allan_deviation',
    name: 'Overlapping Allan Deviation',
    category: 'Spectral',
    plain_language:
      'Measures stability and noise characteristics as a function of integration time tau, distinguishing white phase, flicker, and random walk frequency drifts.',
    latex_formula:
      '\\sigma_y^2(\\tau) = \\frac{1}{2 (N - 2m) \\tau^2} \\sum_{i=0}^{N - 2m - 1} (x_{i + 2m} - 2x_{i + m} + x_i)^2, \\quad \\tau = m \\Delta t',
    assumptions: [
      'Continuous phase/frequency measurements with stationary noise increments.',
    ],
    failure_modes: [
      'Systematic linear trends create a tau^+1 upward slope that masks underlying noise floors.',
    ],
    parameters: [
      { name: 'taus', type: 'array', default_val: 'octave', desc: 'Octave integration steps m = 1, 2, 4, 8, ...' },
    ],
    benchmark_example: 'Benchmark Dataset G: Demonstrates tau^-0.5 slope indicative of white frequency modulation.',
    references: [
      'Allan, D. W. (1966). Statistics of atomic frequency standards. Proceedings of the IEEE, 54(2), 221-230.',
    ],
  },

  // Time-Frequency Lab
  {
    id: 'morlet_cwt',
    name: 'Morlet CWT with Cone of Influence',
    category: 'Time-Frequency',
    plain_language:
      'Transforms the signal with dilated complex Morlet wavelets to reveal transient oscillations, with a Cone of Influence marking edge artifacts and AR(1) red-noise contours.',
    latex_formula:
      'W_n(s) = \\sum_{k=0}^{N-1} x_k \\psi^* \\left( \\frac{(k - n)\\delta t}{s} \\right), \\quad P_{\\text{crit}}(s) = \\frac{\\sigma^2}{2} P_{\\text{red}}(s) \\chi^2_{2}(1 - \\alpha)',
    assumptions: [
      'Local oscillations are well approximated by modulated Gaussian wave packets.',
    ],
    failure_modes: [
      'Low frequencies have wide time support and suffer severe Cone of Influence edge losses.',
    ],
    parameters: [
      { name: 'wavelet', type: 'string', default_val: 'cmor1.5-1.0', desc: 'Complex Morlet bandwidth and center frequency.' },
      { name: 'n_scales', type: 'integer', default_val: '64', desc: 'Number of logarithmically spaced wavelet scales.' },
    ],
    benchmark_example: 'Benchmark Dataset B (Chirp): Tracks quadratic chirp evolution from 2 Hz to 45 Hz with AR(1) significance contour > 95%.',
    references: [
      'Torrence, C., & Compo, G. P. (1998). A practical guide to wavelet analysis. Bulletin of the American Meteorological Society, 79(1), 61-78.',
    ],
  },
  {
    id: 'hilbert_transform',
    name: 'Hilbert Analytic Instantaneous Frequency',
    category: 'Time-Frequency',
    plain_language:
      'Creates the complex analytic signal z(t) = x(t) + j H[x(t)] to extract instantaneous amplitude envelope and instantaneous frequency.',
    latex_formula:
      'z(t) = A(t) e^{j \\phi(t)}, \\quad A(t) = |z(t)|, \\quad f_{\\text{inst}}(t) = \\frac{1}{2\\pi} \\frac{d\\phi}{dt}',
    assumptions: [
      'Signal is mono-component or narrow-band (Bedrosian and Nuttall conditions satisfied).',
    ],
    failure_modes: [
      'Multi-component signals produce wildly fluctuating unphysical instantaneous frequencies.',
    ],
    parameters: [
      { name: 'edge_mask_pct', type: 'float', default_val: '0.05', desc: 'Fraction of boundary points masked to exclude Gibbs phenomena.' },
    ],
    benchmark_example: 'Benchmark Dataset B: Extracts smooth instantaneous frequency trajectory across the chirp duration.',
    references: [
      'Boashash, B. (1992). Estimating and interpreting the instantaneous frequency of a signal. Proceedings of the IEEE, 80(4), 520-568.',
    ],
  },

  // Statistics Lab
  {
    id: 'stationarity_adf_kpss',
    name: 'Joint Stationarity Testing (ADF + KPSS)',
    category: 'Statistics',
    plain_language:
      'Combines Augmented Dickey-Fuller (unit root test) and KPSS (stationarity test) to resolve whether a signal is strictly stationary, trend-stationary, or non-stationary.',
    latex_formula:
      '\\Delta y_t = \\alpha + \\beta t + \\gamma y_{t-1} + \\sum_{i=1}^p \\delta_i \\Delta y_{t-i} + \\epsilon_t, \\quad \\text{KPSS} = \\frac{1}{N^2 s^2} \\sum_{t=1}^N S_t^2',
    assumptions: [
      'Linear autoregressive structure with Gaussian or bounded martingale residuals.',
    ],
    failure_modes: [
      'Structural breaks (regime shifts) can fool both tests into diagnosing permanent non-stationarity.',
    ],
    parameters: [
      { name: 'alpha', type: 'float', default_val: '0.05', desc: 'Significance alpha level for hypothesis rejection.' },
    ],
    benchmark_example: 'Benchmark Dataset D: Detects regime break and flags joint status as Difference / Trend Stationary.',
    references: [
      'Dickey, D. A., & Fuller, W. A. (1979). Distribution of the estimators for autoregressive time series with a unit root. JASA, 74(366), 427-431.',
      'Kwiatkowski, D. et al. (1992). Testing the null hypothesis of stationarity against the alternative of a unit root. Journal of Econometrics, 54(1-3), 159-178.',
    ],
  },
  {
    id: 'dfa_hurst',
    name: 'Detrended Fluctuation Analysis (Hurst Exponent)',
    category: 'Statistics',
    plain_language:
      'Measures long-range power-law auto-correlations and fractal persistence by calculating polynomial-detrended fluctuations F(s) across window scales s.',
    latex_formula:
      'F(s) = \\sqrt{\\frac{1}{N} \\sum_{k=1}^N [y(k) - y_s(k)]^2} \\propto s^{\\alpha}, \\quad \\alpha \\approx H',
    assumptions: [
      'Underlying fluctuations follow power-law scaling over at least one decade in scale.',
    ],
    failure_modes: [
      'Periodic trends can introduce crossover knees in log F(s) vs log s curves.',
    ],
    parameters: [
      { name: 'order', type: 'integer', default_val: '1', desc: 'Polynomial detrending order (DFA-1 = linear).' },
    ],
    benchmark_example: 'Benchmark Dataset G: Estimates alpha = 0.51 +/- 0.02 confirming uncorrelated white noise dynamics.',
    references: [
      'Peng, C. K. et al. (1994). Mosaic organization of DNA nucleotides. Physical Review E, 49(2), 1685.',
    ],
  },

  // Anomalies & Events
  {
    id: 'rosner_esd',
    name: "Rosner's Generalized ESD Test",
    category: 'Anomalies',
    plain_language:
      'Iterative extreme studentized deviate test that reliably detects up to k outliers without being blinded by masking effects.',
    latex_formula:
      'R_i = \\frac{\\max_j |x_j - \\bar{x}|}{s}, \\quad \\lambda_i = \\frac{(n - i) t_{p, n - i - 1}}{\\sqrt{(n - i - 1 + t_{p}^2)(n - i + 1)}}, \\quad p = 1 - \\frac{\\alpha}{2(n - i + 1)}',
    assumptions: [
      'Underlying non-outlier data approximately follow a normal distribution.',
    ],
    failure_modes: [
      'Bimodal or heavily skewed distributions can trigger spurious outlier flags.',
    ],
    parameters: [
      { name: 'max_outliers', type: 'integer', default_val: '10', desc: 'Maximum number of potential outliers tested.' },
      { name: 'alpha', type: 'float', default_val: '0.05', desc: 'Family significance level.' },
    ],
    benchmark_example: 'Benchmark Dataset C (Anomalies): Detects exactly 4 planted transient spikes without false alarms.',
    references: [
      'Rosner, B. (1983). Percentage points for a generalized ESD many-outlier procedure. Technometrics, 25(2), 165-172.',
    ],
  },
  {
    id: 'pelt_changepoints',
    name: 'PELT Exact Penalized Likelihood Change-Points',
    category: 'Anomalies',
    plain_language:
      'Finds the exact globally optimal number and location of regime shifts in linear time by pruning candidates that cannot minimize penalized likelihood.',
    latex_formula:
      '\\min_{\\tau} \\sum_{i=1}^m [\\mathcal{C}(y_{\\tau_{i-1}:\\tau_i}) + \\beta], \\quad \\text{Prune if } F(s) + \\mathcal{C}(y_{s:t}) > F(t)',
    assumptions: [
      'Observations within each segment are independently and identically distributed.',
    ],
    failure_modes: [
      'Selecting too small a penalty beta will over-segment continuous noise fluctuations.',
    ],
    parameters: [
      { name: 'min_size', type: 'integer', default_val: '10', desc: 'Minimum samples between consecutive change-points.' },
    ],
    benchmark_example: 'Benchmark Dataset D: Pinpoints exact variance regime shift at timestamp t=25.0s within 2 samples.',
    references: [
      'Killick, R., Fearnhead, P., & Eckley, I. A. (2012). Optimal detection of changepoints with a linear computational cost. JASA, 107(500), 1590-1598.',
    ],
  },
  {
    id: 'bocpd',
    name: 'Bayesian Online Change-point Detection (BOCPD)',
    category: 'Anomalies',
    plain_language:
      'Computes the exact posterior probability distribution over run lengths since the last change-point using recursive Bayesian message passing.',
    latex_formula:
      'P(r_t | x_{1:t}) \\propto \\sum_{r_{t-1}} P(r_t | r_{t-1}) P(x_t | r_{t-1}, x_t^{(r)}) P(r_{t-1} | x_{1:t-1}), \\quad H(\\tau) = 1/\\lambda',
    assumptions: [
      'Prior run-length hazard function is memoryless geometric with timescale parameter lambda.',
    ],
    failure_modes: [
      'Slow continuous parameter drifts may cause high posterior uncertainty without sharp reset peaks.',
    ],
    parameters: [
      { name: 'hazard_lambda', type: 'float', default_val: '100.0', desc: 'Prior expected run length between change-points.' },
    ],
    benchmark_example: 'Benchmark Dataset D: Outputs run-length posterior heatmap showing clear collapse to zero at regime boundaries.',
    references: [
      'Adams, R. P., & MacKay, D. J. (2007). Bayesian online changepoint detection. arXiv:0710.3742.',
    ],
  },

  // Dynamics Lab
  {
    id: 'rqa_recurrence',
    name: 'Recurrence Quantification Analysis (RQA)',
    category: 'Dynamics',
    plain_language:
      'Extracts nonlinear dynamical complexity metrics: Recurrence Rate (RR), Determinism (DET), Laminarity (LAM), and Entropy (ENTR) from phase space recurrence matrices.',
    latex_formula:
      'R_{i,j} = \\Theta(\\epsilon - \\|\\vec{y}_i - \\vec{y}_j\\|), \\quad \\text{DET} = \\frac{\\sum_{l \\ge l_{\\min}} l P(l)}{\\sum_{l \\ge 1} l P(l)}, \\quad \\text{ENTR} = -\\sum_l p(l) \\log_2 p(l)',
    assumptions: [
      'Time series is embedded in phase space with delay tau and dimension m matching the underlying attractor.',
    ],
    failure_modes: [
      'Choosing too large an epsilon saturates the matrix; too small leaves it empty.',
    ],
    parameters: [
      { name: 'dimension', type: 'integer', default_val: '3', desc: 'Embedding dimension m.' },
      { name: 'delay', type: 'integer', default_val: '1', desc: 'Embedding delay tau.' },
    ],
    benchmark_example: 'Benchmark Dataset F: DET = 89.2% confirming deterministic non-linear recurrent dynamics.',
    references: [
      'Marwan, N. et al. (2007). Recurrence plots for the analysis of complex systems. Physics Reports, 438(5-6), 237-329.',
    ],
  },
  {
    id: 'lyapunov_exponent',
    name: 'Largest Lyapunov Exponent (Rosenstein)',
    category: 'Dynamics',
    plain_language:
      'Tracks average exponential separation rate of nearby orbits in reconstructed phase space to detect deterministic chaos.',
    latex_formula:
      'y(i) = \\frac{1}{M} \\sum_{j=1}^M \\ln |X_{j+i} - X_{\\hat{j}+i}| \\approx \\lambda_1 (i \\Delta t) + \\text{const}',
    assumptions: [
      'Theiler window exclusion applied to prevent temporal auto-correlations from being mistaken for spatial neighbors.',
    ],
    failure_modes: [
      'Linear fit over unphysical scaling ranges yields misleading positive slopes for noisy series.',
    ],
    parameters: [
      { name: 'max_steps', type: 'integer', default_val: '30', desc: 'Divergence tracking steps.' },
    ],
    benchmark_example: 'Benchmark Dataset F: Reports indicative positive Lyapunov exponent with fit R^2 > 0.88.',
    references: [
      'Rosenstein, M. T., Collins, J. J., & De Luca, C. J. (1993). A practical method for calculating largest Lyapunov exponents from small data sets. Physica D, 65(1-2), 117-134.',
    ],
  },

  // Relations Lab
  {
    id: 'granger_causality',
    name: 'Granger Causality VAR F-Test',
    category: 'Relations',
    plain_language:
      'Evaluates whether past values of channel X contain information that improves predictions of channel Y beyond Y past values alone.',
    latex_formula:
      'y_t = c_1 + \\sum_{i=1}^p \\alpha_i y_{t-i} + \\sum_{j=1}^p \\beta_j x_{t-j} + u_t, \\quad F = \\frac{(\\text{RSS}_R - \\text{RSS}_U)/p}{\\text{RSS}_U / (N - 2p - 1)}',
    assumptions: [
      'Both series are covariance stationary (verified via joint ADF/KPSS beforehand).',
      'Relationships are linear and time-invariant.',
    ],
    failure_modes: [
      'Non-stationary series produce spurious causality rejections (F-statistic inflation).',
    ],
    parameters: [
      { name: 'max_lag', type: 'integer', default_val: '5', desc: 'Maximum VAR lag order tested via AIC.' },
    ],
    benchmark_example: 'Benchmark Dataset E (Coupling): Confirms unidirectional Granger causality from Driver Channel to Response Channel (p < 0.0001).',
    references: [
      'Granger, C. W. (1969). Investigating causal relations by econometric models and cross-spectral methods. Econometrica, 37(3), 424-438.',
    ],
  },
  {
    id: 'transfer_entropy',
    name: 'Transfer Entropy (Directed Information Flow)',
    category: 'Relations',
    plain_language:
      'Measures non-linear directed information transfer from X to Y, conditioned on past state of Y, tested against circular-shift surrogates.',
    latex_formula:
      'T_{X \\to Y} = \\sum p(y_{t+1}, y_t, x_t) \\log_2 \\frac{p(y_{t+1} | y_t, x_t)}{p(y_{t+1} | y_t)}, \\quad T_{X \\to Y} \\ge 0',
    assumptions: [
      'Markov property of order k holds for the stochastic interaction.',
    ],
    failure_modes: [
      'Curse of dimensionality in joint probability estimation requires sufficient samples.',
    ],
    parameters: [
      { name: 'n_bins', type: 'integer', default_val: '8', desc: 'Discretization bins for joint probability grid.' },
      { name: 'n_surrogates', type: 'integer', default_val: '20', desc: 'Circular-shift null surrogates for p-value estimation.' },
    ],
    benchmark_example: 'Benchmark Dataset E: Measures net information flow Delta T = 0.42 bits from Channel 1 to Channel 2 with p < 0.05.',
    references: [
      'Schreiber, T. (2000). Measuring information transfer. Physical Review Letters, 85(2), 461.',
    ],
  },
  {
    id: 'ksg_mutual_info',
    name: 'Kraskov (KSG) Mutual Information',
    category: 'Relations',
    plain_language:
      'Estimates mutual information I(X; Y) directly from continuous k-nearest neighbor distances without arbitrary histogram binning.',
    latex_formula:
      'I(X; Y) = \\psi(k) - \\langle \\psi(n_x + 1) + \\psi(n_y + 1) \\rangle + \\psi(N), \\quad \\psi(x) = \\frac{d}{dx} \\ln \\Gamma(x)',
    assumptions: [
      'Continuous bivariate random variables with bounded density.',
    ],
    failure_modes: [
      'Extreme identical repeated values (ties) require small jitter perturbation to prevent singular KD-Tree balls.',
    ],
    parameters: [
      { name: 'k_neighbors', type: 'integer', default_val: '4', desc: 'Number of nearest neighbors in joint space.' },
    ],
    benchmark_example: 'Benchmark Dataset E: Recovers high non-linear mutual information I(X; Y) = 0.85 bits.',
    references: [
      'Kraskov, A., Stögbauer, H., & Grassberger, P. (2004). Estimating mutual information. Physical Review E, 69(6), 066138.',
    ],
  },
  {
    id: 'dtw_alignment',
    name: 'Dynamic Time Warping (DTW)',
    category: 'Relations',
    plain_language:
      'Finds the optimal non-linear time warping alignment between two trajectories by minimizing cumulative Euclidean cost across dynamic programming paths.',
    latex_formula:
      'D(i, j) = |x_i - y_j| + \\min\\{D(i-1, j), D(i, j-1), D(i-1, j-1)\\}, \\quad d_{\\text{norm}} = \\frac{D(N, M)}{K_{\\text{path}}}',
    assumptions: [
      'Monotonicity and boundary constraints: path starts at (1, 1) and ends at (N, M).',
    ],
    failure_modes: [
      'O(N*M) memory complexity without window constraints (Sakoe-Chiba band).',
    ],
    parameters: [
      { name: 'max_length', type: 'integer', default_val: '400', desc: 'Max subsampled points for responsive computation.' },
    ],
    benchmark_example: 'Benchmark Dataset E: Successfully aligns lead-lag non-linear phase trajectories.',
    references: [
      'Sakoe, H., & Chiba, S. (1978). Dynamic programming algorithm optimization for spoken word recognition. IEEE Trans. ASSP, 26(1), 43-49.',
    ],
  },

  // Inference Lab
  {
    id: 'iaaft_surrogates',
    name: 'IAAFT Constrained Surrogates',
    category: 'Inference',
    plain_language:
      'Generates surrogate datasets that preserve BOTH the exact amplitude probability distribution AND the power spectrum / autocorrelation of the original signal.',
    latex_formula:
      's_{k+1} = \\mathcal{P}_{\\text{dist}} \\left( \\mathcal{F}^{-1} \\left[ |X(f)| e^{j \\arg(\\mathcal{F}[s_k])} \\right] \\right), \\quad p = \\frac{1 + \\sum \\mathbb{I}(T_{\\text{surr}} \\ge T_{\\text{obs}})}{1 + N_{\\text{surr}}}',
    assumptions: [
      'Null hypothesis: Stationary linear Gaussian process observed through an invertible static monotonic measurement function.',
    ],
    failure_modes: [
      'Severe non-stationarities or step changes will not converge to exact spectral-amplitude match.',
    ],
    parameters: [
      { name: 'n_surrogates', type: 'integer', default_val: '50', desc: 'Number of surrogate realizations generated.' },
      { name: 'max_iter', type: 'integer', default_val: '100', desc: 'Maximum iterations for rank-spectrum convergence.' },
    ],
    benchmark_example: 'Benchmark Dataset F: IAAFT surrogates destroy recurrence determinism while preserving power spectrum, proving non-linear origin (p < 0.001).',
    references: [
      'Schreiber, T., & Schmitz, A. (1996). Improved surrogate data for nonlinearity tests. Physical Review Letters, 77(4), 635.',
    ],
  },
  {
    id: 'benjamini_hochberg',
    name: 'Benjamini-Hochberg FDR Control',
    category: 'Inference',
    plain_language:
      'Controls the False Discovery Rate (expected proportion of false positives among rejected nulls) across multiple hypothesis tests.',
    latex_formula:
      'p_{(k)} \\le \\frac{k}{m} \\alpha, \\quad k^* = \\max \\left\\{ k : p_{(k)} \\le \\frac{k}{m} \\alpha \\right\\}, \\quad p_{\\text{adj}} = \\min_{j \\ge k} \\left( \\frac{m}{j} p_{(j)} \\right)',
    assumptions: [
      'Test statistics are independent or satisfy Positive Regression Dependency on each other.',
    ],
    failure_modes: [
      'Under severe negative dependencies, Benjamini-Yekutieli (BY) correction should be preferred.',
    ],
    parameters: [
      { name: 'alpha', type: 'float', default_val: '0.05', desc: 'Target maximum False Discovery Rate.' },
    ],
    benchmark_example: 'Benchmark Dataset J: Simultaneously tests 40 peak candidates, preserving 3 true discoveries while rejecting 37 noise fluctuations.',
    references: [
      'Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate. JRSS Series B, 57(1), 289-300.',
    ],
  },
];
