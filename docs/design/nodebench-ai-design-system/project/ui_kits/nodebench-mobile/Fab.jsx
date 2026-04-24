// Floating action button — "start a new run". Sits above the tab bar.
function Fab({ onClick }) {
  return (
    <button className="m-fab" onClick={onClick} aria-label="Start a new run">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </button>
  );
}

window.NBFab = Fab;
