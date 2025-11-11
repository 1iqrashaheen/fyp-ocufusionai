from __future__ import annotations

import logging
from typing import Dict, List

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from config import get_settings
from services import ModelService, PredictionError

settings = get_settings()
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

model_service = ModelService(settings)


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.update(
        MAX_CONTENT_LENGTH=settings.max_upload_bytes,
        JSON_SORT_KEYS=False,
    )

    cors_origins = settings.cors_origins
    if cors_origins == ["*"]:
        CORS(app)
    else:
        CORS(app, resources={r"/*": {"origins": cors_origins}})

    @app.errorhandler(PredictionError)
    def handle_prediction_error(exc: PredictionError):
        return jsonify({"error": exc.message}), exc.status_code

    @app.errorhandler(413)
    def handle_too_large(_exc):
        return jsonify({"error": "Uploaded file is too large."}), 413

    @app.errorhandler(HTTPException)
    def handle_http_error(exc: HTTPException):
        response = jsonify({"error": exc.description})
        return response, exc.code

    @app.errorhandler(Exception)
    def handle_generic_error(exc: Exception):  # noqa: BLE001
        logging.exception("Unhandled error:", exc_info=exc)
        return jsonify({"error": "Internal server error"}), 500

    @app.route("/", methods=["GET"])
    def index():
        return jsonify(
            {
                "message": "Ocufusion AI backend",
                "health": "/health",
                "predict": "/predict",
            }
        )

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify(
            {
                "status": "ok",
                "device": str(model_service.device),
                "fundus_model_loaded": model_service.models.get("fundus") is not None,
                "oct_model_loaded": model_service.models.get("oct") is not None,
            }
        )

    @app.route("/predict", methods=["POST"])
    def predict():
        grouped_files = _collect_files()
        payload = model_service.predict_batch(grouped_files)
        return jsonify(payload)

    return app


def _collect_files() -> Dict[str, List]:
    grouped = {
        "fundus": request.files.getlist("fundus_images"),
        "oct": request.files.getlist("oct_images"),
    }

    generic = request.files.getlist("image")
    if generic:
        grouped.setdefault("fundus", []).extend(generic)

    grouped = {
        key: [item for item in files if getattr(item, "filename", "")]
        for key, files in grouped.items()
    }

    if not any(grouped.values()):
        raise PredictionError("No files were uploaded.")

    return grouped


app = create_app()

if __name__ == "__main__":
    app.run(host=settings.host, port=settings.port, debug=settings.debug)
