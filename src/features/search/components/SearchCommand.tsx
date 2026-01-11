import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Search, FileText } from "lucide-react";

interface SearchCommandProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentSelect: (documentId: Id<"documents">) => void;
}

export function SearchCommand({ isOpen, onClose, onDocumentSelect }: SearchCommandProps) {
  const [query, setQuery] = useState("");
  const searchResults = useQuery(api.domains.documents.documents.getSearch, 
    query.length > 0 ? { query } : "skip"
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  const handleDocumentClick = (documentId: Id<"documents">) => {
    onDocumentSelect(documentId);
    onClose();
    setQuery("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
      <div className="bg-[color:var(--bg-primary)] rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center gap-3 p-4 border-b border-[color:var(--border-color)]">
          <Search className="h-5 w-5 text-[color:var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 outline-none text-lg"
            autoFocus
          />
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {query.length === 0 ? (
            <div className="p-4 text-center text-[color:var(--text-secondary)]">
              Start typing to search documents...
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((doc) => (
                <button
                  key={doc._id}
                  onClick={() => handleDocumentClick(doc._id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[color:var(--bg-hover)] text-left"
                >
                  {doc.icon ? (
                    <span className="text-lg">{doc.icon}</span>
                  ) : (
                    <FileText className="h-5 w-5 text-[color:var(--text-secondary)]" />
                  )}
                  <div>
                    <div className="font-medium text-[color:var(--text-primary)]">{doc.title}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length > 0 ? (
            <div className="p-4 text-center text-[color:var(--text-secondary)]">
              No documents found for "{query}"
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

