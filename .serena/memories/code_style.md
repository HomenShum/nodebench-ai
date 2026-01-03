# Code Style and Conventions

## TypeScript Conventions
- Strict TypeScript with explicit types
- Zod schemas for runtime validation (especially in Convex actions/tools)
- ES modules (`"type": "module"` in package.json)
- Use `v.` validators from Convex for schema definitions

## Convex Patterns
- Actions use `"use node"` directive for Node.js runtime
- Queries/mutations are reactive and deterministic
- Use `ctx.runAction`, `ctx.runMutation`, `ctx.runQuery` for internal calls
- Background jobs via `ctx.scheduler.runAfter`
- Durable workflows via `@convex-dev/workflow`

## File Organization
- Domain-driven structure in `convex/domains/`
- Tools in `convex/tools/` organized by category
- Schemas split across `convex/schema/` and `convex/schema.ts`
- React components in `src/features/` and `src/components/`

## Naming Conventions
- camelCase for functions and variables
- PascalCase for types, interfaces, React components
- kebab-case for file names
- Convex table names are camelCase plural (e.g., `feedItems`, `entityContexts`)

## AI Tool Pattern
```typescript
export const toolName = createTool({
  name: "toolName",
  description: "...",
  parameters: z.object({ ... }),
  execute: async (args, options) => { ... }
});
```

## Error Handling
- Use try/catch with detailed logging
- Track API usage via `apiUsage` table
- Cache results where appropriate with TTL
