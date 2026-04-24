// Mobile icons — 16px / 18px / 20px inline SVG set, stroke-only, matches workspace.
// Usage: <Icon name="search" size={18} />
function MIcon({ name, size = 18, stroke = 1.7, color = "currentColor", style }) {
  const s = { width: size, height: size, ...(style || {}) };
  const p = {
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "search":
      return (<svg viewBox="0 0 24 24" style={s}><circle cx="11" cy="11" r="7" {...p}/><path d="M20 20l-3.5-3.5" {...p}/></svg>);
    case "back":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M15 18l-6-6 6-6" {...p}/></svg>);
    case "chevron":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M9 6l6 6-6 6" {...p}/></svg>);
    case "plus":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M12 5v14M5 12h14" {...p}/></svg>);
    case "send":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M4 12l16-8-6 16-3-7-7-1z" {...p}/></svg>);
    case "home":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" {...p}/></svg>);
    case "chat":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 0 1-4.2-.9L3 21l1.6-4.4A7.9 7.9 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" {...p}/></svg>);
    case "brief":
      return (<svg viewBox="0 0 24 24" style={s}><rect x="5" y="3" width="14" height="18" rx="2" {...p}/><path d="M9 7h6M9 11h6M9 15h4" {...p}/></svg>);
    case "sources":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M4 4h10l6 6v10a0 0 0 0 1 0 0H4z" {...p}/><path d="M14 4v6h6" {...p}/><path d="M8 14h8M8 17h8" {...p}/></svg>);
    case "notebook":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z" {...p}/><path d="M6 3v18M9 7h7M9 11h7M9 15h5" {...p}/></svg>);
    case "bell":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" {...p}/><path d="M10 21a2 2 0 0 0 4 0" {...p}/></svg>);
    case "filter":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M4 5h16M7 12h10M10 19h4" {...p}/></svg>);
    case "share":
      return (<svg viewBox="0 0 24 24" style={s}><circle cx="6" cy="12" r="2.5" {...p}/><circle cx="18" cy="6" r="2.5" {...p}/><circle cx="18" cy="18" r="2.5" {...p}/><path d="M8 11l8-4M8 13l8 4" {...p}/></svg>);
    case "save":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" {...p}/></svg>);
    case "more":
      return (<svg viewBox="0 0 24 24" style={s}><circle cx="5" cy="12" r="1.4" fill={color} stroke="none"/><circle cx="12" cy="12" r="1.4" fill={color} stroke="none"/><circle cx="19" cy="12" r="1.4" fill={color} stroke="none"/></svg>);
    case "signal":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M4 12l4-7 3 10 3-13 3 17 3-5" {...p}/></svg>);
    case "cite":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M7 7h4v4H7zM7 11l-1 4M13 7h4v4h-4zM13 11l-1 4" {...p}/></svg>);
    case "thread":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M4 6h16M4 12h10M4 18h16" {...p}/></svg>);
    case "ok":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M5 12l4 4 10-10" {...p}/></svg>);
    case "warn":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M12 4L2 20h20z" {...p}/><path d="M12 10v5M12 17.8v.2" {...p}/></svg>);
    case "refresh":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M4 4v6h6M20 20v-6h-6" {...p}/><path d="M4 10a8 8 0 0 1 14-3M20 14a8 8 0 0 1-14 3" {...p}/></svg>);
    case "sparkle":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" {...p}/></svg>);
    case "entity":
      return (<svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="8" r="3" {...p}/><path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" {...p}/></svg>);
    case "clock":
      return (<svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9" {...p}/><path d="M12 7v5l3 2" {...p}/></svg>);
    case "doc":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7z" {...p}/><path d="M14 3v5h5" {...p}/></svg>);
    case "trend-up":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M3 17l6-6 4 4 8-8" {...p}/><path d="M14 7h7v7" {...p}/></svg>);
    case "trend-down":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M3 7l6 6 4-4 8 8" {...p}/><path d="M14 17h7v-7" {...p}/></svg>);
    default:
      return (<svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="8" {...p}/></svg>);
  }
}

window.MIcon = MIcon;
