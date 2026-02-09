"""
Layer 2 — Frame extraction + SSIM analysis.

Extracts frames from video using ffmpeg (with scene filter + fallback),
computes block-based SSIM in parallel, classifies flicker events.

CRITICAL GOTCHAS:
- `-pix_fmt yuvj420p` is REQUIRED for ffmpeg 8.x MJPEG encoder
- Scene filter fallback: if 0 frames produced, retry without scene filter
- _compute_ssim_pair() MUST be a top-level function (pickle/ProcessPoolExecutor constraint)
- Adaptive threshold: max(0.70, median - 2*std), fallback to 0.92 if <10 scores
- JPEG not PNG (100x smaller, negligible accuracy loss at 360px resize)
"""

import logging
import os
import subprocess
from concurrent.futures import ProcessPoolExecutor
from typing import List, Optional, Tuple

import numpy as np
from PIL import Image

from services.models import FlickerEvent, LogcatEntry

logger = logging.getLogger(__name__)

# SSIM constants
C1 = (0.01 * 255) ** 2
C2 = (0.03 * 255) ** 2
BLOCK_SIZE = 8
RESIZE_WIDTH = 360


# ─── Top-level function for pickle compatibility with ProcessPoolExecutor ────
def _compute_ssim_pair(args: tuple) -> float:
    """Compute block-based SSIM between two grayscale frames.

    MUST be a top-level module function — pickle can't serialize bound methods or lambdas.
    """
    frame_a_path, frame_b_path, block_size = args

    try:
        img_a = Image.open(frame_a_path).convert("L")
        img_b = Image.open(frame_b_path).convert("L")

        # Resize to RESIZE_WIDTH maintaining aspect ratio
        w, h = img_a.size
        scale = RESIZE_WIDTH / w
        new_h = int(h * scale)
        img_a = img_a.resize((RESIZE_WIDTH, new_h), Image.LANCZOS)
        img_b = img_b.resize((RESIZE_WIDTH, new_h), Image.LANCZOS)

        arr_a = np.array(img_a, dtype=np.float64)
        arr_b = np.array(img_b, dtype=np.float64)

        # Block-based SSIM
        rows, cols = arr_a.shape
        block_scores = []

        for r in range(0, rows - block_size + 1, block_size):
            for c in range(0, cols - block_size + 1, block_size):
                block_a = arr_a[r:r + block_size, c:c + block_size]
                block_b = arr_b[r:r + block_size, c:c + block_size]

                mu_a = block_a.mean()
                mu_b = block_b.mean()
                sigma_a_sq = block_a.var()
                sigma_b_sq = block_b.var()
                sigma_ab = ((block_a - mu_a) * (block_b - mu_b)).mean()

                numerator = (2 * mu_a * mu_b + C1) * (2 * sigma_ab + C2)
                denominator = (mu_a ** 2 + mu_b ** 2 + C1) * (sigma_a_sq + sigma_b_sq + C2)

                block_scores.append(numerator / denominator if denominator > 0 else 1.0)

        return float(np.mean(block_scores)) if block_scores else 1.0

    except Exception as e:
        logger.error(f"SSIM computation failed for {frame_a_path} vs {frame_b_path}: {e}")
        return 1.0


