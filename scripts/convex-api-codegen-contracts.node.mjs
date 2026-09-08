// A new developer installs the repo, regenerates its large API, and repeats the
// operation. An unknown SDK or edited package must fail without being replaced.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const sdk = path.dirname(require.resolve('convex/package.json'));
const manifest = readFileSync(path.join(sdk, 'package.json'), 'utf8');
const cli = readFileSync(path.join(sdk, 'dist/cli.bundle.cjs'));
const patch = readFileSync(path.join(root, 'scripts/patch-convex-api-codegen.mjs'));
const repairedHash = '2b32403da3d75e81c672a535a0642fcf6a68ba95c0c37b6a6fed135f4c982d6d';
const hash = value => createHash('sha256').update(value).digest('hex');
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
  !/TOKEN|SECRET|PASSWORD|CONVEX|PROXY|AUTH|KEY|CREDENTIAL/i.test(name)));

function fixture(t, source = cli, pkg = manifest) {
  const directory = mkdtempSync(path.join(tmpdir(), 'nodebench-convex-contract-'));
  // Only this freshly created, exact directory is ever retired. All children
  // below are plain files/directories created by this test; there are no links.
  t.after(() => {
    const relative = path.relative(path.resolve(tmpdir()), path.resolve(directory));
    assert.equal(path.dirname(relative), '.');
    assert(relative.startsWith('nodebench-convex-contract-'));
    rmSync(directory, { recursive: true });
  });
  mkdirSync(path.join(directory, 'node_modules/convex/dist'), { recursive: true });
  mkdirSync(path.join(directory, 'scripts'));
  writeFileSync(path.join(directory, 'node_modules/convex/package.json'), pkg);
  const target = path.join(directory, 'node_modules/convex/dist/cli.bundle.cjs');
  writeFileSync(target, source);
  writeFileSync(path.join(directory, 'scripts/patch-convex-api-codegen.mjs'), patch);
  return { directory, target };
}

function install(directory) {
  const result = spawnSync(process.execPath, ['scripts/patch-convex-api-codegen.mjs'], {
    cwd: directory, env, encoding: 'utf8', timeout: 15_000, windowsHide: true,
  });
  assert.ifError(result.error);
  return result;
}

test('a normal dependency installation contains the reviewed generator', () => {
  assert.equal(JSON.parse(manifest).version, '1.45.0');
  assert.equal(hash(cli), repairedHash, 'Run the normal repository postinstall before this check.');
});

test('repeated developer installations preserve identical reviewed bytes', t => {
  const { directory, target } = fixture(t);
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = install(directory);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(hash(readFileSync(target)), repairedHash);
  }
});

test('an unreviewed upgrade fails without replacing the installed package', t => {
  const { directory, target } = fixture(t, cli, JSON.stringify({ ...JSON.parse(manifest), version: '1.45.1' }));
  assert.equal(install(directory).status, 1);
  assert.deepEqual(readFileSync(target), cli);
});

test('a local package edit is preserved and reported as an installation failure', t => {
  const edited = Buffer.concat([cli, Buffer.from('\n// local package edit\n')]);
  const { directory, target } = fixture(t, edited);
  assert.equal(install(directory).status, 1);
  assert.deepEqual(readFileSync(target), edited);
});

const { importPath, moduleIdentifier } = await import(pathToFileURL(path.join(sdk, 'dist/esm/cli/codegen_templates/api.js')));
const { apiComment, compareModulePaths } = await import(pathToFileURL(path.join(sdk, 'dist/esm/cli/codegen_templates/common.js')));
const code = cli.toString('utf8');
const start = code.indexOf('async function* codegenDynamicApiObjects(ctx, componentDirectory) {');
const end = code.indexOf('async function* codegenDynamicApiObjectsTS(', start);
assert(start >= 0 && end > start, 'Expected the reviewed dynamic declaration generator.');
const moduleRoot = path.join(root, 'backend/convex');

async function generate(modulePaths) {
  const context = {
    entryPoints: async () => modulePaths.map(name => path.join(moduleRoot, name)),
    import_path16: { default: path }, importPath, moduleIdentifier, apiComment, compareModulePaths,
  };
  vm.runInNewContext(code.slice(start, end) + '\nglobalThis.generator = codegenDynamicApiObjects;', context, { timeout: 1000 });
  const chunks = [];
  for await (const chunk of context.generator({}, { path: moduleRoot })) chunks.push(chunk);
  return chunks.join('\n');
}

const bindings = text => [...text.matchAll(/import type \* as (\w+) from "([^"]+)";/g)].map(match => [match[1], match[2]]);

test('regeneration retains every current API binding and the module-local type contract', async () => {
  const declaration = readFileSync(path.join(moduleRoot, '_generated/api.d.ts'), 'utf8');
  const current = bindings(declaration);
  assert(current.length > 0);
  const modules = current.map(([, name]) => name.slice(3).replace(/\.js$/, '.ts'));
  const result = await generate(modules);
  assert.deepEqual(bindings(result).map(item => JSON.stringify(item)).sort(), current.map(item => JSON.stringify(item)).sort());
  assert(declaration.includes('type ModuleApi<'), 'Normal codegen must retain per-module inference.');
  assert(!result.includes('declare const fullApi:'));
  assert.equal(await generate([...modules].reverse()), result);
});

test('large repeated generations handle nested, reserved and overlapping module names', async () => {
  const modules = Array.from({ length: 1550 }, (_, index) => `domain${index % 31}/task${index}.ts`);
  modules.push('proof.ts', 'proof/history.ts', '__proto__/constructor.ts', 'default.ts');
  const first = await generate(modules);
  assert.equal(bindings(first).length, modules.length);
  assert(first.includes('"proof": ModuleApi<typeof proof, "public"> & {'));
  assert(first.includes('"__proto__": {'));
  assert(first.includes('"default": ModuleApi<typeof default_, "public">'));
  for (let repeat = 0; repeat < 3; repeat++) assert.equal(await generate([...modules].reverse()), first);
});

test('a new empty backend has concrete empty public and internal APIs', async () => {
  const result = await generate([]);
  assert(result.includes('export declare const api: {};'));
  assert(result.includes('export declare const internal: {};'));
});
