#!/usr/bin/env python3
"""SYNAPSE synthetic benchmark generator. ALL DATA IS SYNTHETIC.
Usage: python generate_benchmark.py [output_dir]
"""
import os, sys, json, shutil
import numpy as np, pandas as pd
from scipy import signal as sps, stats

OUT = sys.argv[1] if len(sys.argv) > 1 else "SYNAPSE_BENCHMARK_DATA"
SEEDS = dict(zip("ABCDEFGHIJ", range(1001, 1011)))
SYN = ("SYNTHETIC DATA - produced by a mathematical model with a fixed random seed. "
       "It is NOT a real astronomical, medical, seismic or experimental observation.")
PI2 = 2 * np.pi
AUX = {}


def rng(k): return np.random.default_rng(SEEDS[k])


def ar1u(r, n, phi):
    """Unit-variance AR(1) process x[t]=phi*x[t-1]+e[t] (500-sample burn-in discarded)."""
    e = r.normal(0, 1, n + 500)
    return sps.lfilter([1.0], [1.0, -phi], e)[500:] * np.sqrt(1 - phi ** 2)


def snr_db(clean, noise): return float(10 * np.log10(np.mean(clean ** 2) / np.mean(noise ** 2)))


def M(k, title, fs, n, channels, noise_model, noise_params, components, extra=None, uniform=True,
      sig_unit="arbitrary units (a.u.)"):
    d = dict(dataset=k, title=title, synthetic=True, synthetic_notice=SYN, generation_seed=SEEDS[k],
             rng="numpy.random.default_rng (PCG64)", sampling_rate_hz=fs,
             nyquist_hz=(fs / 2 if fs else None), frequency_resolution_hz=(fs / n if fs else None),
             timestamp_unit="seconds from start of record", signal_unit=sig_unit,
             channel_names=channels, observation_count=n, duration_seconds=(n / fs if fs else None),
             noise_model=noise_model, noise_parameters=noise_params, signal_components=components,
             uniform_sampling=uniform, value_precision="float64, written with 17 significant digits",
             ground_truth_in_data_file=False,
             index_convention="indices are 0-based data-row numbers (header excluded); CSV line number = index + 2",
             sinusoid_convention="x(t) = sum A_i sin(2*pi*f_i*t + phi_i); phase in radians",
             snr_definition="SNR_dB = 10*log10( mean(clean_signal^2) / mean(noise^2) ) using the realised arrays")
    d.update(extra or {})
    return d


def comp(f, a, ph, note=""): return dict(frequency_hz=f, amplitude=a, phase_rad=ph, note=note)


def tcol(n, fs): return np.round(np.arange(n) / fs, 9)


# ------------------------------------------------------------------ A
def gen_A():
    k = 'A'; r = rng(k); fs = 2.0; n = 20000; t = np.arange(n) / fs
    cs = [comp(0.0703, 1.5, 0.6, "fundamental 1"), comp(0.1907, 1.0, 2.1, "fundamental 2"),
          comp(0.4311, 0.6, -1.0, "fundamental 3"),
          comp(0.3814, 0.4, 0.3, "2nd harmonic of 0.1907 Hz"), comp(0.5721, 0.2, -2.4, "3rd harmonic of 0.1907 Hz")]
    clean = sum(c['amplitude'] * np.sin(PI2 * c['frequency_hz'] * t + c['phase_rad']) for c in cs)
    w = r.normal(0, 0.5, n); col = ar1u(r, n, 0.9) * 0.229
    noise = w + col; x = clean + noise; s = snr_db(clean, noise)
    df = pd.DataFrame(dict(timestamp=tcol(n, fs), signal=x))
    truth = dict(dataset=k, synthetic=True, expected_spectral_peaks=cs, number_of_peaks=len(cs),
                 sampling_rate_hz=fs, nyquist_hz=fs / 2, frequency_resolution_hz=fs / n, snr_db=s,
                 harmonic_relationships=[dict(fundamental_hz=0.1907, harmonic_orders=[2, 3], harmonic_hz=[0.3814, 0.5721])])
    meta = M(k, "Multi-frequency periodic signal", fs, n, ["signal"],
             "white Gaussian + AR(1) coloured", dict(white_sd=0.5, ar1_phi=0.9, ar1_marginal_sd=0.229), cs,
             dict(snr_db=s))
    AUX[k] = dict(clean=clean, noise=noise)
    return dict(df=df, ts=['timestamp'], tsf='%.6f', truth=truth, meta=meta, fs=fs, n=n)


# ------------------------------------------------------------------ B
def gen_B():
    k = 'B'; r = rng(k); fs = 10.0; n = 20000; t = np.arange(n) / fs
    f_base = np.where(t < 1000, 0.4 + 0.0012 * t, 3.0 - 0.0006 * (t - 1000))
    dev, fm = 0.10, 0.01
    f_inst = f_base + dev * np.cos(PI2 * fm * t)
    ph = PI2 / fs * np.concatenate([[0], np.cumsum(f_inst[:-1])]) + 0.4
    env = 1 + 0.4 * np.sin(PI2 * 0.005 * t + 0.7)
    clean = 2.0 * env * np.sin(ph)
    w = r.normal(0, 0.4, n); col = ar1u(r, n, 0.95) * 0.16
    noise = w + col; x = clean + noise; s = snr_db(clean, noise)
    df = pd.DataFrame(dict(timestamp=tcol(n, fs), signal=x))
    truth = dict(dataset=k, synthetic=True, model="x(t)=2.0*[1+0.4 sin(2pi*0.005 t+0.7)] * sin(theta(t)) + noise; theta(t)=2pi*integral f_inst + 0.4",
                 instantaneous_frequency_hz="f_inst(t)=f_base(t)+0.10*cos(2pi*0.01*t)",
                 f_base_hz=dict(segment_1="0.4 + 0.0012*t for t<1000 s (linear chirp 0.4->1.6 Hz)",
                                segment_2="3.0 - 0.0006*(t-1000) for t>=1000 s (downward chirp 3.0->2.4 Hz)"),
                 chirp_rates_hz_per_s=[0.0012, -0.0006], frequency_transition=dict(time_s=1000.0, index=10000, jump_hz=1.4, note="abrupt frequency jump, phase continuous"),
                 amplitude_modulation=dict(carrier_amplitude=2.0, depth=0.4, mod_freq_hz=0.005, mod_phase_rad=0.7),
                 frequency_modulation=dict(deviation_hz=dev, mod_freq_hz=fm, shape="cosine"),
                 inst_freq_samples=dict(index=list(range(0, n, 100)), frequency_hz=[float(v) for v in f_inst[::100]]),
                 snr_db=s, nyquist_hz=fs / 2, max_inst_freq_hz=float(f_inst.max()))
    meta = M(k, "Non-stationary chirp / AM / FM signal", fs, n, ["signal"], "white Gaussian + AR(1) coloured",
             dict(white_sd=0.4, ar1_phi=0.95, ar1_marginal_sd=0.16),
             [dict(type="chirp+AM+FM carrier", see="ground truth")], dict(snr_db=s))
    AUX[k] = dict(clean=clean, f_inst=f_inst)
    return dict(df=df, ts=['timestamp'], tsf='%.6f', truth=truth, meta=meta, fs=fs, n=n)


# ------------------------------------------------------------------ C
def gen_C():
    k = 'C'; r = rng(k); fs = 50.0; n = 20000
    base = r.normal(0, 1.0, n) + ar1u(r, n, 0.8) * 0.5
    x = base.copy(); ev = []

    def add(typ, s, e, mag, defn):
        ev.append(dict(event_id=len(ev) + 1, event_type=typ, start_index=int(s), end_index=int(e),
                       duration_samples=int(e - s + 1), duration_seconds=(e - s + 1) / fs,
                       start_time_s=s / fs, end_time_s=e / fs, magnitude=float(mag), magnitude_definition=defn))
    for i, m in zip([1200, 3050, 4400, 7700, 9300], [12, -10, 14, -11, 13]):
        x[i] += m; add('impulse', i, i, m, 'signed amplitude added to one sample')
    for s, L, a in [(2000, 80, 6), (5600, 120, 5), (11000, 100, 7)]:
        kk = np.arange(L); x[s:s + L] += a * np.exp(-kk / (L / 3)) * np.sin(PI2 * 5.0 * kk / fs)
        add('transient_burst', s, s + L - 1, a, 'peak amplitude of damped 5 Hz sinusoid, decay constant L/3 samples')
    for c, a in [(6200, 7), (10200, -6), (12500, 8)]:
        kk = np.arange(-12, 13); x[c - 12:c + 13] += a * np.exp(-0.5 * (kk / 4.0) ** 2)
        add('local_amplitude_spike', c - 12, c + 12, a, 'signed peak of Gaussian bump (sigma=4 samples) added')
    s, m, e = 13000, 14500, 16000
    dr = np.zeros(n); dr[s:m] = 2.5 * np.arange(m - s) / (m - s); dr[m:e] = 2.5 * (1 - np.arange(e - m) / (e - m))
    x += dr; add('gradual_baseline_drift', s, e - 1, 2.5, 'peak of triangular drift added to baseline (up over 1500 samples, back down over 1500)')
    x[16500:] += 3.0; add('persistent_level_shift', 16500, n - 1, 3.0, 'step added from start_index to end of record (persistent)')
    s, L = 17500, 2000; x[s:s + L] += r.normal(0, 2.5, L)
    add('unusually_long_anomaly', s, s + L - 1, 2.5, 'std dev of extra zero-mean Gaussian noise added (variance inflation)')
    df = pd.DataFrame(dict(timestamp=tcol(n, fs), signal=x))
    truth = dict(dataset=k, synthetic=True, events=ev, event_count=len(ev), baseline="white N(0,1) + AR(1)(phi=0.8, marginal sd 0.5)",
                 note="the persistent level shift (index 16500..19999) overlaps the long anomaly (17500..19499)")
    meta = M(k, "Anomaly-rich signal", fs, n, ["signal"], "white Gaussian + AR(1) coloured",
             dict(white_sd=1.0, ar1_phi=0.8, ar1_marginal_sd=0.5), [], dict(event_types=sorted({e['event_type'] for e in ev})))
    AUX[k] = dict(base=base)
    return dict(df=df, ts=['timestamp'], tsf='%.6f', truth=truth, meta=meta, fs=fs, n=n)


