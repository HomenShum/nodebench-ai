"""
Phase 3 — Visualization with colored bounding box overlays.

Overlays flow group bounding boxes on a rendered page image,
or creates a synthetic dark canvas if no image is available.
Handles extreme aspect ratios (Figma pages can be very wide).
"""

import logging
import os
from typing import List, Optional

from PIL import Image, ImageDraw

from services.font_resolver import get_font
from services.models import FlowGroup

logger = logging.getLogger(__name__)

MAX_IMAGE_DIM = 4000  # Cap image dimension


class FlowVisualizer:
    """Render flow group overlays on page image or synthetic canvas."""

    def render(
        self,
        flow_groups: List[FlowGroup],
        page_image_path: Optional[str] = None,
        page_width: float = 0,
        page_height: float = 0,
        output_path: str = "/tmp/figma_flows.png",
    ) -> str:
        """Render visualization.

        If page_image_path: overlay colored boxes on the rendered page.
        Otherwise: create synthetic canvas with proportional frame rectangles.
        """
        if not flow_groups:
            return ""

        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

        if page_image_path and os.path.exists(page_image_path):
            return self._render_overlay(flow_groups, page_image_path, output_path)
        else:
            return self._render_synthetic(flow_groups, page_width, page_height, output_path)

    def _render_overlay(
        self,
        flow_groups: List[FlowGroup],
        image_path: str,
        output_path: str,
    ) -> str:
        """Overlay bounding boxes on a rendered page image."""
        base = Image.open(image_path).convert("RGBA")
        overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        font = get_font(14)
        font_small = get_font(11)

        # Compute scale from Figma coords to image pixels
        all_frames = [f for g in flow_groups for f in g.frames]
        if not all_frames:
            return ""

        figma_min_x = min(f.x for f in all_frames)
        figma_min_y = min(f.y for f in all_frames)
        figma_max_x = max(f.x + f.width for f in all_frames)
        figma_max_y = max(f.y + f.height for f in all_frames)
        figma_w = figma_max_x - figma_min_x
        figma_h = figma_max_y - figma_min_y

        scale_x = base.width / figma_w if figma_w > 0 else 1
        scale_y = base.height / figma_h if figma_h > 0 else 1

        def to_px(x: float, y: float):
            return (
                int((x - figma_min_x) * scale_x),
                int((y - figma_min_y) * scale_y),
            )

        for group in flow_groups:
            r, g_c, b = group.color
            # Semi-transparent fill
            x1, y1 = to_px(group.bbox_x, group.bbox_y)
            x2, y2 = to_px(group.bbox_x + group.bbox_w, group.bbox_y + group.bbox_h)
            draw.rectangle([x1, y1, x2, y2], fill=(r, g_c, b, 30), outline=(r, g_c, b, 200), width=3)

            # Group label
            label = f"{group.name} ({len(group.frames)} screens)"
            draw.text((x1 + 5, y1 + 5), label, fill=(r, g_c, b, 255), font=font)

            # Frame labels
            for frame in group.frames:
                fx, fy = to_px(frame.x, frame.y)
                draw.text((fx + 2, fy + 2), frame.name[:20], fill=(255, 255, 255, 200), font=font_small)

        result = Image.alpha_composite(base, overlay)
        result.convert("RGB").save(output_path, "PNG")
        return output_path

    def _render_synthetic(
        self,
        flow_groups: List[FlowGroup],
        page_width: float,
        page_height: float,
        output_path: str,
    ) -> str:
        """Create synthetic dark canvas with frame rectangles and group boxes."""
        all_frames = [f for g in flow_groups for f in g.frames]
        if not all_frames:
            return ""

        # Compute bounds
        min_x = min(f.x for f in all_frames) - 100
        min_y = min(f.y for f in all_frames) - 100
        max_x = max(f.x + f.width for f in all_frames) + 100
        max_y = max(f.y + f.height for f in all_frames) + 100

        canvas_w = max_x - min_x
        canvas_h = max_y - min_y

        # Handle extreme aspect ratios (>3:1)
        aspect = canvas_w / canvas_h if canvas_h > 0 else 1
        if aspect > 3:
            scale = min(MAX_IMAGE_DIM / canvas_w, MAX_IMAGE_DIM / (canvas_h * 3))
        elif aspect < 1 / 3:
            scale = min(MAX_IMAGE_DIM / (canvas_w * 3), MAX_IMAGE_DIM / canvas_h)
        else:
            scale = min(MAX_IMAGE_DIM / canvas_w, MAX_IMAGE_DIM / canvas_h)

        img_w = max(100, int(canvas_w * scale))
        img_h = max(100, int(canvas_h * scale))

        img = Image.new("RGB", (img_w, img_h), (30, 30, 30))
        draw = ImageDraw.Draw(img, "RGBA")
        font = get_font(max(10, int(14 * scale)))
        font_small = get_font(max(8, int(11 * scale)))

        def to_px(x: float, y: float):
            return int((x - min_x) * scale), int((y - min_y) * scale)

        # Draw group bounding boxes
        for group in flow_groups:
            r, g_c, b = group.color
            x1, y1 = to_px(group.bbox_x, group.bbox_y)
            x2, y2 = to_px(group.bbox_x + group.bbox_w, group.bbox_y + group.bbox_h)
            draw.rectangle([x1, y1, x2, y2], fill=(r, g_c, b, 25), outline=(r, g_c, b, 180), width=2)

            # Group label
            label = f"{group.name} ({len(group.frames)})"
            draw.text((x1 + 4, y1 + 4), label, fill=(r, g_c, b), font=font)

        # Draw individual frames
        for group in flow_groups:
            r, g_c, b = group.color
            sorted_frames = sorted(group.frames, key=lambda f: f.x)

            for i, frame in enumerate(sorted_frames):
                fx1, fy1 = to_px(frame.x, frame.y)
                fx2, fy2 = to_px(frame.x + frame.width, frame.y + frame.height)
                draw.rectangle([fx1, fy1, fx2, fy2], fill=(60, 60, 60), outline=(r, g_c, b, 150), width=1)
                draw.text((fx1 + 2, fy1 + 2), frame.name[:15], fill=(200, 200, 200), font=font_small)

                # Draw connector arrow to next frame
                if i < len(sorted_frames) - 1:
                    next_frame = sorted_frames[i + 1]
                    nx1, ny1 = to_px(next_frame.x, next_frame.y)
                    arrow_y = (fy1 + fy2) // 2
                    draw.line([(fx2, arrow_y), (nx1, arrow_y)], fill=(r, g_c, b, 100), width=1)

        img.save(output_path, "PNG")
        return output_path
