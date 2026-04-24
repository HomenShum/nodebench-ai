// Saved reports list + report card pattern.
function ReportCard({ report, onWatch, watched }) {
  const { FileText, Eye, Check } = window.NBIcon;
  return (
    <div className="nb-panel nb-hover-lift" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--accent-primary-tint)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <FileText width={18} height={18}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>{report.title}</div>
          {report.status === 'verified' && <span className="nb-badge nb-badge-success"><Check width={10} height={10}/>verified</span>}
          {report.status === 'needs_review' && <span className="nb-badge nb-badge-warn">needs review</span>}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>{report.summary}</div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
          <span>{report.branches} branches</span>
          <span>· {report.sources} sources</span>
          <span>· saved {report.savedAgo}</span>
        </div>
      </div>
      <button onClick={() => onWatch(report.id)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          border: `1px solid ${watched ? 'var(--accent-primary-border)' : 'var(--border-default)'}`,
          background: watched ? 'var(--accent-primary-tint)' : 'rgba(255,255,255,.78)',
          color: watched ? 'var(--accent-ink)' : 'var(--text-muted)',
          fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
          transition: 'all 160ms var(--ease-out-expo)',
        }}>
        <Eye width={13} height={13}/>{watched ? 'Watching' : 'Watch'}
      </button>
    </div>
  );
}

function ReportsSurface() {
  const [watched, setWatched] = React.useState(new Set(['disco']));
  function toggle(id) {
    setWatched(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  const reports = [
    { id: 'disco', title: 'DISCO — diligence debrief', status: 'verified', branches: 6, sources: 24, savedAgo: '2h ago',
      summary: 'Early-stage legal tech. $100M Series C, 2,400+ customers, strong growth signal but regulatory headwinds in EU.' },
    { id: 'mercor', title: 'Mercor — hiring velocity', status: 'verified', branches: 4, sources: 18, savedAgo: '1d ago',
      summary: 'Hiring 22 eng roles in Q1, heavy focus on infra/reliability. Signals Series B prep around Q3.' },
    { id: 'cognition', title: 'Cognition — devin postmortem', status: 'needs_review', branches: 8, sources: 31, savedAgo: '3d ago',
      summary: 'Analysis of public benchmarks vs. reported performance. Two claims pending verification from independent reruns.' },
    { id: 'turing', title: 'Turing — contract spend YoY', status: 'verified', branches: 3, sources: 12, savedAgo: '1w ago',
      summary: 'Mapped disclosed enterprise customers to quarterly filings. Growth 38% YoY, concentration in FS remains a risk.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>Reports</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Saved answers behave like reusable memory.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="nb-btn nb-btn-secondary" style={{ fontSize: 12.5 }}>All</button>
          <button className="nb-btn nb-btn-ghost" style={{ fontSize: 12.5 }}>Verified</button>
          <button className="nb-btn nb-btn-ghost" style={{ fontSize: 12.5 }}>Watching</button>
        </div>
      </div>
      <div className="nb-reveal-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reports.map(r => <ReportCard key={r.id} report={r} watched={watched.has(r.id)} onWatch={toggle} />)}
      </div>
    </div>
  );
}

window.NBReportCard = ReportCard;
window.NBReportsSurface = ReportsSurface;
