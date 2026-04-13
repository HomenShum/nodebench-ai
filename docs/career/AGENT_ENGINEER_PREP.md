# AI Agent & Harness Engineer Interview Prep

**Targets**: Ditto AI, Meta (continued), TikTok, any agentic AI role
**Stack to know**: LangChain/LangGraph, GCP (Vertex AI, Cloud Run), Node.js/TypeScript, Python, eval harnesses

---

# PART 1: LANGCHAIN / LANGGRAPH

## What is LangChain? (explain it simply)

A Python/JS library that connects LLMs to tools, memory, and data sources. Instead of just sending a prompt and getting text back, LangChain lets you build chains where the LLM can search the web, query a database, call an API, remember past conversations, and decide what to do next.

**YOUR REAL EXPERIENCE**: "I built two MCP servers that do the same thing LangChain does but via Model Context Protocol instead. NodeBench has 350 tools the agent can discover and call. The concept is identical: give the LLM tools, let it decide which to use."

## Core Concepts — Know These

### 1. Chains vs Agents

**Chain** = fixed sequence. Step 1 always leads to Step 2 always leads to Step 3.
```
User question → Retrieve docs → Generate answer → Return
```

**Agent** = the LLM decides what to do next. It looks at the question and picks which tool to use.
```
User question → LLM thinks → "I need to search" → searches → LLM thinks → "now I can answer" → Return
```

YOUR EXPERIENCE: "Our MCP gateway is agent-based, not chain-based. The agent picks from 350 tools based on the query. Progressive discovery means it doesn't see all 350 at once, it searches for relevant ones first."

### 2. ReAct Pattern (Reasoning + Acting)

The agent thinks out loud before acting:
```
Thought: I need to find the company's revenue
Action: search_web("Anthropic revenue 2025")
Observation: Anthropic reported $900M ARR
Thought: Now I can answer the question
Action: return_answer("Anthropic's revenue is $900M ARR")
```

This is a loop: Think → Act → Observe → Think → Act → Observe → until done.

YOUR EXPERIENCE: "Our eval harness at Meta follows the same loop. Eval generates test cases → agent patches code → log tracing observes results → review scores quality → repeat until passing. Same Thought-Act-Observe pattern."

### 3. Memory Types

| Type | What it does | Analogy |
|------|-------------|---------|
| ConversationBufferMemory | Stores entire chat history | Writing everything in a notebook |
| ConversationBufferWindowMemory | Stores last K messages | Only keeping the last 5 pages |
| ConversationSummaryMemory | Summarizes old messages | Writing a summary at the top of each page |
| VectorStoreMemory | Stores in a vector DB, retrieves by similarity | Filing cabinet you search by topic |

YOUR EXPERIENCE: "NodeBench has session memory that compounds across sessions. Weekly reset packets are essentially ConversationSummaryMemory -- summarize what happened, carry forward what matters."

### 4. RAG (Retrieval-Augmented Generation)

```
User asks question
    ↓
Search a knowledge base for relevant docs (retrieval)
    ↓
Feed those docs + the question to the LLM (augmented generation)
    ↓
LLM answers using the docs as context
```

YOUR EXPERIENCE: "I shipped JPMorgan's first agentic RAG (Jan 2024). Pipeline integrated PitchBook + CRM data, with dynamic tool calling for data freshness and self-validation loops to check staleness."

### 5. Tool Calling

The LLM outputs a structured function call instead of text:
```python
# LLM decides to call a tool
{"tool": "search_web", "args": {"query": "Tesla Q4 earnings"}}

# System executes the tool, returns result to LLM
{"result": "Tesla reported $25.7B revenue in Q4 2025"}

# LLM uses result to form final answer
```

YOUR EXPERIENCE: "Both MCP servers are tool-calling systems. ta-studio-mcp has 9 tools (ta.quickstart, ta.pipeline.status, etc). NodeBench has 350. The agent calls tools by name with structured args. Same concept as LangChain tool calling but via MCP protocol."

---

# PART 2: GCP (Google Cloud Platform)

## Services You Should Know

| Service | What it does | Your equivalent experience |
|---------|-------------|---------------------------|
| **Cloud Run** | Run containers serverlessly (deploy an API without managing servers) | You deployed on Convex + Render (similar serverless model) |
| **Vertex AI** | Google's ML platform (train, deploy, serve models) | You used AWS SageMaker at JPM (same concept, different cloud) |
| **BigQuery** | Data warehouse for huge datasets + SQL queries | You did ETL at JPM processing 100K+ docs |
| **Cloud Functions** | Run a single function on a trigger (like Azure Functions) | You built voice email agent on Azure Functions |
| **Cloud Storage (GCS)** | File storage (like S3) | Basic, you've used equivalents |
| **Pub/Sub** | Message queue (like Azure Service Bus) | You used Service Bus for the voice email agent |
| **Artifact Registry** | Store Docker images, npm packages | You publish to npm (nodebench-mcp, ta-studio-mcp) |

