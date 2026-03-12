"""
Entity extraction with 3-tier fallback: Ollama -> Gemini -> Regex.

Entity types: company, person, technology, product, event, metric, regulation, location.
Each entity includes exact source location (line_start, line_end, excerpt, context).
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

ENTITY_TYPES = [
    "company",
    "person",
    "technology",
    "product",
    "event",
    "metric",
    "regulation",
    "location",
]

# ---- Regex patterns per entity type (tier-3 fallback) ----

# Company: capitalized multi-word phrases followed by Inc/Corp/LLC/Ltd/etc, or known suffixes
_COMPANY_SUFFIXES = (
    r"(?:Inc\.?|Corp\.?|LLC|Ltd\.?|Group|Holdings|Partners|Capital|Ventures|"
    r"Labs?|Technologies|Therapeutics|Biosciences|Pharmaceuticals|Genomics|"
    r"Systems|Networks|Solutions|Platform|AI|Studios)"
)
_COMPANY_RE = re.compile(
    rf"\b([A-Z][a-zA-Z0-9&]+(?:\s+[A-Z][a-zA-Z0-9&]+)*\s+{_COMPANY_SUFFIXES})\b"
)

# Person: two or three capitalized words (simple heuristic)
_PERSON_RE = re.compile(
    r"\b([A-Z][a-z]{1,20}\s+(?:[A-Z]\.?\s+)?[A-Z][a-z]{1,20})\b"
)

# Technology: known tech keywords / frameworks
_TECH_KEYWORDS = (
    r"\b(Kubernetes|Docker|React|TypeScript|JavaScript|Python|Rust|Go|Java|"
    r"TensorFlow|PyTorch|LangChain|GPT-\d|Claude|Gemini|CUDA|WebAssembly|"
    r"GraphQL|gRPC|Kafka|Redis|PostgreSQL|MongoDB|Elasticsearch|"
    r"Terraform|Ansible|WASM|ONNX|LLVM|Transformer|BERT|LLaMA|Mixtral|"
    r"Convex|Supabase|Firebase|Vercel|AWS|GCP|Azure|Cloudflare)\b"
)
_TECH_RE = re.compile(_TECH_KEYWORDS, re.IGNORECASE)

# Product: patterns like "ProductName v1.2" or "ProductName 2.0"
_PRODUCT_RE = re.compile(
    r"\b([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*)\s+v?(\d+\.\d+(?:\.\d+)?)\b"
)

# Event: patterns like "at <Event Name> 2025" or known event keywords
_EVENT_RE = re.compile(
    r"\b((?:(?:[A-Z][a-zA-Z]+\s+){1,4})(?:Summit|Conference|Expo|Forum|"
    r"Hackathon|Meetup|Workshop|Symposium|Congress|Convention)(?:\s+\d{4})?)\b"
)

# Metric: known business/financial metrics
_METRIC_RE = re.compile(
    r"\b(ARR|MRR|DAU|MAU|NPS|CAGR|EBITDA|P/E|ROI|CAC|LTV|"
    r"burn\s+rate|churn\s+rate|gross\s+margin|net\s+revenue|"
    r"revenue|valuation|market\s+cap)\b",
    re.IGNORECASE,
)

# Regulation: patterns like SEC Rule 10b-5, GDPR, SOX, etc
_REGULATION_RE = re.compile(
    r"\b(GDPR|SOX|HIPAA|PCI[\s-]DSS|CCPA|DORA|MiFID\s*II?|Basel\s*III?|"
    r"Dodd[\s-]Frank|SEC\s+Rule\s+\S+|Section\s+\d+[a-z]?|"
    r"Regulation\s+[A-Z]|EU\s+AI\s+Act|Executive\s+Order\s+\d+)\b",
    re.IGNORECASE,
)

# Location: simple capitals with state/country context
_LOCATION_RE = re.compile(
    r"\b(San\s+Francisco|New\s+York|Silicon\s+Valley|London|Berlin|Tokyo|"
    r"Singapore|Tel\s+Aviv|Beijing|Shanghai|Bangalore|Mumbai|"
    r"Seattle|Austin|Boston|Chicago|Los\s+Angeles|Washington\s+D\.?C\.?|"
    r"Toronto|Vancouver|Paris|Amsterdam|Zurich|Hong\s+Kong|Seoul|Sydney)\b",
    re.IGNORECASE,
)

_REGEX_MAP: dict[str, tuple[re.Pattern, str]] = {
    "company": (_COMPANY_RE, "company"),
    "person": (_PERSON_RE, "person"),
    "technology": (_TECH_RE, "technology"),
    "product": (_PRODUCT_RE, "product"),
    "event": (_EVENT_RE, "event"),
    "metric": (_METRIC_RE, "metric"),
    "regulation": (_REGULATION_RE, "regulation"),
    "location": (_LOCATION_RE, "location"),
}

# Common false-positive person names to skip
_PERSON_STOPWORDS = {
    "The", "This", "That", "These", "Those", "Which", "Where", "When",
    "What", "From", "With", "About", "After", "Before", "During",
    "Under", "Over", "Into", "Through", "Between", "Without",
    "New York", "Los Angeles", "San Francisco", "Hong Kong",
    "Last Week", "Next Week", "Last Month", "Next Month",
    "First Quarter", "Second Quarter", "Third Quarter", "Fourth Quarter",
}


@dataclass
class Mention:
    line_start: int
    line_end: int
    excerpt: str
    context: str


@dataclass
class Entity:
    name: str
    type: str
    confidence: float
    mentions: list[Mention] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ---- LLM prompt template ----

_NER_PROMPT = """\
You are a precise named-entity extractor. Given the following text, extract all entities.

