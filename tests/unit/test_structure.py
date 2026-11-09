import pytest
import numpy as np

from synapse_structure.autocorrelation import compute_autocorrelation
from synapse_structure.motifs import discover_motifs_and_discords
from synapse_structure.recurrence import compute_recurrence_matrix


def test_autocorrelation_period_recovery():
    fs = 100.0
    t = np.arange(300) / fs
    f0 = 5.0  # Period = 0.2s (20 samples)
    sig = np.sin(2 * np.pi * f0 * t)

    res = compute_autocorrelation(sig, sampling_rate=fs)

    assert res.acf[0] == pytest.approx(1.0, rel=1e-3)
    assert res.dominant_period_sec is not None
    assert pytest.approx(res.dominant_period_sec, rel=0.05) == 0.20
    assert pytest.approx(res.dominant_frequency_hz, rel=0.05) == 5.0


def test_motif_discovery():
    # Construct signal with an explicit identical motif planted at two locations
    vals = np.random.normal(0, 0.1, 200)
    ts = np.linspace(0, 2, 200)
    pattern = np.sin(np.linspace(0, 2 * np.pi, 20))

    vals[20:40] = pattern
    vals[120:140] = pattern

    motif, _ = discover_motifs_and_discords(vals, ts, window_length=20)
    assert motif is not None
    # Distance between identical patterns should be very small
    assert motif.distance < 0.2
    assert (abs(motif.idx_a - 20) <= 2 and abs(motif.idx_b - 120) <= 2) or (
        abs(motif.idx_b - 20) <= 2 and abs(motif.idx_a - 120) <= 2
    )


def test_recurrence_matrix():
    vals = np.sin(np.linspace(0, 4 * np.pi, 100))
    res = compute_recurrence_matrix(vals)
    assert res.recurrence_matrix.shape == (100, 100)
    assert res.recurrence_rate > 0.0

