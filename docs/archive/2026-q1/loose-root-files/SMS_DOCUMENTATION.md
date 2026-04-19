# SMS Notification System - Twilio A2P 10DLC

## Overview
NodeBench AI uses Twilio SMS for notifications (meeting reminders, morning digests). This document outlines costs, registration, and usage tracking.

## A2P 10DLC Registration (Completed Dec 2024)

### What is A2P 10DLC?
Application-to-Person (A2P) messaging using 10-digit long codes. Required by US carriers for business SMS.

### One-Time Costs
| Item | Cost |
|------|------|
| Brand Registration | Included |
| Campaign Vetting Fee | **$15.00** |

### Monthly Recurring Costs
| Item | Cost |
|------|------|
| Campaign Use Case Fee | **$1.50 - $10.00/month** |
| (Based on use case type) | Standard: $2/mo, Low-volume: $1.50/mo |

## Per-Message Pricing

### Cost Breakdown Per SMS Segment
| Component | Cost (cents) |
|-----------|--------------|
| Twilio Outbound SMS | 0.79¢ |
| A2P Carrier Fee (avg) | 0.30¢ |
| **Total per segment** | **~1.09¢** |

### What is a Segment?
- **GSM-7 encoding** (standard text): 160 chars = 1 segment
- **Unicode/Emoji**: 70 chars = 1 segment
- Multi-part: 153 chars (GSM) or 67 chars (Unicode) per segment

### Example Message Costs
| Message Type | Chars | Segments | Est. Cost |
|--------------|-------|----------|-----------|
| Short reminder | 100 | 1 | ~1.1¢ |
| Meeting details | 200 | 2 | ~2.2¢ |
| Morning digest | 400 | 3 | ~3.3¢ |

## Monthly Cost Estimates

| SMS Volume | Per-Message Cost | Campaign Fee | Total/Month |
|------------|-----------------|--------------|-------------|
| 50 messages | ~$0.55 | $1.50 | **~$2.05** |
| 100 messages | ~$1.09 | $1.50 | **~$2.59** |
| 200 messages | ~$2.18 | $1.50 | **~$3.68** |
| 500 messages | ~$5.45 | $1.50 | **~$6.95** |
| 1000 messages | ~$10.90 | $1.50 | **~$12.40** |

## Throughput Limits
- **AT&T**: MPS per Campaign (varies by trust score)
- **Other carriers**: 1 MPS per phone number
- For higher throughput: Register additional campaigns or use short codes

## Usage Tracking Implementation

### Database Tables
```typescript
// smsLogs - Individual message logs
{
  to: string,
  body: string,
  status: "sent" | "delivered" | "failed" | "undelivered",
  userId: Id<"users">,
  messageSid: string,
  eventType: "meeting_created" | "meeting_reminder" | "morning_digest",
  segments: number,
  estimatedCostCents: number,
  createdAt: number,
}

// smsUsageDaily - Daily aggregates per user
{
  userId: Id<"users">,
  date: string, // YYYY-MM-DD
  totalMessages: number,
  successfulMessages: number,
  failedMessages: number,
  totalSegments: number,
  estimatedCostCents: number,
}
```

### API Endpoints
```typescript
// Get user's SMS usage stats
getSmsUsageStats({ days?: 30 })
// Returns: period, totals, dailyBreakdown, pricing

// Get recent SMS logs
getRecentSmsLogs({ limit?: 20 })
// Returns: Recent SMS messages with status and cost

// Get pricing breakdown
getSmsCostBreakdown()
// Returns: Per-message, monthly, and example costs
```

## Pricing Considerations for NodeBench

### Cost Pass-Through Options
1. **Included in subscription**: Absorb SMS costs into $4.99/mo tier
2. **Metered billing**: Track usage, bill at cost + margin
3. **SMS credit packs**: Sell credits (e.g., 100 SMS = $2)

### Recommended Limits
| Plan | SMS/Month | Est. Platform Cost |
|------|-----------|-------------------|
| Free | 10 | ~$0.11 |
| Supporter ($4.99) | 100 | ~$1.09 |
| Pro (future) | 500 | ~$5.45 |

## Environment Variables Required
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

## Registered Campaign Details (Submitted Dec 2024)

