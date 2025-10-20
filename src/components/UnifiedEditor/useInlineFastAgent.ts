/**
 * Custom hook for inline Fast Agent integration with streaming support
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useConvex, useAction, useMutation } from "convex/react";
import { useUIMessages } from "@convex-dev/agent/react";
import { api, internal } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import type { BlockNoteEditor } from "@blocknote/core";

interface InlineFastAgentOptions {
  editor: BlockNoteEditor | null;
  userId: Id<"users"> | undefined;
  documentId?: Id<"documents">;
}

interface StreamingState {
  isStreaming: boolean;
  threadId: string | null;
  messageId: string | null;
  currentText: string;
  targetBlockId: string | null;
}

export function useInlineFastAgent({ editor, userId, documentId }: InlineFastAgentOptions) {
  const convex = useConvex();
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    threadId: null,
    messageId: null,
    currentText: "",
    targetBlockId: null,
  });

  const createStreamingThread = useAction(api.fastAgentPanelStreaming.createThread);
  const sendStreamingMessage = useMutation(api.fastAgentPanelStreaming.initiateAsyncStreaming);
  
  // Track the block we're streaming into
  const streamingBlockRef = useRef<any>(null);
  const lastTextLengthRef = useRef(0);

  // Get streaming thread data
  const streamingThread = streamingState.threadId
    ? convex.query(api.fastAgentPanelStreaming.getThread, {
        threadId: streamingState.threadId as Id<"chatThreadsStream">,
      })
    : null;

  // Subscribe to streaming messages
  const { results: streamingMessages } = useUIMessages(
    api.fastAgentPanelStreaming.getThreadMessagesWithStreaming,
    streamingThread?.agentThreadId && streamingState.isStreaming
      ? { threadId: streamingThread.agentThreadId }
      : "skip",
    {
      initialNumItems: 100,
      stream: true, // Enable streaming deltas
    }
  );

  // Update the editor block with streaming text
  useEffect(() => {
    if (!streamingState.isStreaming || !editor || !streamingBlockRef.current) {
      return;
    }

    // Find the latest assistant message
    const assistantMessages = (streamingMessages || []).filter(
      (msg: any) => msg.role === "assistant"
    );

    if (assistantMessages.length === 0) return;

    const latestMessage = assistantMessages[assistantMessages.length - 1];
    
    // Extract text from message parts
    let fullText = "";
    if (latestMessage.parts && Array.isArray(latestMessage.parts)) {
      fullText = latestMessage.parts
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text || "")
        .join("");
    }

    // Only update if text has changed
    if (fullText && fullText.length > lastTextLengthRef.current) {
      lastTextLengthRef.current = fullText.length;
      
      try {
        // Update the streaming block with new text
        const block = streamingBlockRef.current;
        if (block && block.id) {
          editor.updateBlock(block.id, {
            type: "paragraph",
            content: [{ type: "text", text: fullText, styles: {} }],
          });
        }
      } catch (error) {
        console.error("[useInlineFastAgent] Error updating block:", error);
      }
    }

    // Check if streaming is complete
    const isComplete = latestMessage.parts?.every(
      (part: any) => part.type !== "text" || part.isComplete !== false
    );

    if (isComplete && streamingState.isStreaming) {
      console.log("[useInlineFastAgent] Streaming complete");
      setStreamingState((prev) => ({
        ...prev,
        isStreaming: false,
      }));
      streamingBlockRef.current = null;
      lastTextLengthRef.current = 0;
    }
  }, [streamingMessages, streamingState.isStreaming, editor]);

  /**
   * Ask Fast Agent with streaming response
   */
  const askFastAgent = useCallback(
    async (question: string, context?: string) => {
      if (!editor || !userId) {
        console.error("[useInlineFastAgent] Editor or userId not available");
        return;
      }

      try {
        setStreamingState((prev) => ({ ...prev, isStreaming: true }));

        // Create or reuse thread
        let threadId = streamingState.threadId;
        if (!threadId) {
          threadId = await createStreamingThread({
            title: `Inline AI: ${question.substring(0, 50)}`,
            model: "gpt-5-chat-latest",
          });
          setStreamingState((prev) => ({ ...prev, threadId }));
        }

        // Get current cursor position
        const currentBlock = editor.getTextCursorPosition().block;

        // Insert a placeholder block for streaming
        const placeholderBlock = {
          type: "paragraph" as const,
          content: [{ type: "text" as const, text: "🤖 Thinking...", styles: {} }],
        };

        editor.insertBlocks([placeholderBlock], currentBlock, "after");

        // Get the newly inserted block
        const blocks = editor.document;
        const currentIndex = blocks.findIndex((b: any) => b.id === currentBlock.id);
        const newBlock = blocks[currentIndex + 1];
        
        if (newBlock) {
          streamingBlockRef.current = newBlock;
          setStreamingState((prev) => ({ ...prev, targetBlockId: newBlock.id }));
        }

        // Send message to Fast Agent
        const message = context ? `${question}\n\nContext:\n${context}` : question;
        const result = await sendStreamingMessage({
          threadId: threadId as Id<"chatThreadsStream">,
          prompt: message,
          model: "gpt-5-chat-latest",
        });

        setStreamingState((prev) => ({ ...prev, messageId: result.messageId }));

        console.log("[useInlineFastAgent] Streaming initiated, messageId:", result.messageId);
      } catch (error) {
        console.error("[useInlineFastAgent] Error:", error);
        setStreamingState({
          isStreaming: false,
          threadId: null,
          messageId: null,
          currentText: "",
          targetBlockId: null,
        });
        
        // Show error to user
        if (streamingBlockRef.current && editor) {
          try {
            editor.updateBlock(streamingBlockRef.current.id, {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "❌ Failed to get response from Fast Agent",
                  styles: { textColor: "red" },
                },
              ],
            });
          } catch {}
        }
        
        throw error;
      }
    },
    [editor, userId, streamingState.threadId, createStreamingThread, sendStreamingMessage]
  );

  /**
   * Cancel ongoing streaming
   */
  const cancelStreaming = useCallback(() => {
    setStreamingState({
      isStreaming: false,
      threadId: null,
      messageId: null,
      currentText: "",
      targetBlockId: null,
    });
    streamingBlockRef.current = null;
    lastTextLengthRef.current = 0;
  }, []);

  return {
    askFastAgent,
    cancelStreaming,
    isStreaming: streamingState.isStreaming,
    currentText: streamingState.currentText,
  };
}

