"""
FastAPI inference endpoint for the skin lesion classifier.

Endpoints:
    POST /predict   — accepts a JPEG/PNG image upload, returns class probabilities
    GET  /health    — liveness check

Usage:
    uvicorn inference_api:app --host 0.0.0.0 --port 8000

    # Test with curl:
    curl -X POST "http://localhost:8000/predict" \
         -F "file=@/path/to/image.jpg"
"""

import io
import os
from pathlib import Path

import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from dataset import IMAGENET_MEAN, IMAGENET_STD, IMAGE_SIZE, CLASSES
from model import build_model, NUM_CLASSES

# ── Configuration ─────────────────────────────────────────────────────────────

CHECKPOINT_PATH = Path(os.getenv("CHECKPOINT_PATH", "checkpoints/best.pt"))

# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Skin Lesion Classifier",
    description="DenseNet121-based classifier for 8 ISIC skin lesion categories.",
    version="1.0.0",
)


def get_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def load_model(ckpt_path: Path, device: torch.device) -> nn.Module:
    model = build_model(num_classes=NUM_CLASSES, pretrained=False)
    ckpt = torch.load(ckpt_path, map_location=device, weights_only=True)
    model.load_state_dict(ckpt["model_state_dict"])
    model.to(device)
    model.eval()
    return model


_device: torch.device = get_device()
_model: nn.Module | None = None
_preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(IMAGE_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])


@app.on_event("startup")
def startup_event() -> None:
    global _model
    if not CHECKPOINT_PATH.exists():
        print(
            f"WARNING: checkpoint not found at {CHECKPOINT_PATH}. "
            "The /predict endpoint will return 503 until a checkpoint is available."
        )
        return
    print(f"Loading model from {CHECKPOINT_PATH} on {_device} …")
    _model = load_model(CHECKPOINT_PATH, _device)
    print("Model loaded.")


# ── Response schemas ──────────────────────────────────────────────────────────

class PredictionResponse(BaseModel):
    predicted_class: str
    predicted_index: int
    probabilities: dict[str, float]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        model_loaded=_model is not None,
        device=str(_device),
    )


@app.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)) -> PredictionResponse:
    if _model is None:
        raise HTTPException(
            status_code=503,
            detail=f"Model not loaded. Ensure checkpoint exists at {CHECKPOINT_PATH}.",
        )

    # Validate content type
    if file.content_type not in ("image/jpeg", "image/png", "image/jpg"):
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type '{file.content_type}'. Use JPEG or PNG.",
        )

    raw_bytes = await file.read()
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")

    try:
        image = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cannot decode image: {exc}") from exc

    tensor = _preprocess(image).unsqueeze(0).to(_device)

    with torch.no_grad():
        logits = _model(tensor)
        probs  = torch.softmax(logits, dim=1).squeeze(0).cpu().tolist()

    pred_idx = int(torch.argmax(torch.tensor(probs)).item())
    return PredictionResponse(
        predicted_class=CLASSES[pred_idx],
        predicted_index=pred_idx,
        probabilities={cls: round(prob, 6) for cls, prob in zip(CLASSES, probs)},
    )
