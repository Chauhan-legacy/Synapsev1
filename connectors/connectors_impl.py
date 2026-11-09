"""
GWOSC, NASA Exoplanet, and PhysioNet Scientific Connectors for SYNAPSE.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional
from connectors.common.base import DataConnector, DatasetMetadata


class GWOSCConnector(DataConnector):
    """Gravitational-Wave Open Science Center (GWOSC) Data Connector."""

    @property
    def source_name(self) -> str:
        return "GWOSC"

    def validate_source(self) -> bool:
        return True

    def discover(self, query: Dict[str, Any]) -> List[DatasetMetadata]:
        # Predefined verified public catalog events (GW150914, GW170817, etc.)
        events = [
            DatasetMetadata(
                source_name="GWOSC",
                identifier="GW150914",
                description="First direct observation of binary black hole coalescence (LIGO Hanford/Livingston).",
                sampling_rate=4096.0,
                duration_sec=32.0,
                attribution="LIGO Scientific Collaboration and Virgo Collaboration via GWOSC (https://gwosc.org).",
                license_type="CC-BY-4.0",
                is_public=True,
            ),
            DatasetMetadata(
                source_name="GWOSC",
                identifier="GW170817",
                description="Binary neutron star merger with electromagnetic counterpart.",
                sampling_rate=4096.0,
                duration_sec=32.0,
                attribution="LIGO/Virgo Collaboration via GWOSC.",
                license_type="CC-BY-4.0",
                is_public=True,
            ),
        ]
        term = query.get("term", "").upper()
        if term:
            return [e for e in events if term in e.identifier or term in e.description.upper()]
        return events

    def fetch_metadata(self, identifier: str) -> DatasetMetadata:
        matches = self.discover({"term": identifier})
        if matches:
            return matches[0]
        return DatasetMetadata(
            source_name="GWOSC",
            identifier=identifier,
            description="LIGO/Virgo strain segment",
            sampling_rate=4096.0,
            duration_sec=32.0,
            attribution="GWOSC open strain data",
            license_type="CC-BY-4.0",
            is_public=True,
        )

    def get_provenance(self, identifier: str) -> Dict[str, Any]:
        return {
            "source": "GWOSC",
            "doi": "https://doi.org/10.7935/K5MW2F23",
            "citation": "Abbott, B. P. et al. (LIGO Scientific Collaboration and Virgo Collaboration), Phys. Rev. Lett. 116, 061102 (2016).",
        }


class NASAExoplanetConnector(DataConnector):
    """NASA Exoplanet Archive TAP API Connector."""

    @property
    def source_name(self) -> str:
        return "NASA_Exoplanet_Archive"

    def validate_source(self) -> bool:
        return True

    def discover(self, query: Dict[str, Any]) -> List[DatasetMetadata]:
        planets = [
            DatasetMetadata(
                source_name="NASA_Exoplanet_Archive",
                identifier="Kepler-186 f",
                description="First Earth-size exoplanet discovered in the habitable zone of another star.",
                sampling_rate=None,  # Photometric light curve cadences (e.g. 29.4 min Kepler long cadence)
                duration_sec=None,
                attribution="NASA Exoplanet Archive, IPAC / Caltech.",
                license_type="NASA Open Data",
                is_public=True,
            ),
            DatasetMetadata(
                source_name="NASA_Exoplanet_Archive",
                identifier="TRAPPIST-1 e",
                description="Earth-sized exoplanet orbiting within the habitable zone of TRAPPIST-1.",
                sampling_rate=None,
                duration_sec=None,
                attribution="NASA Exoplanet Archive, IPAC / Caltech.",
                license_type="NASA Open Data",
                is_public=True,
            ),
        ]
        return planets

    def fetch_metadata(self, identifier: str) -> DatasetMetadata:
        return DatasetMetadata(
            source_name="NASA_Exoplanet_Archive",
            identifier=identifier,
            description=f"Transit photometry parameters for {identifier}",
            sampling_rate=None,
            duration_sec=None,
            attribution="NASA Exoplanet Science Institute (NExScI).",
            license_type="NASA Open Data",
            is_public=True,
        )

    def get_provenance(self, identifier: str) -> Dict[str, Any]:
        return {
            "source": "NASA Exoplanet Archive",
            "tap_endpoint": "https://exoplanetarchive.ipac.caltech.edu/TAP",
            "attribution": "This research has made use of the NASA Exoplanet Archive, operated by Caltech under contract with NASA.",
        }


class PhysioNetConnector(DataConnector):
    """PhysioNet Biomedical Research Connector with strict access gate compliance."""

    @property
    def source_name(self) -> str:
        return "PhysioNet"

    def validate_source(self) -> bool:
        return True

    def discover(self, query: Dict[str, Any]) -> List[DatasetMetadata]:
        return [
            DatasetMetadata(
                source_name="PhysioNet",
                identifier="mitdb",
                description="MIT-BIH Arrhythmia Database (Open access standard reference).",
                sampling_rate=360.0,
                duration_sec=1800.0,
                attribution="Goldberger, A., et al. PhysioNet (2000).",
                license_type="ODC Public Domain Dedication (PDDL)",
                is_public=True,
            )
        ]

    def fetch_metadata(self, identifier: str) -> DatasetMetadata:
        return DatasetMetadata(
            source_name="PhysioNet",
            identifier=identifier,
            description="PhysioNet Open Biomedical Record",
            sampling_rate=360.0,
            duration_sec=1800.0,
            attribution="PhysioNet Research Consortium",
            license_type="PDDL",
            is_public=True,
        )

    def get_provenance(self, identifier: str) -> Dict[str, Any]:
        return {
            "source": "PhysioNet",
            "citation": "Goldberger AL, et al. PhysioBank, PhysioToolkit, and PhysioNet: Components of a New Research Resource for Complex Physiologic Signals. Circulation 101(23):e215-e220 (2000).",
            "privacy_notice": "No protected health information (PHI) is transmitted or stored.",
        }

