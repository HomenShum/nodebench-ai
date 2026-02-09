/**
 * Session Memory Tools — Compaction-resilient notes, attention refresh, and session recovery.
 *
 * Inspired by:
 * - claude-mem (thedotmack): 3-layer progressive disclosure, compaction-resilient notepad
 * - planning-with-files (OthmanAdi): Manus-style filesystem-as-memory, attention refresh
 * - oh-my-claudecode (Yeachan-Heo): .omc/notepad.md compaction-resilient state
 *
 * 3 tools:
 * - save_session_note: Persist findings to filesystem (survives context compaction)
 * - load_session_notes: Retrieve notes from filesystem
 * - refresh_task_context: Re-inject current goals mid-session (attention management)
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const NOTES_DIR = path.join(os.homedir(), ".nodebench", "notes");

function ensureNotesDir(): void {
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
  }
}

export const sessionMemoryTools: McpTool[] = [
  // ─── Tool 1: save_session_note ───────────────────────────────────────────
  {
    name: "save_session_note",
    description:
      "Persist a critical finding, decision, or progress note to the filesystem. Notes survive context compaction — call this after every major finding or decision so state is never lost. Writes to ~/.nodebench/notes/ as dated markdown files.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description:
            "Short headline for the note (e.g. 'Auth bug root cause', 'Migration decision: JWT over sessions')",
        },
        content: {
          type: "string",
          description:
            "Full note content. Include facts, decisions, file paths, error messages — anything needed to reconstruct context after compaction.",
        },
        category: {
          type: "string",
          enum: [
            "finding",
            "decision",
            "progress",
            "blocker",
            "learning",
            "architecture",
            "debugging",
          ],
          description: "Type of note (default: finding)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Tags for searchability (e.g. ['auth', 'jwt', 'security'])",
        },
      },
      required: ["title", "content"],
    },
    handler: async (args) => {
      ensureNotesDir();
      const {
        title,
        content,
        category = "finding",
        tags = [],
      } = args;
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toISOString().slice(11, 19).replace(/:/g, "");
      const safeTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 50);
      const filename = `${dateStr}-${timeStr}-${safeTitle}.md`;
      const filePath = path.join(NOTES_DIR, filename);

      const markdown = [
        `# ${title}`,
        "",
        `**Category:** ${category}`,
        `**Date:** ${now.toISOString()}`,
        tags.length > 0 ? `**Tags:** ${tags.join(", ")}` : "",
        "",
        "---",
        "",
        content,
        "",
      ]
        .filter(Boolean)
        .join("\n");

      fs.writeFileSync(filePath, markdown, "utf-8");

      // Also persist to SQLite for cross-session search
      try {
        const db = getDb();
        db.prepare(
          `INSERT INTO learnings (id, key, content, category, tags, source_cycle_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
        ).run(
          genId("note"),
          `session_note:${safeTitle}`,
          `[Session Note] ${title}\n\n${content}`,
          category === "finding" ? "pattern" : category === "debugging" ? "gotcha" : "convention",
          JSON.stringify(tags),
          null
        );
      } catch {
        /* SQLite backup is best-effort */
      }

      return {
        saved: true,
        filePath,
        filename,
        title,
        category,
        tip: "Notes persist to filesystem and survive context compaction. Call load_session_notes to retrieve after /clear or /compact.",
      };
    },
  },

  // ─── Tool 2: load_session_notes ──────────────────────────────────────────
  {
    name: "load_session_notes",
    description:
      "Load session notes from the filesystem. Use after context compaction, /clear, or session resume to recover state. Returns notes sorted by recency. Supports filtering by date, category, or keyword.",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description:
            "Filter by date (YYYY-MM-DD). Default: today. Use 'all' for all notes.",
        },
        category: {
          type: "string",
          enum: [
            "finding",
            "decision",
            "progress",
            "blocker",
            "learning",
            "architecture",
            "debugging",
          ],
          description: "Filter by note category (optional)",
        },
        keyword: {
          type: "string",
          description:
            "Search notes containing this keyword (case-insensitive)",
        },
        limit: {
          type: "number",
          description: "Max notes to return (default: 10)",
        },
      },
      required: [],
    },
    handler: async (args) => {
      ensureNotesDir();
      const { date, category, keyword, limit = 10 } = args;

      const files = fs.readdirSync(NOTES_DIR).filter((f) => f.endsWith(".md"));

      // Sort by filename (date-time prefix) descending (most recent first)
      files.sort((a, b) => b.localeCompare(a));

      // Filter by date
      let filtered = files;
      if (date && date !== "all") {
        filtered = filtered.filter((f) => f.startsWith(date));
      } else if (!date) {
        // Default: today
        const today = new Date().toISOString().slice(0, 10);
        filtered = filtered.filter((f) => f.startsWith(today));
      }

      // Read file contents and apply filters
      const notes: Array<{
        filename: string;
        title: string;
        category: string;
        content: string;
        date: string;
      }> = [];

      for (const file of filtered) {
        if (notes.length >= limit) break;

        const content = fs.readFileSync(path.join(NOTES_DIR, file), "utf-8");

        // Extract metadata from markdown
        const titleMatch = content.match(/^# (.+)$/m);
        const categoryMatch = content.match(/\*\*Category:\*\* (.+)$/m);
        const dateMatch = content.match(/\*\*Date:\*\* (.+)$/m);

        const noteCategory = categoryMatch?.[1] || "unknown";
        const noteTitle = titleMatch?.[1] || file;
        const noteDate = dateMatch?.[1] || "";

        // Category filter
        if (category && noteCategory !== category) continue;

        // Keyword filter
        if (keyword && !content.toLowerCase().includes(keyword.toLowerCase()))
          continue;

        notes.push({
          filename: file,
          title: noteTitle,
          category: noteCategory,
          content,
          date: noteDate,
        });
      }

      return {
        noteCount: notes.length,
        totalFiles: files.length,
        notes: notes.map((n) => ({
          filename: n.filename,
          title: n.title,
          category: n.category,
          preview: n.content.slice(0, 300),
          fullContent: n.content,
        })),
        tip:
          notes.length === 0
            ? "No notes found. Use save_session_note to persist findings during your session."
            : "Notes loaded. Review findings and continue where you left off.",
      };
    },
  },

  // ─── Tool 3: refresh_task_context ────────────────────────────────────────
  {
    name: "refresh_task_context",
    description:
      "Re-inject the current task context to combat attention drift. After 30+ tool calls, models lose sight of original goals ('lost in the middle' problem). This tool gathers your active verification cycle, open gaps, recent learnings, and session notes into a compact refresher. Based on Manus's 'Manipulate Attention Through Recitation' principle.",
    inputSchema: {
      type: "object",
      properties: {
        taskDescription: {
          type: "string",
          description:
            "What you're currently working on (re-state the original goal to anchor attention)",
        },
        includeNotes: {
          type: "boolean",
          description:
            "Include today's session notes in the refresher (default: true)",
        },
        includeGaps: {
          type: "boolean",
          description:
            "Include open verification gaps (default: true)",
        },
        includeLearnings: {
          type: "boolean",
          description:
            "Include recent relevant learnings (default: true)",
        },
      },
      required: [],
    },
    handler: async (args) => {
      const {
        taskDescription = "",
        includeNotes = true,
        includeGaps = true,
        includeLearnings = true,
      } = args;
      const db = getDb();
      const context: Record<string, unknown> = {};

      // 1. Active verification cycle
      try {
        const activeCycle = db
          .prepare(
            "SELECT * FROM verification_cycles WHERE status = 'active' ORDER BY created_at DESC LIMIT 1"
          )
          .get() as any;
        if (activeCycle) {
          const phases = db
            .prepare(
              "SELECT phase, status, summary FROM phase_findings WHERE cycle_id = ? ORDER BY phase ASC"
            )
            .all(activeCycle.id) as any[];
          context.activeCycle = {
            id: activeCycle.id,
            title: activeCycle.title,
            currentPhase: activeCycle.current_phase,
            status: activeCycle.status,
            phases: phases.map((p: any) => ({
              phase: p.phase,
              status: p.status,
              summary: p.summary?.slice(0, 100),
            })),
          };
        }
      } catch {
        /* table may not exist yet */
      }

      // 2. Open gaps
      if (includeGaps) {
        try {
          const gaps = db
            .prepare(
              "SELECT id, description, severity, status FROM gaps WHERE status = 'open' ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END LIMIT 10"
            )
            .all() as any[];
          if (gaps.length > 0) {
            context.openGaps = gaps.map((g: any) => ({
              id: g.id,
              description: g.description?.slice(0, 100),
              severity: g.severity,
            }));
          }
        } catch {
          /* table may not exist yet */
        }
      }

      // 3. Recent learnings
      if (includeLearnings) {
        try {
          const learnings = db
            .prepare(
              "SELECT key, content, category FROM learnings ORDER BY created_at DESC LIMIT 5"
            )
            .all() as any[];
          if (learnings.length > 0) {
            context.recentLearnings = learnings.map((l: any) => ({
              key: l.key,
              category: l.category,
              preview: l.content?.slice(0, 100),
            }));
          }
        } catch {
          /* table may not exist yet */
        }
      }

      // 4. Today's session notes
      if (includeNotes) {
        ensureNotesDir();
        const today = new Date().toISOString().slice(0, 10);
        const files = fs
          .readdirSync(NOTES_DIR)
          .filter((f) => f.endsWith(".md") && f.startsWith(today))
          .sort((a, b) => b.localeCompare(a))
          .slice(0, 5);

        if (files.length > 0) {
          context.todayNotes = files.map((f) => {
            const content = fs.readFileSync(
              path.join(NOTES_DIR, f),
              "utf-8"
            );
            const titleMatch = content.match(/^# (.+)$/m);
            return {
              title: titleMatch?.[1] || f,
              preview: content.slice(0, 200),
            };
          });
        }
      }

      // 5. Tool call stats for this session
      try {
        const stats = db
          .prepare(
            "SELECT COUNT(*) as total, SUM(CASE WHEN result_status = 'error' THEN 1 ELSE 0 END) as errors FROM tool_call_log WHERE session_id = (SELECT session_id FROM tool_call_log ORDER BY created_at DESC LIMIT 1)"
          )
          .get() as any;
        if (stats) {
          context.sessionStats = {
            totalToolCalls: stats.total,
            errors: stats.errors,
            attentionWarning:
              stats.total > 30
                ? "HIGH DRIFT RISK: 30+ tool calls. Recite your original goal before proceeding."
                : stats.total > 15
                  ? "MODERATE: 15+ tool calls. Consider re-reading your task plan."
                  : "LOW: Fresh context, proceed normally.",
          };
        }
      } catch {
        /* table may not exist yet */
      }

      return {
        taskDescription:
          taskDescription ||
          "(Not specified — re-state your original goal to anchor attention)",
        context,
        refreshedAt: new Date().toISOString(),
        guideline:
          "Re-read the taskDescription and activeCycle goal. Focus on open gaps by severity. Check todayNotes for decisions made earlier. Avoid repeating solved problems.",
        antiDrift: [
          "Does my current action serve the original goal?",
          "Am I repeating something I already tried?",
          "Have I checked learnings before implementing?",
          "Am I within scope or drifting to tangents?",
        ],
      };
    },
  },
];
