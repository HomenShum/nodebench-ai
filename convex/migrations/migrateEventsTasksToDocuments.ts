/**
 * Migration script to convert all existing events and tasks to documents.
 * This script:
 * 1. Finds all events and tasks without documentId
 * 2. Creates a document for each one with appropriate tags and metadata
 * 3. Links the document back to the event/task
 * 4. Marks the migration as complete
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";

export const migrateEventsToDocuments = internalMutation({
  args: {
    force: v.optional(v.boolean()),
  },
  returns: v.object({
    total: v.number(),
    migrated: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get all events
    const allEvents = await ctx.db.query("events").collect();

    let migrated = 0;
    let skipped = 0;

    for (const event of allEvents) {
      // If document exists and force is not set, only add tags if missing
      if (event.documentId && !args.force) {
        // Check if tags already exist for this document
        let eventTag = await ctx.db
          .query("tags")
          .withIndex("by_name", (q) => q.eq("name", "event"))
          .first();

        if (eventTag) {
          const existingRef = await ctx.db
            .query("tagRefs")
            .withIndex("by_tag", (q) => q.eq("tagId", eventTag!._id))
            .filter((q) => q.eq(q.field("targetId"), event.documentId))
            .first();

          if (existingRef) {
            skipped++;
            continue;
          }
        }

        // Document exists but tags are missing - add them
        if (!eventTag) {
          const eventTagId = await ctx.db.insert("tags", {
            name: "event",
            kind: "type",
            createdBy: event.userId,
            createdAt: Date.now(),
          });
          eventTag = await ctx.db.get(eventTagId);
        }

        await ctx.db.insert("tagRefs", {
          tagId: eventTag!._id,
          targetId: event.documentId,
          targetType: "documents",
          createdBy: event.userId,
          createdAt: Date.now(),
        });

        migrated++;
        continue;
      }

      try {
        // Format event metadata for document header
        const startDate = new Date(event.startTime);
        const endDate = event.endTime ? new Date(event.endTime) : null;
        const dateStr = event.allDay
          ? startDate.toLocaleDateString()
          : `${startDate.toLocaleString()}${endDate ? ` - ${endDate.toLocaleTimeString()}` : ''}`;

        // Format date for title (short format)
        const titleDateStr = event.allDay
          ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

        const metadataLines = [
          `📅 Event: ${event.title}`,
          `⏰ Time: ${dateStr}`,
          event.location ? `📍 Location: ${event.location}` : null,
          event.status ? `Status: ${event.status}` : null,
          '',
          '---',
          '',
        ].filter(Boolean);

        // Create document
        const documentId = await ctx.db.insert("documents", {
          title: `📅 ${event.title} (${titleDateStr})`,
          documentType: "text",
          isPublic: false,
          createdBy: event.userId,
          lastEditedBy: event.userId,
          content: JSON.stringify({
            type: "doc",
            content: [
              ...metadataLines.map(line => ({
                type: "paragraph",
                content: [{ type: "text", text: line }],
              })),
              {
                type: "paragraph",
                content: event.description
                  ? [{ type: "text", text: event.description }]
                  : [],
              },
            ],
          }),
        });

        // Link document to event
        await ctx.db.patch(event._id, {
          documentId,
        });

        // Add tags directly (bypass authentication for migration)
        const eventTag = await ctx.db
          .query("tags")
          .withIndex("by_name", (q) => q.eq("name", "event"))
          .first();

        const eventTagId = eventTag
          ? eventTag._id
          : await ctx.db.insert("tags", {
              name: "event",
              kind: "type",
              createdBy: event.userId,
              createdAt: Date.now(),
            });

        await ctx.db.insert("tagRefs", {
          tagId: eventTagId,
          targetId: documentId,
          targetType: "documents",
          createdBy: event.userId,
          createdAt: Date.now(),
        });

        migrated++;
      } catch (error) {
        console.error(`Failed to migrate event ${event._id}:`, error);
        skipped++;
      }
    }

    return {
      total: allEvents.length,
      migrated,
      skipped,
    };
  },
});

export const migrateTasksToDocuments = internalMutation({
  args: {
    force: v.optional(v.boolean()),
  },
  returns: v.object({
    total: v.number(),
    migrated: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get all tasks
    const allTasks = await ctx.db.query("tasks").collect();

    let migrated = 0;
    let skipped = 0;

    for (const task of allTasks) {
      // If document exists and force is not set, only add tags if missing
      if (task.documentId && !args.force) {
        // Check if tags already exist for this document
        let taskTag = await ctx.db
          .query("tags")
          .withIndex("by_name", (q) => q.eq("name", "task"))
          .first();

        if (taskTag) {
          const existingRef = await ctx.db
            .query("tagRefs")
            .withIndex("by_tag", (q) => q.eq("tagId", taskTag!._id))
            .filter((q) => q.eq(q.field("targetId"), task.documentId))
            .first();

          if (existingRef) {
            skipped++;
            continue;
          }
        }

        // Document exists but tags are missing - add them
        if (!taskTag) {
          const taskTagId = await ctx.db.insert("tags", {
            name: "task",
            kind: "type",
            createdBy: task.userId,
            createdAt: Date.now(),
          });
          taskTag = await ctx.db.get(taskTagId);
        }

        await ctx.db.insert("tagRefs", {
          tagId: taskTag!._id,
          targetId: task.documentId,
          targetType: "documents",
          createdBy: task.userId,
          createdAt: Date.now(),
        });

        migrated++;
        continue;
      }

      try {
        // Format task metadata for document header
        const dueStr = task.dueDate ? new Date(task.dueDate).toLocaleString() : 'No due date';
        const statusEmoji = task.status === 'done' ? '✅' : task.status === 'in_progress' ? '🔄' : task.status === 'blocked' ? '🚫' : '📋';

        // Format date for title (short format)
        const titleDateStr = task.dueDate
          ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'No due date';

        const metadataLines = [
          `${statusEmoji} Task: ${task.title}`,
          `📅 Due: ${dueStr}`,
          task.status ? `Status: ${task.status}` : null,
          task.priority ? `Priority: ${task.priority}` : null,
          '',
          '---',
          '',
        ].filter(Boolean);

        // Create document
        const documentId = await ctx.db.insert("documents", {
          title: `✓ ${task.title} (${titleDateStr})`,
          documentType: "text",
          isPublic: false,
          createdBy: task.userId,
          lastEditedBy: task.userId,
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

        // Link document to task
        await ctx.db.patch(task._id, {
          documentId,
        });

        // Add tags directly (bypass authentication for migration)
        const taskTag = await ctx.db
          .query("tags")
          .withIndex("by_name", (q) => q.eq("name", "task"))
          .first();

        const taskTagId = taskTag
          ? taskTag._id
          : await ctx.db.insert("tags", {
              name: "task",
              kind: "type",
              createdBy: task.userId,
              createdAt: Date.now(),
            });

        await ctx.db.insert("tagRefs", {
          tagId: taskTagId,
          targetId: documentId,
          targetType: "documents",
          createdBy: task.userId,
          createdAt: Date.now(),
        });

        migrated++;
      } catch (error) {
        console.error(`Failed to migrate task ${task._id}:`, error);
        skipped++;
      }
    }

    return {
      total: allTasks.length,
      migrated,
      skipped,
    };
  },
});

/**
 * Update existing document titles to include dates
 */
