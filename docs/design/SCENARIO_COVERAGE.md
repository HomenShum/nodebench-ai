# NodeBench Scenario Coverage — 2026-04-23

The "why do I care?" layer for product positioning and eval prioritization.

## Product promise (one sentence)

> Dump messy real-life inputs into one composer. NodeBench infers what it is,
> organizes it into the right workspace, builds entities / claims / evidence,
> and gives you the next best action.

This maps directly to the in-flight plan: `UniversalComposer`, inferred routing,
`ContextPill`, confidence gates, `quickCaptures`, `captureRouter`,
`eventContextResolver`, `hydrateEntities`, `followUps`, and the Inbox > Unassigned
Captures review surface. See
[`C:\Users\hshum\.claude\plans\additionally-what-about-this-robust-thacker.md`](../../..%2FUsers%2Fhshum%2F.claude%2Fplans%2Fadditionally-what-about-this-robust-thacker.md).

## Test template

Every scenario should be tested against this template:

```
Real-life input:
  What user actually says, uploads, records, or pastes.

Inferred intent:
  capture_field_note / ask_question / append_to_report / create_followup / expand_entity

Target:
  current report / active event / inbox item / unassigned buffer

Expected structured output:
  entities / claims / edges / follow-ups / evidence

User-facing ack:
  Saved to X / Needs confirmation / Saved to unassigned

Next action:
  Open card / Move / Go deeper / Add follow-up / Verify
```

Example:

```
Scenario:
  At demo day, user says:
  "Met Alex from Orbital Labs. Voice agent eval infra, seed,
   wants healthcare design partners."

Expected:
  Intent: capture_field_note
  Target: active event report
  Entities: Alex, Orbital Labs, voice agent eval infra, healthcare
  Claims: Orbital Labs builds voice-agent eval infra;
          looking for healthcare design partners
  Follow-up: ask about pilot criteria
  Ack: Saved to Ship Demo Day
  Actions: Edit, Move, Go deeper
```

## Surface × scenario-family matrix

Columns: which surfaces fulfill the scenario family, ranked by primary / secondary.

| Scenario family                                   | Mobile                                                       | Web app                                     | Workspace                                           | CLI / MCP                                  |
| ------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------- | --------------------------------------------------- | ------------------------------------------ |
| At an event, capturing notes                      | **Primary.** Voice, camera, screenshot, text, context pill   | Secondary — Inbox/captures review            | Post-event organization into event report            | Optional import from automations           |
| Meeting someone, saving relationship context      | **Primary** capture surface                                  | View/edit in Inbox or Reports                | Deep person/company card expansion                   | Optional CRM or scripted import later      |
| Recruiter email / job alert                       | Quick notification and triage                                | **Primary.** Inbox → Chat → Reports           | Interview prep workspace                             | Pipedream / Gmail automation enrichment    |
| Interview prep                                    | Quick review before call                                     | Start from Chat or Report                    | **Primary.** Company dossier, notes, sources         | Auto-generate briefing from email/calendar |
| Founder customer discovery                        | Capture field notes live                                     | Review captures, convert to reports          | **Synthesize** pain themes, objections, next actions | Bulk ingest notes/transcripts              |
| Investor demo day diligence                       | Capture each founder/company live                            | Inbox review + Reports grid                   | **Primary.** Compare companies, cards, sources, memo | Batch research companies from event list   |
| Sales / BD leads                                  | Capture booth/event conversations                            | Inbox triage + account reports                | Account workspace with stakeholders and follow-ups   | Future CRM sync / API calls                |
| PM feedback collection                            | Capture user/customer comments                               | Reports organize themes                      | Notebook turns feedback into PRD/evidence            | Repo/docs integration later                |
| Market research                                   | Quick read only                                              | Start from Chat, save report                  | **Primary.** Recursive cards, sources, notebook      | Scheduled or batch research runs           |
| Technical repo/vendor research                    | Tertiary                                                     | Start from Chat/Reports                      | Architecture/vendor report workspace                 | **Primary.** MCP inside Claude/Cursor      |
| Newsletter / content research                     | Save ideas/screenshots                                       | Inbox + Reports                               | Draft newsletter/memo from cards and sources         | Scheduled digest pipeline                  |
| Personal knowledge capture                        | **Primary.** One input for messy notes                       | Search/review in Inbox or Reports             | Deep cleanup only when needed                        | Not primary                                |
| Team memory                                       | Capture from the field                                       | Reports as shared library                     | **Primary** shared workspace                         | MCP/API for team automation                |

