/**
 * Boilerplate Tools — Scaffold a ready-to-use project pre-configured for
 * nodebench-mcp. Instead of requiring agents to run 15 bootstrap tools,
 * ship a single "scaffold_nodebench_project" that creates everything.
 *
 * 2 tools:
 * - scaffold_nodebench_project: Creates a complete project template with all infra
 * - get_boilerplate_status: Check what's already set up vs what's missing
 */

import type { McpTool } from "../types.js";
import * as fs from "node:fs";
import * as path from "node:path";

// ── Template content generators ──────────────────────────────────────────

function generatePackageJson(projectName: string, techStack: string): string {
  const isTypeScript = techStack.toLowerCase().includes("typescript") || techStack.toLowerCase().includes("ts");
  const isReact = techStack.toLowerCase().includes("react");
  const isPython = techStack.toLowerCase().includes("python");

  if (isPython) {
    return JSON.stringify({
      name: projectName,
      private: true,
      scripts: {
        "mcp:start": "npx nodebench-mcp",
        "mcp:lite": "npx nodebench-mcp --preset lite",
        "mcp:core": "npx nodebench-mcp --preset core",
      },
      devDependencies: {
        "nodebench-mcp": "^2.8.0",
      },
    }, null, 2);
  }

  return JSON.stringify({
    name: projectName,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      build: isTypeScript ? "tsc" : "echo 'No build step'",
      test: "vitest run",
      "test:watch": "vitest",
      lint: "eslint .",
      "mcp:start": "npx nodebench-mcp",
      "mcp:lite": "npx nodebench-mcp --preset lite",
      "mcp:core": "npx nodebench-mcp --preset core",
      ...(isReact ? { dev: "vite", preview: "vite preview" } : {}),
    },
    dependencies: {
      ...(isReact ? { react: "^19.0.0", "react-dom": "^19.0.0" } : {}),
    },
    devDependencies: {
      ...(isTypeScript ? { typescript: "^5.7.0", "@types/node": "^22.0.0" } : {}),
      vitest: "^3.2.0",
      "nodebench-mcp": "^2.8.0",
    },
  }, null, 2);
}

function generateAgentsMd(projectName: string, techStack: string): string {
  return `# ${projectName} — Agent Instructions

## Project Overview
- **Name**: ${projectName}
- **Tech Stack**: ${techStack}
- **Created**: ${new Date().toISOString().split("T")[0]}

## Quick Start for AI Agents

### First Session
1. Call \`bootstrap_project\` to register this project with NodeBench MCP
2. Call \`search_all_knowledge\` to check for relevant past findings
3. Call \`getMethodology("overview")\` to see all available methodologies

### Every Task
1. \`search_all_knowledge\` — Check what the system already knows
2. \`start_verification_cycle\` — Begin 6-phase verification
3. Follow phases 1-6 (guided by tool responses)
4. \`run_mandatory_flywheel\` — 6-step final check before declaring done
5. \`record_learning\` — Capture what you discovered

### Progressive Tool Discovery
- \`discover_tools("what you want to do")\` — Hybrid search with relevance scoring
- \`get_tool_quick_ref("tool_name")\` — What to do after calling any tool
- \`get_workflow_chain("new_feature")\` — Full step-by-step tool sequences

## Architecture
<!-- Describe your project architecture here -->

## Conventions
<!-- Describe coding conventions, patterns, and standards here -->

## Quality Gates
- All changes must pass \`run_mandatory_flywheel\` before shipping
- UI changes must pass the \`ui_ux_qa\` quality gate
- Code changes must pass \`run_closed_loop\` (compile→lint→test→debug)

## Known Gotchas
<!-- Record known issues and workarounds here. Also stored in NodeBench learnings DB. -->

## Parallel Agent Coordination
When using multiple agents (Claude Code subagents, worktrees, or terminals):
1. \`claim_agent_task\` before starting work (prevents duplicate effort)
2. \`assign_agent_role\` for specialization
3. \`release_agent_task\` with progress note when done
4. \`get_parallel_status\` to see all agent activity
`;
}

function generateMcpConfig(projectName: string): string {
  return JSON.stringify({
    mcpServers: {
      "nodebench-mcp": {
        command: "npx",
        args: ["-y", "nodebench-mcp"],
        env: {},
      },
    },
  }, null, 2);
}

