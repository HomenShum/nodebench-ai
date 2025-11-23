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
7. **External Orchestrator (OpenAI/Gemini)** - Convex action + tool wrapper exposing vendor orchestrators to fast_agents with MCP-aware context

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

## 🔄 Implementation Phases

### Phase 1: Infrastructure Setup (Week 1)

#### 1.1 Create MCP Server Infrastructure
**Owner**: Core Team
**Duration**: 2 days

**Tasks**:
- [ ] Create `mcp_tools/` directory structure
- [ ] Create `_templates/template_server/` with boilerplate
- [ ] Create `_templates/CONTRIBUTING.md` for multi-team guide
- [ ] Set up MCP SDK dependencies
- [ ] Create base MCP server template

**Deliverables**:
- Working MCP server template
- Documentation for creating new servers
- Multi-team contribution guidelines

#### 1.2 Create Subagent Directory Structure
**Owner**: Core Team
**Duration**: 1 day

**Tasks**:
- [ ] Create `convex/fast_agents/subagents/` directory
- [ ] Create subdirectories for each subagent
- [ ] Create `delegation/` directory
- [ ] Create README files for each directory

**Deliverables**:
- Complete subagent directory structure
- Documentation for each subagent

#### 1.3 Create OpenBB MCP Communication Layer
**Owner**: Finance Team
**Duration**: 2 days

**Tasks**:
- [ ] Create `convex/actions/openbbActions.ts`
- [ ] Implement `callOpenBBMCP` internal action
- [ ] Add environment variables
- [ ] Test connection to OpenBB MCP server

**Deliverables**:
- Working OpenBB MCP communication layer
- Environment configuration guide

---

### Phase 2: MCP Server Implementation (Week 2-3)

#### 2.1 Core Agent Server (Planning & Memory)
**Owner**: Core Team
**Duration**: 3 days

**Tasks**:
- [ ] Create `mcp_tools/core_agent_server/`
- [ ] Implement planning tools (createPlan, updatePlanStep)
- [ ] Implement memory tools (writeAgentMemory, readAgentMemory)
- [ ] Integrate with Convex documents API
- [ ] Write tests

**Deliverables**:
- Working core_agent_server MCP server
- Test suite with 90%+ coverage

#### 2.2 Data Access Server
**Owner**: Data Team
**Duration**: 3 days

**Tasks**:
- [ ] Create `mcp_tools/data_access_server/`
- [ ] Move and adapt `dataAccessTools.ts`
- [ ] Implement MCP tool handlers
- [ ] Write tests

**Deliverables**:
- Working data_access_server MCP server
- Migration guide

#### 2.3 Research Server
**Owner**: Research Team
**Duration**: 4 days

**Tasks**:
- [ ] Create `mcp_tools/research_server/`
- [ ] Move and adapt research tools
- [ ] Implement MCP tool handlers
- [ ] Write tests

**Deliverables**:
- Working research_server MCP server
- Test suite

#### 2.4 Newsletter Server
**Owner**: Content Team
**Duration**: 2 days

**Tasks**:
- [ ] Create `mcp_tools/newsletter_server/`
- [ ] Move and adapt `newsletterTools.ts`
- [ ] Implement MCP tool handlers
- [ ] Write tests

**Deliverables**:
- Working newsletter_server MCP server
- Test suite

---

### Phase 3: Subagent Implementation (Week 3-4)

#### 3.1 Extract Document Agent
**Owner**: Document Team
**Duration**: 3 days

**Tasks**:
- [ ] Create `document_subagent/` directory
- [ ] Move document tools
- [ ] Extract agent from coordinatorAgent.ts
- [ ] Update imports
- [ ] Write tests

**Deliverables**:
- Self-contained document_subagent

#### 3.2 Extract Media Agent
**Owner**: Media Team
**Duration**: 3 days

**Tasks**:
- [ ] Create `media_subagent/` directory
- [ ] Move media tools
- [ ] Extract agent
- [ ] Write tests

**Deliverables**:
- Self-contained media_subagent

#### 3.3 Extract SEC Agent
**Owner**: Finance Team
**Duration**: 2 days

**Tasks**:
- [ ] Create `sec_subagent/` directory
- [ ] Move SEC tools
- [ ] Extract agent
- [ ] Write tests

**Deliverables**:
- Self-contained sec_subagent

#### 3.4 Create OpenBB Agent
**Owner**: Finance Team
**Duration**: 5 days

