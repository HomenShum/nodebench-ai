/**
 * UI/UX Full Dive v2 — Advanced Tools
 *
 * Deep interaction testing, screenshot capture, design auditing,
 * backend context linking, changelog tracking, and walkthrough generation.
 *
 * These tools complement the base dive tools (uiUxDiveTools.ts) and work
 * with the MCP Bridge (playwright-mcp) for browser automation.
 *
 * Architecture:
 * - Agent uses MCP Bridge to drive the browser (navigate, click, type, screenshot)
 * - These tools provide structured storage and analysis on top of bridge actions
 * - Screenshots are saved to disk + thumbnail stored in DB for fast retrieval
 * - Interaction tests define preconditions → steps → expected/actual per step
 * - Design audits compare computed styles across components for inconsistencies
 * - Backend links connect UI components to API endpoints, Convex functions, DB tables
 * - Changelogs track before/after with screenshots when fixes are applied
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { createConnection } from "node:net";
import { getDb } from "../db.js";
import { getDashboardUrl } from "../dashboard/server.js";
import type { McpTool } from "../types.js";

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function screenshotDir(): string {
  const dir = join(homedir(), ".nodebench", "dive-screenshots");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Try to connect to a TCP port. Resolves true if something is listening. */
function checkPort(port: number, host = "127.0.0.1", timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = createConnection({ port, host });
    const timer = setTimeout(() => { sock.destroy(); resolve(false); }, timeoutMs);
    sock.on("connect", () => { clearTimeout(timer); sock.destroy(); resolve(true); });
    sock.on("error", () => { clearTimeout(timer); resolve(false); });
  });
}

/** Recursively find files matching a test, up to maxDepth. */
function findFiles(
  dir: string,
  test: (name: string) => boolean,
  maxDepth = 4,
  depth = 0,
): string[] {
  if (depth > maxDepth || !existsSync(dir)) return [];
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist" || entry.name === ".next") continue;
      const full = join(dir, entry.name);
      if (entry.isFile() && test(entry.name)) results.push(full);
      else if (entry.isDirectory()) results.push(...findFiles(full, test, maxDepth, depth + 1));
    }
  } catch { /* permission errors etc */ }
  return results;
}

