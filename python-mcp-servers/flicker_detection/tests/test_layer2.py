"""Tests for Layer 2 — SSIM analysis with synthetic frames."""

import os
import tempfile

import numpy as np
import pytest
from PIL import Image


def _create_frame(width: int, height: int, color: int, noise: float = 0) -> str:
    """Create a synthetic grayscale JPEG frame."""
    arr = np.full((height, width), color, dtype=np.uint8)
    if noise > 0:
        noise_arr = np.random.normal(0, noise, (height, width)).astype(np.int16)
        arr = np.clip(arr.astype(np.int16) + noise_arr, 0, 255).astype(np.uint8)

    img = Image.fromarray(arr, mode="L")
    fd, path = tempfile.mkstemp(suffix=".jpg")
    os.close(fd)
    img.save(path, "JPEG")
    return path


class TestSSIMComputation:
    def test_identical_frames_ssim_near_one(self):
        """Identical frames should have SSIM ~1.0."""
        from services.layer2_analysis import _compute_ssim_pair

        frame = _create_frame(360, 640, 128)
        score = _compute_ssim_pair((frame, frame, 8))
        assert score > 0.99, f"Identical frames should have SSIM > 0.99, got {score}"
        os.unlink(frame)

    def test_different_frames_ssim_low(self):
        """Very different frames should have low SSIM."""
        from services.layer2_analysis import _compute_ssim_pair

        frame_a = _create_frame(360, 640, 30)
        frame_b = _create_frame(360, 640, 220)
        score = _compute_ssim_pair((frame_a, frame_b, 8))
        assert score < 0.5, f"Very different frames should have SSIM < 0.5, got {score}"
        os.unlink(frame_a)
        os.unlink(frame_b)

    def test_similar_frames_ssim_high(self):
        """Slightly noisy frames should still have high SSIM."""
        from services.layer2_analysis import _compute_ssim_pair

        frame_a = _create_frame(360, 640, 128, noise=5)
        frame_b = _create_frame(360, 640, 128, noise=5)
        score = _compute_ssim_pair((frame_a, frame_b, 8))
        assert score > 0.7, f"Similar frames should have SSIM > 0.7, got {score}"
        os.unlink(frame_a)
        os.unlink(frame_b)

    def test_ssim_pair_is_picklable(self):
        """_compute_ssim_pair must be picklable (top-level function)."""
        import pickle
        from services.layer2_analysis import _compute_ssim_pair

        pickled = pickle.dumps(_compute_ssim_pair)
        unpickled = pickle.loads(pickled)
        assert callable(unpickled)


class TestAdaptiveThreshold:
    def test_threshold_with_few_scores(self):
        """Should return 0.92 fallback when <10 scores."""
        from services.layer2_analysis import FrameAnalyzer

        threshold = FrameAnalyzer.compute_adaptive_threshold([0.95, 0.96, 0.97])
        assert threshold == 0.92

    def test_threshold_with_stable_scores(self):
        """Stable scores should produce threshold near median."""
        from services.layer2_analysis import FrameAnalyzer

        scores = [0.98, 0.97, 0.99, 0.98, 0.97, 0.98, 0.99, 0.97, 0.98, 0.99,
                  0.98, 0.97, 0.99, 0.98, 0.97]
        threshold = FrameAnalyzer.compute_adaptive_threshold(scores)
        assert 0.90 < threshold < 1.0, f"Expected threshold near 0.95-0.97, got {threshold}"

    def test_threshold_floor_at_070(self):
        """Threshold should never go below 0.70."""
        from services.layer2_analysis import FrameAnalyzer

        # Very noisy scores with huge std
        scores = [0.1, 0.9, 0.1, 0.9, 0.1, 0.9, 0.1, 0.9, 0.1, 0.9, 0.1, 0.9]
        threshold = FrameAnalyzer.compute_adaptive_threshold(scores)
        assert threshold >= 0.70, f"Threshold floor should be 0.70, got {threshold}"


class TestFlickerClassification:
    def test_single_glitch(self):
        """Single below-threshold score should be classified as single_glitch."""
        from services.layer2_analysis import FrameAnalyzer

        analyzer = FrameAnalyzer()
        scores = [0.98, 0.98, 0.60, 0.98, 0.98]
        events = analyzer.classify_flickers(scores, 0.92, ["f1", "f2", "f3", "f4", "f5"])
        assert len(events) == 1
        assert events[0].pattern == "single_glitch"

    def test_sustained_change(self):
        """Multiple consecutive below-threshold scores -> sustained_change."""
        from services.layer2_analysis import FrameAnalyzer

        analyzer = FrameAnalyzer()
        scores = [0.98, 0.60, 0.55, 0.50, 0.98]
        events = analyzer.classify_flickers(scores, 0.92, ["f1", "f2", "f3", "f4", "f5"])
        assert len(events) == 1
        assert events[0].pattern == "sustained_change"

    def test_severity_high(self):
        """SSIM < 0.5 should be HIGH severity."""
        from services.layer2_analysis import FrameAnalyzer

        analyzer = FrameAnalyzer()
        scores = [0.98, 0.30, 0.98]
        events = analyzer.classify_flickers(scores, 0.92, ["f1", "f2", "f3"])
        assert len(events) == 1
        assert events[0].severity == "HIGH"

    def test_no_flickers_above_threshold(self):
        """All scores above threshold -> no flicker events."""
        from services.layer2_analysis import FrameAnalyzer

        analyzer = FrameAnalyzer()
        scores = [0.98, 0.97, 0.99, 0.98]
        events = analyzer.classify_flickers(scores, 0.92, ["f1", "f2", "f3", "f4"])
        assert len(events) == 0


class TestParallelSSIM:
    def test_parallel_computation(self):
        """Parallel SSIM should produce correct number of scores."""
        from services.layer2_analysis import FrameAnalyzer

        frames = [_create_frame(360, 640, 128) for _ in range(5)]
        analyzer = FrameAnalyzer()
        scores = analyzer.compute_ssim_parallel(frames, max_workers=2)

        assert len(scores) == 4  # N-1 pairs for N frames
        assert all(0 <= s <= 1 for s in scores)

        for f in frames:
            os.unlink(f)

    def test_parallel_empty_input(self):
        """Empty or single frame should return empty scores."""
        from services.layer2_analysis import FrameAnalyzer

        analyzer = FrameAnalyzer()
        assert analyzer.compute_ssim_parallel([]) == []
        assert analyzer.compute_ssim_parallel(["single_frame.jpg"]) == []
