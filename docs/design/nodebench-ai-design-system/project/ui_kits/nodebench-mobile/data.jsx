// Shared DISCO scenario data for mobile surfaces.
// Mirrors the workspace kit so the design system stays in lockstep.

const MDATA = {
  user: { initials: "HS", name: "Homen" },
  entity: { name: "Disco Corp.", ticker: "LAW / Diligence", initials: "DC",
            color: "linear-gradient(135deg, #1A365D, #0F4C81)" },

  // Home watchlist — tiles
  watchlist: [
    { id: "disco",  name: "Disco Corp.", ticker: "DC",   initials: "DC",
      value: "$418M",   trend: "up",   delta: "+3.4%", meta: "ARR · signal fresh 4h",
      avatar: "linear-gradient(135deg, #1A365D, #0F4C81)" },
    { id: "relay",  name: "Relay Legal", ticker: "RLY",  initials: "RL",
      value: "$212M",   trend: "up",   delta: "+1.8%", meta: "Series D · closed",
      avatar: "linear-gradient(135deg, #6B3BA3, #8B5CC1)" },
    { id: "lexn",   name: "LexNode",     ticker: "LXN",  initials: "LX",
      value: "$84M",    trend: "down", delta: "-5.1%", meta: "Signal stale 2d",
      avatar: "linear-gradient(135deg, #C77826, #E09149)" },
    { id: "clio",   name: "Clio",        ticker: "CLO",  initials: "CL",
      value: "$1.2B",   trend: "up",   delta: "+0.6%", meta: "Market leader",
      avatar: "linear-gradient(135deg, #334155, #475569)" },
  ],

  // Home nudges
  nudges: [
    { id: "n1", kind: "source",
      title: "New 10-K filed by Disco Corp.",
      meta: ["SEC EDGAR", "15 min ago"], icon: "doc" },
    { id: "n2", kind: "claim",
      title: "Churn claim: evidence now contradicts prior brief",
      meta: ["Workspace · Disco", "1h"], icon: "warn" },
    { id: "n3", kind: "entity",
      title: "Relay Legal added Eduardo Martinez as GM Americas",
      meta: ["LinkedIn", "3h"], icon: "entity" },
    { id: "n4", kind: "source",
      title: "Gartner refreshed eDiscovery Magic Quadrant",
      meta: ["Gartner", "Today"], icon: "doc" },
  ],

  // Recent threads (Home + Chat rail)
  threads: [
    { id: "t1", title: "What's the state of Disco's churn?", meta: "2m · 14 sources" },
    { id: "t2", title: "Map the eDiscovery 2025 landscape", meta: "yesterday · 38 sources" },
    { id: "t3", title: "Who's winning NAM mid-market?",      meta: "3d · 21 sources" },
    { id: "t4", title: "Pricing pages across top 8 vendors",  meta: "1w · 42 sources" },
  ],

  // Chat answer packet — same structure as workspace
  chat: {
    query: "What's the current state of Disco's churn, and what should I expect next quarter?",
    title: "Churn is bending down, but renewals in Q2 are the tell.",
    tldr:
      "Net revenue retention climbed from 108% to 114% over four quarters — driven by platform-tier upsell and the Relay head-to-head wins. " +
      "Gross churn is still elevated at law-firm mid-market. Q2 is the load-bearing quarter: 38% of ARR renews, and the Am Law 200 cohort historically decides in April–May.",
    callout: {
      label: "So what",
      body: "If Am Law 200 renewals hold ≥92%, NRR clears 118% and the platform narrative is validated for the public comps. Miss it and the bear case (niche eDiscovery tool) reasserts.",
    },
    cards: [
      { id: "disco", name: "Disco Corp.", initials: "DC", sub: "Diligence · Public",
        metrics: [
          ["NRR", "114%", "up"], ["GRR", "88%", "down"],
          ["ARR", "$418M", "up"], ["Logo ∆", "+41", "up"],
        ], avatar: "linear-gradient(135deg, #1A365D, #0F4C81)", active: true },
      { id: "relay", name: "Relay Legal", initials: "RL", sub: "Competitor",
        metrics: [
          ["NRR", "119%", "up"], ["GRR", "92%", "up"],
          ["ARR", "$212M", "up"], ["Win/Loss", "1.4×", "up"],
        ], avatar: "linear-gradient(135deg, #6B3BA3, #8B5CC1)" },
      { id: "lexn", name: "LexNode", initials: "LX", sub: "Competitor",
        metrics: [
          ["NRR", "101%", "down"], ["GRR", "79%", "down"],
          ["ARR", "$84M", "down"], ["Runway", "14mo", "down"],
        ], avatar: "linear-gradient(135deg, #C77826, #E09149)" },
    ],
    sources: [
      { id: "s1", title: "Q4 FY24 earnings call, Disco Corp.", meta: ["SEC · 10-K", "fresh 9d"], strength: "strong" },
      { id: "s2", title: "Gartner MQ for eDiscovery 2025",      meta: ["Gartner", "fresh 22d"], strength: "strong" },
      { id: "s3", title: "Am Law 200 renewal tracker (internal)",meta: ["Workspace", "updated 1d"], strength: "medium" },
      { id: "s4", title: "Relay Legal Series D memo",           meta: ["PitchBook", "fresh 3d"], strength: "medium" },
    ],
    followups: [
      "Drill into Q2 renewal risk by segment",
      "Compare to Relay's NRR trajectory",
      "What could break the platform narrative?",
      "Pull the Am Law 200 cohort list",
      "Show me pricing sensitivity data",
    ],
  },

  // Brief — structured scrollable
  brief: {
    kicker: "Diligence brief · Disco Corp.",
    title: "Platform narrative holds — Q2 renewals are the load-bearing quarter.",
    sub: "A four-quarter review of Disco Corp.'s retention mechanics, pricing, and competitive position, with a quantified next-quarter read.",
    meta: ["v4 · Draft", "Updated 42m ago", "14 sources", "Confidence: Medium-High"],
    verdict:
      "Disco's platform thesis is quantitatively supported by NRR expansion and Relay head-to-head wins, but Q2 Am Law 200 renewals gate the public-comps narrative. Base case: NRR lands 116–119% with 2 pts of upside from the Relay swaps.",
    stats: [
      { v: "114%", l: "NRR · Q4 FY24", trend: "up" },
      { v: "88%",  l: "GRR · mid-market soft", trend: "down" },
      { v: "+41",  l: "Net new logos · Q4", trend: "up" },
      { v: "38%",  l: "ARR renews in Q2", trend: null },
    ],
    triad: [
      { tag: "What", color: null, h: "NRR bent from 108% → 114% in four quarters.",
        p: "Platform-tier upsell accounts for roughly 60% of the lift; Relay head-to-head wins contribute another 25%. Small-firm churn remains elevated but is a declining share of the base." },
      { tag: "So what", color: "indigo", h: "The platform narrative now has quantitative cover.",
        p: "Public comps will reprice on the NRR line if Q2 renewals clear 92% among Am Law 200. A miss reopens the bear case that Disco is a single-product eDiscovery tool." },
      { tag: "Now what", color: "ok", h: "Watch three signals over the next 60 days.",
        p: "(1) Am Law 200 renewal closes in late April. (2) Relay's own earnings cadence — they report before Disco. (3) Any deal-desk pricing changes from the Clio/NetDocs axis." },
    ],
    timeline: [
      { d: "Apr 12", t: "Am Law 200 renewal window opens", m: "Historical decision peak is weeks 2–3." },
      { d: "Apr 28", t: "Relay Legal earnings",            m: "Read-through for platform-tier demand." },
      { d: "May 09", t: "Disco Q1 print",                  m: "NRR the single most important line item." },
      { d: "May 22", t: "Am Law 200 window closes",        m: "Renewal retention rate crystallizes." },
    ],
  },

  // Sources — claim graph (compact mobile view)
  sources: {
    filters: ["all", "fresh <30d", "high trust", "primary", "disputed"],
    claims: [
      { id: "c1", q: "NRR reached 114% in Q4 FY24",
        statuses: [["strong", "strong"], ["fresh <30d", "fresh"], ["primary", "primary"]],
        evidence: [
          { src: "Disco Q4 FY24 10-K, p.42", meta: "SEC · 9d", strength: "strong" },
          { src: "Earnings call transcript", meta: "Seeking Alpha · 9d", strength: "strong" },
          { src: "Workspace note: Apr-03 memo", meta: "Internal · 12d",  strength: "medium" },
        ] },
      { id: "c2", q: "Am Law 200 cohort is 38% of ARR",
        statuses: [["medium", "medium"], ["internal", "internal"]],
        evidence: [
          { src: "Internal renewal tracker v7",  meta: "Workspace · 1d", strength: "medium" },
          { src: "Disco IR deck, Mar 2025",      meta: "Disco.com · 32d", strength: "medium" },
        ] },
      { id: "c3", q: "Relay Legal grew NRR to 119%",
        statuses: [["strong", "strong"], ["fresh <30d", "fresh"]],
        evidence: [
          { src: "Relay Series D memo",          meta: "PitchBook · 3d", strength: "strong" },
          { src: "Crunchbase funding refresh",   meta: "Crunchbase · 3d", strength: "medium" },
        ] },
      { id: "c4", q: "Mid-market gross churn is elevated",
        statuses: [["medium", "medium"], ["disputed", "disputed"]],
        evidence: [
          { src: "Anecdotal — 3 small-firm quotes", meta: "Internal · 1d", strength: "weak" },
          { src: "Gartner MQ commentary",            meta: "Gartner · 22d", strength: "medium" },
        ] },
    ],
    recentSources: [
      { title: "Disco Q4 FY24 10-K filing",        meta: ["SEC", "9d"], strength: "strong" },
      { title: "Gartner MQ for eDiscovery 2025",    meta: ["Gartner", "22d"], strength: "strong" },
      { title: "Relay Legal Series D coverage",     meta: ["PitchBook", "3d"], strength: "medium" },
      { title: "Am Law 200 renewal tracker",        meta: ["Workspace", "1d"], strength: "medium" },
      { title: "Clio pricing page snapshot",         meta: ["web.archive", "7d"], strength: "weak" },
    ],
  },

  // Notebook — same parchment feel
  notebook: {
    title: "Disco diligence — April field notes",
    meta: ["Personal workspace", "Updated 42m ago", "Autosave on"],
    body: [
      { t: "h2", v: "The renewal window matters more than the quarter." },
      { t: "p",
        v: [
          "Across four quarters, ",
          { t: "chip", name: "Disco Corp.", type: "company", initials: "DC" },
          " has pushed NRR from 108% to 114% [1]. That's platform-tier upsell, not price. ",
          "But 38% of ARR ",
          { t: "mark", v: "renews in Q2" },
          " — so the April–May window, not the fiscal year, is the load-bearing moment [2]." ,
        ] },
      { t: "proposal", state: "open",
        note: "Merge Relay's Series D narrative into Competitive > Position — 2 direct contradictions with last week's memo.",
      },
      { t: "h2", v: "What Q2 actually looks like" },
      { t: "p",
        v: [
          "The Am Law 200 cohort decides roughly in weeks 2–3 of April. ",
          { t: "chip", name: "Relay Legal", type: "investor", initials: "RL" },
          " prints before ",
          { t: "chip", name: "Disco Corp.", type: "company", initials: "DC" },
          ", which gives us a read-through on platform-tier demand [3]." ,
        ] },
      { t: "claim",
        v: "If Am Law 200 holds ≥92%, NRR clears 118% and platform thesis wins the public comps.",
        conf: "Medium-high", sourcesN: 6 },
      { t: "h2", v: "What would change my mind" },
      { t: "p",
        v: [
          "Three disconfirmers I'll watch: (a) a pricing change from ",
          { t: "chip", name: "Clio / NetDocs axis", type: "market", initials: "CL" },
          " that resets mid-market expectations, (b) a visible enterprise-tier loss, (c) any SEC-driven review of ",
          { t: "chip", name: "ESI retention rules", type: "regulation", initials: "ES" },
          " [4]." ,
        ] },
      { t: "proposal", state: "accepted",
        note: "Pull through the LexNode runway concern into the Competitors card. Marked accepted and applied to v4 draft.",
      },
    ],
    footnotes: [
      { n: 1, title: "Disco Q4 FY24 10-K, p.42", meta: "SEC · 9d · primary" },
      { n: 2, title: "Internal renewal tracker v7", meta: "Workspace · 1d · secondary" },
      { n: 3, title: "Relay Series D memo",         meta: "PitchBook · 3d · primary" },
      { n: 4, title: "Gartner MQ commentary",       meta: "Gartner · 22d · synthesis" },
    ],
  },
};

window.MDATA = MDATA;
