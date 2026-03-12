"""
Orchestration pipeline for document processing.

- process_document: runs all extractors on a single document
- process_large_document: chunked processing with entity merging and dedup
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any

from extractors.entity_extractor import EntityExtractor
from extractors.claim_extractor import ClaimExtractor
from extractors.temporal_extractor import TemporalExtractor
from extractors.numeric_extractor import NumericExtractor

logger = logging.getLogger(__name__)

# Default chunk size (lines)
DEFAULT_CHUNK_SIZE = 500
# Overlap between chunks (lines) to avoid splitting entities at boundaries
CHUNK_OVERLAP = 20


def _split_into_chunks(
    text: str, chunk_size: int
) -> list[tuple[str, int]]:
    """Split text into line-based chunks with overlap.

    Returns list of (chunk_text, line_offset) tuples.
    line_offset is 0-based (the first line of the chunk in the original doc).
    """
    lines = text.split("\n")
    total = len(lines)
    if total <= chunk_size:
        return [(text, 0)]

    chunks: list[tuple[str, int]] = []
    start = 0
    while start < total:
        end = min(start + chunk_size, total)
        chunk_lines = lines[start:end]
        chunks.append(("\n".join(chunk_lines), start))
        if end >= total:
            break
        start = end - CHUNK_OVERLAP  # overlap for boundary entities

    return chunks


def _deduplicate_entities(
    entities: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Merge duplicate entities across chunks.

    Two entities are duplicates if they have the same name (case-insensitive)
    and same type. Merge their mentions and take the higher confidence.
    """
    merged: dict[str, dict[str, Any]] = {}

    for entity in entities:
        key = f"{entity['type']}:{entity['name'].lower()}"
        if key in merged:
            existing = merged[key]
            # Merge mentions, dedup by line_start
            existing_lines = {
                m["line_start"] for m in existing["mentions"]
            }
            for mention in entity["mentions"]:
                if mention["line_start"] not in existing_lines:
                    existing["mentions"].append(mention)
                    existing_lines.add(mention["line_start"])
            # Take higher confidence
            existing["confidence"] = max(
                existing["confidence"], entity["confidence"]
            )
        else:
            merged[key] = {**entity, "mentions": list(entity["mentions"])}

    return list(merged.values())


