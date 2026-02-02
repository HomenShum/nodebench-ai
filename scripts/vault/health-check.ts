import fs from "node:fs";
import path from "node:path";

type VaultConfig = {
  vaultVersion: "v1";
  root: string;
  usersDir: string;
  masterDir: string;
  naming: { noteFile: "kebab-case"; allowSpaces: boolean };
  requiredFrontmatterKeys: string[];
};

type HealthReport = {
  ok: boolean;
  checkedAtIso: string;
  errors: string[];
  warnings: string[];
  stats: {
    notesScanned: number;
    brokenWikilinks: number;
    missingFrontmatter: number;
    namingViolations: number;
    duplicateNoteIds: number;
  };
  duplicates?: Array<{ noteId: string; paths: string[] }>;
};

function readConfig(root: string): VaultConfig {
  const file = path.join(root, ".vault.json");
  const raw = fs.readFileSync(file, "utf8");
  return JSON.parse(raw) as VaultConfig;
}

function listMarkdownFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listMarkdownFiles(full));
    else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) out.push(full);
  }
  return out;
}

function looksKebabCase(fileName: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(fileName);
}

function parseFrontmatter(markdown: string): Record<string, unknown> | null {
  if (!markdown.startsWith("---\n")) return null;
  const end = markdown.indexOf("\n---\n", 4);
  if (end === -1) return null;
  const raw = markdown.slice(4, end).trim();
  const lines = raw.split("\n");
  const obj: Record<string, unknown> = {};
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    obj[key] = value;
  }
  return obj;
}

function extractWikilinks(markdown: string): string[] {
  const links: string[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  for (;;) {
    const m = re.exec(markdown);
    if (!m) break;
    const raw = m[1].trim();
    if (!raw) continue;
    const target = raw.split("|")[0].trim();
    if (target) links.push(target);
  }
  return links;
}

function resolveWikilink(baseDir: string, target: string): string | null {
  const normalized = target.replace(/\\/g, "/");
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return null;
  if (normalized.startsWith("/")) return path.join(process.cwd(), normalized.slice(1));
  if (normalized.endsWith(".md")) return path.resolve(baseDir, normalized);
  return path.resolve(baseDir, `${normalized}.md`);
}

export function runVaultHealthCheck(rootDir = "vault"): HealthReport {
  const root = path.resolve(process.cwd(), rootDir);
  const cfg = readConfig(root);

  const errors: string[] = [];
  const warnings: string[] = [];

  const userRoot = path.join(root, cfg.usersDir);
  const masterNotesRoot = path.join(root, cfg.masterDir, "notes");

  const noteFiles = [
    ...listMarkdownFiles(masterNotesRoot),
    ...listMarkdownFiles(userRoot),
  ];

  let brokenWikilinks = 0;
  let missingFrontmatter = 0;
  let namingViolations = 0;

  const noteIdToPaths = new Map<string, string[]>();

  for (const file of noteFiles) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const baseName = path.basename(file);
    if (!cfg.naming.allowSpaces && baseName.includes(" ")) {
      namingViolations++;
      errors.push(`Naming violation: spaces in ${rel}`);
    }
    if (cfg.naming.noteFile === "kebab-case" && !looksKebabCase(baseName)) {
      namingViolations++;
      errors.push(`Naming violation: not kebab-case ${rel}`);
    }

    const md = fs.readFileSync(file, "utf8");

    if (/[–—]/.test(md)) warnings.push(`Dash warning: found en/em dash in ${rel}`);

    const fm = parseFrontmatter(md);
    if (!fm) {
      missingFrontmatter++;
      errors.push(`Missing frontmatter: ${rel}`);
    } else {
      for (const k of cfg.requiredFrontmatterKeys) {
        if (!(k in fm)) errors.push(`Missing frontmatter key ${k} in ${rel}`);
      }
      const noteId = typeof fm.noteId === "string" ? fm.noteId : "";
      if (noteId) {
        const list = noteIdToPaths.get(noteId) ?? [];
        list.push(rel);
        noteIdToPaths.set(noteId, list);
      }
    }

    const links = extractWikilinks(md);
    for (const l of links) {
      const resolved = resolveWikilink(path.dirname(file), l);
      if (!resolved) continue;
      if (!fs.existsSync(resolved)) {
        brokenWikilinks++;
        errors.push(`Broken wikilink in ${rel}: [[${l}]]`);
      }
    }
  }

  const duplicates: Array<{ noteId: string; paths: string[] }> = [];
  for (const [noteId, pathsArr] of noteIdToPaths.entries()) {
    if (pathsArr.length > 1) duplicates.push({ noteId, paths: pathsArr });
  }

  const report: HealthReport = {
    ok: errors.length === 0,
    checkedAtIso: new Date().toISOString(),
    errors,
    warnings,
    stats: {
      notesScanned: noteFiles.length,
      brokenWikilinks,
      missingFrontmatter,
      namingViolations,
      duplicateNoteIds: duplicates.length,
    },
    ...(duplicates.length > 0 ? { duplicates } : {}),
  };

  return report;
}

const invokedAsScript = process.argv.some((a) => typeof a === "string" && a.replace(/\\/g, "/").endsWith("health-check.ts"));
if (invokedAsScript) {
  const rootArg = process.argv[2] || "vault";
  const report = runVaultHealthCheck(rootArg);
  const outDir = path.resolve(process.cwd(), ".tmp");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "vault_health_report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(`[vault:health] ok=${report.ok} notes=${report.stats.notesScanned} out=${path.relative(process.cwd(), outPath)}`);
  if (!report.ok) process.exitCode = 1;
}
