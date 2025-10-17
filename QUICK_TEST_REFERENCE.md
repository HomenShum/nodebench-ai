# Quick Test Reference

## Run All Tests
```bash
# Unix/Linux/Mac
./scripts/run-tests.sh

# Windows
scripts/run-tests.bat
```

## Run Specific Tests

### Unit Tests
```bash
npx vitest run --include "**/__tests__/mediaExtractor.test.ts"
```

### Component Tests
```bash
# VideoCard
npx vitest run --include "**/__tests__/VideoCard.test.tsx"

# SourceCard
npx vitest run --include "**/__tests__/SourceCard.test.tsx"

# ProfileCard
npx vitest run --include "**/__tests__/ProfileCard.test.tsx"
```

### Integration Tests
```bash
# Message Rendering
npx vitest run --include "**/__tests__/message-rendering.test.tsx"

# Presentation Layer
npx vitest run --include "**/__tests__/presentation-layer.test.tsx"
```

### E2E Tests
```bash
# Coordinator Agent
npx vitest run --include "convex/agents/__tests__/e2e-coordinator-agent.test.ts"

# Streaming
npx vitest run --include "convex/agents/__tests__/e2e-streaming.test.ts"

# Agent UI Integration
npx vitest run --include "src/components/FastAgentPanel/__tests__/e2e-agent-ui.test.tsx"
```

## Watch Mode
```bash
npx vitest --watch
```

## Coverage Report
```bash
npx vitest run --coverage
```

## Environment Setup
```bash
# Set deployment URL
export CONVEX_DEPLOYMENT_URL=http://localhost:3210

# Or for production
export CONVEX_DEPLOYMENT_URL=https://your-deployment.convex.cloud
```

## Test Files Location

```
src/components/FastAgentPanel/__tests__/
├── mediaExtractor.test.ts              # Unit tests
├── VideoCard.test.tsx                  # Component tests
├── SourceCard.test.tsx                 # Component tests
├── ProfileCard.test.tsx                # Component tests
├── message-rendering.test.tsx          # Integration tests
├── presentation-layer.test.tsx         # Integration tests
└── e2e-agent-ui.test.tsx              # E2E tests

convex/agents/__tests__/
├── e2e-coordinator-agent.test.ts       # E2E tests
└── e2e-streaming.test.ts               # E2E tests
```

## Test Statistics

| Category | Files | Tests | Lines |
|----------|-------|-------|-------|
| Unit | 1 | 15 | 150 |
| Component | 3 | 45 | 400 |
| Integration | 2 | 20 | 300 |
| E2E | 3 | 50+ | 750 |
| **Total** | **9** | **130+** | **1,600** |

## Expected Execution Times

| Category | Time |
|----------|------|
| Unit Tests | < 1s |
| Component Tests | 2-5s |
| Integration Tests | 5-10s |
| E2E Tests | 30-60s |
| **Total** | **2-3 min** |

## Coverage Goals

- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%

## Common Issues

### E2E Tests Failing
```bash
# Check deployment URL
echo $CONVEX_DEPLOYMENT_URL

# Verify Convex is running
npx convex dev

# Check API keys
echo $OPENAI_API_KEY
```

### Component Tests Failing
```bash
# Reinstall dependencies
npm install

# Clear cache
npx vitest --clearCache

# Run with verbose output
npx vitest run --reporter=verbose
```

### Media Extraction Tests Failing
```bash
# Check test data format
# Verify JSON in HTML comments is valid
# Ensure media types match expected structure
```

## Debugging

### Run Single Test
```bash
npx vitest run --include "**/__tests__/mediaExtractor.test.ts" --reporter=verbose
```

### Run with Debug Output
```bash
DEBUG=* npx vitest run
```

### Watch Mode with UI
```bash
npx vitest --ui
```

## CI/CD Integration

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:all
```

## Documentation

- **Full Guide**: `TEST_SUITE_GUIDE.md`
- **Implementation**: `COMPREHENSIVE_TEST_IMPLEMENTATION.md`
- **This Reference**: `QUICK_TEST_REFERENCE.md`

## Key Features Tested

✓ Media extraction from tool results
✓ VideoCarousel component
✓ SourceGrid component
✓ ProfileGrid component
✓ Show More/Less functionality
✓ Citation system
✓ Coordinator agent delegation
✓ Streaming responses
✓ Multi-agent coordination
✓ Error handling
✓ Concurrent requests
✓ Thread management

## Next Steps

1. Run all tests: `./scripts/run-tests.sh`
2. Review coverage: `npx vitest run --coverage`
3. Fix any failures
4. Integrate into CI/CD
5. Add more tests as needed

## Support

For detailed information, see:
- `TEST_SUITE_GUIDE.md` - Comprehensive guide
- `COMPREHENSIVE_TEST_IMPLEMENTATION.md` - Implementation details
- Test files themselves - Inline documentation

