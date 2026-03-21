/**
 * Memory Decay — L2 archival policy for session notes
 *
 * Notes older than MEMORY_DECAY_DAYS are moved to an archive directory.
 * Archived notes can still be loaded on demand but are deprioritized
 * in refresh_task_context (weight 0.3 vs 1.0 for recent).
 *
 * Policy: archive, never delete. Configurable via NODEBENCH_MEMORY_DECAY_DAYS env var.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─── Constants ───────────────────────────────────────────────────────────────

export const DEFAULT_DECAY_DAYS = 30;
export const DECAY_WEIGHT_RECENT = 1.0;
export const DECAY_WEIGHT_ARCHIVED = 0.3;
export const MAX_ARCHIVE_SCAN = 1000; // BOUND: max files to scan per directory
export const MAX_ARCHIVED_RESULTS = 50; // BOUND: max archived notes returned

export const NOTES_DIR = path.join(os.homedir(), ".nodebench", "notes");
export const ARCHIVE_DIR = path.join(NOTES_DIR, "archive");

const DATE_FILENAME_RE = /^(\d{4}-\d{2}-\d{2})(?:[-T].*)?\.md$/;

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * Returns the configured decay threshold in days.
 * Reads NODEBENCH_MEMORY_DECAY_DAYS env var, falls back to DEFAULT_DECAY_DAYS.
 */
