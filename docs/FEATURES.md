# NodeBench AI — Features & Architecture Map

This document summarizes current capabilities, main modules, and end‑to‑end flows in the NodeBench AI app. It also includes “How to test” checklists and guidance on “How to make it agent tool call possible” for relevant features.

Last updated: 2025-08-20 11:42 PT

---

## Overview

- Backend: Convex functions in `nodebench_ai3/convex/`.
- Frontend: React/TypeScript in `nodebench_ai3/src/components/`.
- AI: Agents in `convex/aiAgents.ts`; hybrid RAG in `convex/rag.ts`; file analysis in `convex/fileAnalysis.ts` + `convex/genai.ts`.
- Auth: Magic link auth in `convex/auth.ts`.
- Integrations: MCP JSON‑RPC endpoint in `convex/router.ts`; email via Resend in `convex/email.ts`.

---

## Key Backend Modules

- `convex/aiAgents.ts`
  - Agents: `openaiAgent`, `geminiAgent` (default `documentAgent = openaiAgent`).
  - Public actions/queries (selected): `compileAaplModel`, `csvLeadWorkflow`, `listAgentTools`, `getOrCreateThread`, `chatWithAgent`, `listMessages`.
  - MCP bridging: `getMcpToolSchemas`, `convertMcpToolsForOpenAI`, `getGeminiMcpToolSchemas`, `executeMcpTool` (+ variants), `refreshMcpTools`.
  - RAG helpers: `internalCreateDocument`, `indexDocument`, `indexAllDocuments`, `getThreadMetadata`.

- `convex/rag.ts`
  - Public: `askQuestion`, `addContextPublic`, `semanticSearch`.
  - Internal: `addContext`, `addDocumentToRag`, `answerQuestionViaRAG` (hybrid vector + keyword search).

- `convex/fileAnalysis.ts`
  - `analyzeFileWithGenAI` reads real file/URL content; correct SDK use; robust cleanup.

- `convex/genai.ts`
  - `extractAndIndexFile`, `rankChunksForFiles`, `answerFromCache`, `ensureFileCache`.
  - QA: `smokePdfPages`, `smokeAvTimestamps`, `smokeE2E`.

- `convex/files.ts`
  - Upload: `generateUploadUrl`, `createFile`; metadata: `getUserFiles`, `getRecentAnalyses`; mutate: `renameFile`, CSV helpers, URL analyses.

- `convex/documents.ts`
  - CRUD, lists, search (`findByTitleAny`, `getSearch`), `getNodesPaginated`, `toggleFavorite`.

- `convex/nodes_extras.ts`
  - Node helpers: `create` (markdown-aware), `archive` (recursive).

- `convex/email.ts`
  - Resend-backed `sendEmail` action.

- `convex/router.ts`
  - MCP JSON‑RPC `/api/mcp` methods: `initialize`, `tools/list`, `tools/call`, `resources/list`.

---

## Agent Tools (server) — `convex/aiAgents.ts`

- Documents/Nodes: `createDocument`, `updateDocument`, `archiveDocument`, `findDocuments`, `createNode`, `updateNode`, `archiveNode`.
- Non‑mutating proposals: `proposeNode`, `proposeUpdateNode` → return `{ actions, message }` for Editor preview.
- Open/focus: `openDocument`, alias `openDoc` → `{ openedDocumentId }`.
- Content helpers: `editDoc`, `summarizeDocument`.
- RAG: `ragAsk`, `ragAddContext`, `ragIngestDocument`.
- Spreadsheets: `applySpreadsheetOps`.
- Workflows: `runCsvLeadWorkflow`, `compileAaplModel`.
- Email: `sendEmail`.

Frontend handling (selected):
- `src/components/AIChatPanel.tsx` listens for tool results.
  - `openDocument`/`openDoc` → `_onDocumentSelect(openedDocumentId)`.
  - `proposeNode`/`proposeUpdateNode` → dispatch `window` event `nodebench:aiProposal`.
- `src/components/Editor.tsx` listens to `nodebench:aiProposal`, previews diffs, and applies via `nodebench:applyActions`.

