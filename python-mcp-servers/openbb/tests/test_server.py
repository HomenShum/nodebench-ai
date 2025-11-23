"""
Integration tests for OpenBB MCP Server
"""
import pytest
from fastapi.testclient import TestClient
from server import app

client = TestClient(app)


class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_health_check(self):
        """Test basic health check"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "openbb-mcp-server"
    
    def test_readiness_check(self):
        """Test readiness check"""
        response = client.get("/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["ready"] is True
    
    def test_liveness_check(self):
        """Test liveness check"""
        response = client.get("/health/live")
        assert response.status_code == 200
        data = response.json()
        assert data["alive"] is True


class TestAdminEndpoints:
    """Test admin and discovery endpoints"""
    
    def test_get_categories(self):
        """Test getting available categories"""
        response = client.get("/admin/available_categories")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "categories" in data
        assert len(data["categories"]) > 0
    
    def test_get_all_tools(self):
        """Test getting all tools"""
        response = client.get("/admin/available_tools")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "tools" in data
        assert len(data["tools"]) > 0
    
    def test_get_tools_by_category(self):
        """Test getting tools by category"""
        response = client.get("/admin/available_tools?category=equity")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["category"] == "equity"
        assert len(data["tools"]) > 0
    
    def test_get_tool_info(self):
        """Test getting tool information"""
        response = client.get("/admin/tool/equity_price_quote")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "tool" in data
        assert data["tool"]["name"] == "equity_price_quote"


class TestToolExecution:
    """Test tool execution endpoints"""
    
    @pytest.mark.skip(reason="Requires OpenBB API key")
    def test_execute_equity_quote(self):
        """Test executing equity quote tool"""
        response = client.post(
            "/tools/execute",
            json={
                "tool_name": "equity_price_quote",
                "parameters": {"symbol": "AAPL"}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
    
    def test_execute_invalid_tool(self):
        """Test executing invalid tool"""
        response = client.post(
            "/tools/execute",
            json={
                "tool_name": "invalid_tool",
                "parameters": {}
            }
        )
        assert response.status_code == 404


class TestRootEndpoint:
    """Test root endpoint"""
    
    def test_root(self):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "OpenBB MCP Server"
        assert data["status"] == "running"

