/**
 * TaxPilot — Side Panel Script
 * Full UI logic: tabs, auto-fill, SSN vault, PDF ingestion, pipeline, settings.
 *
 * This file runs as an ES module (sidepanel.html uses type="module").
 * Imports from retriever.js (reads IndexedDB) and db.js (maintenance).
 */

import { getAllRetrievableFields, getReceiptSummary, getIncomeSummary } from './retriever.js';
import { getAllDocuments } from './db.js';

'use strict';

// ── Helpers ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const msg = (type, payload = {}) => chrome.runtime.sendMessage({ type, ...payload });

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToContent(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    return null;
  }
}

// ── Tab navigation ────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    $(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// ── Header: current page info ─────────────────────────────────────────────────
async function updateHeader() {
  const tab = await getActiveTab();
  if (!tab) return;

  const siteLabel = $('site-label');
  const statusDot = $('status-dot');

  const url = tab.url || '';
  if (url.includes('freetaxusa')) {
    siteLabel.textContent = 'FreeTaxUSA';
    statusDot.className = 'status-dot active';
  } else if (url.includes('irs.gov')) {
    siteLabel.textContent = 'IRS.gov';
    statusDot.className = 'status-dot active';
  } else if (url.includes('turbotax')) {
    siteLabel.textContent = 'TurboTax';
    statusDot.className = 'status-dot active';
  } else if (url.includes('ftb.ca.gov')) {
    siteLabel.textContent = 'California FTB';
    statusDot.className = 'status-dot active';
  } else if (url.includes('keepertax.com')) {
    siteLabel.textContent = 'Keeper Tax';
    statusDot.className = 'status-dot active';
  } else if (url.includes('taxhawk') || url.includes('eztaxreturn')) {
    siteLabel.textContent = 'TaxHawk / EZTaxReturn';
    statusDot.className = 'status-dot active';
  } else {
    siteLabel.textContent = new URL(url).hostname || 'Unknown page';
    statusDot.className = 'status-dot warning';
  }
}

// ── Load tax data from storage or bundled JSON ────────────────────────────────
async function loadTaxData() {
  const stored = await chrome.storage.local.get('taxData2025');
  if (stored.taxData2025) return stored.taxData2025;

  // Load bundled data from extension data/ folder
  try {
    const url = chrome.runtime.getURL('data/tax-2025.json');
    const res = await fetch(url);
    const data = await res.json();
    await chrome.storage.local.set({ taxData2025: data });
    return data;
  } catch (err) {
    console.error('Failed to load tax data:', err);
    return null;
  }
}

// ── Auto-fill tab ─────────────────────────────────────────────────────────────
$('btn-scan').addEventListener('click', async () => {
  const tab = await getActiveTab();
  $('page-info').textContent = 'Scanning...';

  const result = await sendToContent(tab.id, { type: 'SCAN_FIELDS' });
  if (!result || !result.fields) {
    $('page-info').textContent = 'No fields found or page not supported.';
    return;
  }

  const fields = result.fields;
  $('page-info').textContent = `Found ${fields.length} form fields on this page`;
  $('field-count').textContent = fields.length;

  const list = $('fields-list');
  list.innerHTML = '';
  for (const f of fields) {
    const div = document.createElement('div');
    div.className = 'field-item';
    div.innerHTML = `
      <span class="field-type">${f.fieldType || '—'}</span>
      <span class="field-name">${f.label || f.name || f.id || 'unnamed'}</span>
    `;
    list.appendChild(div);
  }

  $('fields-card').style.display = fields.length ? 'block' : 'none';
});

$('btn-autofill').addEventListener('click', async () => {
  const tab = await getActiveTab();
  const taxData = await loadTaxData();
  if (!taxData) { showPageInfo('No tax data loaded'); return; }

  const result = await sendToContent(tab.id, {
    type: 'AUTOFILL_PAGE',
    includeSsn: false,
  });

  if (!result) { showPageInfo('Auto-fill failed — is this a supported tax page?'); return; }

  const filled = result.results?.filter(r => r.status === 'filled') || [];
  showFillResults(result.results || []);
  showPageInfo(`✅ Filled ${filled.length} fields (SSN excluded)`);
});

