# Convex Agent Tools Reference

## Overview

The NodeBench AI assistant has access to a comprehensive set of tools for document management, media handling, task management, calendar operations, and web search. These tools enable voice-controlled workflows and intelligent automation.

## 🔧 Tool Categories

### 📄 Document Operations
- `findDocument` - Search for documents
- `getDocumentContent` - Read full document content
- `analyzeDocument` - Summarize and analyze documents
- `updateDocument` - Edit document properties
- `createDocument` - Create new documents

### 🖼️ Media Operations
- `searchMedia` - Find images and videos
- `analyzeMediaFile` - AI analysis of media files
- `getMediaDetails` - Get media file information
- `listMediaFiles` - List all media files

### ✅ Task Management
- `listTasks` - Query tasks with filters
- `createTask` - Create new tasks
- `updateTask` - Modify existing tasks

### 📅 Calendar Operations
- `listEvents` - Query calendar events
- `createEvent` - Schedule new events

### 📁 Organization
- `getFolderContents` - List documents in folders

### 🌐 Web Search
- `linkupSearch` - Search the web with images

---

## 📄 Document Tools

### `findDocument`

**Description:** Search for documents by title or content.

**Voice Commands:**
- "Find document about revenue"
- "Search for Q4 planning documents"
- "Show me documents related to marketing"

**Parameters:**
```typescript
{
  query: string,              // Search query
  limit?: number,             // Max results (default: 10)
  includeArchived?: boolean   // Include archived docs (default: false)
}
```

**Returns:**
```
Found 3 document(s):

1. 📄 "Q4 Revenue Report"
   ID: j57abc123...
   Type: text
   Last Modified: 2024-01-15

2. 📊 "Revenue Analysis 2024"
   ID: k98def456...
   Type: file
   Last Modified: 2024-01-10
```

---

### `getDocumentContent`

**Description:** Retrieve full document content and metadata.

**Voice Commands:**
- "Open document j57abc123"
- "Show me the content of the revenue report"
- "Read document [ID]"

**Parameters:**
```typescript
{
  documentId: string  // Document ID from findDocument
}
```

**Returns:**
```
Document: "Q4 Revenue Report"
ID: j57abc123...
Type: text
Last Modified: 2024-01-15 10:30 AM
Public: No
Archived: No

Content Preview:
Q4 revenue exceeded expectations with a 25% increase...
```

---

### `analyzeDocument`

**Description:** Analyze and summarize document content.

**Voice Commands:**
- "What is this document about?"
- "Summarize the revenue report"
- "Give me a detailed analysis of this document"

**Parameters:**
```typescript
{
  documentId: string,
  analysisType?: "summary" | "detailed" | "keywords"  // Default: "summary"
}
```

**Returns:**
```
Document Analysis: "Q4 Revenue Report"

Type: Text Document
Word Count: 1,245
Character Count: 8,932
Last Modified: 2024-01-15 10:30 AM

Content Preview:
This document analyzes Q4 revenue performance...
```

---

### `updateDocument`

**Description:** Update document properties.

**Voice Commands:**
- "Edit this document"
- "Change the title to 'Q4 Final Report'"
- "Mark this document as public"

**Parameters:**
```typescript
{
  documentId: string,
  title?: string,
  content?: string,
  isPublic?: boolean,
  isFavorite?: boolean
}
```

**Returns:**
```
Document updated successfully!
Updated fields: title, isPublic

The document has been saved with your changes.
```

---

### `createDocument`

**Description:** Create a new document.

**Voice Commands:**
- "Create a new document called 'Meeting Notes'"
- "Make a new document about project planning"

**Parameters:**
```typescript
{
  title: string,
  content?: string,
  isPublic?: boolean  // Default: false
}
```

**Returns:**
```
Document created successfully!

Title: "Meeting Notes"
ID: m12xyz789...
Public: No

The document is ready to edit.
```

---

## 🖼️ Media Tools

### `searchMedia`

**Description:** Search for images and videos.

**Voice Commands:**
- "Find images about architecture"
- "Show me videos from last month"
- "Search for product photos"

**Parameters:**
```typescript
{
  query: string,
  mediaType?: "image" | "video" | "all",  // Default: "all"
  limit?: number,                          // Default: 20
  useWebSearch?: boolean                   // Default: false
}
```

**Returns:**
```
Found 5 media file(s):

1. 🖼️ "Architecture Design.jpg"
   ID: n34abc...
   Type: jpg
   Size: 2.5 MB
   Last Modified: 2024-01-10
   Analysis: Modern building with glass facade...

2. 🎥 "Project Walkthrough.mp4"
   ID: p56def...
   Type: mp4
   Size: 45.2 MB
   Last Modified: 2024-01-08
```

---

### `analyzeMediaFile`

**Description:** AI analysis of images or videos.

**Voice Commands:**
- "Analyze this image"
- "What's in this video?"
- "Detect objects in this photo"

**Parameters:**
```typescript
{
  fileId: string,
  analysisType?: "general" | "object-detection" | "highlights" | "detailed"
}
```

**Returns:**
```
Analysis Complete for "Architecture Design.jpg":

This image shows a modern commercial building with a distinctive glass and steel facade...

File Details:
- Type: jpg
- Size: 2.5 MB
- Analysis Type: object-detection
```

---

### `getMediaDetails`

**Description:** Get media file details and preview URL.

**Voice Commands:**
- "Show me this image"
- "Display this video"
- "Get details for file [ID]"

**Parameters:**
```typescript
{
  fileId: string
}
```

**Returns:**
```
Image Details: "Architecture Design.jpg"

File Information:
- ID: n34abc...
- Filename: architecture_design.jpg
- Type: jpg
- Size: 2.5 MB
- Created: 2024-01-10 09:15 AM

Preview URL: https://...

Analysis:
Modern building with glass facade, steel framework...
```

