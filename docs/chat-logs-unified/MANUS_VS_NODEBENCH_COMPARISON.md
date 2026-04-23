# Manus vs NodeBench — Gemini 3.1 Pro Preview comparative QA

- **Model:** gemini-3.1-pro-preview
- **Video A (target):** AQOGKLEIeeHeIWWqHQr2v9QL0SfBA_ACqzP0aoM7Ap2BbscrAs7Pp5PchWu2xLOtLHnmiEPdCpw5vdYfX4SQxFG7lwH1GJdc734Sf8DocA.mp4
- **Video B (ours):** nodebench-chat.webm
- **Generated:** 2026-04-23T00:20:19.676Z

## Summary

- **Overall gap rating:** B
- **Manus feel:** polished, native, spacious, fluid
- **NodeBench feel:** functional, dense, web-like, rigid

### Top 3 gaps
- Bottom sheet implementation feels like a web modal (explicit 'X' close button) rather than a native iOS sheet with a grabber pill.
- Task list execution is visually dense and lacks the airy, readable padding of the target.
- Floating 'Review draft' button creates unnecessary clutter above the composer.

### Top 3 wins
- Exact feature parity on the 3-dot thread actions menu.
- Composer layout and affordances closely mirror the target.
- Dark mode color palette is consistent and appropriate.

## Layout

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| top_chrome | Centered title with subtitle, back button, share, pin, and 3-dot menu. Clean spacing. | Left-aligned or centered title that truncates with ellipsis. Lacks the pin icon. Spacing feels slightly cramped. | NodeBench top chrome feels slightly less balanced without the secondary action icons spacing it out. | P2 |
| composer_pinning | Cleanly pinned to the bottom safe area with standard input field and icons. | Pinned to bottom, but introduces a floating 'Review draft' button directly above it that overlaps chat content. | NodeBench has extra visual noise above the composer. | P1 |
| bottom_nav | Not present in thread view. | Not present in thread view. | N/A | P2 |
| safe_area_handling | Respects bottom home indicator perfectly. | Respects bottom home indicator adequately. | Comparable. | P2 |

## Typography

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| header_treatment | Clear hierarchy between user messages and agent responses using weight and size. | Similar hierarchy, but the agent name 'NodeBench' blends slightly more with the body text. | NodeBench needs slightly more contrast or weight on agent headers. | P2 |
| body_readability | Excellent line height and paragraph spacing. Task list items are easy to scan. | Line height is tighter. Task list items feel squashed together vertically. | NodeBench is harder to scan quickly due to density. | P1 |
| weight_hierarchy | Uses subtle grays for secondary metadata (like file sizes). | Uses similar grays, but the execution in the task list feels muddy. | NodeBench secondary text lacks the crispness of Manus. | P2 |

## Motion

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| transitions | Smooth, spring-based native iOS transitions for sheets and menus. | Menu dismissal (0:01) appears linear and abrupt, lacking native spring physics. | NodeBench feels like a web app mimicking native motion. | P1 |
| loading_states | Smooth spinning indicators for active tasks. | Static in the provided clip, but UI implies similar states. | Cannot fully evaluate from 2s clip, but motion quality is a risk. | P2 |
| menu_open_close | Standard iOS bottom sheet with swipe-to-dismiss. | Bottom sheet uses an explicit 'X' button (0:00) which is an anti-pattern for modern iOS sheets. | NodeBench fails native iOS expectations here. | P0 |

## Color & contrast

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| palette | Deep dark grays (#1A1A1A to #2C2C2C). | Similar dark grays, slightly lighter surface colors. | Negligible. |  |
| text_contrast | High contrast white text on dark backgrounds. | Adequate contrast, though secondary text in the task list borders on low contrast. | NodeBench should brighten secondary text slightly. | P2 |
| accent_usage | Uses green for completed checkmarks, drawing the eye. | Uses muted blues/grays for icons, which looks sophisticated but less scannable. | NodeBench lacks a strong success color in the task list. | P2 |

## Information architecture

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| clarity_of_entry_point | Very clear. Chat is the primary focus. | Clear, but the floating draft button distracts from the chat flow. | NodeBench has slightly competing primary actions. | P1 |
| visual_hierarchy | Distinct separation between thought process (task list) and final output (file). | Task list and draft report are stacked closely, making it harder to distinguish the 'thinking' from the 'result'. | NodeBench needs more vertical whitespace between major message components. | P1 |
| cognitive_load | Low. Information is progressively disclosed. | Medium. The density of the task list and the floating button increase visual noise. | NodeBench feels busier. | P1 |

## Accessibility

| dimension | Manus | NodeBench | delta | severity |
|---|---|---|---|---|
| tap_target_sizes | Generous, native-feeling tap targets. | The 'X' close button on the menu (0:00) looks slightly small. Task list items might be hard to tap individually if they are interactive. | NodeBench needs to ensure 44x44pt minimums. | P1 |
| focus_states | Not explicitly visible in video. | Not explicitly visible in video. | Unknown. | P2 |
| reduced_motion_support | Unknown. | Unknown. | Unknown. | P2 |

## 3-dot menu comparison

- **Manus items:** Favorite, Rename, View all files, Task details, Delete
- **NodeBench items:** Favorite, Rename, View all files, Task details, Delete
- **Missing in NodeBench:** none
- **Extra in NodeBench:** none

## Prioritized punch list

| priority | area | problem | fix | effort |
|---|---|---|---|---|
| P0 | Bottom Sheet Menu | Uses an explicit 'X' close button instead of native iOS swipe-to-dismiss and grabber pill. | Remove the 'X' button, add a grabber pill at the top, and implement native swipe-down-to-dismiss physics. | M |
| P1 | Task List Density | Task list items are vertically cramped, making them hard to read and feeling unpolished. | Increase vertical padding between task list items by at least 4-8px. | S |
| P1 | Composer Area | Floating 'Review draft' button overlaps chat content and creates visual clutter. | Integrate the draft review action into the composer itself, or place it inline within the chat stream rather than floating. | M |

## Honest assessment

- **Can NodeBench demo tomorrow?** Yes. The core functionality and layout are extremely close to the target, and the feature parity on menus is impressive.
- **Biggest risk:** The app feeling like a wrapped web view rather than a native app, primarily due to the rigid bottom sheet and dense list spacing.
- **Quick wins:**
  - Remove the 'X' from the bottom sheet.
  - Add 8px of margin-bottom to every task list item.
  - Hide the floating 'Review draft' button if it's not critical for the specific demo flow.
