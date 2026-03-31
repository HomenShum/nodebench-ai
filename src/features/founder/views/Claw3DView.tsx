/**
 * Claw3DView — 3D Virtual Office for AI Agents (Claw3D iframe)
 *
 * Embeds the open-source Claw3D 3D workspace inside NodeBench.
 * Claw3D runs on port 3000 and connects to NodeBench's command bridge
 * for real-time agent state.
 *
 * Route: /founder/3dclaw
 *
 * Setup:
 *   1. node scripts/launch-claw3d.mjs   (starts Claw3D on port 3000)
 *   2. npx tsx server/index.ts           (starts NodeBench backend on port 3100)
 *   3. npm run dev                       (starts NodeBench frontend on port 5191)
 */

import { useState, useEffect } from "react";
import { ExternalLink, Box, RefreshCw, AlertCircle } from "lucide-react";

const CLAW3D_URL = "http://localhost:3000";
const OFFICE_PATH = "/office";

export default function Claw3DView() {
  const [isReachable, setIsReachable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        // Quick reachability check — just see if the port responds
        const res = await fetch(CLAW3D_URL, {
          mode: "no-cors",
          signal: AbortSignal.timeout(3000),
        });
        if (!cancelled) setIsReachable(true);
      } catch {
        if (!cancelled) setIsReachable(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-4 py-2">
        <div className="flex items-center gap-3">
          <Box className="h-5 w-5 text-accent-primary" />
          <h1
            className="text-lg font-semibold text-white/90"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            3D Agent Office
          </h1>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/30">
            Powered by Claw3D
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`${CLAW3D_URL}${OFFICE_PATH}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10"
          >
            <ExternalLink className="h-3 w-3" />
            Open Standalone
          </a>
          <button
            type="button"
            onClick={() => {
              setIsReachable(null);
              setIsLoading(true);
              window.location.reload();
            }}
            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10"
            aria-label="Refresh"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1">
        {isReachable === false && (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
            <AlertCircle className="h-12 w-12 text-amber-400/60" />
            <h2 className="text-lg font-semibold text-white/80">Claw3D Not Running</h2>
            <p className="max-w-md text-center text-sm text-white/40">
              The 3D agent office runs as a companion app. Start it to see your agents in 3D.
            </p>
            <div className="space-y-2 rounded-xl border border-white/[0.06] bg-black/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/30">Quick start</p>
              <code className="block rounded bg-black/60 px-3 py-2 font-mono text-xs text-accent-primary">
                node scripts/launch-claw3d.mjs
              </code>
              <p className="text-[10px] text-white/20">
                Then refresh this page. Claw3D will connect to NodeBench's agent bridge automatically.
              </p>
            </div>
            <div className="mt-2 space-y-1 text-center">
              <p className="text-[10px] text-white/20">
                Or open standalone:{" "}
                <a
                  href={`${CLAW3D_URL}${OFFICE_PATH}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-primary/70 underline"
                >
                  localhost:3000/office
                </a>
              </p>
              <p className="text-[10px] text-white/20">
                Source:{" "}
                <a
                  href="https://github.com/iamlukethedev/Claw3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/30 underline"
                >
                  github.com/iamlukethedev/Claw3D
                </a>
              </p>
            </div>
          </div>
        )}

        {isReachable === true && (
          <iframe
            src={`${CLAW3D_URL}${OFFICE_PATH}`}
            title="Claw3D — 3D Agent Office"
            className="h-full w-full border-0"
            allow="microphone; camera; fullscreen"
            onLoad={() => setIsLoading(false)}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        )}

        {isReachable === null && (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-3 text-white/30">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-sm">Checking Claw3D availability...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
