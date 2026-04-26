// ReportDetail — opens when user clicks a Reports card.
// Single component, three layout variants:
//   1. three-pane: left outline · center notebook · right inspector
//   2. two-pane:   center notebook · right inspector (with collapsible tabs)
//   3. notion:     single-column notebook + floating drawer for trace/proposals
//
// All variants share:
//   - Header with back/breadcrumb/actions
//   - Notebook with slash + selection menus, citations, claim blocks
//   - Inline run-traces interspersed in the notebook
//   - Always-on inspector with tabs: Trace · Sources · Entities · Proposals
//   - Proposed Changes sidebar with bulk accept/reject

function ReportDetail({ layout = 'three-pane', report, onBack, embedded = false, width = 'wide', onSetWidth }) {
  const I = window.NBIcon;
  const r = report || window.RD_REPORT;

  const [activeSection, setActiveSection] = React.useState('s-summary');
  const [insp,          setInsp]          = React.useState('proposals');
  const [proposals,     setProposals]     = React.useState(window.RD_PROPOSALS);
  const [feed,          setFeed]          = React.useState(window.RD_FEED);
  const [drawerOpen,    setDrawerOpen]    = React.useState(layout === 'notion');
  const [actionToast,   setActionToast]   = React.useState(null);
  const [leftCollapsed,  setLeftCollapsed]  = React.useState(true);
  const [rightCollapsed, setRightCollapsed] = React.useState(true);

  // Live feed: shift the "active" event after a short delay so it feels alive.
  React.useEffect(() => {
    const t = setTimeout(() => {
      setFeed(f => f.map((e, i) => i === 0 ? { ...e, state: 'ok', age: '1s' } : e));
    }, 2400);
    return () => clearTimeout(t);
  }, []);

  function accept(id) {
    setProposals(p => p.filter(x => x.id !== id));
    setActionToast('Applied');
    setTimeout(() => setActionToast(null), 1400);
  }
  function reject(id) {
    setProposals(p => p.filter(x => x.id !== id));
    setActionToast('Dismissed');
    setTimeout(() => setActionToast(null), 1400);
  }
  function acceptAll() { setProposals([]); setActionToast(`Applied ${proposals.length}`); setTimeout(() => setActionToast(null), 1400); }
  function rejectAll() { setProposals([]); setActionToast('Dismissed all');             setTimeout(() => setActionToast(null), 1400); }

  function handleNotebookAction(payload) {
    if (payload.type === 'slash') {
      setActionToast(`Inserted ${payload.command.label}`);
    } else if (payload.type === 'selection') {
      setActionToast(`${payload.action.label} → "${(payload.text || '').slice(0, 28)}${payload.text?.length > 28 ? '…' : ''}"`);
    }
    setTimeout(() => setActionToast(null), 1600);
  }

  function handleEntityClick(s) { setActionToast(`Open entity · ${s.label}`); setTimeout(() => setActionToast(null), 1400); }
  function handleCiteClick(n)   { setInsp('sources'); setActionToast(`Source [${n}]`); setTimeout(() => setActionToast(null), 1400); }

  function gotoSection(id) {
    setActiveSection(id);
    const root = document.querySelector(`[data-rd-board="${layout}"]`) || document;
    const el = root.querySelector?.(`#${CSS.escape(id)}`);
    el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="nb-rdetail" data-layout={layout} data-rd-board={layout}
         data-left-collapsed={leftCollapsed}
         data-right-collapsed={rightCollapsed}>
      {/* Scrim — closes any open rail. Mirrors the Chat surface pattern. */}
      {(!leftCollapsed || !rightCollapsed) && (
        <div className="nb-rdetail-scrim"
             onClick={() => { setLeftCollapsed(true); setRightCollapsed(true); }}/>
      )}
      {/* ─── Header ─── */}
      <header className="nb-rdetail-header">
        {!embedded && (
          <button className="nb-rdetail-back" onClick={onBack} aria-label="Back to reports"><I.ChevronDown width={14} height={14} style={{ transform: 'rotate(90deg)' }}/></button>
        )}
        {layout === 'three-pane' && (
          <button className="nb-rail-toggle"
                  onClick={() => setLeftCollapsed(v => !v)}
                  aria-label="Toggle outline"
                  data-active={!leftCollapsed}
                  title="Outline">
            <I.PanelLeft width={14} height={14}/>
          </button>
        )}
        <div className="nb-rdetail-crumbs">
          <span>Reports</span>
          <span className="sep">/</span>
          <span>Diligence</span>
          <span className="sep">/</span>
          <strong>{r.title}</strong>
        </div>
        <div className="nb-rdetail-actions">
          <button className="nb-rdetail-action" title="Auto-refreshes when watched sources change. Last checked 4m ago.">
            <span className="nb-rdetail-action-pulse"/>
            Live
            <span className="nb-rdetail-action-sub">· 4m ago</span>
          </button>
          <button className="nb-rdetail-action" title="Re-run all queries against current sources. ~$0.04, 12s.">
            <I.Sparkles width={12} height={12}/>Re-run
          </button>
          <button className="nb-rdetail-action" data-primary="true" title="Ask the agent to extend, verify, or transform this report.">
            <I.Plus width={12} height={12}/>Ask agent
          </button>
        </div>
        {layout !== 'notion' && (
          <button className="nb-rail-toggle"
                  onClick={() => setRightCollapsed(v => !v)}
                  aria-label="Toggle inspector"
                  data-active={!rightCollapsed}
                  title="Inspector">
            <I.PanelRight width={14} height={14}/>
          </button>
        )}
      </header>

      {/* ─── Left outline (three-pane only) ─── */}
      {layout === 'three-pane' && (
        <aside className="nb-rdetail-outline">
          <div className="nb-rdetail-outline-h">In this report</div>
          {window.RD_OUTLINE.map(item => (
            <div
              key={item.id}
              className="nb-rdetail-outline-item"
              data-active={activeSection === item.id}
              data-depth={item.depth}
              onClick={() => gotoSection(item.id)}
            >
              {item.n && <span className="num">{item.n}</span>}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
              {item.flavor && <span className="nb-rdetail-outline-pill" data-flavor={item.flavor}>{item.flavor}</span>}
            </div>
          ))}

          <div className="nb-rdetail-outline-h" style={{ marginTop: 14 }}>Linked from</div>
          {[
            { l: 'Anthropic — safety framework', n: 1 },
            { l: 'Voice-agent eval (state)',     n: 2 },
            { l: 'Disrupt 2026 event report',    n: 3 },
          ].map((x, i) => (
            <div key={i} className="nb-rdetail-outline-item" data-depth={2} style={{ paddingLeft: 8 }}>
              <I.FileText width={11} height={11} style={{ color: 'var(--text-faint)', flexShrink: 0 }}/>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.l}</span>
            </div>
          ))}
        </aside>
      )}

      {/* ─── Center notebook ─── */}
      <main className="nb-rdetail-center">
        <window.NBNotebook
          blocks={window.RD_BLOCKS}
          onEntityClick={handleEntityClick}
          onCiteClick={handleCiteClick}
          onAction={handleNotebookAction}
        />
      </main>

      {/* ─── Right inspector (three-pane + two-pane) ─── */}
      {layout !== 'notion' && (
        <aside className="nb-rdetail-right">
          <div className="nb-insp-tabs" role="tablist">
            {[
              { k: 'proposals', label: 'Proposed', count: proposals.length },
              { k: 'trace',     label: 'Trace',    count: feed.length      },
              { k: 'sources',   label: 'Sources',  count: window.RD_SOURCES.length },
              { k: 'entities',  label: 'Entities', count: window.RD_ENTITIES.length },
            ].map(t => (
              <button key={t.k} data-active={insp === t.k} onClick={() => setInsp(t.k)}>
                {t.label}<span className="pill">{t.count}</span>
              </button>
            ))}
          </div>
          <div className="nb-insp-body">
            {insp === 'proposals' && <ProposalsPanel proposals={proposals} onAccept={accept} onReject={reject} onAcceptAll={acceptAll} onRejectAll={rejectAll}/>}
            {insp === 'trace'     && <TracePanel feed={feed}/>}
            {insp === 'sources'   && <SourcesPanel/>}
            {insp === 'entities'  && <EntitiesPanel/>}
          </div>
        </aside>
      )}

      {/* ─── Notion variant: floating drawer + FAB ─── */}
      {layout === 'notion' && (
        <>
          {drawerOpen && (
            <div className="nb-floating-drawer">
              <div className="nb-floating-drawer-h">
                <span className="pulse"/>
                <span>Live</span>
                <button className="x" onClick={() => setDrawerOpen(false)} aria-label="Close"><I.X width={11} height={11}/></button>
              </div>
              <div className="nb-insp-tabs">
                {[
                  { k: 'proposals', label: 'Proposed', count: proposals.length },
                  { k: 'trace',     label: 'Trace',    count: feed.length      },
                ].map(t => (
                  <button key={t.k} data-active={insp === t.k} onClick={() => setInsp(t.k)}>
                    {t.label}<span className="pill">{t.count}</span>
                  </button>
                ))}
              </div>
              <div className="nb-insp-body" style={{ flex: 1 }}>
                {insp === 'proposals' && <ProposalsPanel proposals={proposals} onAccept={accept} onReject={reject} onAcceptAll={acceptAll} onRejectAll={rejectAll}/>}
                {insp !== 'proposals' && <TracePanel feed={feed}/>}
              </div>
            </div>
          )}
          {!drawerOpen && (
            <div className="nb-fab">
              <button onClick={() => { setDrawerOpen(true); setInsp('proposals'); }}>
                <I.Sparkles width={13} height={13}/>
                Proposed changes
                <span className="count">{proposals.length}</span>
              </button>
              <button onClick={() => { setDrawerOpen(true); setInsp('trace'); }}>
                <I.Bell width={13} height={13}/>
                Live trace
              </button>
            </div>
          )}
        </>
      )}

      {actionToast && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 28, transform: 'translateX(-50%)',
          padding: '8px 14px',
          background: 'var(--text-primary)',
          color: '#FFF',
          fontSize: 12, fontWeight: 500,
          borderRadius: 999,
          boxShadow: '0 6px 20px rgba(0,0,0,.18)',
          zIndex: 50,
        }}>
          {actionToast}
        </div>
      )}
    </div>
  );
}

