"""Image loading helpers for standard formats and DICOM files."""

from __future__ import annotations

import io
from pathlib import Path
from typing import Tuple

import numpy as np
from PIL import Image

try:  # Optional dependency for OCT DICOMs.
    import pydicom  # type: ignore
except Exception:  # pragma: no cover - fallback when pydicom missing
    pydicom = None


def _normalize_to_uint8(array: np.ndarray) -> np.ndarray:
    arr = array.astype("float32")
    arr -= arr.min()
    max_val = arr.max() or 1.0
    arr = (arr / max_val) * 255.0
    return arr.clip(0, 255).astype("uint8")


def _dicom_to_image(payload: bytes) -> Image.Image:
    if pydicom is None:
        raise RuntimeError(
            "pydicom is not installed but a DICOM/OCT file was provided."
        )

    dataset = pydicom.dcmread(io.BytesIO(payload))
    array = dataset.pixel_array

    slope = float(getattr(dataset, "RescaleSlope", 1.0))
    intercept = float(getattr(dataset, "RescaleIntercept", 0.0))
    array = array.astype("float32") * slope + intercept

    image = Image.fromarray(_normalize_to_uint8(array))
    return image.convert("RGB")


def load_image_from_bytes(payload: bytes, filename: str) -> Tuple[Image.Image, bytes]:
    """Return a Pillow image (always RGB) and the original payload."""

    suffix = Path(filename or "").suffix.lower()

    if suffix in {".dcm", ".dicom"}:
        image = _dicom_to_image(payload)
    else:
        image = Image.open(io.BytesIO(payload))
        image = image.convert("RGB")

    return image, payload
