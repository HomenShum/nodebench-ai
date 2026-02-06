/**
 * Documentation & Research tools — Self-maintenance and market research.
 * Enables agents to maintain AGENTS.md, research job markets, and set up local environments.
 *
 * - update_agents_md: Read/append/update sections in AGENTS.md
 * - research_job_market: Aggregate job requirements for roles/skills
 * - setup_local_env: Help agents configure their local environment
 *
 * Designed for fully local operation — helps agents bootstrap their own tooling.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import type { McpTool } from "../types.js";

// ─── Dynamic import helpers ───────────────────────────────────────────────────

async function canImport(pkg: string): Promise<boolean> {
  try {
    await import(pkg);
    return true;
  } catch {
    return false;
  }
}

// ─── AGENTS.md template ───────────────────────────────────────────────────────

const QUICK_REFS_PATTERN = "**→ Quick Refs:**";
const QUICK_REFS_REGEX = /\*\*→ Quick Refs:\*\*/;

const AGENTS_MD_TEMPLATE = `# AGENTS.md

This file provides instructions for AI agents working on this project.

**→ Quick Refs:** Start with [Project Overview](#project-overview) | Set up: [Development Setup](#development-setup) | Run: [Key Commands](#key-commands)

---

## Project Overview

<!-- Describe your project's purpose, architecture, and key components -->

**→ Quick Refs:** Tech details: [Tech Stack](#tech-stack) | Code style: [Coding Conventions](#coding-conventions)

## Development Setup

<!-- Document setup steps: dependencies, environment variables, build commands -->

**→ Quick Refs:** Key commands: [Key Commands](#key-commands) | Testing: [Testing](#testing)

## Tech Stack

<!-- List frameworks, libraries, and tools used -->

**→ Quick Refs:** Conventions: [Coding Conventions](#coding-conventions) | Setup: [Development Setup](#development-setup)

## Coding Conventions

<!-- Document code style, naming conventions, patterns to follow -->

**→ Quick Refs:** Testing: [Testing](#testing) | Edge cases: [Edge Cases & Learnings](#edge-cases--learnings)

## Testing

<!-- Document how to run tests, what testing frameworks are used -->

**→ Quick Refs:** Commands: [Key Commands](#key-commands) | Edge cases: [Edge Cases & Learnings](#edge-cases--learnings)

## Key Commands

\`\`\`bash
# Add your common commands here
npm install
npm run build
npm run test
\`\`\`

**→ Quick Refs:** Setup: [Development Setup](#development-setup) | Testing: [Testing](#testing)

## Edge Cases & Learnings

<!-- Document gotchas, edge cases, and lessons learned -->

**→ Quick Refs:** Conventions: [Coding Conventions](#coding-conventions) | Testing: [Testing](#testing)

---

*This file is maintained by NodeBench MCP. Use \`update_agents_md\` to add learnings automatically.*
*Every section MUST include \`**→ Quick Refs:**\` for agent chunking context.*
`;

// ─── Section parsing ──────────────────────────────────────────────────────────

interface Section {
  name: string;
  level: number;
  startLine: number;
  endLine: number;
  content: string;
}

function parseSections(content: string): Section[] {
  const lines = content.split("\n");
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);

    if (match) {
      // Close previous section
      if (currentSection) {
        currentSection.endLine = i - 1;
        currentSection.content = lines
          .slice(currentSection.startLine + 1, i)
          .join("\n")
          .trim();
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        name: match[2].trim(),
        level: match[1].length,
        startLine: i,
        endLine: lines.length - 1,
        content: "",
      };
    }
  }

  // Close last section
  if (currentSection) {
    currentSection.content = lines
      .slice(currentSection.startLine + 1)
      .join("\n")
      .trim();
    sections.push(currentSection);
  }

  return sections;
}

function findAgentsMdPath(startDir: string): string | null {
  let dir = startDir;
  const maxLevels = 10;

  for (let i = 0; i < maxLevels; i++) {
    const candidate = join(dir, "AGENTS.md");
    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = dirname(dir);
    if (parent === dir) break; // Reached root
    dir = parent;
  }

  return null;
}

