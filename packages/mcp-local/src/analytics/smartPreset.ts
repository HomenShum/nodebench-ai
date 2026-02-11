/**
 * Smart Preset Generator — Weighted Multi-Signal Scoring Model
 *
 * Recommends preset (default vs full) using 5 weighted signals derived from
 * actual project context and historical usage data:
 *
 *   1. Project Type Affinity   — static: how many specialized toolsets fit this project type
 *   2. Usage Breadth            — empirical: how many distinct toolsets were actually used
 *   3. Specialized Usage Depth  — empirical: calls to non-default toolsets (weighted by recency)
 *   4. Failure Penalty          — empirical: frequently failing tools penalize confidence
 *   5. History Weight           — meta: more history = higher confidence in the recommendation
 *
 * The final score is a weighted sum normalized to [0, 1].
 *   score > 0.55  →  recommend full
 *   score <= 0.55 →  recommend default
 *   confidence = f(history_weight, failure_penalty)
 */

import Database from 'better-sqlite3';
import { detectProject, type ProjectContext, type ProjectType } from './projectDetector.js';
import {
  getToolUsageStats,
  getToolsetUsageStats,
  getFrequentlyFailingTools,
  type ToolsetUsageStats,
} from './usageStats.js';
import type { McpTool } from '../types.js';

// ── Public types ────────────────────────────────────────────────────────

export interface PresetRecommendation {
  preset: 'default' | 'full';
  reason: string;
  confidence: number; // 0-1
  score: number;      // raw weighted score (0-1); > 0.55 = full
  suggestedToolsets: string[];
  optionalToolsets: string[];
  projectContext: ProjectContext;
  usageInsights: UsageInsights;
  signals: SignalBreakdown;
}

export interface UsageInsights {
  mostUsedToolsets: string[];
  unusedToolsets: string[];
  frequentlyFailingTools: Array<{ name: string; failures: number; lastError: string | null }>;
  totalCallsLast30d: number;
  uniqueToolsetsUsed: number;
}

export interface SignalBreakdown {
  projectTypeAffinity: number;   // 0-1
  usageBreadth: number;          // 0-1
  specializedDepth: number;      // 0-1
  failurePenalty: number;        // 0-1 (higher = more failures)
  historyWeight: number;         // 0-1 (0 = no history, 1 = rich history)
}

export interface PresetConfig {
  name: 'default' | 'full';
  toolsets: string[];
  toolCount: number;
}

// ── Constants ───────────────────────────────────────────────────────────

const DEFAULT_TOOLSETS = ['verification', 'eval', 'quality_gate', 'learning', 'flywheel', 'recon', 'security', 'boilerplate'];
const DEFAULT_TOOLSET_SET = new Set(DEFAULT_TOOLSETS);

const SCORE_THRESHOLD = 0.55; // above this → recommend full

// Signal weights (sum to 1.0)
const W_PROJECT_TYPE = 0.25;
const W_USAGE_BREADTH = 0.30;
const W_SPECIALIZED_DEPTH = 0.30;
const W_HISTORY = 0.15;

// Project type → extra toolsets beyond default
const PROJECT_TYPE_EXTRAS: Record<ProjectType, string[]> = {
  web_frontend: ['ui_capture', 'vision'],
  web_backend: ['web', 'github'],
  fullstack: ['ui_capture', 'vision', 'web', 'github', 'llm'],
  mobile: [],
  desktop: [],
  cli: [],
  library: ['docs', 'github'],
  data_science: ['local_file', 'llm'],
  devops: ['github'],
  unknown: [],
};

// All toolsets considered "specialized" (not in default)
const SPECIALIZED_TOOLSETS = [
  'ui_capture', 'vision', 'web', 'github', 'docs', 'local_file',
  'self_eval', 'parallel', 'llm', 'platform', 'research_writing',
  'bootstrap', 'flicker_detection', 'figma_flow', 'benchmark',
  'gaia_solvers', 'session_memory', 'toon', 'pattern', 'git_workflow',
  'seo', 'voice_bridge', 'critter', 'email', 'rss', 'architect',
];

// ── Helpers ─────────────────────────────────────────────────────────────

function calculateToolsetCount(toolsets: string[], toolsetMap: Record<string, McpTool[]>): number {
  let count = 0;
  for (const ts of toolsets) count += toolsetMap[ts]?.length || 0;
  return count + 6; // +6 meta/discovery
}

function createPresets(toolsetMap: Record<string, McpTool[]>): Record<string, PresetConfig> {
  return {
    default: {
      name: 'default',
      toolsets: DEFAULT_TOOLSETS,
      toolCount: calculateToolsetCount(DEFAULT_TOOLSETS, toolsetMap),
    },
    full: {
      name: 'full',
      toolsets: Object.keys(toolsetMap),
      toolCount: Object.values(toolsetMap).reduce((s, t) => s + t.length, 0) + 6,
    },
  };
}

