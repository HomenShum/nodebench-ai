"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { motion } from "framer-motion";
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
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import type { Entity, EntityType } from "../types/entitySchema";

interface EntityLinkProps {
  /** Entity data */
  entity: Entity;
  /** Custom display name override */
  displayName?: string;
  /** Whether to show preview tooltip on hover */
  showPreview?: boolean;
  /** Callback when entity is clicked */
  onClick?: (entity: Entity) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Get icon for entity type
 */
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
    default:
      return Hash;
  }
};

/**
 * Get color classes for entity type
 */
const getEntityColors = (type: EntityType) => {
  switch (type) {
    case "company":
      return {
        text: "text-emerald-700",
        bg: "bg-emerald-50 hover:bg-emerald-100",
        border: "border-emerald-200",
        icon: "text-emerald-500",
        badge: "bg-emerald-100 text-emerald-700",
      };
    case "person":
      return {
        text: "text-indigo-700",
        bg: "bg-indigo-50 hover:bg-indigo-100",
        border: "border-indigo-200",
        icon: "text-indigo-500",
        badge: "bg-indigo-100 text-indigo-700",
      };
    case "product":
      return {
        text: "text-blue-700",
        bg: "bg-blue-50 hover:bg-blue-100",
        border: "border-blue-200",
        icon: "text-blue-500",
        badge: "bg-blue-100 text-blue-700",
      };
    case "technology":
      return {
        text: "text-purple-700",
        bg: "bg-purple-50 hover:bg-purple-100",
        border: "border-purple-200",
        icon: "text-purple-500",
        badge: "bg-purple-100 text-purple-700",
      };
    case "topic":
      return {
        text: "text-slate-700",
        bg: "bg-slate-50 hover:bg-slate-100",
        border: "border-slate-200",
        icon: "text-slate-500",
        badge: "bg-slate-100 text-slate-700",
      };
    case "region":
      return {
        text: "text-amber-700",
        bg: "bg-amber-50 hover:bg-amber-100",
        border: "border-amber-200",
        icon: "text-amber-500",
        badge: "bg-amber-100 text-amber-700",
      };
    case "event":
      return {
        text: "text-rose-700",
        bg: "bg-rose-50 hover:bg-rose-100",
        border: "border-rose-200",
        icon: "text-rose-500",
        badge: "bg-rose-100 text-rose-700",
      };
    case "metric":
      return {
        text: "text-cyan-700",
        bg: "bg-cyan-50 hover:bg-cyan-100",
        border: "border-cyan-200",
        icon: "text-cyan-500",
        badge: "bg-cyan-100 text-cyan-700",
      };
    case "document":
      return {
        text: "text-gray-700",
        bg: "bg-gray-50 hover:bg-gray-100",
        border: "border-gray-200",
        icon: "text-gray-500",
        badge: "bg-gray-100 text-gray-700",
      };
    default:
      return {
        text: "text-gray-700",
        bg: "bg-gray-50 hover:bg-gray-100",
        border: "border-gray-200",
        icon: "text-gray-500",
        badge: "bg-gray-100 text-gray-700",
      };
  }
};

/**
 * EntityLink - AI-2027.com-inspired entity link with visual distinction
 *
 * Displays entities with type-specific styling, icons, and hover previews.
 * Supports internal dossier navigation and external links.
 */
export const EntityLink: React.FC<EntityLinkProps> = ({
  entity,
  displayName,
  showPreview = true,
  onClick,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (!showPreview) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsOpen(true), 250);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsOpen(false), 100);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick(entity);
    } else if (entity.dossierId) {
      // Navigate to internal dossier
      window.location.href = `/documents/${entity.dossierId}`;
    } else if (entity.url) {
      window.open(entity.url, "_blank", "noopener,noreferrer");
    }
  };

  const Icon = getEntityIcon(entity.type);
  const colors = getEntityColors(entity.type);
  const name = displayName || entity.name;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.button
        type="button"
        onClick={handleClick}
        className={`
          inline-flex items-center gap-1 px-1.5 py-0.5 rounded
          font-medium text-sm
          border-b-2 border-dashed
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
          ${colors.text} ${colors.border}
          hover:${colors.bg}
          ${className}
        `}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        aria-describedby={showPreview ? tooltipId : undefined}
      >
        <Icon className={`w-3.5 h-3.5 ${colors.icon}`} />
        <span>{name}</span>
        {entity.ticker && (
          <span className="text-[10px] opacity-60">({entity.ticker})</span>
        )}
      </motion.button>

      {/* Interactive Popover */}
      {showPreview && (
        <div
          id={tooltipId}
          role="tooltip"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`
            absolute left-1/2 -translate-x-1/2 top-full z-50
            w-72 mt-2 p-3
            rounded-lg border border-gray-200 bg-white shadow-xl ring-1 ring-black/5
            transition-all duration-200 origin-top
            ${isOpen ? "opacity-100 scale-100 visible pointer-events-auto" : "opacity-0 scale-95 invisible pointer-events-none"}
          `}
        >
          <div className="flex flex-col gap-2">
            {/* Header */}
            <div className="flex items-center gap-2">
              {entity.avatarUrl ? (
                <img
                  src={entity.avatarUrl}
                  alt={entity.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.bg}`}>
                  <Icon className={`w-4 h-4 ${colors.icon}`} />
                </span>
              )}
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-gray-900 text-sm block truncate">
                  {entity.name}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors.badge}`}>
                  {entity.type}
                </span>
              </div>
            </div>

            {/* Description */}
            {entity.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {entity.description}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              {entity.dossierId ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/documents/${entity.dossierId}`;
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                >
                  <FileText className="w-3 h-3" />
                  <span>View Dossier</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Dispatch event to create a new dossier for this entity
                    window.dispatchEvent(new CustomEvent('entity:createDossier', {
                      detail: { entity }
                    }));
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                >
                  <FileText className="w-3 h-3" />
                  <span>Create Dossier</span>
                </button>
              )}
              {entity.url && (
                <a
                  href={entity.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="truncate max-w-[80px]">
                    {new URL(entity.url).hostname}
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </span>
  );
};

export default EntityLink;

