/**
 * UI/UX Full Dive Tools — Parallel subagent swarm for comprehensive UI traversal.
 *
 * Architecture:
 * - Main agent starts a dive session and registers top-level page components.
 * - Subagents claim individual components via start_component_flow (isolated context).
 * - Each subagent logs interactions and tags bugs within its component scope.
 * - The component tree builds up hierarchically (page → section → element).
 * - get_dive_tree produces an XML-like overview of the entire app structure.
 * - get_dive_report generates a final report with Mermaid diagram, bug summary,
 *   and per-component interaction traces.
 *
 * Designed for use with Claude Code subagents, Windsurf, or any MCP client that
 * supports parallel tool invocation. Each subagent only needs the session_id and
 * its assigned component_id to operate independently.
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

// ── Helpers ──────────────────────────────────────────────────────────────

interface ComponentRow {
  id: string;
  session_id: string;
  parent_id: string | null;
  name: string;
  component_type: string;
  selector: string | null;
  agent_id: string | null;
  status: string;
  interaction_count: number;
  bug_count: number;
  summary: string | null;
  metadata: string | null;
  created_at: string;
  completed_at: string | null;
}

interface BugRow {
  id: string;
  session_id: string;
  component_id: string;
  interaction_id: string | null;
  severity: string;
  category: string;
  title: string;
  description: string | null;
  expected: string | null;
  actual: string | null;
  screenshot_ref: string | null;
  status: string;
  created_at: string;
}

interface InteractionRow {
  id: string;
  session_id: string;
  component_id: string;
  action: string;
  target: string | null;
  input_value: string | null;
  result: string;
  observation: string | null;
  screenshot_ref: string | null;
  duration_ms: number | null;
  sequence_num: number;
  created_at: string;
}

function buildTreeXml(
  components: ComponentRow[],
  bugs: BugRow[],
  parentId: string | null = null,
  indent: number = 0,
): string {
  const children = components.filter(c => c.parent_id === parentId);
  if (children.length === 0) return "";

  const pad = "  ".repeat(indent);
  let xml = "";

  for (const c of children) {
    const cBugs = bugs.filter(b => b.component_id === c.id);
    const bugAttr = cBugs.length > 0 ? ` bugs="${cBugs.length}"` : "";
    const statusAttr = ` status="${c.status}"`;
    const agentAttr = c.agent_id ? ` agent="${c.agent_id}"` : "";
    const interactionAttr = c.interaction_count > 0 ? ` interactions="${c.interaction_count}"` : "";

    const childXml = buildTreeXml(components, bugs, c.id, indent + 1);
    const bugXml = cBugs.map(b =>
      `${pad}  <bug severity="${b.severity}" category="${b.category}" status="${b.status}">${b.title}</bug>`
    ).join("\n");

    const hasChildren = childXml || bugXml;
    if (hasChildren) {
      xml += `${pad}<${c.component_type} name="${c.name}" id="${c.id}"${statusAttr}${agentAttr}${interactionAttr}${bugAttr}>\n`;
      if (bugXml) xml += bugXml + "\n";
      if (childXml) xml += childXml;
      xml += `${pad}</${c.component_type}>\n`;
    } else {
      xml += `${pad}<${c.component_type} name="${c.name}" id="${c.id}"${statusAttr}${agentAttr}${interactionAttr}${bugAttr} />\n`;
    }
  }

  return xml;
}

function buildMermaidDiagram(components: ComponentRow[], bugs: BugRow[]): string {
  if (components.length === 0) return "graph TD\n  empty[No components registered]";

  let mermaid = "graph TD\n";
  const sanitize = (s: string) => s.replace(/["\[\](){}]/g, "").replace(/\s+/g, "_");

  for (const c of components) {
    const cBugs = bugs.filter(b => b.component_id === c.id);
    const label = cBugs.length > 0
      ? `${c.name} [${c.status}] 🐛${cBugs.length}`
      : `${c.name} [${c.status}]`;
    const style = c.status === "completed"
      ? ":::completed"
      : cBugs.some(b => b.severity === "critical")
        ? ":::critical"
        : cBugs.length > 0
          ? ":::hasBugs"
          : "";

    mermaid += `  ${sanitize(c.id)}["${label}"]${style}\n`;

    if (c.parent_id) {
      mermaid += `  ${sanitize(c.parent_id)} --> ${sanitize(c.id)}\n`;
    }
  }

  mermaid += "\n  classDef completed fill:#d4edda,stroke:#28a745\n";
  mermaid += "  classDef critical fill:#f8d7da,stroke:#dc3545\n";
  mermaid += "  classDef hasBugs fill:#fff3cd,stroke:#ffc107\n";

  return mermaid;
}

// ── Tools ────────────────────────────────────────────────────────────────

export const uiUxDiveTools: McpTool[] = [
  // 1. Start a dive session
  {
    name: "start_ui_dive",
    description:
      "Initialize a UI/UX Full Dive session for comprehensive app traversal. Creates a session that tracks all components, interactions, and bugs. The main agent should call this first, then register_component for each top-level page/section discovered. Subagents can then claim individual components via start_component_flow for isolated parallel traversal. Returns the session_id needed by all subsequent tools.",
    inputSchema: {
      type: "object",
      properties: {
        appUrl: {
          type: "string",
          description: "URL of the application to dive into (e.g. http://localhost:3000, https://app.example.com)",
        },
        appName: {
          type: "string",
          description: "Human-readable name (e.g. 'NodeBench AI Dashboard')",
        },
        agentCount: {
          type: "number",
          description: "Number of parallel subagents planned (default: 1, set higher for parallel swarm)",
        },
        metadata: {
          type: "object",
          description: "Optional JSON metadata (e.g. { viewport: '1280x720', auth: 'guest' })",
        },
      },
      required: ["appUrl"],
    },
    handler: async (args) => {
      const { appUrl, appName, agentCount, metadata } = args as {
        appUrl: string;
        appName?: string;
        agentCount?: number;
        metadata?: Record<string, unknown>;
      };

      const db = getDb();
      const id = genId("dive");

      db.prepare(
        "INSERT INTO ui_dive_sessions (id, app_url, app_name, agent_count, metadata) VALUES (?, ?, ?, ?, ?)"
      ).run(id, appUrl, appName ?? null, agentCount ?? 1, metadata ? JSON.stringify(metadata) : null);

      return {
        sessionId: id,
        appUrl,
        appName: appName ?? null,
        agentCount: agentCount ?? 1,
        status: "active",
        _hint: `Session created. Now register top-level components with register_component({ sessionId: "${id}", name: "...", componentType: "page" }). For parallel swarm: assign each subagent a component via start_component_flow.`,
        _workflow: [
          "1. Navigate to appUrl and identify top-level pages/sections",
          "2. register_component for each (componentType: 'page')",
          "3. For each page, register child sections/forms/modals",
          "4. Assign subagents: start_component_flow({ componentId, agentId })",
          "5. Each subagent: log_interaction + tag_ui_bug within their component",
          "6. Each subagent: end_component_flow when done",
          "7. Main agent: get_dive_tree for full overview, get_dive_report for final report",
        ],
      };
    },
  },

  // 2. Register a component in the tree
  {
    name: "register_component",
    description:
      "Register a UI component in the dive tree. Components form a hierarchy: page → section → form/modal/list → button/input/link. Set parentId to nest under an existing component (null for top-level). The main agent registers the initial tree, then subagents can add child components they discover during traversal. Returns the component_id for use in start_component_flow and log_interaction.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dive session ID from start_ui_dive" },
        name: { type: "string", description: "Component name (e.g. 'Login Form', 'Navigation Bar', 'Settings Modal')" },
        componentType: {
          type: "string",
          description: "Type: page, section, form, modal, menu, list, card, button, input, link, table, tab, drawer, dialog, toast, tooltip, dropdown, sidebar, header, footer, hero, chart, media",
        },
        parentId: { type: "string", description: "Parent component ID (null/omit for top-level page)" },
        selector: { type: "string", description: "CSS selector or data-testid for identification (e.g. '[data-testid=login-form]', '#nav-bar')" },
        metadata: { type: "object", description: "Optional JSON (e.g. { route: '/settings', requiresAuth: true })" },
      },
      required: ["sessionId", "name", "componentType"],
    },
    handler: async (args) => {
      const { sessionId, name, componentType, parentId, selector, metadata } = args as {
        sessionId: string;
        name: string;
        componentType: string;
        parentId?: string;
        selector?: string;
        metadata?: Record<string, unknown>;
      };

      const db = getDb();

      // Validate session exists
      const session = db.prepare("SELECT id, status FROM ui_dive_sessions WHERE id = ?").get(sessionId) as any;
      if (!session) return { error: true, message: `Session not found: ${sessionId}` };
      if (session.status !== "active") return { error: true, message: `Session is ${session.status}, not active` };

      // Validate parent if provided
      if (parentId) {
        const parent = db.prepare("SELECT id FROM ui_dive_components WHERE id = ? AND session_id = ?").get(parentId, sessionId);
        if (!parent) return { error: true, message: `Parent component not found: ${parentId}` };
      }

      const id = genId("comp");
      db.prepare(
        "INSERT INTO ui_dive_components (id, session_id, parent_id, name, component_type, selector, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(id, sessionId, parentId ?? null, name, componentType, selector ?? null, metadata ? JSON.stringify(metadata) : null);

      // Set as root if first top-level component
      if (!parentId) {
        const rootCheck = db.prepare("SELECT root_component_id FROM ui_dive_sessions WHERE id = ?").get(sessionId) as any;
        if (!rootCheck.root_component_id) {
          db.prepare("UPDATE ui_dive_sessions SET root_component_id = ? WHERE id = ?").run(id, sessionId);
        }
      }

      const siblingCount = db.prepare(
        "SELECT COUNT(*) as c FROM ui_dive_components WHERE session_id = ? AND parent_id IS ?"
      ).get(sessionId, parentId ?? null) as any;

      return {
        componentId: id,
        name,
        componentType,
        parentId: parentId ?? null,
        selector: selector ?? null,
        siblingCount: siblingCount.c,
        status: "pending",
        _hint: `Component registered. Claim it for traversal: start_component_flow({ componentId: "${id}", agentId: "agent_1" }). Or register child components under it.`,
      };
    },
  },

  // 3. Start a component flow (claim for subagent)
  {
    name: "start_component_flow",
    description:
      "Claim a component for traversal by a specific subagent. Marks it as 'in_progress' and assigns the agent_id. This provides context isolation — each subagent works on its own component independently. The subagent should then log_interaction for each step and tag_ui_bug for any issues found. Call end_component_flow when done.",
    inputSchema: {
      type: "object",
      properties: {
        componentId: { type: "string", description: "Component ID from register_component" },
        agentId: { type: "string", description: "Unique agent identifier (e.g. 'agent_1', 'nav_agent', 'form_tester')" },
      },
      required: ["componentId"],
    },
    handler: async (args) => {
      const { componentId, agentId } = args as { componentId: string; agentId?: string };
      const db = getDb();

      const comp = db.prepare(
        "SELECT c.*, s.app_url, s.app_name FROM ui_dive_components c JOIN ui_dive_sessions s ON c.session_id = s.id WHERE c.id = ?"
      ).get(componentId) as any;
      if (!comp) return { error: true, message: `Component not found: ${componentId}` };
      if (comp.status === "in_progress") {
        return { error: true, message: `Component already claimed by agent '${comp.agent_id}'. Use a different component or wait.` };
      }
      if (comp.status === "completed") {
        return { error: true, message: `Component already completed. Register a new component for additional testing.` };
      }

      const aid = agentId ?? `agent_${Date.now()}`;
      db.prepare(
        "UPDATE ui_dive_components SET status = 'in_progress', agent_id = ? WHERE id = ?"
      ).run(aid, componentId);

      // Get children for context
      const children = db.prepare(
        "SELECT id, name, component_type, status FROM ui_dive_components WHERE parent_id = ?"
      ).all(componentId) as any[];

      return {
        claimed: true,
        componentId,
        agentId: aid,
        component: {
          name: comp.name,
          type: comp.component_type,
          selector: comp.selector,
          parentId: comp.parent_id,
        },
        app: { url: comp.app_url, name: comp.app_name },
        children: children.map(ch => ({ id: ch.id, name: ch.name, type: ch.component_type, status: ch.status })),
        _hint: `Component claimed. Now interact with it: log_interaction({ componentId: "${componentId}", action: "click", target: "...", result: "success", observation: "..." }). Tag bugs with tag_ui_bug. Call end_component_flow when done.`,
      };
    },
  },

  // 4. Log an interaction
  {
    name: "log_interaction",
    description:
      "Log a single interaction step within a component flow. Each interaction records what action was taken, what happened, and any observations. Actions: click, type, hover, scroll, navigate, submit, drag, keypress, swipe, focus, blur, resize, wait, assert. Interactions are auto-numbered sequentially within each component.",
    inputSchema: {
      type: "object",
      properties: {
        componentId: { type: "string", description: "Component ID being tested" },
        action: {
          type: "string",
          description: "Interaction type: click, type, hover, scroll, navigate, submit, drag, keypress, swipe, focus, blur, resize, wait, assert",
        },
        target: { type: "string", description: "What was interacted with (e.g. 'Submit button', 'Email input field', 'Dropdown menu')" },
        inputValue: { type: "string", description: "What was typed/selected/entered (for type, submit, select actions)" },
        result: {
          type: "string",
          description: "Outcome: success, error, unexpected, timeout, crash, no_response, partial",
        },
        observation: {
          type: "string",
          description: "What happened after the interaction (e.g. 'Form submitted, redirected to dashboard', 'Error toast appeared: Invalid email')",
        },
        durationMs: { type: "number", description: "How long the interaction took in ms (optional)" },
        screenshotRef: { type: "string", description: "Reference to a screenshot capture (optional)" },
      },
      required: ["componentId", "action", "result"],
    },
    handler: async (args) => {
      const { componentId, action, target, inputValue, result, observation, durationMs, screenshotRef } = args as {
        componentId: string;
        action: string;
        target?: string;
        inputValue?: string;
        result: string;
        observation?: string;
        durationMs?: number;
        screenshotRef?: string;
      };

      const db = getDb();

      const comp = db.prepare(
        "SELECT id, session_id, status, interaction_count FROM ui_dive_components WHERE id = ?"
      ).get(componentId) as any;
      if (!comp) return { error: true, message: `Component not found: ${componentId}` };

      const seqNum = comp.interaction_count + 1;
      const id = genId("int");

      db.prepare(
        `INSERT INTO ui_dive_interactions (id, session_id, component_id, action, target, input_value, result, observation, screenshot_ref, duration_ms, sequence_num)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, comp.session_id, componentId, action, target ?? null, inputValue ?? null, result, observation ?? null, screenshotRef ?? null, durationMs ?? null, seqNum);

      db.prepare("UPDATE ui_dive_components SET interaction_count = ? WHERE id = ?").run(seqNum, componentId);

      return {
        interactionId: id,
        sequenceNum: seqNum,
        action,
        target: target ?? null,
        result,
        _hint: result !== "success"
          ? `Non-success result (${result}). Consider tagging a bug: tag_ui_bug({ componentId: "${componentId}", interactionId: "${id}", severity: "...", category: "functional", title: "..." })`
          : `Interaction #${seqNum} logged. Continue testing or call end_component_flow when done.`,
      };
    },
  },

  // 5. End a component flow
  {
    name: "end_component_flow",
    description:
      "Complete a component's traversal flow. Marks it as 'completed' with a summary. Call this after all interactions and bug tagging for a component are done. The summary should capture key findings, overall health, and any patterns observed.",
    inputSchema: {
      type: "object",
      properties: {
        componentId: { type: "string", description: "Component ID to complete" },
        summary: {
          type: "string",
          description: "Summary of findings (e.g. 'Login form works correctly. Found 1 accessibility issue with missing aria-label on password field.')",
        },
      },
      required: ["componentId", "summary"],
    },
    handler: async (args) => {
      const { componentId, summary } = args as { componentId: string; summary: string };
      const db = getDb();

      const comp = db.prepare(
        "SELECT id, session_id, name, interaction_count, bug_count FROM ui_dive_components WHERE id = ?"
      ).get(componentId) as any;
      if (!comp) return { error: true, message: `Component not found: ${componentId}` };

      db.prepare(
        "UPDATE ui_dive_components SET status = 'completed', summary = ?, completed_at = datetime('now') WHERE id = ?"
      ).run(summary, componentId);

      // Check session progress
      const total = db.prepare("SELECT COUNT(*) as c FROM ui_dive_components WHERE session_id = ?").get(comp.session_id) as any;
      const completed = db.prepare("SELECT COUNT(*) as c FROM ui_dive_components WHERE session_id = ? AND status = 'completed'").get(comp.session_id) as any;
      const totalBugs = db.prepare("SELECT COUNT(*) as c FROM ui_dive_bugs WHERE session_id = ?").get(comp.session_id) as any;

      return {
        completed: true,
        componentId,
        name: comp.name,
        interactionCount: comp.interaction_count,
        bugCount: comp.bug_count,
        summary,
        sessionProgress: {
          completedComponents: completed.c,
          totalComponents: total.c,
          remainingComponents: total.c - completed.c,
          totalBugsFound: totalBugs.c,
        },
        _hint: completed.c === total.c
          ? `All components completed! Generate the final report: get_dive_report({ sessionId: "${comp.session_id}" })`
          : `${total.c - completed.c} components remaining. Continue with the next component or get_dive_tree for current state.`,
      };
    },
  },

  // 6. Tag a bug
  {
    name: "tag_ui_bug",
    description:
      "Tag a bug to a specific component (and optionally a specific interaction). Bugs are categorized by severity (critical/high/medium/low) and category (visual, functional, accessibility, performance, responsive, ux, content, security). Each bug is linked to its component in the tree for precise debugging.",
    inputSchema: {
      type: "object",
      properties: {
        componentId: { type: "string", description: "Component where the bug was found" },
        interactionId: { type: "string", description: "Specific interaction that triggered the bug (optional)" },
        severity: { type: "string", description: "Bug severity: critical, high, medium, low" },
        category: {
          type: "string",
          description: "Bug category: visual (layout/styling), functional (broken behavior), accessibility (a11y), performance (slow/laggy), responsive (breakpoint issues), ux (confusing/poor UX), content (text/copy issues), security (auth/data exposure)",
        },
        title: { type: "string", description: "Short bug title (e.g. 'Submit button unresponsive on mobile')" },
        description: { type: "string", description: "Detailed description of the bug" },
        expected: { type: "string", description: "What should happen" },
        actual: { type: "string", description: "What actually happens" },
        screenshotRef: { type: "string", description: "Reference to a screenshot showing the bug (optional)" },
      },
      required: ["componentId", "severity", "category", "title"],
    },
    handler: async (args) => {
      const { componentId, interactionId, severity, category, title, description, expected, actual, screenshotRef } = args as {
        componentId: string;
        interactionId?: string;
        severity: string;
        category: string;
        title: string;
        description?: string;
        expected?: string;
        actual?: string;
        screenshotRef?: string;
      };

      const db = getDb();

      const comp = db.prepare("SELECT id, session_id, bug_count FROM ui_dive_components WHERE id = ?").get(componentId) as any;
      if (!comp) return { error: true, message: `Component not found: ${componentId}` };

      const id = genId("bug");
      db.prepare(
        `INSERT INTO ui_dive_bugs (id, session_id, component_id, interaction_id, severity, category, title, description, expected, actual, screenshot_ref)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, comp.session_id, componentId, interactionId ?? null, severity, category, title, description ?? null, expected ?? null, actual ?? null, screenshotRef ?? null);

      const newBugCount = comp.bug_count + 1;
      db.prepare("UPDATE ui_dive_components SET bug_count = ? WHERE id = ?").run(newBugCount, componentId);

      const sessionBugs = db.prepare(
        "SELECT severity, COUNT(*) as c FROM ui_dive_bugs WHERE session_id = ? GROUP BY severity"
      ).all(comp.session_id) as any[];

      return {
        bugId: id,
        severity,
        category,
        title,
        componentBugCount: newBugCount,
        sessionBugSummary: Object.fromEntries(sessionBugs.map(b => [b.severity, b.c])),
        _hint: `Bug tagged. Continue testing this component or call end_component_flow when done.`,
      };
    },
  },

  // 7. Get the component tree
  {
    name: "get_dive_tree",
    description:
      "Get the full XML-like component tree for a dive session. Shows all registered components in their hierarchy with status, agent assignments, interaction counts, and bug counts. Also returns a Mermaid diagram for visual rendering. Use this for a quick overview of app structure and dive progress.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dive session ID" },
        format: {
          type: "string",
          description: "Output format: 'xml' (default — XML-like tree), 'mermaid' (Mermaid flowchart), 'both' (both formats)",
        },
      },
      required: ["sessionId"],
    },
    handler: async (args) => {
      const { sessionId, format } = args as { sessionId: string; format?: string };
      const db = getDb();

      const session = db.prepare("SELECT * FROM ui_dive_sessions WHERE id = ?").get(sessionId) as any;
      if (!session) return { error: true, message: `Session not found: ${sessionId}` };

      const components = db.prepare(
        "SELECT * FROM ui_dive_components WHERE session_id = ? ORDER BY created_at"
      ).all(sessionId) as ComponentRow[];

      const bugs = db.prepare(
        "SELECT * FROM ui_dive_bugs WHERE session_id = ? ORDER BY created_at"
      ).all(sessionId) as BugRow[];

      const fmt = format ?? "both";

      const completed = components.filter(c => c.status === "completed").length;
      const inProgress = components.filter(c => c.status === "in_progress").length;
      const pending = components.filter(c => c.status === "pending").length;

      const result: Record<string, unknown> = {
        session: {
          id: session.id,
          appUrl: session.app_url,
          appName: session.app_name,
          status: session.status,
        },
        stats: {
          totalComponents: components.length,
          completed,
          inProgress,
          pending,
          totalBugs: bugs.length,
          bugsBySeverity: Object.fromEntries(
            ["critical", "high", "medium", "low"]
              .map(s => [s, bugs.filter(b => b.severity === s).length])
              .filter(([, c]) => (c as number) > 0)
          ),
        },
      };

      if (fmt === "xml" || fmt === "both") {
        const xml = `<app name="${session.app_name ?? session.app_url}" url="${session.app_url}">\n${buildTreeXml(components, bugs, null, 1)}</app>`;
        result.xmlTree = xml;
      }

      if (fmt === "mermaid" || fmt === "both") {
        result.mermaidDiagram = buildMermaidDiagram(components, bugs);
      }

      return result;
    },
  },

  // 8. Generate final report
  {
    name: "get_dive_report",
    description:
      "Generate a comprehensive UI/UX Full Dive report for a session. Includes: executive summary, component tree, all bugs grouped by severity, per-component interaction traces, Mermaid diagram, and actionable recommendations. Optionally marks the session as completed. This is the final deliverable after all subagents have finished their traversals.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dive session ID" },
        completeSession: { type: "boolean", description: "Mark the session as completed (default: true)" },
      },
      required: ["sessionId"],
    },
    handler: async (args) => {
      const { sessionId, completeSession } = args as { sessionId: string; completeSession?: boolean };
      const db = getDb();

      const session = db.prepare("SELECT * FROM ui_dive_sessions WHERE id = ?").get(sessionId) as any;
      if (!session) return { error: true, message: `Session not found: ${sessionId}` };

      const components = db.prepare(
        "SELECT * FROM ui_dive_components WHERE session_id = ? ORDER BY created_at"
      ).all(sessionId) as ComponentRow[];

      const bugs = db.prepare(
        "SELECT b.*, c.name as component_name, c.component_type FROM ui_dive_bugs b JOIN ui_dive_components c ON b.component_id = c.id WHERE b.session_id = ? ORDER BY CASE b.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END, b.created_at"
      ).all(sessionId) as any[];

      const interactions = db.prepare(
        "SELECT i.*, c.name as component_name FROM ui_dive_interactions i JOIN ui_dive_components c ON i.component_id = c.id WHERE i.session_id = ? ORDER BY c.id, i.sequence_num"
      ).all(sessionId) as any[];

      // Mark session complete
      if (completeSession !== false) {
        db.prepare("UPDATE ui_dive_sessions SET status = 'completed', completed_at = datetime('now') WHERE id = ?").run(sessionId);
      }

      // Build per-component summaries
      const componentDetails = components.map(c => {
        const cBugs = bugs.filter((b: any) => b.component_id === c.id);
        const cInteractions = interactions.filter((i: any) => i.component_id === c.id);
        return {
          id: c.id,
          name: c.name,
          type: c.component_type,
          status: c.status,
          agent: c.agent_id,
          summary: c.summary,
          interactionCount: cInteractions.length,
          bugs: cBugs.map((b: any) => ({
            id: b.id,
            severity: b.severity,
            category: b.category,
            title: b.title,
            description: b.description,
            expected: b.expected,
            actual: b.actual,
          })),
          interactions: cInteractions.map((i: any) => ({
            seq: i.sequence_num,
            action: i.action,
            target: i.target,
            result: i.result,
            observation: i.observation,
          })),
        };
      });

      const completed = components.filter(c => c.status === "completed").length;
      const criticalBugs = bugs.filter((b: any) => b.severity === "critical").length;
      const highBugs = bugs.filter((b: any) => b.severity === "high").length;

      const healthScore = components.length > 0
        ? Math.max(0, Math.round(100 - (criticalBugs * 25) - (highBugs * 10) - (bugs.length * 2)))
        : 0;

      const xmlTree = `<app name="${session.app_name ?? session.app_url}" url="${session.app_url}">\n${buildTreeXml(components, bugs as BugRow[], null, 1)}</app>`;
      const mermaid = buildMermaidDiagram(components, bugs as BugRow[]);

      return {
        report: {
          title: `UI/UX Full Dive Report: ${session.app_name ?? session.app_url}`,
          appUrl: session.app_url,
          sessionId,
          createdAt: session.created_at,
          completedAt: new Date().toISOString(),
          healthScore,
          healthGrade: healthScore >= 90 ? "A" : healthScore >= 75 ? "B" : healthScore >= 60 ? "C" : healthScore >= 40 ? "D" : "F",
        },
        summary: {
          totalComponents: components.length,
          completedComponents: completed,
          totalInteractions: interactions.length,
          totalBugs: bugs.length,
          bugsBySeverity: {
            critical: criticalBugs,
            high: highBugs,
            medium: bugs.filter((b: any) => b.severity === "medium").length,
            low: bugs.filter((b: any) => b.severity === "low").length,
          },
          bugsByCategory: Object.fromEntries(
            [...new Set(bugs.map((b: any) => b.category))].map(cat => [
              cat,
              bugs.filter((b: any) => b.category === cat).length,
            ])
          ),
          agentsUsed: [...new Set(components.filter(c => c.agent_id).map(c => c.agent_id))],
        },
        xmlTree,
        mermaidDiagram: mermaid,
        components: componentDetails,
        recommendations: [
          ...(criticalBugs > 0 ? [`FIX IMMEDIATELY: ${criticalBugs} critical bug(s) found — these block usability.`] : []),
          ...(highBugs > 0 ? [`HIGH PRIORITY: ${highBugs} high-severity bug(s) should be fixed before next release.`] : []),
          ...(completed < components.length ? [`${components.length - completed} component(s) not fully tested — consider re-running the dive.`] : []),
          ...(interactions.length === 0 ? ["No interactions logged — ensure subagents are calling log_interaction during traversal."] : []),
          ...(bugs.some((b: any) => b.category === "accessibility") ? ["Accessibility issues found — run an a11y audit with axe-core or lighthouse."] : []),
          ...(bugs.some((b: any) => b.category === "responsive") ? ["Responsive issues found — test with capture_responsive_suite across breakpoints."] : []),
        ],
      };
    },
  },
];