---

## End‑to‑End Flows (with How to test + Agent tool call notes)

### 1) Chat‑Driven Edit Proposals (non‑mutating → accept in Editor)

- How it works
  - User chats in `AIChatPanel`. The agent calls `proposeNode` or `proposeUpdateNode` (non‑mutating).
  - Chat panel dispatches `nodebench:aiProposal` with `{ actions, message }`.
  - `Editor` shows inline preview with line‑gutter numbers; on accept, emits `nodebench:applyActions` to perform `updateNode`/`createNode`.
  - Backend mutations invoked as needed (`api.nodes.update`, `api.nodes.add`, `api.documents.update`).

- How to test (checklist)
  - [ ] Open a document in the editor.
  - [ ] Open AI Chat and request a change (e.g., “rewrite the current paragraph to be more concise”).
  - [ ] Confirm a proposal overlay appears in the editor with diff and line number.
  - [ ] Click Accept; verify block content updates.
  - [ ] Undo/Redo or refresh and verify persisted change.

- How to make it agent tool call possible
  - Ensure tools `proposeNode` and `proposeUpdateNode` are included in the agent options in `openaiAgent`/`geminiAgent` (they are in `agentTools`).
  - Keep system instructions explicit that the agent should prefer non‑mutating proposal tools.
  - Frontend wiring is already implemented in `AIChatPanel.tsx` and `Editor.tsx` (no extra work needed).

### 2) Open Document From Chat

- How it works
  - Agent calls `openDocument` or `openDoc` and returns `{ openedDocumentId }`.
  - Chat panel selects that document via `_onDocumentSelect(openedDocumentId)`.

- How to test (checklist)
  - [ ] In AI Chat, ask “Open the document titled ‘<Your Title>’”.
  - [ ] Verify the left/main pane selects and loads that document.

- How to make it agent tool call possible
  - Tool names `openDocument` and alias `openDoc` are defined and exposed.
  - Ensure titles are resolvable via `api.documents.findByTitleAny` (already used inside tools).

### 3) CSV Lead Workflow (ingest → score → enrich → message)

- How it works
  - Agent/Quick Action calls `csvLeadWorkflow({ fileId })`.
  - Pipeline processes CSV, scoring leads, enriching, and producing messages. Returns IDs for result files.

- How to test (checklist)
  - [ ] Upload a CSV file in Sidebar.
  - [ ] In Chat, click the CSV Quick Action or run “Run CSV lead workflow on selected file”.
  - [ ] Verify toast/success, and that new CSV/memo files appear in Files.

- How to make it agent tool call possible
  - Expose tool `runCsvLeadWorkflow` with `fileId` args (already present in `agentTools`).
  - Ensure UI context passes the selected CSV file id; AIChatPanel provides helpers to select the file.

### 4) File Analysis (files and URLs)

- How it works
  - Sidebar uses `files.generateUploadUrl` + `files.createFile`, then calls `fileAnalysis.analyzeFileWithGenAI` (reads actual file content, supports URL analysis).
  - Results are stored; optional documents may be created for summaries.

- How to test (checklist)
  - [ ] Drag & drop a PDF/CSV/image/video; verify upload success.
  - [ ] Confirm “Analyzing …” progress updates.
  - [ ] Verify analysis result appears (and any created documents/files).
  - [ ] Try URL analysis via the globe button; confirm results.

- How to make it agent tool call possible
  - If needed, expose a tool that calls `analyzeFileWithGenAI` with `{ fileId | url }`.
  - Add a Chat instruction like “You can analyze a selected file or URL by calling analyzeFile tool”.

### 5) Hybrid RAG Q&A

- How it works
  - Agent tool `ragAsk` calls `api.rag.answerQuestionViaRAG` combining vector search + keyword search.
  - Returns an answer plus context text/citations.

- How to test (checklist)
  - [ ] Use Chat: “What does our Apple model compute?”
  - [ ] Verify an answer is returned with context snippets.
  - [ ] Add context first via `ragAddContext` tool or `addContextPublic` action and ask again.

