"""
Window functions and spectral leakage metrics for SYNAPSE SPECTRA.
Provides exact coherent gain (CG) and noise equivalent bandwidth (NEBW) corrections.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple
import numpy as np
import scipy.signal.windows as windows

from synapse_core.exceptions import ValidationError


@dataclass(frozen=True)
class WindowProperties:
    name: str
    length: int
    weights: np.ndarray
    coherent_gain: float         # CG = (1/N) * sum(w) - amplitude correction factor
    noise_power_gain: float     # S2 = sum(w^2)
    equivalent_noise_bw: float  # NEBW = N * sum(w^2) / (sum(w))^2 bins
    scallop_loss_db: float      # Peak amplitude reduction between frequency bins
    explanation: str


def get_window(window_type: str, length: int) -> WindowProperties:
    """
    Generate window weights and calculate rigorous spectral correction factors.
    """
    if length < 2:
        raise ValidationError("Window length must be at least 2 samples.")

    w_type = window_type.lower().strip()

    if w_type in ("hann", "hanning"):
        w = windows.hann(length, sym=False)
        explanation = "Hann window provides moderate sidelobe suppression (-31.5 dB) and good frequency resolution."
        scallop_loss = 1.42
    elif w_type == "hamming":
        w = windows.hamming(length, sym=False)
        explanation = "Hamming window minimizes the highest sidelobe (-42.7 dB) but has slower asymptotic decay."
        scallop_loss = 1.78
    elif w_type == "blackman":
        w = windows.blackman(length, sym=False)
        explanation = "Blackman window provides steep sidelobe suppression (-58 dB) at the expense of mainlobe broadening."
        scallop_loss = 2.37
    elif w_type in ("flattop", "flat_top"):
        w = windows.flattop(length, sym=False)
        explanation = "Flat-top window delivers exceptional amplitude accuracy (<0.01 dB scallop loss) for calibration, with wide mainlobe."
        scallop_loss = 0.01
    elif w_type in ("boxcar", "rectangular", "rect"):
        w = windows.boxcar(length)
        explanation = "Rectangular window maximizes physical frequency resolution but causes severe spectral leakage (-13 dB sidelobes)."
        scallop_loss = 3.92
    else:
        raise ValidationError(
            f"Unknown window type '{window_type}'. Supported: 'hann', 'hamming', 'blackman', 'flattop', 'boxcar'."
        )

    w_imm = np.array(w, dtype=np.float64)
    w_imm.flags.writeable = False

    sum_w = float(np.sum(w_imm))
    sum_w2 = float(np.sum(w_imm**2))
    cg = sum_w / length
    nebw = (length * sum_w2) / (sum_w**2) if sum_w > 0 else float("inf")

    return WindowProperties(
        name=w_type,
        length=length,
        weights=w_imm,
        coherent_gain=cg,
        noise_power_gain=sum_w2,
        equivalent_noise_bw=nebw,
        scallop_loss_db=scallop_loss,
        explanation=explanation,
    )

