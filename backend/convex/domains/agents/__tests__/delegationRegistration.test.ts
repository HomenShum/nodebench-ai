/// <reference types="vite/client" />
// @vitest-environment node
import { convexTest } from "convex-test";
import type { FunctionArgs, FunctionReference } from "convex/server";
import { describe, expect, expectTypeOf, it } from "vitest";
import { api, internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import schema from "../../../schema";
import * as handlers from "../agentDelegations";

const modules = Object.fromEntries(
  Object.entries(import.meta.glob("../../../**/*.{ts,js}")).map(([key, loader]) => {
    const parts = key.replace(/^\.\//, "").split("/");
    const base = ["domains", "agents", "__tests__"];
    while (parts[0] === "..") { parts.shift(); base.pop(); }
    return [[...base, ...parts].join("/"), loader];
  }),
);
const fixture = () => convexTest({ schema, modules, transactionLimits: true });
const readers = api.domains.agents.agentDelegations;
const writers = internal.domains.agents.agentDelegations;
type IsAny<T> = 0 extends (1 & T) ? true : false;

// Checked by the real backend TypeScript program; never invoked at runtime.
// Vitest runtime success by itself does not establish these compiler contracts.
function compilerContracts(userId: Id<"users">, documentId: Id<"documents">) {
  expectTypeOf(readers.listByRun).toMatchTypeOf<FunctionReference<"query", "public">>();
  expectTypeOf(readers.getWriteEvents).toMatchTypeOf<FunctionReference<"query", "public">>();
  expectTypeOf(readers.getByDelegationId).toMatchTypeOf<FunctionReference<"query", "public">>();
  expectTypeOf(writers.listByRunInternal).toMatchTypeOf<FunctionReference<"query", "internal">>();
  expectTypeOf(writers.getWriteEventsInternal).toMatchTypeOf<FunctionReference<"query", "internal">>();
  expectTypeOf(writers.createDelegation).toMatchTypeOf<FunctionReference<"mutation", "internal">>();
  expectTypeOf(writers.updateStatus).toMatchTypeOf<FunctionReference<"mutation", "internal">>();
  expectTypeOf(writers.emitWriteEvent).toMatchTypeOf<FunctionReference<"mutation", "internal">>();
  expectTypeOf(writers.updateMergeStatus).toMatchTypeOf<FunctionReference<"mutation", "internal">>();
  expectTypeOf(writers.cancelDelegation).toMatchTypeOf<FunctionReference<"mutation", "internal">>();
  expectTypeOf<IsAny<typeof readers.listByRun>>().toEqualTypeOf<false>();
  expectTypeOf<IsAny<typeof writers.createDelegation>>().toEqualTypeOf<false>();
  expectTypeOf<IsAny<FunctionArgs<typeof writers.createDelegation>>>().toEqualTypeOf<false>();
  expectTypeOf<IsAny<FunctionArgs<typeof writers.updateStatus>>>().toEqualTypeOf<false>();
  expectTypeOf<IsAny<FunctionArgs<typeof writers.emitWriteEvent>>>().toEqualTypeOf<false>();

  // @ts-expect-error The public projection must not expose this internal query.
  readers.listByRunInternal;
  // @ts-expect-error Internal event reads are not a public history API.
  readers.getWriteEventsInternal;
  // @ts-expect-error External callers cannot create delegation rows.
  readers.createDelegation;
  // @ts-expect-error External callers cannot set another delegation's status.
  readers.updateStatus;
  // @ts-expect-error External callers cannot forge streaming events.
  readers.emitWriteEvent;
  // @ts-expect-error Merge writes retain internal visibility.
  readers.updateMergeStatus;
  // @ts-expect-error Cancellation is not a public unowned-ID operation.
  readers.cancelDelegation;
  // @ts-expect-error This query is registered public and performs its own auth check.
  writers.listByRun;
  // @ts-expect-error The owner-facing event projection is public.
  writers.getWriteEvents;
  // @ts-expect-error The owner-facing lookup is public.
  writers.getByDelegationId;

  const create = (args: FunctionArgs<typeof writers.createDelegation>) => args;
  const status = (args: FunctionArgs<typeof writers.updateStatus>) => args;
  const event = (args: FunctionArgs<typeof writers.emitWriteEvent>) => args;
  const valid = { runId: "run", delegationId: "delegation", userId, agentName: "DocumentAgent", query: "Read the supplied report" } as const;
  create(valid);
  status({ delegationId: "delegation", status: "running" });
  event({ delegationId: "delegation", seq: 0, kind: "note", textChunk: "Started" });
  // @ts-expect-error The executor has no DossierAgent registration.
  create({ ...valid, agentName: "DossierAgent" });
  // @ts-expect-error A document ID cannot select the user identity.
  create({ ...valid, userId: documentId });
  // @ts-expect-error Delegation status is the existing validated literal union.
  status({ delegationId: "delegation", status: "invented" });
  // @ts-expect-error Event kind is the existing validated literal union.
  event({ delegationId: "delegation", seq: 0, kind: "invented" });
  // @ts-expect-error The sequence is numeric, not a text cursor.
  event({ delegationId: "delegation", seq: "next", kind: "note" });
}
void compilerContracts;

async function seedOwners(t: ReturnType<typeof fixture>) {
  return t.run(async ctx => ({
    ownerA: await ctx.db.insert("users", { name: "Delegation owner A" }),
    ownerB: await ctx.db.insert("users", { name: "Delegation owner B" }),
  }));
}

describe("a person follows delegated research without exposing another person's work", () => {
  it("keeps the three owner-facing readers public and all seven trusted helpers internal", () => {
    const publicQueries = [handlers.listByRun, handlers.getWriteEvents, handlers.getByDelegationId];
    const internalQueries = [handlers.listByRunInternal, handlers.getWriteEventsInternal];
    const internalMutations = [handlers.createDelegation, handlers.updateStatus, handlers.emitWriteEvent, handlers.updateMergeStatus, handlers.cancelDelegation];
    for (const handler of publicQueries) {
      expect(handler).toHaveProperty("isQuery", true);
      expect(handler).toHaveProperty("isPublic", true);
      expect(handler).not.toHaveProperty("isInternal", true);
    }
    for (const handler of [...internalQueries, ...internalMutations]) {
      expect(handler).toHaveProperty("isInternal", true);
      expect(handler).not.toHaveProperty("isPublic", true);
    }
    for (const handler of internalQueries) expect(handler).toHaveProperty("isQuery", true);
    for (const handler of internalMutations) expect(handler).toHaveProperty("isMutation", true);
  });

  it("stores progress through real internal mutations while guests and foreign owners see no private rows", async () => {
    const t = fixture();
    const { ownerA, ownerB } = await seedOwners(t);
    const a = t.withIdentity({ subject: String(ownerA) });
    const b = t.withIdentity({ subject: String(ownerB) });
    for (const [userId, delegationId] of [[ownerA, "a"], [ownerB, "b"]] as const) {
      expect(await t.mutation(writers.createDelegation, {
        userId, delegationId, runId: "shared-run-label", agentName: "DocumentAgent", query: `${delegationId} private report`,
      })).toEqual({ delegationId });
      await t.mutation(writers.updateStatus, { delegationId, status: "running", subagentThreadId: `${delegationId}-thread` });
      await t.mutation(writers.emitWriteEvent, { delegationId, seq: 0, kind: "tool_end", toolName: `${delegationId}-tool` });
      await t.mutation(writers.emitWriteEvent, { delegationId, seq: 1, kind: "final", textChunk: `${delegationId} private result` });
      await t.mutation(writers.updateStatus, { delegationId, status: "completed" });
      await t.mutation(writers.updateMergeStatus, { delegationId, mergeStatus: "merged" });
    }
    const rowsA: Doc<"agentDelegations">[] = await a.query(readers.listByRun, { runId: "shared-run-label" });
    const rowsB: Doc<"agentDelegations">[] = await b.query(readers.listByRun, { runId: "shared-run-label" });
    expect(rowsA.map(row => row.delegationId)).toEqual(["a"]);
    expect(rowsB.map(row => row.delegationId)).toEqual(["b"]);
    expect(rowsA[0]).toMatchObject({ userId: ownerA, status: "completed", mergeStatus: "merged", subagentThreadId: "a-thread" });
    expect(rowsA[0].finishedAt).toBeGreaterThanOrEqual(rowsA[0].startedAt ?? Infinity);
    expect(await t.query(readers.listByRun, { runId: "shared-run-label" })).toEqual([]);
    for (const viewer of [t, b]) {
      expect(await viewer.query(readers.getByDelegationId, { delegationId: "a" })).toBeNull();
      expect(await viewer.query(readers.getWriteEvents, { delegationId: "a" })).toEqual([]);
    }
    expect(await a.query(readers.getWriteEvents, { delegationId: "a", afterSeq: 0 })).toMatchObject([{ kind: "final", textChunk: "a private result", seq: 1 }]);
    expect(await a.query(readers.getByDelegationId, { delegationId: "missing" })).toBeNull();
    expect(await a.query(readers.getWriteEvents, { delegationId: "missing" })).toEqual([]);
    const trustedRows: Doc<"agentDelegations">[] = await t.query(writers.listByRunInternal, { runId: "shared-run-label", userId: ownerA });
    expect(trustedRows.map(row => row.delegationId)).toEqual(["a"]);
    expect(await t.query(writers.getWriteEventsInternal, { delegationId: "a", afterSeq: 0 })).toMatchObject([{ seq: 1 }]);
  });

  it("keeps distinct concurrent delegations isolated across twelve accumulated request rounds", async () => {
    const t = fixture();
    const { ownerA, ownerB } = await seedOwners(t);
    const a = t.withIdentity({ subject: String(ownerA) });
    const b = t.withIdentity({ subject: String(ownerB) });
    for (let round = 0; round < 12; round++) {
      await Promise.all(Array.from({ length: 5 }, async (_, lane) => {
        const delegationId = `round-${round}-lane-${lane}`;
        const userId = lane % 2 === 0 ? ownerA : ownerB;
        await t.mutation(writers.createDelegation, { delegationId, runId: "accumulated-run", userId, agentName: "MediaAgent", query: `source-${delegationId}` });
        await t.mutation(writers.updateStatus, { delegationId, status: "running" });
        for (let seq = 0; seq < 4; seq++) {
          await t.mutation(writers.emitWriteEvent, { delegationId, seq, kind: seq === 3 ? "final" : "delta", textChunk: `${delegationId}:${seq}` });
        }
        await t.mutation(writers.updateStatus, { delegationId, status: "completed" });
        const viewer = userId === ownerA ? a : b;
        const foreign = userId === ownerA ? b : a;
        const events: Doc<"agentWriteEvents">[] = await viewer.query(readers.getWriteEvents, { delegationId, afterSeq: 1 });
        expect(events.map(event => [event.seq, event.textChunk])).toEqual([[2, `${delegationId}:2`], [3, `${delegationId}:3`]]);
        expect(await foreign.query(readers.getWriteEvents, { delegationId })).toEqual([]);
      }));
      const ownA: Doc<"agentDelegations">[] = await a.query(readers.listByRun, { runId: "accumulated-run" });
      const ownB: Doc<"agentDelegations">[] = await b.query(readers.listByRun, { runId: "accumulated-run" });
      expect(ownA).toHaveLength((round + 1) * 3);
      expect(ownB).toHaveLength((round + 1) * 2);
      expect(ownA.every(row => row.userId === ownerA)).toBe(true);
      expect(ownB.every(row => row.userId === ownerB)).toBe(true);
    }
    expect(await t.run(async ctx => ({
      rows: (await ctx.db.query("agentDelegations").collect()).length,
      events: (await ctx.db.query("agentWriteEvents").collect()).length,
    }))).toEqual({ rows: 60, events: 240 });
  });

  it("retains the existing event read cap and incremental final event access", async () => {
    const t = fixture();
    const { ownerA, ownerB } = await seedOwners(t);
    await t.mutation(writers.createDelegation, { delegationId: "long-run", runId: "run", userId: ownerA, agentName: "SECAgent", query: "Read supplied filing" });
    for (let start = 0; start < 501; start += 25) {
      await Promise.all(Array.from({ length: Math.min(25, 501 - start) }, (_, offset) => {
        const seq = start + offset;
        return t.mutation(writers.emitWriteEvent, { delegationId: "long-run", seq, kind: seq === 500 ? "final" : "delta", textChunk: `part-${seq}` });
      }));
    }
    const a = t.withIdentity({ subject: String(ownerA) });
    const b = t.withIdentity({ subject: String(ownerB) });
    expect(await a.query(readers.getWriteEvents, { delegationId: "long-run", limit: 1000 })).toHaveLength(500);
    expect(await t.query(writers.getWriteEventsInternal, { delegationId: "long-run", limit: 1000 })).toHaveLength(500);
    expect(await a.query(readers.getWriteEvents, { delegationId: "long-run", afterSeq: 499 })).toMatchObject([{ seq: 500, kind: "final" }]);
    expect(await b.query(readers.getWriteEvents, { delegationId: "long-run", limit: 1000 })).toEqual([]);
  });

  it("preserves failure and cancellation records without claiming that cancellation stops the worker", async () => {
    const t = fixture();
    const { ownerA } = await seedOwners(t);
    const a = t.withIdentity({ subject: String(ownerA) });
    for (const delegationId of ["failed", "cancelled"]) {
      await t.mutation(writers.createDelegation, { delegationId, runId: "run", userId: ownerA, agentName: "OpenBBAgent", query: "Inspect fixture" });
      await t.mutation(writers.updateStatus, { delegationId, status: "running" });
    }
    await t.mutation(writers.updateStatus, { delegationId: "failed", status: "failed", errorMessage: "Fixture provider unavailable" });
    await t.mutation(writers.cancelDelegation, { delegationId: "cancelled" });
    expect(await a.query(readers.getByDelegationId, { delegationId: "failed" })).toMatchObject({ status: "failed", errorMessage: "Fixture provider unavailable" });
    expect(await a.query(readers.getByDelegationId, { delegationId: "cancelled" })).toMatchObject({ status: "cancelled" });
    // No executor/provider runs here: later worker writes can still overwrite cancellation.
    expect(await t.run(async ctx => (await ctx.db.query("agentWriteEvents").collect()).length)).toBe(0);
  });
});
