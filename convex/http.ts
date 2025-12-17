import { auth } from "./domains/auth/auth";
import router from "./router";
import { polar } from "./domains/integrations/polar";
import { ossStats } from "./domains/analytics/ossStats";
import { twilioComponent, hasTwilioCreds } from "./domains/integrations/sms";

const http = router;

auth.addHttpRoutes(http);
polar.registerRoutes(http);

// Register Twilio component routes for incoming messages and status callbacks
// Routes: /twilio/incoming-message, /twilio/message-status
if (hasTwilioCreds && twilioComponent) {
  twilioComponent.registerRoutes(http);
}

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
