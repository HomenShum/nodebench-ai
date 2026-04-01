# Tesla Python Developer Interview Prep — March 31, 2026

**Role**: Python Developer (ML focus) | **Client**: Tesla | **Via**: Collabera
**Format**: 2 rounds × 45 min — Round 1: Python coding + API | Round 2: Culture fit + behavioral

---

## PYTHON BUILDING BLOCKS — Know These Cold

### enumerate — what it does and when to use it

`enumerate` gives you BOTH the index AND the value when looping. Without it you'd need a separate counter variable.

```python
# WITHOUT enumerate (ugly, error-prone)
i = 0
for name in ["Alice", "Bob", "Carol"]:
    print(i, name)
    i += 1

# WITH enumerate (clean)
for i, name in enumerate(["Alice", "Bob", "Carol"]):
    print(i, name)
# Output: 0 Alice, 1 Bob, 2 Carol

# You can start from a different number
for i, name in enumerate(["Alice", "Bob"], start=1):
    print(i, name)
# Output: 1 Alice, 2 Bob
```

**When you need it in interviews:** Any time you need to track position while iterating. Two Sum uses it. Any "return the INDEX of..." question uses it.

**Mental model:** `enumerate(list)` → gives you `(index, value)` tuples. That's it.

---

### dict (hash map) — the most important interview tool

A dict maps keys to values with O(1) lookup. This is the answer to 60% of coding questions.

```python
# Creating
d = {}                          # empty
d = {"a": 1, "b": 2}           # with values

# Setting and getting
d["c"] = 3                     # set
val = d["a"]                   # get (crashes if key missing)
val = d.get("z", 0)            # get with default (returns 0 if missing, never crashes)

# Checking if key exists
if "a" in d:                   # O(1) lookup — this is why dicts are powerful
    print("found")

# Looping
for key in d:                  # just keys
for key, val in d.items():     # keys and values
```

**The pattern that solves most interview problems:**
"Have I seen this value before?" → Use a dict.
- Two Sum: "Have I seen the complement before?"
- Frequency count: "How many times has each character appeared?"
- Deduplication: "Have I visited this node before?"

---

### Collections you should know

```python
from collections import Counter, defaultdict, deque, OrderedDict

# Counter — count occurrences in one line
Counter("balloon")  # → {'l': 2, 'o': 2, 'b': 1, 'a': 1, 'n': 1}
Counter([1,1,2,3])  # → {1: 2, 2: 1, 3: 1}

# defaultdict — dict that auto-creates missing keys
graph = defaultdict(list)
graph["A"].append("B")  # no KeyError even though "A" didn't exist yet

# deque — double-ended queue, O(1) append/pop from both ends
q = deque()
q.append(1)       # add to right
q.appendleft(0)   # add to left
q.pop()           # remove from right
q.popleft()       # remove from left
# USE FOR: BFS (queue), sliding window

# OrderedDict — dict that remembers insertion order (used in LRU Cache)
od = OrderedDict()
od["a"] = 1
od["b"] = 2
od.move_to_end("a")      # move "a" to end (most recently used)
od.popitem(last=False)    # remove from front (least recently used)
```

---

### Sorting — know this for interviews

```python
# Basic
sorted([3, 1, 2])                    # → [1, 2, 3] (returns new list)
[3, 1, 2].sort()                     # sorts in-place, returns None

# Sort by custom key
sorted(["banana", "apple", "cherry"], key=len)         # by length
sorted([(1, 'b'), (2, 'a')], key=lambda x: x[1])      # by second element

# Reverse
sorted([3, 1, 2], reverse=True)      # → [3, 2, 1]
```

---

## CODING QUESTIONS — EXPLAINED STEP BY STEP

### 1. Two Sum

**Problem:** Given array `nums` and integer `target`, return indices of two numbers that add to target.
Example: `nums = [2, 7, 11, 15], target = 9` → `[0, 1]` because 2 + 7 = 9

**Why the dict approach works:**

For each number, we need to find if its "complement" (target - number) exists somewhere in the array. We COULD check every pair (O(n²)), but a dict lets us check in O(1).

