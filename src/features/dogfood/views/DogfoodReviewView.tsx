import { useEffect, useMemo, useState } from "react";

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

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
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
  const [copied, setCopied] = useState(false);

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

  const commands = useMemo(() => {
    const runE2e = "npx playwright test tests/e2e/full-ui-dogfood.spec.ts --project=chromium --workers=1";
    const publish = "npm run dogfood:publish";
    return { runE2e, publish };
  }, []);

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
                const ok = await copyToClipboard(`${commands.runE2e}\n${commands.publish}`);
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

        {!manifest && (
          <div className="rounded-lg border border-border/60 bg-card p-5 space-y-3">
            <div className="text-sm font-medium text-foreground">No published dogfood artifacts</div>
            <div className="text-sm text-muted-foreground">
              Publish the latest Playwright screenshots so this page can render them.
            </div>
            <div className="rounded-md bg-muted/30 border border-border/50 p-3 font-mono text-xs text-foreground whitespace-pre-wrap">
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
            <li>Evidence published here so quality is verifiable without reading code.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

