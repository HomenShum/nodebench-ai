/**
 * Document Helper Functions
 * 
 * Utility functions for handling documents
 */

import { Id } from "../../../../convex/_generated/dataModel";
import { FileType, inferFileType } from "../../../lib/fileTypes";
import { FileText, Calendar, File } from "lucide-react";

export type DocumentCardData = {
  _id: Id<"documents">;
  title: string;
  contentPreview: string | null;
  documentType: "file" | "text" | "timeline";
  fileType?: string;
  fileName?: string;
  fileId?: Id<"files">;
  lastModified?: number;
  tags?: string[];
  favorite?: boolean;
  archived?: boolean;
  createdAt?: number;
  updatedAt?: number;
};

/**
 * Normalize a document object to DocumentCardData format
 */
export function normalizeDocument(d: any): DocumentCardData {
  const title = (d?.title ?? "Untitled") as string;
  const contentPreview = (d?.contentPreview ?? null) as string | null;

  let documentType: "file" | "text" | "timeline" = "text";
  let fileType: string | undefined;
  let fileName: string | undefined;
  let fileId: Id<"files"> | undefined;

  if (d?.documentType === "file") {
    documentType = "file";
    fileType = d?.fileType;
    fileName = d?.fileName;
    fileId = d?.fileId;
  } else if (d?.documentType === "timeline") {
    documentType = "timeline";
  }

  return {
    _id: d?._id,
    title,
    contentPreview,
    documentType,
    fileType,
    fileName,
    fileId,
    lastModified: d?.lastModified,
    tags: d?.tags,
    favorite: d?.favorite,
    archived: d?.archived,
    createdAt: d?.createdAt,
    updatedAt: d?.updatedAt,
  };
}

/**
 * Get the appropriate icon for a document type
 */
export const getDocumentTypeIcon = (doc: DocumentCardData) => {
  let t: FileType;

  if (doc.documentType === "file" && doc.fileType) {
    t = inferFileType(doc.fileType);
  } else if (doc.documentType === "timeline") {
    t = "timeline";
  } else {
    t = "text";
  }

  switch (t) {
    case "timeline":
      return Calendar;
    case "text":
    case "markdown":
      return FileText;
    default:
      return File;
  }
};

