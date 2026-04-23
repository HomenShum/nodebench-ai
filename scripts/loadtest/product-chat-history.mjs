#!/usr/bin/env node
/**
 * product-chat-history.mjs
 *
 * Prolonged-usage load probe for the canonical product chat/report substrate:
 *   - multiple owners (anonymous sessions)
 *   - multiple entities per owner
 *   - multiple saved chat sessions per entity
 *   - repeated history/report/notebook reads after the write phase
 *
 * This is intentionally separate from notebook-load.mjs. notebook-load stresses
 * productBlocks collaboration; this script stresses productChatSessions,
 * productChatEvents, productReports, and notebook reopen flows over time.
 *
 * Usage:
 *   node scripts/loadtest/product-chat-history.mjs \
 *     --owners 3 \
 *     --entities 4 \
 *     --sessions-per-entity 4 \
 *     --history-reads 24 \
 *     --jsonOut .tmp/evals/product-chat-history-latest.json
 */

import { ConvexHttpClient } from "convex/browser";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    owners: { type: "string", default: "3" },
    entities: { type: "string", default: "4" },
    "sessions-per-entity": { type: "string", default: "4" },
    "history-reads": { type: "string", default: "24" },
    url: { type: "string" },
    jsonOut: { type: "string" },
  },
});

const OWNER_COUNT = Math.max(1, parseInt(args.owners, 10));
const ENTITY_COUNT = Math.max(1, parseInt(args.entities, 10));
const SESSIONS_PER_ENTITY = Math.max(1, parseInt(args["sessions-per-entity"], 10));
const HISTORY_READS = Math.max(1, parseInt(args["history-reads"], 10));

function loadConvexUrl() {
  if (args.url) return args.url;
  if (process.env.CONVEX_URL) return process.env.CONVEX_URL;
  if (process.env.VITE_CONVEX_URL) return process.env.VITE_CONVEX_URL;
  try {
    const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../.env.local");
    const text = readFileSync(envPath, "utf8");
    const match = text.match(/VITE_CONVEX_URL="?([^"\n]+)"?/);
    if (match) return match[1];
  } catch {
    // fall through
  }
  throw new Error("CONVEX_URL not set. Pass --url or set VITE_CONVEX_URL in .env.local");
}

const CONVEX_URL = loadConvexUrl();

const ENTITY_CATALOG = [
  {
    slug: "softbank",
    name: "SoftBank",
    type: "company",
    query: "What is SoftBank and what matters most right now?",
    sourceDomain: "example.com",
  },
  {
    slug: "stripe",
    name: "Stripe",
    type: "company",
    query: "Give me a concise operating brief on Stripe and recent changes.",
    sourceDomain: "stripe.com",
  },
  {
    slug: "openai",
    name: "OpenAI",
    type: "company",
    query: "What is OpenAI doing now and what are the strategic implications?",
    sourceDomain: "openai.com",
  },
  {
    slug: "salesforce",
    name: "Salesforce",
    type: "company",
    query: "Summarize Salesforce's current AI positioning and next moves.",
    sourceDomain: "salesforce.com",
  },
  {
    slug: "nvidia",
    name: "NVIDIA",
    type: "company",
    query: "Explain NVIDIA's current edge and what could challenge it.",
    sourceDomain: "nvidia.com",
  },
  {
    slug: "disco",
    name: "DISCO",
    type: "company",
    query: "Summarize DISCO, its funding context, and what to watch next.",
    sourceDomain: "disco.com",
  },
];

function pickEntities(count) {
  const result = [];
  for (let index = 0; index < count; index += 1) {
    const base = ENTITY_CATALOG[index % ENTITY_CATALOG.length];
    result.push(base);
  }
  return result;
}

function makeStats(id, label) {
  return {
    id,
    label,
    latencies: [],
    success: 0,
    errors: [],
    errorCodes: {},
  };
}

function recordError(stats, error) {
  const message = error?.message ?? String(error);
  stats.errors.push(message);
  const code =
    typeof error?.data?.code === "string"
      ? error.data.code
      : message.includes("Server Error")
        ? "SERVER_ERROR"
        : "UNKNOWN";
  stats.errorCodes[code] = (stats.errorCodes[code] ?? 0) + 1;
}

