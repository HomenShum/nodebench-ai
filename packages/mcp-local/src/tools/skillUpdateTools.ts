/**
 * Skill Self-Update Protocol — Track rule/memory file provenance,
 * detect staleness via source file hashing, and provide step-by-step
 * resync procedures.
 *
 * A "skill" is any .md rule file (.windsurf/rules/, .cursor/rules/,
 * AGENTS.md, etc.) that an agent uses. Each skill tracks:
 * - Source documents: which files the skill was derived from
 * - Update triggers: conditions that should prompt resyncing
 * - Update instructions: step-by-step procedure to update the skill
 * - Freshness signal: SHA-256 hash of source files + last sync date
 *
 * Frontmatter format injected into skill files:
 * ---
 * skill_id: convex-rules
 * source_files: [convex/schema.ts, package.json]
 * source_hash: abc123...
 * last_synced: 2026-02-11T20:00:00Z
 * update_triggers: [schema changes, new Convex version]
 * update_instructions: [Read schema.ts, Check for new patterns, ...]
 * ---
 */

import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, relative } from "node:path";
import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

// ── Helpers ─────────────────────────────────────────────────────────

/** Compute SHA-256 hash of file contents. Returns null if file missing. */
function hashFile(filePath: string): string | null {
  try {
    const content = readFileSync(filePath);
    return createHash("sha256").update(content).digest("hex").slice(0, 16);
  } catch {
    return null;
  }
}

/** Compute composite hash of multiple source files (sorted, concatenated). */
function computeSourceHash(sourceFiles: string[], projectRoot: string): {
  compositeHash: string;
  fileHashes: Record<string, string | null>;
} {
  const fileHashes: Record<string, string | null> = {};
  const parts: string[] = [];

  for (const rel of [...sourceFiles].sort()) {
    const abs = resolve(projectRoot, rel);
    const h = hashFile(abs);
    fileHashes[rel] = h;
    parts.push(`${rel}:${h ?? "MISSING"}`);
  }

  const compositeHash = createHash("sha256")
    .update(parts.join("|"))
    .digest("hex")
    .slice(0, 16);

  return { compositeHash, fileHashes };
}

/** Parse YAML-like frontmatter from a markdown file. */
function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const fm: Record<string, any> = {};
  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    const kv = line.match(/^(\w[\w_]*)\s*:\s*(.+)$/);
    if (kv) {
      const key = kv[1];
      let val: any = kv[2].trim();
      // Parse arrays: [a, b, c]
      if (val.startsWith("[") && val.endsWith("]")) {
        val = val.slice(1, -1).split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      fm[key] = val;
    }
  }

  return { frontmatter: fm, body: match[2] };
}

/** Serialize frontmatter back into a markdown file. */
function serializeFrontmatter(fm: Record<string, any>, body: string): string {
  const lines: string[] = ["---"];
  for (const [key, val] of Object.entries(fm)) {
    if (Array.isArray(val)) {
      lines.push(`${key}: [${val.join(", ")}]`);
    } else {
      lines.push(`${key}: ${val}`);
    }
  }
  lines.push("---");
  return lines.join("\n") + "\n" + body;
}

/** Find which source files changed between two hashes. */
function findChangedSources(
  oldHashes: Record<string, string | null>,
  newHashes: Record<string, string | null>
): string[] {
  const changed: string[] = [];
  for (const [file, newHash] of Object.entries(newHashes)) {
    if (oldHashes[file] !== newHash) {
      changed.push(file);
    }
  }
  return changed;
}

// ── Tools ───────────────────────────────────────────────────────────

