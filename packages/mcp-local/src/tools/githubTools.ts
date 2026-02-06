/**
 * GitHub tools — Repository search and analysis.
 * Enables agents to discover and analyze GitHub repositories for learning patterns,
 * finding prior art, and understanding tech stacks.
 *
 * - search_github: Search repositories by topic, language, stars
 * - analyze_repo: Analyze a repo's structure, tech stack, and patterns
 *
 * Uses GitHub REST API. GITHUB_TOKEN optional but recommended for higher rate limits.
 */

import type { McpTool } from "../types.js";

// ─── GitHub API helpers ───────────────────────────────────────────────────────

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "NodeBench-MCP/1.0",
  };

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function githubFetch(endpoint: string): Promise<any> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `https://api.github.com${endpoint}`;

  const response = await fetch(url, { headers: getHeaders() });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${error}`);
  }

  return response.json();
}

// ─── Repo URL parsing ─────────────────────────────────────────────────────────

function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  // Handle: https://github.com/owner/repo, github.com/owner/repo, owner/repo
  const patterns = [
    /github\.com\/([^/]+)\/([^/]+)/,
    /^([^/]+)\/([^/]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ""),
      };
    }
  }

  return null;
}

// ─── Dependency detection ─────────────────────────────────────────────────────

interface Dependencies {
  dependencies: string[];
  devDependencies: string[];
  frameworks: string[];
}

function detectDependencies(files: Map<string, string>): Dependencies {
  const deps: Dependencies = {
    dependencies: [],
    devDependencies: [],
    frameworks: [],
  };

  // Check package.json
  const packageJson = files.get("package.json");
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson);
      deps.dependencies = Object.keys(pkg.dependencies ?? {});
      deps.devDependencies = Object.keys(pkg.devDependencies ?? {});

      // Detect frameworks
      const allDeps = [...deps.dependencies, ...deps.devDependencies];
      if (allDeps.includes("next")) deps.frameworks.push("Next.js");
      if (allDeps.includes("react")) deps.frameworks.push("React");
      if (allDeps.includes("vue")) deps.frameworks.push("Vue");
      if (allDeps.includes("svelte")) deps.frameworks.push("Svelte");
      if (allDeps.includes("express")) deps.frameworks.push("Express");
      if (allDeps.includes("fastify")) deps.frameworks.push("Fastify");
      if (allDeps.includes("hono")) deps.frameworks.push("Hono");
      if (allDeps.includes("convex")) deps.frameworks.push("Convex");
      if (allDeps.includes("prisma") || allDeps.includes("@prisma/client")) deps.frameworks.push("Prisma");
      if (allDeps.includes("drizzle-orm")) deps.frameworks.push("Drizzle");
      if (allDeps.includes("@tanstack/react-query")) deps.frameworks.push("TanStack Query");
      if (allDeps.includes("tailwindcss")) deps.frameworks.push("Tailwind CSS");
      if (allDeps.includes("@modelcontextprotocol/sdk")) deps.frameworks.push("MCP SDK");
    } catch {
      // Invalid JSON
    }
  }

  // Check requirements.txt
  const requirements = files.get("requirements.txt");
  if (requirements) {
    const pythonDeps = requirements
      .split("\n")
      .map((line) => line.split("==")[0].split(">=")[0].trim())
      .filter(Boolean);
    deps.dependencies.push(...pythonDeps);

    if (pythonDeps.includes("fastapi")) deps.frameworks.push("FastAPI");
    if (pythonDeps.includes("django")) deps.frameworks.push("Django");
    if (pythonDeps.includes("flask")) deps.frameworks.push("Flask");
    if (pythonDeps.includes("langchain")) deps.frameworks.push("LangChain");
    if (pythonDeps.includes("openai")) deps.frameworks.push("OpenAI Python");
  }

  // Check Cargo.toml
  const cargoToml = files.get("Cargo.toml");
  if (cargoToml) {
    const depMatch = cargoToml.match(/\[dependencies\]([\s\S]*?)(\[|$)/);
    if (depMatch) {
      const rustDeps = depMatch[1]
        .split("\n")
        .map((line) => line.split("=")[0].trim())
        .filter(Boolean);
      deps.dependencies.push(...rustDeps);

      if (rustDeps.includes("axum")) deps.frameworks.push("Axum");
      if (rustDeps.includes("actix-web")) deps.frameworks.push("Actix");
      if (rustDeps.includes("tokio")) deps.frameworks.push("Tokio");
    }
  }

  return deps;
}

// ─── Pattern detection ────────────────────────────────────────────────────────

interface Patterns {
  hasTests: boolean;
  hasCi: boolean;
  hasReadme: boolean;
  hasDocs: boolean;
  hasTypes: boolean;
  hasDocker: boolean;
  hasLicense: boolean;
  testFramework: string | null;
  ciPlatform: string | null;
}

function detectPatterns(tree: string[]): Patterns {
  const patterns: Patterns = {
    hasTests: false,
    hasCi: false,
    hasReadme: false,
    hasDocs: false,
    hasTypes: false,
    hasDocker: false,
    hasLicense: false,
    testFramework: null,
    ciPlatform: null,
  };

  for (const path of tree) {
    const lower = path.toLowerCase();

    // Tests
    if (
      lower.includes("test") ||
      lower.includes("__tests__") ||
      lower.includes("spec")
    ) {
      patterns.hasTests = true;
      if (lower.includes("vitest")) patterns.testFramework = "Vitest";
      else if (lower.includes("jest")) patterns.testFramework = "Jest";
      else if (lower.includes("pytest")) patterns.testFramework = "pytest";
      else if (lower.includes("mocha")) patterns.testFramework = "Mocha";
    }

    // CI/CD
    if (lower.includes(".github/workflows")) {
      patterns.hasCi = true;
      patterns.ciPlatform = "GitHub Actions";
    } else if (lower.includes(".circleci")) {
      patterns.hasCi = true;
      patterns.ciPlatform = "CircleCI";
    } else if (lower.includes("gitlab-ci")) {
      patterns.hasCi = true;
      patterns.ciPlatform = "GitLab CI";
    }

    // Docs
    if (lower === "readme.md" || lower === "readme") patterns.hasReadme = true;
    if (lower.includes("docs/") || lower.includes("documentation/")) patterns.hasDocs = true;
    if (lower === "license" || lower === "license.md") patterns.hasLicense = true;

    // Types
    if (lower.endsWith(".d.ts") || lower === "tsconfig.json") patterns.hasTypes = true;

    // Docker
    if (lower.includes("dockerfile") || lower.includes("docker-compose")) patterns.hasDocker = true;
  }

  return patterns;
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export const githubTools: McpTool[] = [
  {
    name: "search_github",
    description:
      "Search GitHub repositories by query, topic, language, and star count. Useful for discovering libraries, frameworks, prior art, and learning from existing implementations. Returns repo metadata including stars, forks, description, and topics. GITHUB_TOKEN optional but recommended for higher rate limits.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (e.g., 'mcp server', 'ai agents', 'typescript sdk')",
        },
        language: {
          type: "string",
          description: "Filter by programming language (e.g., 'typescript', 'python', 'rust')",
        },
        topic: {
          type: "string",
          description: "Filter by GitHub topic (e.g., 'mcp', 'ai-agents', 'llm')",
        },
        minStars: {
          type: "number",
          description: "Minimum star count (default: 10)",
        },
        sort: {
          type: "string",
          enum: ["stars", "updated", "relevance"],
          description: "Sort order: 'stars' (most popular), 'updated' (recently active), 'relevance' (best match). Default: 'stars'.",
        },
        maxResults: {
          type: "number",
          description: "Maximum results to return (default: 10, max: 30)",
        },
      },
      required: ["query"],
    },
    handler: async (args) => {
      const query = args.query as string;
      const language = args.language as string | undefined;
      const topic = args.topic as string | undefined;
      const minStars = (args.minStars as number) ?? 10;
      const sort = (args.sort as string) ?? "stars";
      const maxResults = Math.min((args.maxResults as number) ?? 10, 30);

      // Build GitHub search query
      const queryParts = [query];
      if (language) queryParts.push(`language:${language}`);
      if (topic) queryParts.push(`topic:${topic}`);
      if (minStars > 0) queryParts.push(`stars:>=${minStars}`);

      const searchQuery = encodeURIComponent(queryParts.join(" "));
      const sortParam = sort === "relevance" ? "" : `&sort=${sort}`;

      try {
        const data = await githubFetch(
          `/search/repositories?q=${searchQuery}${sortParam}&per_page=${maxResults}`
        );

        const repos = (data.items ?? []).map((item: any) => ({
          name: item.name,
          fullName: item.full_name,
          description: item.description ?? "",
          url: item.html_url,
          stars: item.stargazers_count,
          forks: item.forks_count,
          language: item.language,
          topics: item.topics ?? [],
          updatedAt: item.updated_at,
          license: item.license?.spdx_id ?? null,
          isArchived: item.archived,
          openIssues: item.open_issues_count,
        }));

        return {
          query,
          filters: { language, topic, minStars, sort },
          repos,
          totalCount: data.total_count,
          resultCount: repos.length,
          hasGitHubToken: !!(process.env.GITHUB_TOKEN || process.env.GH_TOKEN),
        };
      } catch (err: any) {
        return {
          error: true,
          query,
          message: `GitHub search failed: ${err.message}`,
          suggestion:
            "Check network connectivity. Set GITHUB_TOKEN for higher rate limits (60/hour without, 5000/hour with).",
        };
      }
    },
  },
  {
    name: "analyze_repo",
    description:
      "Analyze a GitHub repository's structure, tech stack, dependencies, and development patterns. Fetches repo metadata, file tree, and key configuration files (package.json, requirements.txt, etc.) to understand the project. No cloning required — uses GitHub API. Useful for learning from implementations, evaluating libraries, and understanding architectures.",
    inputSchema: {
      type: "object",
      properties: {
        repoUrl: {
          type: "string",
          description: "GitHub repository URL or owner/repo (e.g., 'https://github.com/anthropics/claude-code', 'anthropics/claude-code')",
        },
        depth: {
          type: "string",
          enum: ["shallow", "standard", "deep"],
          description:
            "Analysis depth: 'shallow' (metadata only), 'standard' (+ file tree + key files), 'deep' (+ more files). Default: 'standard'.",
        },
      },
      required: ["repoUrl"],
    },
    handler: async (args) => {
      const repoUrl = args.repoUrl as string;
      const depth = (args.depth as string) ?? "standard";

      const parsed = parseRepoUrl(repoUrl);
      if (!parsed) {
        return {
          error: true,
          repoUrl,
          message: "Invalid repository URL format",
          suggestion: "Use format: 'owner/repo' or 'https://github.com/owner/repo'",
        };
      }

      const { owner, repo } = parsed;

      try {
        // Fetch repo metadata
        const repoData = await githubFetch(`/repos/${owner}/${repo}`);

        const result: any = {
          repo: {
            name: repoData.name,
            fullName: repoData.full_name,
            description: repoData.description,
            url: repoData.html_url,
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            language: repoData.language,
            topics: repoData.topics ?? [],
            createdAt: repoData.created_at,
            updatedAt: repoData.updated_at,
            pushedAt: repoData.pushed_at,
            defaultBranch: repoData.default_branch,
            license: repoData.license?.spdx_id ?? null,
            isArchived: repoData.archived,
            openIssues: repoData.open_issues_count,
          },
          depth,
          analyzedAt: new Date().toISOString(),
        };

        if (depth === "shallow") {
          return result;
        }

        // Fetch file tree
        const defaultBranch = repoData.default_branch ?? "main";
        const treeData = await githubFetch(
          `/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
        );

        const tree = (treeData.tree ?? [])
          .filter((item: any) => item.type === "blob")
          .map((item: any) => item.path);

        // Analyze structure
        const directories = new Set<string>();
        for (const path of tree) {
          const parts = path.split("/");
          for (let i = 1; i < parts.length; i++) {
            directories.add(parts.slice(0, i).join("/"));
          }
        }

        const keyFiles = tree.filter((path: string) => {
          const name = path.toLowerCase();
          return (
            name === "readme.md" ||
            name === "package.json" ||
            name === "tsconfig.json" ||
            name === "requirements.txt" ||
            name === "cargo.toml" ||
            name === "go.mod" ||
            name === "dockerfile" ||
            name.includes("docker-compose") ||
            name === ".env.example" ||
            name === "agents.md"
          );
        });

        result.structure = {
          directories: Array.from(directories).slice(0, 50),
          keyFiles,
          fileCount: tree.length,
          truncated: treeData.truncated ?? false,
        };

        // Detect patterns
        result.patterns = detectPatterns(tree);

        // Fetch key files for dependency analysis
        const filesToFetch = ["package.json", "requirements.txt", "Cargo.toml"];
        const fetchedFiles = new Map<string, string>();

        for (const filename of filesToFetch) {
          if (tree.includes(filename)) {
            try {
              const fileData = await githubFetch(
                `/repos/${owner}/${repo}/contents/${filename}`
              );
              if (fileData.content) {
                const content = Buffer.from(fileData.content, "base64").toString("utf-8");
                fetchedFiles.set(filename, content);
              }
            } catch {
              // File not accessible
            }
          }
        }

        // Detect tech stack
        const deps = detectDependencies(fetchedFiles);
        result.techStack = {
          primaryLanguage: repoData.language,
          languages: {}, // Would need languages API call
          dependencies: deps.dependencies.slice(0, 30),
          devDependencies: deps.devDependencies.slice(0, 20),
          frameworksDetected: deps.frameworks,
        };

        // Generate recommendation
        const recommendations: string[] = [];
        if (!result.patterns.hasReadme) recommendations.push("Add a README.md");
        if (!result.patterns.hasTests) recommendations.push("Add tests");
        if (!result.patterns.hasCi) recommendations.push("Set up CI/CD");
        if (!result.patterns.hasTypes && repoData.language === "TypeScript")
          recommendations.push("Ensure TypeScript types are exported");
        if (!result.patterns.hasLicense) recommendations.push("Add a license");

        result.recommendation =
          recommendations.length > 0
            ? `Suggestions: ${recommendations.join(", ")}`
            : "Repository follows good practices (README, tests, CI, license detected).";

        return result;
      } catch (err: any) {
        return {
          error: true,
          repoUrl,
          owner,
          repo,
          message: `Repository analysis failed: ${err.message}`,
          suggestion:
            "Check that the repository exists and is public. Set GITHUB_TOKEN for private repos or higher rate limits.",
        };
      }
    },
  },

  {
    name: "monitor_repo",
    description:
      "Track a GitHub repository's key metrics: stars, forks, open issues, recent releases, commit frequency, and contributor activity. Useful for competitive analysis, dependency health checks, and trend monitoring.",
    inputSchema: {
      type: "object",
      properties: {
        repo: {
          type: "string",
          description: "Repository in 'owner/name' format or full GitHub URL",
        },
      },
      required: ["repo"],
    },
    handler: async (args: { repo: string }) => {
      const start = Date.now();
      const parsed = parseRepoUrl(args.repo);
      if (!parsed) {
        return { error: true, message: "Invalid repo format. Use 'owner/name' or a GitHub URL." };
      }

      try {
        // Fetch repo info, recent releases, and recent commits in parallel
        const [repoData, releasesData, commitsData] = await Promise.all([
          githubFetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`),
          githubFetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/releases?per_page=5`),
          githubFetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=30`),
        ]);

        const repo = repoData as any;
        const releases = (releasesData ?? []) as any[];
        const commits = (commitsData ?? []) as any[];

        // Calculate commit frequency (commits per day over last 30)
        const commitDates = commits
          .map((c: any) => c.commit?.author?.date)
          .filter(Boolean)
          .map((d: string) => new Date(d).getTime());

        let commitsPerDay = 0;
        if (commitDates.length >= 2) {
          const span = (Math.max(...commitDates) - Math.min(...commitDates)) / (24 * 60 * 60 * 1000);
          commitsPerDay = span > 0 ? Math.round((commitDates.length / span) * 10) / 10 : commitDates.length;
        }

        // Unique contributors in recent commits
        const contributors = new Set(commits.map((c: any) => c.author?.login).filter(Boolean));

        return {
          repo: `${parsed.owner}/${parsed.repo}`,
          metrics: {
            stars: repo.stargazers_count ?? 0,
            forks: repo.forks_count ?? 0,
            openIssues: repo.open_issues_count ?? 0,
            watchers: repo.subscribers_count ?? 0,
            size: repo.size ?? 0,
            language: repo.language ?? null,
            license: repo.license?.spdx_id ?? null,
            archived: repo.archived ?? false,
          },
          activity: {
            commitsPerDay,
            recentContributors: contributors.size,
            lastPush: repo.pushed_at ?? null,
            lastCommit: commits[0]?.commit?.message?.split("\n")[0] ?? null,
          },
          releases: releases.slice(0, 5).map((r: any) => ({
            tag: r.tag_name,
            name: r.name,
            published: r.published_at,
            prerelease: r.prerelease,
          })),
          health: {
            hasReadme: repo.has_wiki !== undefined,
            hasLicense: !!repo.license,
            defaultBranch: repo.default_branch,
            isArchived: repo.archived ?? false,
            description: repo.description ?? null,
          },
          latencyMs: Date.now() - start,
          summary: `${parsed.owner}/${parsed.repo}: ${repo.stargazers_count ?? 0} stars, ${repo.forks_count ?? 0} forks, ${commitsPerDay} commits/day, ${contributors.size} recent contributors`,
        };
      } catch (err: any) {
        return {
          error: true,
          repo: `${parsed.owner}/${parsed.repo}`,
          message: `Failed to monitor repo: ${err.message}`,
          latencyMs: Date.now() - start,
        };
      }
    },
  },
];
