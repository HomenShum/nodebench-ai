import React from 'react';
import { X } from 'lucide-react';

interface ErrorBannerProps {
  errorBanner: {
    message: string;
    errors: Array<{ tool: string; message: string }>;
    expanded: boolean;
  } | null;
  onDismiss: () => void;
  onToggleExpanded: () => void;
}

export const AIChatPanelErrorBanner: React.FC<ErrorBannerProps> = ({
  errorBanner,
  onDismiss,
  onToggleExpanded,
}) => {
  if (!errorBanner) return null;

  return (
    <div className="mx-3 mt-3 mb-0">
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-800 font-medium mb-1">{errorBanner.message}</p>
          {errorBanner.expanded && errorBanner.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {errorBanner.errors.map((e, i) => (
                <li key={i} className="p-2 bg-white/70 rounded border border-red-200">
                  <div className="font-medium">{e.tool}</div>
                  <div className="text-red-700 break-words">{e.message}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-1">
          {errorBanner.errors.length > 0 && (
            <button
              onClick={onToggleExpanded}
              className="px-2 py-1 text-xs rounded hover:bg-red-100 text-red-700"
            >
              {errorBanner.expanded ? 'Hide' : 'Details'}
            </button>
          )}
          <button
            onClick={onDismiss}
            className="p-1 rounded hover:bg-red-100"
            aria-label="Dismiss error banner"
            title="Dismiss"
          >
            <X className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

