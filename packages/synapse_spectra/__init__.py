from synapse_spectra.engine import SpectraEngine
from synapse_spectra.fft import compute_fft, compute_ifft, FFTResult
from synapse_spectra.psd import compute_welch_psd, WelchResult
from synapse_spectra.stft import compute_stft, STFTResult
from synapse_spectra.cwt import compute_cwt, CWTResult
from synapse_spectra.peaks import detect_spectral_peaks, DetectedPeak, HarmonicSeries
from synapse_spectra.entropy import compute_spectral_entropy
from synapse_spectra.windows import get_window, WindowProperties
from synapse_spectra.multitaper import compute_multitaper_psd, MultitaperResult
from synapse_spectra.lomb_scargle import compute_lomb_scargle, LombScargleResult
from synapse_spectra.high_res_peaks import fit_high_res_sinusoid, HighResPeakResult
from synapse_spectra.noise_color import estimate_noise_color, NoiseColorResult
from synapse_spectra.burg_ar import compute_burg_spectrum, BurgSpectralResult
from synapse_spectra.allan_deviation import compute_allan_deviation, AllanDeviationResult
from synapse_spectra.harmonic_analysis import analyze_harmonic_series, HarmonicAnalysisResult
from synapse_spectra.hilbert_analysis import compute_hilbert_analytic, HilbertResult
from synapse_spectra.ridge_extraction import extract_spectral_ridge, RidgeExtractionResult

__all__ = [
    "SpectraEngine",
    "compute_fft",
    "compute_ifft",
    "compute_welch_psd",
    "compute_stft",
    "compute_cwt",
    "detect_spectral_peaks",
    "compute_spectral_entropy",
    "get_window",
    "WindowProperties",
    "FFTResult",
    "WelchResult",
    "STFTResult",
    "CWTResult",
    "DetectedPeak",
    "HarmonicSeries",
    "compute_multitaper_psd",
    "MultitaperResult",
    "compute_lomb_scargle",
    "LombScargleResult",
    "fit_high_res_sinusoid",
    "HighResPeakResult",
    "estimate_noise_color",
    "NoiseColorResult",
    "compute_burg_spectrum",
    "BurgSpectralResult",
    "compute_allan_deviation",
    "AllanDeviationResult",
    "analyze_harmonic_series",
    "HarmonicAnalysisResult",
    "compute_hilbert_analytic",
    "HilbertResult",
    "extract_spectral_ridge",
    "RidgeExtractionResult",
]
