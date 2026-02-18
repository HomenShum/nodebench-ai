---
name: orchestrating-swarms
description: Master multi-agent orchestration using Claude Code's TeammateTool and Task system. Use when coordinating multiple agents, running parallel code reviews, creating pipeline workflows with dependencies, building self-organizing task queues, or any task benefiting from divide-and-conquer patterns.
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
| **Backend** | How teammates run. Auto-detected: `in-process` (same Node.js, invisible), `tmux` (separate panes, visible), `iterm2` (split panes in iTerm2). See [Spawn Backends](#spawn-backends). | Auto-detected based on environment |

### How They Connect

```
TEAM:
  Leader (you) <--> messages via inbox <--> Teammate 1
  Leader (you) <--> messages via inbox <--> Teammate 2
  Teammate 1 <-.-> can message <-.-> Teammate 2

TASK LIST:
  #1 completed: Research      (owner: teammate1)
  #2 in_progress: Implement   (owner: teammate2)
  #3 pending: Test            (blocked by #2)
```

### Lifecycle

```
1. Create Team → 2. Create Tasks → 3. Spawn Teammates → 4. Work → 5. Coordinate → 6. Shutdown → 7. Cleanup
```

---

## Two Ways to Spawn Agents

### Method 1: Task Tool (Subagents)

Use Task for **short-lived, focused work** that returns a result:

```javascript
Task({
  subagent_type: "Explore",
  description: "Find auth files",
  prompt: "Find all authentication-related files in this codebase",
  model: "haiku"  // Optional: haiku, sonnet, opus
})
```

**Characteristics:**
- Runs synchronously (blocks until complete) or async with `run_in_background: true`
- Returns result directly to you
- No team membership required
- Best for: searches, analysis, focused research

### Method 2: Task Tool + team_name + name (Teammates)

Use Task with `team_name` and `name` to **spawn persistent teammates**:

```javascript
// First create a team
Teammate({ operation: "spawnTeam", team_name: "my-project" })

// Then spawn a teammate into that team
Task({
  team_name: "my-project",        // Required: which team to join
  name: "security-reviewer",      // Required: teammate's name
  subagent_type: "general-purpose",
  prompt: "Review all authentication code for vulnerabilities. Send findings to team-lead via Teammate write.",
  run_in_background: true         // Teammates usually run in background
})
```

**Characteristics:**
- Joins team, appears in `config.json`
- Communicates via inbox messages
- Can claim tasks from shared task list
- Persists until shutdown
- Best for: parallel work, ongoing collaboration, pipeline stages

### Key Difference

| Aspect | Task (subagent) | Task + team_name + name (teammate) |
|--------|-----------------|-----------------------------------|
| Lifespan | Until task complete | Until shutdown requested |
| Communication | Return value | Inbox messages |
| Task access | None | Shared task list |
| Team membership | No | Yes |
| Coordination | One-off | Ongoing |

---

## Built-in Agent Types

### Bash
```javascript
Task({
  subagent_type: "Bash",
  description: "Run git commands",
  prompt: "Check git status and show recent commits"
})
```
- **Tools:** Bash only
- **Best for:** Git operations, command execution, system tasks

### Explore
```javascript
Task({
  subagent_type: "Explore",
  description: "Find API endpoints",
  prompt: "Find all API endpoints in this codebase. Be very thorough.",
  model: "haiku"  // Fast and cheap
})
```
- **Tools:** All read-only tools (no Edit, Write, NotebookEdit, Task)
- **Best for:** Codebase exploration, file searches, code understanding
- **Thoroughness levels:** "quick", "medium", "very thorough"

### Plan
```javascript
Task({
  subagent_type: "Plan",
  description: "Design auth system",
  prompt: "Create an implementation plan for adding OAuth2 authentication"
})
```
- **Tools:** All read-only tools
- **Best for:** Architecture planning, implementation strategies

### general-purpose
```javascript
Task({
  subagent_type: "general-purpose",
  description: "Research and implement",
  prompt: "Research React Query best practices and implement caching for the user API"
})
```
- **Tools:** All tools (*)
- **Best for:** Multi-step tasks, research + action combinations

### claude-code-guide
```javascript
Task({
  subagent_type: "claude-code-guide",
  description: "Help with Claude Code",
  prompt: "How do I configure MCP servers?"
})
```
- **Tools:** Read-only + WebFetch + WebSearch
- **Best for:** Questions about Claude Code, Agent SDK, Anthropic API

### statusline-setup
```javascript
Task({
  subagent_type: "statusline-setup",
  description: "Configure status line",
  prompt: "Set up a status line showing git branch and node version"
})
```
- **Tools:** Read, Edit only
- **Best for:** Configuring Claude Code status line

---

## Plugin Agent Types

From the `compound-engineering` plugin (examples):

### Review Agents
```javascript
// Security review
Task({ subagent_type: "compound-engineering:review:security-sentinel", ... })
// Performance review
Task({ subagent_type: "compound-engineering:review:performance-oracle", ... })
// Architecture review
Task({ subagent_type: "compound-engineering:review:architecture-strategist", ... })
// Code simplicity
Task({ subagent_type: "compound-engineering:review:code-simplicity-reviewer", ... })
// Rails review
Task({ subagent_type: "compound-engineering:review:kieran-rails-reviewer", ... })
```

**All review agents from compound-engineering:**
- `agent-native-reviewer` — Ensures features work for agents too
- `architecture-strategist` — Architectural compliance
- `code-simplicity-reviewer` — YAGNI and minimalism
- `data-integrity-guardian` — Database and data safety
- `data-migration-expert` — Migration validation
- `deployment-verification-agent` — Pre-deploy checklists
- `dhh-rails-reviewer` — DHH/37signals Rails style
- `julik-frontend-races-reviewer` — JavaScript race conditions
- `kieran-python-reviewer` — Python best practices
- `kieran-rails-reviewer` — Rails best practices
- `kieran-typescript-reviewer` — TypeScript best practices
- `pattern-recognition-specialist` — Design patterns and anti-patterns
- `performance-oracle` — Performance analysis
- `security-sentinel` — Security vulnerabilities

### Research Agents
```javascript
Task({ subagent_type: "compound-engineering:research:best-practices-researcher", ... })
Task({ subagent_type: "compound-engineering:research:framework-docs-researcher", ... })
Task({ subagent_type: "compound-engineering:research:git-history-analyzer", ... })
```

**All research agents:**
- `best-practices-researcher` — External best practices
- `framework-docs-researcher` — Framework documentation
- `git-history-analyzer` — Code archaeology
- `learnings-researcher` — Search docs/solutions
- `repo-research-analyst` — Repository patterns

---

## TeammateTool Operations

### 1. spawnTeam — Create a Team

```javascript
Teammate({
  operation: "spawnTeam",
  team_name: "feature-auth",
  description: "Implementing OAuth2 authentication"
})
```

Creates `~/.claude/teams/feature-auth/config.json` and task directory. You become team leader.

### 2. discoverTeams — List Available Teams

```javascript
Teammate({ operation: "discoverTeams" })
```

Returns list of teams you can join (not already a member of).

### 3. requestJoin — Request to Join Team

```javascript
Teammate({
  operation: "requestJoin",
  team_name: "feature-auth",
  proposed_name: "helper",
  capabilities: "I can help with code review and testing"
})
```

### 4. approveJoin — Accept Join Request (Leader Only)

```javascript
Teammate({
  operation: "approveJoin",
  target_agent_id: "helper",
  request_id: "join-123"
})
```

### 5. rejectJoin — Decline Join Request (Leader Only)

```javascript
Teammate({
  operation: "rejectJoin",
  target_agent_id: "helper",
  request_id: "join-123",
  reason: "Team is at capacity"
})
```

### 6. write — Message One Teammate

```javascript
Teammate({
  operation: "write",
  target_agent_id: "security-reviewer",
  value: "Please prioritize the authentication module. The deadline is tomorrow."
})
```

**Important for teammates:** Your text output is NOT visible to the team. You MUST use `write` to communicate.

### 7. broadcast — Message ALL Teammates

```javascript
Teammate({
  operation: "broadcast",
  name: "team-lead",
  value: "Status check: Please report your progress"
})
```

**WARNING:** Broadcasting sends N separate messages for N teammates. Prefer `write` to specific teammates.

**When to broadcast:** Critical issues requiring immediate attention, major announcements affecting everyone.
**When NOT to broadcast:** Responding to one teammate, normal back-and-forth, information relevant to only some.

### 8. requestShutdown — Ask Teammate to Exit (Leader Only)

```javascript
Teammate({
  operation: "requestShutdown",
  target_agent_id: "security-reviewer",
  reason: "All tasks complete, wrapping up"
})
```

### 9. approveShutdown — Accept Shutdown (Teammate Only)

When you receive a `shutdown_request` message, **MUST** call:

```javascript
Teammate({
  operation: "approveShutdown",
  request_id: "shutdown-123"
})
```

This sends confirmation and terminates your process.

### 10. rejectShutdown — Decline Shutdown (Teammate Only)

```javascript
Teammate({
  operation: "rejectShutdown",
  request_id: "shutdown-123",
  reason: "Still working on task #3, need 5 more minutes"
})
```

### 11. approvePlan — Approve Teammate's Plan (Leader Only)

```javascript
Teammate({
  operation: "approvePlan",
  target_agent_id: "architect",
  request_id: "plan-456"
})
```

### 12. rejectPlan — Reject Plan with Feedback (Leader Only)

```javascript
Teammate({
  operation: "rejectPlan",
  target_agent_id: "architect",
  request_id: "plan-456",
  feedback: "Please add error handling for the API calls and consider rate limiting"
})
```

### 13. cleanup — Remove Team Resources

```javascript
Teammate({ operation: "cleanup" })
```

Removes `~/.claude/teams/{team-name}/` and `~/.claude/tasks/{team-name}/`.
**IMPORTANT:** Will fail if teammates are still active. Use `requestShutdown` first.

---

## Task System Integration

### TaskCreate — Create Work Items

```javascript
TaskCreate({
  subject: "Review authentication module",
  description: "Review all files in app/services/auth/ for security vulnerabilities",
  activeForm: "Reviewing auth module..."  // Shown in spinner when in_progress
})
```

### TaskList — See All Tasks

```javascript
TaskList()
// Returns:
// #1 [completed] Analyze codebase structure
// #2 [in_progress] Review authentication module (owner: security-reviewer)
// #3 [pending] Generate summary report [blocked by #2]
```

### TaskGet — Get Task Details

```javascript
TaskGet({ taskId: "2" })
```

### TaskUpdate — Update Task Status

```javascript
TaskUpdate({ taskId: "2", owner: "security-reviewer" })  // Claim
TaskUpdate({ taskId: "2", status: "in_progress" })       // Start
TaskUpdate({ taskId: "2", status: "completed" })         // Complete
TaskUpdate({ taskId: "3", addBlockedBy: ["1", "2"] })    // Set dependencies
```

### Task Dependencies

When a blocking task completes, blocked tasks are automatically unblocked:

```javascript
TaskCreate({ subject: "Step 1: Research" })    // #1
TaskCreate({ subject: "Step 2: Implement" })   // #2
TaskCreate({ subject: "Step 3: Test" })        // #3
TaskCreate({ subject: "Step 4: Deploy" })      // #4

TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })
TaskUpdate({ taskId: "3", addBlockedBy: ["2"] })
TaskUpdate({ taskId: "4", addBlockedBy: ["3"] })
```

---

## Message Formats

### Regular Message
```json
{ "from": "team-lead", "text": "Please prioritize the auth module", "timestamp": "...", "read": false }
```

### Structured Messages (JSON in text field)

```json
// shutdown_request
{ "type": "shutdown_request", "requestId": "shutdown-abc123@worker-1", "from": "team-lead", "reason": "All tasks complete" }

// shutdown_approved
{ "type": "shutdown_approved", "requestId": "shutdown-abc123@worker-1", "from": "worker-1", "backendType": "in-process" }

// idle_notification (auto-sent when teammate stops)
{ "type": "idle_notification", "from": "worker-1", "completedTaskId": "2", "completedStatus": "completed" }

// task_completed
{ "type": "task_completed", "from": "worker-1", "taskId": "2", "taskSubject": "Review authentication module" }

// plan_approval_request
{ "type": "plan_approval_request", "from": "architect", "requestId": "plan-xyz789", "planContent": "# Implementation Plan..." }

// permission_request
{ "type": "permission_request", "requestId": "perm-123", "toolName": "Bash", "description": "Run npm install", "permissionSuggestions": ["Bash(npm *)"] }
```

---

## Orchestration Patterns

### Pattern 1: Parallel Specialists (Leader Pattern)

```javascript
Teammate({ operation: "spawnTeam", team_name: "code-review" })

// Spawn in single message for parallel execution
Task({ team_name: "code-review", name: "security", subagent_type: "compound-engineering:review:security-sentinel",
  prompt: "Review PR for security vulnerabilities. Focus on SQL injection, XSS, auth bypass. Send findings to team-lead.",
  run_in_background: true })
Task({ team_name: "code-review", name: "performance", subagent_type: "compound-engineering:review:performance-oracle",
  prompt: "Review PR for N+1 queries, memory leaks, slow algorithms. Send findings to team-lead.",
  run_in_background: true })
Task({ team_name: "code-review", name: "simplicity", subagent_type: "compound-engineering:review:code-simplicity-reviewer",
  prompt: "Review PR for over-engineering, premature abstraction, YAGNI violations. Send findings to team-lead.",
  run_in_background: true })

// Collect: cat ~/.claude/teams/code-review/inboxes/team-lead.json
// Synthesize, then:
Teammate({ operation: "requestShutdown", target_agent_id: "security" })
Teammate({ operation: "requestShutdown", target_agent_id: "performance" })
Teammate({ operation: "requestShutdown", target_agent_id: "simplicity" })
// Wait for approvals...
Teammate({ operation: "cleanup" })
```

### Pattern 2: Pipeline (Sequential Dependencies)

```javascript
Teammate({ operation: "spawnTeam", team_name: "feature-pipeline" })

TaskCreate({ subject: "Research", description: "Research best practices", activeForm: "Researching..." })
TaskCreate({ subject: "Plan",     description: "Create implementation plan", activeForm: "Planning..." })
TaskCreate({ subject: "Implement", description: "Implement the feature", activeForm: "Implementing..." })
TaskCreate({ subject: "Test",     description: "Write and run tests", activeForm: "Testing..." })
TaskCreate({ subject: "Review",   description: "Final code review", activeForm: "Reviewing..." })

TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })
TaskUpdate({ taskId: "3", addBlockedBy: ["2"] })
TaskUpdate({ taskId: "4", addBlockedBy: ["3"] })
TaskUpdate({ taskId: "5", addBlockedBy: ["4"] })

Task({ team_name: "feature-pipeline", name: "researcher", subagent_type: "compound-engineering:research:best-practices-researcher",
  prompt: "Claim task #1, research best practices, complete it, send findings to team-lead.",
  run_in_background: true })
// ... spawn implementer, tester, reviewer similarly
```

### Pattern 3: Swarm (Self-Organizing)

```javascript
Teammate({ operation: "spawnTeam", team_name: "file-review-swarm" })

// Create independent tasks (no dependencies)
for (const file of ["auth.rb", "user.rb", "api_controller.rb", "payment.rb"]) {
  TaskCreate({ subject: `Review ${file}`, description: `Review ${file} for issues`, activeForm: `Reviewing ${file}...` })
}

const swarmPrompt = `
  You are a swarm worker. Your job:
  1. Call TaskList to see available tasks
  2. Find a task with status 'pending' and no owner
  3. Claim it: TaskUpdate({ taskId: "X", owner: "$CLAUDE_CODE_AGENT_NAME" })
  4. Start: TaskUpdate({ taskId: "X", status: "in_progress" })
  5. Do the work
  6. Complete: TaskUpdate({ taskId: "X", status: "completed" })
  7. Send findings to team-lead via Teammate write
  8. Repeat until no tasks remain
`

Task({ team_name: "file-review-swarm", name: "worker-1", subagent_type: "general-purpose", prompt: swarmPrompt, run_in_background: true })
Task({ team_name: "file-review-swarm", name: "worker-2", subagent_type: "general-purpose", prompt: swarmPrompt, run_in_background: true })
Task({ team_name: "file-review-swarm", name: "worker-3", subagent_type: "general-purpose", prompt: swarmPrompt, run_in_background: true })
// Workers race to claim tasks, naturally load-balance
```

### Pattern 4: Research + Implementation

```javascript
const research = await Task({
  subagent_type: "compound-engineering:research:best-practices-researcher",
  description: "Research caching patterns",
  prompt: "Research best practices for implementing caching in Rails APIs."
})

Task({
  subagent_type: "general-purpose",
  description: "Implement caching",
  prompt: `Implement API caching based on this research:\n\n${research.content}\n\nFocus on user_controller.rb endpoints.`
})
```

### Pattern 5: Plan Approval Workflow

```javascript
Teammate({ operation: "spawnTeam", team_name: "careful-work" })

Task({ team_name: "careful-work", name: "architect", subagent_type: "Plan",
  prompt: "Design an implementation plan for adding OAuth2 authentication",
  mode: "plan",
  run_in_background: true })

// Wait for: {"type": "plan_approval_request", "from": "architect", "requestId": "plan-xxx"}
Teammate({ operation: "approvePlan", target_agent_id: "architect", request_id: "plan-xxx" })
// OR
Teammate({ operation: "rejectPlan", target_agent_id: "architect", request_id: "plan-xxx", feedback: "Add rate limiting" })
```

### Pattern 6: Coordinated Multi-File Refactoring

```javascript
Teammate({ operation: "spawnTeam", team_name: "refactor-auth" })

TaskCreate({ subject: "Refactor User model",        description: "Extract auth methods to concern", activeForm: "Refactoring User model..." })
TaskCreate({ subject: "Refactor Session controller", description: "Update to use concern",           activeForm: "Refactoring Sessions..." })
TaskCreate({ subject: "Update specs",                description: "Update auth specs",               activeForm: "Updating specs..." })

TaskUpdate({ taskId: "3", addBlockedBy: ["1", "2"] })  // Specs need both refactors done

Task({ team_name: "refactor-auth", name: "model-worker",      subagent_type: "general-purpose", prompt: "Claim task #1, refactor User model, complete.", run_in_background: true })
Task({ team_name: "refactor-auth", name: "controller-worker", subagent_type: "general-purpose", prompt: "Claim task #2, refactor Session controller, complete.", run_in_background: true })
Task({ team_name: "refactor-auth", name: "spec-worker",       subagent_type: "general-purpose", prompt: "Wait for task #3 to unblock, then update specs.", run_in_background: true })
```

---

## Environment Variables

Spawned teammates automatically receive:

```bash
CLAUDE_CODE_TEAM_NAME="my-project"
CLAUDE_CODE_AGENT_ID="worker-1@my-project"
CLAUDE_CODE_AGENT_NAME="worker-1"
CLAUDE_CODE_AGENT_TYPE="Explore"
CLAUDE_CODE_AGENT_COLOR="#4A90D9"
CLAUDE_CODE_PLAN_MODE_REQUIRED="false"
CLAUDE_CODE_PARENT_SESSION_ID="session-xyz"
```

Use in prompts: `"Your name is $CLAUDE_CODE_AGENT_NAME. Use it when messaging team-lead."`

---

## Spawn Backends

| Backend | When auto-selected | Visibility | Persistence |
|---------|-------------------|------------|-------------|
| `in-process` | Not in tmux/iTerm2 (default) | Hidden | Dies with leader |
| `tmux` | Inside tmux (`$TMUX` set), or tmux available | Visible — switch panes | Survives leader exit |
| `iterm2` | In iTerm2 + `it2` CLI installed | Visible — split panes | Dies with window |

**Auto-detection:** `$TMUX` set → tmux | `$TERM_PROGRAM=iTerm.app` + `it2` → iterm2 | else → in-process

**Force a backend:**
```bash
export CLAUDE_CODE_SPAWN_BACKEND=in-process  # fastest, no visibility
export CLAUDE_CODE_SPAWN_BACKEND=tmux        # visible, persistent
```

**iTerm2 setup:**
```bash
uv tool install it2        # install CLI
# Enable in iTerm2: Settings → General → Magic → Enable Python API
it2 --version              # verify
```

**Debugging backends:**
```bash
cat ~/.claude/teams/{team}/config.json | jq '.members[].backendType'
echo $TMUX                  # check if in tmux
which tmux && which it2     # check availability
```

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Cannot cleanup with active members" | Teammates still running | `requestShutdown` all teammates first, wait for approval |
| "Already leading a team" | Team already exists | `cleanup` first, or use different team name |
| "Agent not found" | Wrong teammate name | Check `config.json` for actual names |
| "Team does not exist" | No team created | Call `spawnTeam` first |
| "Agent type not found" | Invalid subagent_type | Check available agents with proper prefix |

### Graceful Shutdown Sequence

```javascript
// 1. Request shutdown for all teammates
Teammate({ operation: "requestShutdown", target_agent_id: "worker-1" })
Teammate({ operation: "requestShutdown", target_agent_id: "worker-2" })
// 2. Wait for {"type": "shutdown_approved"} in inbox
// 3. Verify no active members: cat ~/.claude/teams/{team}/config.json
// 4. Only then:
Teammate({ operation: "cleanup" })
```

### Handling Crashed Teammates

- 5-minute heartbeat timeout → auto-marked inactive
- Their tasks remain in task list, can be claimed by others
- Cleanup works after timeout expires

### Debugging

```bash
cat ~/.claude/teams/{team}/config.json | jq '.members[] | {name, agentType, backendType}'
cat ~/.claude/teams/{team}/inboxes/{agent}.json | jq '.'
cat ~/.claude/tasks/{team}/*.json | jq '{id, subject, status, owner, blockedBy}'
tail -f ~/.claude/teams/{team}/inboxes/team-lead.json
```

---

## Complete Workflows

### Workflow 1: Full Code Review with Parallel Specialists

```javascript
Teammate({ operation: "spawnTeam", team_name: "pr-review-123", description: "Reviewing PR #123" })

// Spawn in one message (parallel)
Task({ team_name: "pr-review-123", name: "security", subagent_type: "compound-engineering:review:security-sentinel",
  prompt: `Review PR #123 for security vulnerabilities (SQL injection, XSS, auth bypass, sensitive data exposure).
When done: Teammate({ operation: "write", target_agent_id: "team-lead", value: "Your findings here" })`,
  run_in_background: true })
Task({ team_name: "pr-review-123", name: "perf", subagent_type: "compound-engineering:review:performance-oracle",
  prompt: `Review PR #123 for N+1 queries, missing indexes, memory leaks. Send findings to team-lead.`,
  run_in_background: true })
