import React from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import InlineEventEditor from "../../InlineEventEditor";

export default function EventMiniEditor({ eventId, onClose, documentIdForAssociation }: { eventId: Id<"events">; onClose: () => void; documentIdForAssociation?: Id<"documents"> | null }) {
  return (
    <InlineEventEditor eventId={eventId} onClose={onClose} documentIdForAssociation={documentIdForAssociation} />
  );
}
