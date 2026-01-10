/**
 * EntityProfilePage - Landing page for entity hyperlinks from ntfy/digest
 *
 * Route: /entity/:entityName (via #entity/EntityName hash)
 *
 * Features:
 * - Displays full entity context from entityContexts
 * - Shows deep information: funding, people, news, competitors
 * - Falls back to basic info if no enrichment exists
 * - Triggers enrichment job if entity is unknown
 * - Links to dossier if one exists
 */
"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Building2,
  User,
  Package,
  Cpu,
  Hash,
  Globe,
  Calendar,
  TrendingUp,
  FileText,
  DollarSign,
  ShieldCheck,
  BookOpen,
  ExternalLink,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Users,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Link as LinkIcon,
  Clock,
  Award,
  Target,
  Newspaper,
  ChevronDown,
  ChevronUp,
  Banknote,
  AlertTriangle,
  CheckCircle,
  Circle,
} from "lucide-react";

interface EntityProfilePageProps {
  entityName: string;
  onBack?: () => void;
}

type EntityType =
  | "company"
  | "person"
  | "product"
  | "technology"
  | "topic"
  | "region"
  | "event"
  | "metric"
  | "document"
  | "fda_approval"
  | "funding_event"
  | "research_paper";

const getEntityIcon = (type: EntityType) => {
  switch (type) {
    case "company":
      return Building2;
    case "person":
      return User;
    case "product":
      return Package;
    case "technology":
      return Cpu;
    case "topic":
      return Hash;
    case "region":
      return Globe;
    case "event":
      return Calendar;
    case "metric":
      return TrendingUp;
    case "document":
      return FileText;
    case "fda_approval":
      return ShieldCheck;
    case "funding_event":
      return DollarSign;
    case "research_paper":
      return BookOpen;
    default:
      return Hash;
  }
};

const getEntityColors = (type: EntityType) => {
  switch (type) {
    case "company":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        icon: "text-emerald-500",
        accent: "emerald",
      };
    case "person":
      return {
        bg: "bg-indigo-50",
        text: "text-indigo-700",
        border: "border-indigo-200",
        icon: "text-indigo-500",
        accent: "indigo",
      };
    case "funding_event":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        icon: "text-amber-500",
        accent: "amber",
      };
    case "fda_approval":
      return {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
        icon: "text-green-500",
        accent: "green",
      };
    case "research_paper":
      return {
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-200",
        icon: "text-purple-500",
        accent: "purple",
      };
    default:
      return {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
        icon: "text-gray-500",
        accent: "gray",
      };
  }
};

