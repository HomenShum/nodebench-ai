#!/bin/bash
# Quick start script for OpenBB MCP Server

echo "🚀 Starting OpenBB MCP Server..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if .env exists
if [ ! -f "../.env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "📝 Creating .env from example..."
    cp ../.env.example ../.env
    echo "⚠️  Please edit python-mcp-servers/.env and add your OPENBB_API_KEY"
    exit 1
fi

# Start server
echo "✅ Starting server..."
python server.py

