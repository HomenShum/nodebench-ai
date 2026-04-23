# NodeBench Universal Research API

## Overview

NodeBench is a universal research runtime for adaptive, evidence-backed synthesis across companies, people, events, topics, repositories, documents, markets, regulations, and other subjects.

This replaces job-specific research with a **universal primitive**: `research.run`.

## Core Concepts

- **Goal**: What the user is trying to achieve (prepare, monitor, analyze, compare, decide)
- **Subjects**: The things being researched (email, person, company, event, topic, repo, document, URL, text)
- **Facets**: Inferred scenario labels (job_prep, event_context, company_diligence, etc.)
- **Angles**: Research branches (entity_profile, public_signals, funding_intelligence, etc.)
- **Artifacts**: Outputs of angle subgraphs
- **Evidence**: Claims with provenance/confidence
- **Deliverables**: Rendered outputs (compact_alert, notion_markdown, executive_brief, etc.)

## Quick Start

### 1. Start a Research Run

```bash
curl -X POST https://api.nodebench.com/v1/research/runs \
  -H "Authorization: Bearer $NODEBENCH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "goal": {
      "objective": "prepare for interview",
      "mode": "prepare"
    },
    "subjects": [
      {
        "type": "email",
        "raw": {
          "subject": "Interview Request from Stripe",
          "from_name": "Sarah Chen",
          "from_email": "sarah@stripe.com",
          "body_text": "..."
        }
      }
    ],
    "preset": "job_inbound_v1",
    "depth": "standard",
    "deliverables": ["compact_alert", "notion_markdown"]
  }'
```

### Response

```json
{
  "run_id": "run_1745271234567_abcd",
  "status": "completed",
  "inferred_facets": ["job_prep", "company_diligence"],
  "selected_angles": [
    { "angle_id": "entity_profile", "mode": "reuse", "score": 0.95 },
    { "angle_id": "public_signals", "mode": "compute", "score": 0.87 },
    { "angle_id": "funding_intelligence", "mode": "reuse", "score": 0.82 }
  ],
  "outputs": {
    "briefing": {
      "act_1": "Stripe interview opportunity from Sarah Chen, VP Engineering",
      "act_2": "Stripe: payments infrastructure leader, $95B valuation, 8K+ employees",
      "act_3": "Prepare questions about infrastructure scaling and engineering culture"
    },
    "prep": {
      "why_now": "Stripe expanding platform team, recent leadership hires",
      "talking_points": [
        "Founded 2010, IPO 2021",
        "Key people: Patrick/John Collison",
        "Engineering-first culture, high autonomy"
      ],
      "questions": [
        "How does this role fit into platform expansion?",
        "What are current scaling challenges?"
      ],
      "risks": ["Competitive hiring market"],
      "next_actions": ["Review Stripe Atlas recent updates"]
    },
    "rendered": {
      "compact_alert": "Stripe interview: VP Eng Sarah Chen. Engineering-first culture. Recent hires from Google/Meta. Ask about scaling challenges.",
      "notion_markdown": "# Research Brief\n\n## Stripe..."
    }
  },
  "resources": {
    "reused": ["nodebench://entity/company/stripe"],
    "refreshed": [],
    "emitted": [
      "nodebench://angle/entity_profile/company/stripe",
      "nodebench://angle/public_signals/company/stripe"
    ]
  },
  "trace": {
    "depth": "standard",
    "cache_hit_ratio": 0.67,
    "latency_ms": 8923
  }
}
```

## API Reference

### POST /v1/research/runs

Start a new research run.

**Request Body:**

