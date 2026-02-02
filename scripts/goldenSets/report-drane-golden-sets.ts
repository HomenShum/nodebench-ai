import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SUITES_DIR = path.join(
  ROOT,
  "convex",
  "domains",
  "narrative",
  "tests",
  "goldenSets",
  "suites"
);

type CaseRow = {
  suiteId: string;
  version: string;
  caseId: string;
  tags: string[];
  urls: string[];
};

function inc(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

async function main() {
  const entries = await fs.readdir(SUITES_DIR, { withFileTypes: true }).catch(() => []);
  const suiteFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => path.join(SUITES_DIR, e.name))
    .sort();

  if (suiteFiles.length === 0) {
    throw new Error(`No suite JSON files found in ${SUITES_DIR}`);
  }

  const tagCounts = new Map<string, number>();
  const hostCounts = new Map<string, number>();
  const suiteCounts = new Map<string, number>();
  const cases: CaseRow[] = [];

  for (const fp of suiteFiles) {
    const raw = await fs.readFile(fp, "utf8");
    const suite = JSON.parse(raw) as any;
    const suiteId = String(suite.suiteId);
    const version = String(suite.version);
    const suiteKey = `${suiteId}@${version}`;

    const suiteCases: any[] = Array.isArray(suite.cases) ? suite.cases : [];
    inc(suiteCounts, suiteKey, suiteCases.length);

    for (const c of suiteCases) {
      const tags = Array.isArray(c.tags) ? c.tags.map(String) : [];
      for (const t of tags) inc(tagCounts, t, 1);

      const injected: any[] = c?.run?.scout?.injectedNewsItems ?? [];
      const urls = injected.map((n) => String(n.url)).filter(Boolean);
      for (const u of urls) {
        const host = new URL(u).hostname;
        inc(hostCounts, host, 1);
      }

      cases.push({
        suiteId,
        version,
        caseId: String(c.caseId),
        tags,
        urls,
      });
    }
  }

  const top = (m: Map<string, number>, n = 20) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

  // eslint-disable-next-line no-console
  console.log("\nGolden set coverage report\n");
  // eslint-disable-next-line no-console
  console.log("Suites:");
  for (const [k, v] of top(suiteCounts, 50)) {
    // eslint-disable-next-line no-console
    console.log(`- ${k}: ${v} cases`);
  }

  // eslint-disable-next-line no-console
  console.log("\nTop tags:");
  for (const [k, v] of top(tagCounts, 50)) {
    // eslint-disable-next-line no-console
    console.log(`- ${k}: ${v}`);
  }

  // eslint-disable-next-line no-console
  console.log("\nTop hosts:");
  for (const [k, v] of top(hostCounts, 50)) {
    // eslint-disable-next-line no-console
    console.log(`- ${k}: ${v}`);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

