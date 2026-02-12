/**
 * NodeBench MCP — Dashboard HTML v3
 *
 * Single-scroll, zero-tab dashboard. Everything visible at once.
 * Clean, intuitive design: Inter font, clear section hierarchy.
 * Auto-refreshes every 5s.
 */

export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodeBench UI Dive</title>
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
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    .glass { background: rgba(17,17,19,.72); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
    .ring-glow { box-shadow: 0 0 0 1px rgba(99,102,241,.15), 0 1px 3px rgba(0,0,0,.4); }
    .ring-glow:hover { box-shadow: 0 0 0 1px rgba(99,102,241,.35), 0 4px 12px rgba(0,0,0,.5); }
    @keyframes fadeUp { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
    .fade-up { animation: fadeUp .35s ease-out both; }
    @keyframes pulse2 { 0%,100%{opacity:1} 50%{opacity:.35} }
    .pulse-live { animation: pulse2 2s infinite; }
    .score-ring { width:64px; height:64px; }
    .score-ring circle { fill:none; stroke-width:5; stroke-linecap:round; }
    .score-ring .bg { stroke:#27272a; }
    .score-ring .fg { transition: stroke-dashoffset .6s ease; }
    pre { white-space: pre-wrap; word-break: break-word; tab-size: 2; }
    .sev-critical { background:#450a0a; color:#fca5a5; }
    .sev-high { background:#451a03; color:#fde68a; }
    .sev-medium { background:#0c1a3d; color:#93c5fd; }
    .sev-low { background:#052e16; color:#86efac; }
    .file-chip { display:inline-block; padding:2px 8px; margin:2px 3px 2px 0; border-radius:4px; background:#18181b; border:1px solid #27272a; font-size:11px; font-family:'SF Mono',Monaco,monospace; color:#a1a1aa; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .ss-grid { display:grid; gap:12px; }
    .ss-grid.sz-sm { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
    .ss-grid.sz-md { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
    .ss-grid.sz-lg { grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); }
    .ss-card { cursor:pointer; transition: transform .2s, box-shadow .2s, border-color .2s; border-radius:10px; overflow:hidden; border:1px solid #27272a; background:#111113; }
    .ss-card:hover { transform:translateY(-3px); box-shadow:0 8px 30px rgba(99,102,241,.12), 0 2px 8px rgba(0,0,0,.4); border-color:#4f46e5; }
    .ss-card img { width:100%; aspect-ratio:16/10; object-fit:cover; display:block; background:linear-gradient(135deg,#18181b 0%,#1f1f23 100%); }
    .ss-meta { padding:8px 12px; border-top:1px solid #1e1e22; }
    .ss-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:12px; padding:10px 14px; background:#111113; border-radius:10px; border:1px solid #1e1e22; }
    .ss-search { background:#09090b; border:1px solid #27272a; color:#d4d4d8; padding:6px 10px 6px 32px; border-radius:8px; font-size:12px; width:220px; outline:none; transition:border-color .15s; }
    .ss-search:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
    .ss-search-wrap { position:relative; display:flex; align-items:center; }
    .ss-search-icon { position:absolute; left:9px; top:50%; transform:translateY(-50%); width:14px; height:14px; color:#52525b; pointer-events:none; }
    .cat-pill { display:inline-flex; align-items:center; gap:4px; padding:4px 12px; border-radius:999px; font-size:11px; font-weight:500; cursor:pointer; transition:all .15s; border:1px solid #27272a; color:#a1a1aa; background:transparent; user-select:none; }
    .cat-pill:hover { background:#18181b; border-color:#3f3f46; }
    .cat-pill.active { background:linear-gradient(135deg,#1e1b4b,#312e81); border-color:#6366f1; color:#c7d2fe; box-shadow:0 0 0 1px rgba(99,102,241,.2); }
    .cat-pill .cat-count { background:#27272a; color:#71717a; padding:1px 6px; border-radius:9px; font-size:10px; margin-left:2px; line-height:1.3; }
    .cat-pill.active .cat-count { background:rgba(99,102,241,.3); color:#e0e7ff; }
    .sz-btn { width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:8px; border:1px solid #27272a; background:transparent; color:#52525b; cursor:pointer; transition:all .15s; }
    .sz-btn:hover { background:#18181b; color:#d4d4d8; border-color:#3f3f46; }
    .sz-btn.active { background:linear-gradient(135deg,#1e1b4b,#312e81); border-color:#6366f1; color:#c7d2fe; }
    .sz-btn svg { width:16px; height:16px; }
    .ss-group-hdr { font-size:12px; font-weight:600; color:#a1a1aa; padding:16px 0 8px; margin-bottom:12px; display:flex; align-items:center; gap:8px; border-bottom:1px solid #1e1e22; }
    .ss-group-hdr .g-count { font-weight:400; color:#52525b; font-size:11px; }
    .ss-show-more { display:flex; align-items:center; justify-content:center; gap:6px; padding:10px 24px; border-radius:8px; border:1px solid #27272a; background:#111113; color:#a1a1aa; font-size:12px; font-weight:500; cursor:pointer; transition:all .15s; margin-top:10px; }
    .ss-show-more:hover { border-color:#6366f1; color:#c7d2fe; background:linear-gradient(135deg,#1e1b4b,#312e81); }
    .sec-hdr { margin-top:32px; margin-bottom:16px; display:flex; align-items:center; gap:10px; }
    .sec-hdr .sec-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .sec-hdr .sec-icon svg { width:16px; height:16px; }
    .sec-hdr .sec-text h2 { font-size:14px; font-weight:700; color:#fafafa; letter-spacing:-.01em; }
    .sec-hdr .sec-text .sec-sub { font-size:11px; color:#71717a; margin-top:1px; }
    .lightbox { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,.92); display:none; align-items:center; justify-content:center; }
    .lightbox.open { display:flex; }
    .lightbox img { max-width:88vw; max-height:85vh; border-radius:8px; box-shadow:0 12px 40px rgba(0,0,0,.6); cursor:default; }
    .lb-chrome { position:absolute; bottom:20px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:12px; background:rgba(17,17,19,.9); padding:8px 16px; border-radius:10px; border:1px solid #27272a; }
    .lb-label { font-size:12px; color:#a1a1aa; max-width:400px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .lb-counter { font-size:11px; color:#52525b; white-space:nowrap; }
    .lb-nav { width:36px; height:36px; border-radius:50%; border:1px solid #3f3f46; background:rgba(17,17,19,.8); color:#d4d4d8; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:18px; transition:all .15s; position:absolute; top:50%; z-index:201; }
    .lb-nav:hover { background:#4f46e5; border-color:#6366f1; color:#fff; }
    .lb-nav.prev { left:16px; transform:translateY(-50%); }
    .lb-nav.next { right:16px; transform:translateY(-50%); }
    .lb-close { position:absolute; top:16px; right:16px; width:36px; height:36px; border-radius:50%; border:1px solid #3f3f46; background:rgba(17,17,19,.8); color:#d4d4d8; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:18px; z-index:201; transition:all .15s; }
    .lb-close:hover { background:#dc2626; border-color:#ef4444; color:#fff; }
    .compare-bar { display:flex; align-items:center; gap:12px; padding:8px 16px; background:#111113; border-radius:8px; margin-bottom:12px; }
    .compare-bar select { background:#18181b; border:1px solid #27272a; color:#d4d4d8; padding:4px 8px; border-radius:6px; font-size:12px; }
    .compare-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .compare-grid .compare-col { border:1px solid #27272a; border-radius:8px; overflow:hidden; }
    .compare-grid .compare-col .ch { padding:8px 12px; background:#18181b; font-size:11px; color:#a1a1aa; font-weight:600; text-transform:uppercase; letter-spacing:.05em; }
    .compare-grid .compare-col img { width:100%; display:block; }
    .empty-state { text-align:center; padding:32px 16px; color:#52525b; }
    .empty-state .empty-icon { font-size:28px; margin-bottom:8px; opacity:.5; }
    .empty-state .empty-hint { font-size:12px; line-height:1.5; max-width:400px; margin:0 auto; }
    .nav-pill { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:500; cursor:pointer; transition:all .15s; border:1px solid transparent; }
    .nav-pill:hover { background:#18181b; }
    .nav-pill.active { background:#1e1b4b; border-color:#4f46e5; color:#a5b4fc; }
  </style>
</head>
<body class="bg-surface-0 text-zinc-300 min-h-screen">

  <!-- Sticky header -->
  <header class="glass border-b border-border sticky top-0 z-50 px-5 h-14 flex items-center justify-between">
    <div class="flex items-center gap-2.5">
      <div class="w-7 h-7 rounded-md bg-gradient-to-br from-accent-dim to-accent flex items-center justify-center text-white text-xs font-bold">N</div>
      <div>
        <span class="text-sm font-semibold text-white tracking-tight" id="hdr-title">UI Dive</span>
        <span class="text-[10px] text-zinc-500 ml-1.5" id="hdr-status"></span>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <span class="flex items-center gap-1.5 text-[10px] text-zinc-500"><span class="w-1.5 h-1.5 rounded-full bg-ok pulse-live"></span>Auto-refresh</span>
      <select id="session-picker" class="bg-surface-2 border border-border rounded-md px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-accent max-w-[300px]">
        <option value="">Loading...</option>
      </select>
      <button id="compare-btn" onclick="toggleCompare()" class="text-[11px] px-2.5 py-1 rounded-md border border-border text-zinc-400 hover:text-white hover:border-accent transition-colors" title="Pick two sessions and view their scores and screenshots side-by-side">Compare</button>
    </div>
  </header>

  <!-- All content rendered here -->
  <main id="root" class="max-w-[960px] mx-auto px-5 pt-6 pb-20">
    <p class="text-zinc-500 text-sm py-20 text-center">Loading...</p>
  </main>

  <script>
  let SID = null;
  let _t = null;
  let _allSessions = [];
  let _compareMode = false;
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
      return '<option value="'+s.id+'">'+(s.app_name||'Session')+' '+s.created_at.slice(5,16)+' ['+tag+']</option>';
    }).join('');
    if (_allSessions.length) { SID = _allSessions[0].id; pk.value = SID; }
    pk.onchange = e => { SID = e.target.value; if(!_compareMode) load(); };
    load();
    _t = setInterval(() => { if(!_compareMode) load(); }, 5000);
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
      load();
    }
  }

  async function renderCompareMode() {
    const opts = _allSessions.map(s =>
      '<option value="'+s.id+'">'+(s.app_name||'Dive')+' — '+s.created_at.slice(5,16)+'</option>'
    ).join('');
    let h = '<div class="fade-up">';
    h += '<h2 class="text-lg font-bold text-white mb-4">Session Comparison</h2>';
    h += '<div class="compare-bar">';
    h += '<span class="text-[11px] text-zinc-400 font-semibold uppercase">Left</span>';
    h += '<select id="cmp-left" class="flex-1" onchange="loadCompare()">'+opts+'</select>';
    h += '<span class="text-[11px] text-zinc-400">vs</span>';
    h += '<span class="text-[11px] text-zinc-400 font-semibold uppercase">Right</span>';
    h += '<select id="cmp-right" class="flex-1" onchange="loadCompare()">'+opts+'</select>';
    h += '</div>';
    h += '<div id="cmp-content"><p class="text-zinc-500 text-sm py-10 text-center">Select two sessions to compare</p></div>';
    h += '</div>';
    $('root').innerHTML = h;
    // Default: latest vs second-latest
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
    let h = '';
    // Score comparison
    const lRev = lOv.latestReview, rRev = rOv.latestReview;
    const lScore = lRev?(lRev.score??0):null, rScore = rRev?(rRev.score??0):null;
    const gradeOf = s => s===null?'—':s>=90?'A':s>=80?'B':s>=70?'C':s>=60?'D':'F';
    h += '<div class="compare-grid mb-6">';
    h += '<div class="ring-glow rounded-lg p-4 bg-surface-1 text-center"><div class="text-[10px] text-zinc-500 uppercase mb-1">Score</div><div class="text-3xl font-bold '+(lScore>=80?'text-ok':lScore>=60?'text-warn':'text-err')+'">'+gradeOf(lScore)+'</div><div class="text-sm text-zinc-400">'+(lScore??'—')+'/100</div><div class="text-[10px] text-zinc-600 mt-1">'+lOv.stats.bugs+' bugs · '+lOv.stats.components+' comps</div></div>';
    h += '<div class="ring-glow rounded-lg p-4 bg-surface-1 text-center"><div class="text-[10px] text-zinc-500 uppercase mb-1">Score</div><div class="text-3xl font-bold '+(rScore>=80?'text-ok':rScore>=60?'text-warn':'text-err')+'">'+gradeOf(rScore)+'</div><div class="text-sm text-zinc-400">'+(rScore??'—')+'/100</div><div class="text-[10px] text-zinc-600 mt-1">'+rOv.stats.bugs+' bugs · '+rOv.stats.components+' comps</div></div>';
    h += '</div>';
    // Match screenshots by route for side-by-side
    const routeMap = {};
    lShots.forEach(s => { const r = s.route||s.label; if(!routeMap[r]) routeMap[r]={left:null,right:null}; routeMap[r].left = s; });
    rShots.forEach(s => { const r = s.route||s.label; if(!routeMap[r]) routeMap[r]={left:null,right:null}; routeMap[r].right = s; });
    const routes = Object.keys(routeMap);
    if (routes.length === 0) {
      h += '<p class="text-zinc-500 text-sm py-8 text-center">No screenshots to compare. Use dive_snapshot to capture screenshots during dive sessions.</p>';
    } else {
      h += '<div class="space-y-4">';
      routes.forEach(r => {
        const pair = routeMap[r];
        h += '<div class="fade-up"><div class="text-[11px] text-zinc-400 font-medium mb-1.5 font-mono">'+esc(r)+'</div>';
        h += '<div class="compare-grid">';
        if (pair.left) {
          const src = pair.left.base64_thumbnail ? 'data:image/png;base64,'+pair.left.base64_thumbnail : '/api/screenshot/'+encodeURIComponent(pair.left.id)+'/image';
          h += '<div class="compare-col"><img src="'+src+'" alt="'+esc(r)+'" loading="lazy" style="cursor:pointer" data-lb-src="'+esc(src)+'" data-lb-label="Left: '+esc(r)+'"></div>';
        } else {
          h += '<div class="compare-col" style="display:flex;align-items:center;justify-content:center;min-height:120px;color:#52525b;font-size:11px">No screenshot</div>';
        }
        if (pair.right) {
          const src = pair.right.base64_thumbnail ? 'data:image/png;base64,'+pair.right.base64_thumbnail : '/api/screenshot/'+encodeURIComponent(pair.right.id)+'/image';
          h += '<div class="compare-col"><img src="'+src+'" alt="'+esc(r)+'" loading="lazy" style="cursor:pointer" data-lb-src="'+esc(src)+'" data-lb-label="Right: '+esc(r)+'"></div>';
        } else {
          h += '<div class="compare-col" style="display:flex;align-items:center;justify-content:center;min-height:120px;color:#52525b;font-size:11px">No screenshot</div>';
        }
        h += '</div></div>';
      });
      h += '</div>';
    }
    $('cmp-content').innerHTML = h;
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
      render(ov, bugs, fixes, comps, locs, logs, tests, revs, shots);
    } catch(e) { $('root').innerHTML = '<p class="text-err text-sm py-10 text-center">'+esc(e.message)+'</p>'; }
  }

  function render(ov, bugs, fixes, comps, locs, logs, tests, revs, shots) {
    const s = ov.stats, sess = ov.session;
    $('hdr-title').textContent = sess.app_name || 'UI Dive';
    $('hdr-status').textContent = sess.status === 'completed' ? 'Completed' : 'In Progress';
    const ssMap = {};
    (shots||[]).forEach(ss => { ssMap[ss.id] = ss; });

    let h = '';
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

    h += '<div class="fade-up ring-glow rounded-xl bg-surface-1 p-5 mb-6">';
    h += '<div class="flex items-start gap-5">';
    // Score ring
    h += '<div class="relative shrink-0" title="'+(score!==null?'Quality score: '+score+'/100':'No review yet. Run dive_review to generate a score.')+'">';
    h += '<svg class="score-ring" viewBox="0 0 64 64"><circle class="bg" cx="32" cy="32" r="28"/>';
    if(score!==null) h += '<circle class="fg" cx="32" cy="32" r="28" stroke="'+(score>=80?'#34d399':score>=60?'#fbbf24':'#f87171')+'" stroke-dasharray="'+circ.toFixed(1)+'" stroke-dashoffset="'+dashOff.toFixed(1)+'" transform="rotate(-90 32 32)"/>';
    h += '</svg>';
    h += '<div class="absolute inset-0 flex items-center justify-center"><span class="text-lg font-bold '+gradeClr+'">'+grade+'</span></div>';
    h += '</div>';
    // Summary text
    h += '<div class="flex-1 min-w-0">';
    h += '<div class="text-sm font-semibold text-white mb-1">'+(sess.app_name||'UI Dive Session')+'</div>';
    h += '<div class="text-[11px] text-zinc-500 mb-3">'+esc(sess.app_url||'')+(sess.created_at?' &middot; Started '+esc(sess.created_at.slice(0,16)):'')+'</div>';
    // Stat pills
    h += '<div class="flex flex-wrap gap-1.5">';
    if(s.bugs>0) h += '<span class="text-[11px] px-2 py-0.5 rounded-full '+(s.bugsOpen>0?'bg-red-950/50 text-red-300':'bg-emerald-950/50 text-emerald-300')+'">'+s.bugs+' bug'+(s.bugs!==1?'s':'')+((s.bugsResolved>0)?' &middot; '+s.bugsResolved+' fixed':'')+'</span>';
    if(s.fixes>0) h += '<span class="text-[11px] px-2 py-0.5 rounded-full bg-blue-950/50 text-blue-300">'+s.fixes+' fix'+(s.fixes!==1?'es':'')+'</span>';
    h += '<span class="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800/60 text-zinc-400">'+s.components+' component'+(s.components!==1?'s':'')+'</span>';
    if(s.codeLocations>0) h += '<span class="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800/60 text-zinc-400">'+s.codeLocations+' code loc'+(s.codeLocations!==1?'s':'')+'</span>';
    if(s.generatedTests>0) h += '<span class="text-[11px] px-2 py-0.5 rounded-full bg-violet-950/50 text-violet-300">'+s.generatedTests+' test'+(s.generatedTests!==1?'s':'')+'</span>';
    if(s.codeReviews>0) h += '<span class="text-[11px] px-2 py-0.5 rounded-full bg-violet-950/50 text-violet-300">'+s.codeReviews+' review'+(s.codeReviews!==1?'s':'')+'</span>';
    h += '</div>';
    h += '</div></div>';

    // Empty session guidance
    if (!hasBugs && !hasReview && logs.length===0 && (!shots||shots.length===0)) {
      h += '<div class="empty-state mt-4 mb-2"><div class="text-zinc-400 text-sm font-medium mb-2">Session is clean</div>';
      h += '<div class="empty-hint text-zinc-600">No bugs found and no code review yet. Use <code class="text-accent text-[11px]">dive_interact</code> to test interactions, <code class="text-accent text-[11px]">dive_bug</code> to log issues, or <code class="text-accent text-[11px]">dive_review</code> to generate a quality score.</div></div>';
    }
    h += '</div>';

    // ── Bugs & Fixes ──────────────────────────────────────────
    if (hasBugs) {
      h += sec('Bugs & Fixes', 'Found '+bugs.length+' issue'+(bugs.length!==1?'s':'')+', applied '+fixes.length+' fix'+(fixes.length!==1?'es':''));
      bugs.forEach(b => {
        const fix = fixes.find(f => f.bug_id === b.id);
        h += '<div class="ring-glow rounded-lg p-4 mb-2.5 bg-surface-1 fade-up">';
        h += '<div class="flex items-center gap-2 flex-wrap">' + sevBadge(b.severity) + statusBadge(b.status) +
             '<span class="text-[13px] font-medium text-white leading-snug">'+esc(b.title)+'</span></div>';
        if (b.description) h += '<p class="text-xs text-zinc-400 mt-2 leading-relaxed">'+esc(b.description)+'</p>';
        if (b.expected||b.actual) {
          h += '<div class="mt-2.5 grid grid-cols-2 gap-3 text-[11px]">';
          if(b.expected) h += '<div class="rounded-md bg-surface-0 p-2.5 border border-border"><span class="text-ok font-semibold text-[10px] uppercase tracking-wide">Expected</span><div class="text-zinc-400 mt-1 leading-relaxed">'+esc(b.expected)+'</div></div>';
          if(b.actual) h += '<div class="rounded-md bg-surface-0 p-2.5 border border-border"><span class="text-err font-semibold text-[10px] uppercase tracking-wide">Actual</span><div class="text-zinc-400 mt-1 leading-relaxed">'+esc(b.actual)+'</div></div>';
          h += '</div>';
        }
        if (fix) {
          h += '<div class="mt-3 border-t border-border pt-3">';
          h += '<div class="flex items-center gap-2 mb-1.5">' +
               (fix.verified?'<span class="text-[10px] px-1.5 py-0.5 rounded bg-ok/10 text-ok font-medium">Verified Fix</span>':
                             '<span class="text-[10px] px-1.5 py-0.5 rounded bg-warn/10 text-warn font-medium">Pending Fix</span>') + '</div>';
          h += '<p class="text-xs text-zinc-400 leading-relaxed">'+esc(fix.fix_description)+'</p>';
          if (fix.files_changed) h += '<div class="mt-1.5 flex flex-wrap">'+fileChips(fix.files_changed)+'</div>';
          if (fix.verification_notes) h += '<div class="mt-1.5 text-[11px] text-zinc-500 italic leading-relaxed">'+esc(fix.verification_notes)+'</div>';
          h += '</div>';
        }
        h += '</div>';
      });
      const bugIds = new Set(bugs.map(b=>b.id));
      fixes.filter(f=>!bugIds.has(f.bug_id)).forEach(f => {
        h += '<div class="ring-glow rounded-lg p-4 mb-2.5 bg-surface-1 fade-up">';
        h += '<div class="flex items-center gap-2">' + sevBadge(f.bug_severity||'medium') +
             (f.verified?'<span class="text-[10px] px-1.5 py-0.5 rounded bg-ok/10 text-ok font-medium">Verified</span>':
                         '<span class="text-[10px] px-1.5 py-0.5 rounded bg-warn/10 text-warn font-medium">Pending</span>') +
             '<span class="text-[13px] font-medium text-white">'+esc(f.bug_title||f.bug_id)+'</span></div>';
        h += '<p class="text-xs text-zinc-400 mt-2">'+esc(f.fix_description)+'</p>';
        if (f.files_changed) h += '<div class="mt-1.5 flex flex-wrap">'+fileChips(f.files_changed)+'</div>';
        h += '</div>';
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
      // Filter out findings that duplicate bugs already shown above
      const bugTitles = new Set(bugs.map(b=>(b.title||'').toLowerCase().trim()));
      const uniqueFindings = findings.filter(f => !bugTitles.has((f.title||'').toLowerCase().trim()));

      h += sec('Code Review', sc+'/100 quality score'+(uniqueFindings.length>0?' &middot; '+uniqueFindings.length+' additional finding'+(uniqueFindings.length!==1?'s':''):''));
      h += '<div class="ring-glow rounded-lg bg-surface-1 p-5 fade-up">';
      h += '<div class="flex items-center justify-between">';
      h += '<div class="flex items-center gap-3"><span class="text-2xl font-bold '+(sc>=80?'text-ok':sc>=60?'text-warn':'text-err')+'">'+gr+'</span>';
      h += '<div><div class="text-sm font-semibold text-white">'+sc+'/100</div><div class="text-[11px] text-zinc-500">Overall quality</div></div></div>';
      h += '<div class="flex gap-4 text-center text-[11px]">';
      ['critical','high','medium','low'].forEach(sv => {
        const v = sev[sv]||0;
        if(v===0) return;
        const c = {critical:'text-err',high:'text-warn',medium:'text-accent',low:'text-ok'}[sv];
        h += '<div><div class="text-base font-bold '+c+'">'+v+'</div><div class="text-zinc-500 capitalize">'+sv+'</div></div>';
      });
      if(!sev.critical && !sev.high && !sev.medium && !sev.low) h += '<div class="text-[11px] text-zinc-500">No findings</div>';
      h += '</div></div>';
      if (uniqueFindings.length) {
        h += '<div class="space-y-2 mt-4">';
        uniqueFindings.forEach(f => {
          h += '<div class="flex items-start gap-2.5 text-xs">';
          h += sevBadge(f.severity);
          h += '<div class="flex-1 min-w-0">';
          h += '<div class="font-medium text-zinc-200">'+esc(f.title)+'</div>';
          h += '<div class="text-zinc-500 mt-0.5 leading-relaxed">'+truncWords(esc(f.description),200)+'</div>';
          if (f.codeFile) h += '<span class="file-chip mt-1">'+esc(shortPath(f.codeFile))+(f.codeLine?' '+esc(f.codeLine):'')+'</span>';
          h += '</div>';
          h += statusBadge(f.status);
          h += '</div>';
        });
        h += '</div>';
      }
      h += '</div>';
    }

    // ── Screenshots Gallery (interactive) ────────────────────
    if (shots && shots.length) {
      // Store globally for lightbox slideshow
      window._ssAll = shots.map(ss => ({
        src: ss.base64_thumbnail ? 'data:image/png;base64,'+ss.base64_thumbnail : '/api/screenshot/'+encodeURIComponent(ss.id)+'/image',
        label: ss.label||'screenshot',
        route: ss.route||'',
        time: ss.created_at?.slice(5,16)||'',
      }));

      // Auto-categorize by label prefix
      const catMap = {};
      shots.forEach((ss, idx) => {
        const lbl = ss.label||'screenshot';
        // Extract category: "Trace Qa 01 ..." -> "Trace QA", "Mcp Ledger ..." -> "MCP Ledger"
        const words = lbl.split(' ');
        let cat = 'General';
        if (words.length >= 2) {
          const w0 = words[0].toLowerCase(), w1 = words[1].toLowerCase();
          if (w0 === 'trace' && w1 === 'qa') cat = 'Trace QA';
          else if (w0 === 'trace') cat = 'Trace';
          else if (w0 === 'mcp') cat = 'MCP Ledger';
          else if (w0 === 'benchmarks' || w0 === 'benchmark') cat = 'Benchmarks';
          else if (w0 === 'page' && w1 === 'index') cat = 'Page Index';
          else if (w0 === 'redesign') cat = 'Redesigns';
          else if (w0 === 'final') cat = 'Final States';
          else if (lbl.match(/landing|home|signin|main page/i)) cat = 'Navigation';
          else if (lbl.match(/fast agent|agent/i)) cat = 'Fast Agent';
          else cat = 'General';
        }
        if (!catMap[cat]) catMap[cat] = [];
        catMap[cat].push({ ...ss, _idx: idx });
      });
      // Merge tiny categories (<=2 items) into "Other" to reduce pill clutter
      const MIN_CAT_SIZE = 3;
      const tinyKeys = Object.keys(catMap).filter(k => catMap[k].length < MIN_CAT_SIZE && k !== 'General');
      if (tinyKeys.length > 1) {
        if (!catMap['Other']) catMap['Other'] = [];
        tinyKeys.forEach(k => { catMap['Other'].push(...catMap[k]); delete catMap[k]; });
      }
      const cats = Object.keys(catMap).sort((a,b) => catMap[b].length - catMap[a].length);

      h += sec('Screenshots', shots.length+' captured image'+(shots.length!==1?'s':''));

      // Toolbar: search + category pills + grid size
      h += '<div class="ss-toolbar">';
      h += '<div class="ss-search-wrap"><svg class="ss-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" class="ss-search" id="ss-search" placeholder="Filter screenshots..." oninput="filterScreenshots()"></div>';
      h += '<div class="flex-1"></div>';
      h += '<button class="sz-btn" data-sz="sm" onclick="setGridSize(&#39;sm&#39;)" title="Compact"><svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg></button>';
      h += '<button class="sz-btn active" data-sz="md" onclick="setGridSize(&#39;md&#39;)" title="Medium"><svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6.5" height="6.5" rx="1.5"/><rect x="8.5" y="1" width="6.5" height="6.5" rx="1.5"/><rect x="1" y="8.5" width="6.5" height="6.5" rx="1.5"/><rect x="8.5" y="8.5" width="6.5" height="6.5" rx="1.5"/></svg></button>';
      h += '<button class="sz-btn" data-sz="lg" onclick="setGridSize(&#39;lg&#39;)" title="Large"><svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="14" height="6.5" rx="1.5"/><rect x="1" y="8.5" width="14" height="6.5" rx="1.5"/></svg></button>';
      h += '</div>';

      // Category filter pills
      h += '<div class="flex flex-wrap gap-1.5 mb-4" id="ss-cat-bar">';
      h += '<span class="cat-pill active" data-cat="all" onclick="filterCat(&#39;all&#39;)">All<span class="cat-count">'+shots.length+'</span></span>';
      cats.forEach(cat => {
        h += '<span class="cat-pill" data-cat="'+esc(cat)+'" onclick="filterCat(&#39;'+esc(cat)+'&#39;)">'+esc(cat)+'<span class="cat-count">'+catMap[cat].length+'</span></span>';
      });
      h += '</div>';

      // Grouped grid
      h += '<div id="ss-gallery">';
      const INITIAL_SHOW = 8;
      cats.forEach(cat => {
        const items = catMap[cat];
        h += '<div class="ss-group" data-cat="'+esc(cat)+'">';
        h += '<div class="ss-group-hdr">'+esc(cat)+' <span class="g-count">('+items.length+')</span></div>';
        h += '<div class="ss-grid sz-md">';
        items.forEach((ss, i) => {
          const src = ss.base64_thumbnail ? 'data:image/png;base64,'+ss.base64_thumbnail : '/api/screenshot/'+encodeURIComponent(ss.id)+'/image';
          const lbl = esc(ss.label||'screenshot');
          const rt = ss.route ? ' - '+esc(ss.route) : '';
          const hidden = i >= INITIAL_SHOW ? ' style="display:none" data-collapsed="1"' : '';
          h += '<div class="ss-card ring-glow fade-up" data-ss-idx="'+ss._idx+'" data-ss-label="'+lbl.toLowerCase()+'"'+hidden+'>';
          h += '<img src="'+src+'" alt="'+lbl+'" loading="lazy">';
          h += '<div class="ss-meta"><div class="text-[11px] text-zinc-300 truncate" title="'+lbl+'">'+lbl+'</div>';
          h += '<div class="text-[10px] text-zinc-500">'+esc(ss.created_at?.slice(5,16)||'')+(rt?rt:'')+'</div>';
          h += '</div></div>';
        });
        h += '</div>';
        if (items.length > INITIAL_SHOW) {
          h += '<div class="ss-show-more" data-cat="'+esc(cat)+'" onclick="toggleGroupExpand(this)">Show '+(items.length - INITIAL_SHOW)+' more</div>';
        }
        h += '</div>';
      });
      h += '</div>';
    }

    // ── Changelog ────────────────────────────────────────────
    if (logs.length) {
      h += sec('Changelog', 'What changed during this session');
      h += '<div class="relative pl-5 border-l-2 border-border space-y-3">';
      logs.forEach(c => {
        h += '<div class="fade-up relative">';
        h += '<div class="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-surface-0"></div>';
        h += '<div class="text-[11px] text-zinc-500 mb-0.5">'+esc(c.created_at)+'</div>';
        h += '<div class="text-xs text-zinc-300 leading-relaxed">'+truncWords(esc(c.description),220)+'</div>';
        if (c.files_changed) h += '<div class="mt-1.5 flex flex-wrap">'+fileChips(c.files_changed)+'</div>';
        const bef = c.before_screenshot_id ? ssMap[c.before_screenshot_id] : null;
        const aft = c.after_screenshot_id ? ssMap[c.after_screenshot_id] : null;
        if (bef || aft) {
          h += '<div class="compare-grid mt-2">';
          if (bef) {
            const bSrc = bef.base64_thumbnail ? 'data:image/png;base64,'+bef.base64_thumbnail : '/api/screenshot/'+encodeURIComponent(bef.id)+'/image';
            h += '<div class="compare-col"><div class="ch">Before</div><img src="'+bSrc+'" alt="Before" loading="lazy" data-lb-src="'+esc(bSrc)+'" data-lb-label="Before" style="cursor:pointer"></div>';
          }
          if (aft) {
            const aSrc = aft.base64_thumbnail ? 'data:image/png;base64,'+aft.base64_thumbnail : '/api/screenshot/'+encodeURIComponent(aft.id)+'/image';
            h += '<div class="compare-col"><div class="ch">After</div><img src="'+aSrc+'" alt="After" loading="lazy" data-lb-src="'+esc(aSrc)+'" data-lb-label="After" style="cursor:pointer"></div>';
          }
          h += '</div>';
        }
        h += '</div>';
      });
      h += '</div>';
    }

    // ── Generated Tests ──────────────────────────────────────
    if (tests.length) {
      h += sec('Generated Tests', 'Auto-generated regression tests from findings');
      tests.forEach(t => {
        h += '<div class="ring-glow rounded-lg p-4 mb-2 bg-surface-1 fade-up">';
        h += '<div class="flex items-center gap-2">';
        h += '<span class="text-[10px] px-1.5 py-0.5 rounded bg-ok/10 text-ok font-medium">'+esc(t.test_framework)+'</span>';
        h += '<span class="text-xs text-white font-medium">'+esc(t.description||'Regression tests')+'</span></div>';
        if (t.test_file_path) h += '<span class="file-chip mt-1.5">'+esc(shortPath(t.test_file_path))+'</span>';
        if (t.test_code) {
          h += '<details class="mt-2"><summary class="text-[11px] text-accent cursor-pointer select-none">View source</summary>';
          h += '<pre class="mt-1.5 text-[11px] bg-surface-0 rounded-md p-3 text-zinc-400 max-h-64 overflow-auto leading-relaxed border border-border">'+esc(t.test_code)+'</pre></details>';
        }
        h += '</div>';
      });
    }

    // ── Components (grouped by type) ─────────────────────────
    if (comps.length) {
      h += sec('Components', s.components+' discovered across the application');
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
        h += '<div class="mb-4 fade-up">';
        h += '<div class="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1.5">'+esc(type)+'s <span class="text-zinc-600 normal-case font-normal">('+items.length+')</span></div>';
        h += '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">';
        items.forEach(c => {
          const hasBugs = (c.bug_count||0) > 0;
          h += '<div class="rounded-md px-3 py-2 bg-surface-1 border border-border hover:border-zinc-600 transition-colors'+(hasBugs?' border-l-2 border-l-err':'')+'">';
          h += '<div class="text-xs font-medium text-zinc-200 truncate" title="'+esc(c.name)+'">'+esc(c.name)+'</div>';
          if (hasBugs) h += '<div class="text-[10px] text-err mt-0.5">'+c.bug_count+' bug'+(c.bug_count>1?'s':'')+'</div>';
          h += '</div>';
        });
        h += '</div></div>';
      });
    }

    // ── Code Locations ───────────────────────────────────────
    if (locs.length) {
      h += sec('Code Locations', locs.length+' files traced during this session');
      h += '<details class="fade-up"><summary class="text-xs text-accent cursor-pointer select-none mb-2">Show '+locs.length+' traced locations</summary>';
      h += '<div class="space-y-1">';
      locs.forEach(l => {
        h += '<div class="flex items-center gap-2 text-[11px] py-1.5 px-2.5 rounded bg-surface-1 border border-border">';
        h += '<span class="file-chip" style="margin:0" title="'+esc(l.file_path)+'">'+esc(shortPath(l.file_path))+'</span>';
        if (l.line_start) h += '<span class="text-zinc-600 text-[10px]">L'+l.line_start+(l.line_end&&l.line_end!==l.line_start?'-'+l.line_end:'')+'</span>';
        if (l.search_query) h += '<span class="text-accent text-[10px] truncate max-w-[140px]" title="'+esc(l.search_query)+'">'+esc(l.search_query)+'</span>';
        h += '</div>';
      });
      h += '</div></details>';
    }

    $('root').innerHTML = h;
    // Restore persisted gallery state after re-render
    restoreGalleryState();
  }

  function restoreGalleryState() {
    // Restore grid size
    if (_gridSize !== 'sm') setGridSize(_gridSize);
    // Restore category filter
    if (_activeCat !== 'all') filterCat(_activeCat);
    // Restore expanded groups
    _expandedGroups.forEach(cat => {
      const btn = document.querySelector('.ss-show-more[data-cat="'+cat+'"]');
      if (btn) toggleGroupExpand(btn);
    });
    // Restore search query
    if (_searchQuery) {
      const el = document.getElementById('ss-search');
      if (el) { el.value = _searchQuery; filterScreenshots(); }
    }
  }

  // ── Slideshow Lightbox ──────────────────────────────────────
  let _lbIdx = 0;
  let _lbVisible = []; // indices into window._ssAll currently visible

  function buildLightbox() {
    let lb = document.getElementById('lightbox');
    if (lb) return lb;
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.className = 'lightbox';
    lb.innerHTML = '<div class="lb-nav prev" id="lb-prev" title="Previous (Left arrow)">&lsaquo;</div>' +
      '<img id="lb-img" src="" alt="">' +
      '<div class="lb-nav next" id="lb-next" title="Next (Right arrow)">&rsaquo;</div>' +
      '<div class="lb-close" id="lb-close" title="Close (Esc)">&times;</div>' +
      '<div class="lb-chrome"><span class="lb-label" id="lb-label"></span><span class="lb-counter" id="lb-counter"></span></div>';
    lb.addEventListener('click', e => {
      // Close on backdrop click, not on controls
      if (e.target === lb) closeLightbox();
    });
    document.getElementById('lb-close') || null; // placeholder
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
    // Build visible list from currently shown cards
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
    lbl.textContent = ss.label + (ss.route ? ' — ' + ss.route : '');
    ctr.textContent = (_lbIdx + 1) + ' / ' + _lbVisible.length;
    // Show/hide nav arrows
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
    // Legacy support for compare mode data-lb-src
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

  // ── Gallery interaction functions ─────────────────────────────
  function filterScreenshots() {
    const q = (document.getElementById('ss-search')?.value || '').toLowerCase().trim();
    _searchQuery = q;
    document.querySelectorAll('.ss-card').forEach(card => {
      const lbl = card.dataset.ssLabel || '';
      const match = !q || lbl.includes(q);
      card.style.display = match ? '' : 'none';
    });
    // Show all groups when searching
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
    // Update pills
    document.querySelectorAll('#ss-cat-bar .cat-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.cat === cat);
    });
    // Show/hide groups
    document.querySelectorAll('.ss-group').forEach(g => {
      g.style.display = (cat === 'all' || g.dataset.cat === cat) ? '' : 'none';
    });
    // Clear search
    const searchEl = document.getElementById('ss-search');
    if (searchEl) searchEl.value = '';
  }

  function setGridSize(sz) {
    _gridSize = sz;
    document.querySelectorAll('.sz-btn').forEach(b => b.classList.toggle('active', b.dataset.sz === sz));
    document.querySelectorAll('.ss-grid').forEach(g => {
      g.classList.remove('sz-sm', 'sz-md', 'sz-lg');
      g.classList.add('sz-' + sz);
    });
  }

  function toggleGroupExpand(btn) {
    const group = btn.closest('.ss-group');
    if (!group) return;
    const collapsed = group.querySelectorAll('.ss-card[data-collapsed]');
    if (collapsed.length) {
      collapsed.forEach(c => { c.style.display = ''; c.removeAttribute('data-collapsed'); });
      btn.textContent = 'Show less';
      btn.dataset.expanded = '1';
      _expandedGroups.add(group.dataset.cat);
    } else if (btn.dataset.expanded) {
      // Re-collapse: hide cards beyond initial 8
      const cards = group.querySelectorAll('.ss-card');
      let count = 0;
      cards.forEach(c => {
        count++;
        if (count > 8) { c.style.display = 'none'; c.dataset.collapsed = '1'; }
      });
      delete btn.dataset.expanded;
      _expandedGroups.delete(group.dataset.cat);
      const hidden = cards.length - 8;
      btn.textContent = 'Show ' + hidden + ' more';
    }
  }

  // ── Helpers ─────────────────────────────────────────────────
  const SEC_ICONS = {
    'Bugs & Fixes': ['#451a03','#fbbf24','<path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>'],
    'Code Review': ['#1e1b4b','#818cf8','<path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>'],
    'Screenshots': ['#052e16','#34d399','<path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"/>'],
    'Changelog': ['#172554','#60a5fa','<path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>'],
    'Generated Tests': ['#14532d','#4ade80','<path d="M4.5 12.75l6 6 9-13.5"/>'],
    'Components': ['#3b0764','#c084fc','<path d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/>'],
    'Code Locations': ['#1c1917','#a8a29e','<path d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"/>'],
  };
  function sec(title, subtitle) {
    const icon = SEC_ICONS[title];
    let h = '<div class="sec-hdr">';
    if (icon) {
      h += '<div class="sec-icon" style="background:'+icon[0]+';color:'+icon[1]+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+icon[2]+'</svg></div>';
    }
    h += '<div class="sec-text"><h2>'+title+'</h2>';
    if (subtitle) h += '<div class="sec-sub">'+subtitle+'</div>';
    h += '</div></div>';
    return h;
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
