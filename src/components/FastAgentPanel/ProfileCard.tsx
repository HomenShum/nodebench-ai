// src/components/FastAgentPanel/ProfileCard.tsx
// Read-only profile card component for displaying people/entities
// (Separate from PeopleSelectionCard which is for disambiguation)

import React, { useState } from 'react';
import { User, Briefcase, Building2, MapPin, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PersonProfile {
  name: string;
  profession?: string;
  organization?: string;
  location?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  additionalInfo?: string;
}

interface ProfileCardProps {
  profile: PersonProfile;
  className?: string;
  citationNumber?: number; // For inline citations like [1], [2]
}

/**
 * ProfileCard - Displays a single person/entity profile in a polished, read-only format
 * Used for displaying search results, not for disambiguation/selection
 */
export function ProfileCard({ profile, className, citationNumber }: ProfileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasAdditionalInfo = profile.additionalInfo && profile.additionalInfo.length > 0;

  return (
    <div
      id={citationNumber ? `profile-${citationNumber}` : undefined}
      className={cn(
        "group rounded-lg border border-gray-200 hover:border-gray-300",
        "transition-all duration-200 hover:shadow-md bg-white overflow-hidden scroll-mt-4",
        className
      )}
    >
      <div className="flex gap-3 p-3">
        {/* Profile image or icon */}
        <div className="flex-shrink-0">
          {profile.imageUrl ? (
            <img
              src={profile.imageUrl}
              alt={profile.name}
              className="w-12 h-12 rounded-full object-cover bg-gray-100"
              loading="lazy"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
          )}
        </div>

        {/* Profile info */}
        <div className="flex-1 min-w-0">
          {/* Name and citation */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">
              {profile.name}
            </h3>
            {citationNumber !== undefined && (
              <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                {citationNumber}
              </span>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-1 mb-2">
            {profile.profession && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Briefcase className="h-3 w-3 flex-shrink-0" />
                <span className="line-clamp-1">{profile.profession}</span>
              </div>
            )}
            
            {profile.organization && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="line-clamp-1">{profile.organization}</span>
              </div>
            )}
            
            {profile.location && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="line-clamp-1">{profile.location}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {profile.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">
              {profile.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {profile.url && (
              <a
                href={profile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                View Profile
              </a>
            )}

            {hasAdditionalInfo && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-700"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    More
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable additional info */}
      {hasAdditionalInfo && isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100">
          <p className="text-xs text-gray-600 mt-2">
            {profile.additionalInfo}
          </p>
        </div>
      )}
    </div>
  );
}

interface ProfileGridProps {
  profiles: PersonProfile[];
  title?: string;
  showCitations?: boolean;
  className?: string;
}

/**
 * ProfileGrid - Displays multiple person profiles in a responsive grid
 */
export function ProfileGrid({
  profiles,
  title = "People",
  showCitations = false,
  className
}: ProfileGridProps) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_DISPLAY_COUNT = 4;

  if (profiles.length === 0) return null;

  const displayedProfiles = showAll ? profiles : profiles.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMore = profiles.length > INITIAL_DISPLAY_COUNT;

  return (
    <div className={cn("mb-4", className)}>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-gray-200"></div>
        <h3 className="text-sm font-semibold text-gray-700">
          {title}
          <span className="text-xs font-normal text-gray-500 ml-2">
            ({showAll ? profiles.length : Math.min(profiles.length, INITIAL_DISPLAY_COUNT)}{hasMore && !showAll ? `/${profiles.length}` : ''})
          </span>
        </h3>
        <div className="h-px flex-1 bg-gray-200"></div>
      </div>

      {/* Responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {displayedProfiles.map((profile, idx) => (
          <ProfileCard
            key={idx}
            profile={profile}
            citationNumber={showCitations ? idx + 1 : undefined}
          />
        ))}
      </div>

      {/* Show More/Less button */}
      {hasMore && (
        <div className="flex justify-center mt-3">
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show {profiles.length - INITIAL_DISPLAY_COUNT} More
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

