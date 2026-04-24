// Me — the user's home within NodeBench.
// Split into: Profile + Notebook (watched entities) + Settings (notifications, pace, density, data, integrations, usage).
// Settings wire DIRECTLY to the tweaks protocol (__edit_mode_set_keys) so changing "Pace" here
// changes the same token the Tweaks toolbar toggles — one source of truth.

function MePage({ tweaks, setTweak }) {
  const I = window.NBIcon;
  const [section, setSection] = React.useState('notebook');

  // --- Notebook data (was EntityNotebook) ---
  const [entities, setEntities] = React.useState([
    { id: 'disco',     name: 'DISCO',      tag: 'legal tech',   lastReport: 'Nov 14', reports: 3, changes: 2 },
    { id: 'mercor',    name: 'Mercor',     tag: 'hiring',       lastReport: 'Nov 12', reports: 4, changes: 5 },
    { id: 'cognition', name: 'Cognition',  tag: 'agents',       lastReport: 'Nov 10', reports: 2, changes: 1 },
    { id: 'turing',    name: 'Turing',     tag: 'services',     lastReport: 'Nov 03', reports: 5, changes: 0 },
    { id: 'anthropic', name: 'Anthropic',  tag: 'foundation',   lastReport: 'Oct 28', reports: 1, changes: 3 },
    { id: 'openai',    name: 'OpenAI',     tag: 'foundation',   lastReport: 'Oct 22', reports: 6, changes: 4 },
  ]);
  function unwatch(id) { setEntities(entities.filter(e => e.id !== id)); }

  const nav = [
    { group: 'Account', items: [
      { id: 'notebook',     label: 'Notebook',      icon: 'Book',     count: entities.length },
      { id: 'profile',      label: 'Profile',       icon: 'User' },
    ]},
    { group: 'Preferences', items: [
      { id: 'notifications',label: 'Notifications', icon: 'Bell' },
      { id: 'pace',         label: 'Pace & feel',   icon: 'Zap' },
      { id: 'data',         label: 'Data & memory', icon: 'FileText' },
    ]},
    { group: 'Workspace', items: [
      { id: 'integrations', label: 'Integrations',  icon: 'Link' },
      { id: 'usage',        label: 'Usage',         icon: 'Sparkles' },
    ]},
  ];

  return (
    <div className="nb-me-grid nb-reveal">
      {/* ═══ Side nav ═══ */}
      <aside className="nb-me-sidenav">
        <div className="hd">
          <div className="av">HS</div>
          <div style={{ minWidth: 0 }}>
            <div className="nm">Harper Singh</div>
            <div className="em">harper@quickstart.ai</div>
          </div>
        </div>
        {nav.map(group => (
          <React.Fragment key={group.group}>
            <div className="section-title">{group.group}</div>
            {group.items.map(item => {
              const IconC = I[item.icon] || I.User;
              return (
                <button key={item.id} data-active={section === item.id} onClick={() => setSection(item.id)}>
                  <IconC width={14} height={14}/>
                  <span>{item.label}</span>
                  {item.count !== undefined && <span className="count">{item.count}</span>}
                </button>
              );
            })}
          </React.Fragment>
        ))}
        <div className="divider"/>
        <button>
          <I.LogOut width={14} height={14}/>
          <span>Sign out</span>
        </button>
      </aside>

      {/* ═══ Content ═══ */}
      <section>
        {section === 'notebook' && <NotebookSection entities={entities} onUnwatch={unwatch} />}
        {section === 'profile' && <ProfileSection />}
        {section === 'notifications' && <NotificationsSection tweaks={tweaks} setTweak={setTweak} />}
        {section === 'pace' && <PaceSection tweaks={tweaks} setTweak={setTweak} />}
        {section === 'data' && <DataSection />}
        {section === 'integrations' && <IntegrationsSection />}
        {section === 'usage' && <UsageSection />}
      </section>
    </div>
  );
}