# ------------------------------------------------------------------ D
def gen_D():
    k = 'D'; r = rng(k); fs = 10.0; n = 20000; t = np.arange(n) / fs; i = np.arange(n)
    mean = np.zeros(n); mean[8000:11000] = 3.0
    q = np.arange(11000, 12000); mean[q] = 3.0 * (1 - (q - 11000) / 1000)
    sd = np.full(n, 0.5); sd[4000:7000] = 1.5
    q = np.arange(7000, 8000); sd[q] = 1.5 - 1.0 * (q - 7000) / 1000
    sd[16000:18000] = 1.0
    w = np.zeros(n); q = np.arange(12000, 13000); w[q] = (q - 12000) / 1000; w[13000:18000] = 1.0
    amp = np.ones(n); u = (i[16000:18000] - 16000) / 2000; amp[16000:18000] = 1.5 * np.exp(2.0 * u)
    tone = (1 - w) * np.sin(PI2 * 0.8 * t) + w * np.sin(PI2 * 1.9 * t + 0.5)
    nu = np.sqrt(0.64) * r.normal(0, 1, n) + np.sqrt(0.36) * ar1u(r, n, 0.9)
    clean = mean + amp * tone; noise = sd * nu; x = clean + noise
    df = pd.DataFrame(dict(timestamp=tcol(n, fs), signal=x))
    cps = [
        dict(id=1, index=4000, type='abrupt', property='noise standard deviation', before=0.5, after=1.5),
        dict(id=2, start_index=7000, end_index=7999, type='gradual', property='noise standard deviation', before=1.5, after=0.5, shape='linear ramp'),
        dict(id=3, index=8000, type='abrupt', property='mean level', before=0.0, after=3.0),
        dict(id=4, start_index=11000, end_index=11999, type='gradual', property='mean level', before=3.0, after=0.0, shape='linear ramp'),
        dict(id=5, start_index=12000, end_index=12999, type='gradual', property='frequency composition', before='0.8 Hz tone', after='1.9 Hz tone', shape='linear cross-fade of the two tones'),
        dict(id=6, index=16000, type='abrupt', property='onset of unstable regime (exponential amplitude growth, sd 0.5->1.0)', before='stationary 1.9 Hz', after='growing 1.9 Hz'),
        dict(id=7, index=18000, type='abrupt', property='collapse of unstable regime back to stationary initial regime', before='growing 1.9 Hz', after='0.8 Hz, sd 0.5')]
    regimes = [dict(name='R1 initial stationary', start_index=0, end_index=3999, mean=0.0, noise_sd=0.5, tone_hz=0.8, tone_amplitude=1.0),
               dict(name='R2 increased variance', start_index=4000, end_index=7999, mean=0.0, noise_sd='1.5 (ramps to 0.5 over 7000-7999)', tone_hz=0.8, tone_amplitude=1.0),
               dict(name='R3 changed mean', start_index=8000, end_index=11999, mean='3.0 (ramps to 0 over 11000-11999)', noise_sd=0.5, tone_hz=0.8, tone_amplitude=1.0),
               dict(name='R4 changed frequency composition', start_index=12000, end_index=15999, mean=0.0, noise_sd=0.5, tone_hz='0.8 -> 1.9 cross-fade over 12000-12999, then 1.9', tone_amplitude=1.0),
               dict(name='R5 temporary unstable', start_index=16000, end_index=17999, mean=0.0, noise_sd=1.0, tone_hz=1.9, tone_amplitude='1.5*exp(2*u), u=0..1 (1.5 -> 11.1)'),
               dict(name='R6 final stationary', start_index=18000, end_index=19999, mean=0.0, noise_sd=0.5, tone_hz=0.8, tone_amplitude=1.0)]
    truth = dict(dataset=k, synthetic=True, change_points=cps, regimes=regimes, noise_definition="noise = sd(t) * (0.8*white N(0,1) + 0.6*unit-variance AR(1) phi=0.9)")
    meta = M(k, "Change-point and regime-transition signal", fs, n, ["signal"], "white + AR(1) coloured, time-varying scale",
             dict(white_weight=0.8, ar1_weight=0.6, ar1_phi=0.9, sd_profile="see ground truth"), [comp(0.8, 1.0, 0.0), comp(1.9, 1.0, 0.5)])
    AUX[k] = dict(clean=clean, noise=noise)
    return dict(df=df, ts=['timestamp'], tsf='%.6f', truth=truth, meta=meta, fs=fs, n=n)


# ------------------------------------------------------------------ E
def gen_E():
    k = 'E'; r = rng(k); fs = 20.0; n = 20000; t = np.arange(n) / fs; D = 25
    Bf = ar1u(r, n + D, 0.9); B = Bf[D:]; Bd = Bf[:n]
    I1, I2, I3 = ar1u(r, n, 0.9), ar1u(r, n, 0.9), ar1u(r, n, 0.7)
    W2 = np.sin(PI2 * 1.1 * t + 1.2)
    a = 1 / (1 + np.exp(-(t - 500) / 60))
    nz = lambda sd: r.normal(0, sd, n)
    ch = {}
    ch['channel_1'] = B + 0.6 * W2 + nz(0.15)
    ch['channel_2'] = B + 0.6 * W2 + nz(0.15)
    ch['channel_3'] = 0.9 * Bd + nz(0.3)
    ch['channel_4'] = np.cos(PI2 * 0.35 * t) + nz(0.2)
    ch['channel_5'] = np.sin(PI2 * 0.35 * t) + 0.35 * B + nz(0.4)
    ch['channel_6'] = 0.3 * B + 0.9 * I1 + nz(0.3)
    ch['channel_7'] = a * B + (1 - a) * I2 + nz(0.2)
    ch['channel_8'] = I3 + nz(0.5)
    df = pd.DataFrame(dict(timestamp=tcol(n, fs), **ch))
    names = list(ch)
    truth = dict(dataset=k, synthetic=True,
                 latent_components=dict(B="unit-variance AR(1) phi=0.9 broadband shared latent", W2="sin(2pi*1.1 t+1.2) shared oscillation", S="0.35 Hz oscillation used by channel_4 (cos) and channel_5 (sin)", I1_I2_I3="independent AR(1) latents (phi 0.9, 0.9, 0.7)"),
                 channel_models=dict(channel_1="B + 0.6*W2 + N(0,0.15)", channel_2="B + 0.6*W2 + N(0,0.15)",
                                     channel_3="0.9*B(t-1.25 s) + N(0,0.3)", channel_4="cos(2pi*0.35 t) + N(0,0.2)",
                                     channel_5="sin(2pi*0.35 t) + 0.35*B + N(0,0.4)", channel_6="0.3*B + 0.9*I1 + N(0,0.3)",
                                     channel_7="a(t)*B + (1-a(t))*I2 + N(0,0.2), a(t)=1/(1+exp(-(t-500)/60))", channel_8="I3 + N(0,0.5)"),
                 relationships=[
                     dict(pair=["channel_1", "channel_2"], kind="strong correlation, zero lag, shared B and W2", lag_samples=0),
                     dict(pair=["channel_1", "channel_3"], kind="delayed relationship: channel_3 lags channel_1 (via B)", lag_samples=D, lag_seconds=D / fs),
                     dict(pair=["channel_4", "channel_5"], kind="same 0.35 Hz oscillation, phase shift: channel_5 lags channel_4 by pi/2 (quarter period); near-zero zero-lag correlation, coherence ~1 at 0.35 Hz", phase_rad_cross_spectrum_arg=-np.pi / 2, frequency_hz=0.35),
                     dict(pair=["channel_1", "channel_6"], kind="weak correlation via 0.3*B"),
                     dict(pair=["channel_1", "channel_5"], kind="weak correlation via 0.35*B"),
                     dict(pair=["channel_1", "channel_7"], kind="time-varying relationship: unrelated early (a~0), strongly related late (a~1)", transition_centre_s=500, transition_width_s=60),
                     dict(pair=["channel_8", "all others"], kind="independent")],
                 delay_convention="positive lag means the second channel in the pair lags (is later than) the first",
                 correlation_realised_pearson_zero_lag=pd.DataFrame(ch).corr().round(6).to_dict(),
                 noise_sd_per_channel=dict(channel_1=0.15, channel_2=0.15, channel_3=0.3, channel_4=0.2, channel_5=0.4, channel_6=0.3, channel_7=0.2, channel_8=0.5),
                 coupling_note="correlation/coherence values are realised from this generated data; theory = shared-variance fraction from the model equations")
    meta = M(k, "Eight-channel coupled sensor system", fs, n, names, "per-channel white Gaussian + AR(1) latents",
             truth['noise_sd_per_channel'], [comp(0.35, 1.0, 0.0, "S"), comp(1.1, 0.6, 1.2, "W2")])
    return dict(df=df, ts=['timestamp'], tsf='%.6f', truth=truth, meta=meta, fs=fs, n=n)


