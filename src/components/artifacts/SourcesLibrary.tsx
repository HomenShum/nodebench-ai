// src/components/artifacts/SourcesLibrary.tsx
// Global sources library view - shows all artifacts in footer
// Pinned artifacts first, grouped by provider/kind

import { useMemo, useState } from "react";
import { 
  ExternalLink, 
  Play, 
  FileText, 
  Image as ImageIcon, 
  User, 
  Building2, 
  Globe,
  Pin,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Library,
  Filter,
} from "lucide-react";
import type { ArtifactCard, ArtifactKind, ArtifactProvider } from "../../shared/artifacts";
import { useAllArtifacts, useUnassignedArtifacts } from "../../hooks/useArtifactStore";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SourcesLibraryProps {
  /** Show only unassigned artifacts (default: false - show all) */
  unassignedOnly?: boolean;
  
  /** Maximum items to show initially (default: 12) */
  initialVisible?: number;
  
  /** Collapse by default */
  defaultCollapsed?: boolean;
  
  /** Title override */
  title?: string;
}

type GroupBy = "provider" | "kind" | "none";

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getKindIcon(kind: ArtifactKind) {
  switch (kind) {
    case "video": return <Play className="w-4 h-4" />;
    case "image": return <ImageIcon className="w-4 h-4" />;
    case "sec": return <FileText className="w-4 h-4" />;
    case "person": return <User className="w-4 h-4" />;
    case "company": return <Building2 className="w-4 h-4" />;
    case "document": return <FileText className="w-4 h-4" />;
    default: return <Globe className="w-4 h-4" />;
  }
}

