// Proposed Changes — review queue for diffs the agent has staged but not yet
// committed to the workspace. Bulk-selectable, grouped by report, with diff
// previews per change kind:
//   • entity-merge   — two entity cards collapse into one (before/after)
//   • claim-edit     — claim text + confidence + sources change
//   • source-attach  — a new citation is added to an existing claim
//   • block-add      — a new notebook block is proposed
//   • block-remove   — a block is suggested for deletion
//   • field-edit     — a single attribute on an entity changes
//
// Layout: 280px sidebar (groups + filter chips) + main pane (change list with
// per-row checkbox) + sticky bulk action bar across the bottom of the main
// pane that appears when ≥1 change is selected.

const PC_GROUPS = [
  {
    id: 'disco',
    title: 'DISCO weekly refresh',
    sub: 'auto-run · today, 9:14 AM',
    counts: { merge: 2, claim: 4, source: 6, block: 1 },
    changes: [
      {
        id: 'd-m1', kind: 'entity-merge', conf: 0.94,
        title: 'Merge "Disco Inc." into DISCO',
        why: 'Same domain (csdisco.com), same CEO, same ticker. 14-report co-occurrence.',
        before: { left: { name: 'DISCO', kind: 'company', ticker: 'LAW', emp: 720, fnd: 2013 }, right: { name: 'Disco Inc.', kind: 'company', ticker: '—', emp: 715, fnd: '—' } },
        after:  { name: 'DISCO', kind: 'company', ticker: 'LAW', emp: 720, fnd: 2013, aliases: ['Disco Inc.', 'DISCO eDiscovery'] },
        evidence: ['SEC 10-K · Mar 2026', 'csdisco.com · About', 'press release · Apr 2026'],
        risk: 'low',
      },
      {
        id: 'd-c1', kind: 'claim-edit', conf: 0.88,
        title: 'Update DISCO Q3 ARR claim',
        why: 'Q3 earnings filed yesterday; previous claim derived from analyst estimate.',
        before: { text: 'DISCO Q3 ARR is approximately $148M (analyst estimate).', conf: 'tentative · 0.62', sources: ['Bloomberg · Sep 28'] },
        after:  { text: 'DISCO Q3 ARR is $151.4M, up 9% YoY.',                    conf: 'verified · 0.96', sources: ['10-Q · Oct 24', 'press release · Oct 24'] },
        risk: 'low',
      },
      {
        id: 'd-c2', kind: 'claim-edit', conf: 0.79,
        title: 'Revise DISCO net retention to 108%',
        why: 'Filing supersedes prior 112% estimate from Q2 call transcript.',
        before: { text: 'Net retention reported at 112%.',  conf: 'tentative · 0.71', sources: ['Q2 earnings call · Jul 31'] },
        after:  { text: 'Net retention reported at 108%.',  conf: 'verified · 0.92',  sources: ['10-Q · Oct 24'] },
        risk: 'medium',
      },
      {
        id: 'd-s1', kind: 'source-attach',
        title: 'Attach 10-Q to "AI Review Studio" launch claim',
        why: 'Filing references the product by name with launch quarter.',
        target: 'AI Review Studio launched Q3 2026 with adoption in 18 customers.',
        adds: ['SEC 10-Q · Oct 24, 2026 · pp.27-29'],
        risk: 'low',
      },
      {
        id: 'd-s2', kind: 'source-attach',
        title: 'Attach Bird & Bird memo to EU AI Act exposure claim',
        why: 'Memo published yesterday explicitly names DISCO\'s GPAI obligations.',
        target: 'DISCO is subject to GPAI transparency rules under EU AI Act Art. 53.',
        adds: ['Bird & Bird · EU AI Act memo · Oct 23, 2026'],
        risk: 'low',
      },
      {
        id: 'd-s3', kind: 'source-attach',
        title: 'Attach customer reference to DISCO win at Latham',
        why: 'New press coverage explicitly names firm + deal size.',
        target: 'DISCO closed Latham & Watkins Q2 2026 ($4.2M ARR).',
        adds: ['Law.com · Apr 18, 2026', 'Latham press release · Apr 17, 2026'],
        risk: 'low',
      },
      {
        id: 'd-b1', kind: 'block-add',
        title: 'Add "Open questions" section',
        why: 'NodeBench observed this section in 9 of your last 12 saved dossiers (learned pattern).',
        preview: [
          'How does DISCO\'s GPAI exposure compare to Relativity?',
          'Is the AI Review Studio attach rate disclosed anywhere?',
          'What is the ARR contribution from EU customers post-AI Act?',
        ],
        risk: 'low',
      },
      {
        id: 'd-c3', kind: 'claim-edit', conf: 0.71,
        title: 'Soften "industry leader" framing',
        why: 'Phrasing is unattributed; revise to neutral with cited share.',
        before: { text: 'DISCO is the industry leader in cloud eDiscovery.', conf: 'weak · 0.41', sources: [] },
        after:  { text: 'DISCO holds 12.4% market share in cloud eDiscovery (Gartner Q3 2026).', conf: 'verified · 0.91', sources: ['Gartner · Q3 2026'] },
        risk: 'medium',
      },
      {
        id: 'd-f1', kind: 'field-edit',
        title: 'Update DISCO employee count',
        why: 'LinkedIn delta + SEC 10-Q both report 720 (was 712).',
        target: 'DISCO',
        field: 'employees',
        before: 712,
        after: 720,
        risk: 'low',
      },
      {
        id: 'd-r1', kind: 'block-remove',
        title: 'Remove stale "Acquisition rumor" callout',
        why: 'Refuted by today\'s 10-Q ("no transactions contemplated"). Outdated source.',
        preview: 'Bloomberg reported in Sep that DISCO was approached by a strategic acquirer.',
        risk: 'low',
      },
      {
        id: 'd-m2', kind: 'entity-merge', conf: 0.81,
        title: 'Merge "Anthony Joseph" into Antony Joseph',
        why: 'OCR variant of CFO name in board deck capture.',
        before: { left: { name: 'Antony Joseph', kind: 'person', role: 'CFO at DISCO' }, right: { name: 'Anthony Joseph', kind: 'person', role: '—' } },
        after:  { name: 'Antony Joseph', kind: 'person', role: 'CFO at DISCO', aliases: ['Anthony Joseph (OCR)'] },
        evidence: ['DISCO board deck · Sep 12 · capture'],
        risk: 'low',
      },
      {
        id: 'd-s4', kind: 'source-attach',
        title: 'Attach analyst report to growth claim',
        why: 'Cite Bessemer Cloud Index for the YoY comparison.',
        target: 'DISCO\'s YoY growth outpaces the legal-tech category mean by 3.2pp.',
        adds: ['Bessemer Cloud Index · Q3 2026'],
        risk: 'low',
      },
      {
        id: 'd-c4', kind: 'claim-edit', conf: 0.66,
        title: 'Mark "AI Review Studio attach rate" as tentative',
        why: '18 customers cited but base is unclear; downgrade until the call transcript clarifies.',
        before: { text: 'AI Review Studio attached to 18 of DISCO\'s top 50 customers.', conf: 'verified · 0.91', sources: ['press release · Oct 24'] },
        after:  { text: 'AI Review Studio attached to 18 customers (base unclear).',     conf: 'tentative · 0.55', sources: ['press release · Oct 24'] },
        risk: 'high',
      },
    ],
  },
  {
    id: 'kiwi',
    title: 'Kiwi Camara · Disrupt 2026 follow-ups',
    sub: 'manual run · 2 days ago',
    counts: { claim: 2, source: 3, block: 0, merge: 0 },
    changes: [
      {
        id: 'k-c1', kind: 'claim-edit', conf: 0.85,
        title: 'Update Kiwi\'s board seats',
        why: 'New filing adds a board seat at Cribl.',
        before: { text: 'Kiwi Camara serves on the boards of DISCO and Mercor.',         conf: 'verified · 0.92', sources: ['10-K · Mar 2026'] },
        after:  { text: 'Kiwi Camara serves on the boards of DISCO, Mercor, and Cribl.', conf: 'verified · 0.96', sources: ['Cribl 8-K · Oct 21'] },
        risk: 'low',
      },
      {
        id: 'k-s1', kind: 'source-attach',
        title: 'Attach panel transcript to "AI eval" thesis quote',
        why: 'Disrupt 2026 transcript published this morning.',
        target: '"Voice-agent eval is the bottleneck of the next two years." — Kiwi Camara',
        adds: ['TC Disrupt 2026 · transcript · Oct 23'],
        risk: 'low',
      },
      {
        id: 'k-s2', kind: 'source-attach',
        title: 'Attach Stanford bio',
        why: 'Authoritative for education + early career.',
        target: 'Kiwi Camara graduated Stanford CS in 2003.',
        adds: ['Stanford CS dept · faculty bio'],
        risk: 'low',
      },
      {
        id: 'k-s3', kind: 'source-attach',
        title: 'Attach SEC ownership filing',
        why: 'Confirms equity stake mentioned in 10-K.',
        target: 'Camara holds 18.4% of DISCO common shares.',
        adds: ['SEC Form 4 · Sep 30, 2026'],
        risk: 'low',
      },
    ],
  },
  {
    id: 'mercor',
    title: 'Mercor hiring watch',
    sub: 'auto-run · 6 hours ago',
    counts: { merge: 1, claim: 1, source: 2, block: 1 },
    changes: [
      {
        id: 'm-m1', kind: 'entity-merge', conf: 0.69,
        title: 'Merge "Mercor (defunct ad-tech)" candidate',
        why: 'Low confidence — recommend keeping separate. Surfaced for explicit review.',
        before: { left: { name: 'Mercor', kind: 'company', stage: 'Series C', emp: 240 }, right: { name: 'Mercor (ad-tech)', kind: 'company', stage: 'defunct 2014', emp: 0 } },
        after:  { name: 'Mercor', kind: 'company', stage: 'Series C', emp: 240, aliases: [] },
        evidence: ['LinkedIn · 2 candidates with same name', 'historical Crunchbase'],
        risk: 'high',
      },
      {
        id: 'm-c1', kind: 'claim-edit', conf: 0.74,
        title: 'Update Mercor headcount',
        why: 'LinkedIn delta + a16z update memo agree on 240.',
        before: { text: 'Mercor employs ~210.',                            conf: 'tentative · 0.68', sources: ['LinkedIn · Aug 2026'] },
        after:  { text: 'Mercor employs ~240 (up from 210 in August).',    conf: 'verified · 0.91', sources: ['LinkedIn · Oct 2026', 'a16z memo · Oct 18'] },
        risk: 'low',
      },
      {
        id: 'm-s1', kind: 'source-attach',
        title: 'Attach a16z update memo',
        why: 'Cite for headcount + ARR forecast.',
        target: 'Mercor reaches 240 employees and forecasts $40M ARR by Q2 2027.',
        adds: ['a16z update memo · Oct 18, 2026'],
        risk: 'low',
      },
      {
        id: 'm-s2', kind: 'source-attach',
        title: 'Attach Information article on Mercor + Anthropic deal',
        why: 'Names Mercor as the eval supplier.',
        target: 'Mercor supplies human evaluators to multiple frontier labs.',
        adds: ['The Information · Oct 11, 2026'],
        risk: 'low',
      },
      {
        id: 'm-b1', kind: 'block-add',
        title: 'Add "Hiring spike alert" timeline block',
        why: 'Net +30 in 8 weeks crosses your watch threshold (set when you starred Mercor).',
        preview: [
          'Aug 2026 — 210 employees',
          'Sep 2026 — 224 employees (+14)',
          'Oct 2026 — 240 employees (+16)',
        ],
        risk: 'low',
      },
    ],
  },
];

