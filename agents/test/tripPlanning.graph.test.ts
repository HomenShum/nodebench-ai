import { describe, it, expect } from 'vitest';
import { buildTripPlanningGraph } from '../graphs/tripPlanning';

describe('Trip Planning Graph', () => {
  it('builds a valid graph with all required nodes', () => {
    const input = {
      destination: 'San Francisco',
      startDate: '2025-10-03',
      endDate: '2025-10-04',
      budget: 'moderate' as const,
      preferences: {
        cuisine: ['Italian', 'Japanese'],
        activities: ['museums', 'parks'],
        pace: 'moderate' as const,
      },
      travelers: 2,
    };

    const graph = buildTripPlanningGraph(input);

    // Verify graph structure
    expect(graph.nodes).toBeDefined();
    expect(graph.edges).toBeDefined();
    expect(Array.isArray(graph.nodes)).toBe(true);
    expect(Array.isArray(graph.edges)).toBe(true);

    // Verify node count (15 nodes total)
    expect(graph.nodes.length).toBe(15);

    // Verify edge count (20 edges total)
    expect(graph.edges.length).toBe(20);
  });

  it('includes all required research nodes', () => {
    const input = {
      destination: 'Paris',
      startDate: '2025-12-01',
      endDate: '2025-12-03',
    };

    const graph = buildTripPlanningGraph(input);
    const nodeIds = graph.nodes.map(n => n.id);

    // Phase 1: Research nodes
    expect(nodeIds).toContain('weather_research');
    expect(nodeIds).toContain('attractions_research');
    expect(nodeIds).toContain('restaurants_research');
    expect(nodeIds).toContain('hotels_research');
    expect(nodeIds).toContain('transportation_research');
  });

  it('includes preference learning node', () => {
    const input = {
      destination: 'Tokyo',
      startDate: '2025-11-01',
      endDate: '2025-11-05',
      preferences: {
        cuisine: ['Japanese', 'Ramen'],
        activities: ['temples', 'shopping'],
      },
    };

    const graph = buildTripPlanningGraph(input);
    const nodeIds = graph.nodes.map(n => n.id);

    // Phase 2: Preference learning
    expect(nodeIds).toContain('learn_preferences');
  });

  it('includes all data processing nodes', () => {
    const input = {
      destination: 'London',
      startDate: '2025-09-15',
      endDate: '2025-09-17',
    };

    const graph = buildTripPlanningGraph(input);
    const nodeIds = graph.nodes.map(n => n.id);

    // Phase 3: Data processing (code execution)
    expect(nodeIds).toContain('parse_weather');
    expect(nodeIds).toContain('parse_attractions');
    expect(nodeIds).toContain('parse_restaurants');
    expect(nodeIds).toContain('parse_hotels');

    // Verify these are 'custom' kind (maps to code.exec)
    const parseNodes = graph.nodes.filter(n => n.id.startsWith('parse_'));
    parseNodes.forEach(node => {
      expect(node.kind).toBe('custom');
    });
  });

  it('includes optimization and booking nodes', () => {
    const input = {
      destination: 'Barcelona',
      startDate: '2025-08-10',
      endDate: '2025-08-12',
    };

    const graph = buildTripPlanningGraph(input);
    const nodeIds = graph.nodes.map(n => n.id);

    // Phase 4: Optimization
    expect(nodeIds).toContain('optimize_itinerary');

    // Phase 5: Booking
    expect(nodeIds).toContain('generate_booking_links');

    // Verify optimize_itinerary is 'custom' kind
    const optimizeNode = graph.nodes.find(n => n.id === 'optimize_itinerary');
    expect(optimizeNode?.kind).toBe('custom');
  });

  it('includes final synthesis node', () => {
    const input = {
      destination: 'Rome',
      startDate: '2025-07-01',
      endDate: '2025-07-03',
    };

    const graph = buildTripPlanningGraph(input);
    const nodeIds = graph.nodes.map(n => n.id);

    // Phase 6: Synthesis
    expect(nodeIds).toContain('synthesize_plan');

    // Verify it's an 'answer' kind
    const synthesizeNode = graph.nodes.find(n => n.id === 'synthesize_plan');
    expect(synthesizeNode?.kind).toBe('answer');
  });

  it('creates correct dependency edges', () => {
    const input = {
      destination: 'New York',
      startDate: '2025-06-01',
      endDate: '2025-06-02',
    };

    const graph = buildTripPlanningGraph(input);

    // Verify research → preference learning edges
    expect(graph.edges).toContainEqual({ from: 'weather_research', to: 'learn_preferences' });
    expect(graph.edges).toContainEqual({ from: 'attractions_research', to: 'learn_preferences' });
    expect(graph.edges).toContainEqual({ from: 'restaurants_research', to: 'learn_preferences' });
    expect(graph.edges).toContainEqual({ from: 'hotels_research', to: 'learn_preferences' });

    // Verify preference learning → parsing edges
    expect(graph.edges).toContainEqual({ from: 'learn_preferences', to: 'parse_weather' });
    expect(graph.edges).toContainEqual({ from: 'learn_preferences', to: 'parse_attractions' });
    expect(graph.edges).toContainEqual({ from: 'learn_preferences', to: 'parse_restaurants' });
    expect(graph.edges).toContainEqual({ from: 'learn_preferences', to: 'parse_hotels' });

    // Verify research → parsing edges (direct data flow)
    expect(graph.edges).toContainEqual({ from: 'weather_research', to: 'parse_weather' });
    expect(graph.edges).toContainEqual({ from: 'attractions_research', to: 'parse_attractions' });
    expect(graph.edges).toContainEqual({ from: 'restaurants_research', to: 'parse_restaurants' });
    expect(graph.edges).toContainEqual({ from: 'hotels_research', to: 'parse_hotels' });

    // Verify parsing → optimization edges
    expect(graph.edges).toContainEqual({ from: 'parse_weather', to: 'optimize_itinerary' });
    expect(graph.edges).toContainEqual({ from: 'parse_attractions', to: 'optimize_itinerary' });
    expect(graph.edges).toContainEqual({ from: 'parse_restaurants', to: 'optimize_itinerary' });
    expect(graph.edges).toContainEqual({ from: 'parse_hotels', to: 'optimize_itinerary' });

    // Verify optimization → booking → synthesis edges
    expect(graph.edges).toContainEqual({ from: 'optimize_itinerary', to: 'generate_booking_links' });
    expect(graph.edges).toContainEqual({ from: 'generate_booking_links', to: 'synthesize_plan' });
    expect(graph.edges).toContainEqual({ from: 'optimize_itinerary', to: 'synthesize_plan' });
    expect(graph.edges).toContainEqual({ from: 'transportation_research', to: 'synthesize_plan' });
  });

  it('includes user preferences in prompts', () => {
    const input = {
      destination: 'Seattle',
      startDate: '2025-05-01',
      endDate: '2025-05-02',
      budget: 'luxury' as const,
      preferences: {
        cuisine: ['Seafood', 'Pacific Northwest'],
        activities: ['coffee tours', 'waterfront'],
        dietary: ['pescatarian'],
      },
      travelers: 4,
    };

    const graph = buildTripPlanningGraph(input);

    // Verify preferences are included in research prompts
    const restaurantsNode = graph.nodes.find(n => n.id === 'restaurants_research');
    expect(restaurantsNode?.prompt).toContain('Seafood');
    expect(restaurantsNode?.prompt).toContain('Pacific Northwest');
    expect(restaurantsNode?.prompt).toContain('pescatarian');

    const attractionsNode = graph.nodes.find(n => n.id === 'attractions_research');
    expect(attractionsNode?.prompt).toContain('coffee tours');
    expect(attractionsNode?.prompt).toContain('waterfront');

    const hotelsNode = graph.nodes.find(n => n.id === 'hotels_research');
    expect(hotelsNode?.prompt).toContain('luxury');
  });

  it('includes destination and dates in prompts', () => {
    const input = {
      destination: 'Miami',
      startDate: '2025-04-15',
      endDate: '2025-04-17',
    };

    const graph = buildTripPlanningGraph(input);

    // Verify destination is in prompts
    const weatherNode = graph.nodes.find(n => n.id === 'weather_research');
    expect(weatherNode?.prompt).toContain('Miami');
    expect(weatherNode?.prompt).toContain('2025-04-15');
    expect(weatherNode?.prompt).toContain('2025-04-17');

    // Verify destination is in all research nodes
    const researchNodes = graph.nodes.filter(n => n.id.endsWith('_research'));
    researchNodes.forEach(node => {
      expect(node.prompt).toContain('Miami');
    });
  });

  it('uses channel substitution in parsing nodes', () => {
    const input = {
      destination: 'Austin',
      startDate: '2025-03-01',
      endDate: '2025-03-02',
    };

    const graph = buildTripPlanningGraph(input);

    // Verify channel substitution syntax
    const parseWeatherNode = graph.nodes.find(n => n.id === 'parse_weather');
    expect(parseWeatherNode?.prompt).toContain('{{channel:weather_research.last}}');

    const parseAttractionsNode = graph.nodes.find(n => n.id === 'parse_attractions');
    expect(parseAttractionsNode?.prompt).toContain('{{channel:attractions_research.last}}');

    const parseRestaurantsNode = graph.nodes.find(n => n.id === 'parse_restaurants');
    expect(parseRestaurantsNode?.prompt).toContain('{{channel:restaurants_research.last}}');

    const parseHotelsNode = graph.nodes.find(n => n.id === 'parse_hotels');
    expect(parseHotelsNode?.prompt).toContain('{{channel:hotels_research.last}}');
  });

  it('uses multiple channel inputs in optimization node', () => {
    const input = {
      destination: 'Portland',
      startDate: '2025-02-01',
      endDate: '2025-02-03',
    };

    const graph = buildTripPlanningGraph(input);

    const optimizeNode = graph.nodes.find(n => n.id === 'optimize_itinerary');
    
    // Verify all required channel inputs
    expect(optimizeNode?.prompt).toContain('{{channel:parse_weather.last}}');
    expect(optimizeNode?.prompt).toContain('{{channel:parse_attractions.last}}');
    expect(optimizeNode?.prompt).toContain('{{channel:parse_restaurants.last}}');
    expect(optimizeNode?.prompt).toContain('{{channel:parse_hotels.last}}');
  });

  it('calculates trip duration correctly', () => {
    const input3Days = {
      destination: 'Denver',
      startDate: '2025-01-10',
      endDate: '2025-01-12', // 3 days
    };

    const graph3Days = buildTripPlanningGraph(input3Days);
    const optimizeNode3Days = graph3Days.nodes.find(n => n.id === 'optimize_itinerary');
    expect(optimizeNode3Days?.prompt).toContain('3-day');

    const input1Day = {
      destination: 'Boston',
      startDate: '2025-01-15',
      endDate: '2025-01-15', // 1 day
    };

    const graph1Day = buildTripPlanningGraph(input1Day);
    const optimizeNode1Day = graph1Day.nodes.find(n => n.id === 'optimize_itinerary');
    expect(optimizeNode1Day?.prompt).toContain('1-day');
  });

  it('handles default values for optional parameters', () => {
    const minimalInput = {
      destination: 'Chicago',
      startDate: '2025-01-20',
      endDate: '2025-01-21',
    };

    const graph = buildTripPlanningGraph(minimalInput);

    // Should not throw and should create valid graph
    expect(graph.nodes.length).toBe(15);
    expect(graph.edges.length).toBe(20);

    // Verify default budget is used
    const hotelsNode = graph.nodes.find(n => n.id === 'hotels_research');
    expect(hotelsNode?.prompt).toContain('moderate');
  });
});

