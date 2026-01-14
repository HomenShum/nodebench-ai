/**
 * FundingBriefView - Display all funding events with filters
 *
 * Public page for viewing the complete funding brief referenced in LinkedIn posts.
 * URL: #funding or /funding-brief
 */

import { useState, useMemo, useCallback } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  DollarSign,
  TrendingUp,
  Building2,
  Calendar,
  ExternalLink,
  Filter,
  ChevronDown,
  Briefcase,
  MapPin,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  FileDown,
  Loader2,
  FolderPlus,
  Check,
  Sparkles,
} from "lucide-react";
import { usePDFGenerator } from "../../../lib/pdf/usePDFGenerator";
import type { FundingDealRow } from "../../../lib/pdf/types";

// Round type display names
const ROUND_TYPE_LABELS: Record<string, string> = {
  "pre-seed": "Pre-Seed",
  seed: "Seed",
  "series-a": "Series A",
  "series-b": "Series B",
  "series-c": "Series C",
  "series-d-plus": "Series D+",
  growth: "Growth",
  debt: "Debt",
  unknown: "Unknown",
};

// Sector category colors
const SECTOR_COLORS: Record<string, { bg: string; text: string }> = {
  healthcare: { bg: "bg-red-100", text: "text-red-700" },
  fintech: { bg: "bg-green-100", text: "text-green-700" },
  ai_ml: { bg: "bg-purple-100", text: "text-purple-700" },
  enterprise: { bg: "bg-blue-100", text: "text-blue-700" },
  consumer: { bg: "bg-orange-100", text: "text-orange-700" },
  deeptech: { bg: "bg-indigo-100", text: "text-indigo-700" },
  climate: { bg: "bg-emerald-100", text: "text-emerald-700" },
  technology: { bg: "bg-gray-100", text: "text-gray-700" },
  other: { bg: "bg-slate-100", text: "text-slate-700" },
};

// Verification status badges
function VerificationBadge({
  status,
}: {
  status: string;
}) {
  const config = {
    verified: {
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
      label: "Verified",
    },
    pending: {
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      label: "Pending",
    },
    unverified: {
      icon: AlertCircle,
      color: "text-gray-400",
      bg: "bg-gray-50",
      label: "Unverified",
    },
  }[status] || {
    icon: AlertCircle,
    color: "text-gray-400",
    bg: "bg-gray-50",
    label: status,
  };

  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.color}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// Individual funding card
