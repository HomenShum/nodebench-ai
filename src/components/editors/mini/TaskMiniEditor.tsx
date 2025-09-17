import React from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import InlineTaskEditor from "../../agenda/InlineTaskEditor";

export default function TaskMiniEditor({ taskId, onClose }: { taskId: Id<"tasks">; onClose: () => void }) {
  return (
    <InlineTaskEditor taskId={taskId} onClose={onClose} />
  );
}
