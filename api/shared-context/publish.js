import app from "../_searchApp.bundle.mjs";

export const maxDuration = 10;

export default function handler(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  req.url = `/shared-context/publish${url.search}`;
  return app(req, res);
}
