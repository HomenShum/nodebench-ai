// Static data for the DISCO diligence report — entities, claims, sources,
// notebook blocks, agent run traces, and proposed changes. Shared across all
// three layout variants of ReportDetail.

const RD_REPORT = {
  id: 'disco',
  title: 'DISCO — diligence debrief',
  status: 'verified',
  saved: 'Saved 2h ago',
  template: 'Company dossier',
  branches: 6,
  sources: 24,
  watching: true,
  scope: 'Series C diligence · Nov 2026',
};

const RD_OUTLINE = [
  { id: 's-summary',      depth: 1, label: 'Executive summary',      n: 1                                                  },
  { id: 's-thesis',       depth: 1, label: 'Investment thesis',      n: 2                                                  },
  { id: 's-product',      depth: 1, label: 'Product & moat',         n: 3                                                  },
  { id: 's-customers',    depth: 2, label: 'Customer concentration', kind: 'claim',  flavor: 'claim'                       },
  { id: 's-market',       depth: 1, label: 'Market & positioning',   n: 4                                                  },
  { id: 's-team',         depth: 1, label: 'Team',                   n: 5                                                  },
  { id: 's-team-disco',   depth: 2, label: 'Kiwi Camara (CEO)',      kind: 'entity', flavor: 'entity'                      },
  { id: 's-financials',   depth: 1, label: 'Financials',             n: 6                                                  },
  { id: 's-eu-risk',      depth: 2, label: 'EU regulatory exposure', kind: 'weak',   flavor: 'weak'                        },
  { id: 's-questions',    depth: 1, label: 'Open questions',         n: 7                                                  },
  { id: 's-trace',        depth: 1, label: 'Run trace',              n: 8                                                  },
];

