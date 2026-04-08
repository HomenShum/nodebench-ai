"""
Social Matching Agent Graph — LangGraph implementation.

A 6-node state graph that demonstrates the agentic social matching pattern
Ditto describes: understand people → make decisions → learn from outcomes.

Graph: profile_intake → intent_classify → match_score → conversation_gen → outcome_track → learn

Each node is a pure function over shared state. Conditional edges
route based on classification results. Checkpointing enables replay.
"""

from __future__ import annotations

import os
import json
import time
from typing import Literal, TypedDict, Annotated
from datetime import datetime

from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage


# ─── State schema ─────────────────────────────────────────────────

class UserProfile(TypedDict, total=False):
    user_id: str
    name: str
    interests: list[str]
    preferences: dict
    intent: str           # "explore" | "match" | "chat" | "date"
    location: str
    bio: str


class MatchCandidate(TypedDict, total=False):
    candidate_id: str
    name: str
    score: float          # 0.0 - 1.0
    reasoning: str
    shared_interests: list[str]
    compatibility_signals: list[str]


class MatchOutcome(TypedDict, total=False):
    match_id: str
    action: str           # "liked" | "passed" | "messaged" | "date_set" | "no_response"
    timestamp: str
    feedback: str


class GraphState(TypedDict, total=False):
    """Shared state across all graph nodes."""
    # Input
    user_profile: UserProfile
    query: str

    # Processing
    intent: str                                         # classified intent
    intent_confidence: float
    candidates: list[MatchCandidate]
    selected_match: MatchCandidate | None
    conversation_opener: str

    # Evidence & trace
    messages: Annotated[list, add_messages]             # conversation history
    trace: list[dict]                                   # execution trace

    # Output
    outcome: MatchOutcome | None
    learning: dict                                      # what the system learned

    # Metadata
    started_at: str
    completed_at: str
    total_duration_ms: int


# ─── Node 1: Profile Intake ──────────────────────────────────────

def profile_intake(state: GraphState) -> GraphState:
    """Parse and normalize user profile from raw input."""
    start = time.time()

    profile = state.get("user_profile", {})
    query = state.get("query", "")

    # Extract interests from query if not in profile
    if not profile.get("interests") and query:
        # Simple keyword extraction (in production: LLM extraction)
        interest_keywords = [
            "hiking", "travel", "music", "cooking", "reading", "sports",
            "art", "tech", "gaming", "fitness", "photography", "film",
            "science", "writing", "yoga", "dance", "coffee", "wine",
        ]
        interests = [kw for kw in interest_keywords if kw in query.lower()]
        profile["interests"] = interests or ["general"]

    duration = int((time.time() - start) * 1000)
    trace = state.get("trace", [])
    trace.append({
        "node": "profile_intake",
        "status": "ok",
        "duration_ms": duration,
        "detail": f"Profile normalized: {len(profile.get('interests', []))} interests",
    })

    return {
        **state,
        "user_profile": profile,
        "trace": trace,
        "started_at": state.get("started_at", datetime.utcnow().isoformat()),
    }


# ─── Node 2: Intent Classification ───────────────────────────────

def intent_classify(state: GraphState) -> GraphState:
    """Classify user intent: explore, match, chat, or date."""
    start = time.time()

    query = state.get("query", "").lower()

    # Deterministic keyword scoring (TA Studio routing_score pattern)
    intent_scores = {
        "explore": 0,
        "match": 0,
        "chat": 0,
        "date": 0,
    }

    explore_kw = ["browse", "see", "discover", "explore", "who", "show me", "looking around"]
    match_kw = ["match", "compatible", "find someone", "similar", "like me", "interested in"]
    chat_kw = ["talk", "chat", "message", "say", "conversation", "opener", "icebreaker"]
    date_kw = ["date", "meet", "coffee", "dinner", "hang out", "plans", "schedule", "tonight"]

    for kw in explore_kw:
        if kw in query: intent_scores["explore"] += len(kw)
    for kw in match_kw:
        if kw in query: intent_scores["match"] += len(kw)
    for kw in chat_kw:
        if kw in query: intent_scores["chat"] += len(kw)
    for kw in date_kw:
        if kw in query: intent_scores["date"] += len(kw)

    # Pick highest, default to "explore"
    best_intent = max(intent_scores, key=intent_scores.get)
    max_score = intent_scores[best_intent]
    total = sum(intent_scores.values()) or 1
    confidence = max_score / total if max_score > 0 else 0.25

    # Default to "match" if no clear signal
    if max_score == 0:
        best_intent = "match"
        confidence = 0.5

    duration = int((time.time() - start) * 1000)
    trace = state.get("trace", [])
    trace.append({
        "node": "intent_classify",
        "status": "ok",
        "duration_ms": duration,
        "detail": f"Intent: {best_intent} (confidence: {confidence:.2f})",
        "scores": intent_scores,
    })

    return {
        **state,
        "intent": best_intent,
        "intent_confidence": round(confidence, 2),
        "trace": trace,
    }


