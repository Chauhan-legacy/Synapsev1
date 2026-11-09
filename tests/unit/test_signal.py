import pytest
import numpy as np

from synapse_core.models.signal import Signal, ChannelInfo
from synapse_core.exceptions import ValidationError, IncompatibleSamplingError


def test_signal_immutability():
    values = np.array([1.0, 2.0, 3.0, 4.0])
    timestamps = np.array([0.0, 0.1, 0.2, 0.3])
    sig = Signal(values=values, timestamps=timestamps)

    assert sig.n_samples == 4
    assert sig.n_channels == 1
    assert sig.is_uniform is True
    assert pytest.approx(sig.sampling_rate, rel=1e-3) == 10.0

    # Attempting to mutate values must raise ValueError
    with pytest.raises(ValueError):
        sig.values[0, 0] = 999.0

    with pytest.raises(ValueError):
        sig.timestamps[0] = 999.0


def test_signal_irregular_timestamps_rejected_by_uniform():
    # Irregular timestamps
    ts = np.array([0.0, 0.1, 0.25, 0.32, 0.5])
    vals = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    sig = Signal(values=vals, timestamps=ts, uniformity_tolerance=1e-4)

    assert sig.is_uniform is False
    assert sig.sampling_rate is None

    # Strict algorithm requirement should raise IncompatibleSamplingError
    with pytest.raises(IncompatibleSamplingError) as exc_info:
        sig.require_uniform_sampling("TestAlgorithm")

    assert "TestAlgorithm strictly requires uniform sampling" in str(exc_info.value)


def test_signal_quality_profiling():
    ts = np.linspace(0, 1, 100)
    # Channel 0: valid, Channel 1: constant, Channel 2: contains NaN
    c0 = np.sin(2 * np.pi * 5 * ts)
    c1 = np.ones(100) * 42.0
    c2 = np.copy(c0)
    c2[10] = np.nan

    vals = np.column_stack([c0, c1, c2])
    sig = Signal(values=vals, timestamps=ts)

    quality = sig.quality
    assert quality.total_samples == 100
    assert quality.channel_count == 3
    assert quality.channel_quality[1].is_constant is True
    assert quality.channel_quality[2].nan_count == 1
    assert len(quality.content_hash_sha256) == 64

