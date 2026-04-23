/**
 * TaxPilot — Content Script
 * Runs on all supported tax sites.
 * - Scans the page for form fields
 * - Fills fields with React/Vue/vanilla-aware events
 * - Reports field map back to side panel
 */

'use strict';

// ── React-aware fill (works on FreeTaxUSA, TurboTax, most modern tax sites) ─
function reactAwareFill(el, value) {
  // Get native setter before React overrides it
  const nativeInputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  const nativeTextAreaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  const setter = el.tagName === 'TEXTAREA' ? nativeTextAreaSetter : nativeInputSetter;

  if (setter) {
    setter.call(el, value);
  } else {
    el.value = value;
  }

  // Fire synthetic events React/Vue listen to
  ['input', 'change', 'blur'].forEach(eventName => {
    el.dispatchEvent(new Event(eventName, { bubbles: true, cancelable: true }));
  });
  el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
}

function reactAwareSelect(el, value) {
  el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// ── Label extraction ─────────────────────────────────────────────────────────
function getLabelText(el) {
  // 1. aria-label
  const ariaLabel = el.getAttribute('aria-label') || '';
  if (ariaLabel) return ariaLabel.toLowerCase();

  // 2. <label for="id">
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`);
    if (label) return label.innerText.toLowerCase();
  }

  // 3. Wrap label
  const parentLabel = el.closest('label');
  if (parentLabel) return parentLabel.innerText.toLowerCase();

  // 4. Sibling/nearby label
  const parent = el.parentElement;
  if (parent) {
    const sibling = parent.querySelector('label') || parent.previousElementSibling;
    if (sibling) return sibling.innerText?.toLowerCase() || '';
  }

  // 5. Placeholder
  return (el.placeholder || '').toLowerCase();
}

// ── Field classification ─────────────────────────────────────────────────────
const FIELD_PATTERNS = {
  // Identity
  ssn:           [/ssn|social.security|tin\b/i, /soc.*sec/i],
  firstName:     [/first.?name|fname|given.?name/i],
  lastName:      [/last.?name|lname|surname|family.?name/i],
  fullName:      [/^name$|full.?name|your.?name/i],
  dob:           [/date.?of.?birth|dob\b|birth.?date/i],
  // Address
  address:       [/address|street|addr1|address1/i],
  city:          [/^city$|city.?name/i],
  state:         [/^state$|state.?code/i],
  zip:           [/zip|postal.?code|zip.?code/i],
  // Form 4868
  estimatedTax:  [/estimated.?tax|line.?4|total.?tax.?liability|est.*tax/i],
  payments:      [/payments|line.?5|total.*payment|withholding/i],
  balanceDue:    [/balance.?due|line.?6|amount.?owed/i],
  paymentAmount: [/payment|amount.*pay|line.?7|pay.*extension/i],
  // Income — used across Keeper, TurboTax, H&R Block
  grossIncome:   [/gross.*income|gross.*receipt|total.*income|1099.*amount|nec.*amount/i],
  wages:         [/^wages?$|w.?2.*wages?|box.?1.*wages?|wage.*income/i],
  agi:           [/adjusted.*gross|agi\b/i],
  // Business / Schedule C
  businessIncome:[/business.*income|self.?employ.*income|freelance.*income/i],
  expenses:      [/total.*expense|business.*expense|deductible.*expense/i],
  netProfit:     [/net.*profit|schedule.*c.*profit|business.*profit/i],
  // Health / ACA
  monthlyPremium:[/monthly.*premium|health.*premium|marketplace.*premium/i],
  aptcPaid:      [/aptc|advance.*premium|advance.*credit|premium.*credit/i],
  // Keeper-specific patterns (from their income/deduction questionnaires)
  keeperW2Wages: [/w2.*income|w-2.*income|employer.*income/i],
  keeperBizInc:  [/business.*revenue|contractor.*income|freelance.*revenue/i],
  keeperDeduct:  [/total.*deduction|itemized.*deduction/i],
  // Contact
  email:         [/email|e-mail/i],
  phone:         [/phone|telephone|tel\b/i],
};

function classifyField(el) {
  const id = (el.id || '').toLowerCase();
  const name = (el.name || '').toLowerCase();
  const label = getLabelText(el);
  const combined = `${id} ${name} ${label}`;

  for (const [fieldType, patterns] of Object.entries(FIELD_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(combined)) return fieldType;
    }
  }
  return null;
}

// ── Keeper Tax context detection ──────────────────────────────────────────────
function isKeeperTax() {
  return window.location.hostname.includes('keepertax.com');
}

// ── Main scanner ─────────────────────────────────────────────────────────────
function scanPageFields() {
  // On Keeper, also scan checkboxes and radio buttons (life events, questionnaires)
  const checkboxSelector = isKeeperTax()
    ? 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
    : 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), select, textarea';

  const inputs = document.querySelectorAll(checkboxSelector);
  const fields = [];

  for (const el of inputs) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (!el.offsetParent && el.type !== 'hidden') continue;

    // Skip pure password/username fields that aren't tax-related
    if ((el.type === 'password' || el.autocomplete === 'current-password') && !isKeeperTax()) continue;

    const fieldType = classifyField(el);
    const label = getLabelText(el);

    fields.push({
      id: el.id || '',
      name: el.name || '',
      type: el.type || el.tagName.toLowerCase(),
      label,
      fieldType,
      placeholder: el.placeholder || '',
      currentValue: el.type === 'checkbox' ? el.checked : (el.value || ''),
      tagName: el.tagName,
      index: fields.length,
      site: isKeeperTax() ? 'keeper' : 'other',
    });
  }

  // Also capture Keeper's card-style checkbox selections (divs with role=checkbox)
  if (isKeeperTax()) {
    const roleCheckboxes = document.querySelectorAll('[role="checkbox"], [role="option"], button[data-testid]');
    for (const el of roleCheckboxes) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      const label = (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 80);
      if (!label) continue;
      fields.push({
        id: el.id || '',
        name: el.getAttribute('data-testid') || '',
        type: 'keeper-card',
        label,
        fieldType: 'keeperLifeEvent',
        placeholder: '',
        currentValue: el.getAttribute('aria-checked') || '',
        tagName: el.tagName,
        index: fields.length,
        site: 'keeper',
      });
    }
  }

  return fields;
}

// ── Auto-fill executor ────────────────────────────────────────────────────────
async function autoFillPage(taxData, ssnValue = '') {
  const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), select, textarea');
  const results = [];

  const valueMap = {
    ssn: ssnValue || '',
    firstName: taxData.taxpayer.firstName,
    lastName: taxData.taxpayer.lastName,
    fullName: taxData.taxpayer.fullName,
    address: taxData.taxpayer.address,
    city: taxData.taxpayer.city,
    state: taxData.taxpayer.state,
    zip: taxData.taxpayer.zip,
    estimatedTax: String(taxData.form4868.estimatedTaxLiability),
    payments: String(taxData.form4868.totalPayments),
    balanceDue: String(taxData.form4868.balanceDue),
    paymentAmount: String(taxData.form4868.amountPaying),
    grossIncome: String(taxData.income.grossSEIncome),
    agi: String(Math.max(0, taxData.form1040.agi)),
  };

  for (const el of inputs) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    const fieldType = classifyField(el);
    if (!fieldType) continue;
    if (fieldType === 'ssn' && !ssnValue) continue; // skip SSN if not provided

    const value = valueMap[fieldType];
    if (value === undefined || value === '') continue;

    try {
      if (el.tagName === 'SELECT') {
        reactAwareSelect(el, value);
        results.push({ field: fieldType, status: 'filled', value });
      } else {
        reactAwareFill(el, value);
        // Highlight filled field briefly
        el.style.transition = 'background 0.4s';
        el.style.background = '#f0fdf4';
        setTimeout(() => { el.style.background = ''; }, 2000);
        results.push({ field: fieldType, status: 'filled', value: fieldType === 'ssn' ? '[SSN]' : value });
      }
    } catch (err) {
      results.push({ field: fieldType, status: 'error', error: err.message });
    }
  }

  return results;
}

// ── Floating overlay injector ────────────────────────────────────────────────
function injectOverlay() {
  if (document.getElementById('taxpilot-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'taxpilot-overlay';
  overlay.innerHTML = `
    <div id="taxpilot-header">
      <span>⚡ TaxPilot</span>
      <button id="taxpilot-close">✕</button>
    </div>
    <div id="taxpilot-body">
      <button id="taxpilot-fill-btn" class="taxpilot-btn primary">Auto-fill This Form</button>
      <button id="taxpilot-scan-btn" class="taxpilot-btn secondary">Scan Fields</button>
      <div id="taxpilot-status"></div>
      <div id="taxpilot-ssn-section" style="display:none;">
        <label style="font-size:11px;color:#aaa;">Enter SSN (stays local, never sent):</label>
        <input id="taxpilot-ssn-input" type="password" placeholder="XXX-XX-XXXX" autocomplete="off"
          style="width:100%;margin:4px 0;padding:6px;border-radius:6px;border:1px solid #d97757;background:#1a1a2e;color:#fff;font-size:13px;" />
        <button id="taxpilot-fill-with-ssn" class="taxpilot-btn primary" style="margin-top:4px;">Fill with SSN</button>
      </div>
      <div id="taxpilot-results" style="max-height:200px;overflow-y:auto;font-size:11px;"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Events
  document.getElementById('taxpilot-close').onclick = () => overlay.remove();
  document.getElementById('taxpilot-scan-btn').onclick = () => {
    const fields = scanPageFields();
    const status = document.getElementById('taxpilot-status');
    status.textContent = `Found ${fields.length} form fields`;
    const results = document.getElementById('taxpilot-results');
    results.innerHTML = fields.map(f =>
      `<div style="padding:2px 0;border-bottom:1px solid #222;">
        <span style="color:#d97757">${f.fieldType || '?'}</span>
        <span style="color:#666"> — ${f.label || f.name || f.id || 'unnamed'}</span>
      </div>`
    ).join('');
  };

  document.getElementById('taxpilot-fill-btn').onclick = async () => {
    const status = document.getElementById('taxpilot-status');
    status.textContent = 'Loading tax data...';

    // Get tax data from storage
    chrome.runtime.sendMessage({ type: 'GET_TAX_DATA' }, async (taxData) => {
      if (!taxData) {
        status.textContent = 'No tax data found';
        return;
      }
      // Show SSN section
      document.getElementById('taxpilot-ssn-section').style.display = 'block';
      status.textContent = 'Enter SSN below to fill all fields, or leave blank to skip SSN.';

      // Also do immediate fill without SSN
      const results = await autoFillPage(taxData, '');
      const filledCount = results.filter(r => r.status === 'filled').length;
      status.textContent = `Filled ${filledCount} fields. Enter SSN below to complete.`;
    });
  };

  document.getElementById('taxpilot-fill-with-ssn').onclick = async () => {
    const ssnInput = document.getElementById('taxpilot-ssn-input');
    const ssn = ssnInput.value.trim();
    const status = document.getElementById('taxpilot-status');

    chrome.runtime.sendMessage({ type: 'GET_TAX_DATA' }, async (taxData) => {
      if (!taxData) { status.textContent = 'No tax data found'; return; }
      const results = await autoFillPage(taxData, ssn);
      const filledCount = results.filter(r => r.status === 'filled').length;
      status.textContent = `✅ Filled ${filledCount} fields including SSN`;
      ssnInput.value = ''; // Clear SSN input immediately
    });
  };
}

// ── Message listener ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SCAN_FIELDS') {
    sendResponse({ fields: scanPageFields() });
    return false;
  }

  if (msg.type === 'AUTOFILL_PAGE') {
    chrome.storage.local.get(['taxData2025', 'ssnVault'], async (stored) => {
      const taxData = stored.taxData2025;
      const ssn = msg.includeSsn ? (stored.ssnVault?.ssn || '') : '';
      if (!taxData) { sendResponse({ error: 'No tax data stored' }); return; }
      const results = await autoFillPage(taxData, ssn);
      sendResponse({ results });
    });
    return true;
  }

  // NEW: Retrieval-backed fill — bundle comes pre-resolved from retriever.js
  // bundle: { fieldType: { value, confidence, source, sourceDocType } }
  if (msg.type === 'AUTOFILL_WITH_BUNDLE') {
    autoFillWithBundle(msg.bundle, msg.includeSsn || false).then(sendResponse);
    return true;
  }

  if (msg.type === 'FILL_SPECIFIC_FIELDS') {
    fillSpecificFields(msg.fields).then(sendResponse);
    return true;
  }

  if (msg.type === 'INJECT_OVERLAY') {
    injectOverlay();
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === 'PING') {
    sendResponse({ ok: true, url: window.location.href });
    return false;
  }
});

