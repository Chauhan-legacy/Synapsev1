"""
Teaching Layer for SYNAPSE.
Translates rigorous mathematical outputs into honest, plain-language educational explanations:
- What this means (for students, hobbyists, and early researchers)
- Why you can trust it (exact statistical test, null calibration, and effect size)
- Landmark literature citations with historical context
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Any, List


@dataclass(frozen=True)
class TeachingExplanation:
    plain_meaning: str
    why_trust: str
    landmark_paper: str
    reference_citation: str
    recommended_reading: str


TEACHING_REPOSITORY: Dict[str, TeachingExplanation] = {
    "Multitaper Spectral Estimation": TeachingExplanation(
        plain_meaning="Discovers persistent oscillations or rhythm spikes embedded in noisy signals without being fooled by random ripples.",
        why_trust="Uses Thomson's F-test across orthogonal Slepian tapers. Only frequencies that explain coherent line power significantly above the continuous background (FDR-controlled p < 0.01) are declared.",
        landmark_paper="Thomson, D. J. (1982). 'Spectrum estimation and harmonic analysis.' Proceedings of the IEEE, 70(9), 1055-1096.",
        reference_citation="doi:10.1109/PROC.1982.12433",
        recommended_reading="Percival & Walden (1993), 'Spectral Analysis for Physical Applications', Cambridge University Press.",
    ),
    "PELT Changepoint Detection": TeachingExplanation(
        plain_meaning="Pinpoints the exact timestamps where the system abruptly switched behaviors (such as a shift in mean power or variance).",
        why_trust="Uses Pruned Exact Linear Time dynamic programming with Modified Bayes Information Criterion (mBIC) penalty, guaranteeing linear computational scaling and mathematically bounded false positive rates.",
        landmark_paper="Killick, R., Fearnhead, P., & Eckley, I. A. (2012). 'Optimal detection of changepoints with a linear computational cost.' J. Am. Stat. Assoc., 107(500), 1590-1598.",
        reference_citation="doi:10.1080/01621459.2012.737745",
        recommended_reading="Truong et al. (2020), 'Selective review of offline change point detection methods', Signal Processing.",
    ),
    "Bayesian Online Changepoints (BOCPD)": TeachingExplanation(
        plain_meaning="Tracks the probability that a reset occurred sample-by-sample as data arrives in real time.",
        why_trust="Recursive message passing evaluates exact posterior run-length distributions R(r, t). Changepoints are flagged only when posterior run length resets and predictive evidence overwhelmingly favors a new regime.",
        landmark_paper="Adams, R. P., & MacKay, D. J. (2007). 'Bayesian online changepoint detection.' arXiv:0710.3742.",
        reference_citation="arXiv:0710.3742 [stat.ML]",
        recommended_reading="Turner (2011), 'Time Series Models, Estimation and Model Selection', PhD thesis, Cambridge.",
    ),
    "Largest Lyapunov Exponent": TeachingExplanation(
        plain_meaning="Determines whether irregular behavior is deterministic chaos (extreme sensitivity to initial conditions) or mere random noise.",
        why_trust="Uses Rosenstein's algorithm with Theiler spatial-temporal exclusion window. Trajectory divergence is tracked across reconstructed state space; a positive slope verified with R^2 >= 0.85 separates chaos from noise.",
        landmark_paper="Rosenstein, M. T., Collins, J. J., & De Luca, C. J. (1993). 'A practical method for calculating largest Lyapunov exponents from small data sets.' Physica D: Nonlinear Phenomena, 65(1-2), 117-134.",
        reference_citation="doi:10.1016/0167-2789(93)90009-P",
        recommended_reading="Kantz & Schreiber (2004), 'Nonlinear Time Series Analysis', Cambridge University Press.",
    ),
    "Granger Causality VAR": TeachingExplanation(
        plain_meaning="Tests whether past values of Channel X contain unique information that improves forecasts of Channel Y beyond Channel Y's own past.",
        why_trust="Evaluates vector autoregressive F-tests where lag order is chosen on the restricted target model by BIC. This prevents overfitting null correlations, guaranteeing a nominal 5% type I error rate.",
        landmark_paper="Granger, C. W. (1969). 'Investigating causal relations by econometric models and cross-spectral methods.' Econometrica, 424-438.",
        reference_citation="doi:10.2307/1912791",
        recommended_reading="Lütkepohl (2005), 'New Introduction to Multiple Time Series Analysis', Springer.",
    ),
    "Recurrence Quantification Analysis (RQA)": TeachingExplanation(
        plain_meaning="Measures the structural repeatability and predictability of a trajectory in multi-dimensional phase space.",
        why_trust="Computes determinism (DET) and laminarity (LAM) directly from full contiguous phase space embeddings without temporal thinning, ensuring diagonal recurrence lines accurately reflect true trajectory coherence.",
        landmark_paper="Marwan, N., Romano, M. C., Thiel, M., & Kurths, J. (2007). 'Recurrence plots for the analysis of complex systems.' Physics Reports, 438(5-6), 237-329.",
        reference_citation="doi:10.1016/j.physrep.2006.11.001",
        recommended_reading="Webber & Zbilut (2005), 'Recurrence Quantification Analysis', Tutorials in Contemporary Nonlinear Methods.",
    ),
    "Rosner Generalized ESD Outliers": TeachingExplanation(
        plain_meaning="Detects transient spikes and anomalous data bursts while being immune to the masking effect where multiple outliers hide each other.",
        why_trust="Iteratively strips extreme Studentized deviations using exact critical values from Student's t distribution, controlling family-wise error at alpha = 0.05.",
        landmark_paper="Rosner, B. (1983). 'Percentage points for a generalized ESD many-outlier procedure.' Technometrics, 25(2), 165-172.",
        reference_citation="doi:10.1080/00401706.1983.10487848",
        recommended_reading="Hawkins (1980), 'Identification of Outliers', Chapman and Hall.",
    ),
    "Iterated Amplitude Adjusted Fourier Surrogates (IAAFT)": TeachingExplanation(
        plain_meaning="Creates twin simulated signals that have the exact same frequencies and amplitude distribution as your data, but zero non-linear structure.",
        why_trust="Provides the gold-standard null model in non-linear dynamics, allowing researchers to verify whether detected patterns are true physical structures or linear noise artifacts.",
        landmark_paper="Schreiber, T., & Schmitz, A. (1996). 'Improved surrogate data for testing nonlinearity.' Physical Review Letters, 77(4), 635.",
        reference_citation="doi:10.1103/PhysRevLett.77.635",
        recommended_reading="Theiler et al. (1992), 'Testing for nonlinearity in time series: the method of surrogate data', Physica D.",
    ),
}


def get_teaching_explanation(method_name: str) -> TeachingExplanation:
    """Retrieve educational context for an analyser method."""
    for key, explanation in TEACHING_REPOSITORY.items():
        if key.lower() in method_name.lower():
            return explanation
    return TeachingExplanation(
        plain_meaning="Statistically evaluates scientific structure against empirical null benchmarks.",
        why_trust="Controlled under Benjamini-Hochberg False Discovery Rate (FDR) and validated with surrogate calibrations.",
        landmark_paper="Benjamini, Y., & Hochberg, Y. (1995). 'Controlling the false discovery rate: a practical and powerful approach to multiple testing.' JRSS B, 57(1), 289-300.",
        reference_citation="doi:10.1111/j.2517-6161.1995.tb02031.x",
        recommended_reading="Efron (2012), 'Large-Scale Inference: Empirical Bayes Methods for Estimation, Testing, and Prediction', Cambridge.",
    )

