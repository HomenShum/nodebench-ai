/**
 * Status Helper Functions
 * 
 * Utility functions for handling task, event, and document statuses
 */

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

/**
 * Get CSS classes for task status chips
 */
export const statusChipClasses = (s?: string) => {
  switch (s) {
    case "in_progress":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "done":
      return "bg-green-100 text-green-700 border-green-200";
    case "blocked":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

/**
 * Get human-readable label for task status
 */
export const statusLabel = (s?: string) => {
  switch (s) {
    case "in_progress":
      return "In Progress";
    case "done":
      return "Done";
    case "blocked":
      return "Blocked";
    case "todo":
      return "To Do";
    default:
      return "Unknown";
  }
};

/**
 * Type guard for task status
 */
export const isTaskStatus = (v: string): v is TaskStatus =>
  v === "todo" || v === "in_progress" || v === "done" || v === "blocked";

/**
 * Get CSS classes for event status bar
 */
export const eventStatusBar = (s?: string) => {
  switch (s) {
    case "confirmed":
      return "bg-green-500";
    case "tentative":
      return "bg-yellow-500";
    case "cancelled":
      return "bg-red-500";
    default:
      return "bg-blue-500";
  }
};

/**
 * Get CSS classes for kanban status bar
 */
export const kanbanStatusBar = (s?: string) => {
  switch (s) {
    case "todo":
      return "bg-gray-400";
    case "in_progress":
      return "bg-blue-500";
    case "done":
      return "bg-green-500";
    case "blocked":
      return "bg-red-500";
    default:
      return "bg-gray-300";
  }
};

/**
 * Get CSS classes for priority levels
 */
export const priorityClasses = (p?: string) => {
  switch ((p || "").toLowerCase()) {
    case "low":
      return "bg-gray-100 text-gray-600 border-gray-200";
    case "medium":
      return "bg-blue-100 text-blue-600 border-blue-200";
    case "high":
      return "bg-orange-100 text-orange-600 border-orange-200";
    case "urgent":
      return "bg-red-100 text-red-600 border-red-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

