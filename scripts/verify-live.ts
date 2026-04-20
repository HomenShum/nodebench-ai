#!/usr/bin/env node
/**
 * verify-live.ts — mechanical verifier for the Live-DOM Verification rule
 * (.claude/rules/live_dom_verification.md).
 *
 * Fetches the live production URL and asserts that every concrete content
 * signal we promised in recent commits is present in the RAW HTML
 * (pre-hydration). Catches:
 *   - silently-disconnected deploy webhooks
 *   - Suspense / client-only regressions (raw HTML = skeleton only)
 *   - CDN-cached stale HTML
 *
 * Usage:
 *   npx tsx scripts/verify-live.ts
 *   npx tsx scripts/verify-live.ts --url=https://your-preview.vercel.app
 *
 * Exit code:
 *   0 → LIVE OK (every signal found)
 *   1 → any signal missing OR HTTP non-2xx
 *
 * Extend `CHECKS` when a new promise ships. Each check is a { name, path,
 * contains, status? } quadruple.
 */

type Check = {
  name: string;
  path: string;
  /** Substring or regex that MUST appear in raw HTML. */
  contains: string | RegExp;
  /** Expected HTTP status (default 200). */
  status?: number;
  /** Optional — mark as informational rather than required. */
  optional?: boolean;
};

const DEFAULT_BASE = "https://www.nodebenchai.com";

function parseArgs(): { baseUrl: string } {
  let baseUrl = DEFAULT_BASE;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--url=")) baseUrl = arg.slice("--url=".length);
  }
  return { baseUrl: baseUrl.replace(/\/$/, "") };
}

const CHECKS: ReadonlyArray<Check> = [
  {
    name: "landing responds",
    path: "/",
    contains: /<html/i, // baseline — anything HTML-ish at all
  },
  {
    name: "landing has <title>",
    path: "/",
    contains: /<title[^>]*>[^<]+<\/title>/i,
  },
  {
    name: "/share/ route renders (not 404)",
    path: "/share/nonexistent-token-verify-live",
    contains: /(Link not found|share)/i,
  },
  {
    name: "/developers page reachable",
    path: "/developers",
    contains: /<html/i,
    optional: true,
  },
  {
    name: "/pricing page reachable",
    path: "/pricing",
    contains: /<html/i,
    optional: true,
  },
  {
    name: "/changelog page reachable",
    path: "/changelog",
    contains: /<html/i,
    optional: true,
  },
  {
    name: "/api-docs reachable",
    path: "/api-docs",
    contains: /<html/i,
    optional: true,
  },
  {
    name: "/legal reachable",
    path: "/legal",
    contains: /<html/i,
    optional: true,
  },
];

type Result = {
  name: string;
  path: string;
  ok: boolean;
  optional: boolean;
  detail: string;
};

async function runCheck(baseUrl: string, check: Check): Promise<Result> {
  const url = `${baseUrl}${check.path}`;
  const expectStatus = check.status ?? 200;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "nodebench-verify-live/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (response.status !== expectStatus) {
      return {
        name: check.name,
        path: check.path,
        ok: false,
        optional: !!check.optional,
        detail: `HTTP ${response.status} (expected ${expectStatus})`,
      };
    }
    const body = await response.text();
    const matches =
      check.contains instanceof RegExp
        ? check.contains.test(body)
        : body.includes(check.contains);
    if (!matches) {
      const expectedSignal =
        check.contains instanceof RegExp
          ? check.contains.source
          : JSON.stringify(check.contains);
      return {
        name: check.name,
        path: check.path,
        ok: false,
        optional: !!check.optional,
        detail: `signal missing: ${expectedSignal} (body ${body.length} bytes)`,
      };
    }
    return {
      name: check.name,
      path: check.path,
      ok: true,
      optional: !!check.optional,
      detail: `${response.status} ${body.length}B`,
    };
  } catch (err) {
    return {
      name: check.name,
      path: check.path,
      ok: false,
      optional: !!check.optional,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const { baseUrl } = parseArgs();
  // eslint-disable-next-line no-console
  console.log(`verify-live → ${baseUrl}`);
  const results = await Promise.all(CHECKS.map((c) => runCheck(baseUrl, c)));
  const required = results.filter((r) => !r.optional);
  const failed = required.filter((r) => !r.ok);
  const optionalFailed = results.filter((r) => r.optional && !r.ok);

  for (const r of results) {
    const marker = r.ok ? "  OK" : r.optional ? "WARN" : "FAIL";
    // eslint-disable-next-line no-console
    console.log(`${marker}  ${r.path.padEnd(36)}  ${r.name}`);
    if (!r.ok) {
      // eslint-disable-next-line no-console
      console.log(`       → ${r.detail}`);
    }
  }

  // eslint-disable-next-line no-console
  console.log("");
  if (failed.length === 0) {
    // eslint-disable-next-line no-console
    console.log(
      `LIVE OK — ${required.length - failed.length}/${required.length} required signals` +
        (optionalFailed.length > 0
          ? ` (${optionalFailed.length} optional missing)`
          : ""),
    );
    process.exit(0);
  } else {
    // eslint-disable-next-line no-console
    console.error(
      `LIVE FAILED — ${failed.length}/${required.length} required signals missing`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("verify-live crashed:", err);
  process.exit(1);
});
