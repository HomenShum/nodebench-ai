/**
 * ProseMirror content sanitization utilities
 * Extracted from UnifiedEditor.tsx for modularity
 */

/**
 * Sanitize ProseMirror content to remove unsupported node types
 * Converts unsupported nodes (like horizontalRule, mention, hashtag) to supported alternatives
 */
export const sanitizeProseMirrorContent = (content: any): any => {
  if (!content) return content;

  if (Array.isArray(content)) {
    return content
      .map(node => sanitizeProseMirrorContent(node))
      .filter(node => node !== null);
  }

  if (typeof content === 'object' && content.type) {
    // Convert mentions to plain text
    if (content.type === 'mention') {
      const label = content.attrs?.label || content.attrs?.id || '';
      return {
        type: 'text',
        text: `@${label}`,
        marks: content.marks || [],
      };
    }

    // Convert hashtags to plain text
    if (content.type === 'hashtag') {
      const name = content.attrs?.name || content.attrs?.label || '';
      return {
        type: 'text',
        text: `#${name}`,
        marks: content.marks || [],
      };
    }

    // Remove unsupported block types
    const unsupportedTypes = ['horizontalRule'];
    if (unsupportedTypes.includes(content.type)) {
      return null; // Filter out
    }

    // Recursively sanitize nested content
    if (content.content && Array.isArray(content.content)) {
      const sanitized = content.content
        .map((node: any) => sanitizeProseMirrorContent(node))
        .filter((node: any) => node !== null);

      return {
        ...content,
        content: sanitized.length > 0 ? sanitized : undefined,
      };
    }
  }

  return content;
};

