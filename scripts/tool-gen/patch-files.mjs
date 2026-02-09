/**
 * patch-files.mjs — Deterministic anchor-based patching of index.ts, metaTools.ts, tools.test.ts.
 *
 * This script does NOT use LLM. It uses string anchors to safely insert generated code
 * into the existing files without risk of breaking them.
 *
 * Env:
 *   TOOL_MANIFEST — Path to tool-manifest.json (or defaults to /tmp/tool-manifest.json)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MCP_ROOT = join(process.cwd(), "packages/mcp-local");

function readFile(relPath) {
  return readFileSync(join(MCP_ROOT, relPath), "utf-8");
}

function writeFile(relPath, content) {
  writeFileSync(join(MCP_ROOT, relPath), content);
  console.log(`  ✓ Patched ${relPath}`);
}

/**
 * Insert text before the LAST occurrence of an anchor in the content.
 * Returns null if anchor not found.
 */
function insertBeforeLast(content, anchor, insertion) {
  const idx = content.lastIndexOf(anchor);
  if (idx === -1) return null;
  return content.slice(0, idx) + insertion + content.slice(idx);
}

/**
 * Insert text before the FIRST occurrence of an anchor.
 * Returns null if anchor not found.
 */
function insertBefore(content, anchor, insertion) {
  const idx = content.indexOf(anchor);
  if (idx === -1) return null;
  return content.slice(0, idx) + insertion + content.slice(idx);
}

/**
 * Replace a regex match in content.
 * Returns null if no match.
 */
function replaceMatch(content, regex, replacer) {
  if (!regex.test(content)) return null;
  return content.replace(regex, replacer);
}