function generateGithubActions(): string {
  return `name: NodeBench Quality Gate
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - run: npm run lint
`;
}

function generateReadme(projectName: string, techStack: string): string {
  return `# ${projectName}

Built with NodeBench MCP methodology for rigorous AI-assisted development.

## Quick Start

\`\`\`bash
npm install
npm run build
npm run test
\`\`\`

## NodeBench MCP Integration

This project is pre-configured for [NodeBench MCP](https://github.com/nodebench/nodebench-ai) — tools that make AI agents catch the bugs they normally ship.

### For AI Agents
See [AGENTS.md](./AGENTS.md) for detailed instructions.

### Key Commands
- \`npm run mcp:start\` — Start NodeBench MCP (full toolset)
- \`npm run mcp:lite\` — Lightweight mode (34 tools)
- \`npm run mcp:core\` — Core mode (79 tools)

### MCP Configuration
The \`.mcp.json\` file configures NodeBench MCP for your IDE.

## Tech Stack
${techStack}

## Development Workflow
1. **Research** → \`search_all_knowledge\`, \`run_recon\`
2. **Implement** → Write code following conventions in AGENTS.md
3. **Test** → \`run_closed_loop\` (compile→lint→test→debug)
4. **Verify** → \`run_mandatory_flywheel\` (6-step verification)
5. **Ship** → \`record_learning\`, \`promote_to_eval\`
`;
}

function generateParallelAgentsReadme(): string {
  return `# Parallel Agent Coordination

This directory supports multi-agent workflows with NodeBench MCP.

## Files
- \`current_tasks/\` — Lock files for claimed tasks
- \`oracle/\` — Known-good reference outputs for oracle testing
- \`roles.json\` — Agent role assignments
- \`progress.md\` — Running status for agent orientation

## Usage
1. \`claim_agent_task({ taskKey: "...", description: "..." })\`
2. Do the work
3. \`release_agent_task({ taskKey: "...", status: "completed", progressNote: "..." })\`

See AGENTS.md for full protocol.
`;
}

function generateProgressMd(projectName: string): string {
  return `# ${projectName} — Progress Tracker

## Current Status
- **Phase**: Setup
- **Last Updated**: ${new Date().toISOString()}
- **Active Agents**: 0

## Completed Tasks
<!-- Tasks will be logged here as agents complete them -->

## Blocked Tasks
<!-- Tasks that need fresh eyes or external input -->

## Architecture Decisions
<!-- Key decisions and their rationale -->

## Known Issues
<!-- Active issues to be aware of -->
`;
}

function generateGitignore(): string {
  return `node_modules/
dist/
.env
.env.local
*.log
.nodebench/
.parallel-agents/current_tasks/*.lock
.tmp/
coverage/
`;
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "bundler",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      outDir: "./dist",
      rootDir: "./src",
      declaration: true,
      declarationMap: true,
      sourceMap: true,
    },
    include: ["src"],
    exclude: ["node_modules", "dist"],
  }, null, 2);
}

// ── Tools ────────────────────────────────────────────────────────────────

