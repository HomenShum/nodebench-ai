// LayoutExplorer — design canvas with all three ReportDetail layout variants
// shown side-by-side in scaled boards, plus a toolbar to focus any one.

function LayoutExplorer({ onBack }) {
  const [focus, setFocus] = React.useState('all');
  const I = window.NBIcon;

  const boards = [
    { id: 'three-pane', n: 1, label: 'Three-pane · outline + notebook + inspector' },
    { id: 'two-pane',   n: 2, label: 'Two-pane · notebook + collapsible inspector' },
    { id: 'notion',     n: 3, label: 'Notion-style · single column + floating drawer' },
  ];

  const visible = focus === 'all' ? boards : boards.filter(b => b.id === focus);

  return (
    <div className="nb-le">
      <div className="nb-le-toolbar">
        <button data-active={focus === 'all'} onClick={() => setFocus('all')}>All three</button>
        {boards.map(b => (
          <button key={b.id} data-active={focus === b.id} onClick={() => setFocus(b.id)}>
            {b.id.replace('-', ' ')}
          </button>
        ))}
      </div>
      <div className="nb-le-stage">
        {visible.map(b => (
          <div key={b.id} className="nb-le-board" style={{ width: focus === 'all' ? 1100 : '100%', maxWidth: focus === 'all' ? 1100 : 1600 }}>
            <div className="nb-le-board-label">
              <span className="num">{b.n}</span>
              {b.label}
            </div>
            <window.NBReportDetail layout={b.id} embedded onBack={onBack}/>
          </div>
        ))}
      </div>
    </div>
  );
}

window.NBLayoutExplorer = LayoutExplorer;