async function timed(stats, fn) {
  const startedAt = performance.now();
  try {
    const result = await fn();
    stats.latencies.push(performance.now() - startedAt);
    stats.success += 1;
    return result;
  } catch (error) {
    recordError(stats, error);
    return null;
  }
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[index];
}

function summarizeStats(stats) {
  const total = stats.success + stats.errors.length;
  const errorRatePct = total > 0 ? (stats.errors.length / total) * 100 : 0;
  return {
    id: stats.id,
    label: stats.label,
    total,
    ok: stats.success,
    errors: stats.errors.length,
    errorRatePct: Number(errorRatePct.toFixed(2)),
    p50: percentile(stats.latencies, 0.5) ? Math.round(percentile(stats.latencies, 0.5)) : null,
    p95: percentile(stats.latencies, 0.95) ? Math.round(percentile(stats.latencies, 0.95)) : null,
    p99: percentile(stats.latencies, 0.99) ? Math.round(percentile(stats.latencies, 0.99)) : null,
    errorCodes: stats.errorCodes,
  };
}

function buildPacket({ entity, ownerIndex, entityIndex, sessionIndex }) {
  const sourceBase = `https://${entity.sourceDomain}/eval/${ownerIndex}/${entityIndex}/${sessionIndex}`;
  return {
    entityName: entity.name,
    classification: entity.type,
    answer: `${entity.name} eval session ${sessionIndex + 1} for owner ${ownerIndex + 1}. This is a synthetic persisted packet for history and reopen verification.`,
    summary: `${entity.name} history packet ${sessionIndex + 1}.`,
    whyItMatters: `${entity.name} remains in the watch set because the user reopened this entity across multiple sessions.`,
    gaps: `Open questions remain for ${entity.name} session ${sessionIndex + 1}.`,
    recommendedNextAction: `Reopen ${entity.name} in read mode and compare against prior sessions.`,
    sourceRefs: [
      {
        id: `source:${entity.slug}:${ownerIndex}:${entityIndex}:${sessionIndex}:1`,
        label: `${entity.name} primary source`,
        title: `${entity.name} primary source`,
        href: `${sourceBase}/primary`,
        siteName: entity.name,
        publishedAt: new Date(Date.now() - sessionIndex * 86_400_000).toISOString(),
        excerpt: `${entity.name} primary evidence for eval session ${sessionIndex + 1}.`,
        confidence: 0.81,
      },
      {
        id: `source:${entity.slug}:${ownerIndex}:${entityIndex}:${sessionIndex}:2`,
        label: `${entity.name} secondary source`,
        title: `${entity.name} secondary source`,
        href: `${sourceBase}/secondary`,
        siteName: entity.name,
        publishedAt: new Date(Date.now() - (sessionIndex + 1) * 86_400_000).toISOString(),
        excerpt: `${entity.name} secondary evidence for eval session ${sessionIndex + 1}.`,
        confidence: 0.74,
      },
    ],
    variables: [
      { key: "reopen_rate", value: `${sessionIndex + 1}` },
      { key: "entity_slug", value: entity.slug },
    ],
    changes: [
      `${entity.name} was revisited in a later session.`,
      `Session history depth increased for ${entity.name}.`,
    ],
    risks: [
      `Synthetic eval data for ${entity.name} should remain isolated to the anonymous eval owner.`,
    ],
  };
}

function printSummaryBlock(title, rows) {
  console.log(`\n=== ${title} ===`);
  console.log("id\tok/total\tp50\tp95\tp99\terror%");
  for (const row of rows) {
    console.log(
      `${row.id}\t${row.ok}/${row.total}\t${row.p50 ?? "-"}ms\t${row.p95 ?? "-"}ms\t${row.p99 ?? "-"}ms\t${row.errorRatePct.toFixed(2)}%`,
    );
  }
}