**Verdict:** all four surfaces have a job, but only Workspace should own the
"infinite layers" recursive experience.

## Hero scenarios (demo + positioning priority)

1. **Live event capture** — "I'm walking around a demo day. I capture messy notes and voice memos. NodeBench builds the event report automatically."
2. **Recruiter / interview prep** — "A recruiter emails me. NodeBench researches the company, people, role, and gives me talking points."
3. **Founder customer discovery** — "I talk to five potential customers. NodeBench extracts pain points, objections, and follow-ups."
4. **Investor demo day diligence** — "I meet ten startups. NodeBench clusters them by market, verifies claims, and ranks follow-ups."
5. **Research report workspace** — "I ask a messy question. NodeBench creates a report I can explore through cards, edit in notebook, and verify through sources."

## Full scenario catalog

17 families. 100+ scenarios. Cross-referenced to surface primacy above.

### 1. Event / conference

| Real-life scenario                                               | How NodeBench helps                                                                           |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| I just met someone at a demo day                                 | Capture name, company, what they build, follow-up → event report                              |
| I took messy handwritten notes                                   | Upload notebook photo → extract entities/claims → attach to event report                      |
| I recorded a quick voice memo                                    | Transcribe → extract company/person/product/follow-up → route to likely event                 |
| I forgot the company name but remember what they were building   | Search captures by product description, theme, market                                         |
| I met 20 people and forgot who matters                           | Rank by relevance, urgency, follow-up value                                                   |
| Who at this event is building similar things                     | Cluster by theme, product, market, problem                                                    |
| Which claims from the event need verification                    | Separate field-note claims from verified public evidence                                      |
| Who should I follow up with first                                | Prioritized follow-up queue                                                                   |
| I want a post-event memo                                         | Event brief with people, companies, products, themes, next actions                            |
| Compare this event to another one                                | Compare entity clusters, market themes, signal quality across events                          |

### 2. Networking

| Real-life scenario                                 | How NodeBench helps                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| I had coffee with someone interesting              | Capture conversation → infer person/company/topic → relationship note          |
| Someone mentioned a company I should check out     | Create company card, enrich, add to report                                     |
| Someone gave me three names to talk to             | Extract names → infer relationship graph → follow-up tasks                     |
| I want to remember how I know this person          | Store relationship context and prior conversation trail                        |
| I need a warm intro angle                          | Find shared entities, prior companies, mutual topics, event context            |
| Don't know if they matter yet                      | Save as low-confidence field note without polluting the canonical graph        |
| I want to write a follow-up message                | Grounded follow-up based on what they said + what you care about               |
| I want to know their influence network             | Expand companies, collaborators, investors, products, public signals           |

### 3. Job search

| Real-life scenario                                  | How NodeBench helps                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| A recruiter emailed me                              | Classify, enrich company/person, create prep material                   |
| I have an interview coming up                       | Company dossier, role-specific talking points, questions, risks         |
| I met a hiring manager at an event                  | Attach to both event report and job opportunity                         |
| Is this company worth my time                       | Research funding, product, market, hiring signals, red flags            |
| I want a tailored reply                             | Draft response grounded in company context + your background            |
| Track where I applied                               | Convert job emails into structured reports and follow-up tasks          |
| I got rejected                                      | Log it, extract feedback, update pipeline state                         |
| I got an offer                                      | Offer report with comp, risks, negotiation points, decision memo        |
| I need interview questions                          | Generate from company news, product, role, people                       |
| Compare two opportunities                           | Compare by role fit, market, growth, people, comp, risk                 |

