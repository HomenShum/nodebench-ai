// convex/tools/dataAccessTools.ts
// Data access tools for tasks, events, folders, and calendar
// Enables voice-controlled data operations

import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { api } from "../_generated/api";

/**
 * List tasks with optional filtering
 * Voice: "Show me my tasks" or "What tasks are due today?"
 */
export const listTasks = createTool({
  description: "List tasks with optional filtering by status, priority, due date, or other criteria. Returns a formatted list of tasks with their details.",
  
  args: z.object({
    filter: z.enum(["all", "today", "week", "overdue", "completed"]).default("all").describe("Filter tasks by time period or status"),
    status: z.enum(["todo", "in_progress", "done", "all"]).default("all").describe("Filter by task status"),
    priority: z.enum(["low", "medium", "high", "all"]).default("all").describe("Filter by priority level"),
    limit: z.number().default(20).describe("Maximum number of tasks to return"),
  }),

  handler: async (ctx, args): Promise<string> => {
    console.log(`[listTasks] Listing tasks with filter: ${args.filter}, status: ${args.status}`);

    // Get userId from context if available (for evaluation)
    const userId = (ctx as any).evaluationUserId;

    let tasks: any[] = [];

    // Get tasks based on filter
    if (args.filter === "today") {
      tasks = await ctx.runQuery(api.tasks.listTasksDueToday, { userId });
    } else if (args.filter === "week") {
      tasks = await ctx.runQuery(api.tasks.listTasksDueThisWeek, { userId });
    } else {
      // Get all tasks for the user (using listTasksByUpdatedDesc)
      tasks = await ctx.runQuery(api.tasks.listTasksByUpdatedDesc, { limit: 100, userId });
    }

    // Apply status filter
    if (args.status !== "all") {
      tasks = tasks.filter((task: any) => task.status === args.status);
    }
    
    // Apply priority filter
    if (args.priority !== "all") {
      tasks = tasks.filter((task: any) => task.priority === args.priority);
    }
    
    // Handle overdue filter
    if (args.filter === "overdue") {
      const now = Date.now();
      tasks = tasks.filter((task: any) => 
        task.dueDate && task.dueDate < now && task.status !== "done"
      );
    }
    
    // Handle completed filter
    if (args.filter === "completed") {
      tasks = tasks.filter((task: any) => task.status === "done");
    }
    
    // Limit results
    const limitedTasks = tasks.slice(0, args.limit);
    
    if (limitedTasks.length === 0) {
      return `No tasks found matching your criteria.`;
    }
    
    // Format tasks for display
    const formattedTasks = limitedTasks.map((task: any, idx: number) => {
      const statusIcon = task.status === "done" ? "✅" : task.status === "in-progress" ? "🔄" : "⬜";
      const priorityIcon = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "🟢";
      const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date";
      
      return `${idx + 1}. ${statusIcon} ${priorityIcon} "${task.title}"
   ID: ${task._id}
   Status: ${task.status}
   Priority: ${task.priority || "none"}
   Due: ${dueDate}
   ${task.description ? `Description: ${task.description.substring(0, 100)}...` : ''}`;
    }).join('\n\n');
    
    return `Found ${limitedTasks.length} task(s):\n\n${formattedTasks}

Total matching tasks: ${tasks.length}`;
  },
});

/**
 * Create a new task
 * Voice: "Create a task to review the Q4 report"
 */
export const createTask = createTool({
  description: "Create a new task with title, description, due date, and priority. Returns the new task ID.",
  
  args: z.object({
    title: z.string().describe("Task title"),
    description: z.string().optional().describe("Task description"),
    dueDate: z.string().optional().describe("Due date in ISO format (YYYY-MM-DD) or natural language like 'tomorrow', 'next week'"),
    priority: z.enum(["low", "medium", "high"]).default("medium").describe("Task priority"),
    status: z.enum(["todo", "in_progress", "done"]).default("todo").describe("Initial task status"),
  }),

  handler: async (ctx, args): Promise<string> => {
    console.log(`[createTask] Creating task: "${args.title}"`);

    // Parse due date if provided
    let dueDateMs: number | undefined;
    if (args.dueDate) {
      // Simple date parsing - in production, use a proper date parser
      const date = new Date(args.dueDate);
      if (!isNaN(date.getTime())) {
        dueDateMs = date.getTime();
      }
    }

    const taskId = await ctx.runMutation(api.tasks.createTask, {
      title: args.title,
      description: args.description,
      dueDate: dueDateMs,
      priority: args.priority,
      status: args.status,
    });
    
    return `Task created successfully!

Title: "${args.title}"
ID: ${taskId}
Priority: ${args.priority}
Status: ${args.status}
${args.dueDate ? `Due: ${args.dueDate}` : 'No due date'}

The task has been added to your list.`;
  },
});

