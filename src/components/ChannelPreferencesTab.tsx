import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import {
  CheckCircle,
  ChevronUp,
  ChevronDown,
  Clock,
  Shield,
  Radio,
  Send,
  Bell,
  Smartphone,
  Mail,
  MessageSquare,
  Hash,
  Globe,
  Monitor,
} from "lucide-react";

/* ================================================================== */
/* CHANNEL METADATA                                                    */
/* ================================================================== */

interface ChannelMeta {
  id: string;
  label: string;
  description: string;
  providerType: "native" | "openclaw";
  icon: React.ReactNode;
  color: string;
  identifierLabel: string;
  identifierPlaceholder: string;
}

const CHANNELS: ChannelMeta[] = [
  // Native channels
  { id: "ui", label: "In-App UI", description: "Notifications inside the app", providerType: "native", icon: <Monitor className="h-4 w-4 text-white" />, color: "bg-gray-600", identifierLabel: "User ID", identifierPlaceholder: "auto-detected" },
  { id: "ntfy", label: "ntfy Push", description: "Push notifications via ntfy topics", providerType: "native", icon: <Bell className="h-4 w-4 text-white" />, color: "bg-green-500", identifierLabel: "Topic", identifierPlaceholder: "my-topic" },
  { id: "email", label: "Email", description: "Email notifications via Resend", providerType: "native", icon: <Mail className="h-4 w-4 text-white" />, color: "bg-red-500", identifierLabel: "Email", identifierPlaceholder: "you@example.com" },
  { id: "sms", label: "SMS", description: "Text messages via Twilio", providerType: "native", icon: <Smartphone className="h-4 w-4 text-white" />, color: "bg-blue-500", identifierLabel: "Phone", identifierPlaceholder: "+15555550123" },
  { id: "slack", label: "Slack", description: "Slack workspace messages", providerType: "native", icon: <Hash className="h-4 w-4 text-white" />, color: "bg-purple-500", identifierLabel: "Channel/DM", identifierPlaceholder: "#general or @user" },
  { id: "discord", label: "Discord", description: "Discord server messages", providerType: "native", icon: <MessageSquare className="h-4 w-4 text-white" />, color: "bg-indigo-500", identifierLabel: "Channel ID", identifierPlaceholder: "123456789012345678" },
  { id: "telegram", label: "Telegram", description: "Telegram Bot API messages", providerType: "native", icon: <Send className="h-4 w-4 text-white" />, color: "bg-sky-500", identifierLabel: "Chat ID", identifierPlaceholder: "123456789" },
  // OpenClaw Gateway channels
  { id: "whatsapp", label: "WhatsApp", description: "Via OpenClaw Gateway (Baileys)", providerType: "openclaw", icon: <Smartphone className="h-4 w-4 text-white" />, color: "bg-emerald-500", identifierLabel: "Phone", identifierPlaceholder: "+15555550123" },
  { id: "signal", label: "Signal", description: "Via OpenClaw Gateway", providerType: "openclaw", icon: <Shield className="h-4 w-4 text-white" />, color: "bg-blue-600", identifierLabel: "Phone", identifierPlaceholder: "+15555550123" },
  { id: "imessage", label: "iMessage", description: "Via OpenClaw Gateway (macOS)", providerType: "openclaw", icon: <MessageSquare className="h-4 w-4 text-white" />, color: "bg-blue-400", identifierLabel: "Phone/Email", identifierPlaceholder: "+15555550123" },
  { id: "msteams", label: "MS Teams", description: "Via OpenClaw Gateway", providerType: "openclaw", icon: <Globe className="h-4 w-4 text-white" />, color: "bg-violet-600", identifierLabel: "User ID", identifierPlaceholder: "user@org.com" },
  { id: "matrix", label: "Matrix", description: "Via OpenClaw Gateway", providerType: "openclaw", icon: <Radio className="h-4 w-4 text-white" />, color: "bg-gray-800", identifierLabel: "Matrix ID", identifierPlaceholder: "@user:matrix.org" },
  { id: "webchat", label: "WebChat", description: "Via OpenClaw Gateway widget", providerType: "openclaw", icon: <Globe className="h-4 w-4 text-white" />, color: "bg-teal-500", identifierLabel: "Session", identifierPlaceholder: "auto-generated" },
];