/* ────────── Inspector panels ────────── */
function ProposalsPanel({ proposals, onAccept, onReject, onAcceptAll, onRejectAll }) {
  if (!proposals.length) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
        <div style={{ fontSize: 22, marginBottom: 6 }}>✓</div>
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No pending changes</div>
        <div>NodeBench will queue proposals here when an action runs.</div>
      </div>
    );
  }
  return (
    <section>
      <div className="nb-insp-h">Proposed changes ({proposals.length})</div>
      <div className="nb-proposal-bulk">
        <span className="lbl">Apply all? Each is reversible for 24h.</span>
        <button onClick={onRejectAll}>Reject all</button>
        <button className="yes-all" onClick={onAcceptAll}>Accept all</button>
      </div>
      {proposals.map(p => (
        <div key={p.id} className="nb-proposal" data-kind={p.kind}>
          <div className="nb-proposal-h">
            <span className="kind">{p.kind}</span>
            <span>→ {p.blockTarget}</span>
          </div>
          <div className="nb-proposal-summary">{p.summary}</div>
          <div className="nb-proposal-detail">{p.detail}</div>
          <div className="nb-proposal-actions">
            <button onClick={() => onReject(p.id)}>Reject</button>
            <button className="yes" onClick={() => onAccept(p.id)}>Accept</button>
          </div>
        </div>
      ))}
    </section>
  );
}

