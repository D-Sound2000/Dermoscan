"""
Download ISIC images using isic-cli and organize by diagnosis label.

Usage:
    python download_data.py --limit 2000 --outdir data/raw
    python download_data.py --limit 0          # 0 = no limit (download all)
"""

import argparse
import csv
import os
import shutil
import subprocess
import sys
from pathlib import Path

# Mapping from ISIC metadata diagnosis strings -> our 8 canonical class names.
# Keys are lowercased substrings matched against the raw metadata diagnosis field.
DIAGNOSIS_MAP = {
    "melanoma": "melanoma",
    "melanocytic nevus": "nevus",
    "nevus": "nevus",
    "basal cell carcinoma": "bcc",
    "actinic keratosis": "ak",
    "seborrheic keratosis": "bkl",
    "solar lentigo": "bkl",
    "lichen planus-like keratosis": "bkl",
    "benign keratosis": "bkl",
    "dermatofibroma": "df",
    "vascular lesion": "vasc",
    "angioma": "vasc",
    "squamous cell carcinoma": "scc",
}

CLASSES = ["melanoma", "nevus", "bcc", "ak", "bkl", "df", "vasc", "scc"]


def map_diagnosis(raw: str) -> str | None:
    """Map a raw diagnosis string to one of our 8 class labels, or None."""
    if not raw:
        return None
    lower = raw.strip().lower()
    for key, label in DIAGNOSIS_MAP.items():
        if key in lower:
            return label
    return None


def run_isic_download(outdir: Path, limit: int) -> None:
    """Call isic-cli to download images + metadata into outdir."""
    outdir.mkdir(parents=True, exist_ok=True)
    cmd = ["isic", "image", "download", "--limit", str(limit), str(outdir)]
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, check=False)
    if result.returncode != 0:
        print("isic image download exited with a non-zero code. "
              "Some images may be missing — continuing.", file=sys.stderr)


def organize_by_diagnosis(raw_dir: Path, dest_dir: Path) -> dict[str, int]:
    """
    Read metadata.csv from raw_dir, then hard-link (or copy) images into
    dest_dir/{label}/ subdirectories.

    Returns a count dict {label: n_images}.
    """
    metadata_path = raw_dir / "metadata.csv"
    if not metadata_path.exists():
        sys.exit(f"metadata.csv not found in {raw_dir}. Did the download succeed?")

    counts: dict[str, int] = {cls: 0 for cls in CLASSES}
    skipped = 0

    # Create class subdirectories
    for cls in CLASSES:
        (dest_dir / cls).mkdir(parents=True, exist_ok=True)

    with metadata_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"Metadata rows: {len(rows)}")
    print(f"Columns: {rows[0].keys() if rows else 'N/A'}")

    # Try to detect the diagnosis column name
    diag_col = None
    for candidate in ("diagnosis", "diagnosis_3", "diagnosis_1", "clinical_diagnosis"):
        if rows and candidate in rows[0]:
            diag_col = candidate
            break
    if diag_col is None and rows:
        # Fall back: pick any column containing "diagnosis"
        for col in rows[0].keys():
            if "diagnosis" in col.lower():
                diag_col = col
                break
    if diag_col is None:
        sys.exit("Could not find a diagnosis column in metadata.csv. "
                 "Available columns: " + (", ".join(rows[0].keys()) if rows else "none"))

    print(f"Using diagnosis column: '{diag_col}'")

    for row in rows:
        isic_id = row.get("isic_id", "").strip()
        raw_diagnosis = row.get(diag_col, "")
        label = map_diagnosis(raw_diagnosis)

        if label is None:
            skipped += 1
            continue

        # isic-cli saves images as {isic_id}.JPG (uppercase extension)
        src = None
        for ext in (".JPG", ".jpg", ".JPEG", ".jpeg", ".png", ".PNG"):
            candidate = raw_dir / f"{isic_id}{ext}"
            if candidate.exists():
                src = candidate
                break

        if src is None:
            skipped += 1
            continue

        dst = dest_dir / label / src.name
        if not dst.exists():
            try:
                os.link(src, dst)          # hard-link (no extra disk space)
            except OSError:
                shutil.copy2(src, dst)     # fallback: copy
        counts[label] += 1

    return counts, skipped


def main() -> None:
    parser = argparse.ArgumentParser(description="Download and organize ISIC images.")
    parser.add_argument("--limit", type=int, default=500,
                        help="Max images to download per run (0 = no limit).")
    parser.add_argument("--outdir", type=Path, default=Path("data/raw"),
                        help="Directory for raw downloads.")
    parser.add_argument("--organized-dir", type=Path, default=Path("data/organized"),
                        help="Output directory organized by class label.")
    parser.add_argument("--skip-download", action="store_true",
                        help="Skip download; only re-organize existing data/raw.")
    args = parser.parse_args()

    raw_dir = args.outdir
    organized_dir = args.organized_dir

    if not args.skip_download:
        run_isic_download(raw_dir, args.limit)
    else:
        print("Skipping download — using existing files in", raw_dir)

    print("\nOrganizing images by diagnosis …")
    counts, skipped = organize_by_diagnosis(raw_dir, organized_dir)

    print("\n=== Class distribution ===")
    total = sum(counts.values())
    for cls in CLASSES:
        print(f"  {cls:<12} {counts[cls]:>5}")
    print(f"  {'TOTAL':<12} {total:>5}")
    print(f"  Skipped (unknown/missing): {skipped}")
    print(f"\nOrganized images saved to: {organized_dir.resolve()}")


if __name__ == "__main__":
    main()