**Tasks**:
- [ ] Create `openbb_subagent/` directory
- [ ] Implement all OpenBB tools (admin, equity, crypto, economy, news)
- [ ] Create openbbAgent.ts
- [ ] Integrate with openbbActions.ts
- [ ] Write comprehensive tests

**Deliverables**:
- Complete openbb_subagent
- OpenBB integration guide

---

### Phase 4: Delegation Infrastructure (Week 4)

#### 4.1 Create Delegation Helpers
**Owner**: Core Team
**Duration**: 1 day

**Tasks**:
- [ ] Create `delegation/delegationHelpers.ts`
- [ ] Implement helper functions
- [ ] Write tests

**Deliverables**:
- Reusable delegation utilities

#### 4.2 Create Delegation Tools
**Owner**: Core Team
**Duration**: 3 days

**Tasks**:
- [ ] Create `delegation/delegationTools.ts`
- [ ] Implement buildDelegationTools function
- [ ] Create all delegation tools (including OpenBB)
- [ ] Write tests

**Deliverables**:
- Complete delegation infrastructure

---

### Phase 5: MCP Tool Wrappers (Week 5)

#### 5.1 Create Core Agent Tool Wrappers
**Owner**: Core Team
**Duration**: 2 days

**Tasks**:
- [ ] Create `tools/wrappers/coreAgentTools.ts`
- [ ] Implement planning tool wrappers
- [ ] Implement memory tool wrappers
- [ ] Write tests

**Deliverables**:
- Core agent tool wrappers

#### 5.2 Create Other Tool Wrappers
**Owner**: Respective Teams
**Duration**: 3 days

**Tasks**:
- [ ] Create data access tool wrappers
- [ ] Create research tool wrappers
- [ ] Create newsletter tool wrappers
- [ ] Write tests

**Deliverables**:
- All MCP tool wrappers

---

### Phase 6: Coordinator Agent Refactor (Week 5-6)

#### 6.1 Update Coordinator Instructions
**Owner**: Core Team
**Duration**: 2 days

**Tasks**:
- [ ] Write comprehensive orchestrator instructions
- [ ] Include delegation protocols
- [ ] Add workflow examples
- [ ] Document error handling

**Deliverables**:
- Extreme context engineering instructions (2000+ tokens)

#### 6.2 Refactor Coordinator Agent
**Owner**: Core Team
**Duration**: 3 days

**Tasks**:
- [ ] Update coordinatorAgent.ts
- [ ] Import delegation tools
- [ ] Import MCP tool wrappers
- [ ] Update tool registry
- [ ] Increase step count to 25
- [ ] Write tests

**Deliverables**:
- Refactored coordinator agent

---

### Phase 7: Testing & Validation (Week 6-7)

#### 7.1 Unit Tests
**Owner**: All Teams
**Duration**: 3 days

**Tasks**:
- [ ] Write unit tests for all components
- [ ] Achieve 90%+ code coverage

**Deliverables**:
- Comprehensive unit test suite

#### 7.2 Integration Tests
**Owner**: Core Team
**Duration**: 3 days

**Tasks**:
- [ ] Test coordinator → subagent delegation
- [ ] Test MCP server communication
- [ ] Test planning and memory workflows

**Deliverables**:
- Integration test suite

#### 7.3 End-to-End Tests
**Owner**: QA Team
**Duration**: 4 days

**Tasks**:
- [ ] Test complete user workflows
- [ ] Test with real APIs
- [ ] Performance testing

**Deliverables**:
- E2E test suite
- Performance benchmarks

---

### Phase 8: Documentation (Week 7)

#### 8.1 Architecture Documentation
**Owner**: Core Team
**Duration**: 2 days

**Tasks**:
- [ ] Update architecture docs
- [ ] Create diagrams
- [ ] Document delegation patterns

**Deliverables**:
- Complete architecture documentation

#### 8.2 API Documentation
**Owner**: All Teams
**Duration**: 2 days

**Tasks**:
- [ ] Document all MCP server APIs
- [ ] Document subagent capabilities
- [ ] Create API reference

**Deliverables**:
- Complete API documentation

#### 8.3 Developer Guides
**Owner**: Core Team
**Duration**: 2 days

**Tasks**:
- [ ] Write MCP server creation guide
- [ ] Write subagent creation guide
- [ ] Write migration guide

**Deliverables**:
- Developer guides

---

### Phase 9: Deployment (Week 8)

