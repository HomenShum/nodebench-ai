import { query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { parseDocumentMetadata, metadataToEventLike, metadataToTaskLike } from "./documentMetadataParser";

type AgendaResult = { events: any[]; tasks: any[]; holidays: any[]; notes: any[] };

export const listAgendaInRange = query({
  args: {
    start: v.number(),
    end: v.number(),
    country: v.optional(v.string()),
    holidaysStartUtc: v.optional(v.number()),
    holidaysEndUtc: v.optional(v.number()),
  },
  returns: v.object({
    events: v.array(v.any()),
    tasks: v.array(v.any()),
    holidays: v.array(v.any()),
    notes: v.array(v.any()),
  }),
  handler: async (ctx, args): Promise<AgendaResult> => {
    const country: string = args.country ?? "US";

    // Fetch documents tagged as events and tasks
    const [eventDocs, taskDocs, holidays, notes]: [any[], any[], any[], any[]] = await Promise.all([
      ctx.runQuery(api.documents.listDocumentsByTag, { tag: "event" }),
      ctx.runQuery(api.documents.listDocumentsByTag, { tag: "task" }),
      ctx.runQuery((api as any).holidays.listHolidaysInRange, {
        country,
        start: args.holidaysStartUtc ?? args.start,
        end: args.holidaysEndUtc ?? args.end,
      }),
      ctx.runQuery(api.documents.listNotesInRange, { start: args.start, end: args.end }),
    ]);

    // Parse metadata from event documents and filter by date range
    const events = eventDocs
      .map(doc => {
        const metadata = parseDocumentMetadata(doc.content, doc.title);
        return metadataToEventLike(doc, metadata);
      })
      .filter(event => {
        if (!event.startTime) return false;
        // Include events that overlap with the range
        const eventEnd = event.endTime || event.startTime;
        return event.startTime <= args.end && eventEnd >= args.start;
      })
      .sort((a, b) => a.startTime - b.startTime);

    // Parse metadata from task documents and filter by date range
    const tasks = taskDocs
      .map(doc => {
        const metadata = parseDocumentMetadata(doc.content, doc.title);
        return metadataToTaskLike(doc, metadata);
      })
      .filter(task => {
        if (!task.dueDate) return false;
        return task.dueDate >= args.start && task.dueDate <= args.end;
      })
      .sort((a, b) => a.dueDate - b.dueDate);

    return { events, tasks, holidays, notes };
  },
});
