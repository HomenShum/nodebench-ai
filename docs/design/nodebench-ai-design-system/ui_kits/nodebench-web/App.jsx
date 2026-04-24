// App shell — router for five surfaces + tweaks panel.
// Tweaks control the "feel-axis" tokens (pace, density, texture) + the reasoning
// trace toggle + inbox notification rings + the reports default view. Changing any
// of these in the Tweaks panel or in Me → Pace keeps a single source of truth.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "pace": "conversational",
  "density": 1,
  "texture": "off",
  "showTrace": true,
  "reportsView": "grid",
  "notifyAct": true,
  "notifyAuto": true,
  "notifyWatch": true,
  "notifyFyi": false,
  "digest": "daily"
}/*EDITMODE-END*/;

function App() {
  const [theme, setTheme] = React.useState(document.documentElement.getAttribute('data-theme') || 'light');
  const [surface, setSurface] = React.useState('home');
  const [thread, setThread] = React.useState(null);
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  // Theme sync
  React.useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  // Feel-axis tokens pushed straight to <body>
  React.useEffect(() => {
    document.body.setAttribute('data-pace', tweaks.pace);
    document.body.setAttribute('data-texture', tweaks.texture);
    document.body.style.setProperty('--feel-density', tweaks.density);
  }, [tweaks.pace, tweaks.texture, tweaks.density]);

  function handleStart(query, lane) { setThread({ query, lane }); setSurface('chat'); }
  function handleSave() { setSurface('reports'); }

  const T = window.NBIcon;

  return (
    <>
      <window.NBTopNav
        surface={surface}
        onSurface={setSurface}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
      />
      <div className="nb-shell">
        {surface === 'home' && (
          <>
            <window.NBComposer onSubmit={handleStart} />
            <window.NBDailyPulse onOpen={handleStart} />
          </>
        )}

        {surface === 'chat' && thread && (
          <window.NBAnswerPacket
            query={thread.query}
            pace={tweaks.pace}
            showTrace={tweaks.showTrace}
            onSave={handleSave}
            onFollowup={(q) => setThread({ ...thread, query: q })}
          />
        )}
        {surface === 'chat' && !thread && (
          <div className="nb-panel" style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>
            Start a run from the home tab to see an answer packet.
            <div style={{ marginTop: 12 }}>
              <button className="nb-btn nb-btn-primary" onClick={() => setSurface('home')}>Go home</button>
            </div>
          </div>
        )}

        {surface === 'reports' && <window.NBReportsSurface tweaks={tweaks} />}
        {surface === 'nudges'  && <window.NBNudgeList />}
        {surface === 'me'      && <window.NBMePage tweaks={tweaks} setTweak={setTweak} />}
      </div>

      {/* ═══════════════ Tweaks panel (floating) ═══════════════ */}
      <window.TweaksPanel title="NodeBench Tweaks">
        <window.TweakSection label="Feel">
          <window.TweakRadio
            label="Pace"
            value={tweaks.pace}
            options={[
              { value: 'instant',        label: 'Instant' },
              { value: 'conversational', label: 'Conversational' },
              { value: 'deliberate',     label: 'Deliberate' },
            ]}
            onChange={(v) => setTweak('pace', v)}
          />
          <window.TweakSlider
            label="Density" value={tweaks.density}
            min={0.8} max={1.25} step={0.05} unit="×"
            onChange={(v) => setTweak('density', v)}
          />
          <window.TweakRadio
            label="Texture"
            value={tweaks.texture}
            options={[
              { value: 'off', label: 'Clean' },
              { value: 'on',  label: 'Paper' },
            ]}
            onChange={(v) => setTweak('texture', v)}
          />
        </window.TweakSection>

        <window.TweakSection label="Chat">
          <window.TweakToggle
            label="Show reasoning trace"
            value={tweaks.showTrace}
            onChange={(v) => setTweak('showTrace', v)}
          />
        </window.TweakSection>

        <window.TweakSection label="Reports">
          <window.TweakRadio
            label="Default view"
            value={tweaks.reportsView}
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'list', label: 'List' },
            ]}
            onChange={(v) => setTweak('reportsView', v)}
          />
        </window.TweakSection>

        <window.TweakSection label="Inbox rings">
          <window.TweakToggle label="Act-now"   value={tweaks.notifyAct}   onChange={(v) => setTweak('notifyAct',   v)} />
          <window.TweakToggle label="Auto"      value={tweaks.notifyAuto}  onChange={(v) => setTweak('notifyAuto',  v)} />
          <window.TweakToggle label="Watching"  value={tweaks.notifyWatch} onChange={(v) => setTweak('notifyWatch', v)} />
          <window.TweakToggle label="FYI"       value={tweaks.notifyFyi}   onChange={(v) => setTweak('notifyFyi',   v)} />
        </window.TweakSection>
      </window.TweaksPanel>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
