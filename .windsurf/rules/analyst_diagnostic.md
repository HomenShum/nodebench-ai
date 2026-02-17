---
trigger: always_on
related_: [dogfood_verification, reexamine_process, reexamine_resilience, completion_traceability]
---

# Analyst Diagnostic

Guide yourself like an analyst diagnosing the root cause, not a junior dev slapping on a bandaid.

## When to trigger
- Before writing ANY fix — investigate why the bug exists, not just what it looks like
- When an error appears — trace it upstream to the source, don't just suppress it
- When a test fails — understand the system state that caused it, not just make the assertion pass
- When something "works but feels wrong" — name the smell, don't ignore it

## The diagnostic process
1. **Reproduce**: Confirm the exact failure mode. What triggers it? What's the expected vs actual?
2. **Trace upstream**: Walk from symptom → intermediate state → root cause. Follow the data, not assumptions.
3. **Ask "why" 5 times**: Each answer should go one level deeper. Stop when you reach a design decision, missing constraint, or wrong assumption.
4. **Fix the cause, not the symptom**: The right fix makes the symptom impossible, not just invisible.
5. **Verify the fix didn't shift the problem**: Bandaids often move bugs sideways. Check adjacent behavior.

## Red flags you're bandaiding
- Adding `try/catch` that swallows errors without understanding them
- Adding `?.` optional chaining to mask `undefined` instead of finding why it's undefined
- Adding `as any` to silence type errors instead of fixing the type mismatch
- Adding timeouts/retries to paper over race conditions
- Deleting a failing test instead of fixing the code it tests
- "It works now" without understanding why it didn't before

## What analysts do differently
- They form a hypothesis BEFORE trying a fix
- They check if the "fix" actually addresses their hypothesis
- They look for other places the same root cause could cause problems
- They document what they found so the next person doesn't re-discover it
- They ask: "What system condition allowed this bug to exist?"

## UI-specific diagnostic

When fixing a UI issue, the analyst approach demands:
1. **Which component actually renders?** Trace sidebar label → view key → MainLayout switch → component import. Grep alone can find the wrong file.
2. **What layer owns the data?** Convex backend, React frontend, or stored DB records? Each requires a different deployment path.
3. **Is this a cold-start problem?** Empty states for new users often point to missing bootstrap/onboarding data, not just bad copy. Fixing text is a bandaid; showing fallback content (trending, sample, public data) is structural.
4. **Would hiding the problem make it invisible or actually solve it?** Changing "0/7 healthy" to "7 scheduled" hides a monitoring signal. The structural question is: should this panel even render when the system isn't configured?

## Anti-patterns
- Grepping for the error message and copying a StackOverflow fix without understanding it
- Changing multiple things at once, making it impossible to know which change actually fixed it
- Declaring "fixed" after a single green run without understanding the failure mode
- Editing a component that isn't reachable from the user's navigation path
- Changing text in an empty state instead of addressing why it's empty
- Modifying a generation constant but not migrating existing stored data