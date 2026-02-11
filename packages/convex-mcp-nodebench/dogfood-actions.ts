import { getDb } from "./src/db.js";
import { resolve } from "node:path";

const db = getDb();
const P = resolve(import.meta.dirname, "../..");

// Get action audit criticals
const row = db.prepare(
  "SELECT issues_json FROM audit_results WHERE project_dir = ? AND audit_type = 'action_audit' ORDER BY audited_at DESC LIMIT 1"
).get(P) as any;

if (row) {
  const issues = JSON.parse(row.issues_json);
  const criticals = issues.filter((i: any) => i.severity === "critical");

  // Group by file
  const byFile = new Map<string, string[]>();
  for (const c of criticals) {
    const file = c.file ?? "unknown";
    const list = byFile.get(file) ?? [];
    list.push(c.message);
    byFile.set(file, list);
  }

  console.log(`=== ACTION CRITICALS: ${criticals.length} across ${byFile.size} files ===\n`);
  for (const [file, msgs] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${file} (${msgs.length}):`);
    // Show unique patterns
    const unique = [...new Set(msgs)];
    for (const m of unique.slice(0, 3)) {
      console.log(`  - ${m}`);
    }
    if (unique.length > 3) console.log(`  ... and ${unique.length - 3} more`);
    console.log();
  }
}
