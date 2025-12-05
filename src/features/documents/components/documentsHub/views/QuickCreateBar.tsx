/**
 * QuickCreateBar Component
 * 
 * Provides quick inline creation for tasks and events.
 */

import { useState, useCallback } from "react";
import { Plus, Calendar } from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export interface QuickCreateBarProps {
    /** Whether the user is logged in */
    isLoggedIn: boolean;
    /** Callback to create a task */
    onCreateTask: (title: string, dueDate?: number) => Promise<void>;
    /** Callback to create an event */
    onCreateEvent: (title: string, startTime: number, endTime: number) => Promise<void>;
    /** Whether to show the event creation form */
    showEventCreate?: boolean;
    /** Custom class name */
    className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDateTimeLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day}T${hh}:${mm}`;
}

function roundedNow15(): string {
    const d = new Date();
    d.setSeconds(0, 0);
    const mins = d.getMinutes();
    const rounded = Math.ceil(mins / 15) * 15;
    d.setMinutes(rounded >= 60 ? 0 : rounded, 0, 0);
    if (rounded >= 60) {
        d.setHours(d.getHours() + 1);
    }
    return formatDateTimeLocal(d);
}

// ============================================================================
// Component
// ============================================================================

export function QuickCreateBar({
    isLoggedIn,
    onCreateTask,
    onCreateEvent,
    showEventCreate = true,
    className = "",
}: QuickCreateBarProps) {
    // Task state
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [isCreatingTask, setIsCreatingTask] = useState(false);

    // Event state
    const [newEventTitle, setNewEventTitle] = useState("");
    const [newEventStart, setNewEventStart] = useState(() => roundedNow15());
    const [newEventEnd, setNewEventEnd] = useState("");
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);

    const handleCreateTask = useCallback(async () => {
        const title = newTaskTitle.trim();
        if (!title) return;

        if (!isLoggedIn) {
            toast.error("Please sign in to create tasks.");
            return;
        }

        setIsCreatingTask(true);
        try {
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            await onCreateTask(title, endOfDay.getTime());
            setNewTaskTitle("");
        } catch (err) {
            toast.error("Failed to create task");
            console.error(err);
        } finally {
            setIsCreatingTask(false);
        }
    }, [newTaskTitle, isLoggedIn, onCreateTask]);

    const handleCreateEvent = useCallback(async () => {
        const title = newEventTitle.trim();
        if (!title || !newEventStart) return;

        if (!isLoggedIn) {
            toast.error("Please sign in to create events.");
            return;
        }

        const startTime = new Date(newEventStart).getTime();
        let endTime = newEventEnd
            ? new Date(newEventEnd).getTime()
            : startTime + 60 * 60 * 1000; // Default 1 hour

        if (endTime < startTime) {
            toast.error("End time must be after start time");
            return;
        }

        setIsCreatingEvent(true);
        try {
            await onCreateEvent(title, startTime, endTime);
            setNewEventTitle("");
            setNewEventStart(roundedNow15());
            setNewEventEnd("");
        } catch (err) {
            toast.error("Failed to create event");
            console.error(err);
        } finally {
            setIsCreatingEvent(false);
        }
    }, [newEventTitle, newEventStart, newEventEnd, isLoggedIn, onCreateEvent]);

    return (
        <div className={`space-y-2 ${className}`}>
            {/* Quick task input */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)]">
                <Plus className="h-4 w-4 text-[var(--accent-primary)]" />
                <input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            void handleCreateTask();
                        }
                    }}
                    placeholder="Quick add a task…"
                    className="w-full bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                    disabled={isCreatingTask}
                />
                <button
                    onClick={() => void handleCreateTask()}
                    className="px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded-md hover:opacity-90 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:opacity-50"
                    title="Add task"
                    disabled={!isLoggedIn || isCreatingTask || !newTaskTitle.trim()}
                >
                    {isCreatingTask ? "..." : "Add"}
                </button>
            </div>

            {/* Quick event input */}
            {showEventCreate && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] flex-1 min-w-0">
                        <Calendar className="h-4 w-4 text-[var(--accent-primary)]" />
                        <input
                            value={newEventTitle}
                            onChange={(e) => setNewEventTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    void handleCreateEvent();
                                }
                            }}
                            placeholder="Quick add an event…"
                            className="w-full bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                            disabled={isCreatingEvent}
                        />
                    </div>

                    <input
                        type="datetime-local"
                        value={newEventStart}
                        onChange={(e) => {
                            const v = e.target.value;
                            setNewEventStart(v);
                            if (!newEventEnd) {
                                const t = new Date(v);
                                if (!Number.isNaN(t.getTime())) {
                                    const end = new Date(t.getTime() + 60 * 60 * 1000);
                                    setNewEventEnd(formatDateTimeLocal(end));
                                }
                            }
                        }}
                        className="px-2 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)]"
                        aria-label="Event start"
                        disabled={isCreatingEvent}
                    />

                    <input
                        type="datetime-local"
                        value={newEventEnd}
                        onChange={(e) => setNewEventEnd(e.target.value)}
                        className="px-2 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)]"
                        aria-label="Event end"
                        disabled={isCreatingEvent}
                    />

                    <button
                        onClick={() => void handleCreateEvent()}
                        className="px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded-md hover:opacity-90 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:opacity-50 whitespace-nowrap"
                        title="Add event"
                        disabled={
                            !isLoggedIn ||
                            isCreatingEvent ||
                            !newEventTitle.trim() ||
                            !newEventStart ||
                            (!!newEventEnd &&
                                new Date(newEventEnd).getTime() < new Date(newEventStart).getTime())
                        }
                    >
                        {isCreatingEvent ? "..." : "Add Event"}
                    </button>
                </div>
            )}
        </div>
    );
}
