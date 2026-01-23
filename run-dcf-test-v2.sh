#!/bin/bash
set -e

echo "🧪 Testing DCF Spreadsheet Integration..."
echo ""

echo "📍 Step 1: Opening app"
agent-browser open http://localhost:5173
sleep 2

echo "📍 Step 2: Clicking Fast Agent Panel button"
agent-browser click "@e10"  # Fast Agent Panel button from snapshot
sleep 2

echo "📍 Step 3: Taking snapshot to find input"
agent-browser snapshot | grep -i "textbox\|input\|textarea" | head -10

echo "📍 Step 4: Clicking on the chat input"
agent-browser click "textarea" || agent-browser click "input[type='text']"
sleep 1

echo "📍 Step 5: Typing DCF request"
agent-browser type "textarea" "Build a DCF model for NVIDIA"
sleep 1

echo "📍 Step 6: Submitting (pressing Enter)"
agent-browser press "Enter"
sleep 20

echo "📍 Step 7: Getting response text"
agent-browser get text "body" > dcf-response.txt

echo "📍 Step 8: Checking for spreadsheet creation"
if grep -qi "spreadsheet" dcf-response.txt; then
  echo "✅ Spreadsheet creation detected!"
  grep -i "spreadsheet\|nvda\|created" dcf-response.txt | head -20
  
  # Extract spreadsheet ID
  SHEET_ID=$(grep -oP '#spreadsheets/\K[a-z0-9]+' dcf-response.txt | head -1)
  if [ -n "$SHEET_ID" ]; then
    echo ""
    echo "📊 Spreadsheet ID found: $SHEET_ID"
    echo "📍 Step 9: Opening spreadsheet"
    agent-browser open "http://localhost:5173/#spreadsheets/$SHEET_ID"
    sleep 3
    
    echo "📍 Step 10: Verifying spreadsheet content"
    agent-browser get text "body" > spreadsheet-content.txt
    if grep -qi "nvda\|dcf\|fair value" spreadsheet-content.txt; then
      echo "✅ Spreadsheet loaded successfully!"
      grep -i "fair value\|wacc\|growth" spreadsheet-content.txt | head -10
      echo ""
      echo "🎉 END-TO-END TEST PASSED!"
    else
      echo "⚠️  Spreadsheet loaded but content not verified"
    fi
  fi
else
  echo "⚠️  No spreadsheet creation detected in response"
  head -50 dcf-response.txt
fi

echo ""
echo "✅ Test complete - check dcf-response.txt and spreadsheet-content.txt"
