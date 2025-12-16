"use client";

import React from "react";
import SmartLink from "./SmartLink";
import { InteractiveSpan } from "./InteractiveSpan";

type SmartLinkMeta = { summary: string; source?: string };

export interface InteractiveSpanParserProps {
  /** Raw narrative text that may contain SmartLink tags and token syntax */
  text: string;
  /** Optional smart link metadata for <SmartLink> tags */
  smartLinks?: Record<string, SmartLinkMeta>;
  /** Prefix used to generate stable span IDs (e.g., section + paragraph) */
  spanPrefix?: string;
  /** Whether to show [index] indicator before the label when dataIndex is present */
  showIndicator?: boolean;
}

/**
 * Basic parser for `<SmartLink id="x">Label</SmartLink>` tags.
 *
 * Shared between classic scrollytelling layout and the interactive span
 * parser so we only maintain a single implementation.
 */
export const parseSmartLinks = (
  text: string,
  linksData?: Record<string, SmartLinkMeta>,
): React.ReactNode[] => {
  const regex = /<SmartLink id=['"]([^'\"]+)['"]>(.*?)<\/SmartLink>/g;
  const parts: Array<string | { id: string; label: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push({ id: match[1], label: match[2] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.map((part, idx) => {
    if (typeof part === "string") {
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    }
    const link = linksData?.[part.id];
    return (
      <SmartLink key={`${part.id}-${idx}`} summary={link?.summary} source={link?.source}>
        {part.label}
      </SmartLink>
    );
  });
};

/**
 * InteractiveSpanParser
 *
 * Parses `[[label|dataIndex:N]]` tokens inside narrative text and converts
 * them into InteractiveSpan components that are wired to chart data indices.
 *
 * Examples:
 *  - "The [[reliability gap|dataIndex:2]] remains dangerous."
 *  - "[[Capability|dataIndex:0]] outruns [[Reliability|dataIndex:1]]."
 */
export const InteractiveSpanParser: React.FC<InteractiveSpanParserProps> = ({
  text,
  smartLinks,
  spanPrefix = "interactive-span",
  showIndicator = true,
}) => {
  const nodes: React.ReactNode[] = [];
  // Match any [[...]] token. The inner payload is parsed for label and metadata.
  const tokenRegex = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let tokenCounter = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) {
      nodes.push(...parseSmartLinks(before, smartLinks));
    }

    const rawContent = match[1].trim();
    const [labelPart, metaPart] = rawContent.split("|");
    const label = (labelPart ?? "").trim();

    let dataIndex: number | undefined;
    if (metaPart) {
      const dataIndexMatch = /dataIndex\s*:\s*(\d+)/i.exec(metaPart);
      if (dataIndexMatch) {
        const parsed = Number.parseInt(dataIndexMatch[1], 10);
        if (!Number.isNaN(parsed)) {
          dataIndex = parsed;
        }
      }
    }

    const spanId = `${spanPrefix}-${tokenCounter++}`;

    nodes.push(
      <InteractiveSpan
        key={spanId}
        spanId={spanId}
        dataIndex={dataIndex}
        showIndicator={showIndicator}
      >
        {label || rawContent}
      </InteractiveSpan>,
    );

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    const rest = text.slice(lastIndex);
    if (rest) {
      nodes.push(...parseSmartLinks(rest, smartLinks));
    }
  }

  return <>{nodes}</>;
};

export default InteractiveSpanParser;
