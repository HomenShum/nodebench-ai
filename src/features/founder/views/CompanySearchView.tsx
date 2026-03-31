/**
 * CompanySearchView — Blank-state entry point for banker / CEO company search.
 *
 * Route: /founder/search
 * User types a company name, selects a lens and output target, then submits.
 * Demo mode always routes to Shopify analysis regardless of query.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Building2, Briefcase, Target, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchLens } from "./founderFixtures";

const GLASS_CARD = "rounded-xl border border-white/[0.20] bg-white/[0.12]";

const LENS_OPTIONS: Array<{ value: SearchLens; label: string; icon: typeof Briefcase; description: string }> = [
  { value: "banker", label: "Banker", icon: Briefcase, description: "Financial snapshot, valuation drivers, FCF trajectory" },
  { value: "ceo", label: "CEO", icon: Building2, description: "Strategic position, identity clarity, next big move" },
  { value: "strategy", label: "Strategy", icon: Target, description: "Moat analysis, competitive dynamics, platform risk" },
  { value: "diligence", label: "Diligence", icon: Shield, description: "Data governance, regulatory exposure, risk factors" },
];

type OutputTarget = "memo" | "spreadsheet" | "deck" | "html_brief";

const OUTPUT_OPTIONS: Array<{ value: OutputTarget; label: string }> = [
  { value: "memo", label: "Memo" },
  { value: "spreadsheet", label: "Spreadsheet" },
  { value: "deck", label: "Deck" },
  { value: "html_brief", label: "HTML Brief" },
];

const EXAMPLE_COMPANIES = ["Shopify", "Stripe", "Linear", "Notion"];

const LS_KEY_LENS = "nodebench-search-lens";
const LS_KEY_OUTPUT = "nodebench-search-output";

function loadPersistedLens(): SearchLens {
  try {
    const v = localStorage.getItem(LS_KEY_LENS);
    if (v && ["banker", "ceo", "strategy", "diligence"].includes(v)) return v as SearchLens;
  } catch { /* ignore */ }
  return "banker";
}

function loadPersistedOutput(): OutputTarget {
  try {
    const v = localStorage.getItem(LS_KEY_OUTPUT);
    if (v && ["memo", "spreadsheet", "deck", "html_brief"].includes(v)) return v as OutputTarget;
  } catch { /* ignore */ }
  return "memo";
}

export default function CompanySearchView() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [lens, setLens] = useState<SearchLens>(loadPersistedLens);
  const [outputTarget, setOutputTarget] = useState<OutputTarget>(loadPersistedOutput);

  const handleSubmit = useCallback(() => {
    const company = query.trim() || "shopify";
    localStorage.setItem(LS_KEY_LENS, lens);
    localStorage.setItem(LS_KEY_OUTPUT, outputTarget);
    localStorage.setItem("nodebench-analysis-company", company.toLowerCase());
    localStorage.setItem("nodebench-analysis-lens", lens);
    localStorage.setItem("nodebench-analysis-output", outputTarget);
    navigate("/founder/analysis");
  }, [query, lens, outputTarget, navigate]);

  const handleExampleClick = useCallback((name: string) => {
    setQuery(name);
    localStorage.setItem(LS_KEY_LENS, lens);
    localStorage.setItem(LS_KEY_OUTPUT, outputTarget);
    localStorage.setItem("nodebench-analysis-company", name.toLowerCase());
    localStorage.setItem("nodebench-analysis-lens", lens);
    localStorage.setItem("nodebench-analysis-output", outputTarget);
    setTimeout(() => {
      navigate("/founder/analysis");
    }, 200);
  }, [lens, outputTarget, navigate]);

  return (
    <div className="flex h-full items-center justify-center overflow-auto px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white/90">Company Intelligence</h1>
          <p className="mt-2 text-sm text-white/60">
            Search any company — public, private, or pre-IPO. NodeBench pulls live signals, structures a decision brief, and packages it for export.
          </p>
        </div>

        {/* Search input */}
        <div className="mt-8" role="search">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-3 focus-within:border-accent-primary/30 transition-colors">
            <Search className="h-5 w-5 shrink-0 text-white/60" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="Search a company, competitor, client, or target..."
              className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/25 outline-none"
              aria-label="Company search"
            />
          </div>
        </div>

        {/* Lens selector */}
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Choose lens</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:gap-2">
            {LENS_OPTIONS.map((opt) => {
              const isActive = lens === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setLens(opt.value)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-colors",
                    isActive
                      ? "border-accent-primary/30 bg-accent-primary/10 text-accent-primary"
                      : "border-white/[0.20] bg-white/[0.12] text-white/60 hover:bg-white/[0.07] hover:text-white/75",
                  )}
                  role="radio"
                  aria-checked={isActive}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <div>
                    <div>{opt.label}</div>
                    <div className="mt-0.5 text-[10px] font-normal text-white/60">{opt.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Output target */}
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Output target</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:gap-2">
            {OUTPUT_OPTIONS.map((opt) => {
              const isActive = outputTarget === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setOutputTarget(opt.value)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "border-accent-primary/30 bg-accent-primary/10 text-accent-primary"
                      : "border-white/[0.20] bg-white/[0.12] text-white/60 hover:bg-white/[0.07] hover:text-white/75",
                  )}
                  role="radio"
                  aria-checked={isActive}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="mt-6">
          <button
            onClick={handleSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#c4684a]"
          >
            Run Analysis
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* What NodeBench assembles */}
        <div className={cn(GLASS_CARD, "mt-8 p-4")}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">NodeBench will assemble</p>
          <ul className="mt-3 space-y-1.5">
            {[
              "Company snapshot with financial and operational metrics",
              "Business quality readout across key dimensions",
              "Regulatory, data governance, and platform risk signals",
              "Competitors and comparables with strategic implications",
              "Lens-specific follow-up questions",
              "Artifact packet for export as memo, sheet, deck, or HTML",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-primary/50" />
                <span className="text-xs leading-relaxed text-white/60">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Example companies */}
        <div className="mt-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">Try an example</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {EXAMPLE_COMPANIES.map((name) => (
              <button
                key={name}
                onClick={() => handleExampleClick(name)}
                className="rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/75"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