Task({ team_name: "pr-review-123", name: "arch", subagent_type: "compound-engineering:review:architecture-strategist",
  prompt: `Review PR #123 for design patterns, SOLID principles, testability. Send findings to team-lead.`,
  run_in_background: true })

// Collect: cat ~/.claude/teams/pr-review-123/inboxes/team-lead.json
// Synthesize into PR review comment

Teammate({ operation: "requestShutdown", target_agent_id: "security" })
Teammate({ operation: "requestShutdown", target_agent_id: "perf" })
Teammate({ operation: "requestShutdown", target_agent_id: "arch" })
// Wait for approvals...
Teammate({ operation: "cleanup" })
```

### Workflow 2: Research → Plan → Implement → Test Pipeline

```javascript
Teammate({ operation: "spawnTeam", team_name: "feature-oauth" })

TaskCreate({ subject: "Research OAuth providers",   activeForm: "Researching..." })  // #1
TaskCreate({ subject: "Create implementation plan", activeForm: "Planning..." })      // #2
TaskCreate({ subject: "Implement OAuth",            activeForm: "Implementing..." })  // #3
TaskCreate({ subject: "Write tests",                activeForm: "Writing tests..." }) // #4
TaskCreate({ subject: "Final review",               activeForm: "Final review..." })  // #5

TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })
TaskUpdate({ taskId: "3", addBlockedBy: ["2"] })
TaskUpdate({ taskId: "4", addBlockedBy: ["3"] })
TaskUpdate({ taskId: "5", addBlockedBy: ["4"] })

Task({ team_name: "feature-oauth", name: "researcher",  subagent_type: "compound-engineering:research:best-practices-researcher",
  prompt: "Claim task #1. Research OAuth2 best practices. Complete and send summary to team-lead.", run_in_background: true })
Task({ team_name: "feature-oauth", name: "planner",     subagent_type: "Plan",
  prompt: "Wait for task #2 to unblock. Read research. Create implementation plan. Send to team-lead.", run_in_background: true })
Task({ team_name: "feature-oauth", name: "implementer", subagent_type: "general-purpose",
  prompt: "Wait for task #3. Implement OAuth2 per plan. Mark complete.", run_in_background: true })
Task({ team_name: "feature-oauth", name: "tester",      subagent_type: "general-purpose",
  prompt: "Wait for task #4. Write and run comprehensive tests. Send results to team-lead.", run_in_background: true })
Task({ team_name: "feature-oauth", name: "reviewer",    subagent_type: "compound-engineering:review:security-sentinel",
  prompt: "Wait for task #5. Security review complete OAuth implementation. Send final assessment.", run_in_background: true })