/**
 * Update an existing task
 * Voice: "Mark task [ID] as complete" or "Change priority of task [ID] to high"
 */
export const updateTask = createTool({
  description: "Update an existing task's properties including title, description, status, priority, or due date.",
  
  args: z.object({
    taskId: z.string().describe("The task ID to update"),
    title: z.string().optional().describe("New task title"),
    description: z.string().optional().describe("New task description"),
    status: z.enum(["todo", "in_progress", "done"]).optional().describe("New task status"),
    priority: z.enum(["low", "medium", "high"]).optional().describe("New task priority"),
    dueDate: z.string().optional().describe("New due date in ISO format"),
  }),
  
  handler: async (ctx, args): Promise<string> => {
    console.log(`[updateTask] Updating task: ${args.taskId}`);
    
    const updates: any = {};
    if (args.title) updates.title = args.title;
    if (args.description) updates.description = args.description;
    if (args.status) updates.status = args.status;
    if (args.priority) updates.priority = args.priority;
    if (args.dueDate) {
      const date = new Date(args.dueDate);
      if (!isNaN(date.getTime())) {
        updates.dueDate = date.getTime();
      }
    }
    
    await ctx.runMutation(api.tasks.updateTask, {
      taskId: args.taskId as any,
      ...updates,
    });
    
    const updatedFields = Object.keys(updates).join(', ');
    
    return `Task updated successfully!

Task ID: ${args.taskId}
Updated fields: ${updatedFields}

The changes have been saved.`;
  },
});

/**
 * List events in a date range
 * Voice: "What events do I have this week?" or "Show my calendar for tomorrow"
 */
export const listEvents = createTool({
  description: "List calendar events in a specified date range. Returns events with their details including time, location, and description.",
  
  args: z.object({
    timeRange: z.enum(["today", "tomorrow", "week", "month", "custom"]).default("today").describe("Time range to query"),
    startDate: z.string().optional().describe("Start date for custom range (ISO format)"),
    endDate: z.string().optional().describe("End date for custom range (ISO format)"),
    status: z.enum(["confirmed", "tentative", "cancelled", "all"]).default("all").describe("Filter by event status"),
  }),
  
  handler: async (ctx, args): Promise<string> => {
    console.log(`[listEvents] Listing events for: ${args.timeRange}`);

    // Get userId from context if available (for evaluation)
    const userId = (ctx as any).evaluationUserId;

    // Calculate date range
    let start: number;
    let end: number;
    const now = Date.now();

    if (args.timeRange === "today") {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      start = d.getTime();
      end = start + 24 * 60 * 60 * 1000 - 1;
    } else if (args.timeRange === "tomorrow") {
      const d = new Date(now + 24 * 60 * 60 * 1000);
      d.setHours(0, 0, 0, 0);
      start = d.getTime();
      end = start + 24 * 60 * 60 * 1000 - 1;
    } else if (args.timeRange === "week") {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      start = d.getTime();
      end = start + 7 * 24 * 60 * 60 * 1000 - 1;
    } else if (args.timeRange === "month") {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      start = d.getTime();
      end = start + 30 * 24 * 60 * 60 * 1000 - 1;
    } else {
      // Custom range
      start = args.startDate ? new Date(args.startDate).getTime() : now;
      end = args.endDate ? new Date(args.endDate).getTime() : start + 24 * 60 * 60 * 1000;
    }

    // Get events in range
    let events = await ctx.runQuery(api.events.listEventsInRange, {
      start,
      end,
      userId, // Pass userId for evaluation
    });
    
    // Filter by status if needed
    if (args.status !== "all") {
      events = events.filter((event: any) => event.status === args.status);
    }
    
    if (events.length === 0) {
      return `No events found for ${args.timeRange}.`;
    }
    
    // Format events
    const formattedEvents = events.map((event: any, idx: number) => {
      const startTime = new Date(event.startTime).toLocaleString();
      const endTime = event.endTime ? new Date(event.endTime).toLocaleString() : "No end time";
      const statusIcon = event.status === "confirmed" ? "✅" : event.status === "tentative" ? "❓" : "❌";
      
      return `${idx + 1}. ${statusIcon} "${event.title}"
   ID: ${event._id}
   Start: ${startTime}
   End: ${endTime}
   ${event.location ? `Location: ${event.location}` : ''}
   ${event.description ? `Description: ${event.description.substring(0, 100)}...` : ''}
   Status: ${event.status || 'confirmed'}`;
    }).join('\n\n');
    
    return `Found ${events.length} event(s) for ${args.timeRange}:\n\n${formattedEvents}`;
  },
});

