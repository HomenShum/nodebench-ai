"""
Temporal marker extraction and resolution.

Patterns: Q1-Q4 YYYY, Month YYYY, ISO dates, relative (next/last week/month/quarter).
Resolves relative dates to absolute timestamps.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Any


@dataclass
class TemporalMarker:
    text: str
    resolved_date: str | None  # ISO format YYYY-MM-DD or None
    resolved_end: str | None  # end of range if applicable
    line_number: int
    confidence: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ---- Patterns ----

# Q1-Q4 with optional year
_QUARTER_RE = re.compile(
    r"\b(Q([1-4]))\s*[,']?\s*(20\d{2})?\b", re.IGNORECASE
)

# Full month + optional day + year: "January 2025", "March 15, 2025"
_MONTH_YEAR_RE = re.compile(
    r"\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
    r"Dec(?:ember)?)\s+(\d{1,2},?\s+)?(20\d{2}))\b",
    re.IGNORECASE,
)

# ISO date: 2025-01-15
_ISO_DATE_RE = re.compile(r"\b(20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\b")

# US date: 01/15/2025 or 1/15/2025
_US_DATE_RE = re.compile(
    r"\b((?:0?[1-9]|1[0-2])/(?:0?[1-9]|[12]\d|3[01])/20\d{2})\b"
)

# Relative: last/next/this week/month/quarter/year
_RELATIVE_RE = re.compile(
    r"\b((?:last|next|this|previous|coming|past)\s+"
    r"(?:week|month|quarter|year|fiscal\s+year))\b",
    re.IGNORECASE,
)

# Simple relative: yesterday, today, tomorrow
_SIMPLE_RELATIVE_RE = re.compile(
    r"\b(yesterday|today|tomorrow)\b", re.IGNORECASE
)

# Year only: "in 2025", "since 2024", "by 2026"
_YEAR_ONLY_RE = re.compile(
    r"\b(?:in|since|by|during|for|from)\s+(20\d{2})\b", re.IGNORECASE
)

# Fiscal year: FY2025, FY 2025
_FISCAL_YEAR_RE = re.compile(r"\bFY\s*'?(20\d{2})\b", re.IGNORECASE)

# Month abbreviation mapping
_MONTH_MAP: dict[str, int] = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

# Quarter start months
_QUARTER_STARTS = {1: 1, 2: 4, 3: 7, 4: 10}
_QUARTER_ENDS = {1: 3, 2: 6, 3: 9, 4: 12}


def _quarter_to_dates(
    q: int, year: int | None, ref: datetime
) -> tuple[str, str]:
    """Convert quarter to start/end ISO dates."""
    y = year or ref.year
    start_month = _QUARTER_STARTS[q]
    end_month = _QUARTER_ENDS[q]
    start = datetime(y, start_month, 1)
    # End of quarter: last day of end_month
    if end_month == 12:
        end = datetime(y, 12, 31)
    else:
        end = datetime(y, end_month + 1, 1) - timedelta(days=1)
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


def _resolve_relative(
    text: str, ref: datetime
) -> tuple[str | None, str | None]:
    """Resolve relative temporal markers to absolute dates."""
    lower = text.lower().strip()

    if lower == "yesterday":
        d = ref - timedelta(days=1)
        s = d.strftime("%Y-%m-%d")
        return s, s
    if lower == "today":
        s = ref.strftime("%Y-%m-%d")
        return s, s
    if lower == "tomorrow":
        d = ref + timedelta(days=1)
        s = d.strftime("%Y-%m-%d")
        return s, s

    # Parse "last/next/this <period>"
    match = re.match(
        r"(last|next|this|previous|coming|past)\s+"
        r"(week|month|quarter|year|fiscal\s+year)",
        lower,
    )
    if not match:
        return None, None

    direction = match.group(1)
    period = match.group(2).replace("fiscal ", "")

    if direction in ("last", "previous", "past"):
        offset = -1
    elif direction in ("next", "coming"):
        offset = 1
    else:
        offset = 0

    if period == "week":
        # Week starts Monday
        start_of_this_week = ref - timedelta(days=ref.weekday())
        start = start_of_this_week + timedelta(weeks=offset)
        end = start + timedelta(days=6)
    elif period == "month":
        month = ref.month + offset
        year = ref.year
        while month < 1:
            month += 12
            year -= 1
        while month > 12:
            month -= 12
            year += 1
        start = datetime(year, month, 1)
        if month == 12:
            end = datetime(year, 12, 31)
        else:
            end = datetime(year, month + 1, 1) - timedelta(days=1)
    elif period == "quarter":
        current_q = (ref.month - 1) // 3 + 1
        target_q = current_q + offset
        target_year = ref.year
        while target_q < 1:
            target_q += 4
            target_year -= 1
        while target_q > 4:
            target_q -= 4
            target_year += 1
        s, e = _quarter_to_dates(target_q, target_year, ref)
        return s, e
    elif period == "year":
        target_year = ref.year + offset
        start = datetime(target_year, 1, 1)
        end = datetime(target_year, 12, 31)
    else:
        return None, None

    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


class TemporalExtractor:
    """Extract and resolve temporal markers from text."""

    def __init__(self, reference_date: datetime | None = None) -> None:
        self._ref = reference_date or datetime.now()

    def extract(
        self, text: str, line_offset: int = 0
    ) -> list[dict[str, Any]]:
        """Extract all temporal markers with resolved dates."""
        lines = text.split("\n")
        markers: list[TemporalMarker] = []
        seen: set[tuple[str, int]] = set()

        for i, line in enumerate(lines):
            line_num = i + 1 + line_offset

            # Q1-Q4
            for m in _QUARTER_RE.finditer(line):
                q_num = int(m.group(2))
                year_str = m.group(3)
                year = int(year_str) if year_str else None
                full_text = m.group(0).strip()
                key = (full_text.lower(), line_num)
                if key in seen:
                    continue
                seen.add(key)
                start, end = _quarter_to_dates(q_num, year, self._ref)
                markers.append(
                    TemporalMarker(full_text, start, end, line_num, 0.9)
                )

            # Month + Year
            for m in _MONTH_YEAR_RE.finditer(line):
                full_text = m.group(0).strip()
                key = (full_text.lower(), line_num)
                if key in seen:
                    continue
                seen.add(key)
                # Parse month
                parts = full_text.split()
                month_name = parts[0].lower().rstrip(",")
                month_num = _MONTH_MAP.get(month_name)
                if not month_num:
                    continue
                # Check if there's a day
                year_val = int(parts[-1])
                day_val = 1
                if len(parts) == 3:
                    day_str = parts[1].rstrip(",")
                    try:
                        day_val = int(day_str)
                    except ValueError:
                        day_val = 1
                try:
                    resolved = datetime(year_val, month_num, day_val)
                    markers.append(
                        TemporalMarker(
                            full_text,
                            resolved.strftime("%Y-%m-%d"),
                            None,
                            line_num,
                            0.95,
                        )
                    )
                except ValueError:
                    pass

            # ISO dates
            for m in _ISO_DATE_RE.finditer(line):
                full_text = m.group(1)
                key = (full_text, line_num)
                if key in seen:
                    continue
                seen.add(key)
                markers.append(
                    TemporalMarker(full_text, full_text, None, line_num, 1.0)
                )

            # US dates
            for m in _US_DATE_RE.finditer(line):
                full_text = m.group(1)
                key = (full_text, line_num)
                if key in seen:
                    continue
                seen.add(key)
                parts = full_text.split("/")
                try:
                    resolved = datetime(
                        int(parts[2]), int(parts[0]), int(parts[1])
                    )
                    markers.append(
                        TemporalMarker(
                            full_text,
                            resolved.strftime("%Y-%m-%d"),
                            None,
                            line_num,
                            0.9,
                        )
                    )
                except ValueError:
                    pass

            # Relative dates
            for m in _RELATIVE_RE.finditer(line):
                full_text = m.group(0).strip()
                key = (full_text.lower(), line_num)
                if key in seen:
                    continue
                seen.add(key)
                start, end = _resolve_relative(full_text, self._ref)
                markers.append(
                    TemporalMarker(full_text, start, end, line_num, 0.7)
                )

            # Simple relative (yesterday/today/tomorrow)
            for m in _SIMPLE_RELATIVE_RE.finditer(line):
                full_text = m.group(0).strip()
                key = (full_text.lower(), line_num)
                if key in seen:
                    continue
                seen.add(key)
                start, end = _resolve_relative(full_text, self._ref)
                markers.append(
                    TemporalMarker(full_text, start, end, line_num, 0.85)
                )

            # Year only
            for m in _YEAR_ONLY_RE.finditer(line):
                year_str = m.group(1)
                full_text = m.group(0).strip()
                key = (full_text.lower(), line_num)
                if key in seen:
                    continue
                seen.add(key)
                markers.append(
                    TemporalMarker(
                        full_text,
                        f"{year_str}-01-01",
                        f"{year_str}-12-31",
                        line_num,
                        0.6,
                    )
                )

            # Fiscal year
            for m in _FISCAL_YEAR_RE.finditer(line):
                year_str = m.group(1)
                full_text = m.group(0).strip()
                key = (full_text.lower(), line_num)
                if key in seen:
                    continue
                seen.add(key)
                markers.append(
                    TemporalMarker(
                        full_text,
                        f"{year_str}-01-01",
                        f"{year_str}-12-31",
                        line_num,
                        0.7,
                    )
                )

        return [m.to_dict() for m in markers]
