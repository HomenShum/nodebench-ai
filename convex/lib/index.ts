/**
 * Barrel export for convex/lib utilities
 * 
 * This file re-exports all utilities from the lib folder for easier imports.
 */

// Agent optimization utilities
export * as parallelDelegation from "./parallelDelegation";
export * as agentCache from "./agentCache";
export * as streamingDelegation from "./streamingDelegation";
export * as predictivePrefetch from "./predictivePrefetch";

// Artifact utilities
export * from "./artifactModels";
export * from "./artifactValidators";
export * from "./artifactQueries";
export * from "./artifactPersistence";
export * from "./withArtifactPersistence";

// Memory utilities
export * from "./memoryLimits";
export * from "./memoryQuality";

// Document utilities
export * from "./dossierHelpers";
export * from "./dossierGenerator";
export * from "./actionItemsGenerator";

// Conversion utilities
export * from "./markdown";
export * from "./markdownToTipTap";

// Other utilities
export * from "./crypto";
export * from "./entityResolution";
export * from "./factValidation";
export * from "./featureFlags";
export * from "./mcpTransport";

