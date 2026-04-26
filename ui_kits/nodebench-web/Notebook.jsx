// Notebook renderer for the report detail view.
// Shared by all three layout variants. Handles:
// - Block rendering (h2/h3/p/quote/ul/card/claim/inline-trace) with rich spans
//   (entity pills, citations) wired to onEntityClick / onCiteClick callbacks.
// - Slash menu — opens via "/" or the floating "+" handle, keyboard nav, real
//   commands listed in RD_SLASH_COMMANDS.
// - Selection menu — floating bubble with transformation actions (Create
//   entity / Create claim / Attach source / Follow-up / Move / Expand /
//   Compare / Turn into card / Ask about this) per the design spec.

function NBNotebook({ blocks, onEntityClick, onCiteClick, onAction }) {
  const I = window.NBIcon;

  const [slash,   setSlash]   = React.useState(null);   // {x, y, q, idx}
  const [selBox,  setSelBox]  = React.useState(null);   // {x, y, text}
  const [tracesOpen, setTracesOpen] = React.useState(() => {
    const m = {};
    blocks.forEach(b => { if (b.type === 'inline-trace') m[b.id] = !!b.open; });
    return m;
  });

  /* -------- Slash menu invocation -------- */
  function openSlashAt(target) {
    const r = target.getBoundingClientRect();
    const root = target.closest('.nb-rdetail-center, .nb-le-board') || document.body;
    const rootR = root.getBoundingClientRect();
    setSlash({ x: r.left - rootR.left, y: r.bottom - rootR.top + 6, q: '', idx: 0 });
  }

  function handleKey(e) {
    if (e.key === '/' && !slash) {
      // Defer one tick so caret positions update
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const r = sel.getRangeAt(0).getBoundingClientRect();
        const root = e.target.closest('.nb-rdetail-center, .nb-le-board') || document.body;
        const rootR = root.getBoundingClientRect();
        setSlash({ x: r.left - rootR.left, y: r.bottom - rootR.top + 6, q: '', idx: 0 });
      }, 0);
    } else if (slash) {
      const filtered = filterSlash(slash.q);
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlash(s => ({ ...s, idx: Math.min(s.idx + 1, filtered.length - 1) })); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setSlash(s => ({ ...s, idx: Math.max(s.idx - 1, 0) })); }
      else if (e.key === 'Enter')     { e.preventDefault(); pickSlash(filtered[slash.idx]); }
      else if (e.key === 'Escape')    { setSlash(null); }
    }
  }

  function filterSlash(q) {
    const list = window.RD_SLASH_COMMANDS || [];
    if (!q) return list;
    return list.filter(c => c.label.toLowerCase().includes(q.toLowerCase()) || c.kbd.includes(q));
  }

  function pickSlash(cmd) {
    setSlash(null);
    onAction?.({ type: 'slash', command: cmd });
  }

  /* -------- Selection menu -------- */
  function handleMouseUp(e) {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 2) { setSelBox(null); return; }
    const r = sel.getRangeAt(0).getBoundingClientRect();
    if (!r || r.width === 0) { setSelBox(null); return; }
    const root = e.currentTarget;
    const rootR = root.getBoundingClientRect();
    setSelBox({
      x: r.left + r.width / 2 - rootR.left,
      y: r.top - rootR.top - 8,
      text,
    });
  }

  function handleSelAction(act) {
    onAction?.({ type: 'selection', action: act, text: selBox?.text });
    setSelBox(null);
    window.getSelection()?.removeAllRanges();
  }

  return (
    <div
      className="nb-nb-page"
      onKeyDown={handleKey}
      onMouseUp={handleMouseUp}
      style={{ position: 'relative' }}
    >
      {blocks.map(b => (
        <NBBlock
          key={b.id}
          block={b}
          tracesOpen={tracesOpen}
          setTracesOpen={setTracesOpen}
          onEntityClick={onEntityClick}
          onCiteClick={onCiteClick}
          onOpenSlash={(el) => openSlashAt(el)}
        />
      ))}

      {slash && (
        <SlashMenu
          x={slash.x}
          y={slash.y}
          q={slash.q}
          idx={slash.idx}
          onChangeQ={(q) => setSlash(s => ({ ...s, q, idx: 0 }))}
          onPick={pickSlash}
          onClose={() => setSlash(null)}
          filterFn={filterSlash}
        />
      )}

      {selBox && (
        <SelectionMenu
          x={selBox.x}
          y={selBox.y}
          onPick={handleSelAction}
        />
      )}
    </div>
  );
}

