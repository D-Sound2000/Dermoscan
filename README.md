# DermoScan

AI-assisted skin lesion classifier built on DenseNet121, trained on ISIC data.

## What it does

Produces benign and malignant research-model scores for dermoscopy images and a Grad-CAM heatmap highlighting regions that influenced the malignant output. DermoScan is an educational documentation and triage-support project, not a diagnostic device.

- **Model**: DenseNet121 binary research classifier
- **Backend**: FastAPI (`/predict`, `/predict-with-heatmap`)
- **Frontend**: Next.js 14
- **Safety**: client-side image-quality checks, non-diagnostic language, and no substitute heatmaps
- **Workflow**: private lesion history, visual comparisons, observations, and printable clinician handoff

The repository contains older experimental multi-class training files alongside the deployed binary API. Reported experiment metrics should not be treated as the performance of the deployed checkpoint until a frozen, reproducible held-out evaluation is published.

## Running locally

**API server**
```bash
source venv/bin/activate
uvicorn api:app --host 0.0.0.0 --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

## Project structure

```
api.py              FastAPI inference server
gradcam.py          Grad-CAM implementation for DenseNet121
train_v4.ipynb      Training notebook (Kaggle)
dataset.py          ISIC dataset loader
model.py            Model definition
frontend/           Next.js UI
```

> For informational purposes only. Not a substitute for professional medical advice.
