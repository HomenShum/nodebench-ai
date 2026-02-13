---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.html"
related_: [reexamine_performance, reexamine_process, reexamine_polish]
---

# Re-examine: Error Resilience

## Retry with backoff
- Network/fetch calls: retry 2-3 times with exponential backoff (`Math.min(30000, base * 1.5^attempt)`)
- Show retry status to user (e.g., "Retrying in 5s..." or a refresh indicator)
- Add a manual "Retry" button after max retries exhausted

## Partial failures
- If one API call in a batch fails, don't discard the successful results
- Render what you have + show targeted error for the failed portion
- Example: 9/10 screenshots load → show 9 + "1 image unavailable" placeholder

## Error boundaries (React / UI)
- Wrap major sections in error boundaries so one crash doesn't take down the page
- Error boundary fallback: informative message + retry action, not blank screen
- Log errors to console or telemetry with enough context to debug

## Graceful degradation
- If optional dependency missing (embedding model, Python server, env var): degrade, don't crash
- Feature detection before use: `if (window.IntersectionObserver)` etc.
- Image 404 → fallback placeholder with "Image unavailable" text
- Missing data fields → show "N/A" or hide the section, not `undefined`

## Loading states
- Every async operation needs a loading indicator (skeleton, spinner, or progress bar)
- Never leave the user staring at a blank screen during fetch
- See `reexamine_polish` for skeleton loading patterns