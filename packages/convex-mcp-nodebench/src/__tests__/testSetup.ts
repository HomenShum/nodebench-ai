import { afterAll, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

// Audits persist SQLite results and optional embedding caches. Tests must not
// use a developer's personal stores, including when run directly with npm test.
const storage = vi.hoisted(() => ({ path: "" }));
storage.path = mkdtempSync(join(tmpdir(), "convex-mcp-tests-"));
vi.mock("node:os", async (importOriginal) => ({
  ...await importOriginal<typeof import("node:os")>(),
  homedir: () => storage.path,
}));
for (const name of ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY"]) {
  vi.stubEnv(name, "");
}

afterAll(async () => {
  const { getDb } = await import("../db.js");
  getDb().close();
  const target = resolve(storage.path);
  if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith("convex-mcp-tests-")) {
    throw new Error("Refusing cleanup outside the test's temporary directory");
  }
  rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  vi.unstubAllEnvs();
});
