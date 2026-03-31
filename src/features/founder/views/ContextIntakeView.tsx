/**
 * ContextIntakeView — Phase 3: Real founder context ingestion.
 *
 * Drop in messy material (notes, links, files, screenshots, agent summaries).
 * NodeBench extracts canonical company truth + first Artifact Packet.
 *
 * Design: glass cards, terracotta accent, reduced-motion safe.
 * All local state — localStorage-backed, no Convex wiring in v1.
 */

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Link2,
  FileText,
  Image,
  Bot,
  Sparkles,
  Plus,
  X,
  ChevronRight,
  Pencil,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";
import { useMotionConfig } from "@/lib/motion";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/useToast";

/* ── Constants ────────────────────────────────────────────────────── */

const GLASS_CARD =
  "rounded-xl border border-white/[0.20] bg-white/[0.12] p-5";
const SECTION_HEADER =
  "text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60";

const LS_NOTES = "nodebench-intake-notes";
const LS_SOURCES = "nodebench-intake-sources";
const LS_ENTITIES = "nodebench-intake-entities";
const LS_COMPANY_INTAKE = "nodebench-intake-company";
const LS_COMPANY = "nodebench-company";

/* ── Types ────────────────────────────────────────────────────────── */

type SourceType = "link" | "file" | "screenshot" | "agent";

interface Source {
  id: string;
  type: SourceType;
  value: string;
}

interface NearbyEntities {
  competitors: string[];
  partners: string[];
}

interface ExtractedCompany {
  name: string;
  mission: string;
  wedge: string;
  confidence: number;
  changes: string[];
  contradiction: string;
  nextMoves: string[];
}

/* ── localStorage helpers ─────────────────────────────────────────── */

function loadString(key: string, fallback = ""): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveString(key: string, value: string) {
  localStorage.setItem(key, value);
}

function saveJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ── Heuristic extraction ─────────────────────────────────────────── */

function extractCompanyFromText(text: string): ExtractedCompany {
  const sentences = text
    .replace(/\n+/g, ". ")
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  // Company name: first capitalized multi-word phrase (2+ words starting uppercase)
  const capMatch = text.match(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/,
  );
  const name = capMatch?.[1] ?? "My Company";

  // Mission: first sentence containing help/enable/build/make
  const missionSentence = sentences.find((s) =>
    /\b(help|enable|build|make|empower|transform|provide|deliver)\b/i.test(s),
  );
  const mission = missionSentence ?? "Define your mission by adding more context above.";

  // Wedge: first sentence containing unlike/instead/better/only/different
  const wedgeSentence = sentences.find((s) =>
    /\b(unlike|instead|better|only|different|unique|first|no one else)\b/i.test(s),
  );
  const wedge = wedgeSentence ?? "Add competitive context to clarify your wedge.";

  // Confidence: based on how many signals were found
  let confidence = 20;
  if (missionSentence) confidence += 25;
  if (wedgeSentence) confidence += 25;
  if (capMatch) confidence += 15;
  if (sentences.length > 5) confidence += 15;

  // Changes: up to 5 distinct sentence-level signals
  const changes = sentences.slice(0, 5);

  // Contradiction: look for sentences with opposing words
  const positiveWords = /\b(growth|opportunity|strong|increase|success|advantage)\b/i;
  const negativeWords = /\b(risk|challenge|decline|loss|threat|weakness|problem)\b/i;
  const posSentence = sentences.find((s) => positiveWords.test(s));
  const negSentence = sentences.find((s) => negativeWords.test(s));
  const contradiction =
    posSentence && negSentence
      ? `"${posSentence.slice(0, 60)}..." vs "${negSentence.slice(0, 60)}..."`
      : "No contradictions detected — add more context for deeper analysis.";

  // Next 3 moves
  const nextMoves = [
    missionSentence
      ? "Validate mission statement with 3 target customers"
      : "Write a one-sentence mission statement",
    wedgeSentence
      ? "Stress-test wedge against top 2 competitors"
      : "Identify what makes you different from alternatives",
    sentences.length > 3
      ? "Prioritize top 3 signals into a 7-day action plan"
      : "Add more context — meeting notes, pitch fragments, or strategy docs",
  ];

  return { name, mission, wedge, confidence, changes, contradiction, nextMoves };
}

