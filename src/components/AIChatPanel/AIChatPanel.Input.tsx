import React, { useCallback } from "react";

export type AIChatPanelInputProps = {
  input: string;
  onChangeInput: (v: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  placeholder: string;
  isLoading: boolean;
  onSend: () => void;
  onFilesDrop?: (files: File[]) => void;
};

export const AIChatPanelInput: React.FC<AIChatPanelInputProps> = ({
  input,
  onChangeInput,
  onKeyPress,
  placeholder,
  isLoading,
  onSend,
  onFilesDrop,
}) => {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length && onFilesDrop) onFilesDrop(files);
    },
    [onFilesDrop]
  );

  const prevent = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="flex gap-2">
      <div
        className="flex-1 relative"
        onDragEnter={prevent}
        onDragLeave={prevent}
        onDragOver={prevent}
        onDrop={handleDrop}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => onChangeInput(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          disabled={isLoading}
        />
      </div>
      <button
        onClick={onSend}
        disabled={!input.trim() || isLoading}
        className="px-3 py-2 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 transition-colors"
      >
        {/* Icon comes from parent CSS scope */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
};

