// The published statistics component logs its GitHub token in sync arguments.
// Keep the package API and scheduling intact; remove only that log statement.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../node_modules/@erquhart/convex-oss-stats/', import.meta.url);
const files = [
  ['src/component/lib.ts', '81eee84453d3f66c0dacbdec8d1b9440db0eb8176705cc29158a666ef5f458c0', 'd25c49944dae3513498d2c43726766cd369ecffb5dd1f54b2d9bb7e60f5ab151'],
  ['dist/component/lib.js', 'db62e0c8fc35a0ccaa192c00df89500cd15b2f6ce602ed9de7ba99d89df0ae98', 'b80ba35a954faf0985572730117fa2be28a44fcbc4b70e27da7d54db1277b80e'],
];
const hash = value => createHash('sha256').update(value).digest('hex');

try {
  const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
  if (manifest.name !== '@erquhart/convex-oss-stats' || manifest.version !== '0.8.2') {
    throw new Error('Review the token-log patch before changing convex-oss-stats0.8.2.');
  }
  // Validate every input before writing either file. An interrupted write can
  // resume because both the published and the repaired hash are recognized.
  const changes = files.map(([relative, published, repaired]) => {
    const path = fileURLToPath(new URL(relative, root));
    const original = readFileSync(path);
    const current = hash(original);
    if (current === repaired) return null;
    if (current !== published) throw new Error(`Unrecognized statistics source: ${relative}`);
    const fixed = original.toString('utf8').replace('    console.log("sync", args);\n', '\n');
    if (hash(fixed) !== repaired) throw new Error(`Unexpected token-log patch result: ${relative}`);
    return { path, fixed };
  });
  for (const change of changes) if (change) writeFileSync(change.path, change.fixed);
  console.log('[oss-stats] Verified token-log removal in source and compiled entrypoint.');
} catch (error) {
  console.error('[oss-stats] Token-log removal failed:', error.message);
  process.exitCode = 1;
}
