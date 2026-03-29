# Render Demo Video

Render the retro 8-bit founder demo video using Remotion.

## Commands

### Preview (opens Remotion Studio)
```bash
npx remotion studio remotion/index.ts
```

### Render full 60s demo to MP4
```bash
npx remotion render remotion/index.ts FounderDemo docs/demo-video/nodebench-retro-demo.mp4
```

### Render individual scenes
```bash
# Intro only (5s)
npx remotion render remotion/index.ts Intro docs/demo-video/intro.mp4

# Plan Synthesis showcase (10s)
npx remotion render remotion/index.ts PlanSynthesis docs/demo-video/plan-synthesis.mp4
```

### Render with quality options
```bash
# High quality (slower)
npx remotion render remotion/index.ts FounderDemo docs/demo-video/nodebench-retro-demo-hq.mp4 --codec h264 --crf 18

# Fast preview (lower quality)
npx remotion render remotion/index.ts FounderDemo docs/demo-video/nodebench-retro-demo-preview.mp4 --codec h264 --crf 28 --concurrency 4
```

## Compositions

| ID | Duration | Description |
|----|----------|-------------|
| FounderDemo | 60s | Full demo: intro + search + plan + delegation + coordination + CTA |
| Intro | 5s | 8-bit logo reveal + stats badges |
| PlanSynthesis | 10s | Plan Synthesis feature showcase |

## Style

- Retro 8-bit pixel art aesthetic
- Font: Press Start 2P (Google Fonts)
- Palette: terracotta #d97757, NES dark #0a0a0f, emerald, amber, blue, purple
- CRT scanline overlay
- Animated pixel grid background
- Typewriter text reveal

## After rendering

Upload to Vercel Blob or embed in landing page:
```bash
vercel blob upload docs/demo-video/nodebench-retro-demo.mp4
```
