// convex/tools/context/nodebenchContextTools.ts
// Nodebench-specific context tools for accessing real user data
// These tools ground the agent in actual Nodebench data instead of hallucinating

import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { api } from "../../_generated/api";

/**
 * Get the user's daily brief/morning digest
 * 
 * This tool retrieves REAL data from the dailyBriefMemories table.
 * If no brief exists for the requested date, it returns a clear message
 * instead of generating fake content.
 */
export const getDailyBrief = createTool({
    description: `Get the user's daily brief/morning digest for a specific date. 
  
Returns the ACTUAL daily brief content from the Nodebench database.
If no brief exists for the requested date, returns a clear message indicating this.
Use this tool when the user asks about:
- "today's brief"
- "morning digest" 
- "daily summary"
- "what's happening today"
- "news digest"

NEVER hallucinate or generate fake brief content. Only return real data from this tool.`,

    args: z.object({
        date: z.string().optional().describe(
            "Date in YYYY-MM-DD format. Defaults to today if not provided."
        ),
    }),

    handler: async (ctx, args): Promise<string> => {
        console.log(`[getDailyBrief] Fetching daily brief for: ${args.date || 'today'}`);

        try {
            // Calculate the date string
            const dateString = args.date || new Date().toISOString().split('T')[0];

            // Try to get brief for specific date first
            let brief: any = await ctx.runQuery(
                api.domains.research.dailyBriefMemoryQueries.getMemoryByDateString,
                { dateString }
            );

            // If no brief for specific date, try getting latest
            if (!brief && !args.date) {
                brief = await ctx.runQuery(
                    api.domains.research.dailyBriefMemoryQueries.getLatestMemory,
                    {}
                );
            }

            if (!brief) {
                return `No daily brief found for ${dateString}.

The daily brief system generates summaries based on:
- Your tracked news feeds and topics
- Calendar events for the day
- Task deadlines approaching
- Research dossier updates

A brief may not exist because:
1. No brief has been generated yet for this date
2. The morning brief job hasn't run today
3. You haven't configured any tracked topics

You can ask me to help you set up tracked topics or check your research feeds.`;
            }

            const results: any[] = await ctx.runQuery(
                api.domains.research.dailyBriefMemoryQueries.listTaskResultsByMemory,
                { memoryId: brief._id }
            );

            const resultsByTaskId = new Map<string, any>();
            (results ?? []).forEach((r: any) => {
                if (!r?.taskId) return;
                // listTaskResultsByMemory orders desc, so the first result per taskId is the latest
                if (!resultsByTaskId.has(r.taskId)) resultsByTaskId.set(r.taskId, r);
            });

            const features: any[] = Array.isArray(brief.features) ? brief.features : [];
            const passingCount = features.filter((f) => f?.status === "passing").length;
            const failingCount = features.filter((f) => f?.status === "failing").length;
            const pendingCount = features.filter(
                (f) => f?.status === "pending" || f?.status == null,
            ).length;

            // Format the brief content (real DB-backed, no hallucinated summary fields)
            const generatedAtIso = new Date(brief.generatedAt).toISOString();

            let response = `📰 **Daily Brief for ${brief.dateString}**\n`;
            response += `Generated (UTC): ${generatedAtIso}\n`;
            response += `Version: ${brief.version}\n\n`;
            response += `**Goal:** ${brief.goal}\n\n`;
            response += `**Progress:** ${passingCount} passing / ${failingCount} failing / ${pendingCount} pending\n\n`;

            if (features.length === 0) {
                response += `No tasks were generated for this brief.`;
                return response;
            }

            const ordered = features
                .slice()
                .sort((a, b) => (a?.priority ?? 999) - (b?.priority ?? 999));

            response += `---\n`;

            for (const f of ordered) {
                const taskId = f?.id ?? "";
                const title = f?.name ?? taskId;
                const status = f?.status ?? "pending";
                const type = f?.type ?? "";
                const notes = typeof f?.notes === "string" ? f.notes : "";
                const result = resultsByTaskId.get(taskId);
                const resultMarkdown = typeof result?.resultMarkdown === "string" ? result.resultMarkdown : "";

                response += `### ${taskId} — ${title}\n`;
                response += `- Status: ${status}\n`;
                if (type) response += `- Type: ${type}\n`;
                if (typeof f?.testCriteria === "string" && f.testCriteria.trim()) {
                    response += `- Criteria: ${f.testCriteria.trim()}\n`;
                }
                if (notes) response += `- Notes: ${notes}\n`;
                response += `\n`;

                if (resultMarkdown) {
                    response += `${resultMarkdown}\n\n`;
                } else if (status === "pending") {
                    response += `Result not generated yet.\n\n`;
                } else if (status === "failing") {
                    response += `No usable result yet (last attempt failed validation).\n\n`;
                } else {
                    response += `No stored result found.\n\n`;
                }
            }

            return response.trim();
        } catch (error) {
            console.error('[getDailyBrief] Error:', error);
            return `Error retrieving daily brief: ${error instanceof Error ? error.message : 'Unknown error'}. 

The brief query failed. This might be due to:
- Database connectivity issues
- Missing table indexes
- Permission issues

Please try again or check the system logs.`;
        }
    },
});

