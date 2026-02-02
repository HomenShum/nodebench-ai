#!/bin/bash
# Verify NodeBench MCP server deployments on Render
# Usage: ./verify-mcp-deployment.sh [MCP_HTTP_TOKEN]

set -e

TOKEN="${1:-$MCP_HTTP_TOKEN}"
CORE_AGENT_URL="${CORE_AGENT_URL:-https://nodebench-mcp-core-agent.onrender.com}"
OPENBB_URL="${OPENBB_URL:-https://nodebench-mcp-openbb.onrender.com}"
RESEARCH_URL="${RESEARCH_URL:-https://nodebench-mcp-research.onrender.com}"

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

passed=0
total=0

test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local body="$4"
    local extra_headers="$5"
    
    total=$((total + 1))
    echo -e "\n${CYAN}[$name] Testing $url...${NC}"
    
    local curl_args=(-s -w "\n%{http_code}")
    [ "$method" != "GET" ] && curl_args+=(-X "$method")
    [ -n "$body" ] && curl_args+=(-d "$body" -H "Content-Type: application/json")
    [ -n "$extra_headers" ] && curl_args+=(-H "$extra_headers")
    
    response=$(curl "${curl_args[@]}" "$url" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body_response=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "  ${GREEN}✓ Status: $http_code${NC}"
        echo "  Response: $body_response"
        passed=$((passed + 1))
        return 0
    else
        echo -e "  ${RED}✗ FAILED: HTTP $http_code${NC}"
        echo "  Response: $body_response"
        return 1
    fi
}

echo -e "${YELLOW}=== NodeBench MCP Deployment Verification ===${NC}"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"

# 1. Core Agent MCP Server
echo -e "\n${YELLOW}--- Core Agent MCP Server ---${NC}"
test_endpoint "Health" "$CORE_AGENT_URL/health" || true

tools_body='{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
if [ -n "$TOKEN" ]; then
    test_endpoint "Tools List" "$CORE_AGENT_URL" "POST" "$tools_body" "x-mcp-token: $TOKEN" || true
else
    test_endpoint "Tools List" "$CORE_AGENT_URL" "POST" "$tools_body" || true
fi

# 2. OpenBB MCP Server
echo -e "\n${YELLOW}--- OpenBB MCP Server ---${NC}"
test_endpoint "Health" "$OPENBB_URL/health" || true
test_endpoint "Root" "$OPENBB_URL" || true

# 3. Research MCP Server
echo -e "\n${YELLOW}--- Research MCP Server ---${NC}"
test_endpoint "Health" "$RESEARCH_URL/health" || true
test_endpoint "Root" "$RESEARCH_URL" || true

# Summary
echo -e "\n${YELLOW}=== Summary ===${NC}"
echo "Total: $passed / $total passed"

if [ "$passed" -eq "$total" ]; then
    echo -e "\n${GREEN}✓ All MCP servers verified successfully!${NC}"
    exit 0
else
    echo -e "\n${CYAN}Note: If servers are not yet deployed, connect the repo to Render Blueprint first.${NC}"
    exit 1
fi

