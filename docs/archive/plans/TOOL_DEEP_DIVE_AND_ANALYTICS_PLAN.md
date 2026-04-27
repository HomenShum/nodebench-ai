# Full Tool Deep Dive and Analytics Implementation Plan

## Overview

This plan outlines a comprehensive two-phase approach:
1. **Phase 1**: Full parallel subagent deep dive on all 163 tools to validate preset configuration
2. **Phase 2**: Implement usage analytics and smart defaults system

---

## Phase 1: Full Parallel Subagent Deep Dive

### Objective

Validate the current 2-preset configuration (default: 44 tools, full: 163 tools) by analyzing every single tool across multiple dimensions.

### Deep Dive Dimensions

For each of the 163 tools, parallel subagents will analyze:

| Dimension | What to Evaluate | Output |
|-----------|------------------|--------|
| **AI Flywheel Fit** | Does this tool support the 6-phase verification or eval-driven development? | Score 1-5 + rationale |
| **Essentiality** | Is this tool required for core workflows or optional enhancement? | Essential / Important / Optional |
| **Dependency Profile** | What external dependencies does it require? (API keys, npm packages, Python servers) | Dependency list + complexity score |
| **Token Cost** | How much schema/overhead does this tool add to tool listings? | Token count estimate |
| **Usage Frequency** | How often is this tool likely to be used in typical sessions? | High / Medium / Low |
| **Interdependencies** | Does this tool depend on other tools? What tools depend on it? | Dependency graph edges |
| **Error Rate** | How likely is this tool to fail? What are common failure modes? | Failure probability + common errors |
| **Value Proposition** | What concrete value does this tool provide? | Value statement + use cases |

### Parallel Subagent Strategy

**Subagent Roles:**

1. **Verification Specialist** - Analyze tools in: verification, eval, quality_gate, flywheel, learning
2. **Research Specialist** - Analyze tools in: recon, web, github, docs, research_writing
3. **Security Specialist** - Analyze tools in: security, llm, platform
4. **Vision Specialist** - Analyze tools in: vision, ui_capture, local_file, gaia_solvers
5. **Parallel Specialist** - Analyze tools in: parallel, bootstrap, self_eval, session_memory
6. **Specialized Specialist** - Analyze tools in: flicker_detection, figma_flow, benchmark, toon, pattern, git_workflow, seo, voice_bridge, critter, email, rss, architect

**Task Distribution:**

| Role | Toolsets | Tool Count |
|------|----------|------------|
| Verification Specialist | verification, eval, quality_gate, flywheel, learning | 26 |
| Research Specialist | recon, web, github, docs, research_writing | 24 |
| Security Specialist | security, llm, platform | 10 |
| Vision Specialist | vision, ui_capture, local_file, gaia_solvers | 31 |
| Parallel Specialist | parallel, bootstrap, self_eval, session_memory | 36 |
| Specialized Specialist | flicker_detection, figma_flow, benchmark, toon, pattern, git_workflow, seo, voice_bridge, critter, email, rss, architect | 36 |

**Total: 163 tools across 6 parallel subagents**

### Deep Dive Output Format

Each subagent produces a JSON report:

```json
{
  "specialist": "Verification Specialist",
  "tools_analyzed": [
    {
      "name": "start_verification_cycle",
      "toolset": "verification",
      "ai_flywheel_fit": {
        "score": 5,
        "rationale": "Core tool for 6-phase verification - essential for Phase 1"
      },
      "essentiality": "Essential",
      "dependencies": {
        "external": [],
        "internal": ["log_phase_findings", "log_gap"],
        "api_keys": []
      },
      "token_cost": 450,
      "usage_frequency": "High",
      "interdependencies": {
        "depends_on": [],
        "required_by": ["run_mandatory_flywheel"]
      },
      "error_rate": {
        "probability": "Low",
        "common_errors": ["Invalid cycle ID", "Missing phase findings"]
      },
      "value_proposition": "Initiates structured verification cycle with tracking"
    }
  ],
  "summary": {
    "total_tools": 26,
    "essential_count": 18,
    "important_count": 6,
    "optional_count": 2,
    "high_dependency_count": 3,
    "recommendations": [
      "All verification tools are essential for AI Flywheel",
      "Consider merging log_phase_findings with start_verification_cycle"
    ]
  }
}
```

