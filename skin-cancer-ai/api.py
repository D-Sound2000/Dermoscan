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

from __future__ import annotations

import base64
import io
import json
import os
from pathlib import Path
import time
from typing import Any
from urllib import error as urlerror
from urllib import request as urlrequest
from uuid import uuid4
from urllib.parse import urlencode
from urllib.request import urlopen

from fastapi.middleware.cors import CORSMiddleware

import numpy as np
from PIL import Image, ImageFilter
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

try:
    import torch
    import torch.nn as nn
    import torchvision.models as models
    import torchvision.transforms as transforms
    from gradcam import GradCAM, overlay_heatmap, pil_to_base64

    _TORCH_IMPORT_ERROR: Exception | None = None
except Exception as exc:
    torch = None
    nn = None
    models = None
    transforms = None
    GradCAM = None
    overlay_heatmap = None
    pil_to_base64 = None
    _TORCH_IMPORT_ERROR = exc

# ── Config ────────────────────────────────────────────────────────────────────

CHECKPOINT_PATH  = Path(os.getenv("CHECKPOINT_PATH", "best_model.pth"))
REPORT_CACHE_PATH = Path(os.getenv("REPORT_CACHE_PATH", ".scan_reports.json"))
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

FALLBACK_RECOMMENDATIONS = {
    "Benign": (
        "Checkpoint unavailable, so DermoScan used a local visual heuristic. "
        "The image trends benign, but this is not a diagnosis."
    ),
    "Malignant": (
        "Checkpoint unavailable, so DermoScan used a local visual heuristic. "
        "The image has higher-risk visual cues; clinician review is recommended."
    ),
}

SCAN_REPORTS: dict[str, dict[str, Any]] = {}


def _load_scan_reports() -> None:
    if not REPORT_CACHE_PATH.exists():
        return

    try:
        cached = json.loads(REPORT_CACHE_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"WARNING: Could not load report cache {REPORT_CACHE_PATH}: {exc}")
        return

    if isinstance(cached, dict):
        SCAN_REPORTS.update({key: value for key, value in cached.items() if isinstance(value, dict)})


def _save_scan_reports() -> None:
    try:
        REPORT_CACHE_PATH.write_text(json.dumps(SCAN_REPORTS, indent=2, sort_keys=True), encoding="utf-8")
    except Exception as exc:
        print(f"WARNING: Could not save report cache {REPORT_CACHE_PATH}: {exc}")


def _load_local_env() -> None:
    """Load local .env values into os.environ without overwriting real env vars."""
    env_path = Path(__file__).with_name(".env")
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip().lstrip("\ufeff")
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_local_env()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_FALLBACK_MODELS = [
    model.strip()
    for model in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-2.5-flash-lite").split(",")
    if model.strip()
]

# ── Model ─────────────────────────────────────────────────────────────────────

def build_model() -> nn.Module:
    if nn is None or models is None:
        raise RuntimeError("PyTorch is unavailable; cannot build DenseNet model.")

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
    if torch is None:
        raise RuntimeError("PyTorch is unavailable; cannot load checkpoint.")

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

_preprocess = (
    transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])
    if transforms is not None
    else None
)

# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Skin Lesion Classifier",
    description="DenseNet121 binary classifier — Benign / Malignant.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://172.24.76.36:3000", "http://172.24.76.36:3001"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_device = (
    torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if torch is not None
    else "unavailable"
)
_model: nn.Module | None = None
THRESHOLD: float = _THRESHOLD_DEFAULT


@app.on_event("startup")
def startup() -> None:
    global _model, THRESHOLD
    _load_scan_reports()
    print(f"Loaded {len(SCAN_REPORTS)} cached scan report(s).")
    print(f"Device: {_device}")
    if torch is None:
        print(f"WARNING: PyTorch import failed ({_TORCH_IMPORT_ERROR}). Using fallback scanner.")
        return

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
        print(f"WARNING: {exc}. Using fallback scanner until a checkpoint is available.")


# ── Response schemas ──────────────────────────────────────────────────────────

class Prediction(BaseModel):
    report_id: str
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


class ChatRequest(BaseModel):
    message: str
    reportId: str


class ChatResponse(BaseModel):
    reply: str
class WeatherMetric(BaseModel):
    time: str
    uv: float


class SkinSafetyWeather(BaseModel):
    city: str
    latitude: float
    longitude: float
    condition: str
    temperature: float
    feels_like: float
    uv_index: float
    humidity: int
    wind_mph: float
    cloud_cover: int
    peak_window: str
    risk_level: str
    skin_safety_score: int
    verdict: str
    recommendation: str
    actions: list[str]
    hourly_uv: list[WeatherMetric]


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


