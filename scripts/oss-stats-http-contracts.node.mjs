// A developer needs the installed npm-api pagination client to preserve data and
// errors after an Axios security update. All servers and credentials here are
// controlled local fixtures; this does not call Convex or a public registry.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const rootRequire = createRequire(resolve(process.env.NODEBENCH_OSS_PROOF_ROOT ?? process.cwd(), 'package.json'));
const apiRequire = createRequire(rootRequire.resolve('npm-api'));
const pagedRequire = createRequire(apiRequire.resolve('paged-request'));
const NpmApi = rootRequire('npm-api');
const paged = apiRequire('paged-request');
const axiosVersion = pagedRequire('axios/package.json').version;
const requests = [];
const timers = new Set();
let server, redirectTarget, base, targetBase;
let recovering = false;
function record(value) {
  if (requests.length >= 2000) requests.shift();
  requests.push(value);
}
function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}
function listen(app) {
  return new Promise((ok, reject) => {
    app.once('error', reject);
    app.listen(0, '127.0.0.1', () => { app.removeListener('error', reject); ok(`http://127.0.0.1:${app.address().port}`); });
  });
}
function maintainer(name) {
  const client = new NpmApi();
  const owner = client.maintainer(name);
  owner.config.registry = base + '/';
  return owner;
}
const options = { timeout: 1000, proxy: false };

before(async () => {
  redirectTarget = createServer((req, res) => {
    record({ path: 'target', authorization: req.headers.authorization ?? null });
    json(res, 200, { target: true, authorization: req.headers.authorization ?? null });
  });
  targetBase = await listen(redirectTarget);
  server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    record({ path: url.pathname, query: url.search, authorization: req.headers.authorization ?? null });
    if (url.pathname === '/-/v1/search') {
      const owner = url.searchParams.get('text').replace('maintainer:', '');
      if (owner === 'recover' && !recovering) { recovering = true; return json(res, 503, { error: 'temporarily unavailable' }); }
      const from = Number(url.searchParams.get('from') ?? 0);
      const total = owner === 'exact' ? 750 : 725;
      const objects = Array.from({ length: Math.min(250, Math.max(0, total - from)) }, (_, i) => ({ package: { name: `${owner}-package-${from + i}` } }));
      return json(res, 200, { total, objects });
    }
    if (url.pathname === '/redirect') { res.writeHead(302, { location: targetBase + '/target' }); return res.end(); }
    if (url.pathname === '/unavailable') return json(res, 429, { error: 'rate limited' });
    if (url.pathname === '/large') return json(res, 200, { data: 'x'.repeat(32768) });
    if (url.pathname === '/slow') {
      const timer = setTimeout(() => { timers.delete(timer); if (!res.destroyed) json(res, 200, { recovered: true }); }, 250);
      timers.add(timer);return;
    }
    json(res, 200, { authorization: req.headers.authorization ?? null, userAgent: req.headers['user-agent'], value: url.searchParams.get('value') });
  });
  base = await listen(server);
});

after(async () => {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  for (const app of [server, redirectTarget]) {
    if (!app) continue;
    app.closeAllConnections();
    await new Promise(ok => app.close(ok));
  }
});

test('the installed caller uses the declared patched Axios line', () => {
  assert.equal(axiosVersion, process.env.NODEBENCH_EXPECTED_AXIOS ?? '0.33.0');
});

test('an operator retrieves 725 package names across all pages without loss', { timeout: 5000 }, async () => {
  const names = await maintainer('review').repos();
  assert.deepEqual(names, Array.from({ length: 725 }, (_, i) => `review-package-${i}`));
});

test('exact-page totals terminate and cached reads do not repeat network requests', { timeout: 5000 }, async () => {
  const owner = maintainer('exact');
  const first = await owner.repos();
  const count = requests.length;
  assert.equal(first.length, 750);
  assert.deepEqual(await owner.repos(), first);
  assert.equal(requests.length, count);
});