def _deduplicate_claims(
    claims: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Deduplicate claims across chunks.

    Claims are considered duplicate if their claim_text is very similar
    (exact match after normalization) and same type.
    """
    best: dict[str, dict[str, Any]] = {}

    for claim in claims:
        key = claim["claim_text"].lower().strip()[:100]
        if key not in best or claim.get("confidence", 0) > best[key].get("confidence", 0):
            best[key] = claim

    return list(best.values())


def _deduplicate_temporal(
    markers: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Deduplicate temporal markers (same text + same line)."""
    seen: set[tuple[str, int]] = set()
    result: list[dict[str, Any]] = []
    for m in markers:
        key = (m["text"].lower(), m["line_number"])
        if key not in seen:
            seen.add(key)
            result.append(m)
    return result


def _deduplicate_numeric(
    facts: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Deduplicate numeric facts (same raw_text + same line)."""
    seen: set[tuple[str, int]] = set()
    result: list[dict[str, Any]] = []
    for f in facts:
        key = (f["raw_text"], f["line_number"])
        if key not in seen:
            seen.add(key)
            result.append(f)
    return result


async def process_document(
    text: str,
    source_type: str,
    options: dict[str, bool] | None = None,
    request_id: str | None = None,
) -> dict[str, Any]:
    """Process a single document through all extractors.

    Args:
        text: Document text content
        source_type: Type of source (slack, github_pr, news, legal, general)
        options: Which extractors to run (extract_entities, extract_claims,
                 extract_temporal, extract_numeric). All default to True.
        request_id: Optional request ID for observability

    Returns:
        Extraction results with entities, claims, temporal markers, numeric facts,
        and source metadata.
    """
    if request_id is None:
        request_id = str(uuid.uuid4())

    opts = {
        "extract_entities": True,
        "extract_claims": True,
        "extract_temporal": True,
        "extract_numeric": True,
        **(options or {}),
    }

    line_count = text.count("\n") + 1
    char_count = len(text)

    entity_extractor = EntityExtractor()
    claim_extractor = ClaimExtractor()
    temporal_extractor = TemporalExtractor()
    numeric_extractor = NumericExtractor()

    # Run extractors in parallel
    tasks: list[tuple[str, Any]] = []
    if opts["extract_entities"]:
        tasks.append(("entities", entity_extractor.extract(text)))
    if opts["extract_claims"]:
        tasks.append(("claims", claim_extractor.extract(text)))
    if opts["extract_temporal"]:
        tasks.append(("temporal", asyncio.to_thread(temporal_extractor.extract, text)))
    if opts["extract_numeric"]:
        tasks.append(("numeric", asyncio.to_thread(numeric_extractor.extract, text)))

    results: dict[str, list] = {
        "entities": [],
        "claims": [],
        "temporal_markers": [],
        "numeric_facts": [],
    }

    if tasks:
        keys = [t[0] for t in tasks]
        coros = [t[1] for t in tasks]
        gathered = await asyncio.gather(*coros, return_exceptions=True)
        for key, result in zip(keys, gathered):
            if isinstance(result, Exception):
                logger.error(
                    "Extractor %s failed (request_id=%s): %s",
                    key, request_id, result,
                )
                continue
            if key == "temporal":
                results["temporal_markers"] = result
            elif key == "numeric":
                results["numeric_facts"] = result
            else:
                results[key] = result

    return {
        **results,
        "source_metadata": {
            "request_id": request_id,
            "source_type": source_type,
            "line_count": line_count,
            "char_count": char_count,
            "backend": entity_extractor.backend,
        },
    }


async def process_large_document(
    text: str,
    chunk_size: int,
    source_type: str,
    options: dict[str, bool] | None = None,
    request_id: str | None = None,
) -> dict[str, Any]:
    """Process a large document in chunks with parallel processing and result merging.

    Splits the document into line-based chunks, processes each chunk in parallel,
    then merges and deduplicates results. Line offsets are adjusted so all
    source locations reference the original document.

    Args:
        text: Full document text
        chunk_size: Number of lines per chunk
        source_type: Type of source document
        options: Which extractors to run
        request_id: Request ID for observability

    Returns:
        Merged extraction results.
    """
    if request_id is None:
        request_id = str(uuid.uuid4())

    if chunk_size < 50:
        chunk_size = 50  # minimum chunk size

    chunks = _split_into_chunks(text, chunk_size)
    logger.info(
        "Processing %d chunks (request_id=%s)", len(chunks), request_id
    )

    # Process chunks with bounded concurrency
    sem = asyncio.Semaphore(10)

    async def _limited_chunk(chunk_text: str, line_offset: int, chunk_id: str) -> dict[str, Any]:
        async with sem:
            return await _process_chunk(chunk_text, line_offset, source_type, options, chunk_id)

    chunk_tasks = []
    for idx, (chunk_text, line_offset) in enumerate(chunks):
        chunk_id = f"{request_id}:chunk-{idx}"
        chunk_tasks.append(_limited_chunk(chunk_text, line_offset, chunk_id))

    chunk_results = await asyncio.gather(*chunk_tasks, return_exceptions=True)

    # Merge results
    all_entities: list[dict] = []
    all_claims: list[dict] = []
    all_temporal: list[dict] = []
    all_numeric: list[dict] = []

    for result in chunk_results:
        if isinstance(result, Exception):
            logger.error("Chunk processing failed: %s", result)
            continue
        all_entities.extend(result.get("entities", []))
        all_claims.extend(result.get("claims", []))
        all_temporal.extend(result.get("temporal_markers", []))
        all_numeric.extend(result.get("numeric_facts", []))

    # Deduplicate across chunks
    entities = _deduplicate_entities(all_entities)
    claims = _deduplicate_claims(all_claims)
    temporal = _deduplicate_temporal(all_temporal)
    numeric = _deduplicate_numeric(all_numeric)

    line_count = text.count("\n") + 1
    char_count = len(text)

    return {
        "entities": entities,
        "claims": claims,
        "temporal_markers": temporal,
        "numeric_facts": numeric,
        "source_metadata": {
            "request_id": request_id,
            "source_type": source_type,
            "line_count": line_count,
            "char_count": char_count,
            "chunks_processed": len(chunks),
            "chunk_size": chunk_size,
            "backend": EntityExtractor().backend,
        },
    }


async def _process_chunk(
    chunk_text: str,
    line_offset: int,
    source_type: str,
    options: dict[str, bool] | None,
    chunk_id: str,
) -> dict[str, Any]:
    """Process a single chunk with line offset adjustment."""
    opts = {
        "extract_entities": True,
        "extract_claims": True,
        "extract_temporal": True,
        "extract_numeric": True,
        **(options or {}),
    }

    entity_extractor = EntityExtractor()
    claim_extractor = ClaimExtractor()
    temporal_extractor = TemporalExtractor()
    numeric_extractor = NumericExtractor()

    results: dict[str, list] = {
        "entities": [],
        "claims": [],
        "temporal_markers": [],
        "numeric_facts": [],
    }

    tasks: list[tuple[str, Any]] = []
    if opts["extract_entities"]:
        tasks.append(("entities", entity_extractor.extract(chunk_text, line_offset)))
    if opts["extract_claims"]:
        tasks.append(("claims", claim_extractor.extract(chunk_text, line_offset)))
    if opts["extract_temporal"]:
        tasks.append((
            "temporal",
            asyncio.to_thread(temporal_extractor.extract, chunk_text, line_offset),
        ))
    if opts["extract_numeric"]:
        tasks.append((
            "numeric",
            asyncio.to_thread(numeric_extractor.extract, chunk_text, line_offset),
        ))

    if tasks:
        keys = [t[0] for t in tasks]
        coros = [t[1] for t in tasks]
        gathered = await asyncio.gather(*coros, return_exceptions=True)
        for key, result in zip(keys, gathered):
            if isinstance(result, Exception):
                logger.error("Chunk %s extractor %s failed: %s", chunk_id, key, result)
                continue
            if key == "temporal":
                results["temporal_markers"] = result
            elif key == "numeric":
                results["numeric_facts"] = result
            else:
                results[key] = result

    return results
