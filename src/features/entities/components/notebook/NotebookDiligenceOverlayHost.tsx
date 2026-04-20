import { useEffect, useMemo, useRef } from "react";
import type { DiligenceDecorationData } from "./DiligenceDecorationPlugin";
import { renderDiligenceDecorationElement } from "./DiligenceDecorationPlugin";
import { diligenceRenderers } from "./diligenceRenderers";

type Props = {
  decorations: readonly DiligenceDecorationData[];
  onAcceptDecoration?: (
    scratchpadRunId: string,
    blockType: DiligenceDecorationData["blockType"],
  ) => void;
  onDismissDecoration?: (
    scratchpadRunId: string,
    blockType: DiligenceDecorationData["blockType"],
  ) => void;
  onRefreshDecoration?: (
    scratchpadRunId: string,
    blockType: DiligenceDecorationData["blockType"],
  ) => void;
};

export function NotebookDiligenceOverlayHost({
  decorations,
  onAcceptDecoration,
  onDismissDecoration,
  onRefreshDecoration,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const config = useMemo(
    () => ({
      getDecorations: () => decorations,
      anchors: [{ kind: "top" as const }],
      renderers: diligenceRenderers,
      onAcceptDecoration,
      onDismissDecoration,
      onRefreshDecoration,
    }),
    [decorations, onAcceptDecoration, onDismissDecoration, onRefreshDecoration],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren(
      ...decorations.map((decoration) =>
        renderDiligenceDecorationElement(decoration, config),
      ),
    );
  }, [config, decorations]);

  if (decorations.length === 0) {
    return null;
  }

  return (
    <div
      ref={hostRef}
      data-testid="notebook-diligence-overlay-host"
      className="mb-5 border-b border-gray-200/70 pb-2 dark:border-white/10"
    />
  );
}

