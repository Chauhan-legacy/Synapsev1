"""SYNAPSE Multi-Language Acceleration Architecture.

Provides seamless multi-tier execution:
  - Tier 1: Rust Native C-ABI FFI (`synapse_native` shared library if compiled).
  - Tier 2: Numba LLVM JIT Machine Code (compiles on the fly to native x86_64/ARM machine instructions).
            Allows students, learners, and open-source contributors to get native compiled
            speeds without needing Rust, Cargo, or C++ compilers installed!
  - Tier 3: NumPy / SciPy C++ PocketFFT & OpenBLAS vectorized fallback.
"""

from ctypes import CDLL, c_double, c_int, c_size_t, POINTER, byref
from pathlib import Path
import os
import sys
from typing import Tuple, Optional
import numpy as np

# -------------------------------------------------------------------------
# 1. Tier 1: Rust Native Shared Library Loader
# -------------------------------------------------------------------------
_RUST_LIB: Optional[CDLL] = None
_RUST_AVAILABLE: bool = False

def _find_and_load_rust_lib() -> Optional[CDLL]:
    base_dir = Path(__file__).resolve().parent.parent.parent
    possible_names = [
        "synapse_native.dll",
        "libsynapse_native.so",
        "libsynapse_native.dylib",
    ]
    search_paths = [
        base_dir / "crates" / "synapse_native" / "target" / "release",
        base_dir / "crates" / "synapse_native" / "target" / "debug",
        base_dir / "packages" / "synapse_core",
    ]
    for p in search_paths:
        for name in possible_names:
            candidate = p / name
            if candidate.exists():
                try:
                    lib = CDLL(str(candidate))
                    # Setup signatures
                    lib.rust_fast_stats.argtypes = [
                        POINTER(c_double), c_size_t,
                        POINTER(c_double), POINTER(c_double), POINTER(c_double),
                        POINTER(c_double), POINTER(c_double), POINTER(c_double),
                    ]
                    lib.rust_fast_stats.restype = c_int
                    lib.rust_fast_cusum_changepoint.argtypes = [POINTER(c_double), c_size_t]
                    lib.rust_fast_cusum_changepoint.restype = c_size_t
                    lib.rust_fast_rqa_determinism.argtypes = [POINTER(c_double), c_size_t, c_double, c_size_t]
                    lib.rust_fast_rqa_determinism.restype = c_double
                    return lib
                except Exception:
                    pass
    return None

try:
    _RUST_LIB = _find_and_load_rust_lib()
    _RUST_AVAILABLE = _RUST_LIB is not None
except Exception:
    _RUST_AVAILABLE = False


# -------------------------------------------------------------------------
# 2. Tier 2: Numba LLVM JIT Acceleration (Zero-Hassle for Students)
# -------------------------------------------------------------------------
_NUMBA_AVAILABLE: bool = False

try:
    from numba import njit, prange
    _NUMBA_AVAILABLE = True

    @njit(fastmath=True, cache=True)
    def _numba_fast_stats(x: np.ndarray) -> Tuple[float, float, float, float, float, float]:
        n = len(x)
        if n == 0:
            return 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        
        sum_val = 0.0
        min_val = x[0]
        max_val = x[0]
        for i in range(n):
            v = x[i]
            sum_val += v
            if v < min_val: min_val = v
            if v > max_val: max_val = v
            
        mean = sum_val / n
        m2 = 0.0
        m3 = 0.0
        m4 = 0.0
        for i in range(n):
            diff = x[i] - mean
            d2 = diff * diff
            m2 += d2
            m3 += d2 * diff
            m4 += d2 * d2
            
        var = m2 / (n - 1) if n > 1 else 0.0
        std = np.sqrt(var)
        skew = (m3 / n) / (std ** 3) if std > 1e-12 else 0.0
        kurt = ((m4 / n) / (var ** 2)) - 3.0 if var > 1e-12 else 0.0
        ptp = max_val - min_val
        return mean, std, var, skew, kurt, ptp

    @njit(fastmath=True, cache=True)
    def _numba_fast_cusum(x: np.ndarray) -> int:
        n = len(x)
        if n < 4:
            return 0
        mean = np.mean(x)
        cusum = 0.0
        max_dev = 0.0
        best_idx = 0
        for i in range(n):
            cusum += x[i] - mean
            abs_c = abs(cusum)
            if abs_c > max_dev:
                max_dev = abs_c
                best_idx = i
        return best_idx

    @njit(fastmath=True, cache=True)
    def _numba_fast_rqa_determinism(x: np.ndarray, eps: float, min_line_len: int) -> float:
        n = len(x)
        if n < 10:
            return 0.0
        total_rec = 0
        diag_points = 0
        for d in range(1, n):
            current_line = 0
            for i in range(n - d):
                j = i + d
                if abs(x[i] - x[j]) <= eps:
                    total_rec += 1
                    current_line += 1
                else:
                    if current_line >= min_line_len:
                        diag_points += current_line
                    current_line = 0
            if current_line >= min_line_len:
                diag_points += current_line
        if total_rec == 0:
            return 0.0
        return float(diag_points) / float(total_rec)

    # Warmup JIT at module load so first user request runs in milliseconds (< 5 ms)
    _numba_fast_stats(np.array([1.0, 2.0, 3.0, 4.0], dtype=np.float64))
    _numba_fast_cusum(np.array([1.0, 2.0, 3.0, 4.0], dtype=np.float64))
    _numba_fast_rqa_determinism(np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0], dtype=np.float64), 0.5, 2)

