// Mobile Notebook — read-only mobile render of the workspace notebook.
// Entity chips inline, citations tappable (routes to Sources), AI proposals
// live in the flow with accept/dismiss. Claim blocks + footnotes.
function MobileNotebook({ onNavigate }) {
  const { MIcon, MTop, MBody, MCite, MChip, MDATA } = window;
  const n = MDATA.notebook;

  // proposal state is local so we can toggle it
  const [proposals, setProposals] = React.useState(() => {
    const out = {};
    n.body.forEach((b, i) => { if (b.t === "proposal") out[i] = b.state; });
    return out;
  });
  const setProp = (i, s) => setProposals(p => ({...p, [i]: s}));

  const openCite = (num) => onNavigate?.("sources");

  const renderInline = (arr) => arr.map((seg, i) => {
    if (typeof seg === "string") return <React.Fragment key={i}>{seg}</React.Fragment>;
    if (seg.t === "chip") return <MChip key={i} name={seg.name} type={seg.type} initials={seg.initials}/>;
    if (seg.t === "mark") return (
      <mark key={i} style={{
        background: "rgba(180,83,9,.14)", color: "var(--warn)",
        padding: "0 3px", borderRadius: 3, fontWeight: 600
      }}>{seg.v}</mark>
    );
    return null;
  });

  // inline cite marker numbers inside body copy — cite-aware string renderer
  const renderPar = (val) => {
    if (typeof val === "string") {
      // accept plain string content (no cites) for simpler paragraphs
      return val;
    }
    const out = [];
    val.forEach((seg, i) => {
      if (typeof seg === "string") {
        // split out [N] cites in plain text
        const re = /\[(\d+)\]/g;
        let last = 0, m;
        while ((m = re.exec(seg)) !== null) {
          if (m.index > last) out.push(<span key={`s-${i}-${last}`}>{seg.slice(last, m.index)}</span>);
          const num = parseInt(m[1], 10);
          out.push(<MCite key={`c-${i}-${m.index}`} n={num} onClick={() => openCite(num)}/>);
          last = m.index + m[0].length;
        }
        if (last < seg.length) out.push(<span key={`e-${i}-${last}`}>{seg.slice(last)}</span>);
      } else if (seg.t === "chip") {
        out.push(<MChip key={`ch-${i}`} name={seg.name} type={seg.type} initials={seg.initials}/>);
      } else if (seg.t === "mark") {
        out.push(<mark key={`mk-${i}`} style={{background:"rgba(180,83,9,.14)", color:"var(--warn)", padding:"0 3px", borderRadius:3, fontWeight:600}}>{seg.v}</mark>);
      }
    });
    return out;
  };

  return (
    <div className="m-screen">
      <MTop
        title="Field notes"
        sub="Autosave · 42m"
        leading={<button className="m-icon-btn" aria-label="Back" onClick={() => onNavigate?.("home")}><MIcon name="back" size={16}/></button>}
        trailing={<>
          <button className="m-icon-btn" aria-label="AI" data-active="true"><MIcon name="sparkle" size={16}/></button>
          <button className="m-icon-btn" aria-label="More"><MIcon name="more" size={16}/></button>
        </>}
      />
      <MBody>
        <div className="m-notebook-body">
          <h1 className="m-notebook-title">{n.title}</h1>
          <div className="m-notebook-meta">
            {n.meta.map((m,i) => <span key={i} className="pill pill-mono pill-neutral">{m}</span>)}
          </div>

          {n.body.map((block, i) => {
            if (block.t === "h2") return <h2 key={i} className="m-notebook-h2">{block.v}</h2>;
            if (block.t === "p")  return <p  key={i} className="m-notebook-p">{renderPar(block.v)}</p>;
            if (block.t === "proposal") {
              const state = proposals[i] || "open";
              return (
                <div key={i} className="m-notebook-proposal" data-state={state}>
                  <span className="kicker">
                    {state === "accepted" ? "✓ Accepted proposal" : "AI proposal · margin"}
                  </span>
                  <div className="m-notebook-proposal-note">{block.note}</div>
                  {state === "open" && (
                    <div className="m-notebook-proposal-actions">
                      <button className="m-notebook-proposal-btn m-notebook-proposal-btn--accept"
                              onClick={() => setProp(i, "accepted")}>Accept</button>
                      <button className="m-notebook-proposal-btn" onClick={() => setProp(i, "dismissed")}>Dismiss</button>
                    </div>
                  )}
                </div>
              );
            }
            if (block.t === "claim") {
              return (
                <div key={i} className="m-claim-block">
                  <div className="m-claim-block-head">
                    <MIcon name="signal" size={12}/>
                    <span className="kicker" style={{color:"var(--accent-ink)"}}>Claim block</span>
                  </div>
                  <div className="m-claim-block-body">{block.v}</div>
                  <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                    <span className="pill pill-ok">Confidence: {block.conf}</span>
                    <span className="pill pill-mono pill-neutral">{block.sourcesN} sources</span>
                    <span className="pill pill-accent" onClick={() => onNavigate?.("sources")}
                          style={{cursor:"pointer"}}>Open evidence →</span>
                  </div>
                </div>
              );
            }
            return null;
          }).filter(Boolean)}

          {/* Footnotes */}
          <div className="m-footnotes">
            <span className="kicker">Footnotes</span>
            {n.footnotes.map(f => (
              <div key={f.n} className="m-footnote" onClick={() => onNavigate?.("sources")}>
                <span className="cite" style={{flex:"none"}}>{f.n}</span>
                <div style={{flex:1, minWidth:0}}>
                  <div className="m-footnote-title">{f.title}</div>
                  <div className="m-footnote-meta">{f.meta}</div>
                </div>
                <MIcon name="chevron" size={12} color="var(--text-faint)"/>
              </div>
            ))}
          </div>
        </div>
      </MBody>
    </div>
  );
}

window.MobileNotebook = MobileNotebook;
