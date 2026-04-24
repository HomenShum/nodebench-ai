// Streaming answer packet — header, streamed prose with citations, source panel, follow-up bar.
function AnswerPacket({ query, onFollowup, onSave }) {
  const { Check, Bookmark, ExternalLink, ArrowUp, Sparkles } = window.NBIcon;

  const sources = [
    { id: 1, title: 'DISCO closes $100M Series C', domain: 'techcrunch.com', date: '2025-11-14' },
    { id: 2, title: 'Legal tech market overview', domain: 'gartner.com',     date: '2025-09-02' },
    { id: 3, title: 'EU AI Act enforcement',      domain: 'euractiv.com',    date: '2025-12-01' },
    { id: 4, title: 'Customer base (ir filing)',  domain: 'sec.gov',         date: '2026-02-08' },
  ];

  const Cite = ({ n }) => (
    <sup style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent-primary)', background: 'var(--accent-primary-tint)',
      border: '1px solid var(--accent-primary-border)', padding: '0 4px', borderRadius: 4, marginLeft: 2, cursor: 'pointer' }}>
      {n}
    </sup>
  );

  return (
    <div className="nb-reveal-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Query echo */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 999, background: 'linear-gradient(135deg,#D97757,#5E6AD2)', color: '#fff', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>HS</div>
        <div style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.55, fontWeight: 500, flex: 1 }}>{query}</div>
      </div>

      {/* Answer header */}
      <div className="nb-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="nb-badge nb-badge-accent"><Sparkles width={11} height={11}/>answer · 6 branches</span>
          <span className="nb-badge nb-badge-success"><Check width={11} height={11}/>verified</span>
          <span className="nb-badge"><span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--text-faint)' }}/>24 sources</span>
          <span className="nb-badge" style={{ fontFamily: 'var(--font-mono)' }}>p95 · 174s</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="nb-btn nb-btn-ghost" onClick={onSave} style={{ fontSize: 12 }}>
              <Bookmark width={13} height={13}/>Save report
            </button>
          </div>
        </div>

        {/* Answer body */}
        <div style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-primary)' }}>
          <p style={{ margin: '0 0 14px' }}>
            <strong>Yes — worth reaching out.</strong> DISCO closed a $100M Series C led by Greylock
            in November 2025<Cite n={1}/>, putting its ARR growth trajectory above the 2.5× legal-tech
            median<Cite n={2}/>. The company serves 2,400+ firms including six of the AmLaw top
            10<Cite n={4}/>, and its ediscovery platform is one of the few with a native SOC 2 Type II
            deployment across all regions.
          </p>
          <p style={{ margin: '0 0 14px' }}>
            <strong>Watch for:</strong> regulatory exposure in the EU where the AI Act now enforces
            transparency obligations on legal-grade document classifiers<Cite n={3}/>. This creates a
            6-to-9-month integration tax for vendors without pre-existing lineage tracking.
          </p>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13.5 }}>
            <span className="nb-kicker" style={{ marginRight: 8 }}>Receipts</span>
            Revenue multiple 14.2× · Gross margin 78% · NRR 122% · Cash runway 38 months.
          </p>
        </div>

        {/* Sources */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
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
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
