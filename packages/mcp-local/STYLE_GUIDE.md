# NodeBench MCP Style Guide

Based on OpenClaw patterns and industry best practices for autonomous agent systems.

---

## Directory Organization

### Root Structure

```
packages/mcp-local/
├── src/
│   ├── tools/           # MCP tool implementations (grouped by domain)
│   ├── __tests__/       # Test files mirror src/ structure
│   ├── db.ts            # Database initialization
│   ├── types.ts         # Shared TypeScript types
│   └── index.ts         # Entry point, tool registration
├── skills/              # Portable agent skills (SKILL.md format)
├── templates/           # Infrastructure scaffolding templates
├── docs/
│   ├── AGENTS.md        # Agent operating instructions
│   ├── TOOLS.md         # Tool catalog with examples
│   └── SOUL.md          # Agent personality/values
├── STYLE_GUIDE.md       # This file
├── NODEBENCH_AGENTS.md  # Public-ready agent protocol
├── package.json
├── tsconfig.json
└── README.md
```

### Tool File Organization

Each domain gets its own file in `src/tools/`:

```
src/tools/
├── verificationTools.ts    # 6-phase verification cycle
├── evalTools.ts            # Eval-driven development
├── qualityGateTools.ts     # Boolean check gates
├── learningTools.ts        # Persistent knowledge base
├── flywheelTools.ts        # AI Flywheel orchestration
├── reconTools.ts           # Research & discovery
├── uiCaptureTools.ts       # Screenshot capture
├── visionTools.ts          # AI vision analysis
├── webTools.ts             # Web search & fetch
├── githubTools.ts          # GitHub API tools
├── documentationTools.ts   # AGENTS.md maintenance
├── agentBootstrapTools.ts  # Self-discovery & implementation
└── metaTools.ts            # Tool discovery & methodology
```

---

## Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| Tool modules | `{domain}Tools.ts` | `verificationTools.ts` |
| Query files | `{domain}Queries.ts` | `agentLoopQueries.ts` |
| Action files | `{domain}Actions.ts` | `postingActions.ts` |
| Schema files | `schema.ts` | `schema.ts` |
| Test files | `{module}.test.ts` | `tools.test.ts` |

### Functions

| Type | Convention | Example |
|------|------------|---------|
| MCP tool handlers | `camelCase` verb | `discoverInfrastructure` |
| Internal helpers | `_camelCase` | `_buildSourceCitation` |
| Type guards | `is{Type}` | `isVerificationResult` |
| Factory functions | `create{Thing}` | `createMetaTools` |

### Types

| Type | Convention | Example |
|------|------------|---------|
| Interfaces | `PascalCase` | `VerificationStep` |
| Type aliases | `PascalCase` | `SourceCitation` |
| Enums | `PascalCase` | `RiskTier` |
| Constants | `SCREAMING_SNAKE` | `AUTHORITATIVE_SOURCES` |

---

## SKILL.md Format (OpenClaw Standard)

```yaml
---
name: skill-name
version: 1.0.0
author: username
triggers:
  - keyword1
  - keyword2
requires:
  - tool1
  - tool2
---

# Skill Name

## Purpose
One-sentence description.

## When to Use
Bullet points.

## Steps
1. First step
2. Second step

## Example
```typescript
// Usage example
```

## References
- [Source](url)
```

---

## Agent Instruction Files

### AGENTS.md (Required)

The primary instruction file. Contains:

1. **Quick Setup** — Copy-paste installation
2. **AI Flywheel** — Mandatory verification steps
3. **Tool Categories** — Quick reference table
4. **Workflow Guides** — Common patterns
5. **Environment Setup** — API keys, dependencies

### SOUL.md (Optional)

Defines agent personality and values:

```markdown
# Agent Soul

## Identity
Who the agent is and what it represents.

## Values
- Value 1: Description
- Value 2: Description

## Boundaries
- Will not: X
- Will not: Y

## Voice
How the agent communicates.
```

### TOOLS.md (Optional)

Detailed tool documentation with examples:

```markdown
# Tool Catalog

## Category: Verification

### start_verification_cycle
**Purpose:** Begin 6-phase verification
**Input:** `{ goal: string, context?: string }`
**Output:** `{ cycleId: string, status: "active" }`

**Example:**
```json
{
  "goal": "Implement OAuth flow",
  "context": "Using Convex + Auth0"
}
```
```

---

## Code Patterns

### Tool Implementation

```typescript
// 1. Types at top
interface ToolInput {
  param: string;
  optional?: number;
}

interface ToolOutput {
  result: string;
  metadata: object;
}

// 2. Constants after types
const DEFAULTS = {
  timeout: 30000,
  retries: 3,
};

// 3. Handler function
async function handleTool(args: ToolInput): Promise<ToolOutput> {
  // Implementation
}

// 4. Export tool definition
export const myTools: McpTool[] = [
  {
    name: "tool_name",
    description: "Concise description for agent discovery",
    inputSchema: { /* JSON Schema */ },
    handler: handleTool,
  },
];
```

### Error Handling

```typescript
// Prefer specific error types
class VerificationError extends Error {
  constructor(
    message: string,
    public readonly phase: number,
    public readonly recoverable: boolean
  ) {
    super(message);
    this.name = "VerificationError";
  }
}

// Throw with context
throw new VerificationError(
  "Gap analysis found dead code",
  4,
  true
);
```

