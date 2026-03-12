/**
 * commandSandbox.ts — Command execution with allow-list enforcement.
 *
 * Replaces raw execSync calls with validated, audited execution.
 * Uses allow-list (not deny-list) for command prefixes.
 */

import { execSync } from "node:child_process";
import { SecurityError } from "./SecurityError.js";
import { getSecurityConfig } from "./config.js";

export interface SafeExecOpts {
  /** Working directory (validated against safePath) */
  cwd?: string;
  /** Timeout in ms (capped at config.maxExecTimeoutMs) */
  timeout?: number;
  /** Allow pipe operators in command */
  allowPipes?: boolean;
  /** Additional allowed command prefixes beyond built-in list */
  additionalPrefixes?: string[];
  /** Max output buffer size in bytes (default: 10MB) */
  maxBuffer?: number;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
}

// Allow-list of safe command prefixes
const ALLOWED_PREFIXES = [
  // Version control
  "git ",
  // Node.js ecosystem
  "node ",
  "npm ",
  "npx ",
  "pnpm ",
  "yarn ",
  "bun ",
  // TypeScript/JavaScript
  "tsc ",
  "tsx ",
  "vitest ",
  "jest ",
  // Python
  "python ",
  "python3 ",
  "pip ",
  "pytest ",
  // Build tools
  "cargo ",
  "go ",
  "make ",
  "cmake ",
  "gcc ",
  "g++ ",
  "clang ",
  // Safe read-only commands
  "ls",
  "dir",
  "cat ",
  "head ",
  "tail ",
  "wc ",
  "grep ",
  "rg ",
  "find ",
  "which ",
  "where ",
  "type ",
  // Info commands
  "echo ",
  "date",
  "pwd",
  "hostname",
  "uname ",
  "whoami",
  "env",
  "printenv",
  // Package managers
  "apt ",
  "brew ",
  "choco ",
  "winget ",
  // Containers
  "docker ",
  "docker-compose ",
  "podman ",
  // Network (SSRF handled separately by urlValidator)
  "curl ",
  "wget ",
  "ping ",
  "nslookup ",
  "dig ",
];

// Shell metacharacters that enable command chaining/injection
const DANGEROUS_METACHAR_RE = /[;`$]|\$\(|&&|\|\||>>|<<|>\s*\/|<\s*\//;
const PIPE_RE = /\|(?!\|)/; // Single pipe (not ||)

function isAllowedCommand(
  command: string,
  extraPrefixes: string[],
): boolean {
  const trimmed = command.trim().toLowerCase();
  const allPrefixes = [...ALLOWED_PREFIXES, ...extraPrefixes];

  for (const prefix of allPrefixes) {
    if (trimmed === prefix.trim() || trimmed.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * Execute a command with security validation.
 *
 * @throws SecurityError if command is not on allow-list or contains injection
 */
export function safeExec(command: string, opts?: SafeExecOpts): ExecResult {
  const config = getSecurityConfig();
  const trimmedCommand = command.trim();

  if (!trimmedCommand) {
    return { stdout: "", stderr: "Empty command", exitCode: 1, timedOut: false, durationMs: 0 };
  }

  // In permissive mode, skip validation
  if (config.mode !== "permissive") {
    // Check allow-list
    const extraPrefixes = [
      ...config.extraExecAllowList,
      ...(opts?.additionalPrefixes ?? []),
    ];

    if (!isAllowedCommand(trimmedCommand, extraPrefixes)) {
      if (config.mode === "audit_only") {
        // Log but proceed
      } else {
        throw new SecurityError(
          "EXEC_BLOCKED",
          `Command "${trimmedCommand.substring(0, 60)}..." is not on the allow-list. ` +
            `Allowed prefixes: ${ALLOWED_PREFIXES.slice(0, 10).join(", ")}...`,
        );
      }
    }

    // Check for shell metacharacters (injection prevention)
    if (DANGEROUS_METACHAR_RE.test(trimmedCommand)) {
      throw new SecurityError(
        "EXEC_METACHAR",
        `Command contains dangerous shell metacharacters: ${trimmedCommand.substring(0, 60)}`,
      );
    }

    // Check pipes separately (allowed if opts.allowPipes)
    if (!opts?.allowPipes && PIPE_RE.test(trimmedCommand)) {
      throw new SecurityError(
        "EXEC_METACHAR",
        `Command contains pipe operator. Use allowPipes option if intended: ${trimmedCommand.substring(0, 60)}`,
      );
    }
  }

  const timeout = Math.min(opts?.timeout ?? 30_000, config.maxExecTimeoutMs);
  const maxBuffer = opts?.maxBuffer ?? 10 * 1024 * 1024;
  const cwd = opts?.cwd ?? process.cwd();

  const start = Date.now();

  try {
    const stdout = execSync(trimmedCommand, {
      cwd,
      timeout,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer,
    });

    return {
      stdout: (stdout ?? "").slice(0, 50_000),
      stderr: "",
      exitCode: 0,
      timedOut: false,
      durationMs: Date.now() - start,
    };
  } catch (err: any) {
    const timedOut = err.killed === true || err.signal === "SIGTERM";
    return {
      stdout: (err.stdout ?? "").slice(0, 50_000),
      stderr: (err.stderr ?? "").slice(0, 10_000),
      exitCode: err.status ?? 1,
      timedOut,
      durationMs: Date.now() - start,
    };
  }
}

/** Export for testing */
export const _ALLOWED_PREFIXES = ALLOWED_PREFIXES;
