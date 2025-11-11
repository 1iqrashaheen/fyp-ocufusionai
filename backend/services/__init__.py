"""Service layer for model loading and inference."""

from .model_service import ModelService, PredictionError  # noqa: F401

__all__ = ["ModelService", "PredictionError"]