# ------------------------------------------------------------------ F
def gen_F():
    k = 'F'; r = rng(k); fs = 10.0; n = 30000; t = np.arange(n) / fs
    fj = 0.2 + 0.002 * ar1u(r, n, 0.999)
    bg = np.sin(PI2 / fs * np.cumsum(fj)) + 0.15 * ar1u(r, n, 0.85) + r.normal(0, 0.05, n)
    x = bg.copy()
    kk = np.arange(200); mA = 3.0 * np.hanning(200) * (np.sin(PI2 * 4 * kk / 200 + 0.3) + 0.4 * np.sin(PI2 * 9 * kk / 200))
    kb = np.arange(60); mB = np.exp(-kb / 12) - np.exp(-kb / 3); mB = 4.0 * mB / mB.max()

    def distort(tpl, L):
        s = r.uniform(0.99, 1.01); a = r.uniform(0.9, 1.1)
        xs = np.linspace(0, len(tpl) - 1, len(tpl)) * s
        w = np.interp(xs, np.arange(len(tpl)), tpl, right=0.0)
        return a * w + r.normal(0, 0.1, L)
    sA = [1500, 4800, 8200, 11800, 15500, 18900, 24000, 27300]; sB = [3000, 6500, 10000, 13500, 17000, 25500]
    for s in sA: x[s:s + 200] += distort(mA, 200)
    for s in sB: x[s:s + 60] += distort(mB, 60)
    kd = np.arange(300); x[21000:21300] += 4.0 * np.hanning(300) * sps.sawtooth(PI2 * 5 * kd / 300 + 0.2, 0.3)
    df = pd.DataFrame(dict(timestamp=tcol(n, fs), signal=x))
    truth = dict(dataset=k, synthetic=True,
                 motif_A=dict(description="Hann-windowed two-tone waveform (4 and 9 cycles per 200 samples), amplitude 3, with per-instance amplitude scale U(0.9,1.1), time-stretch U(0.99,1.01) and N(0,0.1) noise",
                              length_samples=200, start_indices=sA, end_indices=[s + 199 for s in sA]),
                 motif_B=dict(description="Repeated transient: double-exponential pulse (tau 12 and 3 samples), peak 4, with same distortion model",
                              length_samples=60, start_indices=sB, end_indices=[s + 59 for s in sB]),
                 discord=dict(description="non-repeating asymmetric sawtooth segment (Hann-windowed, amplitude 4)", start_index=21000, end_index=21299, length_samples=300),
                 quasi_periodic_background="sin(phase), instantaneous frequency 0.2 Hz + 0.002*AR(1)(phi=0.999) jitter",
                 distance_definition="z-normalised Euclidean distance between windows")
    meta = M(k, "Motif, recurrence and discord signal", fs, n, ["signal"], "AR(1) coloured (phi=0.85, scale 0.15) + white sd 0.05",
             dict(ar1_phi=0.85, ar1_scale=0.15, white_sd=0.05), [dict(type="quasi-periodic background", nominal_frequency_hz=0.2)])
    AUX[k] = dict(bg=bg)
    return dict(df=df, ts=['timestamp'], tsf='%.6f', truth=truth, meta=meta, fs=fs, n=n)


# ------------------------------------------------------------------ G
def gen_G():
    k = 'G'; r = rng(k); fs = 1.0
    rows = []; exps = []; eid = 0

    def noise(kind, n):
        return r.normal(0, 1, n) if kind == 'white' else ar1u(r, n, 0.7)
    for rep in range(2):
        for eff_name, A in [('null', 0.0), ('weak', 0.12), ('strong', 0.5)]:
            for nk in ['white', 'ar1_phi0.7']:
                for n in [256, 512, 1024, 2048]:
                    eid += 1; f = float(r.uniform(0.05, 0.45)); ph = float(r.uniform(0, PI2)); t = np.arange(n)
                    x = A * np.sin(PI2 * f * t + ph) + noise('white' if nk == 'white' else 'ar', n)
                    y = r.normal(0, 1, n)
                    name = f"G_F_{eid:03d}"
                    rows.append(pd.DataFrame(dict(experiment_id=name, sample_index=t, timestamp_s=t / fs, x=x, y=y)))
                    exps.append(dict(experiment_id=name, test_family="frequency", n_samples=n, sampling_rate_hz=fs,
                                     H0="x contains no sinusoid at f_test", H1="x contains a sinusoid at f_test",
                                     is_null=(A == 0), effect_label=eff_name, effect_size=dict(amplitude_over_noise_sd=A, definition="A/sigma, sigma=1 marginal noise sd"),
                                     expected_direction=("none" if A == 0 else "present (positive amplitude)"),
                                     known_parameters=dict(f_test_hz=f, true_frequency_hz=(f if A else None), amplitude=A, phase_rad=ph if A else None),
                                     noise=nk, y_channel="independent N(0,1) control noise; unrelated to x"))
    for rep in range(2):
        for rho, lab in [(0.0, 'null'), (0.15, 'weak'), (-0.5, 'strong')]:
            for nk in ['independent_white', 'serially_correlated_ar1_phi0.8']:
                for n in [100, 500, 2000]:
                    eid += 1; t = np.arange(n)
                    e = r.multivariate_normal([0, 0], [[1, rho], [rho, 1]], n + 500)
                    if nk == 'independent_white': xy = e[500:]
                    else:
                        xy = sps.lfilter([1.0], [1.0, -0.8], e, axis=0)[500:] * np.sqrt(1 - 0.64)
                    name = f"G_C_{eid:03d}"
                    rows.append(pd.DataFrame(dict(experiment_id=name, sample_index=t, timestamp_s=t / fs, x=xy[:, 0], y=xy[:, 1])))
                    exps.append(dict(experiment_id=name, test_family="correlation", n_samples=n, sampling_rate_hz=fs,
                                     H0="population correlation between x and y is 0", H1="population correlation is non-zero",
                                     is_null=(rho == 0), effect_label=lab, effect_size=dict(population_pearson_rho=rho, definition="Pearson correlation of the innovations; equals correlation of the series (both share the same AR filter)"),
                                     expected_direction=("none" if rho == 0 else ("positive" if rho > 0 else "negative")),
                                     known_parameters=dict(rho=rho), noise=nk))
    df = pd.concat(rows, ignore_index=True)
    m = len(exps); nn = sum(e['is_null'] for e in exps)
    truth = dict(dataset=k, synthetic=True, number_of_hypotheses_tested=m, number_true_nulls=nn, number_true_alternatives=m - nn,
                 note="one hypothesis per experiment_id; for FDR use all m hypotheses together. Frequency tests are for ONE a-priori frequency f_test, so a fixed-frequency periodogram p-value is valid under white noise; AR(1) noise makes naive parametric p-values anti-conservative (use surrogates/permutation).",
                 experiments=exps)
    meta = M(k, "Statistical inference benchmark (84 controlled experiments, long format)", fs, len(df), ["x", "y"],
             "white N(0,1) or unit-variance AR(1)", dict(ar1_phi_frequency_family=0.7, ar1_phi_correlation_family=0.8), [],
             dict(experiments=m, sample_sizes=dict(frequency=[256, 512, 1024, 2048], correlation=[100, 500, 2000]),
                  columns_note="rows grouped by experiment_id; sample_index restarts at 0 for each experiment; observation_count is the total row count"),
             uniform=True)
    return dict(df=df, ts=['timestamp_s'], tsf='%.1f', truth=truth, meta=meta, fs=fs, n=len(df))


