# SYNAPSE Mathematical Methods & Physics Formalisms

This document provides complete mathematical derivations, partial differential equations, and operational formulas implemented across the SYNAPSE scientific engine.

---

## 1. Deep Analysis Engine Suite (24 Core Modules)

| Category | Algorithm / Engine | Mathematical Formulation | Output / Invariant |
|:---|:---|:---|:---|
| **Spectra** | Welch Periodogram | $P(f) = \frac{1}{K} \sum_{k=1}^K I_k(f)$ | Power Spectral Density with $\chi^2_\nu$ CI |
| **Spectra** | Thomson Multitaper | $\hat{S}_{\text{mt}}(f) = \frac{1}{K} \sum_{k=0}^{K-1} \|F_k(f)\|^2$ | Harmonic $F$-test line separation |
| **Spectra** | Lomb-Scargle | $P_{LS}(\omega) = \frac{1}{2} \left[ \frac{(\sum x \cos)^2}{\sum \cos^2} + \frac{(\sum x \sin)^2}{\sum \sin^2} \right]$ | Irregular & gapped periodicity with FAP |
| **Spectra** | CRLB Sinusoid Fit | $\text{Var}(\hat{f}) \ge \frac{12}{(2\pi)^2 \text{SNR} \cdot T^2 N}$ | Sub-bin frequency estimation at Cramér-Rao bound |
| **Spectra** | Noise Color Fit | $S(f) \sim 1/f^\beta$ | Spectral slope $\beta$ (White, Pink, Brown) |
| **Statistics** | Joint Stationarity | ADF ($p_{\text{ADF}}$) + KPSS ($p_{\text{KPSS}}$) | Dual-test stationarity quadrant classification |
| **Statistics** | Normality Suite | Jarque-Bera $\chi^2_2$ + Shapiro-Wilk $W$ | Asymptotic & empirical Gaussian testing |
| **Statistics** | Autocorrelation | $\hat{\rho}(k) = \gamma(k) / \gamma(0)$ | Sample ACF with Bartlett $\pm 1.96/\sqrt{N}$ bounds |
| **Statistics** | DFA (Hurst $H$) | $F(s) \sim s^\alpha$ | Monofractal self-similarity scaling exponent |
| **Anomalies** | Rosner Generalized ESD | $R_i = \max_j \|x_j - \bar{x}\| / s$ | Masking-immune outlier isolation up to $k$ spikes |
| **Anomalies** | PELT Changepoints | $\min_\tau \sum_{i=1}^m \mathcal{C}(y_{\tau_{i-1}:\tau_i}) + \beta m$ | Optimal linear-time variance/mean segmentation |
| **Anomalies** | BOCPD | $P(r_t \mid y_{1:t}) \propto \sum P(r_{t-1}) P(y_t \mid \cdot)$ | Real-time Bayesian run-length posterior |
| **Anomalies** | Matrix Profile | $\mu = \min_{j} D(T_{i:i+m}, T_{j:j+m})$ | 1-NN subsequence distance discord discovery |
| **Structure** | AMI Delay Selection | $I(X; X_\tau) = \sum p \log_2(p / (p_x p_y))$ | First local minimum determines optimal $\tau^*$ |
| **Structure** | FNN Dimension | $R_i = \|x_{i, m+1} - x_{n(i), m+1}\| / D_m(i)$ | Minimal embedding dimension $m^*$ (FNN $< 2\%$) |
| **Structure** | RQA Determinism | $\text{DET} = \sum_{\ell \ge \ell_{\min}} \ell P(\ell) / \sum \ell P(\ell)$ | Recurrence plot diagonal predictability ratio |
| **Structure** | Sample Entropy | $\text{SampEn}(m, r) = -\ln(A / B)$ | Subsequence matching regularity without self-matches |
| **Structure** | Lyapunov Exponent | $d(t) = C e^{\lambda_1 t}$ | Average exponential trajectory divergence |
| **Relations** | Spectral Coherence | $\gamma^2_{xy}(f) = \|S_{xy}(f)\|^2 / (S_{xx}(f) S_{yy}(f))$ | Compared against Carter 95% analytical threshold |
| **Relations** | Granger Causality | $Y_t = \sum \alpha_i Y_{t-i} + \sum \beta_i X_{t-i} + \epsilon_t$ | Directional Wald $F$-test with AIC lag selection |
| **Relations** | Dynamic Time Warping | $D(i, j) = d(x_i, y_j) + \min(D_{i-1,j}, D_{i,j-1}, D_{i-1,j-1})$ | Sakoe-Chiba constrained alignment distance |
| **Inference** | IAAFT Surrogates | Iterated amplitude/spectral rank adjustment | Non-parametric null hypothesis generation |
| **Inference** | Benjamini-Hochberg | $p_{(k)} \le \frac{k}{m} Q$ | False Discovery Rate (FDR) controlled at $5\%$ |
| **Inference** | BCa Bootstrap | $\hat{\theta} \pm z_{\alpha} \text{SE}$ with bias & acceleration | Corrected non-parametric confidence intervals |

