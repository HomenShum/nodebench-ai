"""
Numeric fact extraction.

Extracts monetary values, percentages, financial metrics (revenue, ARR, MRR,
burn rate, runway), and other quantitative data with source line tracking.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from typing import Any


@dataclass
class NumericFact:
    metric: str
    value: float
    units: str
    context: str
    line_number: int
    raw_text: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ---- Multiplier parsing ----

_MULTIPLIERS: dict[str, float] = {
    "thousand": 1_000,
    "k": 1_000,
    "million": 1_000_000,
    "m": 1_000_000,
    "mm": 1_000_000,
    "mn": 1_000_000,
    "billion": 1_000_000_000,
    "b": 1_000_000_000,
    "bn": 1_000_000_000,
    "trillion": 1_000_000_000_000,
    "t": 1_000_000_000_000,
    "tn": 1_000_000_000_000,
}

# ---- Patterns ----

# Monetary: $X million/billion, $X.XM, $X,XXX
_MONETARY_RE = re.compile(
    r"\$\s*([\d,]+(?:\.\d+)?)\s*"
    r"(thousand|million|billion|trillion|[kKmMbBtT]n?)?",
    re.IGNORECASE,
)

# Non-USD currencies: EUR/GBP/JPY X million
_CURRENCY_RE = re.compile(
    r"\b(EUR|GBP|JPY|CNY|CAD|AUD|CHF)\s*([\d,]+(?:\.\d+)?)\s*"
    r"(thousand|million|billion|trillion|[kKmMbBtT]n?)?",
    re.IGNORECASE,
)

# Percentage: X% or X.X% with optional direction
_PERCENTAGE_RE = re.compile(
    r"([\d,]+(?:\.\d+)?)\s*%\s*"
    r"(increase|decrease|growth|decline|drop|rise|gain|loss|"
    r"higher|lower|up|down|YoY|QoQ|MoM)?",
    re.IGNORECASE,
)

# Financial metrics with values
_FINANCIAL_METRIC_RE = re.compile(
    r"\b(revenue|ARR|MRR|EBITDA|net\s+income|gross\s+profit|"
    r"operating\s+income|free\s+cash\s+flow|FCF|"
    r"burn\s+rate|runway|"
    r"market\s+cap|valuation|"
    r"AUM|assets\s+under\s+management|"
    r"total\s+funding|series\s+[A-F]|"
    r"GMV|gross\s+merchandise\s+value|"
    r"bookings|backlog|pipeline|"
    r"CAC|LTV|ARPU|ARPA|NRR|GRR|"
    r"headcount|employees|FTEs?)\b"
    r"\s*(?:of|:|\s+was|\s+is|\s+reached|\s+hit|\s+totaled)?\s*"
    r"\$?\s*([\d,]+(?:\.\d+)?)\s*"
    r"(thousand|million|billion|trillion|[kKmMbBtT]n?)?",
    re.IGNORECASE,
)

# Multiplier: NNNx or N.Nx
_MULTIPLIER_RE = re.compile(
    r"\b([\d,]+(?:\.\d+)?)\s*[xX]\s+"
    r"(revenue|ARR|growth|return|multiple|valuation|"
    r"increase|improvement|faster|larger|bigger)",
    re.IGNORECASE,
)

# Count/quantity: "N users", "N customers", etc
_COUNT_RE = re.compile(
    r"\b([\d,]+(?:\.\d+)?)\s*(?:k|K|M|m|B|b)?\s+"
    r"(users|customers|employees|clients|subscribers|"
    r"developers|engineers|downloads|installs|"
    r"transactions|orders|deals|contracts|"
    r"nodes|servers|endpoints|clusters|"
    r"countries|cities|markets|regions)\b",
    re.IGNORECASE,
)

# Duration/time metrics: "N months runway", "N days", etc
_DURATION_RE = re.compile(
    r"\b([\d,]+(?:\.\d+)?)\s*"
    r"(months?|years?|weeks?|days?|quarters?)\s+"
    r"(?:of\s+)?(runway|timeline|deadline|sprint|cycle|window)",
    re.IGNORECASE,
)


def _parse_number(raw: str) -> float:
    """Parse a number string, removing commas."""
    return float(raw.replace(",", ""))


def _apply_multiplier(value: float, mult_str: str | None) -> tuple[float, str]:
    """Apply multiplier suffix and return (value, units)."""
    if not mult_str:
        return value, "USD"
    mult_key = mult_str.lower().strip()
    multiplier = _MULTIPLIERS.get(mult_key, 1.0)
    return value * multiplier, "USD"


def _context_window(lines: list[str], idx: int, window: int = 0) -> str:
    """Get the line as context."""
    if 0 <= idx < len(lines):
        return lines[idx].strip()
    return ""


class NumericExtractor:
    """Extract numeric facts from text."""

    def extract(
        self, text: str, line_offset: int = 0
    ) -> list[dict[str, Any]]:
        """Extract all numeric facts with source tracking."""
        lines = text.split("\n")
        facts: list[NumericFact] = []
        seen: set[tuple[str, int]] = set()

        for i, line in enumerate(lines):
            line_num = i + 1 + line_offset
            ctx = _context_window(lines, i)

            # Monetary values
            for m in _MONETARY_RE.finditer(line):
                raw_val = m.group(1)
                mult = m.group(2)
                value, units = _apply_multiplier(_parse_number(raw_val), mult)
                raw_text = m.group(0).strip()
                key = (raw_text, line_num)
                if key in seen:
                    continue
                seen.add(key)
                facts.append(
                    NumericFact(
                        metric="monetary",
                        value=value,
                        units=units,
                        context=ctx,
                        line_number=line_num,
                        raw_text=raw_text,
                    )
                )

            # Non-USD currencies
            for m in _CURRENCY_RE.finditer(line):
                currency = m.group(1).upper()
                raw_val = m.group(2)
                mult = m.group(3)
                value = _parse_number(raw_val)
                if mult:
                    mult_key = mult.lower().strip()
                    value *= _MULTIPLIERS.get(mult_key, 1.0)
                raw_text = m.group(0).strip()
                key = (raw_text, line_num)
                if key in seen:
                    continue
                seen.add(key)
                facts.append(
                    NumericFact(
                        metric="monetary",
                        value=value,
                        units=currency,
                        context=ctx,
                        line_number=line_num,
                        raw_text=raw_text,
                    )
                )

            # Percentages
            for m in _PERCENTAGE_RE.finditer(line):
                value = _parse_number(m.group(1))
                direction = m.group(2) or ""
                raw_text = m.group(0).strip()
                key = (raw_text, line_num)
                if key in seen:
                    continue
                seen.add(key)
                metric = "percentage"
                if direction:
                    metric = f"percentage_{direction.lower()}"
                facts.append(
                    NumericFact(
                        metric=metric,
                        value=value,
                        units="%",
                        context=ctx,
                        line_number=line_num,
                        raw_text=raw_text,
                    )
                )

            # Financial metrics
            for m in _FINANCIAL_METRIC_RE.finditer(line):
                metric_name = m.group(1).strip().lower()
                raw_val = m.group(2)
                mult = m.group(3)
                value = _parse_number(raw_val)
                units = "USD"
                if mult:
                    mult_key = mult.lower().strip()
                    value *= _MULTIPLIERS.get(mult_key, 1.0)
                raw_text = m.group(0).strip()
                key = (raw_text, line_num)
                if key in seen:
                    continue
                seen.add(key)
                # Normalize metric name
                metric_name = metric_name.replace(" ", "_")
                facts.append(
                    NumericFact(
                        metric=metric_name,
                        value=value,
                        units=units,
                        context=ctx,
                        line_number=line_num,
                        raw_text=raw_text,
                    )
                )

            # Multipliers (NNNx)
            for m in _MULTIPLIER_RE.finditer(line):
                value = _parse_number(m.group(1))
                subject = m.group(2).strip().lower()
                raw_text = m.group(0).strip()
                key = (raw_text, line_num)
                if key in seen:
                    continue
                seen.add(key)
                facts.append(
                    NumericFact(
                        metric=f"multiplier_{subject}",
                        value=value,
                        units="x",
                        context=ctx,
                        line_number=line_num,
                        raw_text=raw_text,
                    )
                )

            # Counts
            for m in _COUNT_RE.finditer(line):
                raw_val = m.group(1)
                subject = m.group(2).strip().lower()
                value = _parse_number(raw_val)
                raw_text = m.group(0).strip()
                key = (raw_text, line_num)
                if key in seen:
                    continue
                seen.add(key)
                # Check for inline multiplier suffix
                suffix_match = re.search(r"[kKmMbB]", raw_text.split()[0][-1:] if raw_text.split() else "")
                if suffix_match:
                    mult_char = suffix_match.group(0).lower()
                    value *= _MULTIPLIERS.get(mult_char, 1.0)
                facts.append(
                    NumericFact(
                        metric=f"count_{subject}",
                        value=value,
                        units="count",
                        context=ctx,
                        line_number=line_num,
                        raw_text=raw_text,
                    )
                )

            # Duration
            for m in _DURATION_RE.finditer(line):
                value = _parse_number(m.group(1))
                unit = m.group(2).strip().lower().rstrip("s")
                subject = m.group(3).strip().lower()
                raw_text = m.group(0).strip()
                key = (raw_text, line_num)
                if key in seen:
                    continue
                seen.add(key)
                facts.append(
                    NumericFact(
                        metric=f"duration_{subject}",
                        value=value,
                        units=unit,
                        context=ctx,
                        line_number=line_num,
                        raw_text=raw_text,
                    )
                )

        return [f.to_dict() for f in facts]
