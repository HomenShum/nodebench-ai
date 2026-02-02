import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { initVault } from "../vault/init-vault";

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugFileName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

function write(filePath: string, content: string) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function runConvexJson(functionName: string, args: Record<string, unknown>) {
  const cmd = `npx convex run --push "${functionName}" "${JSON.stringify(args).replace(/\"/g, '\\\"')}"`;
  const raw = execSync(cmd, { stdio: ["ignore", "pipe", "inherit"] }).toString("utf8");
  return JSON.parse(raw);
}

export function exportBugCardsToVault(rootDir = "vault", limit = 200) {
  initVault(rootDir);
  const exportRes = runConvexJson("domains/operations/bugLoop:exportBugCardsForVault", {
    limit,
    maxOccurrencesPerCard: 12,
  });

  if (!exportRes?.ok) throw new Error("exportBugCardsForVault failed");

  const root = path.resolve(process.cwd(), rootDir);
  const outDir = path.join(root, "master", "notes");
  ensureDir(outDir);

  const cards = Array.isArray(exportRes.cards) ? exportRes.cards : [];
  for (const c of cards) {
    const meta = c.meta || {};
    const signature: string = String(meta.signature || "");
    if (!signature) continue;
    const fileSlug = slugFileName(`bug-card-${signature}`);
    const filePath = path.join(outDir, `${fileSlug}.md`);

    const firstSeenAt = Number(meta.firstSeenAt || c.startedAt || Date.now());
    const lastSeenAt = Number(meta.lastSeenAt || firstSeenAt);

    const sources = [];
    const occArts = c.artifacts?.occurrences || [];
    for (const a of occArts) {
      if (a?.sourceUrl) sources.push(String(a.sourceUrl));
    }
    const inv = c.artifacts?.investigation;
    if (inv?.id) sources.push(`convex://sourceArtifacts/${String(inv.id)}`);

    const fm = [
      "---",
      `noteId: ${fileSlug}`,
      `title: Bug card ${signature}`,
      `createdAtIso: ${new Date(firstSeenAt).toISOString()}`,
      `updatedAtIso: ${new Date(lastSeenAt).toISOString()}`,
      `sources: ${sources.join(", ") || "n/a"}`,
      "---",
      "",
    ].join("\n");

    const body: string[] = [];
    body.push(`Signature: ${signature}`);
    body.push(`Column: ${String(meta.column || "inbox")}`);
    body.push(`Occurrence count: ${Number(meta.occurrenceCount || 0)}`);
    body.push(`First seen: ${new Date(firstSeenAt).toISOString()}`);
    body.push(`Last seen: ${new Date(lastSeenAt).toISOString()}`);
    body.push("");
    body.push("## Sample");
    body.push("");
    body.push("```");
    body.push(String(meta.sample?.message || "").slice(0, 2000));
    body.push("```");
    body.push("");
    if (meta.sample?.stack) {
      body.push("```");
      body.push(String(meta.sample.stack).slice(0, 8000));
      body.push("```");
      body.push("");
    }

    body.push("## Occurrences");
    body.push("");
    for (const a of occArts) {
      if (!a) continue;
      body.push(`- ${new Date(Number(a.fetchedAt || Date.now())).toISOString()} ${String(a.sourceUrl || "")}`);
    }
    body.push("");

    if (inv?.rawContent) {
      body.push("## Investigation");
      body.push("");
      body.push("```json");
      body.push(String(inv.rawContent).slice(0, 12000));
      body.push("```");
      body.push("");
    }

    write(filePath, `${fm}${body.join("\n")}`);
  }

  const reportPath = path.join(root, "master", "bugloop_export_report.json");
  write(reportPath, JSON.stringify({ ok: true, exportedAtIso: exportRes.exportedAtIso, count: cards.length }, null, 2) + "\n");
  console.log(`[bugloop:export:vault] ok cards=${cards.length} out=${path.relative(process.cwd(), reportPath)}`);
}

const invokedAsScript = process.argv.some((a) => typeof a === "string" && a.replace(/\\/g, "/").endsWith("export-bug-vault.ts"));
if (invokedAsScript) {
  const limitArg = Number(process.argv[2] || "200");
  exportBugCardsToVault("vault", Number.isFinite(limitArg) ? limitArg : 200);
}
