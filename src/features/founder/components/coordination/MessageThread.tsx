/**
 * MessageThread — Threaded messaging between peers, Slack-like.
 * Unread indicators, compose area, auto-scroll.
 */

import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare } from "lucide-react";
import type { SharedContextMessage, MessageClass } from "../../types/sharedContext";

function peerLabel(peerId: string): string {
  const parts = peerId.split(":");
  return parts[parts.length - 1]?.replaceAll("_", " ") ?? peerId;
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

function typeColor(type: MessageClass): string {
  switch (type) {
    case "task_handoff": return "border-l-[#d97757]";
    case "status_update": return "border-l-blue-400/50";
    case "verdict": return "border-l-emerald-400/50";
    case "escalation": return "border-l-amber-400/50";
    case "context_offer": return "border-l-purple-400/50";
    default: return "border-l-white/10";
  }
}

interface Props {
  messages: SharedContextMessage[];
  currentPeerId?: string;
  peerIds?: string[];
  onSend?: (toPeerId: string, body: string) => void;
}

export function MessageThread({ messages, currentPeerId, peerIds = [], onSend }: Props) {
  const [composeBody, setComposeBody] = useState("");
  const [composeTo, setComposeTo] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const sorted = [...messages].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });

  function handleSend() {
    if (!composeTo || !composeBody.trim() || !onSend) return;
    onSend(composeTo, composeBody.trim());
    setComposeBody("");
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
          <MessageSquare className="h-3.5 w-3.5" />
          Messages
        </h3>
        {messages.filter((m) => !m.acknowledged).length > 0 && (
          <span className="text-xs font-medium text-[#d97757]">
            {messages.filter((m) => !m.acknowledged).length} unread
          </span>
        )}
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="max-h-64 space-y-1.5 overflow-y-auto"
        role="log"
        aria-label="Message thread"
        aria-live="polite"
      >
        {sorted.map((msg) => {
          const isOwn = msg.fromPeerId === currentPeerId;
          return (
            <div
              key={msg.messageId}
              className={`rounded-lg border-l-2 bg-white/[0.01] px-3 py-2 ${typeColor(msg.messageType)} ${
                !msg.acknowledged ? "border border-[#d97757]/20" : "border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium ${isOwn ? "text-[#d97757]" : "text-white/50"}`}>
                  {peerLabel(msg.fromPeerId)}
                </span>
                <span className="text-[10px] text-white/15">→</span>
                <span className="text-[10px] text-white/30">{peerLabel(msg.toPeerId)}</span>
                <span className="ml-auto text-[10px] text-white/15 font-mono">
                  {relativeTime(msg.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-xs text-white/50 leading-relaxed">{msg.content}</p>
              <span className="mt-1 inline-block rounded bg-white/5 px-1 py-0.5 text-[9px] text-white/20">
                {msg.messageType.replaceAll("_", " ")}
              </span>
            </div>
          );
        })}

        {messages.length === 0 && (
          <p className="py-6 text-center text-xs text-white/30">
            No messages yet
          </p>
        )}
      </div>

      {/* Compose area */}
      {onSend && (
        <div className="mt-3 flex gap-2 border-t border-white/[0.04] pt-3">
          <select
            value={composeTo}
            onChange={(e) => setComposeTo(e.target.value)}
            className="h-8 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white/60"
            aria-label="Recipient"
          >
            <option value="">To...</option>
            {peerIds
              .filter((id) => id !== currentPeerId)
              .map((id) => (
                <option key={id} value={id}>{peerLabel(id)}</option>
              ))}
          </select>
          <input
            value={composeBody}
            onChange={(e) => setComposeBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="h-8 flex-1 rounded-md border border-white/10 bg-white/5 px-3 text-xs text-white/70 placeholder:text-white/20"
            aria-label="Message"
          />
          <button
            onClick={handleSend}
            disabled={!composeTo || !composeBody.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[#d97757]/20 text-[#d97757] transition-colors hover:bg-[#d97757]/30 disabled:opacity-30"
            type="button"
            aria-label="Send message"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
