// MobileInbox — unified attention feed: mentions, signals, tasks.
// Filter chips (All / Mentions / Signals / Tasks) update counts + list.
// Rows are tap-to-open, long-press-ish archive via the swipe affordance (static).
function MobileInbox({ onNavigate }) {
  const d = window.MDATA.inbox;
  const [filter, setFilter] = React.useState("all");
  const [archived, setArchived] = React.useState(() => new Set());
  const [read, setRead] = React.useState(() => new Set());

  const kindMatches = (k) => {
    if (filter === "all") return true;
    if (filter === "mentions") return k === "mention";
    if (filter === "signals")  return k === "signal";
    if (filter === "tasks")    return k === "task";
    return true;
  };

  const allItems = d.sections.flatMap(s => s.items);
  const unreadCount = allItems.filter(i => i.unread && !read.has(i.id) && !archived.has(i.id)).length;

  const markRead = (id) => {
    setRead(prev => {
      const next = new Set(prev); next.add(id); return next;
    });
  };
  const archive = (id, e) => {
    e.stopPropagation();
    setArchived(prev => {
      const next = new Set(prev); next.add(id); return next;
    });
  };

  const tabs = [
    { id: "all",      label: "All",      count: d.counts.all },
    { id: "mentions", label: "Mentions", count: d.counts.mentions },
    { id: "signals",  label: "Signals",  count: d.counts.signals },
    { id: "tasks",    label: "Tasks",    count: d.counts.tasks },
  ];

  const kindStyle = (k) => {
    switch (k) {
      case "mention": return { label: "@ Mention", color: "#7A50B8", bg: "rgba(122,80,184,.10)" };
      case "signal":  return { label: "Signal",    color: "#C77826", bg: "rgba(199,120,38,.10)" };
      case "task":    return { label: "Task",      color: "#0E7A5C", bg: "rgba(14,122,92,.10)" };
      default:        return { label: "Update",    color: "#475569", bg: "rgba(71,85,105,.08)" };
    }
  };

  const handleOpen = (item) => {
    markRead(item.id);
    // Route to an appropriate surface based on kind.
    if (item.kind === "mention") onNavigate?.("chat", { thread: "t1" });
    else if (item.kind === "signal") onNavigate?.("home");
    else if (item.kind === "task") onNavigate?.("reports");
  };

  return (
    <div className="m-surface m-inbox">
      <header className="m-header">
        <div className="m-header-l">
          <div className="m-header-title">Inbox</div>
          <div className="m-header-sub">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </div>
        </div>
        <div className="m-header-r">
          <button className="m-iconbtn" title="Filter">
            <window.MIcon name="filter" size={18}/>
          </button>
          <button className="m-iconbtn" title="Settings">
            <window.MIcon name="settings" size={18}/>
          </button>
        </div>
      </header>

      <div className="m-inbox-tabs">
        {tabs.map(t => (
          <button key={t.id}
                  className="m-inbox-tab"
                  data-active={filter === t.id}
                  onClick={() => setFilter(t.id)}>
            <span className="m-inbox-tab-label">{t.label}</span>
            <span className="m-inbox-tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="m-scroll">
        {d.sections.map(sec => {
          const visible = sec.items.filter(i => kindMatches(i.kind) && !archived.has(i.id));
          if (visible.length === 0) return null;
          return (
            <section key={sec.id} className="m-inbox-section">
              <div className="m-inbox-section-head">{sec.label}</div>
              <div className="m-inbox-list">
                {visible.map(item => {
                  const ks = kindStyle(item.kind);
                  const isUnread = item.unread && !read.has(item.id);
                  return (
                    <button key={item.id}
                            className="m-inbox-row"
                            data-unread={isUnread}
                            onClick={() => handleOpen(item)}>
                      <span className="m-inbox-row-avatar"
                            style={{ background: item.actor.avatar }}>
                        {item.actor.initials}
                      </span>
                      <span className="m-inbox-row-body">
                        <span className="m-inbox-row-top">
                          <span className="m-inbox-row-kind"
                                style={{ color: ks.color, background: ks.bg }}>
                            {ks.label}
                          </span>
                          <span className="m-inbox-row-entity">{item.entity}</span>
                          <span className="m-inbox-row-dot">·</span>
                          <span className="m-inbox-row-meta">{item.meta[1]}</span>
                        </span>
                        <span className="m-inbox-row-title">{item.title}</span>
                        <span className="m-inbox-row-snippet">{item.body}</span>
                      </span>
                      {isUnread && <span className="m-inbox-row-unread" aria-label="Unread"/>}
                      <span className="m-inbox-row-archive"
                            role="button"
                            title="Archive"
                            onClick={(e) => archive(item.id, e)}>
                        <window.MIcon name="archive" size={15}/>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        {allItems.filter(i => kindMatches(i.kind) && !archived.has(i.id)).length === 0 && (
          <div className="m-inbox-empty">
            <div className="m-inbox-empty-emoji">
              <window.MIcon name="ok" size={28} color="#0E7A5C"/>
            </div>
            <div className="m-inbox-empty-title">All clear</div>
            <div className="m-inbox-empty-sub">
              No {filter === "all" ? "items" : filter} in your inbox right now.
            </div>
          </div>
        )}

        <div className="m-inbox-foot">
          <button className="m-inbox-foot-btn">
            <window.MIcon name="archive" size={14}/> View archive
          </button>
          <button className="m-inbox-foot-btn"
                  onClick={() => setRead(new Set(allItems.map(i => i.id)))}>
            <window.MIcon name="ok" size={14}/> Mark all read
          </button>
        </div>
      </div>
    </div>
  );
}

window.MobileInbox = MobileInbox;
