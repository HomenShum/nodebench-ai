"""
Claim extraction with 3-tier fallback: Ollama -> Gemini -> Regex heuristics.

Extracts atomic claims from text with:
- claim_text, claim_type (factual|predictive|evaluative|causal)
- entities mentioned, confidence
- source_span: {line_start, line_end, excerpt}
- temporal_marker (if any)
"""

from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass, field, asdict
from typing import Any

import httpx

logger = logging.getLogger(__name__)

CLAIM_TYPES = ["factual", "predictive", "evaluative", "causal"]

# ---- Regex heuristics for claim detection (tier-3) ----

# Factual: statements with concrete numbers, dates, or "is/are/was/were" assertions
_FACTUAL_PATTERNS = [
    re.compile(
        r"(?:is|are|was|were|has|have|had)\s+(?:a|an|the)?\s*\w+",
        re.IGNORECASE,
    ),
    re.compile(r"\b(?:reported|announced|confirmed|disclosed|revealed)\b", re.IGNORECASE),
    re.compile(r"\b(?:raised|secured|closed|generated|earned|lost)\s+\$", re.IGNORECASE),
    re.compile(r"\b(?:according to|based on|per|cited by)\b", re.IGNORECASE),
]

# Predictive: forward-looking statements
_PREDICTIVE_PATTERNS = [
    re.compile(
        r"\b(?:will|expect|forecast|predict|anticipate|project|plan to|"
        r"is expected to|are expected to|could|may|might|should|"
        r"is likely to|are likely to|is set to|poised to)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\b(?:by\s+(?:20\d{2}|Q[1-4]))\b", re.IGNORECASE),
    re.compile(r"\b(?:next\s+(?:year|quarter|month|decade))\b", re.IGNORECASE),
]

# Evaluative: judgment/opinion statements
_EVALUATIVE_PATTERNS = [
    re.compile(
        r"\b(?:best|worst|better|worse|superior|inferior|leading|lagging|"
        r"outperform|underperform|strong|weak|impressive|disappointing|"
        r"significant|negligible|remarkable|mediocre|critical|trivial)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\b(?:I believe|we think|in my view|arguably|clearly)\b", re.IGNORECASE),
]

# Causal: cause-effect statements
_CAUSAL_PATTERNS = [
    re.compile(
        r"\b(?:because|due to|caused by|resulted in|led to|driven by|"
        r"as a result|consequently|therefore|thus|hence|thanks to|"
        r"attributed to|stems from|owing to|triggered by)\b",
        re.IGNORECASE,
    ),
]

# Temporal markers to attach to claims
_TEMPORAL_RE = re.compile(
    r"\b(?:Q[1-4]\s*(?:20\d{2})?|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|"
    r"Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|"
    r"Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s*\d{0,2},?\s*\d{4}|"
    r"\d{4}-\d{2}-\d{2}|"
    r"(?:last|next|this)\s+(?:week|month|quarter|year)|"
    r"(?:yesterday|today|tomorrow))\b",
    re.IGNORECASE,
)

# Entity references within claims (capitalized phrases)
_ENTITY_REF_RE = re.compile(r"\b([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,3})\b")


@dataclass
class SourceSpan:
    line_start: int
    line_end: int
    excerpt: str


@dataclass
class Claim:
    claim_text: str
    claim_type: str
    entities_mentioned: list[str] = field(default_factory=list)
    confidence: float = 0.5
    source_span: SourceSpan | None = None
    temporal_marker: str | None = None

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        return d


# ---- LLM prompt ----

