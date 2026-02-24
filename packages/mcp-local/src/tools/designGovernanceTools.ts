/**
 * Design Governance Tools — Automated design spec enforcement for MCP agents.
 *
 * Provides three tools for agents to query the design system spec, check
 * individual files for compliance, and scan an entire src/ tree for violations.
 *
 * Patterns are inlined (not imported from the frontend src/ directory) because
 * this is a CommonJS-ish Node.js MCP server that can't reach into the
 * frontend build.  The canonical source of truth is:
 *   - src/design-governance/defaultSpec.ts
 *   - scripts/ui/designLinter.mjs
 * Keep this file in sync when updating banned patterns.
 *
 * 3 tools:
 * - get_design_spec: Return the full governance spec as structured JSON
 * - check_design_compliance: Lint a single file for violations
 * - get_design_violations: Scan entire src/ tree, grouped + sorted
 */

import { readFile, readdir } from "node:fs/promises";
import * as path from "node:path";
import type { McpTool } from "../types.js";

// ── Types ───────────────────────────────────────────────────────────────────

interface BannedPatternDef {
  pattern: RegExp;
  label: string;
  severity: "high" | "medium" | "low";
  category: "color" | "typography" | "layout" | "states" | "focus" | "button";
  fix: string;
  excludeFiles: string[];
}

interface Violation {
  file: string;
  line: number;
  match: string;
  label: string;
  severity: "high" | "medium" | "low";
  category: string;
  fix: string;
}

// ── Config Excludes ─────────────────────────────────────────────────────────

const CONFIG_EXCLUDES = [
  "index.css",
  "tailwind.config",
  ".stories.",
  ".test.",
  ".spec.",
  "__tests__",
  "design-governance",
  "node_modules",
];

// ── Banned Patterns (inlined) ───────────────────────────────────────────────

