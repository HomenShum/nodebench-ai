"""
Interview Prep Dashboard -- LangChain agent sidebar + completion tracking + quiz system
Usage: streamlit run scripts/career/interview-prep-dashboard.py
Requires: GEMINI_API_KEY or ANTHROPIC_API_KEY in scripts/career/.env or env vars
"""
import streamlit as st
import os
import random
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

st.set_page_config(page_title="Interview Prep", layout="wide", page_icon="*")

# --- Constants ---
SECTIONS = [
    "Python vs Go",
    "Python vs Java",
    "Coding Questions",
    "LangChain / Agents",
    "GCP Basics",
    "System Design",
    "Behavioral STAR",
    "How This Dashboard Works",
    "Senior Depth Cards",
    "Live Scenarios",
]

# --- Session State Init ---
if "topic_progress" not in st.session_state:
    st.session_state.topic_progress = {
        s: {"viewed": False, "quiz_correct": 0, "quiz_total": 0} for s in SECTIONS
    }
if "messages" not in st.session_state:
    st.session_state.messages = []
if "coding_q_seen" not in st.session_state:
    st.session_state.coding_q_seen = set()

# --- Quiz Bank (28 questions across 7 sections) ---
QUIZ_BANK = {
    "Python vs Go": [
        {"q": "What Go keyword creates a variable with type inference?",
         "choices": [":=", "var ::", "let", "auto"],
         "answer": ":=",
         "explain": "`:=` is shorthand. Infers the type. Use inside functions 90% of the time."},
        {"q": "How does Go handle errors?",
         "choices": ["try/except", "return (result, error)", "throw/catch", "panic only"],
         "answer": "return (result, error)",
         "explain": "Go returns (result, error) tuple. Check `if err != nil` every time."},
        {"q": "What is Go's equivalent of Python's enumerate?",
         "choices": ["range", "iter", "each", "for..in"],
         "answer": "range",
         "explain": "`for i, val := range items` gives index and value, like Python's `enumerate`."},
        {"q": "What replaces Python classes in Go?",
         "choices": ["struct", "object", "class", "type"],
         "answer": "struct",
         "explain": "Go uses `struct` for data + methods attached via `func (s MyStruct)`. No inheritance."},
        {"q": "How do you start concurrent work in Go?",
         "choices": ["go funcName()", "async funcName()", "Thread(target=f)", "spawn(f)"],
         "answer": "go funcName()",
         "explain": "Put `go` before a function call. Goroutines are lightweight (2KB stack vs 1MB thread)."},
    ],
    "Python vs Java": [
        {"q": "What wraps ALL Java code?",
         "choices": ["class", "function", "module", "package"],
         "answer": "class",
         "explain": "Every line of Java lives inside a class. Python can run loose code."},
        {"q": "Java equivalent of Python's dict?",
         "choices": ["HashMap", "Dictionary", "Map", "Object"],
         "answer": "HashMap",
         "explain": "`Map<String, Integer> d = new HashMap<>();` then `d.put(key, val)`."},
        {"q": "How do you loop over an array in Java?",
         "choices": ["for (int n : nums)", "for n in nums", "foreach(nums, n)", "nums.each(n)"],
         "answer": "for (int n : nums)",
         "explain": "Java foreach: `for (type var : collection)`. No list comprehensions."},
    ],
    "Coding Questions": [
        {"q": "Two Sum: What data structure makes it O(n)?",
         "choices": ["Hash map (dict)", "Sorted array", "Linked list", "Tree"],
         "answer": "Hash map (dict)",
         "explain": "Dict lookup is O(1). Store {number: index}. Check if complement exists."},
        {"q": "Reverse Linked List: What are the 4 steps?",
         "choices": ["SAVE, FLIP, ADD, MOVE", "POP, PUSH, PEEK, SWAP", "READ, WRITE, SHIFT, RESET", "COPY, DELETE, INSERT, LINK"],
         "answer": "SAVE, FLIP, ADD, MOVE",
         "explain": "SAVE nxt. FLIP curr.next=prev. ADD prev=curr. MOVE curr=nxt."},
        {"q": "LRU Cache: What Python class handles it?",
         "choices": ["OrderedDict", "defaultdict", "Counter", "deque"],
         "answer": "OrderedDict",
         "explain": "OrderedDict tracks insertion order. `move_to_end(key)` on access, `popitem(last=False)` to evict oldest."},
        {"q": "Number of Islands: What algorithm?",
         "choices": ["DFS (pour paint)", "Binary search", "Sorting", "Dynamic programming"],
         "answer": "DFS (pour paint)",
         "explain": "Find a '1', count it, DFS to mark entire island as '0' (pour paint). Repeat."},
        {"q": "What does enumerate() return?",
         "choices": ["(index, value) pairs", "just values", "just indices", "a dict"],
         "answer": "(index, value) pairs",
         "explain": "`for i, val in enumerate(items)` gives both position and value."},
        {"q": "What does dict.get(key, default) do when key is missing?",
         "choices": ["Returns default", "Raises KeyError", "Returns None always", "Creates the key"],
         "answer": "Returns default",
         "explain": "`.get('cherry', 5)` returns 5 if 'cherry' not in dict. Safe access, no crash."},
    ],
    "LangChain / Agents": [
        {"q": "Chain vs Agent: which decides tools at runtime?",
         "choices": ["Agent", "Chain", "Both", "Neither"],
         "answer": "Agent",
         "explain": "Chain = fixed recipe (same steps). Agent = thinks and picks tools dynamically."},
        {"q": "What does ReAct stand for?",
         "choices": ["Reason + Act", "React.js", "Real-time Action", "Recursive Actor"],
         "answer": "Reason + Act",
         "explain": "Think -> Act (call tool) -> Observe result -> Think again -> Answer."},
        {"q": "What are the 4 LangChain memory types?",
         "choices": ["Buffer, Window, Summary, VectorStore", "RAM, Disk, Cache, Cloud",
                  "Short, Long, Working, Episodic", "Stack, Queue, Heap, Graph"],
         "answer": "Buffer, Window, Summary, VectorStore",
         "explain": "Buffer=full history. Window=last K. Summary=compressed. VectorStore=search by similarity."},
        {"q": "How is MCP related to LangChain tool calling?",
         "choices": ["Same concept, different protocol", "Completely unrelated",
                  "MCP replaces LangChain", "LangChain invented MCP"],
         "answer": "Same concept, different protocol",
         "explain": "Both let LLMs call external tools. MCP is a protocol standard. LangChain is a framework."},
    ],
    "GCP Basics": [
        {"q": "GCP service for serverless containers?",
         "choices": ["Cloud Run", "GKE", "Compute Engine", "App Engine"],
         "answer": "Cloud Run",
         "explain": "Cloud Run = serverless containers. Like your Convex + Render setup."},
        {"q": "GCP data warehouse service?",
         "choices": ["BigQuery", "Cloud SQL", "Firestore", "Bigtable"],
         "answer": "BigQuery",
         "explain": "BigQuery = serverless data warehouse. Like your JPM ETL processing 100K docs."},
        {"q": "GCP ML platform?",
         "choices": ["Vertex AI", "TensorFlow Hub", "ML Engine", "AutoML only"],
         "answer": "Vertex AI",
         "explain": "Vertex AI = end-to-end ML platform. Training, serving, monitoring."},
    ],
    "System Design": [
        {"q": "Ad serving latency target?",
         "choices": ["<50ms", "<500ms", "<1s", "<5s"],
         "answer": "<50ms",
         "explain": "Ads must serve in <50ms. Billions of requests/day. Go backend for speed."},
        {"q": "MCP Gateway close code for auth failure?",
         "choices": ["4001", "4002", "4003", "401"],
         "answer": "4001",
         "explain": "4001=auth, 4002=rate limit, 4003=idle timeout. WebSocket close codes."},
        {"q": "Your MCP gateway rate limit?",
         "choices": ["100/min", "10/sec", "1000/hr", "No limit"],
         "answer": "100/min",
         "explain": "100 requests per minute per API key. Returns 4002 when exceeded."},
    ],
    "Behavioral STAR": [
        {"q": "How many tasks completed at Meta?",
         "choices": ["64/64", "50/50", "100/100", "32/32"],
         "answer": "64/64",
         "explain": "64/64 task completion rate. Perfect score on the eval harness."},
        {"q": "What was your cost reduction factor?",
         "choices": ["17x ($364->$21)", "10x ($100->$10)", "5x ($50->$10)", "3x ($60->$20)"],
         "answer": "17x ($364->$21)",
         "explain": "$364 per run down to $21. Token compaction + trajectory optimization."},
        {"q": "Token compaction range?",
         "choices": ["10-50M -> 1-3M", "1M -> 100K", "100M -> 10M", "5M -> 500K"],
         "answer": "10-50M -> 1-3M",
         "explain": "Compaction via trajectories not screenshots. JSON -40%, prompt -75%."},
        {"q": "First RAG deployment?",
         "choices": ["JPMorgan (Jan 2024)", "Meta (2025)", "Tesla (2026)", "CosmaNeura (2023)"],
         "answer": "JPMorgan (Jan 2024)",
         "explain": "First agentic RAG at JPMorgan. Automated prospecting from a vague ask."},
    ],
    "How This Dashboard Works": [
        {"q": "What LangChain pattern does the AI tutor use?",
         "choices": ["ChatPromptTemplate | LLM", "AgentExecutor", "RetrievalQA", "ConversationChain"],
         "answer": "ChatPromptTemplate | LLM",
         "explain": "A chain pipes the prompt template directly into the LLM. No agent loop needed for Q&A."},
        {"q": "How does the tutor know which tab you're viewing?",
         "choices": ["st.session_state['current_tab'] injected into prompt", "It reads the URL",
                  "Separate LLM call per tab", "It doesn't know"],
         "answer": "st.session_state['current_tab'] injected into prompt",
         "explain": "The prompt template has `[Viewing: {current_tab}]`. Streamlit session_state stores the tab name."},
        {"q": "What is st.session_state in Streamlit?",
         "choices": ["Per-user dict that persists across reruns", "Global database",
                  "Browser cookie", "Server-side cache"],
         "answer": "Per-user dict that persists across reruns",
         "explain": "Every widget interaction causes a rerun. session_state survives reruns. Lost on page refresh."},
        {"q": "How does the chat history work in this dashboard?",
         "choices": ["HumanMessage/AIMessage list passed via MessagesPlaceholder",
                  "Database storage", "Browser localStorage", "File on disk"],
         "answer": "HumanMessage/AIMessage list passed via MessagesPlaceholder",
         "explain": "Last 10 messages converted to LangChain message objects. MessagesPlaceholder injects them into the prompt."},
        {"q": "What does @st.dialog do?",
         "choices": ["Creates a modal popup overlay", "Redirects to new page",
                  "Opens browser alert", "Creates a new tab"],
         "answer": "Creates a modal popup overlay",
         "explain": "The quiz modal is a Streamlit dialog. Runs its own script flow inside an overlay."},
    ],
    "Senior Depth Cards": [
        {"q": "What is p99 latency?",
         "choices": ["99% of requests finish faster than this time",
                  "Average response time", "Fastest response time", "99th request time"],
         "answer": "99% of requests finish faster than this time",
         "explain": "p50=half finish faster. p95=almost all. p99=the slowest 1%. Interviewers care about p99 because that's where users complain."},
        {"q": "What is a circuit breaker?",
         "choices": ["Stops calling a failing service, tries again later",
                  "Disconnects the database", "Kills the server", "Rate limits users"],
         "answer": "Stops calling a failing service, tries again later",
         "explain": "Like a fuse box. If the kitchen catches fire, stop sending orders. Check again in 30 seconds. Prevents cascade failures."},
        {"q": "Blue-green deployment means:",
         "choices": ["Run two copies, switch traffic when new one is ready",
                  "Deploy to two clouds", "Use blue and green color themes",
                  "Run tests in blue, deploy in green"],
         "answer": "Run two copies, switch traffic when new one is ready",
         "explain": "Two identical environments. Users on Blue. Deploy to Green. Test Green. Flip the switch. If Green breaks, flip back to Blue instantly."},
        {"q": "Token bucket rate limiter:",
         "choices": ["Bucket fills with tokens at fixed rate, each request takes one",
                  "Count requests per minute", "Block after first request",
                  "Assign tokens to users at signup"],
         "answer": "Bucket fills with tokens at fixed rate, each request takes one",
         "explain": "Bucket holds max 100 tokens. Refills 10/sec. Each request costs 1 token. Empty bucket = rejected. Allows bursts up to 100, then rate-limited."},
        {"q": "CAP theorem says you can have at most:",
         "choices": ["2 of 3: Consistency, Availability, Partition tolerance",
                  "All three always", "Only one at a time", "None in distributed systems"],
         "answer": "2 of 3: Consistency, Availability, Partition tolerance",
         "explain": "Network splits WILL happen (P is forced). So you pick: CP (bank: everyone sees same balance, but might be down) or AP (social media: always up, but likes might lag)."},
        {"q": "Cache-aside pattern:",
         "choices": ["App checks cache first. Miss? Read DB, store in cache, return.",
                  "Cache writes to DB automatically", "DB pushes updates to cache",
                  "Cache replaces the database"],
         "answer": "App checks cache first. Miss? Read DB, store in cache, return.",
         "explain": "Your app is the middleman. Check cache -> miss -> read DB -> put in cache -> return. Most common pattern. You control what gets cached."},
        {"q": "What is consistent hashing?",
         "choices": ["Distribute data across servers so adding/removing a server moves minimal data",
                  "Hash passwords consistently", "Same hash function everywhere",
                  "Hash that never changes"],
         "answer": "Distribute data across servers so adding/removing a server moves minimal data",
         "explain": "Imagine servers on a clock face. Each key hashes to a position, goes to the next server clockwise. Add a server? Only its neighbors' keys move. Not everything."},
    ],
    "Live Scenarios": [
        {"q": "Agent retry loop: first thing you check?",
         "choices": ["Is there a max retry count / circuit breaker?",
                  "Restart the server", "Check the UI", "Ask the user"],
         "answer": "Is there a max retry count / circuit breaker?",
         "explain": "Infinite retries = infinite cost. First check: does the retry have a cap? If not, that's the bug."},
        {"q": "Memory usage climbing in production. What's the likely cause?",
         "choices": ["Unbounded Map/Array growing with each request",
                  "Too many users", "Bad CSS", "Slow network"],
         "answer": "Unbounded Map/Array growing with each request",
         "explain": "In-memory collections without eviction grow forever. Agents amplify this: 1000s of requests fill the Map in minutes."},
        {"q": "Code review: you see `catch(err) { return res.status(200).json({}) }`. What's wrong?",
         "choices": ["Returns success on failure, hiding errors from callers",
                  "Missing semicolons", "Should use 201", "Nothing wrong"],
         "answer": "Returns success on failure, hiding errors from callers",
         "explain": "HONEST_STATUS violation. A 200 on error means agents/callers think it worked. They build on phantom state. Return 500 with error details."},
        {"q": "Architecture review: 'Why WebSocket instead of REST for your MCP gateway?'",
         "choices": ["Bidirectional: server can push tool results back without client polling",
                  "WebSocket is faster", "REST is deprecated", "WebSocket uses less bandwidth always"],
         "answer": "Bidirectional: server can push tool results back without client polling",
         "explain": "MCP tools can take seconds. With REST, client polls repeatedly. WebSocket: server pushes the result when ready. Also supports streaming partial results."},
    ],
}

