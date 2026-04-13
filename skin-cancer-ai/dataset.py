"""
PyTorch Dataset for skin lesion classification.

Augmentation is applied only to the training split.
Val/test use deterministic resize + center-crop + normalize.
"""

import csv
from pathlib import Path

from PIL import Image
import torch
from torch.utils.data import Dataset
from torchvision import transforms

CLASSES = ["melanoma", "nevus", "bcc", "ak", "bkl", "df", "vasc", "scc"]
NUM_CLASSES = len(CLASSES)

# ImageNet statistics (DenseNet121 pretrained on ImageNet)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

IMAGE_SIZE = 224   # DenseNet121 default input size


def get_transforms(split: str) -> transforms.Compose:
    """Return the appropriate transform pipeline for the given split."""
    if split == "train":
        return transforms.Compose([
            transforms.Resize(256),
            transforms.RandomCrop(IMAGE_SIZE),
            transforms.RandomHorizontalFlip(),
            transforms.RandomVerticalFlip(),
            transforms.RandomRotation(20),
            transforms.ColorJitter(
                brightness=0.2, contrast=0.2, saturation=0.2, hue=0.05
            ),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ])
    else:  # val / test
        return transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(IMAGE_SIZE),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ])


class SkinLesionDataset(Dataset):
    """
    Reads a CSV produced by preprocess.py with columns:
        image_path, label_idx, label_name

    Args:
        csv_path: Path to train.csv / val.csv / test.csv.
        split:    One of "train", "val", "test" — controls augmentation.
        transform: Optional override; if None, uses get_transforms(split).
    """

    def __init__(
        self,
        csv_path: str | Path,
        split: str = "train",
        transform: transforms.Compose | None = None,
    ) -> None:
        self.split = split
        self.transform = transform or get_transforms(split)
        self.samples: list[tuple[str, int]] = []

        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                self.samples.append((row["image_path"], int(row["label_idx"])))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        img_path, label = self.samples[idx]
        image = Image.open(img_path).convert("RGB")
        image = self.transform(image)
        return image, label

    @property
    def class_counts(self) -> list[int]:
        """Return number of samples per class (indexed by label_idx)."""
        counts = [0] * NUM_CLASSES
        for _, label in self.samples:
            counts[label] += 1
        return counts

    @property
    def class_weights(self) -> torch.Tensor:
        """
        Inverse-frequency class weights for use with CrossEntropyLoss.
        Weight for class c = total_samples / (num_classes * count_c).
        """
        counts = self.class_counts
        total = sum(counts)
        weights = [
            total / (NUM_CLASSES * max(c, 1)) for c in counts
        ]
        return torch.tensor(weights, dtype=torch.float)
