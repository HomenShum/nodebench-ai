# Usage Report

Track Claude Code token usage and costs using ccusage.

## Commands

### Daily usage report
```bash
npx ccusage@latest daily
```

### Today's usage
```bash
npx ccusage@latest daily --since $(date +%Y%m%d)
```

### This week's usage
```bash
npx ccusage@latest weekly
```

### Monthly summary
```bash
npx ccusage@latest monthly
```

### Session-level breakdown
```bash
npx ccusage@latest session
```

### 5-hour billing blocks (matches Claude billing cycle)
```bash
npx ccusage@latest blocks
```

### With model breakdown
```bash
npx ccusage@latest daily --breakdown
```

### JSON export (for tracking over time)
```bash
npx ccusage@latest daily --json > docs/usage/usage-$(date +%Y%m%d).json
```

### Compact format (for screenshots)
```bash
npx ccusage@latest daily --compact
```

## What it tracks

- Input/output tokens per session
- Cost in USD (computed from token counts)
- Model breakdown (Opus, Sonnet, Haiku)
- Cache tokens (creation + read, tracked separately)
- 5-hour billing windows

## Data source

Reads local JSONL files from `~/.claude/projects/`. No API key needed.
