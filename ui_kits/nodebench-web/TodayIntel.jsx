// Today's Intelligence — 2x2 card grid: new signals, reports updated,
// watchlist changes, follow-ups due. Each card holds count + 1-2 examples.

const TODAY_LANES = [
  {
    id: 'signal',
    title: 'New signals',
    accent: 'accent',
    count: 4,
    items: [
      { hd: 'Mercor hiring velocity ↑',     meta: '18 sources · 1d ago · watching',     entity: 'Mercor' },
      { hd: 'Orbital Labs press mention',   meta: 'TechCrunch · 4h ago',                entity: 'Orbital Labs' },
      { hd: 'DISCO files secondary',        meta: 'SEC · 6h ago',                       entity: 'DISCO' },
    ],
  },
  {
    id: 'updated',
    title: 'Reports updated',
    accent: 'indigo',
    count: 3,
    items: [
      { hd: 'Ship Demo Day',                meta: '12 captures · 8 cos · 14 ppl · 9 follow-ups', entity: 'Event' },
      { hd: 'Voice-agent eval landscape',   meta: '+ 4 claims · −1 weak',               entity: 'Market' },
      { hd: 'Series-B litigation OS',       meta: '+ 2 entities',                       entity: 'Thesis' },
    ],
  },
  {
    id: 'watchlist',
    title: 'Watchlist changes',
    accent: 'success',
    count: 5,
    items: [
      { hd: 'Cellebrite — claim updated',   meta: 'gross retention 96% → 93%',          entity: 'Cellebrite' },
      { hd: 'Anita Park (CRO) joined',      meta: 'evidence: 2 · medium confidence',    entity: 'Person' },
      { hd: 'Bessemer term sheet leak',     meta: 'rumored · 2 sources',                entity: 'Bessemer' },
    ],
  },
  {
    id: 'followup',
    title: 'Follow-ups due',
    accent: 'warning',
    count: 2,
    items: [
      { hd: 'Alex @ Orbital Labs',          meta: 'ask about healthcare pilot criteria', entity: 'Person' },
      { hd: 'Schedule DISCO debrief',       meta: 'today · before market close',         entity: 'Action' },
    ],
  },
];

function TodayIntel() {
  return (
    <section className="nb-panel nb-home-block">
      <header className="nb-home-block-head">
        <div>
          <div className="nb-kicker">Today's intelligence</div>
          <h3 className="nb-home-block-title">Pick up where memory left off.</h3>
        </div>
        <button className="nb-home-block-link">View all</button>
      </header>
      <div className="nb-today-grid">
        {TODAY_LANES.map(lane => (
          <article className="nb-today-lane" key={lane.id} data-accent={lane.accent}>
            <header className="nb-today-lane-head">
              <span className="nb-today-lane-dot"/>
              <span className="nb-today-lane-title">{lane.title}</span>
              <span className="nb-today-lane-count">{lane.count}</span>
            </header>
            <ul className="nb-today-list">
              {lane.items.map((it, i) => (
                <li key={i} className="nb-today-item">
                  <div className="hd">{it.hd}</div>
                  <div className="meta">{it.meta}</div>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

window.NBTodayIntel = TodayIntel;
