"""
DenseNet121-based skin lesion classifier.

Architecture:
    - Backbone: DenseNet121 pretrained on ImageNet
    - Classifier head replaced with:  Linear(1024 -> 256) -> ReLU -> Dropout(0.4)
                                       -> Linear(256 -> num_classes)

Two helper functions control which parameters are trainable:
    freeze_backbone()   — only the new head is trained (Phase 1)
    unfreeze_all()      — the entire network is trained (Phase 2)
"""

import torch
import torch.nn as nn
from torchvision import models
from torchvision.models import DenseNet121_Weights

NUM_CLASSES = 8


def build_model(num_classes: int = NUM_CLASSES, pretrained: bool = True) -> nn.Module:
    """Load DenseNet121 and replace the classifier head."""
    weights = DenseNet121_Weights.IMAGENET1K_V1 if pretrained else None
    model = models.densenet121(weights=weights)

    in_features = model.classifier.in_features  # 1024 for DenseNet121
    model.classifier = nn.Sequential(
        nn.Linear(in_features, 256),
        nn.ReLU(inplace=True),
        nn.Dropout(p=0.4),
        nn.Linear(256, num_classes),
    )
    return model


def freeze_backbone(model: nn.Module) -> None:
    """Freeze all layers except the classifier head (Phase 1)."""
    for name, param in model.named_parameters():
        param.requires_grad = name.startswith("classifier")


def unfreeze_all(model: nn.Module) -> None:
    """Unfreeze every parameter (Phase 2 fine-tuning)."""
    for param in model.parameters():
        param.requires_grad = True


def count_trainable(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


if __name__ == "__main__":
    m = build_model()
    freeze_backbone(m)
    print(f"Trainable params (frozen backbone): {count_trainable(m):,}")
    unfreeze_all(m)
    print(f"Trainable params (all unfrozen):    {count_trainable(m):,}")
