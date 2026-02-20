/**
 * OperatorProfileWizard — 2-step setup for Operator Profile (USER.md)
 *
 * Step 1: Who you are (name, role, domains, goals)
 * Step 2: How often (schedule frequency)
 *
 * Everything else uses smart defaults that surface after first run.
 * Permissions, budget, writing style, brief format — all configurable
 * later once the user has context from actual briefs.
 */

import React, { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import {
  User,
  Clock,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Check,
  Loader2,
  Pencil,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

interface WizardState {
  displayName: string;
  role: string;
  domains: string[];
  goals: string[];
  scheduleInterval: "3h" | "6h" | "12h" | "daily";
}

const STEPS = [
  { id: 1, label: "You", icon: User },
  { id: 2, label: "Schedule", icon: Clock },
] as const;

const DOMAIN_SUGGESTIONS = [
  "AI/ML", "Finance", "SaaS", "Crypto", "Healthcare",
  "DevTools", "Security", "Research", "Data Engineering", "Product",
];

const SCHEDULE_OPTIONS = [
  { value: "3h" as const, label: "Every 3 hours", desc: "High frequency" },
  { value: "6h" as const, label: "Every 6 hours", desc: "3x daily" },
  { value: "12h" as const, label: "Every 12 hours", desc: "Morning + evening" },
  { value: "daily" as const, label: "Daily", desc: "One comprehensive brief" },
];

const DEFAULT_STATE: WizardState = {
  displayName: "",
  role: "",
  domains: [],
  goals: ["Stay informed on my domains"],
  scheduleInterval: "12h",
};

// ── Markdown builder ────────────────────────────────────────────────────────
// Smart defaults for permissions, budget, output — user configures after first run

function buildMarkdown(state: WizardState): string {
  const lines: string[] = [
    "# USER.md — My Profile",
    "",
    "## Identity",
    `- **Name**: ${state.displayName || "User"}`,
  ];
  if (state.role) lines.push(`- **Role**: ${state.role}`);
  if (state.domains.length) lines.push(`- **Primary Domains**: ${state.domains.join(", ")}`);
  lines.push("- **Writing Style**: concise");

  lines.push("", "## Goals");
  state.goals.forEach((g, i) => lines.push(`${i + 1}. ${g}`));

  lines.push(
    "", "## Autonomy Settings",
    "- **Mode**: Scheduled",
    `- **Schedule**: ${state.scheduleInterval}`,
  );

  // Smart defaults — safe permissions, free tier, bullet briefs
  lines.push(
    "", "## Permissions",
    "- **READ_WEB**: true",
    "- **READ_DOCS**: true",
    "- **READ_EMAIL**: false",
    "- **READ_CALENDAR**: false",
    "- **WRITE_FORUM_POSTS**: false",
    "- **WRITE_EMAIL_DRAFTS**: false",
    "- **SEND_EMAIL**: false",
    "- **SUBMIT_FORMS**: false",
    "- **UPLOAD_DOCUMENTS**: false",
    "", "## Budget",
    "- **Max Tokens Per Run**: 50000",
    "- **Max Tool Calls Per Run**: 20",
    "- **Max External Writes Per Run**: 5",
    "- **Preferred Model Tier**: free",
    "", "## Output Preferences",
    "- **Brief Format**: tldr_bullets",
    "- **Include Cost Estimate**: true",
    "- **Citation Style**: inline",
    "",
  );

  return lines.join("\n");
}

// ── Component ───────────────────────────────────────────────────────────────

export function OperatorProfileWizard() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(DEFAULT_STATE);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [goalInput, setGoalInput] = useState("");

  const existingProfile = useQuery(api.domains.operatorProfile.queries.getProfile);
  const upsertProfile = useMutation(api.domains.operatorProfile.mutations.upsertProfile);

  // Pre-fill from existing profile
  React.useEffect(() => {
    if (existingProfile && !editing) {
      setState({
        displayName: existingProfile.identity.displayName,
        role: existingProfile.identity.role || "",
        domains: existingProfile.identity.domains || [],
        goals: existingProfile.goals.map((g) => g.description),
        scheduleInterval: (existingProfile.scheduleInterval || "12h") as WizardState["scheduleInterval"],
      });
    }
  }, [existingProfile, editing]);

  const update = useCallback((patch: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const addDomain = () => {
    const d = domainInput.trim();
    if (d && !state.domains.includes(d)) {
      update({ domains: [...state.domains, d] });
      setDomainInput("");
    }
  };

  const addGoal = () => {
    const g = goalInput.trim();
    if (g) {
      update({ goals: [...state.goals, g] });
      setGoalInput("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const markdown = buildMarkdown(state);
      await upsertProfile({ markdown });
      toast.success(existingProfile ? "Profile updated" : "Profile created — autopilot ready");
      setEditing(false);
    } catch (e) {
      toast.error("Failed to save profile");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // ── Saved state: compact summary ─────────────────────────────────────────

  if (existingProfile && !editing) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {existingProfile.identity.displayName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {existingProfile.identity.role || "My Profile"}
                {existingProfile.identity.domains?.length
                  ? ` · ${existingProfile.identity.domains.join(", ")}`
                  : ""}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        </div>
        {existingProfile.goals.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {existingProfile.goals.slice(0, 3).map((g, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400"
              >
                {g.description}
              </span>
            ))}
            {existingProfile.goals.length > 3 && (
              <span className="px-2 py-0.5 rounded text-xs text-gray-400">
                +{existingProfile.goals.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Wizard: 2-step onboarding ────────────────────────────────────────────

  const canProceed = step === 1 ? state.displayName.length > 0 : true;

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name *
        </label>
        <input
          type="text"
          value={state.displayName}
          onChange={(e) => update({ displayName: e.target.value })}
          placeholder="How should the agent address you?"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
        <input
          type="text"
          value={state.role}
          onChange={(e) => update({ role: e.target.value })}
          placeholder="e.g., Product Manager, Founder, Researcher"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Domains</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDomain())}
            placeholder="Add a domain..."
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <button type="button" onClick={addDomain} aria-label="Add domain" className="px-3 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {state.domains.map((d) => (
            <span key={d} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs">
              {d}
              <button type="button" onClick={() => update({ domains: state.domains.filter((x) => x !== d) })} aria-label={`Remove ${d}`} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        {state.domains.length === 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-xs text-gray-400 mr-1">Suggestions:</span>
            {DOMAIN_SUGGESTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => update({ domains: [...state.domains, d] })}
                className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.1] transition-colors"
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goals</label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          What should the agent prioritize? First = highest priority.
        </p>
        <div className="space-y-1.5 mb-2">
          {state.goals.map((goal, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02]">
              <span className="text-xs font-mono text-gray-400 w-4">#{i + 1}</span>
              <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{goal}</span>
              <button
                type="button"
                onClick={() => update({ goals: state.goals.filter((_, j) => j !== i) })}
                aria-label={`Remove goal ${i + 1}`}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGoal())}
            placeholder="Add a goal..."
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <button type="button" onClick={addGoal} aria-label="Add goal" className="px-3 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        How often should the agent check for new discoveries and send you a brief?
      </p>
      <div className="grid grid-cols-2 gap-2">
        {SCHEDULE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => update({ scheduleInterval: opt.value })}
            className={`text-left px-4 py-3 rounded-lg border transition-colors ${
              state.scheduleInterval === opt.value
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                : "border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15]"
            }`}
          >
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{opt.label}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</div>
          </button>
        ))}
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-400 pt-2">
        You can adjust this anytime from the dashboard below.
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Step indicators */}
      <div className="flex items-center gap-1">
        {STEPS.map(({ id, label, icon: Icon }) => (
          <React.Fragment key={id}>
            <button
              type="button"
              onClick={() => id <= step && setStep(id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                step === id
                  ? "bg-indigo-500 text-white"
                  : step > id
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                    : "bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
            {id < 2 && <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[240px]">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/[0.06]">
        <button
          type="button"
          onClick={() => editing && !existingProfile ? setStep((s) => Math.max(1, s - 1)) : step === 1 ? setEditing(false) : setStep(1)}
          disabled={step === 1 && !editing}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> {step === 1 && editing ? "Cancel" : "Back"}
        </button>

        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!canProceed}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" /> : <Check className="w-4 h-4" />}
            {existingProfile ? "Update" : "Create Profile"}
          </button>
        )}
      </div>
    </div>
  );
}
