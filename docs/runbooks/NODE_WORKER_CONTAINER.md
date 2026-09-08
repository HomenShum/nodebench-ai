# Build and verify the Node worker

A developer receiving this repository needs a worker image built from committed source, with its search routes and tool registry actually loaded. A frontend build or a `/health` response alone does not establish that result.

## Build inputs

The worker remains `workers/node/index.ts`, compiled with the existing `build:voice` command and started through the existing Docker entrypoint. The image uses a digest-pinned official Node22.22.2 Debian base, matching the `.nvmrc` major, and the declared npm11.5.2. Its build and runtime stages share the same root package files and public `legacy-peer-deps=true` setting.

The root `package-lock.json` is required source. When changing root dependencies, update that lock with npm11.5.2 and the repository `.npmrc`; do not substitute an installed `node_modules/.package-lock.json`. Nested package lock policies are unchanged. All 233 package version ranges remain unchanged; `dotenv` moves from development to production dependencies because the worker entrypoint imports it at startup.

Before this repair, a leftover template ignore rule excluded the root lock, both Docker stages copied a deleted patch script, Node20 differed from `.nvmrc`, and the peer-dependency setting was omitted. The workflow captures the base commit's build outcome, then requires the candidate image to build and pass its startup proof.

The first Linux checkout also exposed an accidentally tracked Claude worktree as an invalid submodule. Its Gitlink is removed from the candidate; the existing ignore rule already prevents reintroduction. The referenced commit remains reachable from main, and the inspected local directories were empty. No local worktree directory or branch was deleted.

The subsequent Linux run built the image but caught a real startup failure: `npm ci --omit=dev` correctly omitted development-only `dotenv`, then Node failed to import it. Correcting its dependency category keeps production-only installation intact. Lock regeneration changed only the root dependency metadata and the `dotenv` development flag; resolved versions and integrity values are unchanged.

## Local proof

Use a functioning Linux Docker engine. From a clean checkout:

```powershell
docker build --platform linux/amd64 -f workers/node/Dockerfile -t nodebench-worker-proof:local .
docker run -d --name nodebench-worker-proof --network none --memory 2g --cpus 2 nodebench-worker-proof:local
Get-Content -Raw scripts/worker-container-smoke.mjs | docker exec -i nodebench-worker-proof node --input-type=module
docker cp scripts/oss-stats-http-contracts.node.mjs nodebench-worker-proof:/tmp/oss-stats-http-contracts.node.mjs
docker exec nodebench-worker-proof node --test --test-concurrency=1 /tmp/oss-stats-http-contracts.node.mjs
docker cp scripts/oss-stats-token-contracts.node.mjs nodebench-worker-proof:/tmp/oss-stats-token-contracts.node.mjs
docker exec nodebench-worker-proof node --test --test-concurrency=1 /tmp/oss-stats-token-contracts.node.mjs
docker cp scripts/ai-sdk-download-contracts.node.mjs nodebench-worker-proof:/tmp/ai-sdk-download-contracts.node.mjs
docker exec nodebench-worker-proof node --test --test-concurrency=1 /tmp/ai-sdk-download-contracts.node.mjs
docker logs nodebench-worker-proof
docker rm -f nodebench-worker-proof
# A separate container requires Internet access for one fixed public tarball.
Get-Content -Raw scripts/ai-sdk-public-download-proof.mjs | docker run --rm -i --name nodebench-download-public-proof --memory 1g --cpus 1 nodebench-worker-proof:local node --input-type=module
```

Reserve both temporary container names for this proof and retain logs when it fails. The startup/contract container has no external network. The separate public-download container has Internet access for its fixed registry input. Neither has a published host port, mounted user data or supplied provider credentials. If interrupted, close the owned public-download container after retaining its logs. The proof requires:

- Correct Node worker identity and nonempty MCP tool inventory.
- Pipelinev2 health reporting that its Linkup/Gemini credentials are absent.
- Twelve concurrent and twenty repeated empty/whitespace requests rejected with HTTP400 before provider hooks, followed by malformed-JSON rejection and stable tool/session state.
- No dotenv or MCP registry-token files in the runtime image; only the public root npm policy is retained.

