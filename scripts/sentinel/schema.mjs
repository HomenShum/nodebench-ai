/**
 * Sentinel Report Schema — shared types and constants for the self-testing system.
 *
 * Three layers feed into a single SentinelReport:
 *   Layer 1 (Runner)    → runs test suites, collects pass/fail
 *   Layer 2 (Diagnose)  → triages failures, root-causes, priorities
 *   Layer 3 (Correct)   → agent prompt for autonomous fix loop
 */

// ── Severity levels ──────────────────────────────────────────────────────────
export const SEVERITY = { critical: 0, high: 1, medium: 2, low: 3 };

// ── Test probe categories ────────────────────────────────────────────────────
export const PROBE_CATEGORIES = [
  'e2e',           // Playwright E2E tests
  'visual',        // Screenshot regression / Gemini QA
  'design',        // Design linter (color, typography, focus, motion)
  'a11y',          // Accessibility (WCAG touch targets, aria, focus)
  'build',         // TypeScript compilation, vite build
  'dogfood',       // CI QA gate (manifest, walkthrough, scribe, frames)
  'voice',         // Voice intent router coverage
  'performance',   // Lighthouse / bundle size
  'contract',      // MCP agent contract compliance
];

// ── Report structure ─────────────────────────────────────────────────────────
/**
 * @typedef {Object} ProbeResult
 * @property {string} probe - probe name (e.g. 'e2e:scenario-regression')
 * @property {string} category - one of PROBE_CATEGORIES
 * @property {'pass'|'fail'|'warn'|'skip'} status
 * @property {number} duration - ms
 * @property {string} [summary] - 1-line human-readable
 * @property {string[]} [failures] - list of failure messages
 * @property {Object} [meta] - probe-specific data (screenshot paths, scores, etc.)
 */

/**
 * @typedef {Object} DiagnosisItem
 * @property {string} id - unique (e.g. 'diag-001')
 * @property {string} probe - which probe found it
 * @property {string} symptom - what's wrong
 * @property {string} rootCause - 5-whys analysis
 * @property {string[]} affectedFiles - files to fix
 * @property {number} severity - 0=critical, 1=high, 2=medium, 3=low
 * @property {number} blastRadius - estimated # of views/tests affected
 * @property {string} suggestedFix - 1-sentence fix description
 * @property {'pending'|'fixing'|'fixed'|'wontfix'|'blocked'} status
 */

/**
 * @typedef {Object} FixAttempt
 * @property {string} diagnosisId
 * @property {number} attempt - 1-indexed
 * @property {string} action - what was done
 * @property {boolean} success
 * @property {string} [verification] - re-test result
 * @property {number} timestamp
 */

/**
 * @typedef {Object} SentinelReport
 * @property {string} id - run ID (timestamp-based)
 * @property {string} startedAt - ISO
 * @property {string} [completedAt] - ISO
 * @property {'running'|'completed'|'failed'|'aborted'} status
 * @property {ProbeResult[]} probes
 * @property {DiagnosisItem[]} diagnoses
 * @property {FixAttempt[]} fixes
 * @property {{ total: number, passed: number, failed: number, warned: number, skipped: number }} summary
 * @property {number} iterations - how many fix-verify cycles ran
 * @property {number} maxIterations
 */

/** Create a fresh sentinel report */
export function createReport(maxIterations = 5) {
  return {
    id: `sentinel-${Date.now()}`,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: 'running',
    probes: [],
    diagnoses: [],
    fixes: [],
    summary: { total: 0, passed: 0, failed: 0, warned: 0, skipped: 0 },
    iterations: 0,
    maxIterations,
  };
}

/** Compute summary from probes */
export function computeSummary(probes) {
  const s = { total: probes.length, passed: 0, failed: 0, warned: 0, skipped: 0 };
  for (const p of probes) {
    if (p.status === 'pass') s.passed++;
    else if (p.status === 'fail') s.failed++;
    else if (p.status === 'warn') s.warned++;
    else if (p.status === 'skip') s.skipped++;
  }
  return s;
}

/** Sort diagnoses by severity (critical first), then blast radius (largest first) */
export function triageDiagnoses(diagnoses) {
  return [...diagnoses].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity - b.severity;
    return b.blastRadius - a.blastRadius;
  });
}

/** Check if same diagnosis failed 3+ consecutive times */
export function isStuckOn(fixes, diagnosisId) {
  const attempts = fixes.filter(f => f.diagnosisId === diagnosisId);
  if (attempts.length < 3) return false;
  const last3 = attempts.slice(-3);
  return last3.every(a => !a.success);
}

/** Format report as human-readable summary */
export function formatReportSummary(report) {
  const lines = [];
  lines.push(`=== Sentinel Report: ${report.id} ===`);
  lines.push(`Status: ${report.status}`);
  lines.push(`Started: ${report.startedAt}`);
  if (report.completedAt) lines.push(`Completed: ${report.completedAt}`);
  lines.push(`Iterations: ${report.iterations}/${report.maxIterations}`);
  lines.push('');

  const s = report.summary;
  lines.push(`Probes: ${s.total} total | ${s.passed} pass | ${s.failed} fail | ${s.warned} warn | ${s.skipped} skip`);
  lines.push('');

  if (report.probes.length > 0) {
    lines.push('── Probe Results ──');
    for (const p of report.probes) {
      const icon = p.status === 'pass' ? 'OK' : p.status === 'fail' ? 'FAIL' : p.status === 'warn' ? 'WARN' : 'SKIP';
      lines.push(`  ${icon}: [${p.category}] ${p.probe} (${p.duration}ms)`);
      if (p.failures?.length) {
        for (const f of p.failures.slice(0, 3)) {
          lines.push(`    - ${f}`);
        }
        if (p.failures.length > 3) lines.push(`    ... and ${p.failures.length - 3} more`);
      }
    }
    lines.push('');
  }

  if (report.diagnoses.length > 0) {
    lines.push('── Diagnoses (triaged) ──');
    for (const d of report.diagnoses) {
      const sev = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'][d.severity] || 'UNKNOWN';
      lines.push(`  [${sev}] ${d.id}: ${d.symptom}`);
      lines.push(`    Root cause: ${d.rootCause}`);
      lines.push(`    Fix: ${d.suggestedFix}`);
      lines.push(`    Files: ${d.affectedFiles.join(', ')}`);
      lines.push(`    Status: ${d.status}`);
    }
    lines.push('');
  }

  if (report.fixes.length > 0) {
    lines.push('── Fix Attempts ──');
    for (const f of report.fixes) {
      lines.push(`  ${f.success ? 'OK' : 'FAIL'}: ${f.diagnosisId} attempt #${f.attempt} — ${f.action}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
