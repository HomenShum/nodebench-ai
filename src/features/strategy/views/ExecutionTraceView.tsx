import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  ClipboardCheck,
  DatabaseZap,
  FileJson2,
  FileSpreadsheet,
  Files,
  GitCompareArrows,
  SearchCheck,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import { useConvexAuth, useQuery } from "convex/react";

import { LazyCodeBlock } from "@/shared/components/LazyCodeBlock";
import { cn } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type {
  TaskSession,
  TaskSpan,
  TaskTrace,
} from "@/features/agents/components/TaskManager/types";

import { SPREADSHEET_EXECUTION_TRACE } from "../data/spreadsheetExecutionTrace";
import { buildExecutionTraceFromLiveRun } from "../lib/executionTraceAdapter";
import { EXECUTION_TRACE_JSON_SCHEMA } from "../types/executionTrace";

type TraceTab = "overview" | "timeline" | "evidence" | "diffs" | "verification" | "json";
type DisclosureLevel = "outcome" | "why" | "full";

const TABS: Array<{ id: TraceTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "timeline", label: "Timeline" },
  { id: "evidence", label: "Evidence" },
  { id: "diffs", label: "Diffs" },
  { id: "verification", label: "Verification" },
  { id: "json", label: "JSON Contract" },
];

const DISCLOSURE_LEVELS: Array<{
  id: DisclosureLevel;
  label: string;
  description: string;
}> = [
  {
    id: "outcome",
    label: "Outcome",
    description: "Best for buyers and operators who need the result, key evidence, and limitations fast.",
  },
  {
    id: "why",
    label: "Why",
    description: "Adds the reasoning boundary: decisions, evidence basis, and verification context.",
  },
  {
    id: "full",
    label: "Full Trace",
    description: "Shows the complete audit path: timeline, diffs, raw contract, and full evidence payloads.",
  },
];

const DISCLOSURE_TABS: Record<DisclosureLevel, TraceTab[]> = {
  outcome: ["overview"],
  why: ["overview", "timeline", "evidence", "verification"],
  full: ["overview", "timeline", "evidence", "diffs", "verification", "json"],
};

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-100">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-zinc-300">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ value }: { value: "passed" | "warning" | "failed" | "fixed" }) {
  const tone =
    value === "passed"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : value === "fixed"
        ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
        : value === "warning"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-rose-500/30 bg-rose-500/10 text-rose-300";
  return (
    <span className={cn("rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide", tone)}>
      {value}
    </span>
  );
}

function SourceChips({ sourceRefs }: { sourceRefs?: Array<{ label: string; url?: string }> }) {
  if (!sourceRefs?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {sourceRefs.map((source) =>
        source.url ? (
          <a
            key={`${source.label}-${source.url}`}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.07]"
          >
            {source.label}
          </a>
        ) : (
          <span
            key={source.label}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-zinc-400"
          >
            {source.label}
          </span>
        ),
      )}
    </div>
  );
}

