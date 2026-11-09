from synapse_structure.engine import StructureEngine
from synapse_structure.autocorrelation import compute_autocorrelation, AutocorrelationResult
from synapse_structure.motifs import discover_motifs_and_discords, MotifPair, DiscordSubsequence
from synapse_structure.recurrence import compute_recurrence_matrix, RecurrenceResult

__all__ = [
    "StructureEngine",
    "compute_autocorrelation",
    "AutocorrelationResult",
    "discover_motifs_and_discords",
    "MotifPair",
    "DiscordSubsequence",
    "compute_recurrence_matrix",
    "RecurrenceResult",
]

