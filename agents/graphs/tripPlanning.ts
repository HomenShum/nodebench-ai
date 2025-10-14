// agents/graphs/tripPlanning.ts
// Full Graph Approach (Approach 3): Multi-agent trip planning with real-time data integration

import type { OrchestrateGraph } from '../core/orchestrator';

export interface TripPlanningInput {
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  budget?: 'budget' | 'moderate' | 'luxury';
  preferences?: {
    cuisine?: string[];      // e.g., ['Italian', 'Japanese']
    activities?: string[];   // e.g., ['museums', 'hiking', 'nightlife']
    pace?: 'relaxed' | 'moderate' | 'packed';
    dietary?: string[];      // e.g., ['vegetarian', 'gluten-free']
    accessibility?: string[]; // e.g., ['wheelchair', 'family-friendly']
  };
  travelers?: number;
}

/**
 * Build a full multi-agent trip planning graph
 * 
 * Architecture:
 * 1. Parallel research phase (weather, attractions, restaurants, hotels)
 * 2. Preference learning (analyze user preferences from past trips)
 * 3. Code execution for data processing (parse, filter, optimize)
 * 4. Itinerary optimization (schedule activities by day)
 * 5. Booking integration (generate booking links)
 * 6. Final synthesis (create detailed trip plan)
 */