---

## 2. Dedicated Astronomy & High-Energy Physics Suite (Serials #1 to #10)

### Serial #1: CERN LHC Di-Photon Higgs Invariant Mass ($H \to \gamma\gamma$)
* **Physical Phenomenon**: Decay of the Standard Model Higgs scalar boson into two ultra-relativistic photons within the ATLAS/CMS electromagnetic calorimeter.
* **Mathematical Formalism**:
  $$m_{\gamma\gamma} = \sqrt{2 E_1 E_2 (1 - \cos\theta_{12})}$$
  Modeled as a Breit-Wigner resonance convolved with Gaussian detector resolution on top of a falling exponential QCD background:
  $$\frac{dN}{dm} = B_0 e^{-\lambda m} + \frac{S_0 \cdot (\Gamma_H / 2)^2}{(m - m_H)^2 + (\Gamma_H / 2)^2}, \quad m_H = 125.09\text{ GeV}, \ \Gamma_H = 4.07\text{ MeV}$$

### Serial #2: Planck Cosmic Microwave Background (CMB) Angular Power Spectrum
* **Physical Phenomenon**: Relic thermal photon anisotropies of the early universe ($z \approx 1090$) decomposed into spherical harmonics across the celestial sphere.
* **Mathematical Formalism**:
  $$\Delta T(\hat{n}) = \sum_{\ell=0}^{\infty} \sum_{m=-\ell}^{\ell} a_{\ell m} Y_{\ell m}(\hat{n}), \quad C_\ell = \langle |a_{\ell m}|^2 \rangle = \frac{1}{2\ell + 1} \sum_{m=-\ell}^{\ell} |a_{\ell m}|^2$$
  $$\mathcal{D}_\ell = \frac{\ell(\ell + 1)}{2\pi} C_\ell \quad [\mu\text{K}^2]$$

### Serial #3: Fast Radio Burst (FRB) Cold-Plasma Dispersion Measure
* **Physical Phenomenon**: Millisecond-duration coherent radio flashes propagating across cosmological distances through the ionized intergalactic medium (IGM).
* **Mathematical Formalism**:
  $$\Delta t = \mathcal{D} \cdot \text{DM} \left( \frac{1}{\nu_{\text{low}}^2} - \frac{1}{\nu_{\text{high}}^2} \right), \quad \mathcal{D} = \frac{e^2}{2\pi m_e c} \approx 4.148808 \times 10^3 \text{ MHz}^2 \text{ pc}^{-1} \text{ cm}^3 \text{ s}$$

### Serial #4: High-Purity Germanium (HPGe) Nuclear Gamma-Ray Spectroscopy
* **Physical Phenomenon**: Photoelectric absorption, Compton scattering, and pair production in cryogenic HPGe semiconductor detectors ($77\text{ K}$).
* **Mathematical Formalism**:
  $$E_e = E_\gamma - E_{\text{binding}}, \quad E' = \frac{E_\gamma}{1 + \frac{E_\gamma}{m_e c^2}(1 - \cos\theta)}, \quad E_{\text{edge}} = \frac{2 E_\gamma^2}{m_e c^2 + 2 E_\gamma}$$

