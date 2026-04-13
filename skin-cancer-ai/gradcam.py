"""
Grad-CAM for DenseNet121.

The target layer is model.features — the full feature extractor whose output
is a (B, 1024, 7, 7) tensor for a 224×224 input, sitting just before the
global average pool.  Hooking here gives spatially-resolved gradients that
survive the avg-pool reduction.

Usage:
    gcam = GradCAM(model)
    try:
        cam = gcam.compute(tensor, class_idx=1)   # np.ndarray (H_feat, W_feat)
        overlay = overlay_heatmap(original_image, cam)
        b64 = pil_to_base64(overlay)
    finally:
        gcam.remove()
"""

import base64
import io
import types
import warnings

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import matplotlib.cm as cm
from PIL import Image


# ── Grad-CAM core ─────────────────────────────────────────────────────────────

class GradCAM:
    """
    Registers forward / backward hooks on model.features to capture activations
    and gradients for Grad-CAM.

    Create a new instance per request and call remove() when done to avoid
    hook accumulation.
    """

    def __init__(self, model: nn.Module) -> None:
        self.model = model
        self._activations: torch.Tensor | None = None
        self._gradients:   torch.Tensor | None = None

        # DenseNet's forward() uses F.relu(features, inplace=True) which
        # corrupts gradients when a backward hook sits on model.features.
        # Patch the instance's forward method to use non-inplace relu for
        # the duration of this GradCAM instance.
        self._orig_forward = model.forward

        def _patched_forward(self_m: nn.Module, x: torch.Tensor) -> torch.Tensor:
            features = self_m.features(x)
            out = F.relu(features, inplace=False)   # <-- non-inplace
            out = F.adaptive_avg_pool2d(out, (1, 1))
            out = torch.flatten(out, 1)
            out = self_m.classifier(out)
            return out

        model.forward = types.MethodType(_patched_forward, model)

        target = model.features          # Sequential, outputs (B, 1024, 7, 7)

        self._fwd_hook = target.register_forward_hook(self._capture_activation)
        self._bwd_hook = target.register_full_backward_hook(self._capture_gradient)

    def _capture_activation(self, _module, _input, output: torch.Tensor) -> None:
        self._activations = output.detach()

    def _capture_gradient(self, _module, _grad_in, grad_out: tuple) -> None:
        self._gradients = grad_out[0].detach()

    def remove(self) -> None:
        """Remove hooks and restore the original forward method."""
        self._fwd_hook.remove()
        self._bwd_hook.remove()
        self.model.forward = self._orig_forward

    def compute(self, tensor: torch.Tensor, class_idx: int) -> np.ndarray:
        """
        Run a forward + backward pass and return the Grad-CAM map.

        Args:
            tensor:    Preprocessed input (1, C, H, W) on the correct device.
            class_idx: Target class index (1 = Malignant).

        Returns:
            cam: float32 numpy array of shape (H_feat, W_feat) in [0, 1].
                 For a 224×224 input this is (7, 7).
        """
        self.model.zero_grad()

        # Grad-CAM needs real gradients even in eval mode
        with torch.enable_grad(), warnings.catch_warnings():
            warnings.simplefilter("ignore")
            output = self.model(tensor)          # (1, num_classes)
            output[0, class_idx].backward()      # backprop on target class score

        if self._gradients is None or self._activations is None:
            raise RuntimeError("Hooks did not fire — check target layer.")

        # Global-average-pool the gradients → importance weights  (C,)
        weights = self._gradients[0].mean(dim=(-2, -1))   # (C,)

        # Weighted sum of activation maps → (H_feat, W_feat)
        cam = (weights[:, None, None] * self._activations[0]).sum(dim=0)

        # ReLU: keep only positive activations (regions that push toward class)
        cam = F.relu(cam)

        # Normalise to [0, 1]
        cam_min, cam_max = cam.min(), cam.max()
        if cam_max > cam_min:
            cam = (cam - cam_min) / (cam_max - cam_min)
        else:
            cam = torch.zeros_like(cam)

        return cam.cpu().numpy().astype(np.float32)


# ── Visualisation helpers ─────────────────────────────────────────────────────

def overlay_heatmap(
    image: Image.Image,
    cam: np.ndarray,
    alpha: float = 0.45,
    colormap: str = "jet",
) -> Image.Image:
    """
    Resize cam to image dimensions, apply a matplotlib colormap, and alpha-blend
    with the original image.

    Args:
        image:    Original PIL image (RGB) — the one shown to the user.
        cam:      Grad-CAM array in [0, 1], any spatial resolution.
        alpha:    Heatmap opacity (0 = invisible, 1 = fully opaque).
        colormap: Any matplotlib colormap name.

    Returns:
        Blended PIL image (RGB).
    """
    orig_w, orig_h = image.size

    # Upsample cam to original image resolution
    cam_uint8 = (cam * 255).astype(np.uint8)
    cam_resized = np.array(
        Image.fromarray(cam_uint8).resize((orig_w, orig_h), Image.BILINEAR),
        dtype=np.float32,
    ) / 255.0

    # Apply matplotlib colormap → (H, W, 4) RGBA float → RGB uint8
    cmap   = cm.get_cmap(colormap)
    rgba   = cmap(cam_resized)                              # (H, W, 4)
    heatmap = Image.fromarray(
        (rgba[:, :, :3] * 255).astype(np.uint8), mode="RGB"
    )

    # Alpha-blend heatmap over the original image
    base   = image.convert("RGB")
    result = Image.blend(base, heatmap, alpha=alpha)
    return result


def pil_to_base64(image: Image.Image, fmt: str = "JPEG", quality: int = 88) -> str:
    """Encode a PIL image to a base64 string (data-URI ready)."""
    buf = io.BytesIO()
    image.save(buf, format=fmt, quality=quality)
    encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
    mime = "image/jpeg" if fmt.upper() == "JPEG" else "image/png"
    return f"data:{mime};base64,{encoded}"