/**
 * Get current user context including settings, preferences, and calendar summary
 */
export const getUserContext = createTool({
    description: `Get the user's current context including settings, preferences, today's calendar events, and pending tasks.
  
This provides a comprehensive snapshot of the user's current state in Nodebench.
Use this tool when you need to understand:
- User preferences for responses
- Today's schedule overview  
- Urgent tasks or deadlines
- User's tracked topics and interests

The context helps you provide personalized, relevant responses.`,

    args: z.object({}),

    handler: async (ctx, args): Promise<string> => {
        console.log(`[getUserContext] Fetching user context`);

        try {
            // Get today's date info
            const now = new Date();
            const today = now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const currentTime = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
            });

            let response = `📋 **User Context Snapshot**
Date: ${today}
Time: ${currentTime}

`;

            // Get today's agenda (events + tasks) using the unified calendar query
            try {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const todayEnd = new Date();
                todayEnd.setHours(23, 59, 59, 999);

                const agenda: any = await ctx.runQuery(
                    api.domains.calendar.calendar.listAgendaInRange,
                    {
                        start: todayStart.getTime(),
                        end: todayEnd.getTime()
                    }
                );

                // Display events
                if (agenda?.events && agenda.events.length > 0) {
                    response += `📅 **Today's Calendar** (${agenda.events.length} events):\n`;
                    const sortedEvents = agenda.events.slice(0, 5).map((evt: any) => {
                        const start = evt.startTime
                            ? new Date(evt.startTime).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })
                            : 'All day';
                        return `  • ${start} - ${evt.title || 'Untitled event'}`;
                    });
                    response += sortedEvents.join('\n');
                    if (agenda.events.length > 5) {
                        response += `\n  ... and ${agenda.events.length - 5} more events`;
                    }
                    response += '\n\n';
                } else {
                    response += `📅 **Today's Calendar**: No events scheduled\n\n`;
                }

                // Display tasks from the same agenda query
                if (agenda?.tasks && agenda.tasks.length > 0) {
                    response += `✅ **Today's Tasks** (${agenda.tasks.length}):\n`;
                    response += agenda.tasks.slice(0, 5).map((task: any) => {
                        const dueInfo = task.dueDate
                            ? ` (due: ${new Date(task.dueDate).toLocaleDateString()})`
                            : '';
                        return `  • ${task.title || 'Untitled task'}${dueInfo}`;
                    }).join('\n');
                    if (agenda.tasks.length > 5) {
                        response += `\n  ... and ${agenda.tasks.length - 5} more tasks`;
                    }
                    response += '\n\n';
                } else {
                    response += `✅ **Today's Tasks**: None scheduled\n\n`;
                }
            } catch (agendaError) {
                console.warn('[getUserContext] Agenda fetch failed:', agendaError);
                response += `📅 **Today's Calendar**: Unable to fetch\n`;
                response += `✅ **Today's Tasks**: Unable to fetch\n\n`;
            }

            return response;
        } catch (error) {
            console.error('[getUserContext] Error:', error);
            return `Error retrieving user context: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    },
});

/**
 * Get the current system date and time
 * Provides temporal awareness for the agent
 */
export const getSystemDateTime = createTool({
    description: `Get the current system date, time, and timezone.
  
Use this when you need to:
- Know what day/date it is
- Calculate relative times ("yesterday", "next week")
- Understand temporal context for user requests
- Provide time-aware responses

This ensures your responses are temporally accurate.`,

    args: z.object({}),

    handler: async (ctx, args): Promise<string> => {
        const now = new Date();

        return JSON.stringify({
            iso: now.toISOString(),
            date: now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            time: now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
            }),
            timestamp: now.getTime(),
            dayOfWeek: now.getDay(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }, null, 2);
    },
});
