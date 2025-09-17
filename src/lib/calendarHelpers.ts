// Calendar helper utilities moved from CalendarView.tsx
import type { Id } from "../../convex/_generated/dataModel";

// ============ DATE UTILITY FUNCTIONS (internal) ============
const formatFullDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// ============ ENHANCED CALENDAR CONTENT (Simple Array Format) ============
const generateEnhancedCalendarContent = (customSuffix?: string) => {
  const now = new Date();
  const currentMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const shortMonth = now.toLocaleDateString('en-US', { month: 'long' });
  const todayLong = formatFullDate(now);

  const content = [
    // Header
    { type: 'heading', level: 1, text: `📅 ${currentMonth} Calendar${customSuffix ? ` - ${customSuffix}` : ''}` },
    { type: 'paragraph', text: `💡 *Quick Nav: Ctrl+Alt+T to jump to top | Add today's notes below*` },
    { type: 'paragraph', text: '---' },

    // Today Section (clean patch-note style)
    { type: 'heading', level: 2, text: `📍 ${todayLong}` },
    { type: 'heading', level: 3, text: "Today's Focus" },
    { type: 'checkListItem', text: '🌅 **Morning:** Add your morning routine & setup', checked: false },
    { type: 'checkListItem', text: '🎯 **Priority:** Most important task(s)', checked: false },
    { type: 'checkListItem', text: '📋 **Tasks:** Break down objectives', checked: false, children: [
      { type: 'bulletListItem', text: 'Define 3 sub-tasks' },
      { type: 'bulletListItem', text: 'Estimate time for each' },
      { type: 'bulletListItem', text: 'Assign priorities' },
    ] },
    { type: 'checkListItem', text: '⚡ **Quick wins:** Small tasks to build momentum', checked: false },
    { type: 'checkListItem', text: '🌆 **Evening:** Reflect & plan tomorrow', checked: false },
    { type: 'paragraph', text: '---' },

    // This Week
    { type: 'heading', level: 2, text: `📋 This Week (${shortMonth})` },
    { type: 'heading', level: 3, text: 'Key Deliverables' },
    { type: 'checkListItem', text: 'Add your weekly goals here', checked: false },
    { type: 'checkListItem', text: 'Break down major projects', checked: false },
    { type: 'checkListItem', text: 'Set deadlines and priorities', checked: false },
    { type: 'heading', level: 3, text: 'Schedule' },
    { type: 'paragraph', text: '**This Week:**' },
    { type: 'bulletListItem', text: 'Add your weekly schedule here', children: [
      { type: 'bulletListItem', text: 'Mon–Fri: Deep work blocks' },
      { type: 'bulletListItem', text: 'Tue/Thu: Meetings' },
    ] },
    { type: 'bulletListItem', text: 'Use time blocks for focused work' },
    { type: 'paragraph', text: '---' },

    // Active Projects
    { type: 'heading', level: 2, text: '🎯 Active Projects' },
    { type: 'paragraph', text: '**In Progress:**' },
    { type: 'bulletListItem', text: '🚧 Add your active projects here', children: [
      { type: 'bulletListItem', text: 'Project A: milestones' },
      { type: 'bulletListItem', text: 'Project B: blockers' },
    ] },
    { type: 'paragraph', text: '---' },

    // Recurring Commitments
    { type: 'heading', level: 2, text: '💪 Recurring Commitments' },
    { type: 'heading', level: 3, text: 'Daily' },
    { type: 'checkListItem', text: '🍳 **Morning:** Healthy breakfast routine', checked: false },
    { type: 'checkListItem', text: 'Add your daily habits and rituals', checked: false },
    { type: 'paragraph', text: '---' },

    // Carry-Forward Items
    { type: 'heading', level: 2, text: '📝 Carry-Forward Items' },
    { type: 'checkListItem', text: 'Items that need attention', checked: false },
    { type: 'checkListItem', text: 'Tasks moved from previous days', checked: false },
    { type: 'checkListItem', text: 'Follow-ups and reminders', checked: false },
    { type: 'paragraph', text: '---' },

    // Tags & Symbols
    { type: 'heading', level: 2, text: '🏷️ Tags & Symbols' },
    { type: 'paragraph', text: '💡 **Quick Reference:**' },
    { type: 'bulletListItem', text: '✅ Complete | 🚧 In Progress | 🔄 Recurring' },
    { type: 'bulletListItem', text: '🔥 Urgent | ⭐ Important | 💡 Idea' },
    { type: 'bulletListItem', text: '📅 Scheduled | 💸 Financial | 🍳 Health' },
    { type: 'paragraph', text: '---' },
    { type: 'paragraph', text: `*Last updated: ${todayLong}*` },
  ];

  return content;
};

