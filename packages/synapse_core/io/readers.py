"""
Safe Readers for Scientific File Ingestion in SYNAPSE.
Constructs canonical immutable Signal instances without modifying source data.
"""

from __future__ import annotations
import os
from typing import Optional, List, Dict, Any, Union
import numpy as np
import pandas as pd
import h5py

from synapse_core.models.signal import Signal, ChannelInfo
from synapse_core.io.detector import detect_file_format, FileFormat
from synapse_core.exceptions import ValidationError, DataIntegrityError


def read_signal(
    filepath: str,
    time_column: Optional[str] = None,
    signal_columns: Optional[List[str]] = None,
    uniformity_tolerance: float = 1e-4,
    metadata: Optional[Dict[str, Any]] = None,
) -> Signal:
    """
    Ingest a scientific dataset from disk into a canonical immutable Signal.
    Detects format based on content, parses channels, and validates time axis.
    """
    format_type, format_meta = detect_file_format(filepath)

    meta = {
        "source_filepath": os.path.abspath(filepath),
        "detected_format": format_type.value,
        "format_details": format_meta,
    }
    if metadata:
        meta.update(metadata)

    if format_type in (FileFormat.CSV, FileFormat.TSV):
        delimiter = format_meta.get("delimiter", ",")
        return _read_delimited(
            filepath,
            delimiter=delimiter,
            time_column=time_column,
            signal_columns=signal_columns,
            uniformity_tolerance=uniformity_tolerance,
            metadata=meta,
        )

    elif format_type == FileFormat.PARQUET:
        return _read_parquet(
            filepath,
            time_column=time_column,
            signal_columns=signal_columns,
            uniformity_tolerance=uniformity_tolerance,
            metadata=meta,
        )

    elif format_type == FileFormat.NUMPY_NPY:
        return _read_npy(
            filepath,
            uniformity_tolerance=uniformity_tolerance,
            metadata=meta,
        )

    elif format_type == FileFormat.NUMPY_NPZ:
        return _read_npz(
            filepath,
            time_column=time_column,
            signal_columns=signal_columns,
            uniformity_tolerance=uniformity_tolerance,
            metadata=meta,
        )

    elif format_type == FileFormat.HDF5:
        return _read_hdf5(
            filepath,
            time_dataset=time_column,
            signal_datasets=signal_columns,
            uniformity_tolerance=uniformity_tolerance,
            metadata=meta,
        )

    else:
        raise ValidationError(
            f"Unsupported file format '{format_type.value}' for file: '{filepath}'."
        )


def _read_delimited(
    filepath: str,
    delimiter: str,
    time_column: Optional[str],
    signal_columns: Optional[List[str]],
    uniformity_tolerance: float,
    metadata: Dict[str, Any],
) -> Signal:
    df = pd.read_csv(filepath, sep=delimiter)
    if df.empty:
        raise ValidationError(f"Delimited file '{filepath}' contains no data rows.")

    cols = list(df.columns)
    
    # Identify time column
    time_col_name = time_column
    if not time_col_name:
        for candidate in ["time", "timestamp", "timestamps", "t", "time_sec", "epoch"]:
            matched = [c for c in cols if c.strip().lower() == candidate]
            if matched:
                time_col_name = matched[0]
                break

    if time_col_name and time_col_name in df.columns:
        timestamps = df[time_col_name].to_numpy(dtype=np.float64)
        non_time_cols = [c for c in cols if c != time_col_name]
    else:
        # If no explicit time column exists, reject guessing sampling rate without explicit instruction
        raise ValidationError(
            f"Could not identify a time column in '{filepath}'. "
            f"Available columns: {cols}. Please provide 'time_column' explicitly. "
            "Never guess sampling frequency from row index."
        )

    # Determine signal columns
    if signal_columns:
        missing = [c for c in signal_columns if c not in df.columns]
        if missing:
            raise ValidationError(f"Requested signal columns not found: {missing}. Available: {cols}")
        val_cols = signal_columns
    else:
        val_cols = non_time_cols

    if not val_cols:
        raise ValidationError("No numeric signal channels found after separating time column.")

    values = df[val_cols].to_numpy(dtype=np.float64)
    channels = [ChannelInfo(name=str(c)) for c in val_cols]

    return Signal(
        values=values,
        timestamps=timestamps,
        channels=channels,
        uniformity_tolerance=uniformity_tolerance,
        metadata=metadata,
    )


