import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../../schema";
import { api } from "../../../_generated/api";

const modules = {
  "_generated/server.js": () => import("../../../_generated/server"),
  "domains/product/me.ts": () => import("../me"),
  "domains/auth/userPreferences.ts": () => import("../../auth/userPreferences"),
  "domains/operations/personaChangeTracking.ts": () => import("../../operations/personaChangeTracking"),
};
const me = api.domains.product.me;
const prefs = api.domains.auth.userPreferences;
const icons = ["flow", "tools", "mcp", "sms", "email", "gmail", "phone", "slack", "discord", "webhook", "zapier"];
const defaults = {
  sidebarPinned: true, showFileSizes: true, organizationMode: "folders",
  ungroupedSectionName: "Ungrouped Documents", ungroupedSectionExpanded: true,
  iconOrder: icons, docOrderByGroup: {}, linkReminderOptOut: false, trackedHashtags: [], techStack: [],
};
async function setup() {
  const t = convexTest(schema, modules);
  const [a, b] = await t.run(async (ctx) => [await ctx.db.insert("users", { name: "Fixture A" }), await ctx.db.insert("users", { name: "Fixture B" })]);
  return { t, a, b, A: t.withIdentity({ subject: a }), B: t.withIdentity({ subject: b }) };
}

describe("a returning owner reads saved calendar choices", () => {
  it("returns saved false/false/auto instead of silently selecting client defaults", async () => {
    const { t, a, A } = await setup();
    await A.mutation(prefs.updateUserPreferences, { gmailIngestEnabled: false, gcalSyncEnabled: false, calendarAutoAddMode: "auto" });
    const stored = await t.run((ctx) => ctx.db.query("userPreferences").withIndex("by_user", (q) => q.eq("userId", a)).unique());
    const result = await A.query(prefs.getUserPreferences, {});
    console.info("PREFERENCE_QUERY_OBSERVATION", JSON.stringify({ stored: { gmailIngestEnabled: stored?.gmailIngestEnabled, gcalSyncEnabled: stored?.gcalSyncEnabled, calendarAutoAddMode: stored?.calendarAutoAddMode }, returned: result }));
    expect(stored).toMatchObject({ gmailIngestEnabled: false, gcalSyncEnabled: false, calendarAutoAddMode: "auto" });
    expect(result).toMatchObject({ gmailIngestEnabled: false, gcalSyncEnabled: false, calendarAutoAddMode: "auto" });
  });

  it("keeps absent-user and absent-row public shapes, rejecting unauthenticated writes", async () => {
    const { t, A, a } = await setup();
    const noAuth = { ...defaults, needsReauth: true, ungroupedSectionName: "Ungrouped" };
    expect(await t.query(prefs.getUserPreferences, {})).toEqual(noAuth);
    expect(await A.query(prefs.getUserPreferences, {})).toEqual(defaults);
    await expect(t.mutation(prefs.updateUserPreferences, { gmailIngestEnabled: false })).rejects.toThrow(/Not authenticated/);
    await t.run((ctx) => ctx.db.delete(a));
    expect(await A.query(prefs.getUserPreferences, {})).toEqual(noAuth);
    await expect(A.mutation(prefs.updateUserPreferences, { calendarAutoAddMode: "auto" })).rejects.toThrow(/Not authenticated/);
  });

  it("defaults only unset fields on an existing row and never projects unrelated private data", async () => {
    const { t, A, a } = await setup();
    await t.run((ctx) => ctx.db.insert("userPreferences", { userId: a, createdAt: 1, updatedAt: 1, timeZone: "private-fixture-sentinel" }));
    const result = await A.query(prefs.getUserPreferences, {});
    expect(result).toEqual({ ungroupedSectionName: "Ungrouped Documents", isUngroupedExpanded: true, organizationMode: "folders", iconOrder: icons, docOrderByGroup: {}, linkReminderOptOut: false, trackedHashtags: [], techStack: [], gmailIngestEnabled: true, gcalSyncEnabled: true, calendarAutoAddMode: "propose" });
    expect(JSON.stringify(result)).not.toContain("private-fixture-sentinel");
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("_id");
  });

  it("keeps two owners isolated through a burst and twenty accumulated alternating updates", async () => {
    const { t, A, B, a, b } = await setup();
    for (let i = 0; i < 20; i++) {
      const enabled = i % 2 === 0;
      await Promise.all([
        A.mutation(prefs.updateUserPreferences, { gmailIngestEnabled: enabled, gcalSyncEnabled: enabled, calendarAutoAddMode: enabled ? "propose" : "auto" }),
        B.mutation(prefs.updateUserPreferences, { gmailIngestEnabled: !enabled, gcalSyncEnabled: !enabled, calendarAutoAddMode: enabled ? "auto" : "propose" }),
      ]);
      const [left, right] = await Promise.all([A.query(prefs.getUserPreferences, {}), B.query(prefs.getUserPreferences, {})]);
      expect(left).toMatchObject({ gmailIngestEnabled: enabled, gcalSyncEnabled: enabled, calendarAutoAddMode: enabled ? "propose" : "auto" });
      expect(right).toMatchObject({ gmailIngestEnabled: !enabled, gcalSyncEnabled: !enabled, calendarAutoAddMode: enabled ? "auto" : "propose" });
    }
    const rows = await t.run((ctx) => ctx.db.query("userPreferences").collect());
    expect(rows.map((row) => row.userId).sort()).toEqual([a, b].sort());
    // An attacker cannot choose another user's row through the public argument shape.
    await expect(A.query(prefs.getUserPreferences, { userId: b } as never)).rejects.toThrow();
  });
});

