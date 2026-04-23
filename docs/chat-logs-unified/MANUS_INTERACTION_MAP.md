# Manus Interaction Map

Ingested from user-provided phone recording via Gemini 3 Pro.

- **App:** Manus 1.6
- **Platform:** iOS
- **Duration:** 115 s
- **Opener:** The user is viewing a completed task in the Manus chat interface where an Excel scorecard was converted into a Markdown document.

## Screen inventory

| id | label | purpose | first @ s | entry points |
|---|---|---|---|---|
| `chat_1_6` | Chat (Manus 1.6) | Main conversational interface for interacting with the Manus AI agent. | 0 | home_hub, task_row_tap |
| `document_view` | Document Viewer | Full-screen view for reading generated Markdown or code artifacts. | 20 | chat_1_6 via artifact chip |
| `files_screen` | Files | Displays all files uploaded to or generated within the current task. | 103 | chat_1_6 via 3-dot menu |
| `task_details_screen` | Task Details | Shows metadata about the current task. | 100 | chat_1_6 via 3-dot menu |
| `home_hub` | Home Hub | Dashboard showing task history, active agents, and entry point to profile. | 115 | chat_1_6 via back button, profile_menu via swipe/close |
| `profile_menu` | Profile & Settings Menu | Access account settings, subscription info, and app preferences. | 122 | home_hub via profile pic tap |
| `account_screen` | Account | Manage basic user profile details. | 125 | profile_menu via Account row |
| `usage_screen` | Usage & Credits | View credit balance, subscription status, and usage history. | 130 | profile_menu via Credits row |
| `upgrade_screen` | Upgrade Plan | Subscription purchase flow for Manus Pro. | 135 | usage_screen via Upgrade button |
| `notifications_screen` | Notifications | View system updates, messages, and alerts. | 141 | profile_menu via bell icon |

## Button catalog

| screen | button | location | action → destination | confidence |
|---|---|---|---|---|
| `chat_1_6` | Back (left-facing chevron inside circular pill) | top-left | navigate_back → home_hub | high |
| `chat_1_6` | Manus 1.6 (text with small down chevron) | top-center | open_sheet → inline_model_selector | high |
| `chat_1_6` | Add Collaborator (person outline with plus sign inside circular pill) | top-right, leftmost icon | open_sheet → inline_collaborator_sheet | high |
| `chat_1_6` | Share (arrow pointing up out of a square inside circular pill) | top-right, middle icon | open_sheet → inline_share_sheet | high |
| `chat_1_6` | More Options (three horizontal dots inside circular pill) | top-right, rightmost icon | open_menu → inline_chat_menu | high |
| `chat_1_6` | Add Attachment (plus sign) | bottom-left, inside composer | open_sheet → inline_attachment_sheet | high |
| `chat_1_6` | Voice Input (microphone) | bottom-right, inside composer | start_voice_recording → inline_voice_state | high |
| `chat_1_6` | Send (upward arrow) | bottom-right, inside composer (replaces mic when typing) | submit_prompt → inline_loading_state | high |
| `chat_1_6` | Toggle Details (chevron up/down) | inline within agent message blocks | toggle_visibility → inline_expand_collapse | high |
| `chat_1_6` | Open Artifact (file icon with title and size) | inline within agent message blocks | navigate_forward → document_view | high |
| `document_view` | Close (X mark) | top-left | navigate_back → chat_1_6 | high |
| `document_view` | Share (arrow pointing up out of a square) | top-right, left icon | open_sheet → inline_doc_share_sheet | high |
| `document_view` | Export Options (three horizontal dots) | top-right, right icon | open_menu → inline_doc_export_menu | high |
| `files_screen` | Back (left-facing chevron) | top-left | navigate_back → chat_1_6 | high |
| `task_details_screen` | Back (left-facing chevron) | top-left | navigate_back → chat_1_6 | high |
| `home_hub` | Profile (user avatar image) | top-left | open_menu → profile_menu | high |
| `home_hub` | Search (magnifying glass) | top-right | open_search → inline_search_mode | medium |
| `home_hub` | Open Task (none, entire row is clickable) | list item in main view | navigate_forward → chat_1_6 | high |
| `profile_menu` | Notifications (bell outline) | top-right | navigate_forward → notifications_screen | high |
| `profile_menu` | Upgrade (text 'Upgrade' in a pill) | top right of Pro banner | navigate_forward → upgrade_screen | high |
| `profile_menu` | Credits (sparkle icon, text 'Credits', chevron right) | list item below banner | navigate_forward → usage_screen | high |
| `profile_menu` | Account (person icon, text 'Account', chevron right) | list item under General section | navigate_forward → account_screen | high |
| `account_screen` | Back (left-facing chevron) | top-left | navigate_back → profile_menu | high |
| `usage_screen` | Back (left-facing chevron) | top-left | navigate_back → profile_menu | high |
| `usage_screen` | Upgrade (text 'Upgrade' in a pill) | top right of Pro banner | open_sheet → upgrade_screen | high |
| `upgrade_screen` | Close (X mark) | top-right | navigate_back → usage_screen | high |
| `notifications_screen` | Back (left-facing chevron) | top-left | navigate_back → profile_menu | high |

## Chips / tabs

