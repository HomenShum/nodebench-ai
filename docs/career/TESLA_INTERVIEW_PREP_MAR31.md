# Interview Prep — Updated April 2, 2026

## Active Opportunities
| Role | Company | Base Range | Status |
|------|---------|-----------|--------|
| **SWE, Ads Interface & Platform** | **TikTok GMPT** | **$156K-$317K + RSU** | Replied to Wallace, awaiting chat scheduling |
| Python Developer (ML) | Tesla via Collabera | Contract 6mo | Delayed, reschedule pending |
| Founding Engineer | $25M ARR startup via Joachim | $180-250K+ equity | Replied, awaiting response |
| Eng, agent orchestration | via Bryce Reading | $205-280K + equity | Replied, awaiting response |

## TikTok Ads Interface & Platform — What They Want
- **Python backend** with FastAPI/Flask/Django
- **RESTful APIs** — scalable, maintainable, secure
- **High-concurrency, low-latency** backend systems
- **Monetization product domains** — ads creation, delivery, measurement
- **Automation tools** to streamline operations
- YOUR MATCH: MCP gateway (WebSocket, auth, rate limiting), ta-studio-mcp (token-gated API), FastAPI endpoints, 500K tokens/60s rate handling

## Interview Format (TikTok typical)
- Online assessment: 2 problems, ~90 min
- Phone screen: review OA + role discussion
- Onsite: 3-5 rounds × 45 min (coding, system design, behavioral)
- **System design is a bigger deal at TikTok than Tesla** — expect "design an ads serving pipeline" or "design a rate limiter"

---

# PART 1: WHAT WE DRILLED (rapid fire Q&A session)

## Lesson 1: Two Sum — the foundational interview problem

**What it asks:** "Find two numbers in a list that add up to the target. Return their positions."

**The dumb way:** Check every pair. O(n²). Don't do this.

**The smart way:** As you scan each number, ask "have I already seen the number that would complete me?"

### Walkthrough with [3, 8, 5, 2], target = 10

```
See 3 → I need 10-3=7 → Is 7 in my notebook? No.  → Write down: {3: 0}
See 8 → I need 10-8=2 → Is 2 in my notebook? No.  → Write down: {3: 0, 8: 1}
See 5 → I need 10-5=5 → Is 5 in my notebook? No.  → Write down: {3: 0, 8: 1, 5: 2}
See 2 → I need 10-2=8 → Is 8 in my notebook? YES! → Return [1, 3]
```

The dict IS the notebook. Keys are numbers you've seen, values are where you saw them.

### enumerate — what it is

It numbers your list for you. That's all.

```python
colors = ["red", "blue", "green"]

for i, color in enumerate(colors):
    print(i, color)

# 0 red
# 1 blue
# 2 green
```

`i` = position, `color` = value. Without it you'd need a manual counter variable.

**When you need it:** Any time the problem says "return the INDEX." Two Sum needs indices, so you use enumerate.

### The code we built together

```python
def two_sum(nums, target):
    seen = {}                          # our notebook: {number: index}
    for i, n in enumerate(nums):       # i = position, n = the number
        complement = target - n        # what number would complete this pair?
        if complement in seen:         # have we seen it before?
            return [seen[complement], i]  # yes! return both positions
        seen[n] = i                    # no — write this number down for later
```

### Trace through [2, 7, 11, 15], target = 9

```
i=0, n=2:  complement = 9-2 = 7.  7 in {}? No.       seen = {2: 0}
i=1, n=7:  complement = 9-7 = 2.  2 in {2: 0}? YES!  Return [seen[2], 1] = [0, 1] ✓
```

Answer: [0, 1] because nums[0]=2 and nums[1]=7 add to 9.

**"What if there are multiple pairs?"** — In the standard interview version, there's exactly one solution. They tell you that. Always clarify: "Can I assume exactly one valid pair?" 99% of the time: yes.

