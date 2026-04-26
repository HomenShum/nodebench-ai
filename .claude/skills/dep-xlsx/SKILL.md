---
name: dep-xlsx
description: Remediation runbook for the SheetJS xlsx package. Pinned to the SheetJS CDN release because the npm-published xlsx has 2 unfixed HIGH CVEs (ReDoS + Prototype Pollution) and SheetJS only ships fixes via their own CDN. Use when bumping xlsx, when CVE-2024-22363 or CVE-2023-30533 alerts fire, or when considering a migration to exceljs.
trigger: when xlsx appears in package.json diff, when AgentScore/Dependabot raises CVE-2024-22363 or CVE-2023-30533 against xlsx, when user asks to migrate xlsx to exceljs, when build fails fetching xlsx tarball
---

# `xlsx` (SheetJS) remediation runbook

## Last verified

- Working pin: `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (held since 2026-04-26)
- Known-bad: `xlsx@^0.18.5` from npm registry (2 HIGH CVEs, no upstream fix)

## Why we use a CDN tarball

Two HIGH CVEs against the npm-published `xlsx`:
- `CVE-2024-22363` — ReDoS in SheetJS
- `CVE-2023-30533` — Prototype Pollution in SheetJS

**Neither has a fix on the npm registry.** SheetJS moved to publishing fixed releases through their own CDN at `cdn.sheetjs.com`. The npm version of the package is no longer updated by the maintainers. Their official remediation guidance is to install from the CDN tarball.

Closed by [PR #124](https://github.com/Homenshum/nodebench-ai/pull/124).

## Alternatives evaluated (and rejected)

| Option | Why rejected |
|---|---|
| `@e965/xlsx` (community fork on npm) | Published by individual `e965` (`rulaitisk@gmail.com`) from `e965/sheetjs-npm-publisher`. Supply-chain risk: unknown maintainer. |
| Migrate to `exceljs` | Different API (async streams, 1-indexed cells), 4-8 hours of careful refactoring across 4 files in `src/features/documents/`, 200KB+ bundle weight increase. No security benefit (CDN already addresses the CVEs). |
| Migrate to `read-excel-file` | Read-only, doesn't cover the editor/writer paths in `SpreadsheetMiniEditor.tsx` and `SpreadsheetView.tsx`. Same migration effort as exceljs but lower coverage. |
| `xlsx-js-style` (community fork with styles) | Same supply-chain concern as `@e965/xlsx`. |
| Wrap usage with input validation | Defensive but doesn't make alerts go away. |

## Recipe (when bumping to a newer SheetJS CDN release)

When SheetJS publishes a new version (check `https://cdn.sheetjs.com/`):

1. Update `package.json`:
   ```diff
   -"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz",
   +"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.X/xlsx-0.20.X.tgz",
   ```
2. `npm install`
3. `npx tsc --noEmit` — should be clean (xlsx API has been stable for years)
4. `npx vite build` — must succeed
5. Manual smoke: open a `.xlsx` file in the documents preview/editor surfaces and verify it renders + saves correctly

## Recipe (when dependabot proposes a registry xlsx bump)

Dependabot will keep proposing `xlsx@^0.20.X` from the npm registry because it doesn't recognize CDN URLs as the same package. **Close such PRs** with:

> Closing — `xlsx` is intentionally pinned to the SheetJS CDN release (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) because the npm-published version has 2 unfixed HIGH CVEs (ReDoS + Prototype Pollution). See `.claude/skills/dep-xlsx/SKILL.md`.

## Recipe (full migration to exceljs — only if SheetJS goes unmaintained)

If SheetJS abandons their CDN releases and a newer CVE drops:

### Step 1 — Add exceljs to root deps
```bash
npm install exceljs@^4.4.0
```

### Step 2 — Rewrite each xlsx callsite

Files using xlsx as a library (NOT just for file extension matching):
- `src/features/documents/components/previews/SpreadsheetPreview.tsx` — lazy `import("xlsx")`, calls `XLSX.read` + `sheet_to_json`
- `src/features/documents/views/FileViewer.tsx` — 6 references, calls `XLSX.read`, `XLSX.utils.decode_range`, `XLSX.utils.decode_cell`, `XLSX.utils.encode_cell`
- `src/features/documents/editors/SpreadsheetMiniEditor.tsx` — `XLSX.read`, `XLSX.utils.aoa_to_sheet`, `XLSX.write`, merged-cells handling
- `src/features/documents/views/SpreadsheetView.tsx` — same write path as MiniEditor
- `src/features/documents/__tests__/bundleGates.test.ts` — bundle-size guard test

API translation cheat sheet:
```diff
- const wb = XLSX.read(buffer, { type: "array" })
- const sheet = wb.Sheets[wb.SheetNames[0]]
- const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })
+ const wb = new ExcelJS.Workbook()
+ await wb.xlsx.load(buffer)
+ const sheet = wb.worksheets[0]
+ const data: string[][] = []
+ sheet.eachRow({ includeEmpty: true }, (row) => data.push(row.values as string[]))
```

Critical conversion gotchas:
- xlsx is sync; exceljs is fully async — every read needs `await`
- xlsx uses 0-indexed rows/cols; exceljs uses 1-indexed (every encode_cell/decode_cell flips)
- xlsx's `sheet_to_json` includes empty rows by default; exceljs's `eachRow` skips empties unless you set `includeEmpty: true`
- merged cells: xlsx exposes `ws['!merges']`; exceljs uses `ws.model.merges` (array of "A1:B2" strings)
- write path: `XLSX.write(wb, { bookType: 'xlsx', type: 'array' })` → `await wb.xlsx.writeBuffer()`

### Step 3 — Update `bundleGates.test.ts`
Update the test to assert `exceljs` (not `xlsx`) is the only spreadsheet vendor in the bundle.

### Step 4 — Verify
```bash
npx tsc --noEmit
npx vite build
# Manual: open .xlsx files in preview/editor, verify render + save
```

## Verification

After any xlsx-related change:
```bash
node -e "const v = require('xlsx/package.json').version; console.log('xlsx version:', v); console.log('expected: 0.20.x from CDN')"

npx vite build  # must succeed

# Manual UI smoke (from a running dev server):
# 1. Upload a .xlsx file via the documents tab
# 2. Verify SpreadsheetPreview renders the first 6 rows
# 3. Open SpreadsheetView, edit a cell, save, reopen — round-trip clean
```

## Rollback

If a CDN-version bump breaks something, revert in `package.json`:
```json
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
```
Then `npm install`.

## Why upstream did this

SheetJS's community version (`xlsx` on npm) was forked off years ago and is no longer maintained by the SheetJS team. They publish fixes only through their own CDN to avoid GPL ambiguity in the npm channel. The CDN releases are properly licensed Apache-2.0 and contain the fixes. See https://docs.sheetjs.com/docs/getting-started/installation/standalone for upstream rationale.

## When to revisit

- SheetJS announces npm registry republishing (would let us use a normal `xlsx@^0.20.3` install)
- A newer CVE appears against `xlsx@0.20.3` and SheetJS doesn't ship a CDN fix within 2 weeks → trigger Step 2 of the exceljs migration
- We need styles support that the community xlsx doesn't have → consider migrating