describe("a returning research user keeps their existing profile contract", () => {
  it("round-trips all six lenses, roles and explicit false tone without changing stored preference shapes", async () => {
    const { A } = await setup();
    for (const preferredLens of ["founder", "investor", "banker", "ceo", "legal", "student"] as const) {
      await A.mutation(me.updateProfile, { preferredLens, backgroundSummary: "  A representative research brief  ", rolesOfInterest: ["Analyst", "Operator"], preferences: { communicationStyle: "concise", evidenceStyle: "citation_heavy", avoidCorporateTone: false } });
      expect((await A.query(me.getMeSnapshot, {})).profile).toMatchObject({ preferredLens, backgroundSummary: "A representative research brief", rolesOfInterest: ["Analyst", "Operator"], preferences: { communicationStyle: "concise", evidenceStyle: "citation_heavy", avoidCorporateTone: false } });
    }
  });

  it("normalizes existing blank/placeholder summaries and preserves migrated or extra legacy preferences", async () => {
    const { t, A, a } = await setup();
    const id = await t.run((ctx) => ctx.db.insert("productProfileSummaries", { ownerKey: `user:${a}`, backgroundSummary: "", preferredLens: "banker", rolesOfInterest: [], createdAt: 1, updatedAt: 1, preferences: { theme: "dark", timeZone: "UTC", legacyFixture: { keep: true } } }));
    for (const summary of ["", "   ", "Private account context migrated into the new Me surface.", "Private context saved in Me."]) {
      await t.run((ctx) => ctx.db.patch(id, { backgroundSummary: summary }));
      const profile = (await A.query(me.getMeSnapshot, {})).profile;
      expect(profile?.backgroundSummary).toBe("");
      expect(profile?.preferences).toEqual({ theme: "dark", timeZone: "UTC", legacyFixture: { keep: true } });
    }
    await A.mutation(me.updateProfile, { rolesOfInterest: ["Operator"] });
    expect((await A.query(me.getMeSnapshot, {})).profile?.preferences).toEqual({ theme: "dark", timeZone: "UTC", legacyFixture: { keep: true } });
  });

  it("preserves signed-in precedence and the explicit anonymous bearer fallback without crossing authenticated owners", async () => {
    const { t, A, B } = await setup();
    await A.mutation(me.updateProfile, { preferredLens: "investor" });
    await B.mutation(me.updateProfile, { preferredLens: "legal" });
    await t.mutation(me.updateProfile, { anonymousSessionId: "fixture-bearer", preferredLens: "student" });
    expect((await A.query(me.getMeSnapshot, { anonymousSessionId: "fixture-bearer" })).profile?.preferredLens).toBe("investor");
    expect((await B.query(me.getMeSnapshot, {})).profile?.preferredLens).toBe("legal");
    expect((await t.query(me.getMeSnapshot, { anonymousSessionId: "fixture-bearer" })).profile?.preferredLens).toBe("student");
    const fresh = await t.run((ctx) => ctx.db.insert("users", { name: "Fresh fixture" }));
    const freshViewer = t.withIdentity({ subject: fresh });
    expect((await freshViewer.query(me.getMeSnapshot, { anonymousSessionId: "fixture-bearer" })).profile?.preferredLens).toBe("student");
    expect((await freshViewer.query(me.getMeSnapshot, {})).profile).toBeNull();
    expect(await t.query(me.getMeSnapshot, {})).toEqual({ profile: null, files: [], savedContext: [], settings: [] });
    await expect(t.mutation(me.updateProfile, { preferredLens: "founder" })).rejects.toThrow(/Authentication or anonymous session required/);
  });
});
