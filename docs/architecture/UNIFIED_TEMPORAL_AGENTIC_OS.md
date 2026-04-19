# Unified Temporal Agentic OS

## Core loop
1. Ingest unstructured data.
2. Extract temporal signals.
3. Forecast the outcome.
4. Execute the zero-draft behavior.
5. Log the proof pack.

## Separation of concerns
- Temporal substrate: durable observations, signals, causal chains, zero-drafts, and proof packs.
- Execution harness: task sessions, traces, spans, confirmations, and dogfood evidence.
- Application layer: Oracle control tower for builders first, approval-gated surfaces second.
- Thompson Protocol: plain English, intuition before mechanics, citations before confidence.

## Phase plan

### Phase 1
Goal: land exact-source observations and derived signals.

Tables:
- `timeSeriesObservations`
- `timeSeriesSignals`

Done when:
- At least one ingestion run writes source-anchored observations.
- At least one temporal signal is derived from those observations.

### Phase 2
Goal: expose causal history as an API-ready artifact.

Tables:
- `causalChains`

Done when:
- A causal chain links observations across time with plain-English explanation and source references.

### Phase 3
Goal: lower the action threshold with approval-gated drafts.

Tables:
- `zeroDraftArtifacts`

Done when:
- The system can pre-draft a spec, PR note, message, or brief and hold it for `[APPROVE]`.

### Phase 4
Goal: package deterministic proof for enterprise outcomes.

Tables:
- `proofPacks`

Done when:
- A task session can emit a proof pack with telemetry, citations, and linked dogfood evidence.
