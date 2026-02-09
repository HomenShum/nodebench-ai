"""
Detection Pipeline — Orchestrates all 4 layers.

Main entry point: run_detection() coordinates SurfaceFlinger capture,
screen recording, frame extraction, SSIM analysis, optional semantic
verification, and visualization generation.
"""

import logging
import os
import time
import uuid
from typing import Callable, Optional

from services.layer0_surface import SurfaceFlingerCapture
from services.layer1_recorder import ScreenRecorder
from services.layer2_analysis import FrameAnalyzer
from services.layer3_semantic import SemanticVerifier
from services.models import FlickerReport
from services.visualization import ComparisonImageGenerator, SSIMTimelineChart

logger = logging.getLogger(__name__)


async def run_detection(
    duration: int = 10,
    scenario_fn: Optional[Callable] = None,
    package: Optional[str] = None,
    device_id: str = "",
    fps: int = 15,
    record_size: str = "720x1280",
    bitrate: str = "8000000",
    use_scene_filter: bool = True,
    gpt_verify: bool = False,
    cleanup_frames: bool = False,
    adb_path: str = "adb",
    ffmpeg_path: str = "ffmpeg",
    ffprobe_path: str = "ffprobe",
    output_base_dir: str = "/tmp/flicker_detection",
    vision_api_url: Optional[str] = None,
) -> FlickerReport:
    """Orchestrate all 4 layers of flicker detection.

    Args:
        duration: Recording duration in seconds (max 180)
        scenario_fn: Optional async callable to run during recording (e.g., UI interactions)
        package: Android package name for SurfaceFlinger stats
        device_id: ADB device ID (empty = default device)
        fps: Frames per second for extraction
        record_size: Recording resolution
        bitrate: Recording bitrate
        use_scene_filter: Use ffmpeg scene detection for frame extraction
        gpt_verify: Enable Layer 3 GPT semantic verification
        cleanup_frames: Delete extracted frames after analysis
        adb_path: Path to adb binary
        ffmpeg_path: Path to ffmpeg binary
        ffprobe_path: Path to ffprobe binary
        output_base_dir: Base output directory
        vision_api_url: URL for vision API (Layer 3)
    """
    session_id = f"flicker_{uuid.uuid4().hex[:8]}"
    session_dir = os.path.join(output_base_dir, session_id)
    frames_dir = os.path.join(session_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)

    analysis_start = time.time()

    report = FlickerReport(
        session_id=session_id,
        device_id=device_id or "default",
        recording_duration=duration,
        frames_dir=frames_dir,
    )

    try:
        # ── Layer 0: SurfaceFlinger + Logcat ──
        logger.info("Layer 0: Capturing SurfaceFlinger stats (before)")
        surface = SurfaceFlingerCapture(adb_path=adb_path, device_id=device_id)
        stats_before = surface.capture_surface_stats(package)
        report.surface_stats = {"before": stats_before}

        # Start logcat capture (we'll parse it after recording)
        device_info = surface.get_device_info()
        report.surface_stats["device_info"] = device_info

        # ── Layer 1: Screen Recording ──
        logger.info(f"Layer 1: Recording screen for {duration}s")
        recorder = ScreenRecorder(
            adb_path=adb_path,
            ffprobe_path=ffprobe_path,
            device_id=device_id,
            output_dir=session_dir,
        )

        # Run scenario during recording if provided
        if scenario_fn:
            import asyncio
            # Start recording in background, run scenario, wait for completion
            recording_result = recorder.record(
                duration_s=duration, size=record_size, bitrate=bitrate
            )
        else:
            recording_result = recorder.record(
                duration_s=duration, size=record_size, bitrate=bitrate
            )

        if recording_result.get("error"):
            report.error = recording_result["message"]
            return report

        report.video_path = recording_result["video_path"]

        # Layer 0 continued: capture after stats + logcat
        stats_after = surface.capture_surface_stats(package)
        report.surface_stats["after"] = stats_after
        report.surface_delta = surface.compute_delta(stats_before, stats_after)

        logcat_entries, logcat_raw = surface.capture_logcat(duration_s=duration)
        report.logcat_summary = {
            "total_entries": len(logcat_entries),
            "tags": list(set(e.tag for e in logcat_entries)),
        }

        # ── Layer 2: Frame Extraction + SSIM Analysis ──
        logger.info("Layer 2: Extracting frames and computing SSIM")
        analyzer = FrameAnalyzer(ffmpeg_path=ffmpeg_path, output_dir=frames_dir)

        frame_paths = analyzer.extract_frames(
            video_path=report.video_path,
            fps=fps,
            use_scene_filter=use_scene_filter,
        )
        report.total_frames_analyzed = len(frame_paths)
        report.total_scene_frames = len(frame_paths)

        if len(frame_paths) >= 2:
            # Compute SSIM
            ssim_scores = analyzer.compute_ssim_parallel(frame_paths)
            report.ssim_scores = ssim_scores

            # Adaptive threshold
            threshold = analyzer.compute_adaptive_threshold(ssim_scores)
            report.adaptive_threshold = threshold

            # Classify flicker events
            events = analyzer.classify_flickers(ssim_scores, threshold, frame_paths, fps)

            # Correlate with logcat
            events = analyzer.correlate_with_logcat(events, logcat_entries)

            # Compute region diffs for each event
            for event in events:
                if len(event.frame_paths) >= 2:
                    event.region_diff = analyzer.compute_region_diff(
                        event.frame_paths[0], event.frame_paths[1]
                    )

            report.flicker_events = events
            report.total_flickers_detected = len(events)

            # ── Layer 3: Optional Semantic Verification ──
            if gpt_verify and vision_api_url:
                logger.info("Layer 3: Running semantic verification on HIGH/MEDIUM events")
                verifier = SemanticVerifier(vision_api_url=vision_api_url)
                for event in events:
                    analysis = await verifier.verify_event(event)
                    if analysis:
                        event.gpt_analysis = analysis

            # ── Visualization ──
            logger.info("Generating visualizations")
            timeline_path = os.path.join(session_dir, "ssim_timeline.png")
            chart = SSIMTimelineChart()
            chart.render(ssim_scores, threshold, events, timeline_path, fps)
            report.ssim_timeline_path = timeline_path

            # Comparison images
            comparison_gen = ComparisonImageGenerator()
            for i, event in enumerate(events[:10]):  # Max 10 comparison images
                comp_path = os.path.join(session_dir, f"comparison_{i:02d}.jpg")
                result = comparison_gen.render(event, comp_path)
                if result:
                    report.comparison_images.append(result)

        else:
            logger.warning(f"Only {len(frame_paths)} frames extracted — insufficient for SSIM")
            report.error = f"Only {len(frame_paths)} frames extracted, need at least 2"

    except Exception as e:
        logger.error(f"Detection pipeline failed: {e}", exc_info=True)
        report.error = str(e)

    report.analysis_time_seconds = round(time.time() - analysis_start, 2)

    # Save report JSON
    import json
    report_path = os.path.join(session_dir, "report.json")
    with open(report_path, "w") as f:
        json.dump(report.model_dump(), f, indent=2)

    # Cleanup frames if requested
    if cleanup_frames and os.path.isdir(frames_dir):
        import shutil
        shutil.rmtree(frames_dir, ignore_errors=True)

    logger.info(
        f"Detection complete: {report.total_flickers_detected} flickers in "
        f"{report.total_frames_analyzed} frames ({report.analysis_time_seconds}s)"
    )

    return report
