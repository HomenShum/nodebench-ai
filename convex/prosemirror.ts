import { components } from "./_generated/api";
import { ProsemirrorSync } from "@convex-dev/prosemirror-sync";
import { getAuthUserId } from "@convex-dev/auth/server";
import { DataModel, Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

const prosemirrorSync = new ProsemirrorSync(components.prosemirrorSync);

export const {
  getSnapshot,
  submitSnapshot,
  latestVersion,
  getSteps,
  submitSteps,
} = prosemirrorSync.syncApi<DataModel>({
  async checkRead(ctx, id) {
    const document = await ctx.db.get(id as Id<"documents">);
    if (!document) {
      throw new Error("Document not found");
    }

    // Public documents are readable by anyone (including unauthenticated users)
    if (document.isPublic) return;

    // Otherwise require authentication and ownership
    const userId = await getAuthUserId(ctx);
    if (!userId || document.createdBy !== userId) {
      throw new Error("Unauthorized");
    }
  },
  async checkWrite(ctx, id) {
    const document = await ctx.db.get(id as Id<"documents">);
    if (!document) {
      throw new Error("Document not found");
    }

    // If author enabled public editing, allow writes for anyone
    if (document.isPublic && (document as any).allowPublicEdit === true) return;

    // Otherwise only allow writes to the document creator
    const userId = await getAuthUserId(ctx);
    if (!userId || document.createdBy !== userId) throw new Error("Unauthorized");
  },
  async onSnapshot(ctx, id, snapshot, version) {
    // Update the document content when a new snapshot is available
    await ctx.db.patch(id as any, {
      content: snapshot,
    });
  },
});

// Create a new document and seed an initial ProseMirror snapshot.
// Accepts either a full ProseMirror doc JSON (with type: "doc") or a simple array of blocks
// that the existing documents.create mutation will convert to ProseMirror JSON.
export const createDocumentWithInitialSnapshot = mutation({
  args: {
    title: v.string(),
    parentId: v.optional(v.id("documents")),
    // initialContent can be either a ProseMirror JSON object or a simple array of blocks
    initialContent: v.optional(v.any()),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    let docId: Id<"documents">;
    let contentString: string;
    let contentObject: object;
    const content = args.initialContent;

    // Branch 1: Provided a full ProseMirror JSON document
    if (content && typeof content === "object" && !Array.isArray(content) && 'type' in (content as object) && (content as any).type === "doc") {
      contentObject = content as object;
      contentString = JSON.stringify(contentObject);
      docId = await ctx.db.insert("documents", {
        title: args.title,
        parentId: args.parentId,
        createdBy: userId,
        isPublic: false,
        isArchived: false,
        content: contentString,
      });
    } else {
      // Branch 2: Provided simple array blocks (or nothing). Insert the document row,
      // then build a ProseMirror JSON doc directly from the simple blocks for the snapshot.
      const createdId = await ctx.runMutation(api.documents.create, {
        title: args.title,
        parentId: args.parentId,
        content: Array.isArray(content) ? content : [],
      });
      docId = createdId as Id<"documents">;

      const blocksInput: any[] = Array.isArray(content) ? content as any[] : [];

      // Minimal, robust converter from our simple block array to PM JSON compatible with BlockNote sync
      type PMNode = { type: string; attrs?: Record<string, any>; content?: PMNode[] } & Record<string, any>;
      const pmText = (text: string): PMNode => ({ type: "text", text });
      const pmParagraph = (text: string): PMNode => ({
        type: "paragraph",
        attrs: { textAlignment: "left" },
        content: text ? [pmText(text)] : [],
      });
      const getChildren = (b: any): any[] => Array.isArray(b?.children) ? b.children : [];

      const convertBulletItem = (b: any): PMNode => ({
        type: "listItem",
        content: [pmParagraph(String(b?.text ?? ""))],
      });
      const convertTaskItem = (b: any): PMNode => ({
        type: "taskItem",
        attrs: { checked: !!b?.checked },
        content: [pmParagraph(String(b?.text ?? ""))],
      });

      const topLevel: PMNode[] = [];
      let i2 = 0;
      while (i2 < blocksInput.length) {
        const b = blocksInput[i2] ?? {};
        if (b.type === "bulletListItem") {
          const run: any[] = [];
          while (i2 < blocksInput.length && blocksInput[i2]?.type === "bulletListItem") {
            run.push(blocksInput[i2]); i2++;
          }
          topLevel.push({ type: "bulletList", content: run.map(convertBulletItem) });
          continue;
        }
        if (b.type === "checkListItem") {
          const run: any[] = [];
          while (i2 < blocksInput.length && blocksInput[i2]?.type === "checkListItem") {
            run.push(blocksInput[i2]); i2++;
          }
          topLevel.push({ type: "taskList", content: run.map(convertTaskItem) });
          continue;
        }
        switch (b.type) {
          case "heading":
            topLevel.push({ type: "heading", attrs: { textAlignment: "left", level: b.level || 1 }, content: [pmText(String(b.text ?? ""))] });
            break;
          case "quote":
            // Use the standard TipTap/ProseMirror node name "blockquote"
            topLevel.push({ type: "blockquote", attrs: { textAlignment: "left" }, content: [pmText(String(b.text ?? ""))] });
            break;
          case "codeBlock":
            topLevel.push({ type: "codeBlock", attrs: { language: b.lang || "text" }, content: b.text ? [pmText(String(b.text))] : [] });
            break;
          case "horizontalRule":
            topLevel.push({ type: "horizontalRule", attrs: {} });
            break;
          case "paragraph":
          default:
            topLevel.push(pmParagraph(String(b.text ?? "")));
        }
        i2++;
      }
      contentObject = { type: "doc", content: topLevel } as object;
    }

    // Seed the initial snapshot with the same content so the editor starts from it.
    // The sync API expects a ProseMirror JSON object.
    const sanitizePmDoc = (doc: any) => {
      try {
        if (!doc || typeof doc !== "object" || doc.type !== "doc") {
          return { type: "doc", content: [] };
        }
        const arr = Array.isArray((doc as any).content) ? (doc as any).content : [];
        const toParagraph = (text: string) => ({
          type: "paragraph",
          attrs: { textAlignment: "left" },
          content: text ? [{ type: "text", text }] : [],
        });
        const normalized: any[] = [];
        for (const n of arr) {
          if (n && typeof n === "object" && typeof (n as any).type === "string" && (n as any).type !== "text") {
            normalized.push(n);
          } else if (typeof n === "string" || (n && typeof n === "object" && (n as any).type === "text")) {
            const t = typeof n === "string" ? n : String((n as any).text ?? "");
            normalized.push(toParagraph(t));
          } else {
            normalized.push(toParagraph(""));
          }
        }
        return { type: "doc", content: normalized };
      } catch {
        return { type: "doc", content: [] };
      }
    };
    const safeDoc = sanitizePmDoc(contentObject);
    await prosemirrorSync.create(ctx, docId, safeDoc);

    return docId;
  },
});