```typescript
{
  preset?: string;                    // Optional: job_inbound_v1, event_prep_v1, etc.
  goal: {
    objective: string;                // Free text description
    mode: "auto" | "analyze" | "prepare" | "monitor" | "compare" | "decision_support" | "summarize";
    decision_type?: "auto" | "job" | "event" | "vendor" | "customer" | "market" | "founder" | "topic" | "regulatory" | "technical" | "investment";
  };
  subjects: Array<{
    type: "email" | "person" | "company" | "event" | "topic" | "repo" | "document" | "url" | "text";
    id?: string;
    name?: string;
    url?: string;
    raw?: Record<string, any>;
    hints?: string[];
  }>;
  angle_strategy?: "auto" | "explicit" | "preset_bias" | "preset_only";
  angles?: string[];                  // Explicit angles if strategy = "explicit"
  depth: "quick" | "standard" | "comprehensive" | "exhaustive";
  constraints?: {
    freshness_days?: number;          // Default: 30
    latency_budget_ms?: number;       // Default: 12000
    prefer_cache?: boolean;             // Default: true
    max_external_calls?: number;        // Default: 12
    evidence_min_sources_per_major_claim?: number;  // Default: 2
  };
  deliverables: Array<"json_full" | "compact_alert" | "ntfy_brief" | "notion_markdown" | "executive_brief" | "dossier_markdown" | "email_digest" | "ui_card_bundle">;
  context?: Record<string, any>;
}
```

**Response:**

- `quick`/`standard`: synchronous JSON response
- `comprehensive`/`exhaustive`: may return `202 Accepted` with polling URL

### GET /v1/research/runs/{run_id}

Get status and results of a research run.

### GET /v1/angles/catalog

List all available research angles and presets.

## Presets

Presets are optional biases, not the top-level abstraction:

| Preset | Use Case | Default Angles |
|--------|----------|----------------|
| `job_inbound_v1` | Job interview prep | entity_profile, public_signals, funding, people_graph, narrative, exec_brief |
| `event_prep_v1` | Demo days, conferences | entity_profile, public_signals, people_graph, world_monitor |
| `founder_diligence_v1` | Startup due diligence | all angles including deep_research |
| `sales_account_prep_v1` | Enterprise sales | entity_profile, signals, funding, people, competitive |
| `vendor_eval_v1` | Vendor evaluation | entity_profile, github, regulatory, competitive |
| `market_map_v1` | Market analysis | competitive, market_dynamics, funding, narrative |
| `daily_monitor_v1` | Daily watchlist | daily_brief, signals, world_monitor |
| `topic_deep_dive_v1` | Deep research | narrative, docs, academic, github, deep_research |

## Angles (Research Branches)

Each angle is a reusable subgraph with a strict contract:

| Angle | Supports | Good For | Cost | Freshness |
|-------|----------|----------|------|-----------|
| `entity_profile` | company, person, product, repo | prep, diligence, comparison | low | medium |
| `public_signals` | company, person, event, topic | prep, monitoring, alert | medium | high |
| `funding_intelligence` | company | diligence, decision, prep | low | high |
| `financial_health` | company | diligence, decision | medium | critical |
| `narrative_tracking` | company, person, topic | monitoring, diligence | medium | medium |
| `people_graph` | company, person | prep, diligence | medium | high |
| `competitive_intelligence` | company, product | diligence, comparison | medium | medium |
| `github_ecosystem` | company, person, repo | diligence, comparison | low | high |
| `executive_brief` | company, person, event | prep, decision | medium | high |
| `daily_brief` | company, person, event, topic | monitoring, alert | low | critical |
| `deep_research` | company, person, topic | diligence, decision | high | medium |
| `regulatory_monitoring` | company, topic, product | diligence, monitoring | high | high |
| `patent_intelligence` | company, person, product | diligence, comparison | high | medium |
| `academic_research` | person, topic, product | diligence, prep | medium | low |
| `market_dynamics` | company, topic, product | diligence, decision | medium | medium |
| `document_discovery` | company, person, topic | diligence, prep, decision | high | low |
| `world_monitor` | company, person, event | monitoring, prep | medium | high |

## Depth Levels

