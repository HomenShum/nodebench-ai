/**
 * Security tools — dependency auditing and code security analysis.
 *
 * - scan_dependencies: Parse package manifests, detect known vulnerabilities and outdated packages
 * - run_code_analysis: Static analysis on code/text for security patterns, secrets, quality issues
 *
 * Both tools work locally without API keys — pure regex/pattern-based detection.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as childProcess from "node:child_process";
import type { McpTool } from "../types.js";

// ─── Dependency scanning ─────────────────────────────────────────────────────

interface DependencyInfo {
  name: string;
  version: string;
  type: "production" | "dev" | "optional";
}

interface VulnerabilityInfo {
  package: string;
  severity: "critical" | "high" | "moderate" | "low";
  title: string;
  url?: string;
}

function parsePackageJson(content: string): DependencyInfo[] {
  try {
    const pkg = JSON.parse(content);
    const deps: DependencyInfo[] = [];

    for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
      deps.push({ name, version: String(version), type: "production" });
    }
    for (const [name, version] of Object.entries(pkg.devDependencies ?? {})) {
      deps.push({ name, version: String(version), type: "dev" });
    }
    for (const [name, version] of Object.entries(pkg.optionalDependencies ?? {})) {
      deps.push({ name, version: String(version), type: "optional" });
    }

    return deps;
  } catch {
    return [];
  }
}

function parseRequirementsTxt(content: string): DependencyInfo[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("-"))
    .map((line) => {
      const match = line.match(/^([a-zA-Z0-9_-]+)\s*([><=!~]+\s*[\d.]+)?/);
      if (!match) return null;
      return { name: match[1], version: match[2]?.trim() || "*", type: "production" as const };
    })
    .filter(Boolean) as DependencyInfo[];
}

function runNpmAudit(projectRoot: string): VulnerabilityInfo[] {
  try {
    const result = childProcess.execSync("npm audit --json 2>/dev/null", {
      cwd: projectRoot,
      timeout: 30000,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    const audit = JSON.parse(result);
    const vulns: VulnerabilityInfo[] = [];

    if (audit.vulnerabilities) {
      for (const [pkg, info] of Object.entries(audit.vulnerabilities) as [string, any][]) {
        vulns.push({
          package: pkg,
          severity: info.severity ?? "moderate",
          title: info.fixAvailable ? `Fix available: ${typeof info.fixAvailable === "object" ? info.fixAvailable.name : "update"}` : "Vulnerable",
          url: info.via?.[0]?.url,
        });
      }
    }

    return vulns;
  } catch (err: any) {
    // npm audit returns exit code 1 when vulnerabilities found — still has valid JSON
    try {
      const output = err.stdout || err.output?.[1];
      if (typeof output === "string" && output.includes('"vulnerabilities"')) {
        const audit = JSON.parse(output);
        const vulns: VulnerabilityInfo[] = [];
        for (const [pkg, info] of Object.entries(audit.vulnerabilities ?? {}) as [string, any][]) {
          vulns.push({
            package: pkg,
            severity: info.severity ?? "moderate",
            title: info.fixAvailable ? "Fix available" : "Vulnerable",
            url: info.via?.[0]?.url,
          });
        }
        return vulns;
      }
    } catch { /* parsing failed */ }
    return [];
  }
}

// ─── Code analysis patterns ──────────────────────────────────────────────────

interface CodeFinding {
  check: string;
  severity: "HIGH" | "MEDIUM" | "LOW" | "INFO";
  line: number;
  column: number;
  description: string;
  remediation: string;
}

// Secret patterns (HIGH severity)
const SECRET_PATTERNS = [
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi, desc: "Hardcoded API key", remediation: "Move to environment variable" },
  { pattern: /(?:secret|token|password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi, desc: "Hardcoded secret/password", remediation: "Use a secrets manager or env var" },
  { pattern: /(?:sk|pk)[-_](?:live|test|prod)[a-zA-Z0-9_\-]{20,}/g, desc: "Stripe-style API key", remediation: "Move to environment variable" },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, desc: "GitHub personal access token", remediation: "Use GITHUB_TOKEN env var" },
  { pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/g, desc: "AWS access key ID", remediation: "Use AWS credentials file or IAM roles" },
  { pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g, desc: "Private key in source", remediation: "Move to secure key store" },
];