function getProviderColor(provider: ArtifactProvider | undefined): string {
  switch (provider) {
    case "youtube": return "bg-red-50 text-red-600 border-red-200";
    case "sec": return "bg-blue-50 text-blue-600 border-blue-200";
    case "twitter": return "bg-sky-50 text-sky-600 border-sky-200";
    case "linkedin": return "bg-blue-50 text-blue-700 border-blue-200";
    case "crunchbase": return "bg-orange-50 text-orange-600 border-orange-200";
    case "github": return "bg-gray-50 text-gray-800 border-gray-200";
    case "news": return "bg-indigo-50 text-indigo-600 border-indigo-200";
    case "arxiv": return "bg-amber-50 text-amber-700 border-amber-200";
    default: return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

function getProviderLabel(provider: ArtifactProvider | undefined): string {
  switch (provider) {
    case "youtube": return "YouTube";
    case "sec": return "SEC EDGAR";
    case "twitter": return "Twitter/X";
    case "linkedin": return "LinkedIn";
    case "crunchbase": return "Crunchbase";
    case "pitchbook": return "PitchBook";
    case "github": return "GitHub";
    case "arxiv": return "arXiv";
    case "wikipedia": return "Wikipedia";
    case "news": return "News";
    case "reddit": return "Reddit";
    case "web": return "Web";
    case "local": return "Local";
    default: return "Other";
  }
}

function getKindLabel(kind: ArtifactKind): string {
  switch (kind) {
    case "video": return "Videos";
    case "image": return "Images";
    case "sec": return "SEC Filings";
    case "person": return "People";
    case "company": return "Companies";
    case "document": return "Documents";
    case "file": return "Files";
    case "url": return "Web Sources";
    default: return "Other";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCE ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface SourceItemProps {
  artifact: ArtifactCard;
}

function SourceItem({ artifact }: SourceItemProps) {
  const { flags, title, host, kind, provider, snippet, canonicalUrl, thumbnail } = artifact;
  
  return (
    <a
      href={canonicalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        flex items-start gap-3 p-3 rounded-lg border transition-all duration-200
        hover:shadow-md hover:-translate-y-0.5
        ${getProviderColor(provider)}
      `}
    >
      {/* Thumbnail or Icon */}
      <div className="flex-shrink-0 w-12 h-12 rounded bg-white/50 flex items-center justify-center overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="opacity-60">{getKindIcon(kind)}</span>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm line-clamp-1 break-words">
            {title}
          </h4>
          <div className="flex items-center gap-1 flex-shrink-0">
            {flags.isPinned && <Pin className="w-3.5 h-3.5 text-purple-500" />}
            {flags.isCited && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />}
          </div>
        </div>
        
        {snippet && (
          <p className="text-xs opacity-70 line-clamp-1 mt-0.5 break-words overflow-hidden">
            {snippet}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] font-medium opacity-80">
            {getProviderLabel(provider)}
          </span>
          {host && (
            <>
              <span className="text-[10px] opacity-50">•</span>
              <span className="text-[10px] opacity-60 truncate max-w-[150px]">
                {host}
              </span>
            </>
          )}
          <ExternalLink className="w-3 h-3 opacity-40 ml-auto" />
        </div>
      </div>
    </a>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCES LIBRARY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function SourcesLibrary({
  unassignedOnly = false,
  initialVisible = 12,
  defaultCollapsed = false,
  title = "Sources Library",
}: SourcesLibraryProps) {
  const allArtifacts = useAllArtifacts();
  const unassignedArtifacts = useUnassignedArtifacts();
  
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [showAll, setShowAll] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("provider");
  
  // Choose artifacts based on mode
  const artifacts = unassignedOnly ? unassignedArtifacts : allArtifacts;
  
  // Sort: pinned first, then cited, then by discoveredAt
  const sortedArtifacts = useMemo(() => {
    return [...artifacts].sort((a, b) => {
      if (a.flags.isPinned && !b.flags.isPinned) return -1;
      if (!a.flags.isPinned && b.flags.isPinned) return 1;
      if (a.flags.isCited && !b.flags.isCited) return -1;
      if (!a.flags.isCited && b.flags.isCited) return 1;
      return b.discoveredAt - a.discoveredAt;
    });
  }, [artifacts]);
  
  // Group artifacts
  const groupedArtifacts = useMemo(() => {
    if (groupBy === "none") {
      return { all: sortedArtifacts };
    }
    
    const groups: Record<string, ArtifactCard[]> = {};
    for (const artifact of sortedArtifacts) {
      const key = groupBy === "provider" 
        ? (artifact.provider || "web")
        : artifact.kind;
      if (!groups[key]) groups[key] = [];
      groups[key].push(artifact);
    }
    
    // Sort groups by size (largest first)
    const sortedEntries = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    return Object.fromEntries(sortedEntries);
  }, [sortedArtifacts, groupBy]);
  
  // Visible artifacts
  const visibleCount = showAll ? sortedArtifacts.length : initialVisible;
  
  if (artifacts.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-12 border-t-2 border-gray-200 pt-8">
      {/* Header */}
      <div 
        className="flex items-center justify-between mb-4 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Library className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">
              {artifacts.length} source{artifacts.length !== 1 ? 's' : ''} discovered
              {artifacts.filter(a => a.flags.isPinned).length > 0 && (
                <span className="ml-2 text-purple-600">
                  • {artifacts.filter(a => a.flags.isPinned).length} pinned
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Group By Toggle */}
          {!isCollapsed && (
            <div className="flex items-center gap-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-100 border-none rounded px-2 py-1 text-xs text-gray-600 focus:ring-1 focus:ring-purple-300"
              >
                <option value="provider">By Provider</option>
                <option value="kind">By Type</option>
                <option value="none">No Grouping</option>
              </select>
            </div>
          )}
          
          <button className="p-1 hover:bg-gray-100 rounded">
            {isCollapsed ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>
      
      {/* Content */}
      {!isCollapsed && (
        <div className="space-y-6">
          {groupBy === "none" ? (
            // Flat list
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedArtifacts.slice(0, visibleCount).map(artifact => (
                <SourceItem key={artifact.id} artifact={artifact} />
              ))}
            </div>
          ) : (
            // Grouped list
            Object.entries(groupedArtifacts).map(([group, items]) => {
              const label = groupBy === "provider" 
                ? getProviderLabel(group as ArtifactProvider)
                : getKindLabel(group as ArtifactKind);
              
              return (
                <div key={group}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                    {groupBy === "kind" && getKindIcon(group as ArtifactKind)}
                    {label}
                    <span className="text-gray-400">({items.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.slice(0, showAll ? items.length : 4).map(artifact => (
                      <SourceItem key={artifact.id} artifact={artifact} />
                    ))}
                  </div>
                  {!showAll && items.length > 4 && (
                    <button 
                      onClick={() => setShowAll(true)}
                      className="mt-2 text-xs text-purple-600 hover:text-purple-800 font-medium"
                    >
                      +{items.length - 4} more
                    </button>
                  )}
                </div>
              );
            })
          )}
          
          {/* Show All / Collapse */}
          {sortedArtifacts.length > initialVisible && (
            <div className="text-center pt-4">
              <button
                onClick={() => setShowAll(!showAll)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show All {sortedArtifacts.length} Sources
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SourcesLibrary;