export const boilerplateTools: McpTool[] = [
  {
    name: "scaffold_nodebench_project",
    description:
      "Create a complete project template pre-configured for nodebench-mcp. Generates: package.json, AGENTS.md, .mcp.json, .parallel-agents/, .github/workflows/, tsconfig.json, .gitignore, README.md, and src/ directory. Everything an agent needs to start working immediately with the full AI Flywheel methodology. Use dryRun=true (default) to preview what will be created.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Absolute path to the target project directory",
        },
        projectName: {
          type: "string",
          description: "Name of the project (used in package.json, README, etc.)",
        },
        techStack: {
          type: "string",
          description: 'Tech stack description (e.g. "TypeScript, React, Convex", "Python, FastAPI", "Rust, Axum")',
        },
        dryRun: {
          type: "boolean",
          description: "Preview what will be created without writing files (default: true)",
        },
        includeParallelAgents: {
          type: "boolean",
          description: "Include .parallel-agents/ directory for multi-agent coordination (default: true)",
        },
        includeGithubActions: {
          type: "boolean",
          description: "Include .github/workflows/ CI/CD template (default: true)",
        },
        includeDocker: {
          type: "boolean",
          description: "Include Dockerfile and docker-compose.yml (default: false)",
        },
      },
      required: ["projectPath", "projectName", "techStack"],
    },
    handler: async (args) => {
      const projectPath = args.projectPath;
      const projectName = args.projectName;
      const techStack = args.techStack ?? "TypeScript, Node.js";
      const dryRun = args.dryRun !== false;
      const includeParallel = args.includeParallelAgents !== false;
      const includeGH = args.includeGithubActions !== false;
      const includeDocker = args.includeDocker === true;

      // Build file manifest
      const files: Array<{ path: string; content: string; isDir?: boolean }> = [];

      // Core files
      files.push({ path: "package.json", content: generatePackageJson(projectName, techStack) });
      files.push({ path: "AGENTS.md", content: generateAgentsMd(projectName, techStack) });
      files.push({ path: ".mcp.json", content: generateMcpConfig(projectName) });
      files.push({ path: "README.md", content: generateReadme(projectName, techStack) });
      files.push({ path: ".gitignore", content: generateGitignore() });

      // TypeScript config (if applicable)
      if (techStack.toLowerCase().includes("typescript") || techStack.toLowerCase().includes("ts") || techStack.toLowerCase().includes("node")) {
        files.push({ path: "tsconfig.json", content: generateTsConfig() });
      }

      // Source directory
      files.push({ path: "src", content: "", isDir: true });
      files.push({ path: "src/index.ts", content: `// ${projectName} — entry point\nconsole.log("Hello from ${projectName}");\n` });

      // Parallel agents infrastructure
      if (includeParallel) {
        files.push({ path: ".parallel-agents", content: "", isDir: true });
        files.push({ path: ".parallel-agents/README.md", content: generateParallelAgentsReadme() });
        files.push({ path: ".parallel-agents/current_tasks", content: "", isDir: true });
        files.push({ path: ".parallel-agents/oracle", content: "", isDir: true });
        files.push({ path: ".parallel-agents/roles.json", content: JSON.stringify({ roles: [], lastUpdated: new Date().toISOString() }, null, 2) });
        files.push({ path: "progress.md", content: generateProgressMd(projectName) });
      }

      // GitHub Actions
      if (includeGH) {
        files.push({ path: ".github/workflows", content: "", isDir: true });
        files.push({ path: ".github/workflows/quality-gate.yml", content: generateGithubActions() });
      }

      // Docker (optional)
      if (includeDocker) {
        files.push({
          path: "Dockerfile",
          content: `FROM node:22-slim\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --production\nCOPY . .\nRUN npm run build\nCMD ["node", "dist/index.js"]\n`,
        });
        files.push({
          path: "docker-compose.yml",
          content: `version: '3.8'\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n    environment:\n      - NODE_ENV=production\n`,
        });
      }

      // Check for existing files
      const existing: string[] = [];
      const willCreate: string[] = [];

      for (const file of files) {
        const fullPath = path.join(projectPath, file.path);
        if (fs.existsSync(fullPath)) {
          existing.push(file.path);
        } else {
          willCreate.push(file.path);
        }
      }

      if (dryRun) {
        return {
          dryRun: true,
          projectPath,
          projectName,
          techStack,
          summary: {
            totalFiles: files.length,
            willCreate: willCreate.length,
            alreadyExist: existing.length,
          },
          willCreate,
          alreadyExist: existing,
          files: files.map((f) => ({
            path: f.path,
            isDir: f.isDir ?? false,
            exists: existing.includes(f.path),
            sizeBytes: f.isDir ? 0 : Buffer.byteLength(f.content, "utf8"),
          })),
          _quickRef: {
            nextAction: "Review the file list. If it looks good, re-run with dryRun=false to create the files.",
            nextTools: ["scaffold_nodebench_project", "bootstrap_project"],
          },
        };
      }

      // Actually create files
      const created: string[] = [];
      const skipped: string[] = [];

      for (const file of files) {
        const fullPath = path.join(projectPath, file.path);

        if (fs.existsSync(fullPath)) {
          skipped.push(file.path);
          continue;
        }

        if (file.isDir) {
          fs.mkdirSync(fullPath, { recursive: true });
        } else {
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, file.content, "utf8");
        }
        created.push(file.path);
      }

      return {
        dryRun: false,
        projectPath,
        projectName,
        techStack,
        summary: {
          created: created.length,
          skipped: skipped.length,
        },
        created,
        skipped,
        _quickRef: {
          nextAction: "Project scaffolded! Next: run `npm install`, then call bootstrap_project to register with NodeBench MCP.",
          nextTools: ["bootstrap_project", "search_all_knowledge", "run_closed_loop"],
          methodology: "agent_bootstrap",
        },
        nextSteps: [
          `cd ${projectPath} && npm install`,
          "Call bootstrap_project to register your project context",
          "Call search_all_knowledge to check for relevant past findings",
          "Start coding! The AI Flywheel methodology will guide you.",
        ],
      };
    },
  },

  {
    name: "get_boilerplate_status",
    description:
      "Check what NodeBench infrastructure is already set up in a project vs what's missing. Scans for: AGENTS.md, .mcp.json, .parallel-agents/, quality gates, package.json scripts, etc. Returns a gap report with recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Absolute path to the project directory to scan",
        },
      },
      required: ["projectPath"],
    },
    handler: async (args) => {
      const projectPath = args.projectPath;

      if (!fs.existsSync(projectPath)) {
        throw new Error(`Project path does not exist: ${projectPath}`);
      }

      const checks = [
        { file: "AGENTS.md", category: "documentation", description: "Agent instructions file" },
        { file: ".mcp.json", category: "config", description: "MCP server configuration" },
        { file: "package.json", category: "config", description: "Package manifest" },
        { file: "tsconfig.json", category: "config", description: "TypeScript configuration" },
        { file: ".gitignore", category: "config", description: "Git ignore rules" },
        { file: "README.md", category: "documentation", description: "Project readme" },
        { file: ".parallel-agents", category: "parallel", description: "Parallel agent coordination directory" },
        { file: ".parallel-agents/current_tasks", category: "parallel", description: "Task lock directory" },
        { file: ".parallel-agents/oracle", category: "parallel", description: "Oracle reference directory" },
        { file: ".parallel-agents/roles.json", category: "parallel", description: "Agent role assignments" },
        { file: "progress.md", category: "parallel", description: "Progress tracker for agent orientation" },
        { file: ".github/workflows", category: "ci", description: "CI/CD workflow directory" },
      ];

      const found: string[] = [];
      const missing: string[] = [];
      const details: Array<{ file: string; category: string; description: string; exists: boolean }> = [];

      for (const check of checks) {
        const fullPath = path.join(projectPath, check.file);
        const exists = fs.existsSync(fullPath);
        if (exists) found.push(check.file);
        else missing.push(check.file);
        details.push({ ...check, exists });
      }

      // Check package.json for mcp scripts
      let hasMcpScripts = false;
      const pkgPath = path.join(projectPath, "package.json");
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
          hasMcpScripts = !!(pkg.scripts?.["mcp:start"] || pkg.scripts?.["mcp:lite"]);
        } catch { /* ignore */ }
      }

      const completionPct = Math.round((found.length / checks.length) * 100);

      return {
        projectPath,
        completionPercentage: completionPct,
        found: found.length,
        missing: missing.length,
        total: checks.length,
        hasMcpScripts,
        details,
        missingFiles: missing,
        recommendations: missing.length > 0
          ? [
              `Run scaffold_nodebench_project to create missing files (${missing.length} items)`,
              ...(missing.includes("AGENTS.md") ? ["AGENTS.md is critical — it guides AI agents working on your project"] : []),
              ...(missing.includes(".mcp.json") ? [".mcp.json configures NodeBench MCP for your IDE"] : []),
              ...(!hasMcpScripts ? ["Add mcp:start script to package.json for easy MCP launch"] : []),
            ]
          : ["All infrastructure is in place! Ready for the AI Flywheel."],
        _quickRef: {
          nextAction: missing.length > 0
            ? "Run scaffold_nodebench_project to fill gaps, or bootstrap_project to register existing project."
            : "Infrastructure complete. Call bootstrap_project to register context, then start working.",
          nextTools: missing.length > 0
            ? ["scaffold_nodebench_project", "bootstrap_project"]
            : ["bootstrap_project", "search_all_knowledge"],
        },
      };
    },
  },
];
