// Map surface — entity relationship graph
// Renders the entities + their relations from WS_DATA as a circular "constellation"
// with the current root entity at center. Edges labeled by relation type.
// Click any node to re-center the map on it; shift-click to select (for the side panel).
// Kept pure SVG with a static layout so nothing physics-y can go wrong.

function MapSurface({ tweaks, tab, setTab,
                     rootEntity, setRootEntity,
                     selectedCard, setSelectedCard }) {
  const data = window.WS_DATA;

  const entity = {
    name: 'DISCO',
    initials: 'DI',
    meta: 'relationship map · live',
    style: { background: 'linear-gradient(135deg, #1A365D, #0F4C81)' },
  };

  const tabs = [
    { id: 'chat',     label: 'Chat',     icon: 'chat' },
    { id: 'brief',    label: 'Brief',    icon: 'brief' },
    { id: 'cards',    label: 'Cards',    icon: 'cards',    count: 14 },
    { id: 'notebook', label: 'Notebook', icon: 'notebook' },
    { id: 'sources',  label: 'Sources',  icon: 'sources',  count: 24 },
    { id: 'map',      label: 'Map',      icon: 'map' },
  ];

  // ── Relation classification (direction + label) derived from what we know ──
  // For every (from → to) pair, pick a human-readable label + type.
  // This lives here rather than in data.js because it's a map-only concern.
  const RELATION_LABELS = {
    'disco|greylock':      { lbl: 'series C lead',     kind: 'investor' },
    'disco|kiwi-camara':   { lbl: 'CEO',               kind: 'person' },
    'disco|everlaw':       { lbl: 'competitor',        kind: 'compete' },
    'disco|legal-tech':    { lbl: 'sector',            kind: 'sector' },
    'disco|eu-ai-act':     { lbl: 'regulated by',      kind: 'reg' },
    'disco|relativity':    { lbl: 'competitor',        kind: 'compete' },
    'everlaw|relativity':  { lbl: 'competitor',        kind: 'compete' },
    'everlaw|opus2':       { lbl: 'peer',              kind: 'peer' },
    'everlaw|sarah-grayson':{ lbl: 'investor',         kind: 'investor' },
    'greylock|sarah-grayson':{ lbl: 'GP',              kind: 'person' },
    'greylock|kiwi-camara':{ lbl: 'backs founder',     kind: 'investor' },
    'sarah-grayson|disco': { lbl: 'board',             kind: 'person' },
  };
  const labelFor = (a, b) => {
    const k = a + '|' + b;
    if (RELATION_LABELS[k]) return RELATION_LABELS[k];
    const rev = b + '|' + a;
    if (RELATION_LABELS[rev]) return RELATION_LABELS[rev];
    // fallback — infer from kinds
    const ea = data.entities[a], eb = data.entities[b];
    if (!ea || !eb) return { lbl: 'related', kind: 'peer' };
    const ks = [ea.kind, eb.kind].sort().join('+');
    if (ks.includes('regulation')) return { lbl: 'regulated by', kind: 'reg' };
    if (ks.includes('investor'))   return { lbl: 'invests in',   kind: 'investor' };
    if (ks.includes('market'))     return { lbl: 'operates in',  kind: 'sector' };
    if (ks.includes('person'))     return { lbl: 'affiliated',   kind: 'person' };
    return { lbl: 'related', kind: 'peer' };
  };

  // ── Layout: root at center, related entities on a ring, plus a 2nd ring
  // of their-relations (so the user sees 2 degrees out). ──
  const rootId = rootEntity || 'disco';
  const rootE = data.entities[rootId] || data.entities.disco;
  const neighborIds = (data.relations[rootId] || []).filter(id => data.entities[id]);

  // Second-degree nodes (excluding root + first ring)
  const secondRingSet = new Set();
  neighborIds.forEach(nid => {
    (data.relations[nid] || []).forEach(sid => {
      if (sid !== rootId && !neighborIds.includes(sid) && data.entities[sid]) {
        secondRingSet.add(sid);
      }
    });
  });
  const secondRing = Array.from(secondRingSet).slice(0, 6);

  // Canvas size
  const W = 900, H = 620;
  const CX = W / 2, CY = H / 2;
  const R1 = 200; // first-ring radius
  const R2 = 285; // second-ring radius

  // Position nodes
  const nodes = [];
  nodes.push({ id: rootId, x: CX, y: CY, ring: 0, e: rootE });

  const N1 = neighborIds.length;
  neighborIds.forEach((id, i) => {
    const angle = (i / Math.max(N1, 1)) * Math.PI * 2 - Math.PI / 2;
    nodes.push({
      id, ring: 1, e: data.entities[id],
      x: CX + Math.cos(angle) * R1,
      y: CY + Math.sin(angle) * R1,
    });
  });

  const N2 = secondRing.length;
  secondRing.forEach((id, i) => {
    const angle = (i / Math.max(N2, 1)) * Math.PI * 2 + Math.PI / N2;
    nodes.push({
      id, ring: 2, e: data.entities[id],
      x: CX + Math.cos(angle) * R2,
      y: CY + Math.sin(angle) * R2,
    });
  });

  const posOf = (id) => nodes.find(n => n.id === id);

  // Build edges: root↔ring1, and ring1↔ring2 where they exist in relations
  const edges = [];
  neighborIds.forEach(nid => {
    const nn = posOf(nid);
    if (nn) edges.push({ from: rootId, to: nid, label: labelFor(rootId, nid), primary: true });
    // ring1 → ring2
    (data.relations[nid] || []).forEach(sid => {
      if (secondRing.includes(sid)) {
        const pa = posOf(nid), pb = posOf(sid);
        if (pa && pb) edges.push({ from: nid, to: sid, label: labelFor(nid, sid), primary: false });
      }
    });
  });

  // ── Hover + selection state ──
  const [hoverId, setHoverId] = React.useState(null);
  const [kindFilter, setKindFilter] = React.useState('all');
  const selectedId = selectedCard?.id && nodes.find(n => n.id === selectedCard.id) ? selectedCard.id : rootId;
  const selected = data.entities[selectedId] || rootE;

  const selectNode = (id) => {
    if (!data.entities[id]) return;
    setSelectedCard?.({ id, name: data.entities[id].name, kind: data.entities[id].kind });
  };
  const recenter = (id) => {
    if (!data.entities[id]) return;
    setRootEntity?.(id);
    setSelectedCard?.({ id, name: data.entities[id].name, kind: data.entities[id].kind });
  };

  // Kind filter
  const kindVisible = (k) => kindFilter === 'all' || k === kindFilter;

  const nodeColor = (kind) => {
    switch (kind) {
      case 'company':    return '#0F4C81';
      case 'investor':   return '#7A50B8';
      case 'market':     return '#C77826';
      case 'regulation': return '#0E7A5C';
      case 'person':     return '#475569';
      default:           return '#64748B';
    }
  };

  const edgeColor = (kind) => {
    switch (kind) {
      case 'investor': return '#A88AD4';
      case 'compete':  return '#D97757';
      case 'reg':      return '#22B085';
      case 'person':   return '#94A3B8';
      case 'sector':   return '#E09149';
      default:         return '#B8B2A5';
    }
  };

  const KINDS = [
    { k: 'all',        label: 'All',        color: '#64748B' },
    { k: 'company',    label: 'Companies',  color: '#0F4C81' },
    { k: 'investor',   label: 'Investors',  color: '#7A50B8' },
    { k: 'person',     label: 'People',     color: '#475569' },
    { k: 'market',     label: 'Markets',    color: '#C77826' },
    { k: 'regulation', label: 'Regulation', color: '#0E7A5C' },
  ];

  return (
    <window.WorkspaceShell
      tabs={tabs} active={tab} onTabChange={setTab}
      entity={entity}
    >
      <div className="map-layout">
        {/* Canvas */}
        <div className="map-canvas">
          <div className="map-toolbar">
            <div className="map-toolbar-l">
              <span className="kicker">Showing</span>
              <div className="map-kind-filter">
                {KINDS.map(k => (
                  <button key={k.k}
                          className="map-kind-btn"
                          data-active={kindFilter === k.k}
                          onClick={() => setKindFilter(k.k)}>
                    <span className="map-kind-dot" style={{ background: k.color }}/>
                    {k.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="map-toolbar-r">
              <span className="pill pill-mono pill-neutral">{nodes.length} nodes</span>
              <span className="pill pill-mono pill-neutral">{edges.length} edges</span>
              <button className="map-recenter" onClick={() => recenter('disco')} title="Recenter on DISCO">
                <window.Icon name="target" size={12}/> Recenter
              </button>
            </div>
          </div>

          <div className="map-svg-wrap">
            <svg viewBox={`0 0 ${W} ${H}`} className="map-svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="map-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(217,119,87,0.14)"/>
                  <stop offset="100%" stopColor="rgba(217,119,87,0)"/>
                </radialGradient>
                <pattern id="map-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M24 0 L0 0 0 24" fill="none" stroke="rgba(15,23,42,0.04)" strokeWidth="1"/>
                </pattern>
              </defs>

              {/* Background grid + root glow */}
              <rect width={W} height={H} fill="url(#map-grid)"/>
              <circle cx={CX} cy={CY} r={R1 + 40} fill="url(#map-glow)"/>

              {/* Ring guides */}
              <circle cx={CX} cy={CY} r={R1} fill="none"
                      stroke="rgba(15,23,42,0.06)" strokeDasharray="2 5" strokeWidth="1"/>
              <circle cx={CX} cy={CY} r={R2} fill="none"
                      stroke="rgba(15,23,42,0.05)" strokeDasharray="2 5" strokeWidth="1"/>

              {/* Edges */}
              {edges.map((e, i) => {
                const a = posOf(e.from), b = posOf(e.to);
                if (!a || !b) return null;
                const dim = !kindVisible(a.e.kind) || !kindVisible(b.e.kind);
                const highlight = hoverId && (hoverId === e.from || hoverId === e.to);
                const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
                const c = edgeColor(e.label.kind);
                return (
                  <g key={i} opacity={dim ? 0.15 : highlight ? 1 : 0.75}>
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                          stroke={c}
                          strokeWidth={highlight ? 2.2 : e.primary ? 1.6 : 1.1}
                          strokeLinecap="round"
                          strokeDasharray={e.primary ? '' : '3 4'}/>
                    {e.primary && (
                      <g transform={`translate(${mx}, ${my})`}>
                        <rect x={-34} y={-8} width={68} height={16} rx={8}
                              fill="#FAF8F5" stroke={c} strokeWidth="1"/>
                        <text x={0} y={3} textAnchor="middle"
                              fontSize="10" fontWeight="600"
                              fontFamily="'JetBrains Mono', monospace"
                              fill={c}>
                          {e.label.lbl}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map(n => {
                const isRoot = n.ring === 0;
                const isSelected = n.id === selectedId && !isRoot;
                const isHover = n.id === hoverId;
                const dim = !kindVisible(n.e.kind);
                const r = isRoot ? 42 : n.ring === 1 ? 30 : 22;
                const color = nodeColor(n.e.kind);

                return (
                  <g key={n.id}
                     transform={`translate(${n.x}, ${n.y})`}
                     style={{ cursor: 'pointer', opacity: dim ? 0.22 : 1, transition: 'opacity 200ms' }}
                     onMouseEnter={() => setHoverId(n.id)}
                     onMouseLeave={() => setHoverId(null)}
                     onClick={(ev) => ev.shiftKey ? selectNode(n.id) : recenter(n.id)}>

                    {/* Halo on hover / selected / root */}
                    {(isHover || isSelected || isRoot) && (
                      <circle r={r + 8} fill="none"
                              stroke={isRoot ? '#D97757' : color}
                              strokeWidth={isRoot ? 2.4 : 1.6}
                              strokeOpacity={0.35}/>
                    )}

                    <circle r={r} fill={color}/>
                    <circle r={r} fill="none"
                            stroke="rgba(255,255,255,0.9)" strokeWidth="1.5"/>

                    {/* Avatar / initials */}
                    <text y={4} textAnchor="middle"
                          fontSize={isRoot ? 16 : n.ring === 1 ? 12 : 10}
                          fontWeight="700"
                          fontFamily="'JetBrains Mono', monospace"
                          fill="#FFFAF0">
                      {n.e.avatar}
                    </text>

                    {/* Label below */}
                    <g transform={`translate(0, ${r + 18})`}>
                      <text textAnchor="middle"
                            fontSize={isRoot ? 13 : 11.5}
                            fontWeight={isRoot ? 700 : 600}
                            fontFamily="Inter, sans-serif"
                            fill="#1B1F24">
                        {n.e.name}
                      </text>
                      <text y={14} textAnchor="middle"
                            fontSize={9.5}
                            fontFamily="'JetBrains Mono', monospace"
                            fill="#6B7280"
                            letterSpacing="0.05em">
                        {n.e.kicker?.toUpperCase()}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="map-help">
            <span><kbd>Click</kbd> recenter</span>
            <span><kbd>Shift</kbd>+<kbd>Click</kbd> inspect</span>
            <span>Dashed edges = 2nd-degree relation</span>
          </div>
        </div>

        {/* Side panel */}
        <aside className="map-panel">
          <div className="map-panel-head">
            <div className="map-panel-avatar" style={{ background: selected.avatarBg }}>
              {selected.avatar}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="map-panel-name">{selected.name}</div>
              <div className="map-panel-sub">{selected.subtitle}</div>
            </div>
            <span className="pill pill-neutral" style={{ fontSize: 10 }}>
              {selected.kicker}
            </span>
          </div>

          {selected.metrics && (
            <div className="map-panel-metrics">
              {selected.metrics.map((m, i) => (
                <div key={i} className="map-panel-metric">
                  <span className="map-panel-metric-l">{m.label}</span>
                  <span className="map-panel-metric-v" data-trend={m.trend}>{m.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="map-panel-section">
            <div className="kicker">Connected to</div>
            <div className="map-panel-list">
              {(data.relations[selectedId] || []).map(rid => {
                const re = data.entities[rid];
                if (!re) return null;
                const rel = labelFor(selectedId, rid);
                return (
                  <button key={rid} className="map-panel-row"
                          onClick={() => recenter(rid)}
                          onMouseEnter={() => setHoverId(rid)}
                          onMouseLeave={() => setHoverId(null)}>
                    <span className="map-panel-row-avatar" style={{ background: re.avatarBg }}>{re.avatar}</span>
                    <span className="map-panel-row-mid">
                      <span className="map-panel-row-name">{re.name}</span>
                      <span className="map-panel-row-rel" style={{ color: edgeColor(rel.kind) }}>
                        {rel.lbl}
                      </span>
                    </span>
                    <window.Icon name="chevron" size={12}/>
                  </button>
                );
              })}
              {(data.relations[selectedId] || []).length === 0 && (
                <div className="map-panel-empty">No connections recorded yet.</div>
              )}
            </div>
          </div>

          <div className="map-panel-actions">
            <button className="map-panel-act primary" onClick={() => setTab('cards')}>
              <window.Icon name="cards" size={12}/> Open in Cards
            </button>
            <button className="map-panel-act" onClick={() => setTab('brief')}>
              <window.Icon name="brief" size={12}/> Read Brief
            </button>
            <button className="map-panel-act" onClick={() => setTab('sources')}>
              <window.Icon name="sources" size={12}/> Sources
            </button>
          </div>
        </aside>
      </div>
    </window.WorkspaceShell>
  );
}

window.MapSurface = MapSurface;