# ─── Node 3: Match Scoring ────────────────────────────────────────

def match_score(state: GraphState) -> GraphState:
    """Score and rank candidate matches based on user profile + intent."""
    start = time.time()

    profile = state.get("user_profile", {})
    user_interests = set(profile.get("interests", []))
    intent = state.get("intent", "match")

    # Simulated candidate pool (in production: vector DB + collaborative filtering)
    candidate_pool = [
        {"candidate_id": "c_001", "name": "Alex", "interests": ["hiking", "tech", "coffee", "photography"]},
        {"candidate_id": "c_002", "name": "Jordan", "interests": ["music", "cooking", "travel", "wine"]},
        {"candidate_id": "c_003", "name": "Sam", "interests": ["fitness", "gaming", "tech", "film"]},
        {"candidate_id": "c_004", "name": "Riley", "interests": ["yoga", "art", "reading", "coffee"]},
        {"candidate_id": "c_005", "name": "Morgan", "interests": ["sports", "travel", "cooking", "dance"]},
    ]

    candidates: list[MatchCandidate] = []
    for candidate in candidate_pool:
        c_interests = set(candidate["interests"])
        shared = user_interests & c_interests

        # Score: Jaccard similarity + intent bonus
        union = user_interests | c_interests
        base_score = len(shared) / len(union) if union else 0.1

        # Intent-specific boosting
        if intent == "date" and "coffee" in c_interests:
            base_score += 0.15
        if intent == "chat" and len(shared) >= 2:
            base_score += 0.1

        score = min(1.0, round(base_score, 2))

        candidates.append({
            "candidate_id": candidate["candidate_id"],
            "name": candidate["name"],
            "score": score,
            "reasoning": f"{len(shared)} shared interests: {', '.join(shared) if shared else 'general compatibility'}",
            "shared_interests": list(shared),
            "compatibility_signals": [
                f"{'Strong' if score > 0.5 else 'Moderate'} interest overlap",
                f"Intent-aligned for {intent}",
            ],
        })

    # Sort by score descending
    candidates.sort(key=lambda c: c["score"], reverse=True)
    selected = candidates[0] if candidates else None

    duration = int((time.time() - start) * 1000)
    trace = state.get("trace", [])
    trace.append({
        "node": "match_score",
        "status": "ok",
        "duration_ms": duration,
        "detail": f"Scored {len(candidates)} candidates. Top: {selected['name'] if selected else 'none'} ({selected['score'] if selected else 0})",
    })

    return {
        **state,
        "candidates": candidates[:3],  # Top 3
        "selected_match": selected,
        "trace": trace,
    }


# ─── Node 4: Conversation Generation ─────────────────────────────

def conversation_gen(state: GraphState) -> GraphState:
    """Generate a personalized conversation opener based on match + intent."""
    start = time.time()

    selected = state.get("selected_match")
    intent = state.get("intent", "match")
    profile = state.get("user_profile", {})

    if not selected:
        opener = "I'd love to find some great matches for you. Tell me more about what you're looking for!"
    else:
        shared = selected.get("shared_interests", [])
        name = selected.get("name", "someone")

        if intent == "date" and shared:
            opener = f"You and {name} both love {shared[0]}! How about suggesting a {shared[0]}-themed date spot?"
        elif intent == "chat" and shared:
            opener = f"Hey {name}! I noticed we both enjoy {' and '.join(shared[:2])}. What got you into {shared[0]}?"
        elif shared:
            opener = f"You and {name} share interests in {', '.join(shared)}. That's a strong foundation — want to connect?"
        else:
            opener = f"{name} seems like an interesting match based on your overall profile. Want to learn more about them?"

    duration = int((time.time() - start) * 1000)
    trace = state.get("trace", [])
    trace.append({
        "node": "conversation_gen",
        "status": "ok",
        "duration_ms": duration,
        "detail": f"Generated opener ({len(opener)} chars)",
    })

    messages = state.get("messages", [])
    messages.append(AIMessage(content=opener))

    return {
        **state,
        "conversation_opener": opener,
        "messages": messages,
        "trace": trace,
    }


