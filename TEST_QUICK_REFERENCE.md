# Visual LLM Validation - Quick Test Reference

## 🚀 Quick Start

### 1. Set Environment Variables

```bash
export LINKUP_API_KEY="your-linkup-api-key"
export OPENAI_API_KEY="sk-your-openai-key"
export GOOGLE_GENAI_API_KEY="your-google-genai-key"
```

### 2. Run Tests

```bash
# Test Linkup integration (recommended first)
npx tsx agents/app/test_linkup_integration.ts

# Test vision analysis
npx tsx agents/app/test_visual_llm.ts

# Run full workflow (FIXED version with real vision APIs)
npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_visual_llm_validation_FIXED.json
```

---

## 📊 Test 1: Linkup Integration

### Command
```bash
npx tsx agents/app/test_linkup_integration.ts
```

### What It Tests
- ✅ Linkup API image search
- ✅ Image URL validation
- ✅ Image collection with filtering
- ✅ Vision analysis integration

### Expected Duration
**~20-30 seconds**

### Expected Output (Summary)
```
✨ Testing Complete!

Summary:
  ✅ Linkup image search: PASSED
  ✅ Image URL validation: PASSED
  ✅ Image collection: PASSED
  ✅ Image filtering: PASSED
  ✅ Vision analysis: PASSED

Total duration: 18.79s
```

### Success Criteria
- All 5 tests show ✅ PASSED
- No ❌ errors
- Valid images found (5-10)
- Vision analysis returns structured JSON

---

## 🤖 Test 2: Vision Analysis

### Command
```bash
npx tsx agents/app/test_visual_llm.ts
```

### What It Tests
- ✅ GPT-5-mini vision API
- ✅ Gemini 2.5 Flash vision API
- ✅ Structured output parsing
- ✅ Multi-model comparison

### Expected Duration
**~10-15 seconds**

### Expected Output (Summary)
```
✅ GPT-5-mini Analysis:
   Visual Quality: 4/5
   Movement Motion: 4/5
   Emotional Comfort: 5/5
   Confidence: 0.85

✅ Gemini 2.5 Flash Analysis:
   Visual Quality: 4/5
   Movement Motion: 5/5
   Emotional Comfort: 5/5
   Confidence: 0.90

✅ All tests passed!
```

### Success Criteria
- Both models return valid JSON
- Ratings are 1-5
- Confidence is 0.0-1.0
- No API errors

---

## 🔬 Test 3: Full Workflow

### Command
```bash
npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_visual_llm_validation_FIXED.json
```

### What It Tests
- ✅ Complete 9-node workflow
- ✅ Image search → analysis → statistics → visualization
- ✅ Model comparison
- ✅ Prompt optimization

### Expected Duration
**~3-4 minutes**

### Expected Output (Summary)
```
✨ Workflow Complete!

Summary:
  Total Duration: 3m 19s
  Total Cost: $0.51
  Images Analyzed: 8
  Models Used: 2
  Quality Score: 9.2/10

Results saved to:
  - Timeline ID: tl_abc123xyz
  - Document ID: doc_def456uvw
  - Visualizations: 6 charts
```

### Success Criteria
- All 9 nodes complete successfully
- 8-10 images analyzed
- Cost: $0.40-0.60
- Quality score: 8.0+/10
- Timeline and document IDs returned

---

## 🔍 Debugging Failed Tests

### Issue: "Missing LINKUP_API_KEY"

**Solution**:
```bash
export LINKUP_API_KEY="your-key"
```

**Fallback**: System will use sample images automatically

---

### Issue: "Missing OPENAI_API_KEY"

**Solution**:
```bash
export OPENAI_API_KEY="sk-your-key"
```

**Note**: GPT-5-mini analysis will fail without this

---

### Issue: "Missing GOOGLE_GENAI_API_KEY"

**Solution**:
```bash
export GOOGLE_GENAI_API_KEY="your-key"
```

**Note**: Gemini analysis will fail without this

---

### Issue: "Image validation failed"

**Possible Causes**:
1. Image URL is not accessible
2. Content-Type is not `image/*`
3. Image size > 10MB

