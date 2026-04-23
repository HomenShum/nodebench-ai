/**
 * TaxPilot — Background Service Worker
 * Handles message routing, Gemini API calls, agentic pipeline, keyboard commands.
 */

import { runPipeline }         from './pipeline.js';
import { clearAllData, getStats } from './db.js';

// ── Side Panel: open on icon click ─────────────────────────────────────────
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// ── Commands ────────────────────────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'toggle-sidepanel') {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
  if (command === 'autofill-page') {
    chrome.tabs.sendMessage(tab.id, { type: 'AUTOFILL_PAGE' });
  }
});

// ── Message router ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // ── Agentic 4-phase pipeline: classify → extract → judge → store ──────────
  if (msg.type === 'PROCESS_DOCUMENT') {
    runPipeline(msg.docId, msg.pdfBase64, msg.filename)
      .then(result => sendResponse({ ok: true, result }))
      .catch(err   => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  // ── DB operations ─────────────────────────────────────────────────────────
  if (msg.type === 'GET_DB_STATS') {
    getStats().then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (msg.type === 'CLEAR_DOCUMENT_DB') {
    clearAllData().then(() => sendResponse({ ok: true })).catch(err => sendResponse({ error: err.message }));
    return true;
  }

  // ── Legacy single-shot Gemini analysis (kept for backward compat) ─────────
  if (msg.type === 'GEMINI_ANALYZE') {
    handleGeminiAnalyze(msg.payload).then(sendResponse).catch(err => {
      sendResponse({ error: err.message });
    });
    return true;
  }

  if (msg.type === 'GET_PAGE_FIELDS') {
    chrome.tabs.sendMessage(sender.tab?.id || msg.tabId, { type: 'SCAN_FIELDS' }, sendResponse);
    return true;
  }

  if (msg.type === 'DO_AUTOFILL') {
    chrome.tabs.sendMessage(msg.tabId, { type: 'AUTOFILL_PAGE', data: msg.data }, sendResponse);
    return true;
  }

  if (msg.type === 'OPEN_SIDEPANEL') {
    chrome.sidePanel.open({ tabId: msg.tabId });
    sendResponse({ ok: true });
  }

  if (msg.type === 'TAX_PAGE_DETECTED') {
    return false; // no-op, future: update badge
  }
});

// ── Gemini PDF Analysis ─────────────────────────────────────────────────────
async function handleGeminiAnalyze({ pdfBase64, filename, mode = 'triage' }) {
  const stored = await chrome.storage.local.get('geminiApiKey');
  const apiKey = stored.geminiApiKey;
  if (!apiKey) throw new Error('Gemini API key not configured. Add it in TaxPilot settings.');

  const model = mode === 'deep' ? 'gemini-2.5-flash' : 'gemini-2.5-flash-lite-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = mode === 'triage'
    ? `Analyze this tax document "${filename}". Return JSON:
{
  "isTaxRelevant": true/false,
  "documentType": "1099-NEC|W-2|1098-E|1095-A|receipt|invoice|statement|EOB|other",
  "vendor": "company name",
  "date": "YYYY-MM-DD or null",
  "amount": number or null,
  "category": "income|business_expense|health|deduction|other",
  "summary": "one line description",
  "formFields": {
    "description of field": "value to fill"
  }
}`
    : `Deep-extract all tax data from this document "${filename}" for a self-employed single filer (Schedule C). Return JSON:
{
  "documentType": "string",
  "vendor": "string",
  "vendorEIN": "string or null",
  "recipientName": "string",
  "taxYear": "2025",
  "date": "YYYY-MM-DD",
  "amounts": { "total": 0, "federal_withheld": 0, "state_withheld": 0 },
  "scheduleC_category": "advertising|car|commissions|depreciation|insurance|interest|legal|meals|office|rent|repairs|supplies|taxes|travel|utilities|wages|other",
  "deductionType": "business_expense|home_office|health_insurance|student_loan|charitable|none",
  "taxFormBoxes": { "box1": "value", "box4": "federal_withheld" },
  "notes": "anything the filer needs to know",
  "formFieldValues": { "field_name": "value_to_fill" }
}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
          { text: prompt },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText.substring(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');

  try {
    return { result: JSON.parse(text), raw: text };
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    return { result: match ? JSON.parse(match[0]) : { error: 'parse failed' }, raw: text };
  }
}

// ── Install handler ─────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log('TaxPilot installed. Configure Gemini API key in settings.');
});
