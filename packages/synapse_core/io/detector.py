"""
Content-Based File Format Detector for SYNAPSE.
Inspects binary signatures and content structures rather than trusting file extensions alone.
"""

from __future__ import annotations
import os
from enum import Enum
from typing import Tuple, Dict, Any, Optional

from synapse_core.exceptions import ValidationError


class FileFormat(str, Enum):
    CSV = "csv"
    TSV = "tsv"
    NUMPY_NPY = "npy"
    NUMPY_NPZ = "npz"
    PARQUET = "parquet"
    HDF5 = "hdf5"
    UNKNOWN = "unknown"


# Magic byte signatures
MAGIC_HDF5 = b"\x89HDF\r\n\x1a\n"
MAGIC_PARQUET = b"PAR1"
MAGIC_NPY = b"\x93NUMPY"
MAGIC_ZIP_NPZ = b"PK\x03\x04"


def detect_file_format(filepath: str, sample_size: int = 4096) -> Tuple[FileFormat, Dict[str, Any]]:
    """
    Detect the physical file format through content and signature inspection.
    
    Returns (FileFormat, metadata_dict).
    Raises ValidationError if the file cannot be accessed or is zero bytes.
    """
    if not os.path.exists(filepath):
        raise ValidationError(f"File not found: '{filepath}'.")

    file_size = os.path.getsize(filepath)
    if file_size == 0:
        raise ValidationError(f"File '{filepath}' is empty (0 bytes).")

    with open(filepath, "rb") as f:
        header = f.read(sample_size)

    # 1. HDF5
    if header.startswith(MAGIC_HDF5):
        return FileFormat.HDF5, {"signature": "HDF5", "size_bytes": file_size}

    # 2. NumPy NPY
    if header.startswith(MAGIC_NPY):
        major = header[6]
        minor = header[7]
        return FileFormat.NUMPY_NPY, {"version": f"{major}.{minor}", "size_bytes": file_size}

    # 3. NumPy NPZ (ZIP archive)
    if header.startswith(MAGIC_ZIP_NPZ):
        # Could be NPZ or generic zip
        return FileFormat.NUMPY_NPZ, {"signature": "ZIP_ARCHIVE", "size_bytes": file_size}

    # 4. Parquet (starts with PAR1)
    if header.startswith(MAGIC_PARQUET):
        return FileFormat.PARQUET, {"signature": "Apache Parquet", "size_bytes": file_size}

    # 5. Check text formats (CSV / TSV)
    try:
        text_sample = header.decode("utf-8")
        # Check delimiters
        tab_count = text_sample.count("\t")
        comma_count = text_sample.count(",")
        semicolon_count = text_sample.count(";")
        newline_count = text_sample.count("\n")

        if newline_count > 0:
            if tab_count > comma_count and tab_count > semicolon_count:
                return FileFormat.TSV, {"delimiter": "\t", "size_bytes": file_size}
            elif semicolon_count > comma_count:
                return FileFormat.CSV, {"delimiter": ";", "size_bytes": file_size}
            else:
                return FileFormat.CSV, {"delimiter": ",", "size_bytes": file_size}
    except UnicodeDecodeError:
        pass

    return FileFormat.UNKNOWN, {"size_bytes": file_size}

