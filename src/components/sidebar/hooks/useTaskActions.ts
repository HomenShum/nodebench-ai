import { useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";

/**
 * Custom hook for task operations
 * Handles task CRUD and related actions
 */
export function useTaskActions() {
    // Get current user
    const user = useQuery(api.domains.auth.auth.loggedInUser);

    // Mutations
    const createTaskMutation = useMutation(api.domains.tasks.userEvents.createTask);
    const updateTaskMutation = useMutation(api.domains.tasks.userEvents.updateTask);

    // Create Task Handler
    const handleCreateTask = useCallback(async (onSuccess?: (taskId: Id<"tasks">) => void) => {
        try {
            if (!user) {
                toast.error("Please sign in to create tasks");
                return;
            }
            const newId = await createTaskMutation({ title: "New Task" });
            onSuccess?.(newId);
            toast.success("Task created");
            return newId;
        } catch (e) {
            console.error(e);
            toast.error("Failed to create task");
        }
    }, [createTaskMutation, user]);

    // Open Task Editor Handler
    const handleOpenTask = useCallback((taskId: Id<"tasks">, setTaskPanelTaskId: (id: Id<"tasks"> | null) => void) => {
        setTaskPanelTaskId(taskId);
    }, []);

    return {
        // Mutations
        createTaskMutation,
        updateTaskMutation,

        // Handlers
        handleCreateTask,
        handleOpenTask,

        // Data
        user,
    };
}