// Collapsible section component
const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}> = ({ title, icon, defaultOpen = true, children, badge }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-stone-400">{icon}</span>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
            {title}
          </h3>
          {badge && (
            <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-[9px] font-bold rounded">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-stone-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone-400" />
        )}
      </button>
      {isOpen && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
};

// Stat card component
const StatCard: React.FC<{
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
}> = ({ label, value, subValue, icon }) => (
  <div className="rounded-lg border border-stone-100 bg-[#faf9f6] p-4">
    <div className="flex items-center gap-2 mb-1">
      {icon && <span className="text-stone-400">{icon}</span>}
      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
        {label}
      </span>
    </div>
    <div className="text-xl font-serif font-semibold text-gray-900">{value}</div>
    {subValue && <div className="text-xs text-stone-500 mt-1">{subValue}</div>}
  </div>
);

export const EntityProfilePage: React.FC<EntityProfilePageProps> = ({
  entityName,
  onBack,
}) => {
  // Fetch adaptive profile (LLM-enriched with timeline, relationships, etc.)
  const adaptiveProfile = useQuery(
    api.domains.knowledge.adaptiveEntityQueries.getAdaptiveProfile,
    { entityName }
  );

  // Fetch entity context from the database - try company first
  const companyContext = useQuery(
    api.domains.knowledge.entityContexts.getEntityContext,
    { entityName, entityType: "company" }
  );

  // If not found as company, try person
  const personContext = useQuery(
    api.domains.knowledge.entityContexts.getEntityContext,
    companyContext === null ? { entityName, entityType: "person" } : "skip"
  );

  // Use whichever one we found
  const entityContext = companyContext ?? personContext;

  // Determine entity type from context or heuristics
  const entityType: EntityType = useMemo(() => {
    if (entityContext?.entityType) {
      return entityContext.entityType as EntityType;
    }
    const name = entityName.toLowerCase();
    if (name.includes("fda") || name.includes("approval")) return "fda_approval";
    if (name.includes("series") || name.includes("funding") || name.includes("raised"))
      return "funding_event";
    if (name.includes("paper") || name.includes("arxiv") || name.includes("research"))
      return "research_paper";
    return "company";
  }, [entityName, entityContext?.entityType]);

  const Icon = getEntityIcon(entityType);
  const colors = getEntityColors(entityType);

  // Extract nested data
  const crm = entityContext?.crmFields;
  const funding = entityContext?.funding;
  const people = entityContext?.people;
  const freshness = entityContext?.freshness;
  const recentNews = entityContext?.recentNewsItems;
  const personaHooks = entityContext?.personaHooks;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.hash = "";
    }
  };

  const handleViewDossier = (dossierId: string) => {
    window.location.href = `/documents/${dossierId}`;
  };

  const isLoading =
    companyContext === undefined ||
    (companyContext === null && personContext === undefined);

  // Format funding amount
  const formatFundingAmount = (amount: any): string => {
    if (!amount) return "Undisclosed";
    if (typeof amount === "string") return amount;
    if (typeof amount === "object" && amount.amount) {
      return `$${amount.amount}${amount.unit || "M"}`;
    }
    return `$${amount}`;
  };

  // Calculate data freshness
  const getFreshnessLabel = () => {
    if (!entityContext?.researchedAt) return null;
    const age = Date.now() - entityContext.researchedAt;
    const days = Math.floor(age / (1000 * 60 * 60 * 24));
    if (days === 0) return { label: "Today", color: "text-green-600" };
    if (days === 1) return { label: "Yesterday", color: "text-green-600" };
    if (days < 7) return { label: `${days} days ago`, color: "text-yellow-600" };
    return { label: `${days} days ago`, color: "text-red-600" };
  };

  const freshnessInfo = getFreshnessLabel();

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                Entity Profile
              </p>
              <h1 className="text-xl font-serif font-bold text-gray-900">
                {decodeURIComponent(entityName)}
              </h1>
            </div>
          </div>
          {freshnessInfo && (
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span className={freshnessInfo.color}>
                Updated {freshnessInfo.label}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="bg-white rounded-lg border border-stone-200 p-8">
            <div className="flex items-center gap-4">
              <div className="animate-spin">
                <RefreshCw className="w-6 h-6 text-stone-400" />
              </div>
              <p className="text-stone-500">Loading entity information...</p>
            </div>
          </div>
        ) : entityContext ? (
          <div className="space-y-6">
            {/* Hero Card */}
            <div className={`bg-white rounded-lg border ${colors.border} p-8`}>
              <div className="flex items-start gap-6">
                <div
                  className={`w-20 h-20 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`w-10 h-10 ${colors.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h2 className="text-3xl font-serif font-bold text-gray-900">
                      {decodeURIComponent(entityName)}
                    </h2>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}
                    >
                      {entityType.replace("_", " ")}
                    </span>
                    {crm?.dataQuality && (
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          crm.dataQuality === "verified"
                            ? "bg-green-100 text-green-700"
                            : crm.dataQuality === "partial"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {crm.dataQuality}
                      </span>
                    )}
                  </div>

                  {entityContext.summary ? (
                    <p className="text-gray-600 leading-relaxed text-lg">
                      {entityContext.summary}
                    </p>
                  ) : (
                    <p className="text-stone-400 italic">
                      No summary available yet. Enrichment may be in progress.
                    </p>
                  )}

                  {/* Quick contact info */}
                  {(crm?.website || crm?.hqLocation) && (
                    <div className="flex flex-wrap gap-4 mt-4 text-sm text-stone-600">
                      {crm?.website && (
                        <a
                          href={crm.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors"
                        >
                          <LinkIcon className="w-4 h-4" />
                          {crm.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                      {crm?.hqLocation && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          {crm.hqLocation}
                        </span>
                      )}
                      {crm?.foundingYear && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          Founded {crm.foundingYear}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats Row */}
            {(funding || crm?.totalFunding) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Funding Stage"
                  value={funding?.stage || crm?.fundingStage || "Unknown"}
                  icon={<TrendingUp className="w-4 h-4" />}
                />
                <StatCard
                  label="Total Raised"
                  value={formatFundingAmount(funding?.totalRaised || crm?.totalFunding)}
                  subValue={funding?.latestRound?.date}
                  icon={<Banknote className="w-4 h-4" />}
                />
                {crm?.industry && (
                  <StatCard
                    label="Industry"
                    value={crm.industry}
                    icon={<Building2 className="w-4 h-4" />}
                  />
                )}
                {crm?.companyType && (
                  <StatCard
                    label="Company Type"
                    value={crm.companyType}
                    icon={<Briefcase className="w-4 h-4" />}
                  />
                )}
              </div>
            )}

            {/* Key Facts */}
            {entityContext.keyFacts && entityContext.keyFacts.length > 0 && (
              <CollapsibleSection
                title="Key Facts"
                icon={<Target className="w-4 h-4" />}
                badge={`${entityContext.keyFacts.length} facts`}
              >
                <ul className="space-y-3">
                  {entityContext.keyFacts.map((fact: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className={`mt-0.5 w-4 h-4 flex-shrink-0 ${colors.icon}`} />
                      <span className="text-gray-700">{fact}</span>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}

            {/* Adaptive Profile: Executive Summary */}
            {adaptiveProfile?.executiveSummary && (
              <CollapsibleSection
                title="Executive Summary"
                icon={<Sparkles className="w-4 h-4" />}
                badge="AI Enriched"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-stone-50 rounded-lg">
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                        Known For
                      </p>
                      <p className="text-gray-700">{adaptiveProfile.executiveSummary.whatTheyreKnownFor}</p>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-lg">
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                        Current Focus
                      </p>
                      <p className="text-gray-700">{adaptiveProfile.executiveSummary.currentFocus}</p>
                    </div>
                  </div>
                  {adaptiveProfile.executiveSummary.keyInsight && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2">
                        Key Insight
                      </p>
                      <p className="text-amber-900 leading-relaxed">
                        {adaptiveProfile.executiveSummary.keyInsight}
                      </p>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Adaptive Profile: Timeline */}
            {adaptiveProfile?.timeline && adaptiveProfile.timeline.length > 0 && (
              <CollapsibleSection
                title="Timeline"
                icon={<Clock className="w-4 h-4" />}
                badge={`${adaptiveProfile.timeline.length} events`}
              >
                <div className="relative pl-4 border-l-2 border-stone-200 space-y-4">
                  {adaptiveProfile.timeline.map((event: any, idx: number) => (
                    <div key={event.id || idx} className="relative">
                      <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-white border-2 border-stone-300" />
                      <div className="pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-stone-500">{event.date}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            event.significance === "high"
                              ? "bg-emerald-100 text-emerald-700"
                              : event.significance === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {event.category}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900">{event.title}</p>
                        {event.description && (
                          <p className="text-sm text-stone-600 mt-1">{event.description}</p>
                        )}
                        {event.relatedEntities && event.relatedEntities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {event.relatedEntities.map((e: any, eIdx: number) => (
                              <span key={eIdx} className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded">
                                {e.name} ({e.role})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Adaptive Profile: Relationships */}
            {adaptiveProfile?.relationships && adaptiveProfile.relationships.length > 0 && (
              <CollapsibleSection
                title="Network & Relationships"
                icon={<Users className="w-4 h-4" />}
                badge={`${adaptiveProfile.relationships.length} connections`}
              >
                <div className="space-y-4">
                  {/* Circle of Influence */}
                  {adaptiveProfile.circleOfInfluence && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="p-4 bg-emerald-50 rounded-lg">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2">
                          Inner Circle
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(adaptiveProfile.circleOfInfluence.tier1 || []).slice(0, 5).map((name: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-2">
                          Extended Network
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(adaptiveProfile.circleOfInfluence.tier2 || []).slice(0, 5).map((name: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 bg-stone-50 rounded-lg">
                        <p className="text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-2">
                          Broader Ecosystem
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(adaptiveProfile.circleOfInfluence.tier3 || []).slice(0, 5).map((name: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Relationships List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {adaptiveProfile.relationships.slice(0, 8).map((rel: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-lg border border-stone-100 bg-[#faf9f6]"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          rel.strength === "strong"
                            ? "bg-emerald-100"
                            : rel.strength === "moderate"
                            ? "bg-blue-100"
                            : "bg-stone-100"
                        }`}>
                          <Users className={`w-5 h-5 ${
                            rel.strength === "strong"
                              ? "text-emerald-500"
                              : rel.strength === "moderate"
                              ? "text-blue-500"
                              : "text-stone-500"
                          }`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{rel.entityName}</p>
                          <p className="text-xs text-stone-500">
                            {rel.relationshipType} ({rel.entityType})
                          </p>
                          {rel.context && (
                            <p className="text-xs text-stone-600 mt-1 line-clamp-2">{rel.context}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* Adaptive Profile: Dynamic Sections */}
            {adaptiveProfile?.sections && adaptiveProfile.sections.length > 0 && (
              <>
                {adaptiveProfile.sections.map((section: any) => (
                  <CollapsibleSection
                    key={section.id}
                    title={section.title}
                    icon={<Sparkles className="w-4 h-4" />}
                    defaultOpen={section.priority <= 2}
                  >
                    <div className="text-gray-700">
                      {section.content?.type === "narrative" && section.content.data?.text && (
                        <p className="leading-relaxed">{section.content.data.text}</p>
                      )}
                      {section.content?.type === "list" && section.content.data?.items && (
                        <ul className="space-y-2">
                          {section.content.data.items.map((item: any, idx: number) => (
                            <li key={idx} className="flex items-start gap-3">
                              <Circle className="mt-1.5 w-2 h-2 text-stone-400 fill-current flex-shrink-0" />
                              <div>
                                <p className="font-medium">{item.title}</p>
                                {item.description && (
                                  <p className="text-sm text-stone-600">{item.description}</p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      {section.content?.keyTakeaway && (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-sm text-amber-900">{section.content.keyTakeaway}</p>
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>
                ))}
              </>
            )}

            {/* Funding Details */}
            {funding && (
              <CollapsibleSection
                title="Funding Details"
                icon={<DollarSign className="w-4 h-4" />}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {funding.stage && (
                      <StatCard label="Stage" value={funding.stage} />
                    )}
                    {funding.totalRaised && (
                      <StatCard
                        label="Total Raised"
                        value={formatFundingAmount(funding.totalRaised)}
                      />
                    )}
                    {funding.latestRound && (
                      <StatCard
                        label="Latest Round"
                        value={formatFundingAmount(funding.latestRound.amount)}
                        subValue={funding.latestRound.date}
                      />
                    )}
                  </div>

                  {/* Investors */}
                  {(funding.investors || crm?.investors) && (
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                        Investors
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(funding.investors || crm?.investors || []).map(
                          (investor: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 bg-stone-100 text-stone-700 text-sm rounded-full"
                            >
                              {investor}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Banker Takeaway */}
                  {funding.bankerTakeaway && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2">
                        Banker Takeaway
                      </p>
                      <p className="text-amber-900 leading-relaxed">
                        {funding.bankerTakeaway}
                      </p>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Key People */}
            {(people || crm?.keyPeople) && (
              <CollapsibleSection
                title="Key People"
                icon={<Users className="w-4 h-4" />}
                badge={`${(people?.length || crm?.keyPeople?.length || 0)} people`}
              >
                <div className="space-y-4">
                  {/* Founders */}
                  {crm?.founders && crm.founders.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                        Founders
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {crm.founders.map((founder: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm rounded-full font-medium"
                          >
                            {founder}
                          </span>
                        ))}
                      </div>
                      {crm.foundersBackground && (
                        <p className="mt-2 text-sm text-stone-600">
                          {crm.foundersBackground}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Key People List */}
                  {(crm?.keyPeople || people) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(crm?.keyPeople || people || []).map(
                        (person: { name: string; title: string }, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 rounded-lg border border-stone-100 bg-[#faf9f6]"
                          >
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <User className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{person.name}</p>
                              <p className="text-xs text-stone-500">{person.title}</p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Competitors */}
            {crm?.competitors && crm.competitors.length > 0 && (
              <CollapsibleSection
                title="Competitive Landscape"
                icon={<Target className="w-4 h-4" />}
                defaultOpen={false}
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {crm.competitors.map((competitor: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-red-50 text-red-700 text-sm rounded-full"
                      >
                        {competitor}
                      </span>
                    ))}
                  </div>
                  {crm.competitorAnalysis && (
                    <p className="text-sm text-stone-600 leading-relaxed">
                      {crm.competitorAnalysis}
                    </p>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* News Timeline */}
            {(recentNews || crm?.newsTimeline) && (
              <CollapsibleSection
                title="Recent News"
                icon={<Newspaper className="w-4 h-4" />}
                badge={`${(recentNews?.length || crm?.newsTimeline?.length || 0)} items`}
                defaultOpen={false}
              >
                <div className="space-y-3">
                  {(recentNews || crm?.newsTimeline || []).map(
                    (
                      item: { date?: string; headline: string; source?: string; title?: string },
                      idx: number
                    ) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-lg border border-stone-100 hover:bg-stone-50 transition-colors"
                      >
                        <div className="mt-1">
                          <Circle className="w-2 h-2 text-stone-300 fill-current" />
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-900">{item.headline || item.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
                            {item.date && <span>{item.date}</span>}
                            {item.source && (
                              <>
                                <span>•</span>
                                <span>{item.source}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* FDA Approval Status (if applicable) */}
            {crm?.fdaApprovalStatus && (
              <CollapsibleSection
                title="FDA Status"
                icon={<ShieldCheck className="w-4 h-4" />}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                        crm.fdaApprovalStatus.toLowerCase().includes("approved")
                          ? "bg-green-100 text-green-700"
                          : crm.fdaApprovalStatus.toLowerCase().includes("pending")
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {crm.fdaApprovalStatus}
                    </span>
                  </div>
                  {crm.fdaTimeline && (
                    <p className="text-sm text-stone-600">{crm.fdaTimeline}</p>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Persona Hooks (for advanced users) */}
            {personaHooks && Object.keys(personaHooks).length > 0 && (
              <CollapsibleSection
                title="Persona Insights"
                icon={<Briefcase className="w-4 h-4" />}
                defaultOpen={false}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(personaHooks).map(([persona, hook]: [string, any]) => (
                    <div
                      key={persona}
                      className="p-3 rounded-lg border border-stone-100 bg-[#faf9f6]"
                    >
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                        {persona.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm text-gray-700">{hook}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Sources */}
            {entityContext.sources && entityContext.sources.length > 0 && (
              <CollapsibleSection
                title="Sources"
                icon={<ExternalLink className="w-4 h-4" />}
                badge={`${entityContext.sources.length} sources`}
                defaultOpen={false}
              >
                <div className="space-y-2">
                  {entityContext.sources.map((source: any, idx: number) => (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 rounded-lg border border-stone-100 bg-[#faf9f6] hover:bg-white transition-colors group"
                    >
                      <ExternalLink className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0 group-hover:text-emerald-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {source.name}
                        </p>
                        {source.snippet && (
                          <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                            {source.snippet}
                          </p>
                        )}
                      </div>
                      {source.credibility && (
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase flex-shrink-0 ${
                            source.credibility === "high"
                              ? "bg-green-100 text-green-700"
                              : source.credibility === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {source.credibility}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4">
              {entityContext.dossierId ? (
                <button
                  type="button"
                  onClick={() => handleViewDossier(entityContext.dossierId)}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-900 text-white rounded-lg font-semibold hover:bg-emerald-800 transition-colors"
                >
                  <FileText className="w-5 h-5" />
                  View Full Dossier
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("entity:createDossier", {
                        detail: {
                          entity: {
                            name: entityName,
                            type: entityType,
                          },
                        },
                      })
                    );
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  Create Dossier
                </button>
              )}

              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-stone-200 text-stone-700 rounded-lg font-semibold hover:bg-stone-50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Digest
              </button>
            </div>
          </div>
        ) : (
          /* No Data State */
          <div className="bg-white rounded-lg border border-stone-200 p-12 text-center">
            <Sparkles className="w-16 h-16 text-stone-300 mx-auto mb-6" />
            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3">
              Entity Not Yet Enriched
            </h3>
            <p className="text-stone-500 mb-8 max-w-md mx-auto">
              We don't have detailed information about "{decodeURIComponent(entityName)}" yet.
              Create a dossier to start building intelligence on this entity.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("entity:createDossier", {
                      detail: {
                        entity: {
                          name: entityName,
                          type: entityType,
                        },
                      },
                    })
                  );
                }}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                Create Dossier
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-stone-200 text-stone-700 rounded-lg font-semibold hover:bg-stone-50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Digest
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EntityProfilePage;