export const updateDocumentTitlesWithDates = internalMutation({
  args: {},
  returns: v.object({
    eventsUpdated: v.number(),
    tasksUpdated: v.number(),
  }),
  handler: async (ctx) => {
    let eventsUpdated = 0;
    let tasksUpdated = 0;

    // Update event documents
    const events = await ctx.db.query("events").collect();
    for (const event of events) {
      if (!event.documentId) continue;

      const doc = await ctx.db.get(event.documentId as Id<"documents">);
      if (!doc) continue;

      // Type guard to ensure we have a document
      if (!('title' in doc) || !doc.title) continue;

      // Skip if title already has date (contains parentheses)
      if (doc.title.includes('(') && doc.title.includes(')')) continue;

      const startDate = new Date(event.startTime);
      const titleDateStr = event.allDay
        ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

      await ctx.db.patch(event.documentId as Id<"documents">, {
        title: `${doc.title} (${titleDateStr})`,
      });

      eventsUpdated++;
    }

    // Update task documents
    const tasks = await ctx.db.query("tasks").collect();
    for (const task of tasks) {
      if (!task.documentId) continue;

      const doc = await ctx.db.get(task.documentId as Id<"documents">);
      if (!doc) continue;

      // Type guard to ensure we have a document
      if (!('title' in doc) || !doc.title) continue;

      // Skip if title already has date (contains parentheses)
      if (doc.title.includes('(') && doc.title.includes(')')) continue;

      const titleDateStr = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'No due date';

      await ctx.db.patch(task.documentId as Id<"documents">, {
        title: `${doc.title} (${titleDateStr})`,
      });

      tasksUpdated++;
    }

    return { eventsUpdated, tasksUpdated };
  },
});

/**
 * Run both migrations in sequence
 */
export const migrateAll = internalMutation({
  args: {},
  returns: v.object({
    events: v.object({
      total: v.number(),
      migrated: v.number(),
      skipped: v.number(),
    }),
    tasks: v.object({
      total: v.number(),
      migrated: v.number(),
      skipped: v.number(),
    }),
  }),
  handler: async (ctx): Promise<{
    events: { total: number; migrated: number; skipped: number };
    tasks: { total: number; migrated: number; skipped: number };
  }> => {
    const events: { total: number; migrated: number; skipped: number } =
      await ctx.runMutation(internal.migrations.migrateEventsTasksToDocuments.migrateEventsToDocuments, {});
    const tasks: { total: number; migrated: number; skipped: number } =
      await ctx.runMutation(internal.migrations.migrateEventsTasksToDocuments.migrateTasksToDocuments, {});

    return { events, tasks };
  },
});