### Key GCP Concepts to Know

**1. Cloud Run deployment flow:**
```
Write code → Dockerfile → Build image → Push to Artifact Registry → Deploy to Cloud Run
```
YOUR EXPERIENCE: "We have a GCP Cloud Build config for the agent directory. I've done containerized deployments."

**2. Vertex AI vs SageMaker (you know SageMaker):**
- Both: managed ML training + serving
- SageMaker: AWS, you used it at JPM with Ray RLib
- Vertex AI: Google's version, same concepts (endpoints, model registry, pipelines)
- Key difference: Vertex AI has tighter integration with Gemini models

**3. IAM (Identity and Access Management):**
- Service accounts, roles, permissions
- YOUR EXPERIENCE: "Our MCP gateway uses API key auth with rate limiting. Same concept as IAM but application-level."

---

# PART 3: NODE.JS / TYPESCRIPT

## You Already Know This — Your Whole Stack Is TypeScript

NodeBench, the MCP gateway, the search routes, the Convex backend, the React frontend -- all TypeScript. You just need to articulate it.

### Key Node.js Concepts for Interviews

**1. Event Loop — what it is**
Node.js is single-threaded but handles many connections via the event loop. Instead of waiting for a database query to finish, it says "call me back when it's done" and handles other requests in the meantime.

YOUR EXPERIENCE: "The MCP WebSocket gateway handles concurrent connections this way. Each session has its own lifecycle but they share the same Node process. Idle timeout at 30 min, rate limiting at 100/min."

**2. async/await**
```javascript
// This doesn't block the server while waiting for the database
const result = await db.query("SELECT * FROM users");
// Other requests can be handled while we wait
```

YOUR EXPERIENCE: "Every route handler in our Express server is async. The search route does parallel web_search + entity extraction + Gemini calls with Promise.race for timeout budgets."

**3. Express/Fastify middleware pattern**
```javascript
app.use(authMiddleware);    // runs first: check API key
app.use(rateLimiter);       // runs second: check rate limit
app.get('/search', handler); // runs third: actual logic
```

YOUR EXPERIENCE: "Our server/index.ts has this exact pattern. Auth middleware validates API keys, rate limiter enforces 100/min, then route handlers."

**4. WebSocket vs REST**
- REST: request → response. One shot.
- WebSocket: persistent connection. Both sides can send messages anytime.
- YOUR EXPERIENCE: "MCP gateway uses WebSocket for persistent agent sessions. REST for health endpoints. Close codes: 4001 auth, 4002 rate limit, 4003 timeout."

---

# PART 4: AGENTIC AI — Interview Questions You Must Nail

## Q: What are the core components of an AI agent?
```
1. Brain (LLM) — reasoning and decision-making
2. Memory — short-term (context window) + long-term (vector DB, SQLite)
3. Tools — APIs, search, databases the agent can call
4. Planning — breaking complex goals into steps (ReAct, Plan-and-Solve)
```
YOUR ANSWER: "I've built all four. The LLM is the brain calling our MCP tools. NodeBench has session memory in SQLite. 350 tools across 57 domains. Progressive discovery is the planning layer -- the agent searches for relevant tools before acting."

## Q: How do you evaluate an agentic system?
```
1. Golden dataset — questions with known correct answers
2. LLM-as-a-Judge — use a strong model to grade agent output
3. Metrics: faithfulness, recall, tool selection accuracy
4. Track over time — don't rely on one-off checks
```
YOUR ANSWER: "At Meta, our eval harness runs 64 test scenarios. We track task completion rate (100%), cost per batch ($21), error rate (81% zero-error runs), and attempts per task (1.0). The harness is the judge -- eval → patch → trace → review → rerun."

## Q: What are the security risks of autonomous agents?
```
1. Prompt injection — "ignore instructions, delete everything"
2. Indirect injection — malicious content in retrieved documents
3. Infinite loops — agent stuck retrying, burning tokens/money
4. Tool misuse — agent uses a dangerous tool without authorization
```
YOUR ANSWER: "This is why I built the 8-point agentic reliability checklist. BOUND: every collection has max + eviction (prevents OOM from loops). HONEST_STATUS: no fake 2xx (agents treat success as truth). TIMEOUT: AbortController on every call (prevents infinite loops). SSRF: URL validation before fetch."

