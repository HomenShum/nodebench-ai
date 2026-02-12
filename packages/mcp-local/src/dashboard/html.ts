/**
 * NodeBench MCP — Dashboard HTML
 *
 * Single-page dashboard served by the local HTTP server.
 * Uses Tailwind CSS via CDN for zero-build styling.
 * Auto-refreshes every 5s to show live flywheel progress.
 */

export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodeBench — UI Dive Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            nb: { bg: '#09090b', card: '#18181b', border: '#2e2e3e', accent: '#6366f1', green: '#22c55e', red: '#ef4444', yellow: '#eab308', blue: '#3b82f6' }
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .fade-in { animation: fadeIn 0.3s ease-in; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .pulse-dot { animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    pre { white-space: pre-wrap; word-break: break-word; }
    .tab-active { border-bottom: 2px solid #6366f1; color: #e0e0ff; }
    .tab-inactive { border-bottom: 2px solid transparent; color: #888; }
    .tab-inactive:hover { color: #bbb; border-bottom-color: #333; }
    .severity-critical { background: #7f1d1d; color: #fca5a5; }
    .severity-high { background: #78350f; color: #fbbf24; }
    .severity-medium { background: #1e3a5f; color: #93c5fd; }
    .severity-low { background: #1a2e1a; color: #86efac; }
  </style>
</head>
<body class="bg-nb-bg text-gray-200 min-h-screen">

  <!-- Header -->
  <header class="border-b border-nb-border px-6 py-4 flex items-center justify-between sticky top-0 bg-nb-bg/95 backdrop-blur z-50">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 bg-nb-accent rounded-lg flex items-center justify-center text-white font-bold text-sm">N</div>
      <div>
        <h1 class="text-lg font-semibold text-white">NodeBench UI Dive</h1>
        <p class="text-xs text-gray-500" id="session-subtitle">Loading...</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <div id="live-indicator" class="flex items-center gap-1.5 text-xs text-gray-500">
        <span class="w-2 h-2 rounded-full bg-nb-green pulse-dot"></span>
        <span>Live</span>
      </div>
      <select id="session-picker" class="bg-nb-card border border-nb-border rounded-md px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-nb-accent">
        <option value="">Loading sessions...</option>
      </select>
    </div>
  </header>

  <!-- Stats Bar -->
  <div id="stats-bar" class="border-b border-nb-border px-6 py-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center"></div>

  <!-- Tabs -->
  <nav class="border-b border-nb-border px-6 flex gap-1 overflow-x-auto" id="tabs-nav"></nav>

  <!-- Content -->
  <main class="px-6 py-6 max-w-[1400px] mx-auto" id="content">
    <div class="text-center text-gray-500 py-20">Loading dashboard...</div>
  </main>

  <script>
  // ── State ──────────────────────────────────────────────────────────
  let currentSessionId = null;
  let currentTab = 'overview';
  let autoRefreshTimer = null;
  const API = '';

  const TABS = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'bugs', label: 'Bugs', icon: '🐛' },
    { id: 'fixes', label: 'Fixes', icon: '✅' },
    { id: 'components', label: 'Components', icon: '🧩' },
    { id: 'interactions', label: 'Interactions', icon: '👆' },
    { id: 'code-locations', label: 'Code', icon: '📍' },
    { id: 'changelogs', label: 'Changelog', icon: '📋' },
    { id: 'tests', label: 'Tests', icon: '🧪' },
    { id: 'reviews', label: 'Reviews', icon: '📝' },
    { id: 'design-issues', label: 'Design', icon: '🎨' },
  ];

  // ── Init ───────────────────────────────────────────────────────────
  async function init() {
    renderTabs();
    await loadSessions();
    startAutoRefresh();
  }

  function startAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(() => {
      if (currentSessionId) loadTabData();
    }, 5000);
  }

  // ── Sessions ───────────────────────────────────────────────────────
  async function loadSessions() {
    const res = await fetch(API + '/api/sessions');
    const sessions = await res.json();
    const picker = document.getElementById('session-picker');
    picker.innerHTML = sessions.map(s =>
      '<option value="' + s.id + '">' +
        (s.app_name || 'Dive') + ' — ' + s.created_at.slice(0, 16) +
        ' (' + s.bug_count + ' bugs, ' + s.bugs_resolved + ' fixed)' +
      '</option>'
    ).join('');

    if (sessions.length > 0) {
      currentSessionId = sessions[0].id;
      picker.value = currentSessionId;
      await loadTabData();
    }

    picker.addEventListener('change', async (e) => {
      currentSessionId = e.target.value;
      await loadTabData();
    });
  }

  // ── Tabs ───────────────────────────────────────────────────────────
  function renderTabs() {
    const nav = document.getElementById('tabs-nav');
    nav.innerHTML = TABS.map(t =>
      '<button onclick="switchTab(\\'' + t.id + '\\')" id="tab-' + t.id + '" ' +
      'class="px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ' +
      (t.id === currentTab ? 'tab-active' : 'tab-inactive') + '">' +
      t.icon + ' ' + t.label + '</button>'
    ).join('');
  }

  function switchTab(tabId) {
    currentTab = tabId;
    renderTabs();
    loadTabData();
  }

  // ── Data Loading ───────────────────────────────────────────────────
  async function loadTabData() {
    if (!currentSessionId) return;
    const endpoint = currentTab === 'overview'
      ? '/api/session/' + currentSessionId + '/overview'
      : '/api/session/' + currentSessionId + '/' + currentTab;

    try {
      const res = await fetch(API + endpoint);
      const data = await res.json();

      if (currentTab === 'overview') {
        renderOverview(data);
      } else {
        renderList(currentTab, data);
      }
    } catch (err) {
      document.getElementById('content').innerHTML =
        '<div class="text-red-400 py-10 text-center">Error loading data: ' + err.message + '</div>';
    }
  }

  // ── Render: Overview ───────────────────────────────────────────────
  function renderOverview(data) {
    const s = data.stats;
    const session = data.session;
    document.getElementById('session-subtitle').textContent =
      (session.app_name || session.app_url) + ' · ' + session.status;

    // Stats bar
    const statsHtml = [
      stat('Components', s.components, '🧩'),
      stat('Interactions', s.interactions, '👆'),
      stat('Bugs', s.bugs, '🐛', s.bugsOpen > 0 ? 'text-nb-red' : ''),
      stat('Resolved', s.bugsResolved, '✅'),
      stat('Fixes', s.fixes, '🔧'),
      stat('Code Locs', s.codeLocations, '📍'),
      stat('Tests', s.generatedTests, '🧪'),
      stat('Reviews', s.codeReviews, '📝'),
    ].join('');
    document.getElementById('stats-bar').innerHTML = statsHtml;

    // Main content
    let html = '<div class="fade-in space-y-6">';

    // Score card
    if (data.latestReview) {
      const r = data.latestReview;
      const score = r.score ?? 0;
      const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
      const gradeColor = score >= 80 ? 'text-nb-green' : score >= 60 ? 'text-nb-yellow' : 'text-nb-red';
      html += '<div class="bg-nb-card border border-nb-border rounded-xl p-6">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<h2 class="text-lg font-semibold text-white">Code Review Score</h2>' +
          '<div class="text-4xl font-bold ' + gradeColor + '">' + grade + ' <span class="text-lg text-gray-500">(' + score + '/100)</span></div>' +
        '</div>' +
        '<div class="grid grid-cols-4 gap-4 mb-4">' + severityCards(r.severity_counts) + '</div>' +
        (r.summary ? '<p class="text-sm text-gray-400 leading-relaxed">' + escHtml(r.summary).slice(0, 300) + '</p>' : '') +
      '</div>';
    }

    // Flywheel progress
    html += '<div class="bg-nb-card border border-nb-border rounded-xl p-6">' +
      '<h2 class="text-lg font-semibold text-white mb-4">Flywheel Progress</h2>' +
      '<div class="grid grid-cols-2 md:grid-cols-5 gap-3">' +
        flywheelStep('Explore', s.components > 0, s.components + ' components'),
        flywheelStep('Tag Bugs', s.bugs > 0, s.bugs + ' bugs found'),
        flywheelStep('Locate Code', s.codeLocations > 0, s.codeLocations + ' locations'),
        flywheelStep('Fix & Verify', s.fixesVerified > 0, s.fixesVerified + '/' + s.fixes + ' verified'),
        flywheelStep('Tests & Review', s.generatedTests > 0 || s.codeReviews > 0, s.generatedTests + ' tests, ' + s.codeReviews + ' reviews'),
      '</div>' +
    '</div>';

    // Quick links
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-3">' +
      quickLink('View Bugs', 'bugs', s.bugs, s.bugsOpen > 0 ? 'border-nb-red/30' : 'border-nb-border') +
      quickLink('View Fixes', 'fixes', s.fixes, 'border-nb-border') +
      quickLink('View Changelog', 'changelogs', s.changelogs, 'border-nb-border') +
      quickLink('View Tests', 'tests', s.generatedTests, 'border-nb-border') +
    '</div>';

    html += '</div>';
    document.getElementById('content').innerHTML = html;
  }

  // ── Render: Lists ──────────────────────────────────────────────────
  function renderList(tab, data) {
    if (!Array.isArray(data) || data.length === 0) {
      document.getElementById('content').innerHTML =
        '<div class="text-gray-500 py-20 text-center">No ' + tab + ' data yet for this session.</div>';
      return;
    }

    const renderers = {
      'bugs': renderBugs,
      'fixes': renderFixes,
      'components': renderComponents,
      'interactions': renderInteractions,
      'code-locations': renderCodeLocations,
      'changelogs': renderChangelogs,
      'tests': renderTests,
      'reviews': renderReviews,
      'design-issues': renderDesignIssues,
    };

    const fn = renderers[tab];
    if (fn) {
      document.getElementById('content').innerHTML = '<div class="fade-in space-y-3">' + fn(data) + '</div>';
    }
  }

  function renderBugs(data) {
    return data.map(b => {
      const sev = b.severity || 'medium';
      return card(
        '<div class="flex items-center gap-2">' +
          severityBadge(sev) +
          statusBadge(b.status) +
          '<span class="font-semibold text-white">' + escHtml(b.title) + '</span>' +
        '</div>' +
        '<div class="text-xs text-gray-500 mt-1">Component: ' + escHtml(b.component_name || b.component_id || '—') + ' · ' + b.created_at + '</div>' +
        (b.description ? '<p class="text-sm text-gray-400 mt-2">' + escHtml(b.description) + '</p>' : '') +
        (b.expected ? '<div class="mt-2 text-xs"><span class="text-nb-green">Expected:</span> ' + escHtml(b.expected) + '</div>' : '') +
        (b.actual ? '<div class="text-xs"><span class="text-nb-red">Actual:</span> ' + escHtml(b.actual) + '</div>' : '')
      );
    }).join('');
  }

  function renderFixes(data) {
    return data.map(f => card(
      '<div class="flex items-center gap-2">' +
        (f.verified ? '<span class="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-nb-green">✓ Verified</span>' :
                      '<span class="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-nb-yellow">Pending</span>') +
        severityBadge(f.bug_severity || 'medium') +
        '<span class="font-semibold text-white">' + escHtml(f.bug_title || f.bug_id) + '</span>' +
      '</div>' +
      '<p class="text-sm text-gray-400 mt-2">' + escHtml(f.fix_description) + '</p>' +
      (f.files_changed ? '<div class="mt-2 text-xs text-gray-500">Files: ' + escHtml(f.files_changed) + '</div>' : '') +
      (f.verification_notes ? '<div class="mt-1 text-xs text-gray-500">Notes: ' + escHtml(f.verification_notes) + '</div>' : '') +
      '<div class="text-xs text-gray-600 mt-1">' + (f.route ? 'Route: ' + f.route + ' · ' : '') + f.created_at + '</div>'
    )).join('');
  }

  function renderComponents(data) {
    return data.map(c => card(
      '<div class="flex items-center gap-2">' +
        '<span class="text-xs px-2 py-0.5 rounded bg-nb-accent/20 text-indigo-300">' + escHtml(c.component_type) + '</span>' +
        '<span class="font-semibold text-white">' + escHtml(c.name) + '</span>' +
        statusBadge(c.status) +
      '</div>' +
      '<div class="text-xs text-gray-500 mt-1">' +
        c.interaction_count + ' interactions · ' + c.bug_count + ' bugs' +
        (c.selector ? ' · ' + escHtml(c.selector) : '') +
      '</div>' +
      (c.summary ? '<p class="text-sm text-gray-400 mt-2">' + escHtml(c.summary) + '</p>' : '')
    )).join('');
  }

  function renderInteractions(data) {
    return data.map(i => card(
      '<div class="flex items-center gap-2">' +
        '<span class="text-xs font-mono bg-nb-card px-2 py-0.5 rounded text-gray-300">#' + i.sequence_num + '</span>' +
        '<span class="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-nb-blue">' + escHtml(i.action) + '</span>' +
        '<span class="text-sm text-white">' + escHtml(i.component_name || i.component_id) + '</span>' +
      '</div>' +
      '<div class="text-xs text-gray-500 mt-1">Result: <span class="text-' + (i.result === 'pass' || i.result === 'success' ? 'nb-green' : i.result === 'fail' ? 'nb-red' : 'gray-300') + '">' + i.result + '</span></div>' +
      (i.observation ? '<p class="text-sm text-gray-400 mt-1">' + escHtml(i.observation) + '</p>' : '')
    )).join('');
  }

  function renderCodeLocations(data) {
    return data.map(l => card(
      '<div class="flex items-center gap-2">' +
        '<span class="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-300">' + escHtml(l.confidence) + '</span>' +
        '<span class="font-mono text-sm text-white">' + escHtml(shortPath(l.file_path)) + '</span>' +
        (l.line_start ? '<span class="text-xs text-gray-500">L' + l.line_start + (l.line_end ? '-' + l.line_end : '') + '</span>' : '') +
      '</div>' +
      (l.search_query ? '<div class="text-xs text-gray-500 mt-1">Query: ' + escHtml(l.search_query) + '</div>' : '') +
      (l.code_snippet ? '<pre class="mt-2 text-xs bg-black/40 rounded p-3 text-gray-300 max-h-40 overflow-auto">' + escHtml(l.code_snippet) + '</pre>' : '') +
      (l.notes ? '<div class="text-xs text-gray-500 mt-1">' + escHtml(l.notes) + '</div>' : '')
    )).join('');
  }

  function renderChangelogs(data) {
    return data.map(c => card(
      '<div class="flex items-center gap-2">' +
        '<span class="text-xs px-2 py-0.5 rounded bg-indigo-900/30 text-indigo-300">' + escHtml(c.change_type) + '</span>' +
        '<span class="text-sm text-white">' + escHtml(c.description).slice(0, 120) + '</span>' +
      '</div>' +
      (c.files_changed ? '<div class="text-xs text-gray-500 mt-1">Files: ' + escHtml(c.files_changed) + '</div>' : '') +
      (c.git_commit ? '<div class="text-xs text-gray-500 mt-1">Commit: <span class="font-mono">' + escHtml(c.git_commit) + '</span></div>' : '') +
      '<div class="text-xs text-gray-600 mt-1">' + c.created_at + '</div>'
    )).join('');
  }

  function renderTests(data) {
    return data.map(t => {
      let covers = '';
      try { covers = t.covers ? JSON.parse(t.covers).join(', ') : ''; } catch { covers = t.covers || ''; }
      return card(
        '<div class="flex items-center gap-2">' +
          '<span class="text-xs px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-300">' + escHtml(t.test_framework) + '</span>' +
          '<span class="text-sm text-white">' + escHtml(t.description || t.id) + '</span>' +
        '</div>' +
        (covers ? '<div class="text-xs text-gray-500 mt-1">Covers: ' + escHtml(covers) + '</div>' : '') +
        (t.test_file_path ? '<div class="text-xs text-gray-500 mt-1">File: ' + escHtml(shortPath(t.test_file_path)) + '</div>' : '') +
        (t.test_code ? '<details class="mt-2"><summary class="text-xs text-nb-accent cursor-pointer">Show test code</summary>' +
          '<pre class="mt-1 text-xs bg-black/40 rounded p-3 text-gray-300 max-h-60 overflow-auto">' + escHtml(t.test_code) + '</pre></details>' : '')
      );
    }).join('');
  }

  function renderReviews(data) {
    return data.map(r => {
      const score = r.score ?? 0;
      const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
      return card(
        '<div class="flex items-center justify-between">' +
          '<span class="text-lg font-bold text-white">Review: ' + grade + ' (' + score + '/100)</span>' +
          '<span class="text-xs text-gray-500">' + r.created_at + '</span>' +
        '</div>' +
        '<div class="mt-2">' + severityCards(r.severity_counts) + '</div>' +
        (r.summary ? '<div class="mt-3 text-sm text-gray-300 prose prose-sm prose-invert max-w-none">' + simpleMarkdown(r.summary) + '</div>' : '') +
        (r.findings ? '<details class="mt-3"><summary class="text-xs text-nb-accent cursor-pointer">Show full findings</summary>' +
          '<div class="mt-2 text-sm text-gray-400 prose prose-sm prose-invert max-w-none">' + simpleMarkdown(r.findings) + '</div></details>' : '')
      );
    }).join('');
  }

  function renderDesignIssues(data) {
    return data.map(d => card(
      '<div class="flex items-center gap-2">' +
        severityBadge(d.severity) +
        statusBadge(d.status) +
        '<span class="text-xs px-2 py-0.5 rounded bg-pink-900/30 text-pink-300">' + escHtml(d.issue_type) + '</span>' +
        '<span class="font-semibold text-white">' + escHtml(d.title) + '</span>' +
      '</div>' +
      (d.description ? '<p class="text-sm text-gray-400 mt-2">' + escHtml(d.description) + '</p>' : '') +
      (d.route ? '<div class="text-xs text-gray-500 mt-1">Route: ' + escHtml(d.route) + '</div>' : '')
    )).join('');
  }

  // ── UI Helpers ─────────────────────────────────────────────────────
  function stat(label, value, icon, extra) {
    return '<div class="px-2 py-1"><div class="text-2xl font-bold text-white ' + (extra||'') + '">' + icon + ' ' + value + '</div><div class="text-[11px] text-gray-500 uppercase tracking-wider">' + label + '</div></div>';
  }

  function card(inner) {
    return '<div class="bg-nb-card border border-nb-border rounded-lg p-4 hover:border-nb-accent/30 transition-colors">' + inner + '</div>';
  }

  function severityBadge(sev) {
    const cls = { critical: 'severity-critical', high: 'severity-high', medium: 'severity-medium', low: 'severity-low' }[sev] || 'severity-medium';
    return '<span class="text-[11px] px-2 py-0.5 rounded-full font-medium ' + cls + '">' + sev + '</span>';
  }

  function statusBadge(status) {
    if (status === 'resolved') return '<span class="text-[11px] px-2 py-0.5 rounded-full bg-green-900/40 text-nb-green">resolved</span>';
    if (status === 'open') return '<span class="text-[11px] px-2 py-0.5 rounded-full bg-red-900/40 text-nb-red">open</span>';
    return '<span class="text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">' + (status||'') + '</span>';
  }

  function severityCards(raw) {
    let counts = {};
    try { counts = typeof raw === 'string' ? JSON.parse(raw) : (raw || {}); } catch {}
    return ['critical', 'high', 'medium', 'low'].map(s => {
      const v = counts[s] || 0;
      const colors = { critical: 'border-nb-red/40 text-nb-red', high: 'border-nb-yellow/40 text-nb-yellow', medium: 'border-nb-blue/40 text-nb-blue', low: 'border-nb-green/40 text-nb-green' };
      return '<div class="border rounded-lg p-2 text-center ' + (colors[s]||'') + '"><div class="text-xl font-bold">' + v + '</div><div class="text-[10px] uppercase">' + s + '</div></div>';
    }).join('');
  }

  function flywheelStep(label, done, detail) {
    return '<div class="rounded-lg p-3 text-center border ' +
      (done ? 'border-nb-green/30 bg-green-950/20' : 'border-nb-border bg-nb-card') + '">' +
      '<div class="text-lg">' + (done ? '✅' : '⬜') + '</div>' +
      '<div class="text-sm font-medium ' + (done ? 'text-nb-green' : 'text-gray-500') + '">' + label + '</div>' +
      '<div class="text-[11px] text-gray-500 mt-0.5">' + detail + '</div>' +
    '</div>';
  }

  function quickLink(label, tab, count, borderCls) {
    return '<button onclick="switchTab(\\'' + tab + '\\')" class="bg-nb-card border ' + borderCls + ' rounded-lg p-4 text-left hover:border-nb-accent/40 transition-colors">' +
      '<div class="text-2xl font-bold text-white">' + count + '</div>' +
      '<div class="text-sm text-gray-400">' + label + '</div>' +
    '</button>';
  }

  function shortPath(p) {
    if (!p) return '';
    const parts = p.replace(/\\\\/g, '/').split('/');
    return parts.length > 3 ? '.../' + parts.slice(-3).join('/') : p;
  }

  function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function simpleMarkdown(text) {
    if (!text) return '';
    return escHtml(text)
      .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
      .replace(/### (.+)/g, '<h4 class="font-semibold text-white mt-3 mb-1">$1</h4>')
      .replace(/## (.+)/g, '<h3 class="font-semibold text-white text-lg mt-4 mb-2">$1</h3>')
      .replace(/# (.+)/g, '<h2 class="font-bold text-white text-xl mt-4 mb-2">$1</h2>')
      .replace(/- (.+)/g, '<li class="ml-4">$1</li>')
      .replace(/\\n/g, '<br>');
  }

  // ── Boot ───────────────────────────────────────────────────────────
  init();
  </script>
</body>
</html>`;
}
