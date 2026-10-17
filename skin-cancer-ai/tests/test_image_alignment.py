"""Regression checks for model input and Grad-CAM background alignment.

Run from skin-cancer-ai with: python -m unittest discover -s tests -v
"""

import unittest

import numpy as np
from PIL import Image
import torch
from torchvision import transforms

import api


class ImageAlignmentTests(unittest.TestCase):
    def test_heatmap_background_matches_model_pixels_at_each_aspect_ratio(self):
        rng = np.random.default_rng(42)
        mean = torch.tensor(api.IMAGENET_MEAN)[:, None, None]
        std = torch.tensor(api.IMAGENET_STD)[:, None, None]

        for width, height in [(900, 600), (600, 900), (600, 600)]:
            with self.subTest(width=width, height=height):
                image = Image.fromarray(rng.integers(0, 256, (height, width, 3), dtype=np.uint8))
                displayed_crop = api._center_crop_for_model(image)
                self.assertEqual(displayed_crop.size, (224, 224))
                model_pixels = api._preprocess(image) * std + mean
                displayed_pixels = transforms.ToTensor()(displayed_crop)
                torch.testing.assert_close(model_pixels, displayed_pixels, rtol=0, atol=1e-7)

    def test_prediction_preprocessing_retains_existing_model_contract(self):
        image = Image.fromarray(np.random.default_rng(7).integers(0, 256, (600, 900, 3), dtype=np.uint8))
        original_pipeline = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(api.IMAGENET_MEAN, api.IMAGENET_STD),
        ])
        torch.testing.assert_close(api._preprocess(image), original_pipeline(image), rtol=0, atol=0)


if __name__ == "__main__":
    unittest.main()
