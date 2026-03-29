import { useState } from "react";

interface QaFinding {
  severity: "error" | "warning" | "info";
  message: string;
  page?: string;
}

interface CrawlResult {
  url: string;
  pages: number;
  elements: number;
  findings: QaFinding[];
  crawledAt: string;
}

export function QaDashboard() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCrawl = () => {
    if (!url.trim()) return;
    setLoading(true);
    // Simulate site_map MCP call — in production, this calls NodeBench's site_map tool
    setTimeout(() => {
      setResult({
        url: url,
        pages: 6,
        elements: 42,
        findings: [
          { severity: "error", message: `HTTP 404: ${url}/api/health`, page: "/api/health" },
          { severity: "warning", message: "No interactive elements on /pricing", page: "/pricing" },
          { severity: "warning", message: "Console error: 'Uncaught TypeError' on /dashboard", page: "/dashboard" },
          { severity: "info", message: "Single-page app detected — install NodeBench locally for deeper SPA crawling" },
        ],
        crawledAt: new Date().toISOString(),
      });
      setLoading(false);
    }, 1200);
  };

  const errorCount = result?.findings.filter((f) => f.severity === "error").length ?? 0;
  const warnCount = result?.findings.filter((f) => f.severity === "warning").length ?? 0;
  const infoCount = result?.findings.filter((f) => f.severity === "info").length ?? 0;

  return (
    <div>
      <div className="card">
        <div className="card-header">QA Dashboard</div>
        <div className="input-group">
          <input
            className="input"
            placeholder="Enter URL to crawl (e.g., https://yoursite.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCrawl()}
          />
          <button className="btn" onClick={handleCrawl} disabled={loading}>
            {loading ? "Crawling..." : "Crawl Site"}
          </button>
        </div>

        {!result && !loading && (
          <div className="empty">
            <div className="empty-icon">&#128270;</div>
            <div className="empty-title">Crawl any URL for QA findings</div>
            <p>Enter a URL to crawl all pages, check for errors, and get fix suggestions.</p>
            <div className="empty-hint">site_map({"{"} url: 'https://...' {"}"})</div>
          </div>
        )}

        {loading && (
          <div className="loading">
            <div className="spinner" />
            <span>Crawling {url}...</span>
          </div>
        )}
      </div>

      {result && !loading && (
        <>
          <div className="card">
            <div className="card-header">Crawl Summary</div>
            <div style={{ display: "flex", gap: 24 }}>
              <div>
                <div className="result-meta">Pages</div>
                <div className="result-title">{result.pages}</div>
              </div>
              <div>
                <div className="result-meta">Elements</div>
                <div className="result-title">{result.elements}</div>
              </div>
              <div>
                <div className="result-meta">Errors</div>
                <div className="result-title" style={{ color: errorCount > 0 ? "#ef4444" : "#22c55e" }}>
                  {errorCount}
                </div>
              </div>
              <div>
                <div className="result-meta">Warnings</div>
                <div className="result-title" style={{ color: warnCount > 0 ? "#eab308" : "#22c55e" }}>
                  {warnCount}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              Findings ({result.findings.length})
            </div>
            {result.findings.map((finding, i) => (
              <div className="result-item" key={i}>
                <span className={`badge badge-${finding.severity}`}>
                  {finding.severity}
                </span>
                {finding.page && (
                  <span className="result-meta" style={{ marginLeft: 8 }}>
                    {finding.page}
                  </span>
                )}
                <div className="result-body">{finding.message}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">Next Steps</div>
            <div className="result-item">
              <div className="result-body">
                <code>diff_crawl({"{"} url: '{result.url}', baseline_id: '...' {"}"})</code>
                <br />
                Compare before/after to verify fixes
              </div>
            </div>
            <div className="result-item">
              <div className="result-body">
                <code>suggest_tests({"{"} session_id: '...' {"}"})</code>
                <br />
                Generate scenario-based test cases from findings
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
