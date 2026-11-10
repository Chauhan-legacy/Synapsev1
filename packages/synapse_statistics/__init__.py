from synapse_statistics.engine import StatisticsEngine
from synapse_statistics.stationarity import evaluate_stationarity, StationarityResult
from synapse_statistics.normality import evaluate_normality, NormalityResult
from synapse_statistics.autocorr import compute_autocorr_structure, AutocorrStructureResult
from synapse_statistics.dfa import compute_dfa, DFAResult
from synapse_statistics.distribution_fit import fit_candidate_distributions, DistributionFitResult

__all__ = [
    "StatisticsEngine",
    "evaluate_stationarity",
    "StationarityResult",
    "evaluate_normality",
    "NormalityResult",
    "compute_autocorr_structure",
    "AutocorrStructureResult",
    "compute_dfa",
    "DFAResult",
    "fit_candidate_distributions",
    "DistributionFitResult",
]
