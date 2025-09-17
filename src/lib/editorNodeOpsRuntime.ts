import type EditorJS from "@editorjs/editorjs";
import { applyNodeOps, type EditorJsBlock, type EditorNodeAction } from "./editorNodeOps";

export type ApplyOpsOptions = {
  anchorIndex?: number;
};

async function getBlocks(ed: EditorJS): Promise<EditorJsBlock[]> {
  const out: any = await (ed as any).save();
  return Array.isArray(out?.blocks) ? (out.blocks as EditorJsBlock[]) : [];
}

function getCurrentIndex(ed: EditorJS): number {
  try {
    const idx = (ed as any)?.blocks?.getCurrentBlockIndex?.();
    return typeof idx === "number" && idx >= 0 ? idx : 0;
  } catch {
    return 0;
  }
}

export async function applyOps(
  ed: EditorJS,
  actions: EditorNodeAction[],
  opts?: ApplyOpsOptions,
): Promise<EditorJsBlock[]> {
  await (ed as any)?.isReady?.catch?.(() => {});
  const current = await getBlocks(ed);
  const anchorIndex = typeof opts?.anchorIndex === "number" ? opts!.anchorIndex : getCurrentIndex(ed);
  const next = applyNodeOps(current, actions, { anchorIndex });
  await (ed as any).render({ time: Date.now(), blocks: next, version: "2.31.0" });
  const after = await getBlocks(ed);
  return after;
}

// Convenience wrappers
export async function createNode(
  ed: EditorJS,
  params: { markdown?: string; blocks?: EditorJsBlock[]; position?: "before" | "after" | "start" | "end"; anchorIndex?: number },
): Promise<EditorJsBlock[]> {
  const actions: EditorNodeAction[] = [
    {
      type: "createNode",
      markdown: params.markdown,
      blocks: params.blocks,
      position: params.position ?? "after",
      anchorIndex: params.anchorIndex,
    },
  ];
  return applyOps(ed, actions, { anchorIndex: params.anchorIndex });
}

export async function updateNode(
  ed: EditorJS,
  params: { targetIndex?: number; markdown?: string; blocks?: EditorJsBlock[]; anchorIndex?: number },
): Promise<EditorJsBlock[]> {
  const actions: EditorNodeAction[] = [
    {
      type: "updateNode",
      targetIndex: params.targetIndex,
      markdown: params.markdown,
      blocks: params.blocks,
    },
  ];
  return applyOps(ed, actions, { anchorIndex: params.anchorIndex });
}

export async function deleteNode(
  ed: EditorJS,
  params: { targetIndex?: number; anchorIndex?: number },
): Promise<EditorJsBlock[]> {
  const actions: EditorNodeAction[] = [
    {
      type: "deleteNode",
      targetIndex: params.targetIndex,
    },
  ];
  return applyOps(ed, actions, { anchorIndex: params.anchorIndex });
}

export async function replaceRange(
  ed: EditorJS,
  params: { startIndex?: number; endIndex?: number; markdown?: string; blocks?: EditorJsBlock[]; anchorIndex?: number },
): Promise<EditorJsBlock[]> {
  const actions: EditorNodeAction[] = [
    {
      type: "replaceRange",
      startIndex: params.startIndex,
      endIndex: params.endIndex,
      markdown: params.markdown,
      blocks: params.blocks,
    },
  ];
  return applyOps(ed, actions, { anchorIndex: params.anchorIndex });
}
