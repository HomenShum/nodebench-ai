/**
 * Providers barrel export — Ambient Intelligence Layer.
 *
 * Re-exports all memory provider interfaces, implementations, and the registry.
 */

// Interface + types
export type {
  MemoryProvider,
  ProviderType,
  ProviderConfig,
  MemoryInput,
  Memory,
  MemoryRelation,
  RelationType,
  StoredRelation,
  RecallOptions,
  ListOptions,
  UserProfile,
  SyncResult,
} from "./memoryProvider.js";

// Local SQLite implementation
export { LocalMemoryProvider } from "./localMemoryProvider.js";

// Supermemory cloud implementation
export {
  SupermemoryProvider,
  SupermemoryError,
  SupermemoryAuthError,
  SupermemoryRateLimitError,
} from "./supermemoryProvider.js";

// Singleton registry
export { MemoryProviderRegistry } from "./memoryProviderRegistry.js";
