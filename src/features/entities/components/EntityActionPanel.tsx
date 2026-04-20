import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { BriefcaseBusiness, FileJson, FileText, Link2, Mail, Send, Share2 } from "lucide-react";
import { useConvexApi } from "@/lib/convexApi";

type ActionKind = "link" | "brief" | "outreach" | "crm" | "markdown";

type EntityActionPanelProps = {
  anonymousSessionId: string;
  entitySlug: string;
  revisionId?: string | null;
  copyState: ActionKind | null;
  onCopyAction: (kind: ActionKind) => Promise<void> | void;
};

const EXPORT_ACTIONS: Array<{
  kind: ActionKind;
  label: string;
  icon: typeof Link2;
}> = [
  { kind: "brief", label: "Executive brief", icon: Share2 },
  { kind: "outreach", label: "Outreach memo", icon: BriefcaseBusiness },
  { kind: "crm", label: "CRM block", icon: FileJson },
  { kind: "markdown", label: "Markdown", icon: FileText },
  { kind: "link", label: "Share link", icon: Link2 },
];

export function EntityActionPanel({
  anonymousSessionId,
  entitySlug,
  revisionId,
  copyState,
  onCopyAction,
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
    <article className="nb-panel-soft space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="nb-section-kicker">Act on this</div>
          <p className="mt-2 text-sm leading-6 text-content-muted">
            Share the current revision as a brief, handoff, or structured export without leaving the report.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`nb-chip text-[10px] uppercase tracking-[0.18em] ${
              gmailConnected ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : ""
            }`}
          >
            Gmail {gmailConnected ? "connected" : "not connected"}
          </span>
          <span
            className={`nb-chip text-[10px] uppercase tracking-[0.18em] ${
              slackConnected ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : ""
            }`}
          >
            Slack {slackConnected ? "connected" : "not connected"}
          </span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
        <div className="nb-panel-inset p-3 sm:p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
            Share & export
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {EXPORT_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.kind}
                  type="button"
                  onClick={() => void onCopyAction(action.kind)}
                  className="nb-secondary-button justify-start px-3 py-2.5 text-sm"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {copyState === action.kind ? `Copied ${action.label.toLowerCase()}` : action.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="nb-panel-inset p-3 sm:p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
            Deliver
          </div>
          <div className="mt-3 space-y-3">
            <input
              type="email"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="name@company.com"
              className="nb-input-shell w-full rounded-2xl px-4 py-3 text-sm text-content placeholder:text-content-muted/55 focus:outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleCreateDraft()}
                disabled={!gmailConnected || gmailState === "working"}
                className="nb-primary-button px-4 py-2 text-sm disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                {gmailState === "working" ? "Creating..." : "Create Gmail draft"}
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
        </div>
      </div>

      {message ? (
        <div className="nb-panel-inset px-4 py-3 text-sm text-content-muted">
          {message}
        </div>
      ) : null}
    </article>
  );
}

export default EntityActionPanel;
