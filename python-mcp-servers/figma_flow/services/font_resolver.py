"""
Cross-platform font resolver with fallback chain.

Priority: platform-specific fonts -> DejaVu -> PIL default
"""

import os
from functools import lru_cache

from PIL import ImageFont

# Font search paths per platform
FONT_PATHS = [
    # Windows
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
    "C:/Windows/Fonts/calibri.ttf",
    # macOS
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/SFNSMono.ttf",
    "/Library/Fonts/Arial.ttf",
    # Linux
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
]


@lru_cache(maxsize=8)
def get_font(size: int = 14) -> ImageFont.FreeTypeFont:
    """Get a font at the requested size, with cross-platform fallback."""
    for path in FONT_PATHS:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()
