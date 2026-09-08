// Actual installed memory helper; all state is confined to one owned temp directory.
// POSIX permissions are deliberately not certified by Windows mode bits.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import * as fs from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = process.env.NODEBENCH_OSS_PROOF_ROOT ?? process.cwd();
const callerRequire = createRequire(resolve(root, 'node_modules/@mariozechner/pi-ai/dist/index.js'));
const sdkRoot = process.env.NODEBENCH_ANTHROPIC_PROOF_PACKAGE ?? dirname(callerRequire.resolve('@anthropic-ai/sdk'));
const manifest = JSON.parse(await fs.readFile(join(sdkRoot, 'package.json'), 'utf8'));
assert.equal(manifest.version, process.env.NODEBENCH_EXPECTED_ANTHROPIC ?? '0.91.1');
const { BetaLocalFilesystemMemoryTool: Memory } = await import(pathToFileURL(join(sdkRoot, 'tools/memory/node.mjs')).href);
let owned;
before(async () => { owned = await fs.mkdtemp(join(tmpdir(), 'nodebench-anthropic-memory-')); });
after(async () => {
  if (!owned) return;
  const actual = await fs.realpath(owned);
  assert.equal(dirname(actual), await fs.realpath(tmpdir()));
  assert.ok(basename(actual).startsWith('nodebench-anthropic-memory-'));
  await fs.rm(actual, { recursive: true, force: false });
});
const open = name => Memory.init(join(owned, name));
const create = (memory, path, text) => memory.create({ command: 'create', path, file_text: text });
const view = (memory, path) => memory.view({ command: 'view', path });
test('an operator can create, inspect, edit, relocate and delete an owned memory note', { timeout: 5000 }, async () => {
  const memory = await open('journey');
  await create(memory, '/memories/notes/one.txt', 'first\nsecond'); assert.match(await view(memory, '/memories/notes/one.txt'), /first/);
  await memory.str_replace({ command: 'str_replace', path: '/memories/notes/one.txt', old_str: 'first', new_str: 'revised' });
  await memory.insert({ command: 'insert', path: '/memories/notes/one.txt', insert_line: 1, insert_text: 'middle' });
  await memory.rename({ command: 'rename', old_path: '/memories/notes/one.txt', new_path: '/memories/archive/one.txt' });
  assert.equal(await fs.readFile(join(owned, 'journey/memories/archive/one.txt'), 'utf8'), 'revised\nmiddle\nsecond');
  assert.match(await view(memory, '/memories'), /archive/);
  assert.ok(!relative(owned, await fs.realpath(memory.memoryRoot)).startsWith('..'));
  await memory.delete({ command: 'delete', path: '/memories/archive/one.txt' });
  await assert.rejects(view(memory, '/memories/archive/one.txt'), /does not exist/);
});
test('concurrent creators and repeated edits preserve state without partial temporary files', { timeout: 10000 }, async () => {
  const memory = await open('concurrent');
  await Promise.all(Array.from({ length: 12 }, (_, i) => create(memory, `/memories/note-${i}.txt`, `owner-${i}`)));
  for (let i = 0; i < 12; i++) assert.match(await view(memory, `/memories/note-${i}.txt`), new RegExp(`owner-${i}`));
  const races = await Promise.allSettled([create(memory, '/memories/single.txt', 'one'), create(memory, '/memories/single.txt', 'two')]);
  assert.equal(races.filter(x => x.status === 'fulfilled').length, 1); assert.equal(races.filter(x => x.status === 'rejected').length, 1);
  await create(memory, '/memories/repeated.txt', 'seed');
  for (let i = 0; i < 24; i++) await memory.insert({ command: 'insert', path: '/memories/repeated.txt', insert_line: i + 1, insert_text: `round-${i}` });
  const text = await fs.readFile(join(memory.memoryRoot, 'repeated.txt'), 'utf8'); assert.equal(text.split('\n').length, 25); assert.ok(text.endsWith('round-23'));
  assert.equal((await fs.readdir(memory.memoryRoot)).filter(x => x.startsWith('.tmp-')).length, 0);
});
test('invalid edits and duplicate paths fail without replacing the existing note', { timeout: 5000 }, async () => {
  const memory = await open('invalid'); await create(memory, '/memories/keep.txt', 'same\nsame');
  await assert.rejects(create(memory, '/memories/keep.txt', 'overwrite'), /already exists/);
  await assert.rejects(memory.str_replace({ command: 'str_replace', path: '/memories/keep.txt', old_str: 'same', new_str: 'changed' }), /Multiple occurrences/);
  await assert.rejects(memory.insert({ command: 'insert', path: '/memories/keep.txt', insert_line: 100, insert_text: 'bad' }), /Invalid/);
  await assert.rejects(memory.delete({ command: 'delete', path: '/memories' }), /Cannot delete/);
  assert.equal(await fs.readFile(join(memory.memoryRoot, 'keep.txt'), 'utf8'), 'same\nsame');
});
test('path traversal and a symlink cannot reach a sibling fixture outside the memory root', { timeout: 5000 }, async () => {
  const memory = await open('containment'), outside = join(owned, 'outside');
  await fs.mkdir(outside); await fs.writeFile(join(outside, 'canary.txt'), 'untouched');
  await assert.rejects(create(memory, '/memories/../../escape.txt', 'bad'), /escape/);
  await fs.symlink(outside, join(memory.memoryRoot, 'jump'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(view(memory, '/memories/jump/canary.txt'), /escape/);
  await assert.rejects(create(memory, '/memories/jump/new.txt', 'bad'), /escape/);
  assert.equal(await fs.readFile(join(outside, 'canary.txt'), 'utf8'), 'untouched');
  assert.deepEqual(await fs.readdir(outside), ['canary.txt']);
});
for (const mask of [0o022, 0o000]) {
  test(`POSIX owner-only creation and atomic replacement under umask ${mask.toString(8).padStart(3, '0')}`, { timeout: 5000, skip: process.platform === 'win32' ? 'Windows mode bits do not establish POSIX access' : false }, async () => {
    const previous = process.umask(mask), observed = [];
    try {
      const memory = await open(`permissions-${mask}`);
      const measure = async (path, expectedMode) => { observed.push({ path: relative(owned, path), mode: (await fs.stat(path)).mode & 0o777, expectedMode }); };
      await create(memory, '/memories/nested/deep/note.txt', 'initial');
      const file = join(memory.memoryRoot, 'nested/deep/note.txt');
      for (const path of [memory.memoryRoot, dirname(dirname(file)), dirname(file)]) await measure(path, 0o700);
      await measure(file, 0o600);
      await memory.str_replace({ command: 'str_replace', path: '/memories/nested/deep/note.txt', old_str: 'initial', new_str: 'changed' }); await measure(file, 0o600);
      await memory.insert({ command: 'insert', path: '/memories/nested/deep/note.txt', insert_line: 1, insert_text: 'inserted' }); await measure(file, 0o600);
      await memory.rename({ command: 'rename', old_path: '/memories/nested/deep/note.txt', new_path: '/memories/new-parent/renamed.txt' });
      await measure(join(memory.memoryRoot, 'new-parent'), 0o700); await measure(join(memory.memoryRoot, 'new-parent/renamed.txt'), 0o600);
      assert.deepEqual(observed.map(x => x.mode), observed.map(x => x.expectedMode), `Memory access modes: ${JSON.stringify(observed)}`);
    } finally { process.umask(previous); }
  });
}
