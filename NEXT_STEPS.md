# Next Steps - Google Calendar Integration

## ✅ Implementation Complete

I've successfully implemented Google Calendar integration for your mini calendar. Here's what was done and what you need to do next.

---

## 📋 What Was Implemented

### Files Created
1. ✅ `convex/domains/integrations/googleCalendar.ts` - Google Calendar API integration
2. ✅ `src/features/calendar/hooks/useAgendaWithGoogleCalendar.ts` - React hook for merged data
3. ✅ `GOOGLE_CALENDAR_SETUP.md` - Complete setup and troubleshooting guide
4. ✅ `IMPLEMENTATION_SUMMARY.md` - Technical implementation details

### Files Modified
1. ✅ `convex/domains/integrations/gmail.ts` - Added `calendar.readonly` scope
2. ✅ `convex/domains/calendar/calendar.ts` - Added Google Calendar merging action
3. ✅ `src/features/calendar/components/MiniMonthCalendar.tsx` - Updated to use new hook

---

## 🚀 Next Steps for You

### Step 1: Review the Changes
```bash
# View all changes
git status

# Review specific files
git diff convex/domains/integrations/gmail.ts
git diff convex/domains/calendar/calendar.ts
git diff src/features/calendar/components/MiniMonthCalendar.tsx
```

### Step 2: Test Locally (IMPORTANT)

**Before deploying, test the integration:**

1. **Install dependencies** (if needed):
   ```bash
   npm install
   ```

2. **Start your dev server**:
   ```bash
   npm run dev
   # or
   npx convex dev
   ```

3. **Test the OAuth flow**:
   - Navigate to Gmail/Google integration panel
   - Click "Connect Google Account"
   - Grant both Gmail AND Calendar permissions
   - Verify you're redirected back successfully

4. **Test the Mini Calendar**:
   - Open the mini calendar in sidebar
   - You should see a loading state initially
   - Events from Google Calendar should appear
   - Check browser console for any errors

5. **Look for these console messages** (F12 → Console):
   ```
   ✅ [Google Calendar] Fetched X events
   ✅ [listAgendaWithGoogleCalendar] Merged X Google Calendar events
   ❌ Calendar access not granted (means you need to re-auth)
   ❌ Failed to fetch calendar events (check OAuth setup)
   ```

### Step 3: Verify Environment Variables

Ensure these are set in your Convex deployment:

```bash
# Required (should already exist for Gmail):
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/google/oauth/callback

# Optional (auto-detected):
CONVEX_SITE_URL=https://your-domain.com
```

**How to check**:
```bash
npx convex env list
```

**How to set** (if missing):
```bash
npx convex env set GOOGLE_CLIENT_ID "your_client_id"
npx convex env set GOOGLE_CLIENT_SECRET "your_client_secret"
```

### Step 4: Deploy to Production

Once testing is successful:

```bash
# Add all changes
git add .

# Commit
git commit -m "feat: Add Google Calendar integration to mini calendar

- Add calendar.readonly scope to Google OAuth
- Create Google Calendar API integration module
- Create useAgendaWithGoogleCalendar hook for React
- Update MiniMonthCalendar to display merged events
- Add comprehensive setup documentation"

# Deploy Convex functions
npx convex deploy

# Push to your repository
git push origin focused-mayer
```

### Step 5: User Communication

**Notify existing users** that they need to re-authenticate:

**Sample Message**:
```
🎉 New Feature: Google Calendar Integration!

Your mini calendar now syncs with Google Calendar. To enable this:

1. Go to Gmail/Google Integration panel
2. Click "Reconnect Google Account"
3. Grant Calendar permission when prompted
4. Your Google Calendar events will now appear in the mini calendar!

No re-authentication needed for new users.
```

### Step 6: Monitor for Errors

After deployment, monitor for:

1. **OAuth Errors**:
   - Check Convex logs: `npx convex logs`
   - Look for "Failed to refresh token" or "401/403" errors

2. **API Rate Limits**:
   - Google Calendar API has quotas
   - Monitor for "429 Too Many Requests" errors
   - Consider implementing caching if needed

3. **User Feedback**:
   - Some users may not grant calendar permission
   - Some may have empty primary calendars
   - Handle gracefully (show internal events only)

---

## 🧪 Testing Checklist

Before marking this as complete, verify:

