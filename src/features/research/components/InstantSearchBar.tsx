/**
 * InstantSearchBar.tsx
 * Search-as-you-type component for Welcome Landing
 * 
 * Features:
 * - Instant results from cached dossiers as user types
 * - Debounced search to reduce API calls
 * - Click existing result → navigate to document
 * - Press Enter → start fresh research with agent
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Search, ArrowRight, FileText, Sparkles, Clock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface InstantSearchBarProps {
  onStartNewResearch: (query: string, options?: { mode?: 'quick' | 'deep' }) => void;
  defaultValue?: string;
  mode?: 'quick' | 'deep';
  autoFocus?: boolean;
}

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function InstantSearchBar({
  onStartNewResearch,
  defaultValue = '',
  mode = 'quick',
  autoFocus = true,
}: InstantSearchBarProps) {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState(defaultValue);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const debouncedValue = useDebounce(inputValue, 300);

  // Instant Search Query
  const results = useQuery(
    api.domains.documents.search.instantSearch,
    { query: debouncedValue, limit: 5 }
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const researchMode = e.metaKey || e.ctrlKey ? 'deep' : mode;
      onStartNewResearch(inputValue, { mode: researchMode });
      setShowResults(false);
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  }, [inputValue, mode, onStartNewResearch]);

  const handleResultClick = useCallback((docId: string) => {
    setShowResults(false);
    navigate(`/documents/${docId}`);
  }, [navigate]);

  const handleStartFresh = useCallback(() => {
    setShowResults(false);
    onStartNewResearch(inputValue, { mode });
  }, [inputValue, mode, onStartNewResearch]);

  const hasResults = results && results.length > 0;
  const showDropdown = showResults && hasResults && inputValue.length >= 1;

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto z-50">
      {/* Glow effect behind */}
      <div className="absolute -inset-3 bg-gradient-to-r from-gray-900/10 via-gray-600/10 to-gray-900/10 rounded-[2rem] blur-2xl opacity-40 group-hover:opacity-60 transition duration-1000" />

      {/* Main Input Container */}
      <div className={cn(
        "relative flex items-center bg-white shadow-xl transition-all duration-200 border border-gray-200",
        showDropdown ? "rounded-t-xl rounded-b-none border-b-transparent" : "rounded-xl"
      )}>
        <div className="absolute left-4 text-gray-400 pointer-events-none">
          <Search className="w-5 h-5" />
        </div>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowResults(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowResults(true)}
          className="w-full h-14 bg-transparent text-base text-gray-900 placeholder:text-gray-400 pl-12 pr-14 outline-none border-none"
          placeholder="Search companies, people, or research topics..."
          autoFocus={autoFocus}
        />

        <button
          type="button"
          onClick={handleStartFresh}
          className="absolute right-2 p-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
          title="Start research (Enter for Quick, Cmd/Ctrl+Enter for Deep)"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Instant Results Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 border-t-0 rounded-b-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/80 flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            Instant Knowledge (Cached)
          </div>

          <div className="max-h-80 overflow-y-auto">
            {results?.map((doc) => (
              <ResultItem
                key={doc._id}
                doc={doc}
                onClick={() => handleResultClick(doc._id)}
              />
            ))}
          </div>

          {/* Footer: Start Fresh Research */}
          {inputValue.trim() && (
            <button
              type="button"
              onClick={handleStartFresh}
              className="w-full p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center justify-center gap-2 text-sm font-medium text-gray-600 border-t border-gray-100 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Start fresh research on "{inputValue}"</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ResultItem Component
// ═══════════════════════════════════════════════════════════════════════════

interface SearchResult {
  _id: string;
  title: string;
  documentType?: string;
  snippet: string;
  matchType: 'recent' | 'search';
  _creationTime: number;
  updatedAt: number;
}

function ResultItem({ doc, onClick }: { doc: SearchResult; onClick: () => void }) {
  const timeAgo = formatTimeAgo(doc.updatedAt);
  const isDossier = doc.documentType === 'dossier';

  return (
    <div
      onClick={onClick}
      className="group flex items-start gap-3 p-4 hover:bg-blue-50/50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
    >
      <div className={cn(
        "p-2 rounded-lg transition-colors shrink-0",
        isDossier
          ? "bg-blue-100 text-blue-600 group-hover:bg-blue-200 group-hover:text-blue-700"
          : "bg-gray-100 text-gray-600 group-hover:bg-gray-200 group-hover:text-gray-700"
      )}>
        <FileText className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold text-gray-900 group-hover:text-blue-700 truncate">
            {doc.title}
          </h4>
          <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2 mt-1">
          {doc.snippet}
        </p>
        {isDossier && (
          <span className="inline-flex items-center mt-2 px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full">
            Dossier
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

export default InstantSearchBar;

