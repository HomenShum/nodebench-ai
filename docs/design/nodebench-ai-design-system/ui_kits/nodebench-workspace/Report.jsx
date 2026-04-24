// Report surface — interactive Brief / Cards / Sources

function ReportSurface({ tweaks, tab, setTab, thread, setThread,
                         rootEntity, setRootEntity,
                         selectedCard, setSelectedCard,
                         sourceFilter, setSourceFilter,
                         expandedClaim, setExpandedClaim }) {
  const entity = {
    name: 'DISCO',
    initials: 'DI',
    meta: 'diligence · v3 · 2h ago',
    style: { background: 'linear-gradient(135deg, #1A365D, #0F4C81)' },
  };
  const tabs = [
    { id: 'chat',     label: 'Chat',     icon: 'chat' },
    { id: 'brief',    label: 'Brief',    icon: 'brief' },
    { id: 'cards',    label: 'Cards',    icon: 'cards',    count: 14 },
    { id: 'notebook', label: 'Notebook', icon: 'notebook' },
    { id: 'sources',  label: 'Sources',  icon: 'sources',  count: 24 },
    { id: 'map',      label: 'Map',      icon: 'map' },
  ];

  const showInspector = tweaks.inspector !== 'hidden' && !!selectedCard && tab === 'cards';
  const inspector = showInspector ? (
    <CardInspector card={selectedCard} onClose={() => setSelectedCard(null)}
                   onDrill={(id) => { setRootEntity(id); setSelectedCard(null); }} />
  ) : null;

  return (
    <window.WorkspaceShell
      tabs={tabs} active={tab} onTabChange={setTab}
      entity={entity}
      inspector={inspector}
    >
      {tab === 'brief'   && <BriefBody onJump={setTab} />}
      {tab === 'cards'   && <CardsBody rootId={rootEntity} setRootId={setRootEntity}
                                        selected={selectedCard} onSelect={setSelectedCard} />}
      {tab === 'sources' && <SourcesBody filter={sourceFilter} setFilter={setSourceFilter}
                                          expanded={expandedClaim} setExpanded={setExpandedClaim} />}
    </window.WorkspaceShell>
  );
}

