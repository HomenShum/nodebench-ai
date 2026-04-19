# NodeBench Demo Script (60 seconds)

## Recording Setup
- Browser: Chrome, 1280x800 viewport
- URL: https://www.nodebenchai.com
- Clear localStorage + service workers before recording
- Record with OBS or Loom

## Script

### Scene 1: Landing (0-5s)
Show the landing page. Read aloud:
> "Every investor has a checklist. You've never seen it."

### Scene 2: Search (5-20s)
Click the "Analyze Anthropic's competitive position" chip.
Wait for results. Show:
- Chat thread with user bubble + assistant response
- Entity: Anthropic, 85% confidence
- Signals (Enterprise Market Share Growth)
- Risks (Market Concentration)
- Comparables (OpenAI)
- Trace: "Planning strategy → Running tools in parallel → Synthesizing packet"

### Scene 3: Full Profile (20-30s)
Click "Full profile" on the Anthropic result.
Show the expanded 10-section company profile:
- Overview with key metrics
- VC Scorecard
- What Changed
- Risk Register
- Competitive Landscape

### Scene 4: Multi-Entity (30-40s)
Click "New conversation"
Click "Compare Stripe vs Square in payments"
Show the multi-entity comparison result

### Scene 5: Dashboard (40-50s)
Click "Dashboard" in sidebar
Show Overview tab with signals feed
Click "Strategy" tab — show strategy comparison cards
Click "Profiler" tab — show the 4 operating intelligence cards

### Scene 6: Install (50-60s)
Scroll to install section on landing page. Show:
```
claude mcp add nodebench -- npx -y nodebench-mcp --preset=hackathon
```
End card: "NodeBench — Operating Intelligence for Founders"
URL: nodebenchai.com | GitHub: github.com/HomenShum/nodebench-ai

## Key talking points
- "Type your idea. See what investors will ask."
- "Agent harness plans which tools to call, runs them in parallel"
- "Every tool call is profiled — cost, latency, redundancy"
- "Works with Claude Code, Cursor, Windsurf — one command"
- "350+ MCP tools, multi-model (Gemini, OpenAI, Anthropic)"
