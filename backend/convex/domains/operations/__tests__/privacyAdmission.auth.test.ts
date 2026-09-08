/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../../../_generated/api";
import schema from "../../../schema";
import { internalMutation } from "../../../_generated/server";
import { v } from "convex/values";
import * as privacy from "../privacyEnforcement";
import * as citations from "../../documents/citationValidator";

function reroot(key: string) {
  const parts = key.replace(/^\.\//, "").split("/");
  const base = ["domains", "operations", "__tests__"];
  while (parts[0] === "..") { parts.shift(); base.pop(); }
  return [...base, ...parts].join("/");
}
const modules = Object.fromEntries(Object.entries(import.meta.glob("../../../**/*.{ts,js}"))
  .map(([key, loader]) => [reroot(key), loader]));
const publicPrivacy = api.domains.operations.privacyEnforcement;
const privatePrivacy = internal.domains.operations.privacyEnforcement;

async function fixture(moduleMap = modules) {
  const t = convexTest(schema, moduleMap);
  const data = await t.run(async ctx => {
    const member = await ctx.db.insert("users", { email: "member@example.test" });
    const other = await ctx.db.insert("users", { email: "other@example.test" });
    const admin = await ctx.db.insert("users", { email: "admin@example.test" });
    const viewer = await ctx.db.insert("users", { email: "viewer@example.test" });
    const adminRole = await ctx.db.insert("adminUsers", {
      userId: admin, email: "admin@example.test", role: "admin", permissions: [], createdAt: 1,
    });
    await ctx.db.insert("adminUsers", {
      userId: viewer, email: "viewer@example.test", role: "viewer", permissions: [], createdAt: 1,
    });
    const documentId = await ctx.db.insert("documents", {
      title: "Private cited memo", createdBy: other, isPublic: false, content: "Source [1]",
    });
    return { member, other, admin, viewer, adminRole, documentId };
  });
  return { t, ...data };
}

describe("privacy admission for people and maintenance operators", () => {
  it("denies an anonymous caller for every scope without creating requests or audit entries", async () => {
    const { t, other, admin } = await fixture();
    for (const scope of ["user_data", "entity_data", "specific_records"] as const) {
      await expect(t.mutation(publicPrivacy.createDeletionRequest, {
        scope, subject: other, requestedBy: admin, recordIds: [`users:${other}`],
      })).rejects.toThrow(/authenticated/i);
    }
    expect(await t.run(ctx => ctx.db.query("deletionRequests").collect())).toEqual([]);
    expect(await t.run(ctx => ctx.db.query("adminAuditLog").collect())).toEqual([]);
  });

  it("denies cross-owner, entity and record deletion for members and read-only operators", async () => {
    const { t, member, viewer, other, admin } = await fixture();
    for (const caller of [member, viewer]) {
      const session = t.withIdentity({ subject: caller });
      for (const scope of ["user_data", "entity_data", "specific_records"] as const) {
        await expect(session.mutation(publicPrivacy.createDeletionRequest, {
          scope, subject: other, requestedBy: admin, recordIds: [`users:${other}`],
        })).rejects.toThrow(/owner or admin/i);
      }
    }
    expect(await t.run(ctx => ctx.db.query("deletionRequests").collect())).toEqual([]);
  });

  it("lets a person request their own data while deriving both request and audit actor from the session", async () => {
    const { t, member, admin } = await fixture();
    const id = await t.withIdentity({ subject: member }).mutation(publicPrivacy.createDeletionRequest, {
      scope: "user_data", subject: member, requestedBy: admin,
    });
    const request = await t.run(ctx => ctx.db.get(id));
    expect(request).toMatchObject({ requestedBy: member, authorizedBy: member, subject: member, status: "pending" });
    const logs = await t.run(ctx => ctx.db.query("adminAuditLog").collect());
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ actor: member, resourceId: id });
    expect(await t.query(privatePrivacy.getDeletionRequest, { requestId: id })).toMatchObject({ _id: id });
  });

  it("lets an authenticated admin submit a bounded, valid broader request", async () => {
    const { t, admin, other, documentId } = await fixture();
    const id = await t.withIdentity({ subject: admin }).mutation(publicPrivacy.createDeletionRequest, {
      scope: "specific_records", subject: "Reviewed support request", requestedBy: other,
      recordIds: [`documents:${documentId}`],
    });
    expect(await t.query(privatePrivacy.getDeletionRequest, { requestId: id })).toMatchObject({
      requestedBy: admin, authorizedBy: admin, recordIds: [`documents:${documentId}`],
    });
    expect(await t.action(privatePrivacy.processDeletionRequest, { requestId: id })).toEqual({
      success: true, status: "completed", recordsDeleted: 1, tablesAffected: ["documents"],
    });
    expect(await t.run(ctx => ctx.db.get(documentId))).toBeNull();
    expect(await t.run(ctx => ctx.db.query("deletionTombstones").collect())).toHaveLength(1);
  });

  it("rejects oversized or malformed requests atomically even for an admin", async () => {
    const { t, admin, other, documentId } = await fixture();
    const session = t.withIdentity({ subject: admin });
    const invalid = [
      { subject: "", recordIds: [`documents:${documentId}`] },
      { subject: "x".repeat(513), recordIds: [`documents:${documentId}`] },
      { subject: "reviewed", recordIds: [] },
      { subject: "reviewed", recordIds: [`documents:${other}`] },
      { subject: "reviewed", recordIds: ["not-a-record-reference"] },
      { subject: "reviewed", recordIds: Array(201).fill(`documents:${documentId}`) },
    ];
    for (const args of invalid) {
      await expect(session.mutation(publicPrivacy.createDeletionRequest, {
        scope: "specific_records", requestedBy: admin, ...args,
      })).rejects.toThrow(/invalid|limit|between|record|subject/i);
    }
    expect(await t.run(ctx => ctx.db.query("deletionRequests").collect())).toEqual([]);
  });

  it("holds legacy requests even when an attacker copied a real admin's ID", async () => {
    const { t, admin, documentId } = await fixture();
    const id = await t.run(ctx => ctx.db.insert("deletionRequests", {
      requestId: "legacy", scope: "specific_records", subject: "legacy",
      recordIds: [`documents:${documentId}`], requestedBy: admin, requestedAt: 1, status: "pending",
    }));
    await expect(t.query(privatePrivacy.getDeletionRequest, { requestId: id })).rejects.toThrow(/authorization|review/i);
    await expect(t.action(privatePrivacy.processDeletionRequest, { requestId: id })).rejects.toThrow(/authorization|review/i);
    expect(await t.run(ctx => ctx.db.get(documentId))).not.toBeNull();
    expect(await t.run(ctx => ctx.db.query("deletionTombstones").collect())).toEqual([]);
  });

  it("rechecks admin authority when a queued request is processed after role revocation", async () => {
    const { t, admin, adminRole, documentId } = await fixture();
    const id = await t.withIdentity({ subject: admin }).mutation(publicPrivacy.createDeletionRequest, {
      scope: "specific_records", subject: "reviewed", requestedBy: admin, recordIds: [`documents:${documentId}`],
    });
    await t.run(ctx => ctx.db.patch(adminRole, { role: "viewer" }));
    await expect(t.action(privatePrivacy.processDeletionRequest, { requestId: id })).rejects.toThrow(/owner or admin/i);
    expect(await t.run(ctx => ctx.db.get(documentId))).not.toBeNull();
    expect(await t.run(ctx => ctx.db.query("deletionTombstones").collect())).toEqual([]);
  });

  it("keeps identities isolated through concurrent abuse and repeated legitimate request histories", async () => {
    const { t, member, other, admin } = await fixture();
    const session = t.withIdentity({ subject: member });
    for (let round = 0; round < 12; round++) {
      const attacks = await Promise.allSettled(Array.from({ length: 10 }, () => session.mutation(
        publicPrivacy.createDeletionRequest, { scope: "user_data", subject: other, requestedBy: admin },
      )));
      expect(attacks.every(result => result.status === "rejected")).toBe(true);
      await session.mutation(publicPrivacy.createDeletionRequest, {
        scope: "user_data", subject: member,
      });
    }
    const requests = await t.run(ctx => ctx.db.query("deletionRequests").collect());
    expect(requests).toHaveLength(12);
    expect(requests.every(row => row.subject === member && row.requestedBy === member)).toBe(true);
    expect(await t.run(ctx => ctx.db.get(other))).not.toBeNull();
  });

  it("rejects a session whose user was removed before admission", async () => {
    const { t, member } = await fixture();
    await t.run(ctx => ctx.db.delete(member));
    await expect(t.withIdentity({ subject: member }).mutation(publicPrivacy.createDeletionRequest, {
      scope: "user_data", subject: member, requestedBy: member,
    })).rejects.toThrow(/authenticated|user/i);
    expect(await t.run(ctx => ctx.db.query("deletionRequests").collect())).toEqual([]);
  });

  it("rolls back admission when the mandatory audit write fails", async () => {
    // Controlled audit outage; admission and transactional storage are the real implementation.
    const { t, member } = await fixture({ ...modules,
      "domains/operations/adminAuditLog.ts": async () => ({
        logAdminActionInternal: internalMutation({ args: v.any(), handler: async () => {
          throw new Error("Controlled audit storage outage");
        } }),
      }),
    });
    await expect(t.withIdentity({ subject: member }).mutation(publicPrivacy.createDeletionRequest, {
      scope: "user_data", subject: member,
    })).rejects.toThrow(/audit storage outage/i);
    expect(await t.run(ctx => ctx.db.query("deletionRequests").collect())).toEqual([]);
  });

  it("rejects a caller attempting to supply the server-only authorization field", async () => {
    const { t, member, admin } = await fixture();
    await expect(t.withIdentity({ subject: member }).mutation(publicPrivacy.createDeletionRequest, {
      scope: "user_data", subject: member, authorizedBy: admin,
    } as never)).rejects.toThrow();
    expect(await t.run(ctx => ctx.db.query("deletionRequests").collect())).toEqual([]);
  });

  it("keeps maintenance metadata and document citation tools off the public function surface", async () => {
    // convex-test intentionally allows internal calls; the real registration flag is the visibility contract.
    for (const endpoint of [privacy.getQueuedDeletionRequests, privacy.getExpiredRecords, privacy.getDeletionRequest,
      citations.validateDocumentCitations, citations.generateCitationReport]) {
      expect(endpoint).toHaveProperty("isInternal", true);
      expect(endpoint).not.toHaveProperty("isPublic", true);
    }
    const { t, documentId } = await fixture();
    expect(await t.query(internal.domains.documents.citationValidator.validateDocumentCitations, { documentId }))
      .toMatchObject({ isValid: false, orphanCitations: ["[1]"] });
    expect(await t.action(internal.domains.documents.citationValidator.validateBatchDocuments, { documentIds: [documentId] }))
      .toMatchObject({ allValid: false, results: [{ documentId, isValid: false, orphanCount: 1 }] });
  });
});
