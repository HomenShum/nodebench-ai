// Recent reports — bottom strip of the home pulse.
// Each card opens a report. Three actions per card: Brief · Explore · Chat.

const RECENT = [
  {
    id: 'orbital',
    title: 'Orbital Labs — should I follow up?',
    eyebrow: 'diligence · series A',
    fresh: 'fresh',
    meta: '8 turns · 14 sources · 6 entities',
    teaser: 'Voice-agent eval infra. Open-core SDK; design partners with Oscar, Commure, one unnamed payer.',
  },
  {
    id: 'disco',
    title: 'DISCO — diligence debrief',
    eyebrow: 'diligence · series C',
    fresh: 'updated',
    meta: '6 branches · 24 sources · 3 sections',
    teaser: 'Series-C legal-tech. $100M led by Bessemer. Concentration risk + EU regulatory exposure.',
  },
  {
    id: 'mercor',
    title: 'Mercor — series B signal?',
    eyebrow: 'watch · marketplace',
    fresh: 'watching',
    meta: '4 turns · 18 sources · ring-1',
    teaser: 'Hiring velocity ↑ 62% MoM. Three new design partners. Compete: Worksome, Toptal-Pro.',
  },
];

function RecentReports({ onOpenReport }) {
  return (
    <section className="nb-panel nb-home-block">
      <header className="nb-home-block-head">
        <div>
          <div className="nb-kicker">Recent reports</div>
          <h3 className="nb-home-block-title">Memory you can pick up at any branch.</h3>
        </div>
        <button className="nb-home-block-link">All reports</button>
      </header>
      <div className="nb-recent-grid">
        {RECENT.map(r => (
          <article key={r.id} className="nb-recent-card" onClick={() => onOpenReport && onOpenReport(r.id)}>
            <header className="nb-recent-head">
              <span className="nb-recent-eye">{r.eyebrow}</span>
              <span className="nb-recent-fresh" data-state={r.fresh}>● {r.fresh}</span>
            </header>
            <h4 className="nb-recent-title">{r.title}</h4>
            <p className="nb-recent-teaser">{r.teaser}</p>
            <div className="nb-recent-meta">{r.meta}</div>
            <div className="nb-recent-actions">
              <button className="nb-recent-action" data-primary="true">Brief</button>
              <button className="nb-recent-action">Explore</button>
              <button className="nb-recent-action">Chat</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

window.NBRecentReports = RecentReports;
