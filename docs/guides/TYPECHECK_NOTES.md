# TypeScript Type Checking Status

## Current Status

TypeScript type checking is **enabled** for the Convex backend.

## The Problem

The Convex generated types can trigger `TS2589: Type instantiation is excessively deep` in large schema/projects. When that happens, TypeScript may fail to typecheck the backend at all.

- Database queries return `{}` instead of proper document types (e.g., `Doc<"userPreferences">`)
- This causes 1000+ type errors across the codebase
- Example error: `Property 'agentsPrefs' does not exist on type '{}'`

## What Was Tried

1. **Adjusted shims** - Added lightweight type shims under `convex/_type_shims/` to avoid deep generic instantiation in generated Convex types.
2. **Kept typecheck on** - Ensured `convex dev` / `convex deploy` run without disabling typechecking.

## Root Cause Hypothesis

The root issue is TypeScript compiler complexity (deep schema + generated types), not runtime correctness.

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

## Deployment Instructions

Use the provided npm script:

```bash
npm run deploy:convex
```

This runs `convex deploy` with typechecking enabled.

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
- `package.json` - Contains `dev:backend` and `deploy:convex` scripts

---

**Last Updated**: 2026-01-19
**Status**: Typecheck enabled (with shims)
