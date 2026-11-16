"""
Generate Statistical Power Curves for SYNAPSE Periodicity Detector.
Computes empirical detection probability as a function of Signal-to-Noise Ratio (SNR)
with 95% Wilson score confidence intervals and outputs structured JSON and an SVG plot to docs/validation/.
"""

import os
import sys
import json
import numpy as np
import scipy.stats as stats
import scipy.fft as sfft

sys.path.insert(0, os.path.abspath("packages"))
from synapse_spectra.multitaper import compute_multitaper_psd


def wilson_score_interval(successes: int, trials: int, confidence: float = 0.95):
    if trials == 0:
        return 0.0, 0.0
    z = stats.norm.ppf((1.0 + confidence) / 2.0)
    p_hat = successes / trials
    denominator = 1.0 + (z ** 2) / trials
    centre = (p_hat + (z ** 2) / (2.0 * trials)) / denominator
    half_width = (z * np.sqrt((p_hat * (1.0 - p_hat) + (z ** 2) / (4.0 * trials)) / trials)) / denominator
    return max(0.0, float(centre - half_width)), min(1.0, float(centre + half_width))


def generate_power_curve():
    os.makedirs("docs/validation", exist_ok=True)
    rng = np.random.default_rng(20261116)

    snr_db_levels = np.array([-16.0, -12.0, -8.0, -4.0, -2.0, 0.0, 2.0, 4.0, 6.0, 8.0, 10.0])
    n_trials_per_level = 100
    n_samples = 1500
    fs = 200.0
    true_f0 = 12.37
    alpha = 0.01

    t = np.arange(n_samples) / fs
    detection_probabilities = []
    ci_lowers = []
    ci_uppers = []

    for snr_db in snr_db_levels:
        snr_linear = 10.0 ** (snr_db / 10.0)
        # Signal amplitude: A = sqrt(2 * SNR * sigma^2) with sigma^2 = 1.0
        amp = np.sqrt(2.0 * snr_linear)

        detections = 0
        for _ in range(n_trials_per_level):
            phase = rng.uniform(0.0, 2.0 * np.pi)
            noise = rng.normal(0.0, 1.0, size=n_samples)
            signal = amp * np.cos(2.0 * np.pi * true_f0 * t + phase) + noise

            # Run Thomson multitaper harmonic F-test
            res = compute_multitaper_psd(signal, sampling_rate=fs, nw=3.5, alpha=alpha)
            # Check if true_f0 (within 1.0 Hz) was detected among significant line frequencies
            detected = any(abs(f - true_f0) <= 1.0 for f in res.line_frequencies_detected)
            if detected:
                detections += 1

        prob = detections / float(n_trials_per_level)
        c_low, c_high = wilson_score_interval(detections, n_trials_per_level, 0.95)
        detection_probabilities.append(prob)
        ci_lowers.append(c_low)
        ci_uppers.append(c_high)

    results = {
        "snr_db_levels": snr_db_levels.tolist(),
        "detection_probabilities": detection_probabilities,
        "ci_lower_95": ci_lowers,
        "ci_upper_95": ci_uppers,
        "n_trials_per_level": n_trials_per_level,
        "sample_size": n_samples,
        "sampling_rate_hz": fs,
        "alpha_significance": alpha,
        "target_frequency_hz": true_f0,
    }

    # Save JSON data
    with open("docs/validation/power_curve_data.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    # Generate vector SVG plot
    w, h = 680, 380
    pad_l, pad_r, pad_t, pad_b = 65, 45, 45, 55
    pw = w - pad_l - pad_r
    ph = h - pad_t - pad_b

    x_min, x_max = snr_db_levels[0], snr_db_levels[-1]
    y_min, y_max = 0.0, 1.0

    def sx(x):
        return pad_l + ((x - x_min) / (x_max - x_min)) * pw

    def sy(y):
        return pad_t + ph - ((y - y_min) / (y_max - y_min)) * ph

    # Build CI ribbon path
    ribbon_fwd = "".join(f"{'M' if i == 0 else 'L'}{sx(x):.1f},{sy(y):.1f} " for i, (x, y) in enumerate(zip(snr_db_levels, ci_uppers)))
    ribbon_rev = "".join(f"L{sx(x):.1f},{sy(y):.1f} " for x, y in reversed(list(zip(snr_db_levels, ci_lowers))))
    ribbon_path = ribbon_fwd + ribbon_rev + "Z"

    # Build line path
    d_path = ""
    for idx, (x_val, y_val) in enumerate(zip(snr_db_levels, detection_probabilities)):
        px, py = sx(x_val), sy(y_val)
        d_path += f"{'M' if idx == 0 else 'L'}{px:.1f},{py:.1f} "

    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" style="background:#ffffff; font-family:'JetBrains Mono', Consolas, sans-serif;">
  <text x="{w/2}" y="24" text-anchor="middle" font-size="14" font-weight="bold" fill="#0f766e">SYNAPSE Periodicity Detector Power Curve (f0 = {true_f0} Hz, N = {n_samples})</text>
  <text x="{w/2}" y="{h - 14}" text-anchor="middle" font-size="11" fill="#475569">Signal-to-Noise Ratio (SNR) [dB]</text>
  <text x="18" y="{h/2}" transform="rotate(-90, 18, {h/2})" text-anchor="middle" font-size="11" fill="#475569">Detection Probability P(Detection)</text>
  
  <!-- Grid -->
  <g stroke="#e2e8f0" stroke-width="1">
    {"".join(f'<line x1="{sx(x):.1f}" y1="{pad_t}" x2="{sx(x):.1f}" y2="{pad_t + ph}" />' for x in snr_db_levels)}
    {"".join(f'<line x1="{pad_l}" y1="{sy(y):.1f}" x2="{pad_l + pw}" y2="{sy(y):.1f}" />' for y in [0.0, 0.25, 0.5, 0.75, 1.0])}
  </g>

  <!-- 95% Confidence Interval Ribbon -->
  <path d="{ribbon_path}" fill="#0f766e" fill-opacity="0.15" />
  
  <!-- Nominal Alpha Line -->
  <line x1="{pad_l}" y1="{sy(alpha):.1f}" x2="{pad_l + pw}" y2="{sy(alpha):.1f}" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4,4" />
  <text x="{pad_l + pw - 6}" y="{sy(alpha) - 6:.1f}" text-anchor="end" font-size="10" fill="#dc2626">Nominal Alpha = {alpha}</text>

  <!-- Power Curve -->
  <path d="{d_path}" fill="none" stroke="#0f766e" stroke-width="2.5" />
  {"".join(f'<circle cx="{sx(x):.1f}" cy="{sy(y):.1f}" r="4" fill="#0f766e" />' for x, y in zip(snr_db_levels, detection_probabilities))}
  
  <!-- Axis Ticks -->
  <g font-size="10" fill="#64748b" text-anchor="middle">
    {"".join(f'<text x="{sx(x):.1f}" y="{pad_t + ph + 18}">{int(x) if x == int(x) else x} dB</text>' for x in snr_db_levels)}
    {"".join(f'<text x="{pad_l - 10}" y="{sy(y) + 4:.1f}" text-anchor="end">{y:.2f}</text>' for y in [0.0, 0.25, 0.5, 0.75, 1.0])}
  </g>
</svg>"""

    for out_name in ["docs/validation/periodicity_power_curve.svg", "docs/validation/power_curve.svg"]:
        with open(out_name, "w", encoding="utf-8") as f:
            f.write(svg_content)

    print("Power curve generated successfully.")


if __name__ == "__main__":
    generate_power_curve()