_CLAIM_PROMPT = """\
You are a precise claim extractor. Given the following text, extract all atomic claims.

Claim types:
- factual: verifiable statements about what is/was (numbers, dates, events)
- predictive: forward-looking statements about what will/might happen
- evaluative: judgments, opinions, comparisons
- causal: cause-effect relationships

For each claim, return a JSON array:
[
  {
    "claim_text": "the atomic claim",
    "claim_type": "factual|predictive|evaluative|causal",
    "entities_mentioned": ["Entity1", "Entity2"],
    "confidence": 0.0-1.0,
    "source_span": {"line_start": 1, "line_end": 1, "excerpt": "original text"},
    "temporal_marker": "Q1 2025" or null
  }
]

IMPORTANT: line numbers are 1-indexed. Return ONLY valid JSON, no markdown fences.

Text (with line numbers):
{numbered_text}
"""


def _number_lines(text: str) -> str:
    lines = text.split("\n")
    return "\n".join(f"{i+1}: {line}" for i, line in enumerate(lines))


def _classify_claim_type(sentence: str) -> tuple[str, float]:
    """Classify a sentence into claim type using regex patterns."""
    for pattern in _CAUSAL_PATTERNS:
        if pattern.search(sentence):
            return "causal", 0.6

    for pattern in _PREDICTIVE_PATTERNS:
        if pattern.search(sentence):
            return "predictive", 0.55

    for pattern in _EVALUATIVE_PATTERNS:
        if pattern.search(sentence):
            return "evaluative", 0.45

    for pattern in _FACTUAL_PATTERNS:
        if pattern.search(sentence):
            return "factual", 0.5

    return "factual", 0.3


def _extract_entities_from_text(text: str) -> list[str]:
    """Extract capitalized entity references from text."""
    # Filter out common sentence-start words
    stopwords = {
        "The", "This", "That", "These", "Those", "It", "They", "We", "He",
        "She", "Its", "Their", "Our", "His", "Her", "My", "Your", "In",
        "On", "At", "By", "For", "And", "But", "Or", "Not", "If", "So",
        "As", "An", "A", "To", "Of", "Is", "Are", "Was", "Were", "Be",
        "Has", "Have", "Had", "Do", "Does", "Did", "Will", "Would",
        "Could", "Should", "May", "Might", "Must", "Shall", "Can",
        "Also", "However", "Moreover", "Furthermore", "Additionally",
        "According", "Based", "Per", "Despite", "Although", "While",
        "Since", "Because", "After", "Before", "During", "Between",
        "January", "February", "March", "April", "June", "July",
        "August", "September", "October", "November", "December",
    }
    matches = _ENTITY_REF_RE.findall(text)
    return [m for m in matches if m not in stopwords and len(m) > 1]


def _split_sentences(text: str) -> list[tuple[str, int, int]]:
    """Split text into sentences with line tracking.

    Returns list of (sentence, start_line_0indexed, end_line_0indexed).
    """
    lines = text.split("\n")
    sentences: list[tuple[str, int, int]] = []
    current: list[str] = []
    start_line = 0

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            if current:
                sentences.append((" ".join(current), start_line, i - 1))
                current = []
            start_line = i + 1
            continue

        # Split on sentence boundaries within a line
        parts = re.split(r"(?<=[.!?])\s+", stripped)
        for j, part in enumerate(parts):
            part = part.strip()
            if not part:
                continue
            if not current:
                start_line = i
            current.append(part)
            # If this part ends with sentence-ending punctuation, flush
            if re.search(r"[.!?]$", part) and len(" ".join(current)) > 20:
                sentences.append((" ".join(current), start_line, i))
                current = []
                start_line = i

    if current:
        sentences.append((" ".join(current), start_line, len(lines) - 1))

    return sentences


