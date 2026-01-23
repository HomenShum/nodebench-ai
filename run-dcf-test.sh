#!/bin/bash
set -e

echo "🧪 Testing DCF Spreadsheet Integration..."
echo ""

echo "📍 Step 1: Opening app at http://localhost:5173"
agent-browser open http://localhost:5173
sleep 3

echo "📍 Step 2: Taking snapshot to find agent panel"
agent-browser snapshot > snapshot1.txt
cat snapshot1.txt | grep -i "agent\|fast" | head -10

echo "📍 Step 3: Navigating to agents page"
agent-browser open "http://localhost:5173/#agents"
sleep 2

echo "📍 Step 4: Taking snapshot of agents page"
agent-browser snapshot > snapshot2.txt

echo "📍 Step 5: Finding input field"
agent-browser find role textbox click
sleep 1

echo "📍 Step 6: Typing DCF request"
agent-browser type "textarea" "Build a DCF model for NVIDIA"
sleep 1

echo "📍 Step 7: Finding and clicking submit button"  
agent-browser find role button "Send" click || agent-browser press Enter
sleep 15

echo "📍 Step 8: Getting page text to find spreadsheet ID"
agent-browser get text "body" > response.txt
cat response.txt | grep -i "spreadsheet\|nvda\|created" | head -20

echo ""
echo "✅ Test commands executed - check response.txt for results"
