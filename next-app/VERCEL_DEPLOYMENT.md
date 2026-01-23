# Vercel Deployment Instructions

## Project Created
- **Project**: next-app
- **Dashboard**: https://vercel.com/hshum2018-gmailcoms-projects/next-app
- **Latest Deployment**: https://next-h1aq7t81e-hshum2018-gmailcoms-projects.vercel.app

## Status: Environment Variable Missing

The deployment failed because `NEXT_PUBLIC_CONVEX_URL` is not set in Vercel.

### Error
```
Error: Provided address was not an absolute URL.
```

This occurs because the ConvexClientProvider tries to initialize without the Convex URL during the build process.

## Option 1: Set Environment Variable via Dashboard (Recommended)

1. Go to: https://vercel.com/hshum2018-gmailcoms-projects/next-app/settings/environment-variables
2. Click "Add New"
3. Set:
   - **Name**: `NEXT_PUBLIC_CONVEX_URL`
   - **Value**: `https://formal-shepherd-851.convex.cloud`
   - **Environments**: Check all (Production, Preview, Development)
4. Click "Save"
5. Redeploy: `cd next-app && vercel --prod`

## Option 2: Use Vercel CLI (Alternative)

```bash
cd next-app

# Set for Production
echo "https://formal-shepherd-851.convex.cloud" | vercel env add NEXT_PUBLIC_CONVEX_URL production

# Set for Preview
echo "https://formal-shepherd-851.convex.cloud" | vercel env add NEXT_PUBLIC_CONVEX_URL preview

# Set for Development
echo "https://formal-shepherd-851.convex.cloud" | vercel env add NEXT_PUBLIC_CONVEX_URL development

# Redeploy
vercel --prod
```

## Next Steps

After setting the environment variable:
1. Redeploy to Vercel
2. Test the production URL
3. Verify SSR pages work:
   - `/` (landing page)
   - `/analytics/hitl` (HITL dashboard)
   - `/test-ssr` (SSR test page)
4. Run Lighthouse on production URL to confirm 70+ performance

## Expected Performance

Based on local testing, the production deployment should achieve:
- **Performance**: 98/100
- **FCP**: 0.2s
- **LCP**: 1.2s
- **TBT**: 10ms
- **CLS**: 0
