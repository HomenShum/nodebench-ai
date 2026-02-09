/**
 * Architect Tools — Structural code analysis and concept verification.
 *
 * Instead of hardcoded feature tiers, these tools let agents dynamically
 * discover what a codebase can do and what's missing. The agent searches
 * the web for new concepts, defines the required code signatures, then
 * uses these tools to verify and plan implementation.
 *
 * 3 tools:
 * - scan_capabilities: Analyze a file for structural patterns (regex-based)
 * - verify_concept_support: Check if a file contains required code signatures
 * - generate_implementation_plan: Build a plan for missing signatures
 */

import { readFile } from "node:fs/promises";
import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

// ── DB setup ────────────────────────────────────────────────────────────────

function ensureConceptTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS concept_verifications (
      id TEXT PRIMARY KEY,
      concept_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      status TEXT NOT NULL,
      match_score REAL NOT NULL,
      signatures_total INTEGER NOT NULL,
      signatures_found INTEGER NOT NULL,
      gap_list TEXT,
      verified_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

// ── Pattern definitions ────────────────────────────────────────────────────

interface PatternCategory {
  [key: string]: { pattern: RegExp; count?: boolean };
}

const STATE_PATTERNS: PatternCategory = {
  boolean_flags: { pattern: /const \[\w+, set\w+\] = useState(?:<boolean>)?\(/g, count: true },
  complex_objects: { pattern: /const \[\w+, set\w+\] = useState<\{/g, count: true },
  refs: { pattern: /useRef</g, count: true },
  reducers: { pattern: /useReducer\(/g, count: true },
  context_consumers: { pattern: /useContext\(/g, count: true },
  effects: { pattern: /useEffect\(/g, count: true },
  memos: { pattern: /useMemo\(/g, count: true },
  callbacks: { pattern: /useCallback\(/g, count: true },
};

const LAYOUT_PATTERNS: PatternCategory = {
  has_overlay: { pattern: /(?:fixed|absolute)\s+inset-0|z-50|z-\[/ },
  has_sidebar: { pattern: /w-\[.*?\].*?(?:flex|border-[lr])|sidebar|side-panel/i },
  has_resizable: { pattern: /resize|cursor-(?:col|row)-resize|onResize/ },
  has_grid: { pattern: /grid-cols-|display:\s*grid/ },
  has_responsive: { pattern: /sm:|md:|lg:|xl:|@media/ },
  has_modal: { pattern: /(?:modal|dialog)(?:Open|Visible|Show)/i },
};

const INTERACTION_PATTERNS: PatternCategory = {
  keyboard_shortcuts: { pattern: /addEventListener\(['"]keydown|onKeyDown|useHotkeys/ },
  drag_drop: { pattern: /onDrop|onDragOver|useDrag|useDrop|draggable/ },
  clipboard: { pattern: /navigator\.clipboard|execCommand\(['"]copy/ },
  voice: { pattern: /SpeechRecognition|webkitSpeechRecognition|MediaRecorder/ },
  touch: { pattern: /onTouchStart|onTouchMove|onTouchEnd/ },
  scroll: { pattern: /onScroll|IntersectionObserver|scrollIntoView/ },
  animation: { pattern: /framer-motion|useSpring|@keyframes|transition:/ },
};

const RENDERING_PATTERNS: PatternCategory = {
  markdown: { pattern: /ReactMarkdown|remark|rehype|marked/ },
  code_highlighting: { pattern: /SyntaxHighlighter|Prism|highlight\.js|shiki/ },
  math: { pattern: /KaTeX|MathJax|mathjax/ },
  dynamic_lists: { pattern: /\.map\(\s*\(/g, count: true },
  streaming: { pattern: /ReadableStream|EventSource|onmessage|text\/event-stream/ },
  virtualization: { pattern: /react-window|react-virtualized|useVirtualizer/ },
};

const BACKEND_PATTERNS: PatternCategory = {
  rest_routes: { pattern: /app\.(get|post|put|patch|delete)\s*\(/g, count: true },
  middleware: { pattern: /app\.use\(|router\.use\(|middleware/g, count: true },
  db_queries: { pattern: /\.query\(|\.exec\(|\.prepare\(|prisma\.|knex\./g, count: true },
  auth_guards: { pattern: /isAuthenticated|requireAuth|verifyToken|passport\.authenticate/g, count: true },
  websocket: { pattern: /WebSocket|wss?\.|socket\.on|io\.on/ },
  graphql: { pattern: /typeDefs|resolvers|gql`|graphql/ },
  cron_jobs: { pattern: /cron\.|schedule\(|setInterval\(/ },
};

function analyzePatterns(content: string, patterns: PatternCategory): Record<string, number | boolean> {
  const result: Record<string, number | boolean> = {};
  for (const [key, { pattern, count }] of Object.entries(patterns)) {
    if (count) {
      const matches = content.match(pattern);
      result[key] = matches ? matches.length : 0;
    } else {
      result[key] = pattern.test(content);
    }
  }
  return result;
}

// ── Tools ──────────────────────────────────────────────────────────────────

export const architectTools: McpTool[] = [
  {
    name: "scan_capabilities",
    description:
      "Analyze a source file for structural code patterns. Returns a capability report showing what the code can structurally DO — state management (hooks, refs, reducers), layout (overlay, sidebar, grid, responsive), interactions (keyboard, drag-drop, clipboard, voice, touch), rendering (markdown, code highlighting, math, streaming), and backend patterns (REST routes, middleware, DB queries, auth guards, WebSocket). Pure regex analysis, no LLM needed.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Absolute or relative path to the source file to analyze",
        },
      },
      required: ["file_path"],
    },
    handler: async (args: { file_path: string }) => {
      const content = await readFile(args.file_path, "utf-8");
      const lines = content.split("\n").length;

      const capabilities = {
        file: {
          path: args.file_path,
          lines,
          sizeBytes: Buffer.byteLength(content, "utf-8"),
        },
        state_management: analyzePatterns(content, STATE_PATTERNS),
        layout_structure: analyzePatterns(content, LAYOUT_PATTERNS),
        interaction_patterns: analyzePatterns(content, INTERACTION_PATTERNS),
        rendering_capabilities: analyzePatterns(content, RENDERING_PATTERNS),
        backend_patterns: analyzePatterns(content, BACKEND_PATTERNS),
        imports: {
          count: (content.match(/^import /gm) || []).length,
          has_react: /from ['"]react/.test(content),
          has_next: /from ['"]next/.test(content),
          has_express: /from ['"]express/.test(content),
          has_test_framework: /from ['"](?:vitest|jest|mocha|chai)/.test(content),
        },
        exports: {
          default_export: /export default/.test(content),
          named_exports: (content.match(/^export (?:const|function|class|type|interface)/gm) || []).length,
        },
      };

      return capabilities;
    },
  },
  {
    name: "verify_concept_support",
    description:
      "Check if a source file contains all required code signatures for a concept. Provide a concept name and a list of regex patterns that MUST exist for the concept to be considered implemented. Returns match score (0-100%), status (Fully/Partially/Not Implemented), evidence found, and gap analysis. Results are persisted to SQLite for tracking progress over time.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the source file to verify",
        },
        concept_name: {
          type: "string",
          description: 'The feature/concept to verify (e.g., "Dark Mode", "Canvas Artifacts", "Real-time Collaboration")',
        },
        required_signatures: {
          type: "array",
          items: { type: "string" },
          description:
            'Regex patterns that MUST exist for the concept to be implemented. E.g., ["prefers-color-scheme", "theme.*dark", "toggle.*theme"]',
        },
      },
      required: ["file_path", "concept_name", "required_signatures"],
    },
    handler: async (args: {
      file_path: string;
      concept_name: string;
      required_signatures: string[];
    }) => {
      ensureConceptTable();
      const content = await readFile(args.file_path, "utf-8");

      const found: string[] = [];
      const missing: string[] = [];

      for (const sig of args.required_signatures) {
        try {
          const regex = new RegExp(sig, "i");
          if (regex.test(content)) {
            found.push(sig);
          } else {
            missing.push(sig);
          }
        } catch {
          // Invalid regex — treat as literal string search
          if (content.toLowerCase().includes(sig.toLowerCase())) {
            found.push(sig);
          } else {
            missing.push(sig);
          }
        }
      }

      const score = args.required_signatures.length > 0
        ? Math.round((found.length / args.required_signatures.length) * 100)
        : 0;

      const status =
        score === 100
          ? "Fully Implemented"
          : score > 50
            ? "Partially Implemented"
            : "Not Implemented";

      // Persist to SQLite
      const id = genId("cv");
      const db = getDb();
      db.prepare(
        `INSERT INTO concept_verifications (id, concept_name, file_path, status, match_score, signatures_total, signatures_found, gap_list)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        args.concept_name,
        args.file_path,
        status,
        score,
        args.required_signatures.length,
        found.length,
        JSON.stringify(missing)
      );

      return {
        id,
        concept: args.concept_name,
        file: args.file_path,
        status,
        match_score: `${score}%`,
        signatures_total: args.required_signatures.length,
        evidence_found: found,
        gap_analysis: missing,
        recommendation:
          missing.length === 0
            ? "All required signatures found. Concept is fully implemented."
            : missing.length <= 2
              ? `Nearly there — ${missing.length} signature(s) missing: ${missing.join(", ")}`
              : `${missing.length} of ${args.required_signatures.length} signatures missing. Major implementation work needed.`,
      };
    },
  },
  {
    name: "generate_implementation_plan",
    description:
      "Generate a structured implementation plan for missing code signatures. Takes the gap analysis from verify_concept_support and produces a step-by-step plan with per-signature requirements and injection strategies. Optionally takes the output of scan_capabilities as context to avoid conflicts with existing patterns.",
    inputSchema: {
      type: "object",
      properties: {
        concept_name: {
          type: "string",
          description: "The concept being implemented",
        },
        missing_signatures: {
          type: "array",
          items: { type: "string" },
          description: "List of missing regex patterns from verify_concept_support gap_analysis",
        },
        current_context: {
          type: "string",
          description:
            "Brief description or JSON of the current component capabilities (from scan_capabilities output). Helps avoid conflicts.",
        },
        target_file: {
          type: "string",
          description: "Path to the file where changes will be made (optional, for reference)",
        },
      },
      required: ["concept_name", "missing_signatures"],
    },
    handler: async (args: {
      concept_name: string;
      missing_signatures: string[];
      current_context?: string;
      target_file?: string;
    }) => {
      const steps = args.missing_signatures.map((sig, i) => ({
        step: i + 1,
        requirement: sig,
        description: `Inject pattern matching: ${sig}`,
        strategy: inferStrategy(sig),
        conflicts: args.current_context
          ? `Review current context for overlap with: ${sig}`
          : "No context provided — run scan_capabilities first for conflict detection",
      }));

      return {
        concept: args.concept_name,
        target_file: args.target_file || "(not specified)",
        total_steps: steps.length,
        estimated_complexity:
          steps.length <= 2 ? "low" : steps.length <= 5 ? "medium" : "high",
        context_provided: !!args.current_context,
        steps,
        workflow: [
          "1. Run scan_capabilities on the target file (if not already done)",
          "2. Review each step below and implement in order",
          "3. After each step, run verify_concept_support to track progress",
          "4. When all signatures match, the concept is fully implemented",
        ],
      };
    },
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function inferStrategy(signature: string): string {
  const lower = signature.toLowerCase();

  // State patterns
  if (/usestate|useref|usereducer|usecontext/i.test(lower))
    return "Add React hook to component body (before return statement)";
  if (/useeffect|usememo|usecallback/i.test(lower))
    return "Add React hook — check dependency array for existing effects to avoid duplicates";

  // Layout patterns
  if (/grid|flex|sidebar|overlay|modal|dialog/i.test(lower))
    return "Add CSS/layout structure to JSX return — check existing layout for nesting conflicts";
  if (/responsive|media|breakpoint/i.test(lower))
    return "Add responsive breakpoints — check existing Tailwind/CSS classes for conflicts";

  // Interaction patterns
  if (/keydown|keyboard|hotkey/i.test(lower))
    return "Add keyboard event listener — check for existing keydown handlers to merge, not duplicate";
  if (/drag|drop/i.test(lower))
    return "Add drag-and-drop handlers — ensure no conflicting pointer event handlers";
  if (/clipboard|copy/i.test(lower))
    return "Add clipboard API call — wrap in try/catch for permission handling";
  if (/speech|voice|recognition/i.test(lower))
    return "Add Web Speech API — feature-detect first (not available in all browsers)";

  // Backend patterns
  if (/app\.\w+\(|router\.\w+\(|route/i.test(lower))
    return "Add route handler — check existing routes for path conflicts";
  if (/middleware|use\(/i.test(lower))
    return "Add middleware — check execution order in middleware stack";
  if (/query|prepare|prisma|knex/i.test(lower))
    return "Add database query — ensure schema/migration exists for required tables";
  if (/auth|token|passport/i.test(lower))
    return "Add authentication logic — verify auth middleware is applied to the right routes";
  if (/websocket|socket/i.test(lower))
    return "Add WebSocket handler — check for existing connection managers to reuse";

  // Rendering patterns
  if (/markdown|remark/i.test(lower))
    return "Add markdown renderer — install remark/rehype plugins if needed";
  if (/highlight|syntax|prism|shiki/i.test(lower))
    return "Add code highlighting — check bundle size impact of syntax theme";

  return "Inject this pattern into the appropriate location in the file";
}
