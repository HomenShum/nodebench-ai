#!/usr/bin/env node
/**
 * generateViewManifest.mjs — Single source of truth enforcement
 *
 * Reads the canonical view manifest from src/lib/registry/viewCapabilityRegistry.ts
 * and generates the derived copies in:
 *   1. convex/domains/agents/agentViewManifest.ts (server-side Convex queries)
 *   2. packages/mcp-local/src/tools/openclawTools.ts (inline VIEW_MANIFEST)
 *
 * Run: node scripts/generateViewManifest.mjs [--check]
 *   --check: exits non-zero if derived files are out of sync (CI mode)
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CHECK_MODE = process.argv.includes("--check");
const CANONICAL_REGISTRY = "src/lib/registry/viewCapabilityRegistry.ts";

const registryPath = resolve(ROOT, CANONICAL_REGISTRY);
const convexTarget = resolve(ROOT, "convex/domains/agents/agentViewManifest.ts");
const openclawTarget = resolve(ROOT, "packages/mcp-local/src/tools/openclawTools.ts");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function extractBalancedSection(source, startIndex, openChar, closeChar) {
  if (source[startIndex] !== openChar) {
    throw new Error(`Expected ${openChar} at index ${startIndex}`);
  }

  let depth = 0;
  let quote = null;
  let escaping = false;

  for (let i = startIndex; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (quote) {
      if (escaping) {
        escaping = false;
        continue;
      }
      if (char === "\\") {
        escaping = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i += 1;
      i += 1;
      continue;
    }

    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return { section: source.slice(startIndex, i + 1), endIndex: i };
      }
    }
  }

  throw new Error(`Unterminated section starting at ${startIndex}`);
}

function skipTrivia(source, startIndex) {
  let index = startIndex;
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (/\s|,/.test(char)) {
      index += 1;
      continue;
    }

    if (char === "/" && next === "/") {
      index += 2;
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) index += 1;
      index += 2;
      continue;
    }

    break;
  }
  return index;
}

function readKey(source, startIndex) {
  let index = skipTrivia(source, startIndex);
  const first = source[index];

  if (!first || first === "}") return null;

  if (first === '"' || first === "'") {
    const quote = first;
    index += 1;
    let key = "";
    while (index < source.length) {
      const char = source[index];
      if (char === "\\") {
        key += char + source[index + 1];
        index += 2;
        continue;
      }
      if (char === quote) {
        index += 1;
        break;
      }
      key += char;
      index += 1;
    }
    return { key, nextIndex: index };
  }

  const match = source.slice(index).match(/^[A-Za-z_$][A-Za-z0-9_$-]*/);
  if (!match) {
    throw new Error(`Could not read object key near: ${source.slice(index, index + 40)}`);
  }

  return { key: match[0], nextIndex: index + match[0].length };
}

function findPropertyIndex(source, propertyName) {
  const regex = new RegExp(`\\b${propertyName}\\s*:`);
  const match = regex.exec(source);
  return match ? match.index + match[0].length : -1;
}

function extractPropertySection(source, propertyName, openChar, closeChar) {
  const afterProperty = findPropertyIndex(source, propertyName);
  if (afterProperty === -1) return null;
  const startIndex = source.indexOf(openChar, afterProperty);
  if (startIndex === -1) return null;
  return extractBalancedSection(source, startIndex, openChar, closeChar).section;
}

function extractStringProperty(source, propertyName) {
  const regex = new RegExp(`${propertyName}\\s*:\\s*(?:"([^"]*)"|'([^']*)')`, "s");
  const match = source.match(regex);
  if (!match) return "";
  return match[1] ?? match[2] ?? "";
}

function extractBooleanProperty(source, propertyName) {
  const regex = new RegExp(`${propertyName}\\s*:\\s*(true|false)`);
  const match = source.match(regex);
  if (!match) return false;
  return match[1] === "true";
}

