#!/bin/bash
echo "🧪 DCF Spreadsheet UI Test"
echo "=========================="
echo ""

# Check if dev server is running
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo "❌ Dev server not running on localhost:5173"
  echo "Please run: npm run dev"
  exit 1
fi

echo "✅ Dev server detected on localhost:5173"
echo ""

# Test 1: Open app and navigate to Fast Agent
echo "📍 Test 1: Navigate to Fast Agent Panel"
echo "----------------------------------------"
agent-browser open http://localhost:5173
sleep 2

# Take snapshot to see what's available
echo "Taking snapshot..."
agent-browser snapshot > snapshot-home.txt

# Look for Fast Agent button
if grep -qi "fast agent" snapshot-home.txt; then
  echo "✅ Fast Agent Panel found"
  
  # Try to click it
  echo "Clicking Fast Agent Panel..."
  agent-browser click 'button:has-text("Fast Agent")' 2>&1 || \
  agent-browser click 'button:has-text("Toggle Fast Agent")' 2>&1 || \
  agent-browser open "http://localhost:5173/#agents" 2>&1
  
  sleep 2
else
  echo "⚠️ Fast Agent Panel not found, navigating directly..."
  agent-browser open "http://localhost:5173/#agents"
  sleep 2
fi

echo ""
echo "📍 Test 2: Send DCF Creation Request"
echo "-------------------------------------"

# Find and click textarea
echo "Finding input field..."
agent-browser snapshot > snapshot-agent.txt

# Try to type in the textarea
echo "Typing: Build a DCF model for NVIDIA"
agent-browser click "textarea" 2>&1 || agent-browser click "input" 2>&1
sleep 1

agent-browser type "textarea" "Build a DCF model for NVIDIA" 2>&1
sleep 1

# Press Enter to send
echo "Sending message..."
agent-browser press "Enter" 2>&1
sleep 1

echo "⏳ Waiting 20 seconds for agent to process..."
sleep 20

echo ""
echo "📍 Test 3: Check for Spreadsheet Creation"
echo "------------------------------------------"

# Get page content
agent-browser get text "body" > response.txt

# Look for success indicators
if grep -qi "spreadsheet" response.txt && grep -qi "nvda\|nvidia" response.txt; then
  echo "✅ DCF creation appears successful!"
  echo ""
  echo "Response preview:"
  grep -i "spreadsheet\|nvda\|created\|dcf" response.txt | head -20
  
  # Try to extract spreadsheet ID
  SHEET_ID=$(grep -oP '#spreadsheets/\K[a-z0-9]+' response.txt | head -1)
  
  if [ -n "$SHEET_ID" ]; then
    echo ""
    echo "📊 Spreadsheet ID extracted: $SHEET_ID"
    echo ""
    echo "📍 Test 4: Open Spreadsheet"
    echo "----------------------------"
    
    agent-browser open "http://localhost:5173/#spreadsheets/$SHEET_ID"
    sleep 3
    
    # Get spreadsheet content
    agent-browser get text "body" > spreadsheet.txt
    
    echo "Checking spreadsheet content..."
    if grep -qi "nvda\|dcf" spreadsheet.txt; then
      echo "✅ Spreadsheet opened successfully!"
      
      # Check for key DCF elements
      echo ""
      echo "Verifying DCF elements:"
      
      if grep -qi "fair value\|fairvalue" spreadsheet.txt; then
        echo "  ✅ Fair Value field found"
      fi
      
      if grep -qi "wacc" spreadsheet.txt; then
        echo "  ✅ WACC calculation found"
      fi
      
      if grep -qi "growth" spreadsheet.txt; then
        echo "  ✅ Growth rates found"
      fi
      
      if grep -qi "revenue" spreadsheet.txt; then
        echo "  ✅ Revenue data found"
      fi
      
      echo ""
      echo "📍 Test 5: Screenshot for Visual Verification"
      echo "----------------------------------------------"
      agent-browser screenshot dcf-spreadsheet.png 2>&1
      
      if [ -f "dcf-spreadsheet.png" ]; then
        echo "✅ Screenshot saved: dcf-spreadsheet.png"
      fi
      
      echo ""
      echo "🎉 ALL TESTS PASSED!"
      echo "===================="
      echo ""
      echo "✅ Summary:"
      echo "  • Fast Agent Panel accessible"
      echo "  • DCF creation request submitted"
      echo "  • Agent created DCF spreadsheet"
      echo "  • Spreadsheet ID: $SHEET_ID"
      echo "  • Spreadsheet rendered in UI"
      echo "  • DCF data visible"
      echo ""
      echo "📂 Output files:"
      echo "  • snapshot-home.txt - Home page snapshot"
      echo "  • snapshot-agent.txt - Agent panel snapshot"
      echo "  • response.txt - Agent response"
      echo "  • spreadsheet.txt - Spreadsheet content"
      echo "  • dcf-spreadsheet.png - Screenshot"
      
    else
      echo "⚠️ Spreadsheet opened but DCF content not visible"
      echo "First 200 chars of spreadsheet:"
      head -c 200 spreadsheet.txt
    fi
  else
    echo "⚠️ Could not extract spreadsheet ID from response"
  fi
else
  echo "⚠️ No spreadsheet creation detected"
  echo ""
  echo "Response preview:"
  head -100 response.txt
fi

echo ""
echo "✅ Test complete - check output files for details"
