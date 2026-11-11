"""
Consensus Engine for SYNAPSE.
Corroborates findings across distinct mathematical paradigms:
- Periodicities: Multitaper F-test, Welch PSD, Autocorrelation, Wavelet Scalogram
- Changepoints: PELT, BOCPD, CUSUM
- Directional Coupling: Granger Causality, Transfer Entropy
- Anomalies: Rosner ESD, Robust MAD Z-score, Isolation Forest
"""

from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import List, Dict, Any, Tuple, Optional
import numpy as np


class AgreementLevel(str, Enum):
    UNANIMOUS = "unanimous"         # All available methods agree
    HIGH = "high"                   # >= 3 methods or >= 75% agreement
    MODERATE = "moderate"           # 2 methods agree
    SINGLE = "single"               # Detected by only 1 method


@dataclass(frozen=True)
class ConsensusFinding:
    category: str                   # "Periodicity", "Changepoint", "Coupling", "Outlier"
    canonical_value: Any            # e.g., frequency (Hz), sample index, or direction
    agreement_level: AgreementLevel
    supporting_methods: Tuple[str, ...]
    opposing_or_silent_methods: Tuple[str, ...]
    mean_confidence: float          # 0.0 to 1.0
    summary_sentence: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "category": self.category,
            "canonical_value": self.canonical_value,
            "agreement_level": self.agreement_level.value,
            "supporting_methods": list(self.supporting_methods),
            "opposing_or_silent_methods": list(self.opposing_or_silent_methods),
            "mean_confidence": self.mean_confidence,
            "summary_sentence": self.summary_sentence,
        }


