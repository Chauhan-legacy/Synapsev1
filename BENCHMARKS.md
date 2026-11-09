# SYNAPSE Validation Suite (SVS) & Benchmarks

## 1. Controlled Benchmark: The Hidden Signal Challenge

The Hidden Signal Challenge (`benchmarks/hidden_signal_challenge.py`) evaluates whether SYNAPSE can recover physical structures without tuning or overfitting to known parameters.

### Planted Physical Ground Truth
| Phenomenon | Planted Parameters | Ground Truth Location | Recovery Status | Discovered Metric |
|---|---|---|---|---|
| **Stationary Tone 1** | $A = 1.5$, $f = 5.0\text{ Hz}$ | Full duration ($t = 0..4\text{s}$) | **RECOVERED** | $5.00\text{ Hz}$ ($\Delta f = 0.00\text{ Hz}$, SNR = $19.97\text{ dB}$) |
| **Stationary Tone 2** | $A = 1.0$, $f = 14.0\text{ Hz}$ | Full duration ($t = 0..4\text{s}$) | **RECOVERED** | $14.00\text{ Hz}$ ($\Delta f = 0.00\text{ Hz}$, SNR = $13.17\text{ dB}$) |
| **Stationary Tone 3** | $A = 0.8$, $f = 35.0\text{ Hz}$ | Full duration ($t = 0..4\text{s}$) | **RECOVERED** | $35.00\text{ Hz}$ ($\Delta f = 0.00\text{ Hz}$, SNR = $24.90\text{ dB}$) |
| **Transient Burst** | Gaussian impulse ($A = 5.5$) | Planted at $t = 1.25\text{s}$ | **RECOVERED** | Outlier burst interval identified ($z > +4.8$) |
| **Regime Shift** | Mean shift ($+1.8$) + variance doubling | Planted at $t = 2.60\text{s}$ | **RECOVERED** | Change-point detected via CUSUM deviation |

---

## 2. Test Execution Summary

22 unit, integration, and mathematical regression tests executed against the pure scientific core:

```text
tests/integration/test_pipeline_and_benchmark.py::test_discovery_pipeline_end_to_end PASSED
tests/integration/test_pipeline_and_benchmark.py::test_hidden_signal_challenge_benchmark PASSED
tests/unit/test_anomaly.py::test_robust_zscore_transient_detection PASSED
tests/unit/test_anomaly.py::test_changepoint_detection PASSED
tests/unit/test_anomaly.py::test_isolation_forest PASSED
tests/unit/test_inference.py::test_ft_surrogates PASSED
tests/unit/test_inference.py::test_benjamini_hochberg PASSED
tests/unit/test_inference.py::test_bootstrap_ci PASSED
tests/unit/test_relation.py::test_multichannel_correlations PASSED
tests/unit/test_relation.py::test_cross_correlation_time_lag PASSED
tests/unit/test_relation.py::test_pca PASSED
tests/unit/test_signal.py::test_signal_immutability PASSED
tests/unit/test_signal.py::test_signal_irregular_timestamps_rejected_by_uniform PASSED
tests/unit/test_signal.py::test_signal_quality_profiling PASSED
tests/unit/test_spectra.py::test_fft_pure_sinusoid_recovery PASSED
tests/unit/test_spectra.py::test_ifft_roundtrip_reconstruction PASSED
tests/unit/test_spectra.py::test_welch_psd_power_conservation PASSED
tests/unit/test_spectra.py::test_stft_and_cwt PASSED
tests/unit/test_spectra.py::test_spectral_entropy PASSED
tests/unit/test_structure.py::test_autocorrelation_period_recovery PASSED
tests/unit/test_structure.py::test_motif_discovery PASSED
tests/unit/test_structure.py::test_recurrence_matrix PASSED

============================= 22 passed in 5.97s ==============================
```

