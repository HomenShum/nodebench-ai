"""
Data models for Figma Flow Analysis pipeline.
"""

from typing import List, Optional, Tuple
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    """Axis-aligned bounding box."""
    x: float
    y: float
    width: float
    height: float


class FigmaFrame(BaseModel):
    """A frame node extracted from the Figma file tree."""
    node_id: str
    name: str
    x: float
    y: float
    width: float
    height: float
    transition_targets: List[str] = Field(default_factory=list)
    section_name: Optional[str] = None
    page_name: str = ""


class FlowGroup(BaseModel):
    """A cluster of frames forming a logical flow."""
    group_id: int
    name: str
    frames: List[FigmaFrame]
    color: Tuple[int, int, int] = (0, 255, 0)
    bbox_x: float = 0
    bbox_y: float = 0
    bbox_w: float = 0
    bbox_h: float = 0
    clustering_signal: str = ""

    def compute_bbox(self, padding: float = 50):
        """Compute bounding box enclosing all frames with padding."""
        if not self.frames:
            return
        min_x = min(f.x for f in self.frames)
        min_y = min(f.y for f in self.frames)
        max_x = max(f.x + f.width for f in self.frames)
        max_y = max(f.y + f.height for f in self.frames)
        self.bbox_x = min_x - padding
        self.bbox_y = min_y - padding
        self.bbox_w = (max_x - min_x) + 2 * padding
        self.bbox_h = (max_y - min_y) + 2 * padding


class FlowAnalysisResult(BaseModel):
    """Complete flow analysis output."""
    file_key: str
    page_name: str = ""
    total_frames: int = 0
    flow_groups: List[FlowGroup] = Field(default_factory=list)
    ungrouped_frames: List[FigmaFrame] = Field(default_factory=list)
    clustering_method: str = ""
    visualization_path: str = ""
    summary: str = ""
