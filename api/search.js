import app from "./_searchApp.bundle.mjs";

export const maxDuration = 60;

export default function handler(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  req.url = `/${url.search}`;
  return app(req, res);
}