// ─── Environment detection ────────────────────────────────────────────────────

interface EnvStatus {
  available: boolean;
  value?: string;
  suggestion?: string;
}

function detectEnvStatus(): Record<string, EnvStatus> {
  const envVars: Record<string, EnvStatus> = {};

  // API Keys
  const apiKeys = [
    { name: "GEMINI_API_KEY", suggestion: "Get from https://aistudio.google.com/apikey" },
    { name: "GOOGLE_AI_API_KEY", suggestion: "Alias for GEMINI_API_KEY" },
    { name: "OPENAI_API_KEY", suggestion: "Get from https://platform.openai.com/api-keys" },
    { name: "ANTHROPIC_API_KEY", suggestion: "Get from https://console.anthropic.com/" },
    { name: "OPENROUTER_API_KEY", suggestion: "Get from https://openrouter.ai/keys" },
    { name: "PERPLEXITY_API_KEY", suggestion: "Get from https://perplexity.ai/settings/api" },
    { name: "GITHUB_TOKEN", suggestion: "Get from https://github.com/settings/tokens" },
    { name: "GH_TOKEN", suggestion: "Alias for GITHUB_TOKEN (used by gh CLI)" },
  ];

  for (const { name, suggestion } of apiKeys) {
    const value = process.env[name];
    envVars[name] = {
      available: !!value,
      value: value ? `${value.slice(0, 8)}...` : undefined,
      suggestion: value ? undefined : suggestion,
    };
  }

  return envVars;
}

async function detectSdkStatus(): Promise<Record<string, boolean>> {
  const sdks = [
    "@google/genai",
    "openai",
    "@anthropic-ai/sdk",
    "sharp",
    "playwright",
    "cheerio",
  ];

  const status: Record<string, boolean> = {};
  for (const sdk of sdks) {
    status[sdk] = await canImport(sdk);
  }

  return status;
}

function detectNodeVersion(): string {
  return process.version;
}

function detectPackageManager(): string {
  // Check for lockfiles
  const cwd = process.cwd();
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(join(cwd, "bun.lockb"))) return "bun";
  if (existsSync(join(cwd, "package-lock.json"))) return "npm";
  return "npm"; // Default
}

