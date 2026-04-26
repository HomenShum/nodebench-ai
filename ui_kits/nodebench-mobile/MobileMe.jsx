// MobileMe — profile surface: identity, usage, workspaces, quick settings.
// Tapping a workspace "switches" (visual active state changes, badge updates).
function MobileMe({ onNavigate }) {
  const d = window.MDATA.me;
  const [activeWs, setActiveWs] = React.useState(
    d.workspaces.find(w => w.active)?.id || d.workspaces[0].id
  );

  return (
    <div className="m-surface m-me">
      <header className="m-header">
        <div className="m-header-l">
          <div className="m-header-title">Me</div>
          <div className="m-header-sub">Profile, workspaces, preferences</div>
        </div>
        <div className="m-header-r">
          <button className="m-iconbtn" title="Settings">
            <window.MIcon name="settings" size={18}/>
          </button>
        </div>
      </header>

      <div className="m-scroll">
        {/* Identity card */}
        <section className="m-me-identity">
          <div className="m-me-avatar" style={{ background: d.user.avatar }}>
            {d.user.initials}
          </div>
          <div className="m-me-identity-main">
            <div className="m-me-name">{d.user.name}</div>
            <div className="m-me-handle">@{d.user.handle} · {d.user.role}</div>
            <div className="m-me-email">{d.user.email}</div>
          </div>
          <button className="m-me-edit">Edit</button>
        </section>

        {/* Stats strip */}
        <section className="m-me-stats">
          {d.stats.map((s, i) => (
            <div key={i} className="m-me-stat">
              <div className="m-me-stat-v">{s.v}</div>
              <div className="m-me-stat-l">{s.l}</div>
            </div>
          ))}
        </section>

        {/* Workspaces */}
        <section className="m-me-section">
          <div className="m-me-section-head">
            <span>Workspaces</span>
            <button className="m-me-section-action">
              <window.MIcon name="plus" size={13}/> New
            </button>
          </div>
          <div className="m-me-ws-list">
            {d.workspaces.map(w => {
              const active = activeWs === w.id;
              return (
                <button key={w.id}
                        className="m-me-ws-row"
                        data-active={active}
                        onClick={() => setActiveWs(w.id)}>
                  <span className="m-me-ws-avatar" style={{ background: w.avatar }}>
                    {w.initials}
                  </span>
                  <span className="m-me-ws-body">
                    <span className="m-me-ws-name">{w.name}</span>
                    <span className="m-me-ws-meta">
                      {w.role} · {w.members} {w.members === 1 ? "member" : "members"}
                    </span>
                  </span>
                  {active
                    ? <span className="m-me-ws-active">Active</span>
                    : <window.MIcon name="chevron" size={16} color="#9CA3AF"/>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Quick settings */}
        <section className="m-me-section">
          <div className="m-me-section-head">
            <span>Quick settings</span>
          </div>
          <div className="m-me-settings">
            {d.quickSettings.map(s => (
              <button key={s.id} className="m-me-setting-row">
                <span className="m-me-setting-icon">
                  <window.MIcon name={s.icon} size={17} color="#475569"/>
                </span>
                <span className="m-me-setting-main">
                  <span className="m-me-setting-label">{s.label}</span>
                  <span className="m-me-setting-value">{s.value}</span>
                </span>
                <window.MIcon name="chevron" size={15} color="#9CA3AF"/>
              </button>
            ))}
          </div>
        </section>

        {/* Shortcuts */}
        <section className="m-me-section">
          <div className="m-me-section-head">
            <span>Shortcuts</span>
          </div>
          <div className="m-me-shortcuts">
            <button className="m-me-shortcut" onClick={() => onNavigate?.("home")}>
              <window.MIcon name="star" size={16} color="#D97757"/>
              <span>Starred threads</span>
            </button>
            <button className="m-me-shortcut" onClick={() => onNavigate?.("reports")}>
              <window.MIcon name="reports" size={16} color="#475569"/>
              <span>My drafts</span>
            </button>
            <button className="m-me-shortcut">
              <window.MIcon name="archive" size={16} color="#475569"/>
              <span>Archive</span>
            </button>
            <button className="m-me-shortcut">
              <window.MIcon name="doc" size={16} color="#475569"/>
              <span>Billing &amp; plan</span>
            </button>
          </div>
        </section>

        <div className="m-me-foot">
          <div className="m-me-foot-line">NodeBench · member since {d.user.joined}</div>
          <button className="m-me-foot-signout">Sign out</button>
        </div>
      </div>
    </div>
  );
}

window.MobileMe = MobileMe;
