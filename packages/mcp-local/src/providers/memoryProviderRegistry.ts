/**
 * MemoryProviderRegistry — Singleton registry for MemoryProvider instances.
 *
 * Auto-registers LocalMemoryProvider as the default provider on first access.
 * External providers (Supermemory, Zep, Graphiti) can be registered at runtime.
 *
 * Usage:
 *   const registry = MemoryProviderRegistry.getInstance();
 *   const local = registry.getDefault();
 *   await local.connect({ userId: "user-123" });
 *   const id = await local.store({ content: "Meeting notes..." });
 */

import type { MemoryProvider } from "./memoryProvider.js";
import { LocalMemoryProvider } from "./localMemoryProvider.js";

// ═══════════════════════════════════════════════════════════════════════════
// Registry
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_PROVIDER_NAME = "local-sqlite";

export class MemoryProviderRegistry {
  private static instance: MemoryProviderRegistry | null = null;

  private providers = new Map<string, MemoryProvider>();
  private defaultName: string = DEFAULT_PROVIDER_NAME;

  private constructor() {
    // Auto-register LocalMemoryProvider as the default
    const local = new LocalMemoryProvider();
    this.providers.set(local.name, local);
  }

  // ── Singleton access ───────────────────────────────────────────────────

  static getInstance(): MemoryProviderRegistry {
    if (!MemoryProviderRegistry.instance) {
      MemoryProviderRegistry.instance = new MemoryProviderRegistry();
    }
    return MemoryProviderRegistry.instance;
  }

  /** Reset the singleton (for tests only) */
  static resetInstance(): void {
    MemoryProviderRegistry.instance = null;
  }

  // ── Registration ───────────────────────────────────────────────────────

  /**
   * Register a provider. Overwrites if a provider with the same name
   * already exists. Returns the registry for chaining.
   */
  register(provider: MemoryProvider): MemoryProviderRegistry {
    this.providers.set(provider.name, provider);
    return this;
  }

  /**
   * Unregister a provider by name. Cannot unregister the default provider
   * unless another default is set first.
   */
  unregister(name: string): boolean {
    if (name === this.defaultName && this.providers.size > 1) {
      throw new Error(
        `Cannot unregister default provider "${name}" — set a new default first`,
      );
    }
    return this.providers.delete(name);
  }

  /**
   * Set which registered provider is the default.
   */
  setDefault(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider "${name}" is not registered`);
    }
    this.defaultName = name;
  }

  // ── Retrieval ──────────────────────────────────────────────────────────

  /**
   * Get a provider by name. Returns undefined if not found.
   */
  get(name: string): MemoryProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get the default provider (LocalMemoryProvider unless changed).
   */
  getDefault(): MemoryProvider {
    const provider = this.providers.get(this.defaultName);
    if (!provider) {
      throw new Error(
        `Default provider "${this.defaultName}" not found — registry may be corrupted`,
      );
    }
    return provider;
  }

  /**
   * List all registered providers with their connection status.
   */
  listProviders(): Array<{
    name: string;
    type: string;
    isDefault: boolean;
    isConnected: boolean;
  }> {
    return [...this.providers.values()].map((p) => ({
      name: p.name,
      type: p.type,
      isDefault: p.name === this.defaultName,
      isConnected: p.isConnected(),
    }));
  }

  /**
   * Get the count of registered providers.
   */
  get size(): number {
    return this.providers.size;
  }

  /**
   * Check if a provider is registered.
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }
}
