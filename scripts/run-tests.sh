#!/bin/bash

# scripts/run-tests.sh
# Comprehensive test runner for unit, integration, and E2E tests

set -e

echo "=========================================="
echo "FastAgentPanel Test Suite"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if CONVEX_DEPLOYMENT_URL is set
if [ -z "$CONVEX_DEPLOYMENT_URL" ]; then
  echo -e "${YELLOW}Warning: CONVEX_DEPLOYMENT_URL not set${NC}"
  echo "Using default: http://localhost:3210"
  export CONVEX_DEPLOYMENT_URL="http://localhost:3210"
fi

# Function to run tests
run_tests() {
  local test_type=$1
  local pattern=$2
  
  echo -e "${YELLOW}Running $test_type tests...${NC}"
  echo "Pattern: $pattern"
  echo ""
  
  if npx vitest run --include "$pattern" --reporter=verbose; then
    echo -e "${GREEN}✓ $test_type tests passed${NC}"
    return 0
  else
    echo -e "${RED}✗ $test_type tests failed${NC}"
    return 1
  fi
}

# Track test results
FAILED_TESTS=()

# 1. Unit Tests - Media Extraction
echo -e "${YELLOW}=== UNIT TESTS ===${NC}"
echo ""

if ! run_tests "Media Extractor" "**/__tests__/mediaExtractor.test.ts"; then
  FAILED_TESTS+=("Media Extractor")
fi
echo ""

# 2. Component Tests - UI Components
echo -e "${YELLOW}=== COMPONENT TESTS ===${NC}"
echo ""

if ! run_tests "VideoCard" "**/__tests__/VideoCard.test.tsx"; then
  FAILED_TESTS+=("VideoCard")
fi
echo ""

if ! run_tests "SourceCard" "**/__tests__/SourceCard.test.tsx"; then
  FAILED_TESTS+=("SourceCard")
fi
echo ""

if ! run_tests "ProfileCard" "**/__tests__/ProfileCard.test.tsx"; then
  FAILED_TESTS+=("ProfileCard")
fi
echo ""

# 3. Integration Tests - Message Rendering
echo -e "${YELLOW}=== INTEGRATION TESTS ===${NC}"
echo ""

if ! run_tests "Message Rendering" "**/__tests__/message-rendering.test.tsx"; then
  FAILED_TESTS+=("Message Rendering")
fi
echo ""

if ! run_tests "Presentation Layer" "**/__tests__/presentation-layer.test.tsx"; then
  FAILED_TESTS+=("Presentation Layer")
fi
echo ""

# 4. E2E Tests - Agent Chat
echo -e "${YELLOW}=== END-TO-END TESTS ===${NC}"
echo ""

if ! run_tests "Coordinator Agent E2E" "convex/agents/__tests__/e2e-coordinator-agent.test.ts"; then
  FAILED_TESTS+=("Coordinator Agent E2E")
fi
echo ""

if ! run_tests "Streaming Agent E2E" "convex/agents/__tests__/e2e-streaming.test.ts"; then
  FAILED_TESTS+=("Streaming Agent E2E")
fi
echo ""

if ! run_tests "Agent UI Integration E2E" "src/components/FastAgentPanel/__tests__/e2e-agent-ui.test.tsx"; then
  FAILED_TESTS+=("Agent UI Integration E2E")
fi
echo ""

# 5. Coverage Report
echo -e "${YELLOW}=== COVERAGE REPORT ===${NC}"
echo ""
npx vitest run --coverage --reporter=verbose
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Failed tests:${NC}"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
  exit 1
fi

