import React from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConvexProvider, ConvexReactClient, useQuery, type Watch, type WatchQueryOptions } from "convex/react";
import { getFunctionName, type ArgsAndOptions, type FunctionReference, type FunctionReturnType } from "convex/server";
import * as generated from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useOptionalQuery } from "../convexApi";

const { api, internal } = generated;
const filesQuery = api.domains.product.me.listFiles;

const clients: ConvexReactClient[] = [];
afterEach(async () => {
  cleanup();
  await Promise.all(clients.splice(0).map((client) => client.close()));
  vi.doUnmock("@convex/_generated/api");
  vi.restoreAllMocks();
});

function controlledClient() {
  const client = new ConvexReactClient("http://127.0.0.1:1", { unsavedChangesWarning: false });
  clients.push(client);
  // Actual SDK hooks and QueriesObserver; only local watch results are controlled.
  // No websocket, deployment, provider or persistent state is used.
  const active = new Map<() => void, string>();
  const values = new Map<string, unknown>();
  const key = (name: string, args: unknown) => `${name}:${JSON.stringify(args ?? {})}`;
  vi.spyOn(client, "watchQuery").mockImplementation(<Query extends FunctionReference<"query">>(reference: Query, ...argsAndOptions: ArgsAndOptions<Query, WatchQueryOptions>): Watch<FunctionReturnType<Query>> => {
    const [args] = argsAndOptions;
    const address = key(getFunctionName(reference), args);
    return {
      onUpdate: (listener) => { active.set(listener, address); return () => { active.delete(listener); }; },
      localQueryResult: () => {
        const value = values.get(address);
        if (value instanceof Error) throw value;
        return value as FunctionReturnType<Query> | undefined;
      },
      journal: () => undefined,
    };
  });
  const publish = (name: string, args: unknown, value: unknown) => {
    const address = key(name, args);
    values.set(address, value);
    for (const [listener, subscribed] of active) if (subscribed === address) listener();
  };
  const wrapper = ({ children }: { children: React.ReactNode }) => <ConvexProvider client={client}>{children}</ConvexProvider>;
  return { client, active, publish, wrapper };
}

class QueryErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() { return this.state.error ? <div role="alert">{this.state.error.message}</div> : this.props.children; }
}

describe("an owner opens a screen before the lazy API arrives", () => {
  it("does not subscribe to an endpoint named skip while waiting", () => {
    const control = controlledClient();
    const absent: typeof api.domains.product.me.listFiles | undefined = undefined;
    renderHook(() => {
      return useOptionalQuery(absent, { anonymousSessionId: "local-fixture" });
    }, { wrapper: control.wrapper });
    expect(control.active.size).toBe(0);
  });

  it("can render a missing reference without throwing", () => {
    const control = controlledClient();
    expect(() => renderHook(() => {
      return useOptionalQuery(undefined);
    }, { wrapper: control.wrapper })).not.toThrow();
  });
});

