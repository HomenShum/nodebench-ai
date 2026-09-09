// Execute the installed component with fake tokens and local Convex boundaries.
// This verifies logging and argument forwarding, not a hosted sync or data store.
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, rm, stat, copyFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { inspect } from 'node:util';

const root = resolve(process.env.NODEBENCH_OSS_PROOF_ROOT ?? process.cwd());
const require = createRequire(join(root, 'package.json'));
const packageRoot = dirname(require.resolve('@erquhart/convex-oss-stats/package.json'));
const { sync, clearAndSync } = await import(pathToFileURL(join(packageRoot, 'dist/component/lib.js')));
const patch = join(root, 'scripts/patch-oss-stats-token-log.mjs');
const originalLog = console.log, originalFetch = globalThis.fetch;
const logs = [];
let externalFetches = 0;
assert.equal(globalThis.Convex, undefined);
globalThis.Convex = { asyncSyscall: async (operation, raw) => {
  assert.equal(operation, '1.0/createFunctionHandle');
  assert.equal(JSON.parse(raw).name, 'lib:sync');
  return JSON.stringify('function://local-canary-sync');
} };
globalThis.fetch = async () => { externalFetches++; throw new Error('External fetch is forbidden in this local proof'); };
console.log = (...args) => { assert.ok(logs.length < 512); logs.push(inspect(args)); };
after(() => {
  console.log = originalLog;
  globalThis.fetch = originalFetch;
  delete globalThis.Convex;
  assert.equal(externalFetches, 0);
});

function context({ fail = false, existingCron = false } = {}) {
  const actions = [], queries = [], mutations = [], scheduled = [];
  const ctx = {
    runAction: async (_fn, args) => { actions.push(args); if (fail) throw new Error('Controlled provider failure'); },
    runQuery: async (_fn, args) => { queries.push(args); return existingCron ? { functionHandle: 'function://previous' } : null; },
    runMutation: async (_fn, args) => { mutations.push(args); return 'local-cron-id'; },
    scheduler: { runAfter: async (delay, _fn, args) => { scheduled.push({ delay, args }); return 'local-scheduled-id'; } },
  };
  return { ctx, actions, queries, mutations, scheduled };
}
function argumentsFor(owner) {
  return { githubAccessToken: `local-token-canary-${owner}`, githubOwners: [`${owner}-org`], githubRepos: [`${owner}/repo`], npmOrgs: [`${owner}-npm`], npmPackages: [`${owner}-package`], minStars: 17 };
}
function assertForwarded(run, args) {
  assert.deepEqual(run.actions, [
    { owner: args.githubOwners[0], githubAccessToken: args.githubAccessToken },
    { repo: args.githubRepos[0], githubAccessToken: args.githubAccessToken },
    { org: args.npmOrgs[0] }, { name: args.npmPackages[0] },
  ]);
  const registered = run.mutations.at(-1);
  assert.equal(registered.name, 'sync');
  assert.deepEqual(registered.schedule, { kind: 'interval', ms: 3600000 });
  assert.deepEqual(registered.args, args);
}
function noTokenLogs(start) {
  assert.deepEqual(logs.slice(start).filter(value => value.includes('local-token-canary-')), [], 'The component logged token-bearing arguments');
}

test('an operator syncs all four source kinds and schedules a repeat without logging the token', { timeout: 5000 }, async () => {
  const args = argumentsFor('operator'), run = context(), start = logs.length;
  await sync._handler(run.ctx, args);
  assertForwarded(run, args);
  noTokenLogs(start);
});

test('replacing a cron and clear-and-sync keep their authorized arguments intact', { timeout: 5000 }, async () => {
  const args = argumentsFor('resync'), run = context({ existingCron: true }), start = logs.length;
  await sync._handler(run.ctx, args);
  assert.equal(run.mutations.length, 2);
  assert.deepEqual(run.mutations[0], { identifier: { name: 'sync' } });
  assertForwarded(run, args);
  const clearing = context();
  await clearAndSync._handler(clearing.ctx, args);
  assert.deepEqual(clearing.actions, [{ tableName: 'githubRepos' }, { tableName: 'npmPackages' }]);
  assert.deepEqual(clearing.scheduled, [{ delay: 0, args }]);
  noTokenLogs(start);
});

test('provider failure stays rejected and cannot leak the token or register a successful repeat', { timeout: 5000 }, async () => {
  const args = argumentsFor('failure'), run = context({ fail: true }), start = logs.length;
  await assert.rejects(sync._handler(run.ctx, args), /Controlled provider failure/);
  assert.equal(run.mutations.length, 0);
  assert.equal(run.queries.length, 0);
  assert.ok(run.actions.some(x => x.githubAccessToken === args.githubAccessToken));
  noTokenLogs(start);
});

