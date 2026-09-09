// Real installed Agent/fetch and SDK download contracts. HTTP inputs are local;
// DNS and redirect-response stand-ins are identified separately below.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import dns from 'node:dns';

const rootRequire = createRequire(resolve(process.env.NODEBENCH_OSS_PROOF_ROOT ?? process.cwd(), 'package.json'));
const sdk = rootRequire('@ai-sdk/provider-utils');
const sdkRequire = createRequire(rootRequire.resolve('@ai-sdk/provider-utils'));
const { Agent, fetch } = sdkRequire('undici');
const version = sdkRequire('undici/package.json').version;
const agent = new Agent({ connections: 4, pipelining: 1 });
const timers = new Set(), requests = [];
const originalLookup = dns.lookup, originalFetch = globalThis.fetch;
let server, target, base, targetBase;
const decoded = Buffer.from('controlled nested response');
let nested = decoded;
for (let i = 0; i < 8; i++) nested = gzipSync(nested);
const plain = Buffer.from('bounded ordinary download');
const record = item => { if (requests.length === 512) requests.shift(); requests.push(item); };
const listen = app => new Promise((ok, fail) => { app.once('error', fail); app.listen(0, '127.0.0.1', () => { app.removeListener('error', fail); ok(`http://127.0.0.1:${app.address().port}`); }); });
const retrieve = (path, options = {}) => fetch(base + path, { dispatcher: agent, signal: AbortSignal.timeout(2000), ...options });
const read = (response, maxBytes = 65536) => sdk.readResponseWithSizeLimit({ response, url: base, maxBytes });

before(async () => {
  target = createServer((req, res) => { record('redirect-target'); res.end(req.headers.authorization ?? 'no-authorization'); });
  targetBase = await listen(target);
  server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1'); record(url.pathname);
    if (url.pathname === '/gzip') { res.writeHead(200, { 'content-encoding': 'gzip' }); return res.end(gzipSync(plain)); }
    if (url.pathname === '/deep') { res.writeHead(200, { 'content-encoding': Array(8).fill('gzip').join(', ') }); return res.end(nested); }
    if (url.pathname === '/large-header') { res.writeHead(200, { 'content-length': 32768 }); return res.end(Buffer.alloc(32768, 97)); }
    if (url.pathname === '/large-stream') { res.writeHead(200, { 'transfer-encoding': 'chunked' }); res.write(Buffer.alloc(1024)); return res.end(Buffer.alloc(2048)); }
    if (url.pathname === '/status') { res.statusCode = 503; return res.end('controlled unavailable'); }
    if (url.pathname === '/redirect') { res.writeHead(302, { location: targetBase + '/result' }); return res.end(); }
    if (url.pathname === '/slow') {
      const timer = setTimeout(() => { timers.delete(timer); if (!res.destroyed) res.end('late response'); }, 250);
      timers.add(timer); return;
    }
    res.end(url.searchParams.get('id') ?? 'healthy');
  });
  base = await listen(server);
});
after(async () => {
  dns.lookup = originalLookup; globalThis.fetch = originalFetch;
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  await agent.close();
  for (const app of [server, target]) if (app) { app.closeAllConnections(); await new Promise(ok => app.close(ok)); }
});

