"""Tool dispatch endpoint for Flicker Detection server."""

import logging
from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel

from services.detection_pipeline import run_detection
from services.layer0_surface import SurfaceFlingerCapture
from services.layer2_analysis import FrameAnalyzer
from services.visualization import ComparisonImageGenerator, SSIMTimelineChart

logger = logging.getLogger(__name__)

router = APIRouter()


class ToolRequest(BaseModel):
    tool_name: str
    parameters: Dict[str, Any] = {}


class ToolResponse(BaseModel):
    success: bool
    data: Any = None
    error: str = ""


TOOL_NAMES = [
    "run_flicker_detection",
    "capture_surface_stats",
    "extract_video_frames",
    "compute_ssim_analysis",
    "generate_flicker_report",
]


@router.get("/list")
async def list_tools():
    return {"tools": TOOL_NAMES}


@router.post("/execute")
async def execute_tool(request: ToolRequest):
    try:
        if request.tool_name == "run_flicker_detection":
            report = await run_detection(
                duration=request.parameters.get("duration_s", 10),
                package=request.parameters.get("package_name"),
                device_id=request.parameters.get("device_id", ""),
                fps=request.parameters.get("fps", 15),
                record_size=request.parameters.get("record_size", "720x1280"),
                use_scene_filter=request.parameters.get("use_scene_filter", True),
                gpt_verify=request.parameters.get("enable_semantic", False),
                cleanup_frames=request.parameters.get("cleanup_frames", False),
            )
            return ToolResponse(success=True, data=report.model_dump())

        elif request.tool_name == "capture_surface_stats":
            capture = SurfaceFlingerCapture(
                device_id=request.parameters.get("device_id", ""),
            )
            stats = capture.capture_surface_stats(
                package=request.parameters.get("package_name"),
            )
            logcat_entries, logcat_raw = capture.capture_logcat(
                duration_s=request.parameters.get("logcat_duration_s", 5),
            )
            device_info = capture.get_device_info()
            return ToolResponse(success=True, data={
                "surface_stats": stats,
                "logcat_entries": [e.model_dump() for e in logcat_entries[:50]],
                "device_info": device_info,
            })

        elif request.tool_name == "extract_video_frames":
            from services.layer1_recorder import ScreenRecorder
            import os

            output_dir = request.parameters.get("output_dir", "/tmp/flicker_detection/extract")
            recorder = ScreenRecorder(
                device_id=request.parameters.get("device_id", ""),
                output_dir=output_dir,
            )

            recording = recorder.record(
                duration_s=request.parameters.get("duration_s", 10),
            )

            if recording.get("error"):
                return ToolResponse(success=False, error=recording["message"])

            analyzer = FrameAnalyzer(output_dir=os.path.join(output_dir, "frames"))
            frames = analyzer.extract_frames(
                video_path=recording["video_path"],
                scene_threshold=request.parameters.get("scene_threshold", 0.08),
            )

            return ToolResponse(success=True, data={
                "recording": {k: v for k, v in recording.items() if k != "raw"},
                "frame_count": len(frames),
                "frame_paths": frames,
            })

        elif request.tool_name == "compute_ssim_analysis":
            frame_paths = request.parameters.get("frame_paths", [])
            if not frame_paths or len(frame_paths) < 2:
                return ToolResponse(success=False, error="Need at least 2 frame paths")

            analyzer = FrameAnalyzer()
            scores = analyzer.compute_ssim_parallel(
                frame_paths,
                max_workers=request.parameters.get("max_workers", 4),
                block_size=request.parameters.get("block_size", 8),
            )
            threshold = analyzer.compute_adaptive_threshold(scores)
            events = analyzer.classify_flickers(scores, threshold, frame_paths)

            return ToolResponse(success=True, data={
                "ssim_scores": scores,
                "adaptive_threshold": threshold,
                "total_pairs": len(scores),
                "flickers_detected": len(events),
                "events": [e.model_dump() for e in events],
            })

        elif request.tool_name == "generate_flicker_report":
            scores = request.parameters.get("ssim_scores", [])
            threshold = request.parameters.get("threshold", 0.92)
            output_dir = request.parameters.get("output_dir", "/tmp/flicker_detection/report")

            import os
            os.makedirs(output_dir, exist_ok=True)

            # Generate timeline
            from services.models import FlickerEvent
            flicker_indices = request.parameters.get("flicker_indices", [])
            events = []
            for idx in flicker_indices:
                if 0 <= idx < len(scores):
                    events.append(FlickerEvent(
                        start_frame=idx, end_frame=idx,
                        start_time=idx / 15, end_time=(idx + 1) / 15,
                        duration_ms=66.7, pattern="single_glitch",
                        ssim_scores=[scores[idx]], severity="LOW",
                    ))

            timeline_path = os.path.join(output_dir, "ssim_timeline.png")
            chart = SSIMTimelineChart()
            chart.render(scores, threshold, events, timeline_path)

            return ToolResponse(success=True, data={
                "timeline_path": timeline_path,
                "events_count": len(events),
            })

        else:
            return ToolResponse(
                success=False,
                error=f"Unknown tool: {request.tool_name}. Available: {TOOL_NAMES}",
            )

    except Exception as e:
        logger.error(f"Tool execution failed: {e}", exc_info=True)
        return ToolResponse(success=False, error=str(e))
