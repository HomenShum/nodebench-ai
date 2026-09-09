/**
 * Telegram Bot Integration
 *
 * Server-side messaging via the configured Telegram Bot API.
 * Delivery is subject to provider availability and rate limits.
 *
 * Features:
 * - Send messages with Markdown/HTML formatting
 * - Inline keyboards for quick actions
 * - Photo/document attachments
 * - Webhook-based message receiving
 *
 * Setup:
 * 1. Message @BotFather on Telegram: /newbot
 * 2. Set name and username (must end in "bot")
 * 3. Copy API token → TELEGRAM_BOT_TOKEN env var
 * 4. Configure TELEGRAM_WEBHOOK_SECRET and use the internal setWebhook action
 *
 * @see https://core.telegram.org/bots/api
 * @module integrations/telegram
 */

import { v } from "convex/values";
import { internalAction, internalQuery, internalMutation } from "../../_generated/server";
import {
  getTelegramWebhookSecret,
  readTelegramJson,
  TELEGRAM_RESPONSE_MAX_BYTES,
  TelegramHttpError,
  withTelegramDeadline,
} from "./telegramHttp";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Telegram inline keyboard button */
interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

/** Telegram inline keyboard markup */
interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

/** Telegram message options */
interface SendMessageOptions {
  parse_mode?: "Markdown" | "MarkdownV2" | "HTML";
  reply_markup?: InlineKeyboardMarkup;
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
}

/** Telegram API response */
interface TelegramResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

/** Telegram message object */
interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  chat: {
    id: number;
    type: "private" | "group" | "supergroup" | "channel";
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  date: number;
  text?: string;
  entities?: Array<{
    type: string;
    offset: number;
    length: number;
  }>;
}

/** Fields consumed by this integration from a Telegram webhook update. */
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
    from?: { id: number; username?: string; first_name?: string };
  };
  callback_query?: {
    id: string;
    from: { id: number };
    message?: { chat: { id: number } };
    data?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.length > 256 || !/^[A-Za-z0-9:_-]+$/.test(token)) {
    throw new TelegramHttpError(503, "Telegram bot token is not configured correctly");
  }
  return token;
}

/** Check the fields callers use before an ok:true provider result is trusted. */
function validTelegramResult(method: string, result: unknown): boolean {
  if (["answerCallbackQuery", "setWebhook", "deleteWebhook"].includes(method)) {
    return result === true;
  }
  if (!result || typeof result !== "object" || Array.isArray(result)) return false;
  const value = result as Record<string, unknown>;
  switch (method) {
    case "sendMessage":
    case "sendPhoto":
      return typeof value.message_id === "number" && Number.isSafeInteger(value.message_id) && value.message_id >= 0;
    case "getWebhookInfo":
      return typeof value.url === "string" && typeof value.pending_update_count === "number" &&
        Number.isSafeInteger(value.pending_update_count) && value.pending_update_count >= 0;
    case "getMe":
      return typeof value.id === "number" && Number.isSafeInteger(value.id) && value.id > 0 &&
        value.is_bot === true && typeof value.first_name === "string" &&
        (value.username === undefined || typeof value.username === "string");
    default:
      return false;
  }
}

