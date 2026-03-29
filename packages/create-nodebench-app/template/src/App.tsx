import { useState } from "react";
import { EntitySearch } from "./components/EntitySearch";
import { QaDashboard } from "./components/QaDashboard";
import { DecisionMemo } from "./components/DecisionMemo";
import "./styles.css";

type Screen = "search" | "qa" | "memo";

export function App() {
  const [screen, setScreen] = useState<Screen>("search");

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-brand">
          <span className="nav-logo">NB</span>
          <span className="nav-title">NodeBench</span>
        </div>
        <div className="nav-tabs">
          <button
            className={`nav-tab ${screen === "search" ? "active" : ""}`}
            onClick={() => setScreen("search")}
          >
            Entity Search
          </button>
          <button
            className={`nav-tab ${screen === "qa" ? "active" : ""}`}
            onClick={() => setScreen("qa")}
          >
            QA Dashboard
          </button>
          <button
            className={`nav-tab ${screen === "memo" ? "active" : ""}`}
            onClick={() => setScreen("memo")}
          >
            Decision Memo
          </button>
        </div>
      </nav>

      <main className="main">
        {screen === "search" && <EntitySearch />}
        {screen === "qa" && <QaDashboard />}
        {screen === "memo" && <DecisionMemo />}
      </main>

      <footer className="footer">
        <span>
          Powered by{" "}
          <a href="https://github.com/HomenShum/nodebench-ai" target="_blank" rel="noopener">
            NodeBench MCP
          </a>{" "}
          — 350 tools, progressive discovery, memory that compounds
        </span>
      </footer>
    </div>
  );
}
