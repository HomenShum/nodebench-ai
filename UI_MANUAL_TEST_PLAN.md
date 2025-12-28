# Deep Agent 2.0 - UI Manual Test Plan

**Version:** 1.0
**Date:** 2025-12-28
**Status:** Ready for Execution
**Estimated Time:** 45-60 minutes

---

## 📋 Test Overview

This manual test plan verifies the Deep Agent 2.0 optimizations through hands-on UI testing. It focuses on user-observable performance improvements and UX enhancements.

### Test Objectives

- ✅ Verify Fast Agent Panel integration works end-to-end
- ✅ Observe actual performance improvements with real operations
- ✅ Validate streaming progress indicators provide meaningful feedback
- ✅ Confirm document and spreadsheet editing workflows
- ✅ Measure perceived latency improvements

### Prerequisites

- [ ] Application running at http://localhost:5173
- [ ] Browser: Chrome/Chromium (latest version)
- [ ] Test data: Use entities from `convex/tools/evaluation/audit_mocks.ts`
- [ ] Timer/stopwatch for measuring durations
- [ ] Notepad for recording observations

---

## 🧪 Test Suite 1: Fast Agent Panel - Document Workflow

### Test 1.1: Navigate to Documents Home Hub

**Objective:** Verify application is accessible and Documents section loads

**Steps:**
1. Open browser to http://localhost:5173
2. Wait for page to fully load
3. Navigate to Documents Home Hub (sidebar or main menu)
4. Observe loading behavior

**Expected Results:**
- [ ] Page loads within 10 seconds
- [ ] Documents Home Hub is visible
- [ ] No console errors in browser DevTools
- [ ] UI is responsive and clickable

**Observations:**
```
Load time: _______ seconds
Any errors: _______
Notes: _______
```

---

### Test 1.2: Create New Document

**Objective:** Test document creation workflow

**Steps:**
1. In Documents Home Hub, locate "New Document" or "Create Document" button
2. Click to create new document
3. Observe navigation and editor loading
4. Note time to editor appearing

**Expected Results:**
- [ ] New document created successfully
- [ ] Editor becomes visible within 5 seconds
- [ ] Document has default title or prompts for title
- [ ] Cursor is in editor ready for input

**Test Data:**
- Document title: "DISCO Pharmaceuticals - Investment Analysis"
- Initial content: "Analysis of €36M seed funding round"

**Observations:**
```
Time to editor: _______ seconds
Document created: Yes / No
Editor type detected: _______
Notes: _______
```

---

### Test 1.3: Open Fast Agent Panel from Document

**Objective:** Verify Fast Agent Panel accessibility from document view

**Steps:**
1. From the document editor, look for Fast Agent Panel trigger
   - Common locations: Top bar, sidebar, keyboard shortcut (Ctrl+K or Cmd+K)
2. Click/trigger Fast Agent Panel
3. Observe panel opening animation and loading state
4. Note time to panel being interactive

**Expected Results:**
- [ ] Fast Agent Panel opens within 2 seconds
- [ ] Panel displays agent selection or prompt input
- [ ] Panel is properly positioned (modal, sidebar, or overlay)
- [ ] Close button/escape works

**Observations:**
```
Panel open time: _______ seconds
Panel position: Modal / Sidebar / Overlay
Input field visible: Yes / No
Notes: _______
```

---

### Test 1.4: Document Analysis via Fast Agent (Streaming Test)

**Objective:** Test streaming delegation with progress indicators

**Steps:**
1. In Fast Agent Panel input, type:
   ```
   Analyze this document and provide key insights about the investment opportunity
   ```
2. Submit the query
3. **OBSERVE CAREFULLY:**
   - Time to first progress update
   - Progress phases displayed
   - Time to first content appearing
   - Total operation time
4. Record all timings

