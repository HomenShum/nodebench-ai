import type {
  ArtifactPacketAction,
  ArtifactPacketContradiction,
  ArtifactPacketPriority,
  ArtifactPacketSeverity,
  ArtifactPacketType,
  FounderArtifactPacket,
  FounderPacketSourceInput,
} from "../types/artifactPacket";

const STORAGE_KEY = "nodebench-founder-artifact-packets";
const ACTIVE_PACKET_KEY = "nodebench-founder-active-artifact-packet-id";
const MAX_HISTORY = 12;

const TYPE_LABELS: Record<ArtifactPacketType, string> = {
  weekly_reset: "Weekly reset",
  pre_delegation: "Pre-delegation",
  important_change: "Important change",
};

const TYPE_AUDIENCES: Record<ArtifactPacketType, string> = {
  weekly_reset: "Founder",
  pre_delegation: "Founder and connected agents",
  important_change: "Founder and immediate collaborators",
};

const TYPE_OBJECTIVES: Record<ArtifactPacketType, string> = {
  weekly_reset: "Re-establish what company you are building, what changed this week, and the next three actions that matter most.",
  pre_delegation: "Package the current business truth so connected agents can execute without rediscovering the story from scratch.",
  important_change: "Assess the material change, surface the contradiction it creates, and compress the response into a decision-ready packet.",
};

const TYPE_FRAMING: Record<ArtifactPacketType, string> = {
  weekly_reset: "Frame the company around the tightest current wedge, the most important operating constraint, and the one move that unlocks the week.",
  pre_delegation: "Frame the company so an agent can act on the highest-leverage work without drifting from mission, wedge, or current constraints.",
  important_change: "Frame the change in terms of what became newly true, what prior assumption broke, and what action prevents drift.",
};

const TYPE_TABLES: Record<ArtifactPacketType, string[]> = {
  weekly_reset: [
    "Initiative | Status | Risk | Next milestone",
    "Contradiction | Severity | Owner | Resolution path",
  ],
  pre_delegation: [
    "Action | Owner | Dependency | Deliverable",
    "Evidence | Source | Why it matters",
  ],
  important_change: [
    "Change | Impact | Response | Deadline",
    "Affected initiative | Current state | Risk",
  ],
};

const TYPE_VISUALS: Record<ArtifactPacketType, string[]> = {
  weekly_reset: ["initiative priority ladder", "weekly change timeline"],
  pre_delegation: ["agent handoff checklist", "dependency map"],
  important_change: ["before vs after assumption map", "risk escalation strip"],
};

function createPacketId(): string {
  return `pkt-${Math.random().toString(36).slice(2, 10)}`;
}

function scoreToPriority(score: number): ArtifactPacketPriority {
  if (score >= 85) return "high";
  if (score >= 70) return "medium";
  return "low";
}

