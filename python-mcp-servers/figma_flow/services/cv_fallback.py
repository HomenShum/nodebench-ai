"""
Phase 3b — CV overlay fallback for when Figma Images API is rate-limited.

Uses brightness thresholding + morphological ops + connected component analysis
to detect flow group regions from a browser screenshot of the Figma canvas.

Dependencies: numpy, PIL (scipy optional for morphological ops).
"""

import logging
from typing import List

import numpy as np
from PIL import Image

from services.models import BoundingBox

logger = logging.getLogger(__name__)

MIN_AREA = 2000
MIN_DIM = 40


class CVOverlayFallback:
    """Detect frame regions via computer vision when API is rate-limited."""

    def detect_frame_regions(self, image_path: str) -> List[BoundingBox]:
        """Detect frame regions via brightness thresholding.

        Process:
        1. Convert to brightness array: mean(axis=2)
        2. Threshold bright content (>80)
        3. Morphological closing (bridge intra-section gaps)
        4. Morphological opening (remove noise)
        5. Connected component labeling
        6. Filter by area and dimensions
        """
        try:
            img = np.array(Image.open(image_path).convert("RGB"), dtype=np.float64)
        except Exception as e:
            logger.error(f"Failed to load image: {e}")
            return []

        # Brightness map
        brightness = img.mean(axis=2)

        # Threshold: detect bright content regions
        binary = (brightness > 80).astype(np.uint8)

        # Morphological ops (pure numpy implementation, no scipy needed)
        binary = self._morphological_close(binary, kernel_size=7, iterations=3)
        binary = self._morphological_open(binary, kernel_size=5, iterations=1)

        # Connected component labeling
        labels, n_components = self._label_components(binary)

        # Extract bounding boxes, filter by area and dimensions
        regions = []
        for label_id in range(1, n_components + 1):
            ys, xs = np.where(labels == label_id)
            if len(ys) == 0:
                continue

            x_min, x_max = int(xs.min()), int(xs.max())
            y_min, y_max = int(ys.min()), int(ys.max())
            w = x_max - x_min
            h = y_max - y_min
            area = w * h

            # Filter
            if area < MIN_AREA or w < MIN_DIM or h < MIN_DIM:
                continue

            # Skip UI chrome (top bar, side panels) — heuristic
            if y_min < 50 or x_min < 50:
                continue

            regions.append(BoundingBox(
                x=float(x_min),
                y=float(y_min),
                width=float(w),
                height=float(h),
            ))

        logger.info(f"CV fallback detected {len(regions)} regions from {n_components} components")
        return regions

    @staticmethod
    def _morphological_close(binary: np.ndarray, kernel_size: int = 7, iterations: int = 3) -> np.ndarray:
        """Morphological closing (dilate then erode) using max/min filters."""
        result = binary.copy()
        pad = kernel_size // 2
        for _ in range(iterations):
            # Dilate (max filter)
            padded = np.pad(result, pad, mode="constant", constant_values=0)
            dilated = np.zeros_like(result)
            for dy in range(kernel_size):
                for dx in range(kernel_size):
                    dilated = np.maximum(dilated, padded[dy:dy + result.shape[0], dx:dx + result.shape[1]])
            result = dilated
        for _ in range(iterations):
            # Erode (min filter)
            padded = np.pad(result, pad, mode="constant", constant_values=1)
            eroded = np.ones_like(result)
            for dy in range(kernel_size):
                for dx in range(kernel_size):
                    eroded = np.minimum(eroded, padded[dy:dy + result.shape[0], dx:dx + result.shape[1]])
            result = eroded
        return result

    @staticmethod
    def _morphological_open(binary: np.ndarray, kernel_size: int = 5, iterations: int = 1) -> np.ndarray:
        """Morphological opening (erode then dilate)."""
        result = binary.copy()
        pad = kernel_size // 2
        for _ in range(iterations):
            # Erode
            padded = np.pad(result, pad, mode="constant", constant_values=1)
            eroded = np.ones_like(result)
            for dy in range(kernel_size):
                for dx in range(kernel_size):
                    eroded = np.minimum(eroded, padded[dy:dy + result.shape[0], dx:dx + result.shape[1]])
            result = eroded
        for _ in range(iterations):
            # Dilate
            padded = np.pad(result, pad, mode="constant", constant_values=0)
            dilated = np.zeros_like(result)
            for dy in range(kernel_size):
                for dx in range(kernel_size):
                    dilated = np.maximum(dilated, padded[dy:dy + result.shape[0], dx:dx + result.shape[1]])
            result = dilated
        return result

    @staticmethod
    def _label_components(binary: np.ndarray) -> tuple:
        """Simple connected component labeling (4-connectivity)."""
        h, w = binary.shape
        labels = np.zeros_like(binary, dtype=np.int32)
        current_label = 0
        equivalences: dict = {}

        def find(x):
            while equivalences.get(x, x) != x:
                x = equivalences[x]
            return x

        # First pass
        for y in range(h):
            for x in range(w):
                if binary[y, x] == 0:
                    continue

                neighbors = []
                if y > 0 and labels[y - 1, x] > 0:
                    neighbors.append(labels[y - 1, x])
                if x > 0 and labels[y, x - 1] > 0:
                    neighbors.append(labels[y, x - 1])

                if not neighbors:
                    current_label += 1
                    labels[y, x] = current_label
                else:
                    min_label = min(find(n) for n in neighbors)
                    labels[y, x] = min_label
                    for n in neighbors:
                        root = find(n)
                        if root != min_label:
                            equivalences[root] = min_label

        # Second pass — resolve equivalences
        for y in range(h):
            for x in range(w):
                if labels[y, x] > 0:
                    labels[y, x] = find(labels[y, x])

        # Renumber labels
        unique = sorted(set(labels.flat) - {0})
        remap = {old: new for new, old in enumerate(unique, 1)}
        for y in range(h):
            for x in range(w):
                if labels[y, x] > 0:
                    labels[y, x] = remap[labels[y, x]]

        return labels, len(unique)
