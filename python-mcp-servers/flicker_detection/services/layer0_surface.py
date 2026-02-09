"""
Layer 0 — SurfaceFlinger + Logcat (always-on, zero cost).

Captures SurfaceFlinger frame stats and filtered logcat before/after test
to compute jank delta and correlate with detected flicker events.
"""

import logging
import re
import subprocess
from datetime import datetime
from typing import List, Optional, Tuple

from services.models import LogcatEntry, SurfaceStatsDelta

logger = logging.getLogger(__name__)

LOGCAT_TAGS = ["Choreographer", "SurfaceFlinger", "WindowManager", "ActivityManager", "InputDispatcher"]

# MM-DD HH:MM:SS.mmm format
LOGCAT_TS_RE = re.compile(r"(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+\d+\s+\d+\s+([VDIWEF])\s+(\S+?)\s*:\s*(.*)")


class SurfaceFlingerCapture:
    def __init__(self, adb_path: str = "adb", device_id: str = ""):
        self.adb_path = adb_path
        self.device_id = device_id

    def _adb(self, *args: str, timeout: int = 10) -> str:
        cmd = [self.adb_path]
        if self.device_id:
            cmd.extend(["-s", self.device_id])
        cmd.extend(args)
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=timeout
            )
            return result.stdout
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            logger.warning(f"adb command failed: {e}")
            return ""

    def capture_surface_stats(self, package: Optional[str] = None) -> dict:
        """Capture SurfaceFlinger latency stats."""
        if package:
            raw = self._adb("shell", "dumpsys", "gfxinfo", package, "framestats")
        else:
            raw = self._adb("shell", "dumpsys", "SurfaceFlinger", "--latency")

        stats = {"raw": raw[:2000], "total_frames": 0, "janky_frames": 0, "jank_pct": 0.0}

        # Parse Total frames rendered / Janky frames lines
        for line in raw.splitlines():
            line = line.strip()
            if line.startswith("Total frames rendered:"):
                try:
                    stats["total_frames"] = int(line.split(":")[1].strip())
                except (ValueError, IndexError):
                    pass
            elif line.startswith("Janky frames:"):
                m = re.search(r"Janky frames:\s*(\d+)\s*\(([0-9.]+)%\)", line)
                if m:
                    stats["janky_frames"] = int(m.group(1))
                    stats["jank_pct"] = float(m.group(2))

        return stats

    def compute_delta(self, before: dict, after: dict) -> SurfaceStatsDelta:
        """Compute delta between two surface stat snapshots."""
        frames_before = before.get("total_frames", 0)
        frames_after = after.get("total_frames", 0)
        janky_before = before.get("janky_frames", 0)
        janky_after = after.get("janky_frames", 0)
        frames_during = frames_after - frames_before
        janky_during = janky_after - janky_before
        jank_pct = (janky_during / frames_during * 100) if frames_during > 0 else 0.0

        return SurfaceStatsDelta(
            frames_before=frames_before,
            frames_after=frames_after,
            frames_during_test=frames_during,
            janky_before=janky_before,
            janky_after=janky_after,
            janky_during_test=janky_during,
            jank_pct_during_test=round(jank_pct, 2),
        )

    def capture_logcat(
        self, duration_s: int = 10, filter_tags: Optional[List[str]] = None
    ) -> Tuple[List[LogcatEntry], str]:
        """Capture filtered logcat for the specified duration.

        Returns (parsed_entries, raw_text).
        """
        tags = filter_tags or LOGCAT_TAGS
        tag_filter = "|".join(tags)

        # Clear logcat buffer first
        self._adb("logcat", "-c")

        # Capture for duration
        try:
            result = subprocess.run(
                self._build_cmd("logcat", "-d", "-v", "threadtime"),
                capture_output=True, text=True, timeout=duration_s + 5,
            )
            raw = result.stdout
        except subprocess.TimeoutExpired:
            raw = ""

        entries = []
        first_ts = None
        for line in raw.splitlines():
            m = LOGCAT_TS_RE.match(line)
            if not m:
                continue
            ts_str, level, tag, message = m.groups()

            # Filter by relevant tags
            if not any(t in tag for t in tags):
                continue

            # Parse timestamp to seconds since recording start
            try:
                ts = datetime.strptime(ts_str.strip(), "%m-%d %H:%M:%S.%f")
                if first_ts is None:
                    first_ts = ts
                seconds = (ts - first_ts).total_seconds()
            except ValueError:
                seconds = 0.0

            entries.append(LogcatEntry(
                timestamp=ts_str.strip(),
                seconds_since_start=round(seconds, 3),
                tag=tag,
                level=level,
                message=message.strip(),
            ))

        summary = {
            "total_entries": len(entries),
            "tags_seen": list(set(e.tag for e in entries)),
            "duration_span_s": round(entries[-1].seconds_since_start, 2) if entries else 0,
        }

        return entries, raw[:5000]

    def _build_cmd(self, *args: str) -> list:
        cmd = [self.adb_path]
        if self.device_id:
            cmd.extend(["-s", self.device_id])
        cmd.extend(args)
        return cmd

    def get_device_info(self) -> dict:
        """Get basic device information."""
        model = self._adb("shell", "getprop", "ro.product.model").strip()
        sdk = self._adb("shell", "getprop", "ro.build.version.sdk").strip()
        display = self._adb("shell", "wm", "size").strip()

        return {
            "model": model or "unknown",
            "sdk_version": sdk or "unknown",
            "display": display or "unknown",
        }
