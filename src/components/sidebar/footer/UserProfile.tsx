import { SignOutButton } from "../../../SignOutButton";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../../convex/_generated/api";

interface UserProfileProps {
    onOpenSettings?: (tab?: 'profile' | 'account' | 'usage' | 'integrations' | 'billing' | 'reminders') => void;
}

/**
 * User Profile Footer Component
 * Displays user avatar, name, email with Settings button and Sign Out
 * For anonymous users, shows "Login with Google" button to upgrade their account
 * Styled with gradient background similar to Welcome Landing
 */
export function UserProfile({ onOpenSettings }: UserProfileProps) {
    const user = useQuery(api.domains.auth.auth.loggedInUser);
    const { signIn } = useAuthActions();

    // Detect if user is anonymous (no email = anonymous login)
    const isAnonymous = !user?.email;

    const handleGoogleSignIn = () => {
        void signIn("google", {
            redirectTo: typeof window !== "undefined" ? window.location.href : "/",
        });
    };

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
                        {isAnonymous ? "Guest User" : (user?.name ?? "User")}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] truncate">
                        {isAnonymous ? "Sign in to save your data" : (user?.email ?? "")}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isAnonymous ? (
                        // Anonymous user: Show prominent "Login with Google" button
                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors shadow-sm"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Login with Google
                        </button>
                    ) : (
                        // Authenticated user: Show Settings and Sign Out
                        <>
                            {onOpenSettings && (
                                <button
                                    type="button"
                                    onClick={() => onOpenSettings("profile")}
                                    className="px-2 py-1 text-[11px] rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    Settings
                                </button>
                            )}
                            <SignOutButton />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
