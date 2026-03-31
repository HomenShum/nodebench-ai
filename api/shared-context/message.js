import app from "../_searchApp.bundle.mjs";

export const maxDuration = 10;

export default function handler(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  // GET with ?room=CODE → route to /shared-context/room/:code
  const roomCode = url.searchParams.get("room");
  if (req.method === "GET" && roomCode) {
    req.url = `/shared-context/room/${encodeURIComponent(roomCode)}`;
    return app(req, res);
  }
  // POST → route to /shared-context/message
  req.url = `/shared-context/message${url.search}`;
  return app(req, res);
}