// ── Retrieval-backed fill ──────────────────────────────────────────────────────
async function autoFillWithBundle(bundle, includeSsn) {
  const inputs = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), select, textarea'
  );
  const results = [];

  for (const el of inputs) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    const fieldType = classifyField(el);
    if (!fieldType) continue;
    if (fieldType === 'ssn' && !includeSsn) continue;

    const retrieved = bundle[fieldType];
    if (!retrieved || retrieved.value === undefined || retrieved.value === null) continue;

    const valueStr = String(retrieved.value);
    if (!valueStr || valueStr === 'undefined') continue;

    try {
      if (el.tagName === 'SELECT') {
        reactAwareSelect(el, valueStr);
      } else {
        reactAwareFill(el, valueStr);
      }

      // Confidence-coded highlight: green ≥90, yellow 70-89, orange <70
      const conf = retrieved.confidence || 0;
      const hlColor = conf >= 90 ? '#f0fdf4' : conf >= 70 ? '#fefce8' : '#fff7ed';
      el.style.transition = 'background 0.5s';
      el.style.background = hlColor;
      setTimeout(() => { el.style.background = ''; }, 3000);

      // Floating badge showing source + confidence
      showConfidenceBadge(el, retrieved);

      results.push({
        field: fieldType,
        status: 'filled',
        value: fieldType === 'ssn' ? '[SSN]' : valueStr,
        confidence: conf,
        source: retrieved.source || 'computed',
        sourceDocType: retrieved.sourceDocType || '',
      });
    } catch (err) {
      results.push({ field: fieldType, status: 'error', error: err.message });
    }
  }

  return results;
}

