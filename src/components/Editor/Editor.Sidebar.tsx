import React from "react";

export const EditorSidebar: React.FC<{ children?: React.ReactNode } > = ({ children }) => {
  return (
    <aside className="w-64 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] hidden lg:block">
      {children}
    </aside>
  );
};

