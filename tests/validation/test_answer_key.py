"""
Regression test for SYNAPSE Answer Key and messy benchmark verification.
"""

from scripts.verify_answer_key import verify


def test_messy_dataset_answer_key_pipeline_matches_ground_truth():
    success = verify()
    assert success is True, "Answer key verification failed: live pipeline diverges from ground-truth claims"
