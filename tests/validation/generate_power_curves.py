"""
Generate Statistical Power Curves for SYNAPSE Periodicity Detector.
Computes empirical detection probability as a function of Signal-to-Noise Ratio (SNR)
and outputs structured JSON and an SVG plot to docs/validation/.
"""

import os
import json
import numpy as np
import scipy.stats as stats
import scipy.fft as sfft

from synapse_spectra.multitaper import compute_multitaper_psd


def generate_power_curve():
    os.makedirs("docs/validation", exist_ok=True)
    rng = np.random.default_rng(42)

    snr_db_levels = np.array([-20.0, -16.0, -12.0, -8.0, -4.0, 0.0, 4.0, 8.0, 12.0])
    n_trials_per_level = 100
    n_samples = 256
    fs = 100.0
    true_f0 = 15.0
    alpha = 0.01

    t = np.arange(n_samples) / fs
    detection_probabilities = []

    for snr_db in snr_db_levels:
        snr_linear = 10.0 ** (snr_db / 10.0)
        # Signal amplitude: A = sqrt(2 * SNR * sigma^2) with sigma^2 = 1.0
        amp = np.sqrt(2.0 * snr_linear)

        detections = 0
        for _ in range(n_trials_per_level):
            noise = rng.normal(0.0, 1.0, size=n_samples)
            signal = amp * np.cos(2.0 * np.pi * true_f0 * t) + noise

            # Run multitaper harmonic F-test
            res = compute_multitaper_psd(signal, sampling_rate=fs, nw=3.0, alpha=alpha)
            # Check if true_f0 (within 1.5 Hz) was detected among significant line frequencies
            detected = any(abs(f - true_f0) <= 1.5 for f in res.line_frequencies_detected)
            if detected:
                detections += 1

        prob = detections / float(n_trials_per_level)
        detection_probabilities.append(prob)

    results = {
        "snr_db_levels": snr_db_levels.tolist(),
        "detection_probabilities": detection_probabilities,
        "n_trials_per_level": n_trials_per_level,
        "sample_size": n_samples,
        "alpha_significance": alpha,
        "target_frequency_hz": true_f0,
    }

    # Save JSON data
    with open("docs/validation/power_curve_data.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    # Generate vector SVG plot
    w, h = 640, 360
    pad_l, pad_r, pad_t, pad_b = 60, 40, 40, 50
    pw = w - pad_l - pad_r
    ph = h - pad_t - pad_b

    x_min, x_max = snr_db_levels[0], snr_db_levels[-1]
    y_min, y_max = 0.0, 1.0

    def sx(x):
        return pad_l + ((x - x_min) / (x_max - x_min)) * pw

    def sy(y):
        return pad_t + ph - ((y - y_min) / (y_max - y_min)) * ph

    # Build path
    d_path = ""
    for idx, (x_val, y_val) in enumerate(zip(snr_db_levels, detection_probabilities)):
        px, py = sx(x_val), sy(y_val)
        d_path += f"{'M' if idx == 0 else 'L'}{px:.1f},{py:.1f} "

    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" style="background:#ffffff; font-family:sans-serif;">
  <text x="{w/2}" y="24" text-anchor="middle" font-size="14" font-weight="bold" fill="#0f172a">SYNAPSE Periodicity Detector Power Curve</text>
  <text x="{w/2}" y="{h - 12}" text-anchor="middle" font-size="11" fill="#475569">Signal-to-Noise Ratio (SNR) [dB]</text>
  <text x="16" y="{h/2}" transform="rotate(-90, 16, {h/2})" text-anchor="middle" font-size="11" fill="#475569">Detection Probability P(Detection)</text>
  
  <!-- Grid -->
  <g stroke="#e2e8f0" stroke-width="1">
    {"".join(f'<line x1="{sx(x):.1f}" y1="{pad_t}" x2="{sx(x):.1f}" y2="{pad_t + ph}" />' for x in snr_db_levels)}
    {"".join(f'<line x1="{pad_l}" y1="{sy(y):.1f}" x2="{pad_l + pw}" y2="{sy(y):.1f}" />' for y in [0.0, 0.25, 0.5, 0.75, 1.0])}
  </g>
  
  <!-- Nominal Alpha Line -->
  <line x1="{pad_l}" y1="{sy(alpha):.1f}" x2="{pad_l + pw}" y2="{sy(alpha):.1f}" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4,4" />
  <text x="{pad_l + pw - 4}" y="{sy(alpha) - 4:.1f}" text-anchor="end" font-size="10" fill="#dc2626">Nominal Alpha = {alpha}</text>

  <!-- Power Curve -->
  <path d="{d_path}" fill="none" stroke="#2563eb" stroke-width="2.5" />
  {"".join(f'<circle cx="{sx(x):.1f}" cy="{sy(y):.1f}" r="4" fill="#2563eb" />' for x, y in zip(snr_db_levels, detection_probabilities))}
  
  <!-- Axis Ticks -->
  <g font-size="10" fill="#64748b" text-anchor="middle">
    {"".join(f'<text x="{sx(x):.1f}" y="{pad_t + ph + 16}">{int(x)} dB</text>' for x in snr_db_levels)}
    {"".join(f'<text x="{pad_l - 8}" y="{sy(y) + 3:.1f}" text-anchor="end">{y:.2f}</text>' for y in [0.0, 0.25, 0.5, 0.75, 1.0])}
  </g>
</svg>"""

    with open("docs/validation/periodicity_power_curve.svg", "w", encoding="utf-8") as f:
        f.write(svg_content)

    print("Power curve generated successfully at docs/validation/periodicity_power_curve.svg")


if __name__ == "__main__":
    generate_power_curve()