test('the SDK resolves the selected Undici dependency', () => {
  assert.equal(sdkRequire('../package.json').version, '3.0.36');
  assert.equal(version, process.env.NODEBENCH_EXPECTED_UNDICI ?? '6.28.1');
});
test('an agent reads an ordinary compressed response through the bounded SDK reader', { timeout: 5000 }, async () => {
  const response = await retrieve('/gzip'); assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await read(response)), plain);
});
test('12 concurrent downloads preserve each result and24 repeated rounds leave the pool usable', { timeout: 10000 }, async () => {
  const values = await Promise.all(Array.from({ length: 12 }, async (_, i) => Buffer.from(await read(await retrieve(`/item?id=burst-${i}`))).toString()));
  assert.deepEqual(values, Array.from({ length: 12 }, (_, i) => `burst-${i}`));
  for (let i = 0; i < 24; i++) assert.equal(Buffer.from(await read(await retrieve(`/item?id=round-${i}`))).toString(), `round-${i}`);
});
test('HTTP failure status remains visible and the next healthy request succeeds', { timeout: 5000 }, async () => {
  const response = await retrieve('/status'); assert.equal(response.status, 503); assert.equal(response.ok, false);
  assert.equal(Buffer.from(await read(response)).toString(), 'controlled unavailable');
  assert.equal(Buffer.from(await read(await retrieve('/healthy'))).toString(), 'healthy');
});
test('advertised and streamed oversize bodies reject, cancel, and allow recovery', { timeout: 5000 }, async () => {
  for (const path of ['/large-header', '/large-stream']) await assert.rejects(read(await retrieve(path), 1024), /exceeded maximum size/);
  assert.equal(Buffer.from(await read(await retrieve('/healthy'))).toString(), 'healthy');
});
test('a timed-out response stays failed and the connection pool recovers', { timeout: 5000 }, async () => {
  await assert.rejects(retrieve('/slow', { signal: AbortSignal.timeout(40) }), error => ['TimeoutError', 'AbortError'].includes(error.name));
  assert.equal(Buffer.from(await read(await retrieve('/healthy'))).toString(), 'healthy');
});
test('an excessive content-encoding chain is rejected before successful consumption', { timeout: 5000 }, async () => {
  await assert.rejects(async () => read(await retrieve('/deep')), error => /too many content-encodings/.test(`${error.message} ${error.cause?.message}`));
});
test('credentials cannot cross a redirect origin in the real HTTP client', { timeout: 5000 }, async () => {
  const response = await retrieve('/redirect', { headers: { authorization: 'Bearer local-canary' } });
  assert.equal(Buffer.from(await read(response)).toString(), 'no-authorization');
});
test('the SDK rejects private literal/localhost URLs before contacting the local server', { timeout: 5000 }, async () => {
  const count = requests.length;
  for (const url of [base, base.replace('127.0.0.1', 'localhost'), 'http://0x7f000001/', 'http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://10.1.2.3/', 'http://169.254.169.254/']) {
    await assert.rejects(sdk.fetchWithValidatedRedirects({ url, abortSignal: AbortSignal.timeout(1000) }), /not allowed/);
  }
  await assert.rejects(sdk.fetchWithValidatedRedirects({ url: 'file:///controlled-fixture' }), /URL scheme must be http, https, or data, got file:/);
  assert.equal(requests.length, count);
});
test('the real SDK DNS guard rejects private and mixed answers before a socket reaches the local server', { timeout: 5000 }, async () => {
  const count = requests.length, lookups = [];
  assert.match(Function.prototype.toString.call(globalThis.fetch), /internal\/deps\/undici|lazy loading of undici/);
  dns.lookup = (hostname, options, callback) => {
    if (!hostname.endsWith('.nodebench-proof.invalid')) return originalLookup(hostname, options, callback);
    lookups.push(hostname); assert.equal(options.all, true);
    const addresses = [{ address: '127.0.0.1', family: 4 }];
    if (hostname.startsWith('mixed.')) addresses.unshift({ address: '203.0.113.10', family: 4 });
    callback(null, addresses);
  };
  try {
    for (const host of ['private.nodebench-proof.invalid', 'mixed.nodebench-proof.invalid']) {
      await assert.rejects(sdk.fetchWithValidatedRedirects({ url: `http://${host}:${server.address().port}/guard`, abortSignal: AbortSignal.timeout(1000) }), error => /resolved to disallowed IP address/.test(`${error.message} ${error.cause?.message}`));
    }
  } finally { dns.lookup = originalLookup; }
  assert.deepEqual([...new Set(lookups)].sort(), ['mixed.nodebench-proof.invalid', 'private.nodebench-proof.invalid']);
  assert.equal(requests.length, count);
});
test('the SDK validates each redirect hop and terminates cycles with a controlled response transport', { timeout: 5000 }, async () => {
  const calls = [];
  try {
    globalThis.fetch = async (url, options) => {
      calls.push(String(url)); assert.equal(options.redirect, 'manual');
      return new Response(null, { status: 302, headers: { location: base + '/private-target' } });
    };
    await assert.rejects(sdk.fetchWithValidatedRedirects({ url: 'https://public.nodebench-proof.invalid/' }), /not allowed/);
    assert.equal(calls.length, 1);
    calls.length = 0;
    globalThis.fetch = async url => { calls.push(String(url)); return new Response(null, { status: 302, headers: { location: String(url) } }); };
    await assert.rejects(sdk.fetchWithValidatedRedirects({ url: 'https://cycle.nodebench-proof.invalid/', maxRedirects: 2 }), /Too many redirects/);
    assert.equal(calls.length, 3);
  } finally { globalThis.fetch = originalFetch; }
});