function severityToImpact(severity: ArtifactPacketSeverity): ArtifactPacketPriority {
  return severity;
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function deriveWhatChanged(source: FounderPacketSourceInput): string {
  const topChange = source.changes[0]?.description?.trim();
  if (topChange) return topChange;
  const topMemo = source.dailyMemo.whatMatters[0]?.trim();
  if (topMemo) return topMemo;
  return `${source.company.name} is still clarifying its highest-leverage move.`;
}

function deriveContradictions(source: FounderPacketSourceInput): ArtifactPacketContradiction[] {
  const contradictions: ArtifactPacketContradiction[] = [];
  const hasBlockedCompliance = source.initiatives.some(
    (initiative) => initiative.risk === "high" && initiative.status === "blocked" && /soc 2|compliance/i.test(initiative.title),
  );
  const hasPartnerDependency = source.agents.some((agent) => /soc 2|compliance/i.test(agent.currentGoal));
  const hasFundraisingDelay = source.dailyMemo.unresolved.some((item) => /series a|investor/i.test(item));
  const hasInvestorAction = source.interventions.some((intervention) => /investor|series a|memo/i.test(intervention.title));

  if (source.company.identityConfidence < 0.7) {
    contradictions.push({
      id: "ctr-identity-confidence",
      title: "Identity confidence is still soft",
      detail: `${source.company.name} is moving fast, but the company narrative is still below a strong confidence threshold. Agents can drift if the wedge is not restated explicitly in every packet.`,
      severity: "medium",
    });
  }

  if (hasBlockedCompliance && hasPartnerDependency) {
    contradictions.push({
      id: "ctr-compliance-partner",
      title: "Go-to-market momentum is ahead of compliance readiness",
      detail: "A partnership path is active, but the compliance workstream remains blocked. That creates a mismatch between external commitments and internal readiness.",
      severity: "high",
    });
  }

  if (hasFundraisingDelay && hasInvestorAction) {
    contradictions.push({
      id: "ctr-fundraising-timing",
      title: "Fundraising narrative depends on metrics that are not ready yet",
      detail: "The company still needs stronger proof before investor outreach, yet investor-facing artifacts remain on the action list. The packet should anchor on operational proof, not fundraising velocity.",
      severity: "high",
    });
  }

  if (contradictions.length === 0) {
    contradictions.push({
      id: "ctr-default-focus",
      title: "Focus debt remains the main risk",
      detail: "Multiple active initiatives create execution spread. The packet should force a narrower story so the team and agents do not parallelize too early.",
      severity: "medium",
    });
  }

  return contradictions.slice(0, 3);
}

function deriveEvidence(source: FounderPacketSourceInput): FounderArtifactPacket["keyEvidence"] {
  const changeEvidence = source.changes.slice(0, 3).map((change, index) => ({
    id: `ev-change-${index + 1}`,
    title: change.description,
    detail: change.relativeTime ? `Observed ${change.relativeTime}` : "Observed recently",
    source: change.source ?? change.type ?? "change",
  }));

  const initiativeEvidence = source.initiatives
    .filter((initiative) => initiative.risk === "high")
    .slice(0, 1)
    .map((initiative, index) => ({
      id: `ev-initiative-${index + 1}`,
      title: initiative.title,
      detail: `${initiative.status} initiative with ${initiative.risk} risk`,
      source: "initiative",
    }));

  return dedupeById([...changeEvidence, ...initiativeEvidence]).slice(0, 4);
}

function deriveNextActions(source: FounderPacketSourceInput): ArtifactPacketAction[] {
  return source.interventions
    .slice()
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 3)
    .map((intervention, index) => ({
      id: intervention.id,
      label: intervention.title,
      whyNow: `This action directly supports ${intervention.linkedInitiative} and carries ${Math.round(intervention.confidence * 100)}% confidence.`,
      priority: scoreToPriority(intervention.priorityScore),
      linkedInitiativeId: intervention.linkedInitiativeId,
    }));
}

function deriveOperatingMemo(
  packetType: ArtifactPacketType,
  source: FounderPacketSourceInput,
  whatChanged: string,
  contradictions: ArtifactPacketContradiction[],
  nextActions: ArtifactPacketAction[],
): string {
  const firstContradiction = contradictions[0];
  const firstAction = nextActions[0];

  if (packetType === "pre_delegation") {
    return `${source.company.name} should be framed for agents as ${source.company.wedge.toLowerCase()}, with the current truth anchored on this change: ${whatChanged}. The main contradiction to keep in view is ${firstContradiction.title.toLowerCase()}, and the first delegated move should be ${firstAction?.label.toLowerCase() ?? "the highest-priority unresolved action"}.`;
  }

  if (packetType === "important_change") {
    return `The most important shift for ${source.company.name} is ${whatChanged}. This matters because it sharpens the contradiction around ${firstContradiction.title.toLowerCase()}, which now needs to be handled before the team spreads across lower-leverage work. The packet should keep everyone aligned on ${firstAction?.label.toLowerCase() ?? "the immediate response"}.`;
  }

  return `${source.company.name} is still best understood as ${source.company.canonicalMission.toLowerCase()}, but the company narrative now needs to account for this change: ${whatChanged}. The operating risk is ${firstContradiction.title.toLowerCase()}, so the week should be organized around ${firstAction?.label.toLowerCase() ?? "the top unresolved action"} before anything else expands.`;
}

function deriveAgentInstructions(
  packetType: ArtifactPacketType,
  source: FounderPacketSourceInput,
  nextActions: ArtifactPacketAction[],
  contradictions: ArtifactPacketContradiction[],
): string {
  const actionText = nextActions
    .map((action, index) => `${index + 1}. ${action.label}`)
    .join("\n");
  const contradictionText = contradictions.map((item) => item.title).join("; ");

  return [
    `Act as a focused operator for ${source.company.name}.`,
    `Packet mode: ${TYPE_LABELS[packetType]}.`,
    `Do not drift from this wedge: ${source.company.wedge}.`,
    `Keep this contradiction visible: ${contradictionText}.`,
    "Execute or support these actions in order:",
    actionText,
    "If new evidence conflicts with the packet, surface the contradiction before taking a new branch.",
  ].join("\n");
}

