# Capability Acquisition Protocol (CAP)

## Purpose

When an MCP agent encounters a task it cannot complete with its current toolset, it must NOT silently fail or hallucinate a workaround. Instead, it follows this protocol to acquire or bootstrap the missing capability.

## Protocol Steps

### 1. Detect Missing Capability
- Agent attempts a task and discovers no tool exists for it
- Agent runs `convex_discover_tools` with the task description
- If no matching tool is found, proceed to step 2

### 2. Search Existing Knowledge
- Run `convex_search_gotchas` for related patterns
- Check if the capability was previously attempted and documented
- If a workaround exists in the gotcha DB, use it and skip to step 5

### 3. Request Capability (Self-Instruct)
The agent generates a capability request with:
```json
{
  "missingCapability": "description of what is needed",
  "taskContext": "what the agent was trying to do",
  "proposedToolSpec": {
    "name": "convex_<suggested_name>",
    "description": "what it would do",
    "inputSchema": {},
    "expectedOutput": "what it would return"
  },
  "workaroundUsed": "what the agent did instead (if anything)",
  "priority": "critical | high | medium | low"
}
```

### 4. Fallback Strategy
While the capability is being developed:
- **Critical**: Block and report to the user — cannot proceed safely
- **High**: Use manual steps (raw file reads, grep patterns) and document the workaround
- **Medium**: Skip the specific check and note it as a gap
- **Low**: Proceed without the capability and record as improvement suggestion

### 5. Record Learning
Always run `convex_record_gotcha` with:
- Key: `cap_<capability_name>`
- Category: `pattern`
- Content: What was needed, what was done, and what tool should be built
- Tags: `capability,acquisition,<domain>`

## Enforcement

### In Eval Harness
The `compounding.knowledgeReuseRate` scorecard metric tracks:
- Did the agent search gotchas before implementing? (knowledge reuse)
- Did the agent record new gotchas after discovering edge cases? (knowledge banking)
- Did the agent file a capability request when stuck? (self-improvement)

### In CI Gate
The nightly regression workflow checks:
- New capability requests since last run
- Unresolved capability gaps older than 7 days
- Workarounds that should have been promoted to tools

## Examples

### Example 1: Missing Convex Component Analysis
```
Agent needs to analyze Convex component imports (convex.config.ts)
→ Runs convex_discover_tools("component analysis") → no match
→ Uses raw file read as workaround
→ Records: convex_record_gotcha({
    key: "cap_component_analysis",
    content: "No tool exists to analyze Convex component imports...",
    category: "pattern",
    tags: "capability,acquisition,component"
  })
```

### Example 2: Missing Cron Job Validation
```
Agent needs to validate cron.ts scheduling syntax
→ Runs convex_discover_tools("cron validate schedule") → no match
→ Falls back to regex pattern matching
→ Records gotcha with proposed tool spec
→ Next eval run detects the gap and scores the agent's response
```

## Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| Cap requests filed | 100% when stuck | Agent always files when no tool exists |
| Workaround documented | 100% | Every fallback is recorded as a gotcha |
| Time to tool promotion | <14 days | Workarounds become real tools within 2 weeks |
| Knowledge reuse rate | >80% | Agents search before implementing |
