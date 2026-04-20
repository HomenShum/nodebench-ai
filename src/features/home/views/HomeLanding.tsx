import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { trackEvent } from "@/lib/analytics";
import { useConvexApi } from "@/lib/convexApi";
import { buildCockpitPath } from "@/lib/registry/viewRegistry";
import { LENSES, type LensId } from "@/features/controlPlane/components/searchTypes";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import {
  addRecentSearch,
  formatRecentSearchLabel,
  getRecentSearches,
  loadProductDraft,
  saveProductDraft,
  shouldPersistDraftQueryInUrl,
  type ProductDraftFile,
} from "@/features/product/lib/productSession";
import { ProductThumbnail } from "@/features/product/components/ProductThumbnail";
import { ProductSourceIdentity } from "@/features/product/components/ProductSourceIdentity";
import { ProductIntakeComposer } from "@/features/product/components/ProductIntakeComposer";
import { IntakeDetectedSources } from "@/features/product/components/IntakeDetectedSources";
import { useProductBootstrap } from "@/features/product/lib/useProductBootstrap";
import { buildOperatorContextHint, buildOperatorContextLabel } from "@/features/product/lib/operatorContext";
import { uploadProductDraftFiles } from "@/features/product/lib/uploadDraftFiles";
import { buildEntityAliasKey } from "../../../../shared/reportArtifacts";

const SUGGESTED_PROMPTS = [
  "What is this company and what matters most right now?",
  "What are the biggest risks in this market?",
  "Compare this role to my experience and resume.",
  "Stripe prep brief for tomorrow's call.",
];

const STARTER_REPORTS = [
  {
    key: "starter-company",
    title: "Company report",
    summary: "Start with a company and get a clean summary, the main risks, and what to do next.",
    prompt: "Build a company report from this screenshot, link, or description.",
    type: "company",
    lens: "founder" as LensId,
    updatedLabel: "Starter",
    origin: "starter" as const,
    originLabel: "Template",
  },
  {
    key: "starter-market",
    title: "Market report",
    summary: "Turn a market, category, or trend into a report with useful sources and clear watch items.",
    prompt: "Summarize this market and tell me what changed recently.",
    type: "market",
    lens: "investor" as LensId,
    updatedLabel: "Starter",
    origin: "starter" as const,
    originLabel: "Template",
  },
  {
    key: "starter-role",
    title: "Role fit",
    summary: "Compare a role, recruiter note, or job description against your background and surface the gaps.",
    prompt: "Compare this role to my resume and tell me what is missing.",
    type: "job",
    lens: "founder" as LensId,
    updatedLabel: "Starter",
    origin: "starter" as const,
    originLabel: "Template",
  },
] as const;

type HomeReportCard = {
  key: string;
  title: string;
  summary: string;
  prompt: string;
  type: string;
  lens: LensId;
  thumbnailUrl?: string;
  thumbnailUrls?: string[];
  sourceUrls?: string[];
  sourceLabels?: string[];
  updatedLabel: string;
  updatedAt?: number;
  entitySlug?: string;
  origin?: "user" | "system" | "starter";
  originLabel?: string;
};

function normalizeHomeReportDedupeKey(report: Pick<HomeReportCard, "entitySlug" | "type" | "title" | "prompt">) {
  const aliasKey = buildEntityAliasKey({
    primaryEntity: report.title,
    title: report.title,
    query: report.prompt,
    type: report.type,
    entityType: report.type,
    slug: report.entitySlug,
  });
  if (aliasKey) return `entity:${aliasKey}`;
  const entitySlug = report.entitySlug?.trim().toLowerCase();
  if (entitySlug) return `entity:${entitySlug}`;
  const type = report.type.trim().toLowerCase();
  const title = report.title.trim().toLowerCase();
  const prompt = report.prompt.trim().toLowerCase();
  return `report:${type}:${title}:${prompt}`;
}

export function buildVisibleHomeReports(
  reports: HomeReportCard[],
  maxItems = 3,
): HomeReportCard[] {
  const uniqueReports: HomeReportCard[] = [];
  const seen = new Set<string>();

  for (const report of reports) {
    const dedupeKey = normalizeHomeReportDedupeKey(report);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    uniqueReports.push(report);
  }

  const visible = uniqueReports.slice(0, maxItems);
  if (visible.length >= maxItems) return visible;

  const usedTypes = new Set(visible.map((report) => report.type.trim().toLowerCase()));
  for (const starter of STARTER_REPORTS) {
    if (visible.length >= maxItems) break;
    if (usedTypes.has(starter.type.trim().toLowerCase())) continue;
    visible.push(starter);
    usedTypes.add(starter.type.trim().toLowerCase());
  }

  if (visible.length >= maxItems) return visible;

  for (const starter of STARTER_REPORTS) {
    if (visible.length >= maxItems) break;
    if (visible.some((report) => report.key === starter.key)) continue;
    visible.push(starter);
  }

  return visible;
}

