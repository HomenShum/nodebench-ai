// Convex 1.45.0's whole-module intersection collapses at this repository's scale.
// Keep its inferred function contracts; construct namespaces structurally and
// apply the stock public/internal filter to one module at a time.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, unlinkSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const originalSha256 = 'f4fea97eef31a470c05c5effaf5e2dd0c63dbf161ccc7f51163b73e34a650c4f';
const patchedSha256 = '2b32403da3d75e81c672a535a0642fcf6a68ba95c0c37b6a6fed135f4c982d6d';
const hash = value => createHash('sha256').update(value).digest('hex');

// This function is serialized into the verified CLI bundle, where these helper
// names belong to Convex. It is never invoked in this postinstall process.
async function* codegenDynamicApiObjects(ctx, componentDirectory) {
  const absModulePaths = await entryPoints(ctx, componentDirectory.path);
  const modulePaths = absModulePaths
    .map(p => import_path16.default.relative(componentDirectory.path, p))
    .sort(compareModulePaths);
  const root = { children: new Map(), module: null };
  for (const modulePath of modulePaths) {
    const ident = moduleIdentifier(modulePath);
    const path = importPath(modulePath);
    yield `import type * as ${ident} from "../${path}.js";`;
    let node = root;
    for (const segment of path.split('/')) {
      if (!node.children.has(segment)) {
        node.children.set(segment, { children: new Map(), module: null });
      }
      node = node.children.get(segment);
    }
    if (node.module !== null) throw new Error(`Duplicate generated API module: ${path}`);
    node.module = ident;
  }
  yield `import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
type ModuleApi<M extends object, V extends "public" | "internal"> =
  FilterApi<ApiFromModules<{ "_": M }>, FunctionReference<any, V>> extends { _: infer References } ? References : {};`;
  function render(node, visibility) {
    const parts = [];
    if (node.module !== null) parts.push(`ModuleApi<typeof ${node.module}, "${visibility}">`);
    if (node.children.size) {
      parts.push(`{\n${[...node.children].map(([name, child]) => `${JSON.stringify(name)}: ${render(child, visibility)};`).join('\n')}\n}`);
    }
    return parts.length ? parts.join(' & ') : '{}';
  }
  yield `${apiComment('api', 'public')}
export declare const api: ${render(root, 'public')};
${apiComment('internal', 'internal')}
export declare const internal: ${render(root, 'internal')};`;
}

const root = new URL('../node_modules/convex/', import.meta.url);
let temporary;
let temporaryOwned = false;
try {
  const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
  if (manifest.name !== 'convex' || manifest.version !== '1.45.0') {
    throw new Error('Review the module-local API generator before changing Convex 1.45.0.');
  }
  const path = fileURLToPath(new URL('dist/cli.bundle.cjs', root));
  if (statSync(path).size > 16 * 1024 * 1024) throw new Error('Unrecognized Convex CLI size.');
  const original = readFileSync(path);
  const current = hash(original);
  if (current !== patchedSha256) {
    if (current !== originalSha256) throw new Error('Unrecognized Convex CLI source.');
    const text = original.toString('utf8');
    const start = text.indexOf('async function* codegenDynamicApiObjects(ctx, componentDirectory) {');
    const end = text.indexOf('async function* codegenDynamicApiObjectsTS(', start);
    if (start < 0 || end < 0) throw new Error('Unexpected Convex generator boundary.');
    const generator = codegenDynamicApiObjects.toString().replace(/\r\n/g, '\n');
    const repaired = text.slice(0, start) + generator + '\n' + text.slice(end);
    if (hash(repaired) !== patchedSha256) throw new Error('Unexpected Convex generator repair.');
    temporary = `${path}.nodebench-api-${process.pid}.tmp`;
    writeFileSync(temporary, repaired, { flag: 'wx' });
    temporaryOwned = true;
    renameSync(temporary, path);
    temporary = undefined;
  }
  console.log('[convex-api] Verified module-local dynamic API generation for Convex 1.45.0.');
} catch (error) {
  console.error('[convex-api] API generator repair failed:', error.message);
  process.exitCode = 1;
} finally {
  if (temporary && temporaryOwned) unlinkSync(temporary);
}