### Async Patterns

```typescript
// Parallel when independent
const [result1, result2] = await Promise.all([
  fetchFirst(),
  fetchSecond(),
]);

// Sequential when dependent
const first = await fetchFirst();
const second = await fetchWithFirst(first.id);
```

---

## Risk-Tiered Execution

Actions are classified by reversibility and blast radius:

### Tier 1: Low Risk (Auto-Approved)
- Reading files, searching, analyzing
- Creating local temp files
- Running static analysis

### Tier 2: Medium Risk (Log + Proceed)
- Writing to local files
- Running tests
- Creating branches

### Tier 3: High Risk (Require Confirmation)
- Pushing to remote
- Posting to external services
- Modifying production config
- Deleting files/branches

```typescript
const RISK_TIERS = {
  low: { autoApprove: true, log: false },
  medium: { autoApprove: true, log: true },
  high: { autoApprove: false, requireConfirmation: true },
};
```

---

## Re-Update Before Create Pattern

**CRITICAL:** Before creating any new file, always check if updating existing instructions would be better.

```typescript
async function beforeCreate(target: string): Promise<"update" | "create"> {
  // 1. Check if similar file exists
  const existing = await findSimilar(target);
  if (existing) {
    // 2. Check if updating is better
    const updateBenefit = await evaluateUpdate(existing, target);
    if (updateBenefit > 0.7) {
      return "update";
    }
  }
  return "create";
}
```

### Checklist Before Creating Files

1. Does a similar file already exist?
2. Would adding to AGENTS.md be clearer?
3. Is this a one-time need or reusable pattern?
4. Does the team have a convention for this type of content?

---

## Autonomous Loop Pattern (Ralph Wiggum)

For long-running autonomous agents, implement stop-hooks:

```typescript
interface AutonomousLoopConfig {
  maxIterations: number;
  maxDurationMs: number;
  checkpointInterval: number;
  stopConditions: StopCondition[];
}

async function autonomousLoop(config: AutonomousLoopConfig) {
  let iteration = 0;
  const startTime = Date.now();

  while (true) {
    // 1. Check stop conditions
    for (const condition of config.stopConditions) {
      if (await condition.check()) {
        return { stopped: true, reason: condition.name };
      }
    }

    // 2. Check limits
    if (iteration >= config.maxIterations) {
      return { stopped: true, reason: "max_iterations" };
    }
    if (Date.now() - startTime > config.maxDurationMs) {
      return { stopped: true, reason: "timeout" };
    }

    // 3. Checkpoint
    if (iteration % config.checkpointInterval === 0) {
      await saveCheckpoint(iteration);
    }

    // 4. Execute work
    await executeWorkUnit();
    iteration++;
  }
}
```

---

## Directory Scaffolding

When self-implementing infrastructure, use this structure:

```typescript
const SCAFFOLD_STRUCTURE = {
  agent_loop: {
    files: [
      "convex/domains/agents/agentLoop.ts",
      "convex/domains/agents/agentLoopQueries.ts",
      "convex/domains/agents/schema.ts",
    ],
    testFiles: [
      "convex/domains/agents/__tests__/agentLoop.test.ts",
    ],
  },
  telemetry: {
    files: [
      "convex/domains/observability/telemetry.ts",
      "convex/domains/observability/spans.ts",
      "convex/domains/observability/schema.ts",
    ],
    testFiles: [
      "convex/domains/observability/__tests__/telemetry.test.ts",
    ],
  },
  // ... etc
};
```

---

## Source Citation Format

Always cite authoritative sources:

```typescript
interface SourceCitation {
  title: string;                              // Human-readable title
  url: string;                                // Direct URL
  authority: "tier1" | "tier2" | "tier3";     // Reliability tier
  publishedAt?: string;                       // ISO date if known
  relevance: string;                          // Why this source matters
}

// Tier 1: Official documentation (Anthropic, OpenAI, etc.)
// Tier 2: Trusted community (GitHub popular repos, well-known blogs)
// Tier 3: General community (forums, smaller repos)
```

---

## Testing Conventions

### Unit Tests

```typescript
describe("tool: discover_infrastructure", () => {
  it("should detect agent_loop patterns", async () => {
    const result = await discoverInfrastructure({
      categories: ["agent_loop"],
    });
    expect(result.discovered).toContainEqual(
      expect.objectContaining({ category: "agent_loop" })
    );
  });

  it("should return bootstrap plan for missing components", async () => {
    const result = await discoverInfrastructure({});
    expect(result.bootstrapPlan).toBeDefined();
    expect(result.bootstrapPlan.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
describe("integration: triple verification flow", () => {
  it("should complete V1 → V2 → V3 pipeline", async () => {
    const result = await tripleVerify({
      target: "my-feature",
      scope: "full",
    });
    expect(result.verification1_internal.status).toBeDefined();
    expect(result.verification2_external.status).toBeDefined();
    expect(result.verification3_synthesis.status).toBeDefined();
  });
});
```

---

## Commit Message Format

```
type(scope): short description

- Bullet point details
- Another detail

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-05 | Initial style guide based on OpenClaw patterns |
