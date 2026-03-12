#!/bin/bash

echo "🧪 Testing DCF Spreadsheet Integration..."
echo ""

echo "📍 Step 1: Opening app"
agent-browser open http://localhost:5173
sleep 2

echo "📍 Step 2: Clicking Fast Agent Panel"
agent-browser click 'button:has-text("Toggle Fast Agent Panel")'
sleep 2

echo "📍 Step 3: Typing in chat"
agent-browser fill "textarea" "Build a DCF model for NVIDIA"
sleep 1

echo "📍 Step 4: Sending message"
agent-browser press "Enter"
echo "⏳ Waiting 20 seconds for agent to create DCF..."
sleep 20

echo "📍 Step 5: Getting response"
agent-browser get text "body" > dcf-response.txt

echo ""
echo "📋 Response preview:"
head -100 dcf-response.txt | grep -A5 -B5 -i "spreadsheet\|nvda\|created\|dcf" || echo "No matches found"

echo ""
echo "✅ Check dcf-response.txt for full output"
