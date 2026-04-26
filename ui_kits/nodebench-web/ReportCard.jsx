// Reports — saved answers behave like reusable memory.
// View modes: GRID (default, 3-col cards with SVG preview thumbs) and LIST (single-column dense).
// Each preview thumb is a tiny inline SVG "dashboard" that signals the report's shape at a glance.

// --- Preview thumbnails: inline SVGs that hint at what's inside ---
const Thumbnails = {
  // DISCO — diligence debrief: kv pairs + risk bar
  diligence: (
    <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dgrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF3EC"/><stop offset="1" stopColor="#FBE5D6"/>
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#dgrad)"/>
      {/* Header mini */}
      <rect x="20" y="18" width="90" height="8" rx="2" fill="#AD5F45" opacity=".9"/>
      <rect x="20" y="30" width="140" height="5" rx="2" fill="#AD5F45" opacity=".35"/>
      {/* KV pairs left */}
      {[0,1,2,3].map(i => (
        <g key={i} transform={`translate(20, ${54 + i * 20})`}>
          <rect width="50" height="5" rx="2" fill="#6B7280" opacity=".5"/>
          <rect x="60" width="80" height="6" rx="2" fill="#111827" opacity=".7"/>
        </g>
      ))}
      {/* Risk card right */}
      <rect x="190" y="54" width="110" height="100" rx="8" fill="#fff" stroke="#E5D1C0"/>
      <rect x="202" y="66" width="44" height="5" rx="2" fill="#B45309" opacity=".8"/>
      <rect x="202" y="78" width="85" height="7" rx="2" fill="#111827" opacity=".72"/>
      <rect x="202" y="92" width="85" height="5" rx="2" fill="#6B7280" opacity=".45"/>
      <rect x="202" y="102" width="85" height="5" rx="2" fill="#6B7280" opacity=".45"/>
      <rect x="202" y="112" width="60" height="5" rx="2" fill="#6B7280" opacity=".45"/>
      <rect x="202" y="130" width="76" height="10" rx="5" fill="#D97757" opacity=".85"/>
    </svg>
  ),
  // Mercor — hiring velocity: bar chart of roles
  bars: (
    <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="180" fill="#F3F4F6"/>
      <rect x="20" y="18" width="120" height="8" rx="2" fill="#111827" opacity=".82"/>
      <rect x="20" y="30" width="180" height="5" rx="2" fill="#6B7280" opacity=".5"/>
      {/* Axes */}
      <line x1="30" y1="150" x2="300" y2="150" stroke="#D1D5DB"/>
      {[18, 32, 28, 44, 38, 56, 48].map((h, i) => (
        <rect key={i} x={40 + i * 38} y={150 - h * 1.6} width="24" height={h * 1.6} rx="3"
              fill={i === 5 ? '#D97757' : '#5E6AD2'} opacity={i === 5 ? 1 : .55}/>
      ))}
      {/* legend */}
      <circle cx="30" cy="165" r="3" fill="#5E6AD2" opacity=".55"/><rect x="38" y="162" width="38" height="5" rx="2" fill="#6B7280" opacity=".5"/>
      <circle cx="90" cy="165" r="3" fill="#D97757"/><rect x="98" y="162" width="30" height="5" rx="2" fill="#6B7280" opacity=".5"/>
    </svg>
  ),
  // Cognition — benchmark postmortem: table-ish
  table: (
    <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="180" fill="#FAFAFA"/>
      <rect x="20" y="18" width="110" height="8" rx="2" fill="#111827" opacity=".82"/>
      <rect x="140" y="18" width="42" height="10" rx="5" fill="#B45309" opacity=".15" stroke="#B45309" strokeOpacity=".3"/>
      <rect x="146" y="21" width="30" height="4" rx="2" fill="#B45309" opacity=".8"/>
      {/* table header */}
      <rect x="20" y="48" width="280" height="16" rx="3" fill="#E5E7EB"/>
      {[20, 105, 175, 235].map((x, i) => (
        <rect key={i} x={x + 6} y="54" width={i === 0 ? 40 : 40} height="4" rx="2" fill="#374151" opacity=".75"/>
      ))}
      {/* table rows */}
      {[0,1,2,3,4].map(r => (
        <g key={r} transform={`translate(0, ${68 + r * 18})`}>
          <rect x="20" y="0" width="280" height="16" rx="3" fill={r % 2 ? '#F3F4F6' : '#fff'} stroke="#E5E7EB"/>
          <rect x="26" y="6" width="72" height="4" rx="2" fill="#111827" opacity=".7"/>
          <rect x="111" y="6" width="56" height="4" rx="2" fill="#6B7280" opacity=".55"/>
          <rect x="181" y="6" width="48" height="4" rx="2" fill="#6B7280" opacity=".55"/>
          <rect x="241" y="4" width="24" height="8" rx="4" fill={r < 2 ? '#047857' : r === 2 ? '#B45309' : '#9CA3AF'} opacity={r < 2 ? .85 : r === 2 ? .75 : .45}/>
        </g>
      ))}
    </svg>
  ),
  // Turing — contract spend YoY: line chart
  line: (
    <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="180" fill="#FFFDF7"/>
      <rect x="20" y="18" width="140" height="8" rx="2" fill="#111827" opacity=".82"/>
      <rect x="20" y="30" width="60" height="5" rx="2" fill="#047857" opacity=".75"/>
      <line x1="30" y1="150" x2="300" y2="150" stroke="#E5E7EB"/>
      <line x1="30" y1="110" x2="300" y2="110" stroke="#E5E7EB" strokeDasharray="2 3"/>
      <line x1="30" y1="70"  x2="300" y2="70"  stroke="#E5E7EB" strokeDasharray="2 3"/>
      <path d="M 30 138 L 75 128 L 120 118 L 165 102 L 210 84 L 255 62 L 300 48"
            fill="none" stroke="#D97757" strokeWidth="2.4" strokeLinecap="round"/>
      <path d="M 30 138 L 75 128 L 120 118 L 165 102 L 210 84 L 255 62 L 300 48 L 300 150 L 30 150 Z"
            fill="#D97757" opacity=".12"/>
      {[30,75,120,165,210,255,300].map((x, i) => (
        <circle key={i} cx={x} cy={[138,128,118,102,84,62,48][i]} r="3" fill="#D97757"/>
      ))}
    </svg>
  ),
  // generic competitor matrix
  matrix: (
    <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="180" fill="#F3F4F6"/>
      <rect x="20" y="18" width="110" height="8" rx="2" fill="#111827" opacity=".82"/>
      <rect x="20" y="50" width="280" height="112" rx="6" fill="#fff" stroke="#E5E7EB"/>
      <line x1="20" y1="106" x2="300" y2="106" stroke="#E5E7EB" strokeDasharray="2 3"/>
      <line x1="160" y1="50" x2="160" y2="162" stroke="#E5E7EB" strokeDasharray="2 3"/>
      <circle cx="105" cy="80"  r="10" fill="#5E6AD2" opacity=".75"/>
      <circle cx="215" cy="70"  r="14" fill="#D97757"/>
      <circle cx="240" cy="128" r="8"  fill="#9CA3AF" opacity=".7"/>
      <circle cx="80"  cy="140" r="6"  fill="#9CA3AF" opacity=".5"/>
      <circle cx="180" cy="110" r="7"  fill="#047857" opacity=".7"/>
    </svg>
  ),
  // brief / memo
  memo: (
    <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="180" fill="#FBF8F2"/>
      <rect x="20" y="18" width="80" height="8" rx="2" fill="#111827" opacity=".82"/>
      <rect x="20" y="30" width="140" height="5" rx="2" fill="#AD5F45" opacity=".6"/>
      {Array.from({ length: 9 }).map((_, i) => (
        <rect key={i} x="20" y={52 + i * 12} width={i % 3 === 2 ? 180 : 280} height="5" rx="2" fill="#6B7280" opacity={i % 4 === 0 ? .7 : .35}/>
      ))}
    </svg>
  ),
};

