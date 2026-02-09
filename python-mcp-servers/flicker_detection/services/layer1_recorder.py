"""
Layer 1 — adb screenrecord (triggered recording).

Records screen video on the Android device, pulls it locally,
and validates integrity with ffprobe.
"""

import json
import logging
import os
import subprocess
import time
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

MAX_RECORD_DURATION = 180  # Android hard limit


class ScreenRecorder:
    def __init__(
        self,
        adb_path: str = "adb",
        ffprobe_path: str = "ffprobe",
        device_id: str = "",
        output_dir: str = "/tmp/flicker_detection",
    ):
        self.adb_path = adb_path
        self.ffprobe_path = ffprobe_path
        self.device_id = device_id
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def _adb(self, *args: str, timeout: int = 30) -> subprocess.CompletedProcess:
        cmd = [self.adb_path]
        if self.device_id:
            cmd.extend(["-s", self.device_id])
        cmd.extend(args)
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)

    def record(
        self,
        duration_s: int = 10,
        size: str = "720x1280",
        bitrate: str = "8000000",
    ) -> dict:
        """Record screen via adb screenrecord.

        Returns dict with video_path, start_time, duration, and validation info.
        """
        duration_s = min(duration_s, MAX_RECORD_DURATION)
        device_path = "/sdcard/flicker_recording.mp4"
        local_path = os.path.join(self.output_dir, "recording.mp4")

        # Start recording (runs on device, blocks for duration)
        record_start = time.time()
        try:
            self._adb(
                "shell", "screenrecord",
                "--size", size,
                "--bit-rate", bitrate,
                "--time-limit", str(duration_s),
                device_path,
                timeout=duration_s + 30,
            )
        except subprocess.TimeoutExpired:
            logger.warning("screenrecord timed out — attempting to pull partial recording")

        record_end = time.time()

        # Pull with retry (adb pull is flaky on emulators)
        pull_ok = False
        for attempt in range(3):
            try:
                result = self._adb("pull", device_path, local_path, timeout=60)
                if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
                    pull_ok = True
                    break
            except (subprocess.TimeoutExpired, Exception) as e:
                logger.warning(f"adb pull attempt {attempt + 1}/3 failed: {e}")
                time.sleep(1)

        if not pull_ok:
            return {
                "error": True,
                "message": "Failed to pull recording from device after 3 attempts",
                "device_path": device_path,
            }

        # Clean up device file
        self._adb("shell", "rm", "-f", device_path)

        # Validate with ffprobe
        validation = self.validate_recording(local_path)

        return {
            "video_path": local_path,
            "device_path": device_path,
            "start_time": record_start,
            "end_time": record_end,
            "actual_duration_s": round(record_end - record_start, 2),
            "requested_duration_s": duration_s,
            "file_size_bytes": os.path.getsize(local_path),
            "validation": validation,
        }

    def validate_recording(self, path: str) -> dict:
        """Validate video integrity with ffprobe."""
        if not os.path.exists(path):
            return {"valid": False, "error": "File not found"}

        try:
            result = subprocess.run(
                [
                    self.ffprobe_path,
                    "-v", "error",
                    "-show_format",
                    "-show_streams",
                    "-print_format", "json",
                    path,
                ],
                capture_output=True, text=True, timeout=15,
            )

            if result.returncode != 0:
                return {"valid": False, "error": result.stderr[:500]}

            info = json.loads(result.stdout)
            fmt = info.get("format", {})
            streams = info.get("streams", [])

            video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)

            return {
                "valid": True,
                "duration": float(fmt.get("duration", 0)),
                "size_bytes": int(fmt.get("size", 0)),
                "format_name": fmt.get("format_name", ""),
                "codec": video_stream.get("codec_name", "") if video_stream else "",
                "width": int(video_stream.get("width", 0)) if video_stream else 0,
                "height": int(video_stream.get("height", 0)) if video_stream else 0,
                "fps": video_stream.get("r_frame_rate", "") if video_stream else "",
            }

        except (subprocess.TimeoutExpired, json.JSONDecodeError, Exception) as e:
            return {"valid": False, "error": str(e)}