Entity types: company, person, technology, product, event, metric, regulation, location.

For each entity, return JSON array of objects:
[
  {
    "name": "entity name",
    "type": "entity_type",
    "confidence": 0.0-1.0,
    "mentions": [
      {"line_start": 1, "line_end": 1, "excerpt": "exact text match"}
    ]
  }
]

IMPORTANT: line numbers are 1-indexed. Return ONLY valid JSON, no markdown fences.

Text (with line numbers prepended):
{numbered_text}
"""


def _number_lines(text: str) -> str:
    """Prepend 1-indexed line numbers to each line."""
    lines = text.split("\n")
    return "\n".join(f"{i+1}: {line}" for i, line in enumerate(lines))


def _context_window(lines: list[str], line_idx: int, window: int = 1) -> str:
    """Get surrounding context lines."""
    start = max(0, line_idx - window)
    end = min(len(lines), line_idx + window + 1)
    return " ".join(lines[start:end]).strip()


class EntityExtractor:
    """3-tier entity extractor: Ollama -> Gemini -> Regex."""

    def __init__(self) -> None:
        self._ollama_url = os.environ.get("OLLAMA_URL", "").rstrip("/")
        self._ollama_model = os.environ.get("OLLAMA_MODEL", "llama3.2")
        self._gemini_key = os.environ.get("GEMINI_API_KEY", "")
        self._gemini_model = os.environ.get(
            "GEMINI_MODEL", "gemini-2.0-flash"
        )
        self._backend: str = "regex"
        if self._ollama_url:
            self._backend = "ollama"
        elif self._gemini_key:
            self._backend = "gemini"

    @property
    def backend(self) -> str:
        return self._backend

    async def extract(
        self, text: str, line_offset: int = 0
    ) -> list[dict[str, Any]]:
        """Extract entities with 3-tier fallback. Returns list of entity dicts."""
        entities: list[Entity] = []

        if self._ollama_url:
            try:
                entities = await self._extract_ollama(text, line_offset)
                if entities:
                    return [e.to_dict() for e in entities]
            except Exception as exc:
                logger.warning("Ollama extraction failed, falling back: %s", exc)

        if self._gemini_key:
            try:
                entities = await self._extract_gemini(text, line_offset)
                if entities:
                    return [e.to_dict() for e in entities]
            except Exception as exc:
                logger.warning("Gemini extraction failed, falling back: %s", exc)

        entities = self._extract_regex(text, line_offset)
        return [e.to_dict() for e in entities]

    # ---- Tier 1: Ollama ----

    async def _extract_ollama(
        self, text: str, line_offset: int
    ) -> list[Entity]:
        numbered = _number_lines(text)
        prompt = _NER_PROMPT.format(numbered_text=numbered)

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

        return self._parse_llm_response(raw, text, line_offset)

    # ---- Tier 2: Gemini ----

    async def _extract_gemini(
        self, text: str, line_offset: int
    ) -> list[Entity]:
        numbered = _number_lines(text)
        prompt = _NER_PROMPT.format(numbered_text=numbered)

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self._gemini_model}:generateContent"
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1},
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=payload, headers={"x-goog-api-key": self._gemini_key})
            resp.raise_for_status()
            data = resp.json()

        raw = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        return self._parse_llm_response(raw, text, line_offset)

    # ---- Parse LLM JSON response ----

    def _parse_llm_response(
        self, raw: str, text: str, line_offset: int
    ) -> list[Entity]:
        """Parse JSON array from LLM response."""
        # Strip markdown fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = "\n".join(cleaned.split("\n")[1:])
        if cleaned.endswith("```"):
            cleaned = "\n".join(cleaned.split("\n")[:-1])
        cleaned = cleaned.strip()

        try:
            items = json.loads(cleaned)
        except json.JSONDecodeError:
            # Try to find JSON array in the response
            match = re.search(r"\[.*\]", cleaned, re.DOTALL)
            if match:
                try:
                    items = json.loads(match.group())
                except json.JSONDecodeError:
                    logger.warning("Could not parse LLM NER response as JSON")
                    return []
            else:
                return []

        if not isinstance(items, list):
            return []

        lines = text.split("\n")
        entities: list[Entity] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            name = item.get("name", "").strip()
            etype = item.get("type", "unknown").lower().strip()
            confidence = float(item.get("confidence", 0.8))
            if not name:
                continue
            if etype not in ENTITY_TYPES:
                etype = "unknown"

            mentions: list[Mention] = []
            for m in item.get("mentions", []):
                ls = int(m.get("line_start", 1)) + line_offset
                le = int(m.get("line_end", ls)) + line_offset
                excerpt = m.get("excerpt", name)
                ctx_idx = ls - line_offset - 1
                context = _context_window(lines, ctx_idx) if 0 <= ctx_idx < len(lines) else ""
                mentions.append(Mention(ls, le, excerpt, context))

            if not mentions:
                # Find mentions via simple text search
                for i, line in enumerate(lines):
                    if name.lower() in line.lower():
                        mentions.append(
                            Mention(
                                i + 1 + line_offset,
                                i + 1 + line_offset,
                                name,
                                _context_window(lines, i),
                            )
                        )

            entities.append(Entity(name, etype, confidence, mentions))

        return entities

    # ---- Tier 3: Regex ----

    def _extract_regex(self, text: str, line_offset: int) -> list[Entity]:
        """Deterministic regex-based entity extraction."""
        lines = text.split("\n")
        entity_map: dict[str, Entity] = {}

        for etype, (pattern, label) in _REGEX_MAP.items():
            for i, line in enumerate(lines):
                for match in pattern.finditer(line):
                    name = match.group(1) if match.lastindex else match.group(0)
                    name = name.strip()

                    # Skip false positives
                    if etype == "person" and name in _PERSON_STOPWORDS:
                        continue
                    if etype == "person" and len(name.split()) < 2:
                        continue

                    # For product matches, include version
                    if etype == "product" and match.lastindex and match.lastindex >= 2:
                        name = f"{match.group(1)} {match.group(2)}"

                    key = f"{label}:{name.lower()}"
                    mention = Mention(
                        line_start=i + 1 + line_offset,
                        line_end=i + 1 + line_offset,
                        excerpt=match.group(0).strip(),
                        context=_context_window(lines, i),
                    )

                    if key in entity_map:
                        entity_map[key].mentions.append(mention)
                    else:
                        # Regex confidence based on pattern specificity
                        conf = 0.7 if etype in ("company", "regulation") else 0.5
                        entity_map[key] = Entity(name, label, conf, [mention])

        return list(entity_map.values())
