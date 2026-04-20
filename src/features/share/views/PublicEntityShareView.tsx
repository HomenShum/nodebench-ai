/**
 * PublicEntityShareView — anonymous read-only view of an entity's diligence
 * projections, rendered via a bearer token in the URL.
 *
 * Route: /share/{token}
 * Auth:  none — the token itself is the credential.
 *
 * HONEST_STATUS rendering:
 *   - not_found → "This link doesn't exist" (cannot distinguish from never-minted)
 *   - revoked   → "The owner revoked this link"
 *   - expired   → "This link expired on <date>"
 *   - active    → read-only projections list
 *
 * Privacy posture (user_privacy.md):
 *   - We never leak ownerKey, lastViewedAt, or other internal fields.
 *   - recordPublicView fires once on mount. viewCount is informational only.
 *   - No mutation surfaces (no refresh, no accept/dismiss, no comments).
 */

import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { parseShareTokenFromPath, describeShareStatus } from "./publicShareHelpers";

type ShareContext =
  | { status: "not_found" }
  | { status: "revoked" }
  | { status: "expired" }
  | {
      status: "active";
      resourceType: string;
      resourceSlug: string;
      label?: string;
      createdAt: number;
    };

type ProjectionsPayload =
  | { status: "inactive"; projections: ReadonlyArray<unknown> }
  | { status: "unsupported_type"; projections: ReadonlyArray<unknown> }
  | {
      status: "active";
      resourceSlug: string;
      label?: string;
      projections: ReadonlyArray<ProjectionRow>;
    };

type ProjectionRow = {
  _id: string;
  blockType: string;
  headerText: string;
  bodyProse?: string;
  overallTier: string;
  sourceCount?: number;
  updatedAt?: number;
};

function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function getTokenFromPath(): string | null {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  return parseShareTokenFromPath(path);
}

function TierPill({ tier }: { tier: string }) {
  const className =
    tier === "verified"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
      : tier === "corroborated"
        ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200"
        : tier === "single-source"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200"
          : "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300";
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium " +
        className
      }
    >
      {tier.replace("-", " ")}
    </span>
  );
}

function StatusCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto mt-24 max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-white/[0.08] dark:bg-zinc-900">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">
        {title}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
      <a
        href="/"
        className="mt-4 inline-block rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-white/[0.1] dark:text-zinc-300 dark:hover:bg-white/[0.04]"
      >
        ← Back to NodeBench
      </a>
    </div>
  );
}

export default function PublicEntityShareView() {
  const token = getTokenFromPath();

  const ctx = useQuery(
    api.domains.product.publicShares.getPublicShareContext,
    token ? { token } : "skip",
  ) as ShareContext | undefined;

  const payload = useQuery(
    api.domains.product.publicShares.getPublicEntityProjections,
    token && ctx?.status === "active" ? { token, limit: 20 } : "skip",
  ) as ProjectionsPayload | undefined;

  const recordView = useMutation(api.domains.product.publicShares.recordPublicView);

  // Fire-and-forget view recording — once per mount. Never blocks render.
  useEffect(() => {
    if (token && ctx?.status === "active") {
      recordView({ token }).catch(() => {
        /* ignore — view counting is nice-to-have */
      });
    }
    // We intentionally want this to re-fire on each distinct token, not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, ctx?.status]);

  if (!token) {
    return (
      <StatusCard
        title="No share token"
        body="This URL is missing a token. Ask the sender for a fresh link."
      />
    );
  }

  if (ctx === undefined) {
    return (
      <div
        className="mx-auto mt-24 max-w-md rounded-lg border border-zinc-200 bg-white p-6 dark:border-white/[0.08] dark:bg-zinc-900"
        role="status"
        aria-busy="true"
      >
        <div className="h-5 w-40 rounded bg-zinc-200 motion-safe:animate-pulse dark:bg-white/[0.06]" />
        <div className="mt-3 h-4 w-full rounded bg-zinc-200 motion-safe:animate-pulse dark:bg-white/[0.06]" />
        <div className="mt-2 h-4 w-4/5 rounded bg-zinc-200 motion-safe:animate-pulse dark:bg-white/[0.06]" />
      </div>
    );
  }

  if (ctx.status !== "active") {
    const desc = describeShareStatus(ctx.status);
    return <StatusCard title={desc.title} body={desc.body} />;
  }

  // Active — render the read-only brief.
  const projections =
    payload && payload.status === "active" ? payload.projections : [];

  return (
    <main
      className="mx-auto min-h-screen max-w-3xl px-6 py-10 text-zinc-900 dark:text-zinc-100"
      aria-label="Public diligence brief"
      /* Share-token visitors are always in read mode — the
         data-view-mode attribute triggers the global CSS that
         strips edit chrome (accept/dismiss buttons, composer,
         slash hints, timeline, status chips). See src/index.css. */
      data-view-mode="read"
    >
      <header className="mb-6 border-b border-zinc-200 pb-5 dark:border-white/[0.08]">
        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          Diligence brief · shared read-only
        </div>
        <h1 className="mt-1 text-2xl font-semibold">
          {ctx.label ?? ctx.resourceSlug}
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          Generated · shared {formatDate(ctx.createdAt)}
        </p>
      </header>

      {payload === undefined ? (
        <div className="space-y-3" role="status" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded bg-zinc-100 motion-safe:animate-pulse dark:bg-white/[0.04]"
            />
          ))}
        </div>
      ) : projections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-white/[0.08]">
          No diligence blocks have been generated yet for this entity.
        </div>
      ) : (
        <ol className="space-y-5">
          {projections.map((p) => (
            <li
              key={p._id}
              className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-zinc-900/60"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-base font-medium">{p.headerText}</h2>
                <div className="flex items-center gap-2">
                  <TierPill tier={p.overallTier} />
                  {typeof p.sourceCount === "number" ? (
                    <span className="font-mono text-[11px] text-zinc-500">
                      {p.sourceCount} src
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">
                {p.blockType}
              </div>
              {p.bodyProse ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {p.bodyProse}
                </p>
              ) : (
                <p className="mt-3 text-sm text-zinc-400">
                  (No narrative attached to this block.)
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      <footer className="mt-10 border-t border-zinc-200 pt-4 text-[11px] text-zinc-500 dark:border-white/[0.08]">
        Shared via NodeBench AI · read-only · this link can be revoked by the
        owner at any time.
      </footer>
    </main>
  );
}