// ── Smart fill — uses retrieval bundle from IndexedDB ─────────────────────────
// Confidence-coded highlights + source badges on each filled field
$('btn-smart-fill').addEventListener('click', async () => {
  const tab = await getActiveTab();

  showPageInfo('Loading retrieval bundle...');
  let bundle;
  try {
    bundle = await getAllRetrievableFields();
  } catch (err) {
    showPageInfo(`Retrieval failed: ${err.message}`);
    return;
  }

  const fieldCount = Object.keys(bundle).filter(k => !k.startsWith('_')).length;
  showPageInfo(`Retrieved ${fieldCount} field values — filling...`);

  const results = await sendToContent(tab.id, {
    type: 'AUTOFILL_WITH_BUNDLE',
    bundle,
    includeSsn: false,
  });

  if (!results) {
    showPageInfo('Smart fill failed — content script not loaded on this page.');
    return;
  }

  const filled   = results.filter(r => r.status === 'filled');
  const sources  = new Set(filled.map(r => r.source).filter(Boolean));
  const avgConf  = filled.length
    ? Math.round(filled.reduce((s, r) => s + (r.confidence || 0), 0) / filled.length)
    : 0;

  showFillResultsWithConfidence(results);
  showPageInfo(
    `✅ Smart fill: ${filled.length} fields · avg ${avgConf}% confidence · ${sources.size} source(s)`
  );
});

$('btn-fill-4868').addEventListener('click', async () => {
  const tab = await getActiveTab();

  // Inject overlay on the page if not already there
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      if (!document.getElementById('taxpilot-overlay')) {
        chrome.runtime.sendMessage({ type: 'INJECT_OVERLAY' });
      }
    },
  });

  const result = await sendToContent(tab.id, {
    type: 'AUTOFILL_PAGE',
    includeSsn: false,
  });

  if (result?.results) {
    const filled = result.results.filter(r => r.status === 'filled');
    showPageInfo(`✅ Form 4868 — filled ${filled.length} fields. Enter SSN to complete.`);
    showFillResults(result.results);
  }
});

function showPageInfo(text) {
  $('page-info').textContent = text;
}

function showFillResults(results) {
  $('fill-results-card').style.display = 'block';
  const list = $('fill-results-list');
  list.innerHTML = '';
  for (const r of results) {
    const div = document.createElement('div');
    div.className = 'result-item';
    const icon = r.status === 'filled' ? '✓' : r.status === 'error' ? '✗' : '—';
    const cls  = r.status === 'filled' ? 'r-ok' : r.status === 'error' ? 'r-err' : 'r-skip';
    div.innerHTML = `
      <span class="${cls}">${icon}</span>
      <span style="color:#aaa">${r.field}</span>
      <span style="color:#666; font-size:10px;">${r.status === 'filled' ? (r.value || '') : (r.error || r.status)}</span>
    `;
    list.appendChild(div);
  }
}

/** Enhanced fill results showing confidence + source for retrieval-backed fills */
function showFillResultsWithConfidence(results) {
  $('fill-results-card').style.display = 'block';
  const list = $('fill-results-list');
  list.innerHTML = '';
  for (const r of results) {
    const div  = document.createElement('div');
    div.className = 'result-item';
    const icon = r.status === 'filled' ? '✓' : r.status === 'error' ? '✗' : '—';
    const cls  = r.status === 'filled' ? 'r-ok' : r.status === 'error' ? 'r-err' : 'r-skip';
    const conf = r.confidence ?? null;
    const confBg = conf === null ? '#444' : conf >= 90 ? '#4ade80' : conf >= 70 ? '#fbbf24' : '#f87171';
    const confStr = conf !== null ? `<span style="background:${confBg};color:#000;font-size:9px;font-weight:700;padding:1px 4px;border-radius:3px;margin-left:4px;">${conf}%</span>` : '';
    const srcStr = r.source ? `<span style="color:#555;font-size:9px;margin-left:4px;">${r.source.replace(/^.*[\\/]/, '').slice(0, 20)}</span>` : '';
    div.innerHTML = `
      <span class="${cls}">${icon}</span>
      <span style="color:#aaa">${r.field}</span>
      <span style="color:#888;font-size:10px;">${r.status === 'filled' ? (r.value || '') : (r.error || r.status)}</span>
      ${confStr}${srcStr}
    `;
    list.appendChild(div);
  }
}

// ── Pipeline progress display ─────────────────────────────────────────────────
const PHASES = ['classify', 'extract', 'judge', 'store'];
const PHASE_LABELS = { classify: '1 Classify', extract: '2 Extract', judge: '3 Judge', store: '4 Store' };

let _activePipelineDocId = null;

function showPipelineProgress(docId) {
  _activePipelineDocId = docId;
  const el = $('pipeline-progress');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = PHASES.map(p => `
    <div class="pipeline-phase" id="phase-${p}">
      <span class="phase-dot pending" id="phase-dot-${p}">○</span>
      <span class="phase-label">${PHASE_LABELS[p]}</span>
      <span class="phase-detail muted small" id="phase-detail-${p}"></span>
    </div>
  `).join('');
}

