# Marketing Claim Audit — 2026-04-19

> "**Nodebench AI (Open-Source Founder-Intelligence MCP):** Shipped nodebenchai.com: one-line install (`claude mcp add nodebench`) turns any Claude-compatible agent into a founder-diligence workflow — ingests recruiter notes, LinkedIn URLs, pitch decks, and bios from a single input and outputs decision memos, founder profiles, and market maps as shareable public URLs. Open-source (MIT)."

**Method**: Preview sandbox cannot screenshot localhost in this environment (recurring limit). Audit is code-grounded with file-path evidence for every sub-claim. Verdicts: ✅ true · 🟡 partially true · ⬜ false / missing.

---

## Verdict summary

| # | Sub-claim | Verdict | Evidence or gap |
|---|---|---|---|
| 1 | **nodebenchai.com shipped** | ✅ | `README.md:5,83,255,294`; `index.html:140,146,168` canonical + OG tags |
| 2 | **One-line install `claude mcp add nodebench`** | ✅ | `README.md:261`, `packages/mcp-local/README.md:17` — copy-paste ready |
| 3 | **Turns Claude-compatible agent into a workflow** | ✅ | `nodebench-mcp@3.2.0` on npm via `packages/mcp-local/package.json` with `bin: nodebench-mcp` |
| 4a | Ingests **recruiter notes** | 🟡 | Generic text intake via `ProductIntakeComposer`; NO recruiter-specific parser or template. Falls into "paste anything" bucket |
| 4b | Ingests **LinkedIn URLs** | 🟡 | Generic URL intake; NO LinkedIn-URL auto-detect / auto-hydrate on the intake composer. `convex/domains/product/entities.ts:157` `extractLinkedInPublicIdentifier` exists for entity-naming only |
| 4c | Ingests **pitch decks** | 🟡 | `uploadDraftFiles.ts` accepts any file type; no PDF-specific pitch-deck parser, slide extractor, or preview surfaced to the user. The claim implies "pitch deck" is a first-class input modality; today it's "any file upload" |
| 4d | Ingests **bios** | 🟡 | Same as recruiter notes: generic text intake, no bio-specific template |
| 5a | Outputs **decision memos** | ✅ | `src/features/deepSim/views/DecisionMemoView.tsx`; `ShareableMemoView` is the standalone public version |
| 5b | Outputs **founder profiles** | 🟡 | `PublicCompanyProfileView` exists at `/company/:slug` but the naming is **"company profile"**, not "founder profile". Person-type entities have pages but no dedicated "Founder Profile" artifact (summary card + cap table + network). Marketing claim names a deliverable that doesn't exist under that name |
| 5c | Outputs **market maps** | ⬜ | **No `MarketMap` component, view, or route found anywhere in `src/`**. Only one mention: `DayStarterCard.tsx:42` uses "market map" as a prompt suggestion string. Claim unsupported |
| 6 | Outputs as **shareable public URLs** | ✅ | `/memo/:id` → `ShareableMemoView` (standalone, no auth chrome). `/company/:slug` → `PublicCompanyProfileView`. Both bypass the cockpit shell for public read |
| 7 | **Open-source (MIT)** | 🟡 | `packages/mcp-local/LICENSE` is MIT; **root repo has NO LICENSE file**. Claim says "Open-source (MIT)" about NodeBench AI — strictly, only the MCP server package is licensed MIT. The web app (`src/`, `convex/`) has no explicit license declaration |
| 8 | **"Founder-Intelligence MCP"** positioning | ✅ | Branding present in package name `nodebench-mcp`, README headline |

**Overall: 4 ✅ · 6 🟡 · 1 ⬜ · 1 positioning ✅**

