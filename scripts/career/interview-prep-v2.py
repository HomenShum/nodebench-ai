"""
Interview Prep Dashboard v2 — CodingPrep style
Dark purple theme · Problem list · Study / Practice modes · AI Tutor · Progress tracking
Run: streamlit run scripts/career/interview-prep-v2.py --server.port 8502
"""

import streamlit as st
import sys, io, traceback, time, random, os, pandas as pd
from pathlib import Path
from dotenv import load_dotenv

try:
    from code_editor import code_editor
    HAS_CODE_EDITOR = True
except ImportError:
    HAS_CODE_EDITOR = False

load_dotenv(Path(__file__).parent / ".env")

# ─── Page config ────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="CodingPrep",
    page_icon="</>",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ─── CSS ────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
[data-testid="stAppViewContainer"] { background: #f9fafb; }
[data-testid="stSidebar"] { background: #f3f4f6 !important; border-right: 1px solid #e5e7eb; }
[data-testid="stHeader"] { display: none !important; }
.block-container { padding: 0.5rem 1.5rem !important; max-width: 100% !important; }
footer, #MainMenu { display: none !important; visibility: hidden; }

/* Typography */
body, * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #111827; }
code, pre, .stTextArea textarea { font-family: 'JetBrains Mono', 'Fira Code', monospace !important; }

/* Streamlit overrides */
.stTextArea textarea {
  background: #1e1e2e !important; color: #e2e8f0 !important;
  font-size: 13px !important; border: 1px solid #2e2e4e !important;
  border-radius: 6px !important; min-height: 280px !important;
}
.stButton > button {
  background: #6366f1 !important; color: white !important;
  border: none !important; border-radius: 6px !important;
  font-weight: 600 !important; font-size: 13px !important;
}
.stButton > button:hover { background: #4f46e5 !important; }

/* Compact buttons in list rows and practice action row */
[data-testid="stHorizontalBlock"] .stButton > button {
  padding: 4px 14px !important;
  font-size: 12px !important;
  min-height: 0 !important;
  line-height: 1.4 !important;
}
/* Input styling — light */
.stTextInput input, input[type="text"], input[type="search"] {
  background: #ffffff !important;
  color: #111827 !important;
  border: 1px solid #d1d5db !important;
  border-radius: 6px !important;
}
[data-testid="stTextInput"] input {
  background: #ffffff !important;
  color: #111827 !important;
  border: 1px solid #d1d5db !important;
}
/* Compact Ask button in tutor panel */
[data-testid="stVerticalBlock"] .stButton > button {
  padding: 5px 16px !important;
  font-size: 12px !important;
}

/* Scrollbar */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: #f1f5f9; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

/* Badges */
.badge-HARD   { display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;color:#dc2626;background:#fef2f2; }
.badge-MEDIUM { display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;color:#d97706;background:#fffbeb; }
.badge-EASY   { display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;color:#16a34a;background:#f0fdf4; }
.badge-topic  { display:inline-block;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:500;color:#6366f1;background:#eef2ff; }
.badge-id     { display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;color:#6366f1;background:#eef2ff;margin-right:6px; }
.badge-done   { display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;color:#16a34a;background:#f0fdf4; }

/* Problem card row */
.prob-row { display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid #e5e7eb; }
.prob-title { font-size:15px;font-weight:600;color:#111827; }
.prob-desc-short { font-size:12px;color:#6b7280;margin-top:2px; }
.prob-tags { font-size:11px;color:#9ca3af; }

/* Section label */
.section-label { font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin:20px 0 8px;padding-bottom:4px;border-bottom:1px solid #e5e7eb; }

/* Test results */
.test-pass { color:#16a34a;font-size:13px;padding:3px 0; }
.test-fail { color:#dc2626;font-size:13px;padding:3px 0; }
.test-output { background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:6px 10px;font-family:monospace;font-size:12px;color:#475569;margin:2px 0 8px;white-space:pre-wrap; }

/* Chat bubbles */
.chat-user { background:#eef2ff;padding:10px 14px;border-radius:8px;margin:6px 0;font-size:13px;color:#1e293b; }
.chat-ai   { background:#f8fafc;padding:10px 14px;border-radius:8px;margin:6px 0;font-size:13px;color:#374151;border-left:2px solid #6366f1; }
.chat-hint { background:#f0fdf4;padding:8px 12px;border-radius:6px;font-size:12px;color:#16a34a;border-left:2px solid #22c55e;margin:4px 0; }

/* Study prose */
.scenario-text { font-size:13px;color:#6b7280;line-height:1.7;margin-bottom:16px; }
.problem-text  { font-size:14px;color:#111827;line-height:1.75; }
.constraint    { font-size:13px;color:#6b7280;padding:2px 0; }
.example-block { background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin:8px 0; }
.example-label { font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:6px; }
.example-code  { font-family:monospace;font-size:12px;color:#1e293b;white-space:pre; }
.example-note  { font-size:12px;color:#9ca3af;margin-top:6px;font-style:italic; }

/* Progress */
.progress-topic-row { display:flex;justify-content:space-between;font-size:13px;margin:8px 0 4px; }
.progress-topic-name { color:#374151; }
.progress-count { color:#6366f1;font-weight:600; }
.progress-bar-bg   { background:#e5e7eb;border-radius:3px;height:4px; }
.progress-bar-fill { background:#6366f1;border-radius:3px;height:4px; }

/* Quiz */
.quiz-q { font-size:15px;font-weight:600;color:#111827;margin-bottom:16px;line-height:1.6; }
.quiz-explain { background:#eef2ff;border-left:2px solid #6366f1;padding:10px 14px;border-radius:6px;font-size:13px;color:#374151;margin-top:12px; }
.quiz-score-pass { color:#16a34a;font-weight:700; }
.quiz-score-fail { color:#dc2626;font-weight:700; }

/* Flashcard */
.flashcard { background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;margin:10px 0; }
.flashcard-q { font-size:15px;color:#111827;font-weight:600;line-height:1.6; }
.flashcard-a { font-size:13px;color:#6b7280;margin-top:12px;line-height:1.7; }
.star-tag { display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:#eef2ff;color:#6366f1;margin-bottom:8px; }
</style>
""", unsafe_allow_html=True)

# ─── Problems Database ───────────────────────────────────────────────────────

PROBLEMS = [
    # ══════════════════════════════════════════════════════════════════════════
    # STATEFUL — coding problems
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": "CP-001", "title": "LRU Cache",
        "topic": "Stateful", "difficulty": "HARD",
        "type": "code",
        "tags": ["#hash-map", "#doubly-linked-list", "#O(1)-design"],
        "desc": "Build a cache that evicts the least recently used entry when full.",
        "scenario": (
            "The Feeds team stores user profile metadata in PostgreSQL, but every feed render "
            "triggers dozens of profile lookups at ~50ms each. Add an in-process LRU cache to "
            "absorb repeated reads for hot profiles. The cache must fit in a fixed 512 MB heap "
            "budget, evict the LRU entry when full, and keep reads/writes at O(1)."
        ),
        "problem": (
            "Design and implement a Least Recently Used (LRU) cache. Support `get(key)` which "
            "returns the value or -1 if not found, and `put(key, value)` which inserts or updates "
            "a value. When capacity is exceeded, evict the least recently used item. "
            "Both operations must run in O(1) average time."
        ),
        "constraints": [
            "Keys and values are integers",
            "Capacity is always a positive integer",
            "Both get and put must run in O(1) average time",
            "get returns -1 for a key not in the cache",
        ],
        "examples": [
            {
                "input": "cache = LRUCache(2)\ncache.put(1, 10)\ncache.put(2, 20)\ncache.get(1)     # 10 — refreshes key 1\ncache.put(3, 30)  # evicts key 2 (LRU)\ncache.get(2)     # -1 (evicted)",
                "output": "None\nNone\n10\nNone\n-1",
                "note": "put(3,30) evicts key 2 because key 1 was accessed most recently"
            }
        ],
        "starter_code": """\
class LRUCache:
    def __init__(self, capacity: int):
        pass

    def get(self, key: int) -> int:
        pass

    def put(self, key: int, value: int) -> None:
        pass""",
        "solution": """\
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.cache = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.cap:
            self.cache.popitem(last=False)""",
        "hints": [
            "OrderedDict tracks insertion order — use move_to_end(key) to mark recent access",
            "popitem(last=False) removes the oldest (least recently used) item",
            "On put: if key exists, move to end FIRST, then update value",
        ],
        "test_cases": [
            {
                "name": "basic eviction :: LRUCache(2) :: get(1) after eviction",
                "code": """\
c = LRUCache(2)
c.put(1, 1); c.put(2, 2)
assert c.get(1) == 1, f"got {c.get(1)}"
c.put(3, 3)  # evicts key 2
assert c.get(2) == -1, f"got {c.get(2)}"
print("PASS")
""",
            },
            {
                "name": "get miss returns -1",
                "code": """\
c = LRUCache(3)
assert c.get(99) == -1
print("PASS")
""",
            },
            {
                "name": "overwrite refreshes recency :: LRUCache(2) :: put(1,10)",
                "code": """\
c = LRUCache(2)
c.put(1, 1); c.put(2, 2)
c.put(1, 10)   # overwrite refreshes key 1
c.put(3, 3)    # should evict key 2 (LRU)
assert c.get(1) == 10, f"got {c.get(1)}"
assert c.get(2) == -1, f"got {c.get(2)}"
assert c.get(3) == 3, f"got {c.get(3)}"
print("PASS")
""",
            },
            {
                "name": "overwrite refreshes recency :: LRUCache(2) :: get(1) == 10",
                "code": """\
c = LRUCache(2)
c.put(1, 1); c.put(2, 2); c.put(1, 99)
assert c.get(1) == 99
print("PASS")
""",
            },
            {
                "name": "capacity 1 :: always evicts previous on new put",
                "code": """\
c = LRUCache(1)
c.put(1, 1); c.put(2, 2)
assert c.get(1) == -1
assert c.get(2) == 2
print("PASS")
""",
            },
            {
                "name": "get refreshes order :: later put evicts un-gotten key",
                "code": """\
c = LRUCache(2)
c.put(1, 1); c.put(2, 2)
c.get(1)       # refresh key 1
c.put(3, 3)    # evicts key 2
assert c.get(1) == 1
assert c.get(2) == -1
assert c.get(3) == 3
print("PASS")
""",
            },
        ],
    },
    {
        "id": "CP-002", "title": "Time-Based Key-Value Store",
        "topic": "Stateful", "difficulty": "MEDIUM",
        "type": "code",
        "tags": ["#binary-search", "#sorted-collections", "#versioning"],
        "desc": "Key-value store where each key can hold multiple timestamped values.",
        "scenario": (
            "Your team is building a feature flag system. Each flag can be updated many times. "
            "Clients need to query the value at any past timestamp — useful for rollbacks and "
            "A/B testing analysis."
        ),
        "problem": (
            "Design a time-based key-value store. Implement `set(key, value, timestamp)` which "
            "stores the value at the given timestamp, and `get(key, timestamp)` which returns "
            "the value with the largest timestamp <= query timestamp. Return '' if none exists."
        ),
        "constraints": [
            "Timestamps per key are always strictly increasing",
            "set and get can each be called up to 10^5 times",
            "Return '' if no value at or before the query timestamp",
        ],
        "examples": [
            {
                "input": 'store = TimeMap()\nstore.set("a","bar",1)\nstore.get("a",1)\nstore.get("a",3)\nstore.set("a","bar2",4)\nstore.get("a",4)',
                "output": '"bar"\n"bar"\n"bar2"',
                "note": "get at t=3 returns 'bar' since t=1 is the largest ts ≤ 3"
            }
        ],
        "starter_code": """\
class TimeMap:
    def __init__(self):
        pass

    def set(self, key: str, value: str, timestamp: int) -> None:
        pass

    def get(self, key: str, timestamp: int) -> str:
        pass""",
        "solution": """\
from collections import defaultdict

class TimeMap:
    def __init__(self):
        self.store = defaultdict(list)  # key -> [(ts, val)]

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.store[key].append((timestamp, value))

    def get(self, key: str, timestamp: int) -> str:
        entries = self.store[key]
        lo, hi, result = 0, len(entries) - 1, ""
        while lo <= hi:
            mid = (lo + hi) // 2
            if entries[mid][0] <= timestamp:
                result = entries[mid][1]; lo = mid + 1
            else:
                hi = mid - 1
        return result""",
        "hints": [
            "Store each key as a list of (timestamp, value) pairs",
            "Since timestamps are strictly increasing, the list is already sorted — use binary search",
            "Binary search for largest timestamp ≤ query",
        ],
        "test_cases": [
            {
                "name": "set and get at exact timestamp",
                "code": """\
t = TimeMap(); t.set("a","bar",1)
assert t.get("a",1) == "bar"
print("PASS")
""",
            },
            {
                "name": "get before any set returns empty string",
                "code": """\
t = TimeMap(); t.set("a","bar",5)
assert t.get("a",3) == ""
print("PASS")
""",
            },
            {
                "name": "get returns value at largest ts <= query",
                "code": """\
t = TimeMap(); t.set("a","v1",1); t.set("a","v2",4)
assert t.get("a",3) == "v1"
assert t.get("a",4) == "v2"
assert t.get("a",10) == "v2"
print("PASS")
""",
            },
            {
                "name": "missing key returns empty string",
                "code": """\
t = TimeMap()
assert t.get("z",999) == ""
print("PASS")
""",
            },
        ],
    },
    {
        "id": "CP-003", "title": "Sliding Window Rate Limiter",
        "topic": "Stateful", "difficulty": "MEDIUM",
        "type": "code",
        "tags": ["#sliding-window", "#deque", "#hash-map"],
        "desc": "Rate limiter that enforces N requests per sliding time window.",
        "scenario": (
            "The MCP Gateway enforces 100 req/min per API key. Each request must be checked "
            "against the last 60 seconds of activity. You need O(1) amortized allow/deny — "
            "don't use a fixed window (it allows double-rate bursts at window boundaries)."
        ),
        "problem": (
            "Design a sliding window rate limiter. `allow(timestamp)` returns True if the "
            "request at the given timestamp is within the limit, False otherwise. "
            "The window is exactly `window_size` seconds and allows at most `max_requests`."
        ),
        "constraints": [
            "Timestamps are non-decreasing integers (seconds)",
            "max_requests and window_size are positive integers",
            "Must be O(1) amortized per call",
        ],
        "examples": [
            {
                "input": "rl = RateLimiter(3, 5)  # 3 req per 5 sec\nrl.allow(1)  # True\nrl.allow(2)  # True\nrl.allow(3)  # True\nrl.allow(4)  # False — window [1,5] already has 3\nrl.allow(7)  # True  — ts=1 evicted",
                "output": "True\nTrue\nTrue\nFalse\nTrue",
                "note": "At ts=7 the window is [3,7], only ts=2,3 remain → allow"
            }
        ],
        "starter_code": """\
from collections import deque

class RateLimiter:
    def __init__(self, max_requests: int, window_size: int):
        pass

    def allow(self, timestamp: int) -> bool:
        pass""",
        "solution": """\
from collections import deque

class RateLimiter:
    def __init__(self, max_requests: int, window_size: int):
        self.max = max_requests
        self.window = window_size
        self.q = deque()

    def allow(self, timestamp: int) -> bool:
        cutoff = timestamp - self.window
        while self.q and self.q[0] <= cutoff:
            self.q.popleft()
        if len(self.q) < self.max:
            self.q.append(timestamp)
            return True
        return False""",
        "hints": [
            "Use a deque to store timestamps of allowed requests",
            "On each call, evict timestamps older than (current - window_size)",
            "If len(deque) < max_requests after eviction, allow and append",
        ],
        "test_cases": [
            {
                "name": "basic: 3 req in window allowed, 4th denied",
                "code": """\
rl = RateLimiter(3, 5)
assert rl.allow(1) == True
assert rl.allow(2) == True
assert rl.allow(3) == True
assert rl.allow(4) == False
print("PASS")
""",
            },
            {
                "name": "old timestamps evicted, new window allows",
                "code": """\
rl = RateLimiter(3, 5)
rl.allow(1); rl.allow(2); rl.allow(3)
assert rl.allow(7) == True   # ts=1 evicted
print("PASS")
""",
            },
            {
                "name": "window boundary exact eviction",
                "code": """\
rl = RateLimiter(2, 10)
rl.allow(0); rl.allow(5)
assert rl.allow(10) == False  # ts=0 still in [0,10] window (cutoff=0, 0<=0 evict)
print("PASS")
""",
            },
        ],
    },
    # ══════════════════════════════════════════════════════════════════════════
    # INFRA — coding problems
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": "CP-004", "title": "Token Bucket Rate Limiter",
        "topic": "Infra", "difficulty": "MEDIUM",
        "type": "code",
        "tags": ["#rate-limiting", "#token-bucket", "#burst-traffic"],
        "desc": "Allow burst traffic up to capacity, then refill at a fixed rate.",
        "scenario": (
            "The MCP Gateway allows bursting: a client can fire 10 requests instantly but "
            "then must wait for tokens to refill at 2/sec. Unlike sliding window, token bucket "
            "explicitly models the burst budget. Used in Stripe, AWS API Gateway, and your gateway."
        ),
        "problem": (
            "Implement a token bucket rate limiter. `consume(tokens)` returns True if enough "
            "tokens are available (and deducts them), False otherwise. Tokens refill at "
            "`refill_rate` per second up to `capacity`."
        ),
        "constraints": [
            "capacity and refill_rate are positive floats",
            "consume() takes an integer token count",
            "Time is measured in seconds (use time.time() or a passed timestamp for testing)",
        ],
        "examples": [
            {
                "input": "tb = TokenBucket(10, 2)  # cap=10, 2 tokens/sec\ntb.consume(5)   # True  (5 left)\ntb.consume(5)   # True  (0 left)\ntb.consume(1)   # False (no tokens)\n# after 1 sec: 2 tokens refilled\ntb.consume(2)   # True",
                "output": "True\nTrue\nFalse\n(wait 1s)\nTrue",
                "note": "Tokens accumulate while idle; capped at capacity"
            }
        ],
        "starter_code": """\
import time

class TokenBucket:
    def __init__(self, capacity: float, refill_rate: float):
        pass

    def consume(self, tokens: int = 1) -> bool:
        pass""",
        "solution": """\
import time

class TokenBucket:
    def __init__(self, capacity: float, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last = time.time()

    def consume(self, tokens: int = 1) -> bool:
        now = time.time()
        elapsed = now - self.last
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last = now
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False""",
        "hints": [
            "On each consume(), compute elapsed = now - last_refill, add tokens",
            "Clamp tokens at capacity: min(capacity, current + elapsed * rate)",
            "Deduct and return True only if tokens >= requested amount",
        ],
        "test_cases": [
            {
                "name": "burst: full capacity consumed",
                "code": """\
import time
class TokenBucket:
    def __init__(self, cap, rate):
        self.cap=cap; self.rate=rate; self.tokens=cap; self.last=time.time()
    def consume(self, n=1):
        now=time.time(); self.tokens=min(self.cap, self.tokens+(now-self.last)*self.rate); self.last=now
        if self.tokens>=n: self.tokens-=n; return True
        return False
tb = TokenBucket(10, 2)
assert tb.consume(10) == True
assert tb.consume(1)  == False
print("PASS")
""",
            },
            {
                "name": "tokens capped at capacity after refill",
                "code": """\
import time
class TokenBucket:
    def __init__(self, cap, rate):
        self.cap=cap; self.rate=rate; self.tokens=cap; self.last=time.time()
    def consume(self, n=1):
        now=time.time(); self.tokens=min(self.cap, self.tokens+(now-self.last)*self.rate); self.last=now
        if self.tokens>=n: self.tokens-=n; return True
        return False
tb = TokenBucket(5, 100)  # fast refill
tb.consume(5)
time.sleep(0.1)
assert tb.consume(5) == True   # should have refilled to cap=5
print("PASS")
""",
            },
        ],
    },
    {
        "id": "CP-005", "title": "Circuit Breaker",
        "topic": "Infra", "difficulty": "HARD",
        "type": "code",
        "tags": ["#resilience", "#state-machine", "#failure-threshold"],
        "desc": "State machine that stops hammering a failing downstream service.",
        "scenario": (
            "Your search pipeline calls Linkup for web results. When Linkup is down, "
            "every search request blocks for 30s before timing out, cascading failures. "
            "A circuit breaker detects consecutive failures and opens (fast-fail) for a "
            "cooldown period, then lets one probe through (half-open) to test recovery."
        ),
        "problem": (
            "Implement a CircuitBreaker with 3 states: CLOSED (normal), OPEN (fast-fail), "
            "HALF_OPEN (one probe allowed). Open after `failure_threshold` consecutive failures. "
            "After `timeout` seconds in OPEN, transition to HALF_OPEN. On success in HALF_OPEN, "
            "close; on failure, re-open."
        ),
        "constraints": [
            "States: 'CLOSED', 'OPEN', 'HALF_OPEN'",
            "call(fn) raises RuntimeError('Circuit open') if OPEN",
            "On success: reset failure count, close if HALF_OPEN",
            "On failure: increment counter; open if threshold reached",
        ],
        "examples": [
            {
                "input": "cb = CircuitBreaker(failure_threshold=2, timeout=30)\ncb.call(fn_that_fails)  # fail 1\ncb.call(fn_that_fails)  # fail 2 → OPEN\ncb.call(fn_ok)          # raises RuntimeError",
                "output": "raises RuntimeError('Circuit open')",
                "note": "After timeout seconds, transitions to HALF_OPEN for one probe"
            }
        ],
        "starter_code": """\
import time

class CircuitBreaker:
    CLOSED    = 'CLOSED'
    OPEN      = 'OPEN'
    HALF_OPEN = 'HALF_OPEN'

    def __init__(self, failure_threshold: int, timeout: float):
        pass

    def call(self, fn):
        pass""",
        "solution": """\
import time

class CircuitBreaker:
    CLOSED = 'CLOSED'; OPEN = 'OPEN'; HALF_OPEN = 'HALF_OPEN'

    def __init__(self, failure_threshold: int, timeout: float):
        self.threshold = failure_threshold
        self.timeout   = timeout
        self.state     = self.CLOSED
        self.failures  = 0
        self.opened_at = None

    def call(self, fn):
        if self.state == self.OPEN:
            if time.time() - self.opened_at >= self.timeout:
                self.state = self.HALF_OPEN
            else:
                raise RuntimeError('Circuit open')
        try:
            result = fn()
            self.failures = 0
            self.state = self.CLOSED
            return result
        except Exception as e:
            self.failures += 1
            if self.failures >= self.threshold or self.state == self.HALF_OPEN:
                self.state = self.OPEN
                self.opened_at = time.time()
            raise""",
        "hints": [
            "Track state, failure count, and when the circuit opened (for timeout check)",
            "On OPEN: check if timeout elapsed → HALF_OPEN; else raise RuntimeError",
            "On success: reset failures and return to CLOSED regardless of prior state",
            "On failure in HALF_OPEN: re-open immediately",
        ],
        "test_cases": [
            {
                "name": "CLOSED → OPEN after threshold failures",
                "code": """\
import time
class CircuitBreaker:
    CLOSED='CLOSED';OPEN='OPEN';HALF_OPEN='HALF_OPEN'
    def __init__(self,t,to):
        self.threshold=t;self.timeout=to;self.state=self.CLOSED;self.failures=0;self.opened_at=None
    def call(self,fn):
        if self.state==self.OPEN:
            if time.time()-self.opened_at>=self.timeout: self.state=self.HALF_OPEN
            else: raise RuntimeError('Circuit open')
        try:
            r=fn();self.failures=0;self.state=self.CLOSED;return r
        except:
            self.failures+=1
            if self.failures>=self.threshold or self.state==self.HALF_OPEN:
                self.state=self.OPEN;self.opened_at=time.time()
            raise

cb = CircuitBreaker(2, 30)
try: cb.call(lambda: (_ for _ in ()).throw(Exception("fail")))
except: pass
try: cb.call(lambda: (_ for _ in ()).throw(Exception("fail")))
except: pass
assert cb.state == cb.OPEN
try:
    cb.call(lambda: "ok")
    assert False, "should have raised"
except RuntimeError as e:
    assert "Circuit open" in str(e)
print("PASS")
""",
            },
            {
                "name": "success resets failures and stays CLOSED",
                "code": """\
import time
class CircuitBreaker:
    CLOSED='CLOSED';OPEN='OPEN';HALF_OPEN='HALF_OPEN'
    def __init__(self,t,to):
        self.threshold=t;self.timeout=to;self.state=self.CLOSED;self.failures=0;self.opened_at=None
    def call(self,fn):
        if self.state==self.OPEN:
            if time.time()-self.opened_at>=self.timeout: self.state=self.HALF_OPEN
            else: raise RuntimeError('Circuit open')
        try:
            r=fn();self.failures=0;self.state=self.CLOSED;return r
        except:
            self.failures+=1
            if self.failures>=self.threshold or self.state==self.HALF_OPEN:
                self.state=self.OPEN;self.opened_at=time.time()
            raise

cb = CircuitBreaker(3, 30)
try: cb.call(lambda: (_ for _ in ()).throw(Exception()))
except: pass
result = cb.call(lambda: "ok")
assert result == "ok"
assert cb.failures == 0
assert cb.state == cb.CLOSED
print("PASS")
""",
            },
        ],
    },
    # ══════════════════════════════════════════════════════════════════════════
    # ARRAYS / CONCURRENCY — coding problems
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": "CP-006", "title": "Two Sum",
        "topic": "Arrays", "difficulty": "EASY",
        "type": "code",
        "tags": ["#hash-map", "#one-pass", "#complement"],
        "desc": "Find two indices that sum to a target.",
        "scenario": (
            "Classic warm-up. In agent deduplication: you have a list of request costs and "
            "need to find two that together hit a budget target exactly."
        ),
        "problem": (
            "Given an array `nums` and an integer `target`, return indices of the two numbers "
            "that add up to `target`. Exactly one solution exists. You may not use the same "
            "element twice. Return in any order."
        ),
        "constraints": [
            "2 <= nums.length <= 10^4",
            "Each input has exactly one solution",
            "May not use same element twice",
        ],
        "examples": [
            {
                "input": "nums = [2, 7, 11, 15], target = 9",
                "output": "[0, 1]",
                "note": "nums[0] + nums[1] = 2 + 7 = 9"
            },
            {
                "input": "nums = [3, 2, 4], target = 6",
                "output": "[1, 2]",
                "note": "nums[1] + nums[2] = 2 + 4 = 6"
            }
        ],
        "starter_code": """\
from typing import List

def two_sum(nums: List[int], target: int) -> List[int]:
    pass""",
        "solution": """\
from typing import List

def two_sum(nums: List[int], target: int) -> List[int]:
    seen = {}  # value -> index
    for i, n in enumerate(nums):
        complement = target - n
        if complement in seen:
            return [seen[complement], i]
        seen[n] = i
    return []""",
        "hints": [
            "For each number, compute complement = target - num",
            "Store seen numbers in a dict: {value: index}",
            "Check if complement is already in dict before adding current number",
        ],
        "test_cases": [
            {
                "name": "basic :: [2,7,11,15] target=9",
                "code": """\
from typing import List
def two_sum(nums,target):
    seen={}
    for i,n in enumerate(nums):
        c=target-n
        if c in seen: return [seen[c],i]
        seen[n]=i
assert sorted(two_sum([2,7,11,15],9)) == [0,1]
print("PASS")
""",
            },
            {
                "name": "numbers not adjacent :: [3,2,4] target=6",
                "code": """\
from typing import List
def two_sum(nums,target):
    seen={}
    for i,n in enumerate(nums):
        c=target-n
        if c in seen: return [seen[c],i]
        seen[n]=i
assert sorted(two_sum([3,2,4],6)) == [1,2]
print("PASS")
""",
            },
            {
                "name": "duplicates :: [3,3] target=6",
                "code": """\
def two_sum(nums,target):
    seen={}
    for i,n in enumerate(nums):
        c=target-n
        if c in seen: return [seen[c],i]
        seen[n]=i
assert sorted(two_sum([3,3],6)) == [0,1]
print("PASS")
""",
            },
        ],
    },
    {
        "id": "CP-007", "title": "asyncio.gather Pattern",
        "topic": "Concurrency", "difficulty": "MEDIUM",
        "type": "code",
        "tags": ["#asyncio", "#gather", "#parallel-io"],
        "desc": "Dispatch independent async tasks in parallel and collect results.",
        "scenario": (
            "The searchPipeline calls 3 independent sources: web_search, entity_lookup, "
            "and signal_extract. Sequential calls take 2.3s total. Running them concurrently "
            "via asyncio.gather takes 1.2s. This is the core concurrency pattern in Coinbase AI pipelines."
        ),
        "problem": (
            "Write an async function `fetch_all(urls)` that fetches all URLs concurrently "
            "using asyncio.gather and returns a list of results in the same order as input. "
            "Each fetch is simulated by `fetch_one(url)` which is an async function you "
            "should call but not implement."
        ),
        "constraints": [
            "Use asyncio.gather for concurrency",
            "Results must be in the same order as input URLs",
            "Handle exceptions: if any fetch fails, include the exception object in results (return_exceptions=True)",
        ],
        "examples": [
            {
                "input": "urls = ['https://a.com', 'https://b.com', 'https://c.com']\nresults = await fetch_all(urls)",
                "output": "[result_a, result_b, result_c]",
                "note": "All 3 fetches run concurrently. Total time ≈ max(latency_a, b, c)"
            }
        ],
        "starter_code": """\
import asyncio
from typing import List, Any

async def fetch_one(url: str) -> str:
    # Simulated — do not modify
    await asyncio.sleep(0.1)
    return f"data:{url}"

async def fetch_all(urls: List[str]) -> List[Any]:
    pass""",
        "solution": """\
import asyncio
from typing import List, Any

async def fetch_one(url: str) -> str:
    await asyncio.sleep(0.1)
    return f"data:{url}"

async def fetch_all(urls: List[str]) -> List[Any]:
    tasks = [fetch_one(url) for url in urls]
    return await asyncio.gather(*tasks, return_exceptions=True)""",
        "hints": [
            "Create a coroutine for each URL: tasks = [fetch_one(url) for url in urls]",
            "asyncio.gather(*tasks) runs all concurrently and returns results in order",
            "Add return_exceptions=True to avoid cancelling all tasks on one failure",
        ],
        "test_cases": [
            {
                "name": "returns results in order",
                "code": """\
import asyncio
async def fetch_one(url):
    await asyncio.sleep(0.01)
    return f"data:{url}"
async def fetch_all(urls):
    return await asyncio.gather(*[fetch_one(u) for u in urls], return_exceptions=True)
results = asyncio.run(fetch_all(["a","b","c"]))
assert results == ["data:a","data:b","data:c"]
print("PASS")
""",
            },
            {
                "name": "concurrent: total time < sum of individual times",
                "code": """\
import asyncio, time
async def fetch_one(url):
    await asyncio.sleep(0.05)
    return url
async def fetch_all(urls):
    return await asyncio.gather(*[fetch_one(u) for u in urls])
start = time.time()
asyncio.run(fetch_all(["a","b","c","d","e"]))
elapsed = time.time() - start
assert elapsed < 0.2, f"Too slow: {elapsed:.2f}s (should be ~0.05s concurrent)"
print("PASS")
""",
            },
            {
                "name": "return_exceptions: failed fetch doesn't crash gather",
                "code": """\
import asyncio
async def fetch_one(url):
    if url == "bad": raise ValueError("fetch failed")
    return f"ok:{url}"
async def fetch_all(urls):
    return await asyncio.gather(*[fetch_one(u) for u in urls], return_exceptions=True)
results = asyncio.run(fetch_all(["good","bad","also-good"]))
assert results[0] == "ok:good"
assert isinstance(results[1], ValueError)
assert results[2] == "ok:also-good"
print("PASS")
""",
            },
        ],
    },
    # ══════════════════════════════════════════════════════════════════════════
    # KNOWLEDGE — quiz & flashcard problems
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": "CP-008", "title": "Python vs Go — Core Syntax",
        "topic": "Python Syntax", "difficulty": "EASY",
        "type": "quiz",
        "tags": ["#golang", "#syntax", "#goroutines"],
        "desc": "Key Go syntax differences every Python dev needs for whiteboard rounds.",
        "scenario": "Go keeps showing up in infra/backend interviews. Know the key differences cold.",
        "problem": "Answer 5 multiple-choice questions on Go syntax vs Python.",
        "constraints": [], "examples": [],
        "starter_code": "", "solution": "", "hints": [],
        "test_cases": [],
        "quiz": [
            {"q": "What Go keyword creates a variable with type inference?",
             "choices": [":=", "var ::", "let", "auto"], "answer": ":=",
             "explain": "`:=` is shorthand for declare + assign. Infers type. Use inside functions 90% of the time."},
            {"q": "How does Go handle errors?",
             "choices": ["try/except", "return (result, error)", "throw/catch", "panic only"], "answer": "return (result, error)",
             "explain": "Go returns (result, error) tuple. Check `if err != nil` every time."},
            {"q": "What is Go's equivalent of Python's enumerate?",
             "choices": ["range", "iter", "each", "for..in"], "answer": "range",
             "explain": "`for i, val := range items` gives index and value, like Python's `enumerate`."},
            {"q": "What replaces Python classes in Go?",
             "choices": ["struct", "object", "class", "type"], "answer": "struct",
             "explain": "Go uses `struct` for data + methods. No inheritance — use interfaces."},
            {"q": "How do you start concurrent work in Go?",
             "choices": ["go funcName()", "async funcName()", "Thread(target=f)", "spawn(f)"], "answer": "go funcName()",
             "explain": "Put `go` before a function call. Goroutines are lightweight (2KB stack vs 1MB thread)."},
        ],
    },
    {
        "id": "CP-009", "title": "LangChain & Agent Patterns",
        "topic": "LangChain/Agents", "difficulty": "MEDIUM",
        "type": "quiz",
        "tags": ["#langchain", "#react", "#tool-calling", "#mcp"],
        "desc": "Chains vs agents, ReAct loop, memory types, MCP relationship.",
        "scenario": "Coinbase AI Applications SE role — you'll be asked about agent architectures daily.",
        "problem": "Answer 5 questions on LangChain agent patterns.",
        "constraints": [], "examples": [],
        "starter_code": "", "solution": "", "hints": [],
        "test_cases": [],
        "quiz": [
            {"q": "Chain vs Agent: which decides tools at runtime?",
             "choices": ["Agent", "Chain", "Both", "Neither"], "answer": "Agent",
             "explain": "Chain = fixed recipe (same steps every time). Agent = thinks and picks tools dynamically."},
            {"q": "What does ReAct stand for?",
             "choices": ["Reason + Act", "React.js", "Real-time Action", "Recursive Actor"], "answer": "Reason + Act",
             "explain": "Think → Act (call tool) → Observe result → Think again → Answer. The loop."},
            {"q": "What are the 4 LangChain memory types?",
             "choices": ["Buffer, Window, Summary, VectorStore", "RAM, Disk, Cache, Cloud",
                         "Short, Long, Working, Episodic", "Stack, Queue, Heap, Graph"],
             "answer": "Buffer, Window, Summary, VectorStore",
             "explain": "Buffer=full history. Window=last K. Summary=compressed. VectorStore=search by similarity."},
            {"q": "How is MCP related to LangChain tool calling?",
             "choices": ["Same concept, different protocol", "Completely unrelated",
                         "MCP replaces LangChain", "LangChain invented MCP"],
             "answer": "Same concept, different protocol",
             "explain": "Both let LLMs call external tools. MCP is an open protocol standard. LangChain is a framework."},
            {"q": "What does an agent executor's scratchpad contain?",
             "choices": ["Intermediate tool results and reasoning steps",
                         "The final answer only", "The system prompt", "User message history"],
             "answer": "Intermediate tool results and reasoning steps",
             "explain": "The scratchpad accumulates thought+action+observation triples until the agent decides to answer."},
        ],
    },
    {
        "id": "CP-010", "title": "GCP for AI Engineers",
        "topic": "System Design", "difficulty": "MEDIUM",
        "type": "quiz",
        "tags": ["#gcp", "#cloud-run", "#bigquery", "#vertex-ai"],
        "desc": "Cloud Run, BigQuery, Vertex AI — the 3 GCP services that keep appearing.",
        "scenario": "Coinbase runs on GCP. Know these 3 cold.",
        "problem": "Answer 5 GCP questions.",
        "constraints": [], "examples": [],
        "starter_code": "", "solution": "", "hints": [],
        "test_cases": [],
        "quiz": [
            {"q": "GCP service for serverless containers?",
             "choices": ["Cloud Run", "GKE", "Compute Engine", "App Engine"], "answer": "Cloud Run",
             "explain": "Cloud Run = serverless containers. No cluster management. Scales to 0."},
            {"q": "GCP data warehouse for petabyte-scale analytics?",
             "choices": ["BigQuery", "Cloud SQL", "Firestore", "Bigtable"], "answer": "BigQuery",
             "explain": "BigQuery = serverless data warehouse. Columnar storage. SQL interface. Used at JPM-scale ETL."},
            {"q": "GCP end-to-end ML platform?",
             "choices": ["Vertex AI", "TensorFlow Hub", "ML Engine", "AutoML only"], "answer": "Vertex AI",
             "explain": "Vertex AI = training, serving, monitoring. Hosts models, pipelines, and feature stores."},
            {"q": "GCP service to trigger code on file upload to Cloud Storage?",
             "choices": ["Cloud Functions", "Cloud Run", "Pub/Sub", "Dataflow"], "answer": "Cloud Functions",
             "explain": "Cloud Functions + Cloud Storage trigger = event-driven serverless. Like AWS Lambda + S3."},
            {"q": "GCP managed message queue (pub/sub)?",
             "choices": ["Pub/Sub", "Cloud Tasks", "Datastream", "Eventarc"], "answer": "Pub/Sub",
             "explain": "Pub/Sub = managed message broker. Decouples producers and consumers. Global delivery."},
        ],
    },
    {
        "id": "CP-011", "title": "Coinbase AI — Role Intel",
        "topic": "System Design", "difficulty": "HARD",
        "type": "flashcard",
        "tags": ["#coinbase", "#ai-applications", "#codesignal"],
        "desc": "Role context, signal words, and CodeSignal tier breakdown.",
        "scenario": "Software Engineer, AI Applications. This is the role you're prepping for.",
        "problem": "Study the role context and CodeSignal patterns.",
        "constraints": [], "examples": [],
        "starter_code": "", "solution": "", "hints": [],
        "test_cases": [],
        "flashcards": [
            {"q": "What does the Coinbase AI Applications SE role actually build?",
             "a": "AI-powered features at the product layer: search, recommendations, personalization, fraud signals, and AI-augmented workflows. Not infra — product-facing AI that millions of users touch."},
            {"q": "CodeSignal Tier 1: What algorithm patterns are most tested?",
             "a": "Hash maps (Two Sum, LRU), Sliding window (rate limiting, token budget), Two pointers (sorted merges), BFS/DFS (graph traversal, tool dependency), Dynamic programming (min-cost optimization)."},
            {"q": "CodeSignal Tier 2: What AI-specific patterns appear?",
             "a": "LRU Cache (searchPipeline entity cache), Token Bucket (MCP gateway 100 req/min), asyncio.gather (parallel tool dispatch), Circuit Breaker (Linkup/web_search fallback)."},
            {"q": "What signal words in a problem indicate which pattern?",
             "a": "'most recently used / evict' → LRU | 'sliding window / N per M seconds' → deque rate limiter | 'parallel / concurrent fetches' → asyncio.gather | 'failing service / fast-fail' → circuit breaker | 'shortest path / connected' → BFS"},
            {"q": "3-day drill plan for the CodeSignal assessment?",
             "a": "Day 1: LRU Cache + Two Sum + Sliding Window (warm up the pattern recognition). Day 2: Token Bucket + Circuit Breaker + asyncio.gather (AI-flavored patterns). Day 3: Full mock timed session + review signal words table."},
        ],
    },
    {
        "id": "CP-012", "title": "Fleet AI — Movie Catalog",
        "topic": "API Design", "difficulty": "HARD",
        "type": "flashcard",
        "tags": ["#react", "#express", "#tmdb", "#edge-functions", "#vercel"],
        "desc": "Full-stack movie catalog with TMDB API, Express proxy, and Edge video catalog.",
        "scenario": "Fleet AI Full Stack Builder assessment: build a movie catalog web app.",
        "problem": "Study the architecture, key patterns, and 5-minute scaffold guide.",
        "constraints": [], "examples": [],
        "starter_code": "", "solution": "", "hints": [],
        "test_cases": [],
        "flashcards": [
            {"q": "Architecture: how does the API key stay secret?",
             "a": "Express server acts as proxy. React → Express (/api/movies/*) → TMDB API. The TMDB_API_KEY lives in server .env, never in the React bundle. This is the 'honest proxy' pattern."},
            {"q": "What is the TMDB base URL and 3 key endpoints?",
             "a": "Base: https://api.themoviedb.org/3\n• /movie/popular?api_key=KEY&page=1\n• /search/movie?query=TERM\n• /movie/{id} (detail)\nImages: https://image.tmdb.org/t/p/w500/{poster_path}"},
            {"q": "What is a Vercel Edge Function and what can't it use?",
             "a": "export const runtime = 'edge' — runs in V8 isolates at CDN edge nodes. NO Node.js built-ins: no fs, no path, no Buffer, no require(). Only: fetch, Request, Response, URL, Web Crypto. Set Cache-Control: s-maxage=60, stale-while-revalidate=30 for video catalog caching."},
            {"q": "How does the React useMovies hook prevent per-keystroke API calls?",
             "a": "Two patterns: (1) AbortController — cancels in-flight request when new search starts. (2) setTimeout debounce with clearTimeout — waits 400ms after last keystroke before firing. Both together: debounce gates the request, AbortController cleans up if it does fire."},
            {"q": "5-minute scaffold commands for the assessment?",
             "a": "npx create-react-app movies-app\ncd movies-app && npm i axios react-query\nmkdir server && cd server && npm init -y && npm i express axios dotenv cors\n# Create server.js with proxy routes\n# Create src/hooks/useMovies.js with AbortController + debounce\n# Create src/components/MovieCard.jsx with Tailwind"},
        ],
    },
    {
        "id": "CP-013", "title": "Behavioral STAR — Aristotle / Founding Eng",
        "topic": "Behavioral", "difficulty": "MEDIUM",
        "type": "flashcard",
        "tags": ["#behavioral", "#star", "#founding-engineer", "#voice-ai"],
        "desc": "STAR stories for AI builder roles, Founding Engineer angle.",
        "scenario": "Edmund at Aristotle (buyaristotle.com) — True Ventures-backed AI tutor. Voice + memory systems.",
        "problem": "Study your strongest STAR stories mapped to founding engineer expectations.",
        "constraints": [], "examples": [],
        "starter_code": "", "solution": "", "hints": [],
        "test_cases": [],
        "flashcards": [
            {"q": "STAR: Tell me about a time you built an AI pipeline from scratch.",
             "a": "S: NodeBench needed search that returned entity intelligence, not links.\nT: Build end-to-end: query classification → web search → Gemini extraction → structured response.\nA: Built 4-layer grounding pipeline, 103-query eval corpus, Gemini judge loop that runs automatically.\nR: Search quality went from 60% → 87% pass rate. Self-judging — runs without me."},
            {"q": "STAR: How do you handle ambiguity at the founding stage?",
             "a": "S: NodeBench had no defined product — just 'operating memory for founders.'\nT: Build something real without waiting for a spec.\nA: Shipped 5 surfaces, 304 MCP tools, Convex backend in 6 weeks using AI agents to write most code.\nR: Got to a working product fast by treating every week as a 7-day timebox with a kill criterion."},
            {"q": "STAR: Describe a system you built for reliability under agent loops.",
             "a": "S: Agents amplify every bug — unbounded Maps OOM in minutes, fake 200s become false beliefs.\nT: Build infra that is honest under repeated agent calls.\nA: Defined 8-point agentic reliability checklist: BOUND, HONEST_STATUS, TIMEOUT, SSRF, DETERMINISTIC.\nR: Caught 14 P0 issues in first audit. Zero production incidents since applying it."},
            {"q": "STAR: What's your approach to memory/continuity in AI systems?",
             "a": "S: AI tutors forget you next session — users have to re-explain their level, goals, and history.\nT: Build hierarchical memory that persists across sessions.\nA: Built NodeBench Subconscious: 12 typed memory blocks, 4-hook lifecycle, local SQLite, packet-aware whispers.\nR: Context carries forward. The system knows what you worked on last month without being told."},
            {"q": "Why a Founding Engineer role vs a big company SE role?",
             "a": "Because I learn faster when I own the whole stack and have real users. At a big company you might touch one layer for a year. As a founding engineer you go from 'idea' to 'user in prod' in a week, and every failure is a post-mortem you own. That's the fastest compounding path I know."},
        ],
    },
]

# ─── Topic colors (for sidebar) ─────────────────────────────────────────────
TOPIC_COLORS = {
    "Stateful": "#818cf8", "Infra": "#60a5fa", "Concurrency": "#34d399",
    "Arrays": "#f59e0b", "Graphs": "#fb923c", "Linked Lists": "#f472b6",
    "Python Syntax": "#c084fc", "LangChain/Agents": "#818cf8",
    "System Design": "#38bdf8", "API Design": "#4ade80", "Behavioral": "#facc15",
}
ALL_TOPICS = sorted(set(p["topic"] for p in PROBLEMS))
ALL_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"]

# ─── Session state ───────────────────────────────────────────────────────────
def init_state():
    defaults = {
        "view": "list",       # "list" | "detail"
        "current_id": None,
        "code_by_id": {},
        "test_results": {},
        "progress": {},
        "tutor_msgs": {},
        "quiz_state": {},
        "fc_idx": {},
        "show_progress": False,
        "timer_start": {},
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

init_state()

# ─── Helpers ─────────────────────────────────────────────────────────────────
def get_problem(pid):
    return next((p for p in PROBLEMS if p["id"] == pid), None)

def mark_attempted(pid):
    if pid not in st.session_state.progress:
        st.session_state.progress[pid] = {"attempted": False, "passed": False}
    st.session_state.progress[pid]["attempted"] = True

def mark_passed(pid):
    mark_attempted(pid)
    st.session_state.progress[pid]["passed"] = True

def get_elapsed(pid):
    start = st.session_state.timer_start.get(pid)
    if start is None:
        return "00:00"
    secs = int(time.time() - start)
    return f"{secs//60:02d}:{secs%60:02d}"

def run_tests(pid, user_code, test_cases):
    results = []
    for tc in test_cases:
        # inject user_code before the test assertion code
        full_code = user_code.strip() + "\n\n" + tc["code"].strip()
        buf = io.StringIO()
        try:
            old_stdout = sys.stdout
            sys.stdout = buf
            exec(compile(full_code, "<test>", "exec"), {})
            sys.stdout = old_stdout
            output = buf.getvalue().strip()
            passed = output.upper() == "PASS"
        except Exception:
            sys.stdout = old_stdout
            output = traceback.format_exc().strip().split("\n")[-1]
            passed = False
        results.append({"name": tc["name"], "passed": passed, "output": output})
    st.session_state.test_results[pid] = results
    if all(r["passed"] for r in results):
        mark_passed(pid)
    else:
        mark_attempted(pid)
    return results

def call_tutor(pid, user_msg, problem):
    """Call Anthropic API for tutor hint. Non-blocking — returns streamed text."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return "Tutor unavailable — set ANTHROPIC_API_KEY in scripts/career/.env"
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        history = st.session_state.tutor_msgs.get(pid, [])
        messages = [{"role": "user" if m["role"] == "user" else "assistant", "content": m["text"]}
                    for m in history] + [{"role": "user", "content": user_msg}]
        system = (
            f"You are a coding interview tutor. The problem is: {problem['title']}.\n"
            f"Problem: {problem['problem']}\n\n"
            "Guide the user's thinking without giving away the full solution. "
            "Ask Socratic questions. Give specific hints only when explicitly asked. "
            "Be concise — 2-4 sentences per response."
        )
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300, system=system, messages=messages
        )
        return resp.content[0].text
    except Exception as e:
        return f"Tutor error: {e}"

def _navigate_to(pid, mode="study"):
    st.session_state.current_id = pid
    st.session_state.view = "detail"
    if pid not in st.session_state.timer_start:
        st.session_state.timer_start[pid] = time.time()
    st.query_params["pid"] = pid
    st.query_params["mode"] = mode
    st.rerun()

def _sync_query_params():
    pid = st.query_params.get("pid")
    if pid and st.session_state.current_id is None:
        if get_problem(pid):
            st.session_state.current_id = pid
            st.session_state.view = "detail"

# ─── Dialog: Solution ─────────────────────────────────────────────────────────
@st.dialog("Solution")
def show_solution_dialog(prob):
    st.code(prob.get("solution", "# No solution provided"), language="python")

# ─── Fragment: Chat ───────────────────────────────────────────────────────────
@st.fragment
def render_chat_fragment(pid, prob, compact=False):
    msgs = st.session_state.tutor_msgs.get(pid, [])

    if not compact:
        st.markdown('<div class="section-label">RESEARCH CHAT</div>', unsafe_allow_html=True)
        st.markdown('<div style="font-size:12px;color:#6b7280;margin-bottom:8px">Ask about concepts, approaches, or complexity. The tutor guides without giving answers.</div>', unsafe_allow_html=True)
    else:
        st.markdown('<div class="section-label">TUTOR</div>', unsafe_allow_html=True)

    display_msgs = msgs[-4:] if compact else msgs
    for m in display_msgs:
        role = "user" if m["role"] == "user" else "assistant"
        avatar = "🧑‍💻" if role == "user" else "🤖"
        with st.chat_message(role, avatar=avatar):
            st.markdown(m["text"])

    prompt = st.chat_input("Ask a question…", key=f"chat_input_{pid}_{'c' if compact else 'f'}")
    if prompt and prompt.strip():
        if pid not in st.session_state.tutor_msgs:
            st.session_state.tutor_msgs[pid] = []
        st.session_state.tutor_msgs[pid].append({"role": "user", "text": prompt.strip()})
        with st.status("Thinking…", expanded=False) as s:
            reply = call_tutor(pid, prompt.strip(), prob)
            s.update(label="Done", state="complete")
        st.session_state.tutor_msgs[pid].append({"role": "ai", "text": reply})
        st.rerun(scope="fragment")

    if msgs and not compact:
        if st.button("Clear chat", key=f"chat_clear_{pid}"):
            st.session_state.tutor_msgs[pid] = []
            st.rerun(scope="fragment")

# ─── Fragment: Code Editor ────────────────────────────────────────────────────
@st.fragment
def render_code_fragment(prob, pid):
    st.markdown('<div class="section-label">PYTHON</div>', unsafe_allow_html=True)
    default_code = st.session_state.code_by_id.get(pid, prob.get("starter_code", ""))

    if HAS_CODE_EDITOR:
        response = code_editor(
            default_code,
            lang="python",
            height=[10, 30],
            key=f"monaco_{pid}",
            buttons=[{"name": "▶ Run", "feather": "Play", "primary": True, "hasText": True,
                      "commands": ["submit"], "style": {"bottom": "0.44rem", "right": "0.4rem"}}],
        )
        user_code = response.get("text", default_code) if response else default_code
        submitted = response.get("type") == "submit" if response else False
    else:
        user_code = st.text_area(
            label="Code editor",
            value=default_code,
            height=320,
            key=f"code_{pid}",
            label_visibility="collapsed",
        )
        submitted = False

    st.session_state.code_by_id[pid] = user_code

    col_run, col_sol, col_clear, _ = st.columns([2, 2, 2, 4])
    with col_run:
        run_clicked = st.button("▶ Run Tests", key=f"run_{pid}", type="primary")
    with col_sol:
        if st.button("🔑 Solution", key=f"sol_btn_{pid}"):
            show_solution_dialog(prob)
    with col_clear:
        if st.button("↺ Reset", key=f"reset_{pid}"):
            st.session_state.code_by_id[pid] = prob.get("starter_code", "")
            st.session_state.test_results[pid] = []
            st.rerun(scope="fragment")

    if (run_clicked or submitted) and user_code.strip():
        with st.status("Running tests…", expanded=True) as s:
            results = run_tests(pid, user_code, prob["test_cases"])
            passed_count = sum(1 for r in results if r["passed"])
            total_count = len(results)
            for r in results:
                icon = "✓" if r["passed"] else "✗"
                st.write(f"{icon} {r['name']}")
            if passed_count == total_count:
                s.update(label=f"All {total_count} tests passed ✓", state="complete")
                st.toast(f"✅ {passed_count}/{total_count} tests passed!", icon="🎉")
            else:
                s.update(label=f"{passed_count}/{total_count} tests passed", state="error")
                st.toast(f"❌ {passed_count}/{total_count} passed — check output below", icon="⚠️")

    st.markdown('<div class="section-label">TESTS</div>', unsafe_allow_html=True)
    results = st.session_state.test_results.get(pid, [])
    if results:
        passed_count = sum(1 for r in results if r["passed"])
        total_count = len(results)
        color = "#22c55e" if passed_count == total_count else "#ef4444"
        st.markdown(
            f'<div style="font-size:14px;font-weight:700;color:{color};margin-bottom:8px">'
            f'{"✓" if passed_count==total_count else "✗"} {passed_count}/{total_count} tests passed</div>',
            unsafe_allow_html=True
        )
        for r in results:
            icon = "✓" if r["passed"] else "✗"
            css_cls = "test-pass" if r["passed"] else "test-fail"
            st.markdown(f'<div class="{css_cls}">{icon} {r["name"]}</div>', unsafe_allow_html=True)
            if not r["passed"] and r["output"]:
                st.markdown(f'<div class="test-output">{r["output"]}</div>', unsafe_allow_html=True)
    else:
        st.markdown('<div style="font-size:13px;color:#6b7280">Click ▶ Run Tests to check your solution.</div>', unsafe_allow_html=True)

# ─── Sidebar ─────────────────────────────────────────────────────────────────
def render_sidebar():
    with st.sidebar:
        st.markdown('<div style="padding:16px 0 8px;font-size:20px;font-weight:800;color:#111827"></>  CodingPrep</div>', unsafe_allow_html=True)

        if st.button("Surprise Me 🎲", key="surprise"):
            sel_topics = st.session_state.get("pills_topics") or ALL_TOPICS
            sel_diff = st.session_state.get("pills_diff") or ALL_DIFFICULTIES
            visible = [p for p in PROBLEMS
                       if p["topic"] in sel_topics
                       and p["difficulty"] in sel_diff]
            if visible:
                pick = random.choice(visible)
                _navigate_to(pick["id"], "study")

        st.markdown('<div class="section-label">TOPICS</div>', unsafe_allow_html=True)
        st.pills(
            "Topics", ALL_TOPICS,
            selection_mode="multi",
            default=ALL_TOPICS,
            key="pills_topics",
            label_visibility="collapsed",
        )

        st.markdown('<div class="section-label">DIFFICULTY</div>', unsafe_allow_html=True)
        st.pills(
            "Difficulty", ALL_DIFFICULTIES,
            selection_mode="multi",
            default=ALL_DIFFICULTIES,
            key="pills_diff",
            label_visibility="collapsed",
        )

        st.markdown('<div class="section-label">SORT</div>', unsafe_allow_html=True)
        st.segmented_control(
            "Sort", ["Default", "Easiest", "Hardest", "Unattempted"],
            default="Default",
            key="sort_by",
            label_visibility="collapsed",
        )

        st.markdown('<div class="section-label">PROGRESS</div>', unsafe_allow_html=True)
        done = sum(1 for p in PROBLEMS if st.session_state.progress.get(p["id"], {}).get("passed"))
        st.metric("Completed", f"{done} / {len(PROBLEMS)}")
        st.progress(done / len(PROBLEMS) if PROBLEMS else 0)

# ─── Progress Panel ───────────────────────────────────────────────────────────
def render_progress_panel():
    by_topic = {}
    for p in PROBLEMS:
        t = p["topic"]
        by_topic.setdefault(t, {"total": 0, "done": 0})
        by_topic[t]["total"] += 1
        if st.session_state.progress.get(p["id"], {}).get("passed"):
            by_topic[t]["done"] += 1

    st.markdown('<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin:8px 0">', unsafe_allow_html=True)
    st.markdown('<div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:12px">📊 Progress by Topic</div>', unsafe_allow_html=True)
    n_cols = min(len(by_topic), 4)
    cols = st.columns(n_cols) if n_cols > 0 else [st.container()]
    for i, (topic, counts) in enumerate(by_topic.items()):
        with cols[i % len(cols)]:
            pct = counts["done"] / counts["total"] if counts["total"] else 0
            st.metric(topic, f"{counts['done']}/{counts['total']}")
            st.progress(pct)
    st.markdown('</div>', unsafe_allow_html=True)

# ─── Problem List View ────────────────────────────────────────────────────────
def render_list():
    _sync_query_params()
    render_sidebar()

    c1, c2 = st.columns([3, 1])
    with c1:
        st.markdown(f'<div style="font-size:28px;font-weight:800;color:#111827;padding:20px 0 4px"><span style="color:#6366f1">&lt;/&gt;</span> CodingPrep</div>', unsafe_allow_html=True)
    with c2:
        st.markdown('<div style="padding-top:20px"></div>', unsafe_allow_html=True)
        if st.button("📊 Progress", key="prog_btn"):
            st.session_state.show_progress = not st.session_state.show_progress

    if st.session_state.show_progress:
        render_progress_panel()

    search = st.text_input("🔍  Search problems…", key="search_q",
                           placeholder="e.g. LRU cache, sliding window, asyncio",
                           label_visibility="collapsed")

    sel_topics = st.session_state.get("pills_topics") or ALL_TOPICS
    sel_diff = st.session_state.get("pills_diff") or ALL_DIFFICULTIES
    visible = [p for p in PROBLEMS
               if p["topic"] in sel_topics
               and p["difficulty"] in sel_diff
               and (not search or search.lower() in p["title"].lower()
                    or search.lower() in p["topic"].lower()
                    or any(search.lower() in t for t in p["tags"]))]

    sort_by = st.session_state.get("sort_by", "Default")
    order = {"EASY": 0, "MEDIUM": 1, "HARD": 2}
    if sort_by == "Easiest":
        visible = sorted(visible, key=lambda p: order[p["difficulty"]])
    elif sort_by == "Hardest":
        visible = sorted(visible, key=lambda p: -order[p["difficulty"]])
    elif sort_by == "Unattempted":
        visible = sorted(visible, key=lambda p: 1 if st.session_state.progress.get(p["id"], {}).get("attempted") else 0)

    total_done = sum(1 for p in PROBLEMS if st.session_state.progress.get(p["id"], {}).get("passed"))
    st.markdown(
        f'<div style="font-size:13px;color:#6b7280;padding:4px 0 12px">'
        f'{len(visible)} of {len(PROBLEMS)} problems · '
        f'<span style="color:#6366f1;font-weight:600">{total_done} done</span></div>',
        unsafe_allow_html=True
    )

    rows = []
    for p in visible:
        prog = st.session_state.progress.get(p["id"], {})
        status = "✅ Done" if prog.get("passed") else ("🔄 Tried" if prog.get("attempted") else "")
        rows.append({
            "ID": p["id"],
            "Title": p["title"],
            "Topic": p["topic"],
            "Difficulty": p["difficulty"],
            "Status": status,
            "Tags": ", ".join(p["tags"][:3]),
        })

    if rows:
        df = pd.DataFrame(rows)
        event = st.dataframe(
            df,
            use_container_width=True,
            hide_index=True,
            on_select="rerun",
            selection_mode="single-row",
            key="problem_table",
        )
        selected_rows = event.selection.rows if event and event.selection else []
        if selected_rows:
            sel_prob = visible[selected_rows[0]]
            sel_pid = sel_prob["id"]
            col_a, col_b, _ = st.columns([1, 1, 8])
            with col_a:
                if st.button("📖 Study", key="study_sel", type="primary"):
                    _navigate_to(sel_pid, "study")
            with col_b:
                if st.button("⚡ Practice", key="prac_sel"):
                    _navigate_to(sel_pid, "practice")
    else:
        st.info("No problems match the current filters.")

# ─── Detail Header ────────────────────────────────────────────────────────────
def render_detail_header(prob):
    pid = prob["id"]
    elapsed = get_elapsed(pid)
    diff_color = {"HARD": "#dc2626", "MEDIUM": "#d97706", "EASY": "#16a34a"}[prob["difficulty"]]
    diff_bg = {"HARD": "#fef2f2", "MEDIUM": "#fffbeb", "EASY": "#f0fdf4"}[prob["difficulty"]]

    h1, h2, h3 = st.columns([1, 5, 1])
    with h1:
        if st.button("← Back", key="back_btn"):
            st.session_state.view = "list"
            st.session_state.current_id = None
            st.query_params.clear()
            st.rerun()
    with h2:
        st.markdown(
            f'<div style="padding-top:6px">'
            f'<span class="badge-id">{pid}</span>'
            f'<span style="font-size:16px;font-weight:700;color:#111827">{prob["title"]}</span>'
            f' <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;color:{diff_color};background:{diff_bg};margin-left:6px">{prob["difficulty"]}</span>'
            f'</div>',
            unsafe_allow_html=True
        )
    with h3:
        st.markdown(f'<div style="padding-top:8px;font-size:13px;color:#6b7280;text-align:right">⏱ {elapsed}</div>', unsafe_allow_html=True)

    st.markdown('<hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0 16px">', unsafe_allow_html=True)

# ─── Study Content ────────────────────────────────────────────────────────────
def _render_study_content(prob, pid):
    left, right = st.columns([3, 2])
    with left:
        st.markdown('<div class="section-label">SCENARIO</div>', unsafe_allow_html=True)
        st.markdown(f'<div class="scenario-text">{prob["scenario"]}</div>', unsafe_allow_html=True)

        st.markdown('<div class="section-label">PROBLEM</div>', unsafe_allow_html=True)
        st.markdown(f'<div class="problem-text">{prob["problem"]}</div>', unsafe_allow_html=True)

        if prob.get("constraints"):
            st.markdown('<div class="section-label">CONSTRAINTS</div>', unsafe_allow_html=True)
            for c in prob["constraints"]:
                st.markdown(f'<div style="font-size:13px;color:#6b7280;padding:2px 0"><span style="color:#6366f1">•</span> {c}</div>', unsafe_allow_html=True)

        if prob.get("examples"):
            st.markdown('<div class="section-label">EXAMPLES</div>', unsafe_allow_html=True)
            for i, ex in enumerate(prob["examples"]):
                st.markdown(f"""
                <div class="example-block">
                  <div class="example-label">Example {i+1}</div>
                  <div class="example-code">{ex['input']}</div>
                  <div style="margin:6px 0;color:#6366f1;font-size:12px">Output:</div>
                  <div class="example-code">{ex['output']}</div>
                  {'<div class="example-note">' + ex.get('note','') + '</div>' if ex.get('note') else ''}
                </div>
                """, unsafe_allow_html=True)

        if prob.get("hints"):
            with st.expander("💡 Hints"):
                for i, h in enumerate(prob["hints"]):
                    st.markdown(f'<div class="chat-hint">Hint {i+1}: {h}</div>', unsafe_allow_html=True)

        if prob.get("solution"):
            if st.button("🔑 Show Solution", key=f"show_sol_study_{pid}"):
                show_solution_dialog(prob)

        if prob["type"] == "quiz" and prob.get("quiz"):
            st.markdown('<div class="section-label">QUICK REFERENCE</div>', unsafe_allow_html=True)
            for item in prob["quiz"]:
                with st.expander(item["q"]):
                    st.markdown(f'<div class="quiz-explain">✅ <strong>{item["answer"]}</strong><br><br>{item["explain"]}</div>', unsafe_allow_html=True)

        if prob["type"] == "flashcard" and prob.get("flashcards"):
            st.markdown('<div class="section-label">FLASHCARDS</div>', unsafe_allow_html=True)
            for fc in prob["flashcards"]:
                with st.expander(fc["q"]):
                    st.markdown(f'<div class="flashcard-a">{fc["a"]}</div>', unsafe_allow_html=True)

    with right:
        render_chat_fragment(pid, prob, compact=False)

# ─── Practice: Code ───────────────────────────────────────────────────────────
def _render_practice_code(prob, pid):
    left, right = st.columns([2, 3])
    with left:
        st.markdown('<div class="section-label">PROBLEM</div>', unsafe_allow_html=True)
        st.markdown(f'<div class="problem-text" style="font-size:13px">{prob["problem"]}</div>', unsafe_allow_html=True)

        if prob.get("constraints"):
            st.markdown('<div class="section-label">CONSTRAINTS</div>', unsafe_allow_html=True)
            for c in prob["constraints"]:
                st.markdown(f'<div class="constraint" style="font-size:12px">• {c}</div>', unsafe_allow_html=True)

        if prob.get("examples"):
            st.markdown('<div class="section-label">EXAMPLE</div>', unsafe_allow_html=True)
            ex = prob["examples"][0]
            st.markdown(f"""
            <div class="example-block">
              <div class="example-code">{ex['input']}</div>
              <div style="margin:4px 0;color:#6366f1;font-size:11px">→ {ex['output']}</div>
            </div>
            """, unsafe_allow_html=True)

        if prob.get("hints"):
            with st.expander("💡 Hints"):
                for i, h in enumerate(prob["hints"]):
                    st.markdown(f'<div class="chat-hint">Hint {i+1}: {h}</div>', unsafe_allow_html=True)

        st.markdown('<div style="margin-top:16px"></div>', unsafe_allow_html=True)
        render_chat_fragment(pid, prob, compact=True)

    with right:
        render_code_fragment(prob, pid)

# ─── Practice: Quiz ───────────────────────────────────────────────────────────
def _render_practice_quiz(prob, pid):
    quiz = prob.get("quiz", [])
    if not quiz:
        st.info("No quiz questions for this problem.")
        return

    state = st.session_state.quiz_state.get(pid, {"idx": 0, "score": 0, "answered": None})
    idx = state["idx"]
    score = state["score"]
    answered = state["answered"]

    st.markdown(f'<div style="font-size:13px;color:#6b7280;margin-bottom:16px">Question {min(idx+1, len(quiz))} of {len(quiz)} · Score: <span style="color:#6366f1;font-weight:700">{score}</span></div>', unsafe_allow_html=True)

    if idx >= len(quiz):
        pct = int(score / len(quiz) * 100)
        color = "#22c55e" if pct >= 80 else "#f59e0b" if pct >= 60 else "#ef4444"
        st.markdown(f'<div style="font-size:28px;font-weight:800;color:{color};text-align:center;padding:40px 0">{score}/{len(quiz)} — {pct}%</div>', unsafe_allow_html=True)
        if pct >= 80:
            mark_passed(pid)
            st.toast("🎉 Quiz passed!", icon="✅")
        if st.button("Retake Quiz", key=f"retake_{pid}"):
            st.session_state.quiz_state[pid] = {"idx": 0, "score": 0, "answered": None}
            st.rerun()
        return

    q = quiz[idx]
    st.markdown(f'<div class="quiz-q">{q["q"]}</div>', unsafe_allow_html=True)

    for choice in q["choices"]:
        if st.button(choice, key=f"choice_{pid}_{idx}_{choice}",
                     disabled=answered is not None):
            is_correct = (choice == q["answer"])
            new_score = score + (1 if is_correct else 0)
            st.session_state.quiz_state[pid] = {"idx": idx, "score": new_score, "answered": choice}
            mark_attempted(pid)
            if is_correct:
                st.toast("✅ Correct!", icon="🎉")
            else:
                st.toast(f"❌ Incorrect — answer: {q['answer']}", icon="⚠️")
            st.rerun()

    if answered is not None:
        is_correct = (answered == q["answer"])
        if is_correct:
            st.markdown('<div style="color:#22c55e;font-weight:700;margin:8px 0">✓ Correct!</div>', unsafe_allow_html=True)
        else:
            st.markdown(f'<div style="color:#ef4444;font-weight:700;margin:8px 0">✗ Incorrect — answer: {q["answer"]}</div>', unsafe_allow_html=True)
        st.markdown(f'<div class="quiz-explain">{q["explain"]}</div>', unsafe_allow_html=True)

        if st.button("Next →", key=f"next_{pid}_{idx}", type="primary"):
            st.session_state.quiz_state[pid] = {"idx": idx + 1, "score": st.session_state.quiz_state[pid]["score"], "answered": None}
            st.rerun()

# ─── Practice: Flashcard ──────────────────────────────────────────────────────
def _render_practice_flashcard(prob, pid):
    cards = prob.get("flashcards", [])
    if not cards:
        st.info("No flashcards for this problem.")
        return

    idx = st.session_state.fc_idx.get(pid, 0)
    total = len(cards)

    st.progress(idx / total if total else 0, text=f"Card {idx+1} of {total}")

    fc = cards[idx]
    st.markdown(f'<div class="flashcard"><div class="flashcard-q">{fc["q"]}</div></div>', unsafe_allow_html=True)

    show_key = f"fc_show_{pid}_{idx}"
    if show_key not in st.session_state:
        st.session_state[show_key] = False

    col1, col2, col3 = st.columns([1, 1, 1])
    with col1:
        if st.button("Flip ↓", key=f"flip_{pid}_{idx}", type="primary"):
            st.session_state[show_key] = True
            mark_attempted(pid)
            st.rerun()
    with col2:
        if idx < total - 1:
            if st.button("Next →", key=f"fc_next_{pid}"):
                st.session_state.fc_idx[pid] = idx + 1
                st.rerun()
        else:
            if st.button("↺ Restart", key=f"fc_restart_{pid}"):
                st.session_state.fc_idx[pid] = 0
                mark_passed(pid)
                st.toast("🎉 Deck complete!", icon="✅")
                st.rerun()
    with col3:
        if idx > 0:
            if st.button("← Prev", key=f"fc_prev_{pid}"):
                st.session_state.fc_idx[pid] = idx - 1
                st.rerun()

    if st.session_state.get(show_key):
        st.markdown(f'<div class="flashcard" style="margin-top:8px"><div class="flashcard-a">{fc["a"]}</div></div>', unsafe_allow_html=True)

# ─── Unified Detail View ──────────────────────────────────────────────────────
def render_detail(prob):
    render_sidebar()
    render_detail_header(prob)
    pid = prob["id"]
    ptype = prob["type"]

    tabs = st.tabs(["📖 Study", "⚡ Practice"])

    with tabs[0]:
        _render_study_content(prob, pid)

    with tabs[1]:
        if ptype == "code":
            _render_practice_code(prob, pid)
        elif ptype == "quiz":
            _render_practice_quiz(prob, pid)
        elif ptype == "flashcard":
            _render_practice_flashcard(prob, pid)

# ─── Router ──────────────────────────────────────────────────────────────────
def main():
    view = st.session_state.view
    pid = st.session_state.current_id

    if view == "list" or not pid:
        render_list()
    else:
        prob = get_problem(pid)
        if not prob:
            st.session_state.view = "list"
            st.rerun()
        render_detail(prob)

main()
