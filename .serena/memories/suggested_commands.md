# Development Commands

## Primary Development
```bash
npm run dev              # Start all services (frontend + backend + voice)
npm run dev:frontend     # Vite frontend only
npm run dev:backend      # Convex backend only
npm run dev:voice        # Voice server only
```

## Build & Deployment
```bash
npm run build            # Build Vite frontend
npx convex deploy        # Deploy Convex backend to production
npm run build:voice      # Build voice server
npm run start:voice      # Start voice server (production)
```

## Linting & Type Checking
```bash
npm run lint             # Full lint: TypeScript check + Convex codegen + Vite build
npx tsc -p convex -noEmit --pretty false  # Check Convex TypeScript
npx tsc -p . -noEmit --pretty false       # Check frontend TypeScript
npm run lint:eslint      # ESLint only
npm run lint:eslint:fix  # ESLint with auto-fix
```

## Testing
```bash
npm test                 # Vitest in watch mode
npm run test:run         # Vitest single run
npx playwright test      # Playwright E2E tests
npm run storybook        # Start Storybook
```

## Evaluation (AI Agent Testing)
```bash
npm run eval             # Run evaluation script
npm run eval:quick       # Quick evaluation via Convex
npm run eval:all         # Comprehensive tests
npm run eval:stats       # Get test statistics
```

## Convex Operations
```bash
npx convex run <path>:<function>          # Run a Convex function
npx convex run feed:ingestAll             # Ingest all RSS feeds
npx convex run workflows/dailyMorningBrief:runDailyMorningBrief  # Generate brief
npx convex dev --once                     # One-time sync
```

## Windows System Commands
```powershell
dir                      # List directory (like ls)
type <file>              # Read file (like cat)
findstr <pattern> <file> # Search in file (like grep)
```
