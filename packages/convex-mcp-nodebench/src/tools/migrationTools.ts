import { resolve } from "node:path";
import { getDb, genId } from "../db.js";
import { getQuickRef } from "./toolRegistry.js";
import type { McpTool } from "../types.js";

// ── Schema Migration Plan ───────────────────────────────────────────

interface MigrationStep {
  action: "add_table" | "remove_table" | "add_index" | "remove_index" | "add_field" | "remove_field" | "size_change";
  severity: "critical" | "warning" | "info";
  detail: string;
  recommendation: string;
}

function generateMigrationPlan(
  oldSnapshot: any,
  newSnapshot: any
): {
  steps: MigrationStep[];
  summary: {
    addedTables: string[];
    removedTables: string[];
    addedIndexes: number;
    removedIndexes: number;
    sizeChange: string;
    riskLevel: "low" | "medium" | "high";
  };
} {
  const steps: MigrationStep[] = [];

  const oldTables = new Set<string>(oldSnapshot.tables?.map((t: any) => typeof t === "string" ? t : t.name) || []);
  const newTables = new Set<string>(newSnapshot.tables?.map((t: any) => typeof t === "string" ? t : t.name) || []);

  const addedTables: string[] = [];
  const removedTables: string[] = [];

  // Added tables
  for (const t of newTables) {
    if (!oldTables.has(t)) {
      addedTables.push(t);
      steps.push({
        action: "add_table",
        severity: "info",
        detail: `New table "${t}" added`,
        recommendation: "New tables deploy automatically. Consider seeding initial data if needed.",
      });
    }
  }

  // Removed tables
  for (const t of oldTables) {
    if (!newTables.has(t)) {
      removedTables.push(t);
      steps.push({
        action: "remove_table",
        severity: "critical",
        detail: `Table "${t}" removed — ALL DATA IN THIS TABLE WILL BE LOST`,
        recommendation: "Back up data before deploying. Consider archiving to a backup table first.",
      });
    }
  }

  // Index changes
  const oldIndexCount = oldSnapshot.totalIndexes || 0;
  const newIndexCount = newSnapshot.totalIndexes || 0;
  const addedIndexes = Math.max(0, newIndexCount - oldIndexCount);
  const removedIndexes = Math.max(0, oldIndexCount - newIndexCount);

  if (addedIndexes > 0) {
    steps.push({
      action: "add_index",
      severity: "info",
      detail: `${addedIndexes} new index(es) added`,
      recommendation: "New indexes build automatically on deploy. Existing data will be indexed.",
    });
  }
  if (removedIndexes > 0) {
    steps.push({
      action: "remove_index",
      severity: "warning",
      detail: `${removedIndexes} index(es) removed. Queries using .withIndex() on removed indexes will fail.`,
      recommendation: "Update all queries that reference removed indexes before deploying.",
    });
  }

  // Size change
  const oldSize = oldSnapshot.rawLength || 0;
  const newSize = newSnapshot.rawLength || 0;
  const sizeDiff = newSize - oldSize;
  if (Math.abs(sizeDiff) > 100) {
    steps.push({
      action: "size_change",
      severity: "info",
      detail: `Schema size changed by ${sizeDiff > 0 ? "+" : ""}${sizeDiff} bytes (${oldSize} → ${newSize})`,
      recommendation: sizeDiff > 1000 ? "Large schema growth — review if all fields are necessary" : "Normal schema change",
    });
  }

  // Risk assessment
  const riskLevel = removedTables.length > 0 ? "high" :
    removedIndexes > 0 ? "medium" : "low";

  return {
    steps,
    summary: {
      addedTables,
      removedTables,
      addedIndexes,
      removedIndexes,
      sizeChange: `${sizeDiff > 0 ? "+" : ""}${sizeDiff} bytes`,
      riskLevel,
    },
  };
}

// ── Tool Definition ─────────────────────────────────────────────────

export const migrationTools: McpTool[] = [
  {
    name: "convex_schema_migration_plan",
    description:
      "Compare two schema snapshots and generate a migration checklist. Shows added/removed tables, index changes, and risk assessment. Use after convex_snapshot_schema to plan deployments safely.",
    inputSchema: {
      type: "object",
      properties: {
        projectDir: {
          type: "string",
          description: "Absolute path to the project root. Compares the two most recent snapshots for this project.",
        },
      },
      required: ["projectDir"],
    },
    handler: async (args: { projectDir: string }) => {
      const projectDir = resolve(args.projectDir);
      const db = getDb();

      // Get the two most recent snapshots
      const snapshots = db.prepare(
        "SELECT * FROM schema_snapshots WHERE project_dir = ? ORDER BY snapshot_at DESC LIMIT 2"
      ).all(projectDir) as any[];

      if (snapshots.length < 2) {
        return {
          error: "Need at least 2 schema snapshots to generate a migration plan",
          hint: "Run convex_snapshot_schema twice (before and after changes) to create snapshots for comparison",
          currentSnapshots: snapshots.length,
          quickRef: getQuickRef("convex_schema_migration_plan"),
        };
      }

      const [newer, older] = snapshots;
      let oldSchema: any, newSchema: any;
      try {
        oldSchema = JSON.parse(older.schema_json);
        newSchema = JSON.parse(newer.schema_json);
      } catch {
        return { error: "Failed to parse stored schema snapshots" };
      }

      const plan = generateMigrationPlan(oldSchema, newSchema);

      // Store the plan
      db.prepare(
        "INSERT INTO audit_results (id, project_dir, audit_type, issues_json, issue_count) VALUES (?, ?, ?, ?, ?)"
      ).run(genId("audit"), projectDir, "migration_plan", JSON.stringify(plan), plan.steps.length);

      return {
        ...plan,
        snapshotDates: {
          from: older.snapshot_at,
          to: newer.snapshot_at,
        },
        quickRef: getQuickRef("convex_schema_migration_plan"),
      };
    },
  },
];
