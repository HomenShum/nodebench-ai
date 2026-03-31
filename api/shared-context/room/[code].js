import app from "../../_searchApp.bundle.mjs";

export const maxDuration = 10;

export default function handler(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const code = url.pathname.split("/").pop() || "";
  req.url = `/shared-context/room/${code}${url.search}`;
  return app(req, res);
}