/** Extract route paths from source code using common patterns. */
function extractRoutes(srcDir: string): Array<{ path: string; file: string; component?: string }> {
  const routes: Array<{ path: string; file: string; component?: string }> = [];
  const seen = new Set<string>();

  // Find files that likely contain route definitions
  const routeFiles = findFiles(srcDir, (name) =>
    /\.(tsx?|jsx?)$/.test(name) && (
      /[Rr]out/.test(name) || /[Aa]pp/.test(name) || /[Ll]ayout/.test(name) ||
      /[Nn]avigation/.test(name) || /[Ss]idebar/.test(name) || /pages/.test(name)
    ),
  );

  for (const file of routeFiles.slice(0, 30)) {
    try {
      const content = readFileSync(file, "utf-8");
      // Match React Router <Route path="..." patterns
      const routeMatches = content.matchAll(/path\s*[:=]\s*["'`](\/[^"'`]*?)["'`]/g);
      for (const m of routeMatches) {
        const p = m[1];
        if (!seen.has(p)) {
          seen.add(p);
          // Try to find component name nearby
          const compMatch = content.slice(Math.max(0, m.index! - 200), m.index! + 200)
            .match(/(?:element|component)\s*[:=]\s*[{<]?\s*(\w+)/);
          routes.push({ path: p, file: file.replace(/\\/g, "/"), component: compMatch?.[1] });
        }
      }
    } catch { /* unreadable */ }
  }

  return routes.sort((a, b) => a.path.localeCompare(b.path));
}

export const uiUxDiveAdvancedTools: McpTool[] = [
  // ── 0. Project preflight — analyze project before diving ──────────────
  {
    name: "dive_preflight",
    description:
      "Analyze a project BEFORE starting a UI dive. Scans the project directory to detect: framework (Vite, Next.js, CRA, etc.), dev scripts, required services (frontend, backend like Convex/Supabase/Firebase), port assignments, whether services are already running, route definitions from source code, and environment requirements. Returns a structured launch plan the agent should follow to get the app running before navigating. This is always Step 0 of a dive.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: { type: "string", description: "Absolute path to the project root directory" },
        checkPorts: {
          type: "boolean",
          description: "Whether to probe common ports to see what is already running (default: true)",
        },
        scanRoutes: {
          type: "boolean",
          description: "Whether to scan source code for route definitions (default: true)",
        },
      },
      required: ["projectPath"],
    },
    handler: async (args) => {
      const { projectPath, checkPorts: doCheckPorts, scanRoutes: doScanRoutes } = args as {
        projectPath: string;
        checkPorts?: boolean;
        scanRoutes?: boolean;
      };

      if (!existsSync(projectPath)) {
        return { error: true, message: `Project path not found: ${projectPath}` };
      }

      // ── 1. Read package.json ──
      const pkgPath = join(projectPath, "package.json");
      let pkg: any = null;
      if (existsSync(pkgPath)) {
        try { pkg = JSON.parse(readFileSync(pkgPath, "utf-8")); } catch { /* */ }
      }

      // ── 2. Detect framework ──
      const deps = { ...pkg?.dependencies, ...pkg?.devDependencies } as Record<string, string>;
      const framework: { name: string; version?: string; configFile?: string } = { name: "unknown" };

      const frameworkChecks: Array<{ name: string; dep: string; configs: string[] }> = [
        { name: "next", dep: "next", configs: ["next.config.js", "next.config.ts", "next.config.mjs"] },
        { name: "vite", dep: "vite", configs: ["vite.config.ts", "vite.config.js", "vite.config.mjs"] },
        { name: "create-react-app", dep: "react-scripts", configs: [] },
        { name: "remix", dep: "@remix-run/react", configs: ["remix.config.js"] },
        { name: "nuxt", dep: "nuxt", configs: ["nuxt.config.ts", "nuxt.config.js"] },
        { name: "sveltekit", dep: "@sveltejs/kit", configs: ["svelte.config.js"] },
        { name: "astro", dep: "astro", configs: ["astro.config.mjs", "astro.config.ts"] },
        { name: "angular", dep: "@angular/core", configs: ["angular.json"] },
        { name: "gatsby", dep: "gatsby", configs: ["gatsby-config.js", "gatsby-config.ts"] },
      ];

      for (const check of frameworkChecks) {
        if (deps?.[check.dep]) {
          framework.name = check.name;
          framework.version = deps[check.dep];
          for (const cfg of check.configs) {
            if (existsSync(join(projectPath, cfg))) {
              framework.configFile = cfg;
              break;
            }
          }
          break;
        }
      }

      // ── 3. Detect dev scripts ──
      const scripts = pkg?.scripts ?? {};
      const devScripts: Array<{ name: string; command: string; likely: string }> = [];
      const scriptPriority = ["dev", "dev:frontend", "start", "dev:web", "serve", "develop"];
      for (const name of Object.keys(scripts)) {
        let likely = "unknown";
        const cmd = scripts[name] as string;
        if (/vite|next dev|react-scripts start|nuxt dev|astro dev/.test(cmd)) likely = "frontend";
        else if (/convex dev|convex deploy/.test(cmd)) likely = "backend (convex)";
        else if (/node.*server|express|fastify|hono/.test(cmd)) likely = "backend (api)";
        else if (/tsc|typescript/.test(cmd)) likely = "build";
        else if (/vitest|jest|playwright|cypress/.test(cmd)) likely = "test";
        else if (/lint|eslint|prettier/.test(cmd)) likely = "lint";

        if (likely === "frontend" || likely.startsWith("backend") || scriptPriority.includes(name)) {
          devScripts.push({ name, command: cmd, likely });
        }
      }
      // Sort by priority
      devScripts.sort((a, b) => {
        const ai = scriptPriority.indexOf(a.name);
        const bi = scriptPriority.indexOf(b.name);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });

      // ── 4. Detect backend services ──
      const services: Array<{ name: string; type: string; detected: string; port?: number; startCommand?: string }> = [];

      // Convex
      if (existsSync(join(projectPath, "convex")) && (deps?.["convex"] || existsSync(join(projectPath, "convex.json")))) {
        const convexScript = Object.entries(scripts).find(([, cmd]) => (cmd as string).includes("convex dev"));
        services.push({
          name: "Convex",
          type: "backend",
          detected: "convex/ directory + convex dependency",
          startCommand: convexScript ? `npm run ${convexScript[0]}` : "npx convex dev",
        });
      }

      // Supabase
      if (deps?.["@supabase/supabase-js"] || existsSync(join(projectPath, "supabase"))) {
        services.push({ name: "Supabase", type: "backend", detected: "supabase dependency or supabase/ directory" });
      }

      // Firebase
      if (deps?.["firebase"] || existsSync(join(projectPath, "firebase.json"))) {
        services.push({ name: "Firebase", type: "backend", detected: "firebase dependency or firebase.json" });
      }

      // Prisma
      if (deps?.["prisma"] || existsSync(join(projectPath, "prisma"))) {
        services.push({ name: "Prisma", type: "orm", detected: "prisma dependency or prisma/ directory" });
      }

      // Docker
      if (existsSync(join(projectPath, "docker-compose.yml")) || existsSync(join(projectPath, "docker-compose.yaml"))) {
        services.push({ name: "Docker Compose", type: "infrastructure", detected: "docker-compose.yml found" });
      }

      // ── 5. Detect ports from config ──
      let frontendPort = 3000; // default
      if (framework.name === "vite") frontendPort = 5173;
      else if (framework.name === "next") frontendPort = 3000;
      else if (framework.name === "create-react-app") frontendPort = 3000;
      else if (framework.name === "nuxt") frontendPort = 3000;
      else if (framework.name === "astro") frontendPort = 4321;

      // Try to read port from vite config
      if (framework.configFile && existsSync(join(projectPath, framework.configFile))) {
        try {
          const cfgContent = readFileSync(join(projectPath, framework.configFile), "utf-8");
          const portMatch = cfgContent.match(/port\s*[:=]\s*(\d+)/);
          if (portMatch) frontendPort = parseInt(portMatch[1], 10);
        } catch { /* */ }
      }

      // ── 6. Check running ports ──
      const portStatus: Record<number, boolean> = {};
      if (doCheckPorts !== false) {
        const portsToCheck = [frontendPort, 3000, 3001, 4321, 5173, 5174, 8080, 8788];
        const uniquePorts = [...new Set(portsToCheck)];
        await Promise.all(uniquePorts.map(async (p) => {
          portStatus[p] = await checkPort(p);
        }));
      }

      const frontendRunning = portStatus[frontendPort] === true;

      // ── 7. Scan routes ──
      let routes: Array<{ path: string; file: string; component?: string }> = [];
      if (doScanRoutes !== false) {
        const srcDir = existsSync(join(projectPath, "src")) ? join(projectPath, "src") :
                       existsSync(join(projectPath, "app")) ? join(projectPath, "app") : projectPath;
        routes = extractRoutes(srcDir);
      }

      // ── 8. Check env files ──
      const envFiles: string[] = [];
      for (const name of [".env", ".env.local", ".env.development", ".env.development.local"]) {
        if (existsSync(join(projectPath, name))) envFiles.push(name);
      }

      // ── 9. Build launch plan ──
      const launchSteps: string[] = [];
      const runningServices: string[] = [];

      if (!frontendRunning) {
        const devCmd = devScripts.find(s => s.likely === "frontend");
        launchSteps.push(
          devCmd
            ? `Start frontend: npm run ${devCmd.name}  (runs: ${devCmd.command})`
            : `Start frontend: npm run dev  (port ${frontendPort})`
        );
      } else {
        runningServices.push(`Frontend already running on port ${frontendPort}`);
      }

      for (const svc of services) {
        if (svc.type === "backend") {
          launchSteps.push(
            svc.startCommand
              ? `Start ${svc.name}: ${svc.startCommand}`
              : `Start ${svc.name} (check project docs for startup command)`
          );
        }
      }

      launchSteps.push(`Verify app is accessible at http://localhost:${frontendPort}`);
      launchSteps.push("Then: start_ui_dive → navigate routes → discover components → test interactions");

      return {
        project: {
          name: pkg?.name ?? basename(projectPath),
          path: projectPath,
          version: pkg?.version,
        },
        framework,
        devScripts,
        services,
        ports: {
          frontend: frontendPort,
          frontendRunning,
          status: portStatus,
        },
        routes: {
          count: routes.length,
          discovered: routes.slice(0, 50),
        },
        envFiles,
        launchPlan: {
          alreadyRunning: runningServices,
          stepsNeeded: launchSteps,
          appUrl: `http://localhost:${frontendPort}`,
        },
        _hint: frontendRunning
          ? `App is running at http://localhost:${frontendPort}. Proceed with start_ui_dive({ appUrl: "http://localhost:${frontendPort}" }) then navigate routes with Playwright.`
          : `App is NOT running. Execute the launch plan steps first, then start the dive.`,
      };
    },
  },

  // ── 1. Save a labeled screenshot ──────────────────────────────────────
  {
    name: "dive_save_screenshot",
    description:
      "Save a screenshot during a dive session. Pass base64 image data (from bridge's browser_take_screenshot) or a file path. The screenshot is stored on disk and indexed in the DB with labels, route, component, and test references. Returns a screenshot_id you can link to bugs, test steps, design issues, and changelogs. This creates the visual evidence trail for the entire dive.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dive session ID" },
        label: { type: "string", description: "Human-readable label (e.g. 'Login form - initial state', 'After clicking submit')" },
        base64Data: { type: "string", description: "Base64-encoded image data (from browser_take_screenshot)" },
        filePath: { type: "string", description: "Alternative: path to an existing screenshot file" },
        componentId: { type: "string", description: "Component this screenshot is for (optional)" },
        route: { type: "string", description: "Current route/URL (optional)" },
        testId: { type: "string", description: "Interaction test this belongs to (optional)" },
        stepIndex: { type: "number", description: "Step index within a test (optional)" },
        metadata: { type: "object", description: "Additional metadata (optional)" },
      },
      required: ["sessionId", "label"],
    },
    handler: async (args) => {
      const { sessionId, label, base64Data, filePath, componentId, route, testId, stepIndex, metadata } = args as {
        sessionId: string;
        label: string;
        base64Data?: string;
        filePath?: string;
        componentId?: string;
        route?: string;
        testId?: string;
        stepIndex?: number;
        metadata?: Record<string, unknown>;
      };

      const db = getDb();
      const session = db.prepare("SELECT id FROM ui_dive_sessions WHERE id = ?").get(sessionId);
      if (!session) return { error: true, message: `Session not found: ${sessionId}` };

      const id = genId("ss");
      let savedPath = filePath ?? null;

      // Save base64 data to disk
      if (base64Data && !filePath) {
        const dir = screenshotDir();
        const filename = `${sessionId}_${id}.png`;
        savedPath = join(dir, filename);
        try {
          const buffer = Buffer.from(base64Data, "base64");
          writeFileSync(savedPath, buffer);
        } catch (e: any) {
          return { error: true, message: `Failed to save screenshot: ${e.message}` };
        }
      }

      // Store a small thumbnail (first 500 chars of base64 for quick preview)
      const thumbnail = base64Data ? base64Data.slice(0, 500) : null;

      db.prepare(
        `INSERT INTO ui_dive_screenshots (id, session_id, component_id, test_id, step_index, label, route, file_path, base64_thumbnail, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, sessionId, componentId ?? null, testId ?? null, stepIndex ?? null, label, route ?? null, savedPath, thumbnail, metadata ? JSON.stringify(metadata) : null);

      return {
        screenshotId: id,
        label,
        filePath: savedPath,
        componentId: componentId ?? null,
        route: route ?? null,
        _hint: `Screenshot saved. Reference it in bugs: tag_ui_bug({ screenshotRef: "${id}" }), test steps, design issues, or changelogs.`,
      };
    },
  },

  // ── 2. Run a structured interaction test ──────────────────────────────
  {
    name: "dive_interaction_test",
    description:
      "Define and track a structured interaction test for a component. Provide preconditions and a sequence of test steps (action, target, expected outcome). The agent executes each step via the MCP Bridge (browser_click, browser_type, etc.), takes screenshots, and records actual results here. Each step gets pass/fail status. The test aggregates into an overall result. This creates the detailed walkthrough with preconditions, steps, expected vs actual, and visual evidence at each step.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dive session ID" },
        componentId: { type: "string", description: "Component being tested" },
        testName: { type: "string", description: "Test name (e.g. 'Login form submission', 'Dark mode toggle')" },
        description: { type: "string", description: "What this test validates" },
        preconditions: {
          type: "array",
          description: "List of preconditions (e.g. ['User is logged out', 'Browser at /login', 'Dark mode is off'])",
          items: { type: "string" },
        },
        steps: {
          type: "array",
          description: "Test steps to execute and track",
          items: {
            type: "object",
            properties: {
              action: { type: "string", description: "Action: click, type, navigate, hover, scroll, assert, wait, screenshot" },
              target: { type: "string", description: "CSS selector, URL, or description" },
              inputValue: { type: "string", description: "Value to type/enter (for type action)" },
              expected: { type: "string", description: "Expected outcome (e.g. 'Form submits', 'Error message appears', 'Redirects to /dashboard')" },
              screenshotLabel: { type: "string", description: "Label for the screenshot at this step (optional)" },
            },
            required: ["action", "expected"],
          },
        },
        metadata: { type: "object", description: "Optional metadata" },
      },
      required: ["sessionId", "componentId", "testName", "steps"],
    },
    handler: async (args) => {
      const { sessionId, componentId, testName, description, preconditions, steps, metadata } = args as {
        sessionId: string;
        componentId: string;
        testName: string;
        description?: string;
        preconditions?: string[];
        steps: Array<{
          action: string;
          target?: string;
          inputValue?: string;
          expected: string;
          screenshotLabel?: string;
        }>;
        metadata?: Record<string, unknown>;
      };

      const db = getDb();

      const session = db.prepare("SELECT id FROM ui_dive_sessions WHERE id = ?").get(sessionId);
      if (!session) return { error: true, message: `Session not found: ${sessionId}` };
      const comp = db.prepare("SELECT id FROM ui_dive_components WHERE id = ?").get(componentId);
      if (!comp) return { error: true, message: `Component not found: ${componentId}` };

      const testId = genId("test");
      db.prepare(
        `INSERT INTO ui_dive_interaction_tests (id, session_id, component_id, test_name, description, preconditions, steps_total, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(testId, sessionId, componentId, testName, description ?? null, preconditions ? JSON.stringify(preconditions) : null, steps.length, metadata ? JSON.stringify(metadata) : null);

      // Create step rows
      const stepIds: string[] = [];
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const stepId = genId("step");
        db.prepare(
          `INSERT INTO ui_dive_test_steps (id, test_id, step_index, action, target, input_value, expected)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(stepId, testId, i, s.action, s.target ?? null, s.inputValue ?? null, s.expected);
        stepIds.push(stepId);
      }

      return {
        testId,
        testName,
        componentId,
        stepsTotal: steps.length,
        stepIds,
        status: "pending",
        _workflow: [
          "For each step, the agent should:",
          "1. Execute the action via MCP Bridge (browser_click, browser_type, etc.)",
          "2. Take a screenshot via bridge (browser_take_screenshot)",
          "3. Save it: dive_save_screenshot({ testId, stepIndex, label, base64Data })",
          "4. Record result: dive_record_test_step({ testId, stepIndex, actual, status, screenshotId })",
          "5. After all steps: dive completes the test automatically",
        ],
        _hint: `Test created with ${steps.length} steps. Execute each step and record results with dive_record_test_step.`,
      };
    },
  },

  // ── 3. Record a test step result ──────────────────────────────────────
  {
    name: "dive_record_test_step",
    description:
      "Record the actual result of a test step after executing it via the MCP Bridge. Compare expected vs actual, attach a screenshot, and mark pass/fail. When all steps are recorded, the test is automatically completed with an overall status.",
    inputSchema: {
      type: "object",
      properties: {
        testId: { type: "string", description: "Interaction test ID from dive_interaction_test" },
        stepIndex: { type: "number", description: "0-based step index" },
        actual: { type: "string", description: "What actually happened" },
        status: {
          type: "string",
          description: "Step result: passed, failed, skipped, blocked",
          enum: ["passed", "failed", "skipped", "blocked"],
        },
        screenshotId: { type: "string", description: "Screenshot ID from dive_save_screenshot (optional)" },
        observation: { type: "string", description: "Additional notes about this step" },
        durationMs: { type: "number", description: "How long the step took" },
      },
      required: ["testId", "stepIndex", "status", "actual"],
    },
    handler: async (args) => {
      const { testId, stepIndex, actual, status, screenshotId, observation, durationMs } = args as {
        testId: string;
        stepIndex: number;
        actual: string;
        status: "passed" | "failed" | "skipped" | "blocked";
        screenshotId?: string;
        observation?: string;
        durationMs?: number;
      };

      const db = getDb();

      const step = db.prepare(
        "SELECT id, expected FROM ui_dive_test_steps WHERE test_id = ? AND step_index = ?"
      ).get(testId, stepIndex) as any;
      if (!step) return { error: true, message: `Step not found: test=${testId}, index=${stepIndex}` };

      db.prepare(
        "UPDATE ui_dive_test_steps SET actual = ?, status = ?, screenshot_id = ?, observation = ?, duration_ms = ? WHERE id = ?"
      ).run(actual, status, screenshotId ?? null, observation ?? null, durationMs ?? null, step.id);

      // Check if all steps are done → auto-complete the test
      const test = db.prepare("SELECT steps_total FROM ui_dive_interaction_tests WHERE id = ?").get(testId) as any;
      const completed = db.prepare(
        "SELECT COUNT(*) as c FROM ui_dive_test_steps WHERE test_id = ? AND status != 'pending'"
      ).get(testId) as any;
      const passed = db.prepare(
        "SELECT COUNT(*) as c FROM ui_dive_test_steps WHERE test_id = ? AND status = 'passed'"
      ).get(testId) as any;
      const failed = db.prepare(
        "SELECT COUNT(*) as c FROM ui_dive_test_steps WHERE test_id = ? AND status = 'failed'"
      ).get(testId) as any;

      const allDone = completed.c >= test.steps_total;
      if (allDone) {
        const overallStatus = failed.c > 0 ? "failed" : "passed";
        db.prepare(
          "UPDATE ui_dive_interaction_tests SET status = ?, steps_passed = ?, steps_failed = ?, completed_at = datetime('now') WHERE id = ?"
        ).run(overallStatus, passed.c, failed.c, testId);
      } else {
        db.prepare(
          "UPDATE ui_dive_interaction_tests SET steps_passed = ?, steps_failed = ? WHERE id = ?"
        ).run(passed.c, failed.c, testId);
      }

      return {
        stepId: step.id,
        stepIndex,
        expected: step.expected,
        actual,
        status,
        match: status === "passed",
        screenshotId: screenshotId ?? null,
        testProgress: `${completed.c}/${test.steps_total}`,
        testComplete: allDone,
        ...(allDone ? { testStatus: failed.c > 0 ? "failed" : "passed" } : {}),
        _hint: allDone
          ? `Test complete: ${passed.c} passed, ${failed.c} failed.`
          : `Step ${stepIndex} recorded. ${test.steps_total - completed.c} steps remaining.`,
      };
    },
  },

  // ── 4. Tag a design inconsistency ─────────────────────────────────────
  {
    name: "dive_design_issue",
    description:
      "Tag a design inconsistency found during the dive. Covers visual problems like color mismatches, spacing deviations, font inconsistencies, alignment issues, contrast failures, responsive breakage, missing hover/focus states, and more. Link to a screenshot and the specific element. The agent uses bridge's browser_evaluate to extract computed styles and compare across components.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dive session ID" },
        componentId: { type: "string", description: "Component with the issue (optional)" },
        issueType: {
          type: "string",
          description: "Type: color, spacing, font, alignment, contrast, responsive, hover_state, focus_state, animation, icon, border, shadow, z_index, overflow, consistency",
        },
        severity: {
          type: "string",
          description: "Severity: critical (broken UX), high (obvious visual bug), medium (noticeable deviation), low (minor polish)",
          enum: ["critical", "high", "medium", "low"],
        },
        title: { type: "string", description: "Short description (e.g. 'Button color mismatch between header and sidebar')" },
        description: { type: "string", description: "Detailed explanation" },
        elementSelector: { type: "string", description: "CSS selector of the affected element" },
        expectedValue: { type: "string", description: "What the design should be (e.g. '#3B82F6', '16px', 'Inter')" },
        actualValue: { type: "string", description: "What was actually found (e.g. '#2563EB', '12px', 'system-ui')" },
        screenshotId: { type: "string", description: "Screenshot showing the issue" },
        route: { type: "string", description: "Route where the issue was found" },
        metadata: { type: "object", description: "Additional context (e.g. { breakpoint: '768px', theme: 'dark' })" },
      },
      required: ["sessionId", "issueType", "title"],
    },
    handler: async (args) => {
      const { sessionId, componentId, issueType, severity, title, description, elementSelector, expectedValue, actualValue, screenshotId, route, metadata } = args as {
        sessionId: string;
        componentId?: string;
        issueType: string;
        severity?: string;
        title: string;
        description?: string;
        elementSelector?: string;
        expectedValue?: string;
        actualValue?: string;
        screenshotId?: string;
        route?: string;
        metadata?: Record<string, unknown>;
      };

      const db = getDb();
      const session = db.prepare("SELECT id FROM ui_dive_sessions WHERE id = ?").get(sessionId);
      if (!session) return { error: true, message: `Session not found: ${sessionId}` };

      const id = genId("design");
      db.prepare(
        `INSERT INTO ui_dive_design_issues (id, session_id, component_id, issue_type, severity, title, description, element_selector, expected_value, actual_value, screenshot_id, route, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, sessionId, componentId ?? null, issueType, severity ?? "medium", title, description ?? null, elementSelector ?? null, expectedValue ?? null, actualValue ?? null, screenshotId ?? null, route ?? null, metadata ? JSON.stringify(metadata) : null);

      return {
        designIssueId: id,
        issueType,
        severity: severity ?? "medium",
        title,
        expectedValue: expectedValue ?? null,
        actualValue: actualValue ?? null,
        _hint: `Design issue tagged. View all issues in the dive report. Fix it, then track with dive_changelog.`,
      };
    },
  },

  // ── 5. Link UI component to backend context ───────────────────────────
  {
    name: "dive_link_backend",
    description:
      "Link a UI component to its backend dependencies. Connect components to API endpoints, Convex queries/mutations/actions, database tables, auth guards, WebSocket channels, or external services. This creates the full-stack traceability map — when a UI bug is found, you can immediately see which backend code is involved.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dive session ID" },
        componentId: { type: "string", description: "Component to link" },
        links: {
          type: "array",
          description: "Backend references to link",
          items: {
            type: "object",
            properties: {
              linkType: {
                type: "string",
                description: "Type: convex_query, convex_mutation, convex_action, api_endpoint, db_table, auth_guard, websocket, external_service, env_var, cron_job",
              },
              path: { type: "string", description: "Path/identifier (e.g. 'api.domains.documents.documents.getSidebar', '/api/users', 'documents' table)" },
              description: { type: "string", description: "What this backend dependency does for the component" },
              method: { type: "string", description: "HTTP method for API endpoints (GET, POST, etc.)" },
            },
            required: ["linkType", "path"],
          },
        },
      },
      required: ["sessionId", "componentId", "links"],
    },
    handler: async (args) => {
      const { sessionId, componentId, links } = args as {
        sessionId: string;
        componentId: string;
        links: Array<{
          linkType: string;
          path: string;
          description?: string;
          method?: string;
        }>;
      };

      const db = getDb();
      const session = db.prepare("SELECT id FROM ui_dive_sessions WHERE id = ?").get(sessionId);
      if (!session) return { error: true, message: `Session not found: ${sessionId}` };
      const comp = db.prepare("SELECT id, name FROM ui_dive_components WHERE id = ?").get(componentId) as any;
      if (!comp) return { error: true, message: `Component not found: ${componentId}` };

      const ids: string[] = [];
      for (const link of links) {
        const id = genId("blink");
        db.prepare(
          `INSERT INTO ui_dive_backend_links (id, session_id, component_id, link_type, path, description, method)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(id, sessionId, componentId, link.linkType, link.path, link.description ?? null, link.method ?? null);
        ids.push(id);
      }

      return {
        componentId,
        componentName: comp.name,
        linksCreated: ids.length,
        links: links.map((l, i) => ({ linkId: ids[i], ...l })),
        _hint: `${ids.length} backend link(s) created for ${comp.name}. These will appear in the dive report and walkthrough.`,
      };
    },
  },

  // ── 6. Track a change (changelog entry) ───────────────────────────────
  {
    name: "dive_changelog",
    description:
      "Record a change made to fix a bug, design issue, or improve a component. Links before/after screenshots to show what changed visually. Optionally references git commits and changed files. When the dive is re-run after fixes, the changelog provides a clear audit trail of what was wrong, what was changed, and how it looks now.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dive session ID" },
        componentId: { type: "string", description: "Component that was changed (optional)" },
        changeType: {
          type: "string",
          description: "Type: bugfix, design_fix, feature, refactor, accessibility, performance, content, responsive",
        },
        description: { type: "string", description: "What was changed and why" },
        beforeScreenshotId: { type: "string", description: "Screenshot before the change (from dive_save_screenshot)" },
        afterScreenshotId: { type: "string", description: "Screenshot after the change" },
        filesChanged: {
          type: "array",
          description: "List of files that were modified",
          items: { type: "string" },
        },
        gitCommit: { type: "string", description: "Git commit hash (optional)" },
        metadata: { type: "object", description: "Additional context (e.g. { bugId: '...', designIssueId: '...' })" },
      },
      required: ["sessionId", "changeType", "description"],
    },
    handler: async (args) => {
      const { sessionId, componentId, changeType, description, beforeScreenshotId, afterScreenshotId, filesChanged, gitCommit, metadata } = args as {
        sessionId: string;
        componentId?: string;
        changeType: string;
        description: string;
        beforeScreenshotId?: string;
        afterScreenshotId?: string;
        filesChanged?: string[];
        gitCommit?: string;
        metadata?: Record<string, unknown>;
      };

      const db = getDb();
      const session = db.prepare("SELECT id FROM ui_dive_sessions WHERE id = ?").get(sessionId);
      if (!session) return { error: true, message: `Session not found: ${sessionId}` };

      const id = genId("chg");
      db.prepare(
        `INSERT INTO ui_dive_changelogs (id, session_id, component_id, change_type, description, before_screenshot_id, after_screenshot_id, files_changed, git_commit, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, sessionId, componentId ?? null, changeType, description, beforeScreenshotId ?? null, afterScreenshotId ?? null, filesChanged ? JSON.stringify(filesChanged) : null, gitCommit ?? null, metadata ? JSON.stringify(metadata) : null);

      return {
        changelogId: id,
        changeType,
        description,
        beforeScreenshotId: beforeScreenshotId ?? null,
        afterScreenshotId: afterScreenshotId ?? null,
        filesChanged: filesChanged ?? [],
        gitCommit: gitCommit ?? null,
        _hint: "Changelog entry recorded. It will appear in the dive report and walkthrough.",
      };
    },
  },

  // ── 7. Generate a complete walkthrough ────────────────────────────────
  {
    name: "dive_walkthrough",
    description:
      "Generate a comprehensive page-by-page, component-by-component walkthrough document for a dive session. Includes: route map with source files, component tree, interaction test results with pass/fail per step, screenshots referenced at each point, design issues found, backend dependencies, console errors, and changelog entries. This is the final deliverable — a complete QA document that an agent or human can review.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dive session ID" },
        format: {
          type: "string",
          description: "Output format: markdown (readable), json (structured), summary (condensed)",
          enum: ["markdown", "json", "summary"],
        },
        includeScreenshotPaths: {
          type: "boolean",
          description: "Include file paths to screenshots (default: true)",
        },
      },
      required: ["sessionId"],
    },
    handler: async (args) => {
      const { sessionId, format, includeScreenshotPaths } = args as {
        sessionId: string;
        format?: "markdown" | "json" | "summary";
        includeScreenshotPaths?: boolean;
      };

      const db = getDb();
      const session = db.prepare("SELECT * FROM ui_dive_sessions WHERE id = ?").get(sessionId) as any;
      if (!session) return { error: true, message: `Session not found: ${sessionId}` };

      const components = db.prepare("SELECT * FROM ui_dive_components WHERE session_id = ? ORDER BY created_at").all(sessionId) as any[];
      const bugs = db.prepare("SELECT * FROM ui_dive_bugs WHERE session_id = ? ORDER BY severity, created_at").all(sessionId) as any[];
      const screenshots = db.prepare("SELECT * FROM ui_dive_screenshots WHERE session_id = ? ORDER BY created_at").all(sessionId) as any[];
      const tests = db.prepare("SELECT * FROM ui_dive_interaction_tests WHERE session_id = ? ORDER BY created_at").all(sessionId) as any[];
      const designIssues = db.prepare("SELECT * FROM ui_dive_design_issues WHERE session_id = ? ORDER BY severity, created_at").all(sessionId) as any[];
      const backendLinks = db.prepare("SELECT * FROM ui_dive_backend_links WHERE session_id = ? ORDER BY component_id").all(sessionId) as any[];
      const changelogs = db.prepare("SELECT * FROM ui_dive_changelogs WHERE session_id = ? ORDER BY created_at").all(sessionId) as any[];

      // Load test steps for each test
      const testSteps: Record<string, any[]> = {};
      for (const test of tests) {
        testSteps[test.id] = db.prepare("SELECT * FROM ui_dive_test_steps WHERE test_id = ? ORDER BY step_index").all(test.id) as any[];
      }

      // Group components by route (from metadata)
      const routeGroups = new Map<string, any[]>();
      for (const comp of components) {
        const meta = comp.metadata ? JSON.parse(comp.metadata) : {};
        const route = meta.route ?? "(unrouted)";
        if (!routeGroups.has(route)) routeGroups.set(route, []);
        routeGroups.get(route)!.push({ ...comp, _meta: meta });
      }

      if (format === "json") {
        return {
          session: {
            id: session.id,
            appUrl: session.app_url,
            appName: session.app_name,
            status: session.status,
            createdAt: session.created_at,
          },
          stats: {
            routes: routeGroups.size,
            components: components.length,
            bugs: bugs.length,
            screenshots: screenshots.length,
            tests: tests.length,
            testsPassed: tests.filter((t: any) => t.status === "passed").length,
            testsFailed: tests.filter((t: any) => t.status === "failed").length,
            designIssues: designIssues.length,
            backendLinks: backendLinks.length,
            changelogs: changelogs.length,
          },
          routes: Object.fromEntries([...routeGroups.entries()].map(([route, comps]) => [
            route,
            {
              components: comps.map(c => ({
                id: c.id,
                name: c.name,
                type: c.component_type,
                status: c.status,
                sourceFiles: c._meta.sourceFiles ?? [],
                bugs: bugs.filter(b => b.component_id === c.id).map(b => ({ id: b.id, severity: b.severity, title: b.title })),
                backendLinks: backendLinks.filter(l => l.component_id === c.id).map(l => ({ type: l.link_type, path: l.path })),
                tests: tests.filter(t => t.component_id === c.id).map(t => ({
                  id: t.id,
                  name: t.test_name,
                  status: t.status,
                  passed: t.steps_passed,
                  failed: t.steps_failed,
                  total: t.steps_total,
                  steps: (testSteps[t.id] ?? []).map(s => ({
                    index: s.step_index,
                    action: s.action,
                    expected: s.expected,
                    actual: s.actual,
                    status: s.status,
                    screenshotId: s.screenshot_id,
                  })),
                })),
              })),
              designIssues: designIssues.filter(d => comps.some(c => c.id === d.component_id)).map(d => ({
                id: d.id,
                type: d.issue_type,
                severity: d.severity,
                title: d.title,
                expected: d.expected_value,
                actual: d.actual_value,
              })),
            },
          ])),
          changelogs: changelogs.map(c => ({
            id: c.id,
            type: c.change_type,
            description: c.description,
            filesChanged: c.files_changed ? JSON.parse(c.files_changed) : [],
            gitCommit: c.git_commit,
          })),
          screenshots: includeScreenshotPaths !== false
            ? screenshots.map(s => ({ id: s.id, label: s.label, filePath: s.file_path, route: s.route }))
            : undefined,
        };
      }

      // Markdown format
      const lines: string[] = [];
      lines.push(`# UI/UX Dive Walkthrough: ${session.app_name ?? session.app_url}`);
      lines.push(`**Session:** ${session.id}  `);
      lines.push(`**URL:** ${session.app_url}  `);
      lines.push(`**Date:** ${session.created_at}  `);
      lines.push(`**Status:** ${session.status}\n`);

      // Stats
      lines.push("## Summary\n");
      lines.push(`| Metric | Value |`);
      lines.push(`|--------|-------|`);
      lines.push(`| Routes | ${routeGroups.size} |`);
      lines.push(`| Components | ${components.length} |`);
      lines.push(`| Interaction Tests | ${tests.length} (${tests.filter((t: any) => t.status === "passed").length} passed, ${tests.filter((t: any) => t.status === "failed").length} failed) |`);
      lines.push(`| Bugs | ${bugs.length} |`);
      lines.push(`| Design Issues | ${designIssues.length} |`);
      lines.push(`| Screenshots | ${screenshots.length} |`);
      lines.push(`| Backend Links | ${backendLinks.length} |`);
      lines.push(`| Changelogs | ${changelogs.length} |`);
      lines.push("");

      // Route-by-route walkthrough
      lines.push("## Route-by-Route Walkthrough\n");
      for (const [route, comps] of routeGroups) {
        const sourceFiles = comps[0]?._meta?.sourceFiles ?? [];
        lines.push(`### ${route}\n`);
        if (sourceFiles.length > 0) lines.push(`**Source files:** ${sourceFiles.join(", ")}  `);
        lines.push(`**Components:** ${comps.length}\n`);

        for (const comp of comps) {
          lines.push(`#### ${comp.name} (${comp.component_type})`);
          lines.push(`- **Status:** ${comp.status}`);
          lines.push(`- **Interactions:** ${comp.interaction_count}`);

          // Backend links
          const compLinks = backendLinks.filter(l => l.component_id === comp.id);
          if (compLinks.length > 0) {
            lines.push(`- **Backend dependencies:**`);
            for (const link of compLinks) {
              lines.push(`  - \`[${link.link_type}]\` ${link.path}${link.description ? ` -- ${link.description}` : ""}`);
            }
          }

          // Tests for this component
          const compTests = tests.filter(t => t.component_id === comp.id);
          if (compTests.length > 0) {
            lines.push(`\n**Interaction Tests:**\n`);
            for (const test of compTests) {
              const icon = test.status === "passed" ? "PASS" : test.status === "failed" ? "FAIL" : "PENDING";
              lines.push(`##### [${icon}] ${test.test_name}`);
              if (test.description) lines.push(`${test.description}`);
              if (test.preconditions) {
                const preconds = JSON.parse(test.preconditions);
                lines.push(`\n**Preconditions:**`);
                for (const p of preconds) lines.push(`- ${p}`);
              }
              lines.push(`\n| Step | Action | Expected | Actual | Status | Screenshot |`);
              lines.push(`|------|--------|----------|--------|--------|------------|`);
              for (const step of (testSteps[test.id] ?? [])) {
                const stepIcon = step.status === "passed" ? "PASS" : step.status === "failed" ? "FAIL" : step.status;
                const ssRef = step.screenshot_id ?? "-";
                lines.push(`| ${step.step_index} | ${step.action} ${step.target ?? ""} | ${step.expected ?? ""} | ${step.actual ?? "-"} | ${stepIcon} | ${ssRef} |`);
              }
              lines.push("");
            }
          }

          // Bugs
          const compBugs = bugs.filter(b => b.component_id === comp.id);
          if (compBugs.length > 0) {
            lines.push(`\n**Bugs:**\n`);
            for (const bug of compBugs) {
              lines.push(`- **[${bug.severity.toUpperCase()}]** ${bug.title}`);
              if (bug.description) lines.push(`  ${bug.description}`);
              if (bug.screenshot_ref) lines.push(`  Screenshot: ${bug.screenshot_ref}`);
            }
          }

          lines.push("");
        }

        // Design issues for this route
        const routeDesignIssues = designIssues.filter(d => d.route === route);
        if (routeDesignIssues.length > 0) {
          lines.push(`**Design Issues on ${route}:**\n`);
          for (const issue of routeDesignIssues) {
            lines.push(`- **[${issue.severity.toUpperCase()}] ${issue.issue_type}:** ${issue.title}`);
            if (issue.expected_value || issue.actual_value) {
              lines.push(`  Expected: ${issue.expected_value ?? "?"} | Actual: ${issue.actual_value ?? "?"}`);
            }
          }
          lines.push("");
        }
      }

      // Changelog
      if (changelogs.length > 0) {
        lines.push("## Changelog\n");
        for (const chg of changelogs) {
          lines.push(`### [${chg.change_type}] ${chg.description}`);
          if (chg.files_changed) {
            const files = JSON.parse(chg.files_changed);
            lines.push(`**Files changed:** ${files.join(", ")}`);
          }
          if (chg.git_commit) lines.push(`**Commit:** ${chg.git_commit}`);
          if (chg.before_screenshot_id || chg.after_screenshot_id) {
            lines.push(`**Before:** ${chg.before_screenshot_id ?? "-"} | **After:** ${chg.after_screenshot_id ?? "-"}`);
          }
          lines.push("");
        }
      }

      const markdown = lines.join("\n");

      return {
        format: "markdown",
        walkthrough: format === "summary" ? markdown.slice(0, 3000) : markdown,
        stats: {
          routes: routeGroups.size,
          components: components.length,
          tests: tests.length,
          bugs: bugs.length,
          designIssues: designIssues.length,
          screenshots: screenshots.length,
          backendLinks: backendLinks.length,
          changelogs: changelogs.length,
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // v3 FLYWHEEL TOOLS — Bug→Code→Fix→Verify→Reexplore→Test→Review
  // ═══════════════════════════════════════════════════════════════════════

  // ── 8. Locate bug/component in codebase ────────────────────────────────
  {
    name: "dive_code_locate",
    description:
      "Find the exact source code location for a bug, component, or design issue. Uses grep/ripgrep to search the project codebase for the relevant code. Maps UI bugs to file:line so you know exactly where to fix. Stores the location in the DB linked to the bug/component for the full traceability chain: UI element → bug → source file:line → fix → verify.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dive session ID" },
        projectPath: { type: "string", description: "Absolute path to the project root" },
        bugId: { type: "string", description: "Bug to locate code for (optional)" },
        componentId: { type: "string", description: "Component to locate code for (optional)" },
        designIssueId: { type: "string", description: "Design issue to locate (optional)" },
        searchQueries: {
          type: "array",
          description: "Strings to grep for in the codebase (e.g. ['NaN%', 'tokenUsage', 'CostDashboard']). Multiple queries are tried in order; first match wins.",
          items: { type: "string" },
        },
        filePatterns: {
          type: "array",
          description: "Glob patterns to limit search scope (e.g. ['*.tsx', '*.ts']). Default: ['*.tsx', '*.ts', '*.jsx', '*.js']",
          items: { type: "string" },
        },
        contextLines: { type: "number", description: "Lines of context around match (default: 3)" },
      },
      required: ["sessionId", "projectPath", "searchQueries"],
    },
    handler: async (args) => {
      const {
        sessionId, projectPath, bugId, componentId, designIssueId,
        searchQueries, filePatterns, contextLines,
      } = args as {
        sessionId: string;
        projectPath: string;
        bugId?: string;
        componentId?: string;
        designIssueId?: string;
        searchQueries: string[];
        filePatterns?: string[];
        contextLines?: number;
      };

      const db = getDb();
      const session = db.prepare("SELECT id FROM ui_dive_sessions WHERE id = ?").get(sessionId);
      if (!session) return { error: true, message: `Session not found: ${sessionId}` };

      if (!existsSync(projectPath)) return { error: true, message: `Project path not found: ${projectPath}` };

      const exts = filePatterns ?? ["*.tsx", "*.ts", "*.jsx", "*.js"];
      const ctx = contextLines ?? 3;
      const locations: Array<{ file: string; lineStart: number; lineEnd: number; snippet: string; query: string; confidence: string }> = [];

      for (const query of searchQueries) {
        if (locations.length >= 10) break; // cap results

        // Try ripgrep first, fall back to findstr on Windows
        const includeFlags = exts.map(e => `--include="${e}"`).join(" ");
        const cmd = process.platform === "win32"
          ? `rg -n -C ${ctx} --no-heading ${includeFlags} "${query.replace(/"/g, '\\"')}" "${projectPath}" 2>nul || findstr /s /n /c:"${query.replace(/"/g, "")}" "${projectPath}\\src\\*.ts" "${projectPath}\\src\\*.tsx" 2>nul`
          : `rg -n -C ${ctx} --no-heading ${includeFlags} "${query.replace(/"/g, '\\"')}" "${projectPath}" 2>/dev/null || grep -rnH --include='*.ts' --include='*.tsx' "${query}" "${projectPath}/src" 2>/dev/null`;

        try {
          const output = execSync(cmd, { encoding: "utf-8", maxBuffer: 1024 * 1024, timeout: 15000 }).trim();
          if (!output) continue;

          // Parse ripgrep output: filename:lineNum:content or filename-lineNum-content (context)
          const fileMatches = new Map<string, { lines: number[]; content: string[] }>();
          for (const line of output.split("\n").slice(0, 100)) {
            const m = line.match(/^(.+?)[:\-](\d+)[:\-](.*)$/);
            if (m) {
              const [, file, lineStr, content] = m;
              const lineNum = parseInt(lineStr, 10);
              const normalized = file.replace(/\\/g, "/");
              if (!fileMatches.has(normalized)) fileMatches.set(normalized, { lines: [], content: [] });
              const entry = fileMatches.get(normalized)!;
              entry.lines.push(lineNum);
              entry.content.push(`${lineNum}: ${content}`);
            }
          }

          for (const [file, { lines: lineNums, content }] of fileMatches) {
            if (locations.length >= 10) break;
            const lineStart = Math.min(...lineNums);
            const lineEnd = Math.max(...lineNums);
            const snippet = content.slice(0, 15).join("\n");
            locations.push({
              file,
              lineStart,
              lineEnd,
              snippet,
              query,
              confidence: "high",
            });
          }
        } catch {
          // grep/rg failed or timed out — try next query
          continue;
        }
      }

      // Store in DB
      const storedIds: string[] = [];
      for (const loc of locations) {
        const id = genId("cloc");
        db.prepare(
          `INSERT INTO ui_dive_code_locations (id, session_id, bug_id, component_id, design_issue_id, file_path, line_start, line_end, code_snippet, search_query, confidence)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(id, sessionId, bugId ?? null, componentId ?? null, designIssueId ?? null, loc.file, loc.lineStart, loc.lineEnd, loc.snippet, loc.query, loc.confidence);
        storedIds.push(id);
      }

      return {
        locationsFound: locations.length,
        locations: locations.map((l, i) => ({
          id: storedIds[i],
          file: l.file,
          lines: `${l.lineStart}-${l.lineEnd}`,
          query: l.query,
          confidence: l.confidence,
          snippet: l.snippet.slice(0, 500),
        })),
        linkedTo: { bugId: bugId ?? null, componentId: componentId ?? null, designIssueId: designIssueId ?? null },
        _hint: locations.length > 0
          ? `Found ${locations.length} code location(s). Fix the code, then verify with dive_fix_verify({ bugId, route, fixDescription }).`
          : `No matches found. Try different search queries or broader file patterns.`,
        _workflow: [
          "1. Review the code snippets above to understand the root cause",
          "2. Fix the code in your editor",
          "3. Verify: dive_fix_verify({ sessionId, bugId, route, fixDescription, filesChanged })",
          "4. Generate regression test: dive_generate_tests({ sessionId, bugId })",
          "5. Re-explore: dive_reexplore({ sessionId, route }) to check for regressions",
        ],
      };
    },
  },

  // ── 9. Fix + Verify flywheel ───────────────────────────────────────────
  {
    name: "dive_fix_verify",
    description:
      "After fixing a bug, verify the fix by re-navigating to the affected route, comparing before/after state, and updating the bug status + changelog. This is the core flywheel step: Bug tagged → Code located → Code fixed → Fix verified → Changelog updated → Bug marked resolved. The agent should navigate to the route via Playwright, take a new screenshot, and pass the results here.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dive session ID" },
        bugId: { type: "string", description: "Bug ID being fixed" },
        route: { type: "string", description: "Route to re-navigate to for verification" },
        fixDescription: { type: "string", description: "What was changed to fix the bug" },
        filesChanged: {
          type: "array",
          description: "Files that were modified",
          items: { type: "string" },
        },
        gitCommit: { type: "string", description: "Git commit hash for the fix (optional)" },
        beforeScreenshotId: { type: "string", description: "Screenshot ID from before the fix (optional)" },
        afterScreenshotId: { type: "string", description: "Screenshot ID from after the fix (optional)" },
        verified: {
          type: "boolean",
          description: "Whether the fix was visually/functionally verified (default: false until agent confirms)",
        },
        verificationNotes: { type: "string", description: "Notes from the verification (what the agent observed)" },
      },
      required: ["sessionId", "bugId", "fixDescription"],
    },
    handler: async (args) => {
      const {
        sessionId, bugId, route, fixDescription, filesChanged,
        gitCommit, beforeScreenshotId, afterScreenshotId, verified, verificationNotes,
      } = args as {
        sessionId: string;
        bugId: string;
        route?: string;
        fixDescription: string;
        filesChanged?: string[];
        gitCommit?: string;
        beforeScreenshotId?: string;
        afterScreenshotId?: string;
        verified?: boolean;
        verificationNotes?: string;
      };

      const db = getDb();
      const session = db.prepare("SELECT id FROM ui_dive_sessions WHERE id = ?").get(sessionId);
      if (!session) return { error: true, message: `Session not found: ${sessionId}` };

      const bug = db.prepare("SELECT id, title, severity, component_id, status FROM ui_dive_bugs WHERE id = ?").get(bugId) as any;
      if (!bug) return { error: true, message: `Bug not found: ${bugId}` };

      // Create fix verification record
      const verifyId = genId("fxv");
      db.prepare(
        `INSERT INTO ui_dive_fix_verifications (id, session_id, bug_id, route, before_screenshot_id, after_screenshot_id, fix_description, files_changed, git_commit, verified, verification_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(verifyId, sessionId, bugId, route ?? null, beforeScreenshotId ?? null, afterScreenshotId ?? null, fixDescription, filesChanged ? JSON.stringify(filesChanged) : null, gitCommit ?? null, verified ? 1 : 0, verificationNotes ?? null);

      // Auto-create changelog entry
      const changelogId = genId("chg");
      db.prepare(
        `INSERT INTO ui_dive_changelogs (id, session_id, component_id, change_type, description, before_screenshot_id, after_screenshot_id, files_changed, git_commit, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(changelogId, sessionId, bug.component_id ?? null, "bugfix", `[${bug.severity}] ${bug.title}: ${fixDescription}`, beforeScreenshotId ?? null, afterScreenshotId ?? null, filesChanged ? JSON.stringify(filesChanged) : null, gitCommit ?? null, JSON.stringify({ bugId, verificationId: verifyId }));

      // Update fix verification with changelog link
      db.prepare("UPDATE ui_dive_fix_verifications SET changelog_id = ? WHERE id = ?").run(changelogId, verifyId);

      // If verified, update bug status
      if (verified) {
        db.prepare("UPDATE ui_dive_bugs SET status = 'resolved' WHERE id = ?").run(bugId);
      }

      return {
        verificationId: verifyId,
        bugId,
        bugTitle: bug.title,
        bugSeverity: bug.severity,
        verified: verified ?? false,
        changelogId,
        filesChanged: filesChanged ?? [],
        gitCommit: gitCommit ?? null,
        bugStatus: verified ? "resolved" : "pending_verification",
        _hint: verified
          ? `Bug "${bug.title}" marked as RESOLVED. Changelog entry created. Next: dive_reexplore to check for regressions, then dive_generate_tests for a regression test.`
          : `Fix recorded but NOT yet verified. Navigate to ${route ?? "the affected route"} and confirm the fix, then call again with verified: true.`,
        _flywheel: [
          "✅ Bug tagged",
          "✅ Code located",
          "✅ Code fixed",
          verified ? "✅ Fix verified" : "⏳ Fix pending verification",
          "✅ Changelog updated",
          verified ? "✅ Bug resolved" : "⏳ Bug pending",
          "→ Next: dive_reexplore({ route }) to check for regressions",
          "→ Next: dive_generate_tests({ bugId }) for regression test",
          "→ Next: dive_code_review({ sessionId }) for full review",
        ],
      };
    },
  },

  // ── 10. Re-explore a route after changes ───────────────────────────────
  {
    name: "dive_reexplore",
    description:
      "Re-traverse a route after code changes to detect regressions and verify fixes. Compares the current state against previously registered components, bugs, and test results for that route. The agent should navigate to the route first (via Playwright), take a fresh snapshot/screenshot, then call this tool with what they observe. It diffs against the prior state and flags any new issues or confirms fixes.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dive session ID" },
        route: { type: "string", description: "Route being re-explored (e.g. '/cost')" },
        currentState: {
          type: "object",
          description: "What the agent currently observes",
          properties: {
            componentsVisible: {
              type: "array",
              description: "Component names still visible on the page",
              items: { type: "string" },
            },
            newIssues: {
              type: "array",
              description: "Any new issues noticed (regressions)",
              items: { type: "string" },
            },
            fixedIssues: {
              type: "array",
              description: "Previously tagged bugs/issues that are now fixed",
              items: { type: "string" },
            },
            consoleErrors: {
              type: "array",
              description: "Console errors observed",
              items: { type: "string" },
            },
            notes: { type: "string", description: "General observations" },
          },
        },
        afterScreenshotId: { type: "string", description: "Screenshot taken during re-exploration" },
      },
      required: ["sessionId", "route", "currentState"],
    },
    handler: async (args) => {
      const { sessionId, route, currentState, afterScreenshotId } = args as {
        sessionId: string;
        route: string;
        currentState: {
          componentsVisible?: string[];
          newIssues?: string[];
          fixedIssues?: string[];
          consoleErrors?: string[];
          notes?: string;
        };
        afterScreenshotId?: string;
      };

      const db = getDb();
      const session = db.prepare("SELECT id FROM ui_dive_sessions WHERE id = ?").get(sessionId);
      if (!session) return { error: true, message: `Session not found: ${sessionId}` };

      // Find components on this route
      const allComponents = db.prepare("SELECT * FROM ui_dive_components WHERE session_id = ?").all(sessionId) as any[];
      const routeComponents = allComponents.filter(c => {
        const meta = c.metadata ? JSON.parse(c.metadata) : {};
        return meta.route === route;
      });

      // Find bugs on this route
      const routeComponentIds = routeComponents.map(c => c.id);
      const routeBugs = routeComponentIds.length > 0
        ? db.prepare(
            `SELECT * FROM ui_dive_bugs WHERE component_id IN (${routeComponentIds.map(() => "?").join(",")}) ORDER BY severity`
          ).all(...routeComponentIds) as any[]
        : [];

      // Find design issues on this route
      const routeDesignIssues = db.prepare(
        "SELECT * FROM ui_dive_design_issues WHERE session_id = ? AND route = ?"
      ).all(sessionId, route) as any[];

      // Previous fix verifications for bugs on this route
      const bugIds = routeBugs.map(b => b.id);
      const verifications = bugIds.length > 0
        ? db.prepare(
            `SELECT * FROM ui_dive_fix_verifications WHERE bug_id IN (${bugIds.map(() => "?").join(",")}) ORDER BY created_at DESC`
          ).all(...bugIds) as any[]
        : [];

      // Diff analysis
      const previousComponents = routeComponents.map(c => c.name);
      const missingComponents = previousComponents.filter(
        name => !(currentState.componentsVisible ?? []).includes(name)
      );
      const newComponents = (currentState.componentsVisible ?? []).filter(
        name => !previousComponents.includes(name)
      );

      const openBugs = routeBugs.filter(b => b.status !== "resolved");
      const resolvedBugs = routeBugs.filter(b => b.status === "resolved");

      const regressions: string[] = [];
      if (missingComponents.length > 0) {
        regressions.push(`${missingComponents.length} component(s) disappeared: ${missingComponents.join(", ")}`);
      }
      if ((currentState.consoleErrors ?? []).length > 0) {
        regressions.push(`${currentState.consoleErrors!.length} console error(s) detected`);
      }
      if ((currentState.newIssues ?? []).length > 0) {
        regressions.push(...(currentState.newIssues ?? []).map(i => `New issue: ${i}`));
      }

      const regressionFree = regressions.length === 0;

      return {
        route,
        diff: {
          previousComponents: previousComponents.length,
          currentComponents: (currentState.componentsVisible ?? []).length,
          missingComponents,
          newComponents,
          openBugs: openBugs.length,
          resolvedBugs: resolvedBugs.length,
          designIssues: routeDesignIssues.length,
          fixVerifications: verifications.length,
        },
        regressions,
        regressionFree,
        fixedIssues: currentState.fixedIssues ?? [],
        consoleErrors: currentState.consoleErrors ?? [],
        afterScreenshotId: afterScreenshotId ?? null,
        _status: regressionFree
          ? `✅ Route ${route} is regression-free. ${openBugs.length} open bug(s) remain.`
          : `⚠️ ${regressions.length} regression(s) detected on ${route}. Investigate before proceeding.`,
        _hint: regressionFree
          ? openBugs.length > 0
            ? `Route clean but ${openBugs.length} bug(s) still open: ${openBugs.map(b => b.title).join("; ")}. Fix them and re-verify.`
            : `Route fully clean! Generate a regression test: dive_generate_tests({ sessionId, route: "${route}" })`
          : `Regressions found — fix them before generating tests. Tag new bugs with tag_ui_bug.`,
      };
    },
  },

  // ── 11. Generate regression tests from bugs/interactions ───────────────
  {
    name: "dive_generate_tests",
    description:
      "Generate Playwright regression test code from dive findings. Creates test cases from: bugs (verify the fix holds), interaction tests (replay the sequence), design issues (visual regression checks), and component assertions (verify component presence). The generated code can be saved to a test file and run with 'npx playwright test'. This closes the quality loop: UI bug → fix → regression test → CI protection.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dive session ID" },
        bugId: { type: "string", description: "Generate test for a specific bug fix (optional)" },
        componentId: { type: "string", description: "Generate tests for a specific component (optional)" },
        testId: { type: "string", description: "Generate from an existing interaction test (optional)" },
        route: { type: "string", description: "Generate tests for all findings on a route (optional)" },
        appUrl: { type: "string", description: "App URL for the test (default: session's app_url)" },
        outputPath: { type: "string", description: "File path to save the generated test (optional)" },
        framework: {
          type: "string",
          description: "Test framework: playwright (default), cypress, vitest",
          enum: ["playwright", "cypress", "vitest"],
        },
      },
      required: ["sessionId"],
    },
    handler: async (args) => {
      const { sessionId, bugId, componentId, testId, route, appUrl, outputPath, framework } = args as {
        sessionId: string;
        bugId?: string;
        componentId?: string;
        testId?: string;
        route?: string;
        appUrl?: string;
        outputPath?: string;
        framework?: string;
      };

      const db = getDb();
      const session = db.prepare("SELECT * FROM ui_dive_sessions WHERE id = ?").get(sessionId) as any;
      if (!session) return { error: true, message: `Session not found: ${sessionId}` };

      const baseUrl = appUrl ?? session.app_url;
      const fw = framework ?? "playwright";
      const testBlocks: string[] = [];
      const covers: string[] = [];

      // Gather bugs to cover
      let bugs: any[] = [];
      if (bugId) {
        const bug = db.prepare("SELECT * FROM ui_dive_bugs WHERE id = ?").get(bugId);
        if (bug) bugs = [bug];
      } else if (componentId) {
        bugs = db.prepare("SELECT * FROM ui_dive_bugs WHERE component_id = ?").all(componentId) as any[];
      } else if (route) {
        const comps = db.prepare("SELECT * FROM ui_dive_components WHERE session_id = ?").all(sessionId) as any[];
        const routeCompIds = comps.filter(c => {
          const meta = c.metadata ? JSON.parse(c.metadata) : {};
          return meta.route === route;
        }).map(c => c.id);
        if (routeCompIds.length > 0) {
          bugs = db.prepare(
            `SELECT * FROM ui_dive_bugs WHERE component_id IN (${routeCompIds.map(() => "?").join(",")})`
          ).all(...routeCompIds) as any[];
        }
      } else {
        bugs = db.prepare("SELECT * FROM ui_dive_bugs WHERE session_id = ?").all(sessionId) as any[];
      }

      // Generate bug regression tests
      for (const bug of bugs) {
        const comp = db.prepare("SELECT * FROM ui_dive_components WHERE id = ?").get(bug.component_id) as any;
        const meta = comp?.metadata ? JSON.parse(comp.metadata) : {};
        const bugRoute = meta.route ?? "/";

        testBlocks.push(`  test('regression: ${bug.title.replace(/'/g, "\\'")}', async ({ page }) => {
    await page.goto('${baseUrl}${bugRoute}');
    await page.waitForLoadState('networkidle');

    // Bug: ${bug.description ?? bug.title}
    // Severity: ${bug.severity} | Category: ${bug.category}
    ${bug.expected ? `// Expected: ${bug.expected}` : ""}
    ${bug.actual ? `// Was: ${bug.actual}` : ""}

    // TODO: Add specific assertions to verify the fix holds
    // Example: await expect(page.locator('.token-percentage')).not.toContainText('NaN');
    await expect(page).not.toContainText('Something went wrong');
  });`);
        covers.push(`bug:${bug.id}:${bug.title}`);
      }

      // Generate from interaction tests
      let interactionTests: any[] = [];
      if (testId) {
        const t = db.prepare("SELECT * FROM ui_dive_interaction_tests WHERE id = ?").get(testId);
        if (t) interactionTests = [t];
      } else if (!bugId && !componentId) {
        interactionTests = db.prepare("SELECT * FROM ui_dive_interaction_tests WHERE session_id = ?").all(sessionId) as any[];
      }

      for (const test of interactionTests) {
        const steps = db.prepare("SELECT * FROM ui_dive_test_steps WHERE test_id = ? ORDER BY step_index").all(test.id) as any[];
        const comp = db.prepare("SELECT * FROM ui_dive_components WHERE id = ?").get(test.component_id) as any;
        const meta = comp?.metadata ? JSON.parse(comp.metadata) : {};
        const testRoute = meta.route ?? "/";

        const stepCode = steps.map(s => {
          const comment = `    // Step ${s.step_index}: ${s.action} ${s.target ?? ""} → ${s.expected}`;
          const assertion = s.status === "failed"
            ? `    // FAILED: ${s.actual ?? "no actual recorded"}\n    // TODO: Verify this step now passes`
            : `    // PASSED: ${s.actual ?? ""}`;
          return `${comment}\n${assertion}`;
        }).join("\n\n");

        testBlocks.push(`  test('interaction: ${test.test_name.replace(/'/g, "\\'")}', async ({ page }) => {
    await page.goto('${baseUrl}${testRoute}');
    await page.waitForLoadState('networkidle');

${stepCode}
  });`);
        covers.push(`test:${test.id}:${test.test_name}`);
      }

      // Assemble full test file
      const testCode = fw === "playwright"
        ? `import { test, expect } from '@playwright/test';

test.describe('UI Dive Regression Tests — ${session.app_name ?? baseUrl}', () => {
${testBlocks.join("\n\n")}
});
`
        : `// Generated ${fw} tests — adapt as needed\n${testBlocks.join("\n\n")}`;

      // Save to file if requested
      if (outputPath) {
        try {
          mkdirSync(join(outputPath, ".."), { recursive: true });
          writeFileSync(outputPath, testCode, "utf-8");
        } catch (e: any) {
          return { error: true, message: `Failed to write test file: ${e.message}` };
        }
      }

      // Store in DB
      const genTestId = genId("gtest");
      db.prepare(
        `INSERT INTO ui_dive_generated_tests (id, session_id, bug_id, component_id, test_id, test_framework, test_code, test_file_path, description, covers)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(genTestId, sessionId, bugId ?? null, componentId ?? null, testId ?? null, fw, testCode, outputPath ?? null,
        `Generated ${testBlocks.length} test(s) from dive findings`, JSON.stringify(covers));

      return {
        generatedTestId: genTestId,
        framework: fw,
        testCount: testBlocks.length,
        covers,
        outputPath: outputPath ?? null,
        testCode: testCode.length > 5000 ? testCode.slice(0, 5000) + "\n// ... truncated" : testCode,
        _hint: outputPath
          ? `Test file saved to ${outputPath}. Run with: npx playwright test ${outputPath}`
          : `Test code generated (${testBlocks.length} tests). Save to a file with outputPath parameter, or copy the testCode above.`,
      };
    },
  },

  // ── 12. Produce structured code review from dive findings ──────────────
  {
    name: "dive_code_review",
    description:
      "Generate a structured code review report from all dive findings — similar to CodeRabbit or Augment Code Review. Aggregates bugs, design issues, interaction test failures, console errors, missing components, and backend link gaps into a prioritized review with severity, location, impact, and suggested fixes. Produces a score and recommendations. This is the quality gate: the dive findings become actionable review comments that can be posted to PRs or tracked as issues.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dive session ID" },
        reviewType: {
          type: "string",
          description: "Review scope: dive_findings (all), bugs_only, design_only, accessibility, performance",
          enum: ["dive_findings", "bugs_only", "design_only", "accessibility", "performance"],
        },
        includeCodeLocations: {
          type: "boolean",
          description: "Include code locations in review comments (default: true)",
        },
        format: {
          type: "string",
          description: "Output: markdown (readable), json (structured), github_comments (PR comment format)",
          enum: ["markdown", "json", "github_comments"],
        },
      },
      required: ["sessionId"],
    },
    handler: async (args) => {
      const { sessionId, reviewType, includeCodeLocations, format } = args as {
        sessionId: string;
        reviewType?: string;
        includeCodeLocations?: boolean;
        format?: string;
      };

      const db = getDb();
      const session = db.prepare("SELECT * FROM ui_dive_sessions WHERE id = ?").get(sessionId) as any;
      if (!session) return { error: true, message: `Session not found: ${sessionId}` };

      const bugs = db.prepare("SELECT * FROM ui_dive_bugs WHERE session_id = ? ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END").all(sessionId) as any[];
      const designIssues = db.prepare("SELECT * FROM ui_dive_design_issues WHERE session_id = ? ORDER BY severity").all(sessionId) as any[];
      const tests = db.prepare("SELECT * FROM ui_dive_interaction_tests WHERE session_id = ?").all(sessionId) as any[];
      const components = db.prepare("SELECT * FROM ui_dive_components WHERE session_id = ?").all(sessionId) as any[];
      const codeLocations = (includeCodeLocations !== false)
        ? db.prepare("SELECT * FROM ui_dive_code_locations WHERE session_id = ?").all(sessionId) as any[]
        : [];
      const verifications = db.prepare("SELECT * FROM ui_dive_fix_verifications WHERE session_id = ?").all(sessionId) as any[];
      const changelogs = db.prepare("SELECT * FROM ui_dive_changelogs WHERE session_id = ?").all(sessionId) as any[];

      // Build findings
      const findings: Array<{
        type: string;
        severity: string;
        title: string;
        description: string;
        location?: string;
        codeFile?: string;
        codeLine?: string;
        impact: string;
        suggestedFix: string;
        status: string;
      }> = [];

      const type = reviewType ?? "dive_findings";

      if (type === "dive_findings" || type === "bugs_only") {
        for (const bug of bugs) {
          const comp = components.find(c => c.id === bug.component_id);
          const meta = comp?.metadata ? JSON.parse(comp.metadata) : {};
          const loc = codeLocations.find(cl => cl.bug_id === bug.id);
          const verification = verifications.find(v => v.bug_id === bug.id);

          findings.push({
            type: "bug",
            severity: bug.severity,
            title: bug.title,
            description: bug.description ?? "",
            location: meta.route ? `Route: ${meta.route}, Component: ${comp?.name ?? "unknown"}` : undefined,
            codeFile: loc?.file_path ?? meta.sourceFiles?.[0],
            codeLine: loc ? `L${loc.line_start}-${loc.line_end}` : undefined,
            impact: bug.severity === "critical" ? "Blocks user flow entirely"
              : bug.severity === "high" ? "Major degraded experience"
              : bug.severity === "medium" ? "Noticeable quality issue"
              : "Minor polish item",
            suggestedFix: bug.expected ? `Change from "${bug.actual ?? "current"}" to "${bug.expected}"` : "See description",
            status: verification?.verified ? "resolved" : (bug.status ?? "open"),
          });
        }
      }

      if (type === "dive_findings" || type === "design_only") {
        for (const issue of designIssues) {
          findings.push({
            type: "design",
            severity: issue.severity,
            title: issue.title,
            description: issue.description ?? "",
            location: issue.route ? `Route: ${issue.route}` : undefined,
            codeFile: issue.element_selector,
            impact: issue.severity === "critical" ? "Broken user experience" : "Visual inconsistency",
            suggestedFix: issue.expected_value ? `Expected: ${issue.expected_value}, Got: ${issue.actual_value}` : "See description",
            status: "open",
          });
        }
      }

      // Failed tests
      if (type === "dive_findings") {
        const failedTests = tests.filter(t => t.status === "failed");
        for (const test of failedTests) {
          const failedSteps = db.prepare(
            "SELECT * FROM ui_dive_test_steps WHERE test_id = ? AND status = 'failed'"
          ).all(test.id) as any[];

          findings.push({
            type: "test_failure",
            severity: "high",
            title: `Test failed: ${test.test_name}`,
            description: failedSteps.map(s => `Step ${s.step_index}: Expected "${s.expected}", Got "${s.actual}"`).join("; "),
            impact: "Interaction flow broken",
            suggestedFix: "Fix the underlying component behavior, then re-run the test",
            status: "open",
          });
        }
      }

      // Severity counts
      const severityCounts = {
        critical: findings.filter(f => f.severity === "critical").length,
        high: findings.filter(f => f.severity === "high").length,
        medium: findings.filter(f => f.severity === "medium").length,
        low: findings.filter(f => f.severity === "low").length,
      };

      // Score: 100 - (critical*25 + high*10 + medium*5 + low*1)
      const rawScore = 100 - (severityCounts.critical * 25 + severityCounts.high * 10 + severityCounts.medium * 5 + severityCounts.low * 1);
      const score = Math.max(0, Math.min(100, rawScore));
      const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

      // Recommendations
      const recommendations: string[] = [];
      if (severityCounts.critical > 0) recommendations.push(`🔴 FIX IMMEDIATELY: ${severityCounts.critical} critical issue(s) blocking users`);
      if (severityCounts.high > 0) recommendations.push(`🟠 HIGH PRIORITY: ${severityCounts.high} high-severity issue(s)`);
      const openFindings = findings.filter(f => f.status === "open");
      const resolvedFindings = findings.filter(f => f.status === "resolved");
      if (resolvedFindings.length > 0) recommendations.push(`✅ ${resolvedFindings.length} issue(s) already resolved`);
      if (changelogs.length > 0) recommendations.push(`📋 ${changelogs.length} change(s) tracked in changelog`);
      const untested = components.filter(c => c.interaction_count === 0);
      if (untested.length > 0) recommendations.push(`🧪 ${untested.length} component(s) have zero interactions — consider adding tests`);

      // Build output
      let reviewOutput: string;
      if (format === "github_comments") {
        reviewOutput = findings.map(f => {
          const fileRef = f.codeFile ? `\`${f.codeFile}${f.codeLine ? `:${f.codeLine}` : ""}\`` : "";
          return `### [${f.severity.toUpperCase()}] ${f.title}\n${f.description}\n${fileRef ? `**File:** ${fileRef}` : ""}\n**Impact:** ${f.impact}\n**Suggested fix:** ${f.suggestedFix}\n**Status:** ${f.status}`;
        }).join("\n\n---\n\n");
      } else {
        const lines: string[] = [];
        lines.push(`# Code Review: ${session.app_name ?? session.app_url}`);
        lines.push(`**Score:** ${score}/100 (${grade})`);
        lines.push(`**Findings:** ${findings.length} (${openFindings.length} open, ${resolvedFindings.length} resolved)`);
        lines.push(`**Severity:** ${severityCounts.critical} critical, ${severityCounts.high} high, ${severityCounts.medium} medium, ${severityCounts.low} low\n`);

        if (recommendations.length > 0) {
          lines.push("## Recommendations\n");
          for (const r of recommendations) lines.push(`- ${r}`);
          lines.push("");
        }

        lines.push("## Findings\n");
        for (const f of findings) {
          const icon = f.severity === "critical" ? "🔴" : f.severity === "high" ? "🟠" : f.severity === "medium" ? "🟡" : "🔵";
          lines.push(`### ${icon} [${f.severity.toUpperCase()}] ${f.title}`);
          lines.push(`- **Type:** ${f.type}`);
          if (f.location) lines.push(`- **Location:** ${f.location}`);
          if (f.codeFile) lines.push(`- **File:** \`${f.codeFile}${f.codeLine ? `:${f.codeLine}` : ""}\``);
          lines.push(`- **Impact:** ${f.impact}`);
          if (f.description) lines.push(`- **Details:** ${f.description}`);
          lines.push(`- **Suggested fix:** ${f.suggestedFix}`);
          lines.push(`- **Status:** ${f.status}\n`);
        }

        reviewOutput = lines.join("\n");
      }

      // Store in DB
      const reviewId = genId("rev");
      db.prepare(
        `INSERT INTO ui_dive_code_reviews (id, session_id, review_type, severity_counts, findings, summary, recommendations, score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(reviewId, sessionId, type, JSON.stringify(severityCounts), JSON.stringify(findings), `Score: ${score}/100 (${grade}). ${findings.length} findings.`, JSON.stringify(recommendations), score);

      return {
        reviewId,
        score,
        grade,
        severityCounts,
        findingsCount: findings.length,
        openCount: openFindings.length,
        resolvedCount: resolvedFindings.length,
        recommendations,
        review: format === "json" ? undefined : reviewOutput,
        findings: format === "json" ? findings : undefined,
        _hint: `Code review complete: ${score}/100 (${grade}). ${openFindings.length} open finding(s). ${recommendations[0] ?? ""}`,
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // TOOL: open_dive_dashboard — Open the local dashboard in a browser
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "open_dive_dashboard",
    description:
      "Open the NodeBench UI Dive dashboard in a browser. Shows the full flywheel cycle: " +
      "explored routes, components, interactions, screenshots, bugs, code locations, fixes, " +
      "changelogs, generated tests, and code reviews. The dashboard auto-refreshes every 5s " +
      "so you can watch progress live as the dive runs. Pass a sessionId to deep-link to a " +
      "specific session, or omit to show the latest.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: {
          type: "string",
          description: "Optional session ID to deep-link to. Omit for latest session.",
        },
        openBrowser: {
          type: "boolean",
          description: "Whether to auto-open the URL in the default browser (default: true).",
          default: true,
        },
      },
    },
    handler: async (args: { sessionId?: string; openBrowser?: boolean }) => {
      const url = getDashboardUrl();
      if (!url) {
        return {
          error: "Dashboard server is not running. It starts automatically with the MCP server on port 6274.",
          _hint: "Restart the MCP server to start the dashboard.",
        };
      }

      const fullUrl = args.sessionId
        ? `${url}#session=${encodeURIComponent(args.sessionId)}`
        : url;

      // Try to open in default browser
      if (args.openBrowser !== false) {
        try {
          const platform = process.platform;
          if (platform === "win32") {
            execSync(`start "" "${fullUrl}"`, { stdio: "ignore" });
          } else if (platform === "darwin") {
            execSync(`open "${fullUrl}"`, { stdio: "ignore" });
          } else {
            execSync(`xdg-open "${fullUrl}"`, { stdio: "ignore" });
          }
        } catch {
          // Browser open is best-effort
        }
      }

      return {
        url: fullUrl,
        dashboardPort: url.split(":").pop(),
        _hint: `Dashboard is live at ${fullUrl}. It auto-refreshes every 5 seconds.`,
      };
    },
  },
];
