/**
 * Re-export tags API from domains/knowledge/tags
 * This file exists for backward compatibility with frontend imports
 */
export {
  listForDocument,
  getPreviewByName,
  search,
  addTagsToDocument,
  removeTagFromDocument,
  updateTagKind,
} from "./domains/knowledge/tags";

