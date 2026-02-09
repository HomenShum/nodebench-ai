"""
Layer 3 — GPT semantic verification (selective).

For HIGH/MEDIUM severity events, optionally sends frame sequences
to a vision API for semantic analysis: "Is this a visual BUG or intentional ANIMATION?"

Gate behind gpt_verify=True (expensive, don't run by default).
"""

import base64
import logging
from typing import Optional

import httpx

from services.models import FlickerEvent

logger = logging.getLogger(__name__)


class SemanticVerifier:
    def __init__(self, vision_api_url: Optional[str] = None):
        self.api_url = vision_api_url

    async def verify_event(self, event: FlickerEvent) -> Optional[str]:
        """Send frame pair to vision API for semantic verification.

        Only processes HIGH/MEDIUM severity events.
        Returns human-readable analysis or None if unavailable.
        """
        if not self.api_url:
            return None

        if event.severity not in ("HIGH", "MEDIUM"):
            return None

        if len(event.frame_paths) < 2:
            return None

        try:
            # Encode frames as base64
            frames_b64 = []
            for path in event.frame_paths[:4]:
                with open(path, "rb") as f:
                    frames_b64.append(base64.b64encode(f.read()).decode("utf-8"))

            prompt = (
                f"Analyze these {len(frames_b64)} consecutive screen frames from an Android UI test. "
                f"Pattern detected: {event.pattern}. SSIM scores: {event.ssim_scores}. "
                f"Duration: {event.duration_ms}ms. "
                f"Is this a visual BUG (flicker, glitch, rendering artifact) "
                f"or an intentional ANIMATION (transition, fade, slide)? "
                f"Explain your reasoning briefly."
            )

            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    self.api_url,
                    json={
                        "prompt": prompt,
                        "images": frames_b64,
                        "max_tokens": 300,
                    },
                )

                if response.status_code == 200:
                    data = response.json()
                    return data.get("analysis", data.get("text", str(data)))

        except Exception as e:
            logger.warning(f"Semantic verification failed: {e}")

        return None
