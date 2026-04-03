/**
 * Workspace Tools — Agent file management for persistent workspace artifacts.
 *
 * Agents use these tools to read, write, and organize workspace files:
 * skills, rules, tasks, research resources, notes, and media.
 *
 * Local-first: writes to ~/.nodebench/workspace/<folder>/<file>
 * Convex sync: best-effort background sync when available.
 *
 * 6 tools:
 * - write_workspace_file: Create/update a file in the workspace
 * - read_workspace_file: Read file content from workspace
 * - list_workspace: List files in a workspace folder
 * - create_workspace_folder: Create a subfolder
 * - save_research_resource: Append a research resource with citation
 * - manage_task_list: CRUD on the workspace task list
 */

import type { McpTool } from "../types.js";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

// ── Constants ────────────────────────────────────────────────────────────

const WORKSPACE_ROOT = path.join(os.homedir(), ".nodebench", "workspace");
const VALID_FOLDERS = new Set(["skills", "rules", "tasks", "research", "notes", "media"]);
const MAX_DEPTH = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TASK_COUNT = 500;

// ── Platform sync (fire-and-forget) ──────────────────────────────────────

async function syncToplatform(folder: string, filename: string, content?: string, subfolder?: string): Promise<void> {
  const apiUrl = process.env.NODEBENCH_API_URL ?? "https://www.nodebenchai.com";
  await fetch(`${apiUrl}/api/workspace/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder,
      filename,
      content: content?.slice(0, 50000),
      subfolder,
    }),
    signal: AbortSignal.timeout(5000),
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────

function ensureWorkspace(): void {
  for (const folder of VALID_FOLDERS) {
    const dir = path.join(WORKSPACE_ROOT, folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  // Bootstrap default files if missing
  const tasksFile = path.join(WORKSPACE_ROOT, "tasks", "tasks.json");
  if (!fs.existsSync(tasksFile)) {
    fs.writeFileSync(tasksFile, JSON.stringify({ tasks: [], lastUpdated: new Date().toISOString() }, null, 2));
  }
  const resourcesFile = path.join(WORKSPACE_ROOT, "research", "resources.jsonl");
  if (!fs.existsSync(resourcesFile)) {
    fs.writeFileSync(resourcesFile, "");
  }
}

function validateWorkspacePath(inputPath: string): string {
  // Normalize and resolve
  const normalized = path.normalize(inputPath).replace(/\\/g, "/");
  // Block traversal
  if (normalized.includes("..") || normalized.startsWith("/") || normalized.startsWith("~")) {
    throw new Error(`Path traversal blocked: ${inputPath}`);
  }
  // Check depth
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length > MAX_DEPTH + 1) { // +1 for filename
    throw new Error(`Max folder depth is ${MAX_DEPTH}: ${inputPath}`);
  }
  // Validate root folder
  if (parts.length > 0 && !VALID_FOLDERS.has(parts[0])) {
    throw new Error(`Invalid workspace folder "${parts[0]}". Valid: ${[...VALID_FOLDERS].join(", ")}`);
  }
  const resolved = path.join(WORKSPACE_ROOT, normalized);
  // Ensure still under workspace root
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error(`Path escapes workspace: ${inputPath}`);
  }
  return resolved;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const types: Record<string, string> = {
    ".md": "markdown", ".txt": "text", ".json": "json", ".jsonl": "jsonl",
    ".yaml": "yaml", ".yml": "yaml", ".csv": "csv", ".tsv": "tsv",
    ".png": "image", ".jpg": "image", ".jpeg": "image", ".gif": "image",
    ".webp": "image", ".svg": "image", ".ico": "image",
    ".mp4": "video", ".webm": "video", ".mov": "video", ".avi": "video",
    ".mp3": "audio", ".wav": "audio", ".ogg": "audio", ".m4a": "audio",
    ".pdf": "document", ".docx": "document", ".pptx": "document", ".xlsx": "spreadsheet",
    ".ts": "code", ".tsx": "code", ".js": "code", ".py": "code", ".rs": "code",
    ".html": "code", ".css": "code",
  };
  return types[ext] ?? "file";
}

// ── Task types ───────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  priority: "high" | "medium" | "low";
  due?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface TaskList {
  tasks: Task[];
  lastUpdated: string;
}

function loadTasks(): TaskList {
  const tasksPath = path.join(WORKSPACE_ROOT, "tasks", "tasks.json");
  if (!fs.existsSync(tasksPath)) return { tasks: [], lastUpdated: new Date().toISOString() };
  try {
    return JSON.parse(fs.readFileSync(tasksPath, "utf-8"));
  } catch {
    return { tasks: [], lastUpdated: new Date().toISOString() };
  }
}

function saveTasks(taskList: TaskList): void {
  taskList.lastUpdated = new Date().toISOString();
  const tasksPath = path.join(WORKSPACE_ROOT, "tasks", "tasks.json");
  fs.writeFileSync(tasksPath, JSON.stringify(taskList, null, 2));
}

// ── Research resource types ──────────────────────────────────────────────

interface ResearchResource {
  id: string;
  title: string;
  url: string;
  source: string;
  notes?: string;
  tags: string[];
  citation?: string;
  savedAt: string;
}

// ── Implementation packet types ──────────────────────────────────────────

interface ImplementationPacket {
  id: string;
  objective: string;
  whyNow: string;
  scope: string[];
  constraints: string[];
  successCriteria: string[];
  validation: string[];
  context: string;
  status: "draft" | "approved" | "executing" | "validating" | "completed" | "failed";
  agentType: "claude_code" | "manual" | "subagent";
  priority: "low" | "medium" | "high" | "critical";
  result?: { filesChanged: string[]; testsPassed: boolean; diffSummary: string; costUsd: number; durationMs: number };
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface ImplementationPacketList {
  packets: ImplementationPacket[];
  lastUpdated: string;
}

function loadImplementationPackets(): ImplementationPacketList {
  const p = path.join(WORKSPACE_ROOT, "tasks", "implementations.json");
  if (!fs.existsSync(p)) return { packets: [], lastUpdated: new Date().toISOString() };
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); }
  catch { return { packets: [], lastUpdated: new Date().toISOString() }; }
}

function saveImplementationPackets(list: ImplementationPacketList): void {
  list.lastUpdated = new Date().toISOString();
  const p = path.join(WORKSPACE_ROOT, "tasks", "implementations.json");
  fs.writeFileSync(p, JSON.stringify(list, null, 2));
}

// ── Tools ────────────────────────────────────────────────────────────────

export const workspaceTools: McpTool[] = [

  // ─── Tool 1: write_workspace_file ──────────────────────────────────────
  {
    name: "write_workspace_file",
    description:
      "Create or update a file in the agent workspace (~/.nodebench/workspace/). " +
      "Use this to persist skills, rules, research notes, or any artifact the agent needs across sessions. " +
      "Folders: skills, rules, tasks, research, notes, media. " +
      "For media files, provide mediaSourcePath to copy from a local path.",
    inputSchema: {
      type: "object",
      properties: {
        folder: {
          type: "string",
          enum: ["skills", "rules", "tasks", "research", "notes", "media"],
          description: "Workspace folder to write to",
        },
        filename: {
          type: "string",
          description: "Filename including extension (e.g. 'competitor-analysis.md', 'soul.md')",
        },
        content: {
          type: "string",
          description: "File content (text/markdown/json). Omit for media files.",
        },
        subfolder: {
          type: "string",
          description: "Optional subfolder within the workspace folder (e.g. 'anthropic' within research/)",
        },
        mediaSourcePath: {
          type: "string",
          description: "For media: absolute path to source file to copy into workspace",
        },
      },
      required: ["folder", "filename"],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureWorkspace();
      const folder = String(args.folder ?? "notes");
      const filename = String(args.filename ?? "untitled.md");
      const content = args.content != null ? String(args.content) : undefined;
      const subfolder = args.subfolder ? String(args.subfolder) : undefined;
      const mediaSourcePath = args.mediaSourcePath ? String(args.mediaSourcePath) : undefined;

      const relPath = subfolder ? path.join(folder, subfolder, filename) : path.join(folder, filename);
      const fullPath = validateWorkspacePath(relPath);

      // Ensure parent directory exists
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (mediaSourcePath) {
        // Copy media file
        if (!fs.existsSync(mediaSourcePath)) {
          return { success: false, error: `Source file not found: ${mediaSourcePath}` };
        }
        const stat = fs.statSync(mediaSourcePath);
        if (stat.size > MAX_FILE_SIZE) {
          return { success: false, error: `File too large (${formatFileSize(stat.size)}). Max: ${formatFileSize(MAX_FILE_SIZE)}` };
        }
        await fsp.copyFile(mediaSourcePath, fullPath);
        const fileType = getFileType(filename);
        return {
          success: true,
          path: fullPath,
          relativePath: relPath,
          size: formatFileSize(stat.size),
          type: fileType,
          action: fs.existsSync(fullPath) ? "updated" : "created",
        };
      }

      if (content === undefined) {
        return { success: false, error: "Either content or mediaSourcePath is required" };
      }

      // Check size
      const contentBytes = Buffer.byteLength(content, "utf-8");
      if (contentBytes > MAX_FILE_SIZE) {
        return { success: false, error: `Content too large (${formatFileSize(contentBytes)}). Max: ${formatFileSize(MAX_FILE_SIZE)}` };
      }

      const existed = fs.existsSync(fullPath);
      await fsp.writeFile(fullPath, content, "utf-8");

      // Fire-and-forget sync to platform (best-effort, never blocks)
      syncToplatform(folder, filename, content, subfolder).catch(() => {});

      return {
        success: true,
        path: fullPath,
        relativePath: relPath,
        size: formatFileSize(contentBytes),
        type: getFileType(filename),
        action: existed ? "updated" : "created",
      };
    },
  },

  // ─── Tool 2: read_workspace_file ───────────────────────────────────────
  {
    name: "read_workspace_file",
    description:
      "Read a file from the agent workspace. Returns content for text files, metadata for media files.",
    inputSchema: {
      type: "object",
      properties: {
        folder: {
          type: "string",
          enum: ["skills", "rules", "tasks", "research", "notes", "media"],
          description: "Workspace folder",
        },
        filename: {
          type: "string",
          description: "Filename to read",
        },
        subfolder: {
          type: "string",
          description: "Optional subfolder path",
        },
      },
      required: ["folder", "filename"],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureWorkspace();
      const folder = String(args.folder ?? "notes");
      const filename = String(args.filename ?? "");
      const subfolder = args.subfolder ? String(args.subfolder) : undefined;

      const relPath = subfolder ? path.join(folder, subfolder, filename) : path.join(folder, filename);
      const fullPath = validateWorkspacePath(relPath);

      if (!fs.existsSync(fullPath)) {
        return { success: false, error: `File not found: ${relPath}` };
      }

      const stat = fs.statSync(fullPath);
      const fileType = getFileType(filename);

      // For media/binary files, return metadata only
      if (["image", "video", "audio", "document", "spreadsheet"].includes(fileType)) {
        return {
          success: true,
          path: fullPath,
          relativePath: relPath,
          type: fileType,
          size: formatFileSize(stat.size),
          modified: stat.mtime.toISOString(),
          note: "Binary file — use appropriate viewer to inspect content",
        };
      }

      // Text-based files — read content
      const content = await fsp.readFile(fullPath, "utf-8");
      return {
        success: true,
        path: fullPath,
        relativePath: relPath,
        type: fileType,
        size: formatFileSize(stat.size),
        modified: stat.mtime.toISOString(),
        content,
        lineCount: content.split("\n").length,
      };
    },
  },

  // ─── Tool 3: list_workspace ────────────────────────────────────────────
  {
    name: "list_workspace",
    description:
      "List files in the agent workspace. Shows folder tree with file sizes and dates. " +
      "Call without folder to see all workspace folders. Call with folder to list its contents.",
    inputSchema: {
      type: "object",
      properties: {
        folder: {
          type: "string",
          enum: ["skills", "rules", "tasks", "research", "notes", "media"],
          description: "Specific folder to list (omit for workspace overview)",
        },
        pattern: {
          type: "string",
          description: "Optional filename filter (substring match, e.g. '*.md' or 'competitor')",
        },
      },
    },
    handler: async (args: Record<string, unknown>) => {
      ensureWorkspace();
      const folder = args.folder ? String(args.folder) : undefined;
      const pattern = args.pattern ? String(args.pattern).toLowerCase() : undefined;

      if (!folder) {
        // Overview: list all folders with file counts
        const overview: Array<{ folder: string; fileCount: number; totalSize: string }> = [];
        for (const f of VALID_FOLDERS) {
          const dir = path.join(WORKSPACE_ROOT, f);
          if (!fs.existsSync(dir)) continue;
          const files = listFilesRecursive(dir);
          const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
          overview.push({ folder: f, fileCount: files.length, totalSize: formatFileSize(totalBytes) });
        }
        return { success: true, workspace: WORKSPACE_ROOT, folders: overview };
      }

      const dir = validateWorkspacePath(folder);
      if (!fs.existsSync(dir)) {
        return { success: true, folder, files: [], message: "Folder is empty" };
      }

      let files = listFilesRecursive(dir);
      if (pattern) {
        const pat = pattern.replace(/\*/g, "");
        files = files.filter(f => f.name.toLowerCase().includes(pat));
      }

      return {
        success: true,
        folder,
        path: dir,
        fileCount: files.length,
        files: files.slice(0, 100).map(f => ({
          name: f.name,
          relativePath: f.relativePath,
          type: getFileType(f.name),
          size: formatFileSize(f.size),
          modified: f.modified,
        })),
        truncated: files.length > 100,
      };
    },
  },

  // ─── Tool 4: create_workspace_folder ───────────────────────────────────
  {
    name: "create_workspace_folder",
    description:
      "Create a subfolder within a workspace folder. Max 3 levels deep. " +
      "Example: create_workspace_folder({folder: 'research', subfolder: 'anthropic/funding'})",
    inputSchema: {
      type: "object",
      properties: {
        folder: {
          type: "string",
          enum: ["skills", "rules", "tasks", "research", "notes", "media"],
          description: "Parent workspace folder",
        },
        subfolder: {
          type: "string",
          description: "Subfolder path to create (e.g. 'anthropic/funding')",
        },
      },
      required: ["folder", "subfolder"],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureWorkspace();
      const folder = String(args.folder ?? "notes");
      const subfolder = String(args.subfolder ?? "");

      const relPath = path.join(folder, subfolder);
      const fullPath = validateWorkspacePath(relPath);

      if (fs.existsSync(fullPath)) {
        return { success: true, path: fullPath, relativePath: relPath, action: "already_exists" };
      }

      fs.mkdirSync(fullPath, { recursive: true });
      return { success: true, path: fullPath, relativePath: relPath, action: "created" };
    },
  },

  // ─── Tool 5: save_research_resource ────────────────────────────────────
  {
    name: "save_research_resource",
    description:
      "Save a research resource with URL, source citation, tags, and notes. " +
      "Resources are appended to ~/.nodebench/workspace/research/resources.jsonl for easy tracking. " +
      "Use this to build a research bibliography during investigation runs.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Resource title (article name, paper title, etc.)" },
        url: { type: "string", description: "URL of the resource" },
        source: { type: "string", description: "Source domain or publication (e.g. 'arxiv', 'TechCrunch', 'SEC filing')" },
        notes: { type: "string", description: "Your notes on why this resource matters" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for categorization (e.g. ['AI', 'funding', 'competitor'])",
        },
        citation: { type: "string", description: "Formal citation string if available" },
      },
      required: ["title", "url", "source"],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureWorkspace();
      const resource: ResearchResource = {
        id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: String(args.title ?? "Untitled"),
        url: String(args.url ?? ""),
        source: String(args.source ?? "unknown"),
        notes: args.notes ? String(args.notes) : undefined,
        tags: Array.isArray(args.tags) ? args.tags.map(String) : [],
        citation: args.citation ? String(args.citation) : undefined,
        savedAt: new Date().toISOString(),
      };

      const resourcesPath = path.join(WORKSPACE_ROOT, "research", "resources.jsonl");
      await fsp.appendFile(resourcesPath, JSON.stringify(resource) + "\n", "utf-8");

      // Count total resources
      const content = await fsp.readFile(resourcesPath, "utf-8");
      const totalCount = content.trim().split("\n").filter(Boolean).length;

      return {
        success: true,
        resource,
        totalResources: totalCount,
        path: resourcesPath,
      };
    },
  },

  // ─── Tool 6: manage_task_list ──────────────────────────────────────────
  {
    name: "manage_task_list",
    description:
      "Manage the workspace task list. Add, update, complete, delete, or list tasks. " +
      "Tasks persist in ~/.nodebench/workspace/tasks/tasks.json across sessions. " +
      "Use this to track research goals, action items, and follow-ups.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["add", "update", "complete", "delete", "list"],
          description: "Action to perform",
        },
        task: {
          type: "object",
          properties: {
            title: { type: "string" },
            priority: { type: "string", enum: ["high", "medium", "low"] },
            status: { type: "string", enum: ["todo", "in_progress", "done", "blocked"] },
            due: { type: "string", description: "Due date (ISO format or natural: 'tomorrow', 'next week')" },
            notes: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
          },
          description: "Task data (for add/update)",
        },
        taskId: { type: "string", description: "Task ID (for update/complete/delete)" },
        filter: {
          type: "string",
          enum: ["all", "todo", "in_progress", "done", "blocked", "high", "overdue"],
          description: "Filter for list action",
        },
      },
      required: ["action"],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureWorkspace();
      const action = String(args.action ?? "list");
      const taskData = args.task as Record<string, unknown> | undefined;
      const taskId = args.taskId ? String(args.taskId) : undefined;
      const filter = args.filter ? String(args.filter) : "all";

      const taskList = loadTasks();

      switch (action) {
        case "add": {
          if (!taskData?.title) return { success: false, error: "Task title is required" };
          if (taskList.tasks.length >= MAX_TASK_COUNT) {
            return { success: false, error: `Task limit reached (${MAX_TASK_COUNT}). Complete or delete existing tasks.` };
          }
          const now = new Date().toISOString();
          const newTask: Task = {
            id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            title: String(taskData.title),
            status: (taskData.status as Task["status"]) ?? "todo",
            priority: (taskData.priority as Task["priority"]) ?? "medium",
            due: taskData.due ? String(taskData.due) : undefined,
            notes: taskData.notes ? String(taskData.notes) : undefined,
            tags: Array.isArray(taskData.tags) ? taskData.tags.map(String) : undefined,
            createdAt: now,
            updatedAt: now,
          };
          taskList.tasks.push(newTask);
          saveTasks(taskList);
          return { success: true, action: "added", task: newTask, totalTasks: taskList.tasks.length };
        }

        case "update": {
          if (!taskId) return { success: false, error: "taskId is required for update" };
          const idx = taskList.tasks.findIndex(t => t.id === taskId);
          if (idx === -1) return { success: false, error: `Task not found: ${taskId}` };
          const existing = taskList.tasks[idx];
          if (taskData) {
            if (taskData.title) existing.title = String(taskData.title);
            if (taskData.status) existing.status = taskData.status as Task["status"];
            if (taskData.priority) existing.priority = taskData.priority as Task["priority"];
            if (taskData.due !== undefined) existing.due = taskData.due ? String(taskData.due) : undefined;
            if (taskData.notes !== undefined) existing.notes = taskData.notes ? String(taskData.notes) : undefined;
            if (taskData.tags) existing.tags = Array.isArray(taskData.tags) ? taskData.tags.map(String) : undefined;
          }
          existing.updatedAt = new Date().toISOString();
          taskList.tasks[idx] = existing;
          saveTasks(taskList);
          return { success: true, action: "updated", task: existing };
        }

        case "complete": {
          if (!taskId) return { success: false, error: "taskId is required for complete" };
          const idx = taskList.tasks.findIndex(t => t.id === taskId);
          if (idx === -1) return { success: false, error: `Task not found: ${taskId}` };
          taskList.tasks[idx].status = "done";
          taskList.tasks[idx].updatedAt = new Date().toISOString();
          saveTasks(taskList);
          return { success: true, action: "completed", task: taskList.tasks[idx] };
        }

        case "delete": {
          if (!taskId) return { success: false, error: "taskId is required for delete" };
          const idx = taskList.tasks.findIndex(t => t.id === taskId);
          if (idx === -1) return { success: false, error: `Task not found: ${taskId}` };
          const removed = taskList.tasks.splice(idx, 1)[0];
          saveTasks(taskList);
          return { success: true, action: "deleted", task: removed, totalTasks: taskList.tasks.length };
        }

        case "list": {
          let filtered = taskList.tasks;
          if (filter === "todo") filtered = filtered.filter(t => t.status === "todo");
          else if (filter === "in_progress") filtered = filtered.filter(t => t.status === "in_progress");
          else if (filter === "done") filtered = filtered.filter(t => t.status === "done");
          else if (filter === "blocked") filtered = filtered.filter(t => t.status === "blocked");
          else if (filter === "high") filtered = filtered.filter(t => t.priority === "high");
          else if (filter === "overdue") {
            const now = Date.now();
            filtered = filtered.filter(t => t.due && new Date(t.due).getTime() < now && t.status !== "done");
          }
          const counts = {
            total: taskList.tasks.length,
            todo: taskList.tasks.filter(t => t.status === "todo").length,
            inProgress: taskList.tasks.filter(t => t.status === "in_progress").length,
            done: taskList.tasks.filter(t => t.status === "done").length,
            blocked: taskList.tasks.filter(t => t.status === "blocked").length,
          };
          return { success: true, tasks: filtered, counts, lastUpdated: taskList.lastUpdated };
        }

        default:
          return { success: false, error: `Unknown action: ${action}. Use: add, update, complete, delete, list` };
      }
    },
  },

  // ─── Tool 7: manage_implementation_packets ─────────────────────────────
  {
    name: "manage_implementation_packets",
    description:
      "Create and manage implementation packets — structured instructions for Claude Code or other coding agents. " +
      "Each packet defines WHAT to build, WHY now, scope, constraints, success criteria, and validation checks. " +
      "NodeBench creates the packet (intelligence layer), Claude Code executes it (implementation layer).",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "approve", "execute", "complete", "fail", "list"],
          description: "Action to perform",
        },
        packet: {
          type: "object",
          properties: {
            objective: { type: "string", description: "What to build or change" },
            whyNow: { type: "string", description: "Why this matters right now" },
            scope: { type: "array", items: { type: "string" }, description: "File paths or areas to touch" },
            constraints: { type: "array", items: { type: "string" }, description: "What NOT to do" },
            successCriteria: { type: "array", items: { type: "string" }, description: "How to know it worked" },
            validation: { type: "array", items: { type: "string" }, description: "Checks to run after (tests, lint, etc.)" },
            context: { type: "string", description: "Synthesized context from NodeBench search" },
            agentType: { type: "string", enum: ["claude_code", "manual", "subagent"], description: "Who executes this" },
            priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
          },
          description: "Packet data (for create)",
        },
        packetId: { type: "string", description: "Packet ID (for approve/execute/complete/fail)" },
        result: {
          type: "object",
          properties: {
            filesChanged: { type: "array", items: { type: "string" } },
            testsPassed: { type: "boolean" },
            diffSummary: { type: "string" },
            costUsd: { type: "number" },
            durationMs: { type: "number" },
          },
          description: "Execution result (for complete)",
        },
        errorMessage: { type: "string", description: "Error reason (for fail)" },
        filter: { type: "string", enum: ["all", "draft", "approved", "executing", "completed", "failed"], description: "Filter for list" },
      },
      required: ["action"],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureWorkspace();
      const action = String(args.action ?? "list");
      const packetData = args.packet as Record<string, unknown> | undefined;
      const packetId = args.packetId ? String(args.packetId) : undefined;
      const resultData = args.result as Record<string, unknown> | undefined;
      const errorMessage = args.errorMessage ? String(args.errorMessage) : undefined;
      const filter = args.filter ? String(args.filter) : "all";

      const packets = loadImplementationPackets();

      switch (action) {
        case "create": {
          if (!packetData?.objective) return { success: false, error: "objective is required" };
          if (packets.packets.length >= 200) return { success: false, error: "Packet limit (200) reached. Complete or delete existing packets." };
          const now = new Date().toISOString();
          const newPacket: ImplementationPacket = {
            id: `impl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            objective: String(packetData.objective),
            whyNow: packetData.whyNow ? String(packetData.whyNow) : "",
            scope: Array.isArray(packetData.scope) ? packetData.scope.map(String) : [],
            constraints: Array.isArray(packetData.constraints) ? packetData.constraints.map(String) : [],
            successCriteria: Array.isArray(packetData.successCriteria) ? packetData.successCriteria.map(String) : [],
            validation: Array.isArray(packetData.validation) ? packetData.validation.map(String) : ["npx tsc --noEmit", "npx vite build"],
            context: packetData.context ? String(packetData.context) : "",
            status: "draft",
            agentType: (packetData.agentType as ImplementationPacket["agentType"]) ?? "claude_code",
            priority: (packetData.priority as ImplementationPacket["priority"]) ?? "medium",
            createdAt: now,
            updatedAt: now,
          };
          packets.packets.push(newPacket);
          saveImplementationPackets(packets);
          syncToplatform("tasks", "implementations.json", JSON.stringify(packets, null, 2)).catch(() => {});
          return { success: true, action: "created", packet: newPacket, totalPackets: packets.packets.length };
        }

        case "approve": {
          if (!packetId) return { success: false, error: "packetId required" };
          const idx = packets.packets.findIndex(p => p.id === packetId);
          if (idx === -1) return { success: false, error: `Packet not found: ${packetId}` };
          if (packets.packets[idx].status !== "draft") return { success: false, error: `Can only approve draft packets (current: ${packets.packets[idx].status})` };
          packets.packets[idx].status = "approved";
          packets.packets[idx].updatedAt = new Date().toISOString();
          saveImplementationPackets(packets);
          return { success: true, action: "approved", packet: packets.packets[idx] };
        }

        case "execute": {
          if (!packetId) return { success: false, error: "packetId required" };
          const idx = packets.packets.findIndex(p => p.id === packetId);
          if (idx === -1) return { success: false, error: `Packet not found: ${packetId}` };
          if (packets.packets[idx].status !== "approved") return { success: false, error: `Can only execute approved packets (current: ${packets.packets[idx].status})` };
          packets.packets[idx].status = "executing";
          packets.packets[idx].updatedAt = new Date().toISOString();
          saveImplementationPackets(packets);
          return { success: true, action: "executing", packet: packets.packets[idx] };
        }

        case "complete": {
          if (!packetId) return { success: false, error: "packetId required" };
          const idx = packets.packets.findIndex(p => p.id === packetId);
          if (idx === -1) return { success: false, error: `Packet not found: ${packetId}` };
          packets.packets[idx].status = "completed";
          packets.packets[idx].updatedAt = new Date().toISOString();
          if (resultData) {
            packets.packets[idx].result = {
              filesChanged: Array.isArray(resultData.filesChanged) ? resultData.filesChanged.map(String) : [],
              testsPassed: resultData.testsPassed === true,
              diffSummary: resultData.diffSummary ? String(resultData.diffSummary) : "",
              costUsd: typeof resultData.costUsd === "number" ? resultData.costUsd : 0,
              durationMs: typeof resultData.durationMs === "number" ? resultData.durationMs : 0,
            };
          }
          saveImplementationPackets(packets);
          return { success: true, action: "completed", packet: packets.packets[idx] };
        }

        case "fail": {
          if (!packetId) return { success: false, error: "packetId required" };
          const idx = packets.packets.findIndex(p => p.id === packetId);
          if (idx === -1) return { success: false, error: `Packet not found: ${packetId}` };
          packets.packets[idx].status = "failed";
          packets.packets[idx].errorMessage = errorMessage;
          packets.packets[idx].updatedAt = new Date().toISOString();
          saveImplementationPackets(packets);
          return { success: true, action: "failed", packet: packets.packets[idx] };
        }

        case "list": {
          let filtered = packets.packets;
          if (filter !== "all") filtered = filtered.filter(p => p.status === filter);
          const counts = {
            total: packets.packets.length,
            draft: packets.packets.filter(p => p.status === "draft").length,
            approved: packets.packets.filter(p => p.status === "approved").length,
            executing: packets.packets.filter(p => p.status === "executing").length,
            completed: packets.packets.filter(p => p.status === "completed").length,
            failed: packets.packets.filter(p => p.status === "failed").length,
          };
          return { success: true, packets: filtered, counts, lastUpdated: packets.lastUpdated };
        }

        default:
          return { success: false, error: `Unknown action: ${action}. Use: create, approve, execute, complete, fail, list` };
      }
    },
  },
];

// ── Helper: recursive file listing ───────────────────────────────────────

interface FileEntry {
  name: string;
  relativePath: string;
  size: number;
  modified: string;
  isDirectory: boolean;
}

function listFilesRecursive(dir: string, baseDir?: string): FileEntry[] {
  const base = baseDir ?? dir;
  const entries: FileEntry[] = [];

  if (!fs.existsSync(dir)) return entries;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(base, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      entries.push({ name: entry.name, relativePath, size: 0, modified: "", isDirectory: true });
      entries.push(...listFilesRecursive(fullPath, base));
    } else {
      try {
        const stat = fs.statSync(fullPath);
        entries.push({
          name: entry.name,
          relativePath,
          size: stat.size,
          modified: stat.mtime.toISOString(),
          isDirectory: false,
        });
      } catch { /* skip unreadable files */ }
    }
  }

  return entries;
}