# --- Scenario Simulation Prompts ---
SCENARIO_SIMS = {
    "Architecture Review": {
        "icon": "1",
        "description": "A staff engineer is grilling you on your design choices. Answer live. No Googling.",
        "scenarios": [
            {
                "title": "MCP Gateway Design Review",
                "setup": "You're presenting your MCP gateway architecture to the team. WebSocket server, API key auth, rate limiting, tool dispatch.",
                "prompt": """You are a skeptical staff engineer at Coinbase reviewing Homen's MCP gateway design. Be tough but fair. Ask pointed "why not" questions.

The system: WebSocket MCP gateway with API key auth (close code 4001), rate limiting at 100/min (close code 4002), idle timeout 30min (close code 4003), in-memory session Map, tool dispatch to 350 tools.

Start by asking ONE pointed architecture question. Examples:
- "Why WebSocket instead of SSE or HTTP long-polling?"
- "Your sessions are in-memory Maps. What happens when the server restarts?"
- "100/min rate limit -- is that per key or global? What algorithm?"
- "How do you handle a tool that takes 60 seconds to respond?"

After each answer, follow up with a deeper question. If the answer is vague, push back: "That's hand-wavy. Be specific." If the answer is good, go deeper: "Okay, but what about [edge case]?"

Grade responses on: specificity, tradeoff awareness, honest acknowledgment of gaps.""",
            },
            {
                "title": "Agent Retry Strategy Review",
                "setup": "You proposed a retry strategy for failed tool calls in an insurance claims agent. The team has questions.",
                "prompt": """You are a principal engineer at Liberate (insurance AI company) reviewing a retry strategy proposal.

The proposed system: when an agent tool call fails, retry up to 3 times with exponential backoff (1s, 2s, 4s). After 3 failures, mark the step as failed and move to the next step.

Start with ONE question like:
- "What if the tool call is not idempotent? You just submitted the same insurance claim 3 times."
- "Exponential backoff with what jitter? Without jitter, all your retries hit at the same time."
- "You said 'move to the next step.' What if step 3 depends on step 2's output? You just skipped a critical dependency."
- "What's your timeout per attempt? If the service is down, you're waiting 1+2+4 = 7 seconds. Your SLO is 5 seconds."

Push back on vague answers. Reward specific tradeoff reasoning.""",
            },
            {
                "title": "Database Choice Review",
                "setup": "You chose Convex as your backend. A teammate suggests Postgres would be more standard.",
                "prompt": """You are a backend engineer arguing that Postgres is better than Convex for this system. Challenge Homen to defend Convex.

Points to raise:
- "Convex has vendor lock-in. Postgres is portable."
- "How do you do complex joins? Convex doesn't support SQL."
- "What about raw query performance at scale? Convex is a managed service."
- "Can you run Convex locally for testing?"

Be fair but persistent. If Homen gives a good reason (real-time subscriptions, automatic caching, serverless), acknowledge it but push on the tradeoff.

Grade on: honesty about limitations, concrete examples, not just repeating marketing.""",
            },
        ],
    },
    "Incident Response": {
        "icon": "2",
        "description": "Production alert fires. You have 15 minutes to diagnose. Clock is ticking.",
        "scenarios": [
            {
                "title": "Agent Token Burn (Cost Spike)",
                "setup": "PagerDuty alert: LLM API spend jumped from $21/run to $340/run in the last hour. 16x cost spike. Multiple agent sessions active.",
                "prompt": """You are the on-call monitoring system at a company running AI agents. Present this incident to Homen and evaluate his diagnostic approach.

ALERT: LLM API cost spiked 16x in the last hour.
- Normal: $21 per agent run
- Current: $340 per agent run
- Active sessions: 12
- Error rate: 0% (everything "succeeds")
- Token usage: 10-50M tokens per run (was 1-3M)

Give this information and ask: "What do you check first?"

CORRECT DIAGNOSTIC PATH:
1. Check if token compaction is disabled (regression)
2. Check if agents are in retry loops (tool fails -> retry -> fail -> retry)
3. Check if context window is accumulating (not trimming old messages)
4. Check if a specific tool is returning huge responses (unbounded read)

WRONG APPROACHES (push back if Homen says these):
- "Restart the servers" -- doesn't diagnose the cause
- "Rate limit the API" -- treats symptom, not cause
- "Check the UI" -- cost is backend, not frontend

After each step Homen proposes, reveal the next clue. Guide toward the root cause: an agent is stuck in a retry loop because a tool returns 200 with empty data (HONEST_STATUS violation), so the agent keeps retrying thinking it worked but got no result.

Time pressure: after every 2 exchanges, remind them "You're 5 minutes in. Cost is still climbing."
""",
            },
            {
                "title": "Memory Leak (OOM Crash)",
                "setup": "Server crashed and restarted. It's happened 3 times today. Each time, memory usage climbs from 200MB to 4GB over ~2 hours, then OOM kill.",
                "prompt": """You are the ops dashboard presenting a memory leak incident.

SYMPTOMS:
- Server restarts every ~2 hours
- Memory: starts at 200MB, climbs steadily to 4GB, then OOM killed
- No spike -- gradual, linear growth
- Request rate: steady 50 req/min (normal)
- No errors in logs
- Started after yesterday's deploy

Ask: "Where do you look first?"

CORRECT PATH:
1. Check diff of yesterday's deploy -- what changed?
2. Look for unbounded in-memory collections (Map, Array, Set without eviction)
3. Specifically: is there a new Map() that grows with each request but never evicts?
4. Check: are WebSocket sessions cleaned up on disconnect?
5. Profile: take a heap snapshot, compare two snapshots 10 min apart

THE BUG (reveal gradually):
Yesterday's deploy added request logging to an in-memory Array.
Every request appends a log entry. Never truncated.
50 req/min x 60 min x 2 hours = 6000 entries x ~500 bytes each = 3MB.
But each entry also holds a reference to the full request/response objects (~600KB each).
6000 x 600KB = 3.6GB. OOM.

Fix: add MAX_LOG_ENTRIES = 1000 with ring buffer eviction.

Push back on: "just add more RAM" (doesn't fix the cause), "restart on a cron" (band-aid).
""",
            },
            {
                "title": "Cascading Timeout",
                "setup": "API response times jumped from 200ms to 30 seconds. Users seeing spinners. No errors, just slow.",
                "prompt": """You are monitoring dashboards showing a latency spike.

SYMPTOMS:
- p50 latency: was 200ms, now 15,000ms
- p99 latency: was 2,000ms, now 30,000ms (timeout)
- Error rate: 0% (requests eventually succeed)
- CPU: 20% (normal)
- Memory: stable
- External API (Gemini): responding in 200ms (normal)
- Database (Convex): responding in 50ms (normal)

Ask: "Everything external is fast. Your server is slow. What's happening?"

CORRECT PATH:
1. If external deps are fine, the problem is INTERNAL to the server
2. Check: connection pool exhaustion? Too many pending requests?
3. Check: is there a synchronous bottleneck? A lock? A sequential loop?
4. Check: are requests queuing because one handler is blocking the event loop?

THE BUG:
A new middleware added yesterday does a synchronous JSON.parse on request bodies.
One request sent a 50MB JSON body (a huge document upload).
JSON.parse is synchronous -- blocks the Node.js event loop for ~25 seconds.
During those 25 seconds, ALL other requests queue up.
After the parse finishes, the queue drains but new large requests keep blocking.

Fix: add request body size limit (MAX 1MB), use streaming JSON parser for large bodies.

Push back on: "scale horizontally" (one blocked event loop blocks all requests on that instance), "add a timeout" (timeout doesn't fix the blocking parse, just fails faster).
""",
            },
        ],
    },
    "Code Review": {
        "icon": "3",
        "description": "A junior engineer submitted a PR. Find the bugs and explain why they matter.",
        "scenarios": [
            {
                "title": "API Route with Hidden Bugs",
                "setup": "Junior engineer wrote an API endpoint for tool dispatch. Find all the issues.",
                "prompt": """You are presenting code for Homen to review. Show this code and ask "What issues do you see?"

```javascript
const toolCache = new Map();

router.post("/api/tools/call", async (req, res) => {
  const { toolName, args, apiKey } = req.body;

  // Cache the tool result
  const cacheKey = JSON.stringify({ toolName, args });
  if (toolCache.has(cacheKey)) {
    return res.status(200).json(toolCache.get(cacheKey));
  }

  try {
    const tool = tools.find(t => t.name === toolName);
    const result = await tool.handler(args);
    toolCache.set(cacheKey, result);
    res.status(201).json(result);
  } catch (err) {
    console.log(err);
    res.status(200).json({ error: "something went wrong" });
  }
});
```

BUGS (from most to least severe):

P0 - HONEST_STATUS: catch block returns 200 on error. Callers think it succeeded.
     Fix: res.status(500).json({ error: err.message })

P0 - BOUND: toolCache has no size limit. Grows forever. OOM under load.
     Fix: add MAX_CACHE = 1000, evict oldest on insert

P0 - NO AUTH: no API key validation. Anyone can call any tool.
     Fix: validate apiKey before processing

P1 - DETERMINISTIC: JSON.stringify key ordering is not guaranteed.
     Same args in different order = different cache key = cache miss.
     Fix: use stable-stringify with sorted keys

P1 - NULL CHECK: tool might be undefined if toolName doesn't exist.
     `await tool.handler(args)` would crash with "Cannot read property 'handler' of undefined"
     Fix: if (!tool) return res.status(404).json({ error: "Tool not found" })

P2 - LOGGING: console.log(err) loses the error in production. Use structured logging.

P2 - NO TIMEOUT: tool.handler could hang forever. Needs AbortController + timeout.

After Homen identifies issues, ask: "How would you explain the HONEST_STATUS bug to the junior engineer without making them feel bad?" This tests mentorship ability.
""",
            },
            {
                "title": "Rate Limiter with a Subtle Bug",
                "setup": "Junior implemented a rate limiter. It mostly works but has a critical edge case.",
                "prompt": """Show this code and ask "This rate limiter has a subtle bug. Can you find it?"

```javascript
const rateLimits = {};

function checkRateLimit(apiKey) {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100;

  if (!rateLimits[apiKey]) {
    rateLimits[apiKey] = { count: 1, windowStart: now };
    return true;
  }

  const entry = rateLimits[apiKey];

  if (now - entry.windowStart > windowMs) {
    // New window
    entry.count = 1;
    entry.windowStart = now;
    return true;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return false;
  }
  return true;
}
```

BUGS:

P0 - BOUND: rateLimits object grows with every unique apiKey. Never cleaned up.
     An attacker sends requests with random API keys -> memory grows forever.
     Fix: use a Map with MAX_ENTRIES, or add a cleanup interval that removes expired entries.

P1 - BOUNDARY BURST: Fixed window algorithm. At 0:59 send 100 requests, at 1:00 send 100 more.
     200 requests in 2 seconds while "respecting" the 100/min limit.
     Fix: sliding window or token bucket.

P1 - RACE CONDITION: entry.count++ is not atomic. Under concurrent requests,
     two requests could read count=99, both increment to 100, both pass.
     Fix: use atomic increment or a mutex (in Node.js single-threaded, this is less critical
     but matters if using worker threads).

P2 - NO RETURN VALUE ON REJECT: function returns false but doesn't tell the caller
     how long to wait. Should return { allowed: false, retryAfterMs: remaining }.

After review, ask: "Which bug would you fix first and why?" Tests prioritization ability.
""",
            },
            {
                "title": "Circuit Breaker Missing a State",
                "setup": "Junior built a circuit breaker but it has a logic flaw.",
                "prompt": """Show this code and ask "What's wrong with this circuit breaker?"

```javascript
class CircuitBreaker {
  constructor(fn, options = {}) {
    this.fn = fn;
    this.failureCount = 0;
    this.maxFailures = options.maxFailures || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.state = 'CLOSED'; // CLOSED = normal, OPEN = rejecting
  }

  async call(...args) {
    if (this.state === 'OPEN') {
      throw new Error('Circuit is OPEN. Service unavailable.');
    }

    try {
      const result = await this.fn(...args);
      this.failureCount = 0;
      return result;
    } catch (err) {
      this.failureCount++;
      if (this.failureCount >= this.maxFailures) {
        this.state = 'OPEN';
        setTimeout(() => {
          this.state = 'CLOSED';
        }, this.resetTimeout);
      }
      throw err;
    }
  }
}
```

THE CRITICAL BUG:

Missing HALF_OPEN state. After resetTimeout, it goes directly from OPEN to CLOSED.
This means: after 30 seconds, ALL traffic floods the recovering service at once.
The service, which was struggling, now gets hit with full load and fails again.

CORRECT behavior:
- OPEN -> (after timeout) -> HALF_OPEN
- HALF_OPEN: allow ONE request through as a test
- If test succeeds -> CLOSED (resume full traffic)
- If test fails -> OPEN (wait another 30 seconds)

SECONDARY BUGS:
- setTimeout holds a reference, preventing garbage collection if the breaker is discarded
- No metric emission (how do you know the circuit opened in production?)
- failureCount resets to 0 on ANY success, even in HALF_OPEN. Should only reset after N consecutive successes.

Ask: "How would you add the HALF_OPEN state? Walk me through the logic."
""",
            },
        ],
    },
}


