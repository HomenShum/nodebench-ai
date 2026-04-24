// Daily Pulse — the home-surface "return at the right moment" card.
// Sits below the composer and surfaces today's strongest signals with their
// source counts. The entire card is clickable — tapping/clicking starts a
// Deep-dive run with the pulse's stored prompt. Freshness is rendered as a
// relative timestamp pill next to the kicker.
//
// Mirrors the live implementation at
// src/features/home/views/HomeLanding.tsx `showPulseCard` block.

const PULSE_SEED = {
  prompt: "Give me today's sharpest signals across my watchlist — rank by what's likely to move a decision in the next 7 days.",
  title: "Today's strongest signals",
  summary:
    "Four watchlist entities moved overnight. Disco's churn is bending down, Mercor posted 7 new eng roles in 24h, Relay Legal's Series D memo leaked, and LexNode quietly extended their runway.",
  updatedAt: Date.now() - 42 * 60 * 1000, // 42 minutes ago
  items: [
    {
      id: "p1",
      title: "DISCO — SOC 2 Type II GA in EU",
      summary:
        "Addresses the regulatory risk flagged in your Nov 14 run. Your prior 'needs_review' stance likely flips. Material.",
      sourceCount: 3,
    },
    {
      id: "p2",
      title: "Mercor — 7 new eng roles in 24h",
      summary:
        "Consistent with the Series B prep hypothesis. 3 new stealth hires on LinkedIn reinforce it.",
      sourceCount: 5,
    },
    {
      id: "p3",
      title: "Relay Legal — Series D memo surfaced",
      summary:
        "Direct head-to-head claims against Disco on Am Law 200 renewals. Contradicts last week's Competitive card.",
      sourceCount: 4,
    },
    {
      id: "p4",
      title: "LexNode — runway extended to Q1 2027",
      summary:
        "Bridge from existing investors + aggressive mid-market pricing change. Watch for spillover into Disco's GRR.",
      sourceCount: 2,
    },
  ],
};

function formatPulseFreshness(updatedAt) {
  if (!updatedAt) return "just now";
  const delta = Math.max(0, Date.now() - updatedAt);
  const minutes = Math.round(delta / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `updated ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `updated ${hours}h ago`;
  const days = Math.round(hours / 24);
  return `updated ${days}d ago`;
}

function DailyPulse({ onOpen, seed }) {
  const { Clock } = window.NBIcon;
  const pulse = seed ?? PULSE_SEED;
  const items = (pulse.items || []).slice(0, 5);

  function open() {
    if (typeof onOpen === "function") {
      onOpen(pulse.prompt, "deep");
    }
  }

  return (
    <button
      type="button"
      data-testid="pulse-card"
      onClick={open}
      className="nb-reveal nb-pulse-card"
    >
      <div className="nb-pulse-head">
        <div>
          <div className="nb-pulse-kicker">
            <span className="nb-pulse-dot" aria-hidden="true" />
            Daily Pulse
          </div>
          <h2 className="nb-pulse-title">{pulse.title}</h2>
        </div>
        <span className="nb-pulse-freshness">
          <Clock width={14} height={14} />
          {formatPulseFreshness(pulse.updatedAt)}
        </span>
      </div>

      {pulse.summary ? <p className="nb-pulse-summary">{pulse.summary}</p> : null}

      <div className="nb-pulse-items">
        {items.map((item, index) => (
          <div
            key={item.id ?? `${item.title}-${index}`}
            className="nb-pulse-item"
          >
            <div className="nb-pulse-item-body">
              <div className="nb-pulse-item-title">{item.title}</div>
              <p className="nb-pulse-item-summary">{item.summary}</p>
            </div>
            <span className="nb-pulse-item-sources">
              {item.sourceCount} source{item.sourceCount === 1 ? "" : "s"}
            </span>
          </div>
        ))}
      </div>

      <div className="nb-pulse-cta">
        Open full brief in Chat
        <span aria-hidden="true" className="nb-pulse-cta-arrow">↗</span>
      </div>
    </button>
  );
}

window.NBDailyPulse = DailyPulse;
window.NBDailyPulseSeed = PULSE_SEED;
window.formatPulseFreshness = formatPulseFreshness;