export function ExecutionTraceView() {
  const [activeTab, setActiveTab] = useState<TraceTab>("overview");
  const [disclosureLevel, setDisclosureLevel] = useState<DisclosureLevel>("outcome");
  const [selectedSessionId, setSelectedSessionId] = useState<Id<"agentTaskSessions"> | null>(null);
  const { isAuthenticated } = useConvexAuth();
  const effectiveIsPublic = !isAuthenticated;

  const publicSessionsData = useQuery(
    api.domains.taskManager.queries.getPublicTaskSessions,
    effectiveIsPublic ? { limit: 8 } : "skip",
  );
  const userSessionsData = useQuery(
    api.domains.taskManager.queries.getUserTaskSessions,
    !effectiveIsPublic ? { limit: 8 } : "skip",
  );

  const sessions = useMemo(
    () => ((effectiveIsPublic ? publicSessionsData?.sessions : userSessionsData?.sessions) ?? []) as TaskSession[],
    [effectiveIsPublic, publicSessionsData?.sessions, userSessionsData?.sessions],
  );

  useEffect(() => {
    if (!sessions.length) {
      setSelectedSessionId(null);
      return;
    }
    if (!selectedSessionId || !sessions.some((session) => session._id === selectedSessionId)) {
      setSelectedSessionId(sessions[0]._id);
    }
  }, [selectedSessionId, sessions]);

  const sessionDetail = useQuery(
    api.domains.taskManager.queries.getTaskSessionDetail,
    selectedSessionId ? { sessionId: selectedSessionId } : "skip",
  );

  const primaryTraceId = useMemo(
    () => ((sessionDetail?.traces?.[0]?._id ?? null) as Id<"agentTaskTraces"> | null),
    [sessionDetail?.traces],
  );

  const primaryTraceSpans = useQuery(
    api.domains.taskManager.queries.getTraceSpans,
    primaryTraceId ? { traceId: primaryTraceId } : "skip",
  );

  const liveTrace = useMemo(() => {
    if (!sessionDetail?.session) return null;
    return buildExecutionTraceFromLiveRun({
      session: sessionDetail.session as TaskSession & { metadata?: unknown; errorStack?: string },
      traces: (sessionDetail.traces ?? []) as Array<TaskTrace & { metadata?: unknown }>,
      spans: ((primaryTraceSpans?.spans ?? []) as TaskSpan[]) || [],
    });
  }, [primaryTraceSpans?.spans, sessionDetail]);

  const trace = liveTrace ?? SPREADSHEET_EXECUTION_TRACE;
  const usingLiveRun = Boolean(liveTrace);
  const activeSession = sessionDetail?.session as TaskSession | undefined;
  const isLoadingSessions = (effectiveIsPublic ? publicSessionsData : userSessionsData) === undefined;
  const isLoadingDetail = Boolean(selectedSessionId) && sessionDetail === undefined;

  const formattedJson = useMemo(() => JSON.stringify(trace, null, 2), [trace]);
  const schemaJson = useMemo(() => JSON.stringify(EXECUTION_TRACE_JSON_SCHEMA, null, 2), []);
  const visibleTabs = useMemo(() => {
    const allowed = new Set(DISCLOSURE_TABS[disclosureLevel]);
    return TABS.filter((tab) => allowed.has(tab.id));
  }, [disclosureLevel]);
  const headline = usingLiveRun
    ? activeSession?.title ?? "Live execution workflow"
    : "Spreadsheet workflow: inspect, research, edit, verify, export";
  const truthBoundary =
    trace.limitations[0] ??
    "This surface stores action receipts, evidence, diffs, decisions, verification checks, and final artifacts.";
  const primaryDecision = trace.decisions[0];
  const primaryOutput = trace.outputs[0];
  const verificationCounts = useMemo(
    () =>
      trace.verification_checks.reduce(
        (acc, check) => {
          acc[check.status] += 1;
          return acc;
        },
        { passed: 0, warning: 0, failed: 0, fixed: 0 } as Record<"passed" | "warning" | "failed" | "fixed", number>,
      ),
    [trace.verification_checks],
  );

  useEffect(() => {
    if (!DISCLOSURE_TABS[disclosureLevel].includes(activeTab)) {
      setActiveTab(DISCLOSURE_TABS[disclosureLevel][0]);
    }
  }, [activeTab, disclosureLevel]);

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-6 px-6 py-8" data-testid="execution-trace-view">
      <header className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_36%),rgba(5,5,5,0.92)] p-6">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Execution Trace
          </span>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
            {trace.meta.status}
          </span>
          <span
            className={cn(
              "rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
              usingLiveRun
                ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
                : "border-amber-500/30 bg-amber-500/10 text-amber-200",
            )}
          >
            {usingLiveRun ? "Live saved run" : "Seeded example"}
          </span>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">{headline}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">{trace.run.user_goal}</p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-500">
              This surface stores action receipts, evidence, diffs, decisions, verification checks, and final artifacts.
              It does not depend on hidden chain-of-thought to make the workflow auditable.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Run source</div>
            {sessions.length ? (
              <div className="mt-2">
                <label className="sr-only" htmlFor="execution-trace-run-select">
                  Select live execution run
                </label>
                <select
                  id="execution-trace-run-select"
                  aria-label="Select live execution run"
                  value={selectedSessionId ?? ""}
                  onChange={(event) =>
                    setSelectedSessionId(event.target.value as Id<"agentTaskSessions">)
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-cyan-400/40"
                >
                  {sessions.map((session) => (
                    <option key={session._id} value={session._id}>
                      {session.title}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                  <DatabaseZap className="h-3.5 w-3.5 text-cyan-300" />
                  {usingLiveRun
                    ? `${sessionDetail?.traceCount ?? 0} trace${sessionDetail?.traceCount === 1 ? "" : "s"} reconstructed from saved runs`
                    : "No compatible saved runs found. Showing the seeded spreadsheet trace."}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                No saved task runs are available yet. The seeded spreadsheet trace remains visible so the surface still demonstrates the contract.
              </p>
            )}

            <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Run summary</div>
            <div className="mt-2 space-y-2 text-sm text-zinc-300">
              <div>{trace.steps.length} recorded steps</div>
              <div>{trace.evidence_catalog.length} evidence bundles</div>
              <div>{trace.verification_checks.length} verification checks</div>
              <div>{trace.outputs.length} exported artifacts</div>
            </div>
            <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Truth boundary</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">{truthBoundary}</p>
          </div>
        </div>
      </header>

      {(isLoadingSessions || isLoadingDetail) && !usingLiveRun ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400">
          Loading saved execution runs…
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Progressive disclosure
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300">
              Start with the level of detail you actually need, then drill down only when the workflow outcome needs explanation or a full audit trail.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Execution trace disclosure levels">
            {DISCLOSURE_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                role="tab"
                aria-selected={disclosureLevel === level.id}
                onClick={() => setDisclosureLevel(level.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition",
                  disclosureLevel === level.id
                    ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-100"
                    : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200",
                )}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 text-sm text-zinc-400">
          {DISCLOSURE_LEVELS.find((level) => level.id === disclosureLevel)?.description}
        </div>
      </section>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Execution trace sections">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition",
              activeTab === tab.id
                ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-100"
                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <>
          {disclosureLevel === "outcome" ? (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <SectionCard title="Outcome" icon={<BadgeCheck className="h-4 w-4 text-emerald-300" />}>
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Primary result</div>
                    <div className="mt-2 text-sm font-medium text-zinc-100">
                      {primaryDecision?.statement ?? "This run completed with a traceable outcome."}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-300">{trace.run.user_goal}</p>
                  </div>
                  {primaryOutput ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Primary artifact</div>
                      <div className="mt-2 text-sm font-medium text-zinc-100">{primaryOutput.label}</div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">{primaryOutput.kind}</div>
                      <div className="mt-2 break-all text-xs text-zinc-400">{primaryOutput.path}</div>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-300">{primaryOutput.summary}</p>
                    </div>
                  ) : null}
                </div>
              </SectionCard>

              <div className="space-y-6">
                <SectionCard title="Trust Boundary" icon={<SearchCheck className="h-4 w-4 text-amber-300" />}>
                  <BulletList items={trace.limitations} />
                </SectionCard>

                <SectionCard title="Verification Snapshot" icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Passed</div>
                      <div className="mt-2 text-2xl font-semibold text-zinc-100">{verificationCounts.passed}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Warnings / fixes</div>
                      <div className="mt-2 text-2xl font-semibold text-zinc-100">
                        {verificationCounts.warning + verificationCounts.fixed}
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
          ) : null}

          {disclosureLevel === "why" ? (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <SectionCard title="Why this outcome" icon={<BadgeCheck className="h-4 w-4 text-emerald-300" />}>
                <div className="space-y-4">
                  {trace.decisions.map((decision) => (
                    <div key={decision.decision_id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-sm font-medium text-zinc-100">{decision.statement}</div>
                      <div className="mt-2">
                        <BulletList items={decision.basis} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <div className="space-y-6">
                <SectionCard title="Evidence boundary" icon={<Files className="h-4 w-4 text-indigo-300" />}>
                  <div className="space-y-4">
                    {trace.evidence_catalog.slice(0, 3).map((evidence) => (
                      <div key={evidence.evidence_id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-sm font-medium text-zinc-100">{evidence.title}</div>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-300">{evidence.summary}</p>
                        <SourceChips sourceRefs={evidence.source_refs} />
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Verification Snapshot" icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />}>
                  <BulletList
                    items={[
                      `${verificationCounts.passed} checks passed`,
                      `${verificationCounts.warning} warnings recorded`,
                      `${verificationCounts.fixed} issues fixed during the run`,
                      truthBoundary,
                    ]}
                  />
                </SectionCard>
              </div>
            </div>
          ) : null}

          {disclosureLevel === "full" ? (
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <SectionCard title="Workflow Template" icon={<Waypoints className="h-4 w-4 text-cyan-300" />}>
                <div className="space-y-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Inputs</div>
                    <div className="mt-2">
                      <BulletList items={trace.inputs.uploaded_files} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Instructions</div>
                    <div className="mt-2">
                      <BulletList items={trace.inputs.instructions} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Stored as receipts</div>
                    <div className="mt-2">
                      <BulletList
                        items={[
                          "intent and uploaded inputs",
                          "tool actions and artifacts out",
                          "evidence and unsupported-claim boundaries",
                          "decision records and ranking basis",
                          "verification passes and cleanup fixes",
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>

              <div className="space-y-6">
                <SectionCard title="Structured Decisions" icon={<BadgeCheck className="h-4 w-4 text-emerald-300" />}>
                  <div className="space-y-4">
                    {trace.decisions.map((decision) => (
                      <div key={decision.decision_id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-sm font-medium text-zinc-100">{decision.statement}</div>
                        <div className="mt-2">
                          <BulletList items={decision.basis} />
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Outputs" icon={<FileSpreadsheet className="h-4 w-4 text-indigo-300" />}>
                  <div className="space-y-3">
                    {trace.outputs.map((output) => (
                      <div key={output.output_id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-sm font-medium text-zinc-100">{output.label}</div>
                        <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">{output.kind}</div>
                        <div className="mt-2 break-all text-xs text-zinc-400">{output.path}</div>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-300">{output.summary}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {activeTab === "timeline" ? (
        <SectionCard title="Step Timeline" icon={<Waypoints className="h-4 w-4 text-cyan-300" />}>
          <div className="space-y-4">
            {trace.steps.map((step, index) => (
              <div key={step.step_id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:grid-cols-[120px_1fr]">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{step.stage}</div>
                  <div className="mt-1 text-xs text-zinc-400">Step {index + 1}</div>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium text-zinc-100">{step.title}</div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-500">
                      {step.tool}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">{step.result_summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                    <span>action: {step.action}</span>
                    <span>target: {step.target}</span>
                    {typeof step.confidence === "number" ? (
                      <span>confidence {(step.confidence * 100).toFixed(0)}%</span>
                    ) : null}
                  </div>
                  {step.verification.length ? (
                    <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        Verification notes
                      </div>
                      <div className="mt-2">
                        <BulletList items={step.verification} />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {activeTab === "evidence" ? (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="Evidence Catalog" icon={<Files className="h-4 w-4 text-indigo-300" />}>
            <div className="space-y-4">
              {trace.evidence_catalog.map((evidence) => (
                <div key={evidence.evidence_id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-sm font-medium text-zinc-100">{evidence.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">{evidence.summary}</p>
                  <SourceChips sourceRefs={evidence.source_refs} />
                  {evidence.supported_claims.length ? (
                    <div className="mt-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        Supported claims
                      </div>
                      <div className="mt-2">
                        <BulletList items={evidence.supported_claims} />
                      </div>
                    </div>
                  ) : null}
                  {evidence.unsupported_claims.length ? (
                    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                        Not established
                      </div>
                      <div className="mt-2">
                        <BulletList items={evidence.unsupported_claims} />
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Limitations" icon={<SearchCheck className="h-4 w-4 text-amber-300" />}>
            <BulletList items={trace.limitations} />
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "diffs" ? (
        <div className="space-y-6">
          {trace.diffs.map((diff) => (
            <SectionCard key={diff.diff_id} title={diff.target} icon={<GitCompareArrows className="h-4 w-4 text-cyan-300" />}>
              <p className="text-sm leading-relaxed text-zinc-300">{diff.summary}</p>
              {diff.cell_changes.length ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-white/[0.04] text-zinc-400">
                      <tr>
                        <th className="px-3 py-2 font-medium">Cell</th>
                        <th className="px-3 py-2 font-medium">Before</th>
                        <th className="px-3 py-2 font-medium">After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diff.cell_changes.map((change) => (
                        <tr key={`${diff.diff_id}-${change.cell}`} className="border-t border-white/10 align-top">
                          <td className="px-3 py-2 font-mono text-xs text-zinc-400">{change.cell}</td>
                          <td className="px-3 py-2 text-zinc-500">{change.before ?? "blank"}</td>
                          <td className="px-3 py-2 text-zinc-200">{change.after ?? "blank"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {diff.structural_changes.length ? (
                <div className="mt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Structural changes
                  </div>
                  <div className="mt-2">
                    <BulletList items={diff.structural_changes} />
                  </div>
                </div>
              ) : null}
            </SectionCard>
          ))}
        </div>
      ) : null}

      {activeTab === "verification" ? (
        <SectionCard title="Verification Loop" icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />}>
          <div className="space-y-4">
            {trace.verification_checks.map((check) => (
              <div key={check.check_id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-medium text-zinc-100">{check.label}</div>
                  <StatusBadge value={check.status} />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">{check.details}</p>
                {check.related_artifact_ids.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {check.related_artifact_ids.map((artifactId) => (
                      <span
                        key={artifactId}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-zinc-400"
                      >
                        {artifactId}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {activeTab === "json" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Typed Output" icon={<FileJson2 className="h-4 w-4 text-cyan-300" />}>
            <LazyCodeBlock code={formattedJson} language="json" />
          </SectionCard>
          <SectionCard title="Schema Contract" icon={<ClipboardCheck className="h-4 w-4 text-indigo-300" />}>
            <LazyCodeBlock code={schemaJson} language="json" />
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}

export default ExecutionTraceView;
