/**
 * AI Keyboard handler hook for UnifiedEditor
 * Handles /ai and /edit keyboard shortcuts
 */

import { useEffect } from 'react';

interface UseAIKeyboardOptions {
  editor: any; // BlockNote editor instance
  askFastAgent: (question: string, context: string) => Promise<void>;
}

export function useAIKeyboard({ editor, askFastAgent }: UseAIKeyboardOptions) {
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      try {
        if (!editor) return;
        const currentBlock = editor.getTextCursorPosition().block;
        if (!(currentBlock?.content && Array.isArray(currentBlock.content))) return;

        const rawText = currentBlock.content.map((c: any) => c.text || "").join("");
        const blockText = rawText.trim();

        // 1) SPACE: If user typed exactly "/ai" then pressing space converts it to "🤖 "
        if (event.key === ' ' || event.code === 'Space') {
          if (/^\/ai$/i.test(blockText)) {
            console.log('[useAIKeyboard] Replacing "/ai" with "🤖 " on space');
            event.preventDefault();
            event.stopPropagation();
            editor.updateBlock(currentBlock, {
              type: 'paragraph',
              content: [{ type: 'text', text: '🤖 ', styles: {} }],
            });
            editor.setTextCursorPosition(currentBlock, 'end');
            return;
          }

          // Handle /edit -> "✏️ Edit: "
          if (/^\/edit$/i.test(blockText)) {
            console.log('[useAIKeyboard] Replacing "/edit" with "✏️ Edit: " on space');
            event.preventDefault();
            event.stopPropagation();
            editor.updateBlock(currentBlock, {
              type: 'paragraph',
              content: [{ type: 'text', text: '✏️ Edit: ', styles: { bold: true, textColor: 'purple' } }],
            });
            editor.setTextCursorPosition(currentBlock, 'end');
            return;
          }
        }

        // 2) ENTER: Handle /ai and 🤖 patterns
        if (event.key === 'Enter') {
          handleEnterKey(event, editor, currentBlock, rawText, askFastAgent);
        }
      } catch (error) {
        console.error('[useAIKeyboard] Error in keyboard handler:', error);
      }
    };

    console.log('[useAIKeyboard] Adding /ai keyboard handler');
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      console.log('[useAIKeyboard] Removing /ai keyboard handler');
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [editor, askFastAgent]);
}

function handleEnterKey(
  event: KeyboardEvent,
  editor: any,
  currentBlock: any,
  rawText: string,
  askFastAgent: (question: string, context: string) => Promise<void>
) {
  console.log('[useAIKeyboard] Enter pressed, block text:', rawText);

  // Check for /ai or 🤖 patterns
  const aiSlash = rawText.match(/^\s*\/ai\s+(.+)$/i);
  const aiRobot = rawText.match(/^\s*🤖\s+(.+)$/);
  const match = aiSlash || aiRobot;

  if (match) {
    const question = match[1].trim();
    if (!question) return;
    console.log('[useAIKeyboard] ✅ Detected AI inline question:', question);

    event.preventDefault();
    event.stopPropagation();

    // Replace the input line with a visible "User asked:" block
    editor.updateBlock(currentBlock, {
      type: 'paragraph',
      content: [
        { type: 'text', text: '💬 You: ', styles: { bold: true, textColor: 'blue' } },
        { type: 'text', text: question, styles: { italic: true } },
      ],
    });

    // Trigger Fast Agent
    askFastAgent(question, '').catch((error) => {
      console.error('[useAIKeyboard] Fast Agent error:', error);
      editor.insertBlocks([
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '❌ Failed to get response from Fast Agent. Please try again.', styles: { bold: true, textColor: 'red' } },
          ],
        },
      ], currentBlock, 'after');
    });
    return;
  }

  // Check for /edit or ✏️ Edit: patterns
  const editSlash = rawText.match(/^\s*\/edit\s+(.+)$/i);
  const editEmoji = rawText.match(/^\s*✏️\s*Edit:\s*(.+)$/i);
  const editMatch = editSlash || editEmoji;

  if (editMatch) {
    handleEditInstruction(event, editor, currentBlock, editMatch[1].trim(), askFastAgent);
  }
}

function handleEditInstruction(
  event: KeyboardEvent,
  editor: any,
  currentBlock: any,
  instruction: string,
  askFastAgent: (question: string, context: string) => Promise<void>
) {
  if (!instruction) return;
  console.log('[useAIKeyboard] ✅ Detected Deep Agent edit instruction:', instruction);

  event.preventDefault();
  event.stopPropagation();

  // Get document context for editing
  let documentContext = "";
  try {
    const allBlocks = editor.document;
    documentContext = allBlocks.slice(0, 20).map((block: any) => {
      if (block.content && Array.isArray(block.content)) {
        return block.content.map((c: any) => c.text || "").join("");
      }
      return "";
    }).filter(Boolean).join("\n").substring(0, 2000);
  } catch (e) {
    console.warn("[useAIKeyboard] Could not extract document context:", e);
  }

  // Show editing indicator
  editor.updateBlock(currentBlock, {
    type: 'paragraph',
    content: [
      { type: 'text', text: '✏️ ', styles: {} },
      { type: 'text', text: 'Deep Agent editing: ', styles: { bold: true, textColor: 'purple' } },
      { type: 'text', text: instruction, styles: { italic: true } },
    ],
  });

  // Build edit prompt
  const editPrompt = `You are in DOCUMENT EDITING mode. The user wants to edit this document.

INSTRUCTION: ${instruction}

DOCUMENT CONTEXT (first 2000 chars):
${documentContext}

Use the document editing tools (readDocumentSections, createDocumentEdit) to:
1. First read the document structure to understand where to make edits
2. Create anchor-based SEARCH/REPLACE edits for each change
3. Report on edit status after creating them

Be precise with anchors and search text - they must match exactly what's in the document.`;

  askFastAgent(editPrompt, '').catch((error) => {
    console.error('[useAIKeyboard] Deep Agent edit error:', error);
    editor.insertBlocks([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: '❌ Deep Agent editing failed. Please try again.', styles: { bold: true, textColor: 'red' } },
        ],
      },
    ], currentBlock, 'after');
  });
}

