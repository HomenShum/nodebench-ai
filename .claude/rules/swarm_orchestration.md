---
name: orchestrating-swarms
description: Master multi-agent orchestration using Claude Code's TeammateTool and Task system. Use when coordinating multiple agents, running parallel code reviews, creating pipeline workflows with dependencies, building self-organizing task queues, or any task benefiting from divide-and-conquer patterns.
related_: process, self_direction, flywheel_continuous, completion_traceability
---

# Claude Code Swarm Orchestration

Master multi-agent orchestration using Claude Code's TeammateTool and Task system.

---

## Primitives

| Primitive | What It Is | File Location |
|-----------|-----------|---------------|
| **Agent** | A Claude instance that can use tools. You are an agent. Subagents are agents you spawn. | N/A (process) |
| **Team** | A named group of agents working together. One leader, multiple teammates. | `~/.claude/teams/{name}/config.json` |
| **Teammate** | An agent that joined a team. Has a name, color, inbox. Spawned via Task with `team_name` + `name`. | Listed in team config |
| **Leader** | The agent that created the team. Receives teammate messages, approves plans/shutdowns. | First member in config |
| **Task** | A work item with subject, description, status, owner, and dependencies. | `~/.claude/tasks/{team}/N.json` |
| **Inbox** | JSON file where an agent receives messages from teammates. | `~/.claude/teams/{name}/inboxes/{agent}.json` |
| **Message** | A JSON object sent between agents. Can be text or structured (shutdown_request, idle_notification, etc). | Stored in inbox files |
| **Backend** | How teammates run. Auto-detected: `in-process` (same Node.js, invisible), `tmux` (separate panes, visible), `iterm2` (split panes in iTerm2). | Auto-detected based on environment |

---

## Two Ways to Spawn Agents

### Method 1: Task Tool (Subagents) — short-lived, returns result
```javascript
Task({ subagent_type: "Explore", description: "Find auth files", prompt: "...", model: "haiku" })
```

### Method 2: Task + team_name + name (Teammates) — persistent, communicates via inbox
```javascript
Teammate({ operation: "spawnTeam", team_name: "my-project" })
Task({ team_name: "my-project", name: "security-reviewer", subagent_type: "security-sentinel", prompt: "...", run_in_background: true })
```

| Aspect | Task (subagent) | Task + team_name + name (teammate) |
|--------|-----------------|-----------------------------------|
| Lifespan | Until task complete | Until shutdown requested |
| Communication | Return value | Inbox messages |
| Task access | None | Shared task list |
| Team membership | No | Yes |

---

## Built-in Agent Types

- **Bash** — command execution, git ops
- **Explore** — read-only codebase search (use `model: "haiku"` for speed)
- **Plan** — architecture + implementation plans (read-only)
- **general-purpose** — all tools, multi-step research + action
- **claude-code-guide** — questions about Claude Code, Agent SDK, Anthropic API
- **statusline-setup** — configure Claude Code status line

---

## TeammateTool Operations (13 ops)

| Operation | Who | What |
|-----------|-----|------|
| `spawnTeam` | Leader | Create team + task directory |
| `discoverTeams` | Anyone | List joinable teams |
| `requestJoin` | Teammate | Request to join existing team |
| `approveJoin` | Leader | Accept join request |
| `rejectJoin` | Leader | Decline join request |
| `write` | Anyone | Message one teammate |
| `broadcast` | Anyone | Message ALL teammates (expensive — N messages) |
| `requestShutdown` | Leader | Ask teammate to exit |
| `approveShutdown` | Teammate | Accept shutdown — **MUST call**, then process exits |
| `rejectShutdown` | Teammate | Decline shutdown with reason |
| `approvePlan` | Leader | Approve plan_approval_request |
| `rejectPlan` | Leader | Reject plan with feedback |
| `cleanup` | Leader | Remove team + task files (requires all teammates shut down first) |

---

## Task System