| Depth | Typical Latency | Use Case |
|-------|-----------------|----------|
| `quick` | 3-5s | Alerts, notifications |
| `standard` | 8-15s | Normal prep, most use cases |
| `comprehensive` | 15-30s | High-stakes decisions |
| `exhaustive` | 30-60s+ | Full due diligence |

## MCP Integration

NodeBench exposes MCP tools for AI assistants:

### Tools

- `nodebench.research_run` - Main orchestration tool
- `nodebench.expand_subject` - Single subject resolution
- `nodebench.render_output` - Format existing briefs
- `nodebench.refresh_resource` - Update stale artifacts

### Resources

- `nodebench://entity/company/{id}`
- `nodebench://entity/person/{id}`
- `nodebench://angle/{angle_id}/{subject_type}/{subject_id}`
- `nodebench://brief/{brief_id}`

### Prompts

- `research-anything` - General research workflow
- `prepare-brief` - Generate talking points
- `compare-subjects` - Multi-subject comparison
- `monitor-topic` - Ongoing monitoring
- `compact-alert` - Shrink to notification size

## Pipedream Integration

See `pipedream-integration.js` for a complete pipeline that:

1. Receives Gmail trigger
2. Triage with Gemini (lightweight classification)
3. Research with NodeBench (deep enrichment)
4. Notify via ntfy (compact alert)
5. Persist to Notion (full brief)

## Architecture

The system uses a **deterministic outer graph** with **agentic inner routing**:

```
Input → Normalize → Resolve Entities → Infer Facets → Load Catalog → Plan Angles
                                                                            ↓
Render ← Synthesize ← Fuse Evidence ← Collect ← Dispatch Angles ← Gate Cost
                                                                            ↓
                                                                      Persist → Output
```

Each angle is implemented as a reusable subgraph with a strict input/output contract.

## Best Practices

1. **Prefer presets only as bias** - They override defaults but don't constrain the planner
2. **Use `auto` liberally** - Let NodeBench infer the right angles
3. **Check `trace.cache_hit_ratio`** - Higher is better (more reuse)
4. **Respect `latency_budget_ms`** - System will gracefully degrade if exceeded
5. **Use `prefer_cache: true`** - Reduces cost and improves consistency
6. **Parse `inferred_facets`** - Understand what scenario was detected

## Examples

### Job Interview Prep

```javascript
const research = await fetch(`${API_BASE}/v1/research/runs`, {
  method: "POST",
  headers: { Authorization: `Bearer ${API_KEY}` },
  body: JSON.stringify({
    preset: "job_inbound_v1",
    goal: { objective: "prepare for interview", mode: "prepare" },
    subjects: [
      { type: "company", name: "Stripe" },
      { type: "person", name: "Sarah Chen" }
    ],
    depth: "comprehensive",
    deliverables: ["compact_alert", "notion_markdown"]
  })
});
```

### Event Prep

```javascript
const research = await fetch(`${API_BASE}/v1/research/runs`, {
  method: "POST",
  headers: { Authorization: `Bearer ${API_KEY}` },
  body: JSON.stringify({
    preset: "event_prep_v1",
    goal: { objective: "prepare for demo day", mode: "prepare" },
    subjects: [
      { type: "event", url: "https://lu.ma/shipdemoday" }
    ],
    depth: "standard",
    deliverables: ["compact_alert"]
  })
});
```

### Topic Monitoring

```javascript
const research = await fetch(`${API_BASE}/v1/research/runs`, {
  method: "POST",
  headers: { Authorization: `Bearer ${API_KEY}` },
  body: JSON.stringify({
    goal: { objective: "monitor AI regulation developments", mode: "monitor" },
    subjects: [
      { type: "topic", name: "AI regulation" }
    ],
    depth: "quick",
    angle_strategy: "auto",
    deliverables: ["compact_alert"],
    constraints: { freshness_days: 7 }
  })
});
```

## Support

- API issues: api@nodebench.com
- Documentation: https://docs.nodebench.com
- Status: https://status.nodebench.com
