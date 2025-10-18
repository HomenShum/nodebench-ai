import { v } from "convex/values";
import { mutation, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const ONBOARDING_AGENT_CONTEXT = `You are the CafeCorner Onboarding Assistant. Your job is to help new users understand the workspace, seed sample data, create documents, manage tasks, and explore AI capabilities. Provide step-by-step guidance using the actual product UI: mention the Documents tab, the Seed Onboarding button in the toolbar, planner modes (List, Calendar, Kanban), and the AI chat tools. When appropriate, call available tools to create or update content directly (documents, tasks, events). Always include a fallback path users can follow manually if an automated tool fails.`;

// Define onboarding content here for maintainability
const ONBOARDING_DOCS: Array<{
  title: string;
  content: any[];
}> = [
  {
    title: "Welcome to CafeCorner",
    content: [
      { type: "heading", level: 1, text: "Welcome to CafeCorner" },
      { type: "paragraph", text: "This space helps you manage documents, tasks, and events in one hub." },
      { type: "bulletListItem", text: "Create your first document" },
      { type: "bulletListItem", text: "Add a task with a due date" },
      { type: "bulletListItem", text: "Schedule an event" },
    ],
  },
  {
    title: "Nodebench AI3 Getting Started",
    content: [
      { type: "heading", level: 1, text: "Nodebench AI3 — Getting Started" },
      { type: "paragraph", text: "Follow these steps to learn where to click and how to use key features." },

      { type: "heading", level: 2, text: "1) Seed Onboarding Content" },
      { type: "bulletListItem", text: "Open the Home Hub (Documents).", children: [
        { type: "bulletListItem", text: "Use the Documents tab in the sidebar" },
        { type: "bulletListItem", text: "Confirm you are signed in" },
      ] },
      { type: "bulletListItem", text: "In the top toolbar, click 'Seed Onboarding' (sparkles icon) next to 'View'." },
      { type: "bulletListItem", text: "You’ll see a toast confirming created vs existing docs and tasks." },
      { type: "bulletListItem", text: "If the button is disabled, sign in first (required to create content)." },

      { type: "heading", level: 2, text: "2) Switch Planner Modes" },
      { type: "bulletListItem", text: "Use keyboard shortcuts: 1 = List, 2 = Calendar, 3 = Kanban." },
      { type: "bulletListItem", text: "Or use the mode selector in the Planner header if available." },

      { type: "heading", level: 2, text: "3) Create a Task" },
      { type: "bulletListItem", text: "Click 'New Task' in the top toolbar to open the modal.", children: [
        { type: "bulletListItem", text: "Use keyboard: N to focus the form (if available)" },
        { type: "bulletListItem", text: "Esc to cancel" },
      ] },
      { type: "bulletListItem", text: "Fill Title, Due date, Priority. Press Enter or Ctrl/Cmd+Enter to save.", children: [
        { type: "bulletListItem", text: "Set Priority: High for urgent items" },
      ] },
      { type: "bulletListItem", text: "Switch to Kanban (press 3) to drag tasks between lanes." },
      { type: "bulletListItem", text: "Lane menu: Click 'Rebalance' in a lane header to normalize task order." },

      { type: "heading", level: 2, text: "4) Add an Event (Calendar/Kanban)" },
      { type: "bulletListItem", text: "Switch to Calendar (press 2) or Kanban (press 3)." },
      { type: "bulletListItem", text: "Click 'Add Event' in the top toolbar to open the inline dialog." },
      { type: "bulletListItem", text: "Adjust Title and Time (All-day optional), then press Enter to add." },
      { type: "bulletListItem", text: "Note: 'Add Event' only appears in Calendar/Kanban modes (not in List)." },

      { type: "heading", level: 2, text: "5) Documents & Favorites" },
      { type: "bulletListItem", text: "Click any document card to open it." },
      { type: "bulletListItem", text: "Click the star icon (top-right of a document card) to favorite/unfavorite. Press 'F' or use the Favorites filter/tab to view pinned docs." },
      { type: "bulletListItem", text: "Use the Files tab to view uploads and generated files (e.g., CSVs)." },

      { type: "heading", level: 2, text: "6) View Options" },
      { type: "bulletListItem", text: "Click the 'View' button (sliders icon) in the top-right toolbar." },
      { type: "bulletListItem", text: "Toggle Density (Comfortable/Compact) and 'Show This Week' in Agenda." },

      { type: "heading", level: 2, text: "7) AI Tools" },
      { type: "bulletListItem", text: "Open the AI bar in Planner to chat or run tools (if enabled)." },
      { type: "bulletListItem", text: "Compile AAPL Model: Use the Tools action to generate a CSV and memo." },
      { type: "bulletListItem", text: "CSV AI Workflow: From a CSV file document card, open its actions menu and run the workflow." },

      { type: "heading", level: 2, text: "8) Shortcuts & Tips" },
      { type: "bulletListItem", text: "Shortcuts: 1/2/3 to switch modes; F to toggle Favorites; G for Grid (if available)." },
      { type: "bulletListItem", text: "Dialogs: Enter = submit; ESC = close; Ctrl/Cmd+Enter = submit." },
      { type: "bulletListItem", text: "Auth: Creating tasks/events requires signing in. Preferences save to your account when signed in." },
    ],
  },
];

const ONBOARDING_TASKS: Array<{
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "done" | "blocked";
  priority?: "low" | "medium" | "high" | "urgent";
  dueInDays?: number; // Optional relative due date
}> = [
  {
    title: "Create your first document",
    description: "Open Documents and click New to create a note.",
    status: "todo",
    priority: "medium",
    dueInDays: 3,
  },
  {
    title: "Read: Nodebench AI3 Getting Started",
    description: "Open the 'Nodebench AI3 Getting Started' doc from your Home Hub and follow steps 1–8.",
    status: "todo",
    priority: "medium",
    dueInDays: 1,
  },
  {
    title: "Add your first task",
    description: "Use the New Task button in the Home Hub.",
    status: "todo",
    priority: "high",
    dueInDays: 2,
  },
  {
    title: "Schedule an event",
    description: "Try the Add Event flow in Calendar/Kanban modes.",
    status: "todo",
    priority: "low",
    dueInDays: 5,
  },
];

export const seedOnboardingContent = mutation({
  args: {},
  returns: v.object({
    createdDocuments: v.number(),
    existingDocuments: v.number(),
    createdTasks: v.number(),
    existingTasks: v.number(),
    documentIds: v.array(v.id("documents")),
    taskIds: v.array(v.id("tasks")),
  }),
  handler: async (ctx) => {
    const rawUserId = await getAuthUserId(ctx);
    if (!rawUserId) throw new Error("Not authenticated");
    const userId = rawUserId as Id<"users">;

    // Helper: case-insensitive title equality
    const eqIgnoreCase = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

    // Seed Documents (check only user's own docs)
    let createdDocuments = 0;
    let existingDocuments = 0;
    const documentIds: Array<Id<"documents">> = [];

    // Preload user's non-archived docs once to avoid N queries
    const userDocs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .collect();

    for (const doc of ONBOARDING_DOCS) {
      const found = userDocs.find((d) => eqIgnoreCase(d.title || "", doc.title));
      if (found) {
        existingDocuments += 1;
        documentIds.push(found._id);
        continue;
      }
      // Reuse existing creation logic to build editor JSON
      const newId = (await ctx.runMutation(api.documents.create, {
        title: doc.title,
        content: doc.content,
      })) as Id<"documents">;
      createdDocuments += 1;
      documentIds.push(newId);
    }

    // Seed Tasks (check only user's tasks by title)
    let createdTasks = 0;
    let existingTasks = 0;
    const taskIds: Array<Id<"tasks">> = [];

    const userTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    const now = Date.now();

    for (const t of ONBOARDING_TASKS) {
      const found = userTasks.find((row) => eqIgnoreCase(row.title || "", t.title));
      if (found) {
        existingTasks += 1;
        taskIds.push(found._id);
        continue;
      }
      const dueDate = typeof t.dueInDays === "number" ? now + t.dueInDays * 24 * 60 * 60 * 1000 : undefined;
      const newTaskId = (await ctx.runMutation(api.tasks.createTask, {
        title: t.title,
        description: t.description,
        status: t.status ?? "todo",
        priority: t.priority,
        dueDate,
      })) as Id<"tasks">;
      createdTasks += 1;
      taskIds.push(newTaskId);
    }

    return {
      createdDocuments,
      existingDocuments,
      createdTasks,
      existingTasks,
      documentIds,
      taskIds,
    };
  },
});

export const askOnboardingAssistant = action({
  args: {
    message: v.string(),
    threadId: v.optional(v.string()),
  },
  returns: v.object({
    response: v.string(),
    toolsCalled: v.array(v.string()),
    threadId: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const context = args.threadId ? undefined : ONBOARDING_AGENT_CONTEXT;

    const result = await ctx.runAction(internal.fastAgentPanelStreaming.sendMessageInternal, {
      message: args.message,
      threadId: args.threadId,
      userId,
      useCoordinator: true,
      context,
    });

    return result;
  },
});


export const ensureSeedOnLogin = mutation({
  args: {},
  returns: v.object({
    seeded: v.boolean(),
    createdDocuments: v.number(),
    createdTasks: v.number(),
  }),
  handler: async (ctx) => {
    const rawUserId = await getAuthUserId(ctx);
    if (!rawUserId) throw new Error("Not authenticated");
    const userId = rawUserId as Id<"users">;

    // Check if we've already seeded onboarding for this user
    const existingPrefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingPrefs && (existingPrefs as any).onboardingSeededAt) {
      return { seeded: false, createdDocuments: 0, createdTasks: 0 } as const;
    }

    // Seed onboarding content
    const result: {
      createdDocuments: number;
      existingDocuments: number;
      createdTasks: number;
      existingTasks: number;
      documentIds: Id<"documents">[];
      taskIds: Id<"tasks">[];
    } = await ctx.runMutation(api.onboarding.seedOnboardingContent, {});

    // Mark as seeded in user preferences
    const now = Date.now();
    if (existingPrefs) {
      await ctx.db.patch(existingPrefs._id, {
        onboardingSeededAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        onboardingSeededAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      seeded: true,
      createdDocuments: (result as any).createdDocuments ?? 0,
      createdTasks: (result as any).createdTasks ?? 0,
    } as const;
  },
});