**Solution**: Check image URLs or disable validation:
```typescript
const result = await searchAndCollectImages(query, 10, false); // false = no validation
```

---

### Issue: "Vision API error"

**Possible Causes**:
1. Invalid API key
2. Rate limit exceeded
3. Model not available

**Solution**: Check API key and retry after 1 minute

---

## 📈 Performance Benchmarks

### Expected Timings

| Operation | Expected | Acceptable Range |
|-----------|----------|------------------|
| Linkup search | 3-5s | 2-10s |
| URL validation (per image) | 200-300ms | 100-500ms |
| GPT-5-mini (per image) | 2-3s | 1-5s |
| Gemini (per image) | 1.5-2.5s | 1-4s |
| Statistical analysis | 10-15s | 5-20s |
| Visualization | 5-10s | 3-15s |
| **Full workflow** | **3-4 min** | **2-6 min** |

### Expected Costs

| Component | Cost |
|-----------|------|
| Linkup API | $0.01 |
| GPT-5-mini (10 images) | $0.24 |
| Gemini (10 images) | $0.04 |
| Code execution | $0.05 |
| Other | $0.10 |
| **Total** | **$0.44-0.60** |

---

## ✅ Success Checklist

Before deploying to production, verify:

- [ ] All 3 test suites pass
- [ ] Environment variables are set
- [ ] API keys are valid
- [ ] Images are being found and validated
- [ ] Vision analysis returns structured JSON
- [ ] Statistical analysis completes
- [ ] Visualizations are generated
- [ ] Timeline and documents are created
- [ ] Total cost is within budget ($0.40-0.60)
- [ ] Total duration is acceptable (2-6 min)

---

## 🚀 Next Steps After Testing

### If All Tests Pass ✅

1. **Deploy to Convex**:
   ```bash
   npx convex deploy
   ```

2. **Test in UI**:
   - Open Agent Dashboard
   - Click "Visual LLM Validation"
   - Configure and run workflow
   - Review results in timeline

3. **Monitor Production**:
   - Check logs for errors
   - Monitor API costs
   - Review quality scores
   - Iterate on prompts

### If Tests Fail ❌

1. **Check Environment**:
   ```bash
   echo $LINKUP_API_KEY
   echo $OPENAI_API_KEY
   echo $GOOGLE_GENAI_API_KEY
   ```

2. **Review Error Messages**:
   - Read full error output
   - Check API key validity
   - Verify network connectivity

3. **Run Individual Components**:
   ```bash
   # Test just Linkup
   npx tsx agents/app/test_linkup_integration.ts
   
   # Test just vision
   npx tsx agents/app/test_visual_llm.ts
   ```

4. **Check Documentation**:
   - `docs/LINKUP_INTEGRATION_GUIDE.md`
   - `docs/GOOGLE_GENAI_SDK_FIX.md`
   - `docs/TEST_CASES_AND_EXPECTED_OUTPUTS.md`

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| `TEST_QUICK_REFERENCE.md` | This file - quick test guide |
| `docs/TEST_CASES_AND_EXPECTED_OUTPUTS.md` | Detailed test cases |
| `docs/LINKUP_INTEGRATION_GUIDE.md` | Linkup API usage |
| `docs/GOOGLE_GENAI_SDK_FIX.md` | Gemini API fix details |
| `docs/LINKUP_INTEGRATION_SUMMARY.md` | Implementation summary |
| `VISUAL_LLM_QUICKSTART.md` | Overall quick start |

---

## 🎯 TL;DR - Run This Now

```bash
# 1. Set API keys
export LINKUP_API_KEY="your-key"
export OPENAI_API_KEY="sk-your-key"
export GOOGLE_GENAI_API_KEY="your-key"

# 2. Run quick test (20s)
npx tsx agents/app/test_linkup_integration.ts

# 3. If that passes, run full workflow (3-4 min)
npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_visual_llm_validation_FIXED.json

# 4. Deploy
npx convex deploy
```

**Expected Result**: All tests pass, workflow completes in 3-4 minutes, costs ~$0.50

🚀 **Ready to test!**