export function buildFounderArtifactPacket(args: {
  packetType: ArtifactPacketType;
  source: FounderPacketSourceInput;
}): FounderArtifactPacket {
  const whatChanged = deriveWhatChanged(args.source);
  const contradictions = deriveContradictions(args.source);
  const keyEvidence = deriveEvidence(args.source);
  const nextActions = deriveNextActions(args.source);
  const generatedAt = new Date().toISOString();

  return {
    packetId: createPacketId(),
    packetType: args.packetType,
    audience: TYPE_AUDIENCES[args.packetType],
    objective: TYPE_OBJECTIVES[args.packetType],
    canonicalEntity: {
      name: args.source.company.name,
      mission: args.source.company.canonicalMission,
      wedge: args.source.company.wedge,
      companyState: args.source.company.companyState,
      foundingMode: args.source.company.foundingMode,
      identityConfidence: args.source.company.identityConfidence,
    },
    nearbyEntities: args.source.nearbyEntities.slice(0, 5),
    whatChanged,
    contradictions,
    risks: dedupeById(
      args.source.initiatives
        .filter((initiative) => initiative.risk === "high")
        .map((initiative, index) => ({
          id: `risk-${initiative.id}-${index}`,
          title: initiative.title,
        }))
        .map((risk) => ({ id: risk.id, label: risk.title })),
    ).map((risk) => risk.label),
    keyEvidence,
    operatingMemo: deriveOperatingMemo(args.packetType, args.source, whatChanged, contradictions, nextActions),
    nextActions,
    recommendedFraming: TYPE_FRAMING[args.packetType],
    tablesNeeded: TYPE_TABLES[args.packetType],
    visualsSuggested: TYPE_VISUALS[args.packetType],
    provenance: {
      generatedAt,
      sourceCount: keyEvidence.length,
      triggerLabel: TYPE_LABELS[args.packetType],
    },
    agentInstructions: deriveAgentInstructions(args.packetType, args.source, nextActions, contradictions),
  };
}

export function getArtifactPacketTypeLabel(packetType: ArtifactPacketType): string {
  return TYPE_LABELS[packetType];
}

export function formatArtifactPacketTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function saveFounderArtifactPacket(packet: FounderArtifactPacket): FounderArtifactPacket[] {
  const packets = loadFounderArtifactPackets();
  const next = [packet, ...packets.filter((item) => item.packetId !== packet.packetId)]
    .sort((a, b) => Date.parse(b.provenance.generatedAt) - Date.parse(a.provenance.generatedAt))
    .slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  localStorage.setItem(ACTIVE_PACKET_KEY, packet.packetId);
  return next;
}

export function loadFounderArtifactPackets(): FounderArtifactPacket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const packets = JSON.parse(raw) as FounderArtifactPacket[];
    if (!Array.isArray(packets)) return [];
    return packets
      .filter((packet) => packet && typeof packet.packetId === "string")
      .sort((a, b) => Date.parse(b.provenance.generatedAt) - Date.parse(a.provenance.generatedAt));
  } catch {
    return [];
  }
}

export function loadActiveFounderArtifactPacket(): FounderArtifactPacket | null {
  const packets = loadFounderArtifactPackets();
  if (packets.length === 0) return null;

  try {
    const activeId = localStorage.getItem(ACTIVE_PACKET_KEY);
    if (!activeId) return packets[0] ?? null;
    return packets.find((packet) => packet.packetId === activeId) ?? packets[0] ?? null;
  } catch {
    return packets[0] ?? null;
  }
}

export function setActiveFounderArtifactPacket(packetId: string): FounderArtifactPacket | null {
  const packets = loadFounderArtifactPackets();
  const match = packets.find((packet) => packet.packetId === packetId) ?? null;
  if (match) {
    localStorage.setItem(ACTIVE_PACKET_KEY, packetId);
  }
  return match;
}