### Aggregation and Analysis

After all 6 subagents complete:

1. **Merge all reports** into a single analysis document
2. **Calculate preset scores**:
   - Default preset score = sum of essentiality scores for 44 tools
   - Full preset score = sum of essentiality scores for 163 tools
3. **Identify gaps**:
   - Essential tools missing from default preset
   - Optional tools that should be in default preset
   - Tools with high interdependencies that should be grouped
4. **Generate recommendations**:
   - Should default preset be adjusted?
   - Are there tools that should be merged or split?
   - Are there missing tools that should be created?

### Success Criteria

- [ ] All 163 tools analyzed across 8 dimensions
- [ ] 6 parallel subagents complete successfully
- [ ] Aggregated report produced with clear recommendations
- [ ] Preset configuration validated or adjusted based on findings

---

## Phase 2: Usage Analytics and Smart Defaults

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server Entry Point                    │
│                         (index.ts)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Tool Call Tracking Wrapper                       │
│         (wraps every tool handler with analytics)            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   SQLite Database                            │
│  ┌─────────────────┬─────────────────┬──────────────────┐  │
│  │  tool_usage     │  project_context │  preset_history  │  │
│  └─────────────────┴─────────────────┴──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Analytics Aggregation Engine                     │
│         (generates usage stats, trends, insights)           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Smart Preset Generator                          │
│    (project detection + usage analysis → preset)            │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Tool usage tracking
CREATE TABLE tool_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_name TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  session_id TEXT,
  args_json TEXT,
  success BOOLEAN NOT NULL,
  duration_ms INTEGER NOT NULL,
  error_message TEXT
);

CREATE INDEX idx_tool_usage_name ON tool_usage(tool_name);
CREATE INDEX idx_tool_usage_timestamp ON tool_usage(timestamp);
CREATE INDEX idx_tool_usage_session ON tool_usage(session_id);

-- Project context (detected once per session)
CREATE TABLE project_context (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  project_type TEXT NOT NULL,
  detected_at INTEGER NOT NULL,
  package_json TEXT,
  has_git BOOLEAN,
  has_tests BOOLEAN,
  language TEXT
);

-- Preset history (track which presets were used)
CREATE TABLE preset_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  preset_name TEXT NOT NULL,
  toolsets_json TEXT NOT NULL,
  tool_count INTEGER NOT NULL,
  applied_at INTEGER NOT NULL
);

-- Usage aggregation cache (for fast queries)
CREATE TABLE usage_stats_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period_days INTEGER NOT NULL,
  tool_name TEXT NOT NULL,
  call_count INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  avg_duration_ms REAL,
  last_used INTEGER,
  updated_at INTEGER NOT NULL,
  UNIQUE(period_days, tool_name)
);
```

### Implementation Components

#### 1. Tool Call Tracking Wrapper

**File**: `packages/mcp-local/src/analytics/toolTracker.ts`

```typescript
import type { McpTool } from "../types.js";
import { getDb } from "../db.js";

export interface ToolCallContext {
  sessionId: string;
  toolName: string;
  args: any;
  startTime: number;
}

export function createTrackedTool(
  tool: McpTool,
  sessionId: string
): McpTool {
  return {
    ...tool,
    handler: async (args) => {
      const startTime = Date.now();
      let success = false;
      let errorMessage: string | undefined;

      try {
        const result = await tool.handler(args);
        success = true;
        return result;
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        await trackToolCall({
          sessionId,
          toolName: tool.name,
          args,
          startTime,
          success,
          errorMessage,
        });
      }
    },
  };
}

