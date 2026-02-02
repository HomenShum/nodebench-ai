import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initVault } from "../init-vault";
import { runVaultHealthCheck } from "../health-check";

function write(filePath: string, content: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

describe("vault health check", () => {
  test("passes on minimal valid note", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nb-vault-"));
    const cwd = process.cwd();
    process.chdir(tmp);
    try {
      initVault("vault");
      const note = [
        "---",
        "noteId: note-1",
        "title: Test",
        "createdAtIso: 2026-02-01T00:00:00.000Z",
        "updatedAtIso: 2026-02-01T00:00:00.000Z",
        "sources: https://example.com",
        "---",
        "",
        "hello",
      ].join("\n");
      write(path.join(tmp, "vault", "users", "alice", "notes", "note-1.md"), note);
      const report = runVaultHealthCheck("vault");
      expect(report.ok).toBe(true);
    } finally {
      process.chdir(cwd);
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("fails on broken wikilink and naming violation", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nb-vault-"));
    const cwd = process.cwd();
    process.chdir(tmp);
    try {
      initVault("vault");
      const note = [
        "---",
        "noteId: note-2",
        "title: Test",
        "createdAtIso: 2026-02-01T00:00:00.000Z",
        "updatedAtIso: 2026-02-01T00:00:00.000Z",
        "sources: https://example.com",
        "---",
        "",
        "see [[missing-note]]",
      ].join("\n");
      write(path.join(tmp, "vault", "users", "bob", "notes", "Bad Name.md"), note);
      const report = runVaultHealthCheck("vault");
      expect(report.ok).toBe(false);
      expect(report.stats.brokenWikilinks).toBe(1);
      expect(report.stats.namingViolations).toBeGreaterThan(0);
    } finally {
      process.chdir(cwd);
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

