# Quick start script for OpenBB MCP Server (PowerShell)

Write-Host "🚀 Starting OpenBB MCP Server..." -ForegroundColor Green

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "📦 Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Yellow
& "venv\Scripts\Activate.ps1"

# Install dependencies
Write-Host "📥 Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Check if .env exists
if (-not (Test-Path "../.env")) {
    Write-Host "⚠️  Warning: .env file not found!" -ForegroundColor Red
    Write-Host "📝 Creating .env from example..." -ForegroundColor Yellow
    Copy-Item "../.env.example" "../.env"
    Write-Host "⚠️  Please edit python-mcp-servers/.env and add your OPENBB_API_KEY" -ForegroundColor Red
    exit 1
}

# Start server
Write-Host "✅ Starting server..." -ForegroundColor Green
python server.py

