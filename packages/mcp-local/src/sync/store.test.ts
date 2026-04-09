/**
 * @vitest-environment node
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("upsertDurableObject FTS recovery", () => {
  let tempDir = "";

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "nodebench-store-"));
    process.env.NODEBENCH_DATA_DIR = tempDir;
    vi.resetModules();
  });

  afterEach(() => {
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Windows can hold SQLite handles briefly.
      }
    }
  });

  it("repairs object_nodes_fts and retries the write when the FTS table is missing", async () => {
    const { getDb } = await import("../db.js");
    const { upsertDurableObject } = await import("./store.js");

    const db = getDb();
    db.exec("DROP TABLE IF EXISTS object_nodes_fts");

    const result = upsertDurableObject({
      kind: "search_run",
      label: "Anthropic founder search",
      metadata: { query: "Anthropic" },
      queueForSync: false,
    });

    expect(result.objectId).toBeTruthy();
    const nodeRow = db.prepare("SELECT label FROM object_nodes WHERE id = ?").get(result.objectId) as { label: string } | undefined;
    expect(nodeRow?.label).toBe("Anthropic founder search");

    const ftsCount = db.prepare("SELECT COUNT(*) as c FROM object_nodes_fts").get() as { c: number };
    expect(ftsCount.c).toBeGreaterThanOrEqual(1);
  });
});
