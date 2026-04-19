# NodeBench Landing Page Narrative

## Narrative Goal

The landing page should make a CEO, investor, or founder understand three things in under ten seconds:
- what this is
- what it is for
- what they get back from it

It should sell NodeBench as a decision workbench, not as a generic AI platform and not as a vague simulation engine.

## Design Direction

Use these references as constraints, not as branding cosplay:
- `frontend-slides`: exact viewport fit, low dependency, show-don't-tell
- Jony Ive style reduction: remove non-essential UI noise
- Linear / Vercel / Notion / ChatGPT restraint: clear hierarchy, strong spacing, tight copy, no decorative chaos

### Visual Rules

1. One dominant idea per screen.
2. One strong headline, one supporting line, one proof element.
3. At most three primary colors per section.
4. No decorative AI imagery.
5. Use motion only to orient, not to entertain.
6. Collapse details rather than flooding the screen.
7. Show the output, not just product claims.

## Hero

### Eyebrow

`DECISION WORKBENCH`

### Headline

See the variables. Compare the branches. Choose the next move.

### Subhead

NodeBench turns messy signals into a clear next action with scenario analysis, intervention ranking, and evidence behind every recommendation.

### Primary CTA

`Run a live analysis`

### Secondary CTA

`See the benchmark evidence`

### Hero Proof Strip

`Trajectory scoring | Scenario comparison | Intervention ranking | Forecast scorekeeping`

## Above-The-Fold Promise

The first viewport should show:
- the question
- the answer
- the top variables
- the best next actions
- confidence and source count

If those are not visible immediately, the page is too abstract.

## Section 2: Who It Is For

Use four cards.

### CEOs

"Should we ship this, change pricing, or pursue this partner?"

### Investors

"What variables matter, what risks are hidden, and what changes the slope?"

### Founders

"What is the best next move, and what evidence supports it?"

### Operators

"What is actually compounding and what is just noise?"

## Section 3: How It Works

### Core Sequence

`Source packet -> Variable map -> Scenario cards -> Intervention ladder -> Decision memo`

### Supporting Copy

Every claim traces to a source. Every scenario states its assumptions. Every recommendation shows what would change our mind.

## Section 4: Live Example

This is the screen that sells the product.

Use one concrete example like:

Question:
"Should Acme AI raise now or wait six months?"

Visible output:
- Top five variables
- Three scenario cards
- Best three next actions
- Confidence and source count
- Open evidence drawer link

Do not bury the answer behind tabs.

## Section 5: Why It Is Different

This section should contrast NodeBench against the two wrong alternatives.

### Not A Generic Chatbot

Chat gives fluency, not structure.

### Not A Static Analyst Memo

Memo gives narrative, not adaptive scorekeeping.

### NodeBench

NodeBench gives structure, scenarios, interventions, provenance, and later calibration.

## Section 6: Trust And Reliability

Use a restrained proof layout.

NodeBench should claim:
- explicit evidence links
- counter-models
- confidence labels
- intervention tracking
- post-hoc scorekeeping

NodeBench should not claim:
- certainty
- omniscience
- one-shot truth
- magic forecasting

## Section 7: Existing Workflow Fit

This is the adoption wedge.

Message:

NodeBench fits into the tools people already use today: coding-agent desktops, repos, benchmark runs, changelog pages, and executive memos.

Supporting surfaces:
- Claude Code and MCP clients
- GitHub issues and PRs
- internal docs
- benchmark dashboards
- exported memos

## Section 8: Demo Script Copy

This copy should be present near the CTA or live example:

"Drop in a packet. Pick a workflow. NodeBench maps the variables, compares the branches, ranks the interventions, and gives you a memo you can act on immediately."

## Objection Handling

### "What is this?"

It is a decision workbench for uncertain, high-stakes questions.

### "What am I using this for in my day-to-day workflow?"

You use it when you need a clear next move backed by variables, scenarios, and evidence.

### "Why not just use ChatGPT or a memo template?"

Because NodeBench makes assumptions, scenarios, interventions, and confidence explicit, then lets you compare them against reality later.

## Tone Rules

The writing should feel:
- crisp
- restrained
- evidence-first
- expensive in the good way

Avoid:
- hype language
- category jargon overload
- "revolutionary" claims
- giant feature grids above the fold

## Frontend Translation Notes

Use the existing `frontend-slides`-inspired theme system as the base, but tighten it toward product clarity:
- stronger type hierarchy
- more whitespace
- fewer accent colors
- more obvious grouping of question, answer, and evidence
- one dominant conclusion per screen

Recommended layout for the core workbench:
- left rail: workflows, entities, saved runs
- center pane: memo, scenario cards, intervention ladder
- right rail: evidence, sources, confidence, dissent

## Success Criteria

The landing page is working if a first-time viewer can answer these without help:
- What is this?
- Who is it for?
- What do I get?
- Why is it more reliable than a generic AI answer?
- What would I do with it tomorrow morning?

## Reference Links

- `frontend-slides` reference repo: https://github.com/zarazhangrui/frontend-slides
- Claude Code MCP docs: https://docs.anthropic.com/en/docs/claude-code/mcp
- GitHub Actions docs: https://docs.github.com/actions/automating-your-workflow-with-github-actions
