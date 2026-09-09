/// <reference types="vite/client" />
// @vitest-environment node
import { convexTest } from "convex-test";
import { httpRouter } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import schema from "../../../schema";
import { internal } from "../../../_generated/api";
import * as telegram from "../telegram";
import { telegramWebhookHandler } from "../telegramAgent";

const modules = Object.fromEntries(Object.entries(import.meta.glob("../../../**/*.{ts,js}"))
  .map(([key, loader]) => {
    const parts = key.replace(/^\.\//, "").split("/");
    const base = ["domains", "integrations", "__tests__"];
    while (parts[0] === "..") { parts.shift(); base.pop(); }
    return [[...base, ...parts].join("/"), loader];
  }));
// Mount the actual handler on the same path without loading unrelated provider
// components. The tested storage, actions and mutations are the real modules.
modules["http.ts"] = async () => {
  const router = httpRouter();
  router.route({ path: "/telegram/webhook", method: "POST", handler: telegramWebhookHandler });
  return { default: router };
};
const ops = internal.domains.integrations.telegram;
const secret = "fixture-webhook-secret-not-a-credential";
const fixture = () => convexTest({ schema, modules, transactionLimits: true });
const update = (text = "/start", id = 41001, sequence = 1) => ({
  update_id: sequence,
  message: { message_id: sequence, date: 1, from: { id, is_bot: false, first_name: "Fixture" }, chat: { id, type: "private" }, text },
});
const callback = () => ({ update_id: 2, callback_query: {
  id: "fixture-button", from: { id: 41001, is_bot: false, first_name: "Fixture" },
  message: { message_id: 1, date: 1, chat: { id: 41001, type: "private" } }, data: "refresh",
} });
function post(t: ReturnType<typeof fixture>, body: unknown, suppliedSecret: string | null = secret) {
  return t.fetch("/telegram/webhook", {
    method: "POST", headers: { "Content-Type": "application/json", ...(suppliedSecret === null ? {} : { "X-Telegram-Bot-Api-Secret-Token": suppliedSecret }) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const sentBodies: Record<string, unknown>[] = [];
let provider: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "000000:fixture-token");
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", secret);
  sentBodies.length = 0;
  provider = vi.fn(async (url: unknown, init?: RequestInit) => {
    sentBodies.push(JSON.parse(String(init?.body)));
    const method = String(url).split("/").at(-1);
    const result = ["answerCallbackQuery", "setWebhook", "deleteWebhook"].includes(method ?? "")
      ? true
      : { message_id: sentBodies.length, date: 1, chat: { id: 41001, type: "private" } };
    return new Response(JSON.stringify({ ok: true, result }), { status: 200 });
  });
  vi.stubGlobal("fetch", provider);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("a bot user and an unrelated website visitor at the Telegram boundary", () => {
  it.each([null, "forged-secret"])("rejects a visitor using %s before any provider work", async supplied => {
    const response = await post(fixture(), update(), supplied);
    expect([401, 403]).toContain(response.status);
    expect(provider).not.toHaveBeenCalled();
  });
  it.each(["", "contains spaces", "x".repeat(257)])("holds unusable server configuration before parsing a body", async configured => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", configured);
    const response = await post(fixture(), "{not-json");
    expect(response.status).toBe(503);
    expect(provider).not.toHaveBeenCalled();
  });
  it.each(["{", "null", "[]", JSON.stringify({ update_id: "wrong" }), JSON.stringify({ update_id: 1, message: { text: "/start" } }), JSON.stringify({ update_id: 1, callback_query: { id: "x", data: "refresh" } })])("rejects malformed authenticated input %s without calling providers", async body => {
    expect((await post(fixture(), body)).status).toBe(400);
    expect(provider).not.toHaveBeenCalled();
  });
  it("bounds an authenticated body even without a Content-Length header", async () => {
    expect((await post(fixture(), JSON.stringify(update("x".repeat(256 * 1024))))).status).toBe(413);
    expect(provider).not.toHaveBeenCalled();
  });
  it("explicitly ignores an authentic unsupported update without reporting provider work", async () => {
    const response = await post(fixture(), { update_id: 4, edited_message: { text: "edit" } });
    expect(response.status).toBe(204);
    expect(provider).not.toHaveBeenCalled();
  });
  it("keeps all data and bot-management registrations internal", () => {
    // convex-test itself permits internal references; it does not emulate
    // the deployment HTTP API's visibility enforcement. Inspect registrations.
    for (const name of ["registerTelegramUser", "getTelegramUser", "toggleNotifications", "getRecentMessages", "setWebhook", "getWebhookInfo", "deleteWebhook", "getBotInfo", "isConfigured"] as const) {
      expect(telegram[name], name).toHaveProperty("isInternal", true);
      expect(telegram[name], name).not.toHaveProperty("isPublic", true);
    }
  });
  it("registers a real chat, stops notifications and re-enables them with /start", async () => {
    const t = fixture();
    expect((await post(t, update())).status).toBe(200);
    const first = await t.query(ops.getTelegramUser, { telegramChatId: "41001" });
    expect(first).toMatchObject({ notificationsEnabled: true });
    expect((await post(t, update("/stop", 41001, 2))).status).toBe(200);
    expect(await t.query(ops.getTelegramUser, { telegramChatId: "41001" })).toMatchObject({ _id: first?._id, notificationsEnabled: false });
    expect((await post(t, update("/start", 41001, 3))).status).toBe(200);
    expect(await t.query(ops.getTelegramUser, { telegramChatId: "41001" })).toMatchObject({ _id: first?._id, notificationsEnabled: true });
    expect(sentBodies).toHaveLength(3);
  });
  it("keeps independent chats isolated across overlapping registration and successive history reads", async () => {
    const t = fixture();
    await Promise.all(Array.from({ length: 24 }, (_, n) => t.mutation(ops.registerTelegramUser, { telegramChatId: String(42000 + n % 4) })));
    expect(await t.run(ctx => ctx.db.query("telegramUsers").collect())).toHaveLength(4);
    for (let round = 0; round < 8; round++) {
      await Promise.all(Array.from({ length: 20 }, (_, n) => t.mutation(ops.logTelegramMessage, {
        telegramChatId: String(42000 + n % 4), messageText: `round-${round}-chat-${n % 4}`, messageType: "incoming", messageId: round * 20 + n,
      })));
      for (let chat = 0; chat < 4; chat++) {
        const history = await t.query(ops.getRecentMessages, { telegramChatId: String(42000 + chat), limit: 10 });
        expect(history.length).toBeLessThanOrEqual(10);
        expect(history.every(row => row.telegramChatId === String(42000 + chat) && row.messageText.endsWith(`chat-${chat}`))).toBe(true);
      }
    }
    expect(await t.run(ctx => ctx.db.query("telegramMessages").collect())).toHaveLength(160);
  }, 30000);
  it.each([0, -1, 1.5, 101, 1e9])("rejects an invalid history size %s instead of an unbounded read", async limit => {
    await expect(fixture().query(ops.getRecentMessages, { telegramChatId: "41001", limit })).rejects.toThrow();
  });
  it("handles an authentic button through its actual acknowledgement and response actions", async () => {
    expect((await post(fixture(), callback())).status).toBe(200);
    expect(sentBodies).toHaveLength(2);
    expect(sentBodies[0]).toMatchObject({ callback_query_id: "fixture-button" });
    expect(sentBodies[1]).toMatchObject({ chat_id: "41001" });
  });
  it.each([update(), callback(), update("research request")])("does not acknowledge failed delivery as successful webhook work", async body => {
    provider.mockImplementation(async () => new Response(JSON.stringify({ ok: false, description: "fixture rejection" }), { status: 200 }));
    const t = fixture();
    const response = await post(t, body);
    expect(response.status).toBeGreaterThanOrEqual(500);
    const messages = await t.run(ctx => ctx.db.query("telegramMessages").collect());
    expect(messages.filter(row => row.messageType === "outgoing")).toEqual([]);
  });
  it.each(["/start", "/help", "/status", "research request"])("reports the implemented capabilities honestly for %s", async text => {
    expect((await post(fixture(), update(text))).status).toBe(200);
    const copy = sentBodies.map(body => body.text ?? "").join("\n");
    expect(copy).not.toMatch(/Searching\.\.\.|Active \(FREE\)|Ready for queries|I'll find the answers|Free-tier search across/i);
    expect(copy).toMatch(/not (yet )?(available|connected|implemented)|unavailable|not enabled/i);
  });
  it("retains the capability disclosure when a long user query consumes the reply budget", async () => {
    expect((await post(fixture(), update("q".repeat(4096)))).status).toBe(200);
    const reply = String(sentBodies.at(-1)?.text ?? "");
    expect(reply.length).toBeLessThanOrEqual(4096);
    expect(reply).toMatch(/not (yet )?(available|connected|implemented)|unavailable|not enabled/i);
  });
});

describe("an operator configuring the same admitted Telegram ingress", () => {
  it("sets the configured secret and retains pending messages", async () => {
    expect(await fixture().action(ops.setWebhook, { webhookUrl: "https://fixture.example/telegram/webhook" })).toMatchObject({ ok: true });
    expect(sentBodies[0]).toMatchObject({ secret_token: secret });
    expect(sentBodies[0].drop_pending_updates).not.toBe(true);
  });
  it("holds setup when the secret is absent instead of configuring an unauthenticated hook", async () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "");
    expect(await fixture().action(ops.setWebhook, { webhookUrl: "https://fixture.example/telegram/webhook" })).toMatchObject({ ok: false });
    expect(provider).not.toHaveBeenCalled();
  });
  it.each(["http://fixture.example/telegram/webhook", "file:///private", "https://user:pass@fixture.example/"])("rejects an invalid webhook URL %s before contacting Telegram", async webhookUrl => {
    expect(await fixture().action(ops.setWebhook, { webhookUrl })).toMatchObject({ ok: false });
    expect(provider).not.toHaveBeenCalled();
  });
  it.each([503, 429])("does not trust ok:true in a failed HTTP%s provider reply", async status => {
    provider.mockImplementation(async () => new Response(JSON.stringify({ ok: true, result: { message_id: 7 } }), { status }));
    expect(await fixture().action(ops.sendMessage, { chatId: "41001", text: "Fixture" })).toMatchObject({ sent: false });
  });
  it("caps a large provider response before it can become a false sent result", async () => {
    provider.mockImplementation(async () => new Response(JSON.stringify({ ok: true, result: { message_id: 7 }, padding: "x".repeat(2 * 1024 * 1024) })));
    expect(await fixture().action(ops.sendMessage, { chatId: "41001", text: "Fixture" })).toMatchObject({ sent: false });
  });
  it.each([null, [], { ok: "true", result: { message_id: 7 } }, { ok: true }, { ok: true, result: true }, { ok: true, result: { message_id: "7" } }, { ok: true, result: { message_id: 1.5 } }].map(body => [body]))("does not treat a malformed provider body as delivered: %j", async body => {
    provider.mockImplementation(async () => new Response(JSON.stringify(body)));
    expect(await fixture().action(ops.sendMessage, { chatId: "41001", text: "Fixture" })).toMatchObject({ sent: false });
  });
  it("does not acknowledge a button when the provider returned an unsuccessful result", async () => {
    provider.mockImplementation(async () => new Response(JSON.stringify({ ok: true, result: false })));
    expect((await post(fixture(), callback())).status).toBeGreaterThanOrEqual(500);
  });
  it("does not follow a provider redirect carrying the bot credential in its URL", async () => {
    await fixture().action(ops.sendMessage, { chatId: "41001", text: "Fixture" });
    expect(provider.mock.calls[0][1]).toMatchObject({ redirect: "error" });
  });
  it.each(["headers", "body"])("releases a stalled provider %s at its finite deadline", async stage => {
    vi.useFakeTimers();
    let cancelled = false;
    provider.mockImplementation(async (_url: unknown, init?: RequestInit) => {
      if (stage === "headers") {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            cancelled = true;
            reject(new DOMException("fixture aborted", "AbortError"));
          }, { once: true });
        });
      }
      return new Response(new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } }));
    });
    const result = fixture().action(ops.sendMessage, { chatId: "41001", text: "Fixture" });
    await vi.waitFor(() => expect(provider).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(15000);
    expect(await result).toMatchObject({ sent: false });
    expect(cancelled).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("contains successive overlapping network failures without accumulating timers or success claims", async () => {
    vi.useFakeTimers();
    provider.mockImplementation(async () => { throw new Error("fixture offline"); });
    const t = fixture();
    for (let round = 0; round < 5; round++) {
      const replies = await Promise.all(Array.from({ length: 10 }, () => t.action(ops.sendMessage, { chatId: "41001", text: `Fixture ${round}` })));
      expect(replies.every(reply => reply.sent === false)).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    }
    expect(provider).toHaveBeenCalledTimes(50);
  });
  it("releases a stalled authenticated request body before any provider action", async () => {
    vi.useFakeTimers();
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
    const init: RequestInit & { duplex: "half" } = {
      method: "POST", duplex: "half", headers: { "Content-Type": "application/json", "X-Telegram-Bot-Api-Secret-Token": secret }, body,
    };
    const response = fixture().fetch("/telegram/webhook", init);
    await vi.waitFor(() => expect(vi.getTimerCount()).toBeGreaterThan(0));
    await vi.advanceTimersByTimeAsync(15000);
    expect((await response).status).toBe(408);
    expect(cancelled).toBe(true);
    expect(provider).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