# ------------------------------------------------------------------ H
def facts(df, tcol_='timestamp'):
    t = df[tcol_].to_numpy(); dt = np.diff(t); med = float(np.median(dt))
    big = [dict(after_row=int(j), before_row=int(j + 1), gap_seconds=float(dt[j])) for j in np.where(dt > 10 * med)[0]]
    vals = df.drop(columns=[tcol_])
    return dict(row_count=int(len(df)), unique_timestamps=int(len(np.unique(t))),
                duplicate_timestamp_pairs=int(np.sum(dt == 0)), strictly_increasing=bool(np.all(dt > 0)),
                non_decreasing=bool(np.all(dt >= 0)), dt_min=float(dt.min()), dt_median=med, dt_max=float(dt.max()),
                uniformly_sampled=bool(np.allclose(dt, med, rtol=1e-6)),
                nan_count_by_column={c: int(vals[c].isna().sum()) for c in vals},
                inf_count_by_column={c: int(np.isinf(vals[c].to_numpy(float)).sum()) for c in vals},
                constant_columns=[c for c in vals if vals[c].nunique(dropna=True) <= 1],
                large_gaps_over_10x_median_dt=big)


def gen_H():
    k = 'H'; r = rng(k); dt0 = 0.5; ng = 6000
    tn = 1.0 + np.arange(ng) * dt0
    keep = np.ones(ng, bool)
    for a, b in [(1500, 1540), (3200, 3260), (4700, 4730)]: keep[a:b] = False
    d = np.arange(2000, 2600); keep[d[(d - 2000) % 3 != 0]] = False
    keep &= ~(r.random(ng) < 0.06)
    jit = np.clip(r.normal(0, 0.04, ng), -0.12, 0.12)
    t = (tn + jit)[keep]; N = len(t)
    ac = np.sin(PI2 * 0.05 * t) + 0.4 * np.sin(PI2 * 0.31 * t + 0.8)
    sa = ac + 0.3 * r.normal(0, 1, N); sb = 0.7 * ac + 0.3 * r.normal(0, 1, N)
    clean = pd.DataFrame(dict(timestamp=t, signal_a=sa, signal_b=sb, constant_channel=np.full(N, 42.0)))
    main = clean.copy()
    ia = r.choice(N, int(round(0.012 * N)), replace=False); ib = r.choice(N, int(round(0.02 * N)), replace=False)
    blk = np.arange(N // 2, N // 2 + 25)
    main.loc[ia, 'signal_a'] = np.nan; main.loc[ib, 'signal_b'] = np.nan; main.loc[blk, 'signal_b'] = np.nan
    dup = clean.iloc[:2000].copy().reset_index(drop=True); di = [200, 500, 900, 1200, 1500, 1800]
    for j in di: dup.loc[j, 'timestamp'] = dup.loc[j - 1, 'timestamp']
    inf = clean.iloc[:2000].copy().reset_index(drop=True)
    pinf = [150, 700, 1300]; ninf = [1000, 1700]
    inf.loc[pinf, 'signal_a'] = np.inf; inf.loc[ninf, 'signal_b'] = -np.inf
    fm, fd, fi = facts(main), facts(dup), facts(inf)
    exp = dict(dataset=k, synthetic=True,
               policy="The generator never repairs data. A correct ingestion layer must report the outcomes below and must not silently repair, interpolate, drop or resample.",
               files={
                   "H_irregular_missing.csv": dict(expected_outcome="ACCEPT_WITH_WARNINGS", reasons=["non-uniform sampling", "NaN values present", "constant channel", "large gaps (missing observations)"],
                                                   expected_facts=fm, nan_row_indices=dict(signal_a=sorted(map(int, ia)), signal_b=sorted(set(map(int, ib)) | set(map(int, blk))))),
                   "H_invalid_duplicate_timestamps.csv": dict(expected_outcome="REJECT", reasons=["duplicate timestamps"], expected_facts=fd,
                                                              duplicate_row_indices=di, note="row index j has the same timestamp as row j-1"),
                   "H_invalid_infinite_values.csv": dict(expected_outcome="REJECT", reasons=["non-finite (inf) values"], expected_facts=fi,
                                                         positive_inf=dict(signal_a=pinf), negative_inf=dict(signal_b=ninf))})
    meta = M(k, "Irregular and incomplete sampling", None, N, ["signal_a", "signal_b", "constant_channel"],
             "white Gaussian", dict(sd_signal_a=0.3, sd_signal_b=0.3), [comp(0.05, 1.0, 0.0), comp(0.31, 0.4, 0.8)],
             dict(nominal_interval_s=dt0, timestamp_jitter="N(0,0.04 s) clipped to +/-0.12 s", missing_observations="3 contiguous gaps (40, 60, 30 nominal samples), ~6% random row drops, rows 2000-2599 nominal decimated by 3 (interval 1.5 s)",
                  nan_injection="1.2% of signal_a, 2% of signal_b, plus a 25-row NaN block in signal_b", constant_channel_value=42.0,
                  extra_files=["H_invalid_duplicate_timestamps.csv", "H_invalid_infinite_values.csv"], timestamp_format="%.9f seconds",
                  expected_validation="see ground_truth/H_expected_validation.json", observed_facts=fm),
             uniform=False)
    return dict(df=main, ts=['timestamp'], tsf='%.9f', truth=exp, meta=meta, fs=None, n=N,
                extra={"H_invalid_duplicate_timestamps.csv": dup, "H_invalid_infinite_values.csv": inf})


# ------------------------------------------------------------------ I
def gen_I():
    k = 'I'; r = rng(k); fs = 100.0; n = 20000; t = np.arange(n) / fs
    trend = 2e5 + 5e4 * np.sin(PI2 * 0.004 * t) + 50.0 * t
    mid = 1e3 * np.sin(PI2 * 0.5 * t); small = 1.0 * np.sin(PI2 * 3.1 * t + 0.4); tiny = 1e-3 * np.sin(PI2 * 11.7 * t + 1.1)
    noise = r.normal(0, 5e-3, n) + ar1u(r, n, 0.9) * 2.3e-3
    tr = np.zeros(n); tpos = [5000, 12000, 16000]; tamp = [5e7, -2e8, 1e9]
    kk = np.arange(200)
    for p, a in zip(tpos, tamp): tr[p:p + 200] += a * np.exp(-kk / 20) * np.cos(PI2 * 15 * kk / fs)
    sig = trend + mid + small + tiny + noise + tr
    m = 1e-9 * np.sin(PI2 * 0.7 * t) + 2e-12 * np.sin(PI2 * 5.3 * t + 0.3) + 5e-13 * r.normal(0, 1, n)
    df = pd.DataFrame(dict(timestamp=tcol(n, fs), signal=sig, signal_micro=m))
    nz = np.abs(sig[sig != 0]).min()
    truth = dict(dataset=k, synthetic=True,
                 components_signal=[dict(name="trend", model="2e5 + 5e4*sin(2pi*0.004 t) + 50*t", scale=2e5),
                                    comp(0.5, 1e3, 0.0, "large oscillation"), comp(3.1, 1.0, 0.4, "small oscillation"),
                                    comp(11.7, 1e-3, 1.1, "tiny component, amplitude below noise sd 5e-3 (buried)")],
                 components_signal_micro=[comp(0.7, 1e-9, 0.0), comp(5.3, 2e-12, 0.3), dict(noise_sd=5e-13)],
                 extreme_transients=[dict(start_index=p, end_index=p + 199, peak_amplitude=a, model="a*exp(-k/20)*cos(2pi*15*k/fs)") for p, a in zip(tpos, tamp)],
                 dynamic_range=dict(max_abs=float(np.abs(sig).max()), min_abs_nonzero=float(nz), ratio_max_to_noise_sd=float(np.abs(sig).max() / 5.6e-3),
                                    dB_max_to_noise_sd=float(20 * np.log10(np.abs(sig).max() / 5.6e-3)), micro_channel_max_abs=float(np.abs(m).max())),
                 float64_resolution_note="spacing between doubles near 3e5 is ~5.8e-11, so the 1e-3 component is representable with ~7 digits")
    meta = M(k, "High-dynamic-range scientific signal", fs, n, ["signal", "signal_micro"], "white Gaussian + AR(1)",
             dict(white_sd=5e-3, ar1_phi=0.9, ar1_marginal_sd=2.3e-3, micro_white_sd=5e-13), truth['components_signal'],
             dict(dynamic_range=truth['dynamic_range'], numeric_validity="all values finite float64"))
    AUX[k] = dict()
    return dict(df=df, ts=['timestamp'], tsf='%.6f', truth=truth, meta=meta, fs=fs, n=n)


# ------------------------------------------------------------------ J
def gen_J():
    k = 'J'; r = rng(k); fs = 10.0; n = 30000; OFF = 40; Mx = n + OFF
    t = (np.arange(Mx) - OFF) / fs; i = np.arange(Mx) - OFF  # i = final row index
    tones = [comp(0.30, 1.2, 0.5, "periodic 1 (fundamental)"), comp(0.34, 0.9, 1.7, "periodic 2 (overlaps periodic 1; separation 0.04 Hz, resolution 3.3e-4 Hz)"),
             comp(0.83, 0.7, -0.6, "periodic 3"), comp(0.60, 0.5, 0.2, "2nd harmonic of 0.30 Hz"), comp(0.90, 0.3, 2.0, "3rd harmonic of 0.30 Hz")]
    per = sum(c['amplitude'] * np.sin(PI2 * c['frequency_hz'] * t + c['phase_rad']) for c in tones)
    kc = (2.0 - 1.0) / 3000.0
    chirp = 0.8 * (1 + 0.3 * np.sin(PI2 * 0.01 * t)) * np.sin(PI2 * (1.0 * t + 0.5 * kc * t ** 2))
    noise = r.normal(0, 0.3, Mx) + ar1u(r, Mx, 0.9) * 0.34
    x = per + chirp + noise
    ev = []

    def add(typ, s, e, mag, defn, **kw): ev.append(dict(event_type=typ, start_index=s, end_index=e, duration_samples=e - s + 1, magnitude=mag, magnitude_definition=defn, **kw))
    s, L = 7000, 80; kk = np.arange(L); x[s + OFF:s + OFF + L] += 5.0 * np.exp(-kk / 15) * np.sin(PI2 * 2.5 * kk / fs)
    add('transient_anomaly', s, s + L - 1, 5.0, 'peak amplitude of damped 2.5 Hz burst (tau 15 samples)')
    s, e = 10000, 11999; tt = np.arange(e - s + 1) / fs; x[s + OFF:e + OFF + 1] += 1.0 * np.sin(PI2 * 3.7 * tt)
    add('persistent_anomaly', s, e, 1.0, 'amplitude of a 3.7 Hz tone present for 2000 samples (200 s), absent elsewhere', frequency_hz=3.7)
    x[18000 + OFF:] += 1.5
    add('sudden_change_point', 18000, 18000, 1.5, 'permanent mean step added from index 18000 to end of record', persistent_to_index=n - 1)
    s, e = 24000, 26999; ramp = np.concatenate([np.linspace(0, 1.5, 1500, endpoint=False), np.linspace(1.5, 0, 1500, endpoint=False)])
    x[s + OFF:e + OFF + 1] += ramp * r.normal(0, 1, 3000)
    add('changing_variance_section', s, e, 1.5, 'peak std dev of extra zero-mean Gaussian noise added (triangular profile, peak at index 25500)')
    kk = np.arange(150); tpl = 2.0 * np.hanning(150) * (np.sin(PI2 * 3 * kk / 150) + 0.5 * np.sin(PI2 * 7 * kk / 150 + 1.0))
    ms = [1000, 3500, 5200, 9000, 13000, 16000, 19500, 28000]
    for s in ms:
        sc = r.uniform(0.95, 1.05); a = r.uniform(0.9, 1.1)
        w = np.interp(np.arange(150) * sc, np.arange(150), tpl, right=0.0)
        x[s + OFF:s + OFF + 150] += a * w + r.normal(0, 0.05, 150)
    kd = np.arange(200); x[14000 + OFF:14200 + OFF] += 2.5 * np.hanning(200) * sps.sawtooth(PI2 * 5 * kd / 200, 0.2)
    c1 = x[OFF:]
    c2 = 0.8 * c1 + r.normal(0, 0.35, n) + ar1u(r, n, 0.8) * 0.2
    c3 = 0.7 * x[:n] + r.normal(0, 0.5, n)
    c4 = 1.0 * np.sin(PI2 * 0.13 * (np.arange(n) / fs) + 0.9) + ar1u(r, n, 0.85) * 0.4 + r.normal(0, 0.3, n)
    df = pd.DataFrame(dict(timestamp=tcol(n, fs), channel_1=c1, channel_2=c2, channel_3=c3, channel_4=c4))
    truth = dict(dataset=k, synthetic=True, sampling_rate_hz=fs, nyquist_hz=fs / 2, frequency_resolution_hz=fs / n,
                 periodic_components_channel_1=tones, harmonic_relationships=dict(fundamental_hz=0.30, orders=[2, 3], harmonic_hz=[0.60, 0.90]),
                 chirp=dict(channel="channel_1", f_start_hz=1.0, f_end_hz=2.0, rate_hz_per_s=kc, amplitude=0.8, am_depth=0.3, am_freq_hz=0.01, formula="0.8*(1+0.3 sin(2pi 0.01 t))*sin(2pi(1.0 t + 0.5*kc*t^2))"),
                 events=ev,
                 motifs=dict(description="distorted repeats of a 150-sample Hann-windowed two-tone waveform in channel_1 (also propagate to channels 2 and 3)", length_samples=150, start_indices=ms, end_indices=[s + 149 for s in ms]),
                 discord=dict(channel="channel_1", start_index=14000, end_index=14199, length_samples=200, description="non-repeating Hann-windowed sawtooth"),
                 channel_relationships=[dict(pair=["channel_1", "channel_2"], model="channel_2 = 0.8*channel_1 + independent coloured noise", lag_samples=0, expected_zero_lag_correlation_gt=0.8),
                                        dict(pair=["channel_1", "channel_3"], model="channel_3(t) = 0.7*channel_1(t-4.0 s) + N(0,0.5)", lag_samples=OFF, lag_seconds=OFF / fs, note="channel_3 lags channel_1; all channel_1 events appear 40 samples later in channel_3"),
                                        dict(pair=["channel_1", "channel_4"], model="independent control channel (own 0.13 Hz tone + coloured noise)", expected_correlation="~0")],
                 event_propagation="events/motifs/discord/change point are defined by channel_1 row indices; channel_2 has them at the same index (x0.8), channel_3 at index+40 (x0.7); channel_4 has none",
                 noise_model="channel_1: white N(0,0.3) + 0.34*AR(1) phi=0.9 (unit variance)")
    meta = M(k, "MASTER DISCOVERY CHALLENGE (integrated multi-engine dataset)", fs, n, ["channel_1", "channel_2", "channel_3", "channel_4"],
             "white Gaussian + AR(1) coloured per channel", dict(channel_1_white_sd=0.3, channel_1_ar1_phi=0.9, channel_1_ar1_scale=0.34), tones)
    AUX[k] = dict()
    return dict(df=df, ts=['timestamp'], tsf='%.6f', truth=truth, meta=meta, fs=fs, n=n)


GENS = dict(A=gen_A, B=gen_B, C=gen_C, D=gen_D, E=gen_E, F=gen_F, G=gen_G, H=gen_H, I=gen_I, J=gen_J)
NAMES = dict(A="A_periodic_multifrequency", B="B_nonstationary_chirp", C="C_anomaly_rich", D="D_regime_changes", E="E_multichannel_coupling",
             F="F_motifs_recurrence", G="G_statistical_inference", H="H_irregular_missing", I="I_dynamic_range", J="J_master_discovery_challenge")
TRUTHN = {k: f"{k}_ground_truth.json" for k in "ABCDEFGI"}
TRUTHN.update(H="H_expected_validation.json", J="J_master_ground_truth.json")


def jd(o):
    if isinstance(o, (np.integer,)): return int(o)
    if isinstance(o, (np.floating,)): return float(o)
    if isinstance(o, np.ndarray): return o.tolist()
    if isinstance(o, (np.bool_,)): return bool(o)
    raise TypeError(type(o))


def dump(p, o):
    with open(p, 'w') as f: json.dump(o, f, indent=1, default=jd, allow_nan=False)


def wcsv(df, p, ts, tsf):
    d = df.copy()
    for c in ts: d[c] = d[c].map(lambda v: tsf % v)
    d.to_csv(p, index=False, float_format='%.17g', na_rep='NaN')


# ------------------------------------------------------------------ validation
class V:
    def __init__(s): s.d = {}

    def add(s, k, name, ok, detail):
        s.d.setdefault(k, []).append(dict(check=name, passed=bool(ok), detail=detail))


def peak(x, fs, f, nfft=2 ** 19, win=0.002):
    X = np.abs(np.fft.rfft(x - np.mean(x), nfft)) * 2 / len(x); fr = np.fft.rfftfreq(nfft, 1 / fs)
    m = (fr > f - win) & (fr < f + win); j = np.argmax(X[m]); return float(fr[m][j]), float(X[m][j])


def mass_nn(x, q, excl):
    m = len(q); qn = (q - q.mean()) / q.std()
    cs = np.cumsum(np.insert(x, 0, 0)); cs2 = np.cumsum(np.insert(x ** 2, 0, 0))
    mu = (cs[m:] - cs[:-m]) / m; sg = np.sqrt(np.maximum((cs2[m:] - cs2[:-m]) / m - mu ** 2, 1e-18))
    qt = sps.fftconvolve(x, qn[::-1], mode='valid'); c = np.clip(qt / (m * sg), -1, 1)
    d = np.sqrt(np.maximum(2 * m * (1 - c), 0)); lo, hi = excl; d[max(lo, 0):hi] = np.inf; return d


def zdist(a, b):
    a = (a - a.mean()) / a.std(); b = (b - b.mean()) / b.std(); return float(np.linalg.norm(a - b))


def validate(res, v, outdir):
    # --- A
    k = 'A'; g = res[k]; x = g['df'].signal.to_numpy()
    for c in g['truth']['expected_spectral_peaks']:
        fe, ae = peak(x, g['fs'], c['frequency_hz'])
        v.add(k, f"peak at {c['frequency_hz']} Hz", abs(fe - c['frequency_hz']) < 3e-4 and abs(ae / c['amplitude'] - 1) < 0.1, dict(f_est=fe, amp_est=ae, amp_true=c['amplitude']))
    top = sps.find_peaks(np.abs(np.fft.rfft(x - x.mean(), 2 ** 19)), height=0)[0]
    v.add(k, "SNR matches realised arrays", abs(g['truth']['snr_db'] - snr_db(AUX['A']['clean'], AUX['A']['noise'])) < 1e-9, g['truth']['snr_db'])
    # --- B
    k = 'B'; g = res[k]; x = g['df'].signal.to_numpy(); fi = AUX['B']['f_inst']
    for tc in [300, 600, 1300, 1700]:
        c = int(tc * 10); seg = x[c - 200:c + 200] * np.hanning(400)
        fr = np.fft.rfftfreq(2 ** 16, 0.1); X = np.abs(np.fft.rfft(seg, 2 ** 16)); fe = float(fr[np.argmax(X)]); ex = float(fi[c - 200:c + 200].mean())
        v.add(k, f"STFT ridge near t={tc}s", abs(fe - ex) < 0.12, dict(measured_hz=fe, expected_mean_inst_hz=ex))
    # --- C
    k = 'C'; g = res[k]; x = g['df'].signal.to_numpy()
    for e in g['truth']['events']:
        s, en, t_ = e['start_index'], e['end_index'], e['event_type']
        if t_ == 'impulse':
            w = np.r_[x[s - 50:s], x[s + 1:s + 51]]; z = abs(x[s] - np.median(w)) / (1.4826 * np.median(abs(w - np.median(w))))
            v.add(k, f"event {e['event_id']} impulse robust-z>5", z > 5, float(z))
        elif t_ in ('transient_burst', 'local_amplitude_spike'):
            ratio = x[s:en + 1].std() / x[0:1000].std(); mx = np.abs(x[s:en + 1] - np.median(x[s - 100:s])).max()
            v.add(k, f"event {e['event_id']} {t_} stands out", (ratio > 1.2) or mx > 4.5, dict(std_ratio=float(ratio), max_dev=float(mx)))
    dm = x[14400:14600].mean() - x[12600:13000].mean()
    v.add(k, "drift peak ~2.5 (tol 1.0)", abs(dm - 2.5) < 1.0, float(dm))
    ls = x[16600:17400].mean() - x[16100:16450].mean()
    v.add(k, "level shift ~3.0 (tol 1.0)", abs(ls - 3.0) < 1.0, float(ls))
    rr = x[17500:19500].std() / x[16600:17400].std()
    v.add(k, "long anomaly variance ratio >1.6", rr > 1.6, float(rr))
    # --- D
    k = 'D'; g = res[k]; x = g['df'].signal.to_numpy(); r_ = AUX['D']
    res_ = x - r_['clean']
    v.add(k, "residual sd per regime", abs(res_[:4000].std() - 0.5) < 0.05 and abs(res_[4000:7000].std() - 1.5) < 0.1 and abs(res_[16000:18000].std() - 1.0) < 0.1, dict(R1=float(res_[:4000].std()), R2=float(res_[4000:7000].std()), R5=float(res_[16000:18000].std())))
    v.add(k, "independent mean-step detector at 8000 (~+3)", abs(x[8000:8500].mean() - x[7500:8000].mean() - 3.0) < 0.5, float(x[8000:8500].mean() - x[7500:8000].mean()))
    v.add(k, "independent variance detector at 4000 (expected ratio ~1.9)", 1.5 < x[4000:4500].std() / x[3500:4000].std() < 3.0, float(x[4000:4500].std() / x[3500:4000].std()))
    fa, _ = peak(x[1000:3500], 10.0, 0.8, win=0.05); fb, _ = peak(x[14000:15900], 10.0, 1.9, win=0.05)
    v.add(k, "dominant tone 0.8 Hz before / 1.9 Hz after composition change", abs(fa - 0.8) < 0.02 and abs(fb - 1.9) < 0.02, dict(early=fa, late=fb))
    v.add(k, "unstable regime amplitude growth", np.abs(x[17500:18000]).max() > 3 * np.abs(x[16000:16500]).max() * 0.5, dict(late_max=float(np.abs(x[17500:18000]).max()), early_max=float(np.abs(x[16000:16500]).max())))
    # --- E
    k = 'E'; g = res[k]; d = g['df']; c = {j: d[f'channel_{j}'].to_numpy() for j in range(1, 9)}
    cc = lambda a, b: float(np.corrcoef(c[a], c[b])[0, 1])
    v.add(k, "strong pair ch1-ch2 r>0.9", cc(1, 2) > 0.9, cc(1, 2))
    lags = sps.correlation_lags(len(c[1]), len(c[1])); xc = sps.correlate(c[3] - c[3].mean(), c[1] - c[1].mean(), 'full', method='fft')
    lg = int(lags[np.argmax(xc)]); v.add(k, "delay ch1->ch3 = +25 samples", lg == 25, lg)
    fr, co = sps.coherence(c[4], c[5], 20.0, nperseg=1024); j = np.argmin(abs(fr - 0.35))
    fr2, P = sps.csd(c[4], c[5], 20.0, nperseg=1024); phs = float(np.angle(P[j]))
    v.add(k, "ch4-ch5 coherence@0.35Hz>0.9, phase~-pi/2, zero-lag r small", co[j] > 0.9 and abs(phs + np.pi / 2) < 0.2 and abs(cc(4, 5)) < 0.1, dict(coherence=float(co[j]), phase=phs, r0=cc(4, 5)))
    fr, co12 = sps.coherence(c[1], c[2], 20.0, nperseg=1024); j2 = np.argmin(abs(fr - 1.1))
    v.add(k, "ch1-ch2 coherence@1.1Hz>0.9", co12[j2] > 0.9, float(co12[j2]))
    v.add(k, "independent ch8: |r|<0.05 with ch1,ch2,ch3", max(abs(cc(8, 1)), abs(cc(8, 2)), abs(cc(8, 3))) < 0.05, [cc(8, 1), cc(8, 2), cc(8, 3)])
    e_, l_ = abs(np.corrcoef(c[1][:4000], c[7][:4000])[0, 1]), np.corrcoef(c[1][-4000:], c[7][-4000:])[0, 1]
    v.add(k, "time-varying ch7: weak early, strong late", e_ < 0.25 and l_ > 0.7, dict(early=float(e_), late=float(l_)))
    v.add(k, "weak pairs 0.05<|r|<0.6 (ch1-ch5, ch1-ch6)", all(0.05 < abs(cc(1, j)) < 0.6 for j in (5, 6)), [cc(1, 5), cc(1, 6)])
    # --- F
    k = 'F'; g = res[k]; x = g['df'].signal.to_numpy(); T = g['truth']
    A = [x[s:s + 200] for s in T['motif_A']['start_indices']]; tpl = np.mean([(a - a.mean()) / a.std() for a in A], 0)
    dm = [zdist(a, tpl) for a in A]; rnd = [zdist(x[s:s + 200], tpl) for s in range(500, 29000, 1500) if all(abs(s - m_) > 250 for m_ in T['motif_A']['start_indices'])]
    v.add(k, "motif A instances closer to template than random windows", max(dm) < min(rnd), dict(max_motif_dist=float(max(dm)), min_random_dist=float(min(rnd))))
    B = [x[s:s + 60] for s in T['motif_B']['start_indices']]; tb = np.mean([(a - a.mean()) / a.std() for a in B], 0)
    dmb = [zdist(a, tb) for a in B]; rb = [zdist(x[s:s + 60], tb) for s in range(500, 29000, 977) if all(abs(s - m_) > 80 for m_ in T['motif_B']['start_indices'])]
    v.add(k, "motif B instances closer than 90% of random windows", max(dmb) < np.percentile(rb, 10), dict(max_motif_dist=float(max(dmb)), p10_random=float(np.percentile(rb, 10))))
    dq = mass_nn(x, x[21000:21300], (20700, 21600)).min()
    others = [mass_nn(x, x[s:s + 300], (s - 300, s + 300)).min() for s in range(1000, 29000, 1800) if abs(s - 21000) > 400]
    v.add(k, "discord has largest nearest-neighbour distance", dq > max(others), dict(discord_nn=float(dq), max_other_nn=float(max(others))))
    # --- G
    k = 'G'; g = res[k]; d = g['df']; pv = []
    for e in g['truth']['experiments']:
        s = d[d.experiment_id == e['experiment_id']]; xx = s.x.to_numpy(); yy = s.y.to_numpy(); n_ = len(xx)
        if e['test_family'] == 'frequency':
            f = e['known_parameters']['f_test_hz']; z = np.exp(-1j * PI2 * f * np.arange(n_)); st = abs((xx * z).sum()) ** 2 / n_
            pv.append(dict(id=e['experiment_id'], null=e['is_null'], label=e['effect_label'], noise=e['noise'], p=float(np.exp(-st))))
        else:
            r_ = float(np.corrcoef(xx, yy)[0, 1]); e['_r'] = r_
    fw = [p for p in pv if p['noise'] == 'white']
    strong = [p for p in fw if p['label'] == 'strong']; nulls = [p for p in fw if p['null']]
    v.add(k, "strong white-noise frequency effects detected (p<0.01)", all(p['p'] < 0.01 for p in strong), [p['p'] for p in strong])
    v.add(k, "white-noise null false positives <=25% at p<0.05", np.mean([p['p'] < 0.05 for p in nulls]) <= 0.25, dict(n_null=len(nulls), rate=float(np.mean([p['p'] < 0.05 for p in nulls]))))
    ce = [e for e in g['truth']['experiments'] if e['test_family'] == 'correlation' and e['n_samples'] == 2000 and e['noise'] == 'independent_white']
    v.add(k, "sample r near rho for n=2000 white (tol 0.08)", all(abs(e['_r'] - e['known_parameters']['rho']) < 0.08 for e in ce), [(e['known_parameters']['rho'], round(e['_r'], 3)) for e in ce])
    for e in g['truth']['experiments']: e.pop('_r', None)
    v.add(k, "hypothesis count consistent", g['truth']['number_of_hypotheses_tested'] == len(g['truth']['experiments']) == d.experiment_id.nunique(), len(g['truth']['experiments']))
    # --- H (round trip from files)
    k = 'H'
    for fn, ex in g_h['truth']['files'].items() if False else []: pass
    # --- I
    k = 'I'; g = res[k]; s = g['df']; x = s.signal.to_numpy()
    v.add(k, "all values finite", bool(np.isfinite(s[['signal', 'signal_micro']].to_numpy()).all()), None)
    sos = sps.butter(4, 2.0, 'high', fs=100.0, output='sos'); y = sps.sosfiltfilt(sos, x - x.mean())[5300:11900]
    fe, ae = peak(y * 1.0, 100.0, 11.7, win=0.1)
    X = np.abs(np.fft.rfft(y * np.hanning(len(y)), 2 ** 18)); fr = np.fft.rfftfreq(2 ** 18, 0.01); band = (fr > 9) & (fr < 20)
    fpk = float(fr[band][np.argmax(X[band])])
    v.add(k, "buried 1e-3 component recovered at 11.7 Hz (Hann periodogram, transients excluded)", abs(fpk - 11.7) < 0.03, dict(peak_hz=fpk))
    dr = g['truth']['dynamic_range']; v.add(k, "dynamic range >= 1e10 (max / noise sd)", dr['ratio_max_to_noise_sd'] > 1e10, dr['ratio_max_to_noise_sd'])
    mm = s.signal_micro.to_numpy(); fm_, _ = peak(mm, 100.0, 5.3, win=0.1)
    v.add(k, "micro-scale channel 2e-12 tone recovered at 5.3 Hz", abs(fm_ - 5.3) < 0.02, fm_)
    # --- J
    k = 'J'; g = res[k]; d = g['df']; c1, c2, c3, c4 = (d[f'channel_{j}'].to_numpy() for j in range(1, 5)); T = g['truth']
    for cdef in T['periodic_components_channel_1'][:3]:
        fe, ae = peak(c1, 10.0, cdef['frequency_hz'], win=0.0015)
        seg = np.abs(np.fft.rfft(c1 - c1.mean(), 2 ** 19)) * 2 / len(c1); fr = np.fft.rfftfreq(2 ** 19, 0.1); med = np.median(seg[(fr > 0.1) & (fr < 1.5)])
        v.add(k, f"channel_1 peak at {cdef['frequency_hz']} Hz", abs(fe - cdef['frequency_hz']) < 3e-4 and ae > 8 * med, dict(f_est=fe, amp=ae, local_median=float(med)))
    xc = sps.correlate(c3 - c3.mean(), c1 - c1.mean(), 'full', method='fft'); lg = sps.correlation_lags(len(c3), len(c1))[np.argmax(xc)]
    v.add(k, "ch1->ch3 delay = +40 samples", int(lg) == 40, int(lg))
    v.add(k, "ch1-ch2 r>0.8; |ch1-ch4|<0.15", np.corrcoef(c1, c2)[0, 1] > 0.8 and abs(np.corrcoef(c1, c4)[0, 1]) < 0.15, [float(np.corrcoef(c1, c2)[0, 1]), float(np.corrcoef(c1, c4)[0, 1])])
    dev = np.abs(c1 - pd.Series(c1).rolling(101, center=True, min_periods=1).median().to_numpy())
    v.add(k, "transient burst located at 7000-7079", 7000 <= int(np.argmax(dev[6000:8000])) + 6000 <= 7079, int(np.argmax(dev[6000:8000])) + 6000)
    st = c1[18000:21000].mean() - c1[15000:17900].mean(); v.add(k, "change-point mean step ~1.5 (tol 0.4)", abs(st - 1.5) < 0.4, float(st))
    fe, ae = peak(c1[10000:12000], 10.0, 3.7, win=0.05); fo, ao = peak(c1[4000:6000], 10.0, 3.7, win=0.05)
    v.add(k, "persistent 3.7 Hz anomaly present only in 10000-11999", ae > 4 * ao, dict(inside=ae, outside=ao))
    vr = c1[25000:26000].std() / c1[22000:23000].std(); v.add(k, "variance section std ratio >1.3", vr > 1.3, float(vr))
    dq = mass_nn(c1, c1[14000:14200], (13700, 14500)).min(); oth = [mass_nn(c1, c1[s:s + 200], (s - 200, s + 200)).min() for s in range(1500, 29000, 2500) if abs(s - 14000) > 300 and all(abs(s - m_) > 200 for m_ in T['motifs']['start_indices'])]
    v.add(k, "discord NN distance exceeds other windows", dq > max(oth), dict(discord=float(dq), max_other=float(max(oth))))


def main():
    for sub in ['data', 'ground_truth', 'metadata']: os.makedirs(f"{OUT}/{sub}", exist_ok=True)
    res = {}; det = {}
    for kx, fn in GENS.items():
        res[kx] = fn(); r2 = fn()
        same = res[kx]['df'].equals(r2['df']) and json.dumps(res[kx]['truth'], default=jd) == json.dumps(r2['truth'], default=jd)
        det[kx] = bool(same)
    AUX_final = dict(AUX)
    # write
    cfg = {}
    for kx, g in res.items():
        wcsv(g['df'], f"{OUT}/data/{NAMES[kx]}.csv", g['ts'], g['tsf'])
        for fn, edf in (g.get('extra') or {}).items(): wcsv(edf, f"{OUT}/data/{fn}", g['ts'], g['tsf'])
        dump(f"{OUT}/ground_truth/{TRUTHN[kx]}", g['truth']); dump(f"{OUT}/metadata/{kx}_metadata.json", g['meta'])
        cfg[kx] = dict(file=f"data/{NAMES[kx]}.csv", seed=SEEDS[kx], sampling_rate_hz=g['fs'], observation_count=g['n'], channels=g['meta']['channel_names'])
    dump(f"{OUT}/generation_config.json", dict(synthetic_notice=SYN, rng="numpy.random.default_rng (PCG64)", numpy=np.__version__, scipy=__import__('scipy').__version__,
                                              pandas=pd.__version__, datasets=cfg, parameter_details="full parameters are in metadata/<X>_metadata.json and the generator source"))
    # validation
    v = V(); validate(res, v, OUT)
    # H round trip + determinism + structure checks from files on disk
    k = 'H'; hx = res['H']['truth']['files']
    for fn, e in hx.items():
        d = pd.read_csv(f"{OUT}/data/{fn}"); f = facts(d)
        ex = e['expected_facts']
        ok = all(f[q] == ex[q] for q in ['row_count', 'unique_timestamps', 'duplicate_timestamp_pairs', 'strictly_increasing', 'nan_count_by_column', 'inf_count_by_column', 'constant_columns', 'uniformly_sampled'])
        v.add(k, f"{fn}: re-read file reproduces expected validation facts", ok, dict(expected_outcome=e['expected_outcome'], row_count=f['row_count'], nan=f['nan_count_by_column'], inf=f['inf_count_by_column'], dup_pairs=f['duplicate_timestamp_pairs']))
    # structure
    for kx, g in res.items():
        d = pd.read_csv(f"{OUT}/data/{NAMES[kx]}.csv")
        v.add(kx, "CSV row count equals observation_count in metadata", len(d) == g['meta']['observation_count'], len(d))
        tc = d.columns[0] if kx != 'G' else 'timestamp_s'
        if kx not in ('G',): v.add(kx, "timestamps strictly increasing", bool((np.diff(d[tc].to_numpy()) > 0).all()) or kx == 'H' and False, None) if kx != 'H' else None
        if kx != 'H': v.add(kx, "no NaN/inf in data file", bool(np.isfinite(d.select_dtypes(include='number').to_numpy(float)).all()), None)
        v.add(kx, "no ground-truth column inside data file", not any(w in ' '.join(d.columns).lower() for w in ['label', 'truth', 'anomaly', 'event']), list(d.columns))
        v.add(kx, "deterministic regeneration with same seed (data + truth identical)", det[kx], SEEDS[kx])
        if kx == 'H': v.add(kx, "main file timestamps strictly increasing", bool((np.diff(d['timestamp'].to_numpy()) > 0).all()), None)
        if kx == 'G': v.add(kx, "timestamps ordered within each experiment", bool(d.groupby('experiment_id').timestamp_s.apply(lambda s: (np.diff(s.to_numpy()) > 0).all()).all()), None)
    # ground-truth index bounds
    def idxs(o):
        out = []
        if isinstance(o, dict):
            for kk, vv in o.items():
                if kk in ('start_index', 'end_index', 'index'): out.append(vv)
                elif kk in ('start_indices', 'end_indices'): out += list(vv)
                else: out += idxs(vv)
        elif isinstance(o, list):
            for q in o: out += idxs(q)
        return out
    for kx in 'CDFJ':
        ii = [q for q in idxs(res[kx]['truth']) if isinstance(q, (int, np.integer))]; n_ = res[kx]['n']
        v.add(kx, "all ground-truth indices are valid CSV row indices (0..n-1)", bool(ii) and min(ii) >= 0 and max(ii) < n_, dict(count=len(ii), min=min(ii), max=max(ii)))
    allp = all(c['passed'] for L in v.d.values() for c in L)
    dump(f"{OUT}/validation_summary.json", dict(synthetic_notice=SYN, all_checks_passed=allp,
         note="Every entry was computed by this script on the generated data. Checks are tolerance-based and listed with measured values.",
         total_checks=sum(len(L) for L in v.d.values()), failed=[dict(dataset=kk, **c) for kk, L in v.d.items() for c in L if not c['passed']], datasets=v.d))
    readme(res, v, allp)
    shutil.copy(__file__, f"{OUT}/generate_benchmark.py")
    print("ALL PASSED" if allp else "FAILURES:")
    for kk, L in v.d.items():
        for c in L:
            if not c['passed']: print(kk, c)
    print({kk: f"{sum(c['passed'] for c in L)}/{len(L)}" for kk, L in v.d.items()})


def readme(res, v, allp):
    rows = [("A", "Multi-frequency periodic + harmonics", "SPECTRA, STRUCTURE", "5 spectral peaks (0.0703, 0.1907, 0.4311 Hz + 2nd/3rd harmonics of 0.1907), white + AR(1) noise"),
            ("B", "Non-stationary chirp/AM/FM", "SPECTRA (STFT/CWT/wavelets)", "two chirp segments, abrupt frequency jump at 1000 s, AM + FM"),
            ("C", "Anomaly-rich", "ANOMALY", "5 impulses, 3 bursts, 3 spikes, drift, persistent level shift, 2000-sample long anomaly"),
            ("D", "Change-points / regimes", "STRUCTURE, ANOMALY", "7 change points (abrupt + gradual), 6 regimes incl. unstable regime"),
            ("E", "Eight-channel coupled system", "RELATION", "strong, weak, independent, delayed (1.25 s), phase-shifted (pi/2), time-varying pairs"),
            ("F", "Motifs / recurrence / discord", "STRUCTURE", "8 distorted copies of motif A, 6 of motif B, 1 discord, quasi-periodic background"),
            ("G", "Statistical inference", "INFERENCE", "84 experiments (48 frequency, 36 correlation), nulls, weak/strong effects, white vs AR(1) noise"),
            ("H", "Irregular / incomplete sampling", "Ingestion, validation, resources", "1 valid-with-warnings file + 2 deliberately invalid files; expected outcomes in JSON"),
            ("I", "High dynamic range", "Numerical stability, ingestion", "trend 2e5 .. tiny 1e-3 buried tone, transients up to 1e9, micro-scale channel (1e-9 .. 5e-13)"),
            ("J", "MASTER DISCOVERY CHALLENGE", "ALL engines", "30,000 rows, 4 channels, everything combined; see J ground truth")]
    tbl = "| Dataset | File | What it is | SYNAPSE engine(s) tested | Contents |\n|---|---|---|---|---|\n" + "\n".join(
        f"| {a} | data/{NAMES[a]}.csv | {b} | {c} | {d} |" for a, b, c, d in rows)
    txt = f"""# SYNAPSE Benchmark Data Suite

**{SYN}**

Ten synthetic datasets (A-J) for testing SYNAPSE. Ground truth lives ONLY in `ground_truth/`; data files contain just timestamps and measurements.

## Dataset -> engine map

{tbl}

## Folder layout
- `data/` CSV files (float64, 17 significant digits). Extra files in data/: `H_invalid_duplicate_timestamps.csv`, `H_invalid_infinite_values.csv` (deliberately invalid).
- `ground_truth/` per-dataset truth (H holds the expected validation outcome instead).
- `metadata/` construction details (seed, sampling rate, Nyquist, noise model, components, units).
- `generation_config.json`, `validation_summary.json`, `generate_benchmark.py` (regenerates everything: `python generate_benchmark.py OUTDIR`).

## Conventions
- Timestamps are seconds from start of record. Signal unit: arbitrary units (a.u.).
- Indices in ground truth are 0-based data rows (header excluded); CSV line number = index + 2. End indices are inclusive.
- Sinusoid: x(t) = sum A_i sin(2 pi f_i t + phi_i); phase in radians.
- SNR (dB) = 10 log10(mean(clean^2) / mean(noise^2)) on the realised arrays. Nyquist = fs/2. Frequency resolution = fs/N.
- Cross-correlation lag: positive lag = second channel lags the first. Coherence: magnitude-squared coherence (Welch).
- Change point: an index (or interval for gradual changes) where a named statistical property of the generating process changes.
- Effect size: frequency tests use A/sigma (sinusoid amplitude over noise sd); correlation tests use population Pearson rho.
- Seeds: dataset A..J use `numpy.random.default_rng(1001..1010)`.

## Dataset notes
- **A** fs 2 Hz, N 20000. Noise: white sd 0.5 + AR(1) phi 0.9.
- **B** fs 10 Hz, N 20000. f_inst(t)=f_base(t)+0.10 cos(2 pi 0.01 t); AM depth 0.4 at 0.005 Hz.
- **C** fs 50 Hz, N 20000. See `events` list for exact start/end/type/magnitude/duration.
- **D** fs 10 Hz, N 20000. Noise scale and mean are time-varying (see regimes).
- **E** fs 20 Hz, N 20000. Eight channels built from shared latents B (broadband), W2 (1.1 Hz), S (0.35 Hz) and independent latents.
- **F** fs 10 Hz, N 30000. Motif/discord locations in truth.
- **G** long format: `experiment_id, sample_index, timestamp_s, x, y`. 84 hypotheses in total. The `y` column in frequency experiments is an independent control noise series.
- **H** irregular timestamps (nominal 0.5 s, jitter, gaps, decimated stretch), NaNs, a constant channel. The generator does not repair anything.
- **I** fs 100 Hz. Columns `signal` (huge range) and `signal_micro` (1e-9 scale).
- **J** fs 10 Hz, N 30000, four channels. Events are defined on channel_1 indices; channel_2 has them at the same index, channel_3 40 samples later.

## Validation
`validation_summary.json` lists every check that was run on the generated data with its measured value. Overall result of this run: **{"all checks passed" if allp else "some checks FAILED - see validation_summary.json"}** ({sum(len(L) for L in v.d.values())} checks). Passing these checks means the generated files match their stated construction within the listed tolerances; it is not a statement about any analysis software.
"""
    open(f"{OUT}/README.md", "w").write(txt)


if __name__ == "__main__":
    main()
