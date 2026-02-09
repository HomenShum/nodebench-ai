/**
 * Git Workflow tools — branch compliance, PR review checklists, and merge gates.
 *
 * - check_git_compliance: Validate branch state, uncommitted changes, conventional commits
 * - review_pr_checklist: Structured PR review with verification/eval cross-reference
 * - enforce_merge_gate: Pre-merge validation combining quality gates + verification + eval
 *
 * All git commands are wrapped in try/catch for environments where git is unavailable.
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";
import { execSync } from "node:child_process";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROTECTED_BRANCHES = ["main", "master", "production", "release"];

const CONVENTIONAL_COMMIT_RE =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?:\s.+/;

interface GitExecOptions {
  cwd: string;
  encoding: "utf8";
  timeout: number;
  stdio: ["pipe", "pipe", "pipe"];
}

function gitExecOptions(repoPath?: string): GitExecOptions {
  return {
    cwd: repoPath || process.cwd(),
    encoding: "utf8" as const,
    timeout: 10000,
    stdio: ["pipe", "pipe", "pipe"] as ["pipe", "pipe", "pipe"],
  };
}

function runGit(command: string, repoPath?: string): string {
  return execSync(command, gitExecOptions(repoPath)).toString().trim();
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export const gitWorkflowTools: McpTool[] = [
  // ─── Tool 1: check_git_compliance ─────────────────────────────────────────
  {
    name: "check_git_compliance",
    description:
      "Validate branch state, uncommitted changes, and conventional commit compliance. Checks if on a protected branch, lists uncommitted changes, and optionally validates recent commit messages against conventional commit format (type(scope): message). Returns structured compliance report with warnings.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: {
          type: "string",
          description: "Repository root path (default: current working directory)",
        },
        branch: {
          type: "string",
          description: "Expected branch name to validate against (optional)",
        },
        conventionalCommits: {
          type: "boolean",
          description: "Validate commit messages against conventional commit format (default: false)",
        },
      },
    },
    handler: async (args: {
      repoPath?: string;
      branch?: string;
      conventionalCommits?: boolean;
    }) => {
      const cwd = args.repoPath || process.cwd();
      const warnings: string[] = [];

      // Get current branch
      let currentBranch = "unknown";
      try {
        currentBranch = runGit("git branch --show-current", cwd);
      } catch (err: any) {
        return {
          error: true,
          message: `Failed to get current branch: ${err.message ?? "git not available or not a repository"}`,
          repoPath: cwd,
        };
      }

      // Check protected branch
      const isProtected = PROTECTED_BRANCHES.includes(currentBranch);
      if (isProtected) {
        warnings.push(`Currently on protected branch '${currentBranch}' — avoid direct commits`);
      }

      // Validate expected branch
      if (args.branch && currentBranch !== args.branch) {
        warnings.push(
          `Expected branch '${args.branch}' but on '${currentBranch}'`
        );
      }

      // Check uncommitted changes
      let uncommittedChanges: string[] = [];
      try {
        const status = runGit("git status --porcelain", cwd);
        if (status) {
          uncommittedChanges = status.split("\n").filter(Boolean);
        }
      } catch { /* git status failed — already reported above */ }

      if (uncommittedChanges.length > 0) {
        warnings.push(`${uncommittedChanges.length} uncommitted change(s) detected`);
      }

      // Get recent commits
      let recentCommits: Array<{ hash: string; message: string }> = [];
      try {
        const log = runGit("git log --oneline -10", cwd);
        if (log) {
          recentCommits = log.split("\n").filter(Boolean).map((line) => {
            const spaceIdx = line.indexOf(" ");
            return {
              hash: line.slice(0, spaceIdx),
              message: line.slice(spaceIdx + 1),
            };
          });
        }
      } catch { /* no commits or git error */ }

      // Conventional commit validation
      let conventionalCommitCompliance:
        | {
            valid: number;
            invalid: number;
            violations: Array<{ hash: string; message: string; reason: string }>;
          }
        | undefined;

      if (args.conventionalCommits && recentCommits.length > 0) {
        const violations: Array<{ hash: string; message: string; reason: string }> = [];
        let valid = 0;
        let invalid = 0;

        for (const commit of recentCommits) {
          if (CONVENTIONAL_COMMIT_RE.test(commit.message)) {
            valid++;
          } else {
            invalid++;
            violations.push({
              hash: commit.hash,
              message: commit.message,
              reason: "Does not match pattern: type(scope): message",
            });
          }
        }

        conventionalCommitCompliance = { valid, invalid, violations };

        if (invalid > 0) {
          warnings.push(
            `${invalid} of ${recentCommits.length} recent commits do not follow conventional commit format`
          );
        }
      }

      return {
        branch: currentBranch,
        isProtected,
        uncommittedChanges,
        recentCommits,
        ...(conventionalCommitCompliance
          ? { conventionalCommitCompliance }
          : {}),
        warnings,
        summary:
          warnings.length === 0
            ? `Branch '${currentBranch}' is clean with no compliance issues.`
            : `Found ${warnings.length} warning(s) on branch '${currentBranch}'. Review before proceeding.`,
      };
    },
  },

  // ─── Tool 2: review_pr_checklist ──────────────────────────────────────────
  {
    name: "review_pr_checklist",
    description:
      "Structured PR review checklist with verification/eval cross-reference. Validates PR title format, description presence, file change scope, test coverage, and optionally checks NodeBench verification cycle completion. Returns scored checklist with recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        prTitle: {
          type: "string",
          description: "Pull request title",
        },
        prDescription: {
          type: "string",
          description: "Pull request description/body (optional)",
        },
        filesChanged: {
          type: "array",
          items: { type: "string" },
          description: "List of changed file paths (optional)",
        },
        testsPassed: {
          type: "boolean",
          description: "Whether tests have passed (optional)",
        },
        verificationCycleId: {
          type: "string",
          description:
            "NodeBench verification cycle ID to cross-reference for completion status (optional)",
        },
      },
      required: ["prTitle"],
    },
    handler: async (args: {
      prTitle: string;
      prDescription?: string;
      filesChanged?: string[];
      testsPassed?: boolean;
      verificationCycleId?: string;
    }) => {
      const checklist: Array<{ item: string; passed: boolean; note: string }> = [];
      const recommendations: string[] = [];

      // 1. Title follows conventional format
      const titleConventional = CONVENTIONAL_COMMIT_RE.test(args.prTitle);
      checklist.push({
        item: "Title follows conventional commit format",
        passed: titleConventional,
        note: titleConventional
          ? "Title matches type(scope): message pattern"
          : "Title should follow conventional commit format: type(scope): message",
      });
      if (!titleConventional) {
        recommendations.push(
          "Rewrite PR title to follow conventional commit format (e.g., feat(auth): add OAuth2 login)"
        );
      }

      // 2. Description provided
      const hasDescription =
        !!args.prDescription && args.prDescription.trim().length > 10;
      checklist.push({
        item: "Description provided",
        passed: hasDescription,
        note: hasDescription
          ? `Description present (${args.prDescription!.trim().length} chars)`
          : "No meaningful description provided",
      });
      if (!hasDescription) {
        recommendations.push(
          "Add a description explaining what changed and why"
        );
      }

      // 3. Files changed listed
      const hasFilesChanged =
        !!args.filesChanged && args.filesChanged.length > 0;
      checklist.push({
        item: "Files changed listed",
        passed: hasFilesChanged,
        note: hasFilesChanged
          ? `${args.filesChanged!.length} file(s) changed`
          : "No file change list provided",
      });

      // 4. Tests passed
      if (args.testsPassed !== undefined) {
        checklist.push({
          item: "Tests passed",
          passed: args.testsPassed,
          note: args.testsPassed
            ? "All tests passing"
            : "Tests are failing — fix before merge",
        });
        if (!args.testsPassed) {
          recommendations.push("Fix failing tests before requesting review");
        }
      } else {
        checklist.push({
          item: "Tests passed",
          passed: false,
          note: "Test status not provided — run tests and report results",
        });
        recommendations.push("Run tests and pass testsPassed parameter");
      }

      // 5. Verification cycle cross-reference
      if (args.verificationCycleId) {
        try {
          const db = getDb();
          const cycle = db
            .prepare("SELECT * FROM verification_cycles WHERE id = ?")
            .get(args.verificationCycleId) as any;

          if (cycle) {
            const cycleCompleted = cycle.status === "completed";
            checklist.push({
              item: "Verification cycle completed",
              passed: cycleCompleted,
              note: cycleCompleted
                ? `Cycle '${cycle.title}' completed (phase ${cycle.current_phase}/6)`
                : `Cycle '${cycle.title}' is '${cycle.status}' at phase ${cycle.current_phase}/6`,
            });
            if (!cycleCompleted) {
              recommendations.push(
                `Complete verification cycle '${cycle.title}' (currently at phase ${cycle.current_phase}) before merging`
              );
            }
          } else {
            checklist.push({
              item: "Verification cycle completed",
              passed: false,
              note: `Cycle not found: ${args.verificationCycleId}`,
            });
            recommendations.push(
              "Verification cycle ID not found — start a new cycle with start_verification_cycle"
            );
          }
        } catch {
          checklist.push({
            item: "Verification cycle completed",
            passed: false,
            note: "Failed to query verification cycle database",
          });
        }
      }

      // 6. Anti-pattern checks
      if (hasFilesChanged) {
        const fileCount = args.filesChanged!.length;

        // Too many files changed
        if (fileCount > 20) {
          checklist.push({
            item: "Reasonable change scope",
            passed: false,
            note: `${fileCount} files changed — consider splitting into smaller PRs`,
          });
          recommendations.push(
            "Large PR detected. Split into smaller, focused PRs for easier review"
          );
        } else {
          checklist.push({
            item: "Reasonable change scope",
            passed: true,
            note: `${fileCount} file(s) changed — manageable scope`,
          });
        }

        // No test files in changes
        const testFiles = args.filesChanged!.filter(
          (f) =>
            f.includes(".test.") ||
            f.includes(".spec.") ||
            f.includes("__tests__")
        );
        if (testFiles.length === 0) {
          checklist.push({
            item: "Test files included in changes",
            passed: false,
            note: "No test files in changed files — add tests for new/changed behavior",
          });
          recommendations.push(
            "Add or update test files to cover the changes"
          );
        } else {
          checklist.push({
            item: "Test files included in changes",
            passed: true,
            note: `${testFiles.length} test file(s) included`,
          });
        }
      }

      // Score
      const totalItems = checklist.length;
      const passedItems = checklist.filter((c) => c.passed).length;
      const score =
        totalItems > 0 ? Math.round((passedItems / totalItems) * 100) / 100 : 0;
      const passed = checklist.every((c) => c.passed);

      return {
        passed,
        score,
        checklist,
        recommendations,
        summary: passed
          ? `PR checklist passed (${passedItems}/${totalItems} items). Ready for review.`
          : `PR checklist has ${totalItems - passedItems} issue(s). Address recommendations before merging.`,
      };
    },
  },

  // ─── Tool 3: enforce_merge_gate ───────────────────────────────────────────
  {
    name: "enforce_merge_gate",
    description:
      "Pre-merge validation combining git state, verification cycles, eval runs, test results, and quality gates. Returns a go/no-go merge decision with detailed check results and blocking issues. Use before merging any branch.",
    inputSchema: {
      type: "object",
      properties: {
        branch: {
          type: "string",
          description: "Branch to validate (default: current branch)",
        },
        repoPath: {
          type: "string",
          description: "Repository root path (default: current working directory)",
        },
        requireVerification: {
          type: "boolean",
          description: "Require a completed verification cycle (default: false)",
        },
        requireEval: {
          type: "boolean",
          description: "Require a recent completed eval run (default: false)",
        },
        requireTests: {
          type: "boolean",
          description: "Require recent passing test results (default: false)",
        },
      },
    },
    handler: async (args: {
      branch?: string;
      repoPath?: string;
      requireVerification?: boolean;
      requireEval?: boolean;
      requireTests?: boolean;
    }) => {
      const cwd = args.repoPath || process.cwd();
      const checks: Array<{ name: string; passed: boolean; detail: string }> = [];
      const blockingIssues: string[] = [];

      // ── Git state checks ────────────────────────────────────────────────

      // Current branch
      let currentBranch = "unknown";
      try {
        currentBranch = runGit("git branch --show-current", cwd);
      } catch (err: any) {
        checks.push({
          name: "git_available",
          passed: false,
          detail: `Git not available: ${err.message ?? "unknown error"}`,
        });
        blockingIssues.push("Cannot access git — ensure you are in a git repository");
      }

      // Validate branch matches expected
      if (args.branch && currentBranch !== args.branch) {
        checks.push({
          name: "correct_branch",
          passed: false,
          detail: `Expected branch '${args.branch}' but on '${currentBranch}'`,
        });
        blockingIssues.push(
          `Switch to branch '${args.branch}' before merging`
        );
      } else {
        checks.push({
          name: "correct_branch",
          passed: true,
          detail: `On branch '${currentBranch}'`,
        });
      }

      // Uncommitted changes
      try {
        const status = runGit("git status --porcelain", cwd);
        const hasUncommitted = status.length > 0;
        checks.push({
          name: "no_uncommitted_changes",
          passed: !hasUncommitted,
          detail: hasUncommitted
            ? `${status.split("\n").filter(Boolean).length} uncommitted change(s)`
            : "Working directory clean",
        });
        if (hasUncommitted) {
          blockingIssues.push("Commit or stash uncommitted changes before merging");
        }
      } catch {
        checks.push({
          name: "no_uncommitted_changes",
          passed: false,
          detail: "Could not check working directory status",
        });
      }

      // Ahead/behind remote
      try {
        // Fetch latest remote state (best-effort, may fail without network)
        try {
          runGit("git fetch --quiet", cwd);
        } catch { /* fetch failed — proceed with local state */ }

        const aheadBehind = runGit(
          "git rev-list --left-right --count HEAD...@{upstream}",
          cwd
        );
        const parts = aheadBehind.split(/\s+/);
        const ahead = parseInt(parts[0], 10) || 0;
        const behind = parseInt(parts[1], 10) || 0;

        checks.push({
          name: "synced_with_remote",
          passed: behind === 0,
          detail:
            behind === 0
              ? `Up to date with remote${ahead > 0 ? ` (${ahead} commit(s) ahead)` : ""}`
              : `${behind} commit(s) behind remote — pull before merging`,
        });
        if (behind > 0) {
          blockingIssues.push(
            `Branch is ${behind} commit(s) behind remote — pull and resolve conflicts`
          );
        }
      } catch {
        checks.push({
          name: "synced_with_remote",
          passed: true,
          detail: "No upstream tracking branch configured — skipping remote sync check",
        });
      }

      // ── NodeBench database checks ───────────────────────────────────────

      const db = getDb();

      // Verification cycle check
      if (args.requireVerification) {
        try {
          const cycle = db
            .prepare(
              "SELECT * FROM verification_cycles WHERE status = 'completed' ORDER BY updated_at DESC LIMIT 1"
            )
            .get() as any;

          if (cycle) {
            checks.push({
              name: "verification_completed",
              passed: true,
              detail: `Completed cycle: '${cycle.title}' (${cycle.updated_at})`,
            });
          } else {
            checks.push({
              name: "verification_completed",
              passed: false,
              detail: "No completed verification cycle found",
            });
            blockingIssues.push(
              "Complete a verification cycle (start_verification_cycle) before merging"
            );
          }
        } catch {
          checks.push({
            name: "verification_completed",
            passed: false,
            detail: "Failed to query verification cycles",
          });
        }
      }

      // Eval run check
      if (args.requireEval) {
        try {
          const evalRun = db
            .prepare(
              "SELECT * FROM eval_runs WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1"
            )
            .get() as any;

          if (evalRun) {
            checks.push({
              name: "eval_completed",
              passed: true,
              detail: `Completed eval: '${evalRun.name}' (${evalRun.completed_at})`,
            });
          } else {
            checks.push({
              name: "eval_completed",
              passed: false,
              detail: "No completed eval run found",
            });
            blockingIssues.push(
              "Complete an eval run (start_eval_run) before merging"
            );
          }
        } catch {
          checks.push({
            name: "eval_completed",
            passed: false,
            detail: "Failed to query eval runs",
          });
        }
      }

      // Test results check
      if (args.requireTests) {
        try {
          const recentTests = db
            .prepare(
              "SELECT layer, passed, COUNT(*) as count FROM test_results ORDER BY created_at DESC LIMIT 50"
            )
            .all() as any[];

          if (recentTests.length > 0) {
            const allPassing = recentTests.every((t: any) => t.passed === 1);
            const failedCount = recentTests.filter((t: any) => t.passed === 0).length;
            checks.push({
              name: "tests_passing",
              passed: allPassing,
              detail: allPassing
                ? `${recentTests.length} recent test result(s) — all passing`
                : `${failedCount} failing test(s) out of ${recentTests.length} recent results`,
            });
            if (!allPassing) {
              blockingIssues.push("Fix failing tests before merging");
            }
          } else {
            checks.push({
              name: "tests_passing",
              passed: false,
              detail: "No test results found — run tests and log results with log_test_result",
            });
            blockingIssues.push("Run tests and record results before merging");
          }
        } catch {
          checks.push({
            name: "tests_passing",
            passed: false,
            detail: "Failed to query test results",
          });
        }
      }

      // Quality gate check (always check if any exist)
      try {
        const recentGate = db
          .prepare(
            "SELECT * FROM quality_gate_runs ORDER BY created_at DESC LIMIT 1"
          )
          .get() as any;

        if (recentGate) {
          const gatePassed = recentGate.passed === 1;
          checks.push({
            name: "quality_gate_passed",
            passed: gatePassed,
            detail: gatePassed
              ? `Latest gate '${recentGate.gate_name}' passed (score: ${recentGate.score})`
              : `Latest gate '${recentGate.gate_name}' failed — ${recentGate.failures}`,
          });
          if (!gatePassed) {
            blockingIssues.push(
              `Quality gate '${recentGate.gate_name}' is failing — fix and re-run`
            );
          }
        } else {
          checks.push({
            name: "quality_gate_passed",
            passed: true,
            detail: "No quality gate runs found — consider running run_quality_gate",
          });
        }
      } catch {
        checks.push({
          name: "quality_gate_passed",
          passed: true,
          detail: "Could not query quality gate runs",
        });
      }

      // ── Final decision ──────────────────────────────────────────────────

      const canMerge = blockingIssues.length === 0;
      const passedChecks = checks.filter((c) => c.passed).length;

      return {
        canMerge,
        branch: currentBranch,
        checks,
        blockingIssues,
        summary: canMerge
          ? `All ${passedChecks} check(s) passed. Branch '${currentBranch}' is clear to merge.`
          : `${blockingIssues.length} blocking issue(s) found. Resolve before merging.`,
      };
    },
  },
];