/* ────────── Block renderer ────────── */
function NBBlock({ block, tracesOpen, setTracesOpen, onEntityClick, onCiteClick, onOpenSlash }) {
  const I = window.NBIcon;
  const handleRef = React.useRef(null);

  if (block.type === 'eyebrow')  return <div className="nb-nb-eyebrow"><span className="dot"/>{block.text}</div>;
  if (block.type === 'h1')       return <h1 className="nb-nb-h1" contentEditable suppressContentEditableWarning>{block.text}</h1>;
  if (block.type === 'meta')     return <NBMeta/>;
  if (block.type === 'h2')       return <h2 id={block.id} className="nb-nb-h2">{block.text}</h2>;
  if (block.type === 'h3')       return <h3 id={block.id} className="nb-nb-h3">{block.text}</h3>;

  if (block.type === 'p') {
    return (
      <div id={block.id} className="nb-nb-block">
        <button ref={handleRef} className="nb-nb-handle" onClick={(e) => onOpenSlash(e.currentTarget)} aria-label="Add block"/>
        <p className="nb-nb-p"><Spans spans={block.spans} onEntityClick={onEntityClick} onCiteClick={onCiteClick}/></p>
      </div>
    );
  }

  if (block.type === 'quote') {
    return (
      <div id={block.id} className="nb-nb-block">
        <button ref={handleRef} className="nb-nb-handle" onClick={(e) => onOpenSlash(e.currentTarget)}/>
        <blockquote className="nb-nb-quote">
          {block.text}
          <span className="att">— {block.att}</span>
        </blockquote>
      </div>
    );
  }

  if (block.type === 'ul') {
    return (
      <div id={block.id} className="nb-nb-block">
        <button ref={handleRef} className="nb-nb-handle" onClick={(e) => onOpenSlash(e.currentTarget)}/>
        <ul className="nb-nb-ul">
          {block.items.map((item, i) => (
            <li key={i}><Spans spans={item.spans} onEntityClick={onEntityClick} onCiteClick={onCiteClick}/></li>
          ))}
        </ul>
      </div>
    );
  }

  if (block.type === 'card') {
    return (
      <div id={block.id} className="nb-nb-card" onClick={() => onEntityClick?.({ id: block.id, label: block.name, kind: block.kind })}>
        <div className="nb-nb-card-h">
          <span className="kind">{block.kind}</span>
          <span>Embedded card</span>
        </div>
        <div className="nb-nb-card-name">{block.name}</div>
        <div className="nb-nb-card-attrs">
          {block.attrs.map(([k, v]) => (
            <div key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === 'claim') {
    const Mark = block.conf === 'verified' ? I.Check : I.Bell;
    return (
      <div id={block.id} className="nb-nb-claim" data-conf={block.conf}>
        <div className="nb-nb-claim-mark"><Mark width={12} height={12}/></div>
        <div className="nb-nb-claim-body">
          <div className="nb-nb-claim-text">{block.text}</div>
          <div className="nb-nb-claim-foot">
            <span className="conf">{block.conf} · {block.confidence}</span>
            {block.sources.map((s, i) => <span key={i}>· {s}</span>)}
          </div>
        </div>
      </div>
    );
  }

  if (block.type === 'inline-trace') {
    const open = !!tracesOpen[block.id];
    return (
      <div id={block.id} className="nb-inline-trace" data-open={open}>
        <div className="nb-inline-trace-h" onClick={() => setTracesOpen(t => ({ ...t, [block.id]: !open }))}>
          <span className="nb-inline-trace-dot"/>
          <span className="lbl">{block.label}</span>
          <span className="sub">· {block.sub}</span>
          <I.ChevronDown width={14} height={14} className="chev"/>
        </div>
        <div className="nb-inline-trace-body">
          {block.steps.map((s, i) => (
            <div key={i} className="nb-inline-trace-step" data-state={s.state}>
              <div className="marker"><span className="pip"/></div>
              <div className="b">
                <div className="label"><code>{s.kind}</code> {s.label}</div>
                <div className="meta">{s.meta}</div>
                {s.ev && <div className="ev">{s.ev.map((e, j) => <span key={j} className="src">{e}</span>)}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function NBMeta() {
  const r = window.RD_REPORT;
  const I = window.NBIcon;
  return (
    <div className="nb-nb-meta">
      <span className="chip"><I.Check width={11} height={11}/> <strong>{r.status}</strong></span>
      <span className="chip">{r.template}</span>
      <span className="chip">{r.scope}</span>
      <span className="chip">{r.branches} branches · {r.sources} sources</span>
      <span className="chip">{r.saved}</span>
    </div>
  );
}

function Spans({ spans, onEntityClick, onCiteClick }) {
  return (
    <>
      {spans.map((s, i) => {
        if (s.t === 'text') return <React.Fragment key={i}>{s.v}</React.Fragment>;
        if (s.t === 'ent')  return (
          <span key={i} className="ent" data-kind={s.kind} onClick={() => onEntityClick?.(s)}>
            {s.label}
          </span>
        );
        if (s.t === 'cite') return (
          <a key={i} className="cite" onClick={(e) => { e.preventDefault(); onCiteClick?.(s.n); }}>{s.n}</a>
        );
        return null;
      })}
    </>
  );
}

/* ────────── Slash menu ────────── */
function SlashMenu({ x, y, q, idx, onChangeQ, onPick, onClose, filterFn }) {
  const I = window.NBIcon;
  const items = filterFn(q);
  const inputRef = React.useRef(null);

  React.useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="nb-slash" style={{ left: x, top: y }} onMouseDown={(e) => e.stopPropagation()}>
      <div className="nb-slash-h">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => onChangeQ(e.target.value)}
          placeholder="Filter blocks…"
          style={{
            width: '100%', border: 0, outline: 0, background: 'transparent',
            font: 'inherit', fontSize: 11.5, color: 'var(--text-secondary)', padding: 0,
          }}
        />
      </div>
      <div className="nb-slash-list">
        {items.length === 0 && <div style={{ padding: 12, fontSize: 11, color: 'var(--text-faint)' }}>No matches.</div>}
        {items.map((cmd, i) => {
          const Icon = (I[cmd.icon] || I.FileText);
          return (
            <div key={cmd.id} className="nb-slash-item" data-active={i === idx} onClick={() => onPick(cmd)}>
              <div className="ico"><Icon width={13} height={13}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="t">{cmd.label}</div>
                <div className="s">{cmd.hint}</div>
              </div>
              <span className="kbd">{cmd.kbd}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────── Selection menu ────────── */
function SelectionMenu({ x, y, onPick }) {
  const acts = window.RD_SELECTION_ACTIONS || [];
  return (
    <div
      className="nb-selmenu"
      style={{ left: x, top: y, transform: 'translate(-50%, -100%)' }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {acts.map((a, i) => (
        <React.Fragment key={a.id}>
          {(i === 4 || i === 7) && <div className="sep"/>}
          <button onClick={() => onPick(a)}>{a.label}</button>
        </React.Fragment>
      ))}
    </div>
  );
}

window.NBNotebook = NBNotebook;