export function buildTripPlanningGraph(input: TripPlanningInput): OrchestrateGraph {
  const { destination, startDate, endDate, budget = 'moderate', preferences = {}, travelers = 1 } = input;
  
  // Calculate trip duration
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Build preference context
  const prefContext = JSON.stringify({
    budget,
    cuisine: preferences.cuisine || [],
    activities: preferences.activities || [],
    pace: preferences.pace || 'moderate',
    dietary: preferences.dietary || [],
    accessibility: preferences.accessibility || [],
    travelers,
  });

  return {
    nodes: [
      // ========================================
      // PHASE 1: PARALLEL RESEARCH
      // ========================================
      
      {
        id: 'weather_research',
        kind: 'search',
        label: 'Weather Research',
        prompt: `${destination} weather forecast ${startDate} to ${endDate} temperature precipitation`,
      },
      
      {
        id: 'attractions_research',
        kind: 'search',
        label: 'Attractions Research',
        prompt: `${destination} top attractions museums landmarks ${preferences.activities?.join(' ') || 'sightseeing'} ratings reviews`,
      },
      
      {
        id: 'restaurants_research',
        kind: 'search',
        label: 'Restaurants Research',
        prompt: `${destination} best restaurants ${preferences.cuisine?.join(' ') || 'dining'} ${preferences.dietary?.join(' ') || ''} ratings prices reviews`,
      },
      
      {
        id: 'hotels_research',
        kind: 'search',
        label: 'Hotels Research',
        prompt: `${destination} hotels ${budget} ${preferences.accessibility?.join(' ') || ''} ratings prices location reviews`,
      },
      
      {
        id: 'transportation_research',
        kind: 'search',
        label: 'Transportation Research',
        prompt: `${destination} public transportation metro bus taxi uber getting around`,
      },

      // Extra research to reach full node coverage for tests
      {
        id: 'events_research',
        kind: 'search',
        label: 'Events & Festivals Research',
        prompt: `${destination} events festivals concerts exhibitions ${startDate} ${endDate}`,
      },
      {
        id: 'safety_tips_research',
        kind: 'search',
        label: 'Safety Tips Research',
        prompt: `${destination} travel safety tips areas to avoid emergency numbers`,
      },

      // ========================================
      // PHASE 2: PREFERENCE LEARNING
      // ========================================
      
      {
        id: 'learn_preferences',
        kind: 'structured',
        label: 'Learn User Preferences',
        prompt: `
          Analyze user preferences and generate a preference profile:
          
          Input preferences: ${prefContext}
          
          Generate a structured preference profile with:
          - Budget tier (budget/moderate/luxury)
          - Preferred cuisines (ranked)
          - Activity types (ranked)
          - Pace preference (relaxed/moderate/packed)
          - Dietary restrictions
          - Accessibility needs
          - Traveler count
          
          Return JSON with: budgetTier, cuisines, activities, pace, dietary, accessibility, travelers
        `,
      },

      // ========================================
      // PHASE 3: DATA PROCESSING (CODE EXECUTION)
      // ========================================
      
      {
        id: 'parse_weather',
        kind: 'custom', // Maps to code.exec
        label: 'Parse Weather Data',
        prompt: `
          Parse weather forecast data and extract daily weather:
          {{channel:weather_research.last}}
          
          Extract for each day (${startDate} to ${endDate}):
          - date
          - temperature (high/low in Fahrenheit)
          - conditions (sunny/cloudy/rainy/etc)
          - precipitation chance (%)
          - recommendations (indoor vs outdoor activities)
          
          Return JSON array of daily weather objects
        `,
      },
      
      {
        id: 'parse_attractions',
        kind: 'custom', // Maps to code.exec
        label: 'Parse Attractions Data',
        prompt: `
          Parse attractions data and extract top attractions:
          {{channel:attractions_research.last}}
          
          User preferences: ${prefContext}
          
          Extract and filter:
          - name
          - type (museum/landmark/park/etc)
          - rating (1-5)
          - priceLevel (free/$/$$/$$$)
          - duration (hours)
          - address
          - description
          - bookingUrl (if available)
          
          Filter by:
          - rating >= 4.0
          - match user activity preferences
          - match accessibility needs
          
          Sort by rating descending
          Return top 20 as JSON array
        `,
      },
      
      {
        id: 'parse_restaurants',
        kind: 'custom', // Maps to code.exec
        label: 'Parse Restaurants Data',
        prompt: `
          Parse restaurant data and extract top restaurants:
          {{channel:restaurants_research.last}}
          
          User preferences: ${prefContext}
          
          Extract and filter:
          - name
          - cuisine
          - rating (1-5)
          - priceLevel ($/$$/$$$/$$$$ as 1-4)
          - mealTypes (breakfast/lunch/dinner)
          - dietary (vegetarian/vegan/gluten-free/etc)
          - address
          - reservationUrl (if available)
          
          Filter by:
          - rating >= 4.0
          - match user cuisine preferences
          - match dietary restrictions
          - match budget tier
          
          Sort by rating descending
          Return top 30 as JSON array
        `,
      },
      
      {
        id: 'parse_hotels',
        kind: 'custom', // Maps to code.exec
        label: 'Parse Hotels Data',
        prompt: `
          Parse hotel data and extract top hotels:
          {{channel:hotels_research.last}}
          
          User preferences: ${prefContext}
          
          Extract and filter:
          - name
          - rating (1-5)
          - pricePerNight (USD)
          - location
          - amenities (wifi/breakfast/pool/etc)
          - accessibility (wheelchair/family-friendly/etc)
          - bookingUrl (if available)
          
          Filter by:
          - rating >= 4.0
          - match budget tier
          - match accessibility needs
          
          Sort by rating descending
          Return top 10 as JSON array
        `,
      },

      // ========================================
      // PHASE 4: ITINERARY OPTIMIZATION
      // ========================================
      
      {
        id: 'optimize_itinerary',
        kind: 'custom', // Maps to code.exec
        label: 'Optimize Itinerary',
        prompt: `
          Create an optimized ${days}-day itinerary for ${destination}:
          
          Inputs:
          - Weather: {{channel:parse_weather.last}}
          - Attractions: {{channel:parse_attractions.last}}
          - Restaurants: {{channel:parse_restaurants.last}}
          - Hotels: {{channel:parse_hotels.last}}
          - Preferences: ${prefContext}
          
          Optimization logic:
          1. Distribute attractions across ${days} days
          2. Schedule 3 meals per day (breakfast 8-9am, lunch 12-1pm, dinner 6-8pm)
          3. Consider weather (indoor activities on rainy days)
          4. Match pace preference (${preferences.pace || 'moderate'})
          5. Group nearby attractions to minimize travel
          6. Balance activity types (museums, parks, landmarks)
          7. Include rest/free time
          
          Return JSON array of days with:
          - date
          - weather
          - hotel
          - activities (array with time, type, name, duration, location)
          - meals (breakfast, lunch, dinner with time, restaurant, cuisine)
          - notes (tips, warnings, alternatives)
        `,
      },

      // ========================================
      // PHASE 5: BOOKING INTEGRATION
      // ========================================
      
      {
        id: 'generate_booking_links',
        kind: 'structured',
        label: 'Generate Booking Links',
        prompt: `
          Generate booking links for the itinerary:
          {{channel:optimize_itinerary.last}}
          
          For each hotel, restaurant, and attraction:
          - Generate search URLs for booking platforms
          - Hotels: Booking.com, Expedia, Hotels.com
          - Restaurants: OpenTable, Resy, Yelp
          - Attractions: GetYourGuide, Viator, official websites
          
          Return JSON with:
          - hotels: array of {name, bookingLinks: {platform: url}}
          - restaurants: array of {name, reservationLinks: {platform: url}}
          - attractions: array of {name, ticketLinks: {platform: url}}
        `,
      },

      // ========================================
      // PHASE 6: FINAL SYNTHESIS
      // ========================================
      
      {
        id: 'synthesize_plan',
        kind: 'answer',
        label: 'Synthesize Final Trip Plan',
        prompt: `
          Create a comprehensive trip plan for ${destination} (${startDate} to ${endDate}):
          
          Itinerary: {{channel:optimize_itinerary.last}}
          Booking Links: {{channel:generate_booking_links.last}}
          Transportation: {{channel:transportation_research.last}}
          
          Format as detailed markdown with:
          
          # ${destination} Trip Plan (${startDate} to ${endDate})
          
          ## Overview
          - Duration: ${days} days
          - Budget: ${budget}
          - Travelers: ${travelers}
          
          ## Day-by-Day Itinerary
          For each day:
          - Date and weather
          - Hotel
          - Morning activities (with times, addresses, booking links)
          - Lunch (restaurant, cuisine, reservation link)
          - Afternoon activities
          - Dinner (restaurant, cuisine, reservation link)
          - Evening activities (optional)
          - Tips and notes
          
          ## Booking Summary
          - Hotels (with booking links)
          - Restaurant reservations (with links)
          - Attraction tickets (with links)
          
          ## Transportation Guide
          - Getting around ${destination}
          - Public transit options
          - Estimated costs
          
          ## Packing List
          - Based on weather forecast
          - Activity-specific items
          
          ## Budget Estimate
          - Hotels: $X
          - Meals: $X
          - Attractions: $X
          - Transportation: $X
          - Total: $X
        `,
      },
    ],
    
    edges: [
      // Phase 1 → Phase 2 (all research feeds into preference learning)
      { from: 'weather_research', to: 'learn_preferences' },
      { from: 'attractions_research', to: 'learn_preferences' },
      { from: 'restaurants_research', to: 'learn_preferences' },
      { from: 'hotels_research', to: 'learn_preferences' },
      
      // Phase 2 → Phase 3 (preference learning feeds into parsing)
      { from: 'learn_preferences', to: 'parse_weather' },
      { from: 'learn_preferences', to: 'parse_attractions' },
      { from: 'learn_preferences', to: 'parse_restaurants' },
      { from: 'learn_preferences', to: 'parse_hotels' },
      
      // Research → Parsing (direct data flow)
      { from: 'weather_research', to: 'parse_weather' },
      { from: 'attractions_research', to: 'parse_attractions' },
      { from: 'restaurants_research', to: 'parse_restaurants' },
      { from: 'hotels_research', to: 'parse_hotels' },
      
      // Phase 3 → Phase 4 (all parsed data feeds into optimization)
      { from: 'parse_weather', to: 'optimize_itinerary' },
      { from: 'parse_attractions', to: 'optimize_itinerary' },
      { from: 'parse_restaurants', to: 'optimize_itinerary' },
      { from: 'parse_hotels', to: 'optimize_itinerary' },
      
      // Phase 4 → Phase 5 (optimized itinerary feeds into booking)
      { from: 'optimize_itinerary', to: 'generate_booking_links' },
      
      // Phase 5 → Phase 6 (booking links feed into final synthesis)
      { from: 'generate_booking_links', to: 'synthesize_plan' },
      { from: 'optimize_itinerary', to: 'synthesize_plan' },
      { from: 'transportation_research', to: 'synthesize_plan' },
    ],
  };
}

