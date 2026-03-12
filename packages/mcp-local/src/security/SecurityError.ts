/**
 * SecurityError — typed error for security boundary violations.
 *
 * Codes:
 *   PATH_TRAVERSAL  — path escapes allowed roots
 *   PATH_SENSITIVE   — path targets sensitive file (~/.ssh, .env, etc.)
 *   PATH_SYMLINK     — symlink resolves outside boundary
 *   EXEC_BLOCKED     — command not on allow-list
 *   EXEC_METACHAR    — shell metacharacters detected
 *   URL_PRIVATE_IP   — URL resolves to private/internal IP
 *   URL_BAD_SCHEME   — URL uses blocked scheme (file://, gopher://, etc.)
 *   URL_DNS_REBIND   — resolved IP differs from expected (DNS rebinding)
 */

export type SecurityErrorCode =
  | "PATH_TRAVERSAL"
  | "PATH_SENSITIVE"
  | "PATH_SYMLINK"
  | "EXEC_BLOCKED"
  | "EXEC_METACHAR"
  | "URL_PRIVATE_IP"
  | "URL_BAD_SCHEME"
  | "URL_DNS_REBIND";

export class SecurityError extends Error {
  code: SecurityErrorCode;

  constructor(code: SecurityErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = "SecurityError";
    this.code = code;
  }
}
