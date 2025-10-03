# Trip Planning Enhancement for Multi-Agent System

## Current State Assessment

### ✅ What Works Today
Your multi-agent orchestrator excels at:
- **Research tasks**: Web search + synthesis
- **Structured outputs**: JSON schema generation
- **Parallel workflows**: Multiple agents working simultaneously
- **Validation**: Multi-step verification and consensus

### ❌ What's Missing for Trip Planning
- **Temporal reasoning**: No date/time logic or calendar awareness
- **Location services**: No maps, places, or geospatial APIs
- **Itinerary optimization**: No scheduling or constraint solving
- **Specialized travel APIs**: No flights, hotels, restaurants integration
- **Preference modeling**: No user profile or personalization
- **Transactional tools**: Read-only (no booking capabilities)

---

## Enhancement Plan

### **Phase 1: Add Planning Task Type**

#### **1.1 Update TaskSpec Types**
```typescript
// agents/core/plan.ts
export type TaskSpec = {
  goal: string;
  type: 'research' | 'summarize' | 'edit' | 'planning' | 'custom'; // Add 'planning'
  input?: Record<string, unknown>;
  constraints?: { 
    maxSteps?: number;
    startDate?: string;    // NEW: ISO date
    endDate?: string;      // NEW: ISO date
    budget?: number;       // NEW: USD
    preferences?: string[]; // NEW: ["food", "museums", "hiking"]
  };
  planHints?: string[];
  overridePlan?: Partial<Plan> & { groups: Step[][] };
};
```

#### **1.2 Add Planning Step Kinds**
```typescript
// agents/core/plan.ts
export type StepKind = 
  | 'web.search' 
  | 'web.fetch' 
  | 'answer' 
  | 'summarize' 
  | 'structured'
  | 'places.search'      // NEW: Google Places API
  | 'maps.directions'    // NEW: Google Maps directions
  | 'calendar.optimize'  // NEW: Schedule optimization
  | 'weather.forecast';  // NEW: Weather data
```

#### **1.3 Implement Planning Planner**
```typescript
// agents/core/plan.ts
if (taskSpec.type === 'planning') {
  const { startDate, endDate, preferences, budget } = taskSpec.constraints || {};
  const location = String((taskSpec.input as any)?.location || '');
  
  const steps: Step[] = [
    // Step 1: Research destination
    {
      kind: 'web.search',
      label: `Research ${location} attractions`,
      args: {
        query: `${location} top attractions ${preferences?.join(' ')} ${startDate}`,
        intent: 'planning',
      },
    },
    // Step 2: Get weather forecast
    {
      kind: 'weather.forecast',
      label: `Weather forecast for ${location}`,
      args: { location, startDate, endDate },
    },
    // Step 3: Find places (restaurants, hotels, activities)
    {
      kind: 'places.search',
      label: 'Find recommended places',
      args: { 
        location, 
        types: ['restaurant', 'tourist_attraction', 'lodging'],
        preferences,
        budget,
      },
    },
    // Step 4: Optimize itinerary
    {
      kind: 'calendar.optimize',
      label: 'Create optimized itinerary',
      args: { startDate, endDate, places: '{{places.search.result}}' },
    },
    // Step 5: Generate final plan
    {
      kind: 'structured',
      label: 'Generate structured trip plan',
      args: {
        prompt: `Create a detailed day-by-day itinerary for ${location} from ${startDate} to ${endDate}`,
        schema: {
          type: 'object',
          properties: {
            days: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  morning: { type: 'array', items: { type: 'object' } },
                  afternoon: { type: 'array', items: { type: 'object' } },
                  evening: { type: 'array', items: { type: 'object' } },
                  notes: { type: 'string' },
                },
              },
            },
            budget_estimate: { type: 'number' },
            weather_summary: { type: 'string' },
          },
        },
      },
    },
  ];

  return {
    intent: 'custom',
    groups: chunkBy(steps, maxSteps).map((chunk) => chunk),
    explain: `Plan trip to ${location} from ${startDate} to ${endDate}`,
    final: 'answer_only',
  };
}
```

---

### **Phase 2: Add New Tools**

