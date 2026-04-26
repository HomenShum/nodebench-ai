// Workspace Memory — the inspectable surface for what NodeBench has learned
// across sessions. Sections:
//   · Recurring entities (high-frequency appearances)
//   · User corrections (entity merges, label fixes)
//   · Preferred report structure (templates promoted from saved reports)
//   · Trusted source preferences (publishers user cites repeatedly)
//   · Rejected matches (false-positive entities user dismissed)
//   · Successful workflows (saved action chains)
//
// This is the modernized version of MewAgent's __MewAgentMemory__ pattern —
// inspectable, portable, and keyed off the user's actual graph.

function WorkspaceMemory() {
  const I = window.NBIcon;
  const [section, setSection] = React.useState('entities');

  const sections = [
    { grp: 'Knowledge', items: [
      { id: 'entities',     label: 'Recurring entities', icon: 'Sparkles', count: 24 },
      { id: 'corrections',  label: 'Your corrections',   icon: 'Check',    count: 7  },
      { id: 'rejected',     label: 'Rejected matches',   icon: 'X',        count: 5  },
    ]},
    { grp: 'Style', items: [
      { id: 'templates',    label: 'Report templates',   icon: 'FileText', count: 4  },
      { id: 'sources',      label: 'Trusted sources',    icon: 'Link',     count: 12 },
    ]},
    { grp: 'Workflows', items: [
      { id: 'workflows',    label: 'Saved workflows',    icon: 'List',     count: 6  },
      { id: 'patterns',     label: 'Learned patterns',   icon: 'Grid',     count: 9  },
    ]},
  ];

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>Workspace memory</h1>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, maxWidth: 640 }}>
          What NodeBench has learned about your work — recurring entities, corrections you've made, templates you reuse, sources you trust. Nothing here is opaque; every entry traces back to a saved report or accepted proposal.
        </div>
      </div>

      <div className="nb-mem">
        <aside className="nb-mem-side">
          {sections.map(s => (
            <React.Fragment key={s.grp}>
              <div className="grp">{s.grp}</div>
              {s.items.map(item => {
                const Icon = I[item.icon] || I.User;
                return (
                  <button key={item.id} data-active={section === item.id} onClick={() => setSection(item.id)}>
                    <Icon width={13} height={13}/>
                    <span>{item.label}</span>
                    <span className="count">{item.count}</span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </aside>

        <section>
          {section === 'entities'    && <Entities/>}
          {section === 'corrections' && <Corrections/>}
          {section === 'rejected'    && <Rejected/>}
          {section === 'templates'   && <Templates/>}
          {section === 'sources'     && <TrustedSources/>}
          {section === 'workflows'   && <Workflows/>}
          {section === 'patterns'    && <Patterns/>}
        </section>
      </div>
    </div>
  );
}

function Entities() {
  const rows = [
    { name: 'DISCO',          kind: 'company', stat: '14 reports · 2,400 captures',  ago: 'today' },
    { name: 'Kiwi Camara',    kind: 'person',  stat: '6 reports · last seen Disrupt 2026', ago: '2d' },
    { name: 'voice-agent eval', kind: 'theme', stat: '8 reports · trending',         ago: '3d' },
    { name: 'Mercor',         kind: 'company', stat: '12 reports · hiring watch',   ago: '1w' },
    { name: 'Bessemer',       kind: 'investor',stat: '4 reports · co-investor',     ago: '1w' },
  ];
  return (
    <div>
      <h2 className="nb-mem-h2">Recurring entities</h2>
      <p className="nb-mem-sub">Entities that appear in 3+ reports. Reports cross-link to these automatically.</p>
      {rows.map(r => (
        <div key={r.name} className="nb-mem-row">
          <div className="av">{r.name[0]}</div>
          <div>
            <div className="nm">{r.name}</div>
            <div className="sub">
              <span style={{ textTransform: 'uppercase', fontWeight: 600, fontSize: 10, letterSpacing: '0.06em', color: 'var(--text-faint)', marginRight: 6 }}>{r.kind}</span>
              {r.stat}
            </div>
          </div>
          <div className="actions">
            <button>Open</button>
            <button>Mute</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Corrections() {
  const rows = [
    { what: 'DISCO',                  fix: 'merged with "Disco Inc."',          src: 'manual merge · Oct 2026' },
    { what: 'Anita Park',             fix: 'role: Product → CRO',               src: 'PR Newswire · Oct 2' },
    { what: 'Bessemer Venture',       fix: 'aliased "BVP" → "Bessemer"',        src: 'auto-merge confirmed' },
    { what: 'voice-agent eval',       fix: 'theme (was tagged "company")',      src: 'manual recategorize' },
    { what: 'Kiwi Camara',            fix: 'edu: "Stanford" → "Stanford CS, 2003"', src: 'TC Disrupt panel' },
  ];
  return (
    <div>
      <h2 className="nb-mem-h2">Your corrections</h2>
      <p className="nb-mem-sub">Things you've fixed that NodeBench will respect on future runs.</p>
      {rows.map((r, i) => (
        <div key={i} className="nb-mem-row">
          <div className="av" style={{ background: 'rgba(4,120,87,.10)', color: 'var(--success)' }}>✓</div>
          <div>
            <div className="nm">{r.what}</div>
            <div className="sub">{r.fix} · <code>{r.src}</code></div>
          </div>
          <div className="actions">
            <button>Revert</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Rejected() {
  const rows = [
    { what: 'Discord (gaming)',         why: 'collided with DISCO eDiscovery',  ago: '3w' },
    { what: 'Cognition Therapeutics',   why: 'collided with Cognition AI',      ago: '2w' },
    { what: 'Mercor (defunct ad-tech)', why: 'collided with Mercor (hiring)',   ago: '1mo' },
    { what: 'Anthropic Press',          why: 'low-quality blog source',         ago: '6w' },
    { what: 'voice-actor eval',         why: 'OCR error on capture',            ago: '2mo' },
  ];
  return (
    <div>
      <h2 className="nb-mem-h2">Rejected matches</h2>
      <p className="nb-mem-sub">False-positive entities NodeBench will not propose again.</p>
      {rows.map((r, i) => (
        <div key={i} className="nb-mem-row">
          <div className="av" style={{ background: 'rgba(220,38,38,.08)', color: 'var(--danger)' }}>✕</div>
          <div>
            <div className="nm">{r.what}</div>
            <div className="sub">{r.why} · {r.ago} ago</div>
          </div>
          <div className="actions">
            <button>Allow</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Templates() {
  const rows = [
    { name: 'Company dossier',        used: '14 times', why: 'cloned from Acme report' },
    { name: 'Person profile',         used: '8 times',  why: 'cloned from Kiwi Camara dossier' },
    { name: 'Event report (debrief)', used: '5 times',  why: 'used after every demo day' },
    { name: 'Customer-discovery memo',used: '3 times',  why: 'promoted from saved report' },
  ];
  return (
    <div>
      <h2 className="nb-mem-h2">Report templates</h2>
      <p className="nb-mem-sub">Structures NodeBench can clone for new entities. Promoted from reports you've saved twice or more.</p>
      {rows.map((r, i) => (
        <div key={i} className="nb-mem-row">
          <div className="av" style={{ background: 'rgba(94,106,210,.10)', color: '#4853A6' }}>T</div>
          <div>
            <div className="nm">{r.name}</div>
            <div className="sub">{r.used} · {r.why}</div>
          </div>
          <div className="actions">
            <button>Edit</button>
            <button>Use</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TrustedSources() {
  const rows = [
    { name: 'SEC EDGAR',         use: 'cited in 92% of financial claims', kind: 'filing' },
    { name: 'TechCrunch',        use: 'fundraise announcements',          kind: 'press' },
    { name: 'Bird & Bird memos', use: 'EU regulatory analysis',           kind: 'legal' },
    { name: 'NodeBench captures',use: 'event field-notes',                kind: 'memory' },
    { name: 'PR Newswire',       use: 'role changes & hires',             kind: 'press' },
  ];
  return (
    <div>
      <h2 className="nb-mem-h2">Trusted sources</h2>
      <p className="nb-mem-sub">Publishers you cite often. NodeBench prioritizes these in retrieval.</p>
      {rows.map((r, i) => (
        <div key={i} className="nb-mem-row">
          <div className="av">S</div>
          <div>
            <div className="nm">{r.name}</div>
            <div className="sub">
              <span style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-faint)', marginRight: 6 }}>{r.kind}</span>
              {r.use}
            </div>
          </div>
          <div className="actions">
            <button>Demote</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Workflows() {
  const rows = [
    { name: 'Event cleanup',     steps: 'organize → group → profile → followups', used: '5×' },
    { name: 'Bulk profile build',steps: 'capture → check memory → clone or enrich', used: '3×' },
    { name: 'Stale refresh',     steps: 'audit cache → refresh expired only',     used: '11×' },
    { name: 'Claim audit',       steps: 'scan claims → flag weak → propose verify', used: '2×' },
  ];
  return (
    <div>
      <h2 className="nb-mem-h2">Saved workflows</h2>
      <p className="nb-mem-sub">Action chains you've run before. Re-runnable as a single command.</p>
      {rows.map((r, i) => (
        <div key={i} className="nb-mem-row">
          <div className="av" style={{ background: 'var(--accent-primary-tint)', color: 'var(--accent-ink)' }}>W</div>
          <div>
            <div className="nm">{r.name}</div>
            <div className="sub"><code>{r.steps}</code> · used {r.used}</div>
          </div>
          <div className="actions">
            <button>Run</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Patterns() {
  const rows = [
    { what: 'Always include "Open questions" section',    sig: 'observed in 9 / 12 saved reports' },
    { what: 'Prefer claim blocks over inline assertions', sig: 'observed in 8 / 9 dossiers'       },
    { what: 'Cite SEC filings before press for financials', sig: 'observed in 14 / 14 financial claims' },
    { what: 'Group people under a "Team" h2',             sig: 'observed in 11 / 12 dossiers'     },
    { what: 'Link competitor entities with COMPETES_WITH',sig: 'observed in 7 / 8 market reports' },
  ];
  return (
    <div>
      <h2 className="nb-mem-h2">Learned patterns</h2>
      <p className="nb-mem-sub">Conventions NodeBench has observed in your saved work. Applied automatically when generating new reports.</p>
      {rows.map((r, i) => (
        <div key={i} className="nb-mem-row">
          <div className="av" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>P</div>
          <div>
            <div className="nm">{r.what}</div>
            <div className="sub">{r.sig}</div>
          </div>
          <div className="actions">
            <button>Disable</button>
          </div>
        </div>
      ))}
    </div>
  );
}

window.NBWorkspaceMemory = WorkspaceMemory;
