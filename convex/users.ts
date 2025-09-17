import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// List users for typeahead assignment. This is intentionally simple and unscoped.
// In a team/workspace setup, you would likely filter to teammates.
export const list = query({
  args: {
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const q = (args.query ?? "").toLowerCase().trim();
    const limit = Math.min(Math.max(1, args.limit ?? 10), 50);

    // Minimal scan + filter. For larger user bases, add a search index.
    const rows = await ctx.db.query("users").collect();
    const filtered = rows
      .filter((u: any) => {
        if (!q) return true;
        const name = String(u?.name ?? "").toLowerCase();
        const email = String(u?.email ?? "").toLowerCase();
        return name.includes(q) || email.includes(q) || String(u._id).includes(q);
      })
      .slice(0, limit)
      .map((u: any) => ({ _id: u._id as Id<"users">, name: u?.name, image: u?.image }));

    return filtered;
  },
});
