from synapse_relation.engine import RelationEngine
from synapse_relation.correlation import compute_multichannel_correlations, compute_cross_correlation, CrossCorrelationResult
from synapse_relation.coherence import compute_spectral_coherence, CoherenceResult
from synapse_relation.pca import compute_multichannel_pca, compute_mutual_information, PCAResult

__all__ = [
    "RelationEngine",
    "compute_multichannel_correlations",
    "compute_cross_correlation",
    "CrossCorrelationResult",
    "compute_spectral_coherence",
    "CoherenceResult",
    "compute_multichannel_pca",
    "compute_mutual_information",
    "PCAResult",
]

