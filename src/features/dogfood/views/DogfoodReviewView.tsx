import { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

type DogfoodManifestItem = {
  file: string;
  kind: "route" | "interaction" | "settings" | string;
  label: string;
};

type DogfoodManifest = {
  capturedAtIso: string;
  basePath: string;
  items: DogfoodManifestItem[];
};

type ScribeStep = {
  index: number;
  kind: string;
  name: string;
  path: string;
  title: string;
  description: string;
  image: string;
};

type ScribeManifest = {
  capturedAtIso: string;
  baseURL: string;
  steps: ScribeStep[];
};

type WalkthroughChapter = {
  index: number;
  name: string;
  path: string;
  startSec: number;
};

type WalkthroughManifest = {
  capturedAtIso: string;
  baseURL: string;
  mime: string;
  publish: "blob" | "static" | "none" | string;
  chapters: WalkthroughChapter[];
  videoUrl: string | null;
  videoPath: string | null;
};

type FramesItem = {
  index: number;
  name: string;
  path: string;
  startSec: number;
  file: string;
  image: string;
};

type FramesManifest = {
  capturedAtIso: string;
  videoPath: string;
  items: FramesItem[];
};

type QaIssue = {
  severity: "p0" | "p1" | "p2" | "p3" | string;
  title: string;
  details: string;
  suggestedFix?: string;
  route?: string;
  startSec?: number;
  endSec?: number;
  evidence?: string[];
};

type DogfoodQaRun = {
  _id: string;
  createdAt: number;
  provider: "gemini" | string;
  model: string;
  source: "video" | "frames" | string;
  videoUrl?: string;
  inputSha256?: string;
  prompt: string;
  summary: string;
  issues: QaIssue[];
  rawText?: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function formatMs(ms: number) {
  if (!Number.isFinite(ms)) return String(ms);
  return new Date(ms).toLocaleString();
}

function resolveAbsoluteUrl(maybeUrl: string | null | undefined): string | null {
  if (!maybeUrl) return null;
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
  if (maybeUrl.startsWith("/")) return `${window.location.origin}${maybeUrl}`;
  return maybeUrl;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function DogfoodReviewView() {
  const [manifest, setManifest] = useState<DogfoodManifest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [walkthrough, setWalkthrough] = useState<WalkthroughManifest | null>(null);
  const [walkthroughError, setWalkthroughError] = useState<string | null>(null);
  const [frames, setFrames] = useState<FramesManifest | null>(null);
  const [framesError, setFramesError] = useState<string | null>(null);
  const [scribe, setScribe] = useState<ScribeManifest | null>(null);
  const [scribeError, setScribeError] = useState<string | null>(null);
  const [scribeDraft, setScribeDraft] = useState<ScribeStep[]>([]);
  const [qaPrompt, setQaPrompt] = useState<string>("");
  const [qaRunning, setQaRunning] = useState(false);
  const [qaScreensRunning, setQaScreensRunning] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const [qaLast, setQaLast] = useState<DogfoodQaRun | null>(null);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const qaRuns = useQuery(api.domains.dogfood.videoQaQueries.listMyDogfoodQaRuns, { limit: 6 }) as
    | DogfoodQaRun[]
    | undefined;
  const runVideoQa = useAction(api.domains.dogfood.videoQa.runDogfoodVideoQa);
  const runScreenshotQa = useAction(api.domains.dogfood.screenshotQa.runDogfoodScreenshotQa);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/dogfood/manifest.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DogfoodManifest;
        if (!cancelled) setManifest(json);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/dogfood/scribe.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ScribeManifest;
        if (!cancelled) {
          setScribe(json);
          setScribeDraft(json.steps ?? []);
        }
      } catch (e) {
        if (!cancelled) setScribeError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/dogfood/walkthrough.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as WalkthroughManifest;
        if (!cancelled) setWalkthrough(json);
      } catch (e) {
        if (!cancelled) setWalkthroughError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/dogfood/frames.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as FramesManifest;
        if (!cancelled) setFrames(json);
      } catch (e) {
        if (!cancelled) setFramesError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commands = useMemo(() => {
    const runE2e = "npx playwright test tests/e2e/full-ui-dogfood.spec.ts --project=chromium --workers=1";
    const publish = "npm run dogfood:publish";
    const record = "npm run dogfood:record";
    const recordStatic = "npm run dogfood:record:static";
    const frames = "npm run dogfood:frames";
    const scribeCmd = "npm run dogfood:scribe";
    const scribeLocal = "npm run dogfood:scribe:local";
    const full = "npm run dogfood:walkthrough";
    const fullLocal = "npm run dogfood:full:local";
    const fullLocalPlay = "npm run dogfood:full:local:play";
    return { runE2e, publish, record, recordStatic, frames, scribeCmd, scribeLocal, full, fullLocal, fullLocalPlay };
  }, []);

  const resolvedVideoUrl = useMemo(() => {
    return resolveAbsoluteUrl(walkthrough?.videoUrl ?? walkthrough?.videoPath ?? null);
  }, [walkthrough?.videoUrl, walkthrough?.videoPath]);

  const grouped = useMemo(() => {
    const items = manifest?.items ?? [];
    const groups: Record<string, DogfoodManifestItem[]> = {};
    for (const item of items) {
      const key = item.kind || "other";
      groups[key] = groups[key] ?? [];
      groups[key].push(item);
    }
    return groups;
  }, [manifest]);

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="mx-auto w-full max-w-6xl p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Design Dogfood</h1>
            <p className="text-sm text-muted-foreground">
              UI evidence and route-by-route dogfooding. Fix root causes, then publish proof here.
            </p>
            {manifest?.capturedAtIso && (
              <p className="text-xs text-muted-foreground">
                Last published: <span className="font-medium text-foreground">{formatDate(manifest.capturedAtIso)}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-sm text-foreground hover:bg-muted/40 transition-colors"
              onClick={async () => {
                const ok = await copyToClipboard(
                  `${commands.fullLocal}\n${commands.fullLocalPlay}\n${commands.runE2e}\n${commands.publish}\n${commands.scribeCmd}\n${commands.recordStatic}\n${commands.record}`,
                );
                setCopied(ok);
                window.setTimeout(() => setCopied(false), 1200);
              }}
              aria-label="Copy dogfood commands"
              title="Copy dogfood commands"
            >
              {copied ? "Copied" : "Copy commands"}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Walkthrough video</div>
              <div className="text-sm text-muted-foreground">
                A single end-to-end dogfood run with chapters (route + key interactions).
              </div>
              {walkthrough?.capturedAtIso && (
                <div className="text-xs text-muted-foreground">
                  Last recorded:{" "}
                  <span className="font-medium text-foreground">{formatDate(walkthrough.capturedAtIso)}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-sm text-foreground hover:bg-muted/40 transition-colors"
              onClick={async () => {
                const ok = await copyToClipboard(
                  `${commands.fullLocal}\n${commands.fullLocalPlay}\n${commands.record}\n${commands.recordStatic}\n${commands.scribeCmd}\n${commands.full}`,
                );
                setCopied(ok);
                window.setTimeout(() => setCopied(false), 1200);
              }}
              aria-label="Copy walkthrough commands"
              title="Copy walkthrough commands"
            >
              Copy video commands
            </button>
          </div>

          {walkthrough && (walkthrough.videoUrl || walkthrough.videoPath) ? (
            <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <div className="rounded-md border border-border/60 bg-muted/10 overflow-hidden">
                <video
                  ref={(el) => {
                    videoRef.current = el;
                  }}
                  className="w-full h-auto block"
                  controls
                  preload="metadata"
                  src={walkthrough.videoUrl ?? walkthrough.videoPath ?? undefined}
                />
              </div>
              <div className="rounded-md border border-border/60 bg-background p-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chapters</div>
                <div className="mt-2 max-h-[420px] overflow-auto space-y-1">
                  {walkthrough.chapters?.map((c) => (
                    <button
                      key={`${c.index}-${c.startSec}`}
                      type="button"
                      className="w-full text-left rounded-md px-2.5 py-2 hover:bg-muted/30 transition-colors"
                      onClick={() => {
                        const v = videoRef.current;
                        if (!v) return;
                        v.currentTime = c.startSec;
                        void v.play();
                      }}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-sm font-medium text-foreground truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{c.startSec.toFixed(1)}s</div>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{c.path}</div>
                    </button>
                  ))}
                </div>
                {walkthrough.publish === "blob" && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Published via blob URL (recommended). Requires <span className="font-mono">BLOB_READ_WRITE_TOKEN</span>.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-border/60 bg-background p-3 space-y-2">
              <div className="text-sm text-muted-foreground">
                No walkthrough published yet. Record one (blob recommended, static is local-only unless you commit the video).
              </div>
              <div className="rounded-md bg-muted/30 border border-border/50 p-3 font-mono text-xs text-foreground whitespace-pre-wrap">
                {commands.record}
                {"\n"}
                {commands.recordStatic}
                {"\n"}
                {commands.frames}
              </div>
              {walkthroughError && (
                <div className="text-xs text-muted-foreground">
                  Walkthrough load error: <span className="font-mono">{walkthroughError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border/60 bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Key frames</div>
              <div className="text-sm text-muted-foreground">
                Chapter-aligned stills for rapid scan, sharing, and model-assisted QA.
              </div>
              {frames?.capturedAtIso && (
                <div className="text-xs text-muted-foreground">
                  Last extracted: <span className="font-medium text-foreground">{formatDate(frames.capturedAtIso)}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-sm text-foreground hover:bg-muted/40 transition-colors"
              onClick={async () => {
                const ok = await copyToClipboard(commands.frames);
                setCopied(ok);
                window.setTimeout(() => setCopied(false), 1200);
              }}
              aria-label="Copy frames command"
              title="Copy frames command"
            >
              Copy frames command
            </button>
          </div>

          {frames?.items?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {frames.items.map((f) => (
                <button
                  key={f.file}
                  type="button"
                  className="rounded-lg border border-border/60 bg-background overflow-hidden text-left hover:bg-muted/20 transition-colors"
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    v.currentTime = f.startSec;
                    void v.play();
                  }}
                >
                  <div className="aspect-[16/9] bg-muted/10 border-b border-border/50 overflow-hidden">
                    <img src={f.image} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="text-sm font-medium text-foreground truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {f.startSec.toFixed(1)}s · {f.path}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-border/60 bg-background p-3 space-y-2">
              <div className="text-sm text-muted-foreground">No frames extracted yet.</div>
              <div className="rounded-md bg-muted/30 border border-border/50 p-3 font-mono text-xs text-foreground whitespace-pre-wrap">
                {commands.frames}
              </div>
              {framesError && (
                <div className="text-xs text-muted-foreground">
                  Frames load error: <span className="font-mono">{framesError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border/60 bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">How-to (Scribe-style)</div>
              <div className="text-sm text-muted-foreground">
                Auto-generated step list with screenshots and editable copy. Export as Markdown and share.
              </div>
              {scribe?.capturedAtIso && (
                <div className="text-xs text-muted-foreground">
                  Last captured:{" "}
                  <span className="font-medium text-foreground">{formatDate(scribe.capturedAtIso)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-sm text-foreground hover:bg-muted/40 transition-colors"
                onClick={async () => {
                  const lines: string[] = [
                    "# NodeBench Dogfood Walkthrough",
                    "",
                    scribe?.capturedAtIso ? `Captured: ${scribe.capturedAtIso}` : "",
                    "",
                  ].filter(Boolean);
                  for (const step of scribeDraft) {
                    lines.push(`## ${step.title}`);
                    lines.push(step.description || "");
                    lines.push("");
                    lines.push(`![${step.title}](${step.image})`);
                    lines.push("");
                  }
                  const ok = await copyToClipboard(lines.join("\n"));
                  setCopied(ok);
                  window.setTimeout(() => setCopied(false), 1200);
                }}
              >
                Copy Markdown
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-sm text-foreground hover:bg-muted/40 transition-colors"
                onClick={async () => {
                  const ok = await copyToClipboard(`${commands.scribeCmd}\n${commands.scribeLocal}`);
                  setCopied(ok);
                  window.setTimeout(() => setCopied(false), 1200);
                }}
              >
                Copy capture commands
              </button>
            </div>
          </div>

          {scribeDraft.length > 0 ? (
            <div className="space-y-4">
              {scribeDraft.map((s) => (
                <div key={s.index} className="rounded-md border border-border/60 bg-background p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{s.title}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{s.path}</div>
                  </div>
                  <div className="mt-2 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
                    <div className="rounded-md overflow-hidden border border-border/60 bg-muted/10">
                      <img src={s.image} alt={s.title} className="w-full h-auto block" loading="lazy" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Step text (editable)
                      </label>
                      <textarea
                        className="w-full min-h-[120px] rounded-md border border-border/60 bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/40"
                        value={s.description}
                        onChange={(e) => {
                          const next = e.target.value;
                          setScribeDraft((prev) =>
                            prev.map((p) => (p.index === s.index ? { ...p, description: next } : p)),
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-border/60 bg-background p-3 space-y-2">
              <div className="text-sm text-muted-foreground">
                No how-to published yet. Capture one and it will show up here.
              </div>
              <div className="rounded-md bg-muted/30 border border-border/50 p-3 font-mono text-xs text-foreground whitespace-pre-wrap">
                {commands.scribeCmd}
                {"\n"}
                {commands.scribeLocal}
              </div>
              {scribeError && (
                <div className="text-xs text-muted-foreground">
                  Scribe load error: <span className="font-mono">{scribeError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border/60 bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Gemini QA (video understanding)</div>
              <div className="text-sm text-muted-foreground">
                Runs a design + performance critique directly on the latest walkthrough video and stores issues for review.
              </div>
              {resolvedVideoUrl ? (
                <div className="text-xs text-muted-foreground">
                  Video input: <span className="font-mono">{resolvedVideoUrl}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No video found yet. Record a walkthrough first.</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={!resolvedVideoUrl || qaRunning}
                onClick={async () => {
                  if (!resolvedVideoUrl) return;
                  setQaRunning(true);
                  setQaError(null);
                  try {
                    const run = (await runVideoQa({
                      videoUrl: resolvedVideoUrl,
                      walkthrough: walkthrough ?? undefined,
                      prompt: qaPrompt.trim().length ? qaPrompt : undefined,
                    })) as any as DogfoodQaRun;
                    setQaLast(run);
                  } catch (e) {
                    setQaError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setQaRunning(false);
                  }
                }}
                aria-label="Run Gemini QA on video"
                title="Run Gemini QA on video"
              >
                {qaRunning ? "Running..." : "Run video QA"}
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-sm text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
                disabled={!manifest?.items?.length || qaScreensRunning}
                onClick={async () => {
                  if (!manifest?.items?.length) return;
                  setQaScreensRunning(true);
                  setQaError(null);
                  try {
                    const base = manifest.basePath || "/dogfood/screenshots";
                    const screenshots = (manifest.items ?? [])
                      .filter((it) => it.kind === "route" || it.kind === "interaction" || it.kind === "settings")
                      .slice(0, 10)
                      .map((it) => ({
                        label: it.label,
                        route: it.kind === "route" ? it.label : it.kind,
                        url: resolveAbsoluteUrl(`${base}/${encodeURIComponent(it.file)}`) ?? "",
                      }))
                      .filter((s) => s.url);

                    const run = (await runScreenshotQa({
                      screenshots,
                      prompt: qaPrompt.trim().length ? qaPrompt : undefined,
                      maxImages: 8,
                    })) as any as DogfoodQaRun;
                    setQaLast(run);
                  } catch (e) {
                    setQaError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setQaScreensRunning(false);
                  }
                }}
                aria-label="Run Gemini QA on screenshots"
                title="Run Gemini QA on screenshots"
              >
                {qaScreensRunning ? "Running..." : "Run screenshot QA"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Prompt override (optional)
            </label>
            <textarea
              className="w-full min-h-[92px] rounded-md border border-border/60 bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/40"
              value={qaPrompt}
              onChange={(e) => setQaPrompt(e.target.value)}
              placeholder="Leave blank to use the default design + performance QA rubric."
            />
          </div>

          {qaError && (
            <div className="text-xs text-muted-foreground">
              QA error: <span className="font-mono">{qaError}</span>
            </div>
          )}

          {(qaLast || (qaRuns && qaRuns.length > 0)) && (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent runs</div>
                <div className="text-xs text-muted-foreground">
                  {qaLast ? (
                    <span>
                      Latest: <span className="font-mono">{formatMs(qaLast.createdAt)}</span>
                    </span>
                  ) : null}
                </div>
              </div>

              {[...(qaLast ? [qaLast] : []), ...((qaRuns ?? []).filter((r) => r._id !== qaLast?._id))].slice(0, 4).map((run) => (
                <div key={run._id} className="rounded-md border border-border/60 bg-background p-3 space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="text-sm font-medium text-foreground">Summary</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {formatMs(run.createdAt)} · {run.provider}/{run.model}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{run.summary}</div>

                  {run.issues?.length ? (
                    <div className="mt-2 space-y-2">
                      {run.issues.slice(0, 12).map((it, idx) => (
                        <div key={`${run._id}-${idx}`} className="rounded-md border border-border/60 bg-card p-3">
                          <div className="flex items-baseline justify-between gap-3">
                            <div className="text-sm font-medium text-foreground truncate">
                              <span className="mr-2 inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-mono border border-border/60 bg-muted/20">
                                {String(it.severity).toUpperCase()}
                              </span>
                              {it.title}
                            </div>
                            {(typeof it.startSec === "number" || typeof it.endSec === "number") && (
                              <div className="text-xs text-muted-foreground font-mono">
                                {typeof it.startSec === "number" ? it.startSec.toFixed(1) : "?"}s-
                                {typeof it.endSec === "number" ? it.endSec.toFixed(1) : "?"}s
                              </div>
                            )}
                          </div>
                          {it.route && <div className="text-xs text-muted-foreground font-mono">{it.route}</div>}
                          <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{it.details}</div>
                          {it.suggestedFix && (
                            <div className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-2">
                                Suggested fix:
                              </span>
                              {it.suggestedFix}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No issues reported.</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {!manifest && (
          <div className="rounded-lg border border-border/60 bg-card p-5 space-y-3">
            <div className="text-sm font-medium text-foreground">No published dogfood artifacts</div>
            <div className="text-sm text-muted-foreground">
              Publish the latest Playwright screenshots so this page can render them.
            </div>
            <div className="rounded-md bg-muted/30 border border-border/50 p-3 font-mono text-xs text-foreground whitespace-pre-wrap">
              {commands.fullLocal}
              {"\n"}
              {commands.fullLocalPlay}
              {"\n"}
              {commands.runE2e}
              {"\n"}
              {commands.publish}
            </div>
            {loadError && (
              <div className="text-xs text-muted-foreground">
                Manifest load error: <span className="font-mono">{loadError}</span>
              </div>
            )}
          </div>
        )}

        {manifest && (
          <div className="space-y-6">
            {Object.entries(grouped).map(([kind, items]) => (
              <section key={kind} className="space-y-3">
                <div className="flex items-end justify-between">
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    {kind} <span className="text-muted-foreground font-medium">({items.length})</span>
                  </h2>
                  <div className="text-xs text-muted-foreground">
                    Base path: <span className="font-mono">{manifest.basePath}</span>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => {
                    const src = `${manifest.basePath}/${encodeURIComponent(item.file)}`;
                    return (
                      <div key={item.file} className="rounded-lg border border-border/60 bg-card overflow-hidden">
                        <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between gap-2">
                          <div className="text-xs font-medium text-foreground truncate">{item.label}</div>
                          <a
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            title="Open full-size"
                          >
                            Open
                          </a>
                        </div>
                        <div className="bg-muted/10">
                          <img src={src} alt={item.label} className="w-full h-auto block" loading="lazy" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-border/60 bg-card p-5 space-y-2">
          <div className="text-sm font-medium text-foreground">Definition of done</div>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Every changed screen is dogfooded end-to-end (and adjacent screens sharing layout).</li>
            <li>Root cause diagnosed (render path, data ownership, stored vs computed) and fixed.</li>
            <li>Evidence published here (screens + walkthrough + how-to) so quality is verifiable without reading code.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
