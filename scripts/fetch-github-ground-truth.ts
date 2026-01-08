#!/usr/bin/env npx tsx

/**
 * GitHub Trending Ground Truth Fetcher
 * 
 * Fetches trending repositories from GitHub for market evaluation scenarios.
 * 
 * Usage:
 *   npx tsx scripts/fetch-github-ground-truth.ts --query "created:>2025-01-01" --sort stars --limit 10
 *   npx tsx scripts/fetch-github-ground-truth.ts --output docs/architecture/benchmarks/github-ground-truth.json
 */

import dotenv from "dotenv";
import { writeFileSync } from "node:fs";

dotenv.config();

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  htmlUrl: string;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  language: string;
  owner: string;
  ownerUrl: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  topics?: string[];
  license?: string;
}

interface GitHubSearchResult {
  totalCount: number;
  items: GitHubRepo[];
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function getMultiArg(flag: string): string[] {
  const result: string[] = [];
  let idx = process.argv.indexOf(flag);
  while (idx >= 0) {
    if (idx + 1 < process.argv.length && !process.argv[idx + 1].startsWith("-")) {
      result.push(process.argv[idx + 1]);
    }
    idx = process.argv.indexOf(flag, idx + 1);
  }
  return result;
}

async function searchGitHub(
  query: string,
  sort: string = "stars",
  order: string = "desc",
  perPage: number = 10
): Promise<GitHubSearchResult> {
  const searchUrl = new URL("https://api.github.com/search/repositories");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("sort", sort);
  searchUrl.searchParams.set("order", order);
  searchUrl.searchParams.set("per_page", perPage.toString());

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Add auth if available (higher rate limits)
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(searchUrl.toString(), { headers });

  if (!response.ok) {
    if (response.status === 403) {
      const resetAfter = response.headers.get("X-RateLimit-Reset");
      const resetTime = resetAfter ? new Date(parseInt(resetAfter) * 1000).toISOString() : "unknown";
      console.log(`  [WARN] Rate limited. Resets at: ${resetTime}`);
      throw new Error(`GitHub API rate limited. Retry after ${resetTime}`);
    }
    throw new Error(`GitHub search error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;
  const items = data.items || [];

  return {
    totalCount: data.total_count || 0,
    items: items.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || "",
      url: repo.url,
      htmlUrl: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.watchers_count,
      openIssues: repo.open_issues_count,
      language: repo.language || "",
      owner: repo.owner?.login || "",
      ownerUrl: repo.owner?.html_url || "",
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      topics: repo.topics || [],
      license: repo.license?.spdx_id || "",
    })),
  };
}

async function fetchTrendingRepos(
  createdAfter?: string,
  language?: string,
  limit: number = 10
): Promise<GitHubRepo[]> {
  const queryParts: string[] = [];
  
  if (createdAfter) {
    queryParts.push(`created:>${createdAfter}`);
  }
  if (language) {
    queryParts.push(`language:${language}`);
  }
  
  const query = queryParts.length > 0 ? queryParts.join(" ") : "stars:>1000";
  
  const result = await searchGitHub(query, "stars", "desc", limit);
  
  return result.items;
}

async function fetchAIRepos(limit: number = 10): Promise<GitHubRepo[]> {
  const result = await searchGitHub("topic:AI topic:machine-learning created:>2024-01-01", "stars", "desc", limit);
  return result.items;
}

async function main() {
  const outputPath = getArg("--output") || "docs/architecture/benchmarks/github-ground-truth.json";
  const queryFromArgs = getArg("--query");
  const sortArg = getArg("--sort") || "stars";
  const limitArg = parseInt(getArg("--limit") || "10", 10);
  const fetchAI = process.argv.includes("--ai");
  
  const results: Record<string, GitHubRepo> = {};
  
  if (queryFromArgs) {
    console.log(`Searching GitHub: "${queryFromArgs}"...`);
    const result = await searchGitHub(queryFromArgs, sortArg, "desc", limitArg);
    console.log(`  Found ${result.totalCount} total, fetching top ${result.items.length}`);
    for (const repo of result.items) {
      results[repo.fullName] = repo;
    }
  } else if (fetchAI) {
    console.log("Fetching trending AI repositories...");
    const repos = await fetchAIRepos(limitArg);
    for (const repo of repos) {
      results[repo.fullName] = repo;
    }
  } else {
    // Default: fetch trending repos created this week in popular languages
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const dateStr = oneWeekAgo.toISOString().split('T')[0];
    
    console.log(`Fetching trending repositories created after ${dateStr}...`);
    
    const languages = ["JavaScript", "Python", "TypeScript", "Rust", "Go"];
    for (const lang of languages) {
      console.log(`  Fetching ${lang} repos...`);
      const repos = await fetchTrendingRepos(dateStr, lang, 3);
      for (const repo of repos) {
        results[repo.fullName] = repo;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  const output = {
    generatedAt: new Date().toISOString(),
    source: "GitHub API",
    sourceUrl: "https://api.github.com/search/repositories",
    repos: results,
  };
  
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${Object.keys(results).length} repositories to ${outputPath}`);
}

main().catch(console.error);