### Campaign Status
- **Status**: ⏳ Under Review (2-3 weeks for approval)
- **Twilio Account**: My first Twilio account
- **Phone Number**: +1 (408) 560-4833
- **Use Case**: Low Volume Mixed A2P
- **Messaging Service**: Low Volume Mixed A2P Mn

### Campaign Description (Submitted)
> This campaign provides meeting notifications and AI-powered research assistant
> interactions. Use cases include: (1) Transactional meeting reminders and calendar
> alerts, (2) Daily schedule summaries, (3) Two-way conversational AI assistant for
> research queries and dossier generation. All messages are sent to registered users
> who have explicitly opted in to SMS communications in their account settings.

### Sample Messages (Submitted)
1. `⏰ Reminder: Your meeting "Team Standup" starts in 15 minutes at 9:00 AM - Zoom Video Call`
2. `Hi! I found 3 healthcare startups matching your criteria. Would you like me to create a dossier with detailed information? Reply YES to proceed.`
3. `Your dossier on Acme Health is ready. Key findings: Founded 2022, Series A ($5M), FDA approval pending Q2 2026. View full report at nodebench.ai/d/abc123`
4. `Good morning! You have 2 meetings today: • 10:00 AM: Product Demo • 3:30 PM: Team Sync. Reply HELP for assistance.`
5. `NodeBench AI: I've scheduled your meeting for tomorrow at 2 PM. Reply CANCEL to remove or RESCHEDULE for options.`

### Opt-in/Opt-out Keywords
| Type | Keywords |
|------|----------|
| **Opt-in** | START, YES, SUBSCRIBE |
| **Opt-out** | OPTOUT, CANCEL, END, QUIT, UNSUBSCRIBE, REVOKE, STOP, STOPALL |
| **Help** | HELP, INFO |

### Consent Messages
- **Opt-in**: "NodeBench AI: You're now subscribed to SMS notifications. Reply HELP for support or STOP to unsubscribe at any time."
- **Opt-out**: "You have successfully been unsubscribed. You will not receive any more messages from this number. Reply START to resubscribe."
- **Help**: "Reply STOP to unsubscribe. Msg&Data Rates May Apply."

## Twilio Console Configuration

### Step 1: Configure Phone Number Webhooks

Go to **Phone Numbers → Manage → Active Numbers** → Click on `+1 (408) 560-4833`

#### Messaging Configuration
| Setting | Value |
|---------|-------|
| **Messaging Service** | Low Volume Mixed A2P Messaging Service |
| **A message comes in** | Webhook: `https://formal-shepherd-851.convex.site/twilio/incoming-message` |
| **HTTP Method** | HTTP POST |
| **Primary handler fails** | (leave empty or set fallback URL) |

### Step 2: Configure Messaging Service

Go to **Messaging → Services → Low Volume Mixed A2P Messaging Service** → **Integration**

| Setting | Value |
|---------|-------|
| **Incoming Messages** | Defer to sender's webhook |
| **Delivery Status Callback URL** | `https://formal-shepherd-851.convex.site/twilio/message-status` |

### Step 3: A2P 10DLC Registration Status

The A2P 10DLC registration is **under review**. Once approved:
- The warning banners on the phone number page will disappear
- Messages will route through the compliant A2P channel
- Throughput limits will be assigned based on carrier trust scores

**Expected Timeline**: 2-3 weeks for carrier review

### Step 4: Webhook Endpoints (Twilio Component Routes)

| Endpoint | Purpose | Method |
|----------|---------|--------|
| `/twilio/incoming-message` | Receives incoming SMS (user replies, STOP/HELP/START) | POST |
| `/twilio/message-status` | Receives delivery status updates | POST |

### Incoming SMS Keywords Handled

| Keyword | Action | Response |
|---------|--------|----------|
| STOP, STOPALL, UNSUBSCRIBE, etc. | Disables SMS for user | Unsubscribe confirmation |
| HELP, INFO | Returns help message | Support info |
| START, YES, SUBSCRIBE | Re-enables SMS for user | Subscribe confirmation |
| (Other text) | Logged for agent processing | No auto-reply |

## Links
- [Twilio A2P 10DLC Documentation](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc)
- [Twilio Pricing](https://www.twilio.com/en-us/sms/pricing/us)
- [A2P 10DLC Fees](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/fees)
- [NodeBench Convex Dashboard](https://dashboard.convex.dev/d/formal-shepherd-851)

