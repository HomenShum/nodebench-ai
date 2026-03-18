# UI Manual Test - Quick Reference Card

**Print this page for easy reference during testing**

---

## 🚀 Getting Started

1. **Start App:** http://localhost:5173
2. **Open Browser DevTools:** F12 (for console errors)
3. **Have Ready:** Timer/stopwatch + notepad
4. **Test Data:** Use companies from audit_mocks.ts

---

## ⏱️ Critical Measurements

### What to Measure & When

| What | When | Target | How to Measure |
|------|------|--------|----------------|
| **Page Load** | App first opens | < 10s | From URL enter to content visible |
| **Fast Agent Panel Open** | Click/shortcut triggers panel | < 2s | From click to input field ready |
| **First Progress Update** | Submit Fast Agent query | < 5s | From submit to first progress shown |
| **First Content** | Waiting for AI response | < 20s | From submit to first text appears |
| **Complete Operation** | Full AI workflow | < 90s | From submit to "Complete" status |
| **Cache Hit** | Reopen same document | < 2s | Second load should be instant |

---

## 📝 Test Data

### Companies to Use (from audit_mocks.ts)

1. **DISCO Pharmaceuticals**
   - Seed round: €36M
   - Location: Cologne, Germany
   - Focus: AI-powered drug discovery

2. **Ambros Therapeutics**
   - Series A: $125M
   - Location: Irvine, CA
   - Focus: Regulatory pathways

3. **ClearSpace**
   - Focus: Space debris removal

4. **OpenAutoGLM**
   - Focus: AI model

5. **QuickJS CVE**
   - Focus: Security vulnerability

---

## 🧪 Quick Test Commands

### Document Analysis Commands

```
Analyze this document and provide key insights about the investment opportunity
```

```
Add a section about the company's AI-powered drug discovery platform and its competitive advantages
```

```
Create a risk assessment with key considerations for this investment
```

### Spreadsheet Commands

```
Add headers in row 1: Company Name, Funding Stage, Amount, Date, Investors, Technology Focus
```

```
Add these companies to the spreadsheet:
Row 2: DISCO Pharmaceuticals, Seed, €36M, 2024, Wellington Partners, AI-powered pharma
Row 3: Ambros Therapeutics, Series A, $125M, 2024, RA Capital, Regulatory pathways
```

```
Format row 1 as bold header with light blue background. Make columns auto-fit to content width.
```

### Multi-Agent Test Query

```
Research DISCO Pharmaceuticals, analyze their competitive position, and create a summary with investment recommendations
```

---

## 🎯 What to Look For

### Streaming Progress Indicators

**Should see these phases in order:**
1. ⚪ Initializing (0-10%)
2. 🔍 Searching (10-30%)
3. 🧠 Reasoning (30-50%)
4. ✍️ Generating (50-95%)
5. ✅ Completing (95-100%)

**Key observation:** How fast do you see the first update?

---

### Caching Behavior

**Test:** Load document → Close → Reopen immediately

**Expected:**
- First load: 5-10 seconds
- Second load: < 2 seconds (instant from cache)
- Improvement: > 50%

**If second load is slow:** Cache not working ❌

---

### Parallel Processing Signs

**Look for:**
- Multiple "working" indicators simultaneously
- Faster completion than expected
- Progress on multiple items at once

**Harder to observe visually**, but should feel faster overall

---

## ✅ Pass/Fail Criteria

### Must Pass (Critical)

- [ ] Page loads and is usable
- [ ] Can create documents
- [ ] Fast Agent Panel opens
- [ ] Fast Agent responds to queries
- [ ] Streaming progress shows within 5s
- [ ] First content within 20s
- [ ] Operations complete (no infinite loading)
- [ ] No console errors blocking functionality

### Should Pass (Important)

- [ ] Cache improves repeat access by > 50%
- [ ] Complex queries complete in < 90s
- [ ] Spreadsheet commands work
- [ ] Formatting applies correctly
- [ ] Error messages are clear
- [ ] Can recover from errors

### Nice to Have

- [ ] Parallel processing observable
- [ ] Prefetch seems to work
- [ ] UI animations smooth
- [ ] Response quality high

---

## 🐛 When to Report a Bug

**Report if you see:**