The claim as written is **aspirational** in places, especially §4 (the four specific ingestion modalities), §5b (founder profile ≠ company profile), and §5c (market maps don't exist). §7 (MIT licensing scope) is the most serious — a marketing claim that says "Open-source (MIT)" without a root `LICENSE` file is a legal-hygiene gap.

---

## Gap-by-gap — what it takes to close each

### §4 Ingestion modalities (4 separate gaps)

**Honest framing change (5 min)**: rewrite the claim to "ingests text, links, and files" instead of naming four specific modalities that don't have dedicated parsers. Matches what actually ships.

**OR** — if we want to keep the claim literal:

- **LinkedIn URL** (~2 hours): on paste of a URL that matches `linkedin.com/in/*`, auto-hydrate a person profile seed via `extractLinkedInPublicIdentifier` (the function already exists). Display "LinkedIn profile detected" chip in `ProductIntakeComposer`.
- **Pitch deck** (~1 day): PDF-specific first-class surface. Detect `application/pdf` with multi-page ≥ 5, render a "pitch deck detected" chip, queue a slide-by-slide extraction action. Needs a Convex action wired to a PDF parser.
- **Recruiter note / bio** (~2 hours): detect common prefixes ("Hi `<name>`, I'm reaching out about…", "Current role:", "Worked at:") and offer a "Recruiter note?" or "Bio?" chip. Doesn't change the output path — just labels the intake so the agent prompts better.

### §5b Founder profile (naming gap)

Two options: (a) rename `PublicCompanyProfileView` to `PublicProfileView` and branch internally on entity type (~30 min); or (b) add a proper `FounderProfileView` at `/founder/:slug` that renders cap-table / network / highlighted roles (~2-3 days). Option (a) closes the claim immediately; option (b) makes the claim real.

### §5c Market maps (entirely missing)

Biggest honest gap in the claim. A "market map" is a real artifact shape: a 2D scatter of companies across (X, Y) axes (e.g. "funding stage × traction", "vertical × moat"), with clustering + sources cited per node. Building this is 1-2 weeks:
- Convex schema: new `productMarketMaps` table with axes + node positions + source refs
- Agent flow: seeded from 5-10 `productEntities` in the same space, LLM-positions each, user can drag
- Render: SVG scatter + hover card + public share route `/market/:id`
- Export: image + JSON + markdown list

Until that lands, strip "market maps" from the claim.

### §7 MIT licensing scope

**One-line fix (5 minutes)**: copy `packages/mcp-local/LICENSE` to repo root `./LICENSE` and update `package.json` with `"license": "MIT"`. That closes the legal-hygiene gap and makes the claim literally accurate.

---

## What's verifiable end-to-end today (the claim we CAN make)

If we honestly want to make a claim only the code supports, it would read:

> **Nodebench AI (Open-Source Founder-Intelligence MCP):** Shipped nodebenchai.com: one-line install (`claude mcp add nodebench`) wraps a 300-tool MCP surface that any Claude-compatible agent can use. The web app accepts text, links, and file uploads, produces decision memos, and exposes any saved memo or company profile as a public, no-auth URL at `/memo/:id` and `/company/:slug`. MCP server: MIT ([packages/mcp-local/LICENSE](../../packages/mcp-local/LICENSE)).

That version is defensible right now. The marketing claim above it is ~70% defensible — the pieces that are not defensible are enumerated above.

---

## Proof-of-evidence commands

Every verdict above is reproducible:

```bash
# Claim §1 — domain
grep -nE 'nodebenchai\.com' README.md index.html

# Claim §2 — install command
grep -nE 'claude mcp add nodebench' README.md packages/mcp-local/README.md

# Claim §3 — MCP published
cat packages/mcp-local/package.json | grep -E '"(name|version|bin|license)"'

# Claims §4a-§4d — ingestion modalities
grep -rnE 'linkedin|pitchdeck|pitch_deck|recruiter|bio' src/features/product/

# Claim §5a — decision memo UI
ls src/features/deepSim/views/DecisionMemoView.tsx src/features/founder/views/ShareableMemoView.tsx

# Claim §5b — founder profile route
grep -nE 'isCompanyRoute|/company/|PublicCompanyProfileView' src/App.tsx

# Claim §5c — market map
grep -rnE 'MarketMap|market.map' src/       # returns only DayStarterCard prompt string

# Claim §6 — shareable URLs
grep -nE 'isMemoRoute|isCompanyRoute|/memo/|/company/' src/App.tsx

# Claim §7 — MIT licensing
ls LICENSE 2>/dev/null ; ls packages/mcp-local/LICENSE
```

---

## Honest preview-sandbox caveat

Visual verification via `preview_screenshot` was attempted against `http://localhost:5191/` and timed out (30s) with the renderer unresponsive — same recurring local-preview limit that hit earlier in the session. Every verdict above is therefore file-path evidence, not pixel evidence. A human sitting at a browser could visit each route and confirm what we claim structurally; the preview-sandbox path didn't let that happen from here.