Walk through the example:
```
nums = [2, 7, 11, 15], target = 9
seen = {}

i=0, n=2:  complement = 9-2 = 7.  Is 7 in seen? No.   Store {2: 0}
i=1, n=7:  complement = 9-7 = 2.  Is 2 in seen? YES!  Return [seen[2], 1] = [0, 1]
```

**Code:**
```python
def two_sum(nums, target):
    seen = {}  # value → index
    for i, n in enumerate(nums):     # i = index, n = value
        complement = target - n
        if complement in seen:       # O(1) dict lookup
            return [seen[complement], i]
        seen[n] = i                  # remember this value's index
    return []
```

**What to say in interview:** "I use a hash map to store each number's index as I scan. For each new number, I check if its complement already exists in the map. This gives O(n) time and O(n) space."

---

### 2. Number of Islands — DFS EXPLAINED

**Problem:** Given a 2D grid of '1' (land) and '0' (water), count the number of islands. An island is a group of '1's connected horizontally or vertically.

```
grid = [
  ["1","1","0","0"],
  ["1","1","0","0"],
  ["0","0","1","0"],
  ["0","0","0","1"]
]
Answer: 3 islands
```

**The confusion with DFS:** The trick is understanding that DFS here is NOT about finding a path. It's about **marking visited territory**. Think of it like pouring paint.

**Step by step — imagine you're walking the grid left-to-right, top-to-bottom:**

```
Step 1: Visit (0,0). It's a "1" — ISLAND FOUND! (count = 1)
        Now "pour paint" on this entire island by DFS:
        - (0,0) → mark as "0" (visited)
        - go right → (0,1) is "1" → mark as "0"
        - go right → (0,2) is "0" → stop this direction
        - go down from (0,0) → (1,0) is "1" → mark as "0"
        - go down from (0,1) → (1,1) is "1" → mark as "0"
        - ...keep going until no more connected "1"s

        After paint: entire top-left island is now all "0"s

Step 2: Continue scanning. (0,1), (0,2), (0,3), (1,0), (1,1)... all "0" now. Skip.

Step 3: Visit (2,2). It's a "1" — ISLAND FOUND! (count = 2)
        Pour paint: mark (2,2) as "0". No connected "1"s adjacent.

Step 4: Visit (3,3). It's a "1" — ISLAND FOUND! (count = 3)
        Pour paint: mark (3,3) as "0".

Result: 3 islands
```

**Why we change "1" to "0":** That IS our "visited" marker. Instead of keeping a separate visited set, we modify the grid. Each "1" we visit gets changed to "0" so we never count it twice.

**The DFS function — it only does one thing: pour paint on connected land**
```python
def dfs(grid, i, j):
    # Stop conditions: out of bounds OR water
    if i < 0 or j < 0:                    return  # above or left of grid
    if i >= len(grid) or j >= len(grid[0]): return  # below or right of grid
    if grid[i][j] != '1':                  return  # water or already visited

    # Mark this cell as visited
    grid[i][j] = '0'

    # Pour paint in all 4 directions
    dfs(grid, i + 1, j)  # down
    dfs(grid, i - 1, j)  # up
    dfs(grid, i, j + 1)  # right
    dfs(grid, i, j - 1)  # left
```

**The main function — scan grid, call DFS when you find unvisited land**
```python
def num_islands(grid):
    count = 0
    for i in range(len(grid)):           # each row
        for j in range(len(grid[0])):    # each column
            if grid[i][j] == '1':        # found unvisited land!
                count += 1               # new island
                dfs(grid, i, j)          # pour paint on entire island
    return count
```

**What to say in interview:** "I scan every cell. When I find an unvisited '1', that's a new island — I increment the count and then DFS to mark the entire connected island as visited by flipping '1's to '0's. This ensures I never double-count. O(m×n) time and space."

---

### 3. LRU Cache

**Problem:** Design a cache that evicts the Least Recently Used item when full.
- `get(key)` → return value if exists, -1 if not. Marks as recently used.
- `put(key, value)` → insert or update. If full, evict LRU item first.

**Why OrderedDict:** It's a dict that remembers insertion order AND lets you move items to the end. The front = oldest (LRU), the end = newest (MRU).

```
Capacity = 2

put(1, "A")     cache: [1:A]              1 is newest
put(2, "B")     cache: [1:A, 2:B]         2 is newest, 1 is oldest
get(1)          cache: [2:B, 1:A]         1 moves to end (just used)
put(3, "C")     cache is full!
                evict front (2:B = least recently used)
                cache: [1:A, 3:C]
```