### 4. Founder / startup operator

| Real-life scenario                         | How NodeBench helps                                                 |
| ------------------------------------------ | ------------------------------------------------------------------- |
| I talked to a potential customer           | Pain points, objections, buyer persona, follow-up                   |
| I met a possible design partner            | Account card + pilot next steps                                     |
| I found a competitor                       | Competitor card + positioning comparison                            |
| I saw a new product launch                 | Market signal + relevant market map update                          |
| I need to understand a market quickly      | Market brief with companies, products, narratives, open questions   |
| Track repeated customer pain               | Cluster captures by pain point + frequency                          |
| Turn notes into a roadmap                  | Repeated problems → feature themes → priorities                     |
| Investor update material                   | Progress, market signals, conversations, next actions               |
| Test if my thesis is changing              | Track narrative shifts + evidence over time                         |
| Board / advisor memo                       | Decisions, signals, risks, asks                                     |

### 5. Sales / business development

| Real-life scenario                            | How NodeBench helps                                        |
| --------------------------------------------- | ---------------------------------------------------------- |
| I met a prospect                              | Account, stakeholder, pain, budget signal, next step       |
| I have a sales call                           | Research account, people, recent news, likely pain         |
| They use a competitor                         | Competitive edge + objection on account card               |
| Follow-up email                               | Grounded in actual conversation                            |
| Is this account high priority                 | Score by fit, urgency, authority, signal strength          |
| Remember all stakeholders                     | Account relationship map                                   |
| Prepare for a conference booth                | Preload companies, people, target accounts                 |
| Turn event leads into pipeline                | Captures → account cards → follow-up tasks                 |

### 6. Investor / VC / diligence

| Real-life scenario                         | How NodeBench helps                                                  |
| ------------------------------------------ | -------------------------------------------------------------------- |
| I met a founder                            | Founder, company, product, traction claims, fundraising status       |
| Is this startup real                       | Public signals, funding, team, product, market, competitors          |
| I heard a claim during a pitch             | Store as field-note claim + mark verification status                 |
| Compare startups from a demo day           | Event-level company comparison                                       |
| Quick investment memo                      | Thesis, risks, market, team, traction, open questions                |
| Track founder follow-ups                   | Extract asks + next steps                                            |
| Map a category                             | Company/product/theme landscape                                      |
| Who else is investing                      | Investor graph + funding intelligence                                |
| Revisit this company later                 | Watchlist + refresh signals over time                                |

### 7. Product management

| Real-life scenario                     | How NodeBench helps                                            |
| -------------------------------------- | -------------------------------------------------------------- |
| Customer feedback in a call            | Classify pain, request, objection, persona                     |
| Group feedback by theme                | Cluster into product themes                                    |
| Saw a competitor feature               | Competitor/product card + source + screenshot                  |
| Write a PRD                            | Notes, evidence, customer claims → structured doc              |
| Prioritize roadmap                     | Rank by frequency, urgency, customer value, strategic fit      |
| Trace why we made a decision           | Link decision to notes, sources, claims, reports               |
| Compare solutions                      | Side-by-side evidence-backed cards                             |
| Understand a user segment              | People, companies, pain points, workflows, evidence            |

### 8. Research / analyst

| Real-life scenario                          | How NodeBench helps                                                |
| ------------------------------------------- | ------------------------------------------------------------------ |
| Researching a company                       | Entity dossier with people, products, signals, sources, claims     |
| Researching a person                        | Background, affiliations, influence graph, public work             |
| Researching a market                        | Category map, companies, narratives, signals, open questions       |
| Verify a claim                              | Link claim → evidence, mark confidence                             |
| I have many sources                         | Documents → claims, citations, cards                               |
| Living brief                                | Keep updating as new captures and sources arrive                   |
| What changed since last time                | Show deltas in entities, claims, signals                           |
| Executive summary                           | What / So what / Now what                                          |

### 9. Academic / learning

