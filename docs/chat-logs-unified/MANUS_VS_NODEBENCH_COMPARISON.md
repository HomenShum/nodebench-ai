# Manus vs NodeBench — Gemini 3.1 Pro Preview comparative QA

- **Model:** gemini-3.1-pro-preview
- **Video A (target):** AQOGKLEIeeHeIWWqHQr2v9QL0SfBA_ACqzP0aoM7Ap2BbscrAs7Pp5PchWu2xLOtLHnmiEPdCpw5vdYfX4SQxFG7lwH1GJdc734Sf8DocA.mp4
- **Video B (ours):** nodebench-chat.webm
- **Generated:** 2026-04-23T00:55:05.411Z

## Summary

- **Overall gap rating:** B+
- **Manus feel:** dynamic, native, polished, dense
- **NodeBench feel:** static, derivative, functional, rigid

### Top 3 gaps
- Lack of dynamic motion in task progress (static clock vs Manus's active spinner)
- Missing 'Pin' utility action in the top chrome
- No demonstration of scrolling, keyboard interaction, or bottom sheet transitions in the matched phase

### Top 3 wins
- 1:1 replication of the composer layout and affordances
- Perfect match on 3-dot menu items, icons, and destructive color styling
- Strong adherence to the dark mode color palette and typography scale

## Layout

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| top_chrome | Back, Title+Dropdown, Share, Pin, 3-dot menu (0:00) | Back, Title+Dropdown, Share, 3-dot menu (0:00) | NodeBench is missing the Pin icon, reducing utility parity. | P1 |
| composer_pinning | Pinned above safe area with +, M+1, input, mic, send (0:45) | Pinned above safe area with identical layout (0:00) | None. Exact match. | P2 |
| bottom_nav | None in active thread | None in active thread | N/A | P2 |
| safe_area_handling | Respects bottom home indicator | Respects bottom home indicator | None | P2 |

## Typography

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| header_treatment | Bold, legible title with subtle dropdown chevron | Matches Manus sizing and weight perfectly | None | P2 |
| body_readability | High contrast sans-serif, clear hierarchy in task lists | Matches font styling and contrast | None | P2 |
| weight_hierarchy | Uses bolding for active/completed task headers (0:05) | Uses bolding for 'Understand the request' (0:00) | NodeBench successfully replicates the typographic hierarchy of the task list. | P2 |

## Motion

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| transitions | Smooth popovers and bottom sheets (0:46, 0:59) | Standard iOS popover for 3-dot menu (0:10) | NodeBench menu transition is acceptable, but lacks the broader suite of fluid transitions shown in Manus. | P1 |
| loading_states | Animated spinner for active tasks (0:05) | Static clock icon for 'Gather current sources' (0:00) | NodeBench feels dead/static compared to Manus's active processing state. | P0 |
| menu_open_close | Instant, native feel (0:59) | Instant, native feel (0:10) | None | P2 |

## Color & contrast

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| palette | Deep blacks, dark grays, subtle border strokes | Deep blacks, dark grays, subtle border strokes | Nearly identical dark theme implementation. |  |
| text_contrast | High contrast white/light gray on dark backgrounds | High contrast white/light gray on dark backgrounds | None | P2 |
| accent_usage | Green checkmarks, red delete text (0:59) | Green checkmarks, red delete text (0:10) | Perfect replication of semantic colors. | P2 |

## Information architecture

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| clarity_of_entry_point | Clear chat interface with obvious composer | Clear chat interface with obvious composer | None | P2 |
| visual_hierarchy | Strong use of indentation and icons for nested task steps | Replicates the indentation and icon structure perfectly | None | P2 |
| cognitive_load | High density but manageable due to clear grouping | Matches the density and grouping of Manus | None | P2 |

## Accessibility

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| tap_target_sizes | Standard 44pt+ for top chrome and menu items | Matches standard sizing | None | P2 |
| focus_states | Not explicitly shown | Not explicitly shown | N/A | P2 |
| reduced_motion_support | Unknown | Unknown | N/A | P2 |

## 3-dot menu comparison

- **Manus items:** Favorite, Rename, View all files, Task details, Delete
- **NodeBench items:** Favorite, Rename, View all files, Task details, Delete
- **Missing in NodeBench:** none
- **Extra in NodeBench:** none

## Prioritized punch list

| priority | area | problem | fix | effort |
|---|---|---|---|---|
| P0 | Motion / Task Progress | Active tasks use a static clock icon, making the app feel frozen or unresponsive compared to Manus. | Implement an animated spinner or pulsing state for the active step in the task progress list. | S |
| P1 | Layout / Top Chrome | Missing the 'Pin' icon in the top right header. | Add the Pin icon between the Share and 3-dot menu icons to achieve 1:1 feature parity in the header. | S |

## Honest assessment

- **Can NodeBench demo tomorrow?** Yes. For the specific active thread view shown, it is a highly accurate visual clone of Manus.
- **Biggest risk:** The illusion breaking if the user tries to interact with anything other than the 3-dot menu, as no scrolling, keyboard input, or sub-menus are demonstrated.
- **Quick wins:**
  - Animate the active task icon to prove the app is 'thinking'
  - Add the missing Pin icon to the header