export const skillUpdateTools: McpTool[] = [
  // ═══════════════════════════════════════════════════════════════════
  // TOOL: register_skill
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "register_skill",
    description:
      "Register a skill (rule/memory .md file) with its source documents, update triggers, " +
      "and update instructions. Computes a SHA-256 hash of all source files for staleness " +
      "detection. Injects freshness frontmatter into the skill file. Use this when creating " +
      "or adopting a new rule file so it can be automatically checked for staleness.",
    inputSchema: {
      type: "object" as const,
      properties: {
        skillId: {
          type: "string",
          description: "Unique identifier for the skill (e.g. 'convex-rules', 'agents-md', 'nodebench-rules')",
        },
        name: {
          type: "string",
          description: "Human-readable name (e.g. 'Convex Guidelines')",
        },
        filePath: {
          type: "string",
          description: "Path to the skill .md file, relative to project root (e.g. '.windsurf/rules/convexRules.md')",
        },
        description: {
          type: "string",
          description: "What this skill covers",
        },
        sourceFiles: {
          type: "array",
          items: { type: "string" },
          description: "Source files this skill was derived from (relative to project root). e.g. ['convex/schema.ts', 'package.json']",
        },
        updateTriggers: {
          type: "array",
          items: { type: "string" },
          description: "Conditions that should prompt resyncing. e.g. ['schema.ts changes', 'New Convex version in package.json']",
        },
        updateInstructions: {
          type: "array",
          items: { type: "string" },
          description: "Step-by-step procedure to update the skill when stale. e.g. ['Read schema.ts', 'Check for new patterns', 'Update examples']",
        },
        projectRoot: {
          type: "string",
          description: "Absolute path to the project root directory",
        },
        injectFrontmatter: {
          type: "boolean",
          description: "Whether to inject/update freshness frontmatter in the skill file (default: true)",
          default: true,
        },
      },
      required: ["skillId", "name", "filePath", "sourceFiles", "projectRoot"],
    },
    handler: async (args: {
      skillId: string;
      name: string;
      filePath: string;
      description?: string;
      sourceFiles: string[];
      updateTriggers?: string[];
      updateInstructions?: string[];
      projectRoot: string;
      injectFrontmatter?: boolean;
    }) => {
      const db = getDb();
      const now = new Date().toISOString();

      // Compute source hash
      const { compositeHash, fileHashes } = computeSourceHash(args.sourceFiles, args.projectRoot);

      const missingFiles = Object.entries(fileHashes)
        .filter(([, h]) => h === null)
        .map(([f]) => f);

      // Upsert skill in DB
      const id = genId("skill");
      db.prepare(`
        INSERT INTO skills (id, skill_id, name, file_path, description, source_files, source_hash, update_triggers, update_instructions, last_synced_at, status, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'fresh', ?, ?, ?)
        ON CONFLICT(skill_id) DO UPDATE SET
          name = excluded.name,
          file_path = excluded.file_path,
          description = excluded.description,
          source_files = excluded.source_files,
          source_hash = excluded.source_hash,
          update_triggers = excluded.update_triggers,
          update_instructions = excluded.update_instructions,
          last_synced_at = excluded.last_synced_at,
          status = 'fresh',
          metadata = excluded.metadata,
          updated_at = excluded.updated_at
      `).run(
        id,
        args.skillId,
        args.name,
        args.filePath,
        args.description ?? null,
        JSON.stringify(args.sourceFiles),
        compositeHash,
        JSON.stringify(args.updateTriggers ?? []),
        JSON.stringify(args.updateInstructions ?? []),
        now,
        JSON.stringify({ fileHashes }),
        now,
        now,
      );

      // Inject frontmatter into the skill file
      if (args.injectFrontmatter !== false) {
        const absPath = resolve(args.projectRoot, args.filePath);
        if (existsSync(absPath)) {
          const raw = readFileSync(absPath, "utf-8");
          const { frontmatter: existingFm, body } = parseFrontmatter(raw);

          const newFm: Record<string, any> = {
            ...existingFm,
            skill_id: args.skillId,
            source_files: args.sourceFiles,
            source_hash: compositeHash,
            last_synced: now,
          };
          if (args.updateTriggers?.length) {
            newFm.update_triggers = args.updateTriggers;
          }
          if (args.updateInstructions?.length) {
            newFm.update_instructions = args.updateInstructions;
          }

          writeFileSync(absPath, serializeFrontmatter(newFm, body), "utf-8");
        }
      }

      // Record initial sync in history
      db.prepare(`
        INSERT INTO skill_sync_history (id, skill_id, previous_hash, new_hash, changed_sources, trigger_reason, sync_notes, synced_at)
        VALUES (?, ?, NULL, ?, ?, 'initial_registration', 'Skill registered', ?)
      `).run(genId("sync"), args.skillId, compositeHash, JSON.stringify(args.sourceFiles), now);

      return {
        skillId: args.skillId,
        name: args.name,
        filePath: args.filePath,
        sourceFiles: args.sourceFiles,
        sourceHash: compositeHash,
        missingFiles,
        status: "fresh",
        lastSyncedAt: now,
        frontmatterInjected: args.injectFrontmatter !== false,
        _hint: `Skill "${args.name}" registered with ${args.sourceFiles.length} source files. Hash: ${compositeHash}. Use check_skill_freshness to detect staleness.`,
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // TOOL: check_skill_freshness
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "check_skill_freshness",
    description:
      "Check if registered skills are stale by comparing current source file hashes " +
      "against stored hashes. Returns a freshness report for each skill, identifying " +
      "which source files changed and which update triggers apply. Run this at the " +
      "start of a session or after significant code changes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        skillId: {
          type: "string",
          description: "Check a specific skill (optional — omit to check all)",
        },
        projectRoot: {
          type: "string",
          description: "Absolute path to the project root directory",
        },
        autoUpdateStatus: {
          type: "boolean",
          description: "Automatically update skill status in DB (default: true)",
          default: true,
        },
      },
      required: ["projectRoot"],
    },
    handler: async (args: {
      skillId?: string;
      projectRoot: string;
      autoUpdateStatus?: boolean;
    }) => {
      const db = getDb();

      const skills = args.skillId
        ? db.prepare("SELECT * FROM skills WHERE skill_id = ?").all(args.skillId)
        : db.prepare("SELECT * FROM skills ORDER BY skill_id").all();

      if (!skills.length) {
        return {
          count: 0,
          skills: [],
          _hint: args.skillId
            ? `No skill found with id "${args.skillId}". Use register_skill to register it.`
            : "No skills registered. Use register_skill to register your rule files.",
        };
      }

      const report: any[] = [];
      let staleCount = 0;

      for (const skill of skills as any[]) {
        const sourceFiles: string[] = JSON.parse(skill.source_files);
        const storedHash = skill.source_hash;
        const storedMeta = skill.metadata ? JSON.parse(skill.metadata) : {};
        const storedFileHashes: Record<string, string | null> = storedMeta.fileHashes ?? {};

        const { compositeHash, fileHashes } = computeSourceHash(sourceFiles, args.projectRoot);
        const isStale = compositeHash !== storedHash;
        const changedFiles = findChangedSources(storedFileHashes, fileHashes);

        const triggers: string[] = JSON.parse(skill.update_triggers);
        const instructions: string[] = JSON.parse(skill.update_instructions);

        // Check which triggers apply based on changed files
        const matchedTriggers = triggers.filter(t => {
          const tLower = t.toLowerCase();
          return changedFiles.some(f => tLower.includes(f.toLowerCase().split("/").pop()!.split(".")[0]));
        });

        if (isStale) staleCount++;

        // Update DB status
        if (args.autoUpdateStatus !== false && isStale) {
          db.prepare("UPDATE skills SET status = 'stale', updated_at = datetime('now') WHERE skill_id = ?")
            .run(skill.skill_id);
        }

        const lastSyncMs = skill.last_synced_at ? Date.now() - new Date(skill.last_synced_at).getTime() : null;
        const daysSinceSync = lastSyncMs ? Math.floor(lastSyncMs / 86400000) : null;

        report.push({
          skillId: skill.skill_id,
          name: skill.name,
          filePath: skill.file_path,
          status: isStale ? "stale" : "fresh",
          storedHash,
          currentHash: compositeHash,
          changedFiles,
          matchedTriggers,
          lastSyncedAt: skill.last_synced_at,
          daysSinceSync,
          sourceFileCount: sourceFiles.length,
          updateInstructions: isStale ? instructions : undefined,
        });
      }

      return {
        count: report.length,
        staleCount,
        freshCount: report.length - staleCount,
        skills: report,
        _hint: staleCount > 0
          ? `${staleCount} skill(s) are STALE and need resyncing. Use sync_skill({ skillId, projectRoot }) to update each one.`
          : "All skills are fresh — no updates needed.",
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // TOOL: sync_skill
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "sync_skill",
    description:
      "Resync a stale skill after applying updates. Recomputes source hashes, updates " +
      "the freshness frontmatter in the skill file, and records the sync in history. " +
      "Call this AFTER you have followed the update_instructions and updated the skill " +
      "file content. This tool just records that the sync happened.",
    inputSchema: {
      type: "object" as const,
      properties: {
        skillId: {
          type: "string",
          description: "The skill to mark as synced",
        },
        projectRoot: {
          type: "string",
          description: "Absolute path to the project root directory",
        },
        syncNotes: {
          type: "string",
          description: "What was updated in this sync (e.g. 'Added new table validators, updated function patterns')",
        },
        triggerReason: {
          type: "string",
          description: "What triggered this sync (e.g. 'schema.ts changed — new narrativeHypotheses table')",
        },
      },
      required: ["skillId", "projectRoot"],
    },
    handler: async (args: {
      skillId: string;
      projectRoot: string;
      syncNotes?: string;
      triggerReason?: string;
    }) => {
      const db = getDb();
      const now = new Date().toISOString();

      const skill = db.prepare("SELECT * FROM skills WHERE skill_id = ?").get(args.skillId) as any;
      if (!skill) throw new Error(`Skill "${args.skillId}" not found. Use register_skill first.`);

      const sourceFiles: string[] = JSON.parse(skill.source_files);
      const previousHash = skill.source_hash;
      const previousMeta = skill.metadata ? JSON.parse(skill.metadata) : {};
      const previousFileHashes: Record<string, string | null> = previousMeta.fileHashes ?? {};

      // Recompute hash
      const { compositeHash, fileHashes } = computeSourceHash(sourceFiles, args.projectRoot);
      const changedFiles = findChangedSources(previousFileHashes, fileHashes);

      // Update skill in DB
      db.prepare(`
        UPDATE skills SET
          source_hash = ?,
          last_synced_at = ?,
          status = 'fresh',
          metadata = ?,
          updated_at = ?
        WHERE skill_id = ?
      `).run(compositeHash, now, JSON.stringify({ fileHashes }), now, args.skillId);

      // Record in history
      db.prepare(`
        INSERT INTO skill_sync_history (id, skill_id, previous_hash, new_hash, changed_sources, trigger_reason, sync_notes, synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        genId("sync"),
        args.skillId,
        previousHash,
        compositeHash,
        JSON.stringify(changedFiles),
        args.triggerReason ?? null,
        args.syncNotes ?? null,
        now,
      );

      // Update frontmatter in skill file
      const absPath = resolve(args.projectRoot, skill.file_path);
      if (existsSync(absPath)) {
        const raw = readFileSync(absPath, "utf-8");
        const { frontmatter: existingFm, body } = parseFrontmatter(raw);
        existingFm.source_hash = compositeHash;
        existingFm.last_synced = now;
        writeFileSync(absPath, serializeFrontmatter(existingFm, body), "utf-8");
      }

      return {
        skillId: args.skillId,
        name: skill.name,
        previousHash,
        newHash: compositeHash,
        changedFiles,
        status: "fresh",
        syncedAt: now,
        triggerReason: args.triggerReason ?? null,
        syncNotes: args.syncNotes ?? null,
        _hint: `Skill "${skill.name}" synced. Hash: ${previousHash} → ${compositeHash}. ${changedFiles.length} source file(s) changed.`,
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // TOOL: list_skills
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "list_skills",
    description:
      "List all registered skills with their freshness status, source files, " +
      "update triggers, and sync history. Use to get an overview of all tracked " +
      "rule/memory files and whether any need updating.",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["all", "fresh", "stale"],
          description: "Filter by status (default: all)",
        },
        includeHistory: {
          type: "boolean",
          description: "Include sync history for each skill (default: false)",
        },
      },
    },
    handler: async (args: { status?: string; includeHistory?: boolean }) => {
      const db = getDb();

      const filter = args.status && args.status !== "all" ? args.status : null;
      const skills = filter
        ? db.prepare("SELECT * FROM skills WHERE status = ? ORDER BY skill_id").all(filter)
        : db.prepare("SELECT * FROM skills ORDER BY skill_id").all();

      const result = (skills as any[]).map(s => {
        const entry: any = {
          skillId: s.skill_id,
          name: s.name,
          filePath: s.file_path,
          description: s.description,
          status: s.status,
          sourceFiles: JSON.parse(s.source_files),
          sourceHash: s.source_hash,
          updateTriggers: JSON.parse(s.update_triggers),
          updateInstructions: JSON.parse(s.update_instructions),
          lastSyncedAt: s.last_synced_at,
          createdAt: s.created_at,
        };

        if (args.includeHistory) {
          const history = db.prepare(
            "SELECT * FROM skill_sync_history WHERE skill_id = ? ORDER BY synced_at DESC LIMIT 10"
          ).all(s.skill_id) as any[];
          entry.syncHistory = history.map(h => ({
            previousHash: h.previous_hash,
            newHash: h.new_hash,
            changedSources: h.changed_sources ? JSON.parse(h.changed_sources) : [],
            triggerReason: h.trigger_reason,
            syncNotes: h.sync_notes,
            syncedAt: h.synced_at,
          }));
        }

        return entry;
      });

      const staleCount = result.filter(s => s.status === "stale").length;

      return {
        count: result.length,
        staleCount,
        freshCount: result.length - staleCount,
        skills: result,
        _hint: staleCount > 0
          ? `${staleCount} skill(s) are stale. Run check_skill_freshness to see details, then sync_skill to update.`
          : result.length > 0
            ? "All skills are fresh."
            : "No skills registered. Use register_skill to start tracking your rule files.",
      };
    },
  },
];