class FrameAnalyzer:
    def __init__(
        self,
        ffmpeg_path: str = "ffmpeg",
        output_dir: str = "/tmp/flicker_detection/frames",
    ):
        self.ffmpeg_path = ffmpeg_path
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def extract_frames(
        self,
        video_path: str,
        fps: int = 15,
        scene_threshold: float = 0.08,
        use_scene_filter: bool = True,
    ) -> List[str]:
        """Extract key frames from video using ffmpeg.

        Uses scene filter for smart extraction, falls back to regular fps extraction
        if scene filter produces 0 frames (common with short/static videos).

        CRITICAL: -pix_fmt yuvj420p is REQUIRED for ffmpeg 8.x MJPEG encoder.
        """
        frame_paths = []

        if use_scene_filter:
            frame_paths = self._extract_with_scene_filter(video_path, fps, scene_threshold)

        # Fallback: if scene filter produced 0 frames, extract without it
        if not frame_paths:
            logger.info("Scene filter produced 0 frames, falling back to regular extraction")
            frame_paths = self._extract_regular(video_path, fps)

        return frame_paths

    def _extract_with_scene_filter(
        self, video_path: str, fps: int, threshold: float
    ) -> List[str]:
        """Extract frames using ffmpeg scene change detection."""
        pattern = os.path.join(self.output_dir, "frame_%05d.jpg")

        cmd = [
            self.ffmpeg_path,
            "-i", video_path,
            "-vf", f"select='gt(scene,{threshold})',fps={fps}",
            "-vsync", "0",
            "-pix_fmt", "yuvj420p",  # REQUIRED for ffmpeg 8.x
            "-q:v", "5",
            pattern,
            "-y",
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                logger.warning(f"ffmpeg scene extraction failed: {result.stderr[:300]}")
                return []
        except subprocess.TimeoutExpired:
            logger.warning("ffmpeg scene extraction timed out")
            return []

        return self._collect_frame_paths()

    def _extract_regular(self, video_path: str, fps: int) -> List[str]:
        """Extract frames at regular fps intervals (no scene filter)."""
        # Clear any previous frames
        for f in os.listdir(self.output_dir):
            if f.startswith("frame_") and f.endswith(".jpg"):
                os.remove(os.path.join(self.output_dir, f))

        pattern = os.path.join(self.output_dir, "frame_%05d.jpg")

        cmd = [
            self.ffmpeg_path,
            "-i", video_path,
            "-vf", f"fps={fps}",
            "-pix_fmt", "yuvj420p",  # REQUIRED for ffmpeg 8.x
            "-q:v", "5",
            pattern,
            "-y",
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                logger.warning(f"ffmpeg regular extraction failed: {result.stderr[:300]}")
                return []
        except subprocess.TimeoutExpired:
            logger.warning("ffmpeg regular extraction timed out")
            return []

        return self._collect_frame_paths()

    def _collect_frame_paths(self) -> List[str]:
        """Collect sorted frame file paths from output directory."""
        paths = []
        for f in sorted(os.listdir(self.output_dir)):
            if f.startswith("frame_") and f.endswith(".jpg"):
                paths.append(os.path.join(self.output_dir, f))
        return paths

    def compute_ssim_parallel(
        self, frame_paths: List[str], max_workers: int = 4, block_size: int = BLOCK_SIZE
    ) -> List[float]:
        """Compute SSIM for consecutive frame pairs using parallel workers.

        Uses ProcessPoolExecutor with top-level _compute_ssim_pair function
        (pickle constraint: can't use bound methods or lambdas).
        """
        if len(frame_paths) < 2:
            return []

        pairs = [
            (frame_paths[i], frame_paths[i + 1], block_size)
            for i in range(len(frame_paths) - 1)
        ]

        scores = []
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            scores = list(executor.map(_compute_ssim_pair, pairs))

        return [round(s, 6) for s in scores]

    @staticmethod
    def compute_adaptive_threshold(scores: List[float]) -> float:
        """Compute adaptive SSIM threshold.

        Formula: max(0.70, median(scores) - 2 * std(scores))
        Fallback: 0.92 if <10 scores.
        """
        if len(scores) < 10:
            return 0.92

        median = float(np.median(scores))
        std = float(np.std(scores))
        return max(0.70, median - 2 * std)

    def classify_flickers(
        self,
        ssim_scores: List[float],
        threshold: float,
        frame_paths: List[str],
        fps: int = 15,
    ) -> List[FlickerEvent]:
        """Classify flicker events from SSIM scores below threshold.

        Groups consecutive below-threshold frames.
        Patterns:
        - rapid_oscillation: SSIM alternates high/low >= 3 times
        - sustained_change: stays low for multiple frames
        - single_glitch: isolated single-frame drop

        Severity:
        - HIGH: min SSIM < 0.5 OR duration > 1s
        - MEDIUM: min SSIM < 0.7 OR duration > 500ms
        - LOW: everything else
        """
        events = []
        i = 0

        while i < len(ssim_scores):
            if ssim_scores[i] < threshold:
                start = i
                while i < len(ssim_scores) and ssim_scores[i] < threshold:
                    i += 1
                end = i - 1

                event_scores = ssim_scores[start:end + 1]
                start_time = start / fps
                end_time = (end + 1) / fps
                duration_ms = (end_time - start_time) * 1000

                # Classify pattern
                if end - start == 0:
                    pattern = "single_glitch"
                elif self._is_oscillation(ssim_scores, start, end, threshold):
                    pattern = "rapid_oscillation"
                else:
                    pattern = "sustained_change"

                # Classify severity
                min_ssim = min(event_scores)
                if min_ssim < 0.5 or duration_ms > 1000:
                    severity = "HIGH"
                elif min_ssim < 0.7 or duration_ms > 500:
                    severity = "MEDIUM"
                else:
                    severity = "LOW"

                # Collect frame paths for this event
                event_frame_paths = []
                for idx in range(start, min(end + 2, len(frame_paths))):
                    if idx < len(frame_paths):
                        event_frame_paths.append(frame_paths[idx])

                events.append(FlickerEvent(
                    start_frame=start,
                    end_frame=end,
                    start_time=round(start_time, 3),
                    end_time=round(end_time, 3),
                    duration_ms=round(duration_ms, 1),
                    pattern=pattern,
                    ssim_scores=event_scores,
                    severity=severity,
                    frame_paths=event_frame_paths[:4],  # Max 4 frames for comparison
                ))
            else:
                i += 1

        return events

    @staticmethod
    def _is_oscillation(scores: List[float], start: int, end: int, threshold: float) -> bool:
        """Check if SSIM alternates high/low >= 3 times around threshold."""
        if end - start < 2:
            return False

        crossings = 0
        above = scores[start] >= threshold
        for i in range(start + 1, min(end + 3, len(scores))):
            current_above = scores[i] >= threshold
            if current_above != above:
                crossings += 1
                above = current_above

        return crossings >= 3

    def compute_region_diff(
        self, frame_a_path: str, frame_b_path: str, grid: int = 4
    ) -> dict:
        """Compute per-region absolute difference to identify WHERE the change occurred.

        Divides frame into grid x grid cells and computes mean absolute difference per cell.
        """
        try:
            img_a = np.array(Image.open(frame_a_path).convert("L").resize((RESIZE_WIDTH, RESIZE_WIDTH)), dtype=np.float64)
            img_b = np.array(Image.open(frame_b_path).convert("L").resize((RESIZE_WIDTH, RESIZE_WIDTH)), dtype=np.float64)

            diff = np.abs(img_a - img_b)
            h, w = diff.shape
            cell_h, cell_w = h // grid, w // grid

            regions = {}
            for r in range(grid):
                for c in range(grid):
                    cell = diff[r * cell_h:(r + 1) * cell_h, c * cell_w:(c + 1) * cell_w]
                    regions[f"r{r}_c{c}"] = round(float(cell.mean()), 2)

            max_region = max(regions, key=regions.get)
            return {
                "grid_size": grid,
                "regions": regions,
                "max_change_region": max_region,
                "max_change_value": regions[max_region],
                "mean_change": round(float(diff.mean()), 2),
            }

        except Exception as e:
            return {"error": str(e)}

    def correlate_with_logcat(
        self,
        events: List[FlickerEvent],
        logcat_entries: List[LogcatEntry],
        window_s: float = 0.5,
    ) -> List[FlickerEvent]:
        """Match logcat events to flicker events within +/- window_s time window."""
        for event in events:
            matched = []
            for entry in logcat_entries:
                if (event.start_time - window_s) <= entry.seconds_since_start <= (event.end_time + window_s):
                    matched.append({
                        "ts": entry.timestamp,
                        "tag": entry.tag,
                        "lvl": entry.level,
                        "msg": entry.message[:200],
                    })
            event.logcat_events = matched[:20]  # Cap at 20 entries per event

        return events
