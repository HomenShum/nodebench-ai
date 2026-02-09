"""
Data models for Flicker Detection pipeline.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class FlickerEvent(BaseModel):
    """A detected flicker event spanning one or more frames."""
    start_frame: int
    end_frame: int
    start_time: float = Field(description="Seconds since recording start")
    end_time: float = Field(description="Seconds since recording start")
    duration_ms: float
    pattern: str = Field(description="rapid_oscillation | sustained_change | single_glitch")
    ssim_scores: List[float]
    severity: str = Field(description="HIGH | MEDIUM | LOW")
    frame_paths: List[str] = Field(default_factory=list)
    logcat_events: List[dict] = Field(default_factory=list)
    gpt_analysis: Optional[str] = None
    region_diff: Optional[dict] = None


class SurfaceStatsDelta(BaseModel):
    """Delta of SurfaceFlinger stats between before/after a test."""
    frames_before: int = 0
    frames_after: int = 0
    frames_during_test: int = 0
    janky_before: int = 0
    janky_after: int = 0
    janky_during_test: int = 0
    jank_pct_during_test: float = 0.0


class LogcatEntry(BaseModel):
    """Parsed logcat line."""
    timestamp: str
    seconds_since_start: float = 0.0
    tag: str
    level: str
    message: str


class FlickerReport(BaseModel):
    """Complete flicker detection report."""
    session_id: str
    device_id: str
    recording_duration: int
    video_path: str = ""
    frames_dir: str = ""
    total_frames_analyzed: int = 0
    total_scene_frames: int = 0
    total_flickers_detected: int = 0
    analysis_time_seconds: float = 0.0
    ssim_scores: List[float] = Field(default_factory=list)
    adaptive_threshold: float = 0.92
    ssim_timeline_path: str = ""
    surface_stats: dict = Field(default_factory=dict)
    surface_delta: Optional[SurfaceStatsDelta] = None
    flicker_events: List[FlickerEvent] = Field(default_factory=list)
    logcat_summary: dict = Field(default_factory=dict)
    comparison_images: List[str] = Field(default_factory=list)
    error: str = ""
