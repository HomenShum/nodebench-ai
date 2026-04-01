import app from "./_searchApp.bundle.mjs";

export const maxDuration = 60;

export default function handler(req, res) {
  // Vercel rewrites /api/sweep/*, /api/search/insights, etc. to this function.
  // The x-matched-path header contains the original requested path.
  // Pass it through so Express routes correctly.
  const matched = req.headers["x-matched-path"] || req.url || "/";
  const url = new URL(matched, "http://localhost");

  // If this is a rewrite from /api/sweep/*, preserve that path
  if (matched.includes("/sweep/")) {
    req.url = matched;
  } else if (matched.includes("/search/insights")) {
    req.url = "/insights";
  } else {
    // Default: strip to just query string (for POST /api/search)
    req.url = `/${url.search}`;
  }
  return app(req, res);
}
