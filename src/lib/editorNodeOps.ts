/*
  EditorJS Node Operations Utility
  - Define a unified action shape for create/update/delete node operations
  - Provide simple Markdown -> EditorJS blocks conversion
  - Apply a batch of actions against an array of EditorJS blocks deterministically
*/

export type EditorJsBlock = { type: string; data: any };

export type CreateNodeAction = {
  type: 'createNode';
  // Where to insert relative to an anchor index
  position?: 'before' | 'after' | 'start' | 'end';
  anchorIndex?: number; // default provided by caller
  blocks?: EditorJsBlock[];
  markdown?: string;
};

export type UpdateNodeAction = {
  type: 'updateNode';
  targetIndex?: number; // default: anchorIndex
  blocks?: EditorJsBlock[];
  markdown?: string;
};

export type DeleteNodeAction = {
  type: 'deleteNode';
  targetIndex?: number; // default: anchorIndex
};

export type ReplaceRangeAction = {
  type: 'replaceRange';
  startIndex?: number; // inclusive
  endIndex?: number;   // exclusive
  blocks?: EditorJsBlock[];
  markdown?: string;
};

export type EditorNodeAction =
  | CreateNodeAction
  | UpdateNodeAction
  | DeleteNodeAction
  | ReplaceRangeAction;

export type ApplyOptions = {
  anchorIndex: number; // caller-resolved default target
};