# --- Linkup Web Search ---
def linkup_search(query, max_results=3):
    """Search the web via Linkup API. Returns list of {title, url, snippet}."""
    api_key = os.getenv("LINKUP_API_KEY")
    if not api_key:
        return []
    try:
        resp = requests.post(
            "https://api.linkup.so/v1/search",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"q": query, "depth": "standard", "outputType": "searchResults"},
            timeout=10,
        )
        if resp.status_code != 200:
            return []
        data = resp.json()
        results = []
        for r in data.get("results", [])[:max_results]:
            results.append({
                "title": r.get("name", ""),
                "url": r.get("url", ""),
                "snippet": r.get("content", "")[:300],
            })
        return results
    except Exception:
        return []


# --- Gemini File Upload ---
def extract_file_text(uploaded_file):
    """Extract text from uploaded file. Supports txt, py, md, json, csv."""
    try:
        content = uploaded_file.read().decode("utf-8", errors="replace")
        # Cap at 4000 chars to keep prompt manageable
        if len(content) > 4000:
            content = content[:4000] + "\n... (truncated)"
        return content
    except Exception as e:
        return f"Could not read file: {e}"


# --- LangChain Agent Setup ---
@st.cache_resource
def get_agent():
    """Build a LangChain conversational agent with interview prep context."""
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_core.messages import SystemMessage

    system = """You are an interview prep tutor for Homen Shum. He is preparing for:
- TikTok (Ads Interface & Platform, Python/FastAPI)
- Coinbase (AI Applications, Golang/React/Python/LangChain/Temporal)
- Tesla (Python Developer, ML)
- Meta (continued, LLM-as-a-judge eval tasks)
- Ditto AI (agentic AI)

His background: Platform Architect at Meta, shipped 2 MCP servers (NodeBench 350 tools + TA Studio 9 tools),
JPMorgan banking (3.5 yrs, first agentic RAG), eval harnesses, 17x cost reduction ($364->$21),
token compaction 10-50M->1-3M per run, 64/64 task completion, FluencyMed in Golang.

Teaching style rules:
- Explain like Calculus Made Easy 1910. Visual examples with real numbers.
- Show Python side-by-side with unfamiliar languages when relevant.
- No jargon without immediate explanation.
- No em dashes. Short sentences. Conversational like a coworker mock session.
- Use number traces (seen={{2:0, 8:1}}) not abstract descriptions.
- Use physical analogies (pouring paint, picking up cards, filing cabinet).
- Keep answers SHORT unless asked to go deep.

CONTEXT AWARENESS:
- You know which tab the user is viewing and their quiz progress.
- If they just got a quiz wrong, help them understand that specific concept.
- If they haven't visited a section yet, suggest they check it out when relevant.
- Recommend what to study next based on their weakest quiz scores."""

    gemini_key = os.getenv("GEMINI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    if gemini_key:
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(
            model="gemini-3.1-pro-preview",
            google_api_key=gemini_key,
            temperature=0.3,
        )
        provider = "Gemini 3.1 Pro"
    elif anthropic_key:
        from langchain_anthropic import ChatAnthropic
        llm = ChatAnthropic(
            model="claude-opus-4-20250514",
            anthropic_api_key=anthropic_key,
            max_tokens=1024,
        )
        provider = "Claude Opus 4"
    else:
        return None, "No API key found. Add GEMINI_API_KEY or ANTHROPIC_API_KEY to scripts/career/.env"

    prompt = ChatPromptTemplate.from_messages([
        SystemMessage(content=system),
        MessagesPlaceholder(variable_name="history"),
        ("human", "[Viewing: {current_tab}]\n[Progress: {progress_summary}]\n\n{input}"),
    ])

    chain = prompt | llm
    return chain, provider

agent_chain, agent_status = get_agent()


# --- Quiz Dialog ---
@st.dialog("Quiz Time!", width="large")
def quiz_dialog(section):
    """Modal quiz popup. Picks a random question, tracks score."""
    # Persist question across reruns inside the dialog
    if "current_quiz" not in st.session_state or st.session_state.get("quiz_section") != section:
        st.session_state.current_quiz = random.choice(QUIZ_BANK[section])
        st.session_state.quiz_section = section
        st.session_state.quiz_submitted = False

    q = st.session_state.current_quiz
    progress = st.session_state.topic_progress[section]
    if progress["quiz_total"] > 0:
        acc = progress["quiz_correct"] / progress["quiz_total"] * 100
        st.caption(f"{section} -- {progress['quiz_correct']}/{progress['quiz_total']} correct ({acc:.0f}%)")

    st.markdown(f"### {q['q']}")
    choice = st.radio("Your answer:", q["choices"], index=None, key="quiz_choice")

    col1, col2, col3 = st.columns(3)
    with col1:
        if st.button("Check Answer", type="primary", disabled=st.session_state.quiz_submitted):
            if choice is None:
                st.warning("Pick an answer first!")
            else:
                st.session_state.quiz_submitted = True
                if choice == q["answer"]:
                    st.success(f"Correct! {q['explain']}")
                    st.session_state.topic_progress[section]["quiz_correct"] += 1
                else:
                    st.error(f"Not quite. Answer: **{q['answer']}**\n\n{q['explain']}")
                st.session_state.topic_progress[section]["quiz_total"] += 1
    with col2:
        if st.button("Next Question"):
            st.session_state.current_quiz = random.choice(QUIZ_BANK[section])
            st.session_state.quiz_submitted = False
            st.rerun()
    with col3:
        if st.button("Close"):
            if "current_quiz" in st.session_state:
                del st.session_state.current_quiz
            if "quiz_section" in st.session_state:
                del st.session_state.quiz_section
            st.rerun()


# --- Helper: build progress summary for AI context ---
def get_progress_summary():
    parts = []
    for s in SECTIONS:
        p = st.session_state.topic_progress[s]
        status = "not-started"
        if p["viewed"]:
            status = "viewed"
        if p["quiz_total"] >= 3 and p["quiz_correct"] / max(p["quiz_total"], 1) >= 0.7:
            status = "strong"
        elif p["quiz_total"] > 0:
            acc = p["quiz_correct"] / p["quiz_total"] * 100
            status = f"quiz {p['quiz_correct']}/{p['quiz_total']} ({acc:.0f}%)"
        parts.append(f"{s}: {status}")
    return "; ".join(parts)


# --- AI Tutor Sidebar (persistent across all tabs) ---
with st.sidebar:
    st.title("AI Tutor")
    if agent_chain:
        st.caption(f"Powered by {agent_status} via LangChain")
    else:
        st.error(agent_status)

    # --- Progress Tracker ---
    st.subheader("Progress")
    viewed_count = sum(1 for p in st.session_state.topic_progress.values() if p["viewed"])
    total_correct = sum(p["quiz_correct"] for p in st.session_state.topic_progress.values())
    total_attempts = sum(p["quiz_total"] for p in st.session_state.topic_progress.values())

    st.progress(viewed_count / len(SECTIONS), text=f"Sections: {viewed_count}/{len(SECTIONS)}")
    if total_attempts > 0:
        st.progress(total_correct / max(total_attempts, 1),
                     text=f"Quiz: {total_correct}/{total_attempts} ({total_correct/total_attempts*100:.0f}%)")
    else:
        st.progress(0.0, text="Quiz: no attempts yet")

    # Per-section status
    for s in SECTIONS:
        p = st.session_state.topic_progress[s]
        if p["quiz_total"] >= 3 and p["quiz_correct"] / max(p["quiz_total"], 1) >= 0.7:
            icon = "+"  # strong
        elif p["viewed"]:
            icon = "~"  # in progress
        else:
            icon = "-"  # not started
        score_str = f" ({p['quiz_correct']}/{p['quiz_total']})" if p["quiz_total"] > 0 else ""
        st.caption(f"[{icon}] {s}{score_str}")

    st.divider()

    # --- Chat ---
    chat_container = st.container(height=300)
    with chat_container:
        for msg in st.session_state.messages:
            with st.chat_message(msg["role"]):
                st.markdown(msg["content"])

    if prompt := st.chat_input("Ask me anything..."):
        st.session_state.messages.append({"role": "user", "content": prompt})

        current_tab = st.session_state.get("current_tab", "unknown")
        sub_topic = st.session_state.get("current_sub_topic", "")
        progress_summary = get_progress_summary()

        with chat_container:
            with st.chat_message("user"):
                st.markdown(prompt)

            with st.chat_message("assistant"):
                if agent_chain:
                    from langchain_core.messages import HumanMessage, AIMessage
                    history = []
                    for m in st.session_state.messages[-10:]:
                        if m["role"] == "user":
                            history.append(HumanMessage(content=m["content"]))
                        else:
                            history.append(AIMessage(content=m["content"]))
                    if history and isinstance(history[-1], HumanMessage):
                        history = history[:-1]

                    context_input = prompt
                    if sub_topic:
                        context_input = f"[Sub-topic: {sub_topic}]\n\n{prompt}"

                    # Enrich with web search if enabled
                    if st.session_state.get("web_search_toggle"):
                        with st.spinner("Searching web..."):
                            search_results = linkup_search(prompt)
                        if search_results:
                            sources_text = "\n".join(
                                f"- [{r['title']}]({r['url']}): {r['snippet']}"
                                for r in search_results
                            )
                            context_input = f"[Web search results for '{prompt}']\n{sources_text}\n\n{context_input}"

                    # Enrich with uploaded file if present
                    if st.session_state.get("uploaded_file_text"):
                        fname = st.session_state.get("uploaded_file_name", "file")
                        context_input = f"[Uploaded file: {fname}]\n{st.session_state.uploaded_file_text[:2000]}\n\n{context_input}"

                    try:
                        response = agent_chain.invoke({
                            "history": history,
                            "current_tab": current_tab,
                            "progress_summary": progress_summary,
                            "input": context_input,
                        })
                        reply = response.content
                    except Exception as e:
                        reply = f"Error: {e}"
                else:
                    reply = agent_status

                st.markdown(reply)
                st.session_state.messages.append({"role": "assistant", "content": reply})

    if st.button("Clear chat"):
        st.session_state.messages = []
        st.rerun()

    st.divider()

    # --- Sources: Web Search + File Upload ---
    st.subheader("Sources")
    web_search_on = st.toggle("Web search (Linkup)", value=False, key="web_search_toggle")
    if web_search_on:
        st.caption("AI tutor will search the web for your question")

    uploaded_file = st.file_uploader(
        "Upload a file for context",
        type=["txt", "py", "md", "json", "csv", "ts", "tsx", "js", "html", "pdf"],
        key="file_upload",
    )
    if uploaded_file:
        if "uploaded_file_text" not in st.session_state or st.session_state.get("uploaded_file_name") != uploaded_file.name:
            st.session_state.uploaded_file_text = extract_file_text(uploaded_file)
            st.session_state.uploaded_file_name = uploaded_file.name
        st.caption(f"Loaded: {uploaded_file.name} ({len(st.session_state.uploaded_file_text)} chars)")

    st.divider()
    section = st.radio("Section", SECTIONS, label_visibility="collapsed")
    st.session_state["current_tab"] = section

    # Mark section as viewed
    if section in st.session_state.topic_progress:
        st.session_state.topic_progress[section]["viewed"] = True


# === Main Content ===

def section_quiz_button(section_name):
    """Render a Quiz Me button at the bottom of each section. Opens the dialog."""
    st.divider()
    p = st.session_state.topic_progress[section_name]
    col1, col2 = st.columns([3, 1])
    with col1:
        if p["quiz_total"] > 0:
            acc = p["quiz_correct"] / p["quiz_total"] * 100
            st.caption(f"Quiz score: {p['quiz_correct']}/{p['quiz_total']} ({acc:.0f}%)")
        else:
            st.caption("No quiz attempts yet")
    with col2:
        if st.button("Quiz Me!", key=f"quiz_btn_{section_name}", type="primary"):
            quiz_dialog(section_name)


if section == "Python vs Go":
    st.title("Python vs Go")

    for title, py, go, tip in [
        ("1. Variables",
         'name = "Homen"\nage = 30\nsalary = 200000.0',
         'var name string = "Homen"\nage := 30              // shorthand\nsalary := 200000.0',
         "`:=` creates a variable and infers the type. Use 90% of the time inside functions."),
        ("2. Functions",
         'def add(a, b):\n    return a + b\n\ndef greet(name):\n    return "Hello, " + name',
         'func add(a int, b int) int {\n    return a + b\n}\n\nfunc greet(name string) string {\n    return "Hello, " + name\n}',
         "`func` not `def`. Types AFTER names: `a int`. Return type at end: `) int {`"),
        ("3. Classes vs Structs",
         'class Employee:\n    def __init__(self, name, salary):\n        self.name = name\n        self.salary = salary\n\n    def display(self):\n        return self.name\n\ne = Employee("Homen", 200000)',
         'type Employee struct {\n    Name   string\n    Salary int\n}\n\nfunc (e Employee) Display() string {\n    return e.Name\n}\n\ne := Employee{Name: "Homen", Salary: 200000}',
         "Go has no classes. `struct` for data. Methods attach with `func (e Employee)`. No `self`."),
        ("4. Error Handling",
         'def divide(a, b):\n    if b == 0:\n        raise Exception("cannot be zero")\n    return a / b\n\ntry:\n    result = divide(10, 0)\nexcept Exception as e:\n    print("Problem:", e)',
         'func divide(a int, b int) (float64, error) {\n    if b == 0 {\n        return 0, fmt.Errorf("cannot be zero")\n    }\n    return float64(a) / float64(b), nil\n}\n\nresult, err := divide(10, 0)\nif err != nil {\n    fmt.Println("Problem:", err)\n}',
         "Python: raise/try-except. Go: return (result, error), check `if err != nil`. Forces you to handle every error."),
        ("5. Concurrency",
         'import threading\n\ndef screen_resume(r):\n    pass\n\nfor r in resumes:\n    t = threading.Thread(target=screen_resume, args=(r,))\n    t.start()',
         'func screenResume(r Resume) {\n    // process\n}\n\nfor _, r := range resumes {\n    go screenResume(r)\n}',
         "Just `go` in front of the call. 500 goroutines = 500 resumes concurrently."),
        ("6. Loops",
         'for i in range(5):\n    print(i)\n\nfor name in names:\n    print(name)\n\nfor i, name in enumerate(names):\n    print(i, name)',
         'for i := 0; i < 5; i++ {\n    fmt.Println(i)\n}\n\nfor _, name := range names {\n    fmt.Println(name)\n}\n\nfor i, name := range names {\n    fmt.Println(i, name)\n}',
         "`range` = Go's `enumerate`. `_` skips index. No while loop, just `for` variants."),
    ]:
        st.subheader(title)
        c1, c2 = st.columns(2)
        with c1:
            st.caption("Python")
            st.code(py, language="python")
        with c2:
            st.caption("Go")
            st.code(go, language="go")
        st.info(tip)

    section_quiz_button("Python vs Go")

elif section == "Python vs Java":
    st.title("Python vs Java")
    for title, py, java, tip in [
        ("1. Hello World",
         'print("Hello World")',
         'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}',
         "Java needs class wrapper + main method. Python runs directly."),
        ("2. Variables",
         'name = "Homen"\nnums = [1, 2, 3]\nd = {"a": 1}',
         'String name = "Homen";\nint[] nums = {1, 2, 3};\nMap<String, Integer> d = new HashMap<>();\nd.put("a", 1);',
         "Java: explicit types, semicolons, Map/HashMap not {}."),
        ("3. Lists & Loops",
         'nums = [1, 2, 3, 4, 5]\ndoubled = [n * 2 for n in nums]\ntotal = sum(nums)',
         'int[] nums = {1, 2, 3, 4, 5};\nfor (int i = 0; i < nums.length; i++) {\n    nums[i] *= 2;\n}\nint total = 0;\nfor (int n : nums) { total += n; }',
         "`for (int n : nums)` = Java foreach. No list comprehensions."),
    ]:
        st.subheader(title)
        c1, c2 = st.columns(2)
        with c1:
            st.caption("Python")
            st.code(py, language="python")
        with c2:
            st.caption("Java")
            st.code(java, language="java")
        st.info(tip)

    section_quiz_button("Python vs Java")

elif section == "Coding Questions":
    st.title("Coding Questions")
    q = st.selectbox("Question", ["Two Sum", "Reverse Linked List", "LRU Cache",
                                   "Number of Islands", "FastAPI Endpoint", "Move Zeros"])

    # Track which coding question is being viewed
    st.session_state["current_sub_topic"] = q
    st.session_state.coding_q_seen.add(q)

    questions = {
        "Two Sum": {
            "desc": "Find two numbers that add to target. Return indices.\n\n**Trick:** Dict as notebook. Check if complement exists.",
            "code": 'def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        comp = target - n\n        if comp in seen:\n            return [seen[comp], i]\n        seen[n] = i',
            "trace": "nums=[2,7,11,15], target=9\n\ni=0 n=2: comp=7, 7 in {}? No.   seen={2:0}\ni=1 n=7: comp=2, 2 in {2:0}? YES! Return [0,1]"
        },
        "Reverse Linked List": {
            "desc": "Reverse 1->2->3->None. **Trick:** Pick up cards onto new pile. 4 steps: SAVE, FLIP, ADD, MOVE.",
            "code": 'def reverse(head):\n    prev = None\n    curr = head\n    while curr:\n        nxt = curr.next      # SAVE\n        curr.next = prev     # FLIP\n        prev = curr          # ADD\n        curr = nxt           # MOVE\n    return prev',
            "trace": "Pass 1: nxt=2, 1->None, prev=1, curr=2\nPass 2: nxt=3, 2->1, prev=2, curr=3\nPass 3: nxt=None, 3->2, prev=3, curr=None\nDone: 3->2->1->None"
        },
        "LRU Cache": {
            "desc": "Evict least recently used. **Trick:** OrderedDict. Front=oldest, end=newest.",
            "code": 'from collections import OrderedDict\n\nclass LRUCache:\n    def __init__(self, cap):\n        self.cache = OrderedDict()\n        self.cap = cap\n    def get(self, key):\n        if key not in self.cache: return -1\n        self.cache.move_to_end(key)\n        return self.cache[key]\n    def put(self, key, val):\n        if key in self.cache: self.cache.move_to_end(key)\n        self.cache[key] = val\n        if len(self.cache) > self.cap:\n            self.cache.popitem(last=False)',
            "trace": "cap=2\nput(1,'A') [1:A]\nput(2,'B') [1:A, 2:B] full\nget(1)     [2:B, 1:A] 1 moved to end\nput(3,'C') evict 2:B -> [1:A, 3:C]"
        },
        "Number of Islands": {
            "desc": "Count connected '1' groups. **Trick:** Pour paint. DFS marks visited by flipping 1->0.",
            "code": 'def num_islands(grid):\n    count = 0\n    for i in range(len(grid)):\n        for j in range(len(grid[0])):\n            if grid[i][j] == "1":\n                count += 1\n                pour_paint(grid, i, j)\n    return count\n\ndef pour_paint(grid, i, j):\n    if i<0 or j<0 or i>=len(grid) or j>=len(grid[0]): return\n    if grid[i][j] != "1": return\n    grid[i][j] = "0"\n    pour_paint(grid, i+1, j)\n    pour_paint(grid, i-1, j)\n    pour_paint(grid, i, j+1)\n    pour_paint(grid, i, j-1)',
            "trace": "Grid:\n1 1 0 0\n1 1 0 0\n0 0 1 0\n0 0 0 1\n\nFind (0,0)='1' -> count=1, paint entire island\nFind (2,2)='1' -> count=2, paint it\nFind (3,3)='1' -> count=3, paint it\nAnswer: 3"
        },
        "FastAPI Endpoint": {
            "desc": "**Know for TikTok, Tesla, Coinbase API rounds.**",
            "code": 'from fastapi import FastAPI, HTTPException\nfrom pydantic import BaseModel\n\napp = FastAPI()\n\nclass PredictRequest(BaseModel):\n    features: list[float]\n    model_name: str = "default"\n\n@app.post("/predict")\nasync def predict(req: PredictRequest):\n    if not req.features:\n        raise HTTPException(400, "Features required")\n    return {"prediction": sum(req.features)/len(req.features)}\n\n@app.get("/health")\nasync def health():\n    return {"status": "ok"}',
            "trace": "Status codes:\n200 OK\n400 Bad Request\n401 Unauthorized\n404 Not Found\n429 Rate Limited\n500 Server Error"
        },
        "Move Zeros": {
            "desc": "`[1,0,2,0,3]` -> `[0,0,1,2,3]` keeping non-zero order.",
            "code": 'def move_zeros(arr):\n    write = len(arr) - 1\n    for read in range(len(arr)-1, -1, -1):\n        if arr[read] != 0:\n            arr[write] = arr[read]\n            write -= 1\n    while write >= 0:\n        arr[write] = 0\n        write -= 1\n    return arr',
            "trace": "[1,0,2,0,3]\nread=4(3): write pos 4 = 3, write=3\nread=3(0): skip\nread=2(2): write pos 3 = 2, write=2\nread=1(0): skip\nread=0(1): write pos 2 = 1, write=1\nfill 0s: pos 1=0, pos 0=0\nResult: [0,0,1,2,3]"
        }
    }

    data = questions[q]
    st.markdown(data["desc"])
    st.code(data["code"], language="python")
    with st.expander("Trace through"):
        st.code(data["trace"])

    # Show which questions have been reviewed
    st.divider()
    reviewed = len(st.session_state.coding_q_seen)
    total_q = len(questions)
    st.caption(f"Reviewed {reviewed}/{total_q} questions: {', '.join(sorted(st.session_state.coding_q_seen))}")

    section_quiz_button("Coding Questions")

elif section == "LangChain / Agents":
    st.title("LangChain & Agentic AI")
    st.session_state["current_sub_topic"] = "LangChain overview"

    st.subheader("Chain vs Agent")
    c1, c2 = st.columns(2)
    with c1:
        st.markdown("**Chain** = fixed recipe")
        st.code("Question -> Retrieve -> Generate -> Return")
        st.caption("Like your JPM ETL pipeline. Same steps every time.")
    with c2:
        st.markdown("**Agent** = decides on the fly")
        st.code("Question -> Think -> Pick tool -> Observe -> Think -> Answer")
        st.caption("Like your MCP server. Picks from 350 tools per query.")

    st.subheader("ReAct (Think -> Act -> Observe)")
    st.code("Thought: Need revenue data\nAction:  search_web('Anthropic revenue')\nObserve: $900M ARR\nThought: Can answer now\nAction:  return('$900M ARR')")
    st.success("YOUR META PATTERN: eval generates tests -> agent patches -> tracing observes -> review scores -> repeat")

    st.subheader("RAG")
    st.code("Question -> Search knowledge base -> Feed docs+question to LLM -> Answer with citations")
    st.success("YOU SHIPPED: JPMorgan's first agentic RAG (Jan 2024)")

    st.subheader("Memory")
    st.table({"Type": ["Buffer", "Window", "Summary", "VectorStore"],
              "What": ["Full history", "Last K msgs", "Summarizes old", "Search by similarity"],
              "Analogy": ["Full notebook", "Last 5 pages", "Summary at top", "Filing cabinet"]})

    st.subheader("Tool Calling")
    st.code('{"tool": "search_web", "args": {"query": "Tesla Q4"}}\n-> system runs tool\n-> returns result to LLM\n-> LLM answers')
    st.success("YOUR MCP SERVERS: Same concept. ta-studio has 9 tools. NodeBench has 350. MCP protocol instead of LangChain.")

    st.subheader("This Dashboard Uses LangChain")
    st.markdown("The AI Tutor in the sidebar is a **LangChain chain** (ChatPromptTemplate | LLM). It knows which tab you're on via the `current_tab` variable in the prompt template.")
    st.code("prompt = ChatPromptTemplate.from_messages([\n    SystemMessage(content=system),\n    MessagesPlaceholder(variable_name='history'),\n    ('human', '[Viewing: {current_tab}]\\n\\n{input}'),\n])\nchain = prompt | llm", language="python")

    section_quiz_button("LangChain / Agents")

elif section == "GCP Basics":
    st.title("GCP Services")
    st.session_state["current_sub_topic"] = "GCP overview"
    st.table({
        "GCP": ["Cloud Run", "Vertex AI", "BigQuery", "Cloud Functions", "Pub/Sub", "Artifact Registry"],
        "What": ["Serverless containers", "ML platform", "Data warehouse", "Function triggers", "Message queue", "Docker/npm registry"],
        "Your equivalent": ["Convex + Render", "SageMaker (JPM)", "JPM ETL 100K docs", "Azure Functions", "Azure Service Bus", "npm publish"]
    })

    section_quiz_button("GCP Basics")

elif section == "System Design":
    st.title("System Design")
    d = st.selectbox("Design", ["Resume Screening Agent", "Ads Serving Pipeline", "MCP Gateway (yours)"])
    st.session_state["current_sub_topic"] = d

    designs = {
        "Resume Screening Agent": "User: 'Screen 500 resumes'\n  1. INGEST: Parse PDFs\n  2. EMBED: Vectorize resumes+JD\n  3. SCORE: Cosine similarity\n  4. RANK: Top 20\n  5. EXPLAIN: LLM 'why this fits'\n  6. SERVE: FastAPI endpoint\n\nConcurrent: go screenResume(r)\nStorage: BigQuery + GCS",
        "Ads Serving Pipeline": "Ad slot available\n  1. SIGNAL: User features\n  2. RETRIEVE: Candidate ads\n  3. RANK: CTR prediction\n  4. AUCTION: Pick winner\n  5. SERVE: <50ms\n  6. LOG: Billing+training\n\nBillions req/day, Go backend",
        "MCP Gateway (yours)": "WebSocket connect\n  1. AUTH: API key (4001)\n  2. RATE: 100/min (4002)\n  3. SESSION: MCP lifecycle\n  4. DISPATCH: Tool calls\n  5. TIMEOUT: 30min idle (4003)\n  6. HEALTH: /health\n\n500K tok/60s, 17x cost reduction"
    }
    st.code(designs[d])

    section_quiz_button("System Design")

elif section == "Behavioral STAR":
    st.title("STAR Stories")
    st.session_state["current_sub_topic"] = "Behavioral"

    for title, s, t, a, r in [
        ("100-Day Sprint", "Meta. Sole architect. 350K+ bugs. 100 days.", "Ship alone.",
         "Eval->patch->trace->review->rerun. 10 infra systems.", "Promoted 2mo. 64/64. 17x cost. VP approval."),
        ("Token Compaction", "Meta day 30. 10-50M tok/run. OOM.", "Cost-viable, no budget.",
         "Compaction: trajectories not screenshots. JSON -40%, prompt -75%.", "1-3M tokens. 11x tool calls. 81% zero-error."),
        ("Ambiguous -> Shipped", "JPM 2024. 'Automate prospecting.' No spec.", "Vague ask -> product.",
         "Interviewed bankers, found loop. Built agentic RAG.", "First RAG at firm. Productized."),
        ("Data Over Opinions", "Meta. Screenshots vs compaction debate.", "Team: more data=better.",
         "Built both, same 64 tasks, compared numbers.", "Compaction 17x cheaper. Data won."),
        ("Beyond Role", "CosmaNeura. No budget.", "Deploy 3 prototypes, $0.",
         "Secured $500K Azure credit. Built 3 prototypes.", "Full deployment. Shipped."),
    ]:
        with st.expander(title):
            st.markdown(f"**S:** {s}\n\n**T:** {t}\n\n**A:** {a}\n\n**R:** {r}")

    st.subheader("Numbers")
    st.table({"What": ["Promotion", "Tasks", "Cost", "Tokens", "Rate limit", "Tools", "JPM deals", "Azure"],
              "Number": ["100 days", "64/64", "$364->$21 (17x)", "10-50M->1-3M", "500K/60s", "350+9", "72/$800M", "$500K"]})

    section_quiz_button("Behavioral STAR")

elif section == "How This Dashboard Works":
    st.title("How This Dashboard Works")
    st.caption("This dashboard IS a LangChain + Streamlit lesson. Everything below is exactly what powers the sidebar AI tutor, the quiz system, and the source integrations.")
    st.session_state["current_sub_topic"] = "meta-lesson"

    # --- 1. The LangChain Chain ---
    st.subheader("1. LangChain Chain (ChatPromptTemplate | LLM)")
    c1, c2 = st.columns(2)
    with c1:
        st.markdown("**What it does**")
        st.markdown("""
The AI tutor is a **chain**, not an agent.
A chain is a fixed pipeline: prompt template -> LLM -> response.
No tool-picking loop. No ReAct. Just: format the prompt, send to model, get text back.
""")
    with c2:
        st.markdown("**The actual code**")
        st.code("""from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import SystemMessage

prompt = ChatPromptTemplate.from_messages([
    SystemMessage(content=system_instructions),
    MessagesPlaceholder(variable_name="history"),
    ("human", "[Viewing: {current_tab}]\\n{input}"),
])

chain = prompt | llm    # the pipe operator
response = chain.invoke({
    "history": [...],
    "current_tab": "Coding Questions",
    "input": "explain two sum",
})""", language="python")
    st.info("The `|` (pipe) operator connects prompt -> LLM. Like Unix pipes: `echo 'hi' | grep 'h'`. Data flows left to right.")

    # --- 2. Session State ---
    st.subheader("2. Streamlit Session State")
    c1, c2 = st.columns(2)
    with c1:
        st.markdown("**The problem**")
        st.markdown("""
Streamlit reruns the ENTIRE script on every click.
Click a button? Full rerun. Type in chat? Full rerun.
Without session_state, all variables reset to defaults every time.
""")
    with c2:
        st.markdown("**The solution**")
        st.code("""# This dict survives reruns
if "messages" not in st.session_state:
    st.session_state.messages = []

# Store chat history
st.session_state.messages.append({
    "role": "user", "content": prompt
})

# Track which sections you've visited
st.session_state.topic_progress[section]["viewed"] = True

# Track quiz scores
st.session_state.topic_progress[section]["quiz_correct"] += 1""", language="python")
    st.info("Think of session_state as a notebook you carry between reruns. Without it, you'd have amnesia every click.")

    # --- 3. Context Injection ---
    st.subheader("3. Context Injection (How the Tutor Knows What You're Doing)")
    st.markdown("""
The tutor receives 4 layers of context in every message:

| Layer | What | How |
|-------|------|-----|
| **Tab** | Which section you're viewing | `st.session_state["current_tab"]` -> `[Viewing: Python vs Go]` |
| **Sub-topic** | Specific item (e.g., which coding question) | `st.session_state["current_sub_topic"]` -> `[Sub-topic: Two Sum]` |
| **Progress** | Your quiz scores per section | `get_progress_summary()` -> `[Progress: Python vs Go: quiz 3/5 (60%); ...]` |
| **Sources** | Web search results or uploaded file | Linkup API results or file text prepended to input |
""")
    st.code("""# All 4 layers combined into one prompt:
"[Viewing: Coding Questions]"
"[Progress: Python vs Go: strong; Coding Questions: quiz 2/3 (67%)]"
"[Sub-topic: Two Sum]"
"[Web search results for 'hash map complexity']"
"  - [Hash Table - Wikipedia](url): O(1) average..."
"[Uploaded file: notes.txt]"
"  my handwritten notes about two sum..."
""
"explain why dict lookup is O(1)"  # <-- the actual question""")

    # --- 4. Conversation History ---
    st.subheader("4. Conversation History (MessagesPlaceholder)")
    c1, c2 = st.columns(2)
    with c1:
        st.markdown("**LangChain messages**")
        st.code("""from langchain_core.messages import HumanMessage, AIMessage

history = []
for msg in st.session_state.messages[-10:]:
    if msg["role"] == "user":
        history.append(HumanMessage(content=msg["content"]))
    else:
        history.append(AIMessage(content=msg["content"]))""", language="python")
    with c2:
        st.markdown("**What the LLM sees**")
        st.code("""[SystemMessage: "You are an interview prep tutor..."]
[HumanMessage: "what is enumerate"]
[AIMessage: "enumerate gives you (index, value)..."]
[HumanMessage: "show me two sum"]
[AIMessage: "def two_sum(nums, target):..."]
[HumanMessage: "[Viewing: Coding Questions]\\nexplain the dict part"]
                 ^^ current question, injected via template""")
    st.info("Window of 10 messages = Window memory type from LangChain. Old messages fall off. Prevents token overflow.")

    # --- 5. Web Search (Linkup API) ---
    st.subheader("5. Web Search via Linkup API")
    st.code("""import requests

def linkup_search(query, max_results=3):
    resp = requests.post(
        "https://api.linkup.so/v1/search",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"q": query, "depth": "standard",
              "outputType": "searchResults"},
        timeout=10,
    )
    results = resp.json().get("results", [])[:max_results]
    return [{"title": r["name"], "url": r["url"],
             "snippet": r["content"][:300]} for r in results]""", language="python")
    st.markdown("""
**How it connects to the chain:**
1. User asks a question with web search toggle ON
2. Dashboard calls `linkup_search(question)`
3. Results are prepended to the input: `[Web search results for '...'] ...`
4. LLM sees both the search results AND the question
5. LLM answers using grounded web data

This is **RAG without a vector database**. Real-time retrieval -> augmented generation.
""")

    # --- 6. File Upload ---
    st.subheader("6. Document Upload (File -> Context)")
    st.code("""uploaded_file = st.file_uploader(
    "Upload a file for context",
    type=["txt", "py", "md", "json", "csv", "ts", "html"],
)

if uploaded_file:
    text = uploaded_file.read().decode("utf-8")
    # Cap at 4000 chars to fit in prompt
    st.session_state.uploaded_file_text = text[:4000]

# Later, when invoking the chain:
context_input = f"[Uploaded file: {fname}]\\n{file_text}\\n\\n{question}"
""", language="python")
    st.markdown("""
**Interview talking point:** "The dashboard supports document upload as context injection.
Upload your notes, a code file, or a job description, and the AI tutor answers
with that document in its context window. Same pattern as RAG: retrieve -> inject -> generate."
""")

    # --- 7. Quiz System (@st.dialog) ---
    st.subheader("7. Quiz System (@st.dialog)")
    st.code("""@st.dialog("Quiz Time!", width="large")
def quiz_dialog(section):
    # Persist question in session_state so reruns
    # don't randomize a new question mid-dialog
    if "current_quiz" not in st.session_state:
        st.session_state.current_quiz = random.choice(QUIZ_BANK[section])

    q = st.session_state.current_quiz
    st.markdown(f"### {q['q']}")
    choice = st.radio("Your answer:", q["choices"])

    if st.button("Check Answer"):
        if choice == q["answer"]:
            st.success(q["explain"])
            st.session_state.topic_progress[section]["quiz_correct"] += 1
        else:
            st.error(f"Answer: {q['answer']}\\n{q['explain']}")
        st.session_state.topic_progress[section]["quiz_total"] += 1""", language="python")
    st.info("@st.dialog creates a modal overlay. The function runs its own Streamlit script flow inside the popup. session_state persists the random question so it doesn't change on each rerun.")

    # --- 8. Architecture Summary ---
    st.subheader("8. Full Architecture")
    st.code("""
USER CLICKS / TYPES
        |
        v
  [Streamlit Rerun] -- full script re-executes
        |
   session_state -- survives rerun (messages, progress, quiz)
        |
   +----+----+
   |         |
SIDEBAR    MAIN CONTENT
   |         |
   |    section_quiz_button() -- @st.dialog modal
   |
   +-- chat_input()
   |      |
   |   [web search?] -- Linkup API -> search results
   |   [file upload?] -- extract text -> context
   |      |
   |   build context_input:
   |     [Viewing: tab]
   |     [Progress: scores]
   |     [Sub-topic: item]
   |     [Web results / File text]
   |     actual question
   |      |
   |   chain.invoke({history, current_tab, progress, input})
   |      |
   |   ChatPromptTemplate -> format prompt
   |      |
   |   Gemini 3.1 Pro (or Claude fallback)
   |      |
   |   response.content -> display + save to session_state
""")

    st.success("Walk an interviewer through this diagram. It covers: LangChain chains, session management, context injection, RAG pattern (web search), document processing, and interactive UI. All in ~500 lines of Python.")

    section_quiz_button("How This Dashboard Works")

elif section == "Senior Depth Cards":
    st.title("Senior Depth Cards")
    st.caption("Every concept explained in plain English first, then mapped to YOUR codebase, then the tradeoff sentence for interviews.")
    st.session_state["current_sub_topic"] = "senior depth"

    depth_topic = st.selectbox("Topic", [
        "Back-of-Envelope Math",
        "Failure Cascades & Circuit Breakers",
        "Caching (Eviction, Invalidation, Patterns)",
        "Rate Limiting Algorithms",
        "Consistency Models (CAP, ACID)",
        "Load Balancing",
        "Database Indexing & Sharding",
        "Deployment (Blue-Green, Canary, Rollback)",
        "Observability (Metrics, Logs, Traces)",
        "Message Queues & Async",
    ])
    st.session_state["current_sub_topic"] = depth_topic

    if depth_topic == "Back-of-Envelope Math":
        st.subheader("Plain English")
        st.markdown("""
**What it is:** Quick math to check if a design even makes sense before you build it.

Like estimating grocery costs before you go shopping. You don't need exact prices.
You need to know: "Can I afford this trip or not?"

**The three questions:**
- **QPS** (queries per second): "How many customers walk in per second?"
- **Storage**: "How many filing cabinets do I need?"
- **Bandwidth**: "How fat is the pipe carrying data?"
""")

        st.subheader("Your Codebase (NodeBench)")
        st.code("""YOUR MCP GATEWAY:
- Rate limit: 100 req/min per API key = ~1.7 QPS per user
- Tool count: 350 tools, avg response ~2KB
- Active sessions: say 50 concurrent users

MATH:
  50 users x 1.7 QPS = 85 QPS total
  85 QPS x 2KB = 170 KB/sec bandwidth
  85 QPS x avg 200ms per tool call = need 17 concurrent handlers
  Single Node.js process handles ~1000 concurrent connections
  -> One server is plenty at this scale

STORAGE (if logging all tool calls):
  85 QPS x 86400 sec/day = 7.3M tool calls/day
  7.3M x 2KB = 14.6 GB/day of logs
  -> Need log rotation after ~7 days on a 100GB disk

WHEN TO SCALE:
  At 500 concurrent users: 850 QPS, need load balancer
  At 5000: need multiple servers, Redis for shared sessions""")

        st.subheader("Tradeoff Sentence")
        st.success('"At current scale, one Node.js process handles our load. I designed the gateway with rate limiting at 100/min so a single bad actor can\'t DOS the server. If we hit 500+ concurrent users, I\'d add a load balancer and move session state from in-memory Maps to Redis."')

        st.subheader("Cheat Sheet")
        st.table({
            "Unit": ["1 million", "1 billion", "1 KB", "1 MB", "1 GB", "1 TB"],
            "Shorthand": ["10^6", "10^9", "1,000 bytes", "10^6 bytes", "10^9 bytes", "10^12 bytes"],
            "Example": ["1M users", "1B page views/mo", "A tweet", "A photo", "A movie", "A day of logs at scale"],
        })
        st.table({
            "Time": ["1 ns", "1 us", "1 ms", "1 s"],
            "What fits": ["CPU instruction, L1 cache", "L2 cache, mutex lock", "SSD read, network round trip (same DC)", "Internet round trip, DB query (cold)"],
            "Analogy": ["Blink of a blink", "Snap your fingers", "Blink your eye", "Take a breath"],
        })

    elif depth_topic == "Failure Cascades & Circuit Breakers":
        st.subheader("Plain English")
        st.markdown("""
**Failure cascade:** One thing breaks, and the breakage spreads.

Think of a highway. One car crashes -> traffic backs up -> more crashes -> entire highway shut down.
In software: Database slows down -> API requests pile up -> memory fills up -> server crashes -> load balancer sends ALL traffic to remaining servers -> they crash too.

**Circuit breaker:** A fuse box for your code.

Your house has a fuse box. If you plug in too many things, the fuse blows BEFORE the wiring catches fire.
A circuit breaker does the same thing for API calls:
""")
        st.code("""THREE STATES:

CLOSED (normal):
  Requests flow through normally.
  Track failure count.

OPEN (tripped):
  "The kitchen is on fire. Stop sending orders."
  ALL requests immediately return an error.
  No actual call to the failing service.
  Wait 30 seconds, then try ONE request...

HALF-OPEN (testing):
  "Send one waiter to check if the fire is out."
  If that one request works -> go back to CLOSED.
  If it fails -> go back to OPEN, wait longer.""")

        st.subheader("Your Codebase")
        st.code("""YOUR GATEWAY (server/mcpGateway.ts):
  - Idle timeout: 30 min -> close code 4003
  - Rate limit: 100/min -> close code 4002
  - Auth fail: -> close code 4001

WHAT'S MISSING (senior answer):
  "If the Convex backend goes down, my gateway
   currently lets requests pile up. I'd add a
   circuit breaker: after 5 consecutive Convex
   timeouts, stop trying for 30 seconds.
   Return 503 'backend temporarily unavailable'
   instead of hanging."

YOUR EVAL HARNESS:
  - 64 tasks, each calls LLM APIs
  - If OpenAI rate-limits you (429), naive retry = cascade
  - You DID solve this: exponential backoff + budget gates
  - That's the circuit breaker pattern applied to LLM calls""")

        st.subheader("Tradeoff Sentence")
        st.success('"I use timeout budgets with AbortController in the gateway. If I were scaling this, I\'d add a circuit breaker on the Convex backend calls. After 5 consecutive failures, stop calling for 30 seconds and return 503. This prevents one slow dependency from taking down the entire gateway."')

        st.subheader("Graceful Degradation vs Hard Fail")
        c1, c2 = st.columns(2)
        with c1:
            st.markdown("**Hard fail**")
            st.code("DB down -> 500 error -> user sees error page")
            st.caption("Simple. Honest. But bad UX.")
        with c2:
            st.markdown("**Graceful degradation**")
            st.code("DB down -> serve from cache -> show stale data\n         -> banner: 'Data may be outdated'")
            st.caption("User still gets value. You buy time to fix.")
        st.info("YOUR EXAMPLE: NodeBench landing page loads demo data when Convex is down. That IS graceful degradation. Say it in the interview.")

    elif depth_topic == "Caching (Eviction, Invalidation, Patterns)":
        st.subheader("Plain English")
        st.markdown("""
**Cache:** A sticky note on your monitor so you don't have to open the filing cabinet every time.

You look something up in the filing cabinet (database). Takes 30 seconds.
You write the answer on a sticky note (cache). Next time? 0.1 seconds.

**The two hard problems:**

**1. Eviction:** "My monitor is full of sticky notes. Which one do I throw away?"
- **LRU** (Least Recently Used): Throw away the one you haven't looked at in the longest time.
- **LFU** (Least Frequently Used): Throw away the one you rarely look at.
- **TTL** (Time To Live): Every sticky note has an expiration date. "This is only good until 5pm."

**2. Invalidation:** "Someone changed the data in the filing cabinet. My sticky note is now WRONG."
- This is the hardest problem: "When do I throw away a sticky note because the truth changed?"
""")

        st.subheader("Three Caching Patterns")
        for pattern, how, when, your_code in [
            ("Cache-Aside (most common)",
             "App checks cache -> miss -> reads DB -> writes to cache -> returns",
             "When reads are way more common than writes",
             "Your toolRegistry.ts: tool catalog loaded once, served from memory for all requests"),
            ("Write-Through",
             "App writes to cache AND DB at the same time",
             "When you need cache and DB always in sync",
             "Your session state: write to in-memory Map AND Convex simultaneously"),
            ("Write-Behind (async)",
             "App writes to cache only. Cache writes to DB later in background.",
             "When write speed matters more than durability",
             "Your eval harness logging: buffer results in memory, flush to DB in batches"),
        ]:
            with st.expander(pattern):
                st.markdown(f"**How:** {how}")
                st.markdown(f"**When:** {when}")
                st.markdown(f"**Your code:** {your_code}")

        st.subheader("Your Codebase")
        st.code("""YOUR BOUNDED MAPS (agentic_reliability rule):
  - Every in-memory Map MUST have MAX_SIZE + eviction
  - You enforce LRU: delete oldest key on insert
  - MAX_ENTRIES constant on every cache

EXAMPLE (your MCP gateway sessions):
  const sessions = new Map()       // key=apiKey, val=session
  const MAX_SESSIONS = 1000

  // On new session:
  if (sessions.size >= MAX_SESSIONS) {
    const oldest = sessions.keys().next().value
    sessions.delete(oldest)        // LRU eviction
  }
  sessions.set(apiKey, newSession)""")

        st.subheader("Tradeoff Sentence")
        st.success('"I use cache-aside with LRU eviction and bounded Maps. Every in-memory collection has a MAX_SIZE constant. I learned this the hard way: agents in flywheel loops hit tool endpoints thousands of times. One unbounded Map and you OOM in minutes. So I enforce eviction on every cache as part of my 8-point reliability checklist."')

    elif depth_topic == "Rate Limiting Algorithms":
        st.subheader("Plain English")
        st.markdown("""
**Rate limiting:** "Only 100 customers per hour allowed in the store."

Without it, one person could walk in and out 10,000 times and nobody else gets in.
That's a DOS attack. Rate limiting prevents it.

**Three algorithms:**
""")

        for name, how, pros, cons in [
            ("Fixed Window",
             "Count requests in each minute. Reset at :00.\n\n  8:00:00 - 8:00:59 -> count resets\n  8:01:00 - 8:01:59 -> count resets\n\n  Problem: 100 requests at 8:00:59 + 100 at 8:01:00 = 200 in 2 seconds!",
             "Simple to implement. One counter per minute.",
             "Burst at window boundaries. Someone sends 100 at :59 and 100 at :00."),
            ("Sliding Window",
             "Look at the last 60 seconds from RIGHT NOW. Not clock-aligned.\n\n  At 8:01:30, check: how many requests since 8:00:30?\n  Weights the previous window: if 70% of the previous window is included,\n  count 70% of its requests.",
             "No boundary burst problem. Smooth rate.",
             "Slightly more complex. Need to track previous window count."),
            ("Token Bucket",
             "Imagine a bucket that holds 100 tokens.\n  Every second, 10 new tokens drop in (up to max 100).\n  Each request costs 1 token.\n  Empty bucket? Request rejected.\n\n  Allows BURSTS: if bucket is full, you can send 100 at once.\n  Then you're limited to 10/sec until it refills.",
             "Allows bursts (good for real usage patterns). Simple.",
             "Need to store: token count + last refill timestamp per user."),
        ]:
            with st.expander(name):
                st.code(how)
                st.markdown(f"**Pros:** {pros}")
                st.markdown(f"**Cons:** {cons}")

        st.subheader("Your Codebase")
        st.code("""YOUR GATEWAY (server/mcpAuth.ts):
  - 100 requests per minute per API key
  - Close code 4002 when exceeded
  - Implementation: fixed window (counter resets each minute)

INTERVIEW UPGRADE:
  "I use fixed window at 100/min for simplicity.
   If I needed smoother limiting, I'd switch to
   token bucket: allows bursts of 100 but sustains
   at ~1.7/sec. For distributed rate limiting across
   multiple servers, I'd use Redis with INCR + EXPIRE
   so all servers share the same counter."
""")

    elif depth_topic == "Consistency Models (CAP, ACID)":
        st.subheader("Plain English")
        st.markdown("""
**Consistency:** "Does everyone see the same thing at the same time?"

**Bank account example:**
You have $1000. You withdraw $500 at ATM A. Your partner checks balance at ATM B.

- **Strong consistency:** Partner sees $500. Always correct. But ATM B had to wait for ATM A's update to propagate. Might be slower.
- **Eventual consistency:** Partner might still see $1000 for a few seconds. Eventually updates to $500. Faster, always available.

**Which do you pick?**
- Bank balance? Strong consistency. Wrong balance = lawsuit.
- Instagram likes? Eventual consistency. Seeing 99 vs 100 likes for 2 seconds is fine.
""")

        st.subheader("CAP Theorem")
        st.code("""In a distributed system, pick 2 of 3:

C - Consistency:   Every read gets the latest write
A - Availability:  Every request gets a response (not an error)
P - Partition tolerance: System works even when network splits

REALITY: Network partitions WILL happen. P is not optional.
So you actually pick between:

CP (consistent but might be unavailable):
   "Sorry, ATM is down." But when it's up, balance is correct.
   Examples: Banks, inventory systems, Zookeeper

AP (available but might be stale):
   "Here's your feed!" But some posts might be 2 seconds old.
   Examples: Social media, CDN, DNS, Cassandra""")

        st.subheader("ACID (Database Transactions)")
        for letter, name, english, example in [
            ("A", "Atomicity", "All or nothing. Transfer $500: if debit succeeds but credit fails, UNDO the debit. No half-done operations.", "Your eval harness: if step 3 of 5 fails, the whole run is marked failed, not 'partially done'."),
            ("C", "Consistency", "Database goes from one valid state to another. No negative balances, no orphan records.", "Your tool registry: 350 tools. If you delete a tool, its nextTools and relatedTools refs must also update."),
            ("I", "Isolation", "Two transactions don't interfere. You and your partner both withdraw $500 from $1000. Without isolation: both succeed and bank loses $0. With isolation: second one fails.", "Two agents running the same eval task: isolation means they don't overwrite each other's results."),
            ("D", "Durability", "Once committed, it stays. Even if the server crashes 1 second later.", "Your Convex backend: once a mutation returns, the data is persisted. Server restart doesn't lose it."),
        ]:
            with st.expander(f"{letter} - {name}"):
                st.markdown(f"**Plain English:** {english}")
                st.markdown(f"**Your code:** {example}")

        st.subheader("Tradeoff Sentence")
        st.success('"My MCP gateway uses in-memory session state, which is AP: always available, eventually consistent if I scale to multiple servers. For the eval harness where correctness matters, I use Convex which gives me strong consistency and ACID transactions. The tradeoff is latency: Convex round-trip is ~50ms vs <1ms for in-memory."')

    elif depth_topic == "Load Balancing":
        st.subheader("Plain English")
        st.markdown("""
**Load balancer:** A host at a restaurant with 5 kitchens.

Customers arrive. The host decides which kitchen handles each order.
Without a host, everyone would crowd into Kitchen 1 while Kitchens 2-5 sit empty.
""")

        st.subheader("Algorithms")
        for name, how, when in [
            ("Round Robin",
             "Kitchen 1, Kitchen 2, Kitchen 3, Kitchen 1, Kitchen 2...\nJust go in order. Simple.",
             "All servers are identical. Requests are roughly equal cost."),
            ("Least Connections",
             "Send to whichever kitchen has the fewest orders right now.\nKitchen 1 has 3 orders, Kitchen 2 has 1 -> send to Kitchen 2.",
             "Requests vary in cost. Some take 10ms, some take 5 seconds. Don't pile up on one server."),
            ("Consistent Hashing",
             "Hash the customer's name -> always goes to the same kitchen.\n'Homen' always goes to Kitchen 3. Every time.\nBenefit: Kitchen 3 has all of Homen's data cached.",
             "Need sticky sessions or data locality. WebSocket connections (your MCP gateway)."),
            ("Weighted Round Robin",
             "Kitchen 1 is twice as big -> gets 2 orders for every 1 that Kitchen 2 gets.\nAssign weights based on server capacity.",
             "Servers have different specs. Your big box gets more traffic."),
        ]:
            with st.expander(name):
                st.markdown(f"**How:** {how}")
                st.markdown(f"**When:** {when}")

        st.subheader("Your Codebase")
        st.code("""CURRENT: Single server. No load balancer needed.

IF SCALING:
  "I'd put an nginx or Cloud Run load balancer
   in front of multiple gateway instances.
   For WebSocket (MCP sessions), I'd use
   consistent hashing so a client always hits
   the same server (sticky sessions).
   For stateless API calls (/health, /search),
   round robin is fine."

GCP SPECIFIC:
  Cloud Run auto-scales 0-to-N containers.
  Built-in load balancing with round robin.
  For WebSocket, need Cloud Run with
  session affinity enabled.""")

    elif depth_topic == "Database Indexing & Sharding":
        st.subheader("Plain English")
        st.markdown("""
**Index:** The table of contents in a book.

Without an index: "Find all mentions of 'LangChain'" = read every page. (Full table scan)
With an index: Check the back of the book, find "LangChain: pages 45, 89, 201". Jump directly.

**How it works:**
The database builds a B-tree (a sorted tree structure) on the column you index.
Looking up a value goes from O(n) to O(log n).
1 million rows: without index = scan 1M rows. With index = ~20 lookups.

**The cost:**
Every INSERT/UPDATE also updates the index. More indexes = slower writes.
Pick indexes on columns you QUERY often, not columns you write often.
""")

        st.subheader("Sharding")
        st.markdown("""
**Sharding:** Splitting one big database into smaller pieces across multiple servers.

Imagine your filing cabinet is full. You can't buy a bigger cabinet (vertical scaling has limits).
So you buy 4 cabinets:
- Cabinet A-F: customers whose last name starts with A-F
- Cabinet G-L: G-L
- Cabinet M-R: M-R
- Cabinet S-Z: S-Z

That's sharding. Each cabinet is a "shard."

**The hard question:** How do you pick the shard key?
- By user ID: user 1-1M on shard 1, 1M-2M on shard 2 (range-based)
- By hash: hash(userId) % 4 -> shard 0, 1, 2, or 3 (hash-based)
- By geography: US users on US shard, EU on EU shard
""")

        st.subheader("Your Codebase")
        st.code("""YOUR CONVEX TABLES:
  - Convex auto-indexes _id and _creationTime
  - You have 18+ tables (from founder platform)

INTERVIEW EXAMPLE:
  "My tool registry has 350 entries. At that scale,
   in-memory is fine. But if we had 100K tools across
   10K tenants, I'd shard by tenant ID using hash-based
   sharding. Each tenant's tools on one shard so
   discover_tools queries hit only one shard."

YOUR EVAL HARNESS:
  "7.3M tool calls per day (from our back-of-envelope).
   I'd index on: timestamp (for time range queries),
   tool_name (for per-tool analytics), and session_id
   (for debugging one user's run). Three indexes.
   Write overhead acceptable because reads dominate."
""")

    elif depth_topic == "Deployment (Blue-Green, Canary, Rollback)":
        st.subheader("Plain English")
        st.markdown("""
**The problem:** You have a live app with real users. You need to deploy a new version.
If the new version has a bug, users are affected. How do you minimize risk?
""")

        for name, analogy, how, risk in [
            ("Blue-Green",
             "Two identical restaurants. Customers eat at Blue. You renovate Green.\nWhen Green is ready and tested, redirect ALL customers to Green.\nIf Green has roaches, redirect everyone back to Blue in 1 second.",
             "1. Deploy new version to Green (idle) environment\n2. Run smoke tests on Green\n3. Switch load balancer from Blue -> Green\n4. If problems: switch back to Blue instantly\n5. Blue becomes the new idle for next deploy",
             "Need 2x infrastructure (cost). Database migrations are tricky: both Blue and Green talk to the same DB."),
            ("Canary",
             "You're a coal miner. Send a canary (small bird) into the mine first.\nIf the canary lives, the mine is safe. Send in the miners.\nIf the canary dies, DON'T send the miners.",
             "1. Deploy new version to 1 server out of 10\n2. Route 5% of traffic to the canary server\n3. Watch metrics for 15 minutes (error rate, latency)\n4. If metrics are good: roll out to 25%, 50%, 100%\n5. If metrics spike: kill the canary, 0% impact",
             "Slow. Takes 30-60 min for full rollout. But safest for large user bases."),
            ("Rolling Update",
             "Replace one waiter at a time. Old waiter finishes current tables,\nnew waiter takes over that section. Repeat until all waiters are new.",
             "1. Take server 1 out of rotation\n2. Deploy new version to server 1\n3. Add server 1 back to rotation\n4. Repeat for servers 2, 3, ..., N\n5. Always have N-1 servers running",
             "Two versions running simultaneously during rollout. Must be backward compatible."),
        ]:
            with st.expander(name):
                st.markdown(f"**Analogy:** {analogy}")
                st.code(how)
                st.markdown(f"**Risk:** {risk}")

        st.subheader("Your Codebase")
        st.code("""YOUR CURRENT SETUP:
  - Vercel (frontend): automatic canary-style deploys
    - Preview deploy on every PR
    - Production promote on merge to main
    - Instant rollback: click "redeploy previous"

  - Convex (backend): automatic rolling deploys
    - npx convex deploy pushes new functions
    - Old functions drain, new ones activate
    - Schema migrations run atomically

INTERVIEW SENTENCE:
  "I use Vercel for frontend which gives me preview
   deploys (canary pattern: test before promote) and
   instant rollback. For backend, Convex does rolling
   deploys with atomic schema migrations. If I were
   on bare metal, I'd set up blue-green with nginx
   upstream switching."
""")

    elif depth_topic == "Observability (Metrics, Logs, Traces)":
        st.subheader("Plain English")
        st.markdown("""
**Observability:** "Can I understand what's happening inside my system just by looking at its outputs?"

Three pillars, three analogies:

| Pillar | Analogy | What it answers |
|--------|---------|-----------------|
| **Metrics** | Thermometers in every room | "Is anything overheating RIGHT NOW?" |
| **Logs** | Security camera footage | "WHAT HAPPENED at 3:47pm?" |
| **Traces** | Following one customer from door to exit | "WHERE did this specific request spend its time?" |
""")

        st.subheader("Metrics Deep Dive")
        st.code("""LATENCY PERCENTILES:
  p50 = median. Half your requests are faster than this.
        "Normal experience."
  p95 = 95th percentile. Only 5% are slower.
        "Pretty bad day for some users."
  p99 = 99th percentile. Only 1% are slower.
        "Worst case. This is what pages you at 3am."

EXAMPLE (your MCP gateway):
  p50 = 45ms   (most tool calls are fast)
  p95 = 200ms  (some complex tools take longer)
  p99 = 2000ms (rare: tool timeout + retry)

  SLO (Service Level Objective):
    "99% of tool calls complete under 500ms"
    = p99 < 500ms
    Your current p99 = 2000ms -> SLO violated
    -> Fix: add timeout budget, abort at 500ms""")

        st.subheader("Tracing")
        st.code("""A TRACE follows one request through your entire system:

User asks "Tell me about Anthropic"
  |
  +-- [45ms] API Gateway: auth + rate check
  |
  +-- [12ms] Query classifier: "company_search"
  |
  +-- [350ms] Web search (Linkup API)
  |     +-- [200ms] HTTP request
  |     +-- [150ms] Parse results
  |
  +-- [800ms] LLM extraction (Gemini)
  |     +-- [50ms]  Build prompt
  |     +-- [750ms] Gemini API call
  |
  +-- [5ms] Assemble response

TOTAL: 1212ms
BOTTLENECK: Gemini API call (750ms = 62% of total)

YOUR SEARCH TRACE (server/routes/search.ts):
  You already emit trace arrays with step + durationMs!
  That IS distributed tracing. Say it in the interview.""")

        st.subheader("Your Codebase")
        st.code("""WHAT YOU ALREADY HAVE:
  - Search trace: step/tool/status/durationMs per request
  - Eval results: pass rate, avg latency, per-category scores
  - Agent telemetry dashboard (/?surface=telemetry)
  - Tool health metrics in Convex
  - System pulse MCP tool

WHAT TO SAY:
  "I built observability into the search pipeline.
   Every request emits a structured trace with
   step name, tool called, status, and duration.
   The telemetry dashboard shows tool breakdown,
   error rates, and latency distribution.
   If I were scaling, I'd add OpenTelemetry spans
   and ship traces to Grafana/Datadog for
   cross-service correlation."
""")

    elif depth_topic == "Message Queues & Async":
        st.subheader("Plain English")
        st.markdown("""
**Message queue:** A to-do list that multiple workers share.

You're a manager. You have 10 tasks and 3 workers.
You could assign tasks directly (synchronous): "Hey worker 1, do this. I'll wait."
Or you could write tasks on a whiteboard (queue): workers pick the next task when they're free.

**Benefits:**
- **Decoupling:** Manager doesn't need to know which worker is available
- **Buffering:** If 100 tasks arrive in 1 second, the queue holds them. Workers process at their own pace.
- **Retry:** Task failed? Put it back on the board. Another worker picks it up.

**Delivery guarantees:**
""")

        for guarantee, meaning, example in [
            ("At-most-once",
             "Send and forget. Message might get lost. No retry.\nLike texting: you send it, maybe they see it, maybe they don't.",
             "Analytics events. Losing one click event out of millions is fine."),
            ("At-least-once",
             "Keep retrying until confirmed. Message might arrive TWICE.\nLike email: if no read receipt, send again. Recipient might get duplicates.",
             "Payment processing: better to charge twice (then refund) than lose a charge. But needs idempotency."),
            ("Exactly-once",
             "Delivered once and only once. The holy grail.\nExtremely hard in distributed systems. Usually 'at-least-once + idempotent consumer'.",
             "Bank transfers: deduct exactly $500, not $0, not $1000."),
        ]:
            with st.expander(guarantee):
                st.markdown(f"**Meaning:** {meaning}")
                st.markdown(f"**Example:** {example}")

        st.subheader("Dead Letter Queue (DLQ)")
        st.code("""PLAIN ENGLISH:
  A message fails 3 times. Instead of retrying forever,
  move it to a "dead letter" queue (the reject pile).
  A human or alerting system reviews the reject pile.

  Like a post office: undeliverable mail goes to the
  dead letter office for manual inspection.

YOUR EXAMPLE:
  Your eval harness runs 64 tasks. If task 47 fails 3 times:
  - Don't retry forever (wastes API credits)
  - Log it to a "failed tasks" list with the error
  - Continue with tasks 48-64
  - Report: "63/64 passed, 1 in dead letter (task 47: timeout)"
""")

        st.subheader("Your Codebase")
        st.code("""YOUR ASYNC PATTERNS:
  - Convex actions: async mutations queued server-side
  - MCP tool dispatch: WebSocket messages queued per session
  - Eval harness: parallel task execution with Promise.allSettled

INTERVIEW SENTENCE:
  "My gateway uses WebSocket which is inherently async.
   Tool calls are dispatched as messages, results
   returned asynchronously. For the eval harness,
   I use Promise.allSettled to run tasks in parallel
   with at-least-once semantics: failed tasks retry
   up to 3 times, then go to a failed-tasks log
   for manual review. If scaling, I'd add a proper
   message queue like Cloud Pub/Sub or SQS for
   cross-service communication."
""")

    section_quiz_button("Senior Depth Cards")

elif section == "Live Scenarios":
    st.title("Live Scenario Simulations")
    st.caption("The AI tutor becomes a staff engineer, a pager alert, or a code reviewer. You respond under pressure. No looking things up.")
    st.session_state["current_sub_topic"] = "live scenarios"

    sim_type = st.selectbox("Simulation Type", list(SCENARIO_SIMS.keys()))
    sim = SCENARIO_SIMS[sim_type]
    st.markdown(f"**{sim['description']}**")

    scenario_titles = [s["title"] for s in sim["scenarios"]]
    chosen = st.selectbox("Scenario", scenario_titles)
    scenario = next(s for s in sim["scenarios"] if s["title"] == chosen)

    st.divider()
    st.subheader(scenario["title"])
    st.info(scenario["setup"])

    # Start simulation button
    if st.button("Start Simulation", type="primary", key="start_sim"):
        # Load the scenario prompt into the AI tutor and send the first message
        sim_prompt = scenario["prompt"]
        # Clear existing chat for fresh simulation
        st.session_state.messages = []
        st.session_state.messages.append({
            "role": "user",
            "content": f"[SIMULATION MODE: {sim_type} - {chosen}]\nStart the simulation. Play your role. Ask me the first question."
        })

        if agent_chain:
            from langchain_core.messages import HumanMessage, AIMessage
            try:
                response = agent_chain.invoke({
                    "history": [],
                    "current_tab": "Live Scenarios",
                    "progress_summary": get_progress_summary(),
                    "input": f"[SIMULATION MODE]\n{sim_prompt}\n\nStart now. Stay in character. Ask ONE pointed question.",
                })
                reply = response.content
                st.session_state.messages.append({"role": "assistant", "content": reply})
            except Exception as e:
                st.session_state.messages.append({"role": "assistant", "content": f"Error starting simulation: {e}"})
        st.rerun()

    # Show the cheat sheet in an expander (for AFTER the simulation)
    with st.expander("Cheat Sheet (review AFTER you attempt the scenario)", expanded=False):
        st.markdown("**The scenario prompt (what the AI tutor is doing):**")
        st.code(scenario["prompt"], language="text")
        st.warning("Use this to review AFTER attempting the scenario. Looking at it before defeats the purpose.")

    # Show ongoing simulation conversation
    if st.session_state.messages:
        st.divider()
        st.subheader("Simulation In Progress")
        st.caption("Respond to the AI tutor in the sidebar chat. It's playing the role described above.")
        for msg in st.session_state.messages:
            role_label = "You" if msg["role"] == "user" else sim_type.split()[0]
            if msg["role"] == "user" and "[SIMULATION MODE" in msg["content"]:
                continue  # hide the system setup message
            with st.chat_message(msg["role"]):
                st.markdown(msg["content"])

    st.divider()

    # Reference cards for each simulation type
    if sim_type == "Architecture Review":
        st.subheader("How to Answer Architecture Questions")
        st.markdown("""
**The formula:**

1. **State the choice:** "I chose X."
2. **State the alternatives:** "The other options were Y and Z."
3. **State why X won:** "X because [specific reason tied to our constraints]."
4. **State what X sacrifices:** "The tradeoff is [honest limitation]."
5. **State when you'd switch:** "If [condition changes], I'd move to Y."

**Example:**
"I chose WebSocket over REST for the MCP gateway.
REST would mean the client polls for tool results -- wasteful when tools take 2-10 seconds.
SSE is server-push only -- can't handle bidirectional tool dispatch.
WebSocket gives full duplex: client sends tool call, server pushes result when ready.
The tradeoff: WebSocket connections are stateful, so horizontal scaling needs sticky sessions.
If we hit 10K concurrent connections, I'd add Redis pub/sub for cross-server message routing."
""")

    elif sim_type == "Incident Response":
        st.subheader("Incident Response Framework")
        st.markdown("""
**The 5-step diagnostic (use this order every time):**

1. **SCOPE:** "What's affected? One user? All users? One service? All services?"
2. **TIMELINE:** "When did it start? What changed? Any deploys in the last 24 hours?"
3. **SYMPTOMS vs CAUSE:** "High latency is a symptom. What's CAUSING it?"
4. **HYPOTHESIZE:** "Top 3 hypotheses ranked by likelihood."
5. **TEST:** "How do I confirm/eliminate each hypothesis in under 2 minutes?"

**What NOT to do:**
- Don't restart the server first (destroys evidence)
- Don't blame external deps before checking internal (90% of incidents are self-inflicted)
- Don't fix the symptom before finding the cause (band-aid breaks later)
""")

    elif sim_type == "Code Review":
        st.subheader("Code Review Checklist")
        st.markdown("""
**Scan in this order (30 seconds per check):**

1. **BOUND:** Any `new Map()`, `[]`, `{}` without size limit?
2. **HONEST_STATUS:** Any `catch` block returning 2xx?
3. **NULL CHECK:** Any `.property` access without checking if object exists?
4. **AUTH:** Is there auth/validation before the business logic?
5. **TIMEOUT:** Any `await` without AbortController or timeout?
6. **SSRF:** Any `fetch(variable)` where the URL comes from user input?
7. **DETERMINISTIC:** Any `JSON.stringify` feeding into a hash or cache key?
8. **ERROR INFO:** Are errors logged with enough context to debug?

**How to give feedback:**
- Lead with the severity: "This is a P0 because..."
- Explain the CONSEQUENCE, not just the rule: "An agent calling this 1000x will OOM the server"
- Offer the fix, don't just point at the problem
- Thank them for what's good before listing what's wrong
""")

    section_quiz_button("Live Scenarios")
