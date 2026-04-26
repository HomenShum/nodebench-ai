// ChatTurn — renders a single user or agent turn.
// Agent turns include: optional reasoning trace (collapsible), rich prose with inline citations,
// optional receipts line, sources strip, branches, action chips, follow-up chips.
// User turns support inline edit → re-run.
// Hovering any text triggers a quote/reply popover.

// Render a segment: text, strong, or inline citation
function renderSegs(segs, onCiteClick) {
  if (!segs) return null;
  return segs.map((s, i) => {
    if (s.t === 'strong') return <strong key={i}>{s.v}</strong>;
    if (s.t === 'cite')   return <sup key={i} className="nb-cite" onClick={(e) => { e.stopPropagation(); onCiteClick?.(s.n); }} title={`Source ${s.n}`}>{s.n}</sup>;
    return <React.Fragment key={i}>{s.v}</React.Fragment>;
  });
}

// ─── UserTurn (editable) ────────────────────────────────────────────────
function UserTurn({ turn, onEdit, onCopy, onQuote }) {
  const I = window.NBIcon;
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft]     = React.useState(turn.text);
  const taRef = React.useRef(null);

  React.useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      taRef.current.setSelectionRange(taRef.current.value.length, taRef.current.value.length);
      autosize(taRef.current);
    }
  }, [editing]);

  function autosize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 240) + 'px';
  }

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setEditing(false);
    onEdit?.(turn.id, trimmed);
  }
  function cancel() { setDraft(turn.text); setEditing(false); }

  return (
    <div className="nb-turn" data-role="user">
      <div className="nb-turn-avatar" data-role="user">HS</div>
      <div className="nb-turn-body">
        <div className="nb-turn-head">
          <span className="nb-turn-who">You</span>
          <span className="nb-turn-time">{turn.time}</span>
          <div className="nb-turn-actions">
            {!editing && (
              <>
                <button title="Edit & re-run" onClick={() => setEditing(true)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                </button>
                <button title="Copy" onClick={() => onCopy?.(turn.text)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
              </>
            )}
          </div>
        </div>
        {editing ? (
          <div>
            <textarea ref={taRef} className="nb-turn-edit" value={draft}
                      onChange={(e) => { setDraft(e.target.value); autosize(e.target); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
                        if (e.key === 'Escape') cancel();
                      }}/>
            <div className="nb-turn-edit-actions">
              <button className="primary" onClick={commit}>Re-run from here</button>
              <button onClick={cancel}>Cancel</button>
              <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 10.5, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                ⌘+Enter to save · Esc to cancel
              </span>
            </div>
          </div>
        ) : (
          <div className="nb-turn-text" onMouseUp={(e) => onQuote?.(e)}>{turn.text}</div>
        )}
      </div>
    </div>
  );
}

// ─── ReasoningTrace (collapsible) ───────────────────────────────────────
function ReasoningTrace({ steps, defaultOpen, live }) {
  const I = window.NBIcon;
  const [open, setOpen] = React.useState(defaultOpen ?? !!live);
  const count = steps.length;
  return (
    <div className="nb-trace">
      <button className="nb-trace-head" data-open={open} onClick={() => setOpen(o => !o)}>
        <svg className="caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        {live
          ? <span>Reasoning<span className="nb-dot-spinner nb-dot-spinner--sm" style={{ marginLeft: 4 }}/></span>
          : <span>Reasoned in {count} steps</span>}
      </button>
      {open && (
        <ul className="nb-trace-body">
          {steps.map((s, i) => {
            const active = live && i === steps.length - 1;
            return (
              <li key={i} data-active={active}>
                <span className="d"/>
                <span>{s}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── SourcesStrip ───────────────────────────────────────────────────────
function SourcesStrip({ sources, onCite }) {
  const visible = sources.slice(0, 5);
  const more = sources.length - visible.length;
  return (
    <div className="nb-turn-sources">
      <span className="ttl">Sources</span>
      {visible.map(s => (
        <button key={s.n} className="nb-src-chip" onClick={() => onCite?.(s.n)} title={s.title}>
          <span className="fav">{s.fav}</span>
          <span className="n">{s.n}</span>
          <span className="dom">{s.domain}</span>
        </button>
      ))}
      {more > 0 && <button className="nb-src-chip-more">+{more} more</button>}
    </div>
  );
}

// ─── Branches ───────────────────────────────────────────────────────────
function Branches({ branches, onSwitch }) {
  const I = window.NBIcon;
  return (
    <div className="nb-turn-branches">
      <div className="nb-turn-branches-head">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 3v12M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM18 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 0v6a3 3 0 0 1-3 3h-3"/></svg>
        {branches.length} branches explored
      </div>
      {branches.map(b => (
        <button key={b.id} className="nb-branch" data-active={b.active} onClick={() => onSwitch?.(b.id)}>
          <span className="lbl">{b.label}</span>
          <span className="n">{b.sources} sources</span>
        </button>
      ))}
    </div>
  );
}

// ─── ActionChips ───────────────────────────────────────────────────────
function ActionChips({ turn, onAction }) {
  const I = window.NBIcon;
  return (
    <div className="nb-turn-chips">
      <button className="nb-action-chip primary" onClick={() => onAction?.('save')}>
        <I.Bookmark width={11} height={11}/> Save as report
      </button>
      <button className="nb-action-chip" onClick={() => onAction?.('watch')}>
        <I.Eye width={11} height={11}/> Watch entity
      </button>
      <button className="nb-action-chip" onClick={() => onAction?.('rerun')}>
        <I.Repeat width={11} height={11}/> Re-run
      </button>
      <button className="nb-action-chip" onClick={() => onAction?.('share')}>
        <I.ExternalLink width={11} height={11}/> Share
      </button>
    </div>
  );
}

// ─── AgentTurn ──────────────────────────────────────────────────────────
function AgentTurn({ turn, live, onFollowup, onQuote, onAction }) {
  const I = window.NBIcon;
  return (
    <div className="nb-turn" data-role="agent">
      <div className="nb-turn-avatar" data-role="agent">
        <I.Sparkles/>
      </div>
      <div className="nb-turn-body">
        <div className="nb-turn-head">
          <span className="nb-turn-who">NodeBench</span>
          <span className="nb-turn-time">{turn.time}</span>
        </div>

        {turn.trace && turn.trace.length > 0 && (
          <ReasoningTrace steps={turn.trace} defaultOpen={!!live} live={live}/>
        )}

        {/* Prose */}
        {turn.body && (
          <div className="nb-turn-text" onMouseUp={(e) => onQuote?.(e)}>
            {turn.body.map((b, i) => {
              if (b.kind === 'receipts') {
                return <div key={i} className="nb-turn-receipts">{b.v}</div>;
              }
              return <p key={i}>
                {renderSegs(b.segs)}
                {live && i === turn.body.length - 1 && <span className="nb-stream-cursor"/>}
              </p>;
            })}
          </div>
        )}

        {!live && turn.sources && turn.sources.length > 0 && (
          <SourcesStrip sources={turn.sources}/>
        )}

        {!live && turn.branches && turn.branches.length > 0 && (
          <Branches branches={turn.branches}/>
        )}

        {!live && <ActionChips turn={turn} onAction={onAction}/>}

        {!live && turn.followups && turn.followups.length > 0 && (
          <div className="nb-followups">
            {turn.followups.map((f, i) => (
              <button key={i} className="nb-followup-chip" onClick={() => onFollowup?.(f)}>
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ThinkingTurn ─── shown while agent is computing
function ThinkingTurn({ steps, stepIdx }) {
  const I = window.NBIcon;
  return (
    <div className="nb-turn" data-role="agent">
      <div className="nb-turn-avatar" data-role="agent"><I.Sparkles/></div>
      <div className="nb-turn-body">
        <div className="nb-turn-head">
          <span className="nb-turn-who">NodeBench</span>
          <span className="nb-turn-time">now</span>
        </div>
        <div className="nb-thinking">
          <span className="nb-thinking-dots"><span/><span/><span/></span>
          {steps && stepIdx >= 0 && stepIdx < steps.length ? steps[stepIdx] : 'Thinking…'}
        </div>
      </div>
    </div>
  );
}

window.NBUserTurn      = UserTurn;
window.NBAgentTurn     = AgentTurn;
window.NBThinkingTurn  = ThinkingTurn;
