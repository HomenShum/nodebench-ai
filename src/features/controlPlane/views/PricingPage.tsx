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
    name: "Free",
    subtitle: "Personal",
    price: "$0",
    period: "/mo",
    description: "Explore the Decision Workbench on your own terms",
    cta: "Start free",
    href: "#",
    highlighted: false,
    features: [
      "1 workspace",
      "3 analysis runs/month",
      "Basic variable extraction",
      "Limited source ingestion (5 sources)",
      "Community support",
    ],
  },
  {
    name: "Pro",
    subtitle: "$49/month",
    price: "$49",
    period: "/mo",
    description: "For analysts and operators who need depth",
    cta: "Start Pro trial",
    href: "#",
    highlighted: true,
    badge: "Most popular",
    features: [
      "5 workspaces",
      "50 analysis runs/month",
      "10 Deep Sim credits/month",
      "25 tracked entities",
      "Persistent memory (90 days)",
      "Priority support",
      "Export to PDF/markdown",
    ],
  },
  {
    name: "Team",
    subtitle: "$149/month",
    price: "$149",
    period: "/mo",
    description: "Collaborate on decisions with your team",
    cta: "Start Team trial",
    href: "#",
    highlighted: false,
    features: [
      "Unlimited workspaces",
      "200 analysis runs/month",
      "50 Deep Sim credits/month",
      "100 tracked entities",
      "Persistent memory (1 year)",
      "Team collaboration (5 seats)",
      "Shared views & alerts",
      "Executive report templates",
    ],
  },
  {
    name: "Enterprise",
    subtitle: "Custom",
    price: "Custom",
    period: "",
    description: "For organizations with compliance and scale needs",
    cta: "Contact sales",
    href: "mailto:hello@nodebench.ai",
    highlighted: false,
    features: [
      "Everything in Team",
      "SSO / SAML",
      "Private deployment",
      "Custom MCP integrations",
      "Unlimited retention",
      "Dedicated onboarding",
      "SLA",
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
  { label: "Analysis runs", free: "3/mo", pro: "50/mo", team: "200/mo", enterprise: "Unlimited" },
  { label: "Deep Sim credits", free: false, pro: "10/mo", team: "50/mo", enterprise: "Unlimited" },
  { label: "Tracked entities", free: false, pro: "25", team: "100", enterprise: "Unlimited" },
  { label: "Memory retention", free: false, pro: "90 days", team: "1 year", enterprise: "Unlimited" },
  { label: "Workspaces", free: "1", pro: "5", team: "Unlimited", enterprise: "Unlimited" },
  { label: "Seats", free: "1", pro: "1", team: "5", enterprise: "Custom" },
  { label: "Export formats", free: false, pro: "PDF, Markdown", team: "PDF, Markdown", enterprise: "PDF, Markdown, Custom" },
  { label: "Support level", free: "Community", pro: "Priority", team: "Priority", enterprise: "Dedicated + SLA" },
  { label: "Custom connectors", free: false, pro: false, team: false, enterprise: true },
];

const TIER_KEYS = ["free", "pro", "team", "enterprise"] as const;
const TIER_LABELS = ["Free", "Pro", "Team", "Enterprise"] as const;

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */

const FAQ = [
  {
    q: "What do I get from an analysis?",
    a: "Each analysis produces a structured brief with ranked variables, scenario cards, recommended actions, and an evidence drawer \u2014 everything you need to act on a decision with confidence.",
  },
  {
    q: "What is a Deep Sim credit?",
    a: "One Deep Sim credit runs a single multi-agent scenario simulation with 2\u20134 branches. Each branch explores a different future state so you can compare outcomes before committing.",
  },
  {
    q: "What is a tracked entity?",
    a: "A tracked entity is a company, product, founder, or project you monitor over time. NodeBench watches for changes, surfaces new signals, and updates your decision context automatically.",
  },
  {
    q: "Can I connect my own agent?",
    a: "Yes. NodeBench exposes a standard MCP interface. Connect it to Claude Code, Cursor, OpenClaw, or any MCP-compatible client. Your tools, your workflow.",
  },
  {
    q: "What happens when I hit my limit?",
    a: "Analysis runs pause until your next billing cycle. All existing data, memos, and tracked entities are preserved \u2014 nothing is deleted. You can upgrade at any time to resume.",
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
            Start free. Scale when your decisions demand it.
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
