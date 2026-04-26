// ChatThread — top-level chat surface.
// Hosts: left sidebar (thread list), middle thread pane (scrolling turns + sticky header),
// composer pinned at the bottom with pins and quote/reply popover support.

function ChatThread({ pace, showTrace }) {
  const I = window.NBIcon;
  const [threads, setThreads] = React.useState(window.NBThreadSeed);
  const [activeId, setActiveId] = React.useState('disco');
  const [search, setSearch] = React.useState('');
  const [pending, setPending] = React.useState(null); // { stepIdx, steps } while "thinking"
  const [pins, setPins] = React.useState([
    { kind: 'entity', label: 'DISCO' },
  ]);
  const [quotePop, setQuotePop] = React.useState(null); // { x, y, text } | null
  const [composer, setComposer] = React.useState('');
  const scrollRef = React.useRef(null);
  const taRef = React.useRef(null);

  const active = threads[activeId];

  // Pace multiplier from tweaks
  const paceMult = pace === 'instant' ? 0.2 : pace === 'deliberate' ? 2.2 : 1;

  // Auto-scroll to bottom when thread changes or turns land
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeId, active?.turns.length, pending]);

  // Close quote popover on outside click / scroll
  React.useEffect(() => {
    if (!quotePop) return;
    const close = () => setQuotePop(null);
    window.addEventListener('mousedown', close);
    scrollRef.current?.addEventListener('scroll', close);
    return () => {
      window.removeEventListener('mousedown', close);
      scrollRef.current?.removeEventListener('scroll', close);
    };
  }, [quotePop]);

  // Composer autosize
  React.useEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = 'auto';
    taRef.current.style.height = Math.min(taRef.current.scrollHeight, 180) + 'px';
  }, [composer]);

  // ─── Build thread list (filtered + grouped) ───
  const sections = window.NBThreadOrder.map(sec => ({
    group: sec.group,
    items: sec.ids
      .map(id => threads[id])
      .filter(Boolean)
      .filter(t => !search.trim() || t.title.toLowerCase().includes(search.toLowerCase()) || t.entity.toLowerCase().includes(search.toLowerCase())),
  })).filter(sec => sec.items.length > 0);

  // ─── Send a new user turn + fake agent response ───
  function sendTurn(text, overrideId) {
    const id = overrideId || activeId;
    if (!id || !text.trim()) return;
    const userTurn = { id: 'u' + Date.now(), role: 'user', time: nowTime(), text: text.trim() };

    setThreads(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        turns: [...prev[id].turns, userTurn],
        updatedAgo: 'just now',
      },
    }));
    setComposer('');
    setPins([]);
    startAgentResponse(id);
  }

  function startAgentResponse(id) {
    const steps = [
      'parsing your question',
      'resolving entity context',
      'spawning research branches',
      'cross-referencing sources',
      'drafting answer',
    ];
    setPending({ steps, stepIdx: 0 });

    // Advance steps with pace
    let idx = 0;
    const tick = () => {
      idx += 1;
      if (idx < steps.length) {
        setPending({ steps, stepIdx: idx });
        setTimeout(tick, 450 * paceMult);
      } else {
        // Finalize with a generic agent turn
        setTimeout(() => finalizeAgent(id, steps), 400 * paceMult);
      }
    };
    setTimeout(tick, 450 * paceMult);
  }

  function finalizeAgent(id, trace) {
    const agentTurn = {
      id: 'a' + Date.now(),
      role: 'agent',
      time: nowTime(),
      trace,
      body: [
        { kind: 'p', segs: [
          { t: 'strong', v: 'Here is what I found. ' },
          { t: 't', v: 'This is a simulated response for the UI kit — in the live product each follow-up spawns a real research pass against the current thread context.' },
        ]},
        { kind: 'p', segs: [
          { t: 't', v: 'The prior turn in this thread gave you the shape of a complete answer packet; everything here (reasoning trace, source chips, branches, action chips, follow-up chips) carries through to every subsequent turn.' },
        ]},
      ],
      sources: [
        { n: 1, title: 'Thread context', domain: 'nodebench.internal', fav: 'N' },
      ],
      followups: [
        'Go deeper on the EU angle',
        'Save this thread as a report',
      ],
    };
    setThreads(prev => ({
      ...prev,
      [id]: { ...prev[id], turns: [...prev[id].turns, agentTurn] },
    }));
    setPending(null);
  }

  // ─── User edits a prior message → truncate + re-run ───
  function handleUserEdit(turnId, newText) {
    const thread = threads[activeId];
    const idx = thread.turns.findIndex(t => t.id === turnId);
    if (idx < 0) return;
    // Truncate everything after the edited turn, update it
    const newTurns = thread.turns.slice(0, idx);
    newTurns.push({ ...thread.turns[idx], text: newText, time: nowTime() + ' (edited)' });
    setThreads(prev => ({ ...prev, [activeId]: { ...prev[activeId], turns: newTurns } }));
    startAgentResponse(activeId);
  }

  // ─── New thread ───
  function newThread() {
    const id = 'new-' + Date.now();
    const t = {
      id, title: 'New conversation', entity: '—', updatedAgo: 'now', starred: false, turns: [],
    };
    setThreads(prev => ({ ...prev, [id]: t }));
    window.NBThreadOrder[0].ids.unshift(id);
    setActiveId(id);
    setTimeout(() => taRef.current?.focus(), 50);
  }

  // ─── Quote/reply ───
  function handleQuote(e) {
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    if (!text || text.length < 3) { setQuotePop(null); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setQuotePop({
      x: rect.left + rect.width / 2,
      y: rect.top,
      text,
    });
  }

  function quoteToComposer() {
    const t = quotePop?.text;
    if (!t) return;
    const quoted = '> ' + t.replace(/\n/g, '\n> ') + '\n\n';
    setComposer(prev => quoted + prev);
    setQuotePop(null);
    window.getSelection()?.removeAllRanges();
    setTimeout(() => taRef.current?.focus(), 20);
  }

  function quoteAsFollowup() {
    const t = quotePop?.text;
    if (!t) return;
    sendTurn('About "' + t + '" — can you explain more?');
    setQuotePop(null);
    window.getSelection()?.removeAllRanges();
  }

  // ─── Pins ───
  function addPin(kind, label) { setPins(prev => [...prev, { kind, label }]); }
  function removePin(i) { setPins(prev => prev.filter((_, idx) => idx !== i)); }

  // ─── Render ───
  return (
    <div className="nb-chat-root">
      {/* Sidebar */}
      <aside className="nb-chat-sidebar">
        <div className="nb-chat-sidebar-head">
          <button className="nb-chat-new" onClick={newThread}>
            <I.Plus width={13} height={13}/> New chat
          </button>
        </div>
        <div className="nb-chat-search">
          <I.Search width={12} height={12}/>
          <input placeholder="Search threads…" value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>
        <div className="nb-chat-threads">
          {sections.map(sec => (
            <div key={sec.group}>
              <div className="nb-chat-threads-group">{sec.group}</div>
              {sec.items.map(t => (
                <button key={t.id} className="nb-chat-thread-item"
                        data-active={activeId === t.id}
                        onClick={() => setActiveId(t.id)}>
                  <div className="nb-chat-thread-title">
                    {t.starred && <span className="dot"/>}
                    <span>{t.title}</span>
                  </div>
                  <div className="nb-chat-thread-snippet">{lastSnippet(t)}</div>
                  <div className="nb-chat-thread-time">{t.updatedAgo}</div>
                </button>
              ))}
            </div>
          ))}
          {sections.length === 0 && (
            <div style={{ padding: '18px 10px', color: 'var(--text-faint)', fontSize: 12, textAlign: 'center' }}>
              No threads match "{search}"
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="nb-chat-main">
        {/* Header */}
        <div className="nb-chat-header">
          <div className="nb-chat-header-icon">{active?.entity?.[0] || '·'}</div>
          <h2>{active?.title || 'New conversation'}</h2>
          <span className="nb-chat-header-meta">
            {active?.turns.length || 0} turns · {active?.entity}
          </span>
          <div className="nb-chat-header-actions">
            <button onClick={() => addPin('report', active?.title || 'Thread')}>
              <I.Bookmark width={11} height={11}/> Save
            </button>
            <button>
              <I.ExternalLink width={11} height={11}/> Share
            </button>
          </div>
        </div>

        {/* Scroll area */}
        <div className="nb-chat-scroll" ref={scrollRef}>
          <div className="nb-chat-scroll-inner">
            {active?.turns.length === 0 && !pending && (
              <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⌘</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>Ask anything to kick off the thread</div>
                <div style={{ fontSize: 12.5, marginTop: 4 }}>Pin an entity or a past report below to anchor the context.</div>
              </div>
            )}
            {active?.turns.map(turn => (
              turn.role === 'user'
                ? <window.NBUserTurn key={turn.id} turn={turn}
                                     onEdit={handleUserEdit}
                                     onCopy={(t) => navigator.clipboard?.writeText(t)}
                                     onQuote={handleQuote}/>
                : <window.NBAgentTurn key={turn.id} turn={turn}
                                      onFollowup={sendTurn}
                                      onQuote={handleQuote}
                                      onAction={(a) => { if (a === 'rerun') startAgentResponse(activeId); }}/>
            ))}
            {pending && <window.NBThinkingTurn steps={pending.steps} stepIdx={pending.stepIdx}/>}
          </div>
        </div>

        {/* Composer */}
        <div className="nb-chat-composer">
          <div className="nb-chat-composer-inner">
            {pins.length > 0 && (
              <div className="nb-pins">
                {pins.map((p, i) => (
                  <span key={i} className="nb-pin">
                    <span className="typ">{p.kind}</span>
                    {p.label}
                    <button onClick={() => removePin(i)} aria-label="Remove">
                      <I.X width={10} height={10}/>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="nb-chat-field">
              <div className="nb-chat-attach">
                <button title="Attach file" aria-label="Attach file"><I.FileText width={15} height={15}/></button>
                <button title="Add URL"     aria-label="Add URL"><I.Link width={15} height={15}/></button>
                <button title="Pin entity"  aria-label="Pin entity" onClick={() => addPin('entity', active?.entity || 'DISCO')}>
                  <I.Pin width={15} height={15}/>
                </button>
              </div>
              <textarea ref={taRef}
                        placeholder="Ask a follow-up…"
                        value={composer}
                        onChange={(e) => setComposer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTurn(composer); }
                        }}/>
              <button className="nb-chat-send" onClick={() => sendTurn(composer)} disabled={!composer.trim() || !!pending} aria-label="Send">
                <I.ArrowUp width={14} height={14}/>
              </button>
            </div>
            <div className="nb-chat-hint">
              <span><kbd>Enter</kbd> send · <kbd>Shift</kbd>+<kbd>Enter</kbd> newline</span>
              <span>Context: {active?.entity} · {active?.turns.length || 0} turns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quote popover */}
      {quotePop && (
        <div className="nb-quote-pop" style={{ left: quotePop.x, top: quotePop.y }}
             onMouseDown={(e) => e.stopPropagation()}>
          <button onClick={quoteToComposer}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
            Quote
          </button>
          <button onClick={quoteAsFollowup}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Ask about this
          </button>
        </div>
      )}
    </div>
  );
}

// Helpers
function nowTime() {
  const d = new Date();
  const h = d.getHours(), m = d.getMinutes();
  const hr = ((h + 11) % 12) + 1;
  const mm = m < 10 ? '0' + m : m;
  const ap = h < 12 ? 'AM' : 'PM';
  return hr + ':' + mm + ' ' + ap;
}

function lastSnippet(thread) {
  if (!thread.turns || thread.turns.length === 0) return 'Empty — start typing';
  const last = thread.turns[thread.turns.length - 1];
  if (last.role === 'user') return 'You: ' + last.text;
  if (last.body && last.body[0] && last.body[0].segs) {
    const flat = last.body[0].segs.map(s => s.v || '').join('');
    return flat.slice(0, 100);
  }
  return '—';
}

window.NBChatThread = ChatThread;