function TracePanel({ feed }) {
  return (
    <section>
      <div className="nb-insp-h">Live agent feed</div>
      <div className="nb-feed">
        {feed.map(e => (
          <div key={e.id} className="nb-feed-event" data-state={e.state}>
            <div className="pip"/>
            <div style={{ minWidth: 0 }}>
              <div className="lbl">{e.label}</div>
              <div className="meta"><code>{e.meta}</code></div>
            </div>
            <div className="age">{e.age}</div>
          </div>
        ))}
      </div>
      <div className="nb-insp-h" style={{ marginTop: 18 }}>Budget · this run</div>
      <div style={{ display: 'grid', gap: 6, fontSize: 11.5, color: 'var(--text-secondary)' }}>
        <BudgetBar label="Memory hits"   used={12} total={12} flavor="success"/>
        <BudgetBar label="Cache reuses"  used={9}  total={9}  flavor="success"/>
        <BudgetBar label="Live calls"    used={1}  total={5}  flavor="warn"/>
        <BudgetBar label="Tokens"        used={4200} total={20000} flavor="default" unit=""/>
      </div>
    </section>
  );
}
function BudgetBar({ label, used, total, flavor, unit }) {
  const pct = Math.round((used / total) * 100);
  const col = flavor === 'success' ? 'var(--success)' : flavor === 'warn' ? 'var(--warning)' : 'var(--indigo)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10.5, marginBottom: 3 }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ color: 'var(--text-primary)' }}>{used.toLocaleString()}{unit !== undefined ? unit : ''} / {total.toLocaleString()}</span>
      </div>
      <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: col, transition: 'width 280ms' }}/>
      </div>
    </div>
  );
}