const RD_BLOCKS = [
  { id: 'b-eyebrow',  type: 'eyebrow', text: 'Diligence · Series C · Active' },
  { id: 'b-h1',       type: 'h1',      text: 'DISCO — diligence debrief' },
  { id: 'b-meta',     type: 'meta' },

  { id: 's-summary',  type: 'h2',      text: 'Executive summary' },
  { id: 'b-summary',  type: 'p',
    spans: [
      { t: 'text', v: 'Series C-stage legal-tech company. ' },
      { t: 'ent', kind: 'company', label: 'DISCO', id: 'disco' },
      { t: 'text', v: ' raised a ' },
      { t: 'ent', kind: 'event', label: '$100M Series C', id: 'evt-c' },
      { t: 'text', v: ' in October, with ' },
      { t: 'cite', n: 1 },
      { t: 'text', v: ' confirming participation from ' },
      { t: 'ent', kind: 'company', label: 'Bessemer', id: 'bess' },
      { t: 'text', v: '. Customer count crossed ' },
      { t: 'ent', kind: 'metric', label: '2,400+', id: 'm-cust' },
      { t: 'text', v: ' across AmLaw 200 firms ' },
      { t: 'cite', n: 2 },
      { t: 'text', v: '. Two material risks: customer concentration and EU regulatory exposure.' },
    ]
  },

  { id: 's-thesis',   type: 'h2',      text: 'Investment thesis' },
  { id: 'b-thesis',   type: 'p',
    spans: [
      { t: 'text', v: 'eDiscovery is the wedge; the long game is a litigation-OS. ' },
      { t: 'ent', kind: 'person', label: 'Kiwi Camara', id: 'kiwi' },
      { t: 'text', v: ' has positioned every product line — review, hold, depositions — as nodes on a single graph, which is what makes ' },
      { t: 'ent', kind: 'company', label: 'Cellebrite', id: 'cellebrite' },
      { t: 'text', v: ' and ' },
      { t: 'ent', kind: 'company', label: 'Relativity', id: 'rel' },
      { t: 'text', v: ' look monolithic by comparison ' },
      { t: 'cite', n: 3 },
      { t: 'text', v: '.' },
    ]
  },
  { id: 'b-quote',    type: 'quote',
    text: 'We are not selling discovery — we are selling the spine that holds together every workflow a litigator touches.',
    att: 'Kiwi Camara · TechCrunch Disrupt 2026'
  },

  { id: 's-product',  type: 'h2',      text: 'Product & moat' },
  { id: 'b-card-co',  type: 'card',
    kind: 'company',
    name: 'DISCO',
    attrs: [
      ['HQ',           'Austin, TX'],
      ['Founded',      '2013'],
      ['Employees',    '~520'],
      ['Last raise',   '$100M Series C'],
      ['Customers',    '2,400+ firms'],
      ['Stage',        'Series C'],
    ]
  },
  { id: 'b-product',  type: 'p',
    spans: [
      { t: 'text', v: 'Three product surfaces share a typed knowledge graph: ' },
      { t: 'ent', kind: 'product', label: 'DISCO Review', id: 'p-review' },
      { t: 'text', v: ', ' },
      { t: 'ent', kind: 'product', label: 'DISCO Hold', id: 'p-hold' },
      { t: 'text', v: ', and ' },
      { t: 'ent', kind: 'product', label: 'DISCO Depositions', id: 'p-depo' },
      { t: 'text', v: '. The graph is the moat — competitors fork data per workflow. ' },
      { t: 'cite', n: 4 },
    ]
  },

  { id: 's-customers', type: 'claim', conf: 'verified',
    text: 'Top 5 customers represent ~31% of ARR; concentration has fallen ~9 pts year over year.',
    sources: ['CFO call · Nov 12', 'Pre-IPO data room · Aug 2026'],
    confidence: 'high',
    why: 'Two independent disclosures within 90 days; numbers reconcile to ±0.4pt.',
  },

  { id: 'b-trace-1',  type: 'inline-trace',
    label: 'NodeBench attached 3 captures and created 1 entity',
    sub: '6 steps · 1.4s · memory-first',
    state: 'ok',
    open: false,
    steps: [
      { kind: 'mem',     state: 'ok',  label: 'searched workspace memory',         meta: 'hits: 12 · cost: 0',          ev: ['Acme dossier', 'Disco Q3 capture'] },
      { kind: 'corpus',  state: 'ok',  label: 'searched event corpus',             meta: 'hits: 4 · cost: 0' },
      { kind: 'cache',   state: 'ok',  label: 'pulled public source cache',        meta: 'hits: 3 · refresh skipped' },
      { kind: 'extract', state: 'ok',  label: 'extracted candidate claims',        meta: '7 candidates · 4 promoted' },
      { kind: 'compose', state: 'ok',  label: 'composed compactFindings patch',    meta: '3 captures attached · 1 entity created' },
      { kind: 'live',    state: 'warn',label: 'skipped live web search',           meta: 'budget hit · 0 calls used' },
    ],
  },

  { id: 's-market',   type: 'h2',      text: 'Market & positioning' },
  { id: 'b-market',   type: 'p',
    spans: [
      { t: 'text', v: 'eDiscovery TAM is consolidating around three players. DISCO leads on velocity-to-deploy; ' },
      { t: 'ent', kind: 'company', label: 'Relativity', id: 'rel' },
      { t: 'text', v: ' leads on ecosystem; ' },
      { t: 'ent', kind: 'company', label: 'Everlaw', id: 'everlaw' },
      { t: 'text', v: ' leads on price. The interesting wedge is the ' },
      { t: 'ent', kind: 'theme', label: 'voice-agent eval', id: 'voice' },
      { t: 'text', v: ' trend ' },
      { t: 'cite', n: 5 },
      { t: 'text', v: '.' },
    ]
  },

  { id: 's-team',     type: 'h2',      text: 'Team' },
  { id: 'b-team',     type: 'ul', items: [
    { spans: [
      { t: 'ent', kind: 'person', label: 'Kiwi Camara', id: 'kiwi' },
      { t: 'text', v: ' — Founder/CEO. Stanford CS. Founded DISCO in 2013.' },
    ]},
    { spans: [
      { t: 'text', v: 'Michael Lafair — CFO. Joined 2021 from ' },
      { t: 'ent', kind: 'company', label: 'Salesforce', id: 'sfdc' },
      { t: 'text', v: '. Took DISCO public in 2021.' },
    ]},
    { spans: [
      { t: 'text', v: 'Anita Park — Chief Revenue Officer. Hired October to lead the EU push ' },
      { t: 'cite', n: 6 },
      { t: 'text', v: '.' },
    ]},
  ]},
  { id: 'b-card-pp',  type: 'card',
    kind: 'person',
    name: 'Kiwi Camara',
    attrs: [
      ['Role',         'Founder, CEO'],
      ['Education',    'Stanford CS, 2003'],
      ['Prior',        'Camara & Sibley LLP'],
      ['Tenure',       '13y at DISCO'],
      ['Confirmed',    'TC Disrupt 2026'],
      ['Memos',        '4 saved'],
    ]
  },

  { id: 's-financials', type: 'h2',    text: 'Financials' },
  { id: 'b-fin',      type: 'p',
    spans: [
      { t: 'text', v: 'ARR run-rate ' },
      { t: 'ent', kind: 'metric', label: '$268M', id: 'arr' },
      { t: 'text', v: ' as of Q3, +38% YoY ' },
      { t: 'cite', n: 7 },
      { t: 'text', v: '. NRR sits at 119%, though gross retention slipped from 96% to 93% in the prior six months ' },
      { t: 'cite', n: 8 },
      { t: 'text', v: ' — flagged for follow-up.' },
    ]
  },

  { id: 's-eu-risk',  type: 'claim', conf: 'weak',
    text: 'GDPR Article 22 (automated decision-making) carve-outs may require model-card disclosure for the AI Review module.',
    sources: ['Bird & Bird memo · Sep 2026', 'EU AI Act Art. 22'],
    confidence: 'low',
    why: 'Two legal opinions, but DISCO has not published its own response. Recommend verify direct.',
  },

  { id: 's-questions', type: 'h2',     text: 'Open questions' },
  { id: 'b-q',        type: 'ul', items: [
    { spans: [{ t: 'text', v: 'How concentrated is gross retention loss — is it AmLaw 200 or smaller firms?' }] },
    { spans: [{ t: 'text', v: 'What is the timeline for the EU AI Act response and which counsel is leading?' }] },
    { spans: [
      { t: 'text', v: 'Is the deposition product capable of competing with ' },
      { t: 'ent', kind: 'company', label: 'Veritone Legal', id: 'verit' },
      { t: 'text', v: ' on multilingual?' },
    ]},
  ]},

  { id: 's-trace',    type: 'h3',      text: 'Run trace' },
  { id: 'b-trace-2',  type: 'inline-trace',
    label: 'Full report regeneration',
    sub: 'Triggered by "refresh DISCO dossier" · 11 steps · 6.2s',
    state: 'ok',
    open: true,
    steps: [
      { kind: 'mem',     state: 'ok', label: 'memory hit on prior DISCO report (v3)', meta: 'reused 12 cards · 0 calls' },
      { kind: 'corpus',  state: 'ok', label: 'event corpus: TC Disrupt 2026',          meta: '14 captures · 0 calls' },
      { kind: 'cache',   state: 'ok', label: 'source cache: 9 sources fresh',          meta: '0 calls' },
      { kind: 'cache',   state: 'warn',label:'1 source stale — bird-and-bird.com',     meta: 'refreshed · 1 call' },
      { kind: 'extract', state: 'ok', label: 'extracted 4 new claims',                 meta: '3 verified · 1 weak' },
      { kind: 'compose', state: 'ok', label: 'merged into existing dossier',           meta: '0 conflicts · 3 patches' },
      { kind: 'graph',   state: 'ok', label: 'created edge: DISCO → voice-agent eval', meta: 'typed: COMPETES_WITH' },
      { kind: 'compose', state: 'ok', label: 'queued 1 follow-up on EU risk',          meta: 'assigned to Harper' },
    ],
  },
];

