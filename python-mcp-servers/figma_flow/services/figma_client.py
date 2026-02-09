"""
Figma REST API client.

CRITICAL: Use depth=3 NOT depth=2.
depth=2 gets SECTION nodes but NOT the FRAME nodes inside them.
"""

import logging
from typing import Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

BASE_URL = "https://api.figma.com/v1"


class FigmaClient:
    def __init__(self, access_token: str):
        self.token = access_token
        self.headers = {"X-Figma-Token": access_token}

    async def get_file(self, file_key: str, depth: int = 3) -> dict:
        """Fetch Figma file tree.

        CRITICAL: depth=3 is required to get FRAME nodes inside SECTIONs.
        Tree structure: DOCUMENT -> CANVAS (page) -> SECTION -> FRAME
        With depth=2 you only get SECTION nodes, missing the actual frames.
        """
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{BASE_URL}/files/{file_key}",
                headers=self.headers,
                params={"depth": depth},
            )

            if response.status_code == 429:
                retry_after = response.headers.get("Retry-After", "unknown")
                rate_type = response.headers.get("x-figma-rate-limit-type", "unknown")
                plan_tier = response.headers.get("x-figma-plan-tier", "unknown")
                logger.error(
                    f"Figma rate limited: retry_after={retry_after}s, "
                    f"type={rate_type}, tier={plan_tier}"
                )
                return {
                    "error": True,
                    "message": f"Rate limited. Retry after {retry_after}s",
                    "rate_limit_type": rate_type,
                    "plan_tier": plan_tier,
                }

            response.raise_for_status()
            return response.json()

    async def get_images(
        self,
        file_key: str,
        node_ids: List[str],
        format: str = "png",
        scale: float = 1,
    ) -> Dict[str, str]:
        """Fetch rendered images for specific nodes.

        WARNING: Rate limits on Images API can trigger 4+ day cooldowns (396156s).
        Batch requests wisely.
        """
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.get(
                f"{BASE_URL}/images/{file_key}",
                headers=self.headers,
                params={
                    "ids": ",".join(node_ids),
                    "format": format,
                    "scale": scale,
                },
            )

            if response.status_code == 429:
                retry_after = response.headers.get("Retry-After", "unknown")
                logger.error(f"Figma Images API rate limited: retry_after={retry_after}s")
                return {"error": True, "retry_after": retry_after}

            response.raise_for_status()
            data = response.json()
            return data.get("images", {})
