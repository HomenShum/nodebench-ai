import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { Save, Upload } from "lucide-react";
import { useConvexApi } from "@/lib/convexApi";
import { buildCockpitPath } from "@/lib/registry/viewRegistry";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import { useProductBootstrap } from "@/features/product/lib/useProductBootstrap";
import {
  buildOperatorContextHint,
  normalizeRolesOfInterest,
  rolesOfInterestToText,
  type OperatorCommunicationStyle,
  type OperatorEvidenceStyle,
} from "@/features/product/lib/operatorContext";

/* ------------------------------------------------------------------ */
/*  Shared input classes                                               */
/* ------------------------------------------------------------------ */

const INPUT_CLS =
  "mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-100 dark:placeholder:text-gray-500";

const SELECT_CLS = `${INPUT_CLS} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8`;

const LABEL_CLS = "block text-sm font-medium text-gray-700 dark:text-gray-300";

const DIVIDER = "border-t border-gray-100 dark:border-white/[0.06]";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MeHome() {
  useProductBootstrap();

  const navigate = useNavigate();
  const api = useConvexApi();
  const anonymousSessionId = getAnonymousProductSessionId();

  // ── Queries ──
  const snapshot = useQuery(
    api?.domains.product.me.getMeSnapshot ?? "skip",
    api?.domains.product.me.getMeSnapshot ? { anonymousSessionId } : "skip",
  );
  const nudgesSnapshot = useQuery(
    api?.domains.product.nudges.getNudgesSnapshot ?? "skip",
    api?.domains.product.nudges.getNudgesSnapshot ? { anonymousSessionId } : "skip",
  );

  // ── Mutations ──
  const generateUploadUrl = useMutation(api?.domains.product.me.generateUploadUrl ?? ("skip" as any));
  const saveFileMutation = useMutation(api?.domains.product.me.saveFile ?? ("skip" as any));
  const updateProfileMutation = useMutation(api?.domains.product.me.updateProfile ?? ("skip" as any));
  const realFiles = useQuery(
    api?.domains.product.me.listFiles ?? "skip",
    api?.domains.product.me.listFiles ? { anonymousSessionId } : "skip",
  );

  // ── Refs ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hydratedKeyRef = useRef<string | null>(null);

  // ── Local state ──
  const [profileDraft, setProfileDraft] = useState("");
  const [rolesDraft, setRolesDraft] = useState("");
  const [lensDraft, setLensDraft] = useState("founder");
  const [commStyle, setCommStyle] = useState<OperatorCommunicationStyle>("balanced");
  const [evidenceStyle, setEvidenceStyle] = useState<OperatorEvidenceStyle>("balanced");
  const [avoidCorporate, setAvoidCorporate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // ── Derived ──
  const profile = snapshot?.profile;
  const bgSummary = typeof profile?.backgroundSummary === "string" ? profile.backgroundSummary.trim() : "";
  const savedRoles = Array.isArray(profile?.rolesOfInterest) ? profile.rolesOfInterest : [];

  const fileCounts = useMemo(() => {
    const c = { files: 0, images: 0, documents: 0, audio: 0, total: 0 };
    for (const f of realFiles ?? []) {
      c.total++;
      if (f.type === "image") c.images++;
      else if (f.type === "voice") c.audio++;
      else if (f.type === "document") c.documents++;
      else c.files++;
    }
    return c;
  }, [realFiles]);

  const savedContext = snapshot?.savedContext ?? [];
  const contextTotal = savedContext.reduce((sum: number, i: any) => sum + Number(i.value || 0), 0);

  const connectors = useMemo(
    () =>
      nudgesSnapshot?.channels?.length
        ? nudgesSnapshot.channels
        : [
            { label: "Slack", status: "Not connected" },
            { label: "Gmail", status: "Not connected" },
            { label: "Notion", status: "Not connected" },
            { label: "Linear", status: "Not connected" },
          ],
    [nudgesSnapshot?.channels],
  );

  // ── Hydrate profile draft from server ──
  const hydratedKey = useMemo(
    () => JSON.stringify({ bgSummary, lens: profile?.preferredLens, roles: savedRoles, comm: profile?.preferences?.communicationStyle, ev: profile?.preferences?.evidenceStyle, corp: profile?.preferences?.avoidCorporateTone }),
    [bgSummary, profile?.preferences?.avoidCorporateTone, profile?.preferences?.communicationStyle, profile?.preferences?.evidenceStyle, profile?.preferredLens, savedRoles],
  );

  useEffect(() => {
    if (hydratedKeyRef.current === hydratedKey) return;
    hydratedKeyRef.current = hydratedKey;
    setProfileDraft(bgSummary);
    setRolesDraft(rolesOfInterestToText(savedRoles));
    setLensDraft(profile?.preferredLens ?? "founder");
    setCommStyle(profile?.preferences?.communicationStyle ?? "balanced");
    setEvidenceStyle(profile?.preferences?.evidenceStyle ?? "balanced");
    setAvoidCorporate(Boolean(profile?.preferences?.avoidCorporateTone));
    setNotice(null);
  }, [bgSummary, hydratedKey, profile?.preferredLens, profile?.preferences?.avoidCorporateTone, profile?.preferences?.communicationStyle, profile?.preferences?.evidenceStyle, savedRoles]);

  // ── Handlers ──
  const handleUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !api) return;
      setUploadingFile(true);
      try {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
        const { storageId } = await res.json();
        await saveFileMutation({ anonymousSessionId, storageId, name: file.name, mimeType: file.type, size: file.size });
      } catch (err) {
        console.error("[Me] upload failed", err);
      } finally {
        setUploadingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [anonymousSessionId, api, generateUploadUrl, saveFileMutation],
  );

  const saveProfile = useCallback(async () => {
    setSaving(true);
    setNotice(null);
    try {
      await updateProfileMutation({
        anonymousSessionId,
        backgroundSummary: profileDraft.trim(),
        preferredLens: lensDraft,
        rolesOfInterest: normalizeRolesOfInterest(rolesDraft),
        preferences: { communicationStyle: commStyle, evidenceStyle, avoidCorporateTone: avoidCorporate },
      });
      setNotice("Saved.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }, [anonymousSessionId, avoidCorporate, commStyle, evidenceStyle, lensDraft, profileDraft, rolesDraft, updateProfileMutation]);

  // ── Render ──
  return (
    <div className="mx-auto max-w-[720px] px-6 py-8 pb-24">

      {/* ── Header ── */}
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your context</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        The lens, style, and saved context that shape every run.
      </p>

      {/* ── Hero: How NodeBench sees you ── */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/60 p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-[#d97757]" aria-hidden="true" />
          How NodeBench sees you
        </div>
        <p className="mt-3 text-sm leading-6 text-gray-700 dark:text-gray-200">
          You're a <span className="font-semibold text-gray-900 dark:text-gray-100">{lensDraft.charAt(0).toUpperCase() + lensDraft.slice(1)}</span>.
          Answers use <span className="font-semibold text-gray-900 dark:text-gray-100">{commStyle}</span> style
          and <span className="font-semibold text-gray-900 dark:text-gray-100">{evidenceStyle}</span> evidence.
          {profileDraft.trim() ? " Your background shapes every run." : " Add a background summary below to sharpen every answer."}
        </p>
      </section>

      {/* ── Profile section ── */}
      <section className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Profile</h2>
        <div className={`mt-6 ${DIVIDER}`} />

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className={LABEL_CLS}>Background summary</span>
            <textarea
              id="me-background-summary"
              name="backgroundSummary"
              value={profileDraft}
              onChange={(e) => setProfileDraft(e.target.value)}
              rows={4}
              placeholder="What should NodeBench know about your workflow, stakeholders, or current priorities?"
              className={INPUT_CLS}
            />
          </label>

          <label className="block">
            <span className={LABEL_CLS}>Roles you care about</span>
            <input
              id="me-roles-of-interest"
              name="rolesOfInterest"
              value={rolesDraft}
              onChange={(e) => setRolesDraft(e.target.value)}
              placeholder="Founder, investor, recruiter"
              className={INPUT_CLS}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={LABEL_CLS}>Preferred lens</span>
              <select
                id="me-preferred-lens"
                name="preferredLens"
                value={lensDraft}
                onChange={(e) => setLensDraft(e.target.value)}
                className={SELECT_CLS}
              >
                <option value="founder">Founder</option>
                <option value="investor">Investor</option>
                <option value="banker">Banker</option>
                <option value="ceo">CEO</option>
                <option value="legal">Legal</option>
                <option value="student">Student</option>
              </select>
            </label>

            <label className="block">
              <span className={LABEL_CLS}>Communication style</span>
              <select
                id="me-communication-style"
                name="communicationStyle"
                value={commStyle}
                onChange={(e) => setCommStyle(e.target.value as OperatorCommunicationStyle)}
                className={SELECT_CLS}
              >
                <option value="concise">Concise</option>
                <option value="balanced">Balanced</option>
                <option value="detailed">Detailed</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={LABEL_CLS}>Evidence mode</span>
              <select
                id="me-evidence-style"
                name="evidenceStyle"
                value={evidenceStyle}
                onChange={(e) => setEvidenceStyle(e.target.value as OperatorEvidenceStyle)}
                className={SELECT_CLS}
              >
                <option value="fast">Fast</option>
                <option value="balanced">Balanced</option>
                <option value="citation_heavy">Citation heavy</option>
              </select>
            </label>

            <label className="flex items-center gap-3 self-end rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/10">
              <input
                id="me-avoid-corporate-tone"
                name="avoidCorporateTone"
                type="checkbox"
                checked={avoidCorporate}
                onChange={(e) => setAvoidCorporate(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Avoid corporate tone</span>
            </label>
          </div>
        </div>

        {/* Save */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void saveProfile()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save preferences"}
          </button>
          {notice && <span className="text-sm text-gray-500">{notice}</span>}
        </div>
      </section>

      {/* ── Files section ── */}
      <section className="mt-10">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Files</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Upload files so Chat can reference them in future runs.
        </p>
        <div className={`mt-4 ${DIVIDER}`} />

        <input
          ref={fileInputRef}
          id="me-upload-file"
          name="uploadFile"
          type="file"
          className="hidden"
          onChange={handleUpload}
          aria-label="Upload file"
        />

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">{fileCounts.total} file{fileCounts.total !== 1 ? "s" : ""} uploaded</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.06]"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploadingFile ? "Uploading..." : "Upload"}
          </button>
        </div>

        {fileCounts.total > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Documents", count: fileCounts.documents },
              { label: "Images", count: fileCounts.images },
              { label: "Audio", count: fileCounts.audio },
              { label: "Other", count: fileCounts.files },
            ].map((cat) => (
              <div key={cat.label} className="rounded-lg border border-gray-100 px-3 py-2 dark:border-white/[0.06]">
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{cat.count}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{cat.label}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Saved context section ── */}
      <section className="mt-10">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Saved context</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Companies, people, reports, and notes that accumulate across runs.
        </p>
        <div className={`mt-4 ${DIVIDER}`} />

        {savedContext.length > 0 && savedContext.some((item: any) => String(item.value) !== "0" && Number(item.value) !== 0) ? (
          <div className="mt-4 space-y-2">
            {savedContext.map((item: any) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
              Nothing saved yet. Start a run on Home — every report you keep becomes context for the next one.
            </p>
            <button
              type="button"
              onClick={() => navigate(buildCockpitPath({ surfaceId: "ask" }))}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-gray-300 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-gray-200 dark:hover:border-white/[0.2]"
            >
              Go to Home
            </button>
          </div>
        )}
      </section>

      {/* ── Connectors section ── */}
      <section className="mt-10">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Connectors</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Connect services to enable nudges and automatic context.
        </p>
        <div className={`mt-4 ${DIVIDER}`} />

        <div className="mt-4 space-y-3">
          {connectors.map((c) => (
            <div key={c.label} className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Nudges and saved context</div>
              </div>
              {c.status === "Connected" ? (
                <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">Connected</span>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(buildCockpitPath({ surfaceId: "workspace", extra: { q: `Help me connect ${c.label}`, lens: lensDraft } }))}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/[0.04]"
                >
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Privacy section ── */}
      <section className="mt-10 pb-8">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Privacy</h2>
        <div className={`mt-4 ${DIVIDER}`} />
        <div className="mt-4 space-y-3">
          <div className="py-2">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">What Chat can use</div>
            <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Files, reports, and profile when they improve the answer.</div>
          </div>
          <div className="py-2">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">What stays private</div>
            <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Source files stay private until a run explicitly references them.</div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default MeHome;
