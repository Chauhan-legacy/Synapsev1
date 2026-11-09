# ADR-0002: Canonical Scientific Data Model and Timestamp Semantics

## Status
Accepted

## Context
Signal processing in scientific domains involves diverse time-series topologies:
- Uniformly sampled signals (e.g., audio, lab ADC data, seismic strain).
- Irregularly sampled time series (e.g., astronomical photometry, sparse satellite telemetry).
- Multichannel arrays with synchronous or asynchronous channels.
- Missing values (gaps, dropouts, sensor saturation).

Common failure modes in scientific libraries include:
1. Guessing sampling rate $f_s$ merely by dividing number of rows by duration, obscuring severe jitter or data gaps.
2. Silently interpolating or dropping timestamps, which introduces artificial high-frequency artifacts or alters spectral power distributions.
3. In-place modification of arrays, corrupting raw data provenance.

## Decision
1. **Immutable In-Memory Representation**: The canonical `Signal` model encapsulates immutable NumPy arrays (`values.flags.writeable = False`, `timestamps.flags.writeable = False`).
2. **Explicit Timestamp Topologies**:
   - Every `Signal` validates its time axis upon instantiation.
   - Computes time-step differences $\Delta t_i = t_{i+1} - t_i$.
   - Computes relative variation:
     $$\epsilon = \frac{\sigma_{\Delta t}}{\mu_{\Delta t}}$$
   - If $\epsilon \le \text{tolerance}$ (default $10^{-4}$ or $0.01\%$), the signal is certified as **Uniformly Sampled**, and its derived sampling frequency $f_s = 1 / \mu_{\Delta t}$ is recorded.
   - If $\epsilon > \text{tolerance}$, the signal is flagged as **Irregularly Sampled** ($f_s = \text{None}$).
3. **No Silent Resampling**: Algorithms that strictly require uniform sampling (e.g. standard FFT, Welch's method) MUST raise an `IncompatibleSamplingError` when presented with an irregular signal, specifying the exact time-axis metrics and requiring an explicit, documented transformation step before proceeding.
4. **Data Quality Profile**: Every `Signal` provides a comprehensive quality report containing gap locations, NaN masks, dynamic range, and channel statistics.

## Consequences
- Prevents invalid mathematical inferences.
- Guarantees complete data provenance and scientific transparency.