function SourcesPanel() {
  const I = window.NBIcon;
  return (
    <section>
      <div className="nb-insp-h">Sources ({window.RD_SOURCES.length})</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {window.RD_SOURCES.map(s => (
          <div key={s.n} style={{
            display: 'grid', gridTemplateColumns: '22px 1fr auto', gap: 8,
            padding: 8,
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            background: 'var(--bg-surface)',
            alignItems: 'flex-start',
          }}>
            <span className="cite" style={{
              minWidth: 18, height: 18, padding: '0 5px',
              background: 'var(--accent-primary-tint)', color: 'var(--accent-ink)',
              borderColor: 'var(--accent-primary-border)',
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
              borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid',
            }}>{s.n}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{s.title}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                {s.kind} · {s.pub} · {s.date}
              </div>
            </div>
            {s.cached && <span title="Cached" style={{ fontSize: 9.5, color: 'var(--success)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>CACHED</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

function EntitiesPanel() {
  return (
    <section>
      <div className="nb-insp-h">Entities mentioned</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {window.RD_ENTITIES.map(e => (
          <div key={e.id} style={{
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 8,
            padding: '6px 10px',
            borderRadius: 6,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            alignItems: 'center',
            cursor: 'pointer',
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{e.label}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{e.kind}</div>
            </div>
            <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{e.mentions}×</span>
          </div>
        ))}
      </div>
      <div className="nb-insp-h" style={{ marginTop: 18 }}>Relationships</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5 }}>
        {[
          ['DISCO',     'COMPETES_WITH', 'Relativity'],
          ['DISCO',     'COMPETES_WITH', 'voice-agent eval'],
          ['Kiwi Camara','FOUNDED',      'DISCO'],
          ['Anita Park','WORKS_AT',      'DISCO'],
          ['DISCO',     'MENTIONED_IN',  'Disrupt 2026'],
        ].map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
          }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r[0]}</span>
            <code style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 3, background: 'rgba(94,106,210,.10)', color: '#4853A6', fontFamily: 'var(--font-mono)' }}>{r[1]}</code>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r[2]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

window.NBReportDetail = ReportDetail;
