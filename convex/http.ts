import { auth } from "./domains/auth/auth";
import router from "./router";
import { polar } from "./domains/integrations/polar";
import { ossStats } from "./domains/analytics/ossStats";
import { twilioComponent, hasTwilioCreds } from "./domains/integrations/sms";
import { telegramWebhookHandler } from "./domains/integrations/telegramAgent";
import { discordWebhookHandler } from "./domains/integrations/discordAgent";
import { gmailPushHandler } from "./domains/integrations/email/emailWebhook";

const http = router;

auth.addHttpRoutes(http);
polar.registerRoutes(http);

// Register Twilio component routes for incoming messages and status callbacks
// Routes: /twilio/incoming-message, /twilio/message-status
if (hasTwilioCreds && twilioComponent) {
  twilioComponent.registerRoutes(http);
}

// Register Telegram webhook for bot messages (100% FREE)
// Route: /telegram/webhook
// Setup: Call setWebhook action after deployment
http.route({
  path: "/telegram/webhook",
  method: "POST",
  handler: telegramWebhookHandler,
});

// Register Discord interactions webhook for slash commands (FREE)
// Route: /discord/interactions
// Setup: Set Interactions Endpoint URL in Discord Developer Portal
http.route({
  path: "/discord/interactions",
  method: "POST",
  handler: discordWebhookHandler,
});

// Register Gmail push notification webhook for real-time email triggers
// Route: /api/gmail/push
// Setup: Configure Google Cloud Pub/Sub to push to this endpoint
http.route({
  path: "/api/gmail/push",
  method: "POST",
  handler: gmailPushHandler,
});

// Only register GitHub webhook routes if a token/secret is configured.
// This avoids requiring GITHUB_ACCESS_TOKEN at deploy time.
try {
  const hasGithubToken = Boolean(process.env.GITHUB_ACCESS_TOKEN);
  const hasGithubSecret = Boolean(process.env.GITHUB_WEBHOOK_SECRET);
  if (hasGithubToken && hasGithubSecret) {
    ossStats.registerRoutes(http);
  }
} catch {
  // noop: keep HTTP server usable even if env access fails during analysis
}

export default http;
