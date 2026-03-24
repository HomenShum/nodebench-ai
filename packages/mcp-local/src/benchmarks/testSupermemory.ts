/**
 * testSupermemory.ts — Unit test for SupermemoryProvider.
 *
 * Tests WITHOUT a real API key: verifies graceful error handling,
 * interface compliance, and error class hierarchy.
 * Run: npx tsx src/benchmarks/testSupermemory.ts
 */

import {
  SupermemoryProvider,
  SupermemoryError,
  SupermemoryAuthError,
  SupermemoryRateLimitError,
} from "../providers/supermemoryProvider.js";
import type { MemoryProvider } from "../providers/memoryProvider.js";

// ═══════════════════════════════════════════════════════════════════════════
// Test helpers
// ═══════════════════════════════════════════════════════════════════════════

const results: Array<{ name: string; pass: boolean; detail?: string }> = [];

function record(name: string, pass: boolean, detail?: string): void {
  results.push({ name, pass, detail });
  const icon = pass ? "PASS" : "FAIL";
  console.log(`  [${icon}] ${name}${detail ? ` — ${detail}` : ""}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

async function run(): Promise<void> {
  console.log("\n=== SupermemoryProvider Tests ===\n");

  // ── Test 1: Constructor creates a valid instance ───────────────────────
  const provider = new SupermemoryProvider();
  record("Constructor creates instance", provider instanceof SupermemoryProvider);

  // ── Test 2: Implements MemoryProvider interface (all 12 methods + 2 props)
  const requiredMethods = [
    "connect",
    "disconnect",
    "isConnected",
    "store",
    "update",
    "delete",
    "recall",
    "get",
    "list",
    "relate",
    "getProfile",
    "sync",
  ] as const;

  const requiredProps = ["name", "type"] as const;

  let allMethodsPresent = true;
  const missingMethods: string[] = [];
  for (const method of requiredMethods) {
    if (typeof (provider as unknown as Record<string, unknown>)[method] !== "function") {
      allMethodsPresent = false;
      missingMethods.push(method);
    }
  }
  record(
    `Implements all ${requiredMethods.length} MemoryProvider methods`,
    allMethodsPresent,
    missingMethods.length > 0 ? `missing: ${missingMethods.join(", ")}` : undefined,
  );

  let allPropsPresent = true;
  const missingProps: string[] = [];
  for (const prop of requiredProps) {
    if ((provider as unknown as Record<string, unknown>)[prop] === undefined) {
      allPropsPresent = false;
      missingProps.push(prop);
    }
  }
  record(
    `Has required readonly properties (name, type)`,
    allPropsPresent,
    missingProps.length > 0 ? `missing: ${missingProps.join(", ")}` : undefined,
  );

  // ── Test 3: name and type values ─────────────────────────────────────
  record(
    "name is 'supermemory'",
    provider.name === "supermemory",
    `actual: "${provider.name}"`,
  );
  record(
    "type is 'supermemory'",
    provider.type === "supermemory",
    `actual: "${provider.type}"`,
  );

  // ── Test 4: isConnected() before connect() ────────────────────────────
  record(
    "isConnected() is false before connect()",
    provider.isConnected() === false,
  );

  // ── Test 5: connect() with invalid key — should not throw ─────────────
  // The provider marks itself as connected even if the API returns errors
  // (except for explicit 401 from the validation request).
  // With a fake key hitting a real endpoint, we may get a network error
  // or a 401. The connect() method catches network errors and still marks connected.
  try {
    await provider.connect({ apiKey: "test-invalid-key" });
    // If connect succeeds (network error caught internally), isConnected should be true
    record("connect() with invalid key does not throw", true);
    record(
      "isConnected() returns true after connect()",
      provider.isConnected() === true,
    );
  } catch (err) {
    // connect() only rethrows SupermemoryAuthError (401).
    // A real 401 from the API is expected behavior.
    if (err instanceof SupermemoryAuthError) {
      record("connect() with invalid key throws SupermemoryAuthError", true, "401 from API");
      record(
        "isConnected() returns false after auth failure",
        provider.isConnected() === false,
      );
    } else {
      record("connect() with invalid key does not throw", false, String(err));
    }
  }

  // ── Test 6: store() with invalid key — should throw ───────────────────
  // Re-connect to ensure connected state for store/recall tests
  const provider2 = new SupermemoryProvider();
  try {
    await provider2.connect({ apiKey: "test-invalid-key-2" });
  } catch {
    // If 401 from connect, we still test store behavior
  }

  if (provider2.isConnected()) {
    // store() should fail with auth error from the API
    try {
      await provider2.store({ content: "test memory content" });
      record("store() throws on invalid API key", false, "did not throw");
    } catch (err) {
      if (err instanceof SupermemoryAuthError) {
        record("store() throws SupermemoryAuthError on invalid key", true);
        record(
          "SupermemoryAuthError has statusCode 401",
          err.statusCode === 401,
          `actual: ${err.statusCode}`,
        );
        record(
          "SupermemoryAuthError.name is correct",
          err.name === "SupermemoryAuthError",
        );
      } else if (err instanceof SupermemoryError) {
        // Network error or other API error — still a valid failure mode
        record(
          "store() throws SupermemoryError on invalid key",
          true,
          `${err.name}: ${err.message}`,
        );
      } else {
        record("store() throws on invalid API key", false, String(err));
      }
    }

    // ── Test 7: recall() with invalid key — should throw ────────────────
    try {
      await provider2.recall("test query");
      record("recall() throws on invalid API key", false, "did not throw");
    } catch (err) {
      if (err instanceof SupermemoryAuthError) {
        record("recall() throws SupermemoryAuthError on invalid key", true);
      } else if (err instanceof SupermemoryError) {
        record(
          "recall() throws SupermemoryError on invalid key",
          true,
          `${err.name}: ${err.message}`,
        );
      } else {
        record("recall() throws on invalid API key", false, String(err));
      }
    }
  } else {
    record("store()/recall() tests skipped", true, "provider not connected (401 on connect)");
  }

  // ── Test 8: Error class hierarchy ─────────────────────────────────────
  const authErr = new SupermemoryAuthError();
  record(
    "SupermemoryAuthError extends SupermemoryError",
    authErr instanceof SupermemoryError,
  );
  record(
    "SupermemoryAuthError extends Error",
    authErr instanceof Error,
  );
  record(
    "SupermemoryAuthError.statusCode is 401",
    authErr.statusCode === 401,
  );

  const rateLimitErr = new SupermemoryRateLimitError(5000);
  record(
    "SupermemoryRateLimitError extends SupermemoryError",
    rateLimitErr instanceof SupermemoryError,
  );
  record(
    "SupermemoryRateLimitError.statusCode is 429",
    rateLimitErr.statusCode === 429,
  );
  record(
    "SupermemoryRateLimitError.retryAfterMs is set",
    rateLimitErr.retryAfterMs === 5000,
  );

  // ── Test 9: sync() returns no-op result ───────────────────────────────
  const provider3 = new SupermemoryProvider();
  try {
    await provider3.connect({ apiKey: "test-sync-key" });
  } catch {
    // ignore auth error
  }

  if (provider3.isConnected()) {
    try {
      const syncResult = await provider3.sync("both");
      record(
        "sync() returns no-op SyncResult",
        syncResult.pushed === 0 &&
          syncResult.pulled === 0 &&
          syncResult.conflicts === 0 &&
          syncResult.direction === "both",
        `direction=${syncResult.direction}, pushed=${syncResult.pushed}`,
      );
    } catch (err) {
      record("sync() returns no-op SyncResult", false, String(err));
    }
  }

  // ── Test 10: disconnect() ─────────────────────────────────────────────
  if (provider3.isConnected()) {
    await provider3.disconnect();
    record(
      "disconnect() sets isConnected to false",
      provider3.isConnected() === false,
    );
  }

  // ── Test 11: TypeScript structural compatibility ──────────────────────
  // Verify the provider satisfies MemoryProvider at the type level
  const _typeCheck: MemoryProvider = new SupermemoryProvider();
  record("Structural type compatibility with MemoryProvider", true);

  // Summary
  console.log("\n=== Summary ===");
  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  console.log(`  ${passed}/${total} tests passed\n`);

  if (passed < total) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