/* ══════════════ Notebook (was EntityNotebook) ══════════════ */
function NotebookSection({ entities, onUnwatch }) {
  const I = window.NBIcon;
  return (
    <div>
      <h1 className="nb-settings-h1">Notebook</h1>
      <p className="nb-settings-sub">Entities you've taught NodeBench to watch. Reports and Inbox items anchor to these.</p>
      <div className="nb-settings-section" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{entities.length} watched entities</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>New reports automatically link to entities they mention.</div>
          </div>
          <button className="nb-btn nb-btn-secondary" style={{ fontSize: 12.5 }}>
            <I.Plus width={13} height={13}/> Add entity
          </button>
        </div>
        <div>
          {entities.map((e, i) => (
            <div key={e.id} style={{
              display: 'grid', gridTemplateColumns: '36px 1fr auto auto', gap: 14, alignItems: 'center',
              padding: '12px 20px',
              borderTop: i === 0 ? 0 : '1px solid var(--border-subtle)',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--accent-primary-tint)', color: 'var(--accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {e.name[0]}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{e.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  {e.tag} · {e.reports} reports · last activity {e.lastReport}
                  {e.changes > 0 && <span style={{ color: 'var(--accent-primary)', marginLeft: 6, fontWeight: 600 }}>· {e.changes} new</span>}
                </div>
              </div>
              <button className="nb-btn nb-btn-ghost" style={{ fontSize: 11.5, padding: '5px 10px' }}>
                <I.FileText width={12} height={12}/> Reports
              </button>
              <button onClick={() => onUnwatch(e.id)} className="nb-btn nb-btn-ghost" aria-label="Unwatch"
                      style={{ width: 28, height: 28, padding: 0, justifyContent: 'center', borderRadius: 999 }}>
                <I.X width={13} height={13}/>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════ Profile ══════════════ */
function ProfileSection() {
  return (
    <div>
      <h1 className="nb-settings-h1">Profile</h1>
      <p className="nb-settings-sub">How you appear inside NodeBench and on shared reports.</p>
      <div className="nb-settings-section">
        <h2>Identity</h2>
        <p>Name and email shown on anything you share.</p>
        <div className="nb-field"><div className="nb-field-l">Display name</div><div className="nb-field-r"><input type="text" defaultValue="Harper Singh"/></div></div>
        <div className="nb-field"><div className="nb-field-l">Email</div><div className="nb-field-r"><input type="email" defaultValue="harper@quickstart.ai"/></div></div>
        <div className="nb-field"><div className="nb-field-l">Role<span className="hint">affects report templates offered</span></div><div className="nb-field-r"><select defaultValue="analyst"><option value="analyst">Analyst</option><option value="investor">Investor</option><option value="founder">Founder</option><option value="other">Other</option></select></div></div>
      </div>
      <div className="nb-settings-section">
        <h2>Default session</h2>
        <p>The lane the composer opens in each morning.</p>
        <div className="nb-field"><div className="nb-field-l">Morning lane</div><div className="nb-field-r"><select defaultValue="research"><option value="research">Research</option><option value="brief">Brief</option><option value="diligence">Diligence</option></select></div></div>
      </div>
    </div>
  );
}

/* ══════════════ Notifications ══════════════ */
function NotificationsSection({ tweaks, setTweak }) {
  const rows = [
    { k: 'notifyAct',   label: 'Act-now items',      hint: 'Materially changes a saved report' },
    { k: 'notifyAuto',  label: 'Auto-handled',       hint: 'Report was refreshed or promoted automatically' },
    { k: 'notifyWatch', label: 'Watching',           hint: 'Entity you follow moved but no report affected' },
    { k: 'notifyFyi',   label: 'FYI',                hint: 'Filings refreshed, no material change' },
  ];
  return (
    <div>
      <h1 className="nb-settings-h1">Notifications</h1>
      <p className="nb-settings-sub">Only four rings. Silence the ones you don't need.</p>
      <div className="nb-settings-section">
        <h2>In-app (Inbox)</h2>
        <p>These always land — filters control ringing.</p>
        {rows.map(r => (
          <div key={r.k} className="nb-field">
            <div className="nb-field-l">{r.label}<span className="hint">{r.hint}</span></div>
            <div className="nb-field-r">
              <button className="nb-switch" data-on={!!tweaks[r.k]} onClick={() => setTweak(r.k, !tweaks[r.k])} aria-label={`Toggle ${r.label}`}/>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{tweaks[r.k] ? 'Ringing' : 'Silent'}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="nb-settings-section">
        <h2>Email digest</h2>
        <p>A once-a-day summary of anything you muted in-app.</p>
        <div className="nb-field">
          <div className="nb-field-l">Cadence</div>
          <div className="nb-field-r">
            <select value={tweaks.digest || 'daily'} onChange={e => setTweak('digest', e.target.value)}>
              <option value="off">Off</option>
              <option value="daily">Daily — 8am local</option>
              <option value="weekly">Weekly — Monday 8am</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════ Pace & feel (mirrors tweaks) ══════════════ */
function PaceSection({ tweaks, setTweak }) {
  return (
    <div>
      <h1 className="nb-settings-h1">Pace & feel</h1>
      <p className="nb-settings-sub">How NodeBench shows its thinking. These are the same controls as the Tweaks toolbar.</p>

      <div className="nb-settings-section">
        <h2>Streaming pace</h2>
        <p>How fast the answer types in. Slower = more space to read reasoning; faster = less waiting.</p>
        <div className="nb-field">
          <div className="nb-field-l">Pace</div>
          <div className="nb-field-r" style={{ gap: 6 }}>
            {['instant', 'conversational', 'deliberate'].map(p => (
              <button key={p} onClick={() => setTweak('pace', p)}
                      className="nb-btn"
                      style={{
                        padding: '6px 12px', fontSize: 12,
                        borderRadius: 8,
                        border: `1px solid ${tweaks.pace === p ? 'var(--accent-primary-border)' : 'var(--border-default)'}`,
                        background: tweaks.pace === p ? 'var(--accent-primary-tint)' : 'var(--bg-surface)',
                        color: tweaks.pace === p ? 'var(--accent-ink)' : 'var(--text-secondary)',
                        fontWeight: tweaks.pace === p ? 600 : 500,
                      }}>
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="nb-settings-section">
        <h2>Density</h2>
        <p>Compact fits more on-screen; spacious leaves breathing room on long reports.</p>
        <div className="nb-field">
          <div className="nb-field-l">Density</div>
          <div className="nb-field-r">
            <input type="range" min="0.8" max="1.25" step="0.05"
                   value={tweaks.density || 1}
                   onChange={e => setTweak('density', parseFloat(e.target.value))}
                   style={{ flex: 1, maxWidth: 260 }}/>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>
              {(tweaks.density || 1).toFixed(2)}×
            </span>
          </div>
        </div>
      </div>

      <div className="nb-settings-section">
        <h2>Texture</h2>
        <p>Paper — warm parchment backdrop with grain. Clean — neutral gray.</p>
        <div className="nb-field">
          <div className="nb-field-l">Background</div>
          <div className="nb-field-r">
            <button className="nb-switch" data-on={tweaks.texture === 'on'} onClick={() => setTweak('texture', tweaks.texture === 'on' ? 'off' : 'on')}/>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{tweaks.texture === 'on' ? 'Paper' : 'Clean'}</span>
          </div>
        </div>
      </div>

      <div className="nb-settings-section">
        <h2>Reasoning trace</h2>
        <p>Show the tool-call ladder while the answer streams.</p>
        <div className="nb-field">
          <div className="nb-field-l">Show trace</div>
          <div className="nb-field-r">
            <button className="nb-switch" data-on={!!tweaks.showTrace} onClick={() => setTweak('showTrace', !tweaks.showTrace)}/>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════ Data & memory ══════════════ */
function DataSection() {
  return (
    <div>
      <h1 className="nb-settings-h1">Data & memory</h1>
      <p className="nb-settings-sub">What NodeBench retains across sessions.</p>
      <div className="nb-settings-section">
        <h2>Report retention</h2>
        <p>Saved reports stay indefinitely. Drafts and unsaved runs follow this rule.</p>
        <div className="nb-field">
          <div className="nb-field-l">Keep unsaved runs</div>
          <div className="nb-field-r">
            <select defaultValue="30">
              <option value="0">Forget on close</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="forever">Keep forever</option>
            </select>
          </div>
        </div>
      </div>
      <div className="nb-settings-section">
        <h2>Notebook training</h2>
        <p>Let NodeBench learn your preferences (favorite source types, phrasing, report structure) from the reports you save.</p>
        <div className="nb-field">
          <div className="nb-field-l">Learn from saves</div>
          <div className="nb-field-r"><button className="nb-switch" data-on={true}/></div>
        </div>
        <div className="nb-field">
          <div className="nb-field-l">Learn from dismisses<span className="hint">What you dismiss in Inbox trains noise filters</span></div>
          <div className="nb-field-r"><button className="nb-switch" data-on={true}/></div>
        </div>
      </div>
      <div className="nb-settings-section">
        <h2>Export & delete</h2>
        <p>Your reports are yours.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="nb-btn nb-btn-secondary" style={{ fontSize: 12.5 }}>Export all reports (.zip)</button>
          <button className="nb-btn nb-btn-ghost" style={{ fontSize: 12.5, color: 'var(--danger)' }}>Delete everything</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════ Integrations ══════════════ */
function IntegrationsSection() {
  const items = [
    { id: 'slack',   glyph: '#',   name: 'Slack',      status: 'Act-now items → #nodebench channel', connected: true },
    { id: 'gmail',   glyph: 'M',   name: 'Gmail',      status: 'Draft briefs as replies', connected: true },
    { id: 'linear',  glyph: 'L',   name: 'Linear',     status: 'Create tickets from report recs', connected: false },
    { id: 'notion',  glyph: 'N',   name: 'Notion',     status: 'Push saved reports to a workspace', connected: false },
    { id: 'calendar',glyph: '▧',   name: 'Calendar',   status: 'Surface entities before you meet them', connected: false },
  ];
  return (
    <div>
      <h1 className="nb-settings-h1">Integrations</h1>
      <p className="nb-settings-sub">Where NodeBench reaches out from — never in.</p>
      <div className="nb-settings-section">
        {items.map(it => (
          <div key={it.id} className="nb-integration-card">
            <div className="icon">{it.glyph}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t">{it.name}</div>
              <div className="s">{it.status}</div>
            </div>
            <button className="nb-btn"
                    style={{
                      fontSize: 12, padding: '6px 12px',
                      border: `1px solid ${it.connected ? 'var(--border-default)' : 'var(--accent-primary-border)'}`,
                      background: it.connected ? 'var(--bg-surface)' : 'var(--accent-primary-tint)',
                      color: it.connected ? 'var(--text-secondary)' : 'var(--accent-ink)',
                      fontWeight: 600,
                    }}>
              {it.connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════ Usage ══════════════ */
function UsageSection() {
  const quotas = [
    { k: 'Runs this month',        used: 84,  total: 200, unit: 'runs' },
    { k: 'Saved reports',          used: 17,  total: 50,  unit: 'reports' },
    { k: 'Watched entities',       used: 12,  total: 25,  unit: 'entities' },
    { k: 'Source credits',         used: 1840,total: 2500,unit: 'credits', warn: true },
  ];
  return (
    <div>
      <h1 className="nb-settings-h1">Usage</h1>
      <p className="nb-settings-sub">Current billing period. Resets Dec 1.</p>
      <div className="nb-settings-section">
        <h2>This month</h2>
        <p>You're on the <strong style={{ color: 'var(--accent-primary)' }}>Analyst</strong> plan.</p>
        {quotas.map(q => {
          const pct = Math.round((q.used / q.total) * 100);
          return (
            <div key={q.k} className="nb-usage-row">
              <div className="nb-usage-head">
                <span className="k">{q.k}</span>
                <span className="v">{q.used.toLocaleString()} / {q.total.toLocaleString()} {q.unit}</span>
              </div>
              <div className={`nb-usage-bar ${pct >= 70 && q.warn ? 'warn' : ''}`}><span style={{ width: pct + '%' }}/></div>
            </div>
          );
        })}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button className="nb-btn nb-btn-primary" style={{ padding: '8px 14px', fontSize: 12.5 }}>Upgrade to Team</button>
          <button className="nb-btn nb-btn-ghost" style={{ fontSize: 12.5 }}>View invoices</button>
        </div>
      </div>
    </div>
  );
}

window.NBMePage = MePage;
// Legacy alias for back-compat
window.NBEntityNotebook = MePage;
