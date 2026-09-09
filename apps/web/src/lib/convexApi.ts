/**
 * Lazy Convex API accessor.
 *
 * PROBLEM: importing `api` from `convex/_generated/api` at the top level
 * of layout components pulls 513 circular dependency chains into the initial
 * bundle, causing a Temporal Dead Zone crash in headless Chrome:
 *   "Cannot access 'o' before initialization"
 *
 * SOLUTION: defer the import to first use. The api object is cached after
 * the first dynamic import resolves. Components use `getApi()` instead of
 * a top-level `import { api }`.
 *
 * Usage:
 *   const api = await getApi();
 *   convex.query(api.domains.foo.bar, { ... });
 *
 * Or for hooks (synchronous):
 *   import { useConvexApi, useOptionalQuery } from "@/lib/convexApi";
 *   const api = useConvexApi();
 *   // api is null on first render, populated after dynamic import
 *   const data = useOptionalQuery(api?.domains.foo.bar, args);
 */

import { useState, useEffect, useMemo } from "react";
import { useQueries, type OptionalRestArgsOrSkip, type RequestForQueries } from "convex/react";
import { getFunctionName, type FunctionReference, type FunctionReturnType } from "convex/server";
import { convexToJson } from "convex/values";

/** Keep hook order stable while a public query reference is loading. */
export function useOptionalQuery<Query extends FunctionReference<"query", "public">>(
  query: Query | null | undefined,
  ...args: OptionalRestArgsOrSkip<Query>
): FunctionReturnType<Query> | undefined {
  const skip = query == null || args[0] === "skip";
  const queryName = query == null ? undefined : getFunctionName(query);
  const argsObject = args[0] === "skip" ? {} : args[0] ?? {};
  const requests = useMemo<RequestForQueries>(
    (): RequestForQueries => query != null && !skip ? { query: { query, args: argsObject } } : {},
    // Match useQuery's semantic identity rather than fresh proxy/argument objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryName, JSON.stringify(convexToJson(argsObject)), skip],
  );
  const results = useQueries(requests);
  const result: unknown = results.query;
  if (result instanceof Error) throw result;
  // useQueries erases the map's result types; this key contains only Query.
  return result as FunctionReturnType<Query> | undefined;
}

type ConvexApi = typeof import("@convex/_generated/api")["api"];

let _cached: ConvexApi | null = null;
let _promise: Promise<ConvexApi> | null = null;

// Pre-warm: kick off the import immediately on module load.
// By the time React renders the first component that calls useConvexApi(),
// the promise is likely already resolved, eliminating the null flash.
if (typeof window !== "undefined") {
  _promise = import("@convex/_generated/api").then((mod) => {
    _cached = mod.api;
    return _cached;
  });
}

/** Async getter — resolves to the api object. Cached after first call. */
export function getApi(): Promise<ConvexApi> {
  if (_cached) return Promise.resolve(_cached);
  if (_promise) return _promise;
  _promise = import("@convex/_generated/api").then((mod) => {
    _cached = mod.api;
    return _cached;
  });
  return _promise;
}

/** Synchronous getter — returns null until the dynamic import resolves. */
export function getApiSync(): ConvexApi | null {
  if (!_cached && !_promise) {
    // Kick off the import
    void getApi();
  }
  return _cached;
}

/** React hook — returns api (or null on first render before import resolves). */
export function useConvexApi(): ConvexApi | null {
  const [api, setApi] = useState<ConvexApi | null>(_cached);

  useEffect(() => {
    if (_cached) {
      setApi(_cached);
      return;
    }
    void getApi().then((a) => setApi(a));
  }, []);

  return api;
}