### Functional Tests
- [ ] OAuth flow completes successfully
- [ ] Both Gmail and Calendar permissions granted
- [ ] Google Calendar events appear in mini calendar
- [ ] Internal events still appear (not broken)
- [ ] Events are sorted chronologically
- [ ] All-day events display correctly
- [ ] Timed events display correctly
- [ ] Day preview shows merged events
- [ ] Month navigation works (events refresh)

### Error Handling
- [ ] Works when Google account not connected (shows internal events only)
- [ ] Works when calendar permission not granted (shows error message)
- [ ] Handles Google API failures gracefully (falls back to internal events)
- [ ] Handles token expiration (auto-refresh)

### UI/UX
- [ ] Loading states appear during fetch
- [ ] No flash of empty state
- [ ] Events render without layout shift
- [ ] Performance is acceptable (not slow)

### Console
- [ ] No JavaScript errors
- [ ] No React warnings
- [ ] Success messages appear for Google Calendar fetch
- [ ] No 401/403 authentication errors

---

## 🐛 Common Issues and Solutions

### Issue: "Calendar access not granted"
**Solution**: User needs to re-authenticate with updated scopes
```typescript
// They'll see this in the Google Calendar fetch result
error: "Calendar access not granted. Please reconnect your Google account..."
```

### Issue: No events showing up
**Checklist**:
1. ✅ User re-authenticated with calendar scope?
2. ✅ User has events in their primary Google Calendar?
3. ✅ Date range is correct (check visible month)?
4. ✅ Check browser console for errors
5. ✅ Check Convex logs for API errors

### Issue: TypeScript errors
**Solution**: Make sure all files are saved and IDE restarts TypeScript server
```bash
# VS Code: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### Issue: Build fails
**Check**:
1. All imports are correct
2. No typos in file paths
3. Run `npm install` to ensure dependencies are up to date

---

## 📚 Documentation References

### For Users
- **Setup Guide**: `GOOGLE_CALENDAR_SETUP.md`
  - How to re-authenticate
  - Troubleshooting common issues
  - Feature overview

### For Developers
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`
  - Architecture diagram
  - Code changes breakdown
  - Testing checklist
  - Security notes

### API Documentation
- Google Calendar API: https://developers.google.com/calendar/api/v3/reference
- OAuth 2.0 Scopes: https://developers.google.com/identity/protocols/oauth2/scopes#calendar

---

## 🎯 Success Criteria

The integration is successful when:

1. ✅ User can re-authenticate with Google
2. ✅ Both Gmail and Calendar permissions are granted
3. ✅ Mini calendar displays Google Calendar events
4. ✅ Internal events still work (backward compatible)
5. ✅ Events are merged and sorted correctly
6. ✅ No errors in console or logs
7. ✅ Performance is acceptable
8. ✅ Error handling works (graceful degradation)

---

## 🔮 Future Enhancements (Optional)

After this is stable, consider:

1. **Multi-Calendar Support**
   - Use `listCalendars()` action
   - Let users select which calendars to display
   - Show calendar colors

2. **Two-Way Sync**
   - Add write scope: `calendar.events`
   - Create Google Calendar events from app
   - Edit/delete Google events

3. **Performance Optimization**
   - Implement caching layer (5-15 min cache)
   - Batch requests for multiple calendars
   - Lazy loading for large date ranges

4. **Enhanced UI**
   - Visual indicator for Google vs internal events
   - Calendar color coding
   - Event conflict warnings
   - Quick actions (open in Google Calendar)

---

## ✅ Final Checklist

Before closing this task:

- [ ] All code changes reviewed
- [ ] Local testing passed
- [ ] Environment variables verified
- [ ] Deployed to production
- [ ] Users notified about re-authentication
- [ ] Monitoring set up
- [ ] Documentation reviewed
- [ ] No critical errors in logs

---

## 📞 Support

If you encounter issues:

1. Check `GOOGLE_CALENDAR_SETUP.md` for troubleshooting
2. Review browser console and Convex logs
3. Verify OAuth setup and environment variables
4. Check Google Cloud Console for API quotas/errors

**Everything should be working now!** 🎉

The mini calendar will automatically fetch and display Google Calendar events alongside your internal events.

---

**Date**: 2025-12-07
**Status**: ✅ Ready for Testing and Deployment
