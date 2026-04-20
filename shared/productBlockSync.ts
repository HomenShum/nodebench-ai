export const PRODUCT_BLOCK_SYNC_PREFIX = "nbb";

export type ProductBlockSyncIdentity = {
  anonymousSessionId: string | null;
  shareToken: string | null;
  blockId: string;
};

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

function decodeSegment(value: string): string {
  return decodeURIComponent(value);
}

export function buildProductBlockSyncId(args: {
  anonymousSessionId?: string | null;
  shareToken?: string | null;
  blockId: string;
}): string {
  const sessionSegment = args.anonymousSessionId?.trim() || "-";
  const shareSegment = args.shareToken?.trim() || "-";
  return [
    PRODUCT_BLOCK_SYNC_PREFIX,
    encodeSegment(sessionSegment),
    encodeSegment(shareSegment),
    encodeSegment(args.blockId),
  ].join("|");
}

export function parseProductBlockSyncId(value: string): ProductBlockSyncIdentity | null {
  const [prefix, encodedSessionId, encodedShareToken, encodedBlockId] = value.split("|");
  if (prefix !== PRODUCT_BLOCK_SYNC_PREFIX || !encodedSessionId || !encodedShareToken || !encodedBlockId) {
    return null;
  }

  const anonymousSessionId = decodeSegment(encodedSessionId);
  const shareToken = decodeSegment(encodedShareToken);
  const blockId = decodeSegment(encodedBlockId);
  if (!blockId.trim()) return null;

  return {
    anonymousSessionId: anonymousSessionId === "-" ? null : anonymousSessionId,
    shareToken: shareToken === "-" ? null : shareToken,
    blockId,
  };
}
