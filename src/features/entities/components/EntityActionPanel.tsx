import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Mail, Send } from "lucide-react";
import { useConvexApi } from "@/lib/convexApi";

type EntityActionPanelProps = {
  anonymousSessionId: string;
  entitySlug: string;
  revisionId?: string | null;
};

export function EntityActionPanel({
  anonymousSessionId,
  entitySlug,
  revisionId,
}: EntityActionPanelProps) {
  const api = useConvexApi();
  const connections = useQuery(
    api?.domains.product.delivery.getDeliveryConnections ?? "skip",
    api?.domains.product.delivery.getDeliveryConnections ? {} : "skip",
  );
  const createGmailDraft = useAction(
    api?.domains.product.delivery.createGmailDraftForEntity ?? ("skip" as any),
  );
  const sendToSlack = useAction(
    api?.domains.product.delivery.sendEntityToSlack ?? ("skip" as any),
  );

  const [recipient, setRecipient] = useState("");
  const [gmailState, setGmailState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [slackState, setSlackState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleCreateDraft = async () => {
    if (!recipient.trim()) {
      setGmailState("error");
      setMessage("Enter a recipient email first.");
      return;
    }
    setGmailState("working");
    setMessage(null);
    try {
      const result: any = await createGmailDraft({
        anonymousSessionId,
        entitySlug,
        revisionId: revisionId || undefined,
        to: recipient.trim(),
      });
      if (!result?.ok) {
        setGmailState("error");
        setMessage(result?.error || "Could not create Gmail draft.");
        return;
      }
      setGmailState("done");
      setMessage(`Draft created for ${result.recipient}.`);
    } catch (error) {
      setGmailState("error");
      setMessage(error instanceof Error ? error.message : "Could not create Gmail draft.");
    }
  };

  const handleSendSlack = async () => {
    setSlackState("working");
    setMessage(null);
    try {
      const result: any = await sendToSlack({
        anonymousSessionId,
        entitySlug,
        revisionId: revisionId || undefined,
      });
      if (!result?.ok) {
        setSlackState("error");
        setMessage(result?.error || "Could not send to Slack.");
        return;
      }
      setSlackState("done");
      setMessage("Sent to your Slack inbox.");
    } catch (error) {
      setSlackState("error");
      setMessage(error instanceof Error ? error.message : "Could not send to Slack.");
    }
  };

  const gmailConnected = Boolean(connections?.gmail?.connected);
  const slackConnected = Boolean(connections?.slack?.connected);

  return (
    <article className="space-y-4 rounded-[24px] border border-white/6 bg-white/[0.02] px-5 py-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
          Act on this memory
        </div>
        <p className="mt-2 text-sm leading-6 text-content-muted">
          Turn the current entity revision into a real outreach draft or a Slack handoff instead of copying text by hand.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${gmailConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.04] text-content-muted"}`}>
            Gmail {gmailConnected ? "connected" : "not connected"}
          </span>
          <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${slackConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.04] text-content-muted"}`}>
            Slack {slackConnected ? "connected" : "not connected"}
          </span>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted" htmlFor={`outreach-${entitySlug}`}>
            Gmail recipient
          </label>
          <input
            id={`outreach-${entitySlug}`}
            type="email"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="name@company.com"
            className="nb-input-shell w-full rounded-2xl px-4 py-3 text-sm text-content placeholder:text-content-muted/55 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleCreateDraft()}
            disabled={!gmailConnected || gmailState === "working"}
            className="nb-primary-button px-4 py-2 text-sm disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            {gmailState === "working" ? "Creating draft..." : "Create Gmail draft"}
          </button>
          <button
            type="button"
            onClick={() => void handleSendSlack()}
            disabled={!slackConnected || slackState === "working"}
            className="nb-secondary-button px-4 py-2 text-sm disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {slackState === "working" ? "Sending..." : "Send to Slack"}
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3 text-sm text-content-muted">
          {message}
        </div>
      ) : null}
    </article>
  );
}

export default EntityActionPanel;
