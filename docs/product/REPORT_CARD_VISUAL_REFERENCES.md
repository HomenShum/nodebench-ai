# Report Card Visual References

This note captures the design cues extracted from the mobile-news reference boards provided during the NodeBench report-card redesign work on April 16, 2026.

The screenshots themselves came in through chat context. This file stores the distilled guidance we can reuse during browser QA and future card refactors.

## What To Copy

- One dominant focal area per card.
- Large rounded preview area with clean outer spacing.
- A single top-level chip or category label, not many badges.
- Calm contrast and soft shadowing instead of nested borders.
- Metadata should read as a short footer, not a dashboard.
- Preview surfaces should feel editorial and touchable.
- Use one hero image when available. Avoid collage noise by default.
- If there is no image, the fallback should still feel like a designed cover, not an empty diagnostics tile.

## What To Avoid

- Multiple equal-weight pills competing inside the preview.
- Tiny uppercase labels stacked in several places.
- Source grids inside the thumbnail.
- Repeating the same information in the preview and the card body.
- Heavy inset frames that make the card feel boxed-in.
- A debug or telemetry look.

## Practical Card Rules For NodeBench

### Thumbnail

- `ProductThumbnail` should present one clear mood:
  - hero image plus one or two chips
  - or a simple poster-like fallback
- Keep source identity to one compact cue.
- Keep type identity to one compact cue.
- Use extra sources as a count, not as a mini dashboard.

### Card Body

- Keep the card body to:
  - title
  - short summary
  - one provenance line
  - one source identity row
- Prefer one primary message over a dense metadata stack.

### Browser QA Checklist

When checking `Home`, `Reports`, and opened entity/report pages:

- Does each card have one obvious focal point?
- Does the preview area read before the metadata?
- Do the cards feel editorial rather than operational?
- Is the metadata quiet enough that the title still leads?
- If there are no images, does the fallback still look intentional?
- Are long labels clipped safely without breaking layout?

## Current Intent

Use these references to push NodeBench report cards toward:

- cleaner preview hierarchy
- less repeated chrome
- stronger visual confidence
- better legibility during fast scanning
