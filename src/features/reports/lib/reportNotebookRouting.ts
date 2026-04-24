export function buildReportNotebookPath(reportId: string) {
  const id = reportId.trim() || "new";
  return `/reports/${encodeURIComponent(id)}/notebook`;
}

export function getReportNotebookIdFromPath(pathname: string) {
  const match = pathname.match(/^\/reports\/([^/]+)\/notebook\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
