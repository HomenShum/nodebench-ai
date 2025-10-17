# FastAgentPanel Test Suite Guide

## Overview

Comprehensive test suite for the FastAgentPanel UX enhancements, including:
- **Unit Tests**: Media extraction, utility functions
- **Component Tests**: VideoCard, SourceCard, ProfileCard
- **Integration Tests**: Message rendering, presentation layer
- **E2E Tests**: Agent chat with real API calls, streaming, UI integration

## Test Structure

```
src/components/FastAgentPanel/__tests__/
├── mediaExtractor.test.ts              # Unit tests for media extraction
├── VideoCard.test.tsx                  # Component tests for video carousel
├── SourceCard.test.tsx                 # Component tests for source grid
├── ProfileCard.test.tsx                # Component tests for profile grid
├── message-rendering.test.tsx          # Integration tests for message display
├── presentation-layer.test.tsx         # Integration tests for UI components
└── e2e-agent-ui.test.tsx              # E2E tests for agent chat UI

convex/agents/__tests__/
├── e2e-coordinator-agent.test.ts       # E2E tests for coordinator agent
└── e2e-streaming.test.ts               # E2E tests for streaming responses
```

## Running Tests

### All Tests
```bash
# Unix/Linux/Mac
./scripts/run-tests.sh

# Windows
scripts/run-tests.bat
```

### Specific Test Suite
```bash
# Unit tests only
npx vitest run --include "**/__tests__/mediaExtractor.test.ts"

# Component tests
npx vitest run --include "**/__tests__/VideoCard.test.tsx"
npx vitest run --include "**/__tests__/SourceCard.test.tsx"
npx vitest run --include "**/__tests__/ProfileCard.test.tsx"

# Integration tests
npx vitest run --include "**/__tests__/message-rendering.test.tsx"
npx vitest run --include "**/__tests__/presentation-layer.test.tsx"

# E2E tests
npx vitest run --include "convex/agents/__tests__/e2e-coordinator-agent.test.ts"
npx vitest run --include "convex/agents/__tests__/e2e-streaming.test.ts"
npx vitest run --include "src/components/FastAgentPanel/__tests__/e2e-agent-ui.test.tsx"
```

### Watch Mode
```bash
npx vitest --watch
```

### Coverage Report
```bash
npx vitest run --coverage
```

## Test Categories

### 1. Unit Tests: Media Extraction

**File**: `mediaExtractor.test.ts`

Tests the `extractMediaFromText()` function:
- ✓ Extracts YouTube videos from HTML comment markers
- ✓ Extracts web sources from HTML comment markers
- ✓ Extracts profiles from HTML comment markers
- ✓ Extracts images from markdown syntax
- ✓ Extracts multiple media types together
- ✓ Removes media markers from text
- ✓ Detects if media exists

**Key Functions Tested**:
- `extractMediaFromText(text)` - Parses tool results and extracts media
- `removeMediaMarkersFromText(text)` - Cleans up gallery markers
- `hasMedia(media)` - Checks if media object has content

### 2. Component Tests: VideoCard

**File**: `VideoCard.test.tsx`

Tests the `VideoCarousel` component:
- ✓ Renders nothing if no videos
- ✓ Displays initial videos (up to 6)
- ✓ Shows "Show More" button when videos exceed 6
- ✓ Shows all videos when "Show More" is clicked
- ✓ Shows "Show Less" button after expanding
- ✓ Hides extra videos when "Show Less" is clicked
- ✓ Displays correct video count in header

**Key Props**:
- `videos: YouTubeVideo[]` - Array of video objects
- `title?: string` - Optional carousel title

### 3. Component Tests: SourceCard

**File**: `SourceCard.test.tsx`

Tests the `SourceCard` and `SourceGrid` components:
- ✓ Renders source card with title, domain, description
- ✓ Has correct href and opens in new tab
- ✓ Displays citation number if provided
- ✓ Has citation ID for smooth scrolling
- ✓ Shows "Show More" button for large lists
- ✓ Expands/collapses with button clicks
- ✓ Displays citation numbers when enabled

**Key Props**:
- `source: BaseSource` - Source object with title, url, domain, description
- `citationNumber?: number` - Optional citation number
- `showCitations?: boolean` - Show/hide citation badges

### 4. Component Tests: ProfileCard

**File**: `ProfileCard.test.tsx`

Tests the `ProfileCard` and `ProfileGrid` components:
- ✓ Renders profile with name, profession, organization, location
- ✓ Displays description and additional info
- ✓ Shows "View Profile" link if URL provided
- ✓ Shows "More" button if additional info provided
- ✓ Expands to show additional info
- ✓ Displays citation numbers when enabled
- ✓ Shows "Show More" button for large lists