function updatePipelinePhase(docId, phase, status, detail) {
  if (docId !== _activePipelineDocId) return;
  const dot    = $(`phase-dot-${phase}`);
  const detEl  = $(`phase-detail-${phase}`);
  if (!dot) return;

  dot.textContent = status === 'running' ? '⏳' : status === 'done' ? '✓' : '✗';
  dot.className   = `phase-dot ${status}`;
  if (detEl) detEl.textContent = detail || '';
}

// ── SSN Vault ─────────────────────────────────────────────────────────────────
async function loadSsnStatus() {
  const stored = await chrome.storage.local.get('ssnVault');
  const status = $('ssn-status');
  if (stored.ssnVault?.ssn) {
    status.textContent = '🔒 SSN saved locally (last 4: ' + stored.ssnVault.ssn.slice(-4) + ')';
    status.style.color = '#4ade80';
  } else {
    status.textContent = 'No SSN saved yet';
    status.style.color = '#666';
  }
}

$('btn-save-ssn').addEventListener('click', async () => {
  const ssnInput = $('ssn-input');
  const raw = ssnInput.value.trim().replace(/\D/g, '');
  if (raw.length !== 9) {
    $('ssn-status').textContent = 'Invalid SSN — must be 9 digits';
    $('ssn-status').style.color = '#ef4444';
    return;
  }
  const formatted = `${raw.slice(0,3)}-${raw.slice(3,5)}-${raw.slice(5)}`;
  await chrome.storage.local.set({ ssnVault: { ssn: formatted, savedAt: Date.now() } });
  ssnInput.value = '';
  $('ssn-status').textContent = `✅ SSN saved (ends in ${raw.slice(-4)})`;
  $('ssn-status').style.color = '#4ade80';
});

$('btn-fill-with-ssn').addEventListener('click', async () => {
  const tab = await getActiveTab();
  const stored = await chrome.storage.local.get('ssnVault');
  const ssn = stored.ssnVault?.ssn;
  if (!ssn) {
    $('ssn-status').textContent = 'No SSN saved. Save it first above.';
    $('ssn-status').style.color = '#d97757';
    return;
  }

  const result = await sendToContent(tab.id, {
    type: 'AUTOFILL_PAGE',
    includeSsn: true,
  });

  if (result?.results) {
    const filled = result.results.filter(r => r.status === 'filled');
    showPageInfo(`✅ Filled ${filled.length} fields including SSN`);
    showFillResults(result.results);
  }
});

$('btn-clear-ssn').addEventListener('click', async () => {
  await chrome.storage.local.remove('ssnVault');
  $('ssn-status').textContent = 'SSN cleared';
  $('ssn-status').style.color = '#888';
});

// ── Document analysis tab ─────────────────────────────────────────────────────
let lastDocResult = null;

const dropZone = $('drop-zone');
const fileInput = $('file-input');

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file?.type === 'application/pdf') processDocument(file);
});

fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) processDocument(file);
});

async function processDocument(file) {
  const statusEl = $('doc-status');
  statusEl.textContent = `Queuing ${file.name}...`;
  statusEl.style.color = '#888';

  const stored = await chrome.storage.local.get('geminiApiKey');
  if (!stored.geminiApiKey) {
    statusEl.textContent = '⚠ No Gemini API key — add it in Settings tab first.';
    statusEl.style.color = '#d97757';
    return;
  }

  // Generate unique doc ID for this ingestion run
  const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    // Read as base64
    const pdfBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Show 4-phase pipeline progress UI
    showPipelineProgress(docId);
    statusEl.textContent = 'Pipeline running — 4 phases...';
    statusEl.style.color = '#888';

    // Send to background — runs classify → extract → judge → store
    const response = await chrome.runtime.sendMessage({
      type: 'PROCESS_DOCUMENT',
      docId,
      pdfBase64,
      filename: file.name,
    });

    if (!response.ok) {
      statusEl.textContent = `❌ Pipeline failed: ${response.error}`;
      statusEl.style.color = '#ef4444';
      return;
    }

    const { docType, overallConfidence, fieldCount, approved, flags } = response.result;
    const confColor = overallConfidence >= 90 ? '#4ade80' : overallConfidence >= 70 ? '#fbbf24' : '#f87171';
    statusEl.style.color = confColor;
    statusEl.textContent =
      `✅ ${docType} ingested — ${fieldCount} fields · ${overallConfidence}% confidence · ` +
      `${approved ? 'APPROVED' : `FLAGGED (${flags?.length} issue${flags?.length !== 1 ? 's' : ''})`}`;

    // Refresh document library from IndexedDB
    await refreshDocLibrary();

    // Show inline result — map pipeline extraction to displayDocResults shape
    if (response.result.extractedData) {
      const raw = response.result.extractedData;
      // Normalize across doc types: 1099-NEC, W-2, receipt, etc.
      const normalized = {
        documentType: raw.formType || raw.documentType || response.result.docType,
        vendor: raw.payerName || raw.employerName || raw.vendor || raw.institution || raw.lenderName || null,
        date: raw.date || null,
        amount: raw.box1_nonemployeeCompensation ?? raw.box1_wages ?? raw.totalAmount ?? raw.box1_grossDistribution ?? raw.box1_studentLoanInterest ?? null,
        category: raw.category || null,
        scheduleC_category: raw.scheduleCLine || raw.scheduleC_category || null,
        summary: raw.businessPurpose || raw.notes || raw.summary || null,
        isTaxRelevant: true,
      };
      displayDocResults(normalized, file.name);
    }
  } catch (err) {
    statusEl.textContent = `Failed: ${err.message}`;
    statusEl.style.color = '#ef4444';
  }
}

