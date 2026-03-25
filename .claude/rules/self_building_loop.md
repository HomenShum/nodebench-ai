# Self-Building Loop

When infrastructure or tools have blockers or gaps, ALWAYS do deep wide research to fix issues, then run the loop again. The system builds itself.

## When to activate
- After any eval failure reveals a missing tool, broken chain, or infrastructure gap
- When a tool returns empty/error and the fix requires new infrastructure
- User says "make it build itself", "fix the gaps", "self-heal"
- After any deploy when the eval score drops

## Protocol

### Phase 1: Diagnose the gap (< 2 min)
1. Run the eval harness — identify which queries fail and which criteria
2. For each failure, trace upstream: is this a data gap, routing gap, tool gap, or infrastructure gap?
3. Classify: can this be fixed with code changes, or does it need new infrastructure?

### Phase 2: Research the fix (< 5 min)
1. Search the web for current best practices (2026 state of the art)
2. Search the codebase for existing infrastructure that can be extended
3. Check Convex env for available API keys and services
4. Check existing MCP tools for capabilities that aren't wired to the search route
5. Never assume a blocker is permanent — research before declaring

### Phase 3: Build the fix (< 15 min)
1. Implement the minimal fix that addresses the root cause
2. Wire it into the existing pipeline (don't create parallel systems)
3. Add structural checks to the eval for the new capability
4. Type-check — must be 0 errors

### Phase 4: Verify and loop (< 5 min)
1. Restart the server
2. Run the eval — compare to baseline
3. If score improved: commit and continue
4. If score regressed: revert the change, re-diagnose
5. If score unchanged: the fix was wrong — try a different approach

### Phase 5: Grow the corpus (continuous)
1. After each fix, add 2-3 new queries that test the fixed capability
2. Add adversarial variants (typos, ambiguous, multi-entity)
3. Target 100+ queries across 15+ categories
4. Never remove failing queries from the corpus — fix the system instead

## Key principles
- The system should be able to diagnose and fix its own failures
- Every eval run should produce actionable fix suggestions
- Infrastructure gaps are opportunities, not blockers
- Research before declaring anything impossible
- The eval corpus grows monotonically — never shrinks

## Anti-patterns
- Declaring a failure "unfixable" without researching alternatives
- Removing failing queries instead of fixing the pipeline
- Building parallel systems instead of extending existing ones
- Waiting for user direction when the eval clearly shows what's broken
- Inflating scores by weakening the judge instead of improving the system

## Related rules
- `eval_flywheel` — the eval loop that drives this
- `analyst_diagnostic` — root cause before fix
- `self_direction` — never wait, keep moving
- `agentic_reliability` — 8-point checklist for agent infra
- `flywheel_continuous` — continuous improvement loop
