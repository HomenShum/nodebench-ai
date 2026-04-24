// Shared scenario data + app state hub.
// Source of truth for entities, threads, claims, sources, and per-artboard tab state.
// Each artboard mounts its own <ReportSurface> but reads/writes the same data via window.useWorkspace().

const WS_DATA = {
  threads: [
    { id: 't1', title: 'DISCO — worth reaching out?', meta: '2h · 24 src', query: 'DISCO — worth reaching out? Fastest debrief.' },
    { id: 't2', title: 'Mercor — hiring velocity',   meta: '1d · 18 src', query: 'Mercor — hiring velocity the past 90 days. Break it down.' },
    { id: 't3', title: 'Everlaw — head-to-head',     meta: '2d · 11 src', query: 'Everlaw vs DISCO on AmLaw 100 coverage and blended ARPU.' },
    { id: 't4', title: 'Turing — contract YoY',      meta: '1w · 12 src', query: 'Turing — contract revenue YoY. Any concentration risk?' },
    { id: 't5', title: 'EU AI Act · legal tech',     meta: '2w · 9 src',  query: 'How will the EU AI Act hit legal tech operators in 2026?' },
  ],

  // multiple threads each have their own answer payload
  answers: {
    t1: {
      verdict: 'Yes — worth reaching out. DISCO is compounding above the legal-tech median.',
      paragraphs: [
        { kind: 'mixed', parts: [
          { t: 'chip', name: 'DISCO', type: 'company', code: 'DI' }, { t: 'text', v: ' closed a ' }, { t: 'strong', v: '$100M Series C' },
          { t: 'text', v: ' led by ' }, { t: 'chip', name: 'Greylock', type: 'investor', code: 'G' },
          { t: 'text', v: ' on Nov\u00a014,\u00a02025' }, { t: 'cite', n: 1 }, { t: 'text', v: ', putting ARR growth above the 2.5× legal-tech median' }, { t: 'cite', n: 2 },
          { t: 'text', v: '. The company serves ' }, { t: 'strong', v: '2,400+ firms' }, { t: 'text', v: ' including six of the ' },
          { t: 'chip', name: 'AmLaw 10', type: 'market', code: 'A' }, { t: 'cite', n: 4 }, { t: 'text', v: '.' },
        ]},
        { kind: 'mixed', parts: [
          { t: 'text', v: 'Two things to weigh before an intro: the ' },
          { t: 'chip', name: 'EU AI Act', type: 'regulation', code: 'EU' },
          { t: 'text', v: ' integration tax over the next 6–9 months' }, { t: 'cite', n: 3 },
          { t: 'text', v: ', and ' }, { t: 'chip', name: 'Everlaw', type: 'company', code: 'EV' },
          { t: 'text', v: "'s lower-midmarket pricing pressure" }, { t: 'cite', n: 7 },
          { t: 'text', v: '. Net: product velocity looks real; pricing discipline is the watch item.' },
        ]},
      ],
      recommendation: 'Reach out this quarter. Lead with AmLaw traction and the Greylock signal; ask how they plan to absorb the AI Act compliance load without raising effective price.',
      topCards: ['disco', 'everlaw', 'greylock'],
      topSourceIds: [1, 2, 3, 4],
      followups: [
        'Compare with Everlaw head-to-head',
        'Draft a cold intro to Kiwi Camara',
        'Board composition post-Series C',
        'Re-run in 30 days if NRR dips',
      ],
    },
    t2: {
      verdict: 'Hiring ramp tripled in Q1 2026 — healthy but watch burn.',
      paragraphs: [
        { kind: 'mixed', parts: [
          { t: 'chip', name: 'Mercor', type: 'company', code: 'ME' },
          { t: 'text', v: ' headcount moved from 180 → 540 in 90 days, mostly in GTM' }, { t: 'cite', n: 1 },
          { t: 'text', v: '. Cash burn implied at ' }, { t: 'strong', v: '$18M/month' }, { t: 'text', v: ' against an $800M war-chest.' },
        ]},
      ],
      recommendation: 'Monitor quarterly. Revisit if burn exceeds $25M/month or if ARR growth falls below 3× by mid-2026.',
      topCards: ['disco', 'everlaw', 'greylock'],
      topSourceIds: [1, 4, 2],
      followups: ['Who are they hiring from?', 'GTM leadership map', 'Peer burn comparison'],
    },
    t3: {
      verdict: 'Everlaw is gaining midmarket share; losing ground in AmLaw 50.',
      paragraphs: [
        { kind: 'mixed', parts: [
          { t: 'chip', name: 'Everlaw', type: 'company', code: 'EV' },
          { t: 'text', v: ' cut pricing 18% in March to defend midmarket' }, { t: 'cite', n: 6 },
          { t: 'text', v: ', while ' }, { t: 'chip', name: 'DISCO', type: 'company', code: 'DI' },
          { t: 'text', v: ' expanded AmLaw 10 coverage from 4 to 6' }, { t: 'cite', n: 4 }, { t: 'text', v: '.' },
        ]},
      ],
      recommendation: 'DISCO has the stronger top-of-market story; Everlaw is winning on price below the AmLaw 100 line.',
      topCards: ['everlaw', 'disco', 'legal-tech'],
      topSourceIds: [6, 4, 2, 8],
      followups: ['Win-rate by firm tier', 'Upmarket expansion plan', 'Buy vs partner thesis'],
    },
    t4: {
      verdict: 'Contract revenue flat YoY, concentration rising.',
      paragraphs: [
        { kind: 'mixed', parts: [
          { t: 'text', v: 'Turing booked ' }, { t: 'strong', v: '$340M' }, { t: 'text', v: ' in FY25 contracts, flat vs prior year. Top-5 customer share jumped from 31% → 44%.' }, { t: 'cite', n: 4 },
        ]},
      ],
      recommendation: 'Flag for diligence call. Ask about renewal terms on the top-5 and any customer-of-one risk.',
      topCards: ['disco', 'legal-tech', 'greylock'],
      topSourceIds: [4, 2],
      followups: ['Who are the top 5?', 'Renewal dates', 'Net new logos 2026'],
    },
    t5: {
      verdict: 'Enforcement begins Feb 2026; expect a 6–9 month adjustment for GPAI users.',
      paragraphs: [
        { kind: 'mixed', parts: [
          { t: 'chip', name: 'EU AI Act', type: 'regulation', code: 'EU' },
          { t: 'text', v: ' GPAI rules start Feb 2, 2026' }, { t: 'cite', n: 3 },
          { t: 'text', v: '. Legal-tech operators must document data provenance and publish training summaries.' },
        ]},
      ],
      recommendation: 'Ask every legal-tech target for their AI Act readiness doc. If they cannot produce one, that is the conversation.',
      topCards: ['legal-tech', 'eu-ai-act', 'disco'],
      topSourceIds: [3, 2],
      followups: ['Who is ready?', 'Penalty exposure', 'Compare vs US state laws'],
    },
  },

  entities: {
    'disco':       { id: 'disco', name: 'DISCO', kind: 'company', kicker: 'root', avatar: 'DI', avatarBg: 'linear-gradient(135deg,#1A365D,#0F4C81)', subtitle: 'legal tech · series c', ticker: 'LAW',
      metrics: [{label:'ARR',value:'$186M',trend:'up'},{label:'Growth',value:'2.8×',trend:'up'},{label:'NRR',value:'122%',trend:'up'},{label:'GM',value:'78%'}],
      footer: 'refreshed 2h ago · 24 sources' },
    'everlaw':     { id: 'everlaw', name: 'Everlaw', kind: 'company', kicker: 'competitor', avatar: 'EV', avatarBg: 'linear-gradient(135deg,#7A3A1F,#C76648)', subtitle: 'legal tech · competitor',
      metrics: [{label:'ARR',value:'$140M',trend:'up'},{label:'Growth',value:'1.9×'},{label:'NRR',value:'108%'},{label:'Pricing',value:'-18%',trend:'down'}],
      footer: 'midmarket wedge' },
    'greylock':    { id: 'greylock', name: 'Greylock', kind: 'investor', kicker: 'investor', avatar: 'G', avatarBg: 'linear-gradient(135deg,#6B3BA3,#8B5CC1)', subtitle: 'investor · lead',
      metrics: [{label:'Round',value:'$100M'},{label:'Board',value:'Grayson'},{label:'Portfolio',value:'3 in legal'},{label:'Since',value:'2025'}],
      footer: 'platform bets' },
    'legal-tech':  { id: 'legal-tech', name: 'Legal tech market', kind: 'market', kicker: 'market', avatar: 'M', avatarBg: 'linear-gradient(135deg,#C77826,#E09149)', subtitle: 'market · am-law 100',
      metrics: [{label:'TAM',value:'$22B',trend:'up'},{label:'Growth',value:'1.4×'},{label:'Players',value:'41'},{label:'AI Act',value:'Feb 26'}] },
    'eu-ai-act':   { id: 'eu-ai-act', name: 'EU AI Act', kind: 'regulation', kicker: 'regulation', avatar: 'EU', avatarBg: 'linear-gradient(135deg,#0E7A5C,#16A37E)', subtitle: 'regulation · gpai',
      metrics: [{label:'Enforce',value:'Feb 2026'},{label:'Tax',value:'6–9 mo'},{label:'Scope',value:'GPAI'},{label:'Penalty',value:'7% rev'}] },
    'kiwi-camara': { id: 'kiwi-camara', name: 'Kiwi Camara', kind: 'person', kicker: 'person', avatar: 'KC', avatarBg: 'linear-gradient(135deg,#334155,#475569)', subtitle: 'person · ceo / founder',
      metrics: [{label:'Tenure',value:'13 yr'},{label:'Prior',value:'Harvard L'},{label:'Ownership',value:'14%'},{label:'Replies',value:'rare'}] },
    'relativity':  { id: 'relativity', name: 'Relativity', kind: 'company', kicker: 'incumbent', avatar: 'R', avatarBg: 'linear-gradient(135deg,#334155,#475569)', subtitle: 'incumbent · ediscovery',
      metrics: [{label:'ARR',value:'$320M'},{label:'Growth',value:'1.2×',trend:'down'},{label:'Share',value:'38%'},{label:'AI tier',value:'late'}] },
    'opus2':       { id: 'opus2', name: 'Opus 2', kind: 'company', kicker: 'adjacent', avatar: 'O2', avatarBg: 'linear-gradient(135deg,#1A365D,#0F4C81)', subtitle: 'legal · case mgmt',
      metrics: [{label:'ARR',value:'$42M'},{label:'Growth',value:'2.1×',trend:'up'},{label:'Region',value:'UK/EU'},{label:'Funding',value:'B'}] },
    'sarah-grayson':{ id: 'sarah-grayson', name: 'Sarah Grayson', kind: 'person', kicker: 'investor-person', avatar: 'SG', avatarBg: 'linear-gradient(135deg,#6B3BA3,#8B5CC1)', subtitle: 'person · gp greylock',
      metrics: [{label:'Boards',value:'7'},{label:'Legal co.',value:'2'},{label:'Since',value:'2019'},{label:'Check',value:'$50–200M'}] },
  },

  // For the Cards surface — which entities appear in each column when a root is selected
  relations: {
    'disco':    ['legal-tech', 'greylock', 'kiwi-camara', 'eu-ai-act', 'everlaw'],
    'everlaw':  ['relativity', 'opus2', 'sarah-grayson'],
    'greylock': ['sarah-grayson', 'kiwi-camara'],
    'legal-tech': ['disco', 'everlaw', 'relativity', 'opus2', 'eu-ai-act'],
    'eu-ai-act':  ['disco', 'everlaw', 'legal-tech'],
    'kiwi-camara':['disco'],
    'relativity': ['legal-tech'],
    'opus2':      ['legal-tech'],
    'sarah-grayson':['greylock', 'disco'],
  },

  sources: [
    { n: 1, title: 'DISCO closes $100M Series C, Greylock leads', domain: 'techcrunch.com', date: 'Nov 14 2025', type: 'press',   cites: 4, weight: 0.90 },
    { n: 2, title: 'Legal tech market overview 2025',             domain: 'gartner.com',     date: 'Oct 2025',    type: 'analyst', cites: 3, weight: 0.95 },
    { n: 3, title: 'EU AI Act enforcement timeline',              domain: 'euractiv.com',    date: 'Feb 2026',    type: 'reg',     cites: 2, weight: 0.92 },
    { n: 4, title: 'DISCO Q3 2025 IR filing',                     domain: 'sec.gov',         date: 'Sep 30 2025', type: 'filing',  cites: 6, weight: 1.00 },
    { n: 5, title: 'DISCO press room · Series C',                 domain: 'press.disco.com', date: 'Nov 14 2025', type: 'pr',      cites: 2, weight: 0.60 },
    { n: 6, title: 'Everlaw pricing moves in 2026',               domain: 'lawtech.com',     date: 'Mar 18 2026', type: 'analyst', cites: 3, weight: 0.72 },
    { n: 7, title: 'Greylock · fund notes',                       domain: 'greylock.com',    date: 'Nov 2025',    type: 'pr',      cites: 2, weight: 0.70 },
    { n: 8, title: 'AmLaw 100 firm list 2026',                    domain: 'amlaw.com',       date: 'Jan 2026',    type: 'analyst', cites: 1, weight: 0.88 },
  ],

  claims: [
    { id: 'c1', q: 'Series C led by Greylock at $900M post',         support: [1, 5, 4], contra: [] },
    { id: 'c2', q: 'ARR $186M in Q3 2025',                           support: [4, 2],    contra: [] },
    { id: 'c3', q: 'NRR 122% (trailing four quarters)',              support: [4, 2],    contra: [6] },
    { id: 'c4', q: 'Serves six of AmLaw 10',                         support: [4, 8, 2], contra: [] },
    { id: 'c5', q: 'EU AI Act enforcement begins Feb 2026 for GPAI', support: [3, 2],    contra: [] },
    { id: 'c6', q: 'Everlaw midmarket pricing cut 18%',              support: [6],       contra: [] },
  ],
};

window.WS_DATA = WS_DATA;