// Refresh doc library from IndexedDB (replaces chrome.storage.local summaries)
async function refreshDocLibrary() {
  try {
    const docs = await getAllDocuments();
    renderDocLibraryFromIDB(docs);
  } catch {
    // IndexedDB not yet populated — fall through to existing chrome.storage lib
  }
}

function renderDocLibraryFromIDB(docs) {
  const el = $('doc-library');
  if (!docs?.length) {
    el.textContent = 'No documents analyzed yet.';
    el.className = 'muted small';
    return;
  }

  el.className = 'fields-list';
  el.innerHTML = '';

  const sorted = [...docs].sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));

  for (const doc of sorted.slice(0, 20)) {
    const d = document.createElement('div');
    d.className = 'field-item';
    const date  = new Date(doc.uploadedAt || 0).toLocaleDateString();
    const conf  = doc.overallConfidence ?? 0;
    const cBg   = conf >= 90 ? '#4ade80' : conf >= 70 ? '#fbbf24' : '#f87171';
    const badge = doc.status === 'approved'
      ? `<span style="background:#4ade8022;color:#4ade80;font-size:9px;padding:1px 4px;border-radius:3px;">✓</span>`
      : doc.status === 'flagged'
        ? `<span style="background:#fbbf2422;color:#fbbf24;font-size:9px;padding:1px 4px;border-radius:3px;">⚠</span>`
        : `<span style="color:#555;font-size:9px;">${doc.status}</span>`;
    d.innerHTML = `
      <span class="field-type">${doc.docType || '?'}</span>
      <span class="field-name">${doc.issuer || doc.filename?.replace(/^.*[\\/]/, '').slice(0, 18) || '—'}</span>
      <span class="field-value" style="background:${cBg}22;color:${cBg};padding:1px 4px;border-radius:3px;font-size:9px;">${conf}%</span>
      ${badge}
    `;
    el.appendChild(d);
  }
}

function displayDocResults(result, filename) {
  $('doc-results').style.display = 'block';
  $('doc-type-badge').textContent = result.documentType || '?';

  const content = $('doc-results-content');
  content.innerHTML = '';

  const fields = [
    ['Document Type', result.documentType],
    ['Vendor', result.vendor],
    ['Date', result.date],
    ['Amount', result.amount ? `$${Number(result.amount).toLocaleString()}` : null],
    ['Category', result.category],
    ['Schedule C', result.scheduleC_category],
    ['Summary', result.summary || result.notes],
    ['Tax Relevant', result.isTaxRelevant ? 'Yes' : 'No'],
  ];

  for (const [label, value] of fields) {
    if (!value) continue;
    const div = document.createElement('div');
    div.className = 'field-item';
    div.innerHTML = `<span class="field-type">${label}</span><span class="field-name">${value}</span>`;
    content.appendChild(div);
  }
}

async function saveToDocLibrary(filename, result) {
  const stored = await chrome.storage.local.get('docLibrary');
  const library = stored.docLibrary || [];
  library.unshift({
    filename,
    analyzedAt: Date.now(),
    documentType: result.documentType,
    vendor: result.vendor,
    amount: result.amount,
    category: result.category,
    summary: result.summary,
  });
  // Keep last 50 docs
  await chrome.storage.local.set({ docLibrary: library.slice(0, 50) });
  renderDocLibrary(library);
}

