/**
 * NodeBench MCP — Operating Dashboard HTML
 *
 * Self-contained single-page dashboard matching the NodeBench AI design system:
 * glass cards, warm terracotta accent (#d97757), Manrope + JetBrains Mono typography.
 *
 * Sections:
 *  1. Header Bar — branding, local badge, auto-refresh indicator, clock
 *  2. Session Delta — hero card with strategy/competitors/contradictions/attention
 *  3. Trajectory Score — sparkline + 7 dimension bars
 *  4. Event Ledger — last 20 events with actor badges and type filters
 *  5. Important Changes — status summary + actionable change cards
 *  6. Path Replay — horizontal scrollable session path
 *  7. Time Rollups — period tabs + metric grid with delta badges
 *  8. Packet Readiness — staleness scores per packet type
 *  9. Recent Actions — last 10 tracked actions
 * 10. Footer — version, tool count, table count, auto-refresh interval
 *
 * Auto-refreshes every 10s with hash-based diffing (only re-renders changed sections).
 * Fully responsive: single column mobile, 2-col grid desktop.
 * No external JS/CSS libraries — inline styles with exact design tokens.
 */

export function getOperatingDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodeBench — Operating Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    /* ── Reset ──────────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Design Tokens ─────────────────────────────────────── */
    :root {
      --bg-primary: #09090b;
      --bg-card: rgba(255, 255, 255, 0.12);
      --bg-card-subtle: rgba(255, 255, 255, 0.04);
      --border-card: rgba(255, 255, 255, 0.20);
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-accent: rgba(217, 119, 87, 0.5);

      --accent: #d97757;
      --accent-dim: rgba(217, 119, 87, 0.15);
      --accent-glow: rgba(217, 119, 87, 0.25);

      --text-primary: #fafafa;
      --text-secondary: rgba(255, 255, 255, 0.7);
      --text-muted: rgba(255, 255, 255, 0.4);
      --text-dim: rgba(255, 255, 255, 0.25);

      --emerald: #4ade80;
      --amber: #fbbf24;
      --red: #f87171;
      --blue: #60a5fa;
      --violet: #a78bfa;
      --cyan: #22d3ee;

      --radius-sm: 6px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --radius-xl: 16px;

      --font-body: 'Manrope', system-ui, -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace;

      --transition-fast: 150ms ease;
      --transition-base: 250ms ease;
      --transition-slow: 400ms ease;
    }

    /* ── Base ───────────────────────────────────────────────── */
    html { scroll-behavior: smooth; }
    body {
      background: var(--bg-primary);
      color: var(--text-primary);
      font-family: var(--font-body);
      font-size: 14px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      min-height: 100vh;
    }

    /* ── Scrollbar ─────────────────────────────────────────── */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

    /* ── Layout ────────────────────────────────────────────── */
    .dashboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 20px 80px;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    @media (min-width: 768px) {
      .grid-2 { grid-template-columns: 1fr 1fr; }
    }

    .grid-4 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    @media (min-width: 640px) {
      .grid-4 { grid-template-columns: repeat(4, 1fr); }
    }

    /* ── Section Header ────────────────────────────────────── */
    .section-header {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: var(--text-muted);
      margin-bottom: 12px;
      font-family: var(--font-body);
    }
    .section-header .count {
      font-family: var(--font-mono);
      color: var(--text-dim);
      font-weight: 400;
      margin-left: 8px;
    }

    /* ── Glass Card ────────────────────────────────────────── */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-lg);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      padding: 20px;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }
    .card:hover {
      border-color: rgba(255, 255, 255, 0.28);
    }
    .card-hero {
      border-color: var(--border-accent);
      box-shadow: 0 0 40px var(--accent-dim), inset 0 1px 0 rgba(255,255,255,0.05);
    }
    .card-hero:hover {
      border-color: var(--accent);
      box-shadow: 0 0 60px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.08);
    }

    /* ── Mini Stat Card ────────────────────────────────────── */
    .mini-stat {
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 12px 8px;
      text-align: center;
      transition: border-color var(--transition-fast);
    }
    .mini-stat:hover {
      border-color: rgba(255,255,255,0.15);
    }
    .mini-stat-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--text-muted);
      margin-bottom: 4px;
      font-family: var(--font-body);
      font-weight: 600;
    }
    .mini-stat-value {
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
      font-size: 22px;
      font-weight: 500;
      color: var(--text-primary);
      line-height: 1.2;
    }
    .mini-stat-delta {
      font-family: var(--font-mono);
      font-size: 11px;
      margin-top: 2px;
    }

    /* ── Stat (generic) ────────────────────────────────────── */
    .stat {
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
    }

    /* ── Badge ─────────────────────────────────────────────── */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      line-height: 1.6;
    }
    .badge-emerald { background: rgba(74,222,128,0.12); color: var(--emerald); border: 1px solid rgba(74,222,128,0.2); }
    .badge-amber   { background: rgba(251,191,36,0.12); color: var(--amber);   border: 1px solid rgba(251,191,36,0.2); }
    .badge-red     { background: rgba(248,113,113,0.12); color: var(--red);     border: 1px solid rgba(248,113,113,0.2); }
    .badge-blue    { background: rgba(96,165,250,0.12);  color: var(--blue);    border: 1px solid rgba(96,165,250,0.2); }
    .badge-violet  { background: rgba(167,139,250,0.12); color: var(--violet);  border: 1px solid rgba(167,139,250,0.2); }
    .badge-cyan    { background: rgba(34,211,238,0.12);  color: var(--cyan);    border: 1px solid rgba(34,211,238,0.2); }
    .badge-accent  { background: var(--accent-dim);       color: var(--accent);  border: 1px solid rgba(217,119,87,0.3); }

    /* ── Actor Badge ───────────────────────────────────────── */
    .actor-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      font-family: var(--font-mono);
      flex-shrink: 0;
    }
    .actor-F { background: rgba(217,119,87,0.2);  color: var(--accent); }
    .actor-A { background: rgba(34,211,238,0.15);  color: var(--cyan); }
    .actor-S { background: rgba(167,139,250,0.15); color: var(--violet); }
    .actor-B { background: rgba(96,165,250,0.15);  color: var(--blue); }

    /* ── Buttons ────────────────────────────────────────────── */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 600;
      font-family: var(--font-body);
      cursor: pointer;
      border: 1px solid var(--border-subtle);
      background: var(--bg-card-subtle);
      color: var(--text-secondary);
      transition: all var(--transition-fast);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .btn:hover {
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.2);
      color: var(--text-primary);
    }
    .btn-accent {
      background: var(--accent-dim);
      border-color: rgba(217,119,87,0.3);
      color: var(--accent);
    }
    .btn-accent:hover {
      background: rgba(217,119,87,0.25);
      border-color: var(--accent);
    }
    .btn-emerald {
      background: rgba(74,222,128,0.08);
      border-color: rgba(74,222,128,0.2);
      color: var(--emerald);
    }
    .btn-emerald:hover {
      background: rgba(74,222,128,0.15);
    }
    .btn-red {
      background: rgba(248,113,113,0.08);
      border-color: rgba(248,113,113,0.2);
      color: var(--red);
    }
    .btn-red:hover {
      background: rgba(248,113,113,0.15);
    }

    /* ── Dimension Bar ─────────────────────────────────────── */
    .dim-bar-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .dim-bar-label {
      width: 160px;
      flex-shrink: 0;
      font-size: 12px;
      color: var(--text-secondary);
      text-align: right;
    }
    .dim-bar-track {
      flex: 1;
      height: 6px;
      background: rgba(255,255,255,0.06);
      border-radius: 3px;
      overflow: hidden;
    }
    .dim-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width var(--transition-slow);
    }
    .dim-bar-value {
      width: 36px;
      font-family: var(--font-mono);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      color: var(--text-secondary);
      text-align: right;
    }

    @media (max-width: 640px) {
      .dim-bar-label { width: 100px; font-size: 11px; }
    }

    /* ── Tab Bar ────────────────────────────────────────────── */
    .tab-bar {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 8px;
      overflow-x: auto;
    }
    .tab {
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      cursor: pointer;
      border: none;
      background: transparent;
      transition: all var(--transition-fast);
      white-space: nowrap;
      font-family: var(--font-body);
    }
    .tab:hover { color: var(--text-secondary); background: rgba(255,255,255,0.04); }
    .tab.active {
      color: var(--accent);
      background: var(--accent-dim);
    }

    /* ── Event Row ─────────────────────────────────────────── */
    .event-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-subtle);
      transition: background var(--transition-fast);
    }
    .event-row:last-child { border-bottom: none; }
    .event-row:hover { background: rgba(255,255,255,0.02); }
    .event-summary {
      flex: 1;
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .event-time {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-dim);
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ── Path Chip ─────────────────────────────────────────── */
    .path-scroll {
      display: flex;
      gap: 0;
      overflow-x: auto;
      padding: 12px 0;
      align-items: center;
    }
    .path-chip {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 14px;
      border-radius: var(--radius-md);
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-subtle);
      font-size: 12px;
      white-space: nowrap;
      flex-shrink: 0;
      transition: border-color var(--transition-fast);
    }
    .path-chip:hover { border-color: rgba(255,255,255,0.2); }
    .path-chip-name {
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 2px;
    }
    .path-chip-dur {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
    }
    .path-arrow {
      color: var(--text-dim);
      font-size: 14px;
      padding: 0 4px;
      flex-shrink: 0;
    }

    /* ── Change Card ───────────────────────────────────────── */
    .change-card {
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px;
      margin-bottom: 10px;
      transition: border-color var(--transition-fast);
    }
    .change-card:hover { border-color: rgba(255,255,255,0.15); }
    .change-card:last-child { margin-bottom: 0; }
    .change-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .change-summary {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .change-actions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    /* ── Packet Card ───────────────────────────────────────── */
    .packet-card {
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px;
    }
    .packet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .packet-name {
      font-weight: 500;
      font-size: 13px;
      color: var(--text-primary);
    }
    .staleness-track {
      height: 4px;
      background: rgba(255,255,255,0.06);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 8px;
    }
    .staleness-fill {
      height: 100%;
      border-radius: 2px;
      transition: width var(--transition-slow);
    }

    /* ── Action Row ────────────────────────────────────────── */
    .action-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-subtle);
    }
    .action-row:last-child { border-bottom: none; }
    .action-meta {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-shrink: 0;
    }
    .action-detail {
      flex: 1;
      min-width: 0;
    }
    .action-title {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 2px;
    }
    .action-states {
      display: flex;
      gap: 8px;
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--text-dim);
    }
    .action-states .arrow { color: var(--accent); margin: 0 2px; }

    /* ── Status Summary Bar ────────────────────────────────── */
    .status-bar {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .status-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--text-muted);
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .status-num {
      font-family: var(--font-mono);
      font-weight: 500;
    }

    /* ── Metric Grid ───────────────────────────────────────── */
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    @media (min-width: 640px) {
      .metric-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (min-width: 900px) {
      .metric-grid { grid-template-columns: repeat(4, 1fr); }
    }

    /* ── Empty State ───────────────────────────────────────── */
    .empty-state {
      text-align: center;
      padding: 32px 20px;
      color: var(--text-dim);
      font-size: 13px;
      line-height: 1.6;
    }
    .empty-state code {
      font-family: var(--font-mono);
      background: rgba(255,255,255,0.06);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      color: var(--text-muted);
    }

    /* ── Filter Dropdown ───────────────────────────────────── */
    .filter-select {
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 11px;
      font-family: var(--font-body);
      padding: 4px 8px;
      cursor: pointer;
      outline: none;
    }
    .filter-select:focus {
      border-color: var(--accent);
    }
    .filter-select option {
      background: #18181b;
      color: var(--text-primary);
    }

    /* ── Header ────────────────────────────────────────────── */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0 24px;
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-logo {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }
    .header-logo span { color: var(--accent); }
    .header-subtitle {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 400;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .local-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      background: var(--accent-dim);
      color: var(--accent);
      border: 1px solid rgba(217,119,87,0.3);
    }
    .refresh-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--emerald);
      box-shadow: 0 0 6px rgba(74,222,128,0.4);
      animation: pulse-dot 2s ease-in-out infinite;
    }
    .refresh-dot.paused {
      background: var(--amber);
      box-shadow: 0 0 6px rgba(251,191,36,0.4);
      animation: none;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .header-clock {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-dim);
      font-variant-numeric: tabular-nums;
    }

    /* ── Section Spacing ───────────────────────────────────── */
    .section {
      margin-bottom: 28px;
    }

    /* ── Footer ────────────────────────────────────────────── */
    .footer {
      text-align: center;
      padding: 32px 0 0;
      border-top: 1px solid var(--border-subtle);
      margin-top: 20px;
    }
    .footer-text {
      font-size: 11px;
      color: var(--text-dim);
      font-family: var(--font-mono);
    }
    .footer-text span { color: var(--accent); }

    /* ── Sparkline ─────────────────────────────────────────── */
    .sparkline-container {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }
    .score-big {
      font-family: var(--font-mono);
      font-size: 48px;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      line-height: 1;
      color: var(--text-primary);
    }
    .score-trend {
      font-size: 14px;
      font-family: var(--font-mono);
      margin-left: 6px;
    }
    .trend-up { color: var(--emerald); }
    .trend-down { color: var(--red); }
    .trend-flat { color: var(--text-dim); }

    /* ── Fade In Animation ─────────────────────────────────── */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .fade-in {
      animation: fadeInUp 0.4s ease both;
    }
    .fade-in-1 { animation-delay: 0.05s; }
    .fade-in-2 { animation-delay: 0.10s; }
    .fade-in-3 { animation-delay: 0.15s; }
    .fade-in-4 { animation-delay: 0.20s; }
    .fade-in-5 { animation-delay: 0.25s; }
    .fade-in-6 { animation-delay: 0.30s; }
    .fade-in-7 { animation-delay: 0.35s; }
    .fade-in-8 { animation-delay: 0.40s; }
    .fade-in-9 { animation-delay: 0.45s; }

    /* ── Reduced Motion ────────────────────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      .fade-in, .fade-in-1, .fade-in-2, .fade-in-3,
      .fade-in-4, .fade-in-5, .fade-in-6, .fade-in-7,
      .fade-in-8, .fade-in-9 {
        animation: none;
        opacity: 1;
        transform: none;
      }
      .refresh-dot { animation: none; }
    }

    /* ── Tooltip ────────────────────────────────────────────── */
    [data-tooltip] {
      position: relative;
    }
    [data-tooltip]:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      padding: 4px 8px;
      border-radius: 4px;
      background: #27272a;
      border: 1px solid rgba(255,255,255,0.12);
      color: var(--text-secondary);
      font-size: 11px;
      white-space: nowrap;
      z-index: 10;
      pointer-events: none;
    }

    /* ── Business Intelligence Styles ─────────────────────── */
    .biz-hero {
      display: flex;
      align-items: flex-start;
      gap: 20px;
      flex-wrap: wrap;
    }
    .biz-hero-main { flex: 1; min-width: 200px; }
    .biz-hero-name {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }
    .biz-hero-mission {
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 2px;
    }
    .biz-hero-wedge {
      font-size: 12px;
      color: var(--text-muted);
      font-style: italic;
    }
    .biz-hero-meta {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-end;
    }
    .confidence-bar-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .confidence-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--text-muted);
      font-weight: 600;
      white-space: nowrap;
    }
    .confidence-track {
      width: 100px;
      height: 6px;
      background: rgba(255,255,255,0.06);
      border-radius: 3px;
      overflow: hidden;
    }
    .confidence-fill {
      height: 100%;
      border-radius: 3px;
      background: var(--accent);
      transition: width var(--transition-slow);
    }
    .confidence-val {
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 500;
      color: var(--accent);
      min-width: 36px;
      text-align: right;
    }

    .biz-init-card {
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px;
      transition: border-color var(--transition-fast);
    }
    .biz-init-card:hover { border-color: rgba(255,255,255,0.15); }
    .biz-init-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      flex-wrap: wrap;
    }
    .biz-init-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      flex: 1;
      min-width: 120px;
    }
    .biz-init-summary {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .biz-init-meta {
      display: flex;
      gap: 8px;
      margin-top: 6px;
      align-items: center;
    }
    .biz-priority {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--accent);
      font-weight: 500;
    }

    .biz-intv-card {
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px;
      margin-bottom: 10px;
      transition: border-color var(--transition-fast);
    }
    .biz-intv-card:hover { border-color: rgba(255,255,255,0.15); }
    .biz-intv-card:last-child { margin-bottom: 0; }
    .biz-intv-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .biz-intv-rank {
      font-family: var(--font-mono);
      font-size: 18px;
      font-weight: 600;
      color: var(--accent);
      width: 28px;
      text-align: center;
      flex-shrink: 0;
    }
    .biz-intv-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      flex: 1;
    }
    .biz-intv-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 8px;
      line-height: 1.5;
      padding-left: 36px;
    }
    .biz-intv-meta {
      display: flex;
      gap: 12px;
      align-items: center;
      padding-left: 36px;
    }
    .biz-intv-confidence {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .biz-intv-impact {
      font-size: 11px;
      color: var(--text-dim);
      flex: 1;
    }

    .biz-comp-card {
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px;
      transition: border-color var(--transition-fast);
    }
    .biz-comp-card:hover { border-color: rgba(255,255,255,0.15); }
    .biz-comp-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }
    .biz-comp-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 8px;
      line-height: 1.4;
    }
    .biz-comp-row {
      display: flex;
      gap: 6px;
      align-items: flex-start;
      margin-bottom: 4px;
    }
    .biz-comp-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 700;
      flex-shrink: 0;
      width: 80px;
      padding-top: 1px;
    }
    .biz-comp-label-threat { color: var(--red); }
    .biz-comp-label-opp { color: var(--emerald); }
    .biz-comp-text {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .biz-contra-card {
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px;
      margin-bottom: 10px;
      transition: border-color var(--transition-fast);
    }
    .biz-contra-card:hover { border-color: rgba(255,255,255,0.15); }
    .biz-contra-card:last-child { margin-bottom: 0; }
    .biz-contra-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .biz-contra-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      flex: 1;
    }
    .biz-contra-desc {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
      margin-bottom: 6px;
    }
    .biz-contra-entities {
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--text-dim);
    }

    .biz-agent-card {
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px;
      transition: border-color var(--transition-fast);
    }
    .biz-agent-card:hover { border-color: rgba(255,255,255,0.15); }
    .biz-agent-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .biz-agent-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .biz-agent-dot-healthy { background: var(--emerald); box-shadow: 0 0 6px rgba(74,222,128,0.4); }
    .biz-agent-dot-waiting { background: var(--amber); box-shadow: 0 0 6px rgba(251,191,36,0.4); }
    .biz-agent-dot-drifting { background: var(--red); box-shadow: 0 0 6px rgba(248,113,113,0.4); }
    .biz-agent-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .biz-agent-type {
      font-size: 10px;
      font-family: var(--font-mono);
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .biz-agent-goal {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .biz-agent-heartbeat {
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--text-dim);
      margin-top: 6px;
    }

    .biz-decision-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-subtle);
    }
    .biz-decision-row:last-child { border-bottom: none; }
    .biz-decision-title {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 2px;
    }
    .biz-decision-rationale {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }
    @media (min-width: 768px) {
      .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
    }

    .section-divider {
      display: flex;
      align-items: center;
      gap: 16px;
      margin: 36px 0 24px;
      color: var(--text-dim);
    }
    .section-divider::before,
    .section-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border-subtle);
    }
    .section-divider-text {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.25em;
      color: var(--text-dim);
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="dashboard" id="app">
    <!-- 1. Header Bar -->
    <header class="header fade-in">
      <div class="header-left">
        <div class="header-logo">Node<span>Bench</span></div>
        <div class="header-subtitle">Operating Dashboard</div>
        <div class="local-badge">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="flex-shrink:0">
            <circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <circle cx="5" cy="5" r="1.5" fill="currentColor"/>
          </svg>
          Local
        </div>
      </div>
      <div class="header-right">
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="refresh-dot" id="refreshDot" data-tooltip="Auto-refreshing every 10s"></div>
          <span style="font-size:11px;color:var(--text-dim)">Auto-refresh</span>
        </div>
        <div class="header-clock" id="clock"></div>
      </div>
    </header>

    <!-- ═══ BUSINESS INTELLIGENCE ═══════════════════════════════ -->

    <!-- B1. Company Truth (Hero) -->
    <div class="section fade-in fade-in-1" id="section-biz-company">
      <div class="section-header">Company Truth</div>
      <div class="card card-hero" id="biz-company-card">
        <div class="biz-hero">
          <div class="biz-hero-main">
            <div class="biz-hero-name" id="biz-company-name">Loading...</div>
            <div class="biz-hero-mission" id="biz-company-mission"></div>
            <div class="biz-hero-wedge" id="biz-company-wedge"></div>
          </div>
          <div class="biz-hero-meta">
            <span class="badge badge-accent" id="biz-company-state">--</span>
            <div class="confidence-bar-wrap">
              <span class="confidence-label">Identity Confidence</span>
              <div class="confidence-track">
                <div class="confidence-fill" id="biz-confidence-fill" style="width:0%"></div>
              </div>
              <span class="confidence-val" id="biz-confidence-val">--</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- B2. Initiatives -->
    <div class="section fade-in fade-in-2" id="section-biz-initiatives">
      <div class="section-header">Initiatives <span class="count" id="biz-init-count"></span></div>
      <div class="grid-2" id="biz-init-grid">
        <div class="empty-state" style="grid-column:1/-1;">Loading initiatives...</div>
      </div>
    </div>

    <!-- B3. Ranked Interventions -->
    <div class="section fade-in fade-in-3" id="section-biz-interventions">
      <div class="section-header">Ranked Interventions <span class="count" id="biz-intv-count"></span></div>
      <div class="card" id="biz-intv-list">
        <div class="empty-state">Loading interventions...</div>
      </div>
    </div>

    <!-- B4 & B5: Two-column grid -->
    <div class="grid-2 fade-in fade-in-4">
      <!-- B4. Competitor Intelligence -->
      <div class="section" id="section-biz-competitors">
        <div class="section-header">Competitor Intelligence <span class="count" id="biz-comp-count"></span></div>
        <div id="biz-comp-list">
          <div class="empty-state">Loading competitors...</div>
        </div>
      </div>

      <!-- B5. Active Contradictions -->
      <div class="section" id="section-biz-contradictions">
        <div class="section-header">Active Contradictions <span class="count" id="biz-contra-count"></span></div>
        <div id="biz-contra-list">
          <div class="empty-state">Loading contradictions...</div>
        </div>
      </div>
    </div>

    <!-- B6. Agent Status -->
    <div class="section fade-in fade-in-5" id="section-biz-agents">
      <div class="section-header">Agent Status <span class="count" id="biz-agent-count"></span></div>
      <div class="grid-3" id="biz-agent-grid">
        <div class="empty-state" style="grid-column:1/-1;">Loading agents...</div>
      </div>
    </div>

    <!-- B7. Recent Decisions -->
    <div class="section fade-in fade-in-6" id="section-biz-decisions">
      <div class="section-header">Recent Decisions <span class="count" id="biz-dec-count"></span></div>
      <div class="card" id="biz-dec-list">
        <div class="empty-state">Loading decisions...</div>
      </div>
    </div>

    <!-- ═══ DIVIDER ═══════════════════════════════════════════════ -->
    <div class="section-divider">
      <span class="section-divider-text">System Intelligence</span>
    </div>

    <!-- 2. Session Delta (Hero Card) -->
    <div class="section fade-in fade-in-1" id="section-delta">
      <div class="section-header">Since Your Last Session</div>
      <div class="card card-hero">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
          <div style="font-size:15px;font-weight:500;color:var(--text-primary);" id="delta-ago">Loading...</div>
          <div class="badge badge-accent" id="delta-badge">syncing</div>
        </div>
        <div class="grid-4" id="delta-stats">
          <div class="mini-stat">
            <div class="mini-stat-label">Strategy</div>
            <div class="mini-stat-value" id="delta-strategy">--</div>
            <div class="mini-stat-delta" id="delta-strategy-d"></div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-label">Competitors</div>
            <div class="mini-stat-value" id="delta-competitors">--</div>
            <div class="mini-stat-delta" id="delta-competitors-d"></div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-label">Contradictions</div>
            <div class="mini-stat-value" id="delta-contradictions">--</div>
            <div class="mini-stat-delta" id="delta-contradictions-d"></div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-label">Attention</div>
            <div class="mini-stat-value" id="delta-attention">--</div>
            <div class="mini-stat-delta" id="delta-attention-d"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Trajectory Score -->
    <div class="section fade-in fade-in-2" id="section-trajectory">
      <div class="section-header">Trajectory Score</div>
      <div class="card">
        <div class="sparkline-container">
          <div>
            <div style="display:flex;align-items:baseline;gap:4px;">
              <div class="score-big" id="traj-score">--</div>
              <span class="score-trend" id="traj-trend"></span>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;" id="traj-subtitle">Composite score</div>
          </div>
          <div style="flex:1;min-width:120px;">
            <svg id="sparkline" width="100%" height="48" viewBox="0 0 300 48" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <path id="sparkArea" fill="url(#sparkGrad)" d=""/>
              <path id="sparkLine" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d=""/>
            </svg>
          </div>
        </div>
        <div id="dim-bars">
          <!-- Dimension bars populated by JS -->
        </div>
      </div>
    </div>

    <!-- 4. Event Ledger -->
    <div class="section fade-in fade-in-3" id="section-events">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div class="section-header" style="margin-bottom:0;">Event Ledger <span class="count" id="event-count"></span></div>
        <select class="filter-select" id="event-filter">
          <option value="all">All types</option>
          <option value="decision">Decision</option>
          <option value="insight">Insight</option>
          <option value="contradiction">Contradiction</option>
          <option value="milestone">Milestone</option>
          <option value="alert">Alert</option>
          <option value="observation">Observation</option>
        </select>
      </div>
      <div class="card" style="padding:12px 16px;">
        <div id="event-list">
          <div class="empty-state">
            Loading events...
          </div>
        </div>
      </div>
    </div>

    <!-- 5. Important Changes -->
    <div class="section fade-in fade-in-4" id="section-changes">
      <div class="section-header">Important Changes</div>
      <div class="card">
        <div class="status-bar" id="change-status-bar">
          <!-- Status counts populated by JS -->
        </div>
        <div id="change-list">
          <div class="empty-state">
            Loading changes...
          </div>
        </div>
      </div>
    </div>

    <!-- 6. Path Replay -->
    <div class="section fade-in fade-in-5" id="section-path">
      <div class="section-header">Session Path</div>
      <div class="card" style="padding:12px 16px;">
        <div class="path-scroll" id="path-replay">
          <div class="empty-state" style="width:100%;">
            Loading path...
          </div>
        </div>
      </div>
    </div>

    <!-- 7. Time Rollups -->
    <div class="section fade-in fade-in-6" id="section-rollups">
      <div class="section-header">Time Rollups</div>
      <div class="card">
        <div class="tab-bar" id="rollup-tabs">
          <button class="tab active" data-period="day">Day</button>
          <button class="tab" data-period="week">Week</button>
          <button class="tab" data-period="month">Month</button>
          <button class="tab" data-period="quarter">Quarter</button>
          <button class="tab" data-period="year">Year</button>
        </div>
        <div class="metric-grid" id="rollup-grid">
          <div class="empty-state" style="grid-column:1/-1;">Loading rollups...</div>
        </div>
      </div>
    </div>

    <!-- 8 & 9: Two-column grid on desktop -->
    <div class="grid-2 fade-in fade-in-7">
      <!-- 8. Packet Readiness -->
      <div class="section" id="section-packets">
        <div class="section-header">Packet Readiness</div>
        <div class="card">
          <div id="packet-list">
            <div class="empty-state">Loading packets...</div>
          </div>
        </div>
      </div>

      <!-- 9. Recent Actions -->
      <div class="section" id="section-actions">
        <div class="section-header">Recent Actions <span class="count" id="action-count"></span></div>
        <div class="card" style="padding:12px 16px;">
          <div id="action-list">
            <div class="empty-state">Loading actions...</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 10. Footer -->
    <footer class="footer fade-in fade-in-9">
      <div class="footer-text">
        <span>NodeBench</span> MCP v2.34.0 &middot; 325 tools &middot; 30 tables &middot; auto-refresh: 10s
      </div>
    </footer>
  </div>

<script>
(function() {
  'use strict';

  // ── Config ──────────────────────────────────────────────
  const REFRESH_INTERVAL = 10000;
  const API_BASE = '';
  const ENDPOINTS = {
    // Business Intelligence
    bizCompany:       '/api/business/company',
    bizInitiatives:   '/api/business/initiatives',
    bizInterventions: '/api/business/interventions',
    bizAgents:        '/api/business/agents',
    bizCompetitors:   '/api/business/competitors',
    bizContradictions:'/api/business/contradictions',
    bizDecisions:     '/api/business/decisions',
    // System Intelligence
    delta:    '/api/ambient/session-delta',
    trajectory: '/api/causal/trajectory',
    events:  '/api/causal/events',
    changes: '/api/causal/changes',
    path:    '/api/causal/path',
    rollups: '/api/causal/rollups',
    packets: '/api/ambient/packets',
    actions: '/api/tracking/actions',
  };

  // ── State ───────────────────────────────────────────────
  let _hashes = {};
  let _rollupPeriod = 'day';
  let _eventFilter = 'all';
  let _rollupData = null;

  // ── Utils ───────────────────────────────────────────────
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return h;
  }

  function timeAgo(ts) {
    if (!ts) return 'never';
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 0) return 'just now';
    const s = Math.floor(diff / 1000);
    if (s < 60) return s + 's ago';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24);
    return d + 'd ago';
  }

  function deltaStr(val) {
    if (val == null || val === 0) return '';
    const cls = val > 0 ? 'trend-up' : 'trend-down';
    const arrow = val > 0 ? '\\u2191' : '\\u2193';
    return '<span class="' + cls + '">' + arrow + Math.abs(val) + '</span>';
  }

  function barColor(val) {
    if (val >= 80) return 'var(--emerald)';
    if (val >= 60) return 'var(--accent)';
    if (val >= 40) return 'var(--amber)';
    return 'var(--red)';
  }

  function stalenessColor(pct) {
    if (pct <= 30) return 'var(--emerald)';
    if (pct <= 60) return 'var(--amber)';
    return 'var(--red)';
  }

  function actorBadge(actor) {
    const a = String(actor || 'S').charAt(0).toUpperCase();
    const labels = { F: 'Founder', A: 'Agent', S: 'System', B: 'Background' };
    return '<div class="actor-badge actor-' + a + '" data-tooltip="' + esc(labels[a] || actor) + '">' + a + '</div>';
  }

  function eventTypeBadge(type) {
    const colors = {
      decision: 'accent', insight: 'cyan', contradiction: 'amber',
      milestone: 'emerald', alert: 'red', observation: 'blue'
    };
    return '<span class="badge badge-' + (colors[type] || 'blue') + '">' + esc(type || 'event') + '</span>';
  }

  function impactBadge(level) {
    const colors = { critical: 'red', high: 'amber', medium: 'blue', low: 'violet' };
    return '<span class="badge badge-' + (colors[level] || 'blue') + '">' + esc(level || 'info') + '</span>';
  }

  function chipColor(surfaceType) {
    if (surfaceType === 'entity') return 'var(--cyan)';
    if (surfaceType === 'artifact') return 'var(--violet)';
    return 'var(--text-primary)';
  }

  // ── Sparkline SVG ───────────────────────────────────────
  function renderSparkline(data) {
    if (!data || data.length < 2) return;
    const svgW = 300, svgH = 48, pad = 2;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map(function(v, i) {
      const x = pad + (i / (data.length - 1)) * (svgW - 2 * pad);
      const y = pad + (1 - (v - min) / range) * (svgH - 2 * pad);
      return [x, y];
    });
    const lineD = points.map(function(p, i) { return (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    var areaD = lineD + ' L' + points[points.length-1][0].toFixed(1) + ',' + svgH + ' L' + points[0][0].toFixed(1) + ',' + svgH + ' Z';
    document.getElementById('sparkLine').setAttribute('d', lineD);
    document.getElementById('sparkArea').setAttribute('d', areaD);
  }

  // ── Fetcher ─────────────────────────────────────────────
  async function fetchData(endpoint) {
    try {
      const res = await fetch(API_BASE + endpoint, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  // ── Business Renderers ─────────────────────────────────

  function bizStatusBadge(status) {
    var colors = {
      active: 'emerald', completed: 'blue', in_progress: 'accent',
      blocked: 'red', paused: 'amber', suggested: 'cyan',
      accepted: 'emerald', rejected: 'red', deferred: 'amber',
      resolved: 'blue', healthy: 'emerald', waiting: 'amber', drifting: 'red'
    };
    return '<span class="badge badge-' + (colors[status] || 'blue') + '">' + esc(status || 'unknown') + '</span>';
  }

  function bizSeverityBadge(severity) {
    var colors = { high: 'red', medium: 'amber', low: 'blue' };
    return '<span class="badge badge-' + (colors[severity] || 'blue') + '">' + esc(severity || 'medium') + '</span>';
  }

  function bizRiskBadge(risk) {
    var colors = { high: 'red', medium: 'amber', low: 'emerald' };
    return '<span class="badge badge-' + (colors[risk] || 'blue') + '">' + esc(risk || 'medium') + ' risk</span>';
  }

  function renderBizCompany(data) {
    var c = data && data.company;
    if (!c) {
      document.getElementById('biz-company-name').textContent = 'No company data';
      return;
    }
    document.getElementById('biz-company-name').textContent = c.name || '--';
    document.getElementById('biz-company-mission').textContent = c.canonicalMission || '';
    document.getElementById('biz-company-wedge').textContent = c.wedge ? 'Wedge: ' + c.wedge : '';
    document.getElementById('biz-company-state').textContent = c.companyState || 'operating';
    var conf = Math.round((c.identityConfidence || 0) * 100);
    document.getElementById('biz-confidence-fill').style.width = conf + '%';
    document.getElementById('biz-confidence-val').textContent = conf + '%';
  }

  function renderBizInitiatives(data) {
    var container = document.getElementById('biz-init-grid');
    if (!data || !data.initiatives || data.initiatives.length === 0) {
      container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">No initiatives tracked yet.</div>';
      document.getElementById('biz-init-count').textContent = '';
      return;
    }
    document.getElementById('biz-init-count').textContent = '(' + data.initiatives.length + ')';
    var html = '';
    data.initiatives.forEach(function(init) {
      html += '<div class="biz-init-card">'
        + '<div class="biz-init-header">'
        + '<span class="biz-init-title">' + esc(init.title) + '</span>'
        + bizStatusBadge(init.status)
        + '</div>';
      if (init.latestSummary) {
        html += '<div class="biz-init-summary">' + esc(init.latestSummary) + '</div>';
      }
      html += '<div class="biz-init-meta">'
        + '<span class="biz-priority">P' + (init.priorityScore != null ? Number(init.priorityScore).toFixed(1) : '--') + '</span>'
        + bizRiskBadge(init.riskLevel)
        + '</div></div>';
    });
    container.innerHTML = html;
  }

  function renderBizInterventions(data) {
    var container = document.getElementById('biz-intv-list');
    if (!data || !data.interventions || data.interventions.length === 0) {
      container.innerHTML = '<div class="empty-state">No interventions suggested yet.</div>';
      document.getElementById('biz-intv-count').textContent = '';
      return;
    }
    document.getElementById('biz-intv-count').textContent = '(' + data.interventions.length + ')';
    var html = '';
    data.interventions.forEach(function(intv, idx) {
      var conf = Math.round((intv.confidence || 0) * 100);
      html += '<div class="biz-intv-card">'
        + '<div class="biz-intv-header">'
        + '<span class="biz-intv-rank">#' + (idx + 1) + '</span>'
        + '<span class="biz-intv-title">' + esc(intv.title) + '</span>'
        + bizStatusBadge(intv.status)
        + '</div>';
      if (intv.description) {
        html += '<div class="biz-intv-desc">' + esc(intv.description) + '</div>';
      }
      html += '<div class="biz-intv-meta">'
        + '<div class="biz-intv-confidence">'
        + '<span class="confidence-label">Confidence</span>'
        + '<div class="confidence-track" style="width:60px;">'
        + '<div class="confidence-fill" style="width:' + conf + '%;"></div></div>'
        + '<span style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);">' + conf + '%</span>'
        + '</div>'
        + '<span class="biz-priority">P' + (intv.priorityScore != null ? Number(intv.priorityScore).toFixed(1) : '--') + '</span>';
      if (intv.expectedImpact) {
        html += '<span class="biz-intv-impact">' + esc(intv.expectedImpact) + '</span>';
      }
      html += '</div></div>';
    });
    container.innerHTML = html;
  }

  function renderBizCompetitors(data) {
    var container = document.getElementById('biz-comp-list');
    if (!data || !data.competitors || data.competitors.length === 0) {
      container.innerHTML = '<div class="empty-state">No competitors tracked.</div>';
      document.getElementById('biz-comp-count').textContent = '';
      return;
    }
    document.getElementById('biz-comp-count').textContent = '(' + data.competitors.length + ')';
    var html = '';
    data.competitors.forEach(function(comp) {
      html += '<div class="biz-comp-card" style="margin-bottom:10px;">'
        + '<div class="biz-comp-name">' + esc(comp.name) + '</div>'
        + '<div class="biz-comp-desc">' + esc(comp.description) + '</div>'
        + '<div class="biz-comp-row">'
        + '<span class="biz-comp-label biz-comp-label-threat">Threat</span>'
        + '<span class="biz-comp-text">' + esc(comp.threat) + '</span>'
        + '</div>'
        + '<div class="biz-comp-row">'
        + '<span class="biz-comp-label biz-comp-label-opp">Opportunity</span>'
        + '<span class="biz-comp-text">' + esc(comp.opportunity) + '</span>'
        + '</div>'
        + '</div>';
    });
    container.innerHTML = html;
  }

  function renderBizContradictions(data) {
    var container = document.getElementById('biz-contra-list');
    if (!data || !data.contradictions || data.contradictions.length === 0) {
      container.innerHTML = '<div class="empty-state">No contradictions detected.</div>';
      document.getElementById('biz-contra-count').textContent = '';
      return;
    }
    document.getElementById('biz-contra-count').textContent = '(' + data.contradictions.length + ')';
    var html = '';
    data.contradictions.forEach(function(c) {
      var entities = '';
      try { entities = JSON.parse(c.affectedEntities || '[]').join(', '); } catch(e) { entities = c.affectedEntities || ''; }
      html += '<div class="biz-contra-card">'
        + '<div class="biz-contra-header">'
        + bizSeverityBadge(c.severity)
        + '<span class="biz-contra-title">' + esc(c.title) + '</span>'
        + bizStatusBadge(c.status)
        + '</div>'
        + '<div class="biz-contra-desc">' + esc(c.description) + '</div>';
      if (entities) {
        html += '<div class="biz-contra-entities">Affects: ' + esc(entities) + '</div>';
      }
      html += '</div>';
    });
    container.innerHTML = html;
  }

  function renderBizAgents(data) {
    var container = document.getElementById('biz-agent-grid');
    if (!data || !data.agents || data.agents.length === 0) {
      container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">No agents registered.</div>';
      document.getElementById('biz-agent-count').textContent = '';
      return;
    }
    document.getElementById('biz-agent-count').textContent = '(' + data.agents.length + ')';
    var html = '';
    data.agents.forEach(function(a) {
      var dotClass = 'biz-agent-dot-' + (a.status || 'waiting');
      html += '<div class="biz-agent-card">'
        + '<div class="biz-agent-header">'
        + '<div class="biz-agent-dot ' + dotClass + '"></div>'
        + '<span class="biz-agent-name">' + esc(a.name) + '</span>'
        + '</div>'
        + '<div class="biz-agent-type">' + esc(a.agentType || 'agent') + '</div>';
      if (a.currentGoal) {
        html += '<div class="biz-agent-goal">' + esc(a.currentGoal) + '</div>';
      }
      if (a.lastHeartbeatAt) {
        html += '<div class="biz-agent-heartbeat">Last heartbeat: ' + timeAgo(a.lastHeartbeatAt) + '</div>';
      }
      html += '</div>';
    });
    container.innerHTML = html;
  }

  function renderBizDecisions(data) {
    var container = document.getElementById('biz-dec-list');
    if (!data || !data.decisions || data.decisions.length === 0) {
      container.innerHTML = '<div class="empty-state">No decisions recorded.</div>';
      document.getElementById('biz-dec-count').textContent = '';
      return;
    }
    document.getElementById('biz-dec-count').textContent = '(' + data.decisions.length + ')';
    var html = '';
    data.decisions.forEach(function(d) {
      html += '<div class="biz-decision-row">'
        + '<div style="flex-shrink:0;">' + bizStatusBadge(d.status) + '</div>'
        + '<div style="flex:1;min-width:0;">'
        + '<div class="biz-decision-title">' + esc(d.title) + '</div>'
        + '<div class="biz-decision-rationale">' + esc(d.rationale || '') + '</div>'
        + '</div>'
        + '<div class="event-time">' + timeAgo(d.decidedAt) + '</div>'
        + '</div>';
    });
    container.innerHTML = html;
  }

  // ── System Renderers ──────────────────────────────────

  function renderDelta(data) {
    if (!data) {
      document.getElementById('delta-ago').textContent = 'No session data yet';
      document.getElementById('delta-badge').textContent = 'awaiting';
      return;
    }
    document.getElementById('delta-ago').textContent = data.lastSessionAgo || timeAgo(data.lastSessionAt);
    document.getElementById('delta-badge').textContent = data.status || 'synced';

    var fields = ['strategy','competitors','contradictions','attention'];
    fields.forEach(function(f) {
      var val = data[f];
      var el = document.getElementById('delta-' + f);
      var delEl = document.getElementById('delta-' + f + '-d');
      el.textContent = val != null ? val : '--';
      if (delEl) delEl.innerHTML = deltaStr(data[f + 'Delta']);
    });
  }

  function renderTrajectory(data) {
    if (!data) {
      document.getElementById('traj-score').textContent = '--';
      document.getElementById('traj-trend').innerHTML = '';
      document.getElementById('dim-bars').innerHTML = '<div class="empty-state">No trajectory data yet.<br>Run <code>record_event</code> to start tracking.</div>';
      return;
    }

    var score = data.score != null ? data.score : data.composite;
    document.getElementById('traj-score').textContent = score != null ? Math.round(score) : '--';

    if (data.trend != null) {
      var cls = data.trend > 0 ? 'trend-up' : data.trend < 0 ? 'trend-down' : 'trend-flat';
      var arrow = data.trend > 0 ? '\\u2191' : data.trend < 0 ? '\\u2193' : '\\u2192';
      document.getElementById('traj-trend').innerHTML = '<span class="' + cls + '">' + arrow + ' ' + Math.abs(data.trend).toFixed(1) + '</span>';
    }

    if (data.sparkline) renderSparkline(data.sparkline);

    var dims = data.dimensions || {};
    var dimNames = [
      ['identityClarity', 'Identity Clarity'],
      ['executionVelocity', 'Execution Velocity'],
      ['agentAlignment', 'Agent Alignment'],
      ['signalStrength', 'Signal Strength'],
      ['interventionEffectiveness', 'Intervention Effect.'],
      ['contradictionLoad', 'Contradiction Load'],
      ['confidenceTrend', 'Confidence Trend']
    ];
    var html = '';
    dimNames.forEach(function(pair) {
      var key = pair[0], label = pair[1];
      var val = dims[key] != null ? Math.round(dims[key]) : 0;
      html += '<div class="dim-bar-row">'
        + '<div class="dim-bar-label">' + esc(label) + '</div>'
        + '<div class="dim-bar-track"><div class="dim-bar-fill" style="width:' + val + '%;background:' + barColor(val) + ';"></div></div>'
        + '<div class="dim-bar-value">' + val + '</div>'
        + '</div>';
    });
    document.getElementById('dim-bars').innerHTML = html;
  }

  function renderEvents(data) {
    var container = document.getElementById('event-list');
    if (!data || !data.events || data.events.length === 0) {
      container.innerHTML = '<div class="empty-state">No events recorded yet.<br>Run <code>record_event</code> or <code>record_founder_event</code> to start populating.</div>';
      document.getElementById('event-count').textContent = '';
      return;
    }

    var events = data.events;
    if (_eventFilter !== 'all') {
      events = events.filter(function(e) { return e.type === _eventFilter; });
    }
    document.getElementById('event-count').textContent = '(' + events.length + ')';

    if (events.length === 0) {
      container.innerHTML = '<div class="empty-state">No ' + esc(_eventFilter) + ' events found.</div>';
      return;
    }

    var html = '';
    events.slice(0, 20).forEach(function(evt) {
      html += '<div class="event-row">'
        + actorBadge(evt.actor)
        + eventTypeBadge(evt.type)
        + '<div class="event-summary">' + esc(evt.summary || evt.description || '') + '</div>'
        + '<div class="event-time">' + timeAgo(evt.timestamp || evt.createdAt) + '</div>'
        + '</div>';
    });
    container.innerHTML = html;
  }

  function renderChanges(data) {
    var statusBar = document.getElementById('change-status-bar');
    var container = document.getElementById('change-list');

    if (!data || !data.changes || data.changes.length === 0) {
      statusBar.innerHTML = '';
      container.innerHTML = '<div class="empty-state">No important changes detected.<br>Run <code>track_action</code> or <code>record_change</code> to start tracking.</div>';
      return;
    }

    // Status summary
    var counts = data.statusCounts || {};
    var statuses = [
      { key: 'detected', color: 'var(--blue)', label: 'Detected' },
      { key: 'acknowledged', color: 'var(--cyan)', label: 'Acknowledged' },
      { key: 'investigating', color: 'var(--amber)', label: 'Investigating' },
      { key: 'resolved', color: 'var(--emerald)', label: 'Resolved' },
      { key: 'dismissed', color: 'var(--text-dim)', label: 'Dismissed' }
    ];
    var sbHtml = '';
    statuses.forEach(function(s) {
      var n = counts[s.key] || 0;
      if (n > 0 || s.key === 'detected') {
        sbHtml += '<div class="status-item">'
          + '<div class="status-dot" style="background:' + s.color + ';"></div>'
          + '<span class="status-num stat">' + n + '</span> ' + s.label
          + '</div>';
      }
    });
    statusBar.innerHTML = sbHtml;

    // Change cards
    var html = '';
    data.changes.slice(0, 10).forEach(function(ch) {
      html += '<div class="change-card">'
        + '<div class="change-header">'
        + impactBadge(ch.impact || ch.priority)
        + '<span style="font-size:13px;font-weight:500;color:var(--text-primary);">' + esc(ch.title || ch.category || 'Change') + '</span>'
        + '</div>'
        + '<div class="change-summary">' + esc(ch.summary || ch.description || '') + '</div>';
      if (ch.suggestedAction) {
        html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">'
          + '<span style="color:var(--accent);font-weight:600;">Suggested:</span> ' + esc(ch.suggestedAction)
          + '</div>';
      }
      html += '<div class="change-actions">'
        + '<button class="btn btn-emerald" onclick="postChangeAction(\\'' + esc(ch.id) + '\\',\\'resolve\\')">Resolve</button>'
        + '<button class="btn btn-accent" onclick="postChangeAction(\\'' + esc(ch.id) + '\\',\\'investigate\\')">Investigate</button>'
        + '<button class="btn btn-red" onclick="postChangeAction(\\'' + esc(ch.id) + '\\',\\'dismiss\\')">Dismiss</button>'
        + '</div></div>';
    });
    container.innerHTML = html;
  }

  function renderPath(data) {
    var container = document.getElementById('path-replay');
    if (!data || !data.steps || data.steps.length === 0) {
      container.innerHTML = '<div class="empty-state" style="width:100%;">No session path recorded.<br>Navigate surfaces to build a path trace.</div>';
      return;
    }

    var html = '';
    data.steps.forEach(function(step, i) {
      if (i > 0) {
        html += '<div class="path-arrow">\\u2192</div>';
      }
      var color = chipColor(step.surfaceType || step.type);
      html += '<div class="path-chip" style="border-color:' + color.replace(')', ',0.25)').replace('var(--text-primary)', 'var(--border-subtle)') + ';">'
        + '<div class="path-chip-name" style="color:' + color + ';">' + esc(step.name || step.surface || 'view') + '</div>'
        + '<div class="path-chip-dur">' + (step.durationMs ? (step.durationMs / 1000).toFixed(1) + 's' : '--') + '</div>'
        + '</div>';
    });
    container.innerHTML = html;
  }

  function renderRollups(data) {
    _rollupData = data;
    var container = document.getElementById('rollup-grid');

    if (!data || !data.periods) {
      container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">No rollup data yet.<br>Rollups accumulate as events are recorded over time.</div>';
      return;
    }

    var periodData = data.periods[_rollupPeriod];
    if (!periodData || !periodData.metrics) {
      container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">No data for this period.</div>';
      return;
    }

    var html = '';
    var metrics = periodData.metrics;
    Object.keys(metrics).forEach(function(key) {
      var m = metrics[key];
      var val = m.value != null ? m.value : m;
      var delta = m.delta;
      var label = key.replace(/([A-Z])/g, ' $1').replace(/^./, function(c) { return c.toUpperCase(); });
      html += '<div class="mini-stat">'
        + '<div class="mini-stat-label">' + esc(label) + '</div>'
        + '<div class="mini-stat-value">' + (typeof val === 'number' ? Math.round(val) : esc(val)) + '</div>'
        + '<div class="mini-stat-delta">' + deltaStr(delta) + '</div>'
        + '</div>';
    });
    container.innerHTML = html;
  }

  function renderPackets(data) {
    var container = document.getElementById('packet-list');
    if (!data || !data.packets || data.packets.length === 0) {
      container.innerHTML = '<div class="empty-state">No packet data yet.<br>Packets represent pre-built artifact bundles like Decision Memos and Agent Briefs.</div>';
      return;
    }

    var html = '';
    data.packets.forEach(function(pkt) {
      var staleness = pkt.staleness != null ? Math.min(100, Math.max(0, pkt.staleness)) : 0;
      html += '<div class="packet-card">'
        + '<div class="packet-header">'
        + '<div class="packet-name">' + esc(pkt.type || pkt.name) + '</div>'
        + '<span class="badge badge-' + (staleness > 60 ? 'red' : staleness > 30 ? 'amber' : 'emerald') + '">'
        + staleness + '% stale</span>'
        + '</div>';
      if (pkt.changeCount != null) {
        html += '<div style="font-size:12px;color:var(--text-muted);">' + pkt.changeCount + ' change' + (pkt.changeCount !== 1 ? 's' : '') + ' since last gen</div>';
      }
      if (pkt.reason) {
        html += '<div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Reason: ' + esc(pkt.reason) + '</div>';
      }
      html += '<div class="staleness-track">'
        + '<div class="staleness-fill" style="width:' + staleness + '%;background:' + stalenessColor(staleness) + ';"></div>'
        + '</div></div>';
      html += '<div style="height:8px;"></div>';
    });
    container.innerHTML = html;
  }

  function renderActions(data) {
    var container = document.getElementById('action-list');
    if (!data || !data.actions || data.actions.length === 0) {
      container.innerHTML = '<div class="empty-state">No tracked actions yet.<br>Run <code>track_action</code> to record founder decisions and changes.</div>';
      document.getElementById('action-count').textContent = '';
      return;
    }

    document.getElementById('action-count').textContent = '(' + data.actions.length + ')';
    var html = '';
    data.actions.slice(0, 10).forEach(function(act) {
      html += '<div class="action-row">'
        + '<div class="action-meta">'
        + impactBadge(act.impact || act.category || 'info')
        + '</div>'
        + '<div class="action-detail">'
        + '<div class="action-title">' + esc(act.title || act.action || act.description || '') + '</div>'
        + '<div class="action-states">';
      if (act.before) {
        html += '<span>' + esc(act.before) + '</span><span class="arrow">\\u2192</span><span>' + esc(act.after || '...') + '</span>';
      }
      html += '</div></div>'
        + '<div class="event-time">' + timeAgo(act.timestamp || act.createdAt) + '</div>'
        + '</div>';
    });
    container.innerHTML = html;
  }

  // ── Change Action Handler ───────────────────────────────
  window.postChangeAction = async function(id, action) {
    try {
      await fetch(API_BASE + '/api/causal/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, action: action })
      });
      refreshAll();
    } catch (e) {
      // silent
    }
  };

  // ── Clock ───────────────────────────────────────────────
  function updateClock() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    var s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('clock').textContent = h + ':' + m + ':' + s;
  }

  // ── Hash-Diffed Refresh ─────────────────────────────────
  async function refreshSection(key, endpoint, renderer) {
    var data = await fetchData(endpoint);
    var dataStr = JSON.stringify(data);
    var hash = simpleHash(dataStr);
    if (_hashes[key] !== hash) {
      _hashes[key] = hash;
      renderer(data);
    }
  }

  async function refreshAll() {
    var dot = document.getElementById('refreshDot');
    dot.classList.remove('paused');

    await Promise.allSettled([
      // Business Intelligence
      refreshSection('bizCompany', ENDPOINTS.bizCompany, renderBizCompany),
      refreshSection('bizInitiatives', ENDPOINTS.bizInitiatives, renderBizInitiatives),
      refreshSection('bizInterventions', ENDPOINTS.bizInterventions, renderBizInterventions),
      refreshSection('bizCompetitors', ENDPOINTS.bizCompetitors, renderBizCompetitors),
      refreshSection('bizContradictions', ENDPOINTS.bizContradictions, renderBizContradictions),
      refreshSection('bizAgents', ENDPOINTS.bizAgents, renderBizAgents),
      refreshSection('bizDecisions', ENDPOINTS.bizDecisions, renderBizDecisions),
      // System Intelligence
      refreshSection('delta', ENDPOINTS.delta, renderDelta),
      refreshSection('trajectory', ENDPOINTS.trajectory, renderTrajectory),
      refreshSection('events', ENDPOINTS.events, renderEvents),
      refreshSection('changes', ENDPOINTS.changes, renderChanges),
      refreshSection('path', ENDPOINTS.path, renderPath),
      refreshSection('rollups', ENDPOINTS.rollups, renderRollups),
      refreshSection('packets', ENDPOINTS.packets, renderPackets),
      refreshSection('actions', ENDPOINTS.actions, renderActions),
    ]);
  }

  // ── Event Listeners ─────────────────────────────────────
  document.getElementById('event-filter').addEventListener('change', function(e) {
    _eventFilter = e.target.value;
    _hashes['events'] = null; // force re-render
    refreshSection('events', ENDPOINTS.events, renderEvents);
  });

  document.getElementById('rollup-tabs').addEventListener('click', function(e) {
    if (e.target.classList.contains('tab')) {
      document.querySelectorAll('#rollup-tabs .tab').forEach(function(t) { t.classList.remove('active'); });
      e.target.classList.add('active');
      _rollupPeriod = e.target.dataset.period;
      if (_rollupData) renderRollups(_rollupData);
    }
  });

  // ── Init ────────────────────────────────────────────────
  updateClock();
  setInterval(updateClock, 1000);
  refreshAll();
  setInterval(refreshAll, REFRESH_INTERVAL);
})();
</script>
</body>
</html>`;
}