// ── Signal computation ──────────────────────────────────────────────────

function computeProjectTypeAffinity(projectType: ProjectType): number {
  const extras = PROJECT_TYPE_EXTRAS[projectType] || [];
  // 0 extras → 0.0 (default is fine), 5+ extras → 1.0 (needs full)
  return Math.min(extras.length / 5, 1.0);
}

function computeUsageBreadth(
  toolsetStats: ToolsetUsageStats[],
  totalAvailableToolsets: number
): number {
  if (totalAvailableToolsets === 0) return 0;
  const usedCount = toolsetStats.filter(ts => ts.totalCalls > 0).length;
  // Fraction of available toolsets that were actually used
  return Math.min(usedCount / totalAvailableToolsets, 1.0);
}

function computeSpecializedDepth(
  toolsetStats: ToolsetUsageStats[],
  totalCalls: number
): number {
  if (totalCalls === 0) return 0;
  // What fraction of total calls went to non-default toolsets?
  const specializedCalls = toolsetStats
    .filter(ts => !DEFAULT_TOOLSET_SET.has(ts.toolset))
    .reduce((sum, ts) => sum + ts.totalCalls, 0);
  return Math.min(specializedCalls / totalCalls, 1.0);
}

function computeFailurePenalty(
  failingTools: Array<{ toolName: string; failureCount: number }>,
  totalCalls: number
): number {
  if (totalCalls === 0 || failingTools.length === 0) return 0;
  const totalFailures = failingTools.reduce((s, t) => s + t.failureCount, 0);
  // Cap at 0.5 — failures reduce confidence but don't dominate
  return Math.min(totalFailures / totalCalls, 0.5);
}

function computeHistoryWeight(totalCalls: number): number {
  // No history → 0, 10 calls → 0.5, 100+ calls → 1.0 (logarithmic)
  if (totalCalls === 0) return 0;
  return Math.min(Math.log10(totalCalls + 1) / 2, 1.0);
}

// ── Core: generate recommendation ───────────────────────────────────────

export function generateSmartPreset(
  db: Database.Database,
  toolsetMap: Record<string, McpTool[]>,
  projectPath: string = process.cwd()
): PresetRecommendation {
  const projectContext = detectProject(projectPath);
  const presets = createPresets(toolsetMap);
  const availableToolsets = Object.keys(toolsetMap);

  // Gather empirical data
  const toolsetStats = getToolsetUsageStats(db, projectPath, 30);
  const toolStats = getToolUsageStats(db, projectPath, 30);
  const failingToolsRaw = getFrequentlyFailingTools(db, projectPath, 30, 2);
  const totalCalls = toolStats.reduce((s, t) => s + t.callCount, 0);

  // Compute 5 signals
  const projectTypeAffinity = computeProjectTypeAffinity(projectContext.projectType);
  const usageBreadth = computeUsageBreadth(toolsetStats, availableToolsets.length);
  const specializedDepth = computeSpecializedDepth(toolsetStats, totalCalls);
  const failurePenalty = computeFailurePenalty(failingToolsRaw, totalCalls);
  const historyWeight = computeHistoryWeight(totalCalls);

  const signals: SignalBreakdown = {
    projectTypeAffinity,
    usageBreadth,
    specializedDepth,
    failurePenalty,
    historyWeight,
  };

  // Weighted score: blend static (project type) with empirical signals
  // When history is low, project type dominates. When history is rich, usage dominates.
  const empiricalBlend = historyWeight; // 0 = no history, 1 = trust history fully
  const staticScore = projectTypeAffinity;
  const empiricalScore = (usageBreadth * W_USAGE_BREADTH + specializedDepth * W_SPECIALIZED_DEPTH + historyWeight * W_HISTORY)
    / (W_USAGE_BREADTH + W_SPECIALIZED_DEPTH + W_HISTORY);

  // Normalize: simple weighted average where empirical grows with history
  const score = Math.min(
    staticScore * (1 - empiricalBlend) + empiricalScore * empiricalBlend,
    1.0
  );

  // Decision
  const preset: 'default' | 'full' = score > SCORE_THRESHOLD ? 'full' : 'default';

  // Confidence: higher with more history, penalized by failures
  const baseConfidence = historyWeight > 0
    ? 0.6 + historyWeight * 0.35  // 0.6 → 0.95 as history grows
    : 0.5 + projectTypeAffinity * 0.3; // 0.5 → 0.8 for static-only
  const confidence = Math.max(0.3, baseConfidence - failurePenalty * 0.2);

  // Build reason
  const reason = buildReason(preset, signals, projectContext, totalCalls);

  // Build suggested toolsets: default + project-type extras + actually-used specialized
  const extras = PROJECT_TYPE_EXTRAS[projectContext.projectType] || [];
  const usedSpecialized = toolsetStats
    .filter(ts => !DEFAULT_TOOLSET_SET.has(ts.toolset) && ts.totalCalls > 0)
    .map(ts => ts.toolset);
  const suggestedToolsets = [...new Set([...DEFAULT_TOOLSETS, ...extras, ...usedSpecialized])];
  const optionalToolsets = SPECIALIZED_TOOLSETS.filter(ts => !suggestedToolsets.includes(ts));

  // Usage insights
  const mostUsedToolsets = toolsetStats
    .filter(ts => ts.totalCalls > 0)
    .sort((a, b) => b.totalCalls - a.totalCalls)
    .map(ts => ts.toolset)
    .slice(0, 5);
  const usedSet = new Set(toolsetStats.filter(ts => ts.totalCalls > 0).map(ts => ts.toolset));
  const unusedToolsets = availableToolsets.filter(ts => !usedSet.has(ts));

  return {
    preset,
    reason,
    confidence: Math.round(confidence * 100) / 100,
    score: Math.round(score * 1000) / 1000,
    suggestedToolsets,
    optionalToolsets,
    projectContext,
    usageInsights: {
      mostUsedToolsets,
      unusedToolsets,
      frequentlyFailingTools: failingToolsRaw.map(t => ({
        name: t.toolName,
        failures: t.failureCount,
        lastError: t.lastError,
      })),
      totalCallsLast30d: totalCalls,
      uniqueToolsetsUsed: toolsetStats.filter(ts => ts.totalCalls > 0).length,
    },
    signals,
  };
}

