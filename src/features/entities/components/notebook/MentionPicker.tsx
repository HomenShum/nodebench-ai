/**
 * MentionPicker — dropdown autocomplete for @mentions of entities.
 *
 * Used by the slash palette's `@` command and (Phase B) by the per-block
 * Lexical editor as an inline trigger.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useQuery } from "convex/react";
import { useConvexApi } from "@/lib/convexApi";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";

export type EntityMatch = {
  slug: string;
  name: string;
  entityType: string;
};

type Props = {
  onSelect: (match: EntityMatch) => void;
  onClose: () => void;
  initialQuery?: string;
  entitySlug?: string;
  shareToken?: string;
};

export function MentionPicker({
  onSelect,
  onClose,
  initialQuery = "",
  entitySlug,
  shareToken,
}: Props) {
  const api = useConvexApi();
  const anonymousSessionId = getAnonymousProductSessionId();
  const [query, setQuery] = useState(initialQuery);
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const matches = useQuery(
    api?.domains.product.blocks.searchEntitiesForMention ?? "skip",
    api?.domains.product.blocks.searchEntitiesForMention
      ? { anonymousSessionId, shareToken, entitySlug, prefix: query }
      : "skip",
  ) as EntityMatch[] | undefined;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const effective = matches ?? [];
  useEffect(() => {
    if (activeIndex >= effective.length) {
      setActiveIndex(Math.max(0, effective.length - 1));
    }
  }, [effective.length, activeIndex]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((idx) => Math.min(idx + 1, effective.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((idx) => Math.max(idx - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const match = effective[activeIndex];
      if (match) onSelect(match);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-30 mt-1 w-[280px] rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-[#1a1a1b]"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <input
        type="text"
        autoFocus
        placeholder="Search entities…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="mb-1 w-full rounded-md border border-gray-100 bg-transparent px-2.5 py-1 text-sm text-gray-900 outline-none focus:border-gray-200 dark:border-white/[0.06] dark:text-gray-100 dark:focus:border-white/20"
      />
      {effective.length === 0 ? (
        <div className="px-2.5 py-2 text-xs text-gray-500">
          {query ? "No matches." : "Type to search…"}
        </div>
      ) : (
        effective.map((match, idx) => (
          <button
            key={match.slug}
            type="button"
            onMouseEnter={() => setActiveIndex(idx)}
            onClick={() => onSelect(match)}
            className={`flex w-full items-center gap-3 rounded px-2.5 py-1.5 text-sm transition-colors ${
              idx === activeIndex
                ? "bg-gray-100 dark:bg-white/[0.05]"
                : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
            }`}
          >
            <span className="truncate text-gray-900 dark:text-gray-100">{match.name}</span>
            <span className="ml-auto text-[11px] text-gray-500">{match.entityType}</span>
          </button>
        ))
      )}
    </div>
  );
}

export default MentionPicker;
