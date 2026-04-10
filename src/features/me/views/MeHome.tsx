/**
 * MeHome — Private context, files, profile, preferences.
 *
 * The agent uses this context to personalize research.
 */

import { memo } from "react";
import { FileText, User, Bookmark, Settings, Upload, Shield } from "lucide-react";

function Section({ icon: Icon, title, children }: { icon: typeof FileText; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-content-muted" />
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export const MeHome = memo(function MeHome() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-content">Me</h1>
        <p className="text-xs text-content-muted">Your private context. The agent uses this to give better answers.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section icon={FileText} title="My Files">
          <div className="space-y-2">
            <div className="text-xs text-content-muted/50">No files uploaded yet.</div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-content-muted transition hover:bg-white/[0.06]"
            >
              <Upload className="h-3 w-3" /> Upload files
            </button>
          </div>
        </Section>

        <Section icon={User} title="My Profile">
          <div className="space-y-1.5 text-xs text-content-muted/50">
            <div>Background: not set</div>
            <div>Preferred lens: Founder</div>
            <div>Location: not set</div>
          </div>
        </Section>

        <Section icon={Bookmark} title="Saved Context">
          <div className="space-y-1.5 text-xs text-content-muted/50">
            <div>Companies: 0 saved</div>
            <div>People: 0 saved</div>
            <div>Reports: 0 bookmarked</div>
          </div>
        </Section>

        <Section icon={Settings} title="Settings">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-content-muted">Privacy</span>
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-[10px] text-content-muted/40">
              Your files and profile stay private. The agent only uses them with your permission.
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
});

export default MeHome;
