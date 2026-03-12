"""
Ingestion Extract microservice.

Turns messy text dumps into structured temporal observations with exact source
references. This service stays narrow on purpose: extract first, reason later.
"""

from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from extractors.claim_extractor import ClaimExtractor
from extractors.entity_extractor import EntityExtractor
from extractors.numeric_extractor import NumericExtractor
from extractors.temporal_extractor import TemporalExtractor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ingestion-extract")


class ExtractRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500000, description="Unstructured text to extract from")
    lineOffset: int = Field(0, ge=0, description="Base line number offset for source spans")
    sourceLabel: str | None = Field(None, description="Friendly source label for the payload")
    referenceDateIso: str | None = Field(
        None,
        description="Optional ISO date used to resolve relative temporal markers",
    )
    requestId: str | None = Field(None, description="Caller-provided request identifier")


class ChunkedExtractionRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000000, description="Large text for chunked extraction")
    chunk_size: int = Field(500, ge=50, le=5000, description="Lines per chunk")
    source_type: str = Field("general", description="Source type hint")
    requestId: str | None = Field(None, description="Caller-provided request identifier")


class ExtractionSummary(BaseModel):
    entityCount: int
    claimCount: int
    numericFactCount: int
    temporalMarkerCount: int
    errorCount: int


class ExtractResponse(BaseModel):
    requestId: str
    sourceLabel: str | None
    lineOffset: int
    lineCount: int
    textLength: int
    processingMs: float
    backends: dict[str, str]
    entities: list[dict[str, Any]]
    claims: list[dict[str, Any]]
    numericFacts: list[dict[str, Any]]
    temporalMarkers: list[dict[str, Any]]
    errors: list[dict[str, str]]
    summary: ExtractionSummary


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str
    entityBackend: str
    claimBackend: str
    numericBackend: str
    temporalBackend: str


