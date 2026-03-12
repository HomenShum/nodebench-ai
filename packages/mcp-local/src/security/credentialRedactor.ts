/**
 * credentialRedactor.ts — Redacts secrets from tool outputs.
 *
 * Applied at the response serialization layer in index.ts so every tool
 * output is automatically sanitized without individual tool changes.
 */

export interface RedactOpts {
  /** Skip specific patterns (by label) */
  skipPatterns?: string[];
}

interface SecretPattern {
  re: RegExp;
  label: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  // OpenAI
  { re: /sk-[a-zA-Z0-9]{20,}/g, label: "OPENAI_KEY" },
  { re: /sk-proj-[a-zA-Z0-9_-]{40,}/g, label: "OPENAI_PROJECT_KEY" },
  // Anthropic
  { re: /sk-ant-[a-zA-Z0-9_-]{20,}/g, label: "ANTHROPIC_KEY" },
  // GitHub
  { re: /ghp_[a-zA-Z0-9]{36}/g, label: "GITHUB_PAT" },
  { re: /gho_[a-zA-Z0-9]{36}/g, label: "GITHUB_OAUTH" },
  { re: /github_pat_[a-zA-Z0-9_]{20,}/g, label: "GITHUB_FINE_PAT" },
  // npm
  { re: /npm_[a-zA-Z0-9]{36}/g, label: "NPM_TOKEN" },
  // Google
  { re: /AIza[a-zA-Z0-9_-]{35}/g, label: "GOOGLE_API_KEY" },
  // AWS
  { re: /AKIA[A-Z0-9]{16}/g, label: "AWS_ACCESS_KEY" },
  { re: /(?:aws_secret_access_key\s*=\s*)[a-zA-Z0-9/+=]{40}/gi, label: "AWS_SECRET_KEY" },
  // Slack
  { re: /xoxb-[a-zA-Z0-9-]+/g, label: "SLACK_BOT_TOKEN" },
  { re: /xoxp-[a-zA-Z0-9-]+/g, label: "SLACK_USER_TOKEN" },
  // Private keys
  { re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, label: "PRIVATE_KEY" },
  // Generic secrets in key=value format
  {
    re: /(?:password|passwd|pwd|secret|token|api[_-]?key|auth[_-]?token)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    label: "CREDENTIAL",
  },
  // Bearer tokens
  { re: /Bearer\s+[a-zA-Z0-9._-]{20,}/g, label: "BEARER_TOKEN" },
  // Figma
  { re: /figd_[a-zA-Z0-9_-]{20,}/g, label: "FIGMA_TOKEN" },
  // Stripe
  { re: /sk_(?:live|test)_[a-zA-Z0-9]{24,}/g, label: "STRIPE_KEY" },
  // Twilio
  { re: /SK[a-f0-9]{32}/g, label: "TWILIO_KEY" },
];

// Dynamic env-var based redaction: build a set of known secret values from process.env
const SECRET_ENV_KEYS = [
  "KEY",
  "SECRET",
  "TOKEN",
  "PASSWORD",
  "PASS",
  "CREDENTIAL",
  "AUTH",
  "API_KEY",
];

let _envSecrets: Set<string> | null = null;

function getEnvSecrets(): Set<string> {
  if (_envSecrets) return _envSecrets;

  _envSecrets = new Set<string>();
  for (const [key, value] of Object.entries(process.env)) {
    if (!value || value.length < 8) continue;
    const upperKey = key.toUpperCase();
    if (SECRET_ENV_KEYS.some((s) => upperKey.includes(s))) {
      _envSecrets.add(value);
    }
  }
  return _envSecrets;
}

/**
 * Redact secrets from a string output.
 *
 * @returns The sanitized string with secrets replaced by [REDACTED:label]
 */
export function redactSecrets(output: string, opts?: RedactOpts): string {
  if (!output || typeof output !== "string") return output;

  const skip = new Set(opts?.skipPatterns ?? []);
  let result = output;

  // Pattern-based redaction
  for (const { re, label } of SECRET_PATTERNS) {
    if (skip.has(label)) continue;
    // Reset regex lastIndex (they're global)
    re.lastIndex = 0;
    result = result.replace(re, `[REDACTED:${label}]`);
  }

  // Dynamic env-var redaction
  const envSecrets = getEnvSecrets();
  for (const secret of envSecrets) {
    if (result.includes(secret)) {
      // Use a safe replacement that doesn't leak length info
      result = result.replaceAll(secret, "[REDACTED:ENV_VALUE]");
    }
  }

  return result;
}

/**
 * Redact secrets from a structured object (recursively processes string values).
 */
export function redactObject(obj: unknown): unknown {
  if (typeof obj === "string") return redactSecrets(obj);
  if (Array.isArray(obj)) return obj.map(redactObject);
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = redactObject(value);
    }
    return result;
  }
  return obj;
}

/** Test helper — reset env secrets cache */
export function _resetEnvSecretsForTesting(): void {
  _envSecrets = null;
}
