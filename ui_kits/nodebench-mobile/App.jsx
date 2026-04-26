// App shell: one mobile phone = one surface state machine.
// Tab order matches web exactly: Home · Chat · Reports · Inbox · Me.
// Each phone independently switches between tabs.
function Phone({ initialTab = "home" }) {
  const {
    IOSDevice, MobileHome, MobileChat, MobileBrief, MobileSources, MobileNotebook,
    MobileInbox, MobileMe, MobileTabBar, Fab
  } = window;

  const [tab, setTab] = React.useState(initialTab);
  const [threadId, setThreadId] = React.useState(null);
  // Which "section" of Reports the user is in. Reports = Brief (default) → Sources → Notebook
  // expressed as nested tabs, but for the mobile kit we keep it simple: the primary tab IS "reports"
  // and Reports surface itself is MobileBrief. Sources and Notebook are reachable from inside Reports
  // via its action row (shown in the Brief surface).
  const [reportsSub, setReportsSub] = React.useState("brief");

  const onNavigate = (t, payload) => {
    // Special route: "reports/sources" and "reports/notebook" let Inbox & Brief jump directly.
    if (t === "sources")  { setTab("reports"); setReportsSub("sources");  return; }
    if (t === "notebook") { setTab("reports"); setReportsSub("notebook"); return; }
    if (t === "brief")    { setTab("reports"); setReportsSub("brief");    return; }
    setTab(t);
    if (t === "chat" && payload?.thread) setThreadId(payload.thread);
    if (t === "reports") setReportsSub(payload?.sub || "brief");
  };

  const renderReports = () => {
    switch (reportsSub) {
      case "sources":  return <MobileSources  onNavigate={onNavigate}/>;
      case "notebook": return <MobileNotebook onNavigate={onNavigate}/>;
      default:         return <MobileBrief    onNavigate={onNavigate} onSubChange={setReportsSub} sub={reportsSub}/>;
    }
  };

  const surface = (() => {
    switch (tab) {
      case "home":    return <MobileHome  onNavigate={onNavigate}/>;
      case "chat":    return <MobileChat  onNavigate={onNavigate} initialThreadId={threadId}/>;
      case "reports": return renderReports();
      case "inbox":   return <MobileInbox onNavigate={onNavigate}/>;
      case "me":      return <MobileMe    onNavigate={onNavigate}/>;
      default: return null;
    }
  })();

  const showFab = tab === "home" || tab === "chat";

  return (
    <IOSDevice>
      <div style={{position:"relative", width:"100%", height:"100%", display:"grid", gridTemplateRows:"1fr auto"}}>
        <div style={{minHeight:0, position:"relative", overflow:"hidden"}}>
          {surface}
          {showFab && <Fab onClick={() => setTab("chat")}/>}
        </div>
        <MobileTabBar active={tab} onChange={setTab}/>
      </div>
    </IOSDevice>
  );
}

function App() {
  // Four phones showing the breadth of the mobile surface along the tab order:
  // Home (discovery) · Chat (answer) · Reports (brief + sub-sections) · Inbox (attention) · Me (profile).
  // Three fit well side-by-side in a frame.
  const phones = [
    { initial: "home",    label: "Home",    kicker: "Discover" },
    { initial: "chat",    label: "Chat",    kicker: "Ask & read" },
    { initial: "reports", label: "Reports", kicker: "Read the brief" },
    { initial: "inbox",   label: "Inbox",   kicker: "Attention" },
    { initial: "me",      label: "Me",      kicker: "Profile & workspaces" },
  ];

  return (
    <>
      <div className="m-stage-title">
        <h1>NodeBench Mobile UI Kit</h1>
        <p>
          Five primary surfaces matching the web app: <b>Home · Chat · Reports · Inbox · Me</b>.
          Tap any tab on a phone to switch — each phone is independent.
          Reports contains Brief (default), with Sources and Notebook as sub-sections reachable from its action row.
        </p>
      </div>
      <div className="m-stage">
        {phones.map((p, i) => (
          <div key={i} className="m-frame-wrap">
            <Phone initialTab={p.initial}/>
            <div className="m-frame-kicker">{p.kicker}</div>
            <div className="m-frame-label">{p.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