- **files_screen** — `All` (tab) → filter_list
- **files_screen** — `Documents` (tab) → filter_list
- **files_screen** — `Code files` (tab) → filter_list
- **home_hub** — `All` (tab) → filter_list
- **home_hub** — `Agents` (tab) → filter_list
- **home_hub** — `Manual` (tab) → filter_list
- **home_hub** — `Scheduled` (tab) → filter_list
- **home_hub** — `Favorites` (tab) → filter_list
- **notifications_screen** — `All` (tab) → filter_list
- **notifications_screen** — `Updates` (tab) → filter_list
- **notifications_screen** — `Messages` (tab) → filter_list

## Menus

### chat.threeDotActions — triggered by `chat.topBar.threeDot` (bottom sheet)

| item | icon | destination | destructive |
|---|---|---|---|
| Favorite | star | `inline_toggle` | no |
| Rename | pencil | `rename_modal` | no |
| View all files | folder | `files_screen` | no |
| Task details | info | `task_details_screen` | no |
| Delete | trash | `confirm_delete_modal` | yes |

### doc.shareMenu — triggered by `doc.topBar.share` (bottom sheet)

| item | icon | destination | destructive |
|---|---|---|---|
| Only me | lock | `inline_toggle` | no |
| Public Access | globe | `inline_toggle` | no |

### doc.exportMenu — triggered by `doc.topBar.threeDot` (popover)

| item | icon | destination | destructive |
|---|---|---|---|
| Download as PDF | pdf file | `inline_download` | no |
| Download as DOCX | docx file | `inline_download` | no |
| Download as Markdown | markdown file | `inline_download` | no |
| Code | code brackets | `inline_download` | no |

### chat.attachmentSheet — triggered by `chat.composer.plus` (bottom sheet)

| item | icon | destination | destructive |
|---|---|---|---|
| Camera | camera | `device_camera` | no |
| Add files | paperclip | `device_file_picker` | no |
| Connect My Computer | monitor | `connect_flow` | no |
| Add Skills | puzzle piece | `skills_picker` | no |
| Build website | globe | `agent_template` | no |
| Create slides | presentation | `agent_template` | no |

### chat.modelSelector — triggered by `chat.topBar.modelPill` (bottom sheet)

| item | icon | destination | destructive |
|---|---|---|---|
| Manus 1.6 Max | sparkles | `inline_select` | no |
| Manus 1.6 | check mark | `inline_select` | no |
| Manus 1.6 Lite | zap | `inline_select` | no |

## Timeline

- **20s** [chat_1_6] tap on artifact chip 'GenAI Engineer Interview Scorecar...' → navigate to document_view
- **40s** [document_view] tap X close button → navigate back to chat_1_6
- **45s** [chat_1_6] tap + button in composer → open attachment bottom sheet
- **51s** [chat_1_6] tap Manus 1.6 pill in top bar → open model selector bottom sheet
- **58s** [chat_1_6] tap 3-dot menu in top bar → open task actions bottom sheet
- **100s** [chat_three_dot_menu] tap Task details → navigate to task_details_screen
- **103s** [chat_three_dot_menu] tap View all files → navigate to files_screen
- **108s** [chat_three_dot_menu] tap Rename → open rename modal
- **115s** [chat_1_6] tap back button → navigate to home_hub
- **122s** [home_hub] tap profile picture → open profile_menu
- **125s** [profile_menu] tap Account row → navigate to account_screen
- **130s** [profile_menu] tap Credits row → navigate to usage_screen
- **135s** [usage_screen] tap Upgrade button → open upgrade_screen modal
- **141s** [profile_menu] tap bell icon → navigate to notifications_screen
- **150s** [home_hub] tap first task row → navigate to chat_1_6

## Transitions

| from → to | trigger | animation | latency |
|---|---|---|---|
| `chat_1_6` → `document_view` | tap artifact chip | push from right, standard iOS transition | 0ms |
| `chat_1_6` → `home_hub` | tap back button | pop to right, standard iOS transition | 0ms |
| `home_hub` → `profile_menu` | tap profile picture | slide in from left, pushing home_hub to the right | 0ms |
| `profile_menu` → `usage_screen` | tap Credits row | push from right | 0ms |
| `usage_screen` → `upgrade_screen` | tap Upgrade button | slide up from bottom as a full-screen modal sheet | 0ms |

## Design tokens

```json
{
  "colors": {
    "pageBackground": "#000000",
    "cardBackground": "#1C1C1E",
    "primaryText": "#FFFFFF",
    "mutedText": "#8E8E93",
    "accent": "#FFFFFF",
    "destructiveRed": "#FF3B30"
  },
  "shapes": {
    "cardRadius": "16px",
    "chipRadius": "full",
    "buttonRadius": "full"
  },
  "typography": {
    "headerFamily": "SF Pro",
    "bodyFamily": "SF Pro"
  },
  "motion": {
    "modalSheetStyle": "slide-up from bottom, rubber-band dismiss",
    "tabSwitchStyle": "instant",
    "typicalTransitionMs": 300
  }
}
```

## Observations

- Top bar consistently uses a circular back button on the left.
- Heavy use of bottom sheets for menus and selections rather than full screen pushes.
- Dark mode is the default/only theme shown, with high contrast white text on black/dark gray backgrounds.
- Tab navigation uses pill-shaped chips that fill with white when active.

### Accessibility
- Tap targets appear >=44px, especially for top bar icons which are housed in circular touch areas.
- High contrast text is readable against the dark backgrounds.

### Surprising patterns
- The profile menu slides in from the left, pushing the main view, which is a pattern more common in older Android apps or specific iOS apps (like Slack), rather than standard iOS modal presentations.
- The 'Delete' option in the 3-dot menu has red text and a red icon, which is standard, but it's mixed in a list of non-destructive actions without a separator.