const BANNED_PATTERNS: BannedPatternDef[] = [
  // ── Color: saturated backgrounds ──
  {
    pattern: /\bbg-(red|orange|amber|yellow|green|blue|indigo|violet|purple|pink|emerald|teal|cyan|lime|rose|fuchsia|sky)-(50|100|200|300|400|500|600|700|800|900|950)\b/g,
    label: "Saturated bg color (use bg-surface variants)",
    severity: "medium",
    category: "color",
    fix: "Replace with bg-surface, bg-surface-secondary, or bg-surface-hover",
    excludeFiles: CONFIG_EXCLUDES,
  },
  // ── Color: saturated text ──
  {
    pattern: /\btext-(red|orange|amber|yellow|green|blue|indigo|violet|purple|pink|emerald|teal|cyan|lime|rose|fuchsia|sky)-(50|100|200|300|400|500|600|700|800|900|950)\b/g,
    label: "Saturated text color (use text-content variants)",
    severity: "medium",
    category: "color",
    fix: "Replace with text-content, text-content-secondary, or text-content-muted",
    excludeFiles: CONFIG_EXCLUDES,
  },
  // ── Color: raw gray bg ──
  {
    pattern: /\bbg-gray-(50|100|200|300|400|500|600|700|800|900|950)\b/g,
    label: "bg-gray-* (use bg-surface variants)",
    severity: "medium",
    category: "color",
    fix: "bg-gray-50/100 -> bg-surface-secondary, bg-gray-200 -> bg-surface-hover",
    excludeFiles: CONFIG_EXCLUDES,
  },
  // ── Color: raw gray text ──
  {
    pattern: /\btext-gray-(50|100|200|300|400|500|600|700|800|900|950)\b/g,
    label: "text-gray-* (use text-content variants)",
    severity: "medium",
    category: "color",
    fix: "text-gray-500/600 -> text-content-muted, text-gray-700/800 -> text-content-secondary",
    excludeFiles: CONFIG_EXCLUDES,
  },
  // ── Color: raw gray border ──
  {
    pattern: /\bborder-gray-(50|100|200|300|400|500|600|700|800|900|950)\b/g,
    label: "border-gray-* (use border-edge)",
    severity: "medium",
    category: "color",
    fix: "Replace with border-edge",
    excludeFiles: CONFIG_EXCLUDES,
  },
  // ── Color: decorative gradients ──
  {
    pattern: /\bfrom-(amber|orange|purple|pink|indigo|red|green|blue)-(50|100|200)\b/g,
    label: "Decorative gradient (use flat surface colors)",
    severity: "medium",
    category: "color",
    fix: "Remove gradient, use bg-surface or bg-surface-secondary",
    excludeFiles: CONFIG_EXCLUDES,
  },
  // ── Color: non-semantic bg-white ──
  {
    pattern: /\bbg-white\b(?!\/)/g,
    label: "bg-white (use bg-surface)",
    severity: "low",
    category: "color",
    fix: "Replace with bg-surface",
    excludeFiles: CONFIG_EXCLUDES,
  },
  // ── Color: hardcoded hex #f2f1ed ──
  {
    pattern: /#f2f1ed/gi,
    label: "Hardcoded hex #f2f1ed",
    severity: "high",
    category: "color",
    fix: "Use CSS variable or semantic token",
    excludeFiles: CONFIG_EXCLUDES,
  },

  // ── Focus: hardcoded indigo rings ──
  {
    pattern: /\bring-indigo-[0-9]+\b/g,
    label: "Hardcoded indigo focus ring (use ring-ring)",
    severity: "medium",
    category: "focus",
    fix: "Replace ring-indigo-500 with ring-ring (maps to --ring CSS var)",
    excludeFiles: CONFIG_EXCLUDES,
  },
  {
    pattern: /focus-visible:ring-indigo/g,
    label: "Focus ring using hardcoded indigo",
    severity: "medium",
    category: "focus",
    fix: "Use focus-visible:ring-ring",
    excludeFiles: CONFIG_EXCLUDES,
  },

  // ── Typography: ALL CAPS ──
  {
    pattern: /uppercase\s+tracking-widest/g,
    label: "ALL CAPS tracking-widest (use .type-label)",
    severity: "high",
    category: "typography",
    fix: "Replace with className='type-label'",
    excludeFiles: CONFIG_EXCLUDES,
  },
  // ── Typography: custom tracking ──
  {
    pattern: /tracking-\[0\.\d+em\]/g,
    label: "Custom tracking value (use type scale)",
    severity: "medium",
    category: "typography",
    fix: "Use .type-label (includes tracking-wider) or remove",
    excludeFiles: CONFIG_EXCLUDES,
  },
  // ── Typography: font-black ──
  {
    pattern: /\bfont-black\b/g,
    label: "font-black weight (max: font-bold)",
    severity: "low",
    category: "typography",
    fix: "Replace with font-bold or font-semibold",
    excludeFiles: CONFIG_EXCLUDES,
  },

  // ── Button: inline styling ──
  {
    pattern: /bg-indigo-600\s+text-white\s+.*rounded/g,
    label: "Inline button styling (use .btn-primary-sm)",
    severity: "low",
    category: "button",
    fix: "Replace inline styles with btn-primary-sm class",
    excludeFiles: CONFIG_EXCLUDES,
  },
];

// ── File-ignore patterns for directory walk ─────────────────────────────────

const FILE_IGNORE_PATTERNS: RegExp[] = [
  /node_modules/,
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
  /\.config\./,
  /tailwind\./,
  /__tests__/,
  /\.stories\./,
  /\.d\.ts$/,
  /design-governance/,
  /index\.css$/,
];

const DIR_SKIP = new Set([
  "node_modules",
  ".git",
  "dist",
  "__tests__",
  ".next",
  ".turbo",
]);

// ── The Full Design Spec (inlined) ──────────────────────────────────────────

