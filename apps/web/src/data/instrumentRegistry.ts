/**
 * SYNAPSE Central Instrument Registry
 * Unified catalog of all signal intelligence instruments, mathematical analysers,
 * time-frequency scopes, complexity estimators, and statistical engines.
 */

export type InstrumentCategory =
  | 'Spectral'
  | 'Time-Frequency'
  | 'Complexity & Dynamics'
  | 'Anomalies & Changepoints'
  | 'Multi-channel & Relations'
  | 'Statistical & Inference'
  | 'Auto-Analyst';

export interface LegendItem {
  id: string;
  name: string;
  color: string;
  unit?: string;
  defaultVisible?: boolean;
}

export interface InstrumentDefinition {
  id: string;
  title: string;
  category: InstrumentCategory;
  caption: string;
  mathematicalBasis: string;
  tags: string[];
  legend: LegendItem[];
  defaultPinned?: boolean;
  tier: 1 | 2;
}

export const INSTRUMENT_REGISTRY: InstrumentDefinition[] = [
  // 1. Oscillogram
  {
    id: 'oscillogram',
    title: 'Time-Domain Oscillogram',
    category: 'Time-Frequency',
    caption: 'Continuous amplitude trajectory x(t) with transient shocks and structural regimes',
    mathematicalBasis: 'x(t) = \\sum_k A_k \\cos(2\\pi f_k t + \\phi_k) + \\eta(t)',
    tags: ['raw', 'time-domain', 'waveform', 'transients'],
    legend: [
      { id: 'raw', name: 'Raw Trace', color: '#1F2430', unit: 'V', defaultVisible: true },
      { id: 'outliers', name: 'ESD Outliers (3σ)', color: '#B7791F', defaultVisible: true },
      { id: 'mean', name: 'Centroid Baseline', color: '#6B6F7B', defaultVisible: false },
    ],
    defaultPinned: true,
    tier: 1,
  },
  // 2. Welch PSD
  {
    id: 'welch_psd',
    title: 'Welch Fourier Power Spectrum',
    category: 'Spectral',
    caption: 'Averaged modified periodogram with Hann windowing and 50% overlap',
    mathematicalBasis: '\\hat{P}(f) = \\frac{1}{K f_s S_2} \\sum_{k=1}^K |\\mathcal{F}\\{x_k w\\}|^2',
    tags: ['spectral', 'welch', 'fft', 'harmonics', 'psd'],
    legend: [
      { id: 'psd', name: 'Power Spectral Density', color: '#0072B2', unit: 'V²/Hz', defaultVisible: true },
      { id: 'peaks', name: 'Detected Peak Bins', color: '#D55E00', defaultVisible: true },
      { id: 'noise_floor', name: 'Estimated Noise Floor', color: '#6B6F7B', defaultVisible: false },
    ],
    defaultPinned: true,
    tier: 1,
  },
  // 3. Thomson Multitaper
  {
    id: 'multitaper',
    title: 'Thomson Multitaper PSD & F-Test',
    category: 'Spectral',
    caption: 'Discrete Prolate Spheroidal Sequences (DPSS) eigenspectra with Fisher line-component test',
    mathematicalBasis: 'F(f) = \\frac{(K-1)|\\sum_k V_k(0) Y_k(f)|^2 / \\sum_k V_k^2(0)}{\\sum_k |Y_k(f) - \\hat{C}(f) V_k(0)|^2}',
    tags: ['spectral', 'dpss', 'multitaper', 'f-test', 'harmonic-detection'],
    legend: [
      { id: 'psd', name: 'Multitaper Mean PSD', color: '#0072B2', unit: 'V²/Hz', defaultVisible: true },
      { id: 'ci95', name: '95% χ² Confidence Band', color: '#6B6F7B', defaultVisible: true },
      { id: 'flines', name: 'Harmonic Line (F > 13.8)', color: '#2E7D32', defaultVisible: true },
    ],
    tier: 1,
  },
  // 4. STFT Spectrogram
  {
    id: 'stft_spectrogram',
    title: 'Short-Time Fourier Spectrogram',
    category: 'Time-Frequency',
    caption: 'Windowed time-frequency energy distribution S(t, f) showing temporal frequency evolution',
    mathematicalBasis: 'S(t, f) = |\\int_{-\\infty}^\\infty x(\\tau) w(\\tau - t) e^{-j 2\\pi f \\tau} d\\tau|^2',
    tags: ['stft', 'time-frequency', 'spectrogram', 'chirp', 'energy-map'],
    legend: [
      { id: 'spectrogram', name: 'Spectral Energy Density', color: '#0F766E', unit: 'dB/Hz', defaultVisible: true },
      { id: 'ridge', name: 'Instantaneous Frequency Ridge', color: '#E69F00', defaultVisible: true },
    ],
    tier: 1,
  },
  // 5. CWT Scalogram
  {
    id: 'cwt_scalogram',
    title: 'Continuous Wavelet Scalogram (Morlet)',
    category: 'Time-Frequency',
    caption: 'Continuous scale-time decomposition with Morlet kernel and Cone of Influence',
    mathematicalBasis: 'W(s, \\tau) = \\frac{1}{\\sqrt{s}} \\int x(t) \\pi^{-1/4} e^{i \\omega_0 (t-\\tau)/s} e^{-(t-\\tau)^2/(2s^2)} dt',
    tags: ['cwt', 'wavelet', 'morlet', 'scalogram', 'coi', 'multiscale'],
    legend: [
      { id: 'wavelet_power', name: 'Wavelet Power |W(s, t)|²', color: '#009E73', defaultVisible: true },
      { id: 'coi', name: 'Cone of Influence (COI)', color: '#B7791F', defaultVisible: true },
    ],
    tier: 1,
  },
  // 6. Hilbert-Huang Transform & EMD
  {
    id: 'hilbert_emd',
    title: 'Hilbert-Huang Transform & EMD',
    category: 'Time-Frequency',
    caption: 'Empirical Mode Decomposition into Intrinsic Mode Functions (IMFs) and analytic envelopes',
    mathematicalBasis: 'x(t) = \\sum_{j=1}^M c_j(t) + r_M(t), \\quad z_j(t) = c_j(t) + i \\mathcal{H}\\{c_j(t)\\}',
    tags: ['hht', 'emd', 'imf', 'hilbert', 'instantaneous-amplitude'],
    legend: [
      { id: 'imf1', name: 'IMF 1 (High Frequency)', color: '#0072B2', defaultVisible: true },
      { id: 'imf2', name: 'IMF 2 (Resonant Core)', color: '#E69F00', defaultVisible: true },
      { id: 'envelope', name: 'Analytic Envelope |z(t)|', color: '#1F2430', defaultVisible: true },
      { id: 'residue', name: 'Trend Residue', color: '#6B6F7B', defaultVisible: false },
    ],
    tier: 1,
  },
  // 7. Lomb-Scargle Periodogram
  {
    id: 'lomb_scargle',
    title: 'Lomb-Scargle Periodogram (Gapped Series)',
    category: 'Spectral',
    caption: 'Generalized least-squares spectral estimation for unevenly spaced or missing observations',
    mathematicalBasis: 'P_{LS}(\\omega) = \\frac{1}{2\\sigma^2} \\left[ \\frac{(\\sum x_j \\cos\\omega(t_j-\\tau))^2}{\\sum \\cos^2\\omega(t_j-\\tau)} + \\frac{(\\sum x_j \\sin\\omega(t_j-\\tau))^2}{\\sum \\sin^2\\omega(t_j-\\tau)} \\right]',
    tags: ['lomb-scargle', 'uneven-sampling', 'astronomy', 'gaps', 'fap'],
    legend: [
      { id: 'periodogram', name: 'Scargle Power', color: '#7B5EA7', defaultVisible: true },
      { id: 'fap95', name: 'False Alarm Prob 95% (p=0.05)', color: '#B7791F', defaultVisible: true },
      { id: 'fap99', name: 'False Alarm Prob 99% (p=0.01)', color: '#C0392B', defaultVisible: true },
    ],
    tier: 1,
  },
  // 8. Phase Space & Takens Attractor
  {
    id: 'phase_space',
    title: 'Takens Delay Phase Portrait',
    category: 'Complexity & Dynamics',
    caption: 'Reconstructed dynamical attractor trajectory in delay coordinate space [x(t), x(t + τ)]',
    mathematicalBasis: '\\mathbf{y}(t) = [x(t), x(t+\\tau), \\dots, x(t+(d-1)\\tau)]^T, \\quad d \\ge 2 d_A + 1',
    tags: ['phase-space', 'attractor', 'chaos', 'takens', 'embedding'],
    legend: [
      { id: 'attractor', name: 'Delay Orbit x(t+τ) vs x(t)', color: '#009E73', defaultVisible: true },
      { id: 'poincare', name: 'Poincaré Section Transversal', color: '#1F2430', defaultVisible: true },
    ],
    tier: 1,
  },
  // 9. Higher-Order Bispectrum QPC
  {
    id: 'bispectrum',
    title: 'Higher-Order Bispectrum B(f₁, f₂)',
    category: 'Spectral',
    caption: 'Quantifies quadratic phase coupling between harmonic triads f₁ + f₂ = f₃',
    mathematicalBasis: 'b^2(f_1, f_2) = \\frac{|\\mathbb{E}[X(f_1) X(f_2) X^*(f_1+f_2)]|^2}{\\mathbb{E}[|X(f_1)X(f_2)|^2] \\mathbb{E}[|X(f_1+f_2)|^2]}',
    tags: ['bispectrum', 'bicoherence', 'qpc', 'higher-order', 'nonlinearity'],
    legend: [
      { id: 'bicoherence', name: 'Bicoherence b²(f₁, f₂)', color: '#E69F00', defaultVisible: true },
      { id: 'significance', name: 'Coupling Threshold (p < 0.001)', color: '#2E7D32', defaultVisible: true },
    ],
    tier: 1,
  },
  // 10. Autocorrelation & Bartlett Bounds
  {
    id: 'autocorr',
    title: 'Autocorrelation R_xx(k) & Bartlett Bounds',
    category: 'Complexity & Dynamics',
    caption: 'Temporal memory decay and periodic lag structure with 95% Bartlett significance bounds',
    mathematicalBasis: 'r_{xx}(k) = \\frac{\\sum_{t=1}^{N-k} (x_t - \\bar{x})(x_{t+k} - \\bar{x})}{\\sum_{t=1}^N (x_t - \\bar{x})^2}, \\quad \\text{Var}(r_k) \\approx \\frac{1}{N}',
    tags: ['autocorrelation', 'acf', 'bartlett', 'memory', 'lag'],
    legend: [
      { id: 'acf', name: 'ACF Coefficient r_xx(k)', color: '#7B5EA7', defaultVisible: true },
      { id: 'bartlett', name: 'Bartlett 95% Bound (±1.96/√N)', color: '#B7791F', defaultVisible: true },
      { id: 'zero', name: 'Zero Baseline', color: '#6B6F7B', defaultVisible: false },
    ],
    tier: 1,
  },
  // 11. Sample & Permutation Entropy
  {
    id: 'entropy_multiscale',
    title: 'Multiscale Entropy (Sample & Permutation)',
    category: 'Complexity & Dynamics',
    caption: 'Dynamical irregularity and algorithmic information content across coarse-grained temporal scales',
    mathematicalBasis: 'SampEn(m, r) = -\\ln \\frac{A}{B}, \\quad H_{perm} = -\\frac{1}{\\ln d!} \\sum_{i=1}^{d!} p(\\pi_i) \\ln p(\\pi_i)',
    tags: ['entropy', 'complexity', 'sampen', 'permutation-entropy', 'multiscale'],
    legend: [
      { id: 'sampen', name: 'Sample Entropy (m=2, r=0.2σ)', color: '#0F766E', defaultVisible: true },
      { id: 'permen', name: 'Permutation Entropy (d=3)', color: '#0072B2', defaultVisible: true },
    ],
    tier: 1,
  },
  // 12. DFA & Hurst Exponent
  {
    id: 'dfa_scaling',
    title: 'Detrended Fluctuation Analysis (DFA)',
    category: 'Complexity & Dynamics',
    caption: 'Self-affine scaling exponent α revealing anti-persistent, random walk, or long-range persistent memory',
    mathematicalBasis: 'F(s) = \\left[ \\frac{1}{N} \\sum_{k=1}^N (y(k) - y_s(k))^2 \\right]^{1/2} \\propto s^\\alpha',
    tags: ['dfa', 'hurst', 'fractal', 'scaling', 'long-range-memory'],
    legend: [
      { id: 'fluctuation', name: 'Empirical Fluctuation F(s)', color: '#1F2430', defaultVisible: true },
      { id: 'fit', name: 'Power-Law Regression Slope α', color: '#009E73', defaultVisible: true },
    ],
    tier: 1,
  },
  // 13. PELT Changepoint & CUSUM
  {
    id: 'changepoint_pelt',
    title: 'PELT & CUSUM Changepoint Detection',
    category: 'Anomalies & Changepoints',
    caption: 'Pruned Exact Linear Time structural partition dividing stationary variance and mean regimes',
    mathematicalBasis: '\\min_{\\tau} \\sum_{i=1}^{m+1} [\\mathcal{C}(y_{(\\tau_{i-1}+1):\\tau_i}) + \\beta], \\quad S_k = \\max(0, S_{k-1} + y_k - \\mu - k)',
    tags: ['pelt', 'cusum', 'changepoint', 'regime-shift', 'variance-jump'],
    legend: [
      { id: 'raw', name: 'Signal & Changepoint Partition', color: '#1F2430', defaultVisible: true },
      { id: 'cusum_pos', name: 'CUSUM Positive Shift S⁺', color: '#0072B2', defaultVisible: true },
      { id: 'cusum_neg', name: 'CUSUM Negative Shift S⁻', color: '#D55E00', defaultVisible: true },
    ],
    tier: 1,
  },
  // 14. Coherence & Cross-Correlation
  {
    id: 'coherence_xcorr',
    title: 'Spectral Coherence & Cross-Correlation',
    category: 'Multi-channel & Relations',
    caption: 'Bivariate coupling strength γ²_xy(f) and inter-channel transmission delay timing τ',
    mathematicalBasis: '\\gamma_{xy}^2(f) = \\frac{|S_{xy}(f)|^2}{S_{xx}(f) S_{yy}(f)} \\in [0, 1], \\quad R_{xy}(\\tau) = \\int x(t) y(t+\\tau) dt',
    tags: ['coherence', 'cross-correlation', 'lag', 'multichannel', 'coupling'],
    legend: [
      { id: 'coherence', name: 'Magnitude Coherence γ²_xy(f)', color: '#0F766E', defaultVisible: true },
      { id: 'xcorr', name: 'Normalized Cross-Correlation R_xy(τ)', color: '#7B5EA7', defaultVisible: true },
    ],
    tier: 1,
  },
  // 15. Granger Causality
  {
    id: 'granger_causality',
    title: 'Granger Causality Directional VAR',
    category: 'Multi-channel & Relations',
    caption: 'Vector autoregressive inference testing whether channel X past values forecast channel Y',
    mathematicalBasis: 'F = \\frac{(RSS_R - RSS_U) / p}{RSS_U / (N - 2p - 1)} \\sim F(p, N - 2p - 1)',
    tags: ['granger', 'causality', 'var', 'directionality', 'bivariate'],
    legend: [
      { id: 'x_to_y', name: 'X → Y Forecast Power', color: '#0072B2', defaultVisible: true },
      { id: 'y_to_x', name: 'Y → X Forecast Power', color: '#E69F00', defaultVisible: true },
      { id: 'threshold', name: 'F Significance Line (p < 0.05)', color: '#2E7D32', defaultVisible: true },
    ],
    tier: 1,
  },
  // 16. Principal Component Analysis
  {
    id: 'pca_multichannel',
    title: 'Principal Component Analysis (PCA)',
    category: 'Multi-channel & Relations',
    caption: 'Multi-channel orthogonal subspace decomposition, explained variance scree, and trajectory projection',
    mathematicalBasis: '\\mathbf{\\Sigma} \\mathbf{v}_i = \\lambda_i \\mathbf{v}_i, \\quad \\text{Var Ratio}_i = \\frac{\\lambda_i}{\\sum \\lambda_k}',
    tags: ['pca', 'eigenvalue', 'scree', 'dimensionality-reduction', 'subspace'],
    legend: [
      { id: 'scree', name: 'Explained Variance Ratio', color: '#0F766E', defaultVisible: true },
      { id: 'pc1_vs_pc2', name: 'Trajectory in PC1-PC2 Subspace', color: '#1F2430', defaultVisible: true },
    ],
    tier: 1,
  },
  // 17. IAAFT Surrogate Testing
  {
    id: 'surrogate_testing',
    title: 'Iterated Amplitude-Adjusted Surrogates (IAAFT)',
    category: 'Statistical & Inference',
    caption: 'Nonlinear significance testing against 100 phase-randomized surrogate realizations',
    mathematicalBasis: '\\mathbb{H}_0: \\text{Linear Gaussian process with static monotonic observation transform}',
    tags: ['surrogates', 'iaaft', 'hypothesis-test', 'null-model', 'nonlinearity'],
    legend: [
      { id: 'empirical', name: 'Empirical Spectrum P_xx', color: '#1F2430', defaultVisible: true },
      { id: 'null_band', name: 'Surrogate 95% Confidence Envelope', color: '#B7791F', defaultVisible: true },
      { id: 'surr_med', name: 'Surrogate Median Null', color: '#6B6F7B', defaultVisible: false },
    ],
    tier: 1,
  },
  // 18. Auto-Analyst Scientific Discovery Engine
  {
    id: 'auto_analyst',
    title: 'Auto-Analyst Discovery & Evidence DAG',
    category: 'Auto-Analyst',
    caption: 'Autonomous orchestration of all analytical engines, ranking discoveries with confidence and evidence lineage',
    mathematicalBasis: '\\text{Rank} = w_1 \\cdot \\text{SNR} + w_2 \\cdot (-\\log_{10} p) + w_3 \\cdot \\text{Reproducibility}',
    tags: ['auto-analyst', 'discovery', 'lineage', 'dag', 'findings', 'p-values'],
    legend: [
      { id: 'validated', name: 'Validated Finding (p < 0.001)', color: '#2E7D32', defaultVisible: true },
      { id: 'candidate', name: 'Candidate Signal (p < 0.05)', color: '#B7791F', defaultVisible: true },
      { id: 'dag_edge', name: 'Evidence Lineage Link', color: '#0F766E', defaultVisible: true },
    ],
    tier: 1,
  },
];
