# Google Calendar Integration Setup Guide

## Overview
Your mini calendar now displays events from **both** your internal database and **Google Calendar**. This integration allows you to see all your events in one place.

## What's New

### ✅ Features Added
1. **Google Calendar Sync**: Automatically fetches events from your primary Google Calendar
2. **All-Day Event Support**: Properly handles all-day events from Google Calendar
3. **Real-Time Updates**: Events refresh automatically when you navigate between months
4. **Seamless Merging**: Internal events and Google Calendar events appear together, sorted by time
5. **Visual Distinction**: Google Calendar events include a "source" indicator

### 🔧 Technical Changes
- Added `calendar.readonly` scope to Google OAuth integration
- Created `convex/domains/integrations/googleCalendar.ts` for Google Calendar API
- Updated `MiniMonthCalendar` to use `useAgendaWithGoogleCalendar` hook
- Created new action `listAgendaWithGoogleCalendar` that merges internal + Google events

## Setup Instructions

### Step 1: Re-authenticate with Google

**IMPORTANT**: Users must re-authenticate to grant the new Calendar permission.

1. Navigate to the **Gmail/Google Integration** panel in your sidebar
2. Click **"Connect Google Account"** or **"Reconnect"**
3. You'll be redirected to Google's OAuth consent screen
4. **Grant permission** for both:
   - ✅ View your email messages (Gmail)
   - ✅ **View events on all your calendars** (NEW - Calendar)
5. You'll be redirected back to the app

### Step 2: Verify Calendar Access

After re-authenticating:
1. Open the **Mini Calendar** in your sidebar
2. Navigate to any month
3. You should now see:
   - **Internal events** (created in the app)
   - **Google Calendar events** (from your primary calendar)
   - All events merged and sorted by time

### Step 3: Check for Errors (Optional)

If events don't appear:
1. Open browser DevTools (F12)
2. Check the Console for any error messages
3. Look for messages like:
   - `[Google Calendar] Fetched X events` ✅ Success
   - `Calendar access not granted` ❌ Need to re-authenticate
   - `Failed to fetch calendar events` ❌ Check OAuth setup

## Environment Variables

Ensure these are set in your Convex deployment:

```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/google/oauth/callback
# Or let it auto-detect from CONVEX_SITE_URL
```

## OAuth Flow

### OAuth Endpoints
- **Start OAuth**: `GET /api/google/oauth/start`
- **Callback**: `GET /api/google/oauth/callback`

### Scopes Requested
```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/calendar.readonly  ← NEW
https://www.googleapis.com/auth/userinfo.email
```

## How It Works

### Data Flow
1. **Mini Calendar** renders and determines visible date range
2. **useAgendaWithGoogleCalendar** hook triggers
3. **Action** `listAgendaWithGoogleCalendar` runs:
   - Fetches internal events from Convex database
   - Calls Google Calendar API to fetch calendar events
   - Merges both event sources
   - Returns combined result
4. **Mini Calendar** displays merged events

### Google Calendar API Call
```typescript
GET https://www.googleapis.com/calendar/v3/calendars/primary/events
Parameters:
  - timeMin: ISO 8601 start time
  - timeMax: ISO 8601 end time
  - singleEvents: true (expand recurring events)
  - orderBy: startTime
  - maxResults: 250
```

### Event Format
Google Calendar events are transformed to match internal format:
```typescript
{
  id: string,              // Google event ID
  title: string,           // Event summary
  description?: string,    // Event description
  startTime: number,       // UTC ms
  endTime?: number,        // UTC ms
  allDay?: boolean,        // true for all-day events
  location?: string,       // Event location
  status?: string,         // "confirmed", "tentative", "cancelled"
  htmlLink?: string,       // Link to event in Google Calendar
  source: "google-calendar" // Identifies source
}
```

## Troubleshooting

### Events Not Showing Up

**Problem**: No Google Calendar events appear in mini calendar

**Solutions**:
1. ✅ **Re-authenticate** with Google to grant calendar scope
2. ✅ Check that you have events in your **primary Google Calendar**
3. ✅ Open DevTools Console and look for error messages
4. ✅ Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set

### "Calendar access not granted" Error

**Problem**: Console shows "Calendar access not granted. Please reconnect..."

**Solution**:
- User needs to **disconnect and reconnect** their Google account
- Make sure to grant **both Gmail and Calendar permissions** during OAuth flow

### Token Expiration

**Problem**: Events stop loading after some time

**Solution**:
- The integration automatically refreshes access tokens
- If refresh fails, user needs to re-authenticate
- Check that `GOOGLE_CLIENT_SECRET` is correct

### Rate Limiting

**Problem**: "Failed to fetch calendar events: 429" error

**Solution**:
- Google Calendar API has rate limits
- The integration fetches up to 250 events per request
- Avoid excessive refreshes
- Consider implementing caching if needed

## API Reference

### Convex Functions

#### `fetchCalendarEvents` (Action)
```typescript
api.domains.integrations.googleCalendar.fetchCalendarEvents({
  timeMin: number,  // UTC ms
  timeMax: number   // UTC ms
})
```

Returns:
```typescript
{
  success: boolean,
  events?: Array<GoogleCalendarEvent>,
  error?: string
}
```

#### `listAgendaWithGoogleCalendar` (Action)
```typescript
api.domains.calendar.calendar.listAgendaWithGoogleCalendar({
  start: number,              // UTC ms
  end: number,                // UTC ms
  country?: string,           // Holiday country code
  holidaysStartUtc?: number,
  holidaysEndUtc?: number
})
```

Returns:
```typescript
{
  success: boolean,
  events: Array<Event>,      // Merged internal + Google events
  tasks: Array<Task>,
  holidays: Array<Holiday>,
  notes: Array<Note>,
  error?: string
}
```

### React Hook

#### `useAgendaWithGoogleCalendar`
```typescript
import { useAgendaWithGoogleCalendar } from "@/features/calendar/hooks/useAgendaWithGoogleCalendar";

const { data, isLoading, error, refetch } = useAgendaWithGoogleCalendar({
  start: startMs,
  end: endMs,
  country: "US",
  enabled: true  // Optional: conditional fetching
});
```

## Future Enhancements

### Potential Features
- ✅ Multi-calendar support (fetch from multiple calendars)
- ✅ Two-way sync (create/edit Google Calendar events from the app)
- ✅ Calendar color coding (use Google Calendar colors)
- ✅ Event conflict detection
- ✅ Calendar selection UI (choose which calendars to display)
- ✅ Caching layer for better performance
- ✅ Recurring event support (already handled by `singleEvents: true`)

### Implementation Notes
For multi-calendar support, use:
```typescript
api.domains.integrations.googleCalendar.listCalendars()
```

Then fetch events from specific calendar IDs instead of `primary`.

## Security Considerations

### OAuth Scopes
- `calendar.readonly`: Read-only access (cannot modify events)
- No access to calendar settings or sharing
- Cannot delete or create events (unless future enhancement)

### Data Storage
- OAuth tokens stored in `googleAccounts` table (Convex)
- Access tokens automatically refreshed before expiration
- Refresh tokens encrypted at rest (Convex security)

### Privacy
- Calendar data is fetched on-demand (not stored permanently)
- Each user sees only their own calendar events
- No cross-user data access

## Support

If you encounter issues:
1. Check this guide first
2. Review browser console for error messages
3. Verify environment variables are set correctly
4. Try disconnecting and reconnecting Google account
5. Contact support with error logs if problem persists

---

**Last Updated**: 2025-12-07
**Version**: 1.0.0