const DESIGN_SPEC = {
  version: "1.0.0",
  lastUpdated: "2026-02-24",

  colorBudget: {
    maxDistinctPerRoute: 6,
    approvedSemanticColors: [
      "surface",
      "surface-secondary",
      "surface-hover",
      "content",
      "content-secondary",
      "content-muted",
      "edge",
      "primary",
      "primary-foreground",
      "secondary",
      "destructive",
      "muted",
      "muted-foreground",
      "accent",
      "background",
      "foreground",
      "card",
      "popover",
      "ring",
      "input",
      "border",
    ],
    accentFamily: "indigo",
    approvedAccentShades: [500, 600, 700],
    statusColors: {
      success: ["text-green-600", "dark:text-green-400"],
      warning: ["text-amber-600", "dark:text-amber-400"],
      error: ["text-red-600", "dark:text-red-400"],
      info: ["text-blue-600", "dark:text-blue-400"],
    },
  },

  typography: {
    contextClasses: {
      "page-title": ["type-page-title"],
      "section-heading": ["type-section-title"],
      "card-title": ["type-card-title"],
      body: ["type-body"],
      caption: ["type-caption"],
      label: ["type-label"],
    },
    fontFamilies: {
      ui: "Inter",
      code: "JetBrains Mono",
    },
    baseFontSize: "14px",
    uppercasePolicy: {
      allowedClasses: ["type-label"],
      allowedContexts: [
        "sidebar section labels (MENU, MORE, FILES)",
        "table column headers (<th>)",
      ],
      description:
        "Uppercase is only allowed in .type-label class (sidebar section labels) and table column headers. All section headings, card titles, stat labels, and badge text must be sentence case.",
    },
  },

  spacing: {
    approvedScale: [
      0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16,
      20, 24,
    ],
    sectionGap: "space-y-8",
    cardPadding: "p-4 sm:p-6",
    pageInnerPadding: "px-6 sm:px-8 lg:px-10 py-8",
  },

  components: {
    layoutPrimitives: {
      pageShell: "nb-page-shell",
      pageInner: "nb-page-inner",
      pageFrame: "nb-page-frame",
      pageFrameNarrow: "nb-page-frame-narrow",
      surfaceCard: "nb-surface-card",
    },
    buttonClasses: [
      "btn-primary-xs",
      "btn-primary-sm",
      "btn-ghost-sm",
      "btn-outline-sm",
    ],
    focusRing:
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
  },

  states: {
    requiredStates: ["loading", "empty", "error"],
    loadingComponents: ["ViewSkeleton", "SignatureOrb", "Skeleton"],
    emptyStateComponents: ["EmptyState", "SignatureOrb"],
  },

  motion: {
    maxConcurrentAnimations: 3,
    maxTransitionDuration: "500ms",
    reducedMotionRequired: true,
  },

  borderRadius: {
    card: "rounded-lg",
    button: "rounded-md",
    input: "rounded-md",
    container: "rounded-xl",
  },

  bannedPatterns: BANNED_PATTERNS.map((bp) => ({
    label: bp.label,
    severity: bp.severity,
    category: bp.category,
    fix: bp.fix,
    pattern: bp.pattern.source,
  })),
};

// ── Structural checks (view files) ─────────────────────────────────────────

function getStructuralViolations(
  content: string,
  relPath: string
): Violation[] {
  const violations: Violation[] = [];
  const isView = /views\/.*\.tsx$/.test(relPath);

  if (!isView) return violations;

  // Check for nb-page-shell usage
  if (!content.includes("nb-page-shell") && !content.includes("PageShell")) {
    violations.push({
      file: relPath,
      line: 1,
      match: "(file-level)",
      label: "View missing nb-page-shell layout primitive",
      severity: "high",
      category: "layout",
      fix: "Wrap view content in <div className='nb-page-shell'>",
    });
  }

  // Check for empty state handling
  const hasEmptyState =
    /EmptyState|empty.?state|SignatureOrb.*empty|no.?data|no.?items|no.?results|\.length\s*===?\s*0/i.test(
      content
    );
  if (!hasEmptyState) {
    violations.push({
      file: relPath,
      line: 1,
      match: "(file-level)",
      label: "View possibly missing empty state handling",
      severity: "medium",
      category: "states",
      fix: "Add EmptyState or SignatureOrb variant='empty' for when data is empty",
    });
  }

  // Check for loading state
  const hasLoading =
    /Skeleton|loading|isLoading|SignatureOrb.*loading|Suspense/i.test(content);
  if (!hasLoading) {
    violations.push({
      file: relPath,
      line: 1,
      match: "(file-level)",
      label: "View possibly missing loading state",
      severity: "medium",
      category: "states",
      fix: "Add ViewSkeleton or SignatureOrb variant='loading' for loading state",
    });
  }

  return violations;
}

