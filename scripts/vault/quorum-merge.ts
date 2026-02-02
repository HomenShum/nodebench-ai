import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

type MergeReport = {
  ok: boolean;
  mergedAtIso: string;
  inputs: string[];
  outputs: string[];
  errors: string[];
  warnings: string[];
  stats: {
    filesScanned: number;
    mastersWritten: number;
    conflicts: number;
  };
};

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

function sha1(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 10);
}

function parseFrontmatter(markdown: string): Record<string, string> | null {
  if (!markdown.startsWith("---\n")) return null;
  const end = markdown.indexOf("\n---\n", 4);
  if (end === -1) return null;
  const raw = markdown.slice(4, end).trim();
  const lines = raw.split("\n");
  const obj: Record<string, string> = {};
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

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath: string, content: string) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

export function runQuorumMerge(rootDir = "vault", users: string[] = []): MergeReport {
  const root = path.resolve(process.cwd(), rootDir);
  const userDirs =
    users.length > 0
      ? users.map((u) => path.join(root, "users", u, "notes"))
      : fs
          .readdirSync(path.join(root, "users"), { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => path.join(root, "users", e.name, "notes"));

  const errors: string[] = [];
  const warnings: string[] = [];
  const noteIdToCandidates = new Map<string, Array<{ user: string; file: string; md: string; updatedAtIso: string }>>();

  let filesScanned = 0;
  for (const notesDir of userDirs) {
    const user = path.basename(path.dirname(notesDir));
    const files = listMarkdownFiles(notesDir);
    for (const f of files) {
      filesScanned++;
      const md = fs.readFileSync(f, "utf8");
      const fm = parseFrontmatter(md);
      if (!fm || !fm.noteId) {
        warnings.push(`Skipping note without noteId: ${path.relative(root, f).replace(/\\\\/g, "/")}`);
        continue;
      }
      const noteId = fm.noteId;
      const updatedAtIso = fm.updatedAtIso || "";
      const list = noteIdToCandidates.get(noteId) ?? [];
      list.push({ user, file: f, md, updatedAtIso });
      noteIdToCandidates.set(noteId, list);
    }
  }

  const outRoot = path.join(root, "master", "notes");
  let mastersWritten = 0;
  let conflicts = 0;
  const outputs: string[] = [];

  for (const [noteId, candidates] of noteIdToCandidates.entries()) {
    candidates.sort((a, b) => (a.updatedAtIso < b.updatedAtIso ? 1 : a.updatedAtIso > b.updatedAtIso ? -1 : 0));
    const winner = candidates[0];
    const winnerHash = sha1(winner.md);
    const otherDistinct = candidates.filter((c) => sha1(c.md) !== winnerHash);

    const fileName = `${noteId}-${winnerHash}.md`;
    const outPath = path.join(outRoot, fileName);

    let merged = winner.md;
    if (otherDistinct.length > 0) {
      conflicts += 1;
      const appendix = [
        "",
        "## Quorum variants",
        "",
        `Master picked: ${winner.user} (${path.basename(winner.file)})`,
        "",
        ...otherDistinct.slice(0, 3).flatMap((c) => [
          `### Variant from ${c.user} (${path.basename(c.file)})`,
          "",
          "```md",
          c.md.slice(0, 1200),
          "```",
          "",
        ]),
      ].join("\n");
      merged = `${winner.md}\n${appendix}`;
    }

    writeFile(outPath, merged);
    mastersWritten++;
    outputs.push(path.relative(root, outPath).replace(/\\/g, "/"));
  }

  const report: MergeReport = {
    ok: errors.length === 0,
    mergedAtIso: new Date().toISOString(),
    inputs: userDirs.map((d) => path.relative(root, d).replace(/\\/g, "/")),
    outputs,
    errors,
    warnings,
    stats: { filesScanned, mastersWritten, conflicts },
  };

  const outDir = path.join(root, "master");
  ensureDir(outDir);
  const reportPath = path.join(outDir, "merge_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  return report;
}

const invokedAsScript = process.argv.some((a) => typeof a === "string" && a.replace(/\\/g, "/").endsWith("quorum-merge.ts"));
if (invokedAsScript) {
  const rootArg = process.argv[2] || "vault";
  const users = process.argv.slice(3).filter(Boolean);
  const report = runQuorumMerge(rootArg, users);
  console.log(`[vault:merge] ok=${report.ok} files=${report.stats.filesScanned} masters=${report.stats.mastersWritten} conflicts=${report.stats.conflicts}`);
  if (!report.ok) process.exitCode = 1;
}
