import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { FileSpreadsheet } from "lucide-react";

export function SpreadsheetsHub({
  onOpenSheet,
}: {
  onOpenSheet: (id: Id<"spreadsheets">) => void;
}) {
  const sheets = useQuery(api.domains.integrations.spreadsheets.listSheets, { limit: 50 });

  return (
    <div className="h-full overflow-auto bg-[#faf9f6] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet className="h-5 w-5 text-emerald-700" />
          <h2 className="text-lg font-semibold text-stone-900">Spreadsheets</h2>
        </div>

        {!sheets ? (
          <div className="text-sm text-stone-500">Loading…</div>
        ) : sheets.length === 0 ? (
          <div className="text-sm text-stone-500">No spreadsheets yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sheets.map((s: any) => (
              <button
                key={String(s._id)}
                type="button"
                className="text-left rounded-xl border border-stone-200 bg-white hover:bg-stone-50 p-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                onClick={() => onOpenSheet(s._id as Id<"spreadsheets">)}
              >
                <div className="text-sm font-medium text-stone-900 truncate">
                  {s.name || "Untitled spreadsheet"}
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  Updated {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : "—"}
                </div>
                {s.dcfSessionId && (
                  <div className="text-[11px] text-emerald-700 mt-2">
                    Linked DCF model
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

