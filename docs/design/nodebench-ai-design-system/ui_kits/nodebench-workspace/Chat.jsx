// Chat surface — fully interactive
// - Thread switching via left rail
// - Follow-ups become new queries
// - Composer sends (simulated thinking → new answer variant)
// - Tab switching re-routes artboard to Brief/Cards/Sources/Notebook

function ChatSurface({ tweaks, tab, setTab, thread, setThread }) {
  const data = window.WS_DATA;
  const answer = data.answers[thread] || data.answers.t1;
  const threadMeta = data.threads.find(t => t.id === thread) || data.threads[0];

  const [query, setQuery] = React.useState(threadMeta.query);
  const [composerText, setComposerText] = React.useState('');
  const [thinking, setThinking] = React.useState(false);
  const [overrideAnswer, setOverrideAnswer] = React.useState(null);

  // Reset when thread changes
  React.useEffect(() => {
    setQuery(threadMeta.query);
    setOverrideAnswer(null);
    setThinking(false);
  }, [thread]);

  const live = overrideAnswer || answer;

  const submit = (q) => {
    if (!q || !q.trim()) return;
    setQuery(q);
    setComposerText('');
    setThinking(true);
    setOverrideAnswer(null);
    // simulated "run"
    setTimeout(() => {
      setThinking(false);
      setOverrideAnswer({
        ...answer,
        verdict: `Re-run · ${q.length > 60 ? q.slice(0, 60) + '…' : q}`,
      });
    }, 1100);
  };

  const entity = {
    name: 'DISCO',
    initials: 'DI',
    meta: threadMeta.meta,
    style: { background: 'linear-gradient(135deg, #1A365D, #0F4C81)' },
  };

  const tabs = [
    { id: 'chat',     label: 'Chat',     icon: 'chat' },
    { id: 'brief',    label: 'Brief',    icon: 'brief' },
    { id: 'cards',    label: 'Cards',    icon: 'cards',    count: 14 },
    { id: 'notebook', label: 'Notebook', icon: 'notebook' },
    { id: 'sources',  label: 'Sources',  icon: 'sources',  count: 24 },
    { id: 'map',      label: 'Map',      icon: 'map' },
  ];

  return (
    <window.WorkspaceShell
      tabs={tabs} active={tab} onTabChange={setTab}
      entity={entity}
    >
      <div className="chat-layout" data-composer={tweaks.composerStyle}>
        <aside className="chat-history">
          <div className="chat-history-header">
            <span className="kicker">Threads</span>
            <button className="ws-icon-btn" style={{ width: 22, height: 22, borderRadius: 6 }} title="New thread"
                    onClick={() => submit('Start a new exploration…')}>
              <window.Icon name="plus" size={12} />
            </button>
          </div>
          <div className="chat-history-list">
            {data.threads.map(t => (
              <div key={t.id} className="chat-history-item"
                   data-active={t.id === thread}
                   onClick={() => setThread(t.id)}>
                <div className="chat-history-title">{t.title}</div>
                <div className="chat-history-meta">{t.meta}</div>
              </div>
            ))}
          </div>
        </aside>

        <section className="chat-answer">
          <div className="chat-query">
            <div className="chat-query-user">HS</div>
            <div className="chat-query-text">{query}</div>
          </div>

          <div className="chat-runbar">
            {thinking ? (
              <>
                <span className="pill pill-accent"><ThinkingDots /> thinking</span>
                <span className="pill pill-neutral pill-mono">exploring {threadMeta.meta.split(' · ')[1] || '24 src'}</span>
              </>
            ) : (
              <>
                <span className="pill pill-ok"><window.Icon name="check" size={10} /> verified</span>
                <span className="pill pill-accent"><window.Icon name="sparkle" size={10} /> 6 branches</span>
                <span className="pill pill-neutral pill-mono">kimi-k2.6 · 174s · llm-judge 9.6</span>
              </>
            )}
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button className="ws-icon-btn" title="Save as report" onClick={() => setTab('brief')}><window.Icon name="save" size={13} /></button>
              <button className="ws-icon-btn" title="Watch entity"><window.Icon name="bell" size={13} /></button>
            </span>
          </div>

          <article className="chat-body" style={{ opacity: thinking ? 0.5 : 1, transition: 'opacity 240ms' }}>
            <h1 className="chat-title">{live.verdict}</h1>
            {live.paragraphs.map((p, i) => (
              <p key={i}>
                {p.parts.map((part, j) => {
                  if (part.t === 'text')   return <React.Fragment key={j}>{part.v}</React.Fragment>;
                  if (part.t === 'strong') return <strong key={j}>{part.v}</strong>;
                  if (part.t === 'chip')   return <React.Fragment key={j}>{' '}<window.EntityChip name={part.name} type={part.type} code={part.code} />{' '}</React.Fragment>;
                  if (part.t === 'cite')   return <window.Cite key={j} n={part.n} onClick={() => setTab('sources')} />;
                  return null;
                })}
              </p>
            ))}

            {live.recommendation && (
              <div className="chat-callout">
                <div className="chat-callout-head">
                  <window.Icon name="target" size={13} />
                  <span>Recommendation</span>
                </div>
                <p style={{ margin: 0 }}>{live.recommendation}</p>
              </div>
            )}
          </article>

          {/* Top cards from the thread */}
          <div className="chat-strip">
            <div className="chat-strip-head">
              <span className="kicker">Top cards · 3 of 14</span>
              <a className="chat-strip-more" onClick={() => setTab('cards')}>Open all →</a>
            </div>
            <div className="chat-strip-row">
              {live.topCards.map((eid, i) => {
                const e = data.entities[eid];
                if (!e) return null;
                return (
                  <window.CompanyCard
                    key={eid}
                    name={e.name} ticker={e.ticker || ''} subtitle={e.subtitle}
                    avatar={e.avatar} avatarBg={e.avatarBg}
                    kicker={e.kicker}
                    metrics={e.metrics}
                    footer={<span><window.Icon name="clock" size={10} /> {e.footer || 'fresh · 2h'}</span>}
                    active={i === 0}
                    onClick={() => setTab('cards')}
                  />
                );
              })}
            </div>
          </div>

          {/* Sources */}
          <div className="chat-sources">
            <div className="chat-strip-head">
              <span className="kicker">Sources · top {live.topSourceIds.length} of 24</span>
              <a className="chat-strip-more" onClick={() => setTab('sources')}>View all →</a>
            </div>
            <div className="chat-sources-list">
              {live.topSourceIds.map(n => {
                const s = data.sources.find(x => x.n === n);
                if (!s) return null;
                return (
                  <div key={n} className="chat-source-row" onClick={() => setTab('sources')}>
                    <span className="cite" style={{ pointerEvents: 'none' }}>{s.n}</span>
                    <span className="chat-source-title">{s.title}</span>
                    <span className="pill pill-neutral" style={{ fontSize: 10 }}>{s.type}</span>
                    <span className="chat-source-meta">{s.domain}</span>
                    <span className="chat-source-meta">{s.date}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="chat-followups">
            <span className="kicker" style={{ marginRight: 2 }}>Continue</span>
            {live.followups.map((f, i) => (
              <button key={i} className="chat-followup" onClick={() => submit(f)}>{f}</button>
            ))}
          </div>
        </section>
      </div>

      <ChatComposer style={tweaks.composerStyle}
                    text={composerText}
                    onChange={setComposerText}
                    onSubmit={() => submit(composerText || 'Compare DISCO to Everlaw on AmLaw 100 coverage and blended ARPU.')} />
    </window.WorkspaceShell>
  );
}

function ThinkingDots() {
  return <span className="chat-thinking"><i/><i/><i/></span>;
}

function ChatComposer({ style = 'dock', text, onChange, onSubmit }) {
  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
  };
  return (
    <div className={`chat-composer chat-composer--${style}`}>
      <div className="composer">
        <textarea className="composer-input" rows={1}
          value={text}
          placeholder="Compare DISCO to Everlaw on AmLaw 100 coverage and blended ARPU."
          onChange={e => onChange?.(e.target.value)}
          onKeyDown={handleKey}
        />
        <div className="composer-tools">
          <button className="composer-tool-btn"><window.Icon name="paperclip" size={12}/> Attach</button>
          <button className="composer-tool-btn" data-active="true"><window.Icon name="globe" size={12}/> Web</button>
          <button className="composer-tool-btn"><window.Icon name="sparkle" size={12}/> Branches · 6</button>
          <button className="composer-tool-btn"><window.Icon name="layers" size={12}/> Use report</button>
          <button className="composer-submit" aria-label="Send" onClick={onSubmit}><window.Icon name="send" size={13}/></button>
        </div>
      </div>
    </div>
  );
}

window.ChatSurface = ChatSurface;
