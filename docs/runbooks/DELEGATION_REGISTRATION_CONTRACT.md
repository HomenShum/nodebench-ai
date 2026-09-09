# Delegation registration and argument contracts

A developer wiring parallel research needs an internal progress writer and owner-filtered queries for the person watching the results. `agentDelegations.ts` already registered those functions, but casting its builders and handler arguments to `any` hid the actual contract from the generated API. Changing call sites to the public namespace would misdescribe the functions and expose an unsafe design if their runtime visibility were also changed.

The module now infers its registrations and arguments from the existing builders and validators. Three public queries retain their authenticated owner checks; two internal queries and five internal mutations retain their visibility. No schema, generated API, SDK, runtime validator, handler statement or caller changes are needed. Emitted JavaScript is byte-identical before and after the typing repair.

The focused [scenario and compiler contracts](../../backend/convex/domains/agents/__tests__/delegationRegistration.test.ts) exercise real local Convex storage and ownership. Together with the existing swarm ownership suite, ten scenarios pass without skips: two owners sharing a run label, guest/foreign reads, twelve rounds accumulating 60 delegations and 240 events, concurrent distinct-delegation writes, and a separate 501-event history with the existing 500-result cap. These are bounded emulator observations, not production load or provider results.

The same file contains compile-time member/kind/visibility checks, explicit non-any argument checks, ten forbidden-namespace references and five invalid argument cases. Vitest alone does not check those contracts; the real backend TypeScript command does:

```sh
node node_modules/vitest/vitest.mjs run backend/convex/domains/agents/__tests__/delegationRegistration.test.ts backend/convex/domains/agents/swarmOwnership.auth.test.ts
node node_modules/typescript/bin/tsc -p backend/convex --noEmit --pretty false
```

The first compiler observation showed why builder casts alone were insufficient: handler `args: any` annotations still accepted the five deliberately invalid inputs. Removing those ten argument annotations completed the named proof without changing runtime bytes. Backend diagnostics fall from 1,061 to 1,051: ten missing-member errors disappear, with no added or changed diagnostic. The full backend check remains failed.

The separately labelled 6-GiB application diagnostic reports 1,356 errors, down from 1,369 (13 removed; 0 added). Its existing five invalid API-call checks still pass with no ambient shims. This is not a default-gate pass: the earlier default-heap run exhausted memory and remains historical evidence. Full application typing remains failed.

Existing handler context/result `any` annotations, internal caller-selected IDs, missing-record no-ops, status/cancellation races, unbounded run-list reads, invalid event-limit handling and the unsupported parallel Dossier choice remain separate review holds. Cancellation storage does not prove worker cancellation. No provider call, deployment, UI verification or full delegation-readiness claim is included.
