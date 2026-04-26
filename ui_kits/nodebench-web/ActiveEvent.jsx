// Active event / workspace — the big horizontal hero card showing how the
// active event corpus is compounding. Right side shows latest captures.

const EVENT_STATS = [
  { v: 1482, l: 'entities discovered',         emph: false },
  { v: '78%', l: 'answers from event corpus',  emph: true  },
  { v: 4920, l: 'repeated searches avoided',   emph: false },
  { v: 214,  l: 'private capture sessions',    emph: false },
];

const RECENT_CAPTURES = [
  { time: '0:42 ago', who: 'Alex Park · Orbital Labs',   note: 'voice-agent eval infra · matched first name' },
  { time: '12m ago',  who: 'Maya Cole · ex-Epic',        note: 'clinical lead · ring-1 healthcare' },
  { time: '38m ago',  who: 'Sam Reichelt · ex-Olive AI', note: 'product co-founder' },
  { time: '1h ago',   who: 'Booth photo · D14-1',        note: '3 captures attached to Team' },
];

function ActiveEvent() {
  return (
    <section className="nb-panel nb-home-block nb-event">
      <header className="nb-home-block-head">
        <div>
          <div className="nb-kicker">
            <span className="nb-event-pip"/> Active workspace · Ship Demo Day
          </div>
          <h3 className="nb-home-block-title">Corpus is compounding in real time.</h3>
        </div>
        <button className="nb-home-block-link">Open event</button>
      </header>

      <div className="nb-event-stats">
        {EVENT_STATS.map((s, i) => (
          <div className="nb-event-stat" key={i} data-emph={s.emph}>
            <div className="v">{s.v}</div>
            <div className="l">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="nb-event-captures">
        <div className="nb-event-captures-head">
          <span className="nb-kicker">Latest captures</span>
          <span className="nb-event-captures-meta">corpus freshness · 2m ago</span>
        </div>
        <ul className="nb-event-cap-list">
          {RECENT_CAPTURES.map((c, i) => (
            <li key={i} className="nb-event-cap">
              <span className="t">{c.time}</span>
              <span className="who">{c.who}</span>
              <span className="note">{c.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

window.NBActiveEvent = ActiveEvent;
