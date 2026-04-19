"""
FastAPI inference server for DenseNet121 binary skin lesion classifier.

Usage:
    uvicorn api:app --host 0.0.0.0 --port 8000

    # Health check
    curl http://localhost:8000/health

    # Predict
    curl -X POST http://localhost:8000/predict -F "file=@lesion.jpg"

Environment variables:
    CHECKPOINT_PATH  — path to best_model.pth  (default: best_model.pth)
    THRESHOLD        — malignant prob threshold for "Seek dermatologist" (default: 0.5)
"""

import io
import os
from pathlib import Path

from fastapi.middleware.cors import CORSMiddleware

import numpy as np
import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from torchvision.models import DenseNet121_Weights
from PIL import Image
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from gradcam import GradCAM, overlay_heatmap, pil_to_base64

# ── Config ────────────────────────────────────────────────────────────────────

CHECKPOINT_PATH  = Path(os.getenv("CHECKPOINT_PATH", "best_model.pth"))
_THRESHOLD_ENV   = os.getenv("THRESHOLD")          # explicit override wins
_THRESHOLD_DEFAULT = 0.2274                         # calibrated threshold (fallback if checkpoint has none)

CLASSES     = ["Benign", "Malignant"]
NUM_CLASSES = 2

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]
IMAGE_SIZE    = 224

RECOMMENDATIONS = {
    "Benign":    "Lesion appears benign. Continue routine skin self-exams and annual dermatology check-ups.",
    "Malignant": "Lesion flagged as potentially malignant. Please consult a dermatologist promptly for further evaluation.",
}

# ── Model ─────────────────────────────────────────────────────────────────────

def build_model() -> nn.Module:
    model = models.densenet121(weights=None)
    in_features = model.classifier.in_features  # 1024
    model.classifier = nn.Sequential(
        nn.Linear(in_features, 256),
        nn.ReLU(inplace=True),
        nn.Dropout(p=0.4),
        nn.Linear(256, NUM_CLASSES),
    )
    return model


def load_model(ckpt_path: Path, device: torch.device) -> tuple[nn.Module, float | None]:
    if not ckpt_path.exists():
        raise FileNotFoundError(f"Checkpoint not found: {ckpt_path}")
    ckpt = torch.load(ckpt_path, map_location=device, weights_only=True)
    model = build_model()
    model.load_state_dict(ckpt["model_state_dict"])
    model.to(device).eval()
    epoch          = ckpt.get("epoch", "?")
    val_auc        = ckpt.get("val_auc", 0.0)
    ckpt_threshold = ckpt.get("threshold")   # None if not present (old checkpoint)
    print(f"Loaded checkpoint — epoch {epoch}, val_auc {val_auc:.4f}")
    return model, ckpt_threshold


# ── Preprocessing ─────────────────────────────────────────────────────────────

_preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(IMAGE_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])

# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Skin Lesion Classifier",
    description="DenseNet121 binary classifier — Benign / Malignant.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://172.24.76.36:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_device: torch.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_model: nn.Module | None = None
THRESHOLD: float = _THRESHOLD_DEFAULT


@app.on_event("startup")
def startup() -> None:
    global _model, THRESHOLD
    print(f"Device: {_device}")
    try:
        _model, ckpt_threshold = load_model(CHECKPOINT_PATH, _device)
        if _THRESHOLD_ENV is not None:
            THRESHOLD = float(_THRESHOLD_ENV)
            print(f"Threshold overridden by env var: {THRESHOLD}")
        elif ckpt_threshold is not None:
            THRESHOLD = ckpt_threshold
            print(f"Threshold loaded from checkpoint: {THRESHOLD}")
        else:
            THRESHOLD = _THRESHOLD_DEFAULT
            print(f"Threshold using default: {THRESHOLD}")
        print("Model ready.")
    except FileNotFoundError as exc:
        print(f"WARNING: {exc}. /predict will return 503 until a checkpoint is available.")


# ── Response schemas ──────────────────────────────────────────────────────────

class Prediction(BaseModel):
    predicted_class: str
    malignant_probability: float
    benign_probability: float
    threshold_used: float
    recommendation: str


class PredictionWithHeatmap(BaseModel):
    predicted_class: str
    malignant_probability: float
    benign_probability: float
    threshold_used: float
    recommendation: str
    heatmap_image: str   # base64 data-URI  (data:image/jpeg;base64,...)


class Health(BaseModel):
    status: str
    model_loaded: bool
    checkpoint: str
    device: str
    threshold: float


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health", response_model=Health)
def health() -> Health:
    return Health(
        status="ok",
        model_loaded=_model is not None,
        checkpoint=str(CHECKPOINT_PATH),
        device=str(_device),
        threshold=THRESHOLD,
    )


@app.post("/predict", response_model=Prediction)
async def predict(file: UploadFile = File(...)) -> Prediction:
    if _model is None:
        raise HTTPException(
            status_code=503,
            detail=f"Model not loaded. Ensure {CHECKPOINT_PATH} exists and restart.",
        )

    if file.content_type not in ("image/jpeg", "image/jpg", "image/png"):
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{file.content_type}'. Upload a JPEG or PNG.",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not decode image: {exc}") from exc

    tensor = _preprocess(image).unsqueeze(0).to(_device)

    with torch.no_grad():
        probs = torch.softmax(_model(tensor), dim=1).squeeze(0).cpu().tolist()

    benign_prob    = round(probs[0], 4)
    malignant_prob = round(probs[1], 4)
    predicted      = "Malignant" if malignant_prob >= THRESHOLD else "Benign"

    return Prediction(
        predicted_class=predicted,
        malignant_probability=malignant_prob,
        benign_probability=benign_prob,
        threshold_used=THRESHOLD,
        recommendation=RECOMMENDATIONS[predicted],
    )


@app.post("/predict-with-heatmap", response_model=PredictionWithHeatmap)
async def predict_with_heatmap(file: UploadFile = File(...)) -> PredictionWithHeatmap:
    if _model is None:
        raise HTTPException(
            status_code=503,
            detail=f"Model not loaded. Ensure {CHECKPOINT_PATH} exists and restart.",
        )

    if file.content_type not in ("image/jpeg", "image/jpg", "image/png"):
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{file.content_type}'. Upload a JPEG or PNG.",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not decode image: {exc}") from exc

    # Preprocess (same pipeline as /predict)
    tensor = _preprocess(image).unsqueeze(0).to(_device)

    # ── Standard inference ────────────────────────────────────────────────────
    with torch.no_grad():
        probs = torch.softmax(_model(tensor), dim=1).squeeze(0).cpu().tolist()

    benign_prob    = round(probs[0], 4)
    malignant_prob = round(probs[1], 4)
    predicted      = "Malignant" if malignant_prob >= THRESHOLD else "Benign"

    # ── Grad-CAM for malignant class (index 1) ────────────────────────────────
    gcam = GradCAM(_model)
    try:
        cam = gcam.compute(tensor, class_idx=1)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Grad-CAM failed: {exc}") from exc
    finally:
        gcam.remove()

    # Overlay heatmap on the exact 224×224 crop the model was shown
    _to_pil = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(IMAGE_SIZE),
    ])
    cropped = _to_pil(image)

    overlay = overlay_heatmap(cropped, cam, alpha=0.45)
    heatmap_b64 = pil_to_base64(overlay)

    return PredictionWithHeatmap(
        predicted_class=predicted,
        malignant_probability=malignant_prob,
        benign_probability=benign_prob,
        threshold_used=THRESHOLD,
        recommendation=RECOMMENDATIONS[predicted],
        heatmap_image=heatmap_b64,
    )
