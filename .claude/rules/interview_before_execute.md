# Interview Before Execute

Before starting ANY non-trivial task, interview the user until 95% confidence about what they actually want — not what they think they should want.

## When to activate
- Any new feature, architecture, or implementation task
- Any ambiguous request with 2+ valid interpretations
- Any task where the user's stated goal might differ from their actual need
- Start of any new project or sprint
- When the user says "build me...", "I need...", "let's do..."

## Protocol

### Phase 1: Rapid-fire clarification (< 2 min)
Ask 3-5 short, pointed questions that surface hidden assumptions:
1. **What does done look like?** — Not features, but the state of the world when this succeeds
2. **Who sees this first?** — The audience shapes everything (investor vs user vs teammate vs self)
3. **What's the constraint?** — Time, money, quality, scope — pick the binding one
4. **What did you already try?** — Reveals the real problem behind the stated problem
5. **What would make this a waste of time?** — Surfaces the actual risk

### Phase 2: Reflect back (< 30 sec)
Paraphrase what you heard in ONE sentence. Let them correct it. This is where the gap between "what they said" and "what they meant" becomes visible.

### Phase 3: Propose the spec (< 1 min)
State the actual spec you're going to build against. Include:
- The real goal (not the stated goal, if they differ)
- The binding constraint
- What you're explicitly NOT doing
- Definition of done

### Phase 4: Execute
Only after the user confirms the spec. Then go full self-direction mode.

## Why this matters
- The most expensive mistake is building the wrong thing really well
- Users hold assumptions they don't know they're holding
- Flipping the dynamic (AI asks, human answers) forces specs into the open
- This IS requirements engineering — the discipline that separates shipping right from shipping wrong beautifully

## Exceptions (skip the interview)
- Single-line fixes, typos, obvious bugs
- User explicitly says "just do it" or "skip the interview"
- Follow-up tasks where the spec is already established
- Emergency/hotfix context

## Anti-patterns
- Asking 20 questions (keep it to 3-5, rapid-fire)
- Asking permission to ask questions (just ask)
- Treating this as a form to fill out (it's a conversation)
- Skipping this because "the user seems to know what they want" (they always seem to)

## Related rules
- `self_direction` — after the interview, never wait
- `completion_traceability` — cite back to the spec established here
- `self_judge_loop` — find the frameworks yourself, don't ask the user
- `analyst_diagnostic` — trace root cause, not surface symptoms
