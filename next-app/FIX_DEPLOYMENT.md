# Fix Vercel Deployment - Environment Variable Issue

## Problem Identified

The `/analytics/hitl` and `/test-hitl` pages are failing with **"fetch failed"** error because the `NEXT_PUBLIC_CONVEX_URL` environment variable contains newlines, making it invalid.

**Evidence**: Test page at https://next-app-khaki-five.vercel.app/test-hitl shows:
```
Error: fetch failed
```

## Solution: Fix Environment Variable via Dashboard

### Step 1: Remove Malformed Variable

1. Go to: https://vercel.com/hshum2018-gmailcoms-projects/next-app/settings/environment-variables
2. Find `NEXT_PUBLIC_CONVEX_URL`
3. Click the three dots menu (⋯) next to it
4. Click "Remove"
5. Confirm removal

### Step 2: Add Correct Variable

1. Click "Add New" button
2. Fill in:
   - **Key**: `NEXT_PUBLIC_CONVEX_URL`
   - **Value**: `https://formal-shepherd-851.convex.cloud` (copy this exact value, no spaces, no newlines)
   - **Environments**: Check all three:
     - ☑ Production
     - ☑ Preview
     - ☑ Development
3. Click "Save"

### Step 3: Redeploy

```bash
cd next-app
vercel --prod
```

Or click "Redeploy" in the Vercel dashboard at:
https://vercel.com/hshum2018-gmailcoms-projects/next-app

## Verification

After redeployment, test these URLs:

1. **Landing Page** (should already work):
   https://next-app-khaki-five.vercel.app

2. **Test HITL** (should show "Success" instead of "Error"):
   https://next-app-khaki-five.vercel.app/test-hitl

3. **HITL Analytics** (should load the dashboard):
   https://next-app-khaki-five.vercel.app/analytics/hitl

## Alternative: Use Vercel CLI (More Manual)

If you prefer CLI, you can use this approach:

```bash
cd next-app

# Open the Vercel dashboard to manually delete the variable:
# https://vercel.com/hshum2018-gmailcoms-projects/next-app/settings/environment-variables

# After manual deletion, add it back via CLI (when prompted, enter N for "Mark as sensitive"):
printf "https://formal-shepherd-851.convex.cloud" | vercel env add NEXT_PUBLIC_CONVEX_URL production
printf "https://formal-shepherd-851.convex.cloud" | vercel env add NEXT_PUBLIC_CONVEX_URL preview
printf "https://formal-shepherd-851.convex.cloud" | vercel env add NEXT_PUBLIC_CONVEX_URL development

# Redeploy
vercel --prod
```

## Expected Result

After fixing the environment variable and redeploying:
- ✅ Landing page works (already working)
- ✅ `/test-hitl` shows success with data
- ✅ `/analytics/hitl` loads the HITL dashboard
- ✅ Lighthouse performance: 70-98/100 (target achieved)

## Technical Details

**Root Cause**: When using `echo -e` in bash scripts, the environment variable value included newline characters (`\n`), which corrupted the URL.

**Fix**: Use the Vercel dashboard (web UI) to set the variable directly, ensuring no hidden characters or newlines are included.

## Next Steps After Fix

1. Run Lighthouse test on production URL
2. Verify 70+ performance score (expecting 98/100)
3. Migrate additional pages (research, documents, agents)
4. Set up traffic routing strategy from Vite app to Next.js app