function getChannelMeta(id: string): ChannelMeta | undefined {
  return CHANNELS.find((c) => c.id === id);
}

/* ================================================================== */
/* CHANNEL CONFIG ROW                                                  */
/* ================================================================== */

interface ChannelConfig {
  channelId: string;
  enabled: boolean;
  identifier: string;
  optedIn: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  maxPerDay?: number;
  contentTypes?: string[];
}

function ChannelRow({
  config,
  meta,
  inFallback,
  fallbackIndex,
  totalFallback,
  onToggle,
  onUpdate,
  onMoveUp,
  onMoveDown,
}: {
  config: ChannelConfig;
  meta: ChannelMeta;
  inFallback: boolean;
  fallbackIndex: number;
  totalFallback: number;
  onToggle: () => void;
  onUpdate: (patch: Partial<ChannelConfig>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      data-testid={`channel-row-${meta.id}`}
      className={`rounded-lg border ${config.enabled ? "border-blue-200 dark:border-blue-800/30 bg-blue-50/30 dark:bg-blue-950/10" : "border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]"} transition-colors`}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 p-3">
        {/* Icon */}
        <div className={`w-8 h-8 ${meta.color} rounded-full flex items-center justify-center flex-shrink-0`}>
          {meta.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{meta.label}</span>
            {meta.providerType === "openclaw" && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">OpenClaw</span>
            )}
            {inFallback && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                #{fallbackIndex + 1} priority
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{meta.description}</div>
        </div>

        {/* Fallback reorder */}
        {config.enabled && (
          <div className="flex flex-col gap-0.5">
            <button
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-white/[0.06] disabled:opacity-30"
              onClick={onMoveUp}
              disabled={fallbackIndex <= 0}
              title="Move up in priority"
              data-testid={`channel-move-up-${meta.id}`}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-white/[0.06] disabled:opacity-30"
              onClick={onMoveDown}
              disabled={fallbackIndex >= totalFallback - 1}
              title="Move down in priority"
              data-testid={`channel-move-down-${meta.id}`}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Toggle */}
        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={config.enabled}
            onChange={onToggle}
            data-testid={`channel-toggle-${meta.id}`}
          />
          <div className="w-11 h-6 bg-gray-200 dark:bg-white/[0.12] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
        </label>

        {/* Expand/collapse config */}
        {config.enabled && (
          <button
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/[0.06] text-xs text-gray-500"
            onClick={() => setExpanded((v) => !v)}
            data-testid={`channel-expand-${meta.id}`}
          >
            {expanded ? "Hide" : "Configure"}
          </button>
        )}
      </div>

      {/* Expanded config */}
      {expanded && config.enabled && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-white/[0.04] space-y-3" data-testid={`channel-config-${meta.id}`}>
          {/* Identifier */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{meta.identifierLabel}</label>
            <input
              type="text"
              className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.04]"
              placeholder={meta.identifierPlaceholder}
              value={config.identifier}
              onChange={(e) => onUpdate({ identifier: e.target.value })}
              data-testid={`channel-identifier-${meta.id}`}
            />
          </div>

          {/* Opt-in consent */}
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 text-blue-600 rounded border-gray-300 dark:border-gray-600"
              checked={config.optedIn}
              onChange={(e) => onUpdate({ optedIn: e.target.checked })}
              data-testid={`channel-optin-${meta.id}`}
            />
            <span className="text-gray-700 dark:text-gray-300">I consent to receive messages on this channel</span>
          </label>

          {/* Quiet hours */}
          <div className="flex items-center gap-3">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <label className="text-xs text-gray-600 dark:text-gray-400">Quiet hours:</label>
            <input
              type="time"
              className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.04]"
              value={config.quietHoursStart ?? ""}
              onChange={(e) => onUpdate({ quietHoursStart: e.target.value || undefined })}
              data-testid={`channel-quiet-start-${meta.id}`}
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="time"
              className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.04]"
              value={config.quietHoursEnd ?? ""}
              onChange={(e) => onUpdate({ quietHoursEnd: e.target.value || undefined })}
              data-testid={`channel-quiet-end-${meta.id}`}
            />
          </div>

          {/* Max per day */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-600 dark:text-gray-400">Max messages/day:</label>
            <input
              type="number"
              className="w-20 px-2 py-1 text-xs rounded border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.04]"
              placeholder="No limit"
              min={0}
              value={config.maxPerDay ?? ""}
              onChange={(e) => onUpdate({ maxPerDay: e.target.value ? parseInt(e.target.value, 10) : undefined })}
              data-testid={`channel-max-per-day-${meta.id}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* MAIN TAB COMPONENT                                                  */
/* ================================================================== */

export function ChannelPreferencesTab() {
  const channelPrefs = useQuery(api.domains.messaging.channelPreferencesManager.getUserPreferences);
  const updateChannelPrefs = useMutation(api.domains.messaging.channelPreferencesManager.updateUserPreferences);

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Local state for editing
  const [preferredChannels, setPreferredChannels] = useState<string[]>(["ui", "email", "ntfy"]);
  const [configs, setConfigs] = useState<ChannelConfig[]>(() =>
    CHANNELS.map((ch) => ({
      channelId: ch.id,
      enabled: ch.id === "ui", // UI always enabled by default
      identifier: "",
      optedIn: ch.id === "ui", // UI always opted in
    })),
  );

  // Sync from server on load
  useEffect(() => {
    if (channelPrefs === undefined) return; // still loading
    if (channelPrefs === null) return; // no prefs yet, use defaults

    setPreferredChannels(channelPrefs.preferredChannels ?? ["ui", "email", "ntfy"]);

    setConfigs((prev) =>
      prev.map((c) => {
        const remote = channelPrefs.channelConfigs?.find((rc: any) => rc.channelId === c.channelId);
        return remote
          ? {
              channelId: c.channelId,
              enabled: remote.enabled,
              identifier: remote.identifier,
              optedIn: remote.optedIn,
              quietHoursStart: remote.quietHoursStart,
              quietHoursEnd: remote.quietHoursEnd,
              maxPerDay: remote.maxPerDay,
              contentTypes: remote.contentTypes,
            }
          : c;
      }),
    );
    setDirty(false);
  }, [channelPrefs]);

  const toggleChannel = useCallback((channelId: string) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.channelId === channelId ? { ...c, enabled: !c.enabled, optedIn: !c.enabled ? c.optedIn : false } : c,
      ),
    );
    setPreferredChannels((prev) => {
      const enabling = !configs.find((c) => c.channelId === channelId)?.enabled;
      if (enabling && !prev.includes(channelId)) {
        return [...prev, channelId];
      }
      if (!enabling) {
        return prev.filter((id) => id !== channelId);
      }
      return prev;
    });
    setDirty(true);
  }, [configs]);

  const updateConfig = useCallback((channelId: string, patch: Partial<ChannelConfig>) => {
    setConfigs((prev) =>
      prev.map((c) => (c.channelId === channelId ? { ...c, ...patch } : c)),
    );
    setDirty(true);
  }, []);

  const moveFallback = useCallback((channelId: string, direction: "up" | "down") => {
    setPreferredChannels((prev) => {
      const idx = prev.indexOf(channelId);
      if (idx < 0) return prev;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    setDirty(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const enabledConfigs = configs.filter((c) => c.enabled);
      await updateChannelPrefs({
        preferredChannels,
        channelConfigs: enabledConfigs.map((c) => ({
          channelId: c.channelId,
          enabled: c.enabled,
          identifier: c.identifier,
          optedIn: c.optedIn,
          quietHoursStart: c.quietHoursStart,
          quietHoursEnd: c.quietHoursEnd,
          maxPerDay: c.maxPerDay,
          contentTypes: c.contentTypes,
        })),
      });
      toast.success("Channel preferences saved");
      setDirty(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save channel preferences");
    } finally {
      setSaving(false);
    }
  };

  // Sort channels: enabled first (in fallback order), then disabled
  const enabledIds = new Set(configs.filter((c) => c.enabled).map((c) => c.channelId));
  const sortedChannels = [
    // Enabled channels in fallback order
    ...preferredChannels
      .filter((id) => enabledIds.has(id))
      .map((id) => CHANNELS.find((c) => c.id === id)!)
      .filter(Boolean),
    // Enabled but not in fallback (shouldn't happen, but defensive)
    ...CHANNELS.filter((c) => enabledIds.has(c.id) && !preferredChannels.includes(c.id)),
    // Disabled channels
    ...CHANNELS.filter((c) => !enabledIds.has(c.id)),
  ];

  const enabledCount = configs.filter((c) => c.enabled).length;
  const optedInCount = configs.filter((c) => c.enabled && c.optedIn).length;

  return (
    <div className="space-y-4" data-testid="channel-preferences-tab">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Messaging Channels</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configure where you receive notifications. Drag to reorder fallback priority.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-blue-600">{enabledCount}</span> enabled,{" "}
            <span className="font-medium text-green-600">{optedInCount}</span> consented
          </div>
          <button
            className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
            onClick={() => { void handleSave(); }}
            disabled={saving || !dirty}
            data-testid="channel-save-btn"
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <CheckCircle className="h-3.5 w-3.5" />
                {dirty ? "Save Changes" : "Saved"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Fallback chain summary */}
      {preferredChannels.length > 0 && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-950/20 p-3" data-testid="fallback-chain">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Fallback Chain</div>
          <div className="flex flex-wrap gap-1.5">
            {preferredChannels.filter((id) => enabledIds.has(id)).map((id, i, arr) => {
              const meta = getChannelMeta(id);
              return (
                <React.Fragment key={id}>
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-white dark:bg-white/[0.06] border border-blue-200 dark:border-blue-700/30 text-blue-700 dark:text-blue-300">
                    {meta?.label ?? id}
                  </span>
                  {i < arr.length - 1 && <span className="text-xs text-blue-400">→</span>}
                </React.Fragment>
              );
            })}
          </div>
          <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">
            Messages attempt channels left-to-right. If delivery fails, the next channel is tried.
          </div>
        </div>
      )}

      {/* Channel list */}
      <div className="space-y-2" data-testid="channel-list">
        {sortedChannels.map((meta) => {
          const config = configs.find((c) => c.channelId === meta.id)!;
          const fbIdx = preferredChannels.indexOf(meta.id);
          return (
            <ChannelRow
              key={meta.id}
              config={config}
              meta={meta}
              inFallback={config.enabled && fbIdx >= 0}
              fallbackIndex={fbIdx}
              totalFallback={preferredChannels.filter((id) => enabledIds.has(id)).length}
              onToggle={() => toggleChannel(meta.id)}
              onUpdate={(patch) => updateConfig(meta.id, patch)}
              onMoveUp={() => moveFallback(meta.id, "up")}
              onMoveDown={() => moveFallback(meta.id, "down")}
            />
          );
        })}
      </div>

      {/* Security notice */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/20 p-3">
        <div className="flex items-start gap-2">
          <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
            <div className="font-medium">Security Notes</div>
            <ul className="list-disc pl-4 space-y-0.5 text-amber-600 dark:text-amber-400">
              <li>WhatsApp (Baileys) uses an unofficial API — Meta may ban accounts. Use WhatsApp Business API for production.</li>
              <li>All outbound messages are scanned for PII/credential leaks before delivery.</li>
              <li>Message logs are retained for 30 days (GDPR compliance).</li>
              <li>OpenClaw Gateway channels require a local Gateway running at 127.0.0.1:18789.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
