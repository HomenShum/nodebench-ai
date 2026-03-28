import app from "../../_searchApp.bundle.mjs";

export const maxDuration = 10;

export default function handler(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const userId = req.query?.userId;
  const resolvedUserId = Array.isArray(userId) ? userId[0] : userId;
  req.url = `/sync-bridge/accounts/${encodeURIComponent(resolvedUserId ?? "")}${url.search}`;
  return app(req, res);
}
