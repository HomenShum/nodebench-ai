// Streaming answer packet — the prose is typed out in real time, token by token.
// Behaves like the live NodeBench experience: pills appear first, then headline,
// then each paragraph streams in, then sources & follow-ups settle in at the end.
function AnswerPacket({ query, onFollowup, onSave, density = "comfortable", showReasoning = true, pace, showTrace }) {
  // Pace + showTrace are the canonical tweak names; showReasoning kept as alias.
  const effectiveShowTrace = showTrace !== undefined ? showTrace : showReasoning;
  const paceMult = pace === 'instant' ? 0.18 : pace === 'deliberate' ? 2.4 : 1;
  const { Check, Bookmark, ExternalLink, ArrowUp, Sparkles } = window.NBIcon;

  const sources = [
    { id: 1, title: 'DISCO closes $100M Series C', domain: 'techcrunch.com', date: '2025-11-14' },
    { id: 2, title: 'Legal tech market overview', domain: 'gartner.com',     date: '2025-09-02' },
    { id: 3, title: 'EU AI Act enforcement',      domain: 'euractiv.com',    date: '2025-12-01' },
    { id: 4, title: 'Customer base (ir filing)',  domain: 'sec.gov',         date: '2026-02-08' },
  ];

  // Reasoning trace (appears above answer while still streaming)
  const REASONING = [
    "resolving entity → DISCO (legal tech, Austin TX)",
    "spawning 6 research branches",
    "searching linkup + gemini grounding · 24 sources captured",
    "cross-referencing EU regulatory deltas",
    "verifying against 10 deterministic gates",
    "synthesizing answer packet",
  ];

  // The streamed answer as segments — each is either text or an inline citation.
  // We use this shape so citations pop in naturally at the right spot.
  const ANSWER = [
    { kind: "p", segs: [
      { t: "strong", v: "Yes — worth reaching out. " },
      { t: "t", v: "DISCO closed a $100M Series C led by Greylock in November 2025" },
      { t: "cite", n: 1 },
      { t: "t", v: ", putting its ARR growth trajectory above the 2.5× legal-tech median" },
      { t: "cite", n: 2 },
      { t: "t", v: ". The company serves 2,400+ firms including six of the AmLaw top 10" },
      { t: "cite", n: 4 },
      { t: "t", v: ", and its ediscovery platform is one of the few with a native SOC 2 Type II deployment across all regions." },
    ]},
    { kind: "p", segs: [
      { t: "strong", v: "Watch for: " },
      { t: "t", v: "regulatory exposure in the EU where the AI Act now enforces transparency obligations on legal-grade document classifiers" },
      { t: "cite", n: 3 },
      { t: "t", v: ". This creates a 6-to-9-month integration tax for vendors without pre-existing lineage tracking." },
    ]},
    { kind: "receipts", segs: [
      { t: "t", v: "Revenue multiple 14.2× · Gross margin 78% · NRR 122% · Cash runway 38 months." },
    ]},
  ];

  // Flatten to a character stream for typewriter effect, preserving segment & cite markers.
  const stream = React.useMemo(() => {
    const out = [];
    ANSWER.forEach((block, bi) => {
      block.segs.forEach((seg, si) => {
        if (seg.t === "cite") {
          out.push({ k: "cite", n: seg.n, block: bi, block_kind: block.kind, seg: si });
        } else {
          const text = seg.v;
          for (let i = 0; i < text.length; i++) {
            out.push({ k: "char", c: text[i], emph: seg.t === "strong", block: bi, block_kind: block.kind, seg: si });
          }
        }
      });
      out.push({ k: "blockbreak", block: bi });
    });
    return out;
  }, []);

  // Streaming state
  const [phase, setPhase] = React.useState("reasoning"); // reasoning → answer → done
  const [reasoningIdx, setReasoningIdx] = React.useState(0);
  const [streamIdx, setStreamIdx] = React.useState(0);
  const [sourcesShown, setSourcesShown] = React.useState(false);
  const [followShown, setFollowShown] = React.useState(false);

  // Reset on new query
  React.useEffect(() => {
    setPhase("reasoning"); setReasoningIdx(0); setStreamIdx(0);
    setSourcesShown(false); setFollowShown(false);
  }, [query]);

  // Reasoning ticker
  React.useEffect(() => {
    if (phase !== "reasoning") return;
    if (reasoningIdx >= REASONING.length) { setPhase("answer"); return; }
    const t = setTimeout(() => setReasoningIdx(i => i + 1), 320 * paceMult);
    return () => clearTimeout(t);
  }, [phase, reasoningIdx]);

  // Token stream
  React.useEffect(() => {
    if (phase !== "answer") return;
    if (streamIdx >= stream.length) {
      const t1 = setTimeout(() => setSourcesShown(true), 220);
      const t2 = setTimeout(() => setFollowShown(true), 520);
      const t3 = setTimeout(() => setPhase("done"), 600);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
    // Variable pace: spaces + punctuation faster, letters a bit slower, cites pause briefly.
    const next = stream[streamIdx];
    let delay = 16;
    if (next.k === "cite") delay = 120;
    else if (next.c === " ") delay = 10;
    else if (/[.,;:]/.test(next.c)) delay = 36;
    else if (next.emph) delay = 22;
    const t = setTimeout(() => setStreamIdx(i => i + 1), delay * paceMult);
    return () => clearTimeout(t);
  }, [phase, streamIdx, stream]);

  // Rebuild the visible paragraphs from the stream up to streamIdx.
  const visibleBlocks = React.useMemo(() => {
    const blocks = ANSWER.map(() => []);
    for (let i = 0; i < streamIdx && i < stream.length; i++) {
      const tok = stream[i];
      if (tok.k === "blockbreak") continue;
      const b = blocks[tok.block];
      if (tok.k === "cite") {
        b.push({ t: "cite", n: tok.n, key: i });
      } else {
        // coalesce consecutive chars of the same emphasis into one span
        const last = b[b.length - 1];
        if (last && last.t === "text" && last.emph === tok.emph) {
          last.v += tok.c;
        } else {
          b.push({ t: "text", v: tok.c, emph: tok.emph, key: i });
        }
      }
    }
    return blocks;
  }, [streamIdx, stream]);

  const showCursor = phase !== "done";
  const streaming = phase === "answer";

  const Cite = ({ n }) => (
    <sup className="nb-cite">{n}</sup>
  );

  const Cursor = () => (
    <span className="nb-stream-cursor" aria-hidden="true"/>
  );

  // The last visible block (where the cursor should live)
  const lastVisibleBlockIdx = (() => {
    for (let i = visibleBlocks.length - 1; i >= 0; i--) {
      if (visibleBlocks[i].length > 0) return i;
    }
    return 0;
  })();

  const padScale = density === "compact" ? 0.78 : density === "spacious" ? 1.22 : 1;

  return (
    <div className="nb-reveal-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Query echo */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 999, background: 'linear-gradient(135deg,#D97757,#5E6AD2)', color: '#fff', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>HS</div>
        <div style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.55, fontWeight: 500, flex: 1 }}>{query}</div>
      </div>

      {/* Reasoning trace — collapses once answer begins, unless trace is disabled */}
      {effectiveShowTrace && (
        <div className="nb-panel nb-reasoning" data-phase={phase}
             style={{ padding: `${10 * padScale}px ${14 * padScale}px` }}>
          <div className="nb-kicker" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="nb-dot-spinner"/>
            <span>{phase === "reasoning" ? "Thinking" : phase === "answer" ? "Reasoning trace" : "Reasoning · complete"}</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-faint)' }}>
              {phase === "reasoning" ? `${reasoningIdx}/${REASONING.length}` : `${REASONING.length}/${REASONING.length}`}
            </span>
          </div>
          <ol className="nb-reasoning-list">
            {REASONING.map((r, i) => (
              <li key={i} data-state={i < reasoningIdx ? "done" : i === reasoningIdx && phase === "reasoning" ? "active" : phase !== "reasoning" ? "done" : "pending"}>
                <span className="nb-reasoning-dot" aria-hidden="true"/>
                <span className="nb-reasoning-t">{r}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Answer header */}
      <div className="nb-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="nb-badge nb-badge-accent"><Sparkles width={11} height={11}/>answer · 6 branches</span>
          {phase === "done" ? (
            <span className="nb-badge nb-badge-success"><Check width={11} height={11}/>verified</span>
          ) : (
            <span className="nb-badge nb-badge-warn"><span className="nb-dot-spinner nb-dot-spinner--sm"/>streaming</span>
          )}
          <span className="nb-badge"><span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--text-faint)' }}/>24 sources</span>
          <span className="nb-badge" style={{ fontFamily: 'var(--font-mono)' }}>p95 · {streaming ? "—" : "174s"}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="nb-btn nb-btn-ghost" onClick={onSave} style={{ fontSize: 12 }} disabled={phase !== "done"}>
              <Bookmark width={13} height={13}/>Save report
            </button>
          </div>
        </div>

        {/* Streaming answer body */}
        <div style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-primary)' }}>
          {visibleBlocks.map((block, bi) => {
            if (block.length === 0 && !(streaming && bi === 0 && streamIdx === 0)) return null;
            const isLast = bi === lastVisibleBlockIdx;
            const blockKind = ANSWER[bi].kind;
            const pMargin = bi < ANSWER.length - 1 ? `0 0 ${14 * padScale}px` : "0";
            if (blockKind === "receipts") {
              return (
                <p key={bi} style={{ margin: pMargin, color: 'var(--text-secondary)', fontSize: 13.5 }}>
                  <span className="nb-kicker" style={{ marginRight: 8 }}>Receipts</span>
                  {block.map(seg => seg.t === "text"
                    ? <span key={seg.key} style={seg.emph ? { fontWeight: 700 } : null}>{seg.v}</span>
                    : <Cite key={seg.key} n={seg.n}/>)}
                  {isLast && showCursor && <Cursor/>}
                </p>
              );
            }
            return (
              <p key={bi} style={{ margin: pMargin }}>
                {block.map(seg => seg.t === "text"
                  ? <span key={seg.key} style={seg.emph ? { fontWeight: 700 } : null}>{seg.v}</span>
                  : <Cite key={seg.key} n={seg.n}/>)}
                {isLast && showCursor && <Cursor/>}
              </p>
            );
          })}
        </div>

        {/* Sources — fade in after stream completes */}
        <div className="nb-sources" data-shown={sourcesShown}
             style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="nb-kicker" style={{ marginBottom: 4 }}>Sources</div>
          {sources.map(s => (
            <a key={s.id} href="#" onClick={e => e.preventDefault()}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8, textDecoration: 'none',
                color: 'var(--text-primary)', fontSize: 12.5, transition: 'background 160ms var(--ease-out-expo)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-primary)', fontWeight: 600, width: 16 }}>{s.id}</span>
              <span style={{ flex: 1, fontWeight: 500 }}>{s.title}</span>
              <span style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{s.domain}</span>
              <span style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{s.date}</span>
              <ExternalLink width={12} height={12} style={{ color: 'var(--text-faint)' }}/>
            </a>
          ))}
        </div>
      </div>

      {/* Follow-up */}
      <div className="nb-followup" data-shown={followShown} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['What would a diligence memo ask next?', 'Compare with Everlaw, Relativity, Casetext.', 'Draft a cold intro email.'].map((q, i) => (
          <button key={i} className="nb-btn nb-btn-secondary" onClick={() => onFollowup(q)} style={{ fontSize: 12.5 }}>{q}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="nb-btn nb-btn-primary" style={{ padding: '8px 14px', borderRadius: 12, fontSize: 12.5 }}>
          <ArrowUp width={13} height={13}/>Ask follow-up
        </button>
      </div>
    </div>
  );
}

window.NBAnswerPacket = AnswerPacket;
