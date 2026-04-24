# NodeBench AI — Mobile UI Kit

Mobile web views of the flagship app, presented inside iPhone frames so the
design reads as a real phone experience.

The codebase mobile surface is React + Tailwind served through a Capacitor
wrapper (`android/`), so mobile is the same app collapsed to narrow
viewports with:

- bottom tab bar (Home · Chat · Reports · Nudges · Me)
- floating action button anchored above the tab bar (safe-area aware)
- tap states at `scale(0.97)` / 80ms (from `src/index.css`)
- translucent topbar shrunk to title + single action
- composer kept full-width with bottom attachment

## Files

- `index.html` — two iPhone frames side-by-side: Home + Answer packet.
- `MobileHome.jsx` — Home surface: greeting, suggested prompts, composer.
- `MobileChat.jsx` — Chat surface: streamed answer + sources + follow-up bar.
- `TabBar.jsx` — bottom 5-tab nav with active indicator.
- `Fab.jsx` — terracotta floating "New run" action.
- `shared.css` — local token copy.

Tap states, spring motion, and safe-area padding all match the web kit.
