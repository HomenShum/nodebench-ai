# ntfy Migration Guide

## Overview

NodeBench has migrated from Twilio SMS to ntfy.sh push notifications while preserving all original functionality.

**Why ntfy?**
- ✅ **FREE** - No costs vs $0.0079 per SMS segment
- ✅ **Instant** - Push notifications are faster than SMS
- ✅ **Rich** - Supports emojis, priorities, actions, attachments
- ✅ **Privacy** - No phone numbers required
- ✅ **Cross-platform** - Works on iOS, Android, Web, Desktop

## Feature Comparison

| Feature | Twilio SMS | ntfy Push | Status |
|---------|-----------|-----------|--------|
| Send notifications | ✅ | ✅ | **Implemented** |
| Meeting created alerts | ✅ | ✅ | **Implemented** |
| Meeting reminders | ✅ | ✅ | **Implemented** |
| Morning digest | ✅ | ✅ | **Implemented** |
| Opt-out/Opt-in | ✅ | ✅ | **Implemented** |
| Logging & tracking | ✅ | ✅ | **Implemented** |
| Cost tracking | ✅ | ✅ | **Implemented** |
| Agent tool | ✅ | ✅ | **Implemented** |
| Test action | ✅ | ✅ | **Implemented** |
| Stats query | ✅ | ✅ | **Implemented** |

## Code Locations

### Original Twilio Implementation (PRESERVED)
- `convex/domains/integrations/sms.ts` - Original SMS implementation
- `convex/tools/sendSms.ts` - SMS agent tool
- `convex/router.ts` - Twilio webhook at `/twilio/sms/incoming`

### New ntfy Implementation
- `convex/domains/integrations/ntfy.ts` - ntfy push notifications
- `convex/tools/sendNotification.ts` - Push notification agent tool

## API Comparison

### Sending Notifications

**Twilio SMS:**
```typescript
await ctx.runAction(api.domains.integrations.sms.sendSms, {
  to: "+14083335386",
  body: "Meeting in 15 minutes!",
  userId: userId,
  eventType: "meeting_reminder",
});
```

**ntfy Push:**
```typescript
await ctx.runAction(api.domains.integrations.ntfy.sendNotification, {
  topic: "user-john-doe", // or "nodebench" for default
  body: "Meeting in 15 minutes!",
  title: "Meeting Reminder",
  priority: 5,
  tags: ["alarm_clock", "warning"],
  userId: userId,
  eventType: "meeting_reminder",
});
```

### Testing

**Twilio SMS:**
```typescript
await ctx.runAction(api.domains.integrations.sms.testTwilioSms, {
  to: "+14083335386",
  body: "Test message",
});
```

**ntfy Push:**
```typescript
await ctx.runAction(api.domains.integrations.ntfy.testNtfyNotification, {
  topic: "nodebench",
  message: "Test notification",
  title: "Test",
});
```

## User Setup

### For Users to Receive Notifications

1. **Install ntfy app** (optional but recommended):
   - iOS: https://apps.apple.com/app/ntfy/id1625396347
   - Android: https://play.google.com/store/apps/details?id=io.heckel.ntfy
   - Or use web: https://ntfy.sh

2. **Subscribe to your topic**:
   - Default topic: `nodebench`
   - Personal topic: `nodebench-{username}` or any custom topic

3. **Update preferences**:
   - In NodeBench settings, set "Phone Number" field to your ntfy topic
   - Example: `nodebench-john` or `my-personal-topic`
   - Enable "SMS Notifications" (will be renamed to "Push Notifications")

## Environment Variables

### Twilio (Original - Still Works)
```env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

### ntfy (New - Optional)
```env
NTFY_BASE_URL=https://ntfy.sh  # Default, can use self-hosted
NTFY_DEFAULT_TOPIC=nodebench   # Default topic
```

## Migration Checklist

- [x] Create ntfy integration module
- [x] Implement all SMS features (send, log, opt-out, opt-in)
- [x] Create agent tool for notifications
- [x] Test basic notification sending
- [ ] Add webhook endpoint for incoming ntfy messages (optional)
- [ ] Update UI to show "Push Notifications" instead of "SMS"
- [ ] Add topic configuration in user settings
- [ ] Create migration script for existing users
- [ ] Update documentation

## Testing

### Quick Test
```bash
node test-ntfy.js
```

Then visit https://ntfy.sh/nodebench to see the notification!

### Test via Convex
```typescript
// In Convex dashboard or via API
await ctx.runAction(api.domains.integrations.ntfy.testNtfyNotification, {
  topic: "nodebench",
  message: "Hello from NodeBench!",
  title: "Test Notification",
});
```

## Cost Savings

**Before (Twilio SMS):**
- 1 SMS segment: $0.0079
- 100 notifications/day: $23.70/month
- 1000 notifications/day: $237/month

**After (ntfy):**
- Unlimited notifications: **$0/month** 🎉
- Self-hosted option available for enterprise

## Next Steps

1. ✅ Test ntfy integration
2. Update user preferences UI
3. Add topic management
4. Migrate existing SMS users
5. Deprecate Twilio (keep code for reference)

