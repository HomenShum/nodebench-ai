# Manus vs NodeBench — Gemini 3.1 Pro Preview comparative QA

- **Model:** gemini-3.1-pro-preview
- **Video A (target):** AQOGKLEIeeHeIWWqHQr2v9QL0SfBA_ACqzP0aoM7Ap2BbscrAs7Pp5PchWu2xLOtLHnmiEPdCpw5vdYfX4SQxFG7lwH1GJdc734Sf8DocA.mp4
- **Video B (ours):** nodebench-chat.webm
- **Generated:** 2026-04-23T01:36:47.657Z

## Summary

- **Overall gap rating:** A
- **Manus feel:** polished, native, dense, structured
- **NodeBench feel:** snappy, native, identical, clean

### Top 3 gaps
- Missing 'Pin' icon in the top right chrome compared to Manus
- Persistent down-chevron next to the title in NodeBench, whereas Manus hides it until tapped
- Slightly lower contrast on secondary text ('No sources attached yet') compared to Manus's secondary text

### Top 3 wins
- Pixel-perfect replication of the 3-dot menu bottom sheet and its icons
- Identical composer layout, affordances, and safe area handling
- Smooth, native-feeling bottom sheet transition that matches the target

## Layout

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| top_chrome | Back, Title (centered), Share, Pin, 3-dot | Back, Title + Chevron (centered), Share, 3-dot | NodeBench is missing the Pin icon and adds a persistent chevron to the title. | P2 |
| composer_pinning | Pinned above bottom safe area with blur/solid background | Pinned above bottom safe area with matching background | None. Exact match. | P2 |
| bottom_nav | Not present in this detail view | Not present in this detail view | N/A | P2 |
| safe_area_handling | Proper padding around the home indicator | Proper padding around the home indicator | None. Exact match. | P2 |

## Typography

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| header_treatment | Medium weight, clean alignment for step headers | Medium weight, slightly larger relative size for 'Task progress' | NodeBench's section header feels slightly more prominent, but acceptable. | P2 |
| body_readability | High legibility, good line height | High legibility, matching line height | None. | P2 |
| weight_hierarchy | Clear distinction between titles, body, and metadata | Matches Manus's hierarchy perfectly | None. | P2 |

## Motion

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| transitions | Smooth bottom sheet slide-up for menus | Smooth bottom sheet slide-up for menus | Indistinguishable. | P2 |
| loading_states | Shows completed states with checkmarks | Shows active spinning loaders for in-progress steps | NodeBench loaders are smooth, though stroke width is slightly thicker than Manus's typical iconography. | P2 |
| menu_open_close | Snappy, native easing | Snappy, native easing | None. | P2 |

## Color & contrast

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| palette | Deep dark grays (#1A1A1A base, #2A2A2A surface) | Deep dark grays matching Manus | Visually identical dark mode palette. |  |
| text_contrast | Strong contrast for primary, accessible contrast for secondary | Strong primary, secondary text ('No sources attached yet') feels slightly too dim | NodeBench secondary text might fail WCAG AA contrast slightly compared to Manus. | P1 |
| accent_usage | Green checkmarks, red delete icon | Green checkmarks, red delete icon | Exact match on semantic colors. | P2 |

## Information architecture

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| clarity_of_entry_point | Clear chat/trace paradigm | Clear chat/trace paradigm | None. | P2 |
| visual_hierarchy | Trace steps > details > metadata | Trace steps > details > metadata | None. | P2 |
| cognitive_load | High but managed via progressive disclosure | High but managed via progressive disclosure | None. | P2 |

## Accessibility

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| tap_target_sizes | 44pt+ for top chrome and menu items | 44pt+ for top chrome and menu items | None. | P2 |
| focus_states | Not visible in video | Not visible in video | Unknown. | P2 |
| reduced_motion_support | Unknown | Unknown | Unknown. | P2 |

## 3-dot menu comparison

- **Manus items:** Favorite, Rename, View all files, Task details, Delete
- **NodeBench items:** Favorite, Rename, View all files, Task details, Delete
- **Missing in NodeBench:** none
- **Extra in NodeBench:** none

## Prioritized punch list

| priority | area | problem | fix | effort |
|---|---|---|---|---|
| P1 | Color and Contrast | Secondary text ('No sources attached yet') is slightly too dark and may fail contrast checks. | Lighten the hex value of secondary text to match Manus's secondary text contrast ratio. | S |
| P2 | Top Chrome | Missing 'Pin' icon compared to Manus. | Add the Pin icon to the top right action group if the feature exists, or adjust spacing to compensate. | S |
| P2 | Top Chrome | Persistent down-chevron next to the title. | Remove the chevron unless it's an active, tap-able dropdown in this specific view, to match Manus's cleaner default state. | S |

## Honest assessment

- **Can NodeBench demo tomorrow?** Yes. The UI is a near-perfect clone of the target app. It feels native, snappy, and visually identical in almost all respects.
- **Biggest risk:** Users noticing missing functional parity (like the missing Pin icon) rather than UI flaws, as the UI itself is rock solid.
- **Quick wins:**
  - Bump the brightness of secondary text slightly
  - Remove the title chevron if it doesn't do anything
  - Ensure the loading spinner stroke width matches the icon set
