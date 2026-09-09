# Saved preference return contracts

A returning user should see the research lens and calendar choices they saved. `getMeSnapshot` now retains the generated stored-document type; its emitted JavaScript is unchanged. `getUserPreferences` returns the three owned calendar fields already accepted by `updateUserPreferences`: `gmailIngestEnabled`, `gcalSyncEnabled`, and `calendarAutoAddMode`. Explicit `false` and `auto` survive readback; only unset fields on an existing row use `true`, `true`, and `propose`.

The no-authentication and no-row response shapes remain unchanged. The query still accepts no caller-supplied user ID and projects an allowlist, without returning the private preferences document. Profile reads keep authenticated-owner precedence and the existing explicit anonymous-session bearer fallback. Nested profile preferences remain schema-any: migrated theme/time-zone settings and other legacy keys are not newly narrowed or validated.

## Reproduce the focused proof

From the repository root, with its existing dependencies and no provider configuration:

```sh
node node_modules/vitest/vitest.mjs run backend/convex/domains/product/__tests__/preferencesReturnContract.test.ts apps/web/src/lib/__tests__/preferencesReturnContract.test.tsx apps/web/src/features/entities/components/notebook/EntityNotebookLive.empty-state.test.tsx --maxWorkers=1 --minWorkers=1 --no-file-parallelism --no-cache
```

The joint local run passed 24 scenarios: 12 preference scenarios plus 12 existing notebook cases. Preference coverage includes registered queries/mutations and storage, all six lenses, blank/placeholder normalization, migrated preferences, absent/deleted users, owner isolation, concurrent writes, twenty accumulated updates, actual Settings control saves, Home URL-lens precedence, Me hydration, query errors and SDK subscription cleanup. The frontend controls use the installed Convex React hooks and optional-query adapter; local watch results come from actual `convex-test` queries. Actions are blocked and unrelated panels are stubbed. This is local subscription-boundary evidence, not a deployed subscription or provider test.

Before the fix, stored `false,false,"auto"` was omitted from the query and displayed as `true,true,"propose"`. Both the storage failure and the actual control failure were retained. An initial legacy-profile fixture omitted the schema-required empty summary; that fixture error and the subsequent passing run remain distinct.

The compiler also exposed a generic-rest forwarding error in the earlier notebook fixture. That mock now calls `useQuery(args[0], args[1])`; its missing-reference/skip guard, controlled query data and all existing assertions remain unchanged. This separately authorized fixture correction changes no production behavior. The two new preference scenario paths still require reviewed CI Runtime Smoke selection before publication.

## Historical preference-only limits

- Settings control evidence is scoped to the existing reduced-motion branch. The first normal-motion mount fails in `DialogOverlay`/`SheetContent`: `asChild` forwards an array containing conditional null siblings to Radix Slot. No motion/portal/Slot mock produced this error. Normal-motion dialog interaction and production-browser confirmation remain a separate open UI issue; this preference repair does not fix or certify them.
- DOM state assertions do not certify visual, responsive, accessibility or full application quality. The tests do not operate Gmail, Google Calendar, billing or authentication providers. Returning a saved flag does not prove an external action enforces it.
- The profile change is type-only, with identical emitted JavaScript. Existing catch-to-empty behavior and anonymous-session bearer semantics are unchanged, not stronger privacy or error guarantees.
- The normal application type gate remains required. A separate diagnostic run with an explicit 6 GiB heap measures remaining errors; that heap choice is not a changed repository default or a full-gate pass. The included compiler fixture checks concrete profile/lens/calendar results, forbidden properties/types and rejected arbitrary-owner arguments; it makes no non-any claim about nested profile preferences.

No schema, generated API, client markup/defaults, SDK, dependency, CI rule, provider or deployment configuration changed in this slice. Independent acceptance and publication are separate from these author observations.

Final local diagnostic: **1,321 → 1,295**, exactly the 26 named preference-return errors removed, zero added. The included frontend contract fixture and corrected notebook fixture have zero diagnostics; all five existing invalid-API-call checks pass. The whole application checker still exits nonzero for the remaining 1,295 errors. Its earlier 1,297 and 1,296 results retain the two fixture corrections separately.

## Settings dialog follow-up

A person opening Settings with normal animation previously encountered a Radix Slot exception. The shared Sheet now marks its caller child with the existing `Slottable`; title, Close, forwarded properties and animation remain. Native observation also found focus still on the page body two seconds after closing the triggerless controlled dialog. `DialogOverlay` now records the connected opener before automatic focus and restores it on close; a removed opener retains the existing fallback.

Run the focused scenarios with:

```sh
node node_modules/vitest/vitest.mjs run apps/web/src/components/ai-ui/__tests__/sheet.test.tsx apps/web/src/lib/__tests__/preferencesReturnContract.test.tsx --maxWorkers=1 --minWorkers=1 --no-file-parallelism --no-cache
```

The joint run passed 26 cases. After removing three unsupported test-query options, the changed Sheet fixture passed all 20 cases again; the six unchanged preference cases carry from that joint run. A local fixture importing actual Settings, CSS, Radix, Framer and Convex React components passed keyboard/pointer, focus return/trap and cleanup at 390 and 1440 pixels in both motion modes, including 80 reopen cycles. It uses controlled SDK data and blocked external requests, not an authenticated route or provider integration. The existing cramped mobile Connections layout remains unresolved.

The normal build passed. One explicit 6 GiB application diagnostic reported 1,298 errors, including those three subsequently corrected fixture errors. A final semantic check using the same whole-program source selection found zero diagnostics in the corrected fixture only; it does not establish a new whole-application count or pass. The existing motion-variants diagnostic remains. Browser evidence and the build precede only that test-option correction and this note. No full UI or responsive grade is assigned.