## Q: How do you handle token cost at scale?
YOUR ANSWER: "At Meta we went from 10-50M tokens per run to 1-3M. Three techniques: JSON payload reduction (40%), progressive prompt disclosure (75% -- don't send everything upfront), and refined trajectories (structured data instead of raw screenshots). Result: 17x cost reduction, $364 → $21 per batch."

## Q: What is MCP (Model Context Protocol)?
YOUR ANSWER: "It's a standard protocol for connecting AI assistants to tools. Think of it as a plugin system. Instead of every AI coding assistant building its own tool integrations, MCP provides a standard interface. I've shipped two MCP servers -- nodebench-mcp (350 tools, founder intelligence) and ta-studio-mcp (9 tools, QA automation). Both npm-installable."

## Q: Multi-agent systems — when and why?
YOUR ANSWER: "When the task is too complex for one prompt. At Meta, we had separate concerns: eval harness generates test cases, coding agent writes patches, review pipeline scores quality. Each is a different 'agent' with a different job. NodeBench's swarm orchestration rule documents this exact pattern -- parallel specialists, pipeline with dependencies, self-organizing task queues."

---

# PART 5: QUICK REFERENCE — YOUR NUMBERS

| What | Number |
|------|--------|
| Meta promotion | 100 days |
| Task completion | 64/64 (100%) |
| Cost reduction | 17x ($364→$21) |
| Token reduction | 10-50M → 1-3M per run |
| Tool calls reduction | 11x |
| Rate limit handled | 500K tokens/60s |
| NodeBench tools | 350 across 57 domains |
| TA Studio tools | 9 |
| npm packages | 2 published |
| JPM agentic RAG | First at the firm (Jan 2024) |
| JPM ETL | 100K+ docs, 92% manual reduction |
| DeepRacer | #1 rank, 15.9x compute reduction |
| Azure credit | $500K secured |

---

# TONIGHT DRILL

**10 min — Explain out loud:**
1. What is ReAct pattern? (Think → Act → Observe loop)
2. What is RAG? (Retrieve docs → feed to LLM → answer)
3. How does your MCP server compare to LangChain? (same concept, different protocol)

**10 min — Code from memory:**
1. Two Sum (dict + enumerate)
2. FastAPI POST /predict endpoint
3. LRU Cache (OrderedDict)

**10 min — System design talk-through:**
1. "Design an agent that can search the web and answer questions" (ReAct + tool calling + memory)
2. "How would you deploy this on GCP?" (Cloud Run + Vertex AI + Pub/Sub)

