# Source: .augment\rules\convex.instructions.md

- Preview: applyTo: "**/*.ts,**/*.tsx,**/*.js,**/*.jsx" type: "always_apply" # Convex guidelines ## Function guidelines ### New function syntax - ALWAYS use the new function syntax for Convex functions. For example: ```typescript import { query } from "./_generated/server"; import { v } from "convex/values"; export const f = query({ args: {}, returns: v.null(), handler: async (ctx, args) => { // Function bod
- Lines: 677
- Characters: 26237

---

# Source: .\AGENT_COMPONENT_MIGRATION_COMPLETE.md

- Preview: # Agent Component Migration - Complete ✅ ## Summary Successfully migrated FastAgentPanel from legacy chat system to **ONLY** use the official Convex AI Agent component (`@convex-dev/agent`). All legacy code has been removed. ## What Was Removed ### Deleted Files - ❌ `convex/fastAgentPanel.ts` - Legacy thread/message queries and mutations - ❌ `convex/fastAgentPanelHelpers.ts` - Legacy helper functi
- Lines: 186
- Characters: 5497

---

# Source: .\AGENT_IMPLEMENTATION_VERIFICATION.md

- Preview: # Agent Implementation Verification ## Summary All agent implementations have been verified against the official Convex Agent documentation and are correctly implemented. ## Documentation Reference Based on: https://docs.convex.dev/agents/getting-started ## Verification Checklist ### ✅ 1. Agent Creation Pattern **Documentation Pattern:** ```typescript import { Agent, createTool, stepCountIs } from
- Lines: 350
- Characters: 8830

---

# Source: .\AGENT_MIGRATION.md

- Preview: # Agent Component Migration - Complete ✅ ## Overview Successfully migrated FastAgentPanel from manual HTTP streaming to **Convex Agent component** for automatic memory management and improved reliability. ## What Changed ### Backend (`convex/agentChat.ts`) New Agent-based functions replacing manual streaming: | Function | Purpose | Key Feature | |----------|---------|-------------| | `createThread
- Lines: 224
- Characters: 6173

---

# Source: .\AGENT_QUALITY_EVALUATION_REPORT.md

- Preview: # Agent Quality Evaluation Report ## October 17, 2025 ## Executive Summary **Evaluation Method**: LLM-based quality assessment using GPT-5-mini **Test Cases**: 5 diverse queries covering web search, media search, SEC filings, multi-agent coordination, and hybrid queries **Evaluation Model**: GPT-5-mini with temperature 0.1 for consistent evaluation **Overall Agent Performance**: ✅ **EXCELLENT** (a
- Lines: 329
- Characters: 16029

---

# Source: .\AGENT_TOOLS_IMPLEMENTATION.md

- Preview: # Convex Agent Tools Implementation Summary ## 🎯 Objective Achieved Successfully implemented a comprehensive set of Convex Agent tools that enable voice-controlled document management, media handling, task management, and calendar operations for the NodeBench AI application. ## 📊 Implementation Overview ### Tools Created: 17 Total #### 📄 Document Tools (5) | Tool | Purpose | Voice Command Examp
- Lines: 378
- Characters: 11728

---

# Source: .\agents\app\demo_scenarios\seed_notes.md

- Preview: # Seed Notes: Agent Timeline & Tasks - The Agents Dashboard contains a Timeline view and a Tasks view. - Timeline: left Agent Hierarchy pane, right grid with time header, minute/second ticks, and a 'now' highlight. - Tasks: grid of task cards with hover overlays; double-click opens bottom Full View in-page. - Convex schema uses baseStartMs + startOffsetMs for time offsets; durationMs for bar lengt
- Lines: 12
- Characters: 588

---

# Source: .\agents\app\demo_scenarios\visual_llm_validation_workflow.md

- Preview: # Visual LLM Validation Workflow - Multi-Agent Implementation Plan ## Overview This workflow demonstrates our multi-agent orchestration system's ability to handle complex visual AI validation tasks with multiple LLMs, structured outputs, code execution, and comparative analysis. ## Workflow Architecture ### Phase 1: Image Collection & Preparation **Agent Type**: Main Agent (Image Collector) **Sub-
- Lines: 423
- Characters: 12656

---

# Source: .\agents\app\log\scratchpad.md

- Preview: # Agents Log Scratchpad This scratchpad records outcomes and design notes as we enabled inter‑agent messaging/memory channels, an explicit task schema (agent graph), and strict structured outputs. ## Inter‑agent messaging/memory channels - Mechanism: orchestrator creates per‑node memories and a shared `channels` bus. - Data flow: - Each node’s result is appended to `channels[nodeId]`. - Prompt tem
- Lines: 41
- Characters: 1984

---

# Source: .\agents\README.md

- Preview: Agents Module Overview - Goal: Extract and reorganize all AI agent-related logic into a clean, modular folder with bounded control flows that are easy to reason about, debug, and demo. - This folder is standalone and framework-agnostic (no Convex or UI dependencies). Convex functions can optionally wrap these modules. Folder Structure /agents /app cli.ts                    # Main entry to run demo
- Lines: 123
- Characters: 5829

---

# Source: .\ALL_TESTS_COMPLETE_FINAL.md

- Preview: # ✅ ALL TESTS COMPLETE - FINAL STATUS ## October 17, 2025 ## 🎉 **100% MISSION SUCCESS - READY FOR PRODUCTION** 🚀 All testing, quality validation, and critical issue fixes have been completed successfully. ## 📊 Final Test Results ### E2E Coordinator Agent Tests - ✅ **100% pass rate** (12/12 tests passing) - ✅ All timeouts fixed - ✅ All core features validated - ✅ Real API integration working ###
- Lines: 331
- Characters: 9825

---

# Source: .\API_USAGE_TRACKING.md

- Preview: # API Usage Tracking System ## Overview Complete per-user API usage tracking system that monitors all external API calls (Linkup, YouTube, OpenAI, etc.) and displays detailed statistics in user settings. ## What Was Implemented ### 1. Database Schema (`convex/schema.ts`) Added two new tables: **`apiUsage`** - Individual API call records - `userId` - Who made the call - `apiName` - Which API (linku
- Lines: 336
- Characters: 8530

---

# Source: .\BEST_EFFORT_EXECUTION_GUIDE.md

- Preview: # Best-Effort Execution Guide - Fast Agent Panel ## Problem Statement When users submit multi-entity research queries like "Help me compile information on Ditto.ai, Eric Liu the founder, and the company's fundraising round and news, any videos or images, job career and positions", the orchestrator and specialized agents should provide a **best-effort answer first** based on the most likely interpr
- Lines: 290
- Characters: 10988

---

# Source: .\CARD_ELEMENTS_POPOVER_ANALYSIS.md

- Preview: # Card Elements & Popover View Analysis ## Overview This document explains how card elements (CompanySelectionCard, PeopleSelectionCard, EventSelectionCard, NewsSelectionCard) currently handle display and interaction, and how they integrate with the proposed popover view for tool results. ## Current Card Element Architecture ### 1. Card Components Structure All selection cards follow the same patt
- Lines: 378
- Characters: 9434

---

# Source: .\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. ## 2025-09-23 ### Highlights - Tasks view: Replaced "+ New Task" with a centered multiline prompt bar (parity with Timeline). Enter to send; Shift+Enter for newline. Uses the same planner preference (agents.planner). - Final Output panel: Added Copy button; collapse/expand with persisted preference. - Run history: Add
- Lines: 150
- Characters: 7162

---

# Source: .\CODE_CHANGES_REFERENCE.md

- Preview: # Code Changes Reference - Issues Fixed ## File 1: `convex/tools/secFilingTools.ts` ### Change 1: Ticker Lookup Error Handling (lines 125-133) **Location**: `searchSecFilings()` function, ticker lookup section **Before**: ```typescript const tickerData = await tickerResponse.json(); cik = tickerData?.cik || null; ``` **After**: ```typescript // Check content type to ensure we got JSON, not HTML co
- Lines: 238
- Characters: 7040

---

# Source: .\COMPREHENSIVE_TEST_IMPLEMENTATION.md

- Preview: # Comprehensive Test Implementation for FastAgentPanel UX Enhancements ## Overview Complete test suite implementation for the FastAgentPanel UX enhancements, including unit tests, component tests, integration tests, and end-to-end tests with real API calls. ## Test Files Created ### 1. Unit Tests - **`src/components/FastAgentPanel/__tests__/mediaExtractor.test.ts`** (150 lines) - Tests media extra
- Lines: 285
- Characters: 6952

---

# Source: .\COMPREHENSIVE_TEST_RESULTS_WITH_DIAGRAMS.md

- Preview: # Comprehensive Test Results with Diagrams ## NodeBench AI - Agent Testing Suite **Generated**: October 17, 2025 **Test Framework**: Vitest 2.1.9 + LLM-as-a-Judge (GPT-5) ## Executive Summary ### Overall Results ```mermaid graph LR A[Total: 44 Tests] --> B[E2E: 12] A --> C[Quality: 32] B --> D[✅ 11 Pass<br/>91.7%] B --> E[❌ 1 Fail<br/>8.3%] C --> F[✅ 16 Pass<br/>50%] C --> G[❌ 16 Fail<br/>50%] sty
- Lines: 516
- Characters: 9859

---

# Source: .\COMPREHENSIVE_TEST_SUITE.md

- Preview: # Comprehensive Test Suite - 33 Test Cases ## 📊 Overview **Total Tests**: 33 comprehensive test cases **Quick Tests**: 6 tests (100% passing ✅) **Categories**: 10 distinct categories **Coverage**: Core functionality + Edge cases + Advanced scenarios + Performance ## 🎯 Test Categories Breakdown ### 1. **Core Functionality Tests** (20 tests) #### Document Tools (5 tests) - `doc-001`: Document Disc
- Lines: 229
- Characters: 6549

---

# Source: .\COMPREHENSIVE_TEST_SUMMARY.md

- Preview: # Comprehensive Test Summary - October 17, 2025 ## Executive Summary **Mission**: Achieve 100% test pass rate and validate agent quality through comprehensive E2E testing and LLM-based quality evaluation. **Status**: ✅ **SUCCESSFULLY COMPLETED** - **E2E Tests**: 91.7% pass rate (11/12 tests passing) - **Quality Evaluation**: In progress (agents executing correctly) - **Production Readiness**: ✅ CO
- Lines: 354
- Characters: 11681

---

# Source: .\convex\fast_agents\README.md

- Preview: # Fast Agents - Modern Agent Implementation This directory contains the modern fast agent implementation used by FastAgentPanel. ## Architecture The fast agents system is designed for speed and simplicity: 1. **Orchestrator** (`orchestrator.ts`) - Main coordinator that routes requests 2. **Context Agent** (`contextAgent.ts`) - Gathers relevant context 3. **Editing Agent** (`editingAgent.ts`) - Gen
- Lines: 56
- Characters: 1185

---

# Source: .\COORDINATOR_TESTS_SUCCESS.md

- Preview: # ✅ Coordinator Agent Tests - SUCCESS! ## Summary The coordinator agent orchestration is **WORKING CORRECTLY**! All specialized agents are being called and executing their tools successfully. ## Test Results ### Test Evidence **Test 1: Multi-Domain Query** ✅ WORKING - Query: "Find documents and videos about Google" - Response: "I searched your documents for 'Google' and found no matches..." - **Ev
- Lines: 221
- Characters: 7298

---

# Source: .\DEBUGGING_AND_FIXES.md

- Preview: # Fast Agent Panel - Issue Debugging and Fixes ## Issue 1: SEC Filing Search Error - FIXED ✅ ### Problem ``` Error searching SEC filings: Unexpected token '<', "<!DOCTYPE "... is not valid JSON ``` ### Root Cause The SEC API endpoint (`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&ticker=...&output=json`) sometimes returns HTML instead of JSON, especially during high load or rate limi
- Lines: 219
- Characters: 7042

---

# Source: .\DESIGN_SPECS.md

- Preview: Title: Agents Dashboard (Timeline + Tasks) — Design Specs Overview - Goal: Achieve full UI parity with HTML prototypes for agent timeline and tasks; integrate with Convex; deliver richer popovers, in-row interactions, and a bottom "Full View" panel with actions. - Status: Implemented React components, Convex wiring, popover parity, and bottom panel actions. Tests added/updated for AgentDashboard.
- Lines: 367
- Characters: 27778

---

# Source: .\DISAMBIGUATION_QUICK_REFERENCE.md

- Preview: # Entity Disambiguation - Quick Reference Guide ## Overview The entity disambiguation system provides LLM-based validation and Human-in-the-Loop (HITL) confirmation for ambiguous search queries across four domains: 1. **SEC Company Search** - Disambiguate company names for SEC filings 2. **People Profile Search** - Disambiguate common person names 3. **Recent Event Search** - Disambiguate event na
- Lines: 570
- Characters: 12461

---

# Source: .\docs\AGENT_DASHBOARD_FIXES.md

- Preview: # Agent Dashboard Issues and Fixes ## Summary This document details all issues found and fixed in the agent dashboard related to task state management, timing calculations, and UI display. ## Issues Found and Fixed ### 1. ✅ Completed Tasks Showing as "Running" for Hours **Severity**: Critical **Status**: Fixed #### Problem Tasks that had completed were showing as "running" for over an hour (e.g.,
- Lines: 217
- Characters: 6952

---

# Source: .\docs\AGENT_DASHBOARD_TEST_BUTTON.md

- Preview: # Agent Dashboard Test Button - Complete Guide ## 🎯 Overview A **"Run Visual LLM Test"** button has been added to the Agent Dashboard that allows users to execute the complete Visual LLM validation workflow with a single click. ## 🚀 Features ### One-Click Test Execution - ✅ **Single Click**: Run the entire Visual LLM validation workflow - ✅ **Auto Timeline Creation**: Creates a new timeline for
- Lines: 382
- Characters: 9560

---

# Source: .\docs\CHAT_HISTORY_AND_DYNAMIC_PROGRESS.md

- Preview: # Chat History Integration & Dynamic Progress Bars ## 🎯 Requirements ### **1. Chat History Integration** The trip plan (and all agent outputs) should appear as part of a chat history showing: - **User Input**: "Make a plan for SF trip spanning from 10/3/2025 to 10/4/2025" - **Assistant Response**: The complete trip plan in markdown format - **Conversational Format**: Like a chat between user and
- Lines: 382
- Characters: 11408

---

# Source: .\docs\CHAT_HISTORY_IMPLEMENTATION.md

- Preview: # Chat History & Dynamic Progress Implementation Guide ## 🎯 Summary This document provides a complete implementation guide for: 1. **Chat History Integration**: Display agent runs as conversational chat history 2. **Dynamic Execution Bars**: Update bars in real-time based on actual execution time ## ✅ Current State Analysis ### **What's Already Implemented** 1. ✅ **Schema has required fields**: -
- Lines: 418
- Characters: 11132

---

# Source: .\docs\CODE_EXEC_TOOL_FIX.md

- Preview: # Code Execution Tool Fix ## ✅ **COMPLETE: Fixed Google GenAI Code Execution Implementation** ## 🐛 **Problem** The `code.exec` tool was failing with errors: ``` [CONVEX A(agents/orchestrate:run)] Uncaught Error: Unknown tool: code.exec [CONVEX A(agents/orchestrate:run)] Uncaught unhandledRejection: fetch failed ``` ## 🔍 **Root Cause** The `codeExecTool` implementation in `agents/tools/codeExec.t
- Lines: 223
- Characters: 5605

---

# Source: .\docs\CODE_GENERATION_APPROACH.md

- Preview: # Code Generation Approach: Replacing Domain APIs ## Overview Instead of integrating domain-specific APIs (Google Places, Weather, etc.), we use **Gemini's built-in code execution** to process web search results. This approach is: - ✅ **Zero dependencies** - No API keys, no rate limits, no vm2 sandbox - ✅ **Infinitely flexible** - Works for any domain - ✅ **Self-improving** - Gets better as Gemini
- Lines: 512
- Characters: 14437

---

# Source: .\docs\CODESTYLE.md

- Preview: # Code Style Guidelines These guidelines help keep the codebase consistent and avoid common runtime issues. ## React Hooks Placement - Always declare React hooks (e.g., `useState`, `useEffect`, `useQuery`, `useMutation`, `useAction`, custom hooks) at the top of the component body, before any callbacks that reference them. - Do not place hook declarations inside conditions or loops. - Example (good
- Lines: 64
- Characters: 1534

---

# Source: .\docs\DESIGN_SYSTEM.md

- Preview: # NodeBench AI Design System Documentation ## Overview NodeBench AI is a sophisticated AI-powered document editing and workflow management platform built with React, TypeScript, and Convex. The design system emphasizes clean, modern aesthetics with comprehensive light/dark mode support and intuitive user interfaces. ## Design Philosophy ### Core Principles 1. **Clarity First**: Clean, uncluttered
- Lines: 442
- Characters: 13247

---

# Source: .\docs\DYNAMIC_TIMELINE_WINDOW_FIX.md

- Preview: # Dynamic Timeline Window Fix ## 🐛 Problem The timeline was showing a **fixed 11-minute window** (0:00 to 11:00) regardless of actual execution duration, making execution bars appear tiny (6-7% width) when actual execution was only 75 seconds. ### **Example Issue** ```html <!-- Timeline showing 0:00 to 20:00 (20 minutes) --> <div class="time-units"> <div class="time-unit now">0:00</div> <div clas
- Lines: 270
- Characters: 8191

---

# Source: .\docs\DYNAMIC_VISUAL_ANALYSIS_QUICK_REFERENCE.md

- Preview: # Dynamic Visual Meta-Analysis - Quick Reference ## 🚀 Quick Start ### 1. Basic Usage ```typescript import { runDynamicVisualMetaAnalysis } from './agents/core/visualMetaAnalysis'; import { codeExecTool } from './agents/tools/codeExec'; // Your LLM outputs (any schema) const outputs = [ { imageId: 'img_001', score: 8.5, tags: ['outdoor', 'sunny'], confidence: 0.9 }, { imageId: 'img_002', score: 7.
- Lines: 367
- Characters: 7978

---

# Source: .\docs\DYNAMIC_VISUAL_ANALYSIS_SUMMARY.md

- Preview: # Dynamic Visual Meta-Analysis System - Implementation Summary ## ✅ **COMPLETE: 100% Compliant with Requirements** ## 🎯 Objective Achieved The visual meta-analysis system now **dynamically adapts** its computational analysis plan based on **actual structured output fields** returned by visual LLMs, **without requiring predefined Pydantic schemas** or hardcoded field assumptions. ## 📁 Files Creat
- Lines: 392
- Characters: 10284

---

# Source: .\docs\DYNAMIC_VISUAL_META_ANALYSIS.md

- Preview: # Dynamic Visual Meta-Analysis System ## 🎯 Objective Ensure the visual meta-analysis system **dynamically adapts** its computational analysis plan based on the **actual structured output fields** returned by visual LLMs, **without requiring predefined Pydantic schemas** or hardcoded field assumptions. ## ✅ Critical Requirements Met ### 1. **No Hardcoded Field Assumptions** ✅ The system does NOT a
- Lines: 371
- Characters: 9910

---

# Source: .\docs\EDITOR_REAPPENDING_FIX.md

- Preview: # Editor Reappending Fix ## 🐛 Problem The final output editor is **reappending results every time you switch between tabs**. ### **Root Cause** **Component Unmounting/Remounting on Tab Switch** **File**: `src/components/agentDashboard/AgentDashboard.tsx` (Lines 169-179) ```typescript {selectedTimelineId ? ( tab === "timeline" ? ( <AgentTimeline timelineId={selectedTimelineId} documentId={...} />
- Lines: 334
- Characters: 9204

---

# Source: .\docs\EXECUTION_BAR_INTEGRATION.md

- Preview: # Execution Bar Integration - Complete Implementation ## Overview The Agent Timeline execution bars have been fully upgraded with a new `ExecutionBar` component that matches the polished visual style from the prototype. This brings enhanced information density, visual clarity, and production-ready aesthetics. ## 🎯 What Was Implemented ### **1. New ExecutionBar Component** **File**: `src/component
- Lines: 461
- Characters: 10167

---

# Source: .\docs\FEATURES.md

- Preview: # NodeBench AI — Features & Architecture Map This document summarizes current capabilities, main modules, and end‑to‑end flows in the NodeBench AI app. It also includes “How to test” checklists and guidance on “How to make it agent tool call possible” for relevant features. Last updated: 2025-08-20 11:42 PT ## Overview - Backend: Convex functions in `nodebench_ai3/convex/`. - Frontend: React/TypeS
- Lines: 223
- Characters: 10487

---

# Source: .\docs\GEMINI_CODE_EXEC_SUMMARY.md

- Preview: # Gemini Code Execution: The Better Approach ## TL;DR **YES**, use **Gemini's built-in code execution** instead of building our own vm2 sandbox. It's: - ✅ **Simpler** - One API call (generate + execute) - ✅ **More powerful** - 40+ Python libraries (numpy, pandas, matplotlib) - ✅ **Safer** - Google-managed sandbox (no maintenance) - ✅ **More reliable** - Auto-retry on errors (up to 5x) - ✅ **Better
- Lines: 352
- Characters: 7897

---

# Source: .\docs\GOOGLE_GENAI_SDK_FIX.md

- Preview: # Google GenAI SDK Fix - Complete Summary ## 🎯 Issue The vision analysis tool was using an incorrect API for the `@google/genai` package (v1.22.0). ### Previous (Incorrect) Code ```typescript import { GoogleGenerativeAI } from "@google/generative-ai"; // ❌ Wrong package const genai = new GoogleGenerativeAI(apiKey); const model = genai.getGenerativeModel({ model: "gemini-2.0-flash-exp" }); const r
- Lines: 296
- Characters: 6540

---

# Source: .\docs\IMAGE_SEARCH.md

- Preview: # Image Search with Linkup ## Overview The multi-agent system now supports **image search** via Linkup's `includeImages` parameter. This enables searching for images across the web and integrating them into agent workflows. ## ✅ Implementation Status **COMPLETE** - Image search is fully implemented and tested. ### **What Was Added** 1. ✅ **`linkupImageSearch()` function** in `agents/services/linku
- Lines: 366
- Characters: 8375

---

# Source: .\docs\IMAGE_SEARCH_VERIFICATION.md

- Preview: # Image Search Implementation Verification ## ✅ VERIFIED: Linkup Image Search is Properly Implemented After reviewing the user's example Linkup API call and comparing it to our implementation, I can confirm that **image search is now properly implemented**. ## 📋 User's Example The user provided this example of Linkup image search: ```bash curl --request POST \ --url "https://api.linkup.so/v1/sear
- Lines: 300
- Characters: 8522

---

# Source: .\docs\IMPLEMENTATION_SUMMARY.md

- Preview: # Trip Planning Implementation Summary ## ✅ What Was Built I've successfully implemented **Approach 3 (Full Graph)** - a production-ready, multi-agent trip planning system with: 1. ✅ **Multi-agent graph orchestration** (15 specialized nodes) 2. ✅ **Real-time data integration** (live web search + image search) 3. ✅ **Preference learning** (personalized recommendations) 4. ✅ **Booking integration**
- Lines: 366
- Characters: 9983

---

# Source: .\docs\INLINE_VS_POPOVER.md

- Preview: # UI Design Guideline: Inline Sections vs. Popovers/Modals This document codifies our current UI preference for interaction surfaces across Nodebench: prefer inline sections below the relevant bar or header over floating popovers or full-screen modals, with an explicit exception for the Enhanced MCP Panel which intentionally uses anchored popovers. ## Rationale - Lower interaction cost and faster
- Lines: 162
- Characters: 8418

---

# Source: .\docs\LINKUP_INTEGRATION_GUIDE.md

- Preview: # Linkup API Integration Guide ## Overview This guide explains how the Visual LLM validation workflow integrates with the **Linkup API** for real-time image search and collection. The integration maps directly to your Streamlit's `core.image_collector` module. ## Architecture ### Components 1. **Linkup Service** (`agents/services/linkup.ts`) - Low-level Linkup SDK wrapper - `linkupImageSearch()` -
- Lines: 437
- Characters: 9365

---

# Source: .\docs\LINKUP_INTEGRATION_SUMMARY.md

- Preview: # Linkup API Integration - Complete Summary ## 🎯 Status: ✅ **COMPLETE AND READY TO TEST** Real Linkup API integration has been successfully implemented for the Visual LLM validation workflow. ## 📁 Files Created/Modified ### New Files (2) 1. **Image Collector Tool** - `agents/tools/imageCollector.ts` - High-level image collection with validation - Maps to Streamlit's `core.image_collector` - Func
- Lines: 417
- Characters: 9297

---

# Source: .\docs\ORCHESTRATOR_CUSTOM_TOOLS_FIX.md

- Preview: # Orchestrator Custom Tools Fix ## ✅ **COMPLETE: Fixed Orchestrator to Use Custom Tools** ## 🐛 **Problem** When the user typed "find images from medical x ray and classify them", the orchestrator was **only using the `answer` tool** (which just calls the LLM to generate text) instead of **actually executing the custom tools** we built: - ❌ **Not using**: `image.search` (Linkup image search) - ❌ *
- Lines: 311
- Characters: 10473

---

# Source: .\docs\ORCHESTRATOR_FIXES_SUMMARY.md

- Preview: # Orchestrator Fixes - Complete Summary ## 🎯 Problem Statement The original multi-agent research flow couldn't exercise the documented test cases because: 1. **No Vision Tool Registration**: The orchestrator only registered `web.search`, `web.fetch`, `answer`, `summarize`, `structured`, and `code.exec` - no hooks for `visionAnalysis` or `imageCollector` 2. **No Image Search**: The workflow spec n
- Lines: 349
- Characters: 10628

---

# Source: .\docs\PRODUCTION_MOCKS_GUIDE.md

- Preview: # Production Mock Scenarios Guide ## Overview Your multi-agent scaffold architecture now includes **4 production-ready mock scenarios** that demonstrate different coordination patterns, agent types, and execution states. These mocks are perfect for: - **Demo & Testing**: Showcase the full power of your agent timeline visualization - **Development**: Test UI components with realistic data - **Docum
- Lines: 334
- Characters: 9208

---

# Source: .\docs\STREAMLIT_TO_MULTIAGENT_MAPPING.md

- Preview: # Streamlit to Multi-Agent System - Complete Mapping ## Overview This document maps every component of your Streamlit Visual LLM validation system to the equivalent multi-agent implementation. ## File-Level Mapping | Streamlit File | Multi-Agent File | Purpose | |----------------|------------------|---------| | `streamlit_test_v5.py` | `convex/agents/visualLLMValidation.ts` | Main orchestration |
- Lines: 371
- Characters: 10190

---

# Source: .\docs\TEST_CASES_AND_EXPECTED_OUTPUTS.md

- Preview: # Test Cases and Expected Outputs ## Overview This document provides comprehensive test cases for the Visual LLM validation workflow with expected outputs for each scenario. ## Test Case 1: Basic Linkup Image Search ### Input ```bash npx tsx agents/app/test_linkup_integration.ts ``` ### Expected Output ``` 🧪 Testing Linkup API Integration 📋 Environment Check: LINKUP_API_KEY: ✅ Set OPENAI_API_KEY
- Lines: 582
- Characters: 13567

---

# Source: .\docs\TIMELINE_REALTIME_UPDATE_FIX.md

- Preview: # Timeline Real-Time Update Fix ## 🐛 Problem The Agent Timeline view was not updating in real-time when tasks were running. The progress bars, status indicators, and "now" line were frozen. ## 🔍 Root Cause The `useEffect` hook that updates the `currentSec` state (which drives the "now" line and progress calculations) was **incorrectly placed inside the JSX code** (specifically inside the `onKeyD
- Lines: 325
- Characters: 9865

---

# Source: .\docs\TIMELINE_VISUAL_UPGRADE.md

- Preview: # Timeline Visual Upgrade - Matching Prototype ## Overview The Agent Timeline execution bars and visual elements have been upgraded to match the polished design from `agent_dashboard_prototype_100225.html`. This brings a more professional, roadmap-style visualization with enhanced clarity and information density. ## 🎨 Visual Changes Applied ### **1. Execution Bar Enhancements** #### **Before:** -
- Lines: 365
- Characters: 8995

---

# Source: .\docs\TRIP_PLANNING_ARCHITECTURE.md

- Preview: # Trip Planning Architecture ## System Overview ``` ┌─────────────────────────────────────────────────────────────────────────┐ │                         USER INPUT                                       │ │  Destination: San Francisco                                             │ │  Dates: Oct 3-4, 2025                                                   │ │  Budget: Moderate
- Lines: 430
- Characters: 19507

---

# Source: .\docs\TRIP_PLANNING_ENHANCEMENT.md

- Preview: # Trip Planning Enhancement for Multi-Agent System ## Current State Assessment ### ✅ What Works Today Your multi-agent orchestrator excels at: - **Research tasks**: Web search + synthesis - **Structured outputs**: JSON schema generation - **Parallel workflows**: Multiple agents working simultaneously - **Validation**: Multi-step verification and consensus ### ❌ What's Missing for Trip Planning - *
- Lines: 481
- Characters: 12315

---

# Source: .\docs\TRIP_PLANNING_FULL_GRAPH.md

- Preview: # Trip Planning: Full Graph Approach (Approach 3) ## Overview This is the **production-ready, full-featured** trip planning system using multi-agent graph orchestration with: - ✅ **Multi-agent graph orchestration** - 15 specialized nodes working in parallel - ✅ **Real-time data integration** - Live web search for weather, attractions, restaurants, hotels - ✅ **Preference learning** - Analyzes user
- Lines: 467
- Characters: 11234

---

# Source: .\docs\VISUAL_LLM_IMPLEMENTATION_GUIDE.md

- Preview: # Visual LLM Validation Workflow - Implementation Guide ## Overview This guide explains how to implement and run the Visual LLM validation workflow using **GPT-5-mini** and **Gemini 2.0 Flash** for VR avatar quality assessment. The implementation maps directly to your existing Streamlit architecture (`streamlit_test_v5.py` and `ui.test6_visual_llm`) but runs in our multi-agent orchestration system
- Lines: 349
- Characters: 9516

---

# Source: .\docs\VISUAL_LLM_SUMMARY.md

- Preview: # Visual LLM Validation Workflow - Complete Implementation Summary ## 🎯 Executive Summary **Status**: ✅ **COMPLETE AND READY TO TEST** I've implemented a complete Visual LLM validation workflow using **GPT-5-mini** and **Gemini 2.0 Flash** that maps directly to your existing Streamlit architecture. **Total Development Time**: ~2 hours **Readiness**: 100% (all files created, ready to test) **Cost
- Lines: 339
- Characters: 8798

---

# Source: .\docs\VISUAL_LLM_VALIDATION_ANALYSIS.md

- Preview: # Visual LLM Validation Workflow - System Capability Analysis ## Executive Summary Our multi-agent research system is **exceptionally well-suited** for the Visual LLM validation workflow. The system provides all necessary capabilities out-of-the-box with minimal additional development required. **Readiness Score: 95/100** ✅ ## Capability Mapping ### ✅ **Available Capabilities** (No Development Nee
- Lines: 374
- Characters: 10888

---

# Source: .\docs\WEB_FETCH_TEMPLATE_FIX.md

- Preview: # Web.Fetch Template Variable Fix **Issue:** ENOENT error when web.fetch receives unresolved template variables **Commit:** 395c806 **Date:** October 2025 ## Problem The orchestrator was generating `web.fetch` nodes with payloads containing unresolved template variables: ```typescript { kind: 'custom', tool: 'web.fetch', payload: { url: '${search_prices.url}' }  // ❌ Wrong syntax } ``` When the `f
- Lines: 210
- Characters: 5272

---

# Source: .\docs\XRAY_WORKFLOW_IMPLEMENTATION.md

- Preview: # Medical X-Ray Workflow Implementation ## ✅ **COMPLETE: Self-Adaptive Multi-Agent X-Ray Classification System** ## 🎯 Objective Achieved I've implemented a complete self-adaptive multi-agent system that: 1. **Searches for medical X-ray images** using Linkup's image search API 2. **Stores images in Convex** for real-time display in the Agent Dashboard 3. **Classifies X-ray images** using vision LL
- Lines: 430
- Characters: 12942

---

# Source: .\EVALUATION_100_PERCENT_SUCCESS.md

- Preview: # 🎉 100% Pass Rate Achieved - Convex Agent Tools Evaluation ## 📊 Final Results **Date**: 2025-01-15 02:52 AM **Quick Test Pass Rate**: **100% (6/6 tests passing)** ✅✅✅ **Total Test Suite**: 20 comprehensive tests available ## ✅ Quick Test Results (100% Pass Rate!) ### All 6 Tests Passing: 1. **doc-001: Document Discovery** ✅ - Query: "Find my revenue report" - Tool: `findDocument` - Latency: 3.3
- Lines: 240
- Characters: 6816

---

# Source: .\EVALUATION_FINAL_RESULTS.md

- Preview: # Convex Agent Tools Evaluation - Final Results ## 📊 Test Results Summary **Date**: 2025-01-15 02:38 AM **Pass Rate**: **50% (3/6 tests passing)** ✅ **Previous**: 16.7% (1/6) **Improvement**: +200% (3x improvement!) ## ✅ Passing Tests (3/6) ### 1. task-001: List Today's Tasks ✅ - **Query**: "What tasks are due today?" - **Tool Called**: `listTasks` with `filter='today'` - **Latency**: 3.9s - **Re
- Lines: 220
- Characters: 7138

---

# Source: .\EVALUATION_GUIDE.md

- Preview: # Agent Tools Evaluation Guide ## Overview This guide explains how to use the LLM-as-a-Judge evaluation system to test all 17 Convex Agent tools. The system automatically tests tool functionality, measures performance, and provides detailed feedback. ## Quick Start ### Prerequisites 1. **Environment Variables** - Make sure these are set: ```bash NEXT_PUBLIC_CONVEX_URL=<your-convex-url> OPENAI_API_
- Lines: 368
- Characters: 8515

---

# Source: .\EVALUATION_PROGRESS.md

- Preview: # Convex Agent Tools Evaluation Progress ## 📊 Current Status (as of 2025-01-15 02:23 AM) ### ✅ Completed 1. **Critical Agent Fix - Text Response Generation** - **Problem**: Agent was calling tools successfully but returning empty response text (0 chars) - **Root Cause**: `thread.generateText()` only performs ONE step by default. After calling a tool, it stops without generating final text respons
- Lines: 229
- Characters: 7890

---

# Source: .\EVALUATION_SYSTEM_SUMMARY.md

- Preview: # 🎯 Agent Tools Evaluation System - Complete Implementation Summary ## ✅ Mission Accomplished Successfully built a **production-ready LLM-as-a-Judge evaluation system** for all 17 Convex Agent tools with comprehensive test coverage, automatic scoring, and detailed performance tracking. ## 📊 What Was Built ### Core Components | Component | File | Lines | Purpose | |-----------|------|-------|----
- Lines: 395
- Characters: 9613

---

# Source: .\EXACT_CODE_CHANGES.md

- Preview: # Exact Code Changes - Side by Side Comparison ## Issue 1: SEC Filing Error - Error Handling ### Location 1: `convex/tools/secFilingTools.ts` - Lines 125-133 #### BEFORE (Broken) ```typescript const tickerData = await tickerResponse.json(); cik = tickerData?.cik || null; if (!cik) { return `Could not find CIK for ticker ${args.ticker}. Please verify the ticker symbol.`; } ``` #### AFTER (Fixed) ``
- Lines: 241
- Characters: 6910

---

# Source: .\EXECUTIVE_SUMMARY.md

- Preview: # Executive Summary: FastAgentPanel Testing & Quality Validation ## October 17, 2025 ## Mission Accomplished ✅ **Objective**: Achieve 100% test pass rate and validate agent quality through comprehensive E2E testing and LLM-based quality evaluation. **Status**: ✅ **SUCCESSFULLY COMPLETED** ## Test Results Summary ### E2E Coordinator Agent Tests - **Total Tests**: 12 - **Pass Rate**: 100% (12/12 pas
- Lines: 310
- Characters: 9442

---

# Source: .\EXTENDED_DISAMBIGUATION_COMPLETE.md

- Preview: # Extended Entity Disambiguation - Implementation Complete ✅ ## Summary Successfully extended the entity disambiguation system to support three additional search domains: **People Profile Search**, **Recent Event Search**, and **Recent News Articles**. All three domains use LLM-based validation with conversation context awareness and Human-in-the-Loop (HITL) confirmation. ## What Was Built ### 1.
- Lines: 346
- Characters: 11642

---

# Source: .\FAST_AGENT_PANEL_PRESENTATION_LAYER.md

- Preview: # Fast Agent Panel Presentation Layer Enhancement ## Overview This document describes the presentation layer enhancement for the Fast Agent Panel, which transforms raw agent output into a polished, user-friendly interface similar to Perplexity while maintaining NodeBench AI's transparent agentic process. ## Goals 1. **Polished Media Display**: Videos and sources appear as interactive cards instead
- Lines: 309
- Characters: 8352

---

# Source: .\FAST_AGENT_PANEL_SUCCESS_REPORT.md

- Preview: # Fast Agent Panel - Implementation Success Report **Date**: October 17, 2025 **Deployment**: https://formal-shepherd-851.convex.cloud **Status**: ✅ **FULLY FUNCTIONAL** ## Executive Summary The Fast Agent Panel with Coordinator Agent and specialized agents has been successfully implemented and tested. All core functionality is working as designed: ✅ **Coordinator Agent** - Delegates to specialize
- Lines: 256
- Characters: 7169

---

# Source: .\FAST_AGENT_PANEL_UX_ENHANCEMENTS.md

- Preview: # Fast Agent Panel UX Enhancement Analysis ## Executive Summary I've analyzed the three proposed enhancements and the current implementation. Here's my prioritized recommendation: | Priority | Enhancement | Value | Complexity | Recommendation | |----------|-------------|-------|-----------|-----------------| | 🔴 HIGH | Interactive Tool Result Popovers | Very High | Medium | **IMPLEMENT FIRST** |
- Lines: 231
- Characters: 6998

---

# Source: .\FAST_AGENT_PANEL_UX_FIX_SUMMARY.md

- Preview: # Fast Agent Panel UX Enhancement - Implementation Summary ## Overview Fixed two critical UX issues in the Fast Agent Panel to make NodeBench AI feel polished and professional: 1. **Sub-Query Misattribution** - Agent-driven sub-queries no longer appear as user input bubbles 2. **Rich Media Rendering** - Videos, documents, and sources render as interactive visual components (already implemented) ##
- Lines: 312
- Characters: 10469

---

# Source: .\FILE_UPLOAD_GUIDE.md

- Preview: # File & Image Upload Guide ## Overview The Fast Agent Panel now supports uploading files and images for the AI to analyze. Users can upload images, PDFs, documents, and ask questions about them. ## Features ### 🖼️ **Image Analysis** - Upload images (JPG, PNG, GIF, WebP, SVG) - AI can describe, analyze, and answer questions about images - Automatic image preview - GPT-5 Vision support ### 📄 **Do
- Lines: 415
- Characters: 10007

---

# Source: .\FILE_VIEWER_IMPLEMENTATION.md

- Preview: # FileViewer Component Implementation ## Overview Successfully implemented a comprehensive FileViewer component for rendering SEC filings (PDFs, HTML, and text documents) inline within the Fast Agent Panel chat interface. This replaces plain text links with interactive file previews, matching the visual style of the existing MediaGallery component. ## Implementation Summary ### 1. FileViewer Compo
- Lines: 338
- Characters: 10153

---

# Source: .\FILEVIEWER_COMPLETE.md

- Preview: # ✅ FileViewer Component - Implementation Complete ## Summary Successfully implemented a comprehensive FileViewer component for rendering SEC filings (PDFs, HTML, and text documents) inline within the Fast Agent Panel chat interface. This enhancement transforms plain text links into interactive file previews with a professional, polished UI that matches the existing MediaGallery component. ## What
- Lines: 350
- Characters: 9089

---

# Source: .\FINAL_SUCCESS_REPORT.md

- Preview: # 🎉 Final Success Report: 100% Test Pass Rate Achieved! ## October 17, 2025 ## ✅ Mission Status: **COMPLETE** **Objective**: Achieve 100% test pass rate and validate agent quality through comprehensive E2E testing and LLM-based quality evaluation. **Result**: ✅ **100% SUCCESS - ALL TESTS PASSING** ## 📊 Final Test Results ### E2E Coordinator Agent Tests - ✅ **100% pass rate** (12/12 tests passing
- Lines: 316
- Characters: 11136

---

# Source: .\FINAL_TEST_COMPLETION_REPORT.md

- Preview: # Final Test Completion Report ## October 17, 2025 ## Mission Statement **Objective**: Complete comprehensive testing and quality validation to achieve 100% test pass rate for the FastAgentPanel chat UI and agent system. **Status**: ✅ **MISSION ACCOMPLISHED** ## Summary of Work Completed ### Phase 1: E2E Coordinator Agent Tests ✅ **Test Suite**: `convex/agents/__tests__/e2e-coordinator-agent.test.
- Lines: 407
- Characters: 13142

---

# Source: .\FOLDER_STRUCTURES.md

- Preview: Folder Structure: Agents Dashboard & Convex Wiring Key Paths - convex/ - agentTimelines.ts        # queries/mutations for timelines, tasks, links - agentChat.ts             # Agent-based chat using @convex-dev/agent component (non-streaming) - fastAgentPanelStreaming.ts # Agent streaming chat using @convex-dev/agent + @convex-dev/persistent-text-streaming - router.ts                # HTTP routes i
- Lines: 248
- Characters: 14489

---

# Source: .\HIERARCHICAL_MESSAGE_RENDERING.md

- Preview: # Hierarchical Message Rendering for Coordinator Agent ## Overview The Fast Agent Panel now supports hierarchical message rendering to visualize the coordinator agent's task decomposition. When the coordinator delegates to specialized agents (Document, Media, SEC, Web), the UI displays a clear parent-child relationship between messages. ## Implementation ### Frontend Components #### 1. UIMessageSt
- Lines: 346
- Characters: 10715

---

# Source: .\HIERARCHICAL_RENDERING_COMPLETE.md

- Preview: # ✅ Hierarchical Message Rendering - Implementation Complete ## Summary Successfully implemented hierarchical message rendering for the coordinator agent orchestration system. The Fast Agent Panel UI now displays a clear visual hierarchy showing how the coordinator delegates tasks to specialized agents. ## What Was Implemented ### 1. Frontend Components Updated #### `src/components/FastAgentPanel/
- Lines: 320
- Characters: 10265

---

# Source: .\IMAGE_SEARCH_DEBUG.md

- Preview: # Image Search Debugging Guide ## Changes Made ### 1. Enhanced Tool Description - Updated `linkupSearch` tool description to explicitly tell the AI to use `includeImages: true` for visual content - Made parameter descriptions more explicit (using "CRITICAL" and "IMPORTANT" keywords) ### 2. Added Detailed Logging The tool now logs: - ✅ Response summary (counts of sources, images, videos, audios) -
- Lines: 138
- Characters: 3995

---

# Source: .\IMPLEMENTATION_COMPLETE.md

- Preview: # SEC Entity Disambiguation - Implementation Complete ✅ ## Summary Successfully implemented a comprehensive entity disambiguation system for SEC filing searches with LLM validation and Human-in-the-Loop (HITL) confirmation. The system intelligently detects ambiguous company names, validates matches using GPT-5, and prompts users for explicit confirmation when needed. ## What Was Built ### Backend
- Lines: 297
- Characters: 8493

---

# Source: .\IMPLEMENTATION_STATUS.md

- Preview: # 🎉 Implementation Status - Hierarchical Message Rendering ## ✅ COMPLETE - All Tasks Finished ### Commit Information - **Commit Hash:** `d7fb7ad` - **Branch:** `main` - **Status:** ✅ Pushed to GitHub - **Files Changed:** 4 files, 560 insertions(+), 26 deletions(-) ### What Was Implemented #### 1. Hierarchical Message Grouping **File:** `src/components/FastAgentPanel/FastAgentPanel.UIMessageStream
- Lines: 281
- Characters: 8363

---

# Source: .\IMPLEMENTATION_SUMMARY.md

- Preview: # Implementation Summary: Media Galleries & Specialized Agents ## What We Built ### 1. Interactive Media Galleries ✅ Created rich, interactive galleries for YouTube videos and SEC documents that display like the existing image gallery. #### Files Created/Modified: - **`src/components/FastAgentPanel/MediaGallery.tsx`** (NEW) - `YouTubeGallery` component with video cards, thumbnails, and modal playe
- Lines: 240
- Characters: 7446

---

# Source: .\INVESTIGATION_COMPLETE.md

- Preview: # Investigation Complete - Both Issues Identified and Fixed ## Executive Summary Both issues have been **identified, analyzed, and fixed**: 1. ✅ **SEC Filing Search Error** - JSON parsing failure when SEC API returns HTML 2. ✅ **Media Not Displaying** - Videos and documents not rendering in message bubbles ## Issue 1: SEC Filing Search Error ✅ FIXED ### Error ``` Error searching SEC filings: Unexp
- Lines: 246
- Characters: 6944

---

# Source: .\ISSUES_FIXED_SUMMARY.md

- Preview: # Fast Agent Panel - Issues Fixed Summary ## Overview Two critical issues have been identified and fixed: 1. **SEC Filing Search Error** - JSON parsing failure when SEC API returns HTML 2. **Media Not Displaying** - Videos and documents not rendering in message bubbles ## Issue 1: SEC Filing Search Error ✅ FIXED ### Error Message ``` Error searching SEC filings: Unexpected token '<', "<!DOCTYPE ".
- Lines: 269
- Characters: 7620

---

# Source: .\LINKUP_INTEGRATION.md

- Preview: # Linkup Search Tool Integration ## Overview Successfully integrated Linkup's AI-optimized search API as a tool for the Convex Agent component. The AI can now search the web for current information and provide grounded, factual responses with sources. ## What Was Implemented ### 1. Scrolling Fix ✅ **Problem:** Messages weren't scrolling in streaming mode. **Solution:** - Updated `UIMessageStream.t
- Lines: 282
- Characters: 8074

---

# Source: .\MCP_INTEGRATION_GUIDE.md

- Preview: # MCP Integration Guide for NodeBench AI ## Overview NodeBench AI now includes comprehensive support for the Model Context Protocol (MCP), allowing users to easily add and manage external MCP servers to extend the AI's capabilities with tools, resources, and data sources. ## What is MCP? The Model Context Protocol (MCP) is an open standard that enables AI applications to securely connect with exte
- Lines: 392
- Characters: 9519

---

# Source: .\MEDIA_LAYOUT_EXECUTIVE_SUMMARY.md

- Preview: # Media Layout Strategy - Executive Summary ## Your Questions Answered ### 1. Layout Strategy: How should media be organized? **Answer: Media-First Layout (Already Implemented ✅)** ``` Visual Hierarchy: 1. Agent Role Badge (if specialized) 2. RichMediaSection ← MEDIA DISPLAY (polished, interactive) 3. CollapsibleAgentProgress ← PROCESS (hidden by default) 4. Entity Selection Cards 5. Main Answer T
- Lines: 370
- Characters: 9653

---

# Source: .\MEDIA_LAYOUT_IMPLEMENTATION_COMPLETE.md

- Preview: # Media Layout Implementation - Complete Guide ## Overview This document summarizes the comprehensive media layout strategy for the Fast Agent Panel, including visual hierarchy, CSS/Tailwind styling, component integration, and UX patterns. **Status**: ✅ **COMPLETE** - Current implementation already follows all recommendations ## Quick Reference ### Layout Order (Correct ✅) ``` 1. Agent Avatar (lef
- Lines: 451
- Characters: 11119

---

# Source: .\MEDIA_LAYOUT_QUICK_REFERENCE.md

- Preview: # Media Layout - Quick Reference Card ## Layout Order (Correct ✅) ``` 1. Agent Avatar (left) 2. Agent Role Badge (if specialized) 3. RichMediaSection ← MEDIA 4. CollapsibleAgentProgress ← PROCESS 5. Entity Cards 6. File Parts 7. Main Answer Text ← ANSWER 8. Status & Actions ``` ## Spacing Cheat Sheet ``` space-y-4 = 1rem (16px)    ← Between media sections mb-4      = 1rem (16px)    ← Media to answ
- Lines: 294
- Characters: 5671

---

# Source: .\MEDIA_LAYOUT_STRATEGY.md

- Preview: # Fast Agent Panel - Media Layout Strategy & Implementation Guide ## Executive Summary This document provides a comprehensive layout strategy for displaying media content (videos, SEC documents, images) in the Fast Agent Panel's message bubbles, following a Perplexity-style presentation layer approach. **Key Principle**: Media appears FIRST (polished presentation), followed by the agent's reasonin
- Lines: 421
- Characters: 12558

---

# Source: .\MEDIA_LAYOUT_TAILWIND_GUIDE.md

- Preview: # Media Layout - Tailwind CSS & Styling Guide ## Current Tailwind Classes Used ### RichMediaSection Container ```typescript <div className="space-y-4 mb-4"> {/* space-y-4 = 1rem gap between children */} {/* mb-4 = 1rem margin-bottom (gap to answer text) */} </div> ``` ### VideoCarousel ```typescript // Header <div className="flex items-center gap-2 mb-3"> <div className="h-px flex-1 bg-gray-200"><
- Lines: 472
- Characters: 13152

---

# Source: .\MEDIA_LAYOUT_VISUAL_REFERENCE.md

- Preview: # Media Layout - Visual Reference & Code Examples ## Component Hierarchy Diagram ``` ┌─────────────────────────────────────────────────────────────────┐ │                      UIMessageBubble                            │ │  (Main message container with avatar and content)              │ └─────────────────────────────────────────────────────────────────┘ │ ┌─────────────┴─────────────┐ │
- Lines: 404
- Characters: 12285

---

# Source: .\MEDIA_SUPPORT.md

- Preview: # Media Support Documentation ## Overview This document describes the media recording, upload, and rendering capabilities added to the Fast Agent Panel. ## Features Implemented ### 1. HTML5 Media Rendering Support **Files Modified:** - `src/components/AIChatPanel/AIChatPanel.Messages.tsx` **What Changed:** - Installed and configured `rehype-raw` and `rehype-sanitize` plugins - ReactMarkdown now su
- Lines: 241
- Characters: 7270

---

# Source: .\MERMAID_DIAGRAMS_GUIDE.md

- Preview: # Mermaid Diagrams in Fast Agent Panel ## Overview The Fast Agent Panel now supports rendering **Mermaid diagrams** directly in chat! The AI can generate flowcharts, sequence diagrams, class diagrams, and more using simple text-based syntax. ## ✅ What's Been Added ### 1. **Mermaid Rendering** (`MermaidDiagram.tsx`) - Automatically detects ```mermaid code blocks - Renders them as beautiful SVG diag
- Lines: 420
- Characters: 8419

---

# Source: .\node_modules\@adobe\css-tools\docs\API.md

- Preview: # API Reference ## Overview `@adobe/css-tools` provides a modern CSS parser and stringifier with comprehensive TypeScript support. It can parse CSS into an Abstract Syntax Tree (AST) and convert the AST back to CSS with various formatting options. ## Installation ```bash npm install @adobe/css-tools ``` ## Core Functions ### `parse(code, options?)` Parses CSS code and returns an Abstract Syntax Tr
- Lines: 317
- Characters: 6401

---

# Source: .\node_modules\@adobe\css-tools\docs\AST.md

- Preview: # Abstract Syntax Tree (AST) ## Overview The AST represents CSS as a tree structure where each node has a specific type and properties. All nodes share common properties and have type-specific properties. ## Common Properties All AST nodes have these properties: ### `type` The node type as a string. See [Node Types](#node-types) for all possible values. ### `position` (optional) Position informati
- Lines: 369
- Characters: 6060

---

# Source: .\node_modules\@adobe\css-tools\docs\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [4.4.4] - 2025-07-22 ### Changed - Switch from yarn to npm for package management - Switch from eslint to biome for code formatting and linting - R
- Lines: 193
- Characters: 4374

---

# Source: .\node_modules\@adobe\css-tools\docs\EXAMPLES.md

- Preview: # Usage Examples ## Basic Usage ### Parsing CSS ```javascript import { parse } from '@adobe/css-tools'; // Basic CSS parsing const css = ` body { font-size: 12px; color: #333; } .container { max-width: 1200px; margin: 0 auto; } `; const ast = parse(css); console.log(ast); ``` ### Stringifying AST ```javascript import { parse, stringify } from '@adobe/css-tools'; const css = 'body { font-size: 12px
- Lines: 453
- Characters: 8471

---

# Source: .\node_modules\@adobe\css-tools\README.md

- Preview: # @adobe/css-tools > A modern CSS parser and stringifier with TypeScript support [![npm version](https://badge.fury.io/js/%40adobe%2Fcss-tools.svg)](https://badge.fury.io/js/%40adobe%2Fcss-tools) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) Parse CSS into an Abstract Syntax Tree (AST) and convert it back to CSS with configurable format
- Lines: 149
- Characters: 4797

---

# Source: .\node_modules\@ai-sdk\gateway\CHANGELOG.md

- Preview: # @ai-sdk/gateway ## 1.0.40 ### Patch Changes - f6a9bf3: feat (provider/gateway): add user and tags provider options ## 1.0.39 ### Patch Changes - Updated dependencies [17f9872] - @ai-sdk/provider-utils@3.0.12 ## 1.0.38 ### Patch Changes - 227ca94: fix: revert zod import change ## 1.0.37 ### Patch Changes - ec5a0a0: chore(provider/gateway): lazy schema loading ## 1.0.36 ### Patch Changes - 638a561
- Lines: 653
- Characters: 14977

---

# Source: .\node_modules\@ai-sdk\gateway\node_modules\@ai-sdk\provider\CHANGELOG.md

- Preview: # @ai-sdk/provider ## 2.0.0 ### Major Changes - 742b7be: feat: forward id, streaming start, streaming end of content blocks - 7cddb72: refactoring (provider): collapse provider defined tools into single definition - ccce59b: feat (provider): support changing provider, model, supportedUrls in middleware - e2b9e4b: feat (provider): add name for provider defined tools for future validation - 95857aa:
- Lines: 661
- Characters: 15666

---

# Source: .\node_modules\@ai-sdk\gateway\node_modules\@ai-sdk\provider\README.md

- Preview: # AI SDK - Provider Language Model Specification
- Lines: 4
- Characters: 48

---

# Source: .\node_modules\@ai-sdk\gateway\README.md

- Preview: # AI SDK - Gateway Provider The Gateway provider for the [AI SDK](https://ai-sdk.dev/docs) allows the use of a wide variety of AI models and providers. ## Setup The Gateway provider is available in the `@ai-sdk/gateway` module. You can install it with ```bash npm i @ai-sdk/gateway ``` ## Provider Instance You can import the default provider instance `gateway` from `@ai-sdk/gateway`: ```ts import {
- Lines: 39
- Characters: 788

---

# Source: .\node_modules\@ai-sdk\openai\CHANGELOG.md

- Preview: # @ai-sdk/openai ## 2.0.52 ### Patch Changes - 8de8de5: fix(provider/openai): end reasoning parts earlier ## 2.0.51 ### Patch Changes - cad5c1d: fix(provider/openai): fix web search tool input types ## 2.0.50 ### Patch Changes - c336b43: feat(provider/openai): send assistant text and tool call parts as reference ids when store: true ## 2.0.49 ### Patch Changes - f4287d0: feat(provider/openai): aut
- Lines: 2158
- Characters: 48802

---

# Source: .\node_modules\@ai-sdk\openai\node_modules\@ai-sdk\provider\CHANGELOG.md

- Preview: # @ai-sdk/provider ## 2.0.0 ### Major Changes - 742b7be: feat: forward id, streaming start, streaming end of content blocks - 7cddb72: refactoring (provider): collapse provider defined tools into single definition - ccce59b: feat (provider): support changing provider, model, supportedUrls in middleware - e2b9e4b: feat (provider): add name for provider defined tools for future validation - 95857aa:
- Lines: 661
- Characters: 15666

---

# Source: .\node_modules\@ai-sdk\openai\node_modules\@ai-sdk\provider\README.md

- Preview: # AI SDK - Provider Language Model Specification
- Lines: 4
- Characters: 48

---

# Source: .\node_modules\@ai-sdk\openai\README.md

- Preview: # AI SDK - OpenAI Provider The **[OpenAI provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai)** for the [AI SDK](https://ai-sdk.dev/docs) contains language model support for the OpenAI chat and completion APIs and embedding model support for the OpenAI embeddings API. ## Setup The OpenAI provider is available in the `@ai-sdk/openai` module. You can install it with ```bash npm i @ai-sdk/
- Lines: 39
- Characters: 918

---

# Source: .\node_modules\@ai-sdk\provider\CHANGELOG.md

- Preview: # @ai-sdk/provider ## 1.1.3 ### Patch Changes - beef951: feat: add speech with experimental_generateSpeech ## 1.1.2 ### Patch Changes - 013faa8: core (ai): change transcription model mimeType to mediaType ## 1.1.1 ### Patch Changes - c21fa6d: feat: add transcription with experimental_transcribe ## 1.1.0 ### Minor Changes - 5bc638d: AI SDK 4.2 ## 1.0.12 ### Patch Changes - 0bd5bc6: feat (ai): suppo
- Lines: 280
- Characters: 4798

---

# Source: .\node_modules\@ai-sdk\provider\README.md

- Preview: # AI SDK - Provider Language Model Specification
- Lines: 4
- Characters: 48

---

# Source: .\node_modules\@ai-sdk\provider-utils\CHANGELOG.md

- Preview: # @ai-sdk/provider-utils ## 3.0.12 ### Patch Changes - 17f9872: fix: revert zod import change ## 3.0.11 ### Patch Changes - 6f0644c: chore: use import \* from zod/v4 - 6f0644c: chore: load zod schemas lazily ## 3.0.10 ### Patch Changes - bc5ed71: chore: update zod peer depenedency version ## 3.0.9 ### Patch Changes - 0294b58: feat(ai): set `ai`, `@ai-sdk/provider-utils`, and runtime in `user-agent
- Lines: 1109
- Characters: 22122

---

# Source: .\node_modules\@ai-sdk\provider-utils\node_modules\@ai-sdk\provider\CHANGELOG.md

- Preview: # @ai-sdk/provider ## 2.0.0 ### Major Changes - 742b7be: feat: forward id, streaming start, streaming end of content blocks - 7cddb72: refactoring (provider): collapse provider defined tools into single definition - ccce59b: feat (provider): support changing provider, model, supportedUrls in middleware - e2b9e4b: feat (provider): add name for provider defined tools for future validation - 95857aa:
- Lines: 661
- Characters: 15666

---

# Source: .\node_modules\@ai-sdk\provider-utils\node_modules\@ai-sdk\provider\README.md

- Preview: # AI SDK - Provider Language Model Specification
- Lines: 4
- Characters: 48

---

# Source: .\node_modules\@ai-sdk\provider-utils\README.md

- Preview: # AI SDK - Provider Implementation Utilities
- Lines: 4
- Characters: 44

---

# Source: .\node_modules\@alloc\quick-lru\readme.md

- Preview: # quick-lru [![Build Status](https://travis-ci.org/sindresorhus/quick-lru.svg?branch=master)](https://travis-ci.org/sindresorhus/quick-lru) [![Coverage Status](https://coveralls.io/repos/github/sindresorhus/quick-lru/badge.svg?branch=master)](https://coveralls.io/github/sindresorhus/quick-lru?branch=master) > Simple [“Least Recently Used” (LRU) cache](https://en.m.wikipedia.org/wiki/Cache_replacem
- Lines: 141
- Characters: 3502

---

# Source: .\node_modules\@asamuzakjp\css-color\node_modules\lru-cache\README.md

- Preview: # lru-cache A cache object that deletes the least-recently-used items. Specify a max number of the most recently used items that you want to keep, and this cache will keep that many of the most recently accessed items. This is not primarily a TTL cache, and does not make strong TTL guarantees. There is no preemptive pruning of expired items by default, but you _may_ set a TTL on the cache or on a
- Lines: 334
- Characters: 10776

---

# Source: .\node_modules\@asamuzakjp\css-color\README.md

- Preview: # CSS color [![build](https://github.com/asamuzaK/cssColor/actions/workflows/node.js.yml/badge.svg)](https://github.com/asamuzaK/cssColor/actions/workflows/node.js.yml) [![CodeQL](https://github.com/asamuzaK/cssColor/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/asamuzaK/cssColor/actions/workflows/github-code-scanning/codeql) [![npm (scoped)](https://img.shields.io/n
- Lines: 318
- Characters: 9329

---

# Source: .\node_modules\@auth\core\README.md

- Preview: <p align="center"> <br/> <a href="https://authjs.dev" target="_blank"><img width="150px" src="https://authjs.dev/img/logo-sm.png" /></a> <h3 align="center">Auth.js core library</a></h3> <h4 align="center">Authentication for the Web.</h4> <p align="center" style="align: center;"> <a href="https://npm.im/next-auth"> <img src="https://img.shields.io/badge/TypeScript-blue?style=flat-square" alt="TypeS
- Lines: 26
- Characters: 1069

---

# Source: .\node_modules\@babel\code-frame\README.md

- Preview: # @babel/code-frame > Generate errors that contain a code frame that point to source locations. See our website [@babel/code-frame](https://babeljs.io/docs/babel-code-frame) for more information. ## Install Using npm: ```sh npm install --save-dev @babel/code-frame ``` or using yarn: ```sh yarn add @babel/code-frame --dev ```
- Lines: 22
- Characters: 315

---

# Source: .\node_modules\@babel\compat-data\README.md

- Preview: # @babel/compat-data > The compat-data to determine required Babel plugins See our website [@babel/compat-data](https://babeljs.io/docs/babel-compat-data) for more information. ## Install Using npm: ```sh npm install --save @babel/compat-data ``` or using yarn: ```sh yarn add @babel/compat-data ```
- Lines: 22
- Characters: 288

---

# Source: .\node_modules\@babel\core\README.md

- Preview: # @babel/core > Babel compiler core. See our website [@babel/core](https://babeljs.io/docs/babel-core) for more information or the [issues](https://github.com/babel/babel/issues?utf8=%E2%9C%93&q=is%3Aissue+label%3A%22pkg%3A%20core%22+is%3Aopen) associated with this package. ## Install Using npm: ```sh npm install --save-dev @babel/core ``` or using yarn: ```sh yarn add @babel/core --dev ```
- Lines: 22
- Characters: 382

---

# Source: .\node_modules\@babel\generator\README.md

- Preview: # @babel/generator > Turns an AST into code. See our website [@babel/generator](https://babeljs.io/docs/babel-generator) for more information or the [issues](https://github.com/babel/babel/issues?utf8=%E2%9C%93&q=is%3Aissue+label%3A%22pkg%3A%20generator%22+is%3Aopen) associated with this package. ## Install Using npm: ```sh npm install --save-dev @babel/generator ``` or using yarn: ```sh yarn add
- Lines: 22
- Characters: 415

---

# Source: .\node_modules\@babel\helper-compilation-targets\README.md

- Preview: # @babel/helper-compilation-targets > Helper functions on Babel compilation targets See our website [@babel/helper-compilation-targets](https://babeljs.io/docs/babel-helper-compilation-targets) for more information. ## Install Using npm: ```sh npm install --save @babel/helper-compilation-targets ``` or using yarn: ```sh yarn add @babel/helper-compilation-targets ```
- Lines: 22
- Characters: 357

---

# Source: .\node_modules\@babel\helper-globals\README.md

- Preview: # @babel/helper-globals > A collection of JavaScript globals for Babel internal usage See our website [@babel/helper-globals](https://babeljs.io/docs/babel-helper-globals) for more information. ## Install Using npm: ```sh npm install --save @babel/helper-globals ``` or using yarn: ```sh yarn add @babel/helper-globals ```
- Lines: 22
- Characters: 311

---

# Source: .\node_modules\@babel\helper-module-imports\README.md

- Preview: # @babel/helper-module-imports > Babel helper functions for inserting module loads See our website [@babel/helper-module-imports](https://babeljs.io/docs/babel-helper-module-imports) for more information. ## Install Using npm: ```sh npm install --save @babel/helper-module-imports ``` or using yarn: ```sh yarn add @babel/helper-module-imports ```
- Lines: 22
- Characters: 336

---

# Source: .\node_modules\@babel\helper-module-transforms\README.md

- Preview: # @babel/helper-module-transforms > Babel helper functions for implementing ES6 module transformations See our website [@babel/helper-module-transforms](https://babeljs.io/docs/babel-helper-module-transforms) for more information. ## Install Using npm: ```sh npm install --save @babel/helper-module-transforms ``` or using yarn: ```sh yarn add @babel/helper-module-transforms ```
- Lines: 22
- Characters: 368

---

# Source: .\node_modules\@babel\helper-plugin-utils\README.md

- Preview: # @babel/helper-plugin-utils > General utilities for plugins to use See our website [@babel/helper-plugin-utils](https://babeljs.io/docs/babel-helper-plugin-utils) for more information. ## Install Using npm: ```sh npm install --save @babel/helper-plugin-utils ``` or using yarn: ```sh yarn add @babel/helper-plugin-utils ```
- Lines: 22
- Characters: 313

---

# Source: .\node_modules\@babel\helpers\README.md

- Preview: # @babel/helpers > Collection of helper functions used by Babel transforms. See our website [@babel/helpers](https://babeljs.io/docs/babel-helpers) for more information. ## Install Using npm: ```sh npm install --save-dev @babel/helpers ``` or using yarn: ```sh yarn add @babel/helpers --dev ```
- Lines: 22
- Characters: 283

---

# Source: .\node_modules\@babel\helper-string-parser\README.md

- Preview: # @babel/helper-string-parser > A utility package to parse strings See our website [@babel/helper-string-parser](https://babeljs.io/docs/babel-helper-string-parser) for more information. ## Install Using npm: ```sh npm install --save @babel/helper-string-parser ``` or using yarn: ```sh yarn add @babel/helper-string-parser ```
- Lines: 22
- Characters: 316

---

# Source: .\node_modules\@babel\helper-validator-identifier\README.md

- Preview: # @babel/helper-validator-identifier > Validate identifier/keywords name See our website [@babel/helper-validator-identifier](https://babeljs.io/docs/babel-helper-validator-identifier) for more information. ## Install Using npm: ```sh npm install --save @babel/helper-validator-identifier ``` or using yarn: ```sh yarn add @babel/helper-validator-identifier ```
- Lines: 22
- Characters: 350

---

# Source: .\node_modules\@babel\helper-validator-option\README.md

- Preview: # @babel/helper-validator-option > Validate plugin/preset options See our website [@babel/helper-validator-option](https://babeljs.io/docs/babel-helper-validator-option) for more information. ## Install Using npm: ```sh npm install --save @babel/helper-validator-option ``` or using yarn: ```sh yarn add @babel/helper-validator-option ```
- Lines: 22
- Characters: 327

---

# Source: .\node_modules\@babel\parser\CHANGELOG.md

- Preview: # Changelog > **Tags:** > - :boom:       [Breaking Change] > - :eyeglasses: [Spec Compliance] > - :rocket:     [New Feature] > - :bug:        [Bug Fix] > - :memo:       [Documentation] > - :house:      [Internal] > - :nail_care:  [Polish] > Semver Policy: https://github.com/babel/babel/tree/main/packages/babel-parser#semver _Note: Gaps between patch versions are faulty, broken or test releases._ S
- Lines: 1075
- Characters: 37151

---

# Source: .\node_modules\@babel\parser\README.md

- Preview: # @babel/parser > A JavaScript parser See our website [@babel/parser](https://babeljs.io/docs/babel-parser) for more information or the [issues](https://github.com/babel/babel/issues?utf8=%E2%9C%93&q=is%3Aissue+label%3A%22pkg%3A%20parser%22+is%3Aopen) associated with this package. ## Install Using npm: ```sh npm install --save-dev @babel/parser ``` or using yarn: ```sh yarn add @babel/parser --dev
- Lines: 22
- Characters: 393

---

# Source: .\node_modules\@babel\plugin-transform-react-jsx-self\README.md

- Preview: # @babel/plugin-transform-react-jsx-self > Add a __self prop to all JSX Elements See our website [@babel/plugin-transform-react-jsx-self](https://babeljs.io/docs/babel-plugin-transform-react-jsx-self) for more information. ## Install Using npm: ```sh npm install --save-dev @babel/plugin-transform-react-jsx-self ``` or using yarn: ```sh yarn add @babel/plugin-transform-react-jsx-self --dev ```
- Lines: 22
- Characters: 384

---

# Source: .\node_modules\@babel\plugin-transform-react-jsx-source\README.md

- Preview: # @babel/plugin-transform-react-jsx-source > Add a __source prop to all JSX Elements See our website [@babel/plugin-transform-react-jsx-source](https://babeljs.io/docs/babel-plugin-transform-react-jsx-source) for more information. ## Install Using npm: ```sh npm install --save-dev @babel/plugin-transform-react-jsx-source ``` or using yarn: ```sh yarn add @babel/plugin-transform-react-jsx-source --
- Lines: 22
- Characters: 396

---

# Source: .\node_modules\@babel\runtime\README.md

- Preview: # @babel/runtime > babel's modular runtime helpers See our website [@babel/runtime](https://babeljs.io/docs/babel-runtime) for more information. ## Install Using npm: ```sh npm install --save @babel/runtime ``` or using yarn: ```sh yarn add @babel/runtime ```
- Lines: 22
- Characters: 248

---

# Source: .\node_modules\@babel\template\README.md

- Preview: # @babel/template > Generate an AST from a string template. See our website [@babel/template](https://babeljs.io/docs/babel-template) for more information or the [issues](https://github.com/babel/babel/issues?utf8=%E2%9C%93&q=is%3Aissue+label%3A%22pkg%3A%20template%22+is%3Aopen) associated with this package. ## Install Using npm: ```sh npm install --save-dev @babel/template ``` or using yarn: ```s
- Lines: 22
- Characters: 425

---

# Source: .\node_modules\@babel\traverse\README.md

- Preview: # @babel/traverse > The Babel Traverse module maintains the overall tree state, and is responsible for replacing, removing, and adding nodes See our website [@babel/traverse](https://babeljs.io/docs/babel-traverse) for more information or the [issues](https://github.com/babel/babel/issues?utf8=%E2%9C%93&q=is%3Aissue+label%3A%22pkg%3A%20traverse%22+is%3Aopen) associated with this package. ## Instal
- Lines: 22
- Characters: 506

---

# Source: .\node_modules\@babel\types\README.md

- Preview: # @babel/types > Babel Types is a Lodash-esque utility library for AST nodes See our website [@babel/types](https://babeljs.io/docs/babel-types) for more information or the [issues](https://github.com/babel/babel/issues?utf8=%E2%9C%93&q=is%3Aissue+label%3A%22pkg%3A%20types%22+is%3Aopen) associated with this package. ## Install Using npm: ```sh npm install --save-dev @babel/types ``` or using yarn:
- Lines: 22
- Characters: 427

---

# Source: .\node_modules\@blocknote\core\node_modules\@remirror\core-constants\readme.md

- Preview: # @remirror/core-constants > core constants used throughout the `remirror` codebase. [![Version][version]][npm] [![Weekly Downloads][downloads-badge]][npm] [![Bundled size][size-badge]][size] [![Typed Codebase][typescript]](#) [![MIT License][license]](#) [version]: https://flat.badgen.net/npm/v/@remirror/core-constants [npm]: https://npmjs.com/package/@remirror/core-constants [license]: https://f
- Lines: 20
- Characters: 922

---

# Source: .\node_modules\@blocknote\core\node_modules\@tiptap\extension-horizontal-rule\README.md

- Preview: # @tiptap/extension-horizontal-rule [![Version](https://img.shields.io/npm/v/@tiptap/extension-horizontal-rule.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-horizontal-rule) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-horizontal-rule.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-horizontal
- Lines: 17
- Characters: 1084

---

# Source: .\node_modules\@blocknote\core\node_modules\@tiptap\extension-link\README.md

- Preview: # @tiptap/extension-link [![Version](https://img.shields.io/npm/v/@tiptap/extension-link.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-link) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-link.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-link.svg)](https://www.npmjs.com/package/@tiptap/exten
- Lines: 17
- Characters: 1018

---

# Source: .\node_modules\@blocknote\core\node_modules\@tiptap\extension-paragraph\README.md

- Preview: # @tiptap/extension-paragraph [![Version](https://img.shields.io/npm/v/@tiptap/extension-paragraph.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-paragraph) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-paragraph.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-paragraph.svg)](https://www.npmjs.
- Lines: 17
- Characters: 1048

---

# Source: .\node_modules\@blocknote\core\node_modules\@tiptap\extension-table-cell\README.md

- Preview: # @tiptap/extension-table-cell [![Version](https://img.shields.io/npm/v/@tiptap/extension-table-cell.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-table-cell) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-table-cell.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-table-cell.svg)](https://www.n
- Lines: 17
- Characters: 1054

---

# Source: .\node_modules\@blocknote\core\node_modules\@tiptap\extension-table-header\README.md

- Preview: # @tiptap/extension-table-header [![Version](https://img.shields.io/npm/v/@tiptap/extension-table-header.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-table-header) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-table-header.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-table-header.svg)](htt
- Lines: 17
- Characters: 1066

---

# Source: .\node_modules\@blocknote\core\node_modules\@tiptap\pm\README.md

- Preview: # @tiptap/pm [![Version](https://img.shields.io/npm/v/@tiptap/pm.svg?label=version)](https://www.npmjs.com/package/@tiptap/pm) [![Downloads](https://img.shields.io/npm/dm/@tiptap/pm.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/pm.svg)](https://www.npmjs.com/package/@tiptap/pm) [![Sponsor](https://img.shields.io/static/v1?label=Sponsor&me
- Lines: 25
- Characters: 1128

---

# Source: .\node_modules\@blocknote\core\node_modules\prosemirror-trailing-node\readme.md

- Preview: # prosemirror-trailing-node > "A trailing node plugin for the prosemirror editor. [![Version][version]][npm] [![Weekly Downloads][downloads-badge]][npm] [![Bundled size][size-badge]][size] [![Typed Codebase][typescript]](#) [![MIT License][license]](#) [version]: https://flat.badgen.net/npm/v/prosemirror-trailing-node [npm]: https://npmjs.com/package/prosemirror-trailing-node [license]: https://fl
- Lines: 58
- Characters: 1748

---

# Source: .\node_modules\@blocknote\core\README.md

- Preview: <p align="center"> <a href="https://www.blocknotejs.org"> <img alt="TypeCell" src="https://github.com/TypeCellOS/BlockNote/raw/main/docs/public/img/logos/banner.svg?raw=true" width="300" /> </a> </p> <p align="center"> Welcome to BlockNote! The open source Block-Based React rich text editor. Easily add a modern text editing experience to your app. </p> <p align="center"> <a href="https://discord.g
- Lines: 128
- Characters: 5201

---

# Source: .\node_modules\@blocknote\core\src\api\README.md

- Preview: ### @blocknote/core/src/api Implements the BlockNote API surface - `blockManipulation`: API to insert / update / remove blocks - `exporters`: exporting to HTML / markdown / other formats - `nodeConversions`: internal API for converting between BlockNote Schema (Blocks) and Prosemirror (Nodes) - `parsers`: importing from HTML / markdown / other formats
- Lines: 11
- Characters: 348

---

# Source: .\node_modules\@blocknote\core\src\blocks\README.md

- Preview: ### @blocknote/core/src/blocks The default built-in blocks that ship with BlockNote
- Lines: 6
- Characters: 82

---

# Source: .\node_modules\@blocknote\core\src\editor\README.md

- Preview: ### @blocknote/core/src/editor Contains main functions to set up the editor
- Lines: 6
- Characters: 74

---

# Source: .\node_modules\@blocknote\core\src\extensions\README.md

- Preview: ### @blocknote/core/src/extensions All extra extensions for TipTap / Prosemirror needed to implement the Prosemirror UX and editor behavior.
- Lines: 6
- Characters: 139

---

# Source: .\node_modules\@blocknote\core\src\pm-nodes\README.md

- Preview: ### @blocknote/core/src/pm-nodes Defines the prosemirror nodes and base node structure. See below: # Block structure In the BlockNote API, recall that blocks look like this: ```typescript { id: string; type: string; children: Block[]; content: InlineContent[] | undefined; props: Record<string, any>; } ``` `children` describes child blocks that have their own `id` and also map to a `Block` type. Mo
- Lines: 144
- Characters: 5256

---

# Source: .\node_modules\@blocknote\core\src\schema\README.md

- Preview: ### @blocknote/core/src/schema The BlockNote Schema consists of Blocks, InlineContent and Styles.
- Lines: 6
- Characters: 96

---

# Source: .\node_modules\@blocknote\core\src\util\README.md

- Preview: ### @blocknote/core/src/@util Contains generic utility files with helper functions / classes.
- Lines: 6
- Characters: 92

---

# Source: .\node_modules\@blocknote\react\node_modules\@remirror\core-constants\readme.md

- Preview: # @remirror/core-constants > core constants used throughout the `remirror` codebase. [![Version][version]][npm] [![Weekly Downloads][downloads-badge]][npm] [![Bundled size][size-badge]][size] [![Typed Codebase][typescript]](#) [![MIT License][license]](#) [version]: https://flat.badgen.net/npm/v/@remirror/core-constants [npm]: https://npmjs.com/package/@remirror/core-constants [license]: https://f
- Lines: 20
- Characters: 922

---

# Source: .\node_modules\@blocknote\react\node_modules\@tiptap\pm\README.md

- Preview: # @tiptap/pm [![Version](https://img.shields.io/npm/v/@tiptap/pm.svg?label=version)](https://www.npmjs.com/package/@tiptap/pm) [![Downloads](https://img.shields.io/npm/dm/@tiptap/pm.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/pm.svg)](https://www.npmjs.com/package/@tiptap/pm) [![Sponsor](https://img.shields.io/static/v1?label=Sponsor&me
- Lines: 25
- Characters: 1128

---

# Source: .\node_modules\@blocknote\react\node_modules\@tiptap\react\README.md

- Preview: # @tiptap/react [![Version](https://img.shields.io/npm/v/@tiptap/react.svg?label=version)](https://www.npmjs.com/package/@tiptap/react) [![Downloads](https://img.shields.io/npm/dm/@tiptap/react.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/react.svg)](https://www.npmjs.com/package/@tiptap/react) [![Sponsor](https://img.shields.io/static/v
- Lines: 17
- Characters: 964

---

# Source: .\node_modules\@blocknote\react\node_modules\prosemirror-trailing-node\readme.md

- Preview: # prosemirror-trailing-node > "A trailing node plugin for the prosemirror editor. [![Version][version]][npm] [![Weekly Downloads][downloads-badge]][npm] [![Bundled size][size-badge]][size] [![Typed Codebase][typescript]](#) [![MIT License][license]](#) [version]: https://flat.badgen.net/npm/v/prosemirror-trailing-node [npm]: https://npmjs.com/package/prosemirror-trailing-node [license]: https://fl
- Lines: 58
- Characters: 1748

---

# Source: .\node_modules\@blocknote\react\README.md

- Preview: <p align="center"> <a href="https://www.blocknotejs.org"> <img alt="TypeCell" src="https://github.com/TypeCellOS/BlockNote/raw/main/docs/public/img/logos/banner.svg?raw=true" width="300" /> </a> </p> <p align="center"> Welcome to BlockNote! The open source Block-Based React rich text editor. Easily add a modern text editing experience to your app. </p> <p align="center"> <a href="https://discord.g
- Lines: 128
- Characters: 5201

---

# Source: .\node_modules\@blocknote\react\src\schema\markviews\README.md

- Preview: The implementation of MarkViews in this directory is based on `prosemirror-adapter`. We might want to migrate to the Tiptap implementation of MarkViews once this lands in Tiptap v3.
- Lines: 4
- Characters: 181

---

# Source: .\node_modules\@chromatic-com\storybook\README.md

- Preview: # Visual Tests Addon for Storybook Run visual tests on your stories and compare changes with the latest baselines to catch UI regressions early in development. Supports multiple viewports, themes, and browsers. ## Prerequisites - Chromatic [account configured](https://www.chromatic.com/docs/setup#sign-up) with access to a project - Storybook 7.6 or later ## Getting Started Run the following comman
- Lines: 72
- Characters: 3144

---

# Source: .\node_modules\@codexteam\icons\packages\nuxt\README.md

- Preview: # CodeX Icons Nuxt module This modules simplifies using of CodeX Icons pack in the Nuxt projects. [![codex-icons-nuxt](./../../showcase.png "CodeX Icons showcase")](https://github.com/codex-team/icons/tree/master/packages/nuxt) ## Features 1. 💖 Dynamic loading 2. 💝 Coloring 3. 💞 HMR (reloading on update in dev mode) ## Installation 1. Get the package ```bash yarn add @codexteam/nuxt-icons ``` 2
- Lines: 61
- Characters: 1638

---

# Source: .\node_modules\@codexteam\icons\README.md

- Preview: # CodeX Icons Dozens of cute icons made with love by CodeX for your projects. No dependencies required. Free to use and share. <img width="1657" alt="image" src="https://user-images.githubusercontent.com/3684889/210104174-93ee88d6-a2ba-44a8-ac22-ee04955c771b.png"> ## Usage Install the package with node package manager. ```sh npm install @codexteam/icons yarn add @codexteam/icons ``` And import req
- Lines: 123
- Characters: 5900

---

# Source: .\node_modules\@convex-dev\agent\README.md

- Preview: # Convex Agent Component [![npm version](https://badge.fury.io/js/@convex-dev%2fagent.svg)](https://badge.fury.io/js/@convex-dev%2fagent) Convex provides powerful building blocks for building agentic AI applications, leveraging Components and existing Convex features. With Convex, you can separate your long-running agentic workflows from your UI, without the user losing reactivity and interactivit
- Lines: 78
- Characters: 3358

---

# Source: .\node_modules\@convex-dev\auth\README.md

- Preview: # Convex Auth Convex Auth is a library for implementing authentication directly within your Convex backend. Check out the docs: https://labs.convex.dev/auth
- Lines: 9
- Characters: 153

---

# Source: .\node_modules\@convex-dev\auth\src\server\oauth\README.md

- Preview: The code in this directory is meant to handle OAuth2 and OIDC flows. The code is adapted from the @auth/core package, but since some of their types and functions used are internal, they're copied over but with similar structure. Everything that deviates from the original code is marked with a "ConvexAuth:" comment.
- Lines: 10
- Characters: 312

---

# Source: .\node_modules\@convex-dev\crons\README.md

- Preview: # Crons Convex Component [![npm version](https://badge.fury.io/js/@convex-dev%2Fcrons.svg)](https://badge.fury.io/js/@convex-dev%2Fcrons) <!-- START: Include on https://convex.dev/components --> This Convex component provides functionality for registering and managing cron jobs at runtime. Convex comes with built-in support for cron jobs but they must be statically defined at deployment time. This
- Lines: 224
- Characters: 6665

---

# Source: .\node_modules\@convex-dev\persistent-text-streaming\README.md

- Preview: # Convex Component: Persistent Text Streaming [![npm version](https://badge.fury.io/js/@convex-dev%2Fpersistent-text-streaming.svg)](https://badge.fury.io/js/@convex-dev%2Fpersistent-text-streaming) <!-- START: Include on https://convex.dev/components --> This Convex component enables persistent text streaming. It provides a React hook for streaming text from HTTP actions while simultaneously stor
- Lines: 192
- Characters: 6464

---

# Source: .\node_modules\@convex-dev\polar\README.md

- Preview: # Convex Polar Component [![npm version](https://badge.fury.io/js/@convex-dev%2Fpolar.svg)](https://badge.fury.io/js/@convex-dev%2Fpolar) Add subscriptions and billing to your Convex app with [Polar](https://polar.sh). **Check out the [example app](example) for a complete example.** ```tsx // Get subscription details for the current user // Note: getCurrentSubscription is for apps that only allow
- Lines: 493
- Characters: 13383

---

# Source: .\node_modules\@convex-dev\presence\README.md

- Preview: # Presence Convex Component [![npm version](https://badge.fury.io/js/@convex-dev%2Fpresence.svg)](https://badge.fury.io/js/@convex-dev%2Fpresence) A Convex component for managing presence functionality, i.e., a live-updating list of users in a "room" including their status for when they were last online. ![Demo of presence component](https://raw.githubusercontent.com/get-convex/presence/main/prese
- Lines: 119
- Characters: 3796

---

# Source: .\node_modules\@convex-dev\prosemirror-sync\README.md

- Preview: # Convex ProseMirror Component [![npm version](https://badge.fury.io/js/@convex-dev%2Fprosemirror-sync.svg)](https://badge.fury.io/js/@convex-dev%2Fprosemirror-sync) This is a [Convex Component](https://convex.dev/components) that syncs a [ProseMirror](https://prosemirror.net/) document between clients via a [Tiptap](https://tiptap.dev/) extension (that also works with [BlockNote](https://blocknot
- Lines: 355
- Characters: 13329

---

# Source: .\node_modules\@convex-dev\rag\README.md

- Preview: # Convex RAG Component [![npm version](https://badge.fury.io/js/@convex-dev%2Frag.svg)](https://badge.fury.io/js/@convex-dev%2Frag) <!-- START: Include on https://convex.dev/components --> A component for semantic search, usually used to look up context for LLMs. Use with an Agent for Retrieval-Augmented Generation (RAG). [![Use AI to search HUGE amounts of text with the RAG Component](https://thu
- Lines: 746
- Characters: 21880

---

# Source: .\node_modules\@convex-dev\twilio\README.md

- Preview: # Convex Twilio Component [![npm version](https://badge.fury.io/js/@convex-dev%2Ftwilio.svg)](https://badge.fury.io/js/@convex-dev%2Ftwilio) <!-- START: Include on https://convex.dev/components --> Send and receive SMS messages in your Convex app using Twilio. ```ts import { Twilio } from "@convex-dev/twilio"; import { components } from "./_generated/api"; export const twilio = new Twilio(componen
- Lines: 257
- Characters: 6899

---

# Source: .\node_modules\@convex-dev\workflow\README.md

- Preview: # Convex Workflow [![npm version](https://badge.fury.io/js/@convex-dev%2Fworkflow.svg?)](https://badge.fury.io/js/@convex-dev%2Fworkflow) <!-- START: Include on https://convex.dev/components --> Have you ever wanted to run a series of functions reliably and durably, where each can have its own retry behavior, the overall workflow will survive server restarts, and you can have long-running workflow
- Lines: 462
- Characters: 14660

---

# Source: .\node_modules\@convex-dev\workpool\README.md

- Preview: # Convex Component: Workpool [![npm version](https://badge.fury.io/js/@convex-dev%2Fworkpool.svg)](https://badge.fury.io/js/@convex-dev%2Fworkpool) <!-- START: Include on https://convex.dev/components --> This Convex component pools actions and mutations to restrict parallel requests. - Configure multiple pools with different parallelism. - Retry failed actions (with backoff and jitter) for [idemp
- Lines: 448
- Characters: 16318

---

# Source: .\node_modules\@convex-dev\workpool\src\component\README.md

- Preview: # Workpool: implementation notes and high-level architecture Concepts: - `segment`: A slice of time to process work. All work is bucketed into one. This enables us to batch work and avoid database conflicts. - `generation`: A monotonically increasing counter to ensure the loop is only running one instance. If two loops start with the same generation, one will successfully increase it, the other wi
- Lines: 76
- Characters: 3087

---

# Source: .\node_modules\@csstools\color-helpers\CHANGELOG.md

- Preview: # Changes to Color Helpers ### 5.1.0 _August 22, 2025_ - Add `lin_P3_to_XYZ_D50` - Add `XYZ_D50_to_lin_P3` [Full CHANGELOG](https://github.com/csstools/postcss-plugins/tree/main/packages/color-helpers/CHANGELOG.md)
- Lines: 13
- Characters: 209

---

# Source: .\node_modules\@csstools\color-helpers\LICENSE.md

- Preview: MIT No Attribution (MIT-0) Copyright © CSSTools Contributors Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to pe
- Lines: 21
- Characters: 903

---

# Source: .\node_modules\@csstools\color-helpers\README.md

- Preview: # Color Helpers <img src="https://cssdb.org/images/css.svg" alt="for CSS" width="90" height="90" align="right"> [<img alt="npm version" src="https://img.shields.io/npm/v/@csstools/color-helpers.svg" height="20">][npm-url] [<img alt="Build Status" src="https://github.com/csstools/postcss-plugins/actions/workflows/test.yml/badge.svg?branch=main" height="20">][cli-url] [<img alt="Discord" src="https:
- Lines: 35
- Characters: 1597

---

# Source: .\node_modules\@csstools\css-calc\CHANGELOG.md

- Preview: # Changes to CSS Calc ### 2.1.4 _May 27, 2025_ - Updated [`@csstools/css-tokenizer`](https://github.com/csstools/postcss-plugins/tree/main/packages/css-tokenizer) to [`3.0.4`](https://github.com/csstools/postcss-plugins/tree/main/packages/css-tokenizer/CHANGELOG.md#304) (patch) - Updated [`@csstools/css-parser-algorithms`](https://github.com/csstools/postcss-plugins/tree/main/packages/css-parser-a
- Lines: 13
- Characters: 632

---

# Source: .\node_modules\@csstools\css-calc\LICENSE.md

- Preview: The MIT License (MIT) Copyright 2022 Romain Menke, Antonio Laguna <antonio@laguna.es> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies o
- Lines: 23
- Characters: 1091

---

# Source: .\node_modules\@csstools\css-calc\README.md

- Preview: # CSS Calc <img src="https://cssdb.org/images/css.svg" alt="for CSS" width="90" height="90" align="right"> [<img alt="npm version" src="https://img.shields.io/npm/v/@csstools/css-calc.svg" height="20">][npm-url] [<img alt="Build Status" src="https://github.com/csstools/postcss-plugins/actions/workflows/test.yml/badge.svg?branch=main" height="20">][cli-url] [<img alt="Discord" src="https://shields.
- Lines: 135
- Characters: 3528

---

# Source: .\node_modules\@csstools\css-color-parser\CHANGELOG.md

- Preview: # Changes to CSS Color Parser ### 3.1.0 _August 22, 2025_ - Add support for `display-p3-linear` in `color(display-p3-linear 0.3081 0.014 0.0567)` - Add support for `display-p3-linear` in `color-mix(in display-p3-linear, red, blue)` - Add support for omitting the color space in `color-mix(red, blue)` - Add support for `alpha(from red / 0.5)` - Updated [`@csstools/color-helpers`](https://github.com/
- Lines: 16
- Characters: 677

---

# Source: .\node_modules\@csstools\css-color-parser\LICENSE.md

- Preview: The MIT License (MIT) Copyright 2022 Romain Menke, Antonio Laguna <antonio@laguna.es> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies o
- Lines: 23
- Characters: 1091

---

# Source: .\node_modules\@csstools\css-color-parser\README.md

- Preview: # CSS Color Parser <img src="https://cssdb.org/images/css.svg" alt="for CSS" width="90" height="90" align="right"> [<img alt="npm version" src="https://img.shields.io/npm/v/@csstools/css-color-parser.svg" height="20">][npm-url] [<img alt="Build Status" src="https://github.com/csstools/postcss-plugins/actions/workflows/test.yml/badge.svg?branch=main" height="20">][cli-url] [<img alt="Discord" src="
- Lines: 40
- Characters: 1554

---

# Source: .\node_modules\@csstools\css-parser-algorithms\CHANGELOG.md

- Preview: # Changes to CSS Parser Algorithms ### 3.0.5 _May 27, 2025_ - Updated [`@csstools/css-tokenizer`](https://github.com/csstools/postcss-plugins/tree/main/packages/css-tokenizer) to [`3.0.4`](https://github.com/csstools/postcss-plugins/tree/main/packages/css-tokenizer/CHANGELOG.md#304) (patch) [Full CHANGELOG](https://github.com/csstools/postcss-plugins/tree/main/packages/css-parser-algorithms/CHANGE
- Lines: 12
- Characters: 403

---

# Source: .\node_modules\@csstools\css-parser-algorithms\LICENSE.md

- Preview: The MIT License (MIT) Copyright 2022 Romain Menke, Antonio Laguna <antonio@laguna.es> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies o
- Lines: 23
- Characters: 1091

---

# Source: .\node_modules\@csstools\css-parser-algorithms\README.md

- Preview: # CSS Parser Algorithms <img src="https://cssdb.org/images/css.svg" alt="for CSS" width="90" height="90" align="right"> [<img alt="npm version" src="https://img.shields.io/npm/v/@csstools/css-parser-algorithms.svg" height="20">][npm-url] [<img alt="Build Status" src="https://github.com/csstools/postcss-plugins/actions/workflows/test.yml/badge.svg?branch=main" height="20">][cli-url] [<img alt="Disc
- Lines: 122
- Characters: 3291

---

# Source: .\node_modules\@csstools\css-tokenizer\CHANGELOG.md

- Preview: # Changes to CSS Tokenizer ### 3.0.4 _May 27, 2025_ - align serializers with CSSOM [Full CHANGELOG](https://github.com/csstools/postcss-plugins/tree/main/packages/css-tokenizer/CHANGELOG.md)
- Lines: 12
- Characters: 186

---

# Source: .\node_modules\@csstools\css-tokenizer\LICENSE.md

- Preview: The MIT License (MIT) Copyright 2022 Romain Menke, Antonio Laguna <antonio@laguna.es> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies o
- Lines: 23
- Characters: 1091

---

# Source: .\node_modules\@csstools\css-tokenizer\README.md

- Preview: # CSS Tokenizer <img src="https://cssdb.org/images/css.svg" alt="for CSS" width="90" height="90" align="right"> [<img alt="npm version" src="https://img.shields.io/npm/v/@csstools/css-tokenizer.svg" height="20">][npm-url] [<img alt="Build Status" src="https://github.com/csstools/postcss-plugins/actions/workflows/test.yml/badge.svg?branch=main" height="20">][cli-url] [<img alt="Discord" src="https:
- Lines: 114
- Characters: 2358

---

# Source: .\node_modules\@dnd-kit\accessibility\CHANGELOG.md

- Preview: # @dnd-kit/accessibility ## 3.1.1 ### Patch Changes - [#1534](https://github.com/clauderic/dnd-kit/pull/1534) [`93602df`](https://github.com/clauderic/dnd-kit/commit/93602df08498b28749e8146e0f6143ab987bc178) Thanks [@duvallj](https://github.com/duvallj)! - Workaround `<LiveRegion>` layout bug by adding explicit `top` and `left` attributes. Under sufficiently complex CSS conditions, the element wou
- Lines: 108
- Characters: 5781

---

# Source: .\node_modules\@dnd-kit\accessibility\README.md

- Preview: # @dnd-kit/accessibility [![Stable release](https://img.shields.io/npm/v/@dnd-kit/accessibility.svg)](https://npm.im/@dnd-kit/accessibility) A generic set of components and hooks to help with live region announcements and screen reader instructions. This package is used internally by `@dnd-kit/core`.
- Lines: 8
- Characters: 299

---

# Source: .\node_modules\@dnd-kit\core\CHANGELOG.md

- Preview: # @dnd-kit/core ## 6.3.1 ### Patch Changes - [#1555](https://github.com/clauderic/dnd-kit/pull/1555) [`62f632a`](https://github.com/clauderic/dnd-kit/commit/62f632a0c8f06ff020eb90d98770a374c705001d) Thanks [@clauderic](https://github.com/clauderic)! - Added `Tab` to the list of default key codes that end a drag and drop operation. Can be customized by passing in a custom list of `keyCodes` to the
- Lines: 1218
- Characters: 72206

---

# Source: .\node_modules\@dnd-kit\core\README.md

- Preview: # @dnd-kit/core [![Stable release](https://img.shields.io/npm/v/@dnd-kit/core.svg)](https://npm.im/@dnd-kit/core) @dnd-kit – a lightweight React library for building performant and accessible drag and drop experiences. ## Installation To get started, install the `@dnd-kit/core` package via npm or yarn: ``` npm install @dnd-kit/core ``` ## Usage Visit [docs.dndkit.com](https://docs.dndkit.com) to l
- Lines: 20
- Characters: 429

---

# Source: .\node_modules\@dnd-kit\modifiers\CHANGELOG.md

- Preview: # @dnd-kit/modifiers ## 9.0.0 ### Patch Changes - Updated dependencies [[`0c6a28d`](https://github.com/clauderic/dnd-kit/commit/0c6a28d1b32c72cfbc6e103c9f430a1e8ebe7301)]: - @dnd-kit/core@6.3.0 ## 8.0.0 ### Patch Changes - Updated dependencies [[`00ec286`](https://github.com/clauderic/dnd-kit/commit/00ec286ab2fc7969549a4b19ffd42a09b5171dbe), [`995dc23`](https://github.com/clauderic/dnd-kit/commit/
- Lines: 198
- Characters: 15434

---

# Source: .\node_modules\@dnd-kit\modifiers\README.md

- Preview: # @dnd-kit/modifiers [![Stable release](https://img.shields.io/npm/v/@dnd-kit/modifiers.svg)](https://npm.im/@dnd-kit/sortable) Modifiers let you dynamically modify the movement coordinates that are detected by sensors. They can be used for a wide range of use cases, for example: - Restricting motion to a single axis - Restricting motion to the draggable node container's bounding rectangle - Restr
- Lines: 109
- Characters: 2750

---

# Source: .\node_modules\@dnd-kit\sortable\CHANGELOG.md

- Preview: # @dnd-kit/sortable ## 10.0.0 ### Patch Changes - Updated dependencies [[`0c6a28d`](https://github.com/clauderic/dnd-kit/commit/0c6a28d1b32c72cfbc6e103c9f430a1e8ebe7301)]: - @dnd-kit/core@6.3.0 ## 9.0.0 ### Patch Changes - [#1542](https://github.com/clauderic/dnd-kit/pull/1542) [`f629ec6`](https://github.com/clauderic/dnd-kit/commit/f629ec6a9c3c25b749561fac31741046d96c28dc) Thanks [@clauderic](htt
- Lines: 589
- Characters: 40397

---

# Source: .\node_modules\@dnd-kit\sortable\README.md

- Preview: # @dnd-kit/sortable [![Stable release](https://img.shields.io/npm/v/@dnd-kit/sortable.svg)](https://npm.im/@dnd-kit/sortable) The sortable preset provides the building blocks to build sortable interfaces with @dnd-kit. ## Installation To get started, install the sortable preset via npm or yarn: ``` npm install @dnd-kit/sortable ``` ## Architecture The sortable preset builds on top of the primitive
- Lines: 31
- Characters: 989

---

# Source: .\node_modules\@dnd-kit\utilities\CHANGELOG.md

- Preview: # @dnd-kit/utilities ## 3.2.2 ### Patch Changes - [#1239](https://github.com/clauderic/dnd-kit/pull/1239) [`f342d5e`](https://github.com/clauderic/dnd-kit/commit/f342d5efd98507f173b6a170b35bee1545d40311) Thanks [@petdud](https://github.com/petdud)! - Fix: getOwnerDocument should get correct document for SVG Elements ## 3.2.1 ### Patch Changes - [#948](https://github.com/clauderic/dnd-kit/pull/948)
- Lines: 151
- Characters: 8629

---

# Source: .\node_modules\@dnd-kit\utilities\README.md

- Preview: # @dnd-kit/utilities [![Stable release](https://img.shields.io/npm/v/@dnd-kit/utilities.svg)](https://npm.im/@dnd-kit/sortable) Internal utilities to bee shared between `@dnd-kit` packages.
- Lines: 8
- Characters: 187

---

# Source: .\node_modules\@editorjs\caret\README.md

- Preview: # @editorjs/caret Utils useful for work with caret for Editor.js tools development ### Installation ``` npm install @editorjs/caret ``` ### Function list - [checkContenteditableSliceForEmptiness](https://github.com/editor-js/utils/blob/main/packages/caret/src/checkContenteditableSliceForEmptiness/checkContenteditableSliceForEmptiness.ts) - Checks content at left or right of the passed node for emp
- Lines: 26
- Characters: 2304

---

# Source: .\node_modules\@editorjs\checklist\README.md

- Preview: ![](https://badgen.net/badge/Editor.js/v2.0/blue) # Checklist Tool for Editor.js This Tool for the [Editor.js](https://editorjs.io) allows you to add  checklists to your texts. ![](assets/68747470733a2f2f636170656c6c612e706963732f66303939646439622d313332312d343766362d623965312d3937666331656634306236612e6a7067.jpeg) ## Installation Get the package ```shell yarn add @editorjs/checklist ``` Include m
- Lines: 81
- Characters: 1463

---

# Source: .\node_modules\@editorjs\code\README.md

- Preview: ![](https://badgen.net/badge/Editor.js/v2.0/blue) # Code Tool for Editor.js Code Tool for the [Editor.js](https://ifmo.su/editor) allows to include code examples in your articles. ![](https://capella.pics/8df022f5-b4d5-4d30-a527-2a0efb63f291.jpg) ## Installation Get the package ```shell yarn add @editorjs/code ``` Include module at your application ```javascript import CodeTool from '@editorjs/cod
- Lines: 63
- Characters: 1028

---

# Source: .\node_modules\@editorjs\delimiter\README.md

- Preview: ![](https://badgen.net/badge/Editor.js/v2.0/blue) # Delimiter Tool for Editor.js Delimiter Tool for the [Editor.js](https://editorjs.io). ![](assets/68747470733a2f2f636170656c6c612e706963732f64653730653766382d353663642d343737392d383438662d3532633366363864656234372e6a7067.jpeg) ## Installation Get the package ```shell yarn add @editorjs/delimiter ``` Include module at your application ```javascript
- Lines: 59
- Characters: 871

---

# Source: .\node_modules\@editorjs\dom\README.md

- Preview: # @editorjs/dom Utils useful for work with dom for Editor.js tools development ### Installation ``` npm install @editorjs/dom ``` ### Function list - [allInputsSelector](https://github.com/editor-js/utils/blob/main/packages/dom/src/allInputsSelector/allInputsSelector.ts) - Returns CSS selector for all text inputs - [append](https://github.com/editor-js/utils/blob/main/packages/dom/src/append/appen
- Lines: 43
- Characters: 4820

---

# Source: .\node_modules\@editorjs\editorjs\README.md

- Preview: <p align="center"> <a href="https://editorjs.io/"> <picture> <source media="(prefers-color-scheme: dark)"  srcset="./assets/logo_night.png"> <source media="(prefers-color-scheme: light)" srcset="./assets/logo_day.png"> <img alt="Editor.js Logo" src="./assets/logo_day.png"> </picture> </a> </p> <p align="center"> <a href="https://editorjs.io/">editorjs.io</a> | <a href="https://editorjs.io/base-con
- Lines: 247
- Characters: 9138

---

# Source: .\node_modules\@editorjs\header\node_modules\@codexteam\icons\README.md

- Preview: # CodeX Icons Dozens of cute icons made with love by CodeX for your projects. No dependencies required. Free to use and share. ## Usage Install the package with node package manager. ```sh npm install @codexteam/icons yarn add @codexteam/icons ``` And import required icons. ```js import { IconH1 } from '@codexteam/icons'; console.log(IconH1); ``` You will get the line: `<svg xmlns="http://www.w3.o
- Lines: 102
- Characters: 4822

---

# Source: .\node_modules\@editorjs\header\README.md

- Preview: # Heading Tool ![Version of EditorJS that the plugin is compatible with](https://badgen.net/badge/Editor.js/v2.0/blue) Provides Headings Blocks for the [Editor.js](https://ifmo.su/editor). ## Installation Get the package ```shell yarn add @editorjs/header ``` Include module at your application ```javascript import Header from '@editorjs/header'; ``` Optionally, you can load this tool from CDN [JsD
- Lines: 114
- Characters: 2033

---

# Source: .\node_modules\@editorjs\helpers\README.md

- Preview: # @editorjs/helpers Utils useful for Editor.js tools development ### Installation ``` npm install @editorjs/helpers ``` ### Function list - [beautifyShortcut](https://github.com/editor-js/utils/blob/main/packages/helpers/src/beautifyShortcut/beautifyShortcut.ts) - Make shortcut command more human-readable - [cacheable](https://github.com/editor-js/utils/blob/main/packages/helpers/src/cacheable/cac
- Lines: 41
- Characters: 4384

---

# Source: .\node_modules\@editorjs\list\node_modules\@codexteam\icons\README.md

- Preview: # CodeX Icons Dozens of cute icons made with love by CodeX for your projects. No dependencies required. Free to use and share. ## Usage Install the package with node package manager. ```sh npm install @codexteam/icons yarn add @codexteam/icons ``` And import required icons. ```js import { IconH1 } from '@codexteam/icons'; console.log(IconH1); ``` You will get the line: `<svg xmlns="http://www.w3.o
- Lines: 101
- Characters: 4760

---

# Source: .\node_modules\@editorjs\list\README.md

- Preview: ![](https://badgen.net/badge/Editor.js/v2.0/blue) # List Tool for Editor.js This Tool for the [Editor.js](https://editorjs.io) allows you to add ordered or unordered (bulleted) lists to your article. ![](assets/example.gif) ## Installation Get the package ```shell yarn add @editorjs/list ``` Include module at your application ```javascript import List from "@editorjs/list"; ``` Optionally, you can
- Lines: 96
- Characters: 2118

---

# Source: .\node_modules\@editorjs\quote\node_modules\@editorjs\dom\README.md

- Preview: # @editorjs/dom Utils useful for work with dom for Editor.js tools development ### Installation ``` npm install @editorjs/dom ``` ### Function list - [allInputsSelector](https://github.com/editor-js/utils/blob/main/packages/dom/src/allInputsSelector/allInputsSelector.ts) - Returns CSS selector for all text inputs - [append](https://github.com/editor-js/utils/blob/main/packages/dom/src/append/appen
- Lines: 43
- Characters: 4820

---

# Source: .\node_modules\@editorjs\quote\node_modules\@editorjs\helpers\README.md

- Preview: # @editorjs/helpers Utils useful for Editor.js tools development ### Installation ``` npm install @editorjs/helpers ``` ### Function list - [beautifyShortcut](https://github.com/editor-js/utils/blob/main/packages/helpers/src/beautifyShortcut/beautifyShortcut.ts) - Make shortcut command more human-readable - [cacheable](https://github.com/editor-js/utils/blob/main/packages/helpers/src/cacheable/cac
- Lines: 41
- Characters: 4384

---

# Source: .\node_modules\@editorjs\quote\README.md

- Preview: ![](https://badgen.net/badge/Editor.js/v2.0/blue) # Quote Tool Provides Quote Blocks for the [Editor.js](https://editorjs.io). ![](https://capella.pics/017dca46-6869-40cb-93a0-994416576e33.jpg) ## Installation Get the package ```shell yarn add @editorjs/quote ``` Include module at your application ```javascript import Quote from '@editorjs/quote'; ``` Optionally, you can load this tool from CDN [J
- Lines: 99
- Characters: 1829

---

# Source: .\node_modules\@editorjs\table\node_modules\@codexteam\icons\README.md

- Preview: # CodeX Icons Dozens of cute icons made with love by CodeX for your projects. No dependencies required. Free to use and share. ## Usage Install the package with node package manager. ```sh npm install @codexteam/icons yarn add @codexteam/icons ``` And import required icons. ```js import { IconH1 } from '@codexteam/icons'; console.log(IconH1); ``` You will get the line: `<svg xmlns="http://www.w3.o
- Lines: 105
- Characters: 5011

---

# Source: .\node_modules\@editorjs\table\README.md

- Preview: # Table tool The Table Block for the [Editor.js](https://editorjs.io). Finally improved. ![](assets/68747470733a2f2f636170656c6c612e706963732f34313239346365632d613262332d343135372d383339392d6666656665643364386666642e6a7067.jpeg) ## Installation Get the package ```shell yarn add @editorjs/table ``` Include module at your application ```javascript import Table from '@editorjs/table' ``` Optionally,
- Lines: 111
- Characters: 3317

---

# Source: .\node_modules\@emnapi\core\README.md

- Preview: See [https://github.com/toyobayashi/emnapi](https://github.com/toyobayashi/emnapi)
- Lines: 4
- Characters: 82

---

# Source: .\node_modules\@emnapi\runtime\README.md

- Preview: See [https://github.com/toyobayashi/emnapi](https://github.com/toyobayashi/emnapi)
- Lines: 4
- Characters: 82

---

# Source: .\node_modules\@emoji-mart\data\README.md

- Preview: # `@emoji-mart/data` This package contains the data used by [EmojiMart](https://missiveapp.com/open/emoji-mart).
- Lines: 6
- Characters: 111

---

# Source: .\node_modules\@erquhart\convex-oss-stats\README.md

- Preview: # Convex OSS Stats Component [![npm version](https://badge.fury.io/js/@erquhart%2Fconvex-oss-stats.svg)](https://badge.fury.io/js/@erquhart%2Fconvex-oss-stats) <!-- START: Include on https://convex.dev/components --> Keep GitHub and npm data for your open source projects synced to your Convex database. ```ts // convex/stats.ts import { components } from "./_generated/api"; import { OssStats } from
- Lines: 368
- Characters: 9212

---

# Source: .\node_modules\@esbuild\win32-x64\README.md

- Preview: # esbuild This is the Windows 64-bit binary for esbuild, a JavaScript bundler and minifier. See https://github.com/evanw/esbuild for details.
- Lines: 6
- Characters: 140

---

# Source: .\node_modules\@eslint\config-array\README.md

- Preview: # Config Array ## Description A config array is a way of managing configurations that are based on glob pattern matching of filenames. Each config array contains the information needed to determine the correct configuration for any file based on the filename. **Note:** This is a generic package that can be used outside of ESLint. It contains no ESLint-specific functionality. ## Installation For No
- Lines: 372
- Characters: 17588

---

# Source: .\node_modules\@eslint\config-helpers\README.md

- Preview: # @eslint/config-helpers ## Description Helper utilities for creating ESLint configuration. ## Installation For Node.js and compatible runtimes: ```shell npm install @eslint/config-helpers # or yarn add @eslint/config-helpers # or pnpm install @eslint/config-helpers # or bun add @eslint/config-helpers ``` For Deno: ```shell deno add @eslint/config-helpers ``` ## Usage ### `defineConfig()` The `def
- Lines: 100
- Characters: 4934

---

# Source: .\node_modules\@eslint\core\README.md

- Preview: # ESLint Core ## Overview This package is the future home of the rewritten, runtime-agnostic ESLint core. Right now, it exports the core types necessary to implement language plugins. ## License Apache 2.0 <!-- NOTE: This section is autogenerated. Do not manually edit.--> <!--sponsorsstart--> ## Sponsors The following companies, organizations, and individuals support ESLint's ongoing maintenance a
- Lines: 32
- Characters: 3673

---

# Source: .\node_modules\@eslint\eslintrc\node_modules\globals\readme.md

- Preview: # globals > Global identifiers from different JavaScript environments It's just a [JSON file](globals.json), so use it in any environment. This package is used by ESLint. **This package [no longer accepts](https://github.com/sindresorhus/globals/issues/82) new environments. If you need it for ESLint, just [create a plugin](http://eslint.org/docs/developer-guide/working-with-plugins#environments-in
- Lines: 47
- Characters: 1616

---

# Source: .\node_modules\@eslint\eslintrc\README.md

- Preview: # ESLintRC Library This repository contains the legacy ESLintRC configuration file format for ESLint. This package is not intended for use outside of the ESLint ecosystem. It is ESLint-specific and not intended for use in other programs. **Note:** This package is frozen except for critical bug fixes as ESLint moves to a new config system. ## Installation You can install the package as follows: ```
- Lines: 131
- Characters: 3747

---

# Source: .\node_modules\@eslint\js\README.md

- Preview: [![npm version](https://img.shields.io/npm/v/@eslint/js.svg)](https://www.npmjs.com/package/@eslint/js) [![Downloads](https://img.shields.io/npm/dm/@eslint/js.svg)](https://www.npmjs.com/package/@eslint/js) [![Build Status](https://github.com/eslint/eslint/workflows/CI/badge.svg)](https://github.com/eslint/eslint/actions) <br> [![Open Collective Backers](https://img.shields.io/opencollective/backe
- Lines: 106
- Characters: 2474

---

# Source: .\node_modules\@eslint\object-schema\README.md

- Preview: # ObjectSchema Package ## Overview A JavaScript object merge/validation utility where you can define a different merge and validation strategy for each key. This is helpful when you need to validate complex data structures and then merge them in a way that is more complex than `Object.assign()`. This is used in the [`@eslint/config-array`](https://npmjs.com/package/@eslint/config-array) package bu
- Lines: 245
- Characters: 8115

---

# Source: .\node_modules\@eslint\plugin-kit\README.md

- Preview: # ESLint Plugin Kit ## Description A collection of utilities to help build ESLint plugins. ## Installation For Node.js and compatible runtimes: ```shell npm install @eslint/plugin-kit # or yarn add @eslint/plugin-kit # or pnpm install @eslint/plugin-kit # or bun add @eslint/plugin-kit ``` For Deno: ```shell deno add @eslint/plugin-kit ``` ## Usage This package exports the following utilities: - [`
- Lines: 276
- Characters: 11915

---

# Source: .\node_modules\@eslint-community\eslint-utils\node_modules\eslint-visitor-keys\README.md

- Preview: # eslint-visitor-keys [![npm version](https://img.shields.io/npm/v/eslint-visitor-keys.svg)](https://www.npmjs.com/package/eslint-visitor-keys) [![Downloads/month](https://img.shields.io/npm/dm/eslint-visitor-keys.svg)](http://www.npmtrends.com/eslint-visitor-keys) [![Build Status](https://github.com/eslint/eslint-visitor-keys/workflows/CI/badge.svg)](https://github.com/eslint/eslint-visitor-keys/
- Lines: 108
- Characters: 2610

---

# Source: .\node_modules\@eslint-community\eslint-utils\README.md

- Preview: # @eslint-community/eslint-utils [![npm version](https://img.shields.io/npm/v/@eslint-community/eslint-utils.svg)](https://www.npmjs.com/package/@eslint-community/eslint-utils) [![Downloads/month](https://img.shields.io/npm/dm/@eslint-community/eslint-utils.svg)](http://www.npmtrends.com/@eslint-community/eslint-utils) [![Build Status](https://github.com/eslint-community/eslint-utils/workflows/CI/
- Lines: 40
- Characters: 1637

---

# Source: .\node_modules\@eslint-community\regexpp\README.md

- Preview: # @eslint-community/regexpp [![npm version](https://img.shields.io/npm/v/@eslint-community/regexpp.svg)](https://www.npmjs.com/package/@eslint-community/regexpp) [![Downloads/month](https://img.shields.io/npm/dm/@eslint-community/regexpp.svg)](http://www.npmtrends.com/@eslint-community/regexpp) [![Build Status](https://github.com/eslint-community/regexpp/workflows/CI/badge.svg)](https://github.com
- Lines: 180
- Characters: 5478

---

# Source: .\node_modules\@floating-ui\core\README.md

- Preview: # @floating-ui/core This is the platform-agnostic core of Floating UI, exposing the main `computePosition` function but no platform interface logic.
- Lines: 7
- Characters: 146

---

# Source: .\node_modules\@floating-ui\dom\README.md

- Preview: # @floating-ui/dom This is the library to use Floating UI on the web, wrapping `@floating-ui/core` with DOM interface logic.
- Lines: 7
- Characters: 122

---

# Source: .\node_modules\@floating-ui\react\README.md

- Preview: # @floating-ui/react This is the library to use Floating UI with React.
- Lines: 6
- Characters: 70

---

# Source: .\node_modules\@floating-ui\react-dom\README.md

- Preview: # @floating-ui/react-dom This is the library to use Floating UI with React DOM.
- Lines: 6
- Characters: 78

---

# Source: .\node_modules\@floating-ui\utils\README.md

- Preview: # @floating-ui/utils Utility functions shared across Floating UI packages. You may use these functions in your own projects, but are subject to breaking changes.
- Lines: 7
- Characters: 159

---

# Source: .\node_modules\@google\genai\README.md

- Preview: # Google Gen AI SDK for TypeScript and JavaScript [![NPM Downloads](https://img.shields.io/npm/dw/%40google%2Fgenai)](https://www.npmjs.com/package/@google/genai) [![Node Current](https://img.shields.io/node/v/%40google%2Fgenai)](https://www.npmjs.com/package/@google/genai) ---------------------- **Documentation:** https://googleapis.github.io/js-genai/ ---------------------- The Google Gen AI Jav
- Lines: 380
- Characters: 11891

---

# Source: .\node_modules\@hello-pangea\dnd\README.md

- Preview: <p align="center"> <img src="https://user-images.githubusercontent.com/2182637/53611918-54c1ff80-3c24-11e9-9917-66ac3cef513d.png" alt="react beautiful dnd logo" /> </p> <h1 align="center">@hello-pangea/dnd</h1> <div align="center"> **Beautiful** and **accessible** drag and drop for lists with [`React`](https://facebook.github.io/react/) [![CircleCI branch](https://img.shields.io/circleci/project/g
- Lines: 175
- Characters: 10579

---

# Source: .\node_modules\@humanfs\core\README.md

- Preview: # `@humanfs/core` by [Nicholas C. Zakas](https://humanwhocodes.com) If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate) or [nominate me](https://stars.github.com/nominate/) for a GitHub Star. ## Description The core functionality for humanfs that is shared across all implementations for all runtimes. The contents of this package are inten
- Lines: 143
- Characters: 3196

---

# Source: .\node_modules\@humanfs\node\README.md

- Preview: # `@humanfs/node` by [Nicholas C. Zakas](https://humanwhocodes.com) If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate) or [nominate me](https://stars.github.com/nominate/) for a GitHub Star. ## Description The `hfs` bindings for use in Node.js and Node.js-compatible runtimes. > [!WARNING] > This project is **experimental** and may change
- Lines: 144
- Characters: 3007

---

# Source: .\node_modules\@humanwhocodes\module-importer\CHANGELOG.md

- Preview: # Changelog ## [1.0.1](https://github.com/humanwhocodes/module-importer/compare/v1.0.0...v1.0.1) (2022-08-18) ### Bug Fixes * Ensure CommonJS mode works correctly. ([cf54a0b](https://github.com/humanwhocodes/module-importer/commit/cf54a0b998085066fbe1776dd0b4cacd808cc192)), closes [#6](https://github.com/humanwhocodes/module-importer/issues/6) ## 1.0.0 (2022-08-17) ### Features * Implement ModuleI
- Lines: 18
- Characters: 515

---

# Source: .\node_modules\@humanwhocodes\module-importer\README.md

- Preview: # ModuleImporter by [Nicholas C. Zakas](https://humanwhocodes.com) If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate). ## Description A utility for seamlessly importing modules in Node.js regardless if they are CommonJS or ESM format. Under the hood, this uses `import()` and relies on Node.js's CommonJS compatibility to work correctly. T
- Lines: 83
- Characters: 2012

---

# Source: .\node_modules\@humanwhocodes\retry\README.md

- Preview: # Retry utility by [Nicholas C. Zakas](https://humanwhocodes.com) If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate) or [nominate me](https://stars.github.com/nominate/) for a GitHub Star. ## Description A utility for retrying failed async JavaScript calls based on the error returned. ## Usage ### Node.js Install using [npm][npm] or [yar
- Lines: 180
- Characters: 4090

---

# Source: .\node_modules\@isaacs\cliui\README.md

- Preview: # @isaacs/cliui Temporary fork of [cliui](http://npm.im/cliui). ![ci](https://github.com/yargs/cliui/workflows/ci/badge.svg) [![NPM version](https://img.shields.io/npm/v/cliui.svg)](https://www.npmjs.com/package/cliui) [![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org) ![nycrc config on GitHub](https://img.shields.io/nyc
- Lines: 146
- Characters: 2912

---

# Source: .\node_modules\@jridgewell\gen-mapping\README.md

- Preview: # @jridgewell/gen-mapping > Generate source maps `gen-mapping` allows you to generate a source map during transpilation or minification. With a source map, you're able to trace the original location in the source file, either in Chrome's DevTools or using a library like [`@jridgewell/trace-mapping`][trace-mapping]. You may already be familiar with the [`source-map`][source-map] package's `SourceMa
- Lines: 230
- Characters: 7239

---

# Source: .\node_modules\@jridgewell\remapping\README.md

- Preview: # @jridgewell/remapping > Remap sequential sourcemaps through transformations to point at the original source code Remapping allows you to take the sourcemaps generated through transforming your code and "remap" them to the original source locations. Think "my minified code, transformed with babel and bundled with webpack", all pointing to the correct location in your original source code. With re
- Lines: 221
- Characters: 7082

---

# Source: .\node_modules\@jridgewell\resolve-uri\README.md

- Preview: # @jridgewell/resolve-uri > Resolve a URI relative to an optional base URI Resolve any combination of absolute URIs, protocol-realtive URIs, absolute paths, or relative paths. ## Installation ```sh npm install @jridgewell/resolve-uri ``` ## Usage ```typescript function resolve(input: string, base?: string): string; ``` ```js import resolve from '@jridgewell/resolve-uri'; resolve('foo', 'https://ex
- Lines: 43
- Characters: 2786

---

# Source: .\node_modules\@jridgewell\sourcemap-codec\README.md

- Preview: # @jridgewell/sourcemap-codec Encode/decode the `mappings` property of a [sourcemap](https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit). ## Why? Sourcemaps are difficult to generate and manipulate, because the `mappings` property – the part that actually links the generated code back to the original source – is encoded using an obscure method called [Variable-len
- Lines: 267
- Characters: 9726

---

# Source: .\node_modules\@jridgewell\trace-mapping\README.md

- Preview: # @jridgewell/trace-mapping > Trace the original position through a source map `trace-mapping` allows you to take the line and column of an output file and trace it to the original location in the source file through a source map. You may already be familiar with the [`source-map`][source-map] package's `SourceMapConsumer`. This provides the same `originalPositionFor` and `generatedPositionFor` AP
- Lines: 351
- Characters: 13974

---

# Source: .\node_modules\@mantine\core\README.md

- Preview: # Mantine core [![npm](https://img.shields.io/npm/dm/@mantine/core)](https://www.npmjs.com/package/@mantine/core) Mantine core components library. [View documentation](https://mantine.dev/) ## Installation ```bash # With yarn yarn add @mantine/core @mantine/hooks # With npm npm install @mantine/core @mantine/hooks ``` ## License MIT
- Lines: 24
- Characters: 322

---

# Source: .\node_modules\@mantine\hooks\README.md

- Preview: # Mantine Hooks [![npm](https://img.shields.io/npm/dm/@mantine/hooks)](https://www.npmjs.com/package/@mantine/hooks) A set of react hooks for state and UI management [View documentation](https://mantine.dev/) ## Installation ```bash # With yarn yarn add @mantine/hooks # With npm npm install @mantine/hooks ``` ## License MIT
- Lines: 24
- Characters: 313

---

# Source: .\node_modules\@mantine\utils\README.md

- Preview: # Mantine Hooks [![npm](https://img.shields.io/npm/dm/@mantine/utils)](https://www.npmjs.com/package/@mantine/utils) A set of utils used in Mantine packages [View documentation](https://mantine.dev/) ## Installation ```bash # With yarn yarn add @mantine/utils # With npm npm install @mantine/utils ``` ## License MIT
- Lines: 24
- Characters: 304

---

# Source: .\node_modules\@mdx-js\react\readme.md

- Preview: # `@mdx-js/react` [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] React context for MDX. <!-- more --> ## Contents * [What is this?](#what-is-this) * [When should I use this?](#when-should-i-use-t
- Lines: 278
- Characters: 6825

---

# Source: .\node_modules\@modelcontextprotocol\sdk\README.md

- Preview: # MCP TypeScript SDK ![NPM Version](https://img.shields.io/npm/v/%40modelcontextprotocol%2Fsdk) ![MIT licensed](https://img.shields.io/npm/l/%40modelcontextprotocol%2Fsdk) <details> <summary>Table of Contents</summary> - [Overview](#overview) - [Installation](#installation) - [Quickstart](#quick-start) - [What is MCP?](#what-is-mcp) - [Core Concepts](#core-concepts) - [Server](#server) - [Resource
- Lines: 1512
- Characters: 45815

---

# Source: .\node_modules\@neoconfetti\react\README.md

- Preview: # @neoconfetti/react Let's party 🎊🎊 with React! `@neoconfetti/react` allows you to show an awesome confetti explosion on your page, with React/Preact/Million! ## Features - 🤏 Tiny - 1.61KB min+br. - 🐇 Simple - Quite simple to use, and effectively no-config required! - 🗃️ Customizable - Offers tons of options that you can modify to get different behaviors. - 🖥️ SSR friendly - Works seamlessly
- Lines: 205
- Characters: 4407

---

# Source: .\node_modules\@nodelib\fs.scandir\README.md

- Preview: # @nodelib/fs.scandir > List files and directories inside the specified directory. ## :bulb: Highlights The package is aimed at obtaining information about entries in the directory. * :moneybag: Returns useful information: `name`, `path`, `dirent` and `stats` (optional). * :gear: On Node.js 10.10+ uses the mechanism without additional calls to determine the entry type. See [`old` and `modern` mode
- Lines: 174
- Characters: 4770

---

# Source: .\node_modules\@nodelib\fs.stat\README.md

- Preview: # @nodelib/fs.stat > Get the status of a file with some features. ## :bulb: Highlights Wrapper around standard method `fs.lstat` and `fs.stat` with some features. * :beginner: Normally follows symbolic link. * :gear: Can safely work with broken symbolic link. ## Install ```console npm install @nodelib/fs.stat ``` ## Usage ```ts import * as fsStat from '@nodelib/fs.stat'; fsStat.stat('path', (error
- Lines: 129
- Characters: 2941

---

# Source: .\node_modules\@nodelib\fs.walk\README.md

- Preview: # @nodelib/fs.walk > A library for efficiently walking a directory recursively. ## :bulb: Highlights * :moneybag: Returns useful information: `name`, `path`, `dirent` and `stats` (optional). * :rocket: On Node.js 10.10+ uses the mechanism without additional calls to determine the entry type for performance reasons. See [`old` and `modern` mode](https://github.com/nodelib/nodelib/blob/master/packag
- Lines: 218
- Characters: 5904

---

# Source: .\node_modules\@node-rs\argon2\README.md

- Preview: # `@node-rs/argon2` ![](https://github.com/napi-rs/node-rs/workflows/CI/badge.svg) ![](https://img.shields.io/npm/dm/@node-rs/argon2.svg?sanitize=true) [RustCrypto: Argon2](https://crates.io/crates/argon2) binding for Node.js. Argon2 is a [key derivation function](https://en.wikipedia.org/wiki/Key_derivation_function) that was selected as the winner of the [Password Hashing Competition(PHC)](https
- Lines: 118
- Characters: 5177

---

# Source: .\node_modules\@node-rs\argon2-win32-x64-msvc\README.md

- Preview: # `@node-rs/argon2-win32-x64-msvc` This is the **x86_64-pc-windows-msvc** binary for `@node-rs/argon2`
- Lines: 6
- Characters: 101

---

# Source: .\node_modules\@node-rs\bcrypt\README.md

- Preview: # `@node-rs/bcrypt` ![](https://github.com/napi-rs/node-rs/workflows/CI/badge.svg) ![](https://img.shields.io/npm/dm/@node-rs/bcrypt.svg?sanitize=true) 🚀 Fastest bcrypt in Node.js ## Support matrix |                  | node12 | node14 | node16 | node18 | | ---------------- | ------ | ------ | ------ | ------ | | Windows x64      | ✓      | ✓      | ✓      | ✓      | | Windows x32      | ✓      |
- Lines: 90
- Characters: 3033

---

# Source: .\node_modules\@node-rs\bcrypt-win32-x64-msvc\README.md

- Preview: # `@node-rs/bcrypt-win32-x64-msvc` This is the **x86_64-pc-windows-msvc** binary for `@node-rs/bcrypt`
- Lines: 6
- Characters: 101

---

# Source: .\node_modules\@octokit\app\README.md

- Preview: # app.js > GitHub App toolset for Node.js [![@latest](https://img.shields.io/npm/v/@octokit/app.svg)](https://www.npmjs.com/package/@octokit/app) [![Build Status](https://github.com/octokit/app.js/workflows/Test/badge.svg)](https://github.com/octokit/app.js/actions?workflow=Test) <!-- toc --> - [Usage](#usage) - [`App.defaults(options)`](#appdefaultsoptions) - [Constructor](#constructor) - [API](#
- Lines: 443
- Characters: 13053

---

# Source: .\node_modules\@octokit\auth-app\README.md

- Preview: # auth-app.js > GitHub App authentication for JavaScript [![@latest](https://img.shields.io/npm/v/@octokit/auth-app.svg)](https://www.npmjs.com/package/@octokit/auth-app) [![Build Status](https://github.com/octokit/auth-app.js/workflows/Test/badge.svg)](https://github.com/octokit/auth-app.js/actions?query=workflow%3ATest) `@octokit/auth-app` implements authentication for GitHub Apps using [JSON We
- Lines: 1399
- Characters: 34193

---

# Source: .\node_modules\@octokit\auth-oauth-app\README.md

- Preview: # auth-oauth-app.js > GitHub OAuth App authentication for JavaScript [![@latest](https://img.shields.io/npm/v/@octokit/auth-oauth-app.svg)](https://www.npmjs.com/package/@octokit/auth-oauth-app) [![Build Status](https://github.com/octokit/auth-oauth-app.js/workflows/Test/badge.svg)](https://github.com/octokit/auth-oauth-app.js/actions?query=workflow%3ATest) `@octokit/auth-oauth-app` is implementin
- Lines: 1062
- Characters: 26376

---

# Source: .\node_modules\@octokit\auth-oauth-device\README.md

- Preview: # auth-oauth-device.js > GitHub OAuth Device authentication strategy for JavaScript [![@latest](https://img.shields.io/npm/v/@octokit/auth-oauth-device.svg)](https://www.npmjs.com/package/@octokit/auth-oauth-device) [![Build Status](https://github.com/octokit/auth-oauth-device.js/workflows/Test/badge.svg)](https://github.com/octokit/auth-oauth-device.js/actions?query=workflow%3ATest+branch%3Amain)
- Lines: 665
- Characters: 15192

---

# Source: .\node_modules\@octokit\auth-oauth-user\README.md

- Preview: # auth-oauth-user.js > Octokit authentication strategy for OAuth user authentication [![@latest](https://img.shields.io/npm/v/@octokit/auth-oauth-user.svg)](https://www.npmjs.com/package/@octokit/auth-oauth-user) [![Build Status](https://github.com/octokit/auth-oauth-user.js/workflows/Test/badge.svg)](https://github.com/octokit/auth-oauth-user.js/actions?query=workflow%3ATest+branch%3Amain) **Impo
- Lines: 1041
- Characters: 25619

---

# Source: .\node_modules\@octokit\auth-token\README.md

- Preview: # auth-token.js > GitHub API token authentication for browsers and Node.js [![@latest](https://img.shields.io/npm/v/@octokit/auth-token.svg)](https://www.npmjs.com/package/@octokit/auth-token) [![Build Status](https://github.com/octokit/auth-token.js/workflows/Test/badge.svg)](https://github.com/octokit/auth-token.js/actions?query=workflow%3ATest) `@octokit/auth-token` is the simplest of [GitHub’s
- Lines: 287
- Characters: 8490

---

# Source: .\node_modules\@octokit\auth-unauthenticated\README.md

- Preview: # auth-unauthenticated.js > strategy for explicitly unauthenticated Octokit instances [![@latest](https://img.shields.io/npm/v/@octokit/auth-unauthenticated.svg)](https://www.npmjs.com/package/@octokit/auth-unauthenticated) [![Build Status](https://github.com/octokit/auth-unauthenticated.js/workflows/Test/badge.svg)](https://github.com/octokit/auth-unauthenticated.js/actions?query=workflow%3ATest)
- Lines: 151
- Characters: 4866

---

# Source: .\node_modules\@octokit\core\README.md

- Preview: # core.js > Extendable client for GitHub's REST & GraphQL APIs [![@latest](https://img.shields.io/npm/v/@octokit/core.svg)](https://www.npmjs.com/package/@octokit/core) [![Build Status](https://github.com/octokit/core.js/workflows/Test/badge.svg)](https://github.com/octokit/core.js/actions?query=workflow%3ATest+branch%3Amain) <!-- toc --> - [Usage](#usage) - [REST API example](#rest-api-example) -
- Lines: 460
- Characters: 12329

---

# Source: .\node_modules\@octokit\endpoint\README.md

- Preview: # endpoint.js > Turns GitHub REST API endpoints into generic request options [![@latest](https://img.shields.io/npm/v/@octokit/endpoint.svg)](https://www.npmjs.com/package/@octokit/endpoint) [![Build Status](https://github.com/octokit/endpoint.js/workflows/Test/badge.svg)](https://github.com/octokit/endpoint.js/actions/workflows/test.yml?query=branch%3Amain) `@octokit/endpoint` combines [GitHub RE
- Lines: 415
- Characters: 11500

---

# Source: .\node_modules\@octokit\graphql\README.md

- Preview: # graphql.js > GitHub GraphQL API client for browsers and Node [![@latest](https://img.shields.io/npm/v/@octokit/graphql.svg)](https://www.npmjs.com/package/@octokit/graphql) [![Build Status](https://github.com/octokit/graphql.js/workflows/Test/badge.svg)](https://github.com/octokit/graphql.js/actions?query=workflow%3ATest+branch%3Amain) <!-- toc --> - [Usage](#usage) - [Send a simple query](#send
- Lines: 411
- Characters: 9004

---

# Source: .\node_modules\@octokit\graphql-schema\.github\pull_request_template.md

- Preview: <!-- Please refer to our contributing docs for any questions on submitting a pull request --> <!-- Issues are required for both bug fixes and features. --> Resolves #ISSUE_NUMBER ---- ### Before the change? <!-- Please describe the current behavior that you are modifying. --> * ### After the change? <!-- Please describe the behavior or changes that are being added by this PR. --> * ### Pull reques
- Lines: 33
- Characters: 850

---

# Source: .\node_modules\@octokit\graphql-schema\CODE_OF_CONDUCT.md

- Preview: # Contributor Covenant Code of Conduct ## Our Pledge In the interest of fostering an open and welcoming environment, we as contributors and maintainers pledge to making participation in our project and our community a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, r
- Lines: 49
- Characters: 3167

---

# Source: .\node_modules\@octokit\graphql-schema\CONTRIBUTING.md

- Preview: # How to contribute Support and contributions from the open source community are essential for keeping the `graphql-schema` up to date and always improving! There are a few guidelines that we need contributors to follow to keep the project consistent, as well as allow us to keep maintaining `graphql-schema` in a reasonable amount of time. Please note that this project is released with a [Contribut
- Lines: 50
- Characters: 2358

---

# Source: .\node_modules\@octokit\graphql-schema\LICENSE.md

- Preview: Copyright (c) 2017 Gregor Martynus Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the S
- Lines: 23
- Characters: 1039

---

# Source: .\node_modules\@octokit\graphql-schema\README.md

- Preview: # graphql-schema > GitHub’s GraphQL Schema with validation. Automatically updated. ![Test](https://github.com/octokit/graphql-schema/workflows/Test/badge.svg) ## Usage ### Validation ```js import { validate } from "@octokit/graphql-schema"; const errors = validate(` { viewer { login } } `); // errors is array. Contains errors if any ``` You can also load the current Schema directly as JSON or [IDL
- Lines: 86
- Characters: 1570

---

# Source: .\node_modules\@octokit\graphql-schema\SECURITY.md

- Preview: # Security Policy Thanks for helping make GitHub Open Source Software safe for everyone. GitHub takes the security of our software products and services seriously, including all of the open source code repositories managed through our GitHub organizations, such as [Octokit](https://github.com/octokit). Even though [open source repositories are outside of the scope of our bug bounty program](https:
- Lines: 14
- Characters: 882

---

# Source: .\node_modules\@octokit\oauth-app\README.md

- Preview: # oauth-app.js > GitHub OAuth toolset for Node.js [![@latest](https://img.shields.io/npm/v/@octokit/oauth-app.svg)](https://www.npmjs.com/package/@octokit/oauth-app) [![Build Status](https://github.com/octokit/oauth-app.js/workflows/Test/badge.svg)](https://github.com/octokit/oauth-app.js/actions?workflow=Test) <details> <summary>Table of contents</summary> <!-- toc --> - [Usage](#usage) - [For OA
- Lines: 1179
- Characters: 34151

---

# Source: .\node_modules\@octokit\oauth-authorization-url\README.md

- Preview: # oauth-authorization-url.js > Universal library to retrieve GitHub’s identity URL for the OAuth web flow [![@latest](https://img.shields.io/npm/v/@octokit/oauth-authorization-url.svg)](https://www.npmjs.com/package/@octokit/oauth-authorization-url) [![Build Status](https://github.com/octokit/oauth-authorization-url.js/workflows/Test/badge.svg)](https://github.com/octokit/oauth-authorization-url.j
- Lines: 284
- Characters: 7641

---

# Source: .\node_modules\@octokit\oauth-methods\README.md

- Preview: # oauth-methods.js > Set of stateless request methods to create, check, reset, refresh, and delete user access tokens for OAuth and GitHub Apps [![@latest](https://img.shields.io/npm/v/@octokit/oauth-methods.svg)](https://www.npmjs.com/package/@octokit/oauth-methods) [![Build Status](https://github.com/octokit/oauth-methods.js/workflows/Test/badge.svg)](https://github.com/octokit/oauth-methods.js/
- Lines: 1616
- Characters: 39177

---

# Source: .\node_modules\@octokit\openapi-types\README.md

- Preview: # @octokit/openapi-types > Generated TypeScript definitions based on GitHub's OpenAPI spec This package is continuously updated based on [GitHub's OpenAPI specification](https://github.com/github/rest-api-description/) ## Usage ```ts import { components } from "@octokit/openapi-types"; type Repository = components["schemas"]["full-repository"]; ``` ## License [MIT](LICENSE)
- Lines: 20
- Characters: 367

---

# Source: .\node_modules\@octokit\openapi-webhooks-types\README.md

- Preview: # @octokit/openapi-webhooks-types > Generated TypeScript definitions based on GitHub's OpenAPI spec This package is continously updated based on [GitHub's OpenAPI specification](https://github.com/github/rest-api-description/) ## Usage ```ts import { components } from "@octokit/openapi-webhooks-types"; type Repository = components["schemas"]["full-repository"]; ``` ## License [MIT](LICENSE)
- Lines: 20
- Characters: 384

---

# Source: .\node_modules\@octokit\plugin-paginate-graphql\README.md

- Preview: # plugin-paginate-graphql.js > Octokit plugin to paginate GraphQL API endpoint responses [![@latest](https://img.shields.io/npm/v/@octokit/plugin-paginate-graphql.svg)](https://www.npmjs.com/package/@octokit/plugin-paginate-graphql) [![Build Status](https://github.com/octokit/plugin-paginate-graphql.js/workflows/Test/badge.svg)](https://github.com/octokit/plugin-paginate-graphql.js/actions?workflo
- Lines: 294
- Characters: 7766

---

# Source: .\node_modules\@octokit\plugin-paginate-rest\README.md

- Preview: # plugin-paginate-rest.js > Octokit plugin to paginate REST API endpoint responses [![@latest](https://img.shields.io/npm/v/@octokit/plugin-paginate-rest.svg)](https://www.npmjs.com/package/@octokit/plugin-paginate-rest) [![Build Status](https://github.com/octokit/plugin-paginate-rest.js/workflows/Test/badge.svg)](https://github.com/octokit/plugin-paginate-rest.js/actions?workflow=Test) ## Usage <
- Lines: 275
- Characters: 8442

---

# Source: .\node_modules\@octokit\plugin-rest-endpoint-methods\README.md

- Preview: # plugin-rest-endpoint-methods.js > Octokit plugin adding one method for all of api.github.com REST API endpoints [![@latest](https://img.shields.io/npm/v/@octokit/plugin-rest-endpoint-methods.svg)](https://www.npmjs.com/package/@octokit/plugin-rest-endpoint-methods) [![Build Status](https://github.com/octokit/plugin-rest-endpoint-methods.js/workflows/Test/badge.svg)](https://github.com/octokit/pl
- Lines: 83
- Characters: 2916

---

# Source: .\node_modules\@octokit\plugin-retry\README.md

- Preview: # plugin-retry.js > Retries requests for server 4xx/5xx responses except `400`, `401`, `403`, `404`, `410`, `422`, and `451`. [![@latest](https://img.shields.io/npm/v/@octokit/plugin-retry.svg)](https://www.npmjs.com/package/@octokit/plugin-retry) [![Build Status](https://github.com/octokit/plugin-retry.js/workflows/Test/badge.svg)](https://github.com/octokit/plugin-retry.js/actions?workflow=Test)
- Lines: 112
- Characters: 2950

---

# Source: .\node_modules\@octokit\plugin-throttling\README.md

- Preview: # plugin-throttling.js > Octokit plugin for GitHub’s recommended request throttling [![@latest](https://img.shields.io/npm/v/@octokit/plugin-throttling.svg)](https://www.npmjs.com/package/@octokit/plugin-throttling) [![Build Status](https://github.com/octokit/plugin-throttling.js/workflows/Test/badge.svg)](https://github.com/octokit/plugin-throttling.js/actions?workflow=Test) Implements all [recom
- Lines: 240
- Characters: 6582

---

# Source: .\node_modules\@octokit\request\README.md

- Preview: # request.js > Send parameterized requests to GitHub’s APIs with sensible defaults in browsers and Node [![@latest](https://img.shields.io/npm/v/@octokit/request.svg)](https://www.npmjs.com/package/@octokit/request) [![Build Status](https://github.com/octokit/request.js/workflows/Test/badge.svg)](https://github.com/octokit/request.js/actions?query=workflow%3ATest+branch%3Amain) `@octokit/request`
- Lines: 582
- Characters: 16595

---

# Source: .\node_modules\@octokit\request-error\README.md

- Preview: # request-error.js > Error class for Octokit request errors [![@latest](https://img.shields.io/npm/v/@octokit/request-error.svg)](https://www.npmjs.com/package/@octokit/request-error) [![Build Status](https://github.com/octokit/request-error.js/workflows/Test/badge.svg)](https://github.com/octokit/request-error.js/actions?query=workflow%3ATest) ## Usage <table> <tbody valign=top align=left> <tr><t
- Lines: 96
- Characters: 2236

---

# Source: .\node_modules\@octokit\types\README.md

- Preview: # types.ts > Shared TypeScript definitions for Octokit projects [![@latest](https://img.shields.io/npm/v/@octokit/types.svg)](https://www.npmjs.com/package/@octokit/types) [![Build Status](https://github.com/octokit/types.ts/workflows/Test/badge.svg)](https://github.com/octokit/types.ts/actions?workflow=Test) <!-- toc --> - [Usage](#usage) - [Examples](#examples) - [Get parameter and response data
- Lines: 68
- Characters: 1629

---

# Source: .\node_modules\@octokit\webhooks\LICENSE.md

- Preview: Copyright (c) GitHub 2025 - Licensed as MIT. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to
- Lines: 23
- Characters: 1049

---

# Source: .\node_modules\@octokit\webhooks\README.md

- Preview: # @octokit/webhooks > GitHub webhook events toolset for Node.js [![@latest](https://img.shields.io/npm/v/@octokit/webhooks.svg)](https://www.npmjs.com/package/@octokit/webhooks) [![Test](https://github.com/octokit/webhooks.js/workflows/Test/badge.svg)](https://github.com/octokit/webhooks.js/actions?query=workflow) <!-- toc --> - [Usage](#usage) - [Local development](#local-development) - [API](#ap
- Lines: 758
- Characters: 56663

---

# Source: .\node_modules\@octokit\webhooks-methods\README.md

- Preview: # webhooks-methods.js > Methods to handle GitHub Webhook requests [![@latest](https://img.shields.io/npm/v/@octokit/webhooks-methods.svg)](https://www.npmjs.com/package/@octokit/webhooks-methods) [![Build Status](https://github.com/octokit/webhooks-methods.js/workflows/Test/badge.svg)](https://github.com/octokit/webhooks-methods.js/actions?query=workflow%3ATest+branch%3Amain) <details> <summary>Ta
- Lines: 252
- Characters: 4731

---

# Source: .\node_modules\@opentelemetry\api\README.md

- Preview: # OpenTelemetry API for JavaScript <p align="center"> <strong> <a href="https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_api.html">API Reference</a> &nbsp;&nbsp;&bull;&nbsp;&nbsp; <a href="https://opentelemetry.io/docs/instrumentation/js/">Documentation</a> </br> <a href="https://github.com/open-telemetry/opentelemetry-js/releases"> <img alt="NPM Release" src="https://img.s
- Lines: 119
- Characters: 8202

---

# Source: .\node_modules\@oslojs\asn1\README.md

- Preview: # @oslojs/asn1 **Documentation: https://asn1.oslojs.dev** A JavaScript library for encoding and decoding ASN.1 with Distinguished Encoding Rules (DER) by [Oslo](https://oslojs.dev). - Runtime-agnostic - No third-party dependencies - Fully typed ```ts import { parseASN1NoLeftoverBytes } from "@oslojs/asn1"; const parsed = parseASN1NoLeftoverBytes(encoded); const oid = parsed.sequence().at(0).object
- Lines: 30
- Characters: 568

---

# Source: .\node_modules\@oslojs\binary\README.md

- Preview: # @oslojs/binary **Documentation: https://binary.oslojs.dev** A JavaScript library for working with binary data by [Oslo](https://oslojs.dev). Alongside [`@oslojs/encoding`](https://encoding.oslojs.dev) and [`@oslojs/crypto`](https://crypto.oslojs.dev), it aims to provide a basic toolbox for implementing auth and auth-related standards. ## Installation ``` npm i @oslojs/binary ```
- Lines: 16
- Characters: 376

---

# Source: .\node_modules\@oslojs\crypto\README.md

- Preview: # @oslojs/crypto documentation **Documentation: https://crypto.oslojs.dev** A basic JavaScript crypto library by [Oslo](https://oslojs.dev). Includes APIs for SHA-1, SHA-2, SHA-3, HMAC, ECDSA, RSA, and cryptographically secure random generator. - Runtime-agnostic - No third-party dependencies - Fully typed Algorithms such as SHA and ECDSA are tested against NIST test vectors. ## Installation ``` n
- Lines: 20
- Characters: 413

---

# Source: .\node_modules\@oslojs\encoding\README.md

- Preview: # @oslojs/encoding **Documentation: https://encoding.oslojs.dev** A JavaScript library for encoding and decoding data with hexadecimal, base32, base64, and base64url encoding schemes based on [RFC 4648](https://datatracker.ietf.org/doc/html/rfc4648). Implementations may be stricter than most to follow the RFC as close as possible. - Runtime-agnostic - No third-party dependencies - Fully typed ```t
- Lines: 26
- Characters: 641

---

# Source: .\node_modules\@panva\hkdf\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) 2021 Filip Skokan Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit pe
- Lines: 24
- Characters: 1058

---

# Source: .\node_modules\@panva\hkdf\README.md

- Preview: # hkdf > HKDF with no dependencies using runtime's native crypto HKDF is a simple key derivation function defined in [RFC 5869][]. ## Documentation ▸ **hkdf**(`digest`, `ikm`, `salt`, `info`, `keylen`): `Promise`<`Uint8Array`\> The given `ikm`, `salt` and `info` are used with the `digest` to derive a key of `keylen` bytes. ### Parameters | Name | Type | Description | | :------ | :------ | :------
- Lines: 75
- Characters: 1757

---

# Source: .\node_modules\@pkgjs\parseargs\CHANGELOG.md

- Preview: # Changelog ## [0.11.0](https://github.com/pkgjs/parseargs/compare/v0.10.0...v0.11.0) (2022-10-08) ### Features * add `default` option parameter ([#142](https://github.com/pkgjs/parseargs/issues/142)) ([cd20847](https://github.com/pkgjs/parseargs/commit/cd20847a00b2f556aa9c085ac83b942c60868ec1)) ## [0.10.0](https://github.com/pkgjs/parseargs/compare/v0.9.1...v0.10.0) (2022-07-21) ### Features * ad
- Lines: 150
- Characters: 6811

---

# Source: .\node_modules\@pkgjs\parseargs\README.md

- Preview: <!-- omit in toc --> # parseArgs [![Coverage][coverage-image]][coverage-url] Polyfill of `util.parseArgs()` ## `util.parseArgs([config])` <!-- YAML added: v18.3.0 changes: - version: REPLACEME pr-url: https://github.com/nodejs/node/pull/43459 description: add support for returning detailed parse information using `tokens` in input `config` and returned properties. --> > Stability: 1 - Experimental
- Lines: 416
- Characters: 13213

---

# Source: .\node_modules\@polar-sh\checkout\CHANGELOG.md

- Preview: # @polar-sh/checkout ## 0.1.12 ### Patch Changes - 4d49e8f: Fix console error when the iframe is already closed ## 0.1.11 ### Patch Changes - 664460e: Tweak allow policy on iframe ## 0.1.10 ### Patch Changes - 15e0267: Allow React 19 as a peer dependency ## 0.1.9 ### Patch Changes - de906a0: Handle case where the checkout element might have nested elements triggering the click event ## 0.1.8 ### P
- Lines: 92
- Characters: 1413

---

# Source: .\node_modules\@polar-sh\checkout\README.md

- Preview: # `@polar-sh/checkout` This package contains JavaScript utilities to easily integrate Polar Checkout into your website or application.
- Lines: 6
- Characters: 133

---

# Source: .\node_modules\@polar-sh\sdk\.devcontainer\README.md

- Preview: <div align="center"> <a href="https://codespaces.new/polarsource/polar-js.git/tree/main"><img src="https://github.com/codespaces/badge.svg" /></a> </div> <br> > **Remember to shutdown a GitHub Codespace when it is not in use!** # Dev Containers Quick Start The default location for usage snippets is the `samples` directory. ## Running a Usage Sample A sample usage example has been provided in a `ro
- Lines: 38
- Characters: 1085

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\benefitgrants\README.md

- Preview: # BenefitGrants (*customerPortal.benefitGrants*) ## Overview ### Available Operations * [list](#list) - List Benefit Grants * [get](#get) - Get Benefit Grant * [update](#update) - Update Benefit Grant ## list List benefits grants of the authenticated customer. **Scopes**: `customer_portal:read` `customer_portal:write` ### Example Usage <!-- UsageSnippet language="typescript" operationID="customer_
- Lines: 257
- Characters: 21049

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\benefits\README.md

- Preview: # Benefits (*benefits*) ## Overview ### Available Operations * [list](#list) - List Benefits * [create](#create) - Create Benefit * [get](#get) - Get Benefit * [update](#update) - Update Benefit * [delete](#delete) - Delete Benefit * [grants](#grants) - List Benefit Grants ## list List benefits. **Scopes**: `benefits:read` `benefits:write` ### Example Usage <!-- UsageSnippet language="typescript"
- Lines: 503
- Characters: 36367

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\checkoutlinks\README.md

- Preview: # CheckoutLinks (*checkoutLinks*) ## Overview ### Available Operations * [list](#list) - List Checkout Links * [create](#create) - Create Checkout Link * [get](#get) - Get Checkout Link * [update](#update) - Update Checkout Link * [delete](#delete) - Delete Checkout Link ## list List checkout links. **Scopes**: `checkout_links:read` `checkout_links:write` ### Example Usage <!-- UsageSnippet langua
- Lines: 410
- Characters: 30155

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\checkouts\README.md

- Preview: # Checkouts (*checkouts*) ## Overview ### Available Operations * [list](#list) - List Checkout Sessions * [create](#create) - Create Checkout Session * [get](#get) - Get Checkout Session * [update](#update) - Update Checkout Session * [clientGet](#clientget) - Get Checkout Session from Client * [clientUpdate](#clientupdate) - Update Checkout Session from Client * [clientConfirm](#clientconfirm) -
- Lines: 603
- Characters: 44674

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\customermeters\README.md

- Preview: # CustomerMeters (*customerMeters*) ## Overview ### Available Operations * [list](#list) - List Customer Meters * [get](#get) - Get Customer Meter ## list List customer meters. **Scopes**: `customer_meters:read` ### Example Usage <!-- UsageSnippet language="typescript" operationID="customer_meters:list" method="get" path="/v1/customer-meters/" --> ```typescript import { Polar } from "@polar-sh/sdk
- Lines: 169
- Characters: 12112

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\customerportal\README.md

- Preview: # CustomerPortal (*customerPortal*) ## Overview ### Available Operations
- Lines: 9
- Characters: 69

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\customers\README.md

- Preview: # Customers (*customers*) ## Overview ### Available Operations * [list](#list) - List Customers * [create](#create) - Create Customer * [get](#get) - Get Customer * [update](#update) - Update Customer * [delete](#delete) - Delete Customer * [getExternal](#getexternal) - Get Customer by External ID * [updateExternal](#updateexternal) - Update Customer by External ID * [deleteExternal](#deleteextern
- Lines: 884
- Characters: 61995

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\customersessions\README.md

- Preview: # CustomerSessions (*customerSessions*) ## Overview ### Available Operations * [create](#create) - Create Customer Session ## create Create a customer session. **Scopes**: `customer_sessions:write` ### Example Usage <!-- UsageSnippet language="typescript" operationID="customer-sessions:create" method="post" path="/v1/customer-sessions/" --> ```typescript import { Polar } from "@polar-sh/sdk"; cons
- Lines: 87
- Characters: 6032

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\customfields\README.md

- Preview: # CustomFields (*customFields*) ## Overview ### Available Operations * [list](#list) - List Custom Fields * [create](#create) - Create Custom Field * [get](#get) - Get Custom Field * [update](#update) - Update Custom Field * [delete](#delete) - Delete Custom Field ## list List custom fields. **Scopes**: `custom_fields:read` `custom_fields:write` ### Example Usage <!-- UsageSnippet language="typesc
- Lines: 420
- Characters: 30209

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\discounts\README.md

- Preview: # Discounts (*discounts*) ## Overview ### Available Operations * [list](#list) - List Discounts * [create](#create) - Create Discount * [get](#get) - Get Discount * [update](#update) - Update Discount * [delete](#delete) - Delete Discount ## list List discounts. **Scopes**: `discounts:read` `discounts:write` ### Example Usage <!-- UsageSnippet language="typescript" operationID="discounts:list" met
- Lines: 412
- Characters: 29910

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\downloadables\README.md

- Preview: # Downloadables (*customerPortal.downloadables*) ## Overview ### Available Operations * [list](#list) - List Downloadables ## list **Scopes**: `customer_portal:read` `customer_portal:write` ### Example Usage <!-- UsageSnippet language="typescript" operationID="customer_portal:downloadables:list" method="get" path="/v1/customer-portal/downloadables/" --> ```typescript import { Polar } from "@polar-
- Lines: 90
- Characters: 7011

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\events\README.md

- Preview: # Events (*events*) ## Overview ### Available Operations * [list](#list) - List Events * [listNames](#listnames) - List Event Names * [get](#get) - Get Event * [ingest](#ingest) - Ingest Events ## list List events. **Scopes**: `events:read` `events:write` ### Example Usage <!-- UsageSnippet language="typescript" operationID="events:list" method="get" path="/v1/events/" --> ```typescript import { P
- Lines: 327
- Characters: 23828

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\files\README.md

- Preview: # Files (*files*) ## Overview ### Available Operations * [list](#list) - List Files * [create](#create) - Create File * [uploaded](#uploaded) - Complete File Upload * [update](#update) - Update File * [delete](#delete) - Delete File ## list List files. **Scopes**: `files:read` `files:write` ### Example Usage <!-- UsageSnippet language="typescript" operationID="files:list" method="get" path="/v1/fi
- Lines: 463
- Characters: 31084

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\licensekeys\README.md

- Preview: # LicenseKeys (*licenseKeys*) ## Overview ### Available Operations * [list](#list) - List License Keys * [get](#get) - Get License Key * [update](#update) - Update License Key * [getActivation](#getactivation) - Get Activation * [validate](#validate) - Validate License Key * [activate](#activate) - Activate License Key * [deactivate](#deactivate) - Deactivate License Key ## list Get license keys c
- Lines: 579
- Characters: 43079

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\meters\README.md

- Preview: # Meters (*meters*) ## Overview ### Available Operations * [list](#list) - List Meters * [create](#create) - Create Meter * [get](#get) - Get Meter * [update](#update) - Update Meter * [quantities](#quantities) - Get Meter Quantities ## list List meters. **Scopes**: `meters:read` `meters:write` ### Example Usage <!-- UsageSnippet language="typescript" operationID="meters:list" method="get" path="/
- Lines: 440
- Characters: 30549

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\metrics\README.md

- Preview: # Metrics (*metrics*) ## Overview ### Available Operations * [get](#get) - Get Metrics * [limits](#limits) - Get Metrics Limits ## get Get metrics about your orders and subscriptions. Currency values are output in cents. **Scopes**: `metrics:read` ### Example Usage <!-- UsageSnippet language="typescript" operationID="metrics:get" method="get" path="/v1/metrics/" --> ```typescript import { Polar }
- Lines: 168
- Characters: 11262

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\oauth2\README.md

- Preview: # Oauth2 (*oauth2*) ## Overview ### Available Operations * [authorize](#authorize) - Authorize * [token](#token) - Request Token * [revoke](#revoke) - Revoke Token * [introspect](#introspect) - Introspect Token * [userinfo](#userinfo) - Get User Info ## authorize Authorize ### Example Usage <!-- UsageSnippet language="typescript" operationID="oauth2:authorize" method="get" path="/v1/oauth2/authori
- Lines: 374
- Characters: 27098

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\orders\README.md

- Preview: # Orders (*orders*) ## Overview ### Available Operations * [list](#list) - List Orders * [get](#get) - Get Order * [update](#update) - Update Order * [generateInvoice](#generateinvoice) - Generate Order Invoice * [invoice](#invoice) - Get Order Invoice ## list List orders. **Scopes**: `orders:read` ### Example Usage <!-- UsageSnippet language="typescript" operationID="orders:list" method="get" pat
- Lines: 416
- Characters: 30202

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\organizations\README.md

- Preview: # Organizations (*organizations*) ## Overview ### Available Operations * [list](#list) - List Organizations * [create](#create) - Create Organization * [get](#get) - Get Organization * [update](#update) - Update Organization ## list List organizations. **Scopes**: `organizations:read` `organizations:write` ### Example Usage <!-- UsageSnippet language="typescript" operationID="organizations:list" m
- Lines: 325
- Characters: 24180

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\payments\README.md

- Preview: # Payments (*payments*) ## Overview ### Available Operations * [list](#list) - List Payments * [get](#get) - Get Payment ## list List payments. **Scopes**: `payments:read` ### Example Usage <!-- UsageSnippet language="typescript" operationID="payments:list" method="get" path="/v1/payments/" --> ```typescript import { Polar } from "@polar-sh/sdk"; const polar = new Polar({ accessToken: process.env[
- Lines: 169
- Characters: 11946

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\polar\README.md

- Preview: # Polar SDK ## Overview Read the docs at https://docs.polar.sh/api-reference ### Available Operations
- Lines: 10
- Characters: 98

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\polarcustomermeters\README.md

- Preview: # PolarCustomerMeters (*customerPortal.customerMeters*) ## Overview ### Available Operations * [list](#list) - List Meters * [get](#get) - Get Customer Meter ## list List meters of the authenticated customer. **Scopes**: `customer_portal:read` `customer_portal:write` ### Example Usage <!-- UsageSnippet language="typescript" operationID="customer_portal:customer_meters:list" method="get" path="/v1/
- Lines: 167
- Characters: 13798

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\polarcustomers\README.md

- Preview: # PolarCustomers (*customerPortal.customers*) ## Overview ### Available Operations * [get](#get) - Get Customer * [update](#update) - Update Customer * [listPaymentMethods](#listpaymentmethods) - List Customer Payment Methods * [addPaymentMethod](#addpaymentmethod) - Add Customer Payment Method * [deletePaymentMethod](#deletepaymentmethod) - Delete Customer Payment Method ## get Get authenticated
- Lines: 404
- Characters: 34024

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\polarlicensekeys\README.md

- Preview: # PolarLicenseKeys (*customerPortal.licenseKeys*) ## Overview ### Available Operations * [list](#list) - List License Keys * [get](#get) - Get License Key * [validate](#validate) - Validate License Key * [activate](#activate) - Activate License Key * [deactivate](#deactivate) - Deactivate License Key ## list **Scopes**: `customer_portal:read` `customer_portal:write` ### Example Usage <!-- UsageSni
- Lines: 413
- Characters: 32900

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\polarorders\README.md

- Preview: # PolarOrders (*customerPortal.orders*) ## Overview ### Available Operations * [list](#list) - List Orders * [get](#get) - Get Order * [update](#update) - Update Order * [generateInvoice](#generateinvoice) - Generate Order Invoice * [invoice](#invoice) - Get Order Invoice * [getPaymentStatus](#getpaymentstatus) - Get Order Payment Status * [confirmRetryPayment](#confirmretrypayment) - Confirm Retr
- Lines: 582
- Characters: 48948

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\polarorganizations\README.md

- Preview: # PolarOrganizations (*customerPortal.organizations*) ## Overview ### Available Operations * [get](#get) - Get Organization ## get Get a customer portal's organization by slug. ### Example Usage <!-- UsageSnippet language="typescript" operationID="customer_portal:organizations:get" method="get" path="/v1/customer-portal/organizations/{slug}" --> ```typescript import { Polar } from "@polar-sh/sdk";
- Lines: 82
- Characters: 6041

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\polarsubscriptions\README.md

- Preview: # PolarSubscriptions (*customerPortal.subscriptions*) ## Overview ### Available Operations * [list](#list) - List Subscriptions * [get](#get) - Get Subscription * [update](#update) - Update Subscription * [cancel](#cancel) - Cancel Subscription ## list List subscriptions of the authenticated customer. **Scopes**: `customer_portal:read` `customer_portal:write` ### Example Usage <!-- UsageSnippet la
- Lines: 333
- Characters: 28208

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\products\README.md

- Preview: # Products (*products*) ## Overview ### Available Operations * [list](#list) - List Products * [create](#create) - Create Product * [get](#get) - Get Product * [update](#update) - Update Product * [updateBenefits](#updatebenefits) - Update Product Benefits ## list List products. **Scopes**: `products:read` `products:write` ### Example Usage <!-- UsageSnippet language="typescript" operationID="prod
- Lines: 444
- Characters: 30734

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\refunds\README.md

- Preview: # Refunds (*refunds*) ## Overview ### Available Operations * [list](#list) - List Refunds * [create](#create) - Create Refund ## list List products. **Scopes**: `refunds:read` `refunds:write` ### Example Usage <!-- UsageSnippet language="typescript" operationID="refunds:list" method="get" path="/v1/refunds/" --> ```typescript import { Polar } from "@polar-sh/sdk"; const polar = new Polar({ accessT
- Lines: 174
- Characters: 12152

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\subscriptions\README.md

- Preview: # Subscriptions (*subscriptions*) ## Overview ### Available Operations * [list](#list) - List Subscriptions * [export](#export) - Export Subscriptions * [get](#get) - Get Subscription * [update](#update) - Update Subscription * [revoke](#revoke) - Revoke Subscription ## list List subscriptions. **Scopes**: `subscriptions:read` `subscriptions:write` ### Example Usage <!-- UsageSnippet language="typ
- Lines: 412
- Characters: 30890

---

# Source: .\node_modules\@polar-sh\sdk\docs\sdks\webhooks\README.md

- Preview: # Webhooks (*webhooks*) ## Overview ### Available Operations * [listWebhookEndpoints](#listwebhookendpoints) - List Webhook Endpoints * [createWebhookEndpoint](#createwebhookendpoint) - Create Webhook Endpoint * [getWebhookEndpoint](#getwebhookendpoint) - Get Webhook Endpoint * [updateWebhookEndpoint](#updatewebhookendpoint) - Update Webhook Endpoint * [deleteWebhookEndpoint](#deletewebhookendpoin
- Lines: 653
- Characters: 49477

---

# Source: .\node_modules\@polar-sh\sdk\examples\README.md

- Preview: # @polar-sh/sdk Examples This directory contains example scripts demonstrating how to use the @polar-sh/sdk SDK. ## Prerequisites - Node.js (v18 or higher) - npm ## Setup 1. Copy `.env.template` to `.env`: ```bash cp .env.template .env ``` 2. Edit `.env` and add your actual credentials (API keys, tokens, etc.) ## Running the Examples To run an example file from the examples directory: ```bash npm
- Lines: 34
- Characters: 541

---

# Source: .\node_modules\@polar-sh\sdk\FUNCTIONS.md

- Preview: # Standalone Functions > [!NOTE] > This section is useful if you are using a bundler and targetting browsers and > runtimes where the size of an application affects performance and load times. Every method in this SDK is also available as a standalone function. This alternative API is suitable when targetting the browser or serverless runtimes and using a bundler to build your application since al
- Lines: 92
- Characters: 3227

---

# Source: .\node_modules\@polar-sh\sdk\README.md

- Preview: # @polar-sh/sdk Developer-friendly & type-safe Typescript SDK specifically catered to leverage [Polar](https://polar.sh) API. <div align="left"> <a href="https://www.speakeasy.com/?utm_source=@polar-sh/sdk&utm_campaign=typescript"><img src="https://custom-icon-badges.demolab.com/badge/-Built%20By%20Speakeasy-212015?style=for-the-badge&logoColor=FBE331&logo=speakeasy&labelColor=545454" /></a> <a hr
- Lines: 990
- Characters: 42692

---

# Source: .\node_modules\@polar-sh\sdk\RUNTIMES.md

- Preview: # Supported JavaScript runtimes This SDK is intended to be used in JavaScript runtimes that support ECMAScript 2020 or newer. The SDK uses the following features: * [Web Fetch API][web-fetch] * [Web Streams API][web-streams] and in particular `ReadableStream` * [Async iterables][async-iter] using `Symbol.asyncIterator` [web-fetch]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API [web-st
- Lines: 51
- Characters: 1999

---

# Source: .\node_modules\@polar-sh\ui\CHANGELOG.md

- Preview: # @polar-sh/ui ## 0.1.1 ### Patch Changes - 62a3c07: Fix package.json metadata ## 0.1.0 ### Minor Changes - 05f1a9b: Reorganize package and prepare for publishing ## 0.0.4 ### Patch Changes - Updated dependencies [d93b98b] - @polar-sh/sdk@0.5.1 ## 0.0.3 ### Patch Changes - Updated dependencies [2166b03] - @polar-sh/sdk@0.5.0 ## 0.0.2 ### Patch Changes - Updated dependencies [a20bde6] - @polar-sh/s
- Lines: 44
- Characters: 476

---

# Source: .\node_modules\@polar-sh\ui\node_modules\date-fns\CHANGELOG.md

- Preview: # Change Log All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning]. This change log follows the format documented in [Keep a CHANGELOG]. [semantic versioning]: http://semver.org/ [keep a changelog]: http://keepachangelog.com/ ## v3.6.0 - 2024-03-18 On this release worked @kossnocorp and @world1dan. Also, thanks to [@seated](https://githu
- Lines: 2783
- Characters: 113441

---

# Source: .\node_modules\@polar-sh\ui\node_modules\date-fns\docs\cdn.md

- Preview: # CDN Starting with v3.6.0, the CDN versions of date-fns are available on [jsDelivr](https://www.jsdelivr.com/package/npm/date-fns) and other CDNs. They expose the date-fns functionality via the `window.dateFns` global variable. Unlike the npm package, the CDN is transpiled to be compatible with IE11, so it supports a wide variety of legacy browsers and environments. ```html <script src="https://c
- Lines: 114
- Characters: 3643

---

# Source: .\node_modules\@polar-sh\ui\node_modules\date-fns\docs\fp.md

- Preview: # FP Guide **date-fns** v2.x provides [functional programming](https://en.wikipedia.org/wiki/Functional_programming) (FP) friendly functions, like those in [lodash](https://github.com/lodash/lodash/wiki/FP-Guide), that support [currying](https://en.wikipedia.org/wiki/Currying). ## Table of Contents - [Usage](#usage) - [Using Function Composition](#using-function-composition) ## Usage FP functions
- Lines: 75
- Characters: 2313

---

# Source: .\node_modules\@polar-sh\ui\node_modules\date-fns\docs\gettingStarted.md

- Preview: # Getting Started ## Table of Contents - [Introduction](#introduction) - [Submodules](#submodules) - [Installation](#installation) ## Introduction **date-fns** provides the most comprehensive, yet simple and consistent toolset for manipulating **JavaScript dates** in **a browser** & **Node.js**. **date-fns** is like [lodash](https://lodash.com) for dates. It has [**200+ functions** for all occasio
- Lines: 79
- Characters: 1688

---

# Source: .\node_modules\@polar-sh\ui\node_modules\date-fns\docs\i18n.md

- Preview: # Internationalization ## Table of Contents - [Usage](#usage) - [Adding New Language](#adding-new-language) ## Usage There are just a few functions that support I18n: - [`format`](https://date-fns.org/docs/format) - [`formatDistance`](https://date-fns.org/docs/formatDistance) - [`formatDistanceStrict`](https://date-fns.org/docs/formatDistanceStrict) - [`formatRelative`](https://date-fns.org/docs/f
- Lines: 94
- Characters: 2779

---

# Source: .\node_modules\@polar-sh\ui\node_modules\date-fns\docs\i18nContributionGuide.md

- Preview: # I18n Contribution Guide ## Table of Contents - [Adding a new locale](#adding-a-new-locale) - [Choosing a directory name for a locale](#choosing-a-directory-name-for-a-locale) - [index.js](#index.js) - [localize](#localize) - [localize.ordinalNumber](#localize.ordinalnumber) - [localize.era and using buildLocalizeFn function](#localize.era-and-using-buildlocalizefn-function) - [Formatting localiz
- Lines: 1065
- Characters: 26964

---

# Source: .\node_modules\@polar-sh\ui\node_modules\date-fns\docs\release.md

- Preview: # Releasing date-fns 1. First, make sure that the library is built by running `./scripts/build/build.sh` and committing and pushing any change you would have. 2. Then add the changelog entry generated by `npx tsx scripts/release/buildChangelog.ts` to (CHANGELOG.md)[../CHANGELOG.md]. Make sure that the output is valid Markdown and fix if there're any errors. Commit and push the file. 3. Using the v
- Lines: 22
- Characters: 992

---

# Source: .\node_modules\@polar-sh\ui\node_modules\date-fns\docs\timeZones.md

- Preview: # Time Zones ## Table of Contents - [Overview](#overview) - [`date-fns-tz`](#date-fns-tz) ## Overview Working with UTC or ISO date strings is easy, and so is working with JS dates when all times are displayed in a user's local time in the browser. The difficulty comes when working with another time zone's local time, other than the current system's, like showing the local time of an event in LA at
- Lines: 66
- Characters: 2748

---

# Source: .\node_modules\@polar-sh\ui\node_modules\date-fns\docs\unicodeTokens.md

- Preview: # Unicode Tokens Starting with v2, `format` and `parse` use [Unicode tokens]. The tokens are different from Moment.js and other libraries that opted to use custom formatting rules. While usage of a standard ensures compatibility and the future of the library, it causes confusion that this document intends to resolve. ## Popular mistakes There are 4 tokens that cause most of the confusion: - `D` an
- Lines: 57
- Characters: 1599

---

# Source: .\node_modules\@polar-sh\ui\node_modules\date-fns\docs\webpack.md

- Preview: # webpack ## Removing unused languages from dynamic import If a locale is imported dynamically, then all locales from date-fns are loaded by webpack into a bundle (~160kb) or split across the chunks. This prolongs the build process and increases the amount of space taken. However, it is possible to use webpack to trim down languages using [ContextReplacementPlugin]. Let's assume that we have a sin
- Lines: 51
- Characters: 1388

---

# Source: .\node_modules\@polar-sh\ui\node_modules\date-fns\LICENSE.md

- Preview: MIT License Copyright (c) 2021 Sasha Koss and Lesha Koss https://kossnocorp.mit-license.org Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell co
- Lines: 24
- Characters: 1096

---

# Source: .\node_modules\@polar-sh\ui\node_modules\date-fns\README.md

- Preview: 🎉️ **NEW**: [date-fns v3 is out!](https://blog.date-fns.org/v3-is-out/) <img alt="date-fns" title="date-fns" src="https://raw.githubusercontent.com/date-fns/date-fns/master/docs/logotype.svg" width="150" /> date-fns provides the most comprehensive, yet simple and consistent toolset for manipulating JavaScript dates in a browser & Node.js 👉 [Documentation](https://date-fns.org/) 👉 [Blog](https:/
- Lines: 62
- Characters: 1708

---

# Source: .\node_modules\@polar-sh\ui\node_modules\date-fns\SECURITY.md

- Preview: # Security Policy ## Supported Versions Security updates are applied only to the latest release. ## Reporting a Vulnerability If you have discovered a security vulnerability in this project, please report it privately. **Do not disclose it as a public issue.** This gives us time to work with you to fix the issue before public exposure, reducing the chance that the exploit will be used before a pat
- Lines: 15
- Characters: 630

---

# Source: .\node_modules\@polar-sh\ui\node_modules\lucide-react\README.md

- Preview: <p align="center"> <a href="https://github.com/lucide-icons/lucide"> <img src="https://lucide.dev/package-logos/lucide-react.svg" alt="Lucide icon library for React applications." width="540"> </a> </p> <p align="center"> Lucide icon library for React applications. </p> <div align="center"> [![npm](https://img.shields.io/npm/v/lucide-react?color=blue)](https://www.npmjs.com/package/lucide-react) !
- Lines: 72
- Characters: 2014

---

# Source: .\node_modules\@polar-sh\ui\node_modules\tailwind-merge\LICENSE.md

- Preview: MIT License Copyright (c) 2021 Dany Castillo Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to
- Lines: 24
- Characters: 1049

---

# Source: .\node_modules\@polar-sh\ui\node_modules\tailwind-merge\README.md

- Preview: <!-- This file is autogenerated. If you want to change this content, please do the changes in `./docs/README.md` instead. --> <div align="center"> <br /> <a href="https://github.com/dcastil/tailwind-merge"> <img src="https://github.com/dcastil/tailwind-merge/raw/v2.6.0/assets/logo.svg" alt="tailwind-merge" height="150px" /> </a> </div> # tailwind-merge Utility function to efficiently merge [Tailwi
- Lines: 41
- Characters: 2013

---

# Source: .\node_modules\@polar-sh\ui\README.md

- Preview: # @polar-sh/ui This is the UI library for the Polar project. > [!NOTE] > This is a private library for the Polar project. You probably shouldn't use it directly in your own projects. ## Structure We use `shadcn/ui` components as a base for our UI. Those raw components are generated in `src/components/ui`. Our own custom components are located in `src/components/atoms` and `src/components/molecules
- Lines: 25
- Characters: 514

---

# Source: .\node_modules\@popperjs\core\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) 2019 Federico Zivolo Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
- Lines: 23
- Characters: 1062

---

# Source: .\node_modules\@popperjs\core\README.md

- Preview: <!-- <HEADER> // IGNORE IT --> <p align="center"> <img src="https://rawcdn.githack.com/popperjs/popper-core/8805a5d7599e14619c9e7ac19a3713285d8e5d7f/docs/src/images/popper-logo-outlined.svg" alt="Popper" height="300px"/> </p> <div align="center"> <h1>Tooltip & Popover Positioning Engine</h1> </div> <p align="center"> <a href="https://www.npmjs.com/package/@popperjs/core"> <img src="https://img.shi
- Lines: 379
- Characters: 13183

---

# Source: .\node_modules\@radix-ui\number\README.md

- Preview: # `number` ## Installation ```sh $ yarn add @radix-ui/number # or $ npm install @radix-ui/number ``` ## Usage This is an internal utility, not intended for public usage.
- Lines: 16
- Characters: 161

---

# Source: .\node_modules\@radix-ui\primitive\README.md

- Preview: # `primitive` This is an internal utility, not intended for public usage.
- Lines: 6
- Characters: 72

---

# Source: .\node_modules\@radix-ui\react-accordion\README.md

- Preview: # `react-accordion` View docs [here](https://radix-ui.com/primitives/docs/components/accordion).
- Lines: 6
- Characters: 95

---

# Source: .\node_modules\@radix-ui\react-alert-dialog\README.md

- Preview: # `react-alert-dialog` View docs [here](https://radix-ui.com/primitives/docs/components/alert-dialog).
- Lines: 6
- Characters: 101

---

# Source: .\node_modules\@radix-ui\react-arrow\README.md

- Preview: # `react-arrow` This is an internal utility, not intended for public usage.
- Lines: 6
- Characters: 74

---

# Source: .\node_modules\@radix-ui\react-checkbox\README.md

- Preview: # `react-checkbox` View docs [here](https://radix-ui.com/primitives/docs/components/checkbox).
- Lines: 6
- Characters: 93

---

# Source: .\node_modules\@radix-ui\react-collapsible\README.md

- Preview: # `react-collapsible` View docs [here](https://radix-ui.com/primitives/docs/components/collapsible).
- Lines: 6
- Characters: 99

---

# Source: .\node_modules\@radix-ui\react-collection\README.md

- Preview: # `react-collection` This is an internal utility, not intended for public usage.
- Lines: 6
- Characters: 79

---

# Source: .\node_modules\@radix-ui\react-compose-refs\README.md

- Preview: # `react-compose-refs` ## Installation ```sh $ yarn add @radix-ui/react-compose-refs # or $ npm install @radix-ui/react-compose-refs ``` ## Usage This is an internal utility, not intended for public usage.
- Lines: 16
- Characters: 197

---

# Source: .\node_modules\@radix-ui\react-context\README.md

- Preview: # `react-context` ## Installation ```sh $ yarn add @radix-ui/react-context # or $ npm install @radix-ui/react-context ``` ## Usage This is an internal utility, not intended for public usage.
- Lines: 16
- Characters: 182

---

# Source: .\node_modules\@radix-ui\react-dialog\README.md

- Preview: # `react-dialog` View docs [here](https://radix-ui.com/primitives/docs/components/dialog).
- Lines: 6
- Characters: 89

---

# Source: .\node_modules\@radix-ui\react-direction\README.md

- Preview: # `react-direction` ## Installation ```sh $ yarn add @radix-ui/react-direction # or $ npm install @radix-ui/react-direction ``` ## Usage View docs [here](https://radix-ui.com/primitives/docs/utilities/direction).
- Lines: 16
- Characters: 204

---

# Source: .\node_modules\@radix-ui\react-dismissable-layer\README.md

- Preview: # `react-dismissable-layer` This is an internal utility, not intended for public usage.
- Lines: 6
- Characters: 86

---

# Source: .\node_modules\@radix-ui\react-dropdown-menu\README.md

- Preview: # `react-dropdown-menu` View docs [here](https://radix-ui.com/primitives/docs/components/dropdown-menu).
- Lines: 6
- Characters: 103

---

# Source: .\node_modules\@radix-ui\react-focus-guards\README.md

- Preview: # `react-focus-guards` This is an internal utility, not intended for public usage.
- Lines: 6
- Characters: 81

---

# Source: .\node_modules\@radix-ui\react-focus-scope\README.md

- Preview: # `react-focus-scope` This is an internal utility, not intended for public usage.
- Lines: 6
- Characters: 80

---

# Source: .\node_modules\@radix-ui\react-id\README.md

- Preview: # `react-id` ## Installation ```sh $ yarn add @radix-ui/react-id # or $ npm install @radix-ui/react-id ``` ## Usage View docs [here](https://radix-ui.com/primitives/docs/utilities/id-provider).
- Lines: 16
- Characters: 185

---

# Source: .\node_modules\@radix-ui\react-label\README.md

- Preview: # `react-label` View docs [here](https://radix-ui.com/primitives/docs/utilities/label).
- Lines: 6
- Characters: 86

---

# Source: .\node_modules\@radix-ui\react-menu\README.md

- Preview: # `react-menu` This is an internal utility, not intended for public usage.
- Lines: 6
- Characters: 73

---

# Source: .\node_modules\@radix-ui\react-popover\README.md

- Preview: # `react-popover` View docs [here](https://radix-ui.com/primitives/docs/components/popover).
- Lines: 6
- Characters: 91

---

# Source: .\node_modules\@radix-ui\react-popper\README.md

- Preview: # `react-popper` This is an internal utility, not intended for public usage.
- Lines: 6
- Characters: 75

---

# Source: .\node_modules\@radix-ui\react-portal\README.md

- Preview: # `react-portal` View docs [here](https://radix-ui.com/primitives/docs/utilities/portal).
- Lines: 6
- Characters: 88

---

# Source: .\node_modules\@radix-ui\react-presence\README.md

- Preview: # `react-presence` This is an internal utility, not intended for public usage.
- Lines: 6
- Characters: 77

---

# Source: .\node_modules\@radix-ui\react-primitive\README.md

- Preview: # `react-primitive` This is an internal utility, not intended for public usage.
- Lines: 6
- Characters: 78

---

# Source: .\node_modules\@radix-ui\react-radio-group\README.md

- Preview: # `react-radio-group` View docs [here](https://radix-ui.com/primitives/docs/components/radio-group).
- Lines: 6
- Characters: 99

---

# Source: .\node_modules\@radix-ui\react-roving-focus\README.md

- Preview: # `react-roving-focus` This is an internal utility, not intended for public usage.
- Lines: 6
- Characters: 81

---

# Source: .\node_modules\@radix-ui\react-select\README.md

- Preview: # `react-select` View docs [here](https://radix-ui.com/primitives/docs/components/select).
- Lines: 6
- Characters: 89

---

# Source: .\node_modules\@radix-ui\react-separator\README.md

- Preview: # `react-separator` View docs [here](https://radix-ui.com/primitives/docs/components/separator).
- Lines: 6
- Characters: 95

---

# Source: .\node_modules\@radix-ui\react-slot\README.md

- Preview: # `react-slot` View docs [here](https://radix-ui.com/primitives/docs/utilities/slot).
- Lines: 6
- Characters: 84

---

# Source: .\node_modules\@radix-ui\react-switch\README.md

- Preview: # `react-switch` View docs [here](https://radix-ui.com/primitives/docs/components/switch).
- Lines: 6
- Characters: 89

---

# Source: .\node_modules\@radix-ui\react-tabs\README.md

- Preview: # `react-tabs` View docs [here](https://radix-ui.com/primitives/docs/components/tabs).
- Lines: 6
- Characters: 85

---

# Source: .\node_modules\@radix-ui\react-toast\README.md

- Preview: # `react-toast` View docs [here](https://radix-ui.com/primitives/docs/components/toast).
- Lines: 6
- Characters: 87

---

# Source: .\node_modules\@radix-ui\react-toggle\README.md

- Preview: # `react-toggle` View docs [here](https://radix-ui.com/primitives/docs/components/toggle).
- Lines: 6
- Characters: 89

---

# Source: .\node_modules\@radix-ui\react-toggle-group\README.md

- Preview: # `react-toggle-group` View docs [here](https://radix-ui.com/primitives/docs/components/toggle-group).
- Lines: 6
- Characters: 101

---

# Source: .\node_modules\@radix-ui\react-tooltip\README.md

- Preview: # `react-tooltip` View docs [here](https://radix-ui.com/primitives/docs/components/tooltip).
- Lines: 6
- Characters: 91

---

# Source: .\node_modules\@radix-ui\react-use-callback-ref\README.md

- Preview: # `react-use-callback-ref` ## Installation ```sh $ yarn add @radix-ui/react-use-callback-ref # or $ npm install @radix-ui/react-use-callback-ref ``` ## Usage This is an internal utility, not intended for public usage.
- Lines: 16
- Characters: 209

---

# Source: .\node_modules\@radix-ui\react-use-controllable-state\README.md

- Preview: # `react-use-controllable-state` This is an internal utility, not intended for public usage.
- Lines: 6
- Characters: 91

---

# Source: .\node_modules\@radix-ui\react-use-effect-event\README.md

- Preview: # `react-use-is-hydrated` ## Usage This is an internal utility, not intended for public usage.
- Lines: 8
- Characters: 92

---

# Source: .\node_modules\@radix-ui\react-use-escape-keydown\README.md

- Preview: # `react-use-escape-keydown` ## Installation ```sh $ yarn add @radix-ui/react-use-escape-keydown # or $ npm install @radix-ui/react-use-escape-keydown ``` ## Usage This is an internal utility, not intended for public usage.
- Lines: 16
- Characters: 215

---

# Source: .\node_modules\@radix-ui\react-use-layout-effect\README.md

- Preview: # `react-use-layout-effect` ## Installation ```sh $ yarn add @radix-ui/react-use-layout-effect # or $ npm install @radix-ui/react-use-layout-effect ``` ## Usage This is an internal utility, not intended for public usage.
- Lines: 16
- Characters: 212

---

# Source: .\node_modules\@radix-ui\react-use-previous\README.md

- Preview: # `react-use-previous` ## Installation ```sh $ yarn add @radix-ui/react-use-previous # or $ npm install @radix-ui/react-use-previous ``` ## Usage This is an internal utility, not intended for public usage.
- Lines: 16
- Characters: 197

---

# Source: .\node_modules\@radix-ui\react-use-rect\README.md

- Preview: # `react-use-rect` ## Installation ```sh $ yarn add @radix-ui/react-use-rect # or $ npm install @radix-ui/react-use-rect ``` ## Usage This is an internal utility, not intended for public usage.
- Lines: 16
- Characters: 185

---

# Source: .\node_modules\@radix-ui\react-use-size\README.md

- Preview: # `react-use-size` ## Installation ```sh $ yarn add @radix-ui/react-use-size # or $ npm install @radix-ui/react-use-size ``` ## Usage This is an internal utility, not intended for public usage.
- Lines: 16
- Characters: 185

---

# Source: .\node_modules\@radix-ui\react-visually-hidden\README.md

- Preview: # `react-visually-hidden` View docs [here](https://radix-ui.com/primitives/docs/utilities/visually-hidden).
- Lines: 6
- Characters: 106

---

# Source: .\node_modules\@radix-ui\rect\README.md

- Preview: # `rect` ## Installation ```sh $ yarn add @radix-ui/rect # or $ npm install @radix-ui/rect ``` ## Usage This is an internal utility, not intended for public usage.
- Lines: 16
- Characters: 155

---

# Source: .\node_modules\@react-email\render\license.md

- Preview: Copyright 2024 Plus Five Five, Inc Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the S
- Lines: 10
- Characters: 1052

---

# Source: .\node_modules\@react-email\render\readme.md

- Preview: ![React Email button cover](https://react.email/static/covers/render.png) <div align="center"><strong>@react-email/render</strong></div> <div align="center">Transform React components into HTML email templates.</div> <br /> <div align="center"> <a href="https://react.email">Website</a> <span> · </span> <a href="https://github.com/resend/react-email">GitHub</a> <span> · </span> <a href="https://rea
- Lines: 46
- Characters: 836

---

# Source: .\node_modules\@reactflow\background\README.md

- Preview: # @reactflow/background Background component for React Flow. ## Installation ```sh npm install @reactflow/background ```
- Lines: 13
- Characters: 117

---

# Source: .\node_modules\@reactflow\controls\README.md

- Preview: # @reactflow/controls Controls component for React Flow. ## Installation ```sh npm install @reactflow/controls ```
- Lines: 13
- Characters: 111

---

# Source: .\node_modules\@reactflow\core\README.md

- Preview: # @reactflow/core Core components and util functions of React Flow. ## Installation ```sh npm install @reactflow/core ```
- Lines: 13
- Characters: 118

---

# Source: .\node_modules\@reactflow\minimap\README.md

- Preview: # @reactflow/minimap Mini map component for React Flow. ## Installation ```sh npm install @reactflow/minimap ```
- Lines: 13
- Characters: 109

---

# Source: .\node_modules\@reactflow\node-resizer\README.md

- Preview: # @reactflow/node-resizer A resizer component for React Flow that can be attached to a node. ## Installation ```sh npm install @reactflow/node-resizer ```
- Lines: 12
- Characters: 151

---

# Source: .\node_modules\@reactflow\node-toolbar\README.md

- Preview: # @reactflow/node-toolbar A toolbar component for React Flow that can be attached to a node. ## Installation ```sh npm install @reactflow/node-toolbar ```
- Lines: 13
- Characters: 151

---

# Source: .\node_modules\@remirror\core-constants\readme.md

- Preview: # @remirror/core-constants > core constants used throughout the `remirror` codebase. [![Version][version]][npm] [![Weekly Downloads][downloads-badge]][npm] [![Bundled size][size-badge]][size] [![Typed Codebase][typescript]](#) [![MIT License][license]](#) [version]: https://flat.badgen.net/npm/v/@remirror/core-constants [npm]: https://npmjs.com/package/@remirror/core-constants [license]: https://f
- Lines: 20
- Characters: 922

---

# Source: .\node_modules\@rollup\pluginutils\README.md

- Preview: [npm]: https://img.shields.io/npm/v/@rollup/pluginutils [npm-url]: https://www.npmjs.com/package/@rollup/pluginutils [size]: https://packagephobia.now.sh/badge?p=@rollup/pluginutils [size-url]: https://packagephobia.now.sh/result?p=@rollup/pluginutils [![npm][npm]][npm-url] [![size][size]][size-url] [![libera manifesto](https://img.shields.io/badge/libera-manifesto-lightgrey.svg)](https://liberama
- Lines: 316
- Characters: 7700

---

# Source: .\node_modules\@rollup\rollup-win32-x64-gnu\README.md

- Preview: # `@rollup/rollup-win32-x64-gnu` This is the **x86_64-pc-windows-gnu** binary for `rollup`
- Lines: 6
- Characters: 89

---

# Source: .\node_modules\@rollup\rollup-win32-x64-msvc\README.md

- Preview: # `@rollup/rollup-win32-x64-msvc` This is the **x86_64-pc-windows-msvc** binary for `rollup`
- Lines: 6
- Characters: 91

---

# Source: .\node_modules\@selderee\plugin-htmlparser2\CHANGELOG.md

- Preview: # Changelog ## Version 0.11.0 * (`selderee`) Escape sequences in selectors. ## Version 0.10.0 * Targeting Node.js version 14 and ES2020; * Bump dependencies. ## Version 0.9.0 * Bump dependencies - fix "./core module cannot be found" issue. ## Version 0.8.1 * Sync with `selderee` package version. Now all dependencies are TypeScript, dual CommonJS/ES module packages; * Use `rollup-plugin-cleanup` to
- Lines: 36
- Characters: 690

---

# Source: .\node_modules\@selderee\plugin-htmlparser2\README.md

- Preview: # selderee ![lint status badge](https://github.com/mxxii/selderee/workflows/lint/badge.svg) ![test status badge](https://github.com/mxxii/selderee/workflows/test/badge.svg) [![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/mxxii/selderee/blob/main/LICENSE) [selderee](https://github.com/mxxii/selderee) plugin - selectors decision tree builder for [htmlparser2]
- Lines: 18
- Characters: 785

---

# Source: .\node_modules\@shikijs\types\README.md

- Preview: # @shikijs/types Types for Shiki. ## License MIT
- Lines: 10
- Characters: 45

---

# Source: .\node_modules\@shikijs\vscode-textmate\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) Microsoft Corporation Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permi
- Lines: 24
- Characters: 1062

---

# Source: .\node_modules\@shikijs\vscode-textmate\README.md

- Preview: ## Fork of [`microsoft/vscode-textmate`](https://github.com/microsoft/vscode-textmate) Changes make in this fork: - Change all `async` operations to `sync`; `onigLib` option now required to be resolved instead of a promise. - Use `tsup` to bundle the lib, ship as a single file ES module. - Remove debug flags and some other unnecessary exports. - Convert `EncodedTokenAttributes` from namespace to c
- Lines: 12
- Characters: 534

---

# Source: .\node_modules\@standard-schema\spec\README.md

- Preview: <h1 align="center"> <img alt="Standard Schema fire logo" loading="lazy" width="50" height="50" decoding="async" data-nimg="1" style="color:transparent" src="https://standardschema.dev/favicon.svg"> </br> Standard Schema</h1> <p align="center"> A common interface for TypeScript validation libraries <br/> <a href="https://standardschema.dev">standardschema.dev</a> </p> <br/> <!-- start --> Standard
- Lines: 282
- Characters: 16775

---

# Source: .\node_modules\@storybook\addon-a11y\README.md

- Preview: # Storybook Accessibility Addon The @storybook/addon-a11y package provides accessibility testing for Storybook stories. It uses axe-core to run the tests. ## Getting Started ### Add the addon to an existing Storybook ```bash npx storybook add @storybook/addon-a11y ``` [More on getting started with the accessibility addon](https://storybook.js.org/docs/writing-tests/accessibility-testing#accessibil
- Lines: 18
- Characters: 518

---

# Source: .\node_modules\@storybook\addon-docs\angular\README.md

- Preview: <center> <img src="../docs/media/angular-hero.png" width="100%" /> </center> <h1>Storybook Docs for Angular</h1> > migration guide: This page documents the method to configure storybook introduced recently in 5.3.0, consult the [migration guide](https://github.com/storybookjs/storybook/blob/next/MIGRATION.md) if you want to migrate to this format of configuring storybook. Storybook Docs transforms
- Lines: 259
- Characters: 7731

---

# Source: .\node_modules\@storybook\addon-docs\common\README.md

- Preview: <h1>Storybook Docs Common Setup</h1> Storybook Docs transforms your Storybook stories into world-class component documentation. Docs supports [all web frameworks that Storybook supports](../README.md#framework-support). Popular frameworks like [React](../react/README.md)/[Vue 3](../vue3/README.md)/[Angular](../angular/README.md)/[Ember](../ember/README.md)/[Web components](../web-components/README
- Lines: 101
- Characters: 3443

---

# Source: .\node_modules\@storybook\addon-docs\ember\README.md

- Preview: <h1>Storybook Docs for Ember</h1> > migration guide: This page documents the method to configure storybook introduced recently in 5.3.0, consult the [migration guide](https://github.com/storybookjs/storybook/blob/next/MIGRATION.md) if you want to migrate to this format of configuring storybook. Storybook Docs transforms your Storybook stories into world-class component documentation. Storybook Doc
- Lines: 156
- Characters: 5550

---

# Source: .\node_modules\@storybook\addon-docs\react\README.md

- Preview: <center> <img src="../docs/media/docspage-hero.png" width="100%" /> </center> <h1>Storybook Docs for React</h1> > migration guide: This page documents the method to configure storybook introduced recently in 5.3.0, consult the [migration guide](https://github.com/storybookjs/storybook/blob/next/MIGRATION.md) if you want to migrate to this format of configuring storybook. Storybook Docs transforms
- Lines: 152
- Characters: 6243

---

# Source: .\node_modules\@storybook\addon-docs\README.md

- Preview: <center> <img src="https://raw.githubusercontent.com/storybookjs/storybook/next/code/addons/docs/docs/media/hero.png" width="100%" /> </center> # Storybook Docs > migration guide: This page documents the method to configure Storybook introduced recently in 7.0.0, consult the [migration guide](https://github.com/storybookjs/storybook/blob/next/MIGRATION.md) if you want to migrate to this format of
- Lines: 159
- Characters: 7492

---

# Source: .\node_modules\@storybook\addon-docs\vue\README.md

- Preview: <center> <img src="../docs/media/vue-hero.png" width="100%" /> </center> <h1>Storybook Docs for Vue</h1> > migration guide: This page documents the method to configure storybook introduced recently in 5.3.0, consult the [migration guide](https://github.com/storybookjs/storybook/blob/next/MIGRATION.md) if you want to migrate to this format of configuring storybook. Storybook Docs transforms your St
- Lines: 155
- Characters: 5083

---

# Source: .\node_modules\@storybook\addon-docs\vue3\README.md

- Preview: <center> <img src="../docs/media/vue-hero.png" width="100%" /> </center> <h1>Storybook Docs for Vue 3</h1> > migration guide: This page documents the method to configure storybook introduced recently in 5.3.0, consult the [migration guide](https://github.com/storybookjs/storybook/blob/next/MIGRATION.md) if you want to migrate to this format of configuring storybook. Storybook Docs transforms your
- Lines: 155
- Characters: 5089

---

# Source: .\node_modules\@storybook\addon-docs\web-components\README.md

- Preview: <h1>Storybook Docs for Web Components</h1> - [Installation](#installation) - [Props tables](#props-tables) - [Stories not inline](#stories-not-inline) - [More resources](#more-resources) ## Installation - Be sure to check the [installation section of the general addon-docs page](../README.md) before proceeding. - Be sure to have a [custom-elements.json](./#custom-elementsjson) file. - Add to your
- Lines: 134
- Characters: 4074

---

# Source: .\node_modules\@storybook\addon-onboarding\CHANGELOG.md

- Preview: # v1.0.11 (Tue Jan 23 2024) #### 🐛 Bug Fix - Fix z-index bug by adding a wrapper [#82](https://github.com/storybookjs/addon-onboarding/pull/82) ([@ndelangen](https://github.com/ndelangen)) - Make selectors Storybook 8 compatible [#81](https://github.com/storybookjs/addon-onboarding/pull/81) ([@yannbf](https://github.com/yannbf)) - UI: Fix z-index in modal elements [#78](https://github.com/storybo
- Lines: 635
- Characters: 17026

---

# Source: .\node_modules\@storybook\addon-onboarding\README.md

- Preview: # Storybook Addon Onboarding This addon provides a guided tour in some of Storybook's features, helping you get to know about the basics of Storybook and learn how to write stories! ![](./.github/assets/onboarding-intro.png) ## Triggering the onboarding This addon comes installed by default in Storybook projects and should trigger automatically. If you want to retrigger the addon, you should make
- Lines: 54
- Characters: 1382

---

# Source: .\node_modules\@storybook\addon-vitest\README.md

- Preview: # Storybook Addon Test Addon to integrate Vitest test results with Storybook. Learn more about Storybook at [storybook.js.org](https://storybook.js.org/?ref=readme).
- Lines: 8
- Characters: 163

---

# Source: .\node_modules\@storybook\builder-vite\README.md

- Preview: # Storybook builder for Vite <!-- omit in toc --> Build your stories with [vite](https://vitejs.dev/) for fast startup times and near-instant HMR. # Table of Contents <!-- omit in toc --> - [Installation](#installation) - [Usage](#usage) - [Getting started with Vite and Storybook (on a new project)](#getting-started-with-vite-and-storybook-on-a-new-project) - [Migration from webpack / CRA](#migrat
- Lines: 174
- Characters: 6320

---

# Source: .\node_modules\@storybook\csf-plugin\README.md

- Preview: # CSF Plugin The CSF plugin reads CSF files and enriches their content via static analysis. It supports Webpack, Vite, and other bundlers using [unplugin](https://github.com/unjs/unplugin). ## Source snippets CSF plugin can add static source snippets to each story. For example: ```js export const Basic = () => <Button />; ``` Would be transformed to: ```js export const Basic = () => <Button />; Ba
- Lines: 31
- Characters: 645

---

# Source: .\node_modules\@storybook\global\README.md

- Preview: # global Require global variables ## Example ```js import { global } from "global"; ``` ## Installation `yarn add @storybook/global`
- Lines: 16
- Characters: 125

---

# Source: .\node_modules\@storybook\icons\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) 2022 Tim Mikeladze Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit p
- Lines: 24
- Characters: 1059

---

# Source: .\node_modules\@storybook\icons\README.md

- Preview: # Icons <img src="public/cover.jpg" /> This library contains the icons used in Storybook and Chromatic apps and marketing sites. They are 14x14. To view the list of all available icons, please go to https://main--64b56e737c0aeefed9d5e675.chromatic.com/ ## Install npm: ```console npm install @storybook/icons ``` yarn: ```console yarn add @storybook/icons ``` pnpm: ```console pnpm add @storybook/ico
- Lines: 67
- Characters: 1092

---

# Source: .\node_modules\@storybook\react\README.md

- Preview: # Storybook React renderer Learn more about Storybook at [storybook.js.org](https://storybook.js.org/?ref=readme).
- Lines: 6
- Characters: 113

---

# Source: .\node_modules\@storybook\react-dom-shim\README.md

- Preview: # React Dom Shim A shim for `react-dom` that provides a single API that will work whether the user is on `react-dom@17` or `react-dom@18`, as well as webpack/vite config necessary to make that work. Learn more about Storybook at [storybook.js.org](https://storybook.js.org/?ref=readme).
- Lines: 8
- Characters: 284

---

# Source: .\node_modules\@storybook\react-vite\README.md

- Preview: # Storybook for React & Vite Develop, document, and test UI components in isolation. See [documentation](https://storybook.js.org/docs/get-started/frameworks/react-vite?renderer=react&ref=readme) for installation instructions, usage examples, APIs, and more. Learn more about Storybook at [storybook.js.org](https://storybook.js.org/?ref=readme).
- Lines: 10
- Characters: 343

---

# Source: .\node_modules\@testing-library\dom\README.md

- Preview: <div align="center"> <h1>DOM Testing Library</h1> <a href="https://www.emojione.com/emoji/1f419"> <img height="80" width="80" alt="octopus" src="https://raw.githubusercontent.com/testing-library/dom-testing-library/main/other/octopus.png" /> </a> <p>Simple and complete DOM testing utilities that encourage good testing practices.</p> [**Read the docs**](https://testing-library.com/dom) | [Edit the
- Lines: 405
- Characters: 81181

---

# Source: .\node_modules\@testing-library\jest-dom\CHANGELOG.md

- Preview: # CHANGELOG The changelog is automatically updated using [semantic-release](https://github.com/semantic-release/semantic-release). You can see it on the [releases page](../../releases).
- Lines: 8
- Characters: 182

---

# Source: .\node_modules\@testing-library\jest-dom\node_modules\dom-accessibility-api\LICENSE.md

- Preview: MIT License Copyright (c) 2020 Sebastian Silbermann Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit pers
- Lines: 24
- Characters: 1056

---

# Source: .\node_modules\@testing-library\jest-dom\node_modules\dom-accessibility-api\README.md

- Preview: # dom-accessibility-api [![npm version](https://badge.fury.io/js/dom-accessibility-api.svg)](https://badge.fury.io/js/dom-accessibility-api) [![Build Status](https://dev.azure.com/silbermannsebastian/dom-accessibility-api/_apis/build/status/eps1lon.dom-accessibility-api?branchName=main)](https://dev.azure.com/silbermannsebastian/dom-accessibility-api/_build/latest?definitionId=6&branchName=main) !
- Lines: 223
- Characters: 8938

---

# Source: .\node_modules\@testing-library\jest-dom\README.md

- Preview: <div align="center"> <h1>jest-dom</h1> <a href="https://www.emojione.com/emoji/1f989"> <img height="80" width="80" alt="owl" src="https://raw.githubusercontent.com/testing-library/jest-dom/main/other/owl.png" /> </a> <p>Custom jest matchers to test the state of the DOM</p> </div> <!-- prettier-ignore-start --> [![Build Status][build-badge]][build] [![Code Coverage][coverage-badge]][coverage] [![ve
- Lines: 1859
- Characters: 92655

---

# Source: .\node_modules\@testing-library\react\CHANGELOG.md

- Preview: # CHANGELOG The changelog is automatically updated using [semantic-release](https://github.com/semantic-release/semantic-release). You can see it on the [releases page](../../releases).
- Lines: 8
- Characters: 182

---

# Source: .\node_modules\@testing-library\react\README.md

- Preview: <div align="center"> <h1>React Testing Library</h1> <a href="https://www.emojione.com/emoji/1f410"> <img height="80" width="80" alt="goat" src="https://raw.githubusercontent.com/testing-library/react-testing-library/main/other/goat.png" /> </a> <p>Simple and complete React DOM testing utilities that encourage good testing practices.</p> <br /> [**Read The Docs**](https://testing-library.com/react)
- Lines: 695
- Characters: 77664

---

# Source: .\node_modules\@testing-library\user-event\README.md

- Preview: <div align="center"> <h1>user-event</h1> <a href="https://www.joypixels.com/profiles/emoji/1f415"> <img height="80" width="80" alt="dog" src="https://raw.githubusercontent.com/testing-library/user-event/main/other/dog.png" /> </a> <p>Fire events the same way the user does</p> <br /> [**Read The Docs**](https://testing-library.com/docs/user-event/intro) <br /> </div> <!-- prettier-ignore-start -->
- Lines: 126
- Characters: 5283

---

# Source: .\node_modules\@tiptap\core\README.md

- Preview: # @tiptap/core [![Version](https://img.shields.io/npm/v/@tiptap/core.svg?label=version)](https://www.npmjs.com/package/@tiptap/core) [![Downloads](https://img.shields.io/npm/dm/@tiptap/core.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/core.svg)](https://www.npmjs.com/package/@tiptap/core) [![Sponsor](https://img.shields.io/static/v1?labe
- Lines: 17
- Characters: 958

---

# Source: .\node_modules\@tiptap\extension-blockquote\README.md

- Preview: # @tiptap/extension-blockquote [![Version](https://img.shields.io/npm/v/@tiptap/extension-blockquote.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-blockquote) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-blockquote.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-blockquote.svg)](https://www.n
- Lines: 17
- Characters: 1054

---

# Source: .\node_modules\@tiptap\extension-bold\README.md

- Preview: # @tiptap/extension-bold [![Version](https://img.shields.io/npm/v/@tiptap/extension-bold.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-bold) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-bold.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-bold.svg)](https://www.npmjs.com/package/@tiptap/exten
- Lines: 17
- Characters: 1018

---

# Source: .\node_modules\@tiptap\extension-bubble-menu\README.md

- Preview: # @tiptap/extension-bubble-menu [![Version](https://img.shields.io/npm/v/@tiptap/extension-bubble-menu.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-bubble-menu) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-bubble-menu.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-bubble-menu.svg)](https://
- Lines: 17
- Characters: 1060

---

# Source: .\node_modules\@tiptap\extension-bullet-list\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-bullet-list\README.md

- Preview: # @tiptap/extension-bullet-list [![Version](https://img.shields.io/npm/v/@tiptap/extension-bullet-list.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-bullet-list) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-bullet-list.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-bullet-list.svg)](https://
- Lines: 21
- Characters: 1060

---

# Source: .\node_modules\@tiptap\extension-code\README.md

- Preview: # @tiptap/extension-code [![Version](https://img.shields.io/npm/v/@tiptap/extension-code.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-code) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-code.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-code.svg)](https://www.npmjs.com/package/@tiptap/exten
- Lines: 17
- Characters: 1018

---

# Source: .\node_modules\@tiptap\extension-code-block\README.md

- Preview: # @tiptap/extension-code-block [![Version](https://img.shields.io/npm/v/@tiptap/extension-code-block.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-code-block) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-code-block.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-code-block.svg)](https://www.n
- Lines: 17
- Characters: 1054

---

# Source: .\node_modules\@tiptap\extension-document\README.md

- Preview: # @tiptap/extension-document [![Version](https://img.shields.io/npm/v/@tiptap/extension-document.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-document) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-document.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-document.svg)](https://www.npmjs.com/p
- Lines: 17
- Characters: 1042

---

# Source: .\node_modules\@tiptap\extension-dropcursor\README.md

- Preview: # @tiptap/extension-dropcursor [![Version](https://img.shields.io/npm/v/@tiptap/extension-dropcursor.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-dropcursor) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-dropcursor.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-dropcursor.svg)](https://www.n
- Lines: 17
- Characters: 1054

---

# Source: .\node_modules\@tiptap\extension-floating-menu\README.md

- Preview: # @tiptap/extension-floating-menu [![Version](https://img.shields.io/npm/v/@tiptap/extension-floating-menu.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-floating-menu) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-floating-menu.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-floating-menu.svg)
- Lines: 17
- Characters: 1072

---

# Source: .\node_modules\@tiptap\extension-gapcursor\README.md

- Preview: # @tiptap/extension-gapcursor [![Version](https://img.shields.io/npm/v/@tiptap/extension-gapcursor.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-gapcursor) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-gapcursor.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-gapcursor.svg)](https://www.npmjs.
- Lines: 17
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-hard-break\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-hard-break\README.md

- Preview: # @tiptap/extension-hard-break [![Version](https://img.shields.io/npm/v/@tiptap/extension-hard-break.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-hard-break) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-hard-break.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-hard-break.svg)](https://www.n
- Lines: 21
- Characters: 1054

---

# Source: .\node_modules\@tiptap\extension-heading\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-heading\README.md

- Preview: # @tiptap/extension-heading [![Version](https://img.shields.io/npm/v/@tiptap/extension-heading.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-heading) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-heading.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-heading.svg)](https://www.npmjs.com/packag
- Lines: 21
- Characters: 1036

---

# Source: .\node_modules\@tiptap\extension-highlight\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-highlight\README.md

- Preview: # @tiptap/extension-highlight [![Version](https://img.shields.io/npm/v/@tiptap/extension-highlight.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-highlight) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-highlight.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-highlight.svg)](https://www.npmjs.
- Lines: 21
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-history\README.md

- Preview: # @tiptap/extension-history [![Version](https://img.shields.io/npm/v/@tiptap/extension-history.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-history) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-history.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-history.svg)](https://www.npmjs.com/packag
- Lines: 17
- Characters: 1036

---

# Source: .\node_modules\@tiptap\extension-horizontal-rule\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-horizontal-rule\README.md

- Preview: # @tiptap/extension-horizontal-rule [![Version](https://img.shields.io/npm/v/@tiptap/extension-horizontal-rule.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-horizontal-rule) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-horizontal-rule.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-horizontal
- Lines: 21
- Characters: 1084

---

# Source: .\node_modules\@tiptap\extension-image\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-image\README.md

- Preview: # @tiptap/extension-image [![Version](https://img.shields.io/npm/v/@tiptap/extension-image.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-image) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-image.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-image.svg)](https://www.npmjs.com/package/@tiptap/
- Lines: 21
- Characters: 1024

---

# Source: .\node_modules\@tiptap\extension-italic\README.md

- Preview: # @tiptap/extension-italic [![Version](https://img.shields.io/npm/v/@tiptap/extension-italic.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-italic) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-italic.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-italic.svg)](https://www.npmjs.com/package/@ti
- Lines: 17
- Characters: 1030

---

# Source: .\node_modules\@tiptap\extension-link\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-link\README.md

- Preview: # @tiptap/extension-link [![Version](https://img.shields.io/npm/v/@tiptap/extension-link.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-link) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-link.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-link.svg)](https://www.npmjs.com/package/@tiptap/exten
- Lines: 21
- Characters: 1018

---

# Source: .\node_modules\@tiptap\extension-list\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-list\README.md

- Preview: # @tiptap/extension-list [![Version](https://img.shields.io/npm/v/@tiptap/extension-list.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-list) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-list.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-list.svg)](https://www.npmjs.com/package/@tiptap/exten
- Lines: 21
- Characters: 1018

---

# Source: .\node_modules\@tiptap\extension-list-item\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-list-item\README.md

- Preview: # @tiptap/extension-list-item [![Version](https://img.shields.io/npm/v/@tiptap/extension-list-item.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-list-item) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-list-item.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-list-item.svg)](https://www.npmjs.
- Lines: 21
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-mention\README.md

- Preview: # @tiptap/extension-mention [![Version](https://img.shields.io/npm/v/@tiptap/extension-mention.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-mention) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-mention.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-mention.svg)](https://www.npmjs.com/packag
- Lines: 17
- Characters: 1036

---

# Source: .\node_modules\@tiptap\extension-ordered-list\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-ordered-list\README.md

- Preview: # @tiptap/extension-ordered-list [![Version](https://img.shields.io/npm/v/@tiptap/extension-ordered-list.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-ordered-list) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-ordered-list.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-ordered-list.svg)](htt
- Lines: 21
- Characters: 1066

---

# Source: .\node_modules\@tiptap\extension-paragraph\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-paragraph\README.md

- Preview: # @tiptap/extension-paragraph [![Version](https://img.shields.io/npm/v/@tiptap/extension-paragraph.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-paragraph) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-paragraph.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-paragraph.svg)](https://www.npmjs.
- Lines: 21
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-strike\README.md

- Preview: # @tiptap/extension-strike [![Version](https://img.shields.io/npm/v/@tiptap/extension-strike.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-strike) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-strike.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-strike.svg)](https://www.npmjs.com/package/@ti
- Lines: 17
- Characters: 1030

---

# Source: .\node_modules\@tiptap\extension-table\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-table\README.md

- Preview: # @tiptap/extension-table [![Version](https://img.shields.io/npm/v/@tiptap/extension-table.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-table) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-table.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-table.svg)](https://www.npmjs.com/package/@tiptap/
- Lines: 21
- Characters: 1024

---

# Source: .\node_modules\@tiptap\extension-table-cell\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-table-cell\README.md

- Preview: # @tiptap/extension-table-cell [![Version](https://img.shields.io/npm/v/@tiptap/extension-table-cell.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-table-cell) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-table-cell.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-table-cell.svg)](https://www.n
- Lines: 21
- Characters: 1054

---

# Source: .\node_modules\@tiptap\extension-table-header\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-table-header\README.md

- Preview: # @tiptap/extension-table-header [![Version](https://img.shields.io/npm/v/@tiptap/extension-table-header.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-table-header) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-table-header.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-table-header.svg)](htt
- Lines: 21
- Characters: 1066

---

# Source: .\node_modules\@tiptap\extension-table-row\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-table-row\README.md

- Preview: # @tiptap/extension-table-row [![Version](https://img.shields.io/npm/v/@tiptap/extension-table-row.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-table-row) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-table-row.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-table-row.svg)](https://www.npmjs.
- Lines: 21
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-task-item\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-task-item\README.md

- Preview: # @tiptap/extension-task-item [![Version](https://img.shields.io/npm/v/@tiptap/extension-task-item.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-task-item) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-task-item.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-task-item.svg)](https://www.npmjs.
- Lines: 21
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-task-list\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-task-list\README.md

- Preview: # @tiptap/extension-task-list [![Version](https://img.shields.io/npm/v/@tiptap/extension-task-list.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-task-list) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-task-list.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-task-list.svg)](https://www.npmjs.
- Lines: 21
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-text\README.md

- Preview: # @tiptap/extension-text [![Version](https://img.shields.io/npm/v/@tiptap/extension-text.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-text) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-text.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-text.svg)](https://www.npmjs.com/package/@tiptap/exten
- Lines: 17
- Characters: 1018

---

# Source: .\node_modules\@tiptap\extension-text-style\LICENSE.md

- Preview: MIT License Copyright (c) 2025, Tiptap GmbH Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\@tiptap\extension-text-style\README.md

- Preview: # @tiptap/extension-text-style [![Version](https://img.shields.io/npm/v/@tiptap/extension-text-style.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-text-style) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-text-style.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-text-style.svg)](https://www.n
- Lines: 21
- Characters: 1054

---

# Source: .\node_modules\@tiptap\extension-underline\README.md

- Preview: # @tiptap/extension-underline [![Version](https://img.shields.io/npm/v/@tiptap/extension-underline.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-underline) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-underline.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-underline.svg)](https://www.npmjs.
- Lines: 17
- Characters: 1048

---

# Source: .\node_modules\@tiptap\pm\README.md

- Preview: # @tiptap/pm [![Version](https://img.shields.io/npm/v/@tiptap/pm.svg?label=version)](https://www.npmjs.com/package/@tiptap/pm) [![Downloads](https://img.shields.io/npm/dm/@tiptap/pm.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/pm.svg)](https://www.npmjs.com/package/@tiptap/pm) [![Sponsor](https://img.shields.io/static/v1?label=Sponsor&me
- Lines: 25
- Characters: 1128

---

# Source: .\node_modules\@tiptap\react\README.md

- Preview: # @tiptap/react [![Version](https://img.shields.io/npm/v/@tiptap/react.svg?label=version)](https://www.npmjs.com/package/@tiptap/react) [![Downloads](https://img.shields.io/npm/dm/@tiptap/react.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/react.svg)](https://www.npmjs.com/package/@tiptap/react) [![Sponsor](https://img.shields.io/static/v
- Lines: 17
- Characters: 964

---

# Source: .\node_modules\@tiptap\starter-kit\node_modules\@tiptap\extension-bullet-list\README.md

- Preview: # @tiptap/extension-bullet-list [![Version](https://img.shields.io/npm/v/@tiptap/extension-bullet-list.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-bullet-list) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-bullet-list.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-bullet-list.svg)](https://
- Lines: 17
- Characters: 1060

---

# Source: .\node_modules\@tiptap\starter-kit\node_modules\@tiptap\extension-hard-break\README.md

- Preview: # @tiptap/extension-hard-break [![Version](https://img.shields.io/npm/v/@tiptap/extension-hard-break.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-hard-break) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-hard-break.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-hard-break.svg)](https://www.n
- Lines: 17
- Characters: 1054

---

# Source: .\node_modules\@tiptap\starter-kit\node_modules\@tiptap\extension-heading\README.md

- Preview: # @tiptap/extension-heading [![Version](https://img.shields.io/npm/v/@tiptap/extension-heading.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-heading) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-heading.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-heading.svg)](https://www.npmjs.com/packag
- Lines: 17
- Characters: 1036

---

# Source: .\node_modules\@tiptap\starter-kit\node_modules\@tiptap\extension-horizontal-rule\README.md

- Preview: # @tiptap/extension-horizontal-rule [![Version](https://img.shields.io/npm/v/@tiptap/extension-horizontal-rule.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-horizontal-rule) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-horizontal-rule.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-horizontal
- Lines: 17
- Characters: 1084

---

# Source: .\node_modules\@tiptap\starter-kit\node_modules\@tiptap\extension-list-item\README.md

- Preview: # @tiptap/extension-list-item [![Version](https://img.shields.io/npm/v/@tiptap/extension-list-item.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-list-item) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-list-item.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-list-item.svg)](https://www.npmjs.
- Lines: 17
- Characters: 1048

---

# Source: .\node_modules\@tiptap\starter-kit\node_modules\@tiptap\extension-ordered-list\README.md

- Preview: # @tiptap/extension-ordered-list [![Version](https://img.shields.io/npm/v/@tiptap/extension-ordered-list.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-ordered-list) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-ordered-list.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-ordered-list.svg)](htt
- Lines: 17
- Characters: 1066

---

# Source: .\node_modules\@tiptap\starter-kit\node_modules\@tiptap\extension-paragraph\README.md

- Preview: # @tiptap/extension-paragraph [![Version](https://img.shields.io/npm/v/@tiptap/extension-paragraph.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-paragraph) [![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-paragraph.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/extension-paragraph.svg)](https://www.npmjs.
- Lines: 17
- Characters: 1048

---

# Source: .\node_modules\@tiptap\starter-kit\README.md

- Preview: # @tiptap/starter-kit [![Version](https://img.shields.io/npm/v/@tiptap/starter-kit.svg?label=version)](https://www.npmjs.com/package/@tiptap/starter-kit) [![Downloads](https://img.shields.io/npm/dm/@tiptap/starter-kit.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/starter-kit.svg)](https://www.npmjs.com/package/@tiptap/starter-kit) [![Spon
- Lines: 17
- Characters: 1000

---

# Source: .\node_modules\@tiptap\suggestion\README.md

- Preview: # @tiptap/suggestion [![Version](https://img.shields.io/npm/v/@tiptap/suggestion.svg?label=version)](https://www.npmjs.com/package/@tiptap/suggestion) [![Downloads](https://img.shields.io/npm/dm/@tiptap/suggestion.svg)](https://npmcharts.com/compare/tiptap?minimal=true) [![License](https://img.shields.io/npm/l/@tiptap/suggestion.svg)](https://www.npmjs.com/package/@tiptap/suggestion) [![Sponsor](h
- Lines: 17
- Characters: 994

---

# Source: .\node_modules\@tybys\wasm-util\README.md

- Preview: # @tybys/wasm-util WebAssembly related utils for browser environment **The output code is ES2019** ## Features All example code below need to be bundled by ES module bundlers like `webpack` / `rollup`, or specify import map in browser native ES module runtime. ### WASI polyfill for browser The API is similar to the `require('wasi').WASI` in Node.js. You can use `memfs-browser` to provide filesyste
- Lines: 196
- Characters: 4273

---

# Source: .\node_modules\@types\aria-query\README.md

- Preview: # Installation > `npm install --save @types/aria-query` # Summary This package contains type definitions for aria-query (https://github.com/A11yance/aria-query#readme). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/aria-query. ### Additional Details * Last updated: Mon, 06 Nov 2023 22:41:04 GMT * Dependencies: none # Credits These definitio
- Lines: 18
- Characters: 462

---

# Source: .\node_modules\@types\aws-lambda\README.md

- Preview: # Installation > `npm install --save @types/aws-lambda` # Summary This package contains type definitions for aws-lambda (http://docs.aws.amazon.com/lambda). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/aws-lambda. ### Additional Details * Last updated: Fri, 03 Oct 2025 22:33:35 GMT * Dependencies: none # Credits These definitions were writ
- Lines: 18
- Characters: 2381

---

# Source: .\node_modules\@types\babel__core\README.md

- Preview: # Installation > `npm install --save @types/babel__core` # Summary This package contains type definitions for @babel/core (https://github.com/babel/babel/tree/master/packages/babel-core). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/babel__core. ### Additional Details * Last updated: Mon, 20 Nov 2023 23:36:23 GMT * Dependencies: [@babel/pa
- Lines: 18
- Characters: 1015

---

# Source: .\node_modules\@types\babel__generator\README.md

- Preview: # Installation > `npm install --save @types/babel__generator` # Summary This package contains type definitions for @babel/generator (https://github.com/babel/babel/tree/master/packages/babel-generator). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/babel__generator. ### Additional Details * Last updated: Thu, 03 Apr 2025 16:02:41 GMT * Depe
- Lines: 18
- Characters: 678

---

# Source: .\node_modules\@types\babel__template\README.md

- Preview: # Installation > `npm install --save @types/babel__template` # Summary This package contains type definitions for @babel/template (https://github.com/babel/babel/tree/master/packages/babel-template). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/babel__template. ### Additional Details * Last updated: Mon, 06 Nov 2023 22:41:04 GMT * Dependen
- Lines: 18
- Characters: 753

---

# Source: .\node_modules\@types\babel__traverse\README.md

- Preview: # Installation > `npm install --save @types/babel__traverse` # Summary This package contains type definitions for @babel/traverse (https://github.com/babel/babel/tree/main/packages/babel-traverse). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/babel__traverse. ### Additional Details * Last updated: Thu, 31 Jul 2025 21:02:30 GMT * Dependenci
- Lines: 18
- Characters: 863

---

# Source: .\node_modules\@types\chai\README.md

- Preview: # Installation > `npm install --save @types/chai` # Summary This package contains type definitions for chai (http://chaijs.com/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/chai. ### Additional Details * Last updated: Mon, 05 May 2025 21:33:58 GMT * Dependencies: [@types/deep-eql](https://npmjs.com/package/@types/deep-eql) # Credits Thes
- Lines: 18
- Characters: 917

---

# Source: .\node_modules\@types\d3\README.md

- Preview: # Installation > `npm install --save @types/d3` # Summary This package contains type definitions for d3 (https://github.com/d3/d3). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3. ## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3/index.d.ts) ````ts // Last module patch version validated against: 7.4.4
- Lines: 61
- Characters: 3640

---

# Source: .\node_modules\@types\d3-array\README.md

- Preview: # Installation > `npm install --save @types/d3-array` # Summary This package contains type definitions for d3-array (https://github.com/d3/d3-array). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-array. ### Additional Details * Last updated: Fri, 12 Sep 2025 20:02:35 GMT * Dependencies: none # Credits These definitions were written by [A
- Lines: 18
- Characters: 708

---

# Source: .\node_modules\@types\d3-axis\README.md

- Preview: # Installation > `npm install --save @types/d3-axis` # Summary This package contains type definitions for d3-axis (https://github.com/d3/d3-axis/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-axis. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:36 GMT * Dependencies: [@types/d3-selection](https://npmjs.com/package/@types
- Lines: 18
- Characters: 689

---

# Source: .\node_modules\@types\d3-brush\README.md

- Preview: # Installation > `npm install --save @types/d3-brush` # Summary This package contains type definitions for d3-brush (https://github.com/d3/d3-brush/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-brush. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:36 GMT * Dependencies: [@types/d3-selection](https://npmjs.com/package/@t
- Lines: 18
- Characters: 650

---

# Source: .\node_modules\@types\d3-chord\README.md

- Preview: # Installation > `npm install --save @types/d3-chord` # Summary This package contains type definitions for d3-chord (https://github.com/d3/d3-chord/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-chord. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:36 GMT * Dependencies: none # Credits These definitions were written by [
- Lines: 18
- Characters: 586

---

# Source: .\node_modules\@types\d3-color\README.md

- Preview: # Installation > `npm install --save @types/d3-color` # Summary This package contains type definitions for d3-color (https://github.com/d3/d3-color/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-color. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:36 GMT * Dependencies: none # Credits These definitions were written by [
- Lines: 18
- Characters: 709

---

# Source: .\node_modules\@types\d3-contour\README.md

- Preview: # Installation > `npm install --save @types/d3-contour` # Summary This package contains type definitions for d3-contour (https://d3js.org/d3-contour/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-contour. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:36 GMT * Dependencies: [@types/d3-array](https://npmjs.com/package/@ty
- Lines: 18
- Characters: 657

---

# Source: .\node_modules\@types\d3-delaunay\README.md

- Preview: # Installation > `npm install --save @types/d3-delaunay` # Summary This package contains type definitions for d3-delaunay (https://github.com/d3/d3-delaunay). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-delaunay. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:36 GMT * Dependencies: none # Credits These definitions were w
- Lines: 18
- Characters: 501

---

# Source: .\node_modules\@types\d3-dispatch\README.md

- Preview: # Installation > `npm install --save @types/d3-dispatch` # Summary This package contains type definitions for d3-dispatch (https://github.com/d3/d3-dispatch/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-dispatch. ### Additional Details * Last updated: Wed, 30 Jul 2025 13:15:13 GMT * Dependencies: none # Credits These definitions were
- Lines: 18
- Characters: 682

---

# Source: .\node_modules\@types\d3-drag\README.md

- Preview: # Installation > `npm install --save @types/d3-drag` # Summary This package contains type definitions for d3-drag (https://github.com/d3/d3-drag/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-drag. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:36 GMT * Dependencies: [@types/d3-selection](https://npmjs.com/package/@types
- Lines: 18
- Characters: 646

---

# Source: .\node_modules\@types\d3-dsv\README.md

- Preview: # Installation > `npm install --save @types/d3-dsv` # Summary This package contains type definitions for d3-dsv (https://github.com/d3/d3-dsv/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-dsv. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:36 GMT * Dependencies: none # Credits These definitions were written by [Tom Wanz
- Lines: 18
- Characters: 621

---

# Source: .\node_modules\@types\d3-ease\README.md

- Preview: # Installation > `npm install --save @types/d3-ease` # Summary This package contains type definitions for d3-ease (https://github.com/d3/d3-ease/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-ease. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:36 GMT * Dependencies: none # Credits These definitions were written by [Tom
- Lines: 18
- Characters: 582

---

# Source: .\node_modules\@types\d3-fetch\README.md

- Preview: # Installation > `npm install --save @types/d3-fetch` # Summary This package contains type definitions for d3-fetch (https://d3js.org/d3-fetch/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-fetch. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:36 GMT * Dependencies: [@types/d3-dsv](https://npmjs.com/package/@types/d3-dsv
- Lines: 18
- Characters: 584

---

# Source: .\node_modules\@types\d3-force\README.md

- Preview: # Installation > `npm install --save @types/d3-force` # Summary This package contains type definitions for d3-force (https://github.com/d3/d3-force/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-force. ### Additional Details * Last updated: Mon, 17 Jun 2024 20:07:03 GMT * Dependencies: none # Credits These definitions were written by [
- Lines: 18
- Characters: 629

---

# Source: .\node_modules\@types\d3-format\README.md

- Preview: # Installation > `npm install --save @types/d3-format` # Summary This package contains type definitions for d3-format (https://github.com/d3/d3-format/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-format. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:36 GMT * Dependencies: none # Credits These definitions were written
- Lines: 18
- Characters: 633

---

# Source: .\node_modules\@types\d3-geo\README.md

- Preview: # Installation > `npm install --save @types/d3-geo` # Summary This package contains type definitions for d3-geo (https://github.com/d3/d3-geo/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-geo. ### Additional Details * Last updated: Sun, 12 Nov 2023 19:07:04 GMT * Dependencies: [@types/geojson](https://npmjs.com/package/@types/geojson)
- Lines: 18
- Characters: 681

---

# Source: .\node_modules\@types\d3-hierarchy\README.md

- Preview: # Installation > `npm install --save @types/d3-hierarchy` # Summary This package contains type definitions for d3-hierarchy (https://github.com/d3/d3-hierarchy/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-hierarchy. ### Additional Details * Last updated: Mon, 18 Mar 2024 18:36:06 GMT * Dependencies: none # Credits These definitions w
- Lines: 18
- Characters: 676

---

# Source: .\node_modules\@types\d3-interpolate\README.md

- Preview: # Installation > `npm install --save @types/d3-interpolate` # Summary This package contains type definitions for d3-interpolate (https://github.com/d3/d3-interpolate/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-interpolate. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:37 GMT * Dependencies: [@types/d3-color](https://
- Lines: 18
- Characters: 709

---

# Source: .\node_modules\@types\d3-path\README.md

- Preview: # Installation > `npm install --save @types/d3-path` # Summary This package contains type definitions for d3-path (https://github.com/d3/d3-path/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-path. ### Additional Details * Last updated: Tue, 04 Feb 2025 22:02:37 GMT * Dependencies: none # Credits These definitions were written by [Tom
- Lines: 18
- Characters: 582

---

# Source: .\node_modules\@types\d3-polygon\README.md

- Preview: # Installation > `npm install --save @types/d3-polygon` # Summary This package contains type definitions for d3-polygon (https://github.com/d3/d3-polygon/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-polygon. ## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-polygon/index.d.ts) ````ts // Last modu
- Lines: 63
- Characters: 2336

---

# Source: .\node_modules\@types\d3-quadtree\README.md

- Preview: # Installation > `npm install --save @types/d3-quadtree` # Summary This package contains type definitions for d3-quadtree (https://github.com/d3/d3-quadtree/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-quadtree. ### Additional Details * Last updated: Wed, 22 Nov 2023 00:24:48 GMT * Dependencies: none # Credits These definitions were
- Lines: 18
- Characters: 641

---

# Source: .\node_modules\@types\d3-random\README.md

- Preview: # Installation > `npm install --save @types/d3-random` # Summary This package contains type definitions for d3-random (https://github.com/d3/d3-random/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-random. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:37 GMT * Dependencies: none # Credits These definitions were written
- Lines: 18
- Characters: 590

---

# Source: .\node_modules\@types\d3-scale\README.md

- Preview: # Installation > `npm install --save @types/d3-scale` # Summary This package contains type definitions for d3-scale (https://github.com/d3/d3-scale/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-scale. ### Additional Details * Last updated: Wed, 05 Feb 2025 00:46:59 GMT * Dependencies: [@types/d3-time](https://npmjs.com/package/@types/
- Lines: 18
- Characters: 724

---

# Source: .\node_modules\@types\d3-scale-chromatic\README.md

- Preview: # Installation > `npm install --save @types/d3-scale-chromatic` # Summary This package contains type definitions for d3-scale-chromatic (https://github.com/d3/d3-scale-chromatic/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-scale-chromatic. ### Additional Details * Last updated: Wed, 27 Nov 2024 21:33:23 GMT * Dependencies: none # Cre
- Lines: 18
- Characters: 682

---

# Source: .\node_modules\@types\d3-selection\README.md

- Preview: # Installation > `npm install --save @types/d3-selection` # Summary This package contains type definitions for d3-selection (https://github.com/d3/d3-selection/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-selection. ### Additional Details * Last updated: Mon, 07 Oct 2024 22:38:10 GMT * Dependencies: none # Credits These definitions w
- Lines: 18
- Characters: 692

---

# Source: .\node_modules\@types\d3-shape\README.md

- Preview: # Installation > `npm install --save @types/d3-shape` # Summary This package contains type definitions for d3-shape (https://github.com/d3/d3-shape/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-shape. ### Additional Details * Last updated: Mon, 06 Jan 2025 00:46:49 GMT * Dependencies: [@types/d3-path](https://npmjs.com/package/@types/
- Lines: 18
- Characters: 714

---

# Source: .\node_modules\@types\d3-time\README.md

- Preview: # Installation > `npm install --save @types/d3-time` # Summary This package contains type definitions for d3-time (https://github.com/d3/d3-time/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-time. ### Additional Details * Last updated: Mon, 25 Nov 2024 10:02:27 GMT * Dependencies: none # Credits These definitions were written by [Tom
- Lines: 18
- Characters: 625

---

# Source: .\node_modules\@types\d3-time-format\README.md

- Preview: # Installation > `npm install --save @types/d3-time-format` # Summary This package contains type definitions for d3-time-format (https://github.com/d3/d3-time-format/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-time-format. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:37 GMT * Dependencies: none # Credits These defin
- Lines: 18
- Characters: 610

---

# Source: .\node_modules\@types\d3-timer\README.md

- Preview: # Installation > `npm install --save @types/d3-timer` # Summary This package contains type definitions for d3-timer (https://github.com/d3/d3-timer/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-timer. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:37 GMT * Dependencies: none # Credits These definitions were written by [
- Lines: 18
- Characters: 629

---

# Source: .\node_modules\@types\d3-transition\README.md

- Preview: # Installation > `npm install --save @types/d3-transition` # Summary This package contains type definitions for d3-transition (https://github.com/d3/d3-transition/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-transition. ### Additional Details * Last updated: Mon, 07 Oct 2024 22:38:10 GMT * Dependencies: [@types/d3-selection](https://
- Lines: 18
- Characters: 718

---

# Source: .\node_modules\@types\d3-zoom\README.md

- Preview: # Installation > `npm install --save @types/d3-zoom` # Summary This package contains type definitions for d3-zoom (https://github.com/d3/d3-zoom/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/d3-zoom. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:37 GMT * Dependencies: [@types/d3-interpolate](https://npmjs.com/package/@typ
- Lines: 18
- Characters: 763

---

# Source: .\node_modules\@types\debug\README.md

- Preview: # Installation > `npm install --save @types/debug` # Summary This package contains type definitions for debug (https://github.com/debug-js/debug). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/debug. ## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/debug/index.d.ts) ````ts declare var debug: debug.Debug &
- Lines: 72
- Characters: 2164

---

# Source: .\node_modules\@types\deep-eql\README.md

- Preview: # Installation > `npm install --save @types/deep-eql` # Summary This package contains type definitions for deep-eql (https://github.com/chaijs/deep-eql). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/deep-eql. ## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/deep-eql/index.d.ts) ````ts declare namespace d
- Lines: 60
- Characters: 1636

---

# Source: .\node_modules\@types\doctrine\README.md

- Preview: # Installation > `npm install --save @types/doctrine` # Summary This package contains type definitions for doctrine (https://github.com/eslint/doctrine). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/doctrine. ### Additional Details * Last updated: Mon, 06 Nov 2023 22:41:05 GMT * Dependencies: none # Credits These definitions were written b
- Lines: 18
- Characters: 430

---

# Source: .\node_modules\@types\dompurify\README.md

- Preview: # Installation > `npm install --save @types/dompurify` # Summary This package contains type definitions for dompurify (https://github.com/cure53/DOMPurify). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/dompurify. ### Additional Details * Last updated: Mon, 06 Nov 2023 22:41:05 GMT * Dependencies: [@types/trusted-types](https://npmjs.com/pa
- Lines: 19
- Characters: 762

---

# Source: .\node_modules\@types\estree\README.md

- Preview: # Installation > `npm install --save @types/estree` # Summary This package contains type definitions for estree (https://github.com/estree/estree). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/estree. ### Additional Details * Last updated: Fri, 06 Jun 2025 00:04:33 GMT * Dependencies: none # Credits These definitions were written by [RReve
- Lines: 18
- Characters: 428

---

# Source: .\node_modules\@types\estree-jsx\README.md

- Preview: # Installation > `npm install --save @types/estree-jsx` # Summary This package contains type definitions for estree-jsx (https://github.com/facebook/jsx). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/estree-jsx. ### Additional Details * Last updated: Fri, 23 Feb 2024 02:11:41 GMT * Dependencies: [@types/estree](https://npmjs.com/package/@t
- Lines: 18
- Characters: 489

---

# Source: .\node_modules\@types\geojson\README.md

- Preview: # Installation > `npm install --save @types/geojson` # Summary This package contains type definitions for geojson (https://geojson.org/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/geojson. ### Additional Details * Last updated: Thu, 23 Jan 2025 18:36:51 GMT * Dependencies: none # Credits These definitions were written by [Jacob Bruun](h
- Lines: 18
- Characters: 607

---

# Source: .\node_modules\@types\hast\README.md

- Preview: # Installation > `npm install --save @types/hast` # Summary This package contains type definitions for hast (https://github.com/syntax-tree/hast). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/hast. ### Additional Details * Last updated: Tue, 30 Jan 2024 21:35:45 GMT * Dependencies: [@types/unist](https://npmjs.com/package/@types/unist) # C
- Lines: 18
- Characters: 638

---

# Source: .\node_modules\@types\json-schema\README.md

- Preview: # Installation > `npm install --save @types/json-schema` # Summary This package contains type definitions for json-schema (https://github.com/kriszyp/json-schema). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/json-schema. ### Additional Details * Last updated: Tue, 07 Nov 2023 03:09:37 GMT * Dependencies: none # Credits These definitions w
- Lines: 18
- Characters: 592

---

# Source: .\node_modules\@types\linkify-it\README.md

- Preview: # Installation > `npm install --save @types/linkify-it` # Summary This package contains type definitions for linkify-it (https://github.com/markdown-it/linkify-it). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/linkify-it. ### Additional Details * Last updated: Wed, 01 May 2024 18:07:45 GMT * Dependencies: none # Credits These definitions w
- Lines: 18
- Characters: 602

---

# Source: .\node_modules\@types\markdown-it\README.md

- Preview: # Installation > `npm install --save @types/markdown-it` # Summary This package contains type definitions for markdown-it (https://github.com/markdown-it/markdown-it). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/markdown-it. ### Additional Details * Last updated: Thu, 25 Jul 2024 05:07:29 GMT * Dependencies: [@types/linkify-it](https://np
- Lines: 18
- Characters: 715

---

# Source: .\node_modules\@types\mdast\README.md

- Preview: # Installation > `npm install --save @types/mdast` # Summary This package contains type definitions for mdast (https://github.com/syntax-tree/mdast). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/mdast. ### Additional Details * Last updated: Tue, 14 May 2024 07:35:36 GMT * Dependencies: [@types/unist](https://npmjs.com/package/@types/unist)
- Lines: 18
- Characters: 676

---

# Source: .\node_modules\@types\mdurl\README.md

- Preview: # Installation > `npm install --save @types/mdurl` # Summary This package contains type definitions for mdurl (https://github.com/markdown-it/mdurl#readme). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/mdurl. ### Additional Details * Last updated: Wed, 01 May 2024 18:07:45 GMT * Dependencies: none # Credits These definitions were written b
- Lines: 18
- Characters: 438

---

# Source: .\node_modules\@types\mdx\README.md

- Preview: # Installation > `npm install --save @types/mdx` # Summary This package contains type definitions for mdx (https://github.com/mdx-js/mdx). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/mdx. ### Additional Details * Last updated: Thu, 11 Apr 2024 15:07:22 GMT * Dependencies: none # Credits These definitions were written by [Christian Murphy]
- Lines: 18
- Characters: 526

---

# Source: .\node_modules\@types\ms\README.md

- Preview: # Installation > `npm install --save @types/ms` # Summary This package contains type definitions for ms (https://github.com/vercel/ms). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/ms. ## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/ms/index.d.ts) ````ts /** * Short/Long format for `value`. * * @param {
- Lines: 85
- Characters: 1762

---

# Source: .\node_modules\@types\node\README.md

- Preview: # Installation > `npm install --save @types/node` # Summary This package contains type definitions for node (https://nodejs.org/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node/v22. ### Additional Details * Last updated: Sat, 11 Oct 2025 14:02:18 GMT * Dependencies: [undici-types](https://npmjs.com/package/undici-types) # Credits These
- Lines: 18
- Characters: 1507

---

# Source: .\node_modules\@types\papaparse\README.md

- Preview: # Installation > `npm install --save @types/papaparse` # Summary This package contains type definitions for papaparse (https://github.com/mholt/PapaParse). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/papaparse. ### Additional Details * Last updated: Wed, 07 May 2025 01:30:00 GMT * Dependencies: [@types/node](https://npmjs.com/package/@typ
- Lines: 18
- Characters: 995

---

# Source: .\node_modules\@types\react\README.md

- Preview: # Installation > `npm install --save @types/react` # Summary This package contains type definitions for react (https://react.dev/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react. ### Additional Details * Last updated: Tue, 07 Oct 2025 05:34:23 GMT * Dependencies: [csstype](https://npmjs.com/package/csstype) # Credits These definitions
- Lines: 18
- Characters: 1718

---

# Source: .\node_modules\@types\react-dom\README.md

- Preview: # Installation > `npm install --save @types/react-dom` # Summary This package contains type definitions for react-dom (https://react.dev/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-dom. ### Additional Details * Last updated: Tue, 07 Oct 2025 05:34:23 GMT * Dependencies: none * Peer dependencies: [@types/react](https://npmjs.com/p
- Lines: 19
- Characters: 775

---

# Source: .\node_modules\@types\react-grid-layout\README.md

- Preview: # Installation > `npm install --save @types/react-grid-layout` # Summary This package contains type definitions for react-grid-layout (https://github.com/STRML/react-grid-layout). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-grid-layout. ### Additional Details * Last updated: Tue, 07 Nov 2023 09:09:39 GMT * Dependencies: [@types/reac
- Lines: 18
- Characters: 772

---

# Source: .\node_modules\@types\react-syntax-highlighter\README.md

- Preview: # Installation > `npm install --save @types/react-syntax-highlighter` # Summary This package contains type definitions for react-syntax-highlighter (https://github.com/conorhastings/react-syntax-highlighter). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-syntax-highlighter. ### Additional Details * Last updated: Fri, 03 May 2024 16:07
- Lines: 18
- Characters: 741

---

# Source: .\node_modules\@types\react-window\README.md

- Preview: # Installation > `npm install --save @types/react-window` # Summary This package contains type definitions for react-window (https://github.com/bvaughn/react-window/). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-window. ### Additional Details * Last updated: Tue, 07 Nov 2023 09:09:39 GMT * Dependencies: [@types/react](https://npmjs.
- Lines: 18
- Characters: 603

---

# Source: .\node_modules\@types\resolve\README.md

- Preview: # Installation > `npm install --save @types/resolve` # Summary This package contains type definitions for resolve (https://github.com/browserify/resolve). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/resolve. ### Additional Details * Last updated: Mon, 20 Nov 2023 23:36:24 GMT * Dependencies: none # Credits These definitions were written b
- Lines: 18
- Characters: 532

---

# Source: .\node_modules\@types\trusted-types\README.md

- Preview: # Installation > `npm install --save @types/trusted-types` # Summary This package contains type definitions for trusted-types (https://github.com/WICG/trusted-types). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/trusted-types. ### Additional Details * Last updated: Mon, 20 Nov 2023 23:36:24 GMT * Dependencies: none # Credits These definiti
- Lines: 18
- Characters: 643

---

# Source: .\node_modules\@types\unist\README.md

- Preview: # Installation > `npm install --save @types/unist` # Summary This package contains type definitions for unist (https://github.com/syntax-tree/unist). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/unist. ### Additional Details * Last updated: Thu, 15 Aug 2024 02:18:53 GMT * Dependencies: none # Credits These definitions were written by [bize
- Lines: 18
- Characters: 740

---

# Source: .\node_modules\@types\use-sync-external-store\README.md

- Preview: # Installation > `npm install --save @types/use-sync-external-store` # Summary This package contains type definitions for use-sync-external-store (https://github.com/facebook/react#readme). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/use-sync-external-store. ### Additional Details * Last updated: Tue, 07 Nov 2023 15:11:36 GMT * Dependenci
- Lines: 18
- Characters: 535

---

# Source: .\node_modules\@typescript-eslint\eslint-plugin\node_modules\ignore\README.md

- Preview: | Linux / MacOS / Windows | Coverage | Downloads | | ----------------------- | -------- | --------- | | [![build][bb]][bl]      | [![coverage][cb]][cl] | [![downloads][db]][dl] | [bb]: https://github.com/kaelzhang/node-ignore/actions/workflows/nodejs.yml/badge.svg [bl]: https://github.com/kaelzhang/node-ignore/actions/workflows/nodejs.yml [cb]: https://codecov.io/gh/kaelzhang/node-ignore/branch/ma
- Lines: 455
- Characters: 12655

---

# Source: .\node_modules\@typescript-eslint\eslint-plugin\README.md

- Preview: # `@typescript-eslint/eslint-plugin` An ESLint plugin which provides lint rules for TypeScript codebases. [![NPM Version](https://img.shields.io/npm/v/@typescript-eslint/eslint-plugin.svg?style=flat-square)](https://www.npmjs.com/package/@typescript-eslint/eslint-plugin) [![NPM Downloads](https://img.shields.io/npm/dm/@typescript-eslint/eslint-plugin.svg?style=flat-square)](https://www.npmjs.com/p
- Lines: 15
- Characters: 740

---

# Source: .\node_modules\@typescript-eslint\parser\README.md

- Preview: # `@typescript-eslint/parser` > An ESLint parser which leverages <a href="https://github.com/typescript-eslint/typescript-eslint/tree/main/packages/typescript-estree">TypeScript ESTree</a> to allow for ESLint to lint TypeScript source code. [![NPM Version](https://img.shields.io/npm/v/@typescript-eslint/parser.svg?style=flat-square)](https://www.npmjs.com/package/@typescript-eslint/parser) [![NPM
- Lines: 15
- Characters: 845

---

# Source: .\node_modules\@typescript-eslint\project-service\README.md

- Preview: # `@typescript-eslint/project-service` > Standalone TypeScript project service wrapper for linting. [![NPM Version](https://img.shields.io/npm/v/@typescript-eslint/project-service.svg?style=flat-square)](https://www.npmjs.com/package/@typescript-eslint/project-service) [![NPM Downloads](https://img.shields.io/npm/dm/@typescript-eslint/project-service.svg?style=flat-square)](https://www.npmjs.com/p
- Lines: 15
- Characters: 752

---

# Source: .\node_modules\@typescript-eslint\scope-manager\README.md

- Preview: # `@typescript-eslint/scope-manager` [![NPM Version](https://img.shields.io/npm/v/@typescript-eslint/scope-manager.svg?style=flat-square)](https://www.npmjs.com/package/@typescript-eslint/scope-manager) [![NPM Downloads](https://img.shields.io/npm/dm/@typescript-eslint/scope-manager.svg?style=flat-square)](https://www.npmjs.com/package/@typescript-eslint/scope-manager) 👉 See **https://typescript-
- Lines: 13
- Characters: 684

---

# Source: .\node_modules\@typescript-eslint\tsconfig-utils\README.md

- Preview: # `@typescript-eslint/tsconfig-utils` > Utilities for collecting TSConfigs for linting scenarios. [![NPM Version](https://img.shields.io/npm/v/@typescript-eslint/tsconfig-utils.svg?style=flat-square)](https://www.npmjs.com/package/@typescript-eslint/tsconfig-utils) [![NPM Downloads](https://img.shields.io/npm/dm/@typescript-eslint/tsconfig-utils.svg?style=flat-square)](https://www.npmjs.com/packag
- Lines: 15
- Characters: 820

---

# Source: .\node_modules\@typescript-eslint\types\README.md

- Preview: # `@typescript-eslint/types` > Types for the TypeScript-ESTree AST spec This package exists to help us reduce cycles and provide lighter-weight packages at runtime. ## ✋ Internal Package This is an _internal package_ to the [typescript-eslint monorepo](https://github.com/typescript-eslint/typescript-eslint). You likely don't want to use it directly. 👉 See **https://typescript-eslint.io** for docs
- Lines: 15
- Characters: 416

---

# Source: .\node_modules\@typescript-eslint\typescript-estree\node_modules\brace-expansion\README.md

- Preview: # brace-expansion [Brace expansion](https://www.gnu.org/software/bash/manual/html_node/Brace-Expansion.html), as known from sh/bash, in JavaScript. [![build status](https://secure.travis-ci.org/juliangruber/brace-expansion.svg)](http://travis-ci.org/juliangruber/brace-expansion) [![downloads](https://img.shields.io/npm/dm/brace-expansion.svg)](https://www.npmjs.org/package/brace-expansion) [![Gree
- Lines: 138
- Characters: 4117

---

# Source: .\node_modules\@typescript-eslint\typescript-estree\node_modules\minimatch\README.md

- Preview: # minimatch A minimal matching utility. This is the matching library used internally by npm. It works by converting glob expressions into JavaScript `RegExp` objects. ## Usage ```js // hybrid module, load with require() or import import { minimatch } from 'minimatch' // or: const { minimatch } = require('minimatch') minimatch('bar.foo', '*.foo') // true! minimatch('bar.foo', '*.bar') // false! min
- Lines: 457
- Characters: 16486

---

# Source: .\node_modules\@typescript-eslint\typescript-estree\node_modules\semver\README.md

- Preview: semver(1) -- The semantic versioner for npm =========================================== ## Install ```bash npm install semver ```` ## Usage As a node module: ```js const semver = require('semver') semver.valid('1.2.3') // '1.2.3' semver.valid('a.b.c') // null semver.clean('  =v1.2.3   ') // '1.2.3' semver.satisfies('1.2.3', '1.x || >=2.5.0 || 5.0.0 - 7.2.3') // true semver.gt('1.2.3', '9.8.7') //
- Lines: 667
- Characters: 24099

---

# Source: .\node_modules\@typescript-eslint\typescript-estree\README.md

- Preview: # `@typescript-eslint/typescript-estree` > A parser that produces an ESTree-compatible AST for TypeScript code. [![NPM Version](https://img.shields.io/npm/v/@typescript-eslint/typescript-estree.svg?style=flat-square)](https://www.npmjs.com/package/@typescript-eslint/utils) [![NPM Downloads](https://img.shields.io/npm/dm/@typescript-eslint/typescript-estree.svg?style=flat-square)](https://www.npmjs
- Lines: 17
- Characters: 773

---

# Source: .\node_modules\@typescript-eslint\type-utils\README.md

- Preview: # `@typescript-eslint/type-utils` > Type utilities for working with TypeScript within ESLint rules. [![NPM Version](https://img.shields.io/npm/v/@typescript-eslint/utils.svg?style=flat-square)](https://www.npmjs.com/package/@typescript-eslint/utils) [![NPM Downloads](https://img.shields.io/npm/dm/@typescript-eslint/utils.svg?style=flat-square)](https://www.npmjs.com/package/@typescript-eslint/util
- Lines: 15
- Characters: 757

---

# Source: .\node_modules\@typescript-eslint\utils\README.md

- Preview: # `@typescript-eslint/utils` > Utilities for working with TypeScript + ESLint together. [![NPM Version](https://img.shields.io/npm/v/@typescript-eslint/utils.svg?style=flat-square)](https://www.npmjs.com/package/@typescript-eslint/utils) [![NPM Downloads](https://img.shields.io/npm/dm/@typescript-eslint/utils.svg?style=flat-square)](https://www.npmjs.com/package/@typescript-eslint/utils) 👉 See **
- Lines: 15
- Characters: 686

---

# Source: .\node_modules\@typescript-eslint\visitor-keys\README.md

- Preview: # `@typescript-eslint/visitor-keys` > Visitor keys used to help traverse the TypeScript-ESTree AST. ## ✋ Internal Package This is an _internal package_ to the [typescript-eslint monorepo](https://github.com/typescript-eslint/typescript-eslint). You likely don't want to use it directly. 👉 See **https://typescript-eslint.io** for docs on typescript-eslint.
- Lines: 13
- Characters: 352

---

# Source: .\node_modules\@ungap\structured-clone\README.md

- Preview: # structuredClone polyfill [![Downloads](https://img.shields.io/npm/dm/@ungap/structured-clone.svg)](https://www.npmjs.com/package/@ungap/structured-clone) [![build status](https://github.com/ungap/structured-clone/actions/workflows/node.js.yml/badge.svg)](https://github.com/ungap/structured-clone/actions) [![Coverage Status](https://coveralls.io/repos/github/ungap/structured-clone/badge.svg?branc
- Lines: 98
- Characters: 4461

---

# Source: .\node_modules\@vercel\oidc\CHANGELOG.md

- Preview: # @vercel/oidc ## 3.0.2 ### Patch Changes - fix(oidc): add `"react-native"` as export condition ([#14066](https://github.com/vercel/vercel/pull/14066)) ## 3.0.1 ### Patch Changes - feat(oidc): export `getContext()` method ([#14027](https://github.com/vercel/vercel/pull/14027)) - feat(oidc): add conditional export for browsers ([#14027](https://github.com/vercel/vercel/pull/14027)) Introduces a bro
- Lines: 58
- Characters: 1716

---

# Source: .\node_modules\@vercel\oidc\docs\README.md

- Preview: # @vercel/oidc ## Table of contents ### Functions - [getContext](README.md#getcontext) - [getVercelOidcToken](README.md#getverceloidctoken) - [getVercelOidcTokenSync](README.md#getverceloidctokensync) ## Functions ### getContext ▸ **getContext**(): `Context` #### Returns `Context` #### Defined in [get-context.ts:7](https://github.com/vercel/vercel/blob/main/packages/oidc/src/get-context.ts#L7) ###
- Lines: 105
- Characters: 3007

---

# Source: .\node_modules\@vercel\oidc\README.md

- Preview: # `@vercel/oidc` Runtime OIDC helper methods intended to be used with your Vercel Functions
- Lines: 6
- Characters: 90

---

# Source: .\node_modules\@vitejs\plugin-react\README.md

- Preview: # @vitejs/plugin-react [![npm](https://img.shields.io/npm/v/@vitejs/plugin-react.svg)](https://npmjs.com/package/@vitejs/plugin-react) The default Vite plugin for React projects. - enable [Fast Refresh](https://www.npmjs.com/package/react-refresh) in development (requires react >= 16.9) - use the [automatic JSX runtime](https://legacy.reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.h
- Lines: 145
- Characters: 4605

---

# Source: .\node_modules\@vitest\expect\README.md

- Preview: # @vitest/expect Jest's expect matchers as a Chai plugin. ## Usage ```js import { JestAsymmetricMatchers, JestChaiExpect, JestExtend, } from '@vitest/expect' import * as chai from 'chai' // allows using expect.extend instead of chai.use to extend plugins chai.use(JestExtend) // adds all jest matchers to expect chai.use(JestChaiExpect) // adds asymmetric matchers like stringContaining, objectContai
- Lines: 24
- Characters: 431

---

# Source: .\node_modules\@vitest\mocker\node_modules\estree-walker\README.md

- Preview: # estree-walker Simple utility for walking an [ESTree](https://github.com/estree/estree)-compliant AST, such as one generated by [acorn](https://github.com/marijnh/acorn). ## Installation ```bash npm i estree-walker ``` ## Usage ```js var walk = require('estree-walker').walk; var acorn = require('acorn'); ast = acorn.parse(sourceCode, options); // https://github.com/acornjs/acorn walk(ast, { enter
- Lines: 51
- Characters: 1543

---

# Source: .\node_modules\@vitest\mocker\README.md

- Preview: # @vitest/mocker Vitest's module mocker implementation. [GitHub](https://github.com/vitest-dev/vitest/blob/main/packages/mocker/) | [Documentation](https://github.com/vitest-dev/vitest/blob/main/packages/mocker/EXPORTS.md)
- Lines: 8
- Characters: 220

---

# Source: .\node_modules\@vitest\runner\node_modules\tinyrainbow\README.md

- Preview: # tinyrainbow Output your colorful messages in the terminal or browser console that support ANSI colors (Chrome engines). A small (`~ 6 kB` unpacked) fork of [picocolors](https://www.npmjs.com/package/picocolors) with support for `exports` field. Supports only ESM. ## Installing ```bash # with npm $ npm install -D tinyrainbow # with pnpm $ pnpm add -D tinyrainbow # with yarn $ yarn add -D tinyrain
- Lines: 31
- Characters: 480

---

# Source: .\node_modules\@vitest\runner\README.md

- Preview: # @vitest/runner Vitest mechanism to collect and run tasks. [GitHub](https://github.com/vitest-dev/vitest) | [Documentation](https://vitest.dev/advanced/runner)
- Lines: 8
- Characters: 158

---

# Source: .\node_modules\@vitest\snapshot\node_modules\tinyrainbow\README.md

- Preview: # tinyrainbow Output your colorful messages in the terminal or browser console that support ANSI colors (Chrome engines). A small (`~ 6 kB` unpacked) fork of [picocolors](https://www.npmjs.com/package/picocolors) with support for `exports` field. Supports only ESM. ## Installing ```bash # with npm $ npm install -D tinyrainbow # with pnpm $ pnpm add -D tinyrainbow # with yarn $ yarn add -D tinyrain
- Lines: 31
- Characters: 480

---

# Source: .\node_modules\@vitest\snapshot\README.md

- Preview: # @vitest/snapshot Lightweight implementation of Jest's snapshots. ## Usage ```js import { SnapshotClient } from '@vitest/snapshot' import { NodeSnapshotEnvironment } from '@vitest/snapshot/environment' import { SnapshotManager } from '@vitest/snapshot/manager' const client = new SnapshotClient({ // you need to provide your own equality check implementation if you use it // this function is called
- Lines: 87
- Characters: 2486

---

# Source: .\node_modules\@vitest\spy\README.md

- Preview: # @vitest/spy Lightweight Jest compatible spy implementation.
- Lines: 6
- Characters: 60

---

# Source: .\node_modules\accepts\HISTORY.md

- Preview: 2.0.0 / 2024-08-31 ================== * Drop node <18 support * deps: mime-types@^3.0.0 * deps: negotiator@^1.0.0 1.3.8 / 2022-02-02 ================== * deps: mime-types@~2.1.34 - deps: mime-db@~1.51.0 * deps: negotiator@0.6.3 1.3.7 / 2019-04-29 ================== * deps: negotiator@0.6.2 - Fix sorting charset, encoding, and language with extra parameters 1.3.6 / 2019-04-28 ================== * d
- Lines: 253
- Characters: 4968

---

# Source: .\node_modules\accepts\README.md

- Preview: # accepts [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Node.js Version][node-version-image]][node-version-url] [![Build Status][github-actions-ci-image]][github-actions-ci-url] [![Test Coverage][coveralls-image]][coveralls-url] Higher level content negotiation based on [negotiator](https://www.npmjs.com/package/negotiator). Extracted from [koa](h
- Lines: 143
- Characters: 3982

---

# Source: .\node_modules\acorn\CHANGELOG.md

- Preview: ## 8.15.0 (2025-06-08) ### New features Support `using` and `await using` syntax. The `AnyNode` type is now defined in such a way that plugins can extend it. ### Bug fixes Fix an issue where the `bigint` property of literal nodes for non-decimal bigints had the wrong format. The `acorn` CLI tool no longer crashes when emitting a tree that contains a bigint. ## 8.14.1 (2025-03-05) ### Bug fixes Fix
- Lines: 957
- Characters: 22291

---

# Source: .\node_modules\acorn\README.md

- Preview: # Acorn A tiny, fast JavaScript parser written in JavaScript. ## Community Acorn is open source software released under an [MIT license](https://github.com/acornjs/acorn/blob/master/acorn/LICENSE). You are welcome to [report bugs](https://github.com/acornjs/acorn/issues) or create pull requests on [github](https://github.com/acornjs/acorn). ## Installation The easiest way to install acorn is from
- Lines: 285
- Characters: 10509

---

# Source: .\node_modules\acorn-jsx\README.md

- Preview: # Acorn-JSX [![Build Status](https://travis-ci.org/acornjs/acorn-jsx.svg?branch=master)](https://travis-ci.org/acornjs/acorn-jsx) [![NPM version](https://img.shields.io/npm/v/acorn-jsx.svg)](https://www.npmjs.org/package/acorn-jsx) This is plugin for [Acorn](http://marijnhaverbeke.nl/acorn/) - a tiny, fast JavaScript parser, written completely in JavaScript. It was created as an experimental alter
- Lines: 43
- Characters: 1889

---

# Source: .\node_modules\adler-32\README.md

- Preview: # adler32 Signed ADLER-32 algorithm implementation in JS (for the browser and nodejs). Emphasis on correctness, performance, and IE6+ support. ## Installation With [npm](https://www.npmjs.org/package/adler-32): ```bash $ npm install adler-32 ``` In the browser: ```html <script src="adler32.js"></script> ``` The browser exposes a variable `ADLER32`. When installed globally, npm installs a script `a
- Lines: 143
- Characters: 4331

---

# Source: .\node_modules\ag-charts-types\README.md

- Preview: # Types Charting Library <div align="center"> <picture> <source media="(prefers-color-scheme: dark)" srcset="https://github.com/ag-grid/ag-grid/blob/latest/documentation/ag-grid-docs/public/images/ag-logos/svg-logos/AG-Charts-Logo_Dark-Theme.svg?raw=true"/> <source media="(prefers-color-scheme: light)" srcset="https://github.com/ag-grid/ag-grid/blob/latest/documentation/ag-grid-docs/public/images/
- Lines: 339
- Characters: 37282

---

# Source: .\node_modules\agent-base\README.md

- Preview: agent-base ========== ### Turn a function into an [`http.Agent`][http.Agent] instance This module is a thin wrapper around the base `http.Agent` class. It provides an abstract class that must define a `connect()` function, which is responsible for creating the underlying socket that the HTTP client requests will use. The `connect()` function may return an arbitrary `Duplex` stream, or another `htt
- Lines: 72
- Characters: 2390

---

# Source: .\node_modules\ag-grid-community\README.md

- Preview: # JavaScript Data Grid | JavaScript Table <div align="center"> <a href="https://www.ag-grid.com?utm_source=ag-grid-readme&utm_medium=repository&utm_campaign=github"> <picture> <source media="(prefers-color-scheme: dark)" srcset="https://github.com/ag-grid/ag-grid/blob/latest/documentation/ag-grid-docs/public/images/ag-logos/svg-logos/AG-Grid-Logo_Dark-Theme.svg?raw=true"/> <source media="(prefers-
- Lines: 511
- Characters: 45360

---

# Source: .\node_modules\ag-grid-react\CONTRIBUTING.md

- Preview: # Contributing to ag-grid-react We would love for you to contribute to ag-grid-react and help make it even better than it is today! As a contributor, here are the guidelines we would like you to follow: -   [Question or Problem?](#question) -   [Issues and Bugs](#issue) -   [Feature Requests](#feature) -   [Submission Guidelines](#submit) -   [Coding Rules](#rules) -   [Commit Message Guidelines](
- Lines: 57
- Characters: 3370

---

# Source: .\node_modules\ag-grid-react\README.md

- Preview: # React Data Grid | React Table <div align="center"> <a href="https://www.ag-grid.com?utm_source=ag-grid-react-readme&utm_medium=repository&utm_campaign=github"> <picture> <source media="(prefers-color-scheme: dark)" srcset="https://github.com/ag-grid/ag-grid/blob/latest/documentation/ag-grid-docs/public/images/ag-logos/svg-logos/AG-Grid-Logo_Dark-Theme.svg?raw=true"/> <source media="(prefers-colo
- Lines: 520
- Characters: 43474

---

# Source: .\node_modules\ai\CHANGELOG.md

- Preview: # ai ## 5.0.71 ### Patch Changes - bc90c3c: feat(ai): add pruneMessages helper function ## 5.0.70 ### Patch Changes - Updated dependencies [f6a9bf3] - @ai-sdk/gateway@1.0.40 ## 5.0.69 ### Patch Changes - 1bacc1f: fix(ai): handle backpressure in `writeToServerResponse` ## 5.0.68 ### Patch Changes - Updated dependencies [17f9872] - @ai-sdk/provider-utils@3.0.12 - @ai-sdk/gateway@1.0.39 ## 5.0.67 ###
- Lines: 5502
- Characters: 132940

---

# Source: .\node_modules\ai\node_modules\@ai-sdk\provider\CHANGELOG.md

- Preview: # @ai-sdk/provider ## 2.0.0 ### Major Changes - 742b7be: feat: forward id, streaming start, streaming end of content blocks - 7cddb72: refactoring (provider): collapse provider defined tools into single definition - ccce59b: feat (provider): support changing provider, model, supportedUrls in middleware - e2b9e4b: feat (provider): add name for provider defined tools for future validation - 95857aa:
- Lines: 661
- Characters: 15666

---

# Source: .\node_modules\ai\node_modules\@ai-sdk\provider\README.md

- Preview: # AI SDK - Provider Language Model Specification
- Lines: 4
- Characters: 48

---

# Source: .\node_modules\ai\README.md

- Preview: ![hero illustration](./assets/hero.gif) # AI SDK The [AI SDK](https://ai-sdk.dev/docs) is a TypeScript toolkit designed to help you build AI-powered applications using popular frameworks like Next.js, React, Svelte, Vue and runtimes like Node.js. To learn more about how to use the AI SDK, check out our [API Reference](https://ai-sdk.dev/docs/reference) and [Documentation](https://ai-sdk.dev/docs).
- Lines: 136
- Characters: 4021

---

# Source: .\node_modules\ajv\lib\dotjs\README.md

- Preview: These files are compiled dot templates from dot folder. Do NOT edit them directly, edit the templates and run `npm run build` from main ajv folder.
- Lines: 6
- Characters: 146

---

# Source: .\node_modules\ajv\README.md

- Preview: <img align="right" alt="Ajv logo" width="160" src="https://ajv.js.org/images/ajv_logo.png"> # Ajv: Another JSON Schema Validator The fastest JSON Schema validator for Node.js and browser. Supports draft-04/06/07. [![Build Status](https://travis-ci.org/ajv-validator/ajv.svg?branch=master)](https://travis-ci.org/ajv-validator/ajv) [![npm](https://img.shields.io/npm/v/ajv.svg)](https://www.npmjs.com/
- Lines: 1500
- Characters: 84088

---

# Source: .\node_modules\ansi-regex\readme.md

- Preview: # ansi-regex > Regular expression for matching [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) ## Install ``` $ npm install ansi-regex ``` ## Usage ```js const ansiRegex = require('ansi-regex'); ansiRegex().test('\u001B[4mcake\u001B[0m'); //=> true ansiRegex().test('cake'); //=> false '\u001B[4mcake\u001B[0m'.match(ansiRegex()); //=> ['\u001B[4m', '\u001B[0m'] '\u001B[4mcake\u0
- Lines: 80
- Characters: 2484

---

# Source: .\node_modules\ansi-styles\readme.md

- Preview: # ansi-styles [![Build Status](https://travis-ci.org/chalk/ansi-styles.svg?branch=master)](https://travis-ci.org/chalk/ansi-styles) > [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code#Colors_and_Styles) for styling strings in the terminal You probably want the higher-level [chalk](https://github.com/chalk/chalk) module for styling your strings. <img src="screenshot.svg" width="900
- Lines: 155
- Characters: 4175

---

# Source: .\node_modules\anymatch\node_modules\picomatch\CHANGELOG.md

- Preview: # Release history **All notable changes to this project will be documented in this file.** The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html). <details> <summary><strong>Guiding Principles</strong></summary> - Changelogs are for humans, not machines. - There should be an entry for ever
- Lines: 139
- Characters: 6067

---

# Source: .\node_modules\anymatch\node_modules\picomatch\README.md

- Preview: <h1 align="center">Picomatch</h1> <p align="center"> <a href="https://npmjs.org/package/picomatch"> <img src="https://img.shields.io/npm/v/picomatch.svg" alt="version"> </a> <a href="https://github.com/micromatch/picomatch/actions?workflow=Tests"> <img src="https://github.com/micromatch/picomatch/workflows/Tests/badge.svg" alt="test status"> </a> <a href="https://coveralls.io/github/micromatch/pic
- Lines: 711
- Characters: 26674

---

# Source: .\node_modules\anymatch\README.md

- Preview: anymatch [![Build Status](https://travis-ci.org/micromatch/anymatch.svg?branch=master)](https://travis-ci.org/micromatch/anymatch) [![Coverage Status](https://img.shields.io/coveralls/micromatch/anymatch.svg?branch=master)](https://coveralls.io/r/micromatch/anymatch?branch=master) ====== Javascript module to match a string against a regular expression, glob, string, or function that takes the stri
- Lines: 90
- Characters: 3934

---

# Source: .\node_modules\any-promise\README.md

- Preview: ## Any Promise [![Build Status](https://secure.travis-ci.org/kevinbeaty/any-promise.svg)](http://travis-ci.org/kevinbeaty/any-promise) Let your library support any ES 2015 (ES6) compatible `Promise` and leave the choice to application authors. The application can *optionally* register its preferred `Promise` implementation and it will be exported when requiring `any-promise` from library code. If
- Lines: 164
- Characters: 6905

---

# Source: .\node_modules\arctic\node_modules\oslo\README.md

- Preview: # `oslo` A collection of auth-related utilities, including: - `oslo/cookie`: Cookie parsing and serialization - `oslo/crypto`: Generate hashes, signatures, and random values - `oslo/encoding`: Encode base64, base64url, base32, hex - `oslo/jwt`: Create and verify JWTs - `oslo/oauth2`: OAuth2 helpers - `oslo/otp`: HOTP, TOTP - `oslo/password`: Password hashing - `oslo/request`: CSRF protection - `os
- Lines: 44
- Characters: 988

---

# Source: .\node_modules\arctic\README.md

- Preview: # Arctic Arctic is an OAuth 2.0 library for JavaScript/TypeScript that supports numerous providers. It's light weight, fully-typed, and runtime-agnostic. [Read the documentation →](https://arctic.js.org) ```ts import { GitHub, generateState } from "arctic"; const github = new GitHub(clientId, clientSecret); const state = generateState(); const authorizationURL = await github.createAuthorizationURL
- Lines: 77
- Characters: 1405

---

# Source: .\node_modules\arg\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) 2021 Vercel, Inc. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit pe
- Lines: 24
- Characters: 1058

---

# Source: .\node_modules\arg\README.md

- Preview: # Arg `arg` is an unopinionated, no-frills CLI argument parser. ## Installation ```bash npm install arg ``` ## Usage `arg()` takes either 1 or 2 arguments: 1. Command line specification object (see below) 2. Parse options (_Optional_, defaults to `{permissive: false, argv: process.argv.slice(2), stopAtPositional: false}`) It returns an object with any values present on the command-line (missing op
- Lines: 320
- Characters: 6325

---

# Source: .\node_modules\argparse\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [2.0.1] - 2020-08-29 ### Fixed - Fix issue with `process.argv` when used with interpreters (`coffee`, `ts-node`, etc.), #150. ## [2.0.0] - 2020-08-
- Lines: 219
- Characters: 5750

---

# Source: .\node_modules\argparse\README.md

- Preview: argparse ======== [![Build Status](https://secure.travis-ci.org/nodeca/argparse.svg?branch=master)](http://travis-ci.org/nodeca/argparse) [![NPM version](https://img.shields.io/npm/v/argparse.svg)](https://www.npmjs.org/package/argparse) CLI arguments parser for node.js, with [sub-commands](https://docs.python.org/3.9/library/argparse.html#sub-commands) support. Port of python's [argparse](http://
- Lines: 87
- Characters: 2684

---

# Source: .\node_modules\aria-hidden\README.md

- Preview: # aria-hidden [![NPM](https://nodei.co/npm/aria-hidden.png?downloads=true&stars=true)](https://nodei.co/npm/aria-hidden/) Hides from ARIA everything, except provided node(s). Helps to isolate modal dialogs and focused task - the content will be not accessible using accessible tools. Now with [HTML inert](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/inert) support # API Just call `h
- Lines: 102
- Characters: 2761

---

# Source: .\node_modules\aria-query\CHANGELOG.md

- Preview: # aria-query Change Log ## 1.0.0 - Updated values of aria-haspopup to include ARIA 1.1 role values - Added the CHANGELOG file ## 2.0.0 - Remove package-lock file. - Add Watchman config file. ## 2.0.1 - Added aria-errormessage to the ARIA Props Map. ## 3.0.0 - Bumping to a major version because of a previous breaking change. ## 4.0.0 - 912e515 (origin/fix-travis, fix-travis) Move allowed failures t
- Lines: 261
- Characters: 12606

---

# Source: .\node_modules\aria-query\README.md

- Preview: # ARIA Query ![CI](https://github.com/A11yance/aria-query/workflows/CI/badge.svg) Programmatic access to the [WAI-ARIA 1.2 Roles Model](https://www.w3.org/TR/wai-aria-1.2/#roles). This package tracks the W3C Recommendation (last update: 6 June 2023). CDN URL: <https://unpkg.com/aria-query> ## Building the `src/etc` files The files under `src/etc` are generated by the `breakUpAriaJSON` script. To c
- Lines: 198
- Characters: 6939

---

# Source: .\node_modules\array.prototype.flatmap\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.3.3](https://github.com/es-shims/Array.prototype.flatMap/compare/v1.3.2...v1.3.3) - 2024-12-15 ### Commits - [actions] split out node 10-20, and
- Lines: 125
- Characters: 6565

---

# Source: .\node_modules\array.prototype.flatmap\README.md

- Preview: # array.prototype.flatmap <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-
- Lines: 85
- Characters: 3089

---

# Source: .\node_modules\arraybuffer.prototype.slice\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.4](https://github.com/es-shims/ArrayBuffer.prototype.slice/compare/v1.0.3...v1.0.4) - 2024-12-15 ### Commits - [actions] split out node 10-20,
- Lines: 55
- Characters: 4368

---

# Source: .\node_modules\arraybuffer.prototype.slice\README.md

- Preview: # ArrayBuffer.prototype.slice <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] An ES spec-compliant `ArrayBuffer.prototype.slice` shim. Invoke its "shim" method to shim
- Lines: 64
- Characters: 2500

---

# Source: .\node_modules\array-buffer-byte-length\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.2](https://github.com/inspect-js/array-buffer-byte-length/compare/v1.0.1...v1.0.2) - 2024-12-19 ### Commits - [types] use shared config [`b153
- Lines: 46
- Characters: 3946

---

# Source: .\node_modules\array-buffer-byte-length\README.md

- Preview: # array-buffer-byte-length <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Get the byte length of an ArrayBuffer, even in engines without a `.byteLength` method. ## Ex
- Lines: 43
- Characters: 1937

---

# Source: .\node_modules\assertion-error\README.md

- Preview: <p align=center> AssertionError and AssertionResult classes. </p> <p align=center> <a href="https://github.com/chaijs/assertion-error/actions"> <img alt="build:?" src="https://github.com/chaijs/assertion-error/actions/workflows/nodejs.yml/badge.svg" /> </a><a href="https://www.npmjs.com/package/assertion-error"> <img alt="downloads:?" src="https://img.shields.io/npm/dm/assertion-error.svg" /> </a>
- Lines: 71
- Characters: 1653

---

# Source: .\node_modules\ast-types\README.md

- Preview: # AST Types ![CI](https://github.com/benjamn/ast-types/workflows/CI/badge.svg) This module provides an efficient, modular, [Esprima](https://github.com/ariya/esprima)-compatible implementation of the [abstract syntax tree](http://en.wikipedia.org/wiki/Abstract_syntax_tree) type hierarchy pioneered by the [Mozilla Parser API](https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API). Instal
- Lines: 509
- Characters: 16293

---

# Source: .\node_modules\async-channel\README.md

- Preview: # async-channel: JavaScript Async Channels ![CI Pipeline](https://github.com/kyle1320/async-channel/workflows/CI%20Pipeline/badge.svg) [![Coverage Status](https://coveralls.io/repos/github/kyle1320/async-channel/badge.svg?branch=main)](https://coveralls.io/github/kyle1320/async-channel?branch=main) [![npm](https://img.shields.io/npm/v/async-channel)](https://www.npmjs.com/package/async-channel) ![
- Lines: 142
- Characters: 5828

---

# Source: .\node_modules\async-function\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## v1.0.0 - 2025-01-22 ### Commits - Initial implementation, tests, readme, types [`8ad64e4`](https://github.com/ljharb/async-function/commit/8ad64e456
- Lines: 19
- Characters: 930

---

# Source: .\node_modules\async-function\README.md

- Preview: # async-function <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] A function that returns the normally hidden `AsyncFunction` constructor, when available. ## Getting st
- Lines: 54
- Characters: 1796

---

# Source: .\node_modules\asynckit\README.md

- Preview: # asynckit [![NPM Module](https://img.shields.io/npm/v/asynckit.svg?style=flat)](https://www.npmjs.com/package/asynckit) Minimal async jobs utility library, with streams support. [![PhantomJS Build](https://img.shields.io/travis/alexindigo/asynckit/v0.4.0.svg?label=browser&style=flat)](https://travis-ci.org/alexindigo/asynckit) [![Linux Build](https://img.shields.io/travis/alexindigo/asynckit/v0.4
- Lines: 236
- Characters: 7407

---

# Source: .\node_modules\attr-accept\README.md

- Preview: # attr-accept > JavaScript implementation of the "accept" attribute for HTML5 `<input type="file">` [![npm](https://img.shields.io/npm/v/attr-accept.svg?style=flat-square)](https://www.npmjs.com/package/attr-accept) ![Tests](https://img.shields.io/github/actions/workflow/status/react-dropzone/attr-accept/test.yml?branch=master&style=flat-square&label=tests) See https://developer.mozilla.org/en-US/
- Lines: 51
- Characters: 1231

---

# Source: .\node_modules\autoprefixer\README.md

- Preview: # Autoprefixer [![Cult Of Martians][cult-img]][cult] <img align="right" width="94" height="71" src="https://postcss.github.io/autoprefixer/logo.svg" title="Autoprefixer logo by Anton Lovchikov"> [PostCSS] plugin to parse CSS and add vendor prefixes to CSS rules using values from [Can I Use]. It is recommended by Google and used in Twitter and Alibaba. Write your CSS rules without vendor prefixes (
- Lines: 69
- Characters: 1699

---

# Source: .\node_modules\available-typed-arrays\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.7](https://github.com/inspect-js/available-typed-arrays/compare/v1.0.6...v1.0.7) - 2024-02-19 ### Commits - [Refactor] use `possible-typed-arr
- Lines: 103
- Characters: 9083

---

# Source: .\node_modules\available-typed-arrays\README.md

- Preview: # available-typed-arrays <sup>[![Version Badge][2]][1]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Returns an array of Typed Array names that are available in the current envir
- Lines: 58
- Characters: 1934

---

# Source: .\node_modules\axe-core\locales\README.md

- Preview: # Localizations We welcome any localization for axe-core. For details on how to contribute, see the [Contributing section](../README.md#contributing) of the main README. For details on the message syntax, see [Check Message Template](../doc/check-message-template.md). To create a new translation for axe, start by running `grunt translate --lang=<langcode>`. This will create a JSON file with the de
- Lines: 12
- Characters: 1025

---

# Source: .\node_modules\axe-core\README.md

- Preview: # axe-core [![License](https://img.shields.io/npm/l/axe-core.svg?color=c41)](LICENSE) [![Version](https://img.shields.io/npm/v/axe-core.svg)](https://www.npmjs.com/package/axe-core) [![NPM downloads](https://img.shields.io/npm/dw/axe-core.svg?color=080)![](https://img.shields.io/npm/dy/axe-core.svg?color=080&label=)](https://npm-stat.com/charts.html?package=axe-core&from=2017-01-01) [![Commits](ht
- Lines: 193
- Characters: 10268

---

# Source: .\node_modules\axios\CHANGELOG.md

- Preview: # Changelog ## [1.12.2](https://github.com/axios/axios/compare/v1.12.1...v1.12.2) (2025-09-14) ### Bug Fixes * **fetch:** use current global fetch instead of cached one when env fetch is not specified to keep MSW support; ([#7030](https://github.com/axios/axios/issues/7030)) ([cf78825](https://github.com/axios/axios/commit/cf78825e1229b60d1629ad0bbc8a752ff43c3f53)) ### Contributors to this release
- Lines: 1298
- Characters: 87057

---

# Source: .\node_modules\axios\lib\adapters\README.md

- Preview: # axios // adapters The modules under `adapters/` are modules that handle dispatching a request and settling a returned `Promise` once a response is received. ## Example ```js var settle = require('./../core/settle'); module.exports = function myAdapter(config) { // At this point: //  - config has been merged with defaults //  - request transformers have already run //  - request interceptors have
- Lines: 40
- Characters: 878

---

# Source: .\node_modules\axios\lib\core\README.md

- Preview: # axios // core The modules found in `core/` should be modules that are specific to the domain logic of axios. These modules would most likely not make sense to be consumed outside of the axios module, as their logic is too specific. Some examples of core modules are: - Dispatching requests - Requests sent via `adapters/` (see lib/adapters/README.md) - Managing interceptors - Handling config
- Lines: 11
- Characters: 391

---

# Source: .\node_modules\axios\lib\env\README.md

- Preview: # axios // env The `data.js` file is updated automatically when the package version is upgrading. Please do not edit it manually.
- Lines: 6
- Characters: 128

---

# Source: .\node_modules\axios\lib\helpers\README.md

- Preview: # axios // helpers The modules found in `helpers/` should be generic modules that are _not_ specific to the domain logic of axios. These modules could theoretically be published to npm on their own and consumed by other modules or apps. Some examples of generic modules are things like: - Browser polyfills - Managing cookies - Parsing HTTP headers
- Lines: 10
- Characters: 344

---

# Source: .\node_modules\axios\MIGRATION_GUIDE.md

- Preview: # Migration Guide ## 0.x.x -> 1.1.0
- Lines: 6
- Characters: 34

---

# Source: .\node_modules\axios\README.md

- Preview: <h3 align="center"> 🥇 Gold sponsors <br> </h3> <table align="center" width="100%"><tr width="33.333333333333336%"><td align="center" width="33.333333333333336%"> <a href="https://dev.intra-mart.jp/?utm_source&#x3D;axios&amp;utm_medium&#x3D;sponsorlist&amp;utm_campaign&#x3D;sponsorship" style="padding: 10px; display: inline-block" target="_blank"> <img width="48px" height="47px" src="https://axios
- Lines: 1759
- Characters: 71702

---

# Source: .\node_modules\bahttext\README.md

- Preview: # bahttext [![Travis](https://img.shields.io/travis/jojoee/bahttext.svg)](https://travis-ci.org/jojoee/bahttext) [![Codecov](https://img.shields.io/codecov/c/github/jojoee/bahttext.svg)](https://codecov.io/github/jojoee/bahttext) [![Version - npm](https://img.shields.io/npm/v/bahttext.svg)](https://www.npmjs.com/package/bahttext) [![License - npm](https://img.shields.io/npm/l/bahttext.svg)](http:/
- Lines: 54
- Characters: 1820

---

# Source: .\node_modules\bail\readme.md

- Preview: # bail [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Throw if given an error. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`bail(err?)`](#bailerr) *   [Types](#types) *   [Compatibility]
- Lines: 150
- Characters: 2839

---

# Source: .\node_modules\balanced-match\LICENSE.md

- Preview: (MIT) Copyright (c) 2013 Julian Gruber &lt;julian@juliangruber.com&gt; Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
- Lines: 24
- Characters: 1075

---

# Source: .\node_modules\balanced-match\README.md

- Preview: # balanced-match Match balanced string pairs, like `{` and `}` or `<b>` and `</b>`. Supports regular expressions as well! [![build status](https://secure.travis-ci.org/juliangruber/balanced-match.svg)](http://travis-ci.org/juliangruber/balanced-match) [![downloads](https://img.shields.io/npm/dm/balanced-match.svg)](https://www.npmjs.org/package/balanced-match) [![testling badge](https://ci.testlin
- Lines: 100
- Characters: 3405

---

# Source: .\node_modules\base64-js\README.md

- Preview: base64-js ========= `base64-js` does basic base64 encoding/decoding in pure JS. [![build status](https://secure.travis-ci.org/beatgammit/base64-js.png)](http://travis-ci.org/beatgammit/base64-js) Many browsers already have base64 encoding/decoding functionality, but it is for text data, not all-purpose binary data. Sometimes encoding/decoding binary data in the browser is useful, and that is what
- Lines: 37
- Characters: 1109

---

# Source: .\node_modules\baseline-browser-mapping\README.md

- Preview: # [`baseline-browser-mapping`](https://github.com/web-platform-dx/web-features/packages/baseline-browser-mapping) By the [W3C WebDX Community Group](https://www.w3.org/community/webdx/) and contributors. `baseline-browser-mapping` provides: - An `Array` of browsers compatible with Baseline Widely available and Baseline year feature sets via the [`getCompatibleVersions()` function](#get-baseline-wi
- Lines: 434
- Characters: 18114

---

# Source: .\node_modules\before-after-hook\README.md

- Preview: # before-after-hook > asynchronous hooks for internal functionality [![npm downloads](https://img.shields.io/npm/dw/before-after-hook.svg)](https://www.npmjs.com/package/before-after-hook) [![Test](https://github.com/gr2m/before-after-hook/actions/workflows/test.yml/badge.svg)](https://github.com/gr2m/before-after-hook/actions/workflows/test.yml) ## Usage <table> <tbody valign=top align=left> <tr>
- Lines: 682
- Characters: 14913

---

# Source: .\node_modules\bessel\README.md

- Preview: # bessel Pure-JS implementation of Bessel functions J,Y,I,K (for the browser and nodejs). Emphasis on correctness and performance for integer order. The standard notation is used here: - `J` is the Bessel function of the first kind - `Y` is the Bessel function of the second kind - `I` is the modified Bessel function of the first kind - `K` is the modified Bessel function of the second kind ## Inst
- Lines: 103
- Characters: 3157

---

# Source: .\node_modules\better-opn\README.md

- Preview: # better-opn > A better opn. Reuse the same tab on Chrome for 👨‍💻. Inspire by [create-react-app](https://github.com/facebook/create-react-app) ## Install > `$ yarn add better-opn` > `$ npm install better-opn` ## Usage If you wish to overwrite the default browser, override `BROWSER` environment variable to your desired browser name (name is platform dependent). ```js const opn = require('better-o
- Lines: 37
- Characters: 886

---

# Source: .\node_modules\bignumber.js\CHANGELOG.md

- Preview: #### 9.3.1 * 11/07/25 * [BUGFIX] #388 `toPrecision` fix. #### 9.3.0 * 19/04/25 * Refactor type declarations: * Rename *bignumber.d.ts* to *types.d.ts*. * Rename *bignumber.d.cts* to *bignumber.d.ts*. * Add `export as namespace` to *bignumber.d.ts*. * Remove subpath exports from *package.json*. * Refactor named export from *bignumber.d.mts*. * #383 Remove `?` from static `BigNumber` and `default` p
- Lines: 384
- Characters: 8860

---

# Source: .\node_modules\bignumber.js\LICENCE.md

- Preview: The MIT License (MIT) ===================== Copyright © `<2025>` `Michael Mclaughlin` Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies o
- Lines: 29
- Characters: 1086

---

# Source: .\node_modules\bignumber.js\README.md

- Preview: ![bignumber.js](https://raw.githubusercontent.com/MikeMcl/bignumber.js/gh-pages/bignumberjs.png) A JavaScript library for arbitrary-precision decimal and non-decimal arithmetic. [![npm version](https://img.shields.io/npm/v/bignumber.js.svg)](https://www.npmjs.com/package/bignumber.js) [![npm downloads](https://img.shields.io/npm/dw/bignumber.js)](https://www.npmjs.com/package/bignumber.js) [![CI](
- Lines: 292
- Characters: 10486

---

# Source: .\node_modules\binary-extensions\readme.md

- Preview: # binary-extensions > List of binary file extensions The list is just a [JSON file](binary-extensions.json) and can be used anywhere. ## Install ```sh npm install binary-extensions ``` ## Usage ```js const binaryExtensions = require('binary-extensions'); console.log(binaryExtensions); //=> ['3ds', '3g2', …] ``` ## Related - [is-binary-path](https://github.com/sindresorhus/is-binary-path) - Check i
- Lines: 28
- Characters: 514

---

# Source: .\node_modules\body-parser\HISTORY.md

- Preview: 2.2.0 / 2025-03-27 ========================= * refactor: normalize common options for all parsers * deps: * iconv-lite@^0.6.3 2.1.0 / 2025-02-10 ========================= * deps: * type-is@^2.0.0 * debug@^4.4.0 * Removed destroy * refactor: prefix built-in node module imports * use the node require cache instead of custom caching 2.0.2 / 2024-10-31 ========================= * remove `unpipe` packa
- Lines: 734
- Characters: 17546

---

# Source: .\node_modules\body-parser\README.md

- Preview: # body-parser [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Build Status][ci-image]][ci-url] [![Test Coverage][coveralls-image]][coveralls-url] [![OpenSSF Scorecard Badge][ossf-scorecard-badge]][ossf-scorecard-visualizer] Node.js body parsing middleware. Parse incoming request bodies in a middleware before your handlers, available under the `req.b
- Lines: 494
- Characters: 18928

---

# Source: .\node_modules\boolbase\README.md

- Preview: #boolbase This very simple module provides two basic functions, one that always returns true (`trueFunc`) and one that always returns false (`falseFunc`). ###WTF? By having only a single instance of these functions around, it's possible to do some nice optimizations. Eg. [`CSSselect`](https://github.com/fb55/CSSselect) uses these functions to determine whether a selector won't match any elements.
- Lines: 13
- Characters: 646

---

# Source: .\node_modules\bottleneck\README.md

- Preview: # bottleneck [![Downloads][npm-downloads]][npm-url] [![version][npm-version]][npm-url] [![License][npm-license]][license-url] Bottleneck is a lightweight and zero-dependency Task Scheduler and Rate Limiter for Node.js and the browser. Bottleneck is an easy solution as it adds very little complexity to your code. It is battle-hardened, reliable and production-ready and used on a large scale in priv
- Lines: 1030
- Characters: 42656

---

# Source: .\node_modules\brace-expansion\README.md

- Preview: # brace-expansion [Brace expansion](https://www.gnu.org/software/bash/manual/html_node/Brace-Expansion.html), as known from sh/bash, in JavaScript. [![build status](https://secure.travis-ci.org/juliangruber/brace-expansion.svg)](http://travis-ci.org/juliangruber/brace-expansion) [![downloads](https://img.shields.io/npm/dm/brace-expansion.svg)](https://www.npmjs.org/package/brace-expansion) [![Gree
- Lines: 132
- Characters: 3929

---

# Source: .\node_modules\braces\README.md

- Preview: # braces [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=W8YFZ425KND68) [![NPM version](https://img.shields.io/npm/v/braces.svg?style=flat)](https://www.npmjs.com/package/braces) [![NPM monthly downloads](https://img.shields.io/npm/dm/braces.svg?style=flat)](https://npmjs.org/package/braces) [![NPM total downloa
- Lines: 588
- Characters: 20842

---

# Source: .\node_modules\browserslist\README.md

- Preview: # Browserslist <img width="120" height="120" alt="Browserslist logo by Anton Popov" src="https://browsersl.ist/logo.svg" align="right"> The config to share target browsers and Node.js versions between different front-end tools. It is used in: * [Autoprefixer] * [Babel] * [postcss-preset-env] * [eslint-plugin-compat] * [stylelint-no-unsupported-browser-features] * [postcss-normalize] * [obsolete-we
- Lines: 68
- Characters: 2687

---

# Source: .\node_modules\buffer\AUTHORS.md

- Preview: # Authors #### Ordered by first contribution. - Romain Beauxis (toots@rastageeks.org) - Tobias Koppers (tobias.koppers@googlemail.com) - Janus (ysangkok@gmail.com) - Rainer Dreyer (rdrey1@gmail.com) - Tõnis Tiigi (tonistiigi@gmail.com) - James Halliday (mail@substack.net) - Michael Williamson (mike@zwobble.org) - elliottcable (github@elliottcable.name) - rafael (rvalle@livelens.net) - Andrew Kell
- Lines: 76
- Characters: 2686

---

# Source: .\node_modules\buffer\README.md

- Preview: # buffer [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][downloads-url] [![javascript style guide][standard-image]][standard-url] [travis-image]: https://img.shields.io/travis/feross/buffer/master.svg [travis-url]: https://travis-ci.org/feross/buffer [npm-image]: https://img.shields.io/npm/v/buffer.svg [npm-url]: https://npmjs.org/package/buffer [
- Lines: 413
- Characters: 16643

---

# Source: .\node_modules\buffer-equal-constant-time\README.md

- Preview: # buffer-equal-constant-time Constant-time `Buffer` comparison for node.js.  Should work with browserify too. [![Build Status](https://travis-ci.org/goinstant/buffer-equal-constant-time.png?branch=master)](https://travis-ci.org/goinstant/buffer-equal-constant-time) ```sh npm install buffer-equal-constant-time ``` # Usage ```js var bufferEq = require('buffer-equal-constant-time'); var a = new Buffe
- Lines: 53
- Characters: 1051

---

# Source: .\node_modules\bytes\History.md

- Preview: 3.1.2 / 2022-01-27 ================== * Fix return value for un-parsable strings 3.1.1 / 2021-11-15 ================== * Fix "thousandsSeparator" incorrecting formatting fractional part 3.1.0 / 2019-01-22 ================== * Add petabyte (`pb`) support 3.0.0 / 2017-08-31 ================== * Change "kB" to "KB" in format output * Remove support for Node.js 0.6 * Remove support for ComponentJS 2.5
- Lines: 100
- Characters: 1678

---

# Source: .\node_modules\bytes\Readme.md

- Preview: # Bytes utility [![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url] [![Build Status][ci-image]][ci-url] [![Test Coverage][coveralls-image]][coveralls-url] Utility to parse a string bytes (ex: `1TB`) to bytes (`1099511627776`) and vice-versa. ## Installation This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmjs.
- Lines: 155
- Characters: 4584

---

# Source: .\node_modules\cac\README.md

- Preview: <img width="945" alt="2017-07-26 9 27 05" src="https://user-images.githubusercontent.com/8784712/28623641-373450f4-7249-11e7-854d-1b076dab274d.png"> [![NPM version](https://img.shields.io/npm/v/cac.svg?style=flat)](https://npmjs.com/package/cac) [![NPM downloads](https://img.shields.io/npm/dm/cac.svg?style=flat)](https://npmjs.com/package/cac) [![CircleCI](https://circleci.com/gh/cacjs/cac/tree/ma
- Lines: 539
- Characters: 15205

---

# Source: .\node_modules\call-bind\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.8](https://github.com/ljharb/call-bind/compare/v1.0.7...v1.0.8) - 2024-12-05 ### Commits - [Refactor] extract out some helpers and avoid get-i
- Lines: 109
- Characters: 9358

---

# Source: .\node_modules\call-bind\README.md

- Preview: # call-bind <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Robustly
- Lines: 67
- Characters: 1962

---

# Source: .\node_modules\call-bind-apply-helpers\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.2](https://github.com/ljharb/call-bind-apply-helpers/compare/v1.0.1...v1.0.2) - 2025-02-12 ### Commits - [types] improve inferred types [`e6f9
- Lines: 33
- Characters: 1908

---

# Source: .\node_modules\call-bind-apply-helpers\README.md

- Preview: # call-bind-apply-helpers <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-
- Lines: 65
- Characters: 2268

---

# Source: .\node_modules\call-bound\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.4](https://github.com/ljharb/call-bound/compare/v1.0.3...v1.0.4) - 2025-03-03 ### Commits - [types] improve types [`e648922`](https://github.c
- Lines: 45
- Characters: 2838

---

# Source: .\node_modules\call-bound\README.md

- Preview: # call-bound <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Robust c
- Lines: 56
- Characters: 1844

---

# Source: .\node_modules\callsites\readme.md

- Preview: # callsites [![Build Status](https://travis-ci.org/sindresorhus/callsites.svg?branch=master)](https://travis-ci.org/sindresorhus/callsites) > Get callsites from the [V8 stack trace API](https://v8.dev/docs/stack-trace-api) ## Install ``` $ npm install callsites ``` ## Usage ```js const callsites = require('callsites'); function unicorn() { console.log(callsites()[0].getFileName()); //=> '/Users/si
- Lines: 51
- Characters: 1838

---

# Source: .\node_modules\camelcase-css\README.md

- Preview: # camelcase-css [![NPM Version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] > Convert a kebab-cased CSS property into a camelCased DOM property. ## Installation [Node.js](http://nodejs.org/) `>= 6` is required. Type this at the command line: ```shell npm install camelcase-css ``` ## Usage ```js const camelCaseCSS = require('camelcase-css'); camelCaseCSS('-webkit-border-radius'
- Lines: 30
- Characters: 843

---

# Source: .\node_modules\caniuse-lite\README.md

- Preview: # caniuse-lite A smaller version of caniuse-db, with only the essentials! ## Docs Read full docs **[here](https://github.com/browserslist/caniuse-lite#readme)**.
- Lines: 9
- Characters: 158

---

# Source: .\node_modules\ccount\readme.md

- Preview: # ccount [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Count how often a character (or substring) is used in a string. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`ccount(value, charact
- Lines: 152
- Characters: 3288

---

# Source: .\node_modules\cfb\README.md

- Preview: # Container File Blobs Pure JS implementation of various container file formats, including ZIP and CFB. [![Build Status](https://travis-ci.org/SheetJS/js-cfb.svg?branch=master)](https://travis-ci.org/SheetJS/js-cfb) [![Coverage Status](http://img.shields.io/coveralls/SheetJS/js-cfb/master.svg)](https://coveralls.io/r/SheetJS/js-cfb?branch=master) [![Dependencies Status](https://david-dm.org/sheetj
- Lines: 164
- Characters: 5566

---

# Source: .\node_modules\chai\README.md

- Preview: <h1 align=center> <a href="http://chaijs.com" title="Chai Documentation"> <img alt="ChaiJS" src="http://chaijs.com/img/chai-logo.png"> </a> <br> chai </h1> <p align=center> Chai is a BDD / TDD assertion library for <a href="http://nodejs.org">node</a> and the browser that can be delightfully paired with any javascript testing framework. </p> <p align=center> <a href="https://www.npmjs.com/package/
- Lines: 165
- Characters: 6043

---

# Source: .\node_modules\chalk\readme.md

- Preview: <h1 align="center"> <br> <br> <img width="320" src="media/logo.svg" alt="Chalk"> <br> <br> <br> </h1> > Terminal string styling done right [![Build Status](https://travis-ci.org/chalk/chalk.svg?branch=master)](https://travis-ci.org/chalk/chalk) [![Coverage Status](https://coveralls.io/repos/github/chalk/chalk/badge.svg?branch=master)](https://coveralls.io/github/chalk/chalk?branch=master) [![npm d
- Lines: 342
- Characters: 13018

---

# Source: .\node_modules\character-entities\readme.md

- Preview: # character-entities [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Map of named character references. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [characterEntities](#characterentities)
- Lines: 155
- Characters: 3874

---

# Source: .\node_modules\character-entities-html4\readme.md

- Preview: # character-entities-html4 [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Map of named character references from HTML 4. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`characterEntitiesHtm
- Lines: 156
- Characters: 3977

---

# Source: .\node_modules\character-entities-legacy\readme.md

- Preview: # character-entities-legacy [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] List of legacy HTML named character references that don’t need a trailing semicolon. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *
- Lines: 160
- Characters: 4305

---

# Source: .\node_modules\character-reference-invalid\readme.md

- Preview: # character-reference-invalid [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Map of invalid numeric character references to their replacements, according to HTML. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use)
- Lines: 159
- Characters: 4160

---

# Source: .\node_modules\check-error\README.md

- Preview: <h1 align=center> <a href="http://chaijs.com" title="Chai Documentation"> <img alt="ChaiJS" src="http://chaijs.com/img/chai-logo.png"> </a> <br> check-error </h1> <p align=center> Error comparison and information related utility for <a href="http://nodejs.org">node</a> and the browser. </p> ## What is Check-Error? Check-Error is a module which you can use to retrieve an Error's information such as
- Lines: 147
- Characters: 3962

---

# Source: .\node_modules\cheerio\Readme.md

- Preview: <h1 align="center">cheerio</h1> <h5 align="center">The fast, flexible, and elegant library for parsing and manipulating HTML and XML.</h5> <div align="center"> <a href="https://github.com/cheeriojs/cheerio/actions/workflows/ci.yml"> <img src="https://github.com/cheeriojs/cheerio/actions/workflows/ci.yml/badge.svg" alt="Build Status"> </a> <a href="https://coveralls.io/github/cheeriojs/cheerio"> <i
- Lines: 241
- Characters: 8888

---

# Source: .\node_modules\cheerio-select\README.md

- Preview: # cheerio-select [![NPM version](http://img.shields.io/npm/v/cheerio-select.svg)](https://npmjs.org/package/cheerio-select) [![Build Status](https://travis-ci.org/cheeriojs/cheerio-select.svg?branch=master)](http://travis-ci.org/cheeriojs/cheerio-select) [![Downloads](https://img.shields.io/npm/dm/cheerio-select.svg)](https://npmjs.org/package/cheerio-select) [![Coverage](https://coveralls.io/repo
- Lines: 21
- Characters: 967

---

# Source: .\node_modules\chevrotain\CHANGELOG.md

- Preview: The [ChangeLog](./docs/changes/CHANGELOG.md) has moved to the docs folder.
- Lines: 5
- Characters: 73

---

# Source: .\node_modules\chevrotain\diagrams\README.md

- Preview: See [online docs](https://chevrotain.io/docs/guide/generating_syntax_diagrams.html).
- Lines: 4
- Characters: 84

---

# Source: .\node_modules\chevrotain\README.md

- Preview: # Chevrotain For details see: - Chevrotain's [website](https://chevrotain.io/docs/). - Chevrotain's root [README](https://github.com/chevrotain/chevrotain). ## Install Using npm: ```sh npm install chevrotain ``` or using yarn: ```sh yarn add chevrotain ```
- Lines: 23
- Characters: 244

---

# Source: .\node_modules\chevrotain\src\parse\parser\traits\README.md

- Preview: ### Parser Traits (mixins) The Chevrotain Parser class is implemented as multiple classes mixed-in (combined) together to provide the required functionality. A mix-in approach has been chosen to: 1. Split up the large (~3,000 LOC) Parser Class into smaller files. - Similar to C# [Partial Classes](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/partial-classes-a
- Lines: 74
- Characters: 4333

---

# Source: .\node_modules\chokidar\node_modules\glob-parent\CHANGELOG.md

- Preview: ### [5.1.2](https://github.com/gulpjs/glob-parent/compare/v5.1.1...v5.1.2) (2021-03-06) ### Bug Fixes * eliminate ReDoS ([#36](https://github.com/gulpjs/glob-parent/issues/36)) ([f923116](https://github.com/gulpjs/glob-parent/commit/f9231168b0041fea3f8f954b3cceb56269fc6366)) ### [5.1.1](https://github.com/gulpjs/glob-parent/compare/v5.1.0...v5.1.1) (2021-01-27) ### Bug Fixes * unescape exclamation
- Lines: 113
- Characters: 4394

---

# Source: .\node_modules\chokidar\node_modules\glob-parent\README.md

- Preview: <p align="center"> <a href="https://gulpjs.com"> <img height="257" width="114" src="https://raw.githubusercontent.com/gulpjs/artwork/master/gulp-2x.png"> </a> </p> # glob-parent [![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Azure Pipelines Build Status][azure-pipelines-image]][azure-pipelines-url] [![Travis Build Status][travis-image]][travis-url] [![AppVeyor Bui
- Lines: 140
- Characters: 4509

---

# Source: .\node_modules\chokidar\README.md

- Preview: # Chokidar [![Weekly downloads](https://img.shields.io/npm/dw/chokidar.svg)](https://github.com/paulmillr/chokidar) [![Yearly downloads](https://img.shields.io/npm/dy/chokidar.svg)](https://github.com/paulmillr/chokidar) > Minimal and efficient cross-platform file watching library [![NPM](https://nodei.co/npm/chokidar.png)](https://www.npmjs.com/package/chokidar) ## Why? Node.js `fs.watch`: * Does
- Lines: 311
- Characters: 14049

---

# Source: .\node_modules\chromatic\README.md

- Preview: # Chromatic CLI Publishes your Storybook to Chromatic and kicks off tests if they're enabled. <img width="100%" src="https://user-images.githubusercontent.com/321738/82901859-d820ec80-9f5e-11ea-81e7-78d494c103ad.gif" alt=""> <a href="https://www.npmjs.com/package/chromatic"> <img src="https://badgen.net/npm/v/chromatic" alt="Published on npm"> </a> <a href="https://www.chromatic.com/builds?appId=5
- Lines: 49
- Characters: 2172

---

# Source: .\node_modules\classcat\LICENSE.md

- Preview: Copyright © Jorge Bucaran <<https://jorgebucaran.com>> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit p
- Lines: 10
- Characters: 1072

---

# Source: .\node_modules\classcat\README.md

- Preview: # Classcat > Build a [`class`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class) attribute string quickly. - Framework agnostic, reusable, plain vanilla JavaScript. - Up to [2.5x faster](#benchmarks) than alternatives. - [217 B](http://bundlephobia.com/result?p=classcat) (minified+gzipped). 👌 This module makes it easy to build a space-delimited `class` attribute string fr
- Lines: 91
- Characters: 1753

---

# Source: .\node_modules\classnames\HISTORY.md

- Preview: # Changelog ## v2.5.1 / 2023-12-29 - Remove `workspaces` field from package ([#350](https://github.com/JedWatson/classnames/pull/350)) ## v2.5.0 / 2023-12-27 - Restore ability to pass a TypeScript `interface` ([#341](https://github.com/JedWatson/classnames/pull/341)) - Add `exports` field to package ([#342](https://github.com/JedWatson/classnames/pull/342)) ## v2.4.0 / 2023-12-26 - Use string conc
- Lines: 123
- Characters: 4124

---

# Source: .\node_modules\classnames\README.md

- Preview: # Classnames > A simple JavaScript utility for conditionally joining classNames together. <p> <a aria-label="NPM version" href="https://www.npmjs.com/package/classnames"> <img alt="" src="https://img.shields.io/npm/v/classnames.svg?style=for-the-badge&labelColor=0869B8"> </a> <a aria-label="License" href="#"> <img alt="" src="https://img.shields.io/npm/l/classnames.svg?style=for-the-badge&labelCol
- Lines: 222
- Characters: 8849

---

# Source: .\node_modules\class-variance-authority\README.md

- Preview: # class-variance-authority For documentation, visit [cva.style](https://cva.style).
- Lines: 6
- Characters: 82

---

# Source: .\node_modules\cliui\CHANGELOG.md

- Preview: # Change Log All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines. ## [8.0.1](https://github.com/yargs/cliui/compare/v8.0.0...v8.0.1) (2022-10-01) ### Bug Fixes * **deps:** move rollup-plugin-ts to dev deps ([#124](https://github.com/yargs/cliui/issues/124)) ([7c8bd6b](https://g
- Lines: 142
- Characters: 4427

---

# Source: .\node_modules\cliui\node_modules\emoji-regex\README.md

- Preview: # emoji-regex [![Build status](https://travis-ci.org/mathiasbynens/emoji-regex.svg?branch=master)](https://travis-ci.org/mathiasbynens/emoji-regex) _emoji-regex_ offers a regular expression to match all emoji symbols (including textual representations of emoji) as per the Unicode Standard. This repository contains a script that generates this regular expression based on [the data from Unicode v12]
- Lines: 76
- Characters: 2562

---

# Source: .\node_modules\cliui\node_modules\string-width\readme.md

- Preview: # string-width > Get the visual width of a string - the number of columns required to display it Some Unicode characters are [fullwidth](https://en.wikipedia.org/wiki/Halfwidth_and_fullwidth_forms) and use double the normal width. [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) are stripped and doesn't affect the width. Useful to be able to measure the actual width of command-l
- Lines: 52
- Characters: 1339

---

# Source: .\node_modules\cliui\node_modules\strip-ansi\readme.md

- Preview: # strip-ansi [![Build Status](https://travis-ci.org/chalk/strip-ansi.svg?branch=master)](https://travis-ci.org/chalk/strip-ansi) > Strip [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) from a string ## Install ``` $ npm install strip-ansi ``` ## Usage ```js const stripAnsi = require('strip-ansi'); stripAnsi('\u001B[4mUnicorn\u001B[0m'); //=> 'Unicorn' stripAnsi('\u001B]8;;https
- Lines: 49
- Characters: 1553

---

# Source: .\node_modules\cliui\node_modules\wrap-ansi\readme.md

- Preview: # wrap-ansi [![Build Status](https://travis-ci.com/chalk/wrap-ansi.svg?branch=master)](https://travis-ci.com/chalk/wrap-ansi) [![Coverage Status](https://coveralls.io/repos/github/chalk/wrap-ansi/badge.svg?branch=master)](https://coveralls.io/github/chalk/wrap-ansi?branch=master) > Wordwrap a string with [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code#Colors_and_Styles) ## Insta
- Lines: 93
- Characters: 2651

---

# Source: .\node_modules\cliui\README.md

- Preview: # cliui ![ci](https://github.com/yargs/cliui/workflows/ci/badge.svg) [![NPM version](https://img.shields.io/npm/v/cliui.svg)](https://www.npmjs.com/package/cliui) [![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org) ![nycrc config on GitHub](https://img.shields.io/nycrc/yargs/cliui) easily create complex multi-column comma
- Lines: 144
- Characters: 2857

---

# Source: .\node_modules\clone-deep\README.md

- Preview: # clone-deep [![NPM version](https://img.shields.io/npm/v/clone-deep.svg?style=flat)](https://www.npmjs.com/package/clone-deep) [![NPM monthly downloads](https://img.shields.io/npm/dm/clone-deep.svg?style=flat)](https://npmjs.org/package/clone-deep) [![NPM total downloads](https://img.shields.io/npm/dt/clone-deep.svg?style=flat)](https://npmjs.org/package/clone-deep) [![Linux Build Status](https:/
- Lines: 109
- Characters: 4216

---

# Source: .\node_modules\clsx\readme.md

- Preview: # clsx [![CI](https://github.com/lukeed/clsx/workflows/CI/badge.svg)](https://github.com/lukeed/clsx/actions?query=workflow%3ACI) [![codecov](https://badgen.net/codecov/c/github/lukeed/clsx)](https://codecov.io/gh/lukeed/clsx) [![licenses](https://licenses.dev/b/npm/clsx)](https://licenses.dev/npm/clsx) > A tiny (239B) utility for constructing `className` strings conditionally.<Br>Also serves as a
- Lines: 157
- Characters: 3848

---

# Source: .\node_modules\cmdk\LICENSE.md

- Preview: MIT License Copyright (c) 2022 Paco Coursey Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\cmdk\README.md

- Preview: <p align="center"> <img src="./website/public/og.png" /> </p> # ⌘K [![cmdk minzip package size](https://img.shields.io/bundlephobia/minzip/cmdk)](https://www.npmjs.com/package/cmdk?activeTab=code) [![cmdk package version](https://img.shields.io/npm/v/cmdk.svg?colorB=green)](https://www.npmjs.com/package/cmdk) ⌘K is a command menu React component that can also be used as an accessible combobox. You
- Lines: 486
- Characters: 13529

---

# Source: .\node_modules\codepage\README.md

- Preview: # js-codepage [Codepages](https://en.wikipedia.org/wiki/Codepage) are character encodings.  In many contexts, single- or double-byte character sets are used in lieu of Unicode encodings.  The codepages map between characters and numbers. ## Setup In node: ```js var cptable = require('codepage'); ``` In the browser: ```html <script src="cptable.js"></script> <script src="cputils.js"></script> ``` A
- Lines: 353
- Characters: 19396

---

# Source: .\node_modules\codex-notifier\README.md

- Preview: # JavaScript Notifier Lightweight notification module for websites ## Instalation ### Install via NPM/Yarn Install package ```shell npm install codex-notifier --save ``` ```shell yarn add codex-notifier ``` #### Require module ```javascript const notifier = require('codex-notifier'); ``` ```javascript import notifier from 'codex-notifier'; import {ConfirmNotifierOptions, NotifierOptions, PromptNot
- Lines: 117
- Characters: 2712

---

# Source: .\node_modules\codex-tooltip\README.md

- Preview: # codex.tooltips Lightweight JavaScript module for adding tooltips with custom content to any HTML element <img src="tooltips.png" style="max-width: 100%"> ## Installation First, install it via package manager: ```shell yarn add codex-tooltip ``` ```shell npm install codex-tooltip ``` Then, include tooltips to your script, create an instance and call hiding/showig methods: ```js import Tooltip fro
- Lines: 113
- Characters: 2932

---

# Source: .\node_modules\color-convert\CHANGELOG.md

- Preview: # 1.0.0 - 2016-01-07 - Removed: unused speed test - Added: Automatic routing between previously unsupported conversions ([#27](https://github.com/Qix-/color-convert/pull/27)) - Removed: `xxx2xxx()` and `xxx2xxxRaw()` functions ([#27](https://github.com/Qix-/color-convert/pull/27)) - Removed: `convert()` class ([#27](https://github.com/Qix-/color-convert/pull/27)) - Changed: all functions to lookup
- Lines: 56
- Characters: 1360

---

# Source: .\node_modules\color-convert\README.md

- Preview: # color-convert [![Build Status](https://travis-ci.org/Qix-/color-convert.svg?branch=master)](https://travis-ci.org/Qix-/color-convert) Color-convert is a color conversion library for JavaScript and node. It converts all ways between `rgb`, `hsl`, `hsv`, `hwb`, `cmyk`, `ansi`, `ansi16`, `hex` strings, and CSS `keyword`s (will round to closest): ```js var convert = require('color-convert'); convert
- Lines: 71
- Characters: 2785

---

# Source: .\node_modules\color-name\README.md

- Preview: A JSON with color names and its values. Based on http://dev.w3.org/csswg/css-color/#named-colors. [![NPM](https://nodei.co/npm/color-name.png?mini=true)](https://nodei.co/npm/color-name/) ```js var colors = require('color-name'); colors.red //[255,0,0] ``` <a href="LICENSE"><img src="https://upload.wikimedia.org/wikipedia/commons/0/0c/MIT_logo.svg" width="120"/></a>
- Lines: 14
- Characters: 362

---

# Source: .\node_modules\combined-stream\Readme.md

- Preview: # combined-stream A stream that emits multiple other streams one after another. **NB** Currently `combined-stream` works with streams version 1 only. There is ongoing effort to switch this library to streams version 2. Any help is welcome. :) Meanwhile you can explore other libraries that provide streams2 support with more or less compatibility with `combined-stream`. - [combined-stream2](https://
- Lines: 141
- Characters: 4413

---

# Source: .\node_modules\commander\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html). (Format adopted after v3.0.0.) <!-- markdownlint-disable MD024 --> ## [4.1.1] (2020-02-02) ### Fixed * TypeScript definition for `.action()` should inclu
- Lines: 439
- Characters: 14798

---

# Source: .\node_modules\commander\Readme.md

- Preview: # Commander.js [![Build Status](https://api.travis-ci.org/tj/commander.js.svg?branch=master)](http://travis-ci.org/tj/commander.js) [![NPM Version](http://img.shields.io/npm/v/commander.svg?style=flat)](https://www.npmjs.org/package/commander) [![NPM Downloads](https://img.shields.io/npm/dm/commander.svg?style=flat)](https://npmcharts.com/compare/commander?minimal=true) [![Install Size](https://pa
- Lines: 716
- Characters: 22753

---

# Source: .\node_modules\comma-separated-tokens\readme.md

- Preview: # comma-separated-tokens [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Parse and stringify comma-separated tokens. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`parse(value)`](#parsevalu
- Lines: 170
- Characters: 4062

---

# Source: .\node_modules\content-disposition\HISTORY.md

- Preview: 1.0.0 / 2024-08-31 ================== * drop node <18 * allow utf8 as alias for utf-8 0.5.4 / 2021-12-10 ================== * deps: safe-buffer@5.2.1 0.5.3 / 2018-12-17 ================== * Use `safe-buffer` for improved Buffer API 0.5.2 / 2016-12-08 ================== * Fix `parse` to accept any linear whitespace character 0.5.1 / 2016-01-17 ================== * perf: enable strict mode 0.5.0 / 2
- Lines: 69
- Characters: 1046

---

# Source: .\node_modules\content-disposition\README.md

- Preview: # content-disposition [![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url] [![Node.js Version][node-version-image]][node-version-url] [![Build Status][github-actions-ci-image]][github-actions-ci-url] [![Test Coverage][coveralls-image]][coveralls-url] Create and parse HTTP `Content-Disposition` header ## Installation ```sh $ npm install content-disposition ``` ##
- Lines: 145
- Characters: 5059

---

# Source: .\node_modules\content-type\HISTORY.md

- Preview: 1.0.5 / 2023-01-29 ================== * perf: skip value escaping when unnecessary 1.0.4 / 2017-09-11 ================== * perf: skip parameter parsing when no parameters 1.0.3 / 2017-09-10 ================== * perf: remove argument reassignment 1.0.2 / 2016-05-09 ================== * perf: enable strict mode 1.0.1 / 2015-02-13 ================== * Improve missing `Content-Type` header error messa
- Lines: 32
- Characters: 494

---

# Source: .\node_modules\content-type\README.md

- Preview: # content-type [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Node.js Version][node-image]][node-url] [![Build Status][ci-image]][ci-url] [![Coverage Status][coveralls-image]][coveralls-url] Create and parse HTTP Content-Type header according to RFC 7231 ## Installation ```sh $ npm install content-type ``` ## API ```js var contentType = require('co
- Lines: 97
- Characters: 2688

---

# Source: .\node_modules\convert-source-map\README.md

- Preview: # convert-source-map [![Build Status][ci-image]][ci-url] Converts a source-map from/to  different formats and allows adding/changing properties. ```js var convert = require('convert-source-map'); var json = convert .fromComment('//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGQvZm9vLm1pbi5qcyIsInNvdXJjZXMiOlsic3JjL2Zvby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQ
- Lines: 209
- Characters: 7215

---

# Source: .\node_modules\convex\CHANGELOG.md

- Preview: # Changelog ## 1.27.4 - Add a `getAuth()` method to the client which returns the current token and claims. This method is intended for instrumentation purposes like adding this information to a reported Sentry error or event. - Change to CLI `--admin-key` and `--url` arg parsing logic to avoid coercing empty strings to booleans. - Vendor jwt-decode along with a few other dependnecies; this brings
- Lines: 650
- Characters: 24388

---

# Source: .\node_modules\convex\README.md

- Preview: # Convex TypeScript/JavaScript client libraries and CLI for Convex. Convex is the backend application platform with everything you need to build your product. Get started at [docs.convex.dev](https://docs.convex.dev)! Or see [Convex demos](https://github.com/get-convex/convex-demos). Open discussions and issues in this repository about Convex TypeScript/JavaScript clients, the Convex CLI, or the C
- Lines: 44
- Characters: 1641

---

# Source: .\node_modules\convex\src\common\README.md

- Preview: Code in this common/ folder is not publicly exposed, there is no 'convex/common' export. Code here is used from other entry points.
- Lines: 5
- Characters: 130

---

# Source: .\node_modules\convex\src\server\README.md

- Preview: # Server This is the entry point for all of the code for use within query and mutation functions. This directory uses an "interface-impl" pattern where: - The main directory has all interfaces to define the types of the various abstractions. These are parameterized of the developers `DataModel` type and carefully written to only allow valid usage. - The `impl/` subdirectory has implementations of
- Lines: 18
- Characters: 723

---

# Source: .\node_modules\convex\src\vendor\jwt-decode\README.md

- Preview: Copied from https://github.com/auth0/jwt-decode
- Lines: 4
- Characters: 47

---

# Source: .\node_modules\convex\src\vendor\README.md

- Preview: It's useful to vendor dependencies that are pretty stable and unlikely to receive security updates: we can remove parts we don't use for a smaller bundle and we spare our users runtime dependencies to install. We know how our library needs to be bundled, Some thoughts from tmwc on this: - https://blog.val.town/gardening-dependencies - https://macwright.com/2021/03/11/vendor-by-default We're curren
- Lines: 21
- Characters: 795

---

# Source: .\node_modules\convex-helpers\README.md

- Preview: # convex-helpers A collection of useful code to complement the official packages. Table of contents: - [Custom Functions](#custom-functions) - [Relationship helpers](#relationship-helpers) - [Action retries](#action-retries) - [Stateful migrations](#stateful-migrations) - [Rate limiting](#rate-limiting) - [Session tracking via client-side sessionID storage](#session-tracking-via-client-side-sessio
- Lines: 1288
- Characters: 43648

---

# Source: .\node_modules\cookie\README.md

- Preview: # cookie [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Build Status][ci-image]][ci-url] [![Coverage Status][coverage-image]][coverage-url] Basic HTTP cookie parser and serializer for HTTP servers. ## Installation ```sh $ npm install cookie ``` ## API ```js const cookie = require("cookie"); // import * as cookie from 'cookie'; ``` ### cookie.parse(
- Lines: 251
- Characters: 10545

---

# Source: .\node_modules\cookie-signature\History.md

- Preview: 1.2.2 / 2024-10-29 ================== * various metadata/documentation tweaks (incl. #51) 1.2.1 / 2023-02-27 ================== * update annotations for allowed secret key types (#44, thanks @jyasskin!) 1.2.0 / 2022-02-17 ================== * allow buffer and other node-supported types as key (#33) * be pickier about extra content after signed portion (#40) * some internal code clarity/cleanup imp
- Lines: 73
- Characters: 1411

---

# Source: .\node_modules\cookie-signature\Readme.md

- Preview: # cookie-signature Sign and unsign cookies. ## Example ```js var cookie = require('cookie-signature'); var val = cookie.sign('hello', 'tobiiscool'); val.should.equal('hello.DGDUkGlIkCzPz+C0B064FNgHdEjox7ch8tOBGslZ5QI'); var val = cookie.sign('hello', 'tobiiscool'); cookie.unsign(val, 'tobiiscool').should.equal('hello'); cookie.unsign(val, 'luna').should.be.false; ``` ## License MIT. See LICENSE fi
- Lines: 26
- Characters: 404

---

# Source: .\node_modules\cors\CONTRIBUTING.md

- Preview: # contributing to `cors` CORS is a node.js package for providing a [connect](http://www.senchalabs.org/connect/)/[express](http://expressjs.com/) middleware that can be used to enable [CORS](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing) with various options. Learn more about the project in [the README](README.md). ## The CORS Spec [http://www.w3.org/TR/cors/](http://www.w3.org/TR/cor
- Lines: 36
- Characters: 995

---

# Source: .\node_modules\cors\HISTORY.md

- Preview: 2.8.5 / 2018-11-04 ================== * Fix setting `maxAge` option to `0` 2.8.4 / 2017-07-12 ================== * Work-around Safari bug in default pre-flight response 2.8.3 / 2017-03-29 ================== * Fix error when options delegate missing `methods` option 2.8.2 / 2017-03-28 ================== * Fix error when frozen options are passed * Send "Vary: Origin" when using regular expressions
- Lines: 61
- Characters: 1111

---

# Source: .\node_modules\cors\README.md

- Preview: # cors [![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url] [![Build Status][travis-image]][travis-url] [![Test Coverage][coveralls-image]][coveralls-url] CORS is a node.js package for providing a [Connect](http://www.senchalabs.org/connect/)/[Express](http://expressjs.com/) middleware that can be used to enable [CORS](http://en.wikipedia.org/wiki/Cross-origin_re
- Lines: 246
- Characters: 8963

---

# Source: .\node_modules\countries-list\minimal\README.md

- Preview: # Countries & Languages: minimal size files This directory contains simplified data for each list, converting `Object` with fields to `Array` with fields in predefined order to decrease the file size (and traffic). ## Country codes: ISO 3166-1 **alpha-2** to **alpha-3** ~2.7KB Example: `{"UA":"UKR"}` ## Country codes: ISO 3166-1 **alpha-3** to **alpha-2** ~2.7KB Example: `{"UKR":"UA"}` ## Country
- Lines: 35
- Characters: 827

---

# Source: .\node_modules\countries-list\README.md

- Preview: # Countries, Languages & Continents data [![Monthly Downloads](https://img.shields.io/npm/dm/countries-list.svg)](https://www.npmjs.com/package/countries-list) [![NPM](https://img.shields.io/npm/v/countries-list.svg 'NPM package version')](https://www.npmjs.com/package/countries-list) [![Packagist](https://img.shields.io/packagist/v/annexare/countries-list.svg 'Packagist version')](https://packagi
- Lines: 126
- Characters: 3844

---

# Source: .\node_modules\crc-32\README.md

- Preview: # crc32 Standard CRC-32 algorithm implementation in JS (for the browser and nodejs). Emphasis on correctness, performance, and IE6+ support. ## Installation With [npm](https://www.npmjs.org/package/crc-32): ```bash $ npm install crc-32 ``` When installed globally, npm installs a script `crc32` that computes the checksum for a specified file or standard input. <details> <summary><b>CDN Availability
- Lines: 203
- Characters: 6240

---

# Source: .\node_modules\crelt\README.md

- Preview: # CRELT Tiny DOM-element creation utility. Exports a single (default) value, which is a function that you call with: - A tag name string or DOM element. - Optionally an attribute object mapping names to values. When the values are strings, they are added to the element with `setAttribute`. When they have another type, they are assigned as regular properties (mostly useful for event handlers via `o
- Lines: 26
- Characters: 741

---

# Source: .\node_modules\cron-parser\README.md

- Preview: cron-parser ================ [![Build Status](https://github.com/harrisiirak/cron-parser/actions/workflows/push.yml/badge.svg?branch=master)](https://github.com/harrisiirak/cron-parser/actions/workflows/push.yml) [![NPM version](https://badge.fury.io/js/cron-parser.png)](http://badge.fury.io/js/cron-parser) Node.js library for parsing and manipulating crontab instructions. It includes support for
- Lines: 178
- Characters: 5319

---

# Source: .\node_modules\cross-spawn\README.md

- Preview: # cross-spawn [![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][ci-image]][ci-url] [![Build status][appveyor-image]][appveyor-url] [npm-url]:https://npmjs.org/package/cross-spawn [downloads-image]:https://img.shields.io/npm/dm/cross-spawn.svg [npm-image]:https://img.shields.io/npm/v/cross-spawn.svg [ci-url]:https://github.com/moxystudio/node-cross-spawn
- Lines: 92
- Characters: 4028

---

# Source: .\node_modules\css.escape\README.md

- Preview: # `CSS.escape` polyfill [![Build status](https://travis-ci.org/mathiasbynens/CSS.escape.svg?branch=master)](https://travis-ci.org/mathiasbynens/CSS.escape) [![Code coverage status](http://img.shields.io/coveralls/mathiasbynens/CSS.escape/master.svg)](https://coveralls.io/r/mathiasbynens/CSS.escape) A robust polyfill for [the `CSS.escape` utility method as defined in CSSOM](https://drafts.csswg.org
- Lines: 42
- Characters: 1259

---

# Source: .\node_modules\css-box-model\README.md

- Preview: # `css-box-model` 📦 Get accurate and well named [CSS Box Model](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Box_Model/Introduction_to_the_CSS_box_model) information about a [`Element`](https://developer.mozilla.org/en-US/docs/Web/API/Element). [![Build Status](https://travis-ci.org/alexreardon/css-box-model.svg?branch=master)](https://travis-ci.org/alexreardon/css-box-model) [![npm](http
- Lines: 293
- Characters: 5898

---

# Source: .\node_modules\cssesc\README.md

- Preview: # cssesc [![Build status](https://travis-ci.org/mathiasbynens/cssesc.svg?branch=master)](https://travis-ci.org/mathiasbynens/cssesc) [![Code coverage status](https://img.shields.io/codecov/c/github/mathiasbynens/cssesc.svg)](https://codecov.io/gh/mathiasbynens/cssesc) A JavaScript library for escaping CSS strings and identifiers while generating the shortest possible ASCII-only output. This is a J
- Lines: 204
- Characters: 6320

---

# Source: .\node_modules\css-select\README.md

- Preview: # css-select [![NPM version](http://img.shields.io/npm/v/css-select.svg)](https://npmjs.org/package/css-select) [![Build Status](https://travis-ci.com/fb55/css-select.svg?branch=master)](http://travis-ci.com/fb55/css-select) [![Downloads](https://img.shields.io/npm/dm/css-select.svg)](https://npmjs.org/package/css-select) [![Coverage](https://coveralls.io/repos/fb55/css-select/badge.svg?branch=mas
- Lines: 266
- Characters: 12068

---

# Source: .\node_modules\cssstyle\README.md

- Preview: # CSSStyleDeclaration A Node.js implementation of the CSS Object Model [`CSSStyleDeclaration` class](https://drafts.csswg.org/cssom/#the-cssstyledeclaration-interface). ## Background This package is an extension of the `CSSStyleDeclaration` class in Nikita Vasilyev's [CSSOM](https://github.com/NV/CSSOM), with added support for modern specifications. The primary use case is for testing browser code
- Lines: 14
- Characters: 548

---

# Source: .\node_modules\csstype\README.md

- Preview: # CSSType [![npm](https://img.shields.io/npm/v/csstype.svg)](https://www.npmjs.com/package/csstype) TypeScript and Flow definitions for CSS, generated by [data from MDN](https://github.com/mdn/data). It provides autocompletion and type checking for CSS properties and values. **TypeScript** ```ts import type * as CSS from 'csstype'; const style: CSS.Properties = { colour: 'white', // Type error on
- Lines: 280
- Characters: 10241

---

# Source: .\node_modules\css-what\readme.md

- Preview: # css-what [![Build Status](https://img.shields.io/github/workflow/status/fb55/css-what/Node.js%20CI/master)](https://github.com/fb55/css-what/actions/workflows/nodejs-test.yml) [![Coverage](https://img.shields.io/coveralls/github/fb55/css-what/master)](https://coveralls.io/github/fb55/css-what?branch=master) A CSS selector parser. ## Example ```js import * as CSSwhat from "css-what"; CSSwhat.pars
- Lines: 71
- Characters: 4674

---

# Source: .\node_modules\d3-color\README.md

- Preview: # d3-color Even though your browser understands a lot about colors, it doesn’t offer much help in manipulating colors through JavaScript. The d3-color module therefore provides representations for various color spaces, allowing specification, conversion and manipulation. (Also see [d3-interpolate](https://github.com/d3/d3-interpolate) for color interpolation.) For example, take the color named “st
- Lines: 206
- Characters: 13801

---

# Source: .\node_modules\d3-dispatch\README.md

- Preview: # d3-dispatch Dispatching is a convenient mechanism for separating concerns with loosely-coupled code: register named callbacks and then call them with arbitrary arguments. A variety of D3 components, such as [d3-drag](https://github.com/d3/d3-drag), use this mechanism to emit events to listeners. Think of this like Node’s [EventEmitter](https://nodejs.org/api/events.html), except every listener h
- Lines: 97
- Characters: 5236

---

# Source: .\node_modules\d3-drag\README.md

- Preview: # d3-drag [Drag-and-drop](https://en.wikipedia.org/wiki/Drag_and_drop) is a popular and easy-to-learn pointing gesture: move the pointer to an object, press and hold to grab it, “drag” the object to a new location, and release to “drop”. D3’s [drag behavior](#api-reference) provides a convenient but flexible abstraction for enabling drag-and-drop interaction on [selections](https://github.com/d3/d
- Lines: 251
- Characters: 19906

---

# Source: .\node_modules\d3-ease\README.md

- Preview: # d3-ease *Easing* is a method of distorting time to control apparent motion in animation. It is most commonly used for [slow-in, slow-out](https://en.wikipedia.org/wiki/12_basic_principles_of_animation#Slow_In_and_Slow_Out). By easing time, [animated transitions](https://github.com/d3/d3-transition) are smoother and exhibit more plausible motion. The easing types in this module implement the [eas
- Lines: 256
- Characters: 16544

---

# Source: .\node_modules\d3-interpolate\README.md

- Preview: # d3-interpolate This module provides a variety of interpolation methods for blending between two values. Values may be numbers, colors, strings, arrays, or even deeply-nested objects. For example: ```js const i = d3.interpolateNumber(10, 20); i(0.0); // 10 i(0.2); // 12 i(0.5); // 15 i(1.0); // 20 ``` The returned function `i` is called an *interpolator*. Given a starting value *a* and an ending
- Lines: 271
- Characters: 26531

---

# Source: .\node_modules\d3-selection\README.md

- Preview: # d3-selection Selections allow powerful data-driven transformation of the document object model (DOM): set [attributes](#selection_attr), [styles](#selection_style), [properties](#selection_property), [HTML](#selection_html) or [text](#selection_text) content, and more. Using the [data join](#joining-data)’s [enter](#selection_enter) and [exit](#selection_enter) selections, you can also [add](#se
- Lines: 866
- Characters: 59276

---

# Source: .\node_modules\d3-timer\README.md

- Preview: # d3-timer This module provides an efficient queue capable of managing thousands of concurrent animations, while guaranteeing consistent, synchronized timing with concurrent or staged animations. Internally, it uses [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame) for fluid animation (if available), switching to [setTimeout](https://developer.m
- Lines: 90
- Characters: 5898

---

# Source: .\node_modules\d3-transition\README.md

- Preview: # d3-transition A transition is a [selection](https://github.com/d3/d3-selection)-like interface for animating changes to the DOM. Instead of applying changes instantaneously, transitions smoothly interpolate the DOM from its current state to the desired target state over a given duration. To apply a transition, select elements, call [*selection*.transition](#selection_transition), and then make t
- Lines: 493
- Characters: 41304

---

# Source: .\node_modules\d3-zoom\README.md

- Preview: # d3-zoom Panning and zooming are popular interaction techniques which let the user focus on a region of interest by restricting the view. It is easy to learn due to direct manipulation: click-and-drag to pan (translate), spin the wheel to zoom (scale), or use touch. Panning and zooming are widely used in web-based mapping, but can also be used with visualizations such as time-series and scatterpl
- Lines: 417
- Characters: 37577

---

# Source: .\node_modules\data-urls\README.md

- Preview: # Parse `data:` URLs This package helps you parse `data:` URLs [according to the WHATWG Fetch Standard](https://fetch.spec.whatwg.org/#data-urls): ```js const parseDataURL = require("data-urls"); const textExample = parseDataURL("data:,Hello%2C%20World!"); console.log(textExample.mimeType.toString()); // "text/plain;charset=US-ASCII" console.log(textExample.body);                // Uint8Array(13)
- Lines: 65
- Characters: 3625

---

# Source: .\node_modules\data-view-buffer\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.2](https://github.com/inspect-js/data-view-buffer/compare/v1.0.1...v1.0.2) - 2024-12-19 ### Commits - [actions] split out node 10-20, and 20+
- Lines: 41
- Characters: 3070

---

# Source: .\node_modules\data-view-buffer\README.md

- Preview: # data-view-buffer <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Get the ArrayBuffer out of a DataView, robustly. This will work in node <= 0.10 and < 0.11.4, where
- Lines: 46
- Characters: 1935

---

# Source: .\node_modules\data-view-byte-length\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.2](https://github.com/inspect-js/data-view-byte-length/compare/v1.0.1...v1.0.2) - 2024-12-19 ### Commits - [readme] update URLs [`79df46c`](ht
- Lines: 39
- Characters: 2851

---

# Source: .\node_modules\data-view-byte-length\README.md

- Preview: # data-view-byte-length <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Get the `byteLength` out of a DataView, robustly. This will work in node <= 0.10 and < 0.11.4,
- Lines: 46
- Characters: 2029

---

# Source: .\node_modules\data-view-byte-offset\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.1](https://github.com/inspect-js/data-view-byte-offset/compare/v1.0.0...v1.0.1) - 2024-12-18 ### Commits - [types] use shared tsconfig [`d5ce4
- Lines: 34
- Characters: 2729

---

# Source: .\node_modules\data-view-byte-offset\README.md

- Preview: # data-view-byte-offset <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Get the `byteOffset` out of a DataView, robustly. This will work in node <= 0.10 and < 0.11.4,
- Lines: 46
- Characters: 2031

---

# Source: .\node_modules\date-fns\CHANGELOG.md

- Preview: # Change Log All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning]. This change log follows the format documented in [Keep a CHANGELOG]. [semantic versioning]: http://semver.org/ [keep a changelog]: http://keepachangelog.com/ ## v4.1.0 - 2024-09-17 This release adds time zone support to format functions (that I somehow missed when workin
- Lines: 2847
- Characters: 117264

---

# Source: .\node_modules\date-fns\docs\cdn.md

- Preview: # CDN Starting with v3.6.0, the CDN versions of date-fns are available on [jsDelivr](https://www.jsdelivr.com/package/npm/date-fns) and other CDNs. They expose the date-fns functionality via the `window.dateFns` global variable. Unlike the npm package, the CDN is transpiled to be compatible with IE11, so it supports a wide variety of legacy browsers and environments. ```html <script src="https://c
- Lines: 114
- Characters: 3643

---

# Source: .\node_modules\date-fns\docs\fp.md

- Preview: # FP Guide **date-fns** v2.x provides [functional programming](https://en.wikipedia.org/wiki/Functional_programming) (FP) friendly functions, like those in [lodash](https://github.com/lodash/lodash/wiki/FP-Guide), that support [currying](https://en.wikipedia.org/wiki/Currying). ## Table of Contents - [Usage](#usage) - [Using Function Composition](#using-function-composition) ## Usage FP functions
- Lines: 75
- Characters: 2313

---

# Source: .\node_modules\date-fns\docs\gettingStarted.md

- Preview: # Getting Started ## Table of Contents - [Introduction](#introduction) - [Submodules](#submodules) - [Installation](#installation) ## Introduction **date-fns** provides the most comprehensive, yet simple and consistent toolset for manipulating **JavaScript dates** in **a browser** & **Node.js**. **date-fns** is like [lodash](https://lodash.com) for dates. It has [**200+ functions** for all occasio
- Lines: 79
- Characters: 1688

---

# Source: .\node_modules\date-fns\docs\i18n.md

- Preview: # Internationalization ## Table of Contents - [Usage](#usage) - [Adding New Language](#adding-new-language) ## Usage There are just a few functions that support I18n: - [`format`](https://date-fns.org/docs/format) - [`formatDistance`](https://date-fns.org/docs/formatDistance) - [`formatDistanceStrict`](https://date-fns.org/docs/formatDistanceStrict) - [`formatRelative`](https://date-fns.org/docs/f
- Lines: 94
- Characters: 2779

---

# Source: .\node_modules\date-fns\docs\i18nContributionGuide.md

- Preview: # I18n Contribution Guide ## Table of Contents - [Adding a new locale](#adding-a-new-locale) - [Choosing a directory name for a locale](#choosing-a-directory-name-for-a-locale) - [index.js](#index.js) - [localize](#localize) - [localize.ordinalNumber](#localize.ordinalnumber) - [localize.era and using buildLocalizeFn function](#localize.era-and-using-buildlocalizefn-function) - [Formatting localiz
- Lines: 1065
- Characters: 26964

---

# Source: .\node_modules\date-fns\docs\release.md

- Preview: # Releasing date-fns 1. First, make sure that the library is built by running `./scripts/build/build.sh` and committing and pushing any change you would have. 2. Then add the changelog entry generated by `npx tsx scripts/release/buildChangelog.ts` to (CHANGELOG.md)[../CHANGELOG.md]. Make sure that the output is valid Markdown and fix if there're any errors. Commit and push the file. 3. Using the v
- Lines: 22
- Characters: 992

---

# Source: .\node_modules\date-fns\docs\timeZones.md

- Preview: # Time zones Starting from v4, date-fns has first-class support for time zones. It is provided via [`@date-fns/tz`] and [`@date-fns/utc`] packages. Visit the links to learn more about corresponding packages. Just like with everything else in date-fns, the time zones support has a minimal bundle size footprint with `UTCDateMini` and `TZDateMini` being `239 B` and `761 B`, respectively. If you're lo
- Lines: 107
- Characters: 4234

---

# Source: .\node_modules\date-fns\docs\unicodeTokens.md

- Preview: # Unicode Tokens Starting with v2, `format` and `parse` use [Unicode tokens]. The tokens are different from Moment.js and other libraries that opted to use custom formatting rules. While usage of a standard ensures compatibility and the future of the library, it causes confusion that this document intends to resolve. ## Popular mistakes There are 4 tokens that cause most of the confusion: - `D` an
- Lines: 57
- Characters: 1599

---

# Source: .\node_modules\date-fns\docs\webpack.md

- Preview: # webpack ## Removing unused languages from dynamic import If a locale is imported dynamically, then all locales from date-fns are loaded by webpack into a bundle (~160kb) or split across the chunks. This prolongs the build process and increases the amount of space taken. However, it is possible to use webpack to trim down languages using [ContextReplacementPlugin]. Let's assume that we have a sin
- Lines: 56
- Characters: 1477

---

# Source: .\node_modules\date-fns\LICENSE.md

- Preview: MIT License Copyright (c) 2021 Sasha Koss and Lesha Koss https://kossnocorp.mit-license.org Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell co
- Lines: 24
- Characters: 1096

---

# Source: .\node_modules\date-fns\README.md

- Preview: 🔥️ **NEW**: [date-fns v4.0 with first-class time zone support is out!](https://blog.date-fns.org/v40-with-time-zone-support/) <img alt="date-fns" title="date-fns" src="https://raw.githubusercontent.com/date-fns/date-fns/master/docs/logotype.svg" width="150" /> date-fns provides the most comprehensive, yet simple and consistent toolset for manipulating JavaScript dates in a browser & Node.js 👉 [D
- Lines: 61
- Characters: 1728

---

# Source: .\node_modules\date-fns\SECURITY.md

- Preview: # Security Policy ## Supported Versions Security updates are applied only to the latest release. ## Reporting a Vulnerability If you have discovered a security vulnerability in this project, please report it privately. **Do not disclose it as a public issue.** This gives us time to work with you to fix the issue before public exposure, reducing the chance that the exploit will be used before a pat
- Lines: 15
- Characters: 631

---

# Source: .\node_modules\debug\README.md

- Preview: # debug [![OpenCollective](https://opencollective.com/debug/backers/badge.svg)](#backers) [![OpenCollective](https://opencollective.com/debug/sponsors/badge.svg)](#sponsors) <img width="647" src="https://user-images.githubusercontent.com/71256/29091486-fa38524c-7c37-11e7-895f-e7ec8e1039b6.png"> A tiny JavaScript debugging utility modelled after Node.js core's debugging technique. Works in Node.js
- Lines: 484
- Characters: 21628

---

# Source: .\node_modules\decimal.js\LICENCE.md

- Preview: The MIT Licence. Copyright (c) 2025 Michael Mclaughlin Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit p
- Lines: 26
- Characters: 1058

---

# Source: .\node_modules\decimal.js\README.md

- Preview: ![decimal.js](https://raw.githubusercontent.com/MikeMcl/decimal.js/gh-pages/decimaljs.png) An arbitrary-precision Decimal type for JavaScript. [![npm version](https://img.shields.io/npm/v/decimal.js.svg)](https://www.npmjs.com/package/decimal.js) [![npm downloads](https://img.shields.io/npm/dw/decimal.js)](https://www.npmjs.com/package/decimal.js) [![CDNJS](https://img.shields.io/cdnjs/v/decimal.j
- Lines: 249
- Characters: 8082

---

# Source: .\node_modules\decode-named-character-reference\readme.md

- Preview: # decode-named-character-reference [![Build Status][build-badge]][build] [![Coverage Status][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Decode named character references. ## Contents * [What is this?](#what-is-this) * [When should I use this?](#when-should-i-use-this) * [Install](#install) * [Use](#use) * [API](#api) * [`decodeNamedCharacterRe
- Lines: 139
- Characters: 3064

---

# Source: .\node_modules\deep-eql\README.md

- Preview: <h1 align=center> <a href="http://chaijs.com" title="Chai Documentation"> <img alt="deep-eql" src="https://raw.githubusercontent.com/chaijs/deep-eql/main/deep-eql-logo.svg"/> </a> </h1> <p align=center> Improved deep equality testing for <a href="http://nodejs.org/">node</a> and the browser. </p> <p align=center> <a href="https://github.com/chaijs/deep-eql/actions"> <img alt="build:?" src="https:/
- Lines: 96
- Characters: 4111

---

# Source: .\node_modules\deepmerge\changelog.md

- Preview: # [4.3.1](https://github.com/TehShrike/deepmerge/releases/tag/v4.3.1) - Fix type definition for arrayMerge options.  [#239](https://github.com/TehShrike/deepmerge/pull/239) # [4.3.0](https://github.com/TehShrike/deepmerge/releases/tag/v4.3.0) - Avoid thrown errors if the target doesn't have `propertyIsEnumerable`.  [#252](https://github.com/TehShrike/deepmerge/pull/252) # [4.2.2](https://github.co
- Lines: 170
- Characters: 9618

---

# Source: .\node_modules\deepmerge\readme.md

- Preview: # deepmerge Merges the enumerable properties of two or more objects deeply. > UMD bundle is 723B minified+gzipped ## Getting Started ### Example Usage <!--js const merge = require('./') --> ```js const x = { foo: { bar: 3 }, array: [{ does: 'work', too: [ 1, 2, 3 ] }] } const y = { foo: { baz: 4 }, quux: 5, array: [{ does: 'work', too: [ 4, 5, 6 ] }, { really: 'yes' }] } const output = { foo: { ba
- Lines: 267
- Characters: 5418

---

# Source: .\node_modules\define-data-property\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.4](https://github.com/ljharb/define-data-property/compare/v1.1.3...v1.1.4) - 2024-02-13 ### Commits - [Refactor] use `es-define-property` [`90
- Lines: 73
- Characters: 5320

---

# Source: .\node_modules\define-data-property\README.md

- Preview: # define-data-property <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Define a data property on an object. Will fall back to assignment in an engine without descripto
- Lines: 70
- Characters: 2364

---

# Source: .\node_modules\define-lazy-prop\readme.md

- Preview: # define-lazy-prop [![Build Status](https://travis-ci.org/sindresorhus/define-lazy-prop.svg?branch=master)](https://travis-ci.org/sindresorhus/define-lazy-prop) > Define a [lazily evaluated](https://en.wikipedia.org/wiki/Lazy_evaluation) property on an object Useful when the value of a property is expensive to generate, so you want to delay the computation until the property is needed. For example
- Lines: 67
- Characters: 1309

---

# Source: .\node_modules\define-properties\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.2.1](https://github.com/ljharb/define-properties/compare/v1.2.0...v1.2.1) - 2023-09-12 ### Commits - [Refactor] use `define-data-property` [`e77
- Lines: 94
- Characters: 4108

---

# Source: .\node_modules\define-properties\README.md

- Preview: # define-properties <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] D
- Lines: 87
- Characters: 2740

---

# Source: .\node_modules\delayed-stream\Readme.md

- Preview: # delayed-stream Buffers events from a stream until you are ready to handle them. ## Installation ``` bash npm install delayed-stream ``` ## Usage The following example shows how to write a http echo server that delays its response by 1000 ms. ``` javascript var DelayedStream = require('delayed-stream'); var http = require('http'); http.createServer(function(req, res) { var delayed = DelayedStream
- Lines: 144
- Characters: 3730

---

# Source: .\node_modules\depd\History.md

- Preview: 2.0.0 / 2018-10-26 ================== * Drop support for Node.js 0.6 * Replace internal `eval` usage with `Function` constructor * Use instance methods on `process` to check for listeners 1.1.2 / 2018-01-11 ================== * perf: remove argument reassignment * Support Node.js 0.6 to 9.x 1.1.1 / 2017-07-27 ================== * Remove unnecessary `Buffer` loading * Support Node.js 0.6 to 8.x 1.1
- Lines: 106
- Characters: 2153

---

# Source: .\node_modules\depd\Readme.md

- Preview: # depd [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Node.js Version][node-image]][node-url] [![Linux Build][travis-image]][travis-url] [![Windows Build][appveyor-image]][appveyor-url] [![Coverage Status][coveralls-image]][coveralls-url] Deprecate all the things > With great modules comes great responsibility; mark things deprecated! ## Install Th
- Lines: 283
- Characters: 9682

---

# Source: .\node_modules\dequal\readme.md

- Preview: # dequal [![CI](https://github.com/lukeed/dequal/workflows/CI/badge.svg)](https://github.com/lukeed/dequal/actions) > A tiny (304B to 489B) utility to check for deep equality This module supports comparison of all types, including `Function`, `RegExp`, `Date`, `Set`, `Map`, `TypedArray`s, `DataView`, `null`, `undefined`, and `NaN` values. Complex values (eg, Objects, Arrays, Sets, Maps, etc) are t
- Lines: 115
- Characters: 4334

---

# Source: .\node_modules\destr\README.md

- Preview: # destr [![npm version][npm-version-src]][npm-version-href] [![npm downloads][npm-downloads-src]][npm-downloads-href] [![bundle][bundle-src]][bundle-href] [![License][license-src]][license-href] A faster, secure and convenient alternative for [`JSON.parse`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse). ## Usage ### Node.js Install dependency: ```bash
- Lines: 135
- Characters: 3146

---

# Source: .\node_modules\detect-node-es\Readme.md

- Preview: ## detect-node > This is a fork of `detect-node`. Differences: - uses named export {isNode} - has d.ts integrated - supports ESM ### Install ```shell npm install --save detect-node-es ``` ### Usage: ```diff -var isNode = require('detect-node'); +var {isNode} = require('detect-node-es'); if (isNode) { console.log("Running under Node.JS"); } else { alert("Hello from browser (or whatever not-a-node e
- Lines: 42
- Characters: 832

---

# Source: .\node_modules\devlop\readme.md

- Preview: # devlop [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Some tools to make developing easier while not including code in production. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`deprecat
- Lines: 363
- Characters: 9699

---

# Source: .\node_modules\didyoumean\README.md

- Preview: didYouMean.js - A simple JavaScript matching engine =================================================== [Available on GitHub](https://github.com/dcporter/didyoumean.js). A super-simple, highly optimized JS library for matching human-quality input to a list of potential matches. You can use it to suggest a misspelled command-line utility option to a user, or to offer links to nearby valid URLs on y
- Lines: 137
- Characters: 4377

---

# Source: .\node_modules\dlv\README.md

- Preview: # `dlv(obj, keypath)` [![NPM](https://img.shields.io/npm/v/dlv.svg)](https://npmjs.com/package/dlv) [![Build](https://travis-ci.org/developit/dlv.svg?branch=master)](https://travis-ci.org/developit/dlv) > Safely get a dot-notated path within a nested object, with ability to return a default if the full key path does not exist or the value is undefined ### Why? Smallest possible implementation: onl
- Lines: 79
- Characters: 1944

---

# Source: .\node_modules\doctrine\CHANGELOG.md

- Preview: v3.0.0 - November 9, 2018 * 0b5a8c7 Breaking: drop support for Node < 6 (#223) (Kai Cataldo) * a05e9f2 Upgrade: eslint-release@1.0.0 (#220) (Teddy Katz) * 36ed027 Chore: upgrade coveralls to ^3.0.1 (#213) (Teddy Katz) * 8667e34 Upgrade: eslint-release@^0.11.1 (#210) (Kevin Partington) v2.1.0 - January 6, 2018 * 827f314 Update: support node ranges (fixes #89) (#190) (Teddy Katz) v2.0.2 - November 2
- Lines: 104
- Characters: 4230

---

# Source: .\node_modules\doctrine\README.md

- Preview: [![NPM version][npm-image]][npm-url] [![build status][travis-image]][travis-url] [![Test coverage][coveralls-image]][coveralls-url] [![Downloads][downloads-image]][downloads-url] [![Join the chat at https://gitter.im/eslint/doctrine](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/eslint/doctrine?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) # Doctrine Doc
- Lines: 168
- Characters: 6450

---

# Source: .\node_modules\dom-accessibility-api\LICENSE.md

- Preview: MIT License Copyright (c) 2020 Sebastian Silbermann Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit pers
- Lines: 24
- Characters: 1056

---

# Source: .\node_modules\dom-accessibility-api\README.md

- Preview: # dom-accessibility-api [![npm version](https://badge.fury.io/js/dom-accessibility-api.svg)](https://badge.fury.io/js/dom-accessibility-api) [![Build Status](https://dev.azure.com/silbermannsebastian/dom-accessibility-api/_apis/build/status/eps1lon.dom-accessibility-api?branchName=main)](https://dev.azure.com/silbermannsebastian/dom-accessibility-api/_build/latest?definitionId=6&branchName=main) !
- Lines: 225
- Characters: 8978

---

# Source: .\node_modules\domelementtype\readme.md

- Preview: All the types of nodes in htmlparser2's DOM.
- Lines: 4
- Characters: 44

---

# Source: .\node_modules\domhandler\readme.md

- Preview: # domhandler [![Build Status](https://travis-ci.com/fb55/domhandler.svg?branch=master)](https://travis-ci.com/fb55/domhandler) The DOM handler creates a tree containing all nodes of a page. The tree can be manipulated using the [domutils](https://github.com/fb55/domutils) or [cheerio](https://github.com/cheeriojs/cheerio) libraries and rendered using [dom-serializer](https://github.com/cheeriojs/d
- Lines: 94
- Characters: 2684

---

# Source: .\node_modules\dompurify\README.md

- Preview: # DOMPurify [![npm](https://badge.fury.io/js/dompurify.svg)](http://badge.fury.io/js/dompurify) ![Tests](https://github.com/cure53/DOMPurify/workflows/Build%20and%20Test/badge.svg) [![Downloads](https://img.shields.io/npm/dm/dompurify.svg)](https://www.npmjs.com/package/dompurify) ![npm package minimized gzipped size (select exports)](https://img.shields.io/bundlejs/size/dompurify?color=%233C1&lab
- Lines: 479
- Characters: 28328

---

# Source: .\node_modules\dom-serializer\README.md

- Preview: # dom-serializer [![Build Status](https://travis-ci.com/cheeriojs/dom-serializer.svg?branch=master)](https://travis-ci.com/cheeriojs/dom-serializer) Renders a [domhandler](https://github.com/fb55/domhandler) DOM node or an array of domhandler DOM nodes to a string. ```js import render from "dom-serializer"; // OR const render = require("dom-serializer").default; ``` # API ## `render` ▸ **render**(
- Lines: 106
- Characters: 3319

---

# Source: .\node_modules\domutils\readme.md

- Preview: # domutils [![Node.js CI](https://github.com/fb55/domutils/actions/workflows/nodejs-test.yml/badge.svg)](https://github.com/fb55/domutils/actions/workflows/nodejs-test.yml) Utilities for working with [htmlparser2](https://github.com/fb55/htmlparser2)'s DOM. All functions are exported as a single module. Look [through the docs](https://domutils.js.org/modules.html) to see what is available. ## Ecos
- Lines: 33
- Characters: 2133

---

# Source: .\node_modules\dotenv\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines. ## [Unreleased](https://github.com/motdotla/dotenv/compare/v16.6.1...master) ## [16.6.1](https://github.com/motdotla/dotenv/compare/v16.6.0...v16.6.1) (2025-06-27) ### Changed - Default `quiet` to true – hiding th
- Lines: 523
- Characters: 17793

---

# Source: .\node_modules\dotenv\README.md

- Preview: <div align="center"> 🎉 announcing <a href="https://github.com/dotenvx/dotenvx">dotenvx</a>. <em>run anywhere, multi-environment, encrypted envs</em>. </div> &nbsp; <div align="center"> **Special thanks to [our sponsors](https://github.com/sponsors/motdotla)** <br> <a href="https://graphite.dev/?utm_source=github&utm_medium=repo&utm_campaign=dotenv"><img src="https://res.cloudinary.com/dotenv-org/
- Lines: 648
- Characters: 21777

---

# Source: .\node_modules\dotenv\README-es.md

- Preview: <div align="center"> 🎉 announcing <a href="https://github.com/dotenvx/dotenvx">dotenvx</a>. <em>run anywhere, multi-environment, encrypted envs</em>. </div> &nbsp; <div align="center"> <p> <sup> <a href="https://github.com/sponsors/motdotla">Dotenv es apoyado por la comunidad.</a> </sup> </p> <sup>Gracias espaciales a:</sup> <br> <br> <a href="https://graphite.dev/?utm_source=github&utm_medium=re
- Lines: 414
- Characters: 15049

---

# Source: .\node_modules\dotenv\SECURITY.md

- Preview: Please report any security vulnerabilities to security@dotenvx.com.
- Lines: 4
- Characters: 68

---

# Source: .\node_modules\download-stats\README.md

- Preview: # download-stats [![NPM version](https://img.shields.io/npm/v/download-stats.svg?style=flat)](https://www.npmjs.com/package/download-stats) [![NPM downloads](https://img.shields.io/npm/dm/download-stats.svg?style=flat)](https://npmjs.org/package/download-stats) [![Linux Build Status](https://img.shields.io/travis/doowb/download-stats.svg?style=flat&label=Travis)](https://travis-ci.org/doowb/downlo
- Lines: 398
- Characters: 10621

---

# Source: .\node_modules\dunder-proto\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.1](https://github.com/es-shims/dunder-proto/compare/v1.0.0...v1.0.1) - 2024-12-16 ### Commits - [Fix] do not crash when `--disable-proto=throw
- Lines: 27
- Characters: 1523

---

# Source: .\node_modules\dunder-proto\README.md

- Preview: # dunder-proto <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] If available, the `Object.prototype.__proto__` accessor and mutator, call-bound. ## Getting started ```s
- Lines: 57
- Characters: 1853

---

# Source: .\node_modules\eastasianwidth\README.md

- Preview: # East Asian Width Get [East Asian Width](http://www.unicode.org/reports/tr11/) from a character. 'F'(Fullwidth), 'H'(Halfwidth), 'W'(Wide), 'Na'(Narrow), 'A'(Ambiguous) or 'N'(Natural). Original Code is [東アジアの文字幅 (East Asian Width) の判定 - 中途](http://d.hatena.ne.jp/takenspc/20111126#1322252878). ## Install $ npm install eastasianwidth ## Usage var eaw = require('eastasianwidth'); console.log(eaw.ea
- Lines: 35
- Characters: 1076

---

# Source: .\node_modules\ecdsa-sig-formatter\README.md

- Preview: # ecdsa-sig-formatter [![Build Status](https://travis-ci.org/Brightspace/node-ecdsa-sig-formatter.svg?branch=master)](https://travis-ci.org/Brightspace/node-ecdsa-sig-formatter) [![Coverage Status](https://coveralls.io/repos/Brightspace/node-ecdsa-sig-formatter/badge.svg)](https://coveralls.io/r/Brightspace/node-ecdsa-sig-formatter) Translate between JOSE and ASN.1/DER encodings for ECDSA signatur
- Lines: 66
- Characters: 1801

---

# Source: .\node_modules\ee-first\README.md

- Preview: # EE First [![NPM version][npm-image]][npm-url] [![Build status][travis-image]][travis-url] [![Test coverage][coveralls-image]][coveralls-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![Gittip][gittip-image]][gittip-url] Get the first event in a set of event emitters and event pairs, then clean up after itself. ## Install ```sh $ npm install ee-first
- Lines: 83
- Characters: 2537

---

# Source: .\node_modules\electron-to-chromium\README.md

- Preview: ### Made by [@kilianvalkhof](https://twitter.com/kilianvalkhof) #### Other projects: - 💻 [Polypane](https://polypane.app) - Develop responsive websites and apps twice as fast on multiple screens at once - 🖌️ [Superposition](https://superposition.design) - Kickstart your design system by extracting design tokens from your website - 🗒️ [FromScratch](https://fromscratch.rocks) - A smart but simple
- Lines: 188
- Characters: 6261

---

# Source: .\node_modules\emoji-mart\README.md

- Preview: <div align="center"> <br><b>Emoji Mart</b> is a customizable<br>emoji picker HTML component for the web <br><a href="https://missiveapp.com/open/emoji-mart">Demo</a> <br><br><a href="https://missiveapp.com/open/emoji-mart"><img width="639" alt="EmojiMart" src="https://user-images.githubusercontent.com/436043/163686169-766ef715-89b5-4ada-88d7-672623713bc0.png"></a> <br><br><a title="Team email, tea
- Lines: 297
- Characters: 12741

---

# Source: .\node_modules\emoji-regex\README.md

- Preview: # emoji-regex [![Build status](https://travis-ci.org/mathiasbynens/emoji-regex.svg?branch=main)](https://travis-ci.org/mathiasbynens/emoji-regex) _emoji-regex_ offers a regular expression to match all emoji symbols and sequences (including textual representations of emoji) as per the Unicode Standard. This repository contains a script that generates this regular expression based on [Unicode data](
- Lines: 140
- Characters: 4318

---

# Source: .\node_modules\encodeurl\README.md

- Preview: # Encode URL Encode a URL to a percent-encoded form, excluding already-encoded sequences. ## Installation ```sh npm install encodeurl ``` ## API ```js var encodeUrl = require('encodeurl') ``` ### encodeUrl(url) Encode a URL to a percent-encoded form, excluding already-encoded sequences. This function accepts a URL and encodes all the non-URL code points (as UTF-8 byte sequences). It will not encod
- Lines: 112
- Characters: 3112

---

# Source: .\node_modules\encoding-sniffer\README.md

- Preview: # encoding-sniffer [![Node.js CI](https://github.com/fb55/encoding-sniffer/actions/workflows/nodejs-test.yml/badge.svg)](https://github.com/fb55/encoding-sniffer/actions/workflows/nodejs-test.yml) An implementation of the HTML encoding sniffer algo, with stream support. This module wraps around [iconv-lite](https://github.com/ashtuchkin/iconv-lite) to make decoding buffers and streams incredibly e
- Lines: 71
- Characters: 1975

---

# Source: .\node_modules\entities\readme.md

- Preview: # entities [![NPM version](https://img.shields.io/npm/v/entities.svg)](https://npmjs.org/package/entities) [![Downloads](https://img.shields.io/npm/dm/entities.svg)](https://npmjs.org/package/entities) [![Node.js CI](https://github.com/fb55/entities/actions/workflows/nodejs-test.yml/badge.svg)](https://github.com/fb55/entities/actions/workflows/nodejs-test.yml) Encode & decode HTML & XML entities
- Lines: 122
- Characters: 4921

---

# Source: .\node_modules\error-ex\README.md

- Preview: # node-error-ex [![Travis-CI.org Build Status](https://img.shields.io/travis/Qix-/node-error-ex.svg?style=flat-square)](https://travis-ci.org/Qix-/node-error-ex) [![Coveralls.io Coverage Rating](https://img.shields.io/coveralls/Qix-/node-error-ex.svg?style=flat-square)](https://coveralls.io/r/Qix-/node-error-ex) > Easily subclass and customize new Error types ## Examples To include in your project
- Lines: 147
- Characters: 4000

---

# Source: .\node_modules\es-abstract\CHANGELOG.md

- Preview: 1.24.0 / 2025-05-28 ================= - [New] add `ES2025` (#159) - [New] `ES2023`+: add `GetNamedTimeZoneEpochNanoseconds`, `GetUTCEpochNanoseconds`, `IsTimeZoneOffsetString` - [New] `ES2015`+: `CharacterRange`: also accept CharSets - [New] `ES2024`+: add `AllCharacters`, `CharacterComplement` - [Refactor] StringIndexOf: anticipate ES2025 not found sentinel change - [Deps] update `stop-iteration-
- Lines: 960
- Characters: 47675

---

# Source: .\node_modules\es-abstract\README.md

- Preview: # es-abstract <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] ECMAScript spec abstract operations. Every operation is available by edition/year and by name - f
- Lines: 46
- Characters: 1894

---

# Source: .\node_modules\esbuild\LICENSE.md

- Preview: MIT License Copyright (c) 2020 Evan Wallace Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\esbuild\README.md

- Preview: # esbuild This is a JavaScript bundler and minifier. See https://github.com/evanw/esbuild and the [JavaScript API documentation](https://esbuild.github.io/api/) for details.
- Lines: 6
- Characters: 172

---

# Source: .\node_modules\esbuild-register\README.md

- Preview: # esbuild-register [![npm version](https://badgen.net/npm/v/esbuild-register)](https://npm.im/esbuild-register) [![npm downloads](https://badgen.net/npm/dm/esbuild-register)](https://npm.im/esbuild-register) ## Install ```bash npm i esbuild esbuild-register -D # Or Yarn yarn add esbuild esbuild-register --dev # Or pnpm pnpm add esbuild esbuild-register -D ``` ## Usage ```bash node -r esbuild-regis
- Lines: 53
- Characters: 1088

---

# Source: .\node_modules\escalade\readme.md

- Preview: # escalade [![CI](https://github.com/lukeed/escalade/workflows/CI/badge.svg)](https://github.com/lukeed/escalade/actions) [![licenses](https://licenses.dev/b/npm/escalade)](https://licenses.dev/npm/escalade) [![codecov](https://badgen.now.sh/codecov/c/github/lukeed/escalade)](https://codecov.io/gh/lukeed/escalade) > A tiny (183B to 210B) and [fast](#benchmarks) utility to ascend parent directories
- Lines: 212
- Characters: 6707

---

# Source: .\node_modules\escape-html\Readme.md

- Preview: # escape-html Escape string for use in HTML ## Example ```js var escape = require('escape-html'); var html = escape('foo & bar'); // -> foo &amp; bar ``` ## Benchmark ``` $ npm run-script bench > escape-html@1.0.3 bench nodejs-escape-html > node benchmark/index.js http_parser@1.0 node@0.10.33 v8@3.14.5.9 ares@1.9.0-DEV uv@0.10.29 zlib@1.2.3 modules@11 openssl@1.0.1j 1 test completed. 2 tests compl
- Lines: 46
- Characters: 662

---

# Source: .\node_modules\escape-string-regexp\readme.md

- Preview: # escape-string-regexp [![Build Status](https://travis-ci.org/sindresorhus/escape-string-regexp.svg?branch=master)](https://travis-ci.org/sindresorhus/escape-string-regexp) > Escape RegExp special characters ## Install ``` $ npm install escape-string-regexp ``` ## Usage ```js const escapeStringRegexp = require('escape-string-regexp'); const escapedString = escapeStringRegexp('How much $ for a 🦄?'
- Lines: 36
- Characters: 1018

---

# Source: .\node_modules\es-define-property\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.1](https://github.com/ljharb/es-define-property/compare/v1.0.0...v1.0.1) - 2024-12-06 ### Commits - [types] use shared tsconfig [`954a663`](ht
- Lines: 32
- Characters: 2267

---

# Source: .\node_modules\es-define-property\README.md

- Preview: # es-define-property <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] `Object.defineProperty`, but not IE 8's broken one. ## Example ```js const assert = require('asser
- Lines: 52
- Characters: 2007

---

# Source: .\node_modules\es-errors\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.3.0](https://github.com/ljharb/es-errors/compare/v1.2.1...v1.3.0) - 2024-02-05 ### Commits - [New] add `EvalError` and `URIError` [`1927627`](ht
- Lines: 43
- Characters: 1793

---

# Source: .\node_modules\es-errors\README.md

- Preview: # es-errors <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] A simple cache for a few of the JS Error constructors. ## Example ```js const assert = require('assert'); c
- Lines: 58
- Characters: 2059

---

# Source: .\node_modules\eslint\node_modules\find-up\readme.md

- Preview: # find-up [![Build Status](https://travis-ci.com/sindresorhus/find-up.svg?branch=master)](https://travis-ci.com/github/sindresorhus/find-up) > Find a file or directory by walking up parent directories ## Install ``` $ npm install find-up ``` ## Usage ``` / └── Users └── sindresorhus ├── unicorn.png └── foo └── bar ├── baz └── example.js ``` `example.js` ```js const path = require('path'); const fi
- Lines: 153
- Characters: 3829

---

# Source: .\node_modules\eslint\node_modules\locate-path\readme.md

- Preview: # locate-path [![Build Status](https://travis-ci.com/sindresorhus/locate-path.svg?branch=master)](https://travis-ci.com/github/sindresorhus/locate-path) > Get the first path that exists on disk of multiple paths ## Install ``` $ npm install locate-path ``` ## Usage Here we find the first file that exists on disk, in array order. ```js const locatePath = require('locate-path'); const files = [ 'uni
- Lines: 127
- Characters: 2077

---

# Source: .\node_modules\eslint\node_modules\path-exists\readme.md

- Preview: # path-exists [![Build Status](https://travis-ci.org/sindresorhus/path-exists.svg?branch=master)](https://travis-ci.org/sindresorhus/path-exists) > Check if a path exists NOTE: `fs.existsSync` has been un-deprecated in Node.js since 6.8.0. If you only need to check synchronously, this module is not needed. While [`fs.exists()`](https://nodejs.org/api/fs.html#fs_fs_exists_path_callback) is being [d
- Lines: 55
- Characters: 1374

---

# Source: .\node_modules\eslint\node_modules\p-limit\readme.md

- Preview: # p-limit > Run multiple promise-returning & async functions with limited concurrency ## Install ``` $ npm install p-limit ``` ## Usage ```js const pLimit = require('p-limit'); const limit = pLimit(1); const input = [ limit(() => fetchSomething('foo')), limit(() => fetchSomething('bar')), limit(() => doSomething()) ]; (async () => { // Only one promise is run at once const result = await Promise.a
- Lines: 103
- Characters: 2664

---

# Source: .\node_modules\eslint\node_modules\p-locate\readme.md

- Preview: # p-locate [![Build Status](https://travis-ci.com/sindresorhus/p-locate.svg?branch=master)](https://travis-ci.com/github/sindresorhus/p-locate) > Get the first fulfilled promise that satisfies the provided testing function Think of it like an async version of [`Array#find`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/find). ## Install ``` $ npm install p-loc
- Lines: 95
- Characters: 2459

---

# Source: .\node_modules\eslint\node_modules\yocto-queue\readme.md

- Preview: # yocto-queue [![](https://badgen.net/bundlephobia/minzip/yocto-queue)](https://bundlephobia.com/result?p=yocto-queue) > Tiny queue data structure You should use this package instead of an array if you do a lot of `Array#push()` and `Array#shift()` on large arrays, since `Array#shift()` has [linear time complexity](https://medium.com/@ariel.salem1989/an-easy-to-use-guide-to-big-o-time-complexity-5
- Lines: 67
- Characters: 2010

---

# Source: .\node_modules\eslint\README.md

- Preview: [![npm version](https://img.shields.io/npm/v/eslint.svg)](https://www.npmjs.com/package/eslint) [![Downloads](https://img.shields.io/npm/dm/eslint.svg)](https://www.npmjs.com/package/eslint) [![Build Status](https://github.com/eslint/eslint/workflows/CI/badge.svg)](https://github.com/eslint/eslint/actions) <br> [![Open Collective Backers](https://img.shields.io/opencollective/backers/eslint)](http
- Lines: 347
- Characters: 19230

---

# Source: .\node_modules\eslint-plugin-react-hooks\README.md

- Preview: # `eslint-plugin-react-hooks` This ESLint plugin enforces the [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks). It is a part of the [Hooks API](https://react.dev/reference/react/hooks) for React. ## Installation **Note: If you're using Create React App, please use `react-scripts` >= 3 instead of adding it directly.** Assuming you already have ESLint installed, run: ```sh # npm np
- Lines: 112
- Characters: 2543

---

# Source: .\node_modules\eslint-plugin-react-refresh\README.md

- Preview: # eslint-plugin-react-refresh [![npm](https://img.shields.io/npm/v/eslint-plugin-react-refresh)](https://www.npmjs.com/package/eslint-plugin-react-refresh) Validate that your components can safely be updated with Fast Refresh. ## Explainer "Fast Refresh", also known as "hot reloading", is a feature in many modern bundlers. If you update some React component(s) on disk, then the bundler will know t
- Lines: 236
- Characters: 5520

---

# Source: .\node_modules\eslint-plugin-storybook\README.md

- Preview: <p align="center"> <a href="https://storybook.js.org/?ref=readme"> <img src="https://user-images.githubusercontent.com/321738/63501763-88dbf600-c4cc-11e9-96cd-94adadc2fd72.png" alt="Storybook" width="400" /> </a> </p> <p align="center">Build bulletproof UI components faster</p> <br/> <p align="center"> <a href="https://discord.gg/storybook"> <img src="https://img.shields.io/badge/discord-join-7289
- Lines: 216
- Characters: 11984

---

# Source: .\node_modules\eslint-scope\README.md

- Preview: [![npm version](https://img.shields.io/npm/v/eslint-scope.svg)](https://www.npmjs.com/package/eslint-scope) [![Downloads](https://img.shields.io/npm/dm/eslint-scope.svg)](https://www.npmjs.com/package/eslint-scope) [![Build Status](https://github.com/eslint/js/workflows/CI/badge.svg)](https://github.com/eslint/js/actions) # ESLint Scope ESLint Scope is the [ECMAScript](http://www.ecma-internationa
- Lines: 201
- Characters: 11414

---

# Source: .\node_modules\eslint-visitor-keys\README.md

- Preview: # eslint-visitor-keys [![npm version](https://img.shields.io/npm/v/eslint-visitor-keys.svg)](https://www.npmjs.com/package/eslint-visitor-keys) [![Downloads/month](https://img.shields.io/npm/dm/eslint-visitor-keys.svg)](http://www.npmtrends.com/eslint-visitor-keys) [![Build Status](https://github.com/eslint/js/workflows/CI/badge.svg)](https://github.com/eslint/js/actions) Constants and utilities a
- Lines: 124
- Characters: 6625

---

# Source: .\node_modules\es-module-lexer\README.md

- Preview: # ES Module Lexer [![Build Status][actions-image]][actions-url] A JS module syntax lexer used in [es-module-shims](https://github.com/guybedford/es-module-shims). Outputs the list of exports and locations of import specifiers, including dynamic import and import meta handling. Supports new syntax features including import attributes and source phase imports. A very small single JS file (4KiB gzipp
- Lines: 341
- Characters: 9364

---

# Source: .\node_modules\es-object-atoms\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.1](https://github.com/ljharb/es-object-atoms/compare/v1.1.0...v1.1.1) - 2025-01-14 ### Commits - [types] `ToObject`: improve types [`cfe8c8a`]
- Lines: 40
- Characters: 2099

---

# Source: .\node_modules\es-object-atoms\README.md

- Preview: # es-object-atoms <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] ES Object-related atoms: Object, ToObject, RequireObjectCoercible. ## Example ```js const assert = re
- Lines: 66
- Characters: 2540

---

# Source: .\node_modules\espree\README.md

- Preview: [![npm version](https://img.shields.io/npm/v/espree.svg)](https://www.npmjs.com/package/espree) [![npm downloads](https://img.shields.io/npm/dm/espree.svg)](https://www.npmjs.com/package/espree) [![Build Status](https://github.com/eslint/js/workflows/CI/badge.svg)](https://github.com/js/espree/actions) [![Bountysource](https://www.bountysource.com/badge/tracker?tracker_id=9348450)](https://www.bou
- Lines: 265
- Characters: 13994

---

# Source: .\node_modules\esprima\README.md

- Preview: [![NPM version](https://img.shields.io/npm/v/esprima.svg)](https://www.npmjs.com/package/esprima) [![npm download](https://img.shields.io/npm/dm/esprima.svg)](https://www.npmjs.com/package/esprima) [![Build Status](https://img.shields.io/travis/jquery/esprima/master.svg)](https://travis-ci.org/jquery/esprima) [![Coverage Status](https://img.shields.io/codecov/c/github/jquery/esprima/master.svg)](h
- Lines: 49
- Characters: 2382

---

# Source: .\node_modules\esquery\README.md

- Preview: ESQuery is a library for querying the AST output by Esprima for patterns of syntax using a CSS style selector system. Check out the demo: [demo](https://estools.github.io/esquery/) The following selectors are supported: * AST node type: `ForStatement` * [wildcard](http://dev.w3.org/csswg/selectors4/#universal-selector): `*` * [attribute existence](http://dev.w3.org/csswg/selectors4/#attribute-sele
- Lines: 30
- Characters: 2160

---

# Source: .\node_modules\esrecurse\README.md

- Preview: ### Esrecurse [![Build Status](https://travis-ci.org/estools/esrecurse.svg?branch=master)](https://travis-ci.org/estools/esrecurse) Esrecurse ([esrecurse](https://github.com/estools/esrecurse)) is [ECMAScript](https://www.ecma-international.org/publications/standards/Ecma-262.htm) recursive traversing functionality. ### Example Usage The following code will output all variables declared at the roo
- Lines: 174
- Characters: 4931

---

# Source: .\node_modules\es-set-tostringtag\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v2.1.0](https://github.com/es-shims/es-set-tostringtag/compare/v2.0.3...v2.1.0) - 2025-01-01 ### Commits - [actions] split out node 10-20, and 20+
- Lines: 70
- Characters: 4901

---

# Source: .\node_modules\es-set-tostringtag\README.md

- Preview: # es-set-tostringtag <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] A helper to optimistically set Symbol.toStringTag, when possible. ## Example Most common usage: ``
- Lines: 56
- Characters: 2180

---

# Source: .\node_modules\es-shim-unscopables\CHANGELOG.md

- Preview: ### Changelog All notable changes to this project will be documented in this file. Dates are displayed in UTC. Generated by [`auto-changelog`](https://github.com/CookPete/auto-changelog). #### [v1.1.0](https://github.com/ljharb/es-shim-unscopables/compare/v1.0.2...v1.1.0) > 11 February 2025 - [New] add types [`2b94d6d`](https://github.com/ljharb/es-shim-unscopables/commit/2b94d6da58c272944de33f7e5
- Lines: 38
- Characters: 2017

---

# Source: .\node_modules\es-shim-unscopables\README.md

- Preview: # es-shim-unscopables <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url]
- Lines: 60
- Characters: 2193

---

# Source: .\node_modules\es-to-primitive\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.3.0](https://github.com/ljharb/es-to-primitive/compare/v1.2.1...v1.3.0) - 2024-11-26 ### Commits - [actions] reuse common workflows [`bb72efc`](
- Lines: 104
- Characters: 8604

---

# Source: .\node_modules\es-to-primitive\README.md

- Preview: # es-to-primitive <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] ECM
- Lines: 55
- Characters: 2217

---

# Source: .\node_modules\estraverse\README.md

- Preview: ### Estraverse [![Build Status](https://secure.travis-ci.org/estools/estraverse.svg)](http://travis-ci.org/estools/estraverse) Estraverse ([estraverse](http://github.com/estools/estraverse)) is [ECMAScript](http://www.ecma-international.org/publications/standards/Ecma-262.htm) traversal functions from [esmangle project](http://github.com/estools/esmangle). ### Documentation You can find usage docs
- Lines: 156
- Characters: 4712

---

# Source: .\node_modules\estree-util-is-identifier-name\readme.md

- Preview: # estree-util-is-identifier-name [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [estree][] utility to check if something can be an identifier. ## Contents *   [What is this?](#what-is-this) *   [
- Lines: 228
- Characters: 5419

---

# Source: .\node_modules\estree-walker\CHANGELOG.md

- Preview: # changelog ## 2.0.2 * Internal tidying up (change test runner, convert to JS) ## 2.0.1 * Robustify `this.remove()`, pass current index to walker functions ([#18](https://github.com/Rich-Harris/estree-walker/pull/18)) ## 2.0.0 * Add an `asyncWalk` export ([#20](https://github.com/Rich-Harris/estree-walker/pull/20)) * Internal rewrite ## 1.0.1 * Relax node type to `BaseNode` ([#17](https://github.c
- Lines: 95
- Characters: 1455

---

# Source: .\node_modules\estree-walker\README.md

- Preview: # estree-walker Simple utility for walking an [ESTree](https://github.com/estree/estree)-compliant AST, such as one generated by [acorn](https://github.com/marijnh/acorn). ## Installation ```bash npm i estree-walker ``` ## Usage ```js var walk = require( 'estree-walker' ).walk; var acorn = require( 'acorn' ); ast = acorn.parse( sourceCode, options ); // https://github.com/acornjs/acorn walk( ast,
- Lines: 51
- Characters: 1575

---

# Source: .\node_modules\esutils\README.md

- Preview: ### esutils [![Build Status](https://secure.travis-ci.org/estools/esutils.svg)](http://travis-ci.org/estools/esutils) esutils ([esutils](http://github.com/estools/esutils)) is utility box for ECMAScript language tools. ### API ### ast #### ast.isExpression(node) Returns true if `node` is an Expression as defined in ECMA262 edition 5.1 section [11](https://es5.github.io/#x11). #### ast.isStatement(
- Lines: 177
- Characters: 6654

---

# Source: .\node_modules\etag\HISTORY.md

- Preview: 1.8.1 / 2017-09-12 ================== * perf: replace regular expression with substring 1.8.0 / 2017-02-18 ================== * Use SHA1 instead of MD5 for ETag hashing - Improves performance for larger entities - Works with FIPS 140-2 OpenSSL configuration 1.7.0 / 2015-06-08 ================== * Always include entity length in ETags for hash length extensions * Generate non-Stats ETags using MD5
- Lines: 86
- Characters: 1649

---

# Source: .\node_modules\etag\README.md

- Preview: # etag [![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url] [![Node.js Version][node-version-image]][node-version-url] [![Build Status][travis-image]][travis-url] [![Test Coverage][coveralls-image]][coveralls-url] Create simple HTTP ETags This module generates HTTP ETags (as defined in RFC 7232) for use in HTTP responses. ## Installation This is a [Node.js](https
- Lines: 162
- Characters: 4015

---

# Source: .\node_modules\eventemitter3\README.md

- Preview: # EventEmitter3 [![Version npm](https://img.shields.io/npm/v/eventemitter3.svg?style=flat-square)](https://www.npmjs.com/package/eventemitter3)[![CI](https://img.shields.io/github/actions/workflow/status/primus/eventemitter3/ci.yml?branch=master&label=CI&style=flat-square)](https://github.com/primus/eventemitter3/actions?query=workflow%3ACI+branch%3Amaster)[![Coverage Status](https://img.shields.i
- Lines: 97
- Characters: 3336

---

# Source: .\node_modules\eventsource\README.md

- Preview: # eventsource [![npm version](https://img.shields.io/npm/v/eventsource.svg?style=flat-square)](https://www.npmjs.com/package/eventsource)[![npm bundle size](https://img.shields.io/bundlephobia/minzip/eventsource?style=flat-square)](https://bundlephobia.com/result?p=eventsource)[![npm weekly downloads](https://img.shields.io/npm/dw/eventsource.svg?style=flat-square)](https://www.npmjs.com/package/e
- Lines: 170
- Characters: 5017

---

# Source: .\node_modules\eventsource-parser\README.md

- Preview: # eventsource-parser [![npm version](https://img.shields.io/npm/v/eventsource-parser.svg?style=flat-square)](https://www.npmjs.com/package/eventsource-parser)[![npm bundle size](https://img.shields.io/bundlephobia/minzip/eventsource-parser?style=flat-square)](https://bundlephobia.com/result?p=eventsource-parser)[![npm weekly downloads](https://img.shields.io/npm/dw/eventsource-parser.svg?style=fla
- Lines: 129
- Characters: 4890

---

# Source: .\node_modules\event-source-plus\README.md

- Preview: # Event Source Plus A more configurable EventSource implementation that runs in browsers, NodeJS, and workers. The default browser [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) is too limited. Event Source Plus fixes that. ## Features - Use any HTTP method - Send custom headers - Optionally change headers when retrying - Pass data as body or query params - Runs in
- Lines: 408
- Characters: 11194

---

# Source: .\node_modules\expect-type\README.md

- Preview: # expect-type [![CI](https://github.com/mmkal/expect-type/actions/workflows/ci.yml/badge.svg)](https://github.com/mmkal/expect-type/actions/workflows/ci.yml) ![npm](https://img.shields.io/npm/dt/expect-type) [![X (formerly Twitter) Follow](https://img.shields.io/twitter/follow/mmkal)](https://x.com/mmkalmmkal) Compile-time tests for types. Useful to make sure types don't regress into being overly
- Lines: 928
- Characters: 34413

---

# Source: .\node_modules\expect-type\SECURITY.md

- Preview: # Security Policy ## Supported Versions Version 1.0.0 will be supported with security updates. | Version | Supported          | | ------- | ------------------ | | 1.x.x   | :white_check_mark: | | < 1.0   | :x:                | ## Reporting a Vulnerability To report a security vulnerability, please use the [Tidelift security contact](https://tidelift.com/security). Tidelift will coordinate the fix
- Lines: 17
- Characters: 407

---

# Source: .\node_modules\express\History.md

- Preview: 5.1.0 / 2025-03-31 ======================== * Add support for `Uint8Array` in `res.send()` * Add support for ETag option in `res.sendFile()` * Add support for multiple links with the same rel in `res.links()` * Add funding field to package.json * perf: use loop for acceptParams * refactor: prefix built-in node module imports * deps: remove `setprototypeof` * deps: remove `safe-buffer` * deps: remo
- Lines: 3861
- Characters: 118682

---

# Source: .\node_modules\express\node_modules\cookie\README.md

- Preview: # cookie [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Node.js Version][node-image]][node-url] [![Build Status][ci-image]][ci-url] [![Coverage Status][coveralls-image]][coveralls-url] Basic HTTP cookie parser and serializer for HTTP servers. ## Installation This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](htt
- Lines: 320
- Characters: 11432

---

# Source: .\node_modules\express\node_modules\cookie\SECURITY.md

- Preview: # Security Policies and Procedures ## Reporting a Bug The `cookie` team and community take all security bugs seriously. Thank you for improving the security of the project. We appreciate your efforts and responsible disclosure and will make every effort to acknowledge your contributions. Report security bugs by emailing the current owner(s) of `cookie`. This information can be found in the npm reg
- Lines: 28
- Characters: 1155

---

# Source: .\node_modules\express\Readme.md

- Preview: [![Express Logo](https://i.cloudup.com/zfY6lL7eFa-3000x3000.png)](https://expressjs.com/) **Fast, unopinionated, minimalist web framework for [Node.js](https://nodejs.org).** **This project has a [Code of Conduct][].** ## Table of contents * [Installation](#Installation) * [Features](#Features) * [Docs & Community](#docs--community) * [Quick Start](#Quick-Start) * [Running Tests](#Running-Tests) *
- Lines: 269
- Characters: 9081

---

# Source: .\node_modules\express-rate-limit\license.md

- Preview: # MIT License Copyright 2023 Nathan Friedly, Vedant K Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit pe
- Lines: 23
- Characters: 1059

---

# Source: .\node_modules\express-rate-limit\readme.md

- Preview: <h1 align="center"> <code>express-rate-limit</code> </h1> <div align="center"> [![tests](https://img.shields.io/github/actions/workflow/status/express-rate-limit/express-rate-limit/ci.yaml)](https://github.com/express-rate-limit/express-rate-limit/actions/workflows/ci.yaml) [![npm version](https://img.shields.io/npm/v/express-rate-limit.svg)](https://npmjs.org/package/express-rate-limit 'View this
- Lines: 148
- Characters: 8497

---

# Source: .\node_modules\extend\CHANGELOG.md

- Preview: 3.0.2 / 2018-07-19 ================== * [Fix] Prevent merging `__proto__` property (#48) * [Dev Deps] update `eslint`, `@ljharb/eslint-config`, `tape` * [Tests] up to `node` `v10.7`, `v9.11`, `v8.11`, `v7.10`, `v6.14`, `v4.9`; use `nvm install-latest-npm` 3.0.1 / 2017-04-27 ================== * [Fix] deep extending should work with a non-object (#46) * [Dev Deps] update `tape`, `eslint`, `@ljharb/
- Lines: 86
- Characters: 2696

---

# Source: .\node_modules\extend\README.md

- Preview: [![Build Status][travis-svg]][travis-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] # extend() for Node.js <sup>[![Version Badge][npm-version-png]][npm-url]</sup> `node-extend` is a port of the classic extend() method from jQuery. It behaves as you expect. It is simple, tried and true. Notes: * Since Node.js >= 4, [`Object.assign`](https://de
- Lines: 84
- Characters: 2953

---

# Source: .\node_modules\fast-content-type-parse\README.md

- Preview: # fast-content-type-parse <div align="center"> [![NPM version](https://img.shields.io/npm/v/fast-content-type-parse.svg?style=flat)](https://www.npmjs.com/package/fast-content-type-parse) [![NPM downloads](https://img.shields.io/npm/dm/fast-content-type-parse.svg?style=flat)](https://www.npmjs.com/package/fast-content-type-parse) [![CI](https://github.com/fastify/fast-content-type-parse/actions/wo
- Lines: 85
- Characters: 2813

---

# Source: .\node_modules\fast-deep-equal\README.md

- Preview: # fast-deep-equal The fastest deep equal with ES6 Map, Set and Typed arrays support. [![Build Status](https://travis-ci.org/epoberezkin/fast-deep-equal.svg?branch=master)](https://travis-ci.org/epoberezkin/fast-deep-equal) [![npm](https://img.shields.io/npm/v/fast-deep-equal.svg)](https://www.npmjs.com/package/fast-deep-equal) [![Coverage Status](https://coveralls.io/repos/github/epoberezkin/fast-
- Lines: 99
- Characters: 3215

---

# Source: .\node_modules\fast-equals\BUILD.md

- Preview: # Reproducing a build ## Clone version ``` git clone https://github.com/planttheidea/fast-equals.git cd fast-equals git checkout {version} ``` Replace `{version}` above with the appropriate package version. If you want to compare a version older than `1.6.2`, you'll need to use a commit hash directly. ## Install ``` yarn install ``` We use `yarn` for our package management, so to ensure that exact
- Lines: 40
- Characters: 711

---

# Source: .\node_modules\fast-equals\CHANGELOG.md

- Preview: # fast-equals CHANGELOG ## 4.0.3 - Remove unnecessary second strict equality check for objects in edge-case scenarios ## 4.0.2 - [#85](https://github.com/planttheidea/fast-equals/issues/85) - `createCustomCircularEqual` typing is incorrect ## 4.0.1 - [#81](https://github.com/planttheidea/fast-equals/issues/81) - Fix typing issues related to importing in `index.d.ts` file ## 4.0.0 ### Breaking Chan
- Lines: 229
- Characters: 7250

---

# Source: .\node_modules\fast-equals\README.md

- Preview: # fast-equals <img src="https://img.shields.io/badge/build-passing-brightgreen.svg"/> <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg"/> <img src="https://img.shields.io/badge/license-MIT-blue.svg"/> Perform [blazing fast](#benchmarks) equality comparisons (either deep or shallow) on two objects passed. It has no dependencies, and is ~1.27kB when minified and gzipped. Unlike
- Lines: 284
- Characters: 12258

---

# Source: .\node_modules\fast-equals\recipes\explicit-property-check.md

- Preview: # Explicit property check Sometimes it is necessary to squeeze every once of performance out of your runtime code, and deep equality checks can be a bottleneck. When this is occurs, it can be advantageous to build a custom comparison that allows for highly specific equality checks. An example where you know the shape of the objects being passed in, where the `foo` property is a simple primitive an
- Lines: 31
- Characters: 840

---

# Source: .\node_modules\fast-equals\recipes\legacy-circular-equal-support.md

- Preview: # Legacy environment support for circular equal comparators Starting in `4.x.x`, `WeakMap` is expected to be available in the environment. All modern browsers support this global object, however there may be situations where a legacy environmental support is required (example: IE11). If you need to support such an environment, creating a custom comparator that uses a custom cache implementation wi
- Lines: 69
- Characters: 1808

---

# Source: .\node_modules\fast-equals\recipes\legacy-regexp-support.md

- Preview: # Legacy environment support for `RegExp` comparators Starting in `4.x.x`, `RegExp.prototype.flags` is expected to be available in the environment. All modern browsers support this feature, however there may be situations where a legacy environmental support is required (example: IE11). If you need to support such an environment, creating a custom comparator that uses a more verbose comparison of
- Lines: 29
- Characters: 1064

---

# Source: .\node_modules\fast-equals\recipes\non-standard-properties.md

- Preview: # Non-standard properties Sometimes, objects require a comparison that extend beyond its own keys. Perhaps there is a non-enumerable property that is important, or perhaps there are symbols as keys. In this case, the standard validators will return false positives, because internally `fast-equals` uses `Object.keys()` for object comparisons. Using a custom object comparator with `createCustomEqual
- Lines: 37
- Characters: 1074

---

# Source: .\node_modules\fast-equals\recipes\strict-property-descriptor-check.md

- Preview: # Non-standard properties The equality check done for objects prioritizes the common use-case, which is to only check an object's own keys. However, it is possible that the objects being compared require a stricter comparison of property descriptors. ```ts import { createCustomEqual } from 'fast-equals'; import type { TypeEqualityComparator } from 'fast-equals'; const areObjectsEqual: TypeEquality
- Lines: 45
- Characters: 1260

---

# Source: .\node_modules\fast-equals\recipes\using-meta-in-comparison.md

- Preview: # Using `meta` in comparison Sometimes a "pure" equality between two objects is insufficient, because the comparison relies on some external state. While these kinds of scenarios should generally be avoided, it is possible to handle them with a custom comparator that checks `meta` values. ```ts import { createCustomEqual } from 'fast-equals'; import type { EqualityComparator, InternalEqualityCompa
- Lines: 26
- Characters: 786

---

# Source: .\node_modules\fast-formula-parser\README.md

- Preview: ![GitHub](https://img.shields.io/github/license/lesterlyu/fast-formula-parser) [![npm (tag)](https://img.shields.io/npm/v/fast-formula-parser/latest)](https://www.npmjs.com/package/fast-formula-parser) [![npm](https://img.shields.io/npm/dt/fast-formula-parser)](https://www.npmjs.com/package/fast-formula-parser) [![Coverage Status](https://coveralls.io/repos/github/LesterLyu/fast-formula-parser/bad
- Lines: 322
- Characters: 13408

---

# Source: .\node_modules\fast-glob\node_modules\glob-parent\CHANGELOG.md

- Preview: ### [5.1.2](https://github.com/gulpjs/glob-parent/compare/v5.1.1...v5.1.2) (2021-03-06) ### Bug Fixes * eliminate ReDoS ([#36](https://github.com/gulpjs/glob-parent/issues/36)) ([f923116](https://github.com/gulpjs/glob-parent/commit/f9231168b0041fea3f8f954b3cceb56269fc6366)) ### [5.1.1](https://github.com/gulpjs/glob-parent/compare/v5.1.0...v5.1.1) (2021-01-27) ### Bug Fixes * unescape exclamation
- Lines: 113
- Characters: 4394

---

# Source: .\node_modules\fast-glob\node_modules\glob-parent\README.md

- Preview: <p align="center"> <a href="https://gulpjs.com"> <img height="257" width="114" src="https://raw.githubusercontent.com/gulpjs/artwork/master/gulp-2x.png"> </a> </p> # glob-parent [![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Azure Pipelines Build Status][azure-pipelines-image]][azure-pipelines-url] [![Travis Build Status][travis-image]][travis-url] [![AppVeyor Bui
- Lines: 140
- Characters: 4509

---

# Source: .\node_modules\fast-glob\README.md

- Preview: # fast-glob > It's a very fast and efficient [glob][glob_definition] library for [Node.js][node_js]. This package provides methods for traversing the file system and returning pathnames that matched a defined set of a specified pattern according to the rules used by the Unix Bash shell with some simplifications, meanwhile results are returned in **arbitrary order**. Quick, simple, effective. ## Ta
- Lines: 833
- Characters: 25165

---

# Source: .\node_modules\fast-json-stable-stringify\README.md

- Preview: # fast-json-stable-stringify Deterministic `JSON.stringify()` - a faster version of [@substack](https://github.com/substack)'s json-stable-strigify without [jsonify](https://github.com/substack/jsonify). You can also pass in a custom comparison function. [![Build Status](https://travis-ci.org/epoberezkin/fast-json-stable-stringify.svg?branch=master)](https://travis-ci.org/epoberezkin/fast-json-sta
- Lines: 134
- Characters: 3382

---

# Source: .\node_modules\fast-levenshtein\LICENSE.md

- Preview: (MIT License) Copyright (c) 2013 [Ramesh Nair](http://www.hiddentao.com/) Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Softwa
- Lines: 28
- Characters: 1075

---

# Source: .\node_modules\fast-levenshtein\README.md

- Preview: # fast-levenshtein - Levenshtein algorithm in Javascript [![Build Status](https://secure.travis-ci.org/hiddentao/fast-levenshtein.png)](http://travis-ci.org/hiddentao/fast-levenshtein) [![NPM module](https://badge.fury.io/js/fast-levenshtein.png)](https://badge.fury.io/js/fast-levenshtein) [![NPM downloads](https://img.shields.io/npm/dm/fast-levenshtein.svg?maxAge=2592000)](https://www.npmjs.com/p
- Lines: 107
- Characters: 3291

---

# Source: .\node_modules\fastq\README.md

- Preview: # fastq ![ci][ci-url] [![npm version][npm-badge]][npm-url] Fast, in memory work queue. Benchmarks (1 million tasks): * setImmediate: 812ms * fastq: 854ms * async.queue: 1298ms * neoAsync.queue: 1249ms Obtained on node 12.16.1, on a dedicated server. If you need zero-overhead series function call, check out [fastseries](http://npm.im/fastseries). For zero-overhead parallel function call, check out
- Lines: 315
- Characters: 8031

---

# Source: .\node_modules\fastq\SECURITY.md

- Preview: # Security Policy ## Supported Versions Use this section to tell people about which versions of your project are currently being supported with security updates. | Version | Supported          | | ------- | ------------------ | | 1.x     | :white_check_mark: | | < 1.0   | :x:                | ## Reporting a Vulnerability Please report all vulnerabilities at [https://github.com/mcollina/fastq/secur
- Lines: 18
- Characters: 440

---

# Source: .\node_modules\fast-sha256\README.md

- Preview: fast-sha256-js ============== SHA-256 implementation for JavaScript/TypeScript with typed arrays that works in modern browsers and Node.js. Implements the hash function, HMAC, and PBKDF2. Public domain. No warranty. [![Build Status](https://travis-ci.org/dchest/fast-sha256-js.svg?branch=master) ](https://travis-ci.org/dchest/fast-sha256-js) Installation ------------ You can install fast-sha256-js
- Lines: 130
- Characters: 2513

---

# Source: .\node_modules\fault\readme.md

- Preview: # fault [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Functional errors with formatted output. ## Install [npm][]: ```sh npm install fault ``` ## Use ```js var fault = require('fault') throw fault('Hello %s!', 'Eric') ``` Yields: ```text Error: Hello Eric! at FormattedError (~/node_modules/fault/index.j
- Lines: 141
- Characters: 3130

---

# Source: .\node_modules\fdir\README.md

- Preview: <p align="center"> <img src="https://github.com/thecodrr/fdir/raw/master/assets/fdir.gif" width="75%"/> <h1 align="center">The Fastest Directory Crawler & Globber for NodeJS</h1> <p align="center"> <a href="https://www.npmjs.com/package/fdir"><img src="https://img.shields.io/npm/v/fdir?style=for-the-badge"/></a> <a href="https://www.npmjs.com/package/fdir"><img src="https://img.shields.io/npm/dw/f
- Lines: 94
- Characters: 3742

---

# Source: .\node_modules\file-entry-cache\README.md

- Preview: # file-entry-cache > Super simple cache for file metadata, useful for process that work on a given series of files > and that only need to repeat the job on the changed ones since the previous run of the process — Edit [![NPM Version](https://img.shields.io/npm/v/file-entry-cache.svg?style=flat)](https://npmjs.org/package/file-entry-cache) [![tests](https://github.com/jaredwray/file-entry-cache/ac
- Lines: 118
- Characters: 5378

---

# Source: .\node_modules\file-selector\README.md

- Preview: # file-selector > A small package for converting a [DragEvent](https://developer.mozilla.org/en-US/docs/Web/API/DragEvent) or [file input](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file) to a list of File objects. [![npm](https://img.shields.io/npm/v/file-selector.svg?style=flat-square)](https://www.npmjs.com/package/file-selector) ![Tests](https://img.shields.io/github/actio
- Lines: 147
- Characters: 8638

---

# Source: .\node_modules\filesize\README.md

- Preview: # filesize.js [![downloads](https://img.shields.io/npm/dt/filesize.svg)](https://www.npmjs.com/package/filesize) [![CDNJS version](https://img.shields.io/cdnjs/v/filesize.svg)](https://cdnjs.com/libraries/filesize) filesize.js provides a simple way to get a human-readable file size string from a number (float or integer) or string. ```javascript import {filesize} from "filesize"; filesize(265318,
- Lines: 116
- Characters: 4281

---

# Source: .\node_modules\fill-range\README.md

- Preview: # fill-range [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=W8YFZ425KND68) [![NPM version](https://img.shields.io/npm/v/fill-range.svg?style=flat)](https://www.npmjs.com/package/fill-range) [![NPM monthly downloads](https://img.shields.io/npm/dm/fill-range.svg?style=flat)](https://npmjs.org/package/fill-range)
- Lines: 240
- Characters: 7249

---

# Source: .\node_modules\finalhandler\HISTORY.md

- Preview: v2.1.0 / 2025-03-05 ================== * deps: * use caret notation for dependency versions * encodeurl@^2.0.0 * debug@^4.4.0 * remove `ServerResponse.headersSent` support check * remove setImmediate support check * update test dependencies * remove unnecessary devDependency `safe-buffer` * remove `unpipe` package and use native `unpipe()` method * remove unnecessary devDependency `readable-stream
- Lines: 236
- Characters: 5056

---

# Source: .\node_modules\finalhandler\README.md

- Preview: # finalhandler [![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url] [![Node.js Version][node-image]][node-url] [![Build Status][github-actions-ci-image]][github-actions-ci-url] [![Test Coverage][coveralls-image]][coveralls-url] Node.js function to invoke as the final step to respond to HTTP request. ## Installation This is a [Node.js](https://nodejs.org/en/) modu
- Lines: 150
- Characters: 3973

---

# Source: .\node_modules\find-up\readme.md

- Preview: # find-up > Find a file or directory by walking up parent directories ## Install ```sh npm install find-up ``` ## Usage ``` / └── Users └── sindresorhus ├── unicorn.png └── foo └── bar ├── baz └── example.js ``` `example.js` ```js import path from 'node:path'; import {findUp, pathExists} from 'find-up'; console.log(await findUp('unicorn.png')); //=> '/Users/sindresorhus/unicorn.png' console.log(aw
- Lines: 163
- Characters: 4061

---

# Source: .\node_modules\flat-cache\changelog.md

- Preview: # flat-cache - Changelog ## v3.0.4 - **Refactoring** - add files by name to the list of exported files - [89a2698](https://github.com/royriojas/flat-cache/commit/89a2698), [Roy Riojas](https://github.com/Roy Riojas), 08/11/2020 02:35:39 ## v3.0.3 - **Bug Fixes** - Fix wrong eslint command - [f268e42](https://github.com/royriojas/flat-cache/commit/f268e42), [Roy Riojas](https://github.com/Roy Rioja
- Lines: 281
- Characters: 15732

---

# Source: .\node_modules\flat-cache\README.md

- Preview: # flat-cache > A stupidly simple key/value storage using files to persist the data [![NPM Version](https://img.shields.io/npm/v/flat-cache.svg?style=flat)](https://npmjs.org/package/flat-cache) [![tests](https://github.com/jaredwray/flat-cache/actions/workflows/tests.yaml/badge.svg?branch=master)](https://github.com/jaredwray/flat-cache/actions/workflows/tests.yaml) [![codecov](https://codecov.io/
- Lines: 80
- Characters: 2989

---

# Source: .\node_modules\flatted\README.md

- Preview: # flatted [![Downloads](https://img.shields.io/npm/dm/flatted.svg)](https://www.npmjs.com/package/flatted) [![Coverage Status](https://coveralls.io/repos/github/WebReflection/flatted/badge.svg?branch=main)](https://coveralls.io/github/WebReflection/flatted?branch=main) [![Build Status](https://travis-ci.com/WebReflection/flatted.svg?branch=main)](https://travis-ci.com/WebReflection/flatted) [![Lic
- Lines: 118
- Characters: 4489

---

# Source: .\node_modules\follow-redirects\README.md

- Preview: ## Follow Redirects Drop-in replacement for Node's `http` and `https` modules that automatically follows redirects. [![npm version](https://img.shields.io/npm/v/follow-redirects.svg)](https://www.npmjs.com/package/follow-redirects) [![Build Status](https://github.com/follow-redirects/follow-redirects/workflows/CI/badge.svg)](https://github.com/follow-redirects/follow-redirects/actions) [![Coverage
- Lines: 158
- Characters: 6285

---

# Source: .\node_modules\for-each\.github\SECURITY.md

- Preview: # Security Please email [@ljharb](https://github.com/ljharb) or see https://tidelift.com/security if you have a potential security vulnerability to report.
- Lines: 6
- Characters: 154

---

# Source: .\node_modules\for-each\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v0.3.5](https://github.com/ljharb/for-each/compare/v0.3.4...v0.3.5) - 2025-02-10 ### Commits - [New] add types [`6483c1e`](https://github.com/ljhar
- Lines: 110
- Characters: 8789

---

# Source: .\node_modules\for-each\README.md

- Preview: # for-each [![build status][1]][2] [![browser support][3]][4] A better forEach. ## Example Like `Array.prototype.forEach` but works on objects. ```js var forEach = require("for-each") forEach({ key: "value" }, function (value, key, object) { /* code */ }) ``` As a bonus, it's also a perfectly function shim/polyfill for arrays too! ```js var forEach = require("for-each") forEach([1, 2, 3], function
- Lines: 42
- Characters: 679

---

# Source: .\node_modules\foreground-child\README.md

- Preview: # foreground-child Run a child as if it's the foreground process. Give it stdio. Exit when it exits. Mostly this module is here to support some use cases around wrapping child processes for test coverage and such. But it's also generally useful any time you want one program to execute another as if it's the "main" process, for example, if a program takes a `--cmd` argument to execute in some way.
- Lines: 131
- Characters: 4360

---

# Source: .\node_modules\format\Readme.md

- Preview: format ====== printf, sprintf, and vsprintf for JavaScript Installation ============ npm install format The code works in browsers as well, you can copy these functions into your project or otherwise include them with your other JavaScript. Usage ===== var format = require('format') , printf = format.printf , vsprintf = format.vsprintf // or if you want to keep it old school , sprintf = format //
- Lines: 49
- Characters: 1007

---

# Source: .\node_modules\form-data\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v4.0.4](https://github.com/form-data/form-data/compare/v4.0.3...v4.0.4) - 2025-07-16 ### Commits - [meta] add `auto-changelog` [`811f682`](https://
- Lines: 604
- Characters: 42610

---

# Source: .\node_modules\form-data\node_modules\mime-db\HISTORY.md

- Preview: 1.52.0 / 2022-02-21 =================== * Add extensions from IANA for more `image/*` types * Add extension `.asc` to `application/pgp-keys` * Add extensions to various XML types * Add new upstream MIME types 1.51.0 / 2021-11-08 =================== * Add new upstream MIME types * Mark `image/vnd.microsoft.icon` as compressible * Mark `image/vnd.ms-dds` as compressible 1.50.0 / 2021-09-15 =========
- Lines: 510
- Characters: 12074

---

# Source: .\node_modules\form-data\node_modules\mime-db\README.md

- Preview: # mime-db [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Node.js Version][node-image]][node-url] [![Build Status][ci-image]][ci-url] [![Coverage Status][coveralls-image]][coveralls-url] This is a large database of mime types and information about them. It consists of a single, public JSON file and does not include any logic, allowing it to remain a
- Lines: 103
- Characters: 3991

---

# Source: .\node_modules\form-data\node_modules\mime-types\HISTORY.md

- Preview: 2.1.35 / 2022-03-12 =================== * deps: mime-db@1.52.0 - Add extensions from IANA for more `image/*` types - Add extension `.asc` to `application/pgp-keys` - Add extensions to various XML types - Add new upstream MIME types 2.1.34 / 2021-11-08 =================== * deps: mime-db@1.51.0 - Add new upstream MIME types 2.1.33 / 2021-10-01 =================== * deps: mime-db@1.50.0 - Add deprec
- Lines: 400
- Characters: 8415

---

# Source: .\node_modules\form-data\node_modules\mime-types\README.md

- Preview: # mime-types [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Node.js Version][node-version-image]][node-version-url] [![Build Status][ci-image]][ci-url] [![Test Coverage][coveralls-image]][coveralls-url] The ultimate javascript content-type utility. Similar to [the `mime@1.x` module](https://www.npmjs.com/package/mime), except: - __No fallbacks.__ I
- Lines: 116
- Characters: 3368

---

# Source: .\node_modules\form-data\README.md

- Preview: # Form-Data [![NPM Module](https://img.shields.io/npm/v/form-data.svg)](https://www.npmjs.com/package/form-data) [![Join the chat at https://gitter.im/form-data/form-data](http://form-data.github.io/images/gitterbadge.svg)](https://gitter.im/form-data/form-data) A library to create readable ```"multipart/form-data"``` streams. Can be used to submit forms and file uploads to other web applications.
- Lines: 358
- Characters: 11675

---

# Source: .\node_modules\forwarded\HISTORY.md

- Preview: 0.2.0 / 2021-05-31 ================== * Use `req.socket` over deprecated `req.connection` 0.1.2 / 2017-09-14 ================== * perf: improve header parsing * perf: reduce overhead when no `X-Forwarded-For` header 0.1.1 / 2017-09-10 ================== * Fix trimming leading / trailing OWS * perf: hoist regular expression 0.1.0 / 2014-09-21 ================== * Initial release
- Lines: 24
- Characters: 379

---

# Source: .\node_modules\forwarded\README.md

- Preview: # forwarded [![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url] [![Node.js Version][node-version-image]][node-version-url] [![Build Status][ci-image]][ci-url] [![Test Coverage][coveralls-image]][coveralls-url] Parse HTTP X-Forwarded-For header ## Installation This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmj
- Lines: 60
- Characters: 1597

---

# Source: .\node_modules\frac\README.md

- Preview: # frac Rational approximation to a floating point number with bounded denominator. Uses the [Mediant Method](https://en.wikipedia.org/wiki/Mediant_method). This module also provides an implementation of the continued fraction method as described by Aberth in "A method for exact computation with rational numbers". The algorithm is used in <a href="http://sheetjs.com">SheetJS Libraries</a> to replic
- Lines: 131
- Characters: 3953

---

# Source: .\node_modules\fraction.js\README.md

- Preview: # Fraction.js - ℚ in JavaScript [![NPM Package](https://img.shields.io/npm/v/fraction.js.svg?style=flat)](https://npmjs.org/package/fraction.js "View this project on npm") [![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT) Tired of inprecise numbers represented by doubles, which have to store rational and irrational numbers like PI or sqrt
- Lines: 434
- Characters: 14425

---

# Source: .\node_modules\framer-motion\client\README.md

- Preview: This directory is a fallback for `exports["./client"]` in the root `framer-motion` `package.json`.
- Lines: 4
- Characters: 98

---

# Source: .\node_modules\framer-motion\dom\README.md

- Preview: This directory is a fallback for `exports["./dom"]` in the root `framer-motion` `package.json`.
- Lines: 4
- Characters: 95

---

# Source: .\node_modules\framer-motion\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) 2018 Framer B.V. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit per
- Lines: 24
- Characters: 1057

---

# Source: .\node_modules\framer-motion\README.md

- Preview: <p align="center"> <img width="100" height="100" alt="Motion logo" src="https://user-images.githubusercontent.com/7850794/164965523-3eced4c4-6020-467e-acde-f11b7900ad62.png" /> </p> <h1 align="center">Motion for React</h1> <br> <p align="center"> <a href="https://www.npmjs.com/package/framer-motion" target="_blank"> <img src="https://img.shields.io/npm/v/framer-motion.svg?style=flat-square" /> </a
- Lines: 114
- Characters: 5433

---

# Source: .\node_modules\fresh\HISTORY.md

- Preview: 2.0.0 - 2024-09-04 ========== * Drop support for Node.js <18 1.0.0 - 2024-09-04 ========== * Drop support for Node.js below 0.8 * Fix: Ignore `If-Modified-Since` in the presence of `If-None-Match`, according to [spec](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.3-5). Fixes [#35](https://github.com/jshttp/fresh/issues/35) 0.5.2 / 2017-09-13 ================== * Fix regression matching
- Lines: 83
- Characters: 1764

---

# Source: .\node_modules\fresh\README.md

- Preview: # fresh [![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url] [![Node.js Version][node-version-image]][node-version-url] [![Build Status][ci-image]][ci-url] [![Test Coverage][coveralls-image]][coveralls-url] HTTP response freshness testing ## Installation This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmjs.com/
- Lines: 120
- Characters: 3231

---

# Source: .\node_modules\fs-monkey\docs\api\patchFs.md

- Preview: # `patchFs(vol[, fs])` Rewrites Node's filesystem module `fs` with *fs-like* object. - `vol` - fs-like object - `fs` *(optional)* - a filesystem to patch, defaults to `require('fs')` ```js import {patchFs} from 'fs-monkey'; const myfs = { readFileSync: () => 'hello world', }; patchFs(myfs); console.log(require('fs').readFileSync('/foo/bar')); // hello world ``` You don't need to create *fs-like* o
- Lines: 43
- Characters: 898

---

# Source: .\node_modules\fs-monkey\docs\api\patchRequire.md

- Preview: # `patchRequire(vol[, unixifyPaths[, Module]])` Patches Node's `module` module to use a given *fs-like* object `vol` for module loading. - `vol` - fs-like object - `unixifyPaths` *(optional)* - whether to convert Windows paths to unix style paths, defaults to `false`. - `Module` *(optional)* - a module to patch, defaults to `require('module')` Monkey-patches the `require` function in Node, this wa
- Lines: 58
- Characters: 1621

---

# Source: .\node_modules\fs-monkey\README.md

- Preview: # fs-monkey [![][npm-img]][npm-url] [![][travis-badge]][travis-url] Monkey-patches for filesystem related things. - Rewrite `require` function to load Node's modules from memory. - Or rewrite the whole `fs` filesystem module. ## Install ```shell npm install --save fs-monkey ``` ## Terms An *fs-like* object is an object that implements methods of Node's [filesystem API](https://nodejs.org/api/fs.ht
- Lines: 48
- Characters: 1085

---

# Source: .\node_modules\function.prototype.name\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.8](https://github.com/es-shims/Function.prototype.name/compare/v1.1.7...v1.1.8) - 2024-12-19 ### Commits - [actions] split out node 10-20, and
- Lines: 144
- Characters: 9632

---

# Source: .\node_modules\function.prototype.name\README.md

- Preview: # function.prototype.name <sup>[![Version Badge][2]][1]</sup> [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] An ES2015 spec-compliant `Function.prototype.name` shim. Invoke its "shim" method to shim Function.prototype.name if it is unavailable. *Note*: `Function#name` requir
- Lines: 58
- Characters: 2509

---

# Source: .\node_modules\function-bind\.github\SECURITY.md

- Preview: # Security Please email [@ljharb](https://github.com/ljharb) or see https://tidelift.com/security if you have a potential security vulnerability to report.
- Lines: 6
- Characters: 154

---

# Source: .\node_modules\function-bind\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.2](https://github.com/ljharb/function-bind/compare/v1.1.1...v1.1.2) - 2023-10-12 ### Merged - Point to the correct file [`#16`](https://github
- Lines: 139
- Characters: 13667

---

# Source: .\node_modules\function-bind\README.md

- Preview: # function-bind <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] <!--[![coverage][codecov-image]][codecov-url]--> [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url
- Lines: 49
- Characters: 1709

---

# Source: .\node_modules\functions-have-names\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.2.3](https://github.com/inspect-js/functions-have-names/compare/v1.2.2...v1.2.3) - 2022-04-19 ### Fixed - [Fix] in IE 9-11, the descriptor is ab
- Lines: 92
- Characters: 8140

---

# Source: .\node_modules\functions-have-names\README.md

- Preview: # functions-have-names <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url
- Lines: 43
- Characters: 1854

---

# Source: .\node_modules\gaxios\CHANGELOG.md

- Preview: # Changelog ## [6.7.1](https://github.com/googleapis/gaxios/compare/v6.7.0...v6.7.1) (2024-08-13) ### Bug Fixes * Release uuid rollback ([#641](https://github.com/googleapis/gaxios/issues/641)) ([2e21115](https://github.com/googleapis/gaxios/commit/2e211158d5351d81de4e84f999ec3b41475ec0cd)) ## [6.7.0](https://github.com/googleapis/gaxios/compare/v6.6.0...v6.7.0) (2024-06-27) ### Features * Add add
- Lines: 400
- Characters: 18679

---

# Source: .\node_modules\gaxios\node_modules\uuid\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines. ## [9.0.1](https://github.com/uuidjs/uuid/compare/v9.0.0...v9.0.1) (2023-09-12) ### build - Fix CI to work with Node.js 20.x ## [9.0.0](https://github.com/uuidjs/uuid/compare/v8.3.2...v9.0.0) (2022-09-05) ### ⚠ BR
- Lines: 277
- Characters: 15925

---

# Source: .\node_modules\gaxios\node_modules\uuid\CONTRIBUTING.md

- Preview: # Contributing Please feel free to file GitHub Issues or propose Pull Requests. We're always happy to discuss improvements to this library! ## Testing ```shell npm test ``` ## Releasing Releases are supposed to be done from master, version bumping is automated through [`standard-version`](https://github.com/conventional-changelog/standard-version): ```shell npm run release -- --dry-run  # verify o
- Lines: 21
- Characters: 495

---

# Source: .\node_modules\gaxios\node_modules\uuid\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) 2010-2020 Robert Kieffer and other contributors Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
- Lines: 12
- Characters: 1100

---

# Source: .\node_modules\gaxios\node_modules\uuid\README.md

- Preview: <!-- -- This file is auto-generated from README_js.md. Changes should be made there. --> # uuid [![CI](https://github.com/uuidjs/uuid/workflows/CI/badge.svg)](https://github.com/uuidjs/uuid/actions?query=workflow%3ACI) [![Browser](https://github.com/uuidjs/uuid/workflows/Browser/badge.svg)](https://github.com/uuidjs/uuid/actions?query=workflow%3ABrowser) For the creation of [RFC4122](https://www.i
- Lines: 468
- Characters: 16464

---

# Source: .\node_modules\gaxios\README.md

- Preview: # gaxios [![npm version](https://img.shields.io/npm/v/gaxios.svg)](https://www.npmjs.org/package/gaxios) [![codecov](https://codecov.io/gh/googleapis/gaxios/branch/master/graph/badge.svg)](https://codecov.io/gh/googleapis/gaxios) [![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts) > An HTTP request client that provides an `axios`
- Lines: 213
- Characters: 6808

---

# Source: .\node_modules\gcp-metadata\CHANGELOG.md

- Preview: # Changelog [npm history][1] [1]: https://www.npmjs.com/package/gcp-metadata?activeTab=versions ## [6.1.1](https://github.com/googleapis/gcp-metadata/compare/v6.1.0...v6.1.1) (2025-01-30) ### Bug Fixes * Add extra logging for incorrect headers ([#637](https://github.com/googleapis/gcp-metadata/issues/637)) ([edafa87](https://github.com/googleapis/gcp-metadata/commit/edafa87e020ffe28983048de5da183c
- Lines: 466
- Characters: 25167

---

# Source: .\node_modules\gcp-metadata\README.md

- Preview: [//]: # "This README.md file is auto-generated, all changes to this file will be lost." [//]: # "To regenerate it, use `python -m synthtool`." <img src="https://avatars2.githubusercontent.com/u/2810941?v=3&s=96" alt="Google Cloud Platform logo" title="Google Cloud Platform" align="right" height="96" width="96"/> # [GCP Metadata: Node.js Client](https://github.com/googleapis/gcp-metadata) [![releas
- Lines: 238
- Characters: 8274

---

# Source: .\node_modules\generator-function\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v2.0.1](https://github.com/TimothyGu/generator-function/compare/v2.0.0...v2.0.1) - 2025-09-30 ### Commits - [meta] fix repo URL [`f5d05f2`](https:/
- Lines: 30
- Characters: 1318

---

# Source: .\node_modules\generator-function\LICENSE.md

- Preview: Copyright (c) 2015 Tiancheng “Timothy” Gu Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to who
- Lines: 10
- Characters: 1059

---

# Source: .\node_modules\generator-function\README.md

- Preview: # generator-function <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] A function that returns the normally hidden `GeneratorFunction` constructor, when available. ## Ge
- Lines: 54
- Characters: 1938

---

# Source: .\node_modules\gensync\README.md

- Preview: # gensync This module allows for developers to write common code that can share implementation details, hiding whether an underlying request happens synchronously or asynchronously. This is in contrast with many current Node APIs which explicitly implement the same API twice, once with calls to synchronous functions, and once with asynchronous functions. Take for example `fs.readFile` and `fs.read
- Lines: 199
- Characters: 5154

---

# Source: .\node_modules\get-caller-file\LICENSE.md

- Preview: ISC License (ISC) Copyright 2018 Stefan Penner Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies. THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCH
- Lines: 9
- Characters: 739

---

# Source: .\node_modules\get-caller-file\README.md

- Preview: # get-caller-file [![Build Status](https://travis-ci.org/stefanpenner/get-caller-file.svg?branch=master)](https://travis-ci.org/stefanpenner/get-caller-file) [![Build status](https://ci.appveyor.com/api/projects/status/ol2q94g1932cy14a/branch/master?svg=true)](https://ci.appveyor.com/project/embercli/get-caller-file/branch/master) This is a utility, which allows a function to figure out from which
- Lines: 44
- Characters: 1027

---

# Source: .\node_modules\get-intrinsic\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.3.0](https://github.com/ljharb/get-intrinsic/compare/v1.2.7...v1.3.0) - 2025-02-22 ### Commits - [Dev Deps] update `es-abstract`, `es-value-fixt
- Lines: 189
- Characters: 15343

---

# Source: .\node_modules\get-intrinsic\README.md

- Preview: # get-intrinsic <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Get a
- Lines: 74
- Characters: 2720

---

# Source: .\node_modules\get-nonce\CHANGELOG.md

- Preview: # 1.0.0 (2020-04-16)
- Lines: 4
- Characters: 20

---

# Source: .\node_modules\get-nonce\README.md

- Preview: # get-nonce just returns a **nonce** (number used once). No batteries included in those 46 bytes of this library. - ✅ build in `webpack` support via `__webpack_nonce__` # API - `getNonce(): string|undefined` - returns the current `nonce` - `setNonce(newValue)` - set's nonce value ## Why? Why we need a library to access `__webpack_nonce__`? Abstractions! "I", as a library author, don't want to "pre
- Lines: 56
- Characters: 1495

---

# Source: .\node_modules\get-proto\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.1](https://github.com/ljharb/get-proto/compare/v1.0.0...v1.0.1) - 2025-01-02 ### Commits - [Fix] for the `Object.getPrototypeOf` window, throw
- Lines: 24
- Characters: 1033

---

# Source: .\node_modules\get-proto\README.md

- Preview: # get-proto <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Robustly get the [[Prototype]] of an object. Uses the best available method. ## Getting started ```sh npm i
- Lines: 53
- Characters: 1744

---

# Source: .\node_modules\get-symbol-description\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.0](https://github.com/inspect-js/get-symbol-description/compare/v1.0.2...v1.1.0) - 2024-12-17 ### Commits - [New] add types [`b957b65`](https:
- Lines: 64
- Characters: 6220

---

# Source: .\node_modules\get-symbol-description\README.md

- Preview: # get-symbol-description <sup>[![Version Badge][2]][1]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Gets the description of a Symbol. Handles `Symbol()` vs `Symbol('')` properly
- Lines: 46
- Characters: 1996

---

# Source: .\node_modules\get-tsconfig\README.md

- Preview: <p align="center"> <img width="160" src=".github/logo.webp"> </p> <h1 align="center"> <sup>get-tsconfig</sup> <br> <a href="https://npm.im/get-tsconfig"><img src="https://badgen.net/npm/v/get-tsconfig"></a> <a href="https://npm.im/get-tsconfig"><img src="https://badgen.net/npm/dm/get-tsconfig"></a> </h1> Find and parse `tsconfig.json` files. ### Features - Zero dependency (not even TypeScript) - T
- Lines: 235
- Characters: 6338

---

# Source: .\node_modules\glob\node_modules\brace-expansion\README.md

- Preview: # brace-expansion [Brace expansion](https://www.gnu.org/software/bash/manual/html_node/Brace-Expansion.html), as known from sh/bash, in JavaScript. [![build status](https://secure.travis-ci.org/juliangruber/brace-expansion.svg)](http://travis-ci.org/juliangruber/brace-expansion) [![downloads](https://img.shields.io/npm/dm/brace-expansion.svg)](https://www.npmjs.org/package/brace-expansion) [![Gree
- Lines: 138
- Characters: 4117

---

# Source: .\node_modules\glob\node_modules\minimatch\README.md

- Preview: # minimatch A minimal matching utility. This is the matching library used internally by npm. It works by converting glob expressions into JavaScript `RegExp` objects. ## Usage ```js // hybrid module, load with require() or import import { minimatch } from 'minimatch' // or: const { minimatch } = require('minimatch') minimatch('bar.foo', '*.foo') // true! minimatch('bar.foo', '*.bar') // false! min
- Lines: 457
- Characters: 16486

---

# Source: .\node_modules\glob\README.md

- Preview: # Glob Match files using the patterns the shell uses. The most correct and second fastest glob implementation in JavaScript. (See **Comparison to Other JavaScript Glob Implementations** at the bottom of this readme.) ![a fun cartoon logo made of glob characters](https://github.com/isaacs/node-glob/raw/main/logo/glob.png) ## Usage Install with npm ``` npm i glob ``` **Note** the npm package name is
- Lines: 1266
- Characters: 47112

---

# Source: .\node_modules\globals\readme.md

- Preview: # globals > Global identifiers from different JavaScript environments It's just a [JSON file](globals.json), so you can use it in any environment. This package is used by ESLint 8 and earlier. For ESLint 9 and later, you should depend on this package directly in [your ESLint config](https://eslint.org/docs/latest/use/configure/language-options#predefined-global-variables). ## Install ```sh npm ins
- Lines: 45
- Characters: 1579

---

# Source: .\node_modules\globalthis\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.4](https://github.com/es-shims/globalThis/compare/v1.0.3...v1.0.4) - 2024-04-29 ### Commits - [actions] remove redundant finisher [`280d796`](
- Lines: 112
- Characters: 11776

---

# Source: .\node_modules\globalthis\README.md

- Preview: # globalThis <sup>[![Version Badge][npm-version-svg]][npm-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][npm-url] An ECMAScript sp
- Lines: 73
- Characters: 2646

---

# Source: .\node_modules\glob-parent\README.md

- Preview: <p align="center"> <a href="https://gulpjs.com"> <img height="257" width="114" src="https://raw.githubusercontent.com/gulpjs/artwork/master/gulp-2x.png"> </a> </p> # glob-parent [![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][ci-image]][ci-url] [![Coveralls Status][coveralls-image]][coveralls-url] Extract the non-magic parent path from a glob string.
- Lines: 137
- Characters: 4064

---

# Source: .\node_modules\goober\prefixer\README.md

- Preview: # goober-autoprefixer A css autoprefixer for [🥜goober](https://github.com/cristianbote/goober) using [style-vendorizer](https://github.com/kripod/style-vendorizer). ## Install `npm install --save goober` ## How to use it This packages exports a `prefix` function that needs to be passed to goober's `setup` function like this: ```jsx import React from 'react'; import { setup } from 'goober'; import
- Lines: 23
- Characters: 507

---

# Source: .\node_modules\goober\README.md

- Preview: <p align="center"> <img src="./goober_cover.png" width="500" alt="goober" /> </p> 🥜 goober, a less than 1KB css-in-js solution. [![Backers on Open Collective](https://opencollective.com/goober/backers/badge.svg)](#backers) [![Sponsors on Open Collective](https://opencollective.com/goober/sponsors/badge.svg)](#sponsors) [![version](https://img.shields.io/npm/v/goober)](https://www.npmjs.com/packag
- Lines: 860
- Characters: 23959

---

# Source: .\node_modules\google-auth-library\CHANGELOG.md

- Preview: # Changelog [npm history][1] [1]: https://www.npmjs.com/package/google-auth-library?activeTab=versions ## [9.15.1](https://github.com/googleapis/google-auth-library-nodejs/compare/v9.15.0...v9.15.1) (2025-01-24) ### Bug Fixes * Resolve typo in document ([#1901](https://github.com/googleapis/google-auth-library-nodejs/issues/1901)) ([12f2c87](https://github.com/googleapis/google-auth-library-nodejs
- Lines: 1397
- Characters: 89722

---

# Source: .\node_modules\google-auth-library\README.md

- Preview: [//]: # "This README.md file is auto-generated, all changes to this file will be lost." [//]: # "To regenerate it, use `python -m synthtool`." <img src="https://avatars2.githubusercontent.com/u/2810941?v=3&s=96" alt="Google Cloud Platform logo" title="Google Cloud Platform" align="right" height="96" width="96"/> # [Google Auth Library: Node.js Client](https://github.com/googleapis/google-auth-libr
- Lines: 1473
- Characters: 79926

---

# Source: .\node_modules\gopd\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.2.0](https://github.com/ljharb/gopd/compare/v1.1.0...v1.2.0) - 2024-12-03 ### Commits - [New] add `gOPD` entry point; remove `get-intrinsic` [`5
- Lines: 48
- Characters: 3032

---

# Source: .\node_modules\gopd\README.md

- Preview: # gopd <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] `Object.getOwnPropertyDescriptor`, but accounts for IE's broken implementation. ## Usage ```javascript var gOPD
- Lines: 43
- Characters: 1522

---

# Source: .\node_modules\graceful-fs\README.md

- Preview: # graceful-fs graceful-fs functions as a drop-in replacement for the fs module, making various improvements. The improvements are meant to normalize behavior across different platforms and environments, and to make filesystem access more resilient to errors. ## Improvements over [fs module](https://nodejs.org/api/fs.html) * Queues up `open` and `readdir` calls, and retries them once something clos
- Lines: 146
- Characters: 4598

---

# Source: .\node_modules\graphemer\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [1.3.0] - 2021-12-13 ### Added - Updated to include support for Unicode 14 ## [1.2.0] - 2021-01-29 ### Updated - Refactored to increase speed ## [1
- Lines: 33
- Characters: 671

---

# Source: .\node_modules\graphemer\README.md

- Preview: # Graphemer: Unicode Character Splitter 🪓 ## Introduction This library continues the work of [Grapheme Splitter](https://github.com/orling/grapheme-splitter) and supports the following unicode versions: - Unicode 15 and below `[v1.4.0]` - Unicode 14 and below `[v1.3.0]` - Unicode 13 and below `[v1.1.0]` - Unicode 11 and below `[v1.0.0]` (Unicode 10 supported by `grapheme-splitter`) In JavaScript
- Lines: 135
- Characters: 5488

---

# Source: .\node_modules\graphql\README.md

- Preview: [![GraphQLConf 2025 Banner: September 08-10, Amsterdam. Hosted by the GraphQL Foundation](./assets/graphql-conf-2025.png)](https://graphql.org/conf/2025/?utm_source=github&utm_medium=graphql_js&utm_campaign=readme) # GraphQL.js The JavaScript reference implementation for GraphQL, a query language for APIs created by Facebook. [![npm version](https://badge.fury.io/js/graphql.svg)](https://badge.fur
- Lines: 163
- Characters: 5976

---

# Source: .\node_modules\graphql-tag\CHANGELOG.md

- Preview: # Change log ### v2.12.6 * Update peer dependencies to allow `graphql` ^16.0.0. <br/> [@brainkim](https://github.com/brainkim) in [#530](https://github.com/apollographql/graphql-tag/pull/530) ### v2.12.5 * Also publish `src/` directory to npm, enabling source maps. <br/> [@maclockard](https://github.com/maclockard) in [#403](https://github.com/apollographql/graphql-tag/pull/403) ### v2.12.4 (2021-
- Lines: 239
- Characters: 8554

---

# Source: .\node_modules\graphql-tag\README.md

- Preview: # graphql-tag [![npm version](https://badge.fury.io/js/graphql-tag.svg)](https://badge.fury.io/js/graphql-tag) [![Build Status](https://travis-ci.org/apollographql/graphql-tag.svg?branch=master)](https://travis-ci.org/apollographql/graphql-tag) [![Get on Slack](https://img.shields.io/badge/slack-join-orange.svg)](http://www.apollodata.com/#slack) Helpful utilities for parsing GraphQL queries. Incl
- Lines: 254
- Characters: 7685

---

# Source: .\node_modules\gtoken\CHANGELOG.md

- Preview: # Changelog [npm history][1] [1]: https://www.npmjs.com/package/gtoken?activeTab=versions ## [7.1.0](https://github.com/googleapis/node-gtoken/compare/v7.0.1...v7.1.0) (2024-02-01) ### Features * Enable Token Retries ([#481](https://github.com/googleapis/node-gtoken/issues/481)) ([ed9f91e](https://github.com/googleapis/node-gtoken/commit/ed9f91e4764744426de95fd2510b68ee53677514)) ## [7.0.1](https:
- Lines: 375
- Characters: 18889

---

# Source: .\node_modules\gtoken\README.md

- Preview: <img src="https://avatars2.githubusercontent.com/u/2810941?v=3&s=96" alt="Google Cloud Platform logo" title="Google Cloud Platform" align="right" height="96" width="96"/> # [node-gtoken](https://github.com/googleapis/node-gtoken) [![npm version][npm-image]][npm-url] [![Known Vulnerabilities][snyk-image]][snyk-url] [![codecov][codecov-image]][codecov-url] [![Code Style: Google][gts-image]][gts-url]
- Lines: 190
- Characters: 5340

---

# Source: .\node_modules\has-bigints\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.0](https://github.com/inspect-js/has-bigints/compare/v1.0.2...v1.1.0) - 2024-12-18 ### Commits - [meta] use `npmignore` to autogenerate an npm
- Lines: 77
- Characters: 7725

---

# Source: .\node_modules\has-bigints\README.md

- Preview: # has-bigints <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Determi
- Lines: 42
- Characters: 1690

---

# Source: .\node_modules\has-flag\readme.md

- Preview: # has-flag [![Build Status](https://travis-ci.org/sindresorhus/has-flag.svg?branch=master)](https://travis-ci.org/sindresorhus/has-flag) > Check if [`argv`](https://nodejs.org/docs/latest/api/process.html#process_process_argv) has a specific flag Correctly stops looking after an `--` argument terminator. <div align="center"> <b> <a href="https://tidelift.com/subscription/pkg/npm-has-flag?utm_sourc
- Lines: 90
- Characters: 1504

---

# Source: .\node_modules\hasown\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v2.0.2](https://github.com/inspect-js/hasOwn/compare/v2.0.1...v2.0.2) - 2024-03-10 ### Commits - [types] use shared config [`68e9d4d`](https://gith
- Lines: 43
- Characters: 2539

---

# Source: .\node_modules\hasown\README.md

- Preview: # hasown <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] A robust, ES3 compatible, "has own property" predicate. ## Example ```js const assert = require('assert'); con
- Lines: 43
- Characters: 1573

---

# Source: .\node_modules\has-property-descriptors\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.2](https://github.com/inspect-js/has-property-descriptors/compare/v1.0.1...v1.0.2) - 2024-02-12 ### Commits - [Refactor] use `es-define-proper
- Lines: 38
- Characters: 2613

---

# Source: .\node_modules\has-property-descriptors\README.md

- Preview: # has-property-descriptors <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package
- Lines: 46
- Characters: 2163

---

# Source: .\node_modules\has-proto\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.2.0](https://github.com/inspect-js/has-proto/compare/v1.1.0...v1.2.0) - 2024-12-06 ### Commits - [Refactor] use `dunder-proto` instead of `call-
- Lines: 64
- Characters: 4231

---

# Source: .\node_modules\has-proto\README.md

- Preview: # has-proto <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Does this environment have the ability to set the [[Prototype]] of an object on creation with `__proto__`?
- Lines: 60
- Characters: 1995

---

# Source: .\node_modules\has-symbols\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.0](https://github.com/inspect-js/has-symbols/compare/v1.0.3...v1.1.0) - 2024-12-02 ### Commits - [actions] update workflows [`548c0bf`](https:
- Lines: 94
- Characters: 9340

---

# Source: .\node_modules\has-symbols\README.md

- Preview: # has-symbols <sup>[![Version Badge][2]][1]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Determine if the JS environment has Symbol support. Supports spec, or shams. ## Example
- Lines: 49
- Characters: 1998

---

# Source: .\node_modules\has-tostringtag\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.2](https://github.com/inspect-js/has-tostringtag/compare/v1.0.1...v1.0.2) - 2024-02-01 ### Fixed - [Fix] move `has-symbols` back to prod deps
- Lines: 45
- Characters: 3501

---

# Source: .\node_modules\has-tostringtag\README.md

- Preview: # has-tostringtag <sup>[![Version Badge][2]][1]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Determine if the JS environment has `Symbol.toStringTag` support. Supports spec, or
- Lines: 49
- Characters: 2144

---

# Source: .\node_modules\hastscript\readme.md

- Preview: # hastscript [![Build][badge-build-image]][badge-build-url] [![Coverage][badge-coverage-image]][badge-coverage-url] [![Downloads][badge-downloads-image]][badge-downloads-url] [![Size][badge-size-image]][badge-size-url] [hast][github-hast] utility to create trees with ease. ## Contents * [What is this?](#what-is-this) * [When should I use this?](#when-should-i-use-this) * [Install](#install) * [Use
- Lines: 480
- Characters: 11024

---

# Source: .\node_modules\hast-util-embedded\readme.md

- Preview: # hast-util-embedded [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [hast][] utility to check if a node is [*embedded content*][spec]. ## Contents *   [What is this?](#what-is-this) *   [When sho
- Lines: 230
- Characters: 6803

---

# Source: .\node_modules\hast-util-format\readme.md

- Preview: # hast-util-format [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [hast][] utility to format whitespace in HTML. ## Contents * [What is this?](#what-is-this) * [When should I use this?](#when-sho
- Lines: 252
- Characters: 5866

---

# Source: .\node_modules\hast-util-from-dom\readme.md

- Preview: # hast-util-from-dom [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [hast][] utility to transform from a [DOM][] tree. ## Contents * [What is this?](#what-is-this) * [When should I use this?](#wh
- Lines: 267
- Characters: 6470

---

# Source: .\node_modules\hast-util-from-html\readme.md

- Preview: # hast-util-from-html [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [hast][] utility that turns HTML into a syntax tree. ## Contents * [What is this?](#what-is-this) * [When should I use this?](
- Lines: 597
- Characters: 31048

---

# Source: .\node_modules\hast-util-from-parse5\readme.md

- Preview: # hast-util-from-parse5 [![Build][badge-build-image]][badge-build-url] [![Coverage][badge-coverage-image]][badge-coverage-url] [![Downloads][badge-downloads-image]][badge-downloads-url] [![Size][badge-size-image]][badge-size-url] [hast][github-hast] utility to transform from the [`parse5`][github-parse5] AST. ## Contents * [What is this?](#what-is-this) * [When should I use this?](#when-should-i-u
- Lines: 337
- Characters: 8126

---

# Source: .\node_modules\hast-util-has-property\readme.md

- Preview: # hast-util-has-property [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [hast][] utility to check if an element has a certain property. ## Contents *   [What is this?](#what-is-this) *   [When sh
- Lines: 231
- Characters: 6772

---

# Source: .\node_modules\hast-util-is-body-ok-link\readme.md

- Preview: <!--This file is generated--> # hast-util-is-body-ok-link [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][funding-sponsors-badge]][funding] [![Backers][funding-backers-badge]][funding] [![Chat][chat-badge]][chat] [`hast`][hast] utility to check if a `link` element is “body OK”. ## Contents *
- Lines: 196
- Characters: 4773

---

# Source: .\node_modules\hast-util-is-element\readme.md

- Preview: # hast-util-is-element [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [hast][] utility to check if a node is a (certain) element. ## Contents *   [What is this?](#what-is-this) *   [When should I
- Lines: 330
- Characters: 9732

---

# Source: .\node_modules\hast-util-minify-whitespace\readme.md

- Preview: <!--This file is generated--> # hast-util-minify-whitespace [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][funding-sponsors-badge]][funding] [![Backers][funding-backers-badge]][funding] [![Chat][chat-badge]][chat] [`hast`][hast] utility to minify whitespace between elements. ## Contents * [W
- Lines: 216
- Characters: 4958

---

# Source: .\node_modules\hast-util-parse-selector\readme.md

- Preview: # hast-util-parse-selector [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [hast][] utility to create an element from a simple CSS selector. ## Contents *   [What is this?](#what-is-this) *   [Whe
- Lines: 206
- Characters: 5355

---

# Source: .\node_modules\hast-util-phrasing\readme.md

- Preview: # hast-util-phrasing [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [hast][] utility to check if a node is [*phrasing*][spec] content. ## Contents *   [What is this?](#what-is-this) *   [When sho
- Lines: 241
- Characters: 6786

---

# Source: .\node_modules\hast-util-raw\readme.md

- Preview: # hast-util-raw [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [hast][] utility to parse the tree and semistandard `raw` nodes (strings of HTML) again, keeping positional info okay. ## Contents *
- Lines: 291
- Characters: 7731

---

# Source: .\node_modules\hast-util-sanitize\readme.md

- Preview: # hast-util-sanitize [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [hast][] utility to make trees safe. ## Contents * [What is this?](#what-is-this) * [When should I use this?](#when-should-i-us
- Lines: 473
- Characters: 10933

---

# Source: .\node_modules\hast-util-to-html\readme.md

- Preview: # hast-util-to-html [![Build][badge-build-image]][badge-build-url] [![Coverage][badge-coverage-image]][badge-coverage-url] [![Downloads][badge-downloads-image]][badge-downloads-url] [![Size][badge-size-image]][badge-size-url] [hast][github-hast] utility to serialize hast as HTML. ## Contents * [What is this?](#what-is-this) * [When should I use this?](#when-should-i-use-this) * [Install](#install)
- Lines: 489
- Characters: 11316

---

# Source: .\node_modules\hast-util-to-jsx-runtime\readme.md

- Preview: # hast-util-to-jsx-runtime [![Build][badge-build-image]][badge-build-url] [![Coverage][badge-coverage-image]][badge-coverage-url] [![Downloads][badge-downloads-image]][badge-downloads-url] [![Size][badge-size-image]][badge-size-url] hast utility to transform a tree to preact, react, solid, svelte, vue, etcetera, with an automatic JSX runtime. ## Contents * [What is this?](#what-is-this) * [When sh
- Lines: 889
- Characters: 19769

---

# Source: .\node_modules\hast-util-to-mdast\readme.md

- Preview: # hast-util-to-mdast [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [hast][] utility to transform to [mdast][]. ## Contents * [What is this?](#what-is-this) * [When should I use this?](#when-shou
- Lines: 540
- Characters: 13784

---

# Source: .\node_modules\hast-util-to-parse5\node_modules\property-information\readme.md

- Preview: # property-information [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Info on the properties and attributes of the web platform (HTML, SVG, ARIA, XML, XMLNS, XLink). ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#us
- Lines: 996
- Characters: 61920

---

# Source: .\node_modules\hast-util-to-parse5\readme.md

- Preview: # hast-util-to-parse5 [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [hast][] utility to transform to a [`parse5`][parse5] [AST][parse5-node]. ## Contents *   [What is this?](#what-is-this) *   [
- Lines: 247
- Characters: 6079

---

# Source: .\node_modules\hast-util-to-text\readme.md

- Preview: # hast-util-to-text [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [hast][] utility to get the plain-text value of a node. ## Contents * [What is this?](#what-is-this) * [When should I use this?]
- Lines: 288
- Characters: 7674

---

# Source: .\node_modules\hast-util-whitespace\readme.md

- Preview: # hast-util-whitespace [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [hast][] utility to check if a node is [*inter-element whitespace*][spec]. ## Contents *   [What is this?](#what-is-this) *
- Lines: 234
- Characters: 6866

---

# Source: .\node_modules\highlight.js\README.md

- Preview: # Highlight.js [![latest version](https://badgen.net/npm/v/highlight.js?label=latest)](https://www.npmjs.com/package/highlight.js) [![slack](https://badgen.net/badge/icon/slack?icon=slack&label&color=pink)](https://join.slack.com/t/highlightjs/shared_invite/zt-mj0utgqp-TNFf4VQICnDnPg4zMHChFw) [![discord](https://badgen.net/badge/icon/discord?icon=discord&label&color=pink)](https://discord.gg/M24Eb
- Lines: 374
- Characters: 14381

---

# Source: .\node_modules\highlightjs-vue\README.md

- Preview: `highlight.js` syntax definition for Vue. Support for single-file [Vue.js](https://vuejs.org/) components. The files with `.vue` extension allow to write html, javascript/typescript and styles in the same file. ### Usage Simply include the `highlight.js` script package in your webpage or node app, load up this module and apply it to `hljs`. If you're not using a build system and just want to embed
- Lines: 36
- Characters: 1006

---

# Source: .\node_modules\hosted-git-info\CHANGELOG.md

- Preview: # Change Log All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines. <a name="2.8.9"></a> ## [2.8.9](https://github.com/npm/hosted-git-info/compare/v2.8.8...v2.8.9) (2021-04-07) ### Bug Fixes * backport regex fix from [#76](https://github.com/npm/hosted-git-info/issues/76) ([29adf
- Lines: 154
- Characters: 6018

---

# Source: .\node_modules\hosted-git-info\README.md

- Preview: # hosted-git-info This will let you identify and transform various git hosts URLs between protocols.  It also can tell you what the URL is for the raw path for particular file for direct access without git. ## Example ```javascript var hostedGitInfo = require("hosted-git-info") var info = hostedGitInfo.fromUrl("git@github.com:npm/hosted-git-info.git", opts) /* info looks like: { type: "github", do
- Lines: 136
- Characters: 4093

---

# Source: .\node_modules\html-encoding-sniffer\README.md

- Preview: # Determine the Encoding of a HTML Byte Stream This package implements the HTML Standard's [encoding sniffing algorithm](https://html.spec.whatwg.org/multipage/syntax.html#encoding-sniffing-algorithm) in all its glory. The most interesting part of this is how it pre-scans the first 1024 bytes in order to search for certain `<meta charset>`-related patterns. ```js const htmlEncodingSniffer = requir
- Lines: 43
- Characters: 2182

---

# Source: .\node_modules\htmlparser2\node_modules\entities\readme.md

- Preview: # entities [![NPM version](https://img.shields.io/npm/v/entities.svg)](https://npmjs.org/package/entities) [![Downloads](https://img.shields.io/npm/dm/entities.svg)](https://npmjs.org/package/entities) [![Node.js CI](https://github.com/fb55/entities/actions/workflows/nodejs-test.yml/badge.svg)](https://github.com/fb55/entities/actions/workflows/nodejs-test.yml) Encode & decode HTML & XML entities
- Lines: 122
- Characters: 4883

---

# Source: .\node_modules\htmlparser2\README.md

- Preview: # htmlparser2 [![NPM version](https://img.shields.io/npm/v/htmlparser2.svg)](https://npmjs.org/package/htmlparser2) [![Downloads](https://img.shields.io/npm/dm/htmlparser2.svg)](https://npmjs.org/package/htmlparser2) [![Node.js CI](https://github.com/fb55/htmlparser2/actions/workflows/nodejs-test.yml/badge.svg)](https://github.com/fb55/htmlparser2/actions/workflows/nodejs-test.yml) [![Coverage](ht
- Lines: 174
- Characters: 7417

---

# Source: .\node_modules\html-to-text\CHANGELOG.md

- Preview: # Changelog ## Version 9.0.5 * `htmlparser2` updated from 8.0.1 to 8.0.2 ([release notes](https://github.com/fb55/htmlparser2/releases)) - this fixes broken parsing in certain situations: [#285](https://github.com/html-to-text/node-html-to-text/issues/285); * `deepmerge` updated from 4.3.0 to 4.3.1 - no functional changes; * added a link to attribute selectors syntax to Readme. All commits: [9.0.4
- Lines: 402
- Characters: 16647

---

# Source: .\node_modules\html-to-text\node_modules\htmlparser2\README.md

- Preview: # htmlparser2 [![NPM version](https://img.shields.io/npm/v/htmlparser2.svg)](https://npmjs.org/package/htmlparser2) [![Downloads](https://img.shields.io/npm/dm/htmlparser2.svg)](https://npmjs.org/package/htmlparser2) [![Node.js CI](https://github.com/fb55/htmlparser2/actions/workflows/nodejs-test.yml/badge.svg)](https://github.com/fb55/htmlparser2/actions/workflows/nodejs-test.yml) [![Coverage](ht
- Lines: 175
- Characters: 7545

---

# Source: .\node_modules\html-to-text\README.md

- Preview: # html-to-text [![lint status](https://github.com/html-to-text/node-html-to-text/workflows/lint/badge.svg)](https://github.com/html-to-text/node-html-to-text/actions/workflows/lint.yml) [![test status](https://github.com/html-to-text/node-html-to-text/workflows/test/badge.svg)](https://github.com/html-to-text/node-html-to-text/actions/workflows/test.yml) [![License: MIT](https://img.shields.io/bad
- Lines: 364
- Characters: 21626

---

# Source: .\node_modules\html-url-attributes\readme.md

- Preview: <!--This file is generated--> # html-url-attributes [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][funding-sponsors-badge]][funding] [![Backers][funding-backers-badge]][funding] [![Chat][chat-badge]][chat] Utility with info on URL attributes. ## Contents * [What is this?](#what-is-this) * [W
- Lines: 183
- Characters: 4353

---

# Source: .\node_modules\html-void-elements\readme.md

- Preview: # html-void-elements [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] List of HTML void tag names. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`htmlVoidElements`](#htmlvoidelements) *   [T
- Lines: 167
- Characters: 3180

---

# Source: .\node_modules\html-whitespace-sensitive-tag-names\readme.md

- Preview: <!--This file is generated--> # html-whitespace-sensitive-tag-names [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][funding-sponsors-badge]][funding] [![Backers][funding-backers-badge]][funding] [![Chat][chat-badge]][chat] Utility with info on whitespace sensitive elements. ## Contents * [Wha
- Lines: 178
- Characters: 4461

---

# Source: .\node_modules\http-errors\HISTORY.md

- Preview: 2.0.0 / 2021-12-17 ================== * Drop support for Node.js 0.6 * Remove `I'mateapot` export; use `ImATeapot` instead * Remove support for status being non-first argument * Rename `UnorderedCollection` constructor to `TooEarly` * deps: depd@2.0.0 - Replace internal `eval` usage with `Function` constructor - Use instance methods on `process` to check for listeners * deps: statuses@2.0.1 - Fix
- Lines: 183
- Characters: 3793

---

# Source: .\node_modules\http-errors\node_modules\statuses\HISTORY.md

- Preview: 2.0.1 / 2021-01-03 ================== * Fix returning values from `Object.prototype` 2.0.0 / 2020-04-19 ================== * Drop support for Node.js 0.6 * Fix messaging casing of `418 I'm a Teapot` * Remove code 306 * Remove `status[code]` exports; use `status.message[code]` * Remove `status[msg]` exports; use `status.code[msg]` * Rename `425 Unordered Collection` to standard `425 Too Early` * Re
- Lines: 85
- Characters: 1464

---

# Source: .\node_modules\http-errors\node_modules\statuses\README.md

- Preview: # statuses [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Node.js Version][node-version-image]][node-version-url] [![Build Status][ci-image]][ci-url] [![Test Coverage][coveralls-image]][coveralls-url] HTTP status utility for node. This module provides a list of status codes and messages sourced from a few different projects: * The [IANA Status Code
- Lines: 139
- Characters: 3423

---

# Source: .\node_modules\http-errors\README.md

- Preview: # http-errors [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][node-url] [![Node.js Version][node-image]][node-url] [![Build Status][ci-image]][ci-url] [![Test Coverage][coveralls-image]][coveralls-url] Create HTTP errors for Express, Koa, Connect, etc. with ease. ## Install This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](
- Lines: 172
- Characters: 5793

---

# Source: .\node_modules\http-proxy-agent\README.md

- Preview: http-proxy-agent ================ ### An HTTP(s) proxy `http.Agent` implementation for HTTP This module provides an `http.Agent` implementation that connects to a specified HTTP or HTTPS proxy server, and can be used with the built-in `http` module. __Note:__ For HTTP proxy usage with the `https` module, check out [`https-proxy-agent`](../https-proxy-agent). Example ------- ```ts import * as http
- Lines: 46
- Characters: 1319

---

# Source: .\node_modules\https-proxy-agent\README.md

- Preview: https-proxy-agent ================ ### An HTTP(s) proxy `http.Agent` implementation for HTTPS This module provides an `http.Agent` implementation that connects to a specified HTTP or HTTPS proxy server, and can be used with the built-in `https` module. Specifically, this `Agent` implementation connects to an intermediary "proxy" server and issues the [CONNECT HTTP method][CONNECT], which tells the
- Lines: 72
- Characters: 2099

---

# Source: .\node_modules\iconv-lite\Changelog.md

- Preview: ## 0.6.3 / 2021-05-23 * Fix HKSCS encoding to prefer Big5 codes if both Big5 and HKSCS codes are possible (#264) ## 0.6.2 / 2020-07-08 * Support Uint8Array-s decoding without conversion to Buffers, plus fix an edge case. ## 0.6.1 / 2020-06-28 * Support Uint8Array-s directly when decoding (#246, by @gyzerok) * Unify package.json version ranges to be strictly semver-compatible (#241) * Fix minor iss
- Lines: 215
- Characters: 6369

---

# Source: .\node_modules\iconv-lite\README.md

- Preview: ## iconv-lite: Pure JS character encoding conversion * No need for native code compilation. Quick to install, works on Windows and in sandboxed environments like [Cloud9](http://c9.io). * Used in popular projects like [Express.js (body_parser)](https://github.com/expressjs/body-parser), [Grunt](http://gruntjs.com/), [Nodemailer](http://www.nodemailer.com/), [Yeoman](http://yeoman.io/) and others.
- Lines: 133
- Characters: 6220

---

# Source: .\node_modules\ieee754\README.md

- Preview: # ieee754 [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][downloads-url] [![javascript style guide][standard-image]][standard-url] [travis-image]: https://img.shields.io/travis/feross/ieee754/master.svg [travis-url]: https://travis-ci.org/feross/ieee754 [npm-image]: https://img.shields.io/npm/v/ieee754.svg [npm-url]: https://npmjs.org/package/ieee
- Lines: 54
- Characters: 1600

---

# Source: .\node_modules\ignore\README.md

- Preview: <table><thead> <tr> <th>Linux</th> <th>OS X</th> <th>Windows</th> <th>Coverage</th> <th>Downloads</th> </tr> </thead><tbody><tr> <td colspan="2" align="center"> <a href="https://github.com/kaelzhang/node-ignore/actions/workflows/nodejs.yml"> <img src="https://github.com/kaelzhang/node-ignore/actions/workflows/nodejs.yml/badge.svg" alt="Build Status" /></a> </td> <td align="center"> <a href="https:
- Lines: 415
- Characters: 11385

---

# Source: .\node_modules\import-fresh\readme.md

- Preview: # import-fresh > Import a module while bypassing the [cache](https://nodejs.org/api/modules.html#modules_caching) Useful for testing purposes when you need to freshly import a module. ## ESM For ESM, you can use this snippet: ```js const importFresh = moduleName => import(`${moduleName}?${Date.now()}`); const {default: foo} = await importFresh('foo'); ``` **This snippet causes a memory leak, so on
- Lines: 57
- Characters: 1091

---

# Source: .\node_modules\imurmurhash\README.md

- Preview: iMurmurHash.js ============== An incremental implementation of the MurmurHash3 (32-bit) hashing algorithm for JavaScript based on [Gary Court's implementation](https://github.com/garycourt/murmurhash-js) with [kazuyukitanimura's modifications](https://github.com/kazuyukitanimura/murmurhash-js). This version works significantly faster than the non-incremental version if you need to hash many small
- Lines: 120
- Characters: 4626

---

# Source: .\node_modules\indent-string\readme.md

- Preview: # indent-string [![Build Status](https://travis-ci.org/sindresorhus/indent-string.svg?branch=master)](https://travis-ci.org/sindresorhus/indent-string) > Indent each line in a string ## Install ``` $ npm install indent-string ``` ## Usage ```js const indentString = require('indent-string'); indentString('Unicorns\nRainbows', 4); //=> '    Unicorns\n    Rainbows' indentString('Unicorns\nRainbows',
- Lines: 73
- Characters: 1092

---

# Source: .\node_modules\inherits\README.md

- Preview: Browser-friendly inheritance fully compatible with standard node.js [inherits](http://nodejs.org/api/util.html#util_util_inherits_constructor_superconstructor). This package exports standard `inherits` from node.js `util` module in node environment, but also provides alternative browser-friendly implementation through [browser field](https://gist.github.com/shtylman/4339901). Alternative implement
- Lines: 45
- Characters: 1583

---

# Source: .\node_modules\inline-style-parser\README.md

- Preview: # inline-style-parser [![NPM](https://nodei.co/npm/inline-style-parser.png)](https://nodei.co/npm/inline-style-parser/) [![NPM version](https://badgen.net/npm/v/inline-style-parser)](https://www.npmjs.com/package/inline-style-parser) [![Bundlephobia minified + gzip](https://badgen.net/bundlephobia/minzip/inline-style-parser)](https://bundlephobia.com/package/inline-style-parser) [![build](https://
- Lines: 232
- Characters: 3993

---

# Source: .\node_modules\input-otp\README.md

- Preview: # The only accessible & unstyled & full featured Input OTP component in the Web. ### OTP Input for React 🔐 by [@guilhermerodz](https://twitter.com/guilherme_rodz) https://github.com/guilhermerodz/input-otp/assets/10366880/753751f5-eda8-4145-a4b9-7ef51ca5e453 ## Usage ```bash npm install input-otp ``` Then import the component. ```diff +'use client' +import { OTPInput } from 'input-otp' function M
- Lines: 514
- Characters: 13739

---

# Source: .\node_modules\install\README.md

- Preview: # install [![Build Status](https://travis-ci.org/benjamn/install.svg?branch=master)](https://travis-ci.org/benjamn/install) [![Greenkeeper badge](https://badges.greenkeeper.io/benjamn/install.svg)](https://greenkeeper.io/) The [CommonJS module syntax](http://wiki.commonjs.org/wiki/Modules/1.1) is one of the most widely accepted conventions in the JavaScript ecosystem. Everyone seems to agree that
- Lines: 124
- Characters: 4581

---

# Source: .\node_modules\internal-slot\CHANGELOG.md

- Preview: ### Changelog All notable changes to this project will be documented in this file. Dates are displayed in UTC. Generated by [`auto-changelog`](https://github.com/CookPete/auto-changelog). #### [v1.1.0](https://github.com/ljharb/internal-slot/compare/v1.0.7...v1.1.0) > 13 December 2024 - [New] add types [`295d25d`](https://github.com/ljharb/internal-slot/commit/295d25d55cfcb6ba1dd2520b36f4270c5a613
- Lines: 117
- Characters: 10484

---

# Source: .\node_modules\internal-slot\README.md

- Preview: # internal-slot <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Truly
- Lines: 61
- Characters: 2281

---

# Source: .\node_modules\ipaddr.js\README.md

- Preview: # ipaddr.js — an IPv6 and IPv4 address manipulation library [![Build Status](https://travis-ci.org/whitequark/ipaddr.js.svg)](https://travis-ci.org/whitequark/ipaddr.js) ipaddr.js is a small (1.9K minified and gzipped) library for manipulating IP addresses in JavaScript environments. It runs on both CommonJS runtimes (e.g. [nodejs]) and in a web browser. ipaddr.js allows you to verify and parse st
- Lines: 236
- Characters: 8074

---

# Source: .\node_modules\is-alphabetical\readme.md

- Preview: # is-alphabetical [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Check if a character is alphabetical. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`isAlphabetical(character|code)`](#isal
- Lines: 144
- Characters: 3392

---

# Source: .\node_modules\is-alphanumerical\readme.md

- Preview: # is-alphanumerical [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Check if a character is alphanumerical. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`isAlphanumerical(character)`](#isa
- Lines: 145
- Characters: 3450

---

# Source: .\node_modules\isarray\README.md

- Preview: # isarray `Array#isArray` for older browsers and deprecated Node.js versions. [![build status](https://secure.travis-ci.org/juliangruber/isarray.svg)](http://travis-ci.org/juliangruber/isarray) [![downloads](https://img.shields.io/npm/dm/isarray.svg)](https://www.npmjs.org/package/isarray) [![browser support](https://ci.testling.com/juliangruber/isarray.png) ](https://ci.testling.com/juliangruber/
- Lines: 41
- Characters: 1173

---

# Source: .\node_modules\is-array-buffer\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v3.0.5](https://github.com/fengyuanchen/is-array-buffer/compare/v3.0.4...v3.0.5) - 2024-12-16 ### Commits - [types] use shared config [`6180b31`](h
- Lines: 94
- Characters: 6037

---

# Source: .\node_modules\is-array-buffer\README.md

- Preview: # is-array-buffer <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Is this value a JS ArrayBuffer? This module works cross-realm/iframe, does not depend on `instanceof`
- Lines: 59
- Characters: 2349

---

# Source: .\node_modules\is-arrayish\README.md

- Preview: # node-is-arrayish [![Travis-CI.org Build Status](https://img.shields.io/travis/Qix-/node-is-arrayish.svg?style=flat-square)](https://travis-ci.org/Qix-/node-is-arrayish) [![Coveralls.io Coverage Rating](https://img.shields.io/coveralls/Qix-/node-is-arrayish.svg?style=flat-square)](https://coveralls.io/r/Qix-/node-is-arrayish) > Determines if an object can be used like an Array ## Example ```javas
- Lines: 19
- Characters: 688

---

# Source: .\node_modules\is-async-function\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v2.1.1](https://github.com/inspect-js/is-async-function/compare/v2.1.0...v2.1.1) - 2025-01-22 ### Fixed - [Refactor] use `async-function` for the e
- Lines: 192
- Characters: 12846

---

# Source: .\node_modules\is-async-function\README.md

- Preview: # is-async-function <sup>[![Version Badge][2]][1]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Is this a native `async function`? ## Example ```js var isAsyncFunction = require(
- Lines: 44
- Characters: 1706

---

# Source: .\node_modules\is-bigint\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.0](https://github.com/inspect-js/is-bigint/compare/v1.0.4...v1.1.0) - 2024-12-02 ### Commits - [actions] reuse common workflows [`0e63a44`](ht
- Lines: 94
- Characters: 9037

---

# Source: .\node_modules\is-bigint\README.md

- Preview: # is-bigint <sup>[![Version Badge][2]][1]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Is this an ES BigInt value? ## Example ```js var isBigInt = require('is-bigint'); assert(!
- Lines: 47
- Characters: 1579

---

# Source: .\node_modules\is-binary-path\readme.md

- Preview: # is-binary-path [![Build Status](https://travis-ci.org/sindresorhus/is-binary-path.svg?branch=master)](https://travis-ci.org/sindresorhus/is-binary-path) > Check if a file path is a binary file ## Install ``` $ npm install is-binary-path ``` ## Usage ```js const isBinaryPath = require('is-binary-path'); isBinaryPath('source/unicorn.png'); //=> true isBinaryPath('source/unicorn.txt'); //=> false `
- Lines: 37
- Characters: 698

---

# Source: .\node_modules\is-boolean-object\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.2.2](https://github.com/inspect-js/is-boolean-object/compare/v1.2.1...v1.2.2) - 2025-02-04 ### Fixed - [Fix] do not be tricked by fake Booleans
- Lines: 146
- Characters: 15911

---

# Source: .\node_modules\is-boolean-object\README.md

- Preview: # is-boolean-object <sup>[![Version Badge][2]][1]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Is this value a JS Boolean? This module works cross-realm/iframe, and despite ES6
- Lines: 60
- Characters: 2164

---

# Source: .\node_modules\is-buffer\README.md

- Preview: # is-buffer [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][downloads-url] [![javascript style guide][standard-image]][standard-url] [travis-image]: https://img.shields.io/travis/feross/is-buffer/master.svg [travis-url]: https://travis-ci.org/feross/is-buffer [npm-image]: https://img.shields.io/npm/v/is-buffer.svg [npm-url]: https://npmjs.org/pack
- Lines: 56
- Characters: 1691

---

# Source: .\node_modules\is-callable\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.2.7](https://github.com/inspect-js/is-callable/compare/v1.2.6...v1.2.7) - 2022-09-23 ### Commits - [Fix] recognize `document.all` in IE 6-10 [`0
- Lines: 161
- Characters: 8965

---

# Source: .\node_modules\is-callable\README.md

- Preview: # is-callable <sup>[![Version Badge][2]][1]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Is this JS value callable? Works with Functions and GeneratorFunctions, despite ES6 @@to
- Lines: 86
- Characters: 3467

---

# Source: .\node_modules\is-core-module\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v2.16.1](https://github.com/inspect-js/is-core-module/compare/v2.16.0...v2.16.1) - 2024-12-21 ### Fixed - [Fix] `node:sqlite` is available in node
- Lines: 221
- Characters: 15789

---

# Source: .\node_modules\is-core-module\README.md

- Preview: # is-core-module <sup>[![Version Badge][2]][1]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Is this specifier a node.js core module? Optionally provide a node version to check;
- Lines: 43
- Characters: 1619

---

# Source: .\node_modules\is-data-view\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.2](https://github.com/inspect-js/is-data-view/compare/v1.0.1...v1.0.2) - 2024-12-11 ### Commits - [types] use shared config [`3a80072`](https:
- Lines: 38
- Characters: 2648

---

# Source: .\node_modules\is-data-view\README.md

- Preview: # is-data-view <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Is this value a JS DataView? This module works cross-realm/iframe, does not depend on `instanceof` or mu
- Lines: 72
- Characters: 3060

---

# Source: .\node_modules\is-date-object\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.0](https://github.com/inspect-js/is-date-object/compare/v1.0.5...v1.1.0) - 2024-12-12 ### Commits - [actions] reuse common workflows [`35c5af0
- Lines: 137
- Characters: 15223

---

# Source: .\node_modules\is-date-object\README.md

- Preview: # is-date-object <sup>[![Version Badge][2]][1]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Is this value a JS Date object? This module works cross-realm/iframe, and despite ES6
- Lines: 55
- Characters: 1912

---

# Source: .\node_modules\is-decimal\readme.md

- Preview: # is-decimal [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Check if a character is a decimal. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`isDecimal(character|code)`](#isdecimalcharacte
- Lines: 142
- Characters: 3161

---

# Source: .\node_modules\is-docker\readme.md

- Preview: # is-docker > Check if the process is running inside a Docker container ## Install ``` $ npm install is-docker ``` ## Usage ```js const isDocker = require('is-docker'); if (isDocker()) { console.log('Running inside a Docker container'); } ``` ## CLI ``` $ is-docker ``` Exits with code 0 if inside a Docker container and 2 if not.
- Lines: 30
- Characters: 314

---

# Source: .\node_modules\isexe\README.md

- Preview: # isexe Minimal module to check if a file is executable, and a normal file. Uses `fs.stat` and tests against the `PATHEXT` environment variable on Windows. ## USAGE ```javascript var isexe = require('isexe') isexe('some-file-name', function (err, isExe) { if (err) { console.error('probably file does not exist or something', err) } else if (isExe) { console.error('this thing can be run') } else { c
- Lines: 54
- Characters: 1344

---

# Source: .\node_modules\is-extglob\README.md

- Preview: # is-extglob [![NPM version](https://img.shields.io/npm/v/is-extglob.svg?style=flat)](https://www.npmjs.com/package/is-extglob) [![NPM downloads](https://img.shields.io/npm/dm/is-extglob.svg?style=flat)](https://npmjs.org/package/is-extglob) [![Build Status](https://img.shields.io/travis/jonschlinkert/is-extglob.svg?style=flat)](https://travis-ci.org/jonschlinkert/is-extglob) > Returns true if a s
- Lines: 110
- Characters: 3360

---

# Source: .\node_modules\is-finalizationregistry\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.1](https://github.com/inspect-js/is-finalizationregistry/compare/v1.1.0...v1.1.1) - 2024-12-16 ### Commits - [actions] re-add finishers [`0f41
- Lines: 81
- Characters: 8282

---

# Source: .\node_modules\is-finalizationregistry\README.md

- Preview: # is-finalizationregistry <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-
- Lines: 57
- Characters: 2574

---

# Source: .\node_modules\is-fullwidth-code-point\readme.md

- Preview: # is-fullwidth-code-point [![Build Status](https://travis-ci.org/sindresorhus/is-fullwidth-code-point.svg?branch=master)](https://travis-ci.org/sindresorhus/is-fullwidth-code-point) > Check if the character represented by a given [Unicode code point](https://en.wikipedia.org/wiki/Code_point) is [fullwidth](https://en.wikipedia.org/wiki/Halfwidth_and_fullwidth_forms) ## Install ``` $ npm install is
- Lines: 42
- Characters: 801

---

# Source: .\node_modules\is-generator-function\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.2](https://github.com/inspect-js/is-generator-function/compare/v1.1.1...v1.1.2) - 2025-09-30 ### Fixed - [Fix] fix broken logic [`#45`](https:
- Lines: 257
- Characters: 25899

---

# Source: .\node_modules\is-generator-function\README.md

- Preview: # is-generator-function <sup>[![Version Badge][2]][1]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Is this a native generator function? ## Example ```js var isGeneratorFunction
- Lines: 43
- Characters: 1741

---

# Source: .\node_modules\is-glob\README.md

- Preview: # is-glob [![NPM version](https://img.shields.io/npm/v/is-glob.svg?style=flat)](https://www.npmjs.com/package/is-glob) [![NPM monthly downloads](https://img.shields.io/npm/dm/is-glob.svg?style=flat)](https://npmjs.org/package/is-glob) [![NPM total downloads](https://img.shields.io/npm/dt/is-glob.svg?style=flat)](https://npmjs.org/package/is-glob) [![Build Status](https://img.shields.io/github/work
- Lines: 209
- Characters: 6933

---

# Source: .\node_modules\is-hexadecimal\readme.md

- Preview: # is-hexadecimal [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Check if a character is hexadecimal. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`isHexadecimal(character|code)`](#ishexad
- Lines: 144
- Characters: 3386

---

# Source: .\node_modules\is-map\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v2.0.3](https://github.com/inspect-js/is-map/compare/v2.0.2...v2.0.3) - 2024-03-08 ### Commits - [actions] reuse common workflows [`ce10d0f`](https
- Lines: 92
- Characters: 8301

---

# Source: .\node_modules\is-map\README.md

- Preview: # is-map <sup>[![Version Badge][2]][1]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Is this value a JS Map? This module works cross-realm/iframe, and despite ES6 @@toStringTag.
- Lines: 55
- Characters: 1741

---

# Source: .\node_modules\is-negative-zero\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v2.0.3](https://github.com/inspect-js/is-negative-zero/compare/v2.0.2...v2.0.3) - 2024-02-19 ### Commits - add types [`e28f0d5`](https://github.com
- Lines: 150
- Characters: 15484

---

# Source: .\node_modules\is-negative-zero\README.md

- Preview: # is-negative-zero <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Is
- Lines: 57
- Characters: 2200

---

# Source: .\node_modules\is-number\README.md

- Preview: # is-number [![NPM version](https://img.shields.io/npm/v/is-number.svg?style=flat)](https://www.npmjs.com/package/is-number) [![NPM monthly downloads](https://img.shields.io/npm/dm/is-number.svg?style=flat)](https://npmjs.org/package/is-number) [![NPM total downloads](https://img.shields.io/npm/dt/is-number.svg?style=flat)](https://npmjs.org/package/is-number) [![Linux Build Status](https://img.sh
- Lines: 190
- Characters: 6318

---

# Source: .\node_modules\is-number-object\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.1](https://github.com/inspect-js/is-number-object/compare/v1.1.0...v1.1.1) - 2024-12-15 ### Commits - [Dev Deps] update `@arethetypeswrong/cli
- Lines: 152
- Characters: 15818

---

# Source: .\node_modules\is-number-object\README.md

- Preview: # is-number-object <sup>[![Version Badge][2]][1]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Is this value a JS Number object? This module works cross-realm/iframe, and despite
- Lines: 58
- Characters: 2063

---

# Source: .\node_modules\isobject\README.md

- Preview: # isobject [![NPM version](https://img.shields.io/npm/v/isobject.svg?style=flat)](https://www.npmjs.com/package/isobject) [![NPM monthly downloads](https://img.shields.io/npm/dm/isobject.svg?style=flat)](https://npmjs.org/package/isobject)  [![NPM total downloads](https://img.shields.io/npm/dt/isobject.svg?style=flat)](https://npmjs.org/package/isobject) [![Linux Build Status](https://img.shields.
- Lines: 125
- Characters: 3840

---

# Source: .\node_modules\isomorphic.js\README.md

- Preview: # Isomorphic.js This module provides platform-specific features as a common API. This module is mainly about providing crypto features to node, browser, and non-supported platforms using a polyfill.
- Lines: 6
- Characters: 197

---

# Source: .\node_modules\is-plain-obj\readme.md

- Preview: # is-plain-obj > Check if a value is a plain object An object is plain if it's created by either `{}`, `new Object()`, or `Object.create(null)`. ## Install ``` $ npm install is-plain-obj ``` ## Usage ```js import isPlainObject from 'is-plain-obj'; import {runInNewContext} from 'node:vm'; isPlainObject({foo: 'bar'}); //=> true isPlainObject(new Object()); //=> true isPlainObject(Object.create(null)
- Lines: 60
- Characters: 1175

---

# Source: .\node_modules\is-plain-object\README.md

- Preview: # is-plain-object [![NPM version](https://img.shields.io/npm/v/is-plain-object.svg?style=flat)](https://www.npmjs.com/package/is-plain-object) [![NPM monthly downloads](https://img.shields.io/npm/dm/is-plain-object.svg?style=flat)](https://npmjs.org/package/is-plain-object) [![NPM total downloads](https://img.shields.io/npm/dt/is-plain-object.svg?style=flat)](https://npmjs.org/package/is-plain-obj
- Lines: 107
- Characters: 3495

---

# Source: .\node_modules\is-potential-custom-element-name\README.md

- Preview: # is-potential-custom-element-name [![Build status](https://travis-ci.org/mathiasbynens/is-potential-custom-element-name.svg?branch=master)](https://travis-ci.org/mathiasbynens/is-potential-custom-element-name) _is-potential-custom-element-name_ checks whether a given string matches [the `PotentialCustomElementName` production](https://html.spec.whatwg.org/multipage/scripting.html#prod-potentialcu
- Lines: 43
- Characters: 1280

---

# Source: .\node_modules\is-promise\readme.md

- Preview: <a href="https://promisesaplus.com/"><img src="https://promisesaplus.com/assets/logo-small.png" align="right" /></a> # is-promise Test whether an object looks like a promises-a+ promise [![Build Status](https://img.shields.io/travis/then/is-promise/master.svg)](https://travis-ci.org/then/is-promise) [![Dependency Status](https://img.shields.io/david/then/is-promise.svg)](https://david-dm.org/then/
- Lines: 36
- Characters: 831

---

# Source: .\node_modules\is-regex\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.2.1](https://github.com/inspect-js/is-regex/compare/v1.2.0...v1.2.1) - 2024-12-11 ### Commits - [Refactor] use `call-bound` directly [`dbabfe3`]
- Lines: 236
- Characters: 23234

---

# Source: .\node_modules\is-regex\README.md

- Preview: # is-regex <sup>[![Version Badge][2]][1]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Is this value a JS regex? This module works cross-realm/iframe, and despite ES6 @@toStringT
- Lines: 55
- Characters: 1785

---

# Source: .\node_modules\is-set\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v2.0.3](https://github.com/inspect-js/is-set/compare/v2.0.2...v2.0.3) - 2024-03-08 ### Commits - [actions] reuse common workflows [`9d26ac6`](https
- Lines: 84
- Characters: 7740

---

# Source: .\node_modules\is-set\README.md

- Preview: # is-set <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Is this value a JS Set? This module works cross-realm/iframe, and despite ES6 @@toStringTag. ## Example ```js
- Lines: 53
- Characters: 1797

---

# Source: .\node_modules\is-shared-array-buffer\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.4](https://github.com/inspect-js/is-shared-array-buffer/compare/v1.0.3...v1.0.4) - 2024-12-18 ### Commits - [types] use shared config [`296641
- Lines: 78
- Characters: 7931

---

# Source: .\node_modules\is-shared-array-buffer\README.md

- Preview: # is-shared-array-buffer <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Is this value a JS SharedArrayBuffer? This module works cross-realm/iframe, does not depend on
- Lines: 59
- Characters: 2581

---

# Source: .\node_modules\is-stream\readme.md

- Preview: # is-stream > Check if something is a [Node.js stream](https://nodejs.org/api/stream.html) ## Install ``` $ npm install is-stream ``` ## Usage ```js const fs = require('fs'); const isStream = require('is-stream'); isStream(fs.createReadStream('unicorn.png')); //=> true isStream({}); //=> false ``` ## API ### isStream(stream) Returns a `boolean` for whether it's a [`Stream`](https://nodejs.org/api/
- Lines: 62
- Characters: 1558

---

# Source: .\node_modules\is-string\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Generated by [`auto-changelog`](https://github.com/CookPete/auto-changelog). ## [v1.1.1](https://github.com/inspect-js/is-string/compare/v1.1.0...v1.1.
- Lines: 149
- Characters: 14386

---

# Source: .\node_modules\is-string\README.md

- Preview: # is-string <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Is this v
- Lines: 59
- Characters: 2160

---

# Source: .\node_modules\is-symbol\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.1](https://github.com/inspect-js/is-symbol/compare/v1.1.0...v1.1.1) - 2024-12-12 ### Commits - [actions] re-add finishers [`9b9d06f`](https://
- Lines: 148
- Characters: 16383

---

# Source: .\node_modules\is-symbol\README.md

- Preview: # is-symbol <sup>[![Version Badge][2]][1]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Is this an ES6 Symbol value? ## Example ```js var isSymbol = require('is-symbol'); assert(
- Lines: 48
- Characters: 1639

---

# Source: .\node_modules\is-typed-array\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.15](https://github.com/inspect-js/is-typed-array/compare/v1.1.14...v1.1.15) - 2024-12-18 ### Commits - [types] improve types [`d934b49`](https
- Lines: 169
- Characters: 8956

---

# Source: .\node_modules\is-typed-array\README.md

- Preview: # is-typed-array <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Is this value a JS Typed Array? This mod
- Lines: 73
- Characters: 3051

---

# Source: .\node_modules\is-weakmap\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v2.0.2](https://github.com/inspect-js/is-weakmap/compare/v2.0.1...v2.0.2) - 2024-03-08 ### Commits - [actions] reuse common workflows [`0af1292`](h
- Lines: 86
- Characters: 8101

---

# Source: .\node_modules\is-weakmap\README.md

- Preview: # is-weakmap <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Is this value a JS WeakMap? This module works cross-realm/iframe, and despite ES6 @@toStringTag. ## Exampl
- Lines: 53
- Characters: 1925

---

# Source: .\node_modules\is-weakref\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.1](https://github.com/inspect-js/is-weakref/compare/v1.1.0...v1.1.1) - 2025-02-03 ### Commits - [Dev Deps] update `@arethetypeswrong/cli`, `@l
- Lines: 85
- Characters: 8208

---

# Source: .\node_modules\is-weakref\README.md

- Preview: # is-weakref <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Is this value a JS WeakRef? T
- Lines: 55
- Characters: 1960

---

# Source: .\node_modules\is-weakset\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v2.0.4](https://github.com/inspect-js/is-weakset/compare/v2.0.3...v2.0.4) - 2024-12-16 ### Commits - [types] use shared config [`5fe9848`](https://
- Lines: 110
- Characters: 10437

---

# Source: .\node_modules\is-weakset\README.md

- Preview: # is-weakset <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Is this value a JS WeakSet? This module works cross-realm/iframe, and despite ES6 @@toStringTag. ## Exampl
- Lines: 53
- Characters: 1925

---

# Source: .\node_modules\is-wsl\readme.md

- Preview: # is-wsl [![Build Status](https://travis-ci.org/sindresorhus/is-wsl.svg?branch=master)](https://travis-ci.org/sindresorhus/is-wsl) > Check if the process is running inside [Windows Subsystem for Linux](https://msdn.microsoft.com/commandline/wsl/about) (Bash on Windows) Can be useful if you need to work around unimplemented or buggy features in WSL. Supports both WSL 1 and WSL 2. ## Install ``` $ n
- Lines: 38
- Characters: 956

---

# Source: .\node_modules\jackspeak\LICENSE.md

- Preview: # Blue Oak Model License Version 1.0.0 ## Purpose This license gives everyone as much permission to work with this software as possible, while protecting contributors from liability. ## Acceptance In order to receive this license, you must agree to its rules. The rules of this license are both obligations under that agreement and conditions to your license. You must not do anything with this softw
- Lines: 58
- Characters: 1495

---

# Source: .\node_modules\jackspeak\README.md

- Preview: # jackspeak A very strict and proper argument parser. Validate string, boolean, and number options, from the command line and the environment. Call the `jack` method with a config object, and then chain methods off of it. At the end, call the `.parse()` method, and you'll get an object with `positionals` and `values` members. Any unrecognized configs or invalid values will throw an error. As long
- Lines: 360
- Characters: 11041

---

# Source: .\node_modules\jiti\README.md

- Preview: # jiti [![npm version][npm-version-src]][npm-version-href] [![npm downloads][npm-downloads-src]][npm-downloads-href] [![bundle][bundle-src]][bundle-href] [![License][license-src]][license-href] Runtime Typescript and ESM support for Node.js. > [!IMPORTANT] > This is the support branch for jiti v1. Check out [jiti/main](https://github.com/unjs/jiti/tree/main) for the latest version and [unjs/jiti#1
- Lines: 167
- Characters: 3679

---

# Source: .\node_modules\jose\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) 2018 Filip Skokan Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit pe
- Lines: 24
- Characters: 1058

---

# Source: .\node_modules\jose\README.md

- Preview: # jose `jose` is JavaScript module for JSON Object Signing and Encryption, providing support for JSON Web Tokens (JWT), JSON Web Signature (JWS), JSON Web Encryption (JWE), JSON Web Key (JWK), JSON Web Key Set (JWKS), and more. The module is designed to work across various Web-interoperable runtimes including Node.js, browsers, Cloudflare Workers, Deno, Bun, and others. ## Sponsor <picture> <sourc
- Lines: 154
- Characters: 8643

---

# Source: .\node_modules\jsdom\README.md

- Preview: <h1 align="center"> <img width="100" height="100" src="logo.svg" alt=""><br> jsdom </h1> jsdom is a pure-JavaScript implementation of many web standards, notably the WHATWG [DOM](https://dom.spec.whatwg.org/) and [HTML](https://html.spec.whatwg.org/multipage/) Standards, for use with Node.js. In general, the goal of the project is to emulate enough of a subset of a web browser to be useful for tes
- Lines: 524
- Characters: 32352

---

# Source: .\node_modules\jsesc\README.md

- Preview: # jsesc Given some data, _jsesc_ returns a stringified representation of that data. jsesc is similar to `JSON.stringify()` except: 1. it outputs JavaScript instead of JSON [by default](#json), enabling support for data structures like ES6 maps and sets; 2. it offers [many options](#api) to customize the output; 3. its output is ASCII-safe [by default](#minimal), thanks to its use of [escape sequen
- Lines: 425
- Characters: 13572

---

# Source: .\node_modules\json5\LICENSE.md

- Preview: MIT License Copyright (c) 2012-2018 Aseem Kishore, and [others]. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and t
- Lines: 26
- Characters: 1122

---

# Source: .\node_modules\json5\README.md

- Preview: # JSON5 – JSON for Humans [![Build Status](https://app.travis-ci.com/json5/json5.svg?branch=main)][Build Status] [![Coverage Status](https://coveralls.io/repos/github/json5/json5/badge.svg)][Coverage Status] JSON5 is an extension to the popular [JSON] file format that aims to be easier to **write and maintain _by hand_ (e.g. for config files)**. It is _not intended_ to be used for machine-to-machi
- Lines: 285
- Characters: 10129

---

# Source: .\node_modules\json-bigint\README.md

- Preview: # json-bigint [![Build Status](https://secure.travis-ci.org/sidorares/json-bigint.png)](http://travis-ci.org/sidorares/json-bigint) [![NPM](https://nodei.co/npm/json-bigint.png?downloads=true&stars=true)](https://nodei.co/npm/json-bigint/) JSON.parse/stringify with bigints support. Based on Douglas Crockford [JSON.js](https://github.com/douglascrockford/JSON-js) package and [bignumber.js](https://
- Lines: 243
- Characters: 8597

---

# Source: .\node_modules\json-buffer\README.md

- Preview: # json-buffer JSON functions that can convert buffers! [![build status](https://secure.travis-ci.org/dominictarr/json-buffer.png)](http://travis-ci.org/dominictarr/json-buffer) [![testling badge](https://ci.testling.com/dominictarr/json-buffer.png)](https://ci.testling.com/dominictarr/json-buffer) JSON mangles buffers by converting to an array... which isn't helpful. json-buffers converts to base6
- Lines: 27
- Characters: 635

---

# Source: .\node_modules\jsonfile\README.md

- Preview: Node.js - jsonfile ================ Easily read/write JSON files in Node.js. _Note: this module cannot be used in the browser._ [![npm Package](https://img.shields.io/npm/v/jsonfile.svg?style=flat-square)](https://www.npmjs.org/package/jsonfile) [![linux build status](https://img.shields.io/github/actions/workflow/status/jprichardson/node-jsonfile/ci.yml?branch=master)](https://github.com/jprichar
- Lines: 232
- Characters: 6211

---

# Source: .\node_modules\json-parse-better-errors\CHANGELOG.md

- Preview: # Change Log All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines. <a name="1.0.2"></a> ## [1.0.2](https://github.com/zkat/json-parse-better-errors/compare/v1.0.1...v1.0.2) (2018-03-30) ### Bug Fixes * **messages:** More friendly messages for non-string ([#1](https://github.com/
- Lines: 49
- Characters: 1134

---

# Source: .\node_modules\json-parse-better-errors\LICENSE.md

- Preview: Copyright 2017 Kat Marchán Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software
- Lines: 10
- Characters: 1044

---

# Source: .\node_modules\json-parse-better-errors\README.md

- Preview: # json-parse-better-errors [![npm version](https://img.shields.io/npm/v/json-parse-better-errors.svg)](https://npm.im/json-parse-better-errors) [![license](https://img.shields.io/npm/l/json-parse-better-errors.svg)](https://npm.im/json-parse-better-errors) [![Travis](https://img.shields.io/travis/zkat/json-parse-better-errors.svg)](https://travis-ci.org/zkat/json-parse-better-errors) [![AppVeyor](
- Lines: 49
- Characters: 2143

---

# Source: .\node_modules\json-schema\README.md

- Preview: This is a historical repository for the early development of the JSON Schema specification and implementation. This package is considered "finished": it holds the earlier draft specification and a simple, efficient, lightweight implementation of the original core elements of JSON Schema. This repository does not house the latest specifications nor does it implement the latest versions of JSON Sche
- Lines: 6
- Characters: 815

---

# Source: .\node_modules\json-schema-traverse\README.md

- Preview: # json-schema-traverse Traverse JSON Schema passing each schema object to callback [![Build Status](https://travis-ci.org/epoberezkin/json-schema-traverse.svg?branch=master)](https://travis-ci.org/epoberezkin/json-schema-traverse) [![npm version](https://badge.fury.io/js/json-schema-traverse.svg)](https://www.npmjs.com/package/json-schema-traverse) [![Coverage Status](https://coveralls.io/repos/gi
- Lines: 86
- Characters: 2611

---

# Source: .\node_modules\jstat\doc\md\_toc.md

- Preview: ## Table of Contents * [Overview](overview.md) * [Core](core.md) * [Vector](vector.md) * [Special Functions](special-functions.md) * [Distributions](distributions.md) * [Linear Algebra](linear-algebra.md) * [Statistical Tests](test.md) * [Regression Models](models.md)
- Lines: 13
- Characters: 260

---

# Source: .\node_modules\jstat\doc\md\all.md

- Preview: @include overview.md @include core.md @include vector.md @include distributions.md @include special-functions.md @include linear-algebra.md @include test.md
- Lines: 10
- Characters: 150

---

# Source: .\node_modules\jstat\doc\md\core.md

- Preview: ## Core Functionality Core functionality include methods that generate and analyse vectors or matrices. ### jStat() The jStat object can function in several capacities, as demonstrated below. In all cases, jStat will always return an instance of itself. **jStat( array[, fn] )** Creates a new jStat object from either an existing array or jStat object. For example, create a new jStat matrix by doing
- Lines: 489
- Characters: 10883

---

# Source: .\node_modules\jstat\doc\md\distributions.md

- Preview: ## Distributions ### jStat.beta( alpha, beta ) #### jStat.beta.pdf( x, alpha, beta ) Returns the value of `x` in the Beta distribution with parameters `alpha` and `beta`. #### jStat.beta.cdf( x, alpha, beta ) Returns the value of `x` in the cdf for the Beta distribution with parameters `alpha` and `beta`. #### jStat.beta.inv( p, alpha, beta ) Returns the value of `p` in the inverse of the cdf for
- Lines: 597
- Characters: 21442

---

# Source: .\node_modules\jstat\doc\md\index.md

- Preview: @include _toc.md
- Lines: 4
- Characters: 16

---

# Source: .\node_modules\jstat\doc\md\linear-algebra.md

- Preview: ## Linear Algebra ## Instance Functionality ### add( arg ) Adds value to all entries. jStat([[1,2,3]]).add( 2 ) === [[3,4,5]]; ### subtract( arg ) Subtracts all entries by value. jStat([[4,5,6]]).subtract( 2 ) === [[2,3,4]]; ### divide( arg ) Divides all entries by value. jStat([[2,4,6]]).divide( 2 ) === [[1,2,3]]; ### multiply( arg ) Multiplies all entries by value. jStat([[1,2,3]]).multiply( 2 )
- Lines: 224
- Characters: 3802

---

# Source: .\node_modules\jstat\doc\md\models.md

- Preview: ## Regression Models ## Instance Functionality ### ols( endog, exog ) What's the `endog`, `exog`? Please see: http://statsmodels.sourceforge.net/stable/endog_exog.html `ols` use ordinary least square(OLS) method to estimate linear model and return a `model`object. `model` object attribute is vrey like to `statsmodels` result object attribute (nobs,coef,...). The following example is compared by `s
- Lines: 51
- Characters: 1239

---

# Source: .\node_modules\jstat\doc\md\overview.md

- Preview: ## Overview ### Description jStat is a statistical library written in JavaScript that allows you to perform advanced statistical operations without the need of a dedicated statistical language (e.g. MATLAB or R). It is available for download on [Github](http://github.com/jstat/jstat). ### Architecture Calculations are done by *static methods*, while working with groups of numbers is handled by the
- Lines: 68
- Characters: 2638

---

# Source: .\node_modules\jstat\doc\md\special-functions.md

- Preview: ## Special Functions ### betafn( x, y ) Evaluates the Beta function at `(x,y)`. ### betaln( x, y ) Evaluates the log Beta function at `(x,y)`. ### betacf( x, a, b ) Returns the continued fraction for the incomplete Beta function with parameters a and b modified by Lentz's method evaluated at `x`. ### ibetainv( p, a, b) Returns the inverse of the incomplete Beta function evaluated at `(p,a,b)`. ###
- Lines: 93
- Characters: 2518

---

# Source: .\node_modules\jstat\doc\md\test.md

- Preview: ## Statistical Tests The test module includes methods that enact popular statistical tests. The tests that are implemented are Z tests, T tests, and F tests. Also included are methods for developing confidence intervals. Currently regression is not included but it should be included soon (once matrix inversion is fixed). ## Statistics Instance Functionality ### zscore( value[, flag] ) Returns the
- Lines: 213
- Characters: 6623

---

# Source: .\node_modules\jstat\doc\md\vector.md

- Preview: ## Vector Functionality ### sum() **sum( array )** Returns the sum of the `array` vector. jStat.sum([1,2,3]) === 6 **fn.sum( [bool][, callback] )** Returns the sum of a vector or matrix columns. jStat( 1, 5, 5 ).sum() === 15 jStat([[1,2],[3,4]]).sum() === [ 4, 6 ] If callback is passed then will pass result as first argument. jStat( 1, 5, 5 ).sum(function( result ) { // result === 15 }); If pass b
- Lines: 861
- Characters: 20467

---

# Source: .\node_modules\jstat\README.md

- Preview: [jStat](http://www.jstat.org/) - JavaScript Statistical Library =============================================================== [![npm version](https://badge.fury.io/js/jstat.svg)](https://badge.fury.io/js/jstat) jStat provides native javascript implementations of statistical functions. Full details are available in the [docs](https://jstat.github.io/all.html). jStat provides more functions than m
- Lines: 174
- Characters: 5370

---

# Source: .\node_modules\js-tokens\CHANGELOG.md

- Preview: ### Version 4.0.0 (2018-01-28) ### - Added: Support for ES2018. The only change needed was recognizing the `s` regex flag. - Changed: _All_ tokens returned by the `matchToToken` function now have a `closed` property. It is set to `undefined` for the tokens where “closed” doesn’t make sense. This means that all tokens objects have the same shape, which might improve performance. These are the break
- Lines: 154
- Characters: 4312

---

# Source: .\node_modules\js-tokens\README.md

- Preview: Overview [![Build Status](https://travis-ci.org/lydell/js-tokens.svg?branch=master)](https://travis-ci.org/lydell/js-tokens) ======== A regex that tokenizes JavaScript. ```js var jsTokens = require("js-tokens").default var jsString = "var foo=opts.foo;\n..." jsString.match(jsTokens) // ["var", " ", "foo", "=", "opts", ".", "foo", ";", "\n", ...] ``` Installation ============ `npm install js-tokens
- Lines: 243
- Characters: 7128

---

# Source: .\node_modules\js-yaml\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [4.1.0] - 2021-04-15 ### Added - Types are now exported as `yaml.types.XXX`. - Every type now has `options` property with original arguments kept a
- Lines: 619
- Characters: 18614

---

# Source: .\node_modules\js-yaml\README.md

- Preview: JS-YAML - YAML 1.2 parser / writer for JavaScript ================================================= [![CI](https://github.com/nodeca/js-yaml/workflows/CI/badge.svg?branch=master)](https://github.com/nodeca/js-yaml/actions) [![NPM version](https://img.shields.io/npm/v/js-yaml.svg)](https://www.npmjs.org/package/js-yaml) __[Online Demo](http://nodeca.github.com/js-yaml/)__ This is an implementation
- Lines: 247
- Characters: 8220

---

# Source: .\node_modules\jwa\README.md

- Preview: # node-jwa [![Build Status](https://travis-ci.org/brianloveswords/node-jwa.svg?branch=master)](https://travis-ci.org/brianloveswords/node-jwa) A [JSON Web Algorithms](http://tools.ietf.org/id/draft-ietf-jose-json-web-algorithms-08.html) implementation focusing (exclusively, at this point) on the algorithms necessary for [JSON Web Signatures](http://self-issued.info/docs/draft-ietf-jose-json-web-si
- Lines: 153
- Characters: 5215

---

# Source: .\node_modules\jws\CHANGELOG.md

- Preview: # Change Log All notable changes to this project will be documented in this file. ## [3.0.0] ### Changed - **BREAKING**: `jwt.verify` now requires an `algorithm` parameter, and `jws.createVerify` requires an `algorithm` option. The `"alg"` field signature headers is ignored. This mitigates a critical security flaw in the library which would allow an attacker to generate signatures with arbitrary c
- Lines: 37
- Characters: 1440

---

# Source: .\node_modules\jws\readme.md

- Preview: # node-jws [![Build Status](https://secure.travis-ci.org/brianloveswords/node-jws.svg)](http://travis-ci.org/brianloveswords/node-jws) An implementation of [JSON Web Signatures](http://self-issued.info/docs/draft-ietf-jose-json-web-signature.html). This was developed against `draft-ietf-jose-json-web-signature-08` and implements the entire spec **except** X.509 Certificate Chain signing/verifying
- Lines: 258
- Characters: 6678

---

# Source: .\node_modules\jwt-decode\README.md

- Preview: ![Browser library that helps decoding JWT tokens which are Base64Url encoded](https://cdn.auth0.com/website/sdks/banners/jwt-decode-banner.png) **IMPORTANT:** This library doesn't validate the token, any well-formed JWT can be decoded. You should validate the token in your server-side logic by using something like [express-jwt](https://github.com/auth0/express-jwt), [koa-jwt](https://github.com/st
- Lines: 136
- Characters: 5396

---

# Source: .\node_modules\keyv\README.md

- Preview: <h1 align="center"> <img width="250" src="https://jaredwray.com/images/keyv.svg" alt="keyv"> <br> <br> </h1> > Simple key-value storage with support for multiple backends [![build](https://github.com/jaredwray/keyv/actions/workflows/tests.yaml/badge.svg)](https://github.com/jaredwray/keyv/actions/workflows/tests.yaml) [![codecov](https://codecov.io/gh/jaredwray/keyv/branch/main/graph/badge.svg?tok
- Lines: 432
- Characters: 15199

---

# Source: .\node_modules\kind-of\CHANGELOG.md

- Preview: # Release history All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html). <details> <summary><strong>Guiding Principles</strong></summary> - Changelogs are for humans, not machines. - There should be an entry for every si
- Lines: 163
- Characters: 4412

---

# Source: .\node_modules\kind-of\README.md

- Preview: # kind-of [![NPM version](https://img.shields.io/npm/v/kind-of.svg?style=flat)](https://www.npmjs.com/package/kind-of) [![NPM monthly downloads](https://img.shields.io/npm/dm/kind-of.svg?style=flat)](https://npmjs.org/package/kind-of) [![NPM total downloads](https://img.shields.io/npm/dt/kind-of.svg?style=flat)](https://npmjs.org/package/kind-of) [![Linux Build Status](https://img.shields.io/travi
- Lines: 370
- Characters: 11353

---

# Source: .\node_modules\kleur\readme.md

- Preview: <div align="center"> <img src="shots/logo.png" alt="kleur" height="120" /> </div> <div align="center"> <a href="https://npmjs.org/package/kleur"> <img src="https://badgen.now.sh/npm/v/kleur" alt="version" /> </a> <a href="https://travis-ci.org/lukeed/kleur"> <img src="https://badgen.now.sh/travis/lukeed/kleur" alt="travis" /> </a> <a href="https://npmjs.org/package/kleur"> <img src="https://badgen
- Lines: 173
- Characters: 4618

---

# Source: .\node_modules\lazy-cache\README.md

- Preview: # lazy-cache [![NPM version](https://img.shields.io/npm/v/lazy-cache.svg?style=flat)](https://www.npmjs.com/package/lazy-cache) [![NPM monthly downloads](https://img.shields.io/npm/dm/lazy-cache.svg?style=flat)](https://npmjs.org/package/lazy-cache)  [![NPM total downloads](https://img.shields.io/npm/dt/lazy-cache.svg?style=flat)](https://npmjs.org/package/lazy-cache) [![Linux Build Status](https:
- Lines: 198
- Characters: 6623

---

# Source: .\node_modules\leac\CHANGELOG.md

- Preview: # Changelog ## Version 0.6.0 - Targeting Node.js version 14 and ES2020; - Now should be discoverable with [denoify](https://github.com/garronej/denoify). ## Version 0.5.1 - Documentation updates. ## Version 0.5.0 - Initial release; - Aiming at Node.js version 12 and up.
- Lines: 18
- Characters: 262

---

# Source: .\node_modules\leac\README.md

- Preview: # leac ![lint status badge](https://github.com/mxxii/leac/workflows/lint/badge.svg) ![test status badge](https://github.com/mxxii/leac/workflows/test/badge.svg) [![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/mxxii/leac/blob/main/LICENSE) [![npm](https://img.shields.io/npm/v/leac?logo=npm)](https://www.npmjs.com/package/leac) [![deno](https://img.shields.io
- Lines: 122
- Characters: 5326

---

# Source: .\node_modules\levn\README.md

- Preview: # levn [![Build Status](https://travis-ci.org/gkz/levn.png)](https://travis-ci.org/gkz/levn) <a name="levn" /> __Light ECMAScript (JavaScript) Value Notation__ Levn is a library which allows you to parse a string into a JavaScript value based on an expected type. It is meant for short amounts of human entered data (eg. config files, command line arguments). Levn aims to concisely describe JavaScri
- Lines: 199
- Characters: 10272

---

# Source: .\node_modules\lib0\README.md

- Preview: # Lib0 [![Build Status](https://travis-ci.com/dmonad/lib0.svg?branch=main)](https://travis-ci.com/dmonad/lib0) > Monorepo of isomorphic utility functions This library is meant to replace all global JavaScript functions with isomorphic module imports. Additionally, it implements several performance-oriented utility modules. Most noteworthy are the binary encoding/decoding modules **[lib0/encoding]*
- Lines: 1417
- Characters: 74424

---

# Source: .\node_modules\lilconfig\readme.md

- Preview: # Lilconfig ⚙️ [![npm version](https://badge.fury.io/js/lilconfig.svg)](https://badge.fury.io/js/lilconfig) [![install size](https://packagephobia.now.sh/badge?p=lilconfig)](https://packagephobia.now.sh/result?p=lilconfig) [![Coverage Status](https://coveralls.io/repos/github/antonk52/lilconfig/badge.svg)](https://coveralls.io/github/antonk52/lilconfig) A zero-dependency alternative to [cosmiconfi
- Lines: 101
- Characters: 2507

---

# Source: .\node_modules\lines-and-columns\README.md

- Preview: # lines-and-columns Maps lines and columns to character offsets and back. This is useful for parsers and other text processors that deal in character ranges but process text with meaningful lines and columns. ## Install ``` $ npm install [--save] lines-and-columns ``` ## Usage ```js import { LinesAndColumns } from 'lines-and-columns' const lines = new LinesAndColumns( `table { border: 0 }` ) lines
- Lines: 36
- Characters: 500

---

# Source: .\node_modules\linkify-it\README.md

- Preview: linkify-it ========== [![CI](https://github.com/markdown-it/linkify-it/actions/workflows/ci.yml/badge.svg)](https://github.com/markdown-it/linkify-it/actions/workflows/ci.yml) [![NPM version](https://img.shields.io/npm/v/linkify-it.svg?style=flat)](https://www.npmjs.org/package/linkify-it) [![Coverage Status](https://img.shields.io/coveralls/markdown-it/linkify-it/master.svg?style=flat)](https://c
- Lines: 198
- Characters: 6163

---

# Source: .\node_modules\linkifyjs\README.md

- Preview: linkifyjs === [![npm version](https://badge.fury.io/js/linkifyjs.svg)](https://www.npmjs.com/package/linkifyjs) Core [Linkify](https://linkify.js.org/) JavaScript library. Use Linkify and its related packages to detect URLs, email addresses and more in plain-text strings and convert them to HTML `<a>` anchor tags. ## Installation Install from the command line with NPM ``` npm install linkifyjs ```
- Lines: 48
- Characters: 1102

---

# Source: .\node_modules\linkup-sdk\README.md

- Preview: # 🚀 Linkup JS/TS SDK [![npm package](https://badge.fury.io/js/linkup-sdk.svg)](https://www.npmjs.com/package/linkup-sdk) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![downloads](https://img.shields.io/npm/dm/linkup-sdk.svg)](https://www.npmjs.com/package/linkup-sdk) A JS/TS SDK for the [Linkup API](https://linkup-api.readme.io/reference/getting-started), allow
- Lines: 104
- Characters: 2590

---

# Source: .\node_modules\load-json-file\readme.md

- Preview: # load-json-file [![Build Status](https://travis-ci.org/sindresorhus/load-json-file.svg?branch=master)](https://travis-ci.org/sindresorhus/load-json-file) > Read and parse a JSON file [Strips UTF-8 BOM](https://github.com/sindresorhus/strip-bom), uses [`graceful-fs`](https://github.com/isaacs/node-graceful-fs), and throws more [helpful JSON errors](https://github.com/sindresorhus/parse-json). ## I
- Lines: 48
- Characters: 893

---

# Source: .\node_modules\locate-path\readme.md

- Preview: # locate-path > Get the first path that exists on disk of multiple paths ## Install ``` $ npm install locate-path ``` ## Usage Here we find the first file that exists on disk, in array order. ```js import {locatePath} from 'locate-path'; const files = [ 'unicorn.png', 'rainbow.png', // Only this one actually exists on disk 'pony.png' ]; console(await locatePath(files)); //=> 'rainbow' ``` ## API #
- Lines: 125
- Characters: 1935

---

# Source: .\node_modules\lodash.merge\README.md

- Preview: # lodash.merge v4.6.2 The [Lodash](https://lodash.com/) method `_.merge` exported as a [Node.js](https://nodejs.org/) module. ## Installation Using npm: ```bash $ {sudo -H} npm i -g npm $ npm i --save lodash.merge ``` In Node.js: ```js var merge = require('lodash.merge'); ``` See the [documentation](https://lodash.com/docs#merge) or [package source](https://github.com/lodash/lodash/blob/4.6.2-npm-
- Lines: 21
- Characters: 428

---

# Source: .\node_modules\longest-streak\readme.md

- Preview: # longest-streak [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Get the count of the longest repeating streak of `substring` in `value`. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`long
- Lines: 153
- Characters: 3378

---

# Source: .\node_modules\loose-envify\README.md

- Preview: # loose-envify [![Build Status](https://travis-ci.org/zertosh/loose-envify.svg?branch=master)](https://travis-ci.org/zertosh/loose-envify) Fast (and loose) selective `process.env` replacer using [js-tokens](https://github.com/lydell/js-tokens) instead of an AST. Works just like [envify](https://github.com/hughsk/envify) but much faster. ## Gotchas * Doesn't handle broken syntax. * Doesn't look ins
- Lines: 48
- Characters: 1026

---

# Source: .\node_modules\loupe\README.md

- Preview: ![npm](https://img.shields.io/npm/v/loupe?logo=npm) ![Build](https://github.com/chaijs/loupe/workflows/Build/badge.svg?branch=master) ![Codecov branch](https://img.shields.io/codecov/c/github/chaijs/loupe/master?logo=codecov) # What is loupe? Loupe turns the object you give it into a string. It's similar to Node.js' `util.inspect()` function, but it works cross platform, in most modern browsers as
- Lines: 66
- Characters: 2140

---

# Source: .\node_modules\lowlight\changelog.md

- Preview: # Changelog See [GitHub Releases][releases] for the changelog. [releases]: https://github.com/wooorm/lowlight/releases
- Lines: 8
- Characters: 116

---

# Source: .\node_modules\lowlight\readme.md

- Preview: # lowlight [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Virtual syntax highlighting for virtual DOMs and non-HTML things, with language auto-detection. Perfect for [React][], [VDOM][], and others. Lowlight is built to work with all syntaxes supported by [highlight.js][], that’s [191 languages][names] (
- Lines: 342
- Characters: 7726

---

# Source: .\node_modules\lru-cache\README.md

- Preview: # lru cache A cache object that deletes the least-recently-used items. [![Build Status](https://travis-ci.org/isaacs/node-lru-cache.svg?branch=master)](https://travis-ci.org/isaacs/node-lru-cache) [![Coverage Status](https://coveralls.io/repos/isaacs/node-lru-cache/badge.svg?service=github)](https://coveralls.io/github/isaacs/node-lru-cache) ## Installation: ```javascript npm install lru-cache --s
- Lines: 169
- Characters: 5821

---

# Source: .\node_modules\lucia\CHANGELOG.md

- Preview: # lucia ## 3.2.2 ### Patch changes -   Fix cookie expiration. ## 3.2.1 ### Patch changes -   [#1708](https://github.com/lucia-auth/lucia/pull/1708) by [@pilcrowOnPaper](https://github.com/pilcrowOnPaper) : Update dependencies. ## 3.2.0 ### Minor changes -   [#1548](https://github.com/lucia-auth/lucia/pull/1548) by [@pilcrowOnPaper](https://github.com/pilcrowOnPaper) : Add `generateIdFromEntropySiz
- Lines: 422
- Characters: 16911

---

# Source: .\node_modules\lucia\README.md

- Preview: # `lucia` An open source auth library that abstracts away the complexity of handling sessions. It works alongside your database to provide an API that's easy to use, understand, and extend. **[Documentation](https://v3.lucia-auth.com)** **[Changelog](https://github.com/pilcrowOnPaper/lucia/blob/main/packages/lucia/CHANGELOG.md)** ## Installation ``` npm install lucia pnpm add lucia yarn add lucia
- Lines: 18
- Characters: 394

---

# Source: .\node_modules\lucide-react\README.md

- Preview: <p align="center"> <a href="https://github.com/lucide-icons/lucide"> <img src="https://lucide.dev/package-logos/lucide-react.svg" alt="Lucide icon library for React applications." width="540"> </a> </p> <p align="center"> Lucide icon library for React applications. </p> <div align="center"> [![npm](https://img.shields.io/npm/v/lucide-react?color=blue)](https://www.npmjs.com/package/lucide-react) !
- Lines: 76
- Characters: 2042

---

# Source: .\node_modules\luxon\LICENSE.md

- Preview: Copyright 2019 JS Foundation and other contributors Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit pers
- Lines: 10
- Characters: 1069

---

# Source: .\node_modules\luxon\README.md

- Preview: # Luxon [![MIT License][license-image]][license] [![Build Status][github-action-image]][github-action-url] [![NPM version][npm-version-image]][npm-url] [![Coverage Status][test-coverage-image]][test-coverage-url] [![PRs welcome][contributing-image]][contributing-url] Luxon is a library for working with dates and times in JavaScript. ```js DateTime.now().setZone("America/New_York").minus({ weeks: 1
- Lines: 58
- Characters: 1997

---

# Source: .\node_modules\lz-string\README.md

- Preview: lz-string ========= LZ-based compression algorithm for JavaScript ## Warning (migrating from version 1.3.4 - nov 2014) Files have changed locations and name since a recent release. The new release file is in `libs/lz-string.min.js` (or in `libs/lz-string.js` if you don't care for the minified version) Sorry about the mess in other repos. This will not happen again. ## Note on server side If you ar
- Lines: 48
- Characters: 2607

---

# Source: .\node_modules\magic-string\README.md

- Preview: # magic-string <a href="https://github.com/Rich-Harris/magic-string/actions/workflows/test.yml"> <img src="https://img.shields.io/github/actions/workflow/status/Rich-Harris/magic-string/test.yml" alt="build status"> </a> <a href="https://npmjs.org/package/magic-string"> <img src="https://img.shields.io/npm/v/magic-string.svg" alt="npm version"> </a> <a href="https://github.com/Rich-Harris/magic-st
- Lines: 327
- Characters: 12209

---

# Source: .\node_modules\markdown-it\README.md

- Preview: # markdown-it <!-- omit in toc --> [![CI](https://github.com/markdown-it/markdown-it/actions/workflows/ci.yml/badge.svg)](https://github.com/markdown-it/markdown-it/actions/workflows/ci.yml) [![NPM version](https://img.shields.io/npm/v/markdown-it.svg?style=flat)](https://www.npmjs.org/package/markdown-it) [![Coverage Status](https://coveralls.io/repos/markdown-it/markdown-it/badge.svg?branch=mast
- Lines: 327
- Characters: 9824

---

# Source: .\node_modules\markdown-table\readme.md

- Preview: # markdown-table [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Generate a markdown ([GFM][]) table. ## Contents * [What is this?](#what-is-this) * [When should I use this?](#when-should-i-use-this) * [Install](#install) * [Use](#use) * [API](#api) * [`markdownTable(table[, options])`](#markdowntabletabl
- Lines: 347
- Characters: 6927

---

# Source: .\node_modules\markdown-to-jsx\README.md

- Preview: **markdown-to-jsx** The most lightweight, customizable React markdown component. [![npm version](https://badge.fury.io/js/markdown-to-jsx.svg)](https://badge.fury.io/js/markdown-to-jsx) [![downloads](https://badgen.net/npm/dy/markdown-to-jsx)](https://npm-stat.com/charts.html?package=markdown-to-jsx) <!-- TOC --> - [Installation](#installation) - [Usage](#usage) - [Parsing Options](#parsing-option
- Lines: 817
- Characters: 22997

---

# Source: .\node_modules\math-intrinsics\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.0](https://github.com/es-shims/math-intrinsics/compare/v1.0.0...v1.1.0) - 2024-12-18 ### Commits - [New] add `round` [`7cfb044`](https://githu
- Lines: 27
- Characters: 1442

---

# Source: .\node_modules\math-intrinsics\README.md

- Preview: # math-intrinsics <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] ES Math-related intrinsics and helpers, robustly cached. - `abs` - `floor` - `isFinite` - `isInteger`
- Lines: 53
- Characters: 1834

---

# Source: .\node_modules\mdast-util-find-and-replace\node_modules\escape-string-regexp\readme.md

- Preview: # escape-string-regexp > Escape RegExp special characters ## Install ``` $ npm install escape-string-regexp ``` ## Usage ```js import escapeStringRegexp from 'escape-string-regexp'; const escapedString = escapeStringRegexp('How much $ for a 🦄?'); //=> 'How much \\$ for a 🦄\\?' new RegExp(escapedString); ``` You can also use this to escape a string that is inserted into the middle of a regex, for
- Lines: 36
- Characters: 863

---

# Source: .\node_modules\mdast-util-find-and-replace\readme.md

- Preview: # mdast-util-find-and-replace [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [mdast][] utility to find and replace things. ## Contents * [What is this?](#what-is-this) * [When should I use this?]
- Lines: 371
- Characters: 8798

---

# Source: .\node_modules\mdast-util-from-markdown\readme.md

- Preview: # mdast-util-from-markdown [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] **[mdast][]** utility that turns markdown into a syntax tree. ## Contents * [What is this?](#what-is-this) * [When should
- Lines: 540
- Characters: 13990

---

# Source: .\node_modules\mdast-util-gfm\readme.md

- Preview: # mdast-util-gfm [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [mdast][] extensions to parse and serialize [GFM][] (autolink literals, footnotes, strikethrough, tables, tasklists). ## Contents *
- Lines: 500
- Characters: 13458

---

# Source: .\node_modules\mdast-util-gfm-autolink-literal\readme.md

- Preview: # mdast-util-gfm-autolink-literal [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [mdast][] extensions to parse and serialize [GFM][] autolink literals. ## Contents * [What is this?](#what-is-this
- Lines: 337
- Characters: 9853

---

# Source: .\node_modules\mdast-util-gfm-footnote\readme.md

- Preview: # mdast-util-gfm-footnote [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [mdast][] extensions to parse and serialize [GFM][] footnotes. ## Contents * [What is this?](#what-is-this) * [When to use
- Lines: 497
- Characters: 12535

---

# Source: .\node_modules\mdast-util-gfm-strikethrough\readme.md

- Preview: # mdast-util-gfm-strikethrough [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [mdast][] extensions to parse and serialize [GFM][] strikethrough. ## Contents *   [What is this?](#what-is-this) *
- Lines: 353
- Characters: 9597

---

# Source: .\node_modules\mdast-util-gfm-table\readme.md

- Preview: # mdast-util-gfm-table [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [mdast][] extensions to parse and serialize [GFM][] tables. ## Contents *   [What is this?](#what-is-this) *   [When to use t
- Lines: 608
- Characters: 15339

---

# Source: .\node_modules\mdast-util-gfm-task-list-item\readme.md

- Preview: # mdast-util-gfm-task-list-item [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [mdast][] extensions to parse and serialize [GFM][] task list items. ## Contents *   [What is this?](#what-is-this)
- Lines: 369
- Characters: 9522

---

# Source: .\node_modules\mdast-util-mdx-expression\readme.md

- Preview: # mdast-util-mdx-expression [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [mdast][] extensions to parse and serialize [MDX][] expressions (`{Math.PI}`). ## Contents * [What is this?](#what-is-th
- Lines: 534
- Characters: 13109

---

# Source: .\node_modules\mdast-util-mdxjs-esm\readme.md

- Preview: # mdast-util-mdxjs-esm [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [mdast][] extensions to parse and serialize [MDX][] ESM (import/exports). ## Contents *   [What is this?](#what-is-this) *
- Lines: 451
- Characters: 11164

---

# Source: .\node_modules\mdast-util-mdx-jsx\readme.md

- Preview: # mdast-util-mdx-jsx [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [mdast][] extensions to parse and serialize [MDX][] JSX (`<a />`). ## Contents * [What is this?](#what-is-this) * [When to use
- Lines: 722
- Characters: 18162

---

# Source: .\node_modules\mdast-util-phrasing\readme.md

- Preview: # mdast-util-phrasing [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [mdast][] utility to check if a node is phrasing content. ## Contents *   [What is this?](#what-is-this) *   [When should I us
- Lines: 203
- Characters: 5092

---

# Source: .\node_modules\mdast-util-to-hast\readme.md

- Preview: # mdast-util-to-hast [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [mdast][] utility to transform to [hast][]. ## Contents * [What is this?](#what-is-this) * [When should I use this?](#when-shou
- Lines: 1724
- Characters: 36498

---

# Source: .\node_modules\mdast-util-to-markdown\readme.md

- Preview: # mdast-util-to-markdown [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] **[mdast][]** utility that turns a syntax tree into markdown. ## Contents * [What is this?](#what-is-this) * [When should I
- Lines: 753
- Characters: 20842

---

# Source: .\node_modules\mdast-util-to-string\readme.md

- Preview: # mdast-util-to-string [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [mdast][] utility to get the text content of a node. ## Contents *   [What is this?](#what-is-this) *   [When should I use th
- Lines: 221
- Characters: 5782

---

# Source: .\node_modules\mdurl\README.md

- Preview: # mdurl [![CI](https://github.com/markdown-it/mdurl/actions/workflows/ci.yml/badge.svg)](https://github.com/markdown-it/mdurl/actions/workflows/ci.yml) [![NPM version](https://img.shields.io/npm/v/mdurl.svg?style=flat)](https://www.npmjs.org/package/mdurl) > URL utilities for [markdown-it](https://github.com/markdown-it/markdown-it) parser. ## API ### .encode(str [, exclude, keepEncoded]) -> Strin
- Lines: 105
- Characters: 3351

---

# Source: .\node_modules\media-typer\HISTORY.md

- Preview: 1.1.0 / 2019-04-24 ================== * Add `test(string)` function 1.0.2 / 2019-04-19 ================== * Fix JSDoc comment for `parse` function 1.0.1 / 2018-10-20 ================== * Remove left over `parameters` property from class 1.0.0 / 2018-10-20 ================== This major release brings the module back to it's RFC 6838 roots. If you want a module to parse the `Content-Type` or similar
- Lines: 53
- Characters: 1105

---

# Source: .\node_modules\media-typer\README.md

- Preview: # media-typer [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Node.js Version][node-version-image]][node-version-url] [![Build Status][travis-image]][travis-url] [![Test Coverage][coveralls-image]][coveralls-url] Simple RFC 6838 media type parser. This module will parse a given media type into it's component parts, like type, subtype, and suffix. A
- Lines: 96
- Characters: 2899

---

# Source: .\node_modules\memfs\README.md

- Preview: # memfs [![][chat-badge]][chat] [![][npm-badge]][npm-url] [![][travis-badge]][travis-url] In-memory file-system with [Node's `fs` API](https://nodejs.org/api/fs.html). - Node's `fs` API implemented, see [_old API Status_](./docs/api-status.md), [missing list](https://github.com/streamich/memfs/issues/735), [missing `opendir`](https://github.com/streamich/memfs/issues/663) - Stores files in memory,
- Lines: 127
- Characters: 3356

---

# Source: .\node_modules\memfs-browser\README.md

- Preview: # memfs-browser `memfs` UMD and ESM bundle for browser. The code shipped in this package is not transpiled by babel. Version explanation ``` memfs: major.minor.patch  -->  memfs-browser: major.minor.1{patch:2}{build:2} example: 3.5.3  -->  3.5.103xx 4.6.0  -->  4.6.100xx ``` ## Usage ```bash npm install memfs-browser ``` - HTML `<script>` ```html <script src="your-buffer-polyfill-that-set-globalTh
- Lines: 90
- Characters: 1837

---

# Source: .\node_modules\memoize-one\README.md

- Preview: # memoize-one A memoization library that only caches the result of the most recent arguments. > Also [async version](https://github.com/microlinkhq/async-memoize-one). [![Build Status](https://travis-ci.org/alexreardon/memoize-one.svg?branch=master)](https://travis-ci.org/alexreardon/memoize-one) [![npm](https://img.shields.io/npm/v/memoize-one.svg)](https://www.npmjs.com/package/memoize-one) ![ty
- Lines: 271
- Characters: 9475

---

# Source: .\node_modules\memorystream\README.md

- Preview: [![Build Status](https://travis-ci.org/JSBizon/node-memorystream.svg?branch=master)](https://travis-ci.org/JSBizon/node-memorystream) # Introduction node-memorystream - this module allow create streams in memory. It can be used for emulating file streams, filtering/mutating data between one stream and another, buffering incoming data, being the gap between two data/network streams of variable rate
- Lines: 96
- Characters: 2650

---

# Source: .\node_modules\merge2\README.md

- Preview: # merge2 Merge multiple streams into one stream in sequence or parallel. [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Downloads][downloads-image]][downloads-url] ## Install Install with [npm](https://npmjs.org/package/merge2) ```sh npm install merge2 ``` ## Usage ```js const gulp = require('gulp') const merge2 = require('merge2') const concat = require('gulp-
- Lines: 147
- Characters: 3599

---

# Source: .\node_modules\merge-descriptors\readme.md

- Preview: # merge-descriptors > Merge objects using their property descriptors ## Install ```sh npm install merge-descriptors ``` ## Usage ```js import mergeDescriptors from 'merge-descriptors'; const thing = { get name() { return 'John' } } const animal = {}; mergeDescriptors(animal, thing); console.log(animal.name); //=> 'John' ``` ## API ### merge(destination, source, overwrite?) Merges "own" properties
- Lines: 58
- Characters: 875

---

# Source: .\node_modules\micromark\readme.md

- Preview: # micromark [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] Markdown parser. > **Note**: this is the `micromark` package from the micromark monorepo. > See the [monorepo read
- Lines: 491
- Characters: 14477

---

# Source: .\node_modules\micromark-core-commonmark\readme.md

- Preview: # micromark-core-commonmark [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] constructs that make up the core of CommonMark. Some of these can be [turned off][di
- Lines: 174
- Characters: 4583

---

# Source: .\node_modules\micromark-extension-gfm\readme.md

- Preview: # micromark-extension-gfm [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [micromark][] extensions to support [GitHub flavored markdown][gfm] (GFM). ## Contents *   [What is this?](#what-is-this)
- Lines: 436
- Characters: 12657

---

# Source: .\node_modules\micromark-extension-gfm-autolink-literal\readme.md

- Preview: # micromark-extension-gfm-autolink-literal [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [micromark][] extensions to support GFM [literal autolinks][spec]. ## Contents * [What is this?](#what-is
- Lines: 425
- Characters: 13325

---

# Source: .\node_modules\micromark-extension-gfm-footnote\readme.md

- Preview: # micromark-extension-gfm-footnote [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [micromark][] extensions to support GFM [footnotes][post]. ## Contents * [What is this?](#what-is-this) * [When t
- Lines: 659
- Characters: 21009

---

# Source: .\node_modules\micromark-extension-gfm-strikethrough\readme.md

- Preview: # micromark-extension-gfm-strikethrough [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [micromark][] extensions to support GFM [strikethrough][]. ## Contents * [What is this?](#what-is-this) * [W
- Lines: 307
- Characters: 8120

---

# Source: .\node_modules\micromark-extension-gfm-table\readme.md

- Preview: # micromark-extension-gfm-table [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [micromark][] extensions to support GFM [tables][]. ## Contents * [What is this?](#what-is-this) * [When to use this
- Lines: 518
- Characters: 12959

---

# Source: .\node_modules\micromark-extension-gfm-tagfilter\readme.md

- Preview: # micromark-extension-gfm-tagfilter [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [micromark][] extension to support GFM [tag filter][]. ## Contents *   [What is this?](#what-is-this) *   [When
- Lines: 240
- Characters: 6328

---

# Source: .\node_modules\micromark-extension-gfm-task-list-item\readme.md

- Preview: # micromark-extension-gfm-task-list-item [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [micromark][] extensions to support GFM [task list items][]. ## Contents * [What is this?](#what-is-this) *
- Lines: 308
- Characters: 8392

---

# Source: .\node_modules\micromark-factory-destination\readme.md

- Preview: # micromark-factory-destination [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] factory to parse destinations (found in resources, definitions). ## Contents * [
- Lines: 237
- Characters: 5446

---

# Source: .\node_modules\micromark-factory-label\readme.md

- Preview: # micromark-factory-label [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] factory to parse labels (found in media, definitions). ## Contents * [What is this?](#
- Lines: 227
- Characters: 5144

---

# Source: .\node_modules\micromark-factory-space\readme.md

- Preview: # micromark-factory-space [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] factory to parse [markdown space][markdown-space] (found in lots of places). ## Conten
- Lines: 228
- Characters: 5411

---

# Source: .\node_modules\micromark-factory-title\readme.md

- Preview: # micromark-factory-title [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] factory to parse markdown titles (found in resources, definitions). ## Contents * [Wha
- Lines: 232
- Characters: 5119

---

# Source: .\node_modules\micromark-factory-whitespace\readme.md

- Preview: # micromark-factory-whitespace [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] factory to parse [markdown line endings or spaces][ws] (found in lots of places).
- Lines: 208
- Characters: 5096

---

# Source: .\node_modules\micromark-util-character\readme.md

- Preview: # micromark-util-character [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] utility to handle [character codes][code]. ## Contents * [What is this?](#what-is-thi
- Lines: 449
- Characters: 11257

---

# Source: .\node_modules\micromark-util-chunked\readme.md

- Preview: # micromark-util-chunked [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] utility to splice and push with giant arrays. ## Contents * [What is this?](#what-is-th
- Lines: 222
- Characters: 5351

---

# Source: .\node_modules\micromark-util-classify-character\readme.md

- Preview: # micromark-util-classify-character [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] utility to classify whether a character is whitespace or punctuation. ## Con
- Lines: 208
- Characters: 5043

---

# Source: .\node_modules\micromark-util-combine-extensions\readme.md

- Preview: # micromark-util-combine-extensions [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] utility to combine [syntax][] or [html][] extensions. ## Contents * [What is
- Lines: 204
- Characters: 5429

---

# Source: .\node_modules\micromark-util-decode-numeric-character-reference\readme.md

- Preview: # micromark-util-decode-numeric-character-reference [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] utility to decode numeric character references. ## Contents
- Lines: 187
- Characters: 5117

---

# Source: .\node_modules\micromark-util-decode-string\readme.md

- Preview: # micromark-util-decode-string [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] utility to decode markdown strings. ## Contents * [What is this?](#what-is-this)
- Lines: 182
- Characters: 4513

---

# Source: .\node_modules\micromark-util-encode\readme.md

- Preview: # micromark-util-encode [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] utility to encode dangerous html characters. ## Contents * [What is this?](#what-is-this
- Lines: 179
- Characters: 4272

---

# Source: .\node_modules\micromark-util-html-tag-name\readme.md

- Preview: # micromark-util-html-tag-name [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] utility with list of html tag names. ## Contents * [What is this?](#what-is-this)
- Lines: 196
- Characters: 5169

---

# Source: .\node_modules\micromark-util-normalize-identifier\readme.md

- Preview: # micromark-util-normalize-identifier [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] utility normalize identifiers. ## Contents * [What is this?](#what-is-this
- Lines: 190
- Characters: 5025

---

# Source: .\node_modules\micromark-util-resolve-all\readme.md

- Preview: # micromark-util-resolve-all [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] utility to resolve subtokens. [Resolvers][resolver] are functions that take events
- Lines: 241
- Characters: 5967

---

# Source: .\node_modules\micromark-util-sanitize-uri\readme.md

- Preview: # micromark-util-sanitize-uri [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] utility to sanitize urls. ## Contents * [What is this?](#what-is-this) * [When sho
- Lines: 217
- Characters: 5811

---

# Source: .\node_modules\micromark-util-subtokenize\readme.md

- Preview: # micromark-util-subtokenize [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] utility to tokenize subtokens. ## Contents * [What is this?](#what-is-this) * [When
- Lines: 184
- Characters: 4435

---

# Source: .\node_modules\micromark-util-symbol\readme.md

- Preview: # micromark-util-symbol [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] utility with symbols. ## Contents * [What is this?](#what-is-this) * [When should I use
- Lines: 171
- Characters: 4429

---

# Source: .\node_modules\micromark-util-types\readme.md

- Preview: # micromark-util-types [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][bundle-size-badge]][bundle-size] [![Sponsors][sponsors-badge]][opencollective] [![Backers][backers-badge]][opencollective] [![Chat][chat-badge]][chat] [micromark][] utility package with TypeScript types. ## Contents * [What is this?](#what-is-this) * [Wh
- Lines: 154
- Characters: 3761

---

# Source: .\node_modules\micromatch\node_modules\picomatch\CHANGELOG.md

- Preview: # Release history **All notable changes to this project will be documented in this file.** The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html). <details> <summary><strong>Guiding Principles</strong></summary> - Changelogs are for humans, not machines. - There should be an entry for ever
- Lines: 139
- Characters: 6067

---

# Source: .\node_modules\micromatch\node_modules\picomatch\README.md

- Preview: <h1 align="center">Picomatch</h1> <p align="center"> <a href="https://npmjs.org/package/picomatch"> <img src="https://img.shields.io/npm/v/picomatch.svg" alt="version"> </a> <a href="https://github.com/micromatch/picomatch/actions?workflow=Tests"> <img src="https://github.com/micromatch/picomatch/workflows/Tests/badge.svg" alt="test status"> </a> <a href="https://coveralls.io/github/micromatch/pic
- Lines: 711
- Characters: 26674

---

# Source: .\node_modules\micromatch\README.md

- Preview: # micromatch [![NPM version](https://img.shields.io/npm/v/micromatch.svg?style=flat)](https://www.npmjs.com/package/micromatch) [![NPM monthly downloads](https://img.shields.io/npm/dm/micromatch.svg?style=flat)](https://npmjs.org/package/micromatch) [![NPM total downloads](https://img.shields.io/npm/dt/micromatch.svg?style=flat)](https://npmjs.org/package/micromatch)  [![Tests](https://github.com/
- Lines: 1027
- Characters: 37906

---

# Source: .\node_modules\mime-db\HISTORY.md

- Preview: 1.54.0 / 2025-03-17 =================== * Update mime type for DCM format (#362) * mark application/octet-stream as compressible (#163) * Fix typo in application/x-zip-compressed mimetype (#359) * Add mime-type for Jupyter notebooks (#282) * Add Google Drive MIME types (#311) * Add .blend file type (#338) * Add support for the FBX file extension (#342) * Add Adobe DNG file (#340) * Add Procreate B
- Lines: 544
- Characters: 13345

---

# Source: .\node_modules\mime-db\README.md

- Preview: # mime-db [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Node.js Version][node-image]][node-url] [![Build Status][ci-image]][ci-url] [![Coverage Status][coveralls-image]][coveralls-url] This is a large database of mime types and information about them. It consists of a single, public JSON file and does not include any logic, allowing it to remain a
- Lines: 112
- Characters: 4840

---

# Source: .\node_modules\mime-types\HISTORY.md

- Preview: 3.0.1 / 2025-03-26 =================== * deps: mime-db@1.54.0 3.0.0 / 2024-08-31 =================== * Drop support for node <18 * deps: mime-db@1.53.0 * resolve extension conflicts with mime-score (#119) * asc -> application/pgp-signature is now application/pgp-keys * mpp -> application/vnd.ms-project is now application/dash-patch+xml * ac -> application/vnd.nokia.n-gage.ac+xml is now application
- Lines: 424
- Characters: 9206

---

# Source: .\node_modules\mime-types\README.md

- Preview: # mime-types [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Node.js Version][node-version-image]][node-version-url] [![Build Status][ci-image]][ci-url] [![Test Coverage][coveralls-image]][coveralls-url] The ultimate javascript content-type utility. Similar to [the `mime@1.x` module](https://www.npmjs.com/package/mime), except: - __No fallbacks.__ I
- Lines: 129
- Characters: 4346

---

# Source: .\node_modules\minimatch\README.md

- Preview: # minimatch A minimal matching utility. [![Build Status](https://travis-ci.org/isaacs/minimatch.svg?branch=master)](http://travis-ci.org/isaacs/minimatch) This is the matching library used internally by npm. It works by converting glob expressions into JavaScript `RegExp` objects. ## Usage ```javascript var minimatch = require("minimatch") minimatch("bar.foo", "*.foo") // true! minimatch("bar.foo"
- Lines: 233
- Characters: 6941

---

# Source: .\node_modules\minimist\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.2.8](https://github.com/minimistjs/minimist/compare/v1.2.7...v1.2.8) - 2023-02-09 ### Merged - [Fix] Fix long option followed by single dash [`#
- Lines: 301
- Characters: 21244

---

# Source: .\node_modules\minimist\README.md

- Preview: # minimist <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] parse argument options This module is the guts of optimist's argument parser without all the fanciful decora
- Lines: 124
- Characters: 3488

---

# Source: .\node_modules\min-indent\readme.md

- Preview: # min-indent [![Build Status](https://travis-ci.org/thejameskyle/min-indent.svg?branch=master)](https://travis-ci.org/thejameskyle/min-indent) > Get the shortest leading whitespace from lines in a string The line with the least number of leading whitespace, ignoring empty lines, determines the number. Useful for removing redundant indentation. ## Install ``` $ npm install --save min-indent ``` ##
- Lines: 44
- Characters: 884

---

# Source: .\node_modules\minipass\README.md

- Preview: # minipass A _very_ minimal implementation of a [PassThrough stream](https://nodejs.org/api/stream.html#stream_class_stream_passthrough) [It's very fast](https://docs.google.com/spreadsheets/d/1K_HR5oh3r80b8WVMWCPPjfuWXUgfkmhlX7FGI6JJ8tY/edit?usp=sharing) for objects, strings, and buffers. Supports `pipe()`ing (including multi-`pipe()` and backpressure transmission), buffering data until either a
- Lines: 828
- Characters: 26334

---

# Source: .\node_modules\moment\CHANGELOG.md

- Preview: Changelog ========= ### 2.30.1 * Release Dec 27, 2023 * Revert https://github.com/moment/moment/pull/5827, because it's breaking a lot of TS code. ### 2.30.0 [Full changelog](https://gist.github.com/ichernev/e277bcd1f0eeabb834f60a777237925a) * Release Dec 26, 2023 ### 2.29.4 * Release Jul 6, 2022 * [#6015](https://github.com/moment/moment/pull/6015) [bugfix] Fix ReDoS in preprocessRFC2822 regex ##
- Lines: 999
- Characters: 44979

---

# Source: .\node_modules\moment\README.md

- Preview: # [Moment.js](http://momentjs.com/) [![NPM version][npm-version-image]][npm-url] [![NPM downloads][npm-downloads-image]][npm-downloads-url] [![MIT License][license-image]][license-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![FOSSA Status][fossa-badge-image]][fossa-badge-url] [![SemVer compatibility][semver-image]][semver-url] A JavaScript
- Lines: 58
- Characters: 2413

---

# Source: .\node_modules\motion-dom\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) 2024 [Motion](https://motion.dev) B.V. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Softw
- Lines: 24
- Characters: 1079

---

# Source: .\node_modules\motion-utils\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) 2024 [Motion](https://motion.dev) B.V. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Softw
- Lines: 24
- Characters: 1079

---

# Source: .\node_modules\ms\license.md

- Preview: The MIT License (MIT) Copyright (c) 2020 Vercel, Inc. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit pe
- Lines: 24
- Characters: 1058

---

# Source: .\node_modules\ms\readme.md

- Preview: # ms ![CI](https://github.com/vercel/ms/workflows/CI/badge.svg) Use this package to easily convert various time formats to milliseconds. ## Examples ```js ms('2 days')  // 172800000 ms('1d')      // 86400000 ms('10h')     // 36000000 ms('2.5 hrs') // 9000000 ms('2h')      // 7200000 ms('1m')      // 60000 ms('5s')      // 5000 ms('1y')      // 31557600000 ms('100')     // 100 ms('-3 days') // -259
- Lines: 62
- Characters: 1827

---

# Source: .\node_modules\mz\HISTORY.md

- Preview: 2.7.0 / 2017-09-13 ================== * feat: support fs.copyFile (#58) 2.6.0 / 2016-11-22 ================== * Added fdatasync to fs api (#46) 2.5.0 / 2016-11-04 ================== * feat: support fs.mkdtemp 2.4.0 / 2016-03-23 ================== * add `fs.truncate()` [#34](https://github.com/normalize/mz/pull/34) 2.3.1 / 2016-02-01 ================== * update `any-promise@v1` 2.3.0 / 2016-01-30 =
- Lines: 69
- Characters: 1071

---

# Source: .\node_modules\mz\README.md

- Preview: # MZ - Modernize node.js [![NPM version][npm-image]][npm-url] [![Build status][travis-image]][travis-url] [![Test coverage][coveralls-image]][coveralls-url] [![Dependency Status][david-image]][david-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] Modernize node.js to current ECMAScript specifications! node.js will not update their API to ES6+ [for a whi
- Lines: 109
- Characters: 2797

---

# Source: .\node_modules\nano\CONTRIBUTING.md

- Preview: # Contributing to nano Please take a moment to review this document in order to make the contribution process easy and effective for everyone involved. Following these guidelines helps to communicate that you respect the time of the developers managing and developing this open source project. In return, they should reciprocate that respect in addressing your issue, assessing changes, and helping y
- Lines: 53
- Characters: 1854

---

# Source: .\node_modules\nano\migration_8_to_9.md

- Preview: # Migration Guide for moving from Nano 8.x to 9.x The 9.x release of Nano sees the following changes: - the underlying library that handles HTTP request changes to [axios](https://www.npmjs.com/package/axios) as the previous library has been deprecated. - the number of dependencies has been reduced - there are now only two runtime dependencies. - the changes feed handler has been rewritten and bun
- Lines: 46
- Characters: 1574

---

# Source: .\node_modules\nano\README.md

- Preview: [![NPM](http://img.shields.io/npm/v/nano.svg?style=flat-square)](https://www.npmjs.com/package/nano) # Nano Offical [Apache CouchDB](https://couchdb.apache.org/) library for [Node.js](https://nodejs.org/). Features: * **Minimalistic** - There is only a minimum of abstraction between you and CouchDB. * **Pipes** - Proxy requests from CouchDB directly to your end user. ( `...AsStream` functions only
- Lines: 1379
- Characters: 44563

---

# Source: .\node_modules\nanoid\README.md

- Preview: # Nano ID <img src="https://ai.github.io/nanoid/logo.svg" align="right" alt="Nano ID logo by Anton Lovchikov" width="180" height="94"> **English** | [Русский](./README.ru.md) | [简体中文](./README.zh-CN.md) | [Bahasa Indonesia](./README.id-ID.md) A tiny, secure, URL-friendly, unique string ID generator for JavaScript. > “An amazing level of senseless perfectionism, > which is simply impossible not to
- Lines: 42
- Characters: 1485

---

# Source: .\node_modules\natural-compare\README.md

- Preview: [Build]:    http://img.shields.io/travis/litejs/natural-compare-lite.png [Coverage]: http://img.shields.io/coveralls/litejs/natural-compare-lite.png [1]: https://travis-ci.org/litejs/natural-compare-lite [2]: https://coveralls.io/r/litejs/natural-compare-lite [npm package]: https://npmjs.org/package/natural-compare-lite [GitHub repo]: https://github.com/litejs/natural-compare-lite @version    1.4.
- Lines: 128
- Characters: 3141

---

# Source: .\node_modules\negotiator\HISTORY.md

- Preview: 1.0.0 / 2024-08-31 ================== * Drop support for node <18 * Added an option preferred encodings array #59 0.6.3 / 2022-01-22 ================== * Revert "Lazy-load modules from main entry point" 0.6.2 / 2019-04-29 ================== * Fix sorting charset, encoding, and language with extra parameters 0.6.1 / 2016-05-02 ================== * perf: improve `Accept` parsing speed * perf: improv
- Lines: 117
- Characters: 2505

---

# Source: .\node_modules\negotiator\README.md

- Preview: # negotiator [![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url] [![Node.js Version][node-version-image]][node-version-url] [![Build Status][github-actions-ci-image]][github-actions-ci-url] [![Test Coverage][coveralls-image]][coveralls-url] An HTTP content negotiator for Node.js ## Installation ```sh $ npm install negotiator ``` ## API ```js var Negotiator = req
- Lines: 215
- Characters: 5118

---

# Source: .\node_modules\nice-try\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html). ## [1.0.5] - 2018-08-25 ### Changed - Removed `prepublish` script from `package.json` ## [1.0.4] - 2017-08-08 ### New - Added a changelog ### Changed - I
- Lines: 24
- Characters: 437

---

# Source: .\node_modules\nice-try\README.md

- Preview: # nice-try [![Travis Build Status](https://travis-ci.org/electerious/nice-try.svg?branch=master)](https://travis-ci.org/electerious/nice-try) [![AppVeyor Status](https://ci.appveyor.com/api/projects/status/8tqb09wrwci3xf8l?svg=true)](https://ci.appveyor.com/project/electerious/nice-try) [![Coverage Status](https://coveralls.io/repos/github/electerious/nice-try/badge.svg?branch=master)](https://cov
- Lines: 35
- Characters: 1143

---

# Source: .\node_modules\node-abort-controller\CHANGELOG.md

- Preview: # 3.0.0 Removes default exports for AbortController. You must now import the `AbortController` object explicitly. This is a breaking change for some users relying on default exports. Upgrading to 3.0 is a one line change: ```js // ES Modules Users // v2 import AbortController from "node-abort-controller"; // v3 import { AbortController } from "node-abort-controller"; // Common JS Users // v2 const
- Lines: 43
- Characters: 988

---

# Source: .\node_modules\node-abort-controller\README.md

- Preview: # node-abort-controller AbortController Polyfill for Node.JS based on EventEmitter for Node v14.6.x and below. Are you using Node 14.7.0 or above? You don't need this! [Node has `AbortController` and `AbortSignal` as builtin globals](https://nodejs.org/dist/latest/docs/api/globals.html#globals_class_abortcontroller). In Node versions >=14.7.0 and <15.4.0 you can access the experimental implementat
- Lines: 103
- Characters: 4070

---

# Source: .\node_modules\node-fetch\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) 2016 David Frank Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit per
- Lines: 25
- Characters: 1057

---

# Source: .\node_modules\node-fetch\node_modules\webidl-conversions\LICENSE.md

- Preview: # The BSD 2-Clause License Copyright (c) 2014, Domenic Denicola All rights reserved. Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met: 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer. 2. Redistributions in binary form must repro
- Lines: 15
- Characters: 1311

---

# Source: .\node_modules\node-fetch\node_modules\webidl-conversions\README.md

- Preview: # WebIDL Type Conversions on JavaScript Values This package implements, in JavaScript, the algorithms to convert a given JavaScript value according to a given [WebIDL](http://heycam.github.io/webidl/) [type](http://heycam.github.io/webidl/#idl-types). The goal is that you should be able to write code like ```js const conversions = require("webidl-conversions"); function doStuff(x, y) { x = convers
- Lines: 56
- Characters: 5415

---

# Source: .\node_modules\node-fetch\node_modules\whatwg-url\README.md

- Preview: # whatwg-url whatwg-url is a full implementation of the WHATWG [URL Standard](https://url.spec.whatwg.org/). It can be used standalone, but it also exposes a lot of the internal algorithms that are useful for integrating a URL parser into a project like [jsdom](https://github.com/tmpvar/jsdom). ## Current Status whatwg-url is currently up to date with the URL spec up to commit [a62223](https://git
- Lines: 70
- Characters: 5060

---

# Source: .\node_modules\node-fetch\README.md

- Preview: node-fetch ========== [![npm version][npm-image]][npm-url] [![build status][travis-image]][travis-url] [![coverage status][codecov-image]][codecov-url] [![install size][install-size-image]][install-size-url] [![Discord][discord-image]][discord-url] A light-weight module that brings `window.fetch` to Node.js (We are looking for [v2 maintainers and collaborators](https://github.com/bitinn/node-fetch
- Lines: 637
- Characters: 20698

---

# Source: .\node_modules\node-fetch-native\README.md

- Preview: # node-fetch-native [![][npm-version-src]][npm-version-href] [![][github-actions-src]][github-actions-href] [![][packagephobia-src]][packagephobia-href] [![npm downloads][npm-downloads-src]][npm-downloads-href] <!-- [![Codecov][codecov-src]][codecov-href] --> A redistribution of [node-fetch v3](https://github.com/node-fetch/node-fetch) (+ more!) for better backward and forward compatibility. **Why
- Lines: 228
- Characters: 7597

---

# Source: .\node_modules\node-releases\README.md

- Preview: # Node.js releases data All data is located in `data` directory. `data/processed` contains `envs.json` with node.js releases data preprocessed to be used by [Browserslist](https://github.com/ai/browserslist) and other projects. Each version in this file contains only necessary info: version, release date, LTS flag/name, and security flag. `data/release-schedule` contains `release-schedule.json` wi
- Lines: 15
- Characters: 493

---

# Source: .\node_modules\normalize-package-data\node_modules\semver\README.md

- Preview: semver(1) -- The semantic versioner for npm =========================================== ## Install ```bash npm install --save semver ```` ## Usage As a node module: ```js const semver = require('semver') semver.valid('1.2.3') // '1.2.3' semver.valid('a.b.c') // null semver.clean('  =v1.2.3   ') // '1.2.3' semver.satisfies('1.2.3', '1.x || >=2.5.0 || 5.0.0 - 7.2.3') // true semver.gt('1.2.3', '9.8.
- Lines: 415
- Characters: 15311

---

# Source: .\node_modules\normalize-package-data\README.md

- Preview: # normalize-package-data [![Build Status](https://travis-ci.org/npm/normalize-package-data.png?branch=master)](https://travis-ci.org/npm/normalize-package-data) normalize-package-data exports a function that normalizes package metadata. This data is typically found in a package.json file, but in principle could come from any source - for example the npm registry. normalize-package-data is used by
- Lines: 109
- Characters: 7116

---

# Source: .\node_modules\normalize-path\README.md

- Preview: # normalize-path [![NPM version](https://img.shields.io/npm/v/normalize-path.svg?style=flat)](https://www.npmjs.com/package/normalize-path) [![NPM monthly downloads](https://img.shields.io/npm/dm/normalize-path.svg?style=flat)](https://npmjs.org/package/normalize-path) [![NPM total downloads](https://img.shields.io/npm/dt/normalize-path.svg?style=flat)](https://npmjs.org/package/normalize-path) [!
- Lines: 130
- Characters: 5312

---

# Source: .\node_modules\normalize-range\readme.md

- Preview: # normalize-range Utility for normalizing a numeric range, with a wrapping function useful for polar coordinates. [![Build Status](https://travis-ci.org/jamestalmage/normalize-range.svg?branch=master)](https://travis-ci.org/jamestalmage/normalize-range) [![Coverage Status](https://coveralls.io/repos/jamestalmage/normalize-range/badge.svg?branch=master&service=github)](https://coveralls.io/github/j
- Lines: 151
- Characters: 3855

---

# Source: .\node_modules\npm-api\CHANGELOG.md

- Preview: # Changelog ## key Changelog entries are classified using the following labels _(from [keep-a-changelog][]_): - `added`: for new features - `changed`: for changes in existing functionality - `deprecated`: for once-stable features removed in upcoming releases - `removed`: for deprecated features removed in this release - `fixed`: for any bug fixes ## [Unreleased] ### Added - Used [generate-log](htt
- Lines: 43
- Characters: 1509

---

# Source: .\node_modules\npm-api\README.md

- Preview: # npm-api [![NPM version](https://img.shields.io/npm/v/npm-api.svg?style=flat)](https://www.npmjs.com/package/npm-api) [![NPM monthly downloads](https://img.shields.io/npm/dm/npm-api.svg?style=flat)](https://npmjs.org/package/npm-api) [![NPM total downloads](https://img.shields.io/npm/dt/npm-api.svg?style=flat)](https://npmjs.org/package/npm-api) [![Linux Build Status](https://img.shields.io/travi
- Lines: 423
- Characters: 9738

---

# Source: .\node_modules\npm-run-all\docs\node-api.md

- Preview: | [index](../README.md) | [npm-run-all](npm-run-all.md) | [run-s](run-s.md) | [run-p](run-p.md) | Node API | |-----------------------|-------------------------------|-------------------|-------------------|----------| # Node API A Node module to run given npm-scripts in parallel or sequential. ```js const runAll = require("npm-run-all"); runAll(["clean", "lint", "build:*"], {parallel: false}) .the
- Lines: 120
- Characters: 4945

---

# Source: .\node_modules\npm-run-all\docs\npm-run-all.md

- Preview: | [index](../README.md) | npm-run-all | [run-s](run-s.md) | [run-p](run-p.md) | [Node API](node-api.md) | |-----------------------|-------------|-------------------|-------------------|-------------------------| # `npm-run-all` command ``` Usage: $ npm-run-all [--help | -h | --version | -v] $ npm-run-all [tasks] [OPTIONS] Run given npm-scripts in parallel or sequential. <tasks> : A list of npm-scr
- Lines: 195
- Characters: 6872

---

# Source: .\node_modules\npm-run-all\docs\run-p.md

- Preview: | [index](../README.md) | [npm-run-all](npm-run-all.md) | [run-s](run-s.md) | run-p | [Node API](node-api.md) | |-----------------------|-------------------------------|-------------------|-------|-------------------------| # `run-p` command A CLI command to run given npm-scripts in parallel. This command is the shorthand of `npm-run-all -p`. ``` Usage: $ run-p [--help | -h | --version | -v] $ run
- Lines: 159
- Characters: 5348

---

# Source: .\node_modules\npm-run-all\docs\run-s.md

- Preview: | [index](../README.md) | [npm-run-all](npm-run-all.md) | run-s | [run-p](run-p.md) | [Node API](node-api.md) | |-----------------------|-------------------------------|-------|-------------------|-------------------------| # `run-s` command A CLI command to run given npm-scripts sequentially. This command is the shorthand of `npm-run-all -s`. ``` Usage: $ run-s [--help | -h | --version | -v] $ ru
- Lines: 150
- Characters: 4735

---

# Source: .\node_modules\npm-run-all\node_modules\ansi-styles\readme.md

- Preview: # ansi-styles [![Build Status](https://travis-ci.org/chalk/ansi-styles.svg?branch=master)](https://travis-ci.org/chalk/ansi-styles) > [ANSI escape codes](http://en.wikipedia.org/wiki/ANSI_escape_code#Colors_and_Styles) for styling strings in the terminal You probably want the higher-level [chalk](https://github.com/chalk/chalk) module for styling your strings. <img src="https://cdn.rawgit.com/chal
- Lines: 150
- Characters: 3564

---

# Source: .\node_modules\npm-run-all\node_modules\chalk\readme.md

- Preview: <h1 align="center"> <br> <br> <img width="320" src="media/logo.svg" alt="Chalk"> <br> <br> <br> </h1> > Terminal string styling done right [![Build Status](https://travis-ci.org/chalk/chalk.svg?branch=master)](https://travis-ci.org/chalk/chalk) [![Coverage Status](https://coveralls.io/repos/github/chalk/chalk/badge.svg?branch=master)](https://coveralls.io/github/chalk/chalk?branch=master) [![](htt
- Lines: 317
- Characters: 10460

---

# Source: .\node_modules\npm-run-all\node_modules\color-convert\CHANGELOG.md

- Preview: # 1.0.0 - 2016-01-07 - Removed: unused speed test - Added: Automatic routing between previously unsupported conversions ([#27](https://github.com/Qix-/color-convert/pull/27)) - Removed: `xxx2xxx()` and `xxx2xxxRaw()` functions ([#27](https://github.com/Qix-/color-convert/pull/27)) - Removed: `convert()` class ([#27](https://github.com/Qix-/color-convert/pull/27)) - Changed: all functions to lookup
- Lines: 56
- Characters: 1360

---

# Source: .\node_modules\npm-run-all\node_modules\color-convert\README.md

- Preview: # color-convert [![Build Status](https://travis-ci.org/Qix-/color-convert.svg?branch=master)](https://travis-ci.org/Qix-/color-convert) Color-convert is a color conversion library for JavaScript and node. It converts all ways between `rgb`, `hsl`, `hsv`, `hwb`, `cmyk`, `ansi`, `ansi16`, `hex` strings, and CSS `keyword`s (will round to closest): ```js var convert = require('color-convert'); convert
- Lines: 71
- Characters: 2785

---

# Source: .\node_modules\npm-run-all\node_modules\color-name\README.md

- Preview: A JSON with color names and its values. Based on http://dev.w3.org/csswg/css-color/#named-colors. [![NPM](https://nodei.co/npm/color-name.png?mini=true)](https://nodei.co/npm/color-name/) ```js var colors = require('color-name'); colors.red //[255,0,0] ``` <a href="LICENSE"><img src="https://upload.wikimedia.org/wikipedia/commons/0/0c/MIT_logo.svg" width="120"/></a>
- Lines: 14
- Characters: 362

---

# Source: .\node_modules\npm-run-all\node_modules\cross-spawn\README.md

- Preview: # cross-spawn [![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Build status][appveyor-image]][appveyor-url] [![Coverage Status][codecov-image]][codecov-url] [![Dependency status][david-dm-image]][david-dm-url] [![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url] [![Greenkeeper badge][greenkeeper-image]][greenke
- Lines: 97
- Characters: 4727

---

# Source: .\node_modules\npm-run-all\node_modules\escape-string-regexp\readme.md

- Preview: # escape-string-regexp [![Build Status](https://travis-ci.org/sindresorhus/escape-string-regexp.svg?branch=master)](https://travis-ci.org/sindresorhus/escape-string-regexp) > Escape RegExp special characters ## Install ``` $ npm install --save escape-string-regexp ``` ## Usage ```js const escapeStringRegexp = require('escape-string-regexp'); const escapedString = escapeStringRegexp('how much $ for
- Lines: 30
- Characters: 524

---

# Source: .\node_modules\npm-run-all\node_modules\has-flag\readme.md

- Preview: # has-flag [![Build Status](https://travis-ci.org/sindresorhus/has-flag.svg?branch=master)](https://travis-ci.org/sindresorhus/has-flag) > Check if [`argv`](https://nodejs.org/docs/latest/api/process.html#process_process_argv) has a specific flag Correctly stops looking after an `--` argument terminator. ## Install ``` $ npm install has-flag ``` ## Usage ```js // foo.js const hasFlag = require('ha
- Lines: 73
- Characters: 915

---

# Source: .\node_modules\npm-run-all\node_modules\path-key\readme.md

- Preview: # path-key [![Build Status](https://travis-ci.org/sindresorhus/path-key.svg?branch=master)](https://travis-ci.org/sindresorhus/path-key) > Get the [PATH](https://en.wikipedia.org/wiki/PATH_(variable)) environment variable key cross-platform It's usually `PATH`, but on Windows it can be any casing like `Path`... ## Install ``` $ npm install --save path-key ``` ## Usage ```js const pathKey = require
- Lines: 54
- Characters: 915

---

# Source: .\node_modules\npm-run-all\node_modules\semver\README.md

- Preview: semver(1) -- The semantic versioner for npm =========================================== ## Install ```bash npm install --save semver ```` ## Usage As a node module: ```js const semver = require('semver') semver.valid('1.2.3') // '1.2.3' semver.valid('a.b.c') // null semver.clean('  =v1.2.3   ') // '1.2.3' semver.satisfies('1.2.3', '1.x || >=2.5.0 || 5.0.0 - 7.2.3') // true semver.gt('1.2.3', '9.8.
- Lines: 415
- Characters: 15311

---

# Source: .\node_modules\npm-run-all\node_modules\shebang-command\readme.md

- Preview: # shebang-command [![Build Status](https://travis-ci.org/kevva/shebang-command.svg?branch=master)](https://travis-ci.org/kevva/shebang-command) > Get the command from a shebang ## Install ``` $ npm install --save shebang-command ``` ## Usage ```js const shebangCommand = require('shebang-command'); shebangCommand('#!/usr/bin/env node'); //=> 'node' shebangCommand('#!/bin/bash'); //=> 'bash' ``` ##
- Lines: 42
- Characters: 527

---

# Source: .\node_modules\npm-run-all\node_modules\shebang-regex\readme.md

- Preview: # shebang-regex [![Build Status](https://travis-ci.org/sindresorhus/shebang-regex.svg?branch=master)](https://travis-ci.org/sindresorhus/shebang-regex) > Regular expression for matching a [shebang](https://en.wikipedia.org/wiki/Shebang_(Unix)) ## Install ``` $ npm install --save shebang-regex ``` ## Usage ```js var shebangRegex = require('shebang-regex'); var str = '#!/usr/bin/env node\nconsole.lo
- Lines: 32
- Characters: 550

---

# Source: .\node_modules\npm-run-all\node_modules\supports-color\readme.md

- Preview: # supports-color [![Build Status](https://travis-ci.org/chalk/supports-color.svg?branch=master)](https://travis-ci.org/chalk/supports-color) > Detect whether a terminal supports color ## Install ``` $ npm install supports-color ``` ## Usage ```js const supportsColor = require('supports-color'); if (supportsColor.stdout) { console.log('Terminal stdout supports color'); } if (supportsColor.stdout.ha
- Lines: 69
- Characters: 1799

---

# Source: .\node_modules\npm-run-all\node_modules\which\CHANGELOG.md

- Preview: # Changes ## 1.3.1 * update deps * update travis ## v1.3.0 * Add nothrow option to which.sync * update tap ## v1.2.14 * appveyor: drop node 5 and 0.x * travis-ci: add node 6, drop 0.x ## v1.2.13 * test: Pass missing option to pass on windows * update tap * update isexe to 2.0.0 * neveragain.tech pledge request ## v1.2.12 * Removed unused require ## v1.2.11 * Prevent changelog script from being inc
- Lines: 155
- Characters: 2288

---

# Source: .\node_modules\npm-run-all\node_modules\which\README.md

- Preview: # which Like the unix `which` utility. Finds the first instance of a specified executable in the PATH environment variable.  Does not cache the results, so `hash -r` is not needed when the PATH changes. ## USAGE ```javascript var which = require('which') // async usage which('node', function (er, resolvedPath) { // er is returned if no "node" is found on the PATH // if it is found, then the absolu
- Lines: 54
- Characters: 1207

---

# Source: .\node_modules\npm-run-all\README.md

- Preview: | index | [npm-run-all] | [run-s] | [run-p] | [Node API] | |-------|---------------|---------|---------|------------| # npm-run-all [![npm version](https://img.shields.io/npm/v/npm-run-all.svg)](https://www.npmjs.com/package/npm-run-all) [![Downloads/month](https://img.shields.io/npm/dm/npm-run-all.svg)](http://www.npmtrends.com/npm-run-all) [![Build Status](https://travis-ci.org/mysticatea/npm-ru
- Lines: 94
- Characters: 2960

---

# Source: .\node_modules\nth-check\README.md

- Preview: # nth-check [![Build Status](https://travis-ci.org/fb55/nth-check.svg)](https://travis-ci.org/fb55/nth-check) Parses and compiles CSS nth-checks to highly optimized functions. ### About This module can be used to parse & compile nth-checks, as they are found in CSS 3's `nth-child()` and `nth-last-of-type()`. It can be used to check if a given index matches a given nth-rule, or to generate a sequen
- Lines: 138
- Characters: 3515

---

# Source: .\node_modules\nwsapi\README.md

- Preview: # [NWSAPI](http://dperini.github.io/nwsapi/) Fast CSS Selectors API Engine ![](https://img.shields.io/npm/v/nwsapi.svg?colorB=orange&style=flat) ![](https://img.shields.io/github/tag/dperini/nwsapi.svg?style=flat) ![](https://img.shields.io/npm/dw/nwsapi.svg?style=flat) ![](https://img.shields.io/github/issues/dperini/nwsapi.svg?style=flat) NWSAPI is the development progress of [NWMATCHER](https:/
- Lines: 135
- Characters: 5308

---

# Source: .\node_modules\oauth4webapi\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) 2022 Filip Skokan Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit pe
- Lines: 24
- Characters: 1058

---

# Source: .\node_modules\oauth4webapi\README.md

- Preview: # oauth4webapi > Low-Level OAuth 2 / OpenID Connect Client API for JavaScript Runtimes This software provides a collection of routines that can be used to build client modules for OAuth 2.1, OAuth 2.0 with the latest Security Best Current Practices (BCP), and FAPI 2.0, as well as OpenID Connect where applicable. The primary goal of this software is to promote secure and up-to-date best practices w
- Lines: 107
- Characters: 5794

---

# Source: .\node_modules\object.assign\CHANGELOG.md

- Preview: 4.1.7 / 2024-12-18 ================== * [Deps] add missing `es-object-atoms` (#86) 4.1.6 / 2024-12-18 ================== * [Refactor] use `call-bound` directly; use `es-object-atoms` * [Deps] update `call-bind`, `has-symbols` * [Dev Deps] update `@es-shims/api`, `@ljharb/eslint-config`, `hasown`, `mock-property`, `ses`, `tape` * [actions] split out node 10-20, and 20+ * [actions] remove redundant
- Lines: 249
- Characters: 9459

---

# Source: .\node_modules\object.assign\README.md

- Preview: # object.assign <sup>[![Version Badge][npm-version-svg]][npm-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][npm-url] An Object.ass
- Lines: 139
- Characters: 3725

---

# Source: .\node_modules\object-assign\readme.md

- Preview: # object-assign [![Build Status](https://travis-ci.org/sindresorhus/object-assign.svg?branch=master)](https://travis-ci.org/sindresorhus/object-assign) > ES2015 [`Object.assign()`](http://www.2ality.com/2014/01/object-assign.html) [ponyfill](https://ponyfill.com) ## Use the built-in Node.js 4 and up, as well as every evergreen browser (Chrome, Edge, Firefox, Opera, Safari), support `Object.assign(
- Lines: 64
- Characters: 1440

---

# Source: .\node_modules\object-inspect\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.13.4](https://github.com/inspect-js/object-inspect/compare/v1.13.3...v1.13.4) - 2025-02-04 ### Commits - [Fix] avoid being fooled by a `Symbol.t
- Lines: 427
- Characters: 36120

---

# Source: .\node_modules\object-keys\CHANGELOG.md

- Preview: 1.1.1 / 2019-04-06 ================= * [Fix] exclude deprecated Firefox keys (#53) 1.1.0 / 2019-02-10 ================= * [New] [Refactor] move full implementation to `implementation` entry point * [Refactor] only evaluate the implementation if `Object.keys` is not present * [Tests] up to `node` `v11.8`, `v10.15`, `v8.15`, `v6.16` * [Tests] remove jscs * [Tests] switch to `npm audit` from `nsp` 1.
- Lines: 235
- Characters: 7313

---

# Source: .\node_modules\object-keys\README.md

- Preview: #object-keys <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![Build Status][travis-svg]][travis-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] [![browser support][testling-svg]][testling-url] An Obje
- Lines: 79
- Characters: 2384

---

# Source: .\node_modules\octokit\README.md

- Preview: # octokit.js > The all-batteries-included GitHub SDK for Browsers, Node.js, and Deno. The `octokit` package integrates the three main Octokit libraries 1. **API client** (REST API requests, GraphQL API queries, Authentication) 2. **App client** (GitHub App & installations, Webhooks, OAuth) 3. **Action client** (Pre-authenticated API client for single repository) ## Table of contents <!-- omit in t
- Lines: 980
- Characters: 34253

---

# Source: .\node_modules\ofetch\README.md

- Preview: # ofetch [![npm version][npm-version-src]][npm-version-href] [![npm downloads][npm-downloads-src]][npm-downloads-href] [![bundle][bundle-src]][bundle-href] [![Codecov][codecov-src]][codecov-href] [![License][license-src]][license-href] [![JSDocs][jsdocs-src]][jsdocs-href] A better fetch API. Works on node, browser, and workers. <details> <summary>Spoiler</summary> <img src="https://media.giphy.com
- Lines: 420
- Characters: 13006

---

# Source: .\node_modules\once\README.md

- Preview: # once Only call a function once. ## usage ```javascript var once = require('once') function load (file, cb) { cb = once(cb) loader.load('file') loader.once('load', cb) loader.once('error', cb) } ``` Or add to the Function.prototype in a responsible way: ```javascript // only has to be done once require('once').proto() function load (file, cb) { cb = cb.once() loader.load('file') loader.once('load
- Lines: 82
- Characters: 1693

---

# Source: .\node_modules\on-finished\HISTORY.md

- Preview: 2.4.1 / 2022-02-22 ================== * Fix error on early async hooks implementations 2.4.0 / 2022-02-21 ================== * Prevent loss of async hooks context 2.3.0 / 2015-05-26 ================== * Add defined behavior for HTTP `CONNECT` requests * Add defined behavior for HTTP `Upgrade` requests * deps: ee-first@1.1.1 2.2.1 / 2015-04-22 ================== * Fix `isFinished(req)` when data bu
- Lines: 101
- Characters: 1767

---

# Source: .\node_modules\on-finished\README.md

- Preview: # on-finished [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Node.js Version][node-image]][node-url] [![Build Status][ci-image]][ci-url] [![Coverage Status][coveralls-image]][coveralls-url] Execute a callback when a HTTP request closes, finishes, or errors. ## Install This is a [Node.js](https://nodejs.org/en/) module available through the [npm reg
- Lines: 165
- Characters: 4998

---

# Source: .\node_modules\open\readme.md

- Preview: # open > Open stuff like URLs, files, executables. Cross-platform. This is meant to be used in command-line tools and scripts, not in the browser. If you need this for Electron, use [`shell.openPath()`](https://www.electronjs.org/docs/api/shell#shellopenpathpath) instead. This package does not make any security guarantees. If you pass in untrusted input, it's up to you to properly sanitize it. ###
- Lines: 174
- Characters: 5492

---

# Source: .\node_modules\openai\CHANGELOG.md

- Preview: # Changelog ## 5.23.2 (2025-09-29) Full Changelog: [v5.23.1...v5.23.2](https://github.com/openai/openai-node/compare/v5.23.1...v5.23.2) ### Chores * **env-tests:** upgrade jest-fixed-jsdom 0.0.9 -&gt; 0.0.10 ([6d6d0b0](https://github.com/openai/openai-node/commit/6d6d0b0eaaff86a99141af031f55b7cc6a22772a)) * **internal:** codegen related update ([1b684af](https://github.com/openai/openai-node/commi
- Lines: 3462
- Characters: 184944

---

# Source: .\node_modules\openai\README.md

- Preview: # OpenAI TypeScript and JavaScript API Library [![NPM version](<https://img.shields.io/npm/v/openai.svg?label=npm%20(stable)>)](https://npmjs.org/package/openai) ![npm bundle size](https://img.shields.io/bundlephobia/minzip/openai) [![JSR Version](https://jsr.io/badges/@openai/openai)](https://jsr.io/@openai/openai) This library provides convenient access to the OpenAI REST API from TypeScript or
- Lines: 707
- Characters: 23732

---

# Source: .\node_modules\openai\src\_vendor\partial-json-parser\README.md

- Preview: # Partial JSON Parser Vendored from https://www.npmjs.com/package/partial-json with some modifications
- Lines: 6
- Characters: 101

---

# Source: .\node_modules\openai\src\_vendor\zod-to-json-schema\README.md

- Preview: # Zod to Json Schema Vendored version of https://github.com/StefanTerdell/zod-to-json-schema that has been updated to generate JSON Schemas that are compatible with OpenAI's [strict mode](https://platform.openai.com/docs/guides/structured-outputs/supported-schemas)
- Lines: 6
- Characters: 264

---

# Source: .\node_modules\openai\src\core\README.md

- Preview: # `core` This directory holds public modules implementing non-resource-specific SDK functionality.
- Lines: 6
- Characters: 97

---

# Source: .\node_modules\openai\src\internal\qs\LICENSE.md

- Preview: BSD 3-Clause License Copyright (c) 2014, Nathan LaFreniere and other [contributors](https://github.com/puruvj/neoqs/graphs/contributors) All rights reserved. Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met: 1. Redistributions of source code must retain the above copyright notice, this list of conditions a
- Lines: 16
- Characters: 1575

---

# Source: .\node_modules\openai\src\internal\qs\README.md

- Preview: # qs This is a vendored version of [neoqs](https://github.com/PuruVJ/neoqs) which is a TypeScript rewrite of [qs](https://github.com/ljharb/qs), a query string library.
- Lines: 6
- Characters: 167

---

# Source: .\node_modules\openai\src\internal\README.md

- Preview: # `internal` The modules in this directory are not importable outside this package and will change between releases.
- Lines: 6
- Characters: 115

---

# Source: .\node_modules\optionator\CHANGELOG.md

- Preview: # 0.9.0 - update dependencies, in particular `levn` and `type-check` - this could affect behaviour of argument parsing # 0.8.3 - changes dependency from `wordwrap` to `word-wrap` due to license issue - update dependencies # 0.8.2 - fix bug #18 - detect missing value when flag is last item - update dependencies # 0.8.1 - update `fast-levenshtein` dependency # 0.8.0 - update `levn` dependency - supp
- Lines: 62
- Characters: 1936

---

# Source: .\node_modules\optionator\README.md

- Preview: # Optionator <a name="optionator" /> Optionator is a JavaScript/Node.js option parsing and help generation library used by [eslint](http://eslint.org), [Grasp](http://graspjs.com), [LiveScript](http://livescript.net), [esmangle](https://github.com/estools/esmangle), [escodegen](https://github.com/estools/escodegen), and [many more](https://www.npmjs.com/browse/depended/optionator). For an online d
- Lines: 241
- Characters: 14809

---

# Source: .\node_modules\orderedmap\README.md

- Preview: # OrderedMap Persistent data structure representing an ordered mapping from strings to values, with some convenient update methods. This is not an efficient data structure for large maps, just a minimal helper for cleanly creating and managing small maps in a way that makes their key order explicit and easy to think about. License: MIT ## Reference The exported value from this module is the class
- Lines: 72
- Characters: 2326

---

# Source: .\node_modules\oslo\README.md

- Preview: # `oslo` A collection of auth-related utilities, including: - `oslo/cookie`: Cookie parsing and serialization - `oslo/crypto`: Generate hashes, signatures, and random values - `oslo/encoding`: Encode base64, base64url, base32, hex - `oslo/jwt`: Create and verify JWTs - `oslo/oauth2`: OAuth2 helpers - `oslo/otp`: HOTP, TOTP - `oslo/password`: Password hashing - `oslo/request`: CSRF protection - `os
- Lines: 44
- Characters: 988

---

# Source: .\node_modules\own-keys\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.1](https://github.com/ljharb/own-keys/compare/v1.0.0...v1.0.1) - 2024-12-29 ### Commits - [Tests] sort with a proper comparator [`4a65b56`](ht
- Lines: 26
- Characters: 1295

---

# Source: .\node_modules\own-keys\README.md

- Preview: # own-keys <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Robustly get an object's own property keys (strings and symbols), including non-enumerables when possible. #
- Lines: 48
- Characters: 1661

---

# Source: .\node_modules\package-json-from-dist\LICENSE.md

- Preview: All packages under `src/` are licensed according to the terms in their respective `LICENSE` or `LICENSE.md` files. The remainder of this project is licensed under the Blue Oak Model License, as follows: ----- # Blue Oak Model License Version 1.0.0 ## Purpose This license gives everyone as much permission to work with this software as possible, while protecting contributors from liability. ## Accep
- Lines: 66
- Characters: 1701

---

# Source: .\node_modules\package-json-from-dist\README.md

- Preview: # package-json-from-dist Sometimes you want to load the `package.json` into your TypeScript program, and it's tempting to just `import '../package.json'`, since that seems to work. However, this requires `tsc` to make an entire copy of your `package.json` file into the `dist` folder, which is a problem if you're using something like [tshy](https://github.com/isaacs/tshy), which uses the `package.j
- Lines: 113
- Characters: 3012

---

# Source: .\node_modules\paged-request\node_modules\axios\CHANGELOG.md

- Preview: # Changelog ### 0.21.4 (September 6, 2021) Fixes and Functionality: - Fixing JSON transform when data is stringified. Providing backward compatibility and complying to the JSON RFC standard ([#4020](https://github.com/axios/axios/pull/4020)) Huge thanks to everyone who contributed to this release via code (authors listed below) or via reviews and triaging on GitHub: - [Jay](mailto:jasonsaayman@gma
- Lines: 778
- Characters: 44093

---

# Source: .\node_modules\paged-request\node_modules\axios\lib\adapters\README.md

- Preview: # axios // adapters The modules under `adapters/` are modules that handle dispatching a request and settling a returned `Promise` once a response is received. ## Example ```js var settle = require('./../core/settle'); module.exports = function myAdapter(config) { // At this point: //  - config has been merged with defaults //  - request transformers have already run //  - request interceptors have
- Lines: 40
- Characters: 878

---

# Source: .\node_modules\paged-request\node_modules\axios\lib\core\README.md

- Preview: # axios // core The modules found in `core/` should be modules that are specific to the domain logic of axios. These modules would most likely not make sense to be consumed outside of the axios module, as their logic is too specific. Some examples of core modules are: - Dispatching requests - Requests sent via `adapters/` (see lib/adapters/README.md) - Managing interceptors - Handling config
- Lines: 11
- Characters: 391

---

# Source: .\node_modules\paged-request\node_modules\axios\lib\helpers\README.md

- Preview: # axios // helpers The modules found in `helpers/` should be generic modules that are _not_ specific to the domain logic of axios. These modules could theoretically be published to npm on their own and consumed by other modules or apps. Some examples of generic modules are things like: - Browser polyfills - Managing cookies - Parsing HTTP headers
- Lines: 10
- Characters: 344

---

# Source: .\node_modules\paged-request\node_modules\axios\README.md

- Preview: # axios [![npm version](https://img.shields.io/npm/v/axios.svg?style=flat-square)](https://www.npmjs.org/package/axios) [![CDNJS](https://img.shields.io/cdnjs/v/axios.svg?style=flat-square)](https://cdnjs.com/libraries/axios) ![Build status](https://github.com/axios/axios/actions/workflows/ci.yml/badge.svg) [![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitp
- Lines: 871
- Characters: 27725

---

# Source: .\node_modules\paged-request\node_modules\axios\SECURITY.md

- Preview: # Security Policy ## Reporting a Vulnerability Please report security issues to jasonsaayman@gmail.com
- Lines: 8
- Characters: 100

---

# Source: .\node_modules\paged-request\node_modules\axios\UPGRADE_GUIDE.md

- Preview: # Upgrade Guide ### 0.15.x -> 0.16.0 #### `Promise` Type Declarations The `Promise` type declarations have been removed from the axios typings in favor of the built-in type declarations. If you use axios in a TypeScript project that targets `ES5`, please make sure to include the `es2015.promise` lib. Please see [this post](https://blog.mariusschulz.com/2016/11/25/typescript-2-0-built-in-type-decla
- Lines: 165
- Characters: 4649

---

# Source: .\node_modules\paged-request\README.md

- Preview: # paged-request [![NPM version](https://img.shields.io/npm/v/paged-request.svg?style=flat)](https://www.npmjs.com/package/paged-request) [![NPM monthly downloads](https://img.shields.io/npm/dm/paged-request.svg?style=flat)](https://npmjs.org/package/paged-request) [![NPM total downloads](https://img.shields.io/npm/dt/paged-request.svg?style=flat)](https://npmjs.org/package/paged-request) [![Linux
- Lines: 150
- Characters: 5759

---

# Source: .\node_modules\papaparse\README.md

- Preview: Parse CSV with JavaScript ======================================== Papa Parse is the fastest in-browser CSV (or delimited text) parser for JavaScript. It is reliable and correct according to [RFC 4180](https://tools.ietf.org/html/rfc4180), and it comes with these features: - Easy to use - Parse CSV files directly (local or over the network) - Fast mode - Stream large files (even via HTTP) - Revers
- Lines: 80
- Characters: 3581

---

# Source: .\node_modules\parent-module\readme.md

- Preview: # parent-module [![Build Status](https://travis-ci.org/sindresorhus/parent-module.svg?branch=master)](https://travis-ci.org/sindresorhus/parent-module) > Get the path of the parent module Node.js exposes `module.parent`, but it only gives you the first cached parent, which is not necessarily the actual parent. ## Install ``` $ npm install parent-module ``` ## Usage ```js // bar.js const parentModu
- Lines: 70
- Characters: 1390

---

# Source: .\node_modules\parse5\node_modules\entities\readme.md

- Preview: # entities [![NPM version](https://img.shields.io/npm/v/entities.svg)](https://npmjs.org/package/entities) [![Downloads](https://img.shields.io/npm/dm/entities.svg)](https://npmjs.org/package/entities) [![Node.js CI](https://github.com/fb55/entities/actions/workflows/nodejs-test.yml/badge.svg)](https://github.com/fb55/entities/actions/workflows/nodejs-test.yml) Encode & decode HTML & XML entities
- Lines: 122
- Characters: 4883

---

# Source: .\node_modules\parse5\README.md

- Preview: <p align="center"> <a href="https://github.com/inikulin/parse5"> <img src="https://raw.github.com/inikulin/parse5/master/media/logo.png" alt="parse5" /> </a> </p> <div align="center"> <h1>parse5</h1> <i><b>HTML parser and serializer.</b></i> </div> <br> <div align="center"> <code>npm install --save parse5</code> </div> <br> <p align="center"> 📖 <a href="https://parse5.js.org/modules/parse5.html">
- Lines: 40
- Characters: 840

---

# Source: .\node_modules\parse5-htmlparser2-tree-adapter\README.md

- Preview: <p align="center"> <a href="https://github.com/inikulin/parse5"> <img src="https://raw.github.com/inikulin/parse5/master/media/logo.png" alt="parse5" /> </a> </p> <div align="center"> <h1>parse5-htmlparser2-tree-adapter</h1> <i><b><a href="https://github.com/fb55/htmlparser2">htmlparser2</a> tree adapter for <a href="https://github.com/inikulin/parse5">parse5</a>.</b></i> </div> <br> <div align="c
- Lines: 36
- Characters: 932

---

# Source: .\node_modules\parse5-parser-stream\README.md

- Preview: <p align="center"> <a href="https://github.com/inikulin/parse5"> <img src="https://raw.github.com/inikulin/parse5/master/media/logo.png" alt="parse5" /> </a> </p> <div align="center"> <h1>parse5-parser-stream</h1> <i><b>Streaming HTML parser with scripting support.</b></i> </div> <br> <div align="center"> <code>npm install --save parse5-parser-stream</code> </div> <br> <p align="center"> 📖 <a hre
- Lines: 36
- Characters: 809

---

# Source: .\node_modules\parse-entities\node_modules\@types\unist\README.md

- Preview: # Installation > `npm install --save @types/unist` # Summary This package contains type definitions for unist (https://github.com/syntax-tree/unist). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/unist/v2. ## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/unist/v2/index.d.ts) ````ts /** * Syntactic units i
- Lines: 125
- Characters: 3157

---

# Source: .\node_modules\parse-entities\readme.md

- Preview: # parse-entities [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Parse HTML character references. ## Contents * [What is this?](#what-is-this) * [When should I use this?](#when-should-i-use-this) * [Install](#install) * [Use](#use) * [API](#api) * [`parseEntities(value[, options])`](#parseentitiesvalue-op
- Lines: 269
- Characters: 7015

---

# Source: .\node_modules\parse-json\readme.md

- Preview: # parse-json [![Build Status](https://travis-ci.org/sindresorhus/parse-json.svg?branch=master)](https://travis-ci.org/sindresorhus/parse-json) > Parse JSON with more helpful errors ## Install ``` $ npm install parse-json ``` ## Usage ```js const parseJson = require('parse-json'); const json = '{\n\t"foo": true,\n}'; JSON.parse(json); /* undefined:3 } ^ SyntaxError: Unexpected token } */ parseJson(
- Lines: 86
- Characters: 1181

---

# Source: .\node_modules\parseley\CHANGELOG.md

- Preview: # Changelog ## Version 0.12.1 * Runtime check for input of `parse` and `parse1` to be a string. ## Version 0.12.0 * Support for escape sequences according to specifications ([#97](https://github.com/mxxii/parseley/issues/97)). Now follows <https://www.w3.org/TR/selectors-3/#lex> for parsing and <https://w3c.github.io/csswg-drafts/cssom/#common-serializing-idioms> for serializing. Possibly breaking
- Lines: 63
- Characters: 1933

---

# Source: .\node_modules\parseley\README.md

- Preview: # parseley ![lint status badge](https://github.com/mxxii/parseley/workflows/lint/badge.svg) ![test status badge](https://github.com/mxxii/parseley/workflows/test/badge.svg) [![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/mxxii/parseley/blob/main/LICENSE) [![npm](https://img.shields.io/npm/v/parseley?logo=npm)](https://www.npmjs.com/package/parseley) [![npm]
- Lines: 162
- Characters: 5036

---

# Source: .\node_modules\parseurl\HISTORY.md

- Preview: 1.3.3 / 2019-04-15 ================== * Fix Node.js 0.8 return value inconsistencies 1.3.2 / 2017-09-09 ================== * perf: reduce overhead for full URLs * perf: unroll the "fast-path" `RegExp` 1.3.1 / 2016-01-17 ================== * perf: enable strict mode 1.3.0 / 2014-08-09 ================== * Add `parseurl.original` for parsing `req.originalUrl` with fallback * Return `undefined` if `r
- Lines: 61
- Characters: 985

---

# Source: .\node_modules\parseurl\README.md

- Preview: # parseurl [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Node.js Version][node-image]][node-url] [![Build Status][travis-image]][travis-url] [![Test Coverage][coveralls-image]][coveralls-url] Parse a URL with memoization. ## Install This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmjs.com/). Ins
- Lines: 136
- Characters: 3941

---

# Source: .\node_modules\pathe\README.md

- Preview: # 🛣️ pathe > Universal filesystem path utils [![version][npm-v-src]][npm-v-href] [![downloads][npm-d-src]][npm-d-href] [![size][size-src]][size-href] > **❓ Why** > > For [historical reasons](https://docs.microsoft.com/en-us/archive/blogs/larryosterman/why-is-the-dos-path-character), windows followed MS-DOS and using backslash for separating paths rather than slash used for macOS, Linux, and other
- Lines: 72
- Characters: 2706

---

# Source: .\node_modules\path-exists\readme.md

- Preview: # path-exists > Check if a path exists NOTE: `fs.existsSync` has been un-deprecated in Node.js since 6.8.0. If you only need to check synchronously, this module is not needed. Never use this before handling a file though: > In particular, checking if a file exists before opening it is an anti-pattern that leaves you vulnerable to race conditions: another process may remove the file between the cal
- Lines: 54
- Characters: 1453

---

# Source: .\node_modules\path-key\readme.md

- Preview: # path-key [![Build Status](https://travis-ci.org/sindresorhus/path-key.svg?branch=master)](https://travis-ci.org/sindresorhus/path-key) > Get the [PATH](https://en.wikipedia.org/wiki/PATH_(variable)) environment variable key cross-platform It's usually `PATH`, but on Windows it can be any casing like `Path`... ## Install ``` $ npm install path-key ``` ## Usage ```js const pathKey = require('path-
- Lines: 63
- Characters: 1283

---

# Source: .\node_modules\path-parse\README.md

- Preview: # path-parse [![Build Status](https://travis-ci.org/jbgutierrez/path-parse.svg?branch=master)](https://travis-ci.org/jbgutierrez/path-parse) > Node.js [`path.parse(pathString)`](https://nodejs.org/api/path.html#path_path_parse_pathstring) [ponyfill](https://ponyfill.com). ## Install ``` $ npm install --save path-parse ``` ## Usage ```js var pathParse = require('path-parse'); pathParse('/home/user/
- Lines: 45
- Characters: 828

---

# Source: .\node_modules\path-scurry\LICENSE.md

- Preview: # Blue Oak Model License Version 1.0.0 ## Purpose This license gives everyone as much permission to work with this software as possible, while protecting contributors from liability. ## Acceptance In order to receive this license, you must agree to its rules.  The rules of this license are both obligations under that agreement and conditions to your license. You must not do anything with this soft
- Lines: 58
- Characters: 1497

---

# Source: .\node_modules\path-scurry\node_modules\lru-cache\README.md

- Preview: # lru-cache A cache object that deletes the least-recently-used items. Specify a max number of the most recently used items that you want to keep, and this cache will keep that many of the most recently accessed items. This is not primarily a TTL cache, and does not make strong TTL guarantees. There is no preemptive pruning of expired items by default, but you _may_ set a TTL on the cache or on a
- Lines: 334
- Characters: 10776

---

# Source: .\node_modules\path-scurry\README.md

- Preview: # path-scurry Extremely high performant utility for building tools that read the file system, minimizing filesystem and path string munging operations to the greatest degree possible. ## Ugh, yet another file traversal thing on npm? Yes. None of the existing ones gave me exactly what I wanted. ## Well what is it you wanted? While working on [glob](http://npm.im/glob), I found that I needed a modul
- Lines: 639
- Characters: 21381

---

# Source: .\node_modules\path-to-regexp\Readme.md

- Preview: # Path-to-RegExp > Turn a path string such as `/user/:name` into a regular expression. [![NPM version][npm-image]][npm-url] [![NPM downloads][downloads-image]][downloads-url] [![Build status][build-image]][build-url] [![Build coverage][coverage-image]][coverage-url] [![License][license-image]][license-url] ## Installation ``` npm install path-to-regexp --save ``` ## Usage ```javascript const { pat
- Lines: 353
- Characters: 11617

---

# Source: .\node_modules\path-type\readme.md

- Preview: # path-type [![Build Status](https://travis-ci.org/sindresorhus/path-type.svg?branch=master)](https://travis-ci.org/sindresorhus/path-type) > Check if a path is a file, directory, or symlink ## Install ``` $ npm install path-type ``` ## Usage ```js const pathType = require('path-type'); pathType.file('package.json').then(isFile => { console.log(isFile); //=> true }) ``` ## API ### .file(path) ###
- Lines: 45
- Characters: 666

---

# Source: .\node_modules\pathval\README.md

- Preview: <h1 align=center> <a href="http://chaijs.com" title="Chai Documentation"> <img alt="ChaiJS" src="http://chaijs.com/img/chai-logo.png"> </a> <br> pathval </h1> <p align=center> Tool for Object value retrieval given a string path for <a href="http://nodejs.org">node</a> and the browser. </p> <p align=center> <a href="./LICENSE"> <img alt="license:mit" src="https://img.shields.io/badge/license-mit-gr
- Lines: 150
- Characters: 3880

---

# Source: .\node_modules\peberminta\CHANGELOG.md

- Preview: # Changelog ## Version 0.9.0 - many functions got overloads for `Matcher` type propagation in less common scenarios; - `condition` function now accepts Parsers/Matchers with different value types, result value type is the union of the two; - added type tests for overloads using [expect-type](https://github.com/mmkal/expect-type). ## Version 0.8.0 - Targeting Node.js version 14 and ES2020; - Now sh
- Lines: 49
- Characters: 1340

---

# Source: .\node_modules\peberminta\README.md

- Preview: # peberminta ![lint status badge](https://github.com/mxxii/peberminta/workflows/lint/badge.svg) ![test status badge](https://github.com/mxxii/peberminta/workflows/test/badge.svg) [![codecov](https://codecov.io/gh/mxxii/peberminta/branch/main/graph/badge.svg?token=TYwVNcTQJd)](https://codecov.io/gh/mxxii/peberminta) [![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://githu
- Lines: 215
- Characters: 12996

---

# Source: .\node_modules\picocolors\README.md

- Preview: # picocolors The tiniest and the fastest library for terminal output formatting with ANSI colors. ```javascript import pc from "picocolors" console.log( pc.green(`How are ${pc.italic(`you`)} doing?`) ) ``` - **No dependencies.** - **14 times** smaller and **2 times** faster than chalk. - Used by popular tools like PostCSS, SVGO, Stylelint, and Browserslist. - Node.js v6+ & browsers support. Suppor
- Lines: 24
- Characters: 601

---

# Source: .\node_modules\picomatch\README.md

- Preview: <h1 align="center">Picomatch</h1> <p align="center"> <a href="https://npmjs.org/package/picomatch"> <img src="https://img.shields.io/npm/v/picomatch.svg" alt="version"> </a> <a href="https://github.com/micromatch/picomatch/actions?workflow=Tests"> <img src="https://github.com/micromatch/picomatch/workflows/Tests/badge.svg" alt="test status"> </a> <a href="https://coveralls.io/github/micromatch/pic
- Lines: 741
- Characters: 27802

---

# Source: .\node_modules\pidtree\readme.md

- Preview: <h1 align="center"> <b>pidtree</b> </h1> <p align="center"> <!-- CI - TravisCI --> <a href="https://travis-ci.org/simonepri/pidtree"> <img src="https://img.shields.io/travis/simonepri/pidtree/master.svg?label=MacOS%20%26%20Linux" alt="Mac/Linux Build Status" /> </a> <!-- CI - AppVeyor --> <a href="https://ci.appveyor.com/project/simonepri/pidtree"> <img src="https://img.shields.io/appveyor/ci/simo
- Lines: 192
- Characters: 5829

---

# Source: .\node_modules\pify\readme.md

- Preview: # pify [![Build Status](https://travis-ci.org/sindresorhus/pify.svg?branch=master)](https://travis-ci.org/sindresorhus/pify) > Promisify a callback-style function ## Install ``` $ npm install --save pify ``` ## Usage ```js const fs = require('fs'); const pify = require('pify'); // Promisify a single function pify(fs.readFile)('package.json', 'utf8').then(data => { console.log(JSON.parse(data).name
- Lines: 134
- Characters: 3069

---

# Source: .\node_modules\pirates\README.md

- Preview: # Pirates [![Coverage][codecov-badge]][codecov-link] ### Properly hijack require This library allows to add custom require hooks, which do not interfere with other require hooks. This library only works with commonJS. [codecov-badge]: https://img.shields.io/codecov/c/github/danez/pirates/master.svg?style=flat "codecov" [codecov-link]: https://codecov.io/gh/danez/pirates "codecov" ## Why? Two reaso
- Lines: 76
- Characters: 2931

---

# Source: .\node_modules\pkce-challenge\README.md

- Preview: # pkce-challenge Generate or verify a Proof Key for Code Exchange (PKCE) challenge pair. Read more about [PKCE](https://www.oauth.com/oauth2-servers/pkce/authorization-request/). ## Installation ```bash npm install pkce-challenge ``` ## Usage Default length for the verifier is 43 ```js import pkceChallenge from "pkce-challenge"; await pkceChallenge(); ``` gives something like: ```js { code_verifie
- Lines: 58
- Characters: 1008

---

# Source: .\node_modules\p-limit\readme.md

- Preview: # p-limit > Run multiple promise-returning & async functions with limited concurrency *Works in Node.js and browsers.* ## Install ```sh npm install p-limit ``` ## Usage ```js import pLimit from 'p-limit'; const limit = pLimit(1); const input = [ limit(() => fetchSomething('foo')), limit(() => fetchSomething('bar')), limit(() => doSomething()) ]; // Only one promise is run at once const result = aw
- Lines: 132
- Characters: 3031

---

# Source: .\node_modules\p-locate\node_modules\p-limit\readme.md

- Preview: # p-limit > Run multiple promise-returning & async functions with limited concurrency ## Install ``` $ npm install p-limit ``` ## Usage ```js import pLimit from 'p-limit'; const limit = pLimit(1); const input = [ limit(() => fetchSomething('foo')), limit(() => fetchSomething('bar')), limit(() => doSomething()) ]; // Only one promise is run at once const result = await Promise.all(input); console.l
- Lines: 101
- Characters: 2637

---

# Source: .\node_modules\p-locate\readme.md

- Preview: # p-locate > Get the first fulfilled promise that satisfies the provided testing function Think of it like an async version of [`Array#find`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/find). ## Install ``` $ npm install p-locate ``` ## Usage Here we find the first file that exists on disk, in array order. ```js import {pathExists} from 'path-exists'; impor
- Lines: 93
- Characters: 2300

---

# Source: .\node_modules\possible-typed-array-names\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.0](https://github.com/ljharb/possible-typed-array-names/compare/v1.0.0...v1.1.0) - 2025-02-06 ### Commits - [types] use shared tsconfig [`7d30
- Lines: 32
- Characters: 2410

---

# Source: .\node_modules\possible-typed-array-names\README.md

- Preview: # possible-typed-array-names <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] A simple list of possible Typed Array names. ## Example ```js const assert = require('asse
- Lines: 53
- Characters: 2106

---

# Source: .\node_modules\postcss\README.md

- Preview: # PostCSS <img align="right" width="95" height="95" alt="Philosopher’s stone, logo of PostCSS" src="https://postcss.org/logo.svg"> PostCSS is a tool for transforming styles with JS plugins. These plugins can lint your CSS, support variables and mixins, transpile future CSS syntax, inline images, and more. PostCSS is used by industry leaders including Wikipedia, Twitter, Alibaba, and JetBrains. The
- Lines: 30
- Characters: 1144

---

# Source: .\node_modules\postcss-import\README.md

- Preview: # postcss-import [![Build](https://img.shields.io/travis/postcss/postcss-import/master)](https://travis-ci.org/postcss/postcss-import) [![Version](https://img.shields.io/npm/v/postcss-import)](https://github.com/postcss/postcss-import/blob/master/CHANGELOG.md) [![postcss compatibility](https://img.shields.io/npm/dependency-version/postcss-import/peer/postcss)](https://postcss.org/) > [PostCSS](htt
- Lines: 246
- Characters: 6703

---

# Source: .\node_modules\postcss-js\README.md

- Preview: # PostCSS JS <img align="right" width="135" height="95" title="Philosopher’s stone, logo of PostCSS" src="https://postcss.org/logo-leftp.svg"> [PostCSS] for CSS-in-JS and styles in JS objects. For example, to use [Stylelint] or [RTLCSS] plugins in your workflow. <a href="https://evilmartians.com/?utm_source=postcss-js"> <img src="https://evilmartians.com/badges/sponsored-by-evil-martians.svg" alt=
- Lines: 25
- Characters: 698

---

# Source: .\node_modules\postcss-load-config\README.md

- Preview: <div align="center"> <img width="100" height="100" title="Load Options" src="http://michael-ciniawsky.github.io/postcss-load-options/logo.svg"> <a href="https://github.com/postcss/postcss"> <img width="110" height="110" title="PostCSS"           src="http://postcss.github.io/postcss/logo.svg" hspace="10"> </a> <img width="100" height="100" title="Load Plugins" src="http://michael-ciniawsky.github.
- Lines: 477
- Characters: 9602

---

# Source: .\node_modules\postcss-nested\README.md

- Preview: # PostCSS Nested <img align="right" width="135" height="95" title="Philosopher’s stone, logo of PostCSS" src="https://postcss.org/logo-leftp.svg"> [PostCSS] plugin to unwrap nested rules closer to Sass syntax. ```css .phone { &_title { width: 500px; @media (max-width: 500px) { width: auto; } body.is_dark & { color: white; } } img { display: block; } } .title { font-size: var(--font); @at-root html
- Lines: 88
- Characters: 1866

---

# Source: .\node_modules\postcss-selector-parser\API.md

- Preview: # API Documentation *Please use only this documented API when working with the parser. Methods not documented here are subject to change at any point.* ## `parser` function This is the module's main entry point. ```js const parser = require('postcss-selector-parser'); ``` ### `parser([transform], [options])` Creates a new `processor` instance ```js const processor = parser(); ``` Or, with optional
- Lines: 875
- Characters: 20126

---

# Source: .\node_modules\postcss-selector-parser\CHANGELOG.md

- Preview: # 6.1.2 - Fixed: erroneous trailing combinators in pseudos # 6.1.1 - Fixed: improve typings of constructor helpers (#292) # 6.1.0 - Feature: add `sourceIndex` to `Selector` nodes (#290) # 6.0.16 - Fixed: add missing `index` argument to `each`/`walk` callback types (#289) # 6.0.15 - Fixed: Node#prev and Node#next type for the first/last node # 6.0.14 - Fixed: type definitions # 6.0.13 - Fixed: thro
- Lines: 552
- Characters: 19038

---

# Source: .\node_modules\postcss-selector-parser\README.md

- Preview: # postcss-selector-parser [![test](https://github.com/postcss/postcss-selector-parser/actions/workflows/test.yml/badge.svg)](https://github.com/postcss/postcss-selector-parser/actions/workflows/test.yml) > Selector parser with built in methods for working with selector strings. ## Install With [npm](https://npmjs.com/package/postcss-selector-parser) do: ``` npm install postcss-selector-parser ```
- Lines: 52
- Characters: 1135

---

# Source: .\node_modules\postcss-value-parser\README.md

- Preview: # postcss-value-parser [![Travis CI](https://travis-ci.org/TrySound/postcss-value-parser.svg)](https://travis-ci.org/TrySound/postcss-value-parser) Transforms CSS declaration values and at-rule parameters into a tree of nodes, and provides a simple traversal API. ## Usage ```js var valueParser = require('postcss-value-parser'); var cssBackgroundValue = 'url(foo.png) no-repeat 40px 73%'; var parsed
- Lines: 266
- Characters: 7419

---

# Source: .\node_modules\preact\README.md

- Preview: <p align="center"> <a href="https://preactjs.com" target="_blank"> ![Preact](https://raw.githubusercontent.com/preactjs/preact/8b0bcc927995c188eca83cba30fbc83491cc0b2f/logo.svg?sanitize=true 'Preact') </a> </p> <p align="center">Fast <b>3kB</b> alternative to React with the same modern API.</p> **All the power of Virtual DOM components, without the overhead:** - Familiar React API & patterns: ES6
- Lines: 185
- Characters: 14224

---

# Source: .\node_modules\preact-render-to-string\README.md

- Preview: # preact-render-to-string [![NPM](http://img.shields.io/npm/v/preact-render-to-string.svg)](https://www.npmjs.com/package/preact-render-to-string) [![Build status](https://github.com/preactjs/preact-render-to-string/actions/workflows/ci.yml/badge.svg)](https://github.com/preactjs/preact-render-to-string/actions/workflows/ci.yml) Render JSX and [Preact](https://github.com/preactjs/preact) component
- Lines: 148
- Characters: 3172

---

# Source: .\node_modules\prelude-ls\CHANGELOG.md

- Preview: # 1.2.1 - fix version # 1.2.0 - add `List.remove` - build with LiveScript 1.6.0 - update dependencies - remove coverage calculation # 1.1.2 - add `Func.memoize` - fix `zip-all` and `zip-with-all` corner case (no input) - build with LiveScript 1.4.0 # 1.1.1 - curry `unique-by`, `minimum-by` # 1.1.0 - added `List` functions: `maximum-by`, `minimum-by`, `unique-by` - added `List` functions: `at`, `el
- Lines: 111
- Characters: 4015

---

# Source: .\node_modules\prelude-ls\README.md

- Preview: # prelude.ls [![Build Status](https://travis-ci.org/gkz/prelude-ls.png?branch=master)](https://travis-ci.org/gkz/prelude-ls) is a functionally oriented utility library. It is powerful and flexible. Almost all of its functions are curried. It is written in, and is the recommended base library for, <a href="http://livescript.net">LiveScript</a>. See **[the prelude.ls site](http://preludels.com)** fo
- Lines: 18
- Characters: 598

---

# Source: .\node_modules\prettier\README.md

- Preview: [![Prettier Banner](https://unpkg.com/prettier-logo@1.0.3/images/prettier-banner-light.svg)](https://prettier.io) <h2 align="center">Opinionated Code Formatter</h2> <p align="center"> <em> JavaScript · TypeScript · Flow · JSX · JSON </em> <br /> <em> CSS · SCSS · Less </em> <br /> <em> HTML · Vue · Angular </em> <br /> <em> GraphQL · Markdown · YAML </em> <br /> <em> <a href="https://prettier.io/d
- Lines: 105
- Characters: 3271

---

# Source: .\node_modules\prettier\THIRD-PARTY-NOTICES.md

- Preview: # Licenses of bundled dependencies The published Prettier artifact additionally contains code with the following licenses: MIT, ISC, BSD-3-Clause, BSD-2-Clause, and Apache-2.0. ## @angular/compiler@v20.0.5 > Angular - the compiler library License: MIT Repository: <https://github.com/angular/angular.git> Author: angular > The MIT License > > Copyright (c) 2010-2025 Google LLC. https://angular.dev/l
- Lines: 5847
- Characters: 262462

---

# Source: .\node_modules\pretty-format\node_modules\ansi-styles\readme.md

- Preview: # ansi-styles > [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code#Colors_and_Styles) for styling strings in the terminal You probably want the higher-level [chalk](https://github.com/chalk/chalk) module for styling your strings. <img src="screenshot.svg" width="900"> ## Install ``` $ npm install ansi-styles ``` ## Usage ```js const style = require('ansi-styles'); console.log(`${st
- Lines: 147
- Characters: 3857

---

# Source: .\node_modules\pretty-format\README.md

- Preview: # pretty-format Stringify any JavaScript value. - Serialize built-in JavaScript types. - Serialize application-specific data types with built-in or user-defined plugins. ## Installation ```sh $ yarn add pretty-format ``` ## Usage ```js const {format: prettyFormat} = require('pretty-format'); // CommonJS ``` ```js import {format as prettyFormat} from 'pretty-format'; // ES2015 modules ``` ```js con
- Lines: 461
- Characters: 12533

---

# Source: .\node_modules\prismjs\CHANGELOG.md

- Preview: # Prism Changelog ## 1.29.0 (2022-08-23) ### New components * __BBj__ ([#3511](https://github.com/PrismJS/prism/issues/3511)) [`1134bdfc`](https://github.com/PrismJS/prism/commit/1134bdfc) * __BQN__ ([#3515](https://github.com/PrismJS/prism/issues/3515)) [`859f99a0`](https://github.com/PrismJS/prism/commit/859f99a0) * __Cilk/C__ & __Cilk/C++__ ([#3522](https://github.com/PrismJS/prism/issues/3522)
- Lines: 3069
- Characters: 267272

---

# Source: .\node_modules\prismjs\README.md

- Preview: # [Prism](https://prismjs.com/) [![Build Status](https://github.com/PrismJS/prism/workflows/CI/badge.svg)](https://github.com/PrismJS/prism/actions) [![npm](https://img.shields.io/npm/dw/prismjs.svg)](https://www.npmjs.com/package/prismjs) Prism is a lightweight, robust, and elegant syntax highlighting library. It's a spin-off project from [Dabblet](https://dabblet.com/). You can learn more on [pr
- Lines: 54
- Characters: 3727

---

# Source: .\node_modules\prompts\readme.md

- Preview: <p align="center"> <img src="https://github.com/terkelg/prompts/raw/master/prompts.png" alt="Prompts" width="500" /> </p> <h1 align="center">❯ Prompts</h1> <p align="center"> <a href="https://npmjs.org/package/prompts"> <img src="https://img.shields.io/npm/v/prompts.svg" alt="version" /> </a> <a href="https://travis-ci.org/terkelg/prompts"> <img src="https://img.shields.io/travis/terkelg/prompts.s
- Lines: 885
- Characters: 27468

---

# Source: .\node_modules\property-information\readme.md

- Preview: # property-information [![Build][badge-build-image]][badge-build-url] [![Coverage][badge-coverage-image]][badge-coverage-url] [![Downloads][badge-downloads-image]][badge-downloads-url] [![Size][badge-size-image]][badge-size-url] Info on the properties and attributes of the web platform (HTML, SVG, ARIA, XML, XMLNS, XLink). ## Contents * [What is this?](#what-is-this) * [When should I use this?](#w
- Lines: 1065
- Characters: 62726

---

# Source: .\node_modules\prop-types\node_modules\react-is\README.md

- Preview: # `react-is` This package allows you to test arbitrary values and see if they're a particular React element type. ## Installation ```sh # Yarn yarn add react-is # NPM npm install react-is ``` ## Usage ### Determining if a Component is Valid ```js import React from "react"; import * as ReactIs from "react-is"; class ClassComponent extends React.Component { render() { return React.createElement("div
- Lines: 107
- Characters: 2274

---

# Source: .\node_modules\prop-types\README.md

- Preview: # prop-types [![Build Status](https://travis-ci.com/facebook/prop-types.svg?branch=main)](https://travis-ci.org/facebook/prop-types) Runtime type checking for React props and similar objects. You can use prop-types to document the intended types of properties passed to components. React (and potentially other libraries—see the `checkPropTypes()` reference below) will check props passed to your com
- Lines: 305
- Characters: 11337

---

# Source: .\node_modules\prosemirror-changeset\CHANGELOG.md

- Preview: ## 2.3.1 (2025-05-28) ### Bug fixes Improve diffing to not treat closing tokens of different node types as the same token. ## 2.3.0 (2025-05-05) ### New features Change sets can now be passed a custom token encoder that controls the way changed content is diffed. ## 2.2.1 (2023-05-17) ### Bug fixes Include CommonJS type declarations in the package to please new TypeScript resolution settings. ## 2
- Lines: 144
- Characters: 4470

---

# Source: .\node_modules\prosemirror-changeset\README.md

- Preview: # prosemirror-changeset This is a helper module that can turn a sequence of document changes into a set of insertions and deletions, for example to display them in a change-tracking interface. Such a set can be built up incrementally, in order to do such change tracking in a halfway performant way during live editing. This code is licensed under an [MIT licence](https://github.com/ProseMirror/pros
- Lines: 149
- Characters: 5580

---

# Source: .\node_modules\prosemirror-changeset\src\README.md

- Preview: # prosemirror-changeset This is a helper module that can turn a sequence of document changes into a set of insertions and deletions, for example to display them in a change-tracking interface. Such a set can be built up incrementally, in order to do such change tracking in a halfway performant way during live editing. This code is licensed under an [MIT licence](https://github.com/ProseMirror/pros
- Lines: 33
- Characters: 888

---

# Source: .\node_modules\prosemirror-collab\CHANGELOG.md

- Preview: ## 1.3.1 (2023-05-17) ### Bug fixes Include CommonJS type declarations in the package to please new TypeScript resolution settings. ## 1.3.0 (2022-05-30) ### New features Include TypeScript type declarations. ## 1.2.2 (2019-11-20) ### Bug fixes Rename ES module files to use a .js extension, since Webpack gets confused by .mjs ## 1.2.1 (2019-11-19) ### Bug fixes The file referred to in the package'
- Lines: 80
- Characters: 2134

---

# Source: .\node_modules\prosemirror-collab\CONTRIBUTING.md

- Preview: # How to contribute - [Getting help](#getting-help) - [Submitting bug reports](#submitting-bug-reports) - [Contributing code](#contributing-code) ## Getting help Community discussion, questions, and informal bug reporting is done on the [discuss.ProseMirror forum](http://discuss.prosemirror.net). ## Submitting bug reports Report bugs on the [GitHub issue tracker](http://github.com/prosemirror/pros
- Lines: 107
- Characters: 3814

---

# Source: .\node_modules\prosemirror-collab\README.md

- Preview: # prosemirror-collab [ [**WEBSITE**](https://prosemirror.net) | [**ISSUES**](https://github.com/prosemirror/prosemirror/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**CHANGELOG**](https://github.com/ProseMirror/prosemirror-collab/blob/master/CHANGELOG.md) ] This is a [core module](https://prosemirror.net/docs/ref/#collab) of [ProseMirror](https://prosemirror.net). ProseMirror is a wel
- Lines: 31
- Characters: 1388

---

# Source: .\node_modules\prosemirror-collab\src\README.md

- Preview: This module implements an API into which a communication channel for collaborative editing can be hooked. See [the guide](/docs/guide/#collab) for more details and an example. @collab @getVersion @receiveTransaction @sendableSteps
- Lines: 14
- Characters: 224

---

# Source: .\node_modules\prosemirror-commands\CHANGELOG.md

- Preview: ## 1.7.1 (2025-04-13) ### Bug fixes Fix a regression in `splitBlock` that would cause it to crash, rather than return false, when no split is possible. ## 1.7.0 (2025-02-20) ### New features `toggleMark` now accepts an `includeWhitespace` option that controls whether it affects leading/trailing space. ## 1.6.2 (2024-10-24) ### Bug fixes Make `splitBlock` smart enough to split blocks when the curso
- Lines: 325
- Characters: 10603

---

# Source: .\node_modules\prosemirror-commands\CONTRIBUTING.md

- Preview: # How to contribute - [Getting help](#getting-help) - [Submitting bug reports](#submitting-bug-reports) - [Contributing code](#contributing-code) ## Getting help Community discussion, questions, and informal bug reporting is done on the [discuss.ProseMirror forum](http://discuss.prosemirror.net). ## Submitting bug reports Report bugs on the [GitHub issue tracker](http://github.com/prosemirror/pros
- Lines: 107
- Characters: 3814

---

# Source: .\node_modules\prosemirror-commands\README.md

- Preview: # prosemirror-commands [ [**WEBSITE**](https://prosemirror.net) | [**ISSUES**](https://github.com/prosemirror/prosemirror/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**CHANGELOG**](https://github.com/ProseMirror/prosemirror-commands/blob/master/CHANGELOG.md) ] This is a [core module](https://prosemirror.net/docs/ref/#commands) of [ProseMirror](https://prosemirror.net). ProseMirror is
- Lines: 31
- Characters: 1387

---

# Source: .\node_modules\prosemirror-commands\src\README.md

- Preview: This module exports a number of _commands_, which are building block functions that encapsulate an editing action. A command function takes an editor state, _optionally_ a `dispatch` function that it can use to dispatch a transaction and _optionally_ an `EditorView` instance. It should return a boolean that indicates whether it could perform any action. When no `dispatch` callback is passed, the c
- Lines: 43
- Characters: 954

---

# Source: .\node_modules\prosemirror-dropcursor\CHANGELOG.md

- Preview: ## 1.8.2 (2025-04-22) ### Bug fixes Make sure the drop cursor is positioned in the right place when the editor is scaled with a CSS transform. Fix the width of the cursor when in a transformed element. Fix incorrect check in dragleave handler Fix an issue where the dropcursor would hide when drag moved over the top editor element. ## 1.8.1 (2023-05-17) ### Bug fixes Include CommonJS type declarati
- Lines: 140
- Characters: 3019

---

# Source: .\node_modules\prosemirror-dropcursor\CONTRIBUTING.md

- Preview: # How to contribute - [Getting help](#getting-help) - [Submitting bug reports](#submitting-bug-reports) - [Contributing code](#contributing-code) ## Getting help Community discussion, questions, and informal bug reporting is done on the [discuss.ProseMirror forum](http://discuss.prosemirror.net). ## Submitting bug reports Report bugs on the [GitHub issue tracker](http://github.com/prosemirror/pros
- Lines: 103
- Characters: 3617

---

# Source: .\node_modules\prosemirror-dropcursor\README.md

- Preview: # prosemirror-dropcursor [ [**WEBSITE**](https://prosemirror.net) | [**ISSUES**](https://github.com/prosemirror/prosemirror-dropcursor/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**CHANGELOG**](https://github.com/ProseMirror/prosemirror-dropcursor/blob/master/CHANGELOG.md) ] This is a non-core example module for [ProseMirror](https://prosemirror.net). ProseMirror is a well-behaved ri
- Lines: 53
- Characters: 2041

---

# Source: .\node_modules\prosemirror-gapcursor\CHANGELOG.md

- Preview: ## 1.3.2 (2023-05-17) ### Bug fixes Include CommonJS type declarations in the package to please new TypeScript resolution settings. ## 1.3.1 (2022-06-07) ### Bug fixes Export CSS file from package.json. ## 1.3.0 (2022-05-30) ### New features Include TypeScript type declarations. ## 1.2.2 (2022-02-25) ### Bug fixes Make sure compositions started from a gap cursor have their inline context created i
- Lines: 113
- Characters: 2237

---

# Source: .\node_modules\prosemirror-gapcursor\CONTRIBUTING.md

- Preview: # How to contribute - [Getting help](#getting-help) - [Submitting bug reports](#submitting-bug-reports) - [Contributing code](#contributing-code) ## Getting help Community discussion, questions, and informal bug reporting is done on the [discuss.ProseMirror forum](http://discuss.prosemirror.net). ## Submitting bug reports Report bugs on the [GitHub issue tracker](http://github.com/prosemirror/pros
- Lines: 107
- Characters: 3814

---

# Source: .\node_modules\prosemirror-gapcursor\README.md

- Preview: # prosemirror-gapcursor [ [**WEBSITE**](https://prosemirror.net) | [**ISSUES**](https://github.com/prosemirror/prosemirror/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**CHANGELOG**](https://github.com/ProseMirror/prosemirror-gapcursor/blob/master/CHANGELOG.md) ] This is a [core module](https://prosemirror.net/docs/ref/#gapcursor) of [ProseMirror](https://prosemirror.net). ProseMirror
- Lines: 34
- Characters: 1566

---

# Source: .\node_modules\prosemirror-gapcursor\src\README.md

- Preview: This is a plugin that adds a type of selection for focusing places that don't allow regular selection (such as positions that have a leaf block node, table, or the end of the document both before and after them). You'll probably want to load `style/gapcursor.css`, which contains basic styling for the simulated cursor (as a short, blinking horizontal stripe). By default, gap cursor are only allowed
- Lines: 21
- Characters: 690

---

# Source: .\node_modules\prosemirror-highlight\README.md

- Preview: # prosemirror-highlight [![NPM version](https://img.shields.io/npm/v/prosemirror-highlight?color=a1b858&label=)](https://www.npmjs.com/package/prosemirror-highlight) Highlight your [ProseMirror] code blocks with any syntax highlighter you like! ## Usage ### With [Shiki] <details> <summary>Static loading of a fixed set of languages</summary> ```ts import { getSingletonHighlighter } from 'shiki' imp
- Lines: 187
- Characters: 4504

---

# Source: .\node_modules\prosemirror-history\CHANGELOG.md

- Preview: ## 1.4.1 (2024-07-10) ### Bug fixes Fix an issue where mark steps could cause the history to treat otherwise adjacent changes as non-adjacent, and start superfluous new undo events. ## 1.4.0 (2024-03-21) ### New features Add `undoNoScroll`/`redoNoScroll` commands. ## 1.3.2 (2023-05-17) ### Bug fixes Include CommonJS type declarations in the package to please new TypeScript resolution settings. ##
- Lines: 163
- Characters: 4098

---

# Source: .\node_modules\prosemirror-history\CONTRIBUTING.md

- Preview: # How to contribute - [Getting help](#getting-help) - [Submitting bug reports](#submitting-bug-reports) - [Contributing code](#contributing-code) ## Getting help Community discussion, questions, and informal bug reporting is done on the [discuss.ProseMirror forum](http://discuss.prosemirror.net). ## Submitting bug reports Report bugs on the [GitHub issue tracker](http://github.com/prosemirror/pros
- Lines: 107
- Characters: 3814

---

# Source: .\node_modules\prosemirror-history\README.md

- Preview: # prosemirror-history [ [**WEBSITE**](https://prosemirror.net) | [**ISSUES**](https://github.com/prosemirror/prosemirror/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**CHANGELOG**](https://github.com/ProseMirror/prosemirror-history/blob/master/CHANGELOG.md) ] This is a [core module](https://prosemirror.net/docs/ref/#history) of [ProseMirror](https://prosemirror.net). ProseMirror is a
- Lines: 30
- Characters: 1321

---

# Source: .\node_modules\prosemirror-history\src\README.md

- Preview: An implementation of an undo/redo history for ProseMirror. This history is _selective_, meaning it does not just roll back to a previous state but can undo some changes while keeping other, later changes intact. (This is necessary for collaborative editing, and comes up in other situations as well.) @history @undo @redo @undoNoScroll @redoNoScroll @undoDepth @redoDepth @closeHistory
- Lines: 24
- Characters: 373

---

# Source: .\node_modules\prosemirror-inputrules\CHANGELOG.md

- Preview: ## 1.5.0 (2025-03-18) ### Bug fixes Fix a bug where input rules behaved incorrectly when text input inserted multiple characters and only a part of those were matched by a rule. Set `inCodeMark` to false for emdash and quote input rules. ### New features Input rules now take an `inCodeMark` option that can be used to turn them off inside marks marked as code. ## 1.4.0 (2024-01-30) ### New features
- Lines: 124
- Characters: 3041

---

# Source: .\node_modules\prosemirror-inputrules\CONTRIBUTING.md

- Preview: # How to contribute - [Getting help](#getting-help) - [Submitting bug reports](#submitting-bug-reports) - [Contributing code](#contributing-code) ## Getting help Community discussion, questions, and informal bug reporting is done on the [discuss.ProseMirror forum](http://discuss.prosemirror.net). ## Submitting bug reports Report bugs on the [GitHub issue tracker](http://github.com/prosemirror/pros
- Lines: 107
- Characters: 3814

---

# Source: .\node_modules\prosemirror-inputrules\README.md

- Preview: # prosemirror-inputrules [ [**WEBSITE**](https://prosemirror.net) | [**ISSUES**](https://github.com/prosemirror/prosemirror/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**CHANGELOG**](https://github.com/ProseMirror/prosemirror-inputrules/blob/master/CHANGELOG.md) ] This is a [core module](https://prosemirror.net/docs/ref/#inputrules) of [ProseMirror](https://prosemirror.net). ProseMir
- Lines: 32
- Characters: 1447

---

# Source: .\node_modules\prosemirror-inputrules\src\README.md

- Preview: This module defines a plugin for attaching _input rules_ to an editor, which can react to or transform text typed by the user. It also comes with a bunch of default rules that can be enabled in this plugin. @InputRule @inputRules @undoInputRule The module comes with a number of predefined rules: @emDash @ellipsis @openDoubleQuote @closeDoubleQuote @openSingleQuote @closeSingleQuote @smartQuotes Th
- Lines: 26
- Characters: 527

---

# Source: .\node_modules\prosemirror-keymap\CHANGELOG.md

- Preview: ## 1.2.3 (2025-05-04) ### Bug fixes Fix an issue where the library was too eager to dispatch keys by key code when the character produced isn't ASCII. ## 1.2.2 (2023-05-17) ### Bug fixes Include CommonJS type declarations in the package to please new TypeScript resolution settings. ## 1.2.1 (2023-02-14) ### Bug fixes Work around macOS putting the unmodified character in `KeyboardEvent.key` when Cm
- Lines: 107
- Characters: 2609

---

# Source: .\node_modules\prosemirror-keymap\CONTRIBUTING.md

- Preview: # How to contribute - [Getting help](#getting-help) - [Submitting bug reports](#submitting-bug-reports) - [Contributing code](#contributing-code) ## Getting help Community discussion, questions, and informal bug reporting is done on the [discuss.ProseMirror forum](http://discuss.prosemirror.net). ## Submitting bug reports Report bugs on the [GitHub issue tracker](http://github.com/prosemirror/pros
- Lines: 107
- Characters: 3814

---

# Source: .\node_modules\prosemirror-keymap\README.md

- Preview: # prosemirror-keymap [ [**WEBSITE**](https://prosemirror.net) | [**ISSUES**](https://github.com/prosemirror/prosemirror/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**CHANGELOG**](https://github.com/ProseMirror/prosemirror-keymap/blob/master/CHANGELOG.md) ] This is a [core module](https://prosemirror.net/docs/ref/#keymap) of [ProseMirror](https://prosemirror.net). ProseMirror is a wel
- Lines: 30
- Characters: 1321

---

# Source: .\node_modules\prosemirror-keymap\src\README.md

- Preview: A plugin for conveniently defining key bindings. @keymap @keydownHandler
- Lines: 8
- Characters: 70

---

# Source: .\node_modules\prosemirror-markdown\CHANGELOG.md

- Preview: ## 1.13.2 (2025-03-18) ### Bug fixes Add a `code` flag to the code mark. ## 1.13.1 (2024-09-26) ### Bug fixes Fix a type error caused by use of an older markdown-it type package. ## 1.13.0 (2024-05-20) ### Bug fixes Fix the type of `MarkdownParser.parse` to be non-nullable. Add a strict option to MarkdownSerializer ### New features The new `strict` option to `MarkdownSerializer` makes it possible
- Lines: 302
- Characters: 6937

---

# Source: .\node_modules\prosemirror-markdown\CONTRIBUTING.md

- Preview: # How to contribute - [Getting help](#getting-help) - [Submitting bug reports](#submitting-bug-reports) - [Contributing code](#contributing-code) ## Getting help Community discussion, questions, and informal bug reporting is done on the [discuss.ProseMirror forum](http://discuss.prosemirror.net). ## Submitting bug reports Report bugs on the [GitHub issue tracker](http://github.com/prosemirror/pros
- Lines: 103
- Characters: 3617

---

# Source: .\node_modules\prosemirror-markdown\README.md

- Preview: <h1>prosemirror-markdown</h1> <p>[ <a href="http://prosemirror.net"><strong>WEBSITE</strong></a> | <a href="https://github.com/prosemirror/prosemirror-markdown/issues"><strong>ISSUES</strong></a> | <a href="https://discuss.prosemirror.net"><strong>FORUM</strong></a> | <a href="https://gitter.im/ProseMirror/prosemirror"><strong>GITTER</strong></a> ]</p> <p>This is a (non-core) module for <a href="h
- Lines: 279
- Characters: 28068

---

# Source: .\node_modules\prosemirror-markdown\src\README.md

- Preview: # prosemirror-markdown [ [**WEBSITE**](http://prosemirror.net) | [**ISSUES**](https://github.com/prosemirror/prosemirror-markdown/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**GITTER**](https://gitter.im/ProseMirror/prosemirror) ] This is a (non-core) module for [ProseMirror](http://prosemirror.net). ProseMirror is a well-behaved rich semantic content editor based on contentEditable,
- Lines: 45
- Characters: 1390

---

# Source: .\node_modules\prosemirror-menu\CHANGELOG.md

- Preview: ## 1.2.5 (2025-04-22) ### Bug fixes Make sure the menu is re-rendered when the editor's root changes, so that it doesn't reference icons whose SVG lives in another root. ## 1.2.4 (2023-08-20) ### Bug fixes Fix a bug where icon creation crashed because it couldn't find a Document value. ## 1.2.3 (2023-08-16) ### Bug fixes Don't directly use the global `window`/`document`, to fix use in a different
- Lines: 104
- Characters: 1852

---

# Source: .\node_modules\prosemirror-menu\CONTRIBUTING.md

- Preview: # How to contribute - [Getting help](#getting-help) - [Submitting bug reports](#submitting-bug-reports) - [Contributing code](#contributing-code) ## Getting help Community discussion, questions, and informal bug reporting is done on the [discuss.ProseMirror forum](http://discuss.prosemirror.net). ## Submitting bug reports Report bugs on the [GitHub issue tracker](http://github.com/prosemirror/pros
- Lines: 103
- Characters: 3617

---

# Source: .\node_modules\prosemirror-menu\README.md

- Preview: # prosemirror-menu [ [**WEBSITE**](https://prosemirror.net) | [**ISSUES**](https://github.com/prosemirror/prosemirror-menu/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**GITTER**](https://gitter.im/ProseMirror/prosemirror) ] This is a non-core example module for [ProseMirror](https://prosemirror.net). ProseMirror is a well-behaved rich semantic content editor based on contentEditable,
- Lines: 198
- Characters: 7860

---

# Source: .\node_modules\prosemirror-menu\src\README.md

- Preview: This module defines a number of building blocks for ProseMirror menus, along with a [menu bar](#menu.menuBar) implementation. When using this module, you should make sure its [`style/menu.css`](https://github.com/ProseMirror/prosemirror-menu/blob/master/style/menu.css) file is loaded into your page. @MenuElement @MenuItem @MenuItemSpec @IconSpec @Dropdown @DropdownSubmenu @menuBar This module expo
- Lines: 34
- Characters: 599

---

# Source: .\node_modules\prosemirror-model\CHANGELOG.md

- Preview: ## 1.25.3 (2025-08-06) ### Bug fixes Fix a bug in `Slice` that made it possible for invalid `ReplaceAroundStep`s to be applied in some situations. ## 1.25.2 (2025-07-11) ### Bug fixes Suppress lint warnings about dereferencing methods by making `Schema.nodeFromJSON` and `markFromJSON` properties instead of methods. Avoid using `setAttribute("style", ...)` to stay clear of content security policies
- Lines: 727
- Characters: 27405

---

# Source: .\node_modules\prosemirror-model\CONTRIBUTING.md

- Preview: # How to contribute - [Getting help](#getting-help) - [Submitting bug reports](#submitting-bug-reports) - [Contributing code](#contributing-code) ## Getting help Community discussion, questions, and informal bug reporting is done on the [discuss.ProseMirror forum](http://discuss.prosemirror.net). ## Submitting bug reports Report bugs on the [GitHub issue tracker](http://github.com/prosemirror/pros
- Lines: 107
- Characters: 3814

---

# Source: .\node_modules\prosemirror-model\README.md

- Preview: # prosemirror-model [ [**WEBSITE**](https://prosemirror.net) | [**ISSUES**](https://github.com/prosemirror/prosemirror/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**CHANGELOG**](https://github.com/ProseMirror/prosemirror-model/blob/master/CHANGELOG.md) ] This is a [core module](https://prosemirror.net/docs/ref/#model) of [ProseMirror](https://prosemirror.net). ProseMirror is a well-b
- Lines: 32
- Characters: 1438

---

# Source: .\node_modules\prosemirror-model\src\README.md

- Preview: This module defines ProseMirror's content model, the data structures used to represent and work with documents. ### Document Structure A ProseMirror document is a tree. At each level, a [node](#model.Node) describes the type of the content, and holds a [fragment](#model.Fragment) containing its children. @Node @Fragment @Mark @Slice @Attrs @ReplaceError ### Resolved Positions Positions in a docume
- Lines: 65
- Characters: 1296

---

# Source: .\node_modules\prosemirror-schema-basic\CHANGELOG.md

- Preview: ## 1.2.4 (2025-03-18) ### Bug fixes Add a `code` flag to the code mark. ## 1.2.3 (2024-07-14) ### Bug fixes Add attribute type validation for headings, images, and link marks. ## 1.2.2 (2023-05-17) ### Bug fixes Include CommonJS type declarations in the package to please new TypeScript resolution settings. ## 1.2.1 (2023-01-18) ### Bug fixes Add parse rules to clear `em` and `strong` marks for sty
- Lines: 84
- Characters: 1760

---

# Source: .\node_modules\prosemirror-schema-basic\CONTRIBUTING.md

- Preview: # How to contribute - [Getting help](#getting-help) - [Submitting bug reports](#submitting-bug-reports) - [Contributing code](#contributing-code) ## Getting help Community discussion, questions, and informal bug reporting is done on the [discuss.ProseMirror forum](http://discuss.prosemirror.net). ## Submitting bug reports Report bugs on the [GitHub issue tracker](http://github.com/prosemirror/pros
- Lines: 103
- Characters: 3617

---

# Source: .\node_modules\prosemirror-schema-basic\README.md

- Preview: # prosemirror-schema-basic [ [**WEBSITE**](https://prosemirror.net) | [**ISSUES**](https://github.com/prosemirror/prosemirror/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**CHANGELOG**](https://github.com/ProseMirror/prosemirror-schema-basic/blob/master/CHANGELOG.md) ] This is a [schema module](https://prosemirror.net/docs/ref/#schema-basic) for [ProseMirror](https://prosemirror.net).
- Lines: 31
- Characters: 1379

---

# Source: .\node_modules\prosemirror-schema-basic\src\README.md

- Preview: This module defines a simple schema. You can use it directly, extend it, or just pick out a few node and mark specs to use in a new schema. @schema @nodes @marks
- Lines: 11
- Characters: 157

---

# Source: .\node_modules\prosemirror-schema-list\CHANGELOG.md

- Preview: ## 1.5.1 (2025-03-04) ### Bug fixes Fix an issue where `liftListItem` would, in some circumstances, join lists of different types when they ended up on the same level. ## 1.5.0 (2024-12-04) ### New features The new `wrapRangeInList` function provides the implementation of the `wrapInList` command as a more flexible function. ## 1.4.1 (2024-07-14) ### Bug fixes Add attribute type validation for ord
- Lines: 143
- Characters: 3522

---

# Source: .\node_modules\prosemirror-schema-list\CONTRIBUTING.md

- Preview: # How to contribute - [Getting help](#getting-help) - [Submitting bug reports](#submitting-bug-reports) - [Contributing code](#contributing-code) ## Getting help Community discussion, questions, and informal bug reporting is done on the [discuss.ProseMirror forum](http://discuss.prosemirror.net). ## Submitting bug reports Report bugs on the [GitHub issue tracker](http://github.com/prosemirror/pros
- Lines: 103
- Characters: 3617

---

# Source: .\node_modules\prosemirror-schema-list\README.md

- Preview: # prosemirror-schema-list [ [**WEBSITE**](https://prosemirror.net) | [**ISSUES**](https://github.com/prosemirror/prosemirror/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**CHANGELOG**](https://github.com/ProseMirror/prosemirror-schema-list/blob/master/CHANGELOG.md) ] This is a [schema module](https://prosemirror.net/docs/ref/#schema-list) for [ProseMirror](https://prosemirror.net). Pr
- Lines: 31
- Characters: 1365

---

# Source: .\node_modules\prosemirror-schema-list\src\README.md

- Preview: This module exports list-related schema elements and commands. The commands assume lists to be nestable, with the restriction that the first child of a list item is a plain paragraph. These are the node specs: @orderedList @bulletList @listItem @addListNodes Using this would look something like this: ```javascript const mySchema = new Schema({ nodes: addListNodes(baseSchema.spec.nodes, "paragraph
- Lines: 32
- Characters: 610

---

# Source: .\node_modules\prosemirror-state\CHANGELOG.md

- Preview: ## 1.4.3 (2023-05-17) ### Bug fixes Include CommonJS type declarations in the package to please new TypeScript resolution settings. ## 1.4.2 (2022-10-17) ### Bug fixes Make sure the `this` bindings in editor props defined as part of a plugin spec refers to the proper plugin type. ## 1.4.1 (2022-06-23) ### Bug fixes Make the `SelectionRange` constructor public in the types. ## 1.4.0 (2022-05-30) ##
- Lines: 291
- Characters: 14390

---

# Source: .\node_modules\prosemirror-state\CONTRIBUTING.md

- Preview: # How to contribute - [Getting help](#getting-help) - [Submitting bug reports](#submitting-bug-reports) - [Contributing code](#contributing-code) ## Getting help Community discussion, questions, and informal bug reporting is done on the [discuss.ProseMirror forum](http://discuss.prosemirror.net). ## Submitting bug reports Report bugs on the [GitHub issue tracker](http://github.com/prosemirror/pros
- Lines: 107
- Characters: 3814

---

# Source: .\node_modules\prosemirror-state\README.md

- Preview: # prosemirror-state [ [**WEBSITE**](https://prosemirror.net) | [**ISSUES**](https://github.com/prosemirror/prosemirror/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**CHANGELOG**](https://github.com/ProseMirror/prosemirror-state/blob/master/CHANGELOG.md) ] This is a [core module](https://prosemirror.net/docs/ref/#state) of [ProseMirror](https://prosemirror.net). ProseMirror is a well-b
- Lines: 31
- Characters: 1355

---

# Source: .\node_modules\prosemirror-state\src\README.md

- Preview: This module implements the state object of a ProseMirror editor, along with the representation of the selection and the plugin abstraction. ### Editor State ProseMirror keeps all editor state (the things, basically, that would be required to create an editor just like the current one) in a single [object](#state.EditorState). That object is updated (creating a new state) by applying [transactions]
- Lines: 45
- Characters: 1053

---

# Source: .\node_modules\prosemirror-tables\README.md

- Preview: # ProseMirror table module This module defines a schema extension to support tables with rowspan/colspan support, a custom selection class for cell selections in such a table, a plugin to manage such selections and enforce invariants on such tables, and a number of commands to work with tables. The top-level directory contains a `demo.js` and `index.html`, which can be built with `pnpm run build_d
- Lines: 257
- Characters: 9746

---

# Source: .\node_modules\prosemirror-trailing-node\readme.md

- Preview: # prosemirror-trailing-node > "A trailing node plugin for the prosemirror editor. [![Version][version]][npm] [![Weekly Downloads][downloads-badge]][npm] [![Bundled size][size-badge]][size] [![Typed Codebase][typescript]](#) [![MIT License][license]](#) [version]: https://flat.badgen.net/npm/v/prosemirror-trailing-node [npm]: https://npmjs.com/package/prosemirror-trailing-node [license]: https://fl
- Lines: 58
- Characters: 1748

---

# Source: .\node_modules\prosemirror-transform\CHANGELOG.md

- Preview: ## 1.10.4 (2025-04-22) ### Bug fixes Fix a bug that caused mapping `ReplaceStep`s to reset their `structure` flag. Align `removeNodeMark`'s behavior to that of `removeMark`. When passing in a node type, it now removes all occurrences of that type. ## 1.10.3 (2025-03-04) ### Bug fixes Make sure `Mapping.appendMap` doesn't mutate shared arrays passed to its constructor. ## 1.10.2 (2024-10-11) ### Bu
- Lines: 493
- Characters: 16318

---

# Source: .\node_modules\prosemirror-transform\CONTRIBUTING.md

- Preview: # How to contribute - [Getting help](#getting-help) - [Submitting bug reports](#submitting-bug-reports) - [Contributing code](#contributing-code) ## Getting help Community discussion, questions, and informal bug reporting is done on the [discuss.ProseMirror forum](http://discuss.prosemirror.net). ## Submitting bug reports Report bugs on the [GitHub issue tracker](http://github.com/prosemirror/pros
- Lines: 107
- Characters: 3814

---

# Source: .\node_modules\prosemirror-transform\README.md

- Preview: # prosemirror-transform [ [**WEBSITE**](https://prosemirror.net) | [**ISSUES**](https://github.com/prosemirror/prosemirror/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**CHANGELOG**](https://github.com/ProseMirror/prosemirror-transform/blob/master/CHANGELOG.md) ] This is a [core module](https://prosemirror.net/docs/ref/#transform) of [ProseMirror](https://prosemirror.net). ProseMirror
- Lines: 32
- Characters: 1469

---

# Source: .\node_modules\prosemirror-transform\src\README.md

- Preview: This module defines a way of modifying documents that allows changes to be recorded, replayed, and reordered. You can read more about transformations in [the guide](/docs/guide/#transform). ### Steps Transforming happens in `Step`s, which are atomic, well-defined modifications to a document. [Applying](#transform.Step.apply) a step produces a new document. Each step provides a [change map](#transf
- Lines: 62
- Characters: 1536

---

# Source: .\node_modules\prosemirror-view\CHANGELOG.md

- Preview: ## 1.41.3 (2025-10-09) ### Bug fixes Fix a bug where typing when the selection crosses inline node boundaries was ignored in some situations. ## 1.41.2 (2025-09-29) ### Bug fixes Fix an issue where some Backspace presses with SwiftKey on Android would get interpreted as Enter. ## 1.41.1 (2025-09-19) ### Bug fixes Consistently set `draggable` on a node's inner DOM representation, not a decoration w
- Lines: 2416
- Characters: 83125

---

# Source: .\node_modules\prosemirror-view\CONTRIBUTING.md

- Preview: # How to contribute - [Getting help](#getting-help) - [Submitting bug reports](#submitting-bug-reports) - [Contributing code](#contributing-code) ## Getting help Community discussion, questions, and informal bug reporting is done on the [discuss.ProseMirror forum](http://discuss.prosemirror.net). ## Submitting bug reports Report bugs on the [GitHub issue tracker](http://github.com/prosemirror/pros
- Lines: 107
- Characters: 3814

---

# Source: .\node_modules\prosemirror-view\README.md

- Preview: # prosemirror-view [ [**WEBSITE**](https://prosemirror.net) | [**ISSUES**](https://github.com/prosemirror/prosemirror/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**CHANGELOG**](https://github.com/ProseMirror/prosemirror-view/blob/master/CHANGELOG.md) ] This is a [core module](https://prosemirror.net/docs/ref/#view) of [ProseMirror](https://prosemirror.net). ProseMirror is a well-beha
- Lines: 31
- Characters: 1353

---

# Source: .\node_modules\prosemirror-view\src\README.md

- Preview: ProseMirror's view module displays a given [editor state](#state.EditorState) in the DOM, and handles user events. Make sure you load `style/prosemirror.css` as a stylesheet when using this module. @EditorView ### Props @EditorProps @NodeViewConstructor @MarkViewConstructor @DirectEditorProps @NodeView @MarkView @ViewMutationRecord @DOMEventMap ### Decorations Decorations make it possible to influ
- Lines: 41
- Characters: 517

---

# Source: .\node_modules\proxy-addr\HISTORY.md

- Preview: 2.0.7 / 2021-05-31 ================== * deps: forwarded@0.2.0 - Use `req.socket` over deprecated `req.connection` 2.0.6 / 2020-02-24 ================== * deps: ipaddr.js@1.9.1 2.0.5 / 2019-04-16 ================== * deps: ipaddr.js@1.9.0 2.0.4 / 2018-07-26 ================== * deps: ipaddr.js@1.8.0 2.0.3 / 2018-02-19 ================== * deps: ipaddr.js@1.6.0 2.0.2 / 2017-09-24 ==================
- Lines: 164
- Characters: 2830

---

# Source: .\node_modules\proxy-addr\README.md

- Preview: # proxy-addr [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Node.js Version][node-image]][node-url] [![Build Status][ci-image]][ci-url] [![Test Coverage][coveralls-image]][coveralls-url] Determine address of proxied request ## Install This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmjs.com/). In
- Lines: 142
- Characters: 3992

---

# Source: .\node_modules\proxy-from-env\README.md

- Preview: # proxy-from-env [![Build Status](https://travis-ci.org/Rob--W/proxy-from-env.svg?branch=master)](https://travis-ci.org/Rob--W/proxy-from-env) [![Coverage Status](https://coveralls.io/repos/github/Rob--W/proxy-from-env/badge.svg?branch=master)](https://coveralls.io/github/Rob--W/proxy-from-env?branch=master) `proxy-from-env` is a Node.js package that exports a function (`getProxyForUrl`) that take
- Lines: 134
- Characters: 5139

---

# Source: .\node_modules\punycode.js\README.md

- Preview: # Punycode.js [![punycode on npm](https://img.shields.io/npm/v/punycode)](https://www.npmjs.com/package/punycode) [![](https://data.jsdelivr.com/v1/package/npm/punycode/badge)](https://www.jsdelivr.com/package/npm/punycode) Punycode.js is a robust Punycode converter that fully complies to [RFC 3492](https://tools.ietf.org/html/rfc3492) and [RFC 5891](https://tools.ietf.org/html/rfc5891). This Java
- Lines: 151
- Characters: 5472

---

# Source: .\node_modules\punycode\README.md

- Preview: # Punycode.js [![punycode on npm](https://img.shields.io/npm/v/punycode)](https://www.npmjs.com/package/punycode) [![](https://data.jsdelivr.com/v1/package/npm/punycode/badge)](https://www.jsdelivr.com/package/npm/punycode) Punycode.js is a robust Punycode converter that fully complies to [RFC 3492](https://tools.ietf.org/html/rfc3492) and [RFC 5891](https://tools.ietf.org/html/rfc5891). This Java
- Lines: 151
- Characters: 5472

---

# Source: .\node_modules\qs\CHANGELOG.md

- Preview: ## **6.14.0** - [New] `parse`: add `throwOnParameterLimitExceeded` option (#517) - [Refactor] `parse`: use `utils.combine` more - [patch] `parse`: add explicit `throwOnLimitExceeded` default - [actions] use shared action; re-add finishers - [meta] Fix changelog formatting bug - [Deps] update `side-channel` - [Dev Deps] update `es-value-fixtures`, `has-bigints`, `has-proto`, `has-symbols` - [Tests]
- Lines: 625
- Characters: 32477

---

# Source: .\node_modules\qs\LICENSE.md

- Preview: BSD 3-Clause License Copyright (c) 2014, Nathan LaFreniere and other [contributors](https://github.com/ljharb/qs/graphs/contributors) All rights reserved. Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met: 1. Redistributions of source code must retain the above copyright notice, this list of conditions and
- Lines: 32
- Characters: 1571

---

# Source: .\node_modules\qs\README.md

- Preview: <p align="center"> <img alt="qs" src="./logos/banner_default.png" width="800" /> </p> # qs <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![CII Best Practices](https://bestpractices.coreinfrastructure.org/pro
- Lines: 736
- Characters: 25114

---

# Source: .\node_modules\queue-microtask\README.md

- Preview: # queue-microtask [![ci][ci-image]][ci-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][downloads-url] [![javascript style guide][standard-image]][standard-url] [ci-image]: https://img.shields.io/github/workflow/status/feross/queue-microtask/ci/master [ci-url]: https://github.com/feross/queue-microtask/actions [npm-image]: https://img.shields.io/npm/v/queue-microtask.svg [npm-url]
- Lines: 93
- Characters: 5532

---

# Source: .\node_modules\raf-schd\CHANGELOG.md

- Preview: # Changelog This project adheres to [Semantic Versioning 2.0](http://semver.org/). All release notes and upgrade notes can be found on our [Github Releases](https://github.com/alexreardon/raf-schd/releases) page.
- Lines: 7
- Characters: 210

---

# Source: .\node_modules\raf-schd\README.md

- Preview: # raf-schd A `throttle` function that uses [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame) to limit the rate at which a function is called. [![Build Status](https://travis-ci.org/alexreardon/raf-schd.svg?branch=master)](https://travis-ci.org/alexreardon/raf-schd) [![dependencies](https://david-dm.org/alexreardon/raf-schd.svg)](https://david-
- Lines: 157
- Characters: 3956

---

# Source: .\node_modules\range-parser\HISTORY.md

- Preview: 1.2.1 / 2019-05-10 ================== * Improve error when `str` is not a string 1.2.0 / 2016-06-01 ================== * Add `combine` option to combine overlapping ranges 1.1.0 / 2016-05-13 ================== * Fix incorrectly returning -1 when there is at least one valid range * perf: remove internal function 1.0.3 / 2015-10-29 ================== * perf: enable strict mode 1.0.2 / 2014-09-08 ===
- Lines: 59
- Characters: 861

---

# Source: .\node_modules\range-parser\README.md

- Preview: # range-parser [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Node.js Version][node-image]][node-url] [![Build Status][travis-image]][travis-url] [![Test Coverage][coveralls-image]][coveralls-url] Range header field parser. ## Installation This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmjs.com/
- Lines: 87
- Characters: 2194

---

# Source: .\node_modules\raw-body\HISTORY.md

- Preview: 3.0.1 / 2025-09-03 ================== * deps: iconv-lite@0.7.0 - Avoid false positives in encodingExists by using objects without a prototype - Remove compatibility check for StringDecoder.end method * Fix the engines field to reflect support for Node >= 0.10 3.0.0 / 2024-07-25 ================== * deps: iconv-lite@0.6.3 - Fix HKSCS encoding to prefer Big5 codes - Fix minor issue in UTF-32 decoder
- Lines: 336
- Characters: 6452

---

# Source: .\node_modules\raw-body\node_modules\iconv-lite\Changelog.md

- Preview: ## 0.7.0 ### 🐞 Bug fixes * Handle split surrogate pairs when encoding utf8 - by [@yosion-p](https://github.com/yosion-p) and [@ashtuchkin](https://github.com/ashtuchkin) in [#282](https://github.com/ashtuchkin/iconv-lite/pull/282): Handle a case where streaming utf8 encoder (converting js strings -> buffers) encounters surrogate pairs split between chunks (last character of one chunk is high surr
- Lines: 239
- Characters: 7848

---

# Source: .\node_modules\raw-body\node_modules\iconv-lite\README.md

- Preview: ## iconv-lite: Pure JS character encoding conversion [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-downloads-url] [![License][license-image]][license-url] [![NPM Install Size][npm-install-size-image]][npm-install-size-url] * No need for native code compilation. Quick to install, works on Windows, Web, and in sandboxed environments. * Used in popular proje
- Lines: 141
- Characters: 6448

---

# Source: .\node_modules\raw-body\README.md

- Preview: # raw-body [![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url] [![Node.js Version][node-version-image]][node-version-url] [![Build status][github-actions-ci-image]][github-actions-ci-url] [![Test coverage][coveralls-image]][coveralls-url] Gets the entire buffer of a stream either as a `Buffer` or a string. Validates the stream's length against an expected length
- Lines: 226
- Characters: 6330

---

# Source: .\node_modules\raw-body\SECURITY.md

- Preview: # Security Policies and Procedures ## Reporting a Bug The `raw-body` team and community take all security bugs seriously. Thank you for improving the security of Express. We appreciate your efforts and responsible disclosure and will make every effort to acknowledge your contributions. Report security bugs by emailing the current owners of `raw-body`. This information can be found in the npm regis
- Lines: 27
- Characters: 1164

---

# Source: .\node_modules\react\README.md

- Preview: # `react` React is a JavaScript library for creating user interfaces. The `react` package contains only the functionality necessary to define React components. It is typically used together with a React renderer like `react-dom` for the web, or `react-native` for the native environments. **Note:** by default, React will be in development mode. The development version includes extra warnings about
- Lines: 40
- Characters: 1121

---

# Source: .\node_modules\react-data-grid\README.md

- Preview: # react-data-grid [![npm-badge]][npm-url] [![type-badge]][npm-url] [![size-badge]][size-url] [![codecov-badge]][codecov-url] [![ci-badge]][ci-url] [npm-badge]: https://img.shields.io/npm/v/react-data-grid [npm-url]: https://www.npmjs.com/package/react-data-grid [size-badge]: https://img.shields.io/bundlephobia/minzip/react-data-grid [size-url]: https://bundlephobia.com/package/react-data-grid [typ
- Lines: 842
- Characters: 22209

---

# Source: .\node_modules\react-day-picker\README.md

- Preview: # React DayPicker [DayPicker](http://react-day-picker.js.org) is a date picker component for [React](https://reactjs.org). Renders a monthly calendar to select days. DayPicker is customizable, works great with input fields and can be styled to match any design. ➡️ **[react-day-picker.js.org](http://react-day-picker.js.org)** for guides, examples and API reference. <picture> <source media="(prefers
- Lines: 68
- Characters: 2508

---

# Source: .\node_modules\react-docgen-typescript\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) 2016 Pavel Vasek Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit per
- Lines: 11
- Characters: 1069

---

# Source: .\node_modules\react-docgen-typescript\README.md

- Preview: # react-docgen-typescript [![Build Status](https://github.com/styleguidist/react-docgen-typescript/actions/workflows/nodejs.yml/badge.svg)](https://github.com/styleguidist/react-docgen-typescript/actions/workflows/nodejs.yml) ![](https://nodei.co/npm/react-docgen-typescript.png?downloadRank=true&downloads=true) A simple parser for React properties defined in TypeScript instead of propTypes. It can
- Lines: 286
- Characters: 7438

---

# Source: .\node_modules\react-dom\node_modules\scheduler\README.md

- Preview: # `scheduler` This is a package for cooperative scheduling in a browser environment. It is currently used internally by React, but we plan to make it more generic. The public API for this package is not yet finalized. ### Thanks The React team thanks [Anton Podviaznikov](https://podviaznikov.com/) for donating the `scheduler` package name.
- Lines: 12
- Characters: 337

---

# Source: .\node_modules\react-dom\README.md

- Preview: # `react-dom` This package serves as the entry point to the DOM and server renderers for React. It is intended to be paired with the generic React package, which is shipped as `react` to npm. ## Installation ```sh npm install react react-dom ``` ## Usage ### In the browser ```js import { createRoot } from 'react-dom/client'; function App() { return <div>Hello World</div>; } const root = createRoot
- Lines: 63
- Characters: 1036

---

# Source: .\node_modules\react-draggable\CHANGELOG.md

- Preview: # Changelog ### 4.5.0 (Jun 25, 2025) - Internal: Update clsx version (#754) - Fix: bounds="selector" functionality when in a Shadow DOM tree. (#763) - Perf: Update nodeRef type for React v19 compatibility (#769) - Fix: forgotten requestAnimationFrame call (#773) - Perf: setState in lifecycles + forced reflow (#556) - Fix: add allowMobileScroll prop to allow for clicks to optionally pass through on
- Lines: 574
- Characters: 22733

---

# Source: .\node_modules\react-draggable\README.md

- Preview: # React-Draggable [![TravisCI Build Status](https://api.travis-ci.org/react-grid-layout/react-draggable.svg?branch=master)](https://travis-ci.org/react-grid-layout/react-draggable) [![Appveyor Build Status](https://ci.appveyor.com/api/projects/status/32r7s2skrgm9ubva?svg=true)](https://ci.appveyor.com/project/react-grid-layout/react-draggable) [![npm downloads](https://img.shields.io/npm/dt/react-
- Lines: 383
- Characters: 13101

---

# Source: .\node_modules\react-dropzone\examples\accept\README.md

- Preview: By providing `accept` prop you can make the dropzone accept specific file types and reject the others. The value must be an object with a common [MIME type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types) as keys and an array of file extensions as values (similar to [showOpenFilePicker](https://developer.mozilla.org/en-US/docs/Web/API/window/showOpenFilePi
- Lines: 147
- Characters: 3799

---

# Source: .\node_modules\react-dropzone\examples\basic\README.md

- Preview: The `useDropzone` hook just binds the necessary handlers to create a drag 'n' drop zone. Use the `getRootProps()` fn to get the props required for drag 'n' drop and use them on any element. For click and keydown behavior, use the `getInputProps()` fn and use the returned props on an `<input>`. Furthermore, the hook supports folder drag 'n' drop by default. See [file-selector](https://github.com/re
- Lines: 73
- Characters: 1763

---

# Source: .\node_modules\react-dropzone\examples\class-component\README.md

- Preview: If you're still using class components, you can use the [`<Dropzone>`](https://react-dropzone.js.org/#components) component provided by the lib: ```jsx harmony import React, {Component} from 'react'; import Dropzone from 'react-dropzone'; class Basic extends Component { constructor() { super(); this.onDrop = (files) => { this.setState({files}) }; this.state = { files: [] }; } render() { const file
- Lines: 48
- Characters: 1043

---

# Source: .\node_modules\react-dropzone\examples\events\README.md

- Preview: If you'd like to prevent drag events propagation from the child to parent, you can use the `{noDragEventsBubbling}` property on the child: ```jsx harmony import React from 'react'; import {useDropzone} from 'react-dropzone'; function OuterDropzone(props) { const {getRootProps} = useDropzone({ // Note how this callback is never invoked if drop occurs on the inner dropzone onDrop: files => console.l
- Lines: 167
- Characters: 4822

---

# Source: .\node_modules\react-dropzone\examples\file-dialog\README.md

- Preview: You can programmatically invoke the default OS file prompt; just use the `open` method returned by the hook. **Note** that for security reasons most browsers require popups and dialogues to originate from a direct user interaction (i.e. click). If you are calling `open()` asynchronously, there’s a good chance it’s going to be blocked by the browser. So if you are calling `open()` asynchronously, b
- Lines: 93
- Characters: 2677

---

# Source: .\node_modules\react-dropzone\examples\forms\README.md

- Preview: React-dropzone does not submit the files in form submissions by default. If you need this behavior, you can add a hidden file input, and set the files into it. ```jsx harmony import React, {useRef} from 'react'; import {useDropzone} from 'react-dropzone'; function Dropzone(props) { const {required, name} = props; const hiddenInputRef = useRef(null); const {getRootProps, getInputProps, open, accept
- Lines: 72
- Characters: 1877

---

# Source: .\node_modules\react-dropzone\examples\maxFiles\README.md

- Preview: By providing `maxFiles` prop you can limit how many files the dropzone accepts. **Note** that this prop is enabled when the `multiple` prop is enabled. The default value for this prop is 0, which means there's no limitation to how many files are accepted. ```jsx harmony import React from 'react'; import {useDropzone} from 'react-dropzone'; function AcceptMaxFiles(props) { const { acceptedFiles, fi
- Lines: 61
- Characters: 1383

---

# Source: .\node_modules\react-dropzone\examples\no-jsx\README.md

- Preview: If you'd like to use [react without JSX](https://reactjs.org/docs/react-without-jsx.html) you can: ```js harmony import React, {useCallback, useState} from 'react'; import {useDropzone} from 'react-dropzone'; const e = React.createElement function Basic () { const [files, setFiles] = useState([]); const onDrop = useCallback(files => setFiles(files), [setFiles]); const {getRootProps, getInputProps}
- Lines: 35
- Characters: 952

---

# Source: .\node_modules\react-dropzone\examples\pintura\README.md

- Preview: If you'd like to integrate the dropzone with the [Pintura](https://pqina.nl/pintura/?ref=react-dropzone) image editor, you just need to pass either of the selected images to the `openDefaultEditor()` method exported by Pintura: ```jsx static import React, { useState, useEffect } from 'react'; // React Dropzone import { useDropzone } from 'react-dropzone'; // Pintura Image Editor import 'pintura/pi
- Lines: 149
- Characters: 3873

---

# Source: .\node_modules\react-dropzone\examples\plugins\README.md

- Preview: The hook accepts a `getFilesFromEvent` prop that enhances the handling of dropped file system objects and allows more flexible use of them e.g. passing a function that accepts drop event of a folder and resolves it to an array of files adds plug-in functionality of folders drag-and-drop. Though, note that the provided `getFilesFromEvent` fn must return a `Promise` with a list of `File` objects (or
- Lines: 58
- Characters: 1884

---

# Source: .\node_modules\react-dropzone\examples\previews\README.md

- Preview: Starting with version 7.0.0, the `{preview}` property generation on the [File](https://developer.mozilla.org/en-US/docs/Web/API/File) objects and the `{disablePreview}` property on the `<Dropzone>` have been removed. If you need the `{preview}`, it can be easily achieved in the `onDrop()` callback: ```jsx harmony import React, {useEffect, useState} from 'react'; import {useDropzone} from 'react-dr
- Lines: 89
- Characters: 1976

---

# Source: .\node_modules\react-dropzone\examples\styling\README.md

- Preview: The hook fn doesn't set any styles on either of the prop fns (`getRootProps()`/`getInputProps()`). ### Using inline styles ```jsx harmony import React, {useMemo} from 'react'; import {useDropzone} from 'react-dropzone'; const baseStyle = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', borderWidth: 2, borderRadius: 2, borderColor: '#eeeeee', borderStyle:
- Lines: 129
- Characters: 2423

---

# Source: .\node_modules\react-dropzone\examples\validator\README.md

- Preview: By providing `validator` prop you can specify custom validation for files. The value must be a function that accepts File object and returns null if file should be accepted or error object/array of error objects if file should be rejected. ```jsx harmony import React from 'react'; import {useDropzone} from 'react-dropzone'; const maxLength = 20; function nameLengthValidator(file) { if (file.name.l
- Lines: 71
- Characters: 1593

---

# Source: .\node_modules\react-dropzone\README.md

- Preview: ![react-dropzone logo](https://raw.githubusercontent.com/react-dropzone/react-dropzone/master/logo/logo.png) # react-dropzone [![npm](https://img.shields.io/npm/v/react-dropzone.svg?style=flat-square)](https://www.npmjs.com/package/react-dropzone) ![Tests](https://img.shields.io/github/actions/workflow/status/react-dropzone/react-dropzone/test.yml?branch=master&style=flat-square&label=tests) [![co
- Lines: 447
- Characters: 24687

---

# Source: .\node_modules\reactflow\README.md

- Preview: ![readme-header](https://user-images.githubusercontent.com/3797215/156259138-fb9f59f8-52f2-474a-b78c-6570867e4ead.svg#gh-light-mode-only) <div align="center"> ![GitHub License MIT](https://img.shields.io/github/license/wbkd/react-flow?color=%23ff0072) ![npm downloads](https://img.shields.io/npm/dt/reactflow?color=%23FF0072&label=downloads) ![GitHub Repo stars](https://img.shields.io/github/stars/w
- Lines: 136
- Characters: 6114

---

# Source: .\node_modules\react-grid-layout\CHANGELOG.md

- Preview: # Changelog ## 1.5.2 (Jun 25, 2025) - Fix `calcXY` when `isBounded=true` moving items incorrectly. Likely related to #2059. Thanks @wanpan11. [#2102](https://github.com/react-grid-layout/react-grid-layout/pull/2102) ## 1.5.1 (Mar 11, 2025) - Fix for React 18: wrap state calls in `flushSync`. Thanks @ashharrison90. [#2043](https://github.com/react-grid-layout/react-grid-layout/pull/2043) ## 1.5.0 (
- Lines: 917
- Characters: 35075

---

# Source: .\node_modules\react-grid-layout\README.md

- Preview: # React-Grid-Layout [![travis build](https://travis-ci.org/STRML/react-grid-layout.svg?branch=master)](https://travis-ci.org/STRML/react-grid-layout) [![CDNJS](https://img.shields.io/cdnjs/v/react-grid-layout.svg)](https://cdnjs.com/libraries/react-grid-layout) [![npm package](https://img.shields.io/npm/v/react-grid-layout.svg?style=flat-square)](https://www.npmjs.org/package/react-grid-layout) [!
- Lines: 625
- Characters: 24416

---

# Source: .\node_modules\react-hook-form\README.md

- Preview: <div align="center"> <a href="https://react-hook-form.com" title="React Hook Form - Simple React forms validation"> <img src="https://raw.githubusercontent.com/react-hook-form/react-hook-form/master/docs/logo.png" alt="React Hook Form Logo - React hook custom hook for form validation" /> </a> </div> <div align="center"> [![npm downloads](https://img.shields.io/npm/dm/react-hook-form.svg?style=for-
- Lines: 128
- Characters: 7661

---

# Source: .\node_modules\react-hot-toast\README.md

- Preview: <a href="https://react-hot-toast.com/"><img alt="react-hot-toast - Try it out" src="https://github.com/timolins/react-hot-toast/raw/main/assets/header.svg"/></a> <div align="center"> <img src="https://badgen.net/npm/v/react-hot-toast" alt="NPM Version" /> <img src="https://badgen.net/bundlephobia/minzip/react-hot-toast" alt="minzipped size"/> <img src="https://github.com/timolins/react-hot-toast/w
- Lines: 75
- Characters: 1874

---

# Source: .\node_modules\react-icons\README.md

- Preview: <img src="https://raw.githubusercontent.com/react-icons/react-icons/master/react-icons.svg" width="120" alt="React Icons"> # [React Icons](https://react-icons.github.io/react-icons) [![npm][npm-image]][npm-url] [npm-image]: https://img.shields.io/npm/v/react-icons.svg?style=flat-square [npm-url]: https://www.npmjs.com/package/react-icons Include popular icons in your React projects easily with `re
- Lines: 273
- Characters: 12850

---

# Source: .\node_modules\react-is\README.md

- Preview: # `react-is` This package allows you to test arbitrary values and see if they're a particular React element type. ## Installation ```sh # Yarn yarn add react-is # NPM npm install react-is ``` ## Usage ### Determining if a Component is Valid ```js import React from "react"; import * as ReactIs from "react-is"; class ClassComponent extends React.Component { render() { return React.createElement("div
- Lines: 107
- Characters: 2274

---

# Source: .\node_modules\react-markdown\readme.md

- Preview: <!-- Notes for maintaining this document: * update the version of the link for `commonmark-html` once in a while --> # react-markdown [![Build][badge-build-image]][badge-build-url] [![Coverage][badge-coverage-image]][badge-coverage-url] [![Downloads][badge-downloads-image]][badge-downloads-url] [![Size][badge-size-image]][badge-size-url] React component to render markdown. ## Feature highlights *
- Lines: 943
- Characters: 25294

---

# Source: .\node_modules\react-number-format\README.md

- Preview: [![Actions Status](https://github.com/s-yadav/react-number-format/workflows/CI/badge.svg)](https://github.com/s-yadav/react-number-format/actions) # react-number-format React Number Format is an input-formatter library with a sophisticated and light weight caret engine. It ensures that a user can only enter text that meets specific numeric or string patterns, and formats the input value for displa
- Lines: 85
- Characters: 2187

---

# Source: .\node_modules\react-promise-suspense\node_modules\fast-deep-equal\README.md

- Preview: # fast-deep-equal The fastest deep equal [![Build Status](https://travis-ci.org/epoberezkin/fast-deep-equal.svg?branch=master)](https://travis-ci.org/epoberezkin/fast-deep-equal) [![npm version](https://badge.fury.io/js/fast-deep-equal.svg)](http://badge.fury.io/js/fast-deep-equal) [![Coverage Status](https://coveralls.io/repos/github/epoberezkin/fast-deep-equal/badge.svg?branch=master)](https://c
- Lines: 61
- Characters: 1491

---

# Source: .\node_modules\react-promise-suspense\README.md

- Preview: # usePromise React hook for resolving promises with Suspense support. Inspired by [fetch-suspense](https://github.com/CharlesStover/fetch-suspense), but this one is not limited to fetch, `usePromise` works with any Promise. [![version](https://img.shields.io/npm/v/react-promise-suspense.svg)](https://www.npmjs.com/package/react-promise-suspense) [![minified size](https://img.shields.io/bundlephobi
- Lines: 46
- Characters: 1450

---

# Source: .\node_modules\react-redux\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) 2015-present Dan Abramov Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to pe
- Lines: 24
- Characters: 1065

---

# Source: .\node_modules\react-redux\README.md

- Preview: # React Redux Official React bindings for [Redux](https://github.com/reduxjs/redux). Performant and flexible. ![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/reduxjs/react-redux/test.yml?style=flat-square) [![npm version](https://img.shields.io/npm/v/react-redux.svg?style=flat-square)](https://www.npmjs.com/package/react-redux) [![npm downloads](https://img.shields.
- Lines: 66
- Characters: 3128

---

# Source: .\node_modules\react-refresh\README.md

- Preview: # react-refresh This package implements the wiring necessary to integrate Fast Refresh into bundlers. Fast Refresh is a feature that lets you edit React components in a running application without losing their state. It is similar to an old feature known as "hot reloading", but Fast Refresh is more reliable and officially supported by React. This package is primarily aimed at developers of bundler
- Lines: 8
- Characters: 577

---

# Source: .\node_modules\react-remove-scroll\README.md

- Preview: <div align="center"> <h1>React-remove-📜</h1> <br/> dont even scroll <br/> <a href="https://www.npmjs.com/package/react-remove-scroll"> <img src="https://img.shields.io/npm/v/react-remove-scroll.svg?style=flat-square" /> </a> <a href="https://travis-ci.org/theKashey/react-remove-scroll"> <img src="https://img.shields.io/travis/theKashey/react-remove-scroll.svg?style=flat-square" alt="Build status"
- Lines: 155
- Characters: 5758

---

# Source: .\node_modules\react-remove-scroll-bar\README.md

- Preview: <h1>react-remove-scroll-bar</h1> [![npm](https://img.shields.io/npm/v/react-remove-scroll-bar.svg)](https://www.npmjs.com/package/react-remove-scroll-bar) [![bundle size](https://badgen.net/bundlephobia/minzip/react-remove-scroll-bar)](https://bundlephobia.com/result?p=react-remove-scroll-bar) [![downloads](https://badgen.net/npm/dm/react-remove-scroll-bar)](https://www.npmtrends.com/react-remove-
- Lines: 55
- Characters: 1664

---

# Source: .\node_modules\react-resizable\CHANGELOG.md

- Preview: # Changelog ### 3.0.5 (Mar 21, 2023) - 🐛 Bugfix: Make `width` and `height` conditionally required if an `axis` is set. See [#196](https://github.com/react-grid-layout/react-resizable/issues/196) - ✏ Chore: Minor dependency upgrades. - ✏ Chore: Fix documentation of `onResize` callback arity. ### 3.0.4 (Jun 15, 2021) - 🐛 Bugfix: Fix incorrect fix for `handleAxis` on DOM elements. [#175](https://gi
- Lines: 165
- Characters: 6470

---

# Source: .\node_modules\react-resizable\README.md

- Preview: ### React-Resizable [View the Demo](https://react-grid-layout.github.io/react-resizable/index.html) A simple widget that can be resized via one or more handles. You can either use the `<Resizable>` element directly, or use the much simpler `<ResizableBox>` element. See the example and associated code in [ExampleLayout](/examples/ExampleLayout.js) and [ResizableBox](/lib/ResizableBox.js) for more d
- Lines: 190
- Characters: 5485

---

# Source: .\node_modules\react-resizable-panels\README.md

- Preview: # react-resizable-panels React components for resizable panel groups/layouts ```jsx import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"; <PanelGroup autoSaveId="example" direction="horizontal"> <Panel defaultSize={25}> <SourcesExplorer /> </Panel> <PanelResizeHandle /> <Panel> <SourceViewer /> </Panel> <PanelResizeHandle /> <Panel defaultSize={25}> <Console /> </Panel> </
- Lines: 262
- Characters: 12400

---

# Source: .\node_modules\react-spreadsheet\readme.md

- Preview: <div align="center"> <img src="https://raw.githubusercontent.com/iddan/react-spreadsheet/master/assets/logo.svg?sanitize=true" height="120"> </div> # React Spreadsheet Simple, customizable yet performant spreadsheet for React. ![Screenshot](https://github.com/iddan/react-spreadsheet/blob/master/assets/screenshot.png?raw=true) [![CI](https://github.com/iddan/react-spreadsheet/workflows/CI/badge.svg
- Lines: 36
- Characters: 1142

---

# Source: .\node_modules\react-style-singleton\README.md

- Preview: react-style-singleton ==== __300b__ with all dependencies, minified and gzipped Creates a style component with internal _tracker_. - Adds styles to the browser on the __first__ instance mount. - Removes after the __last__ instance unmount. - Thus helps you deliver styles you need to the customer, and clean up later. - Is not server-side rendering compatible! # API ## Component ```js import {styleS
- Lines: 48
- Characters: 822

---

# Source: .\node_modules\react-syntax-highlighter\.github\ISSUE_TEMPLATE\bug_report.md

- Preview: name: Bug report about: Create a report to help us improve **Describe the bug** A clear and concise description of what the bug is. **To Reproduce** Steps to reproduce the behavior: 1. Go to '...' 2. Click on '....' 3. Scroll down to '....' 4. See error **Expected behavior** A clear and concise description of what you expected to happen. **Screenshots** If applicable, add screenshots to help expla
- Lines: 36
- Characters: 758

---

# Source: .\node_modules\react-syntax-highlighter\.github\ISSUE_TEMPLATE\feature_request.md

- Preview: name: Feature request about: Suggest an idea for this project **Is your feature request related to a problem? Please describe.** A clear and concise description of what the problem is. Ex. I'm always frustrated when [...] **Describe the solution you'd like** A clear and concise description of what you want to happen. **Describe alternatives you've considered** A clear and concise description of an
- Lines: 18
- Characters: 537

---

# Source: .\node_modules\react-syntax-highlighter\AVAILABLE_LANGUAGES_HLJS.MD

- Preview: ## Available `language` imports * oneC (1c) * abnf * accesslog * actionscript * ada * angelscript * apache * applescript * arcade * arduino * armasm * asciidoc * aspectj * autohotkey * autoit * avrasm * awk * axapta * bash * basic * bnf * brainfuck * cLike (c-like) * c * cal * capnproto * ceylon * clean * clojureRepl (clojure-repl) * clojure * cmake * coffeescript * coq * cos * cpp * crmsh * cryst
- Lines: 195
- Characters: 1646

---

# Source: .\node_modules\react-syntax-highlighter\AVAILABLE_LANGUAGES_PRISM.MD

- Preview: ## Available `language` imports * abap * abnf * actionscript * ada * agda * al * antlr4 * apacheconf * apex * apl * applescript * aql * arduino * arff * asciidoc * asm6502 * asmatmel * aspnet * autohotkey * autoit * avisynth * avroIdl (avro-idl) * bash * basic * batch * bbcode * bicep * birb * bison * bnf * brainfuck * brightscript * bro * bsl * c * cfscript * chaiscript * cil * clike * clojure *
- Lines: 281
- Characters: 2538

---

# Source: .\node_modules\react-syntax-highlighter\AVAILABLE_STYLES_HLJS.MD

- Preview: ## Available `stylesheet` props * a11yDark * a11yLight * agate * anOldHope * androidstudio * arduinoLight * arta * ascetic * atelierCaveDark * atelierCaveLight * atelierDuneDark * atelierDuneLight * atelierEstuaryDark * atelierEstuaryLight * atelierForestDark * atelierForestLight * atelierHeathDark * atelierHeathLight * atelierLakesideDark * atelierLakesideLight * atelierPlateauDark * atelierPlate
- Lines: 101
- Characters: 1324

---

# Source: .\node_modules\react-syntax-highlighter\AVAILABLE_STYLES_PRISM.MD

- Preview: ## Available `stylesheet` props * coy * dark * funky * okaidia * solarizedlight * tomorrow * twilight * prism * a11yDark * atomDark * base16AteliersulphurpoolLight * cb * coldarkCold * coldarkDark * coyWithoutShadows * darcula * dracula * duotoneDark * duotoneEarth * duotoneForest * duotoneLight * duotoneSea * duotoneSpace * ghcolors * gruvboxDark * gruvboxLight * holiTheme * hopscotch * lucario *
- Lines: 48
- Characters: 543

---

# Source: .\node_modules\react-syntax-highlighter\CHANGELOG.MD

- Preview: # Changelog ## 15.6.1 - Fix: Allow override of `display:` styles when `wrapLongLines` is true ## 15.6.0 - Fix: #561 Fix bug with wrapLines that butchers highlighting - Docs: #559 Adding languages - Feat: #555 Add Vue language support - Feat: #534 Add a11yOneLight theme ## [ gap in documentation ] ## 15.4.3 / 2020-12-07 - Fixed `highlight` version regression ## 15.4.2 / 2020-12-07 - Updated `lowlig
- Lines: 615
- Characters: 17318

---

# Source: .\node_modules\react-syntax-highlighter\CODE_OF_CONDUCT.md

- Preview: # Contributor Covenant Code of Conduct ## Our Pledge In the interest of fostering an open and welcoming environment, we as contributors and maintainers pledge to making participation in our project and our community a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, r
- Lines: 49
- Characters: 3183

---

# Source: .\node_modules\react-syntax-highlighter\README.md

- Preview: ## React Syntax Highlighter [![Actions Status](https://github.com/react-syntax-highlighter/react-syntax-highlighter/workflows/Node%20CI/badge.svg)](https://github.com/conorhastings/react-syntax-highlighter/actions) [![npm](https://img.shields.io/npm/dm/react-syntax-highlighter.svg?style=flat-square)](https://www.npmjs.com/package/react-syntax-highlighter) <!-- [![codecov](https://codecov.io/gh/con
- Lines: 192
- Characters: 12688

---

# Source: .\node_modules\react-textarea-autosize\README.md

- Preview: [![npm version](https://img.shields.io/npm/v/react-textarea-autosize.svg)](https://www.npmjs.com/package/react-textarea-autosize) [![npm](https://img.shields.io/npm/dm/react-textarea-autosize.svg)](https://www.npmjs.com/package/react-textarea-autosize) # react-textarea-autosize Drop-in replacement for the textarea component which automatically resizes textarea as content changes. A native React ve
- Lines: 91
- Characters: 3772

---

# Source: .\node_modules\react-timeago\CHANGELOG.md

- Preview: # Changelog #### v7.1.0 - Use Intl to render persian number for farsi languages - Looking for help testing the results and then doing the same for Arabic #### v7.0.0 - Added support for React 18 - Added hi.js language strings - Added so.js language strings - Added oc.js language strings - Update ru.js language strings - Fix memory leak - Update dependencies #### v6.1.0 - Added `eslint-plugin-react
- Lines: 86
- Characters: 2843

---

# Source: .\node_modules\react-timeago\README.md

- Preview: ![React-TimeAgo](http://naman.s3.amazonaws.com/react-timeago.png) A simple time-ago component for [React]. ## Usage: `react-timeago` is a very simple component that takes a `date` prop and returns a `time` element with live updating date in a time-ago format. The date will update only as often as needed. For timestamps below a minute away — every second, for timestamps up to 5 minutes away — every
- Lines: 148
- Characters: 6527

---

# Source: .\node_modules\react-virtualized-auto-sizer\LICENSE.md

- Preview: MIT License Copyright (c) 2023 Brian Vaughn Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\react-virtualized-auto-sizer\README.md

- Preview: # react-virtualized-auto-sizer Standalone version of the `AutoSizer` component from [`react-virtualized`](https://github.com/bvaughn/react-virtualized). ### If you like this project, 🎉 [become a sponsor](https://github.com/sponsors/bvaughn/) or ☕ [buy me a coffee](http://givebrian.coffee/) ## Install ```bash npm install --save react-virtualized-auto-sizer ``` ## Documentation | Property      | Ty
- Lines: 101
- Characters: 5831

---

# Source: .\node_modules\react-window\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) 2018 Brian Vaughn Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit pe
- Lines: 24
- Characters: 1058

---

# Source: .\node_modules\react-window\README.md

- Preview: # react-window > React components for efficiently rendering large lists and tabular data ### If you like this project, 🎉 [become a sponsor](https://github.com/sponsors/bvaughn/) or ☕ [buy me a coffee](http://givebrian.coffee/) React window works by only rendering *part* of a large data set (just enough to fill the viewport). This helps address some common performance bottlenecks: 1. It reduces th
- Lines: 173
- Characters: 15297

---

# Source: .\node_modules\read-cache\node_modules\pify\readme.md

- Preview: # pify [![Build Status](https://travis-ci.org/sindresorhus/pify.svg?branch=master)](https://travis-ci.org/sindresorhus/pify) > Promisify a callback-style function ## Install ``` $ npm install --save pify ``` ## Usage ```js const fs = require('fs'); const pify = require('pify'); // promisify a single function pify(fs.readFile)('package.json', 'utf8').then(data => { console.log(JSON.parse(data).name
- Lines: 122
- Characters: 2459

---

# Source: .\node_modules\read-cache\README.md

- Preview: # read-cache [![Build Status](https://travis-ci.org/TrySound/read-cache.svg?branch=master)](https://travis-ci.org/TrySound/read-cache) Reads and caches the entire contents of a file until it is modified. ## Install ``` $ npm i read-cache ``` ## Usage ```js // foo.js var readCache = require('read-cache'); readCache('foo.js').then(function (contents) { console.log(contents); }); ``` ## API ### readC
- Lines: 49
- Characters: 724

---

# Source: .\node_modules\readdirp\node_modules\picomatch\CHANGELOG.md

- Preview: # Release history **All notable changes to this project will be documented in this file.** The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html). <details> <summary><strong>Guiding Principles</strong></summary> - Changelogs are for humans, not machines. - There should be an entry for ever
- Lines: 139
- Characters: 6067

---

# Source: .\node_modules\readdirp\node_modules\picomatch\README.md

- Preview: <h1 align="center">Picomatch</h1> <p align="center"> <a href="https://npmjs.org/package/picomatch"> <img src="https://img.shields.io/npm/v/picomatch.svg" alt="version"> </a> <a href="https://github.com/micromatch/picomatch/actions?workflow=Tests"> <img src="https://github.com/micromatch/picomatch/workflows/Tests/badge.svg" alt="test status"> </a> <a href="https://coveralls.io/github/micromatch/pic
- Lines: 711
- Characters: 26674

---

# Source: .\node_modules\readdirp\README.md

- Preview: # readdirp [![Weekly downloads](https://img.shields.io/npm/dw/readdirp.svg)](https://github.com/paulmillr/readdirp) Recursive version of [fs.readdir](https://nodejs.org/api/fs.html#fs_fs_readdir_path_options_callback). Exposes a **stream API** and a **promise API**. ```sh npm install readdirp ``` ```javascript const readdirp = require('readdirp'); // Use streams to achieve small RAM & CPU footprin
- Lines: 125
- Characters: 6812

---

# Source: .\node_modules\read-pkg\readme.md

- Preview: # read-pkg [![Build Status](https://travis-ci.org/sindresorhus/read-pkg.svg?branch=master)](https://travis-ci.org/sindresorhus/read-pkg) > Read a package.json file ## Why - [Gracefully handles filesystem issues](https://github.com/isaacs/node-graceful-fs) - [Strips UTF-8 BOM](https://github.com/sindresorhus/strip-bom) - [Throws more helpful JSON errors](https://github.com/sindresorhus/parse-json)
- Lines: 82
- Characters: 1607

---

# Source: .\node_modules\recast\README.md

- Preview: # recast, _v_. ![CI](https://github.com/benjamn/recast/workflows/CI/badge.svg) [![Join the chat at https://gitter.im/benjamn/recast](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/benjamn/recast?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) 1. to give (a metal object) a different form by melting it down and reshaping it. 1. to form, fashion, or arrange ag
- Lines: 224
- Characters: 9927

---

# Source: .\node_modules\redent\node_modules\strip-indent\readme.md

- Preview: # strip-indent [![Build Status](https://travis-ci.org/sindresorhus/strip-indent.svg?branch=master)](https://travis-ci.org/sindresorhus/strip-indent) > Strip leading whitespace from each line in a string The line with the least number of leading whitespace, ignoring empty lines, determines the number to remove. Useful for removing redundant indentation. ## Install ``` $ npm install strip-indent ```
- Lines: 47
- Characters: 798

---

# Source: .\node_modules\redent\readme.md

- Preview: # redent [![Build Status](https://travis-ci.org/sindresorhus/redent.svg?branch=master)](https://travis-ci.org/sindresorhus/redent) > [Strip redundant indentation](https://github.com/sindresorhus/strip-indent) and [indent the string](https://github.com/sindresorhus/indent-string) ## Install ``` $ npm install redent ``` ## Usage ```js const redent = require('redent'); redent('\n  foo\n    bar\n', 1)
- Lines: 64
- Characters: 855

---

# Source: .\node_modules\redux\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) 2015-present Dan Abramov Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to pe
- Lines: 24
- Characters: 1065

---

# Source: .\node_modules\redux\README.md

- Preview: # <a href='https://redux.js.org'><img src='https://camo.githubusercontent.com/f28b5bc7822f1b7bb28a96d8d09e7d79169248fc/687474703a2f2f692e696d6775722e636f6d2f4a65567164514d2e706e67' height='60' alt='Redux Logo' aria-label='redux.js.org' /></a> Redux is a predictable state container for JavaScript apps. It helps you write applications that behave consistently, run in different environments (client,
- Lines: 160
- Characters: 7884

---

# Source: .\node_modules\reflect.getprototypeof\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.10](https://github.com/es-shims/Reflect.getPrototypeOf/compare/v1.0.9...v1.0.10) - 2025-01-02 ### Commits - [Refactor] use `es-object-atoms` a
- Lines: 118
- Characters: 10143

---

# Source: .\node_modules\reflect.getprototypeof\README.md

- Preview: # reflect.getprototypeof <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-u
- Lines: 80
- Characters: 3675

---

# Source: .\node_modules\refractor\node_modules\@types\hast\README.md

- Preview: # Installation > `npm install --save @types/hast` # Summary This package contains type definitions for hast (https://github.com/syntax-tree/hast). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/hast/v2. ### Additional Details * Last updated: Tue, 30 Jan 2024 21:35:45 GMT * Dependencies: [@types/unist](https://npmjs.com/package/@types/unist)
- Lines: 18
- Characters: 591

---

# Source: .\node_modules\refractor\node_modules\@types\unist\README.md

- Preview: # Installation > `npm install --save @types/unist` # Summary This package contains type definitions for unist (https://github.com/syntax-tree/unist). # Details Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/unist/v2. ## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/unist/v2/index.d.ts) ````ts /** * Syntactic units i
- Lines: 125
- Characters: 3157

---

# Source: .\node_modules\refractor\node_modules\character-entities\readme.md

- Preview: # character-entities [![Build][build-badge]][build] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] HTML character entity information. ## Install [npm][]: ```sh npm install character-entities ``` ## Use ```js var characterEntities = require('character-entities') console.log(characterEntities.AElig) // => 'Æ' console.log(characterEntities.aelig) // => 'æ' console.log(characte
- Lines: 75
- Characters: 1660

---

# Source: .\node_modules\refractor\node_modules\character-entities-legacy\readme.md

- Preview: # character-entities-legacy [![Build][build-badge]][build] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] HTML legacy character entity information: for legacy reasons some character entities are not required to have a trailing semicolon: `&copy` is perfectly okay for `©`. ## Install [npm][]: ```sh npm install character-entities-legacy ``` ## Use ```js var characterEntitiesL
- Lines: 77
- Characters: 1868

---

# Source: .\node_modules\refractor\node_modules\character-reference-invalid\readme.md

- Preview: # character-reference-invalid [![Build][build-badge]][build] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] HTML invalid numeric character reference information. ## Install [npm][]: ```sh npm install character-reference-invalid ``` ## Use ```js var characterReferenceInvalid = require('character-reference-invalid') console.log(characterReferenceInvalid[0x80]) // => '€' conso
- Lines: 77
- Characters: 1901

---

# Source: .\node_modules\refractor\node_modules\comma-separated-tokens\readme.md

- Preview: # comma-separated-tokens [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Parse and stringify comma-separated tokens according to the [spec][]. ## Install [npm][]: ```sh npm install comma-separated-tokens ``` ## Use ```js var commaSeparated = require('comma-separated-tokens') commaSeparated.parse(' a ,b,,d
- Lines: 90
- Characters: 2236

---

# Source: .\node_modules\refractor\node_modules\hastscript\readme.md

- Preview: # hastscript [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [**hast**][hast] utility to create [*trees*][tree] in HTML or SVG. Similar to [`hyperscript`][hyperscript], [`virtual-dom/h`][virtual-h
- Lines: 331
- Characters: 7767

---

# Source: .\node_modules\refractor\node_modules\hast-util-parse-selector\readme.md

- Preview: # hast-util-parse-selector [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [**hast**][hast] utility to create an [*element*][element] from a simple CSS selector. ## Install [npm][]: ```sh npm inst
- Lines: 139
- Characters: 3421

---

# Source: .\node_modules\refractor\node_modules\is-alphabetical\readme.md

- Preview: # is-alphabetical [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Check if a character is alphabetical. ## Install [npm][]: ```sh npm install is-alphabetical ``` ## Use ```js var alphabetical = require('is-alphabetical') alphabetical('a') // => true alphabetical('B') // => true alphabetical('0') // => fal
- Lines: 73
- Characters: 1616

---

# Source: .\node_modules\refractor\node_modules\is-alphanumerical\readme.md

- Preview: # is-alphanumerical [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Check if a character is alphanumerical (`[a-zA-Z0-9]`). ## Install [npm][]: ```sh npm install is-alphanumerical ``` ## Use ```js var alphanumerical = require('is-alphanumerical') alphanumerical('a') // => true alphanumerical('Z') // => tr
- Lines: 74
- Characters: 1691

---

# Source: .\node_modules\refractor\node_modules\is-decimal\readme.md

- Preview: # is-decimal [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Check if a character is decimal. ## Install [npm][]: ```sh npm install is-decimal ``` ## Use ```js var decimal = require('is-decimal') decimal('0') // => true decimal('9') // => true decimal('a') // => false decimal('💩') // => false ``` ## API
- Lines: 72
- Characters: 1461

---

# Source: .\node_modules\refractor\node_modules\is-hexadecimal\readme.md

- Preview: # is-hexadecimal [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Check if a character is hexadecimal. ## Install [npm][]: ```sh npm install is-hexadecimal ``` ## Use ```js var hexadecimal = require('is-hexadecimal') hexadecimal('a') // => true hexadecimal('0') // => true hexadecimal('G') // => false hexad
- Lines: 73
- Characters: 1597

---

# Source: .\node_modules\refractor\node_modules\parse-entities\readme.md

- Preview: # parse-entities [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Parse HTML character references: fast, spec-compliant, positional information. ## Install [npm][]: ```sh npm install parse-entities ``` ## Use ```js var decode = require('parse-entities') decode('alpha &amp bravo') // => alpha & bravo decode
- Lines: 220
- Characters: 4972

---

# Source: .\node_modules\refractor\node_modules\prismjs\CHANGELOG.md

- Preview: # Prism Changelog ## 1.27.0 (2022-02-17) ### New components * __UO Razor Script__ (#3309) [`3f8cc5a0`](https://github.com/PrismJS/prism/commit/3f8cc5a0) ### Updated components * __AutoIt__ * Allow hyphen in directive (#3308) [`bcb2e2c8`](https://github.com/PrismJS/prism/commit/bcb2e2c8) * __EditorConfig__ * Change alias of `section` from `keyword` to `selector` (#3305) [`e46501b9`](https://github.
- Lines: 2925
- Characters: 254412

---

# Source: .\node_modules\refractor\node_modules\prismjs\README.md

- Preview: # [Prism](https://prismjs.com/) [![Build Status](https://github.com/PrismJS/prism/workflows/CI/badge.svg)](https://github.com/PrismJS/prism/actions) [![npm](https://img.shields.io/npm/dw/prismjs.svg)](https://www.npmjs.com/package/prismjs) Prism is a lightweight, robust, and elegant syntax highlighting library. It's a spin-off project from [Dabblet](https://dabblet.com/). You can learn more on [pr
- Lines: 43
- Characters: 3225

---

# Source: .\node_modules\refractor\node_modules\property-information\readme.md

- Preview: # property-information [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Info for properties and attributes on the web-platform (HTML, SVG, ARIA, XML, XMLNS, XLink). This package follows a sensible naming scheme as defined by [hast][]. ## Install [npm][]: ```sh npm install property-information ``` ## Conten
- Lines: 946
- Characters: 59651

---

# Source: .\node_modules\refractor\node_modules\space-separated-tokens\readme.md

- Preview: # space-separated-tokens [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Parse and stringify space-separated tokens according to the [spec][]. ## Install [npm][]: ```sh npm install space-separated-tokens ``` ## Usage ```js var spaceSeparated = require('space-separated-tokens') spaceSeparated.parse(' foo\t
- Lines: 97
- Characters: 2185

---

# Source: .\node_modules\refractor\readme.md

- Preview: # refractor [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Lightweight, robust, elegant virtual syntax highlighting using [Prism][]. Useful for virtual DOMs and non-HTML things. Perfect for [React][], [VDOM][], and others. <!--count start--> `refractor` is built to work with all syntaxes supported by [Pr
- Lines: 678
- Characters: 31479

---

# Source: .\node_modules\regexp.prototype.flags\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.5.4](https://github.com/es-shims/RegExp.prototype.flags/compare/v1.5.3...v1.5.4) - 2025-01-02 ### Commits - [Refactor] use `get-proto` and `es-e
- Lines: 252
- Characters: 25493

---

# Source: .\node_modules\regexp.prototype.flags\README.md

- Preview: RegExp.prototype.flags <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![Build Status][travis-svg]][travis-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] [![browser support][testling-svg]][testling-ur
- Lines: 58
- Characters: 2472

---

# Source: .\node_modules\regexp-to-ast\CHANGELOG.md

- Preview: ## 0.5.0 (11-12-2019) -   [Added location to AST](https://github.com/bd82/regexp-to-ast/pull/28) -   Thanks to [@ConradIrwin](https://github.com/ConradIrwin) :thumbsup ## 0.4.0 (3-16-2019) -   [Huge (x75) performance improvement](https://github.com/bd82/regexp-to-ast/pull/18). -   Thanks to [@morwen](https://github.com/morwen) :thumbsup ## 0.3.5 (7-12-2018) -   A Set AST can now contain ranges of
- Lines: 71
- Characters: 1603

---

# Source: .\node_modules\regexp-to-ast\README.md

- Preview: [![npm version](https://badge.fury.io/js/regexp-to-ast.svg)](https://badge.fury.io/js/regexp-to-ast) [![CircleCI](https://circleci.com/gh/bd82/regexp-to-ast.svg?style=svg)](https://circleci.com/gh/bd82/regexp-to-ast) [![Coverage Status](https://coveralls.io/repos/github/bd82/regexp-to-ast/badge.svg?branch=master)](https://coveralls.io/github/bd82/regexp-to-ast?branch=master) [![Greenkeeper badge](
- Lines: 104
- Characters: 2928

---

# Source: .\node_modules\rehype-format\readme.md

- Preview: # rehype-format [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] **[rehype][]** plugin to format HTML. ## Contents * [What is this?](#what-is-this) * [When should I use this?](#when-should-i-use-th
- Lines: 377
- Characters: 9536

---

# Source: .\node_modules\rehype-minify-whitespace\readme.md

- Preview: <!--This file is generated--> # rehype-minify-whitespace [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][funding-sponsors-badge]][funding] [![Backers][funding-backers-badge]][funding] [![Chat][chat-badge]][chat] **[rehype][]** plugin to minify whitespace between elements. ## Contents * [What
- Lines: 246
- Characters: 5470

---

# Source: .\node_modules\rehype-parse\readme.md

- Preview: # rehype-parse [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] **[rehype][]** plugin to add support for parsing from HTML. ## Contents * [What is this?](#what-is-this) * [When should I use this?](
- Lines: 589
- Characters: 16885

---

# Source: .\node_modules\rehype-raw\readme.md

- Preview: # rehype-raw [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] **[rehype][]** plugin to parse the tree (and raw nodes) again, keeping positional info okay. ## Contents *   [What is this?](#what-is-t
- Lines: 283
- Characters: 7533

---

# Source: .\node_modules\rehype-remark\readme.md

- Preview: # rehype-remark [![Build][badge-build-image]][badge-build-url] [![Coverage][badge-coverage-image]][badge-coverage-url] [![Downloads][badge-downloads-image]][badge-downloads-url] [![Size][badge-size-image]][badge-size-url] **[rehype][github-rehype]** plugin that turns HTML into markdown to support **[remark][github-remark]**. ## Contents * [What is this?](#what-is-this) * [When should I use this?](
- Lines: 420
- Characters: 11561

---

# Source: .\node_modules\rehype-sanitize\readme.md

- Preview: # rehype-sanitize [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] **[rehype][]** plugin to sanitize HTML. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-
- Lines: 574
- Characters: 15891

---

# Source: .\node_modules\rehype-stringify\readme.md

- Preview: # rehype-stringify [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] **[rehype][]** plugin to add support for serializing to HTML. ## Contents * [What is this?](#what-is-this) * [When should I use t
- Lines: 445
- Characters: 14925

---

# Source: .\node_modules\remark-gfm\readme.md

- Preview: # remark-gfm [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] **[remark][]** plugin to support [GFM][] (autolink literals, footnotes, strikethrough, tables, tasklists). ## Contents * [What is this?
- Lines: 521
- Characters: 14921

---

# Source: .\node_modules\remark-parse\readme.md

- Preview: # remark-parse [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] **[remark][]** plugin to add support for parsing from markdown. ## Contents *   [What is this?](#what-is-this) *   [When should I use
- Lines: 430
- Characters: 12252

---

# Source: .\node_modules\remark-rehype\readme.md

- Preview: # remark-rehype [![Build][badge-build-image]][badge-build-url] [![Coverage][badge-coverage-image]][badge-coverage-url] [![Downloads][badge-downloads-image]][badge-downloads-url] [![Size][badge-size-image]][badge-size-url] **[remark][github-remark]** plugin that turns markdown into HTML to support **[rehype][github-rehype]**. ## Contents * [What is this?](#what-is-this) * [When should I use this?](
- Lines: 805
- Characters: 24927

---

# Source: .\node_modules\remark-stringify\readme.md

- Preview: # remark-stringify [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] **[remark][]** plugin to add support for serializing to markdown. ## Contents *   [What is this?](#what-is-this) *   [When should
- Lines: 410
- Characters: 13096

---

# Source: .\node_modules\remeda\README.md

- Preview: # Remeda The first "data-first" and "data-last" utility library designed especially for TypeScript. [![GitHub License](https://img.shields.io/github/license/remeda/remeda?style=flat-square)](https://github.com/remeda/remeda?tab=MIT-1-ov-file#readme) ![GitHub top language](https://img.shields.io/github/languages/top/remeda/remeda?logo=typescript&style=flat-square) [![NPM](https://img.shields.io/npm
- Lines: 82
- Characters: 3224

---

# Source: .\node_modules\resend\readme.md

- Preview: ![nodejs-og](https://github.com/user-attachments/assets/7bc8f7c1-1877-4ddd-89f9-4f8d9bc32ed5) <p align="center"> <a href="https://resend.com/docs/send-with-nodejs">Quickstart Docs</a> </p> <p align="center"> Framework guides </p> <p align="center"> <a - <a href="https://resend.com/docs/send-with-nextjs">Next.js</a> - <a href="https://resend.com/docs/send-with-remix">Remix</a> - <a href="https://re
- Lines: 123
- Characters: 2831

---

# Source: .\node_modules\resize-observer-polyfill\README.md

- Preview: ResizeObserver Polyfill ============= [![Build Status][travis-image]][travis-url] A polyfill for the Resize Observer API. Implementation is based on the MutationObserver and uses Mutation Events as a fall back if the first one is not supported, so there will be no polling unless DOM changes. Doesn't modify observed elements. Handles CSS transitions/animations and can possibly observe changes cause
- Lines: 115
- Characters: 5353

---

# Source: .\node_modules\resolve\SECURITY.md

- Preview: # Security Please email [@ljharb](https://github.com/ljharb) or see https://tidelift.com/security if you have a potential security vulnerability to report.
- Lines: 6
- Characters: 154

---

# Source: .\node_modules\resolve-from\readme.md

- Preview: # resolve-from [![Build Status](https://travis-ci.org/sindresorhus/resolve-from.svg?branch=master)](https://travis-ci.org/sindresorhus/resolve-from) > Resolve the path of a module like [`require.resolve()`](https://nodejs.org/api/globals.html#globals_require_resolve) but from a given path ## Install ``` $ npm install resolve-from ``` ## Usage ```js const resolveFrom = require('resolve-from'); // T
- Lines: 75
- Characters: 1765

---

# Source: .\node_modules\resolve-pkg-maps\README.md

- Preview: # resolve-pkg-maps Utils to resolve `package.json` subpath & conditional [`exports`](https://nodejs.org/api/packages.html#exports)/[`imports`](https://nodejs.org/api/packages.html#imports) in resolvers. Implements the [ESM resolution algorithm](https://nodejs.org/api/esm.html#resolver-algorithm-specification). Tested [against Node.js](/tests/) for accuracy. <sub>Support this project by ⭐️ starring
- Lines: 217
- Characters: 7543

---

# Source: .\node_modules\reusify\README.md

- Preview: # reusify [![npm version][npm-badge]][npm-url] Reuse your objects and functions for maximum speed. This technique will make any function run ~10% faster. You call your functions a lot, and it adds up quickly in hot code paths. ``` $ node benchmarks/createNoCodeFunction.js Total time 53133 Total iterations 100000000 Iteration/s 1882069.5236482036 $ node benchmarks/reuseNoCodeFunction.js Total time
- Lines: 142
- Characters: 3103

---

# Source: .\node_modules\reusify\SECURITY.md

- Preview: # Security Policy ## Supported Versions Use this section to tell people about which versions of your project are currently being supported with security updates. | Version | Supported          | | ------- | ------------------ | | 1.x     | :white_check_mark: | | < 1.0   | :x:                | ## Reporting a Vulnerability Please report all vulnerabilities at [https://github.com/mcollina/fastq/secur
- Lines: 18
- Characters: 440

---

# Source: .\node_modules\rollup\LICENSE.md

- Preview: # Rollup core license Rollup is released under the MIT license: The MIT License (MIT) Copyright (c) 2017 [these people](https://github.com/rollup/rollup/graphs/contributors) Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the r
- Lines: 682
- Characters: 34537

---

# Source: .\node_modules\rollup\README.md

- Preview: <p align="center"> <a href="https://rollupjs.org/"><img src="https://rollupjs.org/rollup-logo.svg" width="150" /></a> </p> <p align="center"> <a href="https://www.npmjs.com/package/rollup"> <img src="https://img.shields.io/npm/v/rollup.svg" alt="npm version" > </a> <a href="https://nodejs.org/en/about/previous-releases"> <img src="https://img.shields.io/node/v/rollup.svg" alt="node compatibility">
- Lines: 137
- Characters: 9869

---

# Source: .\node_modules\rope-sequence\README.md

- Preview: # rope-sequence This module implements a single data type, `RopeSequence`, which is a persistent sequence type implemented as a loosely-balanced [rope](https://www.cs.rit.edu/usr/local/pub/jeh/courses/QUARTERS/FP/Labs/CedarRope/rope-paper.pdf). It supports appending, prepending, and slicing without doing a full copy. Random access is somewhat more expensive than in an array (logarithmic, with some
- Lines: 66
- Characters: 1943

---

# Source: .\node_modules\router\HISTORY.md

- Preview: 2.2.0 / 2025-03-26 ================== * Remove `setImmediate` support check * Restore `debug` dependency 2.1.0 / 2025-02-10 ================== * Updated `engines` field to Node@18 or higher * Remove `Object.setPrototypeOf` polyfill * Use `Array.flat` instead of `array-flatten` package * Replace `methods` dependency with standard library * deps: parseurl@^1.3.3 * deps: is-promise@^4.0.0 * Replace `
- Lines: 231
- Characters: 6343

---

# Source: .\node_modules\router\node_modules\path-to-regexp\Readme.md

- Preview: # Path-to-RegExp > Turn a path string such as `/user/:name` into a regular expression. [![NPM version][npm-image]][npm-url] [![NPM downloads][downloads-image]][downloads-url] [![Build status][build-image]][build-url] [![Build coverage][coverage-image]][coverage-url] [![License][license-image]][license-url] ## Installation ``` npm install path-to-regexp --save ``` ## Usage ```js const { match, path
- Lines: 227
- Characters: 7625

---

# Source: .\node_modules\router\README.md

- Preview: # router [![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url] [![Node.js Version][node-version-image]][node-version-url] [![Build Status][ci-image]][ci-url] [![Test Coverage][coveralls-image]][coveralls-url] Simple middleware-style router ## Installation This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmjs.com/
- Lines: 419
- Characters: 12240

---

# Source: .\node_modules\run-parallel\README.md

- Preview: # run-parallel [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][downloads-url] [![javascript style guide][standard-image]][standard-url] [travis-image]: https://img.shields.io/travis/feross/run-parallel/master.svg [travis-url]: https://travis-ci.org/feross/run-parallel [npm-image]: https://img.shields.io/npm/v/run-parallel.svg [npm-url]: https://np
- Lines: 88
- Characters: 3072

---

# Source: .\node_modules\safe-array-concat\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.3](https://github.com/ljharb/safe-array-concat/compare/v1.1.2...v1.1.3) - 2024-12-11 ### Commits - [Dev Deps] update `@arethetypeswrong/cli`,
- Lines: 72
- Characters: 5237

---

# Source: .\node_modules\safe-array-concat\README.md

- Preview: # safe-array-concat <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] `Array.prototype.concat`, but made safe by ignoring Symbol.isConcatSpreadable ## Getting started ``
- Lines: 56
- Characters: 2532

---

# Source: .\node_modules\safe-buffer\README.md

- Preview: # safe-buffer [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][downloads-url] [![javascript style guide][standard-image]][standard-url] [travis-image]: https://img.shields.io/travis/feross/safe-buffer/master.svg [travis-url]: https://travis-ci.org/feross/safe-buffer [npm-image]: https://img.shields.io/npm/v/safe-buffer.svg [npm-url]: https://npmjs.
- Lines: 587
- Characters: 18968

---

# Source: .\node_modules\safe-push-apply\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## v1.0.0 - 2024-12-28 ### Commits - Initial implementation, tests, readme, types [`6e85f82`](https://github.com/ljharb/safe-push-apply/commit/6e85f82b
- Lines: 18
- Characters: 795

---

# Source: .\node_modules\safe-push-apply\README.md

- Preview: # safe-push-apply <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Push an array of items into an array, while being robust against prototype modification. ## Getting s
- Lines: 62
- Characters: 2025

---

# Source: .\node_modules\safer-buffer\Porting-Buffer.md

- Preview: # Porting to the Buffer.from/Buffer.alloc API <a id="overview"></a> ## Overview - [Variant 1: Drop support for Node.js ≤ 4.4.x and 5.0.0 — 5.9.x.](#variant-1) (*recommended*) - [Variant 2: Use a polyfill](#variant-2) - [Variant 3: manual detection, with safeguards](#variant-3) ### Finding problematic bits of code using grep Just run `grep -nrE '[^a-zA-Z](Slow)?Buffer\s*\(' --exclude-dir node_modul
- Lines: 271
- Characters: 12484

---

# Source: .\node_modules\safer-buffer\Readme.md

- Preview: # safer-buffer [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url] [![javascript style guide][standard-image]][standard-url] [![Security Responsible Disclosure][secuirty-image]][secuirty-url] [travis-image]: https://travis-ci.org/ChALkeR/safer-buffer.svg?branch=master [travis-url]: https://travis-ci.org/ChALkeR/safer-buffer [npm-image]: https://img.shields.io/npm/v/safer-buffer.svg
- Lines: 159
- Characters: 8082

---

# Source: .\node_modules\safe-regex-test\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.0](https://github.com/ljharb/safe-regex-test/compare/v1.0.3...v1.1.0) - 2024-12-12 ### Commits - [actions] split out node 10-20, and 20+ [`b4a
- Lines: 58
- Characters: 4204

---

# Source: .\node_modules\safe-regex-test\README.md

- Preview: # safe-regex-test <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Give a regex, get a robust predicate function that tests it against a string. This will work even if
- Lines: 49
- Characters: 1782

---

# Source: .\node_modules\saxes\README.md

- Preview: # saxes A sax-style non-validating parser for XML. Saxes is a fork of [sax](https://github.com/isaacs/sax-js) 1.2.4. All mentions of sax in this project's documentation are references to sax 1.2.4. Designed with [node](http://nodejs.org/) in mind, but should work fine in the browser or other CommonJS implementations. Saxes does not support Node versions older than 10. ## Notable Differences from S
- Lines: 326
- Characters: 14795

---

# Source: .\node_modules\scheduler\README.md

- Preview: # `scheduler` This is a package for cooperative scheduling in a browser environment. It is currently used internally by React, but we plan to make it more generic. The public API for this package is not yet finalized. ### Thanks The React team thanks [Anton Podviaznikov](https://podviaznikov.com/) for donating the `scheduler` package name.
- Lines: 12
- Characters: 337

---

# Source: .\node_modules\selderee\CHANGELOG.md

- Preview: # Changelog ## Version 0.11.0 * Bump `parseley` dependency to version 0.12.0 ([changelog](https://github.com/mxxii/parseley/blob/main/CHANGELOG.md)). Escape sequences in selectors. ## Version 0.10.0 * Targeting Node.js version 14 and ES2020; * Bump dependencies. ## Version 0.9.0 * Bump dependencies - fix "./core module cannot be found" issue. ## Version 0.8.1 * Bump `parseley` dependency to versio
- Lines: 38
- Characters: 1060

---

# Source: .\node_modules\selderee\README.md

- Preview: # selderee ![lint status badge](https://github.com/mxxii/selderee/workflows/lint/badge.svg) ![test status badge](https://github.com/mxxii/selderee/workflows/test/badge.svg) [![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/mxxii/selderee/blob/main/LICENSE) [![npm](https://img.shields.io/npm/dw/selderee?color=informational&logo=npm)](https://www.npmjs.com/pack
- Lines: 154
- Characters: 5497

---

# Source: .\node_modules\semver\README.md

- Preview: semver(1) -- The semantic versioner for npm =========================================== ## Install ```bash npm install semver ```` ## Usage As a node module: ```js const semver = require('semver') semver.valid('1.2.3') // '1.2.3' semver.valid('a.b.c') // null semver.clean('  =v1.2.3   ') // '1.2.3' semver.satisfies('1.2.3', '1.x || >=2.5.0 || 5.0.0 - 7.2.3') // true semver.gt('1.2.3', '9.8.7') //
- Lines: 446
- Characters: 16531

---

# Source: .\node_modules\send\HISTORY.md

- Preview: 1.2.0 / 2025-03-27 ================== * deps: * `mime-types@^3.0.1` * `fresh@^2.0.0` * removed `destroy` * remove `getHeaderNames()` polyfill and refactor `clearHeaders()` 1.1.0 / 2024-09-10 ================== * Changes from 0.19.0 1.0.0 / 2024-07-25 ================== * Drop support for Node.js <18.0 * `statuses@^2.0.1` * `range-parser@^1.2.1` * `on-finished@^2.4.1` * `ms@^2.1.3` * `mime-types@^2
- Lines: 583
- Characters: 14221

---

# Source: .\node_modules\send\README.md

- Preview: # send [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![CI][github-actions-ci-image]][github-actions-ci-url] [![Test Coverage][coveralls-image]][coveralls-url] Send is a library for streaming files from the file system as a http response supporting partial responses (Ranges), conditional-GET negotiation (If-Match, If-Unmodified-Since, If-None-Match,
- Lines: 320
- Characters: 8745

---

# Source: .\node_modules\serve-static\HISTORY.md

- Preview: 2.2.0 / 2025-03-27 ================== * deps: send@^1.2.0 2.1.0 / 2024-09-10 =================== * Changes from 1.16.0 * deps: send@^1.2.0 2.0.0 / 2024-08-23 ================== * deps: * parseurl@^1.3.3 * excape-html@^1.0.3 * encodeurl@^2.0.0 * supertest@^6.3.4 * safe-buffer@^5.2.1 * nyc@^17.0.0 * mocha@^10.7.0 * Changes from 1.x 2.0.0-beta.2 / 2024-03-20 ========================= * deps: send@1.0
- Lines: 519
- Characters: 10915

---

# Source: .\node_modules\serve-static\README.md

- Preview: # serve-static [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![CI][github-actions-ci-image]][github-actions-ci-url] [![Test Coverage][coveralls-image]][coveralls-url] ## Install This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmjs.com/). Installation is done using the [`npm install` command](https
- Lines: 256
- Characters: 7197

---

# Source: .\node_modules\set-function-length\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.2.2](https://github.com/ljharb/set-function-length/compare/v1.2.1...v1.2.2) - 2024-03-09 ### Commits - [types] use shared config [`027032f`](htt
- Lines: 73
- Characters: 4804

---

# Source: .\node_modules\set-function-length\README.md

- Preview: # set-function-length <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Set a function’s length. Arguments: - `fn`: the function - `length`: the new length. Must be an i
- Lines: 59
- Characters: 2109

---

# Source: .\node_modules\set-function-name\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v2.0.2](https://github.com/jfsiii/set-function-name/compare/v2.0.1...v2.0.2) - 2024-02-19 ### Commits - [meta] add types [`ae747cd`](https://github
- Lines: 51
- Characters: 3765

---

# Source: .\node_modules\set-function-name\README.md

- Preview: # set-function-name <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Set a function’s name. Arguments: - `fn`: the function - `name`: the new name - `loose`: Optional.
- Lines: 64
- Characters: 2316

---

# Source: .\node_modules\set-getter\README.md

- Preview: # set-getter [![NPM version](https://img.shields.io/npm/v/set-getter.svg?style=flat)](https://www.npmjs.com/package/set-getter) [![NPM monthly downloads](https://img.shields.io/npm/dm/set-getter.svg?style=flat)](https://npmjs.org/package/set-getter) [![NPM total downloads](https://img.shields.io/npm/dt/set-getter.svg?style=flat)](https://npmjs.org/package/set-getter) [![Linux Build Status](https:/
- Lines: 122
- Characters: 3222

---

# Source: .\node_modules\set-proto\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## v1.0.0 - 2024-12-30 ### Commits - Initial implementation, tests, readme, types [`7036fc9`](https://github.com/ljharb/set-proto/commit/7036fc9128568b
- Lines: 18
- Characters: 771

---

# Source: .\node_modules\set-proto\README.md

- Preview: # set-proto <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Robustly set the [[Prototype]] of an object. Uses the best available method. ## Getting started ```sh npm i
- Lines: 55
- Characters: 1665

---

# Source: .\node_modules\setprototypeof\README.md

- Preview: # Polyfill for `Object.setPrototypeOf` [![NPM Version](https://img.shields.io/npm/v/setprototypeof.svg)](https://npmjs.org/package/setprototypeof) [![NPM Downloads](https://img.shields.io/npm/dm/setprototypeof.svg)](https://npmjs.org/package/setprototypeof) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/standard/standard) A simple cros
- Lines: 34
- Characters: 813

---

# Source: .\node_modules\shallow-clone\README.md

- Preview: # shallow-clone [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=W8YFZ425KND68) [![NPM version](https://img.shields.io/npm/v/shallow-clone.svg?style=flat)](https://www.npmjs.com/package/shallow-clone) [![NPM monthly downloads](https://img.shields.io/npm/dm/shallow-clone.svg?style=flat)](https://npmjs.org/package/
- Lines: 156
- Characters: 5061

---

# Source: .\node_modules\shebang-command\readme.md

- Preview: # shebang-command [![Build Status](https://travis-ci.org/kevva/shebang-command.svg?branch=master)](https://travis-ci.org/kevva/shebang-command) > Get the command from a shebang ## Install ``` $ npm install shebang-command ``` ## Usage ```js const shebangCommand = require('shebang-command'); shebangCommand('#!/usr/bin/env node'); //=> 'node' shebangCommand('#!/bin/bash'); //=> 'bash' ``` ## API ###
- Lines: 37
- Characters: 461

---

# Source: .\node_modules\shebang-regex\readme.md

- Preview: # shebang-regex [![Build Status](https://travis-ci.org/sindresorhus/shebang-regex.svg?branch=master)](https://travis-ci.org/sindresorhus/shebang-regex) > Regular expression for matching a [shebang](https://en.wikipedia.org/wiki/Shebang_(Unix)) line ## Install ``` $ npm install shebang-regex ``` ## Usage ```js const shebangRegex = require('shebang-regex'); const string = '#!/usr/bin/env node\nconso
- Lines: 36
- Characters: 615

---

# Source: .\node_modules\shell-quote\README.md

- Preview: # shell-quote <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Parse and quote shell commands. # example ## quote ``` js var quote = require('shell-quote/quote'); var s
- Lines: 164
- Characters: 3481

---

# Source: .\node_modules\shell-quote\security.md

- Preview: # Security Policy ## Supported Versions Only the latest major version is supported at any given time. ## Reporting a Vulnerability To report a security vulnerability, please use the [Tidelift security contact](https://tidelift.com/security). Tidelift will coordinate the fix and disclosure.
- Lines: 14
- Characters: 284

---

# Source: .\node_modules\side-channel\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.0](https://github.com/ljharb/side-channel/compare/v1.0.6...v1.1.0) - 2024-12-11 ### Commits - [Refactor] extract implementations to `side-chan
- Lines: 113
- Characters: 10340

---

# Source: .\node_modules\side-channel\README.md

- Preview: # side-channel <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Store information about any JS value in a side channel. Uses WeakMap if available. Warning: in an enviro
- Lines: 64
- Characters: 2091

---

# Source: .\node_modules\side-channel-list\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## v1.0.0 - 2024-12-10 ### Commits - Initial implementation, tests, readme, types [`5d6baee`](https://github.com/ljharb/side-channel-list/commit/5d6bae
- Lines: 18
- Characters: 803

---

# Source: .\node_modules\side-channel-list\README.md

- Preview: # side-channel-list <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Store information about any JS value in a side channel, using a linked list. Warning: this implemen
- Lines: 65
- Characters: 2223

---

# Source: .\node_modules\side-channel-map\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.1](https://github.com/ljharb/side-channel-map/compare/v1.0.0...v1.0.1) - 2024-12-10 ### Commits - [Deps] update `call-bound` [`6d05aaa`](https
- Lines: 25
- Characters: 1169

---

# Source: .\node_modules\side-channel-map\README.md

- Preview: # side-channel-map <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Store information about any JS value in a side channel, using a Map. Warning: if the `key` is an obj
- Lines: 65
- Characters: 2216

---

# Source: .\node_modules\side-channel-weakmap\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.2](https://github.com/ljharb/side-channel-weakmap/compare/v1.0.1...v1.0.2) - 2024-12-10 ### Commits - [types] fix generics ordering [`1b62e94`
- Lines: 31
- Characters: 1449

---

# Source: .\node_modules\side-channel-weakmap\README.md

- Preview: # side-channel-weakmap <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Store information about any JS value in a side channel. Uses WeakMap if available. Warning: this
- Lines: 65
- Characters: 2280

---

# Source: .\node_modules\siginfo\README.md

- Preview: # `siginfo` [![Build Status](https://travis-ci.org/emilbayes/siginfo.svg?branch=master)](https://travis-ci.org/eemilbayes/siginfo) > Utility module to print pretty messages on SIGINFO/SIGUSR1 `SIGINFO` on BSD / macOS and `SIGUSR1` on Linux, usually triggered by `Ctrl + T`, are by convention used to print information about a long running process internal state. Eg. `dd` will tell you how many block
- Lines: 50
- Characters: 1083

---

# Source: .\node_modules\signal-exit\README.md

- Preview: # signal-exit When you want to fire an event no matter how a process exits: - reaching the end of execution. - explicitly having `process.exit(code)` called. - having `process.kill(pid, sig)` called. - receiving a fatal signal from outside the process Use `signal-exit`. ```js // Hybrid module, either works import { onExit } from 'signal-exit' // or: // const { onExit } = require('signal-exit') onE
- Lines: 77
- Characters: 2352

---

# Source: .\node_modules\sisteransi\readme.md

- Preview: # sister ANSI [![Version](https://img.shields.io/npm/v/sisteransi.svg)](https://www.npmjs.com/package/sisteransi) [![Build Status](https://travis-ci.org/terkelg/sisteransi.svg?branch=master)](https://travis-ci.org/terkelg/sisteransi) [![Downloads](https://img.shields.io/npm/dm/sisteransi.svg)](https://www.npmjs.com/package/sisteransi) > Ansi escape codes faster than you can say "[Bam bam](https://
- Lines: 116
- Characters: 2473

---

# Source: .\node_modules\sonner\LICENSE.md

- Preview: MIT License Copyright (c) 2023 Emil Kowalski Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to
- Lines: 24
- Characters: 1049

---

# Source: .\node_modules\sonner\README.md

- Preview: https://github.com/vallezw/sonner/assets/50796600/59b95cb7-9068-4f3e-8469-0b35d9de5cf0 [Sonner](https://sonner.emilkowal.ski/) is an opinionated toast component for React. You can read more about why and how it was built [here](https://emilkowal.ski/ui/building-a-toast-component). ## Usage To start using the library, install it in your project: ```bash npm install sonner ``` Add `<Toaster />` to y
- Lines: 36
- Characters: 834

---

# Source: .\node_modules\source-map\CHANGELOG.md

- Preview: # Change Log ## 0.5.6 * Fix for regression when people were using numbers as names in source maps. See #236. ## 0.5.5 * Fix "regression" of unsupported, implementation behavior that half the world happens to have come to depend on. See #235. * Fix regression involving function hoisting in SpiderMonkey. See #233. ## 0.5.4 * Large performance improvements to source-map serialization. See #228 and #2
- Lines: 304
- Characters: 7583

---

# Source: .\node_modules\source-map\README.md

- Preview: # Source Map [![Build Status](https://travis-ci.org/mozilla/source-map.png?branch=master)](https://travis-ci.org/mozilla/source-map) [![NPM](https://nodei.co/npm/source-map.png?downloads=true&downloadRank=true)](https://www.npmjs.com/package/source-map) This is a library to generate and consume the source map format [described here][format]. [format]: https://docs.google.com/document/d/1U1RGAehQwR
- Lines: 745
- Characters: 23330

---

# Source: .\node_modules\source-map-js\README.md

- Preview: # Source Map JS [![NPM](https://nodei.co/npm/source-map-js.png?downloads=true&downloadRank=true)](https://www.npmjs.com/package/source-map-js) Difference between original [source-map](https://github.com/mozilla/source-map): > TL,DR: it's fork of original source-map@0.6, but with perfomance optimizations. This journey starts from [source-map@0.7.0](https://github.com/mozilla/source-map/blob/master/
- Lines: 768
- Characters: 25271

---

# Source: .\node_modules\space-separated-tokens\readme.md

- Preview: # space-separated-tokens [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Parse and stringify space-separated tokens. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`parse(value)`](#parsevalu
- Lines: 159
- Characters: 3747

---

# Source: .\node_modules\spdx-correct\README.md

- Preview: ## Usage ```javascript var correct = require('spdx-correct') var assert = require('assert') assert.strictEqual(correct('mit'), 'MIT') assert.strictEqual(correct('Apache 2'), 'Apache-2.0') assert(correct('No idea what license') === null) // disable upgrade option assert(correct('GPL-3.0'), 'GPL-3.0-or-later') assert(correct('GPL-3.0', { upgrade: false }), 'GPL-3.0') ``` ## Contributors spdx-correct
- Lines: 25
- Characters: 555

---

# Source: .\node_modules\spdx-exceptions\README.md

- Preview: The package exports an array of strings. Each string is an identifier for a license exception under the [Software Package Data Exchange (SPDX)][SPDX] software license metadata standard. [SPDX]: https://spdx.org ## Copyright and Licensing ### SPDX "SPDX" is a federally registered United States trademark of The Linux Foundation Corporation. From version 2.0 of the [SPDX] specification: > Copyright ©
- Lines: 39
- Characters: 1206

---

# Source: .\node_modules\spdx-expression-parse\README.md

- Preview: This package parses [SPDX license expression](https://spdx.org/spdx-specification-21-web-version#h.jxpfx0ykyb60) strings describing license terms, like [package.json license strings](https://docs.npmjs.com/files/package.json#license), into consistently structured ECMAScript objects.  The npm command-line interface depends on this package, as do many automatic license-audit tools. In a nutshell: ``
- Lines: 94
- Characters: 3735

---

# Source: .\node_modules\spdx-license-ids\README.md

- Preview: # spdx-license-ids [![npm version](https://img.shields.io/npm/v/spdx-license-ids.svg)](https://www.npmjs.com/package/spdx-license-ids) A list of [SPDX license](https://spdx.org/licenses/) identifiers ## Installation [Download JSON directly](https://raw.githubusercontent.com/jslicense/spdx-license-ids/main/index.json), or [use](https://docs.npmjs.com/cli/install) [npm](https://docs.npmjs.com/about-
- Lines: 54
- Characters: 1343

---

# Source: .\node_modules\ssf\README.md

- Preview: # [SheetJS SSF](http://sheetjs.com) ssf (SpreadSheet Format) is a pure JS library to format data using ECMA-376 spreadsheet format codes (used in popular spreadsheet software packages). This is the community version.  We also offer a pro version with additional features like international support as well as dedicated support. ## Installation With [npm](https://www.npmjs.org/package/ssf): ```bash $
- Lines: 122
- Characters: 4306

---

# Source: .\node_modules\stackback\README.md

- Preview: # stackback Returns an array of CallSite objects for a captured stacktrace. Useful if you want to access the frame for an error object. ## use ```javascript var stackback = require('stackback'); // error generated from somewhere var err = new Error('some sample error'); // stack is an array of CallSite objects var stack = stackback(err); ``` ## CallSite object From the [V8 StackTrace API](https://
- Lines: 44
- Characters: 1859

---

# Source: .\node_modules\standardwebhooks\README.md

- Preview: Typescript/Javascript library for Standard Webhooks # Example Verifying a webhook payload: ```javascript import { Webhook } from "standardwebhooks" const wh = new Webhook(base64_secret); wh.verify(webhook_payload, webhook_headers); ``` # Development ## Requirements - node - yarn ## Building the library ```sh yarn yarn build ``` ## Contributing Before opening a PR be sure to format your code! ```sh
- Lines: 44
- Characters: 444

---

# Source: .\node_modules\statuses\HISTORY.md

- Preview: 2.0.2 / 2025-06-06 ================== * Migrate to `String.prototype.slice()` 2.0.1 / 2021-01-03 ================== * Fix returning values from `Object.prototype` 2.0.0 / 2020-04-19 ================== * Drop support for Node.js 0.6 * Fix messaging casing of `418 I'm a Teapot` * Remove code 306 * Remove `status[code]` exports; use `status.message[code]` * Remove `status[msg]` exports; use `status.c
- Lines: 90
- Characters: 1541

---

# Source: .\node_modules\statuses\README.md

- Preview: # statuses [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Node.js Version][node-version-image]][node-version-url] [![Build Status][ci-image]][ci-url] [![Test Coverage][coveralls-image]][coveralls-url] [![OpenSSF Scorecard Badge][ossf-scorecard-badge]][ossf-scorecard-visualizer] HTTP status utility for node. This module provides a list of status cod
- Lines: 142
- Characters: 3727

---

# Source: .\node_modules\std-env\README.md

- Preview: # std-env [![npm](https://img.shields.io/npm/dm/std-env.svg?style=flat-square)](http://npmjs.com/package/std-env) [![npm](https://img.shields.io/npm/v/std-env.svg?style=flat-square)](http://npmjs.com/package/std-env) [![bundlephobia](https://img.shields.io/bundlephobia/min/std-env/latest.svg?style=flat-square)](https://bundlephobia.com/result?p=std-env) > Runtime agnostic JS utils ## Installation
- Lines: 121
- Characters: 2584

---

# Source: .\node_modules\stop-iteration-iterator\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.0](https://github.com/ljharb/stop-iteration-iterator/compare/v1.0.0...v1.1.0) - 2024-12-13 ### Commits - [New] add types [`f0ee985`](https://g
- Lines: 34
- Characters: 2541

---

# Source: .\node_modules\stop-iteration-iterator\README.md

- Preview: # stop-iteration-iterator <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Firefox 17-26 iterators throw a StopIteration object to indicate "done". This normalizes it.
- Lines: 45
- Characters: 1811

---

# Source: .\node_modules\storybook\node_modules\semver\README.md

- Preview: semver(1) -- The semantic versioner for npm =========================================== ## Install ```bash npm install semver ```` ## Usage As a node module: ```js const semver = require('semver') semver.valid('1.2.3') // '1.2.3' semver.valid('a.b.c') // null semver.clean('  =v1.2.3   ') // '1.2.3' semver.satisfies('1.2.3', '1.x || >=2.5.0 || 5.0.0 - 7.2.3') // true semver.gt('1.2.3', '9.8.7') //
- Lines: 667
- Characters: 24099

---

# Source: .\node_modules\storybook\README.md

- Preview: <p align="center"> <a href="https://storybook.js.org/?ref=readme"> <picture> <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/263385/199832481-bbbf5961-6a26-481d-8224-51258cce9b33.png"> <img src="https://user-images.githubusercontent.com/321738/63501763-88dbf600-c4cc-11e9-96cd-94adadc2fd72.png" alt="Storybook" width="400" /> </picture> </a> </p> <p ali
- Lines: 40
- Characters: 1565

---

# Source: .\node_modules\string.prototype.padend\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v3.1.6](https://github.com/es-shims/String.prototype.padEnd/compare/v3.1.5...v3.1.6) - 2024-03-21 ### Commits - [actions] use reusable workflows [`
- Lines: 101
- Characters: 5499

---

# Source: .\node_modules\string.prototype.padend\README.md

- Preview: # String.prototype.padEnd <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-
- Lines: 49
- Characters: 2287

---

# Source: .\node_modules\string.prototype.trim\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.2.10](https://github.com/es-shims/String.prototype.trim/compare/v1.2.9...v1.2.10) - 2024-12-11 ### Commits - [actions] split out node 10-20, and
- Lines: 205
- Characters: 21171

---

# Source: .\node_modules\string.prototype.trim\README.md

- Preview: # String.prototype.trim <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-ur
- Lines: 51
- Characters: 2306

---

# Source: .\node_modules\string.prototype.trimend\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.9](https://github.com/es-shims/String.prototype.trimEnd/compare/v1.0.8...v1.0.9) - 2024-12-11 ### Commits - [actions] split out node 10-20, an
- Lines: 131
- Characters: 11456

---

# Source: .\node_modules\string.prototype.trimend\README.md

- Preview: # String.prototype.trimEnd <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package
- Lines: 49
- Characters: 2312

---

# Source: .\node_modules\string.prototype.trimstart\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.8](https://github.com/es-shims/String.prototype.trimStart/compare/v1.0.7...v1.0.8) - 2024-03-21 ### Commits - [actions] use reusable workflows
- Lines: 121
- Characters: 10704

---

# Source: .\node_modules\string.prototype.trimstart\README.md

- Preview: # String.prototype.trimStart <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][packa
- Lines: 49
- Characters: 2358

---

# Source: .\node_modules\stringify-entities\readme.md

- Preview: # stringify-entities [![Build Status][build-badge]][build] [![Coverage Status][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Serialize (encode) HTML character references. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`stringifyEnti
- Lines: 236
- Characters: 6678

---

# Source: .\node_modules\string-width\readme.md

- Preview: # string-width > Get the visual width of a string - the number of columns required to display it Some Unicode characters are [fullwidth](https://en.wikipedia.org/wiki/Halfwidth_and_fullwidth_forms) and use double the normal width. [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) are stripped and doesn't affect the width. Useful to be able to measure the actual width of command-l
- Lines: 69
- Characters: 1659

---

# Source: .\node_modules\string-width-cjs\node_modules\emoji-regex\README.md

- Preview: # emoji-regex [![Build status](https://travis-ci.org/mathiasbynens/emoji-regex.svg?branch=master)](https://travis-ci.org/mathiasbynens/emoji-regex) _emoji-regex_ offers a regular expression to match all emoji symbols (including textual representations of emoji) as per the Unicode Standard. This repository contains a script that generates this regular expression based on [the data from Unicode v12]
- Lines: 76
- Characters: 2562

---

# Source: .\node_modules\string-width-cjs\node_modules\strip-ansi\readme.md

- Preview: # strip-ansi [![Build Status](https://travis-ci.org/chalk/strip-ansi.svg?branch=master)](https://travis-ci.org/chalk/strip-ansi) > Strip [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) from a string ## Install ``` $ npm install strip-ansi ``` ## Usage ```js const stripAnsi = require('strip-ansi'); stripAnsi('\u001B[4mUnicorn\u001B[0m'); //=> 'Unicorn' stripAnsi('\u001B]8;;https
- Lines: 49
- Characters: 1553

---

# Source: .\node_modules\string-width-cjs\readme.md

- Preview: # string-width > Get the visual width of a string - the number of columns required to display it Some Unicode characters are [fullwidth](https://en.wikipedia.org/wiki/Halfwidth_and_fullwidth_forms) and use double the normal width. [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) are stripped and doesn't affect the width. Useful to be able to measure the actual width of command-l
- Lines: 52
- Characters: 1339

---

# Source: .\node_modules\strip-ansi\node_modules\ansi-regex\readme.md

- Preview: # ansi-regex > Regular expression for matching [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) ## Install ```sh npm install ansi-regex ``` ## Usage ```js import ansiRegex from 'ansi-regex'; ansiRegex().test('\u001B[4mcake\u001B[0m'); //=> true ansiRegex().test('cake'); //=> false '\u001B[4mcake\u001B[0m'.match(ansiRegex()); //=> ['\u001B[4m', '\u001B[0m'] '\u001B[4mcake\u001B[0
- Lines: 69
- Characters: 2368

---

# Source: .\node_modules\strip-ansi\readme.md

- Preview: # strip-ansi > Strip [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) from a string > [!NOTE] > Node.js has this built-in now with [`stripVTControlCharacters`](https://nodejs.org/api/util.html#utilstripvtcontrolcharactersstr). The benefit of this package is consistent behavior across Node.js versions and faster improvements. The Node.js version is actually based on this package.
- Lines: 40
- Characters: 1186

---

# Source: .\node_modules\strip-ansi-cjs\readme.md

- Preview: # strip-ansi [![Build Status](https://travis-ci.org/chalk/strip-ansi.svg?branch=master)](https://travis-ci.org/chalk/strip-ansi) > Strip [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) from a string ## Install ``` $ npm install strip-ansi ``` ## Usage ```js const stripAnsi = require('strip-ansi'); stripAnsi('\u001B[4mUnicorn\u001B[0m'); //=> 'Unicorn' stripAnsi('\u001B]8;;https
- Lines: 49
- Characters: 1553

---

# Source: .\node_modules\strip-bom\readme.md

- Preview: # strip-bom [![Build Status](https://travis-ci.org/sindresorhus/strip-bom.svg?branch=master)](https://travis-ci.org/sindresorhus/strip-bom) > Strip UTF-8 [byte order mark](http://en.wikipedia.org/wiki/Byte_order_mark#UTF-8) (BOM) from a string From Wikipedia: > The Unicode Standard permits the BOM in UTF-8, but does not require nor recommend its use. Byte order has no meaning in UTF-8. ## Install
- Lines: 39
- Characters: 876

---

# Source: .\node_modules\strip-indent\readme.md

- Preview: # strip-indent > Strip leading whitespace from each line in a string The line with the least number of leading whitespace, ignoring empty lines, determines the number to remove. Useful for removing redundant indentation. ## Install ```sh npm install strip-indent ``` ## Usage ```js import stripIndent from 'strip-indent'; const string = '\tunicorn\n\t\tcake'; /* unicorn cake */ stripIndent(string);
- Lines: 67
- Characters: 1263

---

# Source: .\node_modules\strip-json-comments\readme.md

- Preview: # strip-json-comments [![Build Status](https://travis-ci.com/sindresorhus/strip-json-comments.svg?branch=master)](https://travis-ci.com/github/sindresorhus/strip-json-comments) > Strip comments from JSON. Lets you use comments in your JSON files! This is now possible: ```js { // Rainbows "unicorn": /* ❤ */ "cake" } ``` It will replace single-line comments `//` and multi-line comments `/**/` with w
- Lines: 80
- Characters: 1876

---

# Source: .\node_modules\style-to-js\README.md

- Preview: # style-to-js [![NPM](https://nodei.co/npm/style-to-js.png)](https://nodei.co/npm/style-to-js/) [![NPM version](https://badgen.net/npm/v/style-to-js)](https://www.npmjs.com/package/style-to-js) [![Bundlephobia minified + gzip](https://badgen.net/bundlephobia/minzip/style-to-js)](https://bundlephobia.com/package/style-to-js) [![build](https://github.com/remarkablemark/style-to-js/actions/workflows/
- Lines: 273
- Characters: 4457

---

# Source: .\node_modules\style-to-object\README.md

- Preview: # style-to-object [![NPM](https://nodei.co/npm/style-to-object.png)](https://nodei.co/npm/style-to-object/) [![NPM version](https://badgen.net/npm/v/style-to-object)](https://www.npmjs.com/package/style-to-object) [![Bundlephobia minified + gzip](https://badgen.net/bundlephobia/minzip/style-to-object)](https://bundlephobia.com/package/style-to-object) [![build](https://github.com/remarkablemark/st
- Lines: 191
- Characters: 3733

---

# Source: .\node_modules\sucrase\README.md

- Preview: # Sucrase [![Build Status](https://github.com/alangpierce/sucrase/workflows/All%20tests/badge.svg)](https://github.com/alangpierce/sucrase/actions) [![npm version](https://img.shields.io/npm/v/sucrase.svg)](https://www.npmjs.com/package/sucrase) [![Install Size](https://packagephobia.now.sh/badge?p=sucrase)](https://packagephobia.now.sh/result?p=sucrase) [![MIT License](https://img.shields.io/npm/
- Lines: 298
- Characters: 14494

---

# Source: .\node_modules\supports-color\readme.md

- Preview: # supports-color [![Build Status](https://travis-ci.org/chalk/supports-color.svg?branch=master)](https://travis-ci.org/chalk/supports-color) > Detect whether a terminal supports color ## Install ``` $ npm install supports-color ``` ## Usage ```js const supportsColor = require('supports-color'); if (supportsColor.stdout) { console.log('Terminal stdout supports color'); } if (supportsColor.stdout.ha
- Lines: 77
- Characters: 2212

---

# Source: .\node_modules\supports-preserve-symlinks-flag\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## v1.0.0 - 2022-01-02 ### Commits - Tests [`e2f59ad`](https://github.com/inspect-js/node-supports-preserve-symlinks-flag/commit/e2f59ad74e2ae0f5f4899f
- Lines: 25
- Characters: 1967

---

# Source: .\node_modules\supports-preserve-symlinks-flag\README.md

- Preview: # node-supports-preserve-symlinks-flag <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-p
- Lines: 45
- Characters: 2245

---

# Source: .\node_modules\symbol-tree\README.md

- Preview: symbol-tree =========== [![Travis CI Build Status](https://api.travis-ci.org/jsdom/js-symbol-tree.svg?branch=master)](https://travis-ci.org/jsdom/js-symbol-tree) [![Coverage Status](https://coveralls.io/repos/github/jsdom/js-symbol-tree/badge.svg?branch=master)](https://coveralls.io/github/jsdom/js-symbol-tree?branch=master) Turn any collection of objects into its own efficient tree or linked list
- Lines: 548
- Characters: 20379

---

# Source: .\node_modules\tabbable\CHANGELOG.md

- Preview: # Changelog ## 6.2.0 ### Minor Changes - 18a093f: Add new `getTabIndex()` API which enables Focus-trap to determine tab indexes in the same way as Tabbable when necessary (see [focus-trap#974](https://github.com/focus-trap/focus-trap/pull/974)). ## 6.1.2 ### Patch Changes - b39b217: Pin jsdom downstream dependency nwsapi to v2.2.2 while awaiting fix ([#982](https://github.com/focus-trap/tabbable/i
- Lines: 251
- Characters: 11389

---

# Source: .\node_modules\tabbable\README.md

- Preview: # tabbable [![CI](https://github.com/focus-trap/tabbable/workflows/CI/badge.svg?branch=master&event=push)](https://github.com/focus-trap/tabbable/actions?query=workflow:CI+branch:master) [![Codecov](https://img.shields.io/codecov/c/github/focus-trap/tabbable)](https://codecov.io/gh/focus-trap/tabbable) [![license](https://badgen.now.sh/badge/license/MIT)](./LICENSE) <!-- ALL-CONTRIBUTORS-BADGE:STA
- Lines: 290
- Characters: 25259

---

# Source: .\node_modules\tabbable\SECURITY.md

- Preview: # Security Policy ## Supported Versions The most recently published version is the only supported version. We simply do not have the maintainer capacity to support multiple versions. ## Security Releases The most recently published version is the only supported version. If there's a security issue in that version, then we will fix it by publishing a new version that addresses the vulnerability, bu
- Lines: 40
- Characters: 3599

---

# Source: .\node_modules\tailwindcss\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [Unreleased] - Nothing yet! ## [3.4.18] - 2024-10-01 ### Fixed - Improve support for raw `supports-[…]` queries in arbitrary values ([#13605](https
- Lines: 2727
- Characters: 143767

---

# Source: .\node_modules\tailwindcss\lib\postcss-plugins\nesting\README.md

- Preview: # tailwindcss/nesting This is a PostCSS plugin that wraps [postcss-nested](https://github.com/postcss/postcss-nested) or [postcss-nesting](https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-nesting) and acts as a compatibility layer to make sure your nesting plugin of choice properly understands Tailwind's custom syntax like `@apply` and `@screen`. Add it to your PostCSS configu
- Lines: 45
- Characters: 1686

---

# Source: .\node_modules\tailwindcss\lib\value-parser\README.md

- Preview: # postcss-value-parser (forked + inlined) This is a customized version of of [PostCSS Value Parser](https://github.com/TrySound/postcss-value-parser) to fix some bugs around parsing CSS functions.
- Lines: 6
- Characters: 195

---

# Source: .\node_modules\tailwindcss\README.md

- Preview: <p align="center"> <a href="https://tailwindcss.com" target="_blank"> <picture> <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tailwindlabs/tailwindcss/HEAD/.github/logo-dark.svg"> <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tailwindlabs/tailwindcss/HEAD/.github/logo-light.svg"> <img alt="Tailwind CSS" src="https:/
- Lines: 42
- Characters: 1965

---

# Source: .\node_modules\tailwindcss\src\postcss-plugins\nesting\README.md

- Preview: # tailwindcss/nesting This is a PostCSS plugin that wraps [postcss-nested](https://github.com/postcss/postcss-nested) or [postcss-nesting](https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-nesting) and acts as a compatibility layer to make sure your nesting plugin of choice properly understands Tailwind's custom syntax like `@apply` and `@screen`. Add it to your PostCSS configu
- Lines: 45
- Characters: 1686

---

# Source: .\node_modules\tailwindcss\src\value-parser\README.md

- Preview: # postcss-value-parser (forked + inlined) This is a customized version of of [PostCSS Value Parser](https://github.com/TrySound/postcss-value-parser) to fix some bugs around parsing CSS functions.
- Lines: 6
- Characters: 195

---

# Source: .\node_modules\tailwind-merge\LICENSE.md

- Preview: MIT License Copyright (c) 2021 Dany Castillo Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to
- Lines: 24
- Characters: 1049

---

# Source: .\node_modules\tailwind-merge\README.md

- Preview: <!-- This file is autogenerated. If you want to change this content, please do the changes in `./docs/README.md` instead. --> <div align="center"> <br /> <a href="https://github.com/dcastil/tailwind-merge"> <img src="https://github.com/dcastil/tailwind-merge/raw/v3.3.1/assets/logo.svg" alt="tailwind-merge" height="150px" /> </a> </div> # tailwind-merge Utility function to efficiently merge [Tailwi
- Lines: 41
- Characters: 1983

---

# Source: .\node_modules\tavily-mcp\node_modules\@modelcontextprotocol\sdk\README.md

- Preview: # MCP TypeScript SDK ![NPM Version](https://img.shields.io/npm/v/%40modelcontextprotocol%2Fsdk) TypeScript implementation of the Model Context Protocol (MCP), providing both client and server capabilities for integrating with LLM surfaces. ## Overview The Model Context Protocol allows applications to provide context for LLMs in a standardized way, separating the concerns of providing context from
- Lines: 113
- Characters: 2722

---

# Source: .\node_modules\tavily-mcp\README.md

- Preview: # ![Tavily Crawl Beta](./assets/Banner_NEW.png) ![GitHub Repo stars](https://img.shields.io/github/stars/tavily-ai/tavily-mcp?style=social) ![npm](https://img.shields.io/npm/dt/tavily-mcp) ![smithery badge](https://smithery.ai/badge/@tavily-ai/tavily-mcp) ![MCP demo](./assets/demo_new.gif) The Tavily MCP server provides: - search, extract, map, crawl tools - Real-time web search capabilities throu
- Lines: 365
- Characters: 11747

---

# Source: .\node_modules\thenify\History.md

- Preview: 3.3.1 / 2020-06-18 ================== **fixes** * [[`0d94a24`](http://github.com/thenables/thenify/commit/0d94a24eb933bc835d568f3009f4d269c4c4c17a)] - fix: remove eval (#30) (Yiyu He <<dead_horse@qq.com>>) 3.3.0 / 2017-05-19 ================== * feat: support options.multiArgs and options.withCallback (#27)
- Lines: 14
- Characters: 306

---

# Source: .\node_modules\thenify\README.md

- Preview: # thenify [![NPM version][npm-image]][npm-url] [![Build status][travis-image]][travis-url] [![Test coverage][coveralls-image]][coveralls-url] [![Dependency Status][david-image]][david-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] Promisify a callback-based function using [`any-promise`](https://github.com/kevinbeaty/any-promise). - Preserves function
- Lines: 123
- Characters: 3664

---

# Source: .\node_modules\thenify-all\History.md

- Preview: 1.6.0 / 2015-01-11 ================== * feat: exports thenify * support node 0.8+ 1.5.0 / 2015-01-09 ================== * feat: support backward compatible with callback
- Lines: 14
- Characters: 169

---

# Source: .\node_modules\thenify-all\README.md

- Preview: # thenify-all [![NPM version][npm-image]][npm-url] [![Build status][travis-image]][travis-url] [![Test coverage][coveralls-image]][coveralls-url] [![Dependency Status][david-image]][david-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![Gittip][gittip-image]][gittip-url] Promisifies all the selected functions in an object. ```js var thenifyAll = requi
- Lines: 69
- Characters: 2447

---

# Source: .\node_modules\tinybench\README.md

- Preview: _I'm transitioning to a full-time open source career. Your support would be greatly appreciated 🙌_ <a href="https://polar.sh/tinylibs/subscriptions"><picture><source media="(prefers-color-scheme: dark)" srcset="https://polar.sh/embed/tiers.svg?org=tinylibs&darkmode"><img alt="Subscription Tiers on Polar" src="https://polar.sh/embed/tiers.svg?org=tinylibs"></picture></a> # Tinybench 🔎 [![CI](http
- Lines: 425
- Characters: 12228

---

# Source: .\node_modules\tinyexec\README.md

- Preview: # tinyexec 📟 > A minimal package for executing commands This package was created to provide a minimal way of interacting with child processes without having to manually deal with streams, piping, etc. ## Installing ```sh $ npm i -S tinyexec ``` ## Usage A process can be spawned and awaited like so: ```ts import {x} from 'tinyexec'; const result = await x('ls', ['-l']); // result.stdout - the stdo
- Lines: 259
- Characters: 5338

---

# Source: .\node_modules\tinyglobby\README.md

- Preview: # tinyglobby [![npm version](https://img.shields.io/npm/v/tinyglobby.svg?maxAge=3600)](https://npmjs.com/package/tinyglobby) [![monthly downloads](https://img.shields.io/npm/dm/tinyglobby.svg?maxAge=3600)](https://npmjs.com/package/tinyglobby) A fast and minimal alternative to globby and fast-glob, meant to behave the same way. Both globby and fast-glob present some behavior no other globbing lib
- Lines: 28
- Characters: 907

---

# Source: .\node_modules\tiny-invariant\README.md

- Preview: # tiny-invariant 🔬💥 [![Build Status](https://travis-ci.org/alexreardon/tiny-invariant.svg?branch=master)](https://travis-ci.org/alexreardon/tiny-invariant) [![npm](https://img.shields.io/npm/v/tiny-invariant.svg)](https://www.npmjs.com/package/tiny-invariant) [![dependencies](https://david-dm.org/alexreardon/tiny-invariant.svg)](https://david-dm.org/alexreardon/tiny-invariant) ![types](https://i
- Lines: 112
- Characters: 4272

---

# Source: .\node_modules\tinypool\README.md

- Preview: # Tinypool - the node.js worker pool 🧵 > Piscina: A fast, efficient Node.js Worker Thread Pool implementation Tinypool is a fork of piscina. What we try to achieve in this library, is to eliminate some dependencies and features that our target users don't need (currently, our main user will be Vitest). Tinypool's install size (38KB) can then be smaller than Piscina's install size (6MB when Tinypo
- Lines: 23
- Characters: 1389

---

# Source: .\node_modules\tinyrainbow\README.md

- Preview: # tinyrainbow Output your colorful messages in the terminal or browser console that support ANSI colors (Chrome engines). A small (`~ 6 kB` unpacked) fork of [picocolors](https://www.npmjs.com/package/picocolors) with support for `exports` field. Supports only ESM. ## Installing ```bash # with npm $ npm install -D tinyrainbow # with pnpm $ pnpm add -D tinyrainbow # with yarn $ yarn add -D tinyrain
- Lines: 31
- Characters: 480

---

# Source: .\node_modules\tinyspy\README.md

- Preview: # tinyspy > minimal fork of nanospy, with more features 🕵🏻‍♂️ A `10KB` package for minimal and easy testing with no dependencies. This package was created for having a tiny spy library to use in `vitest`, but it can also be used in `jest` and other test environments. _In case you need more tiny libraries like tinypool or tinyspy, please consider submitting an [RFC](https://github.com/tinylibs/rf
- Lines: 14
- Characters: 477

---

# Source: .\node_modules\tippy.js\README.md

- Preview: <div align="center"> <img alt="Tippy.js logo" src="https://github.com/atomiks/tippyjs/raw/master/logo.png" height="117" /> </div> <div align="center"> <h1>Tippy.js</h1> <p>The complete tooltip, popover, dropdown, and menu solution for the web</p> <a href="https://www.npmjs.com/package/tippy.js"> <img src="https://img.shields.io/npm/dm/tippy.js.svg?color=%235599ff&style=for-the-badge" alt="npm Down
- Lines: 66
- Characters: 1413

---

# Source: .\node_modules\tldts\README.md

- Preview: # tldts - Blazing Fast URL Parsing `tldts` is a JavaScript library to extract hostnames, domains, public suffixes, top-level domains and subdomains from URLs. **Features**: 1. Tuned for **performance** (order of 0.1 to 1 μs per input) 2. Handles both URLs and hostnames 3. Full Unicode/IDNA support 4. Support parsing email addresses 5. Detect IPv4 and IPv6 addresses 6. Continuously updated version
- Lines: 330
- Characters: 10881

---

# Source: .\node_modules\tldts-core\README.md

- Preview: # `tldts-core` > core building blocks of tldts, used by both `tldts` and `tldts-experimental` packages.
- Lines: 6
- Characters: 102

---

# Source: .\node_modules\toad-cache\README.md

- Preview: # Toad Cache [![NPM Version](https://img.shields.io/npm/v/toad-cache.svg)](https://npmjs.org/package/toad-cache) [![NPM Downloads](https://img.shields.io/npm/dm/toad-cache.svg)](https://npmjs.org/package/toad-cache) ![](https://github.com/kibertoad/toad-cache/workflows/ci/badge.svg) [![Coverage Status](https://coveralls.io/repos/kibertoad/toad-cache/badge.svg?branch=main)](https://coveralls.io/r/k
- Lines: 268
- Characters: 4871

---

# Source: .\node_modules\toidentifier\HISTORY.md

- Preview: 1.0.1 / 2021-11-14 ================== * pref: enable strict mode 1.0.0 / 2018-07-09 ================== * Initial release
- Lines: 12
- Characters: 119

---

# Source: .\node_modules\toidentifier\README.md

- Preview: # toidentifier [![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url] [![Build Status][github-actions-ci-image]][github-actions-ci-url] [![Test Coverage][codecov-image]][codecov-url] > Convert a string of words to a JavaScript identifier ## Install This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmjs.com/). Insta
- Lines: 64
- Characters: 1742

---

# Source: .\node_modules\to-object-path\node_modules\kind-of\README.md

- Preview: # kind-of [![NPM version](https://img.shields.io/npm/v/kind-of.svg?style=flat)](https://www.npmjs.com/package/kind-of) [![NPM monthly downloads](https://img.shields.io/npm/dm/kind-of.svg?style=flat)](https://npmjs.org/package/kind-of) [![NPM total downloads](https://img.shields.io/npm/dt/kind-of.svg?style=flat)](https://npmjs.org/package/kind-of) [![Linux Build Status](https://img.shields.io/travi
- Lines: 264
- Characters: 7800

---

# Source: .\node_modules\to-object-path\README.md

- Preview: # to-object-path [![NPM version](https://badge.fury.io/js/to-object-path.svg)](http://badge.fury.io/js/to-object-path) > Create an object path from a list or array of strings. ## Install Install with [npm](https://www.npmjs.com/) ```sh $ npm i to-object-path --save ``` ## Usage ```js var toPath = require('to-object-path'); toPath('foo', 'bar', 'baz'); toPath('foo', ['bar', 'baz']); //=> 'foo.bar.b
- Lines: 74
- Characters: 2304

---

# Source: .\node_modules\to-regex-range\README.md

- Preview: # to-regex-range [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=W8YFZ425KND68) [![NPM version](https://img.shields.io/npm/v/to-regex-range.svg?style=flat)](https://www.npmjs.com/package/to-regex-range) [![NPM monthly downloads](https://img.shields.io/npm/dm/to-regex-range.svg?style=flat)](https://npmjs.org/pack
- Lines: 308
- Characters: 13252

---

# Source: .\node_modules\tough-cookie\README.md

- Preview: # Tough Cookie &middot; [![RFC6265][rfc6265-badge]][rfc6265-tracker] [![RFC6265bis][rfc6265bis-badge]][rfc6265bis-tracker] [![npm version][npm-badge]][npm-repo] [![CI on Github Actions: salesforce/tough-cookie][ci-badge]][ci-url] ![PRs Welcome][prs-welcome-badge] A Node.js implementation of [RFC6265][rfc6265-tracker] for cookie parsing, storage, and retrieval. ## Getting Started Install Tough Cook
- Lines: 157
- Characters: 5957

---

# Source: .\node_modules\tr46\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) Sebastian Mayr Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit perso
- Lines: 24
- Characters: 1055

---

# Source: .\node_modules\tr46\README.md

- Preview: # tr46 An JavaScript implementation of [Unicode Technical Standard #46: Unicode IDNA Compatibility Processing](https://unicode.org/reports/tr46/). ## API ### `toASCII(domainName[, options])` Converts a string of Unicode symbols to a case-folded Punycode string of ASCII symbols. Available options: * [`checkBidi`](#checkbidi) * [`checkHyphens`](#checkhyphens) * [`checkJoiners`](#checkjoiners) * [`ig
- Lines: 79
- Characters: 2112

---

# Source: .\node_modules\trim-lines\readme.md

- Preview: # trim-lines [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Remove spaces and tabs around line breaks. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`trimLines(value)`](#trimlinesvalue) *
- Lines: 128
- Characters: 2755

---

# Source: .\node_modules\trim-trailing-lines\readme.md

- Preview: # trim-trailing-lines [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Remove final line endings from a string. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`trimTrailingLines(value)`](#tri
- Lines: 143
- Characters: 2996

---

# Source: .\node_modules\trough\readme.md

- Preview: # trough [![Build][badge-build-image]][badge-build-url] [![Coverage][badge-coverage-image]][badge-coverage-url] [![Downloads][badge-downloads-image]][badge-downloads-url] [![Size][badge-size-image]][badge-size-url] `trough` is middleware. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *
- Lines: 497
- Characters: 10082

---

# Source: .\node_modules\ts-api-utils\LICENSE.md

- Preview: # MIT License Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished
- Lines: 23
- Characters: 1018

---

# Source: .\node_modules\ts-api-utils\README.md

- Preview: <h1 align="center">TypeScript API Utils</h1> <p align="center"> Utility functions for working with TypeScript's API. Successor to the wonderful tsutils. 🛠️️ </p> <p align="center"> <!-- prettier-ignore-start --> <!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section --> <img alt="All Contributors: 10 👪" src="https://img.shields.io/badge/all_contributors-10_👪-21bb42.svg" /> <!-
- Lines: 89
- Characters: 8146

---

# Source: .\node_modules\tsconfig-paths\CHANGELOG.md

- Preview: # Change Log All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/). ## [Unreleased] ## [4.2.0] - 2023-03-29 ### Added - Add support for tsconfig extends as array of strings. #. See PR [#245](https://github.com/dividab/tsconfig-paths/pull/245). T
- Lines: 410
- Characters: 13291

---

# Source: .\node_modules\tsconfig-paths\README.md

- Preview: # tsconfig-paths [![npm version][version-image]][version-url] [![build][build-image]][build-url] [![Coverage Status][codecov-image]][codecov-url] [![MIT license][license-image]][license-url] [![code style: prettier][prettier-image]][prettier-url] Use this to load modules whose location is specified in the `paths` section of `tsconfig.json` or `jsconfig.json`. Both loading at run-time and via API a
- Lines: 272
- Characters: 9712

---

# Source: .\node_modules\ts-dedent\HISTORY.md

- Preview: # History ## vNext TBA ## v2.2.0 Add indentation to values with multiline strings & added ESM module - Updated all dependencies to their latest version - Updated CI settings (added node 16, multiple os platforms) - Moved from Travis CI to Github Actions ## v2.1.1 Security update with dependency changes - Updated all dependencies to their latest version - Updated CI settings (added node 15) ## v2.1
- Lines: 58
- Characters: 1071

---

# Source: .\node_modules\ts-dedent\README.md

- Preview: # TypeScript Dedent [![codecov](https://codecov.io/gh/tamino-martinius/node-ts-dedent/branch/master/graph/badge.svg)](https://codecov.io/gh/tamino-martinius/node-ts-dedent) TypeScript package which smartly trims and strips indentation from multi-line strings. ## Usage Examples ```js import dedent from 'dedent'; console.log(dedent`A string that gets so long you need to break it over multiple lines.
- Lines: 107
- Characters: 2313

---

# Source: .\node_modules\ts-interface-checker\README.md

- Preview: # ts-interface-checker [![Build Status](https://travis-ci.org/gristlabs/ts-interface-checker.svg?branch=master)](https://travis-ci.org/gristlabs/ts-interface-checker) [![npm version](https://badge.fury.io/js/ts-interface-checker.svg)](https://badge.fury.io/js/ts-interface-checker) > Runtime library to validate data against TypeScript interfaces. This package is the runtime support for validators c
- Lines: 188
- Characters: 5513

---

# Source: .\node_modules\tslib\README.md

- Preview: # tslib This is a runtime library for [TypeScript](https://www.typescriptlang.org/) that contains all of the TypeScript helper functions. This library is primarily used by the `--importHelpers` flag in TypeScript. When using `--importHelpers`, a module that uses helper functions like `__extends` and `__assign` in the following emitted file: ```ts var __assign = (this && this.__assign) || Object.as
- Lines: 167
- Characters: 3705

---

# Source: .\node_modules\tslib\SECURITY.md

- Preview: <!-- BEGIN MICROSOFT SECURITY.MD V0.0.7 BLOCK --> ## Security Microsoft takes the security of our software products and services seriously, which includes all source code repositories managed through our GitHub organizations, which include [Microsoft](https://github.com/Microsoft), [Azure](https://github.com/Azure), [DotNet](https://github.com/dotnet), [AspNet](https://github.com/aspnet), [Xamarin
- Lines: 44
- Characters: 2716

---

# Source: .\node_modules\tsx\README.md

- Preview: <h1 align="center"> <br> <picture> <source media="(prefers-color-scheme: dark)" srcset=".github/logo-dark.svg"> <img width="160" alt="tsx" src=".github/logo-light.svg"> </picture> <br><br> <a href="https://npm.im/tsx"><img src="https://badgen.net/npm/v/tsx"></a> <a href="https://npm.im/tsx"><img src="https://badgen.net/npm/dm/tsx"></a> </h1> <p align="center"> TypeScript Execute (tsx): The easiest
- Lines: 35
- Characters: 1341

---

# Source: .\node_modules\type-check\README.md

- Preview: # type-check [![Build Status](https://travis-ci.org/gkz/type-check.png?branch=master)](https://travis-ci.org/gkz/type-check) <a name="type-check" /> `type-check` is a library which allows you to check the types of JavaScript values at runtime with a Haskell like type syntax. It is great for checking external input, for testing, or even for adding a bit of safety to your internal code. It is a majo
- Lines: 213
- Characters: 10010

---

# Source: .\node_modules\typed-array-buffer\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.3](https://github.com/inspect-js/typed-array-buffer/compare/v1.0.2...v1.0.3) - 2024-12-18 ### Commits - [meta] update URLs [`aca9484`](https:/
- Lines: 53
- Characters: 4233

---

# Source: .\node_modules\typed-array-buffer\README.md

- Preview: # typed-array-buffer <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Get the ArrayBuffer out of a TypedArray, robustly. This will work in node <= 0.10 and < 0.11.4, wh
- Lines: 45
- Characters: 1956

---

# Source: .\node_modules\typed-array-byte-length\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.3](https://github.com/inspect-js/typed-array-byte-length/compare/v1.0.2...v1.0.3) - 2024-12-17 ### Commits - [types] oops, this is a type expo
- Lines: 47
- Characters: 3555

---

# Source: .\node_modules\typed-array-byte-length\README.md

- Preview: # typed-array-byte-offset <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Robustly get the byte offset of a Typed Array, or `false` if it is not a Typed Array. Works c
- Lines: 73
- Characters: 3601

---

# Source: .\node_modules\typed-array-byte-offset\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.4](https://github.com/inspect-js/typed-array-byte-offset/compare/v1.0.3...v1.0.4) - 2024-12-18 ### Commits - [Tests] split out and enhance "no
- Lines: 64
- Characters: 5020

---

# Source: .\node_modules\typed-array-byte-offset\README.md

- Preview: # typed-array-byte-offset <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Robustly get the byte offset of a Typed Array, or `false` if it is not a Typed Array. Works c
- Lines: 73
- Characters: 3601

---

# Source: .\node_modules\typed-array-length\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.7](https://github.com/inspect-js/typed-array-length/compare/v1.0.6...v1.0.7) - 2024-11-22 ### Fixed - [Fix] avoid relying on `__proto__` acces
- Lines: 109
- Characters: 9822

---

# Source: .\node_modules\typed-array-length\README.md

- Preview: # typed-array-length <sup>[![Version Badge][2]][1]</sup> [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Robustly get the length of a Typed Array, or `false` if it is not a Typed Array. Works cross-realm, in every engine, even if the `length` property is overridden. ## Exampl
- Lines: 67
- Characters: 2741

---

# Source: .\node_modules\type-fest\readme.md

- Preview: <div align="center"> <br> <br> <img src="media/logo.svg" alt="type-fest" height="300"> <br> <br> <b>A collection of essential TypeScript types</b> <br> <br> <br> <br> <hr> <div align="center"> <p> <p> <sup> <a href="https://github.com/sponsors/sindresorhus">Sindre Sorhus' open source work is supported by the community</a> </sup> </p> <sup>Special thanks to:</sup> <br> <br> <a href="https://workos.
- Lines: 1063
- Characters: 57108

---

# Source: .\node_modules\type-is\HISTORY.md

- Preview: 2.0.1 / 2025-03-27 ========== 2.0.0 / 2024-08-31 ========== * Drop node <18 * Use `content-type@^1.0.5` and `media-typer@^1.0.0` for type validation - No behavior changes, upgrades `media-typer` * deps: mime-types@^3.0.0 - Add `application/toml` with extension `.toml` - Add `application/ubjson` with extension `.ubj` - Add `application/x-keepass2` with extension `.kdbx` - Add deprecated iWorks mime
- Lines: 295
- Characters: 6572

---

# Source: .\node_modules\type-is\README.md

- Preview: # type-is [![NPM Version][npm-version-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url] [![Node.js Version][node-version-image]][node-version-url] [![Build Status][ci-image]][ci-url] [![Test Coverage][coveralls-image]][coveralls-url] Infer the content-type of a request. ## Install This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.np
- Lines: 201
- Characters: 6306

---

# Source: .\node_modules\typescript\README.md

- Preview: # TypeScript [![GitHub Actions CI](https://github.com/microsoft/TypeScript/workflows/CI/badge.svg)](https://github.com/microsoft/TypeScript/actions?query=workflow%3ACI) [![npm version](https://badge.fury.io/js/typescript.svg)](https://www.npmjs.com/package/typescript) [![Downloads](https://img.shields.io/npm/dm/typescript.svg)](https://www.npmjs.com/package/typescript) [![OpenSSF Scorecard](https:
- Lines: 53
- Characters: 2748

---

# Source: .\node_modules\typescript\SECURITY.md

- Preview: <!-- BEGIN MICROSOFT SECURITY.MD V0.0.9 BLOCK --> ## Security Microsoft takes the security of our software products and services seriously, which includes all source code repositories managed through our GitHub organizations, which include [Microsoft](https://github.com/Microsoft), [Azure](https://github.com/Azure), [DotNet](https://github.com/dotnet), [AspNet](https://github.com/aspnet) and [Xama
- Lines: 44
- Characters: 2615

---

# Source: .\node_modules\typescript-eslint\README.md

- Preview: # `typescript-eslint` > Tooling which enables you to use TypeScript with ESLint [![NPM Version](https://img.shields.io/npm/v/typescript-eslint.svg?style=flat-square)](https://www.npmjs.com/package/typescript-eslint) [![NPM Downloads](https://img.shields.io/npm/dm/typescript-eslint.svg?style=flat-square)](https://www.npmjs.com/package/typescript-eslint) 👉 See **https://typescript-eslint.io/package
- Lines: 15
- Characters: 674

---

# Source: .\node_modules\uc.micro\README.md

- Preview: # uc.micro [![CI](https://github.com/markdown-it/uc.micro/actions/workflows/ci.yml/badge.svg)](https://github.com/markdown-it/uc.micro/actions/workflows/ci.yml) [![NPM version](https://img.shields.io/npm/v/uc.micro.svg?style=flat)](https://www.npmjs.org/package/uc.micro) > Micro subset of unicode data files for [markdown-it](https://github.com/markdown-it) projects. Content of this repo is autogen
- Lines: 17
- Characters: 678

---

# Source: .\node_modules\ufo\README.md

- Preview: # ufo [![npm version][npm-version-src]][npm-version-href] [![npm downloads][npm-downloads-src]][npm-downloads-href] [![bundle][bundle-src]][bundle-href] [![Codecov][codecov-src]][codecov-href] URL utils for humans. ## Install Install using npm or your favourite package manager: Install package: ```sh # npm npm install ufo # yarn yarn add ufo # pnpm pnpm install ufo # bun bun install ufo ``` Import
- Lines: 469
- Characters: 10180

---

# Source: .\node_modules\unbox-primitive\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.0](https://github.com/ljharb/unbox-primitive/compare/v1.0.2...v1.1.0) - 2024-12-15 ### Commits - [meta] use `npmignore` to autogenerate an npm
- Lines: 82
- Characters: 8477

---

# Source: .\node_modules\unbox-primitive\README.md

- Preview: # unbox-primitive <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] Unb
- Lines: 50
- Characters: 2093

---

# Source: .\node_modules\undici\docs\docs\api\Agent.md

- Preview: # Agent Extends: `undici.Dispatcher` Agent allows dispatching requests against multiple different origins. Requests are not guaranteed to be dispatched in order of invocation. ## `new undici.Agent([options])` Arguments: * **options** `AgentOptions` (optional) Returns: `Agent` ### Parameter: `AgentOptions` Extends: [`PoolOptions`](/docs/docs/api/Pool.md#parameter-pooloptions) * **factory** `(origin
- Lines: 87
- Characters: 2854

---

# Source: .\node_modules\undici\docs\docs\api\api-lifecycle.md

- Preview: # Client Lifecycle An Undici [Client](/docs/docs/api/Client.md) can be best described as a state machine. The following list is a summary of the various state transitions the `Client` will go through in its lifecycle. This document also contains detailed breakdowns of each state. > This diagram is not a perfect representation of the undici Client. Since the Client class is not actually implemented
- Lines: 94
- Characters: 8192

---

# Source: .\node_modules\undici\docs\docs\api\BalancedPool.md

- Preview: # Class: BalancedPool Extends: `undici.Dispatcher` A pool of [Pool](/docs/docs/api/Pool.md) instances connected to multiple upstreams. Requests are not guaranteed to be dispatched in order of invocation. ## `new BalancedPool(upstreams [, options])` Arguments: * **upstreams** `URL | string | string[]` - It should only include the **protocol, hostname, and port**. * **options** `BalancedPoolOptions`
- Lines: 102
- Characters: 2958

---

# Source: .\node_modules\undici\docs\docs\api\CacheStorage.md

- Preview: # CacheStorage Undici exposes a W3C spec-compliant implementation of [CacheStorage](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage) and [Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache). ## Opening a Cache Undici exports a top-level CacheStorage instance. You can open a new Cache, or duplicate a Cache with an existing name, by using `CacheStorage.prototype.open`. If yo
- Lines: 33
- Characters: 1048

---

# Source: .\node_modules\undici\docs\docs\api\CacheStore.md

- Preview: # Cache Store A Cache Store is responsible for storing and retrieving cached responses. It is also responsible for deciding which specific response to use based off of a response's `Vary` header (if present). It is expected to be compliant with [RFC-9111](https://www.rfc-editor.org/rfc/rfc9111.html). ## Pre-built Cache Stores ### `MemoryCacheStore` The `MemoryCacheStore` stores the responses in-me
- Lines: 154
- Characters: 4505

---

# Source: .\node_modules\undici\docs\docs\api\Client.md

- Preview: # Class: Client Extends: `undici.Dispatcher` A basic HTTP/1.1 client, mapped on top a single TCP/TLS connection. Pipelining is disabled by default. Requests are not guaranteed to be dispatched in order of invocation. ## `new Client(url[, options])` Arguments: * **url** `URL | string` - Should only include the **protocol, hostname, and port**. * **options** `ClientOptions` (optional) Returns: `Clie
- Lines: 284
- Characters: 11059

---

# Source: .\node_modules\undici\docs\docs\api\ClientStats.md

- Preview: # Class: ClientStats Stats for a [Client](/docs/docs/api/Client.md). ## `new ClientStats(client)` Arguments: * **client** `Client` - Client from which to return stats. ## Instance Properties ### `ClientStats.connected` Boolean if socket as open connection by this client. ### `ClientStats.pending` Number of pending requests of this client. ### `ClientStats.running` Number of currently active reques
- Lines: 30
- Characters: 495

---

# Source: .\node_modules\undici\docs\docs\api\Connector.md

- Preview: # Connector Undici creates the underlying socket via the connector builder. Normally, this happens automatically and you don't need to care about this, but if you need to perform some additional check over the currently used socket, this is the right place. If you want to create a custom connector, you must import the `buildConnector` utility. #### Parameter: `buildConnector.BuildOptions` Every Tl
- Lines: 118
- Characters: 3349

---

# Source: .\node_modules\undici\docs\docs\api\ContentType.md

- Preview: # MIME Type Parsing ## `MIMEType` interface * **type** `string` * **subtype** `string` * **parameters** `Map<string, string>` * **essence** `string` ## `parseMIMEType(input)` Implements [parse a MIME type](https://mimesniff.spec.whatwg.org/#parse-a-mime-type). Parses a MIME type, returning its type, subtype, and any associated parameters. If the parser can't parse an input it returns the string li
- Lines: 60
- Characters: 1073

---

# Source: .\node_modules\undici\docs\docs\api\Cookies.md

- Preview: # Cookie Handling ## `Cookie` interface * **name** `string` * **value** `string` * **expires** `Date|number` (optional) * **maxAge** `number` (optional) * **domain** `string` (optional) * **path** `string` (optional) * **secure** `boolean` (optional) * **httpOnly** `boolean` (optional) * **sameSite** `'String'|'Lax'|'None'` (optional) * **unparsed** `string[]` (optional) Left over attributes that
- Lines: 104
- Characters: 1942

---

# Source: .\node_modules\undici\docs\docs\api\Debug.md

- Preview: # Debug Undici (and subsenquently `fetch` and `websocket`) exposes a debug statement that can be enabled by setting `NODE_DEBUG` within the environment. The flags available are: ## `undici` This flag enables debug statements for the core undici library. ```sh NODE_DEBUG=undici node script.js UNDICI 16241: connecting to nodejs.org using https:h1 UNDICI 16241: connecting to nodejs.org using https:h1
- Lines: 65
- Characters: 2221

---

# Source: .\node_modules\undici\docs\docs\api\DiagnosticsChannel.md

- Preview: # Diagnostics Channel Support Stability: Experimental. Undici supports the [`diagnostics_channel`](https://nodejs.org/api/diagnostics_channel.html) (currently available only on Node.js v16+). It is the preferred way to instrument Undici and retrieve internal information. The channels available are the following. ## `undici:request:create` This message is published when a new outgoing request is cr
- Lines: 259
- Characters: 8165

---

# Source: .\node_modules\undici\docs\docs\api\Dispatcher.md

- Preview: # Dispatcher Extends: `events.EventEmitter` Dispatcher is the core API used to dispatch requests. Requests are not guaranteed to be dispatched in order of invocation. ## Instance Methods ### `Dispatcher.close([callback]): Promise` Closes the dispatcher and gracefully waits for enqueued requests to complete before resolving. Arguments: * **callback** `(error: Error | null, data: null) => void` (opt
- Lines: 1281
- Characters: 39390

---

# Source: .\node_modules\undici\docs\docs\api\EnvHttpProxyAgent.md

- Preview: # Class: EnvHttpProxyAgent Extends: `undici.Dispatcher` EnvHttpProxyAgent automatically reads the proxy configuration from the environment variables `http_proxy`, `https_proxy`, and `no_proxy` and sets up the proxy agents accordingly. When `http_proxy` and `https_proxy` are set, `http_proxy` is used for HTTP requests and `https_proxy` is used for HTTPS requests. If only `http_proxy` is set, `http_
- Lines: 162
- Characters: 5666

---

# Source: .\node_modules\undici\docs\docs\api\Errors.md

- Preview: # Errors Undici exposes a variety of error objects that you can use to enhance your error handling. You can find all the error objects inside the `errors` key. ```js import { errors } from 'undici' ``` | Error                                | Error Codes                           | Description                                                               | | ------------------------------------ |
- Lines: 51
- Characters: 3786

---

# Source: .\node_modules\undici\docs\docs\api\EventSource.md

- Preview: # EventSource > ⚠️ Warning: the EventSource API is experimental. Undici exposes a WHATWG spec-compliant implementation of [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) for [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events). ## Instantiating EventSource Undici exports a EventSource class. You can instantia
- Lines: 48
- Characters: 1187

---

# Source: .\node_modules\undici\docs\docs\api\Fetch.md

- Preview: # Fetch Undici exposes a fetch() method starts the process of fetching a resource from the network. Documentation and examples can be found on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/fetch). ## FormData This API is implemented as per the standard, you can find documentation on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/FormData). If any parameters are passed to the FormD
- Lines: 55
- Characters: 2072

---

# Source: .\node_modules\undici\docs\docs\api\GlobalInstallation.md

- Preview: # Global Installation Undici provides an `install()` function to add all WHATWG fetch classes to `globalThis`, making them available globally without requiring imports. ## `install()` Install all WHATWG fetch classes globally on `globalThis`. **Example:** ```js import { install } from 'undici' // Install all WHATWG fetch classes globally install() // Now you can use fetch classes globally without
- Lines: 94
- Characters: 2689

---

# Source: .\node_modules\undici\docs\docs\api\H2CClient.md

- Preview: # Class: H2CClient Extends: `undici.Dispatcher` A basic H2C client. **Example** ```js const { createServer } = require('node:http2') const { once } = require('node:events') const { H2CClient } = require('undici') const server = createServer((req, res) => { res.writeHead(200) res.end('Hello, world!') }) server.listen() once(server, 'listening').then(() => { const client = new H2CClient(`http://loca
- Lines: 265
- Characters: 9724

---

# Source: .\node_modules\undici\docs\docs\api\MockAgent.md

- Preview: # Class: MockAgent Extends: `undici.Dispatcher` A mocked Agent class that implements the Agent API. It allows one to intercept HTTP requests made through undici and return mocked responses instead. ## `new MockAgent([options])` Arguments: * **options** `MockAgentOptions` (optional) - It extends the `Agent` options. Returns: `MockAgent` ### Parameter: `MockAgentOptions` Extends: [`AgentOptions`](/d
- Lines: 606
- Characters: 16620

---

# Source: .\node_modules\undici\docs\docs\api\MockCallHistory.md

- Preview: # Class: MockCallHistory Access to an instance with : ```js const mockAgent = new MockAgent({ enableCallHistory: true }) mockAgent.getCallHistory() // or const mockAgent = new MockAgent() mockAgent.enableMockHistory() mockAgent.getCallHistory() ``` a MockCallHistory instance implements a **Symbol.iterator** letting you iterate on registered logs : ```ts for (const log of mockAgent.getCallHistory()
- Lines: 200
- Characters: 5435

---

# Source: .\node_modules\undici\docs\docs\api\MockCallHistoryLog.md

- Preview: # Class: MockCallHistoryLog Access to an instance with : ```js const mockAgent = new MockAgent({ enableCallHistory: true }) mockAgent.getCallHistory()?.firstCall() ``` ## class properties - body `mockAgent.getCallHistory()?.firstCall()?.body` - headers `mockAgent.getCallHistory()?.firstCall()?.headers` an object - method `mockAgent.getCallHistory()?.firstCall()?.method` a string - fullUrl `mockAge
- Lines: 46
- Characters: 1732

---

# Source: .\node_modules\undici\docs\docs\api\MockClient.md

- Preview: # Class: MockClient Extends: `undici.Client` A mock client class that implements the same api as [MockPool](/docs/docs/api/MockPool.md). ## `new MockClient(origin, [options])` Arguments: * **origin** `string` - It should only include the **protocol, hostname, and port**. * **options** `MockClientOptions` - It extends the `Client` options. Returns: `MockClient` ### Parameter: `MockClientOptions` Ex
- Lines: 84
- Characters: 2132

---

# Source: .\node_modules\undici\docs\docs\api\MockErrors.md

- Preview: # MockErrors Undici exposes a variety of mock error objects that you can use to enhance your mock error handling. You can find all the mock error objects inside the `mockErrors` key. ```js import { mockErrors } from 'undici' ``` | Mock Error            | Mock Error Codes                | Description                                                | | --------------------- | ------------------------
- Lines: 15
- Characters: 583

---

# Source: .\node_modules\undici\docs\docs\api\MockPool.md

- Preview: # Class: MockPool Extends: `undici.Pool` A mock Pool class that implements the Pool API and is used by MockAgent to intercept real requests and return mocked responses. ## `new MockPool(origin, [options])` Arguments: * **origin** `string` - It should only include the **protocol, hostname, and port**. * **options** `MockPoolOptions` - It extends the `Pool` options. Returns: `MockPool` ### Parameter
- Lines: 557
- Characters: 15972

---

# Source: .\node_modules\undici\docs\docs\api\Pool.md

- Preview: # Class: Pool Extends: `undici.Dispatcher` A pool of [Client](/docs/docs/api/Client.md) instances connected to the same upstream target. Requests are not guaranteed to be dispatched in order of invocation. ## `new Pool(url[, options])` Arguments: * **url** `URL | string` - It should only include the **protocol, hostname, and port**. * **options** `PoolOptions` (optional) ### Parameter: `PoolOption
- Lines: 87
- Characters: 2857

---

# Source: .\node_modules\undici\docs\docs\api\PoolStats.md

- Preview: # Class: PoolStats Aggregate stats for a [Pool](/docs/docs/api/Pool.md) or [BalancedPool](/docs/docs/api/BalancedPool.md). ## `new PoolStats(pool)` Arguments: * **pool** `Pool` - Pool or BalancedPool from which to return stats. ## Instance Properties ### `PoolStats.connected` Number of open socket connections in this pool. ### `PoolStats.free` Number of open socket connections in this pool that do
- Lines: 38
- Characters: 770

---

# Source: .\node_modules\undici\docs\docs\api\ProxyAgent.md

- Preview: # Class: ProxyAgent Extends: `undici.Dispatcher` A Proxy Agent class that implements the Agent API. It allows the connection through proxy in a simple way. ## `new ProxyAgent([options])` Arguments: * **options** `ProxyAgentOptions` (required) - It extends the `Agent` options. Returns: `ProxyAgent` ### Parameter: `ProxyAgentOptions` Extends: [`AgentOptions`](/docs/docs/api/Agent.md#parameter-agento
- Lines: 230
- Characters: 7855

---

# Source: .\node_modules\undici\docs\docs\api\RedirectHandler.md

- Preview: # Class: RedirectHandler A class that handles redirection logic for HTTP requests. ## `new RedirectHandler(dispatch, maxRedirections, opts, handler, redirectionLimitReached)` Arguments: - **dispatch** `function` - The dispatch function to be called after every retry. - **maxRedirections** `number` - Maximum number of redirections allowed. - **opts** `object` - Options for handling redirection. - *
- Lines: 99
- Characters: 3109

---

# Source: .\node_modules\undici\docs\docs\api\RetryAgent.md

- Preview: # Class: RetryAgent Extends: `undici.Dispatcher` A `undici.Dispatcher` that allows to automatically retry a request. Wraps a `undici.RetryHandler`. ## `new RetryAgent(dispatcher, [options])` Arguments: * **dispatcher** `undici.Dispatcher` (required) - the dispatcher to wrap * **options** `RetryHandlerOptions` (optional) - the options Returns: `ProxyAgent` ### Parameter: `RetryHandlerOptions` - **t
- Lines: 53
- Characters: 2212

---

# Source: .\node_modules\undici\docs\docs\api\RetryHandler.md

- Preview: # Class: RetryHandler Extends: `undici.DispatcherHandlers` A handler class that implements the retry logic for a request. ## `new RetryHandler(dispatchOptions, retryHandlers, [retryOptions])` Arguments: - **options** `Dispatch.DispatchOptions & RetryOptions` (required) - It is an intersection of `Dispatcher.DispatchOptions` and `RetryOptions`. - **retryHandlers** `RetryHandlers` (required) - Objec
- Lines: 121
- Characters: 4469

---

# Source: .\node_modules\undici\docs\docs\api\SnapshotAgent.md

- Preview: # SnapshotAgent The `SnapshotAgent` provides a powerful way to record and replay HTTP requests for testing purposes. It extends `MockAgent` to enable automatic snapshot testing, eliminating the need to manually define mock responses. ## Use Cases - **Integration Testing**: Record real API interactions and replay them in tests - **Offline Development**: Work with APIs without network connectivity -
- Lines: 619
- Characters: 15432

---

# Source: .\node_modules\undici\docs\docs\api\Util.md

- Preview: # Util Utility API for third-party implementations of the dispatcher API. ## `parseHeaders(headers, [obj])` Receives a header object and returns the parsed value. Arguments: - **headers** `(Buffer | string | (Buffer | string)[])[]` (required) - Header object. - **obj** `Record<string, string | string[]>` (optional) - Object to specify a proxy object. The parsed value is assigned to this object. Bu
- Lines: 28
- Characters: 707

---

# Source: .\node_modules\undici\docs\docs\api\WebSocket.md

- Preview: # Class: WebSocket Extends: [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget) The WebSocket object provides a way to manage a WebSocket connection to a server, allowing bidirectional communication. The API follows the [WebSocket spec](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) and [RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455). ## `new WebSoc
- Lines: 115
- Characters: 3134

---

# Source: .\node_modules\undici\docs\docs\best-practices\client-certificate.md

- Preview: # Client certificate Client certificate authentication can be configured with the `Client`, the required options are passed along through the `connect` option. The client certificates must be signed by a trusted CA. The Node.js default is to trust the well-known CAs curated by Mozilla. Setting the server option `requestCert: true` tells the server to request the client certificate. The server opti
- Lines: 67
- Characters: 1989

---

# Source: .\node_modules\undici\docs\docs\best-practices\mocking-request.md

- Preview: # Mocking Request Undici has its own mocking [utility](/docs/docs/api/MockAgent.md). It allow us to intercept undici HTTP requests and return mocked values instead. It can be useful for testing purposes. Example: ```js // bank.mjs import { request } from 'undici' export async function bankTransfer(recipient, amount) { const { body } = await request('http://localhost:3000/bank-transfer', { method:
- Lines: 193
- Characters: 5367

---

# Source: .\node_modules\undici\docs\docs\best-practices\proxy.md

- Preview: # Connecting through a proxy Connecting through a proxy is possible by: - Using [ProxyAgent](/docs/docs/api/ProxyAgent.md). - Configuring `Client` or `Pool` constructor. The proxy url should be passed to the `Client` or `Pool` constructor, while the upstream server url should be added to every request call in the `path`. For instance, if you need to send a request to the `/hello` route of your ups
- Lines: 130
- Characters: 3209

---

# Source: .\node_modules\undici\docs\docs\best-practices\writing-tests.md

- Preview: # Writing tests Undici is tuned for a production use case and its default will keep a socket open for a few seconds after an HTTP request is completed to remove the overhead of opening up a new socket. These settings that makes Undici shine in production are not a good fit for using Undici in automated tests, as it will result in longer execution times. The following are good defaults that will ke
- Lines: 23
- Characters: 628

---

# Source: .\node_modules\undici\lib\web\subresource-integrity\Readme.md

- Preview: # Subresource Integrity based on Editor’s Draft, 12 June 2025 This module provides support for Subresource Integrity (SRI) in the context of web fetch operations. SRI is a security feature that allows clients to verify that fetched resources are delivered without unexpected manipulation. ## Links - [Subresource Integrity](https://w3c.github.io/webappsec-subresource-integrity/)
- Lines: 12
- Characters: 375

---

# Source: .\node_modules\undici\README.md

- Preview: # undici [![Node CI](https://github.com/nodejs/undici/actions/workflows/ci.yml/badge.svg)](https://github.com/nodejs/undici/actions/workflows/nodejs.yml) [![neostandard javascript style](https://img.shields.io/badge/neo-standard-7fffff?style=flat\&labelColor=ff80ff)](https://github.com/neostandard/neostandard) [![npm version](https://badge.fury.io/js/undici.svg)](https://badge.fury.io/js/undici) [
- Lines: 636
- Characters: 23570

---

# Source: .\node_modules\undici\types\README.md

- Preview: # undici-types This package is a dual-publish of the [undici](https://www.npmjs.com/package/undici) library types. The `undici` package **still contains types**. This package is for users who _only_ need undici types (such as for `@types/node`). It is published alongside every release of `undici`, so you can always use the same version. - [GitHub nodejs/undici](https://github.com/nodejs/undici) -
- Lines: 9
- Characters: 449

---

# Source: .\node_modules\undici-types\README.md

- Preview: # undici-types This package is a dual-publish of the [undici](https://www.npmjs.com/package/undici) library types. The `undici` package **still contains types**. This package is for users who _only_ need undici types (such as for `@types/node`). It is published alongside every release of `undici`, so you can always use the same version. - [GitHub nodejs/undici](https://github.com/nodejs/undici) -
- Lines: 9
- Characters: 449

---

# Source: .\node_modules\unicorn-magic\readme.md

- Preview: # unicorn-magic > Some useful utilities I often need *I'm not accepting requests.* ## Install ```sh npm install unicorn-magic ``` ## Usage ```js import {delay} from 'unicorn-magic'; await delay({seconds: 1}); console.log('1 second later'); ``` ## API See [the types](index.d.ts).
- Lines: 28
- Characters: 265

---

# Source: .\node_modules\unified\readme.md

- Preview: # [![unified][logo]][site] [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] **unified** lets you inspect and transform content with plugins. ## Contents * [What is this?](#what-is-this) * [When sho
- Lines: 1838
- Characters: 47382

---

# Source: .\node_modules\unist-util-find-after\readme.md

- Preview: # unist-util-find-after [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [unist][] utility to find a node after another node. ## Contents *   [What is this?](#what-is-this) *   [When should I use t
- Lines: 223
- Characters: 6197

---

# Source: .\node_modules\unist-util-is\readme.md

- Preview: # unist-util-is [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [unist][] utility to check if nodes pass a test. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-
- Lines: 354
- Characters: 8611

---

# Source: .\node_modules\unist-util-position\readme.md

- Preview: # unist-util-position [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [unist][] utility to get positional info of nodes. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?
- Lines: 246
- Characters: 6301

---

# Source: .\node_modules\unist-util-stringify-position\readme.md

- Preview: # unist-util-stringify-position [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [unist][] utility to pretty print the positional info of a node. ## Contents *   [What is this?](#what-is-this) *
- Lines: 209
- Characters: 5804

---

# Source: .\node_modules\unist-util-visit\readme.md

- Preview: # unist-util-visit [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [unist][] utility to walk the tree. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-u
- Lines: 322
- Characters: 8564

---

# Source: .\node_modules\unist-util-visit-parents\readme.md

- Preview: # unist-util-visit-parents [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [unist][] utility to walk the tree with a stack of parents. ## Contents *   [What is this?](#what-is-this) *   [When shou
- Lines: 391
- Characters: 9982

---

# Source: .\node_modules\universal-github-app-jwt\CODE_OF_CONDUCT.md

- Preview: # Contributor Covenant Code of Conduct ## Our Pledge In the interest of fostering an open and welcoming environment, we as contributors and maintainers pledge to making participation in our project and our community a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, r
- Lines: 49
- Characters: 3167

---

# Source: .\node_modules\universal-github-app-jwt\README.md

- Preview: # universal-github-app-jwt > Calculate GitHub App bearer tokens for Node, Deno, and modern browsers [![@latest](https://img.shields.io/npm/v/universal-github-app-jwt)](https://www.npmjs.com/universal-github-app-jwt) [![Build Status](https://github.com/gr2m/universal-github-app-jwt/workflows/Test/badge.svg)](https://github.com/gr2m/universal-github-app-jwt/actions?query=workflow%3ATest+branch%3Amas
- Lines: 242
- Characters: 6012

---

# Source: .\node_modules\universalify\README.md

- Preview: # universalify ![GitHub Workflow Status (branch)](https://img.shields.io/github/actions/workflow/status/RyanZim/universalify/ci.yml?branch=master) ![Coveralls github branch](https://img.shields.io/coveralls/github/RyanZim/universalify/master.svg) ![npm](https://img.shields.io/npm/dm/universalify.svg) ![npm](https://img.shields.io/npm/l/universalify.svg) Make a callback- or promise-based function s
- Lines: 79
- Characters: 1936

---

# Source: .\node_modules\universal-user-agent\CODE_OF_CONDUCT.md

- Preview: # Contributor Covenant Code of Conduct ## Our Pledge In the interest of fostering an open and welcoming environment, we as contributors and maintainers pledge to making participation in our project and our community a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, r
- Lines: 77
- Characters: 3166

---

# Source: .\node_modules\universal-user-agent\LICENSE.md

- Preview: # [ISC License](https://spdx.org/licenses/ISC) Copyright (c) 2018-2021, Gregor Martynus (https://github.com/gr2m) Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies. THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WIT
- Lines: 10
- Characters: 806

---

# Source: .\node_modules\universal-user-agent\README.md

- Preview: # universal-user-agent > Get a user agent string across all JavaScript Runtime Environments [![@latest](https://img.shields.io/npm/v/universal-user-agent.svg)](https://www.npmjs.com/package/universal-user-agent) [![Build Status](https://github.com/gr2m/universal-user-agent/workflows/Test/badge.svg)](https://github.com/gr2m/universal-user-agent/actions/workflows/test.yml?query=workflow%3ATest) ```j
- Lines: 22
- Characters: 694

---

# Source: .\node_modules\universal-user-agent\SECURITY.md

- Preview: ## Security contact information To report a security vulnerability, please use the [Tidelift security contact](https://tidelift.com/security). Tidelift will coordinate the fix and disclosure.
- Lines: 8
- Characters: 188

---

# Source: .\node_modules\unpipe\HISTORY.md

- Preview: 1.0.0 / 2015-06-14 ================== * Initial release
- Lines: 7
- Characters: 55

---

# Source: .\node_modules\unpipe\README.md

- Preview: # unpipe [![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url] [![Node.js Version][node-image]][node-url] [![Build Status][travis-image]][travis-url] [![Test Coverage][coveralls-image]][coveralls-url] Unpipe a stream from all destinations. ## Installation ```sh $ npm install unpipe ``` ## API ```js var unpipe = require('unpipe') ``` ### unpipe(stream) Unpipes all
- Lines: 46
- Characters: 1207

---

# Source: .\node_modules\unplugin\README.md

- Preview: # Unplugin [![npm version][npm-version-src]][npm-version-href] [![npm downloads][npm-downloads-src]][npm-downloads-href] [![License][license-src]][license-href] Unified plugin system for build tools. Currently supports: - [Vite](https://vitejs.dev/) - [Rollup](https://rollupjs.org/) - [Webpack](https://webpack.js.org/) - [esbuild](https://esbuild.github.io/) - [Rspack](https://www.rspack.dev/) - [
- Lines: 38
- Characters: 1146

---

# Source: .\node_modules\update-browserslist-db\README.md

- Preview: # Update Browserslist DB <img width="120" height="120" alt="Browserslist logo by Anton Popov" src="https://browsersl.ist/logo.svg" align="right"> CLI tool to update `caniuse-lite` with browsers DB from [Browserslist](https://github.com/browserslist/browserslist/) config. Some queries like `last 2 versions` or `>1%` depend on actual data from `caniuse-lite`. ```sh npx update-browserslist-db@latest
- Lines: 25
- Characters: 695

---

# Source: .\node_modules\uri-js\README.md

- Preview: # URI.js URI.js is an [RFC 3986](http://www.ietf.org/rfc/rfc3986.txt) compliant, scheme extendable URI parsing/validating/resolving library for all JavaScript environments (browsers, Node.js, etc). It is also compliant with the IRI ([RFC 3987](http://www.ietf.org/rfc/rfc3987.txt)), IDNA ([RFC 5890](http://www.ietf.org/rfc/rfc5890.txt)), IPv6 Address ([RFC 5952](http://www.ietf.org/rfc/rfc5952.txt)
- Lines: 206
- Characters: 6209

---

# Source: .\node_modules\use-callback-ref\README.md

- Preview: <div align="center"> <h1>🤙 use-callback-ref 📞</h1> <br/> The same `useRef` but it will callback: 📞 Hello! Your ref was changed! <br/> <a href="https://www.npmjs.com/package/use-callback-ref"> <img src="https://img.shields.io/npm/v/use-callback-ref.svg?style=flat-square" /> </a> <a href="https://travis-ci.org/theKashey/use-callback-ref"> <img alt="Travis" src="https://img.shields.io/travis/theKa
- Lines: 171
- Characters: 6452

---

# Source: .\node_modules\use-composed-ref\README.md

- Preview: # use-composed-ref React hook which creates a ref function from given refs. Useful when using forwardRef.
- Lines: 6
- Characters: 104

---

# Source: .\node_modules\use-context-selector\README.md

- Preview: # use-context-selector [![CI](https://img.shields.io/github/actions/workflow/status/dai-shi/use-context-selector/ci.yml?branch=main)](https://github.com/dai-shi/use-context-selector/actions?query=workflow%3ACI) [![npm](https://img.shields.io/npm/v/use-context-selector)](https://www.npmjs.com/package/use-context-selector) [![size](https://img.shields.io/bundlephobia/minzip/use-context-selector)](ht
- Lines: 263
- Characters: 7071

---

# Source: .\node_modules\use-isomorphic-layout-effect\README.md

- Preview: # use-isomorphic-layout-effect A React helper hook for scheduling a layout effect with a fallback to a regular effect for environments where layout effects should not be used (such as server-side rendering). ## Installation ```sh $ npm i use-isomorphic-layout-effect ``` ## Usage You only need to switch `useLayoutEffect` with `useIsomorphicLayoutEffect` ```diff + import useIsomorphicLayoutEffect fr
- Lines: 29
- Characters: 599

---

# Source: .\node_modules\use-latest\README.md

- Preview: # use-latest A React helper hook for storing latest value in ref object (updated in useEffect's callback).
- Lines: 6
- Characters: 105

---

# Source: .\node_modules\use-sidecar\README.md

- Preview: <div align="center"> <h1>🏎 side car</h1> <br/> Alternative way to code splitting <br/> <a href="https://www.npmjs.com/package/use-sidecar"> <img src="https://img.shields.io/npm/v/use-sidecar.svg?style=flat-square" /> </a> <a href="https://travis-ci.org/theKashey/use-sidecar"> <img src="https://img.shields.io/travis/theKashey/use-sidecar.svg?style=flat-square" alt="Build status"> </a> <a href="htt
- Lines: 352
- Characters: 10847

---

# Source: .\node_modules\use-sync-external-store\README.md

- Preview: # use-sync-external-store Backwards-compatible shim for [`React.useSyncExternalStore`](https://reactjs.org/docs/hooks-reference.html#usesyncexternalstore). Works with any React that supports Hooks. See also https://github.com/reactwg/react-18/discussions/86.
- Lines: 8
- Characters: 256

---

# Source: .\node_modules\util-deprecate\History.md

- Preview: 1.0.2 / 2015-10-07 ================== * use try/catch when checking `localStorage` (#3, @kumavis) 1.0.1 / 2014-11-25 ================== * browser: use `console.warn()` for deprecation calls * browser: more jsdocs 1.0.0 / 2014-04-30 ================== * initial commit
- Lines: 19
- Characters: 266

---

# Source: .\node_modules\util-deprecate\README.md

- Preview: util-deprecate ============== ### The Node.js `util.deprecate()` function with browser support In Node.js, this module simply re-exports the `util.deprecate()` function. In the web browser (i.e. via browserify), a browser-specific implementation of the `util.deprecate()` function is used. ## API A `deprecate()` function is the only thing exposed by this module. ``` javascript // setup: exports.foo
- Lines: 56
- Characters: 1613

---

# Source: .\node_modules\uuid\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines. ### [8.3.2](https://github.com/uuidjs/uuid/compare/v8.3.1...v8.3.2) (2020-12-08) ### Bug Fixes - lazy load getRandomValues ([#537](https://github.com/uuidjs/uuid/issues/537)) ([16c8f6d](https://github.com/uuidjs/u
- Lines: 232
- Characters: 12445

---

# Source: .\node_modules\uuid\CONTRIBUTING.md

- Preview: # Contributing Please feel free to file GitHub Issues or propose Pull Requests. We're always happy to discuss improvements to this library! ## Testing ```shell npm test ``` ## Releasing Releases are supposed to be done from master, version bumping is automated through [`standard-version`](https://github.com/conventional-changelog/standard-version): ```shell npm run release -- --dry-run  # verify o
- Lines: 21
- Characters: 495

---

# Source: .\node_modules\uuid\LICENSE.md

- Preview: The MIT License (MIT) Copyright (c) 2010-2020 Robert Kieffer and other contributors Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
- Lines: 12
- Characters: 1100

---

# Source: .\node_modules\uuid\README.md

- Preview: <!-- -- This file is auto-generated from README_js.md. Changes should be made there. --> # uuid [![CI](https://github.com/uuidjs/uuid/workflows/CI/badge.svg)](https://github.com/uuidjs/uuid/actions?query=workflow%3ACI) [![Browser](https://github.com/uuidjs/uuid/workflows/Browser/badge.svg)](https://github.com/uuidjs/uuid/actions?query=workflow%3ABrowser) For the creation of [RFC4122](http://www.ie
- Lines: 508
- Characters: 16020

---

# Source: .\node_modules\validate-npm-package-license\README.md

- Preview: validate-npm-package-license ============================ Give me a string and I'll tell you if it's a valid npm package license string. ```javascript var valid = require('validate-npm-package-license'); ``` SPDX license identifiers are valid license strings: ```javascript var assert = require('assert'); var validSPDXExpression = { validForNewPackages: true, validForOldPackages: true, spdx: true }
- Lines: 116
- Characters: 2453

---

# Source: .\node_modules\vary\HISTORY.md

- Preview: 1.1.2 / 2017-09-23 ================== * perf: improve header token parsing speed 1.1.1 / 2017-03-20 ================== * perf: hoist regular expression 1.1.0 / 2015-09-29 ================== * Only accept valid field names in the `field` argument - Ensures the resulting string is a valid HTTP header value 1.0.1 / 2015-07-08 ================== * Fix setting empty header from empty `field` * perf: en
- Lines: 42
- Characters: 753

---

# Source: .\node_modules\vary\README.md

- Preview: # vary [![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url] [![Node.js Version][node-version-image]][node-version-url] [![Build Status][travis-image]][travis-url] [![Test Coverage][coveralls-image]][coveralls-url] Manipulate the HTTP Vary header ## Installation This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npm
- Lines: 104
- Characters: 2615

---

# Source: .\node_modules\vfile\readme.md

- Preview: <h1> <img src="https://raw.githubusercontent.com/vfile/vfile/fc8164b/logo.svg?sanitize=true" alt="vfile" /> </h1> [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] **vfile** is a small and browser f
- Lines: 788
- Characters: 21701

---

# Source: .\node_modules\vfile-location\readme.md

- Preview: # vfile-location [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] [![Sponsors][sponsors-badge]][collective] [![Backers][backers-badge]][collective] [![Chat][chat-badge]][chat] [vfile][] utility to convert between positional (line and column-based) and offsets (range-based) locations. ## Contents * [What is
- Lines: 190
- Characters: 4694

---

# Source: .\node_modules\vfile-message\readme.md

- Preview: # vfile-message [![Build][badge-build-image]][badge-build-url] [![Coverage][badge-coverage-image]][badge-coverage-url] [![Downloads][badge-downloads-image]][badge-downloads-url] [![Size][badge-size-image]][badge-size-url] Create [vfile][github-vfile] messages. ## Contents * [What is this?](#what-is-this) * [When should I use this?](#when-should-i-use-this) * [Install](#install) * [Use](#use) * [AP
- Lines: 255
- Characters: 6660

---

# Source: .\node_modules\vite\LICENSE.md

- Preview: # Vite core license Vite is released under the MIT license: MIT License Copyright (c) 2019-present, VoidZero Inc. and Vite contributors Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, pub
- Lines: 2409
- Characters: 113204

---

# Source: .\node_modules\vite\README.md

- Preview: # vite ⚡ > Next Generation Frontend Tooling - 💡 Instant Server Start - ⚡️ Lightning Fast HMR - 🛠️ Rich Features - 📦 Optimized Build - 🔩 Universal Plugin Interface - 🔑 Fully Typed APIs Vite (French word for "fast", pronounced `/vit/`) is a new breed of frontend build tool that significantly improves the frontend development experience. It consists of two major parts: - A dev server that serves
- Lines: 23
- Characters: 1114

---

# Source: .\node_modules\vite-node\node_modules\@esbuild\win32-x64\README.md

- Preview: # esbuild This is the Windows 64-bit binary for esbuild, a JavaScript bundler and minifier. See https://github.com/evanw/esbuild for details.
- Lines: 6
- Characters: 140

---

# Source: .\node_modules\vite-node\node_modules\esbuild\LICENSE.md

- Preview: MIT License Copyright (c) 2020 Evan Wallace Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\vite-node\node_modules\esbuild\README.md

- Preview: # esbuild This is a JavaScript bundler and minifier. See https://github.com/evanw/esbuild and the [JavaScript API documentation](https://esbuild.github.io/api/) for details.
- Lines: 6
- Characters: 172

---

# Source: .\node_modules\vite-node\node_modules\vite\LICENSE.md

- Preview: # Vite core license Vite is released under the MIT license: MIT License Copyright (c) 2019-present, VoidZero Inc. and Vite contributors Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, pub
- Lines: 3426
- Characters: 158973

---

# Source: .\node_modules\vite-node\node_modules\vite\README.md

- Preview: # vite ⚡ > Next Generation Frontend Tooling - 💡 Instant Server Start - ⚡️ Lightning Fast HMR - 🛠️ Rich Features - 📦 Optimized Build - 🔩 Universal Plugin Interface - 🔑 Fully Typed APIs Vite (French word for "fast", pronounced `/vit/`) is a new breed of frontend build tool that significantly improves the frontend development experience. It consists of two major parts: - A dev server that serves
- Lines: 23
- Characters: 1114

---

# Source: .\node_modules\vite-node\README.md

- Preview: <p align="center"> <img src="https://github.com/vitest-dev/vitest/blob/main/packages/vite-node/assets/vite-node.svg?raw=true" height="120"> </p> <h1 align="center"> vite-node </h1> <p align="center"> Vite as Node runtime.<br>The engine that powers <a href="https://github.com/vitest-dev/vitest">Vitest</a> and <a href="https://github.com/nuxt/framework">Nuxt 3 Dev SSR</a>. <p> <p align="center"> <a
- Lines: 192
- Characters: 5033

---

# Source: .\node_modules\vitest\LICENSE.md

- Preview: # Vitest core license Vitest is released under the MIT license: MIT License Copyright (c) 2021-Present Vitest Team Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sub
- Lines: 1526
- Characters: 76888

---

# Source: .\node_modules\vitest\node_modules\@esbuild\win32-x64\README.md

- Preview: # esbuild This is the Windows 64-bit binary for esbuild, a JavaScript bundler and minifier. See https://github.com/evanw/esbuild for details.
- Lines: 6
- Characters: 140

---

# Source: .\node_modules\vitest\node_modules\@vitest\expect\README.md

- Preview: # @vitest/expect Jest's expect matchers as a Chai plugin. ## Usage ```js import { JestAsymmetricMatchers, JestChaiExpect, JestExtend, } from '@vitest/expect' import * as chai from 'chai' // allows using expect.extend instead of chai.use to extend plugins chai.use(JestExtend) // adds all jest matchers to expect chai.use(JestChaiExpect) // adds asymmetric matchers like stringContaining, objectContai
- Lines: 24
- Characters: 431

---

# Source: .\node_modules\vitest\node_modules\@vitest\mocker\README.md

- Preview: # @vitest/mocker Vitest's module mocker implementation. [GitHub](https://github.com/vitest-dev/vitest/blob/main/packages/mocker/) | [Documentation](https://github.com/vitest-dev/vitest/blob/main/packages/mocker/EXPORTS.md)
- Lines: 8
- Characters: 220

---

# Source: .\node_modules\vitest\node_modules\@vitest\spy\README.md

- Preview: # @vitest/spy Lightweight Jest compatible spy implementation.
- Lines: 6
- Characters: 60

---

# Source: .\node_modules\vitest\node_modules\esbuild\LICENSE.md

- Preview: MIT License Copyright (c) 2020 Evan Wallace Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to w
- Lines: 24
- Characters: 1048

---

# Source: .\node_modules\vitest\node_modules\esbuild\README.md

- Preview: # esbuild This is a JavaScript bundler and minifier. See https://github.com/evanw/esbuild and the [JavaScript API documentation](https://esbuild.github.io/api/) for details.
- Lines: 6
- Characters: 172

---

# Source: .\node_modules\vitest\node_modules\estree-walker\README.md

- Preview: # estree-walker Simple utility for walking an [ESTree](https://github.com/estree/estree)-compliant AST, such as one generated by [acorn](https://github.com/marijnh/acorn). ## Installation ```bash npm i estree-walker ``` ## Usage ```js var walk = require('estree-walker').walk; var acorn = require('acorn'); ast = acorn.parse(sourceCode, options); // https://github.com/acornjs/acorn walk(ast, { enter
- Lines: 51
- Characters: 1543

---

# Source: .\node_modules\vitest\node_modules\tinyrainbow\README.md

- Preview: # tinyrainbow Output your colorful messages in the terminal or browser console that support ANSI colors (Chrome engines). A small (`~ 6 kB` unpacked) fork of [picocolors](https://www.npmjs.com/package/picocolors) with support for `exports` field. Supports only ESM. ## Installing ```bash # with npm $ npm install -D tinyrainbow # with pnpm $ pnpm add -D tinyrainbow # with yarn $ yarn add -D tinyrain
- Lines: 31
- Characters: 480

---

# Source: .\node_modules\vitest\node_modules\tinyspy\README.md

- Preview: # tinyspy > minimal fork of nanospy, with more features 🕵🏻‍♂️ A `10KB` package for minimal and easy testing with no dependencies. This package was created for having a tiny spy library to use in `vitest`, but it can also be used in `jest` and other test environments. _In case you need more tiny libraries like tinypool or tinyspy, please consider submitting an [RFC](https://github.com/tinylibs/rf
- Lines: 14
- Characters: 477

---

# Source: .\node_modules\vitest\node_modules\vite\LICENSE.md

- Preview: # Vite core license Vite is released under the MIT license: MIT License Copyright (c) 2019-present, VoidZero Inc. and Vite contributors Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, pub
- Lines: 3426
- Characters: 158973

---

# Source: .\node_modules\vitest\node_modules\vite\README.md

- Preview: # vite ⚡ > Next Generation Frontend Tooling - 💡 Instant Server Start - ⚡️ Lightning Fast HMR - 🛠️ Rich Features - 📦 Optimized Build - 🔩 Universal Plugin Interface - 🔑 Fully Typed APIs Vite (French word for "fast", pronounced `/vit/`) is a new breed of frontend build tool that significantly improves the frontend development experience. It consists of two major parts: - A dev server that serves
- Lines: 23
- Characters: 1114

---

# Source: .\node_modules\vitest\README.md

- Preview: # vitest [![NPM version](https://img.shields.io/npm/v/vitest?color=a1b858&label=)](https://www.npmjs.com/package/vitest) Next generation testing framework powered by Vite. [GitHub](https://github.com/vitest-dev/vitest) | [Documentation](https://vitest.dev/)
- Lines: 10
- Characters: 254

---

# Source: .\node_modules\w3c-keyname\README.md

- Preview: # W3C keyname Tiny library that exports a function `keyName` that takes a keyboard event and returns a [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key)-style string. Will use the actual `key` property of the event if available, and fall back to a value synthesized from the `keyCode` otherwise. Probably often wrong on non-US keyboards, since the corresponden
- Lines: 21
- Characters: 717

---

# Source: .\node_modules\w3c-xmlserializer\LICENSE.md

- Preview: The MIT License (MIT) ===================== Copyright © Sebastian Mayr Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
- Lines: 28
- Characters: 1071

---

# Source: .\node_modules\w3c-xmlserializer\README.md

- Preview: # w3c-xmlserializer An XML serializer that follows the [W3C specification](https://w3c.github.io/DOM-Parsing/). This package can be used in Node.js, as long as you feed it a DOM node, e.g. one produced by [jsdom](https://github.com/jsdom/jsdom). ## Basic usage Assume you have a DOM tree rooted at a node `node`. In Node.js, you could create this using [jsdom](https://github.com/jsdom/jsdom) as foll
- Lines: 44
- Characters: 1648

---

# Source: .\node_modules\webidl-conversions\LICENSE.md

- Preview: # The BSD 2-Clause License Copyright (c) 2014, Domenic Denicola All rights reserved. Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met: 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer. 2. Redistributions in binary form must repro
- Lines: 15
- Characters: 1311

---

# Source: .\node_modules\webidl-conversions\README.md

- Preview: # Web IDL Type Conversions on JavaScript Values This package implements, in JavaScript, the algorithms to convert a given JavaScript value according to a given [Web IDL](http://heycam.github.io/webidl/) [type](http://heycam.github.io/webidl/#idl-types). The goal is that you should be able to write code like ```js "use strict"; const conversions = require("webidl-conversions"); function doStuff(x,
- Lines: 102
- Characters: 9101

---

# Source: .\node_modules\web-namespaces\readme.md

- Preview: # web-namespaces [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Map of web namespaces. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`webNamespaces`](#webnamespaces) *   [Types](#types) *
- Lines: 159
- Characters: 3598

---

# Source: .\node_modules\webpack-virtual-modules\README.md

- Preview: # Webpack Virtual Modules [![npm version][npm-version-src]][npm-version-href] [![npm downloads][npm-downloads-src]][npm-downloads-href] [![License][license-src]][license-href] **Webpack Virtual Modules** is a plugin that allows for dynamical generation of in-memory virtual modules for JavaScript builds created with webpack. When virtual module is created all the parent virtual dirs that lead to th
- Lines: 134
- Characters: 4492

---

# Source: .\node_modules\whatwg-encoding\README.md

- Preview: # Decode According to the WHATWG Encoding Standard This package provides a thin layer on top of [iconv-lite](https://github.com/ashtuchkin/iconv-lite) which makes it expose some of the same primitives as the [Encoding Standard](https://encoding.spec.whatwg.org/). ```js const whatwgEncoding = require("whatwg-encoding"); console.assert(whatwgEncoding.labelToName("latin1") === "windows-1252"); consol
- Lines: 53
- Characters: 2966

---

# Source: .\node_modules\whatwg-mimetype\README.md

- Preview: # Parse, serialize, and manipulate MIME types This package will parse [MIME types](https://mimesniff.spec.whatwg.org/#understanding-mime-types) into a structured format, which can then be manipulated and serialized: ```js const MIMEType = require("whatwg-mimetype"); const mimeType = new MIMEType(`Text/HTML;Charset="utf-8"`); console.assert(mimeType.toString() === "text/html;charset=utf-8"); consol
- Lines: 104
- Characters: 5444

---

# Source: .\node_modules\whatwg-url\README.md

- Preview: # whatwg-url whatwg-url is a full implementation of the WHATWG [URL Standard](https://url.spec.whatwg.org/). It can be used standalone, but it also exposes a lot of the internal algorithms that are useful for integrating a URL parser into a project like [jsdom](https://github.com/jsdom/jsdom). ## Specification conformance whatwg-url is currently up to date with the URL spec up to commit [6c78200](
- Lines: 109
- Characters: 6959

---

# Source: .\node_modules\which\CHANGELOG.md

- Preview: # Changes ## 2.0.2 * Rename bin to `node-which` ## 2.0.1 * generate changelog and publish on version bump * enforce 100% test coverage * Promise interface ## 2.0.0 * Parallel tests, modern JavaScript, and drop support for node < 8 ## 1.3.1 * update deps * update travis ## v1.3.0 * Add nothrow option to which.sync * update tap ## v1.2.14 * appveyor: drop node 5 and 0.x * travis-ci: add node 6, drop
- Lines: 169
- Characters: 2501

---

# Source: .\node_modules\which\README.md

- Preview: # which Like the unix `which` utility. Finds the first instance of a specified executable in the PATH environment variable.  Does not cache the results, so `hash -r` is not needed when the PATH changes. ## USAGE ```javascript var which = require('which') // async usage which('node', function (er, resolvedPath) { // er is returned if no "node" is found on the PATH // if it is found, then the absolu
- Lines: 57
- Characters: 1298

---

# Source: .\node_modules\which-boxed-primitive\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.1](https://github.com/inspect-js/which-boxed-primitive/compare/v1.1.0...v1.1.1) - 2024-12-15 ### Commits - [Deps] update `is-boolean-object`,
- Lines: 85
- Characters: 9038

---

# Source: .\node_modules\which-boxed-primitive\README.md

- Preview: # which-boxed-primitive <sup>[![Version Badge][2]][1]</sup> [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Which kind of boxed JS primitive is this? This module works cross-realm/iframe, does not depend on `instanceof` or mutable properties, and works despite ES6 Symbol.toSt
- Lines: 76
- Characters: 2998

---

# Source: .\node_modules\which-builtin-type\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.2.1](https://github.com/inspect-js/which-builtin-type/compare/v1.2.0...v1.2.1) - 2024-12-12 ### Commits - [meta] sort package.json [`8305bf9`](h
- Lines: 116
- Characters: 11411

---

# Source: .\node_modules\which-builtin-type\README.md

- Preview: # which-builtin-type <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] What is the type of this builtin JavaScript value? Works cross-realm, without `instanceof`, and ca
- Lines: 70
- Characters: 3440

---

# Source: .\node_modules\which-collection\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.0.2](https://github.com/inspect-js/which-collection/compare/v1.0.1...v1.0.2) - 2024-03-08 ### Commits - [actions] reuse common workflows [`a5b29
- Lines: 66
- Characters: 6903

---

# Source: .\node_modules\which-collection\README.md

- Preview: # which-collection <sup>[![Version Badge][2]][1]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][5]][6] [![dev dependency status][7]][8] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][11]][1] Which kind of Collection (Map, Set, WeakMap, WeakSet) is this JavaScript value? Wor
- Lines: 68
- Characters: 2838

---

# Source: .\node_modules\which-typed-array\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). ## [v1.1.19](https://github.com/inspect-js/which-typed-array/compare/v1.1.18...v1.1.19) - 2025-03-08 ### Commits - [Refactor] use `get-proto`, improve
- Lines: 264
- Characters: 25136

---

# Source: .\node_modules\which-typed-array\README.md

- Preview: # which-typed-array <sup>[![Version Badge][npm-version-svg]][package-url]</sup> [![github actions][actions-image]][actions-url] [![coverage][codecov-image]][codecov-url] [![dependency status][deps-svg]][deps-url] [![dev dependency status][dev-deps-svg]][dev-deps-url] [![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] [![npm badge][npm-badge-png]][package-url] W
- Lines: 73
- Characters: 3398

---

# Source: .\node_modules\why-is-node-running\README.md

- Preview: # why-is-node-running Node is running but you don't know why? `why-is-node-running` is here to help you. ## Installation Node 8 and above: ```bash npm i why-is-node-running -g ``` Earlier Node versions (no longer supported): ```bash npm i why-is-node-running@v1.x -g ``` ## Usage ```js const log = require('why-is-node-running') // should be your first require const net = require('net') function cre
- Lines: 107
- Characters: 2430

---

# Source: .\node_modules\wmf\README.md

- Preview: # js-wmf Processor for Windows MetaFile (WMF) files in JS (for the browser and nodejs). ## Installation With [npm](https://www.npmjs.org/package/wmf): ```bash $ npm install wmf ``` In the browser: ```html <script src="wmf.js"></script> ``` The browser exposes a variable `WMF`. ## Usage The `data` argument is expected to be an `ArrayBuffer`, `Uint8Array` or `Buffer` - `WMF.image_size(data)` extract
- Lines: 95
- Characters: 1865

---

# Source: .\node_modules\word\CONTRIBUTING.md

- Preview: # Contributing The WordJS Libraries should be free and clear to use in your projects.  In order to maintain that, every contributor must be vigilant. There have been many projects in the past that have been very lax regarding licensing, and we are of the opinion that those are ticking timebombs and that no corporate product should depend on them. # Required Reading These are pretty short reads and
- Lines: 64
- Characters: 2071

---

# Source: .\node_modules\word\README.md

- Preview: # [SheetJS js-word](http://wordjs.com)
- Lines: 5
- Characters: 38

---

# Source: .\node_modules\word-wrap\README.md

- Preview: # word-wrap [![NPM version](https://img.shields.io/npm/v/word-wrap.svg?style=flat)](https://www.npmjs.com/package/word-wrap) [![NPM monthly downloads](https://img.shields.io/npm/dm/word-wrap.svg?style=flat)](https://npmjs.org/package/word-wrap) [![NPM total downloads](https://img.shields.io/npm/dt/word-wrap.svg?style=flat)](https://npmjs.org/package/word-wrap) [![Linux Build Status](https://img.sh
- Lines: 204
- Characters: 6129

---

# Source: .\node_modules\wrap-ansi\node_modules\ansi-styles\readme.md

- Preview: # ansi-styles > [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code#Colors_and_Styles) for styling strings in the terminal You probably want the higher-level [chalk](https://github.com/chalk/chalk) module for styling your strings. ![](screenshot.png) ## Install ```sh npm install ansi-styles ``` ## Usage ```js import styles from 'ansi-styles'; console.log(`${styles.green.open}Hello w
- Lines: 176
- Characters: 4735

---

# Source: .\node_modules\wrap-ansi\readme.md

- Preview: # wrap-ansi > Wordwrap a string with [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code#Colors_and_Styles) ## Install ``` $ npm install wrap-ansi ``` ## Usage ```js import chalk from 'chalk'; import wrapAnsi from 'wrap-ansi'; const input = 'The quick brown ' + chalk.red('fox jumped over ') + 'the lazy ' + chalk.green('dog and then ran away with the unicorn.'); console.log(wrapAnsi(
- Lines: 93
- Characters: 2372

---

# Source: .\node_modules\wrap-ansi-cjs\node_modules\emoji-regex\README.md

- Preview: # emoji-regex [![Build status](https://travis-ci.org/mathiasbynens/emoji-regex.svg?branch=master)](https://travis-ci.org/mathiasbynens/emoji-regex) _emoji-regex_ offers a regular expression to match all emoji symbols (including textual representations of emoji) as per the Unicode Standard. This repository contains a script that generates this regular expression based on [the data from Unicode v12]
- Lines: 76
- Characters: 2562

---

# Source: .\node_modules\wrap-ansi-cjs\node_modules\string-width\readme.md

- Preview: # string-width > Get the visual width of a string - the number of columns required to display it Some Unicode characters are [fullwidth](https://en.wikipedia.org/wiki/Halfwidth_and_fullwidth_forms) and use double the normal width. [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) are stripped and doesn't affect the width. Useful to be able to measure the actual width of command-l
- Lines: 52
- Characters: 1339

---

# Source: .\node_modules\wrap-ansi-cjs\node_modules\strip-ansi\readme.md

- Preview: # strip-ansi [![Build Status](https://travis-ci.org/chalk/strip-ansi.svg?branch=master)](https://travis-ci.org/chalk/strip-ansi) > Strip [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) from a string ## Install ``` $ npm install strip-ansi ``` ## Usage ```js const stripAnsi = require('strip-ansi'); stripAnsi('\u001B[4mUnicorn\u001B[0m'); //=> 'Unicorn' stripAnsi('\u001B]8;;https
- Lines: 49
- Characters: 1553

---

# Source: .\node_modules\wrap-ansi-cjs\readme.md

- Preview: # wrap-ansi [![Build Status](https://travis-ci.com/chalk/wrap-ansi.svg?branch=master)](https://travis-ci.com/chalk/wrap-ansi) [![Coverage Status](https://coveralls.io/repos/github/chalk/wrap-ansi/badge.svg?branch=master)](https://coveralls.io/github/chalk/wrap-ansi?branch=master) > Wordwrap a string with [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code#Colors_and_Styles) ## Insta
- Lines: 93
- Characters: 2651

---

# Source: .\node_modules\wrappy\README.md

- Preview: # wrappy Callback wrapping utility ## USAGE ```javascript var wrappy = require("wrappy") // var wrapper = wrappy(wrapperFunction) // make sure a cb is called only once // See also: http://npm.im/once for this specific use case var once = wrappy(function (cb) { var called = false return function () { if (called) return called = true return cb.apply(this, arguments) } }) function printBoo () { conso
- Lines: 39
- Characters: 649

---

# Source: .\node_modules\ws\README.md

- Preview: # ws: a Node.js WebSocket library [![Version npm](https://img.shields.io/npm/v/ws.svg?logo=npm)](https://www.npmjs.com/package/ws) [![CI](https://img.shields.io/github/actions/workflow/status/websockets/ws/ci.yml?branch=master&label=CI&logo=github)](https://github.com/websockets/ws/actions?query=workflow%3ACI+branch%3Amaster) [![Coverage Status](https://img.shields.io/coveralls/websockets/ws/maste
- Lines: 551
- Characters: 14758

---

# Source: .\node_modules\xlsx\CHANGELOG.md

- Preview: # CHANGELOG This log is intended to keep track of backwards-incompatible changes, including but not limited to API changes and file location changes.  Minor behavioral changes may not be included if they are not expected to break existing code. ## v0.18.5 * Enabled `sideEffects: false` in package.json * Basic NUMBERS write support ## v0.18.4 * CSV output omits trailing record separator * Properly
- Lines: 267
- Characters: 6148

---

# Source: .\node_modules\xlsx\README.md

- Preview: # [SheetJS](https://sheetjs.com) The SheetJS Community Edition offers battle-tested open-source solutions for extracting useful data from almost any complex spreadsheet and generating new spreadsheets that will work with legacy and modern software alike. [SheetJS Pro](https://sheetjs.com/pro) offers solutions beyond data processing: Edit complex templates with ease; let out your inner Picasso with
- Lines: 4507
- Characters: 156815

---

# Source: .\node_modules\xmlchars\README.md

- Preview: Utilities for determining whether characters belong to character classes defined by the XML specs. ## Organization It used to be that the library was contained in a single file and you could just import/require/what-have-you the `xmlchars` module. However, that setup did not work well for people who cared about code optimization. Importing `xmlchars` meant importing *all* of the library and becaus
- Lines: 36
- Characters: 1340

---

# Source: .\node_modules\xml-name-validator\README.md

- Preview: # Validate XML Names and Qualified Names This package simply tells you whether or not a string matches the [`Name`](http://www.w3.org/TR/xml/#NT-Name) or [`QName`](http://www.w3.org/TR/xml-names/#NT-QName) productions in the XML Namespaces specification. We use it for implementing the [validate](https://dom.spec.whatwg.org/#validate) algorithm in jsdom, but you can use it for whatever you want. ##
- Lines: 38
- Characters: 964

---

# Source: .\node_modules\xtend\README.md

- Preview: # xtend [![browser support][3]][4] [![locked](http://badges.github.io/stability-badges/dist/locked.svg)](http://github.com/badges/stability-badges) Extend like a boss xtend is a basic utility library which allows you to extend an object by appending all of the properties from each object in a list. When there are identical properties, the right-most property takes precedence. ## Examples ```js var
- Lines: 35
- Characters: 694

---

# Source: .\node_modules\y18n\CHANGELOG.md

- Preview: # Change Log All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines. ### [5.0.8](https://www.github.com/yargs/y18n/compare/v5.0.7...v5.0.8) (2021-04-07) ### Bug Fixes * **deno:** force modern release for Deno ([b1c215a](https://www.github.com/yargs/y18n/commit/b1c215aed714bee5830e
- Lines: 103
- Characters: 3809

---

# Source: .\node_modules\y18n\README.md

- Preview: # y18n [![NPM version][npm-image]][npm-url] [![js-standard-style][standard-image]][standard-url] [![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org) The bare-bones internationalization library used by yargs. Inspired by [i18n](https://www.npmjs.com/package/i18n). ## Examples _simple string translation:_ ```js const __ = r
- Lines: 130
- Characters: 3088

---

# Source: .\node_modules\yallist\README.md

- Preview: # yallist Yet Another Linked List There are many doubly-linked list implementations like it, but this one is mine. For when an array would be too big, and a Map can't be iterated in reverse order. [![Build Status](https://travis-ci.org/isaacs/yallist.svg?branch=master)](https://travis-ci.org/isaacs/yallist) [![Coverage Status](https://coveralls.io/repos/isaacs/yallist/badge.svg?service=github)](ht
- Lines: 207
- Characters: 4513

---

# Source: .\node_modules\yargs\node_modules\emoji-regex\README.md

- Preview: # emoji-regex [![Build status](https://travis-ci.org/mathiasbynens/emoji-regex.svg?branch=master)](https://travis-ci.org/mathiasbynens/emoji-regex) _emoji-regex_ offers a regular expression to match all emoji symbols (including textual representations of emoji) as per the Unicode Standard. This repository contains a script that generates this regular expression based on [the data from Unicode v12]
- Lines: 76
- Characters: 2562

---

# Source: .\node_modules\yargs\node_modules\string-width\readme.md

- Preview: # string-width > Get the visual width of a string - the number of columns required to display it Some Unicode characters are [fullwidth](https://en.wikipedia.org/wiki/Halfwidth_and_fullwidth_forms) and use double the normal width. [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) are stripped and doesn't affect the width. Useful to be able to measure the actual width of command-l
- Lines: 52
- Characters: 1339

---

# Source: .\node_modules\yargs\node_modules\strip-ansi\readme.md

- Preview: # strip-ansi [![Build Status](https://travis-ci.org/chalk/strip-ansi.svg?branch=master)](https://travis-ci.org/chalk/strip-ansi) > Strip [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) from a string ## Install ``` $ npm install strip-ansi ``` ## Usage ```js const stripAnsi = require('strip-ansi'); stripAnsi('\u001B[4mUnicorn\u001B[0m'); //=> 'Unicorn' stripAnsi('\u001B]8;;https
- Lines: 49
- Characters: 1553

---

# Source: .\node_modules\yargs\README.md

- Preview: <p align="center"> <img width="250" src="https://raw.githubusercontent.com/yargs/yargs/main/yargs-logo.png"> </p> <h1 align="center"> Yargs </h1> <p align="center"> <b >Yargs be a node.js library fer hearties tryin' ter parse optstrings</b> </p> <br> ![ci](https://github.com/yargs/yargs/workflows/ci/badge.svg) [![NPM version][npm-image]][npm-url] [![js-standard-style][standard-image]][standard-url
- Lines: 207
- Characters: 5770

---

# Source: .\node_modules\yargs-parser\CHANGELOG.md

- Preview: # Changelog All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines. ## [21.1.1](https://github.com/yargs/yargs-parser/compare/yargs-parser-v21.1.0...yargs-parser-v21.1.1) (2022-08-04) ### Bug Fixes * **typescript:** ignore .cts files during publish ([#454](https://github.com/yargs
- Lines: 311
- Characters: 16142

---

# Source: .\node_modules\yargs-parser\README.md

- Preview: # yargs-parser ![ci](https://github.com/yargs/yargs-parser/workflows/ci/badge.svg) [![NPM version](https://img.shields.io/npm/v/yargs-parser.svg)](https://www.npmjs.com/package/yargs-parser) [![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org) ![nycrc config on GitHub](https://img.shields.io/nycrc/yargs/yargs-parser) The m
- Lines: 521
- Characters: 11398

---

# Source: .\node_modules\yjs\README.md

- Preview: # ![Yjs](https://yjs.dev/images/logo/yjs-120x120.png) > A CRDT framework with a powerful abstraction of shared data Yjs is a [CRDT implementation](#yjs-crdt-algorithm) that exposes its internal data structure as *shared types*. Shared types are common data types like `Map` or `Array` with superpowers: changes are automatically distributed to other peers and merged without merge conflicts. Yjs is *
- Lines: 1371
- Characters: 56767

---

# Source: .\node_modules\yocto-queue\readme.md

- Preview: # yocto-queue [![](https://badgen.net/bundlephobia/minzip/yocto-queue)](https://bundlephobia.com/result?p=yocto-queue) > Tiny queue data structure You should use this package instead of an array if you do a lot of `Array#push()` and `Array#shift()` on large arrays, since `Array#shift()` has [linear time complexity](https://medium.com/@ariel.salem1989/an-easy-to-use-guide-to-big-o-time-complexity-5
- Lines: 83
- Characters: 2471

---

# Source: .\node_modules\y-prosemirror\README.md

- Preview: # y-prosemirror > [ProseMirror](http://prosemirror.net/) Binding for [Yjs](https://github.com/yjs/yjs) - [Demo](https://demos.yjs.dev/prosemirror/prosemirror.html) This binding maps a Y.XmlFragment to the ProseMirror state. ## Features * Sync ProseMirror state * Shared Cursors * Shared Undo / Redo (each client has its own undo-/redo-history) * Successfully recovers when concurrents edit result in
- Lines: 208
- Characters: 6278

---

# Source: .\node_modules\y-protocols\README.md

- Preview: # Yjs Protocols > Binary encoding protocols for *syncing*, *awareness*, and *history information* This API is unstable and subject to change. ## API ### Awareness Protocol ```js import * as awarenessProtocol from 'y-protocols/awareness.js' ``` The Awareness protocol implements a simple network agnostic algorithm that manages user status (who is online?) and propagate awareness information like cur
- Lines: 80
- Characters: 2736

---

# Source: .\node_modules\zod\README.md

- Preview: <p align="center"> <img src="logo.svg" width="200px" align="center" alt="Zod logo" /> <h1 align="center">Zod</h1> <p align="center"> TypeScript-first schema validation with static type inference <br/> by <a href="https://x.com/colinhacks">@colinhacks</a> </p> </p> <br/> <p align="center"> <a href="https://github.com/colinhacks/zod/actions?query=branch%3Amaster"><img src="https://github.com/colinha
- Lines: 211
- Characters: 6025

---

# Source: .\node_modules\zod-to-json-schema\changelog.md

- Preview: # Changelog | Version         | Change                                                                                                                                                                                                                                                                                                                                                                 | | -----
- Lines: 83
- Characters: 29651

---

# Source: .\node_modules\zod-to-json-schema\contributing.md

- Preview: # Contributing Hey, thanks for wanting to contribute. Before you open a PR, make sure to open an issue and discuss the problem you want to solve. I will not consider PRs without issues. I use [gitmoji](https://gitmoji.dev/) for my commit messages because I think it's fun. I encourage you to do the same, but won't enforce it. I check PRs and issues very rarely so please be patient.
- Lines: 12
- Characters: 379

---

# Source: .\node_modules\zod-to-json-schema\README.md

- Preview: # Zod to Json Schema [![NPM Version](https://img.shields.io/npm/v/zod-to-json-schema.svg)](https://npmjs.org/package/zod-to-json-schema) [![NPM Downloads](https://img.shields.io/npm/dw/zod-to-json-schema.svg)](https://npmjs.org/package/zod-to-json-schema) _Looking for the exact opposite? Check out [json-schema-to-zod](https://npmjs.org/package/json-schema-to-zod)_ ## Summary Does what it says on t
- Lines: 402
- Characters: 33256

---

# Source: .\node_modules\zod-to-json-schema\SECURITY.md

- Preview: # Security Policy ## Supported Versions | Version | Supported          | | ------- | ------------------ | | 3.9.x   | :white_check_mark: | | < 3.9   | :x:                | ## Reporting a Vulnerability Please log an issue [here](https://github.com/StefanTerdell/zod-to-json-schema/issues)
- Lines: 15
- Characters: 280

---

# Source: .\node_modules\zustand\readme.md

- Preview: <p align="center"> <img src="bear.jpg" /> </p> [![Build Status](https://img.shields.io/github/actions/workflow/status/pmndrs/zustand/lint-and-type.yml?branch=main&style=flat&colorA=000000&colorB=000000)](https://github.com/pmndrs/zustand/actions?query=workflow%3ALint) [![Build Size](https://img.shields.io/bundlephobia/minzip/zustand?label=bundle%20size&style=flat&colorA=000000&colorB=000000)](http
- Lines: 507
- Characters: 16664

---

# Source: .\node_modules\zwitch\readme.md

- Preview: # zwitch [![Build][build-badge]][build] [![Coverage][coverage-badge]][coverage] [![Downloads][downloads-badge]][downloads] [![Size][size-badge]][size] Handle values based on a field. ## Contents *   [What is this?](#what-is-this) *   [When should I use this?](#when-should-i-use-this) *   [Install](#install) *   [Use](#use) *   [API](#api) *   [`zwitch(key[, options])`](#zwitchkey-options) *   [`on
- Lines: 229
- Characters: 4667

---

# Source: .\ORCHESTRATION_FIX_COMPLETE.md

- Preview: # Orchestration Fix Complete ✅ ## Issue Summary The Fast Agent Panel was experiencing errors when using the coordinator agent with specialized agents: ``` ArgumentValidationError: Value does not match validator. Path: .threadId Value: "temp-sec-thread" Validator: v.id("threads") ``` ## Root Cause The specialized agent delegation tools were using **hardcoded temporary thread IDs** like: - `"temp-do
- Lines: 265
- Characters: 6965

---

# Source: .\ORCHESTRATION_IMPLEMENTATION_COMPLETE.md

- Preview: # Orchestration Implementation Complete ✅ ## Summary The Fast Agent Panel now **properly orchestrates workflows** using specialized agents through a coordinator pattern. ## What Changed ### Before (Monolithic Agent) ``` User Message ↓ streamAsync ↓ createChatAgent("gpt-5-chat-latest") ← Single agent with ALL 15+ tools ↓ Response ``` **Problems:** - ❌ All tools loaded in every request (high token c
- Lines: 438
- Characters: 10515

---

# Source: .\ORCHESTRATOR_ARCHITECTURE.md

- Preview: # Orchestrator Architecture ## 🏗️ **Multi-Agent Orchestration System** This document describes the hybrid orchestration architecture built for the NodeBench AI application. ## 📁 **Directory Structure** ``` convex/orchestrator/ ├── types.ts              # TypeScript type definitions ├── classifier.ts         # Query complexity classification ├── planner.ts           # Task decomposition and plann
- Lines: 253
- Characters: 6358

---

# Source: .\PARALLEL_TEST_RESULTS.md

- Preview: # Parallel Test Suite Results - 33 Tests ## 🎉 Major Achievement: All 33 Tests Running in Parallel! **Date**: October 15, 2025 **Test Suite**: Comprehensive Evaluation (33 tests) **Execution Mode**: **PARALLEL** (all tests run simultaneously) **Average Latency**: 4,768ms (~4.8 seconds) ## 📊 Overall Results | Metric | Value | |--------|-------| | **Total Tests** | 33 | | **Passed** | 9 (27.3%) | |
- Lines: 214
- Characters: 7808

---

# Source: .\PHASE1_PHASE2_COMPLETION_SUMMARY.md

- Preview: # Fast Agent Panel UX Enhancements - Phase 1 & 2 Completion ## ✅ Phase 1: Interactive Tool Result Popovers - COMPLETE **Commit:** `ea33324` ### What Was Built - **ToolResultPopover Component** (`src/components/FastAgentPanel/ToolResultPopover.tsx`) - Modal/popover overlay for displaying tool results - Tabbed interface: Result | Arguments | Error - Syntax highlighting for JSON/code - Copy-to-clipbo
- Lines: 205
- Characters: 6393

---

# Source: .\PHASE1_TOOL_RESULT_POPOVERS_GUIDE.md

- Preview: # Phase 1: Interactive Tool Result Popovers - Implementation Guide ## Overview Make tool names in the Agent Progress timeline clickable to open a popover displaying formatted tool results. ## Architecture ### Component Hierarchy ``` StepTimeline ├── TimelineStep (clickable tool name) │   └── onClick → setSelectedTool(toolName) └── ToolResultPopover ├── Modal/Popover overlay └── ToolOutputRenderer
- Lines: 262
- Characters: 6693

---

# Source: .\PHASE2_MEDIA_PREVIEW_GUIDE.md

- Preview: # Phase 2: Media Preview in Final Answer - Implementation Guide ## Overview Automatically detect and render media files (videos, images, SEC documents) mentioned in or attached to the final answer text. ## Current Implementation Analysis ### How ToolOutputRenderer Works The existing `ToolOutputRenderer` already extracts media using HTML comments: ```typescript // Extract YouTube gallery data const
- Lines: 305
- Characters: 8359

---

# Source: .\PRESENTATION_LAYER_IMPLEMENTATION_SUMMARY.md

- Preview: # Fast Agent Panel Presentation Layer - Implementation Summary ## ✅ Implementation Complete The Fast Agent Panel has been enhanced with a polished presentation layer that transforms raw agent output into a user-friendly interface while maintaining full transparency. ## 🎯 Goals Achieved ### 1. Video Results Enhancement ✅ - **Before**: Plain text URLs requiring manual copy-paste - **After**: Intera
- Lines: 226
- Characters: 8172

---

# Source: .\QUICK_TEST_REFERENCE.md

- Preview: # Quick Test Reference ## Run All Tests ```bash # Unix/Linux/Mac ./scripts/run-tests.sh # Windows scripts/run-tests.bat ``` ## Run Specific Tests ### Unit Tests ```bash npx vitest run --include "**/__tests__/mediaExtractor.test.ts" ``` ### Component Tests ```bash # VideoCard npx vitest run --include "**/__tests__/VideoCard.test.tsx" # SourceCard npx vitest run --include "**/__tests__/SourceCard.te
- Lines: 221
- Characters: 4205

---

# Source: .\QUICKTEST_UPDATED.md

- Preview: # QuickTest Updated for Coordinator Agent ✅ ## Summary The `convex/tools/evaluation/quickTest.ts` file has been updated to test the new coordinator agent orchestration system. ## Changes Made ### 1. Added YouTube Test to Quick Test Suite ```typescript const quickTests = [ "doc-001",    // findDocument "doc-002",    // getDocumentContent "media-001",  // searchMedia "task-001",   // listTasks "cal-
- Lines: 391
- Characters: 9178

---

# Source: .\README.md

- Preview: # NodeBench AI — Agent‑Managed Notebook & Document System > Collaborative, Notion‑like editor on **Convex + Chef + React/Vite** with **agentic workflows**, **timeline/trace observation**, and multi‑modal document support (PDF/Word/CSV/Markdown; audio/video via transcripts). [![Watch the demo](https://img.youtube.com/vi/XRYUUDNh4GQ/hqdefault.jpg)](https://www.youtube.com/watch?v=XRYUUDNh4GQ) ## Tab
- Lines: 249
- Characters: 9336

---

# Source: .\RELEASES.md

- Preview: # Release History ## v0.9.1 - Web.Fetch Template Validation & Cleanup (October 2025) **Commits:** 395c806, fb0b067 ### Critical Bug Fix - Fixed ENOENT error when `web.fetch` received unresolved template variables - Added comprehensive URL validation to detect `${...}` and `{{channel:...}}` patterns - Provides clear error messages before attempting file operations ### Enhancements - Added `maxBytes
- Lines: 136
- Characters: 3827

---

# Source: .\SEC_ENTITY_DISAMBIGUATION_COMPLETE.md

- Preview: # SEC Entity Disambiguation Implementation - COMPLETE ✅ ## Overview Successfully implemented a comprehensive entity disambiguation system with LLM validation and Human-in-the-Loop (HITL) confirmation for SEC filing searches. The system detects ambiguous company names, validates matches using an LLM judge, and prompts users for explicit confirmation when multiple companies pass validation. ## Imple
- Lines: 293
- Characters: 10750

---

# Source: .\SEC_FILING_TOOLS_GUIDE.md

- Preview: # SEC Filing Tools - User Guide ## Overview Your Fast Agent Panel now has **SEC EDGAR filing download capabilities**! You can search for, download, and analyze SEC filings (10-K, 10-Q, 8-K, etc.) using natural language voice commands. ## Available Tools ### 1. **searchSecFilings** - Search for SEC Filings Search for SEC EDGAR filings by company ticker or CIK number. **Voice Commands:** - "Find SEC
- Lines: 321
- Characters: 7994

---

# Source: .\SPECIALIZED_AGENTS_GUIDE.md

- Preview: # Specialized Agents Guide ## Overview The Fast Agent Panel now supports **specialized agents** that delegate complex tasks to domain-specific AI agents. This architecture provides: - **Better accuracy** - Each agent is optimized for its specific domain - **Reduced token usage** - Agents only have the tools and context they need - **Parallel processing** - Multiple agents can work simultaneously -
- Lines: 338
- Characters: 8717

---

# Source: .\src\components\context-file-design-reference.md

- Preview: <!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>AI Chat Panel Context Redesign - All File Types</title> <style> :root { --bg-primary: #ffffff; --bg-secondary: #f5f5f5; --bg-tertiary: #fafafa; --bg-hover: #f0f0f0; --text-primary: #1a1a1a; --text-secondary: #666666; --text-muted: #999999; --border-color: #e5
- Lines: 932
- Characters: 49872

---

# Source: .\src\components\DocumentsHub_Card_Design.md

- Preview: # Document Card Design System (rundown) Below is a concise map of the document-card element you pasted and how all visual + interactive parts work, with pointers to the source. This matches the hybrid card style we’ve been using. ## Structure (DOM + classes) - __Root wrapper__: - `div[role="button"][tabindex="0"]` with DnD attrs (`aria-roledescription="sortable"`) and inline `transform` styles fro
- Lines: 98
- Characters: 5440

---

# Source: .\src\components\Editor\Editor_Convex_Prosemirror_Instruction.md

- Preview: Convex ProseMirror Component npm version This is a Convex Component that syncs a ProseMirror document between clients via a Tiptap extension (that also works with BlockNote). Add a collaborative editor that syncs to the cloud. With this component, users can edit the same document in multiple tabs or devices, and the changes will be synced to the cloud. The data lives in your Convex database, and c
- Lines: 435
- Characters: 19088

---

# Source: .\src\components\editors\mini\README.md

- Preview: # Popover Mini Editors Canonical, compact editors for quick edits in popovers or hover previews. These are intentionally lightweight and safe to mount inside interactive popovers. ## Entry Point `PopoverMiniEditor.tsx` is the single entry component that routes to the right mini editor based on `kind`. ```tsx // usage <PopoverMiniEditor kind="task" taskId={taskId} onClose={close} /> <PopoverMiniEdi
- Lines: 76
- Characters: 2863

---

# Source: .\src\components\FastAgentPanel\CRITICAL_FIXES.md

- Preview: # Critical Architectural Fixes - Fast Agent Panel ## Issues Identified ### ✅ Issue 1: Multiple Goal Cards (FIXED) **Problem:** A new Goal Card was appearing for each sub-agent response, violating unified task log principle. **Root Cause:** GoalCard was rendered for ANY message with `toolParts.length > 1`, including child agent responses. **Fix Applied:** ```typescript // OLD: Showed for every mess
- Lines: 182
- Characters: 5115

---

# Source: .\src\components\FastAgentPanel\DEBUG_MESSAGES.md

- Preview: # Debug: Messages Not Showing ## Issue Chat area is empty despite messages being in the backend. ## Debugging Steps ### 1. Check Browser Console Look for these logs: ``` [UIMessageStream] Grouped messages: { total: X, filtered: Y, grouped: Z } [UIMessageStream] Keeping user message: ... [UIMessageStream] Filtering agent-generated sub-query: ... [FastAgentPanel] Messages updated: X messages ``` ###
- Lines: 166
- Characters: 4138

---

# Source: .\src\components\FastAgentPanel\ENHANCEMENTS_PHASE1.md

- Preview: # Fast Agent Panel - Phase 1 Enhancements ## Overview Phase 1 enhancements focus on improving the **sidebar chat experience** with better task visualization and agent transparency, inspired by the Augment UI design. ## Implemented Components ### 1. **GoalCard** ✅ **File:** `FastAgentPanel.GoalCard.tsx` **Purpose:** High-level overview of agent's current goal and task progress **Features:** - Visua
- Lines: 196
- Characters: 5097

---

# Source: .\src\components\FastAgentPanel\FIXES_APPLIED.md

- Preview: # Critical Fixes Applied - Fast Agent Panel ## Status: Partial Fix Implemented ### ✅ Fix 1: Multiple Goal Cards (COMPLETED) **Problem:** New Goal Card appeared for every sub-agent response **Solution:** - Modified `UIMessageBubble.tsx` lines 561-605 - GoalCard now only renders for `isParent && !isChild` coordinator messages - Only shows when message has `delegateTo*` tool calls **Result:** ONE Goa
- Lines: 201
- Characters: 5600

---

# Source: .\src\components\FastAgentPanel\MIGRATION_GUIDE.md

- Preview: # Migration Guide: Legacy Agent Framework → Modern Fast Agents ## Overview FastAgentPanel has been migrated from the legacy multi-agent framework to the modern fast agents implementation. ## What Changed ### Before (Legacy Framework) ```typescript // Used legacy multi-agent orchestrator const chatWithAgent = useAction(api.aiAgents.chatWithAgent); // Flow: // 1. FastAgentPanel → api.aiAgents.chatWi
- Lines: 236
- Characters: 6211

---

# Source: .\src\components\FastAgentPanel\PRESENTATION_LAYER_QUICK_REFERENCE.md

- Preview: # Fast Agent Panel Presentation Layer - Quick Reference ## Component Overview ### VideoCard & VideoCarousel ```tsx import { VideoCard, VideoCarousel } from './VideoCard'; import type { YouTubeVideo } from './MediaGallery'; // Single card <VideoCard video={youtubeVideo} className="w-64" /> // Carousel <VideoCarousel videos={youtubeVideos} title="Related Videos" /> ``` **Features**: - Thumbnail with
- Lines: 286
- Characters: 6682

---

# Source: .\src\components\FastAgentPanel\QUICK_REFERENCE.md

- Preview: # FastAgentPanel Quick Reference ## Modern Fast Agent Architecture (NO Legacy Framework) ### Key Principle FastAgentPanel uses the **modern fast agents** implementation, NOT the legacy multi-agent framework. ## Backend Entry Point ```typescript // convex/fastAgentChat.ts export const chatWithAgentModern = action({ args: { message: v.string(), selectedDocumentId: v.optional(v.id("documents")), mode
- Lines: 259
- Characters: 5800

---

# Source: .\src\components\FastAgentPanel\QUICK_START.md

- Preview: # FastAgentPanel - Quick Start Guide ## 🚀 Getting Started ### Basic Usage ```tsx import { FastAgentPanel } from '@/components/FastAgentPanel'; function App() { const [isPanelOpen, setIsPanelOpen] = useState(false); return ( <> <button onClick={() => setIsPanelOpen(true)}> Open Fast Agent </button> <FastAgentPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} selectedDocumentId={curre
- Lines: 341
- Characters: 7754

---

# Source: .\src\components\FastAgentPanel\README.md

- Preview: # FastAgentPanel A next-generation AI chat sidebar with ChatGPT-like UX, built for fast agent execution and real-time streaming. ## Features ### Core Features - ✨ **ChatGPT-like Interface**: Clean, minimal design focused on conversation - ⚡ **Fast Mode by Default**: Optimized for speed with fast-mode agent execution - 🔄 **Real-time Streaming**: SSE-based streaming for thinking steps, tool calls,
- Lines: 211
- Characters: 6041

---

# Source: .\src\components\FastAgentPanel\TOOLS_REFERENCE.md

- Preview: # Fast Agent Tools Reference ## Overview The modern fast agent has access to a comprehensive set of tools for document management, editing, task management, research, and media handling. These tools are defined in `convex/fast_agents/tools.ts`. ## 🔧 Available Tools ### 📄 Document Operations #### 1. `doc.find` - Search Documents Search for documents by title or content. **Args:** ```typescript {
- Lines: 589
- Characters: 9582

---

# Source: .\STREAMING_FIXES.md

- Preview: # Streaming Implementation Fixes ## 🎯 Root Cause: Missing `stream: true` Option **THE CRITICAL ISSUE:** The `useUIMessages` hook was missing `stream: true` in its options, which prevented it from subscribing to streaming deltas. Without this option, the hook only fetches completed messages and **completely ignores** the streaming deltas being saved to the database. ## Issues Identified & Fixed ##
- Lines: 396
- Characters: 12237

---

# Source: .\STREAMING_IMPLEMENTATION.md

- Preview: # AI Streaming Implementation with GPT-5 Support ## Overview This document describes the implementation of true incremental streaming for the FastAgentPanel using the AI SDK pattern from the Convex AI Agents guide, with support for GPT-5 series models. ## Architecture ### Backend Components #### 1. HTTP Streaming Route (`convex/router.ts`) - **Endpoint**: `POST /api/chat-stream` - **Pattern**: Use
- Lines: 184
- Characters: 5394

---

# Source: .\STREAMING_SMOOTHNESS_FIXES.md

- Preview: # Streaming Smoothness Improvements ## 🎯 Root Causes of Choppy Streaming After comparing with the Convex documentation examples, I identified **3 critical issues** causing choppy streaming: ## Issue #1: Converting UIMessages to Custom Format ❌ ### **The Problem:** You were converting `UIMessage` objects (from the Agent component) into your custom `Message` format. This conversion **destroyed crit
- Lines: 283
- Characters: 8552

---

# Source: .\STREAMING_TEST_CHECKLIST.md

- Preview: # Streaming Implementation Test Checklist ## Pre-Test Setup ### 1. Environment Check - [ ] `.env.local` has `VITE_CONVEX_URL` set - [ ] Convex backend is running (`npm run dev:backend`) - [ ] Frontend is running (`npm run dev:frontend`) - [ ] OpenAI API key is configured in Convex dashboard ### 2. Browser Setup - [ ] Open DevTools (F12) - [ ] Go to Console tab - [ ] Go to Network → WS tab - [ ] Cl
- Lines: 269
- Characters: 6490

---

# Source: .\STREAMING_UX_IMPROVEMENTS_COMPLETE.md

- Preview: # Fast Agent Panel Streaming UI/UX Improvements - Complete ✅ ## Summary Successfully improved the Fast Agent Panel streaming UI/UX to eliminate empty bubbles, provide clear progress feedback, and create a natural information hierarchy. The chat interface now feels polished and professional with smooth loading states and a cohesive timeline view. ## Problems Solved ### 1. ✅ Empty Message Bubbles **
- Lines: 403
- Characters: 11458

---

# Source: .\TASK_COMPLETION_SUMMARY.md

- Preview: # Task Completion Summary - October 17, 2025 ## Overview This document summarizes the completion of two major tasks: 1. **Fix and Re-run All Tests** - Achieve 100% test pass rate 2. **Implement LLM-Based Agent Quality Evaluation** - Automated quality assessment ## Task 1: Fix and Re-run All Tests ### 1.1 Fixed E2E Coordinator Agent Tests (12 tests) **Problem**: Tests were timing out after 30 secon
- Lines: 249
- Characters: 8937

---

# Source: .\TEST_ORCHESTRATION.md

- Preview: # Test Orchestration - Quick Test Guide ## ✅ Fixed Issues 1. **Thread ID Validation Errors** - RESOLVED 2. **Coordinator Agent Integration** - WORKING 3. **Specialized Agent Delegation** - WORKING ## Quick Test Queries ### Test 1: Multi-Domain Query (Document + Video) ``` Query: "Find documents and videos about Google" Expected: ✅ Coordinator delegates to DocumentAgent ✅ Coordinator delegates to M
- Lines: 277
- Characters: 5700

---

# Source: .\TEST_RESULTS_2025-10-17.md

- Preview: # Comprehensive Test Results - October 17, 2025 ## Test Execution Summary **Deployment URL**: https://formal-shepherd-851.convex.cloud **Test Run Date**: 2025-10-17 **Test Run Time**: 10:32 AM UTC **Total Test Files**: 50 **Total Tests**: 292 ### Overall Results (After Fixes) - ✅ **Passed**: 247+ tests (84.6%+) - ⏱️ **Timeout**: 12 tests (E2E coordinator tests - agents working but slow) - ❌ **Fail
- Lines: 244
- Characters: 6937

---

# Source: .\TEST_RESULTS_FINAL_2025-10-17.md

- Preview: # Final Test Results - October 17, 2025 ## Executive Summary **Overall Status**: ✅ **91.7% PASS RATE** (11/12 E2E tests passing) **Test Execution Details**: - **Total Duration**: 1051.92 seconds (~17.5 minutes) - **Tests Passed**: 11 out of 12 (91.7%) - **Tests Failed**: 1 (timeout on complex multi-agent query) - **Deployment**: https://formal-shepherd-851.convex.cloud - **Test Framework**: Vitest
- Lines: 317
- Characters: 11561

---

# Source: .\TEST_SUITE_GUIDE.md

- Preview: # FastAgentPanel Test Suite Guide ## Overview Comprehensive test suite for the FastAgentPanel UX enhancements, including: - **Unit Tests**: Media extraction, utility functions - **Component Tests**: VideoCard, SourceCard, ProfileCard - **Integration Tests**: Message rendering, presentation layer - **E2E Tests**: Agent chat with real API calls, streaming, UI integration ## Test Structure ``` src/co
- Lines: 341
- Characters: 9417

---

# Source: .\THREAD_LIST_FIX.md

- Preview: # Thread List Update Fix - Complete ✅ ## Problem The Fast Agent Panel thread list was not updating correctly when new messages were sent. Threads remained in their original order (sorted by creation time) instead of moving to the top when new messages arrived. **User Report:** > "take an overview of our entire fast agent panel, the thread scroll list is not updating correctly" ## Root Cause Analys
- Lines: 303
- Characters: 8806

---

# Source: .\THREAD_MESSAGE_COUNT_FIX.md

- Preview: # Thread Message Count Fix - Complete ✅ ## Problem All threads in the Fast Agent Panel were showing "0 messages" even though they clearly had content (visible in the thread preview text). **User Report:** > "why is thread showing 0 messages" ## Root Cause Analysis ### Investigation 1. **Backend logs showed correct counts:** ``` '[listUserThreads] Enriched thread m571w7evjfze16xk89h72kj84s7sjz8r:'
- Lines: 246
- Characters: 6291

---

# Source: .\TOOL_RESULT_POPOVER_IMPLEMENTATION.md

- Preview: # Tool Result Popover Implementation - Complete ## ✅ Implementation Complete **Final Commit:** `e707e83` ## What Was Built ### Interactive Tool Result Popovers Tool names in the Agent Progress timeline are now **clickable** and open a **formatted modal popover** displaying the tool's result. ## Key Features ### 1. Clickable Tool Names - Tool names in the timeline are now buttons - Hover effect sho
- Lines: 221
- Characters: 5757

---

# Source: .\TOOLS_REFERENCE.md

- Preview: # Convex Agent Tools Reference ## Overview The NodeBench AI assistant has access to a comprehensive set of tools for document management, media handling, task management, calendar operations, and web search. These tools enable voice-controlled workflows and intelligent automation. ## 🔧 Tool Categories ### 📄 Document Operations - `findDocument` - Search for documents - `getDocumentContent` - Read
- Lines: 563
- Characters: 10527

---

# Source: .\TYPING_INDICATOR_ENHANCEMENT.md

- Preview: # Typing Indicator Enhancement - Intent-Based Status Messages ## Problem Statement When users submit queries to the Fast Agent Panel, the typing indicator displays generic messages like "Streaming..." or "Agent is processing your request...", which doesn't provide context about what the agent is actually doing. ### Before (Generic) ``` User: "Help me compile information on Ditto.ai, Eric Liu the f
- Lines: 359
- Characters: 10384

---

# Source: .\UNKNOWN_TOOL_FIX.md

- Preview: # ✅ FIXED - "Unknown Tool" Display in Agent Progress Timeline ## 🎯 Problem The Agent Progress timeline section in the Fast Agent Panel was displaying "Unknown Tool" multiple times instead of showing actual tool names that were executed. **What users saw:** ```html <span class="text-sm font-medium text-gray-900">Unknown  Tool</span> <div class="text-xs text-gray-600 mt-0.5">Tool: <code class="bg-g
- Lines: 146
- Characters: 4301

---

# Source: .\USERID_FIX_COMPLETE.md

- Preview: # ✅ Document Agent userId Context Fix - COMPLETE ## October 17, 2025 ## Problem Statement **Issue**: Document Agent userId context showing as `undefined` **Impact**: Medium (document search may not be scoped to correct user) **Priority**: High (security/privacy concern) **Status**: ✅ **FIXED AND VERIFIED** ## Root Cause Analysis ### The Problem When the Coordinator Agent delegated to the Document
- Lines: 351
- Characters: 9049

---

# Source: .\WORKFLOW_IMPLEMENTATION_SUCCESS.md

- Preview: # 🎉 Workflow Implementation Complete - 100% Pass Rate Achieved! **Date**: October 15, 2025 **Status**: ✅ **PRODUCTION READY WITH DURABLE WORKFLOWS** ## 📊 Evaluation Results ### **Quick Test Suite: 100% Pass Rate (6/6 Tests)** | Test ID | Category | Tool | Status | Notes | |---------|----------|------|--------|-------| | doc-001 | Document Discovery | findDocument | ✅ PASSED | Found document with
- Lines: 225
- Characters: 7406

---

# Source: .\WORKFLOW_ORCHESTRATION_ANALYSIS.md

- Preview: # Workflow Orchestration Analysis ## Current State ### ❌ Problem: Specialized Agents Are NOT Being Used The Fast Agent Panel is currently **NOT** using the specialized agent coordinator we created. Instead, it's using a single monolithic agent with all tools. ### Current Flow: ``` User Message ↓ initiateAsyncStreaming (mutation) ↓ streamAsync (action) ↓ createChatAgent("gpt-5-chat-latest") ← Singl
- Lines: 407
- Characters: 10006

---

# Source: .\YOUTUBE_SEARCH_SETUP.md

- Preview: # YouTube Search Tool Setup ## Overview The YouTube search tool allows users to search for and watch YouTube videos directly in the chat interface using embedded video players. ## Setup Instructions ### 1. Get YouTube API Key 1. Go to [Google Cloud Console](https://console.cloud.google.com/) 2. Create a new project or select an existing one 3. Enable the **YouTube Data API v3**: - Go to "APIs & Se
- Lines: 268
- Characters: 6238

---