def _read_parquet(
    filepath: str,
    time_column: Optional[str],
    signal_columns: Optional[List[str]],
    uniformity_tolerance: float,
    metadata: Dict[str, Any],
) -> Signal:
    df = pd.read_parquet(filepath)
    if df.empty:
        raise ValidationError(f"Parquet file '{filepath}' contains no rows.")

    cols = list(df.columns)
    time_col_name = time_column
    if not time_col_name:
        for candidate in ["time", "timestamp", "timestamps", "t", "time_sec"]:
            matched = [c for c in cols if c.strip().lower() == candidate]
            if matched:
                time_col_name = matched[0]
                break

    if not time_col_name or time_col_name not in df.columns:
        raise ValidationError(
            f"Parquet file requires explicit 'time_column'. Available columns: {cols}"
        )

    timestamps = df[time_col_name].to_numpy(dtype=np.float64)
    val_cols = signal_columns if signal_columns else [c for c in cols if c != time_col_name]
    values = df[val_cols].to_numpy(dtype=np.float64)
    channels = [ChannelInfo(name=str(c)) for c in val_cols]

    return Signal(
        values=values,
        timestamps=timestamps,
        channels=channels,
        uniformity_tolerance=uniformity_tolerance,
        metadata=metadata,
    )


def _read_npy(
    filepath: str,
    uniformity_tolerance: float,
    metadata: Dict[str, Any],
) -> Signal:
    """
    Read NumPy .npy array. If 2D with shape (N, 2), first column is treated as time,
    second as signal, unless metadata indicates otherwise.
    """
    arr = np.load(filepath, mmap_mode="r")
    if arr.ndim == 2 and arr.shape[1] >= 2:
        timestamps = np.array(arr[:, 0], dtype=np.float64)
        values = np.array(arr[:, 1:], dtype=np.float64)
        channels = [ChannelInfo(name=f"npy_ch_{i}") for i in range(values.shape[1])]
    else:
        raise ValidationError(
            f"Direct .npy file requires at least 2 columns [time, channel_1, ...] to avoid guessing time axis. Shape was {arr.shape}."
        )

    return Signal(
        values=values,
        timestamps=timestamps,
        channels=channels,
        uniformity_tolerance=uniformity_tolerance,
        metadata=metadata,
    )


def _read_npz(
    filepath: str,
    time_column: Optional[str],
    signal_columns: Optional[List[str]],
    uniformity_tolerance: float,
    metadata: Dict[str, Any],
) -> Signal:
    data = np.load(filepath)
    keys = list(data.files)

    t_key = time_column
    if not t_key:
        for candidate in ["time", "timestamps", "t"]:
            if candidate in keys:
                t_key = candidate
                break

    if not t_key or t_key not in data:
        raise ValidationError(f"No valid time array found in NPZ archive. Keys available: {keys}")

    timestamps = np.asarray(data[t_key], dtype=np.float64)

    if signal_columns:
        val_arrays = [np.asarray(data[k], dtype=np.float64) for k in signal_columns]
        val_names = signal_columns
    else:
        val_names = [k for k in keys if k != t_key]
        val_arrays = [np.asarray(data[k], dtype=np.float64) for k in val_names]

    if not val_arrays:
        raise ValidationError("No signal arrays found in NPZ archive.")

    stacked = np.column_stack(val_arrays)
    channels = [ChannelInfo(name=k) for k in val_names]

    return Signal(
        values=stacked,
        timestamps=timestamps,
        channels=channels,
        uniformity_tolerance=uniformity_tolerance,
        metadata=metadata,
    )


def _read_hdf5(
    filepath: str,
    time_dataset: Optional[str],
    signal_datasets: Optional[List[str]],
    uniformity_tolerance: float,
    metadata: Dict[str, Any],
) -> Signal:
    with h5py.File(filepath, "r") as f:
        keys = list(f.keys())
        t_key = time_dataset
        if not t_key:
            for candidate in ["time", "timestamps", "t"]:
                if candidate in keys:
                    t_key = candidate
                    break

        if not t_key or t_key not in f:
            raise ValidationError(f"Could not identify time dataset in HDF5 file. Keys: {keys}")

        timestamps = np.asarray(f[t_key][:], dtype=np.float64)
        sig_keys = signal_datasets if signal_datasets else [k for k in keys if k != t_key]
        val_arrays = [np.asarray(f[k][:], dtype=np.float64) for k in sig_keys]
        values = np.column_stack(val_arrays)
        channels = [ChannelInfo(name=k) for k in sig_keys]

    return Signal(
        values=values,
        timestamps=timestamps,
        channels=channels,
        uniformity_tolerance=uniformity_tolerance,
        metadata=metadata,
    )

