import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

/**
 * Get or create a document for an event.
 * If the event already has a documentId, return it.
 * Otherwise, create a new document and associate it with the event.
 */
export const getOrCreateEventDocument = mutation({
  args: {
    eventId: v.id("events"),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get the event
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    if (event.userId !== userId) throw new Error("Not authorized");

    // If event already has a document, return it
    if (event.documentId) {
      return event.documentId;
    }

    // Create a simple document for event notes
    // The event metadata (time, location, status) stays in the event record
    const documentId = await ctx.db.insert("documents", {
      title: `📅 ${event.title}`,
      documentType: "text",
      isPublic: false,
      createdBy: userId,
      lastEditedBy: userId,
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: event.description
              ? [{ type: "text", text: event.description }]
              : [],
          },
        ],
      }),
    });

    // Associate the document with the event
    await ctx.db.patch(args.eventId, {
      documentId,
    });

    // Add tags to mark this as an event document
    await ctx.runMutation(api.tags.addTagsToDocument, {
      documentId,
      tags: [
        { name: "event", kind: "type" },
        { name: event.title, kind: "topic" },
      ],
    });

    return documentId;
  },
});

/**
 * Get or create a document for a task.
 * If the task already has a documentId, return it.
 * Otherwise, create a new document and associate it with the task.
 */
export const getOrCreateTaskDocument = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get the task
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    if (task.userId !== userId) throw new Error("Not authorized");

    // If task already has a document, return it
    if (task.documentId) {
      return task.documentId;
    }

    // Format task metadata for document header
    const dueStr = task.dueDate ? new Date(task.dueDate).toLocaleString() : 'No due date';
    const statusEmoji = task.status === 'done' ? '✅' : task.status === 'in_progress' ? '🔄' : task.status === 'blocked' ? '🚫' : '📋';

    const metadataLines = [
      `${statusEmoji} Task: ${task.title}`,
      `📅 Due: ${dueStr}`,
      task.status ? `Status: ${task.status}` : null,
      task.priority ? `Priority: ${task.priority}` : null,
      '',
      '---',
      '',
    ].filter(Boolean);

    // Create a new document for the task with metadata header
    const documentId = await ctx.db.insert("documents", {
      title: `✓ ${task.title}`,
      documentType: "text",
      isPublic: false,
      createdBy: userId,
      lastEditedBy: userId,
      content: JSON.stringify({
        type: "doc",
        content: [
          ...metadataLines.map(line => ({
            type: "paragraph",
            content: [{ type: "text", text: line }],
          })),
          {
            type: "paragraph",
            content: task.description
              ? [{ type: "text", text: task.description }]
              : [],
          },
        ],
      }),
    });

    // Associate the document with the task
    await ctx.db.patch(args.taskId, {
      documentId,
    });

    // Add tags to mark this as a task document
    await ctx.runMutation(api.tags.addTagsToDocument, {
      documentId,
      tags: [
        { name: "task", kind: "type" },
        { name: task.title, kind: "topic" },
        task.status ? { name: task.status, kind: "status" } : null,
        task.priority ? { name: task.priority, kind: "priority" } : null,
      ].filter(Boolean) as Array<{ name: string; kind?: string }>,
    });

    return documentId;
  },
});

