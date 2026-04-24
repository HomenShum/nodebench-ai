// Nudges — timeline of "something meaningful changed about an entity you watch"
function NudgeList() {
  const { X, Sparkles, ExternalLink } = window.NBIcon;
  const [items, setItems] = React.useState([
    { id: 'n1', when: 'just now',   entity: 'DISCO',   title: 'Announced GA of native SOC 2 Type II in EU',
      body: 'Addresses the regulatory risk flagged in your Nov 14 run. Worth a re-run?', level: 'accent' },
    { id: 'n2', when: '2h ago',     entity: 'Mercor',  title: 'Posted 7 new eng roles in 24h — infra heavy',
      body: 'Consistent with the Series B prep hypothesis. Related: 3 new stealth hires on LinkedIn.', level: 'accent' },
    { id: 'n3', when: 'yesterday', entity: 'Cognition', title: 'New benchmark rerun — two claims now verified',
      body: 'Your "needs_review" report can be promoted to verified. Open report →', level: 'success' },
    { id: 'n4', when: '3d ago',    entity: 'Turing',   title: 'Quarterly filing updated',
      body: 'No material change to contract spend. We bumped the data in your saved report.', level: 'muted' },
  ]);

  function dismiss(id) { setItems(items.filter(x => x.id !== id)); }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>Nudges</h1>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Return at the right moment, when something meaningful changes.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="nb-reveal-stagger">
        {items.length === 0 && (
          <div className="nb-panel" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            All caught up. New nudges arrive when your watched entities move.
          </div>
        )}
        {items.map(n => {
          const accent = n.level === 'accent';
          const success = n.level === 'success';
          return (
            <div key={n.id} className="nb-panel" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start',
              borderLeft: accent ? '3px solid var(--accent-primary)' : success ? '3px solid var(--success)' : '3px solid var(--border-default)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: accent ? 'var(--accent-primary-tint)' : success ? 'rgba(5,150,105,.1)' : 'var(--bg-secondary)',
                color:       accent ? 'var(--accent-primary)'     : success ? 'var(--success)'     : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles width={14} height={14}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-ink)', background: 'var(--accent-primary-tint)',
                    padding: '1px 7px', borderRadius: 999, border: '1px solid var(--accent-primary-border)' }}>{n.entity}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{n.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>{n.when}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{n.body}</div>
              </div>
              <button className="nb-btn nb-btn-ghost" onClick={() => dismiss(n.id)}
                style={{ width: 26, height: 26, padding: 0, justifyContent: 'center', borderRadius: 999 }}>
                <X width={13} height={13}/>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.NBNudgeList = NudgeList;
