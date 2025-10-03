# Code Generation Approach: Replacing Domain APIs

## Overview

Instead of integrating domain-specific APIs (Google Places, Weather, etc.), we use **Gemini's built-in code execution** to process web search results. This approach is:

- ✅ **Zero dependencies** - No API keys, no rate limits, no vm2 sandbox
- ✅ **Infinitely flexible** - Works for any domain
- ✅ **Self-improving** - Gets better as Gemini improves
- ✅ **Cost-effective** - Only pay for LLM calls, not API usage
- ✅ **40+ Python libraries** - numpy, pandas, matplotlib, scipy, sklearn, etc.
- ✅ **Google-managed** - Battle-tested sandbox, auto-retry, 30s timeout

---

## Architecture

### **Pattern: Search → Code Execution (Gemini) → Synthesize**

```
1. Web Search         → Get raw data from the web
2. Gemini Code Exec   → Generate + execute Python code in one call
3. Synthesize         → LLM creates final output (optional)
```

**Key Advantage**: Gemini generates AND executes code in a single API call, eliminating the need for separate code generation + execution steps.

---

## Example: SF Trip Planning

### **Traditional Approach (Domain APIs)**

```typescript
// ❌ Requires Google Places API key, rate limits, costs
const places = await googlePlaces.search({
  location: "San Francisco",
  type: "restaurant",
  radius: 5000
});

const weather = await openWeather.forecast({
  city: "San Francisco",
  dates: ["2025-10-03", "2025-10-04"]
});

const itinerary = optimizeSchedule(places, weather);
```

**Problems**:
- Need API keys for Google, OpenWeather
- Rate limits (e.g., 1000 requests/day)
- Costs ($5-50/month per API)
- Maintenance (API changes, deprecations)

---

### **Gemini Code Execution Approach**

```typescript
// ✅ No API keys (except Gemini), no dependencies, infinite flexibility

// Step 1: Web search for restaurants
const searchResults = await webSearch({
  query: "San Francisco best restaurants October 2025 ratings prices"
});

// Step 2: Gemini generates AND executes Python code in one call
const result = await geminiCodeExec({
  prompt: `
    Parse these search results and extract top 10 restaurants by rating:
    ${JSON.stringify(searchResults)}

    Extract: name, rating, priceLevel (count $ symbols), cuisine
    Filter: rating >= 4.0
    Sort: by rating descending
    Return: JSON array of top 10
  `
});

// result.code contains the generated Python code
// result.output contains the execution result (auto-parsed as JSON)
const topRestaurants = result.result; // Already parsed JSON

// Step 3: Synthesize into itinerary (optional)
const itinerary = await synthesize({
  restaurants: topRestaurants,
  dates: ["2025-10-03", "2025-10-04"]
});
```