```python
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.cache = OrderedDict()
        self.cap = capacity

    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)  # mark as recently used
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)  # update = recently used
        self.cache[key] = value
        if len(self.cache) > self.cap:
            self.cache.popitem(last=False)  # evict from FRONT (oldest)
```

**What to say in interview:** "OrderedDict gives me O(1) for all operations. The front is the least recently used, the end is the most recently used. On get, I move to end. On put, if over capacity, I pop from the front."

**YOUR REAL EXPERIENCE:** "In our agentic reliability checklist, every in-memory collection must have a MAX size plus an eviction policy — BOUND rule. LRU is one pattern. This prevents OOM when agents loop — unbounded maps can crash in minutes under agent loops."

---

### 4. Reverse Linked List

**Problem:** Reverse a singly linked list. `1→2→3→4` becomes `4→3→2→1`

**Think of it as picking up cards one at a time and putting each on top of a new pile:**

```
Original: 1 → 2 → 3 → None

Step 1: Pick up 1. New pile: 1 → None.  Remaining: 2 → 3 → None
Step 2: Pick up 2. Put on top. New pile: 2 → 1 → None.  Remaining: 3 → None
Step 3: Pick up 3. Put on top. New pile: 3 → 2 → 1 → None.  Done!
```

**The three pointers:**
- `prev` = the new pile (starts as None)
- `curr` = the card we're picking up
- `nxt` = save the next card before we detach curr

```python
def reverse(head):
    prev = None      # new pile starts empty
    curr = head      # start with first card
    while curr:
        nxt = curr.next     # save next card BEFORE we detach
        curr.next = prev    # point current card backward (onto the pile)
        prev = curr         # current card is now top of pile
        curr = nxt          # move to next card
    return prev             # prev is the new head
```

---

### 5. Move Zeros to Left

**Problem:** `[1, 0, 2, 0, 3]` → `[0, 0, 1, 2, 3]` (maintain order of non-zeros)

**Approach:** Read from right to left. Copy non-zeros to the right end. Fill remaining with zeros.

```python
def move_zeros_left(arr):
    write = len(arr) - 1                    # start writing from the end
    for read in range(len(arr) - 1, -1, -1):  # read right to left
        if arr[read] != 0:
            arr[write] = arr[read]
            write -= 1
    while write >= 0:                       # fill remaining spots with 0
        arr[write] = 0
        write -= 1
    return arr
```

---

### 6. Simplify Unix Path

**Problem:** `"/a/./b/../../c/"` → `"/c"`

**Rules:** `.` means current dir (ignore). `..` means go up (pop). Multiple `/` are same as one.

**Use a stack:**
```python
def simplify_path(path):
    stack = []
    for part in path.split('/'):     # split "/a/./b/../../c" → ["", "a", ".", "b", "..", "..", "c"]
        if part == '..':
            if stack: stack.pop()    # go up one directory
        elif part and part != '.':   # ignore empty strings and "."
            stack.append(part)
    return '/' + '/'.join(stack)     # rebuild: ["c"] → "/c"
```

---

### 7. Maximum Number of Balloons

**Problem:** Given string `text`, how many times can you spell "balloon"?

**Key insight:** "balloon" has: b×1, a×1, l×2, o×2, n×1. Count each letter and find the bottleneck.

```python
from collections import Counter

def max_balloons(text):
    c = Counter(text)
    # min of: how many b's, a's, pairs of l's, pairs of o's, n's
    return min(c['b'], c['a'], c['l'] // 2, c['o'] // 2, c['n'])
```

---

### 8. FastAPI Endpoint — Know This for "API Skills"

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

# Pydantic model = automatic validation. If client sends wrong type, FastAPI returns 422.
class PredictRequest(BaseModel):
    features: list[float]       # must be list of numbers
    model_name: str = "default" # optional with default

class PredictResponse(BaseModel):
    prediction: float
    confidence: float

@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    if not req.features:
        raise HTTPException(status_code=400, detail="Features list cannot be empty")

    # In real code: model = joblib.load("model.pkl"); pred = model.predict(...)
    prediction = sum(req.features) / len(req.features)  # placeholder
    return PredictResponse(prediction=prediction, confidence=0.95)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

