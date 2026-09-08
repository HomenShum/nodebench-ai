# Backend call typing and application handoff

A developer adding a screen must know which backend function can be called, what arguments it accepts and what it returns. At this repository's size, the previous generated API could become `any` or `never`, allowing invalid calls or making valid namespaces unusable. The root TypeScript command also checked zero files. A green result from that command did not establish that the application compiled.

The default installation now applies `scripts/patch-convex-api-codegen.mjs` to Convex 1.45.0's exact reviewed CLI bytes. It changes only the dynamic declaration generator: namespaces are constructed structurally and Convex's existing argument, result and public/internal inference runs per module. Runtime function bindings and the SDK's type helpers are unchanged. The existing stats-package repair still runs first.

This repair supports the default JavaScript plus `.d.ts` generation mode used here. Static API generation and generated TypeScript mode are separate implementations and are not covered. Any Convex version change, unexpected CLI modification or unexpected repair output fails installation. Review the published package and update the guarded repair before upgrading; do not skip postinstall to obtain a green check.

## Reproduce the checks

1. Use the repository's declared Node/npm versions in a fresh checkout and run the normal dependency installation. Do not install through another checkout's dependency junction.
2. Run `npm run test:convex-api-codegen`. This checks installed bytes, repeat installation, package/version drift, current module bindings, repeated large generations and nested/reserved/empty names in temporary owned fixtures.
3. Run the existing coordinated `npx convex codegen` workflow against the configured development/CI deployment. It must preserve the module-local declaration. Do not deploy out of band to shared production. The CI job performs this step with its existing credential configuration.
4. Run `npm run typecheck:app`. This loads `tsconfig.app.json`, requires the actual application entrypoint and rejects the permissive backend shims. A virtual caller checks valid public/internal arguments and results, then requires five deliberate invalid argument/result/visibility cases to fail. Those five expected diagnostics are test evidence; every real application diagnostic remains a failure.
5. Read `.tmp/app-typecheck/report.json` and `diagnostics.log`. After successful installation, CI runs the generator contracts and application check even when codegen's embedded backend typecheck fails. That original failure remains a failed job; no failure is masked. CI uploads the application report even when its check fails. Run `npm run build` and the relevant runtime tests separately; a bundle build cannot substitute for application typing.

## Current result and limits

The current application program includes 1,378 roots and retains 1,547 backend module imports. Its five API caller contracts pass with no ambient SDK overrides. Native Windows application checking still reports **1,399 source diagnostics**. The complete backend program uses 1,678 roots and the real SDK, reporting **1,091 diagnostics**. Both checks remain failures; developer/user readiness is incomplete.

The two obsolete Convex ambient declaration files have been removed. They replaced validators, database/function builders and table IDs with permissive stand-ins, causing valid SDK exports to disappear while allowing invalid identities and values. The old 3,601-diagnostic result came from that different type environment and is not a source-bug repair count. Six backend consumer cases now reject incorrect arguments, namespace visibility, table identities and validator values under the actual backend configuration.

Run `npx tsc -p backend/convex --noEmit --pretty false` for the direct backend check and `npm run preflight:json` for release preflight. Preflight calls the existing application checker through the current Node executable with a fifteen-minute limit. A known-broken app no longer passes through the empty root project. Compiler errors, process timeouts and startup failures remain failures with an actionable diagnostic excerpt. Read artifacts from the completed current run; visual, responsive and interaction grades require separate rendered evidence.

If the generator changes, verify normal installation, idempotence, unknown-version/source rejection, failed-write preservation, deterministic complete module bindings and semantic caller checks with real Convex types. Do not widen types, ignore real diagnostics or add a score floor to make the gate pass.

## Research dashboard type exports

The research type barrel now re-exports its 15 dashboard interfaces from the
sibling `features/research/types.ts`. The directory migration had changed that
reference to `./`, which resolved back to the barrel and produced circular aliases.
This restores the original type owner without changing any interface or runtime
JavaScript.

With a normal npm 11.5.2 install on Node 22.22.2, the complete application check
falls from 1,546 to 1,531 diagnostics: exactly the 15 circular aliases disappear,
and every other diagnostic is unchanged. The generated API caller checks still
pass without ambient shims. A compiler consumer probe confirms all 15 declaration
identities and rejects five invalid chart, dashboard, update, evidence and toggle
inputs. All nine existing research tests and the bundle build pass. The first
full-check attempt exceeded four minutes; the retained completed before/after
runs used a fifteen-minute limit.

Full application and legacy backend typing remain failed. These source checks
do not establish visual, responsive, interaction or production acceptance.

## Pipeline ownership records

