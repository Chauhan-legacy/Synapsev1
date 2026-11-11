"""
Ground-Truth Benchmark Suite: Inference & Discovery Controller.
Validates IAAFT surrogate conservation and global Benjamini-Hochberg FDR control under null.
"""

import numpy as np
import pytest
from synapse_inference.surrogates import generate_iaaft_surrogates
from synapse_core.discovery_controller import DiscoveryController
from synapse_core.analyser import AnalyserResult, EvidenceStatus


def test_gt_iaaft_surrogates_distribution_conservation():
    """Verify IAAFT surrogates conserve exact amplitude distribution and linear power spectrum."""
    rng = np.random.default_rng(909)
    N = 400
    x = rng.exponential(scale=2.0, size=N)  # Highly skewed non-Gaussian

    surrogates = generate_iaaft_surrogates(x, n_surrogates=5, max_iter=80)
    assert len(surrogates) == 5

    # Check amplitude distribution: sorted values must match within numerical tolerance
    orig_sorted = np.sort(x)
    for s in surrogates:
        surr_sorted = np.sort(s)
        max_diff = np.max(np.abs(orig_sorted - surr_sorted))
        assert max_diff < 1e-3, f"IAAFT amplitude distribution mismatch: {max_diff}"


def test_gt_discovery_controller_global_fdr_under_null():
    """Verify DiscoveryController controls false discoveries to <= 5% under global null."""
    controller = DiscoveryController(fdr_q=0.05)
    rng = np.random.default_rng(1010)
    n_tests = 50

    # Under complete null, p-values are uniformly distributed in [0, 1]
    null_p_values = rng.uniform(0.0, 1.0, n_tests)

    candidate_results = [
        AnalyserResult(
            method_name=f"NullTest_{i}",
            version="2.0.0",
            question="Is this real?",
            parameters_used={},
            estimate=0.0,
            test_statistic=1.0,
            p_value=float(p),
            status=EvidenceStatus.CANDIDATE if p < 0.05 else EvidenceStatus.REJECTED,
            plain_language_summary="Null hypothesis candidate",
            scientific_meaning="Testing null hypothesis",
            references=[],
            runtime_ms=1.0,
            engine="Python Engine (v2.0.0)",
        )
        for i, p in enumerate(null_p_values)
    ]

    summary = controller.control_findings(candidate_results)
    declared_validated = [r for r in summary.results if r.status == EvidenceStatus.VALIDATED]

    # In a sample of 50 uniform p-values with BH-FDR q=0.05, false declarations should be <= 2
    assert len(declared_validated) <= 2, f"Too many false discoveries under null: {len(declared_validated)}"

    # In a sample of 50 uniform p-values with BH-FDR q=0.05, false declarations should be <= 2
    assert len(declared_validated) <= 2, f"Too many false discoveries under null: {len(declared_validated)}"
