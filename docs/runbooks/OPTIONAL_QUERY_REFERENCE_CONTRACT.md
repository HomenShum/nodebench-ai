# Queries while the API loads

A notebook owner opening a screen should wait for its API reference before the
screen subscribes. If ownership or the selected notebook changes, the previous
result must not remain visible merely because the new query is loading.

Use `useOptionalQuery` from `@/lib/convexApi` for a public query reference returned
through `useConvexApi`. Pass the optional reference directly, and preserve the
existing owner/session/entity gate in the arguments position:

```tsx
const api = useConvexApi();
const authority = useOptionalQuery(
  api?.domains.agents.autonomy.grants.getAuthorityState,
  api && isOwner ? { entityId } : "skip",
);
```

For an already-static generated reference, keep the ordinary SDK `useQuery` and
put `"skip"` only in its arguments position. A string in the reference position
is a legacy function address, not the SDK's skip control.

The adapter sends zero or one entries to the public `useQueries` hook. Its memo
identity follows the SDK's function-name and Convex-serialized argument identity.
It preserves undefined loading/skipped results, legitimate falsy data, reactive
updates, Error propagation, provider requirements and subscription cleanup.
Types retain the actual public query's arguments and result. The sole result
assertion bridges the SDK's erased map value at its fixed query key.

This does not change the lazy import/prewarm/cache policy, backend admission,
mutations/actions, paginated queries or API availability. A truthy generated
proxy path does not prove a function is deployed. Client ownership gates do not
replace server authorization. The loader's rejected-import handling and existing
Settings mutation/action cold-start failures remain separate work.

Run the focused hook scenarios with:

```sh
node node_modules/vitest/vitest.mjs run apps/web/src/lib/__tests__/convexApiQuery.test.tsx
```

The scenarios use the installed React SDK and its query observer with locally
controlled watch results. They cover delayed import, owner revocation, query and
argument changes, errors, falsy data, provider changes, cleanup, and 20 consumers
through 20 ownership cycles. They establish local hook behavior, not backend
authorization, production performance or full-screen readiness.

The same file includes ordinary TypeScript negative consumers of real generated
queries. It is included by `tsconfig.app.json`; Vitest transpilation alone does
not validate them. Read the complete application checker results and its five
existing API contracts. Full application/backend typing, adjacent errors and
visual/product grades remain open.

The final local scenarios pass 11/11. The actual application diagnostic includes
this test file and accepts its eight negative argument/result/visibility contracts
without fixture errors; the five existing generated-API contracts also pass.
Application diagnostics fall from 1,356 to 1,321: all 61 mapped reference errors
disappear, while concrete inference exposes 26 existing result-field mismatches
in HomeLanding, MeHome and SettingsModal. Those product contracts are unresolved;
the full application check still fails. The 6-GiB diagnostic does not establish
a default-heap gate pass or full-screen readiness.