describe("optional queries retain the current viewer's lifecycle", () => {
  it("waits for the actual lazy import before subscribing with the original arguments", async () => {
    vi.resetModules();
    let release: (() => void) | undefined;
    vi.doMock("@convex/_generated/api", () => new Promise((resolve) => {
      release = () => resolve(generated);
    }));
    const lazy = await import("../convexApi");
    const control = controlledClient();
    const view = renderHook(() => {
      const loaded = lazy.useConvexApi();
      return lazy.useOptionalQuery(loaded?.domains.product.me.listFiles, { anonymousSessionId: "waiting-owner" });
    }, { wrapper: control.wrapper });
    expect(view.result.current).toBeUndefined();
    expect(control.active.size).toBe(0);
    await waitFor(() => expect(release).toBeTypeOf("function"));
    await act(async () => { release?.(); });
    expect([...control.active.values()]).toEqual([`${getFunctionName(filesQuery)}:{"anonymousSessionId":"waiting-owner"}`]);
  });

  it("keeps non-owners skipped and clears prior data on revocation and entity change", () => {
    const control = controlledClient();
    const ref = api.domains.agents.autonomy.grants.getAuthorityState;
    type Props = { owner: boolean; entityId: Id<"productEntities"> };
    const initialProps: Props = { owner: false, entityId: "entity-a" as Id<"productEntities"> };
    const view = renderHook(({ owner, entityId }: Props) => useOptionalQuery(ref, owner ? { entityId } : "skip"), { initialProps, wrapper: control.wrapper });
    expect(control.active.size).toBe(0);
    view.rerender({ ...initialProps, owner: true });
    const ownerResult = { mode: "review", grant: null };
    act(() => control.publish(getFunctionName(ref), { entityId: initialProps.entityId }, ownerResult));
    expect(view.result.current).toBe(ownerResult);
    view.rerender(initialProps);
    expect(view.result.current).toBeUndefined();
    expect(control.active.size).toBe(0);
    view.rerender({ owner: true, entityId: "entity-b" as Id<"productEntities"> });
    expect(view.result.current).toBeUndefined();
    expect(control.active.size).toBe(1);
    expect([...control.active.values()][0]).toContain("entity-b");
  });

  it("changes thread arguments and query references without retaining the previous result", () => {
    const control = controlledClient();
    const ref = api.domains.agents.lessons.lessonsPublic.listAllLessonsForThreadPublic;
    const view = renderHook(({ threadId }: { threadId: string | null }) => useOptionalQuery(ref, threadId ? { threadId } : "skip"), { initialProps: { threadId: "a" as string | null }, wrapper: control.wrapper });
    act(() => control.publish(getFunctionName(ref), { threadId: "a" }, ["first-thread"]));
    view.rerender({ threadId: "b" });
    expect(view.result.current).toBeUndefined();
    expect(control.active.size).toBe(1);
    view.rerender({ threadId: null });
    expect(view.result.current).toBeUndefined();
    expect(control.active.size).toBe(0);
    view.unmount();
    const sameShape = api.domains.product.me.getMeSnapshot;
    const switched = renderHook(({ alternate }: { alternate: boolean }) => useOptionalQuery(alternate ? sameShape : filesQuery, { anonymousSessionId: "viewer" }), { initialProps: { alternate: false }, wrapper: control.wrapper });
    act(() => control.publish(getFunctionName(filesQuery), { anonymousSessionId: "viewer" }, ["files"]));
    switched.rerender({ alternate: true });
    expect(switched.result.current).toBeUndefined();
    expect([...control.active.values()][0]).toContain(getFunctionName(sameShape));
  });

  it("preserves loading, updates and falsy values without resubscribing on equal arguments", () => {
    const control = controlledClient();
    const args = { anonymousSessionId: "viewer" };
    const view = renderHook(() => useOptionalQuery(filesQuery, { ...args }), { wrapper: control.wrapper });
    expect(view.result.current).toBeUndefined();
    const subscription = [...control.active.keys()][0];
    for (const value of [[], null, false, 0, "", ["updated"]]) {
      act(() => control.publish(getFunctionName(filesQuery), args, value));
      expect(view.result.current).toBe(value);
      view.rerender();
      expect([...control.active.keys()]).toEqual([subscription]);
    }
  });

  it("throws query failures to the error boundary instead of returning an Error as data", () => {
    const control = controlledClient();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = ({ children }: { children: React.ReactNode }) => <ConvexProvider client={control.client}><QueryErrorBoundary>{children}</QueryErrorBoundary></ConvexProvider>;
    renderHook(() => useOptionalQuery(filesQuery, {}), { wrapper });
    act(() => control.publish(getFunctionName(filesQuery), {}, new Error("local query failure")));
    expect(document.querySelector('[role="alert"]')?.textContent).toBe("local query failure");
    expect(control.active.size).toBe(0);
    consoleError.mockRestore();
  });

  it("defaults a no-argument query to empty arguments and retains the provider requirement", () => {
    const control = controlledClient();
    renderHook(() => useOptionalQuery(api.domains.auth.auth.loggedInUser), { wrapper: control.wrapper });
    expect([...control.active.values()]).toEqual([`${getFunctionName(api.domains.auth.auth.loggedInUser)}:{}`]);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useOptionalQuery(undefined, "skip"))).toThrow(/Convex client/);
    consoleError.mockRestore();
  });

  it("releases the old provider and every watch on unmount", () => {
    const first = controlledClient();
    const second = controlledClient();
    let client = first.client;
    const wrapper = ({ children }: { children: React.ReactNode }) => <ConvexProvider client={client}>{children}</ConvexProvider>;
    const view = renderHook(() => useOptionalQuery(filesQuery, {}), { wrapper });
    expect(first.active.size).toBe(1);
    client = second.client;
    view.rerender();
    expect(first.active.size).toBe(0);
    expect(second.active.size).toBe(1);
    view.unmount();
    expect(second.active.size).toBe(0);
  });

  it("bounds active watches across 20 concurrent consumers and 20 ownership cycles", () => {
    const control = controlledClient();
    const views = Array.from({ length: 20 }, (_, i) => renderHook(({ enabled, cycle }: { enabled: boolean; cycle: number }) => useOptionalQuery(filesQuery, enabled ? { anonymousSessionId: `owner-${i}-${cycle}` } : "skip"), { initialProps: { enabled: false, cycle: 0 }, wrapper: control.wrapper }));
    for (let cycle = 0; cycle < 20; cycle++) {
      for (const view of views) view.rerender({ enabled: true, cycle });
      expect(control.active.size).toBe(20);
      for (const view of views) view.rerender({ enabled: false, cycle });
      expect(control.active.size).toBe(0);
      for (const view of views) expect(view.result.current).toBeUndefined();
    }
    for (const view of views) view.unmount();
    expect(control.active.size).toBe(0);
  });

  it("retains the existing static BriefTab reference and memory argument gate", () => {
    const control = controlledClient();
    const ref = api.domains.research.dailyBriefMemoryQueries.listTaskResultsByMemory;
    const view = renderHook(({ memoryId }: { memoryId: Id<"dailyBriefMemories"> | null }) => useQuery(ref, memoryId ? { memoryId } : "skip"), { initialProps: { memoryId: null as Id<"dailyBriefMemories"> | null }, wrapper: control.wrapper });
    expect(control.active.size).toBe(0);
    view.rerender({ memoryId: "memory-a" as Id<"dailyBriefMemories"> });
    expect(control.active.size).toBe(1);
    view.rerender({ memoryId: null });
    expect(control.active.size).toBe(0);
  });
});

