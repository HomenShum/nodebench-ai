// Homepage composer — prompt input + suggested prompt cards + routing chips.
function Composer({ onSubmit }) {
  const { ArrowUp, Sparkles, FileText, Eye } = window.NBIcon;
  const [value, setValue] = React.useState('');
  const [lane, setLane] = React.useState('answer');

  const lanes = [
    { id: 'answer', label: 'Answer', note: 'fast · default' },
    { id: 'deep',   label: 'Deep dive', note: 'multi-agent · 3–5 min' },
    { id: 'admin',  label: 'Admin',   note: 'nodebench-mcp-admin' },
  ];

  const suggestions = [
    { icon: <Sparkles width={14} height={14}/>, label: 'DISCO — worth reaching out? Fastest debrief.' },
    { icon: <FileText width={14} height={14}/>, label: 'Summarize the attached 10-K into a 1-pager.' },
    { icon: <Eye width={14} height={14}/>,      label: 'Watch Mercor and nudge me on hiring signal.' },
  ];

  function submit() {
    if (!value.trim()) return;
    onSubmit(value.trim(), lane);
    setValue('');
  }

  return (
    <div className="nb-reveal" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <div className="nb-kicker" style={{ marginBottom: 10 }}>Entity intelligence</div>
        <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', margin: 0, lineHeight: 1.1 }}>
          What are we researching today?
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', marginTop: 8, maxWidth: 520, margin: '8px auto 0' }}>
          Answer-first. Backed by sources. Saved reports become reusable memory.
        </p>
      </div>

      {/* Composer */}
      <div className="nb-panel-soft" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: 'var(--shadow-md)' }}>
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
          placeholder="Ask anything — a company, a market, a question…"
          style={{ border: 0, outline: 0, background: 'transparent', resize: 'none', minHeight: 56,
            fontSize: 15, fontFamily: 'inherit', color: 'var(--text-primary)', lineHeight: 1.5 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {lanes.map(L => {
            const active = lane === L.id;
            return (
              <button key={L.id} onClick={() => setLane(L.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  border: `1px solid ${active ? 'var(--accent-primary-border)' : 'var(--border-subtle)'}`,
                  background: active ? 'var(--accent-primary-tint)' : 'rgba(255,255,255,.74)',
                  color: active ? 'var(--accent-ink)' : 'var(--text-muted)',
                  fontWeight: active ? 600 : 500, fontSize: 12, padding: '5px 11px', borderRadius: 999,
                  transition: 'all 160ms var(--ease-out-expo)',
                }}>
                {L.label}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, opacity: .7 }}>· {L.note}</span>
              </button>
            );
          })}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>⌘↵ to send</span>
            <button className="nb-btn nb-btn-primary" onClick={submit} style={{ padding: '8px 14px', borderRadius: 12 }}>
              <ArrowUp width={14} height={14}/>
              Start run
            </button>
          </div>
        </div>
      </div>

      {/* Suggested prompts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }} className="nb-reveal-stagger">
        {suggestions.map((s, i) => (
          <button key={i} onClick={() => setValue(s.label)} className="nb-panel nb-hover-lift"
            style={{ textAlign: 'left', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-primary-tint)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.icon}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45, fontWeight: 500 }}>{s.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

window.NBComposer = Composer;