```javascript
TaskCreate({ subject: "Step 1", description: "...", activeForm: "Working on step 1..." })
TaskList()                                             // See all tasks + status
TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })      // Set dependency — auto-unblocks when #1 completes
TaskUpdate({ taskId: "2", owner: "worker-1", status: "in_progress" })
TaskUpdate({ taskId: "2", status: "completed" })
```

---

## Orchestration Patterns

### Pattern 1: Parallel Specialists
Multiple reviewers run simultaneously, send findings to leader inbox.
```javascript
Teammate({ operation: "spawnTeam", team_name: "pr-review" })
Task({ team_name: "pr-review", name: "security", subagent_type: "...", prompt: "...", run_in_background: true })
Task({ team_name: "pr-review", name: "perf",     subagent_type: "...", prompt: "...", run_in_background: true })
// Collect from: ~/.claude/teams/pr-review/inboxes/team-lead.json
```

### Pattern 2: Pipeline (Sequential Dependencies)
```javascript
TaskCreate({ subject: "Research" })    // #1
TaskCreate({ subject: "Plan" })        // #2
TaskCreate({ subject: "Implement" })   // #3
TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })
TaskUpdate({ taskId: "3", addBlockedBy: ["2"] })
// Spawn workers that poll TaskList and claim unblocked tasks
```

### Pattern 3: Self-Organizing Swarm
```javascript
// Create N independent tasks (no dependencies)
// Spawn M workers with this prompt loop:
// 1. TaskList → find pending+unclaimed
// 2. TaskUpdate(claim) → TaskUpdate(in_progress) → do work
// 3. TaskUpdate(completed) → write findings to team-lead → repeat
```

### Pattern 4: Research → Implement (synchronous)
```javascript
const research = await Task({ subagent_type: "general-purpose", prompt: "Research X..." })
Task({ subagent_type: "general-purpose", prompt: `Implement based on: ${research.content}` })
```

---

## Shutdown Sequence (always follow)
```javascript
Teammate({ operation: "requestShutdown", target_agent_id: "worker-1" })
// Wait for {"type": "shutdown_approved"} in inbox
Teammate({ operation: "cleanup" })  // Only AFTER all teammates approved shutdown
```

---

## Spawn Backends

| Backend | When | Visibility |
|---------|------|------------|
| `in-process` | Not in tmux/iTerm2 (default) | Hidden — no real-time output |
| `tmux` | Inside tmux session | Visible — switch panes |
| `iterm2` | In iTerm2 with `it2` CLI | Visible — split panes |

Force a backend: `export CLAUDE_CODE_SPAWN_BACKEND=tmux`

---

## Best Practices
- **Names**: Use meaningful names (`security-reviewer` not `worker-1`)
- **Prompts**: Numbered steps, explicit "send findings to team-lead via Teammate write"
- **Dependencies**: Use `addBlockedBy` — don't poll manually in prompts
- **broadcast**: Avoid — sends N messages. Use `write` for targeted communication
- **Cleanup**: Always call — don't leave orphaned teams
- **Failures**: Workers have 5-min heartbeat timeout; tasks of crashed workers can be reclaimed

---

## Quick Reference

```javascript
// Spawn subagent (no team, returns result)
Task({ subagent_type: "Explore", description: "Find files", prompt: "..." })

// Spawn teammate (persistent, background)
Teammate({ operation: "spawnTeam", team_name: "my-team" })
Task({ team_name: "my-team", name: "worker", subagent_type: "general-purpose", prompt: "...", run_in_background: true })

// Message teammate
Teammate({ operation: "write", target_agent_id: "worker-1", value: "..." })

// Pipeline tasks
TaskCreate({ subject: "Step 1" })  // → #1
TaskCreate({ subject: "Step 2" })  // → #2
TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })

// Shutdown
Teammate({ operation: "requestShutdown", target_agent_id: "worker-1" })
// wait for approval...
Teammate({ operation: "cleanup" })
```

---

*Source: kieranklaassen/orchestrating-swarms gist — Claude Code v2.1.19, verified 2026-01-25*