export function getDecayDays(): number {
  const env = process.env.NODEBENCH_MEMORY_DECAY_DAYS;
  if (env) {
    const parsed = parseInt(env, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_DECAY_DAYS;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Creates the archive directory if it doesn't exist.
 */
export function ensureArchiveDir(): void {
  try {
    if (!fs.existsSync(ARCHIVE_DIR)) {
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }
  } catch {
    // Best-effort — caller handles missing dir gracefully
  }
}

/**
 * Extracts a Date from a note filename.
 * Accepts patterns like `2026-03-18.md` or `2026-03-18-143012-some-title.md`.
 * Returns null if the filename doesn't start with a valid YYYY-MM-DD prefix.
 */
export function getNoteDateFromFilename(filename: string): Date | null {
  const match = filename.match(DATE_FILENAME_RE);
  if (!match) return null;
  const date = new Date(match[1] + "T00:00:00");
  // Guard against invalid dates (e.g., 2026-02-30)
  if (isNaN(date.getTime())) return null;
  return date;
}

/**
 * Returns the age in days between a given date and now.
 */
function ageDays(date: Date): number {
  const now = Date.now();
  return (now - date.getTime()) / (1000 * 60 * 60 * 24);
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Archives notes older than the decay threshold.
 * Moves files from NOTES_DIR to ARCHIVE_DIR — never deletes.
 *
 * @returns count of archived files and errors encountered
 */
export function archiveOldNotes(): { archived: number; errors: number } {
  // If notes dir doesn't exist, nothing to archive
  if (!fs.existsSync(NOTES_DIR)) {
    return { archived: 0, errors: 0 };
  }

  ensureArchiveDir();

  const decayDays = getDecayDays();
  let archived = 0;
  let errors = 0;

  try {
    const entries = fs.readdirSync(NOTES_DIR);
    // BOUND: limit scan size
    const mdFiles = entries.filter((f) => f.endsWith(".md")).slice(0, MAX_ARCHIVE_SCAN);

    for (const file of mdFiles) {
      try {
        const noteDate = getNoteDateFromFilename(file);
        if (!noteDate) continue; // Non-standard filename, skip

        if (ageDays(noteDate) > decayDays) {
          const src = path.join(NOTES_DIR, file);
          const dest = path.join(ARCHIVE_DIR, file);
          fs.renameSync(src, dest);
          archived++;
        }
      } catch {
        // ERROR_BOUNDARY: individual file failure doesn't stop the sweep
        errors++;
      }
    }
  } catch {
    // ERROR_BOUNDARY: directory read failure
    errors++;
  }

  return { archived, errors };
}

/**
 * Loads archived notes with optional keyword filtering.
 * All archived notes carry DECAY_WEIGHT_ARCHIVED (0.3).
 *
 * @returns array of archived notes sorted by date descending, capped at MAX_ARCHIVED_RESULTS
 */
export function loadArchivedNotes(
  options?: { keyword?: string }
): Array<{ date: string; content: string; weight: number }> {
  if (!fs.existsSync(ARCHIVE_DIR)) return [];

  const keyword = options?.keyword?.toLowerCase();
  const results: Array<{ date: string; content: string; weight: number }> = [];

  try {
    const entries = fs.readdirSync(ARCHIVE_DIR);
    const mdFiles = entries
      .filter((f) => f.endsWith(".md"))
      .sort((a, b) => b.localeCompare(a)); // newest first

    for (const file of mdFiles) {
      if (results.length >= MAX_ARCHIVED_RESULTS) break; // BOUND

      try {
        const noteDate = getNoteDateFromFilename(file);
        const dateStr = noteDate
          ? noteDate.toISOString().slice(0, 10)
          : file.slice(0, 10); // best-effort fallback

        const content = fs.readFileSync(path.join(ARCHIVE_DIR, file), "utf-8");

        // Keyword filter
        if (keyword && !content.toLowerCase().includes(keyword)) continue;

        results.push({
          date: dateStr,
          content,
          weight: DECAY_WEIGHT_ARCHIVED,
        });
      } catch {
        // ERROR_BOUNDARY: skip unreadable files
        continue;
      }
    }
  } catch {
    // ERROR_BOUNDARY: archive dir read failure
    return [];
  }

  return results;
}

/**
 * Returns the decay weight for a given date string.
 * Recent notes (within decay window) get 1.0, archived get 0.3.
 * On parse error, returns DECAY_WEIGHT_RECENT as a fail-safe.
 */
export function getDecayWeight(dateStr: string): number {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return DECAY_WEIGHT_RECENT;
    return ageDays(date) > getDecayDays()
      ? DECAY_WEIGHT_ARCHIVED
      : DECAY_WEIGHT_RECENT;
  } catch {
    return DECAY_WEIGHT_RECENT; // fail-safe: treat as recent
  }
}

/**
 * Returns summary statistics about notes and archive state.
 */
export function getDecayStats(): {
  totalNotes: number;
  archivedNotes: number;
  recentNotes: number;
  oldestNote: string | null;
  newestNote: string | null;
} {
  let recentNotes = 0;
  let archivedNotes = 0;
  let oldestNote: string | null = null;
  let newestNote: string | null = null;

  // Count recent notes
  try {
    if (fs.existsSync(NOTES_DIR)) {
      const files = fs
        .readdirSync(NOTES_DIR)
        .filter((f) => f.endsWith(".md"))
        .sort();
      recentNotes = files.length;

      if (files.length > 0) {
        const oldestDate = getNoteDateFromFilename(files[0]);
        const newestDate = getNoteDateFromFilename(files[files.length - 1]);
        if (oldestDate) oldestNote = oldestDate.toISOString().slice(0, 10);
        if (newestDate) newestNote = newestDate.toISOString().slice(0, 10);
      }
    }
  } catch {
    // ERROR_BOUNDARY
  }

  // Count archived notes
  try {
    if (fs.existsSync(ARCHIVE_DIR)) {
      const archiveFiles = fs
        .readdirSync(ARCHIVE_DIR)
        .filter((f) => f.endsWith(".md"))
        .sort();
      archivedNotes = archiveFiles.length;

      // Extend oldest/newest to include archive
      if (archiveFiles.length > 0) {
        const archiveOldest = getNoteDateFromFilename(archiveFiles[0]);
        const archiveNewest = getNoteDateFromFilename(
          archiveFiles[archiveFiles.length - 1]
        );

        if (archiveOldest) {
          const archiveOldestStr = archiveOldest.toISOString().slice(0, 10);
          if (!oldestNote || archiveOldestStr < oldestNote) {
            oldestNote = archiveOldestStr;
          }
        }
        if (archiveNewest) {
          const archiveNewestStr = archiveNewest.toISOString().slice(0, 10);
          if (!newestNote || archiveNewestStr > newestNote) {
            newestNote = archiveNewestStr;
          }
        }
      }
    }
  } catch {
    // ERROR_BOUNDARY
  }

  return {
    totalNotes: recentNotes + archivedNotes,
    archivedNotes,
    recentNotes,
    oldestNote,
    newestNote,
  };
}