def _fetch_json(url: str) -> dict:
    try:
        with urlopen(url, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Weather provider request failed: {exc}") from exc


def _weather_code_label(code: int) -> str:
    labels = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Rime fog",
        51: "Light drizzle",
        53: "Drizzle",
        55: "Dense drizzle",
        61: "Light rain",
        63: "Rain",
        65: "Heavy rain",
        71: "Light snow",
        73: "Snow",
        75: "Heavy snow",
        80: "Rain showers",
        81: "Rain showers",
        82: "Heavy showers",
        95: "Thunderstorm",
    }
    return labels.get(code, "Mixed conditions")


def _skin_safety_advisory(uv_index: float, temperature: float) -> tuple[int, str, str, str, list[str]]:
    uv_penalty = min(uv_index * 8, 70)
    heat_penalty = 14 if temperature >= 90 else 8 if temperature >= 82 else 3 if temperature >= 75 else 0
    score = max(12, round(100 - uv_penalty - heat_penalty))

    if uv_index >= 8:
        return (
            score,
            "Very High",
            "Limit direct sun",
            "Avoid prolonged outdoor exposure during peak UV hours. Choose shade, SPF 50, and protective clothing.",
            [
                "Avoid direct sun during peak UV hours",
                "Use broad-spectrum SPF 50 and reapply every 2 hours",
                "Wear a wide-brim hat, UV sunglasses, and UPF clothing",
            ],
        )

    if uv_index >= 6:
        return (
            score,
            "High",
            "Go prepared",
            "Outdoor time is reasonable with strong sun protection and breaks from direct sunlight.",
            [
                "Use broad-spectrum SPF 30+",
                "Wear a hat, sunglasses, and light long sleeves",
                "Seek shade around midday",
            ],
        )

    if uv_index >= 3:
        return (
            score,
            "Moderate",
            "Use sunscreen",
            "Normal outdoor activity is okay, but sunscreen is recommended if you will be outside for more than 30 minutes.",
            [
                "Apply SPF 30+ before longer outdoor activity",
                "Bring sunglasses or a cap",
                "Check exposed skin after extended sun exposure",
            ],
        )

    return (
        score,
        "Low",
        "Generally safe",
        "UV exposure is low today. Basic protection is still helpful for long outdoor plans.",
        [
            "Use sunscreen for long outings",
            "Hydrate and monitor heat comfort",
            "Keep routine skin self-checks",
        ],
    )


def _resolve_location(city: str | None, lat: float | None, lon: float | None) -> tuple[str, float, float]:
    if lat is not None and lon is not None:
        return city or "Selected location", lat, lon

    query = (city or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="Provide either city or lat/lon.")

    params = urlencode({"name": query, "count": 1, "language": "en", "format": "json"})
    data = _fetch_json(f"https://geocoding-api.open-meteo.com/v1/search?{params}")
    results = data.get("results") or []
    if not results:
        raise HTTPException(status_code=404, detail=f"Could not find weather location '{query}'.")

    result = results[0]
    name_parts = [result.get("name"), result.get("admin1"), result.get("country_code")]
    label = ", ".join(str(part) for part in name_parts if part)
    return label, float(result["latitude"]), float(result["longitude"])


