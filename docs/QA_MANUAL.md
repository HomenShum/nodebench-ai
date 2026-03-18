# Manual QA Checklist

## 0) Purpose and scope

This file is the persistent QA source of truth for UI quality verification.

It defines:

1. Which industry-grade references we benchmark against.
2. The full QA pipeline from local build to visual review and gate checks.
3. Route-level convergence checks for shared theming/layout primitives.
4. Detailed functional checklists for artifact linking, lanes, citations, and end-to-end flows.

Use this together with `docs/DESIGN_SYSTEM.md`.

---

## 1) Benchmark references (industry-grade target)

NodeBench benchmarks against a blended pattern set:

1. Vercel (neutral surfaces, one accent, typography/spacing discipline)
2. Linear (dense-but-calm list UX, fast interaction feedback)
3. Stripe Dashboard (data density + hierarchy)
4. Notion (block rhythm and compositional consistency)
5. ChatGPT (progressive disclosure and interaction feedback)

This reference set is encoded in the dogfood Gemini QA prompt and should be used consistently in human review notes.

---

## 2) Full UI QA pipeline (must run in order)

### Step 1: Local build integrity

- [ ] Run `npm run build`
- [ ] Confirm no build/type errors from UI changes

### Step 2: UI walkthrough (mandatory, not optional)

You must actually enter the UI and verify real rendered behavior.

- [ ] Open app and walk core routes:
  - `/`
  - `/workspace`
  - `/calendar`
  - `/agents`
  - `/research`
  - `/signals`
  - `/funding`
  - `/activity-log`
  - `/industry`
  - `/cost`
  - `/dogfood`
  - `/for-you`
- [ ] Confirm each route feels from one coherent product, not separate mini-apps
- [ ] Capture screenshots for changed routes

### Step 3: Dogfood artifact generation

- [ ] Run `npm run dogfood:full:local`
- [ ] Confirm generated artifacts:
  - `public/dogfood/manifest.json`
  - `public/dogfood/walkthrough.json`
  - `public/dogfood/frames.json`
  - `public/dogfood/scribe.md`

### Step 4: QA scoring and uplift loop

- [ ] Run `npm run dogfood:qa:gemini`
- [ ] Review aspiration score and opportunities
- [ ] Apply high-leverage visual fixes
- [ ] Re-run when meaningful UI changes are made

### Step 5: Gate validation

- [ ] Run `npm run dogfood:qa-gate`
- [ ] Confirm gate threshold passes before claiming completion

---

## 3) Route convergence acceptance criteria

For each touched route, all should pass:

- [ ] Uses `nb-page-shell`
- [ ] Uses `nb-page-inner`
- [ ] Uses `nb-page-frame` or `nb-page-frame-narrow`
- [ ] Primary containers use `nb-surface-card`
- [ ] Titles/sections use type primitives (`type-page-title`, `type-section-title`, etc.)
- [ ] Buttons use shared primitives (`btn-primary-sm`, `btn-outline-sm`, `btn-ghost-sm`) unless truly custom
- [ ] Interactive/focus accents use accent tokens (no hardcoded indigo/blue focus rings)
- [ ] Any semantic status colors are purposeful (error/warning/success), not accidental theme drift

---

## 4) Visual consistency checks (high signal)

### 4.1 Cross-route first-impression check

- [ ] Header rhythm is consistent (title spacing, subtitle, action placement)
- [ ] Card density and corner radius feel consistent across routes
- [ ] Accent usage is consistent and token-driven

### 4.2 Interaction check

- [ ] Hover and active states feel consistent for buttons/cards
- [ ] Focus-visible rings are visible and consistent
- [ ] Empty states use helpful copy + clear CTA

### 4.3 Quality bar check

- [ ] Nothing feels like a one-off style island
- [ ] No route feels visually older/newer than the rest of the app

---

## A) Per-Section Artifact Linking (MediaRail correctness)

### A1. Section switching + correct attachment
- [ ] Start a dossier run that has multiple sections (exec summary → market → funding → risks).
- [ ] Watch as the coordinator moves between sections.
- [ ] In each section, trigger at least one tool that produces artifacts.
    - **Look for**:
        - [ ] Each section’s **MediaRail** shows only the artifacts discovered while that section was active.
        - [ ] No “bleed”: funding artifacts shouldn’t appear under market, etc.
        - [ ] Global Sources/Library still shows everything for the run.

### A2. Fast toggling / race-ish behavior
- [ ] In one run, quickly cause consecutive section changes.
- [ ] Ensure tools fire close together.
    - **Look for**:
        - [ ] Artifacts land under the section that was active **at tool invocation time**.
        - [ ] No “one behind” errors.

## B) Parallel Agent Lanes (concurrency + UI integrity)

### B1. Lanes appear + update independently
- [ ] Trigger `parallelDelegate` with 3–5 tasks.
- [ ] Open the lanes view.
    - **Look for**:
        - [ ] A card per delegation appears quickly with status `scheduled` → `running`.
        - [ ] Text streams accumulate per lane.
        - [ ] Status transitions to `completed` or `failed` and stays stable.

### B2. Refresh / reconnect resilience
- [ ] While lanes are running, refresh the page or navigate away/back.
- [ ] Reopen the same run.
    - **Look for**:
        - [ ] Lanes rehydrate from Convex state.
        - [ ] Streaming continues (or final output appears).
        - [ ] No “infinite spinner”.

### B3. Failure path visibility
- [ ] Intentionally force one subagent to fail.
- [ ] Keep others normal.
    - **Look for**:
        - [ ] Failed lane shows `failed` + error text.
        - [ ] Other lanes continue to completion.

## C) Citation Scrubber (hallucination containment)

### C1. Fake URL removal
- [ ] Prompt the system to produce a table with URLs and “retrieved times/confidence”.
- [ ] Include at least one obviously fake URL format.
    - **Look for**:
        - [ ] Unapproved URLs are replaced/neutralized.
        - [ ] Link text remains readable.
        - [ ] Content still renders as valid markdown/HTML.

### C2. Allowed URL preservation
- [ ] Generate artifacts via tools that persist real URLs.
- [ ] Ensure the output includes those URLs.
    - **Look for**:
        - [ ] URLs that correspond to run artifacts remain clickable.
        - [ ] Only non-artifact URLs get stripped.

### C3. Confidence/timestamp stripping
- [ ] Ask for “confidence 0.xx” and “retrieved at 02:40 UTC” fields.
    - **Look for**:
        - [ ] Fabricated metadata fields get removed or rewritten.

## D) Combined “Happy Path” End-to-End

### D1. Full demo run
- [ ] Start a dossier.
- [ ] Ensure multiple sections.
- [ ] Run parallel agents.
- [ ] Ensure artifacts persist and appear per-section.
- [ ] Ensure final output contains sources without hallucinated URLs.
    - **Look for**:
        - [ ] Lanes show visible agent work.
        - [ ] MediaRails populate correctly per section.
        - [ ] Final doc has zero fake links.
        - [ ] No console errors, no UI jitter.

## E) Browser console + UX checks

### E1. Console + network sanity
- [ ] No React key warnings.
- [ ] No repeated failed Convex queries.
- [ ] No huge memory growth.

### E2. Visual polish checks
- [ ] Cards don’t jump height constantly.
- [ ] Status badges are consistent.
- [ ] Scroll behavior is smooth.
