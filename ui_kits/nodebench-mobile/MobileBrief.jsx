// Mobile Brief — structured executive brief. Scrollable.
// When rendered inside the "Reports" tab, it shows a sub-tab strip that routes to
// Sources and Notebook (two other report-adjacent surfaces).
function MobileBrief({ onNavigate, sub, onSubChange }) {
  const { MIcon, MTop, MBody, MCite, MDATA } = window;
  const b = MDATA.brief;
  const showSubTabs = typeof onSubChange === "function";
  const currentSub = sub || "brief";

  return (
    <div className="m-screen">
      <MTop
        title="Reports"
        sub={"Disco Corp. · v4"}
        leading={<button className="m-icon-btn" aria-label="Back" onClick={() => onNavigate?.("home")}><MIcon name="back" size={16}/></button>}
        trailing={<>
          <button className="m-icon-btn" aria-label="Save"><MIcon name="save" size={16}/></button>
          <button className="m-icon-btn" aria-label="Share"><MIcon name="share" size={16}/></button>
        </>}
      />
      {showSubTabs && (
        <div className="m-sub-tabs">
          {[
            { id: "brief",    label: "Brief" },
            { id: "sources",  label: "Sources" },
            { id: "notebook", label: "Notebook" },
          ].map(t => (
            <button key={t.id}
                    className="m-sub-tab"
                    data-active={currentSub === t.id}
                    onClick={() => onSubChange(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      <MBody>
        <div className="m-brief-body">
          <div className="m-brief-kicker">
            <span className="kicker" style={{color:"var(--accent-ink)"}}>Brief</span>
            <span className="pill pill-mono pill-neutral">draft v4</span>
          </div>
          <h1 className="m-brief-title">{b.title}</h1>
          <p className="m-brief-sub">{b.sub}</p>
          <div className="m-brief-meta">
            {b.meta.map((m,i) => <span key={i} className="pill pill-mono pill-neutral">{m}</span>)}
          </div>

          {/* Verdict */}
          <div className="m-verdict">
            <span className="kicker" style={{color:"var(--accent-ink)"}}>Verdict</span>
            <h2>Base case holds, Q2 is the tell.</h2>
            <p>{b.verdict} <MCite n={1} onClick={() => onNavigate?.("sources")}/></p>
          </div>

          {/* Stats */}
          <div className="m-stats">
            {b.stats.map((s,i) => (
              <div key={i} className="m-stat">
                <div className="m-stat-v" data-trend={s.trend}>{s.v}</div>
                <div className="m-stat-l">{s.l}</div>
              </div>
            ))}
          </div>

          {/* What / So what / Now what */}
          <h3 className="m-h3">
            <MIcon name="brief" size={14} color="var(--accent-ink)"/>
            <span>Structured take</span>
          </h3>
          <div className="m-triad">
            {b.triad.map((t,i) => (
              <div key={i} className="m-triad-card" data-color={t.color}>
                <span className="kicker" style={{color: t.color === "indigo" ? "var(--indigo)" : t.color === "ok" ? "var(--success)" : "var(--accent-ink)"}}>{t.tag}</span>
                <h3>{t.h}</h3>
                <p>{t.p}</p>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <h3 className="m-h3">
            <MIcon name="clock" size={14} color="var(--text-secondary)"/>
            <span>Next 60 days</span>
          </h3>
          <div className="m-timeline">
            {b.timeline.map((r,i) => (
              <div key={i} className="m-timeline-row">
                <div className="m-timeline-date">{r.d}</div>
                <div>
                  <div className="m-timeline-t">{r.t}</div>
                  <div className="m-timeline-m">{r.m}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Drill to other surfaces */}
          <h3 className="m-h3">
            <MIcon name="signal" size={14} color="var(--text-secondary)"/>
            <span>Go deeper</span>
          </h3>
          <div style={{display:"flex", flexDirection:"column", gap:6}}>
            <div className="m-thread" onClick={() => onNavigate?.("sources")}>
              <div className="m-thread-icon"><MIcon name="sources" size={14}/></div>
              <div style={{flex:1}}>
                <div className="m-thread-title">Inspect sources & claim graph</div>
                <div className="m-thread-meta">14 sources · 4 claims</div>
              </div>
              <MIcon name="chevron" size={14} color="var(--text-faint)"/>
            </div>
            <div className="m-thread" onClick={() => onNavigate?.("notebook")}>
              <div className="m-thread-icon"><MIcon name="notebook" size={14}/></div>
              <div style={{flex:1}}>
                <div className="m-thread-title">Open April field notes</div>
                <div className="m-thread-meta">Personal · 2 proposals pending</div>
              </div>
              <MIcon name="chevron" size={14} color="var(--text-faint)"/>
            </div>
            <div className="m-thread" onClick={() => onNavigate?.("chat")}>
              <div className="m-thread-icon"><MIcon name="chat" size={14}/></div>
              <div style={{flex:1}}>
                <div className="m-thread-title">Ask a follow-up</div>
                <div className="m-thread-meta">Resume chat thread</div>
              </div>
              <MIcon name="chevron" size={14} color="var(--text-faint)"/>
            </div>
          </div>
        </div>
      </MBody>
    </div>
  );
}

window.MobileBrief = MobileBrief;
