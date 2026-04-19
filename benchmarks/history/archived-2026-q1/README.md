# Benchmarks (Postable)

These benchmarks are designed to be directly aligned with what NodeBench AI does in production and safe to share as a public artifact.

## What we measure

- **MCP E2E (MCP-1/4/5):**
  - Core-agent MCP: planning + memory roundtrip
  - OpenBB MCP: list tools + execute representative tools
  - Research MCP: list tools + run `fusion_search`
  - Public provider checks: OpenAI/Anthropic/Gemini model list + YouTube + (optional) Linkup

- **System E2E:**
  - Daily Brief workflow generates + appends to Landing Log
  - Fast Agent Panel local-context injection compliance (now/timezone/location/trends)
  - Anonymous QA suite (ground-truth + deterministic evaluator)

## How to run

From PowerShell:

```powershell
$env:CONVEX_URL=(Get-Content .env.local | Where-Object { $_ -match '^VITE_CONVEX_URL=' } | Select-Object -First 1).Split('=',2)[1].Trim()
$env:MCP_SECRET=(npx convex env get MCP_SECRET).Trim()

npm run bench:postable -- --iterations 5 --include-linkup
```

Outputs:
- `docs/architecture/benchmarks/benchmark-report-latest.md`
- `docs/architecture/benchmarks/benchmark-report-latest.json`

## Cost controls

- Skip Linkup: add `--no-linkup`
- Skip persona live eval (default): omit `--include-persona`
- Reduce iterations: `--iterations 3`