# ─── Node 5: Outcome Tracking ────────────────────────────────────

def outcome_track(state: GraphState) -> GraphState:
    """Record the outcome for feedback loop learning."""
    start = time.time()

    selected = state.get("selected_match")
    intent = state.get("intent", "match")

    # In production: this would be called AFTER user action (like, pass, message, etc.)
    # For the demo: we simulate a positive outcome
    outcome: MatchOutcome = {
        "match_id": f"m_{selected['candidate_id']}" if selected else "m_none",
        "action": "presented",  # User was shown this match
        "timestamp": datetime.utcnow().isoformat(),
        "feedback": "pending",  # Awaiting user action
    }

    duration = int((time.time() - start) * 1000)
    trace = state.get("trace", [])
    trace.append({
        "node": "outcome_track",
        "status": "ok",
        "duration_ms": duration,
        "detail": f"Outcome recorded: {outcome['action']} for {outcome['match_id']}",
    })

    return {
        **state,
        "outcome": outcome,
        "trace": trace,
    }


# ─── Node 6: Learning ────────────────────────────────────────────

def learn(state: GraphState) -> GraphState:
    """Extract learnings from this interaction for system improvement."""
    start = time.time()

    intent = state.get("intent", "match")
    confidence = state.get("intent_confidence", 0)
    candidates = state.get("candidates", [])
    selected = state.get("selected_match")

    learning = {
        "session_quality": "good" if confidence > 0.5 and selected and selected.get("score", 0) > 0.3 else "needs_improvement",
        "intent_was_clear": confidence > 0.5,
        "match_quality": selected.get("score", 0) if selected else 0,
        "candidate_pool_size": len(candidates),
        "improvement_suggestions": [],
    }

    if confidence < 0.4:
        learning["improvement_suggestions"].append("Intent classification was weak — consider asking a clarifying question")
    if selected and selected.get("score", 0) < 0.3:
        learning["improvement_suggestions"].append("Top match score was low — expand candidate pool or relax matching criteria")
    if not candidates:
        learning["improvement_suggestions"].append("No candidates generated — check profile intake and candidate pool")

    duration = int((time.time() - start) * 1000)
    trace = state.get("trace", [])
    trace.append({
        "node": "learn",
        "status": "ok",
        "duration_ms": duration,
        "detail": f"Session quality: {learning['session_quality']}",
    })

    total_ms = sum(t.get("duration_ms", 0) for t in trace)

    return {
        **state,
        "learning": learning,
        "trace": trace,
        "completed_at": datetime.utcnow().isoformat(),
        "total_duration_ms": total_ms,
    }


# ─── Conditional edge: route by intent ────────────────────────────

def route_by_intent(state: GraphState) -> Literal["match_score", "conversation_gen"]:
    """After classification, route to match scoring or direct to conversation."""
    intent = state.get("intent", "match")
    if intent in ("chat",):
        # Chat intent skips match scoring — go straight to conversation
        return "conversation_gen"
    return "match_score"


# ─── Build the graph ──────────────────────────────────────────────

def build_matching_graph() -> StateGraph:
    """Construct the social matching agent graph."""

    graph = StateGraph(GraphState)

    # Add nodes
    graph.add_node("profile_intake", profile_intake)
    graph.add_node("intent_classify", intent_classify)
    graph.add_node("match_score", match_score)
    graph.add_node("conversation_gen", conversation_gen)
    graph.add_node("outcome_track", outcome_track)
    graph.add_node("learn", learn)

    # Add edges
    graph.set_entry_point("profile_intake")
    graph.add_edge("profile_intake", "intent_classify")

    # Conditional: intent classification routes to match scoring or direct conversation
    graph.add_conditional_edges(
        "intent_classify",
        route_by_intent,
        {
            "match_score": "match_score",
            "conversation_gen": "conversation_gen",
        },
    )

    graph.add_edge("match_score", "conversation_gen")
    graph.add_edge("conversation_gen", "outcome_track")
    graph.add_edge("outcome_track", "learn")
    graph.add_edge("learn", END)

    return graph


# Compiled graph (singleton)
matching_graph = build_matching_graph().compile()
