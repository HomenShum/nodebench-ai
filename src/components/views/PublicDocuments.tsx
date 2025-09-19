import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Globe } from "lucide-react";
import { DocumentCard } from "@/components/DocumentsHomeHub";
import { PageHeroHeader } from "@/components/shared/PageHeroHeader";


interface PublicDocumentsProps {
  onDocumentSelect: (documentId: Id<"documents">) => void;
}

export function PublicDocuments({ onDocumentSelect }: PublicDocumentsProps) {
  const publicDocuments = useQuery(api.documents.getPublic);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  if (publicDocuments === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <PageHeroHeader
            icon={<Globe className="h-6 w-6 text-green-600" />}
            title={"Public Documents"}
            subtitle={"Discover documents shared by the community"}
          />
        </div>

        {publicDocuments.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No public documents yet
            </h3>
            <p className="text-gray-600">
              Be the first to share a document with the community!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {publicDocuments.map((doc) => {
              const cardDoc = {
                _id: doc._id as Id<"documents">,
                title: doc.title,
                documentType: (doc as any).documentType,
                fileType: (doc as any).fileType,
                fileId: (doc as any).fileId,
                lastModified: (doc as any).lastModified || doc._creationTime,
                createdBy: doc.createdBy as Id<"users">,
                isArchived: doc.isArchived,
                isFavorite: (doc as any).isFavorite,
                coverImage: (doc as any).coverImage,
                icon: (doc as any).icon,
                contentPreview: undefined,
              };

              return (
                <DocumentCard
                  key={doc._id}
                  doc={cardDoc}
                  onSelect={onDocumentSelect}
                  hoveredCard={hoveredCard}
                  setHoveredCard={setHoveredCard}
                  hybrid={true}
                  openOnSingleClick={true}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