**Key Props**:
- `profile: PersonProfile` - Profile object with name, profession, etc.
- `citationNumber?: number` - Optional citation number
- `showCitations?: boolean` - Show/hide citation badges

### 5. Integration Tests: Message Rendering

**File**: `message-rendering.test.tsx`

Tests message display and filtering:
- ✓ Filters out agent-generated sub-query messages
- ✓ Displays only actual user input messages
- ✓ Renders assistant responses correctly
- ✓ Combines multiple tool results in single message
- ✓ Maintains message order

### 6. Integration Tests: Presentation Layer

**File**: `presentation-layer.test.tsx`

Tests the complete presentation layer:
- ✓ RichMediaSection renders all media types
- ✓ UIMessageBubble displays media correctly
- ✓ Media extraction works with tool results
- ✓ Citations are properly linked
- ✓ Show More functionality works across all components

### 7. E2E Tests: Coordinator Agent

**File**: `e2e-coordinator-agent.test.ts`

Tests the coordinator agent with real API calls:
- ✓ Delegates web search and returns structured sources
- ✓ Extracts web sources from tool results
- ✓ Delegates media search and returns YouTube videos
- ✓ Extracts YouTube videos from tool results
- ✓ Delegates to multiple agents for complex queries
- ✓ Combines results from multiple agents
- ✓ Formats response with proper markdown structure
- ✓ Includes human-readable text alongside gallery data
- ✓ Handles empty/invalid queries gracefully
- ✓ Correctly tracks which agents were used

**Requirements**:
- `CONVEX_DEPLOYMENT_URL` environment variable set
- Convex backend running
- API keys configured (OpenAI, YouTube, etc.)

### 8. E2E Tests: Streaming

**File**: `e2e-streaming.test.ts`

Tests streaming agent responses:
- ✓ Initiates async streaming without blocking
- ✓ Saves user message before streaming
- ✓ Uses coordinator agent by default
- ✓ Supports legacy single agent mode
- ✓ Streams message with proper formatting
- ✓ Includes tool results in streamed response
- ✓ Handles streaming errors gracefully
- ✓ Supports different model selections
- ✓ Creates/reuses threads correctly
- ✓ Handles multiple concurrent streaming requests

### 9. E2E Tests: Agent UI Integration

**File**: `e2e-agent-ui.test.tsx`

Tests the complete agent chat UI:
- ✓ Renders FastAgentPanel component
- ✓ Displays input area and message stream
- ✓ Accepts user input and sends messages
- ✓ Displays user messages in chat
- ✓ Displays agent responses
- ✓ Shows typing indicator while streaming
- ✓ Renders video cards from agent response
- ✓ Renders source cards from agent response
- ✓ Renders profile cards from agent response
- ✓ Shows "Show More" buttons for media
- ✓ Expands media lists when clicked
- ✓ Displays citation numbers on cards
- ✓ Scrolls to source when citation clicked
- ✓ Creates new threads
- ✓ Maintains conversation history

## Environment Setup

### Required Environment Variables

```bash
# Convex deployment URL (for E2E tests)
export CONVEX_DEPLOYMENT_URL=http://localhost:3210

# Or for production
export CONVEX_DEPLOYMENT_URL=https://your-deployment.convex.cloud
```

### Dependencies

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
npm install --save-dev @vitejs/plugin-react
npm install convex/browser  # For E2E tests
```

## Test Execution Flow

1. **Setup Phase**
   - Initialize Convex client
   - Setup DOM environment
   - Mock browser APIs

2. **Test Execution**
   - Run unit tests (fast, no API calls)
   - Run component tests (DOM rendering)
   - Run integration tests (component interaction)
   - Run E2E tests (real API calls)

3. **Cleanup Phase**
   - Close Convex client
   - Cleanup DOM
   - Generate coverage report

## Debugging Tests

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

### GitHub Actions Example
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

## Troubleshooting

### E2E Tests Failing
- Ensure `CONVEX_DEPLOYMENT_URL` is set correctly
- Check that Convex backend is running
- Verify API keys are configured
- Check network connectivity

### Component Tests Failing
- Ensure `@testing-library/react` is installed
- Check that DOM environment is properly setup
- Verify component props are correct

### Media Extraction Tests Failing
- Check that HTML comment markers are properly formatted
- Verify JSON in markers is valid
- Ensure media types match expected structure

## Performance Benchmarks

Expected test execution times:
- Unit tests: < 1 second
- Component tests: 2-5 seconds
- Integration tests: 5-10 seconds
- E2E tests: 30-60 seconds (depends on API response times)

**Total**: ~2-3 minutes for full test suite

## Coverage Goals

Target coverage:
- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%

## Next Steps

1. Run the full test suite: `./scripts/run-tests.sh`
2. Fix any failing tests
3. Review coverage report
4. Integrate into CI/CD pipeline
5. Add more tests as features are added