export function artifactPacketToMarkdown(packet: FounderArtifactPacket): string {
  const lines: string[] = [];

  lines.push(`# ${packet.canonicalEntity.name} Artifact Packet`);
  lines.push(`*${getArtifactPacketTypeLabel(packet.packetType)} • ${packet.provenance.generatedAt}*`);
  lines.push("");
  lines.push(`## Objective`);
  lines.push(packet.objective);
  lines.push("");
  lines.push(`## Canonical Entity`);
  lines.push(`- **Mission**: ${packet.canonicalEntity.mission}`);
  lines.push(`- **Core Focus**: ${packet.canonicalEntity.wedge}`);
  const confPct = Math.round(packet.canonicalEntity.identityConfidence * 100);
  lines.push(`- **Identity confidence**: ${confPct > 0 ? `${confPct}%` : "Not set"}`);
  lines.push("");
  lines.push(`## What Changed`);
  lines.push(packet.whatChanged);
  lines.push("");
  lines.push(`## Key Risks`);
  packet.contradictions.forEach((contradiction) => {
    lines.push(`- **${contradiction.title}** (${contradiction.severity}): ${contradiction.detail}`);
  });
  lines.push("");
  lines.push(`## Operating Memo`);
  lines.push(packet.operatingMemo);
  lines.push("");
  lines.push(`## Next Actions`);
  packet.nextActions.forEach((action, index) => {
    lines.push(`${index + 1}. **${action.label}** (${action.priority}) — ${action.whyNow}`);
  });
  lines.push("");
  lines.push(`## Nearby Entities`);
  packet.nearbyEntities.forEach((entity) => {
    lines.push(`- **${entity.name}** (${entity.relationship}) — ${entity.whyItMatters}`);
  });
  lines.push("");
  lines.push(`## Key Evidence`);
  packet.keyEvidence.forEach((evidence) => {
    lines.push(`- **${evidence.title}** — ${evidence.detail} (${evidence.source})`);
  });
  lines.push("");
  // Agent instructions omitted from exports — internal-only

  return lines.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function artifactPacketToHtml(packet: FounderArtifactPacket): string {
  const contradictionRows = packet.contradictions
    .map(
      (item) => `<li><strong>${escapeHtml(item.title)}</strong> <span>(${escapeHtml(item.severity)})</span> — ${escapeHtml(item.detail)}</li>`,
    )
    .join("");
  const actionRows = packet.nextActions
    .map(
      (item, index) => `<li><strong>${index + 1}. ${escapeHtml(item.label)}</strong> — ${escapeHtml(item.whyNow)}</li>`,
    )
    .join("");
  const entityRows = packet.nearbyEntities
    .map(
      (item) => `<li><strong>${escapeHtml(item.name)}</strong> (${escapeHtml(item.relationship)}) — ${escapeHtml(item.whyItMatters)}</li>`,
    )
    .join("");
  const evidenceRows = packet.keyEvidence
    .map(
      (item) => `<li><strong>${escapeHtml(item.title)}</strong> — ${escapeHtml(item.detail)} <span>(${escapeHtml(item.source)})</span></li>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(packet.canonicalEntity.name)} Artifact Packet</title>
<style>
body{font-family:Inter,system-ui,sans-serif;background:#111827;color:#f9fafb;margin:0;padding:40px;line-height:1.6}
main{max-width:900px;margin:0 auto;background:#0f172a;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:32px}
h1,h2{margin:0 0 12px}h1{font-size:32px}h2{font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:#f59e0b;margin-top:28px}
p,li{color:#d1d5db}ul,ol{padding-left:20px}.meta{display:flex;gap:12px;flex-wrap:wrap;color:#9ca3af;font-size:14px}.card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px;margin-top:16px}pre{white-space:pre-wrap;background:#020617;border-radius:12px;padding:16px;color:#cbd5e1}
</style>
</head>
<body>
<main>
<h1>${escapeHtml(packet.canonicalEntity.name)} Intelligence Report</h1>
<div class="meta">
<span>${escapeHtml(getArtifactPacketTypeLabel(packet.packetType))}</span>
<span>${escapeHtml(packet.provenance.generatedAt)}</span>
<span>${Math.round(packet.canonicalEntity.identityConfidence * 100) > 0 ? `${Math.round(packet.canonicalEntity.identityConfidence * 100)}% confidence` : "Getting started"}</span>
</div>
<div class="card">
<h2>Objective</h2>
<p>${escapeHtml(packet.objective)}</p>
<h2>What Changed</h2>
<p>${escapeHtml(packet.whatChanged)}</p>
<h2>Operating Memo</h2>
<p>${escapeHtml(packet.operatingMemo)}</p>
</div>
<div class="card"><h2>Key Risks</h2><ul>${contradictionRows}</ul></div>
<div class="card"><h2>Next Actions</h2><ol>${actionRows}</ol></div>
<div class="card"><h2>Nearby Entities</h2><ul>${entityRows}</ul></div>
<div class="card"><h2>Key Evidence</h2><ul>${evidenceRows}</ul></div>
<div class="card"><h2>Agent Instructions</h2><pre>${escapeHtml(packet.agentInstructions)}</pre></div>
</main>
</body>
</html>`;
}

export function artifactPacketToShareableMemoVariables(packet: FounderArtifactPacket) {
  return packet.contradictions.slice(0, 3).map((contradiction, index) => {
    const direction: "up" | "neutral" | "down" =
      contradiction.severity === "high"
        ? "down"
        : contradiction.severity === "low"
          ? "up"
          : "neutral";

    return {
      rank: index + 1,
      name: contradiction.title,
      direction,
      impact: severityToImpact(contradiction.severity),
    };
  });
}
