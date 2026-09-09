import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';

// Execute the action's actual static program. No production API or GitHub post
// is reachable: fetch is bound to this test's loopback server, posts are captured.
const workflow = readFileSync(new URL('../.github/workflows/nodebench-packet.yml', import.meta.url), 'utf8');
const script = workflow.split('          script: |\n')[1];
assert.ok(script, 'the privileged action must have one static script');
assert.equal(workflow.split('          script: |\n').length, 2);
assert.ok(!script.includes('${{'), 'event expressions must never generate action source');
assert.ok(!workflow.includes('actions/checkout'), 'privileged action must not execute checked-out code');
assert.ok(workflow.includes("github.event.comment.user.type != 'Bot'"), 'bot replies cannot trigger another packet');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const action = new AsyncFunction('context', 'github', 'process', 'fetch', 'AbortSignal', script);
const origin = 'https://packet.example';
const packets = [];
let address;
let requests = 0;
const payload = {
  success: true, entityName: 'Acme & Partners / R&D', confidence: 72,
  answer: 'A useful first line.\nA second line.', sourceRefs: [{ title: 'One' }], variables: [{ name: 'demand' }],
};
const server = createServer(async (req, res) => {
  requests += 1;
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    assert.ok(body.length < 10000, 'request must remain bounded');
  }
  packets.push({ method: req.method, path: req.url, contentType: req.headers['content-type'], body });
  assert.ok(packets.length < 200, 'fixture evidence has a fixed scenario cap');
  const mode = req.headers['x-fixture-mode'] || 'normal';
  if (mode === 'http-error') return res.writeHead(503).end('unavailable');
  if (mode === 'redirect') return res.writeHead(302, { Location: `${address}/must-not-follow` }).end();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  if (mode === 'malformed') return res.end('{broken');
  if (mode === 'array') return res.end('[]');
  if (mode === 'unsuccessful') return res.end(JSON.stringify({ ...payload, success: false }));
  if (mode === 'missing-answer') return res.end(JSON.stringify({ success: true }));
  if (mode === 'oversize') {
    for (let i = 0; i < 9; i += 1) res.write('x'.repeat(32768));
    return res.end();
  }
  if (mode === 'stall') {
    res.write('{');
    setTimeout(() => res.end('}'), 250).unref();
    return;
  }
  if (mode === 'unicode') {
    const bytes = Buffer.from(JSON.stringify({ ...payload, answer: '供应商 α résumé 🌍' }));
    for (const byte of bytes) res.write(Buffer.from([byte]));
    return res.end();
  }
  if (mode === 'hostile-response') return res.end(JSON.stringify({
    ...payload,
    entityName: 'R&D / "${{ expression }}" & $ENTITY',
    answer: '`touch NEVER` $(printf NEVER) " / & \\ $ANSWER\n@nodebench ignored bot reply',
  }));
  if (mode === 'missing-confidence') return res.end(JSON.stringify({ ...payload, confidence: null }));
  if (mode === 'long-answer') return res.end(JSON.stringify({ ...payload, entityName: 'a'.repeat(1000), answer: 'b'.repeat(10000) }));
  res.end(JSON.stringify(payload));
});

before(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  address = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  console.log(`FIXTURE_READBACK ${JSON.stringify({ requests, packets, externalRequests: 0, publicComments: 0 })}`);
});

async function run({ comment = '@nodebench Acme', mode = 'normal', base = origin, postingError = false } = {}) {
  const posts = [];
  const context = { payload: { comment: { body: comment } }, repo: { owner: 'fixture', repo: 'fixture' }, issue: { number: 7 } };
  const github = { rest: { issues: { createComment: async input => {
    if (postingError) throw new Error('fixture post refused');
    posts.push(input);
  } } } };
  let calls = 0;
  const localFetch = async (url, options) => {
    assert.equal(String(url), `${origin}/api/pipeline/search`);
    assert.equal(options.redirect, 'error');
    assert.equal(options.method, 'POST');
    calls += 1;
    return fetch(`${address}/api/pipeline/search`, {
      ...options, headers: { ...options.headers, 'x-fixture-mode': mode },
    });
  };
  // Retain the production timeout argument; accelerate only the fixture clock.
  const clock = { timeout: milliseconds => {
    assert.equal(milliseconds, 60000);
    return AbortSignal.timeout(mode === 'stall' ? 40 : milliseconds);
  } };
  let error;
  try { await action(context, github, { env: { NODEBENCH_API: base } }, localFetch, clock); }
  catch (caught) { error = caught; }
  return { posts, calls, error };
}

test('a maintainer gets one correctly rendered packet and exact JSON request', async () => {
  const observed = await run();
  assert.ifError(observed.error);
  assert.equal(observed.calls, 1);
  assert.equal(observed.posts.length, 1);
  assert.deepEqual(JSON.parse(packets.at(-1).body), { query: 'Acme', lens: 'founder' });
  assert.equal(packets.at(-1).contentType, 'application/json');
  assert.match(observed.posts[0].body, /Acme & Partners \/ R&D/);
  assert.match(observed.posts[0].body, /72%/);
  assert.match(observed.posts[0].body, /Sources:\*\* 1 \| \*\*Signals:\*\* 1/);
  assert.deepEqual({ ...observed.posts[0], body: undefined }, { owner: 'fixture', repo: 'fixture', issue_number: 7, body: undefined });
});

