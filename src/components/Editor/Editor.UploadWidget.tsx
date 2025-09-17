import React from "react";

export type EditorUploadWidgetProps = {
  onFiles: (files: File[]) => void;
  accept?: string;
  disabled?: boolean;
};

export const EditorUploadWidget: React.FC<EditorUploadWidgetProps> = ({ onFiles, accept, disabled }) => {
  const onClick = () => {
    if (disabled) return;
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files || []);
      if (files.length) onFiles(files);
    };
    input.click();
  };

  return (
    <button onClick={onClick} disabled={disabled} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)]">
      Upload
    </button>
  );
};