function showConfidenceBadge(el, retrieved) {
  // Remove any existing badge
  el.parentElement?.querySelector('.taxpilot-conf-badge')?.remove();

  const conf = retrieved.confidence || 0;
  const bg = conf >= 90 ? '#4ade80' : conf >= 70 ? '#fbbf24' : '#f87171';
  const src = (retrieved.source || 'computed').replace(/^.*[\\/]/, '').slice(0, 20);

  const badge = document.createElement('span');
  badge.className = 'taxpilot-conf-badge';
  badge.textContent = `⚡${conf}% · ${src}`;
  badge.title = `Source: ${retrieved.source || 'computed'}\nConfidence: ${conf}%\nType: ${retrieved.sourceDocType || 'computed'}`;
  badge.style.cssText = [
    'position:absolute', 'top:-16px', 'right:0',
    `background:${bg}`, 'color:#000', 'font-size:9px', 'font-weight:700',
    'padding:1px 5px', 'border-radius:3px', 'pointer-events:none',
    'z-index:2147483647', 'font-family:monospace', 'white-space:nowrap',
    'box-shadow:0 1px 3px rgba(0,0,0,0.3)',
  ].join(';');

  const parent = el.parentElement;
  if (parent) {
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    parent.appendChild(badge);
    setTimeout(() => badge.remove(), 6000);
  }
}