const REPORTS = [
  { id: 'disco',     title: 'DISCO — diligence debrief',      thumb: 'diligence', status: 'verified',     branches: 6, sources: 24, savedAgo: '2h ago',  deltaNew: 3,
    summary: 'Early-stage legal tech. $100M Series C, 2,400+ customers, strong growth signal but regulatory headwinds in EU.' },
  { id: 'mercor',    title: 'Mercor — hiring velocity',       thumb: 'bars',      status: 'verified',     branches: 4, sources: 18, savedAgo: '1d ago',  deltaNew: 5,
    summary: 'Hiring 22 eng roles in Q1, heavy focus on infra/reliability. Signals Series B prep around Q3.' },
  { id: 'cognition', title: 'Cognition — devin postmortem',   thumb: 'table',     status: 'needs_review', branches: 8, sources: 31, savedAgo: '3d ago',  deltaNew: 0,
    summary: 'Analysis of public benchmarks vs. reported performance. Two claims pending verification from independent reruns.' },
  { id: 'turing',    title: 'Turing — contract spend YoY',    thumb: 'line',      status: 'verified',     branches: 3, sources: 12, savedAgo: '1w ago',  deltaNew: 1,
    summary: 'Mapped disclosed enterprise customers to quarterly filings. Growth 38% YoY, concentration in FS remains a risk.' },
  { id: 'anthropic', title: 'Anthropic — safety framework',   thumb: 'memo',      status: 'verified',     branches: 2, sources: 9,  savedAgo: '2w ago',  deltaNew: 3,
    summary: 'Read-through of the v2.3 responsible scaling policy. Tied to two saved reports on foundation-model governance.' },
  { id: 'foundation',title: 'Foundation labs — positioning',  thumb: 'matrix',    status: 'needs_review', branches: 5, sources: 22, savedAgo: '3w ago',  deltaNew: 0,
    summary: 'Competitive map across 8 labs on (safety posture × enterprise readiness). Two positions are still provisional.' },
];