const RD_PROPOSALS = [
  {
    id: 'p-1',
    kind: 'add',
    summary: 'Attach 3 captures from TC Disrupt 2026 to "Team" section',
    detail: 'capture://disrupt-2026/booth-D14-1 · 2 · 3',
    blockTarget: 's-team',
  },
  {
    id: 'p-2',
    kind: 'entity',
    summary: 'Create entity "Anita Park" (CRO)',
    detail: 'kind: person · evidence: 2 · confidence: medium',
    blockTarget: 'b-team',
  },
  {
    id: 'p-3',
    kind: 'link',
    summary: 'Link DISCO → voice-agent eval (COMPETES_WITH)',
    detail: 'typed-edge · explanation block · 1 supporting source',
    blockTarget: 'b-market',
  },
  {
    id: 'p-4',
    kind: 'remove',
    summary: 'Mark NRR claim as needs-verification',
    detail: 'gross retention slip 96% → 93% only single-sourced',
    blockTarget: 'b-fin',
  },
  {
    id: 'p-5',
    kind: 'add',
    summary: 'Clone "Open questions" template into 2 follow-ups',
    detail: 'extract_followups action · 2 actions queued',
    blockTarget: 'b-q',
  },
];

const RD_FEED = [
  { id: 'f-1', state: 'active', label: 'extracting claims from Bird & Bird memo',       meta: 'extract_claims · 0.4s', age: 'now' },
  { id: 'f-2', state: 'ok',     label: 'attached 3 captures to "Team"',                  meta: 'organize_notes · 0.2s', age: '2s' },
  { id: 'f-3', state: 'ok',     label: 'memory hit · skipping live search',              meta: 'budget · 0 calls',      age: '8s' },
  { id: 'f-4', state: 'ok',     label: 'created entity "Anita Park"',                    meta: 'compactFindings · 0.3s',age: '12s' },
  { id: 'f-5', state: 'ok',     label: 'cached 9 sources for cohort reuse',              meta: 'shared-context · 0s',   age: '14s' },
  { id: 'f-6', state: 'warn',   label: 'flagged GDPR Art. 22 claim as weak',             meta: 'claim_audit · 0.6s',    age: '18s' },
  { id: 'f-7', state: 'ok',     label: 'cloned dossier template from Acme',              meta: 'clone_structure · 0.5s',age: '24s' },
  { id: 'f-8', state: 'ok',     label: 'searched workspace memory (12 hits)',            meta: 'hybrid · 0 calls',      age: '28s' },
];