| Real-life scenario                          | How NodeBench helps                                        |
| ------------------------------------------- | ---------------------------------------------------------- |
| Attended a lecture                          | Notes, concepts, people, papers, follow-ups                |
| Photo of the whiteboard                     | OCR, summarize, attach to topic notebook                   |
| Study this topic                            | Concept graph + source-backed study notes                  |
| Understand a paper                          | Claims, methods, evidence, limitations, related papers     |
| Compare papers                              | Evidence table across papers                               |
| Remember what the professor said            | Lecture notes as field evidence (separate from verified)   |
| Study guide                                 | Notes → explanation, flashcards, open questions            |

### 10. Technical / developer

| Real-life scenario                           | How NodeBench helps                                                 |
| -------------------------------------------- | ------------------------------------------------------------------- |
| Found an interesting GitHub repo             | Repo/product card with activity, docs, maintainers, use cases       |
| Someone mentioned a framework                | Capture + attach to technology graph                                |
| Evaluate a vendor API                        | Compare docs, pricing, features, integrations, risks                |
| Track OSS ecosystem movement                 | Watch repos, releases, contributors, narratives                     |
| Understand a technical architecture          | Docs + notes → components, claims, dependencies, diagrams           |
| Remember implementation lessons              | Save to project report + notebook                                   |
| Technical due diligence memo                 | Product, repo, architecture, risk, ecosystem analysis               |

### 11. Content / creator

| Real-life scenario                  | How NodeBench helps                                      |
| ----------------------------------- | -------------------------------------------------------- |
| Good story at an event              | Capture, tag entities + themes, save for content later   |
| Write a LinkedIn post               | Report insights → post with grounded claims              |
| Video script                        | Cards + sources → narrative outline                      |
| Track a trend                       | Topic monitor from captures + public signals             |
| Examples for a newsletter           | Pull companies, people, evidence from reports            |
| Avoid forgetting raw ideas          | Dump into composer, let NodeBench organize later         |

### 12. Personal knowledge / life admin

| Real-life scenario                             | How NodeBench helps                                            |
| ---------------------------------------------- | -------------------------------------------------------------- |
| Talked to someone and need to remember         | Relationship context + follow-up                               |
| Took a screenshot of something useful          | Extract text, classify, attach to right report                 |
| Random idea                                    | Capture, infer topic, store in right notebook/report           |
| Find something I saw last week                 | Search by entity, theme, claim, source, capture                |
| Clean up messy notes                           | Captures → structured entities, claims, tasks                  |
| What should I do next                          | Prioritized next actions across reports + captures             |

### 13. Inbox / automation

| Real-life scenario                         | How NodeBench helps                                              |
| ------------------------------------------ | ---------------------------------------------------------------- |
| Received a job email                       | Classify, enrich, notify, save to report                         |
| Received an event invite                   | Create or update event report                                    |
| Newsletter with companies                  | Extract companies, products, signals into report candidates      |
| Automatic triage                           | Route inbound items to Reports / Inbox / Unassigned Captures     |
| Review uncertain captures                  | Use Unassigned Captures queue to promote, attach, or discard     |
| Notifications only when useful             | Notify only when confidence or priority crosses threshold        |

### 14. Team / organizational memory

| Real-life scenario                                        | How NodeBench helps                                             |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| My teammate met someone useful                            | Their capture becomes shared event intelligence                 |
| Why we cared about this company                           | Report keeps history, claims, sources, prior notes              |
| Avoid duplicate research                                  | Existing entity cards + reports are reused                      |
| Source of truth                                           | Canonical graph separates entities, claims, evidence, notes     |
| Onboard a teammate                                        | Share report workspace: cards, brief, notebook, sources         |
| Living CRM-like memory without CRM overhead               | Captures create lightweight relationship and company memory     |

## Cleanest product framing

NodeBench helps in any real-life scenario where:

1. information arrives messy
2. the user cannot organize it in the moment
3. entities and relationships matter
4. claims need evidence or verification
5. follow-up actions matter later

That is the wedge.

Not "a better note app."
Not "a better chat app."
Not "a mindmap."

It is:

> A universal capture-to-intelligence workspace for real-world people,
> companies, products, events, and decisions.
