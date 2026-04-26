// ChatStreamData — seed for the Orbital Labs research thread.
// One continuous conversation that builds a living entity report.
// Each agent turn carries: trace, run-bar telemetry, prose with entity pills + citations,
// optional embedded entity card, sources, follow-ups.

const ORBITAL_THREAD = {
  id: 'orbital',
  title: 'Orbital Labs · should I follow up?',
  rootEntity: 'orbital-labs',
  event: 'Ship Demo Day',
  freshness: 'fresh',
  updatedAgo: '4m ago',
  starred: true,
  // Cumulative telemetry across the whole thread
  telemetry: {
    memoryHits: 11,
    entitiesResolved: 6,
    sourcesUsed: 14,
    paidCalls: 1,
  },
  // Report this thread is being saved into
  report: {
    id: 'r-orbital',
    name: 'Orbital Labs · diligence',
    status: 'live',
    sectionsAdded: 3,
    claimsAdded: 7,
    followupsCreated: 2,
  },
  turns: [
    // ─── Turn 1 ───────────────────────────────────────────────────
    { id: 't1', role: 'user', time: '2:14 PM',
      text: 'I\'m at Ship Demo Day. Help me keep track.' },

    { id: 't2', role: 'agent', time: '2:14 PM',
      // Run-bar shown above this turn
      run: { kind: 'context', summary: 'Started event context', detail: 'Using event corpus · Ship Demo Day' },
      trace: [
        { step: 'mem',    label: 'searched memory · 0.18s',          hits: '2 prior captures'   },
        { step: 'corpus', label: 'event corpus · Ship Demo Day',     hits: '1 active session'   },
      ],
      body: [
        { kind: 'p', segs: [
          { t: 't', v: 'Got it — anchored to ' },
          { t: 'pill', kind: 'event', id: 'ship-demo-day', v: 'Ship Demo Day' },
          { t: 't', v: '. New captures will land here as event notes. Speak, type, paste, or upload — I\'ll route them to the right entity.' },
        ]},
      ],
      runUpdates: [
        { kind: 'session', label: 'Session pinned', detail: '0 paid calls so far' },
      ],
      followups: [
        'Capture a person',
        'Capture a company',
        'Open the event report',
      ],
    },

    // ─── Turn 2 ───────────────────────────────────────────────────
    { id: 't3', role: 'user', time: '2:21 PM',
      text: 'Met Alex from Orbital Labs. They build voice-agent eval infra. Looking for healthcare design partners.' },

    { id: 't4', role: 'agent', time: '2:21 PM',
      run: { kind: 'capture', summary: 'Captured to Ship Demo Day', detail: '3 entities resolved · 1 follow-up created' },
      trace: [
        { step: 'extract', label: 'parsed capture',                 hits: '1 person · 1 company · 1 theme' },
        { step: 'mem',     label: 'searched memory · 0.22s',        hits: '0 prior matches for "Orbital Labs"' },
        { step: 'resolve', label: 'resolving entities',             hits: 'created · pending confirm' },
      ],
      body: [
        { kind: 'p', segs: [
          { t: 't', v: 'Captured. New entities: ' },
          { t: 'pill', kind: 'person',   id: 'alex',          v: 'Alex',                   subtle: 'first name only' },
          { t: 't', v: ' · ' },
          { t: 'pill', kind: 'company',  id: 'orbital-labs',  v: 'Orbital Labs',           subtle: 'new' },
          { t: 't', v: ' · ' },
          { t: 'pill', kind: 'theme',    id: 'voice-eval',    v: 'voice-agent eval infra' },
          { t: 't', v: '.' },
        ]},
        { kind: 'p', segs: [
          { t: 't', v: 'Linked to ' },
          { t: 'pill', kind: 'event', id: 'ship-demo-day', v: 'Ship Demo Day' },
          { t: 't', v: ' · created follow-up to confirm Alex\'s last name and contact channel.' },
        ]},
      ],
      runUpdates: [
        { kind: 'graph', label: '3 entities · 4 edges added' },
        { kind: 'followup', label: '1 follow-up: confirm Alex\'s contact' },
      ],
      followups: [
        'Research Orbital Labs',
        'Who else is in voice-agent eval?',
      ],
    },

    // ─── Turn 3 — the big research turn ───────────────────────────
    { id: 't5', role: 'user', time: '2:24 PM',
      text: 'Research Orbital Labs and tell me if I should follow up.' },

    { id: 't6', role: 'agent', time: '2:24 PM',
      run: {
        kind: 'research',
        summary: 'Memory-first research · 14 sources · 1 paid call',
        detail: 'cache · corpus · live refresh',
        budget: { mem: 8, cache: 5, live: 1, tokens: 11200 },
      },
      trace: [
        { step: 'mem',     label: 'memory · 8 hits in 0.14s',                 hits: '3 prior reports · 2 captures · 3 graph rings' },
        { step: 'cache',   label: 'source cache · 5 reusable',                hits: '2 fresh · 3 ≤14d' },
        { step: 'live',    label: 'live refresh · 1 paid call',               hits: 'public profile · 220ms' },
        { step: 'extract', label: 'graph expansion · ring 1',                 hits: '6 neighbors · 11 edges' },
        { step: 'compose', label: 'synthesizing answer packet',               hits: '5 sections · 7 claims' },
      ],
      // The structured answer body — short answer, why, evidence, risks, next
      body: [
        { kind: 'h', v: 'Short answer' },
        { kind: 'p', segs: [
          { t: 'strong', v: 'Yes, follow up. ' },
          { t: 't', v: 'Their pitch overlaps with two threads you already care about — agent evaluation and healthcare workflow QA — and they\'re actively looking for design partners' },
          { t: 'cite', n: 1 },
          { t: 't', v: '.' },
        ]},

        { kind: 'h', v: 'Why it matters' },
        { kind: 'p', segs: [
          { t: 'pill', kind: 'company', id: 'orbital-labs', v: 'Orbital Labs' },
          { t: 't', v: ' (Series Seed, Aug 2025, $4.2M led by ' },
          { t: 'pill', kind: 'company', id: 'amplify', v: 'Amplify Partners' },
          { t: 't', v: ')' },
          { t: 'cite', n: 2 },
          { t: 't', v: ' is one of three teams shipping ' },
          { t: 'pill', kind: 'theme', id: 'voice-eval', v: 'voice-agent eval' },
          { t: 't', v: ' infrastructure — workflow replay, synthetic call generation, and grounded eval against transcripts. Their framing is closer to ' },
          { t: 'pill', kind: 'company', id: 'braintrust', v: 'Braintrust' },
          { t: 't', v: ' than to ' },
          { t: 'pill', kind: 'company', id: 'arize', v: 'Arize' },
          { t: 't', v: ', which is the right shape for the workflows you map.' },
        ]},

        { kind: 'h', v: 'Evidence' },
        { kind: 'list', items: [
          [
            { t: 't', v: 'Founders ex-' },
            { t: 'pill', kind: 'company', id: 'olive-ai', v: 'Olive AI' },
            { t: 't', v: ' (Sam Reichelt, eng) and ex-' },
            { t: 'pill', kind: 'company', id: 'epic', v: 'Epic' },
            { t: 't', v: ' (Maya Cole, clinical informatics)' },
            { t: 'cite', n: 3 },
            { t: 't', v: ' — credible healthcare context.' },
          ],
          [
            { t: 't', v: 'Three named pilots: ' },
            { t: 'pill', kind: 'company', id: 'oscar', v: 'Oscar Health' },
            { t: 't', v: ', ' },
            { t: 'pill', kind: 'company', id: 'commure', v: 'Commure' },
            { t: 't', v: ', and an unnamed payer' },
            { t: 'cite', n: 4 },
            { t: 't', v: '.' },
          ],
          [
            { t: 't', v: 'GitHub activity up 4× since June; ' },
            { t: 'pill', kind: 'theme', id: 'voice-eval', v: 'voice-eval' },
            { t: 't', v: ' SDK is open and has 12 external contributors' },
            { t: 'cite', n: 5 },
            { t: 't', v: '.' },
          ],
        ]},

        // Embedded entity card — the centerpiece of this turn
        { kind: 'entity-card', id: 'orbital-labs' },

        { kind: 'h', v: 'Open questions' },
        { kind: 'list', items: [
          [{ t: 't', v: 'Voice-only or full workflow agents (chat + voice + EHR write-back)?' }],
          [{ t: 't', v: 'Do they handle PHI today, or sandboxed transcripts only?' }],
          [{ t: 't', v: 'Pilots vs. design partners — what\'s the actual ask?' }],
        ]},

        { kind: 'h', v: 'Recommended next action' },
        { kind: 'p', segs: [
          { t: 't', v: 'Reply to Alex by EOD with two specific questions: (1) does their replay infra accept full ' },
          { t: 'pill', kind: 'theme', id: 'workflow-replay', v: 'workflow replay' },
          { t: 't', v: ' or only audio, and (2) are they looking for paid pilots or unpaid design partners. I drafted a 4-line email — open the report to review.' },
        ]},
      ],
      sources: [
        { n: 1, title: 'Orbital Labs design partner page',  domain: 'orbitallabs.dev',   fav: 'O', cached: false, age: 'live' },
        { n: 2, title: 'Amplify Partners portfolio update', domain: 'amplifypartners.com', fav: 'A', cached: true,  age: '14d' },
        { n: 3, title: 'Sam Reichelt LinkedIn',             domain: 'linkedin.com',      fav: 'L', cached: true,  age: '7d'  },
        { n: 4, title: 'Commure pilot announcement',        domain: 'commure.com',       fav: 'C', cached: true,  age: '11d' },
        { n: 5, title: 'orbital-labs/voice-eval',           domain: 'github.com',        fav: 'G', cached: true,  age: '2d'  },
      ],
      runUpdates: [
        { kind: 'graph',     label: '6 ring-1 neighbors added',  detail: 'Olive AI · Epic · Oscar Health · Commure · Braintrust · Arize' },
        { kind: 'notebook',  label: 'Notebook updated',          detail: '3 sections · 7 claims · 5 sources' },
        { kind: 'followup',  label: '1 follow-up created',       detail: 'Reply to Alex by EOD · drafted email saved' },
      ],
      followups: [
        'Compare Orbital Labs vs. Braintrust',
        'Show the graph',
        'Draft the reply to Alex',
        'What did we say about voice-eval before?',
      ],
    },

    // ─── Turn 4 — promote-to-root demo ───────────────────────────
    { id: 't7', role: 'user', time: '2:31 PM',
      text: 'Who is Alex?' },

    { id: 't8', role: 'agent', time: '2:31 PM',
      run: { kind: 'lookup', summary: 'Using current report context', detail: '0 paid calls · 1 graph hop' },
      trace: [
        { step: 'context', label: 'using current report context',  hits: 'Orbital Labs · Ship Demo Day' },
        { step: 'mem',     label: 'graph hop · person ring',        hits: '1 candidate · medium confidence' },
      ],
      body: [
        { kind: 'p', segs: [
          { t: 'strong', v: 'Likely Alex Park, ' },
          { t: 't', v: 'co-founder and head of product at ' },
          { t: 'pill', kind: 'company', id: 'orbital-labs', v: 'Orbital Labs' },
          { t: 't', v: '. Match confidence is medium — I matched on first name + Ship Demo Day attendee list + LinkedIn proximity to Sam Reichelt' },
          { t: 'cite', n: 6 },
          { t: 't', v: '. Confirm before I promote this match across your reports.' },
        ]},
        { kind: 'confirm', match: 'Alex Park · Orbital Labs', confidence: 'medium' },
      ],
      sources: [
        { n: 6, title: 'Ship Demo Day attendee list',  domain: 'shipdemoday.com',  fav: 'S', cached: true, age: '1h' },
      ],
      followups: [
        'Promote Alex to root',
        'Show people I should follow up with first',
      ],
    },
  ],
};