app = FastAPI(
    title="Ingestion Extract",
    version="0.1.0",
    description="Exact-source extraction for temporal observations, claims, entities, and numeric facts.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _request_id(request_id: str | None) -> str:
    return request_id or f"ing_{uuid.uuid4().hex[:12]}"


def _parse_reference_date(reference_date_iso: str | None) -> datetime | None:
    if not reference_date_iso:
        return None
    normalized = reference_date_iso.strip().replace("Z", "+00:00")
    return datetime.fromisoformat(normalized)


def _claim_backend() -> str:
    # Claim extractor follows the same fallback order as entity extraction.
    from os import environ

    if environ.get("OLLAMA_URL", "").strip():
        return "ollama"
    if environ.get("GEMINI_API_KEY", "").strip():
        return "gemini"
    return "regex"


async def _extract_all(req: ExtractRequest) -> ExtractResponse:
    rid = _request_id(req.requestId)
    ref_date = _parse_reference_date(req.referenceDateIso)
    line_count = len(req.text.splitlines()) or 1
    errors: list[dict[str, str]] = []

    logger.info(
        "[%s] /extract source=%s chars=%d lines=%d",
        rid,
        req.sourceLabel or "unlabeled",
        len(req.text),
        line_count,
    )

    entity_extractor = EntityExtractor()
    claim_extractor = ClaimExtractor()
    numeric_extractor = NumericExtractor()
    temporal_extractor = TemporalExtractor(reference_date=ref_date)

    t0 = time.perf_counter()
    entities: list[dict[str, Any]] = []
    claims: list[dict[str, Any]] = []
    numeric_facts: list[dict[str, Any]] = []
    temporal_markers: list[dict[str, Any]] = []

    try:
        entities = await entity_extractor.extract(req.text, line_offset=req.lineOffset)
    except Exception as exc:
        logger.exception("[%s] entity extraction failed", rid)
        errors.append({"stage": "entities", "message": str(exc)})

    try:
        claims = await claim_extractor.extract(req.text, line_offset=req.lineOffset)
    except Exception as exc:
        logger.exception("[%s] claim extraction failed", rid)
        errors.append({"stage": "claims", "message": str(exc)})

    try:
        numeric_facts = numeric_extractor.extract(req.text, line_offset=req.lineOffset)
    except Exception as exc:
        logger.exception("[%s] numeric extraction failed", rid)
        errors.append({"stage": "numericFacts", "message": str(exc)})

    try:
        temporal_markers = temporal_extractor.extract(req.text, line_offset=req.lineOffset)
    except Exception as exc:
        logger.exception("[%s] temporal extraction failed", rid)
        errors.append({"stage": "temporalMarkers", "message": str(exc)})

    if errors and not (entities or claims or numeric_facts or temporal_markers):
        raise HTTPException(
            status_code=500,
            detail={
                "error": "all_extractors_failed",
                "requestId": rid,
                "errors": errors,
            },
        )

    processing_ms = round((time.perf_counter() - t0) * 1000, 2)
    return ExtractResponse(
        requestId=rid,
        sourceLabel=req.sourceLabel,
        lineOffset=req.lineOffset,
        lineCount=line_count,
        textLength=len(req.text),
        processingMs=processing_ms,
        backends={
            "entities": entity_extractor.backend,
            "claims": _claim_backend(),
            "numericFacts": "regex",
            "temporalMarkers": "rule_based",
        },
        entities=entities,
        claims=claims,
        numericFacts=numeric_facts,
        temporalMarkers=temporal_markers,
        errors=errors,
        summary=ExtractionSummary(
            entityCount=len(entities),
            claimCount=len(claims),
            numericFactCount=len(numeric_facts),
            temporalMarkerCount=len(temporal_markers),
            errorCount=len(errors),
        ),
    )


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    entity_extractor = EntityExtractor()
    return HealthResponse(
        status="ok",
        service="ingestion-extract",
        timestamp=datetime.utcnow().isoformat() + "Z",
        entityBackend=entity_extractor.backend,
        claimBackend=_claim_backend(),
        numericBackend="regex",
        temporalBackend="rule_based",
    )


@app.post("/extract", response_model=ExtractResponse)
async def extract(req: ExtractRequest) -> ExtractResponse:
    return await _extract_all(req)


@app.post("/extract/entities")
async def extract_entities(req: ExtractRequest) -> dict[str, Any]:
    entity_extractor = EntityExtractor()
    return {
        "requestId": _request_id(req.requestId),
        "sourceLabel": req.sourceLabel,
        "lineOffset": req.lineOffset,
        "backend": entity_extractor.backend,
        "entities": await entity_extractor.extract(req.text, line_offset=req.lineOffset),
    }


@app.post("/extract/claims")
async def extract_claims(req: ExtractRequest) -> dict[str, Any]:
    claim_extractor = ClaimExtractor()
    return {
        "requestId": _request_id(req.requestId),
        "sourceLabel": req.sourceLabel,
        "lineOffset": req.lineOffset,
        "backend": _claim_backend(),
        "claims": await claim_extractor.extract(req.text, line_offset=req.lineOffset),
    }


@app.post("/extract/numeric")
async def extract_numeric(req: ExtractRequest) -> dict[str, Any]:
    numeric_extractor = NumericExtractor()
    return {
        "requestId": _request_id(req.requestId),
        "sourceLabel": req.sourceLabel,
        "lineOffset": req.lineOffset,
        "backend": "regex",
        "numericFacts": numeric_extractor.extract(req.text, line_offset=req.lineOffset),
    }


@app.post("/extract/temporal")
async def extract_temporal(req: ExtractRequest) -> dict[str, Any]:
    temporal_extractor = TemporalExtractor(reference_date=_parse_reference_date(req.referenceDateIso))
    return {
        "requestId": _request_id(req.requestId),
        "sourceLabel": req.sourceLabel,
        "lineOffset": req.lineOffset,
        "backend": "rule_based",
        "temporalMarkers": temporal_extractor.extract(req.text, line_offset=req.lineOffset),
    }