// Homograph patterns (same as terminal-security-scanner)
const CONFUSABLE_RANGES: Array<{ start: number; end: number; script: string }> = [
  { start: 0x0400, end: 0x04ff, script: "Cyrillic" },
  { start: 0x0370, end: 0x03ff, script: "Greek" },
  { start: 0xff00, end: 0xffef, script: "Fullwidth" },
];

const INVISIBLE_CHARS = [0x200b, 0x200c, 0x200d, 0x2060, 0xfeff];

// ANSI injection patterns
const ANSI_PATTERNS = [
  { pattern: /\x1b\]52;[^\x07\x1b]*(?:\x07|\x1b\\)/g, severity: "HIGH" as const, desc: "OSC 52 clipboard access" },
  { pattern: /\x1b\](?:0|1|2);[^\x07\x1b]*(?:\x07|\x1b\\)/g, severity: "MEDIUM" as const, desc: "OSC title spoofing" },
  { pattern: /\x1bP[^\x1b]*\x1b\\/g, severity: "MEDIUM" as const, desc: "DCS sequence" },
  { pattern: /\\x1[bB]|\\033|\\e\[/g, severity: "LOW" as const, desc: "Encoded ANSI escape" },
];

// URL patterns
const URL_RISK_PATTERNS = [
  { pattern: /data:\s*(?:text\/html|application\/javascript)[;,][^\s'")\]]+/gi, severity: "HIGH" as const, desc: "Executable data: URL" },
  { pattern: /javascript\s*:/gi, severity: "HIGH" as const, desc: "javascript: URL scheme" },
  { pattern: /https?:\/\/[^\s/]*xn--[^\s/]+/gi, severity: "MEDIUM" as const, desc: "Punycode/IDN domain" },
  { pattern: /https?:\/\/[^\s]*@[^\s]+/g, severity: "MEDIUM" as const, desc: "URL with credential confusion (@)" },
];

// Quality patterns
const QUALITY_PATTERNS = [
  { pattern: /\bTODO\b/gi, severity: "LOW" as const, desc: "TODO comment found" },
  { pattern: /\bFIXME\b/gi, severity: "MEDIUM" as const, desc: "FIXME comment found" },
  { pattern: /\bHACK\b/gi, severity: "LOW" as const, desc: "HACK comment found" },
  { pattern: /\bconsole\.(log|warn|error|debug)\s*\(/g, severity: "LOW" as const, desc: "Console statement (may be debug leftover)" },
  { pattern: /debugger\s*;/g, severity: "MEDIUM" as const, desc: "Debugger statement" },
];

function analyzeCode(content: string, checks: string[]): CodeFinding[] {
  const findings: CodeFinding[] = [];
  const lines = content.split("\n");

  const runPatterns = (patterns: Array<{ pattern: RegExp; severity?: string; desc: string; remediation?: string }>, check: string, defaultSeverity: CodeFinding["severity"]) => {
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      for (const p of patterns) {
        const regex = new RegExp(p.pattern.source, p.pattern.flags);
        let match: RegExpExecArray | null;
        while ((match = regex.exec(lines[lineIdx])) !== null) {
          findings.push({
            check,
            severity: (p.severity as CodeFinding["severity"]) ?? defaultSeverity,
            line: lineIdx + 1,
            column: match.index + 1,
            description: p.desc,
            remediation: p.remediation ?? `Review and address this ${check} finding`,
          });
        }
      }
    }
  };

  if (checks.includes("secrets")) {
    runPatterns(SECRET_PATTERNS, "secrets", "HIGH");
  }

  if (checks.includes("homograph")) {
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      for (let col = 0; col < lines[lineIdx].length; col++) {
        const cp = lines[lineIdx].codePointAt(col);
        if (cp === undefined) continue;

        if (INVISIBLE_CHARS.includes(cp)) {
          findings.push({
            check: "homograph",
            severity: "HIGH",
            line: lineIdx + 1,
            column: col + 1,
            description: `Invisible Unicode character (U+${cp.toString(16).toUpperCase().padStart(4, "0")})`,
            remediation: "Remove invisible characters that could hide malicious content",
          });
        } else {
          for (const range of CONFUSABLE_RANGES) {
            if (cp >= range.start && cp <= range.end) {
              findings.push({
                check: "homograph",
                severity: "MEDIUM",
                line: lineIdx + 1,
                column: col + 1,
                description: `${range.script} character (U+${cp.toString(16).toUpperCase().padStart(4, "0")}) may mimic ASCII`,
                remediation: `Replace with ASCII equivalent`,
              });
              break;
            }
          }
        }
        if (cp > 0xffff) col++; // Skip surrogate pair
      }
    }
  }

  if (checks.includes("ansi")) {
    runPatterns(ANSI_PATTERNS, "ansi", "MEDIUM");
  }

  if (checks.includes("urls")) {
    runPatterns(URL_RISK_PATTERNS, "urls", "MEDIUM");
  }

  if (checks.includes("quality")) {
    runPatterns(QUALITY_PATTERNS, "quality", "LOW");
  }

  return findings;
}

// ─── Tools ───────────────────────────────────────────────────────────────────

export const securityTools: McpTool[] = [
  {
    name: "scan_dependencies",
    description:
      "Scan a project's dependency manifest for vulnerabilities and outdated packages. Auto-detects package.json, requirements.txt, Cargo.toml, and go.mod. Runs npm audit when available. Returns structured findings with severity and remediation guidance.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string", description: "Project root directory (default: current working directory)" },
        packageFile: { type: "string", description: "Specific package file path to scan (overrides auto-detection)" },
      },
    },
    handler: async (args: { projectRoot?: string; packageFile?: string }) => {
      const root = args.projectRoot || process.cwd();

      // Auto-detect or use specified package file
      const manifests: Array<{ path: string; type: string }> = [];

      if (args.packageFile) {
        const ext = path.extname(args.packageFile);
        manifests.push({
          path: args.packageFile,
          type: ext === ".txt" ? "pip" : args.packageFile.includes("Cargo") ? "cargo" : "npm",
        });
      } else {
        const candidates = [
          { file: "package.json", type: "npm" },
          { file: "requirements.txt", type: "pip" },
          { file: "Cargo.toml", type: "cargo" },
          { file: "go.mod", type: "go" },
        ];

        for (const c of candidates) {
          const fullPath = path.join(root, c.file);
          try {
            if (fs.statSync(fullPath).isFile()) {
              manifests.push({ path: fullPath, type: c.type });
            }
          } catch { /* not found */ }
        }
      }

      if (manifests.length === 0) {
        return { error: true, message: "No package manifest found", scannedPaths: [root] };
      }

      const results: Array<{
        manifest: string;
        type: string;
        packages: number;
        dependencies: DependencyInfo[];
        vulnerabilities: VulnerabilityInfo[];
      }> = [];

      for (const manifest of manifests) {
        let content: string;
        try {
          content = fs.readFileSync(manifest.path, "utf-8");
        } catch {
          continue;
        }

        let dependencies: DependencyInfo[] = [];
        let vulnerabilities: VulnerabilityInfo[] = [];

        if (manifest.type === "npm") {
          dependencies = parsePackageJson(content);
          vulnerabilities = runNpmAudit(root);
        } else if (manifest.type === "pip") {
          dependencies = parseRequirementsTxt(content);
        }

        results.push({
          manifest: manifest.path,
          type: manifest.type,
          packages: dependencies.length,
          dependencies,
          vulnerabilities,
        });
      }

      const totalPackages = results.reduce((s, r) => s + r.packages, 0);
      const totalVulns = results.reduce((s, r) => s + r.vulnerabilities.length, 0);
      const criticalVulns = results.flatMap((r) => r.vulnerabilities).filter((v) => v.severity === "critical").length;
      const highVulns = results.flatMap((r) => r.vulnerabilities).filter((v) => v.severity === "high").length;

      return {
        projectRoot: root,
        manifests: results.map((r) => r.manifest),
        totalPackages,
        totalVulnerabilities: totalVulns,
        bySeverity: {
          critical: criticalVulns,
          high: highVulns,
          moderate: results.flatMap((r) => r.vulnerabilities).filter((v) => v.severity === "moderate").length,
          low: results.flatMap((r) => r.vulnerabilities).filter((v) => v.severity === "low").length,
        },
        vulnerabilities: results.flatMap((r) => r.vulnerabilities),
        dependencies: results.flatMap((r) => r.dependencies),
        summary: totalVulns === 0
          ? `Scanned ${totalPackages} packages across ${results.length} manifest(s). No known vulnerabilities detected.`
          : `Scanned ${totalPackages} packages. Found ${totalVulns} vulnerabilities (${criticalVulns} critical, ${highVulns} high). Run 'npm audit fix' to resolve.`,
      };
    },
  },

  {
    name: "run_code_analysis",
    description:
      "Static analysis on code or text content for security issues, secrets, homograph attacks, ANSI injections, suspicious URLs, and code quality. Returns structured findings with severity, line numbers, and remediation. Works on any text content — no file system access needed.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "The code or text content to analyze" },
        checks: {
          type: "array",
          items: { type: "string", enum: ["security", "secrets", "homograph", "ansi", "urls", "quality", "all"] },
          description: "Which checks to run (default: ['all'])",
        },
        filename: { type: "string", description: "Optional filename for context in findings" },
      },
      required: ["content"],
    },
    handler: async (args: { content: string; checks?: string[]; filename?: string }) => {
      let checks = args.checks ?? ["all"];

      // Expand "all" and "security"
      if (checks.includes("all")) {
        checks = ["secrets", "homograph", "ansi", "urls", "quality"];
      } else if (checks.includes("security")) {
        checks = [...new Set([...checks.filter((c) => c !== "security"), "secrets", "homograph", "ansi", "urls"])];
      }

      const findings = analyzeCode(args.content, checks);
      const fname = args.filename ?? "<input>";

      // Add filename to findings
      const withFile = findings.map((f) => ({ ...f, file: fname }));

      const bySeverity = { HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
      for (const f of findings) bySeverity[f.severity]++;

      const byCheck: Record<string, number> = {};
      for (const f of findings) byCheck[f.check] = (byCheck[f.check] || 0) + 1;

      return {
        findings: withFile,
        totalFindings: findings.length,
        bySeverity,
        byCheck,
        checksRun: checks,
        linesAnalyzed: args.content.split("\n").length,
        summary: findings.length === 0
          ? `No issues found across ${checks.length} check categories.`
          : `Found ${findings.length} issues: ${bySeverity.HIGH} HIGH, ${bySeverity.MEDIUM} MEDIUM, ${bySeverity.LOW} LOW.`,
      };
    },
  },

  {
    name: "scan_terminal_security",
    description:
      "Scan project files and dev environment for terminal security threats: Unicode homograph attacks, ANSI escape injections, invisible characters, and suspicious URL patterns. Auto-discovers dotfiles, CI configs, env files, shell scripts, and package manifests. Inspired by github.com/HomenShum/terminal-security-scanner.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string", description: "Project root directory to scan (default: cwd)" },
        scanHome: { type: "boolean", description: "Also scan home directory dotfiles (default: false)" },
        checks: {
          type: "array",
          items: { type: "string", enum: ["homograph", "ansi", "urls", "all"] },
          description: "Which checks to run (default: ['all'])",
        },
        verbose: { type: "boolean", description: "Include line-level details in output (default: false)" },
      },
    },
    handler: async (args: { projectRoot?: string; scanHome?: boolean; checks?: string[]; verbose?: boolean }) => {
      const root = args.projectRoot || process.cwd();
      const homeDir = process.env.HOME || process.env.USERPROFILE || "";
      let checks = args.checks ?? ["all"];
      if (checks.includes("all")) checks = ["homograph", "ansi", "urls"];

      // File discovery patterns
      const projectGlobs = [
        ".env", ".env.local", ".env.production", ".env.development",
        "Makefile", "Dockerfile", "Jenkinsfile",
        "package.json", "tsconfig.json",
      ];
      const projectDirGlobs = [
        { dir: ".github/workflows", ext: ".yml" },
        { dir: ".github/workflows", ext: ".yaml" },
      ];
      const homeFiles = [
        ".bashrc", ".zshrc", ".bash_profile", ".profile",
        ".gitconfig", ".npmrc",
      ];
      const shellScriptExts = [".sh", ".bash", ".zsh"];

      const filesToScan: Array<{ filePath: string; category: string }> = [];

      // Discover project files
      for (const f of projectGlobs) {
        const fp = path.join(root, f);
        try { if (fs.statSync(fp).isFile()) filesToScan.push({ filePath: fp, category: "config" }); } catch {}
      }

      // Discover CI workflow files
      for (const dg of projectDirGlobs) {
        const dir = path.join(root, dg.dir);
        try {
          if (fs.statSync(dir).isDirectory()) {
            for (const f of fs.readdirSync(dir)) {
              if (f.endsWith(dg.ext)) filesToScan.push({ filePath: path.join(dir, f), category: "ci" });
            }
          }
        } catch {}
      }

      // Discover shell scripts in project root
      try {
        for (const f of fs.readdirSync(root)) {
          if (shellScriptExts.some((ext) => f.endsWith(ext))) {
            filesToScan.push({ filePath: path.join(root, f), category: "script" });
          }
        }
      } catch {}

      // Optionally scan home directory
      if (args.scanHome && homeDir) {
        for (const f of homeFiles) {
          const fp = path.join(homeDir, f);
          try { if (fs.statSync(fp).isFile()) filesToScan.push({ filePath: fp, category: "dotfile" }); } catch {}
        }
      }

      // Scan each file
      const fileResults: Array<{
        file: string;
        category: string;
        findings: number;
        highSeverity: number;
        details: Array<{ severity: string; line: number; description: string }> | string;
      }> = [];
      let totalFindings = 0;
      let totalHigh = 0;

      for (const entry of filesToScan) {
        let content: string;
        try { content = fs.readFileSync(entry.filePath, "utf-8"); } catch { continue; }

        const findings = analyzeCode(content, checks);
        const highCount = findings.filter((f) => f.severity === "HIGH").length;
        totalFindings += findings.length;
        totalHigh += highCount;

        if (findings.length > 0 || args.verbose) {
          fileResults.push({
            file: entry.filePath,
            category: entry.category,
            findings: findings.length,
            highSeverity: highCount,
            details: args.verbose
              ? findings.map((f) => ({ severity: f.severity, line: f.line, description: f.description }))
              : findings.length > 0 ? `${findings.length} finding(s) — use verbose:true for details` : "clean",
          });
        }
      }

      return {
        projectRoot: root,
        filesScanned: filesToScan.length,
        filesWithFindings: fileResults.filter((r) => r.findings > 0).length,
        totalFindings,
        highSeverity: totalHigh,
        checksRun: checks,
        scanTargets: {
          config: filesToScan.filter((f) => f.category === "config").length,
          ci: filesToScan.filter((f) => f.category === "ci").length,
          script: filesToScan.filter((f) => f.category === "script").length,
          dotfile: filesToScan.filter((f) => f.category === "dotfile").length,
        },
        results: fileResults,
        summary: totalFindings === 0
          ? `Scanned ${filesToScan.length} files. No terminal security threats detected.`
          : `Scanned ${filesToScan.length} files. Found ${totalFindings} issues (${totalHigh} HIGH). Review results for homograph attacks, ANSI injections, and suspicious URLs.`,
      };
    },
  },
];