// Compile-only consumers, included by tsconfig.app.json. Vitest transpilation
// alone does not establish these negative contracts.
export function optionalQueryCompilerContracts(entityId: Id<"productEntities">, userId: Id<"users">) {
  const required = api.domains.agents.autonomy.proposals.listOperationStates;
  useOptionalQuery(required, { entityId });
  useOptionalQuery(required, "skip");
  useOptionalQuery(api.domains.auth.auth.loggedInUser);
  const files = useOptionalQuery(filesQuery, {});
  const typedFiles: FunctionReturnType<typeof filesQuery> | undefined = files;
  type IsAny<T> = 0 extends (1 & T) ? true : false;
  const resultIsConcrete: IsAny<typeof files> = false;
  const internalQuery = internal.domains.agents.agentDelegations.listByRunInternal;
  const internalVisibility: "internal" = internalQuery._visibility;
  // @ts-expect-error Required arguments cannot be omitted.
  useOptionalQuery(required);
  // @ts-expect-error Entity identity must come from the correct table.
  useOptionalQuery(required, { entityId: userId });
  // @ts-expect-error The limit retains its numeric type.
  useOptionalQuery(required, { entityId, limit: "all" });
  // @ts-expect-error Unknown arguments must not become a permissive record.
  useOptionalQuery(required, { entityId, unexpected: true });
  // @ts-expect-error Mutations are not queries.
  useOptionalQuery(api.domains.product.me.saveFile, "skip");
  // @ts-expect-error Internal functions are not client public queries.
  useOptionalQuery(internalQuery, "skip");
  // @ts-expect-error A string is not a callable query reference.
  useOptionalQuery("skip", {});
  // @ts-expect-error Query return members stay concrete.
  files?.nonexistentResultMember;
  return { resultIsConcrete, typedFiles, internalVisibility };
}
