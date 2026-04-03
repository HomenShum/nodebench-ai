/**
 * CompanySetupView -- 4-step wizard for founder company identity setup.
 *
 * Steps:
 *  1. Founding mode selection (start fresh / continue / merge)
 *  2. Business details (varies by mode)
 *  3. AI-generated company profile preview (editable)
 *  4. Workspace ready confirmation
 *
 * All local state -- no Convex wiring.
 * Design: glass cards, terracotta accent, reduced-motion safe.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Building2,
  GitMerge,
  Plus,
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Pencil,
  Rocket,
  Zap,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

/* ── localStorage keys ───────────────────────────────────────────────────── */

const LS_COMPANY_KEY = "nodebench-company";

interface SavedCompany {
  name: string;
  mission: string;
  wedge: string;
  mode: FoundingMode;
  confidence: number;
  createdAt: string;
}

function loadSavedCompany(): SavedCompany | null {
  try {
    const raw = localStorage.getItem(LS_COMPANY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedCompany;
  } catch {
    return null;
  }
}

function persistCompany(profile: CompanyProfile, mode: FoundingMode): void {
  const data: SavedCompany = {
    name: profile.name,
    mission: profile.mission,
    wedge: profile.wedge,
    mode,
    confidence: profile.confidence,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(LS_COMPANY_KEY, JSON.stringify(data));
}

/* ── Types ────────────────────────────────────────────────────────────────── */

type FoundingMode = "start_new" | "continue_existing" | "merged";

interface ProjectEntry {
  id: string;
  name: string;
  description: string;
}

interface FormData {
  // start_new
  ideaFragments: string;
  marketArea: string;
  motivation: string;
  // continue_existing
  companyName: string;
  whatItDoes: string;
  repoUrl: string;
  // merged
  projects: ProjectEntry[];
}

interface CompanyProfile {
  name: string;
  mission: string;
  wedge: string;
  state: string;
  foundingMode: string;
  confidence: number;
  openQuestions: string[];
}

const INITIAL_FORM: FormData = {
  ideaFragments: "",
  marketArea: "",
  motivation: "",
  companyName: "",
  whatItDoes: "",
  repoUrl: "",
  projects: [{ id: Math.random().toString(36).slice(2, 10), name: "", description: "" }],
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const MODE_CARDS: {
  value: FoundingMode;
  title: string;
  description: string;
  Icon: typeof Sparkles;
}[] = [
  {
    value: "start_new",
    title: "Start Fresh",
    description: "I have an idea but no existing company",
    Icon: Sparkles,
  },
  {
    value: "continue_existing",
    title: "Continue Building",
    description: "I have an existing project, repo, or business",
    Icon: Building2,
  },
  {
    value: "merged",
    title: "Merge & Clarify",
    description: "I have multiple projects that might be one company",
    Icon: GitMerge,
  },
];

const STEP_LABELS = [
  "Starting point",
  "Business details",
  "Company profile",
  "Workspace ready",
];

function generateProfile(
  mode: FoundingMode,
  form: FormData,
): CompanyProfile {
  if (mode === "start_new") {
    const area = form.marketArea.trim() || "technology";
    const name =
      area.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() + w.slice(1)).join("") +
      " Labs";
    return {
      name,
      mission: `Make ${area} more accessible through intelligent tooling and research-backed insights.`,
      wedge: form.ideaFragments.trim()
        ? `Solving the core friction in ${area} that existing players overlook: ${form.ideaFragments.trim().split(/[.\n]/)[0]?.trim() || "early-stage clarity"}.`
        : `First-mover advantage in under-served ${area} workflows.`,
      state: "Pre-formation",
      foundingMode: "Starting Fresh",
      confidence: 42,
      openQuestions: [
        "Who is the first paying customer persona?",
        `What existing tool in ${area} are you most frustrated with?`,
        "What does success look like in 90 days?",
        "Will this be bootstrapped or funded?",
      ],
    };
  }

  if (mode === "continue_existing") {
    const name = form.companyName.trim() || "My Company";
    return {
      name,
      mission: form.whatItDoes.trim()
        ? `${name} exists to ${form.whatItDoes.trim().replace(/^to\s+/i, "").split(/[.\n]/)[0]?.trim() || "build great products"}.`
        : `${name} delivers measurable value to its customers through focused execution.`,
      wedge: form.whatItDoes.trim()
        ? `The unique angle: ${form.whatItDoes.trim().split(/[.\n]/)[0]?.trim()}.`
        : "Clarify your wedge by describing what you do differently.",
      state: "Active",
      foundingMode: "Continuing",
      confidence: 68,
      openQuestions: [
        "What is your current monthly revenue or traction metric?",
        "Who is the single buyer persona you serve best?",
        "What would you stop doing if you had to cut scope by 50%?",
      ],
    };
  }

  // merged
  const names = form.projects
    .filter((p) => p.name.trim())
    .map((p) => p.name.trim());
  const displayName =
    names.length >= 2
      ? `${names[0]} + ${names.length - 1} more`
      : names[0] || "Unified Ventures";
  return {
    name: displayName,
    mission: `Unify ${names.length || "multiple"} projects into a coherent company with a single narrative and shared infrastructure.`,
    wedge: `Cross-project synergies between ${names.slice(0, 3).join(", ") || "your projects"} create a defensible compound advantage.`,
    state: "Consolidating",
    foundingMode: "Merging",
    confidence: 35,
    openQuestions: [
      "Which project generates the most value today?",
      "Are these projects serving the same customer or different ones?",
      "What shared infrastructure could reduce duplication?",
      `If you could only keep one project, which would it be?`,
    ],
  };
}

/* ── Step Indicator ───────────────────────────────────────────────────────── */

function StepIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="mb-8 flex items-center justify-center" role="navigation" aria-label="Setup progress">
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === current;
        const isCompleted = i < current;
        return (
          <div key={i} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-8 sm:w-12 transition-colors duration-300",
                  isCompleted ? "bg-emerald-500/60" : "bg-white/[0.08]",
                )}
              />
            )}
            <div className="relative flex flex-col items-center">
              <div
                className={cn(
                  "flex h-3 w-3 items-center justify-center rounded-full transition-all duration-300",
                  isActive && "bg-accent-primary ring-4 ring-[#d97757]/20",
                  isCompleted && "bg-emerald-500",
                  !isActive && !isCompleted && "border border-white/20 bg-transparent",
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isCompleted && <Check size={8} className="text-white" />}
              </div>
              {isActive && (
                <span className="absolute top-5 whitespace-nowrap text-[10px] font-medium text-accent-primary">
                  {STEP_LABELS[i]}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Step 1: Founding Mode ────────────────────────────────────────────────── */

function StepFoundingMode({
  selected,
  onSelect,
}: {
  selected: FoundingMode | null;
  onSelect: (mode: FoundingMode) => void;
}) {
  return (
    <div>
      <h1 className="mb-2 text-center text-2xl font-semibold text-content">
        How are you starting?
      </h1>
      <p className="mb-8 text-center text-sm text-content-muted">
        This helps us tailor your workspace to where you are right now.
      </p>

      <div className="grid gap-4">
        {MODE_CARDS.map(({ value, title, description, Icon }, idx) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              aria-label={`${title} -- ${description}`}
              aria-pressed={isSelected}
              className={cn(
                "group relative flex items-start gap-4 rounded-2xl border p-5 text-left transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#151413]",
                isSelected
                  ? "border-accent-primary/40 bg-accent-primary/5"
                  : "border-white/[0.20] bg-white/[0.12] hover:border-white/[0.12] hover:bg-white/[0.07]",
              )}
              style={{
                animationDelay: `${idx * 60}ms`,
              }}
            >
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                  isSelected
                    ? "bg-accent-primary/15 text-accent-primary"
                    : "bg-white/[0.07] text-content-muted group-hover:text-content-secondary",
                )}
              >
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <span className="text-base font-semibold text-content">{title}</span>
                <p className="mt-0.5 text-sm text-content-muted">{description}</p>
              </div>
              {isSelected && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-primary">
                    <Check size={14} className="text-white" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Step 2: Business Details ─────────────────────────────────────────────── */

const inputClasses =
  "w-full bg-transparent border border-white/[0.08] rounded-xl px-4 py-3 text-content placeholder:text-content-muted/60 focus:border-accent-primary/30 focus:outline-none focus:ring-1 focus:ring-[#d97757]/20 transition-colors text-sm";

const labelClasses =
  "text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted mb-2 block";

function StepBusinessDetails({
  mode,
  form,
  onChange,
}: {
  mode: FoundingMode;
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}) {
  const addProject = useCallback(() => {
    onChange({
      projects: [
        ...form.projects,
        { id: Math.random().toString(36).slice(2, 10), name: "", description: "" },
      ],
    });
  }, [form.projects, onChange]);

  const removeProject = useCallback(
    (id: string) => {
      if (form.projects.length <= 1) return;
      onChange({ projects: form.projects.filter((p) => p.id !== id) });
    },
    [form.projects, onChange],
  );

  const updateProject = useCallback(
    (id: string, patch: Partial<ProjectEntry>) => {
      onChange({
        projects: form.projects.map((p) =>
          p.id === id ? { ...p, ...patch } : p,
        ),
      });
    },
    [form.projects, onChange],
  );

  if (mode === "start_new") {
    return (
      <div>
        <h1 className="mb-2 text-center text-2xl font-semibold text-content">
          Tell me about your idea
        </h1>
        <p className="mb-8 text-center text-sm text-content-muted">
          Fragments are fine. We will help you structure it.
        </p>
        <div className="space-y-5">
          <div>
            <label htmlFor="idea" className={labelClasses}>Idea fragments</label>
            <textarea
              id="idea"
              rows={3}
              className={cn(inputClasses, "resize-none")}
              placeholder="What are you thinking about building? Stream of consciousness is fine..."
              value={form.ideaFragments}
              onChange={(e) => onChange({ ideaFragments: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="market" className={labelClasses}>Market area</label>
            <input
              id="market"
              type="text"
              className={inputClasses}
              placeholder="e.g. developer tools, fintech, healthcare..."
              value={form.marketArea}
              onChange={(e) => onChange({ marketArea: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="motivation" className={labelClasses}>What drives you to build this?</label>
            <textarea
              id="motivation"
              rows={2}
              className={cn(inputClasses, "resize-none")}
              placeholder="Personal frustration, market gap, opportunity you spotted..."
              value={form.motivation}
              onChange={(e) => onChange({ motivation: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  }

  if (mode === "continue_existing") {
    return (
      <div>
        <h1 className="mb-2 text-center text-2xl font-semibold text-content">
          Tell me about your business
        </h1>
        <p className="mb-8 text-center text-sm text-content-muted">
          We will use this to pre-populate your workspace.
        </p>
        <div className="space-y-5">
          <div>
            <label htmlFor="companyName" className={labelClasses}>Company name</label>
            <input
              id="companyName"
              type="text"
              className={inputClasses}
              placeholder="Your company or project name"
              value={form.companyName}
              onChange={(e) => onChange({ companyName: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="whatItDoes" className={labelClasses}>What does it do?</label>
            <textarea
              id="whatItDoes"
              rows={3}
              className={cn(inputClasses, "resize-none")}
              placeholder="Describe what your company does, who it serves, and what makes it different..."
              value={form.whatItDoes}
              onChange={(e) => onChange({ whatItDoes: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="repoUrl" className={labelClasses}>
              Project / repo URL <span className="text-content-muted/40 normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="repoUrl"
              type="url"
              className={inputClasses}
              placeholder="https://github.com/..."
              value={form.repoUrl}
              onChange={(e) => onChange({ repoUrl: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  }

  // merged
  return (
    <div>
      <h1 className="mb-2 text-center text-2xl font-semibold text-content">
        List your projects
      </h1>
      <p className="mb-8 text-center text-sm text-content-muted">
        Add each project or business you want to unify.
      </p>
      <div className="space-y-4">
        {form.projects.map((project, idx) => (
          <div
            key={project.id}
            className="relative rounded-xl border border-white/[0.20] bg-white/[0.12] p-4"
          >
            {form.projects.length > 1 && (
              <button
                type="button"
                onClick={() => removeProject(project.id)}
                className="absolute right-3 top-3 rounded-lg p-1 text-content-muted hover:bg-white/[0.06] hover:text-content transition-colors"
                aria-label={`Remove project ${idx + 1}`}
              >
                <X size={14} />
              </button>
            )}
            <div className="space-y-3 pr-6">
              <input
                type="text"
                className={inputClasses}
                placeholder={`Project ${idx + 1} name`}
                value={project.name}
                onChange={(e) =>
                  updateProject(project.id, { name: e.target.value })
                }
                aria-label={`Project ${idx + 1} name`}
              />
              <input
                type="text"
                className={inputClasses}
                placeholder="Brief description"
                value={project.description}
                onChange={(e) =>
                  updateProject(project.id, { description: e.target.value })
                }
                aria-label={`Project ${idx + 1} description`}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addProject}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.1] py-3 text-sm text-content-muted transition-colors hover:border-accent-primary/30 hover:text-accent-primary"
          aria-label="Add another project"
        >
          <Plus size={16} />
          Add project
        </button>
      </div>
    </div>
  );
}

/* ── Step 3: Company Profile Preview ──────────────────────────────────────── */

function StepCompanyProfile({
  profile,
  onUpdate,
}: {
  profile: CompanyProfile;
  onUpdate: (patch: Partial<CompanyProfile>) => void;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);

  return (
    <div>
      <h1 className="mb-2 text-center text-2xl font-semibold text-content">
        Your company profile
      </h1>
      <p className="mb-8 text-center text-sm text-content-muted">
        Generated from your inputs. Everything is editable.
      </p>

      <div className="space-y-5">
        {/* Name */}
        <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
          <div className="flex items-center justify-between">
            <span className={labelClasses}>Company Name</span>
            <button
              type="button"
              onClick={() => setEditingField(editingField === "name" ? null : "name")}
              className="rounded-lg p-1 text-content-muted hover:text-accent-primary transition-colors"
              aria-label="Edit company name"
            >
              <Pencil size={12} />
            </button>
          </div>
          {editingField === "name" ? (
            <input
              type="text"
              className={cn(inputClasses, "mt-1")}
              value={profile.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
              autoFocus
              aria-label="Company name input"
            />
          ) : (
            <p className="text-lg font-semibold text-content">{profile.name}</p>
          )}
        </div>

        {/* Mission */}
        <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
          <div className="flex items-center justify-between">
            <span className={labelClasses}>Mission Statement</span>
            <button
              type="button"
              onClick={() => setEditingField(editingField === "mission" ? null : "mission")}
              className="rounded-lg p-1 text-content-muted hover:text-accent-primary transition-colors"
              aria-label="Edit mission statement"
            >
              <Pencil size={12} />
            </button>
          </div>
          {editingField === "mission" ? (
            <textarea
              rows={2}
              className={cn(inputClasses, "mt-1 resize-none")}
              value={profile.mission}
              onChange={(e) => onUpdate({ mission: e.target.value })}
              autoFocus
              aria-label="Mission statement input"
            />
          ) : (
            <p className="text-sm leading-relaxed text-content-secondary">{profile.mission}</p>
          )}
        </div>

        {/* Wedge */}
        <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
          <div className="flex items-center justify-between">
            <span className={labelClasses}>Core Focus</span>
            <button
              type="button"
              onClick={() => setEditingField(editingField === "wedge" ? null : "wedge")}
              className="rounded-lg p-1 text-content-muted hover:text-accent-primary transition-colors"
              aria-label="Edit wedge"
            >
              <Pencil size={12} />
            </button>
          </div>
          {editingField === "wedge" ? (
            <textarea
              rows={2}
              className={cn(inputClasses, "mt-1 resize-none")}
              value={profile.wedge}
              onChange={(e) => onUpdate({ wedge: e.target.value })}
              autoFocus
              aria-label="Wedge input"
            />
          ) : (
            <p className="text-sm leading-relaxed text-content-secondary">{profile.wedge}</p>
          )}
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.20] bg-white/[0.12] px-3 py-1.5 text-xs font-medium text-content-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {profile.state}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.20] bg-white/[0.12] px-3 py-1.5 text-xs font-medium text-content-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-primary" />
            {profile.foundingMode}
          </span>
        </div>

        {/* Confidence meter */}
        <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
          <span className={labelClasses}>Identity Confidence</span>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#d97757] to-amber-500 transition-all duration-700"
                style={{ width: `${profile.confidence}%` }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums text-accent-primary">
              {profile.confidence}%
            </span>
          </div>
          <p className="mt-1.5 text-xs text-content-muted">
            This improves as you add initiatives, connect signals, and make decisions.
          </p>
        </div>

        {/* Open questions */}
        <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
          <span className={labelClasses}>Open Questions</span>
          <ul className="mt-2 space-y-2">
            {profile.openQuestions.map((q, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-content-secondary"
              >
                <ChevronRight size={14} className="mt-0.5 shrink-0 text-accent-primary/60" />
                {q}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ── Step 4: Workspace Ready ──────────────────────────────────────────────── */

function StepWorkspaceReady({ profile }: { profile: CompanyProfile }) {
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowCheck(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="text-center">
      {/* Animated checkmark */}
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 transition-all duration-500",
            showCheck ? "scale-100 opacity-100" : "scale-75 opacity-0",
          )}
        >
          <Check size={32} className="text-emerald-500" strokeWidth={2.5} />
        </div>
      </div>

      <h1 className="mb-2 text-2xl font-semibold text-content">
        Your workspace is ready
      </h1>
      <p className="mb-1 text-lg font-medium text-accent-primary">{profile.name}</p>
      <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-content-muted">
        {profile.mission}
      </p>

      {/* Stats */}
      <div className="mb-8 flex items-center justify-center gap-6">
        {[
          { label: "Initiatives", value: "0" },
          { label: "Agents connected", value: "0" },
          { label: "Signals", value: "0" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-xl font-semibold tabular-nums text-content">
              {stat.value}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-content-muted">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────────────── */

export default function CompanySetupView() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [savedCompany, setSavedCompany] = useState<SavedCompany | null>(() => loadSavedCompany());
  const [showWizard, setShowWizard] = useState(() => loadSavedCompany() === null);

  const [step, setStep] = useState(0);
  const [foundingMode, setFoundingMode] = useState<FoundingMode | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const totalSteps = 4;

  /* Focus management on step change */
  useEffect(() => {
    if (contentRef.current) {
      const heading = contentRef.current.querySelector("h1");
      if (heading) {
        (heading as HTMLElement).focus();
      }
    }
  }, [step]);

  /* Keyboard navigation */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && e.target === document.body) {
        handleNext();
      }
      if (e.key === "Escape" && step > 0) {
        handleBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, foundingMode]);

  const canProceed = useCallback((): boolean => {
    if (step === 0) return foundingMode !== null;
    if (step === 1) {
      if (foundingMode === "start_new") return form.ideaFragments.trim().length > 0 || form.marketArea.trim().length > 0;
      if (foundingMode === "continue_existing") return form.companyName.trim().length > 0;
      if (foundingMode === "merged") return form.projects.some((p) => p.name.trim().length > 0);
      return false;
    }
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, foundingMode, formData]);

  // Alias for canProceed closure
  const form = formData;

  const handleNext = useCallback(() => {
    if (!canProceed()) return;

    if (step === 1 && foundingMode) {
      // Generate profile before moving to step 3
      setCompanyProfile(generateProfile(foundingMode, formData));
    }

    if (step === 2 && companyProfile && foundingMode) {
      // Persist to localStorage when moving to step 4 (workspace ready)
      persistCompany(companyProfile, foundingMode);
      setSavedCompany(loadSavedCompany());
      toast("Company profile saved", "success");
    }

    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    }
  }, [step, foundingMode, formData, companyProfile, canProceed, toast]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const handleFormChange = useCallback((patch: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleProfileUpdate = useCallback((patch: Partial<CompanyProfile>) => {
    setCompanyProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  /* Step 4 CTAs */
  const handleGoToDashboard = useCallback(() => {
    navigate("/founder");
  }, [navigate]);

  const handleAddInitiative = useCallback(() => {
    navigate("/founder/initiative");
  }, [navigate]);

  /* Welcome-back: re-enter wizard */
  const handleEditCompany = useCallback(() => {
    setShowWizard(true);
    setStep(0);
    setFoundingMode(null);
    setFormData(INITIAL_FORM);
    setCompanyProfile(null);
  }, []);

  /* ── Welcome-back state ──────────────────────────────────────────── */
  if (!showWizard && savedCompany) {
    return (
      <div className="flex h-full items-center justify-center overflow-auto px-4 py-8">
        <div className="w-full max-w-lg">
          <div
            className={cn(
              "rounded-2xl border border-white/[0.20] bg-white/[0.12] p-6 sm:p-8 shadow-xl backdrop-blur-sm",
              !prefersReducedMotion && "animate-in fade-in duration-300",
            )}
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Check size={28} className="text-emerald-500" />
              </div>
              <h1 className="mb-1 text-2xl font-semibold text-content">
                Welcome back
              </h1>
              <p className="mb-1 text-lg font-medium text-accent-primary">
                {savedCompany.name}
              </p>
              <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-content-muted">
                {savedCompany.mission}
              </p>

              {/* Details */}
              <div className="mb-6 flex flex-wrap justify-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.20] bg-white/[0.12] px-3 py-1.5 text-xs font-medium text-content-secondary">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-primary" />
                  {savedCompany.mode.replace(/_/g, " ")}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.20] bg-white/[0.12] px-3 py-1.5 text-xs font-medium text-content-secondary">
                  Confidence: {savedCompany.confidence}%
                </span>
              </div>

              {/* CTAs */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleEditCompany}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.20] bg-white/[0.12] px-5 py-3 text-sm font-medium text-content-secondary transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
                  aria-label="Edit company profile"
                >
                  <RotateCcw size={16} />
                  Edit Company
                </button>
                <button
                  type="button"
                  onClick={handleGoToDashboard}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#151413]"
                  aria-label="Go to your dashboard"
                >
                  <Rocket size={16} />
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Wizard flow ─────────────────────────────────────────────────── */
  return (
    <div className="flex h-full items-center justify-center overflow-auto px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Step indicator */}
        <StepIndicator current={step} total={totalSteps} />

        {/* Content card */}
        <div
          ref={contentRef}
          className={cn(
            "rounded-2xl border border-white/[0.20] bg-white/[0.12] p-6 sm:p-8 shadow-xl backdrop-blur-sm",
            !prefersReducedMotion && "animate-in fade-in duration-300",
          )}
          key={step}
        >
          {step === 0 && (
            <StepFoundingMode
              selected={foundingMode}
              onSelect={setFoundingMode}
            />
          )}
          {step === 1 && foundingMode && (
            <StepBusinessDetails
              mode={foundingMode}
              form={formData}
              onChange={handleFormChange}
            />
          )}
          {step === 2 && companyProfile && (
            <StepCompanyProfile
              profile={companyProfile}
              onUpdate={handleProfileUpdate}
            />
          )}
          {step === 3 && companyProfile && (
            <StepWorkspaceReady profile={companyProfile} />
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          {step > 0 && step < totalSteps - 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.20] bg-white/[0.12] px-5 py-3 text-sm font-medium text-content-secondary transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
              aria-label="Go to previous step"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#151413]",
                canProceed()
                  ? "bg-accent-primary text-white hover:bg-accent-primary/80"
                  : "cursor-not-allowed bg-white/[0.07] text-content-muted",
              )}
              aria-label={
                step === 2 ? "Confirm company profile" : "Continue to next step"
              }
            >
              {step === 2 ? "Looks good" : "Continue"}
              <ArrowRight size={16} />
            </button>
          ) : (
            /* Step 4: final CTAs */
            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={handleAddInitiative}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.20] bg-white/[0.12] px-5 py-3 text-sm font-medium text-content-secondary transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
                aria-label="Add your first initiative"
              >
                <Zap size={16} />
                Add First Initiative
              </button>
              <button
                type="button"
                onClick={handleGoToDashboard}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#151413]"
                aria-label="Go to your dashboard"
              >
                <Rocket size={16} />
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
