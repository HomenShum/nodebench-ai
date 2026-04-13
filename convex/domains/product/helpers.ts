import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";

type ProductCtx = {
  auth: QueryCtx["auth"] | MutationCtx["auth"];
};

export type ProductIdentity = {
  ownerKey: string | null;
  rawUserId: Id<"users"> | string | null;
  anonymousSessionId: string | null;
};

export async function resolveProductIdentity(
  ctx: ProductCtx,
  anonymousSessionId?: string | null,
): Promise<ProductIdentity> {
  const rawUserId = await getAuthUserId(ctx as any);
  if (rawUserId) {
    return {
      ownerKey: `user:${String(rawUserId)}`,
      rawUserId,
      anonymousSessionId: null,
    };
  }

  const trimmedAnonymousSessionId = anonymousSessionId?.trim() || null;
  if (!trimmedAnonymousSessionId) {
    return {
      ownerKey: null,
      rawUserId: null,
      anonymousSessionId: null,
    };
  }

  return {
    ownerKey: `anon:${trimmedAnonymousSessionId}`,
    rawUserId: null,
    anonymousSessionId: trimmedAnonymousSessionId,
  };
}

export async function resolveProductIdentitySafely(
  ctx: ProductCtx,
  anonymousSessionId?: string | null,
): Promise<ProductIdentity> {
  try {
    return await resolveProductIdentity(ctx, anonymousSessionId);
  } catch (error) {
    console.error("[product] resolveProductIdentity failed", error);
    return {
      ownerKey: anonymousSessionId?.trim() ? `anon:${anonymousSessionId.trim()}` : null,
      rawUserId: null,
      anonymousSessionId: anonymousSessionId?.trim() || null,
    };
  }
}

export async function requireProductIdentity(
  ctx: ProductCtx,
  anonymousSessionId?: string | null,
): Promise<Required<ProductIdentity>> {
  const identity = await resolveProductIdentity(ctx, anonymousSessionId);
  if (!identity.ownerKey) {
    throw new Error("Authentication or anonymous session required");
  }

  return {
    ownerKey: identity.ownerKey,
    rawUserId: identity.rawUserId,
    anonymousSessionId: identity.anonymousSessionId,
  };
}

export function buildPreviewText(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.slice(0, 280);
  }
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value).slice(0, 280);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function summarizeText(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim().slice(0, 320);
  }
  return fallback;
}

export function deriveDomainFromUrl(href?: string): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}
