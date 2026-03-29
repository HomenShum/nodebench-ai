# NodeBench 60-Second Demo Video Script

## Format
- Screen recording of terminal + browser side-by-side
- No voiceover needed — text overlays
- 1920x1080, dark theme

## Shot List

### 0:00-0:05 — Hook
**Text overlay:** "What if your AI agent had 350 tools and knew which ones to use?"
**Screen:** Empty terminal, cursor blinking

### 0:05-0:12 — Install
**Text overlay:** "One command to install"
**Terminal:** `curl -sL nodebenchai.com/install.sh | bash`
Show install output: rules copied, health check passes, preset selected

### 0:12-0:20 — Discovery
**Text overlay:** "Ask what you need. It finds the right tools."
**Terminal (in Claude Code):**
```
> discover_tools('investigate a company for due diligence')
```
Show: ranked results with scores, quick refs, workflow chains

### 0:20-0:30 — Load & Run
**Text overlay:** "40 founder tools activate on demand"
**Terminal:**
```
> load_toolset('founder')
> site_map({ url: 'https://anthropic.com' })
```
Show: crawl results — 6 screens, 42 elements, 0 findings

### 0:30-0:40 — Interactive Drill-down
**Text overlay:** "Explore interactively. No browser needed."
**Terminal:**
```
> site_map({ action: 'screen', index: 0 })
> site_map({ action: 'findings' })
```
Show: page details, QA findings with severity

### 0:40-0:50 — QA Loop
**Text overlay:** "Before/after proof. Test suggestions. ROI tracking."
**Terminal:**
```
> diff_crawl({ url: '...' })
> suggest_tests({ session_id: '...' })
> compare_savings()
```
Show: diff results, generated test cases, savings report

### 0:50-0:60 — Close
**Text overlay:**
```
NodeBench
350 tools. Progressive discovery.
Memory that compounds.

npx nodebench-mcp
```
**Screen:** NodeBench logo + GitHub URL

## Production notes
- Use Remotion or OBS for recording
- Terminal font: JetBrains Mono 14px
- Background: #151413 (NodeBench dark)
- Accent color: #d97757 (terracotta)
- Text overlays: Manrope Bold, white on semi-transparent dark
