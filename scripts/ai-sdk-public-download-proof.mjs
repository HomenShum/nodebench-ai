// One bounded, public read through the SDK's unchanged native Node download path.
// This uses no model-provider credentials and does not generate provider answers.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const rootRequire = createRequire(resolve(process.env.NODEBENCH_OSS_PROOF_ROOT ?? process.cwd(), 'package.json'));
const sdk = rootRequire('@ai-sdk/provider-utils');
const sdkRequire = createRequire(rootRequire.resolve('@ai-sdk/provider-utils'));
const version = sdkRequire('undici/package.json').version;
assert.equal(version, process.env.NODEBENCH_EXPECTED_UNDICI ?? '6.28.1');
assert.match(Function.prototype.toString.call(globalThis.fetch), /internal\/deps\/undici|lazy loading of undici/);
const url = 'https://registry.npmjs.org/@ai-sdk/provider-utils/-/provider-utils-3.0.36.tgz';
const expected = 'sha512-2eSw90hn32Je6n2a8Gf4dJ2EoecPJuOCWqwZCw+BkhPq2LOS01HX3s6ljgOm0iIkZiD5aAuMdpOw17rYKQF/Zg==';
const started = performance.now();
const response = await sdk.fetchWithValidatedRedirects({ url, abortSignal: AbortSignal.timeout(15000) });
if (!response.ok) { await response.body?.cancel(); throw new Error(`Public fixture returned HTTP${response.status}`); }
const bytes = await sdk.readResponseWithSizeLimit({ response, url, maxBytes: 1048576 });
const integrity = 'sha512-' + createHash('sha512').update(bytes).digest('base64');
assert.equal(integrity, expected);
console.log(JSON.stringify({ status: 'PASS', proof: 'SDK_PUBLIC_DOWNLOAD_IDENTITY', undici: version, bytes: bytes.length, integrity, elapsedMs: Math.round(performance.now() - started), nativeFetchUnchanged: true, maxBytes: 1048576, timeoutMs: 15000, providerCredentialsUsed: false }));
