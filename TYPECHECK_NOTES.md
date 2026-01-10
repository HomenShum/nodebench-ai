# TypeScript Type Checking Status

## Current Status

TypeScript strict type checking is **disabled** in the Convex backend (`convex dev --typecheck=disable`) due to unresolved schema type resolution issues.

## The Problem

The Convex type generation produces valid types in `_generated/dataModel.d.ts` and `_generated/server.d.ts`, but TypeScript fails to properly resolve document types from database queries. Specifically:

- Database queries return `{}` instead of proper document types (e.g., `Doc<"userPreferences">`)
- This causes 1000+ type errors across the codebase
- Example error: `Property 'agentsPrefs' does not exist on type '{}'`

## What Was Tried

1. **Removed type shim overrides** - The `_type_shims/convex-server.d.ts` was overriding Convex types with `unknown`. Removed the paths override in `convex/tsconfig.json`.

2. **Re-enabled strict mode** - Changed `"strict": false` back to `"strict": true` in `convex/tsconfig.json`.

3. **Updated Convex** - Upgraded from 1.31.2 to 1.31.3.

4. **Regenerated types** - Ran `npx convex dev --once --typecheck=disable --codegen=enable` to regenerate schema types.

None of these resolved the core issue of database query return types being `{}`.

## Root Cause Hypothesis

The issue appears to be related to how TypeScript resolves the `DataModel` type through the import chain:

```typescript
// _generated/dataModel.d.ts
import schema from "../schema.js";  // <-- Imports .js but file is .ts
export type DataModel = DataModelFromSchemaDefinition<typeof schema>;

// _generated/server.d.ts
import type { DataModel } from "./dataModel.js";
export declare const query: QueryBuilder<DataModel, "public">;
```

TypeScript's module resolution may not be properly connecting the schema definition to the generated types, causing queries to lose their type information.

## Impact

- **Development**: Code works at runtime; IntelliSense and compile-time type checking are degraded
- **Build**: Frontend builds successfully; Convex deployment works
- **Safety**: No type safety for database operations; rely on runtime validation

## Next Steps (Future Work)

To properly fix this, investigate:

1. **Module resolution** - Check if TypeScript's `moduleResolution: "Bundler"` is compatible with Convex's type generation
2. **Schema export** - Verify `schema.ts` default export matches what Convex expects
3. **Convex version compatibility** - Test with latest Convex version and check if this is a known issue
4. **Type generation process** - Deep dive into how `DataModelFromSchemaDefinition` resolves types
5. **Alternative approach** - Consider using Convex's newer type generation methods if this is legacy setup

## Workaround

For critical type safety in specific files, consider:
- Manual type assertions: `const doc = await ctx.db.query(...).first() as Doc<"tableName"> | null`
- Inline type definitions for frequently-used document shapes
- Runtime validation using Zod or similar libraries

## Related Files

- `convex/tsconfig.json` - TypeScript configuration
- `convex/_generated/dataModel.d.ts` - Generated type definitions
- `convex/_generated/server.d.ts` - Generated Convex server types
- `convex/schema.ts` - Database schema definition
- `package.json` - Contains `dev:backend` script with `--typecheck=disable`

---

**Last Updated**: 2026-01-10
**Status**: Documented, awaiting deeper investigation
