// Actual Pi-AI -> installed Anthropic SDK -> local HTTP/SSE contracts.
// Responses and credentials are controlled fixtures, not provider-quality evidence.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.env.NODEBENCH_OSS_PROOF_ROOT ?? process.cwd();
const entry = resolve(root, 'node_modules/@mariozechner/pi-ai/dist/index.js');
const pi = await import(pathToFileURL(entry).href);
const piRequire = createRequire(entry);
const sdkVersion = JSON.parse(await readFile(resolve(dirname(piRequire.resolve('@anthropic-ai/sdk')), 'package.json'), 'utf8')).version;
const expected = process.env.NODEBENCH_EXPECTED_ANTHROPIC ?? '0.91.1';
const history = [], timers = new Set();
let server, model, sequence = 0;
const event = data => `event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`;
const start = id => ({ type: 'message_start', message: { id, type: 'message', role: 'assistant', content: [], model: 'controlled-model', stop_reason: null, stop_sequence: null, usage: { input_tokens: 11, output_tokens: 0 } } });
const finish = reason => event({ type: 'message_delta', delta: { stop_reason: reason, stop_sequence: null }, usage: { output_tokens: 7 } }) + event({ type: 'message_stop' });
function sse(id, tool = false) {
  let wire = event(start(id));
  if (tool) {
    wire += event({ type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tool-canary', name: 'record_note', input: {} } });
    for (const partial_json of ['{"note":', '"bounded note"}']) wire += event({ type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json } });
  } else {
    wire += event({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } });
    for (const text of [`result-${id}`, ' café 中文']) wire += event({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } });
  }
  return wire + event({ type: 'content_block_stop', index: 0 }) + finish(tool ? 'tool_use' : 'end_turn');
}
function streamBytes(res, wire) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
  const bytes = Buffer.from(wire); let offset = 0;
  const send = () => {
    if (res.destroyed) return;
    if (offset >= bytes.length) return res.end();
    const end = Math.min(offset + 137, bytes.length); res.write(bytes.subarray(offset, end)); offset = end;
    const timer = setTimeout(() => { timers.delete(timer); send(); }, 1); timers.add(timer);
  };
  send();
}
before(async () => {
  assert.ok(!process.env.ANTHROPIC_API_KEY, 'This proof must not receive a real Anthropic API key');
  server = createServer((req, res) => {
    let bytes = 0; const chunks = [];
    req.on('error', () => res.destroy());
    req.on('data', chunk => { bytes += chunk.length; if (bytes > 65536) { res.writeHead(413); res.end(); req.destroy(); } else chunks.push(chunk); });
    req.on('end', () => {
      if (res.destroyed) return;
      let body; try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { res.writeHead(400); return res.end(); }
      const kind = req.headers['x-nodebench-case'], id = req.headers['x-nodebench-id'];
      if (history.length === 256) history.shift();
      history.push({ kind, id, body, path: req.url, authorized: req.headers['x-api-key'] === 'local-anthropic-canary' });
      if (kind === 'refusal' || (kind === 'retry' && history.filter(x => x.id === id).length === 1)) {
        res.writeHead(kind === 'refusal' ? 429 : 503, { 'content-type': 'application/json', 'retry-after': '0' });
        return res.end(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'controlled refusal' } }));
      }
      if (kind === 'slow') {
        const timer = setTimeout(() => { timers.delete(timer); if (!res.destroyed) streamBytes(res, sse(id)); }, 250); timers.add(timer); return;
      }
      if (kind === 'malformed') return streamBytes(res, event(start(id)) + 'event: content_block_delta\ndata: {"type":]\n\n');
      streamBytes(res, sse(id, kind === 'tool'));
    });
  });
  await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok); });
  const selected = pi.getModels('anthropic').find(x => x.id.includes('sonnet'));
  assert.ok(selected, 'The installed model catalog must resolve an Anthropic model');
  model = { ...pi.getModel('anthropic', selected.id), baseUrl: `http://127.0.0.1:${server.address().port}`, headers: undefined };
});
after(async () => {
  for (const timer of timers) clearTimeout(timer); timers.clear();
  server?.closeAllConnections(); if (server) await new Promise(ok => server.close(ok));
});
const context = id => ({ systemPrompt: 'Use the supplied controlled input.', messages: [{ role: 'user', content: [{ type: 'text', text: id }], timestamp: 0 }] });
const options = (kind, id, extra = {}) => ({ apiKey: 'local-anthropic-canary', maxTokens: 64, maxRetries: 0, timeoutMs: 1000, signal: AbortSignal.timeout(3000), cacheRetention: 'none', headers: { 'x-nodebench-case': kind, 'x-nodebench-id': id }, ...extra });
const complete = (kind, id = `case-${++sequence}`, extra = {}) => pi.completeSimple(model, context(id), options(kind, id, extra));
const textOf = result => result.content.filter(x => x.type === 'text').map(x => x.text).join('');
test('the actual Pi-AI caller resolves the intended SDK version', async () => {
  assert.equal(JSON.parse(await readFile(resolve(root, 'node_modules/@mariozechner/pi-ai/package.json'), 'utf8')).version, '0.70.6');
  assert.equal(sdkVersion, expected);
});
test('a user receives split Unicode streaming text and honest usage through the installed client', { timeout: 5000 }, async () => {
  const id = `stream-${++sequence}`, stream = pi.streamSimple(model, context(id), options('text', id));
  const types = []; for await (const item of stream) { assert.ok(types.length < 32); types.push(item.type); }
  const result = await stream.result();
  assert.equal(result.stopReason, 'stop'); assert.equal(textOf(result), `result-${id} café 中文`);
  assert.deepEqual([result.usage.input, result.usage.output, result.usage.totalTokens], [11, 7, 18]);
  assert.ok(types.includes('text_delta') && types.at(-1) === 'done');
  const request = history.find(x => x.id === id); assert.equal(request.path, '/v1/messages'); assert.equal(request.authorized, true); assert.equal(request.body.max_tokens, 64);
});
test('a tool call and its returned result preserve IDs, arguments and conversation roles', { timeout: 5000 }, async () => {
  const id = `tool-${++sequence}`, ctx = context(id);
  ctx.tools = [{ name: 'record_note', description: 'Record the controlled note', parameters: { type: 'object', properties: { note: { type: 'string' } }, required: ['note'] } }];
  const call = await pi.completeSimple(model, ctx, options('tool', id));
  assert.equal(call.stopReason, 'toolUse');
  assert.deepEqual(call.content[0], { type: 'toolCall', id: 'tool-canary', name: 'record_note', arguments: { note: 'bounded note' } });
  const nextId = `${id}-result`;
  ctx.messages.push(call, { role: 'toolResult', toolCallId: 'tool-canary', toolName: 'record_note', content: [{ type: 'text', text: 'saved' }], isError: false, timestamp: 1 });
  const result = await pi.completeSimple(model, ctx, options('text', nextId)); assert.equal(result.stopReason, 'stop');
  const body = history.find(x => x.id === nextId).body;
  assert.ok(body.messages.some(m => Array.isArray(m.content) && m.content.some(b => b.type === 'tool_use' && b.id === 'tool-canary')));
  assert.ok(body.messages.some(m => Array.isArray(m.content) && m.content.some(b => b.type === 'tool_result' && b.tool_use_id === 'tool-canary')));
});
test('12 concurrent users and 24 repeated rounds keep results isolated', { timeout: 15000 }, async () => {
  const ids = Array.from({ length: 12 }, () => `burst-${++sequence}`);
  const results = await Promise.all(ids.map(id => complete('text', id)));
  assert.deepEqual(results.map(textOf), ids.map(id => `result-${id} café 中文`));
  for (let i = 0; i < 24; i++) { const id = `round-${++sequence}`; const result = await complete('text', id); assert.equal(result.stopReason, 'stop'); assert.equal(textOf(result), `result-${id} café 中文`); }
});
test('a refused request remains an error without hidden retries and a later request recovers', { timeout: 5000 }, async () => {
  const id = `refusal-${++sequence}`, result = await complete('refusal', id);
  assert.equal(result.stopReason, 'error'); assert.match(result.errorMessage, /429|controlled refusal/);
  assert.equal(history.filter(x => x.id === id).length, 1); assert.equal((await complete('text')).stopReason, 'stop');
});
test('an explicitly budgeted retry handles one transient HTTP503 without changing the payload', { timeout: 5000 }, async () => {
  const id = `retry-${++sequence}`, result = await complete('retry', id, { maxRetries: 1 });
  assert.equal(result.stopReason, 'stop'); const attempts = history.filter(x => x.id === id);
  assert.equal(attempts.length, 2); assert.deepEqual(attempts[0].body, attempts[1].body);
});
test('malformed streaming data remains a failed result rather than a completed answer', { timeout: 5000 }, async () => {
  const result = await complete('malformed'); assert.equal(result.stopReason, 'error'); assert.ok(result.errorMessage);
  assert.equal((await complete('text')).stopReason, 'stop');
});
test('cancellation reaches the actual HTTP client and leaves the next request usable', { timeout: 5000 }, async () => {
  const result = await complete('slow', undefined, { signal: AbortSignal.timeout(40) });
  assert.equal(result.stopReason, 'aborted'); assert.equal((await complete('text')).stopReason, 'stop');
});
test('missing credentials fail before any HTTP request', { timeout: 5000 }, async () => {
  const count = history.length;
  const result = await pi.completeSimple(model, context('missing-key'), options('text', 'missing-key', { apiKey: undefined }));
  assert.equal(result.stopReason, 'error'); assert.match(result.errorMessage, /No API key/);
  assert.deepEqual(result.content, []); assert.equal(result.usage.totalTokens, 0);
  assert.equal(history.length, count);
});
