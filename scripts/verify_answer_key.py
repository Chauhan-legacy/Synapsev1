"""
verify_answer_key.py — Run live SYNAPSE pipeline on messy_test_dataset.csv
and verify agreement between code, data, and answer key.
"""

import sys
import json
from pathlib import Path
import numpy as np
import pandas as pd

_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT / "packages"))
sys.path.insert(0, str(_ROOT))

from synapse_spectra.multitaper import compute_multitaper_psd
from synapse_spectra.psd import compute_welch_psd
from synapse_anomaly.pelt import detect_pelt_changepoints
from synapse_anomaly.rosner_esd import generalized_esd_test
from synapse_relation.granger import compute_granger_causality
from synapse_relation.coherence import compute_spectral_coherence
from synapse_statistics.stationarity import evaluate_stationarity
from synapse_structure.entropy import compute_sample_entropy, compute_permutation_entropy


def verify():
    csv_path = _ROOT / "data" / "messy_test_dataset.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"Missing dataset: {csv_path}")

    df = pd.read_csv(csv_path)
    t = df["timestamp"].values
    x = df["sensor_lead_x"].values
    y = df["sensor_lead_y"].values
    z = df["control_null_z"].values
    fs = 200.0
    dt = 1.0 / fs
    n = len(x)

    print("=== SYNAPSE ANSWER KEY LIVE VERIFICATION ===\n")
    results = {}
    checks = []

    # 1. Periodic Spectra (Multitaper) on Channel X
    mt_x = compute_multitaper_psd(x, sampling_rate=fs, nw=3.5, alpha=0.01, fdr_control=True)
    detected_tones = sorted([float(f) for f in mt_x.line_frequencies_detected])
    has_15 = any(abs(f - 15.0) <= 0.5 for f in detected_tones)
    has_36 = any(abs(f - 36.5) <= 0.5 for f in detected_tones)
    passed_tones = has_15 and has_36
    checks.append(("Spectral Harmonic Lines", passed_tones, f"Found {detected_tones} (expected [15.0, 36.5])"))
    results["spectral_tones"] = {"detected_hz": detected_tones, "passed": passed_tones}

    # 2. Null Channel (control_null_z)
    mt_z = compute_multitaper_psd(z, sampling_rate=fs, nw=3.5, alpha=0.01, fdr_control=True)
    z_tones = list(mt_z.line_frequencies_detected)
    z_esd = generalized_esd_test(z, max_outliers=5, alpha=0.05)
    z_pelt = detect_pelt_changepoints(z, penalty=80.0, min_size=50)
    passed_null = len(z_tones) == 0 and z_esd.n_outliers_detected == 0 and len(z_pelt.changepoints) == 0
    checks.append(("Null Control Discoveries", passed_null, f"Tones: {z_tones}, Spikes: {z_esd.n_outliers_detected}, CPs: {z_pelt.changepoints}"))
    results["null_control"] = {
        "tones_count": len(z_tones),
        "spikes_count": z_esd.n_outliers_detected,
        "changepoints_count": len(z_pelt.changepoints),
        "passed": passed_null,
    }

    # 3. Robust detrending & harmonic filtering for Anomaly Lab
    from scipy.ndimage import gaussian_filter1d
    from sklearn.linear_model import HuberRegressor

    smoothed = gaussian_filter1d(x, sigma=max(5, int(fs * 0.25)))
    diff_s = np.diff(smoothed)
    t_mid = (t[:-1] + t[1:]) / 2.0
    huber = HuberRegressor().fit(t_mid.reshape(-1, 1), diff_s)
    a_est = (huber.coef_[0] / dt) / 2.0
    b_est = huber.intercept_ / dt
    drift = a_est * (t ** 2) + b_est * t
    x_detrended = x - drift

    M_harm = []
    for f in detected_tones:
        M_harm.append(np.cos(2 * np.pi * f * t))
        M_harm.append(np.sin(2 * np.pi * f * t))
    if M_harm:
        harm_fit = HuberRegressor().fit(np.column_stack(M_harm), x_detrended)
        x_residual = x_detrended - harm_fit.predict(np.column_stack(M_harm))
    else:
        x_residual = x_detrended.copy()

    # 4. PELT Changepoints
    pelt_res = detect_pelt_changepoints(x_detrended, penalty=80.0, min_size=50)
    cps = list(pelt_res.changepoints)
    passed_pelt = (len(cps) == 1) and (abs(cps[0] - 1200) <= 5)
    checks.append(("PELT Structural Shift", passed_pelt, f"Found {cps} at t={[round(t[c],3) for c in cps]}s (expected [1200])"))
    results["pelt_changepoints"] = {"indices": cps, "timestamps": [float(round(t[c], 3)) for c in cps], "passed": passed_pelt}

    # 5. Regime Rosner ESD Outliers
    all_outliers = []
    bounds = [0] + cps + [n]
    for r in range(len(bounds) - 1):
        s_idx, e_idx = bounds[r], bounds[r + 1]
        seg = x_residual[s_idx:e_idx]
        esd_sub = generalized_esd_test(seg, max_outliers=5, alpha=0.05)
        for idx in esd_sub.outlier_indices:
            all_outliers.append(s_idx + idx)
    all_outliers = sorted(all_outliers)
    has_500 = any(abs(idx - 500) <= 1 for idx in all_outliers)
    has_1800 = any(abs(idx - 1800) <= 1 for idx in all_outliers)
    passed_spikes = has_500 and has_1800 and (len(all_outliers) == 2)
    checks.append(("Rosner ESD Spikes", passed_spikes, f"Found indices {all_outliers} (expected [500, 1800])"))
    results["rosner_spikes"] = {"indices": all_outliers, "passed": passed_spikes}

    # 6. Granger Causality & Coherence
    smoothed_y = gaussian_filter1d(y, sigma=max(5, int(fs * 0.25)))
    diff_sy = np.diff(smoothed_y)
    huber_y = HuberRegressor().fit(t_mid.reshape(-1, 1), diff_sy)
    drift_y = (huber_y.coef_[0] / dt / 2.0) * (t ** 2) + (huber_y.intercept_ / dt) * t
    y_detrended = y - drift_y

    gc = compute_granger_causality(x_detrended, y_detrended, max_lag=4)
    p_adj_xy = min(1.0, gc.x_causes_y.p_value * 2.0)
    p_adj_yx = min(1.0, gc.y_causes_x.p_value * 2.0)
    passed_granger = gc.x_causes_y.is_significant and (gc.x_causes_y.f_statistic > 500.0)
    checks.append(("Granger Causality (X->Y)", passed_granger, f"X->Y: F={gc.x_causes_y.f_statistic:.1f} (p_adj={p_adj_xy:.2e}), Y->X: F={gc.y_causes_x.f_statistic:.1f}"))
    results["granger_causality"] = {
        "x_to_y": {"f_stat": round(gc.x_causes_y.f_statistic, 2), "p_adj": float(p_adj_xy), "significant": bool(p_adj_xy < 0.05)},
        "y_to_x": {"f_stat": round(gc.y_causes_x.f_statistic, 2), "p_adj": float(p_adj_yx), "significant": bool(p_adj_yx < 0.05)},
        "passed": passed_granger,
    }

    # 7. Coherence
    coh = compute_spectral_coherence(x, y, sampling_rate=fs, n_perseg=256)
    passed_coh = abs(coh.peak_frequency_hz - 15.0) <= 0.5 and (coh.peak_coherence > coh.significance_threshold_95)
    checks.append(("Spectral Coherence (15 Hz)", passed_coh, f"Peak {coh.peak_frequency_hz:.2f} Hz, Coh={coh.peak_coherence:.3f}"))
    results["coherence"] = {
        "peak_frequency_hz": round(float(coh.peak_frequency_hz), 2),
        "peak_coherence": round(float(coh.peak_coherence), 3),
        "passed": passed_coh,
    }

    # 8. Stationarity & Entropy
    stat_x = evaluate_stationarity(x)
    samp_x = float(compute_sample_entropy(x, m=2, r_factor=0.20))
    perm_x = float(compute_permutation_entropy(x, order_d=4))
    samp_z = float(compute_sample_entropy(z, m=2, r_factor=0.20))
    perm_z = float(compute_permutation_entropy(z, order_d=4))
    passed_stat = stat_x.kpss_p_value < 0.05
    checks.append(("Stationarity Diagnostic", passed_stat, f"KPSS p={stat_x.kpss_p_value:.4f} (Non-stationary verdict)"))
    results["stationarity"] = {"adf_p": round(float(stat_x.adf_p_value), 4), "kpss_p": round(float(stat_x.kpss_p_value), 4), "passed": passed_stat}
    results["entropy"] = {
        "channel_x": {"samp_en": round(samp_x, 3), "perm_en": round(perm_x, 3)},
        "channel_z": {"samp_en": round(samp_z, 3), "perm_en": round(perm_z, 3)},
    }

    # Print Table
    print(f"{'CHECK ITEM':<30} | {'STATUS':<8} | {'DETAILS'}")
    print("-" * 80)
    all_passed = True
    for name, status, details in checks:
        status_str = "PASS" if status else "FAIL"
        if not status:
            all_passed = False
        print(f"{name:<30} | {status_str:<8} | {details}")

    # Write JSON results
    out_json = _ROOT / "data" / "messy_answer_key_results.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nWritten verified results to: {out_json}")

    return all_passed


if __name__ == "__main__":
    success = verify()
    sys.exit(0 if success else 1)
