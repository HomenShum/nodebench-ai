// Mobile TabBar — bottom navigation.
// Order matches web app exactly: Home · Chat · Reports · Inbox · Me.
function MobileTabBar({ active, onChange, inboxCount = 3, chatCount = 2 }) {
  const tabs = [
    { id: "home",    label: "Home",    icon: "home" },
    { id: "chat",    label: "Chat",    icon: "chat",    badge: chatCount },
    { id: "reports", label: "Reports", icon: "reports" },
    { id: "inbox",   label: "Inbox",   icon: "inbox",   badge: inboxCount },
    { id: "me",      label: "Me",      icon: "me" },
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
