"""
Shared strongly typed contract for all SYNAPSE scientific computational engines.
Every engine must be independently testable without web or database dependencies.
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, Optional

from synapse_core.models.signal import Signal
from synapse_core.models.result import AnalysisResult


@dataclass(frozen=True)
class ResourceEstimate:
    """Estimated resource envelope for an analysis execution."""
    estimated_memory_bytes: int
    estimated_runtime_seconds: float
    time_complexity_notation: str
    space_complexity_notation: str
    is_safe_for_browser: bool
    requires_chunking: bool = False
    warning: Optional[str] = None


class AnalysisEngine(ABC):
    """
    Abstract Base Class defining the universal contract for all computational engines.
    """

    @property
    @abstractmethod
    def engine_name(self) -> str:
        """Unique identifier of the engine (e.g., 'SPECTRA', 'STRUCTURE')."""
        pass

    @property
    @abstractmethod
    def engine_version(self) -> str:
        """Semantic version of the engine."""
        pass

    @abstractmethod
    def validate(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> None:
        """
        Validate that the input Signal satisfies all mathematical assumptions
        and preconditions for this engine and algorithm.
        Raises ValidationError or IncompatibleSamplingError on violation.
        """
        pass

    @abstractmethod
    def estimate_resources(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> ResourceEstimate:
        """
        Produce a conservative resource estimate (memory bytes and CPU seconds).
        Used by the execution router to select execution tier and enforce safety limits.
        """
        pass

    @abstractmethod
    def execute(self, signal: Signal, config: Optional[Dict[str, Any]] = None) -> AnalysisResult:
        """
        Execute scientific analysis on the signal and return a structured AnalysisResult.
        Original signal MUST NOT be mutated.
        """
        pass

    def validate_result(self, result: AnalysisResult) -> bool:
        """
        Post-execution verification to ensure result integrity and schema conformity.
        """
        if not isinstance(result, AnalysisResult):
            return False
        if result.engine_name != self.engine_name:
            return False
        return True

