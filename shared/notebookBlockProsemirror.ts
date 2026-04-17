export type NotebookBlockChip = {
  type: "text" | "mention" | "link" | "linebreak" | "image";
  value: string;
  url?: string;
  styles?: number;
  mentionTrigger?: string;
  mentionTarget?: string;
};

export const CHIP_STYLE_BOLD = 1;
export const CHIP_STYLE_ITALIC = 2;
export const CHIP_STYLE_UNDERLINE = 4;
export const CHIP_STYLE_STRIKE = 8;
export const CHIP_STYLE_CODE = 16;

type ProsemirrorMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

type ProsemirrorNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: ProsemirrorMark[];
  content?: ProsemirrorNode[];
};

function chipMarksFromStyles(styles?: number): ProsemirrorMark[] {
  if (!styles) return [];
  const marks: ProsemirrorMark[] = [];
  if (styles & CHIP_STYLE_BOLD) marks.push({ type: "bold" });
  if (styles & CHIP_STYLE_ITALIC) marks.push({ type: "italic" });
  if (styles & CHIP_STYLE_UNDERLINE) marks.push({ type: "underline" });
  if (styles & CHIP_STYLE_STRIKE) marks.push({ type: "strike" });
  if (styles & CHIP_STYLE_CODE) marks.push({ type: "code" });
  return marks;
}

function stylesFromChipMarks(marks?: ProsemirrorMark[]): number | undefined {
  if (!marks || marks.length === 0) return undefined;
  let styles = 0;
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        styles |= CHIP_STYLE_BOLD;
        break;
      case "italic":
        styles |= CHIP_STYLE_ITALIC;
        break;
      case "underline":
        styles |= CHIP_STYLE_UNDERLINE;
        break;
      case "strike":
        styles |= CHIP_STYLE_STRIKE;
        break;
      case "code":
        styles |= CHIP_STYLE_CODE;
        break;
      default:
        break;
    }
  }
  return styles || undefined;
}

function pushTextChip(target: NotebookBlockChip[], value: string, styles?: number): void {
  if (!value) return;
  const previous = target[target.length - 1];
  if (previous?.type === "text" && (previous.styles ?? 0) === (styles ?? 0)) {
    previous.value += value;
    return;
  }
  target.push({ type: "text", value, styles });
}

function pushLinkChip(target: NotebookBlockChip[], value: string, url?: string): void {
  if (!value) return;
  const previous = target[target.length - 1];
  if (previous?.type === "link" && previous.url === url) {
    previous.value += value;
    return;
  }
  target.push({ type: "link", value, url });
}

function inlineNodesFromChips(chips: NotebookBlockChip[]): ProsemirrorNode[] {
  const nodes: ProsemirrorNode[] = [];
  for (const chip of chips) {
    switch (chip.type) {
      case "text":
        if (!chip.value) break;
        nodes.push({
          type: "text",
          text: chip.value,
          marks: chipMarksFromStyles(chip.styles),
        });
        break;
      case "linebreak":
        nodes.push({ type: "hardBreak" });
        break;
      case "link":
        if (!chip.value) break;
        nodes.push({
          type: "text",
          text: chip.value,
          marks: [
            {
              type: "link",
              attrs: { href: chip.url ?? chip.value },
            },
          ],
        });
        break;
      case "mention":
        nodes.push({
          type: "mention",
          attrs: {
            id: chip.mentionTarget ?? chip.value,
            label: chip.value,
            mentionSuggestionChar: chip.mentionTrigger ?? "@",
          },
        });
        break;
      case "image":
        nodes.push({
          type: "image",
          attrs: {
            src: chip.url ?? chip.value,
            alt: "",
          },
        });
        break;
      default:
        break;
    }
  }
  return nodes;
}

export function chipsToProsemirrorDoc(chips: NotebookBlockChip[]): ProsemirrorNode {
  const inlineContent = inlineNodesFromChips(chips);
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: inlineContent,
      },
    ],
  };
}

function visitProsemirrorNode(node: ProsemirrorNode, target: NotebookBlockChip[]): void {
  switch (node.type) {
    case "doc":
      for (const child of node.content ?? []) {
        visitProsemirrorNode(child, target);
      }
      return;
    case "paragraph":
    case "heading":
    case "blockquote":
    case "codeBlock": {
      let wroteChild = false;
      for (const child of node.content ?? []) {
        wroteChild = true;
        visitProsemirrorNode(child, target);
      }
      if (wroteChild && target.length > 0) {
        const last = target[target.length - 1];
        if (last?.type !== "linebreak") {
          target.push({ type: "linebreak", value: "\n" });
        }
      }
      return;
    }
    case "text": {
      const linkMark = (node.marks ?? []).find((mark) => mark.type === "link");
      if (linkMark) {
        pushLinkChip(
          target,
          node.text ?? "",
          typeof linkMark.attrs?.href === "string" ? linkMark.attrs.href : undefined,
        );
        return;
      }
      pushTextChip(target, node.text ?? "", stylesFromChipMarks(node.marks));
      return;
    }
    case "hardBreak":
      target.push({ type: "linebreak", value: "\n" });
      return;
    case "mention":
      target.push({
        type: "mention",
        value:
          typeof node.attrs?.label === "string"
            ? node.attrs.label
            : typeof node.attrs?.id === "string"
              ? node.attrs.id
              : "",
        mentionTarget:
          typeof node.attrs?.id === "string" ? node.attrs.id : undefined,
        mentionTrigger:
          typeof node.attrs?.mentionSuggestionChar === "string"
            ? node.attrs.mentionSuggestionChar
            : "@",
      });
      return;
    case "image":
      target.push({
        type: "image",
        value:
          typeof node.attrs?.src === "string" ? node.attrs.src : "",
        url: typeof node.attrs?.src === "string" ? node.attrs.src : undefined,
      });
      return;
    default:
      for (const child of node.content ?? []) {
        visitProsemirrorNode(child, target);
      }
  }
}

export function prosemirrorDocToChips(value: unknown): NotebookBlockChip[] {
  const chips: NotebookBlockChip[] = [];
  if (!value || typeof value !== "object") {
    return [{ type: "text", value: "" }];
  }
  visitProsemirrorNode(value as ProsemirrorNode, chips);
  while (chips[chips.length - 1]?.type === "linebreak") {
    chips.pop();
  }
  return chips.length > 0 ? chips : [{ type: "text", value: "" }];
}