**What to say about API design:**
- Status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 429 Rate Limited, 500 Server Error
- Always validate input (Pydantic does this automatically)
- Always have a /health endpoint
- Version your API: `/api/v1/predict`

**YOUR REAL EXPERIENCE:** "I built the MCP WebSocket gateway — API key auth, rate limiting at 100/min, idle timeout at 30 min, health endpoints. Close code 4001 for auth failure, 4002 for rate limit, 4003 for timeout. Also published ta-studio-mcp with token-gated auth — email-based token generation via Convex backend."

---

## ROUND 2: BEHAVIORAL — STAR STORIES

### Your 5 Best Stories

**Story 1: 100-Day Sprint (HIGH STAKES + DEADLINE)**
- S: Meta. Sole architect. Build AI QA platform for 350K+ manual test cases. 100-day timeline.
- T: Ship concept to production alone.
- A: Eval-driven workflow — eval harness generates test scenarios, coding agent writes patches, log tracing captures every step, review pipeline scores quality, rerun evaluation until passing. Integrated 10 internal infra systems.
- R: Promoted contractor → architect in 2 months. 64/64 task completion. 17x cost reduction ($364→$21). VP approval. Launched March 2.

**Story 2: Token Compaction (SOLVING WITH LIMITED RESOURCES)**
- S: Meta, first 30 days. Agent burning 10-50M tokens/run. OOM errors on telemetry dashboard.
- T: Make it cost-viable with no additional budget.
- A: Root cause: raw screenshots fed every step. Built compaction — structured trajectories instead of raw pixels. JSON payload reduction 40%, prompt disclosure 75%.
- R: 1-3M tokens instead of 10-50M. Same steps. Tool calls reduced 11x. 81% zero-error runs.

**Story 3: Ambiguous → Shipped (TRANSLATING BUSINESS PROBLEM)**
- S: JPMorgan 2024. Vague ask: "automate prospecting."
- T: Turn ambiguity into a product with no spec.
- A: Interviewed bankers to find actual pain (PitchBook→CRM→notes loop). Built LLMsuite with agentic RAG, dynamic tool calling, self-validation loops.
- R: Demoed firm's first agentic RAG (Jan 2024). Productized for sector mapping, prospecting, note-taking.

**Story 4: Disagreement (DATA OVER OPINIONS)**
- S: Meta. Debate: raw screenshots vs compacted trajectories.
- T: Team assumed more data = better.
- A: Built both, ran same 64 tasks, compared token cost + completion rate + error rate.
- R: Data showed compaction was 10-17x cheaper with same accuracy. Adopted as standard.

**Story 5: Ownership (TOOK RESPONSIBILITY BEYOND ROLE)**
- S: CosmaNeura startup. No cloud budget. No infra.
- T: Deploy 3 AI prototypes with zero funding.
- A: Personally secured $500K Azure credit sponsorship. Built GPT-4 SOAP notes, ICD-10 code rec via vector search, multilingual patient screening.
- R: Full Azure deployment. 3 production prototypes shipped.

### Why Tesla?

"Tesla solves ML at physical-world scale — vehicles, energy, manufacturing. The JD mentions heterogeneous datasets — text, voice, images, tabular — that's exactly what I work with across my two MCP servers. It says 'translate ambiguous business problems into ML solutions' — I've done that twice: at JPMorgan turning a vague 'automate prospecting' ask into an agentic RAG product, and at Meta turning 'automate QA' into a production MCP server. And I'm in Fremont — literally down the street."

---

## NUMBERS CHEAT SHEET

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

## TONIGHT: 30 MIN DRILL

**10 min — Code from memory:**
1. Two Sum (dict + enumerate)
2. LRU Cache (OrderedDict)
3. Reverse Linked List (prev/curr/nxt)

**10 min — API from memory:**
1. FastAPI POST /predict with Pydantic model
2. List the HTTP status codes (200, 400, 401, 404, 429, 500)

**10 min — Talk out loud:**
1. Meta story in STAR, 2 min, hit: 100 days, 64/64, 17x, eval→patch→trace→review→rerun
2. "Why Tesla?" in 30 seconds