/* ── Source type button config ─────────────────────────────────────── */

const SOURCE_BUTTONS: { type: SourceType; icon: typeof Link2; label: string; placeholder: string }[] = [
  { type: "link", icon: Link2, label: "Add link", placeholder: "https://..." },
  { type: "file", icon: FileText, label: "Upload file", placeholder: "document.pdf" },
  { type: "screenshot", icon: Image, label: "Screenshot", placeholder: "Describe what the screenshot shows..." },
  { type: "agent", icon: Bot, label: "Agent summary", placeholder: "Paste agent output..." },
];

const SOURCE_COLORS: Record<SourceType, string> = {
  link: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400/70",
  file: "border-sky-500/20 bg-sky-500/5 text-sky-400/70",
  screenshot: "border-amber-500/20 bg-amber-500/5 text-amber-400/70",
  agent: "border-violet-500/20 bg-violet-500/5 text-violet-400/70",
};

const SOURCE_ICONS: Record<SourceType, typeof Link2> = {
  link: Link2,
  file: FileText,
  screenshot: Image,
  agent: Bot,
};

/* ── Component ────────────────────────────────────────────────────── */

function ContextIntakeView() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { ref: revealRef, isVisible } = useRevealOnMount();
  const { transition } = useMotionConfig();

  // ── State ──────────────────────────────────────────────────────
  const [notes, setNotes] = useState(() => loadString(LS_NOTES));
  const [sources, setSources] = useState<Source[]>(() => loadJson(LS_SOURCES, []));
  const [entities, setEntities] = useState<NearbyEntities>(() =>
    loadJson(LS_ENTITIES, { competitors: ["", "", ""], partners: [""] }),
  );
  const [addingSource, setAddingSource] = useState<SourceType | null>(null);
  const [sourceInput, setSourceInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedCompany | null>(() =>
    loadJson<ExtractedCompany | null>(LS_COMPANY_INTAKE, null),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState<Partial<ExtractedCompany>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);

  // ── Auto-expand textarea ───────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 160)}px`;
  }, [notes]);

  // ── Persist notes on change ────────────────────────────────────
  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    saveString(LS_NOTES, value);
  }, []);

  // ── Source management ──────────────────────────────────────────
  const handleAddSource = useCallback(() => {
    const trimmed = sourceInput.trim();
    if (!trimmed || !addingSource) return;

    const source: Source = {
      id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: addingSource,
      value: trimmed,
    };

    setSources((prev) => {
      const next = [...prev, source];
      saveJson(LS_SOURCES, next);
      return next;
    });
    setSourceInput("");
    setAddingSource(null);
  }, [sourceInput, addingSource]);

  const handleRemoveSource = useCallback((id: string) => {
    setSources((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveJson(LS_SOURCES, next);
      return next;
    });
  }, []);

  // ── Entity management ──────────────────────────────────────────
  const updateCompetitor = useCallback((index: number, value: string) => {
    setEntities((prev) => {
      const competitors = [...prev.competitors];
      competitors[index] = value;
      const next = { ...prev, competitors };
      saveJson(LS_ENTITIES, next);
      return next;
    });
  }, []);

  const addCompetitor = useCallback(() => {
    setEntities((prev) => {
      if (prev.competitors.length >= 5) return prev;
      const next = { ...prev, competitors: [...prev.competitors, ""] };
      saveJson(LS_ENTITIES, next);
      return next;
    });
  }, []);

  const updatePartner = useCallback((index: number, value: string) => {
    setEntities((prev) => {
      const partners = [...prev.partners];
      partners[index] = value;
      const next = { ...prev, partners };
      saveJson(LS_ENTITIES, next);
      return next;
    });
  }, []);

  const addPartner = useCallback(() => {
    setEntities((prev) => {
      if (prev.partners.length >= 2) return prev;
      const next = { ...prev, partners: [...prev.partners, ""] };
      saveJson(LS_ENTITIES, next);
      return next;
    });
  }, []);

  // ── Generate ───────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    if (!notes.trim()) {
      toast("Add some notes first", "warning");
      return;
    }

    setIsAnalyzing(true);
    setExtracted(null);

    // Simulate analysis delay (1.5s)
    setTimeout(() => {
      const result = extractCompanyFromText(notes);
      setExtracted(result);
      saveJson(LS_COMPANY_INTAKE, result);
      setIsAnalyzing(false);
      setIsEditing(false);
      toast("Company context extracted", "success");
    }, 1500);
  }, [notes, toast]);

  // ── Edit mode ──────────────────────────────────────────────────
  const startEditing = useCallback(() => {
    if (!extracted) return;
    setEditFields({
      name: extracted.name,
      mission: extracted.mission,
      wedge: extracted.wedge,
    });
    setIsEditing(true);
  }, [extracted]);

  const saveEdits = useCallback(() => {
    if (!extracted) return;
    const updated = {
      ...extracted,
      name: editFields.name ?? extracted.name,
      mission: editFields.mission ?? extracted.mission,
      wedge: editFields.wedge ?? extracted.wedge,
    };
    setExtracted(updated);
    saveJson(LS_COMPANY_INTAKE, updated);
    setIsEditing(false);
    toast("Changes saved", "success");
  }, [extracted, editFields, toast]);

  // ── Accept & navigate ──────────────────────────────────────────
  const handleAccept = useCallback(() => {
    if (!extracted) return;

    const companyData = {
      name: extracted.name,
      mission: extracted.mission,
      wedge: extracted.wedge,
      mode: "start_new" as const,
      confidence: extracted.confidence,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(LS_COMPANY, JSON.stringify(companyData));
    toast("Company profile saved", "success");
    navigate("/founder");
  }, [extracted, navigate, toast]);

  // ── Focus source input when type selected ──────────────────────
  useEffect(() => {
    if (addingSource) {
      setTimeout(() => sourceInputRef.current?.focus(), 50);
    }
  }, [addingSource]);

  const hasNotes = notes.trim().length > 0;

  return (
    <div
      ref={revealRef}
      className="flex h-full flex-col overflow-auto px-4 pb-24 pt-4 sm:px-6"
    >
      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <button type="button" onClick={() => navigate("/founder")} className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-white/60 transition-colors hover:text-white/60">
        <ArrowLeft className="h-3 w-3" />Dashboard
      </button>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-white/90">Context Intake</h1>
          <p className="mt-1 max-w-xl text-sm text-white/60">
            Drop in your messy material. NodeBench will structure it.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!hasNotes || isAnalyzing}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-accent-primary/15 px-4 py-2 text-sm font-semibold text-accent-primary transition-colors hover:bg-accent-primary/25 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {isAnalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Generate
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {/* ── PASTE YOUR NOTES ──────────────────────────────────── */}
        <div className={GLASS_CARD}>
          <h2 className={SECTION_HEADER}>Paste Your Notes</h2>
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Paste anything — meeting notes, pitch fragments, product ideas, strategy docs, competitor observations..."
            rows={6}
            className="mt-3 w-full resize-none rounded-lg border border-white/[0.20] bg-white/[0.12] px-4 py-3 text-sm leading-relaxed text-white/80 placeholder-white/20 outline-none transition-colors focus:border-accent-primary/30 focus:bg-white/[0.06]"
            style={{ minHeight: 160 }}
          />
          <div className="mt-1.5 text-right text-[10px] text-white/70">
            {notes.length > 0 ? `${notes.length} characters` : ""}
          </div>
        </div>

        {/* ── ADD SOURCES ───────────────────────────────────────── */}
        <div className={GLASS_CARD}>
          <h2 className={SECTION_HEADER}>Add Sources</h2>

          {/* Source type buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            {SOURCE_BUTTONS.map((btn) => {
              const Icon = btn.icon;
              return (
                <button
                  key={btn.type}
                  type="button"
                  onClick={() => {
                    setAddingSource(addingSource === btn.type ? null : btn.type);
                    setSourceInput("");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    addingSource === btn.type
                      ? "bg-accent-primary/15 text-accent-primary"
                      : "bg-white/[0.07] text-white/60 hover:text-white/60",
                  )}
                >
                  <Plus className="h-3 w-3" />
                  {btn.label}
                </button>
              );
            })}
          </div>

          {/* Source input row */}
          <AnimatePresence>
            {addingSource && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={sourceInputRef}
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddSource();
                      if (e.key === "Escape") setAddingSource(null);
                    }}
                    placeholder={
                      SOURCE_BUTTONS.find((b) => b.type === addingSource)
                        ?.placeholder ?? "Enter value..."
                    }
                    className="flex-1 rounded-md border border-white/[0.20] bg-white/[0.12] px-3 py-2 text-xs text-white/70 placeholder-white/20 outline-none focus:border-accent-primary/30"
                  />
                  <button
                    type="button"
                    onClick={handleAddSource}
                    disabled={!sourceInput.trim()}
                    className="rounded-md bg-accent-primary/10 px-3 py-2 text-xs font-medium text-accent-primary transition-colors hover:bg-accent-primary/20 disabled:opacity-30"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingSource(null)}
                    className="rounded-md px-2 py-2 text-white/70 hover:text-white/60"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Source chips */}
          {sources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {sources.map((source) => {
                const Icon = SOURCE_ICONS[source.type];
                return (
                  <span
                    key={source.id}
                    className={cn(
                      "group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium",
                      SOURCE_COLORS[source.type],
                    )}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="max-w-[180px] truncate">{source.value}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSource(source.id)}
                      className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:text-white/60"
                      aria-label={`Remove ${source.value}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* ── NEARBY ENTITIES ───────────────────────────────────── */}
        <div className={GLASS_CARD}>
          <h2 className={SECTION_HEADER}>Nearby Entities (Optional)</h2>

          {/* Competitors */}
          <div className="mt-3">
            <label className="text-[10px] font-medium text-white/60">Competitors</label>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {entities.competitors.map((val, i) => (
                <input
                  key={`comp-${i}`}
                  value={val}
                  onChange={(e) => updateCompetitor(i, e.target.value)}
                  placeholder={`Competitor ${i + 1}`}
                  className="w-36 rounded-md border border-white/[0.20] bg-white/[0.12] px-2.5 py-1.5 text-xs text-white/60 placeholder-white/15 outline-none focus:border-accent-primary/30"
                />
              ))}
              {entities.competitors.length < 5 && (
                <button
                  type="button"
                  onClick={addCompetitor}
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] text-white/70 hover:text-white/60"
                >
                  <Plus className="h-3 w-3" />
                  add
                </button>
              )}
            </div>
          </div>

          {/* Partners */}
          <div className="mt-3">
            <label className="text-[10px] font-medium text-white/60">Partners / Customers</label>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {entities.partners.map((val, i) => (
                <input
                  key={`partner-${i}`}
                  value={val}
                  onChange={(e) => updatePartner(i, e.target.value)}
                  placeholder={i === 0 ? "Partner" : "Customer"}
                  className="w-36 rounded-md border border-white/[0.20] bg-white/[0.12] px-2.5 py-1.5 text-xs text-white/60 placeholder-white/15 outline-none focus:border-accent-primary/30"
                />
              ))}
              {entities.partners.length < 2 && (
                <button
                  type="button"
                  onClick={addPartner}
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] text-white/70 hover:text-white/60"
                >
                  <Plus className="h-3 w-3" />
                  add
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── ANALYZING ANIMATION ───────────────────────────────── */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(GLASS_CARD, "flex items-center justify-center gap-3 py-8")}
            >
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-accent-primary"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
              <span className="text-sm text-white/60">
                Analyzing your context...
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── PREVIEW PANEL ─────────────────────────────────────── */}
        <AnimatePresence>
          {extracted && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={transition({ duration: 0.3 })}
              className={cn(GLASS_CARD, "border-accent-primary/10")}
            >
              <div className="flex items-center justify-between">
                <h2 className={SECTION_HEADER}>Preview</h2>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] text-white/60">
                    Forming
                  </span>
                  <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-medium text-accent-primary">
                    Confidence: {extracted.confidence}%
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {/* Company name */}
                <PreviewField
                  label="Company"
                  value={extracted.name}
                  isEditing={isEditing}
                  editValue={editFields.name ?? ""}
                  onEditChange={(v) => setEditFields((p) => ({ ...p, name: v }))}
                />

                {/* Mission */}
                <PreviewField
                  label="Mission"
                  value={extracted.mission}
                  isEditing={isEditing}
                  editValue={editFields.mission ?? ""}
                  onEditChange={(v) => setEditFields((p) => ({ ...p, mission: v }))}
                  multiline
                />

                {/* Wedge */}
                <PreviewField
                  label="Wedge"
                  value={extracted.wedge}
                  isEditing={isEditing}
                  editValue={editFields.wedge ?? ""}
                  onEditChange={(v) => setEditFields((p) => ({ ...p, wedge: v }))}
                  multiline
                />
              </div>

              {/* What Changed */}
              {extracted.changes.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/60">
                    What Changed
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {extracted.changes.map((change, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-[12px] text-white/60"
                      >
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent-primary/50" />
                        <span className="line-clamp-2">{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Biggest Contradiction */}
              <div className="mt-5">
                <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/60">
                  Biggest Contradiction
                </h3>
                <p className="mt-1.5 text-[12px] italic text-white/60">
                  {extracted.contradiction}
                </p>
              </div>

              {/* Next 3 Moves */}
              <div className="mt-5">
                <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/60">
                  Next 3 Moves
                </h3>
                <ol className="mt-2 space-y-1.5">
                  {extracted.nextMoves.map((move, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[12px] text-white/60"
                    >
                      <span className="mt-0.5 shrink-0 text-[10px] font-bold text-accent-primary/60">
                        {i + 1}.
                      </span>
                      {move}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Action buttons */}
              <div className="mt-6 flex items-center gap-3">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={saveEdits}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="rounded-lg px-3 py-2 text-xs text-white/60 hover:text-white/60"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={startEditing}
                      className="flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-4 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/70"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleAccept}
                      className="flex items-center gap-1.5 rounded-lg bg-accent-primary/15 px-5 py-2 text-sm font-semibold text-accent-primary transition-colors hover:bg-accent-primary/25"
                    >
                      Accept &amp; Go to Dashboard
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Preview field sub-component ──────────────────────────────────── */

function PreviewField({
  label,
  value,
  isEditing,
  editValue,
  onEditChange,
  multiline,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  editValue: string;
  onEditChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <span className="text-[10px] font-medium text-white/60">{label}</span>
      {isEditing ? (
        multiline ? (
          <textarea
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            rows={2}
            className="mt-1 w-full resize-none rounded-md border border-accent-primary/20 bg-white/[0.02] px-3 py-1.5 text-sm text-white/70 outline-none focus:border-accent-primary/40"
          />
        ) : (
          <input
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-accent-primary/20 bg-white/[0.02] px-3 py-1.5 text-sm text-white/70 outline-none focus:border-accent-primary/40"
          />
        )
      ) : (
        <p className="mt-0.5 text-sm text-white/60">{value}</p>
      )}
    </div>
  );
}

export default memo(ContextIntakeView);