**Expected Results:**
- [ ] Progress indicator appears immediately
- [ ] First progress update within 5-10 seconds
- [ ] Progress shows phases: Initializing → Searching → Reasoning → Generating → Completing
- [ ] First content chunk appears within 10-20 seconds
- [ ] Total operation completes within 90 seconds
- [ ] Final response is coherent and relevant

**CRITICAL MEASUREMENTS:**

| Metric | Time | Notes |
|--------|------|-------|
| Query submitted | 0s (baseline) | |
| First progress update | _______ s | Should be < 5s |
| "Searching" phase shown | _______ s | |
| "Reasoning" phase shown | _______ s | |
| "Generating" phase shown | _______ s | |
| First content visible | _______ s | Should be < 20s |
| Operation complete | _______ s | Should be < 90s |

**Perceived Latency:**
```
Without streaming (theoretical): Wait entire time until complete
With streaming (actual): First feedback at _______ seconds

Perceived improvement: _______ x faster
Target: 3-5x faster
```

**Observations:**
```
Progress phases visible: Yes / No
Progress smooth or jumpy: _______
Content quality: Good / Fair / Poor
Notes: _______
```

---

### Test 1.5: Document Editing via Fast Agent

**Objective:** Test document editing delegation to DocumentAgent

**Steps:**
1. With document still open, open Fast Agent Panel
2. Type editing command:
   ```
   Add a section about the company's AI-powered drug discovery platform and its competitive advantages
   ```
3. Observe delegation workflow
4. Verify document is updated

**Expected Results:**
- [ ] Fast Agent accepts the command
- [ ] Progress indicator shows delegation to DocumentAgent
- [ ] Document content is updated with new section
- [ ] New content is relevant and well-formatted
- [ ] Operation completes within 60 seconds

**Observations:**
```
Delegation visible: Yes / No
Document updated: Yes / No
Update time: _______ seconds
Content quality: Good / Fair / Poor
Notes: _______
```

---

## 🧪 Test Suite 2: Fast Agent Panel - Spreadsheet Workflow

### Test 2.1: Create New Spreadsheet

**Objective:** Test spreadsheet creation workflow

**Steps:**
1. Navigate to Documents Home Hub
2. Look for "New Spreadsheet" or similar option
   - If not available, try creating through Fast Agent: "Create a new spreadsheet"
3. Observe spreadsheet editor loading
4. Note time to interactive state

**Expected Results:**
- [ ] Spreadsheet created successfully
- [ ] Grid view is visible
- [ ] Can click cells
- [ ] Toolbar/menu is available

**Test Data:**
- Spreadsheet title: "Biotech Investment Portfolio Tracker"

**Observations:**
```
Creation method: Button / Fast Agent / Other
Time to interactive: _______ seconds
Grid visible: Yes / No
Notes: _______
```

---

### Test 2.2: Spreadsheet Editing via Fast Agent (Direct Tool Test)

**Objective:** Verify CoordinatorAgent uses direct spreadsheet tools (no delegation)

**Steps:**
1. Open Fast Agent Panel from spreadsheet view
2. Type command:
   ```
   Add headers in row 1: Company Name, Funding Stage, Amount, Date, Investors, Technology Focus
   ```
3. Submit and observe execution
4. Verify spreadsheet is updated

**Expected Results:**
- [ ] Command executed within 30 seconds
- [ ] Headers appear in row 1
- [ ] Formatting is clean
- [ ] No delegation to subagent (check console logs if visible)

**Observations:**
```
Execution time: _______ seconds
Headers added: Yes / No
Tool used: Direct / Delegated
Notes: _______
```

---

### Test 2.3: Populate Spreadsheet with Data

**Objective:** Test batch data entry via Fast Agent

**Steps:**
1. In Fast Agent Panel, type:
   ```
   Add these companies to the spreadsheet:
   Row 2: DISCO Pharmaceuticals, Seed, €36M, 2024, Wellington Partners, AI-powered pharma
   Row 3: Ambros Therapeutics, Series A, $125M, 2024, RA Capital, Regulatory pathways
   ```
