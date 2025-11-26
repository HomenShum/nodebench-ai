import { SignOutButton } from "../../../SignOutButton";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

interface UserProfileProps {
    onOpenSettings?: (tab?: 'profile' | 'account' | 'usage' | 'integrations' | 'billing' | 'reminders') => void;
}

/**
 * User Profile Footer Component
 * Displays user avatar, name, email with Settings button and Sign Out
 * Styled with gradient background similar to Welcome Landing
 */
export function UserProfile({ onOpenSettings }: UserProfileProps) {
    const user = useQuery(api.auth.loggedInUser);

    return (
        <div className="p-4 border-t border-[var(--border-color)] bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-tertiary)] to-[var(--bg-secondary)]">
            <div className="flex items-center gap-3">
                {(() => {
                    const displayName = (user?.name ?? user?.email ?? "Guest");
                    const initial = (displayName || "U").trim().charAt(0).toUpperCase();
                    const rawImage = (user as any)?.image;
                    const imgSrc = typeof rawImage === "string" ? rawImage : undefined;
                    return imgSrc ? (
                        <img
                            src={imgSrc}
                            alt={displayName + " avatar"}
                            title={displayName}
                            className="h-9 w-9 rounded-full border border-[var(--border-color)] object-cover shadow-sm"
                        />
                    ) : (
                        <div
                            className="h-9 w-9 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-center text-sm font-semibold"
                            aria-label={displayName + " avatar"}
                        >
                            {initial}
                        </div>
                    );
                })()}
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {user?.name ?? "User"}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] truncate">
                        {user?.email ?? ""}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {onOpenSettings && (
                        <button
                            onClick={() => onOpenSettings("profile")}
                            className="px-2 py-1 text-[11px] rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            Settings
                        </button>
                    )}
                    <SignOutButton />
                </div>
            </div>
        </div>
    );
}
