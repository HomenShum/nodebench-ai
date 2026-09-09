// Download only the fixed historical package needed for the Linux permission canary.
// The workflow extracts three named modules after this published-SRI check.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';

const target = process.argv[2];
assert.ok(target && isAbsolute(target), 'An absolute, new fixture tarball path is required');
const url = 'https://registry.npmjs.org/@anthropic-ai/sdk/-/sdk-0.90.0.tgz';
const expected = 'sha512-MzZtPabJF1b0FTDl6Z6H5ljphPwACLGP13lu8MTiB8jXaW/YXlpOp+Po2cVou3MPM5+f5toyLnul9whKCy7fBg==';
const cap = 4194304;
const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
if (!response.ok) { await response.body?.cancel(); throw new Error(`Fixture HTTP${response.status}`); }
const reader = response.body.getReader(), buffer = Buffer.alloc(cap); let size = 0;
try {
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    assert.ok(size + value.byteLength <= cap, 'Fixture exceeded the 4MiB budget');
    buffer.set(value, size); size += value.byteLength;
  }
} finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
const bytes = buffer.subarray(0, size), integrity = 'sha512-' + createHash('sha512').update(bytes).digest('base64');
assert.equal(integrity, expected);
await writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ status: 'PASS', fixture: 'anthropic-sdk-0.90.0', bytes: size, integrity, maxBytes: cap, timeoutMs: 15000 }));
