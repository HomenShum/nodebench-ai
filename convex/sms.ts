import { Twilio } from "@convex-dev/twilio";
import { components, internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ------------------------------------------------------------------
// Twilio component client
// ------------------------------------------------------------------
export const twilio = new Twilio(components.twilio, {
  defaultFrom: process.env.TWILIO_PHONE_NUMBER!,
});

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