2. Submit and observe
3. Verify data is correctly entered

**Expected Results:**
- [ ] All data entered accurately
- [ ] Formatting preserved
- [ ] Operation completes within 45 seconds
- [ ] Data is properly aligned in cells

**Observations:**
```
Execution time: _______ seconds
Data accuracy: 100% / Partial / Errors
Formatting: Good / Fair / Poor
Notes: _______
```

---

### Test 2.4: Spreadsheet Formatting via Fast Agent

**Objective:** Test formatting capabilities

**Steps:**
1. Open Fast Agent Panel
2. Type command:
   ```
   Format row 1 as bold header with light blue background.
   Make columns auto-fit to content width.
   Add currency formatting to the Amount column.
   ```
3. Submit and observe
4. Verify formatting is applied

**Expected Results:**
- [ ] Headers are bold
- [ ] Background color applied
- [ ] Columns are properly sized
- [ ] Currency format on amounts (€36M, $125M)
- [ ] Operation completes within 30 seconds

**Observations:**
```
Execution time: _______ seconds
Formatting applied: Yes / No / Partial
Which formats worked: _______
Notes: _______
```

---

## 🧪 Test Suite 3: Performance & Caching Tests

### Test 3.1: Repeated Document Access (Cache Test)

**Objective:** Verify caching reduces latency on repeated operations

**Steps:**
1. Open a document (any previous test document)
2. Measure load time - **Record: _______ seconds**
3. Close the document
4. Immediately re-open the same document
5. Measure load time again - **Record: _______ seconds**
6. Calculate improvement

**Expected Results:**
- [ ] First load: 5-10 seconds
- [ ] Second load: < 2 seconds (cached)
- [ ] Improvement: > 50%

**Cache Performance:**
```
First load:  _______ seconds
Second load: _______ seconds
Improvement: _______ % (target: > 50%)
Cache working: Yes / No
```

---

### Test 3.2: Parallel Multi-Agent Query (Parallel Delegation Test)

**Objective:** Observe parallel delegation in action

**Steps:**
1. Open any document
2. Open Fast Agent Panel
3. Type complex query that might involve multiple agents:
   ```
   Research DISCO Pharmaceuticals, analyze their competitive position,
   and create a summary with investment recommendations
   ```
4. **WATCH CAREFULLY** for signs of parallel processing:
   - Multiple progress indicators
   - Simultaneous "working" states
   - Faster completion than sequential would take
5. Record total time

**Expected Results:**
- [ ] Query completes in 60-90 seconds (vs 120-180 if sequential)
- [ ] Multiple agents appear to work simultaneously (if UI shows this)
- [ ] Response includes multi-faceted analysis
- [ ] Performance improvement observable

**Observations:**
```
Total time: _______ seconds
Parallel indicators visible: Yes / No / Unclear
Response quality: Comprehensive / Partial / Poor
Estimated sequential time: _______ seconds
Improvement: _______ %
Notes: _______
```

---

### Test 3.3: Repeated Similar Queries (Prefetch Test)

**Objective:** Observe if system learns patterns and prefetches

**Steps:**
1. Perform this sequence of actions:
   - View document about DISCO Pharmaceuticals
   - Edit document (add content)
   - View document again
   - Edit document (add more content)
   - View document again
   - Edit document (final additions)
2. On the final edit, observe if it feels faster than the first edit
3. Note any "instant" responses or pre-loaded data

**Expected Results:**
- [ ] Pattern is established: view → edit
- [ ] Later edits feel snappier
- [ ] System may pre-load editing context

**Observations:**
```
First edit response time: _______ seconds
Final edit response time: _______ seconds
Improvement noted: Yes / No
Perceived prefetch benefit: Yes / No / Unclear
Notes: _______
```

---

## 🧪 Test Suite 4: End-to-End Workflows

