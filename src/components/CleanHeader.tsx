/**
 * CleanHeader - Simplified Top Bar
 * 
 * Implements the simplified header approach:
 * - Search bar (centered)
 * - Help icon
 * - Settings icon
 * - User avatar
 * 
 * Removed: Home label, Fast Agent button, Dark toggle, Welcome button, Tutorial button
 */

import { Search, HelpCircle, Settings as SettingsIcon, Send } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface CleanHeaderProps {
  quickChatInput: string;
  setQuickChatInput: (value: string) => void;
  onQuickChat: () => void;
  onOpenSettings: (tab?: 'profile' | 'account' | 'usage' | 'integrations' | 'billing' | 'reminders') => void;
  onHelp?: () => void;
}

export function CleanHeader({
  quickChatInput,
  setQuickChatInput,
  onQuickChat,
  onOpenSettings,
  onHelp,
}: CleanHeaderProps) {
  const user = useQuery(api.auth.loggedInUser);

  return (
    <div className="bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-color)] px-4 py-2 flex items-center gap-4 transition-colors duration-200">
      {/* Centered Search Bar */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-2xl flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 shadow-sm focus-within:ring-1 focus-within:ring-[var(--accent-primary)]/50 transition-colors">
          <Search className="h-4 w-4 text-[var(--text-secondary)]" />
          <input
            value={quickChatInput}
            onChange={(e) => setQuickChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onQuickChat();
              }
            }}
            placeholder="Search documents..."
            aria-label="Search documents"
            className="flex-1 text-sm bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          <button
            onClick={onQuickChat}
            className="p-1.5 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] transition-colors"
            aria-label="Search"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Right side icons */}
      <div className="flex items-center gap-2">
        {/* Help */}
        <button
          onClick={onHelp}
          className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
          title="Help"
          aria-label="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* Settings */}
        <button
          onClick={() => onOpenSettings('usage')}
          className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
          title="Settings"
          aria-label="Settings"
        >
          <SettingsIcon className="h-5 w-5" />
        </button>

        {/* User Avatar */}
        {user && (
          <button
            onClick={() => onOpenSettings('profile')}
            className="flex items-center"
            title={user.name || user.email || 'Profile'}
          >
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || user.email || 'User'}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {(user.name?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase()}
                </span>
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default CleanHeader;
