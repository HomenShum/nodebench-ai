import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowUp,
  Camera,
  FileUp,
  Mic,
  Paperclip,
  Search,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useConvexApi } from "@/lib/convexApi";
import { buildCockpitPath } from "@/lib/registry/viewRegistry";
import { LENSES, type LensId } from "@/features/controlPlane/components/searchTypes";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import { addRecentSearch, getRecentSearches, saveProductDraft, type ProductDraftFile } from "@/features/product/lib/productSession";
import { useProductBootstrap } from "@/features/product/lib/useProductBootstrap";
import { ProductThumbnail } from "@/features/product/components/ProductThumbnail";

const SUGGESTED_PROMPTS = [
  "What is this company and what matters most right now?",
  "What are the biggest risks in this market?",
  "Compare this role to my experience and resume.",
];

const FALLBACK_PUBLIC_CARDS = [
  {
    key: "fallback-axiarete",
    title: "Axiarete company + role fit",
    summary: "Enterprise software intelligence, recruiter context, and fit gaps.",
    prompt: "Axiarete is trying to hire me. What do they do and how do I compare against this role?",
    lens: "founder" as LensId,
    type: "Job",
    updatedLabel: "6 sources | 5m",
  },
  {
    key: "fallback-smr",
    title: "SMR thesis review",
    summary: "What the thesis gets right, what the social thread leaves out, and what to watch.",
    prompt: "Pressure test this SMR thesis and show me the risks, bottlenecks, and real signals.",
    lens: "investor" as LensId,
    type: "Market",
    updatedLabel: "14 sources | 22m",
  },
  {
    key: "fallback-founder",
    title: "Founder profile",
    summary: "Public claims, recent moves, and why this person matters inside the thesis.",
    prompt: "Build me a founder profile and show me what is signal versus narrative.",
    lens: "banker" as LensId,
    type: "Person",
    updatedLabel: "8 sources | 1h",
  },
  {
    key: "fallback-ramp",
    title: "Ramp company report",
    summary: "Product, buyer, market position, and what matters for review.",
    prompt: "Give me a clean company report on Ramp and tell me what matters most right now.",
    lens: "ceo" as LensId,
    type: "Company",
    updatedLabel: "9 sources | 1d",
  },
  {
    key: "fallback-role",
    title: "Role fit",
    summary: "Compare a role, resume, and recruiter note against your background.",
    prompt: "Compare this role to my experience and tell me where I am strong or weak.",
    lens: "student" as LensId,
    type: "Job",
    updatedLabel: "7 sources | 2h",
  },
  {
    key: "fallback-market",
    title: "Market report",
    summary: "Turn a market trend into a report with useful sources and clear watch items.",
    prompt: "Summarize this market and show me the main risks, momentum, and what to watch.",
    lens: "legal" as LensId,
    type: "Market",
    updatedLabel: "11 sources | 3h",
  },
] as const;