function buildReason(
  preset: 'default' | 'full',
  signals: SignalBreakdown,
  ctx: ProjectContext,
  totalCalls: number
): string {
  const parts: string[] = [];

  if (totalCalls === 0) {
    parts.push(`No usage history yet.`);
    if (preset === 'full') {
      parts.push(`Project type (${ctx.projectType}) suggests specialized toolsets would help.`);
    } else {
      parts.push(`Project type (${ctx.projectType}) aligns with default preset.`);
    }
    parts.push(`As you use more tools, this recommendation will improve.`);
  } else {
    parts.push(`Based on ${totalCalls} tool calls across ${signals.historyWeight > 0.5 ? 'rich' : 'limited'} history.`);

    if (signals.specializedDepth > 0.3) {
      parts.push(`${(signals.specializedDepth * 100).toFixed(0)}% of calls use specialized (non-default) toolsets.`);
    }

    if (signals.usageBreadth > 0.4) {
      parts.push(`Broad toolset usage detected across ${(signals.usageBreadth * 100).toFixed(0)}% of available toolsets.`);
    }

    if (preset === 'full') {
      parts.push(`Full preset recommended for comprehensive coverage.`);
    } else {
      parts.push(`Default preset covers your current usage patterns.`);
    }
  }

  if (signals.failurePenalty > 0.1) {
    parts.push(`Note: ${(signals.failurePenalty * 100).toFixed(0)}% failure rate detected - check failing tools below.`);
  }

  return parts.join(' ');
}

// ── Preset listing ──────────────────────────────────────────────────────

export function getPresetConfig(preset: 'default' | 'full', toolsetMap: Record<string, McpTool[]>): PresetConfig {
  return createPresets(toolsetMap)[preset];
}