@app.get("/weather/skin-safety", response_model=SkinSafetyWeather)
def weather_skin_safety(
    city: str | None = "San Jose",
    lat: float | None = None,
    lon: float | None = None,
) -> SkinSafetyWeather:
    label, latitude, longitude = _resolve_location(city, lat, lon)
    params = urlencode({
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,cloud_cover",
        "hourly": "uv_index",
        "forecast_days": 1,
        "temperature_unit": "fahrenheit",
        "wind_speed_unit": "mph",
        "timezone": "auto",
    })
    data = _fetch_json(f"https://api.open-meteo.com/v1/forecast?{params}")

    current = data.get("current") or {}
    hourly = data.get("hourly") or {}
    times = hourly.get("time") or []
    uv_values = [float(value or 0) for value in (hourly.get("uv_index") or [])]
    if not current or not uv_values:
        raise HTTPException(status_code=502, detail="Weather provider response was missing required fields.")

    current_time = str(current.get("time", ""))
    current_hour_prefix = current_time[:13]
    current_uv = uv_values[0]
    for time_value, uv_value in zip(times, uv_values):
        if str(time_value).startswith(current_hour_prefix):
            current_uv = uv_value
            break

    peak_uv = max(uv_values)
    peak_indexes = [index for index, value in enumerate(uv_values) if value == peak_uv]
    start_time = str(times[peak_indexes[0]])[11:16] if times and peak_indexes else "11:00"
    end_index = min((peak_indexes[-1] if peak_indexes else 12) + 1, len(times) - 1)
    end_time = str(times[end_index])[11:16] if times else "15:00"

    temperature = float(current.get("temperature_2m", 0))
    score, risk_level, verdict, recommendation, actions = _skin_safety_advisory(current_uv, temperature)
    sample_indexes = [9, 11, 13, 15, 17]
    hourly_uv = [
        WeatherMetric(time=str(times[index])[11:16], uv=round(uv_values[index], 1))
        for index in sample_indexes
        if index < len(times)
    ]

    return SkinSafetyWeather(
        city=label,
        latitude=latitude,
        longitude=longitude,
        condition=_weather_code_label(int(current.get("weather_code", 0))),
        temperature=round(temperature, 1),
        feels_like=round(float(current.get("apparent_temperature", temperature)), 1),
        uv_index=round(current_uv, 1),
        humidity=int(current.get("relative_humidity_2m", 0)),
        wind_mph=round(float(current.get("wind_speed_10m", 0)), 1),
        cloud_cover=int(current.get("cloud_cover", 0)),
        peak_window=f"{start_time} - {end_time}",
        risk_level=risk_level,
        skin_safety_score=score,
        verdict=verdict,
        recommendation=recommendation,
        actions=actions,
        hourly_uv=hourly_uv,
    )


async def _read_upload_image(file: UploadFile) -> Image.Image:
    if file.content_type not in ("image/jpeg", "image/jpg", "image/png"):
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{file.content_type}'. Upload a JPEG or PNG.",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        return Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not decode image: {exc}") from exc


def _heuristic_prediction(image: Image.Image) -> tuple[str, float, float]:
    """Fallback scorer used only when no checkpoint is available locally."""
    sample = image.resize((IMAGE_SIZE, IMAGE_SIZE)).convert("RGB")
    arr = np.asarray(sample, dtype=np.float32) / 255.0
    gray = arr.mean(axis=2)

    dark_fraction = float((gray < 0.36).mean())
    contrast = float(np.clip(gray.std() / 0.28, 0.0, 1.0))
    red_bias = float(np.clip((arr[:, :, 0] - arr[:, :, 1]).mean() * 2.5, 0.0, 1.0))
    malignant_prob = float(np.clip(0.1 + dark_fraction * 0.46 + contrast * 0.28 + red_bias * 0.16, 0.03, 0.97))
    benign_prob = 1.0 - malignant_prob
    predicted = "Malignant" if malignant_prob >= THRESHOLD else "Benign"
    return predicted, round(malignant_prob, 4), round(benign_prob, 4)


def _center_crop_for_model(image: Image.Image) -> Image.Image:
    resized = image.resize((256, 256), Image.BILINEAR)
    left = (256 - IMAGE_SIZE) // 2
    return resized.crop((left, left, left + IMAGE_SIZE, left + IMAGE_SIZE))


def _pil_to_base64(image: Image.Image, fmt: str = "JPEG", quality: int = 88) -> str:
    buf = io.BytesIO()
    image.save(buf, format=fmt, quality=quality)
    encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
    mime = "image/jpeg" if fmt.upper() == "JPEG" else "image/png"
    return f"data:{mime};base64,{encoded}"


def _overlay_local_heatmap(image: Image.Image, cam: np.ndarray, alpha: float = 0.42) -> Image.Image:
    orig_w, orig_h = image.size
    cam_uint8 = (np.clip(cam, 0.0, 1.0) * 255).astype(np.uint8)
    cam_resized = np.asarray(
        Image.fromarray(cam_uint8).resize((orig_w, orig_h), Image.BILINEAR),
        dtype=np.float32,
    )

    heat = np.zeros((orig_h, orig_w, 3), dtype=np.uint8)
    heat[:, :, 0] = np.clip(72 + cam_resized * 1.45, 0, 255).astype(np.uint8)
    heat[:, :, 1] = np.clip(cam_resized * 0.62, 0, 210).astype(np.uint8)
    heat[:, :, 2] = np.clip(170 - cam_resized * 0.9, 0, 170).astype(np.uint8)

    return Image.blend(image.convert("RGB"), Image.fromarray(heat, "RGB"), alpha=alpha)


def _fallback_heatmap(image: Image.Image) -> str:
    cropped = _center_crop_for_model(image)
    gray = cropped.convert("L").filter(ImageFilter.GaussianBlur(radius=5))
    dark_map = 1.0 - (np.asarray(gray, dtype=np.float32) / 255.0)
    if dark_map.max() > dark_map.min():
        dark_map = (dark_map - dark_map.min()) / (dark_map.max() - dark_map.min())
    overlay = _overlay_local_heatmap(cropped, dark_map.astype(np.float32), alpha=0.42)
    return _pil_to_base64(overlay)


