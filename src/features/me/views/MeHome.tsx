import { useMemo, useRef, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { ArrowUpRight, Lock, Settings2, User, FileText, PlugZap, Upload } from "lucide-react";
import { useConvexApi } from "@/lib/convexApi";
import { buildCockpitPath } from "@/lib/registry/viewRegistry";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import { useProductBootstrap } from "@/features/product/lib/useProductBootstrap";
import { ProductWorkspaceHeader } from "@/features/product/components/ProductWorkspaceHeader";

export function MeHome() {
  useProductBootstrap();

  const navigate = useNavigate();
  const api = useConvexApi();
  const snapshot = useQuery(
    api?.domains.product.me.getMeSnapshot ?? "skip",
    api?.domains.product.me.getMeSnapshot
      ? { anonymousSessionId: getAnonymousProductSessionId() }
      : "skip",
  );
  const nudgesSnapshot = useQuery(
    api?.domains.product.nudges.getNudgesSnapshot ?? "skip",
    api?.domains.product.nudges.getNudgesSnapshot
      ? { anonymousSessionId: getAnonymousProductSessionId() }
      : "skip",
  );

  // --- File upload wiring ---
  const generateUploadUrl = useMutation(api?.domains.product.me.generateUploadUrl ?? ("skip" as any));
  const saveFileMutation = useMutation(api?.domains.product.me.saveFile ?? ("skip" as any));
  const realFiles = useQuery(
    api?.domains.product.me.listFiles ?? "skip",
    api?.domains.product.me.listFiles
      ? { anonymousSessionId: getAnonymousProductSessionId() }
      : "skip",
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !api) return;
      setUploadingCategory(file.type);
      try {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        await saveFileMutation({
          anonymousSessionId: getAnonymousProductSessionId(),
          storageId,
          name: file.name,
          mimeType: file.type,
          size: file.size,
        });
      } catch (err) {
        console.error("[MeHome] file upload failed", err);
      } finally {
        setUploadingCategory(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [api, generateUploadUrl, saveFileMutation],
  );

  const triggerFileInput = useCallback((accept?: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept ?? "*/*";
      fileInputRef.current.click();
    }
  }, []);

  const files = snapshot?.files ?? [];
  const profile = snapshot?.profile;
  const savedContext = snapshot?.savedContext ?? [];
  const settings = snapshot?.settings ?? [];

  const fileCounts = useMemo(() => {
    const counts = { files: 0, images: 0, documents: 0, audio: 0, total: 0 };
    for (const f of realFiles ?? []) {
      counts.total++;
      if (f.type === "image") counts.images++;
      else if (f.type === "voice") counts.audio++;
      else if (f.type === "document") counts.documents++;
      else counts.files++;
    }
    return counts;
  }, [realFiles]);

  const fileItems = useMemo(
    () => [
      { label: "Resumes", meta: "Files", count: fileCounts.files, accept: ".pdf,.doc,.docx,.txt" },
      { label: "Screenshots", meta: "Images", count: fileCounts.images, accept: "image/*" },
      { label: "Docs", meta: "Documents", count: fileCounts.documents, accept: ".pdf,.doc,.docx,.txt,.md,.csv,.xlsx" },
      { label: "Voice notes", meta: "Audio", count: fileCounts.audio, accept: "audio/*" },
    ],
    [fileCounts],
  );

  const savedContextItems = useMemo(
    () =>
      savedContext.length > 0
        ? savedContext
        : [
            { label: "Companies", value: "0" },
            { label: "People", value: "0" },
            { label: "Reports", value: "0" },
            { label: "Notes", value: "0" },
          ],
    [savedContext],
  );

  const settingItems = useMemo(
    () =>
      settings.length > 0
        ? settings
        : [
            { label: "Privacy", value: "Local only" },
            { label: "Permissions", value: "No context enabled" },
            { label: "Uploads", value: "No uploads yet" },
            { label: "Export", value: "Report-first" },
          ],
    [settings],
  );

  const connectors = useMemo(
    () =>
      nudgesSnapshot?.channels?.length
        ? nudgesSnapshot.channels
        : [
            { label: "Gmail", status: "Not connected" },
            { label: "Slack", status: "Not connected" },
            { label: "Notion", status: "Not connected" },
            { label: "Linear", status: "Not connected" },
          ],
    [nudgesSnapshot?.channels],
  );

  const preferredLens = profile?.preferredLens ?? "founder";
  const backgroundSummary =
    typeof profile?.backgroundSummary === "string" && profile.backgroundSummary.trim()
      ? profile.backgroundSummary.trim()
      : "";
  const savedContextTotal = savedContextItems.reduce((total: number, item: any) => total + Number(item.value || 0), 0);
  const rolesOfInterest = Array.isArray(profile?.rolesOfInterest) && profile.rolesOfInterest.length > 0
    ? profile.rolesOfInterest.join(", ")
    : "Founder, operator, investor, and high-context research roles.";
  const starterChatPath = buildCockpitPath({
    surfaceId: "workspace",
    extra: {
      q: "Use my private context and tell me what would improve my next run first.",
      lens: preferredLens,
    },
  });

  const nextRunImprovements = useMemo(() => {
    const items: string[] = [];
    if (fileCounts.total === 0) items.push("Add a file so Chat can use your private context.");
    if (savedContextTotal === 0) items.push("Save a report so the next run starts with memory.");
    if (!backgroundSummary) items.push("Add a background summary so answers fit your context.");
    if (!items.length) items.push("Files, saved context, and preferences are ready for the next run.");
    return items;
  }, [backgroundSummary, fileCounts.total, savedContextTotal]);

  return (
    <div className="nb-public-shell mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-6 py-8 xl:px-8 xl:py-10">
      <ProductWorkspaceHeader
        kicker="Me"
        title="Private context that improves the next run."
        description="Files, saved reports, and profile preferences that Chat uses to give better answers."
        aside={
          <>
            <span className="nb-chip nb-chip-active">{fileCounts.total} saved files</span>
            <span className="nb-chip">{savedContextTotal} context items</span>
            <span className="nb-chip">{connectors.length} connectors</span>
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr_0.9fr]">
        <article className="px-5 py-6 xl:px-6 xl:py-7">
          <div className="nb-section-kicker">What improves the next run</div>
          <div className="nb-metric-strip mt-4">
            <div className="nb-panel-inset px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-content-muted">Files ready</div>
              <div className="mt-2 text-2xl font-semibold text-content">{fileCounts.total}</div>
            </div>
            <div className="nb-panel-inset px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-content-muted">Saved context</div>
              <div className="mt-2 text-2xl font-semibold text-content">{savedContextTotal}</div>
            </div>
            <div className="nb-panel-inset px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-content-muted">Preferred lens</div>
              <div className="mt-2 text-lg font-semibold capitalize text-content">{profile?.preferredLens ?? "founder"}</div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {nextRunImprovements.map((item) => (
              <div key={item} className="nb-panel-inset p-4">
                <div className="text-sm leading-6 text-content">{item}</div>
              </div>
            ))}
          </div>

          <div className="nb-action-cluster mt-5">
            <button
              type="button"
              onClick={() => navigate(starterChatPath)}
              className="nb-primary-button px-4 py-2 text-sm"
            >
              Start in Chat
              <ArrowUpRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate(buildCockpitPath({ surfaceId: "packets" }))}
              className="nb-secondary-button px-4 py-2 text-sm"
            >
              Open Reports
            </button>
          </div>
        </article>

        <article className="px-5 py-6 xl:px-6 xl:py-7">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
            <User className="h-4 w-4" />
            Profile that shapes answers
          </h2>
          <div className="mt-4 space-y-3">
            <div className="nb-panel-inset p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">Background summary</div>
              <p className="mt-2 text-sm leading-6 text-content-muted">
                {backgroundSummary || "No background yet. Add one so Chat can tailor answers."}
              </p>
            </div>
            <div className="nb-panel-inset p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">Roles I care about</div>
              <p className="mt-2 text-sm leading-6 text-content-muted">{rolesOfInterest}</p>
            </div>
            <div className="nb-panel-inset p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">Context usage</div>
              <p className="mt-2 text-sm leading-6 text-content-muted">
                Chat cites your private context when it improves the answer.
              </p>
            </div>
          </div>
        </article>

        <article className="px-5 py-6 xl:px-6 xl:py-7">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
            <FileText className="h-4 w-4" />
            Context already here
          </h2>
          <div className="mt-4 grid gap-3">
            {savedContextItems.map((item: any) => (
              <div key={`${item.label}-${item.value}`} className="nb-panel-inset flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-content">{item.label}</span>
                {Number(item.value || 0) > 0 ? (
                  <span className="text-lg font-semibold text-content">{item.value}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        buildCockpitPath({
                          surfaceId: "workspace",
                          extra: {
                            q: `Help me add ${String(item.label).toLowerCase()} to my private context and explain why it matters.`,
                            lens: preferredLens,
                          },
                        }),
                      )
                    }
                    className="nb-secondary-button px-3 py-1.5 text-xs"
                    data-density="compact"
                  >
                    Add in Chat
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">Upload files</div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              aria-label="Upload file"
            />
            <div className="mt-3 grid gap-3">
              {fileItems.map((item) => (
                <button
                  key={`${item.label}-${item.meta}`}
                  type="button"
                  onClick={() => triggerFileInput(item.accept)}
                  className="nb-panel-inset flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
                  aria-label={`Upload ${item.label.toLowerCase()}`}
                >
                  <div>
                    <div className="text-sm font-medium text-content">{item.label}</div>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">{item.meta}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.count > 0 && (
                      <span className="text-sm font-semibold text-content">{item.count}</span>
                    )}
                    <Upload className="h-4 w-4 text-content-muted" />
                  </div>
                </button>
              ))}
            </div>
            {uploadingCategory && (
              <div className="mt-2 text-xs text-content-muted">Uploading...</div>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="px-5 py-6">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
            <PlugZap className="h-4 w-4" />
            Connectors
          </h2>
          <div className="mt-4 space-y-3">
            {connectors.map((connector) => (
              <div key={connector.label} className="nb-panel-inset flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-content">{connector.label}</div>
                  <div className="mt-1 text-xs text-content-muted">Nudges, follow-ups, and saved context.</div>
                </div>
                {connector.status === "Connected" ? (
                  <span className="nb-status-badge text-xs">{connector.status}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        connector.label === "Gmail" || connector.label === "Slack"
                          ? buildCockpitPath({
                              surfaceId: "workspace",
                              extra: {
                                q: `Help me connect ${connector.label} and explain what value it unlocks in NodeBench.`,
                                lens: preferredLens,
                              },
                            })
                          : buildCockpitPath({ surfaceId: "history" }),
                      )
                    }
                    className="nb-secondary-button px-3 py-1.5 text-xs"
                    data-density="compact"
                  >
                    {connector.label === "Gmail" || connector.label === "Slack" ? "Connect" : "Open Nudges"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </article>

        <article className="px-5 py-6">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
            <Lock className="h-4 w-4" />
            Privacy
          </h2>
          <div className="mt-4 space-y-3">
            <div className="nb-panel-inset p-4">
              <div className="text-sm font-medium text-content">What Chat can use</div>
              <p className="mt-1 text-sm text-content-muted">Files, reports, and profile when they improve the answer.</p>
            </div>
            <div className="nb-panel-inset p-4">
              <div className="text-sm font-medium text-content">What stays private</div>
              <p className="mt-1 text-sm text-content-muted">Source files stay private until a run explicitly uses them.</p>
            </div>
          </div>
        </article>

        <article className="px-5 py-6">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
            <Settings2 className="h-4 w-4" />
            Settings
          </h2>
          <div className="mt-4 space-y-3">
            {settingItems.map((item: any) => (
              <div key={`${item.label}-${item.value}`} className="nb-panel-inset flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm font-medium text-content">{item.label}</span>
                <span className="text-right text-xs text-content-muted">{item.value}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

export default MeHome;
