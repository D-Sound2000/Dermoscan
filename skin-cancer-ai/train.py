"""
Two-phase training for DenseNet121 skin lesion classifier.

Phase 1  — backbone frozen, only head trained  (--phase1-epochs, default 10)
Phase 2  — full network fine-tuned             (--phase2-epochs, default 20)

Early stopping monitors val macro-AUC; best checkpoint saved to checkpoints/.

Usage:
    python train.py --splits-dir data/splits --epochs1 10 --epochs2 20
"""

import argparse
import csv
import time
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import roc_auc_score
import numpy as np

from dataset import SkinLesionDataset, NUM_CLASSES, CLASSES
from model import build_model, freeze_backbone, unfreeze_all


# ── Helpers ──────────────────────────────────────────────────────────────────

def get_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def make_loader(csv_path: Path, split: str, batch_size: int, num_workers: int) -> DataLoader:
    ds = SkinLesionDataset(csv_path, split=split)
    shuffle = split == "train"
    return DataLoader(
        ds,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=num_workers,
        pin_memory=True,
        persistent_workers=num_workers > 0,
    )


def compute_macro_auc(
    model: nn.Module, loader: DataLoader, device: torch.device
) -> float:
    """Run inference on loader and return macro-averaged one-vs-rest AUC."""
    model.eval()
    all_probs, all_labels = [], []
    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device, non_blocking=True)
            logits = model(images)
            probs = torch.softmax(logits, dim=1).cpu().numpy()
            all_probs.append(probs)
            all_labels.append(labels.numpy())

    all_probs  = np.concatenate(all_probs,  axis=0)
    all_labels = np.concatenate(all_labels, axis=0)

    try:
        auc = roc_auc_score(
            all_labels, all_probs,
            multi_class="ovr", average="macro",
            labels=list(range(NUM_CLASSES)),
        )
    except ValueError:
        auc = 0.0
    return float(auc)


def train_one_epoch(
    model: nn.Module,
    loader: DataLoader,
    optimizer: torch.optim.Optimizer,
    criterion: nn.Module,
    device: torch.device,
) -> float:
    model.train()
    running_loss = 0.0
    for images, labels in loader:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)

        optimizer.zero_grad()
        logits = model(images)
        loss = criterion(logits, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
    return running_loss / len(loader.dataset)


def save_checkpoint(
    model: nn.Module,
    epoch: int,
    val_auc: float,
    ckpt_dir: Path,
    filename: str = "best.pt",
) -> None:
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    path = ckpt_dir / filename
    torch.save({
        "epoch": epoch,
        "val_auc": val_auc,
        "model_state_dict": model.state_dict(),
        "classes": CLASSES,
    }, path)
    print(f"  Checkpoint saved → {path}  (val_auc={val_auc:.4f})")


# ── Training loop ─────────────────────────────────────────────────────────────

def run_phase(
    phase: int,
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    optimizer: torch.optim.Optimizer,
    scheduler,
    criterion: nn.Module,
    device: torch.device,
    num_epochs: int,
    patience: int,
    ckpt_dir: Path,
    log_writer: csv.writer,
) -> float:
    """Train for one phase; return best val AUC seen in this phase."""
    best_auc = 0.0
    no_improve = 0
    filename = f"best_phase{phase}.pt"

    for epoch in range(1, num_epochs + 1):
        t0 = time.time()
        train_loss = train_one_epoch(model, train_loader, optimizer, criterion, device)
        val_auc = compute_macro_auc(model, val_loader, device)
        elapsed = time.time() - t0

        print(
            f"  Phase {phase} | Epoch {epoch:>3}/{num_epochs} "
            f"| loss {train_loss:.4f} | val_auc {val_auc:.4f} "
            f"| {elapsed:.1f}s"
        )
        log_writer.writerow([phase, epoch, f"{train_loss:.6f}", f"{val_auc:.6f}"])

        if scheduler is not None:
            scheduler.step(val_auc)

        if val_auc > best_auc:
            best_auc = val_auc
            no_improve = 0
            save_checkpoint(model, epoch, val_auc, ckpt_dir, filename)
            # Also keep a global best
            save_checkpoint(model, epoch, val_auc, ckpt_dir, "best.pt")
        else:
            no_improve += 1
            if no_improve >= patience:
                print(f"  Early stopping triggered after {patience} epochs without improvement.")
                break

    return best_auc


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--splits-dir",  type=Path, default=Path("data/splits"))
    parser.add_argument("--ckpt-dir",    type=Path, default=Path("checkpoints"))
    parser.add_argument("--epochs1",     type=int,  default=10,  help="Phase 1 epochs (frozen backbone)")
    parser.add_argument("--epochs2",     type=int,  default=20,  help="Phase 2 epochs (full fine-tune)")
    parser.add_argument("--batch-size",  type=int,  default=32)
    parser.add_argument("--lr1",         type=float, default=1e-3, help="Phase 1 LR (head only)")
    parser.add_argument("--lr2",         type=float, default=1e-4, help="Phase 2 LR (full network)")
    parser.add_argument("--patience",    type=int,  default=5,   help="Early stopping patience")
    parser.add_argument("--workers",     type=int,  default=4)
    args = parser.parse_args()

    device = get_device()
    print(f"Device: {device}")

    # Data
    train_loader = make_loader(args.splits_dir / "train.csv", "train", args.batch_size, args.workers)
    val_loader   = make_loader(args.splits_dir / "val.csv",   "val",   args.batch_size, args.workers)

    # Class-weighted loss
    train_ds: SkinLesionDataset = train_loader.dataset  # type: ignore[assignment]
    class_weights = train_ds.class_weights.to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    print(f"Class weights: {class_weights.cpu().tolist()}")

    # Model
    model = build_model(num_classes=NUM_CLASSES, pretrained=True).to(device)

    # Log file
    log_path = args.ckpt_dir / "training_log.csv"
    args.ckpt_dir.mkdir(parents=True, exist_ok=True)
    log_file = open(log_path, "w", newline="")
    log_writer = csv.writer(log_file)
    log_writer.writerow(["phase", "epoch", "train_loss", "val_auc"])

    # ── Phase 1: train head only ──────────────────────────────────────────────
    print("\n=== Phase 1: Training head (backbone frozen) ===")
    freeze_backbone(model)
    optimizer1 = torch.optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()), lr=args.lr1
    )
    scheduler1 = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer1, mode="max", factor=0.5, patience=2
    )
    run_phase(1, model, train_loader, val_loader, optimizer1, scheduler1,
              criterion, device, args.epochs1, args.patience, args.ckpt_dir, log_writer)

    # ── Phase 2: fine-tune entire network ────────────────────────────────────
    print("\n=== Phase 2: Fine-tuning full network ===")
    unfreeze_all(model)
    optimizer2 = torch.optim.Adam(model.parameters(), lr=args.lr2, weight_decay=1e-4)
    scheduler2 = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer2, T_max=args.epochs2, eta_min=1e-6
    )
    run_phase(2, model, train_loader, val_loader, optimizer2, scheduler2,
              criterion, device, args.epochs2, args.patience, args.ckpt_dir, log_writer)

    log_file.close()
    print(f"\nTraining complete. Log → {log_path}")


if __name__ == "__main__":
    main()
