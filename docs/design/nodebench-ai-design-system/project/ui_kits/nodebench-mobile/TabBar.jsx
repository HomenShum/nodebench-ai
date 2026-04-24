// Mobile TabBar — bottom navigation between 5 surfaces.
function MobileTabBar({ active, onChange }) {
  const tabs = [
    { id: "home",     label: "Home",     icon: "home" },
    { id: "chat",     label: "Chat",     icon: "chat",     badge: 2 },
    { id: "brief",    label: "Brief",    icon: "brief" },
    { id: "sources",  label: "Sources",  icon: "sources" },
    { id: "notebook", label: "Notebook", icon: "notebook" },
  ];
  return (
    <nav className="m-tabbar" aria-label="Primary">
      {tabs.map(t => (
        <button key={t.id}
                className="m-tab"
                data-active={active === t.id}
                onClick={() => onChange(t.id)}>
          <window.MIcon name={t.icon} size={20} stroke={active === t.id ? 2 : 1.7}/>
          <span className="m-tab-label">{t.label}</span>
          {t.badge ? <span className="m-tab-badge">{t.badge}</span> : null}
        </button>
      ))}
    </nav>
  );
}
window.MobileTabBar = MobileTabBar;
