import app from "./_searchApp.bundle.mjs";

export const maxDuration = 60;

export default function handler(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  // Vercel rewrites /api/harness/:path* → /api/harness with path in query
  // Reconstruct: /harness/{path segments}
  const pathSegments = req.query?.path;
  let internalPath = "/harness";
  if (Array.isArray(pathSegments)) {
    internalPath = `/harness/${pathSegments.join("/")}`;
  } else if (typeof pathSegments === "string" && pathSegments) {
    internalPath = `/harness/${pathSegments}`;
  }
  // Preserve non-path query params
  const params = new URLSearchParams(url.searchParams);
  params.delete("path");
  const qs = params.toString();
  req.url = internalPath + (qs ? `?${qs}` : "");
  return app(req, res);
}
