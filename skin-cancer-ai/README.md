# DermoScan

AI-assisted skin lesion classifier built on DenseNet121, trained on ISIC data.

## What it does

Classifies dermoscopy images as **Benign** or **Malignant** with a confidence score and Grad-CAM heatmap highlighting the regions that influenced the prediction.

- **Model**: DenseNet121 — epoch 13, val AUC 0.9869
- **Backend**: FastAPI (`/predict`, `/predict-with-heatmap`)
- **Frontend**: Next.js 14

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
