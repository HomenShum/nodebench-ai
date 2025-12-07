from convex import ConvexClient
from ..config import get_settings

settings = get_settings()
MCP_SECRET = "nodebench_dev_secret"

class ConvexService:
    def __init__(self):
        self.client = ConvexClient(settings.convex_url) if settings.convex_url else None

    def create_plan(self, user_id: str, goal: str, steps: list):
        if not self.client: return None
        return self.client.mutation("agentPlanning:createPlanAsService", {
            "userId": user_id,
            "goal": goal,
            "steps": steps,
            "secret": MCP_SECRET
        })

    def update_plan_step(self, user_id: str, plan_id: str, step_index: int, status: str):
        if not self.client: return None
        return self.client.mutation("agentPlanning:updatePlanStepAsService", {
            "userId": user_id,
            "planId": plan_id,
            "stepIndex": step_index,
            "status": status,
            "secret": MCP_SECRET
        })

    def get_plan(self, user_id: str, plan_id: str):
        if not self.client: return None
        return self.client.query("agentPlanning:getPlanAsService", {
            "userId": user_id,
            "planId": plan_id,
            "secret": MCP_SECRET
        })

    def write_memory(self, user_id: str, key: str, content: str, metadata: dict = None):
        if not self.client: return None
        return self.client.mutation("agentMemory:writeMemoryAsService", {
            "userId": user_id,
            "key": key,
            "content": content,
            "metadata": metadata,
            "secret": MCP_SECRET
        })

    def read_memory(self, user_id: str, key: str):
        if not self.client: return None
        return self.client.query("agentMemory:readMemoryAsService", {
            "userId": user_id,
            "key": key,
            "secret": MCP_SECRET
        })

    def list_memory(self, user_id: str, limit: int = 50):
        if not self.client: return []
        return self.client.query("agentMemory:listMemoryAsService", {
            "userId": user_id,
            "limit": limit,
            "secret": MCP_SECRET
        })

    def delete_memory(self, user_id: str, key: str):
        if not self.client: return None
        return self.client.mutation("agentMemory:deleteMemoryAsService", {
            "userId": user_id,
            "key": key,
            "secret": MCP_SECRET
        })

convex_service = ConvexService()