export function HomeLanding() {
  useProductBootstrap();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const api = useConvexApi();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const landingStartedAtRef = useRef(typeof performance !== "undefined" ? performance.now() : Date.now());
  const [query, setQuery] = useState("");
  const [lens, setLens] = useState<LensId>("founder");
  const [pendingFiles, setPendingFiles] = useState<ProductDraftFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => getRecentSearches());
  const generateUploadUrl = useMutation(api?.domains.product.me.generateUploadUrl ?? ("skip" as any));
  const saveFileMutation = useMutation(api?.domains.product.me.saveFile ?? ("skip" as any));

  const homeSnapshot = useQuery(
    api?.domains.product.home.getHomeSnapshot ?? "skip",
    api?.domains.product.home.getHomeSnapshot
      ? { anonymousSessionId: getAnonymousProductSessionId() }
      : "skip",
  );

  const savedReports = useQuery(
    api?.domains.product.reports.listReports ?? "skip",
    api?.domains.product.reports.listReports
      ? { anonymousSessionId: getAnonymousProductSessionId() }
      : "skip",
  );

  const evidenceCards = useMemo(() => {
    const filesFromPending = pendingFiles.map((file, index) => ({
      id: `pending-${index}`,
      label: file.name,
      meta: file.type || "upload",
    }));

    const filesFromSnapshot = (homeSnapshot?.evidenceCards ?? []).map((item: any) => ({
      id: String(item._id),
      label: item.label,
      meta: item.type,
    }));

    return [...filesFromPending, ...filesFromSnapshot].slice(0, 6);
  }, [homeSnapshot?.evidenceCards, pendingFiles]);

  const publicCards = useMemo(
    () =>
      (homeSnapshot?.publicCards ?? []).map((card: any) => ({
        key: String(card._id),
        title: card.title,
        summary: card.summary,
        prompt: card.prompt,
        lens: card.lens as LensId,
        type: card.type ?? "Report",
        updatedLabel: card.updatedLabel ?? "Recently",
      })),
    [homeSnapshot?.publicCards],
  );

  const reportCards = useMemo(
    () =>
      (savedReports ?? []).slice(0, 6).map((report: any) => ({
        key: String(report._id),
        title: report.title as string,
        summary: report.summary as string,
        prompt: (report.query || report.title) as string,
        lens: ((report.lens || "founder") as LensId),
        type: (report.type || "Report") as string,
        updatedLabel: report.updatedAt
          ? new Date(report.updatedAt).toLocaleDateString()
          : "Recently",
      })),
    [savedReports],
  );

  const displayCards = reportCards.length > 0
    ? reportCards
    : publicCards.length >= 6
      ? publicCards.slice(0, 6)
      : [...publicCards, ...FALLBACK_PUBLIC_CARDS.filter((fallback) => !publicCards.some((card) => card.title === fallback.title))].slice(0, 6);
  const [previewCardKey, setPreviewCardKey] = useState<string | null>(displayCards[0]?.key ?? null);

  useEffect(() => {
    if (!previewCardKey && displayCards[0]?.key) {
      setPreviewCardKey(displayCards[0].key);
    }
  }, [displayCards, previewCardKey]);

  const activePreviewCard =
    displayCards.find((card) => card.key === previewCardKey) ?? displayCards[0] ?? null;
  const secondaryCards = displayCards
    .filter((card) => card.key !== activePreviewCard?.key)
    .slice(0, 3);

  const startChat = (nextQuery?: string, nextLens?: LensId, source = "composer") => {
    const resolvedQuery = (nextQuery ?? query).trim();
    const resolvedLens = nextLens ?? lens;
    if (!resolvedQuery) return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();

    addRecentSearch(resolvedQuery, resolvedLens);
    saveProductDraft({
      query: resolvedQuery,
      lens: resolvedLens,
      files: pendingFiles,
    });
    trackEvent("landing_to_first_run_start", {
      durationMs: Math.max(0, Math.round(now - landingStartedAtRef.current)),
      source,
      uploads: pendingFiles.length,
      queryLength: resolvedQuery.length,
    });

    navigate(
      buildCockpitPath({
        surfaceId: "workspace",
        extra: { q: resolvedQuery, lens: resolvedLens },
      }),
    );
  };

  // Fix 2: Support ?q= and ?lens= URL params for shareable links
  const didAutoStartRef = useRef(false);
  useEffect(() => {
    if (didAutoStartRef.current) return;
    const urlQuery = searchParams.get("q");
    const urlLens = searchParams.get("lens") as LensId | null;
    if (urlQuery?.trim()) {
      didAutoStartRef.current = true;
      setQuery(urlQuery.trim());
      if (urlLens) setLens(urlLens);
      startChat(urlQuery.trim(), urlLens ?? lens, "shared_link");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      startChat();
    }
  };

  return (
    <div className="nb-public-shell mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-6 py-8 xl:px-8 xl:py-10">
      <section className="nb-enter pt-2 xl:pt-4">
        <div className="mx-auto max-w-[1040px]">
          <div>
            <p className="mb-2 text-sm text-content-muted">
              One question in. Live report out.
            </p>
          </div>
          <div className="mt-5 px-4 py-5 xl:px-5 xl:py-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="nb-input-shell flex min-w-0 flex-1 items-center gap-3 rounded-[20px] px-4 py-4">
                <Search className="h-4 w-4 shrink-0 text-content-muted" />
                <input
                  id="home-query"
                  name="homeQuery"
                  aria-label="Ask anything or upload anything"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search a company, describe your startup, upload files, or ask what to do next..."
                  className="w-full bg-transparent text-base text-content placeholder:text-content-muted/55 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => startChat()}
                disabled={!query.trim()}
                className="nb-primary-button min-h-14 rounded-[20px] md:min-w-[148px]"
              >
                Ask
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="nb-secondary-button min-h-11 px-3.5 py-2 text-sm sm:min-h-0 sm:text-xs"
              >
                <FileUp className="h-3.5 w-3.5" />
                {uploadingFiles ? "Uploading..." : "Upload"}
              </button>
              <button
                type="button"
                onClick={() => setQuery((current) => current || "Paste the key text here and tell me what to figure out.")}
                className="nb-secondary-button min-h-11 px-3.5 py-2 text-sm sm:min-h-0 sm:text-xs"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Paste
              </button>
              <button
                type="button"
                onClick={() => setQuery((current) => current || "Summarize this voice note and tell me what matters.")}
                className="nb-secondary-button min-h-11 px-3.5 py-2 text-sm sm:min-h-0 sm:text-xs"
              >
                <Mic className="h-3.5 w-3.5" />
                Voice
              </button>
              <button
                type="button"
                onClick={() => setQuery((current) => current || "Look at this screenshot and explain what it means.")}
                className="nb-secondary-button min-h-11 px-3.5 py-2 text-sm sm:min-h-0 sm:text-xs"
              >
                <Camera className="h-3.5 w-3.5" />
                Camera
              </button>
            </div>

            <div className="mt-5 grid gap-4 border-t border-[rgba(15,23,42,0.08)] pt-4 dark:border-white/6 xl:grid-cols-[1fr_auto] xl:items-start">
              {recentSearches.length > 0 && (
                <div className="col-span-full mb-1">
                  <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-content-muted">Recent</div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((r) => (
                      <button
                        key={r.query}
                        type="button"
                        onClick={() => startChat(r.query, r.lens as LensId, "recent_search")}
                        className="nb-chip px-3 py-1.5 text-xs text-content-muted"
                      >
                        {r.query}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">Suggested</div>
                <div className="flex snap-x gap-2 overflow-x-auto pb-1">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        setQuery(prompt);
                        startChat(prompt, lens, "suggested_prompt");
                      }}
                      className="nb-secondary-button min-w-max shrink-0 snap-start whitespace-nowrap px-4 py-2 text-left text-xs font-normal text-content-muted"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex min-w-max items-center gap-3 xl:justify-end">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">Lens</div>
                <div className="flex flex-wrap gap-2">
                  {LENSES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setLens(option.id)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                        lens === option.id
                          ? "nb-chip nb-chip-active"
                          : "nb-chip"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {evidenceCards.length > 0 ? (
              <div className="mt-5 border-t border-[rgba(15,23,42,0.08)] pt-4 dark:border-white/6">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">Uploads ready</div>
                <div className="flex flex-wrap gap-2">
                  {evidenceCards.slice(0, 4).map((card) => (
                    <div key={card.id} className="nb-chip px-3 py-1.5 text-xs text-content">
                      {card.label}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={async (event) => {
              const files = Array.from(event.target.files ?? []);
              if (!files.length || !api) return;
              setUploadingFiles(true);
              try {
                const uploaded: ProductDraftFile[] = [];
                for (const file of files) {
                  const uploadUrl = await generateUploadUrl();
                  const uploadResponse = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": file.type || "application/octet-stream" },
                    body: file,
                  });
                  const { storageId } = await uploadResponse.json();
                  const result: any = await saveFileMutation({
                    anonymousSessionId: getAnonymousProductSessionId(),
                    storageId,
                    name: file.name,
                    mimeType: file.type || "application/octet-stream",
                    size: file.size,
                  });
                  uploaded.push({
                    evidenceId: result?.evidenceId ? String(result.evidenceId) : undefined,
                    name: file.name,
                    type: file.type || "upload",
                    size: file.size,
                  });
                }
                setPendingFiles((current) => [...current, ...uploaded]);
              } finally {
                setUploadingFiles(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }
            }}
          />
        </div>
      </section>

      {/* Below-fold: compact card grid — click any card to start a Chat run */}
      {displayCards.length > 0 && (
        <section className="nb-enter-delayed mx-auto w-full max-w-[1240px] px-5 py-6 xl:px-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
            {displayCards.some(c => !("starter" in c)) ? "Your reports" : "Try an example"}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {displayCards.slice(0, 6).map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => startChat(card.prompt, card.lens, "public_card")}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition hover:border-[#d97757]/20 hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                    {card.type}
                  </span>
                  <span className="text-[10px] text-content-muted">{card.updatedLabel}</span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-content">{card.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-content-muted">{card.summary}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default HomeLanding;
