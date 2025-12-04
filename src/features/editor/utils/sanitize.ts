/**
 * ProseMirror content sanitization utilities
 * Extracted from UnifiedEditor.tsx for modularity
 */

/**
 * Sanitize ProseMirror content to remove unsupported node types
 * Converts unsupported nodes (like horizontalRule, mention, hashtag, taskItem, taskList) to supported alternatives
 *
 * TipTap uses taskItem/taskList, but BlockNote uses checkListItem.
 * This function converts between the two schemas.
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

    // Convert TipTap taskList to BlockNote-compatible structure
    // taskList contains taskItem children - we flatten them to checkListItem blocks
    if (content.type === 'taskList') {
      // Return the sanitized children (taskItems will be converted to checkListItem)
      if (content.content && Array.isArray(content.content)) {
        return content.content
          .map((node: any) => sanitizeProseMirrorContent(node))
          .filter((node: any) => node !== null);
      }
      return null;
    }

    // Convert TipTap taskItem to BlockNote checkListItem
    if (content.type === 'taskItem') {
      const checked = content.attrs?.checked ?? false;
      // Extract text content from taskItem
      const textContent = content.content
        ? content.content
            .map((node: any) => sanitizeProseMirrorContent(node))
            .filter((node: any) => node !== null)
        : [];

      return {
        type: 'checkListItem',
        attrs: {
          checked: checked,
        },
        content: textContent,
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

      // Flatten arrays (from taskList conversion)
      const flattened = sanitized.flat();

      return {
        ...content,
        content: flattened.length > 0 ? flattened : undefined,
      };
    }
  }

  return content;
};

