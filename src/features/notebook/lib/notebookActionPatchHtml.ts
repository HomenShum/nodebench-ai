import type { NotebookActionPatch } from "./notebookActionEngine";

function encodeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function notebookBodyTextToHtml(value: string) {
  const lines = value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return "";

  const allBullets = lines.every((line) => /^[-*]\s+/.test(line));
  if (allBullets) {
    return `<ul>${lines
      .map((line) => `<li>${encodeHtml(line.replace(/^[-*]\s+/, ""))}</li>`)
      .join("")}</ul>`;
  }

  return lines.map((line) => `<p>${encodeHtml(line)}</p>`).join("");
}

function claimEvidenceForHtml(evidenceIds: string[]) {
  return evidenceIds.map((id, index) => ({
    n: index + 1,
    label: id,
    kind: "support" as const,
  }));
}

function claimBlockHtml(change: NotebookActionPatch["proposedClaimChanges"][number]) {
  const evidence = claimEvidenceForHtml(change.evidenceIds);
  const conflictCount = change.status === "needs_review" || evidence.length === 0 ? 1 : 0;
  return `<div data-type="nb-claim" data-statement="${encodeHtml(change.claim)}" data-support="${evidence.length}" data-conflict="${conflictCount}" data-evidence="${encodeHtml(JSON.stringify(evidence))}" data-open="true"></div>`;
}

export function buildNotebookActionPatchHtml(patch: NotebookActionPatch) {
  const blocks = patch.proposedBlockChanges
    .map((change) => {
      if (change.kind === "insert_callout") {
        return `<blockquote><p><strong>${encodeHtml(change.title)}:</strong> ${encodeHtml(change.body)}</p></blockquote>`;
      }
      return `<h3>${encodeHtml(change.title)}</h3>${notebookBodyTextToHtml(change.body)}`;
    })
    .join("");

  const entities = patch.proposedEntityChanges.length
    ? `<h3>Entity changes</h3><ul>${patch.proposedEntityChanges
        .map(
          (entity) =>
            `<li>${encodeHtml(entity.name)} <code>${encodeHtml(entity.entityType)}</code> <em>${Math.round(entity.confidence * 100)}% confidence</em></li>`,
        )
        .join("")}</ul>`
    : "";

  const followUps = patch.proposedFollowUpChanges.length
    ? `<h3>Follow-ups</h3><ul>${patch.proposedFollowUpChanges
        .map(
          (followUp) =>
            `<li><strong>${encodeHtml(followUp.priority)}</strong> ${encodeHtml(followUp.action)}</li>`,
        )
        .join("")}</ul>`
    : "";

  const edges = patch.proposedEdgeChanges.length
    ? `<h3>Relation proposals</h3><ul>${patch.proposedEdgeChanges
        .map(
          (edge) =>
            `<li><code>${encodeHtml(edge.edgeType)}</code> ${encodeHtml(edge.fromKey)} -> ${encodeHtml(edge.toKey)}: ${encodeHtml(edge.explanation)}</li>`,
        )
        .join("")}</ul>`
    : "";

  const claims = patch.proposedClaimChanges.map(claimBlockHtml).join("");

  const trace = patch.runTrace.length
    ? `<h3>Run trace</h3><ol>${patch.runTrace
        .map((step) => `<li><strong>${encodeHtml(step.label)}:</strong> ${encodeHtml(step.detail)}</li>`)
        .join("")}</ol>`
    : "";

  return `
    <hr/>
    <h2>Notebook action: ${encodeHtml(patch.summary)}</h2>
    ${patch.requiresConfirmation ? "<p><em>Accepted through the notebook action mutation; high-risk graph changes stay reviewable in memory.</em></p>" : ""}
    ${blocks}
    ${entities}
    ${claims}
    ${followUps}
    ${edges}
    ${trace}
  `;
}
