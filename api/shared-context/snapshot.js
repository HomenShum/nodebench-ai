import app from "../_searchApp.bundle.mjs";

export const maxDuration = 10;

export default function handler(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const requestedPath = Array.isArray(req.query?.__nb_shared_context_path)
    ? req.query.__nb_shared_context_path[0]
    : req.query?.__nb_shared_context_path;
  const passthroughPath = Array.isArray(req.query?.__nb_passthrough_path)
    ? req.query.__nb_passthrough_path[0]
    : req.query?.__nb_passthrough_path;
  const internalPath = passthroughPath
    ? `/${passthroughPath}`
    : requestedPath
      ? `/shared-context/${requestedPath}`
      : "/shared-context/snapshot";
  const params = new URLSearchParams(url.searchParams);
  params.delete("__nb_shared_context_path");
  params.delete("__nb_passthrough_path");
  const qs = params.toString();
  req.url = internalPath + (qs ? `?${qs}` : "");
  return app(req, res);
}
