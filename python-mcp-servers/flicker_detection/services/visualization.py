"""
Visualization — SSIM Timeline Chart + Comparison Images.

All rendering done with PIL (no matplotlib dependency).
"""

import logging
import os
from typing import List

from PIL import Image, ImageDraw, ImageFont

from services.models import FlickerEvent

logger = logging.getLogger(__name__)

# Chart dimensions
CHART_W = 1200
CHART_H = 400
MARGIN_L = 60
MARGIN_R = 30
MARGIN_T = 30
MARGIN_B = 50
PLOT_W = CHART_W - MARGIN_L - MARGIN_R
PLOT_H = CHART_H - MARGIN_T - MARGIN_B

# Colors
BG_COLOR = (255, 255, 255)
GRID_COLOR = (230, 230, 230)
AXIS_COLOR = (100, 100, 100)
LINE_COLOR = (41, 128, 185)  # Blue
THRESHOLD_COLOR = (231, 76, 60)  # Red
FLICKER_COLOR = (255, 165, 0, 80)  # Orange, semi-transparent
TEXT_COLOR = (50, 50, 50)


def _get_font(size: int = 12) -> ImageFont.FreeTypeFont:
    """Cross-platform font with fallback."""
    candidates = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSMono.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


class SSIMTimelineChart:
    """Renders SSIM scores as a timeline chart using PIL."""

    def render(
        self,
        ssim_scores: List[float],
        threshold: float,
        flicker_events: List[FlickerEvent],
        output_path: str,
        fps: int = 15,
    ) -> str:
        """Draw SSIM timeline: X=time (seconds), Y=SSIM (0.0-1.0).

        Returns output path.
        """
        if not ssim_scores:
            return ""

        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

        img = Image.new("RGB", (CHART_W, CHART_H), BG_COLOR)
        draw = ImageDraw.Draw(img, "RGBA")
        font = _get_font(11)
        font_title = _get_font(14)

        n = len(ssim_scores)
        max_time = n / fps

        # Draw grid lines
        for i in range(11):
            y_val = i / 10
            y = MARGIN_T + int((1 - y_val) * PLOT_H)
            draw.line([(MARGIN_L, y), (CHART_W - MARGIN_R, y)], fill=GRID_COLOR)
            draw.text((5, y - 6), f"{y_val:.1f}", fill=AXIS_COLOR, font=font)

        # X-axis time labels
        num_x_labels = min(10, n)
        for i in range(num_x_labels + 1):
            t = (i / num_x_labels) * max_time
            x = MARGIN_L + int((i / num_x_labels) * PLOT_W)
            draw.line([(x, CHART_H - MARGIN_B), (x, CHART_H - MARGIN_B + 5)], fill=AXIS_COLOR)
            draw.text((x - 10, CHART_H - MARGIN_B + 8), f"{t:.1f}s", fill=AXIS_COLOR, font=font)

        # Draw flicker highlight bands
        for event in flicker_events:
            x1 = MARGIN_L + int((event.start_frame / n) * PLOT_W)
            x2 = MARGIN_L + int(((event.end_frame + 1) / n) * PLOT_W)
            draw.rectangle(
                [(x1, MARGIN_T), (x2, MARGIN_T + PLOT_H)],
                fill=FLICKER_COLOR,
            )

        # Draw threshold line (red dashed)
        y_thresh = MARGIN_T + int((1 - threshold) * PLOT_H)
        dash_len = 10
        for x in range(MARGIN_L, CHART_W - MARGIN_R, dash_len * 2):
            x_end = min(x + dash_len, CHART_W - MARGIN_R)
            draw.line([(x, y_thresh), (x_end, y_thresh)], fill=THRESHOLD_COLOR, width=2)

        # Draw SSIM polyline (blue)
        points = []
        for i, score in enumerate(ssim_scores):
            x = MARGIN_L + int((i / max(n - 1, 1)) * PLOT_W)
            y = MARGIN_T + int((1 - score) * PLOT_H)
            points.append((x, y))

        if len(points) >= 2:
            draw.line(points, fill=LINE_COLOR, width=2)

        # Draw axes
        draw.line([(MARGIN_L, MARGIN_T), (MARGIN_L, CHART_H - MARGIN_B)], fill=AXIS_COLOR, width=2)
        draw.line([(MARGIN_L, CHART_H - MARGIN_B), (CHART_W - MARGIN_R, CHART_H - MARGIN_B)], fill=AXIS_COLOR, width=2)

        # Labels
        draw.text((CHART_W // 2 - 100, 5), "SSIM Timeline", fill=TEXT_COLOR, font=font_title)
        draw.text((MARGIN_L, CHART_H - 15), "Time (s)", fill=AXIS_COLOR, font=font)

        # Legend
        legend_y = MARGIN_T + 10
        legend_x = CHART_W - MARGIN_R - 200
        draw.line([(legend_x, legend_y + 5), (legend_x + 20, legend_y + 5)], fill=LINE_COLOR, width=2)
        draw.text((legend_x + 25, legend_y), "SSIM Score", fill=TEXT_COLOR, font=font)
        draw.line([(legend_x, legend_y + 20), (legend_x + 20, legend_y + 20)], fill=THRESHOLD_COLOR, width=2)
        draw.text((legend_x + 25, legend_y + 15), f"Threshold ({threshold:.3f})", fill=TEXT_COLOR, font=font)
        draw.rectangle([(legend_x, legend_y + 30), (legend_x + 20, legend_y + 40)], fill=FLICKER_COLOR)
        draw.text((legend_x + 25, legend_y + 30), "Flicker Event", fill=TEXT_COLOR, font=font)

        img.save(output_path, "PNG")
        logger.info(f"SSIM timeline saved to {output_path}")
        return output_path


class ComparisonImageGenerator:
    """Generates side-by-side comparison images for flicker events."""

    def render(
        self,
        event: FlickerEvent,
        output_path: str,
        max_frames: int = 4,
    ) -> str:
        """Render side-by-side frames from a flicker event with annotations."""
        paths = event.frame_paths[:max_frames]
        if len(paths) < 2:
            return ""

        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

        # Load and resize frames
        frames = []
        for p in paths:
            try:
                img = Image.open(p)
                # Resize to max 300px wide
                w, h = img.size
                scale = 300 / w
                img = img.resize((300, int(h * scale)), Image.LANCZOS)
                frames.append(img)
            except Exception:
                continue

        if len(frames) < 2:
            return ""

        # Create canvas
        padding = 10
        annotation_h = 40
        total_w = sum(f.width for f in frames) + padding * (len(frames) + 1)
        max_h = max(f.height for f in frames)
        total_h = max_h + annotation_h + padding * 2

        canvas = Image.new("RGB", (total_w, total_h), (40, 40, 40))
        draw = ImageDraw.Draw(canvas)
        font = _get_font(11)

        x_offset = padding
        for idx, frame in enumerate(frames):
            # Paste frame
            canvas.paste(frame, (x_offset, padding))

            # Annotate
            frame_num = event.start_frame + idx
            ssim_text = f"#{frame_num}"
            if idx < len(event.ssim_scores):
                ssim_text += f" SSIM: {event.ssim_scores[idx]:.4f}"

            draw.text(
                (x_offset, max_h + padding + 5),
                ssim_text,
                fill=(255, 255, 255),
                font=font,
            )

            x_offset += frame.width + padding

        # Event summary
        summary = f"{event.pattern} | {event.severity} | {event.duration_ms:.0f}ms"
        if event.logcat_events:
            summary += f" | {len(event.logcat_events)} logcat events"
        draw.text((padding, total_h - 15), summary, fill=(200, 200, 200), font=font)

        canvas.save(output_path, "JPEG", quality=85)
        return output_path
