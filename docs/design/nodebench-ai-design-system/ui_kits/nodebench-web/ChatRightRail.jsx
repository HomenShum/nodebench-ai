// ChatRightRail — the right-rail card stack.
// Tabs: Entity · Graph · Sources · Threads · Report
// All cards stay alive (memoized state) so switching tabs doesn't lose context.

function ChatRightRail({ rootEntityId, onPromote, onPeek, allSources, priorThreads, report, onOpenReport }) {
  const I = window.NBIcon;
  const [tab, setTab] = React.useState('entity');
  const card = window.NBEntityCards[rootEntityId];

  const tabs = [
    { id: 'entity',  label: 'Entity'  },
    { id: 'graph',   label: 'Graph'   },
    { id: 'sources', label: 'Sources' },
    { id: 'threads', label: 'Threads' },
    { id: 'report',  label: 'Report'  },
  ];

  return (
    <aside className="nb-rail">
      <div className="nb-rail-tabs" role="tablist">
        {tabs.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id}
                  className="nb-rail-tab" data-active={tab === t.id}
                  onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="nb-rail-body">
        {tab === 'entity'  && <EntityPane card={card} onPromote={onPromote} onPeek={onPeek}/>}
        {tab === 'graph'   && <GraphPane root={card} onPeek={onPeek}/>}
        {tab === 'sources' && <SourcesPane sources={allSources}/>}
        {tab === 'threads' && <ThreadsPane threads={priorThreads}/>}
        {tab === 'report'  && <ReportPane report={report} onOpenReport={onOpenReport}/>}
      </div>
    </aside>
  );
}

