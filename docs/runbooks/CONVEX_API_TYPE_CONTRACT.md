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

The integrated local proof at parent `006c168` retains 1,547 current backend module imports, including eight absent from the old checked-in declaration. API caller contracts pass without ambient shims. The real application check still fails with **1,546 diagnostics**, including circular inference and invalid/missing source references. These are unresolved implementation work; this change does not make the application typecheck green or certify developer/user readiness.

The legacy `tsc -p backend/convex` check still includes permissive `_type_shims`. With per-module inference, these replacements can yield `unknown` references; the initial coordinated CI regeneration wrote the bindings and then reported 3,601 backend diagnostics. This legacy check is also unresolved, and its earlier success was not equivalent to the application check. Normal remote codegen, cold Linux installation and runtime/build results must be read from the exact candidate's CI evidence. Visual, responsiveness and interaction grades are unaffected by this tooling-only change and require their own rendered evidence.

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
