// App shell — router for five surfaces, threads state between Home and Chat.
function App() {
  const [theme, setTheme] = React.useState(document.documentElement.getAttribute('data-theme') || 'light');
  const [surface, setSurface] = React.useState('home');
  const [thread, setThread] = React.useState(null); // { query, lane } | null

  React.useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  function handleStart(query, lane) {
    setThread({ query, lane });
    setSurface('chat');
  }

  function handleSave() {
    setSurface('reports');
  }

  return (
    <>
      <window.NBTopNav
        surface={surface}
        onSurface={setSurface}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
      />
      <div className="nb-shell">
        {surface === 'home' && <window.NBComposer onSubmit={handleStart} />}
        {surface === 'chat' && thread && (
          <window.NBAnswerPacket query={thread.query} onSave={handleSave} onFollowup={(q) => setThread({ ...thread, query: q })} />
        )}
        {surface === 'chat' && !thread && (
          <div className="nb-panel" style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>
            Start a run from the home tab to see an answer packet.
            <div style={{ marginTop: 12 }}>
              <button className="nb-btn nb-btn-primary" onClick={() => setSurface('home')}>Go home</button>
            </div>
          </div>
        )}
        {surface === 'reports' && <window.NBReportsSurface />}
        {surface === 'nudges' && <window.NBNudgeList />}
        {surface === 'me' && <window.NBEntityNotebook />}
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
