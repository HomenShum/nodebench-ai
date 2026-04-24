// Entity Notebook — paper surface with terracotta margin rule, agent/user ink contrast.
function EntityNotebook() {
  const { Bookmark, Plus } = window.NBIcon;

  const blocks = [
    { kind: 'heading', text: 'DISCO' },
    { kind: 'meta', text: 'Entity · Legal tech · Austin, TX · Founded 2013' },
    { kind: 'agent', text: 'Headline · $100M Series C led by Greylock (Nov 2025). Company crossed 2,400 active firms including six of the AmLaw top 10.' },
    { kind: 'user', text: 'TODO: check whether SOC 2 Type II landed in EU this quarter' },
    { kind: 'agent', text: 'Update — announced GA Jan 14, 2026. Removes the regulatory overhang noted in the Nov report.', fresh: true },
    { kind: 'heading2', text: 'Open threads' },
    { kind: 'bullet', text: 'Revenue multiple peers · Everlaw, Relativity, Casetext' },
    { kind: 'bullet', text: 'AmLaw 25 customer overlap vs competitors' },
    { kind: 'bullet', text: 'Cold intro via Greylock partner — draft later this week' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <div className="nb-kicker" style={{ marginBottom: 6 }}>Notebook · Entity</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>DISCO</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="nb-btn nb-btn-secondary" style={{ fontSize: 12 }}><Bookmark width={13} height={13}/>Save</button>
          <button className="nb-btn nb-btn-primary" style={{ padding: '8px 14px', borderRadius: 12, fontSize: 12 }}><Plus width={13} height={13}/>New block</button>
        </div>
      </div>

      {/* Paper sheet */}
      <div style={{
        background: 'var(--bg-paper)',
        border: '1px solid color-mix(in oklab, var(--accent-primary) 12%, var(--border-subtle))',
        borderRadius: 16,
        padding: '28px 32px 36px 64px',
        position: 'relative',
        minHeight: 420,
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Margin rule */}
        <div style={{ position: 'absolute', left: 44, top: 20, bottom: 20, width: 1, background: 'var(--accent-primary)', opacity: 0.35 }}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'var(--font-sans)' }}>
          {blocks.map((b, i) => {
            if (b.kind === 'heading') return <div key={i} style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#1B1A18' }}>{b.text}</div>;
            if (b.kind === 'heading2') return <div key={i} style={{ fontSize: 14, fontWeight: 600, color: '#1B1A18', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{b.text}</div>;
            if (b.kind === 'meta') return <div key={i} style={{ fontSize: 12, color: 'color-mix(in oklab, #1B1A18 60%, transparent)', fontFamily: 'var(--font-mono)' }}>{b.text}</div>;
            if (b.kind === 'bullet') return <div key={i} style={{ fontSize: 14, color: '#1B1A18', paddingLeft: 16, position: 'relative', lineHeight: 1.6 }}>
              <span style={{ position: 'absolute', left: 0, top: 8, width: 5, height: 5, borderRadius: 999, background: 'var(--accent-primary)' }}/>{b.text}</div>;
            if (b.kind === 'user') return <div key={i} style={{
              fontSize: 14.5, color: '#1B1A18', lineHeight: 1.65,
              padding: '4px 10px', borderLeft: '2px solid #1B1A18',
              background: 'rgba(27,26,24,.04)',
            }}>{b.text}</div>;
            // agent
            return <div key={i} style={{
              fontSize: 14.5, color: 'color-mix(in oklab, #1B1A18 72%, transparent)', lineHeight: 1.7,
              position: 'relative', paddingLeft: 16,
              animation: b.fresh ? 'nb-fresh 800ms var(--ease-out-expo)' : undefined,
              background: b.fresh ? 'rgba(217,119,87,.1)' : 'transparent',
              borderRadius: 6,
            }}>
              <span style={{ position: 'absolute', left: 0, top: 10, width: 6, height: 6, borderRadius: 999, background: 'var(--accent-primary)' }}/>
              {b.text}
            </div>;
          })}
        </div>
      </div>
      <style>{`@keyframes nb-fresh { 0%{background:rgba(217,119,87,.28)} 100%{background:rgba(217,119,87,.1)} }`}</style>
    </div>
  );
}

window.NBEntityNotebook = EntityNotebook;