function getReportThumbnailTone(type: string | undefined, lens: LensId, index: number) {
  const normalizedType = type?.toLowerCase() ?? "";
  if (normalizedType.includes("company")) return 0;
  if (normalizedType.includes("market")) return 2;
  if (normalizedType.includes("job") || normalizedType.includes("role")) return 4;
  if (normalizedType.includes("person") || normalizedType.includes("founder")) return 3;
  if (lens === "investor") return 1;
  if (lens === "banker") return 5;
  return index % 6;
}

export function HomeLanding() {
  useProductBootstrap();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const api = useConvexApi();
  const landingStartedAtRef = useRef(
    typeof performance !== "undefined" ? performance.now() : Date.now(),
  );
  const draft = useMemo(() => loadProductDraft(), []);
  const [query, setQuery] = useState("");
  const [lens, setLens] = useState<LensId>("founder");
  const [showAllPrompts, setShowAllPrompts] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<ProductDraftFile[]>(() => draft?.files ?? []);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [recentSearches] = useState(() => getRecentSearches());
  const queryParam = searchParams.get("q");

  const generateUploadUrl = useMutation(
    api?.domains.product.me.generateUploadUrl ?? ("skip" as any),
  );
  const saveFileMutation = useMutation(
    api?.domains.product.me.saveFile ?? ("skip" as any),
  );
  const meSnapshot = useQuery(
    api?.domains.product.me.getMeSnapshot ?? "skip",
    api?.domains.product.me.getMeSnapshot
      ? { anonymousSessionId: getAnonymousProductSessionId() }
      : "skip",
  );

  const savedReports = useQuery(
    api?.domains.product.reports.listReports ?? "skip",
    api?.domains.product.reports.listReports
      ? { anonymousSessionId: getAnonymousProductSessionId() }
      : "skip",
  );
  const systemReports = useQuery(
    api?.domains?.product?.systemIntelligence?.listSystemReportCards ?? "skip",
    api?.domains?.product?.systemIntelligence?.listSystemReportCards
      ? { filter: "All" }
      : "skip",
  );
  const operatorProfile = meSnapshot?.profile ?? null;
  const operatorContextHint = useMemo(() => buildOperatorContextHint(operatorProfile), [operatorProfile]);
  const operatorContextLabel = useMemo(() => buildOperatorContextLabel(operatorProfile), [operatorProfile]);

  const reports: HomeReportCard[] = (savedReports ?? []).slice(0, 12).map((report: any) => ({
    key: String(report._id),
    title: report.title as string,
    summary: report.summary as string,
    prompt: (report.query || report.title) as string,
    type: (report.type as string) || "report",
    lens: (report.lens || "founder") as LensId,
    entitySlug: typeof report.entitySlug === "string" ? report.entitySlug : undefined,
    thumbnailUrl: typeof report.thumbnailUrl === "string" ? report.thumbnailUrl : undefined,
    thumbnailUrls: Array.isArray(report.thumbnailUrls)
      ? report.thumbnailUrls.filter((url: unknown): url is string => typeof url === "string")
      : undefined,
    sourceUrls: Array.isArray(report.sourceUrls)
      ? report.sourceUrls.filter((url: unknown): url is string => typeof url === "string")
      : undefined,
    sourceLabels: Array.isArray(report.sourceLabels)
      ? report.sourceLabels.filter((label: unknown): label is string => typeof label === "string")
      : undefined,
    updatedAt: typeof report.updatedAt === "number" ? report.updatedAt : undefined,
    updatedLabel: report.updatedAt
      ? new Date(report.updatedAt).toLocaleDateString()
      : "Recently",
    origin: "user",
    originLabel: "Workspace",
  }));
  const projectedSystemReports: HomeReportCard[] = (systemReports ?? []).slice(0, 12).map((report: any) => ({
    key: `system:${report.slug}`,
    title: report.name as string,
    summary: report.summary as string,
    prompt: `What matters most about ${report.name} right now?`,
    type: (report.entityType as string) || "report",
    lens: (report.entityType === "market" ? "investor" : "founder") as LensId,
    entitySlug: typeof report.slug === "string" ? report.slug : undefined,
    thumbnailUrl: typeof report.thumbnailUrl === "string" ? report.thumbnailUrl : undefined,
    thumbnailUrls: Array.isArray(report.thumbnailUrls)
      ? report.thumbnailUrls.filter((url: unknown): url is string => typeof url === "string")
      : undefined,
    sourceUrls: Array.isArray(report.sourceUrls)
      ? report.sourceUrls.filter((url: unknown): url is string => typeof url === "string")
      : undefined,
    sourceLabels: Array.isArray(report.sourceLabels)
      ? report.sourceLabels.filter((label: unknown): label is string => typeof label === "string")
      : undefined,
    updatedAt: typeof report.latestReportUpdatedAt === "number" ? report.latestReportUpdatedAt : undefined,
    updatedLabel:
      typeof report.latestReportUpdatedAt === "number"
        ? new Date(report.latestReportUpdatedAt).toLocaleDateString()
        : "System",
    origin: "system",
    originLabel: typeof report.originLabel === "string" ? report.originLabel : "System intelligence",
  }));
  const visibleReports = useMemo(
    () => buildVisibleHomeReports([...reports, ...projectedSystemReports]),
    [projectedSystemReports, reports],
  );
  const visiblePrompts = showAllPrompts ? SUGGESTED_PROMPTS : SUGGESTED_PROMPTS.slice(0, 2);

  useEffect(() => {
    if (!operatorProfile?.preferredLens) return;
    if (queryParam) return;
    if (!LENSES.some((option) => option.id === operatorProfile.preferredLens)) return;
    if (lens === operatorProfile.preferredLens) return;
    setLens(operatorProfile.preferredLens as LensId);
  }, [lens, operatorProfile?.preferredLens, queryParam]);

  /* ---- Core action: navigate to workspace ---- */
  const startChat = (
    nextQuery?: string,
    nextLens?: LensId,
    source = "composer",
  ) => {
    const resolvedQuery = (nextQuery ?? query).trim();
    const resolvedLens = nextLens ?? lens;
    if (!resolvedQuery) return;
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    addRecentSearch(resolvedQuery, resolvedLens);
    saveProductDraft({
      query: resolvedQuery,
      lens: resolvedLens,
      files: pendingFiles,
    });
    trackEvent("landing_to_first_run_start", {
      durationMs: Math.max(
        0,
        Math.round(now - landingStartedAtRef.current),
      ),
      source,
      uploads: pendingFiles.length,
      queryLength: resolvedQuery.length,
    });

    navigate(
      buildCockpitPath({
        surfaceId: "workspace",
        extra: shouldPersistDraftQueryInUrl(resolvedQuery)
          ? { q: resolvedQuery, lens: resolvedLens }
          : { lens: resolvedLens, draft: "1" },
      }),
    );
  };

  /* ---- Shareable link support: ?q=&lens= ---- */
  const didAutoStartRef = useRef(false);
  useEffect(() => {
    if (didAutoStartRef.current) return;
    const urlQuery = searchParams.get("q");
    const urlLens = searchParams.get("lens") as LensId | null;
    if (urlQuery?.trim()) {
      didAutoStartRef.current = true;
      setQuery(urlQuery.trim());
      startChat(urlQuery.trim(), urlLens ?? lens, "shared_link");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- File upload handler ---- */
  const handleFilesSelected = async (files: File[]) => {
    if (!files.length || !api) return;
    setUploadingFiles(true);
    try {
      const uploaded: ProductDraftFile[] = await uploadProductDraftFiles({
        files,
        anonymousSessionId: getAnonymousProductSessionId(),
        generateUploadUrl,
        saveFileMutation,
      });
      setPendingFiles((current) => [...current, ...uploaded]);
    } finally {
      setUploadingFiles(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1120px] flex-col px-4 pb-24 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      <section className="mx-auto w-full max-w-[760px] text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-[#d97757]" aria-hidden="true" />
          New run
        </div>
        <h1 className="mt-4 text-[1.5rem] font-semibold leading-[1.15] tracking-tight text-gray-900 dark:text-gray-100 md:text-[1.75rem]">
          What do you want to understand?
        </h1>
        <p className="mx-auto mt-2 max-w-[560px] text-sm leading-6 text-gray-500 dark:text-gray-400">
          A company, a market, a person, a decision. We answer with sources and save the result so you can reopen it.
        </p>
        {operatorContextLabel ? (
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 dark:border-white/[0.12] dark:bg-[#171c22] dark:text-gray-300">
            <span className="font-medium">Using your context</span>
            <span className="text-gray-400 dark:text-gray-500">{operatorContextLabel}</span>
          </div>
        ) : null}

        <div className="mt-6 sm:mt-8">
          <ProductIntakeComposer
            value={query}
            onChange={setQuery}
            onSubmit={() => startChat()}
            onFilesSelected={handleFilesSelected}
            files={pendingFiles}
            lens={lens}
            onLensChange={setLens}
            operatorContextLabel={operatorContextLabel}
            operatorContextHint={operatorContextHint}
            uploadingFiles={uploadingFiles}
            placeholder="Paste a LinkedIn profile, drop a pitch deck, or describe the company/role. I'll classify each source and run diligence."
            helperText="Accepts: LinkedIn/GitHub/X URLs · press articles · pitch decks (.pdf/.pptx) · bios (.pdf/.docx/.md) · recruiter & founder notes."
            submitLabel="Start run"
          />
          {/* Live classifier affordance — stays silent until the user types
              or drops files, then shows "Detected: N LinkedIn profiles ·
              1 pitch deck · founder note" + per-source chips. Proves the
              intake breadth claim in the elevator pitch. */}
          <IntakeDetectedSources
            text={query}
            files={pendingFiles}
            className="mt-3"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:mt-5 sm:flex sm:flex-wrap sm:justify-center">
          {visiblePrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setQuery(prompt);
                startChat(prompt, lens, "suggested_prompt");
              }}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 transition hover:border-gray-300 hover:text-gray-900 dark:border-white/[0.12] dark:bg-[#171c22] dark:text-gray-300 dark:hover:border-white/[0.2] dark:hover:bg-[#20262d] dark:hover:text-white"
            >
              {prompt}
            </button>
          ))}
          {SUGGESTED_PROMPTS.length > 2 ? (
            <button
              type="button"
              onClick={() => setShowAllPrompts((current) => !current)}
              className="rounded-full border border-transparent px-3 py-2 text-sm text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              {showAllPrompts ? "Fewer examples" : "More examples"}
            </button>
          ) : null}
        </div>

        {recentSearches.length > 0 && (
          <div className="mt-5 sm:mt-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              Recent
            </p>
            <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
              {recentSearches.slice(0, 6).map((r) => (
                <button
                  key={r.query}
                  type="button"
                  onClick={() =>
                    startChat(r.query, r.lens as LensId, "recent_search")
                  }
                  title={r.query}
                  aria-label={r.query}
                  className="min-w-0 max-w-[min(88vw,44rem)] rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700 dark:border-white/[0.12] dark:bg-[#161b20] dark:text-gray-300 dark:hover:border-white/[0.2] dark:hover:bg-[#20262d] dark:hover:text-gray-100"
                >
                  <span className="block truncate">{formatRecentSearchLabel(r.query)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mt-10 sm:mt-14">
        <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              Pick up where you left off
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              Your recent reports
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleReports.map((r, index) => (
            <button
              key={r.key}
              type="button"
              onClick={() => {
                if (r.entitySlug && r.origin !== "starter") {
                  navigate(`/entity/${encodeURIComponent(r.entitySlug)}`);
                  return;
                }
                startChat(r.prompt, r.lens, "report_card");
              }}
              className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300 hover:shadow-sm dark:border-white/[0.1] dark:bg-[#171b20] dark:hover:border-white/[0.16] dark:hover:bg-[#1b2026] dark:hover:shadow-[0_24px_80px_-56px_rgba(0,0,0,0.9)]"
            >
              <ProductThumbnail
                className="mb-3 aspect-[16/9]"
                title={r.title}
                summary={r.summary}
                type={r.type}
                meta={r.updatedLabel}
                imageUrl={r.thumbnailUrl}
                imageUrls={r.thumbnailUrls}
                sourceUrls={r.sourceUrls}
                sourceLabels={r.sourceLabels}
                tone={getReportThumbnailTone(r.type, r.lens, index)}
                compact
              />
              <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
                {r.title}
              </h3>
              <p className="mt-1.5 line-clamp-2 min-h-[3em] text-sm leading-6 text-gray-500 dark:text-gray-400">
                {r.summary}
              </p>
              <div className="mt-auto pt-3">
                <span className="block text-[11px] uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                  {r.originLabel ?? r.updatedLabel}
                </span>
                <span className="mt-1 block text-xs text-gray-400 dark:text-gray-500">
                  {r.updatedLabel}
                </span>
                <div className="mt-2 min-h-[20px]">
                  <ProductSourceIdentity
                    sourceUrls={r.sourceUrls}
                    sourceLabels={r.sourceLabels}
                    maxItems={1}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomeLanding;
