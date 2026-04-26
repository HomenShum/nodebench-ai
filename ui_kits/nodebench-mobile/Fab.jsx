// FAB — floating action button shown on Home + Chat.
function Fab({ onClick, label = "New question" }) {
  const { MIcon } = window;
  return (
    <button className="m-fab" onClick={onClick} aria-label={label}>
      <MIcon name="plus" size={20} color="#fff" stroke={2.4}/>
    </button>
  );
}
window.Fab = Fab;
