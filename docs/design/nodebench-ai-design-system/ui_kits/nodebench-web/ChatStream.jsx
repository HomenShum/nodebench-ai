// ChatStream — continuous research conversation surface.
// Three-zone layout: thread sidebar (left) · scrolling stream (center) · right rail · composer pinned at bottom.
// Each turn is a research run with: ResearchRunBar · trace · structured prose with entity pills · embedded entity card · sources · run-update chips · follow-ups.
// Composer supports pins, mic, attach. Right rail has Entity / Graph / Sources / Threads / Report tabs.

function ChatStream({ pace, showTrace, onOpenReport, width = 'wide', onSetWidth }) {
  const I = window.NBIcon;
  const seedThread = window.NBStreamThread;
  const otherThreads = window.NBStreamOthers;

  const [threads, setThreads] = React.useState({ [seedThread.id]: seedThread, ...otherThreads });
  const [activeId, setActiveId] = React.useState(seedThread.id);
  const [search, setSearch] = React.useState('');
  const [composer, setComposer] = React.useState('');
  const [pending, setPending] = React.useState(null);
  const [pins, setPins] = React.useState([
    { kind: 'event', label: 'Ship Demo Day' },
  ]);
  const [rootEntity, setRootEntity] = React.useState(seedThread.rootEntity);
  const [peekId, setPeekId] = React.useState(null);
  const [leftRail, setLeftRail] = React.useState('focus');   // focus | peek | expanded
  const [rightRail, setRightRail] = React.useState('focus'); // focus | docked | expanded
  const [model, setModel] = React.useState({ provider: 'Anthropic', name: 'Claude Sonnet 4.5' });
  const [modelOpen, setModelOpen] = React.useState(false);

  const scrollRef = React.useRef(null);
  const taRef = React.useRef(null);
  const active = threads[activeId];
  const paceMult = pace === 'instant' ? 0.2 : pace === 'deliberate' ? 2.2 : 1;

  // Auto-scroll
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeId, active?.turns?.length, pending]);

  // Composer autosize
  React.useEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = 'auto';
    taRef.current.style.height = Math.min(taRef.current.scrollHeight, 180) + 'px';
  }, [composer]);

  // Aggregate sources across the whole thread (for right rail Sources tab)
  const allSources = React.useMemo(() => {
    if (!active || !active.turns) return [];
    const out = [];
    const seen = new Set();
    active.turns.forEach(t => {
      if (t.sources) t.sources.forEach(s => {
        if (!seen.has(s.n)) { seen.add(s.n); out.push(s); }
      });
    });
    return out.sort((a, b) => a.n - b.n);
  }, [active]);

  const priorThreads = React.useMemo(() => {
    return Object.values(threads).filter(t => t.id !== activeId).slice(0, 4);
  }, [threads, activeId]);

  // ─── Thread groupings ──
  const threadList = [
    { group: 'Today',     ids: [seedThread.id, 'disco'] },
    { group: 'This week', ids: ['mercor', 'cognition'] },
    { group: 'Earlier',   ids: ['turing', 'foundation'] },
  ];
  const sections = threadList.map(sec => ({
    group: sec.group,
    items: sec.ids.map(id => threads[id]).filter(Boolean)
                  .filter(t => !search.trim() || t.title.toLowerCase().includes(search.toLowerCase())),
  })).filter(sec => sec.items.length > 0);

  // ─── Send a turn (simulated agent response) ──
  function sendTurn(text) {
    if (!text.trim()) return;
    const userTurn = { id: 'u' + Date.now(), role: 'user', time: nowTime(), text: text.trim() };
    setThreads(prev => ({
      ...prev,
      [activeId]: { ...prev[activeId], turns: [...prev[activeId].turns, userTurn], updatedAgo: 'just now' },
    }));
    setComposer('');
    startAgentResponse();
  }

  function startAgentResponse() {
    const steps = [
      { step: 'mem',     label: 'searching memory · 0.18s' },
      { step: 'cache',   label: 'checking source cache' },
      { step: 'extract', label: 'expanding graph ring' },
      { step: 'compose', label: 'drafting answer' },
    ];
    setPending({ steps, idx: 0 });
    let i = 0;
    const tick = () => {
      i += 1;
      if (i < steps.length) { setPending({ steps, idx: i }); setTimeout(tick, 480 * paceMult); }
      else setTimeout(finalize, 480 * paceMult);
    };
    setTimeout(tick, 460 * paceMult);
  }

  function finalize() {
    const agentTurn = {
      id: 'a' + Date.now(), role: 'agent', time: nowTime(),
      run: { kind: 'lookup', summary: 'Used current report context', detail: '0 paid calls · using thread memory' },
      trace: [
        { step: 'mem',     label: 'memory hit · prior turn',   hits: 'Orbital Labs context' },
        { step: 'compose', label: 'synthesized answer',         hits: '1 section' },
      ],
      body: [
        { kind: 'p', segs: [
          { t: 'strong', v: 'Continuing in this thread. ' },
          { t: 't', v: 'This is a simulated follow-up — in the live product every turn keeps the entity context, graph ring, and report so you can keep going without restarting.' },
        ]},
      ],
      followups: ['Compare with Braintrust', 'Show the graph', 'Save this thread'],
    };
    setThreads(prev => ({ ...prev, [activeId]: { ...prev[activeId], turns: [...prev[activeId].turns, agentTurn] } }));
    setPending(null);
  }

  // ─── Pin / promote / peek ──
  function addPin(kind, label) { setPins(prev => [...prev, { kind, label }]); }
  function removePin(i) { setPins(prev => prev.filter((_, idx) => idx !== i)); }
  function promoteToRoot(id) { setRootEntity(id); setPeekId(null); }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>Chat</h1>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          {Object.keys(threads).length} threads. Every turn keeps the entity context, sources, and report — so you can keep going without restarting.
        </div>
      </div>
    <div className="nb-stream-root"
         data-left={leftRail === 'focus' ? undefined : leftRail}
         data-right={rightRail === 'focus' ? undefined : rightRail}>
      {/* Scrim — closes any open OVERLAY rail (peek/expanded). Docked is in-grid, no scrim. */}
      {(leftRail === 'peek' || leftRail === 'expanded' || rightRail === 'peek' || rightRail === 'expanded') && (
        <div className="nb-stream-scrim" onClick={() => {
          setLeftRail('focus');
          setRightRail(rightRail === 'docked' ? 'docked' : 'focus');
        }}/>
      )}
      {/* ─── Sidebar ── */}
      <aside className="nb-chat-sidebar">
        <div className="nb-chat-sidebar-head">
          <button className="nb-chat-new"><I.Plus width={13} height={13}/> New chat</button>
        </div>
        <div className="nb-chat-search">
          <I.Search width={12} height={12}/>
          <input placeholder="Search threads…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="nb-chat-threads">
          {sections.map(sec => (
            <div key={sec.group}>
              <div className="nb-chat-threads-group">{sec.group}</div>
              {sec.items.map(t => (
                <button key={t.id} className="nb-chat-thread-item" data-active={activeId === t.id}
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
        </div>
      </aside>

      {/* ─── Main column ── */}
      <div className="nb-stream-main">
        {/* Header */}
        <div className="nb-stream-header">
          <button className="nb-rail-toggle"
                  onClick={() => setLeftRail(leftRail === 'focus' ? 'peek' : 'focus')}
                  aria-label="Toggle threads"
                  data-active={leftRail !== 'focus'}
                  title="Threads">
            <I.PanelLeft width={14} height={14}/>
          </button>
          <div className="nb-chat-header-icon">{(active?.title?.[0]) || '·'}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{active?.title}</h2>
            <div className="nb-stream-header-meta">
              <span className="nb-stream-fresh" data-state={active?.freshness || 'fresh'}>● fresh</span>
              <span>·</span>
              <span>{active?.turns?.length || 0} turns</span>
              <span>·</span>
              <span>{active?.telemetry?.sourcesUsed || allSources.length} sources</span>
              <span>·</span>
              <span>{active?.telemetry?.entitiesResolved || 0} entities</span>
              <span>·</span>
              <span>{active?.telemetry?.paidCalls || 0} paid calls</span>
            </div>
          </div>
          <div className="nb-chat-header-actions" style={{ display: 'flex' }}>
            <button onClick={onOpenReport}>
              <I.Bookmark width={11} height={11}/> Open report
            </button>
            <button>
              <I.ExternalLink width={11} height={11}/> Share
            </button>
          </div>
          <button className="nb-rail-toggle"
                  onClick={() => setRightRail(rightRail === 'docked' ? 'focus' : 'docked')}
                  aria-label="Toggle context"
                  data-active={rightRail !== 'focus'}
                  title="Context">
            <I.PanelRight width={14} height={14}/>
          </button>
        </div>

        {/* Save bar — sticky just under header */}
        <div className="nb-stream-savebar">
          <span className="nb-stream-savebar-icon">●</span>
          <span>Saved to <strong>{active?.report?.name || 'New report'}</strong></span>
          <span className="dim">· {active?.report?.sectionsAdded || 0} sections · {active?.report?.claimsAdded || 0} claims · {active?.report?.followupsCreated || 0} follow-ups</span>
          <span style={{ flex: 1 }}/>
          <button onClick={onOpenReport}>Open notebook</button>
          <button>Export</button>
          <button>Track updates</button>
        </div>

        {/* Stream */}
        <div className="nb-stream-scroll" ref={scrollRef}>
          <div className="nb-stream-inner">
            {(active?.turns || []).map(turn => (
              turn.role === 'user'
                ? <UserBubble key={turn.id} turn={turn}/>
                : <AgentTurn  key={turn.id} turn={turn} onPeek={(id) => setPeekId(id)} onFollowup={sendTurn} onPromote={promoteToRoot} showTrace={showTrace}/>
            ))}
            {pending && <ThinkingPane steps={pending.steps} idx={pending.idx}/>}
          </div>
        </div>

        {/* Composer */}
        <div className="nb-stream-composer">
          <div className="nb-stream-composer-inner">
            <div className="nb-composer-card">
              {pins.length > 0 && (
                <div className="nb-composer-pins">
                  {pins.map((p, i) => (
                    <span key={i} className="nb-pin">
                      <span className="typ">{p.kind}</span>
                      {p.label}
                      <button onClick={() => removePin(i)} aria-label="Remove pin"><I.X width={9} height={9}/></button>
                    </span>
                  ))}
                  <button className="nb-pin-add" onClick={() => addPin('entity', 'Orbital Labs')}>
                    <I.Plus width={9} height={9}/> Add context
                  </button>
                </div>
              )}
              <textarea ref={taRef}
                        className="nb-composer-input"
                        placeholder="Ask, capture, paste, upload, or record…"
                        value={composer}
                        onChange={(e) => setComposer(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTurn(composer); } }}/>
              <div className="nb-composer-footer">
                <div className="nb-composer-tools">
                  <button title="Attach file" aria-label="Attach file"><I.FileText width={14} height={14}/></button>
                  <button title="Add URL" aria-label="Add URL"><I.Link width={14} height={14}/></button>
                  <button title="Voice note" aria-label="Voice note"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3"/></svg></button>
                  <span className="nb-composer-divider"/>
                  <ModelPicker model={model} setModel={setModel} open={modelOpen} setOpen={setModelOpen}/>
                </div>
                <div className="nb-composer-send-group">
                  <span className="nb-composer-meta">Memory-first · 0 paid calls</span>
                  <button className="nb-composer-send" onClick={() => sendTurn(composer)}
                          disabled={!composer.trim() || !!pending} aria-label="Send">
                    <I.ArrowUp width={14} height={14}/>
                  </button>
                </div>
              </div>
            </div>
            <div className="nb-composer-suggest">
              {window.NBStreamPrompts.slice(0, 3).map(p => (
                <button key={p} className="nb-prompt-chip" onClick={() => setComposer(p + ' ')}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right rail ── */}
      <window.NBChatRightRail
        rootEntityId={peekId || rootEntity}
        onPromote={promoteToRoot}
        onPeek={(id) => setPeekId(id)}
        allSources={allSources}
        priorThreads={priorThreads}
        report={active?.report}
        onOpenReport={onOpenReport}
      />
    </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// User bubble
// ───────────────────────────────────────────────────────────────────────
function UserBubble({ turn }) {
  return (
    <div className="nb-turn" data-role="user">
      <div className="nb-turn-avatar" data-role="user">HS</div>
      <div className="nb-turn-body">
        <div className="nb-turn-head">
          <span className="nb-turn-who">You</span>
          <span className="nb-turn-time">{turn.time}</span>
        </div>
        <div className="nb-turn-text">{turn.text}</div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Agent turn (rich)
// ───────────────────────────────────────────────────────────────────────
function AgentTurn({ turn, onPeek, onFollowup, onPromote, showTrace }) {
  const I = window.NBIcon;
  return (
    <div className="nb-turn" data-role="agent">
      <div className="nb-turn-avatar" data-role="agent"><I.Sparkles/></div>
      <div className="nb-turn-body">
        <div className="nb-turn-head">
          <span className="nb-turn-who">NodeBench</span>
          <span className="nb-turn-time">{turn.time}</span>
        </div>

        {turn.run && <ResearchRunBar run={turn.run}/>}
        {showTrace !== false && turn.trace && turn.trace.length > 0 && <RunTrace trace={turn.trace}/>}

        {turn.body && (
          <div className="nb-turn-text">
            {turn.body.map((b, i) => renderBlock(b, i, onPeek, onPromote))}
          </div>
        )}

        {turn.runUpdates && turn.runUpdates.length > 0 && (
          <div className="nb-runups">
            {turn.runUpdates.map((u, i) => (
              <div key={i} className="nb-runup" data-kind={u.kind}>
                <span className="ic">{runUpKindGlyph(u.kind)}</span>
                <span className="lbl"><strong>{u.label}</strong>{u.detail ? <span className="dim"> · {u.detail}</span> : null}</span>
              </div>
            ))}
          </div>
        )}

        {turn.sources && turn.sources.length > 0 && (
          <div className="nb-turn-sources">
            <span className="ttl">Sources</span>
            {turn.sources.map(s => (
              <button key={s.n} className="nb-src-chip" title={s.title}>
                <span className="fav">{s.fav}</span>
                <span className="n">{s.n}</span>
                <span className="dom">{s.domain}</span>
                {s.cached && <span className="badge">cached</span>}
                {s.cached === false && <span className="badge live">live</span>}
              </button>
            ))}
          </div>
        )}

        {turn.followups && turn.followups.length > 0 && (
          <div className="nb-followups">
            {turn.followups.map((f, i) => (
              <button key={i} className="nb-followup-chip" onClick={() => onFollowup?.(f)}>{f}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Block renderer ─────────────────────────────────────────────────
function renderBlock(b, i, onPeek, onPromote) {
  if (b.kind === 'h')   return <h4 key={i} className="nb-block-h">{b.v}</h4>;
  if (b.kind === 'p')   return <p key={i} className="nb-block-p">{renderSegs(b.segs, onPeek)}</p>;
  if (b.kind === 'list') {
    return (
      <ul key={i} className="nb-block-list">
        {b.items.map((segs, j) => <li key={j}>{renderSegs(segs, onPeek)}</li>)}
      </ul>
    );
  }
  if (b.kind === 'entity-card') {
    const card = window.NBEntityCards[b.id];
    if (!card) return null;
    return <EmbeddedEntityCard key={i} card={card} onPeek={onPeek} onPromote={onPromote}/>;
  }
  if (b.kind === 'confirm') {
    return (
      <div key={i} className="nb-confirm">
        <div className="hd">
          <span className="d"/>
          <span><strong>Possible match:</strong> {b.match}</span>
          <span className="conf">{b.confidence} confidence</span>
        </div>
        <div className="actions">
          <button className="primary">Confirm match</button>
          <button>Keep separate</button>
          <button>Show evidence</button>
        </div>
      </div>
    );
  }
  return null;
}

function renderSegs(segs, onPeek) {
  if (!segs) return null;
  return segs.map((s, i) => {
    if (s.t === 'strong') return <strong key={i}>{s.v}</strong>;
    if (s.t === 'cite')   return <sup key={i} className="nb-cite">{s.n}</sup>;
    if (s.t === 'pill')   return <EntityPill key={i} kind={s.kind} id={s.id} label={s.v} subtle={s.subtle} onPeek={onPeek}/>;
    return <React.Fragment key={i}>{s.v}</React.Fragment>;
  });
}

// ─── EntityPill ────────────────────────────────────────────────────
function EntityPill({ kind, id, label, subtle, onPeek }) {
  return (
    <button className="nb-epill" data-kind={kind} onClick={() => onPeek?.(id)} title={`Peek ${label}`}>
      <span className="d"/>
      <span className="lbl">{label}</span>
      {subtle && <span className="sub">{subtle}</span>}
    </button>
  );
}

// ─── EmbeddedEntityCard — appears inline within agent prose ─────────
function EmbeddedEntityCard({ card, onPeek, onPromote }) {
  return (
    <div className="nb-embed-card" data-kind={card.kind}>
      <div className="nb-embed-head">
        <div className="nb-ec-avatar" data-kind={card.kind}>{window.NBKindGlyph(card.kind)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nb-embed-name">{card.name}</div>
          <div className="nb-embed-tagline">{card.tagline}</div>
        </div>
        <span className="nb-ec-kind" data-kind={card.kind}>{card.kind}</span>
      </div>
      <div className="nb-embed-meta">
        {card.location}
        {card.fundedRound && <> · {card.fundedRound} {card.fundedAmount} · {card.fundedLead} · {card.fundedDate}</>}
      </div>
      <p className="nb-embed-summary">{card.summary}</p>
      {card.relations && (
        <div className="nb-embed-rels">
          {card.relations.slice(0, 6).map(r => (
            <button key={r.id + r.label} className="nb-epill" data-kind={r.kind} onClick={() => onPeek?.(r.id)}>
              <span className="d"/>
              <span className="lbl">{r.label}</span>
              <span className="sub">{r.rel}</span>
            </button>
          ))}
        </div>
      )}
      <div className="nb-embed-actions">
        <button onClick={() => onPromote?.(card.id)}>Promote to root</button>
        <button>Add to notebook</button>
        <button>Compare</button>
        <button>Open card</button>
      </div>
    </div>
  );
}

// ─── ResearchRunBar — terse one-line telemetry above each agent turn ──
function ResearchRunBar({ run }) {
  return (
    <div className="nb-runbar" data-kind={run.kind}>
      <span className="ic">{runKindGlyph(run.kind)}</span>
      <span className="sum"><strong>{run.summary}</strong></span>
      {run.detail && <span className="dt">· {run.detail}</span>}
      {run.budget && (
        <span className="bdg">
          <span title="memory hits">mem {run.budget.mem}</span>
          <span title="cache reuses">cache {run.budget.cache}</span>
          <span title="live calls">live {run.budget.live}</span>
          <span title="tokens">{Math.round(run.budget.tokens / 1000)}k tk</span>
        </span>
      )}
    </div>
  );
}

// ─── RunTrace — compact step list (memory → cache → live → extract → compose) ──
function RunTrace({ trace }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="nb-trace2">
      <button className="nb-trace2-head" data-open={open} onClick={() => setOpen(o => !o)}>
        <svg className="caret" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        <span>Reasoned across {trace.length} steps</span>
        <span className="dim">{trace.map(s => s.step).join(' → ')}</span>
      </button>
      {open && (
        <ol className="nb-trace2-list">
          {trace.map((s, i) => (
            <li key={i}>
              <span className="step" data-step={s.step}>{s.step}</span>
              <span className="lbl">{s.label}</span>
              {s.hits && <span className="hits">{s.hits}</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ─── ThinkingPane — shown while a new agent response is being synthesized ──
function ThinkingPane({ steps, idx }) {
  const I = window.NBIcon;
  return (
    <div className="nb-turn" data-role="agent">
      <div className="nb-turn-avatar" data-role="agent"><I.Sparkles/></div>
      <div className="nb-turn-body">
        <div className="nb-turn-head">
          <span className="nb-turn-who">NodeBench</span>
          <span className="nb-turn-time">now</span>
        </div>
        <div className="nb-thinking2">
          {steps.map((s, i) => {
            const state = i < idx ? 'done' : i === idx ? 'active' : 'pending';
            return (
              <div key={i} className="nb-thinking2-step" data-state={state}>
                <span className="d"/>
                <span className="step">{s.step}</span>
                <span>{s.label}</span>
                {state === 'active' && <span className="nb-dot-spinner nb-dot-spinner--sm" style={{ marginLeft: 6 }}/>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──
function nowTime() {
  const d = new Date();
  const h = d.getHours(), m = d.getMinutes();
  const hr = ((h + 11) % 12) + 1;
  const mm = m < 10 ? '0' + m : m;
  return hr + ':' + mm + ' ' + (h < 12 ? 'AM' : 'PM');
}
function lastSnippet(t) {
  if (!t.turns || !t.turns.length) return '—';
  const last = t.turns[t.turns.length - 1];
  if (last.role === 'user') return 'You: ' + last.text;
  const firstP = (last.body || []).find(b => b.kind === 'p');
  if (firstP) return (firstP.segs || []).map(s => s.v || '').join('').slice(0, 90);
  return '—';
}
function runKindGlyph(kind) {
  return kind === 'research' ? '⚙' : kind === 'capture' ? '⊕' : kind === 'context' ? '◷' : kind === 'lookup' ? '⌕' : '·';
}
function runUpKindGlyph(kind) {
  return kind === 'graph' ? '◇' : kind === 'notebook' ? '☰' : kind === 'followup' ? '→' : kind === 'session' ? '◷' : '·';
}

// ─── ModelPicker — inline composer dropdown for choosing the routing target.
//   Mirrors the provider→model split used by libraries like pi-ai. NodeBench's
//   memory-first router falls back to live calls only when the chosen model is
//   needed; this picker chooses both the live target AND the call-budget gate.
const NB_MODEL_GROUPS = [
  { provider: 'Anthropic', tag: 'recommended', models: [
    { name: 'Claude Sonnet 4.5',  spec: 'Best-in-class reasoning · 200K ctx', cost: '$3 / $15' },
    { name: 'Claude Haiku 4.5',   spec: 'Fast cheap drafts · 200K ctx',       cost: '$1 / $5'  },
    { name: 'Claude Opus 4',      spec: 'Deep research · 200K ctx',           cost: '$15 / $75'},
  ]},
  { provider: 'OpenAI', tag: 'general', models: [
    { name: 'GPT-5',              spec: 'Tool use · long ctx',                cost: '$5 / $20' },
    { name: 'GPT-5 mini',         spec: 'Fast · cheap',                       cost: '$0.4 / $1.6' },
    { name: 'o4-mini',            spec: 'Thinks before answering',            cost: '$1.1 / $4.4' },
  ]},
  { provider: 'Google', tag: 'general', models: [
    { name: 'Gemini 2.5 Pro',     spec: 'Long ctx 1M · multimodal',           cost: '$1.25 / $5'  },
    { name: 'Gemini 2.5 Flash',   spec: 'Fast · cheap',                       cost: '$0.3 / $2.5' },
  ]},
  { provider: 'xAI', tag: 'general', models: [
    { name: 'Grok 4',             spec: 'Web-aware',                          cost: '$3 / $15' },
  ]},
  { provider: 'Groq', tag: 'fast', models: [
    { name: 'Llama 3.3 70B',      spec: 'Open weights · ultra-fast',          cost: '$0.6 / $0.8' },
  ]},
];

function ModelPicker({ model, setModel, open, setOpen }) {
  const I = window.NBIcon;
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="nb-model-picker" ref={ref}>
      <button className="nb-model-trigger" onClick={() => setOpen(!open)} title="Choose model">
        <span className="dot" data-provider={model.provider.toLowerCase()}/>
        <span className="nm">{model.name}</span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="nb-model-menu" role="menu">
          <div className="hd">
            <strong>Routing target</strong>
            <span>Memory-first. Live model called only when needed.</span>
          </div>
          {NB_MODEL_GROUPS.map(group => (
            <div key={group.provider} className="grp">
              <div className="grp-hd">
                <span className="dot" data-provider={group.provider.toLowerCase()}/>
                <span className="prov">{group.provider}</span>
                <span className="tag">{group.tag}</span>
              </div>
              {group.models.map(m => {
                const active = m.name === model.name;
                return (
                  <button key={m.name}
                          className="row"
                          data-active={active}
                          onClick={() => { setModel({ provider: group.provider, name: m.name }); setOpen(false); }}>
                    <div className="row-l">
                      <div className="nm">{m.name}</div>
                      <div className="spec">{m.spec}</div>
                    </div>
                    <div className="cost">{m.cost}<span className="unit">/M</span></div>
                    {active && <I.Check width={12} height={12}/>}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="ft">
            <span>Costs shown per million tokens (in / out).</span>
            <button className="lk">Manage providers →</button>
          </div>
        </div>
      )}
    </div>
  );
}

window.NBChatStream = ChatStream;
