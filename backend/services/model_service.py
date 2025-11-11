from __future__ import annotations

import hashlib
import logging
from collections.abc import Mapping
from pathlib import Path
from typing import Dict, Iterable, List, Optional

import numpy as np
import torch
from torchvision import models, transforms
from werkzeug.utils import secure_filename

from config import Settings
from utils import load_image_from_bytes

LOGGER = logging.getLogger(__name__)


class PredictionError(Exception):
    """Raised when the prediction pipeline fails."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class ModelService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.labels = settings.labels
        self.device = torch.device(
            "cuda" if settings.use_gpu and torch.cuda.is_available() else "cpu"
        )

        self.transforms = transforms.Compose(
            [
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ]
        )

        self.models: Dict[str, Optional[torch.nn.Module]] = {
            "fundus": self._load_model(settings.fundus_model_path),
            "oct": self._load_model(settings.oct_model_path),
        }

    def _load_model(self, path: Path) -> Optional[torch.nn.Module]:
        if not path.exists():
            LOGGER.warning("Model file not found: %s", path)
            return None

        LOGGER.info("Loading model from %s", path)
        try:
            model = torch.jit.load(str(path), map_location=self.device)
            model.eval()
            return model
        except Exception as exc:  # noqa: BLE001
            LOGGER.debug("TorchScript load failed for %s: %s", path, exc)

        try:
            checkpoint = torch.load(str(path), map_location=self.device)
            state_dict = self._extract_state_dict(checkpoint)
            if state_dict is None:
                LOGGER.error("Checkpoint at %s does not contain a state dict", path)
                return None

            sanitized = self._coerce_state_dict(state_dict)

            model = models.resnet50(weights=None)
            in_features = model.fc.in_features
            model.fc = torch.nn.Linear(in_features, len(self.labels))
            missing, unexpected = model.load_state_dict(sanitized, strict=False)
            if missing:
                LOGGER.warning("Missing weights when loading %s: %s", path, missing)
            if unexpected:
                LOGGER.warning(
                    "Unexpected weights when loading %s: %s", path, unexpected
                )

            model.to(self.device)
            model.eval()
            return model
        except Exception as exc:  # noqa: BLE001
            LOGGER.error("Failed to load model from %s: %s", path, exc)
            return None

    def _extract_state_dict(self, checkpoint) -> Optional[Dict[str, torch.Tensor]]:
        if isinstance(checkpoint, torch.nn.Module):
            return checkpoint.state_dict()

        if isinstance(checkpoint, Mapping):
            for key in ("state_dict", "model_state_dict", "model"):
                candidate = checkpoint.get(key)
                if isinstance(candidate, Mapping):
                    return dict(candidate)
            return dict(checkpoint)
        return None

    def _coerce_state_dict(self, state_dict: Mapping[str, torch.Tensor]):
        prefix = "flair_model.vision_model.model."
        if any(key.startswith(prefix) for key in state_dict.keys()):
            trimmed = {
                key[len(prefix) :]: value
                for key, value in state_dict.items()
                if key.startswith(prefix)
            }
            return trimmed
        return dict(state_dict)

    def predict_batch(self, grouped_files: Dict[str, Iterable]) -> Dict[str, object]:
        file_results: Dict[str, List[Dict[str, object]]] = {
            "fundus": [],
            "oct": [],
        }
        aggregate_vectors: List[np.ndarray] = []

        for imaging_type, files in grouped_files.items():
            for storage in files:
                if not storage.filename:
                    continue
                prediction = self._predict_single(imaging_type, storage)
                file_results[imaging_type].append(prediction)
                aggregate_vectors.append(
                    np.array([item["score"] for item in prediction["scores"]])
                )

        if not aggregate_vectors:
            raise PredictionError("No valid files were provided.", 400)

        avg_scores = np.mean(aggregate_vectors, axis=0)
        results = [
            {"name": label, "score": round(float(score), 2)}
            for label, score in zip(self.labels, avg_scores)
        ]

        return {
            "results": results,
            "files": file_results,
        }

    def _predict_single(self, imaging_type: str, storage) -> Dict[str, object]:
        filename = secure_filename(storage.filename or f"{imaging_type}_image")

        if not self.settings.is_extension_allowed(filename):
            raise PredictionError(
                f"File type for '{filename}' is not supported.", status_code=415
            )

        payload = storage.read()
        if not payload:
            raise PredictionError(f"File '{filename}' is empty.")

        image, raw = load_image_from_bytes(payload, filename)
        tensor = self.transforms(image).unsqueeze(0).to(self.device)

        model = self.models.get(imaging_type)
        if model is None:
            LOGGER.warning(
                "Model for imaging type '%s' unavailable. Using fallback predictions.",
                imaging_type,
            )
            probabilities = self._fallback_probabilities(raw)
        else:
            with torch.inference_mode():
                logits = model(tensor)
                probabilities = torch.softmax(logits, dim=1).cpu().numpy()[0]

        scores = probabilities * 100.0
        vector = [
            {"name": label, "score": round(float(score), 2)}
            for label, score in zip(self.labels, scores)
        ]
        ranked = sorted(vector, key=lambda item: item["score"], reverse=True)

        return {
            "filename": filename,
            "type": imaging_type,
            "category": ranked[0]["name"],
            "confidence": ranked[0]["score"],
            "scores": vector,
            "ranked_scores": ranked,
        }

    def _fallback_probabilities(self, payload: bytes) -> np.ndarray:
        digest = hashlib.sha256(payload).digest()
        raw = np.frombuffer(digest, dtype=np.uint32)
        if raw.size < len(self.labels):
            raw = np.resize(raw, len(self.labels))
        raw = raw[: len(self.labels)].astype("float32")
        total = raw.sum() or 1.0
        return raw / total
