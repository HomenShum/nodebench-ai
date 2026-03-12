#!/usr/bin/env node
/**
 * Sentinel Demo Session — Operates NodeBench AI like a real user
 *
 * Launches the app, navigates via the Jarvis HUD voice/text commands,
 * interacts with views, captures screenshots as evidence.
 *
 * Usage:
 *   node scripts/sentinel/demo-session.mjs              # headless
 *   node scripts/sentinel/demo-session.mjs --headed      # visible browser
 *   node scripts/sentinel/demo-session.mjs --slow 500    # slow motion (ms)
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '../..');
const EVIDENCE_DIR = join(ROOT, '.sentinel', 'demo-evidence');
mkdirSync(EVIDENCE_DIR, { recursive: true });

const args = process.argv.slice(2);
const headed = args.includes('--headed');
const slowIdx = args.indexOf('--slow');
const slowMo = slowIdx >= 0 ? parseInt(args[slowIdx + 1]) || 300 : (headed ? 200 : 0);
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// ── Voice commands to simulate a real user session ───────────────────────────
const SESSION_SCRIPT = [
  // Act 1: Landing & Orientation
  { action: 'navigate', url: '/', wait: 2000, desc: 'Land on homepage' },
  { action: 'screenshot', name: '01-landing' },
  { action: 'sign-in', desc: 'Sign in anonymously if prompted' },
  { action: 'screenshot', name: '02-signed-in' },

  // Act 2: Voice Navigation — tour the app
  { action: 'voice', text: 'go to research', wait: 1500, desc: 'Navigate to Research Hub' },
  { action: 'screenshot', name: '03-research-hub' },

  { action: 'voice', text: 'show me funding', wait: 1500, desc: 'Navigate to Funding Brief' },
  { action: 'screenshot', name: '04-funding' },

  { action: 'voice', text: 'open benchmarks', wait: 1500, desc: 'Navigate to Benchmarks' },
  { action: 'screenshot', name: '05-benchmarks' },

  { action: 'voice', text: 'go to calendar', wait: 1500, desc: 'Navigate to Calendar' },
  { action: 'screenshot', name: '06-calendar' },

  { action: 'voice', text: 'show documents', wait: 1500, desc: 'Navigate to Documents' },
  { action: 'screenshot', name: '07-documents' },

  { action: 'voice', text: 'open agents', wait: 1500, desc: 'Navigate to Agent Marketplace' },
  { action: 'screenshot', name: '08-agents' },

  { action: 'voice', text: 'show me costs', wait: 1500, desc: 'Navigate to Cost Dashboard' },
  { action: 'screenshot', name: '09-costs' },

  // Act 3: Mode switching
  { action: 'voice', text: 'switch to intelligence mode', wait: 1000, desc: 'Switch cockpit mode' },
  { action: 'screenshot', name: '10-intel-mode' },

  { action: 'voice', text: 'switch to build mode', wait: 1000, desc: 'Switch to build mode' },
  { action: 'screenshot', name: '11-build-mode' },

  // Act 4: System commands
  { action: 'voice', text: 'open settings', wait: 1000, desc: 'Open settings modal' },
  { action: 'screenshot', name: '12-settings' },
  { action: 'keyboard', key: 'Escape', wait: 500, desc: 'Close settings' },

  { action: 'voice', text: 'dark mode', wait: 1000, desc: 'Switch to dark theme' },
  { action: 'screenshot', name: '13-dark-mode' },

  { action: 'voice', text: 'light mode', wait: 1000, desc: 'Switch to light theme' },
  { action: 'screenshot', name: '14-light-mode' },

  // Act 5: Quick navigation tour (rapid fire)
  { action: 'voice', text: 'go to showcase', wait: 1000 },
  { action: 'screenshot', name: '15-showcase' },

  { action: 'voice', text: 'show signals', wait: 1000 },
  { action: 'screenshot', name: '16-signals' },

  { action: 'voice', text: 'open timeline', wait: 1000 },
  { action: 'screenshot', name: '17-timeline' },

  { action: 'voice', text: 'go to activity', wait: 1000 },
  { action: 'screenshot', name: '18-activity' },

  { action: 'voice', text: 'show github', wait: 1000 },
  { action: 'screenshot', name: '19-github' },

  { action: 'voice', text: 'open linkedin', wait: 1000 },
  { action: 'screenshot', name: '20-linkedin' },

  // Act 6: Utility commands
  { action: 'voice', text: 'scroll to bottom', wait: 800, desc: 'Scroll down' },
  { action: 'screenshot', name: '21-scrolled-bottom' },

  { action: 'voice', text: 'scroll to top', wait: 800, desc: 'Scroll up' },

  { action: 'voice', text: 'go back', wait: 1000, desc: 'Navigate back' },
  { action: 'screenshot', name: '22-go-back' },

  { action: 'voice', text: 'refresh', wait: 1000, desc: 'Refresh current view' },

  // Act 7: Agent interaction (talk to Jarvis)
  { action: 'voice', text: 'what is the latest in AI benchmarks?', wait: 3000, desc: 'Ask agent a question (falls through to chat)' },
  { action: 'screenshot', name: '23-agent-chat' },

  // Act 8: Return home
  { action: 'voice', text: 'go home', wait: 1500, desc: 'Navigate home' },
  { action: 'screenshot', name: '24-home-final' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

async function waitFor(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Find the input bar (Jarvis HUD or FastAgentPanel) ────────────────────────
async function findInputBar(page) {
  // Try Jarvis HUD prompt bar first
  const jarvisInput = page.locator('[data-testid="jarvis-prompt-input"], [data-testid="hud-prompt-input"]');
  if (await jarvisInput.count() > 0) return jarvisInput.first();

  // Try FastAgentPanel input bar
  const agentInput = page.locator('[data-testid="agent-input"], textarea[placeholder*="Ask"], textarea[placeholder*="Type"]');
  if (await agentInput.count() > 0) return agentInput.first();

  // Fallback: any visible textarea or input that looks like a chat input
  const textarea = page.locator('textarea').first();
  if (await textarea.isVisible().catch(() => false)) return textarea;

  const input = page.locator('input[type="text"]').first();
  if (await input.isVisible().catch(() => false)) return input;

  return null;
}

// ── Submit a voice-like command via the input bar ────────────────────────────
async function submitVoiceCommand(page, text) {
  const input = await findInputBar(page);
  if (!input) {
    log(`  ! No input bar found — trying keyboard shortcut`);
    // Try Ctrl+K to open command palette as fallback
    await page.keyboard.press('Control+k');
    await waitFor(500);
    const paletteInput = page.locator('[data-testid="command-palette-input"], input[placeholder*="Search"]').first();
    if (await paletteInput.isVisible().catch(() => false)) {
      await paletteInput.fill(text);
      await paletteInput.press('Enter');
      return true;
    }
    return false;
  }

  await input.click();
  await input.fill(text);
  await waitFor(100);

  // Submit: Enter key or click submit button
  await input.press('Enter');
  return true;
}

// ── Main Session ─────────────────────────────────────────────────────────────
async function main() {
  log('=== Sentinel Demo Session ===');
  log(`Mode: ${headed ? 'headed' : 'headless'}, slowMo: ${slowMo}ms`);
  log(`Target: ${BASE_URL}`);
  log(`Evidence: ${EVIDENCE_DIR}\n`);

  const browser = await chromium.launch({
    headless: !headed,
    slowMo,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });

  // Collect console errors
  const consoleErrors = [];
  const pageErrors = [];

  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => pageErrors.push(err.message));

  const results = [];
  let stepNum = 0;

  for (const step of SESSION_SCRIPT) {
    stepNum++;
    const desc = step.desc || step.text || step.name || step.action;
    log(`[${stepNum}/${SESSION_SCRIPT.length}] ${step.action}: ${desc}`);

    try {
      switch (step.action) {
        case 'navigate':
          await page.goto(`${BASE_URL}${step.url}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
          if (step.wait) await waitFor(step.wait);
          results.push({ step: stepNum, action: step.action, status: 'ok', desc });
          break;

        case 'sign-in': {
          const signInBtn = page.getByRole('button', { name: /sign in anonymously/i });
          if (await signInBtn.count() > 0) {
            await signInBtn.click();
            await page.waitForLoadState('networkidle').catch(() => {});
            log('  Signed in anonymously');
          } else {
            log('  No sign-in needed');
          }
          results.push({ step: stepNum, action: 'sign-in', status: 'ok', desc });
          break;
        }

        case 'voice': {
          const sent = await submitVoiceCommand(page, step.text);
          if (step.wait) await waitFor(step.wait);
          results.push({
            step: stepNum,
            action: 'voice',
            status: sent ? 'ok' : 'no-input',
            command: step.text,
            desc,
          });
          break;
        }

        case 'screenshot': {
          const path = join(EVIDENCE_DIR, `${step.name}.png`);
          await page.screenshot({ path, fullPage: false });
          results.push({ step: stepNum, action: 'screenshot', status: 'ok', file: step.name });
          break;
        }

        case 'keyboard':
          await page.keyboard.press(step.key);
          if (step.wait) await waitFor(step.wait);
          results.push({ step: stepNum, action: 'keyboard', status: 'ok', key: step.key });
          break;

        default:
          results.push({ step: stepNum, action: step.action, status: 'unknown' });
      }
    } catch (err) {
      log(`  ERROR: ${err.message.slice(0, 100)}`);
      results.push({ step: stepNum, action: step.action, status: 'error', error: err.message.slice(0, 200) });
      // Take error screenshot
      try {
        await page.screenshot({ path: join(EVIDENCE_DIR, `error-step-${stepNum}.png`) });
      } catch { /* ignore */ }
    }
  }

  await browser.close();

  // ── Report ─────────────────────────────────────────────────────────────────
  const report = {
    sessionId: `demo-${Date.now()}`,
    timestamp: new Date().toISOString(),
    baseURL: BASE_URL,
    headed,
    slowMo,
    totalSteps: SESSION_SCRIPT.length,
    okSteps: results.filter(r => r.status === 'ok').length,
    errorSteps: results.filter(r => r.status === 'error').length,
    consoleErrors: consoleErrors.length,
    pageErrors: pageErrors.length,
    results,
    errors: {
      console: consoleErrors.slice(0, 20),
      page: pageErrors.slice(0, 10),
    },
  };

  const reportPath = join(EVIDENCE_DIR, 'session-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log('\n=== Demo Session Complete ===');
  log(`Steps: ${report.okSteps}/${report.totalSteps} OK, ${report.errorSteps} errors`);
  log(`Console errors: ${consoleErrors.length}`);
  log(`Page errors: ${pageErrors.length}`);
  log(`Screenshots: ${results.filter(r => r.action === 'screenshot' && r.status === 'ok').length}`);
  log(`Report: ${reportPath}`);
  log(`Evidence: ${EVIDENCE_DIR}`);

  if (report.errorSteps > 0) {
    log('\nFailed steps:');
    for (const r of results.filter(r => r.status === 'error')) {
      log(`  Step ${r.step}: ${r.action} — ${r.error}`);
    }
  }

  process.exit(report.errorSteps > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Demo session crashed:', err);
  process.exit(2);
});