The CI `Worker container` job also fails on unresolved module/tool-loading errors in the worker log, uploads build and startup evidence on failure, and removes its own temporary container. It does not push images or deploy Cloud Run. Manual dispatch becomes available after the workflow exists on the default branch; PR events provide the candidate proof before adoption. See [GitHub's workflow-dispatch requirements](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch).

## Cloud Build context

The existing `workers/node/cloudbuild.yaml` remains the deployment recipe. Its upload context must include the root public `.npmrc` and root lock, while excluding nested npm credentials, dotenv files and the MCP registry-token files. The old exception allowing the LangGraph dotenv file into uploads is removed. This does not delete that local file or transfer its credentials elsewhere.

Before an authorized upload, `gcloud meta list-files-for-upload` shows the files selected by `.gcloudignore`. The controlled context proof for this repair includes the three required root package/config files and excludes five credential canaries without uploading anything.

## Acceptance boundaries

The installed statistics component retains an unused `npm-api` dependency, which brings in `paged-request` and an old Axios0.x client. A root override scopes Axios0.33.0 to `paged-request`; it leaves other Axios users and application package ranges unchanged. The component is still installed and registered, but its current source does not import `npm-api`. Do not describe the dependency finding as a demonstrated exploit of a deployed statistics action.

The container gate runs `scripts/oss-stats-http-contracts.node.mjs` against the actual production install. Its11 local-HTTP scenarios cover pagination, caching,12 concurrent owners,24 repeated rounds, error/retry behavior, request options, redirect credential boundaries, inherited auth fields, timeouts, response limits and cycle/invalid-input handling. The same source test fails on inherited credentials with Axios0.21.4 and passes all11 cases with0.33.0. These are library contract and security-canary checks, not a real registry or Convex sync.

Each dependency update requires a fresh image build, startup and the installed-library contracts before acceptance. Independent final review remains open. The original Windows host's Docker Desktop failed during local socket initialization; its startup attempt was closed with Docker data retained. That host problem is separate from a repository build result.

The original fresh npm resolution reported31 affected packages, including13 high findings, on September8,2026. The scoped Axios repair removes the four affected-package findings on that chain: at that stage the full audit had27 findings, including9 high, and the production-only audit had13 findings, including1 high. The subsequent scoped Undici update removes the remaining production high finding: the fresh production audit has12 findings (6 moderate,6 low), while the full audit remains27 (9 high,12 moderate,6 low). These are remaining dependency-security holds, not a zero-audit release. A lockfile makes the graph repeatable; it does not by itself repair vulnerabilities.

This proof supplies no working provider credentials and accepts no fabricated provider answers. It does not establish a deployed worker, application tenant/auth coverage, provider-backed golden-query results, complete app typing, visual quality, responsiveness, accessibility or full developer/user handoff. Keep those gates explicit before production use.

Some tool helpers load optional file, OCR, image and browser dependencies only when invoked. A registered tool is not proof that its optional dependency, browser binary or provider is available. Those capabilities need their own actual-call acceptance. The existing worker compile command uses `--noCheck`, so emitted JavaScript is also not a full application typecheck.

The published statistics component also logs sync arguments containing its GitHub token. The root `postinstall` hook runs `scripts/patch-oss-stats-token-log.mjs` to remove exactly that statement from both the TypeScript source and compiled JavaScript. The hook verifies package version and both files against published/repaired SHA256 values before writing either file. Repeated runs preserve already repaired files; unknown versions or source drift fail installation. All token forwarding, API arguments and scheduling remain unchanged. The emptied line preserves subsequent source-map line positions, and the map has no embedded source.

Docker copies this hook before both dependency-install stages. Default `npm ci` and `npm install` run it through the [npm postinstall lifecycle](https://docs.npmjs.com/cli/v11/using-npm/scripts/#life-cycle-operation-order). An install with scripts disabled has not applied the repair: run `npm run postinstall` explicitly before building or using this component. Review and remove/update this package-specific repair when adopting an upstream fixed version; do not bypass the version/hash failure.

The container runs six additional token-boundary scenarios against its real installed handler with fake tokens and local Convex context/handle stand-ins. These cover all source kinds, existing-cron replacement, clear-and-sync, provider rejection, 12 concurrent operators, 24 repeated rounds, idempotent repair and refusal on changed version/source. The unpatched package logs canaries on both success and failure. No real token or production log is read; these tests do not establish hosted sync, storage or tenant authorization.

## Guarded external downloads

An agent retrieving external content must not let a supplied URL reach private systems or accept a response that exceeds the caller's budget. The installed AI SDK provider-utils3.0.36 uses Undici Agent/fetch with a DNS lookup guard, validates literal URLs and every redirect hop, and exposes a bounded response reader. Preserve that path when updating dependencies; replacing it with an unguarded fetch would remove an existing protection.

The override parent selector matches the declared direct dependency range, `@ai-sdk/provider-utils@^3.0.12`, and pins its Undici child to6.28.1. npm rejects a conflicting exact parent selector; the committed lock and scenario assertion retain SDK3.0.36. The version6 line remains supported through April30,2027 according to the [maintainer's LTS table](https://github.com/nodejs/undici#long-term-support). All application dependency ranges are unchanged. The lock changes only the root Undici version/integrity, makes its former Busboy dependency development-only, and removes the redundant nested Vercel Blob copy of the same6.28.1 version. Vercel Node's separate development-only Undici5.28.4 remains unchanged and unaccepted.

The11 download scenarios use the actual installed client and SDK reader: compressed input,12 concurrent downloads,24 repeated rounds, HTTP503 and recovery, advertised/chunked size rejection, abort/recovery, an8-layer content-encoding canary, redirect authorization stripping, private literal/scheme rejection, private/mixed DNS rejection and redirect/cycle guards. The DNS answers and redirect-response transport are explicit controlled stand-ins; ordinary HTTP client behavior uses real local sockets. The [content-encoding advisory](https://github.com/nodejs/undici/security/advisories/GHSA-g9mf-h72j-4rw9) explains the canary. The same final source yields10pass/1canary failure under5.29.0 and11pass under6.28.1 in isolated native installs.

A separate proof retrieves one fixed public npm tarball through the SDK's unchanged native-fetch/DNS path, checks its published SHA512 identity, limits the body to1MiB and aborts after15seconds. CI additionally bounds the container command to30seconds. It uses no custom fetch or DNS, no provider token and no generated model answer. It is an Internet-download compatibility proof, not provider quality or hosted-application acceptance.

These tests pass an explicit body limit. The SDK's default is2GiB; this change does not establish that every application caller chooses an appropriate memory budget. The remaining provider-utils resource-consumption advisory requires separate application-call analysis and is not cleared by upgrading Undici.
