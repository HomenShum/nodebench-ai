import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// Validators for spreadsheet operations
const setCellValidator = v.object({
  op: v.literal("setCell"),
  row: v.number(),
  col: v.number(),
  value: v.string(),
  type: v.optional(v.string()),
  comment: v.optional(v.string()),
});

const clearCellValidator = v.object({
  op: v.literal("clearCell"),
  row: v.number(),
  col: v.number(),
});

const setRangeValidator = v.object({
  op: v.literal("setRange"),
  startRow: v.number(),
  endRow: v.number(),
  startCol: v.number(),
  endCol: v.number(),
  // Provide either a constant value or a 2D values array
  value: v.optional(v.string()),
  values: v.optional(v.array(v.array(v.string()))),
});

const operationValidator = v.union(setCellValidator, clearCellValidator, setRangeValidator);

export const createSheet = mutation({
  args: { name: v.string() },
  returns: v.id("spreadsheets"),
  handler: async (ctx, { name }): Promise<Id<"spreadsheets">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const sheetId = await ctx.db.insert("spreadsheets", {
      name,
      userId,
      createdAt: now,
      updatedAt: now,
    });
    return sheetId;
  },
});

export const getRange = query({
  args: {
    sheetId: v.id("spreadsheets"),
    startRow: v.number(),
    endRow: v.number(),
    startCol: v.number(),
    endCol: v.number(),
  },
  returns: v.array(
    v.object({
      row: v.number(),
      col: v.number(),
      value: v.optional(v.string()),
      type: v.optional(v.string()),
      comment: v.optional(v.string()),
      _id: v.id("sheetCells"),
    })
  ),
  handler: async (ctx, { sheetId, startRow, endRow, startCol, endCol }) => {
    if (startRow > endRow || startCol > endCol) return [];

    // Fetch rows in range using the index prefix (sheetId, row)
    const rows = await ctx.db
      .query("sheetCells")
      .withIndex("by_sheet_row_col", (q) =>
        q.eq("sheetId", sheetId).gte("row", startRow).lte("row", endRow)
      )
      .collect();

    // Filter columns in JS (Convex best practice prefers indices, but this is acceptable for small ranges)
    return rows
      .filter((c) => c.col >= startCol && c.col <= endCol)
      .map((c) => ({
        _id: c._id,
        row: c.row,
        col: c.col,
        value: c.value,
        type: c.type,
        comment: c.comment,
      }));
  },
});

export const applyOperations = mutation({
  args: {
    sheetId: v.id("spreadsheets"),
    operations: v.array(operationValidator),
  },
  returns: v.object({
    applied: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx, { sheetId, operations }) => {
    const sheet = await ctx.db.get(sheetId);
    if (!sheet) throw new Error("Sheet not found");

    let applied = 0;
    let errors = 0;
    const now = Date.now();

    for (const op of operations) {
      try {
        if (op.op === "setCell") {
          const existing = await ctx.db
            .query("sheetCells")
            .withIndex("by_sheet_row_col", (q) =>
              q.eq("sheetId", sheetId).eq("row", op.row).eq("col", op.col)
            )
            .first();

          if (existing) {
            await ctx.db.patch(existing._id, {
              value: op.value,
              type: op.type,
              comment: op.comment,
              updatedAt: now,
            });
          } else {
            await ctx.db.insert("sheetCells", {
              sheetId,
              row: op.row,
              col: op.col,
              value: op.value,
              type: op.type,
              comment: op.comment,
              updatedAt: now,
            });
          }
          applied++;
        } else if (op.op === "clearCell") {
          const existing = await ctx.db
            .query("sheetCells")
            .withIndex("by_sheet_row_col", (q) =>
              q.eq("sheetId", sheetId).eq("row", op.row).eq("col", op.col)
            )
            .first();

          if (existing) {
            await ctx.db.patch(existing._id, {
              value: undefined,
              type: undefined,
              comment: undefined,
              updatedAt: now,
            });
          }
          applied++;
        } else if (op.op === "setRange") {
          const { startRow, endRow, startCol, endCol } = op;
          if (startRow > endRow || startCol > endCol) {
            throw new Error("Invalid range");
          }
          const height = endRow - startRow + 1;
          const width = endCol - startCol + 1;

          for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
              const row = startRow + r;
              const col = startCol + c;
              const value =
                op.values?.[r]?.[c] ?? (op.value !== undefined ? op.value : "");

              const existing = await ctx.db
                .query("sheetCells")
                .withIndex("by_sheet_row_col", (q) =>
                  q.eq("sheetId", sheetId).eq("row", row).eq("col", col)
                )
                .first();

              if (existing) {
                await ctx.db.patch(existing._id, {
                  value,
                  updatedAt: now,
                });
              } else {
                await ctx.db.insert("sheetCells", {
                  sheetId,
                  row,
                  col,
                  value,
                  updatedAt: now,
                });
              }
            }
          }
          applied++;
        } else {
          // Unknown op
          errors++;
        }
      } catch (e) {
        console.error("applyOperations error on op", op, e);
        errors++;
      }
    }

    // Update sheet timestamp if any changes applied
    if (applied > 0) {
      await ctx.db.patch(sheetId, { updatedAt: now });
    }

    return { applied, errors };
  },
});
