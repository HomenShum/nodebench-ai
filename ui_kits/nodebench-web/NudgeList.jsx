// Inbox — the "return at the right moment" surface.
// Every row is ACTIONABLE: act now, re-run the report, snooze, dismiss, open entity.
// Priority is visible: act (orange), watch (indigo), auto (green — we did it for you), fyi (muted).

const INBOX_SEED = [
  {
    id: 'n1',
    when: 'just now',
    entity: 'DISCO',
    priority: 'act',
    icon: 'Zap',
    title: 'Announced GA of native SOC 2 Type II in EU',
    body: 'Addresses the regulatory risk flagged in your Nov 14 run. This is material — your "needs_review" stance likely flips.',
    actions: ['rerun', 'open', 'snooze', 'dismiss'],
    meta: { report: 'DISCO — diligence debrief', deltaSources: 3 },
  },
  {
    id: 'n2',
    when: '2h ago',
    entity: 'Mercor',
    priority: 'act',
    icon: 'Zap',
    title: 'Posted 7 new eng roles in 24h — infra heavy',
    body: 'Consistent with the Series B prep hypothesis. 3 new stealth hires on LinkedIn reinforce it.',
    actions: ['rerun', 'open', 'snooze', 'dismiss'],
    meta: { report: 'Mercor — hiring velocity', deltaSources: 5 },
  },
  {
    id: 'n3',
    when: 'yesterday',
    entity: 'Cognition',
    priority: 'auto',
    icon: 'Check',
    title: 'Two claims verified — we promoted the report',
    body: 'Independent benchmark rerun landed. The report moved from needs_review to verified automatically.',
    actions: ['open', 'undo', 'dismiss'],
    meta: { report: 'Cognition — devin postmortem', deltaSources: 2 },
  },
  {
    id: 'n4',
    when: 'yesterday',
    entity: 'Anthropic',
    priority: 'watch',
    icon: 'Eye',
    title: 'New safety framework doc (v2.3) published',
    body: 'Not on any saved report, but in your notebook. Want me to draft a brief?',
    actions: ['draft', 'watch', 'dismiss'],
    meta: { report: null, deltaSources: 1 },
  },
  {
    id: 'n5',
    when: '3d ago',
    entity: 'Turing',
    priority: 'fyi',
    icon: 'Repeat',
    title: 'Quarterly filing updated — no material change',
    body: 'We refreshed the numbers in your saved report. Contract spend trend unchanged.',
    actions: ['open', 'dismiss'],
    meta: { report: 'Turing — contract spend YoY', deltaSources: 1 },
  },
];

const PRIORITY_ORDER = { act: 0, auto: 1, watch: 2, fyi: 3 };

function Inbox() {
  const I = window.NBIcon;
  const [items, setItems] = React.useState(INBOX_SEED);
  const [filter, setFilter] = React.useState('all');
  const [snoozed, setSnoozed] = React.useState({}); // id -> minutes

  const counts = React.useMemo(() => ({
    all: items.length,
    act: items.filter(i => i.priority === 'act').length,
    auto: items.filter(i => i.priority === 'auto').length,
    watch: items.filter(i => i.priority === 'watch').length,
  }), [items]);

  const visible = React.useMemo(() => {
    const base = filter === 'all' ? items : items.filter(i => i.priority === filter);
    return [...base].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [items, filter]);

  function act(id, action) {
    if (action === 'dismiss') {
      setItems(prev => prev.filter(i => i.id !== id));
    } else if (action === 'snooze') {
      setSnoozed(s => ({ ...s, [id]: 60 }));
      setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 320);
    }
    // Other actions (rerun/open/draft/undo/watch) would route out of this surface;
    // here we leave the item in place so the demo shows the affordance.
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="nb-inbox-head">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>Inbox</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Return at the right moment — only when something meaningful changed about an entity you watch.
          </div>
        </div>
        <div className="nb-inbox-filter" role="tablist" aria-label="Inbox filters">
          {[
            { k: 'all',   label: 'All',        count: counts.all   },
            { k: 'act',   label: 'Act',        count: counts.act   },
            { k: 'auto',  label: 'Auto',       count: counts.auto  },
            { k: 'watch', label: 'Watching',   count: counts.watch },
          ].map(f => (
            <button key={f.k} data-active={filter === f.k} onClick={() => setFilter(f.k)}>
              {f.label}<span className="count">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 && (
        <div className="nb-panel" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>✓</div>
          All caught up. New items arrive when your watched entities move.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="nb-reveal-stagger">
        {visible.map(n => {
          const IconC = I[n.icon] || I.Sparkles;
          const isSnoozing = snoozed[n.id] !== undefined;
          return (
            <div key={n.id} className="nb-ibx-row" data-priority={n.priority}
                 style={{ opacity: isSnoozing ? 0.3 : 1, transform: isSnoozing ? 'translateX(24px)' : 'none' }}>
              <div className="nb-ibx-icon"><IconC width={15} height={15}/></div>

              <div className="nb-ibx-body">
                <div className="nb-ibx-top">
                  <span className="nb-ibx-entity">{n.entity}</span>
                  <span className="nb-ibx-title">{n.title}</span>
                  <span className="nb-ibx-when">{n.when}</span>
                </div>
                <div className="nb-ibx-msg">{n.body}</div>

                <div className="nb-ibx-actions">
                  {n.actions.includes('rerun') && (
                    <button className="primary" onClick={() => act(n.id, 'rerun')}>
                      <I.Repeat width={11} height={11}/> Re-run report
                    </button>
                  )}
                  {n.actions.includes('draft') && (
                    <button className="primary" onClick={() => act(n.id, 'draft')}>
                      <I.Sparkles width={11} height={11}/> Draft brief
                    </button>
                  )}
                  {n.actions.includes('open') && n.meta.report && (
                    <button onClick={() => act(n.id, 'open')}>
                      <I.FileText width={11} height={11}/> Open {n.meta.report.split('—')[0].trim()}
                    </button>
                  )}
                  {n.actions.includes('watch') && (
                    <button onClick={() => act(n.id, 'watch')}>
                      <I.Eye width={11} height={11}/> Watch {n.entity}
                    </button>
                  )}
                  {n.actions.includes('undo') && (
                    <button onClick={() => act(n.id, 'undo')}>Undo auto-promote</button>
                  )}
                  {n.actions.includes('snooze') && (
                    <button className="ghost" onClick={() => act(n.id, 'snooze')}>
                      <I.Clock width={11} height={11}/> Snooze 1h
                    </button>
                  )}
                  {n.actions.includes('dismiss') && (
                    <button className="ghost" onClick={() => act(n.id, 'dismiss')} aria-label="Dismiss">
                      <I.X width={11} height={11}/> Dismiss
                    </button>
                  )}
                </div>
              </div>

              <div className="nb-ibx-side">
                <span className="nb-ibx-priority" data-k={n.priority}>
                  {n.priority === 'act' ? 'act now' : n.priority === 'auto' ? 'auto-handled' : n.priority === 'watch' ? 'watching' : 'fyi'}
                </span>
                {n.meta.deltaSources > 0 && (
                  <span style={{ fontSize: 10.5, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                    +{n.meta.deltaSources} source{n.meta.deltaSources > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.NBNudgeList = Inbox;
