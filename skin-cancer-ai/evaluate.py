"""
Evaluate a saved checkpoint on the test set.

Outputs:
  - Per-class AUC-ROC
  - Macro and weighted average AUC
  - Confusion matrix (saved as PNG)
  - Sensitivity and specificity for melanoma

Usage:
    python evaluate.py --checkpoint checkpoints/best.pt --splits-dir data/splits
"""

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import (
    auc,
    confusion_matrix,
    roc_auc_score,
    roc_curve,
    ConfusionMatrixDisplay,
)
from torch.utils.data import DataLoader

from dataset import SkinLesionDataset, CLASSES, NUM_CLASSES
from model import build_model


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
    print(f"Loaded checkpoint from epoch {ckpt.get('epoch', '?')} "
          f"(val_auc={ckpt.get('val_auc', '?'):.4f})")
    return model


@torch.no_grad()
def run_inference(
    model: nn.Module, loader: DataLoader, device: torch.device
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Returns (all_probs, all_preds, all_labels) as numpy arrays."""
    all_probs, all_preds, all_labels = [], [], []
    for images, labels in loader:
        images = images.to(device, non_blocking=True)
        logits = model(images)
        probs = torch.softmax(logits, dim=1).cpu().numpy()
        preds = logits.argmax(dim=1).cpu().numpy()
        all_probs.append(probs)
        all_preds.append(preds)
        all_labels.append(labels.numpy())
    return (
        np.concatenate(all_probs,  axis=0),
        np.concatenate(all_preds,  axis=0),
        np.concatenate(all_labels, axis=0),
    )


def print_per_class_auc(all_probs: np.ndarray, all_labels: np.ndarray) -> None:
    print("\n=== Per-class AUC-ROC (one-vs-rest) ===")
    aucs = []
    for i, cls in enumerate(CLASSES):
        binary_labels = (all_labels == i).astype(int)
        if binary_labels.sum() == 0:
            print(f"  {cls:<12}  N/A (no positive samples)")
            continue
        cls_auc = roc_auc_score(binary_labels, all_probs[:, i])
        aucs.append(cls_auc)
        print(f"  {cls:<12}  {cls_auc:.4f}")

    macro_auc = roc_auc_score(
        all_labels, all_probs,
        multi_class="ovr", average="macro", labels=list(range(NUM_CLASSES))
    )
    weighted_auc = roc_auc_score(
        all_labels, all_probs,
        multi_class="ovr", average="weighted", labels=list(range(NUM_CLASSES))
    )
    print(f"\n  Macro AUC:    {macro_auc:.4f}")
    print(f"  Weighted AUC: {weighted_auc:.4f}")


def plot_confusion_matrix(
    all_preds: np.ndarray, all_labels: np.ndarray, out_path: Path
) -> None:
    cm = confusion_matrix(all_labels, all_preds, labels=list(range(NUM_CLASSES)))
    fig, ax = plt.subplots(figsize=(10, 8))
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=CLASSES)
    disp.plot(ax=ax, colorbar=True, xticks_rotation=45)
    ax.set_title("Confusion Matrix — Test Set")
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"\nConfusion matrix saved → {out_path}")


def melanoma_sensitivity_specificity(
    all_preds: np.ndarray, all_labels: np.ndarray
) -> tuple[float, float]:
    """
    Compute sensitivity (recall) and specificity for melanoma (class 0).
    """
    mel_idx = CLASSES.index("melanoma")
    binary_true = (all_labels == mel_idx).astype(int)
    binary_pred = (all_preds  == mel_idx).astype(int)

    TP = int(((binary_true == 1) & (binary_pred == 1)).sum())
    TN = int(((binary_true == 0) & (binary_pred == 0)).sum())
    FP = int(((binary_true == 0) & (binary_pred == 1)).sum())
    FN = int(((binary_true == 1) & (binary_pred == 0)).sum())

    sensitivity = TP / (TP + FN) if (TP + FN) > 0 else 0.0
    specificity = TN / (TN + FP) if (TN + FP) > 0 else 0.0
    return sensitivity, specificity


def plot_roc_melanoma(
    all_probs: np.ndarray, all_labels: np.ndarray, out_path: Path
) -> None:
    mel_idx = CLASSES.index("melanoma")
    binary_labels = (all_labels == mel_idx).astype(int)
    fpr, tpr, _ = roc_curve(binary_labels, all_probs[:, mel_idx])
    roc_auc = auc(fpr, tpr)

    fig, ax = plt.subplots(figsize=(6, 5))
    ax.plot(fpr, tpr, label=f"Melanoma AUC = {roc_auc:.4f}", lw=2)
    ax.plot([0, 1], [0, 1], "k--", lw=1)
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curve — Melanoma")
    ax.legend(loc="lower right")
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"Melanoma ROC curve saved → {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint",  type=Path, default=Path("checkpoints/best.pt"))
    parser.add_argument("--splits-dir",  type=Path, default=Path("data/splits"))
    parser.add_argument("--batch-size",  type=int,  default=32)
    parser.add_argument("--workers",     type=int,  default=4)
    parser.add_argument("--output-dir",  type=Path, default=Path("checkpoints"))
    args = parser.parse_args()

    device = get_device()
    print(f"Device: {device}")

    test_ds = SkinLesionDataset(args.splits_dir / "test.csv", split="test")
    test_loader = DataLoader(
        test_ds, batch_size=args.batch_size,
        shuffle=False, num_workers=args.workers, pin_memory=True
    )
    print(f"Test set: {len(test_ds)} images")

    model = load_model(args.checkpoint, device)
    all_probs, all_preds, all_labels = run_inference(model, test_loader, device)

    print_per_class_auc(all_probs, all_labels)

    cm_path  = args.output_dir / "confusion_matrix.png"
    roc_path = args.output_dir / "roc_melanoma.png"
    plot_confusion_matrix(all_preds, all_labels, cm_path)
    plot_roc_melanoma(all_probs, all_labels, roc_path)

    sensitivity, specificity = melanoma_sensitivity_specificity(all_preds, all_labels)
    print(f"\n=== Melanoma ===")
    print(f"  Sensitivity (recall): {sensitivity:.4f}")
    print(f"  Specificity:          {specificity:.4f}")


if __name__ == "__main__":
    main()
