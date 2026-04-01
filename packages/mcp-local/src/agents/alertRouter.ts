/**
 * alertRouter.ts — Multi-channel alert delivery (Crucix pattern).
 *
 * Routes sweep signals to Telegram, Discord, Slack, or webhooks
 * based on severity tier (FLASH/PRIORITY/ROUTINE).
 *
 * Setup: set env vars for the channels you want:
 * - TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
 * - DISCORD_WEBHOOK_URL
 * - SLACK_WEBHOOK_URL
 * - ALERT_WEBHOOK_URL (generic)
 */

import type { SweepSignal } from "../sweep/types.js";

export interface AlertConfig {
  telegram?: { botToken: string; chatId: string };
  discord?: { webhookUrl: string };
  slack?: { webhookUrl: string };
  generic?: { webhookUrl: string };
  minSeverity: "flash" | "priority" | "routine";
}

export function getAlertConfig(): AlertConfig {
  return {
    telegram: process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
      ? { botToken: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID }
      : undefined,
    discord: process.env.DISCORD_WEBHOOK_URL
      ? { webhookUrl: process.env.DISCORD_WEBHOOK_URL }
      : undefined,
    slack: process.env.SLACK_WEBHOOK_URL
      ? { webhookUrl: process.env.SLACK_WEBHOOK_URL }
      : undefined,
    generic: process.env.ALERT_WEBHOOK_URL
      ? { webhookUrl: process.env.ALERT_WEBHOOK_URL }
      : undefined,
    minSeverity: (process.env.ALERT_MIN_SEVERITY as AlertConfig["minSeverity"]) ?? "priority",
  };
}

const SEV_ORDER = { flash: 3, priority: 2, routine: 1 };

function shouldAlert(signal: SweepSignal, config: AlertConfig): boolean {
  return SEV_ORDER[signal.severity] >= SEV_ORDER[config.minSeverity];
}

function formatMessage(signal: SweepSignal): string {
  const emoji = signal.severity === "flash" ? "🔴" : signal.severity === "priority" ? "🟡" : "🔵";
  return `${emoji} [${signal.severity.toUpperCase()}] ${signal.entity}\n${signal.headline}${signal.url ? `\n${signal.url}` : ""}`;
}

export async function sendAlert(signal: SweepSignal, config?: AlertConfig): Promise<{ sent: string[]; failed: string[] }> {
  const cfg = config ?? getAlertConfig();
  if (!shouldAlert(signal, cfg)) return { sent: [], failed: [] };

  const msg = formatMessage(signal);
  const sent: string[] = [];
  const failed: string[] = [];

  // Telegram
  if (cfg.telegram) {
    try {
      const resp = await fetch(`https://api.telegram.org/bot${cfg.telegram.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: cfg.telegram.chatId, text: msg, parse_mode: "Markdown" }),
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) sent.push("telegram"); else failed.push("telegram");
    } catch { failed.push("telegram"); }
  }

  // Discord webhook
  if (cfg.discord) {
    try {
      const color = signal.severity === "flash" ? 0xFF0000 : signal.severity === "priority" ? 0xFFAA00 : 0x0088FF;
      const resp = await fetch(cfg.discord.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{ title: `${signal.entity} — ${signal.severity.toUpperCase()}`, description: signal.headline, url: signal.url, color }],
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) sent.push("discord"); else failed.push("discord");
    } catch { failed.push("discord"); }
  }

  // Slack webhook
  if (cfg.slack) {
    try {
      const resp = await fetch(cfg.slack.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg }),
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) sent.push("slack"); else failed.push("slack");
    } catch { failed.push("slack"); }
  }

  // Generic webhook
  if (cfg.generic) {
    try {
      const resp = await fetch(cfg.generic.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal, message: msg }),
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) sent.push("generic"); else failed.push("generic");
    } catch { failed.push("generic"); }
  }

  return { sent, failed };
}

/**
 * Send alerts for all signals above the severity threshold.
 * Deduplicates by signal ID (Crucix semantic dedup pattern).
 */
const sentAlertIds = new Set<string>();
const MAX_SENT_CACHE = 500;

export async function alertOnNewSignals(signals: SweepSignal[]): Promise<{ alertsSent: number; channels: string[] }> {
  const config = getAlertConfig();
  let alertsSent = 0;
  const channels = new Set<string>();

  for (const signal of signals) {
    if (sentAlertIds.has(signal.id)) continue; // Dedup
    if (!shouldAlert(signal, config)) continue;

    const result = await sendAlert(signal, config);
    if (result.sent.length > 0) {
      alertsSent++;
      sentAlertIds.add(signal.id);
      result.sent.forEach(c => channels.add(c));
    }
  }

  // Bounded dedup cache
  if (sentAlertIds.size > MAX_SENT_CACHE) {
    const toDelete = [...sentAlertIds].slice(0, sentAlertIds.size - MAX_SENT_CACHE);
    toDelete.forEach(id => sentAlertIds.delete(id));
  }

  return { alertsSent, channels: [...channels] };
}
