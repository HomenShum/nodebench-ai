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
  "detailLayout": "three-pane",
  "chatWidth": "wide",
  "reportWidth": "wide",
  "pulseLayout": "card-grid",
  "numberScale": "big",
  "notifyAct": true,
  "notifyAuto": true,
  "notifyWatch": true,
  "notifyFyi": false,
  "digest": "daily"
}/*EDITMODE-END*/;

function App() {
  const [theme, setTheme] = React.useState(document.documentElement.getAttribute('data-theme') || 'light');
  const [surface, setSurface] = React.useState('chat');
  const [thread, setThread] = React.useState(null);
  const [openReport, setOpenReport] = React.useState(null);
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  // Theme sync
  React.useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  // Feel-axis tokens pushed straight to <body>
  React.useEffect(() => {
    document.body.setAttribute('data-pace', tweaks.pace);
    document.body.setAttribute('data-texture', tweaks.texture);
    document.body.setAttribute('data-chat-width',   tweaks.chatWidth   || 'wide');
    document.body.setAttribute('data-report-width', tweaks.reportWidth || 'wide');
    document.body.style.setProperty('--feel-density', tweaks.density);
  }, [tweaks.pace, tweaks.texture, tweaks.density, tweaks.chatWidth, tweaks.reportWidth]);

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
          <window.NBHomePulse
            onSubmit={handleStart}
            onOpenReport={(id) => { setOpenReport(id); setSurface('reports'); }}
            pulseLayout={tweaks.pulseLayout}
            numberScale={tweaks.numberScale}
          />
        )}

        {surface === 'chat' && (
          <window.NBChatStream
            pace={tweaks.pace}
            showTrace={tweaks.showTrace}
            width={tweaks.chatWidth || 'wide'}
            onSetWidth={(v) => setTweak('chatWidth', v)}
            onOpenReport={() => { setOpenReport('orbital'); setSurface('reports'); }}
          />
        )}

        {surface === 'reports' && !openReport && (
          <window.NBReportsSurface
            tweaks={tweaks}
            onOpenReport={(id) => setOpenReport(id)}
            onLayoutExplorer={() => setSurface('layouts')}
            onWorkspaceMemory={() => setSurface('memory')}
            onProposedChanges={() => setSurface('changes')}
          />
        )}
        {surface === 'reports' && openReport && (
          <window.NBReportDetail
            layout={tweaks.detailLayout || 'three-pane'}
            width={tweaks.reportWidth || 'wide'}
            onSetWidth={(v) => setTweak('reportWidth', v)}
            onBack={() => setOpenReport(null)}
          />
        )}
        {surface === 'layouts' && <window.NBLayoutExplorer onBack={() => setSurface('reports')} />}
        {surface === 'memory'  && <window.NBWorkspaceMemory />}
        {surface === 'changes' && <window.NBProposedChanges />}
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

        <window.TweakSection label="Home">
          <window.TweakRadio
            label="Pulse layout"
            value={tweaks.pulseLayout}
            options={[
              { value: 'card-grid', label: 'Cards' },
              { value: 'headline',  label: 'Headline' },
              { value: 'ticker',    label: 'Ticker' },
            ]}
            onChange={(v) => setTweak('pulseLayout', v)}
          />
          <window.TweakRadio
            label="Numbers"
            value={tweaks.numberScale}
            options={[
              { value: 'big',       label: 'Big' },
              { value: 'editorial', label: 'Editorial' },
              { value: 'quiet',     label: 'Quiet' },
            ]}
            onChange={(v) => setTweak('numberScale', v)}
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
          <window.TweakSelect
            label="Detail layout"
            value={tweaks.detailLayout}
            options={[
              { value: 'three-pane', label: 'Three-pane (outline + notebook + inspector)' },
              { value: 'two-pane',   label: 'Two-pane (notebook + inspector)' },
              { value: 'notion',     label: 'Notion-style (single column + drawer)' },
            ]}
            onChange={(v) => setTweak('detailLayout', v)}
          />
          <window.TweakRadio
            label="Detail width"
            value={tweaks.reportWidth}
            options={[
              { value: 'narrow', label: 'Narrow' },
              { value: 'wide',   label: 'Wide' },
            ]}
            onChange={(v) => setTweak('reportWidth', v)}
          />
        </window.TweakSection>

        <window.TweakSection label="Chat">
          <window.TweakToggle
            label="Show reasoning trace"
            value={tweaks.showTrace}
            onChange={(v) => setTweak('showTrace', v)}
          />
          <window.TweakRadio
            label="Reading width"
            value={tweaks.chatWidth}
            options={[
              { value: 'narrow', label: 'Narrow' },
              { value: 'wide',   label: 'Wide' },
            ]}
            onChange={(v) => setTweak('chatWidth', v)}
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
