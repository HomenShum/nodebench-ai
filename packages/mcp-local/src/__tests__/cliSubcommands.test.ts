/**
 * CLI Subcommand tests — integration via child process spawn.
 * Tests the 5 subcommands: discover, setup, workflow, quickref, call
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const PKG_DIR = resolve(import.meta.dirname, "../..");

/** Run CLI and capture both stdout + stderr regardless of exit code */
const cli = (args: string) => {
  const result = spawnSync("npx", ["tsx", "src/index.ts", ...args.split(/\s+/)], {
    cwd: PKG_DIR,
    encoding: "utf-8",
    timeout: 20_000,
    shell: true,
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    code: result.status ?? 1,
    /** Combined stdout + stderr for easy searching */
    all: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
};

describe.skip("CLI Subcommands", { timeout: 25_000 }, () => {
  // ── discover ──────────────────────────────────────────────────────────
  describe("discover", () => {
    it("returns ranked results for a security query", () => {
      const { all, code } = cli("--no-embedding discover security audit");
      expect(code).toBe(0);
      expect(all).toContain("Discover:");
      expect(all).toContain("security");
      expect(all).toMatch(/\d+ matches/);
    });

    it("respects --preset filtering", () => {
      const { all, code } = cli("--no-embedding --preset web_dev discover screenshot");
      expect(code).toBe(0);
      expect(all).toContain("screenshot");
      expect(all).toMatch(/ui_capture|vision|ui_ux_dive/);
    });

    it("shows matching workflows", () => {
      const { all, code } = cli("--no-embedding discover security audit");
      expect(code).toBe(0);
      expect(all).toContain("Matching Workflows");
      expect(all).toContain("security_audit");
    });

    it("exits 1 without a query", () => {
      const { code, all } = cli("--no-embedding discover");
      expect(code).toBe(1);
      expect(all).toContain("Usage:");
    });
  });

  // ── workflow ──────────────────────────────────────────────────────────
  describe("workflow", () => {
    it("lists all workflows", () => {
      const { all, code } = cli("workflow list");
      expect(code).toBe(0);
      expect(all).toContain("Available Workflows");
      expect(all).toContain("new_feature");
      expect(all).toContain("security_audit");
      expect(all).toContain("email_assistant");
    });

    it("shows steps for a specific workflow", () => {
      const { all, code } = cli("workflow fix_bug");
      expect(code).toBe(0);
      expect(all).toContain("Workflow:");
      expect(all).toContain("Step 1");
      expect(all).toContain("search_all_knowledge");
    });

    it("shows error for unknown workflow", () => {
      const { all } = cli("workflow nonexistent_workflow");
      expect(all).toContain("Error:");
      expect(all).toContain("Unknown chain");
    });
  });

  // ── quickref ──────────────────────────────────────────────────────────
  describe("quickref", () => {
    it("shows tool info", () => {
      const { all, code } = cli("quickref run_recon");
      expect(code).toBe(0);
      expect(all).toContain("run_recon");
      expect(all).toContain("Next action:");
      expect(all).toContain("Next tools:");
    });

    it("shows graph neighbors at depth 2", () => {
      const { all, code } = cli("quickref run_recon --depth 2");
      expect(code).toBe(0);
      expect(all).toContain("Related tools");
      expect(all).toContain("hop 1");
      expect(all).toContain("hop 2");
    });

    it("shows didYouMean for unknown tool", () => {
      const { all } = cli("quickref recon");
      expect(all).toContain("Did you mean:");
    });
  });

  // ── setup ─────────────────────────────────────────────────────────────
  describe("setup", () => {
    it("shows domain readiness report", () => {
      const { all, code } = cli("setup");
      expect(code).toBe(0);
      expect(all).toContain("NodeBench MCP Setup Status");
      expect(all).toContain("domains ready");
      expect(all).toMatch(/web|vision|github|llm|embedding/);
    });
  });

  // ── call ──────────────────────────────────────────────────────────────
  describe("call", () => {
    it("calls a tool and returns JSON", () => {
      const { stdout, code } = cli('call getMethodology --args "{\\"topic\\": \\"overview\\"}"');
      expect(code).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.title).toContain("Overview");
    });

    it("exits 1 for unknown tool", () => {
      const { code, all } = cli("call nonexistent_tool_xyz");
      expect(code).toBe(1);
      expect(all).toContain("Unknown tool");
    });

    it("exits 1 for invalid --args JSON", () => {
      const { code, all } = cli("call getMethodology --args not-json");
      expect(code).toBe(1);
      expect(all).toContain("Invalid JSON");
    });
  });

  // ── help ──────────────────────────────────────────────────────────────
  describe("help text", () => {
    it("includes subcommand section", () => {
      const { all } = cli("--help");
      expect(all).toContain("Subcommands:");
      expect(all).toContain("discover <query>");
      expect(all).toContain("workflow <name|list>");
      expect(all).toContain("quickref <tool>");
      expect(all).toContain("call <tool>");
    });
  });
});
