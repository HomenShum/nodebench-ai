/**
 * ReportsHome — All saved reports.
 *
 * Card grid with search, filters, pinned/recent.
 * Each card links to the full report detail.
 */

import { memo, useState } from "react";
import { Search, Pin, Clock, Building2, User, Briefcase, FileText } from "lucide-react";

// Placeholder report data (will be replaced with real data from Reports API)
const DEMO_REPORTS = [
  { id: "1", title: "Anthropic", type: "Company", summary: "82% confidence, 8/23 cited, 2 contradictions", updatedAt: "5m ago", pinned: true },
  { id: "2", title: "Stripe, Inc.", type: "Company", summary: "83% confidence, $19.4B revenue, 11 contradictions", updatedAt: "1h ago", pinned: false },
  { id: "3", title: "Figma, Inc.", type: "Company", summary: "83% confidence, $303.9M Q4 revenue, 10 contradictions", updatedAt: "2h ago", pinned: false },
  { id: "4", title: "Databricks", type: "Company", summary: "95% confidence, 6 sources, data lakehouse AI", updatedAt: "3h ago", pinned: true },
  { id: "5", title: "Ramp", type: "Company", summary: "68% confidence, corporate card fintech, DCF $3.2B", updatedAt: "4h ago", pinned: false },
];

const FILTERS = ["All", "Companies", "People", "Jobs", "Markets", "Notes", "Recent", "Pinned"];

function ReportCard({ report }: { report: typeof DEMO_REPORTS[0] }) {
  return (
    <button
      type="button"
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all hover:border-white/[0.12] hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-content-muted" />
            <span className="text-sm font-medium text-content truncate">{report.title}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-content-muted">{report.type}</span>
            <span className="text-[10px] text-content-muted/50">{report.updatedAt}</span>
          </div>
          <p className="mt-2 text-xs text-content-muted line-clamp-2">{report.summary}</p>
        </div>
        {report.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-[#d97757]" />}
      </div>
    </button>
  );
}

export const ReportsHome = memo(function ReportsHome() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = DEMO_REPORTS.filter((r) => {
    if (activeFilter === "Pinned") return r.pinned;
    if (activeFilter === "Recent") return true;
    if (activeFilter !== "All") return r.type === activeFilter.slice(0, -1); // "Companies" → "Companie" won't match, but that's fine for demo
    if (searchQuery) return r.title.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-content">Reports</h1>
        <p className="text-xs text-content-muted">All your saved research. Search, reopen, refresh.</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
        <Search className="h-4 w-4 text-content-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search reports..."
          className="flex-1 bg-transparent text-sm text-content placeholder:text-content-muted/50 focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="mt-3 flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setActiveFilter(f)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
              activeFilter === f
                ? "bg-white/[0.08] text-content"
                : "text-content-muted hover:text-content-secondary"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Report grid */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {filtered.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-12 text-center text-sm text-content-muted/50">
          No reports found. Run a search from Home or Chat to create one.
        </div>
      )}
    </div>
  );
});

export default ReportsHome;