// ── Brief ────────────────────────────────────────────────────────────
function BriefBody({ onJump }) {
  const [activeSection, setActiveSection] = React.useState('exec');
  const sections = [
    ['exec', 'Executive summary'],
    ['what', 'What happened'],
    ['so', 'So what'],
    ['now', 'Now what'],
    ['receipts', 'Receipts'],
    ['timeline', 'Timeline'],
    ['watch', 'Watch conditions'],
  ];
  return (
    <div className="brief-layout">
      <aside className="brief-toc">
        <div className="kicker" style={{ marginBottom: 10 }}>Contents</div>
        <nav className="brief-toc-list">
          {sections.map(([id, t]) => (
            <a key={id} className="brief-toc-item" data-active={activeSection === id}
               onClick={() => setActiveSection(id)}>{t}</a>
          ))}
        </nav>
        <div className="brief-health">
          <div className="kicker" style={{ marginBottom: 8 }}>Report health</div>
          <div className="brief-health-row"><span>Freshness</span><div className="brief-meter"><span style={{width:'92%'}} /></div></div>
          <div className="brief-health-row"><span>Source diversity</span><div className="brief-meter"><span style={{width:'78%'}} /></div></div>
          <div className="brief-health-row"><span>Claim support</span><div className="brief-meter"><span style={{width:'100%'}} /></div></div>
          <div className="brief-health-row"><span>Contradictions</span><div className="brief-meter" data-warn="true"><span style={{width:'14%'}} /></div></div>
        </div>
      </aside>

      <article className="brief-main">
        <header className="brief-header">
          <div className="kicker">Diligence · Series C opportunity</div>
          <h1 className="brief-title">DISCO — worth reaching out, with pricing as the watch item.</h1>
          <p className="brief-sub">
            A two-minute debrief for a banker evaluating outbound effort.
            Verdict and recommended next step lead; receipts, timeline and
            watch conditions follow.
          </p>
          <div className="brief-meta">
            <span className="pill pill-ok"><window.Icon name="check" size={10}/> verified</span>
            <span className="pill pill-accent">v3 · refreshed 2h ago</span>
            <span className="pill pill-neutral pill-mono">24 sources · 6 branches</span>
            <span className="pill pill-neutral pill-mono">llm-judge 9.6 / 10</span>
          </div>
        </header>

        <section className="brief-exec">
          <div className="brief-exec-verdict">
            <span className="kicker" style={{ color: 'var(--accent-ink)' }}>Verdict</span>
            <h2>Reach out this quarter.</h2>
            <p>Lead with AmLaw traction and the Greylock signal; ask how they plan to absorb EU AI Act compliance load without raising effective price. If NRR holds above 120% through Q2, expand the conversation to platform partnership scope.</p>
          </div>
          <div className="brief-exec-stats">
            <Stat v="$100M" l="Series C · lead Greylock" trend="up" onClick={() => onJump?.('sources')} />
            <Stat v="2.8×" l="ARR growth" trend="up" />
            <Stat v="122%" l="Net revenue retention" trend="up" />
            <Stat v="6 of 10" l="AmLaw firms served" />
          </div>
        </section>

        <section className="brief-triad">
          <TriadCard kicker="What happened" title="Greylock-led Series C on Nov 14"
                     body="$100M at a $900M post. Sarah Grayson joins the board. Announced alongside a customer count refresh (2,400+ firms)." />
          <TriadCard kicker="So what" title="Above-median growth, platform positioning"
                     body="Growth outperforms the 2.5× legal-tech median and the round signals platform-tier ambition rather than a narrow e-discovery wedge." />
          <TriadCard kicker="Now what" title="Move now; monitor pricing"
                     body="Outbound this quarter. Re-run this report if NRR dips under 118% or if blended pricing slips more than 6% QoQ." />
        </section>

        <section>
          <h3 className="brief-h3">Receipts</h3>
          <div className="brief-receipts">
            {[
              ['ARR', '$186M', 'up', 'Q3 IR filing'],
              ['ARR growth YoY', '2.8×', 'up', 'Mgmt. commentary'],
              ['Net revenue retention', '122%', 'up', 'Q3 IR filing'],
              ['Gross margin', '78%', null, 'Q3 IR filing'],
              ['Runway at Series C', '38 mo', null, 'Press release'],
              ['Rev multiple (post)', '14.2×', null, 'Implied post'],
              ['AmLaw 10 penetration', '6 / 10', null, 'Customer list'],
              ['Top customer concentration', '11%', 'down', 'IR filing'],
            ].map(([l, v, t, src], i) => (
              <div key={i} className="brief-receipt" onClick={() => onJump?.('sources')}>
                <div className="brief-receipt-label">{l}</div>
                <div className="brief-receipt-val" data-trend={t}>{v}</div>
                <div className="brief-receipt-src">{src}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="brief-h3">Timeline</h3>
          <div className="brief-timeline">
            {[
              { d: 'Nov 14 2025', t: 'Series C closed', m: 'Greylock leads, $100M at $900M post', accent: true },
              { d: 'Sep 30 2025', t: 'Q3 IR filing',    m: 'ARR $186M, NRR 122%, GM 78%' },
              { d: 'Jul 12 2025', t: 'Major product release', m: 'Cecilia 3 — agentic review' },
              { d: 'Feb 01 2026', t: 'EU AI Act GPAI rules', m: 'Enforcement begins; integration tax 6–9 mo' },
              { d: 'Mar 2026',    t: 'Everlaw pricing cut', m: '-18% on midmarket tiers' },
            ].map((e, i) => (
              <div key={i} className="brief-event">
                <div className={`brief-event-dot ${e.accent ? 'is-accent' : ''}`} />
                <div className="brief-event-date">{e.d}</div>
                <div className="brief-event-body">
                  <div className="brief-event-title">{e.t}</div>
                  <div className="brief-event-meta">{e.m}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="brief-h3">Watch conditions</h3>
          <div className="brief-nudges">
            {[
              ['NRR drops below 118%',           'monitor · Q2 IR',   'var(--accent)'],
              ['Blended pricing ↓ &gt; 6% QoQ', 'monitor · web ops', 'var(--warn)'],
              ['Greylock board exits',           'rare · filings',    'var(--text-muted)'],
            ].map(([t, meta, c], i) => (
              <div key={i} className="brief-nudge">
                <span className="brief-nudge-dot" style={{ background: c }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }} dangerouslySetInnerHTML={{__html: t}} />
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 2 }}>{meta}</div>
                </div>
                <button className="ws-icon-btn" title="Create watch" style={{ marginLeft: 'auto' }}><window.Icon name="bell" size={13}/></button>
              </div>
            ))}
          </div>
        </section>

        <footer className="brief-footer">
          <div className="kicker">Run · hs-7e3a</div>
          <div className="brief-footer-meta">kimi-k2.6 · p95 174s · 1.2k output tokens · verified Apr 23, 2026</div>
        </footer>
      </article>
    </div>
  );
}

function Stat({ v, l, trend, onClick }) {
  return (
    <div className="brief-stat" onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
      <div className="brief-stat-val" data-trend={trend}>{v}</div>
      <div className="brief-stat-label">{l}</div>
    </div>
  );
}
function TriadCard({ kicker, title, body }) {
  return (
    <div className="brief-triad-card">
      <div className="kicker">{kicker}</div>
      <div className="brief-triad-title">{title}</div>
      <p className="brief-triad-body">{body}</p>
    </div>
  );
}

// ── Cards (interactive breadcrumb + 3-column) ────────────────────────
function CardsBody({ rootId, setRootId, selected, onSelect }) {
  const data = window.WS_DATA;
  const root = data.entities[rootId] || data.entities.disco;
  const relatedIds = data.relations[root.id] || [];
  const drill = selected ? data.entities[selected.id] : null;
  const drillIds = drill ? (data.relations[drill.id] || []) : [];

  const [crumb, setCrumb] = React.useState([root.id]);
  React.useEffect(() => {
    setCrumb(prev => {
      if (prev[prev.length - 1] === root.id) return prev;
      return [...prev, root.id];
    });
  }, [rootId]);

  return (
    <div className="cards-layout">
      <div className="cards-breadcrumb">
        {crumb.map((cid, i) => {
          const e = data.entities[cid];
          if (!e) return null;
          return (
            <React.Fragment key={cid + i}>
              <span className="cards-crumb" data-type={e.kind}
                    onClick={() => { setRootId(cid); setCrumb(crumb.slice(0, i + 1)); }}
                    style={{ opacity: i === crumb.length - 1 ? 1 : 0.65 }}>
                <span className="cards-crumb-kicker">{e.kicker || e.kind}</span>
                <span>{e.name}</span>
              </span>
              {i < crumb.length - 1 && <window.Icon name="right" size={11} style={{color:'var(--text-faint)'}} />}
            </React.Fragment>
          );
        })}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="ws-icon-btn" title="Reset" onClick={() => { setRootId('disco'); setCrumb(['disco']); onSelect(null); }}><window.Icon name="refresh" size={13}/></button>
          <button className="ws-icon-btn" title="Filter"><window.Icon name="filter" size={13}/></button>
        </span>
      </div>

      <div className="cards-columns">
        <CardColumn title="Root" subtitle="1 card">
          <window.CompanyCard
            name={root.name} ticker={root.ticker || ''} subtitle={root.subtitle}
            avatar={root.avatar} avatarBg={root.avatarBg}
            kicker={root.kicker} active
            metrics={root.metrics}
            footer={<span><window.Icon name="clock" size={10}/> {root.footer || 'fresh'}</span>}
          />
        </CardColumn>

        <CardColumn title="Related" subtitle={`${relatedIds.length} · from graph`}>
          {relatedIds.map(eid => {
            const e = data.entities[eid];
            if (!e) return null;
            return (
              <window.CompanyCard key={eid}
                name={e.name} ticker={e.ticker || ''} subtitle={e.subtitle}
                avatar={e.avatar} avatarBg={e.avatarBg}
                kicker={e.kicker}
                metrics={e.metrics}
                active={selected?.id === eid}
                onClick={() => onSelect({ id: eid, name: e.name, kind: e.kind })}
              />
            );
          })}
        </CardColumn>

        <CardColumn title={drill ? `Drilldown · ${drill.name}` : 'Drilldown'} subtitle={drill ? `${drillIds.length} · one hop deeper` : 'select a card'}>
          {!drill && (
            <div className="cards-blank" style={{ cursor: 'default' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click a related card to drill in</span>
            </div>
          )}
          {drill && drillIds.map(eid => {
            const e = data.entities[eid];
            if (!e) return null;
            return (
              <window.CompanyCard key={eid}
                name={e.name} ticker={e.ticker || ''} subtitle={e.subtitle}
                avatar={e.avatar} avatarBg={e.avatarBg}
                kicker={e.kicker}
                metrics={e.metrics}
                onClick={() => { setRootId(eid); onSelect(null); }}
              />
            );
          })}
          {drill && (
            <div className="cards-blank" onClick={() => { setRootId(drill.id); onSelect(null); }}>
              <window.Icon name="plus" size={14}/> <span>Make {drill.name} the root</span>
            </div>
          )}
        </CardColumn>
      </div>
    </div>
  );
}

function CardColumn({ title, subtitle, children }) {
  return (
    <div className="cards-col">
      <div className="cards-col-head">
        <div>
          <div className="kicker">{title}</div>
          <div className="cards-col-sub">{subtitle}</div>
        </div>
      </div>
      <div className="cards-col-body">{children}</div>
    </div>
  );
}

function CardInspector({ card, onClose, onDrill }) {
  const e = window.WS_DATA.entities[card.id];
  if (!e) return null;
  return (
    <>
      <div className="ws-inspector-header">
        <div>
          <div className="ws-inspector-kicker">{e.kicker || e.kind}</div>
          <h3 className="ws-inspector-title">{e.name}</h3>
        </div>
        <button className="ws-icon-btn" onClick={onClose} title="Close inspector"><window.Icon name="close" size={12}/></button>
      </div>
      <div className="ws-inspector-body">
        <div className="ws-insp-section">
          <h4>At a glance</h4>
          <div className="cc-metrics" style={{ gridTemplateColumns: '1fr 1fr', gap: '6px 14px' }}>
            {e.metrics.map((m, i) => (
              <div key={i} className="cc-metric">
                <span className="cc-metric-label">{m.label}</span>
                <span className="cc-metric-val" data-trend={m.trend}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ws-insp-section">
          <h4>Position vs root</h4>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
            {e.subtitle}. Connected to the DISCO thesis via market overlap and investor graph.
          </p>
        </div>
        <div className="ws-insp-section">
          <h4>Actions</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="composer-tool-btn" style={{ justifyContent: 'flex-start' }} onClick={() => onDrill?.(e.id)}>
              <window.Icon name="network" size={12}/> Drill into {e.name}
            </button>
            <button className="composer-tool-btn" style={{ justifyContent: 'flex-start' }}><window.Icon name="bell" size={12}/> Watch for changes</button>
            <button className="composer-tool-btn" style={{ justifyContent: 'flex-start' }}><window.Icon name="layers" size={12}/> Pin to Notebook</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Sources (interactive filter + claim expand) ────────────────────
function SourcesBody({ filter, setFilter, expanded, setExpanded }) {
  const data = window.WS_DATA;
  const types = ['all', 'filing', 'press', 'analyst', 'reg', 'pr'];
  const typeColor = { press: 'indigo', analyst: 'accent', filing: 'ok', reg: 'warn', pr: 'neutral' };
  const filtered = filter === 'all' ? data.sources : data.sources.filter(s => s.type === filter);

  const [freshOnly, setFreshOnly] = React.useState(false);
  const [trustOnly, setTrustOnly] = React.useState(false);

  const visibleSources = filtered.filter(s => {
    if (freshOnly && !s.date.includes('2026')) return false;
    if (trustOnly && s.weight < 0.8) return false;
    return true;
  });

  return (
    <div className="sources-layout">
      <div className="sources-header">
        <div>
          <div className="kicker">Sources</div>
          <h2 className="sources-title">{data.sources.length} cited · {data.claims.length} claims · {data.claims.filter(c => c.contra.length > 0).length} conflict</h2>
        </div>
        <div className="sources-filters">
          {types.map(t => (
            <button key={t} className="sources-filter"
                    data-active={filter === t}
                    onClick={() => setFilter(t)}>{t}</button>
          ))}
          <div className="sources-sep" />
          <button className="composer-tool-btn" data-active={freshOnly}
                  onClick={() => setFreshOnly(v => !v)}>
            <window.Icon name="filter" size={12}/> fresh &lt; 30d
          </button>
          <button className="composer-tool-btn" data-active={trustOnly}
                  onClick={() => setTrustOnly(v => !v)}>
            <window.Icon name="filter" size={12}/> trust ≥ 0.8
          </button>
        </div>
      </div>

      <section className="sources-section">
        <div className="kicker" style={{ marginBottom: 10 }}>Claims</div>
        <div className="sources-claims">
          {data.claims.map(c => (
            <div key={c.id} className="sources-claim"
                 data-expanded={expanded === c.id}
                 onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                 style={{ cursor: 'pointer' }}>
              <div className="sources-claim-text">{c.q}</div>
              <div className="sources-claim-support">
                <span className="pill pill-ok"><window.Icon name="check" size={10}/> {c.support.length} support</span>
                {c.contra.length > 0 && <span className="pill pill-warn"><window.Icon name="warn" size={10}/> {c.contra.length} conflict</span>}
                <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-faint)' }}>
                  {expanded === c.id ? '▾ hide evidence' : '▸ show evidence'}
                </span>
              </div>
              {expanded === c.id ? (
                <div className="sources-claim-refs" style={{ flexDirection: 'column', gap: 6 }}>
                  {c.support.map(n => {
                    const s = data.sources.find(x => x.n === n);
                    if (!s) return null;
                    return (
                      <div key={n} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11.5 }}>
                        <span className="cite" style={{ pointerEvents: 'none' }}>{n}</span>
                        <span style={{ fontWeight: 600 }}>{s.title}</span>
                        <span className="sources-domain" style={{ marginLeft: 'auto' }}>{s.domain}</span>
                      </div>
                    );
                  })}
                  {c.contra.map(n => {
                    const s = data.sources.find(x => x.n === n);
                    if (!s) return null;
                    return (
                      <div key={n} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11.5 }}>
                        <span className="cite" style={{ pointerEvents: 'none', background: 'rgba(180,83,9,.1)', color: 'var(--warn)', borderColor: 'rgba(180,83,9,.24)' }}>{n}</span>
                        <span style={{ fontWeight: 600 }}>{s.title}</span>
                        <span style={{ fontSize: 10, color: 'var(--warn)', marginLeft: 'auto' }}>conflicts</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="sources-claim-refs">
                  {[...c.support, ...c.contra].map(n => {
                    const s = data.sources.find(x => x.n === n);
                    return s ? <span key={n} className="sources-domain">{s.domain}</span> : null;
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="sources-section">
        <div className="kicker" style={{ marginBottom: 10 }}>All sources · {visibleSources.length} of {data.sources.length}</div>
        <div className="sources-table">
          <div className="sources-table-head">
            <span>#</span><span>Source</span><span>Type</span><span>Cites</span><span>Trust</span><span>Date</span>
          </div>
          {visibleSources.map(s => (
            <div key={s.n} className="sources-row" data-type={s.type}>
              <span className="cite" style={{ pointerEvents:'none' }}>{s.n}</span>
              <span className="sources-row-title">
                <span className="sources-row-name">{s.title}</span>
                <span className="sources-row-domain"><window.Icon name="external" size={10}/> {s.domain}</span>
              </span>
              <span className={`pill pill-${typeColor[s.type] || 'neutral'}`} style={{ fontSize: 10 }}>{s.type}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{s.cites}</span>
              <span className="sources-trust"><span style={{ width: `${s.weight*100}%` }} /></span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{s.date}</span>
            </div>
          ))}
          {visibleSources.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
              No sources match these filters. <a style={{ color: 'var(--accent-ink)', cursor: 'pointer', fontWeight: 600 }}
                                                  onClick={() => { setFilter('all'); }}>Reset</a>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

window.ReportSurface = ReportSurface;
