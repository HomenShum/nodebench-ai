# NodeBench Harness v2 — One Pager

This is the short version of
[HARNESS_V2_PROPOSAL.md](./HARNESS_V2_PROPOSAL.md).

It answers one practical question:

```text
If Harness v2 ships, what will users actually see, do, and feel?
```

This document is product-facing. It translates architecture into user-visible
behavior.

## One-Sentence Summary

Harness v2 turns NodeBench from a system that answers questions into a system
that learns how the user works, prepares them before important moments, and
makes each run more useful than the last.

## The Main Product Change

Current experience:

```text
user asks
  -> system runs
  -> answer appears
  -> maybe saved later
```

Proposed experience:

```text
user starts quickly
  -> system learns progressively
  -> system answers with context
  -> system saves useful artifacts
  -> system prepares user before the next important moment
```

## Side-By-Side: Existing vs Proposed

### Overall product behavior

```text
EXISTING NODEBENCH                          PROPOSED HARNESS V2
------------------                          -------------------
Starts at the question                      Starts at the user

Good at running a search                    Good at learning how this user works
or report flow once asked                   and using that context every time

Mostly reactive                             Reactive + anticipatory

Answers one run at a time                   Makes each run improve the next run

Memory is helpful but uneven                Operator context is typed, versioned,
                                            and intentionally reused

Can feel like a powerful tool               Feels like a prepared research partner
                                            that gets better over time
```

### User journey

```text
EXISTING                                    PROPOSED
--------                                    --------
Ask                                          Ask or upload immediately
  -> Wait                                      -> See progress quickly
  -> Get answer                                -> Get answer shaped to your context
  -> Save if useful                            -> Save automatically if useful
                                               -> Reuse later as living memory
                                               -> Get nudged when something changes
                                               -> Get briefed before important interactions
```

## How The Five Pages Become One Compounding Workflow

The key missing idea is this:

Harness v2 is not just about making each page better by itself.

It is about making `Home`, `Chat`, `Reports`, `Nudges`, and `Me` behave like
one connected system where each page creates artifacts that improve the next
page and the next run.

### The problem today

Today, the pages can still feel like separate destinations:

```text
Home      -> place to start
Chat      -> place to run
Reports   -> place to store
Nudges    -> place that may notify later
Me        -> place for saved context
```

That is useful, but it does not fully compound.

The missing product behavior is:

```text
one run should create artifacts
those artifacts should become memory
that memory should change what happens next
```

### The proposed artifact ladder

This is the most important product flow in Harness v2:

```text
USER INPUT
  -> question
  -> upload
  -> correction
  -> follow-up

CHAT RUN
  -> session
  -> trace
  -> source refs
  -> answer packet
  -> extracted entities
  -> candidate next actions

REPORT PROMOTION
  -> canonical report
  -> why it matters
  -> what changed
  -> what is missing
  -> what could break
  -> what to do next

TRACKING / MEMORY
  -> tracked entities
  -> tracked themes
  -> watch conditions
  -> follow-up tasks
  -> operator-context updates

RETURN LOOP
  -> nudge
  -> prep brief
  -> reopen report
  -> resume chat with context already attached
```

### Side-by-side: artifact flow

```text
EXISTING FLOW                              PROPOSED FLOW
-------------                              -------------
Home                                        Home
  -> user asks                                -> user asks or uploads
                                               -> lightweight elicitation starts

Chat                                        Chat
  -> answer generated                         -> answer packet generated
  -> sources shown                            -> trace + sources + entities + next actions

Reports                                     Reports
  -> maybe save result                        -> answer promoted into canonical report
                                               -> report gains status, gaps, risks, next steps

Nudges                                      Nudges
  -> maybe notify later                       -> report and entities become watchable objects
                                               -> changes trigger useful return events

Me                                          Me
  -> stores context                           -> stores operator context, permissions,
                                                 learned preferences, and revision history

Next run                                    Next run
  -> mostly starts fresh                      -> starts with prior report, watch state,
                                                 and operator context already attached
```

### What exactly flows from Chat into Reports

The system should not treat a chat answer as just text on screen.

A strong chat run should produce structured material that can be promoted into a
report.