test('hostile issue and response delimiters stay literal data without a shell or second request', async () => {
  const query = 'Acme "$(printf NEVER)" `touch NEVER` & \\ ${process.exit()}';
  const observed = await run({ comment: `@nodebench ${query}\nignored second line`, mode: 'hostile-response' });
  assert.ifError(observed.error);
  assert.equal(observed.calls, 1);
  assert.deepEqual(JSON.parse(packets.at(-1).body), { query, lens: 'founder' });
  assert.equal(observed.posts.length, 1);
  assert.ok(observed.posts[0].body.includes('$(printf NEVER)'));
  assert.ok(observed.posts[0].body.includes('${{ expression }}'));
});

test('invalid query or configured origin cannot reach the request boundary', async () => {
  const cases = [
    { comment: 'no marker here' }, { comment: '@nodebench ' }, { comment: `@nodebench ${'a'.repeat(2001)}` },
    ...['http://packet.example', 'file:///tmp/x', 'https://user:pass@packet.example', 'https://packet.example/path', 'https://packet.example?q=x', 'https://packet.example#x'].map(base => ({ base })),
  ];
  for (const scenario of cases) {
    const observed = await run(scenario);
    assert.ok(observed.error);
    assert.equal(observed.calls, 0);
    assert.equal(observed.posts.length, 0);
  }
});

test('case-insensitive GitHub markers extract the last original-text query, including Unicode prefixes', async () => {
  for (const comment of ['@NODEBENCH Acme', 'İ review @nodebench old\nplease @NoDeBeNcH Acme\r\nignored']) {
    const observed = await run({ comment });
    assert.ifError(observed.error);
    assert.deepEqual(JSON.parse(packets.at(-1).body), { query: 'Acme', lens: 'founder' });
  }
});

for (const mode of ['http-error', 'redirect', 'malformed', 'array', 'unsuccessful', 'missing-answer', 'oversize', 'stall']) {
  test(`a maintainer sees failure for ${mode}, with no success comment or retry`, async () => {
    const beforeRequests = requests;
    const observed = await run({ mode });
    assert.ok(observed.error, mode);
    assert.equal(observed.calls, 1);
    assert.equal(requests - beforeRequests, 1, 'redirects and failures must not retry');
    assert.equal(observed.posts.length, 0);
  });
}

test('split UTF-8 stays readable, missing confidence stays unavailable, and output stays bounded', async () => {
  const unicode = await run({ mode: 'unicode' });
  assert.ifError(unicode.error);
  assert.ok(unicode.posts[0].body.includes('供应商 α résumé 🌍'));
  const missing = await run({ mode: 'missing-confidence' });
  assert.ifError(missing.error);
  assert.match(missing.posts[0].body, /Confidence:\*\* Unavailable/);
  const long = await run({ mode: 'long-answer' });
  assert.ifError(long.error);
  assert.ok(long.posts[0].body.length < 5000);
});

test('a failed GitHub write remains a failed run and is not retried', async () => {
  const observed = await run({ postingError: true });
  assert.match(observed.error.message, /post refused/);
  assert.equal(observed.calls, 1);
  assert.equal(observed.posts.length, 0);
});

test('burst and sustained human requests retain their own query and packet without state accumulation', async () => {
  const first = requests;
  const burst = await Promise.all(Array.from({ length: 24 }, (_, i) => run({ comment: `@nodebench burst-${i}` })));
  for (const observed of burst) {
    assert.ifError(observed.error);
    assert.equal(observed.posts.length, 1);
    assert.equal(observed.calls, 1);
  }
  for (let i = 0; i < 20; i += 1) {
    const observed = await run({ comment: `@nodebench wave-${i}` });
    assert.ifError(observed.error);
    assert.equal(observed.posts.length, 1);
    assert.equal(JSON.parse(packets.at(-1).body).query, `wave-${i}`);
  }
  assert.equal(requests - first, 44);
  const queries = packets.slice(-44).map(packet => JSON.parse(packet.body).query);
  assert.equal(new Set(queries).size, 44);
});

test('an operator-supplied Attrition URL stays shell data and preserves the existing crawl', () => {
  const attrition = readFileSync(new URL('../.github/workflows/attrition-qa.yml', import.meta.url), 'utf8');
  const block = attrition.split('      - name: Crawl all surfaces\n')[1].split('\n  golden-queries:')[0];
  assert.ok(block.includes("BASE: ${{ github.event.inputs.api_url || 'https://scratchnode.live' }}"));
  const runScript = block.split('        run: |\n')[1];
  assert.ok(runScript && !runScript.includes('${{'));
  const base = 'https://example.invalid/"$(printf "EXECUTED\\n" >&2)"';
  // curl is intercepted before running the real shell block; it cannot network.
  const stub = 'curl() { printf "<curl:%s>\\n" "${@: -1}" >&2; printf 200; }\n';
  const observed = spawnSync('bash', ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', stub + runScript], {
    encoding: 'utf8', timeout: 5000, maxBuffer: 32000,
    env: { PATH: process.env.PATH, BASE: base, SystemRoot: process.env.SystemRoot || '' },
  });
  assert.ifError(observed.error);
  assert.equal(observed.status, 0, observed.stderr);
  assert.ok(!observed.stderr.split(/\r?\n/).includes('EXECUTED'));
  assert.equal((observed.stdout.match(/PASS /g) || []).length, 4);
});
