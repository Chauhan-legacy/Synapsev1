"""
SYNAPSE Exception Hierarchy.
Strict, typed exceptions for mathematical, sampling, and data integrity boundaries.
"""

from typing import Optional, Dict, Any


class SynapseError(Exception):
    """Base exception for all SYNAPSE errors."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error_type": self.__class__.__name__,
            "message": self.message,
            "details": self.details,
        }


class ValidationError(SynapseError):
    """Raised when an input or parameter validation fails."""
    pass


class IncompatibleSamplingError(SynapseError):
    """
    Raised when an algorithm requiring uniform sampling receives irregular or jittered timestamps.
    Never silently resample; require explicit scientific decision.
    """
    def __init__(
        self,
        message: str,
        sampling_type: str,
        jitter_ratio: float,
        tolerance: float,
        suggested_action: str = "Resample explicitly using a scientifically defensible method or choose an irregular-compatible algorithm.",
    ):
        details = {
            "sampling_type": sampling_type,
            "jitter_ratio": jitter_ratio,
            "tolerance": tolerance,
            "suggested_action": suggested_action,
        }
        super().__init__(message, details=details)
        self.sampling_type = sampling_type
        self.jitter_ratio = jitter_ratio
        self.tolerance = tolerance


class DataIntegrityError(SynapseError):
    """Raised when data tampering, corruption, or unexpected modification is detected."""
    pass


class MathematicalDomainError(SynapseError):
    """Raised when an operation violates mathematical assumptions (e.g. log of negative, singular matrix)."""
    pass


class ResourceLimitExceededError(SynapseError):
    """Raised when estimated or actual memory/compute exceeds safety thresholds."""
    pass


class InsufficientDataError(SynapseError):
    """Raised when signal length or channel count is insufficient for the requested algorithm."""
    pass