except ImportError:
    _NUMBA_AVAILABLE = False


# -------------------------------------------------------------------------
# 3. Unified Dispatcher: Gets the Highest Available Acceleration Tier
# -------------------------------------------------------------------------
def get_acceleration_tier() -> str:
    """Returns the currently active high-performance execution tier."""
    if _RUST_AVAILABLE:
        return "Rust Native C-ABI (Tier 1)"
    elif _NUMBA_AVAILABLE:
        return "Numba LLVM JIT Machine Code (Tier 2 - Zero Compiler Setup)"
    else:
        return "NumPy/SciPy C-PocketFFT (Tier 3)"


def fast_compute_moments(x: np.ndarray) -> Tuple[float, float, float, float, float, float]:
    """Compute (mean, std, var, skewness, kurtosis, peak-to-peak) at native speed."""
    arr = np.ascontiguousarray(x, dtype=np.float64)
    n = len(arr)

    # 1. Try Rust
    if _RUST_AVAILABLE and _RUST_LIB is not None:
        mean, std, var, skew, kurt, ptp = (
            c_double(), c_double(), c_double(), c_double(), c_double(), c_double()
        )
        data_ptr = arr.ctypes.data_as(POINTER(c_double))
        res = _RUST_LIB.rust_fast_stats(
            data_ptr, c_size_t(n),
            byref(mean), byref(std), byref(var),
            byref(skew), byref(kurt), byref(ptp)
        )
        if res == 0:
            return mean.value, std.value, var.value, skew.value, kurt.value, ptp.value

    # 2. Try Numba LLVM JIT
    if _NUMBA_AVAILABLE:
        return _numba_fast_stats(arr)

    # 3. Vectorized NumPy fallback
    mean = float(np.mean(arr))
    std = float(np.std(arr, ddof=1))
    var = std ** 2
    dev = arr - mean
    skew = float(np.mean(dev ** 3) / (std ** 3)) if std > 1e-12 else 0.0
    kurt = float(np.mean(dev ** 4) / (var ** 2) - 3.0) if var > 1e-12 else 0.0
    ptp = float(np.ptp(arr))
    return mean, std, var, skew, kurt, ptp


def fast_find_cusum_changepoint(x: np.ndarray) -> int:
    """Locate primary CUSUM changepoint at native compiled speed."""
    arr = np.ascontiguousarray(x, dtype=np.float64)
    n = len(arr)

    if _RUST_AVAILABLE and _RUST_LIB is not None:
        data_ptr = arr.ctypes.data_as(POINTER(c_double))
        return int(_RUST_LIB.rust_fast_cusum_changepoint(data_ptr, c_size_t(n)))

    if _NUMBA_AVAILABLE:
        return int(_numba_fast_cusum(arr))

    mean = np.mean(arr)
    cusum = np.cumsum(arr - mean)
    return int(np.argmax(np.abs(cusum)))


def fast_rqa_determinism(x: np.ndarray, eps: float = 0.2, min_line_len: int = 2) -> float:
    """Compute Recurrence Quantification determinism at native speed."""
    arr = np.ascontiguousarray(x, dtype=np.float64)
    n = len(arr)

    if _RUST_AVAILABLE and _RUST_LIB is not None:
        data_ptr = arr.ctypes.data_as(POINTER(c_double))
        return float(_RUST_LIB.rust_fast_rqa_determinism(
            data_ptr, c_size_t(n), c_double(eps), c_size_t(min_line_len)
        ))

    if _NUMBA_AVAILABLE:
        return float(_numba_fast_rqa_determinism(arr, float(eps), int(min_line_len)))

    # Vectorized fallback
    diff_mat = np.abs(arr[:, None] - arr[None, :])
    rec_mat = (diff_mat <= eps).astype(np.int32)
    diag_pts = 0
    total_rec = int(np.sum(rec_mat)) - n
    for d in range(1, n):
        diag = np.diagonal(rec_mat, offset=d)
        curr = 0
        for val in diag:
            if val == 1:
                curr += 1
            else:
                if curr >= min_line_len:
                    diag_pts += curr
                curr = 0
        if curr >= min_line_len:
            diag_pts += curr
    return float(diag_pts / max(1, total_rec))