// ── Fill specific fields by name/value map ─────────────────────────────────────
async function fillSpecificFields(fieldsMap) {
  const inputs = document.querySelectorAll('input, select, textarea');
  const results = [];

  for (const el of inputs) {
    const name = el.name || el.id || el.getAttribute('data-field') || '';
    const value = fieldsMap[name] ?? fieldsMap[el.id];
    if (value === undefined) continue;
    try {
      if (el.tagName === 'SELECT') reactAwareSelect(el, String(value));
      else reactAwareFill(el, String(value));
      results.push({ field: name, status: 'filled', value: String(value) });
    } catch (err) {
      results.push({ field: name, status: 'error', error: err.message });
    }
  }
  return results;
}

// ── Auto-detect tax form pages ───────────────────────────────────────────────
function detectTaxFormPage() {
  const url = window.location.href;
  const text = document.title.toLowerCase();

  const isTaxFormPage =
    url.includes('freetaxusa.com') ||
    url.includes('irs.gov') ||
    (text.includes('tax') && (text.includes('extension') || text.includes('form') || text.includes('return')));

  if (isTaxFormPage) {
    // Notify background that we're on a tax form page
    chrome.runtime.sendMessage({
      type: 'TAX_PAGE_DETECTED',
      url,
      title: document.title,
    });
  }
}

// Run on load
detectTaxFormPage();
