"""
SYNAPSE Core Package
Canonical data models, contracts, error hierarchies, and data quality profiling.
"""

from synapse_core.models.signal import Signal, ChannelInfo, SamplingMetadata, SignalQualityReport
from synapse_core.models.result import (
    AnalysisResult,
    Finding,
    FindingStatus,
    FindingType,
    MetricValue,
    WarningMessage,
)
from synapse_core.contracts.engine import AnalysisEngine, ResourceEstimate
from synapse_core.exceptions import (
    SynapseError,
    IncompatibleSamplingError,
    DataIntegrityError,
    ResourceLimitExceededError,
    MathematicalDomainError,
    ValidationError,
)

__version__ = "0.1.0"

__all__ = [
    "Signal",
    "ChannelInfo",
    "SamplingMetadata",
    "SignalQualityReport",
    "AnalysisResult",
    "Finding",
    "FindingStatus",
    "FindingType",
    "MetricValue",
    "WarningMessage",
    "AnalysisEngine",
    "ResourceEstimate",
    "SynapseError",
    "IncompatibleSamplingError",
    "DataIntegrityError",
    "ResourceLimitExceededError",
    "MathematicalDomainError",
    "ValidationError",
]

