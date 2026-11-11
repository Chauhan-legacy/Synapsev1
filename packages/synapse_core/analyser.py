"""
Unified Analyser Base Contract for SYNAPSE Scientific Intelligence.
Defines the standard schema, assumption checking, parameter declarations,
and self-describing metadata for all analysers.
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

from synapse_core.models.signal import Signal


class EvidenceStatus(str, Enum):
    VALIDATED = "validated"       # Passed FDR, high effect size, corroborated by null model or >=2 methods
    CANDIDATE = "candidate"       # Passed raw p < alpha, borderline under FDR or single uncorroborated method
    INCONCLUSIVE = "inconclusive" # Assumptions violated, low sample size, or insufficient statistical power
    REJECTED = "rejected"         # Consistent with null hypothesis or surrogate distribution
    EXPERIMENTAL = "experimental" # Advanced methodology under active validation benchmark


@dataclass(frozen=True)
class AssumptionCheck:
    name: str
    description: str
    passed: bool
    details: str = ""


@dataclass(frozen=True)
class AnalyserResult:
    method_name: str
    version: str
    question: str
    parameters_used: Dict[str, Any]
    estimate: Any
    uncertainty: Optional[Dict[str, float]] = None # e.g. {"ci_low": ..., "ci_high": ...}
    test_statistic: Optional[float] = None
    p_value: Optional[float] = None
    p_value_fdr_adjusted: Optional[float] = None
    effect_size: Optional[float] = None
    effect_size_metric: Optional[str] = None # e.g. "Cohen's d", "SNR (dB)", "R^2"
    assumptions_checked: List[AssumptionCheck] = field(default_factory=list)
    status: EvidenceStatus = EvidenceStatus.CANDIDATE
    plain_language_summary: str = ""
    scientific_meaning: str = ""
    why_trust: str = ""
    references: List[str] = field(default_factory=list)
    runtime_ms: float = 0.0
    engine: str = "SYNAPSE Core"
    diagnostics: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "method_name": self.method_name,
            "version": self.version,
            "question": self.question,
            "parameters_used": self.parameters_used,
            "estimate": self.estimate,
            "uncertainty": self.uncertainty,
            "test_statistic": self.test_statistic,
            "p_value": self.p_value,
            "p_value_fdr_adjusted": self.p_value_fdr_adjusted,
            "effect_size": self.effect_size,
            "effect_size_metric": self.effect_size_metric,
            "assumptions_checked": [
                {"name": a.name, "description": a.description, "passed": a.passed, "details": a.details}
                for a in self.assumptions_checked
            ],
            "status": self.status.value,
            "plain_language_summary": self.plain_language_summary,
            "scientific_meaning": self.scientific_meaning,
            "why_trust": self.why_trust,
            "references": self.references,
            "runtime_ms": self.runtime_ms,
            "engine": self.engine,
            "diagnostics": self.diagnostics,
        }


class Analyser(ABC):
    """
    Universal base contract for every SYNAPSE analytical method.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable name of the analyser."""
        pass

    @property
    @abstractmethod
    def version(self) -> str:
        """Semantic version of the implementation."""
        pass

    @property
    @abstractmethod
    def question(self) -> str:
        """Plain-language description of the scientific question answered."""
        pass

    @property
    def min_samples(self) -> int:
        return 16

    @property
    def min_channels(self) -> int:
        return 1

    @property
    def requires_uniform_sampling(self) -> bool:
        return True

    @property
    def is_experimental(self) -> bool:
        return False

    @abstractmethod
    def check_assumptions(self, signal: Signal) -> List[AssumptionCheck]:
        """Verify mathematical preconditions on the signal."""
        pass

    @abstractmethod
    def run(self, signal: Signal, params: Optional[Dict[str, Any]] = None) -> AnalyserResult:
        """Execute the analysis and produce evidence-backed result."""
        pass