function renderDocLibrary(library) {
  const el = $('doc-library');
  if (!library?.length) {
    el.textContent = 'No documents analyzed yet.';
    el.className = 'muted small';
    return;
  }
  el.className = 'fields-list';
  el.innerHTML = '';
  for (const doc of library.slice(0, 10)) {
    const d = document.createElement('div');
    d.className = 'field-item';
    const date = new Date(doc.analyzedAt).toLocaleDateString();
    d.innerHTML = `
      <span class="field-type">${doc.documentType || '?'}</span>
      <span class="field-name">${doc.vendor || doc.filename}</span>
      <span class="field-value">${doc.amount ? '$' + Number(doc.amount).toLocaleString() : date}</span>
    `;
    el.appendChild(d);
  }
}

$('btn-apply-doc').addEventListener('click', async () => {
  if (!lastDocResult?.formFields && !lastDocResult?.formFieldValues) return;
  const tab = await getActiveTab();
  const fields = lastDocResult.formFields || lastDocResult.formFieldValues || {};

  // Send extracted field values to content script to fill
  await sendToContent(tab.id, {
    type: 'FILL_SPECIFIC_FIELDS',
    fields,
  });
});

// ── Settings tab ──────────────────────────────────────────────────────────────
async function loadSettings() {
  const stored = await chrome.storage.local.get(['geminiApiKey', 'analysisMode']);
  if (stored.geminiApiKey) {
    $('api-key-status').textContent = '✅ API key configured';
    $('api-key-status').style.color = '#4ade80';
  }
  if (stored.analysisMode) {
    document.querySelector(`input[name="analysis-mode"][value="${stored.analysisMode}"]`)?.click();
  }
}

$('btn-save-key').addEventListener('click', async () => {
  const key = $('api-key-input').value.trim();
  if (!key.startsWith('AIza')) {
    $('api-key-status').textContent = 'Invalid key format (should start with AIza...)';
    $('api-key-status').style.color = '#ef4444';
    return;
  }
  await chrome.storage.local.set({ geminiApiKey: key });
  $('api-key-input').value = '';
  $('api-key-status').textContent = '✅ API key saved';
  $('api-key-status').style.color = '#4ade80';
});

document.querySelectorAll('input[name="analysis-mode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    chrome.storage.local.set({ analysisMode: radio.value });
  });
});

$('btn-reload-taxdata').addEventListener('click', async () => {
  await chrome.storage.local.remove('taxData2025');
  const data = await loadTaxData();
  if (data) {
    $('api-key-status').textContent = '✅ Tax data reloaded';
  }
});

$('btn-clear-docs').addEventListener('click', async () => {
  await chrome.storage.local.remove('docLibrary');
  // Also clear IndexedDB document store
  await chrome.runtime.sendMessage({ type: 'CLEAR_DOCUMENT_DB' });
  renderDocLibraryFromIDB([]);
});

$('btn-clear-all').addEventListener('click', async () => {
  if (!confirm('Clear ALL TaxPilot data? This includes saved SSN, settings, and all ingested documents.')) return;
  await chrome.storage.local.clear();
  await chrome.runtime.sendMessage({ type: 'CLEAR_DOCUMENT_DB' });
  await loadTaxData(); // Reload defaults
  $('ssn-status').textContent = 'All data cleared';
  renderDocLibraryFromIDB([]);
});

// ── Doc library on load ───────────────────────────────────────────────────────
async function initDocLibrary() {
  // Try IndexedDB first (new pipeline); fall back to chrome.storage.local legacy
  try {
    const docs = await getAllDocuments();
    if (docs?.length) {
      renderDocLibraryFromIDB(docs);
      return;
    }
  } catch { /* IndexedDB unavailable — fall through */ }

  const stored = await chrome.storage.local.get('docLibrary');
  if (stored.docLibrary?.length) renderDocLibrary(stored.docLibrary);
}

// ── Pipeline progress listener ────────────────────────────────────────────────
// Receives PIPELINE_PROGRESS messages from background.js during document ingestion
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PIPELINE_PROGRESS') {
    updatePipelinePhase(msg.docId, msg.phase, msg.status, msg.detail);

    // Auto-refresh library when store phase completes
    if (msg.phase === 'store' && msg.status === 'done') {
      refreshDocLibrary();
    }
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  await updateHeader();
  await loadTaxData();
  await loadSsnStatus();
  await loadSettings();
  await initDocLibrary();
}

// Update header when active tab changes
chrome.tabs.onActivated.addListener(updateHeader);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') updateHeader();
});

init();
