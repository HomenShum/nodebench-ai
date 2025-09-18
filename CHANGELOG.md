# Changelog

All notable changes to this project will be documented in this file.

## 2025-09-17

### Highlights
- Analyze with Gemini: One-click file analysis inserts Markdown directly into Quick notes.
- Document header tags: AI-generated, color-coded by kind, inline rename, ghost “+ Add tag” pill, and kind change via left color strip.
- Backend support: New Convex mutations for tag removal and kind updates.

### Details
- File analysis → Quick notes
  - Added an “Analyze with Gemini” button in the File Viewer that calls the Convex action `fileAnalysis.analyzeFileWithGenAI` and inserts the Markdown result directly into the right-hand Quick notes editor.
  - Removed the old inline “AI Analysis” panel beneath the viewer.

- Tags in the document header
  - Generate Tags (Gemini) with loading state and permissions; header auto-runs tag generation after analysis via a `nodebench:generateTags` CustomEvent.
  - Tag pills are color-coded by kind (keyword, entity, topic, community, relationship). Kind is inferred from the AI output and canonicalized in the backend.
  - Click the left color strip on a pill to change its kind; click the pill text to rename inline; click × to remove.
  - Replaced the text input and kind dropdown with a “ghost” add pill (+ Add tag) that turns into an inline input.

- Backend (Convex)
  - New: `tags.removeTagFromDocument(documentId, tagId)` to detach a tag from a document.
  - New: `tags.updateTagKind(documentId, tagId, kind?)` to set/canonicalize a tag’s kind and refresh the document’s tag list.
  - Existing: `tags.addTagsToDocument` and `tags_actions.generateForDocument` are used by the header and auto-generate flows.

### Screenshots (091725)

AI analysis result added to Quick notes:

![AI analysis → Quick note](./updated_screenshot/091725_ai_file_analysis_quick_note.png)

AI analysis plus AI-tagged header pills:

![AI analysis + AI-tagged](./updated_screenshot/091725_ai_file_analysis_quick_note_ai_tagged.png)