export function listPresets(toolsetMap: Record<string, McpTool[]>): Array<{ name: string; toolsets: string[]; toolCount: number; description: string }> {
  const presets = createPresets(toolsetMap);

  const THEMED_PRESETS: Array<{ name: string; extras: string[]; description: string }> = [
    { name: 'web_dev',      extras: ['ui_capture', 'vision', 'web', 'seo', 'git_workflow', 'architect'], description: 'Web projects — adds visual QA, SEO audit, git workflow, code architecture' },
    { name: 'research',     extras: ['web', 'llm', 'rss', 'email', 'docs'],                             description: 'Research workflows — adds web search, LLM calls, RSS feeds, email, docs' },
    { name: 'data',         extras: ['local_file', 'llm', 'web'],                                        description: 'Data analysis — adds CSV/XLSX/PDF/JSON parsing, LLM extraction, web fetch' },
    { name: 'devops',       extras: ['git_workflow', 'session_memory', 'benchmark', 'pattern'],           description: 'CI/CD & ops — adds git compliance, session memory, benchmarks, pattern mining' },
    { name: 'mobile',       extras: ['ui_capture', 'vision', 'flicker_detection'],                        description: 'Mobile apps — adds screenshot capture, vision analysis, flicker detection' },
    { name: 'academic',     extras: ['research_writing', 'llm', 'web', 'local_file'],                    description: 'Academic papers — adds polish, review, translate, logic check, data analysis' },
    { name: 'multi_agent',  extras: ['parallel', 'self_eval', 'session_memory', 'pattern', 'toon'],      description: 'Multi-agent teams — adds task locking, messaging, roles, oracle testing' },
    { name: 'content',      extras: ['llm', 'critter', 'email', 'rss', 'platform', 'architect'],         description: 'Content & publishing — adds LLM, accountability, email, RSS, platform queue' },
  ];

  const result: Array<{ name: string; toolsets: string[]; toolCount: number; description: string }> = [
    {
      name: 'default',
      toolsets: presets.default.toolsets,
      toolCount: presets.default.toolCount,
      description: 'Core AI Flywheel methodology — verification, eval, quality gates, learning, recon, security, boilerplate',
    },
  ];

  for (const themed of THEMED_PRESETS) {
    const toolsets = [...DEFAULT_TOOLSETS, ...themed.extras];
    result.push({
      name: themed.name,
      toolsets,
      toolCount: calculateToolsetCount(toolsets, toolsetMap),
      description: themed.description,
    });
  }

  result.push({
    name: 'full',
    toolsets: presets.full.toolsets,
    toolCount: presets.full.toolCount,
    description: `All ${presets.full.toolCount} tools across ${Object.keys(toolsetMap).length} toolsets — complete coverage`,
  });

  return result;
}

// ── Formatted output ────────────────────────────────────────────────────

export function formatPresetRecommendation(recommendation: PresetRecommendation, toolsetMap: Record<string, McpTool[]>): string {
  const lines: string[] = [];
  const { signals: s, usageInsights: u, projectContext: p } = recommendation;

  lines.push(`\n=== Smart Preset Recommendation ===\n`);
  lines.push(`  Preset:     ${recommendation.preset.toUpperCase()}`);
  lines.push(`  Confidence: ${(recommendation.confidence * 100).toFixed(0)}%`);
  lines.push(`  Score:      ${recommendation.score.toFixed(3)} (threshold: ${SCORE_THRESHOLD})\n`);
  lines.push(`  ${recommendation.reason}`);

  // Signal breakdown
  lines.push(`\n--- Signal Breakdown ---`);
  lines.push(`  Project Type Affinity:  ${(s.projectTypeAffinity * 100).toFixed(0)}%  (${p.projectType}/${p.language}${p.framework ? '/' + p.framework : ''})`);
  lines.push(`  Usage Breadth:          ${(s.usageBreadth * 100).toFixed(0)}%  (${u.uniqueToolsetsUsed}/${Object.keys(toolsetMap).length} toolsets used)`);
  lines.push(`  Specialized Depth:      ${(s.specializedDepth * 100).toFixed(0)}%  (non-default call share)`);
  lines.push(`  History Weight:         ${(s.historyWeight * 100).toFixed(0)}%  (${u.totalCallsLast30d} calls in 30d)`);
  lines.push(`  Failure Penalty:        ${(s.failurePenalty * 100).toFixed(0)}%`);

  // Project context
  lines.push(`\n--- Project ---`);
  lines.push(`  Type: ${p.projectType}  |  Language: ${p.language}${p.framework ? '  |  Framework: ' + p.framework : ''}`);
  lines.push(`  Tests: ${p.hasTests ? 'Yes' : 'No'}  |  CI: ${p.hasCI ? 'Yes' : 'No'}  |  Files: ${p.fileCount}`);

  // Suggested toolsets
  lines.push(`\n--- Suggested Toolsets (${calculateToolsetCount(recommendation.suggestedToolsets, toolsetMap)} tools) ---`);
  lines.push(`  ${recommendation.suggestedToolsets.join(', ')}`);

  // Usage insights
  if (u.mostUsedToolsets.length > 0) {
    lines.push(`\n--- Most Used (30d) ---`);
    lines.push(`  ${u.mostUsedToolsets.join(', ')}`);
  }

  // Failing tools warnings
  if (u.frequentlyFailingTools.length > 0) {
    lines.push(`\n--- Failing Tools (action required) ---`);
    for (const t of u.frequentlyFailingTools) {
      lines.push(`  ! ${t.name}: ${t.failures} failures${t.lastError ? ' - ' + t.lastError.slice(0, 80) : ''}`);
    }
  }

  // How to apply
  lines.push(`\n--- Apply ---`);
  lines.push(`  npx nodebench-mcp --preset ${recommendation.preset}`);
  if (recommendation.suggestedToolsets.length > DEFAULT_TOOLSETS.length) {
    lines.push(`  npx nodebench-mcp --toolsets ${recommendation.suggestedToolsets.join(',')}`);
  }
  lines.push('');

  return lines.join('\n');
}
