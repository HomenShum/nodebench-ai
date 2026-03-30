/**
 * PricingPage — 4-tier pricing with comparison table, FAQ, glass card styling.
 */

import { memo, useCallback, useState } from "react";
import { ArrowRight, Check, Minus, Sparkles } from "lucide-react";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";

/* ------------------------------------------------------------------ */
/*  Tier data                                                          */
/* ------------------------------------------------------------------ */

const TIERS = [
  {
    name: "Stage 0",
    subtitle: "Clarity",
    price: "$0",
    period: "",
    description: "Pressure-test the idea, get a founder packet, and see what is missing",
    cta: "Start free",
    href: "#",
    highlighted: false,
    features: [
      "Search, upload, and ask",
      "Founder pressure test",
      "Starter company profile",
      "Weekly reset and next-step packet",
      "Private-by-default founder packet",
    ],
  },
  {
    name: "Stage 1",
    subtitle: "Foundation",
    price: "$1",
    period: "",
    description: "Expose missing foundations and make the first founder workflow repeatable",
    cta: "Unlock foundation",
    href: "#",
    highlighted: true,
    badge: "Best first paid step",
    features: [
      "Readiness checklist",
      "Materials and qualification gaps",
      "Delegable work vs founder-only work",
      "Decision memo export",
      "Team install plan",
      "Workflow adoption scan",
    ],
  },
  {
    name: "Stage 2",
    subtitle: "Readiness",
    price: "$5",
    period: "",
    description: "Prepare investor, banker, and diligence-facing artifacts before outsiders ask",
    cta: "Unlock readiness",
    href: "#",
    highlighted: false,
    features: [
      "Investor and banker packets",
      "Vertical diligence pack",
      "Runway and burn workflows",
      "Crunchbase and PitchBook-style exports",
      "Slack one-page report",
      "Submission-readiness score",
    ],
  },
  {
    name: "Stage 3+",
    subtitle: "Leverage / Scale",
    price: "$20+",
    period: "",
    description: "Turn the workflow into ambient leverage, benchmark proof, and hosted collaboration",
    cta: "Talk to us",
    href: "mailto:hello@nodebench.ai",
    highlighted: false,
    features: [
      "Ambient monitoring and alerts",
      "Autonomy benchmark lanes",
      "Shared context and sync review",
      "Hosted dashboard collaboration",
      "Premium scoring and monitoring",
      "Custom enterprise rollout",
    ],
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Comparison table                                                   */
/* ------------------------------------------------------------------ */

type CellValue = string | boolean;

interface ComparisonRow {
  label: string;
  free: CellValue;
  pro: CellValue;
  team: CellValue;
  enterprise: CellValue;
}

const COMPARISON: ComparisonRow[] = [
  { label: "Primary outcome", free: "Clarity", pro: "Foundation", team: "Readiness", enterprise: "Leverage / Scale" },
  { label: "Founder packet", free: true, pro: true, team: true, enterprise: true },
  { label: "Progression diagnosis", free: "Basic", pro: "Full", team: "Full", enterprise: "Full + team" },
  { label: "Qualification gaps", free: false, pro: true, team: true, enterprise: true },
  { label: "Investor / banker packets", free: false, pro: false, team: true, enterprise: true },
  { label: "Slack one-page report", free: false, pro: false, team: true, enterprise: true },
  { label: "Workflow optimization", free: false, pro: "Basic", team: "Advanced", enterprise: "Advanced" },
  { label: "Ambient monitoring", free: false, pro: false, team: false, enterprise: true },
  { label: "Hosted collaboration", free: false, pro: false, team: false, enterprise: true },
];

const TIER_KEYS = ["free", "pro", "team", "enterprise"] as const;
const TIER_LABELS = ["Clarity", "Foundation", "Readiness", "Leverage / Scale"] as const;

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */

const FAQ = [
  {
    q: "Why stage-based pricing instead of feature gating?",
    a: "Founders do not buy random toggles. They buy clarity, readiness, leverage, and faster proof. Each stage unlocks the services and artifacts that match that maturity level.",
  },
  {
    q: "What does the $1 tier actually unlock?",
    a: "Stage 1 turns the first founder packet into a repeatable workflow: missing foundations, readiness gaps, delegation boundaries, and install planning.",
  },
  {
    q: "What becomes paid later?",
    a: "The closed app layer: hosted monitoring, collaboration, premium scoring, and high-value workflow surfaces. The MCP and schema adoption layer stays open-core.",
  },
  {
    q: "Why keep founder packets private by default?",
    a: "Because early-stage founders often need to stay relatively stealthy until the moat is harder to copy and the diligence story is more defensible.",
  },
  {
    q: "What makes the paid stages worth it?",
    a: "The paid stages should help founders see what outsiders will later ask for before those outsiders ask, then package the answer into reusable artifacts.",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Comparison cell renderer                                           */
/* ------------------------------------------------------------------ */

function ComparisonCell({ value }: { value: CellValue }) {
  if (value === true) {
    return <Check className="mx-auto h-4 w-4 text-emerald-400" aria-label="Included" />;
  }
  if (value === false) {
    return <Minus className="mx-auto h-4 w-4 text-content-muted/40" aria-label="Not included" />;
  }
  return <span>{value}</span>;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export const PricingPage = memo(function PricingPage() {
  const { ref: revealRef, isVisible, instant } = useRevealOnMount();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const stagger = useCallback(
    (delay: string): React.CSSProperties => ({
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? "none" : "translateY(8px)",
      transition: instant ? "none" : "opacity 0.3s ease-out, transform 0.3s ease-out",
      transitionDelay: instant ? "0s" : delay,
    }),
    [isVisible, instant],
  );

  return (
    <div className="h-full overflow-y-auto">
      <div ref={revealRef} className="mx-auto max-w-6xl px-6 py-16">
        {/* Header */}
        <div style={stagger("0s")} className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-content">Pricing</h1>
          <p className="mt-3 text-base text-content-secondary">
            Start with clarity. Unlock the next stage only when the founder workflow is ready for it.
          </p>
        </div>

        {/* ---- Tier cards ---- */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier, i) => (
            <div
              key={tier.name}
              style={stagger(`${0.1 + i * 0.08}s`)}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 ${
                tier.highlighted
                  ? "border-[#d97757]/40 bg-[#d97757]/[0.04] shadow-[0_0_32px_rgba(217,119,87,0.08)]"
                  : "border-white/[0.08] bg-white/[0.02]"
              }`}
            >
              {tier.highlighted && "badge" in tier && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#d97757] px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-lg font-semibold text-content">{tier.name}</h2>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.2em] text-content-muted">
                  {tier.subtitle}
                </p>
                <p className="mt-2 text-[13px] text-content-muted">{tier.description}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tabular-nums text-content">{tier.price}</span>
                  {tier.period && (
                    <span className="text-sm text-content-muted">{tier.period}</span>
                  )}
                </div>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-content-secondary">
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        tier.highlighted ? "text-[#d97757]" : "text-emerald-400"
                      }`}
                      aria-hidden="true"
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={tier.href}
                className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                  tier.highlighted
                    ? "bg-[#d97757] text-white shadow-lg shadow-[#d97757]/20 hover:bg-[#c96a4d]"
                    : "border border-white/[0.12] text-content hover:bg-white/[0.04]"
                }`}
              >
                {tier.cta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          ))}
        </div>

        {/* ---- Comparison table ---- */}
        <div style={stagger("0.5s")} className="mt-20">
          <h2 className="text-center text-2xl font-bold text-content">Compare plans</h2>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-5 py-4 text-left text-[11px] uppercase tracking-[0.2em] text-content-muted">
                    Feature
                  </th>
                  {TIER_LABELS.map((label, idx) => (
                    <th
                      key={label}
                      className={`px-5 py-4 text-center text-[11px] uppercase tracking-[0.2em] ${
                        idx === 1 ? "text-[#d97757]" : "text-content-muted"
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, ri) => (
                  <tr
                    key={row.label}
                    className={ri < COMPARISON.length - 1 ? "border-b border-white/[0.04]" : ""}
                  >
                    <td className="px-5 py-3 text-content-secondary">{row.label}</td>
                    {TIER_KEYS.map((key) => (
                      <td key={key} className="px-5 py-3 text-center text-content-secondary">
                        <ComparisonCell value={row[key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- FAQ ---- */}
        <div style={stagger("0.6s")} className="mt-20">
          <h2 className="text-center text-2xl font-bold text-content">Frequently asked questions</h2>
          <div className="mx-auto mt-8 max-w-2xl space-y-2">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] transition-colors hover:bg-white/[0.03]"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                  aria-expanded={openFaq === i}
                >
                  <span className="text-sm font-medium text-content">{item.q}</span>
                  <span
                    className="ml-4 shrink-0 text-content-muted transition-transform duration-200"
                    style={{ transform: openFaq === i ? "rotate(45deg)" : "rotate(0deg)" }}
                  >
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm leading-relaxed text-content-secondary">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default PricingPage;