```

### Workflow 3: Self-Organizing Code Review Swarm

```javascript
Teammate({ operation: "spawnTeam", team_name: "codebase-review" })

const filesToReview = [
  "app/models/user.rb", "app/models/payment.rb",
  "app/controllers/api/v1/users_controller.rb",
  "app/services/payment_processor.rb",
  "lib/encryption_helper.rb"
]
for (const file of filesToReview) {
  TaskCreate({ subject: `Review ${file}`, description: `Review ${file} for security, quality, and performance`, activeForm: `Reviewing ${file}...` })
}

const swarmPrompt = `
You are a swarm worker. Continuously process available tasks:

LOOP:
1. TaskList() — find tasks with status: 'pending', no owner, not blocked
2. If found:
   - TaskUpdate({ taskId: "X", owner: "$CLAUDE_CODE_AGENT_NAME" })
   - TaskUpdate({ taskId: "X", status: "in_progress" })
   - Do the review
   - TaskUpdate({ taskId: "X", status: "completed" })
   - Teammate({ operation: "write", target_agent_id: "team-lead", value: "[findings]" })
   - Go to step 1
3. If no tasks: wait 30s, retry up to 3 times, then exit
`

Task({ team_name: "codebase-review", name: "worker-1", subagent_type: "general-purpose", prompt: swarmPrompt, run_in_background: true })
Task({ team_name: "codebase-review", name: "worker-2", subagent_type: "general-purpose", prompt: swarmPrompt, run_in_background: true })
Task({ team_name: "codebase-review", name: "worker-3", subagent_type: "general-purpose", prompt: swarmPrompt, run_in_background: true })
```

---

## Best Practices

1. **Always cleanup** — Don't leave orphaned teams
2. **Meaningful names** — `security-reviewer` not `worker-1`
3. **Clear prompts** — Numbered steps + explicit "send findings to team-lead via Teammate write"
4. **Use task dependencies** — `addBlockedBy` over manual polling
5. **Prefer `write` over `broadcast`** — N messages for N teammates is expensive
6. **Handle worker failures** — Build retry logic into worker prompts (5-min heartbeat timeout)
7. **Match agent type to task** — Explore for search, Plan for architecture, general-purpose for implementation

---

## Quick Reference

```javascript
// Subagent (returns result)
Task({ subagent_type: "Explore", description: "Find files", prompt: "..." })

// Teammate (persistent, background)
Teammate({ operation: "spawnTeam", team_name: "my-team" })
Task({ team_name: "my-team", name: "worker", subagent_type: "general-purpose", prompt: "...", run_in_background: true })

// Message teammate
Teammate({ operation: "write", target_agent_id: "worker-1", value: "..." })

// Pipeline
TaskCreate({ subject: "Step 1" })   // → #1
TaskCreate({ subject: "Step 2" })   // → #2
TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })

// Shutdown
Teammate({ operation: "requestShutdown", target_agent_id: "worker-1" })
// wait for {"type": "shutdown_approved"}...
Teammate({ operation: "cleanup" })
```

---

*Source: https://gist.github.com/kieranklaassen/4f2aba89594a4aea4ad64d753984b2ea — Claude Code v2.1.19, verified 2026-01-25*
