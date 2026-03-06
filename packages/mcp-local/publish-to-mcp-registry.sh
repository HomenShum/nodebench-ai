#!/bin/bash
# Publish NodeBench MCP to the Official MCP Registry
# Run this script and follow the GitHub device auth prompt immediately.
# The auth code expires in ~15 minutes.

set -e

PUBLISHER="/tmp/mcp-pub/mcp-publisher.exe"

echo "=== Step 1: Validate server.json ==="
$PUBLISHER validate
echo ""

echo "=== Step 2: Login to MCP Registry via GitHub ==="
echo "IMPORTANT: Follow the prompts IMMEDIATELY - go to the URL and enter the code."
echo ""
$PUBLISHER login github
echo ""

echo "=== Step 3: Publish to MCP Registry ==="
$PUBLISHER publish
echo ""

echo "=== Step 4: Verify ==="
echo "Checking registry..."
curl -s "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.homenshum/nodebench" | head -200
echo ""
echo "Done! NodeBench MCP is now on the official MCP Registry."
