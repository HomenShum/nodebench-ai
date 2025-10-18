// src/components/views/dossier/DossierTranscript.tsx
// Left panel that renders EditorJS blocks with lightweight media references

import React from 'react';
import { MediaReferenceCard } from './MediaReferenceCard';
import { isMediaBlock, getMediaTypeFromBlock } from './mediaExtractor';

interface DossierTranscriptProps {
  blocks: any[];
  onMediaClick?: (type: 'video' | 'image' | 'document') => void;
}

/**
 * DossierTranscript - Renders EditorJS content with lightweight media references
 * Replaces inline embeds with reference cards that link to the media gallery
 */
export function DossierTranscript({ blocks, onMediaClick }: DossierTranscriptProps) {
  return (
    <div className="prose prose-lg max-w-none">
      {blocks.map((block: any, index: number) => {
        // Check if this is a media block
        if (isMediaBlock(block)) {
          const mediaType = getMediaTypeFromBlock(block);
          if (mediaType) {
            return (
              <MediaReferenceCard
                key={index}
                type={mediaType}
                count={1}
                onClick={() => onMediaClick?.(mediaType)}
              />
            );
          }
        }

        // Render non-media blocks normally
        return renderBlock(block, index);
      })}
    </div>
  );
}

/**
 * Render a single EditorJS block (non-media blocks only)
 */
function renderBlock(block: any, index: number) {
  switch (block.type) {
    case 'header':
      const level = block.data?.level || 1;
      const HeaderTag = `h${level}` as keyof JSX.IntrinsicElements;
      return (
        <HeaderTag
          key={index}
          className={`font-bold mb-4 ${
            level === 1 ? 'text-3xl' : level === 2 ? 'text-2xl' : level === 3 ? 'text-xl' : 'text-lg'
          }`}
          dangerouslySetInnerHTML={{ __html: block.data?.text || '' }}
        />
      );

    case 'paragraph':
      return (
        <p
          key={index}
          className="mb-4 text-[var(--text-primary)] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: block.data?.text || '' }}
        />
      );

    case 'delimiter':
      return (
        <div key={index} className="my-6 flex items-center justify-center">
          <div className="w-full max-w-xs border-t-2 border-[var(--border-color)]"></div>
        </div>
      );

    case 'quote':
      return (
        <blockquote
          key={index}
          className="border-l-4 border-[var(--accent-primary)] pl-4 py-2 my-4 italic text-[var(--text-secondary)]"
          dangerouslySetInnerHTML={{ __html: block.data?.text || '' }}
        />
      );

    case 'code':
      return (
        <pre key={index} className="bg-[var(--bg-secondary)] p-4 rounded-lg my-4 overflow-x-auto">
          <code className="text-sm font-mono">{block.data?.code || ''}</code>
        </pre>
      );

    case 'list':
      const ListTag = block.data?.style === 'ordered' ? 'ol' : 'ul';
      return (
        <ListTag
          key={index}
          className={`mb-4 ${block.data?.style === 'ordered' ? 'list-decimal' : 'list-disc'} list-inside`}
        >
          {block.data?.items?.map((item: string, i: number) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ListTag>
      );

    case 'checklist':
      return (
        <div key={index} className="mb-4 space-y-2">
          {block.data?.items?.map((item: any, i: number) => (
            <div key={i} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={item.checked}
                readOnly
                className="mt-1 flex-shrink-0"
              />
              <span
                className={item.checked ? 'line-through text-[var(--text-tertiary)]' : ''}
                dangerouslySetInnerHTML={{ __html: item.text }}
              />
            </div>
          ))}
        </div>
      );

    case 'table':
      return (
        <div key={index} className="my-4 overflow-x-auto">
          <table className="min-w-full border border-[var(--border-color)]">
            <tbody>
              {block.data?.content?.map((row: string[], rowIdx: number) => (
                <tr key={rowIdx} className={rowIdx === 0 ? 'bg-[var(--bg-secondary)]' : ''}>
                  {row.map((cell: string, cellIdx: number) => {
                    const CellTag = rowIdx === 0 ? 'th' : 'td';
                    return (
                      <CellTag
                        key={cellIdx}
                        className="border border-[var(--border-color)] px-4 py-2 text-left"
                        dangerouslySetInnerHTML={{ __html: cell }}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      // Fallback for unknown block types
      return (
        <div key={index} className="my-4 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
          <p className="text-sm text-[var(--text-tertiary)]">
            Unsupported block type: {block.type}
          </p>
        </div>
      );
  }
}

