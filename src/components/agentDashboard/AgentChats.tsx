import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export function AgentChats() {
  const threads = useQuery(api.chatThreads.listThreadsForUser as any, { limit: 50 }) as Array<{
    threadId: Id<"documents">;
    title: string;
    lastModified: number;
    messageCount: number;
    lastMessage?: { role: "user" | "assistant"; text: string; createdAt: number };
  }> | undefined;

  const rows = useMemo(() => (threads ?? []), [threads]);

  const openThread = (docId: Id<"documents">) => {
    try {
      // Hint the app shell to open this document
      window.dispatchEvent(new CustomEvent("ai:openMultipleDocuments", { detail: { documentIds: [docId] } }));
      // Fallback: navigate to Documents hub
      const base = "#documents";
      if (window.location.hash !== base) window.location.hash = base;
    } catch {}
  };

  return (
    <div className="h-full overflow-auto bg-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Chat History</h2>
            <p className="text-xs text-[var(--text-secondary)]">Threads saved from the AI Chat Panel</p>
          </div>
        </div>

        <div className="overflow-auto border border-[var(--border-color)] rounded-md bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)]">
              <tr>
                <th className="text-left px-3 py-2 border-b">Title</th>
                <th className="text-left px-3 py-2 border-b">Last Message</th>
                <th className="text-left px-3 py-2 border-b">Messages</th>
                <th className="text-left px-3 py-2 border-b">Updated</th>
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const updated = new Date(t.lastModified || 0).toLocaleString();
                const last = t.lastMessage ? `${t.lastMessage.role === 'user' ? 'You' : 'Assistant'}: ${t.lastMessage.text}` : '—';
                return (
                  <tr key={String(t.threadId)} className="odd:bg-white even:bg-[var(--bg-secondary)]">
                    <td className="px-3 py-2 border-b">
                      <button className="underline hover:no-underline" onClick={() => openThread(t.threadId)}>{t.title}</button>
                    </td>
                    <td className="px-3 py-2 border-b max-w-[520px] truncate" title={t.lastMessage?.text || ''}>{last}</td>
                    <td className="px-3 py-2 border-b">{t.messageCount}</td>
                    <td className="px-3 py-2 border-b whitespace-nowrap">{updated}</td>
                    <td className="px-3 py-2 border-b">
                      <button className="text-xs px-2 py-1 rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)]" onClick={() => openThread(t.threadId)}>Open</button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-[var(--text-secondary)]" colSpan={5}>No chat threads yet. Enable auto-save in the AI Chat Panel to record conversations.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