---

### `listMediaFiles`

**Description:** List all media files with filtering.

**Voice Commands:**
- "Show me all my images"
- "List recent videos"
- "Display all media files"

**Parameters:**
```typescript
{
  mediaType?: "image" | "video" | "all",  // Default: "all"
  limit?: number,                          // Default: 20
  sortBy?: "recent" | "oldest" | "name"   // Default: "recent"
}
```

---

## ✅ Task Tools

### `listTasks`

**Description:** List tasks with filtering.

**Voice Commands:**
- "Show me my tasks"
- "What tasks are due today?"
- "List high priority tasks"

**Parameters:**
```typescript
{
  filter?: "all" | "today" | "week" | "overdue" | "completed",
  status?: "todo" | "in-progress" | "done" | "all",
  priority?: "low" | "medium" | "high" | "all",
  limit?: number  // Default: 20
}
```

**Returns:**
```
Found 3 task(s):

1. ⬜ 🔴 "Review Q4 Report"
   ID: t12abc...
   Status: todo
   Priority: high
   Due: 2024-01-20

2. 🔄 🟡 "Update Documentation"
   ID: t34def...
   Status: in-progress
   Priority: medium
   Due: 2024-01-22
```

---

### `createTask`

**Description:** Create a new task.

**Voice Commands:**
- "Create a task to review the Q4 report"
- "Add a task for tomorrow: call the client"

**Parameters:**
```typescript
{
  title: string,
  description?: string,
  dueDate?: string,  // ISO format or natural language
  priority?: "low" | "medium" | "high",
  status?: "todo" | "in-progress" | "done"
}
```

---

### `updateTask`

**Description:** Update an existing task.

**Voice Commands:**
- "Mark task t12abc as complete"
- "Change priority of task t34def to high"

**Parameters:**
```typescript
{
  taskId: string,
  title?: string,
  description?: string,
  status?: "todo" | "in-progress" | "done",
  priority?: "low" | "medium" | "high",
  dueDate?: string
}
```

---

## 📅 Calendar Tools

### `listEvents`

**Description:** List calendar events in a date range.

**Voice Commands:**
- "What events do I have this week?"
- "Show my calendar for tomorrow"
- "List all meetings today"

**Parameters:**
```typescript
{
  timeRange?: "today" | "tomorrow" | "week" | "month" | "custom",
  startDate?: string,  // For custom range
  endDate?: string,    // For custom range
  status?: "confirmed" | "tentative" | "cancelled" | "all"
}
```

---

### `createEvent`

**Description:** Create a new calendar event.

**Voice Commands:**
- "Schedule a meeting with the team tomorrow at 2pm"
- "Create an event for the product launch next week"

**Parameters:**
```typescript
{
  title: string,
  startTime: string,  // ISO format
  endTime?: string,
  description?: string,
  location?: string,
  allDay?: boolean
}
```

---

## 📁 Organization Tools

### `getFolderContents`

**Description:** List documents in a folder.

**Voice Commands:**
- "Show me what's in the Projects folder"
- "List documents in the Marketing folder"

**Parameters:**
```typescript
{
  folderName: string
}
```

---

## 🌐 Web Search Tool

### `linkupSearch`

**Description:** Search the web for current information with optional images.

**Voice Commands:**
- "Search the web for latest AI developments"
- "Find images of the Eiffel Tower"

**Parameters:**
```typescript
{
  query: string,
  depth?: "standard" | "deep",
  includeImages?: boolean,
  includeDomains?: string[],
  excludeDomains?: string[]
}
```

See `LINKUP_INTEGRATION.md` for full documentation.

---

## 🎯 Voice Command Examples

### Document Workflows
```
User: "Find my revenue documents"
AI: Uses findDocument → Returns list of matching documents

User: "Open the first one"
AI: Uses getDocumentContent → Displays full content

User: "What is this about?"
AI: Uses analyzeDocument → Provides summary

User: "Add a section about Q1 projections"
AI: Uses updateDocument → Edits the document
```

### Media Workflows
```
User: "Find images about modern architecture"
AI: Uses searchMedia → Returns image list

User: "Analyze the first image"
AI: Uses analyzeMediaFile → Provides detailed analysis

User: "Search the web for more architecture images"
AI: Uses linkupSearch with includeImages: true
```

### Task Workflows
```
User: "What tasks are due today?"
AI: Uses listTasks with filter: "today"

User: "Create a task to review the report by Friday"
AI: Uses createTask with parsed due date

User: "Mark the first task as complete"
AI: Uses updateTask with status: "done"
```

---

## 🔍 Implementation Notes

### Tool Context
All tools have access to:
- `ctx.runQuery()` - Call Convex queries
- `ctx.runMutation()` - Call Convex mutations
- `ctx.runAction()` - Call Convex actions
- `ctx.userId` - Current authenticated user

### Error Handling
Tools return user-friendly error messages:
- "Document not found or you don't have permission"
- "Invalid date format: please use ISO format"
- "Folder 'Projects' not found. Available folders: ..."

### Response Formatting
All tools return formatted strings optimized for:
- AI comprehension
- User readability
- Structured data display in UI

---

## 📊 Success Metrics

- **Latency**: <2 seconds for most operations
- **Accuracy**: 95%+ correct tool selection
- **User Satisfaction**: Clear, actionable responses
- **Token Efficiency**: Optimized response sizes

---

## 🚀 Next Steps

1. Test all voice command scenarios
2. Build eval dataset for tool performance
3. Implement feedback collection
4. Add more advanced tools (batch operations, cross-document search)
5. Integrate with external services (Google Calendar, Notion, Slack)

