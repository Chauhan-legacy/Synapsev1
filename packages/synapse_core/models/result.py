"""
Common Result and Scientific Finding Models.
Distinguishes between Candidates, Statistically Evaluated, and Rejected Findings.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
import uuid
from typing import Tuple, Dict, Any, Optional, List
import datetime


class FindingStatus(str, Enum):
    """
    Scientific lifecycle of a finding.
    Never confuse a raw detection candidate with a confirmed finding.
    """
    CANDIDATE = "candidate"
    STATISTICALLY_EVALUATED = "statistically_evaluated"
    VALIDATED = "validated"
    REJECTED = "rejected"


class FindingType(str, Enum):
    SPECTRAL_PEAK = "spectral_peak"
    HARMONIC_SERIES = "harmonic_series"
    PERIODICITY = "periodicity"
    TRANSIENT_ANOMALY = "transient_anomaly"
    CHANGE_POINT = "change_point"
    CORRELATION = "correlation"
    MOTIF = "motif"


@dataclass(frozen=True)
class MetricValue:
    """Scientific metric value with unit and description."""
    name: str
    value: float
    unit: str = "dimensionless"
    description: str = ""


@dataclass(frozen=True)
class WarningMessage:
    """Mathematical, sampling, or numerical warning."""
    code: str
    message: str
    severity: str = "warning"  # info, warning, critical
    suggested_action: str = ""


@dataclass(frozen=True)
class Finding:
    """
    A discrete scientific finding produced by an engine.
    """
    label: str
    finding_type: FindingType
    value: float
    unit: str = "dimensionless"
    uncertainty_bounds: Optional[Tuple[float, float]] = None
    confidence_level: Optional[float] = None
    status: FindingStatus = FindingStatus.CANDIDATE
    supporting_evidence: Tuple[str, ...] = field(default_factory=tuple)
    contradictory_evidence: Tuple[str, ...] = field(default_factory=tuple)
    limitations: Tuple[str, ...] = field(default_factory=tuple)
    details: Dict[str, Any] = field(default_factory=dict)
    finding_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "finding_id": self.finding_id,
            "label": self.label,
            "finding_type": self.finding_type.value,
            "value": self.value,
            "unit": self.unit,
            "uncertainty_bounds": list(self.uncertainty_bounds) if self.uncertainty_bounds else None,
            "confidence_level": self.confidence_level,
            "status": self.status.value,
            "supporting_evidence": list(self.supporting_evidence),
            "contradictory_evidence": list(self.contradictory_evidence),
            "limitations": list(self.limitations),
            "details": self.details,
        }


@dataclass(frozen=True)
class AnalysisResult:
    """
    Standard output payload for all SYNAPSE analysis engines.
    """
    analysis_id: str
    engine_name: str
    engine_version: str
    dataset_hash: str
    parameters: Dict[str, Any]
    findings: Tuple[Finding, ...]
    metrics: Dict[str, MetricValue]
    warnings: Tuple[WarningMessage, ...]
    execution_time_seconds: float
    created_at_utc: str = field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "analysis_id": self.analysis_id,
            "engine_name": self.engine_name,
            "engine_version": self.engine_version,
            "dataset_hash": self.dataset_hash,
            "parameters": self.parameters,
            "findings": [f.to_dict() for f in self.findings],
            "metrics": {
                k: {"name": v.name, "value": v.value, "unit": v.unit, "description": v.description}
                for k, v in self.metrics.items()
            },
            "warnings": [
                {"code": w.code, "message": w.message, "severity": w.severity, "suggested_action": w.suggested_action}
                for w in self.warnings
            ],
            "execution_time_seconds": self.execution_time_seconds,
            "created_at_utc": self.created_at_utc,
        }

