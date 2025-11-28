// src/components/artifacts/MediaRail.tsx
// Per-section artifact rail with cards for different artifact types
// Renders inline with dossier content

import { useMemo } from "react";
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
} from "lucide-react";
import type { ArtifactCard, ArtifactKind, ArtifactProvider } from "../../shared/artifacts";
import { useSectionArtifacts, useArtifactStore } from "../../hooks/useArtifactStore";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface MediaRailProps {
  /** Section ID to show artifacts for */
  sectionId: string;
  
  /** Additional artifacts to display (e.g., unassigned) */
  additionalArtifacts?: ArtifactCard[];
  
  /** Maximum artifacts to show (default: 8) */
  maxVisible?: number;
  
  /** Compact mode (smaller cards) */
  compact?: boolean;
  
  /** Called when artifact is clicked */
  onArtifactClick?: (artifact: ArtifactCard) => void;
}

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
    case "youtube": return "text-red-500";
    case "sec": return "text-blue-600";
    case "twitter": return "text-sky-500";
    case "linkedin": return "text-blue-700";
    case "crunchbase": return "text-orange-500";
    case "github": return "text-gray-800";
    case "news": return "text-emerald-600";
    default: return "text-gray-500";
  }
}

function getProviderLabel(provider: ArtifactProvider | undefined): string {
  switch (provider) {
    case "youtube": return "YouTube";
    case "sec": return "SEC";
    case "twitter": return "Twitter";
    case "linkedin": return "LinkedIn";
    case "crunchbase": return "Crunchbase";
    case "pitchbook": return "PitchBook";
    case "github": return "GitHub";
    case "arxiv": return "arXiv";
    case "wikipedia": return "Wikipedia";
    case "news": return "News";
    case "reddit": return "Reddit";
    default: return "Web";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ARTIFACT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface ArtifactCardItemProps {
  artifact: ArtifactCard;
  compact?: boolean;
  onClick?: (artifact: ArtifactCard) => void;
}

function ArtifactCardItem({ artifact, compact, onClick }: ArtifactCardItemProps) {
  const { flags, thumbnail, title, host, kind, provider, snippet, canonicalUrl } = artifact;
  
  const handleClick = () => {
    if (onClick) {
      onClick(artifact);
    } else {
      window.open(canonicalUrl, "_blank", "noopener,noreferrer");
    }
  };
  
  return (
    <div
      onClick={handleClick}
      className={`
        group relative flex flex-col bg-white border border-gray-200 rounded-lg 
        overflow-hidden cursor-pointer transition-all duration-200
        hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5
        ${compact ? 'w-40' : 'w-52'}
      `}
    >
      {/* Thumbnail or Placeholder */}
      <div className={`relative bg-gray-100 ${compact ? 'h-24' : 'h-32'}`}>
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className={`${getProviderColor(provider)}`}>
              {getKindIcon(kind)}
            </div>
          </div>
        )}
        
        {/* Kind Badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-white text-[10px] font-medium uppercase tracking-wide">
          {kind}
        </div>
        
        {/* Video Play Overlay */}
        {kind === "video" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-5 h-5 text-gray-900 ml-0.5" />
            </div>
          </div>
        )}
        
        {/* Quality Badges */}
        <div className="absolute top-2 right-2 flex gap-1">
          {flags.isPinned && (
            <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
              <Pin className="w-3 h-3 text-white" />
            </div>
          )}
          {flags.isCited && (
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className={`flex-1 ${compact ? 'p-2' : 'p-3'}`}>
        <h4 className={`font-medium text-gray-900 line-clamp-2 ${compact ? 'text-xs' : 'text-sm'}`}>
          {title}
        </h4>
        
        {!compact && snippet && (
          <p className="mt-1 text-xs text-gray-500 line-clamp-2">
            {snippet}
          </p>
        )}
        
        {/* Footer */}
        <div className="mt-2 flex items-center justify-between">
          <span className={`text-[10px] font-medium ${getProviderColor(provider)}`}>
            {getProviderLabel(provider)}
          </span>
          {host && (
            <span className="text-[10px] text-gray-400 truncate max-w-[80px]">
              {host}
            </span>
          )}
        </div>
      </div>
      
      {/* External Link Icon */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MEDIA RAIL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function MediaRail({
  sectionId,
  additionalArtifacts = [],
  maxVisible = 8,
  compact = false,
  onArtifactClick,
}: MediaRailProps) {
  // Get artifacts for this section from store
  const sectionArtifacts = useSectionArtifacts(sectionId);
  
  // Combine section artifacts with additional
  const allArtifacts = useMemo(() => {
    const combined = [...sectionArtifacts, ...additionalArtifacts];
    // Dedupe by ID
    const seen = new Set<string>();
    return combined.filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [sectionArtifacts, additionalArtifacts]);
  
  // Sort: pinned first, then cited, then by discoveredAt
  const sortedArtifacts = useMemo(() => {
    return [...allArtifacts]
      .sort((a, b) => {
        // Pinned first
        if (a.flags.isPinned && !b.flags.isPinned) return -1;
        if (!a.flags.isPinned && b.flags.isPinned) return 1;
        // Then cited
        if (a.flags.isCited && !b.flags.isCited) return -1;
        if (!a.flags.isCited && b.flags.isCited) return 1;
        // Then by discovery time (newest first)
        return b.discoveredAt - a.discoveredAt;
      })
      .slice(0, maxVisible);
  }, [allArtifacts, maxVisible]);
  
  if (sortedArtifacts.length === 0) {
    return null;
  }
  
  return (
    <div className="my-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-gray-200"></div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Sources & Media ({sortedArtifacts.length})
        </span>
        <div className="h-px flex-1 bg-gray-200"></div>
      </div>
      
      {/* Horizontal Scroll Rail */}
      <div className="relative">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {sortedArtifacts.map(artifact => (
            <ArtifactCardItem
              key={artifact.id}
              artifact={artifact}
              compact={compact}
              onClick={onArtifactClick}
            />
          ))}
        </div>
        
        {/* Fade edges */}
        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white pointer-events-none"></div>
      </div>
      
      {/* Show More Link */}
      {allArtifacts.length > maxVisible && (
        <div className="mt-2 text-center">
          <button className="text-xs text-purple-600 hover:text-purple-800 font-medium">
            +{allArtifacts.length - maxVisible} more sources
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INLINE MEDIA RAIL (Simpler version for tight spaces)
// ═══════════════════════════════════════════════════════════════════════════

interface InlineMediaRailProps {
  artifacts: ArtifactCard[];
  maxVisible?: number;
}

export function InlineMediaRail({ artifacts, maxVisible = 4 }: InlineMediaRailProps) {
  const visible = artifacts.slice(0, maxVisible);
  const remaining = artifacts.length - maxVisible;
  
  if (visible.length === 0) return null;
  
  return (
    <div className="flex items-center gap-2 flex-wrap mt-2">
      {visible.map(artifact => (
        <a
          key={artifact.id}
          href={artifact.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700 transition-colors"
        >
          <span className={getProviderColor(artifact.provider)}>
            {getKindIcon(artifact.kind)}
          </span>
          <span className="max-w-[120px] truncate">{artifact.title}</span>
          <ExternalLink className="w-3 h-3 text-gray-400" />
        </a>
      ))}
      {remaining > 0 && (
        <span className="text-xs text-gray-500">+{remaining} more</span>
      )}
    </div>
  );
}

export default MediaRail;
