// Mobile Sources — claim cards with inline expand + filter chips + recent sources list.
function MobileSources({ onNavigate }) {
  const { MIcon, MTop, MBody, MDATA } = window;
  const s = MDATA.sources;

  const [filter, setFilter] = React.useState("all");
  const [expanded, setExpanded] = React.useState("c1");

  const filtered = s.claims.filter(c => {
    if (filter === "all") return true;
    return c.statuses.some(([k,_]) => k === filter);
  });

  return (
    <div className="m-screen">
      <MTop
        title="Sources & claims"
        sub="Evidence graph"
        leading={<button className="m-icon-btn" aria-label="Back" onClick={() => onNavigate?.("home")}><MIcon name="back" size={16}/></button>}
        trailing={<button className="m-icon-btn" aria-label="Filter"><MIcon name="filter" size={16}/></button>}
      />
      <MBody>
        <div className="m-src-body">
          <div className="m-src-head">
            <span className="kicker">Run signal</span>
            <h2>14 sources · 4 claims · medium–high confidence</h2>
          </div>

          <div className="m-src-filters">
            {s.filters.map(f => (
              <button key={f} className="m-src-filter" data-active={filter === f}
                      onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>

          {filtered.map(c => {
            const isOpen = expanded === c.id;
            return (
              <div key={c.id} className="m-claim" onClick={() => setExpanded(isOpen ? null : c.id)}>
                <div className="m-claim-q">{c.q}</div>
                <div className="m-claim-status">
                  {c.statuses.map(([k,label],i) => {
                    const tone = k === "strong" ? "pill-ok"
                              : k === "disputed" ? "pill-warn"
                              : k === "primary" || k === "fresh" ? "pill-accent"
                              : "pill-neutral";
                    return <span key={i} className={"pill " + tone}>{label}</span>;
                  })}
                  <span className="pill pill-mono pill-neutral" style={{marginLeft:"auto"}}>
                    {c.evidence.length} evidence
                  </span>
                </div>
                {isOpen && (
                  <div className="m-claim-ev">
                    {c.evidence.map((e,i) => (
                      <div key={i} className="m-claim-ev-row">
                        <span className={"pill " + (e.strength === "strong" ? "pill-ok" : e.strength === "medium" ? "pill-accent" : "pill-warn")}>
                          {e.strength}
                        </span>
                        <span style={{flex:1, fontWeight:500}}>{e.src}</span>
                        <span style={{fontFamily:"var(--font-mono)", color:"var(--text-muted)", fontSize:10}}>{e.meta}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Full source list */}
          <h3 className="m-h3" style={{marginTop:18}}>
            <MIcon name="sources" size={14} color="var(--text-secondary)"/>
            <span>All sources ({s.recentSources.length})</span>
          </h3>
          <div className="m-full-src">
            {s.recentSources.map((r,i) => (
              <div key={i} className="m-full-src-item">
                <div style={{
                  width:22, height:22, borderRadius:5,
                  background: r.strength === "strong" ? "rgba(4,120,87,.10)" : r.strength === "medium" ? "var(--accent-tint)" : "rgba(180,83,9,.10)",
                  color: r.strength === "strong" ? "var(--success)" : r.strength === "medium" ? "var(--accent-ink)" : "var(--warn)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:10, fontWeight:700, fontFamily:"var(--font-mono)", flex:"none"
                }}>{i+1}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div className="m-src-title">{r.title}</div>
                  <div className="m-src-meta">{r.meta.map((m,j) => <span key={j}>{m}</span>)}</div>
                </div>
                <MIcon name="chevron" size={14} color="var(--text-faint)"/>
              </div>
            ))}
          </div>
        </div>
      </MBody>
    </div>
  );
}

window.MobileSources = MobileSources;
