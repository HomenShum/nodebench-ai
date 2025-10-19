import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export const TEXT_EMBED_MODEL = "text-embedding-3-small";

export const log = {
  info: (...a: any[]) => console.log("[legacyAgents]", ...a),
  warn: (...a: any[]) => console.warn("[legacyAgents]", ...a),
  error: (...a: any[]) => console.error("[legacyAgents]", ...a),
  debug: (...a: any[]) => console.debug("[legacyAgents]", ...a),
};

export async function ensureUserId(ctx: any): Promise<Id<"users">> {
  const uid = await getAuthUserId(ctx);
  if (!uid) throw new Error("Not authenticated");
  return uid as Id<"users">;
}

export const looksLikeNodeId = (id?: string) => !!id && id.startsWith("k") && id.length > 20;

export async function fetchFileTextByFileId(ctx: any, fileId: Id<"files">): Promise<string> {
  const file = await ctx.runQuery(internal.files.getFile, { fileId });
  if (!file) throw new Error("File not found");
  const userId = await ensureUserId(ctx);
  if (file.userId !== userId) throw new Error("Not authorized to process this file");
  const isCsv = file.mimeType?.includes("csv") || file.fileName.toLowerCase().endsWith(".csv");
  if (!isCsv) throw new Error("Selected file is not a CSV");
  const fileUrl = await ctx.storage.getUrl(file.storageId);
  if (!fileUrl) throw new Error("File not accessible");
  const resp = await fetch(fileUrl);
  if (!resp.ok) throw new Error(`Failed to fetch file: ${resp.statusText}`);
  return await resp.text();
}