#### 9.1 Local Development Setup
**Owner**: DevOps Team
**Duration**: 2 days

**Tasks**:
- [ ] Set up local MCP server development
- [ ] Create docker-compose
- [ ] Document workflow

**Deliverables**:
- Local development setup

#### 9.2 Staging Deployment
**Owner**: DevOps Team
**Duration**: 2 days

**Tasks**:
- [ ] Deploy MCP servers to staging
- [ ] Set up monitoring
- [ ] Test end-to-end

**Deliverables**:
- Staging deployment

#### 9.3 Production Deployment
**Owner**: DevOps Team
**Duration**: 3 days

**Tasks**:
- [ ] Deploy to production
- [ ] Configure auto-scaling
- [ ] Set up monitoring and alerts

**Deliverables**:
- Production deployment

---

### Phase 10: Cleanup (Week 8)

#### 10.1 Remove Deprecated Code
**Owner**: Core Team
**Duration**: 1 day

**Tasks**:
- [ ] Delete deprecated agent files
- [ ] Remove old tool files
- [ ] Update imports

**Deliverables**:
- Clean codebase

---

## 🖥️ MCP Server Specifications

### Core Agent Server
**Purpose**: Planning and memory tools
**Owner**: Core Team
**Port**: 8001

**Tools**:
- createPlan
- updatePlanStep
- writeAgentMemory
- readAgentMemory

### Data Access Server
**Purpose**: Task, event, folder management
**Owner**: Data Team
**Port**: 8002

**Tools**:
- listTasks, createTask, updateTask
- listEvents, createEvent
- getFolderContents

### Research Server
**Purpose**: Funding, people, news discovery
**Owner**: Research Team
**Port**: 8003

**Tools**:
- searchFunding, searchPeople
- searchNews, searchEvents

### Newsletter Server
**Purpose**: Newsletter generation
**Owner**: Content Team
**Port**: 8004

**Tools**:
- createNewsletter
- sendNewsletter
- scheduleNewsletter

### OpenBB MCP Server (External)
**Purpose**: Financial data
**Owner**: Finance Team (integration)
**URL**: http://127.0.0.1:8001

**Categories**:
- Admin, Equity, Crypto, Economy, News

---

## 📚 Migration Guide

### Migrating Tools to MCP

**Before** (Direct tool):
```typescript
export const myTool = createTool({
  description: "Does something",
  args: z.object({ input: z.string() }),
  handler: async (ctx, args) => {
    return "result";
  },
});
```

**After** (MCP + wrapper):
1. Create MCP tool in server
2. Create wrapper that calls MCP server
3. Update imports

### Creating New MCP Server

1. Copy template
2. Implement tools
3. Test locally
4. Register with Convex
5. Create wrappers

---

## 🧪 Testing Strategy

### Unit Tests
- MCP server logic
- Subagent behavior
- Delegation infrastructure
- Tool wrappers

### Integration Tests
- Coordinator → subagent delegation
- MCP communication
- Planning/memory workflows

### E2E Tests
- "Research AAPL and create dossier"
- "Compare TSLA vs RIVN"
- "Find biotech companies"
- "Create newsletter"

---

## 🚀 Deployment Plan

### Local Development
- stdio transport
- Fast iteration

### Staging
- HTTP/SSE transport
- Load balancer
- Monitoring

### Production
- Auto-scaling (2-10 instances)
- Health checks
- Logging aggregation

---

## 👥 Team Responsibilities

- **Core Team**: Infrastructure, coordinator, delegation
- **Document Team**: Document subagent
- **Media Team**: Media subagent
- **Finance Team**: SEC & OpenBB subagents
- **Data Team**: Data access server
- **Research Team**: Research server
- **Content Team**: Newsletter server
- **QA Team**: E2E testing
- **DevOps Team**: Deployment

---

## 📊 Success Metrics

### Performance
- Agent response: < 5s (simple), < 30s (complex)
- MCP latency: < 100ms
- Delegation overhead: < 500ms

### Quality
- Test coverage: > 90%
- Error rate: < 1%
- Agent success: > 95%

---

## 🔄 Rollback Plan

1. **Immediate**: Revert coordinator, disable MCP
2. **Partial**: Disable specific servers
3. **Gradual**: Enable servers one at a time

---

## 📝 Notes

### Breaking Changes
- Import paths updated
- Tools via wrappers

### Future Enhancements
- More MCP servers
- Server versioning
- Caching layer
- Distributed tracing

---

**End of Changelog**
