export type ExportSection = {
  id: string;
  title: string;
  body: string;
};

export type ExportTimelineItem = {
  title: string;
  summary: string;
  query: string;
  lens: string;
  revision?: number;
  updatedLabel?: string;
  sections: ExportSection[];
  diffs?: Array<{ title: string; status: string; previousBody: string; currentBody: string }>;
};

export type ExportEntityWorkspace = {
  entity: {
    slug: string;
    name: string;
    entityType: string;
    summary: string;
    reportCount: number;
    latestRevision: number;
  };
  note?: { content?: string | null } | null;
  noteDocument?: { markdown?: string | null; plainText?: string | null } | null;
  latest?: ExportTimelineItem | null;
  timeline: ExportTimelineItem[];
  evidence?: Array<{ label: string; type?: string }>;
};

export function buildEntityShareUrl(entitySlug: string) {
  if (typeof window === "undefined") return `/entity/${encodeURIComponent(entitySlug)}`;
  return `${window.location.origin}/entity/${encodeURIComponent(entitySlug)}`;
}

export function buildEntityMarkdown(workspace: ExportEntityWorkspace, selected?: ExportTimelineItem | null) {
  const current = selected ?? workspace.latest ?? workspace.timeline[0] ?? null;
  const sections = current?.sections ?? [];
  const evidence = workspace.evidence ?? [];
  const notes = workspace.noteDocument?.markdown?.trim() || workspace.note?.content?.trim();

  return [
    `# ${workspace.entity.name}`,
    "",
    `${workspace.entity.entityType} memory workspace`,
    "",
    workspace.entity.summary,
    "",
    current ? `Revision ${current.revision ?? workspace.entity.latestRevision} | ${current.updatedLabel ?? "Latest"}` : "",
    "",
    notes ? "## Working notes" : "",
    notes ?? "",
    "",
    ...sections.flatMap((section) => [`## ${section.title}`, section.body, ""]),
    evidence.length ? "## Evidence" : "",
    ...evidence.map((item) => `- ${item.label}${item.type ? ` (${item.type})` : ""}`),
    "",
    `Share: ${buildEntityShareUrl(workspace.entity.slug)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildOutreachDraft(workspace: ExportEntityWorkspace, selected?: ExportTimelineItem | null) {
  const current = selected ?? workspace.latest ?? workspace.timeline[0] ?? null;
  const why = current?.sections.find((section) => section.id === "why-it-matters")?.body ?? current?.summary ?? workspace.entity.summary;
  const next = current?.sections.find((section) => section.id === "what-to-do-next")?.body ?? "Would like to compare notes and understand what changed most recently.";

  return [
    `Subject: ${workspace.entity.name} follow-up`,
    "",
    `Hi,`,
    "",
    `I have been keeping a running NodeBench memory on ${workspace.entity.name}. The current read is: ${why}`,
    "",
    `The next step I am focused on is: ${next}`,
    "",
    `If useful, I can share the full report page here: ${buildEntityShareUrl(workspace.entity.slug)}`,
    "",
    `Best,`,
  ].join("\n");
}

export function buildCrmSummary(workspace: ExportEntityWorkspace, selected?: ExportTimelineItem | null) {
  const current = selected ?? workspace.latest ?? workspace.timeline[0] ?? null;
  const what = current?.sections.find((section) => section.id === "what-it-is")?.body ?? workspace.entity.summary;
  const risks = current?.sections.find((section) => section.id === "what-is-missing")?.body ?? "";
  const next = current?.sections.find((section) => section.id === "what-to-do-next")?.body ?? "";

  return JSON.stringify(
    {
      entity: workspace.entity.name,
      slug: workspace.entity.slug,
      type: workspace.entity.entityType,
      revision: current?.revision ?? workspace.entity.latestRevision,
      summary: what,
      risks,
      nextAction: next,
      notes: workspace.noteDocument?.plainText ?? workspace.note?.content ?? "",
      shareUrl: buildEntityShareUrl(workspace.entity.slug),
    },
    null,
    2,
  );
}
