// ChatThread — classic Claude-style conversation surface.
// Sidebar (past threads) + scrolling thread (user right, agent left) + pinned composer.
// Rich agent turns: reasoning trace, sources strip, branches, action chips, follow-ups, quote/reply.
// Edit/retry supported. State lives in-component; the topnav wraps it.

// ──────────────────────────────────────────────────────────────────────────
// Seed data — threads + turns for the demo
// ──────────────────────────────────────────────────────────────────────────

const THREAD_SEED = {
  'disco': {
    id: 'disco',
    title: 'DISCO — worth reaching out?',
    entity: 'DISCO',
    starred: true,
    updatedAgo: '2h ago',
    turns: [
      {
        id: 't1', role: 'user',
        time: '2:18 PM',
        text: 'We have been thinking about DISCO for a quarter. Given the Series C news, is now the right time to reach out? What are the real risks?',
      },
      {
        id: 't2', role: 'agent',
        time: '2:18 PM',
        trace: [
          'resolving entity → DISCO (legal tech, Austin TX)',
          'spawned 6 research branches',
          'linkup + gemini grounding · 24 sources',
          'cross-referenced EU regulatory deltas',
          'verified against 10 deterministic gates',
          'synthesized answer',
        ],
        body: [
          { kind: 'p', segs: [
            { t: 'strong', v: 'Yes — now is the right moment. ' },
            { t: 't', v: 'DISCO closed a ' },
            { t: 'strong', v: '$100M Series C led by Greylock' },
            { t: 't', v: ' in November 2025' },
            { t: 'cite', n: 1 },
            { t: 't', v: ', putting ARR growth 2.5× above the legal-tech median' },
            { t: 'cite', n: 2 },
            { t: 't', v: '. They serve 2,400+ firms including six of the AmLaw top 10' },
            { t: 'cite', n: 4 },
            { t: 't', v: '.' },
          ]},
          { kind: 'p', segs: [
            { t: 'strong', v: 'The real risk is EU exposure. ' },
            { t: 't', v: 'The AI Act now enforces transparency obligations on legal-grade document classifiers' },
            { t: 'cite', n: 3 },
            { t: 't', v: '. Vendors without pre-existing lineage tracking face a 6–9 month integration tax. DISCO shipped native SOC 2 Type II across EU regions this month, which addresses most but not all of this.' },
          ]},
          { kind: 'receipts', v: 'Revenue multiple 14.2× · Gross margin 78% · NRR 122% · Cash runway 38 months.' },
        ],
        sources: [
          { n: 1, title: 'DISCO closes $100M Series C', domain: 'techcrunch.com', fav: 'T' },
          { n: 2, title: 'Legal tech market overview', domain: 'gartner.com', fav: 'G' },
          { n: 3, title: 'EU AI Act enforcement',      domain: 'euractiv.com', fav: 'E' },
          { n: 4, title: 'Customer base (10-Q filing)', domain: 'sec.gov', fav: 'S' },
          { n: 5, title: 'Competitive analysis',       domain: 'pitchbook.com', fav: 'P' },
          { n: 6, title: 'GC survey 2025',             domain: 'law.com', fav: 'L' },
        ],
        branches: [
          { id: 'b1', label: 'Funding & growth trajectory',   sources: 7, active: true },
          { id: 'b2', label: 'Customer concentration',        sources: 4 },
          { id: 'b3', label: 'EU regulatory risk',            sources: 6 },
          { id: 'b4', label: 'Competitive positioning',       sources: 5 },
          { id: 'b5', label: 'Org changes & key hires',       sources: 2 },
        ],
        followups: [
          'Who are the top 3 competitors in 2026?',
          'What is their customer concentration risk?',
          'Draft a cold outreach email to the GC',
        ],
      },
      {
        id: 't3', role: 'user',
        time: '2:24 PM',
        text: 'Who are the top 3 competitors in 2026?',
      },
      {
        id: 't4', role: 'agent',
        time: '2:24 PM',
        trace: [
          'resolved competitors from previous context',
          'fetched 2026 market reports · 12 sources',
          'ranked by overlap × threat',
        ],
        body: [
          { kind: 'p', segs: [
            { t: 'strong', v: 'Three serious overlaps, one emerging. ' },
            { t: 't', v: 'Relativity remains the incumbent in ediscovery with ~38% market share' },
            { t: 'cite', n: 7 },
            { t: 't', v: ', but is losing cloud-native deals to DISCO at a ~2:1 clip in the last 3 quarters. ' },
            { t: 'strong', v: 'Everlaw' },
            { t: 't', v: ' is the closest peer — similar price point, stronger trial tech, weaker AI review' },
            { t: 'cite', n: 8 },
            { t: 't', v: '. ' },
            { t: 'strong', v: 'Reveal' },
            { t: 't', v: ' rolled up three smaller players and is now the price-pressure threat below DISCO.' },
          ]},
          { kind: 'p', segs: [
            { t: 't', v: 'Watch: ' },
            { t: 'strong', v: 'Harvey' },
            { t: 't', v: ' is a wildcard — not direct competition today, but their agentic review tier could compress DISCO\'s mid-market in 12–18 months.' },
          ]},
        ],
        sources: [
          { n: 7, title: 'Ediscovery market share Q4 2025', domain: 'idc.com', fav: 'I' },
          { n: 8, title: 'Everlaw product comparison',      domain: 'g2.com', fav: 'G' },
          { n: 9, title: 'Reveal acquires LogikCull',       domain: 'law360.com', fav: 'L' },
          { n: 10, title: 'Harvey enterprise rollout',      domain: 'reuters.com', fav: 'R' },
        ],
        followups: [
          'Compare DISCO vs Everlaw on pricing',
          'How fast is Harvey moving into ediscovery?',
        ],
      },
    ],
  },
  'mercor': {
    id: 'mercor', title: 'Mercor Series B signal?', entity: 'Mercor',
    starred: false, updatedAgo: '1d ago',
    turns: [
      { id: 'm1', role: 'user', time: 'Nov 13', text: 'Mercor posted 22 eng roles in Q1. Is this Series B prep?' },
      { id: 'm2', role: 'agent', time: 'Nov 13',
        body: [{ kind: 'p', segs: [{ t: 'strong', v: 'Strong signal, yes. ' }, { t: 't', v: 'Hiring velocity accelerated 3× in Q4 and shifted heavily to infra/reliability roles — classic pre-raise scaling.' }, { t: 'cite', n: 1 }] }],
        sources: [{ n: 1, title: 'Mercor careers page', domain: 'mercor.com', fav: 'M' }],
        followups: ['What is their current runway?', 'Who led the Series A?'],
      },
    ],
  },
  'cognition': {
    id: 'cognition', title: 'Devin benchmark postmortem', entity: 'Cognition',
    starred: false, updatedAgo: '3d ago',
    turns: [
      { id: 'c1', role: 'user', time: 'Nov 11', text: 'What are the real-world benchmarks on Devin vs. the claimed numbers?' },
      { id: 'c2', role: 'agent', time: 'Nov 11',
        body: [{ kind: 'p', segs: [{ t: 'strong', v: 'Two claims still pending independent verification. ' }, { t: 't', v: 'Community reruns landed SWE-bench at 42% vs. the claimed 51%; the gap shrinks on verified split.' }, { t: 'cite', n: 1 }] }],
        sources: [{ n: 1, title: 'Independent SWE-bench rerun', domain: 'github.com', fav: 'G' }],
      },
    ],
  },
  'turing': {
    id: 'turing', title: 'Turing contract spend YoY', entity: 'Turing',
    starred: true, updatedAgo: '1w ago',
    turns: [
      { id: 'tu1', role: 'user', time: 'Nov 03', text: 'Pull Turing\'s disclosed customer spend — is growth real?' },
      { id: 'tu2', role: 'agent', time: 'Nov 03',
        body: [{ kind: 'p', segs: [{ t: 't', v: 'Yes — 38% YoY on disclosed enterprise customers. Concentration in financial services remains the main risk.' }, { t: 'cite', n: 1 }] }],
        sources: [{ n: 1, title: '10-Q filing Q3 2025', domain: 'sec.gov', fav: 'S' }],
      },
    ],
  },
  'foundation': {
    id: 'foundation', title: 'Foundation labs positioning map', entity: 'Foundation Labs',
    starred: false, updatedAgo: '3w ago',
    turns: [
      { id: 'f1', role: 'user', time: 'Oct 22', text: 'Map 8 foundation labs on safety posture × enterprise readiness.' },
      { id: 'f2', role: 'agent', time: 'Oct 22',
        body: [{ kind: 'p', segs: [{ t: 't', v: 'Eight labs mapped. Two positions still provisional pending Q4 disclosure.' }] }],
      },
    ],
  },
};

const THREAD_ORDER = [
  { group: 'Today',       ids: ['disco'] },
  { group: 'This week',   ids: ['mercor', 'cognition'] },
  { group: 'Earlier',     ids: ['turing', 'foundation'] },
];

window.NBThreadSeed  = THREAD_SEED;
window.NBThreadOrder = THREAD_ORDER;
