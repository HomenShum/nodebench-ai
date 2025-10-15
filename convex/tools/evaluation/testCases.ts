// convex/tools/evaluation/testCases.ts
// Comprehensive test cases for all Agent tools

export interface TestCase {
  id: string;
  category: string;
  tool: string;
  scenario: string;
  userQuery: string;
  expectedTool: string;
  expectedArgs: Record<string, any>;
  successCriteria: string[];
  evaluationPrompt: string;
}

export const documentToolTests: TestCase[] = [
  {
    id: "doc-001",
    category: "Document Discovery",
    tool: "findDocument",
    scenario: "User wants to find a document by title",
    userQuery: "Find my revenue report",
    expectedTool: "findDocument",
    expectedArgs: { query: "revenue report", limit: 10 },
    successCriteria: [
      "Tool called is findDocument",
      "Query parameter contains 'revenue' or 'report'",
      "Response includes document IDs and titles",
      "Response is formatted as a numbered list"
    ],
    evaluationPrompt: "Evaluate if the AI correctly used findDocument to search for revenue-related documents. Check if the response includes document IDs, titles, and metadata."
  },
  {
    id: "doc-002",
    category: "Document Reading",
    tool: "getDocumentContent",
    scenario: "User wants to read a specific document",
    userQuery: "Open document j57abc123",
    expectedTool: "getDocumentContent",
    expectedArgs: { documentId: "j57abc123" },
    successCriteria: [
      "Tool called is getDocumentContent",
      "documentId parameter matches the requested ID",
      "Response includes full document content",
      "Response includes metadata (type, last modified)"
    ],
    evaluationPrompt: "Evaluate if the AI correctly retrieved the document content with proper metadata. Check if the response is well-formatted and includes all relevant information."
  },
  {
    id: "doc-003",
    category: "Document Analysis",
    tool: "analyzeDocument",
    scenario: "User wants to understand document content",
    userQuery: "What is this document about?",
    expectedTool: "analyzeDocument",
    expectedArgs: { analysisType: "summary" },
    successCriteria: [
      "Tool called is analyzeDocument",
      "Response includes summary or analysis",
      "Response includes word count or metadata",
      "Analysis is coherent and relevant"
    ],
    evaluationPrompt: "Evaluate if the AI provided a meaningful summary of the document. Check if the analysis is accurate and helpful."
  },
  {
    id: "doc-004",
    category: "Document Creation",
    tool: "createDocument",
    scenario: "User wants to create a new document",
    userQuery: "Create a new document called 'Q4 Planning'",
    expectedTool: "createDocument",
    expectedArgs: { title: "Q4 Planning" },
    successCriteria: [
      "Tool called is createDocument",
      "Title parameter matches requested title",
      "Response includes new document ID",
      "Confirmation message is clear"
    ],
    evaluationPrompt: "Evaluate if the AI successfully created a document with the correct title. Check if the response confirms creation and provides the document ID."
  },
  {
    id: "doc-005",
    category: "Document Editing",
    tool: "updateDocument",
    scenario: "User wants to edit document properties",
    userQuery: "Change the title to 'Q4 Final Report'",
    expectedTool: "updateDocument",
    expectedArgs: { title: "Q4 Final Report" },
    successCriteria: [
      "Tool called is updateDocument",
      "Title parameter matches new title",
      "Response confirms update",
      "Updated fields are listed"
    ],
    evaluationPrompt: "Evaluate if the AI correctly updated the document title. Check if the confirmation is clear and accurate."
  }
];