function main() {
  const manifestPath = process.env.TOOL_MANIFEST || "/tmp/tool-manifest.json";
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  console.log(`Patching files for tool: ${manifest.toolName} (${manifest.domain})`);
  console.log(`Target: ${manifest.targetFile} (${manifest.isNewFile ? "NEW FILE" : "APPEND"})`);

  let errors = 0;

  // ─── 1. Patch the target tool file ───────────────────────────────────

  if (manifest.isNewFile) {
    // Create new tool file
    const newFileContent = `/**
 * ${manifest.domain} tools — Auto-generated from daily brief signals.
 */

import type { McpTool } from "../types.js";
${manifest.needsNewImports}

export const ${manifest.exportName}: McpTool[] = [
  ${manifest.toolObjectCode},
];
`;
    writeFile(`src/tools/${manifest.targetFile}`, newFileContent);
  } else {
    // Append to existing tool file
    let content = readFile(`src/tools/${manifest.targetFile}`);

    // Add new imports if needed
    if (manifest.needsNewImports && manifest.needsNewImports.trim()) {
      const importLines = content.split("\n");
      let lastImportIdx = -1;
      for (let i = 0; i < importLines.length; i++) {
        if (importLines[i].startsWith("import ")) lastImportIdx = i;
      }
      if (lastImportIdx >= 0) {
        importLines.splice(lastImportIdx + 1, 0, manifest.needsNewImports.trim());
        content = importLines.join("\n");
      }
    }

    // Find the closing ]; of the EXPORT array (not any internal array).
    // Strategy: find `export const xxxTools: McpTool[] = [` then find the
    // matching `];` that starts at column 0 (unindented) after it.
    const exportPattern = `export const ${manifest.exportName}`;
    const exportIdx = content.indexOf(exportPattern);
    if (exportIdx === -1) {
      console.error(`  ✗ Could not find "${exportPattern}" in target tool file`);
      errors++;
    } else {
      // Search for a line that is exactly "];" (possibly with trailing whitespace)
      const lines = content.split("\n");
      let exportLine = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(exportPattern)) { exportLine = i; break; }
      }
      let closingLine = -1;
      for (let i = lines.length - 1; i > exportLine; i--) {
        if (lines[i].trimEnd() === "];") { closingLine = i; break; }
      }
      if (closingLine === -1) {
        console.error("  ✗ Could not find unindented ]; closing the export array");
        errors++;
      } else {
        // Insert the new tool before the closing ];
        const toolCode = `\n  ${manifest.toolObjectCode},`;
        lines.splice(closingLine, 0, toolCode);
        content = lines.join("\n");
        writeFile(`src/tools/${manifest.targetFile}`, content);
      }
    }
  }

  // ─── 2. Patch index.ts (only if new file) ────────────────────────────

  if (manifest.isNewFile) {
    let indexContent = readFile("src/index.ts");

    // Insert import before createMetaTools import
    const importAnchor = 'import { createMetaTools }';
    const newImport = `import { ${manifest.exportName} } from "./tools/${manifest.targetFile.replace(".ts", ".js")}";\n`;
    const patchedImport = insertBefore(indexContent, importAnchor, newImport);
    if (!patchedImport) {
      console.error("  ✗ Could not find createMetaTools import anchor in index.ts");
      errors++;
    } else {
      indexContent = patchedImport;
    }

    // Insert TOOLSET_MAP entry before the closing };
    // Find the TOOLSET_MAP object's closing brace
    const mapStart = indexContent.indexOf("const TOOLSET_MAP");
    if (mapStart === -1) {
      console.error("  ✗ Could not find TOOLSET_MAP in index.ts");
      errors++;
    } else {
      const mapSection = indexContent.slice(mapStart);
      const closingIdx = mapSection.indexOf("};");
      if (closingIdx === -1) {
        console.error("  ✗ Could not find TOOLSET_MAP closing }; in index.ts");
        errors++;
      } else {
        const insertAt = mapStart + closingIdx;
        const entry = `  ${manifest.domain}: ${manifest.exportName},\n`;
        indexContent = indexContent.slice(0, insertAt) + entry + indexContent.slice(insertAt);
      }
    }

    writeFile("src/index.ts", indexContent);
  }

  // ─── 3. Patch metaTools.ts (categoryMap + enum) ──────────────────────

  let metaContent = readFile("src/tools/metaTools.ts");

  const domain = manifest.domain;
  const toolNames = manifest.toolNames;

  // Check if the category already exists in categoryMap
  const categoryPattern = new RegExp(`${domain}:\\s*\\[`);
  if (categoryPattern.test(metaContent)) {
    // Append tool names to existing category
    // Find: domain: ["existing1", "existing2"]
    // Replace with: domain: ["existing1", "existing2", "new_tool"]
    const entryRegex = new RegExp(`(${domain}:\\s*\\[)([^\\]]*)(\\])`);
    const patchedMeta = replaceMatch(metaContent, entryRegex, (_, open, existing, close) => {
      const newNames = toolNames.map((n) => `"${n}"`).join(", ");
      const trimmed = existing.trimEnd();
      const separator = trimmed.endsWith(",") ? " " : ", ";
      return `${open}${existing.trimEnd()}${separator}${newNames}${close}`;
    });
    if (!patchedMeta) {
      console.error(`  ✗ Could not patch existing category "${domain}" in metaTools.ts`);
      errors++;
    } else {
      metaContent = patchedMeta;
    }
  } else {
    // Add new category entry before the "meta" entry (last entry)
    const metaAnchor = `meta: ["findTools", "getMethodology"]`;
    const newEntry = `${domain}: [${toolNames.map((n) => `"${n}"`).join(", ")}],\n      `;
    const patchedMeta = insertBefore(metaContent, metaAnchor, newEntry);
    if (!patchedMeta) {
      console.error("  ✗ Could not find meta anchor in metaTools.ts categoryMap");
      errors++;
    } else {
      metaContent = patchedMeta;
    }

    // Add to category enum if it's a new category
    const enumPattern = /enum:\s*\[([^\]]+)\]/;
    const enumMatch = metaContent.match(enumPattern);
    if (enumMatch) {
      const existingEnums = enumMatch[1];
      if (!existingEnums.includes(`"${domain}"`)) {
        metaContent = metaContent.replace(
          enumPattern,
          `enum: [${existingEnums.trimEnd()}, "${domain}"]`
        );
      }
    }
  }

  writeFile("src/tools/metaTools.ts", metaContent);

  // ─── 4. Patch tools.test.ts ──────────────────────────────────────────

  let testContent = readFile("src/__tests__/tools.test.ts");

  // If new file: add import
  if (manifest.isNewFile) {
    const testImportAnchor = 'import type { McpTool }';
    const newTestImport = `import { ${manifest.exportName} } from "../tools/${manifest.targetFile.replace(".ts", ".js")}";\n`;
    const patchedTestImport = insertBefore(testContent, testImportAnchor, newTestImport);
    if (patchedTestImport) {
      testContent = patchedTestImport;
    }

    // Add to domainTools spread
    // Find the domainTools array assembly — look for the last ...xxxTools, entry
    const spreadAnchor = "];"; // The closing of the domainTools array
    // Find the domainTools definition
    const domainToolsIdx = testContent.indexOf("const domainTools");
    if (domainToolsIdx !== -1) {
      const afterDef = testContent.indexOf("];", domainToolsIdx);
      if (afterDef !== -1) {
        const entry = `  ...${manifest.exportName},\n`;
        testContent = testContent.slice(0, afterDef) + entry + testContent.slice(afterDef);
      }
    }
  }

  // Update tool count
  const countRegex = /expect\(allTools\.length\)\.toBe\((\d+)\)/;
  const countMatch = testContent.match(countRegex);
  if (countMatch) {
    const oldCount = parseInt(countMatch[1]);
    const newCount = oldCount + manifest.toolNames.length;
    testContent = testContent.replace(countRegex, `expect(allTools.length).toBe(${newCount})`);
    console.log(`  ✓ Tool count: ${oldCount} → ${newCount}`);
  } else {
    console.error("  ✗ Could not find tool count assertion in tools.test.ts");
    errors++;
  }

  // Append test cases at the end of the file
  if (manifest.testCode && manifest.testCode.trim()) {
    // Strip any trailing whitespace and add the test block
    testContent = testContent.trimEnd() + "\n\n" + manifest.testCode.trim() + "\n";
  }

  writeFile("src/__tests__/tools.test.ts", testContent);

  // ─── Done ────────────────────────────────────────────────────────────

  if (errors > 0) {
    console.error(`\n✗ ${errors} patching error(s). Aborting.`);
    process.exit(1);
  }

  console.log(`\n✓ All files patched successfully for ${manifest.toolName}`);
}

main();