Chat should create:

- the user question
- the final answer
- the supporting source references
- trace and execution metadata
- extracted entities
- extracted claims and key points
- open questions
- suggested next actions

Reports should then stabilize that into a reusable artifact:

- title and canonical subject
- answer summary
- key evidence
- what changed since last time
- missing information
- risks and unknowns
- recommended next actions
- links back to the originating chat run

That is how `Chat` stops being ephemeral and starts becoming a report factory.

### What exactly flows from Reports into Nudges

A report should not just sit there after it is saved.

Once promoted, it can create watchable conditions such as:

- this company changed meaningfully
- this thesis now looks stale
- this follow-up date is due
- this missing evidence is now available
- this interaction needs a prep brief

That means `Reports` should feed `Nudges` with:

- tracked entities
- tracked claims
- tracked deadlines
- follow-up tasks
- refresh conditions

That is how `Reports` becomes a return engine instead of an archive.

### What exactly flows from Me into every run

`Me` is not just a settings page.

It should supply the reusable operator layer for every workflow:

- preferred lens
- evidence standards
- escalation style
- recurring stakeholders
- tone constraints
- transcript import permissions
- versioned workflow changes

That means the next run in `Home` or `Chat` does not start empty.

It starts with:

- operator context
- saved reports
- tracked entities
- active nudges
- current prep state

### Plain-English object flow

This is the simplest way to think about the compounding loop.

One user action should not disappear after the answer shows up.

It should turn into a chain of useful things:

```text
USER ASKS A QUESTION
  -> Chat creates an answer

ANSWER
  -> Chat saves the sources, key points, entities, and next actions

SAVED CHAT RESULT
  -> Reports turns that into a proper saved report

SAVED REPORT
  -> becomes something the system can reopen, refresh, compare, and watch

WATCHED REPORT OR ENTITY
  -> can trigger a nudge when something important changes

NUDGE
  -> brings the user back into the right report or chat session

USER CORRECTS OR CONTINUES
  -> Me updates what the system knows about the user's workflow

NEXT RUN
  -> starts stronger because the system remembers the useful parts
```

The same flow in even plainer English:

```text
question
  -> answer
  -> saved report
  -> watch item
  -> useful nudge
  -> better next run
```

What that means on each page:

- `Home` starts the run
- `Chat` creates the first useful artifact
- `Reports` turns it into reusable memory
- `Nudges` decides when it matters again
- `Me` improves how the next run is handled

That is the compounding loop.

### Singular large ASCII flow

