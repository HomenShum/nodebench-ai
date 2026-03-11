import { useMemo, useState } from "react";
import {
  BadgeCheck,
  ClipboardCheck,
  FileJson2,
  FileSpreadsheet,
  Files,
  GitCompareArrows,
  SearchCheck,
  ShieldCheck,
  Waypoints,
} from "lucide-react";

import { LazyCodeBlock } from "@/shared/components/LazyCodeBlock";
import { cn } from "@/lib/utils";

import { SPREADSHEET_EXECUTION_TRACE } from "../data/spreadsheetExecutionTrace";
import { EXECUTION_TRACE_JSON_SCHEMA } from "../types/executionTrace";

type TraceTab = "overview" | "timeline" | "evidence" | "diffs" | "verification" | "json";

const TABS: Array<{ id: TraceTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "timeline", label: "Timeline" },
  { id: "evidence", label: "Evidence" },
  { id: "diffs", label: "Diffs" },
  { id: "verification", label: "Verification" },
  { id: "json", label: "JSON Contract" },
];

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
  const trace = SPREADSHEET_EXECUTION_TRACE;

  const formattedJson = useMemo(() => JSON.stringify(trace, null, 2), [trace]);
  const schemaJson = useMemo(() => JSON.stringify(EXECUTION_TRACE_JSON_SCHEMA, null, 2), []);

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
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
              Spreadsheet workflow: inspect, research, edit, verify, export
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">{trace.run.user_goal}</p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-500">
              This surface stores action receipts, evidence, diffs, decisions, verification checks, and final artifacts.
              It does not depend on hidden chain-of-thought to make the workflow auditable.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Run summary</div>
            <div className="mt-2 space-y-2 text-sm text-zinc-300">
              <div>{trace.steps.length} recorded steps</div>
              <div>{trace.evidence_catalog.length} evidence bundles</div>
              <div>{trace.verification_checks.length} verification checks</div>
              <div>{trace.outputs.length} exported artifacts</div>
            </div>
            <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Truth boundary</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              Public evidence supported a Meta-related relationship and immersive-tech QA pedigree, but not a specific
              formal contract for agentic mobile QA automation.
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Execution trace sections">
        {TABS.map((tab) => (
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
