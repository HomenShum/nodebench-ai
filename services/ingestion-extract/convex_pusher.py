"""
Push extraction results to Convex backend.

Maps extracted entities, claims, and numeric facts to timeSeriesObservations
format and batch-inserts via the Convex HTTP API.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Default retry config
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 1.0  # seconds
BATCH_SIZE = 50  # max items per Convex mutation call


def _observation_from_entity(
    entity: dict[str, Any], stream_key: str
) -> dict[str, Any]:
    """Map an extracted entity to a timeSeriesObservation."""
    return {
        "streamKey": stream_key,
        "observationType": "entity",
        "value": entity["confidence"],
        "metadata": {
            "name": entity["name"],
            "type": entity["type"],
            "mentionCount": len(entity.get("mentions", [])),
            "firstMention": entity["mentions"][0] if entity.get("mentions") else None,
        },
        "timestamp": int(time.time() * 1000),
    }


def _observation_from_claim(
    claim: dict[str, Any], stream_key: str
) -> dict[str, Any]:
    """Map an extracted claim to a timeSeriesObservation."""
    return {
        "streamKey": stream_key,
        "observationType": "claim",
        "value": claim.get("confidence", 0.5),
        "metadata": {
            "claimText": claim["claim_text"][:500],
            "claimType": claim["claim_type"],
            "entitiesMentioned": claim.get("entities_mentioned", []),
            "temporalMarker": claim.get("temporal_marker"),
            "sourceSpan": claim.get("source_span"),
        },
        "timestamp": int(time.time() * 1000),
    }


def _observation_from_numeric(
    fact: dict[str, Any], stream_key: str
) -> dict[str, Any]:
    """Map an extracted numeric fact to a timeSeriesObservation."""
    return {
        "streamKey": stream_key,
        "observationType": "numeric",
        "value": fact["value"],
        "metadata": {
            "metric": fact["metric"],
            "units": fact["units"],
            "context": fact.get("context", "")[:200],
            "lineNumber": fact.get("line_number"),
            "rawText": fact.get("raw_text", ""),
        },
        "timestamp": int(time.time() * 1000),
    }


async def push_observations(
    entities: list[dict[str, Any]],
    claims: list[dict[str, Any]],
    numerics: list[dict[str, Any]],
    convex_url: str | None = None,
    stream_key: str = "ingestion-extract",
) -> dict[str, Any]:
    """Push extracted observations to Convex backend.

    Args:
        entities: List of extracted entity dicts
        claims: List of extracted claim dicts
        numerics: List of extracted numeric fact dicts
        convex_url: Convex deployment URL (falls back to CONVEX_URL env var)
        stream_key: Stream key for the observation series

    Returns:
        Summary of push results: {pushed, failed, errors}
    """
    url = convex_url or os.environ.get("CONVEX_URL", "")
    if not url:
        return {
            "pushed": 0,
            "failed": 0,
            "errors": ["No CONVEX_URL configured"],
        }

    # Build all observations
    observations: list[dict[str, Any]] = []
    for entity in entities:
        observations.append(_observation_from_entity(entity, stream_key))
    for claim in claims:
        observations.append(_observation_from_claim(claim, stream_key))
    for numeric in numerics:
        observations.append(_observation_from_numeric(numeric, stream_key))

    if not observations:
        return {"pushed": 0, "failed": 0, "errors": []}

    # Batch insert
    pushed = 0
    failed = 0
    errors: list[str] = []

    for batch_start in range(0, len(observations), BATCH_SIZE):
        batch = observations[batch_start : batch_start + BATCH_SIZE]
        success = await _push_batch(batch, url, errors)
        if success:
            pushed += len(batch)
        else:
            failed += len(batch)

    logger.info(
        "Push complete: %d pushed, %d failed, %d errors",
        pushed, failed, len(errors),
    )
    return {"pushed": pushed, "failed": failed, "errors": errors}


async def _push_batch(
    batch: list[dict[str, Any]],
    convex_url: str,
    errors: list[str],
) -> bool:
    """Push a single batch to Convex with retry logic."""
    mutation_url = f"{convex_url}/api/mutation"
    payload = {
        "path": "domains/analytics/analytics:ingestObservations",
        "args": {"observations": batch},
    }

    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(mutation_url, json=payload)
                if resp.status_code == 200:
                    return True
                if resp.status_code >= 500:
                    # Server error, retry
                    wait = RETRY_BACKOFF_BASE * (2 ** attempt)
                    logger.warning(
                        "Convex server error %d, retrying in %.1fs",
                        resp.status_code, wait,
                    )
                    import asyncio
                    await asyncio.sleep(wait)
                    continue
                else:
                    # Client error, don't retry
                    error_msg = (
                        f"Convex push failed with status {resp.status_code}: "
                        f"{resp.text[:200]}"
                    )
                    errors.append(error_msg)
                    logger.error(error_msg)
                    return False
        except httpx.TimeoutException:
            wait = RETRY_BACKOFF_BASE * (2 ** attempt)
            logger.warning("Convex push timeout, retrying in %.1fs", wait)
            import asyncio
            await asyncio.sleep(wait)
        except Exception as exc:
            errors.append(f"Convex push error: {exc}")
            logger.error("Convex push error: %s", exc)
            return False

    errors.append(f"Convex push failed after {MAX_RETRIES} retries")
    return False
