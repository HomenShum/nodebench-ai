// Sticky translucent topbar — logo mark, surface tabs, search, theme toggle.
function TopNav({ surface, onSurface, onToggleTheme, theme }) {
  const { Search, Command, Sun, Moon, Bell } = window.NBIcon;
  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'chat', label: 'Chat' },
    { id: 'reports', label: 'Reports' },
    { id: 'nudges', label: 'Nudges' },
    { id: 'me', label: 'Me' },
  ];

  return (
    <div className="nb-topnav">
      <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="../../assets/logo-mark.svg" width="28" height="28" alt="NodeBench" style={{ borderRadius: 6 }} />
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
            NodeBench <span style={{ color: 'var(--accent-primary)' }}>AI</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 8, background: 'var(--bg-secondary)', padding: 4, borderRadius: 14 }}>
          {tabs.map(t => {
            const active = surface === t.id;
            return (
              <button key={t.id} onClick={() => onSurface(t.id)}
                style={{
                  border: active ? '1px solid var(--border-subtle)' : '1px solid transparent',
                  background: active ? 'var(--bg-surface)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 600 : 500,
                  fontSize: 13, padding: '6px 14px', borderRadius: 10,
                  boxShadow: active ? '0 10px 24px -20px rgba(15,23,42,.35)' : 'none',
                  transition: 'all 160ms var(--ease-out-expo)',
                }}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <label className="nb-focus" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid var(--border-default)', background: 'var(--bg-surface)',
            borderRadius: 12, padding: '7px 12px', width: '100%', maxWidth: 360,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <Search width={15} height={15} style={{ color: 'var(--text-faint)' }} />
            <input placeholder="Search reports, entities, nudges…"
              style={{ flex: 1, border: 0, outline: 0, fontSize: 13, color: 'var(--text-primary)', background: 'transparent', fontFamily: 'inherit' }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>
              <Command width={10} height={10} /> K
            </span>
          </label>
        </div>

        {/* Session */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="nb-btn nb-btn-ghost" style={{ width: 36, height: 36, padding: 0, justifyContent: 'center', borderRadius: 999 }}>
            <Bell width={16} height={16} />
          </button>
          <button onClick={onToggleTheme} className="nb-btn nb-btn-ghost" style={{ width: 36, height: 36, padding: 0, justifyContent: 'center', borderRadius: 999 }}>
            {theme === 'dark' ? <Sun width={16} height={16} /> : <Moon width={16} height={16} />}
          </button>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: 'linear-gradient(135deg, #D97757, #5E6AD2)', color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>HS</div>
        </div>
      </div>
    </div>
  );
}

window.NBTopNav = TopNav;
