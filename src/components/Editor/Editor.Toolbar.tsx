import React from "react";

// Placeholder toolbar component extracted from Editor_nb3.
// TODO(PR4/PR5): Wire specific actions/menus as we continue extraction.
export const EditorToolbar: React.FC<{ children?: React.ReactNode } > = ({ children }) => {
  return (
    <div className="flex items-center gap-2 py-1 px-2 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
      {children}
    </div>
  );
};

