/**
 * Telegram Agent Handler
 *
 * Processes admitted Telegram commands and notification preferences.
 * Research queries currently receive an explicit unavailable response.
 *
 * Flow:
 * 1. User sends message to Telegram bot
 * 2. Telegram webhook → HTTP handler → this module
 * 3. Authenticate and validate the update before dispatch
 * 4. Handle the command or disclose unavailable research integration
 * 5. Acknowledge successful delivery; failures remain retryable
 *
 * @module integrations/telegramAgent
 */

import { v } from "convex/values";
import { internalAction, httpAction } from "../../_generated/server";
import type { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { TelegramUpdate } from "./telegram";
import {
  getTelegramWebhookSecret,
  readTelegramJson,
  TELEGRAM_UPDATE_MAX_BYTES,
  TelegramHttpError,
  withTelegramDeadline,
} from "./telegramHttp";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const MAX_MESSAGE_LENGTH = 4096; // Telegram limit
const COMMANDS = {
  START: "/start",
  HELP: "/help",
  STATUS: "/status",
  FUNDING: "/funding",
  NEWS: "/news",
  STOP: "/stop",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════════════════════

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isChatId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value !== 0;
}

/** Validate exactly the fields passed to the existing internal handlers. */
function isTelegramUpdate(value: unknown): value is TelegramUpdate {
  if (!isRecord(value) || typeof value.update_id !== "number" ||
      !Number.isSafeInteger(value.update_id) || value.update_id < 0) return false;
  if (value.message !== undefined && value.callback_query !== undefined) return false;
  if (value.message !== undefined) {
    const message = value.message;
    if (!isRecord(message) || typeof message.message_id !== "number" ||
        !Number.isSafeInteger(message.message_id) || message.message_id < 0 ||
        !isRecord(message.chat) || !isChatId(message.chat.id) ||
        (message.text !== undefined && typeof message.text !== "string")) return false;
    if (message.from !== undefined &&
        (!isRecord(message.from) || !isChatId(message.from.id) ||
         (message.from.username !== undefined && typeof message.from.username !== "string") ||
         (message.from.first_name !== undefined && typeof message.from.first_name !== "string"))) return false;
  }
  if (value.callback_query !== undefined) {
    const callback = value.callback_query;
    if (!isRecord(callback) || typeof callback.id !== "string" || !callback.id ||
        !isRecord(callback.from) || !isChatId(callback.from.id) ||
        (callback.data !== undefined && typeof callback.data !== "string")) return false;
    if (callback.message !== undefined &&
        (!isRecord(callback.message) || !isRecord(callback.message.chat) || !isChatId(callback.message.chat.id))) return false;
  }
  return true;
}

/**
 * HTTP webhook handler for Telegram updates.
 * Register this in convex/http.ts
 */
export const telegramWebhookHandler = httpAction(async (ctx, request) => {
  try {
    const secret = getTelegramWebhookSecret();
    if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== secret) {
      return new Response("Unauthorized", { status: 401 });
    }
    const update = await withTelegramDeadline(signal =>
      readTelegramJson(request, TELEGRAM_UPDATE_MAX_BYTES, signal));
    if (!isTelegramUpdate(update)) throw new TelegramHttpError(400, "Invalid Telegram update");

    // Handle text messages
    if (update.message?.text?.trim()) {
      await ctx.runAction(internal.domains.integrations.telegramAgent.handleMessage, {
        update,
      });
      return new Response("OK", { status: 200 });
    }

    // Handle callback queries (button presses)
    if (update.callback_query) {
      await ctx.runAction(internal.domains.integrations.telegramAgent.handleCallbackQuery, {
        callbackQueryId: update.callback_query.id,
        chatId: String(update.callback_query.message?.chat.id ?? update.callback_query.from.id),
        data: update.callback_query.data ?? "",
      });
      return new Response("OK", { status: 200 });
    }

    return new Response(null, { status: 204, headers: { "X-Telegram-Update": "ignored" } });
  } catch (error) {
    // Telegram retries non-2xx updates. Earlier effects can already exist;
    // this boundary does not promise exactly-once delivery.
    const status = error instanceof TelegramHttpError ? error.status : 500;
    return new Response(status < 500 ? "Invalid Telegram request" : "Telegram processing failed", { status });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Process incoming Telegram message.
 */
export const handleMessage = internalAction({
  args: {
    update: v.any(),
  },
  handler: async (ctx, args): Promise<void> => {
    const update = args.update as TelegramUpdate;
    const message = update.message;

    if (!message?.text || !message.chat) {
      return;
    }

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const username = message.from?.username;
    const firstName = message.from?.first_name;

    // Log incoming message
    await ctx.runMutation(internal.domains.integrations.telegram.logTelegramMessage, {
      telegramChatId: chatId,
      messageText: text,
      messageType: "incoming",
      messageId: message.message_id,
    });

    // Register/update user
    await ctx.runMutation(internal.domains.integrations.telegram.registerTelegramUser, {
      telegramChatId: chatId,
      telegramUsername: username,
      firstName: firstName,
    });

    // Handle commands
    if (text.startsWith("/")) {
      await handleCommand(ctx, chatId, text);
      return;
    }

    // Disclose the currently unavailable research integration.
    await processAgentQuery(ctx, chatId, text);
  },
});

/**
 * Require a real delivery acknowledgement on webhook processing paths.
 */
async function sendRequiredReply(
  ctx: ActionCtx,
  args: { chatId: string; text: string; parseMode?: "Markdown"; disablePreview?: boolean },
): Promise<void> {
  const delivery = await ctx.runAction(internal.domains.integrations.telegram.sendMessage, args);
  if (!delivery.sent) throw new TelegramHttpError(502, "Telegram delivery failed");
}

async function handleCommand(
  ctx: ActionCtx,
  chatId: string,
  command: string,
): Promise<void> {
  const cmd = command.toLowerCase().split(" ")[0];
  switch (cmd) {
    case COMMANDS.START: {
      const preference = await ctx.runMutation(internal.domains.integrations.telegram.toggleNotifications, {
        telegramChatId: chatId,
        enabled: true,
      });
      if (!preference.success) throw new Error("Telegram notification preference update failed");
      await sendRequiredReply(ctx, {
        chatId,
        text: `*Welcome to NodeBench AI!*

Notifications are enabled for this chat. Research search is not connected to this bot yet.

*Commands:*
/help - Available commands
/status - Integration capabilities
/funding or /news - Research availability notice
/stop - Disable proactive notifications
/start - Re-enable proactive notifications`,
        parseMode: "Markdown",
      });
      return;
    }
    case COMMANDS.HELP:
      await sendRequiredReply(ctx, {
        chatId,
        text: `*NodeBench AI Bot commands*

/start - Enable proactive notifications
/stop - Disable proactive notifications
/status - Integration capabilities
/funding or /news - Research availability notice

Research search is not connected. Questions receive an availability notice, not researched answers.`,
        parseMode: "Markdown",
      });
      return;
    case COMMANDS.STATUS:
      await sendRequiredReply(ctx, {
        chatId,
        text: `*Telegram integration*

Commands and notification preferences are implemented. Research search is not connected. This response is not a health check of external search providers.`,
        parseMode: "Markdown",
      });
      return;
    case COMMANDS.FUNDING:
      await processAgentQuery(ctx, chatId, "What funding announcements happened today?");
      return;
    case COMMANDS.NEWS:
      await processAgentQuery(ctx, chatId, "What's the latest tech and AI news today?");
      return;
    case COMMANDS.STOP: {
      const preference = await ctx.runMutation(internal.domains.integrations.telegram.toggleNotifications, {
        telegramChatId: chatId,
        enabled: false,
      });
      if (!preference.success) throw new Error("Telegram notification preference update failed");
      await sendRequiredReply(ctx, {
        chatId,
        text: "Notifications disabled. Send /start to re-enable.",
      });
      return;
    }
    default:
      await sendRequiredReply(ctx, {
        chatId,
        text: "Unknown command. Try /help for available commands.",
      });
  }
}

/** Reply honestly while the research-agent integration is unavailable. */
async function processAgentQuery(
  ctx: ActionCtx,
  chatId: string,
  query: string,
): Promise<void> {
  // Plain text avoids treating the user's query as Telegram Markdown.
  const response = formatForTelegram(`Research search is not connected to this bot. No search or agent research was performed. Use /help for the available commands.

Query: ${query}`);
  await sendRequiredReply(ctx, { chatId, text: response, disablePreview: true });
  // Do not claim an outgoing message until its provider delivery succeeded.
  await ctx.runMutation(internal.domains.integrations.telegram.logTelegramMessage, {
    telegramChatId: chatId,
    messageText: response,
    messageType: "outgoing",
    agentResponse: response,
  });
}

/**
 * Keep the plain-text availability response within Telegram's length limit.
 */
function formatForTelegram(text: string): string {
  // Truncate if too long
  if (text.length > MAX_MESSAGE_LENGTH) {
    return text.slice(0, MAX_MESSAGE_LENGTH - 50) + "\n\n(truncated)";
  }
  return text;
}

// ═══════════════════════════════════════════════════════════════════════════
// CALLBACK QUERY HANDLER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handle callback queries from inline keyboard buttons.
 */
export const handleCallbackQuery = internalAction({
  args: {
    callbackQueryId: v.string(),
    chatId: v.string(),
    data: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    // Acknowledge the button press; do not hide a rejected acknowledgement.
    const acknowledgement = await ctx.runAction(internal.domains.integrations.telegram.answerCallbackQuery, {
      callbackQueryId: args.callbackQueryId,
    });
    if (!acknowledgement.ok) throw new TelegramHttpError(502, "Telegram callback acknowledgement failed");

    // Parse callback data
    const [action, ...params] = args.data.split(":");

    switch (action) {
      case "more":
        // Request more details about something
        await processAgentQuery(ctx, args.chatId, `Tell me more about ${params.join(":")}`);
        break;

      case "funding":
        // Quick funding lookup
        await processAgentQuery(ctx, args.chatId, "What are today's funding announcements?");
        break;

      case "news":
        // Quick news lookup
        await processAgentQuery(ctx, args.chatId, "What's the latest tech news?");
        break;

      case "refresh":
        // Re-run the last query
        // TODO: Implement message history lookup
        await sendRequiredReply(ctx, {
          chatId: args.chatId,
          text: "Refresh is not implemented in this integration.",
        });
        break;

      default:
        // The button was acknowledged; this callback has no implemented action.
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// PROACTIVE NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send a notification to a Telegram user.
 * Used by other parts of the system (digest, alerts, etc.)
 */
export const sendTelegramNotification = internalAction({
  args: {
    telegramChatId: v.string(),
    title: v.string(),
    body: v.string(),
    buttons: v.optional(
      v.array(
        v.array(
          v.object({
            text: v.string(),
            callbackData: v.optional(v.string()),
            url: v.optional(v.string()),
          })
        )
      )
    ),
  },
  handler: async (ctx, args) => {
    // Check if user has notifications enabled
    const user = await ctx.runQuery(internal.domains.integrations.telegram.getTelegramUser, {
      telegramChatId: args.telegramChatId,
    });

    if (!user?.notificationsEnabled) {
      return { sent: false, reason: "notifications_disabled" };
    }

    const text = `*${args.title}*\n\n${args.body}`;

    if (args.buttons) {
      return await ctx.runAction(internal.domains.integrations.telegram.sendMessageWithButtons, {
        chatId: args.telegramChatId,
        text,
        buttons: args.buttons,
        parseMode: "Markdown",
      });
    }

    return await ctx.runAction(internal.domains.integrations.telegram.sendMessage, {
      chatId: args.telegramChatId,
      text,
      parseMode: "Markdown",
    });
  },
});

/**
 * Broadcast a message to all users with notifications enabled.
 */
export const broadcastToAllUsers = internalAction({
  args: {
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all users with notifications enabled
    // Note: This is a simplified implementation - in production,
    // you'd want pagination and rate limiting

    const text = `*${args.title}*\n\n${args.body}`;
    let sent = 0;
    let failed = 0;

    // TODO: Query all telegramUsers with notificationsEnabled = true
    // For now, this is a placeholder

    console.log(`[TelegramAgent] Broadcast complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  },
});