async function trackToolCall(ctx: ToolCallContext & {
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  const db = getDb();
  const duration = Date.now() - ctx.startTime;

  await db.run(
    `INSERT INTO tool_usage 
     (tool_name, timestamp, session_id, args_json, success, duration_ms, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      ctx.toolName,
      Date.now(),
      ctx.sessionId,
      JSON.stringify(ctx.args),
      ctx.success ? 1 : 0,
      duration,
      ctx.errorMessage || null,
    ]
  );
}
```

#### 2. Project Type Detection

**File**: `packages/mcp-local/src/analytics/projectDetector.ts`

```typescript
import * as fs from "node:fs/promises";
import * as path from "node:path";

export type ProjectType =
  | "web-react"
  | "web-vue"
  | "web-backend"
  | "python"
  | "rust"
  | "go"
  | "java"
  | "ml"
  | "generic";

export interface ProjectContext {
  type: ProjectType;
  language: string;
  hasGit: boolean;
  hasTests: boolean;
  packageJson?: any;
  detectedAt: number;
}

export async function detectProjectType(
  cwd: string = process.cwd()
): Promise<ProjectContext> {
  const hasGit = await fileExists(path.join(cwd, ".git"));
  const hasTests = await hasTestDirectory(cwd);

  // Check for package.json (Node.js/TypeScript)
  const packageJsonPath = path.join(cwd, "package.json");
  if (await fileExists(packageJsonPath)) {
    const pkg = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps.react || deps["react-dom"]) {
      return {
        type: "web-react",
        language: "typescript",
        hasGit,
        hasTests,
        packageJson: pkg,
        detectedAt: Date.now(),
      };
    }

    if (deps.vue || deps.nuxt) {
      return {
        type: "web-vue",
        language: "typescript",
        hasGit,
        hasTests,
        packageJson: pkg,
        detectedAt: Date.now(),
      };
    }

    if (deps.express || deps.fastify || deps.koa || deps.nest) {
      return {
        type: "web-backend",
        language: "typescript",
        hasGit,
        hasTests,
        packageJson: pkg,
        detectedAt: Date.now(),
      };
    }

    if (deps.tensorflow || deps.pytorch || deps["@tensorflow/tfjs"]) {
      return {
        type: "ml",
        language: "typescript",
        hasGit,
        hasTests,
        packageJson: pkg,
        detectedAt: Date.now(),
      };
    }

    return {
      type: "generic",
      language: "typescript",
      hasGit,
      hasTests,
      packageJson: pkg,
      detectedAt: Date.now(),
    };
  }

  // Check for requirements.txt (Python)
  if (await fileExists(path.join(cwd, "requirements.txt"))) {
    const reqs = await fs.readFile(path.join(cwd, "requirements.txt"), "utf-8");
    if (reqs.includes("tensorflow") || reqs.includes("torch") || reqs.includes("keras")) {
      return {
        type: "ml",
        language: "python",
        hasGit,
        hasTests,
        detectedAt: Date.now(),
      };
    }
    return {
      type: "python",
      language: "python",
      hasGit,
      hasTests,
      detectedAt: Date.now(),
    };
  }

  // Check for Cargo.toml (Rust)
  if (await fileExists(path.join(cwd, "Cargo.toml"))) {
    return {
      type: "rust",
      language: "rust",
      hasGit,
      hasTests,
      detectedAt: Date.now(),
    };
  }

  // Check for go.mod (Go)
  if (await fileExists(path.join(cwd, "go.mod"))) {
    return {
      type: "go",
      language: "go",
      hasGit,
      hasTests,
      detectedAt: Date.now(),
    };
  }

  // Check for pom.xml (Java/Maven)
  if (await fileExists(path.join(cwd, "pom.xml"))) {
    return {
      type: "java",
      language: "java",
      hasGit,
      hasTests,
      detectedAt: Date.now(),
    };
  }

  return {
    type: "generic",
    language: "unknown",
    hasGit,
    hasTests,
    detectedAt: Date.now(),
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function hasTestDirectory(cwd: string): Promise<boolean> {
  const testDirs = ["test", "tests", "__tests__", "spec", "specs"];
  for (const dir of testDirs) {
    if (await fileExists(path.join(cwd, dir))) {
      return true;
    }
  }
  return false;
}
```

#### 3. Usage Statistics Aggregation

**File**: `packages/mcp-local/src/analytics/usageStats.ts`

```typescript
import { getDb } from "../db.js";

export interface ToolUsageStats {
  toolName: string;
  callCount: number;
  successCount: number;
  successRate: number;
  avgDurationMs: number;
  lastUsed: number;
}

export interface UsageSummary {
  periodDays: number;
  totalCalls: number;
  totalSuccess: number;
  overallSuccessRate: number;
  topTools: ToolUsageStats[];
  toolStats: Map<string, ToolUsageStats>;
}

export async function getUsageStats(
  days: number = 30
): Promise<UsageSummary> {
  const db = getDb();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  // Check cache first
  const cached = await db.get(
    "SELECT * FROM usage_stats_cache WHERE period_days = ?",
    [days]
  );

  if (cached && Date.now() - cached.updated_at < 60 * 60 * 1000) {
    // Cache is fresh (less than 1 hour old)
    const rows = await db.all(
      "SELECT * FROM usage_stats_cache WHERE period_days = ?",
      [days]
    );
    return buildSummaryFromCache(rows, days);
  }

  // Aggregate from raw data
  const rows = await db.all(
    `SELECT 
      tool_name,
      COUNT(*) as call_count,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
      AVG(duration_ms) as avg_duration_ms,
      MAX(timestamp) as last_used
    FROM tool_usage
    WHERE timestamp > ?
    GROUP BY tool_name
    ORDER BY call_count DESC`,
    [cutoff]
  );

  // Update cache
  for (const row of rows) {
    await db.run(
      `INSERT OR REPLACE INTO usage_stats_cache 
       (period_days, tool_name, call_count, success_count, avg_duration_ms, last_used, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [days, row.tool_name, row.call_count, row.success_count, row.avg_duration_ms, row.last_used, Date.now()]
    );
  }

  return buildSummaryFromRows(rows, days);
}

function buildSummaryFromRows(
  rows: any[],
  periodDays: number
): UsageSummary {
  const toolStats = new Map<string, ToolUsageStats>();
  let totalCalls = 0;
  let totalSuccess = 0;

  for (const row of rows) {
    const stats: ToolUsageStats = {
      toolName: row.tool_name,
      callCount: row.call_count,
      successCount: row.success_count,
      successRate: row.call_count > 0 ? row.success_count / row.call_count : 0,
      avgDurationMs: row.avg_duration_ms || 0,
      lastUsed: row.last_used,
    };
    toolStats.set(row.tool_name, stats);
    totalCalls += row.call_count;
    totalSuccess += row.success_count;
  }

  const topTools = Array.from(toolStats.values())
    .sort((a, b) => b.callCount - a.callCount)
    .slice(0, 20);

  return {
    periodDays,
    totalCalls,
    totalSuccess,
    overallSuccessRate: totalCalls > 0 ? totalSuccess / totalCalls : 0,
    topTools,
    toolStats,
  };
}

function buildSummaryFromCache(
  rows: any[],
  periodDays: number
): UsageSummary {
  const toolStats = new Map<string, ToolUsageStats>();
  let totalCalls = 0;
  let totalSuccess = 0;

  for (const row of rows) {
    const stats: ToolUsageStats = {
      toolName: row.tool_name,
      callCount: row.call_count,
      successCount: row.success_count,
      successRate: row.call_count > 0 ? row.success_count / row.call_count : 0,
      avgDurationMs: row.avg_duration_ms || 0,
      lastUsed: row.last_used,
    };
    toolStats.set(row.tool_name, stats);
    totalCalls += row.call_count;
    totalSuccess += row.success_count;
  }

  const topTools = Array.from(toolStats.values())
    .sort((a, b) => b.callCount - a.callCount)
    .slice(0, 20);

  return {
    periodDays,
    totalCalls,
    totalSuccess,
    overallSuccessRate: totalCalls > 0 ? totalSuccess / totalCalls : 0,
    topTools,
    toolStats,
  };
}
```

#### 4. Smart Preset Generator

**File**: `packages/mcp-local/src/analytics/smartPreset.ts`

```typescript
import { detectProjectType, ProjectType } from "./projectDetector.js";
import { getUsageStats, ToolUsageStats } from "./usageStats.js";
import { TOOLSET_MAP } from "../index.js";

// Tool to toolset mapping
const TOOL_TO_TOOLSET: Record<string, string> = {
  // Verification
  start_verification_cycle: "verification",
  log_phase_findings: "verification",
  log_gap: "verification",
  resolve_gap: "verification",
  log_test_result: "verification",
  get_verification_status: "verification",
  list_verification_cycles: "verification",
  // ... (map all 163 tools)
};

// Project-specific toolset recommendations
const PROJECT_RECOMMENDATIONS: Record<ProjectType, string[]> = {
  "web-react": ["web", "github", "ui_capture", "vision", "local_file"],
  "web-vue": ["web", "github", "ui_capture", "vision", "local_file"],
  "web-backend": ["web", "github", "security", "llm", "local_file"],
  "python": ["web", "github", "local_file", "llm"],
  "rust": ["web", "github", "local_file"],
  "go": ["web", "github", "local_file"],
  "java": ["web", "github", "local_file"],
  "ml": ["web", "github", "local_file", "llm", "vision"],
  "generic": [],
};

// Base toolsets (always included)
const BASE_TOOLSETS = [
  "verification",
  "eval",
  "quality_gate",
  "learning",
  "flywheel",
  "recon",
  "security",
  "boilerplate",
];

export interface SmartPresetResult {
  recommendedToolsets: string[];
  reasoning: string[];
  projectContext: ProjectType;
  usageBasedAdditions: string[];
  confidence: number;
}

export async function generateSmartPreset(
  cwd: string = process.cwd(),
  usageDays: number = 30
): Promise<SmartPresetResult> {
  const projectContext = await detectProjectType(cwd);
  const usageStats = await getUsageStats(usageDays);

  // Start with base toolsets
  const recommendedToolsets = new Set(BASE_TOOLSETS);
  const reasoning: string[] = [];

  // Add project-specific recommendations
  const projectAdditions = PROJECT_RECOMMENDATIONS[projectContext.type] || [];
  for (const toolset of projectAdditions) {
    recommendedToolsets.add(toolset);
    reasoning.push(
      `Added '${toolset}' toolset for ${projectContext.type} project type`
    );
  }

  // Add usage-based additions (tools used frequently)
  const usageBasedAdditions: string[] = [];
  const highUsageTools = usageStats.topTools.filter(
    (t) => t.callCount >= 5 && t.successRate >= 0.8
  );

  for (const tool of highUsageTools) {
    const toolset = TOOL_TO_TOOLSET[tool.toolName];
    if (toolset && !recommendedToolsets.has(toolset)) {
      recommendedToolsets.add(toolset);
      usageBasedAdditions.push(toolset);
      reasoning.push(
        `Added '${toolset}' toolset based on high usage (${tool.callCount} calls, ${(tool.successRate * 100).toFixed(0)}% success)`
      );
    }
  }

  // Calculate confidence
  const confidence = calculateConfidence(
    projectContext,
    usageStats,
    recommendedToolsets.size
  );

  return {
    recommendedToolsets: Array.from(recommendedToolsets),
    reasoning,
    projectContext: projectContext.type,
    usageBasedAdditions,
    confidence,
  };
}

function calculateConfidence(
  projectContext: any,
  usageStats: any,
  toolsetCount: number
): number {
  let confidence = 0.5; // Base confidence

  // Project type detection adds confidence
  if (projectContext.type !== "generic") {
    confidence += 0.2;
  }

  // Usage data adds confidence
  if (usageStats.totalCalls > 50) {
    confidence += 0.2;
  }

  // Reasonable toolset count adds confidence
  if (toolsetCount >= 8 && toolsetCount <= 15) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

export async function applySmartPreset(
  cwd: string = process.cwd()
): Promise<string[]> {
  const result = await generateSmartPreset(cwd);

  // Log the decision
  console.log(`Smart preset generated for ${result.projectContext} project:`);
  console.log(`  Toolsets: ${result.recommendedToolsets.join(", ")}`);
  console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  console.log(`  Reasoning:`);
  for (const reason of result.reasoning) {
    console.log(`    - ${reason}`);
  }

  return result.recommendedToolsets;
}
```

#### 5. Integration with index.ts

**Modifications to `packages/mcp-local/src/index.ts`**:

```typescript
// Add imports
import { createTrackedTool } from "./analytics/toolTracker.js";
import { detectProjectType, saveProjectContext } from "./analytics/projectDetector.js";
import { applySmartPreset } from "./analytics/smartPreset.js";
import { initAnalyticsSchema } from "./analytics/schema.js";

// Initialize analytics schema on startup
initAnalyticsSchema();

// Generate session ID
const sessionId = crypto.randomUUID();

// Detect project type
const projectContext = await detectProjectType();
await saveProjectContext(sessionId, projectContext);

// Check for --smart-preset flag
if (cliArgs.includes("--smart-preset")) {
  const smartToolsets = await applySmartPreset();
  return smartToolsets.flatMap((k) => TOOLSET_MAP[k] ?? []);
}

// Wrap all tools with tracking
const domainTools: McpTool[] = parseToolsets().map((tool) =>
  createTrackedTool(tool, sessionId)
);
```

### CLI Flags

```bash
# Use smart preset (auto-detects project type + usage patterns)
npx nodebench-mcp --smart-preset

# View usage statistics
npx nodebench-mcp --stats

# View usage statistics for specific period
npx nodebench-mcp --stats 7  # Last 7 days

# Export usage data
npx nodebench-mcp --export-stats usage.json

# Reset analytics data
npx nodebench-mcp --reset-stats
```

### Testing Strategy

1. **Unit Tests**:
   - Test project type detection with mock file systems
   - Test usage stats aggregation with mock data
   - Test smart preset generation logic

2. **Integration Tests**:
   - Test tool call tracking wrapper
   - Test database schema migrations
   - Test CLI flag handling

3. **E2E Tests**:
   - Run full session with analytics enabled
   - Verify data is persisted correctly
   - Verify smart preset recommendations

### Success Criteria

- [ ] All 163 tools analyzed across 8 dimensions by parallel subagents
- [ ] Deep dive report produced with clear recommendations
- [ ] Preset configuration validated or adjusted
- [ ] Usage analytics system implemented (SQLite schema + tracking wrapper)
- [ ] Project type detection implemented (8 project types)
- [ ] Smart preset generator implemented (base + project + usage-based)
- [ ] CLI flags added (--smart-preset, --stats, --export-stats, --reset-stats)
- [ ] All tests passing
- [ ] Documentation updated

---

## Timeline

| Phase | Task | Estimated Effort |
|-------|------|------------------|
| Phase 1 | Plan deep dive strategy | 1 hour |
| Phase 1 | Execute parallel subagent deep dive | 2-3 hours |
| Phase 1 | Analyze results and validate presets | 1 hour |
| Phase 2 | Design analytics architecture | 1 hour |
| Phase 2 | Implement database schema | 1 hour |
| Phase 2 | Implement tool tracking wrapper | 1 hour |
| Phase 2 | Implement project type detection | 1 hour |
| Phase 2 | Implement usage stats aggregation | 1 hour |
| Phase 2 | Implement smart preset generator | 1 hour |
| Phase 2 | Integrate with index.ts | 1 hour |
| Phase 2 | Add CLI flags | 1 hour |
| Phase 2 | Write tests | 2 hours |
| Phase 2 | Update documentation | 1 hour |
| **Total** | | **~15-16 hours** |
