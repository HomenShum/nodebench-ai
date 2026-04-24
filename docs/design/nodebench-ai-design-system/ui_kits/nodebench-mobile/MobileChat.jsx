// Mobile Chat — answer-first, matches workspace Chat. Interactive:
// - tap a follow-up chip → updates query + answer
// - tap a card → active state changes (inspector drill emulation)
// - tap a source row → navigate to Sources with anchor
function MobileChat({ onNavigate, initialThreadId }) {
  const { MIcon, MTop, MBody, MCite, MDATA } = window;
  const d = MDATA;

  const thread = d.threads.find(t => t.id === initialThreadId) || d.threads[0];
  const [query, setQuery] = React.useState(d.chat.query);
  const [activeCardId, setActiveCardId] = React.useState("disco");
  const [followUpQuery, setFollowUpQuery] = React.useState(null);
  const bodyRef = React.useRef();

  const showFollowUp = (q) => {
    setFollowUpQuery(q);
    setQuery(q);
    requestAnimationFrame(() => { bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" }); });
  };

  return (
    <div className="m-screen">
      <MTop
        title={thread.title.length > 30 ? thread.title.slice(0,30) + "…" : thread.title}
        sub={`${d.chat.sources.length} sources · updated 42m`}
        leading={<button className="m-icon-btn" aria-label="Back" onClick={() => onNavigate?.("home")}><MIcon name="back" size={16}/></button>}
        trailing={<button className="m-icon-btn" aria-label="Share"><MIcon name="share" size={16}/></button>}
      />
      <MBody>
        <div className="m-chat-body" ref={bodyRef}>
          {/* Query echo */}
          <div className="m-chat-query">
            <div className="m-chat-query-u">HS</div>
            <div className="m-chat-query-t">{query}</div>
          </div>

          {/* Run bar */}
          <div className="m-chat-runbar">
            <span className="pill pill-ok">
              <MIcon name="ok" size={11} color="var(--success)"/>
              <span>verified</span>
            </span>
            <span className="pill pill-mono pill-neutral">14 sources</span>
            <span className="pill pill-mono pill-neutral">3 entities</span>
            <span className="pill pill-accent">conf. 84%</span>
          </div>

          {/* Headline answer */}
          <h1 className="m-chat-title">{d.chat.title}</h1>
          <p className="m-chat-p">
            {d.chat.tldr} <MCite n={1}/><MCite n={2}/>
          </p>

          {/* So-what callout */}
          <div className="m-chat-callout">
            <div className="m-chat-callout-head">
              <MIcon name="sparkle" size={11}/> <span>{d.chat.callout.label}</span>
            </div>
            <p>{d.chat.callout.body} <MCite n={3}/></p>
          </div>

          {/* Cards strip */}
          <div className="m-strip-head">
            <span className="kicker">Entities</span>
            <a href="#" onClick={(e)=>{e.preventDefault(); onNavigate?.("brief");}}>Open cards →</a>
          </div>
          <div className="m-strip">
            {d.chat.cards.map(c => (
              <div key={c.id} className="m-card"
                   data-active={activeCardId === c.id}
                   onClick={() => setActiveCardId(c.id)}>
                <div className="m-card-head">
                  <div className="m-card-avatar" style={{background: c.avatar}}>{c.initials}</div>
                  <div>
                    <div className="m-card-name">{c.name}</div>
                    <div className="m-card-sub">{c.sub}</div>
                  </div>
                </div>
                <div className="m-card-metrics">
                  {c.metrics.map(([l,v,t],i) => (
                    <div key={i} className="m-card-metric">
                      <div className="m-card-metric-l">{l}</div>
                      <div className="m-card-metric-v" data-trend={t}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sources */}
          <div className="m-strip-head">
            <span className="kicker">Top sources</span>
            <a href="#" onClick={(e)=>{e.preventDefault(); onNavigate?.("sources");}}>All {d.chat.sources.length}</a>
          </div>
          <div>
            {d.chat.sources.map((s,i) => (
              <div key={s.id} className="m-src-row" onClick={() => onNavigate?.("sources", { source: s.id })}>
                <div style={{
                  width:22, height:22, borderRadius:5,
                  background: s.strength === "strong" ? "rgba(4,120,87,.10)" : "rgba(180,83,9,.10)",
                  color: s.strength === "strong" ? "var(--success)" : "var(--warn)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:10, fontWeight:700, fontFamily:"var(--font-mono)", flex:"none"
                }}>{i+1}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div className="m-src-title">{s.title}</div>
                  <div className="m-src-meta">{s.meta.map((m,j)=><span key={j}>{m}</span>)}</div>
                </div>
                <MIcon name="chevron" size={14} color="var(--text-faint)"/>
              </div>
            ))}
          </div>

          {/* Follow-ups */}
          <div className="m-strip-head" style={{marginBottom:0}}>
            <span className="kicker">Follow-up</span>
          </div>
        </div>

        <div className="m-followups">
          {d.chat.followups.map((q,i) => (
            <button key={i} className="m-followup" onClick={() => showFollowUp(q)}>{q}</button>
          ))}
        </div>
      </MBody>

      {/* composer dock sits above the tab bar */}
      <div className="m-composer-dock">
        <MIcon name="plus" size={16} color="var(--text-muted)"/>
        <input placeholder="Ask a follow-up…"/>
        <button className="m-composer-send" aria-label="Send">
          <MIcon name="send" size={16} color="#fff"/>
        </button>
      </div>
    </div>
  );
}

window.MobileChat = MobileChat;