function extractStringArray(source, propertyName) {
  const section = extractPropertySection(source, propertyName, "[", "]");
  if (!section) return [];
  return Array.from(section.matchAll(/(?:"([^"]+)"|'([^']+)')/g), (match) => match[1] ?? match[2]);
}

function extractNamedArray(source, propertyName) {
  const section = extractPropertySection(source, propertyName, "[", "]");
  if (!section) return [];
  return Array.from(section.matchAll(/\bname\s*:\s*(?:"([^"]+)"|'([^']+)')/g), (match) => match[1] ?? match[2]);
}

function parseCanonicalRegistry(source) {
  const exportIndex = source.indexOf("export const VIEW_CAPABILITIES");
  if (exportIndex === -1) {
    fail(`Could not find VIEW_CAPABILITIES in ${CANONICAL_REGISTRY}`);
  }

  const objectStart = source.indexOf("{", exportIndex);
  if (objectStart === -1) {
    fail(`Could not find VIEW_CAPABILITIES object literal in ${CANONICAL_REGISTRY}`);
  }

  const { section: registryObject } = extractBalancedSection(source, objectStart, "{", "}");
  const views = [];
  let index = 1;

  while (index < registryObject.length - 1) {
    index = skipTrivia(registryObject, index);
    if (registryObject[index] === "}") break;

    const keyResult = readKey(registryObject, index);
    if (!keyResult) break;

    index = skipTrivia(registryObject, keyResult.nextIndex);
    if (registryObject[index] !== ":") {
      throw new Error(`Expected ':' after key ${keyResult.key}`);
    }

    index = skipTrivia(registryObject, index + 1);
    if (registryObject[index] !== "{") {
      throw new Error(`Expected object literal for ${keyResult.key}`);
    }

    const { section: entryBlock, endIndex } = extractBalancedSection(registryObject, index, "{", "}");

    views.push({
      viewId: extractStringProperty(entryBlock, "viewId") || keyResult.key,
      title: extractStringProperty(entryBlock, "title"),
      description: extractStringProperty(entryBlock, "description"),
      paths: extractStringArray(entryBlock, "paths"),
      actions: extractNamedArray(entryBlock, "actions"),
      dataEndpoints: extractNamedArray(entryBlock, "dataEndpoints"),
      tags: extractStringArray(entryBlock, "tags"),
      requiresAuth: extractBooleanProperty(entryBlock, "requiresAuth"),
    });

    index = endIndex + 1;
  }

  return views;
}

function formatManifestEntries(views) {
  return views
    .map(
      (view) =>
        `  { viewId: ${JSON.stringify(view.viewId)}, title: ${JSON.stringify(view.title)}, description: ${JSON.stringify(view.description)}, paths: ${JSON.stringify(view.paths)}, actions: ${JSON.stringify(view.actions)}, dataEndpoints: ${JSON.stringify(view.dataEndpoints)}, tags: ${JSON.stringify(view.tags)}, requiresAuth: ${view.requiresAuth} }`,
    )
    .join(",\n");
}

function generateConvexManifest(views) {
  return `// @generated from ${CANONICAL_REGISTRY} by scripts/generateViewManifest.mjs
// Do not edit manually — run: node scripts/generateViewManifest.mjs
import { v } from "convex/values";
import { query } from "../../_generated/server";

interface ManifestEntry {
  viewId: string;
  title: string;
  description: string;
  paths: string[];
  actions: string[];
  dataEndpoints: string[];
  tags: string[];
  requiresAuth: boolean;
}

const VIEW_MANIFEST: ManifestEntry[] = [
${formatManifestEntries(views)},
];

export const getViewManifest = query({
  args: {
    includeAuthOnly: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (_ctx, args) => {
    if (args.includeAuthOnly) {
      return { views: VIEW_MANIFEST, totalViews: VIEW_MANIFEST.length };
    }
    const publicViews = VIEW_MANIFEST.filter((v) => !v.requiresAuth);
    return { views: publicViews, totalViews: publicViews.length };
  },
});

export const getViewCapabilities = query({
  args: {
    viewId: v.string(),
  },
  returns: v.any(),
  handler: async (_ctx, args) => {
    const entry = VIEW_MANIFEST.find((v) => v.viewId === args.viewId);
    if (!entry) {
      return { error: \`Unknown view: \${args.viewId}\`, availableViews: VIEW_MANIFEST.map((v) => v.viewId) };
    }
    return entry;
  },
});

export const searchViews = query({
  args: {
    query: v.string(),
  },
  returns: v.any(),
  handler: async (_ctx, args) => {
    const q = args.query.toLowerCase();
    const matches = VIEW_MANIFEST.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.tags.some((t) => t.includes(q)),
    );
    return { matches, count: matches.length };
  },
});
`;
}

function generateOpenclawManifestSection(views) {
  return `/**
 * Static view manifest — derived from ${CANONICAL_REGISTRY} (canonical source).
 * Kept inline to avoid cross-package imports (MCP-local is standalone).
 * @generated — To update, edit ${CANONICAL_REGISTRY} then run: node scripts/generateViewManifest.mjs
 */
interface ViewEntry {
  viewId: string;
  title: string;
  description: string;
  paths: string[];
  actions: string[];
  dataEndpoints: string[];
  tags: string[];
  requiresAuth: boolean;
}

const VIEW_MANIFEST: ViewEntry[] = [
${formatManifestEntries(views)},
];`;
}

function replaceOpenclawManifest(existingSource, generatedSection) {
  const sectionStart = existingSource.indexOf("/**\n * Static view manifest");
  const helperSectionStart = existingSource.indexOf(
    "// ---------------------------------------------------------------------------\n// MCP Gateway helper — calls Convex backend via HTTP",
  );

  if (sectionStart === -1 || helperSectionStart === -1 || helperSectionStart <= sectionStart) {
    fail("Could not locate generated VIEW_MANIFEST section inside packages/mcp-local/src/tools/openclawTools.ts");
  }

  return `${existingSource.slice(0, sectionStart)}${generatedSection}\n\n${existingSource.slice(helperSectionStart)}`;
}

const registrySource = readFileSync(registryPath, "utf-8");
const entries = parseCanonicalRegistry(registrySource);

if (entries.length < 25) {
  fail(`Expected 25+ views from ${CANONICAL_REGISTRY}, got ${entries.length}. Parser may be broken.`);
}

for (const entry of entries) {
  if (!entry.viewId || !entry.title || !entry.description) {
    fail(`Incomplete manifest entry parsed for view ${entry.viewId || "<unknown>"}`);
  }
}

console.log(`Parsed ${entries.length} view entries from ${CANONICAL_REGISTRY}`);

const convexContent = generateConvexManifest(entries);
const openclawExisting = readFileSync(openclawTarget, "utf-8");
const openclawContent = replaceOpenclawManifest(
  openclawExisting,
  generateOpenclawManifestSection(entries),
);

if (CHECK_MODE) {
  const existingConvex = readFileSync(convexTarget, "utf-8");
  const convexMatches = existingConvex === convexContent;
  const openclawMatches = openclawExisting === openclawContent;

  if (!convexMatches || !openclawMatches) {
    if (!convexMatches) {
      console.error(`Out of sync: convex/domains/agents/agentViewManifest.ts`);
    }
    if (!openclawMatches) {
      console.error(`Out of sync: packages/mcp-local/src/tools/openclawTools.ts`);
    }
    process.exit(1);
  }

  console.log("View manifests are in sync");
  process.exit(0);
}

writeFileSync(convexTarget, convexContent, "utf-8");
writeFileSync(openclawTarget, openclawContent, "utf-8");

console.log(`Wrote ${convexTarget} (${entries.length} views)`);
console.log(`Updated ${openclawTarget} VIEW_MANIFEST section (${entries.length} views)`);
