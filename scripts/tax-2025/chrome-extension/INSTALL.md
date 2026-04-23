# TaxPilot Chrome Extension — Install Guide

## 30-Second Install

1. Open Chrome → go to `chrome://extensions/`
2. Toggle **Developer mode** ON (top-right switch)
3. Click **Load unpacked**
4. Select this folder: `scripts/tax-2025/chrome-extension/`
5. Pin the ⚡ TaxPilot icon in your toolbar

Done. Extension is live.

---

## First-Time Setup (2 minutes)

### Step 1 — Add Gemini API Key (for PDF analysis)
- Click ⚡ icon → **Open Side Panel** → **Settings** tab
- Paste your Gemini API key (get one free at aistudio.google.com)
- Click Save

### Step 2 — Save your SSN (optional, for full auto-fill)
- Go to **Auto-fill** tab → SSN Vault section
- Type your SSN → click Save
- It's stored ONLY on your device in `chrome.storage.local`
- Never transmitted anywhere

---

## How to File Form 4868 Extension

1. Go to `https://www.freetaxusa.com/extension/`
2. Click the ⚡ icon → **Open Side Panel** (or press `Alt+T`)
3. Click **Auto-fill** tab
4. Click **Fill Form 4868 Now**
5. All $0 fields are filled automatically
6. If SSN saved → click **Fill Form + SSN**
7. Click Submit on FreeTaxUSA

All pre-filled values:
- Line 4 (Estimated Tax): **$0**
- Line 5 (2025 Payments): **$0**  
- Line 6 (Balance Due): **$0**
- Line 7 (Payment): **$0**

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+T` | Toggle side panel |
| `Alt+F` | Auto-fill current page |

---

## PDF Document Analysis

1. Go to **Documents** tab
2. Drag & drop any tax PDF (1099, receipt, invoice, W-2)
3. Gemini AI extracts: vendor, date, amount, category, Schedule C type
4. Click **Apply to Current Form** to fill fields from the document
5. All analyzed documents saved in Document Library

Supported document types:
- 1099-NEC, 1099-MISC, W-2, 1098-E, 1095-A
- Business receipts and invoices
- EOB (Explanation of Benefits)
- Bank statements
- Utility bills

---

## Supported Tax Sites

| Site | Auto-fill | PDF Upload |
|------|-----------|------------|
| FreeTaxUSA | ✅ | ✅ |
| IRS Free File | ✅ | ✅ |
| TurboTax | ✅ | ✅ |
| H&R Block | ✅ | ✅ |
| TaxAct | ✅ | ✅ |
| California FTB | ✅ | ✅ |
| TaxSlayer | ✅ | ✅ |

---

## Pre-loaded Tax Data (2025)

The extension comes pre-loaded with Homen Shum's 2025 computed tax data:

| Field | Value |
|-------|-------|
| Taxpayer | Homen Shum |
| Filing Status | Single |
| Gross SE Income | $43,304 |
| Schedule C Net Profit | $161 |
| AGI | −$316 (loss) |
| Federal Tax | $0 |
| APTC Repayment | $400 |
| **Total Federal Owed** | **$400** |
| CA Refund | $11 |
| **Net Owed** | **~$389** |
| QBI Carryforward → 2026 | $63,520 |
| Extension Deadline | Oct 15, 2026 |

To update tax data: **Settings** → **Reload Tax Data**

---

## Future Expansions

This extension is designed to grow:

1. **Multi-year support** — swap in `data/tax-2026.json` each year
2. **Multi-taxpayer** — add profiles with separate SSN vaults
3. **Bank statement ingestion** — connect Chase/Schwab CSV exports
4. **Real-time page analysis** — detect any form on any page and suggest fills
5. **Gemini Live mode** — describe what field you're looking at, get the right value
6. **Receipt camera** — snap photo → immediate Gemini extraction → auto-fill
7. **Extension status tracker** — shows IRS acceptance status in toolbar badge

---

## Security Notes

- SSN stored in `chrome.storage.local` — never leaves your device
- Gemini API calls go directly from your browser to Google's API
- No data passes through any intermediate server
- Extension has no analytics or tracking
