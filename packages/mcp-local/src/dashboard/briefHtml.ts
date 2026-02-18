/**
 * NodeBench MCP — Daily Brief Dashboard HTML
 *
 * Single inline HTML string, zero build step. Tailwind CDN, Inter font,
 * dark-mode-first design matching the v4 design system from html.ts.
 *
 * 3 views (tab-based):
 *   1. Brief — metrics, features, source summary
 *   2. Narrative Lanes — threads by phase, events, claims
 *   3. Ops — sync status, tool frequency, verification cycles
 *
 * Privacy mode (camera presence detection):
 *   - Opt-in via toggle in header
 *   - Pixel standard deviation → presence detection
 *   - No face detection, no identity, no image storage
 *   - Public mode: sanitize entity names, hide task results, hide mailbox
 *
 * Auto-refresh: 30s poll with hash-based diffing.
 */

export function getBriefDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodeBench Daily Brief</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
          colors: {
            surface: { 0: '#09090b', 1: '#111113', 2: '#18181b', 3: '#1f1f23' },
            border: { DEFAULT: '#27272a', subtle: '#1e1e22', focus: '#6366f1' },
            accent: { DEFAULT: '#818cf8', bright: '#a5b4fc', dim: '#4f46e5' },
            ok: '#34d399', warn: '#fbbf24', err: '#f87171',
          }
        }
      }
    }
  <\/script>
  <style>
    :root {
      --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 24px; --sp-6: 32px;
      --border-base: #27272a; --border-hover: #3f3f46; --border-accent: #6366f1;
      --surface-1: #111113; --surface-2: #18181b;
      --gradient-accent: linear-gradient(135deg, #1e1b4b, #312e81);
      --shadow-card: 0 0 0 1px rgba(99,102,241,.15), 0 1px 3px rgba(0,0,0,.4);
      --shadow-card-hover: 0 0 0 1px rgba(99,102,241,.35), 0 4px 12px rgba(0,0,0,.5);
      --radius-sm: 6px; --radius-md: 8px; --radius-lg: 10px; --radius-xl: 12px;
      --transition-fast: .15s ease; --transition-base: .2s ease;
    }
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; margin: 0; background: #09090b; color: #fafafa; }
    .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }

    /* ── Animations ─────────────────────────────────────── */
    @keyframes fadeUp { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
    .fade-up { animation: fadeUp .35s ease-out both; }
    .fade-up:nth-child(2) { animation-delay: 50ms; }
    .fade-up:nth-child(3) { animation-delay: 100ms; }
    .fade-up:nth-child(n+4) { animation-delay: 150ms; }
    @keyframes pulse2 { 0%,100%{opacity:1} 50%{opacity:.35} }
    .pulse-live { animation: pulse2 2s infinite; }
    @keyframes shimmer { 0%,100%{background-position:200% 0} 50%{background-position:0% 0} }
    .skeleton { border-radius: var(--radius-lg); background: linear-gradient(90deg, var(--surface-2) 25%, #1f1f23 50%, var(--surface-2) 75%); background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite; }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
      .fade-up { animation: none; opacity: 1; transform: none; }
      .pulse-live { animation: none; }
      .skeleton { animation: none; }
    }

    /* ── Tab Bar ────────────────────────────────────────── */
    .tab-bar { display:flex; gap:2px; padding:2px; background:var(--surface-1); border-radius:var(--radius-lg); border:1px solid var(--border-base); }
    .tab-btn {
      flex:1; padding:8px 16px; border-radius:var(--radius-md); border:none; background:transparent;
      color:#71717a; font-size:12px; font-weight:600; cursor:pointer; transition: all var(--transition-fast);
      font-family: inherit; display:flex; align-items:center; justify-content:center; gap:6px;
    }
    .tab-btn:hover { color:#d4d4d8; background:var(--surface-2); }
    .tab-btn.active { background:var(--gradient-accent); color:#c7d2fe; box-shadow:var(--shadow-card); }
    .tab-btn:focus-visible { outline:2px solid var(--border-accent); outline-offset:2px; }
    .tab-btn svg { width:14px; height:14px; }
    .tab-panel { display:none; }
    .tab-panel.active { display:block; }

    /* ── Metric Cards ──────────────────────────────────── */
    .metric-card {
      background:var(--surface-1); border:1px solid var(--border-base); border-radius:var(--radius-xl);
      padding:16px 20px; transition: border-color var(--transition-base), box-shadow var(--transition-base);
    }
    .metric-card:hover { border-color:var(--border-hover); box-shadow:var(--shadow-card-hover); }
    .metric-value { font-size:28px; font-weight:800; letter-spacing:-.02em; color:#fafafa; }
    .metric-label { font-size:11px; font-weight:500; color:#71717a; text-transform:uppercase; letter-spacing:.05em; margin-top:2px; }
    .metric-delta { font-size:11px; font-weight:600; margin-top:4px; }
    .metric-delta.up { color:#34d399; }
    .metric-delta.down { color:#f87171; }

    /* ── Phase Lanes ───────────────────────────────────── */
    .phase-lane {
      border-left:3px solid var(--border-base); padding-left:16px; margin-bottom:20px;
      transition: border-color var(--transition-base);
    }
    .phase-lane.emerging { border-left-color:#818cf8; }
    .phase-lane.escalating { border-left-color:#fbbf24; }
    .phase-lane.climax { border-left-color:#f87171; }
    .phase-lane.resolution { border-left-color:#34d399; }
    .phase-lane.dormant { border-left-color:#52525b; }
    .phase-label {
      font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.08em;
      padding:2px 8px; border-radius:4px; display:inline-block; margin-bottom:8px;
    }
    .phase-label.emerging { background:#1e1b4b; color:#a5b4fc; }
    .phase-label.escalating { background:#451a03; color:#fde68a; }
    .phase-label.climax { background:#450a0a; color:#fca5a5; }
    .phase-label.resolution { background:#052e16; color:#86efac; }
    .phase-label.dormant { background:#18181b; color:#71717a; }

    /* ── Thread Card ───────────────────────────────────── */
    .thread-card {
      background:var(--surface-1); border:1px solid var(--border-base); border-radius:var(--radius-lg);
      padding:12px 16px; margin-bottom:8px; cursor:pointer;
      transition: border-color var(--transition-base), box-shadow var(--transition-base);
    }
    .thread-card:hover { border-color:var(--border-hover); box-shadow:var(--shadow-card); }
    .thread-card:focus-visible { outline:2px solid var(--border-accent); outline-offset:2px; }
    .thread-name { font-size:13px; font-weight:600; color:#fafafa; }
    .thread-thesis { font-size:11px; color:#a1a1aa; margin-top:4px; line-height:1.5; }
    .thread-meta { display:flex; align-items:center; gap:8px; margin-top:8px; flex-wrap:wrap; }
    .thread-tag { font-size:10px; padding:2px 6px; border-radius:4px; background:var(--surface-2); color:#71717a; border:1px solid #1e1e22; }
    .thread-badge { font-size:10px; font-weight:600; padding:2px 8px; border-radius:9px; }

    /* ── Event Timeline ─────────────────────────────────── */
    .event-item { display:flex; gap:12px; padding:8px 0; border-bottom:1px solid #1e1e22; }
    .event-item:last-child { border-bottom:none; }
    .event-dot { width:8px; height:8px; border-radius:50%; margin-top:5px; flex-shrink:0; }
    .event-dot.minor { background:#52525b; }
    .event-dot.moderate { background:#818cf8; }
    .event-dot.major { background:#fbbf24; }
    .event-dot.plot_twist { background:#f87171; }
    .event-headline { font-size:12px; color:#d4d4d8; font-weight:500; }
    .event-time { font-size:10px; color:#52525b; margin-top:2px; }

    /* ── Sync Status ───────────────────────────────────── */
    .sync-badge { font-size:10px; font-weight:600; padding:3px 10px; border-radius:9px; }
    .sync-badge.success { background:#052e16; color:#86efac; }
    .sync-badge.error { background:#450a0a; color:#fca5a5; }
    .sync-badge.running { background:#1e1b4b; color:#a5b4fc; }

    /* ── Privacy Shield ────────────────────────────────── */
    .privacy-toggle {
      width:36px; height:20px; border-radius:10px; border:1px solid var(--border-base);
      background:var(--surface-2); cursor:pointer; position:relative; transition: all var(--transition-fast);
    }
    .privacy-toggle.on { background:#4f46e5; border-color:var(--border-accent); }
    .privacy-toggle .knob {
      width:14px; height:14px; border-radius:50%; background:#fafafa;
      position:absolute; top:2px; left:2px; transition: transform var(--transition-fast);
    }
    .privacy-toggle.on .knob { transform:translateX(16px); }
    .privacy-indicator { display:none; }
    .privacy-indicator.active { display:flex; align-items:center; gap:4px; font-size:10px; color:#fbbf24; font-weight:600; }

    /* ── Confidence Bar ─────────────────────────────────── */
    .conf-bar { height:4px; border-radius:2px; background:var(--surface-2); overflow:hidden; }
    .conf-fill { height:100%; border-radius:2px; transition: width var(--transition-base); }

    /* ── Sparkline ──────────────────────────────────────── */
    .sparkline { display:flex; align-items:end; gap:2px; height:32px; }
    .spark-bar { flex:1; min-width:4px; border-radius:2px 2px 0 0; background:#4f46e5; transition: height var(--transition-base); }

    /* ── Scrollable areas ──────────────────────────────── */
    .scroll-area { max-height:400px; overflow-y:auto; scrollbar-width:thin; scrollbar-color:var(--border-base) transparent; }
    .scroll-area::-webkit-scrollbar { width:6px; }
    .scroll-area::-webkit-scrollbar-track { background:transparent; }
    .scroll-area::-webkit-scrollbar-thumb { background:var(--border-base); border-radius:3px; }

    /* ── Gauge (SVG arc) ───────────────────────────────── */
    .gauge-ring { fill:none; stroke-width:6; stroke-linecap:round; }
    .gauge-bg { stroke:var(--border-base); }
    .gauge-fg { transition: stroke-dashoffset .6s ease; }

    /* ── Responsive ─────────────────────────────────────── */
    @media (max-width: 640px) {
      .metric-grid { grid-template-columns: 1fr 1fr !important; }
      .tab-btn { font-size:11px; padding:6px 8px; }
      .tab-btn span.label-text { display:none; }
    }
  </style>
</head>
<body>
  <!-- Hidden video for privacy detection (opt-in only) -->
  <video id="privacyVideo" style="display:none" playsinline muted></video>
  <canvas id="privacyCanvas" style="display:none" width="64" height="48"></canvas>

  <div class="max-w-4xl mx-auto px-4 py-6" id="app">

    <!-- ── Header ──────────────────────────────────────── -->
    <header class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:var(--gradient-accent)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c7d2fe" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
        <div>
          <h1 class="text-sm font-bold text-zinc-100">Daily Brief</h1>
          <p class="text-[10px] text-zinc-500" id="lastRefresh">Loading...</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div id="privacyStatus" class="privacy-indicator" role="status" aria-live="polite">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Public mode</span>
        </div>
        <label class="flex items-center gap-2 cursor-pointer" title="Camera privacy detection">
          <span class="text-[10px] text-zinc-500">Privacy</span>
          <button id="privacyToggle" class="privacy-toggle" role="switch" aria-checked="false" aria-label="Enable camera privacy detection">
            <div class="knob"></div>
          </button>
        </label>
      </div>
    </header>

    <!-- ── Tab Bar ──────────────────────────────────────── -->
    <nav class="tab-bar mb-6" role="tablist" aria-label="Dashboard views">
      <button class="tab-btn active" role="tab" aria-selected="true" aria-controls="panel-brief" id="tab-brief" data-tab="brief">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
        <span class="label-text">Brief</span>
      </button>
      <button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-narrative" id="tab-narrative" data-tab="narrative">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <span class="label-text">Narrative</span>
      </button>
      <button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-ops" id="tab-ops" data-tab="ops">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span class="label-text">Ops</span>
      </button>
    </nav>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- PANEL: BRIEF                                       -->
    <!-- ══════════════════════════════════════════════════ -->
    <div id="panel-brief" class="tab-panel active" role="tabpanel" aria-labelledby="tab-brief">
      <!-- Date Picker -->
      <div class="flex items-center gap-2 mb-4 overflow-x-auto pb-1" id="datePicker" role="group" aria-label="Select date"></div>

      <!-- Gauge + Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 metric-grid" id="metricsGrid">
        <div class="metric-card flex items-center justify-center" id="gaugeCard">
          <div class="text-center">
            <svg width="80" height="80" viewBox="0 0 80 80" id="readinessGauge" aria-label="Tech readiness gauge">
              <circle class="gauge-ring gauge-bg" cx="40" cy="40" r="34"/>
              <circle class="gauge-ring gauge-fg" cx="40" cy="40" r="34" stroke="#818cf8"
                stroke-dasharray="213.6" stroke-dashoffset="213.6"
                transform="rotate(-90 40 40)" id="gaugeFg"/>
              <text x="40" y="44" text-anchor="middle" font-size="18" font-weight="800" fill="#fafafa" id="gaugeText">--</text>
            </svg>
            <div class="metric-label mt-1">Readiness</div>
          </div>
        </div>
        <div class="metric-card fade-up">
          <div class="metric-value" id="metricThreads">--</div>
          <div class="metric-label">Threads</div>
        </div>
        <div class="metric-card fade-up">
          <div class="metric-value" id="metricEvents">--</div>
          <div class="metric-label">Events</div>
        </div>
        <div class="metric-card fade-up">
          <div class="metric-value" id="metricSources">--</div>
          <div class="metric-label">Sources</div>
        </div>
      </div>

      <!-- Source Summary -->
      <section id="sourceSummarySection" class="mb-6 hidden">
        <h2 class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Source Summary</h2>
        <div id="sourceSummaryGrid" class="grid grid-cols-2 md:grid-cols-4 gap-2"></div>
      </section>

      <!-- Features -->
      <section id="featuresSection" class="mb-6 hidden">
        <h2 class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Features</h2>
        <div id="featuresList" class="space-y-2"></div>
      </section>

      <!-- Task Results -->
      <section id="taskResultsSection" class="mb-6 hidden" data-sensitive="true">
        <h2 class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Task Results</h2>
        <div id="taskResultsList" class="space-y-2"></div>
      </section>
    </div>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- PANEL: NARRATIVE                                   -->
    <!-- ══════════════════════════════════════════════════ -->
    <div id="panel-narrative" class="tab-panel" role="tabpanel" aria-labelledby="tab-narrative">
      <!-- Phase filter -->
      <div class="flex items-center gap-2 mb-4 flex-wrap" id="phaseFilter" role="group" aria-label="Filter by phase">
        <button class="tab-btn text-[11px] py-1 px-3 rounded-full active" data-phase="all" style="flex:0">All</button>
        <button class="tab-btn text-[11px] py-1 px-3 rounded-full" data-phase="emerging" style="flex:0">Emerging</button>
        <button class="tab-btn text-[11px] py-1 px-3 rounded-full" data-phase="escalating" style="flex:0">Escalating</button>
        <button class="tab-btn text-[11px] py-1 px-3 rounded-full" data-phase="climax" style="flex:0">Climax</button>
        <button class="tab-btn text-[11px] py-1 px-3 rounded-full" data-phase="resolution" style="flex:0">Resolution</button>
        <button class="tab-btn text-[11px] py-1 px-3 rounded-full" data-phase="dormant" style="flex:0">Dormant</button>
      </div>

      <!-- Threads container -->
      <div id="narrativeLanes" class="space-y-4">
        <div class="skeleton h-32 mb-3"></div>
        <div class="skeleton h-32 mb-3"></div>
      </div>

      <!-- Thread Detail Drawer -->
      <div id="threadDrawer" class="hidden fixed inset-y-0 right-0 w-full max-w-md z-50" style="background:rgba(0,0,0,.6)">
        <div class="h-full overflow-y-auto" style="background:var(--surface-1); border-left:1px solid var(--border-base);">
          <div class="p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-bold text-zinc-100" id="drawerTitle">Thread</h3>
              <button id="drawerClose" class="text-zinc-500 hover:text-zinc-200 text-lg" aria-label="Close drawer">&times;</button>
            </div>
            <p class="text-xs text-zinc-400 mb-4" id="drawerThesis"></p>
            <div id="drawerEvents" class="scroll-area"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- PANEL: OPS                                         -->
    <!-- ══════════════════════════════════════════════════ -->
    <div id="panel-ops" class="tab-panel" role="tabpanel" aria-labelledby="tab-ops">
      <!-- Sync Status -->
      <section class="mb-6">
        <h2 class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Last Sync</h2>
        <div class="metric-card" id="syncStatusCard">
          <div class="flex items-center justify-between">
            <div>
              <span class="sync-badge" id="syncBadge">--</span>
              <span class="text-xs text-zinc-500 ml-2" id="syncTime">--</span>
            </div>
            <span class="text-xs text-zinc-500" id="syncDuration">--</span>
          </div>
          <div class="mt-2 text-xs text-zinc-500" id="syncCounts"></div>
          <div class="mt-1 text-xs text-red-400 hidden" id="syncError"></div>
        </div>
      </section>

      <!-- Tool Call Frequency -->
      <section class="mb-6">
        <h2 class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Tool Call Frequency (24h)</h2>
        <div id="toolFrequency" class="space-y-1">
          <div class="skeleton h-6 mb-1"></div>
          <div class="skeleton h-6 mb-1"></div>
          <div class="skeleton h-6 mb-1"></div>
        </div>
      </section>

      <!-- Active Verification Cycles -->
      <section class="mb-6">
        <h2 class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Active Verification Cycles</h2>
        <div id="activeCycles" class="space-y-2">
          <p class="text-xs text-zinc-500">None active</p>
        </div>
      </section>

      <!-- Privacy Mode Stats -->
      <section class="mb-6" id="privacyStatsSection">
        <h2 class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Audience Mode</h2>
        <div class="metric-card" id="privacyStatsCard">
          <p class="text-xs text-zinc-500">No audience events recorded</p>
        </div>
      </section>

      <!-- Data Counts -->
      <section class="mb-6">
        <h2 class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Data Summary</h2>
        <div class="grid grid-cols-3 gap-3" id="dataCounts">
          <div class="metric-card text-center">
            <div class="metric-value text-lg" id="countBriefs">--</div>
            <div class="metric-label">Briefs</div>
          </div>
          <div class="metric-card text-center">
            <div class="metric-value text-lg" id="countThreads">--</div>
            <div class="metric-label">Threads</div>
          </div>
          <div class="metric-card text-center">
            <div class="metric-value text-lg" id="countEvents">--</div>
            <div class="metric-label">Events</div>
          </div>
        </div>
      </section>

      <!-- Sync History -->
      <section class="mb-6">
        <h2 class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Sync History</h2>
        <div class="scroll-area" id="syncHistory">
          <table class="w-full text-xs">
            <thead>
              <tr class="text-zinc-500 border-b border-zinc-800">
                <th class="text-left py-2 font-medium">Time</th>
                <th class="text-left py-2 font-medium">Status</th>
                <th class="text-right py-2 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody id="syncHistoryBody"></tbody>
          </table>
        </div>
      </section>
    </div>

  </div>

  <script>
  (function() {
    'use strict';

    // ── State ───────────────────────────────────────────
    let currentTab = 'brief';
    let currentDate = null;
    let lastDataHash = '';
    let isPublicMode = false;
    let cameraEnabled = false;
    let cameraStream = null;
    let presenceCheckInterval = null;
    let consecutivePresence = 0;

    // ── XSS safety ──────────────────────────────────────
    function esc(s) {
      if (s == null) return '';
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function truncate(s, n) {
      if (!s) return '';
      return s.length > n ? s.slice(0, n) + '...' : s;
    }

    function sanitizeEntity(name) {
      if (!isPublicMode || !name) return esc(name);
      // In public mode: show first letter + dots
      return esc(name.charAt(0)) + '***';
    }

    function sanitizeDomain(url) {
      if (!url) return '';
      try { return new URL(url).hostname; } catch { return esc(url); }
    }

    function relativeTime(ts) {
      if (!ts) return '--';
      const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
      const diff = Date.now() - d.getTime();
      if (diff < 60000) return 'just now';
      if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
      if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
      return Math.floor(diff/86400000) + 'd ago';
    }

    function fmtDate(d) {
      return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' });
    }

    // ── Tab Switching ───────────────────────────────────
    document.querySelectorAll('[role="tab"]').forEach(function(tab) {
      tab.addEventListener('click', function() {
        var target = this.dataset.tab;
        currentTab = target;
        document.querySelectorAll('[role="tab"]').forEach(function(t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected','false');
        });
        this.classList.add('active');
        this.setAttribute('aria-selected','true');
        document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
        document.getElementById('panel-' + target).classList.add('active');
        refreshData();
      });
    });

    // ── Phase Filter ────────────────────────────────────
    document.getElementById('phaseFilter').addEventListener('click', function(e) {
      var btn = e.target.closest('[data-phase]');
      if (!btn) return;
      this.querySelectorAll('[data-phase]').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderNarrative(window.__narrativeData, btn.dataset.phase);
    });

    // ── Thread Drawer ───────────────────────────────────
    document.getElementById('drawerClose').addEventListener('click', function() {
      document.getElementById('threadDrawer').classList.add('hidden');
    });

    // ── Date helpers ────────────────────────────────────
    function getDateRange(n) {
      var dates = [];
      for (var i = 0; i < n; i++) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        // Use local date (not UTC) to match server-side date strings
        var yyyy = d.getFullYear();
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        var dd = String(d.getDate()).padStart(2, '0');
        dates.push(yyyy + '-' + mm + '-' + dd);
      }
      return dates;
    }

    function renderDatePicker() {
      var dates = getDateRange(7);
      var today = dates[0];
      if (!currentDate) currentDate = today;
      var picker = document.getElementById('datePicker');
      picker.innerHTML = dates.map(function(d) {
        var isActive = d === currentDate;
        var label = d === today ? 'Today' : fmtDate(d);
        return '<button class="tab-btn text-[11px] py-1 px-3 rounded-full' + (isActive ? ' active' : '') + '" data-date="' + d + '" style="flex:0">' + label + '</button>';
      }).join('');

      picker.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-date]');
        if (!btn) return;
        currentDate = btn.dataset.date;
        picker.querySelectorAll('[data-date]').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        fetchBrief(currentDate);
      });
    }

    // ── Data Fetching ───────────────────────────────────
    async function fetchBrief(date) {
      try {
        var url = date ? '/api/brief/date/' + encodeURIComponent(date) : '/api/brief/latest';
        var res = await fetch(url);
        var data = await res.json();
        renderBrief(data);

        // Also fetch memories for this date
        if (date || data.date_string) {
          var mDate = date || data.date_string;
          var mRes = await fetch('/api/brief/memories/' + encodeURIComponent(mDate));
          var mData = await mRes.json();
          renderMemories(mData);
        }
      } catch (err) {
        console.error('[brief] fetch error:', err);
      }
    }

    async function fetchNarrative(phase) {
      try {
        var url = '/api/narrative/threads' + (phase && phase !== 'all' ? '?phase=' + phase : '');
        var res = await fetch(url);
        var data = await res.json();
        window.__narrativeData = data;
        renderNarrative(data, phase || 'all');
      } catch (err) {
        console.error('[narrative] fetch error:', err);
      }
    }

    async function fetchOps() {
      try {
        var [syncRes, statsRes] = await Promise.all([
          fetch('/api/ops/sync-status'),
          fetch('/api/ops/stats')
        ]);
        var sync = await syncRes.json();
        var stats = await statsRes.json();
        renderOps(sync, stats);
      } catch (err) {
        console.error('[ops] fetch error:', err);
      }
    }

    async function refreshData() {
      if (currentTab === 'brief') await fetchBrief(currentDate);
      else if (currentTab === 'narrative') await fetchNarrative();
      else if (currentTab === 'ops') await fetchOps();
      document.getElementById('lastRefresh').textContent = 'Updated ' + new Date().toLocaleTimeString();
    }

    // ── Render: Brief ───────────────────────────────────
    function renderBrief(data) {
      if (!data || data.empty) {
        document.getElementById('metricsGrid').innerHTML =
          '<div class="metric-card col-span-4 text-center py-8">' +
          '<p class="text-zinc-500 text-sm">No brief data synced yet</p>' +
          '<p class="text-zinc-600 text-xs mt-1">Run: npm run local:sync</p></div>';
        return;
      }

      var metrics = data.dashboard_metrics || {};
      var summary = data.source_summary || {};

      // Readiness gauge
      var readiness = metrics.techReadiness ?? metrics.readiness ?? 0;
      var pct = Math.min(100, Math.max(0, readiness));
      var circumference = 2 * Math.PI * 34;
      var offset = circumference - (pct / 100) * circumference;
      var gaugeFg = document.getElementById('gaugeFg');
      gaugeFg.setAttribute('stroke-dashoffset', String(offset));
      gaugeFg.setAttribute('stroke', pct >= 70 ? '#34d399' : pct >= 40 ? '#fbbf24' : '#f87171');
      document.getElementById('gaugeText').textContent = Math.round(pct);

      // Metric cards
      document.getElementById('metricThreads').textContent = metrics.threadCount ?? metrics.threads ?? '--';
      document.getElementById('metricEvents').textContent = metrics.eventCount ?? metrics.events ?? '--';
      document.getElementById('metricSources').textContent = metrics.sourceCount ?? metrics.sources ?? '--';

      // Source summary
      if (summary && typeof summary === 'object' && Object.keys(summary).length > 0) {
        var grid = document.getElementById('sourceSummaryGrid');
        grid.innerHTML = Object.entries(summary).map(function(entry) {
          var key = entry[0], val = entry[1];
          var displayVal = typeof val === 'number' ? val : (val && val.count != null ? val.count : '?');
          return '<div class="metric-card text-center">' +
            '<div class="text-lg font-bold text-zinc-100">' + esc(String(displayVal)) + '</div>' +
            '<div class="metric-label">' + (isPublicMode ? sanitizeDomain(key) : esc(key)) + '</div></div>';
        }).join('');
        document.getElementById('sourceSummarySection').classList.remove('hidden');
      }
    }

    function renderMemories(data) {
      if (!data) return;
      var memories = data.memories || [];
      var tasks = data.tasks || [];

      // Features
      if (memories.length > 0) {
        var allFeatures = [];
        memories.forEach(function(m) {
          var feats = m.features || [];
          feats.forEach(function(f) {
            allFeatures.push(typeof f === 'string' ? { name: f, status: 'unknown' } : f);
          });
        });

        if (allFeatures.length > 0) {
          var list = document.getElementById('featuresList');
          list.innerHTML = allFeatures.map(function(f) {
            var status = (f.status || 'unknown').toLowerCase();
            var badgeClass = status === 'passing' || status === 'done' ? 'bg-emerald-900/50 text-emerald-300' :
              status === 'failing' || status === 'error' ? 'bg-red-900/50 text-red-300' :
              'bg-amber-900/50 text-amber-300';
            var name = isPublicMode ? sanitizeEntity(f.name) : esc(f.name);
            return '<div class="flex items-center justify-between p-2 rounded-lg" style="background:var(--surface-1);border:1px solid var(--border-base)">' +
              '<span class="text-xs text-zinc-200">' + name + '</span>' +
              '<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ' + badgeClass + '">' + esc(status) + '</span></div>';
          }).join('');
          document.getElementById('featuresSection').classList.remove('hidden');
        }
      }

      // Task results (hidden in public mode)
      if (tasks.length > 0 && !isPublicMode) {
        var taskList = document.getElementById('taskResultsList');
        taskList.innerHTML = tasks.map(function(t, i) {
          return '<details class="group">' +
            '<summary class="flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs text-zinc-300 hover:text-zinc-100" ' +
            'style="background:var(--surface-1);border:1px solid var(--border-base)">' +
            '<span>' + esc(t.task_id || 'Task ' + (i+1)) + '</span>' +
            '<svg class="w-3 h-3 text-zinc-500 group-open:rotate-90 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>' +
            '</summary>' +
            '<div class="mt-1 p-3 text-xs text-zinc-400 leading-relaxed" style="background:var(--surface-2);border-radius:var(--radius-md)">' +
            esc(t.result_markdown || 'No result') + '</div></details>';
        }).join('');
        document.getElementById('taskResultsSection').classList.remove('hidden');
      }

      if (isPublicMode) {
        document.getElementById('taskResultsSection').classList.add('hidden');
      }
    }

    // ── Render: Narrative ───────────────────────────────
    function renderNarrative(threads, phaseFilter) {
      var container = document.getElementById('narrativeLanes');
      if (!threads || threads.length === 0) {
        container.innerHTML = '<div class="text-center py-8"><p class="text-zinc-500 text-sm">No narrative threads synced</p>' +
          '<p class="text-zinc-600 text-xs mt-1">Run: npm run local:sync</p></div>';
        return;
      }

      // Group by phase
      var phases = ['emerging','escalating','climax','resolution','dormant'];
      var grouped = {};
      phases.forEach(function(p) { grouped[p] = []; });
      threads.forEach(function(t) {
        var p = (t.current_phase || 'dormant').toLowerCase();
        if (!grouped[p]) grouped[p] = [];
        grouped[p].push(t);
      });

      var html = '';
      phases.forEach(function(phase) {
        var items = grouped[phase] || [];
        if (phaseFilter && phaseFilter !== 'all' && phaseFilter !== phase) return;
        if (items.length === 0) return;

        html += '<div class="phase-lane ' + phase + ' fade-up">' +
          '<div class="phase-label ' + phase + '">' + phase + ' (' + items.length + ')</div>';

        items.forEach(function(t) {
          var tags = (t.topic_tags || []).slice(0, 3);
          var entities = t.entity_keys || [];
          var name = isPublicMode ? sanitizeEntity(t.name) : esc(t.name);
          var thesis = isPublicMode ? '' : '<div class="thread-thesis">' + esc(truncate(t.thesis, 120)) + '</div>';
          var quality = t.quality || {};
          var evCount = t.event_count || 0;
          var twistCount = t.plot_twist_count || 0;

          html += '<div class="thread-card" tabindex="0" role="button" aria-label="View thread: ' + esc(t.name) + '" data-thread-id="' + esc(t.id) + '">' +
            '<div class="thread-name">' + name + '</div>' +
            thesis +
            '<div class="thread-meta">';

          if (evCount > 0) {
            html += '<span class="thread-badge" style="background:var(--surface-2);color:#a1a1aa">' + evCount + ' events</span>';
          }
          if (twistCount > 0) {
            html += '<span class="thread-badge" style="background:#450a0a;color:#fca5a5">' + twistCount + (twistCount === 1 ? ' twist' : ' twists') + '</span>';
          }

          if (!isPublicMode) {
            tags.forEach(function(tag) {
              html += '<span class="thread-tag">' + esc(tag) + '</span>';
            });
          }

          if (quality && quality.confidence != null) {
            html += '<div class="flex items-center gap-1 ml-auto"><span class="text-[10px] text-zinc-500">' + Math.round(quality.confidence * 100) + '%</span>' +
              '<div class="conf-bar w-12"><div class="conf-fill" style="width:' + Math.round(quality.confidence * 100) + '%;background:' +
              (quality.confidence >= 0.7 ? '#34d399' : quality.confidence >= 0.4 ? '#fbbf24' : '#f87171') + '"></div></div></div>';
          }

          html += '</div></div>';
        });

        html += '</div>';
      });

      container.innerHTML = html || '<div class="text-center py-8"><p class="text-zinc-500 text-sm">No threads match this filter</p></div>';

      // Thread click → drawer
      container.querySelectorAll('.thread-card').forEach(function(card) {
        card.addEventListener('click', function() { openThreadDrawer(this.dataset.threadId); });
        card.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openThreadDrawer(this.dataset.threadId); } });
      });
    }

    async function openThreadDrawer(threadId) {
      if (!threadId) return;
      var drawer = document.getElementById('threadDrawer');
      drawer.classList.remove('hidden');

      try {
        var res = await fetch('/api/narrative/thread/' + encodeURIComponent(threadId));
        var data = await res.json();
        if (data.empty) {
          document.getElementById('drawerTitle').textContent = 'Not found';
          document.getElementById('drawerThesis').textContent = '';
          document.getElementById('drawerEvents').innerHTML = '';
          return;
        }

        var thread = data.thread;
        document.getElementById('drawerTitle').textContent = isPublicMode ? sanitizeEntity(thread.name) : thread.name;
        document.getElementById('drawerThesis').textContent = isPublicMode ? '' : (thread.thesis || '');

        var events = data.events || [];
        if (isPublicMode) {
          document.getElementById('drawerEvents').innerHTML = '<p class="text-xs text-zinc-500">' + events.length + ' events (hidden in public mode)</p>';
        } else if (events.length === 0) {
          document.getElementById('drawerEvents').innerHTML = '<p class="text-xs text-zinc-500">No events recorded for this thread</p>';
        } else {
          document.getElementById('drawerEvents').innerHTML = events.map(function(e) {
            var sig = (e.significance || 'minor').toLowerCase();
            return '<div class="event-item">' +
              '<div class="event-dot ' + sig + '"></div>' +
              '<div><div class="event-headline">' + esc(e.headline) + '</div>' +
              '<div class="event-time">' + relativeTime(e.occurred_at) + '</div>' +
              (e.summary ? '<p class="text-[11px] text-zinc-500 mt-1">' + esc(truncate(e.summary, 200)) + '</p>' : '') +
              '</div></div>';
          }).join('');
        }
      } catch (err) {
        document.getElementById('drawerEvents').innerHTML = '<p class="text-xs text-red-400">Error loading thread</p>';
      }
    }

    // ── Render: Ops ─────────────────────────────────────
    function renderOps(sync, stats) {
      // Sync status
      if (sync && sync.latest) {
        var s = sync.latest;
        var badge = document.getElementById('syncBadge');
        badge.textContent = s.status || '--';
        badge.className = 'sync-badge ' + (s.status || '');
        document.getElementById('syncTime').textContent = relativeTime(s.started_at || s.completed_at);
        document.getElementById('syncDuration').textContent = s.duration_ms ? (s.duration_ms + 'ms') : '--';

        var tables = s.tables_synced || {};
        if (typeof tables === 'object' && Object.keys(tables).length > 0) {
          document.getElementById('syncCounts').textContent = Object.entries(tables).map(function(e) {
            return e[0] + ': ' + e[1];
          }).join(' | ');
        }

        if (s.error) {
          var errEl = document.getElementById('syncError');
          errEl.textContent = s.error;
          errEl.classList.remove('hidden');
        }
      }

      // Sync history
      if (sync && sync.history) {
        var tbody = document.getElementById('syncHistoryBody');
        tbody.innerHTML = sync.history.map(function(r) {
          return '<tr class="border-b border-zinc-800/50">' +
            '<td class="py-2 text-zinc-400">' + relativeTime(r.started_at) + '</td>' +
            '<td class="py-2"><span class="sync-badge ' + (r.status || '') + '">' + esc(r.status) + '</span></td>' +
            '<td class="py-2 text-right text-zinc-500">' + (r.duration_ms ? r.duration_ms + 'ms' : '--') + '</td></tr>';
        }).join('');
      }

      // Tool frequency
      if (stats) {
        var tools = stats.toolCallFrequency || [];
        var toolEl = document.getElementById('toolFrequency');
        if (tools.length === 0) {
          toolEl.innerHTML = '<p class="text-xs text-zinc-500">No tool calls in last 24h</p>';
        } else {
          var maxCount = Math.max.apply(null, tools.map(function(t) { return t.count; }));
          toolEl.innerHTML = tools.map(function(t) {
            var pct = maxCount > 0 ? Math.round((t.count / maxCount) * 100) : 0;
            var errPct = t.count > 0 ? Math.round((t.errors / t.count) * 100) : 0;
            return '<div class="flex items-center gap-2 text-xs py-1">' +
              '<span class="text-zinc-400 w-36 truncate" title="' + esc(t.tool_name) + '">' + esc(t.tool_name) + '</span>' +
              '<div class="flex-1 conf-bar"><div class="conf-fill" style="width:' + pct + '%;background:' + (errPct > 20 ? '#f87171' : '#4f46e5') + '"></div></div>' +
              '<span class="text-zinc-500 w-8 text-right">' + t.count + '</span>' +
              (t.errors > 0 ? '<span class="text-red-400 text-[10px]">' + t.errors + 'err</span>' : '') +
              '</div>';
          }).join('');
        }

        // Active cycles
        var cycles = stats.activeCycles || [];
        var cycleEl = document.getElementById('activeCycles');
        if (cycles.length === 0) {
          cycleEl.innerHTML = '<p class="text-xs text-zinc-500">None active</p>';
        } else {
          cycleEl.innerHTML = cycles.map(function(c) {
            return '<div class="metric-card text-xs">' +
              '<div class="font-semibold text-zinc-200">' + esc(c.title) + '</div>' +
              '<div class="text-zinc-500 mt-1">Status: ' + esc(c.status) + ' | ' + relativeTime(c.created_at) + '</div></div>';
          }).join('');
        }

        // Privacy stats
        var priv = stats.privacyMode;
        if (priv) {
          document.getElementById('privacyStatsCard').innerHTML =
            '<div class="flex items-center gap-4">' +
            '<div><span class="text-lg font-bold text-zinc-100">' + (priv.triggeredToday || 0) + '</span>' +
            '<div class="metric-label">Triggers today</div></div>' +
            '<div><span class="text-lg font-bold text-zinc-100">' + (priv.totalEvents || 0) + '</span>' +
            '<div class="metric-label">Total events</div></div></div>';
        }

        // Data counts
        var dc = stats.dataCounts || {};
        document.getElementById('countBriefs').textContent = dc.briefs ?? '--';
        document.getElementById('countThreads').textContent = dc.threads ?? '--';
        document.getElementById('countEvents').textContent = dc.events ?? '--';
      }
    }

    // ── Privacy / Camera Detection ──────────────────────
    var privacyToggle = document.getElementById('privacyToggle');
    privacyToggle.addEventListener('click', function() {
      cameraEnabled = !cameraEnabled;
      this.classList.toggle('on', cameraEnabled);
      this.setAttribute('aria-checked', String(cameraEnabled));

      if (cameraEnabled) startPresenceDetection();
      else stopPresenceDetection();
    });

    async function startPresenceDetection() {
      try {
        var video = document.getElementById('privacyVideo');
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { width:64, height:48, frameRate:1 } });
        video.srcObject = cameraStream;
        await video.play();

        presenceCheckInterval = setInterval(checkPresence, 1000);
        logAudienceEvent('session_start', 0, false);
      } catch (err) {
        console.warn('[privacy] Camera access denied:', err.message);
        cameraEnabled = false;
        privacyToggle.classList.remove('on');
        privacyToggle.setAttribute('aria-checked', 'false');
      }
    }

    function stopPresenceDetection() {
      if (presenceCheckInterval) { clearInterval(presenceCheckInterval); presenceCheckInterval = null; }
      if (cameraStream) { cameraStream.getTracks().forEach(function(t) { t.stop(); }); cameraStream = null; }
      var video = document.getElementById('privacyVideo');
      video.srcObject = null;
      setPublicMode(false);
      consecutivePresence = 0;
    }

    function checkPresence() {
      var video = document.getElementById('privacyVideo');
      var canvas = document.getElementById('privacyCanvas');
      var ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 64, 48);
      var frame = ctx.getImageData(0, 0, 64, 48);
      var pixels = frame.data;

      // Compute pixel standard deviation (grayscale)
      var sum = 0, sumSq = 0, n = pixels.length / 4;
      for (var i = 0; i < pixels.length; i += 4) {
        var gray = 0.299 * pixels[i] + 0.587 * pixels[i+1] + 0.114 * pixels[i+2];
        sum += gray;
        sumSq += gray * gray;
      }
      var mean = sum / n;
      var variance = (sumSq / n) - (mean * mean);
      var stdDev = Math.sqrt(Math.abs(variance));

      // Above threshold = presence detected (scene complexity)
      var hasPresence = stdDev > 25;
      if (hasPresence) {
        consecutivePresence++;
      } else {
        consecutivePresence = Math.max(0, consecutivePresence - 1);
      }

      // Two consecutive presence detections → public mode
      var shouldBePublic = consecutivePresence >= 2;
      if (shouldBePublic !== isPublicMode) {
        setPublicMode(shouldBePublic);
        logAudienceEvent('mode_switch', shouldBePublic ? 2 : 0, shouldBePublic);
      }
    }

    function setPublicMode(pub) {
      isPublicMode = pub;
      var indicator = document.getElementById('privacyStatus');
      indicator.classList.toggle('active', pub);

      // Re-render current view with sanitization
      refreshData();
    }

    function logAudienceEvent(type, viewerCount, isPublic) {
      fetch('/api/audience/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: type, viewer_count: viewerCount, is_public: isPublic })
      }).catch(function() {});
    }

    // ── Hash-based diffing for auto-refresh ─────────────
    function hashStr(s) {
      var h = 0;
      for (var i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i);
        h |= 0;
      }
      return String(h);
    }

    // ── Init ────────────────────────────────────────────
    renderDatePicker();
    refreshData();

    // Auto-refresh every 30s
    setInterval(function() {
      refreshData();
    }, 30000);

  })();
  <\/script>
</body>
</html>`;
}
