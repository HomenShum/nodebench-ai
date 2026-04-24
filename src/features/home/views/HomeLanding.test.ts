import { describe, expect, it } from "vitest";
import { getApi } from "@/lib/convexApi";

import {
  buildSamplePulse,
  buildVisibleHomeReports,
  formatPulseFreshness,
  isPulsePreviewVisible,
  PULSE_FRESHNESS_MS_CLIENT,
  resolvePulseDisplay,
  SAMPLE_PULSE,
} from "./HomeLanding";

describe("buildVisibleHomeReports", () => {
  it("dedupes saved reports by entity slug before choosing visible cards", () => {
    const visible = buildVisibleHomeReports([
      {
        key: "report-1",
        title: "Stripe",
        summary: "Latest Stripe brief",
        prompt: "What matters most about Stripe right now?",
        type: "company",
        lens: "investor",
        entitySlug: "stripe",
        updatedLabel: "Today",
      },
      {
        key: "report-2",
        title: "Stripe",
        summary: "Older Stripe brief",
        prompt: "Update Stripe and show me what changed.",
        type: "company",
        lens: "investor",
        entitySlug: "stripe",
        updatedLabel: "Yesterday",
      },
      {
        key: "report-3",
        title: "Datadog",
        summary: "Datadog brief",
        prompt: "What changed at Datadog?",
        type: "company",
        lens: "founder",
        entitySlug: "datadog",
        updatedLabel: "Today",
      },
    ]);

    expect(visible.map((report) => report.key)).toEqual([
      "report-1",
      "report-3",
      "starter-market",
    ]);
  });

  it("fills remaining slots with starter cards when there are too few unique saved reports", () => {
    const visible = buildVisibleHomeReports([
      {
        key: "report-1",
        title: "OpenAI",
        summary: "OpenAI brief",
        prompt: "Summarize OpenAI.",
        type: "company",
        lens: "founder",
        entitySlug: "openai",
        updatedLabel: "Today",
      },
    ]);

    expect(visible.map((report) => report.key)).toEqual([
      "report-1",
      "starter-market",
      "starter-role",
    ]);
  });

  it("dedupes legacy alias reports even when their entity slugs differ", () => {
    const visible = buildVisibleHomeReports([
      {
        key: "report-1",
        title: "SoftBank Group Corp.",
        summary: "Alias report",
        prompt: "What matters most about SoftBank right now?",
        type: "company",
        lens: "investor",
        entitySlug: "softbank-group-corp",
        updatedLabel: "Today",
      },
      {
        key: "report-2",
        title: "SoftBank",
        summary: "Canonical report",
        prompt: "Update SoftBank and show me what changed.",
        type: "company",
        lens: "investor",
        entitySlug: "softbank",
        updatedLabel: "Yesterday",
      },
    ]);

    expect(visible.map((report) => report.key)).toEqual([
      "report-1",
      "starter-market",
      "starter-role",
    ]);
  });

  it("shows pulse only when the projection is fresh and has at least three items", () => {
    expect(
      isPulsePreviewVisible({
        freshnessState: "fresh",
        items: [{}, {}, {}],
      }),
    ).toBe(true);
    expect(
      isPulsePreviewVisible({
        freshnessState: "stale",
        items: [{}, {}, {}],
      }),
    ).toBe(false);
    expect(
      isPulsePreviewVisible({
        freshnessState: "fresh",
        items: [{}, {}],
      }),
    ).toBe(false);
  });

  it("formats pulse freshness for recent and older updates", () => {
    const now = Date.now();
    expect(formatPulseFreshness(now - 5 * 60 * 1000)).toBe("Updated 5m ago");
    expect(formatPulseFreshness(now - 2 * 60 * 60 * 1000)).toBe("Updated 2h ago");
    expect(formatPulseFreshness(now - 2 * 24 * 60 * 60 * 1000)).toBe("Updated 2d ago");
  });

  it("exposes the Pulse backend projection through the lazy Convex api surface", async () => {
    const api = await getApi();
    expect(api.domains.product.home.getPulsePreview).toBeDefined();
  });
});

