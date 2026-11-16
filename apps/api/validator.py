"""
Shared Signal Input Validator for SYNAPSE API.
Enforces typed boundary validation with consistent HTTP 422 responses containing:
{
  "error": str,
  "what_to_try": str,
  "module": str
}
"""

import math
from typing import Dict, Any, List, Optional
import numpy as np
from synapse_core.exceptions import ValidationError

def validate_signal_input(
    channels: Any,
    sampling_rate: Optional[float] = None,
    timestamps: Optional[List[float]] = None,
    allow_constant: bool = False,
    min_samples: int = 8,
    module: str = "synapse_core",
) -> None:
    """
    Validates signal input according to SYNAPSE mathematical specifications:
    - Non-empty channels dictionary
    - Minimum 8 samples per channel
    - Identical lengths across all channels
    - Strictly positive (>0 Hz) sampling rate
    - No NaN or Infinite values
    - No zero variance / constant signal (unless explicitly permitted in batch)
    - Monotonically increasing timestamps matching sample length
    """
    # 1. Empty / non-dict channels
    if not channels or not isinstance(channels, dict) or len(channels) == 0:
        raise ValidationError(
            message="Input signal contains no channels or data.",
            what_to_try="Provide at least one non-empty numeric channel.",
            module=module,
        )

    # 2. Bad sampling rate
    if sampling_rate is not None:
        if not isinstance(sampling_rate, (int, float)) or sampling_rate <= 0 or math.isnan(sampling_rate) or math.isinf(sampling_rate):
            raise ValidationError(
                message=f"Invalid sampling rate: {sampling_rate}. Must be strictly positive (> 0 Hz).",
                what_to_try="Ensure sampling_rate is a positive number (> 0.0 Hz).",
                module=module,
            )

    ch_items = list(channels.items())
    sample_lengths = []

    # 3. Channel sample length & content inspection
    for name, vals in ch_items:
        if vals is None or not hasattr(vals, "__len__"):
            raise ValidationError(
                message=f"Channel '{name}' data is invalid or missing.",
                what_to_try="Provide an array or list of floating point values for each channel.",
                module=module,
            )

        n_samples = len(vals)
        if n_samples < min_samples:
            raise ValidationError(
                message=f"Channel '{name}' has only {n_samples} samples; minimum is {min_samples} samples.",
                what_to_try=f"Provide a signal with at least {min_samples} samples for mathematical analysis.",
                module=module,
            )
        sample_lengths.append(n_samples)

        # Convert to numpy array to test NaN / Inf
        arr = np.asarray(vals, dtype=np.float64)
        if np.isnan(arr).any() or np.isinf(arr).any():
            raise ValidationError(
                message=f"Channel '{name}' contains NaN or Infinite values.",
                what_to_try="Ensure input data contains no NaN, Infinite, or corrupt floating point numbers.",
                module=module,
            )

    # 4. Unequal channel lengths
    if len(set(sample_lengths)) > 1:
        length_dict = {name: len(vals) for name, vals in ch_items}
        raise ValidationError(
            message=f"Channels have unequal sample counts: {length_dict}.",
            what_to_try="Ensure all channels in the multi-channel signal have identical sample lengths.",
            module=module,
        )

    # 5. Constant signal (Zero Variance)
    if not allow_constant:
        all_constant = True
        for name, vals in ch_items:
            arr = np.asarray(vals, dtype=np.float64)
            if float(np.var(arr)) > 1e-12:
                all_constant = False
                break
        if all_constant:
            raise ValidationError(
                message="Signal is strictly constant with zero variance.",
                what_to_try="Input signal must have variance > 0. Check sensor calibration or acquisition status.",
                module=module,
            )

    # 6. Timestamps inspection
    if timestamps is not None:
        t_arr = np.asarray(timestamps, dtype=np.float64)
        if np.isnan(t_arr).any() or np.isinf(t_arr).any():
            raise ValidationError(
                message="Timestamps contain NaN or Infinite values.",
                what_to_try="Ensure timestamps contain only valid finite numbers.",
                module=module,
            )
        expected_len = sample_lengths[0] if sample_lengths else 0
        if len(t_arr) != expected_len:
            raise ValidationError(
                message=f"Timestamps length ({len(t_arr)}) does not match channel sample count ({expected_len}).",
                what_to_try="Ensure timestamps length matches the number of samples in channels.",
                module=module,
            )
        if len(t_arr) > 1 and np.any(np.diff(t_arr) <= 0):
            raise ValidationError(
                message="Timestamps must be strictly monotonically increasing.",
                what_to_try="Ensure timestamps are sorted and contain no duplicate or backwards time values.",
                module=module,
            )