// Minimal Markdown -> EditorJS blocks conversion
// Supports:
// - #, ##, ### headings at paragraph start
// - code fence ``` blocks (single block)
// - unordered lists (- item)
// - ordered lists (1. item)
// - paragraphs (split by blank lines, keep <br> for single newlines)
export function markdownToBlocks(md: string): EditorJsBlock[] {
  const text = String(md ?? '').trim();
  if (!text) return [];

  // crude code fence support: if block is fenced, use one code block
  if (/```[\s\S]*```/.test(text)) {
    const code = text.replace(/^```\w*\n?|```$/gms, '').trimEnd();
    return [{ type: 'code', data: { code } }];
  }

  const paras = text.split(/\n\s*\n+/);
  const blocks: EditorJsBlock[] = [];
  for (const pRaw of paras) {
    const p = pRaw.trimEnd();
    // Headings
    const m = p.match(/^(#{1,6})\s+(.+)$/);
    if (m) {
      const level = Math.max(1, Math.min(6, m[1].length));
      const headerText = m[2];
      blocks.push({ type: 'header', data: { level, text: headerText } });
      continue;
    }

    // Unordered list (all lines start with - or *)
    const lines = p.split(/\n/);
    if (lines.length > 1 && lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      const items = lines.map((l) => l.replace(/^\s*[-*]\s+/, ''));
      blocks.push({ type: 'list', data: { style: 'unordered', items } });
      continue;
    }

    // Ordered list (all lines start with n.)
    if (lines.length > 1 && lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
      const items = lines.map((l) => l.replace(/^\s*\d+\.\s+/, ''));
      blocks.push({ type: 'list', data: { style: 'ordered', items } });
      continue;
    }

    // Quote (every line starts with > )
    if (lines.length >= 1 && lines.every((l) => /^\s*>\s?/.test(l))) {
      const q = lines.map((l) => l.replace(/^\s*>\s?/, '')).join('\n');
      blocks.push({ type: 'quote', data: { text: q } });
      continue;
    }

    // Delimiter
    if (/^\s*-{3,}\s*$/.test(p)) {
      blocks.push({ type: 'delimiter', data: {} });
      continue;
    }

    // Paragraph (preserve single newlines as <br>)
    const html = p.replace(/\n/g, '<br>');
    blocks.push({ type: 'paragraph', data: { text: html } });
  }
  return blocks;
}

// Sanitize externally-provided blocks to match EditorJS tool schemas
// Allowed types: header, paragraph, list, checklist, delimiter, quote, code
export function sanitizeBlocks(blocks: any[]): EditorJsBlock[] {
  if (!Array.isArray(blocks)) {
    return [{ type: "paragraph", data: { text: "" } }];
  }

  const sanitized = blocks.map(block => {
    // Ensure block has required structure
    if (!block || typeof block !== 'object') {
      return { type: "paragraph", data: { text: "" } };
    }

    // Ensure block has a type
    const type = block.type || "paragraph";
    
    // Ensure block has data object
    let data = block.data || {};
    
    // Special handling for paragraph blocks
    if (type === "paragraph") {
      // Ensure text field exists and is a string
      if (!data.text || typeof data.text !== 'string') {
        data.text = "";
      }
    }
    
    // Special handling for other block types
    switch (type) {
      case "header":
        // Coerce text to string
        if (typeof data.text !== 'string') data.text = String(data.text ?? "");
        // Clamp header level to [1,6]
        const lvl = typeof data.level === 'number' ? data.level : 2;
        data.level = Math.max(1, Math.min(6, lvl));
        break;
      case "list":
        if (!Array.isArray(data.items)) data.items = [];
        data.items = data.items.map(item => String(item || ""));
        if (!data.style) data.style = "unordered";
        break;
      case "checklist":
        if (!Array.isArray(data.items)) data.items = [];
        data.items = data.items.map(item => ({
          text: String(item?.text || item || ""),
          checked: Boolean(item?.checked)
        }));
        break;
      case "quote":
        if (!data.text || typeof data.text !== 'string') data.text = "";
        if (!data.caption) data.caption = "";
        break;
      case "code":
        if (!data.code || typeof data.code !== 'string') data.code = "";
        break;
      case "delimiter":
        // Delimiter doesn't need data
        break;
      default:
        // For unknown types, ensure at least empty text
        if (!data.text) data.text = "";
    }
    
    return {
      type,
      data,
      ...(block.id ? { id: block.id } : {})
    };
  });

  // If no blocks after sanitization, add default paragraph
  if (sanitized.length === 0) {
    return [{ type: "paragraph", data: { text: "" } }];
  }

  return sanitized;
}

export function applyNodeOps(
  blocks: EditorJsBlock[],
  actions: EditorNodeAction[],
  opts: ApplyOptions
): EditorJsBlock[] {
  const result = blocks.slice();
  let cursorAnchor = Math.max(0, Math.min(opts.anchorIndex ?? 0, result.length - 1));

  const coerceBlocks = (a: { blocks?: EditorJsBlock[]; markdown?: string }): EditorJsBlock[] => {
    if (Array.isArray(a.blocks)) {
      const sanitized = sanitizeBlocks(a.blocks as any[]);
      if (sanitized.length > 0) return sanitized;
      // fall through to markdown fallback if provided
    }
    if (typeof a.markdown === 'string') return markdownToBlocks(a.markdown);
    return [];
  };

  for (const a of actions) {
    switch (a.type) {
      case 'updateNode': {
        const i = clampIndex((a.targetIndex ?? cursorAnchor), result.length);
        const newBlocks = coerceBlocks(a);
        // replace single node with many blocks
        result.splice(i, 1, ...newBlocks);
        cursorAnchor = Math.min(i + Math.max(0, newBlocks.length - 1), result.length - 1);
        break;
      }
      case 'createNode': {
        const where = a.position ?? 'after';
        const base = (typeof a.anchorIndex === 'number' ? a.anchorIndex : cursorAnchor);
        const i = clampIndex(base, result.length);
        const insertAt =
          where === 'before' ? i :
          where === 'after' ? i + 1 :
          where === 'start' ? 0 :
          /* end */ result.length;
        const newBlocks = coerceBlocks(a);
        if (newBlocks.length > 0) {
          result.splice(insertAt, 0, ...newBlocks);
          cursorAnchor = Math.min(insertAt + newBlocks.length - 1, result.length - 1);
        }
        break;
      }
      case 'deleteNode': {
        const i = clampIndex((a.targetIndex ?? cursorAnchor), result.length);
        if (i >= 0 && i < result.length) {
          result.splice(i, 1);
          cursorAnchor = Math.max(0, Math.min(i, result.length - 1));
        }
        break;
      }
      case 'replaceRange': {
        const start = Math.max(0, Math.min((a.startIndex ?? cursorAnchor), result.length));
        const end = Math.max(start, Math.min((a.endIndex ?? start + 1), result.length));
        const newBlocks = coerceBlocks(a);
        result.splice(start, Math.max(0, end - start), ...newBlocks);
        cursorAnchor = Math.min(start + Math.max(0, newBlocks.length - 1), result.length - 1);
        break;
      }
      default:
        // ignore unknown types
        break;
    }
  }
  // Ensure final blocks conform to EditorJS tool schemas to avoid runtime validation errors
  return sanitizeBlocks(result as any);
}

function clampIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  if (!Number.isFinite(i)) return 0;
  return Math.max(0, Math.min(i, len - 1));
}
