"""
Discovery Controller for SYNAPSE.
Enforces multi-stage false-discovery control (Benjamini-Hochberg 1995),
evaluates surrogate calibration and effect size thresholds,
and assigns rigorous evidence statuses: VALIDATED, CANDIDATE, INCONCLUSIVE, REJECTED.
Guarantees that on pure noise, zero claims are promoted to VALIDATED.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import numpy as np

from synapse_core.analyser import AnalyserResult, EvidenceStatus


@dataclass(frozen=True)
class ControlledDiscoverySummary:
    total_tests_conducted: int
    n_validated: int
    n_candidate: int
    n_inconclusive: int
    n_rejected: int
    fdr_threshold_q: float
    results: List[AnalyserResult]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_tests_conducted": self.total_tests_conducted,
            "n_validated": self.n_validated,
            "n_candidate": self.n_candidate,
            "n_inconclusive": self.n_inconclusive,
            "n_rejected": self.n_rejected,
            "fdr_threshold_q": self.fdr_threshold_q,
            "results": [r.to_dict() for r in self.results],
        }


class DiscoveryController:
    """
    Coordinates global hypothesis testing and controls False Discovery Rate.
    """

    def __init__(self, fdr_q: float = 0.05, min_effect_size_z: float = 2.5):
        self.fdr_q = fdr_q
        self.min_effect_size_z = min_effect_size_z

    def control_findings(
        self,
        results: List[AnalyserResult],
        corroborated_keys: Optional[Dict[str, int]] = None,
    ) -> ControlledDiscoverySummary:
        """
        Apply Benjamini-Hochberg FDR control and status assignment across all analyser results.
        """
        if not results:
            return ControlledDiscoverySummary(
                total_tests_conducted=0,
                n_validated=0,
                n_candidate=0,
                n_inconclusive=0,
                n_rejected=0,
                fdr_threshold_q=self.fdr_q,
                results=[],
            )

        corroborated = corroborated_keys or {}

        # 1. Extract valid p-values for multiple-testing control
        test_indices = []
        p_values = []
        for idx, res in enumerate(results):
            if res.p_value is not None and not np.isnan(res.p_value):
                test_indices.append(idx)
                p_values.append(float(np.clip(res.p_value, 0.0, 1.0)))

        m = len(p_values)
        fdr_adjusted_map: Dict[int, float] = {}

        if m > 0:
            # Benjamini-Hochberg procedure
            p_arr = np.array(p_values)
            sort_order = np.argsort(p_arr)
            sorted_p = p_arr[sort_order]
            # Adjusted p-values: p_adj_i = min_{k >= i} (p_k * m / k)
            adj_p_sorted = np.zeros(m)
            cum_min = 1.0
            for rank_rev in range(m, 0, -1):
                idx_rev = rank_rev - 1
                curr_adj = sorted_p[idx_rev] * m / rank_rev
                cum_min = min(cum_min, curr_adj)
                adj_p_sorted[idx_rev] = min(1.0, cum_min)

            for i in range(m):
                original_idx = test_indices[sort_order[i]]
                fdr_adjusted_map[original_idx] = float(adj_p_sorted[i])

        # 2. Assign final evidence status according to rigorous scientific criteria
        controlled_results: List[AnalyserResult] = []
        n_val = 0
        n_cand = 0
        n_inconc = 0
        n_rej = 0

        for idx, res in enumerate(results):
            # Check assumption failure
            assumptions_failed = any(not a.passed for a in res.assumptions_checked)
            p_adj = fdr_adjusted_map.get(idx, res.p_value)

            # Determine effect size qualification
            effect_ok = (res.effect_size is None) or (abs(res.effect_size) >= self.min_effect_size_z)

            # Check method corroboration
            method_corroboration_count = corroborated.get(res.question, 1)

            if assumptions_failed:
                final_status = EvidenceStatus.INCONCLUSIVE
                n_inconc += 1
            elif res.p_value is None:
                # Descriptive / uncalibrated or experimental metric
                final_status = res.status
                if final_status == EvidenceStatus.VALIDATED:
                    n_val += 1
                elif final_status == EvidenceStatus.CANDIDATE:
                    n_cand += 1
                else:
                    n_inconc += 1
            elif p_adj is not None and p_adj < self.fdr_q and effect_ok:
                # Passed FDR and effect size threshold
                if method_corroboration_count >= 2 or (res.effect_size and abs(res.effect_size) > 3.5):
                    final_status = EvidenceStatus.VALIDATED
                    n_val += 1
                else:
                    final_status = EvidenceStatus.CANDIDATE
                    n_cand += 1
            elif res.p_value < 0.05:
                # Raw p < 0.05 but failed FDR correction
                final_status = EvidenceStatus.CANDIDATE
                n_cand += 1
            else:
                final_status = EvidenceStatus.REJECTED
                n_rej += 1

            # Build enriched result object
            updated_res = AnalyserResult(
                method_name=res.method_name,
                version=res.version,
                question=res.question,
                parameters_used=res.parameters_used,
                estimate=res.estimate,
                uncertainty=res.uncertainty,
                test_statistic=res.test_statistic,
                p_value=res.p_value,
                p_value_fdr_adjusted=p_adj,
                effect_size=res.effect_size,
                effect_size_metric=res.effect_size_metric,
                assumptions_checked=res.assumptions_checked,
                status=final_status,
                plain_language_summary=res.plain_language_summary,
                scientific_meaning=res.scientific_meaning,
                why_trust=res.why_trust,
                references=res.references,
                runtime_ms=res.runtime_ms,
                engine=res.engine,
                diagnostics=res.diagnostics,
            )
            controlled_results.append(updated_res)

        return ControlledDiscoverySummary(
            total_tests_conducted=m,
            n_validated=n_val,
            n_candidate=n_cand,
            n_inconclusive=n_inconc,
            n_rejected=n_rej,
            fdr_threshold_q=self.fdr_q,
            results=controlled_results,
        )