def _risk_level(malignant_probability: float) -> str:
    if malignant_probability >= max(THRESHOLD, 0.65):
        return "high"
    if malignant_probability >= min(THRESHOLD, 0.35):
        return "concerning"
    return "lower"


def _store_report(
    *,
    predicted_class: str,
    malignant_probability: float,
    benign_probability: float,
    recommendation: str,
    heatmap_generated: bool,
) -> str:
    report_id = uuid4().hex
    SCAN_REPORTS[report_id] = {
        "report_id": report_id,
        "created_at": int(time.time()),
        "predicted_class": predicted_class,
        "risk_level": _risk_level(malignant_probability),
        "malignant_probability": malignant_probability,
        "benign_probability": benign_probability,
        "threshold_used": THRESHOLD,
        "recommendation": recommendation,
        "heatmap_generated": heatmap_generated,
        "model": "DenseNet121",
        "explainability": "Grad-CAM" if heatmap_generated else "not requested",
    }
    _save_scan_reports()
    return report_id


def _gemini_prompt(report: dict[str, Any], question: str) -> str:
    context = json.dumps(report, indent=2, sort_keys=True)
    return (
        "DermoScan report context:\n"
        f"{context}\n\n"
        "User question:\n"
        f"{question.strip()}\n\n"
        "Answer using the report context. Explain report findings, ABCDE criteria, and risk levels when relevant."
    )


def _extract_gemini_text(payload: dict[str, Any]) -> str:
    parts = payload.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "\n".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
    if not text:
        raise HTTPException(status_code=502, detail="Gemini returned an empty reply.")
    return text


def _contains_disallowed_diagnosis(reply: str) -> bool:
    lowered = reply.lower()
    blocked_phrases = (
        "you have cancer",
        "you do not have cancer",
        "you don't have cancer",
        "you have skin cancer",
        "you do not have skin cancer",
        "you don't have skin cancer",
    )
    return any(phrase in lowered for phrase in blocked_phrases)


def _gemini_model_candidates() -> list[str]:
    candidates: list[str] = []
    for model in [GEMINI_MODEL, *GEMINI_FALLBACK_MODELS]:
        if model and model not in candidates:
            candidates.append(model)
    return candidates


def _call_gemini_model(model: str, report: dict[str, Any], question: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured on the server.")

    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "systemInstruction": {
            "parts": [
                {
                    "text": (
                        "You are DermoScan educational support. You are not medical advice. "
                        "Explain the DermoScan report in plain language, including ABCDE criteria and risk levels when helpful. "
                        "Do not diagnose. Never say the user has cancer or does not have cancer. "
                        "Use terms such as lower-risk, concerning, or high-risk instead of diagnostic certainty. "
                        "Recommend professional evaluation for concerning or high-risk results. "
                        "Keep answers concise and grounded in the provided report context."
                    )
                }
            ]
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": _gemini_prompt(report, question)}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 700,
            "thinkingConfig": {
                "thinkingBudget": 0,
            },
        },
    }

    req = urlrequest.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(req, timeout=30) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except urlerror.HTTPError:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach Gemini: {exc}") from exc

    reply = _extract_gemini_text(response_payload)
    if _contains_disallowed_diagnosis(reply):
        return (
            "I can explain what the DermoScan report indicates, but I cannot diagnose or rule out cancer. "
            "This report is educational support, not medical advice. For concerning or high-risk results, "
            "please arrange professional evaluation with a qualified clinician."
        )
    return reply


def _call_gemini(report: dict[str, Any], question: str) -> str:
    last_error: str | None = None

    for model in _gemini_model_candidates():
        try:
            return _call_gemini_model(model, report, question)
        except urlerror.HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace")
            last_error = error_body
            print(f"Gemini request failed for {model} with status {exc.code}: {error_body}")
            if exc.code not in (429, 500, 502, 503, 504):
                break

    raise HTTPException(
        status_code=502,
        detail=(
            "Gemini is temporarily unavailable. Please retry in a moment."
            if last_error
            else "Gemini request failed. Check the server-side Gemini configuration."
        ),
    )


