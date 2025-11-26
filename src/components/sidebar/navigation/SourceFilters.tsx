/**
 * Source Category Filters Component
 * 
 * @deprecated This component has been removed as part of the dashboard cleanup.
 * Source filtering is now done via individual source toggles in the sidebar.
 * This file is kept for backwards compatibility but renders nothing.
 */

interface SourceFiltersProps {
    activeSources: string[];
    onToggleCategory: (category: string) => void;
}

export function SourceFilters(_props: SourceFiltersProps) {
    // Removed: Source category buttons are redundant with individual source toggles
    return null;
}