---

## Lesson 2: Dicts — the cheat code for 60% of interview problems

A dict maps keys to values with O(1) lookup. When the problem asks "have I seen this before?" — the answer is always a dict.

### Creating and using

```python
d = {}                          # empty dict
d = {"a": 1, "b": 2}           # with values

d["c"] = 3                     # set a value
val = d["a"]                   # get a value (CRASHES if key missing)
val = d.get("z", 0)            # get with fallback (returns 0 if missing, never crashes)

if "a" in d:                   # check if key exists — O(1), instant
    print("found")
```

### .get() — the safe lookup

`.get(key, fallback)` means: "give me the value for this key, or the fallback if it's not there."

```python
counts = {"apple": 2, "banana": 1}

counts.get("apple", 0)     # → 2      (apple exists, return its value)
counts.get("banana", 0)    # → 1      (banana exists, return its value)
counts.get("mango", 0)     # → 0      (mango doesn't exist, return fallback)
counts.get("mango", -1)    # → -1     (you pick the fallback)
counts.get("mango")        # → None   (default fallback is None)

counts["mango"]            # → CRASH! KeyError — this is why .get() exists
```

### Counting pattern — you'll use this constantly

**The long way:**
```python
words = ["apple", "banana", "apple", "cherry", "banana", "apple"]
counts = {}

for word in words:
    if word in counts:       # seen this word before?
        counts[word] += 1    # yes → add 1
    else:
        counts[word] = 1     # no → start at 1

# counts = {"apple": 3, "banana": 2, "cherry": 1}
```

**The shortcut with .get():**
```python
counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1
```

How it works step by step:
- First "apple": `counts.get("apple", 0)` → `0` → `0 + 1 = 1` → `{"apple": 1}`
- Second "apple": `counts.get("apple", 0)` → `1` → `1 + 1 = 2` → `{"apple": 2}`
- Third "apple": `counts.get("apple", 0)` → `2` → `2 + 1 = 3` → `{"apple": 3}`

**The one-liner (Counter):**
```python
from collections import Counter
counts = Counter(words)   # → {"apple": 3, "banana": 2, "cherry": 1}
```

Use Counter in interviews unless they say "from scratch."

---

## Lesson 3: Collections you should know

```python
from collections import Counter, defaultdict, deque, OrderedDict

# Counter — count things in one line
Counter("balloon")          # → {'l': 2, 'o': 2, 'b': 1, 'a': 1, 'n': 1}
Counter([1, 1, 2, 3])      # → {1: 2, 2: 1, 3: 1}

# defaultdict — dict that auto-creates missing keys (no KeyError ever)
graph = defaultdict(list)
graph["A"].append("B")      # no crash even though "A" didn't exist yet

# deque — queue with O(1) add/remove from both ends
q = deque()
q.append(1)                 # add to right
q.appendleft(0)             # add to left
q.popleft()                 # remove from left (use this for BFS)

# OrderedDict — remembers insertion order + can reorder
od = OrderedDict()
od["a"] = 1
od["b"] = 2
od.move_to_end("a")         # move "a" to end
od.popitem(last=False)      # remove from front
```

---

# PART 2: CODING QUESTIONS — STEP BY STEP

## 1. Two Sum (covered above in Lesson 1)

## 2. Number of Islands — DFS explained like pouring paint

**Problem:** Grid of '1' (land) and '0' (water). Count islands. Connected '1's = one island.

```
grid = [
  ["1","1","0","0"],
  ["1","1","0","0"],
  ["0","0","1","0"],
  ["0","0","0","1"]
]
Answer: 3 islands
```

**Forget "DFS" as a concept. Think of it as pouring paint.**

