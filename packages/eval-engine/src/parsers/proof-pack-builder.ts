/**
 * Proof pack assembly and export.
 * Builds a portable evidence bundle from run results + evidence artifacts.
 */
import type {
  ProofPackExport,
  RunResult,
  Evidence,
} from "../types.js";

// ── Builder ──────────────────────────────────────────────────────────

/**
 * Assemble a proof pack from a run result and its evidence artifacts.
 */
export function buildProofPack(
  runResult: RunResult,
  evidence: Evidence[],
): ProofPackExport {
  const screenshots: string[] = [];
  const videoClips: string[] = [];

  for (const e of evidence) {
    if (e.type === "screenshot") screenshots.push(e.data);
    if (e.type === "video") videoClips.push(e.data);
  }

  return {
    packKey: runResult.packKey,
    subject: runResult.subject,
    checklist: runResult.checks.map((c) => ({
      label: c.label,
      passed: c.passed,
      note: c.note,
      evidence: evidence
        .filter((e) => e.label === c.label)
        .map((e) => e.data)
        .join("; ") || undefined,
    })),
    metrics: {
      totalTokens: runResult.totalTokens,
      totalDurationMs: runResult.totalDurationMs,
      estimatedCostUsd: runResult.estimatedCostUsd,
    },
    screenshots,
    videoClips,
    auditTrail: runResult.auditTrail,
    exportedAt: Date.now(),
    format: "json",
  };
}

// ── Markdown export ──────────────────────────────────────────────────

/**
 * Render a proof pack as a Markdown document.
 */
export function exportAsMarkdown(pack: ProofPackExport): string {
  const lines: string[] = [];

  lines.push(`# Proof Pack: ${pack.packKey}`);
  lines.push("");
  lines.push(`**Subject:** ${pack.subject.type} / ${pack.subject.id}`);
  lines.push(`**Exported:** ${new Date(pack.exportedAt).toISOString()}`);
  lines.push("");

  // Metrics
  lines.push("## Metrics");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Tokens | ${pack.metrics.totalTokens.toLocaleString()} |`);
  lines.push(`| Duration | ${(pack.metrics.totalDurationMs / 1000).toFixed(1)}s |`);
  lines.push(`| Estimated Cost | $${pack.metrics.estimatedCostUsd.toFixed(4)} |`);
  lines.push("");

  // Checklist
  lines.push("## Checklist");
  lines.push("");
  const passed = pack.checklist.filter((c) => c.passed).length;
  lines.push(`**${passed}/${pack.checklist.length} passed**`);
  lines.push("");
  for (const item of pack.checklist) {
    const icon = item.passed ? "[x]" : "[ ]";
    lines.push(`- ${icon} ${item.label}`);
    if (item.note) lines.push(`  - Note: ${item.note}`);
    if (item.evidence) lines.push(`  - Evidence: ${item.evidence}`);
  }
  lines.push("");

  // Evidence
  if (pack.screenshots.length > 0) {
    lines.push("## Screenshots");
    lines.push("");
    for (let i = 0; i < pack.screenshots.length; i++) {
      const s = pack.screenshots[i];
      if (s.startsWith("http")) {
        lines.push(`![Screenshot ${i + 1}](${s})`);
      } else {
        lines.push(`- Screenshot ${i + 1}: [base64, ${s.length} chars]`);
      }
    }
    lines.push("");
  }

  if (pack.videoClips.length > 0) {
    lines.push("## Video Clips");
    lines.push("");
    for (let i = 0; i < pack.videoClips.length; i++) {
      lines.push(`- Clip ${i + 1}: ${pack.videoClips[i].startsWith("http") ? pack.videoClips[i] : `[base64, ${pack.videoClips[i].length} chars]`}`);
    }
    lines.push("");
  }

  // Audit trail
  if (pack.auditTrail.length > 0) {
    lines.push("## Audit Trail");
    lines.push("");
    lines.push("| Time | Actor | Action |");
    lines.push("|------|-------|--------|");
    for (const entry of pack.auditTrail) {
      lines.push(
        `| ${new Date(entry.timestamp).toISOString()} | ${entry.actor} | ${entry.action} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ── PDF-ready export ─────────────────────────────────────────────────

/**
 * Export as a structured object ready for PDF generation.
 * Returns sections with typed content blocks that a PDF renderer can consume.
 */
export function exportAsPdfReady(
  pack: ProofPackExport,
): object {
  return {
    title: `Proof Pack: ${pack.packKey}`,
    metadata: {
      subject: pack.subject,
      exportedAt: pack.exportedAt,
      format: "pdf-ready",
    },
    sections: [
      {
        heading: "Metrics",
        type: "table",
        rows: [
          ["Total Tokens", pack.metrics.totalTokens.toLocaleString()],
          ["Duration", `${(pack.metrics.totalDurationMs / 1000).toFixed(1)}s`],
          ["Estimated Cost", `$${pack.metrics.estimatedCostUsd.toFixed(4)}`],
        ],
      },
      {
        heading: "Checklist",
        type: "checklist",
        summary: {
          passed: pack.checklist.filter((c) => c.passed).length,
          total: pack.checklist.length,
        },
        items: pack.checklist,
      },
      {
        heading: "Screenshots",
        type: "images",
        items: pack.screenshots.map((s, i) => ({
          label: `Screenshot ${i + 1}`,
          data: s,
          isUrl: s.startsWith("http"),
        })),
      },
      {
        heading: "Video Clips",
        type: "links",
        items: pack.videoClips.map((v, i) => ({
          label: `Clip ${i + 1}`,
          data: v,
          isUrl: v.startsWith("http"),
        })),
      },
      {
        heading: "Audit Trail",
        type: "table",
        headers: ["Time", "Actor", "Action"],
        rows: pack.auditTrail.map((e) => [
          new Date(e.timestamp).toISOString(),
          e.actor,
          e.action,
        ]),
      },
    ],
  };
}
