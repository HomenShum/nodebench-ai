"""
LangGraph Social Matching Agent — FastAPI server.

Exposes the matching graph via REST API.
Designed for deployment to GCP Cloud Run.

Endpoints:
  POST /match    — Run the full matching graph
  GET  /health   — Health check
  GET  /graph    — Return graph structure (for visualization)
"""

from __future__ import annotations

import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from graph import matching_graph, GraphState, UserProfile


# ─── Pydantic models ──────────────────────────────────────────────

class MatchRequest(BaseModel):
    query: str = Field(..., description="User's natural language input")
    user_id: str = Field(default="anonymous", description="User ID")
    name: str = Field(default="User", description="User's name")
    interests: list[str] = Field(default_factory=list, description="Known interests")
    preferences: dict = Field(default_factory=dict, description="Matching preferences")
    location: str = Field(default="", description="User location")
    bio: str = Field(default="", description="User bio")


class MatchCandidate(BaseModel):
    candidate_id: str
    name: str
    score: float
    reasoning: str
    shared_interests: list[str]
    compatibility_signals: list[str]


class TraceStep(BaseModel):
    node: str
    status: str
    duration_ms: int
    detail: str


class MatchResponse(BaseModel):
    intent: str
    intent_confidence: float
    candidates: list[MatchCandidate]
    selected_match: MatchCandidate | None
    conversation_opener: str
    outcome: dict | None
    learning: dict
    trace: list[TraceStep]
    total_duration_ms: int


class GraphInfo(BaseModel):
    nodes: list[str]
    edges: list[dict]
    entry_point: str
    description: str


# ─── App ──────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: verify graph compiles. Shutdown: cleanup."""
    # Verify graph is functional
    print(f"[langgraph-agent] Graph compiled: {len(matching_graph.nodes)} nodes")
    yield
    print("[langgraph-agent] Shutting down")


app = FastAPI(
    title="NodeBench LangGraph Agent",
    description="Social matching agent powered by LangGraph state graph",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routes ───────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "langgraph-agent",
        "graph_nodes": len(matching_graph.nodes),
    }


@app.post("/match", response_model=MatchResponse)
async def run_match(req: MatchRequest):
    """Run the full matching graph and return results."""
    start = time.time()

    try:
        # Build initial state
        initial_state: GraphState = {
            "user_profile": {
                "user_id": req.user_id,
                "name": req.name,
                "interests": req.interests,
                "preferences": req.preferences,
                "location": req.location,
                "bio": req.bio,
            },
            "query": req.query,
            "messages": [],
            "trace": [],
        }

        # Execute graph
        result = matching_graph.invoke(initial_state)

        total_ms = int((time.time() - start) * 1000)

        return MatchResponse(
            intent=result.get("intent", "unknown"),
            intent_confidence=result.get("intent_confidence", 0),
            candidates=[
                MatchCandidate(**c) for c in result.get("candidates", [])
            ],
            selected_match=(
                MatchCandidate(**result["selected_match"])
                if result.get("selected_match")
                else None
            ),
            conversation_opener=result.get("conversation_opener", ""),
            outcome=result.get("outcome"),
            learning=result.get("learning", {}),
            trace=[
                TraceStep(**t) for t in result.get("trace", [])
            ],
            total_duration_ms=total_ms,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Graph execution failed: {str(e)}")


@app.get("/graph", response_model=GraphInfo)
async def get_graph_info():
    """Return graph structure for visualization."""
    return GraphInfo(
        nodes=list(matching_graph.nodes.keys()),
        edges=[
            {"source": "profile_intake", "target": "intent_classify"},
            {"source": "intent_classify", "target": "match_score", "condition": "intent != chat"},
            {"source": "intent_classify", "target": "conversation_gen", "condition": "intent == chat"},
            {"source": "match_score", "target": "conversation_gen"},
            {"source": "conversation_gen", "target": "outcome_track"},
            {"source": "outcome_track", "target": "learn"},
        ],
        entry_point="profile_intake",
        description="6-node social matching graph: profile → intent → score → conversation → outcome → learn",
    )


# ─── Run ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8090))
    uvicorn.run(app, host="0.0.0.0", port=port)