// Main function to create calendar document
// If prosemirrorDoc is provided and has type: "doc", it will be used directly as the initial snapshot.
// Otherwise, we generate a simple array of blocks and let the server normalize to ProseMirror.
export const createCalendarDocument = async (
  createWithSnapshot: (args: { title: string; initialContent?: any; parentId?: Id<"documents"> }) => Promise<Id<"documents">>,
  customSuffix?: string,
  prosemirrorDoc?: any,
): Promise<Id<"documents">> => {
  const now = new Date();
  const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const title = customSuffix ? `📅 ${monthYear} - ${customSuffix}` : `📅 ${monthYear} Calendar`;

  try {
    let initialContent: unknown;
    if (prosemirrorDoc && typeof prosemirrorDoc === 'object' && !Array.isArray(prosemirrorDoc) && prosemirrorDoc.type === 'doc') {
      // Use caller-provided ProseMirror JSON directly
      initialContent = prosemirrorDoc;
    } else {
      // Generate content in simple array format (will be normalized server-side)
      initialContent = generateEnhancedCalendarContent(customSuffix);
    }

    // Create document via server-side PM snapshot creation
    const docId = await createWithSnapshot({
      title,
      initialContent,
    });

    return docId;
  } catch (error) {
    console.error('Failed to create calendar document:', error);

    // Fallback to minimal calendar
    const fallbackContent = [
      { type: 'heading', level: 1, text: title },
      { type: 'paragraph', text: `*Created: ${now.toLocaleDateString()}*` },
      { type: 'paragraph', text: '---' },
      { type: 'heading', level: 2, text: '📅 Today' },
      { type: 'checkListItem', text: 'Add your tasks here', checked: false },
      { type: 'paragraph', text: '---' },
      { type: 'heading', level: 2, text: '📝 Notes' },
      { type: 'paragraph', text: 'Add your notes here' },
    ];

    return await createWithSnapshot({
      title,
      initialContent: fallbackContent,
    });
  }
};

// Helper functions
export const addDayToCalendar = (existingContent: any[], date: Date = new Date()) => {
  const dayHeader = formatFullDate(date);

  const newDayContent = [
    { type: 'paragraph', text: '---' },
    { type: 'heading', level: 2, text: `📍 ${dayHeader}` },
    { type: 'checkListItem', text: '🌅 **Morning:** Start the day right', checked: false },
    { type: 'checkListItem', text: '🎯 **Priority:** Main focus for today', checked: false },
    { type: 'checkListItem', text: '📋 **Tasks:** What needs to get done', checked: false },
    { type: 'checkListItem', text: '🌙 **Evening:** Wind down and reflect', checked: false },
  ];

  const todayIndex = existingContent.findIndex(
    (block) => block.type === 'heading' && block.text?.includes('TODAY:'),
  );

  if (todayIndex !== -1) {
    existingContent.splice(todayIndex + 1, 0, ...newDayContent);
  } else {
    existingContent.unshift(...newDayContent);
  }

  return existingContent;
};

export const generateWeeklySummary = (calendarContent: any[]) => {
  const completedTasks = calendarContent.filter(
    (block) => block.type === 'checkListItem' && block.checked === true,
  );

  const summary = {
    totalCompleted: completedTasks.length,
    categories: {
      morning: completedTasks.filter((t) => t.text?.includes('Morning')).length,
      priority: completedTasks.filter((t) => t.text?.includes('Priority')).length,
      tasks: completedTasks.filter((t) => t.text?.includes('Tasks')).length,
      evening: completedTasks.filter((t) => t.text?.includes('Evening')).length,
    },
  };

  return summary;
};
