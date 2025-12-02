/**
 * Resend Email Integration
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api } from "../../_generated/api";

/**
 * Send email via Resend API
 */
export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Single source of truth for Resend API key
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[sendEmail] RESEND_API_KEY not configured");

      // Track failed email
      await ctx.runMutation(api.domains.analytics.analytics.trackEmailSent, {
        email: args.to,
        userId: args.userId,
        subject: args.subject,
        success: false,
      });

      throw new Error("Email service not configured");
    }

    // Single source of truth for from-address
    const fromAddress = process.env.EMAIL_FROM || "NodeBench AI <research@nodebench.ai>";

    try {
      const response = await fetch("https://api.domains.integrations.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [args.to],
          subject: args.subject,
          html: args.html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[sendEmail] Resend API error:", response.status, errorText);
        
        // Track failed email
        await ctx.runMutation(api.domains.analytics.analytics.trackEmailSent, {
          email: args.to,
          userId: args.userId,
          subject: args.subject,
          success: false,
        });
        
        throw new Error(`Failed to send email: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log("[sendEmail] Email sent successfully:", data);
      
      // Track successful email
      await ctx.runMutation(api.domains.analytics.analytics.trackEmailSent, {
        email: args.to,
        userId: args.userId,
        subject: args.subject,
        success: true,
      });
      
      return {
        success: true,
        emailId: data.id,
      };
    } catch (error: any) {
      console.error("[sendEmail] Error:", error);
      
      // Track failed email
      await ctx.runMutation(api.domains.analytics.analytics.trackEmailSent, {
        email: args.to,
        userId: args.userId,
        subject: args.subject,
        success: false,
      });
      
      throw error;
    }
  },
});

