#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const apply = process.argv.includes("--apply");
const repo = process.env.GITHUB_REPOSITORY || process.env.NODEBENCH_GITHUB_REPOSITORY || "HomenShum/nodebench-ai";
const [owner, name] = repo.split("/");

if (!owner || !name) {
  throw new Error(`Invalid repository identifier: ${repo}`);
}

function runGh(args, input) {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `gh ${args.join(" ")} failed with exit ${result.status}`,
        result.stdout.trim(),
        result.stderr.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result.stdout.trim();
}

function request(method, path, body) {
  const args = [
    "api",
    "--method",
    method,
    path,
    "--header",
    "Accept: application/vnd.github+json",
    "--header",
    "X-GitHub-Api-Version: 2022-11-28",
  ];

  const payload = body === undefined ? undefined : JSON.stringify(body);
  if (payload !== undefined) {
    args.push("--input", "-");
  }

  if (!apply) {
    console.log(`[dry-run] ${method} ${path}`);
    if (payload !== undefined) {
      console.log(payload);
    }
    return;
  }

  console.log(`[apply] ${method} ${path}`);
  runGh(args, payload);
}

const repoPath = `/repos/${owner}/${name}`;

request("PATCH", repoPath, {
  description:
    "Entity intelligence workspace for chat-first research, living reports, Convex runtime state, and MCP tools.",
  homepage: "https://www.nodebenchai.com",
  has_issues: true,
  has_discussions: true,
  has_projects: true,
  has_wiki: false,
  allow_squash_merge: true,
  allow_merge_commit: false,
  allow_rebase_merge: true,
  delete_branch_on_merge: true,
});

request("PUT", `${repoPath}/topics`, {
  names: [
    "ai",
    "agents",
    "convex",
    "mcp",
    "research",
    "entity-intelligence",
    "typescript",
    "workspace",
  ],
});

request("PUT", `${repoPath}/vulnerability-alerts`);
request("PUT", `${repoPath}/automated-security-fixes`);

request("PUT", `${repoPath}/branches/main/protection`, {
  required_status_checks: {
    strict: true,
    contexts: ["CI / Typecheck", "CI / Runtime smoke", "CI / Build"],
  },
  enforce_admins: null,
  required_pull_request_reviews: {
    dismiss_stale_reviews: true,
    require_code_owner_reviews: true,
    required_approving_review_count: 1,
  },
  restrictions: null,
  required_linear_history: false,
  allow_force_pushes: false,
  allow_deletions: false,
  block_creations: false,
  required_conversation_resolution: true,
});

console.log(
  apply
    ? `Repository settings applied for ${repo}.`
    : `Dry run complete for ${repo}. Re-run with --apply after gh auth is valid.`,
);
