import React from 'react';
import { Plus, FileText, Search, Edit3, CheckCircle } from 'lucide-react';
import { Id } from '../../../convex/_generated/dataModel';

interface QuickActionsProps {
  selectedDocumentId?: Id<"documents">;
  selectedNodeId?: Id<"nodes">;
  onQuickAction: (prompt: string) => void;
}

export const AIChatPanelQuickActions: React.FC<QuickActionsProps> = ({
  selectedDocumentId,
  selectedNodeId,
  onQuickAction,
}) => {
  const actions = selectedDocumentId
    ? [
        { icon: Plus, label: 'Add Section', prompt: 'Add a new section about' },
        { icon: FileText, label: 'Add Outline', prompt: 'Create an outline with key points' },
        { icon: Edit3, label: 'Add Code', prompt: 'Add a code example for' },
        { icon: CheckCircle, label: 'Add Checklist', prompt: 'Add a checklist for' },
      ]
    : [
        { icon: Plus, label: 'New Doc', prompt: 'Create a new document about' },
        { icon: Search, label: 'Find Docs', prompt: 'Find documents about' },
        { icon: FileText, label: 'Project Plan', prompt: 'Create a project plan' },
        { icon: Edit3, label: 'Meeting Notes', prompt: 'Create meeting notes' },
      ];

  return (
    <div className="p-3 border-b border-[var(--border-color)]">
      <p className="text-xs font-medium text-[var(--text-primary)] mb-2">
        Quick Actions
        {selectedDocumentId && (
          <span className="text-[var(--accent-green)] ml-1">(for current doc)</span>
        )}
      </p>

      {/* Compact icon-only actions */}
      <div className="flex items-center gap-2">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={() => onQuickAction(action.prompt)}
              className="flex-1 flex flex-col items-center justify-center gap-1 p-2 text-xs bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md transition-colors"
              title={action.prompt}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[10px]">{action.label}</span>
            </button>
          );
        })}
      </div>

      {selectedNodeId && (
        <div className="mt-2 p-2 bg-[var(--accent-secondary)] rounded-md">
          <p className="text-xs text-[var(--accent-primary)]">
            <strong>Block selected:</strong> You can ask me to update or expand this specific section
          </p>
        </div>
      )}
    </div>
  );
};