async function callTelegramApi<T>(
  method: string,
  body: Record<string, unknown>
): Promise<TelegramResponse<T>> {
  const methods = ["sendMessage", "sendPhoto", "answerCallbackQuery", "setWebhook", "getWebhookInfo", "deleteWebhook", "getMe"];
  if (!methods.includes(method)) throw new Error("Unsupported Telegram method");
  const token = getBotToken();
  const url = `https://api.telegram.org/bot${token}/${method}`;
  return withTelegramDeadline(async signal => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      redirect: "error",
      signal,
    });
    const data = await readTelegramJson(response, TELEGRAM_RESPONSE_MAX_BYTES, signal);
    if (!response.ok) {
      throw new TelegramHttpError(502, `Telegram returned HTTP ${response.status}`);
    }
    if (!data || typeof data !== "object" || !("ok" in data) || typeof data.ok !== "boolean") {
      throw new TelegramHttpError(502, "Invalid Telegram response");
    }
    const payload = data as { ok: boolean; result?: T };
    if (payload.ok && !validTelegramResult(method, payload.result)) {
      throw new TelegramHttpError(502, "Invalid Telegram result");
    }
    return {
      ok: payload.ok,
      result: payload.result,
      // Provider error text can echo request data. Keep it out of callers/logs.
      description: payload.ok ? undefined : "Telegram rejected the request",
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SEND ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send a text message via Telegram.
 */
export const sendMessage = internalAction({
  args: {
    chatId: v.string(),
    text: v.string(),
    parseMode: v.optional(v.union(v.literal("Markdown"), v.literal("MarkdownV2"), v.literal("HTML"))),
    disablePreview: v.optional(v.boolean()),
    disableNotification: v.optional(v.boolean()),
    replyMarkup: v.optional(v.any()), // InlineKeyboardMarkup
  },
  handler: async (ctx, args): Promise<{ sent: boolean; messageId?: number; error?: string }> => {
    try {
      const body: Record<string, unknown> = {
        chat_id: args.chatId,
        text: args.text,
      };

      if (args.parseMode) body.parse_mode = args.parseMode;
      if (args.disablePreview) body.disable_web_page_preview = true;
      if (args.disableNotification) body.disable_notification = true;
      if (args.replyMarkup) body.reply_markup = args.replyMarkup;

      const response = await callTelegramApi<TelegramMessage>("sendMessage", body);

      if (response.ok && response.result) {
        return { sent: true, messageId: response.result.message_id };
      }

      return { sent: false, error: response.description };
    } catch (error) {
      const errorMsg = error instanceof TelegramHttpError ? error.message : "Telegram request failed";
      console.error("[Telegram] sendMessage failed:", errorMsg);
      return { sent: false, error: errorMsg };
    }
  },
});

/**
 * Send a message with inline keyboard buttons.
 */
export const sendMessageWithButtons = internalAction({
  args: {
    chatId: v.string(),
    text: v.string(),
    buttons: v.array(
      v.array(
        v.object({
          text: v.string(),
          callbackData: v.optional(v.string()),
          url: v.optional(v.string()),
        })
      )
    ),
    parseMode: v.optional(v.union(v.literal("Markdown"), v.literal("MarkdownV2"), v.literal("HTML"))),
  },
  handler: async (ctx, args): Promise<{ sent: boolean; messageId?: number; error?: string }> => {
    try {
      const inlineKeyboard = args.buttons.map((row: Array<{ text: string; callbackData?: string; url?: string }>) =>
        row.map((btn: { text: string; callbackData?: string; url?: string }) => ({
          text: btn.text,
          ...(btn.callbackData && { callback_data: btn.callbackData }),
          ...(btn.url && { url: btn.url }),
        }))
      );

      const body: Record<string, unknown> = {
        chat_id: args.chatId,
        text: args.text,
        reply_markup: { inline_keyboard: inlineKeyboard },
      };

      if (args.parseMode) body.parse_mode = args.parseMode;

      const response = await callTelegramApi<TelegramMessage>("sendMessage", body);

      if (response.ok && response.result) {
        return { sent: true, messageId: response.result.message_id };
      }

      return { sent: false, error: response.description };
    } catch (error) {
      const errorMsg = error instanceof TelegramHttpError ? error.message : "Telegram request failed";
      return { sent: false, error: errorMsg };
    }
  },
});

/**
 * Send a photo via Telegram.
 */
export const sendPhoto = internalAction({
  args: {
    chatId: v.string(),
    photoUrl: v.string(),
    caption: v.optional(v.string()),
    parseMode: v.optional(v.union(v.literal("Markdown"), v.literal("MarkdownV2"), v.literal("HTML"))),
  },
  handler: async (ctx, args): Promise<{ sent: boolean; messageId?: number; error?: string }> => {
    try {
      const body: Record<string, unknown> = {
        chat_id: args.chatId,
        photo: args.photoUrl,
      };

      if (args.caption) body.caption = args.caption;
      if (args.parseMode) body.parse_mode = args.parseMode;

      const response = await callTelegramApi<TelegramMessage>("sendPhoto", body);

      if (response.ok && response.result) {
        return { sent: true, messageId: response.result.message_id };
      }

      return { sent: false, error: response.description };
    } catch (error) {
      const errorMsg = error instanceof TelegramHttpError ? error.message : "Telegram request failed";
      return { sent: false, error: errorMsg };
    }
  },
});

/**
 * Answer a callback query (acknowledge button press).
 */
export const answerCallbackQuery = internalAction({
  args: {
    callbackQueryId: v.string(),
    text: v.optional(v.string()),
    showAlert: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ ok: boolean }> => {
    try {
      const body: Record<string, unknown> = {
        callback_query_id: args.callbackQueryId,
      };

      if (args.text) body.text = args.text;
      if (args.showAlert) body.show_alert = true;

      const response = await callTelegramApi("answerCallbackQuery", body);
      return { ok: response.ok };
    } catch (error) {
      return { ok: false };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK SETUP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Set the webhook URL for receiving updates.
 * Call this once after deployment to configure Telegram.
 */
export const setWebhook = internalAction({
  args: {
    webhookUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; description?: string }> => {
    try {
      const secret = getTelegramWebhookSecret();
      const webhookUrl = new URL(args.webhookUrl);
      if (webhookUrl.protocol !== "https:" || webhookUrl.username || webhookUrl.password) {
        throw new TelegramHttpError(400, "Webhook URL must use HTTPS without credentials");
      }
      const response = await callTelegramApi("setWebhook", {
        url: webhookUrl.href,
        secret_token: secret,
        allowed_updates: ["message", "callback_query"],
      });

      if (response.ok) {
        console.log("[Telegram] Webhook configured");
      }

      return { ok: response.ok, description: response.description };
    } catch (error) {
      const errorMsg = error instanceof TelegramHttpError ? error.message : "Telegram request failed";
      return { ok: false, description: errorMsg };
    }
  },
});

/**
 * Get current webhook info.
 */
export const getWebhookInfo = internalAction({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean; webhookUrl?: string; pendingUpdates?: number }> => {
    try {
      interface WebhookInfo {
        url: string;
        has_custom_certificate: boolean;
        pending_update_count: number;
        last_error_date?: number;
        last_error_message?: string;
      }

      const response = await callTelegramApi<WebhookInfo>("getWebhookInfo", {});

      if (response.ok && response.result) {
        return {
          ok: true,
          webhookUrl: response.result.url,
          pendingUpdates: response.result.pending_update_count,
        };
      }

      return { ok: false };
    } catch (error) {
      return { ok: false };
    }
  },
});

/**
 * Delete the current webhook.
 */
export const deleteWebhook = internalAction({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean }> => {
    try {
      const response = await callTelegramApi("deleteWebhook", {});
      return { ok: response.ok };
    } catch (error) {
      return { ok: false };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// TELEGRAM USER PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Store a user's Telegram chat ID for notifications.
 */
export const registerTelegramUser = internalMutation({
  args: {
    telegramChatId: v.string(),
    telegramUsername: v.optional(v.string()),
    firstName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user exists by telegram chat ID
    const existing = await ctx.db
      .query("telegramUsers")
      .withIndex("by_chat_id", (q) => q.eq("telegramChatId", args.telegramChatId))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        telegramUsername: args.telegramUsername,
        firstName: args.firstName,
        lastActiveAt: Date.now(),
      });
      return { userId: existing._id, isNew: false };
    }

    // Create new
    const userId = await ctx.db.insert("telegramUsers", {
      telegramChatId: args.telegramChatId,
      telegramUsername: args.telegramUsername,
      firstName: args.firstName,
      notificationsEnabled: true,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    });

    return { userId, isNew: true };
  },
});

/**
 * Get Telegram user by chat ID.
 */
export const getTelegramUser = internalQuery({
  args: {
    telegramChatId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("telegramUsers")
      .withIndex("by_chat_id", (q) => q.eq("telegramChatId", args.telegramChatId))
      .first();
  },
});

/**
 * Toggle notifications for a Telegram user.
 */
export const toggleNotifications = internalMutation({
  args: {
    telegramChatId: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("telegramUsers")
      .withIndex("by_chat_id", (q) => q.eq("telegramChatId", args.telegramChatId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        notificationsEnabled: args.enabled,
      });
      return { success: true };
    }

    return { success: false, error: "User not found" };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE LOGGING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log incoming Telegram message for audit/debugging.
 */
export const logTelegramMessage = internalMutation({
  args: {
    telegramChatId: v.string(),
    messageText: v.string(),
    messageType: v.union(v.literal("incoming"), v.literal("outgoing")),
    messageId: v.optional(v.number()),
    agentResponse: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("telegramMessages", {
      telegramChatId: args.telegramChatId,
      messageText: args.messageText,
      messageType: args.messageType,
      messageId: args.messageId,
      agentResponse: args.agentResponse,
      timestamp: Date.now(),
    });
  },
});

/**
 * Get recent messages for a chat.
 */
export const getRecentMessages = internalQuery({
  args: {
    telegramChatId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("History limit must be an integer from 1 to 100");
    }

    return await ctx.db
      .query("telegramMessages")
      .withIndex("by_chat_id", (q) => q.eq("telegramChatId", args.telegramChatId))
      .order("desc")
      .take(limit);
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if Telegram integration is configured.
 */
export const isConfigured = internalAction({
  args: {},
  handler: async (ctx): Promise<{ configured: boolean }> => {
    try {
      getBotToken();
      return { configured: true };
    } catch {
      return { configured: false };
    }
  },
});

/**
 * Get bot information.
 */
export const getBotInfo = internalAction({
  args: {},
  handler: async (ctx) => {
    try {
      interface BotInfo {
        id: number;
        is_bot: boolean;
        first_name: string;
        username?: string;
        can_join_groups: boolean;
        can_read_all_group_messages: boolean;
        supports_inline_queries: boolean;
      }

      const response = await callTelegramApi<BotInfo>("getMe", {});

      if (response.ok && response.result) {
        return {
          ok: true,
          botId: response.result.id,
          username: response.result.username,
          firstName: response.result.first_name,
        };
      }

      return { ok: false, error: response.description };
    } catch (error) {
      const errorMsg = error instanceof TelegramHttpError ? error.message : "Telegram request failed";
      return { ok: false, error: errorMsg };
    }
  },
});
