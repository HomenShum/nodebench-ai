// Shared workspace primitives: Shell, EntityChip, Cite, CompanyCard, Icon
// All export to window for cross-file access.

// ── Icon ───────────────────────────────────────────────────────────
const ICONS = {
  search:    'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  share:    'M15 8a3 3 0 1 0-3-3M15 16a3 3 0 1 1-3 3M7 12a3 3 0 1 1 3-3M7.6 13.5l6.8 4M14.4 6.5 7.6 10.5',
  history:  'M3 12a9 9 0 1 0 3.3-6.95L3 8M3 3v5h5M12 7v5l3 2',
  more:     'M12 12h.01M6 12h.01M18 12h.01',
  chat:     'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  brief:    'M9 11H6l6-8 6 8h-3v9H9z',
  cards:    'M4 6h16v4H4zM4 14h16v4H4z',
  notebook: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20',
  sources:  'M14 3v4a1 1 0 0 0 1 1h4M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2zM8 13h8M8 17h6',
  map:      'M9 3v15M15 6v15M2 6h6M16 6l5-3v15l-5 3',
  link:     'M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7M14 11a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7',
  external: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
  send:     'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  plus:     'M12 5v14M5 12h14',
  save:     'm19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
  sparkle:  'm12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z',
  clock:    'M12 6v6l4 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z',
  check:    'M20 6 9 17l-5-5',
  warn:     'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  paperclip:'m21.4 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',
  globe:    'M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20',
  filter:   'M22 3H2l8 9.46V19l4 2v-8.54z',
  refresh:  'M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10M3.51 15A9 9 0 0 0 18.36 18.36L23 14',
  bell:     'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.29 21a2 2 0 0 0 3.42 0',
  layers:   'm12 2 10 5-10 5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  chevron:  'm9 18 6-6-6-6',
  chevronDown:'m6 9 6 6 6-6',
  up:       'm18 15-6-6-6 6',
  down:     'm6 9 6 6 6-6',
  left:     'm15 18-6-6 6-6',
  right:    'm9 18 6-6-6-6',
  close:    'M18 6 6 18M6 6l18 12',
  pin:      'M12 2v7M9 9h6l-3 13zM4 9h16',
  quote:    'M3 17a5 5 0 0 1 5-5V8a7 7 0 0 0-7 7zm11 0a5 5 0 0 1 5-5V8a7 7 0 0 0-7 7z',
  target:   'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  network:  'M9 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0zM21 6a3 3 0 1 0-6 0 3 3 0 0 0 6 0zM21 18a3 3 0 1 0-6 0 3 3 0 0 0 6 0zM9 12h6M15 6l-6 6M15 18l-6-6',
  eye:      'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
};

function Icon({ name, size = 16, style = {} }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
         viewBox="0 0 24 24" className="ws-ic" style={style} aria-hidden>
      {d.split('M').filter(Boolean).map((chunk, i) => (
        <path key={i} d={'M' + chunk.trim()} />
      ))}
    </svg>
  );
}

// ── EntityChip ─────────────────────────────────────────────────────
function EntityChip({ name, type = 'company', code, onClick, style }) {
  const typeStyle = {
    company:  '',
    person:   'ent-chip-dot--slate',
    investor: 'ent-chip-dot--purple',
    market:   'ent-chip-dot--amber',
    regulation: 'ent-chip-dot--green',
  }[type] || '';
  const initials = code || name.slice(0, 2).toUpperCase();
  return (
    <span className="ent-chip" onClick={onClick} style={style}>
      <span className={`ent-chip-dot ${typeStyle}`}>{initials[0]}</span>
      <span>{name}</span>
    </span>
  );
}

// ── Citation ───────────────────────────────────────────────────────
function Cite({ n, onClick }) {
  return <a className="cite" onClick={onClick} title={`Source ${n}`}>{n}</a>;
}

// ── CompanyCard (reused across surfaces) ───────────────────────────
function CompanyCard({
  name, ticker, kicker, subtitle, avatar, avatarBg, metrics = [], footer, active, onClick, style,
}) {
  return (
    <div className="cc" data-active={!!active} onClick={onClick} style={style}>
      <div className="cc-header">
        <div className="cc-avatar" style={{ background: avatarBg || 'linear-gradient(135deg, #1A365D, #0F4C81)' }}>
          {avatar}
        </div>
        <div className="cc-title-row">
          <div className="cc-title">
            {name}
            {ticker ? <span style={{ fontSize: 10.5, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>· {ticker}</span> : null}
          </div>
          <div className="cc-subtitle">{subtitle}</div>
        </div>
        {kicker ? <span className="pill pill-neutral" style={{ fontSize: 10 }}>{kicker}</span> : null}
      </div>
      <div className="cc-body">
        {metrics.length > 0 && (
          <div className="cc-metrics">
            {metrics.map((m, i) => (
              <div key={i} className="cc-metric">
                <span className="cc-metric-label">{m.label}</span>
                <span className="cc-metric-val" data-trend={m.trend}>{m.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {footer && <div className="cc-footer">{footer}</div>}
    </div>
  );
}

// ── Workspace Shell ────────────────────────────────────────────────
function WorkspaceShell({ tabs, active, onTabChange, entity, inspector, children, headerExtra }) {
  return (
    <div className="ws-shell">
      <div className="ws-header">
        <div className="ws-brand">
          <svg width="22" height="22" viewBox="0 0 32 32" style={{ borderRadius: 5 }}>
            <rect width="32" height="32" rx="7" fill="#D97757"/>
            <path d="M8 22 L12 10 L14 10 L16 18 L18 10 L20 10 L24 22 L21.5 22 L19 14 L17 22 L15 22 L13 14 L10.5 22 Z" fill="#FFFAF0"/>
          </svg>
          <span>NodeBench <em>AI</em></span>
        </div>
        {entity && (
          <div className="ws-entity">
            <span className="ws-entity-avatar" style={entity.style}>{entity.initials}</span>
            <span className="ws-entity-name">{entity.name}</span>
            <span className="ws-entity-meta">{entity.meta}</span>
          </div>
        )}
        <nav className="ws-tabs">
          {tabs.map(t => (
            <button key={t.id} className="ws-tab"
                    data-active={active === t.id}
                    onClick={() => onTabChange?.(t.id)}>
              <Icon name={t.icon} size={13} />
              <span>{t.label}</span>
              {t.count != null && <span className="ws-tab-count">{t.count}</span>}
            </button>
          ))}
        </nav>
        <div className="ws-header-actions">
          {headerExtra}
          <button className="ws-icon-btn" title="Share"><Icon name="share" size={15} /></button>
          <button className="ws-icon-btn" title="History"><Icon name="history" size={15} /></button>
          <button className="ws-icon-btn" title="More"><Icon name="more" size={15} /></button>
        </div>
      </div>
      <div className="ws-body" data-has-inspector={!!inspector}>
        <div className="ws-main">{children}</div>
        {inspector && <aside className="ws-inspector">{inspector}</aside>}
      </div>
    </div>
  );
}

Object.assign(window, { Icon, EntityChip, Cite, CompanyCard, WorkspaceShell });
