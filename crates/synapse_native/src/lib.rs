//! SYNAPSE High-Performance Rust Mathematical Kernel.
//! Provides native C-compatible FFI entry points for ultra-fast time-series analysis,
//! recurrence quantification, changepoint detection, and statistical profiling.

use std::slice;

/// Vectorized descriptive statistics: mean, std, variance, skewness, kurtosis, ptp.
#[no_mangle]
pub unsafe extern "C" fn rust_fast_stats(
    data: *const f64,
    len: usize,
    out_mean: *mut f64,
    out_std: *mut f64,
    out_var: *mut f64,
    out_skew: *mut f64,
    out_kurt: *mut f64,
    out_ptp: *mut f64,
) -> i32 {
    if data.is_null() || len == 0 {
        return -1;
    }
    let slice = slice::from_raw_parts(data, len);

    let mut sum = 0.0;
    let mut min_val = slice[0];
    let mut max_val = slice[0];

    for &x in slice {
        sum += x;
        if x < min_val { min_val = x; }
        if x > max_val { max_val = x; }
    }

    let mean = sum / (len as f64);
    let mut m2 = 0.0;
    let mut m3 = 0.0;
    let mut m4 = 0.0;

    for &x in slice {
        let diff = x - mean;
        let d2 = diff * diff;
        m2 += d2;
        m3 += d2 * diff;
        m4 += d2 * d2;
    }

    let var = if len > 1 { m2 / ((len - 1) as f64) } else { 0.0 };
    let std = var.sqrt();

    let skew = if std > 1e-12 {
        (m3 / (len as f64)) / (std * std * std)
    } else {
        0.0
    };

    let kurt = if var > 1e-12 {
        ((m4 / (len as f64)) / (var * var)) - 3.0 // Excess kurtosis
    } else {
        0.0
    };

    if !out_mean.is_null() { *out_mean = mean; }
    if !out_std.is_null() { *out_std = std; }
    if !out_var.is_null() { *out_var = var; }
    if !out_skew.is_null() { *out_skew = skew; }
    if !out_kurt.is_null() { *out_kurt = kurt; }
    if !out_ptp.is_null() { *out_ptp = max_val - min_val; }

    0
}

/// Fast Cumulative Sum (CUSUM) changepoint locator in Rust.
#[no_mangle]
pub unsafe extern "C" fn rust_fast_cusum_changepoint(
    data: *const f64,
    len: usize,
) -> usize {
    if data.is_null() || len < 4 {
        return 0;
    }
    let slice = slice::from_raw_parts(data, len);

    let mut sum = 0.0;
    for &x in slice { sum += x; }
    let mean = sum / (len as f64);

    let mut cusum = 0.0;
    let mut max_dev = 0.0;
    let mut best_idx = 0;

    for (i, &x) in slice.iter().enumerate() {
        cusum += x - mean;
        let abs_cusum = cusum.abs();
        if abs_cusum > max_dev {
            max_dev = abs_cusum;
            best_idx = i;
        }
    }

    best_idx
}

/// Fast Recurrence Quantification Analysis (RQA) determinism calculation in Rust.
#[no_mangle]
pub unsafe extern "C" fn rust_fast_rqa_determinism(
    data: *const f64,
    len: usize,
    eps: f64,
    min_line_len: usize,
) -> f64 {
    if data.is_null() || len < 10 {
        return 0.0;
    }
    let slice = slice::from_raw_parts(data, len);
    let n = len;

    let mut total_recurrence_points = 0usize;
    let mut diagonal_line_points = 0usize;

    // Scan upper diagonal lines
    for d in 1..n {
        let mut current_line = 0usize;
        for i in 0..(n - d) {
            let j = i + d;
            let dist = (slice[i] - slice[j]).abs();
            if dist <= eps {
                total_recurrence_points += 1;
                current_line += 1;
            } else {
                if current_line >= min_line_len {
                    diagonal_line_points += current_line;
                }
                current_line = 0;
            }
        }
        if current_line >= min_line_len {
            diagonal_line_points += current_line;
        }
    }

    if total_recurrence_points == 0 {
        0.0
    } else {
        (diagonal_line_points as f64) / (total_recurrence_points as f64)
    }
}