// ── Pattern scanning for a single file ──────────────────────────────────────

function scanFileContent(
  content: string,
  relPath: string
): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split("\n");

  for (const bp of BANNED_PATTERNS) {
    // Check per-pattern excludeFiles
    if (bp.excludeFiles.some((exc) => relPath.includes(exc))) continue;

    for (let i = 0; i < lines.length; i++) {
      // Reset lastIndex for each line (regex is /g)
      bp.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = bp.pattern.exec(lines[i])) !== null) {
        violations.push({
          file: relPath,
          line: i + 1,
          match: match[0],
          label: bp.label,
          severity: bp.severity,
          category: bp.category,
          fix: bp.fix,
        });
      }
    }
  }

  // Structural violations
  const structural = getStructuralViolations(content, relPath);
  violations.push(...structural);

  return violations;
}

// ── Recursive directory walker ──────────────────────────────────────────────

async function walkSrcDir(dir: string, rootDir: string): Promise<string[]> {
  const files: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (DIR_SKIP.has(entry.name)) continue;
      const sub = await walkSrcDir(full, rootDir);
      files.push(...sub);
      continue;
    }

    // Only .tsx, .ts, .jsx, .js
    if (!/\.(tsx?|jsx?)$/.test(entry.name)) continue;

    const relPath = path.relative(rootDir, full).replace(/\\/g, "/");
    if (FILE_IGNORE_PATTERNS.some((p) => p.test(relPath))) continue;

    files.push(full);
  }

  return files;
}

// ── Severity ordering helper ────────────────────────────────────────────────

const SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortViolations(violations: Violation[]): Violation[] {
  return violations.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.file.localeCompare(b.file) ||
      a.line - b.line
  );
}

// ── Scoring helper ──────────────────────────────────────────────────────────

function computeScore(violations: Violation[]): number {
  let deductions = 0;
  for (const v of violations) {
    if (v.severity === "high") deductions += 10;
    else if (v.severity === "medium") deductions += 3;
    else deductions += 1;
  }
  return Math.max(0, 100 - deductions);
}

function computeStats(violations: Violation[]) {
  const high = violations.filter((v) => v.severity === "high").length;
  const medium = violations.filter((v) => v.severity === "medium").length;
  const low = violations.filter((v) => v.severity === "low").length;
  const byCategory: Record<string, number> = {};
  for (const v of violations) {
    byCategory[v.category] = (byCategory[v.category] || 0) + 1;
  }
  return { high, medium, low, byCategory, score: computeScore(violations) };
}

// ── Tools ───────────────────────────────────────────────────────────────────

