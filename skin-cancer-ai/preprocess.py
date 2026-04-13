"""
Build stratified train / val / test splits (70 / 15 / 15) from organized images.

Usage:
    python preprocess.py --data-dir data/organized --splits-dir data/splits
"""

import argparse
import csv
import random
from collections import defaultdict
from pathlib import Path

CLASSES = ["melanoma", "nevus", "bcc", "ak", "bkl", "df", "vasc", "scc"]
LABEL2IDX = {cls: i for i, cls in enumerate(CLASSES)}

TRAIN_FRAC = 0.70
VAL_FRAC   = 0.15
# TEST_FRAC = 1 - TRAIN_FRAC - VAL_FRAC = 0.15


def collect_samples(data_dir: Path) -> list[tuple[str, int]]:
    """Return list of (abs_image_path, label_idx) for every image found."""
    samples = []
    for cls in CLASSES:
        cls_dir = data_dir / cls
        if not cls_dir.is_dir():
            print(f"  Warning: class directory not found: {cls_dir}")
            continue
        for img_path in sorted(cls_dir.iterdir()):
            if img_path.suffix.lower() in {".jpg", ".jpeg", ".png"}:
                samples.append((str(img_path.resolve()), LABEL2IDX[cls]))
    return samples


def stratified_split(
    samples: list[tuple[str, int]],
    train_frac: float,
    val_frac: float,
    seed: int = 42,
) -> tuple[list, list, list]:
    """Return (train, val, test) lists with per-class stratification."""
    rng = random.Random(seed)

    by_class: dict[int, list] = defaultdict(list)
    for sample in samples:
        by_class[sample[1]].append(sample)

    train, val, test = [], [], []
    for label_idx, class_samples in sorted(by_class.items()):
        rng.shuffle(class_samples)
        n = len(class_samples)
        n_train = max(1, round(n * train_frac))
        n_val   = max(1, round(n * val_frac))
        # Ensure at least 1 sample in test when n >= 3
        n_train = min(n_train, n - 2) if n >= 3 else n_train

        train.extend(class_samples[:n_train])
        val.extend(class_samples[n_train:n_train + n_val])
        test.extend(class_samples[n_train + n_val:])

    return train, val, test


def write_split(split: list[tuple[str, int]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["image_path", "label_idx", "label_name"])
        for img_path, label_idx in split:
            writer.writerow([img_path, label_idx, CLASSES[label_idx]])


def print_split_stats(name: str, split: list[tuple[str, int]]) -> None:
    counts: dict[int, int] = defaultdict(int)
    for _, label_idx in split:
        counts[label_idx] += 1
    print(f"\n  {name} ({len(split)} images)")
    for cls in CLASSES:
        idx = LABEL2IDX[cls]
        print(f"    {cls:<12} {counts[idx]:>5}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir",   type=Path, default=Path("data/organized"))
    parser.add_argument("--splits-dir", type=Path, default=Path("data/splits"))
    parser.add_argument("--seed",       type=int,  default=42)
    args = parser.parse_args()

    print(f"Scanning {args.data_dir} …")
    samples = collect_samples(args.data_dir)
    if not samples:
        raise RuntimeError(
            f"No images found in {args.data_dir}. "
            "Run download_data.py first."
        )
    print(f"Total images found: {len(samples)}")

    train, val, test = stratified_split(samples, TRAIN_FRAC, VAL_FRAC, args.seed)

    for name, split in [("train", train), ("val", val), ("test", test)]:
        print_split_stats(name, split)

    write_split(train, args.splits_dir / "train.csv")
    write_split(val,   args.splits_dir / "val.csv")
    write_split(test,  args.splits_dir / "test.csv")

    print(f"\nSplits saved to {args.splits_dir.resolve()}")


if __name__ == "__main__":
    main()