**Benefits**:
- ✅ Only one API key needed (Gemini)
- ✅ No rate limits (beyond Gemini's)
- ✅ Works for any domain (restaurants, hotels, activities, weather)
- ✅ Adapts to changing data formats automatically
- ✅ **40+ Python libraries** (numpy, pandas, matplotlib, scipy, sklearn)
- ✅ **Auto-retry** on errors (up to 5x)
- ✅ **Matplotlib plotting** with inline images
- ✅ **File I/O** support (CSV, text, images)

---

## Implementation

### **1. Install Gemini SDK**

```bash
npm install @google/genai
```

### **2. Set Environment Variable**

```bash
export GOOGLE_GENAI_API_KEY="your-gemini-api-key"
# or
export GEMINI_API_KEY="your-gemini-api-key"
```

### **3. Add Code Execution Tool**

Already created in `agents/tools/codeExec.ts`:

```typescript
import { codeExecTool } from './tools/codeExec';

const tools: ToolsRegistry = {
  "web.search": searchTool({ root: demoRoot }),
  "answer": answerTool,
  "structured": structuredTool,
  "code.exec": codeExecTool(), // NEW - Uses Gemini code execution
};
```

### **4. Add Code Execution Step Kind**

```typescript
// agents/core/plan.ts
export type StepKind =
  | 'web.search'
  | 'web.fetch'
  | 'answer'
  | 'summarize'
  | 'structured'
  | 'code.exec';  // NEW
```

### **5. Create Trip Planning Graph**

```typescript
const tripPlanningGraph: OrchestrateGraph = {
  nodes: [
    // Step 1: Search for restaurants
    {
      id: "search_restaurants",
      kind: "search",
      label: "Search SF restaurants",
      prompt: "San Francisco best restaurants October 2025 with ratings and prices",
    },

    // Step 2: Gemini code execution (parse + filter + sort)
    {
      id: "parse_restaurants",
      kind: "custom", // Maps to code.exec tool
      label: "Parse and filter restaurants",
      prompt: `
        Parse these search results and extract top 10 restaurants:
        {{channel:search_restaurants.last}}

        Extract: name, rating, priceLevel (count $ symbols), cuisine, address
        Filter: rating >= 4.0
        Sort: by rating descending
        Return: JSON array of top 10 restaurants
      `,
    },
    
    // Step 3: Search for weather
    {
      id: "search_weather",
      kind: "search",
      label: "Search SF weather forecast",
      prompt: "San Francisco weather forecast October 3-4 2025",
    },

    // Step 4: Gemini code execution (create itinerary)
    {
      id: "create_itinerary",
      kind: "custom", // Maps to code.exec tool
      label: "Create 2-day itinerary",
      prompt: `
        Create a 2-day itinerary using:
        - Restaurants: {{channel:parse_restaurants.last}}
        - Weather: {{channel:search_weather.last}}

        Logic:
        - Distribute restaurants across 2 days (Oct 3-4, 2025)
        - Schedule: breakfast (9am), lunch (1pm), dinner (7pm)
        - Consider weather for indoor/outdoor seating

        Return: JSON array of days with scheduled meals
      `,
    },
    
    // Step 5: Synthesize final plan
    {
      id: "synthesize",
      kind: "answer",
      label: "Create final trip plan",
      prompt: `Create a detailed 2-day SF trip plan using:
        - Itinerary: {{channel:create_itinerary.last}}
        - Weather: {{channel:search_weather.last}}

        Format as markdown with times, addresses, and tips.`,
    },
  ],
  edges: [
    { from: "search_restaurants", to: "parse_restaurants" },
    { from: "search_weather", to: "create_itinerary" },
    { from: "parse_restaurants", to: "create_itinerary" },
    { from: "create_itinerary", to: "synthesize" },
  ],
};
```

**Key Simplification**: Reduced from 7 nodes to 5 nodes by combining code generation + execution into single Gemini calls.
```

---

## Real-World Example

### **Input**
```typescript
{
  goal: "Make a plan for SF trip 10/3-10/4/2025",
  type: "custom",
  graph: tripPlanningGraph
}
```

### **Execution Flow**

#### **Node 1: search_restaurants**
```
Query: "San Francisco best restaurants October 2025 with ratings and prices"
Result: [
  { title: "Zuni Café", snippet: "4.5 stars, $$$ Mediterranean..." },
  { title: "Tartine Bakery", snippet: "4.7 stars, $$ Bakery..." },
  ...
]
```

#### **Node 2: parse_restaurants (Gemini Code Execution)**

**Gemini generates this Python code**:
```python
import json
import re

# Parse search results
restaurants = []
for result in search_results:
    # Extract rating
    rating_match = re.search(r'(\d+\.\d+) stars', result['snippet'])
    rating = float(rating_match.group(1)) if rating_match else 0.0

    # Extract price level (count $ symbols)
    price_match = re.search(r'(\$+)', result['snippet'])
    price_level = len(price_match.group(1)) if price_match else 2

    # Extract cuisine
    cuisine_match = re.search(r'\$+ (.+?)\.\.\.', result['snippet'])
    cuisine = cuisine_match.group(1) if cuisine_match else 'Unknown'

    restaurants.append({
        'name': result['title'],
        'rating': rating,
        'priceLevel': price_level,
        'cuisine': cuisine,
        'address': result.get('url', '')
    })

# Filter, sort, and return top 10
filtered = [r for r in restaurants if r['rating'] >= 4.0]
sorted_restaurants = sorted(filtered, key=lambda x: x['rating'], reverse=True)
top_10 = sorted_restaurants[:10]

print(json.dumps(top_10))
```

**Gemini executes the code and returns**:
```json
[
  { "name": "Tartine Bakery", "rating": 4.7, "priceLevel": 2, "cuisine": "Bakery", "address": "..." },
  { "name": "Zuni Café", "rating": 4.5, "priceLevel": 3, "cuisine": "Mediterranean", "address": "..." },
  ...
]
```

**Key Advantage**: Code generation + execution happens in **one API call** to Gemini.

#### **Node 3: search_weather**
```
Query: "San Francisco weather forecast October 3-4 2025"
Result: "Partly cloudy, 65-72°F both days, no rain expected"
```

#### **Node 4: create_itinerary (Gemini Code Execution)**

**Gemini generates this Python code**:
```python
import json

# Input data
restaurants = [...]  # From previous node
weather_info = "Partly cloudy, 65-72°F both days, no rain expected"

# Create 2-day itinerary
days = [
    {'date': '2025-10-03', 'weather': weather_info, 'meals': []},
    {'date': '2025-10-04', 'weather': weather_info, 'meals': []}
]

meal_times = ['09:00', '13:00', '19:00']
meal_types = ['Breakfast', 'Lunch', 'Dinner']

# Distribute restaurants across days
for i, restaurant in enumerate(restaurants[:6]):  # 3 meals x 2 days
    day_index = i // 3
    meal_index = i % 3

    days[day_index]['meals'].append({
        'time': meal_times[meal_index],
        'type': meal_types[meal_index],
        'restaurant': restaurant['name'],
        'cuisine': restaurant['cuisine'],
        'rating': restaurant['rating'],
        'priceLevel': restaurant['priceLevel']
    })

print(json.dumps(days, indent=2))
```

**Gemini executes and returns**:
```json
[
  {
    "date": "2025-10-03",
    "weather": "Partly cloudy, 65-72°F",
    "meals": [
      { "time": "09:00", "type": "Breakfast", "restaurant": "Tartine Bakery", "rating": 4.7, ... },
      { "time": "13:00", "type": "Lunch", "restaurant": "Zuni Café", "rating": 4.5, ... },
      { "time": "19:00", "type": "Dinner", "restaurant": "State Bird Provisions", "rating": 4.6, ... }
    ]
  },
  {
    "date": "2025-10-04",
    "weather": "Partly cloudy, 65-72°F",
    "meals": [...]
  }
]
```

#### **Node 5: synthesize**
```markdown
# San Francisco Trip Plan: October 3-4, 2025

## Weather
Partly cloudy, 65-72°F both days. Perfect for walking!

## Day 1: October 3, 2025

### 9:00 AM - Breakfast at Tartine Bakery
- **Cuisine**: Bakery
- **Rating**: 4.7/5
- **Price**: $$
- **Tip**: Arrive early to avoid lines

### 1:00 PM - Lunch at Zuni Café
- **Cuisine**: Mediterranean
- **Rating**: 4.5/5
- **Price**: $$$
- **Tip**: Try their famous roast chicken

...
```

---

## Advantages Over Domain APIs

| Aspect | Domain APIs | Gemini Code Execution |
|--------|-------------|----------------------|
| **Setup** | Multiple API keys, SDKs, docs | Just Gemini API key |
| **Cost** | $5-50/month per API | LLM tokens only (~$0.005/request) |
| **Rate Limits** | 1000-10000/day | Gemini limits only (very high) |
| **Flexibility** | Fixed endpoints | Infinite adaptability |
| **Maintenance** | Track API changes | Auto-adapts to web changes |
| **Coverage** | Limited to API data | Entire web |
| **Latency** | 100-500ms | 2-4s (search + code exec) |
| **Libraries** | N/A | 40+ Python libraries |
| **Safety** | N/A | Google-managed sandbox |
| **Retry Logic** | Manual | Auto-retry (up to 5x) |
| **Plotting** | N/A | Matplotlib, seaborn |
| **File I/O** | N/A | CSV, text, images |

---

## Safety Considerations

### **Google-Managed Sandbox**
Gemini's code execution runs in a **Google-managed sandbox** with:
- ✅ **30-second timeout** (automatic)
- ✅ **Isolated environment** (no filesystem, network, or process access)
- ✅ **Auto-retry on errors** (up to 5 attempts)
- ✅ **Battle-tested** (used by millions of Gemini users)
- ✅ **No maintenance** (Google handles security updates)

### **Supported Libraries (Whitelisted by Google)**
```python
# Data processing
import numpy, pandas, scipy, scikit-learn

# Visualization
import matplotlib, seaborn

# File handling
import json, csv, xml, re

# Math
import sympy, mpmath

# And 30+ more safe libraries
```

### **Optional: Code Review Before Execution**
```typescript
// If you want extra safety, review generated code first
const result = await geminiCodeExec({ prompt: "..." });

console.log("Generated code:", result.code);
// Manually review or use another LLM to check for issues

if (approved) {
  // Code already executed by Gemini
  return result.result;
}
```

**Note**: Unlike vm2, you don't need to maintain the sandbox yourself. Google handles all security updates and patches.

---

## When to Use Each Approach

### **Use Gemini Code Execution When:**
- ✅ Data is available via web search
- ✅ Processing logic can be expressed in Python
- ✅ You want maximum flexibility
- ✅ You want to minimize dependencies
- ✅ Cost is a concern
- ✅ You need data processing (pandas, numpy)
- ✅ You need visualization (matplotlib)
- ✅ You need file I/O (CSV, text)

### **Use Domain APIs When:**
- ✅ Real-time data required (stock prices, live traffic)
- ✅ Transactional operations needed (booking, payments)
- ✅ Guaranteed data quality required
- ✅ Sub-second latency required (<100ms)
- ✅ Regulatory compliance (e.g., financial data)
- ✅ Need official data sources (government APIs)

---

## Conclusion

**For trip planning**, Gemini code execution is **superior** because:

1. **Web search** provides all the data (restaurants, weather, attractions)
2. **Gemini generates + executes Python code** in one API call
3. **40+ Python libraries** (numpy, pandas, matplotlib) for data processing
4. **No API dependencies** means no maintenance burden
5. **Infinite flexibility** - works for any city, any domain
6. **Cost-effective** - only pay for Gemini tokens (~$0.005/request)
7. **Google-managed sandbox** - no security maintenance needed
8. **Auto-retry** - handles transient errors automatically

**Recommendation**: Use Gemini code execution for trip planning. Only add domain APIs if you need:
- Real-time data (live traffic, stock prices)
- Transactional operations (booking, payments)
- Sub-100ms latency
- Official data sources (government APIs)

---

## Implementation Checklist

### **✅ Already Have**
- [x] Web search tool (`agents/tools/search.ts`)
- [x] Answer tool (`agents/tools/answer.ts`)
- [x] Graph orchestration (`agents/core/orchestrator.ts`)

### **🔧 Need to Add**
- [ ] Install `@google/genai`: `npm install @google/genai`
- [ ] Set `GOOGLE_GENAI_API_KEY` or `GEMINI_API_KEY` environment variable
- [ ] Code execution tool (`agents/tools/codeExec.ts`) - **CREATED** ✅
- [ ] Add `code.exec` to StepKind enum in `agents/core/plan.ts`
- [ ] Register `codeExecTool()` in tools registry
- [ ] Create trip planning graph template
- [ ] Test with SF trip example

### **Expected Quality**
- **Current (without code exec)**: ⭐⭐☆☆☆ (Generic recommendations)
- **With Gemini code exec**: ⭐⭐⭐⭐⭐ (Structured itinerary with real data)

---

**Bottom Line**: Gemini code execution is the **perfect solution** for trip planning because it combines web search flexibility with Python's data processing power, all in a Google-managed sandbox with zero maintenance. 🚀