You walk the grid left-to-right, top-to-bottom. When you step on land ('1'), you:
1. Say "found an island!" and add 1 to your count
2. Pour paint on it — the paint spreads to all connected land (up, down, left, right)
3. Every cell the paint touches turns from '1' to '0' (now it's "visited")
4. Keep walking. Skip anything that's already '0'

### Full walkthrough:

```
Starting grid:
1 1 0 0
1 1 0 0
0 0 1 0
0 0 0 1

Step 1: Walk to (0,0). It's "1" — ISLAND FOUND! count = 1
        Pour paint starting at (0,0):
          (0,0) is "1" → paint it → "0"
          spread right → (0,1) is "1" → paint it → "0"
          spread right → (0,2) is "0" → stop
          spread down from (0,0) → (1,0) is "1" → paint it → "0"
          spread down from (0,1) → (1,1) is "1" → paint it → "0"
          all neighbors of painted cells are "0" → paint stops

        Grid now:
        0 0 0 0
        0 0 0 0
        0 0 1 0
        0 0 0 1

Step 2: Keep walking. (0,1), (0,2)... (1,0), (1,1)... all "0". Skip.

Step 3: Walk to (2,2). It's "1" — ISLAND FOUND! count = 2
        Pour paint: (2,2) → "0". No connected "1"s.

Step 4: Walk to (3,3). It's "1" — ISLAND FOUND! count = 3
        Pour paint: (3,3) → "0".

Result: 3 islands ✓
```

**Why change '1' to '0'?** That's the "visited" marker. No separate visited set needed. Once painted, you'll never count it again.

### The paint-pouring function (this IS the DFS)

It does ONE thing: pour paint from a starting cell in all 4 directions.

```python
def pour_paint(grid, i, j):
    # Stop if: out of bounds OR water/already painted
    if i < 0 or j < 0:                      return  # above or left of grid
    if i >= len(grid) or j >= len(grid[0]):  return  # below or right of grid
    if grid[i][j] != '1':                    return  # water or already visited

    grid[i][j] = '0'          # paint this cell

    pour_paint(grid, i + 1, j)  # spread down
    pour_paint(grid, i - 1, j)  # spread up
    pour_paint(grid, i, j + 1)  # spread right
    pour_paint(grid, i, j - 1)  # spread left
```

Each call asks: "Am I on land?" If yes, paint it and spread. If no, stop. That's the entire function.

### The main function

```python
def num_islands(grid):
    count = 0
    for i in range(len(grid)):           # each row
        for j in range(len(grid[0])):    # each column
            if grid[i][j] == '1':        # found unpainted land!
                count += 1               # new island
                pour_paint(grid, i, j)   # paint the whole island
    return count
```

**What to say:** "I scan every cell. When I find an unvisited '1', that's a new island — count it, then flood-fill to mark all connected land as visited. O(m×n) time."

---

## 3. LRU Cache

**Problem:** Build a cache. When it's full, evict the item that was used LEAST recently.

Think of a shelf that holds 2 books. When you read a book, it goes to the right end. When you need room for a new book, you throw away the one on the far left (oldest).

```
Capacity = 2

put(1, "A")     shelf: [1:A]              
put(2, "B")     shelf: [1:A, 2:B]         full now
get(1)          shelf: [2:B, 1:A]         1 moves to right (just used it)
put(3, "C")     full! throw away leftmost (2:B)
                shelf: [1:A, 3:C]
```

OrderedDict = a dict that remembers order AND lets you move things around.
- Front = oldest (throw away first)
- End = newest (just used)

```python
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.cache = OrderedDict()
        self.cap = capacity

    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)    # just used it — move to end
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)  # updating = using it
        self.cache[key] = value
        if len(self.cache) > self.cap:
            self.cache.popitem(last=False)  # throw away from front (oldest)
```

YOUR REAL EXPERIENCE: "In our agentic reliability checklist, every in-memory collection must have MAX + eviction — BOUND rule. Unbounded maps crash in minutes under agent loops."

---

## 4. Reverse Linked List

### First: what IS a linked list?

A linked list is a chain of nodes. Each node is a tiny object with two things:

```python
class Node:
    def __init__(self, val):
        self.val = val      # the data (1, 2, 3...)
        self.next = None    # pointer to the next node in the chain
```

So `1 → 2 → 3 → None` is really:

```
Node(1)          Node(2)          Node(3)
val: 1           val: 2           val: 3
next: Node(2) →  next: Node(3) →  next: None
```

**`.next`** is just a property on the node — it holds the address of the next node. `None` means "end of chain."

**`curr`** is just a variable name (short for "current") that holds whichever node you're looking at right now. You could name it anything.

### The three variables

```python
prev = None      # the "done pile" — empty at start
curr = head      # the node we're currently processing (starts at first node)
# nxt gets created INSIDE the loop — it's temporary, just saves the next node
```

### Why this order matters

You need to do 4 things per node, IN THIS ORDER:

```
1. nxt = curr.next       # SAVE the rest of the chain (before you break the link)
2. curr.next = prev      # FLIP this node's pointer backward
3. prev = curr           # This node is now part of the done pile
4. curr = nxt            # Move forward to the saved next node
```

If you do step 2 before step 1: you lose the chain. `curr.next` used to point to the next node — once you overwrite it, that link is gone forever. So you MUST save it first.

### Full trace through 1 → 2 → 3 → None

```
BEFORE LOOP: prev = None, curr = Node(1)

--- LOOP PASS 1 (curr = Node(1)) ---
  1. nxt = curr.next           → nxt = Node(2)     [saved the chain]
  2. curr.next = prev          → Node(1).next = None [flipped! 1 now points at nothing]
  3. prev = curr               → prev = Node(1)     [1 is top of done pile]
  4. curr = nxt                → curr = Node(2)     [move forward]
  
  State: Done pile: 1→None    Remaining: 2→3→None

--- LOOP PASS 2 (curr = Node(2)) ---
  1. nxt = curr.next           → nxt = Node(3)
  2. curr.next = prev          → Node(2).next = Node(1) [2 now points backward at 1]
  3. prev = curr               → prev = Node(2)
  4. curr = nxt                → curr = Node(3)
  
  State: Done pile: 2→1→None  Remaining: 3→None

--- LOOP PASS 3 (curr = Node(3)) ---
  1. nxt = curr.next           → nxt = None
  2. curr.next = prev          → Node(3).next = Node(2) [3 now points backward at 2]
  3. prev = curr               → prev = Node(3)
  4. curr = nxt                → curr = None         [loop ends]
  
  State: Done pile: 3→2→1→None  ✓ Reversed!

AFTER LOOP: return prev = Node(3) = head of reversed list
```

### The code — same 4 steps wrapped in a while loop

```python
def reverse(head):
    prev = None       # done pile starts empty
    curr = head       # start at first node
    while curr:       # keep going until we run out of nodes
        nxt = curr.next      # 1. SAVE next before breaking link
        curr.next = prev     # 2. FLIP pointer backward
        prev = curr          # 3. ADD to done pile
        curr = nxt           # 4. MOVE forward
    return prev              # prev is the new head
```

**What to say in interview:** "I use three pointers: prev starts at None, curr starts at head. Each step I save curr.next, flip curr's pointer to prev, then advance both. O(n) time, O(1) space."

---

## 5. Move Zeros to Left

`[1, 0, 2, 0, 3]` → `[0, 0, 1, 2, 3]` (keep order of non-zeros)

Read from right. Copy non-zeros to the right end. Fill rest with zeros.

```python
def move_zeros_left(arr):
    write = len(arr) - 1
    for read in range(len(arr) - 1, -1, -1):  # read right to left
        if arr[read] != 0:
            arr[write] = arr[read]
            write -= 1
    while write >= 0:
        arr[write] = 0
        write -= 1
    return arr
```

---

## 6. Simplify Unix Path

`"/a/./b/../../c/"` → `"/c"`

Rules: `.` = current dir (ignore), `..` = go up (pop), extra `/` = ignore

```python
def simplify_path(path):
    stack = []
    for part in path.split('/'):
        if part == '..':
            if stack: stack.pop()     # go up
        elif part and part != '.':    # skip empty and "."
            stack.append(part)
    return '/' + '/'.join(stack)
```

---

## 7. Maximum Number of Balloons

"balloon" needs: b×1, a×1, l×2, o×2, n×1. Count letters, find the bottleneck.

```python
from collections import Counter

def max_balloons(text):
    c = Counter(text)
    return min(c['b'], c['a'], c['l'] // 2, c['o'] // 2, c['n'])
```

---

## 8. Shortest Path Between Tesla Chargers

Graph BFS with range constraint.

```python
from collections import deque

def shortest_path(graph, start, end, max_range=320):
    queue = deque([(start, [start])])
    visited = {start}
    while queue:
        node, path = queue.popleft()
        if node == end:
            return path
        for neighbor, dist in graph[node]:
            if neighbor not in visited and dist <= max_range:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))
    return None
```

---

## 9. FastAPI Endpoint — "API skills" per Priyan

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class PredictRequest(BaseModel):
    features: list[float]
    model_name: str = "default"

class PredictResponse(BaseModel):
    prediction: float
    confidence: float

@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    if not req.features:
        raise HTTPException(status_code=400, detail="Features list cannot be empty")
    prediction = sum(req.features) / len(req.features)
    return PredictResponse(prediction=prediction, confidence=0.95)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Status codes to know:** 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 429 Rate Limited, 500 Server Error

**YOUR REAL EXPERIENCE:** "I built the MCP WebSocket gateway — API key auth, rate limiting 100/min, idle timeout 30 min, health endpoints. Close codes: 4001 auth failure, 4002 rate limit, 4003 timeout."

---

## 10. API Design — REST endpoints for ML model serving

```
POST   /api/v1/predict          — Send features, get prediction
GET    /api/v1/models           — List deployed models
GET    /api/v1/models/{id}      — Model metadata + metrics
POST   /api/v1/models           — Deploy new model version
DELETE /api/v1/models/{id}      — Remove model
GET    /api/v1/health           — Health check
```

**Rate limiting:** Token bucket or sliding window. Return 429 with Retry-After header.
YOUR EXPERIENCE: "Handled 500K tokens/60s by JSON payload reduction 40% and progressive prompt disclosure 75%."

**Auth:** API key in header, JWT, OAuth2.
YOUR EXPERIENCE: "ta-studio-mcp uses token-gated auth — email-based generation, same email always returns same token, Convex validates."

---

## 11. ML Quick Questions

**Precision vs Recall:**
- Precision: "Of everything I flagged, how many were actually correct?" — TP / (TP + FP)
- Recall: "Of everything that was actually positive, how many did I catch?" — TP / (TP + FN)
- Tesla vehicle service: recall matters more — don't miss a defect
- YOUR EXPERIENCE: "At Ideaflow we tracked F1 in CI/CD with frozen golden datasets"

**Overfitting:**
- Training accuracy high, validation low = overfitting
- Fix: regularization, dropout, early stopping, more data, cross-validation

**Deploy ML to production:**
- Train → serialize (joblib/ONNX) → API (FastAPI) → containerize (Docker) → deploy → monitor
- YOUR EXPERIENCE: "At Meta: eval harness → coding agent patches → log tracing → review → rerun evaluation. 64/64 completion, 17x cost reduction."

**Model drift:**
- Data distribution changes over time → model degrades
- Monitor prediction distribution, retrain when metrics drop

---

# PART 3: BEHAVIORAL — STAR STORIES

### Tesla's Values
1. **Move Fast** — speed with purpose
2. **Think Like Owners** — take responsibility
3. **First Principles** — reason from ground truth
4. **Do the Impossible** — tackle big problems
5. **We Are All In** — mission over ego

### Story 1: 100-Day Sprint (HIGH STAKES + DEADLINE)
- S: Meta. Sole architect. AI QA platform for 350K+ manual test cases. 100-day timeline.
- T: Ship concept to production alone.
- A: Eval-driven workflow — eval harness generates test scenarios, coding agent writes patches, log tracing captures every step, review pipeline scores quality, rerun evaluation until passing. Integrated 10 internal infra systems.
- R: Promoted contractor → architect in 2 months. 64/64 task completion. 17x cost reduction ($364→$21). VP approval.

### Story 2: Token Compaction (LIMITED RESOURCES)
- S: Meta, first 30 days. Agent burning 10-50M tokens/run. OOM on telemetry.
- T: Make it cost-viable, no additional budget.
- A: Root cause: raw screenshots every step. Built compaction — structured trajectories instead of pixels. JSON reduction 40%, prompt disclosure 75%.
- R: 1-3M tokens instead of 10-50M. Tool calls 11x reduction. 81% zero-error runs.

### Story 3: Ambiguous → Shipped (BUSINESS PROBLEM)
- S: JPMorgan 2024. "Automate prospecting." No spec.
- T: Turn vague ask into a product.
- A: Interviewed bankers, found pain (PitchBook→CRM→notes loop). Built LLMsuite with agentic RAG, dynamic tool calling, self-validation.
- R: Firm's first agentic RAG (Jan 2024). Productized for prospecting + sector mapping.

### Story 4: Data Over Opinions (DISAGREEMENT)
- S: Meta. Raw screenshots vs compacted trajectories debate.
- T: Team assumed more data = better.
- A: Built both, ran same 64 tasks, compared cost + completion + error rate.
- R: Compaction 10-17x cheaper, same accuracy. Data won.

### Story 5: Beyond Role (OWNERSHIP)
- S: CosmaNeura. No cloud budget.
- T: Deploy 3 AI prototypes with zero funding.
- A: Personally secured $500K Azure credit. Built SOAP notes, ICD-10 code rec, patient screening.
- R: Full Azure deployment. 3 prototypes shipped.

### Why Tesla?
"Tesla solves ML at physical-world scale — vehicles, energy, manufacturing. The JD says heterogeneous datasets (text, voice, images, tabular) — I work with all four across my MCP servers. It says 'translate ambiguous business problems into ML solutions' — I did that at JPMorgan and at Meta. And I live in Fremont."

---

# NUMBERS CHEAT SHEET

| What | Number |
|------|--------|
| Meta promotion | 100 days |
| Task completion | 64/64 (100%) |
| Legacy couldn't start | 29 of those 64 |
| Cost per batch | $364 → $21 (17x) |
| Tool calls | 11x reduction |
| Tokens before | 10-50M per run |
| Tokens after | 1-3M per run |
| JSON reduction | 40% |
| Prompt disclosure | 75% reduction |
| Zero-error runs | 81% |
| Attempts per task | 5.0 → 1.0 |
| Systems integrated | 10 |
| Rate limit | 500K tokens/60s |
| JPM deals | 72, up to $800M |
| ETL docs | 100K+, 92% manual reduction |
| DeepRacer | #1, 15.9x compute reduction |
| Azure credit | $500K |

---

# TONIGHT: 30 MIN DRILL

**10 min — Code from memory:**
1. Two Sum (dict + enumerate)
2. LRU Cache (OrderedDict)
3. Reverse Linked List (prev/curr/nxt)

**10 min — API from memory:**
1. FastAPI POST /predict with Pydantic
2. List the HTTP status codes

**10 min — Talk out loud:**
1. Meta story in STAR, 2 min, hit: 100 days, 64/64, 17x, eval→patch→trace→review→rerun
2. "Why Tesla?" in 30 seconds
