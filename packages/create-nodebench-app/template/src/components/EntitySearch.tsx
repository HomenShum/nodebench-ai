import { useState } from "react";

interface EntityResult {
  name: string;
  type: string;
  summary: string;
  signals: string[];
  sources: string[];
}

// Demo data — replace with real NodeBench MCP calls in production
const DEMO_RESULTS: Record<string, EntityResult> = {
  anthropic: {
    name: "Anthropic",
    type: "AI Company",
    summary: "AI safety company building Claude. Series C at $2B valuation. 800+ employees. Key product: Claude API + Claude Code.",
    signals: [
      "Claude Code reached 40.8% adoption among AI coding agents",
      "MCP protocol donated to Linux Foundation's Agentic AI Foundation",
      "Claude 4.6 Opus launched with 1M context window",
      "$2.5B annual run-rate by early 2026",
    ],
    sources: ["crunchbase.com", "techcrunch.com", "anthropic.com"],
  },
  openai: {
    name: "OpenAI",
    type: "AI Company",
    summary: "Creator of GPT series and ChatGPT. Largest AI company by valuation. Key product: GPT-4, Codex, DALL-E.",
    signals: [
      "Adopted MCP protocol for ChatGPT integrations",
      "Codex launched as autonomous coding agent",
      "Enterprise API revenue exceeding $5B ARR",
    ],
    sources: ["openai.com", "techcrunch.com"],
  },
};

export function EntitySearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<EntityResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    setLoading(true);
    // Simulate MCP call — in production, this calls NodeBench's entity enrichment tools
    setTimeout(() => {
      const key = query.toLowerCase().trim();
      setResult(
        DEMO_RESULTS[key] ?? {
          name: query,
          type: "Unknown",
          summary: `No cached data for "${query}". Connect NodeBench MCP for live entity research.`,
          signals: ["Use discover_tools('entity research') in Claude Code to find enrichment tools"],
          sources: [],
        }
      );
      setLoading(false);
    }, 800);
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">Entity Intelligence</div>
        <div className="input-group">
          <input
            className="input"
            placeholder="Search a company, person, or topic..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button className="btn" onClick={handleSearch} disabled={loading}>
            {loading ? "Searching..." : "Investigate"}
          </button>
        </div>

        {!result && !loading && (
          <div className="empty">
            <div className="empty-icon">&#128269;</div>
            <div className="empty-title">Search for any entity</div>
            <p>Type a company name to get signals, sources, and intelligence.</p>
            <div className="empty-hint">Try: "Anthropic" or "OpenAI"</div>
          </div>
        )}

        {loading && (
          <div className="loading">
            <div className="spinner" />
            <span>Investigating {query}...</span>
          </div>
        )}
      </div>

      {result && !loading && (
        <>
          <div className="card">
            <div className="card-header">Entity Profile</div>
            <div className="result-title">{result.name}</div>
            <div className="result-meta">
              <span className="badge badge-info">{result.type}</span>
            </div>
            <div className="result-body">{result.summary}</div>
          </div>

          <div className="card">
            <div className="card-header">Signals ({result.signals.length})</div>
            {result.signals.map((signal, i) => (
              <div className="result-item" key={i}>
                <div className="result-body">{signal}</div>
              </div>
            ))}
          </div>

          {result.sources.length > 0 && (
            <div className="card">
              <div className="card-header">Sources</div>
              <div className="result-meta">
                {result.sources.join(" | ")}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