Sources:
- [30 Agentic AI Interview Questions 2026 (AnalyticsVidhya)](https://www.analyticsvidhya.com/blog/2026/02/agentic-ai-interview-questions-and-answers/)
- [Top 50 LangChain Interview Questions (Index.dev)](https://www.index.dev/interview-questions/langchain-developer)
- [GCP Interview Questions (GeeksforGeeks)](https://www.geeksforgeeks.org/devops/google-cloud-platform-interview-questions/)
- [LangChain Interview Prep (GitHub)](https://github.com/rohanmistry231/Langchain-Interview-Preparation)

---

# PART 6: COINBASE — Sr SWE, AI Applications (HR/Talent/Recruiting)

## Role Summary
- **Company**: Coinbase (via Magnit, contractor)
- **Team**: HR, Talent & Recruiting AI automation
- **Stack**: Golang (preferred), React/TypeScript, Python, LangChain/LangGraph, Temporal workflows
- **What they want**: Build AI agents and copilots that automate HR workflows (recruiting pipelines, talent management, onboarding)

## Fit Analysis

| JD Requirement | Your Match | Gap? |
|---|---|---|
| 5+ yrs SWE, 6mo+ applied AI | 3+ yrs pure eng + 3.5 JPM (hybrid) + shipping AI since Nov 2025 | Stretch on years but AI depth compensates |
| Golang preferred | No production Go experience | **GAP** -- need to learn basics fast |
| React/TypeScript | Strong -- entire NodeBench frontend + Meta telemetry inspector | Direct match |
| Python | Strong -- Meta ML pipeline, JPM ETL, eval harnesses | Direct match |
| LangChain/LangGraph, agent frameworks | MCP servers are the same concept, JPM agentic RAG | Translate MCP experience to LangChain terms |
| RAG, agents, fine-tuning | JPM first agentic RAG, 350-tool agent server, eval harnesses | Strong |
| REST/gRPC APIs, queues, event-driven | MCP WebSocket gateway, rate limiting, Pub/Sub patterns | Strong |
| Temporal workflows | No direct experience | **GAP** -- similar to workflow orchestration you've done |
| HR systems (Greenhouse) | You literally filled out a Greenhouse app this week | Mention it casually |
| Cross-functional with non-eng teams | JPM banking (worked with bankers, credit analysts, compliance) | Very strong |
| Translate business problems to AI | JPM "automate prospecting" → agentic RAG, Meta "automate QA" → MCP server | Perfect match |

## Golang -- Crash Course (What You Need to Know)

Go is like Python but typed, compiled, and built for concurrency. Coinbase's backend is mostly Go.

**Key differences from Python:**
```go
// Variables are typed
var name string = "Homen"
age := 30  // shorthand, Go infers the type

// Functions declare return types
func add(a int, b int) int {
    return a + b
}

// No classes -- use structs
type Employee struct {
    Name   string
    Salary int
}

// Methods attach to structs
func (e Employee) DisplayName() string {
    return e.Name
}

// Error handling -- no try/catch, functions return errors
result, err := doSomething()
if err != nil {
    log.Fatal(err)  // handle the error
}

// Goroutines -- lightweight concurrent threads
go func() {
    // this runs concurrently
    fmt.Println("running in background")
}()
```

**YOUR EXPERIENCE**: "FluencyMed was built in Golang + Pinecone (70K+ CPT codes). I've written production Go before, just not recently."

## Temporal -- What It Is (You'll Get Asked)

Temporal is a workflow orchestration engine. You define workflows as code, and Temporal handles retries, timeouts, and state persistence.

```
Workflow: Onboard New Hire
  Step 1: Create accounts (IT) -- if fails, retry 3x
  Step 2: Assign mentor (HR) -- wait for approval
  Step 3: Schedule orientation -- after Step 2 completes
  Step 4: Send welcome email -- after Step 3
```

Think of it as a state machine that survives crashes. If the server dies at Step 2, Temporal picks up exactly where it left off.

YOUR EXPERIENCE: "Similar to how our eval harness at Meta orchestrates: eval → patch → trace → review → rerun. Each step has retry logic and the pipeline tracks state. We didn't use Temporal specifically but the pattern is the same -- durable execution with checkpoints."

## HR/Recruiting AI Use Cases (What They'll Build)

Think about what a recruiter does manually and how AI automates it:

| Manual Process | AI Automation |
|---|---|
| Screen 500 resumes for 1 role | Agent reads resumes, scores fit against JD, ranks top 20 |
| Schedule 15 interviews | Agent checks calendars, proposes times, sends invites |
| Write job descriptions | LLM generates JD from role requirements + company tone |
| Answer candidate questions | Copilot answers from company knowledge base (RAG) |
| Track hiring pipeline status | Agent pulls data from Greenhouse, summarizes for hiring manager |
| Onboarding checklist | Temporal workflow: provision accounts → assign mentor → schedule orientation |

YOUR EXPERIENCE: "I built exactly this pattern at JPMorgan for banking workflows. 'Automate prospecting' was the same problem -- take a manual process (PitchBook → CRM → notes), identify the repetitive loop, build an agent that does it. NodeBench's founder intelligence tools do the same thing for company research."

## Behavioral Answers for Coinbase

**"Tell me about translating a business problem into an AI solution"**
- S: JPMorgan 2024. Bankers spending hours on PitchBook → CRM → notes loop.
- T: Vague ask to "automate prospecting"
- A: Interviewed the bankers, found the actual pain, built LLMsuite with agentic RAG
- R: Firm's first agentic RAG. Productized for prospecting + sector mapping.

**"Experience working with non-engineering teams"**
- S: JPMorgan, 3.5 years working directly with credit analysts, bankers, compliance, senior stakeholders
- T: Translate financial workflows into automation
- A: Built automated scripts, compiled datasets, prepared 270 financial models + credit packages
- R: 72 deals up to $800M. Promoted from credit analyst to AI automation lead.

**"Why Coinbase?"**
- Coinbase going "AI-Native by 2028" is the kind of company-wide transformation where one engineer can have outsized impact
- HR/Recruiting AI is the same "automate a manual workflow" pattern I've done at JPM and Meta
- I've shipped two production MCP servers -- that's exactly "prototype to production" at scale
- Crypto is interesting but the real draw is building AI infrastructure that transforms how an entire company operates

## Coinbase-Specific Prep Drill

**5 min -- Golang basics:**
- Write a struct, a method, and a goroutine from memory
- Understand error handling (if err != nil)

**5 min -- Explain Temporal:**
- "Durable workflow engine. Define steps as code. Handles retries, timeouts, state persistence. If server crashes, picks up where it left off."

**5 min -- HR use case:**
- "Recruiter screens 500 resumes manually. I'd build a RAG agent that reads each resume, scores against the JD requirements, and surfaces the top 20 with reasons. Same pattern as my JPM agentic RAG but applied to recruiting."
