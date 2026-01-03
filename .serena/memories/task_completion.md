# Task Completion Checklist

## Before Committing Code

1. **TypeScript Check**
   ```bash
   npx tsc -p convex -noEmit --pretty false
   npx tsc -p . -noEmit --pretty false
   ```

2. **Convex Sync** (if schema/functions changed)
   ```bash
   npx convex dev --once
   ```

3. **Verify Build**
   ```bash
   npm run build
   ```

4. **Run Tests** (if tests exist for changed code)
   ```bash
   npm run test:run
   ```

## For Convex Changes

- Ensure all new tables are in `convex/schema.ts`
- Use proper indexes for query patterns
- Add to `convex/convex.config.ts` if adding new components

## For New AI Tools

- Register in `convex/tools/meta/toolRegistry.ts`
- Add to appropriate agent's tool list
- Include in `withArtifactPersistence.ts` if produces artifacts
- Document in agent's system prompt

## For Workflow Changes

- Test with `npx convex run` before deploying
- Check for timeout limits (10 min for actions)
- Use workpool for rate-limited external APIs