class ConsensusEngine:
    """
    Synthesizes independent mathematical detections into unified consensus claims.
    """

    @staticmethod
    def merge_periodicities(
        detections: List[Dict[str, Any]],
        bandwidth_hz: float = 0.5,
    ) -> List[ConsensusFinding]:
        """
        Merge candidate line frequencies from Multitaper, Welch, and Autocorrelation.
        Each detection dict has {"method": str, "frequency": float, "confidence": float}.
        """
        if not detections:
            return []

        # Group by frequency clusters within bandwidth_hz
        clusters: List[List[Dict[str, Any]]] = []
        for det in detections:
            f = det["frequency"]
            placed = False
            for c in clusters:
                cluster_mean = np.mean([d["frequency"] for d in c])
                if abs(f - cluster_mean) <= bandwidth_hz:
                    c.append(det)
                    placed = True
                    break
            if not placed:
                clusters.append([det])

        all_methods = {"Multitaper Harmonic F-Test", "Welch Fourier PSD", "Autocorrelation Lag"}
        findings: List[ConsensusFinding] = []

        for c in clusters:
            freqs = [d["frequency"] for d in c]
            mean_f = float(np.mean(freqs))
            supporters = tuple(sorted(set(d["method"] for d in c)))
            silent = tuple(sorted(all_methods - set(supporters)))
            conf = float(np.mean([d.get("confidence", 0.8) for d in c]))

            k = len(supporters)
            if k >= 3:
                agr = AgreementLevel.HIGH
            elif k == 2:
                agr = AgreementLevel.MODERATE
            else:
                agr = AgreementLevel.SINGLE

            msg = (
                f"Harmonic line at {mean_f:.2f} Hz confirmed by {k} independent methods "
                f"({', '.join(supporters)})."
            )

            findings.append(ConsensusFinding(
                category="Periodicity",
                canonical_value=round(mean_f, 3),
                agreement_level=agr,
                supporting_methods=supporters,
                opposing_or_silent_methods=silent,
                mean_confidence=conf,
                summary_sentence=msg,
            ))

        return findings

    @staticmethod
    def merge_changepoints(
        detections: List[Dict[str, Any]],
        tolerance_samples: int = 25,
    ) -> List[ConsensusFinding]:
        """
        Merge changepoints from PELT, BOCPD, and CUSUM.
        Each detection has {"method": str, "index": int, "confidence": float}.
        """
        if not detections:
            return []

        clusters: List[List[Dict[str, Any]]] = []
        for det in detections:
            idx = det["index"]
            placed = False
            for c in clusters:
                cluster_mean = np.mean([d["index"] for d in c])
                if abs(idx - cluster_mean) <= tolerance_samples:
                    c.append(det)
                    placed = True
                    break
            if not placed:
                clusters.append([det])

        all_methods = {"PELT Pruned Exact Linear Time", "Bayesian Online Changepoints (BOCPD)", "CUSUM Mean Shift"}
        findings: List[ConsensusFinding] = []

        for c in clusters:
            indices = [d["index"] for d in c]
            mean_idx = int(round(float(np.mean(indices))))
            supporters = tuple(sorted(set(d["method"] for d in c)))
            silent = tuple(sorted(all_methods - set(supporters)))
            conf = float(np.mean([d.get("confidence", 0.8) for d in c]))

            k = len(supporters)
            if k >= 3:
                agr = AgreementLevel.HIGH
            elif k == 2:
                agr = AgreementLevel.MODERATE
            else:
                agr = AgreementLevel.SINGLE

            msg = (
                f"Structural changepoint at sample {mean_idx} verified by {k} detectors "
                f"({', '.join(supporters)})."
            )

            findings.append(ConsensusFinding(
                category="Changepoint",
                canonical_value=mean_idx,
                agreement_level=agr,
                supporting_methods=supporters,
                opposing_or_silent_methods=silent,
                mean_confidence=conf,
                summary_sentence=msg,
            ))

        return findings

    @staticmethod
    def merge_coupling(
        granger_res: Optional[Dict[str, Any]],
        transfer_entropy_res: Optional[Dict[str, Any]],
    ) -> List[ConsensusFinding]:
        """
        Merge directional coupling from Granger Causality and Transfer Entropy.
        """
        findings: List[ConsensusFinding] = []
        g_xy = granger_res.get("x_causes_y", False) if granger_res else False
        g_yx = granger_res.get("y_causes_x", False) if granger_res else False
        te_xy = transfer_entropy_res.get("x_causes_y", False) if transfer_entropy_res else False
        te_yx = transfer_entropy_res.get("y_causes_x", False) if transfer_entropy_res else False

        # Direction X -> Y
        if g_xy or te_xy:
            supporters = []
            if g_xy: supporters.append("Granger VAR Causality")
            if te_xy: supporters.append("Model-Free Transfer Entropy")
            agr = AgreementLevel.MODERATE if len(supporters) == 2 else AgreementLevel.SINGLE
            msg = f"Directional influence X -> Y supported by {len(supporters)} method(s): {', '.join(supporters)}."
            findings.append(ConsensusFinding(
                category="Coupling",
                canonical_value="X -> Y",
                agreement_level=agr,
                supporting_methods=tuple(supporters),
                opposing_or_silent_methods=() if len(supporters) == 2 else ("Transfer Entropy" if g_xy else "Granger",),
                mean_confidence=0.9 if len(supporters) == 2 else 0.6,
                summary_sentence=msg,
            ))

        # Direction Y -> X
        if g_yx or te_yx:
            supporters = []
            if g_yx: supporters.append("Granger VAR Causality")
            if te_yx: supporters.append("Model-Free Transfer Entropy")
            agr = AgreementLevel.MODERATE if len(supporters) == 2 else AgreementLevel.SINGLE
            msg = f"Directional influence Y -> X supported by {len(supporters)} method(s): {', '.join(supporters)}."
            findings.append(ConsensusFinding(
                category="Coupling",
                canonical_value="Y -> X",
                agreement_level=agr,
                supporting_methods=tuple(supporters),
                opposing_or_silent_methods=() if len(supporters) == 2 else ("Transfer Entropy" if g_yx else "Granger",),
                mean_confidence=0.9 if len(supporters) == 2 else 0.6,
                summary_sentence=msg,
            ))

        return findings