export const designGovernanceTools: McpTool[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Tool 1: get_design_spec
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "get_design_spec",
    description:
      "Return the full design governance specification as structured JSON. Includes: approved semantic colors, typography classes and uppercase policy, component layout primitives, spacing scale, button classes, focus ring pattern, motion rules, border radius rules, and all banned patterns with fix suggestions. Use this before writing or modifying UI code to ensure compliance.",
    inputSchema: {
      type: "object",
      properties: {
        section: {
          type: "string",
          enum: [
            "all",
            "colorBudget",
            "typography",
            "spacing",
            "components",
            "states",
            "motion",
            "borderRadius",
            "bannedPatterns",
          ],
          description:
            "Which section to return (default 'all'). Use a specific section to reduce token usage.",
        },
      },
      required: [],
    },
    handler: async (args: { section?: string }) => {
      const section = args.section || "all";

      if (section === "all") {
        return DESIGN_SPEC;
      }

      const sectionData = (DESIGN_SPEC as Record<string, unknown>)[section];
      if (!sectionData) {
        return {
          error: `Unknown section '${section}'`,
          availableSections: Object.keys(DESIGN_SPEC),
        };
      }

      return { section, specVersion: DESIGN_SPEC.version, data: sectionData };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Tool 2: check_design_compliance
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "check_design_compliance",
    description:
      "Check a single .tsx/.ts file for design governance compliance. Runs all banned pattern checks (color, typography, focus, button) plus structural checks for view files (nb-page-shell, empty state, loading state). Returns violations array with line numbers, severity, fix suggestions, and a pass/fail summary. Use after editing UI files to verify compliance.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description:
            "Path to the .tsx/.ts file to check (absolute or relative to cwd)",
        },
      },
      required: ["filePath"],
    },
    handler: async (args: { filePath: string }) => {
      const resolved = path.isAbsolute(args.filePath)
        ? args.filePath
        : path.resolve(process.cwd(), args.filePath);

      let content: string;
      try {
        content = await readFile(resolved, "utf-8");
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to read file";
        return { error: msg, filePath: resolved, pass: false };
      }

      // Compute relative path for pattern matching (file-ignore logic uses relative paths)
      const cwd = process.cwd();
      const srcDir = path.join(cwd, "src");
      const relPath = resolved.startsWith(srcDir)
        ? path.relative(cwd, resolved).replace(/\\/g, "/")
        : path.basename(resolved);

      const violations = scanFileContent(content, relPath);
      const sorted = sortViolations(violations);
      const stats = computeStats(sorted);
      const pass = stats.high === 0;

      return {
        filePath: resolved,
        relativePath: relPath,
        specVersion: DESIGN_SPEC.version,
        pass,
        summary: pass
          ? stats.medium + stats.low === 0
            ? "Fully compliant — no violations found."
            : `Conditionally passing — ${stats.medium} medium, ${stats.low} low violations (no high).`
          : `FAIL — ${stats.high} high-severity violation(s) must be fixed.`,
        stats: {
          total: sorted.length,
          high: stats.high,
          medium: stats.medium,
          low: stats.low,
          byCategory: stats.byCategory,
          score: stats.score,
        },
        violations: sorted,
      };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Tool 3: get_design_violations
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "get_design_violations",
    description:
      "Scan the entire src/ directory for design governance violations. Groups results by file, sorted by severity. Supports filtering by severity (high/medium/low/all) and category (color/typography/layout/states/focus/button/all). Returns summary stats, compliance score (0-100), and top violations up to the limit. Use for project-wide design audits.",
    inputSchema: {
      type: "object",
      properties: {
        severity: {
          type: "string",
          enum: ["high", "medium", "low", "all"],
          description: "Filter by severity level (default 'all')",
        },
        category: {
          type: "string",
          enum: [
            "color",
            "typography",
            "layout",
            "states",
            "focus",
            "button",
            "all",
          ],
          description: "Filter by violation category (default 'all')",
        },
        limit: {
          type: "number",
          description: "Max violations to return (default 50)",
        },
      },
      required: [],
    },
    handler: async (args: {
      severity?: string;
      category?: string;
      limit?: number;
    }) => {
      const severityFilter = args.severity || "all";
      const categoryFilter = args.category || "all";
      const limit = args.limit ?? 50;

      // Locate src/ relative to cwd
      const cwd = process.cwd();
      const srcDir = path.join(cwd, "src");

      let allFiles: string[];
      try {
        allFiles = await walkSrcDir(srcDir, cwd);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to walk src/";
        return { error: msg, srcDir, hint: "Ensure src/ directory exists at project root" };
      }

      if (allFiles.length === 0) {
        return {
          error: "No scannable files found in src/",
          srcDir,
          hint: "src/ may be empty or all files are excluded by ignore patterns",
        };
      }

      // Scan all files
      let allViolations: Violation[] = [];

      for (const filePath of allFiles) {
        const relPath = path.relative(cwd, filePath).replace(/\\/g, "/");
        let content: string;
        try {
          content = await readFile(filePath, "utf-8");
        } catch {
          continue;
        }
        const violations = scanFileContent(content, relPath);
        allViolations.push(...violations);
      }

      // Apply filters
      if (severityFilter !== "all") {
        allViolations = allViolations.filter(
          (v) => v.severity === severityFilter
        );
      }
      if (categoryFilter !== "all") {
        allViolations = allViolations.filter(
          (v) => v.category === categoryFilter
        );
      }

      const sorted = sortViolations(allViolations);

      // Compute full stats BEFORE limiting
      const fullStats = computeStats(sorted);

      // Group by file
      const byFile: Record<string, Violation[]> = {};
      for (const v of sorted) {
        if (!byFile[v.file]) byFile[v.file] = [];
        byFile[v.file].push(v);
      }

      // Top files by violation count
      const topFiles = Object.entries(byFile)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([file, violations]) => {
          const fileHigh = violations.filter(
            (v) => v.severity === "high"
          ).length;
          const fileMed = violations.filter(
            (v) => v.severity === "medium"
          ).length;
          const fileLow = violations.filter(
            (v) => v.severity === "low"
          ).length;
          return {
            file,
            total: violations.length,
            high: fileHigh,
            medium: fileMed,
            low: fileLow,
          };
        });

      // Apply limit to individual violations
      const limited = sorted.slice(0, limit);

      return {
        specVersion: DESIGN_SPEC.version,
        srcDir,
        filesScanned: allFiles.length,
        totalViolations: sorted.length,
        violationsReturned: limited.length,
        truncated: sorted.length > limit,
        filters: {
          severity: severityFilter,
          category: categoryFilter,
          limit,
        },
        stats: {
          high: fullStats.high,
          medium: fullStats.medium,
          low: fullStats.low,
          byCategory: fullStats.byCategory,
          score: fullStats.score,
        },
        pass: fullStats.high === 0,
        topFilesBySeverity: topFiles.slice(0, 20),
        violations: limited,
      };
    },
  },

  // ── sync_figma_tokens ─────────────────────────────────────────────────
  {
    name: "sync_figma_tokens",
    description:
      "Pull Figma design token variables from a Figma file and compare against the codebase's CSS custom properties (src/index.css). Reports drift: tokens in code but not Figma, tokens in Figma but not code, and value mismatches. Requires FIGMA_ACCESS_TOKEN env var.",
    inputSchema: {
      type: "object",
      properties: {
        fileKey: {
          type: "string",
          description: "Figma file key (from URL: figma.com/design/<fileKey>/...). If omitted, uses FIGMA_DESIGN_SYSTEM_FILE env var.",
        },
      },
    },
    handler: async (args) => {
      const fileKey = args.fileKey || process.env.FIGMA_DESIGN_SYSTEM_FILE;
      const token = process.env.FIGMA_ACCESS_TOKEN;

      if (!token) {
        return {
          error: true,
          message: "FIGMA_ACCESS_TOKEN not set. Add to .env.local or set as environment variable.",
          setup: "Get a personal access token from Figma > Settings > Personal access tokens.",
        };
      }
      if (!fileKey) {
        return {
          error: true,
          message: "No Figma file key. Provide fileKey parameter or set FIGMA_DESIGN_SYSTEM_FILE env var.",
        };
      }

      // Extract CSS tokens from src/index.css
      const srcDir = path.resolve(process.cwd(), "src");
      const cssPath = path.join(srcDir, "index.css");
      let cssContent: string;
      try {
        cssContent = await readFile(cssPath, "utf8");
      } catch {
        return { error: true, message: `Cannot read ${cssPath}` };
      }

      const codeTokens: Record<string, Record<string, string>> = { light: {}, dark: {} };
      const varRegex = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+)/g;

      const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/s);
      if (rootMatch) {
        let m: RegExpExecArray | null;
        while ((m = varRegex.exec(rootMatch[1])) !== null) {
          codeTokens.light[m[1]] = m[2].trim();
        }
      }
      const darkMatch = cssContent.match(/\.dark\s*\{([^}]+)\}/s);
      if (darkMatch) {
        varRegex.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = varRegex.exec(darkMatch[1])) !== null) {
          codeTokens.dark[m[1]] = m[2].trim();
        }
      }

      // Call Figma Variables API
      try {
        const url = `https://api.figma.com/v1/files/${fileKey}/variables/local`;
        const res = await fetch(url, {
          headers: { "X-Figma-Token": token },
        });
        if (!res.ok) {
          const text = await res.text();
          return { error: true, message: `Figma API ${res.status}: ${text.slice(0, 200)}` };
        }
        const json = await res.json() as {
          meta?: {
            variables?: Record<string, { name: string; variableCollectionId: string; valuesByMode?: Record<string, unknown> }>;
            variableCollections?: Record<string, { modes: Array<{ name: string; modeId: string }> }>;
          };
        };
        const variables = json.meta?.variables ?? {};
        const collections = json.meta?.variableCollections ?? {};

        const figmaTokens: Record<string, Record<string, string>> = { light: {}, dark: {} };
        for (const v of Object.values(variables)) {
          const name = v.name?.replace(/\//g, "-").toLowerCase() ?? "";
          if (!name) continue;
          const collection = collections[v.variableCollectionId];
          const modes = collection?.modes ?? [];
          for (const mode of modes) {
            const modeName = mode.name?.toLowerCase() ?? "";
            const value = v.valuesByMode?.[mode.modeId];
            if (value == null) continue;
            const resolved = typeof value === "object" && value !== null && "r" in value
              ? (() => {
                  const c = value as unknown as { r: number; g: number; b: number; a?: number };
                  return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${(c.a ?? 1).toFixed(2)})`;
                })()
              : String(value);
            if (modeName.includes("dark")) {
              figmaTokens.dark[name] = resolved;
            } else {
              figmaTokens.light[name] = resolved;
            }
          }
        }

        // Compare
        const allCodeKeys = new Set([...Object.keys(codeTokens.light), ...Object.keys(codeTokens.dark)]);
        const allFigmaKeys = new Set([...Object.keys(figmaTokens.light), ...Object.keys(figmaTokens.dark)]);
        const codeOnly = [...allCodeKeys].filter(k => !allFigmaKeys.has(k));
        const figmaOnly = [...allFigmaKeys].filter(k => !allCodeKeys.has(k));
        const drift: Array<{ token: string; mode: string; code: string; figma: string }> = [];
        let matched = 0;
        for (const key of allCodeKeys) {
          if (!allFigmaKeys.has(key)) continue;
          matched++;
          for (const mode of ["light", "dark"] as const) {
            if (codeTokens[mode][key] && figmaTokens[mode][key] && codeTokens[mode][key] !== figmaTokens[mode][key]) {
              drift.push({ token: key, mode, code: codeTokens[mode][key], figma: figmaTokens[mode][key] });
            }
          }
        }

        return {
          status: drift.length === 0 && codeOnly.length === 0 && figmaOnly.length === 0 ? "in_sync" : "drift_detected",
          codeTokenCount: allCodeKeys.size,
          figmaTokenCount: allFigmaKeys.size,
          matched,
          codeOnly: codeOnly.slice(0, 30),
          figmaOnly: figmaOnly.slice(0, 30),
          drift: drift.slice(0, 30),
          _hint: drift.length > 0
            ? `${drift.length} tokens have drifted between Figma and code. Update src/index.css or Figma to reconcile.`
            : "Design tokens are in sync.",
        };
      } catch (err) {
        return { error: true, message: `Figma API error: ${(err as Error).message}` };
      }
    },
  },

  // ── get_figma_design_context ──────────────────────────────────────────
  {
    name: "get_figma_design_context",
    description:
      "Get design context for a specific component or screen from the codebase governance spec. Returns the relevant design tokens, typography rules, spacing rules, and component patterns that apply. Use this to understand what a component SHOULD look like according to the design system.",
    inputSchema: {
      type: "object",
      properties: {
        component: {
          type: "string",
          description: "Component or context name (e.g. 'button', 'card', 'page-shell', 'sidebar', 'stat-badge', 'empty-state')",
        },
      },
      required: ["component"],
    },
    handler: async (args) => {
      const component = (args.component ?? "").toLowerCase();

      // Component-specific design context from the governance spec
      const COMPONENT_CONTEXT: Record<string, {
        tokens: string[];
        typography: string[];
        spacing: string[];
        patterns: string[];
        notes: string;
      }> = {
        button: {
          tokens: ["--primary", "--primary-foreground", "--destructive", "--ring"],
          typography: [".type-body (14px/500)", "no uppercase unless metadata label"],
          spacing: ["px-4 py-2 (md)", "px-3 py-1.5 (sm)", "px-2 py-1 (xs)"],
          patterns: ["Use .btn-primary, .btn-secondary, .btn-ghost, .btn-outline", "focus-visible:ring-ring (semantic)", "No inline bg-indigo-600 text-white"],
          notes: "Always use btn-* utility classes. Inline button styles are a governance violation.",
        },
        card: {
          tokens: ["--card", "--card-foreground", "--border", "--radius"],
          typography: [".type-section-title for card headers", ".type-body for card content"],
          spacing: ["p-4 sm:p-6 standard card padding", "gap-3 between card sections"],
          patterns: ["Use .nb-surface-card", "border border-border/50 rounded-lg", "Consistent border-radius across all cards on same screen"],
          notes: "All cards must use nb-surface-card for consistent appearance.",
        },
        "page-shell": {
          tokens: ["--background", "--foreground"],
          typography: [".type-page-title for page headers", ".type-section-title for section headers"],
          spacing: ["nb-page-shell > nb-page-inner > nb-page-frame", "space-y-6 between sections", "gap-8 section-gap"],
          patterns: ["Every view MUST use nb-page-shell", "max-w-7xl mx-auto for content width"],
          notes: "Views missing nb-page-shell are a high-severity governance violation.",
        },
        sidebar: {
          tokens: ["--card", "--border", "--muted-foreground"],
          typography: [".type-label for section headings (uppercase OK here)", ".type-body for nav items"],
          spacing: ["p-3 standard sidebar padding", "gap-1 between nav items"],
          patterns: ["Sidebar labels are the ONE place uppercase is allowed", "z-sidebar (20) for stacking"],
          notes: "Sidebar section labels (MENU, MORE, FILES) may use uppercase. This is the exception.",
        },
        "empty-state": {
          tokens: ["--muted-foreground", "--muted"],
          typography: [".type-body for empty state message", ".type-caption for hint text"],
          spacing: ["py-8 px-4 centered content", "gap-3 between icon and text"],
          patterns: ["Import EmptyState component", "Icon (24px muted) + title + description + optional CTA", "Every data view MUST have an empty state"],
          notes: "Views without empty state handling are a high-severity governance violation.",
        },
        "stat-badge": {
          tokens: ["--foreground", "--muted-foreground", "--accent"],
          typography: [".type-heading for the number", ".type-caption for the label"],
          spacing: ["p-3 for stat cards", "gap-2 between stat items"],
          patterns: ["Single accent color for primary metric", "text-content-muted for secondary", "Keep status dots colored (semantic), remove decorative color from numbers"],
          notes: "Multi-colored stat numbers are a governance violation. Use monochrome.",
        },
      };

      const ctx = COMPONENT_CONTEXT[component];
      if (ctx) {
        return {
          component,
          found: true,
          ...ctx,
          spec: DESIGN_SPEC,
        };
      }

      // Fuzzy match
      const candidates = Object.keys(COMPONENT_CONTEXT).filter(
        k => k.includes(component) || component.includes(k)
      );

      return {
        component,
        found: false,
        message: `No specific design context for '${component}'.`,
        didYouMean: candidates.length > 0 ? candidates : Object.keys(COMPONENT_CONTEXT),
        spec: DESIGN_SPEC,
        _hint: "The full design spec is included. Check spec.colorBudget, spec.typography, and spec.components for general rules.",
      };
    },
  },
];