test('12 concurrent operators and 24 repeated rounds preserve each token only at its authorized calls', { timeout: 10000 }, async () => {
  const start = logs.length;
  await Promise.all(Array.from({ length: 12 }, async (_, i) => {
    const args = argumentsFor(`burst-${i}`), run = context();
    await sync._handler(run.ctx, args);
    assertForwarded(run, args);
  }));
  for (let i = 0; i < 24; i++) {
    const args = argumentsFor(`round-${i}`), run = context({ existingCron: true });
    await sync._handler(run.ctx, args);
    assert.equal(run.mutations.length, 2);
    assertForwarded(run, args);
  }
  noTokenLogs(start);
});

const publishedHashes = {
  'src/component/lib.ts': '81eee84453d3f66c0dacbdec8d1b9440db0eb8176705cc29158a666ef5f458c0',
  'dist/component/lib.js': 'db62e0c8fc35a0ccaa192c00df89500cd15b2f6ce602ed9de7ba99d89df0ae98',
};
const hash = value => createHash('sha256').update(value).digest('hex');
async function installation(check) {
  const parent = await mkdtemp(join(tmpdir(), 'nodebench-oss-token-'));
  try {
    const dependency = join(parent, 'node_modules/@erquhart/convex-oss-stats');
    await mkdir(join(parent, 'scripts'), { recursive: true });
    await copyFile(patch, join(parent, 'scripts/patch-oss-stats-token-log.mjs'));
    for (const relative of Object.keys(publishedHashes)) {
      let source = await readFile(join(packageRoot, relative), 'utf8');
      if (!source.includes('console.log("sync", args);')) {
        source = source.replace(/(handler: async \(ctx, args\) => \{\n)( *)\n/, '$1$2    console.log("sync", args);\n');
      }
      assert.equal(hash(source), publishedHashes[relative]);
      await mkdir(dirname(join(dependency, relative)), { recursive: true });
      await writeFile(join(dependency, relative), source);
    }
    await copyFile(join(packageRoot, 'package.json'), join(dependency, 'package.json'));
    const execute = () => spawnSync(process.execPath, [join(parent, 'scripts/patch-oss-stats-token-log.mjs')], { cwd: tmpdir(), encoding: 'utf8', timeout: 5000, maxBuffer: 65536, windowsHide: true });
    await check(dependency, execute);
  } finally {
    assert.equal(dirname(resolve(parent)), resolve(tmpdir()));
    assert.ok(basename(parent).startsWith('nodebench-oss-token-'));
    await rm(parent, { recursive: true });
  }
}

test('a developer can apply the install repair from another working directory and repeat it without writes', { timeout: 10000 }, async () => {
  await installation(async (dependency, execute) => {
    const first = execute(); assert.equal(first.status, 0, first.stderr);
    const paths = Object.keys(publishedHashes).map(p => join(dependency, p));
    const files = await Promise.all(paths.map(async p => ({ raw: await readFile(p), mtime: (await stat(p)).mtimeMs })));
    assert.ok(files.every(f => !f.raw.includes('console.log("sync", args);')));
    const second = execute(); assert.equal(second.status, 0, second.stderr);
    for (let i = 0; i < paths.length; i++) {
      assert.deepEqual(await readFile(paths[i]), files[i].raw);
      assert.equal((await stat(paths[i])).mtimeMs, files[i].mtime);
    }
  });
});

test('a changed package version or source stops the repair before either entrypoint is edited', { timeout: 10000 }, async () => {
  for (const changed of ['version', 'source']) await installation(async (dependency, execute) => {
    if (changed === 'version') {
      const p = join(dependency, 'package.json'), manifest = JSON.parse(await readFile(p, 'utf8'));
      manifest.version = '0.8.3'; await writeFile(p, JSON.stringify(manifest));
    } else {
      const p = join(dependency, 'dist/component/lib.js'); await writeFile(p, (await readFile(p, 'utf8')) + '\n// unexpected source drift\n');
    }
    const paths = Object.keys(publishedHashes).map(p => join(dependency, p));
    const originals = await Promise.all(paths.map(p => readFile(p)));
    const result = execute(); assert.equal(result.status, 1); assert.match(result.stderr, /Token-log removal failed/);
    for (let i = 0; i < paths.length; i++) assert.deepEqual(await readFile(paths[i]), originals[i]);
  });
});
