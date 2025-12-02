import type { ChangeEvent, KeyboardEvent } from "react";
import { Sparkles, Send } from "lucide-react";

export interface PlannerAiBarProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSend: () => void;
  quickActions: Array<{ label: string; text: string }>;
  onQuickPrompt: (text: string) => void;
}

export function PlannerAiBar({
  prompt,
  onPromptChange,
  onSend,
  quickActions,
  onQuickPrompt,
}: PlannerAiBarProps) {
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onPromptChange(event.target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  const openChatPanel = () => {
    try {
      window.dispatchEvent(new CustomEvent("ai:openPanel"));
    } catch {
      // no-op
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] flex-1">
          <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" />
          <input
            value={prompt}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask the agent… (e.g., ‘Plan my week’)"
            className="w-full bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
          />
        </div>

        <button
          onClick={onSend}
          className="px-3 py-2 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] text-sm flex items-center gap-2"
          title="Send"
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Ask</span>
        </button>

        <button
          onClick={openChatPanel}
          className="px-3 py-2 text-sm rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)]"
          title="Open AI Chat"
        >
          Open Chat
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickActions.map((qa) => (
          <button
            key={qa.label}
            onClick={() => onQuickPrompt(qa.text)}
            className="px-2.5 py-1.5 rounded-full text-xs border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            title={qa.text}
          >
            {qa.label}
          </button>
        ))}
      </div>
    </div>
  );
}
