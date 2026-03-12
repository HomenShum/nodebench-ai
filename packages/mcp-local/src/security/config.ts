/**
 * config.ts — Centralized security configuration.
 *
 * Reads from env vars at startup, cached for the process lifetime.
 * Test helpers follow the embeddingProvider.ts pattern.
 */

import * as os from "node:os";
import * as path from "node:path";

export type SecurityMode = "strict" | "permissive" | "audit_only";

export interface SecurityConfig {
  /** strict = block + log, permissive = allow all, audit_only = log but don't block */
  mode: SecurityMode;
  /** Filesystem roots tools are allowed to access (default: cwd) */
  allowedRoots: string[];
  /** Max command execution timeout in ms (hard cap) */
  maxExecTimeoutMs: number;
  /** Whether audit logging is enabled */
  auditEnabled: boolean;
  /** Additional command prefixes allowed beyond the built-in list */
  extraExecAllowList: string[];
}

const DEFAULT_CONFIG: SecurityConfig = {
  mode: "strict",
  allowedRoots: [process.cwd()],
  maxExecTimeoutMs: 60_000,
  auditEnabled: true,
  extraExecAllowList: [],
};

let _config: SecurityConfig | null = null;

export function getSecurityConfig(): SecurityConfig {
  if (_config) return _config;

  const mode = (process.env.NODEBENCH_SECURITY_MODE as SecurityMode) ?? "strict";
  const rootsEnv = process.env.NODEBENCH_ALLOWED_ROOTS;
  const allowedRoots = rootsEnv
    ? rootsEnv.split(",").map((r) => path.resolve(r.trim()))
    : [process.cwd()];

  const timeoutEnv = process.env.NODEBENCH_EXEC_TIMEOUT_MS;
  const maxExecTimeoutMs = timeoutEnv
    ? Math.min(parseInt(timeoutEnv, 10) || 60_000, 60_000)
    : 60_000;

  const auditEnabled = process.env.NODEBENCH_AUDIT_ENABLED !== "false";

  const extraEnv = process.env.NODEBENCH_EXEC_ALLOWLIST;
  const extraExecAllowList = extraEnv
    ? extraEnv.split(",").map((s) => s.trim())
    : [];

  _config = { mode, allowedRoots, maxExecTimeoutMs, auditEnabled, extraExecAllowList };
  return _config;
}

export function setSecurityConfig(partial: Partial<SecurityConfig>): void {
  _config = { ...getSecurityConfig(), ...partial };
}

/** Test helper — reset to defaults */
export function _resetSecurityConfigForTesting(): void {
  _config = null;
}