function detectGitStatus(): { isGitRepo: boolean; branch?: string; hasUncommitted?: boolean } {
  try {
    const isGitRepo = existsSync(join(process.cwd(), ".git"));
    if (!isGitRepo) return { isGitRepo: false };

    const branch = execSync("git branch --show-current", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    const status = execSync("git status --porcelain", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();

    return {
      isGitRepo: true,
      branch: branch || "unknown",
      hasUncommitted: status.length > 0,
    };
  } catch {
    return { isGitRepo: false };
  }
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export const documentationTools: McpTool[] = [
  {
    name: "update_agents_md",
    description:
      "Read, append, or update sections in the AGENTS.md file. This file contains instructions for AI agents working on the project. Use 'read' to see current contents and sections, 'append' to add new content at the end, or 'update_section' to replace a specific section's content. Creates AGENTS.md from template if it doesn't exist. IMPORTANT: Every section MUST include `**→ Quick Refs:**` for agent chunking context. After updating, run live E2E tests on any new/modified functionality before publishing.",
    inputSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["read", "append", "update_section"],
          description:
            "Operation: 'read' (get current content), 'append' (add to end), 'update_section' (replace section content)",
        },
        section: {
          type: "string",
          description:
            "For update_section: the section heading to update (e.g., 'Edge Cases & Learnings', 'Tech Stack')",
        },
        content: {
          type: "string",
          description: "For append/update_section: the content to add or replace with. MUST include `**→ Quick Refs:**` linking to related sections.",
        },
        projectRoot: {
          type: "string",
          description:
            "Root directory to search for AGENTS.md (default: current working directory). Searches upward.",
        },
        createIfMissing: {
          type: "boolean",
          description:
            "Create AGENTS.md from template if not found (default: true for append/update_section, false for read)",
        },
        skipQuickRefsWarning: {
          type: "boolean",
          description:
            "Set to true to skip the warning about missing Quick Refs (default: false). Use only for non-section content.",
        },
      },
      required: ["operation"],
    },
    handler: async (args) => {
      const operation = args.operation as string;
      const section = args.section as string | undefined;
      const content = args.content as string | undefined;
      const projectRoot = (args.projectRoot as string) ?? process.cwd();
      const createIfMissing = args.createIfMissing ?? operation !== "read";
      const skipQuickRefsWarning = args.skipQuickRefsWarning ?? false;

      // Helper: Check if content includes Quick Refs
      const hasQuickRefs = (text: string): boolean => QUICK_REFS_REGEX.test(text);

      // E2E Testing reminder constant
      const E2E_REMINDER = {
        message: "MANDATORY: Run live E2E tests before publishing!",
        command: 'echo \'{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"YOUR_TOOL","arguments":{...}}}\' | node dist/index.js',
        reference: "See AI Flywheel Step 6 in NODEBENCH_AGENTS.md",
      };

      // Quick Refs format guidance
      const QUICK_REFS_GUIDANCE = {
        format: "**→ Quick Refs:** Related link | Another link | See [Section](#anchor)",
        examples: [
          "**→ Quick Refs:** Track progress with `start_cycle` | Record findings with `record_learning`",
          "**→ Quick Refs:** Before starting: [Setup](#setup) | After: [Testing](#testing)",
        ],
        reason: "Enables agent chunking strategies to maintain workflow context across sections",
      };

      // Find AGENTS.md
      let agentsMdPath = findAgentsMdPath(projectRoot);

      // Create if missing and allowed
      if (!agentsMdPath && createIfMissing) {
        agentsMdPath = join(projectRoot, "AGENTS.md");
        writeFileSync(agentsMdPath, AGENTS_MD_TEMPLATE, "utf-8");
      }

      if (!agentsMdPath || !existsSync(agentsMdPath)) {
        return {
          error: true,
          operation,
          message: "AGENTS.md not found",
          suggestion:
            "Set createIfMissing: true to create from template, or specify projectRoot.",
          searchedFrom: projectRoot,
        };
      }

      const currentContent = readFileSync(agentsMdPath, "utf-8");
      const sections = parseSections(currentContent);

      // READ operation
      if (operation === "read") {
        // Audit sections for Quick Refs compliance
        const sectionsWithStatus = sections.map((s) => ({
          name: s.name,
          level: s.level,
          lineRange: `${s.startLine + 1}-${s.endLine + 1}`,
          contentPreview: s.content.slice(0, 200) + (s.content.length > 200 ? "..." : ""),
          hasQuickRefs: hasQuickRefs(s.content),
        }));

        const sectionsWithoutQuickRefs = sectionsWithStatus.filter((s) => !s.hasQuickRefs);

        return {
          operation: "read",
          agentsMdPath,
          sections: sectionsWithStatus,
          fullContent: currentContent,
          characterCount: currentContent.length,
          sectionCount: sections.length,
          quickRefsAudit: {
            sectionsChecked: sections.length,
            sectionsWithQuickRefs: sections.length - sectionsWithoutQuickRefs.length,
            sectionsMissingQuickRefs: sectionsWithoutQuickRefs.map((s) => s.name),
            compliance: sectionsWithoutQuickRefs.length === 0 ? "COMPLIANT" : "NEEDS_UPDATE",
          },
          quickRefsGuidance: sectionsWithoutQuickRefs.length > 0 ? QUICK_REFS_GUIDANCE : undefined,
          note: "Every section should include `**→ Quick Refs:**` for agent chunking context. See quickRefsAudit for compliance status.",
        };
      }

      // APPEND operation
      if (operation === "append") {
        if (!content) {
          return {
            error: true,
            operation: "append",
            message: "Content is required for append operation",
          };
        }

        const newContent = currentContent.trimEnd() + "\n\n" + content.trim() + "\n";
        writeFileSync(agentsMdPath, newContent, "utf-8");

        // Check for Quick Refs
        const contentHasQuickRefs = hasQuickRefs(content);
        const quickRefsWarning = !contentHasQuickRefs && !skipQuickRefsWarning
          ? {
              warning: "MISSING_QUICK_REFS",
              message: `Content does not include '${QUICK_REFS_PATTERN}'. Every section should have Quick Refs for agent chunking context.`,
              guidance: QUICK_REFS_GUIDANCE,
              action: "Consider updating the appended content to include Quick Refs linking to related sections.",
            }
          : null;

        return {
          operation: "append",
          success: true,
          agentsMdPath,
          appendedLength: content.length,
          newTotalLength: newContent.length,
          quickRefsPresent: contentHasQuickRefs,
          ...(quickRefsWarning && { quickRefsWarning }),
          e2eReminder: E2E_REMINDER,
        };
      }

      // UPDATE_SECTION operation
      if (operation === "update_section") {
        if (!section) {
          return {
            error: true,
            operation: "update_section",
            message: "Section name is required for update_section operation",
            availableSections: sections.map((s) => s.name),
          };
        }

        if (!content) {
          return {
            error: true,
            operation: "update_section",
            message: "Content is required for update_section operation",
          };
        }

        // Find the section (case-insensitive)
        const targetSection = sections.find(
          (s) => s.name.toLowerCase() === section.toLowerCase()
        );

        if (!targetSection) {
          // Section not found - append it as new section
          const prefix = "#".repeat(2); // Default to H2
          const newSectionContent = `\n\n${prefix} ${section}\n\n${content.trim()}\n`;
          const newContent = currentContent.trimEnd() + newSectionContent;
          writeFileSync(agentsMdPath, newContent, "utf-8");

          // Check for Quick Refs
          const contentHasQuickRefs = hasQuickRefs(content);
          const quickRefsWarning = !contentHasQuickRefs && !skipQuickRefsWarning
            ? {
                warning: "MISSING_QUICK_REFS",
                message: `New section does not include '${QUICK_REFS_PATTERN}'. Every section should have Quick Refs for agent chunking context.`,
                guidance: QUICK_REFS_GUIDANCE,
                action: "Consider updating the new section to include Quick Refs linking to related sections.",
              }
            : null;

          return {
            operation: "update_section",
            success: true,
            agentsMdPath,
            sectionName: section,
            action: "created_new_section",
            newTotalLength: newContent.length,
            quickRefsPresent: contentHasQuickRefs,
            ...(quickRefsWarning && { quickRefsWarning }),
            e2eReminder: E2E_REMINDER,
          };
        }

        // Replace section content
        const lines = currentContent.split("\n");
        const headerLine = lines[targetSection.startLine];

        // Find end of section (next section of same or higher level, or EOF)
        let endLine = targetSection.endLine;
        for (let i = targetSection.startLine + 1; i < lines.length; i++) {
          const match = lines[i].match(/^(#{1,6})\s+/);
          if (match && match[1].length <= targetSection.level) {
            endLine = i - 1;
            break;
          }
        }

        // Reconstruct content
        const before = lines.slice(0, targetSection.startLine + 1);
        const after = lines.slice(endLine + 1);
        const newContent = [...before, "", content.trim(), "", ...after].join("\n");

        writeFileSync(agentsMdPath, newContent, "utf-8");

        // Check for Quick Refs
        const contentHasQuickRefs = hasQuickRefs(content);
        const quickRefsWarning = !contentHasQuickRefs && !skipQuickRefsWarning
          ? {
              warning: "MISSING_QUICK_REFS",
              message: `Content does not include '${QUICK_REFS_PATTERN}'. Every section should have Quick Refs for agent chunking context.`,
              guidance: QUICK_REFS_GUIDANCE,
              action: "Consider updating the section to include Quick Refs linking to related sections.",
            }
          : null;

        return {
          operation: "update_section",
          success: true,
          agentsMdPath,
          sectionName: section,
          action: "replaced_content",
          previousLength: targetSection.content.length,
          newLength: content.length,
          newTotalLength: newContent.length,
          quickRefsPresent: contentHasQuickRefs,
          ...(quickRefsWarning && { quickRefsWarning }),
          e2eReminder: E2E_REMINDER,
        };
      }

      return {
        error: true,
        message: `Unknown operation: ${operation}`,
        validOperations: ["read", "append", "update_section"],
      };
    },
  },
  {
    name: "research_job_market",
    description:
      "Research job market requirements for a given role or skill set. Provides guidance on in-demand skills, common requirements, and career recommendations. Useful for project ideation, learning priorities, and understanding market needs. Note: Returns curated guidance based on knowledge — for real-time job listings, use web_search with job board queries.",
    inputSchema: {
      type: "object",
      properties: {
        role: {
          type: "string",
          description:
            "Target role (e.g., 'AI Engineer', 'Full-Stack Developer', 'DevOps Engineer', 'Product Manager')",
        },
        skills: {
          type: "array",
          items: { type: "string" },
          description:
            "Skills to evaluate (e.g., ['TypeScript', 'React', 'Python', 'LLMs'])",
        },
        location: {
          type: "string",
          description: "Location filter (e.g., 'remote', 'San Francisco', 'Europe'). Default: 'remote'.",
        },
        focus: {
          type: "string",
          enum: ["requirements", "skills", "salary", "companies", "trends"],
          description:
            "What to focus on: 'requirements' (job reqs), 'skills' (in-demand skills), 'salary' (compensation), 'companies' (who's hiring), 'trends' (emerging tech). Default: 'requirements'.",
        },
      },
      required: ["role"],
    },
    handler: async (args) => {
      const role = args.role as string;
      const skills = (args.skills as string[]) ?? [];
      const location = (args.location as string) ?? "remote";
      const focus = (args.focus as string) ?? "requirements";

      // Curated market data (2025-2026 knowledge)
      const marketData: Record<string, any> = {
        "AI Engineer": {
          commonRequirements: [
            { skill: "Python", frequency: 95 },
            { skill: "Machine Learning", frequency: 90 },
            { skill: "LLMs/Transformers", frequency: 85 },
            { skill: "PyTorch or TensorFlow", frequency: 80 },
            { skill: "RAG/Vector DBs", frequency: 75 },
            { skill: "API Development", frequency: 70 },
            { skill: "Cloud (AWS/GCP/Azure)", frequency: 65 },
            { skill: "TypeScript/Node.js", frequency: 45 },
          ],
          emergingSkills: [
            "Agent Frameworks (LangChain, CrewAI, AutoGen)",
            "MCP (Model Context Protocol)",
            "Multimodal AI",
            "Fine-tuning & RLHF",
            "AI Safety & Alignment",
            "Prompt Engineering",
          ],
          salaryRange: { min: 150000, max: 350000, currency: "USD", market: "US Tech" },
          topCompanies: [
            "Anthropic", "OpenAI", "Google DeepMind", "Meta AI",
            "Cohere", "Scale AI", "Hugging Face", "Databricks",
          ],
        },
        "Full-Stack Developer": {
          commonRequirements: [
            { skill: "JavaScript/TypeScript", frequency: 95 },
            { skill: "React or Vue or Svelte", frequency: 90 },
            { skill: "Node.js", frequency: 85 },
            { skill: "SQL & NoSQL", frequency: 80 },
            { skill: "REST/GraphQL APIs", frequency: 75 },
            { skill: "Git", frequency: 95 },
            { skill: "Cloud Services", frequency: 65 },
            { skill: "Testing", frequency: 60 },
          ],
          emergingSkills: [
            "Next.js / Server Components",
            "Edge Functions",
            "AI/LLM Integration",
            "Real-time (WebSockets, Convex)",
            "Type-safe APIs (tRPC, GraphQL)",
            "Tailwind CSS",
          ],
          salaryRange: { min: 100000, max: 220000, currency: "USD", market: "US Tech" },
          topCompanies: [
            "Vercel", "Stripe", "Shopify", "Notion",
            "Linear", "Figma", "Airbnb", "Netflix",
          ],
        },
        "DevOps Engineer": {
          commonRequirements: [
            { skill: "Linux", frequency: 95 },
            { skill: "Docker/Containers", frequency: 90 },
            { skill: "Kubernetes", frequency: 80 },
            { skill: "CI/CD (GitHub Actions, Jenkins)", frequency: 85 },
            { skill: "IaC (Terraform, Pulumi)", frequency: 75 },
            { skill: "Cloud (AWS/GCP/Azure)", frequency: 90 },
            { skill: "Scripting (Bash, Python)", frequency: 85 },
            { skill: "Monitoring (Datadog, Prometheus)", frequency: 70 },
          ],
          emergingSkills: [
            "Platform Engineering",
            "GitOps (ArgoCD, Flux)",
            "eBPF & Observability",
            "AI Ops",
            "Supply Chain Security",
            "Green Computing",
          ],
          salaryRange: { min: 120000, max: 250000, currency: "USD", market: "US Tech" },
          topCompanies: [
            "HashiCorp", "Datadog", "GitLab", "Cloudflare",
            "Confluent", "Elastic", "MongoDB", "Snowflake",
          ],
        },
        "Product Manager": {
          commonRequirements: [
            { skill: "Product Strategy", frequency: 95 },
            { skill: "User Research", frequency: 85 },
            { skill: "Data Analysis", frequency: 80 },
            { skill: "Roadmap Planning", frequency: 90 },
            { skill: "Stakeholder Management", frequency: 85 },
            { skill: "SQL (basic)", frequency: 60 },
            { skill: "A/B Testing", frequency: 70 },
            { skill: "Agile/Scrum", frequency: 85 },
          ],
          emergingSkills: [
            "AI Product Management",
            "PLG (Product-Led Growth)",
            "AI/ML Literacy",
            "Prompt Engineering (for PMs)",
            "No-code Tools",
            "Growth Experimentation",
          ],
          salaryRange: { min: 130000, max: 280000, currency: "USD", market: "US Tech" },
          topCompanies: [
            "Meta", "Google", "Stripe", "Airbnb",
            "Notion", "Figma", "Spotify", "Slack",
          ],
        },
      };

      // Find closest match
      const normalizedRole = role.toLowerCase();
      let matchedRole: string | null = null;

      for (const key of Object.keys(marketData)) {
        if (normalizedRole.includes(key.toLowerCase().split(" ")[0])) {
          matchedRole = key;
          break;
        }
      }

      if (!matchedRole) {
        // Return generic guidance
        return {
          role,
          skills,
          location,
          focus,
          message:
            "Specific market data not available for this role. Use web_search for real-time job listings.",
          suggestion: `Try: web_search({ query: '"${role}" jobs ${location} requirements 2026' })`,
          genericRecommendation:
            "Focus on: problem-solving, communication, relevant domain expertise, and emerging technologies in your field.",
        };
      }

      const data = marketData[matchedRole];

      // Score provided skills
      const skillScores = skills.map((skill) => {
        const match = data.commonRequirements.find(
          (r: any) => r.skill.toLowerCase().includes(skill.toLowerCase())
        );
        return {
          skill,
          inDemand: !!match,
          frequency: match?.frequency ?? 0,
        };
      });

      const recommendation = skills.length > 0
        ? `Your skills match: ${skillScores.filter((s) => s.inDemand).length}/${skills.length} common requirements. ` +
          `Consider adding: ${data.emergingSkills.slice(0, 3).join(", ")}.`
        : `Top skills for ${matchedRole}: ${data.commonRequirements.slice(0, 5).map((r: any) => r.skill).join(", ")}.`;

      return {
        role: matchedRole,
        inputRole: role,
        skills: skillScores,
        location,
        focus,
        commonRequirements: data.commonRequirements,
        emergingSkills: data.emergingSkills,
        salaryRange: data.salaryRange,
        topCompanies: data.topCompanies,
        recommendation,
        dataSource: "NodeBench curated market data (2025-2026)",
        forRealTimeData: `Use: web_search({ query: '"${matchedRole}" jobs ${location} 2026' })`,
      };
    },
  },
  {
    name: "setup_local_env",
    description:
      "Discover and diagnose the local development environment. Checks for available API keys, installed SDKs, Node.js version, package manager, and git status. Returns suggestions for setting up missing components. Use this to help agents bootstrap their tooling or diagnose issues. Fully local — no external calls.",
    inputSchema: {
      type: "object",
      properties: {
        checkSdks: {
          type: "boolean",
          description: "Check if optional SDKs are installed (default: true)",
        },
        includeSetupCommands: {
          type: "boolean",
          description: "Include suggested setup commands (default: true)",
        },
      },
    },
    handler: async (args) => {
      const checkSdks = args.checkSdks ?? true;
      const includeSetupCommands = args.includeSetupCommands ?? true;

      // Gather environment status
      const envStatus = detectEnvStatus();
      const gitStatus = detectGitStatus();
      const nodeVersion = detectNodeVersion();
      const packageManager = detectPackageManager();

      let sdkStatus: Record<string, boolean> = {};
      if (checkSdks) {
        sdkStatus = await detectSdkStatus();
      }

      // Check for AGENTS.md
      const agentsMdPath = findAgentsMdPath(process.cwd());

      // Calculate readiness
      const hasAnyApiKey = Object.values(envStatus).some((e) => e.available);
      const hasVisionSdk =
        sdkStatus["@google/genai"] || sdkStatus["openai"] || sdkStatus["@anthropic-ai/sdk"];
      const hasWebSdk = sdkStatus["cheerio"];
      const hasCaptureSdk = sdkStatus["playwright"];

      const capabilities = {
        canAnalyzeScreenshots: hasVisionSdk && hasAnyApiKey,
        canCaptureScreenshots: hasCaptureSdk,
        canManipulateImages: sdkStatus["sharp"],
        canSearchWeb:
          (envStatus.GEMINI_API_KEY?.available || envStatus.OPENAI_API_KEY?.available) &&
          (sdkStatus["@google/genai"] || sdkStatus["openai"]),
        canFetchUrls: true, // Native fetch available
        canSearchGitHub: true, // Native fetch, GITHUB_TOKEN optional
        canUpdateAgentsMd: true, // Always available (file system)
      };

      // Generate setup commands
      const setupCommands: string[] = [];
      if (includeSetupCommands) {
        const pm = packageManager;
        const installCmd = pm === "npm" ? "npm install" : pm === "yarn" ? "yarn add" : pm === "pnpm" ? "pnpm add" : "bun add";

        if (!sdkStatus["@google/genai"]) {
          setupCommands.push(`# Install Google AI SDK (for Gemini vision + search):`);
          setupCommands.push(`${installCmd} @google/genai`);
        }
        if (!sdkStatus["openai"]) {
          setupCommands.push(`# Install OpenAI SDK:`);
          setupCommands.push(`${installCmd} openai`);
        }
        if (!sdkStatus["cheerio"]) {
          setupCommands.push(`# Install Cheerio (for URL content extraction):`);
          setupCommands.push(`${installCmd} cheerio`);
        }
        if (!sdkStatus["sharp"]) {
          setupCommands.push(`# Install Sharp (for image manipulation):`);
          setupCommands.push(`${installCmd} sharp`);
        }
        if (!sdkStatus["playwright"]) {
          setupCommands.push(`# Install Playwright (for screenshot capture):`);
          setupCommands.push(`${installCmd} playwright`);
          setupCommands.push(`npx playwright install chromium`);
        }

        if (!envStatus.GEMINI_API_KEY?.available && !envStatus.GOOGLE_AI_API_KEY?.available) {
          setupCommands.push(`# Set Gemini API key (recommended for vision + search):`);
          setupCommands.push(`# Get key from: https://aistudio.google.com/apikey`);
          setupCommands.push(`# Then add to .env: GEMINI_API_KEY=your_key_here`);
        }

        if (!agentsMdPath) {
          setupCommands.push(`# Create AGENTS.md (project documentation for AI agents):`);
          setupCommands.push(`# Call: update_agents_md({ operation: "read", createIfMissing: true })`);
        }
      }

      const recommendation = !hasAnyApiKey
        ? "No API keys detected. Set GEMINI_API_KEY for best experience (vision + web search + agentic capabilities)."
        : !hasVisionSdk
          ? "API keys present but SDKs not installed. Run the setup commands to enable all features."
          : "Environment ready. All core capabilities available.";

      return {
        environment: {
          nodeVersion,
          packageManager,
          cwd: process.cwd(),
          gitStatus,
        },
        apiKeys: envStatus,
        sdks: checkSdks ? sdkStatus : "skipped (checkSdks: false)",
        capabilities,
        agentsMd: {
          found: !!agentsMdPath,
          path: agentsMdPath ?? null,
        },
        setupCommands: includeSetupCommands ? setupCommands : "skipped (includeSetupCommands: false)",
        recommendation,
        nextSteps: [
          !hasAnyApiKey ? "Set up API keys (GEMINI_API_KEY recommended)" : null,
          !hasVisionSdk ? "Install AI SDKs (@google/genai recommended)" : null,
          !agentsMdPath ? "Create AGENTS.md for project documentation" : null,
          !sdkStatus["cheerio"] ? "Install cheerio for better URL content extraction" : null,
        ].filter(Boolean),
      };
    },
  },

  {
    name: "generate_report",
    description:
      "Compile structured findings, eval results, and quality gate data into a formatted markdown report. Useful for summarizing verification cycles, creating audit trails, or generating stakeholder-ready documents.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Report title" },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              heading: { type: "string" },
              content: { type: "string" },
            },
            required: ["heading", "content"],
          },
          description: "Report sections with heading and markdown content",
        },
        metadata: {
          type: "object",
          properties: {
            author: { type: "string" },
            project: { type: "string" },
            version: { type: "string" },
          },
          description: "Optional report metadata (author, project, version)",
        },
        outputPath: { type: "string", description: "Optional file path to write the report to" },
      },
      required: ["title", "sections"],
    },
    handler: async (args: {
      title: string;
      sections: Array<{ heading: string; content: string }>;
      metadata?: { author?: string; project?: string; version?: string };
      outputPath?: string;
    }) => {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toISOString().slice(11, 19);

      const lines: string[] = [];
      lines.push(`# ${args.title}`);
      lines.push("");

      // Metadata block
      const meta = args.metadata ?? {};
      lines.push(`> Generated: ${dateStr} ${timeStr}`);
      if (meta.author) lines.push(`> Author: ${meta.author}`);
      if (meta.project) lines.push(`> Project: ${meta.project}`);
      if (meta.version) lines.push(`> Version: ${meta.version}`);
      lines.push("");
      lines.push("---");
      lines.push("");

      // Table of contents
      lines.push("## Table of Contents");
      lines.push("");
      for (let i = 0; i < args.sections.length; i++) {
        const slug = args.sections[i].heading.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        lines.push(`${i + 1}. [${args.sections[i].heading}](#${slug})`);
      }
      lines.push("");

      // Sections
      for (const section of args.sections) {
        lines.push(`## ${section.heading}`);
        lines.push("");
        lines.push(section.content);
        lines.push("");
      }

      // Footer
      lines.push("---");
      lines.push(`*Report generated by nodebench-mcp v2.4.0*`);

      const markdown = lines.join("\n");

      // Optionally write to file
      if (args.outputPath) {
        try {
          const fs = await import("node:fs");
          const path = await import("node:path");
          const dir = path.dirname(args.outputPath);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(args.outputPath, markdown, "utf-8");
          return {
            markdown,
            sections: args.sections.length,
            characters: markdown.length,
            writtenTo: args.outputPath,
            summary: `Generated ${args.sections.length}-section report (${markdown.length} chars) → ${args.outputPath}`,
          };
        } catch (err: any) {
          return {
            markdown,
            sections: args.sections.length,
            characters: markdown.length,
            writeError: err.message,
            summary: `Generated report but failed to write: ${err.message}`,
          };
        }
      }

      return {
        markdown,
        sections: args.sections.length,
        characters: markdown.length,
        summary: `Generated ${args.sections.length}-section report (${markdown.length} chars)`,
      };
    },
  },
];
