import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Github, ArrowUpRight, MessageSquare } from "lucide-react";
import clsx from "clsx";
import type { FeedItem } from "./FeedCard";

type SourceFilter = { id: string; label: string; icon?: React.ElementType };

interface SourceFeedProps {
  items: FeedItem[];
  sources: SourceFilter[];
  activeSource: string;
  onSelectSource: (id: string) => void;
}

const defaultIcons: Record<string, React.ElementType> = {
  github: Github,
  ycombinator: ArrowUpRight,
  hackernews: ArrowUpRight,
  techcrunch: ExternalLink,
  reddit: MessageSquare,
};

export const SourceFeed: React.FC<SourceFeedProps> = ({ items, sources, activeSource, onSelectSource }) => {
  const filteredItems = useMemo(() => {
    if (activeSource === "all") return items;
    const target = activeSource.toLowerCase();
    return items.filter((item) => (item.source || "").toLowerCase() === target);
  }, [items, activeSource]);

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-6 border-b border-stone-100 pb-4">
        {sources.map((source) => {
          const Icon = source.icon || defaultIcons[source.id];
          const isActive = activeSource === source.id;
          return (
            <button
              key={source.id}
              onClick={() => onSelectSource(source.id)}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                isActive
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white text-stone-600 border border-stone-200 hover:border-stone-300 hover:bg-stone-50"
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {source.label}
            </button>
          );
        })}
      </div>

      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredItems.length === 0 && (
        <div className="py-10 text-center text-stone-400 text-sm">No updates found for this source.</div>
      )}
    </div>
  );
};

const FeedCard = ({ item }: { item: FeedItem }) => {
  const badgeColor =
    (item.source || "").toLowerCase() === "github"
      ? "bg-stone-100 text-stone-700"
      : (item.source || "").toLowerCase() === "ycombinator" || (item.source || "").toLowerCase() === "hackernews"
        ? "bg-orange-50 text-orange-700"
        : (item.source || "").toLowerCase() === "techcrunch"
          ? "bg-green-50 text-green-700"
          : (item.source || "").toLowerCase() === "reddit"
            ? "bg-red-50 text-red-600"
            : "bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)]";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="group relative flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-4 hover:border-indigo-200 hover:shadow-md transition-all"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className={clsx("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", badgeColor)}>
            {item.source || "News"}
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-stone-300 group-hover:text-indigo-400" />
        </div>
        <h4 className="text-sm font-semibold text-stone-900 leading-snug mb-2 line-clamp-2">{item.title}</h4>
        <p className="text-xs text-stone-500 line-clamp-2 mb-3">{item.subtitle || item.type}</p>
      </div>
      <div className="flex items-center gap-3 border-t border-stone-50 pt-3 text-[11px] text-stone-500">
        {item.timestamp && <span>{item.timestamp}</span>}
        {item.tags?.length ? <span className="truncate">#{item.tags.slice(0, 2).join(" #")}</span> : null}
        {typeof item.relevanceScore === "number" && (
          <span className="ml-auto font-mono text-xs text-stone-600">Relevance {item.relevanceScore}</span>
        )}
      </div>
    </motion.div>
  );
};

export default SourceFeed;