const PC_KIND_LABEL = {
  'entity-merge':  { label: 'Entity merge',   icon: 'Link',     hue: 'purple' },
  'claim-edit':    { label: 'Claim edit',     icon: 'FileText', hue: 'amber'  },
  'source-attach': { label: 'Source attach',  icon: 'Bookmark', hue: 'teal'   },
  'block-add':     { label: 'Add block',      icon: 'Plus',     hue: 'green'  },
  'block-remove':  { label: 'Remove block',   icon: 'X',        hue: 'red'    },
  'field-edit':    { label: 'Field edit',     icon: 'Edit',     hue: 'blue'   },
};

function ProposedChanges() {
  const I = window.NBIcon;
  const [activeGroup, setActiveGroup] = React.useState(PC_GROUPS[0].id);
  const [kindFilter, setKindFilter]   = React.useState('all');
  const [riskFilter, setRiskFilter]   = React.useState('all');
  const [selected,   setSelected]     = React.useState(new Set());
  const [expanded,   setExpanded]     = React.useState(new Set());
  const [decided,    setDecided]      = React.useState({}); // id -> 'accepted' | 'rejected'

  const group = PC_GROUPS.find(g => g.id === activeGroup);
  const visibleChanges = group.changes.filter(c => {
    if (kindFilter !== 'all' && c.kind !== kindFilter) return false;
    if (riskFilter !== 'all' && c.risk !== riskFilter) return false;
    if (decided[c.id]) return false;
    return true;
  });

  const totalPending = PC_GROUPS.reduce((s, g) => s + g.changes.filter(c => !decided[c.id]).length, 0);
  const allSelected  = visibleChanges.length > 0 && visibleChanges.every(c => selected.has(c.id));

  function toggleSel(id) {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(visibleChanges.map(c => c.id)));
  }
  function toggleExpand(id) {
    setExpanded(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function decide(ids, verdict) {
    setDecided(d => {
      const n = { ...d };
      ids.forEach(id => { n[id] = verdict; });
      return n;
    });
    setSelected(s => {
      const n = new Set(s);
      ids.forEach(id => n.delete(id));
      return n;
    });
  }

  // Aggregate kind counts for the active group's filter chips
  const kindCounts = React.useMemo(() => {
    const m = { all: 0 };
    group.changes.forEach(c => {
      if (decided[c.id]) return;
      m.all = (m.all || 0) + 1;
      m[c.kind] = (m[c.kind] || 0) + 1;
    });
    return m;
  }, [group, decided]);

  return (
    <div>
      {/* ─── Header ─── */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
            Proposed changes
            <span style={{ marginLeft: 12, fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {totalPending} pending
            </span>
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, maxWidth: 720 }}>
            Edits the agent has staged but not yet applied. Each change links back to its evidence and to the workflow that produced it. Bulk-accept the safe ones and review the rest in detail.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="nb-btn nb-btn-ghost" style={{ fontSize: 12 }}>
            <I.Settings width={12} height={12}/> Auto-accept rules
          </button>
          <button className="nb-btn nb-btn-ghost" style={{ fontSize: 12 }}>
            <I.Clock width={12} height={12}/> History
          </button>
        </div>
      </div>

      <div className="nb-pc">
        {/* ─── LEFT: groups ─── */}
        <aside className="nb-pc-side">
          <div className="grp">By report</div>
          {PC_GROUPS.map(g => {
            const pending = g.changes.filter(c => !decided[c.id]).length;
            const active = g.id === activeGroup;
            return (
              <button key={g.id} data-active={active} onClick={() => { setActiveGroup(g.id); setSelected(new Set()); }}>
                <div className="b">
                  <div className="t">{g.title}</div>
                  <div className="s">{g.sub}</div>
                </div>
                <span className="count">{pending}</span>
              </button>
            );
          })}

          <div className="grp" style={{ marginTop: 16 }}>By risk</div>
          {[
            { id: 'all',    label: 'All',    n: kindCounts.all || 0 },
            { id: 'low',    label: 'Low',    n: group.changes.filter(c => !decided[c.id] && c.risk === 'low').length },
            { id: 'medium', label: 'Medium', n: group.changes.filter(c => !decided[c.id] && c.risk === 'medium').length },
            { id: 'high',   label: 'High',   n: group.changes.filter(c => !decided[c.id] && c.risk === 'high').length },
          ].map(r => (
            <button key={r.id} data-active={riskFilter === r.id} onClick={() => setRiskFilter(r.id)}>
              <div className="b"><div className="t" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {r.id !== 'all' && <span className={`nb-pc-risk-dot risk-${r.id}`}/>}
                {r.label}
              </div></div>
              <span className="count">{r.n}</span>
            </button>
          ))}
        </aside>

        {/* ─── RIGHT: changes ─── */}
        <section className="nb-pc-main">
          {/* Kind filter chips */}
          <div className="nb-pc-chips">
            {[
              { id: 'all', label: 'Everything' },
              { id: 'entity-merge',  label: 'Merges' },
              { id: 'claim-edit',    label: 'Claims' },
              { id: 'source-attach', label: 'Sources' },
              { id: 'block-add',     label: 'Additions' },
              { id: 'block-remove',  label: 'Removals' },
              { id: 'field-edit',    label: 'Fields' },
            ].map(c => (
              <button key={c.id} data-active={kindFilter === c.id} onClick={() => setKindFilter(c.id)}>
                {c.label}
                {kindCounts[c.id] != null && <span className="n">{kindCounts[c.id]}</span>}
              </button>
            ))}
            <div style={{ flex: 1 }}/>
            <button className="nb-pc-selall" onClick={toggleAll}>
              <span className={`nb-pc-check ${allSelected ? 'on' : ''}`}>{allSelected && <I.Check width={10} height={10}/>}</span>
              {allSelected ? 'Deselect all' : `Select all (${visibleChanges.length})`}
            </button>
          </div>

          {/* List */}
          <div className="nb-pc-list">
            {visibleChanges.length === 0 && (
              <div className="nb-pc-empty">
                <I.Check width={20} height={20}/>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Nothing pending here</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>All changes for this filter have been reviewed.</div>
                </div>
              </div>
            )}

            {visibleChanges.map(c => (
              <ChangeRow
                key={c.id}
                change={c}
                checked={selected.has(c.id)}
                expanded={expanded.has(c.id)}
                onToggleSel={() => toggleSel(c.id)}
                onToggleExpand={() => toggleExpand(c.id)}
                onAccept={() => decide([c.id], 'accepted')}
                onReject={() => decide([c.id], 'rejected')}
              />
            ))}
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="nb-pc-bulk">
              <span className="cnt">{selected.size} selected</span>
              <span className="sep"/>
              <span className="hint">{[...selected].some(id => {
                const ch = group.changes.find(x => x.id === id);
                return ch && ch.risk === 'high';
              }) && <span style={{ color: 'var(--warning)', fontWeight: 600 }}>⚠ includes high-risk</span>}</span>
              <div style={{ flex: 1 }}/>
              <button className="nb-pc-bulk-btn" onClick={() => setSelected(new Set())}>Cancel</button>
              <button className="nb-pc-bulk-btn" data-flavor="reject" onClick={() => decide([...selected], 'rejected')}>
                <I.X width={12} height={12}/> Reject {selected.size}
              </button>
              <button className="nb-pc-bulk-btn" data-flavor="accept" onClick={() => decide([...selected], 'accepted')}>
                <I.Check width={12} height={12}/> Accept {selected.size}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ════════════════════ Single change row ════════════════════ */
function ChangeRow({ change, checked, expanded, onToggleSel, onToggleExpand, onAccept, onReject }) {
  const I = window.NBIcon;
  const meta = PC_KIND_LABEL[change.kind] || PC_KIND_LABEL['claim-edit'];
  const KIcon = I[meta.icon] || I.FileText;

  return (
    <div className="nb-pc-row" data-checked={checked} data-expanded={expanded}>
      <button className={`nb-pc-check ${checked ? 'on' : ''}`} onClick={onToggleSel}>
        {checked && <I.Check width={10} height={10}/>}
      </button>

      <div className="head" onClick={onToggleExpand}>
        <span className={`nb-pc-kind kind-${meta.hue}`}>
          <KIcon width={11} height={11}/>
          {meta.label}
        </span>
        <div className="title">{change.title}</div>
        <span className={`nb-pc-risk risk-${change.risk}`}>{change.risk}</span>
        {change.conf != null && <span className="conf">{(change.conf * 100).toFixed(0)}%</span>}
        <I.ChevronDown width={13} height={13} className="chev"/>
      </div>

      <div className="why">{change.why}</div>

      {expanded && (
        <div className="diff">
          <ChangeDiff change={change}/>
        </div>
      )}

      <div className="acts">
        <button onClick={onReject}><I.X width={11} height={11}/> Reject</button>
        <button data-primary="true" onClick={onAccept}><I.Check width={11} height={11}/> Accept</button>
      </div>
    </div>
  );
}

/* ════════════════════ Per-kind diff renderers ════════════════════ */
function ChangeDiff({ change }) {
  if (change.kind === 'entity-merge')   return <DiffMerge change={change}/>;
  if (change.kind === 'claim-edit')     return <DiffClaim change={change}/>;
  if (change.kind === 'source-attach')  return <DiffSource change={change}/>;
  if (change.kind === 'block-add')      return <DiffBlockAdd change={change}/>;
  if (change.kind === 'block-remove')   return <DiffBlockRemove change={change}/>;
  if (change.kind === 'field-edit')     return <DiffField change={change}/>;
  return null;
}

function DiffMerge({ change }) {
  return (
    <>
      <div className="diff-row">
        <div className="diff-col" data-side="before">
          <div className="lbl">Before · two entities</div>
          <div className="diff-cards">
            <EntityCard ent={change.before.left}/>
            <EntityCard ent={change.before.right}/>
          </div>
        </div>
        <div className="diff-arrow">→</div>
        <div className="diff-col" data-side="after">
          <div className="lbl">After · merged</div>
          <EntityCard ent={change.after} merged/>
        </div>
      </div>
      <Evidence list={change.evidence}/>
    </>
  );
}
function EntityCard({ ent, merged }) {
  return (
    <div className="nb-pc-ent" data-merged={!!merged}>
      <div className="hd">
        <span className="kind">{ent.kind}</span>
        <span className="nm">{ent.name}</span>
      </div>
      <div className="attrs">
        {Object.entries(ent).filter(([k]) => !['name', 'kind', 'aliases'].includes(k)).map(([k, v]) => (
          <div key={k}><span className="k">{k}</span><span className="v">{String(v)}</span></div>
        ))}
        {ent.aliases && ent.aliases.length > 0 && (
          <div className="aliases">aliases: {ent.aliases.map((a, i) => <code key={i}>{a}</code>)}</div>
        )}
      </div>
    </div>
  );
}

function DiffClaim({ change }) {
  return (
    <>
      <div className="diff-row diff-stack">
        <div className="diff-col" data-side="before">
          <div className="lbl">Before</div>
          <div className="nb-pc-claim">
            <div className="t">{change.before.text}</div>
            <div className="m"><span className="conf">{change.before.conf}</span></div>
            <div className="s">
              {change.before.sources.length === 0
                ? <span className="empty">no sources</span>
                : change.before.sources.map((s, i) => <span key={i} className="src">{s}</span>)}
            </div>
          </div>
        </div>
        <div className="diff-col" data-side="after">
          <div className="lbl">After</div>
          <div className="nb-pc-claim">
            <div className="t">{change.after.text}</div>
            <div className="m"><span className="conf">{change.after.conf}</span></div>
            <div className="s">
              {change.after.sources.map((s, i) => <span key={i} className="src">{s}</span>)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DiffSource({ change }) {
  return (
    <div>
      <div className="lbl">Target claim</div>
      <div className="nb-pc-claim" style={{ marginBottom: 12 }}>
        <div className="t">{change.target}</div>
      </div>
      <div className="lbl">Adds</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {change.adds.map((s, i) => (
          <div key={i} className="nb-pc-add">+ {s}</div>
        ))}
      </div>
    </div>
  );
}

function DiffBlockAdd({ change }) {
  return (
    <div>
      <div className="lbl">Block to insert</div>
      <div className="nb-pc-block">
        <div className="hd"><strong>{change.title.replace(/^Add /, '')}</strong></div>
        {Array.isArray(change.preview)
          ? <ul>{change.preview.map((p, i) => <li key={i}>{p}</li>)}</ul>
          : <p>{change.preview}</p>}
      </div>
    </div>
  );
}
function DiffBlockRemove({ change }) {
  return (
    <div>
      <div className="lbl">Block to remove</div>
      <div className="nb-pc-block" data-strike="true">
        <p>{Array.isArray(change.preview) ? change.preview.join(' ') : change.preview}</p>
      </div>
    </div>
  );
}
function DiffField({ change }) {
  return (
    <div>
      <div className="lbl">{change.target} · <code>{change.field}</code></div>
      <div className="nb-pc-fielddiff">
        <span className="before">{String(change.before)}</span>
        <span className="arr">→</span>
        <span className="after">{String(change.after)}</span>
      </div>
    </div>
  );
}

function Evidence({ list }) {
  if (!list || !list.length) return null;
  return (
    <div className="nb-pc-evidence">
      <div className="lbl">Evidence</div>
      <div className="ev">
        {list.map((e, i) => <span key={i} className="src">{e}</span>)}
      </div>
    </div>
  );
}

window.NBProposedChanges = ProposedChanges;
