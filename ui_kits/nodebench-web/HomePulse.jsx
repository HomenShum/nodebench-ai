// Home — the Memory Pulse surface.
// Frames the homepage as proof of compounding intelligence: every chat, capture,
// report, and source makes the next answer faster. The composer sits up top, but
// below it lives the headline pulse strip, today's intelligence, the active
// event, and recent reports — all derived from the same memory ledger.

function HomePulse({ onSubmit, onOpenReport, pulseLayout, numberScale }) {
  pulseLayout = pulseLayout || 'card-grid';
  numberScale = numberScale || 'big';

  return (
    <div className="nb-reveal" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* ─── Hero composer ─── */}
      <window.NBComposer onSubmit={onSubmit} />

      {/* ─── Memory pulse strip ─── */}
      <window.NBPulseStrip layout={pulseLayout} numberScale={numberScale} />

      {/* ─── Today's intelligence + Active event ─── */}
      <div className="nb-home-grid">
        <window.NBTodayIntel />
        <window.NBActiveEvent />
      </div>

      {/* ─── Recent reports ─── */}
      <window.NBRecentReports onOpenReport={onOpenReport} />
    </div>
  );
}

window.NBHomePulse = HomePulse;
