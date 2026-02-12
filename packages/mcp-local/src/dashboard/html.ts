/**
 * NodeBench MCP — Dashboard HTML v2
 *
 * Single-scroll, zero-tab dashboard. Everything visible at once.
 * Linear/Vercel-grade design: Inter font, glassmorphism, gradients.
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
    .score-ring { width:72px; height:72px; }
    .score-ring circle { fill:none; stroke-width:6; stroke-linecap:round; }
    .score-ring .bg { stroke:#27272a; }
    .score-ring .fg { transition: stroke-dashoffset .6s ease; }
    pre { white-space: pre-wrap; word-break: break-word; tab-size: 2; }
    .sev-critical { background:#450a0a; color:#fca5a5; }
    .sev-high { background:#451a03; color:#fde68a; }
    .sev-medium { background:#0c1a3d; color:#93c5fd; }
    .sev-low { background:#052e16; color:#86efac; }
    section { scroll-margin-top: 72px; }
    .section-header { position:sticky; top:56px; z-index:20; }
    .pipeline-line { position:absolute; top:50%; left:0; right:0; height:2px; background: linear-gradient(90deg,#27272a,#4f46e5,#27272a); z-index:0; }
  </style>
</head>
<body class="bg-surface-0 text-zinc-300 min-h-screen">

  <!-- Sticky header -->
  <header class="glass border-b border-border sticky top-0 z-50 px-5 h-14 flex items-center justify-between">
    <div class="flex items-center gap-2.5">
      <div class="w-7 h-7 rounded-md bg-gradient-to-br from-accent-dim to-accent flex items-center justify-center text-white text-xs font-bold">N</div>
      <span class="text-sm font-semibold text-white tracking-tight" id="hdr-title">UI Dive</span>
      <span class="text-xs text-zinc-500" id="hdr-status"></span>
    </div>
    <div class="flex items-center gap-3">
      <span class="flex items-center gap-1.5 text-[11px] text-zinc-500"><span class="w-1.5 h-1.5 rounded-full bg-ok pulse-live"></span>Live</span>
      <select id="session-picker" class="bg-surface-2 border border-border rounded-md px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-accent max-w-[280px]">
        <option value="">Loading...</option>
      </select>
    </div>
  </header>

  <!-- All content rendered here -->
  <main id="root" class="max-w-[960px] mx-auto px-5 pt-6 pb-20">
    <p class="text-zinc-500 text-sm py-20 text-center">Loading...</p>
  </main>

  <script>
  let SID = null;
  let _t = null;
  const $ = id => document.getElementById(id);

  async function init() {
    const res = await fetch('/api/sessions');
    const sessions = await res.json();
    const pk = $('session-picker');
    pk.innerHTML = sessions.map(s =>
      '<option value="'+s.id+'">'+(s.app_name||'Dive')+' \\u2014 '+s.created_at.slice(5,16)+' ('+s.bug_count+' bugs, '+s.bugs_resolved+' fixed)</option>'
    ).join('');
    if (sessions.length) { SID = sessions[0].id; pk.value = SID; }
    pk.onchange = e => { SID = e.target.value; load(); };
    load();
    _t = setInterval(load, 5000);
  }

  async function load() {
    if (!SID) return;
    try {
      const [ov, bugs, fixes, comps, locs, logs, tests, revs] = await Promise.all([
        fetch('/api/session/'+SID+'/overview').then(r=>r.json()),
        fetch('/api/session/'+SID+'/bugs').then(r=>r.json()),
        fetch('/api/session/'+SID+'/fixes').then(r=>r.json()),
        fetch('/api/session/'+SID+'/components').then(r=>r.json()),
        fetch('/api/session/'+SID+'/code-locations').then(r=>r.json()),
        fetch('/api/session/'+SID+'/changelogs').then(r=>r.json()),
        fetch('/api/session/'+SID+'/tests').then(r=>r.json()),
        fetch('/api/session/'+SID+'/reviews').then(r=>r.json()),
      ]);
      render(ov, bugs, fixes, comps, locs, logs, tests, revs);
    } catch(e) { $('root').innerHTML = '<p class="text-err text-sm py-10 text-center">'+esc(e.message)+'</p>'; }
  }

  function render(ov, bugs, fixes, comps, locs, logs, tests, revs) {
    const s = ov.stats, sess = ov.session;
    $('hdr-title').textContent = sess.app_name || 'UI Dive';
    $('hdr-status').textContent = sess.status === 'completed' ? 'Completed' : 'Active';

    let h = '';

    // ── Hero: Score + Metrics ────────────────────────────────
    const rev = ov.latestReview;
    const score = rev ? (rev.score??0) : null;
    const grade = score!==null ? (score>=90?'A':score>=80?'B':score>=70?'C':score>=60?'D':'F') : '—';
    const gradeClr = score>=80?'text-ok':score>=60?'text-warn':'text-err';
    const pct = score!==null ? score/100 : 0;
    const dashOff = 188 - (188 * pct);

    h += '<div class="fade-up grid grid-cols-[auto_1fr] gap-6 items-center mb-8">';
    // Score ring
    h += '<div class="relative">';
    h += '<svg class="score-ring" viewBox="0 0 72 72"><circle class="bg" cx="36" cy="36" r="30"/>';
    h += '<circle class="fg" cx="36" cy="36" r="30" stroke="'+(score>=80?'#34d399':score>=60?'#fbbf24':'#f87171')+'" stroke-dasharray="188" stroke-dashoffset="'+dashOff+'" transform="rotate(-90 36 36)"/></svg>';
    h += '<div class="absolute inset-0 flex items-center justify-center"><span class="text-xl font-bold '+gradeClr+'">'+grade+'</span></div>';
    h += '</div>';
    // Metrics row
    h += '<div class="grid grid-cols-4 sm:grid-cols-7 gap-1">';
    h += met(s.bugs, 'Bugs', s.bugsOpen>0?'text-err':'');
    h += met(s.bugsResolved, 'Fixed', 'text-ok');
    h += met(s.fixes, 'Fixes');
    h += met(s.components, 'Components');
    h += met(s.codeLocations, 'Code Locs');
    h += met(s.generatedTests, 'Tests');
    h += met(s.codeReviews, 'Reviews');
    h += '</div></div>';

    // ── Pipeline ────────────────────────────────────────────
    h += '<div class="fade-up relative flex items-center justify-between mb-10 px-2">';
    h += '<div class="pipeline-line"></div>';
    h += pipe('Explore', s.components>0, s.components);
    h += pipe('Tag', s.bugs>0, s.bugs);
    h += pipe('Locate', s.codeLocations>0, s.codeLocations);
    h += pipe('Fix', s.fixesVerified>0, s.fixesVerified+'/'+s.fixes);
    h += pipe('Test', s.generatedTests>0, s.generatedTests);
    h += pipe('Review', s.codeReviews>0, s.codeReviews);
    h += '</div>';

    // ── Bugs & Fixes (unified) ──────────────────────────────
    if (bugs.length || fixes.length) {
      h += sec('Issues & Resolutions', bugs.length + fixes.length);
      bugs.forEach(b => {
        const fix = fixes.find(f => f.bug_id === b.id);
        h += '<div class="ring-glow rounded-lg p-4 mb-2 bg-surface-1 fade-up">';
        h += '<div class="flex items-center gap-2 flex-wrap">' + sevBadge(b.severity) + statusBadge(b.status) +
             '<span class="text-[13px] font-medium text-white leading-snug">'+esc(b.title)+'</span></div>';
        if (b.description) h += '<p class="text-xs text-zinc-400 mt-2 leading-relaxed">'+esc(b.description)+'</p>';
        if (b.expected||b.actual) h += '<div class="mt-2 grid grid-cols-2 gap-3 text-[11px]">' +
          (b.expected?'<div><span class="text-ok font-medium">Expected</span><br>'+esc(b.expected)+'</div>':'') +
          (b.actual?'<div><span class="text-err font-medium">Actual</span><br>'+esc(b.actual)+'</div>':'') + '</div>';
        // Inline fix
        if (fix) {
          h += '<div class="mt-3 border-t border-border pt-3">';
          h += '<div class="flex items-center gap-2 mb-1">' +
               (fix.verified?'<span class="text-[10px] px-1.5 py-0.5 rounded bg-ok/10 text-ok font-medium">Verified</span>':
                             '<span class="text-[10px] px-1.5 py-0.5 rounded bg-warn/10 text-warn font-medium">Pending</span>') +
               '<span class="text-[11px] text-zinc-500">Fix</span></div>';
          h += '<p class="text-xs text-zinc-400 leading-relaxed">'+esc(fix.fix_description)+'</p>';
          if (fix.files_changed) h += '<div class="mt-1.5 text-[11px] text-zinc-500 font-mono">'+esc(fix.files_changed)+'</div>';
          if (fix.verification_notes) h += '<div class="mt-1 text-[11px] text-zinc-500 italic">'+esc(fix.verification_notes)+'</div>';
          h += '</div>';
        }
        h += '</div>';
      });
      // Orphan fixes (no matching bug)
      const bugIds = new Set(bugs.map(b=>b.id));
      fixes.filter(f=>!bugIds.has(f.bug_id)).forEach(f => {
        h += '<div class="ring-glow rounded-lg p-4 mb-2 bg-surface-1 fade-up">';
        h += '<div class="flex items-center gap-2">' + sevBadge(f.bug_severity||'medium') +
             (f.verified?'<span class="text-[10px] px-1.5 py-0.5 rounded bg-ok/10 text-ok font-medium">Verified</span>':
                         '<span class="text-[10px] px-1.5 py-0.5 rounded bg-warn/10 text-warn font-medium">Pending</span>') +
             '<span class="text-[13px] font-medium text-white">'+esc(f.bug_title||f.bug_id)+'</span></div>';
        h += '<p class="text-xs text-zinc-400 mt-2">'+esc(f.fix_description)+'</p>';
        if (f.files_changed) h += '<div class="mt-1.5 text-[11px] text-zinc-500 font-mono">'+esc(f.files_changed)+'</div>';
        h += '</div>';
      });
    }

    // ── Code Review ──────────────────────────────────────────
    if (revs.length) {
      h += sec('Code Review', '');
      const r = revs[0];
      const sc = r.score??0;
      const gr = sc>=90?'A':sc>=80?'B':sc>=70?'C':sc>=60?'D':'F';
      let sev = {};
      try { sev = typeof r.severity_counts==='string'?JSON.parse(r.severity_counts):(r.severity_counts||{}); } catch{}
      let findings = [];
      try { findings = typeof r.findings==='string'?JSON.parse(r.findings):(r.findings||[]); } catch{}

      h += '<div class="ring-glow rounded-lg bg-surface-1 p-5 fade-up">';
      h += '<div class="flex items-center justify-between mb-4">';
      h += '<div class="flex items-center gap-3"><span class="text-2xl font-bold '+(sc>=80?'text-ok':sc>=60?'text-warn':'text-err')+'">'+gr+'</span>';
      h += '<div><div class="text-sm font-semibold text-white">'+sc+'/100</div><div class="text-[11px] text-zinc-500">'+findings.length+' findings</div></div></div>';
      h += '<div class="flex gap-3 text-center text-[11px]">';
      ['critical','high','medium','low'].forEach(sv => {
        const v = sev[sv]||0;
        const c = {critical:'text-err',high:'text-warn',medium:'text-accent',low:'text-ok'}[sv];
        h += '<div><div class="text-lg font-bold '+c+'">'+v+'</div><div class="text-zinc-500 uppercase">'+sv.slice(0,4)+'</div></div>';
      });
      h += '</div></div>';
      // Inline findings
      if (findings.length) {
        h += '<div class="space-y-2 mt-4">';
        findings.forEach(f => {
          h += '<div class="flex items-start gap-2.5 text-xs">';
          h += sevBadge(f.severity);
          h += '<div class="flex-1 min-w-0">';
          h += '<div class="font-medium text-zinc-200">'+esc(f.title)+'</div>';
          h += '<div class="text-zinc-500 mt-0.5 leading-relaxed">'+esc(f.description).slice(0,200)+'</div>';
          if (f.codeFile) h += '<div class="text-zinc-600 font-mono mt-0.5">'+esc(shortPath(f.codeFile))+(f.codeLine?' '+esc(f.codeLine):'')+'</div>';
          h += '</div>';
          h += statusBadge(f.status);
          h += '</div>';
        });
        h += '</div>';
      }
      h += '</div>';
    }

    // ── Changelog ────────────────────────────────────────────
    if (logs.length) {
      h += sec('Changelog', logs.length);
      h += '<div class="relative pl-5 border-l-2 border-border space-y-3">';
      logs.forEach(c => {
        h += '<div class="fade-up relative">';
        h += '<div class="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-surface-0"></div>';
        h += '<div class="text-[11px] text-zinc-500 mb-0.5">'+esc(c.created_at)+'</div>';
        h += '<div class="text-xs text-zinc-300 leading-relaxed">'+esc(c.description).slice(0,180)+'</div>';
        if (c.files_changed) h += '<div class="text-[11px] text-zinc-500 font-mono mt-0.5">'+esc(c.files_changed)+'</div>';
        h += '</div>';
      });
      h += '</div>';
    }

    // ── Generated Tests ──────────────────────────────────────
    if (tests.length) {
      h += sec('Generated Tests', tests.length);
      tests.forEach(t => {
        h += '<div class="ring-glow rounded-lg p-4 mb-2 bg-surface-1 fade-up">';
        h += '<div class="flex items-center gap-2">';
        h += '<span class="text-[10px] px-1.5 py-0.5 rounded bg-ok/10 text-ok font-medium">'+esc(t.test_framework)+'</span>';
        h += '<span class="text-xs text-white font-medium">'+esc(t.description||'Regression tests')+'</span></div>';
        if (t.test_file_path) h += '<div class="text-[11px] text-zinc-500 font-mono mt-1">'+esc(shortPath(t.test_file_path))+'</div>';
        if (t.test_code) {
          h += '<details class="mt-2"><summary class="text-[11px] text-accent cursor-pointer select-none">View source</summary>';
          h += '<pre class="mt-1.5 text-[11px] bg-surface-0 rounded-md p-3 text-zinc-400 max-h-64 overflow-auto leading-relaxed border border-border">'+esc(t.test_code)+'</pre></details>';
        }
        h += '</div>';
      });
    }

    // ── Components ───────────────────────────────────────────
    if (comps.length) {
      h += sec('Components', comps.length);
      h += '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">';
      comps.forEach(c => {
        const hasBugs = (c.bug_count||0) > 0;
        h += '<div class="ring-glow rounded-md px-3 py-2.5 bg-surface-1 fade-up'+(hasBugs?' border-l-2 border-l-err':'')+'">';
        h += '<div class="text-[11px] text-zinc-500">'+esc(c.component_type)+'</div>';
        h += '<div class="text-xs font-medium text-zinc-200 truncate" title="'+esc(c.name)+'">'+esc(c.name)+'</div>';
        if (hasBugs) h += '<div class="text-[10px] text-err mt-0.5">'+c.bug_count+' bug'+(c.bug_count>1?'s':'')+'</div>';
        h += '</div>';
      });
      h += '</div>';
    }

    // ── Code Locations ───────────────────────────────────────
    if (locs.length) {
      h += sec('Code Locations', locs.length);
      h += '<details class="fade-up"><summary class="text-xs text-accent cursor-pointer select-none mb-2">Show '+locs.length+' traced locations</summary>';
      h += '<div class="space-y-1.5">';
      locs.forEach(l => {
        h += '<div class="flex items-center gap-2 text-[11px] py-1 px-2 rounded bg-surface-1">';
        h += '<span class="text-zinc-500 font-mono flex-1 min-w-0 truncate" title="'+esc(l.file_path)+'">'+esc(shortPath(l.file_path))+'</span>';
        if (l.line_start) h += '<span class="text-zinc-600">L'+l.line_start+(l.line_end?'-'+l.line_end:'')+'</span>';
        if (l.search_query) h += '<span class="text-accent truncate max-w-[120px]" title="'+esc(l.search_query)+'">'+esc(l.search_query)+'</span>';
        h += '</div>';
      });
      h += '</div></details>';
    }

    $('root').innerHTML = h;
  }

  // ── Helpers ─────────────────────────────────────────────────
  function met(v, label, cls) {
    return '<div class="text-center py-1"><div class="text-lg font-bold text-white '+(cls||'')+'">'+v+'</div><div class="text-[10px] text-zinc-500 uppercase tracking-wide">'+label+'</div></div>';
  }
  function pipe(label, done, count) {
    return '<div class="relative z-10 flex flex-col items-center">' +
      '<div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ' +
      (done?'bg-accent-dim border-accent text-white':'bg-surface-2 border-border text-zinc-500') + '">'+count+'</div>' +
      '<div class="text-[10px] mt-1 '+(done?'text-accent':'text-zinc-500')+'">'+label+'</div></div>';
  }
  function sec(title, count) {
    return '<div class="section-header glass border-b border-border -mx-5 px-5 py-2.5 mt-10 mb-3 flex items-center justify-between">' +
      '<h2 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">'+title+'</h2>' +
      (count!==''?'<span class="text-[11px] text-zinc-600">'+count+'</span>':'') + '</div>';
  }
  function sevBadge(sev) {
    const c = {critical:'sev-critical',high:'sev-high',medium:'sev-medium',low:'sev-low'}[sev]||'sev-medium';
    return '<span class="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 '+c+'">'+sev+'</span>';
  }
  function statusBadge(st) {
    if(st==='resolved') return '<span class="text-[10px] px-1.5 py-0.5 rounded bg-ok/10 text-ok shrink-0">fixed</span>';
    if(st==='open') return '<span class="text-[10px] px-1.5 py-0.5 rounded bg-err/10 text-err shrink-0">open</span>';
    return '';
  }
  function shortPath(p) {
    if(!p) return '';
    const parts = p.replace(/\\\\/g,'/').split('/');
    return parts.length>3 ? '\\u2026/'+parts.slice(-3).join('/') : p;
  }
  function esc(s) { return s==null?'':String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  init();
  </script>
</body>
</html>`;
}