// ─── Entity pane ──────────────────────────────────────────────────────
function EntityPane({ card, onPromote, onPeek }) {
  const I = window.NBIcon;
  if (!card) {
    return <div className="nb-rail-empty">No entity in focus yet — pin one or ask about a company/person to populate this card.</div>;
  }
  return (
    <div className="nb-rail-card">
      <div className="nb-ec-head">
        <div className="nb-ec-avatar" data-kind={card.kind}>{kindGlyph(card.kind)}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="nb-ec-name">{card.name}</div>
          <div className="nb-ec-tagline">{card.tagline}</div>
        </div>
        <span className="nb-ec-kind" data-kind={card.kind}>{card.kind}</span>
      </div>

      {card.location && (
        <div className="nb-ec-meta">{card.location}{card.fundedRound ? ' · ' + card.fundedRound + ' · ' + card.fundedAmount : ''}</div>
      )}

      <div className="nb-ec-section">
        <div className="nb-ec-h">Summary</div>
        <p className="nb-ec-p">{card.summary}</p>
      </div>

      {card.why && (
        <div className="nb-ec-section">
          <div className="nb-ec-h">Why this matters</div>
          <p className="nb-ec-p" style={{ color: 'var(--accent-ink)' }}>{card.why}</p>
        </div>
      )}

      {card.relations && card.relations.length > 0 && (
        <div className="nb-ec-section">
          <div className="nb-ec-h">Relationships · ring 1</div>
          <div className="nb-ec-rels">
            {card.relations.map(r => (
              <button key={r.id + r.label} className="nb-ec-rel" onClick={() => onPeek?.(r.id)}>
                <span className="d" data-kind={r.kind}/>
                <span className="lbl">{r.label}</span>
                <span className="rel">{r.rel}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="nb-ec-stats">
        <div><span className="n">{card.claims || 0}</span><span className="l">claims</span></div>
        <div><span className="n">{card.sources || 0}</span><span className="l">sources</span></div>
        <div><span className="n">{card.priorChats || 0}</span><span className="l">prior chats</span></div>
      </div>

      <div className="nb-ec-actions">
        <button className="nb-ec-btn primary" onClick={() => onPromote?.(card.id)}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          Promote to root
        </button>
        <button className="nb-ec-btn">Add to notebook</button>
        <button className="nb-ec-btn">Compare</button>
        <button className="nb-ec-btn">Export</button>
      </div>
    </div>
  );
}

// ─── Graph pane ──────────────────────────────────────────────────────
function GraphPane({ root, onPeek }) {
  if (!root) return <div className="nb-rail-empty">Pin an entity to see its first-ring graph.</div>;
  // Simple radial layout — root at center, ring-1 around it
  const w = 320, h = 280, cx = w / 2, cy = h / 2;
  const ring = root.relations || [];
  const r = 100;
  const positions = ring.map((rel, i) => {
    const angle = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
    return { ...rel, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });

  return (
    <div className="nb-rail-card">
      <div className="nb-ec-h" style={{ marginBottom: 6 }}>Graph · ring 1</div>
      <div className="nb-graph-wrap">
        <svg viewBox={`0 0 ${w} ${h}`} className="nb-graph-svg" preserveAspectRatio="xMidYMid meet">
          {/* edges */}
          {positions.map((p, i) => (
            <line key={'e' + i} x1={cx} y1={cy} x2={p.x} y2={p.y}
                  stroke="var(--border-default)" strokeWidth="1" strokeDasharray="2 3"/>
          ))}
          {/* root */}
          <g>
            <circle cx={cx} cy={cy} r="22" fill="var(--accent-primary)" />
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="var(--font-sans)">
              {kindGlyph(root.kind)}
            </text>
          </g>
          {/* ring-1 nodes */}
          {positions.map((p, i) => (
            <g key={'n' + i} className="nb-graph-node" onClick={() => onPeek?.(p.id)} style={{ cursor: 'pointer' }}>
              <circle cx={p.x} cy={p.y} r="14" fill={kindColor(p.kind)} stroke="var(--bg-surface)" strokeWidth="2"/>
              <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">
                {kindGlyph(p.kind)}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="nb-graph-legend">
        <span><span className="d" data-kind="company"/>Company</span>
        <span><span className="d" data-kind="person"/>Person</span>
        <span><span className="d" data-kind="theme"/>Theme</span>
        <span><span className="d" data-kind="event"/>Event</span>
      </div>
      <div className="nb-graph-footer">
        Open the full map in <strong>Workspace → Map</strong>
      </div>
    </div>
  );
}

// ─── Sources pane ────────────────────────────────────────────────────
function SourcesPane({ sources }) {
  if (!sources || sources.length === 0) return <div className="nb-rail-empty">No sources cited yet.</div>;
  return (
    <div className="nb-rail-card">
      <div className="nb-ec-h">{sources.length} sources cited</div>
      <div className="nb-rail-srcs">
        {sources.map(s => (
          <div key={s.n} className="nb-rail-src">
            <span className="n">{s.n}</span>
            <span className="fav">{s.fav}</span>
            <div className="body">
              <div className="ttl">{s.title}</div>
              <div className="dom">{s.domain}{s.age ? ' · ' + s.age : ''}{s.cached === false ? ' · live' : s.cached ? ' · cached' : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Threads pane ────────────────────────────────────────────────────
function ThreadsPane({ threads }) {
  if (!threads || threads.length === 0) return <div className="nb-rail-empty">No prior threads on this entity.</div>;
  return (
    <div className="nb-rail-card">
      <div className="nb-ec-h">Prior threads on this entity</div>
      <div className="nb-rail-threads">
        {threads.map(t => (
          <button key={t.id} className="nb-rail-thread">
            <div className="ttl">{t.title}</div>
            <div className="meta">{t.updatedAgo}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Report pane ─────────────────────────────────────────────────────
function ReportPane({ report, onOpenReport }) {
  if (!report) return <div className="nb-rail-empty">No report attached yet.</div>;
  return (
    <div className="nb-rail-card">
      <div className="nb-ec-h">Saving to report</div>
      <div className="nb-rail-report">
        <div className="ttl">{report.name}</div>
        <div className="status" data-state={report.status}>● {report.status}</div>
      </div>
      <div className="nb-rail-report-stats">
        <div><span className="n">{report.sectionsAdded}</span><span className="l">sections added</span></div>
        <div><span className="n">{report.claimsAdded}</span><span className="l">claims added</span></div>
        <div><span className="n">{report.followupsCreated}</span><span className="l">follow-ups</span></div>
      </div>
      <button className="nb-ec-btn primary" style={{ width: '100%', marginTop: 10 }} onClick={onOpenReport}>
        Open report notebook
      </button>
      <button className="nb-ec-btn" style={{ width: '100%', marginTop: 6 }}>Track updates</button>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────
function kindGlyph(kind) {
  return kind === 'company' ? '◧' : kind === 'person' ? '◉' : kind === 'theme' ? '✦' : kind === 'event' ? '◇' : '·';
}
function kindColor(kind) {
  return kind === 'company' ? '#5E6AD2'
       : kind === 'person'  ? '#0EA5E9'
       : kind === 'theme'   ? '#D97757'
       : kind === 'event'   ? '#10B981'
       :                      '#6B7280';
}

window.NBChatRightRail = ChatRightRail;
window.NBKindGlyph     = kindGlyph;
window.NBKindColor     = kindColor;