#### **2.1 Google Places Tool**
```typescript
// agents/tools/places.ts
import { Client } from "@googlemaps/google-maps-services-js";

export function placesSearchTool() {
  const client = new Client({});
  
  return async (args: any) => {
    const { location, types, preferences, budget } = args;
    
    const response = await client.placesNearby({
      params: {
        location: location,
        radius: 5000, // 5km
        type: types,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    });
    
    // Filter by preferences and budget
    const filtered = response.data.results
      .filter(place => {
        if (budget && place.price_level && place.price_level > budget) return false;
        return true;
      })
      .slice(0, 20);
    
    return {
      places: filtered.map(p => ({
        name: p.name,
        address: p.vicinity,
        rating: p.rating,
        price_level: p.price_level,
        types: p.types,
        place_id: p.place_id,
      })),
    };
  };
}
```

#### **2.2 Weather Forecast Tool**
```typescript
// agents/tools/weather.ts
export function weatherForecastTool() {
  return async (args: any) => {
    const { location, startDate, endDate } = args;
    
    // Use OpenWeatherMap or similar API
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${process.env.OPENWEATHER_API_KEY}`
    );
    
    const data = await response.json();
    
    // Filter forecast for date range
    const forecasts = data.list.filter((item: any) => {
      const date = new Date(item.dt * 1000);
      return date >= new Date(startDate) && date <= new Date(endDate);
    });
    
    return {
      summary: `${location} weather: ${forecasts[0]?.weather[0]?.description}`,
      forecasts: forecasts.map((f: any) => ({
        date: new Date(f.dt * 1000).toISOString(),
        temp: f.main.temp,
        description: f.weather[0].description,
      })),
    };
  };
}
```

#### **2.3 Calendar Optimizer Tool**
```typescript
// agents/tools/calendar.ts
export function calendarOptimizeTool() {
  return async (args: any) => {
    const { startDate, endDate, places } = args;
    
    // Simple greedy scheduling algorithm
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    const itinerary = [];
    let currentDay = new Date(start);
    
    for (let i = 0; i < days; i++) {
      const dayPlan = {
        date: currentDay.toISOString().split('T')[0],
        morning: places.slice(i * 3, i * 3 + 1),
        afternoon: places.slice(i * 3 + 1, i * 3 + 2),
        evening: places.slice(i * 3 + 2, i * 3 + 3),
      };
      itinerary.push(dayPlan);
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return { itinerary };
  };
}
```

---

### **Phase 3: Update Tools Registry**

```typescript
// convex/agents/orchestrate.ts
const tools: ToolsRegistry = {
  "web.search": searchTool({ root: demoRoot }),
  "web.fetch": fetchUrlTool(),
  "answer": answerTool,
  "structured": structuredTool,
  
  // NEW: Planning tools
  "places.search": placesSearchTool(),
  "weather.forecast": weatherForecastTool(),
  "calendar.optimize": calendarOptimizeTool(),
  "maps.directions": mapsDirectionsTool(), // Optional
};
```

---

### **Phase 4: Create Trip Planning Graph**

For more complex trip planning, use the graph-based orchestration:

```typescript
const tripPlanningGraph: OrchestrateGraph = {
  nodes: [
    {
      id: "research",
      kind: "search",
      label: "Research destination",
      prompt: "{{topic}} attractions and activities",
    },
    {
      id: "weather",
      kind: "custom",
      label: "Get weather forecast",
      prompt: "weather:{{topic}}:{{dates}}",
    },
    {
      id: "places",
      kind: "structured",
      label: "Find places",
      prompt: "Find top restaurants, hotels, and attractions in {{topic}}",
    },
    {
      id: "optimize",
      kind: "structured",
      label: "Optimize itinerary",
      prompt: "Create day-by-day schedule using: {{channel:research.last}} {{channel:places.last}}",
    },
    {
      id: "finalize",
      kind: "answer",
      label: "Generate final plan",
      prompt: "Create detailed trip plan: {{channel:optimize.last}}",
    },
  ],
  edges: [
    { from: "research", to: "places" },
    { from: "weather", to: "optimize" },
    { from: "places", to: "optimize" },
    { from: "optimize", to: "finalize" },
  ],
};
```

---

## Example Usage

### **Input**
```typescript
const taskSpec = {
  goal: "Make a plan for SF trip spanning from 10/3/2025 to 10/4/2025",
  type: "planning",
  input: {
    location: "San Francisco, CA",
  },
  constraints: {
    startDate: "2025-10-03",
    endDate: "2025-10-04",
    budget: 3, // Google Places price level (1-4)
    preferences: ["food", "museums", "scenic views"],
    maxSteps: 8,
  },
};
```

### **Expected Output**
```json
{
  "days": [
    {
      "date": "2025-10-03",
      "morning": [
        {
          "time": "09:00",
          "activity": "Golden Gate Bridge",
          "duration": "2 hours",
          "notes": "Arrive early to avoid crowds"
        }
      ],
      "afternoon": [
        {
          "time": "13:00",
          "activity": "Fisherman's Wharf",
          "duration": "3 hours",
          "notes": "Lunch at Boudin Bakery"
        }
      ],
      "evening": [
        {
          "time": "19:00",
          "activity": "Dinner at Ferry Building",
          "duration": "2 hours"
        }
      ]
    },
    {
      "date": "2025-10-04",
      "morning": [
        {
          "time": "10:00",
          "activity": "SFMOMA",
          "duration": "3 hours"
        }
      ],
      "afternoon": [
        {
          "time": "14:00",
          "activity": "Chinatown exploration",
          "duration": "2 hours"
        }
      ],
      "evening": [
        {
          "time": "18:00",
          "activity": "Sunset at Twin Peaks",
          "duration": "1 hour"
        }
      ]
    }
  ],
  "budget_estimate": 450,
  "weather_summary": "Partly cloudy, 65-72°F both days"
}
```

---

## Implementation Checklist

### **Core Changes**
- [ ] Add `planning` to TaskSpec type enum
- [ ] Add temporal constraints (startDate, endDate, budget, preferences)
- [ ] Add new StepKind types (places.search, weather.forecast, calendar.optimize)
- [ ] Implement planning planner in `makePlan()`

### **New Tools**
- [ ] `places.search` - Google Places API integration
- [ ] `weather.forecast` - OpenWeatherMap integration
- [ ] `calendar.optimize` - Scheduling algorithm
- [ ] `maps.directions` - Google Maps directions (optional)

### **Dependencies**
- [ ] Install `@googlemaps/google-maps-services-js`
- [ ] Get Google Maps API key
- [ ] Get OpenWeatherMap API key
- [ ] Add API keys to environment variables

### **Testing**
- [ ] Unit tests for new tools
- [ ] Integration test for planning task type
- [ ] E2E test with real APIs (gated)
- [ ] Mock scenario for SF trip planning

---

## Alternative: Lightweight Approach

If you don't want to add external APIs, you can still improve trip planning with:

### **1. Enhanced Web Search**
Use structured search with specific schemas:
```typescript
{
  kind: 'web.search',
  args: {
    query: 'San Francisco 2-day itinerary October 2025',
    schema: {
      type: 'object',
      properties: {
        day1: { type: 'array', items: { type: 'object' } },
        day2: { type: 'array', items: { type: 'object' } },
      },
    },
  },
}
```

### **2. Multi-Agent Consensus**
Use multiple agents to research different aspects:
- **Agent A**: Research attractions
- **Agent B**: Research restaurants
- **Agent C**: Research logistics
- **Synthesizer**: Combine into coherent itinerary

### **3. Structured Output**
Use the existing `structured` tool with a detailed schema:
```typescript
{
  kind: 'structured',
  args: {
    prompt: 'Create a 2-day SF itinerary for 10/3-10/4/2025',
    schema: tripItinerarySchema, // Detailed JSON schema
  },
}
```

---

## Conclusion

**Current State**: ⭐⭐☆☆☆ for trip planning
- Will produce generic recommendations
- No actual scheduling or optimization
- No real-time data integration

**With Enhancements**: ⭐⭐⭐⭐⭐ for trip planning
- Structured day-by-day itineraries
- Weather-aware planning
- Budget-conscious recommendations
- Optimized routing and timing

**Recommendation**: Start with the lightweight approach (enhanced web search + structured outputs) and add specialized tools (Places, Weather) as needed for production use.

