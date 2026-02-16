/**
 * NodeBench MCP — Dashboard HTML v4
 *
 * Single-scroll, zero-tab dashboard. Everything visible at once.
 * Clean, intuitive design: Inter font, clear section hierarchy.
 * Auto-refreshes every 5s with hash-based diffing.
 *
 * v4 improvements:
 * - CSS custom properties for consistent spacing/shadows/gradients
 * - Responsive @media breakpoints for mobile/tablet
 * - Full ARIA accessibility (labels, roles, keyboard nav, focus-visible)
 * - Carousel: IntersectionObserver dot tracking, edge-disabled arrows, keyboard arrows
 * - XSS safety: all user-controlled strings escaped
 * - Smart refresh: skip re-render when data unchanged
 * - Priority-scored category detection
 * - Deferred rendering for collapsed cards (DOM-light pagination)
 */

export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodeBench UI Review</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
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
  </script>
  <style>
    /* ── Design Tokens ──────────────────────────────────────── */
    :root {
      --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 24px; --sp-6: 32px;
      --border-base: #27272a;
      --border-hover: #3f3f46;
      --border-accent: #6366f1;
      --surface-1: #111113;
      --surface-2: #18181b;
      --gradient-accent: linear-gradient(135deg, #1e1b4b, #312e81);
      --shadow-card: 0 0 0 1px rgba(99,102,241,.15), 0 1px 3px rgba(0,0,0,.4);
      --shadow-card-hover: 0 0 0 1px rgba(99,102,241,.35), 0 4px 12px rgba(0,0,0,.5);
      --shadow-lift: 0 8px 30px rgba(99,102,241,.12), 0 2px 8px rgba(0,0,0,.4);
      --radius-sm: 6px; --radius-md: 8px; --radius-lg: 10px; --radius-xl: 12px;
      --transition-fast: .15s ease; --transition-base: .2s ease;
    }

    /* ── Reset & Base ───────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }

    /* ── Shared Interactive ─────────────────────────────────── */
    .glass { background: rgba(17,17,19,.72); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
    .ring-glow { box-shadow: var(--shadow-card); }
    .ring-glow:hover { box-shadow: var(--shadow-card-hover); }

    .btn-icon {
      width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      border-radius: var(--radius-md); border: 1px solid var(--border-base);
      background: transparent; color: #52525b; cursor: pointer;
      transition: all var(--transition-fast);
    }
    .btn-icon:hover { background: var(--surface-2); color: #d4d4d8; border-color: var(--border-hover); }
    .btn-icon.active { background: var(--gradient-accent); border-color: var(--border-accent); color: #c7d2fe; }
    .btn-icon:focus-visible { outline: 2px solid var(--border-accent); outline-offset: 2px; }
    .btn-icon svg { width: 16px; height: 16px; }

    /* ── Focus-Visible (global) ─────────────────────────────── */
    :focus-visible { outline: 2px solid var(--border-accent); outline-offset: 2px; }
    :focus:not(:focus-visible) { outline: none; }

    /* ── Animations ─────────────────────────────────────────── */
    @keyframes fadeUp { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
    .fade-up { animation: fadeUp .35s ease-out both; }
    /* Staggered cascade for lists of cards */
    .fade-up:nth-child(2) { animation-delay: 50ms; }
    .fade-up:nth-child(3) { animation-delay: 100ms; }
    .fade-up:nth-child(n+4) { animation-delay: 150ms; }
    @keyframes pulse2 { 0%,100%{opacity:1} 50%{opacity:.35} }
    .pulse-live { animation: pulse2 2s infinite; }
    @keyframes pulseAgent { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(52,211,153,.4)} 50%{opacity:.7;box-shadow:0 0 0 4px rgba(52,211,153,0)} }
    .pulse-agent { animation: pulseAgent 2s ease-in-out infinite; }

    /* ── Agent Monitor ────────────────────────────────────── */
    .agent-lane { border-left: 3px solid var(--border-accent); transition: border-color var(--transition-base); }
    .agent-lane:hover { border-left-color: #818cf8; }
    .agent-budget-bar { height:4px; border-radius:2px; background:var(--surface-2); overflow:hidden; }
    .agent-budget-fill { height:100%; border-radius:2px; transition: width var(--transition-base); }
    .activity-feed { max-height:400px; overflow-y:auto; scrollbar-width:thin; scrollbar-color:var(--border-base) transparent; }
    .activity-feed::-webkit-scrollbar { width:6px; }
    .activity-feed::-webkit-scrollbar-track { background:transparent; }
    .activity-feed::-webkit-scrollbar-thumb { background:var(--border-base); border-radius:3px; }
    .activity-feed::-webkit-scrollbar-thumb:hover { background:var(--border-hover); }

    /* ── Skeleton Loading ──────────────────────────────────── */
    .skeleton { border-radius: var(--radius-lg); background: linear-gradient(90deg, var(--surface-2) 25%, #1f1f23 50%, var(--surface-2) 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.5s ease-in-out infinite; }
    @keyframes skeleton-shimmer { 0%, 100% { background-position: 200% 0; } 50% { background-position: 0% 0; } }

    /* ── Reduced Motion ────────────────────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
      .fade-up { animation: none; opacity: 1; transform: none; }
      .pulse-live { animation: none; }
      .pulse-agent { animation: none; }
      .skeleton { animation: none; }
      .ss-card:hover { transform: none; }
      .score-ring .fg { transition: none; }
    }

    /* ── Score Ring ─────────────────────────────────────────── */
    .score-ring { width:64px; height:64px; }
    .score-ring circle { fill:none; stroke-width:5; stroke-linecap:round; }
    .score-ring .bg { stroke: var(--border-base); }
    .score-ring .fg { transition: stroke-dashoffset .6s ease; }
    pre { white-space: pre-wrap; word-break: break-word; tab-size: 2; }

    /* ── Severity Badges ───────────────────────────────────── */
    .sev-critical { background:#450a0a; color:#fca5a5; }
    .sev-high { background:#451a03; color:#fde68a; }
    .sev-medium { background:#0c1a3d; color:#93c5fd; }
    .sev-low { background:#052e16; color:#86efac; }

    /* ── File Chips ────────────────────────────────────────── */
    .file-chip {
      display:inline-block; padding:2px 8px; margin:2px 3px 2px 0; border-radius:4px;
      background: var(--surface-2); border:1px solid var(--border-base);
      font-size:11px; font-family:'SF Mono',Monaco,monospace; color:#a1a1aa;
      max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    }

    /* ── Screenshot Grid ───────────────────────────────────── */
    .ss-grid { display:grid; gap: var(--sp-3); }
    .ss-grid.sz-sm { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
    .ss-grid.sz-md { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
    .ss-grid.sz-lg { grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); }
    .ss-card {
      cursor:pointer; transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
      border-radius: var(--radius-lg); overflow:hidden; border:1px solid var(--border-base); background: var(--surface-1);
    }
    .ss-card:hover { transform:translateY(-3px); box-shadow: var(--shadow-lift); border-color:#4f46e5; }
    .ss-card:focus-visible { box-shadow: var(--shadow-lift); border-color:#4f46e5; }
    .ss-card img { width:100%; aspect-ratio:16/10; object-fit:cover; display:block; background:linear-gradient(135deg,#18181b 0%,#1f1f23 100%); }
    .ss-meta { padding: var(--sp-2) var(--sp-3); border-top:1px solid #1e1e22; }
    .ss-toolbar {
      display:flex; align-items:center; gap: var(--sp-3); flex-wrap:wrap;
      margin-bottom: var(--sp-3); padding: var(--sp-3) 14px;
      background: var(--surface-1); border-radius: var(--radius-lg); border:1px solid #1e1e22;
    }
    .ss-search {
      background:#09090b; border:1px solid var(--border-base); color:#d4d4d8;
      padding:6px 10px 6px 32px; border-radius: var(--radius-md); font-size:12px;
      width:220px; outline:none; transition: border-color var(--transition-fast);
    }
    .ss-search:focus { border-color: var(--border-accent); box-shadow:0 0 0 3px rgba(99,102,241,.1); }
    .ss-search-wrap { position:relative; display:flex; align-items:center; }
    .ss-search-icon { position:absolute; left:9px; top:50%; transform:translateY(-50%); width:14px; height:14px; color:#52525b; pointer-events:none; }

    /* ── Category Pills ────────────────────────────────────── */
    .cat-pill {
      display:inline-flex; align-items:center; gap:4px; padding:4px 12px;
      border-radius:999px; font-size:11px; font-weight:500; cursor:pointer;
      transition: all var(--transition-fast); border:1px solid var(--border-base);
      color:#a1a1aa; background:transparent; user-select:none;
      font-family:inherit; line-height:1.4;
    }
    .cat-pill:hover { background: var(--surface-2); border-color: var(--border-hover); }
    .cat-pill[aria-pressed="true"] { background: var(--gradient-accent); border-color: var(--border-accent); color:#c7d2fe; box-shadow:0 0 0 1px rgba(99,102,241,.2); }
    .cat-pill:focus-visible { outline:2px solid var(--border-accent); outline-offset:2px; }
    .cat-pill .cat-count { background: var(--border-base); color:#a1a1aa; padding:1px 6px; border-radius:9px; font-size:10px; margin-left:2px; line-height:1.3; }
    .cat-pill[aria-pressed="true"] .cat-count { background:rgba(99,102,241,.3); color:#e0e7ff; }

    /* ── Grid Size Toggle ──────────────────────────────────── */
    .sz-btn { width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius: var(--radius-md); border:1px solid var(--border-base); background:transparent; color:#52525b; cursor:pointer; transition:all var(--transition-fast); }
    .sz-btn:hover { background: var(--surface-2); color:#d4d4d8; border-color: var(--border-hover); }
    .sz-btn[aria-pressed="true"] { background: var(--gradient-accent); border-color: var(--border-accent); color:#c7d2fe; }
    .sz-btn:focus-visible { outline:2px solid var(--border-accent); outline-offset:2px; }
    .sz-btn svg { width:16px; height:16px; }

    /* ── Screenshot Groups ─────────────────────────────────── */
    .ss-group-hdr { font-size:12px; font-weight:600; color:#a1a1aa; padding: var(--sp-4) 0 var(--sp-2); margin-bottom: var(--sp-3); display:flex; align-items:center; gap: var(--sp-2); border-bottom:1px solid #1e1e22; }
    .ss-group-hdr .g-count { font-weight:400; color:#71717a; font-size:11px; }
    .ss-show-more {
      display:flex; align-items:center; justify-content:center; gap:6px;
      padding:10px var(--sp-5); border-radius: var(--radius-md); border:1px solid var(--border-base);
      background: var(--surface-1); color:#a1a1aa; font-size:12px; font-weight:500;
      cursor:pointer; transition:all var(--transition-fast); margin-top: var(--sp-3);
    }
    .ss-show-more:hover { border-color: var(--border-accent); color:#c7d2fe; background: var(--gradient-accent); }
    .ss-show-more:focus-visible { outline:2px solid var(--border-accent); outline-offset:2px; }

    /* ── Section Headers ───────────────────────────────────── */
    .sec-hdr { margin-top: var(--sp-6); margin-bottom: var(--sp-4); display:flex; align-items:center; gap: var(--sp-3); }
    .sec-hdr .sec-icon { width:32px; height:32px; border-radius: var(--radius-md); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .sec-hdr .sec-icon svg { width:16px; height:16px; }
    .sec-hdr .sec-text h2 { font-size:14px; font-weight:700; color:#fafafa; letter-spacing:-.01em; }
    .sec-hdr .sec-text .sec-sub { font-size:11px; color:#71717a; margin-top:1px; }

    /* ── Lightbox ───────────────────────────────────────────── */
    .lightbox { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,.92); display:none; align-items:center; justify-content:center; }
    .lightbox.open { display:flex; }
    .lightbox img { max-width:88vw; max-height:85vh; border-radius: var(--radius-md); box-shadow:0 12px 40px rgba(0,0,0,.6); cursor:default; }
    .lb-chrome { position:absolute; bottom:20px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap: var(--sp-3); background:rgba(17,17,19,.9); padding: var(--sp-2) var(--sp-4); border-radius: var(--radius-lg); border:1px solid var(--border-base); }
    .lb-label { font-size:12px; color:#a1a1aa; max-width:400px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .lb-counter { font-size:11px; color:#71717a; white-space:nowrap; }
    .lb-nav {
      width:36px; height:36px; border-radius:50%; border:1px solid var(--border-hover);
      background:rgba(17,17,19,.8); color:#d4d4d8; display:flex; align-items:center;
      justify-content:center; cursor:pointer; font-size:18px; transition:all var(--transition-fast);
      position:absolute; top:50%; z-index:201;
    }
    .lb-nav:hover { background:#4f46e5; border-color: var(--border-accent); color:#fff; }
    .lb-nav:focus-visible { outline:2px solid #a5b4fc; outline-offset:2px; }
    .lb-nav.prev { left:16px; transform:translateY(-50%); }
    .lb-nav.next { right:16px; transform:translateY(-50%); }
    .lb-close {
      position:absolute; top:16px; right:16px; width:36px; height:36px; border-radius:50%;
      border:1px solid var(--border-hover); background:rgba(17,17,19,.8); color:#d4d4d8;
      display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:18px;
      z-index:201; transition:all var(--transition-fast);
    }
    .lb-close:hover { background:#dc2626; border-color:#ef4444; color:#fff; }
    .lb-close:focus-visible { outline:2px solid #ef4444; outline-offset:2px; }

    /* ── Changelog Carousel ────────────────────────────────── */
    .cl-carousel { position:relative; }
    .cl-track {
      display:flex; gap: var(--sp-4); overflow-x:auto; scroll-snap-type:x mandatory;
      -webkit-overflow-scrolling:touch; padding:4px 0 var(--sp-3); scrollbar-width:none;
    }
    .cl-track::-webkit-scrollbar { display:none; }
    .cl-card {
      flex:0 0 min(100%, 420px); scroll-snap-align:start; background: var(--surface-1);
      border:1px solid var(--border-base); border-radius: var(--radius-xl); padding:20px;
      display:flex; flex-direction:column; gap: var(--sp-3);
      transition: border-color var(--transition-base), box-shadow var(--transition-base);
    }
    .cl-card:hover { border-color: var(--border-hover); box-shadow:0 4px 20px rgba(0,0,0,.3); }
    .cl-card:only-child { flex:0 0 100%; }
    .cl-step { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:50%; background: var(--gradient-accent); color:#c7d2fe; font-size:11px; font-weight:700; flex-shrink:0; }
    .cl-time { font-size:11px; color:#71717a; }
    .cl-desc { font-size:12px; color:#d4d4d8; line-height:1.6; flex:1; }
    .cl-files { display:flex; flex-wrap:wrap; gap:4px; }
    .cl-files .file-chip { max-width: min(260px, calc(100% - 8px)); }
    .cl-nav-btn {
      position:absolute; top:50%; transform:translateY(-50%); width:32px; height:32px;
      border-radius:50%; border:1px solid var(--border-base); background:rgba(9,9,11,.85);
      backdrop-filter:blur(8px); color:#a1a1aa; display:flex; align-items:center;
      justify-content:center; cursor:pointer; transition:all var(--transition-fast); z-index:5;
    }
    .cl-nav-btn:hover:not(.disabled) { background:#4f46e5; border-color: var(--border-accent); color:#fff; }
    .cl-nav-btn:focus-visible { outline:2px solid var(--border-accent); outline-offset:2px; }
    .cl-nav-btn.disabled { opacity:.25; cursor:default; pointer-events:none; }
    .cl-nav-btn.prev { left:-12px; }
    .cl-nav-btn.next { right:-12px; }
    .cl-nav-btn svg { width:14px; height:14px; }
    .cl-dots { display:flex; justify-content:center; gap:6px; padding-top: var(--sp-2); }
    .cl-dot {
      width:6px; height:6px; border-radius:50%; background: var(--border-base);
      transition: width var(--transition-base), background var(--transition-base), border-radius var(--transition-base);
      cursor:pointer; border:none; padding:0;
    }
    .cl-dot:focus-visible { outline:2px solid var(--border-accent); outline-offset:2px; }
    .cl-dot.active { background:#818cf8; width:18px; border-radius:3px; }

    /* ── Compare Mode ──────────────────────────────────────── */
    .compare-bar { display:flex; align-items:center; gap: var(--sp-3); padding: var(--sp-2) var(--sp-4); background: var(--surface-1); border-radius: var(--radius-md); margin-bottom: var(--sp-3); }
    .compare-bar select { background: var(--surface-2); border:1px solid var(--border-base); color:#d4d4d8; padding:4px 8px; border-radius: var(--radius-sm); font-size:12px; }
    .compare-grid { display:grid; grid-template-columns:1fr 1fr; gap: var(--sp-3); }
    .compare-grid .compare-col { border:1px solid var(--border-base); border-radius: var(--radius-md); overflow:hidden; }
    .compare-grid .compare-col .ch { padding: var(--sp-2) var(--sp-3); background: var(--surface-2); font-size:11px; color:#a1a1aa; font-weight:600; text-transform:uppercase; letter-spacing:.05em; }
    .compare-grid .compare-col img { width:100%; display:block; }
    .empty-state { text-align:center; padding: var(--sp-6) var(--sp-4); color:#71717a; }
    .empty-state .empty-icon { font-size:28px; margin-bottom: var(--sp-2); opacity:.5; }
    .empty-state .empty-hint { font-size:12px; line-height:1.5; max-width:400px; margin:0 auto; }
    .nav-pill { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:500; cursor:pointer; transition:all var(--transition-fast); border:1px solid transparent; }
    .nav-pill:hover { background: var(--surface-2); }
    .nav-pill.active { background:#1e1b4b; border-color:#4f46e5; color:#a5b4fc; }

    /* ── Responsive ────────────────────────────────────────── */
    @media (max-width: 640px) {
      .ss-grid.sz-md { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
      .ss-grid.sz-lg { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
      .ss-search { width: min(220px, calc(100% - 16px)); }
      .ss-toolbar { padding: var(--sp-2) var(--sp-3); gap: var(--sp-2); }
      .cl-card { flex: 0 0 min(100%, 320px); padding: var(--sp-4); }
      .compare-grid { grid-template-columns: 1fr; }
      .lb-chrome { max-width: calc(100vw - 32px); }
    }
    @media (max-width: 480px) {
      main { padding-left: var(--sp-3) !important; padding-right: var(--sp-3) !important; }
      .sec-hdr { margin-top: var(--sp-5); }
      .ss-grid.sz-sm { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
    }

    /* ── Print Stylesheet ──────────────────────────────────── */
    @media print {
      :root { --surface-1: #f9fafb; --surface-2: #f3f4f6; --border-base: #e5e7eb; }
      html, body { background: #fff; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      header, .ss-toolbar, .cat-pill, .sz-btn, .cl-nav-btn, .cl-dots, .lightbox, .ss-show-more, .compare-bar, #compare-btn { display: none !important; }
      main { max-width: 100%; padding: 0 16px; }
      .fade-up, .pulse-live, .skeleton { animation: none; }
      .ring-glow { box-shadow: none; border: 1px solid #d1d5db; }
      .text-white, .text-zinc-200 { color: #111; }
      .text-zinc-300, .text-zinc-400 { color: #4b5563; }
      .text-zinc-500, .text-zinc-600 { color: #6b7280; }
      .text-accent { color: #4f46e5; }
      .text-ok { color: #16a34a; } .text-warn { color: #d97706; } .text-err { color: #dc2626; }
      .bg-surface-0 { background: #fff; } .bg-surface-1, .bg-surface-2 { background: #f3f4f6; }
      .sev-critical { background: #fef2f2; color: #991b1b; border-left: 3px solid #dc2626; }
      .sev-high { background: #fffbeb; color: #92400e; border-left: 3px solid #ea580c; }
      .sev-medium { background: #eff6ff; color: #1e40af; border-left: 3px solid #3b82f6; }
      .sev-low { background: #f0fdf4; color: #166534; border-left: 3px solid #22c55e; }
      .ss-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 8px; }
      .ss-card { page-break-inside: avoid; }
      .sec-hdr { page-break-after: avoid; margin-top: 20px; }
      .glass { background: #fff; backdrop-filter: none; }
      .file-chip { background: #f3f4f6; border-color: #d1d5db; color: #374151; }
    }
  </style>
</head>
<body class="bg-surface-0 text-zinc-300 min-h-screen">

  <!-- Sticky header -->
  <header class="glass border-b border-border sticky top-0 z-50 px-5 h-14 flex items-center justify-between">
    <div class="flex items-center gap-2.5">
      <div class="w-7 h-7 rounded-md bg-gradient-to-br from-accent-dim to-accent flex items-center justify-center text-white text-xs font-bold">N</div>
      <div>
        <span class="text-sm font-semibold text-white tracking-tight" id="hdr-title">UI Review</span>
        <span class="text-[10px] text-zinc-500 ml-1.5" id="hdr-status"></span>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <span class="flex items-center gap-1.5 text-[10px] text-zinc-500"><span class="w-1.5 h-1.5 rounded-full bg-ok pulse-live" aria-hidden="true"></span><span aria-live="polite">Auto-refresh</span></span>
      <label for="session-picker" class="sr-only">Select session</label>
      <select id="session-picker" class="bg-surface-2 border border-border rounded-md px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-accent max-w-[300px]">
        <option value="">Loading...</option>
      </select>
      <button type="button" id="compare-btn" onclick="toggleCompare()" class="text-[11px] px-2.5 py-1 rounded-md border border-border text-zinc-400 hover:text-white hover:border-accent transition-colors" title="Pick two sessions and view their scores and screenshots side-by-side">Compare</button>
    </div>
  </header>

  <!-- Skip Links (screen-reader + keyboard users) -->
  <nav class="sr-only" aria-label="Skip to section" style="position:fixed;top:56px;left:0;z-index:100">
    <a href="#root" style="background:#4f46e5;color:#fff;padding:8px 16px;display:block" onfocus="this.parentElement.style.position='fixed';this.parentElement.classList.remove('sr-only')" onblur="this.parentElement.classList.add('sr-only')">Skip to main content</a>
  </nav>

  <!-- Agent Monitor (independent refresh cycle) -->
  <div id="agent-monitor" class="max-w-[960px] mx-auto px-5 pt-6" aria-label="Parallel agent monitor" role="region"></div>

  <!-- All content rendered here -->
  <main id="root" class="max-w-[960px] mx-auto px-5 pb-20">
    <div class="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <div class="skeleton" style="height:120px"></div>
      <div class="skeleton" style="height:14px;width:180px;margin-top:24px;border-radius:4px"></div>
      <div class="skeleton" style="height:80px"></div>
      <div class="skeleton" style="height:80px"></div>
    </div>
  </main>

  <script>
  let SID = null;
  let _t = null;
  let _allSessions = [];
  let _compareMode = false;
  let _lastDataHash = '';
  let _agentHash = '';
  let _agentTimer = null;
  let _failCount = 0;
  let _backoff = 5000;
  // Persistent gallery state (survives auto-refresh re-renders)
  let _activeCat = 'all';
  let _gridSize = 'md';
  let _expandedGroups = new Set();
  let _searchQuery = '';
  const $ = id => document.getElementById(id);

  async function init() {
    const res = await fetch('/api/sessions');
    _allSessions = await res.json();
    const pk = $('session-picker');
    pk.innerHTML = _allSessions.map(s => {
      const bugs = s.bug_count||0, fixed = s.bugs_resolved||0;
      const tag = bugs===0 ? 'Clean' : fixed>=bugs ? bugs+' fixed' : bugs+' bugs';
      return '<option value="'+esc(s.id)+'">'+esc(s.app_name||'Session')+' '+esc(s.created_at.slice(5,16))+' ['+tag+']</option>';
    }).join('');
    if (_allSessions.length) { SID = _allSessions[0].id; pk.value = SID; }
    pk.onchange = e => { SID = e.target.value; if(!_compareMode) load(); };
    load();
    loadAgents();
    _t = setInterval(() => { if(!_compareMode) load(); }, 5000);
    _agentTimer = setInterval(() => { loadAgents(); }, 2500);
  }

  function toggleCompare() {
    _compareMode = !_compareMode;
    const btn = $('compare-btn');
    btn.textContent = _compareMode ? 'Exit Compare' : 'Compare';
    btn.style.borderColor = _compareMode ? '#6366f1' : '';
    btn.style.color = _compareMode ? '#fff' : '';
    if (_compareMode) {
      renderCompareMode();
    } else {
      _lastDataHash = '';
      load();
    }
  }

  async function renderCompareMode() {
    const opts = _allSessions.map(s =>
      '<option value="'+esc(s.id)+'">'+esc(s.app_name||'Review')+' \\u2014 '+esc(s.created_at.slice(5,16))+'</option>'
    ).join('');
    const parts = [];
    parts.push('<div class="fade-up">');
    parts.push('<h2 class="text-lg font-bold text-white mb-4">Session Comparison</h2>');
    parts.push('<div class="compare-bar">');
    parts.push('<label for="cmp-left" class="text-[11px] text-zinc-400 font-semibold uppercase">Left</label>');
    parts.push('<select id="cmp-left" class="flex-1" onchange="loadCompare()">'+opts+'</select>');
    parts.push('<span class="text-[11px] text-zinc-400" aria-hidden="true">vs</span>');
    parts.push('<label for="cmp-right" class="text-[11px] text-zinc-400 font-semibold uppercase">Right</label>');
    parts.push('<select id="cmp-right" class="flex-1" onchange="loadCompare()">'+opts+'</select>');
    parts.push('</div>');
    parts.push('<div id="cmp-content"><p class="text-zinc-500 text-sm py-10 text-center">Select two sessions to compare</p></div>');
    parts.push('</div>');
    $('root').innerHTML = parts.join('');
    if (_allSessions.length >= 2) {
      $('cmp-left').value = _allSessions[1].id;
      $('cmp-right').value = _allSessions[0].id;
      loadCompare();
    }
  }

  async function loadCompare() {
    const leftId = $('cmp-left').value;
    const rightId = $('cmp-right').value;
    if (!leftId || !rightId) return;
    const [lShots, rShots, lOv, rOv] = await Promise.all([
      fetch('/api/session/'+leftId+'/screenshots').then(r=>r.json()),
      fetch('/api/session/'+rightId+'/screenshots').then(r=>r.json()),
      fetch('/api/session/'+leftId+'/overview').then(r=>r.json()),
      fetch('/api/session/'+rightId+'/overview').then(r=>r.json()),
    ]);
    const parts = [];
    const lRev = lOv.latestReview, rRev = rOv.latestReview;
    const lScore = lRev?(lRev.score??0):null, rScore = rRev?(rRev.score??0):null;
    const gradeOf = s => s===null?'\\u2014':s>=90?'A':s>=80?'B':s>=70?'C':s>=60?'D':'F';
    parts.push('<div class="compare-grid mb-6">');
    parts.push('<div class="ring-glow rounded-lg p-4 bg-surface-1 text-center"><div class="text-[10px] text-zinc-500 uppercase mb-1">Score</div><div class="text-3xl font-bold '+(lScore>=80?'text-ok':lScore>=60?'text-warn':'text-err')+'">'+gradeOf(lScore)+'</div><div class="text-sm text-zinc-400">'+(lScore??'\\u2014')+'/100</div><div class="text-[10px] text-zinc-500 mt-1">'+lOv.stats.bugs+' bugs &middot; '+lOv.stats.components+' components</div></div>');
    parts.push('<div class="ring-glow rounded-lg p-4 bg-surface-1 text-center"><div class="text-[10px] text-zinc-500 uppercase mb-1">Score</div><div class="text-3xl font-bold '+(rScore>=80?'text-ok':rScore>=60?'text-warn':'text-err')+'">'+gradeOf(rScore)+'</div><div class="text-sm text-zinc-400">'+(rScore??'\\u2014')+'/100</div><div class="text-[10px] text-zinc-500 mt-1">'+rOv.stats.bugs+' bugs &middot; '+rOv.stats.components+' components</div></div>');
    parts.push('</div>');
    const routeMap = {};
    lShots.forEach(s => { const r = s.route||s.label; if(!routeMap[r]) routeMap[r]={left:null,right:null}; routeMap[r].left = s; });
    rShots.forEach(s => { const r = s.route||s.label; if(!routeMap[r]) routeMap[r]={left:null,right:null}; routeMap[r].right = s; });
    const routes = Object.keys(routeMap);
    if (routes.length === 0) {
      parts.push('<p class="text-zinc-500 text-sm py-8 text-center">No screenshots to compare. Capture some screenshots during your review sessions first.</p>');
    } else {
      parts.push('<div class="space-y-4">');
      routes.forEach(r => {
        const pair = routeMap[r];
        parts.push('<div class="fade-up"><div class="text-[11px] text-zinc-400 font-medium mb-1.5 font-mono">'+esc(r)+'</div>');
        parts.push('<div class="compare-grid">');
        if (pair.left) {
          const src = pair.left.base64_thumbnail ? 'data:image/png;base64,'+pair.left.base64_thumbnail : '/api/screenshot/'+encodeURIComponent(pair.left.id)+'/image';
          parts.push('<div class="compare-col"><img src="'+src+'" alt="Left: '+esc(r)+'" loading="lazy" style="cursor:pointer" data-lb-src="'+esc(src)+'" data-lb-label="Left: '+esc(r)+'"></div>');
        } else {
          parts.push('<div class="compare-col" style="display:flex;align-items:center;justify-content:center;min-height:120px;color:#71717a;font-size:11px">No screenshot</div>');
        }
        if (pair.right) {
          const src = pair.right.base64_thumbnail ? 'data:image/png;base64,'+pair.right.base64_thumbnail : '/api/screenshot/'+encodeURIComponent(pair.right.id)+'/image';
          parts.push('<div class="compare-col"><img src="'+src+'" alt="Right: '+esc(r)+'" loading="lazy" style="cursor:pointer" data-lb-src="'+esc(src)+'" data-lb-label="Right: '+esc(r)+'"></div>');
        } else {
          parts.push('<div class="compare-col" style="display:flex;align-items:center;justify-content:center;min-height:120px;color:#71717a;font-size:11px">No screenshot</div>');
        }
        parts.push('</div></div>');
      });
      parts.push('</div>');
    }
    $('cmp-content').innerHTML = parts.join('');
  }

  function simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return h.toString(36);
  }

  async function load() {
    if (!SID) return;
    try {
      const [ov, bugs, fixes, comps, locs, logs, tests, revs, shots] = await Promise.all([
        fetch('/api/session/'+SID+'/overview').then(r=>r.json()),
        fetch('/api/session/'+SID+'/bugs').then(r=>r.json()),
        fetch('/api/session/'+SID+'/fixes').then(r=>r.json()),
        fetch('/api/session/'+SID+'/components').then(r=>r.json()),
        fetch('/api/session/'+SID+'/code-locations').then(r=>r.json()),
        fetch('/api/session/'+SID+'/changelogs').then(r=>r.json()),
        fetch('/api/session/'+SID+'/tests').then(r=>r.json()),
        fetch('/api/session/'+SID+'/reviews').then(r=>r.json()),
        fetch('/api/session/'+SID+'/screenshots').then(r=>r.json()),
      ]);
      // Skip re-render if data unchanged
      const hash = simpleHash(JSON.stringify([ov,bugs,fixes,comps,locs,logs,tests,revs,shots?.length]));
      if (hash === _lastDataHash) return;
      _lastDataHash = hash;
      render(ov, bugs, fixes, comps, locs, logs, tests, revs, shots);
      _failCount = 0;
      _backoff = 5000;
      updateRefreshIndicator('ok');
    } catch(e) {
      _failCount++;
      updateRefreshIndicator('fail');
      if (_failCount <= 1) {
        $('root').innerHTML = '<div style="text-align:center;padding:40px 16px"><div style="font-size:32px;margin-bottom:12px;opacity:.6">&#9888;</div><div class="text-zinc-300 text-sm font-medium mb-2">Connection error</div><div class="text-zinc-500 text-xs mb-4">'+esc(e.message)+'</div><button type="button" onclick="_lastDataHash=\\'\\';load()" class="text-[11px] px-3 py-1.5 rounded-md border border-accent text-accent hover:bg-accent/10" style="cursor:pointer">Retry now</button></div>';
      }
      // Exponential backoff: 5s → 7.5s → 11.25s → ... → max 30s
      _backoff = Math.min(30000, _backoff * 1.5);
    }
  }

  function updateRefreshIndicator(status) {
    const dot = document.querySelector('.pulse-live');
    const label = document.querySelector('[aria-live="polite"]');
    if (!dot || !label) return;
    if (status === 'fail') {
      dot.style.background = '#fbbf24';
      label.textContent = 'Retrying in '+Math.round(_backoff/1000)+'s';
    } else {
      dot.style.background = '';
      label.textContent = 'Auto-refresh';
    }
  }

  // ── Agent Monitor ──────────────────────────────────────────────

  function timeSince(iso) {
    const diff = Math.floor((Date.now() - new Date(iso+'Z').getTime()) / 1000);
    if (diff < 0) return 'now';
    if (diff < 60) return diff + 's';
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    return Math.floor(diff / 86400) + 'd';
  }

  async function loadAgents() {
    try {
      const [status, activity, mail] = await Promise.all([
        fetch('/api/agents/status').then(r => r.json()),
        fetch('/api/agents/activity').then(r => r.json()),
        fetch('/api/agents/mailbox').then(r => r.json()),
      ]);
      const hash = simpleHash(JSON.stringify([status, activity, mail]));
      if (hash === _agentHash) return;
      _agentHash = hash;
      const el = $('agent-monitor');
      if (el) el.innerHTML = renderAgentMonitor(status, activity, mail);
    } catch(e) {
      // Agent endpoints may not have data yet — silently ignore
    }
  }

  function renderAgentMonitor(status, activity, mail) {
    const h = [];
    const agents = status.agents || [];
    const calls = (activity.calls || []).slice(0, 20);
    const msgs = mail.messages || [];
    const hasContent = agents.length > 0 || calls.length > 0;

    if (!hasContent) {
      h.push('<div class="fade-up ring-glow rounded-xl bg-surface-1 p-5 mb-6">');
      h.push('<div style="text-align:center;padding:12px 0">');
      h.push('<div style="font-size:28px;opacity:.25;filter:grayscale(1);margin-bottom:8px" aria-hidden="true">&#129302;</div>');
      h.push('<div class="text-zinc-500 text-sm font-medium">No parallel agents active</div>');
      h.push('<div class="text-zinc-600 text-xs mt-1">Start a multi-agent session to see live activity here.</div>');
      h.push('</div></div>');
      return h.join('');
    }

    // ── Swim Lanes ──────────────────────────────────────
    if (agents.length > 0) {
      h.push('<div class="fade-up mb-5">');
      h.push('<div class="flex items-center gap-2.5 mb-3">');
      h.push('<div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:var(--gradient-accent)">');
      h.push('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#c7d2fe"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>');
      h.push('</div>');
      h.push('<div><div class="text-sm font-semibold text-white">Parallel Agents</div>');
      h.push('<div class="text-[11px] text-zinc-500">'+agents.length+' agent'+(agents.length!==1?'s':'')+' working</div></div>');
      h.push('</div>');

      agents.forEach(function(ag, idx) {
        var pct = ag.tokenBudget.percent;
        var budgetClr = pct >= 80 ? '#f87171' : pct >= 60 ? '#fbbf24' : '#34d399';
        var isStale = ag.lastCallAt && (Date.now() - new Date(ag.lastCallAt+'Z').getTime()) > 7200000;

        h.push('<div class="agent-lane ring-glow rounded-lg bg-surface-1 p-4 mb-2 fade-up" style="animation-delay:'+(idx*50)+'ms">');

        // Header
        h.push('<div class="flex items-center justify-between mb-2">');
        h.push('<div class="flex items-center gap-2">');
        if (isStale) {
          h.push('<span class="w-2 h-2 rounded-full" style="background:#fbbf24" title="No activity for 2+ hours" aria-label="Stale agent"></span>');
        } else {
          h.push('<span class="w-2 h-2 rounded-full pulse-agent" style="background:#34d399" aria-label="Active agent"></span>');
        }
        h.push('<span class="text-sm font-semibold text-white">'+esc(ag.role)+'</span>');
        if (ag.focusArea) h.push('<span class="text-xs text-zinc-500"> &middot; '+esc(ag.focusArea)+'</span>');
        h.push('</div>');
        h.push('<span class="text-[10px] text-zinc-600 font-mono">'+esc(ag.sessionId.slice(-8))+'</span>');
        h.push('</div>');

        // Task
        if (ag.currentTask) {
          h.push('<div class="flex items-start gap-2 mb-2">');
          h.push('<span class="text-[10px] px-1.5 py-0.5 rounded font-medium" style="background:rgba(99,102,241,.12);color:#a5b4fc">Task</span>');
          h.push('<div class="flex-1 min-w-0">');
          h.push('<div class="text-xs text-zinc-300 font-medium">'+esc(ag.currentTask.key)+'</div>');
          if (ag.currentTask.description) h.push('<div class="text-[11px] text-zinc-500 mt-0.5">'+esc(ag.currentTask.description)+'</div>');
          h.push('</div>');
          h.push('<span class="text-[10px] text-zinc-500 shrink-0">'+timeSince(ag.currentTask.claimedAt)+'</span>');
          h.push('</div>');
        }

        // Stats row
        h.push('<div class="flex items-center gap-4 text-[11px] text-zinc-400 mb-2">');
        h.push('<span title="Tool calls in last 30 minutes">'+ag.toolCallCount+' calls</span>');
        h.push('<span title="Context budget usage" style="color:'+budgetClr+'">'+pct+'% budget</span>');
        if (ag.unreadMessages > 0) h.push('<span style="color:#818cf8" title="Unread messages">'+ag.unreadMessages+' msg</span>');
        h.push('</div>');

        // Budget bar
        h.push('<div class="agent-budget-bar"><div class="agent-budget-fill" style="width:'+Math.min(pct,100)+'%;background:'+budgetClr+'"></div></div>');

        h.push('</div>');
      });

      h.push('</div>');
    }

    // ── Activity Feed ───────────────────────────────────
    if (calls.length > 0) {
      h.push('<div class="fade-up mb-5">');
      h.push('<div class="flex items-center gap-2.5 mb-3">');
      h.push('<div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:#1e1b4b">');
      h.push('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>');
      h.push('</div>');
      h.push('<div><div class="text-sm font-semibold text-white">Recent Activity</div>');
      h.push('<div class="text-[11px] text-zinc-500">'+(activity.totalCalls||calls.length)+' total calls</div></div>');
      h.push('</div>');

      h.push('<div class="ring-glow rounded-lg bg-surface-1 activity-feed" role="log" aria-label="Recent tool call activity">');
      calls.forEach(function(c) {
        var elapsed = timeSince(c.created_at);
        var icon = c.result_status === 'success'
          ? '<span style="color:#34d399" aria-label="Success">&#10003;</span>'
          : '<span style="color:#f87171" aria-label="Error">&#10007;</span>';
        var dur = c.duration_ms >= 1000 ? (c.duration_ms/1000).toFixed(1)+'s' : c.duration_ms+'ms';

        h.push('<div class="flex items-center gap-2.5 px-4 py-2 text-xs" style="border-bottom:1px solid rgba(39,39,42,.4)">');
        h.push('<span class="text-zinc-600 font-mono text-[10px] w-10 text-right shrink-0">'+elapsed+'</span>');
        h.push('<span class="text-zinc-600 font-mono text-[10px] w-12 shrink-0">'+esc(c.session_id.slice(-6))+'</span>');
        h.push('<span class="font-mono flex-1 min-w-0 truncate" style="color:#a5b4fc">'+esc(c.tool_name)+'</span>');
        h.push('<span class="text-zinc-500 text-[10px] shrink-0">'+dur+'</span>');
        h.push(icon);
        h.push('</div>');
      });
      h.push('</div></div>');
    }

    // ── Mailbox ─────────────────────────────────────────
    if (msgs.length > 0) {
      h.push('<div class="fade-up mb-5">');
      h.push('<div class="flex items-center gap-2.5 mb-3">');
      h.push('<div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:#7c2d12">');
      h.push('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fdba74" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>');
      h.push('</div>');
      h.push('<div><div class="text-sm font-semibold text-white">Agent Messages</div>');
      h.push('<div class="text-[11px] text-zinc-500">'+msgs.length+' unread</div></div>');
      h.push('</div>');

      msgs.forEach(function(m) {
        h.push('<div class="ring-glow rounded-lg bg-surface-1 p-4 mb-2 fade-up">');
        h.push('<div class="flex items-center gap-2 mb-1.5">');
        if (m.priority === 'critical') h.push('<span class="sev-critical text-[10px] px-1.5 py-0.5 rounded font-medium">CRITICAL</span>');
        else if (m.priority === 'high') h.push('<span class="sev-high text-[10px] px-1.5 py-0.5 rounded font-medium">HIGH</span>');
        h.push('<span class="text-[10px] px-1.5 py-0.5 rounded font-medium" style="background:var(--surface-2);color:#a1a1aa">'+esc(m.category)+'</span>');
        h.push('<span class="text-[10px] text-zinc-600 font-mono">from '+esc(m.sender_id.slice(-8))+'</span>');
        h.push('</div>');
        h.push('<div class="text-[13px] font-medium text-white mb-1">'+esc(m.subject)+'</div>');
        var body = m.body.length > 200 ? m.body.slice(0,200)+'\\u2026' : m.body;
        h.push('<div class="text-xs text-zinc-400 leading-relaxed">'+esc(body)+'</div>');
        h.push('</div>');
      });

      h.push('</div>');
    }

    return h.join('');
  }

  function render(ov, bugs, fixes, comps, locs, logs, tests, revs, shots) {
    const s = ov.stats, sess = ov.session;
    $('hdr-title').textContent = sess.app_name || 'UI Review';
    $('hdr-status').textContent = sess.status === 'completed' ? 'Completed' : 'In Progress';
    const ssMap = {};
    (shots||[]).forEach(ss => { ssMap[ss.id] = ss; });

    const h = [];
    const hasBugs = bugs.length > 0 || fixes.length > 0;
    const hasReview = revs.length > 0;

    // ── Hero Card ─────────────────────────────────────────────
    const rev = ov.latestReview;
    const score = rev ? (rev.score??0) : null;
    const grade = score!==null ? (score>=90?'A':score>=80?'B':score>=70?'C':score>=60?'D':'F') : '?';
    const gradeClr = score===null?'text-zinc-500':score>=80?'text-ok':score>=60?'text-warn':'text-err';
    const pct = score!==null ? score/100 : 0;
    const circ = 2 * Math.PI * 28;
    const dashOff = circ - (circ * pct);

    h.push('<div class="fade-up ring-glow rounded-xl bg-surface-1 p-5 mb-6">');
    h.push('<div class="flex items-start gap-5">');
    h.push('<div class="relative shrink-0" title="'+(score!==null?'Quality score: '+score+'/100':'No review yet. Run a quality review to get a score.')+'">');
    h.push('<svg class="score-ring" viewBox="0 0 64 64" role="img" aria-label="Quality score: '+(score!==null?score+'%':'not rated')+'"><circle class="bg" cx="32" cy="32" r="28"/>');
    if(score!==null) h.push('<circle class="fg" cx="32" cy="32" r="28" stroke="'+(score>=80?'#34d399':score>=60?'#fbbf24':'#f87171')+'" stroke-dasharray="'+circ.toFixed(1)+'" stroke-dashoffset="'+dashOff.toFixed(1)+'" transform="rotate(-90 32 32)"/>');
    h.push('</svg>');
    h.push('<div class="absolute inset-0 flex items-center justify-center"><span class="text-lg font-bold '+gradeClr+'" aria-hidden="true">'+grade+'</span></div>');
    h.push('</div>');
    h.push('<div class="flex-1 min-w-0">');
    h.push('<div class="text-sm font-semibold text-white mb-1">'+esc(sess.app_name||'UI Review Session')+'</div>');
    h.push('<div class="text-[11px] text-zinc-500 mb-3">'+esc(sess.app_url||'')+(sess.created_at?' &middot; Started '+esc(sess.created_at.slice(0,16)):'')+'</div>');
    h.push('<div class="flex flex-wrap gap-1.5">');
    if(s.bugs>0) h.push('<span class="text-[11px] px-2 py-0.5 rounded-full '+(s.bugsOpen>0?'bg-red-950/50 text-red-300':'bg-emerald-950/50 text-emerald-300')+'">'+s.bugs+' bug'+(s.bugs!==1?'s':'')+((s.bugsResolved>0)?' &middot; '+s.bugsResolved+' fixed':'')+'</span>');
    if(s.fixes>0) h.push('<span class="text-[11px] px-2 py-0.5 rounded-full bg-blue-950/50 text-blue-300">'+s.fixes+' fix'+(s.fixes!==1?'es':'')+'</span>');
    h.push('<span class="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800/60 text-zinc-400">'+s.components+' component'+(s.components!==1?'s':'')+'</span>');
    if(s.codeLocations>0) h.push('<span class="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800/60 text-zinc-400">'+s.codeLocations+' file'+(s.codeLocations!==1?'s':'')+' reviewed</span>');
    if(s.generatedTests>0) h.push('<span class="text-[11px] px-2 py-0.5 rounded-full bg-violet-950/50 text-violet-300">'+s.generatedTests+' test'+(s.generatedTests!==1?'s':'')+'</span>');
    if(s.codeReviews>0) h.push('<span class="text-[11px] px-2 py-0.5 rounded-full bg-violet-950/50 text-violet-300">'+s.codeReviews+' review'+(s.codeReviews!==1?'s':'')+'</span>');
    h.push('</div>');
    h.push('</div></div>');

    if (!hasBugs && !hasReview && logs.length===0 && (!shots||shots.length===0)) {
      h.push('<div class="empty-state mt-4 mb-2"><div class="text-zinc-400 text-sm font-medium mb-2">Looking good so far</div>');
      h.push('<div class="empty-hint text-zinc-500">No bugs found and no review yet. Try testing interactions, logging any issues you find, or running a quality review to get a score.</div></div>');
    }
    h.push('</div>');

    // ── Bugs & Fixes ──────────────────────────────────────────
    if (hasBugs) {
      h.push(sec('Bugs & Fixes', 'Found '+bugs.length+' issue'+(bugs.length!==1?'s':'')+', applied '+fixes.length+' fix'+(fixes.length!==1?'es':'')));
      bugs.forEach(b => {
        const fix = fixes.find(f => f.bug_id === b.id);
        h.push('<div class="ring-glow rounded-lg p-4 mb-2.5 bg-surface-1 fade-up">');
        h.push('<div class="flex items-center gap-2 flex-wrap">' + sevBadge(b.severity) + statusBadge(b.status) +
             '<span class="text-[13px] font-medium text-white leading-snug">'+esc(b.title)+'</span></div>');
        if (b.description) h.push('<p class="text-xs text-zinc-400 mt-2 leading-relaxed">'+esc(b.description)+'</p>');
        if (b.expected||b.actual) {
          h.push('<div class="mt-2.5 grid grid-cols-2 gap-3 text-[11px]">');
          if(b.expected) h.push('<div class="rounded-md bg-surface-0 p-2.5 border border-border"><span class="text-ok font-semibold text-[10px] uppercase tracking-wide">Expected</span><div class="text-zinc-400 mt-1 leading-relaxed">'+esc(b.expected)+'</div></div>');
          if(b.actual) h.push('<div class="rounded-md bg-surface-0 p-2.5 border border-border"><span class="text-err font-semibold text-[10px] uppercase tracking-wide">Actual</span><div class="text-zinc-400 mt-1 leading-relaxed">'+esc(b.actual)+'</div></div>');
          h.push('</div>');
        }
        if (fix) {
          h.push('<div class="mt-3 border-t border-border pt-3">');
          h.push('<div class="flex items-center gap-2 mb-1.5">' +
               (fix.verified?'<span class="text-[10px] px-1.5 py-0.5 rounded bg-ok/10 text-ok font-medium">Verified Fix</span>':
                             '<span class="text-[10px] px-1.5 py-0.5 rounded bg-warn/10 text-warn font-medium">Pending Fix</span>') + '</div>');
          h.push('<p class="text-xs text-zinc-400 leading-relaxed">'+esc(fix.fix_description)+'</p>');
          if (fix.files_changed) h.push('<div class="mt-1.5 flex flex-wrap">'+fileChips(fix.files_changed)+'</div>');
          if (fix.verification_notes) h.push('<div class="mt-1.5 text-[11px] text-zinc-500 italic leading-relaxed">'+esc(fix.verification_notes)+'</div>');
          h.push('</div>');
        }
        h.push('</div>');
      });
      const bugIds = new Set(bugs.map(b=>b.id));
      fixes.filter(f=>!bugIds.has(f.bug_id)).forEach(f => {
        h.push('<div class="ring-glow rounded-lg p-4 mb-2.5 bg-surface-1 fade-up">');
        h.push('<div class="flex items-center gap-2">' + sevBadge(f.bug_severity||'medium') +
             (f.verified?'<span class="text-[10px] px-1.5 py-0.5 rounded bg-ok/10 text-ok font-medium">Verified</span>':
                         '<span class="text-[10px] px-1.5 py-0.5 rounded bg-warn/10 text-warn font-medium">Pending</span>') +
             '<span class="text-[13px] font-medium text-white">'+esc(f.bug_title||f.bug_id)+'</span></div>');
        h.push('<p class="text-xs text-zinc-400 mt-2">'+esc(f.fix_description)+'</p>');
        if (f.files_changed) h.push('<div class="mt-1.5 flex flex-wrap">'+fileChips(f.files_changed)+'</div>');
        h.push('</div>');
      });
    }

    // ── Code Review (only unique findings, not duplicating bugs) ─
    if (hasReview) {
      const r = revs[0];
      const sc = r.score??0;
      const gr = sc>=90?'A':sc>=80?'B':sc>=70?'C':sc>=60?'D':'F';
      let sev = {};
      try { sev = typeof r.severity_counts==='string'?JSON.parse(r.severity_counts):(r.severity_counts||{}); } catch{}
      let findings = [];
      try { findings = typeof r.findings==='string'?JSON.parse(r.findings):(r.findings||[]); } catch{}
      const bugTitles = new Set(bugs.map(b=>(b.title||'').toLowerCase().trim()));
      const uniqueFindings = findings.filter(f => !bugTitles.has((f.title||'').toLowerCase().trim()));

      h.push(sec('Code Review', sc+'/100 quality score'+(uniqueFindings.length>0?' &middot; '+uniqueFindings.length+' additional finding'+(uniqueFindings.length!==1?'s':''):'')));
      h.push('<div class="ring-glow rounded-lg bg-surface-1 p-5 fade-up">');
      h.push('<div class="flex items-center justify-between">');
      h.push('<div class="flex items-center gap-3"><span class="text-2xl font-bold '+(sc>=80?'text-ok':sc>=60?'text-warn':'text-err')+'">'+gr+'</span>');
      h.push('<div><div class="text-sm font-semibold text-white">'+sc+'/100</div><div class="text-[11px] text-zinc-500">Overall quality</div></div></div>');
      h.push('<div class="flex gap-4 text-center text-[11px]">');
      ['critical','high','medium','low'].forEach(sv => {
        const v = sev[sv]||0;
        if(v===0) return;
        const c = {critical:'text-err',high:'text-warn',medium:'text-accent',low:'text-ok'}[sv];
        h.push('<div><div class="text-base font-bold '+c+'">'+v+'</div><div class="text-zinc-500 capitalize">'+sv+'</div></div>');
      });
      if(!sev.critical && !sev.high && !sev.medium && !sev.low) h.push('<div class="text-[11px] text-zinc-500">No findings</div>');
      h.push('</div></div>');
      if (uniqueFindings.length) {
        h.push('<div class="space-y-2 mt-4">');
        uniqueFindings.forEach(f => {
          h.push('<div class="flex items-start gap-2.5 text-xs">');
          h.push(sevBadge(f.severity));
          h.push('<div class="flex-1 min-w-0">');
          h.push('<div class="font-medium text-zinc-200">'+esc(f.title)+'</div>');
          h.push('<div class="text-zinc-500 mt-0.5 leading-relaxed">'+truncWords(esc(f.description),200)+'</div>');
          if (f.codeFile) h.push('<span class="file-chip mt-1">'+esc(shortPath(f.codeFile))+(f.codeLine?' '+esc(f.codeLine):'')+'</span>');
          h.push('</div>');
          h.push(statusBadge(f.status));
          h.push('</div>');
        });
        h.push('</div>');
      }
      h.push('</div>');
    }

    // ── Changelog (Carousel) — shown BEFORE screenshots ──────
    if (logs.length) {
      function nearestShot(changeTs) {
        if (!shots || !shots.length || !changeTs) return null;
        let best = null, bestDiff = Infinity;
        const ct = new Date(changeTs).getTime();
        if (isNaN(ct)) return null;
        shots.forEach(ss => {
          const st = new Date(ss.created_at).getTime();
          if (isNaN(st)) return;
          const diff = Math.abs(ct - st);
          if (diff < bestDiff) { bestDiff = diff; best = ss; }
        });
        return best;
      }

      h.push(sec('Changelog', logs.length+' change'+(logs.length!==1?'s':'')+' during this session'));
      h.push('<div class="cl-carousel fade-up" id="cl-carousel" role="region" aria-label="Changelog carousel" tabindex="0">');
      if (logs.length > 1) {
        h.push('<button type="button" class="cl-nav-btn prev disabled" id="cl-prev" onclick="clNav(-1)" aria-label="Previous change"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>');
        h.push('<button type="button" class="cl-nav-btn next" id="cl-next" onclick="clNav(1)" aria-label="Next change"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg></button>');
      }
      h.push('<div class="cl-track" id="cl-track">');
      logs.forEach((c, idx) => {
        h.push('<div class="cl-card" role="group" aria-label="Change '+(idx+1)+' of '+logs.length+'">');
        h.push('<div class="flex items-center gap-3">');
        h.push('<span class="cl-step" aria-hidden="true">'+(idx+1)+'</span>');
        h.push('<span class="cl-time">'+esc(c.created_at)+'</span>');
        h.push('</div>');
        h.push('<div class="cl-desc">'+truncWords(esc(c.description), 280)+'</div>');
        if (c.files_changed) h.push('<div class="cl-files">'+fileChips(c.files_changed)+'</div>');
        const bef = c.before_screenshot_id ? ssMap[c.before_screenshot_id] : null;
        const aft = c.after_screenshot_id ? ssMap[c.after_screenshot_id] : null;
        if (bef || aft) {
          h.push('<div class="compare-grid mt-1">');
          if (bef) {
            const bSrc = bef.base64_thumbnail ? 'data:image/png;base64,'+bef.base64_thumbnail : '/api/screenshot/'+encodeURIComponent(bef.id)+'/image';
            h.push('<div class="compare-col"><div class="ch">Before</div><img src="'+bSrc+'" alt="Before state" loading="lazy" data-lb-src="'+esc(bSrc)+'" data-lb-label="Before" style="cursor:pointer"></div>');
          }
          if (aft) {
            const aSrc = aft.base64_thumbnail ? 'data:image/png;base64,'+aft.base64_thumbnail : '/api/screenshot/'+encodeURIComponent(aft.id)+'/image';
            h.push('<div class="compare-col"><div class="ch">After</div><img src="'+aSrc+'" alt="After state" loading="lazy" data-lb-src="'+esc(aSrc)+'" data-lb-label="After" style="cursor:pointer"></div>');
          }
          h.push('</div>');
        } else {
          const nearest = nearestShot(c.created_at);
          if (nearest) {
            const nSrc = nearest.base64_thumbnail ? 'data:image/png;base64,'+nearest.base64_thumbnail : '/api/screenshot/'+encodeURIComponent(nearest.id)+'/image';
            h.push('<div class="mt-2 rounded-lg overflow-hidden border border-zinc-800">');
            h.push('<div class="text-[10px] text-zinc-500 px-3 py-1.5 bg-zinc-900/50 flex items-center gap-1.5">');
            h.push('<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"/></svg>');
            h.push('Nearest capture: '+esc(nearest.label||'screenshot')+'</div>');
            h.push('<img src="'+nSrc+'" alt="'+esc(nearest.label||'Nearest screenshot')+'" loading="lazy" style="width:100%;display:block;max-height:200px;object-fit:cover;cursor:pointer" data-lb-src="'+esc(nSrc)+'" data-lb-label="'+esc(nearest.label||'')+'">');
            h.push('</div>');
          }
        }
        h.push('</div>');
      });
      h.push('</div>');
      if (logs.length > 1) {
        h.push('<div class="cl-dots" id="cl-dots" role="tablist" aria-label="Changelog navigation">');
        logs.forEach((_, idx) => {
          h.push('<button type="button" class="cl-dot'+(idx===0?' active':'')+'" data-idx="'+idx+'" onclick="clGoTo('+idx+')" role="tab" aria-selected="'+(idx===0?'true':'false')+'" aria-label="Go to change '+(idx+1)+'"></button>');
        });
        h.push('</div>');
      }
      h.push('</div>');
    }

    // ── Screenshots Gallery (interactive) ────────────────────
    if (shots && shots.length) {
      window._ssAll = shots.map(ss => ({
        src: ss.base64_thumbnail ? 'data:image/png;base64,'+ss.base64_thumbnail : '/api/screenshot/'+encodeURIComponent(ss.id)+'/image',
        label: ss.label||'screenshot',
        route: ss.route||'',
        time: ss.created_at?.slice(5,16)||'',
      }));
      // Raw shot data for deferred card rendering on expand
      window._ssRaw = shots.map((ss, idx) => ({ ...ss, _idx: idx }));

      // Priority-scored category detection
      const catMap = {};
      shots.forEach((ss, idx) => {
        const lbl = ss.label||'screenshot';
        const cat = classifyScreenshot(lbl);
        if (!catMap[cat]) catMap[cat] = [];
        catMap[cat].push({ ...ss, _idx: idx });
      });
      const MIN_CAT_SIZE = 3;
      const tinyKeys = Object.keys(catMap).filter(k => catMap[k].length < MIN_CAT_SIZE && k !== 'General');
      if (tinyKeys.length > 1) {
        if (!catMap['Other']) catMap['Other'] = [];
        tinyKeys.forEach(k => { catMap['Other'].push(...catMap[k]); delete catMap[k]; });
      }
      const cats = Object.keys(catMap).sort((a,b) => catMap[b].length - catMap[a].length);

      h.push(sec('Screenshots', shots.length+' captured image'+(shots.length!==1?'s':'')));

      h.push('<div class="ss-toolbar" role="toolbar" aria-label="Screenshot controls">');
      h.push('<div class="ss-search-wrap"><svg class="ss-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><label for="ss-search" class="sr-only">Filter screenshots</label><input type="text" class="ss-search" id="ss-search" placeholder="Filter screenshots..." oninput="filterScreenshots()"></div>');
      h.push('<div class="flex-1"></div>');
      h.push('<button type="button" class="sz-btn" data-sz="sm" onclick="setGridSize(&#39;sm&#39;)" aria-label="Compact grid" aria-pressed="false"><svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg></button>');
      h.push('<button type="button" class="sz-btn" data-sz="md" onclick="setGridSize(&#39;md&#39;)" aria-label="Medium grid" aria-pressed="true"><svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6.5" height="6.5" rx="1.5"/><rect x="8.5" y="1" width="6.5" height="6.5" rx="1.5"/><rect x="1" y="8.5" width="6.5" height="6.5" rx="1.5"/><rect x="8.5" y="8.5" width="6.5" height="6.5" rx="1.5"/></svg></button>');
      h.push('<button type="button" class="sz-btn" data-sz="lg" onclick="setGridSize(&#39;lg&#39;)" aria-label="Large grid" aria-pressed="false"><svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="14" height="6.5" rx="1.5"/><rect x="1" y="8.5" width="14" height="6.5" rx="1.5"/></svg></button>');
      h.push('</div>');

      h.push('<div class="flex flex-wrap gap-1.5 mb-4" id="ss-cat-bar" role="toolbar" aria-label="Category filter">');
      h.push('<button type="button" class="cat-pill" data-cat="all" onclick="filterCat(&#39;all&#39;)" aria-pressed="true">All<span class="cat-count">'+shots.length+'</span></button>');
      cats.forEach(cat => {
        h.push('<button type="button" class="cat-pill" data-cat="'+esc(cat)+'" onclick="filterCat(&#39;'+esc(cat)+'&#39;)" aria-pressed="false">'+esc(cat)+'<span class="cat-count">'+catMap[cat].length+'</span></button>');
      });
      h.push('</div>');

      h.push('<div id="ss-gallery">');
      const INITIAL_SHOW = 8;
      cats.forEach(cat => {
        const items = catMap[cat];
        h.push('<div class="ss-group" data-cat="'+esc(cat)+'">');
        h.push('<div class="ss-group-hdr">'+esc(cat)+' <span class="g-count">('+items.length+')</span></div>');
        h.push('<div class="ss-grid sz-'+_gridSize+'">');
        // Render only visible cards; deferred cards rendered on expand
        const visibleCount = Math.min(items.length, INITIAL_SHOW);
        items.slice(0, visibleCount).forEach((ss, i) => {
          h.push(renderSsCard(ss));
        });
        h.push('</div>');
        if (items.length > INITIAL_SHOW) {
          h.push('<button type="button" class="ss-show-more" data-cat="'+esc(cat)+'" data-items=\\''+esc(JSON.stringify(items.slice(INITIAL_SHOW).map(x=>x._idx)))+'\\' onclick="toggleGroupExpand(this)">Show '+(items.length - INITIAL_SHOW)+' more</button>');
        }
        h.push('</div>');
      });
      h.push('</div>');
    }

    // ── Generated Tests ──────────────────────────────────────
    if (tests.length) {
      h.push(sec('Generated Tests', 'Tests created automatically from findings'));
      tests.forEach(t => {
        h.push('<div class="ring-glow rounded-lg p-4 mb-2 bg-surface-1 fade-up">');
        h.push('<div class="flex items-center gap-2">');
        h.push('<span class="text-[10px] px-1.5 py-0.5 rounded bg-ok/10 text-ok font-medium">'+esc(t.test_framework)+'</span>');
        h.push('<span class="text-xs text-white font-medium">'+esc(t.description||'Automated tests')+'</span></div>');
        if (t.test_file_path) h.push('<span class="file-chip mt-1.5">'+esc(shortPath(t.test_file_path))+'</span>');
        if (t.test_code) {
          h.push('<details class="mt-2"><summary class="text-[11px] text-accent cursor-pointer select-none">View source</summary>');
          h.push('<pre class="mt-1.5 text-[11px] bg-surface-0 rounded-md p-3 text-zinc-400 max-h-64 overflow-auto leading-relaxed border border-border">'+esc(t.test_code)+'</pre></details>');
        }
        h.push('</div>');
      });
    }

    // ── Components (grouped by type) ─────────────────────────
    if (comps.length) {
      h.push(sec('Components', s.components+' found in this application'));
      const groups = {};
      comps.forEach(c => {
        const t = c.component_type || 'other';
        if(!groups[t]) groups[t] = [];
        groups[t].push(c);
      });
      const typeOrder = ['page','sidebar','header','hero','section','card','list','form','modal','panel','popup','nav','table','other'];
      const sortedTypes = Object.keys(groups).sort((a,b) => {
        const ai = typeOrder.indexOf(a), bi = typeOrder.indexOf(b);
        return (ai===-1?99:ai) - (bi===-1?99:bi);
      });
      sortedTypes.forEach(type => {
        const items = groups[type];
        h.push('<div class="mb-4 fade-up">');
        h.push('<div class="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1.5">'+esc(type)+'s <span class="text-zinc-500 normal-case font-normal">('+items.length+')</span></div>');
        h.push('<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">');
        items.forEach(c => {
          const hasBugs = (c.bug_count||0) > 0;
          h.push('<div class="rounded-md px-3 py-2 bg-surface-1 border border-border hover:border-zinc-600 transition-colors'+(hasBugs?' border-l-2 border-l-err':'')+'">');
          h.push('<div class="text-xs font-medium text-zinc-200 truncate" title="'+esc(c.name)+'">'+esc(c.name)+'</div>');
          if (hasBugs) h.push('<div class="text-[10px] text-err mt-0.5">'+c.bug_count+' bug'+(c.bug_count>1?'s':'')+'</div>');
          h.push('</div>');
        });
        h.push('</div></div>');
      });
    }

    // ── Code Locations ───────────────────────────────────────
    if (locs.length) {
      h.push(sec('Files Reviewed', locs.length+' files visited during this session'));
      h.push('<details class="fade-up"><summary class="text-xs text-accent cursor-pointer select-none mb-2">Show '+locs.length+' files</summary>');
      h.push('<div class="space-y-1">');
      locs.forEach(l => {
        h.push('<div class="flex items-center gap-2 text-[11px] py-1.5 px-2.5 rounded bg-surface-1 border border-border">');
        h.push('<span class="file-chip" style="margin:0" title="'+esc(l.file_path)+'">'+esc(shortPath(l.file_path))+'</span>');
        if (l.line_start) h.push('<span class="text-zinc-500 text-[10px]">L'+l.line_start+(l.line_end&&l.line_end!==l.line_start?'-'+l.line_end:'')+'</span>');
        if (l.search_query) h.push('<span class="text-accent text-[10px] truncate max-w-[140px]" title="'+esc(l.search_query)+'">'+esc(l.search_query)+'</span>');
        h.push('</div>');
      });
      h.push('</div></details>');
    }

    $('root').innerHTML = h.join('');
    restoreGalleryState();
    initCarousel();
  }

  function renderSsCard(ss) {
    const src = ss.base64_thumbnail ? 'data:image/png;base64,'+ss.base64_thumbnail : '/api/screenshot/'+encodeURIComponent(ss.id)+'/image';
    const lbl = esc(ss.label||'screenshot');
    const rt = ss.route ? ' - '+esc(ss.route) : '';
    return '<div class="ss-card ring-glow fade-up" data-ss-idx="'+ss._idx+'" data-ss-label="'+lbl.toLowerCase()+'" tabindex="0" role="button" aria-label="View screenshot: '+lbl+'">' +
      '<img src="'+src+'" alt="'+lbl+'" loading="lazy" onerror="this.style.display=&#39;none&#39;;this.nextElementSibling.insertAdjacentHTML(&#39;afterbegin&#39;,&#39;<div style=\\&quot;padding:24px;text-align:center;color:#71717a;font-size:11px\\&quot;>Image unavailable</div>&#39;)">' +
      '<div class="ss-meta"><div class="text-[11px] text-zinc-300 truncate" title="'+lbl+'">'+lbl+'</div>' +
      '<div class="text-[10px] text-zinc-500">'+esc(ss.created_at?.slice(5,16)||'')+(rt?rt:'')+'</div>' +
      '</div></div>';
  }

  function restoreGalleryState() {
    if (_gridSize !== 'md') setGridSize(_gridSize);
    if (_activeCat !== 'all') filterCat(_activeCat);
    _expandedGroups.forEach(cat => {
      const btn = document.querySelector('.ss-show-more[data-cat="'+cat+'"]');
      if (btn) toggleGroupExpand(btn);
    });
    if (_searchQuery) {
      const el = document.getElementById('ss-search');
      if (el) { el.value = _searchQuery; filterScreenshots(); }
    }
  }

  // ── Slideshow Lightbox ──────────────────────────────────────
  let _lbIdx = 0;
  let _lbVisible = [];

  function buildLightbox() {
    let lb = document.getElementById('lightbox');
    if (lb) return lb;
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-label', 'Screenshot viewer');
    lb.innerHTML =
      '<button type="button" class="lb-nav prev" id="lb-prev" aria-label="Previous screenshot">&lsaquo;</button>' +
      '<img id="lb-img" src="" alt="Screenshot preview">' +
      '<button type="button" class="lb-nav next" id="lb-next" aria-label="Next screenshot">&rsaquo;</button>' +
      '<button type="button" class="lb-close" id="lb-close" aria-label="Close viewer">&times;</button>' +
      '<div class="lb-chrome"><span class="lb-label" id="lb-label"></span><span class="lb-counter" id="lb-counter"></span></div>';
    lb.addEventListener('click', e => {
      if (e.target === lb) closeLightbox();
    });
    lb.querySelector('#lb-close').onclick = closeLightbox;
    lb.querySelector('#lb-prev').onclick = e => { e.stopPropagation(); lbNav(-1); };
    lb.querySelector('#lb-next').onclick = e => { e.stopPropagation(); lbNav(1); };
    document.body.appendChild(lb);
    document.addEventListener('keydown', e => {
      const lbEl = document.getElementById('lightbox');
      if (!lbEl || !lbEl.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') lbNav(-1);
      else if (e.key === 'ArrowRight') lbNav(1);
    });
    return lb;
  }

  function openLightbox(idx) {
    const lb = buildLightbox();
    _lbVisible = [];
    document.querySelectorAll('.ss-card:not([style*="display:none"]):not([style*="display: none"])').forEach(card => {
      const i = parseInt(card.dataset.ssIdx);
      if (!isNaN(i)) _lbVisible.push(i);
    });
    if (_lbVisible.length === 0 && window._ssAll) _lbVisible = window._ssAll.map((_, i) => i);
    _lbIdx = _lbVisible.indexOf(idx);
    if (_lbIdx === -1) _lbIdx = 0;
    renderLb();
    lb.classList.add('open');
    lb.querySelector('#lb-close').focus();
  }

  function closeLightbox() {
    const lb = document.getElementById('lightbox');
    if (lb) lb.classList.remove('open');
  }

  function lbNav(dir) {
    _lbIdx = (_lbIdx + dir + _lbVisible.length) % _lbVisible.length;
    renderLb();
  }

  function renderLb() {
    if (!window._ssAll || _lbVisible.length === 0) return;
    const ss = window._ssAll[_lbVisible[_lbIdx]];
    if (!ss) return;
    const img = document.getElementById('lb-img');
    const lbl = document.getElementById('lb-label');
    const ctr = document.getElementById('lb-counter');
    img.src = ss.src;
    img.alt = ss.label + (ss.route ? ' \\u2014 ' + ss.route : '');
    lbl.textContent = ss.label + (ss.route ? ' \\u2014 ' + ss.route : '');
    ctr.textContent = (_lbIdx + 1) + ' / ' + _lbVisible.length;
    document.getElementById('lb-prev').style.display = _lbVisible.length > 1 ? '' : 'none';
    document.getElementById('lb-next').style.display = _lbVisible.length > 1 ? '' : 'none';
  }

  // Click delegation for screenshot cards
  document.addEventListener('click', e => {
    const card = e.target.closest('.ss-card[data-ss-idx]');
    if (card) {
      openLightbox(parseInt(card.dataset.ssIdx));
      return;
    }
    const el = e.target.closest('[data-lb-src]');
    if (el) {
      const lb = buildLightbox();
      _lbVisible = [];
      window._ssAll = window._ssAll || [{ src: el.dataset.lbSrc, label: el.dataset.lbLabel||'', route: '', time: '' }];
      _lbVisible = [window._ssAll.length - 1];
      _lbIdx = 0;
      document.getElementById('lb-img').src = el.dataset.lbSrc;
      document.getElementById('lb-label').textContent = el.dataset.lbLabel || '';
      document.getElementById('lb-counter').textContent = '';
      document.getElementById('lb-prev').style.display = 'none';
      document.getElementById('lb-next').style.display = 'none';
      lb.classList.add('open');
    }
  });

  // Enter/Space on screenshot cards + keyboard shortcuts
  document.addEventListener('keydown', e => {
    // Ctrl/Cmd+K: focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const search = document.getElementById('ss-search');
      if (search) { search.focus(); search.select(); }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.ss-card[data-ss-idx]');
      if (card) { e.preventDefault(); openLightbox(parseInt(card.dataset.ssIdx)); }
    }
  });

  // ── Gallery interaction functions ─────────────────────────────
  function filterScreenshots() {
    const q = (document.getElementById('ss-search')?.value || '').toLowerCase().trim();
    _searchQuery = q;
    document.querySelectorAll('.ss-card').forEach(card => {
      const lbl = card.dataset.ssLabel || '';
      const match = !q || lbl.includes(q);
      card.style.display = match ? '' : 'none';
    });
    if (q) {
      document.querySelectorAll('.ss-group').forEach(g => g.style.display = '');
      document.querySelectorAll('.ss-card[data-collapsed]').forEach(c => {
        if ((c.dataset.ssLabel||'').includes(q)) c.style.display = '';
      });
    }
  }

  function filterCat(cat) {
    _activeCat = cat;
    _searchQuery = '';
    document.querySelectorAll('#ss-cat-bar .cat-pill').forEach(p => {
      const isActive = p.dataset.cat === cat;
      p.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    document.querySelectorAll('.ss-group').forEach(g => {
      g.style.display = (cat === 'all' || g.dataset.cat === cat) ? '' : 'none';
    });
    const searchEl = document.getElementById('ss-search');
    if (searchEl) searchEl.value = '';
  }

  function setGridSize(sz) {
    _gridSize = sz;
    document.querySelectorAll('.sz-btn').forEach(b => {
      const isActive = b.dataset.sz === sz;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    document.querySelectorAll('.ss-grid').forEach(g => {
      g.classList.remove('sz-sm', 'sz-md', 'sz-lg');
      g.classList.add('sz-' + sz);
    });
  }

  function toggleGroupExpand(btn) {
    const group = btn.closest('.ss-group');
    if (!group) return;
    const grid = group.querySelector('.ss-grid');
    if (!grid) return;

    if (btn.dataset.expanded) {
      // Collapse: remove cards beyond initial 8
      const cards = grid.querySelectorAll('.ss-card');
      let count = 0;
      cards.forEach(c => {
        count++;
        if (count > 8) c.remove();
      });
      delete btn.dataset.expanded;
      _expandedGroups.delete(group.dataset.cat);
      const hiddenIndices = btn.dataset.items ? JSON.parse(btn.dataset.items) : [];
      btn.textContent = 'Show ' + hiddenIndices.length + ' more';
    } else {
      // Expand: render deferred cards into DOM
      const hiddenIndices = btn.dataset.items ? JSON.parse(btn.dataset.items) : [];
      if (window._ssAll && hiddenIndices.length) {
        const allShots = window._ssRaw || [];
        hiddenIndices.forEach(idx => {
          const ss = allShots[idx];
          if (ss) {
            grid.insertAdjacentHTML('beforeend', renderSsCard(ss));
          }
        });
      }
      btn.textContent = 'Show less';
      btn.dataset.expanded = '1';
      _expandedGroups.add(group.dataset.cat);
    }
  }

  // ── Changelog Carousel ─────────────────────────────────────
  let _clObserver = null;

  function initCarousel() {
    const track = document.getElementById('cl-track');
    if (!track) return;

    // Attach scroll-based arrow + dot updates
    track.addEventListener('scroll', () => {
      clUpdateDots();
      clUpdateArrows();
    }, { passive: true });

    // Keyboard navigation on carousel focus
    const carousel = document.getElementById('cl-carousel');
    if (carousel) {
      carousel.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); clNav(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); clNav(1); }
      });
    }

    // IntersectionObserver for accurate dot tracking
    const dots = document.getElementById('cl-dots');
    if (dots && 'IntersectionObserver' in window) {
      _clObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const cards = Array.from(track.querySelectorAll('.cl-card'));
            const idx = cards.indexOf(entry.target);
            if (idx >= 0) {
              dots.querySelectorAll('.cl-dot').forEach((d, i) => {
                const isActive = i === idx;
                d.classList.toggle('active', isActive);
                d.setAttribute('aria-selected', isActive ? 'true' : 'false');
              });
            }
          }
        });
      }, { root: track, threshold: 0.5 });
      track.querySelectorAll('.cl-card').forEach(card => _clObserver.observe(card));
    }

    clUpdateArrows();
  }

  function clNav(dir) {
    const track = document.getElementById('cl-track');
    if (!track) return;
    const card = track.querySelector('.cl-card');
    if (!card) return;
    const gap = parseFloat(getComputedStyle(track).gap) || 16;
    const w = card.offsetWidth + gap;
    track.scrollBy({ left: dir * w, behavior: 'smooth' });
  }

  function clGoTo(idx) {
    const track = document.getElementById('cl-track');
    if (!track) return;
    const card = track.querySelector('.cl-card');
    if (!card) return;
    const gap = parseFloat(getComputedStyle(track).gap) || 16;
    const w = card.offsetWidth + gap;
    track.scrollTo({ left: idx * w, behavior: 'smooth' });
  }

  function clUpdateDots() {
    const track = document.getElementById('cl-track');
    const dots = document.getElementById('cl-dots');
    if (!track || !dots) return;
    // Fallback for browsers without IntersectionObserver
    if (!_clObserver) {
      const card = track.querySelector('.cl-card');
      if (!card) return;
      const gap = parseFloat(getComputedStyle(track).gap) || 16;
      const w = card.offsetWidth + gap;
      const idx = Math.round(track.scrollLeft / w);
      dots.querySelectorAll('.cl-dot').forEach((d, i) => {
        const isActive = i === idx;
        d.classList.toggle('active', isActive);
        d.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }
  }

  function clUpdateArrows() {
    const track = document.getElementById('cl-track');
    const prev = document.getElementById('cl-prev');
    const next = document.getElementById('cl-next');
    if (!track || !prev || !next) return;
    const atStart = track.scrollLeft <= 1;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    prev.classList.toggle('disabled', atStart);
    prev.setAttribute('aria-disabled', atStart ? 'true' : 'false');
    next.classList.toggle('disabled', atEnd);
    next.setAttribute('aria-disabled', atEnd ? 'true' : 'false');
  }

  // ── Category Classification (priority scoring) ─────────────
  const CAT_RULES = [
    { pattern: /^trace\\s+qa/i, cat: 'Quality Checks', priority: 10 },
    { pattern: /^trace/i, cat: 'Activity', priority: 9 },
    { pattern: /^mcp/i, cat: 'Activity', priority: 9 },
    { pattern: /^benchmarks?/i, cat: 'Performance Tests', priority: 9 },
    { pattern: /^page\\s+index/i, cat: 'Pages', priority: 10 },
    { pattern: /^redesign/i, cat: 'Redesigns', priority: 8 },
    { pattern: /^final/i, cat: 'Final Results', priority: 8 },
    { pattern: /landing|home|signin|main\\s+page|navigation/i, cat: 'Navigation', priority: 5 },
    { pattern: /fast\\s+agent|agent/i, cat: 'Assistant', priority: 5 },
  ];

  function classifyScreenshot(label) {
    let bestCat = 'General', bestPriority = -1;
    for (const rule of CAT_RULES) {
      if (rule.pattern.test(label) && rule.priority > bestPriority) {
        bestCat = rule.cat;
        bestPriority = rule.priority;
      }
    }
    return bestCat;
  }

  // ── Helpers ─────────────────────────────────────────────────
  const SEC_ICONS = {
    'Bugs & Fixes': ['#451a03','#fbbf24','<path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>'],
    'Code Review': ['#1e1b4b','#818cf8','<path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>'],
    'Screenshots': ['#052e16','#34d399','<path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"/>'],
    'Changelog': ['#172554','#60a5fa','<path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>'],
    'Generated Tests': ['#14532d','#4ade80','<path d="M4.5 12.75l6 6 9-13.5"/>'],
    'Components': ['#3b0764','#c084fc','<path d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/>'],
    'Files Reviewed': ['#1c1917','#a8a29e','<path d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"/>'],
  };
  function sec(title, subtitle) {
    const icon = SEC_ICONS[title];
    const parts = ['<div class="sec-hdr">'];
    if (icon) {
      parts.push('<div class="sec-icon" style="background:'+icon[0]+';color:'+icon[1]+'" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+icon[2]+'</svg></div>');
    }
    parts.push('<div class="sec-text"><h2>'+title+'</h2>');
    if (subtitle) parts.push('<div class="sec-sub">'+subtitle+'</div>');
    parts.push('</div></div>');
    return parts.join('');
  }
  function sevBadge(sev) {
    const c = {critical:'sev-critical',high:'sev-high',medium:'sev-medium',low:'sev-low'}[sev]||'sev-medium';
    return '<span class="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 '+c+'">'+sev+'</span>';
  }
  function statusBadge(st) {
    if(st==='resolved'||st==='fixed') return '<span class="text-[10px] px-1.5 py-0.5 rounded bg-ok/10 text-ok shrink-0">fixed</span>';
    if(st==='open') return '<span class="text-[10px] px-1.5 py-0.5 rounded bg-err/10 text-err shrink-0">open</span>';
    return '';
  }
  function shortPath(p) {
    if(!p) return '';
    const parts = p.replace(/\\\\/g,'/').split('/');
    return parts.length>3 ? '\\u2026/'+parts.slice(-3).join('/') : p;
  }
  function fileChips(raw) {
    if(!raw) return '';
    let files = [];
    try { files = JSON.parse(raw); } catch { files = [raw]; }
    if(!Array.isArray(files)) files = [String(files)];
    return files.map(f => '<span class="file-chip" title="'+esc(f)+'">'+esc(shortPath(f))+'</span>').join('');
  }
  function truncWords(s, max) {
    if(!s || s.length<=max) return s||'';
    const cut = s.lastIndexOf(' ', max);
    return s.slice(0, cut>0?cut:max) + '\\u2026';
  }
  function esc(s) { return s==null?'':String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  init();
  </script>
</body>
</html>`;
}
