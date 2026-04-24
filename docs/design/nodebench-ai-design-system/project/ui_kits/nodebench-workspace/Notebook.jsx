// Notebook surface — fully interactive
// - Editable title and paragraphs (contentEditable)
// - Proposals accept/dismiss
// - Citation hover previews
// - Slash menu with keyboard navigation (↑↓ ↵ esc)
// - Tab switching
// - Claim block expand

function NotebookSurface({ tweaks, tab, setTab }) {
  const [slashOpen, setSlashOpen] = React.useState(false);
  const [slashIdx, setSlashIdx] = React.useState(3); // "Draft email" highlighted by default
  const [hoveredCite, setHoveredCite] = React.useState(null);
  const [proposals, setProposals] = React.useState({ p1: 'pending', p2: 'pending' });
  const [saved, setSaved] = React.useState(true);
  const [slashFilter, setSlashFilter] = React.useState('');
  const [claimOpen, setClaimOpen] = React.useState(true);

  const entity = {
    name: 'DISCO · v3',
    initials: 'DI',
    meta: saved ? 'notebook · saved' : 'notebook · editing…',
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

  const markEdit = () => {
    setSaved(false);
    clearTimeout(markEdit._t);
    markEdit._t = setTimeout(() => setSaved(true), 900);
  };

  const headerExtra = (
    <div className="nb-save-state">
      <span className="nb-save-dot" style={{ background: saved ? 'var(--success)' : 'var(--warn)' }} />
      <span>{saved ? 'Saved' : 'Saving…'}</span>
    </div>
  );

  const acceptProposal = (id) => setProposals(p => ({ ...p, [id]: 'accepted' }));
  const dismissProposal = (id) => setProposals(p => ({ ...p, [id]: 'dismissed' }));

  const slashItems = [
    { i: 'brief',   n: 'Heading',       k: 'h2' },
    { i: 'sparkle', n: 'Claim block',   k: 'claim', accent: true },
    { i: 'layers',  n: 'Embed card',    k: 'card' },
    { i: 'sources', n: 'Citation',      k: 'cite' },
    { i: 'sparkle', n: 'Ask a question',k: 'ask', accent: true },
    { i: 'sparkle', n: 'Continue writing',  k: 'cont' },
    { i: 'sparkle', n: 'Rewrite w/ sources', k: 'rew' },
    { i: 'sparkle', n: 'Draft email',   k: 'email' },
  ];
  const filteredSlash = slashItems.filter(it => !slashFilter || it.n.toLowerCase().includes(slashFilter.toLowerCase()));

  const handleSlashKey = (e) => {
    if (!slashOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIdx(i => Math.min(filteredSlash.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIdx(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); setSlashOpen(false); setSlashFilter(''); markEdit(); }
    else if (e.key === 'Escape') { e.preventDefault(); setSlashOpen(false); setSlashFilter(''); }
  };

  return (
    <window.WorkspaceShell
      tabs={tabs} active={tab} onTabChange={setTab}
      entity={entity}
      headerExtra={headerExtra}
    >
      <div className="nb-layout" data-width={tweaks.notebookWidth}
           onKeyDown={handleSlashKey} tabIndex={-1}>
        <div className="nb-block-gutter">
          <div className="nb-handle-row" style={{ top: 98 }}>
            <button className="nb-handle" title="Drag or open actions">⋮⋮</button>
            <button className="nb-handle nb-handle-plus" title="Add block"
                    onClick={() => { setSlashOpen(true); setSlashFilter(''); setSlashIdx(3); }}>
              <window.Icon name="plus" size={11}/>
            </button>
          </div>
        </div>

        <article className="nb-doc">
          <header className="nb-doc-head">
            <div className="nb-crumbs">
              <span>Reports</span>
              <window.Icon name="right" size={10} style={{color:'var(--text-faint)'}}/>
              <span>DISCO</span>
              <window.Icon name="right" size={10} style={{color:'var(--text-faint)'}}/>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Diligence memo · v3</span>
            </div>
            <h1 className="nb-title" contentEditable suppressContentEditableWarning
                onInput={markEdit}>
              DISCO diligence memo
            </h1>
            <div className="nb-title-meta">
              <span className="pill pill-neutral">draft</span>
              <span className="pill pill-accent">
                {Object.values(proposals).filter(s => s === 'pending').length} proposals pending
              </span>
              <span className="pill pill-neutral pill-mono">linked to report · v3</span>
            </div>
          </header>

          <h2 className="nb-h2" data-anchor>Verdict</h2>

          <p className="nb-p" contentEditable suppressContentEditableWarning onInput={markEdit}>
            <strong>Yes — worth reaching out.</strong>{' '}
            <window.EntityChip name="DISCO" type="company" code="DI" />{' '}
            closed a $100M Series C led by{' '}
            <window.EntityChip name="Greylock" type="investor" code="G" />{' '}
            on Nov&nbsp;14,&nbsp;2025
            <CiteLink n={1} active={hoveredCite === 1} onHover={() => setHoveredCite(1)} onLeave={() => setHoveredCite(null)}
                     title="DISCO closes $100M Series C, Greylock leads"
                     domain="techcrunch.com" date="Nov 14, 2025" onClick={() => setTab('sources')} />, putting ARR
            growth above the 2.5× legal-tech median
            <CiteLink n={2} active={hoveredCite === 2} onHover={() => setHoveredCite(2)} onLeave={() => setHoveredCite(null)}
                     title="Legal tech market overview 2025"
                     domain="gartner.com" date="Oct 2025" onClick={() => setTab('sources')} />.
          </p>

          {proposals.p1 !== 'dismissed' && (
            <div className="nb-proposal-line" data-accepted={proposals.p1 === 'accepted'}>
              <p className="nb-p">
                The deal is priced at a <strong className={proposals.p1 === 'accepted' ? 'nb-proposal-ink' : ''}>
                  14.2× revenue multiple
                </strong>, which{' '}
                {proposals.p1 === 'accepted' ? (
                  <span className="nb-proposal-ink">sits in the 60th percentile of legal-tech Series C comps once NRR is held constant</span>
                ) : (
                  <span className="nb-strike">looks expensive vs the legal-tech comp set</span>
                )}
                .
              </p>
              {proposals.p1 !== 'accepted' && (
                <ProposalCard label="AI proposal" type="pending"
                  note="Tighter framing using the IR filing. Fits your style guide."
                  onAccept={() => { acceptProposal('p1'); markEdit(); }}
                  onDismiss={() => dismissProposal('p1')} />
              )}
              {proposals.p1 === 'accepted' && (
                <ProposalCard label="AI proposal" type="accepted"
                  note="Edit applied · from source 4"
                  onAccept={() => {}} onDismiss={() => {}} />
              )}
            </div>
          )}

          <figure className="nb-embed">
            <div className="nb-embed-head">
              <window.Icon name="layers" size={12}/>
              <span className="kicker">Embedded card · DISCO</span>
              <span className="nb-embed-sync">
                <span className="nb-save-dot" />
                <span>live</span>
              </span>
            </div>
            <window.CompanyCard
              name="DISCO" ticker="LAW" subtitle="legal tech · series c"
              avatar="DI" avatarBg="linear-gradient(135deg,#1A365D,#0F4C81)"
              kicker="root"
              metrics={[
                { label: 'ARR',    value: '$186M', trend: 'up' },
                { label: 'Growth', value: '2.8×',  trend: 'up' },
                { label: 'NRR',    value: '122%' },
                { label: 'Rev mult', value: '14.2×' },
              ]}
              footer={<span><window.Icon name="clock" size={10}/> refreshes with source 4 · IR filing</span>}
              onClick={() => setTab('cards')}
            />
            <figcaption className="nb-embed-cap">
              Embed refreshes when the upstream report re-runs. Pinned to v3 · Q3 2025 IR filing.
            </figcaption>
          </figure>

          <h2 className="nb-h2">So what</h2>

          <p className="nb-p" contentEditable suppressContentEditableWarning onInput={markEdit}>
            Growth outperforms the <window.EntityChip name="legal-tech market" type="market" code="M" /> median
            and signals platform ambition rather than a narrow e-discovery wedge
            <CiteLink n={2} active={hoveredCite === 2} onHover={() => setHoveredCite(2)} onLeave={() => setHoveredCite(null)}
                     title="Legal tech market overview 2025"
                     domain="gartner.com" date="Oct 2025" onClick={() => setTab('sources')} />. The
            <window.EntityChip name="EU AI Act" type="regulation" code="EU" /> integration tax over the
            next 6–9 months is the main execution risk
            <CiteLink n={3} active={hoveredCite === 3} onHover={() => setHoveredCite(3)} onLeave={() => setHoveredCite(null)}
                     title="EU AI Act enforcement timeline"
                     domain="euractiv.com" date="Feb 2026" onClick={() => setTab('sources')} />.
          </p>

          <div className="nb-claim">
            <div className="nb-claim-head" onClick={() => setClaimOpen(v => !v)} style={{ cursor: 'pointer' }}>
              <window.Icon name="target" size={12}/>
              <span className="kicker" style={{ color: 'var(--accent-ink)' }}>Claim</span>
              <span className="nb-claim-status">
                <span className="pill pill-ok" style={{ fontSize: 10 }}><window.Icon name="check" size={9}/> 3 support</span>
                <span className="pill pill-warn" style={{ fontSize: 10 }}><window.Icon name="warn" size={9}/> 1 conflict</span>
              </span>
              <span style={{ marginLeft: 8, fontSize: 10.5, color: 'var(--text-faint)' }}>{claimOpen ? '▾' : '▸'}</span>
            </div>
            <div className="nb-claim-body">
              DISCO compounds above 120% NRR through the next two quarters.
            </div>
            {claimOpen && (
              <div className="nb-claim-evidence">
                <div className="nb-claim-ev" data-kind="support">
                  <span className="cite" style={{ pointerEvents:'none' }}>4</span>
                  <span>Q3 IR filing · 122% trailing-four</span>
                </div>
                <div className="nb-claim-ev" data-kind="support">
                  <span className="cite" style={{ pointerEvents:'none' }}>2</span>
                  <span>Gartner · cohort retention data</span>
                </div>
                <div className="nb-claim-ev" data-kind="support">
                  <span className="cite" style={{ pointerEvents:'none' }}>5</span>
                  <span>DISCO press room · Series C</span>
                </div>
                <div className="nb-claim-ev" data-kind="conflict">
                  <span className="cite" style={{ pointerEvents:'none', background: 'rgba(180,83,9,.1)', color: 'var(--warn)', borderColor: 'rgba(180,83,9,.24)' }}>6</span>
                  <span>Lawtech · Everlaw pricing cut suggests churn pressure</span>
                </div>
              </div>
            )}
          </div>

          {proposals.p2 !== 'dismissed' && (
            <div className="nb-proposal-line" data-accepted={proposals.p2 === 'accepted'}>
              <p className="nb-p">
                {proposals.p2 === 'accepted' ? (
                  <span className="nb-proposal-ink">We should start with a Sarah Grayson intro — faster and carries more weight post-Series C.</span>
                ) : (
                  <span className="nb-proposal-hl">
                    We should reach out to Kiwi Camara directly before a GP intro.
                  </span>
                )}
              </p>
              {proposals.p2 === 'accepted' ? (
                <ProposalCard label="AI proposal" type="accepted" note="Sequence reversed" onAccept={()=>{}} onDismiss={()=>{}} />
              ) : (
                <ProposalCard label="AI proposal" type="pending"
                  note="Consider the reverse: a Sarah Grayson intro is faster and carries more weight post-Series C."
                  onAccept={() => { acceptProposal('p2'); markEdit(); }}
                  onDismiss={() => dismissProposal('p2')} />
              )}
            </div>
          )}

          <h2 className="nb-h2">Next step</h2>

          <p className="nb-p" contentEditable suppressContentEditableWarning onInput={markEdit}>
            Outbound this quarter. Lead with{' '}
            <window.EntityChip name="AmLaw 10" type="market" code="A" /> traction and the Greylock signal; ask how
            they plan to absorb the AI Act compliance load without raising effective price
            <CiteLink n={3} active={hoveredCite === 3} onHover={() => setHoveredCite(3)} onLeave={() => setHoveredCite(null)}
                     title="EU AI Act enforcement timeline"
                     domain="euractiv.com" date="Feb 2026" onClick={() => setTab('sources')} />.
          </p>

          {slashOpen && (
            <div className="nb-slash-wrap">
              <div className="nb-cursor-line">
                <span className="nb-placeholder">
                  /{slashFilter || (filteredSlash[slashIdx]?.n.toLowerCase() || 'command')}
                </span>
                <span className="nb-caret" />
              </div>
              <SlashMenu items={filteredSlash} activeIdx={slashIdx}
                         setActiveIdx={setSlashIdx}
                         filter={slashFilter} setFilter={setSlashFilter}
                         onPick={() => { setSlashOpen(false); setSlashFilter(''); markEdit(); }}
                         onClose={() => { setSlashOpen(false); setSlashFilter(''); }} />
            </div>
          )}

          {!slashOpen && (
            <div className="nb-add-block" onClick={() => { setSlashOpen(true); setSlashFilter(''); setSlashIdx(3); }}>
              <window.Icon name="plus" size={12}/>
              <span>Add a block — type <kbd>/</kbd> for commands</span>
            </div>
          )}

          <section className="nb-footnotes">
            <div className="kicker" style={{ marginBottom: 6 }}>Footnotes · 4</div>
            {[
              { n: 1, title: 'DISCO closes $100M Series C, Greylock leads', domain: 'techcrunch.com', date: 'Nov 14 2025', type: 'press' },
              { n: 2, title: 'Legal tech market overview 2025',              domain: 'gartner.com',   date: 'Oct 2025',    type: 'analyst' },
              { n: 3, title: 'EU AI Act enforcement timeline',               domain: 'euractiv.com',  date: 'Feb 2026',    type: 'reg' },
              { n: 4, title: 'DISCO Q3 2025 IR filing',                      domain: 'sec.gov',       date: 'Sep 30 2025', type: 'filing' },
            ].map(s => (
              <div key={s.n} className="nb-footnote" onClick={() => setTab('sources')} style={{ cursor: 'pointer' }}>
                <span className="cite" style={{ pointerEvents:'none' }}>{s.n}</span>
                <span style={{ fontWeight: 600 }}>{s.title}</span>
                <span className="pill pill-neutral" style={{ fontSize: 10 }}>{s.type}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)' }}>{s.domain} · {s.date}</span>
              </div>
            ))}
          </section>
        </article>
      </div>
    </window.WorkspaceShell>
  );
}

function CiteLink({ n, active, onHover, onLeave, onClick, title, domain, date }) {
  return (
    <span className="nb-cite-wrap"
          onMouseEnter={onHover} onMouseLeave={onLeave}
          onClick={onClick}>
      <a className="cite">{n}</a>
      {active && (
        <span className="nb-cite-preview">
          <span className="kicker" style={{ marginBottom: 4, display: 'block' }}>source {n}</span>
          <span className="nb-cite-title">{title}</span>
          <span className="nb-cite-meta">
            <window.Icon name="external" size={9} /> {domain} · {date}
          </span>
        </span>
      )}
    </span>
  );
}

function ProposalCard({ label, note, type = 'pending', onAccept, onDismiss }) {
  return (
    <aside className="nb-proposal-card" data-state={type}>
      <div className="nb-proposal-head">
        <window.Icon name="sparkle" size={11}/>
        <span className="kicker" style={{ color: type === 'accepted' ? 'var(--success)' : 'var(--accent-ink)' }}>
          {type === 'accepted' ? 'applied' : label}
        </span>
      </div>
      <div className="nb-proposal-note">{note}</div>
      {type === 'pending' && (
        <div className="nb-proposal-actions">
          <button className="nb-proposal-btn nb-proposal-btn--accept" onClick={onAccept}>Accept</button>
          <button className="nb-proposal-btn" onClick={onDismiss}>Dismiss</button>
        </div>
      )}
    </aside>
  );
}

function SlashMenu({ items, activeIdx, setActiveIdx, filter, setFilter, onPick, onClose }) {
  return (
    <div className="nb-slash">
      <div className="nb-slash-head">
        <window.Icon name="sparkle" size={11}/>
        <input value={filter} onChange={e => setFilter(e.target.value)}
               placeholder="type to filter…"
               autoFocus
               style={{ border: 0, outline: 0, font: 'inherit', fontFamily: 'var(--font-mono)', fontSize: 11, background: 'transparent', flex: 1 }} />
        <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>↑↓ · ↵ · esc</span>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: 14, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No matches</div>
      ) : items.map((it, i) => (
        <div key={it.k} className={`nb-slash-item ${activeIdx === i ? 'is-active' : ''}`}
             onMouseEnter={() => setActiveIdx(i)}
             onClick={onPick}>
          <span className={`nb-slash-icon ${it.accent ? 'is-accent' : ''}`}>
            <window.Icon name={it.i} size={12}/>
          </span>
          <span>{it.n}</span>
          <span className="nb-slash-key">{it.k}</span>
        </div>
      ))}
    </div>
  );
}

window.NotebookSurface = NotebookSurface;