describe("resolvePulseDisplay — scenario coverage", () => {
  const NOW = 1_750_000_000_000;
  const FRESH_AT = NOW - 2 * 60 * 60 * 1000;
  const STALE_AT = NOW - 25 * 60 * 60 * 1000;

  function liveItems(n: number) {
    return Array.from({ length: n }, (_, i) => ({
      id: `live-${i + 1}`,
      title: `Signal ${i + 1}`,
      summary: `Summary ${i + 1}`,
      sourceCount: i + 1,
    }));
  }

  it("Scenario: returning founder, fresh brief landed 2h ago — renders LIVE with all 5 items", () => {
    const out = resolvePulseDisplay(
      {
        freshnessState: "fresh",
        items: liveItems(5),
        updatedAt: FRESH_AT,
        title: "Geopolitics tape",
        summary: "Five signals.",
        prompt: "Walk me through these.",
      },
      NOW,
    );
    expect(out.mode).toBe("live");
    expect(out.source).toBe("live");
    expect(out.items).toHaveLength(5);
    expect(out.title).toBe("Geopolitics tape");
    expect(out.updatedAt).toBe(FRESH_AT);
  });

  it("Scenario: thin-coverage day, only 2 fresh signals — renders PARTIAL (preserves real data, not sample)", () => {
    const out = resolvePulseDisplay(
      { freshnessState: "fresh", items: liveItems(2), updatedAt: FRESH_AT },
      NOW,
    );
    expect(out.mode).toBe("partial");
    expect(out.source).toBe("live");
    expect(out.items).toHaveLength(2);
  });

  it("Scenario: pre-cron window (last brief 25h old, 4 items) — renders STALE not sample (preserves real data)", () => {
    const out = resolvePulseDisplay(
      { freshnessState: "fresh", items: liveItems(4), updatedAt: STALE_AT },
      NOW,
    );
    expect(out.mode).toBe("stale");
    expect(out.source).toBe("live");
    expect(out.items).toHaveLength(4);
  });

  it("Scenario: backend marks stale even within freshness window — frontend trusts backend", () => {
    const out = resolvePulseDisplay(
      { freshnessState: "stale", items: liveItems(3), updatedAt: FRESH_AT },
      NOW,
    );
    expect(out.mode).toBe("stale");
  });

  it("Scenario: first-run guest, backend returns null — renders SAMPLE", () => {
    const out = resolvePulseDisplay(null, NOW);
    expect(out.mode).toBe("sample");
    expect(out.source).toBe("sample");
    expect(out.items).toHaveLength(SAMPLE_PULSE.items.length);
  });

  it("Scenario: backend returns object but items is empty array — renders SAMPLE (no real signal)", () => {
    const out = resolvePulseDisplay(
      { freshnessState: "fresh", items: [], updatedAt: FRESH_AT },
      NOW,
    );
    expect(out.mode).toBe("sample");
  });

  it("Scenario: items contain malformed entries (null, missing title, wrong types) — filters defensively", () => {
    const out = resolvePulseDisplay(
      {
        freshnessState: "fresh",
        items: [
          null,
          { title: "" },
          { title: "  " },
          "garbage" as unknown as object,
          { title: "Real signal", summary: "  trim me  ", sourceCount: "3" as unknown as number },
          { title: "Bad count", sourceCount: NaN },
          { title: "Negative count", sourceCount: -5 },
          { title: "Float count", sourceCount: 4.7 },
        ],
        updatedAt: FRESH_AT,
      },
      NOW,
    );
    // Real, Bad count, Negative count, Float count — 4 valid; the rest dropped.
    expect(out.items).toHaveLength(4);
    expect(out.items[0]).toMatchObject({
      title: "Real signal",
      summary: "trim me",
      sourceCount: 0, // string "3" is not a number → defaults to 0 (HONEST_SCORES).
    });
    expect(out.items[3].sourceCount).toBe(4); // Math.floor(4.7).
  });

  it("Scenario: hostile input, items has 100 entries — caps at 5 (BOUND)", () => {
    const out = resolvePulseDisplay(
      { freshnessState: "fresh", items: liveItems(100), updatedAt: FRESH_AT },
      NOW,
    );
    expect(out.items).toHaveLength(5);
    expect(out.mode).toBe("live");
  });

  it("Scenario: clock skew, updatedAt is in the future — clamps so freshness math stays sane", () => {
    const future = NOW + 60 * 60 * 1000;
    const out = resolvePulseDisplay(
      { freshnessState: "fresh", items: liveItems(3), updatedAt: future },
      NOW,
    );
    expect(out.updatedAt).toBe(NOW);
    expect(out.mode).toBe("live");
  });

  it("Scenario: fields missing — falls back to safe defaults, never crashes", () => {
    const out = resolvePulseDisplay(
      { items: liveItems(3) } as unknown as {
        items: ReturnType<typeof liveItems>;
      },
      NOW,
    );
    expect(out.title).toBe("Today's strongest signals");
    expect(out.summary).toBe("");
    expect(out.prompt).toBe(SAMPLE_PULSE.prompt);
    expect(out.updatedAt).toBe(NOW);
  });

  it("Scenario: long-running session crossing the freshness boundary — same backend payload now stale", () => {
    const payload = {
      freshnessState: "fresh",
      items: liveItems(4),
      updatedAt: NOW - PULSE_FRESHNESS_MS_CLIENT + 60_000, // 1m before stale boundary
    };
    const beforeBoundary = resolvePulseDisplay(payload, NOW);
    expect(beforeBoundary.mode).toBe("live");
    const afterBoundary = resolvePulseDisplay(payload, NOW + 2 * 60_000);
    expect(afterBoundary.mode).toBe("stale");
    // Same items survive the transition — no data loss across the boundary.
    expect(afterBoundary.items).toHaveLength(4);
  });

  it("Scenario: id collision across items — both still render, no thrown error", () => {
    const out = resolvePulseDisplay(
      {
        freshnessState: "fresh",
        items: [
          { id: "dup", title: "First", summary: "s1", sourceCount: 1 },
          { id: "dup", title: "Second", summary: "s2", sourceCount: 2 },
          { id: "dup", title: "Third", summary: "s3", sourceCount: 3 },
        ],
        updatedAt: FRESH_AT,
      },
      NOW,
    );
    expect(out.items.map((i) => i.title)).toEqual(["First", "Second", "Third"]);
  });

  it("buildSamplePulse is deterministic for a given timestamp — safe for SSR / snapshot tests", () => {
    const a = buildSamplePulse(NOW);
    const b = buildSamplePulse(NOW);
    expect(a).toEqual(b);
    expect(a.updatedAt).toBe(NOW);
  });

  it("isPulsePreviewVisible stays back-compat with the original strict gate", () => {
    expect(
      isPulsePreviewVisible({
        freshnessState: "fresh",
        items: [{}, {}, {}],
      }),
    ).toBe(true);
    expect(
      isPulsePreviewVisible({
        freshnessState: "stale",
        items: [{}, {}, {}],
      }),
    ).toBe(false);
  });
});
