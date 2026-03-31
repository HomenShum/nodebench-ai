# Gmail Tax Scanner — Setup (3 minutes)

## Step 1: Create Google Cloud OAuth Credentials

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click **"Create Credentials"** > **"OAuth client ID"**
3. If prompted to configure consent screen:
   - Choose **"External"**
   - App name: "Tax Scanner" (anything works)
   - User support email: your email
   - Developer email: your email
   - Click **Save and Continue** through all steps
4. Back on Credentials page: **"Create Credentials"** > **"OAuth client ID"**
   - Application type: **"Desktop app"**
   - Name: "Tax Scanner"
   - Click **Create**
5. Click **"Download JSON"** — save as `credentials.json` in this folder:
   ```
   scripts/tax-2025/credentials.json
   ```

## Step 2: Enable Gmail API

1. Go to: https://console.cloud.google.com/apis/library/gmail.googleapis.com
2. Click **"Enable"**

## Step 3: Install Dependencies

```bash
npm install googleapis @google-cloud/local-auth
```

## Step 4: Run the Scanner

```bash
node scripts/tax-2025/gmail-tax-scanner.mjs
```

- A browser window opens for Google sign-in (one-time)
- Grant **read-only** Gmail access
- Scanner runs all 33 tax queries automatically
- Downloads all PDF/document attachments
- Organizes into `docs/career/2025-Tax-Bundle/`

## What It Does

- Searches 33 categories of tax-related emails
- Downloads PDF, DOC, XLS, CSV attachments
- Deduplicates across overlapping queries
- Creates organized folder structure
- Generates a scan manifest and summary report
- Identifies missing categories that need manual action

## Security Notes

- **Read-only access** — script cannot modify or delete emails
- `credentials.json` and `token.json` are local only
- Token is saved so you only authenticate once
- Add `scripts/tax-2025/credentials.json` and `scripts/tax-2025/token.json` to .gitignore