export const mediaToolTests: TestCase[] = [
  {
    id: "media-001",
    category: "Media Search",
    tool: "searchMedia",
    scenario: "User wants to find images",
    userQuery: "Find images about architecture",
    expectedTool: "searchMedia",
    expectedArgs: { query: "architecture", mediaType: "image" },
    successCriteria: [
      "Tool called is searchMedia",
      "Query parameter contains 'architecture'",
      "mediaType is 'image' or 'all'",
      "Response includes image files with metadata"
    ],
    evaluationPrompt: "Evaluate if the AI found relevant images. Check if the response includes file IDs, types, and sizes."
  },
  {
    id: "media-002",
    category: "Media Analysis",
    tool: "analyzeMediaFile",
    scenario: "User wants to analyze an image",
    userQuery: "Analyze this image",
    expectedTool: "analyzeMediaFile",
    expectedArgs: { analysisType: "general" },
    successCriteria: [
      "Tool called is analyzeMediaFile",
      "Response includes AI analysis",
      "Analysis describes image content",
      "File details are included"
    ],
    evaluationPrompt: "Evaluate if the AI provided meaningful image analysis. Check if the description is accurate and detailed."
  },
  {
    id: "media-003",
    category: "Media Details",
    tool: "getMediaDetails",
    scenario: "User wants to view media file details",
    userQuery: "Show me details for this image",
    expectedTool: "getMediaDetails",
    expectedArgs: {},
    successCriteria: [
      "Tool called is getMediaDetails",
      "Response includes file metadata",
      "Preview URL is provided",
      "File size and type are shown"
    ],
    evaluationPrompt: "Evaluate if the AI provided complete file details including preview URL and metadata."
  },
  {
    id: "media-004",
    category: "Media Listing",
    tool: "listMediaFiles",
    scenario: "User wants to see all images",
    userQuery: "Show me all my images",
    expectedTool: "listMediaFiles",
    expectedArgs: { mediaType: "image", sortBy: "recent" },
    successCriteria: [
      "Tool called is listMediaFiles",
      "mediaType is 'image'",
      "Response includes list of images",
      "Files are sorted by date"
    ],
    evaluationPrompt: "Evaluate if the AI listed all images correctly. Check if the sorting and filtering are appropriate."
  }
];

export const taskToolTests: TestCase[] = [
  {
    id: "task-001",
    category: "Task Listing",
    tool: "listTasks",
    scenario: "User wants to see today's tasks",
    userQuery: "What tasks are due today?",
    expectedTool: "listTasks",
    expectedArgs: { filter: "today" },
    successCriteria: [
      "Tool called is listTasks",
      "Filter is 'today'",
      "Response includes task list",
      "Tasks show status and priority"
    ],
    evaluationPrompt: "Evaluate if the AI correctly filtered tasks for today. Check if the response is well-formatted with all task details."
  },
  {
    id: "task-002",
    category: "Task Creation",
    tool: "createTask",
    scenario: "User wants to create a task",
    userQuery: "Create a task to review the Q4 report by Friday",
    expectedTool: "createTask",
    expectedArgs: { title: "review the Q4 report", priority: "medium" },
    successCriteria: [
      "Tool called is createTask",
      "Title includes 'review' and 'Q4 report'",
      "Due date is parsed (Friday)",
      "Response includes task ID"
    ],
    evaluationPrompt: "Evaluate if the AI created a task with appropriate title and due date. Check if the confirmation is clear."
  },
  {
    id: "task-003",
    category: "Task Update",
    tool: "updateTask",
    scenario: "User wants to mark task as complete",
    userQuery: "Mark task t12abc as complete",
    expectedTool: "updateTask",
    expectedArgs: { taskId: "t12abc", status: "done" },
    successCriteria: [
      "Tool called is updateTask",
      "taskId matches requested ID",
      "Status is 'done'",
      "Response confirms update"
    ],
    evaluationPrompt: "Evaluate if the AI correctly updated the task status. Check if the confirmation includes updated fields."
  },
  {
    id: "task-004",
    category: "Task Priority",
    tool: "listTasks",
    scenario: "User wants to see high priority tasks",
    userQuery: "Show me high priority tasks",
    expectedTool: "listTasks",
    expectedArgs: { priority: "high", filter: "all" },
    successCriteria: [
      "Tool called is listTasks",
      "Priority filter is 'high'",
      "Response includes only high priority tasks",
      "Tasks are properly formatted"
    ],
    evaluationPrompt: "Evaluate if the AI filtered tasks by priority correctly. Check if all returned tasks are high priority."
  }
];