```text
NODEBENCH HARNESS V2: ONE COMPOUNDING USER WORKFLOW
===================================================

PRIMARY USER PERSONAS
---------------------
Founder      -> wants investor prep, customer prep, company research, follow-ups
Investor     -> wants thesis building, change tracking, comparable analysis
Recruiter    -> wants candidate/company briefs, interview prep, follow-ups
Operator     -> wants market/vendor/customer intelligence and action tracking
Researcher   -> wants sourced answers, reusable reports, and ongoing monitoring


PAGE 1: HOME  -> "START QUICKLY"
--------------------------------
User intent:
  - start from scratch
  - upload context
  - continue from a prior thread, report, or nudge

User action:
  - type a question
  - drop a file
  - paste a URL
  - choose a prior item to continue

Example queries:
  - "What changed at Ramp?"
  - "Prep me for tomorrow's call with Anthropic"
  - "Compare Brex vs Ramp"
  - "Summarize this deck and tell me what is missing"

What Home creates:
  - starting query
  - optional file or URL context
  - new or resumed session
  - small elicitation signals
    -> what the user cares about
    -> speed vs depth
    -> lens / priority hints

Where it flows next:
  -> CHAT


PAGE 2: CHAT  -> "DO THE WORK"
------------------------------
User intent:
  - get an answer
  - refine the direction
  - compare options
  - prepare for a meeting, call, interview, or follow-up
  - correct the system if it is off

User action:
  - ask the main question
  - ask follow-ups
  - add "by the way" context
  - correct assumptions
  - ask for next steps

Example scenarios:
  - founder asks for investor-call prep
  - investor asks for thesis update
  - recruiter asks for company and candidate brief
  - operator asks what changed across tracked accounts
  - researcher asks for a sourced market summary

What Chat shows:
  - visible progress
  - answer blocks
  - source cards
  - context chips
  - prep / watch / saved-context indicators

What Chat creates:
  - answer
  - source list
  - execution trace
  - extracted entities
  - extracted claims / key points
  - open questions
  - suggested next actions
  - report candidate
  - operator-learning signals from corrections and follow-ups

Where it flows next:
  -> REPORTS   (turns the answer into reusable memory)
  -> ME        (updates what the system knows about the user)
  -> NUDGES    (creates future return conditions if this topic matters again)


PAGE 3: REPORTS  -> "TURN THE RUN INTO MEMORY"
----------------------------------------------
User intent:
  - save something important
  - reopen work later
  - compare what changed
  - share, export, or continue

User action:
  - open saved report
  - refresh report
  - compare with prior version
  - reopen in chat
  - mark entities or topics to watch

What Reports should show:
  - what this report is about
  - why it matters
  - what changed
  - what is missing
  - what could break
  - what to do next

What Reports creates:
  - canonical saved report
  - tracked entities
  - tracked claims or themes
  - refresh conditions
  - follow-up tasks
  - shareable artifact
  - report revision history

Where it flows next:
  -> CHAT      (resume from this exact report)
  -> NUDGES    (watch this report or entity for meaningful change)
  -> ME        (learn what kind of reports the user keeps, reopens, or ignores)


PAGE 4: NUDGES  -> "BRING THE USER BACK AT THE RIGHT MOMENT"
------------------------------------------------------------
User intent:
  - know what needs attention now
  - return only when something useful changed

User sees scenarios like:
  - "This company changed in a meaningful way"
  - "This report is stale"
  - "This follow-up is due"
  - "Your prep brief is ready"
  - "This missing evidence is now available"

User action:
  - reopen the report
  - resume the chat
  - ask for a fresh brief
  - snooze
  - dismiss
  - mark done

What Nudges creates:
  - return events
  - urgency signals
  - completion signals
  - evidence that a topic still matters or no longer matters

Where it flows next:
  -> REPORTS   (reopen the exact artifact that changed)
  -> CHAT      (continue with live follow-up work)
  -> ME        (learn what kinds of nudges the user acts on or ignores)


PAGE 5: ME  -> "CONTROL THE SYSTEM'S MEMORY OF ME"
--------------------------------------------------
User intent:
  - control what the system knows
  - improve future runs
  - prevent bad style drift
  - update changing priorities and workflow

User action:
  - approve transcript imports
  - confirm or edit stakeholders
  - change evidence standards
  - change preferred lens
  - reset tone / style
  - mark workflow changes
  - add or remove tracked context

What Me stores:
  - operator context
  - permissions
  - preferred lens
  - evidence standards
  - escalation style
  - style constraints
  - workflow revisions over time

Where it flows next:
  -> HOME      (the next run starts smarter)
  -> CHAT      (answers are shaped better)
  -> REPORTS   (reports emphasize what this user cares about)
  -> NUDGES    (only meaningful nudges should fire)


THE COMPOUNDING DATA FLOW
-------------------------
question
  -> answer
  -> answer packet
  -> saved report
  -> tracked entity / tracked theme / follow-up task
  -> nudge or prep brief
  -> resumed report or resumed chat
  -> user correction / user confirmation
  -> updated operator context
  -> better next run


THE PAGE-TO-PAGE LOOP
---------------------
HOME
  starts the run

CHAT
  creates the first useful artifact

REPORTS
  turns that artifact into durable memory

NUDGES
  watches that memory and brings the user back at the right time

ME
  updates the system's understanding of how the user works

NEXT HOME OR CHAT RUN
  starts with:
    - prior reports
    - tracked entities
    - active nudges
    - learned user context
    - better prep state


WHAT "ONE COMPOUNDING WORKFLOW" REALLY MEANS
--------------------------------------------
It means the user does not have to keep re-explaining everything.

It means:
  - today's question improves tomorrow's answer
  - today's answer becomes tomorrow's report
  - today's report becomes tomorrow's watch item
  - tomorrow's change becomes the right nudge
  - the user's corrections improve how every future page behaves

That is the difference between:
  - five separate pages
and:
  - one connected system that gets more useful over time
```

