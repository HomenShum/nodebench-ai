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
docker logs nodebench-worker-proof
docker rm -f nodebench-worker-proof
```

Use that temporary container name only for this proof and retain the build/smoke logs when it fails. It has no published host port, external network, mounted user data or supplied provider credentials. The proof requires:

- Correct Node worker identity and nonempty MCP tool inventory.
- Pipelinev2 health reporting that its Linkup/Gemini credentials are absent.
- Twelve concurrent and twenty repeated empty/whitespace requests rejected with HTTP400 before provider hooks, followed by malformed-JSON rejection and stable tool/session state.
- No dotenv or MCP registry-token files in the runtime image; only the public root npm policy is retained.

The CI `Worker container` job also fails on unresolved module/tool-loading errors in the worker log, uploads build and startup evidence on failure, and removes its own temporary container. It does not push images or deploy Cloud Run. Manual dispatch becomes available after the workflow exists on the default branch; PR events provide the candidate proof before adoption. See [GitHub's workflow-dispatch requirements](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch).

## Cloud Build context

The existing `workers/node/cloudbuild.yaml` remains the deployment recipe. Its upload context must include the root public `.npmrc` and root lock, while excluding nested npm credentials, dotenv files and the MCP registry-token files. The old exception allowing the LangGraph dotenv file into uploads is removed. This does not delete that local file or transfer its credentials elsewhere.

Before an authorized upload, `gcloud meta list-files-for-upload` shows the files selected by `.gcloudignore`. The controlled context proof for this repair includes the three required root package/config files and excludes five credential canaries without uploading anything.

## Acceptance boundaries

This source candidate still requires a successful Linux startup run after the dependency-category repair and independent final review. An image build alone did not pass the startup gate. The original Windows host's Docker Desktop failed during local socket initialization; its startup attempt was closed with Docker data retained. That host problem is separate from a repository build result.

The fresh unchanged-manifest npm resolution reports31 affected packages, including13 high findings, as of September8,2026. This is a dependency-security hold, not a zero-audit release. A lockfile makes the dependency graph repeatable; it does not repair those findings.

This proof supplies no working provider credentials and accepts no fabricated provider answers. It does not establish a deployed worker, application tenant/auth coverage, provider-backed golden-query results, complete app typing, visual quality, responsiveness, accessibility or full developer/user handoff. Keep those gates explicit before production use.

Some tool helpers load optional file, OCR, image and browser dependencies only when invoked. A registered tool is not proof that its optional dependency, browser binary or provider is available. Those capabilities need their own actual-call acceptance. The existing worker compile command uses `--noCheck`, so emitted JavaScript is also not a full application typecheck.
