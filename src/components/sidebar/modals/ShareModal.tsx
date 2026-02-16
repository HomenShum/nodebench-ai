import { useState, useCallback } from "react";
import { X, Link2, Check, Globe, Lock } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

interface ShareModalProps {
    isOpen: boolean;
    selectedDocuments: Set<Id<"documents">>;
    sharePublic: boolean;
    onSharePublicChange: (value: boolean) => void;
    onClose: () => void;
    onApply: () => void;
}

/**
 * Share Modal Component
 * Modal for changing document sharing settings (public/private)
 * Shows a copyable public link when sharing is enabled.
 */
export function ShareModal({
    isOpen,
    selectedDocuments,
    sharePublic,
    onSharePublicChange,
    onClose,
    onApply
}: ShareModalProps) {
    const [linkCopied, setLinkCopied] = useState(false);

    const documentId = selectedDocuments.size === 1
        ? Array.from(selectedDocuments)[0]
        : null;

    const publicUrl = documentId
        ? `${window.location.origin}/documents?doc=${documentId}`
        : null;

    const handleCopyLink = useCallback(() => {
        if (!publicUrl) return;
        navigator.clipboard.writeText(publicUrl).then(() => {
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        });
    }, [publicUrl]);

    const handleApplyAndCopy = useCallback(() => {
        onApply();
        if (sharePublic && publicUrl) {
            navigator.clipboard.writeText(publicUrl).then(() => {
                setLinkCopied(true);
                setTimeout(() => {
                    setLinkCopied(false);
                    onClose();
                }, 1500);
            });
        }
    }, [onApply, sharePublic, publicUrl, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="text-base font-semibold text-[var(--text-primary)]">Share</div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                        <X className="h-4 w-4 text-[var(--text-secondary)]" />
                    </button>
                </div>

                {/* Toggle */}
                <button
                    type="button"
                    onClick={() => onSharePublicChange(!sharePublic)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                        sharePublic
                            ? 'border-indigo-200 dark:border-indigo-800/40 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        sharePublic
                            ? 'bg-indigo-100 dark:bg-indigo-800/30 text-indigo-600 dark:text-indigo-400'
                            : 'bg-gray-100 dark:bg-white/[0.06] text-gray-400'
                    }`}>
                        {sharePublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                            {sharePublic ? 'Public — anyone with the link' : 'Private — only you'}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                            {sharePublic
                                ? 'Anyone can view this document'
                                : 'Click to make shareable'
                            }
                        </div>
                    </div>
                    <div className={`w-10 h-5 rounded-full transition-colors duration-200 relative ${
                        sharePublic ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            sharePublic ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                    </div>
                </button>

                {/* Public link section — shown when public and single document */}
                {sharePublic && publicUrl && (
                    <div className="mt-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                        <div className="text-xs font-medium text-[var(--text-muted)] mb-2">Share link</div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-3 py-2 rounded-lg truncate font-mono">
                                {publicUrl}
                            </div>
                            <button
                                onClick={handleCopyLink}
                                className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                                    linkCopied
                                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                        : 'bg-[var(--accent-primary)] text-white hover:opacity-90'
                                }`}
                            >
                                {linkCopied ? (
                                    <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Copied</span>
                                ) : (
                                    <span className="flex items-center gap-1"><Link2 className="w-3 h-3" /> Copy</span>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-[var(--border-color)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApplyAndCopy}
                        className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        {sharePublic ? 'Share & Copy Link' : 'Apply'}
                    </button>
                </div>
            </div>
        </div>
    );
}