- How to make it agent tool call possible
  - Ensure tools `ragAsk`, `ragAddContext`, `ragIngestDocument` are present (they are in `agentTools`).
  - Confirm embeddings and indexes are ready (schema defines `nodes.search_text`; vector component is installed via RAG component usage).

### 6) Email Sending (Resend)

- How it works
  - Tool `sendEmail` calls Convex action `email.sendEmail` using `RESEND_API_KEY` and `EMAIL_FROM`.

- How to test (checklist)
  - [ ] Open Sidebar → Email mini‑form.
  - [ ] Send to a test address; verify toast success and check inbox.
  - [ ] Try error case (invalid address) and verify error toast.

- How to make it agent tool call possible
  - Ensure `sendEmail` tool stays exposed with `{ to, subject, body }`.
  - Keep rate limits/usage checks if you add them; the tool already forwards action result.

### 7) OpenAI/Gemini Chat + Threading

- How it works
  - `aiAgents.chatWithAgent` maintains threads and messages; `listMessages` paginates.
  - Agents default to OpenAI (`openaiAgent`); `geminiAgent` exists for Gemini prompts/tools as needed.

- How to test (checklist)
  - [ ] Start a chat session; send a message.
  - [ ] Refresh the page and verify thread persists.
  - [ ] Trigger tool calls (e.g., proposals, openDoc) and observe UI reactions.

- How to make it agent tool call possible
  - Keep tools provided on the agent and/or per‑thread (`Agent` allows tools at constructor, thread, and call levels).
  - Ensure system instructions describe preferred tools and output shapes (already in `aiAgents.ts`).

### 8) MCP Tools via HTTP Endpoint

- How it works
  - `/api/mcp` implements minimal JSON‑RPC for `initialize`, `tools/list`, `tools/call`, `resources/list`.
  - Tools map to Convex functions like `api.files.getUserFiles`, `internal.files.getFile`, `api.rag.semanticSearch`, `api.rag.askQuestion`.

- How to test (checklist)
  - [ ] POST to `/api/mcp` with `{ method: "initialize" }` and verify protocol response.
  - [ ] Call `{ method: "tools/list" }` and inspect tools.
  - [ ] Call `{ method: "tools/call", params: { name, args } }` for a simple tool and verify output.

- How to make it agent tool call possible
  - Keep the tool registry synced in `router.ts`.
  - For richer sessions, consider integrating a full MCP transport and session manager, or dynamically register agent tools.

---

## Environment Variables

- OpenAI: `OPENAI_API_KEY` preferred over `CONVEX_OPENAI_API_KEY`; `OPENAI_BASE_URL` preferred over `CONVEX_OPENAI_BASE_URL`.
- Gemini: `CONVEX_GEMINI_API_KEY` (and/or `GEMINI_API_KEY`).
- Resend: `RESEND_API_KEY`, `EMAIL_FROM`.

---

## Security and Access Control

- Most sensitive actions check `getAuthUserId` / `ctx.auth.getUserIdentity`.
- Ownership checks before mutating documents/files.
- `/api/mcp` requires an authenticated user.

---

## References (files & symbols)

- Agents: `convex/aiAgents.ts` → `openaiAgent`, `geminiAgent`, tools in `agentTools`, `chatWithAgent`, `listMessages`.
- RAG: `convex/rag.ts` → `askQuestion`, `addContextPublic`, `answerQuestionViaRAG`, `semanticSearch`.
- File Analysis: `convex/fileAnalysis.ts` → `analyzeFileWithGenAI`; `convex/genai.ts` → `extractAndIndexFile`, `rankChunksForFiles`, `smokePdfPages`, `smokeAvTimestamps`.
- Files: `convex/files.ts` → uploads, URL analysis, CSV utilities.
- Documents/Nodes: `convex/documents.ts`, `convex/nodes_extras.ts`.
- Email: `convex/email.ts` → `sendEmail`.
- MCP: `convex/router.ts` → `/api/mcp`.
- Frontend: `src/components/AIChatPanel.tsx`, `src/components/Editor.tsx`, `src/components/Sidebar.tsx`, `src/components/SettingsModal.tsx`.
