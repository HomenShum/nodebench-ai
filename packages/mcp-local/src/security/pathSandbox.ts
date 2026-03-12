/**
 * pathSandbox.ts — Filesystem boundary enforcement.
 *
 * Every tool that reads/writes files should call safePath() before fs access.
 * Blocks path traversal, symlink escape, and access to sensitive directories.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SecurityError } from "./SecurityError.js";
import { getSecurityConfig } from "./config.js";

export interface SafePathOpts {
  /** Override default allowed roots from config */
  allowedRoots?: string[];
  /** Allow access to home directory (still blocks sensitive subdirs) */
  allowHome?: boolean;
  /** Allow access to temp directory */
  allowTemp?: boolean;
  /** Skip boundary check entirely (use for known-safe internal paths) */
  skipBoundaryCheck?: boolean;
}

// Sensitive paths that are ALWAYS blocked, even if within allowed roots
const SENSITIVE_DIRS = [
  ".ssh",
  ".gnupg",
  ".gpg",
  ".aws",
  ".azure",
  ".config/gcloud",
  ".kube",
  ".docker",
  ".ethereum",
  ".solana",
  ".phantom",
  ".bitcoin",
  ".metamask",
  ".config/gh",
  ".git-credentials",
];

const SENSITIVE_FILE_PATTERNS = [
  /\.env(\.\w+)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /\.jks$/i,
  /id_rsa$/i,
  /id_ed25519$/i,
  /id_ecdsa$/i,
  /\.npmrc$/i,
  /\.netrc$/i,
  /credentials\.json$/i,
  /service[_-]?account.*\.json$/i,
  /wallet.*\.json$/i,
  /keystore.*\.json$/i,
  /seed(phrase)?.*\.(txt|json|md)$/i,
  /mnemonic.*\.(txt|json|md)$/i,
  /private[_-]?key/i,
];

function expandTilde(p: string): string {
  if (!p) return p;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/") || p.startsWith("~\\"))
    return path.join(os.homedir(), p.slice(2));
  return p;
}

function isSensitivePath(resolved: string): boolean {
  const home = os.homedir();
  const relative = path.relative(home, resolved);

  // Check sensitive directories
  for (const dir of SENSITIVE_DIRS) {
    const sensitiveFull = path.join(home, dir);
    if (
      resolved === sensitiveFull ||
      resolved.startsWith(sensitiveFull + path.sep)
    ) {
      return true;
    }
  }

  // Check sensitive file patterns
  const basename = path.basename(resolved);
  for (const pattern of SENSITIVE_FILE_PATTERNS) {
    if (pattern.test(basename)) return true;
  }

  // Block /etc/shadow, /etc/passwd on Unix
  if (process.platform !== "win32") {
    if (resolved === "/etc/shadow" || resolved === "/etc/passwd") return true;
  }

  return false;
}

function isWithinRoots(resolved: string, roots: string[]): boolean {
  for (const root of roots) {
    const normalizedRoot = path.resolve(root);
    if (
      resolved === normalizedRoot ||
      resolved.startsWith(normalizedRoot + path.sep)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Validate and resolve a file path against security boundaries.
 *
 * @throws SecurityError if the path violates boundaries
 * @returns The resolved, validated absolute path
 */
export function safePath(inputPath: string, opts?: SafePathOpts): string {
  const config = getSecurityConfig();

  // In permissive mode, just resolve and return
  if (config.mode === "permissive") {
    const expanded = expandTilde(String(inputPath ?? "").trim());
    if (!expanded) throw new Error("path is required");
    return path.isAbsolute(expanded)
      ? expanded
      : path.resolve(process.cwd(), expanded);
  }

  const raw = String(inputPath ?? "").trim();
  if (!raw) throw new Error("path is required");

  const expanded = expandTilde(raw);
  const resolved = path.isAbsolute(expanded)
    ? path.resolve(expanded)
    : path.resolve(process.cwd(), expanded);

  // Always check sensitive paths (even in audit_only mode this is a hard block)
  if (isSensitivePath(resolved)) {
    throw new SecurityError(
      "PATH_SENSITIVE",
      `Access denied: ${path.basename(resolved)} is a sensitive file/directory`,
    );
  }

  // Skip boundary check if explicitly requested (for internal paths)
  if (opts?.skipBoundaryCheck) return resolved;

  // Build allowed roots
  const roots = [...(opts?.allowedRoots ?? config.allowedRoots)];
  if (opts?.allowHome) roots.push(os.homedir());
  if (opts?.allowTemp) roots.push(os.tmpdir());

  // Boundary check
  if (!isWithinRoots(resolved, roots)) {
    if (config.mode === "audit_only") {
      // Log but don't block
      return resolved;
    }
    throw new SecurityError(
      "PATH_TRAVERSAL",
      `Path "${raw}" resolves outside allowed boundaries`,
    );
  }

  // Symlink check — resolve the real path and re-verify
  try {
    if (fs.existsSync(resolved)) {
      const stat = fs.lstatSync(resolved);
      if (stat.isSymbolicLink()) {
        const realPath = fs.realpathSync(resolved);
        if (isSensitivePath(realPath)) {
          throw new SecurityError(
            "PATH_SYMLINK",
            `Symlink "${raw}" resolves to sensitive path`,
          );
        }
        if (!isWithinRoots(realPath, roots) && config.mode !== "audit_only") {
          throw new SecurityError(
            "PATH_SYMLINK",
            `Symlink "${raw}" resolves outside allowed boundaries`,
          );
        }
      }
    }
  } catch (e) {
    if (e instanceof SecurityError) throw e;
    // File doesn't exist yet (write case) — boundary check above is sufficient
  }

  return resolved;
}
