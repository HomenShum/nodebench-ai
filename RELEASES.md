# Release History

## v0.9.1 - Web.Fetch Template Validation & Cleanup (January 2025)

**Commits:** 395c806, fb0b067

### Critical Bug Fix
- Fixed ENOENT error when `web.fetch` received unresolved template variables
- Added comprehensive URL validation to detect `${...}` and `{{channel:...}}` patterns
- Provides clear error messages before attempting file operations

### Enhancements
- Added `maxBytes` parameter with 1MB default limit
- Improved trace logging (`web.fetch.local`, `web.fetch.static`, `web.fetch.complete`)
- Better error messages for debugging

### Repository Cleanup
- Removed 7 non-essential refactoring summary .md files
- Updated `.gitignore` to exclude temporary summary files

### Documentation
- Added `docs/WEB_FETCH_TEMPLATE_FIX.md`

**Full Release Notes:** [RELEASE_NOTES_v0.9.1.md](./RELEASE_NOTES_v0.9.1.md)

---

## v0.9.0 - Orchestrator Dataflow & Code Execution Enhancement (January 2025)

**Commit:** 43d1d19

### Major Features
- **Orchestrator Eval Schema Enhancement:** Eval nodes can now add custom tool nodes with structured JSON payloads
- **Payload-Driven Code Execution:** `code.exec` nodes can receive structured inputs via payload
- **Mandatory Channel Wiring:** Bootstrap eval enforces channel references for downstream nodes

### Key Changes
- Extended eval schema to accept `tool`, `payload`, `includeImages`, `depth` properties
- Enabled payload resolution with channel reference expansion in orchestrator
- Added direct tool invocation for `code.exec` nodes with payloads

### Use Cases Enabled
- Stock price analysis with moving averages
- Medical image classification workflows
- Multi-step data pipelines with computational analysis

### Documentation
- Added comprehensive release notes with migration guide
- Updated `DESIGN_SPECS.md` and `FOLDER_STRUCTURES.md`

**Full Release Notes:** [RELEASE_NOTES_v0.9.0.md](./RELEASE_NOTES_v0.9.0.md)

---

## Earlier Releases

### v0.8.0 - Timeline Visual Improvements
**Commit:** 8dc6f34

- Tightened 'Fit window to content' (less whitespace)
- Dedicated Timeline section
- Consistent panel order

### v0.7.0 - UI Standardization (2025-09-19-2)
**Commit:** b55a950

- UI parity across Calendar & Documents Home Hubs
- Shared TopDividerBar and PageHeroHeader components
- PresetChip component
- Right-aligned hero date
- Removed top spacing in Calendar hub
- Standardized PublicDocuments layout
- Updated previews (mini calendar + full calendar hub)

### v0.6.0 - UI Refactor & Home Hubs (2025-09-19)
**Commit:** 05e5a95

- Consolidated Home Hubs (Documents & Calendar)
- Streamlined layout and navigation
- Improved MiniEditorPopover
- Convex file/document API updates
- Cleanup of legacy views
- New screenshots and documentation

### v0.5.0 - Early Prototype (092325)
**Commit:** dc817ec

- Agent Timeline with Tasks prompt
- Final Output copy/collapse
- Run history
- Timeline freeze
- Task metrics handling

---

## Upgrade Path

### From v0.9.0 to v0.9.1
No breaking changes. Simply pull and install:
```bash
git pull origin main
npm install
npx convex dev
```

### From Earlier Versions to v0.9.x
Review the v0.9.0 release notes for dataflow architecture changes. Existing workflows continue to work, but you can now leverage:
- Custom tool nodes with payloads
- Channel-based data passing
- Structured code execution inputs

---

## Roadmap

### v0.10.0 (Planned)
- Deterministic override graphs for common scenarios
- Auto-retry on empty results with web.fetch fallback
- Stricter schema validation for structured outputs
- Direct Plotly/matplotlib visualization in code.exec

### Future Considerations
- Conditional branching in graph execution
- Loop support for array iteration
- Parallel execution of independent branches
- Automatic error recovery strategies

---

## Links

- **Repository:** https://github.com/HomenShum/nodebench-ai
- **Issues:** https://github.com/HomenShum/nodebench-ai/issues
- **Documentation:** See `docs/` directory

---

**Last Updated:** January 2025