### Critical (Stop Testing)
- ❌ Application crashes
- ❌ Infinite loading (> 3 minutes)
- ❌ Data loss
- ❌ Cannot complete basic workflows

### High Priority
- ⚠️ Operations timeout frequently
- ⚠️ Errors without recovery option
- ⚠️ Cache not working
- ⚠️ Progress indicators stuck/frozen

### Medium Priority
- ⚠️ Slow performance (> 2x targets)
- ⚠️ Formatting not applied correctly
- ⚠️ Minor UI glitches
- ⚠️ Confusing error messages

### Low Priority
- 📌 Visual alignment issues
- 📌 Missing labels
- 📌 Inconsistent styling

---

## 📊 Quick Recording Template

**Use this to jot down measurements:**

```
TEST 1.4 - Document Analysis (Streaming)
─────────────────────────────────────────
Query submitted:        00:00
First progress:         00:__ (target: < 5s)
First content:          00:__ (target: < 20s)
Complete:               00:__ (target: < 90s)

Pass/Fail: ___

TEST 3.1 - Cache Performance
─────────────────────────────────────────
First load:             00:__
Second load:            00:__
Improvement:            ___%

Pass/Fail: ___

TEST 3.2 - Parallel Delegation
─────────────────────────────────────────
Total time:             00:__
Observable parallel:    Yes / No

Pass/Fail: ___
```

---

## 🔧 Common Issues & Solutions

### Issue: "Fast Agent Panel won't open"
**Try:**
- Look for keyboard shortcut (Ctrl+K / Cmd+K)
- Check top bar for agent icon
- Look in sidebar
- Right-click in document

### Issue: "Operation takes forever"
**Check:**
- Network connection
- Console for errors (F12)
- Browser DevTools Network tab
- Is there actually a timeout error?

### Issue: "Can't find Documents Home Hub"
**Try:**
- Check sidebar/navigation menu
- Look for "Documents", "Home", or "Hub"
- Try navigating from root URL

### Issue: "Progress not showing"
**Verify:**
- Check if content appears without progress
- Look for loading spinner elsewhere
- Console errors blocking UI updates

---

## 📸 Screenshots to Capture

### Must Have
1. Fast Agent Panel with streaming progress visible
2. Document editor with content
3. Spreadsheet with data populated
4. Any error messages

### Nice to Have
5. Browser DevTools console (if errors)
6. Performance metrics (if UI shows them)
7. Multiple documents/spreadsheets created

---

## ⏰ Time Estimates

- **Quick Test:** 10 minutes (basic smoke test)
- **Standard Test:** 45 minutes (all core tests)
- **Full Test:** 60 minutes (all tests + edge cases)
- **Per Test Suite:**
  - Suite 1 (Documents): 15 min
  - Suite 2 (Spreadsheets): 10 min
  - Suite 3 (Performance): 10 min
  - Suite 4 (End-to-End): 15 min
  - Suite 5 (Edge Cases): 10 min

---

## 🎯 Success Looks Like

**At the end of testing, you should be able to say:**

✅ "The app loads quickly and feels responsive"
✅ "I can see progress indicators that give me confidence"
✅ "Operations complete in reasonable time"
✅ "Repeated actions are noticeably faster (caching works)"
✅ "Complex queries finish faster than I expected (parallel works)"
✅ "The AI responses are helpful and accurate"
✅ "I could use this productively in real work"

**If you can't say most of these, there's work to be done!**

---

## 📞 Need Help?

**Test Plan:** See `UI_MANUAL_TEST_PLAN.md` for detailed instructions
**Results Template:** Use `UI_TEST_RESULTS_TEMPLATE.md` to record findings
**Documentation:** See `ACTUAL_OUTPUTS_SUMMARY.md` for expected performance

---

## ⚡ Ultra-Quick 5-Minute Smoke Test

**Just need to verify it works?**

1. ✅ Load app (< 10s)
2. ✅ Create document (works)
3. ✅ Open Fast Agent (< 2s)
4. ✅ Ask simple question (see progress, get answer < 30s)
5. ✅ Check console for errors (none)

**All pass?** ✅ Basic functionality confirmed
**Any fail?** ❌ Investigate before full testing

---

**Quick Reference v1.0** | Created: 2025-12-28 | For: Deep Agent 2.0 UI Testing