### Test 4.1: Complete Document Creation & Analysis Workflow

**Objective:** Full workflow from creation to AI-assisted analysis

**Steps:**
1. Create new document titled "Ambros Therapeutics Investment Memo"
2. Add initial content about $125M Series A funding
3. Use Fast Agent to analyze and expand the memo with:
   - Market analysis
   - Technology assessment
   - Risk factors
   - Investment recommendation
4. Review and edit based on Fast Agent suggestions
5. Final formatting pass

**Expected Results:**
- [ ] Complete workflow finishes in < 5 minutes
- [ ] Document is comprehensive and well-structured
- [ ] Fast Agent provides valuable insights
- [ ] Multiple delegations handled smoothly
- [ ] No errors or timeouts

**Workflow Timing:**
```
Total workflow time: _______ minutes
Number of Fast Agent queries: _______
Average response time: _______ seconds
User satisfaction: High / Medium / Low
```

---

### Test 4.2: Complete Spreadsheet Workflow

**Objective:** Full spreadsheet creation and population

**Steps:**
1. Create "Q4 2024 Biotech Pipeline Tracker"
2. Set up structure with Fast Agent
3. Populate with 5 companies from audit_mocks.ts
4. Apply formatting and formulas
5. Generate summary statistics

**Expected Results:**
- [ ] Complete workflow finishes in < 4 minutes
- [ ] Spreadsheet is functional and professional
- [ ] All data entered accurately
- [ ] Formulas work correctly
- [ ] No errors

**Workflow Timing:**
```
Total workflow time: _______ minutes
Number of Fast Agent commands: _______
Average execution time: _______ seconds
Accuracy: 100% / Partial / Issues
```

---

## 🧪 Test Suite 5: Error Handling & Edge Cases

### Test 5.1: Network Interruption Recovery

**Objective:** Test resilience to network issues

**Steps:**
1. Start a Fast Agent query
2. Briefly disconnect network (airplane mode or unplug)
3. Reconnect after 5 seconds
4. Observe error handling and recovery

**Expected Results:**
- [ ] Graceful error message displayed
- [ ] Option to retry
- [ ] No UI freeze or crash
- [ ] Operation can be retried successfully

**Observations:**
```
Error message shown: Yes / No
Retry available: Yes / No
Recovery successful: Yes / No
Notes: _______
```

---

### Test 5.2: Very Long Operation (Timeout Test)

**Objective:** Verify timeout handling for extremely long operations

**Steps:**
1. Create complex query that may take > 2 minutes:
   ```
   Analyze all documents, create comprehensive cross-reference report,
   generate investment portfolio recommendations, and create detailed
   risk assessment matrix with supporting evidence
   ```
2. Observe timeout behavior
3. Check if operation is gracefully terminated or continues

**Expected Results:**
- [ ] Operation either completes or times out gracefully
- [ ] Timeout message is clear if it occurs
- [ ] Partial results may be shown
- [ ] UI remains responsive

**Observations:**
```
Operation time: _______ seconds
Completed / Timed out: _______
Partial results: Yes / No
User experience: Good / Fair / Poor
Notes: _______
```

---

### Test 5.3: Concurrent Operations

**Objective:** Test multiple simultaneous Fast Agent requests

**Steps:**
1. Open two documents side-by-side (if possible) or in separate tabs
2. Trigger Fast Agent queries in both simultaneously
3. Observe how system handles concurrent requests

**Expected Results:**
- [ ] Both requests are queued/processed
- [ ] No crashes or freezes
- [ ] Both complete successfully
- [ ] Performance is acceptable

**Observations:**
```
Both requests completed: Yes / No
Total time for both: _______ seconds
Issues encountered: _______
Notes: _______
```

---

## 📊 Performance Summary

### Overall Performance Assessment

