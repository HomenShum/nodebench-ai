// Pulse strip — public memory metrics that prove the moat.
// Three layouts available: card-grid (default, 4 hero cards + secondary row),
// ticker (single dense monospace row), headline (one giant hero number with
// supporting metrics around it). Tweaks panel can flip between them.
//
// Data is static for the demo, but the shape mirrors what a real metrics ledger
// would emit per workspace: { id, label, value, unit, trend, what }.

const PULSE_METRICS = [
  { id: 'entities',      label: 'Entities tracked',       value: 42810,  unit: '',  trend: '+184 today',  what: 'A real intelligence graph' },
  { id: 'edges',         label: 'Relationships mapped',   value: 183204, unit: '',  trend: '+612 today',  what: 'How people, companies, products connect' },
  { id: 'reports',       label: 'Reports created',        value: 18204,  unit: '',  trend: '+47 today',   what: 'Chats become durable work products' },
  { id: 'memory_pct',    label: 'Served from memory',     value: 71,     unit: '%', trend: 'up 4pp / wk', what: 'Search not repeated every time', hero: true },
  { id: 'avoided',       label: 'Searches avoided',       value: 126000, unit: '',  trend: 'this week',   what: 'Cost-saving + speed moat' },
  { id: 'refreshed',     label: 'Sources refreshed',      value: 9420,   unit: '',  trend: 'this week',   what: 'Freshness + trust' },
  { id: 'verified',      label: 'Claims verified',        value: 2841,   unit: '',  trend: 'this week',   what: 'Evidence quality' },
  { id: 'avg_time',      label: 'Avg sourced answer',     value: 3.4,    unit: 's', trend: '−0.6s / mo',  what: 'UX speed' },
  { id: 'followups',     label: 'Follow-ups created',     value: 612,    unit: '',  trend: 'this week',   what: 'Business action, not just research' },
  { id: 'crm',           label: 'CRM exports',            value: 184,    unit: '',  trend: 'this week',   what: 'Workflow completion' },
];

function fmt(value) {
  if (value >= 1000000) return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (value >= 1000)    return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  if (Number.isInteger(value)) return value.toLocaleString();
  return String(value);
}

function PulseStrip({ layout, numberScale }) {
  const heroIds = ['memory_pct', 'entities', 'edges', 'reports'];
  const secondaryIds = ['avoided', 'refreshed', 'verified', 'avg_time', 'followups', 'crm'];

  if (layout === 'ticker') {
    return (
      <section className="nb-pulse" data-layout="ticker">
        <header className="nb-pulse-head">
          <div>
            <div className="nb-kicker">Memory pulse</div>
            <h2 className="nb-pulse-title">Every chat makes the next one faster.</h2>
          </div>
          <span className="nb-pulse-priv" title="Private notes never leak into public counters.">
            <span className="nb-pulse-priv-dot"/> private notes excluded
          </span>
        </header>
        <div className="nb-pulse-ticker">
          {PULSE_METRICS.map(m => (
            <div className="nb-pulse-tick" key={m.id}>
              <span className="v">{fmt(m.value)}{m.unit}</span>
              <span className="l">{m.label.toLowerCase()}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (layout === 'headline') {
    const hero = PULSE_METRICS.find(m => m.id === 'memory_pct');
    const supports = PULSE_METRICS.filter(m => m.id !== 'memory_pct').slice(0, 6);
    return (
      <section className="nb-pulse" data-layout="headline" data-scale={numberScale}>
        <header className="nb-pulse-head">
          <div>
            <div className="nb-kicker">Memory pulse</div>
            <h2 className="nb-pulse-title">Every chat makes the next one faster.</h2>
          </div>
          <span className="nb-pulse-priv">
            <span className="nb-pulse-priv-dot"/> private notes excluded
          </span>
        </header>
        <div className="nb-pulse-headline">
          <div className="nb-pulse-hero-card">
            <div className="nb-pulse-hero-num">{fmt(hero.value)}<span className="u">{hero.unit}</span></div>
            <div className="nb-pulse-hero-label">{hero.label.toLowerCase()}</div>
            <div className="nb-pulse-hero-trend">
              <span className="nb-pulse-trend-dot" data-dir="up"/> {hero.trend}
            </div>
            <div className="nb-pulse-hero-what">{hero.what}</div>
          </div>
          <div className="nb-pulse-supports">
            {supports.map(m => (
              <div className="nb-pulse-support" key={m.id}>
                <div className="v">{fmt(m.value)}<span className="u">{m.unit}</span></div>
                <div className="l">{m.label.toLowerCase()}</div>
                <div className="t">{m.trend}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // default: card-grid
  const heroes = PULSE_METRICS.filter(m => heroIds.includes(m.id));
  const secondary = PULSE_METRICS.filter(m => secondaryIds.includes(m.id));
  return (
    <section className="nb-pulse" data-layout="card-grid" data-scale={numberScale}>
      <header className="nb-pulse-head">
        <div>
          <div className="nb-kicker">Memory pulse</div>
          <h2 className="nb-pulse-title">Every chat makes the next one faster.</h2>
          <p className="nb-pulse-sub">Public context compounds. Private notes stay private.</p>
        </div>
        <span className="nb-pulse-priv">
          <span className="nb-pulse-priv-dot"/> private notes excluded
        </span>
      </header>
      <div className="nb-pulse-cards">
        {heroes.map(m => (
          <article className="nb-pulse-card" key={m.id} data-hero={m.id === 'memory_pct'}>
            <div className="nb-pulse-card-num">
              {fmt(m.value)}<span className="u">{m.unit}</span>
            </div>
            <div className="nb-pulse-card-label">{m.label.toLowerCase()}</div>
            <div className="nb-pulse-card-trend">
              <span className="nb-pulse-trend-dot" data-dir="up"/> {m.trend}
            </div>
            <Sparkline id={m.id}/>
          </article>
        ))}
      </div>
      <div className="nb-pulse-secondary">
        {secondary.map(m => (
          <div className="nb-pulse-mini" key={m.id}>
            <span className="v">{fmt(m.value)}<span className="u">{m.unit}</span></span>
            <span className="l">{m.label.toLowerCase()}</span>
            <span className="t">{m.trend}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// Tiny inline sparkline. Static seeded data per metric, but produces a real
// monotone curve so the cards feel alive.
function Sparkline({ id }) {
  const seeds = {
    memory_pct: [56, 58, 61, 60, 63, 67, 69, 71],
    entities:   [38, 39, 40, 41, 41, 42, 42, 43],
    edges:      [160, 165, 170, 173, 176, 178, 181, 183],
    reports:    [16, 16, 17, 17, 17, 18, 18, 18],
  };
  const data = seeds[id] || [10, 12, 11, 14, 13, 16, 15, 18];
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const w = 100, h = 28;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y];
  });
  const path = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = path + ` L${w},${h} L0,${h} Z`;
  return (
    <svg className="nb-pulse-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={area} className="fill"/>
      <path d={path} className="line"/>
    </svg>
  );
}

window.NBPulseStrip = PulseStrip;