### Serial #5: Relativistic Cosmic-Ray Atmospheric Muon Time Dilation
* **Physical Phenomenon**: Atmospheric muons produced at $15\text{ km}$ altitude surviving to ground level due to special relativistic time dilation.
* **Mathematical Formalism**:
  $$\gamma = \frac{1}{\sqrt{1 - \beta^2}} \approx 28.87, \quad \tau = \gamma \tau_0 \approx 63.42\,\mu\text{s}, \quad L = \frac{L_0}{\gamma} \approx 519.6\text{ m}$$
  $$N(h) = N_0 \exp\left( -\frac{h}{\gamma \beta c \tau_0} \right)$$

### Serial #6: Tokamak Magnetohydrodynamic (MHD) Disruption & Mirnov Coils
* **Physical Phenomenon**: Helical magnetic tearing modes ($m/n = 2/1$) growing in magnetically confined fusion plasmas.
* **Mathematical Formalism**:
  $$\tilde{B}_\theta(t) = B_0 \exp(\gamma t) \cos(m\theta - n\phi - \omega_{\text{rot}} t), \quad q(r) = \frac{r B_T}{R B_p}, \quad q_{95} \le 2.0 \implies \text{Disruption Crash}$$

### Serial #7: 2D Quantum Ising Model Critical Phase Transition
* **Physical Phenomenon**: Spontaneous symmetry breaking and second-order ferromagnetic-to-paramagnetic transition on a 2D square lattice.
* **Mathematical Formalism**:
  $$\mathcal{H} = -J \sum_{\langle i, j \rangle} \sigma_i \sigma_j, \quad T_c = \frac{2 J}{k_B \ln(1 + \sqrt{2})} \approx 2.269185$$
  $$M(T) = \left[ 1 - \sinh^{-4}\left(\frac{2J}{k_B T}\right) \right]^{1/8} \quad (T < T_c), \qquad M(T) = 0 \quad (T \ge T_c)$$

### Serial #8: Global Planetary Seismology & Earth Core Shadow Zone
* **Physical Phenomenon**: Propagation of deep body waves ($P$-waves and $S$-waves) through mantle, liquid outer core, and solid inner core.
* **Mathematical Formalism**:
  $$v_p = \sqrt{\frac{K + \frac{4}{3}\mu}{\rho}}, \quad v_s = \sqrt{\frac{\mu}{\rho}}, \quad \text{Snell's Law: } p = \frac{r \sin i}{v(r)} = \text{const}$$
  $$\text{Liquid Outer Core: } \mu = 0 \implies v_s = 0 \implies S\text{-Wave Shadow Zone: } 104^\circ \le \Delta \le 140^\circ$$

### Serial #9: Kerr Spacetime Gravitational Lensing & Black Hole Shadow
* **Physical Phenomenon**: Geodesic light deflection and the photon capture shadow of a rotating Kerr black hole with spin $a/M$.
* **Mathematical Formalism**:
  $$ds^2 = -\left(1 - \frac{2Mr}{\rho^2}\right) dt^2 - \frac{4Mar\sin^2\theta}{\rho^2} dt\,d\phi + \frac{\rho^2}{\Delta} dr^2 + \rho^2 d\theta^2 + \left(r^2 + a^2 + \frac{2Ma^2r\sin^2\theta}{\rho^2}\right)\sin^2\theta\,d\phi^2$$
  $$\text{Photon Sphere: } r_{\text{ph}} = 2M\left(1 + \cos\left(\frac{2}{3}\arccos(\mp a/M)\right)\right), \quad R_{\text{shadow}} \approx \sqrt{27} M$$

### Serial #10: Nuclear Reactor Point-Kinetics & Delayed Neutron Model
* **Physical Phenomenon**: Neutron population kinetics governed by prompt neutrons and 6 delayed neutron precursor groups ($^{87}\text{Br}, ^{137}\text{I}$).
* **Mathematical Formalism**:
  $$\frac{dn(t)}{dt} = \frac{\rho(t) - \beta_{\text{eff}}}{\Lambda} n(t) + \sum_{i=1}^{6} \lambda_i C_i(t) + S(t), \quad \frac{dC_i(t)}{dt} = \frac{\beta_i}{\Lambda} n(t) - \lambda_i C_i(t)$$