After completing all tests, fill in this summary:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Page Load Time** | < 10s | _______ s | ✅ / ❌ |
| **Fast Agent Panel Open** | < 2s | _______ s | ✅ / ❌ |
| **First Progress Update** | < 5s | _______ s | ✅ / ❌ |
| **First Content Visible** | < 20s | _______ s | ✅ / ❌ |
| **Document Analysis Complete** | < 90s | _______ s | ✅ / ❌ |
| **Spreadsheet Command Execute** | < 30s | _______ s | ✅ / ❌ |
| **Cache Hit Improvement** | > 50% | _______ % | ✅ / ❌ |
| **Perceived UX Improvement** | 3-5x | _______ x | ✅ / ❌ |

### User Experience Rating

Rate each aspect on a scale of 1-5 (5 = Excellent):

- **Speed/Performance:** _____ / 5
- **Progress Feedback:** _____ / 5
- **Ease of Use:** _____ / 5
- **Response Quality:** _____ / 5
- **Reliability:** _____ / 5
- **Overall Satisfaction:** _____ / 5

### Optimization Effectiveness

Based on your observations, rate how well each optimization performed:

| Optimization | Observable? | Effective? | Rating (1-5) | Notes |
|--------------|-------------|------------|--------------|-------|
| **Streaming Delegation** | Yes / No | Yes / No | _____ / 5 | |
| **Parallel Processing** | Yes / No | Yes / No | _____ / 5 | |
| **Caching** | Yes / No | Yes / No | _____ / 5 | |
| **Predictive Prefetch** | Yes / No | Yes / No | _____ / 5 | |

---

## 🐛 Bug Report Template

If you encounter any issues, document them here:

### Bug #1
- **Severity:** Critical / High / Medium / Low
- **Component:** Document / Spreadsheet / Fast Agent / Other
- **Steps to Reproduce:**
  1.
  2.
  3.
- **Expected Result:**
- **Actual Result:**
- **Screenshot/Video:** (attach if available)
- **Console Errors:** (check browser DevTools)

### Bug #2
[Repeat template as needed]

---

## ✅ Test Completion Checklist

- [ ] All Test Suite 1 tests completed (5 tests)
- [ ] All Test Suite 2 tests completed (4 tests)
- [ ] All Test Suite 3 tests completed (3 tests)
- [ ] All Test Suite 4 tests completed (2 tests)
- [ ] All Test Suite 5 tests completed (3 tests)
- [ ] Performance Summary filled out
- [ ] User Experience ratings provided
- [ ] Bugs documented (if any)
- [ ] Overall assessment written

**Total Tests:** 17
**Tests Passed:** _____ / 17
**Tests Failed:** _____ / 17
**Pass Rate:** _____ %

---

## 📝 Overall Assessment

### What Worked Well
```
[Write your observations about what performed exceptionally well]
```

### What Needs Improvement
```
[Write your observations about areas that need attention]
```

### Optimization Impact
```
[Describe the overall impact of the optimizations on user experience]
```

### Production Readiness
```
Ready for Production: Yes / No / Conditional

If Conditional, what needs to be addressed:
```

### Additional Comments
```
[Any other observations, suggestions, or feedback]
```

---

## 🎯 Quick Test (10 minutes)

**Short on time?** Run this abbreviated test:

1. **Load Test:** Navigate to http://localhost:5173 - should load < 10s
2. **Create Document:** Create new document - should work smoothly
3. **Fast Agent Query:** Ask Fast Agent to analyze document - observe streaming progress
4. **Measure:** Time from query submit to first content visible - should be < 20s
5. **Cache Test:** Close and reopen same document - second load should be faster
6. **Overall Feel:** Does the app feel fast and responsive?

**Quick Pass/Fail:** ✅ / ❌

---

**Test Plan Version:** 1.0
**Created:** 2025-12-28
**Estimated Duration:** 45-60 minutes (full), 10 minutes (quick test)
**Prerequisites:** App running at localhost:5173
**Status:** Ready for Execution
