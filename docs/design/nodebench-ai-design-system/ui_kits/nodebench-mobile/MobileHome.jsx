// Mobile Home — watchlist tiles, nudges feed, recent threads. Interactive: tapping
// a thread or nudge routes to Chat via onNavigate(tab, payload).
function MobileHome({ onNavigate }) {
  const { MIcon, MTop, MBody, MDATA } = window;
  const d = MDATA;

  return (
    <div className="m-screen">
      <MTop
        title={<span>Node<em style={{color:"var(--accent)", fontStyle:"normal"}}>Bench</em></span>}
        sub={d.entity.name + " · workspace"}
        leading={<button className="m-icon-btn" aria-label="Menu"><MIcon name="thread" size={16}/></button>}
        trailing={<button className="m-icon-btn" aria-label="Notifications"><MIcon name="bell" size={16}/></button>}
      />
      <MBody>
        <div className="m-home-greet">
          <h2>Good morning, Homen.</h2>
          <p>Four signals on your watchlist this morning.</p>
        </div>

        <div className="m-search" onClick={() => onNavigate?.("chat")}>
          <MIcon name="search" size={16} color="var(--text-muted)"/>
          <input placeholder="Ask NodeBench about any company…" readOnly/>
          <kbd>⌘K</kbd>
        </div>

        {/* Watchlist */}
        <section className="m-section">
          <header className="m-section-head">
            <span className="kicker">Watchlist</span>
            <a href="#">Manage</a>
          </header>
          <div className="m-watch">
            {d.watchlist.map(w => (
              <div key={w.id} className="m-watch-tile"
                   onClick={() => onNavigate?.("brief", { entity: w.id })}>
                <div className="m-watch-tile-head">
                  <div className="m-watch-tile-avatar" style={{background: w.avatar}}>{w.initials}</div>
                  <div className="m-watch-tile-name">{w.name}</div>
                  <div className="m-watch-tile-ticker">{w.ticker}</div>
                </div>
                <div className="m-watch-tile-val">
                  <strong>{w.value}</strong>
                  <span className="delta" data-trend={w.trend}>{w.delta}</span>
                </div>
                <div className="m-watch-tile-meta">{w.meta}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Inbox nudges */}
        <section className="m-section">
          <header className="m-section-head">
            <span className="kicker">Since you were last here</span>
            <a href="#">All {d.nudges.length}</a>
          </header>
          <div className="m-nudges">
            {d.nudges.map(n => (
              <div key={n.id} className="m-nudge"
                   onClick={() => onNavigate?.("sources", { nudge: n.id })}>
                <div className="m-nudge-icon" data-kind={n.kind}>
                  <MIcon name={n.icon} size={14}/>
                </div>
                <div className="m-nudge-body">
                  <div className="m-nudge-title">{n.title}</div>
                  <div className="m-nudge-meta">{n.meta.map((m,i) => <span key={i}>{m}</span>)}</div>
                </div>
                <MIcon name="chevron" size={14} color="var(--text-faint)"/>
              </div>
            ))}
          </div>
        </section>

        {/* Recent threads */}
        <section className="m-section">
          <header className="m-section-head">
            <span className="kicker">Recent threads</span>
            <a href="#" onClick={(e)=>{e.preventDefault(); onNavigate?.("chat");}}>View all</a>
          </header>
          <div className="m-threads">
            {d.threads.map(t => (
              <div key={t.id} className="m-thread"
                   onClick={() => onNavigate?.("chat", { thread: t.id })}>
                <div className="m-thread-icon">
                  <MIcon name="chat" size={14}/>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div className="m-thread-title">{t.title}</div>
                  <div className="m-thread-meta">{t.meta}</div>
                </div>
                <MIcon name="chevron" size={14} color="var(--text-faint)"/>
              </div>
            ))}
          </div>
        </section>
      </MBody>
    </div>
  );
}

window.MobileHome = MobileHome;
