### Ruthless Execution Board

The key shift: **stop treating this as a visual polish problem and treat it as a product-behavior problem.**

#### 1. Home is still explaining the product instead of launching the product (Ship order: 1)

**Symptom:** User lands on cards, sidebars, and product framing before first useful run. First thing users see is not the main thing they do.

**Fix:** Make Home behave like a launchpad. Ask bar first. Upload second. One example result below fold, not a discovery wall above fold. Zero explanatory chrome before first action.

**Targets:** Home route shell, ask composer, evidence upload entry, trending reports / preview sidebars above first fold.

**Metrics:** `landing_to_first_run_start < 5s`, `first_input_visible_on_first_paint`

#### 2. Chat is not yet the product -- it is still one page among many (Ship order: 2)

**Symptom:** Typed `classify -> search -> analyze -> package` pipeline exists but the experience makes users work too hard to understand what is happening. Answer should dominate; proof should support it.

**Fix:** Turn Chat into the main value surface. Every ask routes into one persistent live session. Center column is always the answer. Sources attach to answer blocks. Activity rail supports trust but never dominates. Follow-ups continue the same session.

**Targets:** `ResultWorkspace.tsx`, live search / SSE render path, answer block renderer, inline sources, session persistence layer.

**Metrics:** `first_partial_answer_at < 800ms`, `first_source_at < 2s`, `first_completed_section_at < 5s`

#### 3. Speed is not yet expressed as product behavior (Ship order: 3)

**Symptom:** Backend pipeline is real, staged, and streams, but frontend still waits and reveals rather than progressively proving value.

**Fix:** Classify result paints immediately. Source chips appear while search runs. Answer blocks stream progressively. Skeletons hold layout stable. No large layout jump after first paint.

**Targets:** SSE event mapping, partial answer renderer, source chip renderer, loading skeletons for Home/Chat/Reports.

**Metrics:** No layout jump larger than one component height. `chat_stage_visible_progressively = true`

#### 4. Reports is shaped like storage, not reusable memory (Ship order: 4)

**Symptom:** Packets, shared context, founder episodes, workflow templates, and replay primitives exist, but to users this still does not feel like compounding memory. Workflow assets are spread across multiple shapes.

**Fix:** Reports open as clean reusable pages. First render feels useful, not archival. Each report shows: what it is, why it matters, what is missing, what could break, what to do next. Every report can reopen directly into Chat.

**Targets:** Report card grid, report detail page, saved report object, report refresh flow, report-to-chat action.

**Metrics:** `first_saved_report_at`, `first_return_visit_to_report_at`, `report_to_chat_reentry_rate`

#### 5. Nudges is still a promise, not a loop (Ship order: 5)

**Symptom:** Connector-backed reminders and communication surfaces exist in concept but no concrete closed-loop behavior users can rely on daily.

**Fix:** Start with one real closed loop only: report changed, reply draft ready, follow-up due. Do not build a broad notification center first.

**Targets:** Nudge feed, one nudge generator, one action path back into Chat or Reports, connector status cards.

**Metrics:** `nudge_open_rate`, `nudge_to_action_rate`, `nudge_to_chat_or_report_return_rate`

#### 6. Me still looks like settings instead of leverage (Ship order: 6)

**Symptom:** Infrastructure for private context and saved files exists, but users cannot feel the system getting better because of what it knows about them.

**Fix:** Me should visibly answer: what context do I already have? What will improve my next run? What files/reports/saved companies is the agent using? Not "profile settings." More like "private context that improves answers."

**Targets:** Saved files, saved entities, profile summary, visible "using your context" chips in Chat.

**Metrics:** `runs_using_me_context`, `me_context_improves_completion_rate`, `visible_context_usage_rate`

#### 7. No permanent quality operating system yet (Ship order: parallel from day 1)

**Symptom:** Good improvements drift without a standing quality lane. Products like Linear did not get great from cleanup sprints. They built discipline.

**Fix:** Institute weekly papercut pass, no bug backlog dumping. Every release reviewed for spacing, loading, empty state, hover/focus, motion, source visibility, layout stability.

**Targets:** Release checklist, bug triage rules, perf dashboard, UX quality review checklist.

**Metrics:** Bug age, papercut count shipped weekly, regressions in time-to-value, layout shift incidents.

### What to Strip Immediately

Remove or hide from the main user surface:
- Compare as a top-level workflow
- Builder-only eval surfaces
- Improvements as user-facing product
- Raw workflow / replay / trajectory terminology
- Any top-level page mainly about internal system state rather than user value

Oracle is builder-facing. Retention / Attrition are not yet mature user-facing runtime surfaces. Ask remains the flagship user runtime while the deeper workflow-learning system stays behind the curtain.

### What to Keep and Lean Into

- Typed pipeline
- Packet-first runtime
- Shared-context handoff
- Real streaming
- Bounded delegation targets
- Early replay/template substrate
- Builder-facing evaluation loop

These are real assets already in the repo. The mistake would be exposing them as product complexity instead of translating them into a cleaner user experience.

### Correct Final Product Hierarchy

User sees:
```
Home -> Chat -> Reports -> Nudges -> Me
```

System does:
```
typed pipeline -> packet/report -> shared context -> save -> nudge
                         |
                         +-> Retention remembers useful patterns
                         +-> Attrition trims future reruns
                         +-> Hyperagent reviews quality
                         +-> ARE tests robustness
```

### Top 3 to Ship First

1. **Home becomes launchpad only** -- slim ask bar first, upload second, everything else pushed down
2. **Chat becomes the dominant product surface** -- partial answer fast, sources attached, trace secondary
3. **One real nudge loop** -- report changed, reply draft ready, or follow-up due (not all connectors first)