test('12 concurrent owners keep their package results isolated', { timeout: 10000 }, async () => {
  const owners = Array.from({ length: 12 }, (_, i) => maintainer(`concurrent-${i}`));
  const results = await Promise.all(owners.map(owner => owner.repos()));
  results.forEach((names, i) => assert.deepEqual(names, Array.from({ length: 725 }, (_, j) => `concurrent-${i}-package-${j}`)));
});

test('24 repeated review rounds do not accumulate prior results', { timeout: 15000 }, async () => {
  for (let i = 0; i < 24; i++) {
    const names = await maintainer(`round-${i}`).repos();
    assert.equal(names.length, 725);
    assert.equal(new Set(names).size, 725);
    assert.equal(names[0], `round-${i}-package-0`);
  }
});

test('a failed registry lookup stays failed and does not poison a later retry', { timeout: 5000 }, async () => {
  const owner = maintainer('recover');
  await assert.rejects(owner.repos(), error => error.response?.status === 503);
  assert.equal(owner.cache.has('repos'), false);
  assert.equal((await owner.repos()).length, 725);
});

test('request options and HTTP errors retain their actual meanings', { timeout: 5000 }, async () => {
  const result = await paged(base + '/echo', { ...options, params: { value: 'a value' }, headers: { 'user-agent': 'nodebench-native-proof' } }, () => null);
  assert.equal(result.pages[0].data.value, 'a value');
  assert.equal(result.pages[0].data.userAgent, 'nodebench-native-proof');
  await assert.rejects(paged(base + '/unavailable', options, () => null), error => error.response?.status === 429);
});

test('credentials supplied for one origin are absent at a redirect origin', { timeout: 5000 }, async () => {
  const result = await paged(base + '/redirect', { ...options, headers: { authorization: 'Bearer controlled-canary' } }, () => null);
  assert.equal(result.pages[0].data.target, true);
  assert.equal(result.pages[0].data.authorization, null);
  assert.ok(requests.some(r => r.path === '/redirect' && r.authorization === 'Bearer controlled-canary'));
});

test('inherited nested auth fields cannot supply request credentials', { timeout: 5000 }, async () => {
  assert.equal(Object.hasOwn(Object.prototype, 'username'), false);
  assert.equal(Object.hasOwn(Object.prototype, 'password'), false);
  let result;
  try {
    Object.defineProperty(Object.prototype, 'username', { value: 'inherited-canary-user', configurable: true, writable: true });
    Object.defineProperty(Object.prototype, 'password', { value: 'inherited-canary-password', configurable: true, writable: true });
    result = await paged(base + '/auth', { ...options, auth: {} }, () => null);
  } finally {
    delete Object.prototype.username;
    delete Object.prototype.password;
  }
  const leaked = 'Basic ' + Buffer.from('inherited-canary-user:inherited-canary-password').toString('base64');
  assert.notEqual(result.pages[0].data.authorization, leaked, 'Inherited credentials reached the controlled HTTP server');
});

test('timeouts and oversized bodies reject without yielding successful pages', { timeout: 5000 }, async () => {
  await assert.rejects(paged(base + '/slow', { ...options, timeout: 40 }, () => null), error => error.code === 'ECONNABORTED');
  await assert.rejects(paged(base + '/large', { ...options, maxContentLength: 1024 }, () => null), /maxContentLength/);
  assert.equal((await paged(base + '/echo', options, () => null)).pages.length, 1);
});

test('invalid input, callback failure and repeated next URLs terminate honestly', { timeout: 5000 }, async () => {
  const count = requests.length;
  await assert.rejects(paged(42, options, () => null), /expected "url" to be a string/);
  assert.equal(requests.length, count);
  await assert.rejects(paged(base + '/echo', options, () => { throw new Error('callback failed'); }), /callback failed/);
  const cycle = await paged(base + '/echo', options, current => current);
  assert.equal(cycle.urls.length, 1);
  assert.equal(cycle.pages.length, 1);
});
