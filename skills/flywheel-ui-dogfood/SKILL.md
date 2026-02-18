# Skill: Flywheel UI Dogfood

## Goal
Continuously dogfood every UI route, capture walkthrough evidence (screenshots + video + scribe), run Gemini-based video/screenshot QA, and iterate until issues stop reproducing.

## When to Use
- Any frontend/UI change
- Any report of flashing/jank/layout shift
- Any production regression that needs end-to-end evidence

## Inputs
- Repo checked out and dependencies installed
- `VITE_CONVEX_URL` set for Convex actions/queries
- Gemini API key present in Convex env (server-side)

## Outputs
- Updated dogfood artifacts in `public/dogfood/*` (gallery, walkthrough video, frames, scribe)
- Gemini QA runs visible in `/dogfood` UI
- Root-cause fixes merged with verification proof

## Protocol (Flywheel Mode)
1. Launch dev server and open `/dogfood`
2. Poll every 60 seconds for: console errors, runtime exceptions, visual regressions, performance jank
3. Diagnose using 5-whys until reaching the design decision / missing constraint / wrong assumption
4. Fix the cause (make the bug impossible), not a band-aid
5. Verify: `npx tsc --noEmit` and `npm run build`
6. Re-capture evidence: `npm run dogfood:full:local`
7. Re-run Gemini QA: `npm run dogfood:qa:gemini`
8. Repeat steps 2-7 until the flywheel converges (no new P0/P1 issues)

## Motion Safety (Seizure / Flash Policy)
- Avoid high-contrast flashes and large-area opacity pulses/fades.
- Prefer stable backgrounds and subtle (or non-animated) loading states for full-viewport surfaces.
- Always honor `prefers-reduced-motion` and ship a UI toggle when motion is used.

## Commands
```powershell
npm run dogfood:full:local
npm run dogfood:qa:gemini
npm run dogfood:verify
npx tsc --noEmit
npm run build
```
