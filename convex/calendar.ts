import { query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

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

    // Fetch tasks and events using existing range queries
    const [events, tasks, holidays, notes]: [any[], any[], any[], any[]] = await Promise.all([
      ctx.runQuery(api.events.listEventsInRange, { start: args.start, end: args.end }),
      ctx.runQuery(api.tasks.listTasksDueInRange, { start: args.start, end: args.end }),
      ctx.runQuery((api as any).holidays.listHolidaysInRange, {
        country,
        start: args.holidaysStartUtc ?? args.start,
        end: args.holidaysEndUtc ?? args.end,
      }),
      ctx.runQuery(api.documents.listNotesInRange, { start: args.start, end: args.end }),
    ]);

    return { events, tasks, holidays, notes };
  },
});
