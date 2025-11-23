# Changelog: Deep Agents 2.0 + MCP Architecture Implementation
**Date**: November 22, 2025  
**Version**: 2.0.0  
**Status**: Implementation Plan

---

## 🎯 Executive Summary

This changelog documents the complete architectural transformation of NodeBench AI's Fast Agent system from a shallow loop architecture to **Deep Agents 2.0** with **MCP-based shared tools**. This enables:

1. **Explicit Planning** - Task plans as tool-accessible documents
2. **Hierarchical Delegation** - Orchestrator → Specialized sub-agents
3. **Persistent Memory** - External storage for intermediate results
4. **Extreme Context Engineering** - Detailed orchestrator protocols
5. **Multi-Team Collaboration** - MCP servers for shared tool development
6. **OpenBB Integration** - Financial data sub-agent with MCP connectivity

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Directory Structure Changes](#directory-structure-changes)
3. [Implementation Phases](#implementation-phases)
4. [MCP Server Specifications](#mcp-server-specifications)
5. [Migration Guide](#migration-guide)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Plan](#deployment-plan)
8. [Team Responsibilities](#team-responsibilities)

---

## 🏗️ Architecture Overview

### Current State (Shallow Agents 1.0)
```
CoordinatorAgent
├── All tools imported directly
├── Context window as state
├── Reactive while-loop execution
└── No explicit planning or memory
```

### Target State (Deep Agents 2.0 + MCP)
```
CoordinatorAgent (Orchestrator)
├── Planning Tools (via MCP: core_agent_server)
├── Memory Tools (via MCP: core_agent_server)
├── Delegation Tools
│   ├── DocumentAgent (self-contained with tools)
│   ├── MediaAgent (self-contained with tools)
│   ├── SECAgent (self-contained with tools)
│   └── OpenBBAgent (self-contained with tools)
└── Shared Tools (via MCP servers)
    ├── Data Access (via MCP: data_access_server)
    ├── Research (via MCP: research_server)
    └── Newsletter (via MCP: newsletter_server)
```

### Key Architectural Principles

1. **Subagent Self-Containment**: Each subagent owns its tools in its directory
2. **MCP for Shared Tools**: Shared capabilities exposed via MCP servers
3. **Tool Wrappers**: Agents use wrappers that internally call MCP servers
4. **Clear Ownership**: Each MCP server owned by a specific team
5. **Standardized Protocol**: All shared tools accessible via MCP

---

## 📁 Directory Structure Changes

### New Directory Structure
```
convex/
├── fast_agents/
│   ├── coordinatorAgent.ts (REFACTORED)
│   ├── subagents/
│   │   ├── document_subagent/
│   │   │   ├── documentAgent.ts
│   │   │   └── tools/
│   │   │       ├── documentTools.ts
│   │   │       ├── hashtagSearchTools.ts
│   │   │       └── geminiFileSearch.ts
│   │   ├── media_subagent/
│   │   │   ├── mediaAgent.ts
│   │   │   └── tools/
│   │   │       ├── mediaTools.ts
│   │   │       ├── youtubeSearch.ts
│   │   │       └── linkupSearch.ts
│   │   ├── sec_subagent/
│   │   │   ├── secAgent.ts
│   │   │   └── tools/
│   │   │       ├── secFilingTools.ts
│   │   │       └── secCompanySearch.ts
│   │   └── openbb_subagent/
│   │       ├── openbbAgent.ts
│   │       └── tools/
│   │           ├── adminTools.ts
│   │           ├── equityTools.ts
│   │           ├── cryptoTools.ts
│   │           ├── economyTools.ts
│   │           └── newsTools.ts
│   └── delegation/
│       ├── delegationTools.ts
│       └── delegationHelpers.ts
├── mcp_tools/ (NEW)
│   ├── core_agent_server/
│   ├── data_access_server/
│   ├── research_server/
│   ├── newsletter_server/
│   └── _templates/
├── tools/
│   ├── wrappers/ (NEW - MCP tool wrappers)
│   ├── confirmation/ (direct tools)
│   ├── spreadsheet/
│   ├── evaluation/
│   └── __tests__/
└── actions/
    ├── openbbActions.ts (NEW)
    └── mcpToolWrappers.ts (NEW)
```

### Files to Delete
- `convex/fast_agents/contextAgent.ts`
- `convex/fast_agents/editingAgent.ts`
- `convex/fast_agents/validationAgent.ts`
- `convex/fast_agents/orchestrator.ts`
- `convex/fast_agents/multiAgentWorkflow.ts`
- `convex/fast_agents/multiAgentWorkflowDefinition.ts`
- `convex/fast_agents/tools.ts`

---


