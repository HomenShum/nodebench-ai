import { Twilio } from "@convex-dev/twilio";
import { components, internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ------------------------------------------------------------------
// Twilio component client (mocked if credentials are missing)
// ------------------------------------------------------------------
const hasTwilioCreds = Boolean(
  process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER,
);

type TwilioLike = {
  sendMessage: (
    ctx: any,
    args: { to: string; body: string },
  ) => Promise<{ sid?: string; status?: string }>;
};

export const twilio: TwilioLike = hasTwilioCreds
  // Cast to any so TS doesn't require the component to be present when disabled in convex.config.ts
  ? new Twilio((components as any).twilio, { defaultFrom: process.env.TWILIO_PHONE_NUMBER! })
  : {
      async sendMessage(_ctx, _args) {
        // Mocked response for builds/tests without Twilio credentials
        return { sid: "mock_sid", status: "mocked" };
      },
    };

// ------------------------------------------------------------------
// Internal mutation to log an SMS
// ------------------------------------------------------------------
export const logSms = internalMutation({
  args: {
    to: v.string(),
    body: v.string(),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("smsLogs", { ...args, createdAt: Date.now() });
    return null;
  },
});

// ------------------------------------------------------------------
// Internal action to send an SMS and schedule log write
// ------------------------------------------------------------------
export const sendSms = action({
  args: {
    to: v.string(),
    body: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const status = await twilio.sendMessage(ctx, args);
    await ctx.runMutation(internal.sms.logSms, {
      to: args.to,
      body: args.body,
      status: status.status ?? "unknown",
    });
    return null;
  },
});