@app.post("/predict", response_model=Prediction)
async def predict(file: UploadFile = File(...)) -> Prediction:
    image = await _read_upload_image(file)

    if _model is None or torch is None or _preprocess is None:
        predicted, malignant_prob, benign_prob = _heuristic_prediction(image)
        recommendation = FALLBACK_RECOMMENDATIONS[predicted]
        report_id = _store_report(
            predicted_class=predicted,
            malignant_probability=malignant_prob,
            benign_probability=benign_prob,
            recommendation=recommendation,
            heatmap_generated=False,
        )
        return Prediction(
            report_id=report_id,
            predicted_class=predicted,
            malignant_probability=malignant_prob,
            benign_probability=benign_prob,
            threshold_used=THRESHOLD,
            recommendation=recommendation,
        )

    tensor = _preprocess(image).unsqueeze(0).to(_device)

    with torch.no_grad():
        probs = torch.softmax(_model(tensor), dim=1).squeeze(0).cpu().tolist()

    benign_prob    = round(probs[0], 4)
    malignant_prob = round(probs[1], 4)
    predicted      = "Malignant" if malignant_prob >= THRESHOLD else "Benign"
    recommendation = RECOMMENDATIONS[predicted]
    report_id = _store_report(
        predicted_class=predicted,
        malignant_probability=malignant_prob,
        benign_probability=benign_prob,
        recommendation=recommendation,
        heatmap_generated=False,
    )

    return Prediction(
        report_id=report_id,
        predicted_class=predicted,
        malignant_probability=malignant_prob,
        benign_probability=benign_prob,
        threshold_used=THRESHOLD,
        recommendation=recommendation,
    )


@app.post("/predict-with-heatmap", response_model=PredictionWithHeatmap)
async def predict_with_heatmap(file: UploadFile = File(...)) -> PredictionWithHeatmap:
    image = await _read_upload_image(file)

    if _model is None or torch is None or _preprocess is None:
        predicted, malignant_prob, benign_prob = _heuristic_prediction(image)
        recommendation = FALLBACK_RECOMMENDATIONS[predicted]
        report_id = _store_report(
            predicted_class=predicted,
            malignant_probability=malignant_prob,
            benign_probability=benign_prob,
            recommendation=recommendation,
            heatmap_generated=True,
        )
        return PredictionWithHeatmap(
            report_id=report_id,
            predicted_class=predicted,
            malignant_probability=malignant_prob,
            benign_probability=benign_prob,
            threshold_used=THRESHOLD,
            recommendation=recommendation,
            heatmap_image=_fallback_heatmap(image),
        )

    # Preprocess (same pipeline as /predict)
    tensor = _preprocess(image).unsqueeze(0).to(_device)

    # ── Standard inference ────────────────────────────────────────────────────
    with torch.no_grad():
        probs = torch.softmax(_model(tensor), dim=1).squeeze(0).cpu().tolist()

    benign_prob    = round(probs[0], 4)
    malignant_prob = round(probs[1], 4)
    predicted      = "Malignant" if malignant_prob >= THRESHOLD else "Benign"
    recommendation = RECOMMENDATIONS[predicted]

    # ── Grad-CAM for malignant class (index 1) ────────────────────────────────
    if GradCAM is None or overlay_heatmap is None or pil_to_base64 is None:
        report_id = _store_report(
            predicted_class=predicted,
            malignant_probability=malignant_prob,
            benign_probability=benign_prob,
            recommendation=recommendation,
            heatmap_generated=True,
        )
        return PredictionWithHeatmap(
            report_id=report_id,
            predicted_class=predicted,
            malignant_probability=malignant_prob,
            benign_probability=benign_prob,
            threshold_used=THRESHOLD,
            recommendation=recommendation,
            heatmap_image=_fallback_heatmap(image),
        )

    gcam = GradCAM(_model)
    try:
        cam = gcam.compute(tensor, class_idx=1)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Grad-CAM failed: {exc}") from exc
    finally:
        gcam.remove()

    # Overlay heatmap on the exact 224×224 crop the model was shown
    cropped = _center_crop_for_model(image)

    overlay = overlay_heatmap(cropped, cam, alpha=0.45)
    heatmap_b64 = pil_to_base64(overlay)
    report_id = _store_report(
        predicted_class=predicted,
        malignant_probability=malignant_prob,
        benign_probability=benign_prob,
        recommendation=recommendation,
        heatmap_generated=True,
    )

    return PredictionWithHeatmap(
        report_id=report_id,
        predicted_class=predicted,
        malignant_probability=malignant_prob,
        benign_probability=benign_prob,
        threshold_used=THRESHOLD,
        recommendation=recommendation,
        heatmap_image=heatmap_b64,
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required.")

    report = SCAN_REPORTS.get(request.reportId)
    if report is None:
        raise HTTPException(status_code=404, detail="Scan report not found for reportId.")

    return ChatResponse(reply=_call_gemini(report, message))