/**
 * Create a new calendar event
 * Voice: "Schedule a meeting with the team tomorrow at 2pm"
 */
export const createEvent = createTool({
  description: "Create a new calendar event with title, time, location, and description. Returns the new event ID.",
  
  args: z.object({
    title: z.string().describe("Event title"),
    startTime: z.string().describe("Start time in ISO format or natural language"),
    endTime: z.string().optional().describe("End time in ISO format or natural language"),
    description: z.string().optional().describe("Event description"),
    location: z.string().optional().describe("Event location"),
    allDay: z.boolean().default(false).describe("Whether this is an all-day event"),
  }),
  
  handler: async (ctx, args): Promise<string> => {
    console.log(`[createEvent] Creating event: "${args.title}"`);
    
    // Parse start time
    const startTimeMs = new Date(args.startTime).getTime();
    if (isNaN(startTimeMs)) {
      return `Invalid start time format: "${args.startTime}". Please use ISO format (YYYY-MM-DDTHH:MM:SS).`;
    }
    
    // Parse end time if provided
    let endTimeMs: number | undefined;
    if (args.endTime) {
      endTimeMs = new Date(args.endTime).getTime();
      if (isNaN(endTimeMs)) {
        return `Invalid end time format: "${args.endTime}". Please use ISO format.`;
      }
    }
    
    const eventId = await ctx.runMutation(api.events.createEvent, {
      title: args.title,
      startTime: startTimeMs,
      endTime: endTimeMs,
      description: args.description,
      location: args.location,
      allDay: args.allDay,
      status: "confirmed",
    });
    
    return `Event created successfully!

Title: "${args.title}"
ID: ${eventId}
Start: ${new Date(startTimeMs).toLocaleString()}
${endTimeMs ? `End: ${new Date(endTimeMs).toLocaleString()}` : ''}
${args.location ? `Location: ${args.location}` : ''}
${args.allDay ? 'All-day event' : ''}

The event has been added to your calendar.`;
  },
});

/**
 * Get folder contents
 * Voice: "Show me what's in the Projects folder"
 */
export const getFolderContents = createTool({
  description: "Get all documents in a specific folder. Returns a list of documents with their metadata.",
  
  args: z.object({
    folderName: z.string().describe("Name of the folder to query"),
  }),
  
  handler: async (ctx, args): Promise<string> => {
    console.log(`[getFolderContents] Getting contents of folder: "${args.folderName}"`);

    // Get userId from context if available (for evaluation)
    const userId = (ctx as any).evaluationUserId;

    // Get all user folders
    const folders = await ctx.runQuery(api.folders.getUserFolders, { userId });
    
    // Find the folder by name
    const folder = folders.find((f: any) => 
      f.name.toLowerCase() === args.folderName.toLowerCase()
    );
    
    if (!folder) {
      return `Folder "${args.folderName}" not found. Available folders: ${folders.map((f: any) => f.name).join(', ')}`;
    }

    // Get folder with documents
    const folderWithDocs = await ctx.runQuery(api.folders.getFolderWithDocuments, {
      folderId: folder._id,
      userId, // Pass userId for evaluation
    });
    
    if (!folderWithDocs || !folderWithDocs.documents || folderWithDocs.documents.length === 0) {
      return `Folder "${args.folderName}" is empty.`;
    }
    
    // Format documents
    const formattedDocs = folderWithDocs.documents.map((doc: any, idx: number) => {
      const icon = doc.icon || '📄';
      const lastModified = new Date(doc.lastModified || doc._creationTime).toLocaleDateString();
      
      return `${idx + 1}. ${icon} "${doc.title}"
   ID: ${doc._id}
   Type: ${doc.documentType || 'text'}
   Last Modified: ${lastModified}`;
    }).join('\n\n');
    
    return `Folder "${args.folderName}" contains ${folderWithDocs.documents.length} document(s):

${formattedDocs}`;
  },
});