class ClaimExtractor:
    """3-tier claim extractor: Ollama -> Gemini -> Regex heuristics."""

    def __init__(self) -> None:
        self._ollama_url = os.environ.get("OLLAMA_URL", "").rstrip("/")
        self._ollama_model = os.environ.get("OLLAMA_MODEL", "llama3.2")
        self._gemini_key = os.environ.get("GEMINI_API_KEY", "")
        self._gemini_model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

    async def extract(
        self, text: str, line_offset: int = 0
    ) -> list[dict[str, Any]]:
        """Extract claims with 3-tier fallback."""
        claims: list[Claim] = []

        if self._ollama_url:
            try:
                claims = await self._extract_llm(
                    text, line_offset, backend="ollama"
                )
                if claims:
                    return [c.to_dict() for c in claims]
            except Exception as exc:
                logger.warning("Ollama claim extraction failed: %s", exc)

        if self._gemini_key:
            try:
                claims = await self._extract_llm(
                    text, line_offset, backend="gemini"
                )
                if claims:
                    return [c.to_dict() for c in claims]
            except Exception as exc:
                logger.warning("Gemini claim extraction failed: %s", exc)

        claims = self._extract_regex(text, line_offset)
        return [c.to_dict() for c in claims]

    async def _extract_llm(
        self, text: str, line_offset: int, backend: str
    ) -> list[Claim]:
        numbered = _number_lines(text)
        prompt = _CLAIM_PROMPT.format(numbered_text=numbered)

        if backend == "ollama":
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    f"{self._ollama_url}/api/generate",
                    json={
                        "model": self._ollama_model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {"temperature": 0.1},
                    },
                )
                resp.raise_for_status()
                raw = resp.json().get("response", "")
        else:
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{self._gemini_model}:generateContent"
            )
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    url,
                    headers={"x-goog-api-key": self._gemini_key},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.1},
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                raw = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                )

        return self._parse_llm_response(raw, line_offset)

    def _parse_llm_response(self, raw: str, line_offset: int) -> list[Claim]:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = "\n".join(cleaned.split("\n")[1:])
        if cleaned.endswith("```"):
            cleaned = "\n".join(cleaned.split("\n")[:-1])
        cleaned = cleaned.strip()

        try:
            items = json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\[.*\]", cleaned, re.DOTALL)
            if match:
                try:
                    items = json.loads(match.group())
                except json.JSONDecodeError:
                    return []
            else:
                return []

        if not isinstance(items, list):
            return []

        claims: list[Claim] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            ct = item.get("claim_text", "").strip()
            if not ct:
                continue
            ctype = item.get("claim_type", "factual").lower()
            if ctype not in CLAIM_TYPES:
                ctype = "factual"

            span_data = item.get("source_span", {})
            span = None
            if span_data:
                span = SourceSpan(
                    line_start=int(span_data.get("line_start", 1)) + line_offset,
                    line_end=int(span_data.get("line_end", 1)) + line_offset,
                    excerpt=span_data.get("excerpt", ct),
                )

            claims.append(
                Claim(
                    claim_text=ct,
                    claim_type=ctype,
                    entities_mentioned=item.get("entities_mentioned", []),
                    confidence=float(item.get("confidence", 0.7)),
                    source_span=span,
                    temporal_marker=item.get("temporal_marker"),
                )
            )

        return claims

    def _extract_regex(self, text: str, line_offset: int) -> list[Claim]:
        """Regex-based claim extraction from sentence splitting."""
        sentences = _split_sentences(text)
        claims: list[Claim] = []

        for sentence, start_line, end_line in sentences:
            # Skip very short or trivial sentences
            if len(sentence) < 30:
                continue
            # Skip lines that look like headers, code, or metadata
            if sentence.startswith("#") or sentence.startswith("```"):
                continue
            if re.match(r"^\s*[\-\*]\s*$", sentence):
                continue

            claim_type, confidence = _classify_claim_type(sentence)
            entities = _extract_entities_from_text(sentence)

            # Extract temporal marker if present
            temporal_match = _TEMPORAL_RE.search(sentence)
            temporal = temporal_match.group(0) if temporal_match else None

            span = SourceSpan(
                line_start=start_line + 1 + line_offset,
                line_end=end_line + 1 + line_offset,
                excerpt=sentence[:200],
            )

            claims.append(
                Claim(
                    claim_text=sentence,
                    claim_type=claim_type,
                    entities_mentioned=entities,
                    confidence=confidence,
                    source_span=span,
                    temporal_marker=temporal,
                )
            )

        return claims
