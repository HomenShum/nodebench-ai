/**
 * Query Classifier
 * 
 * Classifies user queries as simple or complex and determines routing strategy
 */

import type { QueryClassification, AgentDomain } from "./types";

/**
 * Classify a user query to determine routing strategy
 */
export function classifyQuery(userQuery: string): QueryClassification {
  const query = userQuery.toLowerCase();
  
  // Detect domains mentioned
  const domains: AgentDomain[] = [];
  
  // Document keywords
  if (query.match(/\b(document|doc|file|report|note|content|write|edit|create|update|find|search|analyze|summary|read|open)\b/)) {
    domains.push("document");
  }
  
  // Media keywords
  if (query.match(/\b(image|photo|picture|video|media|analyze|show|display)\b/)) {
    domains.push("media");
  }
  
  // Task keywords
  if (query.match(/\b(task|todo|to-do|complete|done|priority|deadline|due)\b/)) {
    domains.push("task");
  }
  
  // Event keywords
  if (query.match(/\b(event|meeting|calendar|schedule|appointment|today|tomorrow|week)\b/)) {
    domains.push("event");
  }
  
  // Web keywords
  if (query.match(/\b(web|online|search|internet|google|find.*on.*web|current|latest|news)\b/)) {
    domains.push("web");
  }
  
  // Detect workflow indicators
  const workflowIndicators = [
    /\b(and then|after that|next|finally)\b/,
    /\b(first.*then|step.*step)\b/,
    /,.*,.*,/, // Multiple comma-separated actions
    /\b(find.*open.*analyze|create.*update|list.*create.*update)\b/,
  ];
  const requiresWorkflow = workflowIndicators.some(pattern => pattern.test(query));
  
  // Detect multiple tool requirements
  const multiToolIndicators = [
    /\b(compare|cross-reference|relate|connection|both|all)\b/,
    /\band\b.*\band\b/, // Multiple "and" conjunctions
    domains.length > 1, // Multiple domains
  ];
  const requiresMultipleTools = multiToolIndicators.some(indicator => 
    typeof indicator === 'boolean' ? indicator : indicator.test(query)
  );
  
  // Determine complexity
  let complexity: "simple" | "complex" = "simple";
  let estimatedSteps = 1;
  let reasoning = "";
  
  if (requiresWorkflow) {
    complexity = "complex";
    estimatedSteps = query.split(/\b(and then|after that|next|then|finally)\b/).length;
    reasoning = "Multi-step workflow detected";
  } else if (requiresMultipleTools) {
    complexity = "complex";
    estimatedSteps = domains.length > 1 ? domains.length : 2;
    reasoning = "Multiple tools or domains required";
  } else if (domains.length === 0) {
    // General query, might need orchestration
    complexity = "simple";
    domains.push("general");
    estimatedSteps = 1;
    reasoning = "General query, single tool likely sufficient";
  } else if (domains.length === 1) {
    // Single domain, simple query
    complexity = "simple";
    estimatedSteps = 1;
    reasoning = "Single domain query, direct routing";
  }
  
  // Override: Specific complex patterns
  const complexPatterns = [
    /\b(workflow|pipeline|process)\b/,
    /\b(compare.*with|versus|vs\.?)\b/,
    /\b(all.*and.*all|everything)\b/,
    /\b(analyze.*and.*summarize|find.*and.*analyze)\b/,
  ];
  
  if (complexPatterns.some(pattern => pattern.test(query))) {
    complexity = "complex";
    if (estimatedSteps === 1) estimatedSteps = 2;
    reasoning = "Complex analysis or comparison required";
  }
  
  return {
    complexity,
    domains: domains.length > 0 ? domains : ["general"],
    requiresMultipleTools,
    requiresWorkflow,
    estimatedSteps,
    reasoning,
  };
}

/**
 * Determine if query should use orchestrator
 */
export function shouldUseOrchestrator(classification: QueryClassification): boolean {
  return (
    classification.complexity === "complex" ||
    classification.requiresWorkflow ||
    classification.requiresMultipleTools ||
    classification.estimatedSteps > 1
  );
}

/**
 * Get primary domain for simple queries
 */
export function getPrimaryDomain(classification: QueryClassification): AgentDomain {
  if (classification.domains.length === 0) return "general";
  return classification.domains[0];
}

