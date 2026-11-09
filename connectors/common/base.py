"""
Base Abstract Interface for SYNAPSE Scientific Data Connectors.
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass(frozen=True)
class DatasetMetadata:
    source_name: str
    identifier: str
    description: str
    sampling_rate: Optional[float]
    duration_sec: Optional[float]
    attribution: str
    license_type: str
    is_public: bool


class DataConnector(ABC):
    """
    Standard interface for scientific data archives.
    All connectors are strictly optional; core platform runs offline without them.
    """

    @property
    @abstractmethod
    def source_name(self) -> str:
        pass

    @abstractmethod
    def validate_source(self) -> bool:
        """Verify reachability or local cache availability."""
        pass

    @abstractmethod
    def discover(self, query: Dict[str, Any]) -> List[DatasetMetadata]:
        """Search repository for available datasets."""
        pass

    @abstractmethod
    def fetch_metadata(self, identifier: str) -> DatasetMetadata:
        """Retrieve complete provenance and licensing details."""
        pass

    @abstractmethod
    def get_provenance(self, identifier: str) -> Dict[str, Any]:
        """Generate attribution string and data citation."""
        pass

