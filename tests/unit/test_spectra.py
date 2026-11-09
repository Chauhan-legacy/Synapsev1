import pytest
import numpy as np

from synapse_spectra.fft import compute_fft, compute_ifft
from synapse_spectra.psd import compute_welch_psd
from synapse_spectra.stft import compute_stft
from synapse_spectra.cwt import compute_cwt
from synapse_spectra.peaks import detect_spectral_peaks, detect_harmonic_series
from synapse_spectra.entropy import compute_spectral_entropy


def test_fft_pure_sinusoid_recovery():
    fs = 1000.0
    duration = 1.0
    n = int(fs * duration)
    t = np.arange(n) / fs
    f0 = 50.0
    amp = 2.5
    signal = amp * np.sin(2 * np.pi * f0 * t)

    res = compute_fft(signal, sampling_rate=fs, window_type="flattop", detrend=False)

    # Find peak frequency bin
    peak_idx = int(np.argmax(res.amplitudes))
    recovered_f = res.frequencies[peak_idx]
    recovered_amp = res.amplitudes[peak_idx]

    # Verify Parseval's energy conservation
    assert res.parseval_relative_error < 1e-10

    # Flat-top window ensures exact amplitude recovery
    assert pytest.approx(recovered_f, abs=1.0) == f0
    assert pytest.approx(recovered_amp, rel=0.05) == amp


def test_ifft_roundtrip_reconstruction():
    fs = 500.0
    t = np.linspace(0, 1, 500, endpoint=False)
    orig = np.sin(2 * np.pi * 10 * t) + 0.5 * np.cos(2 * np.pi * 30 * t)

    res = compute_fft(orig, sampling_rate=fs, window_type="boxcar", detrend=False)
    recon = compute_ifft(res.complex_spectrum, n_samples=len(orig))

    max_diff = np.max(np.abs(orig - recon))
    assert max_diff < 1e-12


def test_welch_psd_power_conservation():
    fs = 200.0
    t = np.arange(400) / fs
    sig = 2.0 * np.sin(2 * np.pi * 20 * t)
    welch = compute_welch_psd(sig, sampling_rate=fs, window_type="hann")

    # True variance of sine with amplitude A=2 is A^2 / 2 = 2.0
    expected_var = 2.0
    assert pytest.approx(welch.total_power, rel=0.15) == expected_var


def test_stft_and_cwt():
    fs = 200.0
    sig = np.random.randn(200)

    stft_res = compute_stft(sig, sampling_rate=fs)
    assert stft_res.spectrogram_power.ndim == 2
    assert len(stft_res.times) > 0

    cwt_res = compute_cwt(sig, sampling_rate=fs, n_scales=16)
    assert cwt_res.scalogram_power.shape == (16, 200)


def test_spectral_entropy():
    # Pure sinusoid should have low entropy
    t = np.linspace(0, 1, 500)
    pure = np.sin(2 * np.pi * 10 * t)
    res_pure = compute_fft(pure, sampling_rate=500.0, window_type="hann")
    ent_pure = compute_spectral_entropy(res_pure.power)

    # White noise should have high entropy
    noise = np.random.randn(500)
    res_noise = compute_fft(noise, sampling_rate=500.0, window_type="hann")
    ent_noise = compute_spectral_entropy(res_noise.power)

    assert ent_pure < 0.2
    assert ent_noise > 0.8