function FundingCard({
  event,
}: {
  event: {
    id: string;
    companyName: string;
    roundType: string;
    amountRaw?: string;
    amountUsd?: number;
    leadInvestors?: string[];
    coInvestors?: string[];
    sector?: string;
    location?: string;
    description?: string;
    confidence?: number;
    verificationStatus?: string;
    sourceUrls?: string[];
    sourceNames?: string[];
    announcedAt?: number;
    entityData?: {
      name: string;
      type: string;
      sector?: string;
    } | null;
  };
}) {
  const [expanded, setExpanded] = useState(false);

  const sectorKey = event.sector?.toLowerCase().includes("health")
    ? "healthcare"
    : event.sector?.toLowerCase().includes("fintech")
      ? "fintech"
      : event.sector?.toLowerCase().includes("ai")
        ? "ai_ml"
        : event.sector?.toLowerCase().includes("enterprise")
          ? "enterprise"
          : event.sector?.toLowerCase().includes("consumer")
            ? "consumer"
            : event.sector?.toLowerCase().includes("deep")
              ? "deeptech"
              : event.sector?.toLowerCase().includes("climate")
                ? "climate"
                : "technology";

  const sectorColor = SECTOR_COLORS[sectorKey] || SECTOR_COLORS.other;

  return (
    <div className="border border-[color:var(--border-color)] rounded-lg p-4 bg-[color:var(--bg-primary)] hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-[color:var(--text-primary)] truncate">
              {event.companyName}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              {ROUND_TYPE_LABELS[event.roundType] || event.roundType}
            </span>
            {event.verificationStatus && (
              <VerificationBadge status={event.verificationStatus} />
            )}
          </div>

          {/* Amount */}
          {event.amountRaw && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="font-bold text-green-700 text-lg">
                {event.amountRaw}
              </span>
            </div>
          )}
        </div>

        {/* Confidence Score */}
        {event.confidence !== undefined && (
          <div className="text-right">
            <div className="text-xs text-[color:var(--text-secondary)]">Confidence</div>
            <div
              className={`text-sm font-semibold ${
                event.confidence >= 0.8
                  ? "text-green-600"
                  : event.confidence >= 0.6
                    ? "text-yellow-600"
                    : "text-red-500"
              }`}
            >
              {Math.round(event.confidence * 100)}%
            </div>
          </div>
        )}
      </div>

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-[color:var(--text-secondary)]">
        {event.sector && (
          <span className={`px-2 py-0.5 rounded-full text-xs ${sectorColor.bg} ${sectorColor.text}`}>
            {event.sector}
          </span>
        )}
        {event.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {event.location}
          </span>
        )}
        {event.announcedAt && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(event.announcedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Lead Investors */}
      {event.leadInvestors && event.leadInvestors.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-1.5 text-xs text-[color:var(--text-secondary)] mb-1">
            <Users className="w-3.5 h-3.5" />
            Lead Investors
          </div>
          <div className="flex flex-wrap gap-1.5">
            {event.leadInvestors.map((investor, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-0.5 rounded bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)]"
              >
                {investor}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expandable Details */}
      {(event.description || (event.coInvestors && event.coInvestors.length > 0) || (event.sourceUrls && event.sourceUrls.length > 0)) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-xs text-blue-600 hover:text-blue-700"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          {expanded ? "Hide details" : "Show details"}
        </button>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[color:var(--border-color)] space-y-3">
          {/* Description */}
          {event.description && (
            <p className="text-sm text-[color:var(--text-secondary)]">{event.description}</p>
          )}

          {/* Co-Investors */}
          {event.coInvestors && event.coInvestors.length > 0 && (
            <div>
              <div className="text-xs text-[color:var(--text-secondary)] mb-1">Co-Investors</div>
              <div className="flex flex-wrap gap-1.5">
                {event.coInvestors.map((investor, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600"
                  >
                    {investor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {event.sourceUrls && event.sourceUrls.length > 0 && (
            <div>
              <div className="text-xs text-[color:var(--text-secondary)] mb-1">
                Sources ({event.sourceUrls.length})
              </div>
              <div className="flex flex-col gap-1">
                {event.sourceUrls.slice(0, 3).map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    {event.sourceNames?.[idx] || url}
                  </a>
                ))}
                {event.sourceUrls.length > 3 && (
                  <span className="text-xs text-[color:var(--text-secondary)]">
                    +{event.sourceUrls.length - 3} more sources
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Stats summary card
function StatsSummary({
  stats,
}: {
  stats: {
    total: number;
    totalAmountUsd: number;
    byRoundType: Record<string, number>;
    lookbackDays: number;
  };
}) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000_000) {
      return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    }
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div className="bg-[color:var(--bg-secondary)] rounded-lg p-4">
        <div className="flex items-center gap-2 text-[color:var(--text-secondary)] text-sm mb-1">
          <Building2 className="w-4 h-4" />
          Total Deals
        </div>
        <div className="text-2xl font-bold text-[color:var(--text-primary)]">{stats.total}</div>
        <div className="text-xs text-[color:var(--text-secondary)]">Last {stats.lookbackDays} days</div>
      </div>

      <div className="bg-[color:var(--bg-secondary)] rounded-lg p-4">
        <div className="flex items-center gap-2 text-[color:var(--text-secondary)] text-sm mb-1">
          <DollarSign className="w-4 h-4" />
          Total Raised
        </div>
        <div className="text-2xl font-bold text-green-600">
          {formatCurrency(stats.totalAmountUsd)}
        </div>
        <div className="text-xs text-[color:var(--text-secondary)]">Disclosed amounts</div>
      </div>

      <div className="bg-[color:var(--bg-secondary)] rounded-lg p-4">
        <div className="flex items-center gap-2 text-[color:var(--text-secondary)] text-sm mb-1">
          <TrendingUp className="w-4 h-4" />
          Seed/Pre-Seed
        </div>
        <div className="text-2xl font-bold text-[color:var(--text-primary)]">
          {(stats.byRoundType["seed"] || 0) + (stats.byRoundType["pre-seed"] || 0)}
        </div>
        <div className="text-xs text-[color:var(--text-secondary)]">Early stage deals</div>
      </div>

      <div className="bg-[color:var(--bg-secondary)] rounded-lg p-4">
        <div className="flex items-center gap-2 text-[color:var(--text-secondary)] text-sm mb-1">
          <Briefcase className="w-4 h-4" />
          Series A+
        </div>
        <div className="text-2xl font-bold text-[color:var(--text-primary)]">
          {(stats.byRoundType["series-a"] || 0) +
            (stats.byRoundType["series-b"] || 0) +
            (stats.byRoundType["series-c"] || 0) +
            (stats.byRoundType["series-d-plus"] || 0)}
        </div>
        <div className="text-xs text-[color:var(--text-secondary)]">Later stage deals</div>
      </div>
    </div>
  );
}

export function FundingBriefView() {
  const [lookbackDays, setLookbackDays] = useState(730); // Default to ~2 years to include Q4 2025 data
  const [roundTypeFilter, setRoundTypeFilter] = useState<string>("");
  const [sectorFilter, setSectorFilter] = useState<string>("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // PDF Generator hook
  const { isGenerating, isSaving, error: pdfError, generateFromFundingEvents, generateAndSave, clearError } = usePDFGenerator();

  // AI Insights generator action
  const generateInsights = useAction(api.domains.documents.pdfInsights.generatePDFInsights);

  // Fetch funding data
  const data = useQuery(api.domains.enrichment.fundingQueries.getAllFundingForBrief, {
    lookbackDays,
    limit: 100,
    roundTypeFilter: roundTypeFilter || undefined,
    sectorFilter: sectorFilter || undefined,
  });

  // Transform API events to FundingDealRow format for PDF generation
  const transformToFundingDealRows = useCallback((events: typeof data.events): FundingDealRow[] => {
    if (!events) return [];
    return events.map((event) => ({
      companyName: event.companyName,
      roundType: event.roundType,
      amountRaw: event.amountRaw || "",
      amountUsd: event.amountUsd,
      leadInvestors: event.leadInvestors || [],
      sector: event.sector,
      location: event.location,
      announcedAt: event.announcedAt || Date.now(),
      confidence: event.confidence || 0.5,
      verificationStatus: event.verificationStatus || "unverified",
    }));
  }, []);

  // Handle PDF export (download only) - with AI insights
  const handleExportPDF = useCallback(async () => {
    if (!data?.events) return;

    const fundingRows = transformToFundingDealRows(data.events);
    const quarterLabel = lookbackDays <= 90
      ? `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`
      : `${lookbackDays} Day Summary`;

    try {
      setIsGeneratingInsights(true);

      // Generate AI insights using FREE-FIRST model strategy
      const insightsResult = await generateInsights({
        deals: fundingRows.map((d) => ({
          companyName: d.companyName,
          roundType: d.roundType,
          amountRaw: d.amountRaw,
          amountUsd: d.amountUsd,
          leadInvestors: d.leadInvestors,
          sector: d.sector,
          location: d.location,
          announcedAt: d.announcedAt,
        })),
        quarterLabel,
      });

      setIsGeneratingInsights(false);

      // Use AI insights if successful, otherwise use placeholder
      const insights = insightsResult.success && insightsResult.insights
        ? insightsResult.insights
        : undefined;

      if (insightsResult.success) {
        console.log(`[FundingBrief] AI insights generated using ${insightsResult.modelUsed} (free=${insightsResult.isFree})`);
      }

      await generateFromFundingEvents(fundingRows, quarterLabel, insights, true);
    } catch (err) {
      setIsGeneratingInsights(false);
      console.error("PDF generation failed:", err);
    }
  }, [data?.events, lookbackDays, transformToFundingDealRows, generateFromFundingEvents, generateInsights]);

  // Handle Save to Documents (generates and saves to Documents Hub) - with AI insights
  const handleSaveToDocuments = useCallback(async () => {
    if (!data?.events) return;

    const fundingRows = transformToFundingDealRows(data.events);
    const quarterLabel = lookbackDays <= 90
      ? `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`
      : `${lookbackDays} Day Summary`;

    try {
      setIsGeneratingInsights(true);

      // Generate AI insights using FREE-FIRST model strategy
      const insightsResult = await generateInsights({
        deals: fundingRows.map((d) => ({
          companyName: d.companyName,
          roundType: d.roundType,
          amountRaw: d.amountRaw,
          amountUsd: d.amountUsd,
          leadInvestors: d.leadInvestors,
          sector: d.sector,
          location: d.location,
          announcedAt: d.announcedAt,
        })),
        quarterLabel,
      });

      setIsGeneratingInsights(false);

      const insights = insightsResult.success && insightsResult.insights
        ? insightsResult.insights
        : undefined;

      await generateAndSave(fundingRows, quarterLabel, insights, {
        tags: ["funding-brief", "ai-insights"],
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setIsGeneratingInsights(false);
      console.error("Save to documents failed:", err);
    }
  }, [data?.events, lookbackDays, transformToFundingDealRows, generateAndSave, generateInsights]);

  // Sorted events by amount (highest first)
  const sortedEvents = useMemo(() => {
    if (!data?.events) return [];
    return [...data.events].sort((a, b) => (b.amountUsd || 0) - (a.amountUsd || 0));
  }, [data?.events]);

  // Get unique round types for filter dropdown
  const roundTypes = useMemo(() => {
    if (!data?.stats?.byRoundType) return [];
    return Object.keys(data.stats.byRoundType).sort();
  }, [data?.stats?.byRoundType]);

  return (
    <div className="h-full w-full overflow-auto bg-[color:var(--bg-secondary)]">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--text-primary)] mb-1">
              Startup Funding Brief
            </h1>
            <p className="text-[color:var(--text-secondary)]">
              Real-time funding intelligence from verified sources
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Save to Documents Button */}
            <button
              onClick={handleSaveToDocuments}
              disabled={isGenerating || isSaving || isGeneratingInsights || !data?.events?.length}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isGeneratingInsights && !isGenerating && !isSaving ? (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Analyzing...
                </>
              ) : isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved!
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4" />
                  Save to Documents
                </>
              )}
            </button>

            {/* PDF Export Button */}
            <button
              onClick={handleExportPDF}
              disabled={isGenerating || isSaving || isGeneratingInsights || !data?.events?.length}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isGeneratingInsights ? (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  AI Analyzing...
                </>
              ) : isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* PDF Error Toast */}
        {pdfError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-red-700">
              PDF generation failed: {pdfError.message}
            </span>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700 text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-[color:var(--bg-primary)] rounded-lg border border-[color:var(--border-color)]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[color:var(--text-secondary)]" />
            <span className="text-sm font-medium text-[color:var(--text-primary)]">Filters:</span>
          </div>

          <select
            value={lookbackDays}
            onChange={(e) => setLookbackDays(Number(e.target.value))}
            className="text-sm border border-[color:var(--border-color)] rounded-md px-3 py-1.5 bg-[color:var(--bg-primary)] text-[color:var(--text-primary)]"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last year</option>
            <option value={730}>All Time</option>
          </select>

          <select
            value={roundTypeFilter}
            onChange={(e) => setRoundTypeFilter(e.target.value)}
            className="text-sm border border-[color:var(--border-color)] rounded-md px-3 py-1.5 bg-[color:var(--bg-primary)] text-[color:var(--text-primary)]"
          >
            <option value="">All Rounds</option>
            {roundTypes.map((rt) => (
              <option key={rt} value={rt}>
                {ROUND_TYPE_LABELS[rt] || rt}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Filter by sector..."
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="text-sm border border-[color:var(--border-color)] rounded-md px-3 py-1.5 bg-[color:var(--bg-primary)] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-secondary)]"
          />
        </div>

        {/* Stats Summary */}
        {data?.stats && <StatsSummary stats={data.stats} />}

        {/* Loading State */}
        {!data && (
          <div className="text-center py-12">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {data && sortedEvents.length === 0 && (
          <div className="text-center py-12 bg-[color:var(--bg-primary)] rounded-lg border border-[color:var(--border-color)]">
            <Building2 className="w-12 h-12 mx-auto text-[color:var(--text-secondary)] mb-3" />
            <h3 className="text-lg font-medium text-[color:var(--text-primary)] mb-1">
              No funding events found
            </h3>
            <p className="text-sm text-[color:var(--text-secondary)]">
              Try adjusting your filters or lookback period
            </p>
          </div>
        )}

        {/* Funding Cards Grid */}
        {sortedEvents.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedEvents.map((event) => (
              <FundingCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-[color:var(--text-secondary)]">
          <p>
            Data sourced from verified news outlets and official announcements.
          </p>
          <p className="mt-1">
            Updated continuously. Follow us on LinkedIn for daily briefs.
          </p>
        </div>
      </div>
    </div>
  );
}