// Other prior threads (sidebar)
const OTHER_THREADS = {
  'mercor': {
    id: 'mercor', title: 'Mercor — Series B signal?', rootEntity: 'Mercor',
    updatedAgo: '1d ago', turns: [],
  },
  'cognition': {
    id: 'cognition', title: 'Devin benchmark postmortem', rootEntity: 'Cognition',
    updatedAgo: '3d ago', turns: [],
  },
  'turing': {
    id: 'turing', title: 'Turing contract spend YoY', rootEntity: 'Turing',
    updatedAgo: '1w ago', turns: [],
  },
  'foundation': {
    id: 'foundation', title: 'Foundation labs positioning', rootEntity: 'Foundation Labs',
    updatedAgo: '3w ago', turns: [],
  },
  'disco': {
    id: 'disco', title: 'DISCO — worth reaching out?', rootEntity: 'DISCO',
    updatedAgo: '2h ago', turns: [],
  },
};

// Entity card data — populated for each pill that has a card
const ENTITY_CARDS = {
  'orbital-labs': {
    id: 'orbital-labs', kind: 'company',
    name: 'Orbital Labs', tagline: 'Voice-agent evaluation infrastructure',
    location: 'San Francisco · 8 ppl',
    fundedRound: 'Series Seed', fundedAmount: '$4.2M', fundedLead: 'Amplify Partners', fundedDate: 'Aug 2025',
    summary: 'Workflow replay + synthetic call generation for healthcare voice agents. Open-core SDK; design partners with Oscar, Commure, one unnamed payer.',
    why: 'Overlaps with your agent-eval and healthcare-workflow threads. Active design-partner search.',
    relations: [
      { kind: 'person',  id: 'alex',         label: 'Alex Park',        rel: 'co-founder · product' },
      { kind: 'person',  id: 'sam',          label: 'Sam Reichelt',     rel: 'co-founder · eng (ex-Olive AI)' },
      { kind: 'person',  id: 'maya',         label: 'Maya Cole',        rel: 'clinical lead (ex-Epic)' },
      { kind: 'company', id: 'oscar',        label: 'Oscar Health',     rel: 'design partner' },
      { kind: 'company', id: 'commure',      label: 'Commure',          rel: 'design partner' },
      { kind: 'theme',   id: 'voice-eval',   label: 'voice-agent eval', rel: 'category' },
      { kind: 'company', id: 'braintrust',   label: 'Braintrust',       rel: 'similar shape' },
      { kind: 'company', id: 'arize',        label: 'Arize',            rel: 'adjacent · larger' },
    ],
    claims: 3,
    sources: 5,
    priorChats: 0,
  },
  'alex': {
    id: 'alex', kind: 'person',
    name: 'Alex Park', tagline: 'Co-founder · product · Orbital Labs',
    location: 'San Francisco',
    summary: 'Met at Ship Demo Day. Pitched voice-agent eval infra, looking for healthcare design partners. Confidence on identity: medium until confirmed.',
    why: 'Direct contact at Orbital Labs — the right person for the design-partner conversation.',
    relations: [
      { kind: 'company', id: 'orbital-labs', label: 'Orbital Labs', rel: 'co-founder' },
      { kind: 'event',   id: 'ship-demo-day', label: 'Ship Demo Day', rel: 'met here' },
    ],
    claims: 2,
    sources: 1,
    priorChats: 0,
  },
  'voice-eval': {
    id: 'voice-eval', kind: 'theme',
    name: 'voice-agent eval', tagline: 'Eval + observability for voice agents',
    summary: 'Replay + synthetic generation + grounded scoring against transcripts. Three teams shipping today: Orbital Labs, Braintrust (adjacent), Arize (adjacent · larger).',
    why: 'Active research thread — 4 reports tagged this in the last quarter.',
    relations: [
      { kind: 'company', id: 'orbital-labs', label: 'Orbital Labs', rel: 'pure-play' },
      { kind: 'company', id: 'braintrust',   label: 'Braintrust',   rel: 'similar shape' },
      { kind: 'company', id: 'arize',        label: 'Arize',        rel: 'adjacent · larger' },
    ],
    claims: 11,
    sources: 23,
    priorChats: 4,
  },
  'ship-demo-day': {
    id: 'ship-demo-day', kind: 'event',
    name: 'Ship Demo Day', tagline: 'Event report · live',
    location: 'SF · Nov 14, 2025',
    summary: '12 captures so far. 3 follow-ups pending.',
    why: 'You\'re live in this event. Captures route here by default.',
    relations: [
      { kind: 'person',  id: 'alex',         label: 'Alex Park',     rel: 'attendee' },
      { kind: 'company', id: 'orbital-labs', label: 'Orbital Labs',  rel: 'demoing' },
    ],
    claims: 0, sources: 0, priorChats: 0,
  },
};

// Suggested-prompt chips for empty state
const PROMPTS = [
  'Research a company',
  'Capture an event note',
  'Ask about a person',
  'Compare two entities',
  'Open a prior report',
];

window.NBStreamThread  = ORBITAL_THREAD;
window.NBStreamOthers  = OTHER_THREADS;
window.NBEntityCards   = ENTITY_CARDS;
window.NBStreamPrompts = PROMPTS;
