from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import List

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(ENV_PATH)
else:
    load_dotenv()  # fall back to system/global env

_DEFAULT_LABELS = [
    "Normal",
    "Diabetic Retinopathy",
"Glaucoma",
"Age-related Macular Degeneration",
"Macular Edema",
"Macular Hole",
"Retinal Detachment",
"Central Serous Retinopathy",
"Hypertensive Retinopathy"
]


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _csv(value: str | None, fallback: List[str]) -> List[str]:
    if not value:
        return list(fallback)
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass
class Settings:
    host: str = os.getenv("FLASK_HOST", "0.0.0.0")
    port: int = int(os.getenv("FLASK_PORT", "5001"))
    debug: bool = _as_bool(os.getenv("FLASK_DEBUG"), False)
    cors_origins: List[str] = field(
        default_factory=lambda: _csv(os.getenv("CORS_ORIGINS"), ["*"])
    )
    fundus_model_path: Path = field(
        default_factory=lambda: BASE_DIR
        / os.getenv(
            "FUNDUS_MODEL_PATH", "models/fundus_checkpoint/checkpoint_best.pth"
        )
    )
    oct_model_path: Path = field(
        default_factory=lambda: BASE_DIR
        / os.getenv("OCT_MODEL_PATH", "models/oct_checkpoint/checkpoint_best.pth")
    )
    use_gpu: bool = _as_bool(os.getenv("USE_GPU"), False)
    labels: List[str] = field(
        default_factory=lambda: _csv(os.getenv("MODEL_LABELS"), _DEFAULT_LABELS)
    )
    max_upload_mb: int = int(os.getenv("MAX_UPLOAD_MB", "25"))
    allowed_extensions: List[str] = field(
        default_factory=lambda: ["png", "jpg", "jpeg", "dcm", "dicom"]
    )

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    def is_extension_allowed(self, filename: str) -> bool:
        suffix = Path(filename or "").suffix.lower().lstrip(".")
        return suffix in {ext.lower() for ext in self.allowed_extensions}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.fundus_model_path = settings.fundus_model_path.expanduser().resolve()
    settings.oct_model_path = settings.oct_model_path.expanduser().resolve()
    return settings