Pipeline readers need the accepted record after checking caller ownership. The
shared `getOwnedPipelineRow` helper returns that original record or `null` when
it is missing or differently owned. All six callers consume this result while
preserving their existing null response or unauthorized error. Avoid a
`row is T` predicate here: a rejected result can still be a non-null record
belonging to another caller.

The complete Windows application check falls from 1,531 to 1,488 diagnostics:
exactly 43 nullable-record errors disappear from pipeline queries, with no new
or otherwise changed diagnostics. All 21 ownership/isolation tests pass before
and after, including 120 public/internal detail, stream and bundle reads in six
bursts while 18 runs and their steps/streams accumulate. Five invalid typed
consumer cases reject, the local build passes, and all 17 endpoint registrations
and input/output validators in the touched files remain unchanged. The API
caller checks still pass with zero ambient shims.
The CI runtime smoke job runs both ownership and truth-isolation suites.

This does not complete application typing or certify sustained production load,
provider behavior, security of unrelated endpoints or visual/UI acceptance.

## Preflight and SDK declaration verification

Before the repair, the isolated preflight app gate returned success even though
the actual application check reported 1,488 errors. It now exits 1 at `tsc-app`,
preserves the same complete app diagnostic set and reports concrete source
locations. Direct backend compilation reports exactly the 1,173 diagnostics
observed in the earlier in-memory probe with only the two shim roots excluded.
No remaining implementation error is suppressed.

The six backend typed-consumer cases pass with zero shims. Sixteen existing
workflow tests and the local build pass. A stale workflow assertion was corrected
to exercise the existing configured-project resolver. Controlled child-result
checks exercise clean, invalid, timed-out, missing-executable and output-limit
outcomes across both platform branches; actual compiler/preflight evidence is
recorded separately.

## Action result contracts

A workflow author needs the concrete result of a backend call before reading its
fields. Some wrappers inferred that result through the generated API, which maps
all exports in the same module, including the wrapper itself. That circular
dependency prevented callers from using otherwise declared result contracts.

Twenty-seven modules now reuse existing callee result types, primitive results,
or table-specific IDs at the awaited binding or wrapper handler. The agent work
cycle declares its four numeric metrics, and event creation retains its actual
`{ docId, eventId }` object. No validators, API visibility, permissions, provider
calls, runtime statements or generated declarations change. Emitted JavaScript
matches exactly in all 27 modules; 180 endpoint contracts remain unchanged.

Complete diagnostic comparison removes 28 circular errors (77 to 49). Application
diagnostics fall from 1,488 to 1,463 and backend diagnostics from 1,173 to 1,154.
Fifteen newly exposed diagnostic locations identify existing namespace, argument,
missing-function and result-field defects. They remain failures. A separate wiki
evaluation result depends on a table missing from the current schema; that module
is unchanged pending investigation of its intended data owner.

Check result fields as well as broad scalar incompatibility: a scalar-only probe
missed an incorrect intermediate event-ID annotation, which the complete source
diagnostics caught before commit. Targeted consumer verification covers all 27
wrapper references, rejects 29 invalid scalar/table/field uses, and compares new
local annotations with their producer handler results. All 24 existing ownership,
receipt, posting-policy, maintenance and handoff scenarios pass before and after;
the corrected source build passes. These checks do not certify provider behavior,
visual quality, responsiveness, interaction quality or full application typing.

## Backend function visibility at call sites

A backend workflow must select the namespace in which its callee is actually
registered. Eighty-two calls now use the correct public/internal namespace while
retaining their function paths, kinds and arguments. Each corrected root binds
to the generated API import. The installed runtime resolves every old/new pair
to the same function address; 234 endpoint registrations and validator contracts
remain unchanged. Emitted code matches after normalizing only those verified
equivalent references and their namespace imports, rather than matching as raw
JavaScript bytes.

Three financial handler results also declare their existing concrete return
contracts. Otherwise their circular inference errors turn internal namespaces
into TypeScript error values and mask negative tests. All 82 corrected references
now resolve with concrete kind/visibility, and all 82 wrong-namespace probes are
rejected. The first 83-call attempt and its three missed negative checks were
retained during verification. The banking workflow's `step.runQuery` accepts
internal queries only, so that caller remains unchanged pending the citation
access-boundary repair.

Complete Windows diagnostics fall from 1,463 to 1,399 for the app and 1,154 to
1,091 for the backend. The comparison removes 82 namespace errors and three
cycles; the app additionally clears one downstream diagnostic. It exposes 22
other source errors, and two retained messages now describe more precise types.
Those failures remain visible. All 26 existing document, pipeline, operations
authorization and posting-policy scenarios pass before and after; the final
source build passes.

Registration equivalence does not certify existing authorization. The public
citation-validation and retention-query helpers need an ownership/access review;
their inspected handlers accept record or user IDs without resolving the caller
first. Full typing, provider behavior and product/UI acceptance remain open.
