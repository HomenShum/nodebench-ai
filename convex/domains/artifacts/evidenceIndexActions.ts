"use node";

import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { createHash } from "crypto";

const DEFAULT_CHUNK_VERSION = 1;
const DEFAULT_CHUNK_SIZE = 2000;
const DEFAULT_CHUNK_OVERLAP = 200;
const MAX_CHUNKS_PER_ARTIFACT = 500;

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function normalizeText(input: string): string {
  return input.replace(/\r\n/g, "\n");
}

function chunkTextByChars(
  text: string,
  opts: { chunkSize: number; overlap: number; maxChunks: number }
): Array<{ startOffset: number; endOffset: number; text: string }> {
  const chunkSize = Math.max(200, Math.floor(opts.chunkSize));
  const overlap = Math.max(0, Math.min(Math.floor(opts.overlap), chunkSize - 1));
  const maxChunks = Math.max(1, Math.floor(opts.maxChunks));

  const chunks: Array<{ startOffset: number; endOffset: number; text: string }> = [];
  let start = 0;

  while (start < text.length && chunks.length < maxChunks) {
    const end = Math.min(text.length, start + chunkSize);
    const slice = text.slice(start, end);

    if (slice.trim().length > 0) {
      chunks.push({ startOffset: start, endOffset: end, text: slice });
    }

    if (end >= text.length) break;
    start = end - overlap;
  }

  return chunks;
}

export const indexArtifact = internalAction({
  args: {
    artifactId: v.id("sourceArtifacts"),
    chunkVersion: v.optional(v.number()),
    chunkSize: v.optional(v.number()),
    chunkOverlap: v.optional(v.number()),
  },
  returns: v.object({
    ok: v.boolean(),
    artifactId: v.id("sourceArtifacts"),
    jobId: v.optional(v.id("artifactIndexJobs")),
    chunkCount: v.optional(v.number()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const start = Date.now();
    const chunkVersion = args.chunkVersion ?? DEFAULT_CHUNK_VERSION;

    const artifact = await ctx.runQuery(internal.domains.artifacts.sourceArtifacts.getArtifactById, {
      artifactId: args.artifactId,
    });
    if (!artifact) return { ok: false, artifactId: args.artifactId, error: "Artifact not found" };

    const { jobId, alreadySucceeded } = await ctx.runMutation(
      internal.domains.artifacts.evidenceIndex.startArtifactIndexJob,
      {
        artifactId: args.artifactId,
        contentHash: artifact.contentHash,
        chunkVersion,
      }
    );

    if (alreadySucceeded) {
      return { ok: true, artifactId: args.artifactId, jobId, chunkCount: 0 };
    }

    try {
      const storageId =
        (artifact as any).rawStorageId ??
        (artifact.extractedData as any)?.storageId ??
        (artifact.extractedData as any)?.rawStorageId;

      let rawText = artifact.rawContent ?? "";
      if (storageId) {
        const blob = await ctx.storage.get(storageId as Id<"_storage">);
        if (blob) {
          rawText = await blob.text();
        }
      }

      rawText = normalizeText(rawText);

      const chunks = chunkTextByChars(rawText, {
        chunkSize: args.chunkSize ?? DEFAULT_CHUNK_SIZE,
        overlap: args.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP,
        maxChunks: MAX_CHUNKS_PER_ARTIFACT,
      }).map((c) => ({
        chunkKey: `${args.artifactId}:${c.startOffset}-${c.endOffset}:v${chunkVersion}`,
        startOffset: c.startOffset,
        endOffset: c.endOffset,
        text: c.text,
        chunkHash: sha256Hex(c.text),
      }));

      const replaced = await ctx.runMutation(internal.domains.artifacts.evidenceIndex.replaceArtifactChunks, {
        artifactId: args.artifactId,
        runId: artifact.runId,
        sourceUrl: artifact.sourceUrl,
        fetchedAt: artifact.fetchedAt,
        contentHash: artifact.contentHash,
        chunkVersion,
        chunks,
      });

      await ctx.runMutation(internal.domains.artifacts.evidenceIndex.finishArtifactIndexJob, {
        jobId,
        status: "succeeded",
        chunkCount: replaced.inserted,
        latencyMs: Date.now() - start,
      });

      return { ok: true, artifactId: args.artifactId, jobId, chunkCount: replaced.inserted };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.domains.artifacts.evidenceIndex.finishArtifactIndexJob, {
        jobId,
        status: "failed",
        error,
        latencyMs: Date.now() - start,
      });
      return { ok: false, artifactId: args.artifactId, jobId, error };
    }
  },
});

