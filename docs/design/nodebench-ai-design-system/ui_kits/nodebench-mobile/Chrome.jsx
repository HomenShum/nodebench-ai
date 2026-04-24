// Thin chrome wrappers shared by mobile surfaces.

function MTop({ title, sub, leading, trailing }) {
  const { MIcon } = window;
  return (
    <header className="m-top">
      {leading || <button className="m-icon-btn" aria-label="Back"><MIcon name="back" size={16}/></button>}
      <div style={{flex:1, minWidth:0}}>
        <div className="m-title">{title}</div>
        {sub ? <div className="m-top-sub">{sub}</div> : null}
      </div>
      {trailing || null}
    </header>
  );
}

function MBody({ children, style }) {
  return <div className="m-body" style={style}>{children}</div>;
}

// Entity chip inline in serif body copy.
function MChip({ name, type = "company", initials }) {
  return (
    <span className="m-chip" data-type={type}>
      <span className="m-chip-avatar">{initials || name.slice(0,2).toUpperCase()}</span>
      {name}
    </span>
  );
}

// Inline citation marker.
function MCite({ n, onClick }) {
  return <span className="cite" onClick={onClick} title={`Source ${n}`}>{n}</span>;
}

window.MTop = MTop;
window.MBody = MBody;
window.MChip = MChip;
window.MCite = MCite;
