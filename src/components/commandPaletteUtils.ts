import type { CommandAction } from "./CommandPalette";
import { loadBuyerPreferredPath, type BuyerPreferredPath } from "@/features/controlPlane/lib/onboardingState";

const BUYER_ROUTE_PRIORITY: Record<BuyerPreferredPath, string[]> = {
  receipts: ["nav-receipts", "nav-delegation", "nav-investigation", "nav-research"],
  delegation: ["nav-delegation", "nav-receipts", "nav-investigation", "nav-research"],
  investigation: ["nav-investigation", "nav-receipts", "nav-delegation", "nav-research"],
  "research-briefing": ["nav-research", "nav-receipts", "nav-investigation", "nav-delegation"],
};

const DEFAULT_BUYER_ROUTE_PRIORITY = ["nav-receipts", "nav-delegation", "nav-investigation", "nav-research"];

export function getBuyerPreferredPriority(): string[] {
  const preferred = loadBuyerPreferredPath();
  return preferred ? BUYER_ROUTE_PRIORITY[preferred] : DEFAULT_BUYER_ROUTE_PRIORITY;
}

export function rankCommandPaletteCommands(commands: CommandAction[], query: string): CommandAction[] {
  if (query.trim()) return commands;

  const priority = getBuyerPreferredPriority();
  const rank = new Map(priority.map((id, index) => [id, index]));

  return [...commands].sort((a, b) => {
    const aRank = rank.get(a.id);
    const bRank = rank.get(b.id);
    if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
    if (aRank !== undefined) return -1;
    if (bRank !== undefined) return 1;
    return 0;
  });
}