### Tight artifact chain

```text
INPUT
-----
question / upload / pasted URL / resumed thread

  ->

CHAT OBJECTS
------------
session
answer
source list
execution trace
extracted entities
claims / key points
next actions
report candidate

  ->

REPORT OBJECTS
--------------
saved report
report summary
why it matters
what changed
what is missing
risks / unknowns
next steps
report revision history

  ->

TRACKING OBJECTS
----------------
tracked entity
tracked theme
watch condition
follow-up task
refresh trigger
prep brief candidate

  ->

RETURN OBJECTS
--------------
nudge
prep brief
reopened report
resumed chat session

  ->

LEARNING OBJECTS
----------------
operator-context update
workflow revision
style correction
confidence update

  ->

NEXT RUN STARTS WITH
--------------------
prior report
tracked entities
active nudges
prep state
operator context
better routing and better answers
```

### The true five-page loop

This is the user-facing loop Harness v2 is trying to create:

```text
HOME
  -> start quickly

CHAT
  -> produce answer packet and trace

REPORTS
  -> promote answer into living report

NUDGES
  -> watch that report and trigger return moments

ME
  -> refine the operator context that shapes the next run

BACK TO HOME OR CHAT
  -> start the next run with more context than before
```

### What compounding actually means here

Compounding does not mean "we saved some old outputs."

It means:

- the next answer is better because of the last report
- the next report is stronger because of the last corrections
- the next nudge is smarter because the system knows what matters to this user
- the next prep brief is faster because the entity and context are already warm
- the next run needs less explanation from the user

That is the real product difference between:

```text
five separate pages
```

and:

```text
one compounding workflow
```

## How This Shows Up On The Main Pages

### Home

What the user sees now:

- a discovery surface
- product framing before immediate value
- examples and structure before the first useful run

What the user should see with Harness v2:

- a clear ask box immediately
- optional upload right next to it
- one strong example below the fold
- lightweight prompts only when they help

What changes in behavior:

- the user can start without a heavy onboarding flow
- the system begins learning through small interactions, not a long setup form

What it should feel like:

- fast to start
- low pressure
- no need to "configure the whole system" before getting value

ASCII view:

```text
HOME TODAY                                 HOME WITH HARNESS V2
----------                                 --------------------
land on page                               land on page
  -> read what product is                    -> ask immediately
  -> decide where to start                   -> optionally upload
  -> then ask                                -> see fast progress
                                              -> system learns quietly in background
```

### Chat

What the user sees now:

- live execution
- answers, sources, and some trace behavior
- a product surface that is already strong, but still mostly run-by-run

What the user should see with Harness v2:

- answer remains central
- visible progress while the system works
- sources attached to the answer blocks
- context chips such as:
  - using saved context
  - prep mode
  - watch mode
- support for mid-run steering without losing coherence

What changes in behavior:

- follow-ups become part of one living session
- the system uses operator context, not just the last prompt
- the user can add new context midstream and the harness can reprioritize

What it should feel like:

- fast
- transparent
- grounded
- like the system understands the user's actual job, not just the sentence they typed

ASCII view:

```text
CHAT TODAY                                 CHAT WITH HARNESS V2
----------                                 --------------------
ask                                          ask
  -> wait for run                             -> see step progress quickly
  -> get answer                               -> get answer with context already applied
  -> follow up manually                       -> steer mid-run if needed
                                               -> continue same session
                                               -> reopen from reports or nudges
```

### Reports

What the user sees now:

- saved work
- a report surface that can still feel archival

What the user should see with Harness v2:

- living reports
- why this matters
- what changed
- what is missing
- what could break
- what to do next
- fast reopen back into `Chat`

What changes in behavior:

- saved work becomes reusable memory
- reports become part of future prep, nudges, and follow-up workflows

What it should feel like:

- compounding
- easier to revisit
- more like an evolving brief than a dead archive row

ASCII view:

```text
REPORTS TODAY                              REPORTS WITH HARNESS V2
-------------                              -----------------------
saved outputs                               living memory
  -> browse                                  -> browse
  -> reopen                                  -> understand why it matters
                                              -> see changes and gaps
                                              -> jump back into chat
                                              -> use in prep and future nudges
```

### Nudges

What the user sees now:

- the idea of return loops
- a promising but still incomplete follow-up surface

What the user should see with Harness v2:

- concrete reasons to return:
  - this company changed
  - this report needs refresh
  - this follow-up is due
  - your prep brief is ready

What changes in behavior:

- the product returns the user only when there is meaningful change or useful preparation
- nudges become tied to saved reports, tracked entities, and operator heartbeat rules

What it should feel like:

- relevant
- timely
- not spammy

ASCII view:

```text
NUDGES TODAY                               NUDGES WITH HARNESS V2
-----------                               ----------------------
promised loop                              real return loop
  -> possible alerts                         -> change detected
                                              -> brief prepared
                                              -> follow-up due
                                              -> user returns into report or chat
```

### Me

What the user sees now:

- private context and settings
- useful data, but not always obvious leverage

What the user should see with Harness v2:

- what the system knows
- what it learned recently
- what it is using right now
- what can be corrected, confirmed, or reset
- permission controls for transcript ingestion
- style controls so the agent does not drift into bad voice habits

What changes in behavior:

- the user can manage the memory layer directly
- the operator context becomes inspectable and revisable

What it should feel like:

- controllable
- trustworthy
- obviously tied to better future runs

ASCII view:

```text
ME TODAY                                   ME WITH HARNESS V2
--------                                   ------------------
settings and saved context                  operating context control center
  -> view saved data                          -> see what system learned
                                               -> approve imports
                                               -> confirm workflow changes
                                               -> reset or edit style
                                               -> understand why future runs improve
```

## What The Product Should Feel Like

If Harness v2 is working, the product should feel:

- faster because progress is visible earlier
- more relevant because answers use real operator context
- more prepared because the system can brief the user before important moments
- more trustworthy because sources, traces, and context usage are visible
- more compounding because saved work improves later work
- less robotic because the system learns workflow strongly but does not overfit into corporate-speak

## What Changed Under The Hood To Create That Feeling

This is the shortest architecture translation:

```text
LAYER 0
specification / elicitation
  -> learns how the user works

HARNESS V2
plan -> execute -> synthesize -> verify
  with better structure, context, and trace quality

ADVISOR MODE BY DESIGN
fast executive lane by default
  -> deeper advisor lane when the work is ambiguous, high-stakes, or explicitly needs more reasoning

OPERATOR CONTEXT
typed + versioned + revisable
  -> reused across chat, reports, nudges, and prep
```

Plain-English mapping:

- `elicitation layer` -> users do not need a giant setup flow, but the system still learns
- `typed operator context` -> answers feel more aligned to the user's real work
- `tiered execution + better traces` -> the app feels faster and clearer while it works
- `advisor mode + dynamic routing` -> the app does not waste deep reasoning on every run, but it can escalate when the problem is genuinely harder
- `anticipatory prep mode` -> the app helps before calls, meetings, and follow-ups
- `style-drift guardrails` -> the app stays sharp instead of turning into jargon-heavy corporate mush

Plain-English rule:

```text
easy and medium work should stay fast
hard work should get a deeper advisor lane
and the user should be able to nudge the system to go deeper
```

Closest production precedent:

```text
Claude Code `opusplan`
  -> stronger planning lane
  -> cheaper execution lane
```

NodeBench should mirror that product behavior in its own way:

- most runs stay on the fast path
- harder runs escalate automatically
- the user can force a deeper pass when needed

## The Core Product Reframe

```text
EXISTING
answer the question well

PROPOSED
understand how the user works
answer with that context
save the useful artifact
prepare the user for what comes next
```

## Read This Next

- [HARNESS_V2_PROPOSAL.md](./HARNESS_V2_PROPOSAL.md)
- [NINE_LAYER_WALKTHROUGH.md](./NINE_LAYER_WALKTHROUGH.md)