export const calendarToolTests: TestCase[] = [
  {
    id: "cal-001",
    category: "Event Listing",
    tool: "listEvents",
    scenario: "User wants to see this week's events",
    userQuery: "What events do I have this week?",
    expectedTool: "listEvents",
    expectedArgs: { timeRange: "week" },
    successCriteria: [
      "Tool called is listEvents",
      "timeRange is 'week'",
      "Response includes event list",
      "Events show time and location"
    ],
    evaluationPrompt: "Evaluate if the AI listed this week's events correctly. Check if the response includes all relevant event details."
  },
  {
    id: "cal-002",
    category: "Event Creation",
    tool: "createEvent",
    scenario: "User wants to schedule a meeting",
    userQuery: "Schedule a meeting with the team tomorrow at 2pm",
    expectedTool: "createEvent",
    expectedArgs: { title: "meeting with the team" },
    successCriteria: [
      "Tool called is createEvent",
      "Title includes 'meeting' and 'team'",
      "Start time is parsed (tomorrow 2pm)",
      "Response includes event ID"
    ],
    evaluationPrompt: "Evaluate if the AI created an event with correct title and time. Check if the confirmation is clear."
  }
];

export const organizationToolTests: TestCase[] = [
  {
    id: "org-001",
    category: "Folder Contents",
    tool: "getFolderContents",
    scenario: "User wants to see folder contents",
    userQuery: "Show me what's in the Projects folder",
    expectedTool: "getFolderContents",
    expectedArgs: { folderName: "Projects" },
    successCriteria: [
      "Tool called is getFolderContents",
      "folderName is 'Projects'",
      "Response includes document list",
      "Documents show titles and types"
    ],
    evaluationPrompt: "Evaluate if the AI listed folder contents correctly. Check if the response is well-formatted."
  }
];

export const webSearchToolTests: TestCase[] = [
  {
    id: "web-001",
    category: "Web Search",
    tool: "linkupSearch",
    scenario: "User wants current information",
    userQuery: "Search the web for latest AI developments",
    expectedTool: "linkupSearch",
    expectedArgs: { query: "latest AI developments", depth: "standard" },
    successCriteria: [
      "Tool called is linkupSearch",
      "Query is relevant",
      "Response includes sources",
      "Answer is current and accurate"
    ],
    evaluationPrompt: "Evaluate if the AI found relevant and current information. Check if sources are cited."
  },
  {
    id: "web-002",
    category: "Image Search",
    tool: "linkupSearch",
    scenario: "User wants to find images on the web",
    userQuery: "Find images of the Eiffel Tower",
    expectedTool: "linkupSearch",
    expectedArgs: { query: "Eiffel Tower", includeImages: true },
    successCriteria: [
      "Tool called is linkupSearch",
      "includeImages is true",
      "Response includes image URLs",
      "Images are displayed in markdown"
    ],
    evaluationPrompt: "Evaluate if the AI found relevant images. Check if images are properly formatted in markdown."
  }
];

// Multi-step workflow tests
export const workflowTests: TestCase[] = [
  {
    id: "workflow-001",
    category: "Document Workflow",
    tool: "multiple",
    scenario: "Find, open, analyze, and edit a document",
    userQuery: "Find my revenue report, open it, tell me what it's about, and add a section on Q1 projections",
    expectedTool: "findDocument,getDocumentContent,analyzeDocument,updateDocument",
    expectedArgs: {},
    successCriteria: [
      "All 4 tools are called in sequence",
      "Document is found and opened",
      "Analysis is provided",
      "Document is updated"
    ],
    evaluationPrompt: "Evaluate if the AI completed the entire workflow correctly. Check if each step was executed properly and the final result is correct."
  },
  {
    id: "workflow-002",
    category: "Task Workflow",
    tool: "multiple",
    scenario: "List tasks, create new task, update existing task",
    userQuery: "Show me today's tasks, create a new task to call the client, and mark the first task as done",
    expectedTool: "listTasks,createTask,updateTask",
    expectedArgs: {},
    successCriteria: [
      "All 3 tools are called",
      "Today's tasks are listed",
      "New task is created",
      "Existing task is updated"
    ],
    evaluationPrompt: "Evaluate if the AI handled the multi-step task workflow correctly. Check if all operations were successful."
  }
];

// Combine all test cases
export const allTestCases: TestCase[] = [
  ...documentToolTests,
  ...mediaToolTests,
  ...taskToolTests,
  ...calendarToolTests,
  ...organizationToolTests,
  ...webSearchToolTests,
  ...workflowTests,
];

// Export test case counts
export const testCaseStats = {
  documents: documentToolTests.length,
  media: mediaToolTests.length,
  tasks: taskToolTests.length,
  calendar: calendarToolTests.length,
  organization: organizationToolTests.length,
  webSearch: webSearchToolTests.length,
  workflows: workflowTests.length,
  total: allTestCases.length,
};

