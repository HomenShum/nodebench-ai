# MCP Distribution Research

> Research date: 2026-03-22
> Package: `nodebench-mcp` on npm
> Goal: Zero-friction discovery and install for Claude Code and Cursor users

---

## 1. MCP Registries — How to Get Listed

### 1a. Official MCP Registry (registry.modelcontextprotocol.io)

The canonical registry run by the MCP project. Hosts metadata only (not artifacts). Your npm package must be published first.

**Submission process:**

```bash
# 1. Install the publisher CLI
brew install mcp-publisher
# OR download binary:
# curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher && sudo mv mcp-publisher /usr/local/bin/

# 2. Initialize server.json (run from packages/mcp-local/)
mcp-publisher init

# 3. Authenticate via GitHub OAuth
mcp-publisher login github

# 4. Publish
mcp-publisher publish
```

**server.json for NodeBench:**

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.homenshum/nodebench-mcp",
  "description": "304-tool MCP server with progressive discovery, agent-as-a-graph embeddings, toolset gating presets, and CLI subcommands.",
  "repository": {
    "url": "https://github.com/homenshum/nodebench-ai",
    "source": "github"
  },
  "version": "2.31.0",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "nodebench-mcp",
      "version": "2.31.0",
      "transport": {
        "type": "stdio"
      },
      "packageArguments": ["--preset", "full"],
      "environmentVariables": [
        {
          "name": "GEMINI_API_KEY",
          "description": "Google Gemini API key for embedding search",
          "isRequired": false,
          "format": "string",
          "isSecret": true
        },
        {
          "name": "OPENAI_API_KEY",
          "description": "OpenAI API key for embedding fallback",
          "isRequired": false,
          "format": "string",
          "isSecret": true
        },
        {
          "name": "GITHUB_TOKEN",
          "description": "GitHub token for repository tools",
          "isRequired": false,
          "format": "string",
          "isSecret": true
        }
      ]
    }
  ]
}
```

**Namespace rules:**
- GitHub auth grants `io.github.{username}/*` and `io.github.{org}/*`
- DNS domain verification grants custom namespaces (e.g., `com.nodebench/*`)
- Each version string must be unique; you cannot republish the same version

**URLs:**
- Registry: https://registry.modelcontextprotocol.io
- Quickstart: https://modelcontextprotocol.io/registry/quickstart
- GitHub: https://github.com/modelcontextprotocol/registry

---

### 1b. Smithery (smithery.ai)

A managed MCP registry with hosted infrastructure, OAuth modal generation, and CLI-based install.

**Submission process:**

1. Add a `smithery.yaml` to the repo root
2. Publish via CLI: `smithery mcp publish <url> -n <org/server>`

**smithery.yaml for NodeBench (stdio):**

```yaml
startCommand:
  type: stdio
configSchema:
  type: object
  properties:
    preset:
      type: string
      description: "Toolset preset (default, web_dev, research, data, devops, mobile, academic, multi_agent, content, full)"
      default: "full"
      enum: ["default", "web_dev", "research", "data", "devops", "mobile", "academic", "multi_agent", "content", "full"]
    geminiApiKey:
      type: string
      description: "Google Gemini API key for embedding search"
    openaiApiKey:
      type: string
      description: "OpenAI API key for embedding fallback"
    githubToken:
      type: string
      description: "GitHub token for repository tools"
commandFunction: |
  (config) => ({
    command: 'npx',
    args: ['-y', 'nodebench-mcp', '--preset', config.preset || 'full'],
    env: {
      ...(config.geminiApiKey ? { GEMINI_API_KEY: config.geminiApiKey } : {}),
      ...(config.openaiApiKey ? { OPENAI_API_KEY: config.openaiApiKey } : {}),
      ...(config.githubToken ? { GITHUB_TOKEN: config.githubToken } : {})
    }
  })
exampleConfig:
  preset: full
```

**Smithery CLI commands:**
```bash
smithery mcp list              # List your connections
smithery tool list [connection] # Search tools from connected servers
smithery mcp publish <url> -n homenshum/nodebench-mcp
```

**URLs:**
- Registry: https://smithery.ai
- Docs: https://smithery.ai/docs/build/project-config/smithery-yaml

---

### 1c. Glama (glama.ai)

The most comprehensive MCP directory. Synced with the awesome-mcp-servers GitHub repo.

**Submission process:**

1. Submit your server at https://glama.ai/mcp/servers (click "Add Server")
2. Ensure it passes all checks (Docker build, release exists)
3. Open a PR to https://github.com/punkpeye/awesome-mcp-servers
4. Entry name must use `owner/repo` format
5. Include the Glama link in the PR — PRs without a Glama link are closed after 7 days

**URLs:**
- Directory: https://glama.ai/mcp/servers
- awesome-mcp-servers: https://github.com/punkpeye/awesome-mcp-servers

---

### 1d. MCPCentral (mcpcentral.io)

Community registry with its own submit flow, also uses `mcp-publisher`.

**Submission:**
```bash
mcp-publisher login github --registry https://registry.mcpcentral.io
mcp-publisher publish
```

**URL:** https://mcpcentral.io/submit-server

---

## 2. Claude Code MCP Configuration

### 2a. `.mcp.json` (project-scoped, committed to repo)

Place at the **repo root**. Claude Code auto-discovers it. This is the primary distribution mechanism for team projects.

NodeBench already has this file at the repo root. Current contents define 7 servers including `nodebench`, `convex-auditor`, `openclaw`, `core-agent`, `gateway`, `nodebench-remote`, and `figma`.

**Format:**
```json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp", "--preset", "full"],
      "env": {
        "GEMINI_API_KEY": "${GEMINI_API_KEY}",
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

**Fields:**
- `command` (required): Executable — absolute path or PATH-available command
- `args` (optional): Array of CLI arguments
- `env` (optional): Environment variables; use `${VAR}` to reference system env vars

**Scopes in Claude Code:**
- **Project scope** (`.mcp.json` at repo root): Shared with all team members. Added via `claude mcp add --scope project`.
- **Local scope** (`~/.claude.json`): Private to the user. Default for `claude mcp add`.
- **User scope**: Available across all projects for the current user.

### 2b. `claude mcp add` commands

**Stdio server (local process):**
```bash
claude mcp add --scope project nodebench -- npx -y nodebench-mcp --preset full
```

**With environment variables:**
```bash
claude mcp add --scope project --env GEMINI_API_KEY=xxx nodebench -- npx -y nodebench-mcp --preset full
```

**HTTP server (remote):**
```bash
claude mcp add --transport http nodebench-remote https://nodebench-mcp-unified.onrender.com -H "x-mcp-token: ${MCP_HTTP_TOKEN}"
```

**Inline JSON config:**
```bash
claude mcp add-json nodebench '{"command":"npx","args":["-y","nodebench-mcp","--preset","full"],"env":{"GEMINI_API_KEY":"${GEMINI_API_KEY}"}}'
```

**Flag ordering:** All flags (`--transport`, `--env`, `--scope`, `--header`) must come BEFORE the server name. The `--` double-dash separates Claude Code flags from server command arguments.

**Other commands:**
```bash
claude mcp list          # List configured servers
claude mcp remove <name> # Remove a server
claude mcp serve         # Expose Claude Code itself as an MCP server
```

---

## 3. Cursor MCP Configuration

### 3a. File locations

- **Project-scoped:** `.cursor/mcp.json` in the project root
- **Global (all projects):** `~/.cursor/mcp.json` in the user's home directory

### 3b. Format

Identical `mcpServers` structure as Claude Code:

```json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp", "--preset", "full"],
      "env": {
        "GEMINI_API_KEY": "${env:GEMINI_API_KEY}",
        "OPENAI_API_KEY": "${env:OPENAI_API_KEY}"
      }
    }
  }
}
```

**Cursor-specific notes:**
- Environment variable syntax: `${env:VAR_NAME}` (different from Claude Code's `${VAR_NAME}`)
- Supports three transport types: `stdio` (default), `sse`, and `streamable-http`
- Remote HTTP servers use a `url` field instead of `command`/`args`:

```json
{
  "mcpServers": {
    "nodebench-remote": {
      "url": "https://nodebench-mcp-unified.onrender.com",
      "headers": {
        "x-mcp-token": "${env:MCP_HTTP_TOKEN}"
      }
    }
  }
}
```

### 3c. Cursor setup via Settings UI

Users can also add MCP servers through: Cursor Settings > MCP > Add new global MCP server.

**Docs:** https://docs.cursor.com/context/model-context-protocol

---

## 4. The `.mcp.json` Standard

The `.mcp.json` file at the repo root is an **emergent standard** adopted by multiple clients:

| Client | Auto-discovers `.mcp.json` at repo root? | Alternative location |
|--------|------------------------------------------|---------------------|
| Claude Code | Yes | `~/.claude.json` (user-scoped) |
| Cursor | No (uses `.cursor/mcp.json`) | `~/.cursor/mcp.json` (global) |
| VS Code (Copilot) | Yes (`.vscode/mcp.json`) | Settings UI |
| Agent SDK | Yes (project root) | Programmatic via `query()` |

**Required fields:** `mcpServers` object with at least one server entry containing `command` + `args` (stdio) or `url` (HTTP).

**Best practice for maximum compatibility:** Ship BOTH:
1. `.mcp.json` at repo root (Claude Code, Agent SDK)
2. `.cursor/mcp.json` (Cursor)

---

## 5. npx-Based Distribution Patterns

All official `@modelcontextprotocol/*` servers follow this pattern:

```json
{
  "command": "npx",
  "args": ["-y", "@scope/package-name", ...additional-args]
}
```

**The `-y` flag** auto-confirms the npx install prompt (critical for non-interactive MCP clients).

**Examples from the ecosystem:**

| Package | Config |
|---------|--------|
| `@modelcontextprotocol/server-filesystem` | `"args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]` |
| `@modelcontextprotocol/server-github` | `"args": ["-y", "@modelcontextprotocol/server-github"]` + `env: { GITHUB_TOKEN }` |
| `@modelcontextprotocol/server-memory` | `"args": ["-y", "@modelcontextprotocol/server-memory"]` |
| `@modelcontextprotocol/server-sequential-thinking` | `"args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]` |
| `@bytebase/dbhub` | `"args": ["-y", "@bytebase/dbhub", "--dsn", "..."]` |

**NodeBench follows this pattern exactly:**
```json
"args": ["-y", "nodebench-mcp", "--preset", "full"]
```

**Key distribution principles:**
- Package must be published on npm
- Must work with `npx -y` (no interactive prompts, no global install required)
- All config via `--flags` and environment variables
- Stdio transport is default and most compatible

---

## 6. One-Liner Install Commands

### For Claude Code users:

```bash
# Minimal (default 81 tools)
claude mcp add nodebench -- npx -y nodebench-mcp

# Full toolset (304 tools)
claude mcp add nodebench -- npx -y nodebench-mcp --preset full

# With API keys for embedding search
claude mcp add --env GEMINI_API_KEY=your-key nodebench -- npx -y nodebench-mcp --preset full

# Project-scoped (commits to .mcp.json for the whole team)
claude mcp add --scope project nodebench -- npx -y nodebench-mcp --preset full

# Inline JSON variant
claude mcp add-json nodebench '{"command":"npx","args":["-y","nodebench-mcp","--preset","full"]}'
```

### For Cursor users:

```bash
# Add to project config (.cursor/mcp.json)
# Cursor does not have a CLI — users add via Settings UI or edit the JSON file directly

# Create .cursor/mcp.json:
cat > .cursor/mcp.json << 'EOF'
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp", "--preset", "full"]
    }
  }
}
EOF
```

### Universal installer (add-mcp):

```bash
# Install to both Claude Code and Cursor in one command
npx add-mcp nodebench-mcp -a cursor -a claude-code
```

**Source:** https://neon.com/blog/add-mcp

### Via Smithery:

```bash
npx -y @smithery/cli@latest run nodebench-mcp
```

---

## 7. Vercel SPA Routing (Rewrites for Client-Side Routes)

### The Problem

React SPAs with client-side routing (React Router) return 404 when users directly navigate to routes like `/founder/dashboard` because Vercel looks for a physical file at that path.

### The Solution

Add a catch-all rewrite in `vercel.json` that sends all requests to `index.html`, letting React Router handle routing.

### Current NodeBench `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "routes": [
    {
      "handle": "filesystem"
    },
    {
      "src": "/.*",
      "dest": "/index.html"
    }
  ]
}
```

**Status: Already configured correctly.** The `"handle": "filesystem"` directive serves static assets (JS, CSS, images) directly, and the `"/.*"` catch-all sends everything else to `index.html`.

### Modern alternative (rewrites syntax):

```json
{
  "buildCommand": "npm run build",
  "rewrites": [
    { "source": "/:path*", "destination": "/index.html" }
  ]
}
```

Both the `routes` (legacy) and `rewrites` (modern) approaches work. The current `routes` config is functionally equivalent and correct.

### Vercel docs reference:

The `"handle": "filesystem"` pattern is the recommended approach for SPAs — it tries to serve real files first, then falls back to `index.html`.

---

## Action Items for NodeBench Distribution

### Priority 1: Immediate (ship this week)

- [ ] Publish `nodebench-mcp` to npm (already done, verify latest version)
- [ ] Create `server.json` in `packages/mcp-local/` for official MCP registry
- [ ] Run `mcp-publisher login github && mcp-publisher publish`
- [ ] Add `smithery.yaml` to repo root
- [ ] Create `.cursor/mcp.json` for Cursor auto-discovery (mirror of `.mcp.json` with `${env:VAR}` syntax)

### Priority 2: This sprint

- [ ] Submit to Glama at https://glama.ai/mcp/servers
- [ ] Open PR to https://github.com/punkpeye/awesome-mcp-servers with Glama link
- [ ] Submit to MCPCentral at https://mcpcentral.io/submit-server
- [ ] Add one-liner install commands to README and landing page

### Priority 3: Next sprint

- [ ] Set up GitHub Actions workflow for automated registry publishing on npm release
- [ ] Add `add-mcp` support for universal one-command install
- [ ] Consider Smithery hosted deployment for managed remote access
- [ ] Explore VS Code MCP support (`.vscode/mcp.json`)

---

## Quick Reference: What Goes Where

| File | Location | Purpose | Committed? |
|------|----------|---------|-----------|
| `.mcp.json` | Repo root | Claude Code project config | Yes |
| `.cursor/mcp.json` | Repo root | Cursor project config | Yes |
| `server.json` | `packages/mcp-local/` | Official MCP Registry metadata | Yes |
| `smithery.yaml` | Repo root | Smithery registry config | Yes |
| `vercel.json` | Repo root | Vercel SPA routing | Yes |
| `~/.claude.json` | User home | Claude Code user-scoped config | No (personal) |
| `~/.cursor/mcp.json` | User home | Cursor global config | No (personal) |