async function main() {
  const selectedEntities = pickEntities(ENTITY_COUNT);
  const startedAtIso = new Date().toISOString();

  console.log(`[chat-history] target: ${CONVEX_URL}`);
  console.log(`[chat-history] owners: ${OWNER_COUNT}`);
  console.log(`[chat-history] entities per owner: ${ENTITY_COUNT}`);
  console.log(`[chat-history] sessions per entity: ${SESSIONS_PER_ENTITY}`);
  console.log(`[chat-history] history reads per owner: ${HISTORY_READS}`);

  const startSessionStats = makeStats("start_session", "startSession mutation latency");
  const completeSessionStats = makeStats("complete_session", "completeSession mutation latency");
  const sessionE2EStats = makeStats("session_e2e", "startSession -> completeSession end-to-end latency");
  const listSessionsStats = makeStats("list_sessions", "listSessions query latency");
  const getSessionStats = makeStats("get_session", "getSession query latency");
  const getSessionMessagesStats = makeStats("get_session_messages", "getSessionMessages query latency");
  const listReportsStats = makeStats("list_reports", "listReports query latency");
  const getReportStats = makeStats("get_report", "getReport query latency");
  const getNotebookStats = makeStats("get_entity_notebook", "getEntityNotebook query latency");

  const allStats = [
    startSessionStats,
    completeSessionStats,
    sessionE2EStats,
    listSessionsStats,
    getSessionStats,
    getSessionMessagesStats,
    listReportsStats,
    getReportStats,
    getNotebookStats,
  ];

  const ownerResults = await Promise.all(
    Array.from({ length: OWNER_COUNT }, async (_, ownerIndex) => {
      const anonId = `eval-chat-history-${Date.now()}-${ownerIndex}`;
      const client = new ConvexHttpClient(CONVEX_URL);
      const sessions = [];
      const reports = [];
      const reportEntitySlugs = new Set();
      const entities = [];

      for (let entityIndex = 0; entityIndex < selectedEntities.length; entityIndex += 1) {
        const entity = selectedEntities[entityIndex];
        entities.push(entity.slug);

        for (let sessionIndex = 0; sessionIndex < SESSIONS_PER_ENTITY; sessionIndex += 1) {
          const sessionStartedAt = performance.now();
          const query = `${entity.query} [eval owner ${ownerIndex + 1}, session ${sessionIndex + 1}]`;

          const started = await timed(startSessionStats, () =>
            client.mutation("domains/product/chat:startSession", {
              anonymousSessionId: anonId,
              query,
              lens: "investor",
            }),
          );
          if (!started?.sessionId) {
            continue;
          }

          const sessionId = started.sessionId;
          const completed = await timed(completeSessionStats, () =>
            client.mutation("domains/product/chat:completeSession", {
              anonymousSessionId: anonId,
              sessionId,
              packet: buildPacket({ entity, ownerIndex, entityIndex, sessionIndex }),
              entitySlugHint: entity.slug,
              totalDurationMs: 1500 + sessionIndex * 125,
            }),
          );
          if (completed) {
            sessionE2EStats.latencies.push(performance.now() - sessionStartedAt);
            sessionE2EStats.success += 1;
            sessions.push(sessionId);
            if (completed?.reportId) {
              reports.push(completed.reportId);
              if (typeof completed?.entitySlug === "string" && completed.entitySlug.trim()) {
                reportEntitySlugs.add(completed.entitySlug.trim());
              }
            }
          } else {
            sessionE2EStats.errors.push(`session completion failed for ${String(sessionId)}`);
            sessionE2EStats.errorCodes.COMPLETE_FAILED = (sessionE2EStats.errorCodes.COMPLETE_FAILED ?? 0) + 1;
          }
        }
      }

      for (let readIndex = 0; readIndex < HISTORY_READS; readIndex += 1) {
        const listedSessions = await timed(listSessionsStats, () =>
          client.query("domains/product/chat:listSessions", {
            anonymousSessionId: anonId,
            limit: Math.max(20, ENTITY_COUNT * SESSIONS_PER_ENTITY + 5),
          }),
        );

        if (sessions.length > 0) {
          const targetSessionId = sessions[readIndex % sessions.length];
          const sessionDetail = await timed(getSessionStats, () =>
            client.query("domains/product/chat:getSession", {
              anonymousSessionId: anonId,
              sessionId: targetSessionId,
            }),
          );
          const messages = await timed(getSessionMessagesStats, () =>
            client.query("domains/product/chat:getSessionMessages", {
              anonymousSessionId: anonId,
              sessionId: targetSessionId,
            }),
          );

          if (!sessionDetail) {
            getSessionStats.errors.push(`missing session detail for ${String(targetSessionId)}`);
            getSessionStats.errorCodes.MISSING_RESULT = (getSessionStats.errorCodes.MISSING_RESULT ?? 0) + 1;
          } else {
            if (!sessionDetail?.session?.resolutionState || !sessionDetail?.session?.artifactState || !sessionDetail?.session?.saveEligibility) {
              getSessionStats.errors.push(`answer-control session state missing for ${String(targetSessionId)}`);
              getSessionStats.errorCodes.ANSWER_CONTROL_SESSION_MISSING =
                (getSessionStats.errorCodes.ANSWER_CONTROL_SESSION_MISSING ?? 0) + 1;
            }
            const runEventKinds = Array.isArray(sessionDetail?.runEvents)
              ? sessionDetail.runEvents.map((event) => String(event?.kind ?? ""))
              : [];
            if (!runEventKinds.includes("artifact_state_changed")) {
              getSessionStats.errors.push(`artifact_state_changed missing for ${String(targetSessionId)}`);
              getSessionStats.errorCodes.ARTIFACT_EVENT_MISSING =
                (getSessionStats.errorCodes.ARTIFACT_EVENT_MISSING ?? 0) + 1;
            }
          }
          if (!Array.isArray(messages) || messages.length < 2) {
            getSessionMessagesStats.errors.push(`insufficient messages for ${String(targetSessionId)}`);
            getSessionMessagesStats.errorCodes.MESSAGE_INVARIANT = (getSessionMessagesStats.errorCodes.MESSAGE_INVARIANT ?? 0) + 1;
          }
        }

        const listedReports = await timed(listReportsStats, () =>
          client.query("domains/product/reports:listReports", {
            anonymousSessionId: anonId,
            filter: "All",
          }),
        );

        if (reports.length > 0) {
          const targetReportId = reports[readIndex % reports.length];
          const report = await timed(getReportStats, () =>
            client.query("domains/product/reports:getReport", {
              anonymousSessionId: anonId,
              reportId: targetReportId,
            }),
          );
          if (!report) {
            getReportStats.errors.push(`missing report for ${String(targetReportId)}`);
            getReportStats.errorCodes.MISSING_RESULT = (getReportStats.errorCodes.MISSING_RESULT ?? 0) + 1;
          } else {
            const compiledTruthCount = Array.isArray(report?.compiledAnswerV2?.truthSections)
              ? report.compiledAnswerV2.truthSections.reduce(
                  (total, section) => total + (Array.isArray(section?.sentences) ? section.sentences.length : 0),
                  0,
                )
              : 0;
            const actionCount = Array.isArray(report?.compiledAnswerV2?.actions)
              ? report.compiledAnswerV2.actions.length
              : 0;
            if (!report?.resolutionState || !report?.artifactState || !report?.saveEligibility) {
              getReportStats.errors.push(`answer-control report state missing for ${String(targetReportId)}`);
              getReportStats.errorCodes.ANSWER_CONTROL_REPORT_MISSING =
                (getReportStats.errorCodes.ANSWER_CONTROL_REPORT_MISSING ?? 0) + 1;
            }
            if (compiledTruthCount === 0) {
              getReportStats.errors.push(`compiled truth missing for ${String(targetReportId)}`);
              getReportStats.errorCodes.COMPILED_TRUTH_MISSING =
                (getReportStats.errorCodes.COMPILED_TRUTH_MISSING ?? 0) + 1;
            }
            if (actionCount === 0) {
              getReportStats.errors.push(`compiled actions missing for ${String(targetReportId)}`);
              getReportStats.errorCodes.COMPILED_ACTIONS_MISSING =
                (getReportStats.errorCodes.COMPILED_ACTIONS_MISSING ?? 0) + 1;
            }
          }
        }

        const targetEntity = selectedEntities[readIndex % selectedEntities.length];
        const notebook = await timed(getNotebookStats, () =>
          client.query("domains/product/blocks:getEntityNotebook", {
            anonymousSessionId: anonId,
            entitySlug: targetEntity.slug,
          }),
        );
        if (!notebook) {
          getNotebookStats.errors.push(`missing notebook for ${targetEntity.slug}`);
          getNotebookStats.errorCodes.MISSING_RESULT = (getNotebookStats.errorCodes.MISSING_RESULT ?? 0) + 1;
        }

        if (!Array.isArray(listedSessions) || listedSessions.length < sessions.length) {
          listSessionsStats.errors.push(
            `session history shorter than expected for owner ${ownerIndex + 1}: got ${Array.isArray(listedSessions) ? listedSessions.length : "null"}, expected >= ${sessions.length}`,
          );
          listSessionsStats.errorCodes.HISTORY_SHORT = (listSessionsStats.errorCodes.HISTORY_SHORT ?? 0) + 1;
        }

        if (!Array.isArray(listedReports)) {
          listReportsStats.errors.push(`missing reports list for owner ${ownerIndex + 1}`);
          listReportsStats.errorCodes.MISSING_RESULT = (listReportsStats.errorCodes.MISSING_RESULT ?? 0) + 1;
        } else {
          const visibleEntitySlugs = new Set(
            listedReports
              .map((report) => (typeof report?.entitySlug === "string" ? report.entitySlug : null))
              .filter(Boolean),
          );
          const expectedReportEntitySlugs = Array.from(reportEntitySlugs);
          const missingEntityCoverage = expectedReportEntitySlugs
            .filter((slug) => !visibleEntitySlugs.has(slug));
          if (missingEntityCoverage.length > 0) {
            listReportsStats.errors.push(
              `report coverage missing for owner ${ownerIndex + 1}: ${missingEntityCoverage.join(", ")}`,
            );
            listReportsStats.errorCodes.ENTITY_COVERAGE_GAP =
              (listReportsStats.errorCodes.ENTITY_COVERAGE_GAP ?? 0) + 1;
          }
        }
      }

      return {
        anonId,
        sessionCount: sessions.length,
        reportCount: reports.length,
        reportEntityCount: reportEntitySlugs.size,
        entityCount: new Set(entities).size,
      };
    }),
  );

  const summary = allStats.map(summarizeStats);
  printSummaryBlock("PRODUCT CHAT HISTORY LOAD SUMMARY", summary);

  const totals = ownerResults.reduce(
    (acc, owner) => {
      acc.owners += 1;
      acc.sessions += owner.sessionCount;
      acc.reports += owner.reportCount;
      acc.reportEntities += owner.reportEntityCount;
      acc.entities += owner.entityCount;
      return acc;
    },
    { owners: 0, sessions: 0, reports: 0, reportEntities: 0, entities: 0 },
  );

  const output = {
    generatedAt: startedAtIso,
    convexUrl: CONVEX_URL,
    config: {
      owners: OWNER_COUNT,
      entitiesPerOwner: ENTITY_COUNT,
      sessionsPerEntity: SESSIONS_PER_ENTITY,
      historyReadsPerOwner: HISTORY_READS,
    },
    totals,
    owners: ownerResults,
    summary,
  };

  if (args.jsonOut) {
    mkdirSync(dirname(args.jsonOut), { recursive: true });
    writeFileSync(args.jsonOut, JSON.stringify(output, null, 2), "utf8");
    console.log(`[chat-history] wrote JSON summary to ${args.jsonOut}`);
  } else {
    console.log(JSON.stringify(output, null, 2));
  }

  const failing = summary.filter((row) => row.errorRatePct > 5);
  if (failing.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[chat-history] fatal error", error);
  process.exit(1);
});
