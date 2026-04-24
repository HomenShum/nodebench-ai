import { useMemo, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileText,
  Layers3,
  ShieldCheck,
} from "lucide-react";

import { RichNotebookEditor } from "@/features/notebook/components/RichNotebookEditor";
import {
  getStarterEntityWorkspace,
  type StarterEntityWorkspace,
} from "@/features/entities/lib/starterEntityWorkspaces";
import { buildWorkspaceUrl } from "@/features/workspace/lib/workspaceRouting";
import { getReportNotebookIdFromPath } from "@/features/reports/lib/reportNotebookRouting";
import { useConvexApi } from "@/lib/convexApi";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import { cn } from "@/lib/utils";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function titleizeReportId(reportId: string) {
  return reportId
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export type SavedReportSnapshot = {
  title?: string;
  summary?: string;
  query?: string;
  bodyMarkdown?: string;
  bodyHtml?: string;
  sources?: Array<{
    label?: string;
    siteName?: string;
    title?: string;
    domain?: string;
    href?: string;
    type?: string;
  }>;
  updatedAt?: number;
};

function paragraphsToHtml(text: string) {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export function buildReportNotebookContent(
  workspace: StarterEntityWorkspace | null,
  reportName: string,
  savedReport?: SavedReportSnapshot | null,
) {
  // Real saved report → render the saved answer as the notebook body.
  if (savedReport) {
    const heading = savedReport.title?.trim() || reportName;
    const summaryHtml = savedReport.summary?.trim()
      ? `<p><em>${escapeHtml(savedReport.summary.trim())}</em></p>`
      : "";
    const queryHtml = savedReport.query?.trim()
      ? `<p><strong>Question:</strong> ${escapeHtml(savedReport.query.trim())}</p>`
      : "";
    let bodyHtml = "";
    if (typeof savedReport.bodyHtml === "string" && savedReport.bodyHtml.trim()) {
      // Trust backend-sanitized HTML (server is source of truth for this field).
      bodyHtml = savedReport.bodyHtml;
    } else if (typeof savedReport.bodyMarkdown === "string" && savedReport.bodyMarkdown.trim()) {
      bodyHtml = paragraphsToHtml(savedReport.bodyMarkdown);
    }
    return `
      <h2>${escapeHtml(heading)}</h2>
      ${summaryHtml}
      ${queryHtml}
      ${bodyHtml || "<p>This report does not yet have a written answer attached. Open it in the full workspace for live exploration.</p>"}
    `;
  }

  // Starter fixture path (demo reports keyed by slug).
  if (workspace) {
    const sectionHtml =
      workspace.latest?.sections
        .map(
          (section) =>
            `<h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.body)}</p>`,
        )
        .join("") ?? "";

    return `
      <h2>${escapeHtml(workspace.latest?.title ?? `${workspace.entity.name} notebook`)}</h2>
      <p>${escapeHtml(workspace.note.content)}</p>
      ${sectionHtml}
    `;
  }

  // True empty fallback — no saved data, no starter fixture.
  return `
    <h2>${escapeHtml(reportName)} notebook</h2>
    <p>Use this web report notebook for quick memo cleanup, field-note synthesis, and small edits before opening the full workspace.</p>
    <p>For recursive cards, source verification, chat, and graph inspection, open the full Workspace surface.</p>
  `;
}

function ContextCard({
  label,
  title,
  children,
  className,
}: {
  label: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-black/[0.06] bg-white p-4 shadow-sm", className)}>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </div>
      <h2 className="mt-2 text-base font-semibold text-gray-950">{title}</h2>
      {children}
    </section>
  );
}

export function ReportNotebookDetail() {
  const location = useLocation();
  const reportId = getReportNotebookIdFromPath(location.pathname) ?? "new";
  const starterWorkspace = getStarterEntityWorkspace(reportId);

  // Fetch real saved report — try authed `getReport`, fall back to public.
  // Convex IDs follow a predictable opaque-string shape; starter ids are
  // human-readable slugs ("starter-market"), so skip the fetch for those.
  const looksLikeConvexId = !starterWorkspace && reportId !== "new" && /^[a-z0-9]{20,}$/i.test(reportId);

  const api = useConvexApi();
  const ownReport = useQuery(
    looksLikeConvexId && (api?.domains?.product?.reports as any)?.getReport
      ? (api.domains.product.reports as any).getReport
      : "skip",
    looksLikeConvexId
      ? {
          reportId: reportId as any,
          anonymousSessionId: getAnonymousProductSessionId(),
        }
      : "skip",
  ) as SavedReportSnapshot | null | undefined;

  const publicReport = useQuery(
    looksLikeConvexId && ownReport === null && (api?.domains?.product?.reports as any)?.getPublicReport
      ? (api.domains.product.reports as any).getPublicReport
      : "skip",
    looksLikeConvexId && ownReport === null ? { reportId } : "skip",
  ) as SavedReportSnapshot | null | undefined;

  const savedReport = ownReport ?? publicReport ?? null;
  const isSavedReportLoading = looksLikeConvexId && ownReport === undefined;

  const reportName = useMemo(() => {
    if (savedReport?.title?.trim()) return savedReport.title.trim();
    if (starterWorkspace?.entity.name) return starterWorkspace.entity.name;
    return titleizeReportId(reportId);
  }, [savedReport, starterWorkspace, reportId]);

  const summary =
    savedReport?.summary?.trim() ||
    starterWorkspace?.entity.summary ||
    "A lightweight report notebook for quick web edits before deeper workspace exploration.";

  const evidence = useMemo(() => {
    if (Array.isArray(savedReport?.sources) && savedReport.sources.length > 0) {
      return savedReport.sources
        .slice(0, 8)
        .map((source) => ({
          label:
            source.siteName ||
            source.label ||
            source.title ||
            source.domain ||
            source.href ||
            "Source",
          type: source.type || (source.domain ? "web" : "source"),
        }));
    }
    return starterWorkspace?.evidence ?? [];
  }, [savedReport, starterWorkspace]);

  const workspaceNotebookUrl = buildWorkspaceUrl({ workspaceId: reportId, tab: "notebook" });
  const workspaceBriefUrl = buildWorkspaceUrl({ workspaceId: reportId, tab: "brief" });
  const workspaceSourcesUrl = buildWorkspaceUrl({ workspaceId: reportId, tab: "sources" });
  const notebookContent = useMemo(
    () => buildReportNotebookContent(starterWorkspace, reportName, savedReport),
    [reportName, starterWorkspace, savedReport],
  );

  const sectionsCount = useMemo(() => {
    if (savedReport?.bodyHtml || savedReport?.bodyMarkdown) {
      const text = String(savedReport.bodyHtml ?? savedReport.bodyMarkdown ?? "");
      const headings = text.match(/<h[1-6][^>]*>/gi) || text.match(/^#{1,6}\s/gm) || [];
      return Math.max(1, headings.length);
    }
    return starterWorkspace?.latest?.sections.length ?? 1;
  }, [savedReport, starterWorkspace]);

  if (isSavedReportLoading) {
    return (
      <div
        data-testid="report-notebook-detail"
        className="flex min-h-screen items-center justify-center bg-[#f6f4f0] text-gray-700"
      >
        <div className="rounded-lg border border-black/[0.06] bg-white px-6 py-4 text-sm shadow-sm">
          Loading report…
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="report-notebook-detail"
      className="min-h-screen bg-[#f6f4f0] text-gray-950"
    >
      <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-4 py-3 sm:px-6">
          <Link
            to="/?surface=packets"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/[0.08] bg-white text-gray-600 transition hover:text-gray-950"
            aria-label="Back to Reports"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ad5f45]">
              Reports / Notebook
            </div>
            <h1 className="truncate text-lg font-semibold tracking-[-0.01em]">
              {reportName}
            </h1>
          </div>
          <a
            href={workspaceNotebookUrl}
            className="ml-auto inline-flex items-center gap-2 rounded-md bg-[#d97757] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c66a4c]"
          >
            Open full workspace
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1240px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          <div className="mb-4 rounded-lg border border-black/[0.06] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d97757]/25 bg-[#d97757]/10 px-2.5 py-1 font-medium text-[#ad5f45]">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Web report edit
              </span>
              <span>Quick memo cleanup without leaving nodebenchai.com.</span>
            </div>
          </div>

          <RichNotebookEditor
            initialContent={notebookContent}
            storageKey={`nodebench.report.${reportId}.notebook`}
            testId="report-notebook-editor"
            className="min-h-[560px] p-5"
            footer={
              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-gray-400">
                <span>TipTap · StarterKit · saved locally</span>
                <span>Full cards, sources, chat, and map stay in Workspace</span>
              </div>
            }
          />
        </section>

        <aside className="space-y-4">
          <ContextCard label="Report context" title={reportName}>
            <p className="mt-3 text-sm leading-6 text-gray-600">{summary}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-md border border-black/[0.06] bg-[#f6f4f0] p-3">
                <div className="font-mono text-lg font-semibold">
                  {starterWorkspace?.entity.reportCount ?? 1}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">briefs</div>
              </div>
              <div className="rounded-md border border-black/[0.06] bg-[#f6f4f0] p-3">
                <div className="font-mono text-lg font-semibold">{evidence.length}</div>
                <div className="mt-1 text-[11px] text-gray-500">sources</div>
              </div>
              <div className="rounded-md border border-black/[0.06] bg-[#f6f4f0] p-3">
                <div className="font-mono text-lg font-semibold">{sectionsCount}</div>
                <div className="mt-1 text-[11px] text-gray-500">sections</div>
              </div>
            </div>
          </ContextCard>

          <ContextCard label="Workspace handoff" title="Go deeper when needed">
            <div className="mt-4 space-y-2">
              {[
                { label: "Brief", icon: FileText, href: workspaceBriefUrl },
                { label: "Notebook", icon: BookOpen, href: workspaceNotebookUrl },
                { label: "Sources", icon: ShieldCheck, href: workspaceSourcesUrl },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between rounded-md border border-black/[0.06] bg-[#f6f4f0] px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-[#d97757]/30 hover:text-[#ad5f45]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </ContextCard>

          <ContextCard label="Evidence" title="Attached sources">
            <div className="mt-3 space-y-2">
              {(evidence.length > 0 ? evidence : [{ label: "No sources attached yet", type: "empty" }]).map(
                (source) => (
                  <div
                    key={`${source.label}-${source.type}`}
                    className="rounded-md border border-black/[0.06] bg-[#f6f4f0] p-3"
                  >
                    <div className="flex items-start gap-2">
                      <Layers3 className="mt-0.5 h-3.5 w-3.5 text-[#ad5f45]" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900">
                          {source.label}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">{source.type}</div>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </ContextCard>
        </aside>
      </main>
    </div>
  );
}

export default ReportNotebookDetail;
