# skin-cancer-ai

DenseNet121-based binary skin lesion classifier (Benign / Malignant) trained on ISIC data.

## Project structure

```
skin-cancer-ai/
├── api.py                  # FastAPI inference server (port 8000)
├── best_model.pth          # Trained checkpoint (epoch 13, val_auc 0.9869)
├── train_v4.ipynb          # Clean binary training notebook (use this one)
├── train_kaggle.ipynb      # Original 8-class notebook (reference only)
├── train_v3.ipynb          # Deprecated binary attempt (had AUC bugs)
├── dataset.py              # SkinLesionDataset class
├── model.py                # build_model / freeze_backbone / unfreeze_all
├── train.py                # Local training script
├── evaluate.py             # Evaluation script
├── download_data.py        # ISIC download + organise by diagnosis
├── preprocess.py           # Stratified split builder
├── frontend/               # Next.js UI (port 3000)
│   └── app/
│       ├── page.jsx        # Main upload + results page
│       ├── page.module.css # Component styles
│       ├── layout.jsx      # Root layout + Google Fonts
│       └── globals.css     # CSS variables + resets
├── checkpoints/            # Per-phase checkpoint saves
├── data/                   # Local data (excluded from Windows copy)
└── venv/                   # Python virtual environment
```

## Classes

| Label     | Index | Mapping                        |
|-----------|-------|--------------------------------|
| Benign    | 0     | Nevus only                     |
| Malignant | 1     | Everything else (MEL, BCC, …)  |

## Running

### API server
```bash
source venv/bin/activate
uvicorn api:app --host 0.0.0.0 --port 8000
# CORS enabled for localhost:3000
```

### Frontend
```bash
cd frontend
npm install
npm run dev         # http://localhost:3000
```

### Training (Kaggle)
Upload `train_v4.ipynb` to Kaggle with dataset at `/kaggle/working/isic_data/`.
Best model saves to `/kaggle/working/best_model.pth`.

## Model

- **Architecture**: DenseNet121 (ImageNet pretrained) → Linear(1024,256) → ReLU → Dropout(0.4) → Linear(256,2)
- **Training**: Phase 1 — frozen backbone, LR 1e-3, 5 epochs. Phase 2 — full fine-tune, LR 1e-5, 15 epochs.
- **Loss**: CrossEntropyLoss with sklearn `compute_class_weight('balanced')`
- **Best checkpoint**: epoch 13, val_auc 0.9869

## Key decisions

- `compute_macro_auc` uses `roc_auc_score(labels, probs[:, 1])` — binary form, not multiclass.
- Scheduler: `ReduceLROnPlateau` in Phase 1, `CosineAnnealingLR` in Phase 2. `run_phase` checks type before calling `.step()`.
- CORS middleware in `api.py` allows requests from `localhost:3000`.
