import app from "./_searchApp.bundle.mjs";

export const maxDuration = 60;

export default function handler(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  // Map /api/sweep/run → /api/sweep/run, /api/sweep/latest → /api/sweep/latest
  req.url = `/api/sweep${url.pathname.replace(/^\/api\/sweep/, "")}${url.search}`;
  return app(req, res);
}