function ReportCard({ report, watched, onWatch, view, onOpen }) {
  const { Check, Eye, FileText } = window.NBIcon;
  const Preview = Thumbnails[report.thumb] || Thumbnails.memo;

  if (view === 'grid') {
    return (
      <article className="nb-rcard" onClick={() => onOpen?.(report.id)}>
        <div className="nb-rcard-thumb">
          <div className="nb-rcard-thumb-overlay">
            {report.status === 'verified'     && <span className="nb-badge nb-badge-success"><Check width={10} height={10}/>verified</span>}
            {report.status === 'needs_review' && <span className="nb-badge nb-badge-warn">needs review</span>}
            {report.deltaNew > 0 && (
              <span className="nb-badge nb-badge-accent" style={{ marginLeft: 'auto' }}>
                +{report.deltaNew} new
              </span>
            )}
          </div>
          {Preview}
        </div>
        <div className="nb-rcard-body">
          <div className="nb-rcard-title">{report.title}</div>
          <div className="nb-rcard-sub">{report.summary}</div>
          <div className="nb-rcard-foot">
            <span>{report.branches} branches</span>
            <span>·</span>
            <span>{report.sources} sources</span>
            <span>·</span>
            <span>{report.savedAgo}</span>
            <button className="nb-rcard-watch" data-on={watched}
                    onClick={(e) => { e.stopPropagation(); onWatch(report.id); }}>
              <Eye width={11} height={11}/>{watched ? 'Watching' : 'Watch'}
            </button>
          </div>
        </div>
      </article>
    );
  }

  // LIST
  return (
    <article className="nb-panel nb-hover-lift" onClick={() => onOpen?.(report.id)}
             style={{ padding: 14, display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 14, cursor: 'pointer', alignItems: 'center' }}>
      <div style={{ aspectRatio: '16 / 9', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        {Preview}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>{report.title}</div>
          {report.status === 'verified'     && <span className="nb-badge nb-badge-success"><Check width={10} height={10}/>verified</span>}
          {report.status === 'needs_review' && <span className="nb-badge nb-badge-warn">needs review</span>}
          {report.deltaNew > 0 && <span className="nb-badge nb-badge-accent">+{report.deltaNew} new</span>}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 6 }}>{report.summary}</div>
        <div style={{ display: 'flex', gap: 10, fontSize: 10.5, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
          <span>{report.branches} branches</span>
          <span>· {report.sources} sources</span>
          <span>· saved {report.savedAgo}</span>
        </div>
      </div>
      <button className="nb-rcard-watch" data-on={watched}
              onClick={(e) => { e.stopPropagation(); onWatch(report.id); }}>
        <Eye width={11} height={11}/>{watched ? 'Watching' : 'Watch'}
      </button>
    </article>
  );
}

function ReportsSurface({ tweaks, onOpenReport, onLayoutExplorer, onWorkspaceMemory, onProposedChanges }) {
  const { Grid, List, Sparkles, Book, GitPullRequest } = window.NBIcon;
  const [watched, setWatched] = React.useState(new Set(['disco', 'turing']));
  const [filter, setFilter] = React.useState('all');
  const [view, setView] = React.useState((tweaks && tweaks.reportsView) || 'grid');

  // Keep view in sync if tweaks change view externally
  React.useEffect(() => {
    if (tweaks && tweaks.reportsView && tweaks.reportsView !== view) setView(tweaks.reportsView);
  }, [tweaks?.reportsView]);

  function toggle(id) {
    setWatched(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const visible = React.useMemo(() => {
    if (filter === 'all')      return REPORTS;
    if (filter === 'verified') return REPORTS.filter(r => r.status === 'verified');
    if (filter === 'review')   return REPORTS.filter(r => r.status === 'needs_review');
    if (filter === 'watching') return REPORTS.filter(r => watched.has(r.id));
    return REPORTS;
  }, [filter, watched]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>Reports</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {REPORTS.length} saved. Saved answers behave like reusable memory — Inbox pings when they shift.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {onLayoutExplorer && (
              <button className="nb-btn nb-btn-secondary" onClick={onLayoutExplorer} style={{ fontSize: 12 }}>
                <Sparkles width={12} height={12}/> Compare detail layouts
              </button>
            )}
            {onWorkspaceMemory && (
              <button className="nb-btn nb-btn-ghost" onClick={onWorkspaceMemory} style={{ fontSize: 12 }}>
                <Book width={12} height={12}/> Workspace memory
              </button>
            )}
            {onProposedChanges && (
              <button className="nb-btn nb-btn-ghost" onClick={onProposedChanges} style={{ fontSize: 12 }}>
                <GitPullRequest width={12} height={12}/> Proposed changes
                <span style={{ marginLeft: 4, fontSize: 9.5, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-primary)', background: 'var(--accent-primary-tint)', padding: '1px 5px', borderRadius: 4 }}>22</span>
              </button>
            )}
          </div>
        </div>
        <div className="nb-reports-toolbar">
          <div className="nb-inbox-filter" role="tablist" aria-label="Filter">
            {[
              { k: 'all',      label: 'All',      count: REPORTS.length },
              { k: 'verified', label: 'Verified', count: REPORTS.filter(r => r.status === 'verified').length },
              { k: 'review',   label: 'Review',   count: REPORTS.filter(r => r.status === 'needs_review').length },
              { k: 'watching', label: 'Watching', count: watched.size },
            ].map(f => (
              <button key={f.k} data-active={filter === f.k} onClick={() => setFilter(f.k)}>
                {f.label}<span className="count">{f.count}</span>
              </button>
            ))}
          </div>
          <div className="nb-view-toggle">
            <button data-active={view === 'grid'} onClick={() => setView('grid')} title="Grid view">
              <Grid width={12} height={12}/> Grid
            </button>
            <button data-active={view === 'list'} onClick={() => setView('list')} title="List view">
              <List width={12} height={12}/> List
            </button>
          </div>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="nb-reports-grid nb-reveal-stagger" data-cols="3">
          {visible.map(r => (
            <ReportCard key={r.id} report={r} watched={watched.has(r.id)} onWatch={toggle} view="grid" onOpen={onOpenReport}/>
          ))}
        </div>
      ) : (
        <div className="nb-reveal-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map(r => (
            <ReportCard key={r.id} report={r} watched={watched.has(r.id)} onWatch={toggle} view="list" onOpen={onOpenReport}/>
          ))}
        </div>
      )}

      {visible.length === 0 && (
        <div className="nb-panel" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No reports match this filter yet.
        </div>
      )}
    </div>
  );
}

window.NBReportCard = ReportCard;
window.NBReportsSurface = ReportsSurface;
