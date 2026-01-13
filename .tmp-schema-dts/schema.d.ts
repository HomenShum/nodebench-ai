export declare const tags: import("convex/server").TableDefinition<import("convex/values").VObject<{
    importance?: number;
    kind?: string;
    createdAt: number;
    name: string;
    createdBy: import("convex/values").GenericId<"users">;
}, {
    name: import("convex/values").VString<string, "required">;
    kind: import("convex/values").VString<string, "optional">;
    importance: import("convex/values").VFloat64<number, "optional">;
    createdBy: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
    createdAt: import("convex/values").VFloat64<number, "required">;
}, "required", "createdAt" | "name" | "createdBy" | "importance" | "kind">, {
    by_name: ["name", "_creationTime"];
    by_kind: ["kind", "_creationTime"];
}, {
    search_name: {
        searchField: "name";
        filterFields: "kind";
    };
}, {}>;
export declare const tagRefs: import("convex/server").TableDefinition<import("convex/values").VObject<{
    createdAt: number;
    createdBy: import("convex/values").GenericId<"users">;
    tagId: import("convex/values").GenericId<"tags">;
    targetId: string;
    targetType: string;
}, {
    tagId: import("convex/values").VId<import("convex/values").GenericId<"tags">, "required">;
    targetId: import("convex/values").VString<string, "required">;
    targetType: import("convex/values").VString<string, "required">;
    createdBy: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
    createdAt: import("convex/values").VFloat64<number, "required">;
}, "required", "createdAt" | "createdBy" | "tagId" | "targetId" | "targetType">, {
    by_tag: ["tagId", "_creationTime"];
    by_target: ["targetId", "targetType", "_creationTime"];
}, {}, {}>;
export declare const smsLogs: import("convex/server").TableDefinition<import("convex/values").VObject<{
    userId?: import("convex/values").GenericId<"users">;
    messageSid?: string;
    eventType?: string;
    eventId?: import("convex/values").GenericId<"events">;
    segments?: number;
    estimatedCostCents?: number;
    createdAt: number;
    to: string;
    body: string;
    status: string;
}, {
    to: import("convex/values").VString<string, "required">;
    body: import("convex/values").VString<string, "required">;
    status: import("convex/values").VString<string, "required">;
    createdAt: import("convex/values").VFloat64<number, "required">;
    userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
    messageSid: import("convex/values").VString<string, "optional">;
    eventType: import("convex/values").VString<string, "optional">;
    eventId: import("convex/values").VId<import("convex/values").GenericId<"events">, "optional">;
    segments: import("convex/values").VFloat64<number, "optional">;
    estimatedCostCents: import("convex/values").VFloat64<number, "optional">;
}, "required", "userId" | "createdAt" | "to" | "body" | "status" | "messageSid" | "eventType" | "eventId" | "segments" | "estimatedCostCents">, {
    by_to: ["to", "_creationTime"];
    by_user: ["userId", "_creationTime"];
    by_user_date: ["userId", "createdAt", "_creationTime"];
    by_status: ["status", "_creationTime"];
}, {}, {}>;
export declare const smsUsageDaily: import("convex/server").TableDefinition<import("convex/values").VObject<{
    meetingCreatedCount?: number;
    meetingReminderCount?: number;
    morningDigestCount?: number;
    userId: import("convex/values").GenericId<"users">;
    estimatedCostCents: number;
    date: string;
    totalMessages: number;
    successfulMessages: number;
    failedMessages: number;
    totalSegments: number;
}, {
    userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
    date: import("convex/values").VString<string, "required">;
    totalMessages: import("convex/values").VFloat64<number, "required">;
    successfulMessages: import("convex/values").VFloat64<number, "required">;
    failedMessages: import("convex/values").VFloat64<number, "required">;
    totalSegments: import("convex/values").VFloat64<number, "required">;
    estimatedCostCents: import("convex/values").VFloat64<number, "required">;
    meetingCreatedCount: import("convex/values").VFloat64<number, "optional">;
    meetingReminderCount: import("convex/values").VFloat64<number, "optional">;
    morningDigestCount: import("convex/values").VFloat64<number, "optional">;
}, "required", "userId" | "estimatedCostCents" | "date" | "totalMessages" | "successfulMessages" | "failedMessages" | "totalSegments" | "meetingCreatedCount" | "meetingReminderCount" | "morningDigestCount">, {
    by_user: ["userId", "_creationTime"];
    by_user_date: ["userId", "date", "_creationTime"];
    by_date: ["date", "_creationTime"];
}, {}, {}>;
declare const _default: import("convex/server").SchemaDefinition<{
    documents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        icon?: string;
        parentId?: import("convex/values").GenericId<"documents">;
        allowPublicEdit?: boolean;
        lastEditedBy?: import("convex/values").GenericId<"users">;
        coverImage?: import("convex/values").GenericId<"_storage">;
        content?: string;
        summary?: string;
        isArchived?: boolean;
        isFavorite?: boolean;
        publishedAt?: number;
        rootNodeId?: import("convex/values").GenericId<"nodes">;
        lastModified?: number;
        agendaDate?: number;
        snapshotCount?: number;
        ragIndexedAt?: number;
        fileSearchIndexedAt?: number;
        documentType?: "text" | "file" | "timeline" | "dossier";
        fileId?: import("convex/values").GenericId<"files">;
        fileType?: string;
        mimeType?: string;
        dossierType?: "primary" | "media-asset" | "quick-notes";
        parentDossierId?: import("convex/values").GenericId<"documents">;
        chatThreadId?: string;
        assetMetadata?: {
            thumbnailUrl?: string;
            toolName?: string;
            metadata?: any;
            assetType: "file" | "image" | "video" | "youtube" | "sec-document" | "pdf" | "news";
            sourceUrl: string;
            extractedAt: number;
        };
        creationKey?: string;
        themeMemory?: {
            summary: string;
            topicId: string;
            keyFacts: {
                id: string;
                text: string;
                isHighConfidence: boolean;
                sourceDocIds: string[];
            }[];
            narratives: {
                label: string;
                description: string;
                supportingDocIds: string[];
            }[];
            heuristics: string[];
            lastRefreshed: number;
            quality: {
                hasSufficientFacts: boolean;
                hasRecentResearch: boolean;
                hasVerifiedSources: boolean;
            };
            staleDays: number;
            researchDepth: "shallow" | "standard" | "deep";
        };
        linkedArtifacts?: {
            artifactId: import("convex/values").GenericId<"sourceArtifacts">;
            citationKey: string;
            addedAt: number;
            addedBy: import("convex/values").GenericId<"users">;
        }[];
        title: string;
        isPublic: boolean;
        createdBy: import("convex/values").GenericId<"users">;
    }, {
        title: import("convex/values").VString<string, "required">;
        parentId: import("convex/values").VId<import("convex/values").GenericId<"documents">, "optional">;
        isPublic: import("convex/values").VBoolean<boolean, "required">;
        allowPublicEdit: import("convex/values").VBoolean<boolean, "optional">;
        createdBy: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        lastEditedBy: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        coverImage: import("convex/values").VId<import("convex/values").GenericId<"_storage">, "optional">;
        content: import("convex/values").VString<string, "optional">;
        summary: import("convex/values").VString<string, "optional">;
        icon: import("convex/values").VString<string, "optional">;
        isArchived: import("convex/values").VBoolean<boolean, "optional">;
        isFavorite: import("convex/values").VBoolean<boolean, "optional">;
        publishedAt: import("convex/values").VFloat64<number, "optional">;
        /** points at the top GraphNode that owns the editor view */
        rootNodeId: import("convex/values").VId<import("convex/values").GenericId<"nodes">, "optional">;
        lastModified: import("convex/values").VFloat64<number, "optional">;
        agendaDate: import("convex/values").VFloat64<number, "optional">;
        snapshotCount: import("convex/values").VFloat64<number, "optional">;
        ragIndexedAt: import("convex/values").VFloat64<number, "optional">;
        fileSearchIndexedAt: import("convex/values").VFloat64<number, "optional">;
        documentType: import("convex/values").VUnion<"text" | "file" | "timeline" | "dossier", [import("convex/values").VLiteral<"text", "required">, import("convex/values").VLiteral<"file", "required">, import("convex/values").VLiteral<"timeline", "required">, import("convex/values").VLiteral<"dossier", "required">], "optional", never>;
        fileId: import("convex/values").VId<import("convex/values").GenericId<"files">, "optional">;
        fileType: import("convex/values").VString<string, "optional">;
        mimeType: import("convex/values").VString<string, "optional">;
        dossierType: import("convex/values").VUnion<"primary" | "media-asset" | "quick-notes", [import("convex/values").VLiteral<"primary", "required">, import("convex/values").VLiteral<"media-asset", "required">, import("convex/values").VLiteral<"quick-notes", "required">], "optional", never>;
        parentDossierId: import("convex/values").VId<import("convex/values").GenericId<"documents">, "optional">;
        chatThreadId: import("convex/values").VString<string, "optional">;
        assetMetadata: import("convex/values").VObject<{
            thumbnailUrl?: string;
            toolName?: string;
            metadata?: any;
            assetType: "file" | "image" | "video" | "youtube" | "sec-document" | "pdf" | "news";
            sourceUrl: string;
            extractedAt: number;
        }, {
            assetType: import("convex/values").VUnion<"file" | "image" | "video" | "youtube" | "sec-document" | "pdf" | "news", [import("convex/values").VLiteral<"image", "required">, import("convex/values").VLiteral<"video", "required">, import("convex/values").VLiteral<"youtube", "required">, import("convex/values").VLiteral<"sec-document", "required">, import("convex/values").VLiteral<"pdf", "required">, import("convex/values").VLiteral<"news", "required">, import("convex/values").VLiteral<"file", "required">], "required", never>;
            sourceUrl: import("convex/values").VString<string, "required">;
            thumbnailUrl: import("convex/values").VString<string, "optional">;
            extractedAt: import("convex/values").VFloat64<number, "required">;
            toolName: import("convex/values").VString<string, "optional">;
            metadata: import("convex/values").VAny<any, "optional", string>;
        }, "optional", "assetType" | "sourceUrl" | "thumbnailUrl" | "extractedAt" | "toolName" | "metadata" | `metadata.${string}`>;
        creationKey: import("convex/values").VString<string, "optional">;
        themeMemory: import("convex/values").VObject<{
            summary: string;
            topicId: string;
            keyFacts: {
                id: string;
                text: string;
                isHighConfidence: boolean;
                sourceDocIds: string[];
            }[];
            narratives: {
                label: string;
                description: string;
                supportingDocIds: string[];
            }[];
            heuristics: string[];
            lastRefreshed: number;
            quality: {
                hasSufficientFacts: boolean;
                hasRecentResearch: boolean;
                hasVerifiedSources: boolean;
            };
            staleDays: number;
            researchDepth: "shallow" | "standard" | "deep";
        }, {
            topicId: import("convex/values").VString<string, "required">;
            summary: import("convex/values").VString<string, "required">;
            keyFacts: import("convex/values").VArray<{
                id: string;
                text: string;
                isHighConfidence: boolean;
                sourceDocIds: string[];
            }[], import("convex/values").VObject<{
                id: string;
                text: string;
                isHighConfidence: boolean;
                sourceDocIds: string[];
            }, {
                id: import("convex/values").VString<string, "required">;
                text: import("convex/values").VString<string, "required">;
                isHighConfidence: import("convex/values").VBoolean<boolean, "required">;
                sourceDocIds: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            }, "required", "id" | "text" | "isHighConfidence" | "sourceDocIds">, "required">;
            narratives: import("convex/values").VArray<{
                label: string;
                description: string;
                supportingDocIds: string[];
            }[], import("convex/values").VObject<{
                label: string;
                description: string;
                supportingDocIds: string[];
            }, {
                label: import("convex/values").VString<string, "required">;
                description: import("convex/values").VString<string, "required">;
                supportingDocIds: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            }, "required", "label" | "description" | "supportingDocIds">, "required">;
            heuristics: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            lastRefreshed: import("convex/values").VFloat64<number, "required">;
            quality: import("convex/values").VObject<{
                hasSufficientFacts: boolean;
                hasRecentResearch: boolean;
                hasVerifiedSources: boolean;
            }, {
                hasSufficientFacts: import("convex/values").VBoolean<boolean, "required">;
                hasRecentResearch: import("convex/values").VBoolean<boolean, "required">;
                hasVerifiedSources: import("convex/values").VBoolean<boolean, "required">;
            }, "required", "hasSufficientFacts" | "hasRecentResearch" | "hasVerifiedSources">;
            staleDays: import("convex/values").VFloat64<number, "required">;
            researchDepth: import("convex/values").VUnion<"shallow" | "standard" | "deep", [import("convex/values").VLiteral<"shallow", "required">, import("convex/values").VLiteral<"standard", "required">, import("convex/values").VLiteral<"deep", "required">], "required", never>;
        }, "optional", "summary" | "topicId" | "keyFacts" | "narratives" | "heuristics" | "lastRefreshed" | "quality" | "staleDays" | "researchDepth" | "quality.hasSufficientFacts" | "quality.hasRecentResearch" | "quality.hasVerifiedSources">;
        linkedArtifacts: import("convex/values").VArray<{
            artifactId: import("convex/values").GenericId<"sourceArtifacts">;
            citationKey: string;
            addedAt: number;
            addedBy: import("convex/values").GenericId<"users">;
        }[], import("convex/values").VObject<{
            artifactId: import("convex/values").GenericId<"sourceArtifacts">;
            citationKey: string;
            addedAt: number;
            addedBy: import("convex/values").GenericId<"users">;
        }, {
            artifactId: import("convex/values").VId<import("convex/values").GenericId<"sourceArtifacts">, "required">;
            citationKey: import("convex/values").VString<string, "required">;
            addedAt: import("convex/values").VFloat64<number, "required">;
            addedBy: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        }, "required", "artifactId" | "citationKey" | "addedAt" | "addedBy">, "optional">;
    }, "required", "icon" | "title" | "parentId" | "isPublic" | "allowPublicEdit" | "createdBy" | "lastEditedBy" | "coverImage" | "content" | "summary" | "isArchived" | "isFavorite" | "publishedAt" | "rootNodeId" | "lastModified" | "agendaDate" | "snapshotCount" | "ragIndexedAt" | "fileSearchIndexedAt" | "documentType" | "fileId" | "fileType" | "mimeType" | "dossierType" | "parentDossierId" | "chatThreadId" | "assetMetadata" | "creationKey" | "themeMemory" | "linkedArtifacts" | "assetMetadata.assetType" | "assetMetadata.sourceUrl" | "assetMetadata.thumbnailUrl" | "assetMetadata.extractedAt" | "assetMetadata.toolName" | "assetMetadata.metadata" | `assetMetadata.metadata.${string}` | "themeMemory.summary" | "themeMemory.topicId" | "themeMemory.keyFacts" | "themeMemory.narratives" | "themeMemory.heuristics" | "themeMemory.lastRefreshed" | "themeMemory.quality" | "themeMemory.staleDays" | "themeMemory.researchDepth" | "themeMemory.quality.hasSufficientFacts" | "themeMemory.quality.hasRecentResearch" | "themeMemory.quality.hasVerifiedSources">, {
        by_user: ["createdBy", "_creationTime"];
        by_user_archived: ["createdBy", "isArchived", "_creationTime"];
        by_parent: ["parentId", "_creationTime"];
        by_public: ["isPublic", "_creationTime"];
        by_user_agendaDate: ["createdBy", "agendaDate", "_creationTime"];
        by_creation_key: ["creationKey", "_creationTime"];
        by_parent_dossier: ["parentDossierId", "_creationTime"];
        by_chat_thread: ["chatThreadId", "_creationTime"];
    }, {
        search_title: {
            searchField: "title";
            filterFields: "isPublic" | "createdBy" | "isArchived";
        };
    }, {}>;
    nodes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        text?: string;
        parentId?: import("convex/values").GenericId<"nodes">;
        lastEditedBy?: import("convex/values").GenericId<"users">;
        json?: any;
        isUserNode?: boolean;
        type: string;
        updatedAt: number;
        createdAt: number;
        documentId: import("convex/values").GenericId<"documents">;
        order: number;
        authorId: import("convex/values").GenericId<"users">;
    }, {
        documentId: import("convex/values").VId<import("convex/values").GenericId<"documents">, "required">;
        parentId: import("convex/values").VId<import("convex/values").GenericId<"nodes">, "optional">;
        order: import("convex/values").VFloat64<number, "required">;
        type: import("convex/values").VString<string, "required">;
        text: import("convex/values").VString<string, "optional">;
        json: import("convex/values").VAny<any, "optional", string>;
        authorId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        lastEditedBy: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        isUserNode: import("convex/values").VBoolean<boolean, "optional">;
    }, "required", "type" | "updatedAt" | "text" | "createdAt" | "parentId" | "lastEditedBy" | "documentId" | "order" | "json" | "authorId" | "isUserNode" | `json.${string}`>, {
        by_document: ["documentId", "order", "_creationTime"];
        by_parent: ["parentId", "order", "_creationTime"];
        by_updated: ["updatedAt", "_creationTime"];
    }, {
        search_text: {
            searchField: "text";
            filterFields: "documentId" | "authorId";
        };
    }, {}>;
    relations: import("convex/server").TableDefinition<import("convex/values").VObject<{
        order?: number;
        createdAt: number;
        createdBy: import("convex/values").GenericId<"users">;
        from: import("convex/values").GenericId<"nodes">;
        to: import("convex/values").GenericId<"nodes">;
        relationTypeId: string;
    }, {
        from: import("convex/values").VId<import("convex/values").GenericId<"nodes">, "required">;
        to: import("convex/values").VId<import("convex/values").GenericId<"nodes">, "required">;
        relationTypeId: import("convex/values").VString<string, "required">;
        order: import("convex/values").VFloat64<number, "optional">;
        createdBy: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "createdBy" | "order" | "from" | "to" | "relationTypeId">, {
        by_from: ["from", "_creationTime"];
        by_to: ["to", "_creationTime"];
        by_type: ["relationTypeId", "_creationTime"];
    }, {}, {}>;
    relationTypes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        icon?: string;
        id: string;
        name: string;
    }, {
        id: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "required">;
        icon: import("convex/values").VString<string, "optional">;
    }, "required", "id" | "icon" | "name">, {
        by_relationId: ["id", "_creationTime"];
    }, {}, {}>;
    tags: import("convex/server").TableDefinition<import("convex/values").VObject<{
        importance?: number;
        kind?: string;
        createdAt: number;
        name: string;
        createdBy: import("convex/values").GenericId<"users">;
    }, {
        name: import("convex/values").VString<string, "required">;
        kind: import("convex/values").VString<string, "optional">;
        importance: import("convex/values").VFloat64<number, "optional">;
        createdBy: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "name" | "createdBy" | "importance" | "kind">, {
        by_name: ["name", "_creationTime"];
        by_kind: ["kind", "_creationTime"];
    }, {
        search_name: {
            searchField: "name";
            filterFields: "kind";
        };
    }, {}>;
    tagRefs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        createdBy: import("convex/values").GenericId<"users">;
        tagId: import("convex/values").GenericId<"tags">;
        targetId: string;
        targetType: string;
    }, {
        tagId: import("convex/values").VId<import("convex/values").GenericId<"tags">, "required">;
        targetId: import("convex/values").VString<string, "required">;
        targetType: import("convex/values").VString<string, "required">;
        createdBy: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "createdBy" | "tagId" | "targetId" | "targetType">, {
        by_tag: ["tagId", "_creationTime"];
        by_target: ["targetId", "targetType", "_creationTime"];
    }, {}, {}>;
    smsLogs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        messageSid?: string;
        eventType?: string;
        eventId?: import("convex/values").GenericId<"events">;
        segments?: number;
        estimatedCostCents?: number;
        createdAt: number;
        to: string;
        body: string;
        status: string;
    }, {
        to: import("convex/values").VString<string, "required">;
        body: import("convex/values").VString<string, "required">;
        status: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        messageSid: import("convex/values").VString<string, "optional">;
        eventType: import("convex/values").VString<string, "optional">;
        eventId: import("convex/values").VId<import("convex/values").GenericId<"events">, "optional">;
        segments: import("convex/values").VFloat64<number, "optional">;
        estimatedCostCents: import("convex/values").VFloat64<number, "optional">;
    }, "required", "userId" | "createdAt" | "to" | "body" | "status" | "messageSid" | "eventType" | "eventId" | "segments" | "estimatedCostCents">, {
        by_to: ["to", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_user_date: ["userId", "createdAt", "_creationTime"];
        by_status: ["status", "_creationTime"];
    }, {}, {}>;
    smsUsageDaily: import("convex/server").TableDefinition<import("convex/values").VObject<{
        meetingCreatedCount?: number;
        meetingReminderCount?: number;
        morningDigestCount?: number;
        userId: import("convex/values").GenericId<"users">;
        estimatedCostCents: number;
        date: string;
        totalMessages: number;
        successfulMessages: number;
        failedMessages: number;
        totalSegments: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        date: import("convex/values").VString<string, "required">;
        totalMessages: import("convex/values").VFloat64<number, "required">;
        successfulMessages: import("convex/values").VFloat64<number, "required">;
        failedMessages: import("convex/values").VFloat64<number, "required">;
        totalSegments: import("convex/values").VFloat64<number, "required">;
        estimatedCostCents: import("convex/values").VFloat64<number, "required">;
        meetingCreatedCount: import("convex/values").VFloat64<number, "optional">;
        meetingReminderCount: import("convex/values").VFloat64<number, "optional">;
        morningDigestCount: import("convex/values").VFloat64<number, "optional">;
    }, "required", "userId" | "estimatedCostCents" | "date" | "totalMessages" | "successfulMessages" | "failedMessages" | "totalSegments" | "meetingCreatedCount" | "meetingReminderCount" | "morningDigestCount">, {
        by_user: ["userId", "_creationTime"];
        by_user_date: ["userId", "date", "_creationTime"];
        by_date: ["date", "_creationTime"];
    }, {}, {}>;
    embeddings: import("convex/server").TableDefinition<import("convex/values").Validator<Record<string, any>, "required", any>, {}, {}, {}>;
    gridProjects: import("convex/server").TableDefinition<import("convex/values").VObject<{
        isArchived?: boolean;
        description?: string;
        updatedAt: number;
        createdAt: number;
        name: string;
        createdBy: import("convex/values").GenericId<"users">;
        documentIds: import("convex/values").GenericId<"documents">[];
        layout: {
            name: string;
            cols: number;
            rows: number;
            gridClass: string;
        };
    }, {
        name: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "optional">;
        createdBy: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        documentIds: import("convex/values").VArray<import("convex/values").GenericId<"documents">[], import("convex/values").VId<import("convex/values").GenericId<"documents">, "required">, "required">;
        layout: import("convex/values").VObject<{
            name: string;
            cols: number;
            rows: number;
            gridClass: string;
        }, {
            cols: import("convex/values").VFloat64<number, "required">;
            rows: import("convex/values").VFloat64<number, "required">;
            gridClass: import("convex/values").VString<string, "required">;
            name: import("convex/values").VString<string, "required">;
        }, "required", "name" | "cols" | "rows" | "gridClass">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        isArchived: import("convex/values").VBoolean<boolean, "optional">;
    }, "required", "updatedAt" | "createdAt" | "name" | "createdBy" | "isArchived" | "description" | "documentIds" | "layout" | "layout.name" | "layout.cols" | "layout.rows" | "layout.gridClass">, {
        by_user: ["createdBy", "_creationTime"];
        by_user_archived: ["createdBy", "isArchived", "_creationTime"];
    }, {}, {}>;
    files: import("convex/server").TableDefinition<import("convex/values").VObject<{
        isPublic?: boolean;
        lastModified?: number;
        metadata?: any;
        description?: string;
        tags?: string[];
        analysis?: string;
        structuredData?: any;
        analysisType?: string;
        processingTime?: number;
        analyzedAt?: number;
        modificationCount?: number;
        parentFileId?: import("convex/values").GenericId<"files">;
        genaiFileName?: string;
        genaiFileUri?: string;
        cacheName?: string;
        cacheExpiresAt?: number;
        contentSummary?: string;
        textPreview?: string;
        userId: string;
        fileType: string;
        mimeType: string;
        storageId: string;
        fileName: string;
        fileSize: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        storageId: import("convex/values").VString<string, "required">;
        fileName: import("convex/values").VString<string, "required">;
        fileType: import("convex/values").VString<string, "required">;
        mimeType: import("convex/values").VString<string, "required">;
        fileSize: import("convex/values").VFloat64<number, "required">;
        analysis: import("convex/values").VString<string, "optional">;
        structuredData: import("convex/values").VAny<any, "optional", string>;
        analysisType: import("convex/values").VString<string, "optional">;
        processingTime: import("convex/values").VFloat64<number, "optional">;
        analyzedAt: import("convex/values").VFloat64<number, "optional">;
        isPublic: import("convex/values").VBoolean<boolean, "optional">;
        tags: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        description: import("convex/values").VString<string, "optional">;
        lastModified: import("convex/values").VFloat64<number, "optional">;
        modificationCount: import("convex/values").VFloat64<number, "optional">;
        parentFileId: import("convex/values").VId<import("convex/values").GenericId<"files">, "optional">;
        genaiFileName: import("convex/values").VString<string, "optional">;
        genaiFileUri: import("convex/values").VString<string, "optional">;
        cacheName: import("convex/values").VString<string, "optional">;
        cacheExpiresAt: import("convex/values").VFloat64<number, "optional">;
        metadata: import("convex/values").VAny<any, "optional", string>;
        contentSummary: import("convex/values").VString<string, "optional">;
        textPreview: import("convex/values").VString<string, "optional">;
    }, "required", "userId" | "isPublic" | "lastModified" | "fileType" | "mimeType" | "metadata" | `metadata.${string}` | "description" | "tags" | "storageId" | "fileName" | "fileSize" | "analysis" | "structuredData" | "analysisType" | "processingTime" | "analyzedAt" | "modificationCount" | "parentFileId" | "genaiFileName" | "genaiFileUri" | "cacheName" | "cacheExpiresAt" | "contentSummary" | "textPreview" | `structuredData.${string}`>, {
        by_user: ["userId", "_creationTime"];
        by_user_and_type: ["userId", "fileType", "_creationTime"];
    }, {
        search_files: {
            searchField: "fileName";
            filterFields: "userId" | "fileType";
        };
    }, {}>;
    urlAnalyses: import("convex/server").TableDefinition<import("convex/values").VObject<{
        analysis?: string;
        structuredData?: any;
        contentType?: string;
        userId: string;
        url: string;
        analyzedAt: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        url: import("convex/values").VString<string, "required">;
        analysis: import("convex/values").VString<string, "optional">;
        structuredData: import("convex/values").VAny<any, "optional", string>;
        analyzedAt: import("convex/values").VFloat64<number, "required">;
        contentType: import("convex/values").VString<string, "optional">;
    }, "required", "userId" | "url" | "analysis" | "structuredData" | "analyzedAt" | `structuredData.${string}` | "contentType">, {
        by_user: ["userId", "_creationTime"];
        by_url: ["url", "_creationTime"];
    }, {}, {}>;
    chunks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        meta?: any;
        text: string;
        fileId: import("convex/values").GenericId<"files">;
        embedding: number[];
    }, {
        fileId: import("convex/values").VId<import("convex/values").GenericId<"files">, "required">;
        text: import("convex/values").VString<string, "required">;
        meta: import("convex/values").VAny<any, "optional", string>;
        embedding: import("convex/values").VArray<number[], import("convex/values").VFloat64<number, "required">, "required">;
    }, "required", "text" | "fileId" | "meta" | "embedding" | `meta.${string}`>, {
        by_file: ["fileId", "_creationTime"];
    }, {}, {}>;
    folders: import("convex/server").TableDefinition<import("convex/values").VObject<{
        isExpanded?: boolean;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        name: string;
        color: string;
    }, {
        name: import("convex/values").VString<string, "required">;
        color: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        isExpanded: import("convex/values").VBoolean<boolean, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "name" | "color" | "isExpanded">, {
        by_user: ["userId", "_creationTime"];
        by_user_name: ["userId", "name", "_creationTime"];
    }, {}, {}>;
    documentFolders: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId: import("convex/values").GenericId<"users">;
        addedAt: number;
        documentId: import("convex/values").GenericId<"documents">;
        folderId: import("convex/values").GenericId<"folders">;
    }, {
        documentId: import("convex/values").VId<import("convex/values").GenericId<"documents">, "required">;
        folderId: import("convex/values").VId<import("convex/values").GenericId<"folders">, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        addedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "addedAt" | "documentId" | "folderId">, {
        by_document: ["documentId", "_creationTime"];
        by_folder: ["folderId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_document_folder: ["documentId", "folderId", "_creationTime"];
    }, {}, {}>;
    userPreferences: import("convex/server").TableDefinition<import("convex/values").VObject<{
        ungroupedSectionName?: string;
        isUngroupedExpanded?: boolean;
        organizationMode?: string;
        iconOrder?: string[];
        docOrderByGroup?: Record<string, import("convex/values").GenericId<"documents">[]>;
        docOrderByFilter?: Record<string, import("convex/values").GenericId<"documents">[]>;
        docOrderBySegmented?: Record<string, import("convex/values").GenericId<"documents">[]>;
        linkReminderOptOut?: boolean;
        calendarHubSizePct?: number;
        plannerMode?: "list" | "calendar" | "kanban" | "weekly";
        timeZone?: string;
        plannerDensity?: "comfortable" | "compact";
        showWeekInAgenda?: boolean;
        agendaMode?: "list" | "kanban" | "weekly" | "mini";
        agendaSelectedDateMs?: number;
        upcomingMode?: "list" | "mini";
        kanbanLaneTitles?: {
            todo: string;
            in_progress: string;
            done: string;
            blocked: string;
        };
        agendaListOrder?: string[];
        upcomingListOrder?: string[];
        agentsPrefs?: Record<string, string>;
        trackedHashtags?: string[];
        techStack?: string[];
        gmailIngestEnabled?: boolean;
        gcalSyncEnabled?: boolean;
        calendarAutoAddMode?: "auto" | "propose";
        onboardingSeededAt?: number;
        phoneNumber?: string;
        smsNotificationsEnabled?: boolean;
        smsMeetingCreated?: boolean;
        smsMeetingReminder?: boolean;
        smsMorningDigest?: boolean;
        smsReminderMinutes?: number;
        themeMode?: "system" | "light" | "dark";
        themeAccentColor?: string;
        themeDensity?: "comfortable" | "compact" | "spacious";
        themeFontFamily?: string;
        themeBackgroundPattern?: string;
        themeReducedMotion?: boolean;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        ungroupedSectionName: import("convex/values").VString<string, "optional">;
        isUngroupedExpanded: import("convex/values").VBoolean<boolean, "optional">;
        organizationMode: import("convex/values").VString<string, "optional">;
        iconOrder: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        docOrderByGroup: import("convex/values").VRecord<Record<string, import("convex/values").GenericId<"documents">[]>, import("convex/values").VString<string, "required">, import("convex/values").VArray<import("convex/values").GenericId<"documents">[], import("convex/values").VId<import("convex/values").GenericId<"documents">, "required">, "required">, "optional", string>;
        docOrderByFilter: import("convex/values").VRecord<Record<string, import("convex/values").GenericId<"documents">[]>, import("convex/values").VString<string, "required">, import("convex/values").VArray<import("convex/values").GenericId<"documents">[], import("convex/values").VId<import("convex/values").GenericId<"documents">, "required">, "required">, "optional", string>;
        docOrderBySegmented: import("convex/values").VRecord<Record<string, import("convex/values").GenericId<"documents">[]>, import("convex/values").VString<string, "required">, import("convex/values").VArray<import("convex/values").GenericId<"documents">[], import("convex/values").VId<import("convex/values").GenericId<"documents">, "required">, "required">, "optional", string>;
        linkReminderOptOut: import("convex/values").VBoolean<boolean, "optional">;
        calendarHubSizePct: import("convex/values").VFloat64<number, "optional">;
        plannerMode: import("convex/values").VUnion<"list" | "calendar" | "kanban" | "weekly", [import("convex/values").VLiteral<"list", "required">, import("convex/values").VLiteral<"calendar", "required">, import("convex/values").VLiteral<"kanban", "required">, import("convex/values").VLiteral<"weekly", "required">], "optional", never>;
        timeZone: import("convex/values").VString<string, "optional">;
        plannerDensity: import("convex/values").VUnion<"comfortable" | "compact", [import("convex/values").VLiteral<"comfortable", "required">, import("convex/values").VLiteral<"compact", "required">], "optional", never>;
        showWeekInAgenda: import("convex/values").VBoolean<boolean, "optional">;
        agendaMode: import("convex/values").VUnion<"list" | "kanban" | "weekly" | "mini", [import("convex/values").VLiteral<"list", "required">, import("convex/values").VLiteral<"kanban", "required">, import("convex/values").VLiteral<"weekly", "required">, import("convex/values").VLiteral<"mini", "required">], "optional", never>;
        agendaSelectedDateMs: import("convex/values").VFloat64<number, "optional">;
        upcomingMode: import("convex/values").VUnion<"list" | "mini", [import("convex/values").VLiteral<"list", "required">, import("convex/values").VLiteral<"mini", "required">], "optional", never>;
        kanbanLaneTitles: import("convex/values").VObject<{
            todo: string;
            in_progress: string;
            done: string;
            blocked: string;
        }, {
            todo: import("convex/values").VString<string, "required">;
            in_progress: import("convex/values").VString<string, "required">;
            done: import("convex/values").VString<string, "required">;
            blocked: import("convex/values").VString<string, "required">;
        }, "optional", "todo" | "in_progress" | "done" | "blocked">;
        agendaListOrder: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        upcomingListOrder: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        agentsPrefs: import("convex/values").VRecord<Record<string, string>, import("convex/values").VString<string, "required">, import("convex/values").VString<string, "required">, "optional", string>;
        trackedHashtags: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        techStack: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        gmailIngestEnabled: import("convex/values").VBoolean<boolean, "optional">;
        gcalSyncEnabled: import("convex/values").VBoolean<boolean, "optional">;
        calendarAutoAddMode: import("convex/values").VUnion<"auto" | "propose", [import("convex/values").VLiteral<"auto", "required">, import("convex/values").VLiteral<"propose", "required">], "optional", never>;
        onboardingSeededAt: import("convex/values").VFloat64<number, "optional">;
        phoneNumber: import("convex/values").VString<string, "optional">;
        smsNotificationsEnabled: import("convex/values").VBoolean<boolean, "optional">;
        smsMeetingCreated: import("convex/values").VBoolean<boolean, "optional">;
        smsMeetingReminder: import("convex/values").VBoolean<boolean, "optional">;
        smsMorningDigest: import("convex/values").VBoolean<boolean, "optional">;
        smsReminderMinutes: import("convex/values").VFloat64<number, "optional">;
        themeMode: import("convex/values").VUnion<"system" | "light" | "dark", [import("convex/values").VLiteral<"light", "required">, import("convex/values").VLiteral<"dark", "required">, import("convex/values").VLiteral<"system", "required">], "optional", never>;
        themeAccentColor: import("convex/values").VString<string, "optional">;
        themeDensity: import("convex/values").VUnion<"comfortable" | "compact" | "spacious", [import("convex/values").VLiteral<"comfortable", "required">, import("convex/values").VLiteral<"compact", "required">, import("convex/values").VLiteral<"spacious", "required">], "optional", never>;
        themeFontFamily: import("convex/values").VString<string, "optional">;
        themeBackgroundPattern: import("convex/values").VString<string, "optional">;
        themeReducedMotion: import("convex/values").VBoolean<boolean, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "ungroupedSectionName" | "isUngroupedExpanded" | "organizationMode" | "iconOrder" | "docOrderByGroup" | "docOrderByFilter" | "docOrderBySegmented" | "linkReminderOptOut" | "calendarHubSizePct" | "plannerMode" | "timeZone" | "plannerDensity" | "showWeekInAgenda" | "agendaMode" | "agendaSelectedDateMs" | "upcomingMode" | "kanbanLaneTitles" | "agendaListOrder" | "upcomingListOrder" | "agentsPrefs" | "trackedHashtags" | "techStack" | "gmailIngestEnabled" | "gcalSyncEnabled" | "calendarAutoAddMode" | "onboardingSeededAt" | "phoneNumber" | "smsNotificationsEnabled" | "smsMeetingCreated" | "smsMeetingReminder" | "smsMorningDigest" | "smsReminderMinutes" | "themeMode" | "themeAccentColor" | "themeDensity" | "themeFontFamily" | "themeBackgroundPattern" | "themeReducedMotion" | `docOrderByGroup.${string}` | `docOrderByFilter.${string}` | `docOrderBySegmented.${string}` | "kanbanLaneTitles.todo" | "kanbanLaneTitles.in_progress" | "kanbanLaneTitles.done" | "kanbanLaneTitles.blocked" | `agentsPrefs.${string}`>, {
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    quickCaptures: import("convex/server").TableDefinition<import("convex/values").VObject<{
        updatedAt?: number;
        title?: string;
        metadata?: any;
        tags?: string[];
        audioUrl?: string;
        audioStorageId?: import("convex/values").GenericId<"_storage">;
        screenshotUrl?: string;
        screenshotStorageId?: import("convex/values").GenericId<"_storage">;
        annotations?: any;
        transcription?: string;
        linkedDocumentId?: import("convex/values").GenericId<"documents">;
        userId: import("convex/values").GenericId<"users">;
        type: "note" | "task" | "voice" | "screenshot";
        createdAt: number;
        content: string;
        processed: boolean;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        type: import("convex/values").VUnion<"note" | "task" | "voice" | "screenshot", [import("convex/values").VLiteral<"note", "required">, import("convex/values").VLiteral<"task", "required">, import("convex/values").VLiteral<"voice", "required">, import("convex/values").VLiteral<"screenshot", "required">], "required", never>;
        content: import("convex/values").VString<string, "required">;
        title: import("convex/values").VString<string, "optional">;
        audioUrl: import("convex/values").VString<string, "optional">;
        audioStorageId: import("convex/values").VId<import("convex/values").GenericId<"_storage">, "optional">;
        screenshotUrl: import("convex/values").VString<string, "optional">;
        screenshotStorageId: import("convex/values").VId<import("convex/values").GenericId<"_storage">, "optional">;
        annotations: import("convex/values").VAny<any, "optional", string>;
        transcription: import("convex/values").VString<string, "optional">;
        processed: import("convex/values").VBoolean<boolean, "required">;
        linkedDocumentId: import("convex/values").VId<import("convex/values").GenericId<"documents">, "optional">;
        tags: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        metadata: import("convex/values").VAny<any, "optional", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "userId" | "type" | "updatedAt" | "createdAt" | "title" | "content" | "metadata" | `metadata.${string}` | "tags" | "audioUrl" | "audioStorageId" | "screenshotUrl" | "screenshotStorageId" | "annotations" | "transcription" | "processed" | "linkedDocumentId" | `annotations.${string}`>, {
        by_user: ["userId", "_creationTime"];
        by_user_type: ["userId", "type", "_creationTime"];
        by_user_created: ["userId", "createdAt", "_creationTime"];
        by_processed: ["userId", "processed", "_creationTime"];
    }, {}, {}>;
    userBehaviorEvents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        metadata?: any;
        entityId?: string;
        userId: import("convex/values").GenericId<"users">;
        eventType: "document_created" | "document_viewed" | "document_edited" | "task_completed" | "task_created" | "agent_interaction" | "search_performed" | "calendar_event_ended" | "quick_capture";
        timestamp: number;
        timeOfDay: string;
        dayOfWeek: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        eventType: import("convex/values").VUnion<"document_created" | "document_viewed" | "document_edited" | "task_completed" | "task_created" | "agent_interaction" | "search_performed" | "calendar_event_ended" | "quick_capture", [import("convex/values").VLiteral<"document_created", "required">, import("convex/values").VLiteral<"document_viewed", "required">, import("convex/values").VLiteral<"document_edited", "required">, import("convex/values").VLiteral<"task_completed", "required">, import("convex/values").VLiteral<"task_created", "required">, import("convex/values").VLiteral<"agent_interaction", "required">, import("convex/values").VLiteral<"search_performed", "required">, import("convex/values").VLiteral<"calendar_event_ended", "required">, import("convex/values").VLiteral<"quick_capture", "required">], "required", never>;
        entityId: import("convex/values").VString<string, "optional">;
        metadata: import("convex/values").VAny<any, "optional", string>;
        timestamp: import("convex/values").VFloat64<number, "required">;
        timeOfDay: import("convex/values").VString<string, "required">;
        dayOfWeek: import("convex/values").VString<string, "required">;
    }, "required", "userId" | "metadata" | `metadata.${string}` | "eventType" | "timestamp" | "entityId" | "timeOfDay" | "dayOfWeek">, {
        by_user_time: ["userId", "timestamp", "_creationTime"];
        by_user_type: ["userId", "eventType", "_creationTime"];
        by_entity: ["entityId", "_creationTime"];
    }, {}, {}>;
    recommendations: import("convex/server").TableDefinition<import("convex/values").VObject<{
        icon?: string;
        actionType?: string;
        actionData?: any;
        clicked?: boolean;
        userId: import("convex/values").GenericId<"users">;
        type: "pattern" | "idle_content" | "collaboration" | "external_trigger" | "smart_suggestion";
        createdAt: number;
        expiresAt: number;
        priority: "high" | "medium" | "low";
        message: string;
        actionLabel: string;
        dismissed: boolean;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        type: import("convex/values").VUnion<"pattern" | "idle_content" | "collaboration" | "external_trigger" | "smart_suggestion", [import("convex/values").VLiteral<"pattern", "required">, import("convex/values").VLiteral<"idle_content", "required">, import("convex/values").VLiteral<"collaboration", "required">, import("convex/values").VLiteral<"external_trigger", "required">, import("convex/values").VLiteral<"smart_suggestion", "required">], "required", never>;
        priority: import("convex/values").VUnion<"high" | "medium" | "low", [import("convex/values").VLiteral<"high", "required">, import("convex/values").VLiteral<"medium", "required">, import("convex/values").VLiteral<"low", "required">], "required", never>;
        message: import("convex/values").VString<string, "required">;
        actionLabel: import("convex/values").VString<string, "required">;
        actionType: import("convex/values").VString<string, "optional">;
        actionData: import("convex/values").VAny<any, "optional", string>;
        icon: import("convex/values").VString<string, "optional">;
        dismissed: import("convex/values").VBoolean<boolean, "required">;
        clicked: import("convex/values").VBoolean<boolean, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        expiresAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "type" | "icon" | "createdAt" | "expiresAt" | "priority" | "message" | "actionLabel" | "actionType" | "actionData" | "dismissed" | "clicked" | `actionData.${string}`>, {
        by_user_active: ["userId", "dismissed", "expiresAt", "_creationTime"];
        by_user_created: ["userId", "createdAt", "_creationTime"];
    }, {}, {}>;
    userTeachings: import("convex/server").TableDefinition<import("convex/values").VObject<{
        source?: "explicit" | "inferred";
        embedding?: number[];
        steps?: string[];
        key?: string;
        threadId?: string;
        confidence?: number;
        category?: string;
        usageCount?: number;
        triggerPhrases?: string[];
        lastUsedAt?: number;
        archivedAt?: number;
        userId: import("convex/values").GenericId<"users">;
        type: "fact" | "preference" | "skill";
        createdAt: number;
        content: string;
        status: "active" | "archived";
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        type: import("convex/values").VUnion<"fact" | "preference" | "skill", [import("convex/values").VLiteral<"fact", "required">, import("convex/values").VLiteral<"preference", "required">, import("convex/values").VLiteral<"skill", "required">], "required", never>;
        category: import("convex/values").VString<string, "optional">;
        key: import("convex/values").VString<string, "optional">;
        content: import("convex/values").VString<string, "required">;
        embedding: import("convex/values").VArray<number[], import("convex/values").VFloat64<number, "required">, "optional">;
        status: import("convex/values").VUnion<"active" | "archived", [import("convex/values").VLiteral<"active", "required">, import("convex/values").VLiteral<"archived", "required">], "required", never>;
        source: import("convex/values").VUnion<"explicit" | "inferred", [import("convex/values").VLiteral<"explicit", "required">, import("convex/values").VLiteral<"inferred", "required">], "optional", never>;
        steps: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        triggerPhrases: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        confidence: import("convex/values").VFloat64<number, "optional">;
        usageCount: import("convex/values").VFloat64<number, "optional">;
        lastUsedAt: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        archivedAt: import("convex/values").VFloat64<number, "optional">;
        threadId: import("convex/values").VString<string, "optional">;
    }, "required", "userId" | "type" | "source" | "createdAt" | "content" | "status" | "embedding" | "steps" | "key" | "threadId" | "confidence" | "category" | "usageCount" | "triggerPhrases" | "lastUsedAt" | "archivedAt">, {
        by_user: ["userId", "_creationTime"];
        by_user_type: ["userId", "type", "_creationTime"];
        by_user_category: ["userId", "category", "_creationTime"];
        by_user_status: ["userId", "status", "_creationTime"];
    }, {}, {
        by_embedding: {
            vectorField: "embedding";
            dimensions: number;
            filterFields: never;
        };
    }>;
    events: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string;
        documentId?: import("convex/values").GenericId<"documents">;
        tags?: string[];
        status?: "cancelled" | "confirmed" | "tentative";
        meta?: any;
        color?: string;
        sourceType?: "gmail" | "gcal" | "doc";
        descriptionJson?: string;
        endTime?: number;
        allDay?: boolean;
        location?: string;
        recurrence?: string;
        sourceId?: string;
        ingestionConfidence?: "high" | "low" | "med";
        proposed?: boolean;
        rawSummary?: string;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        title: string;
        startTime: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        title: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "optional">;
        descriptionJson: import("convex/values").VString<string, "optional">;
        startTime: import("convex/values").VFloat64<number, "required">;
        endTime: import("convex/values").VFloat64<number, "optional">;
        allDay: import("convex/values").VBoolean<boolean, "optional">;
        location: import("convex/values").VString<string, "optional">;
        status: import("convex/values").VUnion<"cancelled" | "confirmed" | "tentative", [import("convex/values").VLiteral<"confirmed", "required">, import("convex/values").VLiteral<"tentative", "required">, import("convex/values").VLiteral<"cancelled", "required">], "optional", never>;
        color: import("convex/values").VString<string, "optional">;
        documentId: import("convex/values").VId<import("convex/values").GenericId<"documents">, "optional">;
        tags: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        recurrence: import("convex/values").VString<string, "optional">;
        sourceType: import("convex/values").VUnion<"gmail" | "gcal" | "doc", [import("convex/values").VLiteral<"gmail", "required">, import("convex/values").VLiteral<"gcal", "required">, import("convex/values").VLiteral<"doc", "required">], "optional", never>;
        sourceId: import("convex/values").VString<string, "optional">;
        ingestionConfidence: import("convex/values").VUnion<"high" | "low" | "med", [import("convex/values").VLiteral<"low", "required">, import("convex/values").VLiteral<"med", "required">, import("convex/values").VLiteral<"high", "required">], "optional", never>;
        proposed: import("convex/values").VBoolean<boolean, "optional">;
        rawSummary: import("convex/values").VString<string, "optional">;
        meta: import("convex/values").VAny<any, "optional", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "title" | "description" | "documentId" | "tags" | "status" | "meta" | `meta.${string}` | "color" | "sourceType" | "descriptionJson" | "startTime" | "endTime" | "allDay" | "location" | "recurrence" | "sourceId" | "ingestionConfidence" | "proposed" | "rawSummary">, {
        by_user: ["userId", "_creationTime"];
        by_user_status: ["userId", "status", "_creationTime"];
        by_user_start: ["userId", "startTime", "_creationTime"];
        by_document: ["documentId", "_creationTime"];
        by_user_source: ["userId", "sourceType", "sourceId", "_creationTime"];
    }, {}, {}>;
    userEvents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        isFavorite?: boolean;
        description?: string;
        documentId?: import("convex/values").GenericId<"documents">;
        order?: number;
        tags?: string[];
        eventId?: import("convex/values").GenericId<"events">;
        color?: string;
        priority?: "high" | "medium" | "low" | "urgent";
        descriptionJson?: string;
        dueDate?: number;
        startDate?: number;
        assigneeId?: import("convex/values").GenericId<"users">;
        refs?: ({
            id: import("convex/values").GenericId<"documents">;
            kind: "document";
        } | {
            id: import("convex/values").GenericId<"userEvents">;
            kind: "userEvent";
        } | {
            id: import("convex/values").GenericId<"events">;
            kind: "event";
        })[];
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        title: string;
        status: "todo" | "in_progress" | "done" | "blocked";
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        title: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "optional">;
        descriptionJson: import("convex/values").VString<string, "optional">;
        status: import("convex/values").VUnion<"todo" | "in_progress" | "done" | "blocked", [import("convex/values").VLiteral<"todo", "required">, import("convex/values").VLiteral<"in_progress", "required">, import("convex/values").VLiteral<"done", "required">, import("convex/values").VLiteral<"blocked", "required">], "required", never>;
        priority: import("convex/values").VUnion<"high" | "medium" | "low" | "urgent", [import("convex/values").VLiteral<"low", "required">, import("convex/values").VLiteral<"medium", "required">, import("convex/values").VLiteral<"high", "required">, import("convex/values").VLiteral<"urgent", "required">], "optional", never>;
        dueDate: import("convex/values").VFloat64<number, "optional">;
        startDate: import("convex/values").VFloat64<number, "optional">;
        documentId: import("convex/values").VId<import("convex/values").GenericId<"documents">, "optional">;
        eventId: import("convex/values").VId<import("convex/values").GenericId<"events">, "optional">;
        assigneeId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        refs: import("convex/values").VArray<({
            id: import("convex/values").GenericId<"documents">;
            kind: "document";
        } | {
            id: import("convex/values").GenericId<"userEvents">;
            kind: "userEvent";
        } | {
            id: import("convex/values").GenericId<"events">;
            kind: "event";
        })[], import("convex/values").VUnion<{
            id: import("convex/values").GenericId<"documents">;
            kind: "document";
        } | {
            id: import("convex/values").GenericId<"userEvents">;
            kind: "userEvent";
        } | {
            id: import("convex/values").GenericId<"events">;
            kind: "event";
        }, [import("convex/values").VObject<{
            id: import("convex/values").GenericId<"documents">;
            kind: "document";
        }, {
            kind: import("convex/values").VLiteral<"document", "required">;
            id: import("convex/values").VId<import("convex/values").GenericId<"documents">, "required">;
        }, "required", "id" | "kind">, import("convex/values").VObject<{
            id: import("convex/values").GenericId<"userEvents">;
            kind: "userEvent";
        }, {
            kind: import("convex/values").VLiteral<"userEvent", "required">;
            id: import("convex/values").VId<import("convex/values").GenericId<"userEvents">, "required">;
        }, "required", "id" | "kind">, import("convex/values").VObject<{
            id: import("convex/values").GenericId<"events">;
            kind: "event";
        }, {
            kind: import("convex/values").VLiteral<"event", "required">;
            id: import("convex/values").VId<import("convex/values").GenericId<"events">, "required">;
        }, "required", "id" | "kind">], "required", "id" | "kind">, "optional">;
        tags: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        color: import("convex/values").VString<string, "optional">;
        isFavorite: import("convex/values").VBoolean<boolean, "optional">;
        order: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "title" | "isFavorite" | "description" | "documentId" | "order" | "tags" | "status" | "eventId" | "color" | "priority" | "descriptionJson" | "dueDate" | "startDate" | "assigneeId" | "refs">, {
        by_user: ["userId", "_creationTime"];
        by_user_status: ["userId", "status", "_creationTime"];
        by_user_dueDate: ["userId", "dueDate", "_creationTime"];
        by_user_priority: ["userId", "priority", "_creationTime"];
        by_user_updatedAt: ["userId", "updatedAt", "_creationTime"];
        by_user_assignee: ["userId", "assigneeId", "_creationTime"];
        by_document: ["documentId", "_creationTime"];
    }, {}, {}>;
    holidays: import("convex/server").TableDefinition<import("convex/values").VObject<{
        types?: string[];
        raw?: any;
        updatedAt: number;
        name: string;
        country: string;
        dateMs: number;
        dateKey: string;
        year: number;
    }, {
        country: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "required">;
        dateMs: import("convex/values").VFloat64<number, "required">;
        dateKey: import("convex/values").VString<string, "required">;
        types: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        year: import("convex/values").VFloat64<number, "required">;
        raw: import("convex/values").VAny<any, "optional", string>;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "updatedAt" | "name" | "country" | "dateMs" | "dateKey" | "types" | "year" | "raw" | `raw.${string}`>, {
        by_country_date: ["country", "dateMs", "_creationTime"];
        by_country_year: ["country", "year", "_creationTime"];
        by_date: ["dateMs", "_creationTime"];
    }, {}, {}>;
    financialEvents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        symbol?: string;
        raw?: any;
        time?: string;
        updatedAt: number;
        title: string;
        category: string;
        dateMs: number;
        dateKey: string;
        market: string;
    }, {
        market: import("convex/values").VString<string, "required">;
        category: import("convex/values").VString<string, "required">;
        title: import("convex/values").VString<string, "required">;
        dateMs: import("convex/values").VFloat64<number, "required">;
        dateKey: import("convex/values").VString<string, "required">;
        time: import("convex/values").VString<string, "optional">;
        symbol: import("convex/values").VString<string, "optional">;
        raw: import("convex/values").VAny<any, "optional", string>;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "symbol" | "updatedAt" | "title" | "category" | "dateMs" | "dateKey" | "raw" | `raw.${string}` | "market" | "time">, {
        by_market_date: ["market", "dateMs", "_creationTime"];
        by_category_date: ["category", "dateMs", "_creationTime"];
    }, {}, {}>;
    mcpServers: import("convex/server").TableDefinition<import("convex/values").VObject<{
        url?: string;
        description?: string;
        apiKey?: string;
        connectionStatus?: string;
        isEnabled?: boolean;
        lastConnected?: number;
        transport?: string;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        name: string;
    }, {
        name: import("convex/values").VString<string, "required">;
        url: import("convex/values").VString<string, "optional">;
        apiKey: import("convex/values").VString<string, "optional">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        connectionStatus: import("convex/values").VString<string, "optional">;
        description: import("convex/values").VString<string, "optional">;
        isEnabled: import("convex/values").VBoolean<boolean, "optional">;
        lastConnected: import("convex/values").VFloat64<number, "optional">;
        transport: import("convex/values").VString<string, "optional">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "name" | "url" | "description" | "apiKey" | "connectionStatus" | "isEnabled" | "lastConnected" | "transport">, {
        by_user: ["userId", "_creationTime"];
        by_name: ["name", "_creationTime"];
        by_user_name: ["userId", "name", "_creationTime"];
    }, {}, {}>;
    mcpTools: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string;
        isEnabled?: boolean;
        schema?: any;
        lastUsed?: number;
        usageCount?: number;
        updatedAt: number;
        createdAt: number;
        name: string;
        serverId: import("convex/values").GenericId<"mcpServers">;
        isAvailable: boolean;
    }, {
        serverId: import("convex/values").VId<import("convex/values").GenericId<"mcpServers">, "required">;
        name: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "optional">;
        schema: import("convex/values").VAny<any, "optional", string>;
        isAvailable: import("convex/values").VBoolean<boolean, "required">;
        isEnabled: import("convex/values").VBoolean<boolean, "optional">;
        lastUsed: import("convex/values").VFloat64<number, "optional">;
        usageCount: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "updatedAt" | "createdAt" | "name" | "description" | "isEnabled" | "serverId" | "schema" | "isAvailable" | "lastUsed" | "usageCount" | `schema.${string}`>, {
        by_server: ["serverId", "_creationTime"];
        by_server_available: ["serverId", "isAvailable", "_creationTime"];
        by_name: ["name", "_creationTime"];
        by_server_name: ["serverId", "name", "_creationTime"];
    }, {}, {}>;
    mcpSessions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        errorMessage?: string;
        connectedAt?: number;
        disconnectedAt?: number;
        toolsAvailable?: string[];
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        status: "error" | "connecting" | "connected" | "disconnected";
        serverId: import("convex/values").GenericId<"mcpServers">;
        sessionId: string;
    }, {
        serverId: import("convex/values").VId<import("convex/values").GenericId<"mcpServers">, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        sessionId: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"error" | "connecting" | "connected" | "disconnected", [import("convex/values").VLiteral<"connecting", "required">, import("convex/values").VLiteral<"connected", "required">, import("convex/values").VLiteral<"disconnected", "required">, import("convex/values").VLiteral<"error", "required">], "required", never>;
        connectedAt: import("convex/values").VFloat64<number, "optional">;
        disconnectedAt: import("convex/values").VFloat64<number, "optional">;
        errorMessage: import("convex/values").VString<string, "optional">;
        toolsAvailable: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "status" | "errorMessage" | "serverId" | "sessionId" | "connectedAt" | "disconnectedAt" | "toolsAvailable">, {
        by_server: ["serverId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_session_id: ["sessionId", "_creationTime"];
        by_status: ["status", "_creationTime"];
    }, {}, {}>;
    mcpPlans: import("convex/server").TableDefinition<import("convex/values").VObject<{
        updatedAt: number;
        createdAt: number;
        planId: string;
        goal: string;
        steps: any;
    }, {
        planId: import("convex/values").VString<string, "required">;
        goal: import("convex/values").VString<string, "required">;
        steps: import("convex/values").VAny<any, "required", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "updatedAt" | "createdAt" | "planId" | "goal" | "steps" | `steps.${string}`>, {
        by_planId: ["planId", "_creationTime"];
    }, {}, {}>;
    mcpMemoryEntries: import("convex/server").TableDefinition<import("convex/values").VObject<{
        metadata?: any;
        updatedAt: number;
        createdAt: number;
        content: string;
        key: string;
    }, {
        key: import("convex/values").VString<string, "required">;
        content: import("convex/values").VString<string, "required">;
        metadata: import("convex/values").VAny<any, "optional", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "updatedAt" | "createdAt" | "content" | "metadata" | `metadata.${string}` | "key">, {
        by_key: ["key", "_creationTime"];
    }, {}, {}>;
    agentRuns: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        documentId?: import("convex/values").GenericId<"documents">;
        threadId?: string;
        mcpServerId?: import("convex/values").GenericId<"mcpServers">;
        model?: string;
        workflow?: string;
        args?: any;
        openaiVariant?: string;
        intent?: string;
        planExplain?: string;
        plan?: any;
        finalResponse?: string;
        errorMessage?: string;
        nextSeq?: number;
        leaseOwner?: string;
        leaseExpiresAt?: number;
        priority?: number;
        availableAt?: number;
        updatedAt: number;
        createdAt: number;
        status: "pending" | "queued" | "running" | "completed" | "error";
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        threadId: import("convex/values").VString<string, "optional">;
        documentId: import("convex/values").VId<import("convex/values").GenericId<"documents">, "optional">;
        mcpServerId: import("convex/values").VId<import("convex/values").GenericId<"mcpServers">, "optional">;
        model: import("convex/values").VString<string, "optional">;
        workflow: import("convex/values").VString<string, "optional">;
        args: import("convex/values").VAny<any, "optional", string>;
        openaiVariant: import("convex/values").VString<string, "optional">;
        status: import("convex/values").VUnion<"pending" | "queued" | "running" | "completed" | "error", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"queued", "required">, import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"error", "required">], "required", never>;
        intent: import("convex/values").VString<string, "optional">;
        planExplain: import("convex/values").VString<string, "optional">;
        plan: import("convex/values").VAny<any, "optional", string>;
        finalResponse: import("convex/values").VString<string, "optional">;
        errorMessage: import("convex/values").VString<string, "optional">;
        nextSeq: import("convex/values").VFloat64<number, "optional">;
        leaseOwner: import("convex/values").VString<string, "optional">;
        leaseExpiresAt: import("convex/values").VFloat64<number, "optional">;
        priority: import("convex/values").VFloat64<number, "optional">;
        availableAt: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "documentId" | "status" | "threadId" | "mcpServerId" | "model" | "workflow" | "args" | "openaiVariant" | "intent" | "planExplain" | "plan" | "finalResponse" | "errorMessage" | "nextSeq" | "leaseOwner" | "leaseExpiresAt" | "priority" | "availableAt" | `args.${string}` | `plan.${string}`>, {
        by_user: ["userId", "_creationTime"];
        by_threadId: ["threadId", "_creationTime"];
        by_createdAt: ["createdAt", "_creationTime"];
        by_user_createdAt: ["userId", "createdAt", "_creationTime"];
        by_status_availableAt: ["status", "availableAt", "_creationTime"];
        by_leaseExpiresAt: ["leaseExpiresAt", "_creationTime"];
    }, {}, {}>;
    sourceArtifacts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        expiresAt?: number;
        sourceUrl?: string;
        runId?: import("convex/values").GenericId<"agentRuns">;
        rawContent?: string;
        extractedData?: any;
        sourceType: "url_fetch" | "api_response" | "file_upload" | "extracted_text" | "video_transcript";
        contentHash: string;
        fetchedAt: number;
    }, {
        runId: import("convex/values").VId<import("convex/values").GenericId<"agentRuns">, "optional">;
        sourceType: import("convex/values").VUnion<"url_fetch" | "api_response" | "file_upload" | "extracted_text" | "video_transcript", [import("convex/values").VLiteral<"url_fetch", "required">, import("convex/values").VLiteral<"api_response", "required">, import("convex/values").VLiteral<"file_upload", "required">, import("convex/values").VLiteral<"extracted_text", "required">, import("convex/values").VLiteral<"video_transcript", "required">], "required", never>;
        sourceUrl: import("convex/values").VString<string, "optional">;
        contentHash: import("convex/values").VString<string, "required">;
        rawContent: import("convex/values").VString<string, "optional">;
        extractedData: import("convex/values").VAny<any, "optional", string>;
        fetchedAt: import("convex/values").VFloat64<number, "required">;
        expiresAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "expiresAt" | "sourceUrl" | "runId" | "sourceType" | "contentHash" | "rawContent" | "extractedData" | "fetchedAt" | `extractedData.${string}`>, {
        by_run: ["runId", "fetchedAt", "_creationTime"];
        by_hash: ["contentHash", "_creationTime"];
        by_sourceUrl_hash: ["sourceUrl", "contentHash", "_creationTime"];
        by_sourceUrl: ["sourceUrl", "fetchedAt", "_creationTime"];
    }, {}, {}>;
    toolHealth: import("convex/server").TableDefinition<import("convex/values").VObject<{
        lastSuccessAt?: number;
        lastFailureAt?: number;
        lastError?: string;
        consecutiveFailures?: number;
        circuitOpenedAt?: number;
        toolName: string;
        successCount: number;
        failureCount: number;
        avgLatencyMs: number;
        circuitOpen: boolean;
    }, {
        toolName: import("convex/values").VString<string, "required">;
        successCount: import("convex/values").VFloat64<number, "required">;
        failureCount: import("convex/values").VFloat64<number, "required">;
        avgLatencyMs: import("convex/values").VFloat64<number, "required">;
        lastSuccessAt: import("convex/values").VFloat64<number, "optional">;
        lastFailureAt: import("convex/values").VFloat64<number, "optional">;
        lastError: import("convex/values").VString<string, "optional">;
        consecutiveFailures: import("convex/values").VFloat64<number, "optional">;
        circuitOpen: import("convex/values").VBoolean<boolean, "required">;
        circuitOpenedAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "toolName" | "successCount" | "failureCount" | "avgLatencyMs" | "lastSuccessAt" | "lastFailureAt" | "lastError" | "consecutiveFailures" | "circuitOpen" | "circuitOpenedAt">, {
        by_toolName: ["toolName", "_creationTime"];
        by_circuitOpen: ["circuitOpen", "toolName", "_creationTime"];
    }, {}, {}>;
    agentRunEvents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        message?: string;
        data?: any;
        createdAt: number;
        kind: string;
        runId: import("convex/values").GenericId<"agentRuns">;
        seq: number;
    }, {
        runId: import("convex/values").VId<import("convex/values").GenericId<"agentRuns">, "required">;
        seq: import("convex/values").VFloat64<number, "required">;
        kind: import("convex/values").VString<string, "required">;
        message: import("convex/values").VString<string, "optional">;
        data: import("convex/values").VAny<any, "optional", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "kind" | "runId" | "seq" | "message" | "data" | `data.${string}`>, {
        by_run: ["runId", "seq", "_creationTime"];
    }, {}, {}>;
    instagramPosts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        thumbnailUrl?: string;
        errorMessage?: string;
        shortcode?: string;
        caption?: string;
        transcript?: string;
        extractedClaims?: {
            sourceTimestamp?: number;
            category?: string;
            claim: string;
            confidence: number;
        }[];
        mediaStorageId?: import("convex/values").GenericId<"_storage">;
        authorUsername?: string;
        authorFullName?: string;
        likeCount?: number;
        commentCount?: number;
        postedAt?: number;
        userId: import("convex/values").GenericId<"users">;
        status: "pending" | "completed" | "error" | "transcribing" | "analyzing";
        fetchedAt: number;
        postUrl: string;
        mediaType: "image" | "video" | "carousel";
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        postUrl: import("convex/values").VString<string, "required">;
        shortcode: import("convex/values").VString<string, "optional">;
        mediaType: import("convex/values").VUnion<"image" | "video" | "carousel", [import("convex/values").VLiteral<"image", "required">, import("convex/values").VLiteral<"video", "required">, import("convex/values").VLiteral<"carousel", "required">], "required", never>;
        caption: import("convex/values").VString<string, "optional">;
        transcript: import("convex/values").VString<string, "optional">;
        extractedClaims: import("convex/values").VArray<{
            sourceTimestamp?: number;
            category?: string;
            claim: string;
            confidence: number;
        }[], import("convex/values").VObject<{
            sourceTimestamp?: number;
            category?: string;
            claim: string;
            confidence: number;
        }, {
            claim: import("convex/values").VString<string, "required">;
            confidence: import("convex/values").VFloat64<number, "required">;
            sourceTimestamp: import("convex/values").VFloat64<number, "optional">;
            category: import("convex/values").VString<string, "optional">;
        }, "required", "claim" | "confidence" | "sourceTimestamp" | "category">, "optional">;
        mediaStorageId: import("convex/values").VId<import("convex/values").GenericId<"_storage">, "optional">;
        thumbnailUrl: import("convex/values").VString<string, "optional">;
        authorUsername: import("convex/values").VString<string, "optional">;
        authorFullName: import("convex/values").VString<string, "optional">;
        likeCount: import("convex/values").VFloat64<number, "optional">;
        commentCount: import("convex/values").VFloat64<number, "optional">;
        postedAt: import("convex/values").VFloat64<number, "optional">;
        fetchedAt: import("convex/values").VFloat64<number, "required">;
        status: import("convex/values").VUnion<"pending" | "completed" | "error" | "transcribing" | "analyzing", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"transcribing", "required">, import("convex/values").VLiteral<"analyzing", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"error", "required">], "required", never>;
        errorMessage: import("convex/values").VString<string, "optional">;
    }, "required", "userId" | "thumbnailUrl" | "status" | "errorMessage" | "fetchedAt" | "postUrl" | "shortcode" | "mediaType" | "caption" | "transcript" | "extractedClaims" | "mediaStorageId" | "authorUsername" | "authorFullName" | "likeCount" | "commentCount" | "postedAt">, {
        by_user: ["userId", "_creationTime"];
        by_url: ["postUrl", "_creationTime"];
        by_shortcode: ["shortcode", "_creationTime"];
        by_status: ["status", "_creationTime"];
    }, {}, {}>;
    agentDelegations: import("convex/server").TableDefinition<import("convex/values").VObject<{
        errorMessage?: string;
        startedAt?: number;
        finishedAt?: number;
        subagentThreadId?: string;
        finalPatchRef?: string;
        mergeStatus?: "pending" | "merged" | "rejected";
        userId: import("convex/values").GenericId<"users">;
        status: "running" | "completed" | "scheduled" | "failed" | "cancelled";
        runId: string;
        delegationId: string;
        agentName: "DocumentAgent" | "MediaAgent" | "SECAgent" | "OpenBBAgent" | "EntityResearchAgent";
        query: string;
        scheduledAt: number;
    }, {
        runId: import("convex/values").VString<string, "required">;
        delegationId: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        agentName: import("convex/values").VUnion<"DocumentAgent" | "MediaAgent" | "SECAgent" | "OpenBBAgent" | "EntityResearchAgent", [import("convex/values").VLiteral<"DocumentAgent", "required">, import("convex/values").VLiteral<"MediaAgent", "required">, import("convex/values").VLiteral<"SECAgent", "required">, import("convex/values").VLiteral<"OpenBBAgent", "required">, import("convex/values").VLiteral<"EntityResearchAgent", "required">], "required", never>;
        query: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"running" | "completed" | "scheduled" | "failed" | "cancelled", [import("convex/values").VLiteral<"scheduled", "required">, import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"cancelled", "required">], "required", never>;
        scheduledAt: import("convex/values").VFloat64<number, "required">;
        startedAt: import("convex/values").VFloat64<number, "optional">;
        finishedAt: import("convex/values").VFloat64<number, "optional">;
        subagentThreadId: import("convex/values").VString<string, "optional">;
        finalPatchRef: import("convex/values").VString<string, "optional">;
        errorMessage: import("convex/values").VString<string, "optional">;
        mergeStatus: import("convex/values").VUnion<"pending" | "merged" | "rejected", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"merged", "required">, import("convex/values").VLiteral<"rejected", "required">], "optional", never>;
    }, "required", "userId" | "status" | "errorMessage" | "runId" | "delegationId" | "agentName" | "query" | "scheduledAt" | "startedAt" | "finishedAt" | "subagentThreadId" | "finalPatchRef" | "mergeStatus">, {
        by_run: ["runId", "_creationTime"];
        by_run_status: ["runId", "status", "_creationTime"];
        by_user_run: ["userId", "runId", "_creationTime"];
        by_delegation: ["delegationId", "_creationTime"];
    }, {}, {}>;
    agentWriteEvents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        toolName?: string;
        metadata?: any;
        textChunk?: string;
        createdAt: number;
        kind: "delta" | "tool_start" | "tool_end" | "note" | "final";
        seq: number;
        delegationId: string;
    }, {
        delegationId: import("convex/values").VString<string, "required">;
        seq: import("convex/values").VFloat64<number, "required">;
        kind: import("convex/values").VUnion<"delta" | "tool_start" | "tool_end" | "note" | "final", [import("convex/values").VLiteral<"delta", "required">, import("convex/values").VLiteral<"tool_start", "required">, import("convex/values").VLiteral<"tool_end", "required">, import("convex/values").VLiteral<"note", "required">, import("convex/values").VLiteral<"final", "required">], "required", never>;
        textChunk: import("convex/values").VString<string, "optional">;
        toolName: import("convex/values").VString<string, "optional">;
        metadata: import("convex/values").VAny<any, "optional", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "toolName" | "metadata" | `metadata.${string}` | "kind" | "seq" | "delegationId" | "textChunk">, {
        by_delegation: ["delegationId", "seq", "_creationTime"];
    }, {}, {}>;
    fileSearchStores: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        storeName: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        storeName: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "storeName">, {
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    chatThreadsStream: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        agentThreadId?: string;
        model?: string;
        anonymousSessionId?: string;
        pinned?: boolean;
        cancelRequested?: boolean;
        cancelRequestedAt?: number;
        workflowProgress?: any;
        swarmId?: string;
        updatedAt: number;
        createdAt: number;
        title: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        anonymousSessionId: import("convex/values").VString<string, "optional">;
        title: import("convex/values").VString<string, "required">;
        model: import("convex/values").VString<string, "optional">;
        agentThreadId: import("convex/values").VString<string, "optional">;
        pinned: import("convex/values").VBoolean<boolean, "optional">;
        cancelRequested: import("convex/values").VBoolean<boolean, "optional">;
        cancelRequestedAt: import("convex/values").VFloat64<number, "optional">;
        workflowProgress: import("convex/values").VAny<any, "optional", string>;
        swarmId: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "agentThreadId" | "createdAt" | "title" | "model" | "anonymousSessionId" | "pinned" | "cancelRequested" | "cancelRequestedAt" | "workflowProgress" | "swarmId" | `workflowProgress.${string}`>, {
        by_user: ["userId", "_creationTime"];
        by_user_pinned: ["userId", "pinned", "_creationTime"];
        by_updatedAt: ["updatedAt", "_creationTime"];
        by_user_updatedAt: ["userId", "updatedAt", "_creationTime"];
        by_agentThreadId: ["agentThreadId", "_creationTime"];
        by_anonymous_session: ["anonymousSessionId", "_creationTime"];
        by_swarmId: ["swarmId", "_creationTime"];
    }, {}, {}>;
    chatMessagesStream: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        model?: string;
        streamId?: string;
        agentMessageId?: string;
        tokensUsed?: {
            input: number;
            output: number;
        };
        elapsedMs?: number;
        updatedAt: number;
        createdAt: number;
        content: string;
        status: "pending" | "error" | "streaming" | "complete";
        threadId: import("convex/values").GenericId<"chatThreadsStream">;
        role: "user" | "system" | "assistant";
    }, {
        threadId: import("convex/values").VId<import("convex/values").GenericId<"chatThreadsStream">, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        role: import("convex/values").VUnion<"user" | "system" | "assistant", [import("convex/values").VLiteral<"user", "required">, import("convex/values").VLiteral<"assistant", "required">, import("convex/values").VLiteral<"system", "required">], "required", never>;
        content: import("convex/values").VString<string, "required">;
        streamId: import("convex/values").VString<string, "optional">;
        agentMessageId: import("convex/values").VString<string, "optional">;
        status: import("convex/values").VUnion<"pending" | "error" | "streaming" | "complete", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"streaming", "required">, import("convex/values").VLiteral<"complete", "required">, import("convex/values").VLiteral<"error", "required">], "required", never>;
        model: import("convex/values").VString<string, "optional">;
        tokensUsed: import("convex/values").VObject<{
            input: number;
            output: number;
        }, {
            input: import("convex/values").VFloat64<number, "required">;
            output: import("convex/values").VFloat64<number, "required">;
        }, "optional", "input" | "output">;
        elapsedMs: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "content" | "status" | "threadId" | "model" | "role" | "streamId" | "agentMessageId" | "tokensUsed" | "elapsedMs" | "tokensUsed.input" | "tokensUsed.output">, {
        by_thread: ["threadId", "createdAt", "_creationTime"];
        by_streamId: ["streamId", "_creationTime"];
        by_agentMessageId: ["agentMessageId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    searchCache: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        isPublic: boolean;
        threadId: string;
        prompt: string;
        lastUpdated: number;
        searchCount: number;
        versions: {
            summary: string;
            date: string;
            threadId: string;
            timestamp: number;
        }[];
    }, {
        prompt: import("convex/values").VString<string, "required">;
        threadId: import("convex/values").VString<string, "required">;
        lastUpdated: import("convex/values").VFloat64<number, "required">;
        searchCount: import("convex/values").VFloat64<number, "required">;
        versions: import("convex/values").VArray<{
            summary: string;
            date: string;
            threadId: string;
            timestamp: number;
        }[], import("convex/values").VObject<{
            summary: string;
            date: string;
            threadId: string;
            timestamp: number;
        }, {
            date: import("convex/values").VString<string, "required">;
            threadId: import("convex/values").VString<string, "required">;
            summary: import("convex/values").VString<string, "required">;
            timestamp: import("convex/values").VFloat64<number, "required">;
        }, "required", "summary" | "date" | "threadId" | "timestamp">, "required">;
        isPublic: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "isPublic" | "threadId" | "prompt" | "lastUpdated" | "searchCount" | "versions">, {
        by_prompt: ["prompt", "_creationTime"];
        by_popularity: ["searchCount", "_creationTime"];
        by_updated: ["lastUpdated", "_creationTime"];
        by_public: ["isPublic", "searchCount", "_creationTime"];
    }, {}, {}>;
    mcpToolLearning: import("convex/server").TableDefinition<import("convex/values").VObject<{
        errorMessage?: string;
        executionResult?: any;
        qualityScore?: number;
        timingMs?: number;
        updatedAt: number;
        createdAt: number;
        serverId: import("convex/values").GenericId<"mcpServers">;
        toolId: import("convex/values").GenericId<"mcpTools">;
        naturalLanguageQuery: string;
        convertedParameters: any;
        executionSuccess: boolean;
        learningType: "auto_discovery" | "user_interaction" | "manual_training";
    }, {
        toolId: import("convex/values").VId<import("convex/values").GenericId<"mcpTools">, "required">;
        serverId: import("convex/values").VId<import("convex/values").GenericId<"mcpServers">, "required">;
        naturalLanguageQuery: import("convex/values").VString<string, "required">;
        convertedParameters: import("convex/values").VAny<any, "required", string>;
        executionSuccess: import("convex/values").VBoolean<boolean, "required">;
        executionResult: import("convex/values").VAny<any, "optional", string>;
        errorMessage: import("convex/values").VString<string, "optional">;
        learningType: import("convex/values").VUnion<"auto_discovery" | "user_interaction" | "manual_training", [import("convex/values").VLiteral<"auto_discovery", "required">, import("convex/values").VLiteral<"user_interaction", "required">, import("convex/values").VLiteral<"manual_training", "required">], "required", never>;
        qualityScore: import("convex/values").VFloat64<number, "optional">;
        timingMs: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "updatedAt" | "createdAt" | "errorMessage" | "serverId" | "toolId" | "naturalLanguageQuery" | "convertedParameters" | "executionSuccess" | "executionResult" | "learningType" | "qualityScore" | "timingMs" | `convertedParameters.${string}` | `executionResult.${string}`>, {
        by_tool: ["toolId", "_creationTime"];
        by_server: ["serverId", "_creationTime"];
        by_success: ["executionSuccess", "_creationTime"];
        by_learning_type: ["learningType", "_creationTime"];
        by_quality: ["qualityScore", "_creationTime"];
    }, {}, {}>;
    mcpGuidanceExamples: import("convex/server").TableDefinition<import("convex/values").VObject<{
        lastUpdated: number;
        serverId: import("convex/values").GenericId<"mcpServers">;
        toolId: import("convex/values").GenericId<"mcpTools">;
        examples: {
            successRate?: number;
            description: string;
            query: string;
            parameters: any;
        }[];
        generatedAt: number;
        version: number;
        isActive: boolean;
    }, {
        toolId: import("convex/values").VId<import("convex/values").GenericId<"mcpTools">, "required">;
        serverId: import("convex/values").VId<import("convex/values").GenericId<"mcpServers">, "required">;
        examples: import("convex/values").VArray<{
            successRate?: number;
            description: string;
            query: string;
            parameters: any;
        }[], import("convex/values").VObject<{
            successRate?: number;
            description: string;
            query: string;
            parameters: any;
        }, {
            query: import("convex/values").VString<string, "required">;
            parameters: import("convex/values").VAny<any, "required", string>;
            description: import("convex/values").VString<string, "required">;
            successRate: import("convex/values").VFloat64<number, "optional">;
        }, "required", "description" | "query" | "parameters" | "successRate" | `parameters.${string}`>, "required">;
        generatedAt: import("convex/values").VFloat64<number, "required">;
        lastUpdated: import("convex/values").VFloat64<number, "required">;
        version: import("convex/values").VFloat64<number, "required">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
    }, "required", "lastUpdated" | "serverId" | "toolId" | "examples" | "generatedAt" | "version" | "isActive">, {
        by_tool: ["toolId", "_creationTime"];
        by_server: ["serverId", "_creationTime"];
        by_active: ["isActive", "_creationTime"];
    }, {}, {}>;
    mcpToolHistory: import("convex/server").TableDefinition<import("convex/values").VObject<{
        errorMessage?: string;
        resultPreview?: string;
        userId: import("convex/values").GenericId<"users">;
        createdAt: number;
        serverId: import("convex/values").GenericId<"mcpServers">;
        toolId: import("convex/values").GenericId<"mcpTools">;
        naturalLanguageQuery: string;
        executionSuccess: boolean;
        parameters: any;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        toolId: import("convex/values").VId<import("convex/values").GenericId<"mcpTools">, "required">;
        serverId: import("convex/values").VId<import("convex/values").GenericId<"mcpServers">, "required">;
        naturalLanguageQuery: import("convex/values").VString<string, "required">;
        parameters: import("convex/values").VAny<any, "required", string>;
        executionSuccess: import("convex/values").VBoolean<boolean, "required">;
        resultPreview: import("convex/values").VString<string, "optional">;
        errorMessage: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "createdAt" | "errorMessage" | "serverId" | "toolId" | "naturalLanguageQuery" | "executionSuccess" | "parameters" | `parameters.${string}` | "resultPreview">, {
        by_user: ["userId", "_creationTime"];
        by_user_tool: ["userId", "toolId", "_creationTime"];
        by_user_createdAt: ["userId", "createdAt", "_creationTime"];
        by_user_tool_createdAt: ["userId", "toolId", "createdAt", "_creationTime"];
    }, {}, {}>;
    documentSnapshots: import("convex/server").TableDefinition<import("convex/values").VObject<{
        contentSize?: number;
        isEmergency?: boolean;
        isManual?: boolean;
        compressionRatio?: number;
        triggerReason?: string;
        createdAt: number;
        createdBy: import("convex/values").GenericId<"users">;
        content: string;
        documentId: import("convex/values").GenericId<"documents">;
        version: number;
        stepCount: number;
    }, {
        documentId: import("convex/values").VId<import("convex/values").GenericId<"documents">, "required">;
        content: import("convex/values").VString<string, "required">;
        version: import("convex/values").VFloat64<number, "required">;
        createdBy: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        stepCount: import("convex/values").VFloat64<number, "required">;
        contentSize: import("convex/values").VFloat64<number, "optional">;
        isEmergency: import("convex/values").VBoolean<boolean, "optional">;
        isManual: import("convex/values").VBoolean<boolean, "optional">;
        compressionRatio: import("convex/values").VFloat64<number, "optional">;
        triggerReason: import("convex/values").VString<string, "optional">;
    }, "required", "createdAt" | "createdBy" | "content" | "documentId" | "version" | "stepCount" | "contentSize" | "isEmergency" | "isManual" | "compressionRatio" | "triggerReason">, {
        by_document: ["documentId", "_creationTime"];
        by_document_version: ["documentId", "version", "_creationTime"];
        by_created_at: ["createdAt", "_creationTime"];
        by_size: ["contentSize", "_creationTime"];
        by_emergency: ["isEmergency", "_creationTime"];
    }, {}, {}>;
    spreadsheets: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        name: string;
    }, {
        name: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "name">, {
        by_user: ["userId", "_creationTime"];
        by_name: ["name", "_creationTime"];
    }, {}, {}>;
    sheetCells: import("convex/server").TableDefinition<import("convex/values").VObject<{
        type?: string;
        value?: string;
        comment?: string;
        updatedBy?: import("convex/values").GenericId<"users">;
        updatedAt: number;
        sheetId: import("convex/values").GenericId<"spreadsheets">;
        row: number;
        col: number;
    }, {
        sheetId: import("convex/values").VId<import("convex/values").GenericId<"spreadsheets">, "required">;
        row: import("convex/values").VFloat64<number, "required">;
        col: import("convex/values").VFloat64<number, "required">;
        value: import("convex/values").VString<string, "optional">;
        type: import("convex/values").VString<string, "optional">;
        comment: import("convex/values").VString<string, "optional">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        updatedBy: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
    }, "required", "type" | "updatedAt" | "sheetId" | "row" | "col" | "value" | "comment" | "updatedBy">, {
        by_sheet: ["sheetId", "_creationTime"];
        by_sheet_row_col: ["sheetId", "row", "col", "_creationTime"];
    }, {}, {}>;
    googleAccounts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        email?: string;
        refreshToken?: string;
        scope?: string;
        expiryDate?: number;
        tokenType?: string;
        historyId?: string;
        gcalSyncToken?: string;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        provider: "google";
        accessToken: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        provider: import("convex/values").VLiteral<"google", "required">;
        email: import("convex/values").VString<string, "optional">;
        accessToken: import("convex/values").VString<string, "required">;
        refreshToken: import("convex/values").VString<string, "optional">;
        scope: import("convex/values").VString<string, "optional">;
        expiryDate: import("convex/values").VFloat64<number, "optional">;
        tokenType: import("convex/values").VString<string, "optional">;
        historyId: import("convex/values").VString<string, "optional">;
        gcalSyncToken: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "provider" | "email" | "accessToken" | "refreshToken" | "scope" | "expiryDate" | "tokenType" | "historyId" | "gcalSyncToken">, {
        by_user: ["userId", "_creationTime"];
        by_user_provider: ["userId", "provider", "_creationTime"];
    }, {}, {}>;
    slackAccounts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        scope?: string;
        tokenType?: string;
        teamId?: string;
        teamName?: string;
        botUserId?: string;
        authedUserId?: string;
        userAccessToken?: string;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        provider: "slack";
        accessToken: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        provider: import("convex/values").VLiteral<"slack", "required">;
        teamId: import("convex/values").VString<string, "optional">;
        teamName: import("convex/values").VString<string, "optional">;
        botUserId: import("convex/values").VString<string, "optional">;
        authedUserId: import("convex/values").VString<string, "optional">;
        accessToken: import("convex/values").VString<string, "required">;
        userAccessToken: import("convex/values").VString<string, "optional">;
        scope: import("convex/values").VString<string, "optional">;
        tokenType: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "provider" | "accessToken" | "scope" | "tokenType" | "teamId" | "teamName" | "botUserId" | "authedUserId" | "userAccessToken">, {
        by_user: ["userId", "_creationTime"];
        by_user_provider: ["userId", "provider", "_creationTime"];
    }, {}, {}>;
    githubAccounts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        scope?: string;
        tokenType?: string;
        username?: string;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        provider: "github";
        accessToken: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        provider: import("convex/values").VLiteral<"github", "required">;
        username: import("convex/values").VString<string, "optional">;
        accessToken: import("convex/values").VString<string, "required">;
        scope: import("convex/values").VString<string, "optional">;
        tokenType: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "provider" | "accessToken" | "scope" | "tokenType" | "username">, {
        by_user: ["userId", "_creationTime"];
        by_user_provider: ["userId", "provider", "_creationTime"];
    }, {}, {}>;
    notionAccounts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        workspaceId?: string;
        workspaceName?: string;
        botId?: string;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        provider: "notion";
        accessToken: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        provider: import("convex/values").VLiteral<"notion", "required">;
        workspaceId: import("convex/values").VString<string, "optional">;
        workspaceName: import("convex/values").VString<string, "optional">;
        botId: import("convex/values").VString<string, "optional">;
        accessToken: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "provider" | "accessToken" | "workspaceId" | "workspaceName" | "botId">, {
        by_user: ["userId", "_creationTime"];
        by_user_provider: ["userId", "provider", "_creationTime"];
    }, {}, {}>;
    userApiKeys: import("convex/server").TableDefinition<import("convex/values").VObject<{
        encryptedApiKey?: string;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        provider: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        provider: import("convex/values").VString<string, "required">;
        encryptedApiKey: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "provider" | "encryptedApiKey">, {
        by_user_provider: ["userId", "provider", "_creationTime"];
    }, {}, {}>;
    dailyUsage: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        updatedAt?: number;
        count?: number;
        limit?: number;
        date: string;
        provider: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        provider: import("convex/values").VString<string, "required">;
        date: import("convex/values").VString<string, "required">;
        count: import("convex/values").VFloat64<number, "optional">;
        limit: import("convex/values").VFloat64<number, "optional">;
        updatedAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "userId" | "updatedAt" | "date" | "provider" | "count" | "limit">, {
        by_provider_date: ["provider", "date", "_creationTime"];
        by_user_provider_date: ["userId", "provider", "date", "_creationTime"];
    }, {}, {}>;
    subscriptions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        stripeSessionId?: string;
        stripePaymentIntentId?: string;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        status: "active" | "canceled";
        plan: "free" | "supporter";
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        plan: import("convex/values").VUnion<"free" | "supporter", [import("convex/values").VLiteral<"free", "required">, import("convex/values").VLiteral<"supporter", "required">], "required", never>;
        status: import("convex/values").VUnion<"active" | "canceled", [import("convex/values").VLiteral<"active", "required">, import("convex/values").VLiteral<"canceled", "required">], "required", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        stripeSessionId: import("convex/values").VString<string, "optional">;
        stripePaymentIntentId: import("convex/values").VString<string, "optional">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "status" | "plan" | "stripeSessionId" | "stripePaymentIntentId">, {
        by_user: ["userId", "_creationTime"];
        by_user_status: ["userId", "status", "_creationTime"];
    }, {}, {}>;
    agentTimelines: import("convex/server").TableDefinition<import("convex/values").VObject<{
        agentThreadId?: string;
        documentId?: import("convex/values").GenericId<"documents">;
        baseStartMs?: number;
        latestRunInput?: string;
        latestRunOutput?: string;
        latestRunAt?: number;
        updatedAt: number;
        createdAt: number;
        name: string;
        createdBy: import("convex/values").GenericId<"users">;
    }, {
        documentId: import("convex/values").VId<import("convex/values").GenericId<"documents">, "optional">;
        agentThreadId: import("convex/values").VString<string, "optional">;
        name: import("convex/values").VString<string, "required">;
        baseStartMs: import("convex/values").VFloat64<number, "optional">;
        createdBy: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        latestRunInput: import("convex/values").VString<string, "optional">;
        latestRunOutput: import("convex/values").VString<string, "optional">;
        latestRunAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "updatedAt" | "agentThreadId" | "createdAt" | "name" | "createdBy" | "documentId" | "baseStartMs" | "latestRunInput" | "latestRunOutput" | "latestRunAt">, {
        by_document: ["documentId", "_creationTime"];
        by_user: ["createdBy", "_creationTime"];
        by_agent_thread: ["agentThreadId", "_creationTime"];
    }, {}, {}>;
    agentTasks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        icon?: string;
        agentThreadId?: string;
        parentId?: import("convex/values").GenericId<"agentTasks">;
        description?: string;
        order?: number;
        status?: "pending" | "running" | "error" | "complete" | "paused";
        color?: string;
        elapsedMs?: number;
        assigneeId?: import("convex/values").GenericId<"users">;
        startOffsetMs?: number;
        startMs?: number;
        progress?: number;
        agentType?: "orchestrator" | "main" | "leaf";
        sequence?: "parallel" | "sequential";
        inputTokens?: number;
        outputTokens?: number;
        outputSizeBytes?: number;
        startedAtMs?: number;
        completedAtMs?: number;
        phaseBoundariesMs?: number[];
        retryOffsetsMs?: number[];
        failureOffsetMs?: number;
        updatedAt: number;
        createdAt: number;
        name: string;
        timelineId: import("convex/values").GenericId<"agentTimelines">;
        durationMs: number;
    }, {
        timelineId: import("convex/values").VId<import("convex/values").GenericId<"agentTimelines">, "required">;
        agentThreadId: import("convex/values").VString<string, "optional">;
        parentId: import("convex/values").VId<import("convex/values").GenericId<"agentTasks">, "optional">;
        name: import("convex/values").VString<string, "required">;
        startOffsetMs: import("convex/values").VFloat64<number, "optional">;
        startMs: import("convex/values").VFloat64<number, "optional">;
        durationMs: import("convex/values").VFloat64<number, "required">;
        progress: import("convex/values").VFloat64<number, "optional">;
        status: import("convex/values").VUnion<"pending" | "running" | "error" | "complete" | "paused", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"complete", "required">, import("convex/values").VLiteral<"paused", "required">, import("convex/values").VLiteral<"error", "required">], "optional", never>;
        agentType: import("convex/values").VUnion<"orchestrator" | "main" | "leaf", [import("convex/values").VLiteral<"orchestrator", "required">, import("convex/values").VLiteral<"main", "required">, import("convex/values").VLiteral<"leaf", "required">], "optional", never>;
        assigneeId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        icon: import("convex/values").VString<string, "optional">;
        color: import("convex/values").VString<string, "optional">;
        sequence: import("convex/values").VUnion<"parallel" | "sequential", [import("convex/values").VLiteral<"parallel", "required">, import("convex/values").VLiteral<"sequential", "required">], "optional", never>;
        description: import("convex/values").VString<string, "optional">;
        inputTokens: import("convex/values").VFloat64<number, "optional">;
        outputTokens: import("convex/values").VFloat64<number, "optional">;
        outputSizeBytes: import("convex/values").VFloat64<number, "optional">;
        elapsedMs: import("convex/values").VFloat64<number, "optional">;
        startedAtMs: import("convex/values").VFloat64<number, "optional">;
        completedAtMs: import("convex/values").VFloat64<number, "optional">;
        phaseBoundariesMs: import("convex/values").VArray<number[], import("convex/values").VFloat64<number, "required">, "optional">;
        retryOffsetsMs: import("convex/values").VArray<number[], import("convex/values").VFloat64<number, "required">, "optional">;
        failureOffsetMs: import("convex/values").VFloat64<number, "optional">;
        order: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "updatedAt" | "icon" | "agentThreadId" | "createdAt" | "name" | "parentId" | "description" | "order" | "status" | "color" | "elapsedMs" | "assigneeId" | "timelineId" | "startOffsetMs" | "startMs" | "durationMs" | "progress" | "agentType" | "sequence" | "inputTokens" | "outputTokens" | "outputSizeBytes" | "startedAtMs" | "completedAtMs" | "phaseBoundariesMs" | "retryOffsetsMs" | "failureOffsetMs">, {
        by_timeline: ["timelineId", "_creationTime"];
        by_agent_thread: ["agentThreadId", "_creationTime"];
        by_parent: ["parentId", "_creationTime"];
    }, {}, {}>;
    agentLinks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        type?: "e2e" | "s2s" | "s2e" | "e2s";
        createdAt: number;
        timelineId: import("convex/values").GenericId<"agentTimelines">;
        sourceTaskId: import("convex/values").GenericId<"agentTasks">;
        targetTaskId: import("convex/values").GenericId<"agentTasks">;
    }, {
        timelineId: import("convex/values").VId<import("convex/values").GenericId<"agentTimelines">, "required">;
        sourceTaskId: import("convex/values").VId<import("convex/values").GenericId<"agentTasks">, "required">;
        targetTaskId: import("convex/values").VId<import("convex/values").GenericId<"agentTasks">, "required">;
        type: import("convex/values").VUnion<"e2e" | "s2s" | "s2e" | "e2s", [import("convex/values").VLiteral<"e2e", "required">, import("convex/values").VLiteral<"s2s", "required">, import("convex/values").VLiteral<"s2e", "required">, import("convex/values").VLiteral<"e2s", "required">], "optional", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "type" | "createdAt" | "timelineId" | "sourceTaskId" | "targetTaskId">, {
        by_timeline: ["timelineId", "_creationTime"];
    }, {}, {}>;
    agentTimelineRuns: import("convex/server").TableDefinition<import("convex/values").VObject<{
        meta?: any;
        retryCount?: number;
        modelUsed?: string;
        createdAt: number;
        input: string;
        output: string;
        timelineId: import("convex/values").GenericId<"agentTimelines">;
    }, {
        timelineId: import("convex/values").VId<import("convex/values").GenericId<"agentTimelines">, "required">;
        input: import("convex/values").VString<string, "required">;
        output: import("convex/values").VString<string, "required">;
        retryCount: import("convex/values").VFloat64<number, "optional">;
        modelUsed: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        meta: import("convex/values").VAny<any, "optional", string>;
    }, "required", "createdAt" | "meta" | `meta.${string}` | "input" | "output" | "timelineId" | "retryCount" | "modelUsed">, {
        by_timeline: ["timelineId", "_creationTime"];
        by_timeline_createdAt: ["timelineId", "createdAt", "_creationTime"];
    }, {}, {}>;
    agentImageResults: import("convex/server").TableDefinition<import("convex/values").VObject<{
        title?: string;
        sourceUrl?: string;
        thumbnailUrl?: string;
        metadata?: any;
        taskId?: import("convex/values").GenericId<"agentTasks">;
        width?: number;
        height?: number;
        format?: string;
        classification?: string;
        classificationConfidence?: number;
        classificationDetails?: any;
        createdAt: number;
        timelineId: import("convex/values").GenericId<"agentTimelines">;
        imageUrl: string;
    }, {
        timelineId: import("convex/values").VId<import("convex/values").GenericId<"agentTimelines">, "required">;
        taskId: import("convex/values").VId<import("convex/values").GenericId<"agentTasks">, "optional">;
        imageUrl: import("convex/values").VString<string, "required">;
        sourceUrl: import("convex/values").VString<string, "optional">;
        title: import("convex/values").VString<string, "optional">;
        thumbnailUrl: import("convex/values").VString<string, "optional">;
        width: import("convex/values").VFloat64<number, "optional">;
        height: import("convex/values").VFloat64<number, "optional">;
        format: import("convex/values").VString<string, "optional">;
        classification: import("convex/values").VString<string, "optional">;
        classificationConfidence: import("convex/values").VFloat64<number, "optional">;
        classificationDetails: import("convex/values").VAny<any, "optional", string>;
        metadata: import("convex/values").VAny<any, "optional", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "title" | "sourceUrl" | "thumbnailUrl" | "metadata" | `metadata.${string}` | "timelineId" | "taskId" | "imageUrl" | "width" | "height" | "format" | "classification" | "classificationConfidence" | "classificationDetails" | `classificationDetails.${string}`>, {
        by_timeline: ["timelineId", "_creationTime"];
        by_task: ["taskId", "_creationTime"];
        by_timeline_createdAt: ["timelineId", "createdAt", "_creationTime"];
    }, {}, {}>;
    voiceSessions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        metadata?: {
            model?: string;
            clientType?: string;
            deviceInfo?: string;
        };
        userId: import("convex/values").GenericId<"users">;
        createdAt: number;
        threadId: string;
        sessionId: string;
        lastActivityAt: number;
    }, {
        sessionId: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        threadId: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        lastActivityAt: import("convex/values").VFloat64<number, "required">;
        metadata: import("convex/values").VObject<{
            model?: string;
            clientType?: string;
            deviceInfo?: string;
        }, {
            clientType: import("convex/values").VString<string, "optional">;
            deviceInfo: import("convex/values").VString<string, "optional">;
            model: import("convex/values").VString<string, "optional">;
        }, "optional", "model" | "clientType" | "deviceInfo">;
    }, "required", "userId" | "createdAt" | "metadata" | "threadId" | "sessionId" | "lastActivityAt" | "metadata.model" | "metadata.clientType" | "metadata.deviceInfo">, {
        by_user: ["userId", "_creationTime"];
        by_session_id: ["sessionId", "_creationTime"];
        by_thread_id: ["threadId", "_creationTime"];
        by_last_activity: ["lastActivityAt", "_creationTime"];
    }, {}, {}>;
    landingPageLog: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        source?: string;
        agentThreadId?: string;
        url?: string;
        tags?: string[];
        meta?: any;
        anonymousSessionId?: string;
        createdAt: number;
        title: string;
        kind: "system" | "note" | "signal" | "funding" | "brief";
        day: string;
        markdown: string;
    }, {
        day: import("convex/values").VString<string, "required">;
        kind: import("convex/values").VUnion<"system" | "note" | "signal" | "funding" | "brief", [import("convex/values").VLiteral<"signal", "required">, import("convex/values").VLiteral<"funding", "required">, import("convex/values").VLiteral<"brief", "required">, import("convex/values").VLiteral<"note", "required">, import("convex/values").VLiteral<"system", "required">], "required", never>;
        title: import("convex/values").VString<string, "required">;
        markdown: import("convex/values").VString<string, "required">;
        source: import("convex/values").VString<string, "optional">;
        url: import("convex/values").VString<string, "optional">;
        tags: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        anonymousSessionId: import("convex/values").VString<string, "optional">;
        agentThreadId: import("convex/values").VString<string, "optional">;
        meta: import("convex/values").VAny<any, "optional", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "source" | "agentThreadId" | "createdAt" | "title" | "url" | "kind" | "tags" | "meta" | `meta.${string}` | "anonymousSessionId" | "day" | "markdown">, {
        by_createdAt: ["createdAt", "_creationTime"];
        by_day_createdAt: ["day", "createdAt", "_creationTime"];
        by_anon_day_createdAt: ["anonymousSessionId", "day", "createdAt", "_creationTime"];
        by_agent_thread: ["agentThreadId", "createdAt", "_creationTime"];
    }, {}, {}>;
    feedItems: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt?: number;
        category?: "tech" | "ai_ml" | "startups" | "products" | "opensource" | "finance" | "research";
        metrics?: {
            trend?: "up" | "down";
            label: string;
            value: string;
        }[];
        type: "dossier" | "news" | "signal" | "repo" | "product";
        source: string;
        title: string;
        url: string;
        summary: string;
        publishedAt: string;
        tags: string[];
        sourceId: string;
        score: number;
    }, {
        sourceId: import("convex/values").VString<string, "required">;
        type: import("convex/values").VUnion<"dossier" | "news" | "signal" | "repo" | "product", [import("convex/values").VLiteral<"news", "required">, import("convex/values").VLiteral<"signal", "required">, import("convex/values").VLiteral<"dossier", "required">, import("convex/values").VLiteral<"repo", "required">, import("convex/values").VLiteral<"product", "required">], "required", never>;
        category: import("convex/values").VUnion<"tech" | "ai_ml" | "startups" | "products" | "opensource" | "finance" | "research", [import("convex/values").VLiteral<"tech", "required">, import("convex/values").VLiteral<"ai_ml", "required">, import("convex/values").VLiteral<"startups", "required">, import("convex/values").VLiteral<"products", "required">, import("convex/values").VLiteral<"opensource", "required">, import("convex/values").VLiteral<"finance", "required">, import("convex/values").VLiteral<"research", "required">], "optional", never>;
        title: import("convex/values").VString<string, "required">;
        summary: import("convex/values").VString<string, "required">;
        url: import("convex/values").VString<string, "required">;
        source: import("convex/values").VString<string, "required">;
        tags: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        metrics: import("convex/values").VArray<{
            trend?: "up" | "down";
            label: string;
            value: string;
        }[], import("convex/values").VObject<{
            trend?: "up" | "down";
            label: string;
            value: string;
        }, {
            label: import("convex/values").VString<string, "required">;
            value: import("convex/values").VString<string, "required">;
            trend: import("convex/values").VUnion<"up" | "down", [import("convex/values").VLiteral<"up", "required">, import("convex/values").VLiteral<"down", "required">], "optional", never>;
        }, "required", "label" | "value" | "trend">, "optional">;
        publishedAt: import("convex/values").VString<string, "required">;
        score: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "type" | "source" | "createdAt" | "title" | "url" | "summary" | "publishedAt" | "tags" | "category" | "sourceId" | "metrics" | "score">, {
        by_published: ["publishedAt", "_creationTime"];
        by_score: ["score", "_creationTime"];
        by_source: ["source", "_creationTime"];
        by_type: ["type", "_creationTime"];
        by_category: ["category", "_creationTime"];
        by_source_id: ["sourceId", "_creationTime"];
    }, {}, {}>;
    repoStatsCache: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string;
        watchers?: number;
        openIssues?: number;
        languages?: {
            name: string;
            pct: number;
        }[];
        createdAt: string;
        fetchedAt: number;
        repoFullName: string;
        repoUrl: string;
        stars: number;
        forks: number;
        pushedAt: string;
        starHistory: {
            delta?: number;
            date: string;
            stars: number;
        }[];
        commitHistory: {
            weekStart: string;
            commits: number;
        }[];
    }, {
        repoFullName: import("convex/values").VString<string, "required">;
        repoUrl: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "optional">;
        stars: import("convex/values").VFloat64<number, "required">;
        forks: import("convex/values").VFloat64<number, "required">;
        watchers: import("convex/values").VFloat64<number, "optional">;
        openIssues: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VString<string, "required">;
        pushedAt: import("convex/values").VString<string, "required">;
        starHistory: import("convex/values").VArray<{
            delta?: number;
            date: string;
            stars: number;
        }[], import("convex/values").VObject<{
            delta?: number;
            date: string;
            stars: number;
        }, {
            date: import("convex/values").VString<string, "required">;
            stars: import("convex/values").VFloat64<number, "required">;
            delta: import("convex/values").VFloat64<number, "optional">;
        }, "required", "date" | "delta" | "stars">, "required">;
        commitHistory: import("convex/values").VArray<{
            weekStart: string;
            commits: number;
        }[], import("convex/values").VObject<{
            weekStart: string;
            commits: number;
        }, {
            weekStart: import("convex/values").VString<string, "required">;
            commits: import("convex/values").VFloat64<number, "required">;
        }, "required", "weekStart" | "commits">, "required">;
        languages: import("convex/values").VArray<{
            name: string;
            pct: number;
        }[], import("convex/values").VObject<{
            name: string;
            pct: number;
        }, {
            name: import("convex/values").VString<string, "required">;
            pct: import("convex/values").VFloat64<number, "required">;
        }, "required", "name" | "pct">, "optional">;
        fetchedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "description" | "fetchedAt" | "repoFullName" | "repoUrl" | "stars" | "forks" | "watchers" | "openIssues" | "pushedAt" | "starHistory" | "commitHistory" | "languages">, {
        by_repo: ["repoFullName", "_creationTime"];
        by_repo_url: ["repoUrl", "_creationTime"];
    }, {}, {}>;
    paperDetailsCache: import("convex/server").TableDefinition<import("convex/values").VObject<{
        title?: string;
        publishedAt?: string;
        abstract?: string;
        methodology?: string;
        authors?: string[];
        citationCount?: number;
        doi?: string;
        pdfUrl?: string;
        sourceUrls?: string[];
        url: string;
        fetchedAt: number;
        paperId: string;
        keyFindings: string[];
    }, {
        paperId: import("convex/values").VString<string, "required">;
        url: import("convex/values").VString<string, "required">;
        title: import("convex/values").VString<string, "optional">;
        abstract: import("convex/values").VString<string, "optional">;
        methodology: import("convex/values").VString<string, "optional">;
        keyFindings: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        authors: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        citationCount: import("convex/values").VFloat64<number, "optional">;
        doi: import("convex/values").VString<string, "optional">;
        pdfUrl: import("convex/values").VString<string, "optional">;
        publishedAt: import("convex/values").VString<string, "optional">;
        sourceUrls: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        fetchedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "title" | "url" | "publishedAt" | "fetchedAt" | "paperId" | "abstract" | "methodology" | "keyFindings" | "authors" | "citationCount" | "doi" | "pdfUrl" | "sourceUrls">, {
        by_paper_id: ["paperId", "_creationTime"];
        by_url: ["url", "_creationTime"];
    }, {}, {}>;
    stackImpactCache: import("convex/server").TableDefinition<import("convex/values").VObject<{
        sourceUrls?: string[];
        signalTitle?: string;
        signalUrl?: string;
        cveId?: string;
        cveUrl?: string;
        summary: string;
        fetchedAt: number;
        techStack: string[];
        signalKey: string;
        riskLevel: "high" | "medium" | "low";
        graph: {
            focusNodeId?: string;
            nodes: {
                type?: string;
                importance?: number;
                tier?: number;
                id: string;
                label: string;
            }[];
            edges: {
                context?: string;
                order?: "primary" | "secondary";
                relationship?: string;
                impact?: string;
                source: string;
                target: string;
            }[];
        };
    }, {
        signalKey: import("convex/values").VString<string, "required">;
        signalTitle: import("convex/values").VString<string, "optional">;
        signalUrl: import("convex/values").VString<string, "optional">;
        techStack: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        summary: import("convex/values").VString<string, "required">;
        riskLevel: import("convex/values").VUnion<"high" | "medium" | "low", [import("convex/values").VLiteral<"low", "required">, import("convex/values").VLiteral<"medium", "required">, import("convex/values").VLiteral<"high", "required">], "required", never>;
        cveId: import("convex/values").VString<string, "optional">;
        cveUrl: import("convex/values").VString<string, "optional">;
        sourceUrls: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        graph: import("convex/values").VObject<{
            focusNodeId?: string;
            nodes: {
                type?: string;
                importance?: number;
                tier?: number;
                id: string;
                label: string;
            }[];
            edges: {
                context?: string;
                order?: "primary" | "secondary";
                relationship?: string;
                impact?: string;
                source: string;
                target: string;
            }[];
        }, {
            focusNodeId: import("convex/values").VString<string, "optional">;
            nodes: import("convex/values").VArray<{
                type?: string;
                importance?: number;
                tier?: number;
                id: string;
                label: string;
            }[], import("convex/values").VObject<{
                type?: string;
                importance?: number;
                tier?: number;
                id: string;
                label: string;
            }, {
                id: import("convex/values").VString<string, "required">;
                label: import("convex/values").VString<string, "required">;
                type: import("convex/values").VString<string, "optional">;
                importance: import("convex/values").VFloat64<number, "optional">;
                tier: import("convex/values").VFloat64<number, "optional">;
            }, "required", "id" | "type" | "label" | "importance" | "tier">, "required">;
            edges: import("convex/values").VArray<{
                context?: string;
                order?: "primary" | "secondary";
                relationship?: string;
                impact?: string;
                source: string;
                target: string;
            }[], import("convex/values").VObject<{
                context?: string;
                order?: "primary" | "secondary";
                relationship?: string;
                impact?: string;
                source: string;
                target: string;
            }, {
                source: import("convex/values").VString<string, "required">;
                target: import("convex/values").VString<string, "required">;
                relationship: import("convex/values").VString<string, "optional">;
                context: import("convex/values").VString<string, "optional">;
                impact: import("convex/values").VString<string, "optional">;
                order: import("convex/values").VUnion<"primary" | "secondary", [import("convex/values").VLiteral<"primary", "required">, import("convex/values").VLiteral<"secondary", "required">], "optional", never>;
            }, "required", "source" | "context" | "order" | "target" | "relationship" | "impact">, "required">;
        }, "required", "nodes" | "focusNodeId" | "edges">;
        fetchedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "summary" | "fetchedAt" | "techStack" | "sourceUrls" | "signalKey" | "signalTitle" | "signalUrl" | "riskLevel" | "cveId" | "cveUrl" | "graph" | "graph.nodes" | "graph.focusNodeId" | "graph.edges">, {
        by_signal_key: ["signalKey", "_creationTime"];
        by_signal_url: ["signalUrl", "_creationTime"];
    }, {}, {}>;
    modelComparisonCache: import("convex/server").TableDefinition<import("convex/values").VObject<{
        context?: string;
        summary?: string;
        sourceUrls?: string[];
        recommendation?: string;
        rows: {
            reliabilityScore?: number;
            performance?: string;
            notes?: string;
            model: string;
            inputCostPer1M: number;
            outputCostPer1M: number;
            contextWindow: number;
        }[];
        fetchedAt: number;
        modelKey: string;
    }, {
        modelKey: import("convex/values").VString<string, "required">;
        context: import("convex/values").VString<string, "optional">;
        summary: import("convex/values").VString<string, "optional">;
        recommendation: import("convex/values").VString<string, "optional">;
        rows: import("convex/values").VArray<{
            reliabilityScore?: number;
            performance?: string;
            notes?: string;
            model: string;
            inputCostPer1M: number;
            outputCostPer1M: number;
            contextWindow: number;
        }[], import("convex/values").VObject<{
            reliabilityScore?: number;
            performance?: string;
            notes?: string;
            model: string;
            inputCostPer1M: number;
            outputCostPer1M: number;
            contextWindow: number;
        }, {
            model: import("convex/values").VString<string, "required">;
            inputCostPer1M: import("convex/values").VFloat64<number, "required">;
            outputCostPer1M: import("convex/values").VFloat64<number, "required">;
            contextWindow: import("convex/values").VFloat64<number, "required">;
            reliabilityScore: import("convex/values").VFloat64<number, "optional">;
            performance: import("convex/values").VString<string, "optional">;
            notes: import("convex/values").VString<string, "optional">;
        }, "required", "model" | "inputCostPer1M" | "outputCostPer1M" | "contextWindow" | "reliabilityScore" | "performance" | "notes">, "required">;
        sourceUrls: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        fetchedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "context" | "summary" | "rows" | "fetchedAt" | "sourceUrls" | "modelKey" | "recommendation">, {
        by_model_key: ["modelKey", "_creationTime"];
    }, {}, {}>;
    dealFlowCache: import("convex/server").TableDefinition<import("convex/values").VObject<{
        focusSectors?: string[];
        fetchedAt: number;
        dateString: string;
        deals: {
            sources?: {
                name: string;
                url: string;
            }[];
            foundingYear?: string;
            foundersBackground?: string;
            coInvestors?: string[];
            traction?: string;
            sentiment?: "hot" | "watch";
            spark?: number[];
            regulatory?: {
                fdaStatus?: string;
                patents?: string[];
                papers?: string[];
            };
            id: string;
            summary: string;
            timeline: {
                label: string;
                detail: string;
            }[];
            date: string;
            location: string;
            company: string;
            sector: string;
            stage: string;
            amount: string;
            leads: string[];
            people: {
                name: string;
                role: string;
                past: string;
            }[];
        }[];
    }, {
        dateString: import("convex/values").VString<string, "required">;
        focusSectors: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        deals: import("convex/values").VArray<{
            sources?: {
                name: string;
                url: string;
            }[];
            foundingYear?: string;
            foundersBackground?: string;
            coInvestors?: string[];
            traction?: string;
            sentiment?: "hot" | "watch";
            spark?: number[];
            regulatory?: {
                fdaStatus?: string;
                patents?: string[];
                papers?: string[];
            };
            id: string;
            summary: string;
            timeline: {
                label: string;
                detail: string;
            }[];
            date: string;
            location: string;
            company: string;
            sector: string;
            stage: string;
            amount: string;
            leads: string[];
            people: {
                name: string;
                role: string;
                past: string;
            }[];
        }[], import("convex/values").VObject<{
            sources?: {
                name: string;
                url: string;
            }[];
            foundingYear?: string;
            foundersBackground?: string;
            coInvestors?: string[];
            traction?: string;
            sentiment?: "hot" | "watch";
            spark?: number[];
            regulatory?: {
                fdaStatus?: string;
                patents?: string[];
                papers?: string[];
            };
            id: string;
            summary: string;
            timeline: {
                label: string;
                detail: string;
            }[];
            date: string;
            location: string;
            company: string;
            sector: string;
            stage: string;
            amount: string;
            leads: string[];
            people: {
                name: string;
                role: string;
                past: string;
            }[];
        }, {
            id: import("convex/values").VString<string, "required">;
            company: import("convex/values").VString<string, "required">;
            sector: import("convex/values").VString<string, "required">;
            stage: import("convex/values").VString<string, "required">;
            amount: import("convex/values").VString<string, "required">;
            date: import("convex/values").VString<string, "required">;
            location: import("convex/values").VString<string, "required">;
            foundingYear: import("convex/values").VString<string, "optional">;
            foundersBackground: import("convex/values").VString<string, "optional">;
            leads: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            coInvestors: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
            summary: import("convex/values").VString<string, "required">;
            traction: import("convex/values").VString<string, "optional">;
            sentiment: import("convex/values").VUnion<"hot" | "watch", [import("convex/values").VLiteral<"hot", "required">, import("convex/values").VLiteral<"watch", "required">], "optional", never>;
            spark: import("convex/values").VArray<number[], import("convex/values").VFloat64<number, "required">, "optional">;
            people: import("convex/values").VArray<{
                name: string;
                role: string;
                past: string;
            }[], import("convex/values").VObject<{
                name: string;
                role: string;
                past: string;
            }, {
                name: import("convex/values").VString<string, "required">;
                role: import("convex/values").VString<string, "required">;
                past: import("convex/values").VString<string, "required">;
            }, "required", "name" | "role" | "past">, "required">;
            timeline: import("convex/values").VArray<{
                label: string;
                detail: string;
            }[], import("convex/values").VObject<{
                label: string;
                detail: string;
            }, {
                label: import("convex/values").VString<string, "required">;
                detail: import("convex/values").VString<string, "required">;
            }, "required", "label" | "detail">, "required">;
            regulatory: import("convex/values").VObject<{
                fdaStatus?: string;
                patents?: string[];
                papers?: string[];
            }, {
                fdaStatus: import("convex/values").VString<string, "optional">;
                patents: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
                papers: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
            }, "optional", "fdaStatus" | "patents" | "papers">;
            sources: import("convex/values").VArray<{
                name: string;
                url: string;
            }[], import("convex/values").VObject<{
                name: string;
                url: string;
            }, {
                name: import("convex/values").VString<string, "required">;
                url: import("convex/values").VString<string, "required">;
            }, "required", "name" | "url">, "optional">;
        }, "required", "id" | "sources" | "summary" | "timeline" | "date" | "location" | "company" | "sector" | "stage" | "amount" | "foundingYear" | "foundersBackground" | "leads" | "coInvestors" | "traction" | "sentiment" | "spark" | "people" | "regulatory" | "regulatory.fdaStatus" | "regulatory.patents" | "regulatory.papers">, "required">;
        fetchedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "fetchedAt" | "dateString" | "focusSectors" | "deals">, {
        by_date: ["dateString", "_creationTime"];
        by_fetched_at: ["fetchedAt", "_creationTime"];
    }, {}, {}>;
    repoScoutCache: import("convex/server").TableDefinition<import("convex/values").VObject<{
        signalSummary?: string;
        moatSummary?: string;
        moatRisks?: string[];
        fetchedAt: number;
        signalKey: string;
        signalTitle: string;
        repos: {
            description?: string;
            languages?: {
                name: string;
                pct: number;
            }[];
            lastPush?: string;
            name: string;
            url: string;
            stars: number;
            starVelocity: number;
            commitsPerWeek: number;
        }[];
    }, {
        signalKey: import("convex/values").VString<string, "required">;
        signalTitle: import("convex/values").VString<string, "required">;
        signalSummary: import("convex/values").VString<string, "optional">;
        repos: import("convex/values").VArray<{
            description?: string;
            languages?: {
                name: string;
                pct: number;
            }[];
            lastPush?: string;
            name: string;
            url: string;
            stars: number;
            starVelocity: number;
            commitsPerWeek: number;
        }[], import("convex/values").VObject<{
            description?: string;
            languages?: {
                name: string;
                pct: number;
            }[];
            lastPush?: string;
            name: string;
            url: string;
            stars: number;
            starVelocity: number;
            commitsPerWeek: number;
        }, {
            name: import("convex/values").VString<string, "required">;
            url: import("convex/values").VString<string, "required">;
            description: import("convex/values").VString<string, "optional">;
            stars: import("convex/values").VFloat64<number, "required">;
            starVelocity: import("convex/values").VFloat64<number, "required">;
            commitsPerWeek: import("convex/values").VFloat64<number, "required">;
            lastPush: import("convex/values").VString<string, "optional">;
            languages: import("convex/values").VArray<{
                name: string;
                pct: number;
            }[], import("convex/values").VObject<{
                name: string;
                pct: number;
            }, {
                name: import("convex/values").VString<string, "required">;
                pct: import("convex/values").VFloat64<number, "required">;
            }, "required", "name" | "pct">, "optional">;
        }, "required", "name" | "url" | "description" | "stars" | "languages" | "starVelocity" | "commitsPerWeek" | "lastPush">, "required">;
        moatSummary: import("convex/values").VString<string, "optional">;
        moatRisks: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        fetchedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "fetchedAt" | "signalKey" | "signalTitle" | "signalSummary" | "repos" | "moatSummary" | "moatRisks">, {
        by_signal_key: ["signalKey", "_creationTime"];
    }, {}, {}>;
    strategyMetricsCache: import("convex/server").TableDefinition<import("convex/values").VObject<{
        sources?: {
            title: string;
            url: string;
        }[];
        signalSummary?: string;
        narrative?: string;
        risks?: string[];
        fetchedAt: number;
        metrics: {
            source?: string;
            context?: string;
            unit?: string;
            label: string;
            value: string;
        }[];
        signalKey: string;
        signalTitle: string;
    }, {
        signalKey: import("convex/values").VString<string, "required">;
        signalTitle: import("convex/values").VString<string, "required">;
        signalSummary: import("convex/values").VString<string, "optional">;
        metrics: import("convex/values").VArray<{
            source?: string;
            context?: string;
            unit?: string;
            label: string;
            value: string;
        }[], import("convex/values").VObject<{
            source?: string;
            context?: string;
            unit?: string;
            label: string;
            value: string;
        }, {
            label: import("convex/values").VString<string, "required">;
            value: import("convex/values").VString<string, "required">;
            unit: import("convex/values").VString<string, "optional">;
            context: import("convex/values").VString<string, "optional">;
            source: import("convex/values").VString<string, "optional">;
        }, "required", "source" | "context" | "label" | "value" | "unit">, "required">;
        narrative: import("convex/values").VString<string, "optional">;
        risks: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        sources: import("convex/values").VArray<{
            title: string;
            url: string;
        }[], import("convex/values").VObject<{
            title: string;
            url: string;
        }, {
            title: import("convex/values").VString<string, "required">;
            url: import("convex/values").VString<string, "required">;
        }, "required", "title" | "url">, "optional">;
        fetchedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "sources" | "fetchedAt" | "metrics" | "signalKey" | "signalTitle" | "signalSummary" | "narrative" | "risks">, {
        by_signal_key: ["signalKey", "_creationTime"];
    }, {}, {}>;
    searchEvaluations: import("convex/server").TableDefinition<import("convex/values").VObject<{
        judgeModel?: string;
        judgePromptVersion?: string;
        rawResponse?: string;
        createdAt: number;
        query: string;
        evaluationId: string;
        mode: string;
        judgeInput: string;
        judgeResult: string;
        pass: boolean;
        overallScore: number;
    }, {
        evaluationId: import("convex/values").VString<string, "required">;
        query: import("convex/values").VString<string, "required">;
        mode: import("convex/values").VString<string, "required">;
        judgeModel: import("convex/values").VString<string, "optional">;
        judgePromptVersion: import("convex/values").VString<string, "optional">;
        rawResponse: import("convex/values").VString<string, "optional">;
        judgeInput: import("convex/values").VString<string, "required">;
        judgeResult: import("convex/values").VString<string, "required">;
        pass: import("convex/values").VBoolean<boolean, "required">;
        overallScore: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "query" | "evaluationId" | "mode" | "judgeModel" | "judgePromptVersion" | "rawResponse" | "judgeInput" | "judgeResult" | "pass" | "overallScore">, {
        by_evaluation_id: ["evaluationId", "_creationTime"];
        by_pass: ["pass", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
        by_judge_model: ["judgeModel", "_creationTime"];
    }, {}, {}>;
    evaluationRuns: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        updatedAt?: number;
        summary?: {
            failed: number;
            passed: number;
            total: number;
            passRate: number;
            isPassing: boolean;
            threshold: number;
        };
        error?: string;
        completedAt?: number;
        status: "running" | "completed" | "failed";
        startedAt: number;
        sessionId: string;
        mode: "anonymous" | "authenticated" | "batch";
        queryIds: string[];
        completedQueries: number;
        passedQueries: number;
        failedQueries: number;
        results: {
            responseSnippet?: string;
            query: string;
            queryId: string;
            persona: string;
            expectedOutcome: string;
            actualOutcome: string;
            passed: boolean;
            containsRequired: boolean;
            noForbidden: boolean;
            failureReasons: string[];
            responseLength: number;
            executedAt: number;
        }[];
    }, {
        sessionId: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        mode: import("convex/values").VUnion<"anonymous" | "authenticated" | "batch", [import("convex/values").VLiteral<"anonymous", "required">, import("convex/values").VLiteral<"authenticated", "required">, import("convex/values").VLiteral<"batch", "required">], "required", never>;
        status: import("convex/values").VUnion<"running" | "completed" | "failed", [import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        queryIds: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        completedQueries: import("convex/values").VFloat64<number, "required">;
        passedQueries: import("convex/values").VFloat64<number, "required">;
        failedQueries: import("convex/values").VFloat64<number, "required">;
        results: import("convex/values").VArray<{
            responseSnippet?: string;
            query: string;
            queryId: string;
            persona: string;
            expectedOutcome: string;
            actualOutcome: string;
            passed: boolean;
            containsRequired: boolean;
            noForbidden: boolean;
            failureReasons: string[];
            responseLength: number;
            executedAt: number;
        }[], import("convex/values").VObject<{
            responseSnippet?: string;
            query: string;
            queryId: string;
            persona: string;
            expectedOutcome: string;
            actualOutcome: string;
            passed: boolean;
            containsRequired: boolean;
            noForbidden: boolean;
            failureReasons: string[];
            responseLength: number;
            executedAt: number;
        }, {
            queryId: import("convex/values").VString<string, "required">;
            query: import("convex/values").VString<string, "required">;
            persona: import("convex/values").VString<string, "required">;
            expectedOutcome: import("convex/values").VString<string, "required">;
            actualOutcome: import("convex/values").VString<string, "required">;
            passed: import("convex/values").VBoolean<boolean, "required">;
            containsRequired: import("convex/values").VBoolean<boolean, "required">;
            noForbidden: import("convex/values").VBoolean<boolean, "required">;
            failureReasons: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            responseLength: import("convex/values").VFloat64<number, "required">;
            responseSnippet: import("convex/values").VString<string, "optional">;
            executedAt: import("convex/values").VFloat64<number, "required">;
        }, "required", "query" | "queryId" | "persona" | "expectedOutcome" | "actualOutcome" | "passed" | "containsRequired" | "noForbidden" | "failureReasons" | "responseLength" | "responseSnippet" | "executedAt">, "required">;
        summary: import("convex/values").VObject<{
            failed: number;
            passed: number;
            total: number;
            passRate: number;
            isPassing: boolean;
            threshold: number;
        }, {
            total: import("convex/values").VFloat64<number, "required">;
            passed: import("convex/values").VFloat64<number, "required">;
            failed: import("convex/values").VFloat64<number, "required">;
            passRate: import("convex/values").VFloat64<number, "required">;
            isPassing: import("convex/values").VBoolean<boolean, "required">;
            threshold: import("convex/values").VFloat64<number, "required">;
        }, "optional", "failed" | "passed" | "total" | "passRate" | "isPassing" | "threshold">;
        startedAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "optional">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
        error: import("convex/values").VString<string, "optional">;
    }, "required", "userId" | "updatedAt" | "summary" | "status" | "error" | "startedAt" | "sessionId" | "mode" | "queryIds" | "completedQueries" | "passedQueries" | "failedQueries" | "results" | "completedAt" | "summary.failed" | "summary.passed" | "summary.total" | "summary.passRate" | "summary.isPassing" | "summary.threshold">, {
        by_session: ["sessionId", "_creationTime"];
    }, {}, {}>;
    evaluation_scenarios: import("convex/server").TableDefinition<import("convex/values").VObject<{
        version?: string;
        allowedPersonas?: string[];
        domain?: string;
        requirements?: {
            minToolCalls?: number;
            maxToolCalls?: number;
            maxCostUsd?: number;
            maxClarifyingQuestions?: number;
            requireVerificationStep?: boolean;
            requireProviderUsage?: boolean;
            requireTools?: string[];
        };
        createdAt: number;
        name: string;
        query: string;
        scenarioId: string;
        expectedPersona: string;
        expectedEntityId: string;
    }, {
        scenarioId: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "required">;
        query: import("convex/values").VString<string, "required">;
        expectedPersona: import("convex/values").VString<string, "required">;
        expectedEntityId: import("convex/values").VString<string, "required">;
        allowedPersonas: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        domain: import("convex/values").VString<string, "optional">;
        requirements: import("convex/values").VObject<{
            minToolCalls?: number;
            maxToolCalls?: number;
            maxCostUsd?: number;
            maxClarifyingQuestions?: number;
            requireVerificationStep?: boolean;
            requireProviderUsage?: boolean;
            requireTools?: string[];
        }, {
            minToolCalls: import("convex/values").VFloat64<number, "optional">;
            maxToolCalls: import("convex/values").VFloat64<number, "optional">;
            maxCostUsd: import("convex/values").VFloat64<number, "optional">;
            maxClarifyingQuestions: import("convex/values").VFloat64<number, "optional">;
            requireVerificationStep: import("convex/values").VBoolean<boolean, "optional">;
            requireProviderUsage: import("convex/values").VBoolean<boolean, "optional">;
            requireTools: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        }, "optional", "minToolCalls" | "maxToolCalls" | "maxCostUsd" | "maxClarifyingQuestions" | "requireVerificationStep" | "requireProviderUsage" | "requireTools">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        version: import("convex/values").VString<string, "optional">;
    }, "required", "createdAt" | "name" | "query" | "version" | "scenarioId" | "expectedPersona" | "expectedEntityId" | "allowedPersonas" | "domain" | "requirements" | "requirements.minToolCalls" | "requirements.maxToolCalls" | "requirements.maxCostUsd" | "requirements.maxClarifyingQuestions" | "requirements.requireVerificationStep" | "requirements.requireProviderUsage" | "requirements.requireTools">, {
        by_scenario_id: ["scenarioId", "_creationTime"];
        by_domain: ["domain", "_creationTime"];
    }, {}, {}>;
    digestCache: import("convex/server").TableDefinition<import("convex/values").VObject<{
        ntfyPayload?: {
            title: string;
            body: string;
        };
        slackPayload?: string;
        emailPayload?: string;
        sentToNtfy?: boolean;
        sentToSlack?: boolean;
        sentToEmail?: boolean;
        createdAt: number;
        expiresAt: number;
        model: string;
        dateString: string;
        persona: string;
        rawText: string;
        digest: {
            leadStory?: {
                url?: string;
                reflection?: {
                    what: string;
                    soWhat: string;
                    nowWhat: string;
                };
                title: string;
                whyItMatters: string;
            };
            entitySpotlight?: {
                fundingStage?: string;
                type: string;
                name: string;
                keyInsight: string;
            }[];
            dateString: string;
            narrativeThesis: string;
            signals: {
                url?: string;
                reflection?: {
                    what: string;
                    soWhat: string;
                    nowWhat: string;
                };
                hardNumbers?: string;
                directQuote?: string;
                title: string;
                summary: string;
            }[];
            actionItems: {
                persona: string;
                action: string;
            }[];
            storyCount: number;
            topSources: string[];
            topCategories: string[];
            processingTimeMs: number;
        };
        usage: {
            inputTokens: number;
            outputTokens: number;
        };
        feedItemCount: number;
    }, {
        dateString: import("convex/values").VString<string, "required">;
        persona: import("convex/values").VString<string, "required">;
        model: import("convex/values").VString<string, "required">;
        rawText: import("convex/values").VString<string, "required">;
        digest: import("convex/values").VObject<{
            leadStory?: {
                url?: string;
                reflection?: {
                    what: string;
                    soWhat: string;
                    nowWhat: string;
                };
                title: string;
                whyItMatters: string;
            };
            entitySpotlight?: {
                fundingStage?: string;
                type: string;
                name: string;
                keyInsight: string;
            }[];
            dateString: string;
            narrativeThesis: string;
            signals: {
                url?: string;
                reflection?: {
                    what: string;
                    soWhat: string;
                    nowWhat: string;
                };
                hardNumbers?: string;
                directQuote?: string;
                title: string;
                summary: string;
            }[];
            actionItems: {
                persona: string;
                action: string;
            }[];
            storyCount: number;
            topSources: string[];
            topCategories: string[];
            processingTimeMs: number;
        }, {
            dateString: import("convex/values").VString<string, "required">;
            narrativeThesis: import("convex/values").VString<string, "required">;
            leadStory: import("convex/values").VObject<{
                url?: string;
                reflection?: {
                    what: string;
                    soWhat: string;
                    nowWhat: string;
                };
                title: string;
                whyItMatters: string;
            }, {
                title: import("convex/values").VString<string, "required">;
                url: import("convex/values").VString<string, "optional">;
                whyItMatters: import("convex/values").VString<string, "required">;
                reflection: import("convex/values").VObject<{
                    what: string;
                    soWhat: string;
                    nowWhat: string;
                }, {
                    what: import("convex/values").VString<string, "required">;
                    soWhat: import("convex/values").VString<string, "required">;
                    nowWhat: import("convex/values").VString<string, "required">;
                }, "optional", "what" | "soWhat" | "nowWhat">;
            }, "optional", "title" | "url" | "whyItMatters" | "reflection" | "reflection.what" | "reflection.soWhat" | "reflection.nowWhat">;
            signals: import("convex/values").VArray<{
                url?: string;
                reflection?: {
                    what: string;
                    soWhat: string;
                    nowWhat: string;
                };
                hardNumbers?: string;
                directQuote?: string;
                title: string;
                summary: string;
            }[], import("convex/values").VObject<{
                url?: string;
                reflection?: {
                    what: string;
                    soWhat: string;
                    nowWhat: string;
                };
                hardNumbers?: string;
                directQuote?: string;
                title: string;
                summary: string;
            }, {
                title: import("convex/values").VString<string, "required">;
                url: import("convex/values").VString<string, "optional">;
                summary: import("convex/values").VString<string, "required">;
                hardNumbers: import("convex/values").VString<string, "optional">;
                directQuote: import("convex/values").VString<string, "optional">;
                reflection: import("convex/values").VObject<{
                    what: string;
                    soWhat: string;
                    nowWhat: string;
                }, {
                    what: import("convex/values").VString<string, "required">;
                    soWhat: import("convex/values").VString<string, "required">;
                    nowWhat: import("convex/values").VString<string, "required">;
                }, "optional", "what" | "soWhat" | "nowWhat">;
            }, "required", "title" | "url" | "summary" | "reflection" | "reflection.what" | "reflection.soWhat" | "reflection.nowWhat" | "hardNumbers" | "directQuote">, "required">;
            actionItems: import("convex/values").VArray<{
                persona: string;
                action: string;
            }[], import("convex/values").VObject<{
                persona: string;
                action: string;
            }, {
                persona: import("convex/values").VString<string, "required">;
                action: import("convex/values").VString<string, "required">;
            }, "required", "persona" | "action">, "required">;
            entitySpotlight: import("convex/values").VArray<{
                fundingStage?: string;
                type: string;
                name: string;
                keyInsight: string;
            }[], import("convex/values").VObject<{
                fundingStage?: string;
                type: string;
                name: string;
                keyInsight: string;
            }, {
                name: import("convex/values").VString<string, "required">;
                type: import("convex/values").VString<string, "required">;
                keyInsight: import("convex/values").VString<string, "required">;
                fundingStage: import("convex/values").VString<string, "optional">;
            }, "required", "type" | "name" | "keyInsight" | "fundingStage">, "optional">;
            storyCount: import("convex/values").VFloat64<number, "required">;
            topSources: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            topCategories: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            processingTimeMs: import("convex/values").VFloat64<number, "required">;
        }, "required", "dateString" | "narrativeThesis" | "leadStory" | "signals" | "actionItems" | "entitySpotlight" | "storyCount" | "topSources" | "topCategories" | "processingTimeMs" | "leadStory.title" | "leadStory.url" | "leadStory.whyItMatters" | "leadStory.reflection" | "leadStory.reflection.what" | "leadStory.reflection.soWhat" | "leadStory.reflection.nowWhat">;
        ntfyPayload: import("convex/values").VObject<{
            title: string;
            body: string;
        }, {
            title: import("convex/values").VString<string, "required">;
            body: import("convex/values").VString<string, "required">;
        }, "optional", "title" | "body">;
        slackPayload: import("convex/values").VString<string, "optional">;
        emailPayload: import("convex/values").VString<string, "optional">;
        usage: import("convex/values").VObject<{
            inputTokens: number;
            outputTokens: number;
        }, {
            inputTokens: import("convex/values").VFloat64<number, "required">;
            outputTokens: import("convex/values").VFloat64<number, "required">;
        }, "required", "inputTokens" | "outputTokens">;
        feedItemCount: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        expiresAt: import("convex/values").VFloat64<number, "required">;
        sentToNtfy: import("convex/values").VBoolean<boolean, "optional">;
        sentToSlack: import("convex/values").VBoolean<boolean, "optional">;
        sentToEmail: import("convex/values").VBoolean<boolean, "optional">;
    }, "required", "createdAt" | "expiresAt" | "model" | "dateString" | "persona" | "rawText" | "digest" | "ntfyPayload" | "slackPayload" | "emailPayload" | "usage" | "feedItemCount" | "sentToNtfy" | "sentToSlack" | "sentToEmail" | "digest.dateString" | "digest.narrativeThesis" | "digest.leadStory" | "digest.signals" | "digest.actionItems" | "digest.entitySpotlight" | "digest.storyCount" | "digest.topSources" | "digest.topCategories" | "digest.processingTimeMs" | "digest.leadStory.title" | "digest.leadStory.url" | "digest.leadStory.whyItMatters" | "digest.leadStory.reflection" | "digest.leadStory.reflection.what" | "digest.leadStory.reflection.soWhat" | "digest.leadStory.reflection.nowWhat" | "ntfyPayload.title" | "ntfyPayload.body" | "usage.inputTokens" | "usage.outputTokens">, {
        by_date_persona: ["dateString", "persona", "_creationTime"];
        by_date: ["dateString", "_creationTime"];
        by_expires: ["expiresAt", "_creationTime"];
    }, {}, {}>;
    /**
     * Swarm definitions - groups of parallel agents working together.
     * Each swarm is linked to a thread for UI display.
     */
    agentSwarms: import("convex/server").TableDefinition<import("convex/values").VObject<{
        name?: string;
        confidence?: number;
        startedAt?: number;
        elapsedMs?: number;
        completedAt?: number;
        mergedResult?: string;
        userId: import("convex/values").GenericId<"users">;
        createdAt: number;
        status: "pending" | "completed" | "failed" | "cancelled" | "spawning" | "executing" | "gathering" | "synthesizing";
        threadId: string;
        query: string;
        swarmId: string;
        pattern: "fan_out_gather" | "pipeline" | "swarm";
        agentConfigs: {
            agentName: string;
            query: string;
            role: string;
            stateKeyPrefix: string;
        }[];
    }, {
        swarmId: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        threadId: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "optional">;
        query: import("convex/values").VString<string, "required">;
        pattern: import("convex/values").VUnion<"fan_out_gather" | "pipeline" | "swarm", [import("convex/values").VLiteral<"fan_out_gather", "required">, import("convex/values").VLiteral<"pipeline", "required">, import("convex/values").VLiteral<"swarm", "required">], "required", never>;
        status: import("convex/values").VUnion<"pending" | "completed" | "failed" | "cancelled" | "spawning" | "executing" | "gathering" | "synthesizing", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"spawning", "required">, import("convex/values").VLiteral<"executing", "required">, import("convex/values").VLiteral<"gathering", "required">, import("convex/values").VLiteral<"synthesizing", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"cancelled", "required">], "required", never>;
        agentConfigs: import("convex/values").VArray<{
            agentName: string;
            query: string;
            role: string;
            stateKeyPrefix: string;
        }[], import("convex/values").VObject<{
            agentName: string;
            query: string;
            role: string;
            stateKeyPrefix: string;
        }, {
            agentName: import("convex/values").VString<string, "required">;
            role: import("convex/values").VString<string, "required">;
            query: import("convex/values").VString<string, "required">;
            stateKeyPrefix: import("convex/values").VString<string, "required">;
        }, "required", "agentName" | "query" | "role" | "stateKeyPrefix">, "required">;
        mergedResult: import("convex/values").VString<string, "optional">;
        confidence: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        startedAt: import("convex/values").VFloat64<number, "optional">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
        elapsedMs: import("convex/values").VFloat64<number, "optional">;
    }, "required", "userId" | "createdAt" | "name" | "status" | "threadId" | "confidence" | "query" | "startedAt" | "swarmId" | "elapsedMs" | "pattern" | "completedAt" | "agentConfigs" | "mergedResult">, {
        by_swarm: ["swarmId", "_creationTime"];
        by_thread: ["threadId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_user_status: ["userId", "status", "_creationTime"];
    }, {}, {}>;
    /**
     * Individual agent tasks within a swarm.
     * Each task represents one agent's work.
     */
    swarmAgentTasks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        errorMessage?: string;
        delegationId?: string;
        startedAt?: number;
        elapsedMs?: number;
        completedAt?: number;
        result?: string;
        resultSummary?: string;
        createdAt: number;
        status: "pending" | "running" | "completed" | "failed" | "cancelled";
        agentName: string;
        query: string;
        swarmId: string;
        role: string;
        taskId: string;
        stateKeyPrefix: string;
    }, {
        swarmId: import("convex/values").VString<string, "required">;
        taskId: import("convex/values").VString<string, "required">;
        delegationId: import("convex/values").VString<string, "optional">;
        agentName: import("convex/values").VString<string, "required">;
        query: import("convex/values").VString<string, "required">;
        role: import("convex/values").VString<string, "required">;
        stateKeyPrefix: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"pending" | "running" | "completed" | "failed" | "cancelled", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"cancelled", "required">], "required", never>;
        result: import("convex/values").VString<string, "optional">;
        resultSummary: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        startedAt: import("convex/values").VFloat64<number, "optional">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
        elapsedMs: import("convex/values").VFloat64<number, "optional">;
        errorMessage: import("convex/values").VString<string, "optional">;
    }, "required", "createdAt" | "status" | "errorMessage" | "delegationId" | "agentName" | "query" | "startedAt" | "swarmId" | "role" | "elapsedMs" | "taskId" | "completedAt" | "stateKeyPrefix" | "result" | "resultSummary">, {
        by_swarm: ["swarmId", "_creationTime"];
        by_task: ["taskId", "_creationTime"];
        by_swarm_status: ["swarmId", "status", "_creationTime"];
    }, {}, {}>;
    /**
     * Cross-agent context sharing with unique key isolation.
     * Prevents race conditions via namespaced keys.
     */
    swarmContextSharing: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        key: string;
        swarmId: string;
        value: any;
        sourceTaskId: string;
        valueType: "discovery" | "artifact" | "question" | "synthesis";
        sourceAgentName: string;
    }, {
        swarmId: import("convex/values").VString<string, "required">;
        key: import("convex/values").VString<string, "required">;
        value: import("convex/values").VAny<any, "required", string>;
        valueType: import("convex/values").VUnion<"discovery" | "artifact" | "question" | "synthesis", [import("convex/values").VLiteral<"discovery", "required">, import("convex/values").VLiteral<"artifact", "required">, import("convex/values").VLiteral<"question", "required">, import("convex/values").VLiteral<"synthesis", "required">], "required", never>;
        sourceAgentName: import("convex/values").VString<string, "required">;
        sourceTaskId: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "key" | "swarmId" | "value" | "sourceTaskId" | "valueType" | "sourceAgentName" | `value.${string}`>, {
        by_swarm: ["swarmId", "_creationTime"];
        by_key: ["key", "_creationTime"];
        by_swarm_type: ["swarmId", "valueType", "_creationTime"];
    }, {}, {}>;
    /**
     * Root task tree for a given agent thread/run.
     * One tree per user query, tracks overall status and final merged result.
     */
    parallelTaskTrees: import("convex/server").TableDefinition<import("convex/values").VObject<{
        confidence?: number;
        elapsedMs?: number;
        completedAt?: number;
        mergedResult?: string;
        rootTaskId?: string;
        phase?: string;
        phaseProgress?: number;
        totalBranches?: number;
        activeBranches?: number;
        completedBranches?: number;
        prunedBranches?: number;
        tokenUsage?: {
            input: number;
            output: number;
        };
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        agentThreadId: string;
        createdAt: number;
        status: "completed" | "failed" | "executing" | "decomposing" | "verifying" | "cross_checking" | "merging";
        query: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        agentThreadId: import("convex/values").VString<string, "required">;
        rootTaskId: import("convex/values").VString<string, "optional">;
        query: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"completed" | "failed" | "executing" | "decomposing" | "verifying" | "cross_checking" | "merging", [import("convex/values").VLiteral<"decomposing", "required">, import("convex/values").VLiteral<"executing", "required">, import("convex/values").VLiteral<"verifying", "required">, import("convex/values").VLiteral<"cross_checking", "required">, import("convex/values").VLiteral<"merging", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        phase: import("convex/values").VString<string, "optional">;
        phaseProgress: import("convex/values").VFloat64<number, "optional">;
        totalBranches: import("convex/values").VFloat64<number, "optional">;
        activeBranches: import("convex/values").VFloat64<number, "optional">;
        completedBranches: import("convex/values").VFloat64<number, "optional">;
        prunedBranches: import("convex/values").VFloat64<number, "optional">;
        mergedResult: import("convex/values").VString<string, "optional">;
        confidence: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
        elapsedMs: import("convex/values").VFloat64<number, "optional">;
        tokenUsage: import("convex/values").VObject<{
            input: number;
            output: number;
        }, {
            input: import("convex/values").VFloat64<number, "required">;
            output: import("convex/values").VFloat64<number, "required">;
        }, "optional", "input" | "output">;
    }, "required", "userId" | "updatedAt" | "agentThreadId" | "createdAt" | "status" | "confidence" | "query" | "elapsedMs" | "completedAt" | "mergedResult" | "rootTaskId" | "phase" | "phaseProgress" | "totalBranches" | "activeBranches" | "completedBranches" | "prunedBranches" | "tokenUsage" | "tokenUsage.input" | "tokenUsage.output">, {
        by_user: ["userId", "_creationTime"];
        by_agent_thread: ["agentThreadId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_user_createdAt: ["userId", "createdAt", "_creationTime"];
    }, {}, {}>;
    /**
     * Individual task nodes in the parallel execution tree.
     * Forms a DAG with parent-child relationships.
     */
    parallelTaskNodes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string;
        errorMessage?: string;
        confidence?: number;
        agentName?: string;
        startedAt?: number;
        subagentThreadId?: string;
        elapsedMs?: number;
        inputTokens?: number;
        outputTokens?: number;
        retryCount?: number;
        completedAt?: number;
        result?: string;
        resultSummary?: string;
        parentTaskId?: string;
        branchIndex?: number;
        siblingCount?: number;
        verificationScore?: number;
        verificationNotes?: string;
        critiques?: {
            source: string;
            verdict: "partial" | "agree" | "disagree";
            reason: string;
        }[];
        survivedVerification?: boolean;
        canBacktrack?: boolean;
        updatedAt: number;
        createdAt: number;
        title: string;
        status: "pending" | "running" | "completed" | "failed" | "verifying" | "awaiting_children" | "pruned" | "backtracked";
        taskId: string;
        treeId: import("convex/values").GenericId<"parallelTaskTrees">;
        taskType: "root" | "branch" | "verification" | "critique" | "merge" | "refinement";
        depth: number;
    }, {
        treeId: import("convex/values").VId<import("convex/values").GenericId<"parallelTaskTrees">, "required">;
        taskId: import("convex/values").VString<string, "required">;
        parentTaskId: import("convex/values").VString<string, "optional">;
        title: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "optional">;
        taskType: import("convex/values").VUnion<"root" | "branch" | "verification" | "critique" | "merge" | "refinement", [import("convex/values").VLiteral<"root", "required">, import("convex/values").VLiteral<"branch", "required">, import("convex/values").VLiteral<"verification", "required">, import("convex/values").VLiteral<"critique", "required">, import("convex/values").VLiteral<"merge", "required">, import("convex/values").VLiteral<"refinement", "required">], "required", never>;
        status: import("convex/values").VUnion<"pending" | "running" | "completed" | "failed" | "verifying" | "awaiting_children" | "pruned" | "backtracked", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"awaiting_children", "required">, import("convex/values").VLiteral<"verifying", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"pruned", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"backtracked", "required">], "required", never>;
        branchIndex: import("convex/values").VFloat64<number, "optional">;
        siblingCount: import("convex/values").VFloat64<number, "optional">;
        depth: import("convex/values").VFloat64<number, "required">;
        agentName: import("convex/values").VString<string, "optional">;
        subagentThreadId: import("convex/values").VString<string, "optional">;
        result: import("convex/values").VString<string, "optional">;
        resultSummary: import("convex/values").VString<string, "optional">;
        confidence: import("convex/values").VFloat64<number, "optional">;
        verificationScore: import("convex/values").VFloat64<number, "optional">;
        verificationNotes: import("convex/values").VString<string, "optional">;
        critiques: import("convex/values").VArray<{
            source: string;
            verdict: "partial" | "agree" | "disagree";
            reason: string;
        }[], import("convex/values").VObject<{
            source: string;
            verdict: "partial" | "agree" | "disagree";
            reason: string;
        }, {
            source: import("convex/values").VString<string, "required">;
            verdict: import("convex/values").VUnion<"partial" | "agree" | "disagree", [import("convex/values").VLiteral<"agree", "required">, import("convex/values").VLiteral<"disagree", "required">, import("convex/values").VLiteral<"partial", "required">], "required", never>;
            reason: import("convex/values").VString<string, "required">;
        }, "required", "source" | "verdict" | "reason">, "optional">;
        survivedVerification: import("convex/values").VBoolean<boolean, "optional">;
        startedAt: import("convex/values").VFloat64<number, "optional">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
        elapsedMs: import("convex/values").VFloat64<number, "optional">;
        inputTokens: import("convex/values").VFloat64<number, "optional">;
        outputTokens: import("convex/values").VFloat64<number, "optional">;
        errorMessage: import("convex/values").VString<string, "optional">;
        retryCount: import("convex/values").VFloat64<number, "optional">;
        canBacktrack: import("convex/values").VBoolean<boolean, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "updatedAt" | "createdAt" | "title" | "description" | "status" | "errorMessage" | "confidence" | "agentName" | "startedAt" | "subagentThreadId" | "elapsedMs" | "inputTokens" | "outputTokens" | "retryCount" | "taskId" | "completedAt" | "result" | "resultSummary" | "treeId" | "parentTaskId" | "taskType" | "branchIndex" | "siblingCount" | "depth" | "verificationScore" | "verificationNotes" | "critiques" | "survivedVerification" | "canBacktrack">, {
        by_tree: ["treeId", "_creationTime"];
        by_tree_status: ["treeId", "status", "_creationTime"];
        by_tree_parent: ["treeId", "parentTaskId", "_creationTime"];
        by_tree_depth: ["treeId", "depth", "_creationTime"];
        by_taskId: ["taskId", "_creationTime"];
    }, {}, {}>;
    /**
     * Real-time streaming events for task nodes.
     * Enables live UI updates during execution.
     */
    parallelTaskEvents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        message?: string;
        data?: any;
        createdAt: number;
        eventType: "completed" | "failed" | "progress" | "pruned" | "backtracked" | "started" | "thinking" | "tool_call" | "result_partial" | "result_final" | "verification_started" | "verification_result" | "critique_received";
        seq: number;
        taskId: string;
        treeId: import("convex/values").GenericId<"parallelTaskTrees">;
    }, {
        treeId: import("convex/values").VId<import("convex/values").GenericId<"parallelTaskTrees">, "required">;
        taskId: import("convex/values").VString<string, "required">;
        seq: import("convex/values").VFloat64<number, "required">;
        eventType: import("convex/values").VUnion<"completed" | "failed" | "progress" | "pruned" | "backtracked" | "started" | "thinking" | "tool_call" | "result_partial" | "result_final" | "verification_started" | "verification_result" | "critique_received", [import("convex/values").VLiteral<"started", "required">, import("convex/values").VLiteral<"progress", "required">, import("convex/values").VLiteral<"thinking", "required">, import("convex/values").VLiteral<"tool_call", "required">, import("convex/values").VLiteral<"result_partial", "required">, import("convex/values").VLiteral<"result_final", "required">, import("convex/values").VLiteral<"verification_started", "required">, import("convex/values").VLiteral<"verification_result", "required">, import("convex/values").VLiteral<"critique_received", "required">, import("convex/values").VLiteral<"pruned", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"backtracked", "required">], "required", never>;
        message: import("convex/values").VString<string, "optional">;
        data: import("convex/values").VAny<any, "optional", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "eventType" | "seq" | "message" | "data" | `data.${string}` | "taskId" | "treeId">, {
        by_tree: ["treeId", "createdAt", "_creationTime"];
        by_task: ["taskId", "seq", "_creationTime"];
        by_tree_task: ["treeId", "taskId", "seq", "_creationTime"];
    }, {}, {}>;
    /**
     * Cross-check matrix tracking which branches have critiqued each other.
     * Used to ensure thorough cross-validation.
     */
    parallelTaskCrossChecks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        agreementPoints?: string[];
        disagreementPoints?: string[];
        reasoning?: string;
        createdAt: number;
        confidence: number;
        sourceTaskId: string;
        targetTaskId: string;
        treeId: import("convex/values").GenericId<"parallelTaskTrees">;
        verdict: "partial" | "agree" | "disagree" | "abstain";
    }, {
        treeId: import("convex/values").VId<import("convex/values").GenericId<"parallelTaskTrees">, "required">;
        sourceTaskId: import("convex/values").VString<string, "required">;
        targetTaskId: import("convex/values").VString<string, "required">;
        verdict: import("convex/values").VUnion<"partial" | "agree" | "disagree" | "abstain", [import("convex/values").VLiteral<"agree", "required">, import("convex/values").VLiteral<"disagree", "required">, import("convex/values").VLiteral<"partial", "required">, import("convex/values").VLiteral<"abstain", "required">], "required", never>;
        agreementPoints: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        disagreementPoints: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        confidence: import("convex/values").VFloat64<number, "required">;
        reasoning: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "confidence" | "sourceTaskId" | "targetTaskId" | "treeId" | "verdict" | "agreementPoints" | "disagreementPoints" | "reasoning">, {
        by_tree: ["treeId", "_creationTime"];
        by_source: ["sourceTaskId", "_creationTime"];
        by_target: ["targetTaskId", "_creationTime"];
        by_tree_source_target: ["treeId", "sourceTaskId", "targetTaskId", "_creationTime"];
    }, {}, {}>;
    dossierFocusState: import("convex/server").TableDefinition<import("convex/values").VObject<{
        currentAct?: "actI" | "actII" | "actIII";
        focusedDataIndex?: number;
        hoveredSpanId?: string;
        activeSectionId?: string;
        focusedSeriesId?: string;
        focusSource?: "chart_hover" | "text_hover" | "agent_tool" | "panel_action";
        userId: import("convex/values").GenericId<"users">;
        briefId: string;
        updatedAt: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        briefId: import("convex/values").VString<string, "required">;
        currentAct: import("convex/values").VUnion<"actI" | "actII" | "actIII", [import("convex/values").VLiteral<"actI", "required">, import("convex/values").VLiteral<"actII", "required">, import("convex/values").VLiteral<"actIII", "required">], "optional", never>;
        focusedDataIndex: import("convex/values").VFloat64<number, "optional">;
        hoveredSpanId: import("convex/values").VString<string, "optional">;
        activeSectionId: import("convex/values").VString<string, "optional">;
        focusedSeriesId: import("convex/values").VString<string, "optional">;
        focusSource: import("convex/values").VUnion<"chart_hover" | "text_hover" | "agent_tool" | "panel_action", [import("convex/values").VLiteral<"chart_hover", "required">, import("convex/values").VLiteral<"text_hover", "required">, import("convex/values").VLiteral<"agent_tool", "required">, import("convex/values").VLiteral<"panel_action", "required">], "optional", never>;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "briefId" | "currentAct" | "focusedDataIndex" | "hoveredSpanId" | "activeSectionId" | "focusedSeriesId" | "focusSource" | "updatedAt">, {
        by_user_brief: ["userId", "briefId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    dossierAnnotations: import("convex/server").TableDefinition<import("convex/values").VObject<{
        seriesId?: string;
        icon?: string;
        agentThreadId?: string;
        userId: import("convex/values").GenericId<"users">;
        briefId: string;
        dataIndex: number;
        text: string;
        position: "above" | "below" | "left" | "right";
        visibleInActs: ("actI" | "actII" | "actIII")[];
        source: "agent" | "user" | "system";
        createdAt: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        briefId: import("convex/values").VString<string, "required">;
        seriesId: import("convex/values").VString<string, "optional">;
        dataIndex: import("convex/values").VFloat64<number, "required">;
        text: import("convex/values").VString<string, "required">;
        position: import("convex/values").VUnion<"above" | "below" | "left" | "right", [import("convex/values").VLiteral<"above", "required">, import("convex/values").VLiteral<"below", "required">, import("convex/values").VLiteral<"left", "required">, import("convex/values").VLiteral<"right", "required">], "required", never>;
        icon: import("convex/values").VString<string, "optional">;
        visibleInActs: import("convex/values").VArray<("actI" | "actII" | "actIII")[], import("convex/values").VUnion<"actI" | "actII" | "actIII", [import("convex/values").VLiteral<"actI", "required">, import("convex/values").VLiteral<"actII", "required">, import("convex/values").VLiteral<"actIII", "required">], "required", never>, "required">;
        source: import("convex/values").VUnion<"agent" | "user" | "system", [import("convex/values").VLiteral<"agent", "required">, import("convex/values").VLiteral<"user", "required">, import("convex/values").VLiteral<"system", "required">], "required", never>;
        agentThreadId: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "briefId" | "seriesId" | "dataIndex" | "text" | "position" | "icon" | "visibleInActs" | "source" | "agentThreadId" | "createdAt">, {
        by_user_brief: ["userId", "briefId", "_creationTime"];
        by_brief_series: ["briefId", "seriesId", "_creationTime"];
        by_brief_dataIndex: ["briefId", "dataIndex", "_creationTime"];
    }, {}, {}>;
    dossierEnrichment: import("convex/server").TableDefinition<import("convex/values").VObject<{
        seriesId?: string;
        agentThreadId?: string;
        entities?: {
            url?: string;
            type: string;
            name: string;
        }[];
        sources?: {
            title?: string;
            url: string;
            retrievedAt: number;
        }[];
        expiresAt?: number;
        userId: import("convex/values").GenericId<"users">;
        briefId: string;
        dataIndex: number;
        createdAt: number;
        title: string;
        context: string;
        lastAccessedAt: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        briefId: import("convex/values").VString<string, "required">;
        seriesId: import("convex/values").VString<string, "optional">;
        dataIndex: import("convex/values").VFloat64<number, "required">;
        title: import("convex/values").VString<string, "required">;
        context: import("convex/values").VString<string, "required">;
        entities: import("convex/values").VArray<{
            url?: string;
            type: string;
            name: string;
        }[], import("convex/values").VObject<{
            url?: string;
            type: string;
            name: string;
        }, {
            name: import("convex/values").VString<string, "required">;
            type: import("convex/values").VString<string, "required">;
            url: import("convex/values").VString<string, "optional">;
        }, "required", "type" | "name" | "url">, "optional">;
        sources: import("convex/values").VArray<{
            title?: string;
            url: string;
            retrievedAt: number;
        }[], import("convex/values").VObject<{
            title?: string;
            url: string;
            retrievedAt: number;
        }, {
            url: import("convex/values").VString<string, "required">;
            title: import("convex/values").VString<string, "optional">;
            retrievedAt: import("convex/values").VFloat64<number, "required">;
        }, "required", "title" | "url" | "retrievedAt">, "optional">;
        agentThreadId: import("convex/values").VString<string, "optional">;
        expiresAt: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        lastAccessedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "briefId" | "seriesId" | "dataIndex" | "agentThreadId" | "createdAt" | "title" | "context" | "entities" | "sources" | "expiresAt" | "lastAccessedAt">, {
        by_user_brief: ["userId", "briefId", "_creationTime"];
        by_brief_dataIndex: ["briefId", "dataIndex", "_creationTime"];
        by_expires: ["expiresAt", "_creationTime"];
    }, {}, {}>;
    emailEvents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        threadId?: string;
        errorMessage?: string;
        runId?: string;
        messageId?: string;
        cc?: string[];
        bcc?: string[];
        bodyPreview?: string;
        providerResponse?: any;
        sentAt?: number;
        userId: import("convex/values").GenericId<"users">;
        createdAt: number;
        to: string;
        status: "queued" | "failed" | "sent" | "delivered" | "bounced";
        subject: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        threadId: import("convex/values").VString<string, "optional">;
        runId: import("convex/values").VString<string, "optional">;
        messageId: import("convex/values").VString<string, "optional">;
        to: import("convex/values").VString<string, "required">;
        cc: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        bcc: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        subject: import("convex/values").VString<string, "required">;
        bodyPreview: import("convex/values").VString<string, "optional">;
        status: import("convex/values").VUnion<"queued" | "failed" | "sent" | "delivered" | "bounced", [import("convex/values").VLiteral<"queued", "required">, import("convex/values").VLiteral<"sent", "required">, import("convex/values").VLiteral<"delivered", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"bounced", "required">], "required", never>;
        providerResponse: import("convex/values").VAny<any, "optional", string>;
        errorMessage: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        sentAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "userId" | "createdAt" | "to" | "status" | "threadId" | "errorMessage" | "runId" | "messageId" | "cc" | "bcc" | "subject" | "bodyPreview" | "providerResponse" | "sentAt" | `providerResponse.${string}`>, {
        by_user: ["userId", "_creationTime"];
        by_thread: ["threadId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_user_createdAt: ["userId", "createdAt", "_creationTime"];
    }, {}, {}>;
    spreadsheetEvents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        threadId?: string;
        runId?: string;
        targetRange?: string;
        previousArtifactId?: string;
        newArtifactId?: string;
        validationErrors?: string[];
        userId: import("convex/values").GenericId<"users">;
        createdAt: number;
        status: "failed" | "applied" | "reverted";
        spreadsheetId: import("convex/values").GenericId<"spreadsheets">;
        operation: "set_cell" | "insert_row" | "delete_row" | "add_column" | "delete_column" | "apply_formula" | "add_sheet" | "rename_sheet";
        payload: any;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        spreadsheetId: import("convex/values").VId<import("convex/values").GenericId<"spreadsheets">, "required">;
        threadId: import("convex/values").VString<string, "optional">;
        runId: import("convex/values").VString<string, "optional">;
        operation: import("convex/values").VUnion<"set_cell" | "insert_row" | "delete_row" | "add_column" | "delete_column" | "apply_formula" | "add_sheet" | "rename_sheet", [import("convex/values").VLiteral<"set_cell", "required">, import("convex/values").VLiteral<"insert_row", "required">, import("convex/values").VLiteral<"delete_row", "required">, import("convex/values").VLiteral<"add_column", "required">, import("convex/values").VLiteral<"delete_column", "required">, import("convex/values").VLiteral<"apply_formula", "required">, import("convex/values").VLiteral<"add_sheet", "required">, import("convex/values").VLiteral<"rename_sheet", "required">], "required", never>;
        targetRange: import("convex/values").VString<string, "optional">;
        payload: import("convex/values").VAny<any, "required", string>;
        previousArtifactId: import("convex/values").VString<string, "optional">;
        newArtifactId: import("convex/values").VString<string, "optional">;
        validationErrors: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        status: import("convex/values").VUnion<"failed" | "applied" | "reverted", [import("convex/values").VLiteral<"applied", "required">, import("convex/values").VLiteral<"reverted", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "createdAt" | "status" | "threadId" | "runId" | "spreadsheetId" | "operation" | "targetRange" | "payload" | "previousArtifactId" | "newArtifactId" | "validationErrors" | `payload.${string}`>, {
        by_spreadsheet: ["spreadsheetId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_thread: ["threadId", "_creationTime"];
        by_spreadsheet_createdAt: ["spreadsheetId", "createdAt", "_creationTime"];
    }, {}, {}>;
    calendarArtifacts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string;
        threadId?: string;
        runId?: string;
        location?: string;
        dtEnd?: number;
        attendees?: string[];
        linkedEventId?: import("convex/values").GenericId<"events">;
        userId: import("convex/values").GenericId<"users">;
        createdAt: number;
        summary: string;
        version: number;
        sequence: number;
        operation: "create" | "update" | "cancel";
        eventUid: string;
        icsContent: string;
        dtStart: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        threadId: import("convex/values").VString<string, "optional">;
        runId: import("convex/values").VString<string, "optional">;
        eventUid: import("convex/values").VString<string, "required">;
        operation: import("convex/values").VUnion<"create" | "update" | "cancel", [import("convex/values").VLiteral<"create", "required">, import("convex/values").VLiteral<"update", "required">, import("convex/values").VLiteral<"cancel", "required">], "required", never>;
        icsContent: import("convex/values").VString<string, "required">;
        summary: import("convex/values").VString<string, "required">;
        dtStart: import("convex/values").VFloat64<number, "required">;
        dtEnd: import("convex/values").VFloat64<number, "optional">;
        location: import("convex/values").VString<string, "optional">;
        description: import("convex/values").VString<string, "optional">;
        attendees: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        sequence: import("convex/values").VFloat64<number, "required">;
        version: import("convex/values").VFloat64<number, "required">;
        linkedEventId: import("convex/values").VId<import("convex/values").GenericId<"events">, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "createdAt" | "summary" | "description" | "threadId" | "runId" | "version" | "location" | "sequence" | "operation" | "eventUid" | "icsContent" | "dtStart" | "dtEnd" | "attendees" | "linkedEventId">, {
        by_user: ["userId", "_creationTime"];
        by_eventUid: ["eventUid", "_creationTime"];
        by_user_dtStart: ["userId", "dtStart", "_creationTime"];
        by_thread: ["threadId", "_creationTime"];
    }, {}, {}>;
    documentPatches: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        description?: string;
        threadId?: string;
        runId?: string;
        originalContentPreview?: string;
        newContentPreview?: string;
        createdAt: number;
        documentId: string;
        operations: any;
        appliedCount: number;
        failedCount: number;
    }, {
        documentId: import("convex/values").VString<string, "required">;
        operations: import("convex/values").VAny<any, "required", string>;
        description: import("convex/values").VString<string, "optional">;
        originalContentPreview: import("convex/values").VString<string, "optional">;
        newContentPreview: import("convex/values").VString<string, "optional">;
        appliedCount: import("convex/values").VFloat64<number, "required">;
        failedCount: import("convex/values").VFloat64<number, "required">;
        threadId: import("convex/values").VString<string, "optional">;
        runId: import("convex/values").VString<string, "optional">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "createdAt" | "description" | "documentId" | "threadId" | "runId" | "operations" | "originalContentPreview" | "newContentPreview" | "appliedCount" | "failedCount" | `operations.${string}`>, {
        by_document: ["documentId", "_creationTime"];
        by_document_createdAt: ["documentId", "createdAt", "_creationTime"];
        by_thread: ["threadId", "_creationTime"];
    }, {}, {}>;
    contextPacks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        expiresAt: number;
        documents: {
            title: string;
            docId: string;
            excerpts: {
                section?: string;
                relevanceScore?: number;
                text: string;
            }[];
            totalTokensEstimate: number;
        }[];
        metadata: {
            docCount: number;
            truncatedDocs: number;
            maxTokensUsed: number;
        };
        threadId: string;
        packId: string;
        docSetHash: string;
        totalTokens: number;
    }, {
        packId: import("convex/values").VString<string, "required">;
        threadId: import("convex/values").VString<string, "required">;
        docSetHash: import("convex/values").VString<string, "required">;
        documents: import("convex/values").VArray<{
            title: string;
            docId: string;
            excerpts: {
                section?: string;
                relevanceScore?: number;
                text: string;
            }[];
            totalTokensEstimate: number;
        }[], import("convex/values").VObject<{
            title: string;
            docId: string;
            excerpts: {
                section?: string;
                relevanceScore?: number;
                text: string;
            }[];
            totalTokensEstimate: number;
        }, {
            docId: import("convex/values").VString<string, "required">;
            title: import("convex/values").VString<string, "required">;
            excerpts: import("convex/values").VArray<{
                section?: string;
                relevanceScore?: number;
                text: string;
            }[], import("convex/values").VObject<{
                section?: string;
                relevanceScore?: number;
                text: string;
            }, {
                text: import("convex/values").VString<string, "required">;
                section: import("convex/values").VString<string, "optional">;
                relevanceScore: import("convex/values").VFloat64<number, "optional">;
            }, "required", "text" | "section" | "relevanceScore">, "required">;
            totalTokensEstimate: import("convex/values").VFloat64<number, "required">;
        }, "required", "title" | "docId" | "excerpts" | "totalTokensEstimate">, "required">;
        totalTokens: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        expiresAt: import("convex/values").VFloat64<number, "required">;
        metadata: import("convex/values").VObject<{
            docCount: number;
            truncatedDocs: number;
            maxTokensUsed: number;
        }, {
            docCount: import("convex/values").VFloat64<number, "required">;
            truncatedDocs: import("convex/values").VFloat64<number, "required">;
            maxTokensUsed: import("convex/values").VFloat64<number, "required">;
        }, "required", "docCount" | "truncatedDocs" | "maxTokensUsed">;
    }, "required", "createdAt" | "expiresAt" | "documents" | "metadata" | "threadId" | "packId" | "docSetHash" | "totalTokens" | "metadata.docCount" | "metadata.truncatedDocs" | "metadata.maxTokensUsed">, {
        by_thread: ["threadId", "_creationTime"];
        by_thread_hash: ["threadId", "docSetHash", "_creationTime"];
        by_expiresAt: ["expiresAt", "_creationTime"];
    }, {}, {}>;
    evalRuns: import("convex/server").TableDefinition<import("convex/values").VObject<{
        metadata?: any;
        errorMessage?: string;
        completedAt?: number;
        status: "pending" | "running" | "completed" | "failed";
        model: string;
        avgLatencyMs: number;
        startedAt: number;
        passRate: number;
        suiteId: string;
        totalCases: number;
        passedCases: number;
        failedCases: number;
    }, {
        suiteId: import("convex/values").VString<string, "required">;
        model: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"pending" | "running" | "completed" | "failed", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        totalCases: import("convex/values").VFloat64<number, "required">;
        passedCases: import("convex/values").VFloat64<number, "required">;
        failedCases: import("convex/values").VFloat64<number, "required">;
        passRate: import("convex/values").VFloat64<number, "required">;
        avgLatencyMs: import("convex/values").VFloat64<number, "required">;
        startedAt: import("convex/values").VFloat64<number, "required">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
        errorMessage: import("convex/values").VString<string, "optional">;
        metadata: import("convex/values").VAny<any, "optional", string>;
    }, "required", "metadata" | `metadata.${string}` | "status" | "model" | "errorMessage" | "avgLatencyMs" | "startedAt" | "passRate" | "completedAt" | "suiteId" | "totalCases" | "passedCases" | "failedCases">, {
        by_suite: ["suiteId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_startedAt: ["startedAt", "_creationTime"];
    }, {}, {}>;
    evalResults: import("convex/server").TableDefinition<import("convex/values").VObject<{
        failureCategory?: string;
        suggestedFix?: string;
        artifacts?: string[];
        createdAt: number;
        runId: import("convex/values").GenericId<"evalRuns">;
        passed: boolean;
        reasoning: string;
        testId: string;
        latencyMs: number;
        toolsCalled: string[];
        response: string;
    }, {
        runId: import("convex/values").VId<import("convex/values").GenericId<"evalRuns">, "required">;
        testId: import("convex/values").VString<string, "required">;
        passed: import("convex/values").VBoolean<boolean, "required">;
        latencyMs: import("convex/values").VFloat64<number, "required">;
        toolsCalled: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        response: import("convex/values").VString<string, "required">;
        reasoning: import("convex/values").VString<string, "required">;
        failureCategory: import("convex/values").VString<string, "optional">;
        suggestedFix: import("convex/values").VString<string, "optional">;
        artifacts: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "runId" | "passed" | "reasoning" | "testId" | "latencyMs" | "toolsCalled" | "response" | "failureCategory" | "suggestedFix" | "artifacts">, {
        by_run: ["runId", "_creationTime"];
        by_testId: ["testId", "_creationTime"];
        by_run_passed: ["runId", "passed", "_creationTime"];
    }, {}, {}>;
    agentInterrupts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        decision?: {
            message?: string;
            editedAction?: {
                name: string;
                args: any;
            };
            type: string;
        };
        resolvedAt?: number;
        createdAt: number;
        toolName: string;
        description: string;
        status: string;
        threadId: string;
        arguments: any;
        allowedDecisions: string[];
    }, {
        threadId: import("convex/values").VString<string, "required">;
        toolName: import("convex/values").VString<string, "required">;
        arguments: import("convex/values").VAny<any, "required", string>;
        description: import("convex/values").VString<string, "required">;
        allowedDecisions: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        status: import("convex/values").VString<string, "required">;
        decision: import("convex/values").VObject<{
            message?: string;
            editedAction?: {
                name: string;
                args: any;
            };
            type: string;
        }, {
            type: import("convex/values").VString<string, "required">;
            editedAction: import("convex/values").VObject<{
                name: string;
                args: any;
            }, {
                name: import("convex/values").VString<string, "required">;
                args: import("convex/values").VAny<any, "required", string>;
            }, "optional", "name" | "args" | `args.${string}`>;
            message: import("convex/values").VString<string, "optional">;
        }, "optional", "type" | "message" | "editedAction" | "editedAction.name" | "editedAction.args" | `editedAction.args.${string}`>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        resolvedAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "createdAt" | "toolName" | "description" | "status" | "threadId" | "arguments" | "allowedDecisions" | "decision" | "resolvedAt" | `arguments.${string}` | "decision.type" | "decision.message" | "decision.editedAction" | "decision.editedAction.name" | "decision.editedAction.args" | `decision.editedAction.args.${string}`>, {
        by_thread: ["threadId", "_creationTime"];
        by_thread_and_status: ["threadId", "status", "_creationTime"];
    }, {}, {}>;
    apiUsage: import("convex/server").TableDefinition<import("convex/values").VObject<{
        errorMessage?: string;
        unitsUsed?: number;
        estimatedCost?: number;
        requestMetadata?: any;
        responseTime?: number;
        userId: import("convex/values").GenericId<"users">;
        timestamp: number;
        operation: string;
        apiName: string;
        success: boolean;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        apiName: import("convex/values").VString<string, "required">;
        operation: import("convex/values").VString<string, "required">;
        timestamp: import("convex/values").VFloat64<number, "required">;
        unitsUsed: import("convex/values").VFloat64<number, "optional">;
        estimatedCost: import("convex/values").VFloat64<number, "optional">;
        requestMetadata: import("convex/values").VAny<any, "optional", string>;
        success: import("convex/values").VBoolean<boolean, "required">;
        errorMessage: import("convex/values").VString<string, "optional">;
        responseTime: import("convex/values").VFloat64<number, "optional">;
    }, "required", "userId" | "errorMessage" | "timestamp" | "operation" | "apiName" | "unitsUsed" | "estimatedCost" | "requestMetadata" | "success" | "responseTime" | `requestMetadata.${string}`>, {
        by_user: ["userId", "_creationTime"];
        by_user_and_api: ["userId", "apiName", "_creationTime"];
        by_user_and_timestamp: ["userId", "timestamp", "_creationTime"];
    }, {}, {}>;
    apiUsageDaily: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId: import("convex/values").GenericId<"users">;
        date: string;
        apiName: string;
        totalCalls: number;
        successfulCalls: number;
        failedCalls: number;
        totalUnitsUsed: number;
        totalCost: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        apiName: import("convex/values").VString<string, "required">;
        date: import("convex/values").VString<string, "required">;
        totalCalls: import("convex/values").VFloat64<number, "required">;
        successfulCalls: import("convex/values").VFloat64<number, "required">;
        failedCalls: import("convex/values").VFloat64<number, "required">;
        totalUnitsUsed: import("convex/values").VFloat64<number, "required">;
        totalCost: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "date" | "apiName" | "totalCalls" | "successfulCalls" | "failedCalls" | "totalUnitsUsed" | "totalCost">, {
        by_user: ["userId", "_creationTime"];
        by_user_and_date: ["userId", "date", "_creationTime"];
        by_user_api_date: ["userId", "apiName", "date", "_creationTime"];
    }, {}, {}>;
    confirmedCompanies: import("convex/server").TableDefinition<import("convex/values").VObject<{
        confirmedTicker?: string;
        createdAt: number;
        threadId: string;
        companyName: string;
        confirmedCik: string;
        confirmedName: string;
    }, {
        threadId: import("convex/values").VString<string, "required">;
        companyName: import("convex/values").VString<string, "required">;
        confirmedCik: import("convex/values").VString<string, "required">;
        confirmedName: import("convex/values").VString<string, "required">;
        confirmedTicker: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "threadId" | "companyName" | "confirmedCik" | "confirmedName" | "confirmedTicker">, {
        by_thread_and_name: ["threadId", "companyName", "_creationTime"];
        by_thread: ["threadId", "_creationTime"];
    }, {}, {}>;
    pendingDocumentEdits: import("convex/server").TableDefinition<import("convex/values").VObject<{
        errorMessage?: string;
        appliedAt?: number;
        userId: import("convex/values").GenericId<"users">;
        agentThreadId: string;
        createdAt: number;
        documentId: import("convex/values").GenericId<"documents">;
        status: "pending" | "failed" | "cancelled" | "applied" | "stale";
        retryCount: number;
        operation: {
            sectionHint?: string;
            type: "anchoredReplace";
            anchor: string;
            search: string;
            replace: string;
        };
        documentVersion: number;
    }, {
        documentId: import("convex/values").VId<import("convex/values").GenericId<"documents">, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        agentThreadId: import("convex/values").VString<string, "required">;
        documentVersion: import("convex/values").VFloat64<number, "required">;
        operation: import("convex/values").VObject<{
            sectionHint?: string;
            type: "anchoredReplace";
            anchor: string;
            search: string;
            replace: string;
        }, {
            type: import("convex/values").VLiteral<"anchoredReplace", "required">;
            anchor: import("convex/values").VString<string, "required">;
            search: import("convex/values").VString<string, "required">;
            replace: import("convex/values").VString<string, "required">;
            sectionHint: import("convex/values").VString<string, "optional">;
        }, "required", "type" | "anchor" | "search" | "replace" | "sectionHint">;
        status: import("convex/values").VUnion<"pending" | "failed" | "cancelled" | "applied" | "stale", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"applied", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"cancelled", "required">, import("convex/values").VLiteral<"stale", "required">], "required", never>;
        errorMessage: import("convex/values").VString<string, "optional">;
        retryCount: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        appliedAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "userId" | "agentThreadId" | "createdAt" | "documentId" | "status" | "errorMessage" | "retryCount" | "operation" | "documentVersion" | "appliedAt" | "operation.type" | "operation.anchor" | "operation.search" | "operation.replace" | "operation.sectionHint">, {
        by_document: ["documentId", "_creationTime"];
        by_document_status: ["documentId", "status", "_creationTime"];
        by_thread: ["agentThreadId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_document_version: ["documentId", "documentVersion", "_creationTime"];
    }, {}, {}>;
    calendarDateMarkers: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        documentId: import("convex/values").GenericId<"documents">;
        fileName: string;
        confidence: string;
        pattern: string;
        detectedDate: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        documentId: import("convex/values").VId<import("convex/values").GenericId<"documents">, "required">;
        fileName: import("convex/values").VString<string, "required">;
        detectedDate: import("convex/values").VFloat64<number, "required">;
        confidence: import("convex/values").VString<string, "required">;
        pattern: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "documentId" | "fileName" | "confidence" | "pattern" | "detectedDate">, {
        by_user: ["userId", "_creationTime"];
        by_document: ["documentId", "_creationTime"];
        by_user_and_date: ["userId", "detectedDate", "_creationTime"];
    }, {}, {}>;
    humanRequests: import("convex/server").TableDefinition<import("convex/values").VObject<{
        context?: string;
        response?: string;
        options?: string[];
        respondedAt?: number;
        userId: import("convex/values").GenericId<"users">;
        status: "pending" | "cancelled" | "answered";
        threadId: string;
        question: string;
        messageId: string;
        toolCallId: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        threadId: import("convex/values").VString<string, "required">;
        messageId: import("convex/values").VString<string, "required">;
        toolCallId: import("convex/values").VString<string, "required">;
        question: import("convex/values").VString<string, "required">;
        context: import("convex/values").VString<string, "optional">;
        options: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        status: import("convex/values").VUnion<"pending" | "cancelled" | "answered", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"answered", "required">, import("convex/values").VLiteral<"cancelled", "required">], "required", never>;
        response: import("convex/values").VString<string, "optional">;
        respondedAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "userId" | "context" | "status" | "threadId" | "question" | "messageId" | "response" | "toolCallId" | "options" | "respondedAt">, {
        by_user: ["userId", "_creationTime"];
        by_thread: ["threadId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_thread_and_status: ["threadId", "status", "_creationTime"];
    }, {}, {}>;
    confirmedPeople: import("convex/server").TableDefinition<import("convex/values").VObject<{
        confirmedProfession?: string;
        confirmedOrganization?: string;
        confirmedLocation?: string;
        createdAt: number;
        threadId: string;
        confirmedName: string;
        personName: string;
        confirmedId: string;
    }, {
        threadId: import("convex/values").VString<string, "required">;
        personName: import("convex/values").VString<string, "required">;
        confirmedId: import("convex/values").VString<string, "required">;
        confirmedName: import("convex/values").VString<string, "required">;
        confirmedProfession: import("convex/values").VString<string, "optional">;
        confirmedOrganization: import("convex/values").VString<string, "optional">;
        confirmedLocation: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "threadId" | "confirmedName" | "personName" | "confirmedId" | "confirmedProfession" | "confirmedOrganization" | "confirmedLocation">, {
        by_thread_and_name: ["threadId", "personName", "_creationTime"];
        by_thread: ["threadId", "_creationTime"];
    }, {}, {}>;
    confirmedEvents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        confirmedLocation?: string;
        confirmedDate?: string;
        confirmedDescription?: string;
        createdAt: number;
        threadId: string;
        confirmedName: string;
        confirmedId: string;
        eventQuery: string;
    }, {
        threadId: import("convex/values").VString<string, "required">;
        eventQuery: import("convex/values").VString<string, "required">;
        confirmedId: import("convex/values").VString<string, "required">;
        confirmedName: import("convex/values").VString<string, "required">;
        confirmedDate: import("convex/values").VString<string, "optional">;
        confirmedLocation: import("convex/values").VString<string, "optional">;
        confirmedDescription: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "threadId" | "confirmedName" | "confirmedId" | "confirmedLocation" | "eventQuery" | "confirmedDate" | "confirmedDescription">, {
        by_thread_and_query: ["threadId", "eventQuery", "_creationTime"];
        by_thread: ["threadId", "_creationTime"];
    }, {}, {}>;
    confirmedNewsTopics: import("convex/server").TableDefinition<import("convex/values").VObject<{
        confirmedDate?: string;
        confirmedSource?: string;
        confirmedUrl?: string;
        createdAt: number;
        threadId: string;
        confirmedId: string;
        newsQuery: string;
        confirmedHeadline: string;
    }, {
        threadId: import("convex/values").VString<string, "required">;
        newsQuery: import("convex/values").VString<string, "required">;
        confirmedId: import("convex/values").VString<string, "required">;
        confirmedHeadline: import("convex/values").VString<string, "required">;
        confirmedSource: import("convex/values").VString<string, "optional">;
        confirmedDate: import("convex/values").VString<string, "optional">;
        confirmedUrl: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "threadId" | "confirmedId" | "confirmedDate" | "newsQuery" | "confirmedHeadline" | "confirmedSource" | "confirmedUrl">, {
        by_thread_and_query: ["threadId", "newsQuery", "_creationTime"];
        by_thread: ["threadId", "_creationTime"];
    }, {}, {}>;
    entityContexts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        narratives?: {
            label: string;
            description: string;
            lastUpdated: string;
            supportingFactIds: string[];
            isWellSupported: boolean;
        }[];
        heuristics?: string[];
        quality?: {
            hasSufficientFacts: boolean;
            hasRecentResearch: boolean;
            hasVerifiedSources: boolean;
            hasNoConflicts: boolean;
            hasHighConfidenceFacts: boolean;
            hasNarratives: boolean;
            hasHeuristics: boolean;
        };
        researchDepth?: "shallow" | "standard" | "deep";
        funding?: any;
        people?: any;
        spreadsheetId?: import("convex/values").GenericId<"documents">;
        linkupData?: any;
        crmFields?: {
            foundingYear?: number;
            description: string;
            email: string;
            country: string;
            product: string;
            foundersBackground: string;
            fundingStage: string;
            companyName: string;
            headline: string;
            hqLocation: string;
            city: string;
            state: string;
            website: string;
            phone: string;
            founders: string[];
            keyPeople: {
                title: string;
                name: string;
            }[];
            industry: string;
            companyType: string;
            targetMarket: string;
            businessModel: string;
            totalFunding: string;
            lastFundingDate: string;
            investors: string[];
            investorBackground: string;
            competitors: string[];
            competitorAnalysis: string;
            fdaApprovalStatus: string;
            fdaTimeline: string;
            newsTimeline: {
                source: string;
                date: string;
                headline: string;
            }[];
            recentNews: string;
            keyEntities: string[];
            researchPapers: string[];
            partnerships: string[];
            completenessScore: number;
            dataQuality: "partial" | "verified" | "incomplete";
        };
        productPipeline?: any;
        recentNewsItems?: any;
        contactPoints?: any;
        freshness?: any;
        personaHooks?: any;
        rowIndex?: number;
        researchedBy?: import("convex/values").GenericId<"users">;
        isStale?: boolean;
        canonicalKey?: string;
        structuredFacts?: {
            isOutdated?: boolean;
            object: string;
            id: string;
            isHighConfidence: boolean;
            timestamp: string;
            subject: string;
            predicate: string;
            sourceIds: string[];
        }[];
        conflicts?: {
            description: string;
            status: "unresolved" | "resolved";
            factIds: string[];
            detectedAt: string;
        }[];
        qualityTier?: "excellent" | "good" | "fair" | "poor";
        factCount?: number;
        relatedEntityNames?: string[];
        linkedDocIds?: import("convex/values").GenericId<"documents">[];
        lastResearchJobId?: string;
        knowledgeGraphId?: import("convex/values").GenericId<"knowledgeGraphs">;
        clusterId?: string;
        isOddOneOut?: boolean;
        isInClusterSupport?: boolean;
        arbitrageMetadata?: {
            lastArbitrageCheckAt: number;
            contradictionCount: number;
            sourceQualityScore: number;
            verificationStatus: "partial" | "verified" | "unverified";
            deltasSinceLastCheck: number;
            hiddenSourcesCount: number;
        };
        sourceHealth?: {
            url: string;
            status: "ok" | "404" | "content_changed";
            contentHash: string;
            lastChecked: number;
            firstSeenHash: string;
        }[];
        deltas?: {
            factId?: string;
            type: "fact_added" | "fact_removed" | "fact_modified" | "conflict_detected" | "conflict_resolved" | "source_404" | "source_changed";
            description: string;
            timestamp: number;
            severity: "high" | "medium" | "low";
        }[];
        ingestedAt?: number;
        lastEnrichedAt?: number;
        enrichmentJobId?: import("convex/values").GenericId<"enrichmentJobs">;
        sources: {
            snippet?: string;
            name: string;
            url: string;
        }[];
        lastAccessedAt: number;
        summary: string;
        keyFacts: string[];
        version: number;
        entityName: string;
        entityType: "company" | "person";
        researchedAt: number;
        accessCount: number;
    }, {
        entityName: import("convex/values").VString<string, "required">;
        entityType: import("convex/values").VUnion<"company" | "person", [import("convex/values").VLiteral<"company", "required">, import("convex/values").VLiteral<"person", "required">], "required", never>;
        linkupData: import("convex/values").VAny<any, "optional", string>;
        summary: import("convex/values").VString<string, "required">;
        keyFacts: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        sources: import("convex/values").VArray<{
            snippet?: string;
            name: string;
            url: string;
        }[], import("convex/values").VObject<{
            snippet?: string;
            name: string;
            url: string;
        }, {
            name: import("convex/values").VString<string, "required">;
            url: import("convex/values").VString<string, "required">;
            snippet: import("convex/values").VString<string, "optional">;
        }, "required", "name" | "url" | "snippet">, "required">;
        crmFields: import("convex/values").VObject<{
            foundingYear?: number;
            description: string;
            email: string;
            country: string;
            product: string;
            foundersBackground: string;
            fundingStage: string;
            companyName: string;
            headline: string;
            hqLocation: string;
            city: string;
            state: string;
            website: string;
            phone: string;
            founders: string[];
            keyPeople: {
                title: string;
                name: string;
            }[];
            industry: string;
            companyType: string;
            targetMarket: string;
            businessModel: string;
            totalFunding: string;
            lastFundingDate: string;
            investors: string[];
            investorBackground: string;
            competitors: string[];
            competitorAnalysis: string;
            fdaApprovalStatus: string;
            fdaTimeline: string;
            newsTimeline: {
                source: string;
                date: string;
                headline: string;
            }[];
            recentNews: string;
            keyEntities: string[];
            researchPapers: string[];
            partnerships: string[];
            completenessScore: number;
            dataQuality: "partial" | "verified" | "incomplete";
        }, {
            companyName: import("convex/values").VString<string, "required">;
            description: import("convex/values").VString<string, "required">;
            headline: import("convex/values").VString<string, "required">;
            hqLocation: import("convex/values").VString<string, "required">;
            city: import("convex/values").VString<string, "required">;
            state: import("convex/values").VString<string, "required">;
            country: import("convex/values").VString<string, "required">;
            website: import("convex/values").VString<string, "required">;
            email: import("convex/values").VString<string, "required">;
            phone: import("convex/values").VString<string, "required">;
            founders: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            foundersBackground: import("convex/values").VString<string, "required">;
            keyPeople: import("convex/values").VArray<{
                title: string;
                name: string;
            }[], import("convex/values").VObject<{
                title: string;
                name: string;
            }, {
                name: import("convex/values").VString<string, "required">;
                title: import("convex/values").VString<string, "required">;
            }, "required", "title" | "name">, "required">;
            industry: import("convex/values").VString<string, "required">;
            companyType: import("convex/values").VString<string, "required">;
            foundingYear: import("convex/values").VFloat64<number, "optional">;
            product: import("convex/values").VString<string, "required">;
            targetMarket: import("convex/values").VString<string, "required">;
            businessModel: import("convex/values").VString<string, "required">;
            fundingStage: import("convex/values").VString<string, "required">;
            totalFunding: import("convex/values").VString<string, "required">;
            lastFundingDate: import("convex/values").VString<string, "required">;
            investors: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            investorBackground: import("convex/values").VString<string, "required">;
            competitors: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            competitorAnalysis: import("convex/values").VString<string, "required">;
            fdaApprovalStatus: import("convex/values").VString<string, "required">;
            fdaTimeline: import("convex/values").VString<string, "required">;
            newsTimeline: import("convex/values").VArray<{
                source: string;
                date: string;
                headline: string;
            }[], import("convex/values").VObject<{
                source: string;
                date: string;
                headline: string;
            }, {
                date: import("convex/values").VString<string, "required">;
                headline: import("convex/values").VString<string, "required">;
                source: import("convex/values").VString<string, "required">;
            }, "required", "source" | "date" | "headline">, "required">;
            recentNews: import("convex/values").VString<string, "required">;
            keyEntities: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            researchPapers: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            partnerships: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            completenessScore: import("convex/values").VFloat64<number, "required">;
            dataQuality: import("convex/values").VUnion<"partial" | "verified" | "incomplete", [import("convex/values").VLiteral<"verified", "required">, import("convex/values").VLiteral<"partial", "required">, import("convex/values").VLiteral<"incomplete", "required">], "required", never>;
        }, "optional", "description" | "email" | "country" | "product" | "foundingYear" | "foundersBackground" | "fundingStage" | "companyName" | "headline" | "hqLocation" | "city" | "state" | "website" | "phone" | "founders" | "keyPeople" | "industry" | "companyType" | "targetMarket" | "businessModel" | "totalFunding" | "lastFundingDate" | "investors" | "investorBackground" | "competitors" | "competitorAnalysis" | "fdaApprovalStatus" | "fdaTimeline" | "newsTimeline" | "recentNews" | "keyEntities" | "researchPapers" | "partnerships" | "completenessScore" | "dataQuality">;
        /** Structured funding data */
        funding: import("convex/values").VAny<any, "optional", string>;
        /** People data (founders, executives, board) */
        people: import("convex/values").VAny<any, "optional", string>;
        /** Product pipeline data */
        productPipeline: import("convex/values").VAny<any, "optional", string>;
        /** Recent news items (structured) */
        recentNewsItems: import("convex/values").VAny<any, "optional", string>;
        /** Contact points for outreach */
        contactPoints: import("convex/values").VAny<any, "optional", string>;
        /** Freshness metadata */
        freshness: import("convex/values").VAny<any, "optional", string>;
        /** Persona hooks for 10-persona audit */
        personaHooks: import("convex/values").VAny<any, "optional", string>;
        spreadsheetId: import("convex/values").VId<import("convex/values").GenericId<"documents">, "optional">;
        rowIndex: import("convex/values").VFloat64<number, "optional">;
        researchedAt: import("convex/values").VFloat64<number, "required">;
        researchedBy: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        lastAccessedAt: import("convex/values").VFloat64<number, "required">;
        accessCount: import("convex/values").VFloat64<number, "required">;
        version: import("convex/values").VFloat64<number, "required">;
        isStale: import("convex/values").VBoolean<boolean, "optional">;
        /** Canonical key for disambiguation (e.g., "company:TSLA") */
        canonicalKey: import("convex/values").VString<string, "optional">;
        /** Structured facts with boolean confidence flags */
        structuredFacts: import("convex/values").VArray<{
            isOutdated?: boolean;
            object: string;
            id: string;
            isHighConfidence: boolean;
            timestamp: string;
            subject: string;
            predicate: string;
            sourceIds: string[];
        }[], import("convex/values").VObject<{
            isOutdated?: boolean;
            object: string;
            id: string;
            isHighConfidence: boolean;
            timestamp: string;
            subject: string;
            predicate: string;
            sourceIds: string[];
        }, {
            id: import("convex/values").VString<string, "required">;
            subject: import("convex/values").VString<string, "required">;
            predicate: import("convex/values").VString<string, "required">;
            object: import("convex/values").VString<string, "required">;
            /** Boolean: does this fact meet confidence threshold? */
            isHighConfidence: import("convex/values").VBoolean<boolean, "required">;
            sourceIds: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            timestamp: import("convex/values").VString<string, "required">;
            isOutdated: import("convex/values").VBoolean<boolean, "optional">;
        }, "required", "object" | "id" | "isHighConfidence" | "timestamp" | "subject" | "predicate" | "sourceIds" | "isOutdated">, "optional">;
        /** Narrative interpretations (growth story, bear case, etc.) */
        narratives: import("convex/values").VArray<{
            label: string;
            description: string;
            lastUpdated: string;
            supportingFactIds: string[];
            isWellSupported: boolean;
        }[], import("convex/values").VObject<{
            label: string;
            description: string;
            lastUpdated: string;
            supportingFactIds: string[];
            isWellSupported: boolean;
        }, {
            label: import("convex/values").VString<string, "required">;
            description: import("convex/values").VString<string, "required">;
            supportingFactIds: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            /** Boolean: is this narrative well-supported? */
            isWellSupported: import("convex/values").VBoolean<boolean, "required">;
            lastUpdated: import("convex/values").VString<string, "required">;
        }, "required", "label" | "description" | "lastUpdated" | "supportingFactIds" | "isWellSupported">, "optional">;
        /** Actionable heuristics for agents */
        heuristics: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        /** Conflict tracking */
        conflicts: import("convex/values").VArray<{
            description: string;
            status: "unresolved" | "resolved";
            factIds: string[];
            detectedAt: string;
        }[], import("convex/values").VObject<{
            description: string;
            status: "unresolved" | "resolved";
            factIds: string[];
            detectedAt: string;
        }, {
            factIds: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            description: import("convex/values").VString<string, "required">;
            status: import("convex/values").VUnion<"unresolved" | "resolved", [import("convex/values").VLiteral<"unresolved", "required">, import("convex/values").VLiteral<"resolved", "required">], "required", never>;
            detectedAt: import("convex/values").VString<string, "required">;
        }, "required", "description" | "status" | "factIds" | "detectedAt">, "optional">;
        /** Boolean quality flags (not arbitrary scores) */
        quality: import("convex/values").VObject<{
            hasSufficientFacts: boolean;
            hasRecentResearch: boolean;
            hasVerifiedSources: boolean;
            hasNoConflicts: boolean;
            hasHighConfidenceFacts: boolean;
            hasNarratives: boolean;
            hasHeuristics: boolean;
        }, {
            hasSufficientFacts: import("convex/values").VBoolean<boolean, "required">;
            hasRecentResearch: import("convex/values").VBoolean<boolean, "required">;
            hasNoConflicts: import("convex/values").VBoolean<boolean, "required">;
            hasVerifiedSources: import("convex/values").VBoolean<boolean, "required">;
            hasHighConfidenceFacts: import("convex/values").VBoolean<boolean, "required">;
            hasNarratives: import("convex/values").VBoolean<boolean, "required">;
            hasHeuristics: import("convex/values").VBoolean<boolean, "required">;
        }, "optional", "hasSufficientFacts" | "hasRecentResearch" | "hasVerifiedSources" | "hasNoConflicts" | "hasHighConfidenceFacts" | "hasNarratives" | "hasHeuristics">;
        /** Quality tier derived from flags */
        qualityTier: import("convex/values").VUnion<"excellent" | "good" | "fair" | "poor", [import("convex/values").VLiteral<"excellent", "required">, import("convex/values").VLiteral<"good", "required">, import("convex/values").VLiteral<"fair", "required">, import("convex/values").VLiteral<"poor", "required">], "optional", never>;
        /** Fact count for quick checks */
        factCount: import("convex/values").VFloat64<number, "optional">;
        /** Cross-references */
        relatedEntityNames: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        linkedDocIds: import("convex/values").VArray<import("convex/values").GenericId<"documents">[], import("convex/values").VId<import("convex/values").GenericId<"documents">, "required">, "optional">;
        /** Research job tracking */
        lastResearchJobId: import("convex/values").VString<string, "optional">;
        researchDepth: import("convex/values").VUnion<"shallow" | "standard" | "deep", [import("convex/values").VLiteral<"shallow", "required">, import("convex/values").VLiteral<"standard", "required">, import("convex/values").VLiteral<"deep", "required">], "optional", never>;
        /** Link to the entity's knowledge graph */
        knowledgeGraphId: import("convex/values").VId<import("convex/values").GenericId<"knowledgeGraphs">, "optional">;
        /** Cluster assignment from HDBSCAN (null = noise/odd-one-out) */
        clusterId: import("convex/values").VString<string, "optional">;
        /** Boolean: is this entity an outlier? (HDBSCAN noise label) */
        isOddOneOut: import("convex/values").VBoolean<boolean, "optional">;
        /** Boolean: is this entity within cluster support region? (One-Class SVM) */
        isInClusterSupport: import("convex/values").VBoolean<boolean, "optional">;
        /** Arbitrage-specific metrics */
        arbitrageMetadata: import("convex/values").VObject<{
            lastArbitrageCheckAt: number;
            contradictionCount: number;
            sourceQualityScore: number;
            verificationStatus: "partial" | "verified" | "unverified";
            deltasSinceLastCheck: number;
            hiddenSourcesCount: number;
        }, {
            lastArbitrageCheckAt: import("convex/values").VFloat64<number, "required">;
            contradictionCount: import("convex/values").VFloat64<number, "required">;
            sourceQualityScore: import("convex/values").VFloat64<number, "required">;
            verificationStatus: import("convex/values").VUnion<"partial" | "verified" | "unverified", [import("convex/values").VLiteral<"verified", "required">, import("convex/values").VLiteral<"partial", "required">, import("convex/values").VLiteral<"unverified", "required">], "required", never>;
            deltasSinceLastCheck: import("convex/values").VFloat64<number, "required">;
            hiddenSourcesCount: import("convex/values").VFloat64<number, "required">;
        }, "optional", "lastArbitrageCheckAt" | "contradictionCount" | "sourceQualityScore" | "verificationStatus" | "deltasSinceLastCheck" | "hiddenSourcesCount">;
        /** Source health tracking (URL availability + content changes) */
        sourceHealth: import("convex/values").VArray<{
            url: string;
            status: "ok" | "404" | "content_changed";
            contentHash: string;
            lastChecked: number;
            firstSeenHash: string;
        }[], import("convex/values").VObject<{
            url: string;
            status: "ok" | "404" | "content_changed";
            contentHash: string;
            lastChecked: number;
            firstSeenHash: string;
        }, {
            url: import("convex/values").VString<string, "required">;
            lastChecked: import("convex/values").VFloat64<number, "required">;
            status: import("convex/values").VUnion<"ok" | "404" | "content_changed", [import("convex/values").VLiteral<"ok", "required">, import("convex/values").VLiteral<"404", "required">, import("convex/values").VLiteral<"content_changed", "required">], "required", never>;
            contentHash: import("convex/values").VString<string, "required">;
            firstSeenHash: import("convex/values").VString<string, "required">;
        }, "required", "url" | "status" | "contentHash" | "lastChecked" | "firstSeenHash">, "optional">;
        /** Delta changelog (what changed since last arbitrage check) */
        deltas: import("convex/values").VArray<{
            factId?: string;
            type: "fact_added" | "fact_removed" | "fact_modified" | "conflict_detected" | "conflict_resolved" | "source_404" | "source_changed";
            description: string;
            timestamp: number;
            severity: "high" | "medium" | "low";
        }[], import("convex/values").VObject<{
            factId?: string;
            type: "fact_added" | "fact_removed" | "fact_modified" | "conflict_detected" | "conflict_resolved" | "source_404" | "source_changed";
            description: string;
            timestamp: number;
            severity: "high" | "medium" | "low";
        }, {
            type: import("convex/values").VUnion<"fact_added" | "fact_removed" | "fact_modified" | "conflict_detected" | "conflict_resolved" | "source_404" | "source_changed", [import("convex/values").VLiteral<"fact_added", "required">, import("convex/values").VLiteral<"fact_removed", "required">, import("convex/values").VLiteral<"fact_modified", "required">, import("convex/values").VLiteral<"conflict_detected", "required">, import("convex/values").VLiteral<"conflict_resolved", "required">, import("convex/values").VLiteral<"source_404", "required">, import("convex/values").VLiteral<"source_changed", "required">], "required", never>;
            factId: import("convex/values").VString<string, "optional">;
            timestamp: import("convex/values").VFloat64<number, "required">;
            description: import("convex/values").VString<string, "required">;
            severity: import("convex/values").VUnion<"high" | "medium" | "low", [import("convex/values").VLiteral<"high", "required">, import("convex/values").VLiteral<"medium", "required">, import("convex/values").VLiteral<"low", "required">], "required", never>;
        }, "required", "type" | "description" | "timestamp" | "factId" | "severity">, "optional">;
        ingestedAt: import("convex/values").VFloat64<number, "optional">;
        lastEnrichedAt: import("convex/values").VFloat64<number, "optional">;
        enrichmentJobId: import("convex/values").VId<import("convex/values").GenericId<"enrichmentJobs">, "optional">;
    }, "required", "sources" | "lastAccessedAt" | "summary" | "keyFacts" | "narratives" | "heuristics" | "quality" | "researchDepth" | "quality.hasSufficientFacts" | "quality.hasRecentResearch" | "quality.hasVerifiedSources" | "version" | "funding" | "people" | "spreadsheetId" | "entityName" | "entityType" | "linkupData" | "crmFields" | "productPipeline" | "recentNewsItems" | "contactPoints" | "freshness" | "personaHooks" | "rowIndex" | "researchedAt" | "researchedBy" | "accessCount" | "isStale" | "canonicalKey" | "structuredFacts" | "conflicts" | "qualityTier" | "factCount" | "relatedEntityNames" | "linkedDocIds" | "lastResearchJobId" | "knowledgeGraphId" | "clusterId" | "isOddOneOut" | "isInClusterSupport" | "arbitrageMetadata" | "sourceHealth" | "deltas" | "ingestedAt" | "lastEnrichedAt" | "enrichmentJobId" | "quality.hasNoConflicts" | "quality.hasHighConfidenceFacts" | "quality.hasNarratives" | "quality.hasHeuristics" | `funding.${string}` | `people.${string}` | `linkupData.${string}` | "crmFields.description" | "crmFields.email" | "crmFields.country" | "crmFields.product" | "crmFields.foundingYear" | "crmFields.foundersBackground" | "crmFields.fundingStage" | "crmFields.companyName" | "crmFields.headline" | "crmFields.hqLocation" | "crmFields.city" | "crmFields.state" | "crmFields.website" | "crmFields.phone" | "crmFields.founders" | "crmFields.keyPeople" | "crmFields.industry" | "crmFields.companyType" | "crmFields.targetMarket" | "crmFields.businessModel" | "crmFields.totalFunding" | "crmFields.lastFundingDate" | "crmFields.investors" | "crmFields.investorBackground" | "crmFields.competitors" | "crmFields.competitorAnalysis" | "crmFields.fdaApprovalStatus" | "crmFields.fdaTimeline" | "crmFields.newsTimeline" | "crmFields.recentNews" | "crmFields.keyEntities" | "crmFields.researchPapers" | "crmFields.partnerships" | "crmFields.completenessScore" | "crmFields.dataQuality" | `productPipeline.${string}` | `recentNewsItems.${string}` | `contactPoints.${string}` | `freshness.${string}` | `personaHooks.${string}` | "arbitrageMetadata.lastArbitrageCheckAt" | "arbitrageMetadata.contradictionCount" | "arbitrageMetadata.sourceQualityScore" | "arbitrageMetadata.verificationStatus" | "arbitrageMetadata.deltasSinceLastCheck" | "arbitrageMetadata.hiddenSourcesCount">, {
        by_entity: ["entityName", "entityType", "_creationTime"];
        by_ingestedAt: ["ingestedAt", "_creationTime"];
        by_spreadsheet: ["spreadsheetId", "rowIndex", "_creationTime"];
        by_user: ["researchedBy", "_creationTime"];
        by_researched_at: ["researchedAt", "_creationTime"];
        by_canonicalKey: ["canonicalKey", "_creationTime"];
        by_user_accessedAt: ["researchedBy", "lastAccessedAt", "_creationTime"];
        by_qualityTier: ["qualityTier", "_creationTime"];
    }, {
        search_entity: {
            searchField: "entityName";
            filterFields: "entityType" | "researchedBy";
        };
    }, {}>;
    adaptiveEntityProfiles: import("convex/server").TableDefinition<import("convex/values").VObject<{
        researchDepth?: "standard" | "deep" | "quick";
        confidence?: number;
        completeness?: number;
        lastResearchedAt?: number;
        entityContextId?: import("convex/values").GenericId<"entityContexts">;
        updatedAt: number;
        createdAt: number;
        version: number;
        entityName: string;
        entityType: string;
        profile: any;
    }, {
        entityName: import("convex/values").VString<string, "required">;
        entityType: import("convex/values").VString<string, "required">;
        profile: import("convex/values").VAny<any, "required", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        version: import("convex/values").VFloat64<number, "required">;
        completeness: import("convex/values").VFloat64<number, "optional">;
        confidence: import("convex/values").VFloat64<number, "optional">;
        lastResearchedAt: import("convex/values").VFloat64<number, "optional">;
        researchDepth: import("convex/values").VUnion<"standard" | "deep" | "quick", [import("convex/values").VLiteral<"quick", "required">, import("convex/values").VLiteral<"standard", "required">, import("convex/values").VLiteral<"deep", "required">], "optional", never>;
        entityContextId: import("convex/values").VId<import("convex/values").GenericId<"entityContexts">, "optional">;
    }, "required", "updatedAt" | "createdAt" | "researchDepth" | "confidence" | "version" | "entityName" | "entityType" | "profile" | "completeness" | "lastResearchedAt" | "entityContextId" | `profile.${string}`>, {
        by_name: ["entityName", "_creationTime"];
        by_type: ["entityType", "_creationTime"];
        by_updated: ["updatedAt", "_creationTime"];
    }, {
        search_name: {
            searchField: "entityName";
            filterFields: "entityType";
        };
    }, {}>;
    visitors: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        sessionId: string;
        page: string;
        lastSeen: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        sessionId: import("convex/values").VString<string, "required">;
        page: import("convex/values").VString<string, "required">;
        lastSeen: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "sessionId" | "page" | "lastSeen">, {
        by_session: ["sessionId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    emailsSent: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        email: string;
        subject: string;
        sentAt: number;
        success: boolean;
    }, {
        email: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        subject: import("convex/values").VString<string, "required">;
        success: import("convex/values").VBoolean<boolean, "required">;
        sentAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "email" | "subject" | "sentAt" | "success">, {
        by_email: ["email", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_sent_at: ["sentAt", "_creationTime"];
    }, {}, {}>;
    agentPlans: import("convex/server").TableDefinition<import("convex/values").VObject<{
        agentThreadId?: string;
        features?: {
            notes?: string;
            name: string;
            status: "pending" | "failing" | "passing";
            testCriteria: string;
        }[];
        progressLog?: {
            meta?: any;
            status: "pending" | "error" | "failing" | "passing" | "info" | "working";
            message: string;
            ts: number;
        }[];
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        goal: string;
        steps: {
            description: string;
            status: "pending" | "completed" | "in_progress";
        }[];
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        agentThreadId: import("convex/values").VString<string, "optional">;
        goal: import("convex/values").VString<string, "required">;
        steps: import("convex/values").VArray<{
            description: string;
            status: "pending" | "completed" | "in_progress";
        }[], import("convex/values").VObject<{
            description: string;
            status: "pending" | "completed" | "in_progress";
        }, {
            description: import("convex/values").VString<string, "required">;
            status: import("convex/values").VUnion<"pending" | "completed" | "in_progress", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"in_progress", "required">, import("convex/values").VLiteral<"completed", "required">], "required", never>;
        }, "required", "description" | "status">, "required">;
        features: import("convex/values").VArray<{
            notes?: string;
            name: string;
            status: "pending" | "failing" | "passing";
            testCriteria: string;
        }[], import("convex/values").VObject<{
            notes?: string;
            name: string;
            status: "pending" | "failing" | "passing";
            testCriteria: string;
        }, {
            name: import("convex/values").VString<string, "required">;
            status: import("convex/values").VUnion<"pending" | "failing" | "passing", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"failing", "required">, import("convex/values").VLiteral<"passing", "required">], "required", never>;
            testCriteria: import("convex/values").VString<string, "required">;
            notes: import("convex/values").VString<string, "optional">;
        }, "required", "name" | "status" | "notes" | "testCriteria">, "optional">;
        progressLog: import("convex/values").VArray<{
            meta?: any;
            status: "pending" | "error" | "failing" | "passing" | "info" | "working";
            message: string;
            ts: number;
        }[], import("convex/values").VObject<{
            meta?: any;
            status: "pending" | "error" | "failing" | "passing" | "info" | "working";
            message: string;
            ts: number;
        }, {
            ts: import("convex/values").VFloat64<number, "required">;
            status: import("convex/values").VUnion<"pending" | "error" | "failing" | "passing" | "info" | "working", [import("convex/values").VLiteral<"info", "required">, import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"working", "required">, import("convex/values").VLiteral<"passing", "required">, import("convex/values").VLiteral<"failing", "required">, import("convex/values").VLiteral<"error", "required">], "required", never>;
            message: import("convex/values").VString<string, "required">;
            meta: import("convex/values").VAny<any, "optional", string>;
        }, "required", "status" | "meta" | `meta.${string}` | "message" | "ts">, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "agentThreadId" | "createdAt" | "goal" | "steps" | "features" | "progressLog">, {
        by_user: ["userId", "_creationTime"];
        by_user_updated: ["userId", "updatedAt", "_creationTime"];
        by_agent_thread: ["agentThreadId", "updatedAt", "_creationTime"];
    }, {}, {}>;
    agentMemory: import("convex/server").TableDefinition<import("convex/values").VObject<{
        metadata?: any;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        content: string;
        key: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        key: import("convex/values").VString<string, "required">;
        content: import("convex/values").VString<string, "required">;
        metadata: import("convex/values").VAny<any, "optional", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "content" | "metadata" | `metadata.${string}` | "key">, {
        by_user: ["userId", "_creationTime"];
        by_user_key: ["userId", "key", "_creationTime"];
    }, {}, {}>;
    agentScratchpads: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        agentThreadId: string;
        createdAt: number;
        scratchpad: any;
    }, {
        agentThreadId: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        scratchpad: import("convex/values").VAny<any, "required", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "agentThreadId" | "createdAt" | "scratchpad" | `scratchpad.${string}`>, {
        by_agent_thread: ["agentThreadId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    agentEpisodicMemory: import("convex/server").TableDefinition<import("convex/values").VObject<{
        tags?: string[];
        userId: import("convex/values").GenericId<"users">;
        runId: string;
        data: any;
        ts: number;
    }, {
        runId: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        ts: import("convex/values").VFloat64<number, "required">;
        tags: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        data: import("convex/values").VAny<any, "required", string>;
    }, "required", "userId" | "tags" | "runId" | "data" | `data.${string}` | "ts">, {
        by_run: ["runId", "ts", "_creationTime"];
        by_user: ["userId", "ts", "_creationTime"];
    }, {}, {}>;
    researchJobs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        researchDepth?: "shallow" | "standard" | "deep";
        error?: string;
        startedAt?: number;
        durationMs?: number;
        completedAt?: number;
        triggerSource?: string;
        userId: import("convex/values").GenericId<"users">;
        createdAt: number;
        targetId: string;
        targetType: "entity" | "theme";
        status: "pending" | "running" | "completed" | "failed";
        priority: number;
        targetDisplayName: string;
        jobType: "initial" | "refresh" | "merge_review" | "deep_upgrade";
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        targetType: import("convex/values").VUnion<"entity" | "theme", [import("convex/values").VLiteral<"entity", "required">, import("convex/values").VLiteral<"theme", "required">], "required", never>;
        /** Canonical key (e.g., "company:TSLA" or "theme:agent-memory") */
        targetId: import("convex/values").VString<string, "required">;
        /** Human-readable name for display */
        targetDisplayName: import("convex/values").VString<string, "required">;
        jobType: import("convex/values").VUnion<"initial" | "refresh" | "merge_review" | "deep_upgrade", [import("convex/values").VLiteral<"initial", "required">, import("convex/values").VLiteral<"refresh", "required">, import("convex/values").VLiteral<"merge_review", "required">, import("convex/values").VLiteral<"deep_upgrade", "required">], "required", never>;
        researchDepth: import("convex/values").VUnion<"shallow" | "standard" | "deep", [import("convex/values").VLiteral<"shallow", "required">, import("convex/values").VLiteral<"standard", "required">, import("convex/values").VLiteral<"deep", "required">], "optional", never>;
        status: import("convex/values").VUnion<"pending" | "running" | "completed" | "failed", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        priority: import("convex/values").VFloat64<number, "required">;
        triggerSource: import("convex/values").VString<string, "optional">;
        error: import("convex/values").VString<string, "optional">;
        /** Job duration tracking */
        durationMs: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        startedAt: import("convex/values").VFloat64<number, "optional">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "userId" | "createdAt" | "researchDepth" | "targetId" | "targetType" | "status" | "error" | "priority" | "startedAt" | "durationMs" | "completedAt" | "targetDisplayName" | "jobType" | "triggerSource">, {
        by_user_status: ["userId", "status", "_creationTime"];
        by_target: ["targetType", "targetId", "_creationTime"];
        by_createdAt: ["createdAt", "_creationTime"];
    }, {}, {}>;
    memoryMetrics: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        date: string;
        queryMemoryCalls: number;
        queryMemoryHits: number;
        queryMemoryMisses: number;
        queryMemoryStaleHits: number;
        researchJobsCreated: number;
        researchJobsCompleted: number;
        researchJobsFailed: number;
        totalEntityMemories: number;
        totalThemeMemories: number;
        factsAdded: number;
        factsRejected: number;
        conflictsDetected: number;
    }, {
        date: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        queryMemoryCalls: import("convex/values").VFloat64<number, "required">;
        queryMemoryHits: import("convex/values").VFloat64<number, "required">;
        queryMemoryMisses: import("convex/values").VFloat64<number, "required">;
        queryMemoryStaleHits: import("convex/values").VFloat64<number, "required">;
        researchJobsCreated: import("convex/values").VFloat64<number, "required">;
        researchJobsCompleted: import("convex/values").VFloat64<number, "required">;
        researchJobsFailed: import("convex/values").VFloat64<number, "required">;
        totalEntityMemories: import("convex/values").VFloat64<number, "required">;
        totalThemeMemories: import("convex/values").VFloat64<number, "required">;
        factsAdded: import("convex/values").VFloat64<number, "required">;
        factsRejected: import("convex/values").VFloat64<number, "required">;
        conflictsDetected: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "date" | "queryMemoryCalls" | "queryMemoryHits" | "queryMemoryMisses" | "queryMemoryStaleHits" | "researchJobsCreated" | "researchJobsCompleted" | "researchJobsFailed" | "totalEntityMemories" | "totalThemeMemories" | "factsAdded" | "factsRejected" | "conflictsDetected">, {
        by_date: ["date", "_creationTime"];
        by_user_date: ["userId", "date", "_creationTime"];
    }, {}, {}>;
    knowledgeGraphs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        clusterId?: string;
        isInClusterSupport?: boolean;
        semanticFingerprint?: number[];
        wlSignature?: string;
        lastClustered?: number;
        lastFingerprinted?: number;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        name: string;
        sourceType: "artifact" | "entity" | "theme" | "session";
        sourceId: string;
        isOddOneOut: boolean;
        claimCount: number;
        edgeCount: number;
        lastBuilt: number;
    }, {
        name: import("convex/values").VString<string, "required">;
        sourceType: import("convex/values").VUnion<"artifact" | "entity" | "theme" | "session", [import("convex/values").VLiteral<"entity", "required">, import("convex/values").VLiteral<"theme", "required">, import("convex/values").VLiteral<"artifact", "required">, import("convex/values").VLiteral<"session", "required">], "required", never>;
        sourceId: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        semanticFingerprint: import("convex/values").VArray<number[], import("convex/values").VFloat64<number, "required">, "optional">;
        wlSignature: import("convex/values").VString<string, "optional">;
        clusterId: import("convex/values").VString<string, "optional">;
        isOddOneOut: import("convex/values").VBoolean<boolean, "required">;
        isInClusterSupport: import("convex/values").VBoolean<boolean, "optional">;
        claimCount: import("convex/values").VFloat64<number, "required">;
        edgeCount: import("convex/values").VFloat64<number, "required">;
        lastBuilt: import("convex/values").VFloat64<number, "required">;
        lastClustered: import("convex/values").VFloat64<number, "optional">;
        lastFingerprinted: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "name" | "sourceType" | "sourceId" | "clusterId" | "isOddOneOut" | "isInClusterSupport" | "semanticFingerprint" | "wlSignature" | "claimCount" | "edgeCount" | "lastBuilt" | "lastClustered" | "lastFingerprinted">, {
        by_user: ["userId", "_creationTime"];
        by_source: ["sourceType", "sourceId", "_creationTime"];
        by_cluster: ["clusterId", "_creationTime"];
        by_oddOneOut: ["isOddOneOut", "_creationTime"];
        by_user_source: ["userId", "sourceType", "_creationTime"];
    }, {}, {}>;
    graphClaims: import("convex/server").TableDefinition<import("convex/values").VObject<{
        embedding?: number[];
        isOutdated?: boolean;
        sourceSnippets?: string[];
        isVerified?: boolean;
        object: string;
        createdAt: number;
        extractedAt: number;
        isHighConfidence: boolean;
        sourceDocIds: string[];
        subject: string;
        predicate: string;
        graphId: import("convex/values").GenericId<"knowledgeGraphs">;
        claimText: string;
    }, {
        graphId: import("convex/values").VId<import("convex/values").GenericId<"knowledgeGraphs">, "required">;
        subject: import("convex/values").VString<string, "required">;
        predicate: import("convex/values").VString<string, "required">;
        object: import("convex/values").VString<string, "required">;
        claimText: import("convex/values").VString<string, "required">;
        sourceDocIds: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        sourceSnippets: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        extractedAt: import("convex/values").VFloat64<number, "required">;
        isHighConfidence: import("convex/values").VBoolean<boolean, "required">;
        isVerified: import("convex/values").VBoolean<boolean, "optional">;
        isOutdated: import("convex/values").VBoolean<boolean, "optional">;
        embedding: import("convex/values").VArray<number[], import("convex/values").VFloat64<number, "required">, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "object" | "createdAt" | "extractedAt" | "isHighConfidence" | "sourceDocIds" | "embedding" | "subject" | "predicate" | "isOutdated" | "graphId" | "claimText" | "sourceSnippets" | "isVerified">, {
        by_graph: ["graphId", "_creationTime"];
        by_graph_subject: ["graphId", "subject", "_creationTime"];
        by_graph_predicate: ["graphId", "predicate", "_creationTime"];
        by_confidence: ["isHighConfidence", "_creationTime"];
    }, {
        search_claims: {
            searchField: "claimText";
            filterFields: "isHighConfidence" | "graphId";
        };
    }, {}>;
    graphEdges: import("convex/server").TableDefinition<import("convex/values").VObject<{
        sourceDocId?: string;
        createdAt: number;
        graphId: import("convex/values").GenericId<"knowledgeGraphs">;
        fromClaimId: import("convex/values").GenericId<"graphClaims">;
        toClaimId: import("convex/values").GenericId<"graphClaims">;
        edgeType: "supports" | "contradicts" | "mentions" | "causes" | "relatedTo" | "partOf" | "precedes";
        isStrong: boolean;
    }, {
        graphId: import("convex/values").VId<import("convex/values").GenericId<"knowledgeGraphs">, "required">;
        fromClaimId: import("convex/values").VId<import("convex/values").GenericId<"graphClaims">, "required">;
        toClaimId: import("convex/values").VId<import("convex/values").GenericId<"graphClaims">, "required">;
        edgeType: import("convex/values").VUnion<"supports" | "contradicts" | "mentions" | "causes" | "relatedTo" | "partOf" | "precedes", [import("convex/values").VLiteral<"supports", "required">, import("convex/values").VLiteral<"contradicts", "required">, import("convex/values").VLiteral<"mentions", "required">, import("convex/values").VLiteral<"causes", "required">, import("convex/values").VLiteral<"relatedTo", "required">, import("convex/values").VLiteral<"partOf", "required">, import("convex/values").VLiteral<"precedes", "required">], "required", never>;
        isStrong: import("convex/values").VBoolean<boolean, "required">;
        sourceDocId: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "graphId" | "fromClaimId" | "toClaimId" | "edgeType" | "isStrong" | "sourceDocId">, {
        by_graph: ["graphId", "_creationTime"];
        by_from: ["fromClaimId", "_creationTime"];
        by_to: ["toClaimId", "_creationTime"];
        by_type: ["edgeType", "_creationTime"];
    }, {}, {}>;
    graphClusters: import("convex/server").TableDefinition<import("convex/values").VObject<{
        name?: string;
        description?: string;
        centroidVector?: number[];
        svmModelRef?: string;
        sharedPredicates?: string[];
        sharedSubjects?: string[];
        dominantSourceType?: string;
        algorithmUsed?: string;
        minClusterSize?: number;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        clusterId: string;
        memberGraphIds: import("convex/values").GenericId<"knowledgeGraphs">[];
        memberCount: number;
    }, {
        clusterId: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        name: import("convex/values").VString<string, "optional">;
        description: import("convex/values").VString<string, "optional">;
        memberGraphIds: import("convex/values").VArray<import("convex/values").GenericId<"knowledgeGraphs">[], import("convex/values").VId<import("convex/values").GenericId<"knowledgeGraphs">, "required">, "required">;
        memberCount: import("convex/values").VFloat64<number, "required">;
        centroidVector: import("convex/values").VArray<number[], import("convex/values").VFloat64<number, "required">, "optional">;
        svmModelRef: import("convex/values").VString<string, "optional">;
        sharedPredicates: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        sharedSubjects: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        dominantSourceType: import("convex/values").VString<string, "optional">;
        algorithmUsed: import("convex/values").VString<string, "optional">;
        minClusterSize: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "name" | "description" | "clusterId" | "memberGraphIds" | "memberCount" | "centroidVector" | "svmModelRef" | "sharedPredicates" | "sharedSubjects" | "dominantSourceType" | "algorithmUsed" | "minClusterSize">, {
        by_user: ["userId", "_creationTime"];
        by_clusterId: ["clusterId", "_creationTime"];
        by_memberCount: ["memberCount", "_creationTime"];
    }, {}, {}>;
    artifactRunMeta: import("convex/server").TableDefinition<import("convex/values").VObject<{
        shardId?: number;
        updatedAt: number;
        runId: string;
        bump: number;
    }, {
        runId: import("convex/values").VString<string, "required">;
        shardId: import("convex/values").VFloat64<number, "optional">;
        bump: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "updatedAt" | "runId" | "shardId" | "bump">, {
        by_run_shard: ["runId", "shardId", "_creationTime"];
        by_run: ["runId", "_creationTime"];
    }, {}, {}>;
    artifactDeadLetters: import("convex/server").TableDefinition<import("convex/values").VObject<{
        toolName?: string;
        createdAt: number;
        errorMessage: string;
        runId: string;
        attempt: number;
        errorType: "OCC" | "VALIDATION" | "EXTRACTOR" | "SCHEDULER" | "UNKNOWN";
        artifactCount: number;
        sampleUrls: string[];
    }, {
        runId: import("convex/values").VString<string, "required">;
        toolName: import("convex/values").VString<string, "optional">;
        attempt: import("convex/values").VFloat64<number, "required">;
        errorType: import("convex/values").VUnion<"OCC" | "VALIDATION" | "EXTRACTOR" | "SCHEDULER" | "UNKNOWN", [import("convex/values").VLiteral<"OCC", "required">, import("convex/values").VLiteral<"VALIDATION", "required">, import("convex/values").VLiteral<"EXTRACTOR", "required">, import("convex/values").VLiteral<"SCHEDULER", "required">, import("convex/values").VLiteral<"UNKNOWN", "required">], "required", never>;
        errorMessage: import("convex/values").VString<string, "required">;
        artifactCount: import("convex/values").VFloat64<number, "required">;
        sampleUrls: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "toolName" | "errorMessage" | "runId" | "attempt" | "errorType" | "artifactCount" | "sampleUrls">, {
        by_run: ["runId", "_creationTime"];
        by_run_createdAt: ["runId", "createdAt", "_creationTime"];
    }, {}, {}>;
    artifactPersistJobs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        updatedAt: number;
        createdAt: number;
        status: "failed" | "done" | "started";
        runId: string;
        idempotencyKey: string;
        attempts: number;
    }, {
        runId: import("convex/values").VString<string, "required">;
        idempotencyKey: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"failed" | "done" | "started", [import("convex/values").VLiteral<"started", "required">, import("convex/values").VLiteral<"done", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        attempts: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "updatedAt" | "createdAt" | "status" | "runId" | "idempotencyKey" | "attempts">, {
        by_run_key: ["runId", "idempotencyKey", "_creationTime"];
        by_status_createdAt: ["status", "createdAt", "_creationTime"];
    }, {}, {}>;
    artifactRunStatsShards: import("convex/server").TableDefinition<import("convex/values").VObject<{
        updatedAt: number;
        createdAt: number;
        runId: string;
        shardId: number;
        jobsScheduled: number;
        jobsDeduped: number;
        deadLetters: number;
        occRetries: number;
        noopsSkipped: number;
        artifactsInserted: number;
        artifactsPatched: number;
    }, {
        runId: import("convex/values").VString<string, "required">;
        shardId: import("convex/values").VFloat64<number, "required">;
        jobsScheduled: import("convex/values").VFloat64<number, "required">;
        jobsDeduped: import("convex/values").VFloat64<number, "required">;
        deadLetters: import("convex/values").VFloat64<number, "required">;
        occRetries: import("convex/values").VFloat64<number, "required">;
        noopsSkipped: import("convex/values").VFloat64<number, "required">;
        artifactsInserted: import("convex/values").VFloat64<number, "required">;
        artifactsPatched: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "updatedAt" | "createdAt" | "runId" | "shardId" | "jobsScheduled" | "jobsDeduped" | "deadLetters" | "occRetries" | "noopsSkipped" | "artifactsInserted" | "artifactsPatched">, {
        by_run_shard: ["runId", "shardId", "_creationTime"];
        by_run: ["runId", "_creationTime"];
    }, {}, {}>;
    artifacts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        toolName?: string;
        sourceType?: "agent" | "user" | "tool";
        seq?: number;
        transcript?: string;
        provider?: "youtube" | "news" | "sec" | "arxiv" | "web" | "local";
        snippet?: string;
        host?: string;
        thumbnail?: string;
        pageRefs?: string[];
        verificationHealth?: "unknown" | "has_supported" | "has_not_found" | "has_contradicted";
        lastVerificationAt?: number;
        queryKey?: string;
        entityKey?: string;
        sectionId?: string;
        globalArtifactKey?: string;
        userId: import("convex/values").GenericId<"users">;
        title: string;
        artifactId: string;
        kind: "url" | "file" | "image" | "video" | "document";
        runId: string;
        canonicalUrl: string;
        discoveredAt: number;
        rev: number;
        flags: {
            hasThumbnail: boolean;
            hasTranscript: boolean;
            hasPageRefs: boolean;
            isPinned: boolean;
            isCited: boolean;
            isEnriched: boolean;
        };
    }, {
        runId: import("convex/values").VString<string, "required">;
        artifactId: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        kind: import("convex/values").VUnion<"url" | "file" | "image" | "video" | "document", [import("convex/values").VLiteral<"url", "required">, import("convex/values").VLiteral<"file", "required">, import("convex/values").VLiteral<"video", "required">, import("convex/values").VLiteral<"image", "required">, import("convex/values").VLiteral<"document", "required">], "required", never>;
        provider: import("convex/values").VUnion<"youtube" | "news" | "sec" | "arxiv" | "web" | "local", [import("convex/values").VLiteral<"youtube", "required">, import("convex/values").VLiteral<"sec", "required">, import("convex/values").VLiteral<"arxiv", "required">, import("convex/values").VLiteral<"news", "required">, import("convex/values").VLiteral<"web", "required">, import("convex/values").VLiteral<"local", "required">], "optional", never>;
        canonicalUrl: import("convex/values").VString<string, "required">;
        title: import("convex/values").VString<string, "required">;
        host: import("convex/values").VString<string, "optional">;
        snippet: import("convex/values").VString<string, "optional">;
        thumbnail: import("convex/values").VString<string, "optional">;
        transcript: import("convex/values").VString<string, "optional">;
        pageRefs: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        discoveredAt: import("convex/values").VFloat64<number, "required">;
        toolName: import("convex/values").VString<string, "optional">;
        rev: import("convex/values").VFloat64<number, "required">;
        flags: import("convex/values").VObject<{
            hasThumbnail: boolean;
            hasTranscript: boolean;
            hasPageRefs: boolean;
            isPinned: boolean;
            isCited: boolean;
            isEnriched: boolean;
        }, {
            hasThumbnail: import("convex/values").VBoolean<boolean, "required">;
            hasTranscript: import("convex/values").VBoolean<boolean, "required">;
            hasPageRefs: import("convex/values").VBoolean<boolean, "required">;
            isPinned: import("convex/values").VBoolean<boolean, "required">;
            isCited: import("convex/values").VBoolean<boolean, "required">;
            isEnriched: import("convex/values").VBoolean<boolean, "required">;
        }, "required", "hasThumbnail" | "hasTranscript" | "hasPageRefs" | "isPinned" | "isCited" | "isEnriched">;
        verificationHealth: import("convex/values").VUnion<"unknown" | "has_supported" | "has_not_found" | "has_contradicted", [import("convex/values").VLiteral<"unknown", "required">, import("convex/values").VLiteral<"has_supported", "required">, import("convex/values").VLiteral<"has_not_found", "required">, import("convex/values").VLiteral<"has_contradicted", "required">], "optional", never>;
        lastVerificationAt: import("convex/values").VFloat64<number, "optional">;
        /** Monotonic sequence number within run (for sync cursor) */
        seq: import("convex/values").VFloat64<number, "optional">;
        /** Query fingerprint if from a cached query */
        queryKey: import("convex/values").VString<string, "optional">;
        /** Entity scope ("" if unscoped) */
        entityKey: import("convex/values").VString<string, "optional">;
        /** Section this artifact was discovered in */
        sectionId: import("convex/values").VString<string, "optional">;
        /** Provenance: only "tool" sources are eligible for global store */
        sourceType: import("convex/values").VUnion<"agent" | "user" | "tool", [import("convex/values").VLiteral<"tool", "required">, import("convex/values").VLiteral<"agent", "required">, import("convex/values").VLiteral<"user", "required">], "optional", never>;
        /** Reference to global artifact (set after write-through) */
        globalArtifactKey: import("convex/values").VString<string, "optional">;
    }, "required", "userId" | "title" | "toolName" | "artifactId" | "kind" | "runId" | "sourceType" | "seq" | "transcript" | "provider" | "snippet" | "canonicalUrl" | "host" | "thumbnail" | "pageRefs" | "discoveredAt" | "rev" | "flags" | "verificationHealth" | "lastVerificationAt" | "queryKey" | "entityKey" | "sectionId" | "globalArtifactKey" | "flags.hasThumbnail" | "flags.hasTranscript" | "flags.hasPageRefs" | "flags.isPinned" | "flags.isCited" | "flags.isEnriched">, {
        by_run: ["runId", "_creationTime"];
        by_run_artifact: ["runId", "artifactId", "_creationTime"];
        by_user_run: ["userId", "runId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_runId_seq: ["runId", "seq", "_creationTime"];
        by_createdAt: ["discoveredAt", "_creationTime"];
    }, {}, {}>;
    artifactLinks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        artifactId: string;
        runId: string;
        sectionId: string;
    }, {
        runId: import("convex/values").VString<string, "required">;
        artifactId: import("convex/values").VString<string, "required">;
        sectionId: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "artifactId" | "runId" | "sectionId">, {
        by_run_section: ["runId", "sectionId", "_creationTime"];
        by_run_artifact: ["runId", "artifactId", "_creationTime"];
        by_run: ["runId", "_creationTime"];
    }, {}, {}>;
    evidenceLinks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        runId: string;
        factId: string;
        artifactIds: string[];
    }, {
        runId: import("convex/values").VString<string, "required">;
        factId: import("convex/values").VString<string, "required">;
        artifactIds: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "runId" | "factId" | "artifactIds">, {
        by_run_fact: ["runId", "factId", "_creationTime"];
        by_run: ["runId", "_creationTime"];
    }, {}, {}>;
    facts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        retrievedAt?: number;
        sourceUrl?: string;
        confidence?: number;
        ttlDays?: number;
        snippetSpan?: {
            startChar: number;
            endChar: number;
        };
        contradictionFlag?: boolean;
        contradictingFactIds?: string[];
        createdAt: number;
        runId: string;
        factId: string;
        claimText: string;
        artifactIds: string[];
        sectionKey: string;
    }, {
        runId: import("convex/values").VString<string, "required">;
        factId: import("convex/values").VString<string, "required">;
        sectionKey: import("convex/values").VString<string, "required">;
        claimText: import("convex/values").VString<string, "required">;
        artifactIds: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        confidence: import("convex/values").VFloat64<number, "optional">;
        ttlDays: import("convex/values").VFloat64<number, "optional">;
        snippetSpan: import("convex/values").VObject<{
            startChar: number;
            endChar: number;
        }, {
            startChar: import("convex/values").VFloat64<number, "required">;
            endChar: import("convex/values").VFloat64<number, "required">;
        }, "optional", "startChar" | "endChar">;
        sourceUrl: import("convex/values").VString<string, "optional">;
        retrievedAt: import("convex/values").VFloat64<number, "optional">;
        contradictionFlag: import("convex/values").VBoolean<boolean, "optional">;
        contradictingFactIds: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
    }, "required", "createdAt" | "retrievedAt" | "sourceUrl" | "runId" | "confidence" | "factId" | "claimText" | "artifactIds" | "sectionKey" | "ttlDays" | "snippetSpan" | "contradictionFlag" | "contradictingFactIds" | "snippetSpan.startChar" | "snippetSpan.endChar">, {
        by_run: ["runId", "_creationTime"];
        by_run_fact: ["runId", "factId", "_creationTime"];
        by_run_section: ["runId", "sectionKey", "_creationTime"];
        by_confidence: ["confidence", "_creationTime"];
        by_contradiction: ["contradictionFlag", "_creationTime"];
    }, {}, {}>;
    claimVerifications: import("convex/server").TableDefinition<import("convex/values").VObject<{
        snippet?: string;
        explanation?: string;
        createdAt: number;
        artifactId: string;
        runId: string;
        confidence: number;
        verdict: "supported" | "not_found" | "contradicted" | "inaccessible";
        factId: string;
    }, {
        runId: import("convex/values").VString<string, "required">;
        factId: import("convex/values").VString<string, "required">;
        artifactId: import("convex/values").VString<string, "required">;
        verdict: import("convex/values").VUnion<"supported" | "not_found" | "contradicted" | "inaccessible", [import("convex/values").VLiteral<"supported", "required">, import("convex/values").VLiteral<"not_found", "required">, import("convex/values").VLiteral<"contradicted", "required">, import("convex/values").VLiteral<"inaccessible", "required">], "required", never>;
        confidence: import("convex/values").VFloat64<number, "required">;
        explanation: import("convex/values").VString<string, "optional">;
        snippet: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "artifactId" | "runId" | "confidence" | "verdict" | "snippet" | "factId" | "explanation">, {
        by_run: ["runId", "_creationTime"];
        by_run_fact: ["runId", "factId", "_creationTime"];
        by_artifact: ["artifactId", "_creationTime"];
        by_run_fact_artifact: ["runId", "factId", "artifactId", "_creationTime"];
    }, {}, {}>;
    globalArtifacts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        title?: string;
        contentHash?: string;
        snippet?: string;
        thumbnail?: string;
        domain: string;
        canonicalUrl: string;
        artifactKey: string;
        firstSeenAt: number;
        lastSeenAt: number;
        seenCount: number;
    }, {
        /** Deterministic key: "ga_" + sha256(canonicalUrl) */
        artifactKey: import("convex/values").VString<string, "required">;
        canonicalUrl: import("convex/values").VString<string, "required">;
        domain: import("convex/values").VString<string, "required">;
        title: import("convex/values").VString<string, "optional">;
        snippet: import("convex/values").VString<string, "optional">;
        thumbnail: import("convex/values").VString<string, "optional">;
        /** Hash of title+snippet for change detection */
        contentHash: import("convex/values").VString<string, "optional">;
        firstSeenAt: import("convex/values").VFloat64<number, "required">;
        lastSeenAt: import("convex/values").VFloat64<number, "required">;
        seenCount: import("convex/values").VFloat64<number, "required">;
    }, "required", "title" | "contentHash" | "domain" | "snippet" | "canonicalUrl" | "thumbnail" | "artifactKey" | "firstSeenAt" | "lastSeenAt" | "seenCount">, {
        by_artifactKey: ["artifactKey", "_creationTime"];
        by_canonicalUrl: ["canonicalUrl", "_creationTime"];
        by_domain_lastSeenAt: ["domain", "lastSeenAt", "_creationTime"];
        by_lastSeenAt: ["lastSeenAt", "_creationTime"];
    }, {}, {}>;
    globalQueryCache: import("convex/server").TableDefinition<import("convex/values").VObject<{
        toolName: string;
        completedAt: number;
        queryKey: string;
        cachedResponse: string;
        ttlMs: number;
    }, {
        /** Deterministic: hash(query + toolName + params) */
        queryKey: import("convex/values").VString<string, "required">;
        /** Full formatted response (ready to return) */
        cachedResponse: import("convex/values").VString<string, "required">;
        /** Tool that produced this result */
        toolName: import("convex/values").VString<string, "required">;
        /** When the cache was populated */
        completedAt: import("convex/values").VFloat64<number, "required">;
        /** TTL in ms (varies by query type) */
        ttlMs: import("convex/values").VFloat64<number, "required">;
    }, "required", "toolName" | "completedAt" | "queryKey" | "cachedResponse" | "ttlMs">, {
        by_queryKey: ["queryKey", "_creationTime"];
        by_completedAt: ["completedAt", "_creationTime"];
    }, {}, {}>;
    globalQueries: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        toolName: string;
        queryKey: string;
        entityKey: string;
        ttlMs: number;
        normalizedQuery: string;
        toolConfig: any;
        toolConfigHash: string;
        toolVersion: string;
        fingerprintVersion: number;
    }, {
        /** Deterministic key: "qk_" + hash(query + config + versions) */
        queryKey: import("convex/values").VString<string, "required">;
        normalizedQuery: import("convex/values").VString<string, "required">;
        toolName: import("convex/values").VString<string, "required">;
        /** Frozen tool args (for debugging) */
        toolConfig: import("convex/values").VAny<any, "required", string>;
        /** Hash of toolConfig for reliable comparisons */
        toolConfigHash: import("convex/values").VString<string, "required">;
        /** Tool version (e.g., "linkup-v2") */
        toolVersion: import("convex/values").VString<string, "required">;
        /** Fingerprint algorithm version (bump when algo changes) */
        fingerprintVersion: import("convex/values").VFloat64<number, "required">;
        /**
         * Entity scope. Use "" for unscoped queries.
         * WARNING: Never query by_entityKey when entityKey === "" (hot partition).
         */
        entityKey: import("convex/values").VString<string, "required">;
        /** Chosen TTL for this query type */
        ttlMs: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "toolName" | "queryKey" | "entityKey" | "ttlMs" | "normalizedQuery" | "toolConfig" | "toolConfigHash" | "toolVersion" | "fingerprintVersion" | `toolConfig.${string}`>, {
        by_queryKey: ["queryKey", "_creationTime"];
        by_entityKey: ["entityKey", "_creationTime"];
    }, {}, {}>;
    globalArtifactMentions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        score?: number;
        rank?: number;
        toolName: string;
        runId: string;
        queryKey: string;
        entityKey: string;
        sectionId: string;
        artifactKey: string;
        seenAt: number;
    }, {
        artifactKey: import("convex/values").VString<string, "required">;
        queryKey: import("convex/values").VString<string, "required">;
        /**
         * Entity scope. Use "" for unscoped.
         * WARNING: Never query by_entityKey_seenAt when entityKey === "".
         */
        entityKey: import("convex/values").VString<string, "required">;
        seenAt: import("convex/values").VFloat64<number, "required">;
        toolName: import("convex/values").VString<string, "required">;
        /** globalResearchRunId, "" if backfill */
        runId: import("convex/values").VString<string, "required">;
        /** Section context, "" if none */
        sectionId: import("convex/values").VString<string, "required">;
        rank: import("convex/values").VFloat64<number, "optional">;
        score: import("convex/values").VFloat64<number, "optional">;
    }, "required", "toolName" | "runId" | "score" | "queryKey" | "entityKey" | "sectionId" | "artifactKey" | "seenAt" | "rank">, {
        by_artifactKey_seenAt: ["artifactKey", "seenAt", "_creationTime"];
        by_queryKey_seenAt: ["queryKey", "seenAt", "_creationTime"];
        by_entityKey_seenAt: ["entityKey", "seenAt", "_creationTime"];
        by_seenAt: ["seenAt", "_creationTime"];
    }, {}, {}>;
    globalMentionAgg: import("convex/server").TableDefinition<import("convex/values").VObject<{
        bestRank?: number;
        queryKey: string;
        entityKey: string;
        artifactKey: string;
        firstSeenAt: number;
        lastSeenAt: number;
        aggKey: string;
        dayBucket: string;
        mentionCount: number;
    }, {
        /** Deterministic: hash(artifactKey + queryKey + dayBucket) */
        aggKey: import("convex/values").VString<string, "required">;
        artifactKey: import("convex/values").VString<string, "required">;
        queryKey: import("convex/values").VString<string, "required">;
        /** Use "" for unscoped */
        entityKey: import("convex/values").VString<string, "required">;
        /** Date bucket: "2024-01-15" */
        dayBucket: import("convex/values").VString<string, "required">;
        mentionCount: import("convex/values").VFloat64<number, "required">;
        bestRank: import("convex/values").VFloat64<number, "optional">;
        firstSeenAt: import("convex/values").VFloat64<number, "required">;
        lastSeenAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "queryKey" | "entityKey" | "artifactKey" | "firstSeenAt" | "lastSeenAt" | "aggKey" | "dayBucket" | "mentionCount" | "bestRank">, {
        by_aggKey: ["aggKey", "_creationTime"];
        by_queryKey_day: ["queryKey", "dayBucket", "_creationTime"];
        by_entityKey_day: ["entityKey", "dayBucket", "_creationTime"];
        by_artifactKey_day: ["artifactKey", "dayBucket", "_creationTime"];
        by_dayBucket: ["dayBucket", "_creationTime"];
    }, {}, {}>;
    globalResearchRuns: import("convex/server").TableDefinition<import("convex/values").VObject<{
        error?: string;
        startedAt?: number;
        finishedAt?: number;
        artifactCount?: number;
        expiresAt: number;
        status: "running" | "completed" | "scheduled" | "failed";
        scheduledAt: number;
        version: number;
        queryKey: string;
        entityKey: string;
        ttlMs: number;
        researchRunId: string;
        sortTs: number;
    }, {
        /** Unique run ID: "grr_" + uuid */
        researchRunId: import("convex/values").VString<string, "required">;
        queryKey: import("convex/values").VString<string, "required">;
        /**
         * Entity scope. Use "" for unscoped.
         * WARNING: Never query by_entityKey_* when entityKey === "".
         */
        entityKey: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"running" | "completed" | "scheduled" | "failed", [import("convex/values").VLiteral<"scheduled", "required">, import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        /** Monotonic version per queryKey */
        version: import("convex/values").VFloat64<number, "required">;
        ttlMs: import("convex/values").VFloat64<number, "required">;
        /** startedAt + ttlMs (for cache expiry checks) */
        expiresAt: import("convex/values").VFloat64<number, "required">;
        /**
         * Always set (= scheduledAt initially, overwritten on start).
         * Used for reliable sorting since startedAt can be optional.
         */
        sortTs: import("convex/values").VFloat64<number, "required">;
        scheduledAt: import("convex/values").VFloat64<number, "required">;
        startedAt: import("convex/values").VFloat64<number, "optional">;
        finishedAt: import("convex/values").VFloat64<number, "optional">;
        artifactCount: import("convex/values").VFloat64<number, "optional">;
        error: import("convex/values").VString<string, "optional">;
    }, "required", "expiresAt" | "status" | "error" | "scheduledAt" | "startedAt" | "finishedAt" | "version" | "artifactCount" | "queryKey" | "entityKey" | "ttlMs" | "researchRunId" | "sortTs">, {
        by_researchRunId: ["researchRunId", "_creationTime"];
        by_queryKey_sortTs: ["queryKey", "sortTs", "_creationTime"];
        by_queryKey_status_sortTs: ["queryKey", "status", "sortTs", "_creationTime"];
        by_entityKey_sortTs: ["entityKey", "sortTs", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_expiresAt: ["expiresAt", "_creationTime"];
    }, {}, {}>;
    globalResearchEvents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        kind: "artifact_added" | "artifact_updated" | "artifact_removed" | "fact_extracted" | "run_started" | "run_completed" | "run_failed";
        seq: number;
        payload: any;
        researchRunId: string;
        eventKey: string;
    }, {
        researchRunId: import("convex/values").VString<string, "required">;
        /** For dedup on read: hash(kind + artifactKey + version) */
        eventKey: import("convex/values").VString<string, "required">;
        /** Monotonic within run */
        seq: import("convex/values").VFloat64<number, "required">;
        kind: import("convex/values").VUnion<"artifact_added" | "artifact_updated" | "artifact_removed" | "fact_extracted" | "run_started" | "run_completed" | "run_failed", [import("convex/values").VLiteral<"artifact_added", "required">, import("convex/values").VLiteral<"artifact_updated", "required">, import("convex/values").VLiteral<"artifact_removed", "required">, import("convex/values").VLiteral<"fact_extracted", "required">, import("convex/values").VLiteral<"run_started", "required">, import("convex/values").VLiteral<"run_completed", "required">, import("convex/values").VLiteral<"run_failed", "required">], "required", never>;
        payload: import("convex/values").VAny<any, "required", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "kind" | "seq" | "payload" | `payload.${string}` | "researchRunId" | "eventKey">, {
        by_runId_seq: ["researchRunId", "seq", "_creationTime"];
        by_createdAt: ["createdAt", "_creationTime"];
    }, {}, {}>;
    globalQueryLocks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        error?: string;
        completedAt?: number;
        failedAt?: number;
        status: "running" | "completed" | "failed";
        runId: string;
        startedAt: number;
        queryKey: string;
        lockNonce: string;
        staleAfterMs: number;
    }, {
        queryKey: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"running" | "completed" | "failed", [import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        runId: import("convex/values").VString<string, "required">;
        /** Random UUID for ownership verification */
        lockNonce: import("convex/values").VString<string, "required">;
        startedAt: import("convex/values").VFloat64<number, "required">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
        failedAt: import("convex/values").VFloat64<number, "optional">;
        error: import("convex/values").VString<string, "optional">;
        /** Default 10 minutes */
        staleAfterMs: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "error" | "runId" | "startedAt" | "completedAt" | "queryKey" | "lockNonce" | "failedAt" | "staleAfterMs">, {
        by_queryKey: ["queryKey", "_creationTime"];
    }, {}, {}>;
    researchSubscriptions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        lastSentAt?: number;
        lastSeenVersion?: number;
        userId: import("convex/values").GenericId<"users">;
        createdAt: number;
        isActive: boolean;
        subscriptionType: "query" | "entity" | "hashtag";
        targetKey: string;
        displayName: string;
        frequency: "weekly" | "daily" | "monthly";
        deliveryMethod: "email" | "in_app";
        timezone: string;
        deliveryHourLocal: number;
        maxItems: number;
        nextDueAt: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        subscriptionType: import("convex/values").VUnion<"query" | "entity" | "hashtag", [import("convex/values").VLiteral<"entity", "required">, import("convex/values").VLiteral<"query", "required">, import("convex/values").VLiteral<"hashtag", "required">], "required", never>;
        /** entityKey, queryKey, or hashtag */
        targetKey: import("convex/values").VString<string, "required">;
        displayName: import("convex/values").VString<string, "required">;
        frequency: import("convex/values").VUnion<"weekly" | "daily" | "monthly", [import("convex/values").VLiteral<"daily", "required">, import("convex/values").VLiteral<"weekly", "required">, import("convex/values").VLiteral<"monthly", "required">], "required", never>;
        deliveryMethod: import("convex/values").VUnion<"email" | "in_app", [import("convex/values").VLiteral<"email", "required">, import("convex/values").VLiteral<"in_app", "required">], "required", never>;
        /** Timezone for delivery (default "UTC") */
        timezone: import("convex/values").VString<string, "required">;
        /** Hour of day for delivery (0-23, default 8) */
        deliveryHourLocal: import("convex/values").VFloat64<number, "required">;
        /** Max artifacts per digest (default 20) */
        maxItems: import("convex/values").VFloat64<number, "required">;
        /** Precomputed next send time (for efficient cron query) */
        nextDueAt: import("convex/values").VFloat64<number, "required">;
        lastSentAt: import("convex/values").VFloat64<number, "optional">;
        lastSeenVersion: import("convex/values").VFloat64<number, "optional">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "createdAt" | "isActive" | "subscriptionType" | "targetKey" | "displayName" | "frequency" | "deliveryMethod" | "timezone" | "deliveryHourLocal" | "maxItems" | "nextDueAt" | "lastSentAt" | "lastSeenVersion">, {
        by_user: ["userId", "_creationTime"];
        by_user_active: ["userId", "isActive", "_creationTime"];
        by_nextDueAt_active: ["nextDueAt", "isActive", "_creationTime"];
    }, {}, {}>;
    globalCompactionState: import("convex/server").TableDefinition<import("convex/values").VObject<{
        mentionsCompacted?: number;
        mentionsPurged?: number;
        duplicatesMerged?: number;
        compactionType: string;
        lastProcessedAt: number;
        lastRunAt: number;
    }, {
        /** Singleton key: "mentions" | "artifacts" */
        compactionType: import("convex/values").VString<string, "required">;
        /** Last processed seenAt timestamp */
        lastProcessedAt: import("convex/values").VFloat64<number, "required">;
        /** Stats for monitoring */
        lastRunAt: import("convex/values").VFloat64<number, "required">;
        mentionsCompacted: import("convex/values").VFloat64<number, "optional">;
        mentionsPurged: import("convex/values").VFloat64<number, "optional">;
        duplicatesMerged: import("convex/values").VFloat64<number, "optional">;
    }, "required", "compactionType" | "lastProcessedAt" | "lastRunAt" | "mentionsCompacted" | "mentionsPurged" | "duplicatesMerged">, {
        by_type: ["compactionType", "_creationTime"];
    }, {}, {}>;
    globalBackfillState: import("convex/server").TableDefinition<import("convex/values").VObject<{
        lastRunId?: string;
        lastSeq?: number;
        status: "running" | "completed" | "paused";
        startedAt: number;
        backfillRunId: string;
        processedCount: number;
        eligibleCount: number;
        lastUpdatedAt: number;
    }, {
        backfillRunId: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"running" | "completed" | "paused", [import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"paused", "required">, import("convex/values").VLiteral<"completed", "required">], "required", never>;
        /** Last processed run ID */
        lastRunId: import("convex/values").VString<string, "optional">;
        /** Last processed seq within that run */
        lastSeq: import("convex/values").VFloat64<number, "optional">;
        processedCount: import("convex/values").VFloat64<number, "required">;
        eligibleCount: import("convex/values").VFloat64<number, "required">;
        startedAt: import("convex/values").VFloat64<number, "required">;
        lastUpdatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "startedAt" | "backfillRunId" | "lastRunId" | "lastSeq" | "processedCount" | "eligibleCount" | "lastUpdatedAt">, {
        by_backfillRunId: ["backfillRunId", "_creationTime"];
        by_status: ["status", "_creationTime"];
    }, {}, {}>;
    /**
     * Skills are pre-defined multi-step workflows that combine tools for common tasks.
     * Based on Anthropic's Skills specification (v1.0, October 2025).
     *
     * Skills follow the progressive disclosure pattern:
     * - searchAvailableSkills: Returns name + description (low tokens)
     * - describeSkill: Loads full instructions on-demand (high tokens)
     *
     * Format follows SKILL.md spec:
     * - name: hyphen-case unique identifier
     * - description: When to use this skill
     * - fullInstructions: Markdown workflow steps (loaded on-demand)
     */
    skills: import("convex/server").TableDefinition<import("convex/values").VObject<{
        metadata?: any;
        embedding?: number[];
        contentHash?: string;
        lastUsedAt?: number;
        version?: number;
        license?: string;
        allowedTools?: string[];
        nestedResources?: {
            tokensEstimate?: number;
            type: "json" | "markdown" | "template";
            name: string;
            uri: string;
        }[];
        updatedAt: number;
        createdAt: number;
        name: string;
        description: string;
        isEnabled: boolean;
        category: string;
        usageCount: number;
        fullInstructions: string;
        categoryName: string;
        keywords: string[];
        keywordsText: string;
    }, {
        name: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "required">;
        fullInstructions: import("convex/values").VString<string, "required">;
        category: import("convex/values").VString<string, "required">;
        categoryName: import("convex/values").VString<string, "required">;
        keywords: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        keywordsText: import("convex/values").VString<string, "required">;
        embedding: import("convex/values").VArray<number[], import("convex/values").VFloat64<number, "required">, "optional">;
        license: import("convex/values").VString<string, "optional">;
        allowedTools: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        metadata: import("convex/values").VAny<any, "optional", string>;
        nestedResources: import("convex/values").VArray<{
            tokensEstimate?: number;
            type: "json" | "markdown" | "template";
            name: string;
            uri: string;
        }[], import("convex/values").VObject<{
            tokensEstimate?: number;
            type: "json" | "markdown" | "template";
            name: string;
            uri: string;
        }, {
            name: import("convex/values").VString<string, "required">;
            type: import("convex/values").VUnion<"json" | "markdown" | "template", [import("convex/values").VLiteral<"markdown", "required">, import("convex/values").VLiteral<"json", "required">, import("convex/values").VLiteral<"template", "required">], "required", never>;
            uri: import("convex/values").VString<string, "required">;
            tokensEstimate: import("convex/values").VFloat64<number, "optional">;
        }, "required", "type" | "name" | "uri" | "tokensEstimate">, "optional">;
        contentHash: import("convex/values").VString<string, "optional">;
        version: import("convex/values").VFloat64<number, "optional">;
        usageCount: import("convex/values").VFloat64<number, "required">;
        lastUsedAt: import("convex/values").VFloat64<number, "optional">;
        isEnabled: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "updatedAt" | "createdAt" | "name" | "metadata" | `metadata.${string}` | "description" | "embedding" | "isEnabled" | "contentHash" | "category" | "usageCount" | "lastUsedAt" | "version" | "fullInstructions" | "categoryName" | "keywords" | "keywordsText" | "license" | "allowedTools" | "nestedResources">, {
        by_name: ["name", "_creationTime"];
        by_category: ["category", "_creationTime"];
        by_usage: ["usageCount", "_creationTime"];
        by_enabled: ["isEnabled", "_creationTime"];
        by_enabled_category: ["isEnabled", "category", "_creationTime"];
        by_content_hash: ["contentHash", "_creationTime"];
        by_version: ["version", "_creationTime"];
    }, {
        search_description: {
            searchField: "description";
            filterFields: "isEnabled" | "category";
        };
        search_keywords: {
            searchField: "keywordsText";
            filterFields: "isEnabled" | "category";
        };
    }, {
        by_embedding: {
            vectorField: "embedding";
            dimensions: number;
            filterFields: "isEnabled" | "category";
        };
    }>;
    /**
     * Tracks individual skill usages for analytics
     */
    skillUsage: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        executionTimeMs?: number;
        toolsInvoked?: string[];
        skillName: string;
        queryText: string;
        wasSuccessful: boolean;
    }, {
        skillName: import("convex/values").VString<string, "required">;
        queryText: import("convex/values").VString<string, "required">;
        wasSuccessful: import("convex/values").VBoolean<boolean, "required">;
        executionTimeMs: import("convex/values").VFloat64<number, "optional">;
        toolsInvoked: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
    }, "required", "userId" | "skillName" | "queryText" | "wasSuccessful" | "executionTimeMs" | "toolsInvoked">, {
        by_skill: ["skillName", "_creationTime"];
        by_skill_success: ["skillName", "wasSuccessful", "_creationTime"];
    }, {}, {}>;
    /**
     * Caches skill search results to reduce latency
     */
    skillSearchCache: import("convex/server").TableDefinition<import("convex/values").VObject<{
        category?: string;
        expiresAt: number;
        results: {
            score: number;
            skillName: string;
            matchType: string;
        }[];
        queryText: string;
        queryHash: string;
    }, {
        queryHash: import("convex/values").VString<string, "required">;
        queryText: import("convex/values").VString<string, "required">;
        category: import("convex/values").VString<string, "optional">;
        results: import("convex/values").VArray<{
            score: number;
            skillName: string;
            matchType: string;
        }[], import("convex/values").VObject<{
            score: number;
            skillName: string;
            matchType: string;
        }, {
            skillName: import("convex/values").VString<string, "required">;
            score: import("convex/values").VFloat64<number, "required">;
            matchType: import("convex/values").VString<string, "required">;
        }, "required", "score" | "skillName" | "matchType">, "required">;
        expiresAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "expiresAt" | "category" | "results" | "queryText" | "queryHash">, {
        by_hash: ["queryHash", "_creationTime"];
        by_expiry: ["expiresAt", "_creationTime"];
    }, {}, {}>;
    /**
     * Central catalog of all tools with BM25 + vector search capabilities
     */
    toolRegistry: import("convex/server").TableDefinition<import("convex/values").VObject<{
        metadata?: any;
        embedding?: number[];
        examples?: string[];
        successRate?: number;
        avgExecutionMs?: number;
        toolName: string;
        description: string;
        isEnabled: boolean;
        category: string;
        usageCount: number;
        categoryName: string;
        keywords: string[];
        keywordsText: string;
        module: string;
    }, {
        toolName: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "required">;
        keywords: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        keywordsText: import("convex/values").VString<string, "required">;
        category: import("convex/values").VString<string, "required">;
        categoryName: import("convex/values").VString<string, "required">;
        module: import("convex/values").VString<string, "required">;
        examples: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        embedding: import("convex/values").VArray<number[], import("convex/values").VFloat64<number, "required">, "optional">;
        usageCount: import("convex/values").VFloat64<number, "required">;
        successRate: import("convex/values").VFloat64<number, "optional">;
        avgExecutionMs: import("convex/values").VFloat64<number, "optional">;
        isEnabled: import("convex/values").VBoolean<boolean, "required">;
        metadata: import("convex/values").VAny<any, "optional", string>;
    }, "required", "toolName" | "metadata" | `metadata.${string}` | "description" | "embedding" | "isEnabled" | "category" | "usageCount" | "examples" | "successRate" | "categoryName" | "keywords" | "keywordsText" | "module" | "avgExecutionMs">, {
        by_toolName: ["toolName", "_creationTime"];
        by_category: ["category", "_creationTime"];
        by_usage: ["usageCount", "_creationTime"];
        by_enabled: ["isEnabled", "_creationTime"];
        by_enabled_category: ["isEnabled", "category", "_creationTime"];
    }, {
        search_description: {
            searchField: "description";
            filterFields: "isEnabled" | "category";
        };
        search_keywords: {
            searchField: "keywordsText";
            filterFields: "isEnabled" | "category";
        };
    }, {
        by_embedding: {
            vectorField: "embedding";
            dimensions: number;
            filterFields: "isEnabled" | "category";
        };
    }>;
    /**
     * Tracks individual tool invocations for analytics and popularity ranking
     */
    toolUsage: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        errorMessage?: string;
        executionTimeMs?: number;
        toolName: string;
        queryText: string;
        wasSuccessful: boolean;
    }, {
        toolName: import("convex/values").VString<string, "required">;
        queryText: import("convex/values").VString<string, "required">;
        wasSuccessful: import("convex/values").VBoolean<boolean, "required">;
        executionTimeMs: import("convex/values").VFloat64<number, "optional">;
        errorMessage: import("convex/values").VString<string, "optional">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
    }, "required", "userId" | "toolName" | "errorMessage" | "queryText" | "wasSuccessful" | "executionTimeMs">, {
        by_tool: ["toolName", "_creationTime"];
        by_tool_success: ["toolName", "wasSuccessful", "_creationTime"];
    }, {}, {}>;
    /**
     * Caches hybrid search results to reduce latency
     */
    toolSearchCache: import("convex/server").TableDefinition<import("convex/values").VObject<{
        category?: string;
        expiresAt: number;
        results: {
            toolName: string;
            score: number;
            matchType: string;
        }[];
        queryText: string;
        queryHash: string;
    }, {
        queryHash: import("convex/values").VString<string, "required">;
        queryText: import("convex/values").VString<string, "required">;
        category: import("convex/values").VString<string, "optional">;
        results: import("convex/values").VArray<{
            toolName: string;
            score: number;
            matchType: string;
        }[], import("convex/values").VObject<{
            toolName: string;
            score: number;
            matchType: string;
        }, {
            toolName: import("convex/values").VString<string, "required">;
            score: import("convex/values").VFloat64<number, "required">;
            matchType: import("convex/values").VString<string, "required">;
        }, "required", "toolName" | "score" | "matchType">, "required">;
        expiresAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "expiresAt" | "category" | "results" | "queryText" | "queryHash">, {
        by_hash: ["queryHash", "_creationTime"];
        by_expiry: ["expiresAt", "_creationTime"];
    }, {}, {}>;
    publicDossiers: import("convex/server").TableDefinition<import("convex/values").VObject<{
        generatedAt: number;
        version: number;
        dateString: string;
        sections: any[];
        topic: string;
    }, {
        sections: import("convex/values").VArray<any[], import("convex/values").VAny<any, "required", string>, "required">;
        topic: import("convex/values").VString<string, "required">;
        generatedAt: import("convex/values").VFloat64<number, "required">;
        dateString: import("convex/values").VString<string, "required">;
        version: import("convex/values").VFloat64<number, "required">;
    }, "required", "generatedAt" | "version" | "dateString" | "sections" | "topic">, {
        by_date: ["generatedAt", "_creationTime"];
        by_date_string: ["dateString", "_creationTime"];
    }, {}, {}>;
    dailyBriefSnapshots: import("convex/server").TableDefinition<import("convex/values").VObject<{
        processingTimeMs?: number;
        errors?: string[];
        generatedAt: number;
        version: number;
        dateString: string;
        dashboardMetrics: {
            annotations?: any[];
            agentCount?: {
                label: string;
                count: number;
                speed: number;
            };
            entityGraph?: {
                focusNodeId?: string;
                nodes: {
                    type?: string;
                    importance?: number;
                    tier?: number;
                    id: string;
                    label: string;
                }[];
                edges: {
                    context?: string;
                    order?: "primary" | "secondary";
                    relationship?: string;
                    impact?: string;
                    source: string;
                    target: string;
                }[];
            };
            meta: {
                currentDate: string;
                timelineProgress: number;
            };
            charts: {
                trendLine: any;
                marketShare: any[];
            };
            techReadiness: {
                existing: number;
                emerging: number;
                sciFi: number;
            };
            keyStats: any[];
            capabilities: any[];
        };
        sourceSummary: {
            totalItems: number;
            bySource: any;
            byCategory: any;
            topTrending: string[];
        };
    }, {
        dateString: import("convex/values").VString<string, "required">;
        generatedAt: import("convex/values").VFloat64<number, "required">;
        dashboardMetrics: import("convex/values").VObject<{
            annotations?: any[];
            agentCount?: {
                label: string;
                count: number;
                speed: number;
            };
            entityGraph?: {
                focusNodeId?: string;
                nodes: {
                    type?: string;
                    importance?: number;
                    tier?: number;
                    id: string;
                    label: string;
                }[];
                edges: {
                    context?: string;
                    order?: "primary" | "secondary";
                    relationship?: string;
                    impact?: string;
                    source: string;
                    target: string;
                }[];
            };
            meta: {
                currentDate: string;
                timelineProgress: number;
            };
            charts: {
                trendLine: any;
                marketShare: any[];
            };
            techReadiness: {
                existing: number;
                emerging: number;
                sciFi: number;
            };
            keyStats: any[];
            capabilities: any[];
        }, {
            meta: import("convex/values").VObject<{
                currentDate: string;
                timelineProgress: number;
            }, {
                currentDate: import("convex/values").VString<string, "required">;
                timelineProgress: import("convex/values").VFloat64<number, "required">;
            }, "required", "currentDate" | "timelineProgress">;
            charts: import("convex/values").VObject<{
                trendLine: any;
                marketShare: any[];
            }, {
                trendLine: import("convex/values").VAny<any, "required", string>;
                marketShare: import("convex/values").VArray<any[], import("convex/values").VAny<any, "required", string>, "required">;
            }, "required", "trendLine" | "marketShare" | `trendLine.${string}`>;
            techReadiness: import("convex/values").VObject<{
                existing: number;
                emerging: number;
                sciFi: number;
            }, {
                existing: import("convex/values").VFloat64<number, "required">;
                emerging: import("convex/values").VFloat64<number, "required">;
                sciFi: import("convex/values").VFloat64<number, "required">;
            }, "required", "existing" | "emerging" | "sciFi">;
            keyStats: import("convex/values").VArray<any[], import("convex/values").VAny<any, "required", string>, "required">;
            capabilities: import("convex/values").VArray<any[], import("convex/values").VAny<any, "required", string>, "required">;
            annotations: import("convex/values").VArray<any[], import("convex/values").VAny<any, "required", string>, "optional">;
            agentCount: import("convex/values").VObject<{
                label: string;
                count: number;
                speed: number;
            }, {
                count: import("convex/values").VFloat64<number, "required">;
                label: import("convex/values").VString<string, "required">;
                speed: import("convex/values").VFloat64<number, "required">;
            }, "optional", "label" | "count" | "speed">;
            entityGraph: import("convex/values").VObject<{
                focusNodeId?: string;
                nodes: {
                    type?: string;
                    importance?: number;
                    tier?: number;
                    id: string;
                    label: string;
                }[];
                edges: {
                    context?: string;
                    order?: "primary" | "secondary";
                    relationship?: string;
                    impact?: string;
                    source: string;
                    target: string;
                }[];
            }, {
                focusNodeId: import("convex/values").VString<string, "optional">;
                nodes: import("convex/values").VArray<{
                    type?: string;
                    importance?: number;
                    tier?: number;
                    id: string;
                    label: string;
                }[], import("convex/values").VObject<{
                    type?: string;
                    importance?: number;
                    tier?: number;
                    id: string;
                    label: string;
                }, {
                    id: import("convex/values").VString<string, "required">;
                    label: import("convex/values").VString<string, "required">;
                    type: import("convex/values").VString<string, "optional">;
                    importance: import("convex/values").VFloat64<number, "optional">;
                    tier: import("convex/values").VFloat64<number, "optional">;
                }, "required", "id" | "type" | "label" | "importance" | "tier">, "required">;
                edges: import("convex/values").VArray<{
                    context?: string;
                    order?: "primary" | "secondary";
                    relationship?: string;
                    impact?: string;
                    source: string;
                    target: string;
                }[], import("convex/values").VObject<{
                    context?: string;
                    order?: "primary" | "secondary";
                    relationship?: string;
                    impact?: string;
                    source: string;
                    target: string;
                }, {
                    source: import("convex/values").VString<string, "required">;
                    target: import("convex/values").VString<string, "required">;
                    relationship: import("convex/values").VString<string, "optional">;
                    context: import("convex/values").VString<string, "optional">;
                    impact: import("convex/values").VString<string, "optional">;
                    order: import("convex/values").VUnion<"primary" | "secondary", [import("convex/values").VLiteral<"primary", "required">, import("convex/values").VLiteral<"secondary", "required">], "optional", never>;
                }, "required", "source" | "context" | "order" | "target" | "relationship" | "impact">, "required">;
            }, "optional", "nodes" | "focusNodeId" | "edges">;
        }, "required", "meta" | "annotations" | "charts" | "techReadiness" | "keyStats" | "capabilities" | "agentCount" | "entityGraph" | "meta.currentDate" | "meta.timelineProgress" | "charts.trendLine" | "charts.marketShare" | `charts.trendLine.${string}` | "techReadiness.existing" | "techReadiness.emerging" | "techReadiness.sciFi" | "agentCount.label" | "agentCount.count" | "agentCount.speed" | "entityGraph.nodes" | "entityGraph.focusNodeId" | "entityGraph.edges">;
        sourceSummary: import("convex/values").VObject<{
            totalItems: number;
            bySource: any;
            byCategory: any;
            topTrending: string[];
        }, {
            totalItems: import("convex/values").VFloat64<number, "required">;
            bySource: import("convex/values").VAny<any, "required", string>;
            byCategory: import("convex/values").VAny<any, "required", string>;
            topTrending: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        }, "required", "totalItems" | "bySource" | "byCategory" | "topTrending" | `bySource.${string}` | `byCategory.${string}`>;
        version: import("convex/values").VFloat64<number, "required">;
        processingTimeMs: import("convex/values").VFloat64<number, "optional">;
        errors: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
    }, "required", "generatedAt" | "version" | "dateString" | "processingTimeMs" | "dashboardMetrics" | "sourceSummary" | "errors" | "dashboardMetrics.meta" | "dashboardMetrics.annotations" | "dashboardMetrics.charts" | "dashboardMetrics.techReadiness" | "dashboardMetrics.keyStats" | "dashboardMetrics.capabilities" | "dashboardMetrics.agentCount" | "dashboardMetrics.entityGraph" | "dashboardMetrics.meta.currentDate" | "dashboardMetrics.meta.timelineProgress" | "dashboardMetrics.charts.trendLine" | "dashboardMetrics.charts.marketShare" | `dashboardMetrics.charts.trendLine.${string}` | "dashboardMetrics.techReadiness.existing" | "dashboardMetrics.techReadiness.emerging" | "dashboardMetrics.techReadiness.sciFi" | "dashboardMetrics.agentCount.label" | "dashboardMetrics.agentCount.count" | "dashboardMetrics.agentCount.speed" | "dashboardMetrics.entityGraph.nodes" | "dashboardMetrics.entityGraph.focusNodeId" | "dashboardMetrics.entityGraph.edges" | "sourceSummary.totalItems" | "sourceSummary.bySource" | "sourceSummary.byCategory" | "sourceSummary.topTrending" | `sourceSummary.bySource.${string}` | `sourceSummary.byCategory.${string}`>, {
        by_date_string: ["dateString", "_creationTime"];
        by_generated_at: ["generatedAt", "_creationTime"];
    }, {}, {}>;
    dailyBriefMemories: import("convex/server").TableDefinition<import("convex/values").VObject<{
        updatedAt: number;
        createdAt: number;
        context: any;
        goal: string;
        generatedAt: number;
        version: number;
        dateString: string;
        features: {
            priority?: number;
            notes?: string;
            sourceRefs?: any;
            resultId?: import("convex/values").GenericId<"dailyBriefTaskResults">;
            id: string;
            type: string;
            updatedAt: number;
            name: string;
            status: "pending" | "failing" | "passing";
            testCriteria: string;
        }[];
        progressLog: {
            meta?: any;
            status: "pending" | "error" | "failing" | "passing" | "info" | "working";
            message: string;
            ts: number;
        }[];
        snapshotId: import("convex/values").GenericId<"dailyBriefSnapshots">;
    }, {
        snapshotId: import("convex/values").VId<import("convex/values").GenericId<"dailyBriefSnapshots">, "required">;
        dateString: import("convex/values").VString<string, "required">;
        generatedAt: import("convex/values").VFloat64<number, "required">;
        version: import("convex/values").VFloat64<number, "required">;
        goal: import("convex/values").VString<string, "required">;
        features: import("convex/values").VArray<{
            priority?: number;
            notes?: string;
            sourceRefs?: any;
            resultId?: import("convex/values").GenericId<"dailyBriefTaskResults">;
            id: string;
            type: string;
            updatedAt: number;
            name: string;
            status: "pending" | "failing" | "passing";
            testCriteria: string;
        }[], import("convex/values").VObject<{
            priority?: number;
            notes?: string;
            sourceRefs?: any;
            resultId?: import("convex/values").GenericId<"dailyBriefTaskResults">;
            id: string;
            type: string;
            updatedAt: number;
            name: string;
            status: "pending" | "failing" | "passing";
            testCriteria: string;
        }, {
            id: import("convex/values").VString<string, "required">;
            type: import("convex/values").VString<string, "required">;
            name: import("convex/values").VString<string, "required">;
            status: import("convex/values").VUnion<"pending" | "failing" | "passing", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"failing", "required">, import("convex/values").VLiteral<"passing", "required">], "required", never>;
            priority: import("convex/values").VFloat64<number, "optional">;
            testCriteria: import("convex/values").VString<string, "required">;
            sourceRefs: import("convex/values").VAny<any, "optional", string>;
            notes: import("convex/values").VString<string, "optional">;
            resultId: import("convex/values").VId<import("convex/values").GenericId<"dailyBriefTaskResults">, "optional">;
            updatedAt: import("convex/values").VFloat64<number, "required">;
        }, "required", "id" | "type" | "updatedAt" | "name" | "status" | "priority" | "notes" | "testCriteria" | "sourceRefs" | "resultId" | `sourceRefs.${string}`>, "required">;
        progressLog: import("convex/values").VArray<{
            meta?: any;
            status: "pending" | "error" | "failing" | "passing" | "info" | "working";
            message: string;
            ts: number;
        }[], import("convex/values").VObject<{
            meta?: any;
            status: "pending" | "error" | "failing" | "passing" | "info" | "working";
            message: string;
            ts: number;
        }, {
            ts: import("convex/values").VFloat64<number, "required">;
            status: import("convex/values").VUnion<"pending" | "error" | "failing" | "passing" | "info" | "working", [import("convex/values").VLiteral<"info", "required">, import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"working", "required">, import("convex/values").VLiteral<"passing", "required">, import("convex/values").VLiteral<"failing", "required">, import("convex/values").VLiteral<"error", "required">], "required", never>;
            message: import("convex/values").VString<string, "required">;
            meta: import("convex/values").VAny<any, "optional", string>;
        }, "required", "status" | "meta" | `meta.${string}` | "message" | "ts">, "required">;
        context: import("convex/values").VAny<any, "required", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "updatedAt" | "createdAt" | "context" | "goal" | "generatedAt" | "version" | "dateString" | "features" | "progressLog" | "snapshotId" | `context.${string}`>, {
        by_snapshot: ["snapshotId", "_creationTime"];
        by_date_string: ["dateString", "_creationTime"];
        by_generated_at: ["generatedAt", "_creationTime"];
    }, {}, {}>;
    dailyBriefTaskResults: import("convex/server").TableDefinition<import("convex/values").VObject<{
        artifacts?: any;
        citations?: any;
        createdAt: number;
        taskId: string;
        memoryId: import("convex/values").GenericId<"dailyBriefMemories">;
        resultMarkdown: string;
    }, {
        memoryId: import("convex/values").VId<import("convex/values").GenericId<"dailyBriefMemories">, "required">;
        taskId: import("convex/values").VString<string, "required">;
        resultMarkdown: import("convex/values").VString<string, "required">;
        citations: import("convex/values").VAny<any, "optional", string>;
        artifacts: import("convex/values").VAny<any, "optional", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "taskId" | "artifacts" | "memoryId" | "resultMarkdown" | "citations" | `artifacts.${string}` | `citations.${string}`>, {
        by_memory: ["memoryId", "_creationTime"];
        by_task: ["taskId", "_creationTime"];
    }, {}, {}>;
    dailyBriefPersonalOverlays: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        createdAt: number;
        dateString: string;
        features: {
            priority?: number;
            notes?: string;
            sourceRefs?: any;
            resultMarkdown?: string;
            id: string;
            type: string;
            updatedAt: number;
            name: string;
            status: "pending" | "failing" | "passing";
            testCriteria: string;
        }[];
        progressLog: {
            meta?: any;
            status: "pending" | "error" | "failing" | "passing" | "info" | "working";
            message: string;
            ts: number;
        }[];
        memoryId: import("convex/values").GenericId<"dailyBriefMemories">;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        memoryId: import("convex/values").VId<import("convex/values").GenericId<"dailyBriefMemories">, "required">;
        dateString: import("convex/values").VString<string, "required">;
        features: import("convex/values").VArray<{
            priority?: number;
            notes?: string;
            sourceRefs?: any;
            resultMarkdown?: string;
            id: string;
            type: string;
            updatedAt: number;
            name: string;
            status: "pending" | "failing" | "passing";
            testCriteria: string;
        }[], import("convex/values").VObject<{
            priority?: number;
            notes?: string;
            sourceRefs?: any;
            resultMarkdown?: string;
            id: string;
            type: string;
            updatedAt: number;
            name: string;
            status: "pending" | "failing" | "passing";
            testCriteria: string;
        }, {
            id: import("convex/values").VString<string, "required">;
            type: import("convex/values").VString<string, "required">;
            name: import("convex/values").VString<string, "required">;
            status: import("convex/values").VUnion<"pending" | "failing" | "passing", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"failing", "required">, import("convex/values").VLiteral<"passing", "required">], "required", never>;
            priority: import("convex/values").VFloat64<number, "optional">;
            testCriteria: import("convex/values").VString<string, "required">;
            sourceRefs: import("convex/values").VAny<any, "optional", string>;
            notes: import("convex/values").VString<string, "optional">;
            resultMarkdown: import("convex/values").VString<string, "optional">;
            updatedAt: import("convex/values").VFloat64<number, "required">;
        }, "required", "id" | "type" | "updatedAt" | "name" | "status" | "priority" | "notes" | "testCriteria" | "sourceRefs" | `sourceRefs.${string}` | "resultMarkdown">, "required">;
        progressLog: import("convex/values").VArray<{
            meta?: any;
            status: "pending" | "error" | "failing" | "passing" | "info" | "working";
            message: string;
            ts: number;
        }[], import("convex/values").VObject<{
            meta?: any;
            status: "pending" | "error" | "failing" | "passing" | "info" | "working";
            message: string;
            ts: number;
        }, {
            ts: import("convex/values").VFloat64<number, "required">;
            status: import("convex/values").VUnion<"pending" | "error" | "failing" | "passing" | "info" | "working", [import("convex/values").VLiteral<"info", "required">, import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"working", "required">, import("convex/values").VLiteral<"passing", "required">, import("convex/values").VLiteral<"failing", "required">, import("convex/values").VLiteral<"error", "required">], "required", never>;
            message: import("convex/values").VString<string, "required">;
            meta: import("convex/values").VAny<any, "optional", string>;
        }, "required", "status" | "meta" | `meta.${string}` | "message" | "ts">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "createdAt" | "dateString" | "features" | "progressLog" | "memoryId">, {
        by_user_memory: ["userId", "memoryId", "_creationTime"];
        by_user_date: ["userId", "dateString", "_creationTime"];
    }, {}, {}>;
    llmUsageDaily: import("convex/server").TableDefinition<import("convex/values").VObject<{
        providers?: any;
        models?: any;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        date: string;
        successCount: number;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        totalCost: number;
        requests: number;
        cachedTokens: number;
        errorCount: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        date: import("convex/values").VString<string, "required">;
        requests: import("convex/values").VFloat64<number, "required">;
        totalTokens: import("convex/values").VFloat64<number, "required">;
        inputTokens: import("convex/values").VFloat64<number, "required">;
        outputTokens: import("convex/values").VFloat64<number, "required">;
        cachedTokens: import("convex/values").VFloat64<number, "required">;
        totalCost: import("convex/values").VFloat64<number, "required">;
        successCount: import("convex/values").VFloat64<number, "required">;
        errorCount: import("convex/values").VFloat64<number, "required">;
        providers: import("convex/values").VAny<any, "optional", string>;
        models: import("convex/values").VAny<any, "optional", string>;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "updatedAt" | "date" | "successCount" | "inputTokens" | "outputTokens" | "totalTokens" | "totalCost" | "requests" | "cachedTokens" | "errorCount" | "providers" | "models" | `providers.${string}` | `models.${string}`>, {
        by_user: ["userId", "_creationTime"];
        by_user_date: ["userId", "date", "_creationTime"];
        by_date: ["date", "_creationTime"];
    }, {}, {}>;
    anonymousUsageDaily: import("convex/server").TableDefinition<import("convex/values").VObject<{
        ipHash?: string;
        updatedAt: number;
        createdAt: number;
        date: string;
        sessionId: string;
        totalTokens: number;
        totalCost: number;
        requests: number;
    }, {
        sessionId: import("convex/values").VString<string, "required">;
        ipHash: import("convex/values").VString<string, "optional">;
        date: import("convex/values").VString<string, "required">;
        requests: import("convex/values").VFloat64<number, "required">;
        totalTokens: import("convex/values").VFloat64<number, "required">;
        totalCost: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "updatedAt" | "createdAt" | "date" | "sessionId" | "totalTokens" | "totalCost" | "requests" | "ipHash">, {
        by_session: ["sessionId", "_creationTime"];
        by_session_date: ["sessionId", "date", "_creationTime"];
        by_date: ["date", "_creationTime"];
    }, {}, {}>;
    llmUsageLog: import("convex/server").TableDefinition<import("convex/values").VObject<{
        errorMessage?: string;
        latencyMs?: number;
        userId: import("convex/values").GenericId<"users">;
        model: string;
        timestamp: number;
        provider: string;
        inputTokens: number;
        outputTokens: number;
        success: boolean;
        cachedTokens: number;
        cost: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        timestamp: import("convex/values").VFloat64<number, "required">;
        model: import("convex/values").VString<string, "required">;
        provider: import("convex/values").VString<string, "required">;
        inputTokens: import("convex/values").VFloat64<number, "required">;
        outputTokens: import("convex/values").VFloat64<number, "required">;
        cachedTokens: import("convex/values").VFloat64<number, "required">;
        cost: import("convex/values").VFloat64<number, "required">;
        latencyMs: import("convex/values").VFloat64<number, "optional">;
        success: import("convex/values").VBoolean<boolean, "required">;
        errorMessage: import("convex/values").VString<string, "optional">;
    }, "required", "userId" | "model" | "errorMessage" | "timestamp" | "provider" | "inputTokens" | "outputTokens" | "latencyMs" | "success" | "cachedTokens" | "cost">, {
        by_user: ["userId", "_creationTime"];
        by_user_timestamp: ["userId", "timestamp", "_creationTime"];
        by_model: ["model", "_creationTime"];
        by_provider: ["provider", "_creationTime"];
    }, {}, {}>;
    searchRuns: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        threadId?: string;
        cacheHit?: boolean;
        fusedResultIds?: string[];
        query: string;
        timestamp: number;
        mode: string;
        sourcesRequested: string[];
        sourcesQueried: string[];
        totalResults: number;
        totalBeforeFusion: number;
        reranked: boolean;
        totalTimeMs: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        threadId: import("convex/values").VString<string, "optional">;
        query: import("convex/values").VString<string, "required">;
        mode: import("convex/values").VString<string, "required">;
        sourcesRequested: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        sourcesQueried: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        totalResults: import("convex/values").VFloat64<number, "required">;
        totalBeforeFusion: import("convex/values").VFloat64<number, "required">;
        reranked: import("convex/values").VBoolean<boolean, "required">;
        totalTimeMs: import("convex/values").VFloat64<number, "required">;
        cacheHit: import("convex/values").VBoolean<boolean, "optional">;
        timestamp: import("convex/values").VFloat64<number, "required">;
        fusedResultIds: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
    }, "required", "userId" | "threadId" | "query" | "timestamp" | "mode" | "sourcesRequested" | "sourcesQueried" | "totalResults" | "totalBeforeFusion" | "reranked" | "totalTimeMs" | "cacheHit" | "fusedResultIds">, {
        by_user: ["userId", "_creationTime"];
        by_user_timestamp: ["userId", "timestamp", "_creationTime"];
        by_timestamp: ["timestamp", "_creationTime"];
        by_mode: ["mode", "_creationTime"];
        by_thread: ["threadId", "_creationTime"];
    }, {}, {}>;
    searchRunResults: import("convex/server").TableDefinition<import("convex/values").VObject<{
        errorMessage?: string;
        resultIds?: string[];
        source: string;
        latencyMs: number;
        success: boolean;
        searchRunId: import("convex/values").GenericId<"searchRuns">;
        resultCount: number;
    }, {
        searchRunId: import("convex/values").VId<import("convex/values").GenericId<"searchRuns">, "required">;
        source: import("convex/values").VString<string, "required">;
        latencyMs: import("convex/values").VFloat64<number, "required">;
        resultCount: import("convex/values").VFloat64<number, "required">;
        success: import("convex/values").VBoolean<boolean, "required">;
        errorMessage: import("convex/values").VString<string, "optional">;
        resultIds: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
    }, "required", "source" | "errorMessage" | "latencyMs" | "success" | "searchRunId" | "resultCount" | "resultIds">, {
        by_search_run: ["searchRunId", "_creationTime"];
        by_source: ["source", "_creationTime"];
        by_source_success: ["source", "success", "_creationTime"];
    }, {}, {}>;
    searchFusionCache: import("convex/server").TableDefinition<import("convex/values").VObject<{
        hitCount?: number;
        createdAt: number;
        sources: string[];
        expiresAt: number;
        query: string;
        mode: string;
        results: string;
        resultCount: number;
        cacheKey: string;
    }, {
        cacheKey: import("convex/values").VString<string, "required">;
        query: import("convex/values").VString<string, "required">;
        mode: import("convex/values").VString<string, "required">;
        sources: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        results: import("convex/values").VString<string, "required">;
        resultCount: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        expiresAt: import("convex/values").VFloat64<number, "required">;
        hitCount: import("convex/values").VFloat64<number, "optional">;
    }, "required", "createdAt" | "sources" | "expiresAt" | "query" | "mode" | "results" | "resultCount" | "cacheKey" | "hitCount">, {
        by_cache_key: ["cacheKey", "_creationTime"];
        by_expires_at: ["expiresAt", "_creationTime"];
        by_query: ["query", "_creationTime"];
    }, {}, {}>;
    digestSummaryCache: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        hitCount?: number;
        expiresAt: number;
        summary: string;
        generatedAt: number;
        dateString: string;
        dataHash: string;
    }, {
        dateString: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        summary: import("convex/values").VString<string, "required">;
        dataHash: import("convex/values").VString<string, "required">;
        generatedAt: import("convex/values").VFloat64<number, "required">;
        expiresAt: import("convex/values").VFloat64<number, "required">;
        hitCount: import("convex/values").VFloat64<number, "optional">;
    }, "required", "userId" | "expiresAt" | "summary" | "generatedAt" | "dateString" | "hitCount" | "dataHash">, {
        by_date: ["dateString", "_creationTime"];
        by_date_user: ["dateString", "userId", "_creationTime"];
        by_expires_at: ["expiresAt", "_creationTime"];
    }, {}, {}>;
    fundingEvents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string;
        location?: string;
        sector?: string;
        coInvestors?: string[];
        factIds?: string[];
        companyId?: import("convex/values").GenericId<"entityContexts">;
        amountUsd?: number;
        valuation?: string;
        useOfProceeds?: string;
        feedItemIds?: import("convex/values").GenericId<"feedItems">[];
        updatedAt: number;
        createdAt: number;
        confidence: number;
        sourceUrls: string[];
        companyName: string;
        verificationStatus: "verified" | "unverified" | "single-source" | "multi-source";
        ttlDays: number;
        roundType: "unknown" | "pre-seed" | "seed" | "series-a" | "series-b" | "series-c" | "series-d-plus" | "growth" | "debt";
        amountRaw: string;
        announcedAt: number;
        leadInvestors: string[];
        sourceNames: string[];
    }, {
        companyName: import("convex/values").VString<string, "required">;
        companyId: import("convex/values").VId<import("convex/values").GenericId<"entityContexts">, "optional">;
        roundType: import("convex/values").VUnion<"unknown" | "pre-seed" | "seed" | "series-a" | "series-b" | "series-c" | "series-d-plus" | "growth" | "debt", [import("convex/values").VLiteral<"pre-seed", "required">, import("convex/values").VLiteral<"seed", "required">, import("convex/values").VLiteral<"series-a", "required">, import("convex/values").VLiteral<"series-b", "required">, import("convex/values").VLiteral<"series-c", "required">, import("convex/values").VLiteral<"series-d-plus", "required">, import("convex/values").VLiteral<"growth", "required">, import("convex/values").VLiteral<"debt", "required">, import("convex/values").VLiteral<"unknown", "required">], "required", never>;
        amountUsd: import("convex/values").VFloat64<number, "optional">;
        amountRaw: import("convex/values").VString<string, "required">;
        announcedAt: import("convex/values").VFloat64<number, "required">;
        leadInvestors: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        coInvestors: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        sourceUrls: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        sourceNames: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        confidence: import("convex/values").VFloat64<number, "required">;
        verificationStatus: import("convex/values").VUnion<"verified" | "unverified" | "single-source" | "multi-source", [import("convex/values").VLiteral<"unverified", "required">, import("convex/values").VLiteral<"single-source", "required">, import("convex/values").VLiteral<"multi-source", "required">, import("convex/values").VLiteral<"verified", "required">], "required", never>;
        sector: import("convex/values").VString<string, "optional">;
        location: import("convex/values").VString<string, "optional">;
        description: import("convex/values").VString<string, "optional">;
        valuation: import("convex/values").VString<string, "optional">;
        useOfProceeds: import("convex/values").VString<string, "optional">;
        ttlDays: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        feedItemIds: import("convex/values").VArray<import("convex/values").GenericId<"feedItems">[], import("convex/values").VId<import("convex/values").GenericId<"feedItems">, "required">, "optional">;
        factIds: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
    }, "required", "updatedAt" | "createdAt" | "description" | "confidence" | "location" | "sourceUrls" | "sector" | "coInvestors" | "companyName" | "factIds" | "verificationStatus" | "ttlDays" | "companyId" | "roundType" | "amountUsd" | "amountRaw" | "announcedAt" | "leadInvestors" | "sourceNames" | "valuation" | "useOfProceeds" | "feedItemIds">, {
        by_company: ["companyName", "roundType", "_creationTime"];
        by_companyId: ["companyId", "_creationTime"];
        by_announcedAt: ["announcedAt", "_creationTime"];
        by_roundType_announcedAt: ["roundType", "announcedAt", "_creationTime"];
        by_confidence: ["confidence", "_creationTime"];
        by_verificationStatus: ["verificationStatus", "_creationTime"];
        by_createdAt: ["createdAt", "_creationTime"];
    }, {
        search_company: {
            searchField: "companyName";
            filterFields: "verificationStatus" | "roundType";
        };
    }, {}>;
    enrichmentJobs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        lastError?: string;
        startedAt?: number;
        completedAt?: number;
        nextRetryAt?: number;
        outputPayload?: any;
        targetEntityId?: import("convex/values").GenericId<"entityContexts">;
        targetFeedItemId?: import("convex/values").GenericId<"feedItems">;
        sourceFundingEventId?: import("convex/values").GenericId<"fundingEvents">;
        poolName?: string;
        workpoolJobId?: string;
        createdAt: number;
        status: "pending" | "queued" | "completed" | "failed" | "in_progress" | "retrying";
        priority: number;
        jobType: "verification" | "funding_detection" | "entity_promotion" | "full_article_fetch" | "structured_search" | "persona_evaluation";
        attempts: number;
        jobId: string;
        maxAttempts: number;
        inputPayload: any;
    }, {
        jobId: import("convex/values").VString<string, "required">;
        jobType: import("convex/values").VUnion<"verification" | "funding_detection" | "entity_promotion" | "full_article_fetch" | "structured_search" | "persona_evaluation", [import("convex/values").VLiteral<"funding_detection", "required">, import("convex/values").VLiteral<"entity_promotion", "required">, import("convex/values").VLiteral<"full_article_fetch", "required">, import("convex/values").VLiteral<"structured_search", "required">, import("convex/values").VLiteral<"verification", "required">, import("convex/values").VLiteral<"persona_evaluation", "required">], "required", never>;
        status: import("convex/values").VUnion<"pending" | "queued" | "completed" | "failed" | "in_progress" | "retrying", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"queued", "required">, import("convex/values").VLiteral<"in_progress", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"retrying", "required">], "required", never>;
        priority: import("convex/values").VFloat64<number, "required">;
        attempts: import("convex/values").VFloat64<number, "required">;
        maxAttempts: import("convex/values").VFloat64<number, "required">;
        lastError: import("convex/values").VString<string, "optional">;
        nextRetryAt: import("convex/values").VFloat64<number, "optional">;
        inputPayload: import("convex/values").VAny<any, "required", string>;
        outputPayload: import("convex/values").VAny<any, "optional", string>;
        targetEntityId: import("convex/values").VId<import("convex/values").GenericId<"entityContexts">, "optional">;
        targetFeedItemId: import("convex/values").VId<import("convex/values").GenericId<"feedItems">, "optional">;
        sourceFundingEventId: import("convex/values").VId<import("convex/values").GenericId<"fundingEvents">, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        startedAt: import("convex/values").VFloat64<number, "optional">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
        poolName: import("convex/values").VString<string, "optional">;
        workpoolJobId: import("convex/values").VString<string, "optional">;
    }, "required", "createdAt" | "status" | "priority" | "lastError" | "startedAt" | "completedAt" | "jobType" | "attempts" | "jobId" | "maxAttempts" | "nextRetryAt" | "inputPayload" | "outputPayload" | "targetEntityId" | "targetFeedItemId" | "sourceFundingEventId" | "poolName" | "workpoolJobId" | `inputPayload.${string}` | `outputPayload.${string}`>, {
        by_status: ["status", "priority", "_creationTime"];
        by_type_status: ["jobType", "status", "_creationTime"];
        by_targetEntity: ["targetEntityId", "_creationTime"];
        by_targetFeedItem: ["targetFeedItemId", "_creationTime"];
        by_createdAt: ["createdAt", "_creationTime"];
        by_jobId: ["jobId", "_creationTime"];
    }, {}, {}>;
    /**
     * Benchmark task definitions - the golden dataset of test cases.
     * Each task represents a deterministic, reproducible test scenario.
     */
    benchmarkTasks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        updatedAt?: number;
        description?: string;
        priority?: number;
        createdAt: number;
        name: string;
        isActive: boolean;
        taskId: string;
        taskType: "sec_retrieval" | "memo_generation" | "instagram_ingestion" | "claim_extraction" | "citation_validation" | "tool_health" | "artifact_replay";
        inputPayload: any;
        suite: string;
        expectations: {
            minArtifacts?: number;
            requiredFields?: string[];
            maxLatencyMs?: number;
            idempotent?: boolean;
            successRequired: boolean;
        };
    }, {
        taskId: import("convex/values").VString<string, "required">;
        suite: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "optional">;
        taskType: import("convex/values").VUnion<"sec_retrieval" | "memo_generation" | "instagram_ingestion" | "claim_extraction" | "citation_validation" | "tool_health" | "artifact_replay", [import("convex/values").VLiteral<"sec_retrieval", "required">, import("convex/values").VLiteral<"memo_generation", "required">, import("convex/values").VLiteral<"instagram_ingestion", "required">, import("convex/values").VLiteral<"claim_extraction", "required">, import("convex/values").VLiteral<"citation_validation", "required">, import("convex/values").VLiteral<"tool_health", "required">, import("convex/values").VLiteral<"artifact_replay", "required">], "required", never>;
        inputPayload: import("convex/values").VAny<any, "required", string>;
        expectations: import("convex/values").VObject<{
            minArtifacts?: number;
            requiredFields?: string[];
            maxLatencyMs?: number;
            idempotent?: boolean;
            successRequired: boolean;
        }, {
            minArtifacts: import("convex/values").VFloat64<number, "optional">;
            requiredFields: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
            maxLatencyMs: import("convex/values").VFloat64<number, "optional">;
            successRequired: import("convex/values").VBoolean<boolean, "required">;
            idempotent: import("convex/values").VBoolean<boolean, "optional">;
        }, "required", "minArtifacts" | "requiredFields" | "maxLatencyMs" | "successRequired" | "idempotent">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "optional">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        priority: import("convex/values").VFloat64<number, "optional">;
    }, "required", "updatedAt" | "createdAt" | "name" | "description" | "priority" | "isActive" | "taskId" | "taskType" | "inputPayload" | `inputPayload.${string}` | "suite" | "expectations" | "expectations.minArtifacts" | "expectations.requiredFields" | "expectations.maxLatencyMs" | "expectations.successRequired" | "expectations.idempotent">, {
        by_taskId: ["taskId", "_creationTime"];
        by_suite: ["suite", "_creationTime"];
        by_type: ["taskType", "_creationTime"];
        by_active: ["isActive", "_creationTime"];
    }, {}, {}>;
    /**
     * Benchmark runs - execution of a suite of tasks.
     */
    benchmarkRuns: import("convex/server").TableDefinition<import("convex/values").VObject<{
        avgLatencyMs?: number;
        completedAt?: number;
        errors?: {
            error: string;
            taskId: string;
        }[];
        triggeredBy?: string;
        gitCommit?: string;
        totalLatencyMs?: number;
        status: "pending" | "running" | "completed" | "failed";
        runId: string;
        startedAt: number;
        suite: string;
        totalTasks: number;
        completedTasks: number;
        passedTasks: number;
        failedTasks: number;
    }, {
        runId: import("convex/values").VString<string, "required">;
        suite: import("convex/values").VString<string, "required">;
        triggeredBy: import("convex/values").VString<string, "optional">;
        gitCommit: import("convex/values").VString<string, "optional">;
        status: import("convex/values").VUnion<"pending" | "running" | "completed" | "failed", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        totalTasks: import("convex/values").VFloat64<number, "required">;
        completedTasks: import("convex/values").VFloat64<number, "required">;
        passedTasks: import("convex/values").VFloat64<number, "required">;
        failedTasks: import("convex/values").VFloat64<number, "required">;
        totalLatencyMs: import("convex/values").VFloat64<number, "optional">;
        avgLatencyMs: import("convex/values").VFloat64<number, "optional">;
        startedAt: import("convex/values").VFloat64<number, "required">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
        errors: import("convex/values").VArray<{
            error: string;
            taskId: string;
        }[], import("convex/values").VObject<{
            error: string;
            taskId: string;
        }, {
            taskId: import("convex/values").VString<string, "required">;
            error: import("convex/values").VString<string, "required">;
        }, "required", "error" | "taskId">, "optional">;
    }, "required", "status" | "runId" | "avgLatencyMs" | "startedAt" | "completedAt" | "errors" | "suite" | "triggeredBy" | "gitCommit" | "totalTasks" | "completedTasks" | "passedTasks" | "failedTasks" | "totalLatencyMs">, {
        by_runId: ["runId", "_creationTime"];
        by_suite: ["suite", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_started: ["startedAt", "_creationTime"];
    }, {}, {}>;
    /**
     * Benchmark scores - individual task results within a run.
     */
    benchmarkScores: import("convex/server").TableDefinition<import("convex/values").VObject<{
        error?: string;
        artifactIds?: import("convex/values").GenericId<"sourceArtifacts">[];
        outputPreview?: string;
        runId: string;
        taskId: string;
        passed: boolean;
        executedAt: number;
        latencyMs: number;
        suite: string;
        validationResults: {
            artifactCountValid?: boolean;
            requiredFieldsPresent?: boolean;
            latencyWithinThreshold?: boolean;
            idempotencyVerified?: boolean;
            customChecks?: {
                message?: string;
                name: string;
                passed: boolean;
            }[];
        };
    }, {
        runId: import("convex/values").VString<string, "required">;
        taskId: import("convex/values").VString<string, "required">;
        suite: import("convex/values").VString<string, "required">;
        passed: import("convex/values").VBoolean<boolean, "required">;
        latencyMs: import("convex/values").VFloat64<number, "required">;
        validationResults: import("convex/values").VObject<{
            artifactCountValid?: boolean;
            requiredFieldsPresent?: boolean;
            latencyWithinThreshold?: boolean;
            idempotencyVerified?: boolean;
            customChecks?: {
                message?: string;
                name: string;
                passed: boolean;
            }[];
        }, {
            artifactCountValid: import("convex/values").VBoolean<boolean, "optional">;
            requiredFieldsPresent: import("convex/values").VBoolean<boolean, "optional">;
            latencyWithinThreshold: import("convex/values").VBoolean<boolean, "optional">;
            idempotencyVerified: import("convex/values").VBoolean<boolean, "optional">;
            customChecks: import("convex/values").VArray<{
                message?: string;
                name: string;
                passed: boolean;
            }[], import("convex/values").VObject<{
                message?: string;
                name: string;
                passed: boolean;
            }, {
                name: import("convex/values").VString<string, "required">;
                passed: import("convex/values").VBoolean<boolean, "required">;
                message: import("convex/values").VString<string, "optional">;
            }, "required", "name" | "message" | "passed">, "optional">;
        }, "required", "artifactCountValid" | "requiredFieldsPresent" | "latencyWithinThreshold" | "idempotencyVerified" | "customChecks">;
        artifactIds: import("convex/values").VArray<import("convex/values").GenericId<"sourceArtifacts">[], import("convex/values").VId<import("convex/values").GenericId<"sourceArtifacts">, "required">, "optional">;
        outputPreview: import("convex/values").VString<string, "optional">;
        error: import("convex/values").VString<string, "optional">;
        executedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "error" | "runId" | "taskId" | "passed" | "executedAt" | "latencyMs" | "artifactIds" | "suite" | "validationResults" | "outputPreview" | "validationResults.artifactCountValid" | "validationResults.requiredFieldsPresent" | "validationResults.latencyWithinThreshold" | "validationResults.idempotencyVerified" | "validationResults.customChecks">, {
        by_run: ["runId", "_creationTime"];
        by_task: ["taskId", "_creationTime"];
        by_suite_passed: ["suite", "passed", "_creationTime"];
        by_executed: ["executedAt", "_creationTime"];
    }, {}, {}>;
    actionDrafts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        error?: string;
        executedAt?: number;
        result?: string;
        confirmedAt?: number;
        deniedAt?: number;
        expiredAt?: number;
        denyReason?: string;
        createdAt: number;
        expiresAt: number;
        toolName: string;
        status: "pending" | "confirmed" | "denied" | "expired";
        args: string;
        sessionId: string;
        riskTier: "write" | "destructive";
        actionSummary: string;
    }, {
        sessionId: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        toolName: import("convex/values").VString<string, "required">;
        args: import("convex/values").VString<string, "required">;
        riskTier: import("convex/values").VUnion<"write" | "destructive", [import("convex/values").VLiteral<"write", "required">, import("convex/values").VLiteral<"destructive", "required">], "required", never>;
        actionSummary: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"pending" | "confirmed" | "denied" | "expired", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"confirmed", "required">, import("convex/values").VLiteral<"denied", "required">, import("convex/values").VLiteral<"expired", "required">], "required", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        expiresAt: import("convex/values").VFloat64<number, "required">;
        confirmedAt: import("convex/values").VFloat64<number, "optional">;
        deniedAt: import("convex/values").VFloat64<number, "optional">;
        expiredAt: import("convex/values").VFloat64<number, "optional">;
        denyReason: import("convex/values").VString<string, "optional">;
        executedAt: import("convex/values").VFloat64<number, "optional">;
        result: import("convex/values").VString<string, "optional">;
        error: import("convex/values").VString<string, "optional">;
    }, "required", "userId" | "createdAt" | "expiresAt" | "toolName" | "status" | "args" | "error" | "sessionId" | "executedAt" | "result" | "riskTier" | "actionSummary" | "confirmedAt" | "deniedAt" | "expiredAt" | "denyReason">, {
        by_session: ["sessionId", "createdAt", "_creationTime"];
        by_user: ["userId", "createdAt", "_creationTime"];
        by_status: ["status", "createdAt", "_creationTime"];
        by_expiry: ["expiresAt", "_creationTime"];
    }, {}, {}>;
    signals: import("convex/server").TableDefinition<import("convex/values").VObject<{
        title?: string;
        expiresAt?: number;
        sourceUrl?: string;
        errorMessage?: string;
        retryCount?: number;
        processedAt?: number;
        extractedEntities?: string[];
        suggestedPersonas?: string[];
        urgency?: "high" | "medium" | "low" | "critical";
        estimatedResearchDepth?: "shallow" | "standard" | "deep";
        source: string;
        createdAt: number;
        sourceType: string;
        contentHash: string;
        rawContent: string;
        processingStatus: "pending" | "failed" | "processed" | "processing" | "skipped";
    }, {
        source: import("convex/values").VString<string, "required">;
        sourceType: import("convex/values").VString<string, "required">;
        sourceUrl: import("convex/values").VString<string, "optional">;
        rawContent: import("convex/values").VString<string, "required">;
        title: import("convex/values").VString<string, "optional">;
        contentHash: import("convex/values").VString<string, "required">;
        processedAt: import("convex/values").VFloat64<number, "optional">;
        processingStatus: import("convex/values").VUnion<"pending" | "failed" | "processed" | "processing" | "skipped", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"processing", "required">, import("convex/values").VLiteral<"processed", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"skipped", "required">], "required", never>;
        extractedEntities: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        suggestedPersonas: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        urgency: import("convex/values").VUnion<"high" | "medium" | "low" | "critical", [import("convex/values").VLiteral<"critical", "required">, import("convex/values").VLiteral<"high", "required">, import("convex/values").VLiteral<"medium", "required">, import("convex/values").VLiteral<"low", "required">], "optional", never>;
        estimatedResearchDepth: import("convex/values").VUnion<"shallow" | "standard" | "deep", [import("convex/values").VLiteral<"shallow", "required">, import("convex/values").VLiteral<"standard", "required">, import("convex/values").VLiteral<"deep", "required">], "optional", never>;
        errorMessage: import("convex/values").VString<string, "optional">;
        retryCount: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        expiresAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "source" | "createdAt" | "title" | "expiresAt" | "sourceUrl" | "errorMessage" | "sourceType" | "contentHash" | "rawContent" | "retryCount" | "processedAt" | "processingStatus" | "extractedEntities" | "suggestedPersonas" | "urgency" | "estimatedResearchDepth">, {
        by_processed: ["processedAt", "_creationTime"];
        by_status: ["processingStatus", "_creationTime"];
        by_source: ["source", "createdAt", "_creationTime"];
        by_contentHash: ["contentHash", "_creationTime"];
        by_urgency: ["urgency", "createdAt", "_creationTime"];
        by_expires: ["expiresAt", "_creationTime"];
    }, {}, {}>;
    researchTasks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        lastError?: string;
        startedAt?: number;
        swarmId?: string;
        tokensUsed?: number;
        elapsedMs?: number;
        qualityScore?: number;
        completedAt?: number;
        entityName?: string;
        entityType?: string;
        triggeredBy?: "signal" | "decay" | "watchlist" | "enrichment" | "manual";
        primaryPersona?: string;
        priorityFactors?: {
            urgencyBoost?: number;
            stalenessBoost?: number;
            watchlistBoost?: number;
            trendingBoost?: number;
        };
        validationPassed?: boolean;
        validationIssues?: {
            type: string;
            description: string;
            severity: string;
        }[];
        signalId?: import("convex/values").GenericId<"signals">;
        maxRetries?: number;
        costUsd?: number;
        createdAt: number;
        status: "queued" | "completed" | "failed" | "cancelled" | "researching" | "validating" | "publishing";
        priority: number;
        entityId: string;
        retryCount: number;
        personas: string[];
    }, {
        entityId: import("convex/values").VString<string, "required">;
        entityType: import("convex/values").VString<string, "optional">;
        entityName: import("convex/values").VString<string, "optional">;
        personas: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        primaryPersona: import("convex/values").VString<string, "optional">;
        priority: import("convex/values").VFloat64<number, "required">;
        priorityFactors: import("convex/values").VObject<{
            urgencyBoost?: number;
            stalenessBoost?: number;
            watchlistBoost?: number;
            trendingBoost?: number;
        }, {
            urgencyBoost: import("convex/values").VFloat64<number, "optional">;
            stalenessBoost: import("convex/values").VFloat64<number, "optional">;
            watchlistBoost: import("convex/values").VFloat64<number, "optional">;
            trendingBoost: import("convex/values").VFloat64<number, "optional">;
        }, "optional", "urgencyBoost" | "stalenessBoost" | "watchlistBoost" | "trendingBoost">;
        status: import("convex/values").VUnion<"queued" | "completed" | "failed" | "cancelled" | "researching" | "validating" | "publishing", [import("convex/values").VLiteral<"queued", "required">, import("convex/values").VLiteral<"researching", "required">, import("convex/values").VLiteral<"validating", "required">, import("convex/values").VLiteral<"publishing", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"cancelled", "required">], "required", never>;
        swarmId: import("convex/values").VString<string, "optional">;
        qualityScore: import("convex/values").VFloat64<number, "optional">;
        validationPassed: import("convex/values").VBoolean<boolean, "optional">;
        validationIssues: import("convex/values").VArray<{
            type: string;
            description: string;
            severity: string;
        }[], import("convex/values").VObject<{
            type: string;
            description: string;
            severity: string;
        }, {
            type: import("convex/values").VString<string, "required">;
            severity: import("convex/values").VString<string, "required">;
            description: import("convex/values").VString<string, "required">;
        }, "required", "type" | "description" | "severity">, "optional">;
        signalId: import("convex/values").VId<import("convex/values").GenericId<"signals">, "optional">;
        triggeredBy: import("convex/values").VUnion<"signal" | "decay" | "watchlist" | "enrichment" | "manual", [import("convex/values").VLiteral<"signal", "required">, import("convex/values").VLiteral<"decay", "required">, import("convex/values").VLiteral<"watchlist", "required">, import("convex/values").VLiteral<"enrichment", "required">, import("convex/values").VLiteral<"manual", "required">], "optional", never>;
        retryCount: import("convex/values").VFloat64<number, "required">;
        maxRetries: import("convex/values").VFloat64<number, "optional">;
        lastError: import("convex/values").VString<string, "optional">;
        tokensUsed: import("convex/values").VFloat64<number, "optional">;
        costUsd: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        startedAt: import("convex/values").VFloat64<number, "optional">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
        elapsedMs: import("convex/values").VFloat64<number, "optional">;
    }, "required", "createdAt" | "status" | "priority" | "lastError" | "startedAt" | "swarmId" | "tokensUsed" | "elapsedMs" | "entityId" | "qualityScore" | "retryCount" | "completedAt" | "entityName" | "entityType" | "triggeredBy" | "personas" | "primaryPersona" | "priorityFactors" | "validationPassed" | "validationIssues" | "signalId" | "maxRetries" | "costUsd" | "priorityFactors.urgencyBoost" | "priorityFactors.stalenessBoost" | "priorityFactors.watchlistBoost" | "priorityFactors.trendingBoost">, {
        by_status_priority: ["status", "priority", "_creationTime"];
        by_entity: ["entityId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_signal: ["signalId", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
        by_persona: ["primaryPersona", "status", "_creationTime"];
    }, {}, {}>;
    publishingTasks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        completedAt?: number;
        entityName?: string;
        deliveryResults?: {
            error?: string;
            retryCount?: number;
            messageId?: string;
            deliveredAt?: number;
            success: boolean;
            channel: string;
        }[];
        formattedAt?: number;
        createdAt: number;
        content: {
            summary: string;
            keyFacts: {
                confidence?: number;
                category?: string;
                label: string;
                value: string;
            }[];
            raw: string;
            persona: string;
            nextActions: string[];
        };
        status: "partial" | "pending" | "completed" | "failed" | "formatting" | "delivering";
        entityId: string;
        researchTaskId: import("convex/values").GenericId<"researchTasks">;
        channels: {
            urgency?: string;
            recipients?: string[];
            scheduledFor?: number;
            format: string;
            channel: string;
            enabled: boolean;
        }[];
    }, {
        researchTaskId: import("convex/values").VId<import("convex/values").GenericId<"researchTasks">, "required">;
        entityId: import("convex/values").VString<string, "required">;
        entityName: import("convex/values").VString<string, "optional">;
        content: import("convex/values").VObject<{
            summary: string;
            keyFacts: {
                confidence?: number;
                category?: string;
                label: string;
                value: string;
            }[];
            raw: string;
            persona: string;
            nextActions: string[];
        }, {
            raw: import("convex/values").VString<string, "required">;
            summary: import("convex/values").VString<string, "required">;
            keyFacts: import("convex/values").VArray<{
                confidence?: number;
                category?: string;
                label: string;
                value: string;
            }[], import("convex/values").VObject<{
                confidence?: number;
                category?: string;
                label: string;
                value: string;
            }, {
                label: import("convex/values").VString<string, "required">;
                value: import("convex/values").VString<string, "required">;
                category: import("convex/values").VString<string, "optional">;
                confidence: import("convex/values").VFloat64<number, "optional">;
            }, "required", "label" | "confidence" | "category" | "value">, "required">;
            nextActions: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            persona: import("convex/values").VString<string, "required">;
        }, "required", "summary" | "keyFacts" | "raw" | "persona" | "nextActions">;
        channels: import("convex/values").VArray<{
            urgency?: string;
            recipients?: string[];
            scheduledFor?: number;
            format: string;
            channel: string;
            enabled: boolean;
        }[], import("convex/values").VObject<{
            urgency?: string;
            recipients?: string[];
            scheduledFor?: number;
            format: string;
            channel: string;
            enabled: boolean;
        }, {
            channel: import("convex/values").VString<string, "required">;
            enabled: import("convex/values").VBoolean<boolean, "required">;
            format: import("convex/values").VString<string, "required">;
            urgency: import("convex/values").VString<string, "optional">;
            recipients: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
            scheduledFor: import("convex/values").VFloat64<number, "optional">;
        }, "required", "format" | "urgency" | "channel" | "enabled" | "recipients" | "scheduledFor">, "required">;
        status: import("convex/values").VUnion<"partial" | "pending" | "completed" | "failed" | "formatting" | "delivering", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"formatting", "required">, import("convex/values").VLiteral<"delivering", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"partial", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        deliveryResults: import("convex/values").VArray<{
            error?: string;
            retryCount?: number;
            messageId?: string;
            deliveredAt?: number;
            success: boolean;
            channel: string;
        }[], import("convex/values").VObject<{
            error?: string;
            retryCount?: number;
            messageId?: string;
            deliveredAt?: number;
            success: boolean;
            channel: string;
        }, {
            channel: import("convex/values").VString<string, "required">;
            success: import("convex/values").VBoolean<boolean, "required">;
            deliveredAt: import("convex/values").VFloat64<number, "optional">;
            messageId: import("convex/values").VString<string, "optional">;
            error: import("convex/values").VString<string, "optional">;
            retryCount: import("convex/values").VFloat64<number, "optional">;
        }, "required", "error" | "retryCount" | "messageId" | "success" | "channel" | "deliveredAt">, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        formattedAt: import("convex/values").VFloat64<number, "optional">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "createdAt" | "content" | "status" | "entityId" | "completedAt" | "entityName" | "researchTaskId" | "channels" | "deliveryResults" | "formattedAt" | "content.summary" | "content.keyFacts" | "content.raw" | "content.persona" | "content.nextActions">, {
        by_status: ["status", "_creationTime"];
        by_research_task: ["researchTaskId", "_creationTime"];
        by_entity: ["entityId", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
    }, {}, {}>;
    entityStates: import("convex/server").TableDefinition<import("convex/values").VObject<{
        aliases?: string[];
        researchHistory?: {
            qualityScore: number;
            taskId: import("convex/values").GenericId<"researchTasks">;
            completedAt: number;
            personas: string[];
        }[];
        updatedAt: number;
        createdAt: number;
        quality: {
            personaScores?: any;
            overallScore: number;
            contradictionCount: number;
            sourceCount: number;
            lastValidated: number;
        };
        entityId: string;
        entityType: string;
        freshness: {
            lastChecked?: number;
            decayHalfLifeDays?: number;
            staleDays: number;
            lastUpdated: number;
            decayScore: number;
        };
        completeness: {
            score: number;
            missingFields: string[];
            enrichmentOpportunities: string[];
            lastAssessed: number;
        };
        canonicalName: string;
        engagement: {
            lastViewed?: number;
            trendingScore?: number;
            viewCount: number;
            watchlistCount: number;
        };
    }, {
        entityId: import("convex/values").VString<string, "required">;
        canonicalName: import("convex/values").VString<string, "required">;
        aliases: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "optional">;
        entityType: import("convex/values").VString<string, "required">;
        freshness: import("convex/values").VObject<{
            lastChecked?: number;
            decayHalfLifeDays?: number;
            staleDays: number;
            lastUpdated: number;
            decayScore: number;
        }, {
            lastUpdated: import("convex/values").VFloat64<number, "required">;
            lastChecked: import("convex/values").VFloat64<number, "optional">;
            staleDays: import("convex/values").VFloat64<number, "required">;
            decayScore: import("convex/values").VFloat64<number, "required">;
            decayHalfLifeDays: import("convex/values").VFloat64<number, "optional">;
        }, "required", "staleDays" | "lastUpdated" | "lastChecked" | "decayScore" | "decayHalfLifeDays">;
        completeness: import("convex/values").VObject<{
            score: number;
            missingFields: string[];
            enrichmentOpportunities: string[];
            lastAssessed: number;
        }, {
            score: import("convex/values").VFloat64<number, "required">;
            missingFields: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            enrichmentOpportunities: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            lastAssessed: import("convex/values").VFloat64<number, "required">;
        }, "required", "score" | "missingFields" | "enrichmentOpportunities" | "lastAssessed">;
        quality: import("convex/values").VObject<{
            personaScores?: any;
            overallScore: number;
            contradictionCount: number;
            sourceCount: number;
            lastValidated: number;
        }, {
            overallScore: import("convex/values").VFloat64<number, "required">;
            personaScores: import("convex/values").VAny<any, "optional", string>;
            sourceCount: import("convex/values").VFloat64<number, "required">;
            contradictionCount: import("convex/values").VFloat64<number, "required">;
            lastValidated: import("convex/values").VFloat64<number, "required">;
        }, "required", "overallScore" | "contradictionCount" | "personaScores" | "sourceCount" | "lastValidated" | `personaScores.${string}`>;
        engagement: import("convex/values").VObject<{
            lastViewed?: number;
            trendingScore?: number;
            viewCount: number;
            watchlistCount: number;
        }, {
            viewCount: import("convex/values").VFloat64<number, "required">;
            watchlistCount: import("convex/values").VFloat64<number, "required">;
            lastViewed: import("convex/values").VFloat64<number, "optional">;
            trendingScore: import("convex/values").VFloat64<number, "optional">;
        }, "required", "viewCount" | "watchlistCount" | "lastViewed" | "trendingScore">;
        researchHistory: import("convex/values").VArray<{
            qualityScore: number;
            taskId: import("convex/values").GenericId<"researchTasks">;
            completedAt: number;
            personas: string[];
        }[], import("convex/values").VObject<{
            qualityScore: number;
            taskId: import("convex/values").GenericId<"researchTasks">;
            completedAt: number;
            personas: string[];
        }, {
            taskId: import("convex/values").VId<import("convex/values").GenericId<"researchTasks">, "required">;
            completedAt: import("convex/values").VFloat64<number, "required">;
            qualityScore: import("convex/values").VFloat64<number, "required">;
            personas: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        }, "required", "qualityScore" | "taskId" | "completedAt" | "personas">, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "updatedAt" | "createdAt" | "quality" | "entityId" | "entityType" | "freshness" | "completeness" | "canonicalName" | "aliases" | "engagement" | "researchHistory" | "quality.overallScore" | "quality.contradictionCount" | "quality.personaScores" | "quality.sourceCount" | "quality.lastValidated" | `quality.personaScores.${string}` | "freshness.staleDays" | "freshness.lastUpdated" | "freshness.lastChecked" | "freshness.decayScore" | "freshness.decayHalfLifeDays" | "completeness.score" | "completeness.missingFields" | "completeness.enrichmentOpportunities" | "completeness.lastAssessed" | "engagement.viewCount" | "engagement.watchlistCount" | "engagement.lastViewed" | "engagement.trendingScore">, {
        by_entity: ["entityId", "_creationTime"];
        by_decay: ["freshness.decayScore", "_creationTime"];
        by_completeness: ["completeness.score", "_creationTime"];
        by_quality: ["quality.overallScore", "_creationTime"];
        by_type: ["entityType", "_creationTime"];
        by_updated: ["updatedAt", "_creationTime"];
    }, {}, {}>;
    engagementEvents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        metadata?: {
            source?: string;
            clickTarget?: string;
            timeToOpen?: number;
            deviceType?: string;
        };
        contentType?: string;
        entityId?: string;
        publishingTaskId?: import("convex/values").GenericId<"publishingTasks">;
        userId: import("convex/values").GenericId<"users">;
        eventType: string;
        timestamp: number;
        channel: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        channel: import("convex/values").VString<string, "required">;
        eventType: import("convex/values").VString<string, "required">;
        entityId: import("convex/values").VString<string, "optional">;
        publishingTaskId: import("convex/values").VId<import("convex/values").GenericId<"publishingTasks">, "optional">;
        contentType: import("convex/values").VString<string, "optional">;
        metadata: import("convex/values").VObject<{
            source?: string;
            clickTarget?: string;
            timeToOpen?: number;
            deviceType?: string;
        }, {
            clickTarget: import("convex/values").VString<string, "optional">;
            timeToOpen: import("convex/values").VFloat64<number, "optional">;
            deviceType: import("convex/values").VString<string, "optional">;
            source: import("convex/values").VString<string, "optional">;
        }, "optional", "source" | "clickTarget" | "timeToOpen" | "deviceType">;
        timestamp: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "metadata" | "eventType" | "contentType" | "timestamp" | "entityId" | "channel" | "publishingTaskId" | "metadata.source" | "metadata.clickTarget" | "metadata.timeToOpen" | "metadata.deviceType">, {
        by_user_time: ["userId", "timestamp", "_creationTime"];
        by_channel: ["channel", "timestamp", "_creationTime"];
        by_entity: ["entityId", "timestamp", "_creationTime"];
        by_type: ["eventType", "timestamp", "_creationTime"];
    }, {}, {}>;
    contradictions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        resolution?: {
            resolvedBy?: string;
            mergedClaim?: string;
            reason: string;
            resolvedAt: number;
            winner: string;
        };
        detectedBy?: string;
        entityId: string;
        detectedAt: number;
        severity: "high" | "medium" | "low" | "critical";
        factA: {
            sourceUrl?: string;
            timestamp?: number;
            source: string;
            claim: string;
            confidence: number;
        };
        factB: {
            sourceUrl?: string;
            timestamp?: number;
            source: string;
            claim: string;
            confidence: number;
        };
        nature: "direct" | "temporal" | "numerical" | "semantic";
    }, {
        entityId: import("convex/values").VString<string, "required">;
        factA: import("convex/values").VObject<{
            sourceUrl?: string;
            timestamp?: number;
            source: string;
            claim: string;
            confidence: number;
        }, {
            claim: import("convex/values").VString<string, "required">;
            source: import("convex/values").VString<string, "required">;
            sourceUrl: import("convex/values").VString<string, "optional">;
            confidence: import("convex/values").VFloat64<number, "required">;
            timestamp: import("convex/values").VFloat64<number, "optional">;
        }, "required", "source" | "sourceUrl" | "claim" | "confidence" | "timestamp">;
        factB: import("convex/values").VObject<{
            sourceUrl?: string;
            timestamp?: number;
            source: string;
            claim: string;
            confidence: number;
        }, {
            claim: import("convex/values").VString<string, "required">;
            source: import("convex/values").VString<string, "required">;
            sourceUrl: import("convex/values").VString<string, "optional">;
            confidence: import("convex/values").VFloat64<number, "required">;
            timestamp: import("convex/values").VFloat64<number, "optional">;
        }, "required", "source" | "sourceUrl" | "claim" | "confidence" | "timestamp">;
        nature: import("convex/values").VUnion<"direct" | "temporal" | "numerical" | "semantic", [import("convex/values").VLiteral<"direct", "required">, import("convex/values").VLiteral<"temporal", "required">, import("convex/values").VLiteral<"numerical", "required">, import("convex/values").VLiteral<"semantic", "required">], "required", never>;
        severity: import("convex/values").VUnion<"high" | "medium" | "low" | "critical", [import("convex/values").VLiteral<"critical", "required">, import("convex/values").VLiteral<"high", "required">, import("convex/values").VLiteral<"medium", "required">, import("convex/values").VLiteral<"low", "required">], "required", never>;
        resolution: import("convex/values").VObject<{
            resolvedBy?: string;
            mergedClaim?: string;
            reason: string;
            resolvedAt: number;
            winner: string;
        }, {
            winner: import("convex/values").VString<string, "required">;
            reason: import("convex/values").VString<string, "required">;
            resolvedBy: import("convex/values").VString<string, "optional">;
            resolvedAt: import("convex/values").VFloat64<number, "required">;
            mergedClaim: import("convex/values").VString<string, "optional">;
        }, "optional", "reason" | "resolvedAt" | "winner" | "resolvedBy" | "mergedClaim">;
        detectedAt: import("convex/values").VFloat64<number, "required">;
        detectedBy: import("convex/values").VString<string, "optional">;
    }, "required", "entityId" | "detectedAt" | "severity" | "factA" | "factB" | "nature" | "resolution" | "detectedBy" | "factA.source" | "factA.sourceUrl" | "factA.claim" | "factA.confidence" | "factA.timestamp" | "factB.source" | "factB.sourceUrl" | "factB.claim" | "factB.confidence" | "factB.timestamp" | "resolution.reason" | "resolution.resolvedAt" | "resolution.winner" | "resolution.resolvedBy" | "resolution.mergedClaim">, {
        by_entity: ["entityId", "_creationTime"];
        by_unresolved: ["entityId", "resolution", "_creationTime"];
        by_severity: ["severity", "detectedAt", "_creationTime"];
        by_detected: ["detectedAt", "_creationTime"];
    }, {}, {}>;
    healthChecks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        throughput?: number;
        queueDepth?: number;
        oldestItemAge?: number;
        memoryUsage?: number;
        cpuUsage?: number;
        recentErrors?: {
            message: string;
            timestamp: number;
            count: number;
        }[];
        status: "down" | "healthy" | "degraded";
        component: string;
        latencyP50: number;
        latencyP99: number;
        errorRate: number;
        checkedAt: number;
        windowMinutes: number;
    }, {
        component: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"down" | "healthy" | "degraded", [import("convex/values").VLiteral<"healthy", "required">, import("convex/values").VLiteral<"degraded", "required">, import("convex/values").VLiteral<"down", "required">], "required", never>;
        latencyP50: import("convex/values").VFloat64<number, "required">;
        latencyP99: import("convex/values").VFloat64<number, "required">;
        errorRate: import("convex/values").VFloat64<number, "required">;
        throughput: import("convex/values").VFloat64<number, "optional">;
        queueDepth: import("convex/values").VFloat64<number, "optional">;
        oldestItemAge: import("convex/values").VFloat64<number, "optional">;
        memoryUsage: import("convex/values").VFloat64<number, "optional">;
        cpuUsage: import("convex/values").VFloat64<number, "optional">;
        recentErrors: import("convex/values").VArray<{
            message: string;
            timestamp: number;
            count: number;
        }[], import("convex/values").VObject<{
            message: string;
            timestamp: number;
            count: number;
        }, {
            timestamp: import("convex/values").VFloat64<number, "required">;
            message: import("convex/values").VString<string, "required">;
            count: import("convex/values").VFloat64<number, "required">;
        }, "required", "message" | "timestamp" | "count">, "optional">;
        checkedAt: import("convex/values").VFloat64<number, "required">;
        windowMinutes: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "component" | "latencyP50" | "latencyP99" | "errorRate" | "throughput" | "queueDepth" | "oldestItemAge" | "memoryUsage" | "cpuUsage" | "recentErrors" | "checkedAt" | "windowMinutes">, {
        by_component: ["component", "checkedAt", "_creationTime"];
        by_status: ["status", "checkedAt", "_creationTime"];
        by_checked: ["checkedAt", "_creationTime"];
    }, {}, {}>;
    healingActions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        errorMessage?: string;
        executedAt?: number;
        impactMetrics?: {
            postActionHealth?: string;
            recoveryTimeMs?: number;
            preActionHealth: string;
        };
        createdAt: number;
        status: "pending" | "failed" | "executing" | "success" | "skipped";
        action: string;
        reason: string;
        component: string;
        issue: string;
        automated: boolean;
    }, {
        component: import("convex/values").VString<string, "required">;
        issue: import("convex/values").VString<string, "required">;
        action: import("convex/values").VString<string, "required">;
        reason: import("convex/values").VString<string, "required">;
        automated: import("convex/values").VBoolean<boolean, "required">;
        status: import("convex/values").VUnion<"pending" | "failed" | "executing" | "success" | "skipped", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"executing", "required">, import("convex/values").VLiteral<"success", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"skipped", "required">], "required", never>;
        executedAt: import("convex/values").VFloat64<number, "optional">;
        errorMessage: import("convex/values").VString<string, "optional">;
        impactMetrics: import("convex/values").VObject<{
            postActionHealth?: string;
            recoveryTimeMs?: number;
            preActionHealth: string;
        }, {
            preActionHealth: import("convex/values").VString<string, "required">;
            postActionHealth: import("convex/values").VString<string, "optional">;
            recoveryTimeMs: import("convex/values").VFloat64<number, "optional">;
        }, "optional", "preActionHealth" | "postActionHealth" | "recoveryTimeMs">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "status" | "errorMessage" | "executedAt" | "action" | "reason" | "component" | "issue" | "automated" | "impactMetrics" | "impactMetrics.preActionHealth" | "impactMetrics.postActionHealth" | "impactMetrics.recoveryTimeMs">, {
        by_component: ["component", "createdAt", "_creationTime"];
        by_status: ["status", "createdAt", "_creationTime"];
        by_action: ["action", "createdAt", "_creationTime"];
    }, {}, {}>;
    personaBudgets: import("convex/server").TableDefinition<import("convex/values").VObject<{
        exhaustedAt?: number;
        updatedAt: number;
        tokensUsed: number;
        costUsd: number;
        personaId: string;
        period: string;
        periodStart: number;
        periodEnd: number;
        researchCount: number;
        publishCount: number;
        tokenLimit: number;
        costLimit: number;
        exhausted: boolean;
    }, {
        personaId: import("convex/values").VString<string, "required">;
        period: import("convex/values").VString<string, "required">;
        periodStart: import("convex/values").VFloat64<number, "required">;
        periodEnd: import("convex/values").VFloat64<number, "required">;
        tokensUsed: import("convex/values").VFloat64<number, "required">;
        costUsd: import("convex/values").VFloat64<number, "required">;
        researchCount: import("convex/values").VFloat64<number, "required">;
        publishCount: import("convex/values").VFloat64<number, "required">;
        tokenLimit: import("convex/values").VFloat64<number, "required">;
        costLimit: import("convex/values").VFloat64<number, "required">;
        exhausted: import("convex/values").VBoolean<boolean, "required">;
        exhaustedAt: import("convex/values").VFloat64<number, "optional">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "updatedAt" | "tokensUsed" | "costUsd" | "personaId" | "period" | "periodStart" | "periodEnd" | "researchCount" | "publishCount" | "tokenLimit" | "costLimit" | "exhausted" | "exhaustedAt">, {
        by_persona_period: ["personaId", "period", "periodStart", "_creationTime"];
        by_exhausted: ["exhausted", "periodEnd", "_creationTime"];
    }, {}, {}>;
    deliveryJobs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        lastError?: string;
        nextRetryAt?: number;
        deliveredAt?: number;
        publishingTaskId?: import("convex/values").GenericId<"publishingTasks">;
        recipient?: string;
        externalMessageId?: string;
        createdAt: number;
        status: "pending" | "failed" | "delivered" | "retrying" | "sending";
        payload: any;
        attempts: number;
        maxAttempts: number;
        channel: string;
    }, {
        channel: import("convex/values").VString<string, "required">;
        recipient: import("convex/values").VString<string, "optional">;
        payload: import("convex/values").VAny<any, "required", string>;
        status: import("convex/values").VUnion<"pending" | "failed" | "delivered" | "retrying" | "sending", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"sending", "required">, import("convex/values").VLiteral<"delivered", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"retrying", "required">], "required", never>;
        attempts: import("convex/values").VFloat64<number, "required">;
        maxAttempts: import("convex/values").VFloat64<number, "required">;
        lastError: import("convex/values").VString<string, "optional">;
        nextRetryAt: import("convex/values").VFloat64<number, "optional">;
        publishingTaskId: import("convex/values").VId<import("convex/values").GenericId<"publishingTasks">, "optional">;
        externalMessageId: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        deliveredAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "createdAt" | "status" | "lastError" | "payload" | `payload.${string}` | "attempts" | "maxAttempts" | "nextRetryAt" | "channel" | "deliveredAt" | "publishingTaskId" | "recipient" | "externalMessageId">, {
        by_status: ["status", "_creationTime"];
        by_retry: ["status", "nextRetryAt", "_creationTime"];
        by_channel: ["channel", "status", "_creationTime"];
        by_publishing_task: ["publishingTaskId", "_creationTime"];
    }, {}, {}>;
    freeModels: import("convex/server").TableDefinition<import("convex/values").VObject<{
        name: string;
        successCount: number;
        failureCount: number;
        isActive: boolean;
        reliabilityScore: number;
        rank: number;
        capabilities: {
            streaming: boolean;
            toolUse: boolean;
            structuredOutputs: boolean;
            vision: boolean;
        };
        openRouterId: string;
        contextLength: number;
        performanceScore: number;
        latencyAvgMs: number;
        lastEvaluated: number;
        evaluationCount: number;
    }, {
        openRouterId: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "required">;
        contextLength: import("convex/values").VFloat64<number, "required">;
        capabilities: import("convex/values").VObject<{
            streaming: boolean;
            toolUse: boolean;
            structuredOutputs: boolean;
            vision: boolean;
        }, {
            toolUse: import("convex/values").VBoolean<boolean, "required">;
            streaming: import("convex/values").VBoolean<boolean, "required">;
            structuredOutputs: import("convex/values").VBoolean<boolean, "required">;
            vision: import("convex/values").VBoolean<boolean, "required">;
        }, "required", "streaming" | "toolUse" | "structuredOutputs" | "vision">;
        performanceScore: import("convex/values").VFloat64<number, "required">;
        reliabilityScore: import("convex/values").VFloat64<number, "required">;
        latencyAvgMs: import("convex/values").VFloat64<number, "required">;
        lastEvaluated: import("convex/values").VFloat64<number, "required">;
        evaluationCount: import("convex/values").VFloat64<number, "required">;
        successCount: import("convex/values").VFloat64<number, "required">;
        failureCount: import("convex/values").VFloat64<number, "required">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        rank: import("convex/values").VFloat64<number, "required">;
    }, "required", "name" | "successCount" | "failureCount" | "isActive" | "reliabilityScore" | "rank" | "capabilities" | "openRouterId" | "contextLength" | "performanceScore" | "latencyAvgMs" | "lastEvaluated" | "evaluationCount" | "capabilities.streaming" | "capabilities.toolUse" | "capabilities.structuredOutputs" | "capabilities.vision">, {
        by_openRouterId: ["openRouterId", "_creationTime"];
        by_rank: ["rank", "_creationTime"];
        by_active_rank: ["isActive", "rank", "_creationTime"];
        by_performance: ["performanceScore", "_creationTime"];
    }, {}, {}>;
    freeModelEvaluations: import("convex/server").TableDefinition<import("convex/values").VObject<{
        error?: string;
        responseQuality?: number;
        toolCallSuccess?: boolean;
        timestamp: number;
        latencyMs: number;
        success: boolean;
        modelId: import("convex/values").GenericId<"freeModels">;
    }, {
        modelId: import("convex/values").VId<import("convex/values").GenericId<"freeModels">, "required">;
        success: import("convex/values").VBoolean<boolean, "required">;
        latencyMs: import("convex/values").VFloat64<number, "required">;
        responseQuality: import("convex/values").VFloat64<number, "optional">;
        toolCallSuccess: import("convex/values").VBoolean<boolean, "optional">;
        error: import("convex/values").VString<string, "optional">;
        timestamp: import("convex/values").VFloat64<number, "required">;
    }, "required", "error" | "timestamp" | "latencyMs" | "success" | "modelId" | "responseQuality" | "toolCallSuccess">, {
        by_model: ["modelId", "timestamp", "_creationTime"];
        by_timestamp: ["timestamp", "_creationTime"];
    }, {}, {}>;
    freeModelMeta: import("convex/server").TableDefinition<import("convex/values").VObject<{
        key: string;
        value: number;
    }, {
        key: import("convex/values").VString<string, "required">;
        value: import("convex/values").VFloat64<number, "required">;
    }, "required", "key" | "value">, {}, {}, {}>;
    autonomousModelUsage: import("convex/server").TableDefinition<import("convex/values").VObject<{
        error?: string;
        inputTokens?: number;
        outputTokens?: number;
        timestamp: number;
        taskType: string;
        latencyMs: number;
        success: boolean;
        cost: number;
        modelId: string;
    }, {
        modelId: import("convex/values").VString<string, "required">;
        taskType: import("convex/values").VString<string, "required">;
        success: import("convex/values").VBoolean<boolean, "required">;
        latencyMs: import("convex/values").VFloat64<number, "required">;
        inputTokens: import("convex/values").VFloat64<number, "optional">;
        outputTokens: import("convex/values").VFloat64<number, "optional">;
        cost: import("convex/values").VFloat64<number, "required">;
        error: import("convex/values").VString<string, "optional">;
        timestamp: import("convex/values").VFloat64<number, "required">;
    }, "required", "error" | "timestamp" | "inputTokens" | "outputTokens" | "taskType" | "latencyMs" | "success" | "cost" | "modelId">, {
        by_model: ["modelId", "timestamp", "_creationTime"];
        by_taskType: ["taskType", "timestamp", "_creationTime"];
        by_timestamp: ["timestamp", "_creationTime"];
        by_success: ["success", "timestamp", "_creationTime"];
    }, {}, {}>;
    users: import("convex/server").TableDefinition<import("convex/values").VObject<{
        name?: string | undefined;
        email?: string | undefined;
        phone?: string | undefined;
        image?: string | undefined;
        emailVerificationTime?: number | undefined;
        phoneVerificationTime?: number | undefined;
        isAnonymous?: boolean | undefined;
    }, {
        name: import("convex/values").VString<string | undefined, "optional">;
        image: import("convex/values").VString<string | undefined, "optional">;
        email: import("convex/values").VString<string | undefined, "optional">;
        emailVerificationTime: import("convex/values").VFloat64<number | undefined, "optional">;
        phone: import("convex/values").VString<string | undefined, "optional">;
        phoneVerificationTime: import("convex/values").VFloat64<number | undefined, "optional">;
        isAnonymous: import("convex/values").VBoolean<boolean | undefined, "optional">;
    }, "required", "name" | "email" | "phone" | "image" | "emailVerificationTime" | "phoneVerificationTime" | "isAnonymous">, {
        email: ["email", "_creationTime"];
        phone: ["phone", "_creationTime"];
    }, {}, {}>;
    authSessions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId: import("convex/values").GenericId<"users">;
        expirationTime: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        expirationTime: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "expirationTime">, {
        userId: ["userId", "_creationTime"];
    }, {}, {}>;
    authAccounts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        secret?: string | undefined;
        emailVerified?: string | undefined;
        phoneVerified?: string | undefined;
        userId: import("convex/values").GenericId<"users">;
        provider: string;
        providerAccountId: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        provider: import("convex/values").VString<string, "required">;
        providerAccountId: import("convex/values").VString<string, "required">;
        secret: import("convex/values").VString<string | undefined, "optional">;
        emailVerified: import("convex/values").VString<string | undefined, "optional">;
        phoneVerified: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "secret" | "userId" | "provider" | "providerAccountId" | "emailVerified" | "phoneVerified">, {
        userIdAndProvider: ["userId", "provider", "_creationTime"];
        providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
    }, {}, {}>;
    authRefreshTokens: import("convex/server").TableDefinition<import("convex/values").VObject<{
        firstUsedTime?: number | undefined;
        parentRefreshTokenId?: import("convex/values").GenericId<"authRefreshTokens"> | undefined;
        expirationTime: number;
        sessionId: import("convex/values").GenericId<"authSessions">;
    }, {
        sessionId: import("convex/values").VId<import("convex/values").GenericId<"authSessions">, "required">;
        expirationTime: import("convex/values").VFloat64<number, "required">;
        firstUsedTime: import("convex/values").VFloat64<number | undefined, "optional">;
        parentRefreshTokenId: import("convex/values").VId<import("convex/values").GenericId<"authRefreshTokens"> | undefined, "optional">;
    }, "required", "expirationTime" | "sessionId" | "firstUsedTime" | "parentRefreshTokenId">, {
        sessionId: ["sessionId", "_creationTime"];
        sessionIdAndParentRefreshTokenId: ["sessionId", "parentRefreshTokenId", "_creationTime"];
    }, {}, {}>;
    authVerificationCodes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        emailVerified?: string | undefined;
        phoneVerified?: string | undefined;
        verifier?: string | undefined;
        expirationTime: number;
        provider: string;
        accountId: import("convex/values").GenericId<"authAccounts">;
        code: string;
    }, {
        accountId: import("convex/values").VId<import("convex/values").GenericId<"authAccounts">, "required">;
        provider: import("convex/values").VString<string, "required">;
        code: import("convex/values").VString<string, "required">;
        expirationTime: import("convex/values").VFloat64<number, "required">;
        verifier: import("convex/values").VString<string | undefined, "optional">;
        emailVerified: import("convex/values").VString<string | undefined, "optional">;
        phoneVerified: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "expirationTime" | "provider" | "emailVerified" | "phoneVerified" | "accountId" | "code" | "verifier">, {
        accountId: ["accountId", "_creationTime"];
        code: ["code", "_creationTime"];
    }, {}, {}>;
    authVerifiers: import("convex/server").TableDefinition<import("convex/values").VObject<{
        sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
        signature?: string | undefined;
    }, {
        sessionId: import("convex/values").VId<import("convex/values").GenericId<"authSessions"> | undefined, "optional">;
        signature: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "sessionId" | "signature">, {
        signature: ["signature", "_creationTime"];
    }, {}, {}>;
    authRateLimits: import("convex/server").TableDefinition<import("convex/values").VObject<{
        identifier: string;
        lastAttemptTime: number;
        attemptsLeft: number;
    }, {
        identifier: import("convex/values").VString<string, "required">;
        lastAttemptTime: import("convex/values").VFloat64<number, "required">;
        attemptsLeft: import("convex/values").VFloat64<number, "required">;
    }, "required", "identifier" | "lastAttemptTime" | "attemptsLeft">, {
        identifier: ["identifier", "_creationTime"];
    }, {}, {}>;
}, true>;
export default _default;
