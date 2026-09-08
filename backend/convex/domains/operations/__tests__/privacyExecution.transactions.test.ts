/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import schema from "../../../schema";
import { api, internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";

const modules = Object.fromEntries(Object.entries(import.meta.glob("../../../**/*.{ts,js}"))
  .map(([key, loader]) => {
    const parts = key.replace(/^\.\//, "").split("/");
    const base = ["domains", "operations", "__tests__"];
    while (parts[0] === "..") { parts.shift(); base.pop(); }
    return [[...base, ...parts].join("/"), loader];
  }));
const ops = internal.domains.operations.privacyEnforcement;
const admission = api.domains.operations.privacyEnforcement.createDeletionRequest;

async function fixture(documentsWritten?: number) {
  const t = convexTest({ schema, modules, transactionLimits: documentsWritten ? { documentsWritten } : true });
  const admin = await t.run(ctx => ctx.db.insert("users", { email: "operator@example.test" }));
  const member = await t.run(ctx => ctx.db.insert("users", { email: "member@example.test" }));
  const role = await t.run(ctx => ctx.db.insert("adminUsers", {
    userId: admin, email: "operator@example.test", role: "admin", permissions: [], createdAt: 1,
  }));
  async function document(content = "Reviewed memo") {
    return t.run(ctx => ctx.db.insert("documents", { title: "Memo", content, createdBy: member, isPublic: false }));
  }
  async function request(ids: Id<"documents">[]) {
    return t.withIdentity({ subject: admin }).mutation(admission, {
      scope: "specific_records", subject: "Reviewed support request", recordIds: ids.map(id => `documents:${id}`),
    });
  }
  return { t, admin, member, role, document, request };
}

describe("deletion execution for people and maintenance operators", () => {
  it("holds an incomplete whole-account plan before removing any of the person's data", async () => {
    const { t, member, document } = await fixture();
    const doc = await document();
    const server = await t.run(ctx => ctx.db.insert("mcpServers", {
      name: "Owned connection", userId: member, createdAt: 1, updatedAt: 1,
    }));
    const requestId = await t.withIdentity({ subject: member }).mutation(admission, { scope: "user_data", subject: member });
    expect(await t.action(ops.processDeletionRequest, { requestId })).toMatchObject({ success: false, status: "failed", recordsDeleted: 0 });
    expect(await t.run(ctx => ctx.db.get(doc))).not.toBeNull();
    expect(await t.run(ctx => ctx.db.get(server))).not.toBeNull();
    expect(await t.run(ctx => ctx.db.get(requestId))).toMatchObject({
      status: "failed", deletionSummary: { failedDeletions: [{ error: expect.stringMatching(/coverage.*review/i) }] },
    });
  });

  it("records an unsupported entity request as a hold, without action/database misuse or a success claim", async () => {
    const { t, admin } = await fixture();
    const requestId = await t.withIdentity({ subject: admin }).mutation(admission, { scope: "entity_data", subject: "reviewed-entity" });
    expect(await t.action(ops.processDeletionRequest, { requestId })).toMatchObject({ success: false, status: "failed", recordsDeleted: 0 });
    expect(await t.run(ctx => ctx.db.get(requestId))).toMatchObject({ status: "failed" });
  });

  it("counts only real deletions when a reviewed list repeats IDs or another process already removed a row", async () => {
    const { t, document, request } = await fixture();
    const present = await document(); const missing = await document();
    const requestId = await request([present, present, missing]);
    await t.run(ctx => ctx.db.delete(missing));
    const expected = { success: true, status: "completed", recordsDeleted: 1, tablesAffected: ["documents"] };
    expect(await t.action(ops.processDeletionRequest, { requestId })).toEqual(expected);
    expect(await t.action(ops.processDeletionRequest, { requestId })).toEqual(expected);
    expect(await t.run(ctx => ctx.db.query("deletionTombstones").collect())).toHaveLength(1);
  });

  it("resumes an interrupted 200-record request from durable progress without double-counting", async () => {
    const { t, document, request } = await fixture();
    const ids: Id<"documents">[] = [];
    for (let i = 0; i < 200; i++) ids.push(await document(`Support record ${i}`));
    const requestId = await request(ids);
    const partial = await t.mutation(ops.advanceDeletionRequest, { requestId });
    expect(partial).toMatchObject({ success: false, status: "in_progress", recordsDeleted: 8 });
    expect(await t.run(ctx => ctx.db.get(requestId))).toMatchObject({ execution: { version: 1, nextIndex: 8 } });
    expect(await t.action(ops.processDeletionRequest, { requestId })).toMatchObject({ success: true, status: "completed", recordsDeleted: 200 });
    expect(await t.run(ctx => ctx.db.query("documents").collect())).toEqual([]);
    expect(await t.run(ctx => ctx.db.query("deletionTombstones").collect())).toHaveLength(200);
  }, 30000);

  it("keeps repeated overlapping workers idempotent through twelve successive request histories", async () => {
    const { t, document, request } = await fixture();
    for (let round = 0; round < 12; round++) {
      const requestId = await request([await document(), await document()]);
      const results = await Promise.all(Array.from({ length: 10 }, () => t.action(ops.processDeletionRequest, { requestId })));
      expect(results.every(result => result.success && result.recordsDeleted === 2)).toBe(true);
    }
    expect(await t.run(ctx => ctx.db.query("documents").collect())).toEqual([]);
    expect(await t.run(ctx => ctx.db.query("deletionTombstones").collect())).toHaveLength(24);
    expect(await t.run(ctx => ctx.db.query("deletionRequests").collect())).toHaveLength(12);
  }, 30000);

  it("defers a slow request at the action budget, then resumes the committed work on the next run", async () => {
    const { t, document, request } = await fixture();
    const ids: Id<"documents">[] = [];
    for (let i = 0; i < 40; i++) ids.push(await document());
    const requestId = await request(ids);
    // Advance wall time to represent slow storage without sleeping in the suite.
    const start = Date.now(); let ticks = 0;
    const clock = vi.spyOn(Date, "now").mockImplementation(() => start + ticks++ * 2_000);
    try {
      const result = await t.action(ops.processDeletionRequest, { requestId });
      expect(result).toMatchObject({ success: false, status: "in_progress" });
      expect(result.recordsDeleted).toBeGreaterThan(0);
      expect(result.recordsDeleted).toBeLessThan(ids.length);
      expect(await t.run(ctx => ctx.db.get(requestId))).toMatchObject({
        status: "in_progress", deletionSummary: { recordsDeleted: result.recordsDeleted },
      });
    } finally { clock.mockRestore(); }
    expect(await t.action(ops.processDeletionRequest, { requestId })).toMatchObject({ success: true, status: "completed", recordsDeleted: 40 });
    expect(await t.run(ctx => ctx.db.query("deletionTombstones").collect())).toHaveLength(40);
  });

  it("rolls back rows, tombstones and progress together when a real transaction write limit interrupts the batch", async () => {
    // Four writes permit admission and individual inserts, but not two tombstones,
    // two deletes AND a progress update. Exercise actual storage rollback.
    const { t, document, request } = await fixture(4);
    const ids = [await document(), await document()];
    const requestId = await request(ids);
    await expect(t.action(ops.processDeletionRequest, { requestId })).rejects.toThrow(/limit/i);
    for (const id of ids) expect(await t.run(ctx => ctx.db.get(id))).not.toBeNull();
    expect(await t.run(ctx => ctx.db.query("deletionTombstones").collect())).toEqual([]);
    expect(await t.run(ctx => ctx.db.get(requestId))).toMatchObject({
      status: "failed", deletionSummary: { recordsDeleted: 0, failedDeletions: [{ error: expect.stringMatching(/limit/i) }] },
    });
  });

  it("rechecks revoked operator authority before the next batch of an interrupted request", async () => {
    const { t, role, document, request } = await fixture();
    const ids: Id<"documents">[] = [];
    for (let i = 0; i < 10; i++) ids.push(await document());
    const requestId = await request(ids);
    await t.mutation(ops.advanceDeletionRequest, { requestId });
    await t.run(ctx => ctx.db.patch(role, { role: "viewer" }));
    await expect(t.action(ops.processDeletionRequest, { requestId })).rejects.toThrow(/owner or admin/i);
    expect(await t.run(ctx => ctx.db.query("documents").collect())).toHaveLength(2);
    expect(await t.run(ctx => ctx.db.get(requestId))).toMatchObject({ status: "failed", deletionSummary: { recordsDeleted: 8 } });
  });

  it("validates every reference before the first destructive batch even when a bad reference is later in the list", async () => {
    const { t, member, document, request } = await fixture();
    const ids: Id<"documents">[] = [];
    for (let i = 0; i < 9; i++) ids.push(await document());
    const requestId = await request(ids);
    await t.run(ctx => ctx.db.patch(requestId, { recordIds: [...ids.map(id => `documents:${id}`), `documents:${member}`] }));
    expect(await t.action(ops.processDeletionRequest, { requestId })).toMatchObject({ success: false, status: "failed", recordsDeleted: 0 });
    expect(await t.run(ctx => ctx.db.query("documents").collect())).toHaveLength(9);
    expect(await t.run(ctx => ctx.db.query("deletionTombstones").collect())).toEqual([]);
  });

  it("rejects requests to erase the executor's authority and audit records, and defends against legacy admission bypass", async () => {
    const { t, admin, member, role, document, request } = await fixture();
    const requestId = await request([await document()]);
    const audit = (await t.run(ctx => ctx.db.query("adminAuditLog").collect()))[0];
    for (const ref of [`deletionRequests:${requestId}`, `adminAuditLog:${audit._id}`, `adminUsers:${role}`, `users:${member}`]) {
      await expect(t.withIdentity({ subject: admin }).mutation(admission, {
        scope: "specific_records", subject: "reviewed", recordIds: [ref],
      })).rejects.toThrow(/protected/i);
    }
    await t.run(ctx => ctx.db.patch(requestId, { recordIds: [`deletionRequests:${requestId}`] }));
    expect(await t.action(ops.processDeletionRequest, { requestId })).toMatchObject({ success: false, status: "failed" });
    expect(await t.run(ctx => ctx.db.get(requestId))).not.toBeNull();
  });

  it("holds legacy in-progress state instead of assuming its previous partial deletions were safe or complete", async () => {
    const { t, document, request } = await fixture();
    const doc = await document(); const requestId = await request([doc]);
    await t.run(ctx => ctx.db.patch(requestId, { status: "in_progress" }));
    expect(await t.action(ops.processDeletionRequest, { requestId })).toMatchObject({ success: false, status: "failed", recordsDeleted: 0 });
    expect(await t.run(ctx => ctx.db.get(doc))).not.toBeNull();
  });

  it("processes resumed and pending requests through the cron while reporting unsupported requests as failures", async () => {
    const { t, member, document, request } = await fixture();
    const ids: Id<"documents">[] = [];
    for (let i = 0; i < 10; i++) ids.push(await document());
    const resumed = await request(ids);
    await t.mutation(ops.advanceDeletionRequest, { requestId: resumed });
    await request([await document()]);
    await t.withIdentity({ subject: member }).mutation(admission, { scope: "user_data", subject: member });
    expect(await t.action(ops.processPendingDeletionRequests, { limit: 3 })).toEqual({ processed: 3, succeeded: 2, failed: 1, deferred: 0 });
    expect(await t.run(ctx => ctx.db.query("deletionTombstones").collect())).toHaveLength(11);
    expect(await t.action(ops.processPendingDeletionRequests, { limit: 3 })).toEqual({ processed: 0, succeeded: 0, failed: 0, deferred: 0 });
  });

  it("rejects invalid cron budgets and handles an empty valid queue without touching storage from an action", async () => {
    const { t } = await fixture();
    for (const limit of [0, -1, 1.5, 11]) await expect(t.action(ops.processPendingDeletionRequests, { limit })).rejects.toThrow(/limit|integer/i);
    expect(await t.action(ops.processPendingDeletionRequests, { limit: 1 })).toEqual({ processed: 0, succeeded: 0, failed: 0, deferred: 0 });
  });

  it("handles representative large stored documents within real transaction bandwidth limits", async () => {
    const { t, document, request } = await fixture();
    const ids: Id<"documents">[] = [];
    for (let i = 0; i < 18; i++) ids.push(await document("x".repeat(850_000)));
    const requestId = await request(ids);
    expect(await t.action(ops.processDeletionRequest, { requestId })).toMatchObject({ success: true, status: "completed", recordsDeleted: 18 });
    expect(await t.run(ctx => ctx.db.query("deletionTombstones").collect())).toHaveLength(18);
  }, 30000);

  it("does not let a late failure report overwrite a completed concurrent transaction", async () => {
    const { t, document, request } = await fixture();
    const requestId = await request([await document()]);
    await t.action(ops.processDeletionRequest, { requestId });
    await t.mutation(ops.recordDeletionFailure, { requestId, error: "Late worker timeout" });
    expect(await t.run(ctx => ctx.db.get(requestId))).toMatchObject({ status: "completed", deletionSummary: { recordsDeleted: 1, failedDeletions: [] } });
  });
});