const RD_SOURCES = [
  { n: 1, kind: 'press',  title: 'DISCO closes $100M Series C',                  pub: 'TechCrunch',   date: 'Oct 18, 2026', cached: true },
  { n: 2, kind: 'press',  title: '"AmLaw 200 stays loyal to DISCO" — interview', pub: 'Law.com',      date: 'Oct 24, 2026', cached: true },
  { n: 3, kind: 'event',  title: 'TC Disrupt 2026 panel transcript',             pub: 'Capture',      date: 'Sep 14, 2026', cached: true },
  { n: 4, kind: 'memo',   title: 'Internal product-graph teardown',              pub: 'Notebook',     date: 'Aug 30, 2026', cached: true },
  { n: 5, kind: 'report', title: 'Voice-agent eval: state of play',              pub: 'NodeBench',    date: 'Nov 02, 2026', cached: true },
  { n: 6, kind: 'press',  title: '"DISCO hires Anita Park as CRO"',              pub: 'PR Newswire',  date: 'Oct 02, 2026', cached: true },
  { n: 7, kind: 'filing', title: 'Q3 2026 earnings release',                     pub: 'SEC EDGAR',    date: 'Oct 28, 2026', cached: true },
  { n: 8, kind: 'memo',   title: 'CFO call — gross retention',                   pub: 'Notebook',     date: 'Nov 12, 2026', cached: false },
];

const RD_ENTITIES = [
  { id: 'disco',  kind: 'company', label: 'DISCO',         mentions: 14 },
  { id: 'kiwi',   kind: 'person',  label: 'Kiwi Camara',   mentions: 6  },
  { id: 'rel',    kind: 'company', label: 'Relativity',    mentions: 3  },
  { id: 'cellebrite', kind: 'company', label: 'Cellebrite', mentions: 1 },
  { id: 'everlaw',kind: 'company', label: 'Everlaw',       mentions: 1  },
  { id: 'evt-c',  kind: 'event',   label: '$100M Series C', mentions: 2 },
  { id: 'voice',  kind: 'theme',   label: 'voice-agent eval', mentions: 2 },
];

const RD_SLASH_COMMANDS = [
  { id: 'h2',          icon: 'FileText',    label: 'Heading 2',         hint: 'Major section',                kbd: '/h2' },
  { id: 'h3',          icon: 'FileText',    label: 'Heading 3',         hint: 'Sub-section',                  kbd: '/h3' },
  { id: 'claim',       icon: 'Check',       label: 'Claim',             hint: 'Sourced statement',            kbd: '/claim' },
  { id: 'card',        icon: 'Grid',        label: 'Entity card',       hint: 'Embed person / company',       kbd: '/card' },
  { id: 'quote',       icon: 'Book',        label: 'Quote',             hint: 'Attributed pull',              kbd: '/quote' },
  { id: 'attach',      icon: 'Link',        label: 'Attach source',     hint: 'Cite an existing source',      kbd: '/cite' },
  { id: 'followup',    icon: 'Bell',        label: 'Follow-up',         hint: 'Create a tracked action',      kbd: '/todo' },
  { id: 'expand',      icon: 'Sparkles',    label: 'Expand entity',     hint: 'Pull facts from memory',       kbd: '/expand' },
  { id: 'compare',     icon: 'List',        label: 'Compare entities',  hint: 'Side-by-side card',            kbd: '/compare' },
];

const RD_SELECTION_ACTIONS = [
  { id: 'entity',   label: 'Create entity'   },
  { id: 'claim',    label: 'Create claim'    },
  { id: 'attach',   label: 'Attach source'   },
  { id: 'followup', label: 'Follow-up'       },
  { id: 'move',     label: 'Move…'           },
  { id: 'expand',   label: 'Expand'          },
  { id: 'compare',  label: 'Compare'         },
  { id: 'card',     label: 'Turn into card'  },
  { id: 'ask',      label: 'Ask about this'  },
];

window.RD_REPORT = RD_REPORT;
window.RD_OUTLINE = RD_OUTLINE;
window.RD_BLOCKS = RD_BLOCKS;
window.RD_PROPOSALS = RD_PROPOSALS;
window.RD_FEED = RD_FEED;
window.RD_SOURCES = RD_SOURCES;
window.RD_ENTITIES = RD_ENTITIES;
window.RD_SLASH_COMMANDS = RD_SLASH_COMMANDS;
window.RD_SELECTION_ACTIONS = RD_SELECTION_ACTIONS;
